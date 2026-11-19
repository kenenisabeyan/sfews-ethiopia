"""
Comprehensive Integration Test Suite for SFEWS Advanced Backend Routers.
Tests functionality and non-functionality across all 9 decoupled domains using in-memory ASGI transport.
Includes tests for Hydrological calculations, Rate of Rise, Geofenced Emergency Broadcasts,
Sliding-Window Rate Limiting, Circuit Breakers, and Situational AI Diagnostics.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ["USE_SQLITE"] = "1"
import asyncio
import httpx

from app.main import app, lifespan
from app.core.circuit_breaker import weather_breaker, geocode_breaker, CircuitState

async def run_tests():
    print("=== STARTING FULL ADVANCED BACKEND INTEGRATION SUITE ===", flush=True)

    async with lifespan(app):
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            
            # 1. Health check & Observability Headers
            print("1. Testing System Health Check & Observability Headers...", flush=True)
            res = await client.get("/")
            assert res.status_code == 200, f"Health check failed: {res.text}"
            data = res.json()
            assert data["status"] == "Operational"
            assert data["api_version"] == "2.1.0"
            assert len(data["registered_domains"]) == 9
            assert "X-Request-ID" in res.headers
            assert "X-Process-Time-Ms" in res.headers
            print(f"   [PASS] Health check verified. Driver: {data.get('database_driver')}", flush=True)

            # 2. Auth Domain
            print("2. Testing Auth Domain...", flush=True)
            seed_res = await client.post("/api/v1/auth/seed-admin")
            assert seed_res.status_code == 200

            login_res = await client.post("/api/v1/auth/login", data={"username": "admin@sfews.gov.et", "password": "admin123"})
            assert login_res.status_code == 200
            token_data = login_res.json()
            assert "access_token" in token_data
            token = token_data["access_token"]

            me_res = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
            assert me_res.status_code == 200
            user = me_res.json()
            assert user["email"] == "admin@sfews.gov.et"

            users_res = await client.get("/api/v1/auth/users", headers={"Authorization": f"Bearer {token}"})
            assert users_res.status_code == 200
            print("   [PASS] Auth workflow verified.", flush=True)

            # 3. Nodes Domain
            print("3. Testing Nodes Fleet Management Domain...", flush=True)
            nodes_res = await client.get("/api/v1/nodes/")
            assert nodes_res.status_code == 200
            nodes = nodes_res.json()
            assert len(nodes) >= 3

            new_node = {
                "id": "NODE-TEST-99",
                "name": "Wonji Sugar Estate Hydrometric Anchor",
                "basin_name": "Awash River Basin",
                "country_name": "Ethiopia",
                "latitude": 8.4501,
                "longitude": 39.2812,
                "battery_level": 98.0
            }
            reg_res = await client.post("/api/v1/nodes/register", json=new_node)
            assert reg_res.status_code == 201

            hb_res = await client.post("/api/v1/nodes/NODE-TEST-99/heartbeat", json={"battery_level": 97.5})
            assert hb_res.status_code == 200
            assert hb_res.json()["battery_level"] == 97.5

            del_res = await client.delete("/api/v1/nodes/NODE-TEST-99")
            assert del_res.status_code == 200
            print("   [PASS] Nodes fleet management verified.", flush=True)

            # 4. Telemetry Ingestion, Hydrological Modeling & Rate of Rise
            print("4. Testing Telemetry Ingestion, Hydrological Modeling & Surge Dynamics...", flush=True)
            payload = {
                "node_id": "NODE-ALPHA-1",
                "water_level_cm": 465.0, # Breaches critical threshold
                "rainfall_rate_mm": 68.5,
                "battery_level": 94.0
            }
            res = await client.post("/api/v1/telemetry/", json=payload)
            assert res.status_code == 201
            t_data = res.json()
            assert t_data["risk_level"] == "Critical"
            assert t_data["alert_triggered"] is True
            assert "rate_of_rise_cm_per_hr" in t_data
            assert "estimated_discharge_m3s" in t_data
            assert "surge_status" in t_data
            assert "X-RateLimit-Limit" in res.headers
            assert "X-RateLimit-Remaining" in res.headers
            print(f"   [PASS] Ingestion & Hydrology verified: Q={t_data['estimated_discharge_m3s']} m3/s, Surge={t_data['surge_status']}", flush=True)

            batch_payload = {
                "readings": [
                    {"node_id": "NODE-BETA-2", "water_level_cm": 280.0, "rainfall_rate_mm": 15.0, "battery_level": 88.0},
                    {"node_id": "NODE-GAMMA-3", "water_level_cm": 310.0, "rainfall_rate_mm": 42.0, "battery_level": 76.0}
                ]
            }
            batch_res = await client.post("/api/v1/telemetry/batch", json=batch_payload)
            assert batch_res.status_code == 201
            assert batch_res.json()["total_processed"] == 2

            stats_res = await client.get("/api/v1/telemetry/stats")
            assert stats_res.status_code == 200
            assert stats_res.json()["total_records"] > 0
            print("   [PASS] Telemetry batch ingestion verified.", flush=True)

            # 5. Alerts & Civil Defense Geofenced Broadcast
            print("5. Testing Alerts & Geospatial Geofenced Emergency Broadcast...", flush=True)
            alerts_res = await client.get("/api/v1/alerts/")
            assert alerts_res.status_code == 200
            alerts = alerts_res.json()
            assert len(alerts) > 0

            first_alert = alerts[0]
            ack_res = await client.post(f"/api/v1/alerts/{first_alert['id']}/acknowledge", json={"acknowledged_by": "Senior Commander"})
            assert ack_res.status_code == 200
            assert ack_res.json()["is_acknowledged"] is True

            subs_res = await client.get("/api/v1/alerts/subscribers")
            assert subs_res.status_code == 200
            subs = subs_res.json()
            assert len(subs) >= 3

            # Test Geofenced Broadcast with 50km radius
            bcast_payload = {
                "message": "URGENT FLOOD ALERT: Downstream Awash water surge anticipated.",
                "severity": "Critical",
                "station_id": "NODE-ALPHA-1",
                "radius_km": 50.0
            }
            bcast_res = await client.post("/api/v1/alerts/broadcast", json=bcast_payload)
            assert bcast_res.status_code == 200
            assert bcast_res.json()["status"] == "Broadcast Dispatched Successfully"
            assert bcast_res.json()["subscribers_notified"] >= 1
            print("   [PASS] Geofenced emergency broadcast verified.", flush=True)

            # 6. Dashboard & Caching
            print("6. Testing Dashboard & Caching Aggregations...", flush=True)
            dash_res = await client.get("/api/v1/dashboard/")
            assert dash_res.status_code == 200
            dash_data = dash_res.json()
            assert "summary" in dash_data
            assert "nodes" in dash_data
            assert "history" in dash_data
            assert dash_data["summary"]["totalNodes"] >= 3

            summary_res = await client.get("/api/v1/dashboard/summary")
            assert summary_res.status_code == 200

            trends_res = await client.get("/api/v1/dashboard/trends")
            assert trends_res.status_code == 200

            basins_res = await client.get("/api/v1/dashboard/basins")
            assert basins_res.status_code == 200
            print("   [PASS] Dashboard & analytics verified.", flush=True)

            # 7. System Settings & Diagnostics
            print("7. Testing System Settings & Diagnostics...", flush=True)
            settings_res = await client.get("/api/v1/system/settings")
            assert settings_res.status_code == 200
            settings = settings_res.json()
            assert settings["warning_threshold"] > 0

            diag_res = await client.get("/api/v1/system/diagnostics")
            assert diag_res.status_code == 200
            diag = diag_res.json()
            assert diag["status"] in ["Operational", "Active"]
            assert "event_bus_stats" in diag
            assert "cache_stats" in diag
            print("   [PASS] System settings & diagnostics verified.", flush=True)

            # 8. Simulation Interoperability
            print("8. Testing Simulation /flood Interoperability...", flush=True)
            flood_res = await client.post("/flood", json={"level": 520})
            assert flood_res.status_code == 200
            assert flood_res.json()["level"] == 520

            get_flood_res = await client.get("/flood")
            assert get_flood_res.status_code == 200
            assert get_flood_res.json()["level"] == 520
            print("   [PASS] Simulation interoperability verified.", flush=True)

            # 9. AI Chat Situational Analyst & Hydrological Heuristic Engine
            print("9. Testing AI Chat Situational Analyst & Hydrological Heuristic Engine...", flush=True)
            chat_res = await client.post("/api/v1/chat/ask", json={"query": "What is the current flood risk and discharge in Awash basin?"})
            assert chat_res.status_code == 200
            ans = chat_res.json()["response"]
            assert len(ans) > 50
            assert "Awash" in ans or "SFEWS" in ans
            assert "Discharge" in ans or "m³/s" in ans
            print("   [PASS] AI Chat Situational Analyst verified.", flush=True)

            # 10. Non-Functional Circuit Breaker Integrity
            print("10. Testing Non-Functional Circuit Breaker & Fallbacks...", flush=True)
            assert weather_breaker.get_state() in [CircuitState.CLOSED, CircuitState.HALF_OPEN]
            assert geocode_breaker.get_state() in [CircuitState.CLOSED, CircuitState.HALF_OPEN]
            print("   [PASS] Circuit breakers verified healthy.", flush=True)

            print("\n=======================================================", flush=True)
            print("ALL 10 FUNCTIONAL & NON-FUNCTIONAL SUITES PASSED! 🚀", flush=True)
            print("=======================================================", flush=True)

if __name__ == "__main__":
    asyncio.run(run_tests())

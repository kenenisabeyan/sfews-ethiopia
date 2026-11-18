"""
Comprehensive Integration Test Suite for SFEWS Advanced Backend Routers.
Tests functionality and non-functionality across all 9 decoupled domains using in-memory ASGI transport.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ["USE_SQLITE"] = "1"
import asyncio
import httpx

from app.main import app, lifespan

async def run_tests():
    print("=== STARTING FULL BACKEND INTEGRATION SUITE ===", flush=True)

    async with lifespan(app):
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            
            # 1. Health check
            print("1. Testing System Health Check...", flush=True)
            res = await client.get("/")
            assert res.status_code == 200, f"Health check failed: {res.text}"
            data = res.json()
            assert data["status"] == "Operational"
            assert data["api_version"] == "2.1.0"
            assert len(data["registered_domains"]) == 9
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
            print("   [PASS] Nodes workflow verified.", flush=True)

            # 4. Telemetry & Alert Event Dispatch
            print("4. Testing Telemetry Ingestion & Event Dispatch...", flush=True)
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
            print("   [PASS] Telemetry & event dispatch verified.", flush=True)

            # 5. Alerts & Civil Defense
            print("5. Testing Alerts & Emergency Broadcast Domain...", flush=True)
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

            bcast_payload = {
                "message": "URGENT FLOOD ALERT: Downstream Awash water surge anticipated.",
                "severity": "Critical",
                "station_id": "NODE-ALPHA-1"
            }
            bcast_res = await client.post("/api/v1/alerts/broadcast", json=bcast_payload)
            assert bcast_res.status_code == 200
            assert bcast_res.json()["status"] == "Broadcast Dispatched Successfully"
            print("   [PASS] Alerts & broadcast verified.", flush=True)

            # 6. Dashboard & Caching
            print("6. Testing Dashboard & Analytics...", flush=True)
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
            print("7. Testing System Settings & Non-Functional Diagnostics...", flush=True)
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

            # 9. AI Chat Situational Analyst
            print("9. Testing AI Chat Situational Analyst...", flush=True)
            chat_res = await client.post("/api/v1/chat/ask", json={"query": "What is the current flood risk in Awash basin?"})
            assert chat_res.status_code == 200
            ans = chat_res.json()["response"]
            assert len(ans) > 20
            print("   [PASS] AI Chat Situational Analyst verified.", flush=True)

            print("\n==============================================", flush=True)
            print("ALL 9 DOMAIN SUITES PASSED FLAWLESSLY! 🚀", flush=True)
            print("==============================================", flush=True)

if __name__ == "__main__":
    asyncio.run(run_tests())

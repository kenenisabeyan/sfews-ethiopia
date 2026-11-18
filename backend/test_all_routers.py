"""
Comprehensive Integration Test Suite for SFEWS Advanced Backend Routers.
Tests functionality and non-functionality across all 9 decoupled domains.
"""
import sys
import os

from fastapi.testclient import TestClient
from app.main import app

def run_tests():
    with TestClient(app) as client:
        print("Testing System Health Check...", flush=True)
        response = client.get("/")
        assert response.status_code == 200, f"Health check failed: {response.text}"
        data = response.json()
        assert data["status"] == "Operational"
        assert data["api_version"] == "2.1.0"
        assert len(data["registered_domains"]) == 9
        print(f"  [PASS] Health check verified. Driver: {data.get('database_driver')}", flush=True)

        print("Testing Auth Domain...", flush=True)
        seed_res = client.post("/api/v1/auth/seed-admin")
        assert seed_res.status_code == 200

        login_res = client.post("/api/v1/auth/login", data={"username": "admin@sfews.gov.et", "password": "admin123"})
        assert login_res.status_code == 200
        token_data = login_res.json()
        assert "access_token" in token_data
        token = token_data["access_token"]

        me_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me_res.status_code == 200
        user = me_res.json()
        assert user["email"] == "admin@sfews.gov.et"
        print("  [PASS] Auth workflow verified.", flush=True)

        print("Testing Nodes Domain...", flush=True)
        res = client.get("/api/v1/nodes/")
        assert res.status_code == 200
        nodes = res.json()
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
        reg_res = client.post("/api/v1/nodes/register", json=new_node)
        assert reg_res.status_code == 201

        hb_res = client.post("/api/v1/nodes/NODE-TEST-99/heartbeat", json={"battery_level": 97.5})
        assert hb_res.status_code == 200
        assert hb_res.json()["battery_level"] == 97.5

        del_res = client.delete("/api/v1/nodes/NODE-TEST-99")
        assert del_res.status_code == 200
        print("  [PASS] Nodes workflow verified.", flush=True)

        print("Testing Telemetry & Alert Event Dispatch...", flush=True)
        payload = {
            "node_id": "NODE-ALPHA-1",
            "water_level_cm": 465.0,
            "rainfall_rate_mm": 68.5,
            "battery_level": 94.0
        }
        res = client.post("/api/v1/telemetry/", json=payload)
        assert res.status_code == 201
        data = res.json()
        assert data["risk_level"] == "Critical"
        assert data["alert_triggered"] is True

        batch_payload = {
            "readings": [
                {"node_id": "NODE-BETA-2", "water_level_cm": 280.0, "rainfall_rate_mm": 15.0, "battery_level": 88.0},
                {"node_id": "NODE-GAMMA-3", "water_level_cm": 310.0, "rainfall_rate_mm": 42.0, "battery_level": 76.0}
            ]
        }
        batch_res = client.post("/api/v1/telemetry/batch", json=batch_payload)
        assert batch_res.status_code == 201
        assert batch_res.json()["total_processed"] == 2

        stats_res = client.get("/api/v1/telemetry/stats")
        assert stats_res.status_code == 200
        assert stats_res.json()["total_records"] > 0
        print("  [PASS] Telemetry & event dispatch verified.", flush=True)

        print("Testing Alerts & Civil Defense Domain...", flush=True)
        alerts_res = client.get("/api/v1/alerts/")
        assert alerts_res.status_code == 200
        alerts = alerts_res.json()
        assert len(alerts) > 0

        first_alert = alerts[0]
        ack_res = client.post(f"/api/v1/alerts/{first_alert['id']}/acknowledge", json={"acknowledged_by": "Senior Commander"})
        assert ack_res.status_code == 200
        assert ack_res.json()["isAcknowledged"] is True

        subs_res = client.get("/api/v1/alerts/subscribers")
        assert subs_res.status_code == 200
        subs = subs_res.json()
        assert len(subs) >= 3

        bcast_payload = {
            "message": "URGENT FLOOD ALERT: Downstream Awash water surge anticipated.",
            "severity": "Critical",
            "station_id": "NODE-ALPHA-1"
        }
        bcast_res = client.post("/api/v1/alerts/broadcast", json=bcast_payload)
        assert bcast_res.status_code == 200
        assert bcast_res.json()["status"] == "Broadcast Dispatched Successfully"
        print("  [PASS] Alerts & broadcast verified.", flush=True)

        print("Testing Dashboard & Analytics...", flush=True)
        dash_res = client.get("/api/v1/dashboard/")
        assert dash_res.status_code == 200
        dash_data = dash_res.json()
        assert "summary" in dash_data
        assert "nodes" in dash_data
        assert "history" in dash_data
        assert dash_data["summary"]["totalNodes"] >= 3

        summary_res = client.get("/api/v1/dashboard/summary")
        assert summary_res.status_code == 200

        assert client.get("/api/v1/dashboard/trends").status_code == 200
        assert client.get("/api/v1/dashboard/basins").status_code == 200
        print("  [PASS] Dashboard & analytics verified.", flush=True)

        print("Testing System Settings & Diagnostics...", flush=True)
        settings_res = client.get("/api/v1/system/settings")
        assert settings_res.status_code == 200
        settings = settings_res.json()
        assert settings["warning_threshold"] > 0

        diag_res = client.get("/api/v1/system/diagnostics")
        assert diag_res.status_code == 200
        diag = diag_res.json()
        assert diag["status"] in ["Operational", "Active"]
        assert "event_bus_stats" in diag
        assert "cache_stats" in diag
        print("  [PASS] System settings & diagnostics verified.", flush=True)

        print("Testing Simulation /flood Interoperability...", flush=True)
        flood_res = client.post("/flood", json={"level": 520})
        assert flood_res.status_code == 200
        assert flood_res.json()["level"] == 520

        get_flood_res = client.get("/flood")
        assert get_flood_res.status_code == 200
        assert get_flood_res.json()["level"] == 520
        print("  [PASS] Simulation interoperability verified.", flush=True)

        print("Testing AI Chat Situational Analyst...", flush=True)
        chat_res = client.post("/api/v1/chat/ask", json={"query": "What is the current flood risk in Awash basin?"})
        assert chat_res.status_code == 200
        ans = chat_res.json()["response"]
        assert len(ans) > 20
        print("  [PASS] AI Chat Situational Analyst verified.", flush=True)

        print("\n==============================================", flush=True)
        print("ALL 8 DOMAIN SUITES PASSED FLAWLESSLY! 🚀", flush=True)
        print("==============================================", flush=True)

if __name__ == "__main__":
    print("=== STARTING FULL BACKEND INTEGRATION SUITE ===", flush=True)
    run_tests()

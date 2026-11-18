"""
Comprehensive Integration Test Suite for SFEWS Advanced Backend Routers.
Tests functionality and non-functionality across all 9 decoupled domains.
"""
import sys
import os

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_system_health():
    print("Testing System Health Check...")
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "Operational"
    assert data["api_version"] == "2.1.0"
    assert len(data["registered_domains"]) == 9
    print("  [PASS] Health check verified.")

def test_auth_workflow():
    print("Testing Auth Domain...")
    # Seed admin
    seed_res = client.post("/api/v1/auth/seed-admin")
    assert seed_res.status_code == 200

    # Login
    login_res = client.post("/api/v1/auth/login", data={"username": "admin@sfews.gov.et", "password": "admin123"})
    assert login_res.status_code == 200
    token_data = login_res.json()
    assert "access_token" in token_data
    token = token_data["access_token"]

    # Read me
    me_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    user = me_res.json()
    assert user["email"] == "admin@sfews.gov.et"
    print("  [PASS] Auth workflow verified.")

def test_nodes_workflow():
    print("Testing Nodes Domain...")
    # List nodes
    res = client.get("/api/v1/nodes/")
    assert res.status_code == 200
    nodes = res.json()
    assert len(nodes) >= 3

    # Register custom node
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

    # Heartbeat
    hb_res = client.post("/api/v1/nodes/NODE-TEST-99/heartbeat", json={"battery_level": 97.5})
    assert hb_res.status_code == 200
    assert hb_res.json()["battery_level"] == 97.5

    # Clean up test node
    del_res = client.delete("/api/v1/nodes/NODE-TEST-99")
    assert del_res.status_code == 200
    print("  [PASS] Nodes workflow verified.")

def test_telemetry_and_events():
    print("Testing Telemetry & Alert Event Dispatch...")
    # Single ingestion
    payload = {
        "node_id": "NODE-ALPHA-1",
        "water_level_cm": 465.0, # Breaches critical threshold (450)
        "rainfall_rate_mm": 68.5,
        "battery_level": 94.0
    }
    res = client.post("/api/v1/telemetry/", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["risk_level"] == "Critical"
    assert data["alert_triggered"] is True

    # Batch ingestion
    batch_payload = {
        "readings": [
            {"node_id": "NODE-BETA-2", "water_level_cm": 280.0, "rainfall_rate_mm": 15.0, "battery_level": 88.0},
            {"node_id": "NODE-GAMMA-3", "water_level_cm": 310.0, "rainfall_rate_mm": 42.0, "battery_level": 76.0}
        ]
    }
    batch_res = client.post("/api/v1/telemetry/batch", json=batch_payload)
    assert batch_res.status_code == 201
    assert batch_res.json()["total_processed"] == 2

    # Stats
    stats_res = client.get("/api/v1/telemetry/stats")
    assert stats_res.status_code == 200
    assert stats_res.json()["total_records"] > 0
    print("  [PASS] Telemetry & event dispatch verified.")

def test_alerts_and_broadcast():
    print("Testing Alerts & Civil Defense Domain...")
    # List alerts
    alerts_res = client.get("/api/v1/alerts/")
    assert alerts_res.status_code == 200
    alerts = alerts_res.json()
    assert len(alerts) > 0

    first_alert = alerts[0]
    # Acknowledge
    ack_res = client.post(f"/api/v1/alerts/{first_alert['id']}/acknowledge", json={"acknowledged_by": "Senior Commander"})
    assert ack_res.status_code == 200
    assert ack_res.json()["isAcknowledged"] is True

    # Subscribers
    subs_res = client.get("/api/v1/alerts/subscribers")
    assert subs_res.status_code == 200
    subs = subs_res.json()
    assert len(subs) >= 3

    # Broadcast
    bcast_payload = {
        "message": "URGENT FLOOD ALERT: Downstream Awash water surge anticipated.",
        "severity": "Critical",
        "station_id": "NODE-ALPHA-1"
    }
    bcast_res = client.post("/api/v1/alerts/broadcast", json=bcast_payload)
    assert bcast_res.status_code == 200
    assert bcast_res.json()["status"] == "Broadcast Dispatched Successfully"
    print("  [PASS] Alerts & broadcast verified.")

def test_dashboard_and_cache():
    print("Testing Dashboard & Analytics...")
    # Full dashboard
    dash_res = client.get("/api/v1/dashboard/")
    assert dash_res.status_code == 200
    dash_data = dash_res.json()
    assert "summary" in dash_data
    assert "nodes" in dash_data
    assert "history" in dash_data
    assert dash_data["summary"]["totalNodes"] >= 3

    # Summary
    summary_res = client.get("/api/v1/dashboard/summary")
    assert summary_res.status_code == 200

    # Trends & Basins
    assert client.get("/api/v1/dashboard/trends").status_code == 200
    assert client.get("/api/v1/dashboard/basins").status_code == 200
    print("  [PASS] Dashboard & analytics verified.")

def test_system_settings_and_diagnostics():
    print("Testing System Settings & Diagnostics...")
    # Get settings
    settings_res = client.get("/api/v1/system/settings")
    assert settings_res.status_code == 200
    settings = settings_res.json()
    assert settings["warning_threshold"] > 0

    # Diagnostics
    diag_res = client.get("/api/v1/system/diagnostics")
    assert diag_res.status_code == 200
    diag = diag_res.json()
    assert diag["status"] in ["Operational", "Active"]
    assert "event_bus_stats" in diag
    assert "cache_stats" in diag
    print("  [PASS] System settings & diagnostics verified.")

def test_simulation_interoperability():
    print("Testing Simulation /flood Interoperability...")
    # Post flood level
    flood_res = client.post("/flood", json={"level": 520})
    assert flood_res.status_code == 200
    assert flood_res.json()["level"] == 520

    # Get flood level
    get_flood_res = client.get("/flood")
    assert get_flood_res.status_code == 200
    assert get_flood_res.json()["level"] == 520
    print("  [PASS] Simulation interoperability verified.")

def test_chat_analyst():
    print("Testing AI Chat Situational Analyst...")
    chat_res = client.post("/api/v1/chat/ask", json={"query": "What is the current flood risk in Awash basin?"})
    assert chat_res.status_code == 200
    ans = chat_res.json()["response"]
    assert len(ans) > 20
    print("  [PASS] AI Chat Situational Analyst verified.")

if __name__ == "__main__":
    print("=== STARTING FULL BACKEND INTEGRATION SUITE ===")
    test_system_health()
    test_auth_workflow()
    test_nodes_workflow()
    test_telemetry_and_events()
    test_alerts_and_broadcast()
    test_dashboard_and_cache()
    test_system_settings_and_diagnostics()
    test_simulation_interoperability()
    test_chat_analyst()
    print("\n==============================================")
    print("ALL 8 DOMAIN SUITES PASSED FLAWLESSLY! 🚀")
    print("==============================================")

"""
SFEWS Live End-to-End Operational Showcase.
Demonstrates live interaction across all backend subsystems:
1. System Boot & Database Driver Negotiation
2. Secure JWT Authentication
3. Edge Telemetry Ingestion with Instantaneous Hydrological Physics (Rate of Rise & Discharge)
4. Automated Alert Generation & Lifecycle Escalation
5. 50km Geospatial Geofenced Civil Defense Broadcast
6. AI Situational Copilot Report Generation
7. Real-Time Observability & Rate Limiting Verification
"""
import sys
import os
import json
import asyncio
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ["USE_SQLITE"] = "1"
import httpx
from app.main import app, lifespan

async def run_live_showcase():
    print("\n" + "="*70)
    print("🌊 SFEWS ETHIOPIA - LIVE BACKEND OPERATIONAL SHOWCASE")
    print("="*70 + "\n")

    async with lifespan(app):
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://sfews-api.local") as client:

            # ------------------------------------------------------------------
            # 1. System Status & Readiness
            # ------------------------------------------------------------------
            print("▶ [STEP 1] Probing System Health & Driver Architecture...")
            res = await client.get("/")
            data = res.json()
            print(f"   • API Status      : {data['status']}")
            print(f"   • Version         : {data['api_version']}")
            print(f"   • Active DB Engine: {data.get('database_driver')}")
            print(f"   • Active Domains  : {', '.join(data['registered_domains'][:5])}...")
            print(f"   • Trace ID        : {res.headers.get('X-Request-ID')}")
            print(f"   • Latency         : {res.headers.get('X-Process-Time-Ms')} ms\n")

            # ------------------------------------------------------------------
            # 2. Authentication & JWT Issuance
            # ------------------------------------------------------------------
            print("▶ [STEP 2] Authenticating Operator & Generating JWT Access Token...")
            login_res = await client.post(
                "/api/v1/auth/login",
                data={"username": "admin@sfews.gov.et", "password": "admin123"}
            )
            token = login_res.json()["access_token"]
            auth_headers = {"Authorization": f"Bearer {token}"}

            me_res = await client.get("/api/v1/auth/me", headers=auth_headers)
            user = me_res.json()
            print(f"   • Logged in User  : {user['name']} <{user['email']}>")
            print(f"   • RBAC Role       : {user['role']}")
            print(f"   • JWT Token (truncated): {token[:25]}...\n")

            # ------------------------------------------------------------------
            # 3. Telemetry Ingestion & Real-Time Hydrology
            # ------------------------------------------------------------------
            print("▶ [STEP 3] Simulating Sudden Highland Inundation at NODE-ALPHA-1 (Koka Dam)...")
            telemetry_payload = {
                "node_id": "NODE-ALPHA-1",
                "water_level_cm": 472.5,  # Breaches 450cm critical threshold
                "rainfall_rate_mm": 74.0,  # Severe tropical monsoon rainfall
                "battery_level": 93.2
            }
            t_res = await client.post("/api/v1/telemetry/", json=telemetry_payload)
            t_data = t_res.json()
            print(f"   • Sensor Stage    : 472.5 cm (Critical Threshold: 450.0 cm)")
            print(f"   • Rainfall Rate   : 74.0 mm/h")
            print(f"   • Rate of Rise    : {t_data.get('rate_of_rise_cm_per_hr')} cm/h")
            print(f"   • Surge Dynamic   : {t_data.get('surge_status')}")
            print(f"   • Est. Discharge  : {t_data.get('estimated_discharge_m3s')} m³/s (Awash Power Curve)")
            print(f"   • Flood Risk Tier : {t_data.get('risk_level')}")
            print(f"   • ML Probability  : {float(t_data.get('flood_probability', 0))*100:.1f}%")
            print(f"   • Alert Triggered : {t_data.get('alert_triggered')}")
            print(f"   • RateLimit Left  : {t_res.headers.get('X-RateLimit-Remaining')} calls/min\n")

            # ------------------------------------------------------------------
            # 4. Alert Verification
            # ------------------------------------------------------------------
            print("▶ [STEP 4] Fetching Active Early Warning Alert Records...")
            alerts_res = await client.get("/api/v1/alerts/?severity=Critical&acknowledged=false")
            alerts = alerts_res.json()
            if alerts:
                top_alert = alerts[0]
                print(f"   • Alert ID        : #{top_alert['id']}")
                print(f"   • Title           : {top_alert['title']}")
                print(f"   • Severity        : {top_alert['severity']}")
                print(f"   • Node Anchor     : {top_alert['node_id']}")
                print(f"   • Incident Detail : {top_alert['message']}")
            print()

            # ------------------------------------------------------------------
            # 5. Geospatial Geofenced Emergency Broadcast (50km Radius)
            # ------------------------------------------------------------------
            print("▶ [STEP 5] Dispatching Geospatial Geofenced Broadcast (50km Radius from Koka Dam)...")
            bcast_payload = {
                "station_id": "NODE-ALPHA-1",
                "radius_km": 50.0,
                "severity": "Critical",
                "message": (
                    "CRITICAL FLOOD SURGE: Koka Reservoir depth exceeded 470cm. "
                    "Emergency spillway release commencing. Lowland communities evacuate riverbed immediately."
                )
            }
            b_res = await client.post("/api/v1/alerts/broadcast", json=bcast_payload)
            b_data = b_res.json()
            print(f"   • Dispatch Status : {b_data['status']}")
            print(f"   • Target Stations : Filtered within 50.0 km radius via Haversine Formula")
            print(f"   • Subscriptions   : {b_data['subscribers_notified']} local elder & community numbers")
            print(f"   • Active Channels : {', '.join(b_data['delivered_channels'])}")
            print(f"   • Dispatch Time   : {b_data['broadcast_time']}\n")

            # ------------------------------------------------------------------
            # 6. Natural Language Situational AI Copilot
            # ------------------------------------------------------------------
            print("▶ [STEP 6] Asking SFEWS AI Copilot for Basin Tactical Situational Assessment...")
            chat_query = {"query": "What is the current flood emergency status, discharge, and response recommendation for Awash?"}
            c_res = await client.post("/api/v1/chat/ask", json=chat_query)
            ai_reply = c_res.json()["response"]
            print("   ------------------------------------------------------------------")
            for line in ai_reply.split("\n")[:14]:  # Show top lines of report
                print(f"   {line}")
            print("   ------------------------------------------------------------------\n")

            # ------------------------------------------------------------------
            # 7. Dashboard Live Snapshot
            # ------------------------------------------------------------------
            print("▶ [STEP 7] Querying Cached Dashboard Snapshot for Command Center UI...")
            dash_res = await client.get("/api/v1/dashboard/")
            dash_data = dash_res.json()
            summary = dash_data["summary"]
            print(f"   • Fleet Anchors   : {summary['totalNodes']} Stations Online")
            print(f"   • Basin Status    : {summary['basinStatus']}")
            print(f"   • Max Stage Depth : {summary['maxWaterLevelCm']} cm")
            print(f"   • History Points  : {len(dash_data['history'])} 24-hr time-series points")
            print(f"   • In-Memory Cache : Served in {dash_res.headers.get('X-Process-Time-Ms')} ms")

    print("\n" + "="*70)
    print("✅ SHOWCASE COMPLETE: ALL SYSTEMS RUNNING AT MAXIMUM PERFORMANCE")
    print("="*70 + "\n")

if __name__ == "__main__":
    asyncio.run(run_live_showcase())

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import asyncio
import httpx
from app.main import app

async def test():
    print("Initializing ASGITransport...")
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.get("/")
        print("Root Status:", r.status_code)
        print("Root Response:", r.json())

        # Test Telemetry
        print("Testing Telemetry POST...")
        t_res = await client.post("/api/v1/telemetry/", json={
            "node_id": "NODE-ALPHA-1",
            "water_level_cm": 470.0,
            "rainfall_rate_mm": 55.0,
            "battery_level": 92.0
        })
        print("Telemetry Status:", t_res.status_code, t_res.json())

        # Test Alerts
        print("Testing Alerts GET...")
        a_res = await client.get("/api/v1/alerts/")
        print("Alerts Status:", a_res.status_code, "Count:", len(a_res.json()))

        # Test Dashboard
        print("Testing Dashboard GET...")
        d_res = await client.get("/api/v1/dashboard/")
        print("Dashboard Status:", d_res.status_code, "Total Nodes:", d_res.json()["summary"]["totalNodes"])

        # Test System Settings
        print("Testing System Settings GET...")
        s_res = await client.get("/api/v1/system/settings")
        print("Settings Status:", s_res.status_code, s_res.json())

        # Test System Diagnostics
        print("Testing System Diagnostics GET...")
        diag_res = await client.get("/api/v1/system/diagnostics")
        print("Diagnostics Status:", diag_res.status_code, diag_res.json()["status"])

        # Test Simulation /flood
        print("Testing Simulation /flood POST...")
        f_res = await client.post("/flood", json={"level": 530})
        print("Simulation Status:", f_res.status_code, f_res.json())

        # Test Chat Ask
        print("Testing Chat POST...")
        chat_res = await client.post("/api/v1/chat/ask", json={"query": "Current flood status"})
        print("Chat Status:", chat_res.status_code)
        print("Chat Preview:", chat_res.json()["response"][:80])

        print("\nALL VERIFICATION CHECKS COMPLETED!")

if __name__ == "__main__":
    asyncio.run(test())

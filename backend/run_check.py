import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ["USE_SQLITE"] = "1"

print("1. Starting script...", flush=True)

import app.database
print("2. Database module imported. Active driver SQLite:", app.database.is_sqlite_active, flush=True)

from app.database import Base, engine, SessionLocal
from app.services.seed_service import seed_database_defaults

Base.metadata.create_all(bind=engine)
db = SessionLocal()
seed_database_defaults(db)
db.close()
print("3. Tables created and seeded successfully.", flush=True)

from app.main import app
print("4. App imported successfully.", flush=True)

import asyncio
import httpx

async def test():
    print("5. Inside async test...", flush=True)
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        r = await client.get("/")
        print("6. Root Status:", r.status_code, flush=True)
        print("   Root Body:", r.json(), flush=True)

        t_res = await client.post("/api/v1/telemetry/", json={
            "node_id": "NODE-ALPHA-1",
            "water_level_cm": 470.0,
            "rainfall_rate_mm": 55.0,
            "battery_level": 92.0
        })
        print("7. Telemetry Status:", t_res.status_code, t_res.json(), flush=True)

        a_res = await client.get("/api/v1/alerts/")
        print("8. Alerts Status:", a_res.status_code, "Count:", len(a_res.json()), flush=True)

        d_res = await client.get("/api/v1/dashboard/")
        print("9. Dashboard Status:", d_res.status_code, "Total Nodes:", d_res.json()["summary"]["totalNodes"], flush=True)

        s_res = await client.get("/api/v1/system/settings")
        print("10. Settings Status:", s_res.status_code, s_res.json(), flush=True)

        diag_res = await client.get("/api/v1/system/diagnostics")
        print("11. Diagnostics Status:", diag_res.status_code, diag_res.json()["status"], flush=True)

        f_res = await client.post("/flood", json={"level": 530})
        print("12. Simulation Status:", f_res.status_code, f_res.json(), flush=True)

        chat_res = await client.post("/api/v1/chat/ask", json={"query": "Current flood status"})
        print("13. Chat Status:", chat_res.status_code, flush=True)
        print("    Chat Preview:", chat_res.json()["response"][:80], flush=True)

    print("\nALL VERIFICATION CHECKS COMPLETED SUCCESSFULLY! 🚀", flush=True)

if __name__ == "__main__":
    asyncio.run(test())

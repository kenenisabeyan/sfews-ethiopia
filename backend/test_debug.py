import sys
import os
import asyncio
import httpx

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ["USE_SQLITE"] = "1"

from app.main import app, lifespan

async def test():
    print("DEBUG: 5. Entering lifespan", flush=True)
    async with lifespan(app):
        print("DEBUG: 6. Lifespan entered successfully", flush=True)
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
            print("DEBUG: 7. Requesting GET /", flush=True)
            res = await client.get("/")
            print(f"DEBUG: 8. GET / -> {res.status_code}", flush=True)

            print("DEBUG: 9. Requesting POST /api/v1/auth/seed-admin", flush=True)
            seed_res = await client.post("/api/v1/auth/seed-admin")
            print(f"DEBUG: 10. seed-admin -> {seed_res.status_code}", flush=True)

            print("DEBUG: 11. Requesting Telemetry", flush=True)
            payload = {
                "node_id": "NODE-ALPHA-1",
                "water_level_cm": 465.0,
                "rainfall_rate_mm": 68.5,
                "battery_level": 94.0
            }
            res = await client.post("/api/v1/telemetry/", json=payload)
            print(f"DEBUG: 12. Telemetry -> {res.status_code}, data={res.json()}", flush=True)

if __name__ == "__main__":
    asyncio.run(test())

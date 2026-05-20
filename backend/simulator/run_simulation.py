import time
import random
import requests

API_URL = "http://localhost:8000/api/v1/telemetry"
NODES = ["NODE-ALPHA-1", "NODE-BETA-2", "NODE-GAMMA-3"]

def simulate():
    print(f"Starting SFEWS Simulation Engine.")
    print(f"Target API: {API_URL}")
    print("Initializing sensor nodes...\n")
    
    while True:
        for node_id in NODES:
            # Simulate variable environmental dynamics with gaussian distribution
            water_level = max(50.0, min(random.gauss(300, 150), 600.0))
            rainfall = max(0.0, min(random.gauss(50, 40), 150.0))
            battery = random.uniform(10.0, 100.0)
            
            payload = {
                "node_id": node_id,
                "water_level_cm": round(water_level, 2),
                "rainfall_rate_mm": round(rainfall, 2),
                "battery_level": round(battery, 2)
            }
            
            try:
                res = requests.post(API_URL, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    status = data.get("risk_level", "Unknown")
                    print(f"[{node_id}] Telemetry Synced | WL: {payload['water_level_cm']}cm | RF: {payload['rainfall_rate_mm']}mm | STATUS: {status}")
                else:
                    print(f"[{node_id}] Warning: HTTP {res.status_code} - {res.text}")
            except Exception as e:
                print(f"[{node_id}] Connection Error: Ensure FastAPI is running on port 8000.")
            
            time.sleep(1.5) # Stagger transmissions
            
        print("\n--- Awaiting next interval cycle (15s) ---\n")
        time.sleep(15)

if __name__ == "__main__":
    simulate()

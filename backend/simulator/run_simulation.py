import os
import sys
import time
import random
import requests
import argparse

API_URL = os.getenv("API_URL", "http://localhost:8000/api/v1/telemetry/")
NODES = ["NODE-ALPHA-1", "NODE-BETA-2", "NODE-GAMMA-3"]

def print_colored_status(node_id: str, payload: dict, status: str, prob: float):
    if status == "Critical":
        color = "\033[91m" # Red
    elif status == "Warning":
        color = "\033[93m" # Yellow
    else:
        color = "\033[92m" # Green
    reset = "\033[0m"

    print(
        f"[{node_id}] Synced | WL: {payload['water_level_cm']:5.1f}cm | "
        f"Rain: {payload['rainfall_rate_mm']:4.1f}mm/h | "
        f"Batt: {payload['battery_level']:4.1f}% | "
        f"Risk: {color}{status:8s}{reset} (Prob: {prob*100:4.1f}%)",
        flush=True
    )

def run_simulation(once: bool = False, interval: float = 10.0):
    print("==================================================")
    print("   ~~~ SFEWS IoT Hydrological Telemetry Engine ~~~")
    print("==================================================")
    print(f"Target Ingestion URL : {API_URL}")
    print(f"Active Monitoring Anchors: {', '.join(NODES)}")
    print(f"Simulation Interval : {interval}s")
    print("--------------------------------------------------\n")

    cycle = 1
    try:
        while True:
            print(f"--- Cycle #{cycle} Ingesting Telemetry ---")
            for node_id in NODES:
                # Stochastic hydrological curve simulation (Awash Basin profile)
                water_level = max(80.0, min(random.gauss(310, 120), 580.0))
                rainfall = max(0.0, min(random.gauss(35, 30), 120.0))
                battery = round(random.uniform(75.0, 99.0), 1)

                payload = {
                    "node_id": node_id,
                    "water_level_cm": round(water_level, 1),
                    "rainfall_rate_mm": round(rainfall, 1),
                    "battery_level": battery
                }

                try:
                    res = requests.post(API_URL, json=payload, timeout=5)
                    if res.status_code in (200, 201):
                        data = res.json()
                        status = data.get("risk_level", "Unknown")
                        prob = data.get("flood_probability", 0.0)
                        print_colored_status(node_id, payload, status, prob)
                    else:
                        print(f"[{node_id}] Warning: HTTP {res.status_code} - {res.text}", flush=True)
                except requests.exceptions.RequestException as e:
                    print(f"[{node_id}] Ingestion Offline: Ensure SFEWS backend is running at {API_URL}", flush=True)

                time.sleep(0.8) # Stagger transmissions

            if once:
                print("\nSingle sweep completed.")
                break

            cycle += 1
            print(f"\nAwaiting next telemetry cycle ({interval}s)...\n")
            time.sleep(interval)

    except KeyboardInterrupt:
        print("\nSimulation safely terminated by operator.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SFEWS IoT Edge Sensor Simulator")
    parser.add_argument("--once", action="store_true", help="Run a single simulation cycle and exit")
    parser.add_argument("--interval", type=float, default=10.0, help="Interval seconds between cycles")
    args = parser.parse_args()

    run_simulation(once=args.once, interval=args.interval)

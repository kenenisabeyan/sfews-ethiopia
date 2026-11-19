import os
import sys
import time
import random
import requests
import argparse

API_URL = os.getenv("FLOOD_API_URL", "http://localhost:8000/flood")

def simulate_sensor(once: bool = False, interval: float = 2.0):
    print("==================================================")
    print("   ~~~ SFEWS IoT Edge Sensor Simulator (Phase 1-3)")
    print("==================================================")
    print(f"Target API Endpoint : {API_URL}")
    print(f"Interval Frequency  : Every {interval} seconds")
    print("Threshold Level     : 500 (Safe <= 500 < Alert)")
    print("--------------------------------------------------")
    print("Starting continuous simulation loop. Press Ctrl+C to stop.\n")
    
    try:
        while True:
            # Phase 1: Data Generation (Simulated Sensor ADC 0-1023)
            water_level = random.randint(0, 1023)
            
            # Phase 2: Decision Logic
            if water_level <= 500:
                decision = "SAFE (Water Level Normal)"
                decision_ansi = "\033[92mSAFE\033[0m (Water Level Normal)"
            else:
                decision = "ALERT (Flood Alert!)"
                decision_ansi = "\033[91mALERT\033[0m (Flood Alert!)"
                
            # Phase 3: Data Transmission
            payload = {"level": water_level}
            try:
                res = requests.post(API_URL, json=payload, timeout=5)
                if res.status_code == 200:
                    print(f"[Sensor] Level: {water_level:4d} | Status: {decision_ansi} | Transmitted to /flood", flush=True)
                else:
                    print(f"[Sensor] Level: {water_level:4d} | Status: {decision} | HTTP {res.status_code}", flush=True)
            except requests.exceptions.RequestException:
                print(f"[Sensor] Level: {water_level:4d} | Status: {decision} | Server unreachable ({API_URL})", flush=True)
                
            if once:
                break
            time.sleep(interval)
            
    except KeyboardInterrupt:
        print("\nSimulation stopped by user. Exiting safely.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SFEWS Simple Sensor Simulator")
    parser.add_argument("--once", action="store_true", help="Run single reading transmission")
    parser.add_argument("--interval", type=float, default=2.0, help="Interval seconds")
    args = parser.parse_args()

    simulate_sensor(once=args.once, interval=args.interval)

import time
import random
import requests

API_URL = "http://localhost:8000/flood"

def simulate_sensor():
    print("==================================================")
    print("   ~~~ SFEWS IoT Edge Sensor Simulator (Phase 1-3)")
    print("==================================================")
    print(f"Target API Endpoint : {API_URL}")
    print("Interval Frequency  : Every 2.0 seconds")
    print("Threshold Level     : 500 (Safe <= 500 < Alert)")
    print("--------------------------------------------------")
    print("Starting continuous simulation loop. Press Ctrl+C to stop.\n")
    
    try:
        while True:
            # Phase 1: Data Generation (Simulated Sensor)
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
                    print(f"[Sensor] Generated Level: {water_level:4d} | Decision: {decision_ansi} | Transmitted successfully to /flood")
                else:
                    print(f"[Sensor] Generated Level: {water_level:4d} | Decision: {decision} | Transmission FAILED: HTTP {res.status_code}")
            except requests.exceptions.RequestException as req_err:
                print(f"[Sensor] Generated Level: {water_level:4d} | Decision: {decision} | Transmission FAILED: Server is unreachable. (Is the backend running on port 8000?)")
                
            time.sleep(2.0)
            
    except KeyboardInterrupt:
        print("\nSimulation stopped by user. Exiting SFEWS Simple Sensor Simulator safely.")

if __name__ == "__main__":
    simulate_sensor()

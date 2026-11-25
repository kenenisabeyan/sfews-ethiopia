#!/usr/bin/env python3
"""
🌊 SFEWS — Virtual Edge Hardware & NMEA-0183 Serial Bridge
Adama Science and Technology University (ASTU)
IETP5201 - Integrated Engineering Team Project

Emulates real-world IoT microcontrollers (Arduino Uno / ESP32) transmitting
proprietary hydro-meteorological NMEA-0183 sentences over serial or TCP/IP.
Validates 8-bit XOR frame checksums, computes acoustic thermal velocity
correction, and forwards telemetry to the SFEWS production backend.
"""

import sys
import time
import math
import random
import argparse
import urllib.request
import urllib.error
import json
from typing import Dict, Tuple, Optional

# NMEA Sentence Identifier: $PETH = Proprietary Ethiopian Telemetry Hydro-station
NMEA_PREFIX = "$PETH"

def compute_nmea_checksum(sentence: str) -> str:
    """
    Computes standard NMEA 8-bit XOR checksum over all characters
    strictly between '$' and '*' (exclusive).
    """
    if sentence.startswith("$"):
        sentence = sentence[1:]
    if "*" in sentence:
        sentence = sentence.split("*")[0]
        
    csum = 0
    for char in sentence:
        csum ^= ord(char)
    return f"{csum:02X}"

def verify_nmea_sentence(raw_line: str) -> Tuple[bool, Optional[list], str]:
    """
    Verifies NMEA frame integrity:
    1. Must begin with '$'
    2. Must contain '*' delimiter followed by 2 hex digits
    3. XOR checksum must match computed checksum
    """
    clean_line = raw_line.strip()
    if not clean_line.startswith("$") or "*" not in clean_line:
        return False, None, "Malformed frame: Missing '$' start or '*' checksum delimiter"

    body, given_csum = clean_line.split("*", 1)
    computed_csum = compute_nmea_checksum(body)

    if given_csum.upper() != computed_csum.upper():
        return False, None, f"Checksum failure: Given={given_csum.upper()}, Expected={computed_csum.upper()}"

    fields = (body[1:] if body.startswith("$") else body).split(",")
    return True, fields, "OK"

def generate_nmea_sentence(
    station_id: str,
    raw_distance_cm: float,
    rainfall_rate_mm: float,
    ambient_temp_c: float,
    battery_level: float
) -> str:
    """Constructs a fully compliant NMEA-0183 hydro sentence with checksum."""
    body = f"PETH,{station_id},{raw_distance_cm:.1f},{rainfall_rate_mm:.1f},{ambient_temp_c:.1f},{battery_level:.1f}"
    checksum = compute_nmea_checksum(body)
    return f"${body}*{checksum}\r\n"

def compensate_acoustic_distance(raw_distance_cm: float, ambient_temp_c: float, sensor_offset_height_cm: float = 600.0) -> float:
    """
    Physics compensation: c(T) = 331.3 * sqrt(1 + T / 273.15) [m/s]
    Calibrated against 20.0°C base laboratory reference.
    """
    v_ambient = 331.3 * math.sqrt(1.0 + (ambient_temp_c / 273.15))
    v_calib = 331.3 * math.sqrt(1.0 + (20.0 / 273.15))
    ratio = v_ambient / v_calib
    corrected_dist = raw_distance_cm * ratio
    water_stage_cm = max(sensor_offset_height_cm - corrected_dist, 0.0)
    return round(water_stage_cm, 1)

def forward_to_backend(api_url: str, station_id: str, stage_cm: float, rainfall_mm: float, battery_pct: float) -> bool:
    """Dispatches JSON telemetry payload over HTTP REST to SFEWS backend."""
    payload = {
        "node_id": station_id,
        "water_level_cm": stage_cm,
        "rainfall_rate_mm": rainfall_mm,
        "battery_level": battery_pct
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        api_url,
        data=data,
        headers={"Content-Type": "application/json", "User-Agent": "SFEWS-Virtual-Edge-Bridge/4.2"}
    )
    try:
        with urllib.request.urlopen(req, timeout=3.0) as resp:
            return resp.status in (200, 201)
    except Exception as e:
        print(f"   ⚠️  Dispatch failed to {api_url}: {e}")
        return False

def run_bridge_cycle(station_id: str, api_url: str, base_depth_cm: float, temp_c: float, verbose: bool = True) -> Dict:
    """Executes a single end-to-end NMEA synthesis, verification, compensation, and ingestion cycle."""
    # Simulate ultrasonic sensor transit distance (Sensor mounted at 600cm offset)
    sensor_mounting_cm = 600.0
    true_depth = base_depth_cm + random.uniform(-2.5, 3.5)
    uncompensated_dist = sensor_mounting_cm - true_depth
    rain_rate = max(0.0, random.uniform(0.0, 15.0) if true_depth > 300 else 0.0)
    battery = round(random.uniform(92.0, 98.5), 1)

    # 1. Synthesize NMEA Sentence
    raw_nmea = generate_nmea_sentence(station_id, uncompensated_dist, rain_rate, temp_c, battery)
    
    # 2. Verify Frame Integrity
    is_valid, fields, reason = verify_nmea_sentence(raw_nmea)
    if not is_valid:
        raise ValueError(f"Bridge checksum error: {reason}")

    # 3. Apply Acoustic Temperature Compensation
    compensated_stage = compensate_acoustic_distance(uncompensated_dist, temp_c, sensor_mounting_cm)

    # 4. Forward to SFEWS Ingestion Endpoint
    success = forward_to_backend(api_url, station_id, compensated_stage, rain_rate, battery)

    res = {
        "nmea_raw": raw_nmea.strip(),
        "verified": is_valid,
        "station_id": station_id,
        "raw_distance_cm": round(uncompensated_dist, 1),
        "ambient_temp_c": temp_c,
        "compensated_stage_cm": compensated_stage,
        "rainfall_mm": round(rain_rate, 1),
        "battery_level": battery,
        "backend_dispatched": success
    }

    if verbose:
        print(f"📡 [NMEA-RX] {res['nmea_raw']}")
        print(f"   ⚙️  Verified: OK | Temp: {temp_c}°C | Acoustic Stage: {compensated_stage}cm | Backend: {'Synced' if success else 'Queued'}")

    return res

def main():
    parser = argparse.ArgumentParser(description="SFEWS Virtual Edge Hardware & NMEA-0183 Serial Bridge")
    parser.add_argument("--station", default="NODE-ALPHA-1", help="Target Station Identifier")
    parser.add_argument("--port", type=int, default=5000, help="SFEWS Backend Port (5000=Flask, 8000=FastAPI)")
    parser.add_argument("--mode", choices=["once", "loop"], default="once", help="Execution mode")
    parser.add_argument("--temp", type=float, default=32.0, help="Ambient temperature in °C (Awash Valley)")
    parser.add_argument("--stage", type=float, default=265.0, help="Simulated river stage in cm")
    parser.add_argument("--interval", type=float, default=2.0, help="Loop interval seconds")
    args = parser.parse_args()

    api_url = f"http://localhost:{args.port}/api/v1/telemetry/"
    print(f"\n==================================================================")
    print(f"🌊 SFEWS Virtual Edge Hardware & NMEA-0183 Serial Bridge")
    print(f"Target: {args.station} -> {api_url}")
    print(f"==================================================================")

    if args.mode == "once":
        run_bridge_cycle(args.station, api_url, args.stage, args.temp, verbose=True)
    else:
        print(f"Running continuous bridge loop (Interval: {args.interval}s)... Press Ctrl+C to stop.")
        try:
            while True:
                run_bridge_cycle(args.station, api_url, args.stage, args.temp, verbose=True)
                time.sleep(args.interval)
        except KeyboardInterrupt:
            print("\nBridge stopped cleanly.")

if __name__ == "__main__":
    main()

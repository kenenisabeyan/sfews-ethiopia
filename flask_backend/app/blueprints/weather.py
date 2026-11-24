from datetime import datetime, timezone
from flask import Blueprint, jsonify, request

weather_bp = Blueprint("weather", __name__, url_prefix="/api/v1/weather")

# Meteorological observation anchors across the Awash Highland Catchment & Rift Valley
STATION_METEO = {
    "NODE-ALPHA-1": {"station_name": "Ginchi Catchment", "temp_c": 21.4, "humidity_pct": 78, "pressure_hpa": 1014.2, "rain_intensity_mm_h": 12.5, "condition": "Overcast Heavy Rain"},
    "NODE-GAMMA-3": {"station_name": "Mojo Valley", "temp_c": 24.8, "humidity_pct": 65, "pressure_hpa": 1012.8, "rain_intensity_mm_h": 4.2, "condition": "Light Showers"},
    "NODE-BETA-2": {"station_name": "Wonji Plantation", "temp_c": 27.1, "humidity_pct": 58, "pressure_hpa": 1011.5, "rain_intensity_mm_h": 0.0, "condition": "Partly Cloudy"},
    "NODE-AWASH-01": {"station_name": "Awash Station Gorge", "temp_c": 29.5, "humidity_pct": 49, "pressure_hpa": 1009.8, "rain_intensity_mm_h": 0.0, "condition": "Scattered Clouds"}
}

@weather_bp.route("/current", methods=["GET"])
def get_current_weather():
    """Returns meteorological telemetry across basin stations."""
    station_id = request.args.get("station_id")
    if station_id:
        if station_id in STATION_METEO:
            return jsonify({"station_id": station_id, **STATION_METEO[station_id], "timestamp": datetime.now(timezone.utc).isoformat()}), 200
        return jsonify({"detail": f"Weather anchor for '{station_id}' not found"}), 404
    
    return jsonify({
        "network": "Ethiopian National Meteorology Agency (NMA) Awash Feed",
        "stations": STATION_METEO,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }), 200

@weather_bp.route("/radar", methods=["GET"])
def get_weather_radar():
    """Simulates Doppler radar precipitation reflectivity grid (dBZ)."""
    grid_cells = [
        {"cell_id": "AW-RAD-01", "lat": 8.95, "lng": 39.10, "reflectivity_dbz": 48.5, "intensity": "VERY_HEAVY_RAIN", "cell_velocity_kmh": 22.0},
        {"cell_id": "AW-RAD-02", "lat": 8.60, "lng": 39.25, "reflectivity_dbz": 36.2, "intensity": "MODERATE_RAIN", "cell_velocity_kmh": 18.5},
        {"cell_id": "AW-RAD-03", "lat": 8.40, "lng": 39.30, "reflectivity_dbz": 18.0, "intensity": "LIGHT_DRIZZLE", "cell_velocity_kmh": 14.0},
        {"cell_id": "AW-RAD-04", "lat": 8.98, "lng": 40.15, "reflectivity_dbz": 5.0, "intensity": "CLEAR", "cell_velocity_kmh": 0.0}
    ]
    return jsonify({
        "radar_unit": "Adama Doppler Meteorological Radar (AW-RAD-01)",
        "sweep_timestamp": datetime.now(timezone.utc).isoformat(),
        "max_reflectivity_dbz": 48.5,
        "hazard_cells_detected": 1,
        "grid": grid_cells
    }), 200

@weather_bp.route("/forecast", methods=["GET"])
def get_meteo_forecast():
    """Returns 3-day regional rainfall precipitation outlook for the catchment."""
    days = [
        {"day": "Day 1 (Today)", "precip_expected_mm": 35.0, "prob_thunderstorm": 85, "risk": "ELEVATED"},
        {"day": "Day 2 (Tomorrow)", "precip_expected_mm": 22.0, "prob_thunderstorm": 60, "risk": "MODERATE"},
        {"day": "Day 3 (Extended)", "precip_expected_mm": 8.0, "prob_thunderstorm": 25, "risk": "LOW"}
    ]
    return jsonify({
        "basin": "Awash River Catchment",
        "monsoon_phase": "Kiremt Peak Rain Front",
        "3_day_forecast": days,
        "advisory": "High surface runoff expected over upper plateau catchments."
    }), 200

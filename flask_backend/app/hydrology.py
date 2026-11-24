import math
from typing import Tuple, Dict

# Hydraulic Conveyance Coefficients for the Awash River Basin
# Rating Curve Formulation: Q = C * (H - H0)^P (Discharge in m3/s, stage in meters)
RATING_C = 14.85
RATING_H0 = 0.50
RATING_P = 1.68

# River reach distances from Headwaters (NODE-ALPHA-1) in kilometers
STATION_DISTANCES_KM = {
    "NODE-ALPHA-1": 0.0,
    "NODE-GAMMA-3": 28.5,
    "NODE-BETA-2": 54.2,
    "NODE-AWASH-01": 89.0
}

def calculate_discharge(stage_cm: float) -> float:
    """Calculates volumetric river discharge using standard stage-discharge rating law."""
    stage_m = stage_cm / 100.0
    if stage_m <= RATING_H0:
        return 0.0
    effective_head = stage_m - RATING_H0
    discharge = RATING_C * math.pow(effective_head, RATING_P)
    return round(discharge, 2)

def evaluate_flood_risk(water_level_cm: float, rainfall_rate_mm: float) -> Tuple[float, str]:
    """
    Physics-augmented multi-tier flood risk scoring algorithm:
    Normalizes hydraulic depth and precipitation into a calibrated risk probability and tier.
    """
    level_norm = min(max(water_level_cm / 600.0, 0.0), 1.0)
    rain_norm = min(max(rainfall_rate_mm / 100.0, 0.0), 1.0)
    
    # Combined heuristic probability: 70% river depth + 30% precipitation intensity
    raw_probability = (level_norm * 0.70) + (rain_norm * 0.30)
    
    # Non-linear surge curve for critical stages (> 400cm)
    if water_level_cm > 450.0:
        raw_probability = max(raw_probability, 0.85)
    elif water_level_cm > 350.0:
        raw_probability = max(raw_probability, 0.60)
    elif water_level_cm > 250.0:
        raw_probability = max(raw_probability, 0.35)
        
    prob = round(min(max(raw_probability, 0.0), 1.0), 4)

    if prob >= 0.75 or water_level_cm >= 450.0:
        risk_level = "Critical"
    elif prob >= 0.50 or water_level_cm >= 350.0:
        risk_level = "Warning"
    elif prob >= 0.25 or water_level_cm >= 250.0:
        risk_level = "Advisory"
    else:
        risk_level = "Normal"

    return prob, risk_level

def classify_surge_dynamics(current_cm: float, prev_cm: float, dt_seconds: float = 2.0) -> str:
    """Computes rate of rise and categorizes hydrological surge state."""
    if dt_seconds <= 0:
        dt_seconds = 2.0
    rate_cm_min = ((current_cm - prev_cm) / dt_seconds) * 60.0
    
    if rate_cm_min > 30.0:
        return "Flash Flood Surge (Severe)"
    elif rate_cm_min > 10.0:
        return "Rising Stage (Rapid)"
    elif rate_cm_min > 2.0:
        return "Moderate Inflow"
    elif rate_cm_min < -5.0:
        return "Receding Waters"
    else:
        return "Stable Baseflow"

def estimate_downstream_wave_arrival(source_station: str, target_station: str, current_discharge_m3s: float) -> Dict:
    """
    Estimates flood wave travel time (kinematic wave celerity):
    celerity c_k = (5/3) * v_mean (approx ~ 2.5 m/s to 4.0 m/s for Awash mountain-to-plains reach)
    """
    d1 = STATION_DISTANCES_KM.get(source_station, 0.0)
    d2 = STATION_DISTANCES_KM.get(target_station, 0.0)
    reach_distance_km = abs(d2 - d1)

    if reach_distance_km == 0:
        return {"travel_time_hours": 0.0, "reach_distance_km": 0.0, "estimated_celerity_m_s": 0.0}

    # Higher discharge increases wave celerity
    wave_speed_ms = 2.2 + min(current_discharge_m3s / 500.0, 2.0)
    travel_time_seconds = (reach_distance_km * 1000.0) / wave_speed_ms
    travel_time_hours = round(travel_time_seconds / 3600.0, 2)

    return {
        "source_station": source_station,
        "target_station": target_station,
        "reach_distance_km": reach_distance_km,
        "estimated_celerity_m_s": round(wave_speed_ms, 2),
        "travel_time_hours": travel_time_hours,
        "estimated_lead_time_minutes": int(travel_time_hours * 60)
    }

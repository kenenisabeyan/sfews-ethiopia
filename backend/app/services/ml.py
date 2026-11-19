from typing import Dict, Any, Optional

def calculate_rate_of_rise(
    current_water_level_cm: float,
    previous_water_level_cm: Optional[float],
    elapsed_seconds: float
) -> float:
    """
    Computes the instantaneous rate of rise (cm/hour) between consecutive hydro logs.
    Captures fast-moving flash flood surges down from the Ethiopian highlands.
    """
    if previous_water_level_cm is None or elapsed_seconds <= 0:
        return 0.0
    
    # Cap minimum delta time to 5 seconds to prevent division by zero / sensor noise bursts
    dt_hours = max(elapsed_seconds, 5.0) / 3600.0
    delta_h = current_water_level_cm - previous_water_level_cm
    rate = delta_h / dt_hours
    return round(rate, 2)

def calculate_estimated_discharge(water_level_cm: float) -> float:
    """
    Estimates river discharge (Q in m^3/s) using the Awash Basin stage-discharge
    power curve: Q = C * (h - h0)^beta.
    Calibrated for typical cross-sections of the Upper and Middle Awash River.
    """
    h0 = 15.0  # Gauge datum zero-flow stage in cm
    if water_level_cm <= h0:
        return 0.0
    
    c = 0.045
    beta = 1.62
    discharge = c * ((water_level_cm - h0) ** beta)
    return round(discharge, 2)

def evaluate_surge_dynamics(rate_of_rise_cm_per_hr: float) -> Dict[str, Any]:
    """
    Classifies the rate of rise into hydrological dynamics categories.
    """
    if rate_of_rise_cm_per_hr >= 50.0:
        return {
            "status": "Flash Surge",
            "description": "Extreme rapid ascent: Immediate flash flood warning protocol active.",
            "severity_index": 3
        }
    elif rate_of_rise_cm_per_hr >= 20.0:
        return {
            "status": "Rapid Inundation",
            "description": "High rate of rise: Catchment runoff accelerating into river bed.",
            "severity_index": 2
        }
    elif rate_of_rise_cm_per_hr >= 5.0:
        return {
            "status": "Steady Inflow",
            "description": "Moderate river ascent under standard seasonal precipitation.",
            "severity_index": 1
        }
    elif rate_of_rise_cm_per_hr >= -5.0:
        return {
            "status": "Stable Baseflow",
            "description": "Water levels exhibiting stable equilibrium baseflow.",
            "severity_index": 0
        }
    else:
        return {
            "status": "Receding Hydrograph",
            "description": "Flood wave crest has passed downstream; water level subsiding.",
            "severity_index": 0
        }

def predict_flood_probability(
    water_level_cm: float,
    rainfall_rate_mm: float,
    rate_of_rise_cm_per_hr: float = 0.0
) -> float:
    """
    Hydrological ensemble predictive model:
    Combines stage depth, rainfall intensity, and surge velocity (rate of rise)
    into a calibrated flood probability index [0.0, 1.0].
    """
    normalized_water = min(max(water_level_cm / 500.0, 0.0), 1.0)
    normalized_rain = min(max(rainfall_rate_mm / 100.0, 0.0), 1.0)
    normalized_surge = min(max(rate_of_rise_cm_per_hr / 60.0, 0.0), 1.0)
    
    # Weighted ensemble calculation
    probability = (normalized_water * 0.50) + (normalized_rain * 0.30) + (normalized_surge * 0.20)
    
    # Non-linear amplification when conditions compound
    if probability > 0.6:
        probability += 0.15
        
    return round(min(max(probability, 0.0), 1.0), 3)

def evaluate_risk_tier(
    probability: float,
    rate_of_rise_cm_per_hr: float = 0.0,
    water_level_cm: float = 0.0,
    warning_threshold: float = 300.0,
    critical_threshold: float = 450.0
) -> str:
    """
    Categorizes overall operational risk tier based on ensemble probability,
    threshold exceedance, and sudden flash surges.
    """
    # Absolute critical breach OR severe flash surge while near high water
    if (
        water_level_cm >= critical_threshold or
        probability >= 0.75 or
        (rate_of_rise_cm_per_hr >= 45.0 and water_level_cm >= (warning_threshold * 0.85))
    ):
        return "Critical"
    elif (
        water_level_cm >= warning_threshold or
        probability >= 0.45 or
        rate_of_rise_cm_per_hr >= 25.0
    ):
        return "Warning"
    else:
        return "Safe"

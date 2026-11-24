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

def compensate_ultrasonic_temperature(
    raw_distance_cm: float,
    ambient_temp_c: float,
    calibration_temp_c: float = 20.0,
    sensor_offset_height_cm: float = 600.0
) -> Dict:
    """
    Applies physics-based acoustic velocity temperature correction:
    Speed of sound in dry air: c(T) = 331.3 * sqrt(1 + T / 273.15) [m/s].
    Corrects thermal sensor drift in high-ambient Ethiopian lowlands (e.g. Awash Basin up to 42°C).
    """
    speed_sound_ambient = 331.3 * math.sqrt(1.0 + (ambient_temp_c / 273.15))
    speed_sound_calib = 331.3 * math.sqrt(1.0 + (calibration_temp_c / 273.15))
    
    correction_ratio = speed_sound_ambient / speed_sound_calib
    corrected_distance_cm = raw_distance_cm * correction_ratio
    
    thermal_offset_cm = corrected_distance_cm - raw_distance_cm
    water_level_cm = max(sensor_offset_height_cm - corrected_distance_cm, 0.0)
    
    return {
        "raw_distance_cm": round(raw_distance_cm, 2),
        "ambient_temp_c": round(ambient_temp_c, 1),
        "speed_of_sound_m_s": round(speed_sound_ambient, 2),
        "speed_ratio": round(correction_ratio, 4),
        "thermal_offset_cm": round(thermal_offset_cm, 2),
        "corrected_distance_cm": round(corrected_distance_cm, 2),
        "sensor_offset_height_cm": round(sensor_offset_height_cm, 2),
        "compensated_water_level_cm": round(water_level_cm, 2)
    }

def calculate_mannings_hydraulics(
    stage_cm: float,
    bottom_width_m: float = 12.0,
    side_slope_z: float = 1.5,
    mannings_n: float = 0.035,
    bed_slope: float = 0.0018
) -> Dict:
    """
    Computes open-channel cross-sectional hydraulics via Manning's Equation:
    Trapezoidal river reach geometry:
      - Area A = (b + z * y) * y
      - Wetted perimeter P = b + 2 * y * sqrt(1 + z^2)
      - Hydraulic radius R = A / P
      - Velocity v = (1 / n) * R^(2/3) * S0^(1/2)
      - Discharge Q = v * A
      - Froude Number Fr = v / sqrt(g * D)
    """
    y = max(stage_cm / 100.0, 0.01)
    b = max(bottom_width_m, 1.0)
    z = max(side_slope_z, 0.0)
    n = max(mannings_n, 0.01)
    s0 = max(bed_slope, 0.0001)
    g = 9.80665

    area = (b + (z * y)) * y
    perimeter = b + (2.0 * y * math.sqrt(1.0 + (z * z)))
    hydraulic_radius = area / perimeter
    
    velocity = (1.0 / n) * math.pow(hydraulic_radius, 2.0 / 3.0) * math.sqrt(s0)
    discharge = velocity * area
    
    top_width = b + (2.0 * z * y)
    hydraulic_depth = area / top_width
    froude_number = velocity / math.sqrt(g * hydraulic_depth)

    if froude_number < 0.90:
        regime = "Subcritical (Tranquil Baseflow)"
    elif froude_number <= 1.10:
        regime = "Critical (Hydraulic Transition)"
    else:
        regime = "Supercritical (Torrential Flash Surge)"

    return {
        "stage_m": round(y, 3),
        "cross_sectional_area_m2": round(area, 2),
        "wetted_perimeter_m": round(perimeter, 2),
        "hydraulic_radius_m": round(hydraulic_radius, 3),
        "mean_velocity_m_s": round(velocity, 2),
        "discharge_m3_s": round(discharge, 2),
        "top_channel_width_m": round(top_width, 2),
        "froude_number": round(froude_number, 3),
        "flow_regime": regime
    }

def calibrate_rating_curve_least_squares(
    gauging_points: list,
    fixed_h0: float = 0.50
) -> Dict:
    """
    Performs analytical closed-form log-linear power regression:
    Model: Q = C * (H - H0)^P  =>  ln(Q) = ln(C) + P * ln(H - H0)
    Calibrates empirical ADCP field stream gaugings to rating curve parameters.
    """
    valid_points = []
    for pt in gauging_points:
        h = pt.get("stage_cm", 0.0) / 100.0
        q = pt.get("discharge_m3s", 0.0)
        if h > fixed_h0 and q > 0:
            valid_points.append((math.log(h - fixed_h0), math.log(q)))

    if len(valid_points) < 2:
        return {
            "status": "INSUFFICIENT_DATA",
            "message": "At least 2 valid gauging points with H > H0 and Q > 0 are required.",
            "calibrated_c": RATING_C,
            "calibrated_p": RATING_P,
            "fixed_h0": fixed_h0,
            "r_squared": 0.0
        }

    n = len(valid_points)
    sum_x = sum(p[0] for p in valid_points)
    sum_y = sum(p[1] for p in valid_points)
    sum_xy = sum(p[0] * p[1] for p in valid_points)
    sum_x2 = sum(p[0] ** 2 for p in valid_points)
    sum_y2 = sum(p[1] ** 2 for p in valid_points)

    denom = (n * sum_x2) - (sum_x ** 2)
    if abs(denom) < 1e-9:
        slope_p = RATING_P
        intercept_ln_c = math.log(RATING_C)
    else:
        slope_p = ((n * sum_xy) - (sum_x * sum_y)) / denom
        intercept_ln_c = (sum_y - (slope_p * sum_x)) / n

    calibrated_c = math.exp(intercept_ln_c)

    # Compute Pearson R-squared
    y_mean = sum_y / n
    ss_tot = sum((p[1] - y_mean) ** 2 for p in valid_points)
    ss_res = sum((p[1] - (intercept_ln_c + slope_p * p[0])) ** 2 for p in valid_points)
    r_squared = 1.0 - (ss_res / ss_tot) if ss_tot > 0 else 1.0

    return {
        "status": "CALIBRATED",
        "sample_points_used": n,
        "calibrated_c": round(calibrated_c, 3),
        "calibrated_p": round(slope_p, 3),
        "fixed_h0": round(fixed_h0, 3),
        "r_squared": round(max(min(r_squared, 1.0), 0.0), 4),
        "equation": f"Q = {calibrated_c:.2f} * (H - {fixed_h0:.2f})^{slope_p:.2f}",
        "units": "H in meters, Q in m³/s"
    }

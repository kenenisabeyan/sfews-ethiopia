from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from ..database import SessionLocal
from ..models import HydroLog, SensorNode, AlertLog
from ..hydrology import evaluate_flood_risk, calculate_discharge

simulation_bp = Blueprint("simulation", __name__)

# Simulator state cache for immediate interoperability with hardware rigs & mock loops
SIMULATOR_STATE = {
    "water_level": 140.0,
    "rainfall": 0.0,
    "status": "NORMAL",
    "updated_at": datetime.now(timezone.utc).isoformat()
}

@simulation_bp.route("/flood", methods=["GET", "POST"])
def flood_interop():
    """
    Dedicated endpoint supporting legacy / simulator testbed rigs:
    - GET returns current simulated river condition
    - POST injects simulated flood surges
    """
    if request.method == "POST":
        data = request.get_json(silent=True) or {}
        water_level = float(data.get("water_level", data.get("water_level_cm", 220.0)))
        rainfall = float(data.get("rainfall", data.get("rainfall_rate_mm", 12.0)))

        prob, risk = evaluate_flood_risk(water_level, rainfall)
        discharge = calculate_discharge(water_level)

        SIMULATOR_STATE["water_level"] = water_level
        SIMULATOR_STATE["rainfall"] = rainfall
        SIMULATOR_STATE["status"] = risk.upper()
        SIMULATOR_STATE["updated_at"] = datetime.now(timezone.utc).isoformat()

        # Ingest into NODE-ALPHA-1 automatically
        db = SessionLocal()
        try:
            log_entry = HydroLog(
                node_id="NODE-ALPHA-1",
                water_level_cm=water_level,
                rainfall_rate_mm=rainfall,
                flood_probability=prob,
                risk_level=risk
            )
            db.add(log_entry)
            db.commit()
        finally:
            db.close()

        return jsonify({
            "status": "SIMULATION_UPDATED",
            "water_level": water_level,
            "rainfall": rainfall,
            "discharge_m3s": discharge,
            "risk_level": risk
        }), 200

    # GET request
    return jsonify(SIMULATOR_STATE), 200

@simulation_bp.route("/api/v1/simulation/inject", methods=["POST"])
def inject_surge():
    data = request.get_json(silent=True) or {}
    node_id = data.get("node_id", "NODE-AWASH-01")
    target_stage = float(data.get("target_stage_cm", 480.0))
    rain_rate = float(data.get("rain_rate_mm", 45.0))

    db = SessionLocal()
    try:
        prob, risk = evaluate_flood_risk(target_stage, rain_rate)
        log = HydroLog(
            node_id=node_id,
            water_level_cm=target_stage,
            rainfall_rate_mm=rain_rate,
            flood_probability=prob,
            risk_level=risk
        )
        db.add(log)
        
        # Add critical alert
        alert = AlertLog(
            node_id=node_id,
            title=f"SIMULATED FLOOD SURGE INJECTED: {node_id}",
            message=f"Simulated water stage spiked to {target_stage} cm. Risk: {risk}.",
            severity=risk,
            water_level_cm=target_stage
        )
        db.add(alert)
        db.commit()
        return jsonify({
            "status": "SURGE_INJECTED",
            "node_id": node_id,
            "stage_cm": target_stage,
            "risk_level": risk,
            "alert_id": alert.id
        }), 200
    finally:
        db.close()

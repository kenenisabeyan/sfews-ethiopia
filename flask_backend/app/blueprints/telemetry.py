import io
import csv
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, Response
from ..database import SessionLocal
from ..models import SensorNode, HydroLog, AlertLog
from ..hydrology import (
    evaluate_flood_risk,
    calculate_discharge,
    classify_surge_dynamics,
    compensate_ultrasonic_temperature,
    calculate_mannings_hydraulics,
    calibrate_rating_curve_least_squares
)
from ..services.alert_dispatcher import alert_dispatcher

telemetry_bp = Blueprint("telemetry", __name__, url_prefix="/api/v1/telemetry")

@telemetry_bp.route("/", methods=["POST"])
def ingest_telemetry():
    data = request.get_json(silent=True) or {}
    node_id = data.get("node_id") or data.get("station_id")
    water_level = data.get("water_level_cm") or data.get("stage_cm")
    rainfall = data.get("rainfall_rate_mm", 0.0)
    battery = data.get("battery_level") or data.get("battery_v")

    if not node_id or water_level is None:
        return jsonify({"detail": "Missing mandatory telemetry fields (node_id, water_level_cm)"}), 400

    try:
        water_level = float(water_level)
        rainfall = float(rainfall)
    except ValueError:
        return jsonify({"detail": "Telemetry numeric values must be valid floats"}), 400

    db = SessionLocal()
    try:
        node = db.query(SensorNode).filter(SensorNode.id == node_id).first()
        if not node:
            node = SensorNode(id=node_id, name=f"Station {node_id}", status="Active", battery_level=battery or 95.0)
            db.add(node)
            db.flush()
        else:
            if battery is not None:
                node.battery_level = float(battery)
            node.status = "Active"
            node.last_updated = datetime.now(timezone.utc)

        prob, risk_level = evaluate_flood_risk(water_level, rainfall)
        discharge = calculate_discharge(water_level)

        prev_log = db.query(HydroLog).filter(HydroLog.node_id == node_id).order_by(HydroLog.id.desc()).first()
        prev_stage = prev_log.water_level_cm if prev_log else water_level
        surge_state = classify_surge_dynamics(water_level, prev_stage)

        log_entry = HydroLog(
            node_id=node_id,
            water_level_cm=water_level,
            rainfall_rate_mm=rainfall,
            flood_probability=prob,
            risk_level=risk_level
        )
        db.add(log_entry)

        # Trigger acoustic siren and alert record on Critical / Warning
        if risk_level in ["Warning", "Critical"]:
            alert_dispatcher.arm_acoustic_siren(node_id)
            existing_unack = db.query(AlertLog).filter(
                AlertLog.node_id == node_id,
                AlertLog.is_acknowledged == False
            ).first()
            if not existing_unack:
                alert = AlertLog(
                    node_id=node_id,
                    title=f"ELEVATED WATER LEVEL {risk_level.upper()} AT {node_id}",
                    message=f"River stage reached {water_level:.1f} cm (Discharge: {discharge:.1f} m3/s). Rate: {surge_state}.",
                    severity=risk_level,
                    water_level_cm=water_level
                )
                db.add(alert)

        db.commit()

        return jsonify({
            "status": "INGESTED",
            "node_id": node_id,
            "stage_cm": water_level,
            "discharge_m3s": discharge,
            "risk_level": risk_level,
            "flood_probability": prob,
            "surge_state": surge_state,
            "siren_armed": alert_dispatcher.siren_armed,
            "timestamp": log_entry.timestamp.isoformat() if log_entry.timestamp else datetime.now(timezone.utc).isoformat()
        }), 201
    finally:
        db.close()

@telemetry_bp.route("/batch", methods=["POST"])
def ingest_batch_telemetry():
    payload = request.get_json(silent=True) or {}
    readings = payload.get("readings", [])
    if not isinstance(readings, list) or not readings:
        return jsonify({"detail": "Payload must contain a non-empty 'readings' array"}), 400

    db = SessionLocal()
    processed_count = 0
    try:
        for r in readings:
            nid = r.get("node_id") or r.get("station_id")
            lvl = r.get("water_level_cm") or r.get("stage_cm")
            rain = r.get("rainfall_rate_mm", 0.0)
            if nid and lvl is not None:
                prob, risk = evaluate_flood_risk(float(lvl), float(rain))
                log_entry = HydroLog(
                    node_id=nid,
                    water_level_cm=float(lvl),
                    rainfall_rate_mm=float(rain),
                    flood_probability=prob,
                    risk_level=risk
                )
                db.add(log_entry)
                processed_count += 1
        db.commit()
        return jsonify({"status": "SUCCESS", "ingested_count": processed_count}), 201
    finally:
        db.close()

@telemetry_bp.route("/stats", methods=["GET"])
def get_telemetry_stats():
    db = SessionLocal()
    try:
        total_logs = db.query(HydroLog).count()
        critical_count = db.query(HydroLog).filter(HydroLog.risk_level == "Critical").count()
        warning_count = db.query(HydroLog).filter(HydroLog.risk_level == "Warning").count()
        return jsonify({
            "total_telemetry_records": total_logs,
            "critical_events": critical_count,
            "warning_events": warning_count,
            "siren_active": alert_dispatcher.siren_armed,
            "status": "OPERATIONAL"
        }), 200
    finally:
        db.close()

@telemetry_bp.route("/export", methods=["GET"])
def export_telemetry_csv():
    """Generates official CSV export of historical hydrological records."""
    db = SessionLocal()
    try:
        records = db.query(HydroLog).order_by(HydroLog.id.desc()).limit(500).all()
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["id", "node_id", "water_level_cm", "rainfall_rate_mm", "discharge_m3s", "flood_probability", "risk_level", "timestamp"])

        for r in records:
            q = calculate_discharge(r.water_level_cm)
            writer.writerow([r.id, r.node_id, r.water_level_cm, r.rainfall_rate_mm, q, r.flood_probability, r.risk_level, r.timestamp.isoformat() if r.timestamp else ""])

        output.seek(0)
        return Response(
            output.getvalue(),
            mimetype="text/csv",
            headers={"Content-Disposition": "attachment;filename=sfews_telemetry_export.csv"}
        )
    finally:
        db.close()

@telemetry_bp.route("/forecast/<string:node_id>", methods=["GET"])
def get_node_forecast(node_id: str):
    """Provides 6-hour & 12-hour predictive hydrological forecast for a station."""
    from ..services.ml_engine import ml_engine
    db = SessionLocal()
    try:
        logs = db.query(HydroLog).filter(HydroLog.node_id == node_id).order_by(HydroLog.id.desc()).limit(10).all()
        current_stage = logs[0].water_level_cm if logs else 180.0
        current_rain = logs[0].rainfall_rate_mm if logs else 0.0
        history_stages = [l.water_level_cm for l in reversed(logs)] if logs else [180.0]

        forecast_res = ml_engine.forecast_crest(
            node_id=node_id,
            current_stage_cm=current_stage,
            current_rain_mm=current_rain,
            history_stages=history_stages
        )
        return jsonify(forecast_res), 200
    finally:
        db.close()

@telemetry_bp.route("/aggregate", methods=["GET"])
def get_telemetry_aggregate():
    """Calculates statistical hydrological summary (min, max, avg, std_dev) over specified sample window."""
    node_id = request.args.get("node_id", "NODE-ALPHA-1")
    limit = int(request.args.get("limit", 60))
    
    db = SessionLocal()
    try:
        logs = db.query(HydroLog).filter(HydroLog.node_id == node_id).order_by(HydroLog.id.desc()).limit(limit).all()
        if not logs:
            return jsonify({"detail": f"No telemetry history found for node '{node_id}'"}), 404
        
        stages = [l.water_level_cm for l in logs]
        rains = [l.rainfall_rate_mm for l in logs]
        
        min_stage = min(stages)
        max_stage = max(stages)
        avg_stage = sum(stages) / len(stages)
        variance = sum((x - avg_stage) ** 2 for x in stages) / len(stages)
        std_dev = variance ** 0.5
        
        return jsonify({
            "node_id": node_id,
            "sample_count": len(stages),
            "stage_min_cm": round(min_stage, 1),
            "stage_max_cm": round(max_stage, 1),
            "stage_avg_cm": round(avg_stage, 1),
            "stage_std_dev_cm": round(std_dev, 2),
            "cumulative_rainfall_mm": round(sum(rains), 1),
            "peak_discharge_m3s": calculate_discharge(max_stage),
            "window_duration_samples": len(logs)
        }), 200
    finally:
        db.close()

@telemetry_bp.route("/compare", methods=["GET"])
def compare_stations():
    """Compares instantaneous hydrometric stages, discharges, and risk tiers side-by-side."""
    stations_param = request.args.get("stations", "NODE-ALPHA-1,NODE-GAMMA-3,NODE-BETA-2,NODE-AWASH-01")
    station_ids = [s.strip() for s in stations_param.split(",") if s.strip()]
    
    db = SessionLocal()
    try:
        comparison = []
        for sid in station_ids:
            node = db.query(SensorNode).filter(SensorNode.id == sid).first()
            log = db.query(HydroLog).filter(HydroLog.node_id == sid).order_by(HydroLog.id.desc()).first()
            if node:
                stage = log.water_level_cm if log else 0.0
                comparison.append({
                    "station_id": sid,
                    "name": node.name,
                    "stage_cm": stage,
                    "discharge_m3s": calculate_discharge(stage),
                    "rainfall_rate_mm": log.rainfall_rate_mm if log else 0.0,
                    "risk_level": log.risk_level if log else "Normal",
                    "battery_level": node.battery_level,
                    "status": node.status
                })
        return jsonify({"comparison": comparison, "count": len(comparison)}), 200
    finally:
        db.close()

@telemetry_bp.route("/exceedances", methods=["GET"])
def get_threshold_exceedances():
    """Lists all historical readings where stage breached Warning (350cm) or Critical (450cm) levels."""
    db = SessionLocal()
    try:
        exceedances = db.query(HydroLog).filter(HydroLog.water_level_cm >= 350.0).order_by(HydroLog.id.desc()).limit(50).all()
        return jsonify([{
            "id": e.id,
            "node_id": e.node_id,
            "stage_cm": e.water_level_cm,
            "rainfall_rate_mm": e.rainfall_rate_mm,
            "discharge_m3s": calculate_discharge(e.water_level_cm),
            "risk_level": e.risk_level,
            "timestamp": e.timestamp.isoformat() if e.timestamp else None
        } for e in exceedances]), 200
    finally:
        db.close()



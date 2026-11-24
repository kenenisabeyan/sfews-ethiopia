from datetime import datetime, timezone
from flask import Blueprint, jsonify
from ..database import SessionLocal
from ..models import SensorNode, HydroLog, AlertLog, RiverBasin
from ..hydrology import calculate_discharge

dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/api/v1/dashboard")

@dashboard_bp.route("/", methods=["GET"])
def get_dashboard_root():
    return get_dashboard_summary()

@dashboard_bp.route("/summary", methods=["GET"])
def get_dashboard_summary():
    db = SessionLocal()
    try:
        nodes = db.query(SensorNode).all()
        total_stations = len(nodes)
        active_stations = sum(1 for n in nodes if n.status == "Active")
        
        # Open alerts
        open_alerts = db.query(AlertLog).filter(AlertLog.is_acknowledged == False).count()
        
        # Peak discharge computation across active stations
        max_stage = 0.0
        peak_station = "None"
        for n in nodes:
            log = db.query(HydroLog).filter(HydroLog.node_id == n.id).order_by(HydroLog.id.desc()).first()
            if log and log.water_level_cm > max_stage:
                max_stage = log.water_level_cm
                peak_station = n.id

        peak_q = calculate_discharge(max_stage)
        basin_health = "CRITICAL RISK" if max_stage >= 450.0 else ("WARNING ELEVATED" if max_stage >= 350.0 else "OPERATIONAL")

        return jsonify({
            "total_stations": total_stations,
            "active_stations": active_stations,
            "open_alerts": open_alerts,
            "peak_discharge_m3s": peak_q,
            "peak_station": peak_station,
            "max_water_level_cm": max_stage,
            "basin_health": basin_health,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }), 200
    finally:
        db.close()

@dashboard_bp.route("/trends", methods=["GET"])
def get_dashboard_trends():
    db = SessionLocal()
    try:
        logs = db.query(HydroLog).order_by(HydroLog.id.desc()).limit(30).all()
        logs.reverse()
        return jsonify([{
            "timestamp": l.timestamp.isoformat() if l.timestamp else None,
            "node_id": l.node_id,
            "water_level_cm": l.water_level_cm,
            "rainfall_rate_mm": l.rainfall_rate_mm,
            "risk_level": l.risk_level
        } for l in logs]), 200
    finally:
        db.close()

@dashboard_bp.route("/basins", methods=["GET"])
def get_basins_status():
    db = SessionLocal()
    try:
        basins = db.query(RiverBasin).all()
        return jsonify([{
            "id": b.id,
            "name": b.name,
            "station_count": len(b.sensor_nodes),
            "status": "MONITORED"
        } for b in basins]), 200
    finally:
        db.close()

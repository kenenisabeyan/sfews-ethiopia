import time
from datetime import datetime, timezone
from flask import Blueprint, jsonify
from ..database import SessionLocal, check_db_health
from ..models import SystemSetting, SensorNode, HydroLog, AlertLog
from ..services.watchdog import watchdog
from ..services.alert_dispatcher import alert_dispatcher

system_bp = Blueprint("system", __name__, url_prefix="/api/v1/system")

START_TIME = time.time()

@system_bp.route("/settings", methods=["GET"])
def get_system_settings():
    db = SessionLocal()
    try:
        settings = db.query(SystemSetting).all()
        return jsonify({s.key: s.value for s in settings}), 200
    finally:
        db.close()

@system_bp.route("/diagnostics", methods=["GET"])
def get_diagnostics():
    db = SessionLocal()
    try:
        db_health = check_db_health()
        node_count = db.query(SensorNode).count()
        log_count = db.query(HydroLog).count()
        alert_count = db.query(AlertLog).count()
        uptime_sec = round(time.time() - START_TIME, 1)

        return jsonify({
            "service_name": "SFEWS Production Hydrological Engine (Flask Core)",
            "uptime_seconds": uptime_sec,
            "database": db_health,
            "registered_stations": node_count,
            "total_telemetry_samples": log_count,
            "logged_hazard_alerts": alert_count,
            "siren_system_state": "ARMED" if alert_dispatcher.siren_armed else "STANDBY",
            "sms_gateway_provider": alert_dispatcher.gateway_provider,
            "engine_status": "OPTIMAL",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }), 200
    finally:
        db.close()

@system_bp.route("/watchdog", methods=["GET", "POST"])
def run_watchdog():
    """Executes fleet health watchdog audit across all gauge stations."""
    db = SessionLocal()
    try:
        audit_res = watchdog.audit_fleet_health(db)
        return jsonify(audit_res), 200
    finally:
        db.close()

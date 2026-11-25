import time
from datetime import datetime, timezone
from flask import Blueprint, jsonify, request
from ..database import SessionLocal, check_db_health
from ..models import SystemSetting, SensorNode, HydroLog, AlertLog, User
from ..services.watchdog import watchdog
from ..services.alert_dispatcher import alert_dispatcher
from ..core.cache import cache
from ..core.event_bus import event_bus

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

@system_bp.route("/settings", methods=["POST", "PUT"])
def update_system_settings():
    """Synchronizes warning and critical thresholds and broadcast radius to database."""
    data = request.get_json(silent=True) or {}
    db = SessionLocal()
    try:
        updated = {}
        for key, val in data.items():
            if isinstance(val, (int, float)):
                setting = db.query(SystemSetting).filter(SystemSetting.key == key).first()
                if not setting:
                    setting = SystemSetting(key=key, value=float(val))
                    db.add(setting)
                else:
                    setting.value = float(val)
                updated[key] = float(val)
        db.commit()
        return jsonify({"status": "SYNCHRONIZED", "settings": updated}), 200
    finally:
        db.close()

@system_bp.route("/audit-log", methods=["GET"])
def get_audit_log():
    """Returns chronological system audit log of critical threshold crossings and siren actions."""
    db = SessionLocal()
    try:
        recent_alerts = db.query(AlertLog).order_by(AlertLog.id.desc()).limit(25).all()
        user_count = db.query(User).count()
        node_count = db.query(SensorNode).count()

        events = []
        for a in recent_alerts:
            events.append({
                "event_id": f"EVT-ALT-{a.id}",
                "event_type": "ALERT_TRIGGERED",
                "severity": a.severity,
                "message": a.title,
                "station_id": a.node_id,
                "water_level_cm": a.water_level_cm,
                "acknowledged": a.is_acknowledged,
                "timestamp": a.timestamp.isoformat() if a.timestamp else None
            })

        return jsonify({
            "audit_trail_count": len(events),
            "system_users_registered": user_count,
            "monitored_stations": node_count,
            "events": events
        }), 200
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
            "cache_metrics": cache.get_stats(),
            "event_bus_metrics": event_bus.get_metrics(),
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

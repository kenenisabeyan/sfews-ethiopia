from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, g
from ..database import SessionLocal
from ..models import AlertLog, Subscriber, SensorNode
from ..security import token_required

alerts_bp = Blueprint("alerts", __name__, url_prefix="/api/v1/alerts")

@alerts_bp.route("/", methods=["GET"])
def list_alerts():
    db = SessionLocal()
    try:
        alerts = db.query(AlertLog).order_by(AlertLog.id.desc()).limit(100).all()
        return jsonify([{
            "id": a.id,
            "node_id": a.node_id,
            "title": a.title,
            "message": a.message,
            "severity": a.severity,
            "water_level_cm": a.water_level_cm,
            "is_acknowledged": a.is_acknowledged,
            "acknowledged_by": a.acknowledged_by,
            "timestamp": a.timestamp.isoformat() if a.timestamp else None
        } for a in alerts]), 200
    finally:
        db.close()

@alerts_bp.route("/<int:alert_id>/acknowledge", methods=["POST"])
@token_required
def acknowledge_alert(alert_id: int):
    db = SessionLocal()
    try:
        alert = db.query(AlertLog).filter(AlertLog.id == alert_id).first()
        if not alert:
            return jsonify({"detail": "Alert record not found"}), 404
        
        operator_name = g.current_user.get("name", "Command Operator") if hasattr(g, "current_user") else "Operator"
        alert.is_acknowledged = True
        alert.acknowledged_by = operator_name
        db.commit()
        return jsonify({
            "status": "ACKNOWLEDGED",
            "alert_id": alert.id,
            "acknowledged_by": alert.acknowledged_by
        }), 200
    finally:
        db.close()

@alerts_bp.route("/subscribers", methods=["GET"])
def list_subscribers():
    db = SessionLocal()
    try:
        subs = db.query(Subscriber).all()
        return jsonify([{
            "id": s.id,
            "name": s.name,
            "phone": s.phone,
            "station_id": s.station_id,
            "status": s.status
        } for s in subs]), 200
    finally:
        db.close()

@alerts_bp.route("/broadcast", methods=["POST"])
@token_required
def broadcast_emergency():
    data = request.get_json(silent=True) or {}
    station_id = data.get("station_id") or "NODE-ALPHA-1"
    message = data.get("message", "EMERGENCY: Immediate evacuation advised for low-lying zones.")
    radius_km = data.get("radius_km", 50.0)

    db = SessionLocal()
    try:
        subscribers = db.query(Subscriber).filter(Subscriber.status == "Active").all()
        targeted_recipients = [s.phone for s in subscribers if s.station_id == station_id or station_id == "ALL"]
        if not targeted_recipients:
            targeted_recipients = [s.phone for s in subscribers]

        # Log an emergency alert
        emergency_alert = AlertLog(
            node_id=station_id,
            title="CIVIL DEFENSE EMERGENCY BROADCAST DISPATCHED",
            message=f"Geofence: {radius_km}km. Message: {message}",
            severity="Emergency",
            is_acknowledged=True,
            acknowledged_by=g.current_user.get("name", "Command Dispatcher")
        )
        db.add(emergency_alert)
        db.commit()

        return jsonify({
            "status": "DISPATCHED",
            "station_id": station_id,
            "geofence_radius_km": radius_km,
            "recipients_contacted": len(targeted_recipients),
            "sample_recipient": targeted_recipients[0] if targeted_recipients else "None",
            "alert_id": emergency_alert.id,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }), 200
    finally:
        db.close()

from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from ..database import SessionLocal
from ..models import SensorNode, HydroLog
from ..security import token_required

nodes_bp = Blueprint("nodes", __name__, url_prefix="/api/v1/nodes")

@nodes_bp.route("/", methods=["GET"])
def list_nodes():
    db = SessionLocal()
    try:
        nodes = db.query(SensorNode).all()
        result = []
        for n in nodes:
            latest_log = db.query(HydroLog).filter(HydroLog.node_id == n.id).order_by(HydroLog.id.desc()).first()
            result.append({
                "id": n.id,
                "name": n.name,
                "basin": n.basin.name if n.basin else "Awash River Basin",
                "latitude": n.latitude,
                "longitude": n.longitude,
                "status": n.status,
                "battery_level": n.battery_level,
                "water_level_cm": latest_log.water_level_cm if latest_log else 0.0,
                "risk_level": latest_log.risk_level if latest_log else "Normal",
                "last_updated": n.last_updated.isoformat() if n.last_updated else None
            })
        return jsonify(result), 200
    finally:
        db.close()

@nodes_bp.route("/register", methods=["POST"])
@token_required
def register_node():
    data = request.get_json(silent=True) or {}
    node_id = data.get("id") or data.get("station_id")
    name = data.get("name")
    lat = data.get("latitude")
    lng = data.get("longitude")

    if not node_id or not name:
        return jsonify({"detail": "Mandatory fields 'id' and 'name' are required"}), 400

    db = SessionLocal()
    try:
        existing = db.query(SensorNode).filter(SensorNode.id == node_id).first()
        if existing:
            return jsonify({"detail": f"Sensor node '{node_id}' already registered"}), 409

        node = SensorNode(
            id=node_id,
            name=name,
            latitude=lat,
            longitude=lng,
            status="Active",
            battery_level=100.0
        )
        db.add(node)
        db.commit()
        return jsonify({"status": "REGISTERED", "node_id": node.id, "name": node.name}), 201
    finally:
        db.close()

@nodes_bp.route("/<string:node_id>/heartbeat", methods=["POST"])
def node_heartbeat(node_id: str):
    db = SessionLocal()
    try:
        node = db.query(SensorNode).filter(SensorNode.id == node_id).first()
        if not node:
            return jsonify({"detail": "Sensor node not found"}), 404
        node.status = "Active"
        node.last_updated = datetime.now(timezone.utc)
        db.commit()
        return jsonify({"status": "ACK", "node_id": node.id, "last_seen": node.last_updated.isoformat()}), 200
    finally:
        db.close()

@nodes_bp.route("/<string:node_id>", methods=["DELETE"])
@token_required
def delete_node(node_id: str):
    db = SessionLocal()
    try:
        node = db.query(SensorNode).filter(SensorNode.id == node_id).first()
        if not node:
            return jsonify({"detail": "Sensor node not found"}), 404
        db.delete(node)
        db.commit()
        return jsonify({"status": "DELETED", "node_id": node_id}), 200
    finally:
        db.close()

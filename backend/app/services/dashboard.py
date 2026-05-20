from sqlalchemy.orm import Session
from .. import models, schemas

def build_dashboard_payload(db: Session) -> schemas.DashboardResponse:
    nodes = db.query(models.SensorNode).all()
    
    node_responses = []
    active_alerts = 0
    
    for node in nodes:
        # Get latest log for this node
        latest_log = db.query(models.HydroLog)\
            .filter(models.HydroLog.node_id == node.id)\
            .order_by(models.HydroLog.timestamp.desc())\
            .first()
        
        water_level = latest_log.water_level_cm if latest_log else 0.0
        rainfall = latest_log.rainfall_rate_mm if latest_log else 0.0
        risk = latest_log.risk_level if latest_log else "Safe"
        
        if risk in ["Warning", "Critical"]:
            active_alerts += 1
            
        node_responses.append(
            schemas.SensorNodeResponse(
                id=node.id,
                name=node.name,
                latitude=node.latitude,
                longitude=node.longitude,
                status=node.status,
                battery_level=node.battery_level,
                water_level_cm=water_level,
                rainfall_rate_mm=rainfall,
                risk_level=risk
            )
        )
        
    system_status = "Operational"
    if any(n.currentRisk == "Critical" for n in node_responses):
        system_status = "Critical"
    elif active_alerts > 0:
        system_status = "Warning"
        
    # Get recent history across all nodes
    history_logs = db.query(models.HydroLog).order_by(models.HydroLog.timestamp.desc()).limit(24).all()
    history = [
        {
            "logId": h.id,
            "nodeId": h.node_id,
            "waterLevelCm": h.water_level_cm,
            "rainfallRateMm": h.rainfall_rate_mm,
            "floodProbability": h.flood_probability,
            "riskLevel": h.risk_level,
            "timestamp": h.timestamp.isoformat()
        }
        for h in reversed(history_logs)
    ]
        
    return schemas.DashboardResponse(
        summary=schemas.DashboardSummary(
            totalNodes=len(nodes),
            activeAlerts=active_alerts,
            systemHealthStatus=system_status
        ),
        nodes=node_responses,
        history=history
    )

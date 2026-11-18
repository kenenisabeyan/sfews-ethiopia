import logging
from sqlalchemy.orm import Session
from sqlalchemy import func
from .. import models, schemas
from ..core.cache import cache

logger = logging.getLogger("sfews.dashboard")

DASHBOARD_CACHE_KEY = "dashboard_full_payload"

def build_dashboard_payload(db: Session, force_refresh: bool = False) -> schemas.DashboardResponse:
    """
    Constructs high-performance aggregate dashboard payload with caching.
    Includes summary metrics, sensor node vitals, and chronological hydrological logs.
    """
    if not force_refresh:
        cached = cache.get(DASHBOARD_CACHE_KEY)
        if cached:
            return cached

    nodes = db.query(models.SensorNode).all()
    
    node_responses = []
    active_alerts = 0
    critical_count = 0
    warning_count = 0
    water_levels_sum = 0.0

    # Fetch latest log per node efficiently
    for node in nodes:
        latest_log = (
            db.query(models.HydroLog)
            .filter(models.HydroLog.node_id == node.id)
            .order_by(models.HydroLog.timestamp.desc())
            .first()
        )
        
        water_level = latest_log.water_level_cm if latest_log else 0.0
        rainfall = latest_log.rainfall_rate_mm if latest_log else 0.0
        risk = latest_log.risk_level if latest_log else "Safe"
        last_updated_str = latest_log.timestamp.isoformat() if latest_log else (node.last_updated.isoformat() if node.last_updated else None)
        
        water_levels_sum += water_level

        if risk == "Critical":
            active_alerts += 1
            critical_count += 1
        elif risk == "Warning":
            active_alerts += 1
            warning_count += 1

        basin_name = node.basin.name if node.basin else "Awash River Basin"
            
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
                risk_level=risk,
                last_updated=last_updated_str,
                basin_name=basin_name
            )
        )
        
    system_status = "Operational"
    if critical_count > 0:
        system_status = "Critical"
    elif warning_count > 0:
        system_status = "Warning"

    avg_water = round(water_levels_sum / len(nodes), 1) if nodes else 0.0
        
    # Get recent history across all nodes (last 24 logs)
    history_logs = (
        db.query(models.HydroLog)
        .order_by(models.HydroLog.timestamp.desc())
        .limit(24)
        .all()
    )

    history = [
        {
            "logId": h.id,
            "nodeId": h.node_id,
            "waterLevelCm": h.water_level_cm,
            "rainfallRateMm": h.rainfall_rate_mm,
            "floodProbability": h.flood_probability,
            "riskLevel": h.risk_level,
            "timestamp": h.timestamp.isoformat() if h.timestamp else ""
        }
        for h in reversed(history_logs)
    ]
        
    payload = schemas.DashboardResponse(
        summary=schemas.DashboardSummary(
            totalNodes=len(nodes),
            activeAlerts=active_alerts,
            systemHealthStatus=system_status,
            criticalNodesCount=critical_count,
            warningNodesCount=warning_count,
            averageWaterLevel=avg_water
        ),
        nodes=node_responses,
        history=history
    )

    # Cache for 10 seconds (invalidated immediately when new telemetry is ingested)
    cache.set(DASHBOARD_CACHE_KEY, payload, ttl=10)
    return payload

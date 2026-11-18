from typing import List, Dict, Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from .. import schemas, models
from ..database import get_db
from ..services.dashboard import build_dashboard_payload
from ..core.cache import cache

router = APIRouter(prefix="/api/v1/dashboard", tags=["Dashboard & Analytics"])

@router.get("/", response_model=schemas.DashboardResponse)
def get_dashboard_data(
    force_refresh: bool = Query(False, description="Bypass cache and force recalculation"),
    db: Session = Depends(get_db)
):
    """
    Returns the comprehensive aggregated state for the frontend dashboard:
    system health status, total sensor nodes, active alerts count, latest node vitals,
    and chronological hydrological history.
    """
    return build_dashboard_payload(db, force_refresh=force_refresh)

@router.get("/summary", response_model=schemas.DashboardSummary)
def get_dashboard_summary(db: Session = Depends(get_db)):
    """
    Lightweight, ultra-fast summary metrics endpoint for headers and mobile widgets.
    """
    payload = build_dashboard_payload(db)
    return payload.summary

@router.get("/trends")
def get_dashboard_trends(db: Session = Depends(get_db)):
    """
    Historical hydrological trends grouped for visualization charts.
    """
    cached_trends = cache.get("dashboard_trends")
    if cached_trends:
        return cached_trends

    logs = (
        db.query(models.HydroLog)
        .order_by(models.HydroLog.timestamp.desc())
        .limit(48)
        .all()
    )

    trends = [
        {
            "timestamp": l.timestamp.isoformat() if l.timestamp else "",
            "nodeId": l.node_id,
            "waterLevelCm": l.water_level_cm,
            "rainfallRateMm": l.rainfall_rate_mm,
            "riskLevel": l.risk_level,
            "floodProbability": l.flood_probability
        }
        for l in reversed(logs)
    ]

    result = {"trends": trends, "sample_count": len(trends)}
    cache.set("dashboard_trends", result, ttl=15)
    return result

@router.get("/basins")
def get_basins_status(db: Session = Depends(get_db)):
    """
    Geographical basin overview with aggregated threat indices.
    """
    basins = db.query(models.RiverBasin).all()
    output = []

    for basin in basins:
        nodes = basin.sensor_nodes
        node_count = len(nodes)
        active_nodes = sum(1 for n in nodes if n.status == "Active")
        
        # Determine basin threat level
        has_critical = False
        has_warning = False
        water_levels = []

        for node in nodes:
            latest_log = (
                db.query(models.HydroLog)
                .filter(models.HydroLog.node_id == node.id)
                .order_by(models.HydroLog.timestamp.desc())
                .first()
            )
            if latest_log:
                water_levels.append(latest_log.water_level_cm)
                if latest_log.risk_level == "Critical":
                    has_critical = True
                elif latest_log.risk_level == "Warning":
                    has_warning = True

        status = "Critical" if has_critical else ("Warning" if has_warning else "Safe")
        avg_water = round(sum(water_levels) / len(water_levels), 1) if water_levels else 0.0

        output.append({
            "id": basin.id,
            "name": basin.name,
            "country": basin.country.name if basin.country else "Ethiopia",
            "total_nodes": node_count,
            "active_nodes": active_nodes,
            "basin_status": status,
            "average_water_level_cm": avg_water
        })

    return output

import logging
from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db
from ..services.ml import predict_flood_probability
from ..services.alert_service import evaluate_and_create_alert
from ..services.dashboard import build_dashboard_payload
from ..services.websocket import manager
from ..core.events import event_bus, EventType
from ..core.cache import cache

logger = logging.getLogger("sfews.simulation")

router = APIRouter(tags=["Simulation & IoT Virtual Lab"])

# In-memory fast state for virtual testbed
_global_water_level: int = 0

@router.post("/flood", response_model=dict)
@router.post("/api/v1/simulation/flood", response_model=dict)
async def update_simulation_flood_level(
    payload: schemas.FloodPayload,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Ingests simulated water level depth from the SimpleSimPanel UI or simple_sensor script.
    Dynamically mirrors this reading into registered sensor nodes, evaluates alerts,
    and broadcasts the updated state over WebSocket in real time.
    """
    global _global_water_level
    _global_water_level = payload.level

    # Mirror into NODE-ALPHA-1 (Headwaters) to dynamically affect maps and gauges
    target_node = db.query(models.SensorNode).filter(models.SensorNode.id == "NODE-ALPHA-1").first()
    if target_node:
        water_level_cm = float(payload.level)
        rainfall_sim = round(max(0.0, (payload.level - 200.0) * 0.15), 1)
        prob = predict_flood_probability(water_level_cm, rainfall_sim)
        
        warn_setting = db.query(models.SystemSetting).filter(models.SystemSetting.key == "warning_threshold").first()
        crit_setting = db.query(models.SystemSetting).filter(models.SystemSetting.key == "critical_threshold").first()
        warning_val = warn_setting.value if warn_setting else 300.0
        critical_val = crit_setting.value if crit_setting else 450.0

        risk = "Critical" if water_level_cm >= critical_val else ("Warning" if water_level_cm >= warning_val else "Safe")

        log = models.HydroLog(
            node_id=target_node.id,
            water_level_cm=water_level_cm,
            rainfall_rate_mm=rainfall_sim,
            flood_probability=prob,
            risk_level=risk
        )
        db.add(log)
        db.commit()

        # Evaluate alerts
        evaluate_and_create_alert(db, target_node.id, water_level_cm, rainfall_sim)

    # Invalidate dashboard cache
    cache.invalidate("dashboard_full_payload")

    # Publish simulation event
    await event_bus.publish(EventType.SIMULATION_UPDATE, {"level": _global_water_level})

    # Broadcast updated dashboard snapshot to WebSocket
    dashboard_payload = build_dashboard_payload(db, force_refresh=True)
    json_data = dashboard_payload.model_dump_json(by_alias=True)
    background_tasks.add_task(manager.broadcast_dashboard_json, json_data)

    return {
        "status": "success",
        "level": _global_water_level,
        "mirrored_to_node": target_node.id if target_node else None
    }

@router.get("/flood", response_model=dict)
@router.get("/api/v1/simulation/flood", response_model=dict)
def get_simulation_flood_level():
    """
    Fetch the currently active simulated water level.
    """
    global _global_water_level
    return {"level": _global_water_level}

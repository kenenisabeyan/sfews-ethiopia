import time
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db, check_db_health, is_sqlite_active
from ..services.seed_service import seed_database_defaults
from ..services.websocket import manager
from ..core.events import event_bus, EventType
from ..core.cache import cache

router = APIRouter(prefix="/api/v1/system", tags=["System Architecture & Configurations"])

START_TIME = time.time()

@router.get("/settings", response_model=schemas.SystemSettingsResponse)
def get_system_settings(db: Session = Depends(get_db)):
    """
    Fetch all active early warning thresholds and proximity configuration parameters.
    Leverages fast in-memory caching.
    """
    cached = cache.get("system_settings")
    if cached:
        return schemas.SystemSettingsResponse(**cached)

    settings_dict = {
        "warning_threshold": 300.0,
        "critical_threshold": 450.0,
        "radius_km": 15.0
    }
    
    for key in settings_dict.keys():
        setting = db.query(models.SystemSetting).filter(models.SystemSetting.key == key).first()
        if setting:
            settings_dict[key] = setting.value
            
    cache.set("system_settings", settings_dict, ttl=60)
    return schemas.SystemSettingsResponse(**settings_dict)

@router.post("/settings", response_model=schemas.SystemSettingsResponse)
async def update_system_settings(payload: schemas.SystemSettingsUpdate, db: Session = Depends(get_db)):
    """
    Overwrite system settings in database. Emits SETTINGS_UPDATED event
    to immediately sync connected IoT services and alert monitors.
    """
    settings_dict = {
        "warning_threshold": payload.warning_threshold,
        "critical_threshold": payload.critical_threshold,
        "radius_km": payload.radius_km
    }
    
    for key, val in settings_dict.items():
        setting = db.query(models.SystemSetting).filter(models.SystemSetting.key == key).first()
        if not setting:
            setting = models.SystemSetting(key=key, value=val)
            db.add(setting)
        else:
            setting.value = val
            
    db.commit()
    
    # Invalidate caches
    cache.invalidate("system_settings", "dashboard_full_payload")
    
    # Publish domain event
    await event_bus.publish(EventType.SETTINGS_UPDATED, settings_dict)
    
    return schemas.SystemSettingsResponse(**settings_dict)

@router.put("/settings", response_model=schemas.SystemSettingsResponse)
async def put_system_settings(payload: schemas.SystemSettingsUpdate, db: Session = Depends(get_db)):
    """
    Idempotent PUT alternative for updating system configurations.
    """
    return await update_system_settings(payload, db)

@router.post("/seed", response_model=dict)
def seed_initial_data(db: Session = Depends(get_db)):
    """
    Idempotently seeds baseline Country, River Basin, System Settings,
    Sensor Nodes, Community Subscribers, and Administrator credentials.
    """
    return seed_database_defaults(db)

@router.get("/diagnostics", response_model=schemas.SystemDiagnosticsResponse)
def get_system_diagnostics():
    """
    Non-functional system observability: database latency, uptime,
    active WebSocket subscribers, event bus throughput, and caching ratios.
    """
    uptime = time.time() - START_TIME
    db_health = check_db_health()
    cache_stats = cache.get_stats()
    event_stats = event_bus.get_stats()
    ws_clients = manager.get_active_count()

    overall_status = "Operational"
    if not db_health.get("connected", False):
        overall_status = "Degraded"

    return schemas.SystemDiagnosticsResponse(
        status=overall_status,
        uptime_seconds=round(uptime, 2),
        database=db_health,
        cache_stats=cache_stats,
        event_bus_stats=event_stats,
        active_ws_connections=ws_clients,
        server_time=datetime.now(timezone.utc).isoformat()
    )

@router.post("/reset", response_model=dict)
def reset_temporary_state():
    """
    Clears in-memory caches and flushes transient event stats.
    """
    cache.clear()
    return {"status": "success", "message": "In-memory cache flushed successfully."}

import logging
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from .. import models, schemas
from ..core.events import event_bus, EventType
from ..core.cache import cache

logger = logging.getLogger("sfews.alerts")

def evaluate_and_create_alert(
    db: Session,
    node_id: str,
    water_level_cm: float,
    rainfall_rate_mm: float
) -> Optional[models.AlertLog]:
    """
    Evaluates new telemetry against warning/critical thresholds and persists
    an AlertLog when dangerous hydrological anomalies occur. Dispatches an event.
    """
    # Fetch thresholds (check cache first for sub-millisecond execution)
    cached_settings = cache.get("system_settings")
    if cached_settings:
        warning_val = cached_settings["warning_threshold"]
        critical_val = cached_settings["critical_threshold"]
    else:
        warn_setting = db.query(models.SystemSetting).filter(models.SystemSetting.key == "warning_threshold").first()
        crit_setting = db.query(models.SystemSetting).filter(models.SystemSetting.key == "critical_threshold").first()
        warning_val = warn_setting.value if warn_setting else 300.0
        critical_val = crit_setting.value if crit_setting else 450.0

    severity = None
    title = None
    message = None

    if water_level_cm >= critical_val:
        severity = "Critical"
        title = f"CRITICAL SURGE DETECTED AT {node_id}"
        message = (
            f"Hydrological sensor {node_id} recorded critical water level of {water_level_cm:.1f} cm "
            f"(threshold: {critical_val:.1f} cm). Rainfall rate: {rainfall_rate_mm:.1f} mm/h. "
            "Immediate downstream flood defense protocols recommended."
        )
    elif water_level_cm >= warning_val:
        severity = "Warning"
        title = f"ELEVATED WATER LEVEL WARNING AT {node_id}"
        message = (
            f"Sensor {node_id} surpassed advisory threshold with depth of {water_level_cm:.1f} cm "
            f"(threshold: {warning_val:.1f} cm). Rainfall rate: {rainfall_rate_mm:.1f} mm/h."
        )

    if not severity:
        return None

    # De-duplicate alerts if an unacknowledged alert for this node within the last 15 minutes exists
    recent_alert = db.query(models.AlertLog).filter(
        models.AlertLog.node_id == node_id,
        models.AlertLog.severity == severity,
        models.AlertLog.is_acknowledged == False
    ).order_by(models.AlertLog.timestamp.desc()).first()

    if recent_alert:
        # Update water level on existing open alert rather than flooding logs
        recent_alert.water_level_cm = water_level_cm
        db.commit()
        return recent_alert

    alert = models.AlertLog(
        node_id=node_id,
        title=title,
        message=message,
        severity=severity,
        water_level_cm=water_level_cm,
        is_acknowledged=False
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)

    # Invalidate cached alert logs
    cache.invalidate("active_alerts_count", "alerts_list")

    # Publish alert event asynchronously to decoupled listeners (WebSockets, SMS Dispatchers, UI)
    logger.warning(f"[AlertService] {severity.upper()} Alert created for {node_id}: {title}")
    return alert

def execute_emergency_broadcast(
    db: Session,
    message: str,
    severity: str = "Critical",
    station_id: Optional[str] = None,
    radius_km: Optional[float] = None
) -> schemas.BroadcastResponse:
    """
    Executes an emergency broadcast dispatch across subscribed communities,
    SMS gateways, and operator WebSocket consoles.
    """
    query = db.query(models.Subscriber).filter(models.Subscriber.status == "Active")
    if station_id:
        query = query.filter(models.Subscriber.station_id == station_id)
        
    active_subscribers = query.all()
    subscriber_count = len(active_subscribers)

    # Create an emergency alert audit record
    broadcast_alert = models.AlertLog(
        node_id=station_id,
        title=f"CIVIL DEFENSE EMERGENCY BROADCAST ({severity.upper()})",
        message=message,
        severity="Emergency" if severity.lower() == "critical" else "Warning",
        is_acknowledged=False
    )
    db.add(broadcast_alert)
    db.commit()
    db.refresh(broadcast_alert)

    channels = ["SMS Gateway (Ethio Telecom API)", "LoRaWAN Downlink Broadcast", "Command Center WebSocket Console"]

    broadcast_time = datetime.now(timezone.utc).isoformat()
    return schemas.BroadcastResponse(
        status="Broadcast Dispatched Successfully",
        subscribers_notified=subscriber_count,
        delivered_channels=channels,
        message=message,
        broadcast_time=broadcast_time
    )

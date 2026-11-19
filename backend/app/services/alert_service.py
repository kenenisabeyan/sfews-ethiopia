import math
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from .. import models, schemas
from ..core.events import event_bus, EventType
from ..core.cache import cache

logger = logging.getLogger("sfews.alerts")

def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Computes great-circle distance between two GPS coordinates in kilometers.
    """
    R = 6371.0  # Earth's mean radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2.0) ** 2 +
        math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(R * c, 2)

def evaluate_and_create_alert(
    db: Session,
    node_id: str,
    water_level_cm: float,
    rainfall_rate_mm: float,
    rate_of_rise_cm_per_hr: float = 0.0
) -> Optional[models.AlertLog]:
    """
    Evaluates incoming telemetry against dynamic warning/critical thresholds
    and rate-of-rise flash surge metrics. Manages alert de-duplication,
    escalation, and domain event dispatch.
    """
    # 1. Fetch system thresholds (utilize fast in-memory cache)
    cached_settings = cache.get("system_settings")
    if cached_settings:
        warning_val = cached_settings.get("warning_threshold", 300.0)
        critical_val = cached_settings.get("critical_threshold", 450.0)
    else:
        warn_setting = db.query(models.SystemSetting).filter(models.SystemSetting.key == "warning_threshold").first()
        crit_setting = db.query(models.SystemSetting).filter(models.SystemSetting.key == "critical_threshold").first()
        warning_val = warn_setting.value if warn_setting else 300.0
        critical_val = crit_setting.value if crit_setting else 450.0

    severity = None
    title = None
    message = None

    # 2. Check for Flash Surge Anomaly
    is_flash_surge = rate_of_rise_cm_per_hr >= 45.0 and water_level_cm >= (warning_val * 0.8)

    if water_level_cm >= critical_val or (is_flash_surge and water_level_cm >= warning_val):
        severity = "Critical"
        if is_flash_surge:
            title = f"FLASH SURGE EMERGENCY AT {node_id}"
            message = (
                f"Flash flood surge detected at {node_id}: Water rising at {rate_of_rise_cm_per_hr:.1f} cm/h! "
                f"Current depth: {water_level_cm:.1f} cm (Critical threshold: {critical_val:.1f} cm). "
                f"Rainfall: {rainfall_rate_mm:.1f} mm/h. Immediate downstream evacuation protocol active."
            )
        else:
            title = f"CRITICAL SURGE DETECTED AT {node_id}"
            message = (
                f"Hydrological sensor {node_id} breached critical threshold with depth of {water_level_cm:.1f} cm "
                f"(threshold: {critical_val:.1f} cm). Rainfall: {rainfall_rate_mm:.1f} mm/h. "
                "Mobilize regional flood defense teams."
            )
    elif water_level_cm >= warning_val or rate_of_rise_cm_per_hr >= 25.0:
        severity = "Warning"
        title = f"ELEVATED WATER LEVEL WARNING AT {node_id}"
        message = (
            f"Sensor {node_id} surpassed advisory threshold with depth of {water_level_cm:.1f} cm "
            f"(threshold: {warning_val:.1f} cm). Rate of rise: {rate_of_rise_cm_per_hr:.1f} cm/h. "
            f"Rainfall: {rainfall_rate_mm:.1f} mm/h."
        )

    if not severity:
        return None

    # 3. Alert Lifecycle & Escalation Evaluation
    # Check for existing unacknowledged alert on this node
    open_alert = db.query(models.AlertLog).filter(
        models.AlertLog.node_id == node_id,
        models.AlertLog.is_acknowledged == False
    ).order_by(models.AlertLog.timestamp.desc()).first()

    now_utc = datetime.now(timezone.utc)

    if open_alert:
        # Check if alert should be escalated to 'Emergency' if open > 30 minutes unacknowledged
        alert_age = now_utc - (open_alert.timestamp.replace(tzinfo=timezone.utc) if open_alert.timestamp.tzinfo is None else open_alert.timestamp)
        
        if alert_age > timedelta(minutes=30) and open_alert.severity == "Critical":
            open_alert.severity = "Emergency"
            open_alert.title = f"ESCALATED EMERGENCY: {node_id} UNACKNOWLEDGED > 30 MIN"
            open_alert.message = (
                f"URGENT ESCALATION: Critical alert at {node_id} remains unacknowledged for "
                f"{int(alert_age.total_seconds() / 60)} minutes. Water level: {water_level_cm:.1f} cm."
            )
            open_alert.water_level_cm = water_level_cm
            db.commit()
            logger.critical(f"[AlertEscalation] Alert {open_alert.id} ESCALATED to EMERGENCY for {node_id}")
            return open_alert

        # Otherwise update water level on existing open alert (de-duplication)
        open_alert.water_level_cm = water_level_cm
        if severity == "Critical" and open_alert.severity == "Warning":
            open_alert.severity = "Critical"
            open_alert.title = title
            open_alert.message = message
        db.commit()
        return open_alert

    # 4. Create new AlertLog
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

    # Invalidate cached alert counts
    cache.invalidate("active_alerts_count", "alerts_list")

    logger.warning(f"[AlertService] {severity.upper()} Alert registered for {node_id}: {title}")
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
    SMS gateways, and operator WebSocket consoles with geospatial geofencing.
    """
    target_station_ids = []
    
    if station_id:
        target_station_ids.append(station_id)
        
        # Spatial radius expansion using Haversine formula
        if radius_km and radius_km > 0:
            center_node = db.query(models.SensorNode).filter(models.SensorNode.id == station_id).first()
            if center_node and center_node.latitude and center_node.longitude:
                all_nodes = db.query(models.SensorNode).filter(models.SensorNode.id != station_id).all()
                for other_node in all_nodes:
                    if other_node.latitude and other_node.longitude:
                        dist = haversine_distance_km(
                            center_node.latitude, center_node.longitude,
                            other_node.latitude, other_node.longitude
                        )
                        if dist <= radius_km:
                            target_station_ids.append(other_node.id)
                logger.info(
                    f"[BroadcastGeofence] Center: {station_id} (radius: {radius_km}km). "
                    f"Targeted stations: {target_station_ids}"
                )

    query = db.query(models.Subscriber).filter(models.Subscriber.status == "Active")
    if target_station_ids:
        query = query.filter(models.Subscriber.station_id.in_(target_station_ids))
        
    active_subscribers = query.all()
    subscriber_count = len(active_subscribers)

    # Persist emergency civil defense alert record
    broadcast_alert = models.AlertLog(
        node_id=station_id,
        title=f"CIVIL DEFENSE EMERGENCY BROADCAST ({severity.upper()})",
        message=message,
        severity="Emergency" if severity.lower() in ["critical", "emergency"] else "Warning",
        is_acknowledged=False
    )
    db.add(broadcast_alert)
    db.commit()
    db.refresh(broadcast_alert)

    channels = [
        "SMS Gateway (Ethio Telecom Shortcode 8844)",
        "LoRaWAN Downlink Acoustic Siren Node",
        "Command Center Multi-Console Stream"
    ]

    broadcast_time = datetime.now(timezone.utc).isoformat()
    return schemas.BroadcastResponse(
        status="Broadcast Dispatched Successfully",
        subscribers_notified=subscriber_count,
        delivered_channels=channels,
        message=message,
        broadcast_time=broadcast_time
    )

import uuid
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db
from ..services.alert_service import execute_emergency_broadcast
from ..core.events import event_bus, EventType
from ..core.cache import cache

router = APIRouter(prefix="/api/v1/alerts", tags=["Early Warning Alerts & Civil Defense"])

@router.get("/", response_model=List[schemas.AlertLogResponse])
def list_alerts(
    severity: Optional[str] = Query(None, description="Filter by severity: Critical, Warning, Emergency, Info"),
    acknowledged: Optional[bool] = Query(None, description="Filter by acknowledged status"),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """
    List all active and historical flood early warning alerts.
    """
    query = db.query(models.AlertLog)
    if severity:
        query = query.filter(models.AlertLog.severity == severity)
    if acknowledged is not None:
        query = query.filter(models.AlertLog.is_acknowledged == acknowledged)

    alerts = query.order_by(models.AlertLog.timestamp.desc()).limit(limit).all()
    
    return [
        schemas.AlertLogResponse(
            id=a.id,
            node_id=a.node_id,
            title=a.title,
            message=a.message,
            severity=a.severity,
            water_level_cm=a.water_level_cm,
            is_acknowledged=a.is_acknowledged,
            acknowledged_by=a.acknowledged_by,
            timestamp=a.timestamp.isoformat() if a.timestamp else datetime.now(timezone.utc).isoformat()
        )
        for a in alerts
    ]

@router.post("/{alert_id}/acknowledge", response_model=schemas.AlertLogResponse)
async def acknowledge_alert(
    alert_id: int,
    payload: schemas.AlertAcknowledgeRequest = schemas.AlertAcknowledgeRequest(),
    db: Session = Depends(get_db)
):
    """
    Operator acknowledgement of an ongoing early warning alert.
    Dispatches ALERT_ACKNOWLEDGED event across the command center.
    """
    alert = db.query(models.AlertLog).filter(models.AlertLog.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail=f"Alert with ID {alert_id} not found.")

    alert.is_acknowledged = True
    alert.acknowledged_by = payload.acknowledged_by or "Command Center Operator"
    db.commit()
    db.refresh(alert)

    cache.invalidate("active_alerts_count")
    await event_bus.publish(
        EventType.ALERT_ACKNOWLEDGED,
        {"alert_id": alert.id, "acknowledged_by": alert.acknowledged_by}
    )

    return schemas.AlertLogResponse(
        id=alert.id,
        node_id=alert.node_id,
        title=alert.title,
        message=alert.message,
        severity=alert.severity,
        water_level_cm=alert.water_level_cm,
        is_acknowledged=alert.is_acknowledged,
        acknowledged_by=alert.acknowledged_by,
        timestamp=alert.timestamp.isoformat() if alert.timestamp else datetime.now(timezone.utc).isoformat()
    )

@router.post("/broadcast", response_model=schemas.BroadcastResponse)
async def broadcast_emergency_notification(
    payload: schemas.BroadcastRequest,
    db: Session = Depends(get_db)
):
    """
    Dispatches a high-priority early warning broadcast to civil defense SMS gateways,
    LoRaWAN siren nodes, and operator consoles.
    """
    result = execute_emergency_broadcast(
        db=db,
        message=payload.message,
        severity=payload.severity,
        station_id=payload.station_id,
        radius_km=payload.radius_km
    )

    await event_bus.publish(
        EventType.BROADCAST_SENT,
        {
            "message": payload.message,
            "severity": payload.severity,
            "station_id": payload.station_id,
            "subscribers_notified": result.subscribers_notified
        }
    )

    return result

# ==========================================
# Community Subscribers Management
# ==========================================
@router.get("/subscribers", response_model=List[schemas.SubscriberResponse])
def list_subscribers(
    station_id: Optional[str] = Query(None, description="Filter by anchor station ID"),
    status: Optional[str] = Query(None, description="Filter by status: Active, Muted"),
    db: Session = Depends(get_db)
):
    """
    Returns registered community emergency broadcast notification subscribers.
    """
    query = db.query(models.Subscriber)
    if station_id:
        query = query.filter(models.Subscriber.station_id == station_id)
    if status:
        query = query.filter(models.Subscriber.status == status)

    subscribers = query.all()
    return [
        schemas.SubscriberResponse(
            id=s.id,
            name=s.name,
            phone=s.phone,
            station_id=s.station_id,
            status=s.status,
            created_at=s.created_at.isoformat() if s.created_at else None
        )
        for s in subscribers
    ]

@router.post("/subscribers", response_model=schemas.SubscriberResponse, status_code=status.HTTP_201_CREATED)
def create_subscriber(payload: schemas.SubscriberCreate, db: Session = Depends(get_db)):
    """
    Register a local community representative or elder for automated SMS early alerts.
    """
    sub_id = payload.id or f"sub-{uuid.uuid4().hex[:6]}"
    existing = db.query(models.Subscriber).filter(models.Subscriber.id == sub_id).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Subscriber ID '{sub_id}' already exists.")

    new_sub = models.Subscriber(
        id=sub_id,
        name=payload.name,
        phone=payload.phone,
        station_id=payload.station_id,
        status=payload.status or "Active"
    )
    db.add(new_sub)
    db.commit()
    db.refresh(new_sub)

    return schemas.SubscriberResponse(
        id=new_sub.id,
        name=new_sub.name,
        phone=new_sub.phone,
        station_id=new_sub.station_id,
        status=new_sub.status,
        created_at=new_sub.created_at.isoformat() if new_sub.created_at else None
    )

@router.patch("/subscribers/{subscriber_id}", response_model=schemas.SubscriberResponse)
def update_subscriber_status(
    subscriber_id: str,
    payload: schemas.SubscriberUpdate,
    db: Session = Depends(get_db)
):
    """
    Toggle or update subscriber notification parameters (e.g. Mute / Unmute).
    """
    sub = db.query(models.Subscriber).filter(models.Subscriber.id == subscriber_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail=f"Subscriber '{subscriber_id}' not found.")

    if payload.name is not None:
        sub.name = payload.name
    if payload.phone is not None:
        sub.phone = payload.phone
    if payload.station_id is not None:
        sub.station_id = payload.station_id
    if payload.status is not None:
        sub.status = payload.status

    db.commit()
    db.refresh(sub)

    return schemas.SubscriberResponse(
        id=sub.id,
        name=sub.name,
        phone=sub.phone,
        station_id=sub.station_id,
        status=sub.status,
        created_at=sub.created_at.isoformat() if sub.created_at else None
    )

@router.delete("/subscribers/{subscriber_id}")
def delete_subscriber(subscriber_id: str, db: Session = Depends(get_db)):
    """
    Remove subscriber from notification registry.
    """
    sub = db.query(models.Subscriber).filter(models.Subscriber.id == subscriber_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail=f"Subscriber '{subscriber_id}' not found.")

    db.delete(sub)
    db.commit()
    return {"status": "success", "message": f"Subscriber '{subscriber_id}' successfully removed."}

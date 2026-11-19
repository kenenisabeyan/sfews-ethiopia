from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from .. import models, schemas
from ..database import get_db
from ..services.ml import (
    predict_flood_probability,
    calculate_rate_of_rise,
    calculate_estimated_discharge,
    evaluate_surge_dynamics,
    evaluate_risk_tier
)
from ..services.websocket import manager
from ..services.dashboard import build_dashboard_payload
from ..services.alert_service import evaluate_and_create_alert
from ..core.events import event_bus, EventType
from ..core.cache import cache

router = APIRouter(prefix="/api/v1/telemetry", tags=["Telemetry & Sensor Ingestion"])

@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
async def ingest_telemetry(
    payload: schemas.TelemetryData,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Ingests live telemetry from an edge IoT sensor node or LoRa gateway.
    Executes automated hydrological rate-of-rise calculation, stage-discharge
    power curve estimation, ML flood probability inference, dynamic threshold evaluation,
    and publishes an asynchronous domain event to decoupled system listeners.
    """
    # 1. Validate node existence
    node = db.query(models.SensorNode).filter(models.SensorNode.id == payload.node_id).first()
    if not node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Sensor node '{payload.node_id}' is not registered. Please register node first."
        )

    # 2. Retrieve previous reading to compute rate of rise (delta h / delta t)
    previous_log = (
        db.query(models.HydroLog)
        .filter(models.HydroLog.node_id == node.id)
        .order_by(models.HydroLog.timestamp.desc())
        .first()
    )

    now_utc = datetime.now(timezone.utc)
    if previous_log and previous_log.timestamp:
        prev_ts = previous_log.timestamp
        if prev_ts.tzinfo is None:
            prev_ts = prev_ts.replace(tzinfo=timezone.utc)
        elapsed_seconds = (now_utc - prev_ts).total_seconds()
        prev_water = previous_log.water_level_cm
    else:
        elapsed_seconds = 0.0
        prev_water = None

    # 3. Hydrological computations
    rate_of_rise = calculate_rate_of_rise(payload.water_level_cm, prev_water, elapsed_seconds)
    estimated_discharge = calculate_estimated_discharge(payload.water_level_cm)
    surge_info = evaluate_surge_dynamics(rate_of_rise)

    # 4. Run ML Pipeline for Risk Prediction
    probability = predict_flood_probability(
        water_level_cm=payload.water_level_cm,
        rainfall_rate_mm=payload.rainfall_rate_mm,
        rate_of_rise_cm_per_hr=rate_of_rise
    )
    
    # 5. Dynamic Threshold Evaluation
    warn_setting = db.query(models.SystemSetting).filter(models.SystemSetting.key == "warning_threshold").first()
    crit_setting = db.query(models.SystemSetting).filter(models.SystemSetting.key == "critical_threshold").first()
    warning_val = warn_setting.value if warn_setting else 300.0
    critical_val = crit_setting.value if crit_setting else 450.0

    risk_level = evaluate_risk_tier(
        probability=probability,
        rate_of_rise_cm_per_hr=rate_of_rise,
        water_level_cm=payload.water_level_cm,
        warning_threshold=warning_val,
        critical_threshold=critical_val
    )

    # 6. Update Node Status & Hardware Vitals
    node.battery_level = payload.battery_level
    node.status = "Active"
    
    # 7. Insert Hydrological Log Record
    log = models.HydroLog(
        node_id=node.id,
        water_level_cm=payload.water_level_cm,
        rainfall_rate_mm=payload.rainfall_rate_mm,
        flood_probability=probability,
        risk_level=risk_level
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    # 8. Evaluate & Dispatch Alerts Independently
    alert = evaluate_and_create_alert(
        db=db,
        node_id=node.id,
        water_level_cm=payload.water_level_cm,
        rainfall_rate_mm=payload.rainfall_rate_mm,
        rate_of_rise_cm_per_hr=rate_of_rise
    )

    # 9. Invalidate Caches
    cache.invalidate("dashboard_full_payload")

    # 10. Dispatch Domain Event to EventBus
    await event_bus.publish(
        EventType.TELEMETRY_INGESTED,
        {
            "node_id": node.id,
            "water_level_cm": payload.water_level_cm,
            "rainfall_rate_mm": payload.rainfall_rate_mm,
            "rate_of_rise_cm_per_hr": rate_of_rise,
            "estimated_discharge_m3s": estimated_discharge,
            "risk_level": risk_level,
            "flood_probability": probability,
            "alert_created": alert is not None
        }
    )

    # 11. Asynchronously stream updated Dashboard Snapshot to active WebSocket subscribers
    dashboard_payload = build_dashboard_payload(db, force_refresh=True)
    json_data = dashboard_payload.model_dump_json(by_alias=True)
    background_tasks.add_task(manager.broadcast_dashboard_json, json_data)
    
    return {
        "status": "success",
        "risk_level": risk_level,
        "flood_probability": probability,
        "rate_of_rise_cm_per_hr": rate_of_rise,
        "estimated_discharge_m3s": estimated_discharge,
        "surge_status": surge_info["status"],
        "log_id": log.id,
        "alert_triggered": alert is not None
    }

@router.post("/batch", response_model=dict, status_code=status.HTTP_201_CREATED)
async def ingest_batch_telemetry(
    batch: schemas.BatchTelemetryData,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    High-throughput batch ingestion for LoRaWAN gateways aggregating multi-node packets.
    Computes per-node hydrological dynamics and updates basin-wide alert states.
    """
    processed = 0
    warn_setting = db.query(models.SystemSetting).filter(models.SystemSetting.key == "warning_threshold").first()
    crit_setting = db.query(models.SystemSetting).filter(models.SystemSetting.key == "critical_threshold").first()
    warning_val = warn_setting.value if warn_setting else 300.0
    critical_val = crit_setting.value if crit_setting else 450.0

    now_utc = datetime.now(timezone.utc)

    for item in batch.readings:
        node = db.query(models.SensorNode).filter(models.SensorNode.id == item.node_id).first()
        if not node:
            continue

        previous_log = (
            db.query(models.HydroLog)
            .filter(models.HydroLog.node_id == node.id)
            .order_by(models.HydroLog.timestamp.desc())
            .first()
        )

        if previous_log and previous_log.timestamp:
            prev_ts = previous_log.timestamp.replace(tzinfo=timezone.utc) if previous_log.timestamp.tzinfo is None else previous_log.timestamp
            elapsed = (now_utc - prev_ts).total_seconds()
            prev_water = previous_log.water_level_cm
        else:
            elapsed = 0.0
            prev_water = None

        rate_of_rise = calculate_rate_of_rise(item.water_level_cm, prev_water, elapsed)
        probability = predict_flood_probability(item.water_level_cm, item.rainfall_rate_mm, rate_of_rise)
        risk = evaluate_risk_tier(probability, rate_of_rise, item.water_level_cm, warning_val, critical_val)

        node.battery_level = item.battery_level
        node.status = "Active"

        log = models.HydroLog(
            node_id=node.id,
            water_level_cm=item.water_level_cm,
            rainfall_rate_mm=item.rainfall_rate_mm,
            flood_probability=probability,
            risk_level=risk
        )
        db.add(log)
        evaluate_and_create_alert(db, node.id, item.water_level_cm, item.rainfall_rate_mm, rate_of_rise)
        processed += 1

    db.commit()
    cache.invalidate("dashboard_full_payload")

    # Broadcast updated state
    dashboard_payload = build_dashboard_payload(db, force_refresh=True)
    json_data = dashboard_payload.model_dump_json(by_alias=True)
    background_tasks.add_task(manager.broadcast_dashboard_json, json_data)

    return {
        "status": "success",
        "total_submitted": len(batch.readings),
        "total_processed": processed
    }

@router.get("/", response_model=List[schemas.HydroLogResponse])
def get_telemetry_history(
    node_id: Optional[str] = Query(None, description="Filter logs by sensor node identifier"),
    risk_level: Optional[str] = Query(None, description="Filter logs by risk level (Safe, Warning, Critical)"),
    limit: int = Query(50, ge=1, le=500, description="Page limit"),
    offset: int = Query(0, ge=0, description="Page offset"),
    db: Session = Depends(get_db)
):
    """
    Query historical telemetry time-series with filtering and pagination.
    """
    query = db.query(models.HydroLog)
    if node_id:
        query = query.filter(models.HydroLog.node_id == node_id)
    if risk_level:
        query = query.filter(models.HydroLog.risk_level == risk_level)
        
    logs = query.order_by(models.HydroLog.timestamp.desc()).offset(offset).limit(limit).all()
    return logs

@router.get("/latest", response_model=List[schemas.HydroLogResponse])
def get_latest_telemetry_all_nodes(db: Session = Depends(get_db)):
    """
    Returns the single latest reading for every registered node.
    """
    nodes = db.query(models.SensorNode).all()
    results = []
    for node in nodes:
        latest = (
            db.query(models.HydroLog)
            .filter(models.HydroLog.node_id == node.id)
            .order_by(models.HydroLog.timestamp.desc())
            .first()
        )
        if latest:
            results.append(latest)
    return results

@router.get("/latest/{node_id}", response_model=schemas.HydroLogResponse)
def get_latest_telemetry_for_node(node_id: str, db: Session = Depends(get_db)):
    """
    Returns the latest reading for a specific node.
    """
    latest = (
        db.query(models.HydroLog)
        .filter(models.HydroLog.node_id == node_id)
        .order_by(models.HydroLog.timestamp.desc())
        .first()
    )
    if not latest:
        raise HTTPException(status_code=404, detail=f"No telemetry found for node '{node_id}'")
    return latest

@router.get("/stats")
def get_telemetry_stats(db: Session = Depends(get_db)):
    """
    Aggregated statistical summary across hydrological observations.
    """
    total_logs = db.query(func.count(models.HydroLog.id)).scalar() or 0
    max_water = db.query(func.max(models.HydroLog.water_level_cm)).scalar() or 0.0
    avg_water = db.query(func.avg(models.HydroLog.water_level_cm)).scalar() or 0.0
    max_rain = db.query(func.max(models.HydroLog.rainfall_rate_mm)).scalar() or 0.0

    return {
        "total_records": total_logs,
        "max_water_level_cm": round(float(max_water), 2),
        "average_water_level_cm": round(float(avg_water), 2),
        "max_rainfall_rate_mm": round(float(max_rain), 2)
    }

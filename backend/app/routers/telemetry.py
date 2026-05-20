from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db
from ..services.ml import predict_flood_probability, evaluate_risk_tier

router = APIRouter(prefix="/api/v1/telemetry", tags=["Telemetry"])

@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
def ingest_telemetry(payload: schemas.TelemetryData, db: Session = Depends(get_db)):
    """
    Ingest telemetry data from a registered edge sensor node.
    Performs ML inference and logs the result.
    """
    # 1. Validate node existence
    node = db.query(models.SensorNode).filter(models.SensorNode.id == payload.node_id).first()
    if not node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Sensor node '{payload.node_id}' is not registered. Cannot accept telemetry."
        )
    
    # 2. Run ML Pipeline for Risk Prediction
    probability = predict_flood_probability(payload.water_level_cm, payload.rainfall_rate_mm)
    risk_level = evaluate_risk_tier(probability)
    
    # 3. Update Node Status & Vitals
    node.battery_level = payload.battery_level
    node.status = "Active"
    
    # 4. Insert Hydrological Log
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
    
    return {
        "status": "success", 
        "risk_level": risk_level, 
        "flood_probability": probability,
        "log_id": log.id
    }

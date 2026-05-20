from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/api/v1/telemetry", tags=["Telemetry"])

def predict_flood_probability(water_level_cm: float, rainfall_rate_mm: float) -> float:
    # Weighted ensemble mock for ML Pipeline
    normalized_water = min(water_level_cm / 500.0, 1.0)
    normalized_rain = min(rainfall_rate_mm / 100.0, 1.0)
    probability = (normalized_water * 0.6) + (normalized_rain * 0.4)
    if probability > 0.6:
        probability += 0.15 
    return min(max(probability, 0.0), 1.0)

def evaluate_risk_tier(probability: float) -> str:
    if probability >= 0.75:
        return "Critical"
    elif probability >= 0.45:
        return "Warning"
    else:
        return "Safe"

@router.post("/", response_model=dict)
def ingest_telemetry(payload: schemas.TelemetryData, db: Session = Depends(get_db)):
    probability = predict_flood_probability(payload.water_level_cm, payload.rainfall_rate_mm)
    risk_level = evaluate_risk_tier(probability)
    
    # Check if node exists, if not auto-register it to default basin (Awash for demo)
    node = db.query(models.SensorNode).filter(models.SensorNode.id == payload.node_id).first()
    if not node:
        country = db.query(models.Country).filter(models.Country.code == "ETH").first()
        if not country:
            country = models.Country(name="Ethiopia", code="ETH")
            db.add(country)
            db.commit()
            db.refresh(country)
            
        basin = db.query(models.RiverBasin).filter(models.RiverBasin.name == "Awash River Basin").first()
        if not basin:
            basin = models.RiverBasin(name="Awash River Basin", country_id=country.id)
            db.add(basin)
            db.commit()
            db.refresh(basin)
            
        node = models.SensorNode(
            id=payload.node_id,
            name=f"Station {payload.node_id}",
            basin_id=basin.id,
            battery_level=payload.battery_level,
            status="Active"
        )
        db.add(node)
    else:
        node.battery_level = payload.battery_level
        node.status = "Active"
    
    db.commit()
    db.refresh(node)
    
    # Insert hydrology log
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
    
    return {"status": "success", "risk_level": risk_level, "log_id": log.id}

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/api/v1/nodes", tags=["Nodes"])

@router.post("/register", response_model=schemas.SensorNodeResponse, status_code=status.HTTP_201_CREATED)
def register_node(payload: schemas.NodeRegistration, db: Session = Depends(get_db)):
    """
    Register a new edge sensor node. Automatically creates the geographical Country 
    and River Basin if they do not already exist.
    """
    # 1. Check if node ID is already taken
    existing_node = db.query(models.SensorNode).filter(models.SensorNode.id == payload.id).first()
    if existing_node:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Sensor node with ID '{payload.id}' is already registered."
        )

    # 2. Upsert Country
    country = db.query(models.Country).filter(models.Country.name == payload.country_name).first()
    if not country:
        country = models.Country(name=payload.country_name, code=payload.country_name[:3].upper())
        db.add(country)
        db.commit()
        db.refresh(country)
        
    # 3. Upsert Basin
    basin = db.query(models.RiverBasin).filter(
        models.RiverBasin.name == payload.basin_name,
        models.RiverBasin.country_id == country.id
    ).first()
    
    if not basin:
        basin = models.RiverBasin(name=payload.basin_name, country_id=country.id)
        db.add(basin)
        db.commit()
        db.refresh(basin)
        
    # 4. Create Node
    node = models.SensorNode(
        id=payload.id,
        name=payload.name,
        basin_id=basin.id,
        latitude=payload.latitude,
        longitude=payload.longitude,
        battery_level=payload.battery_level,
        status="Active"
    )
    db.add(node)
    db.commit()
    db.refresh(node)
    
    # 5. Return formatted response mapping to SensorNodeResponse schema
    return schemas.SensorNodeResponse(
        id=node.id,
        name=node.name,
        latitude=node.latitude,
        longitude=node.longitude,
        status=node.status,
        battery_level=node.battery_level,
        water_level_cm=0.0,
        rainfall_rate_mm=0.0,
        risk_level="Safe"
    )

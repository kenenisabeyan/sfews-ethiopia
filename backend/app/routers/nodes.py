from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/api/v1/nodes", tags=["Nodes"])

@router.post("/register", response_model=schemas.SensorNodeResponse, status_code=status.HTTP_201_CREATED)
def register_node(payload: schemas.NodeRegistration, db: Session = Depends(get_db)):
    """
    Register a new edge sensor node to a specific river basin.
    """
    # 1. Verify Basin exists
    basin = db.query(models.RiverBasin).filter(models.RiverBasin.id == payload.basin_id).first()
    if not basin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"River basin with ID {payload.basin_id} not found."
        )
        
    # 2. Check if node ID is already taken
    existing_node = db.query(models.SensorNode).filter(models.SensorNode.id == payload.id).first()
    if existing_node:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Sensor node with ID '{payload.id}' is already registered."
        )
        
    # 3. Create Node
    node = models.SensorNode(
        id=payload.id,
        name=payload.name,
        basin_id=payload.basin_id,
        latitude=payload.latitude,
        longitude=payload.longitude,
        battery_level=payload.battery_level,
        status="Active"
    )
    db.add(node)
    db.commit()
    db.refresh(node)
    
    # 4. Return formatted response mapping to SensorNodeResponse schema
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

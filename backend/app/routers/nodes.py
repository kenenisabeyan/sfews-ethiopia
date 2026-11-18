from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db
from ..core.events import event_bus, EventType
from ..core.cache import cache

router = APIRouter(prefix="/api/v1/nodes", tags=["Sensor Nodes & Fleet Management"])

@router.post("/register", response_model=schemas.SensorNodeResponse, status_code=status.HTTP_201_CREATED)
async def register_node(payload: schemas.NodeRegistration, db: Session = Depends(get_db)):
    """
    Registers a new edge sensor node. Automatically upserts geographical Country 
    and River Basin if not previously provisioned. Dispatches NODE_REGISTERED event.
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
    
    cache.invalidate("dashboard_full_payload")
    await event_bus.publish(EventType.NODE_REGISTERED, {"node_id": node.id, "name": node.name})

    return schemas.SensorNodeResponse(
        id=node.id,
        name=node.name,
        latitude=node.latitude,
        longitude=node.longitude,
        status=node.status,
        battery_level=node.battery_level,
        water_level_cm=0.0,
        rainfall_rate_mm=0.0,
        risk_level="Safe",
        last_updated=node.last_updated.isoformat() if node.last_updated else None,
        basin_name=basin.name
    )

@router.get("/", response_model=List[schemas.SensorNodeResponse])
def list_all_nodes(db: Session = Depends(get_db)):
    """
    Returns all registered sensor nodes with their latest vitals and hydrological risk assessments.
    """
    nodes = db.query(models.SensorNode).all()
    results = []

    for node in nodes:
        latest_log = (
            db.query(models.HydroLog)
            .filter(models.HydroLog.node_id == node.id)
            .order_by(models.HydroLog.timestamp.desc())
            .first()
        )
        water_level = latest_log.water_level_cm if latest_log else 0.0
        rainfall = latest_log.rainfall_rate_mm if latest_log else 0.0
        risk = latest_log.risk_level if latest_log else "Safe"
        basin_name = node.basin.name if node.basin else "Awash River Basin"

        results.append(
            schemas.SensorNodeResponse(
                id=node.id,
                name=node.name,
                latitude=node.latitude,
                longitude=node.longitude,
                status=node.status,
                battery_level=node.battery_level,
                water_level_cm=water_level,
                rainfall_rate_mm=rainfall,
                risk_level=risk,
                last_updated=latest_log.timestamp.isoformat() if latest_log else None,
                basin_name=basin_name
            )
        )
    return results

@router.get("/{node_id}", response_model=schemas.SensorNodeResponse)
def get_node_by_id(node_id: str, db: Session = Depends(get_db)):
    """
    Fetch comprehensive details for an individual sensor node.
    """
    node = db.query(models.SensorNode).filter(models.SensorNode.id == node_id).first()
    if not node:
        raise HTTPException(status_code=404, detail=f"Node '{node_id}' not found.")

    latest_log = (
        db.query(models.HydroLog)
        .filter(models.HydroLog.node_id == node.id)
        .order_by(models.HydroLog.timestamp.desc())
        .first()
    )
    water_level = latest_log.water_level_cm if latest_log else 0.0
    rainfall = latest_log.rainfall_rate_mm if latest_log else 0.0
    risk = latest_log.risk_level if latest_log else "Safe"

    return schemas.SensorNodeResponse(
        id=node.id,
        name=node.name,
        latitude=node.latitude,
        longitude=node.longitude,
        status=node.status,
        battery_level=node.battery_level,
        water_level_cm=water_level,
        rainfall_rate_mm=rainfall,
        risk_level=risk,
        last_updated=latest_log.timestamp.isoformat() if latest_log else None,
        basin_name=node.basin.name if node.basin else "Awash River Basin"
    )

@router.put("/{node_id}", response_model=schemas.SensorNodeResponse)
async def update_node(node_id: str, payload: schemas.NodeUpdate, db: Session = Depends(get_db)):
    """
    Update configuration or geolocation metadata for an existing sensor node.
    """
    node = db.query(models.SensorNode).filter(models.SensorNode.id == node_id).first()
    if not node:
        raise HTTPException(status_code=404, detail=f"Node '{node_id}' not found.")

    if payload.name is not None:
        node.name = payload.name
    if payload.latitude is not None:
        node.latitude = payload.latitude
    if payload.longitude is not None:
        node.longitude = payload.longitude
    if payload.status is not None:
        node.status = payload.status
    if payload.battery_level is not None:
        node.battery_level = payload.battery_level

    db.commit()
    db.refresh(node)
    cache.invalidate("dashboard_full_payload")
    await event_bus.publish(EventType.NODE_UPDATED, {"node_id": node.id, "status": node.status})

    return get_node_by_id(node_id, db)

@router.delete("/{node_id}")
async def delete_node(node_id: str, db: Session = Depends(get_db)):
    """
    Decommission and remove a sensor node from the early warning registry.
    """
    node = db.query(models.SensorNode).filter(models.SensorNode.id == node_id).first()
    if not node:
        raise HTTPException(status_code=404, detail=f"Node '{node_id}' not found.")

    db.delete(node)
    db.commit()
    cache.invalidate("dashboard_full_payload")
    await event_bus.publish(EventType.NODE_DELETED, {"node_id": node_id})

    return {"status": "success", "message": f"Sensor node '{node_id}' deleted successfully."}

@router.get("/{node_id}/telemetry", response_model=List[schemas.HydroLogResponse])
def get_node_telemetry_history(
    node_id: str,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """
    Retrieve dedicated historical time-series logs for a specific node.
    """
    node = db.query(models.SensorNode).filter(models.SensorNode.id == node_id).first()
    if not node:
        raise HTTPException(status_code=404, detail=f"Node '{node_id}' not found.")

    logs = (
        db.query(models.HydroLog)
        .filter(models.HydroLog.node_id == node_id)
        .order_by(models.HydroLog.timestamp.desc())
        .limit(limit)
        .all()
    )
    return logs

@router.post("/{node_id}/heartbeat")
async def node_heartbeat(node_id: str, payload: dict = {}, db: Session = Depends(get_db)):
    """
    Hardware keep-alive heartbeat ping from edge ESP32 microcontroller.
    """
    node = db.query(models.SensorNode).filter(models.SensorNode.id == node_id).first()
    if not node:
        raise HTTPException(status_code=404, detail=f"Node '{node_id}' not found.")

    battery = payload.get("battery_level")
    if battery is not None:
        node.battery_level = float(battery)
    node.status = "Active"
    db.commit()

    return {"status": "alive", "node_id": node_id, "battery_level": node.battery_level}

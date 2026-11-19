from typing import Dict, Any, List
from ...database import SessionLocal
from ...models import SensorNode, HydroLog, RiverBasin, AlertLog
from ..ml import calculate_estimated_discharge, evaluate_surge_dynamics

def get_current_water_level(location_name: str) -> Dict:
    """
    Fetches the absolute latest water level from the database for a specific location/node.
    """
    db = SessionLocal()
    try:
        node = db.query(SensorNode).outerjoin(
            RiverBasin, SensorNode.basin_id == RiverBasin.id
        ).filter(
            (SensorNode.name.ilike(f"%{location_name}%")) | 
            (RiverBasin.name.ilike(f"%{location_name}%")) |
            (SensorNode.id.ilike(f"%{location_name}%"))
        ).first()

        if not node:
            return {"error": f"Could not find any sensor node matching location: {location_name}"}

        latest_log = db.query(HydroLog).filter(HydroLog.node_id == node.id).order_by(HydroLog.timestamp.desc()).first()
        
        if not latest_log:
            return {"error": f"Sensor node {node.name} found, but no telemetry data has been logged yet."}

        discharge = calculate_estimated_discharge(latest_log.water_level_cm)

        return {
            "node_id": node.id,
            "node_name": node.name,
            "basin_name": node.basin.name if node.basin else "Unknown",
            "water_level_cm": latest_log.water_level_cm,
            "rainfall_rate_mm": latest_log.rainfall_rate_mm,
            "estimated_discharge_m3s": discharge,
            "battery_level": node.battery_level,
            "risk_level": latest_log.risk_level,
            "flood_probability": latest_log.flood_probability,
            "timestamp": latest_log.timestamp.isoformat()
        }
    finally:
        db.close()

def get_basin_flood_summary(basin_name: str = "Awash") -> Dict[str, Any]:
    """
    Aggregates full hydrological basin metrics across all active monitoring stations.
    """
    db = SessionLocal()
    try:
        nodes = db.query(SensorNode).all()
        alerts = db.query(AlertLog).filter(AlertLog.is_acknowledged == False).all()

        total_nodes = len(nodes)
        active_critical = 0
        active_warning = 0
        max_water = 0.0
        peak_station = "None"

        station_summaries = []
        for n in nodes:
            latest = db.query(HydroLog).filter(HydroLog.node_id == n.id).order_by(HydroLog.timestamp.desc()).first()
            if latest:
                if latest.water_level_cm > max_water:
                    max_water = latest.water_level_cm
                    peak_station = n.name
                if latest.risk_level == "Critical":
                    active_critical += 1
                elif latest.risk_level == "Warning":
                    active_warning += 1

                station_summaries.append({
                    "id": n.id,
                    "name": n.name,
                    "water_cm": latest.water_level_cm,
                    "rainfall_mm": latest.rainfall_rate_mm,
                    "risk": latest.risk_level
                })

        overall_posture = "Normal"
        if active_critical > 0:
            overall_posture = "Red Alert (Critical Flood Inundation)"
        elif active_warning > 0:
            overall_posture = "Amber Advisory (Elevated High-Flow)"

        return {
            "basin_name": basin_name,
            "total_sensor_nodes": total_nodes,
            "overall_posture": overall_posture,
            "peak_water_level_cm": max_water,
            "peak_station": peak_station,
            "critical_nodes_count": active_critical,
            "warning_nodes_count": active_warning,
            "unacknowledged_alerts_count": len(alerts),
            "stations": station_summaries
        }
    finally:
        db.close()

TOOLS_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "get_current_water_level",
            "description": "Get latest real-time water level, discharge, rainfall, and risk tier for a river basin or sensor location.",
            "parameters": {
                "type": "object",
                "properties": {
                    "location_name": {
                        "type": "string",
                        "description": "The name of the location, river basin, or sensor (e.g. 'Awash River Basin', 'NODE-ALPHA-1')."
                    }
                },
                "required": ["location_name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_basin_flood_summary",
            "description": "Aggregate complete hydrological basin overview, node health, peak stages, and unacknowledged alerts.",
            "parameters": {
                "type": "object",
                "properties": {
                    "basin_name": {
                        "type": "string",
                        "description": "River basin name (default: 'Awash')."
                    }
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_coordinates",
            "description": "Get precise GPS latitude and longitude coordinates for a given city, river, or location in Ethiopia.",
            "parameters": {
                "type": "object",
                "properties": {
                    "location_name": {
                        "type": "string",
                        "description": "The city or geographic location name (e.g., 'Koka, Ethiopia')."
                    }
                },
                "required": ["location_name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_weather_forecast",
            "description": "Get upstream 5-day weather forecast (specifically precipitation and rainfall) for latitude/longitude coordinates.",
            "parameters": {
                "type": "object",
                "properties": {
                    "lat": {"type": "number", "description": "Latitude"},
                    "lon": {"type": "number", "description": "Longitude"}
                },
                "required": ["lat", "lon"]
            }
        }
    }
]

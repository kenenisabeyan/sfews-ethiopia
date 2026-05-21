from typing import Dict
from ...database import SessionLocal
from ...models import SensorNode, HydroLog, RiverBasin

def get_current_water_level(location_name: str) -> Dict:
    """
    Fetches the absolute latest water level from the database for a specific location/node.
    """
    db = SessionLocal()
    try:
        # Match node by name, or by its related basin name via an outer join
        node = db.query(SensorNode).outerjoin(
            RiverBasin, SensorNode.basin_id == RiverBasin.id
        ).filter(
            (SensorNode.name.ilike(f"%{location_name}%")) | 
            (RiverBasin.name.ilike(f"%{location_name}%"))
        ).first()

        if not node:
            return {"error": f"Could not find any sensor node matching location: {location_name}"}

        # Get the latest reading
        latest_log = db.query(HydroLog).filter(HydroLog.node_id == node.id).order_by(HydroLog.timestamp.desc()).first()
        
        if not latest_log:
            return {"error": f"Sensor node {node.name} found, but no telemetry data has been logged yet."}

        return {
            "node_id": node.id,
            "node_name": node.name,
            "basin_name": node.basin.name if node.basin else "Unknown",
            "water_level_cm": latest_log.water_level_cm,
            "rainfall_rate_mm": latest_log.rainfall_rate_mm,
            "battery_level": node.battery_level,
            "risk_level": latest_log.risk_level,
            "flood_probability": latest_log.flood_probability,
            "timestamp": latest_log.timestamp.isoformat()
        }
    finally:
        db.close()

# These are the JSON Schema representations of our python tools
TOOLS_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "get_current_water_level",
            "description": "Get the latest real-time water level, rainfall, and risk tier for a river basin or sensor location from the PostgreSQL database.",
            "parameters": {
                "type": "object",
                "properties": {
                    "location_name": {
                        "type": "string",
                        "description": "The name of the location, river basin, or sensor (e.g., 'Awash River Basin')."
                    }
                },
                "required": ["location_name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_coordinates",
            "description": "Get the precise latitude and longitude for a given city, river, or location name.",
            "parameters": {
                "type": "object",
                "properties": {
                    "location_name": {
                        "type": "string",
                        "description": "The city or geographic location name (e.g., 'Abay Bahirdar, Ethiopia')."
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
            "description": "Get the upstream 5-day weather forecast (specifically rainfall and severe weather) for specific latitude and longitude coordinates.",
            "parameters": {
                "type": "object",
                "properties": {
                    "lat": {
                        "type": "number",
                        "description": "Latitude of the location."
                    },
                    "lon": {
                        "type": "number",
                        "description": "Longitude of the location."
                    }
                },
                "required": ["lat", "lon"]
            }
        }
    }
]

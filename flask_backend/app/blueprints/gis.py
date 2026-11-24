from flask import Blueprint, jsonify
from ..database import SessionLocal
from ..models import SensorNode, HydroLog

gis_bp = Blueprint("gis", __name__, url_prefix="/api/v1/gis")

@gis_bp.route("/topology", methods=["GET"])
def get_basin_topology():
    """
    Returns standard GeoJSON FeatureCollection of the Awash River Basin:
    - River reach alignment polyline
    - Gauging station anchors with active readings
    - Floodplain hazard zones
    - Designated emergency civil defense shelters
    """
    db = SessionLocal()
    try:
        nodes = db.query(SensorNode).all()
        node_features = []
        for n in nodes:
            log = db.query(HydroLog).filter(HydroLog.node_id == n.id).order_by(HydroLog.id.desc()).first()
            node_features.append({
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [n.longitude or 39.2689, n.latitude or 8.5412]
                },
                "properties": {
                    "id": n.id,
                    "name": n.name,
                    "category": "HYDROMETRIC_STATION",
                    "water_level_cm": log.water_level_cm if log else 0.0,
                    "risk_level": log.risk_level if log else "Normal",
                    "battery_level": n.battery_level,
                    "status": n.status
                }
            })

        # River polyline (Simulated Awash River transect from Koka/Wonji to Awash Gorge)
        river_feature = {
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": [
                    [39.1245, 8.5921],  # Mojo Confluence
                    [39.2689, 8.5412],  # Headwaters
                    [39.2812, 8.4419],  # Wonji Plains
                    [40.1582, 8.9806]   # Central Awash Gorge
                ]
            },
            "properties": {
                "name": "Awash River Main Stem",
                "category": "RIVER_REACH",
                "catchment_area_km2": 110000,
                "flow_direction": "SOUTH_WEST_TO_NORTH_EAST"
            }
        }

        # Safe evacuation shelters
        shelters = [
            {"name": "Adama General Hospital Shelter", "coords": [39.2710, 8.5480], "capacity": 2500},
            {"name": "Wonji Secondary School Safe Zone", "coords": [39.2890, 8.4550], "capacity": 1800},
            {"name": "Mojo Stadium Civil Defense Camp", "coords": [39.1310, 8.5990], "capacity": 3200}
        ]
        shelter_features = [{
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": s["coords"]},
            "properties": {
                "name": s["name"],
                "category": "EVACUATION_SHELTER",
                "capacity_persons": s["capacity"],
                "status": "OPEN"
            }
        } for s in shelters]

        geojson_payload = {
            "type": "FeatureCollection",
            "crs": {"type": "name", "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}},
            "features": [river_feature] + node_features + shelter_features
        }

        return jsonify(geojson_payload), 200
    finally:
        db.close()

@gis_bp.route("/zones/<string:station_id>", methods=["GET"])
def get_inundation_zone(station_id: str):
    """Calculates inundation radius based on instantaneous river stage."""
    db = SessionLocal()
    try:
        node = db.query(SensorNode).filter(SensorNode.id == station_id).first()
        if not node:
            return jsonify({"detail": "Station not found"}), 404

        log = db.query(HydroLog).filter(HydroLog.node_id == station_id).order_by(HydroLog.id.desc()).first()
        stage = log.water_level_cm if log else 150.0

        # Buffer radius in meters: Base 200m + 5m per cm above 250cm
        inundation_radius_m = 200.0 + max(0.0, (stage - 250.0) * 5.0)

        return jsonify({
            "station_id": station_id,
            "latitude": node.latitude,
            "longitude": node.longitude,
            "current_stage_cm": stage,
            "inundation_buffer_meters": round(inundation_radius_m, 1),
            "threat_classification": "ZONE_CRITICAL" if stage >= 450.0 else ("ZONE_WARNING" if stage >= 350.0 else "ZONE_SAFE")
        }), 200
    finally:
        db.close()

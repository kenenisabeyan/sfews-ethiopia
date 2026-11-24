from flask import Blueprint, jsonify, request
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

@gis_bp.route("/nearest", methods=["GET"])
def find_nearest_station():
    """Finds the closest hydrometric monitoring anchor to a given GPS latitude/longitude."""
    try:
        lat = float(request.args.get("lat", 8.5412))
        lng = float(request.args.get("lng", 39.2689))
    except ValueError:
        return jsonify({"detail": "Parameters 'lat' and 'lng' must be valid floats"}), 400

    db = SessionLocal()
    try:
        nodes = db.query(SensorNode).all()
        nearest = None
        min_dist_km = float("inf")

        for n in nodes:
            if n.latitude and n.longitude:
                # Euclidean distance approximation in kilometers for small regions
                d_lat = (n.latitude - lat) * 111.0
                d_lng = (n.longitude - lng) * 111.0 * 0.98
                dist_km = (d_lat**2 + d_lng**2) ** 0.5
                if dist_km < min_dist_km:
                    min_dist_km = dist_km
                    nearest = n

        if not nearest:
            return jsonify({"detail": "No stations available"}), 404

        return jsonify({
            "nearest_station_id": nearest.id,
            "station_name": nearest.name,
            "distance_km": round(min_dist_km, 2),
            "coordinates": {"lat": nearest.latitude, "lng": nearest.longitude}
        }), 200
    finally:
        db.close()

@gis_bp.route("/routes", methods=["GET"])
def get_evacuation_routes():
    """Returns safe transit corridors connecting flood hazard zones to emergency relief shelters."""
    corridors = [
        {
            "route_id": "EVAC-WONJI-01",
            "from_zone": "Wonji Sugar Estate Lowlands",
            "to_shelter": "Wonji Secondary School Safe Zone",
            "elevation_gain_meters": 35.0,
            "path_type": "Primary Elevated Asphalt Highway",
            "clearance_status": "OPEN",
            "waypoints": [[39.2812, 8.4419], [39.2850, 8.4480], [39.2890, 8.4550]]
        },
        {
            "route_id": "EVAC-MOJO-02",
            "from_zone": "Mojo River Confluence Plain",
            "to_shelter": "Mojo Stadium Civil Defense Camp",
            "elevation_gain_meters": 48.0,
            "path_type": "All-Weather Elevated Bypass",
            "clearance_status": "OPEN",
            "waypoints": [[39.1245, 8.5921], [39.1270, 8.5950], [39.1310, 8.5990]]
        }
    ]
    return jsonify({"routes": corridors, "total_routes": len(corridors)}), 200


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

@gis_bp.route("/inundation-exposure", methods=["POST"])
def evaluate_inundation_exposure():
    """
    Computes spatial inundation footprint and assesses exposed critical infrastructure
    (sugar estates, bridges, clinics, schools) and population at risk based on river stage.
    """
    data = request.get_json(silent=True) or {}
    stage = data.get("stage_cm")
    station_id = data.get("station_id", "NODE-ALPHA-1")

    db = SessionLocal()
    try:
        if stage is None:
            log = db.query(HydroLog).filter(HydroLog.node_id == station_id).order_by(HydroLog.id.desc()).first()
            stage = log.water_level_cm if log else 250.0

        stage = float(stage)
        # Infrastructure inventory across the Awash floodplain transect
        infrastructure = [
            {"name": "Wonji Sugar Cane Mill & Refinery", "type": "INDUSTRIAL_AGRICULTURE", "threshold_cm": 320.0, "location": [39.2812, 8.4419]},
            {"name": "Melka Kunture UNESCO Cultural Site", "type": "HERITAGE_INFRASTRUCTURE", "threshold_cm": 380.0, "location": [38.6012, 8.7050]},
            {"name": "Mojo Agro-Logistics Freight Dryport", "type": "COMMERCIAL_FREIGHT", "threshold_cm": 420.0, "location": [39.1245, 8.5921]},
            {"name": "Wonji Community Primary Clinic", "type": "PUBLIC_HEALTH", "threshold_cm": 450.0, "location": [39.2890, 8.4550]},
            {"name": "Adama-Wonji Irrigation Canal Intake", "type": "HYDRAULIC_CONTROL", "threshold_cm": 300.0, "location": [39.2740, 8.4810]}
        ]

        impacted_assets = []
        for asset in infrastructure:
            if stage >= asset["threshold_cm"]:
                impacted_assets.append({
                    "name": asset["name"],
                    "category": asset["type"],
                    "breach_stage_cm": asset["threshold_cm"],
                    "submersion_depth_cm": round(stage - asset["threshold_cm"], 1),
                    "coordinates": asset["location"],
                    "status": "AT_RISK_INUNDATED"
                })

        # Empirical floodplain area expansion in the Awash Graben: ~0.08 km2 per cm above 200cm
        inundation_area_km2 = round(0.5 + max(0.0, (stage - 200.0) * 0.08), 2)
        # Population density estimate: ~340 persons/km2 in rural alluvial plains
        estimated_population_at_risk = int(inundation_area_km2 * 340)

        return jsonify({
            "station_id": station_id,
            "assessed_stage_cm": stage,
            "flood_hazard_tier": "CRITICAL_INUNDATION" if stage >= 450.0 else ("WARNING_FLOODPLAIN" if stage >= 350.0 else "ADVISORY_MONITORING"),
            "estimated_inundation_area_km2": inundation_area_km2,
            "estimated_population_at_risk": estimated_population_at_risk,
            "impacted_infrastructure_count": len(impacted_assets),
            "impacted_infrastructure": impacted_assets,
            "recommended_evacuation_lead_hours": 3.5 if stage >= 450.0 else 6.0
        }), 200
    finally:
        db.close()


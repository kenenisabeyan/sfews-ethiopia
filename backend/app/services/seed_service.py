import logging
from sqlalchemy.orm import Session
from .. import models
from ..security import get_password_hash

logger = logging.getLogger("sfews.seed")

DEFAULT_SETTINGS = {
    "warning_threshold": 300.0,
    "critical_threshold": 450.0,
    "radius_km": 15.0
}

DEFAULT_NODES = [
    {
        "id": "NODE-ALPHA-1",
        "name": "Awash Headwaters (Koka Dam)",
        "latitude": 8.4712,
        "longitude": 39.0531,
        "battery_level": 96.5,
        "status": "Active"
    },
    {
        "id": "NODE-BETA-2",
        "name": "Middle Awash Gorge (Awash Station)",
        "latitude": 8.9875,
        "longitude": 40.1742,
        "battery_level": 89.0,
        "status": "Active"
    },
    {
        "id": "NODE-GAMMA-3",
        "name": "Lower Awash Plains (Asaita Delta)",
        "latitude": 11.5621,
        "longitude": 41.4429,
        "battery_level": 78.4,
        "status": "Active"
    }
]

DEFAULT_SUBSCRIBERS = [
    {
        "id": "sub-1",
        "name": "Abebe Bikila",
        "phone": "+251 911 234 567",
        "station_id": "NODE-ALPHA-1",
        "status": "Active"
    },
    {
        "id": "sub-2",
        "name": "Fatuma Roba",
        "phone": "+251 912 987 654",
        "station_id": "NODE-BETA-2",
        "status": "Active"
    },
    {
        "id": "sub-3",
        "name": "Haile Gebrselassie",
        "phone": "+251 910 555 444",
        "station_id": "NODE-GAMMA-3",
        "status": "Muted"
    }
]

def seed_database_defaults(db: Session) -> dict:
    messages = []

    # 1. Country: Ethiopia
    country = db.query(models.Country).filter(models.Country.code == "ETH").first()
    if not country:
        country = models.Country(name="Ethiopia", code="ETH")
        db.add(country)
        db.commit()
        db.refresh(country)
        messages.append("Created Country: Ethiopia")
    else:
        messages.append("Country 'Ethiopia' verified.")

    # 2. Basin: Awash River Basin
    basin = db.query(models.RiverBasin).filter(models.RiverBasin.name == "Awash River Basin").first()
    if not basin:
        basin = models.RiverBasin(name="Awash River Basin", country_id=country.id)
        db.add(basin)
        db.commit()
        db.refresh(basin)
        messages.append(f"Created River Basin: Awash River Basin (ID: {basin.id})")
    else:
        messages.append("River Basin 'Awash River Basin' verified.")

    # 3. System Settings
    for key, val in DEFAULT_SETTINGS.items():
        setting = db.query(models.SystemSetting).filter(models.SystemSetting.key == key).first()
        if not setting:
            setting = models.SystemSetting(key=key, value=val)
            db.add(setting)
            messages.append(f"Seeded Setting: {key} = {val}")

    # 4. Standard Edge Sensor Nodes
    for n in DEFAULT_NODES:
        existing = db.query(models.SensorNode).filter(models.SensorNode.id == n["id"]).first()
        if not existing:
            new_node = models.SensorNode(
                id=n["id"],
                name=n["name"],
                basin_id=basin.id,
                latitude=n["latitude"],
                longitude=n["longitude"],
                battery_level=n["battery_level"],
                status=n["status"]
            )
            db.add(new_node)
            messages.append(f"Seeded Sensor Node: {n['id']}")

    # 5. Community Emergency Subscribers
    for s in DEFAULT_SUBSCRIBERS:
        existing_sub = db.query(models.Subscriber).filter(models.Subscriber.id == s["id"]).first()
        if not existing_sub:
            new_sub = models.Subscriber(
                id=s["id"],
                name=s["name"],
                phone=s["phone"],
                station_id=s["station_id"],
                status=s["status"]
            )
            db.add(new_sub)
            messages.append(f"Seeded Subscriber: {s['name']}")

    # 6. Admin User
    admin = db.query(models.User).filter(models.User.email == "admin@sfews.gov.et").first()
    if not admin:
        hashed_password = get_password_hash("admin123")
        admin = models.User(
            name="System Administrator",
            email="admin@sfews.gov.et",
            hashed_password=hashed_password,
            role="admin"
        )
        db.add(admin)
        messages.append("Seeded Admin User (admin@sfews.gov.et)")

    # 7. Add initial baseline telemetry if none exists
    log_count = db.query(models.HydroLog).count()
    if log_count == 0:
        baseline_logs = [
            models.HydroLog(node_id="NODE-ALPHA-1", water_level_cm=210.5, rainfall_rate_mm=12.4, flood_probability=0.22, risk_level="Safe"),
            models.HydroLog(node_id="NODE-BETA-2", water_level_cm=275.0, rainfall_rate_mm=34.1, flood_probability=0.38, risk_level="Safe"),
            models.HydroLog(node_id="NODE-GAMMA-3", water_level_cm=320.0, rainfall_rate_mm=56.8, flood_probability=0.58, risk_level="Warning"),
        ]
        db.add_all(baseline_logs)
        messages.append("Seeded Initial Hydrological Logs")

    db.commit()
    logger.info("Database seeding successfully verified.")
    return {
        "status": "success",
        "basin_id": basin.id,
        "details": messages
    }

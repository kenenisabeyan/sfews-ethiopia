from .models import Country, RiverBasin, SensorNode, User, SystemSetting, AlertLog, Subscriber
from .security import hash_password

def seed_database(db):
    """Populates essential baseline hydrological anchors, default settings, and credentials."""
    # 1. Country & Basin
    ethiopia = db.query(Country).filter(Country.code == "ETH").first()
    if not ethiopia:
        ethiopia = Country(name="Ethiopia", code="ETH")
        db.add(ethiopia)
        db.flush()

    awash = db.query(RiverBasin).filter(RiverBasin.name == "Awash River Basin").first()
    if not awash:
        awash = RiverBasin(name="Awash River Basin", country_id=ethiopia.id)
        db.add(awash)
        db.flush()

    # 2. Strategic Gauge Anchors
    default_nodes = [
        {"id": "NODE-AWASH-01", "name": "Awash Station 01 (Central Gorge)", "lat": 8.9806, "lng": 40.1582, "battery": 98.4},
        {"id": "NODE-ALPHA-1", "name": "Awash Headwaters Alpha-1", "lat": 8.5412, "lng": 39.2689, "battery": 92.1},
        {"id": "NODE-GAMMA-3", "name": "Mojo Confluence Gamma-3", "lat": 8.5921, "lng": 39.1245, "battery": 87.5},
        {"id": "NODE-BETA-2", "name": "Wonji Plains Beta-2", "lat": 8.4419, "lng": 39.2812, "battery": 95.0},
    ]
    for nd in default_nodes:
        existing = db.query(SensorNode).filter(SensorNode.id == nd["id"]).first()
        if not existing:
            node_obj = SensorNode(
                id=nd["id"],
                name=nd["name"],
                basin_id=awash.id,
                latitude=nd["lat"],
                longitude=nd["lng"],
                battery_level=nd["battery"],
                status="Active"
            )
            db.add(node_obj)

    # 3. Default System Administrator User
    admin = db.query(User).filter(User.email == "admin@sfews.gov.et").first()
    if not admin:
        admin = User(
            name="Command Operator",
            email="admin@sfews.gov.et",
            hashed_password=hash_password("admin123"),
            role="admin"
        )
        db.add(admin)

    # 4. System Settings (Hydrological Alarm Thresholds)
    default_settings = {
        "warning_threshold_cm": 350.0,
        "critical_threshold_cm": 450.0,
        "rate_of_rise_threshold": 30.0,
        "telemetry_interval_sec": 2.0
    }
    for k, v in default_settings.items():
        if not db.query(SystemSetting).filter(SystemSetting.key == k).first():
            db.add(SystemSetting(key=k, value=v))

    # 5. Default Civil Defense Emergency Subscribers
    default_subs = [
        {"id": "SUB-001", "name": "Adama Civil Defense Incident Room", "phone": "+251911223344", "station": "NODE-ALPHA-1"},
        {"id": "SUB-002", "name": "Wonji Sugar Factory Safety Office", "phone": "+251922334455", "station": "NODE-BETA-2"},
        {"id": "SUB-003", "name": "Mojo Logistics Hub Disaster Cell", "phone": "+251933445566", "station": "NODE-GAMMA-3"},
    ]
    for sub in default_subs:
        if not db.query(Subscriber).filter(Subscriber.id == sub["id"]).first():
            db.add(Subscriber(id=sub["id"], name=sub["name"], phone=sub["phone"], station_id=sub["station"], status="Active"))

    db.commit()

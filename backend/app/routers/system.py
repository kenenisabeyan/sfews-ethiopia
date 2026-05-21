from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/api/v1/system", tags=["System"])

@router.post("/seed", response_model=dict)
def seed_initial_data(db: Session = Depends(get_db)):
    """
    Utility endpoint to seed the initial Country (Ethiopia), Basin (Awash River),
    and default warning thresholds.
    """
    messages = []
    
    country = db.query(models.Country).filter(models.Country.code == "ETH").first()
    if not country:
        country = models.Country(name="Ethiopia", code="ETH")
        db.add(country)
        db.commit()
        db.refresh(country)
        messages.append(f"Created Country: {country.name}")
    else:
        messages.append("Country 'Ethiopia' already exists.")
        
    basin = db.query(models.RiverBasin).filter(models.RiverBasin.name == "Awash River Basin").first()
    if not basin:
        basin = models.RiverBasin(name="Awash River Basin", country_id=country.id)
        db.add(basin)
        db.commit()
        db.refresh(basin)
        messages.append(f"Created Basin: {basin.name} (ID: {basin.id})")
    else:
        messages.append(f"Basin 'Awash River Basin' already exists (ID: {basin.id}).")

    # Seed default system settings
    default_settings = {
        "warning_threshold": 300.0,
        "critical_threshold": 450.0,
        "radius_km": 15.0
    }
    for key, val in default_settings.items():
        setting = db.query(models.SystemSetting).filter(models.SystemSetting.key == key).first()
        if not setting:
            setting = models.SystemSetting(key=key, value=val)
            db.add(setting)
            messages.append(f"Seeded System Setting: {key} = {val}")
        else:
            messages.append(f"Setting '{key}' already exists.")
    
    db.commit()
        
    return {
        "status": "success",
        "basin_id": basin.id,
        "details": messages
    }

@router.get("/settings", response_model=schemas.SystemSettingsResponse)
def get_system_settings(db: Session = Depends(get_db)):
    """
    Fetch all active early warning thresholds and configs.
    """
    keys = ["warning_threshold", "critical_threshold", "radius_km"]
    settings_dict = {
        "warning_threshold": 300.0,
        "critical_threshold": 450.0,
        "radius_km": 15.0
    }
    
    for key in keys:
        setting = db.query(models.SystemSetting).filter(models.SystemSetting.key == key).first()
        if setting:
            settings_dict[key] = setting.value
            
    return schemas.SystemSettingsResponse(
        warning_threshold=settings_dict["warning_threshold"],
        critical_threshold=settings_dict["critical_threshold"],
        radius_km=settings_dict["radius_km"]
    )

@router.post("/settings", response_model=schemas.SystemSettingsResponse)
def update_system_settings(payload: schemas.SystemSettingsUpdate, db: Session = Depends(get_db)):
    """
    Overwrite system settings.
    """
    settings_dict = {
        "warning_threshold": payload.warning_threshold,
        "critical_threshold": payload.critical_threshold,
        "radius_km": payload.radius_km
    }
    
    for key, val in settings_dict.items():
        setting = db.query(models.SystemSetting).filter(models.SystemSetting.key == key).first()
        if not setting:
            setting = models.SystemSetting(key=key, value=val)
            db.add(setting)
        else:
            setting.value = val
            
    db.commit()
    
    return schemas.SystemSettingsResponse(
        warning_threshold=payload.warning_threshold,
        critical_threshold=payload.critical_threshold,
        radius_km=payload.radius_km
    )


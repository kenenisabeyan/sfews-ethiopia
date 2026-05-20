from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from .. import models
from ..database import get_db

router = APIRouter(prefix="/api/v1/system", tags=["System"])

@router.post("/seed", response_model=dict)
def seed_initial_data(db: Session = Depends(get_db)):
    """
    Utility endpoint to seed the initial Country (Ethiopia) and Basin (Awash River)
    to facilitate easy testing and node registration.
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
        
    return {
        "status": "success",
        "basin_id": basin.id,
        "details": messages
    }

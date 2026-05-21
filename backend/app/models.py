from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class Country(Base):
    __tablename__ = "countries"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    code = Column(String(3), unique=True, nullable=False)
    
    basins = relationship("RiverBasin", back_populates="country")

class RiverBasin(Base):
    __tablename__ = "river_basins"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    country_id = Column(Integer, ForeignKey("countries.id"))
    
    country = relationship("Country", back_populates="basins")
    sensor_nodes = relationship("SensorNode", back_populates="basin")

class SensorNode(Base):
    __tablename__ = "sensor_nodes"
    id = Column(String, primary_key=True, index=True) # e.g. 'NODE-ALPHA-1'
    name = Column(String, nullable=False)
    basin_id = Column(Integer, ForeignKey("river_basins.id"))
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    status = Column(String, default="Active")
    battery_level = Column(Float, nullable=False)
    last_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    basin = relationship("RiverBasin", back_populates="sensor_nodes")
    hydro_logs = relationship("HydroLog", back_populates="node")

class HydroLog(Base):
    __tablename__ = "hydro_logs"
    id = Column(Integer, primary_key=True, index=True)
    node_id = Column(String, ForeignKey("sensor_nodes.id"))
    water_level_cm = Column(Float, nullable=False)
    rainfall_rate_mm = Column(Float, nullable=False)
    flood_probability = Column(Float, nullable=False)
    risk_level = Column(String, nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    node = relationship("SensorNode", back_populates="hydro_logs")

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="admin")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

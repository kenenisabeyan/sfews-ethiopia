from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean, Index
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
    id = Column(String, primary_key=True, index=True)  # e.g. 'NODE-AWASH-01'
    name = Column(String, nullable=False)
    basin_id = Column(Integer, ForeignKey("river_basins.id"))
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    status = Column(String, default="Active")
    battery_level = Column(Float, nullable=False, default=100.0)
    last_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    basin = relationship("RiverBasin", back_populates="sensor_nodes")
    hydro_logs = relationship("HydroLog", back_populates="node", cascade="all, delete-orphan")

class HydroLog(Base):
    __tablename__ = "hydro_logs"
    id = Column(Integer, primary_key=True, index=True)
    node_id = Column(String, ForeignKey("sensor_nodes.id"), index=True)
    water_level_cm = Column(Float, nullable=False)
    rainfall_rate_mm = Column(Float, nullable=False)
    flood_probability = Column(Float, nullable=False)
    risk_level = Column(String, nullable=False, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    node = relationship("SensorNode", back_populates="hydro_logs")

    __table_args__ = (
        Index("idx_hydrolog_node_timestamp", "node_id", "timestamp"),
    )

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="admin")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class SystemSetting(Base):
    __tablename__ = "system_settings"
    key = Column(String, primary_key=True, index=True)
    value = Column(Float, nullable=False)

class AlertLog(Base):
    __tablename__ = "alert_logs"
    id = Column(Integer, primary_key=True, index=True)
    node_id = Column(String, ForeignKey("sensor_nodes.id"), nullable=True, index=True)
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    severity = Column(String, default="Warning", index=True)
    water_level_cm = Column(Float, nullable=True)
    is_acknowledged = Column(Boolean, default=False)
    acknowledged_by = Column(String, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    node = relationship("SensorNode")

class Subscriber(Base):
    __tablename__ = "subscribers"
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    station_id = Column(String, nullable=False, index=True)
    status = Column(String, default="Active")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

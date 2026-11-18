from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Any, Dict
from datetime import datetime

# ==========================================
# Telemetry Schemas
# ==========================================
class TelemetryData(BaseModel):
    node_id: str
    water_level_cm: float
    rainfall_rate_mm: float
    battery_level: float = 100.0

class BatchTelemetryData(BaseModel):
    readings: List[TelemetryData]

class HydroLogResponse(BaseModel):
    id: int
    node_id: str
    water_level_cm: float
    rainfall_rate_mm: float
    flood_probability: float
    risk_level: str
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)

# ==========================================
# Sensor Node Schemas
# ==========================================
class SensorNodeResponse(BaseModel):
    id: str
    name: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    status: str
    batteryLevel: float = Field(..., alias="battery_level")
    waterLevelCm: float = Field(..., alias="water_level_cm")
    rainfallRateMm: float = Field(..., alias="rainfall_rate_mm")
    currentRisk: str = Field(..., alias="risk_level")
    lastUpdated: Optional[str] = Field(None, alias="last_updated")
    basinName: Optional[str] = Field("Awash River Basin", alias="basin_name")
    
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

class NodeRegistration(BaseModel):
    id: str
    name: str
    basin_name: str = "Awash River Basin"
    country_name: str = "Ethiopia"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    battery_level: float = 100.0

class NodeUpdate(BaseModel):
    name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    status: Optional[str] = None
    battery_level: Optional[float] = None

# ==========================================
# Dashboard Schemas
# ==========================================
class DashboardSummary(BaseModel):
    totalNodes: int
    activeAlerts: int
    systemHealthStatus: str
    criticalNodesCount: int = 0
    warningNodesCount: int = 0
    averageWaterLevel: float = 0.0

class DashboardResponse(BaseModel):
    summary: DashboardSummary
    nodes: List[SensorNodeResponse]
    history: List[dict]

# ==========================================
# Alerts & Emergency Broadcast Schemas
# ==========================================
class AlertLogResponse(BaseModel):
    id: int
    nodeId: Optional[str] = Field(None, alias="node_id")
    title: str
    message: str
    severity: str
    waterLevelCm: Optional[float] = Field(None, alias="water_level_cm")
    isAcknowledged: bool = Field(False, alias="is_acknowledged")
    acknowledgedBy: Optional[str] = Field(None, alias="acknowledged_by")
    timestamp: str

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

class AlertAcknowledgeRequest(BaseModel):
    acknowledged_by: Optional[str] = "Command Center Operator"

class BroadcastRequest(BaseModel):
    message: str
    severity: str = "Critical"
    station_id: Optional[str] = None
    radius_km: Optional[float] = None

class BroadcastResponse(BaseModel):
    status: str
    subscribers_notified: int
    delivered_channels: List[str]
    message: str
    broadcast_time: str

class SubscriberCreate(BaseModel):
    id: Optional[str] = None
    name: str
    phone: str
    station_id: str
    status: str = "Active"

class SubscriberUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    station_id: Optional[str] = None
    status: Optional[str] = None

class SubscriberResponse(BaseModel):
    id: str
    name: str
    phone: str
    stationId: str = Field(..., alias="station_id")
    status: str
    createdAt: Optional[str] = Field(None, alias="created_at")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

# ==========================================
# System Settings & Diagnostics Schemas
# ==========================================
class SystemSettingsResponse(BaseModel):
    critical_threshold: float
    warning_threshold: float
    radius_km: float

class SystemSettingsUpdate(BaseModel):
    critical_threshold: float
    warning_threshold: float
    radius_km: float

class SystemDiagnosticsResponse(BaseModel):
    status: str
    uptime_seconds: float
    database: Dict[str, Any]
    cache_stats: Dict[str, Any]
    event_bus_stats: Dict[str, Any]
    active_ws_connections: int
    server_time: str

# ==========================================
# Authentication & Users Schemas
# ==========================================
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = 86400

class UserCreate(BaseModel):
    email: str
    name: str
    password: str
    role: str = "analyst"

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str

    model_config = ConfigDict(from_attributes=True)

# ==========================================
# AI Agent Chat & Simulation Schemas
# ==========================================
class ChatRequest(BaseModel):
    query: str

class ChatResponse(BaseModel):
    response: str

class FloodPayload(BaseModel):
    level: int

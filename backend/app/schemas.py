from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional

class TelemetryData(BaseModel):
    node_id: str
    water_level_cm: float
    rainfall_rate_mm: float
    battery_level: float

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
    
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

class DashboardSummary(BaseModel):
    totalNodes: int
    activeAlerts: int
    systemHealthStatus: str

class DashboardResponse(BaseModel):
    summary: DashboardSummary
    nodes: List[SensorNodeResponse]
    history: List[dict]

class NodeRegistration(BaseModel):
    id: str
    name: str
    basin_name: str = "Awash River Basin"
    country_name: str = "Ethiopia"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    battery_level: float = 100.0

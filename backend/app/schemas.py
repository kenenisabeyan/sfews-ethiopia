from pydantic import BaseModel, Field
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
    
    class Config:
        allow_population_by_field_name = True
        orm_mode = True

class DashboardSummary(BaseModel):
    totalNodes: int
    activeAlerts: int
    systemHealthStatus: str

class DashboardResponse(BaseModel):
    summary: DashboardSummary
    nodes: List[SensorNodeResponse]
    history: List[dict]

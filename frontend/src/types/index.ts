export interface SensorNode {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    status: string;
    batteryLevel: number;
    waterLevelCm?: number;
    rainfallRateMm?: number;
    currentRisk?: 'Safe' | 'Warning' | 'Critical';
    rateOfRiseCmPerHr?: number;
    estimatedDischargeM3s?: number;
    basinName?: string;
}

export interface HydroLog {
    logId: string | number;
    nodeId: string;
    waterLevelCm: number;
    rainfallRateMm: number;
    floodProbability: number;
    riskLevel: 'Safe' | 'Warning' | 'Critical';
    timestamp: string;
}

export interface DashboardSummary {
    totalNodes: number;
    activeAlerts: number;
    systemHealthStatus: string;
    criticalNodesCount?: number;
    warningNodesCount?: number;
    averageWaterLevel?: number;
}

export interface DashboardPayload {
    summary: DashboardSummary;
    nodes: SensorNode[];
    history: HydroLog[];
}

export interface SystemHealth {
    status: string;
    api_version: string;
    database_connection: string;
    database_driver?: string;
    server_time: string;
    registered_domains?: string[];
}

export interface WeatherForecast {
    day: string;
    tempMax: number;
    tempMin: number;
    condition: 'Rainy' | 'Cloudy' | 'Sunny' | 'Stormy';
}

export interface WeatherInfo {
    temp: number;
    condition: string;
    humidity: number;
    windSpeed: number;
    rainfall24h: number;
    location: string;
    forecast: WeatherForecast[];
}

export interface AlertLog {
    id: number;
    node_id?: string;
    title: string;
    message: string;
    severity: 'Safe' | 'Warning' | 'Critical' | 'Emergency' | 'Info';
    water_level_cm?: number;
    is_acknowledged: boolean;
    acknowledged_by?: string;
    timestamp: string;
}

export interface Subscriber {
    id: string;
    name: string;
    phone: string;
    stationId: string;
    status: 'Active' | 'Muted';
    createdAt?: string;
}

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
    server_time: string;
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


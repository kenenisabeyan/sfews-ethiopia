export interface SensorNode {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    status: 'Safe' | 'Warning' | 'Critical';
    batteryLevel: number;
}

export interface HydroLog {
    logId: string;
    nodeId: string;
    waterLevelCm: number;
    rainfallRateMm: number;
    floodProbability: number;
    riskLevel: 'Safe' | 'Warning' | 'Critical';
    timestamp: string;
}

export interface DashboardData {
    nodes: SensorNode[];
    history: HydroLog[];
}

export interface HealthStatus {
    status: string;
    api: string;
    database: string;
    db_time: string;
}

/**
 * TypeScript interfaces matching the EXACT JSON shapes
 * sent by the backend (verified against live output).
 *
 * IMPORTANT: The backend serializes SensorNodeResponse with
 * `model_dump_json(by_alias=True)`, which produces snake_case
 * keys for aliased fields. History and Summary use camelCase.
 */

// ── Sensor Node (snake_case keys from backend alias serialization) ──
export interface SensorNode {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  status: string;
  battery_level: number;
  water_level_cm: number;
  rainfall_rate_mm: number;
  risk_level: 'Safe' | 'Warning' | 'Critical';
}

// ── Hydro Log (camelCase — manually constructed dict in backend) ──
export interface HydroLog {
  logId: string | number;
  nodeId: string;
  waterLevelCm: number;
  rainfallRateMm: number;
  floodProbability: number;
  riskLevel: 'Safe' | 'Warning' | 'Critical';
  timestamp: string;
}

// ── Dashboard Summary (camelCase — no aliases in backend schema) ──
export interface DashboardSummary {
  totalNodes: number;
  activeAlerts: number;
  systemHealthStatus: string;
}

// ── Full Dashboard Payload (received via WebSocket and HTTP) ──
export interface DashboardPayload {
  summary: DashboardSummary;
  nodes: SensorNode[];
  history: HydroLog[];
}

// ── Health Check Response ──
export interface SystemHealth {
  status: string;
  api_version: string;
  database_connection: string;
  server_time: string;
}

// ── Auth ──
export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: string;
}

// ── Chat ──
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * @file types.ts
 * @description Production-ready TypeScript type definitions representing the architectural contract
 * for the Anti-Gravity Viscoelastic Fluid simulation dashboard.
 */

/**
 * Telemetry record captured from the viscoelastic fluid simulation sensor node.
 */
export interface FluidTelemetryEntry {
  /** ISO 8601 UTC timestamp */
  timestamp: string;
  /** Height in centimeters (cm) */
  height_cm: number;
  /** Climbing velocity in centimeters per second (cm/s) */
  climbing_velocity_cms: number;
  /** Tensile stress in Pascals (Pa) */
  tensile_stress_pa: number;
  /** Viscosity in Pascal-seconds (Pa·s) */
  apparent_viscosity_pas: number;
}

/** Strict union defining the behavioral flow regime of the polymer */
export type FlowRegime = 'STAGNANT' | 'STABLE_SIPHON' | 'COHESION_FAILURE';

/** Strict union defining status of a pilot station node */
export type StationStatus = 'SAFE' | 'WARNING' | 'DANGER';

/** Represents a single pilot telemetry monitoring node in the Upper Awash Basin */
export interface PilotStation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: StationStatus;
  adc_value: number; // 0 - 1023 Scale
  gpio_led: boolean;
  gpio_buzzer: boolean;
  is_online: boolean;
  siphon_active: boolean;
  metrics: FluidTelemetryEntry;
  history: FluidTelemetryEntry[];
}

/** Represents a subscriber in the SMS Broadcast registry */
export interface Subscriber {
  id: string;
  name: string;
  phone: string;
  zone: string;
  status: 'Active' | 'Offline';
}

/** Represents an automated or manual emergency dispatch log */
export interface DispatchLog {
  id: string;
  timestamp: string;
  stationName: string;
  message: string;
  type: 'AUTO' | 'MANUAL';
  status: 'DELIVERED' | 'FAILED' | 'PENDING';
}

/** 7-day weather forecast card metric */
export interface WeatherForecast {
  day: string;
  tempMax: number;
  tempMin: number;
  condition: 'Rainy' | 'Cloudy' | 'Sunny' | 'Stormy';
}

/** Weather metrics for a pilot station or regional command */
export interface WeatherInfo {
  temp: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  rainfall24h: number;
  location: string;
  forecast: WeatherForecast[];
}

/** Tab names for navigation */
export type ActiveTab = 'dashboard' | 'map' | 'levels' | 'alerts' | 'weather' | 'reports';

/** The unified root state interface for the Anti-Gravity Command Console */
export interface AntiGravityDashboardState {
  current_metrics: FluidTelemetryEntry;
  is_siphon_active: boolean;
  flow_regime: FlowRegime;
  historical_stream: FluidTelemetryEntry[];
  
  // Extended multi-station state
  stations: PilotStation[];
  active_station_id: string;
  subscribers: Subscriber[];
  dispatch_logs: DispatchLog[];
  weather: WeatherInfo;
  active_tab: ActiveTab;
}

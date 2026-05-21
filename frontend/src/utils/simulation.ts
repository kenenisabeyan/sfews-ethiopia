import { FluidTelemetryEntry, PilotStation, AntiGravityDashboardState, StationStatus } from '../types/types';

/** Generates pseudo-random variance for micro-fluctuations */
const generateNoise = (magnitude: number): number => {
  return (Math.random() - 0.5) * 2 * magnitude;
};

/** Initialize the 5 pilot stations with distinct geographical and simulation attributes */
export const initializeStations = (): PilotStation[] => {
  const now = new Date().toISOString();
  
  return [
    {
      id: 'birampur',
      name: 'Birampur Area (Awash Melka)',
      lat: 8.8532,
      lng: 39.0211,
      status: 'DANGER',
      adc_value: 924,
      gpio_led: true,
      gpio_buzzer: true,
      is_online: true,
      siphon_active: true,
      metrics: {
        timestamp: now,
        height_cm: 231.0,
        climbing_velocity_cms: 14.2,
        tensile_stress_pa: 685.0,
        apparent_viscosity_pas: 48.0,
      },
      history: generateInitialHistory(231.0, 14.2, 685.0, 48.0, 'DANGER')
    },
    {
      id: 'sundarganj',
      name: 'Sundarganj Station (Adama)',
      lat: 8.5412,
      lng: 39.2783,
      status: 'WARNING',
      adc_value: 685,
      gpio_led: true,
      gpio_buzzer: false,
      is_online: true,
      siphon_active: true,
      metrics: {
        timestamp: now,
        height_cm: 171.25,
        climbing_velocity_cms: 8.5,
        tensile_stress_pa: 420.0,
        apparent_viscosity_pas: 85.0,
      },
      history: generateInitialHistory(171.25, 8.5, 420.0, 85.0, 'WARNING')
    },
    {
      id: 'chirbandar',
      name: 'Chirbandar Station (Modjo)',
      lat: 8.6015,
      lng: 39.1245,
      status: 'SAFE',
      adc_value: 412,
      gpio_led: false,
      gpio_buzzer: false,
      is_online: true,
      siphon_active: false,
      metrics: {
        timestamp: now,
        height_cm: 103.0,
        climbing_velocity_cms: 1.2,
        tensile_stress_pa: 85.0,
        apparent_viscosity_pas: 145.0,
      },
      history: generateInitialHistory(103.0, 1.2, 85.0, 145.0, 'SAFE')
    },
    {
      id: 'phulbari',
      name: 'Phulbari Station (Koka)',
      lat: 8.4329,
      lng: 39.0912,
      status: 'SAFE',
      adc_value: 215,
      gpio_led: false,
      gpio_buzzer: false,
      is_online: true,
      siphon_active: false,
      metrics: {
        timestamp: now,
        height_cm: 53.75,
        climbing_velocity_cms: 0.5,
        tensile_stress_pa: 45.0,
        apparent_viscosity_pas: 155.0,
      },
      history: generateInitialHistory(53.75, 0.5, 45.0, 155.0, 'SAFE')
    },
    {
      id: 'kaharole',
      name: 'Kaharole Station (Welenchiti)',
      lat: 8.7845,
      lng: 39.4421,
      status: 'SAFE',
      adc_value: 301,
      gpio_led: false,
      gpio_buzzer: false,
      is_online: true,
      siphon_active: false,
      metrics: {
        timestamp: now,
        height_cm: 75.25,
        climbing_velocity_cms: 0.8,
        tensile_stress_pa: 62.0,
        apparent_viscosity_pas: 150.0,
      },
      history: generateInitialHistory(75.25, 0.8, 62.0, 150.0, 'SAFE')
    }
  ];
};

/** Generates dummy starting historical data for smooth initial graphs */
function generateInitialHistory(
  h: number,
  v: number,
  s: number,
  vi: number,
  status: StationStatus
): FluidTelemetryEntry[] {
  const history: FluidTelemetryEntry[] = [];
  const baseTime = Date.now() - 30 * 1000 * 500; // 30 frames ago
  
  for (let i = 0; i < 30; i++) {
    const timestamp = new Date(baseTime + i * 500).toISOString();
    const ratio = i / 30;
    
    // Smooth interpolations
    const height_cm = h * (0.8 + ratio * 0.2) + generateNoise(1);
    const climbing_velocity_cms = status === 'SAFE' 
      ? v * ratio + generateNoise(0.1) 
      : v * (0.7 + ratio * 0.3) + generateNoise(0.5);
    const tensile_stress_pa = s * (0.8 + ratio * 0.2) + generateNoise(5);
    const apparent_viscosity_pas = vi * (1.2 - ratio * 0.2) + generateNoise(2);
    
    history.push({
      timestamp,
      height_cm: parseFloat(height_cm.toFixed(2)),
      climbing_velocity_cms: parseFloat(climbing_velocity_cms.toFixed(2)),
      tensile_stress_pa: parseFloat(tensile_stress_pa.toFixed(2)),
      apparent_viscosity_pas: parseFloat(apparent_viscosity_pas.toFixed(2)),
    });
  }
  return history;
}

/** Ticks the non-Newtonian simulation forward for a single station node */
export function tickStation(
  station: PilotStation,
  forceCrash: boolean
): PilotStation {
  const now = new Date().toISOString();
  const last = station.metrics;
  const history = station.history;

  let nextHeight = last.height_cm;
  let nextVelocity = last.climbing_velocity_cms;
  let nextStress = last.tensile_stress_pa;
  let nextViscosity = last.apparent_viscosity_pas;
  let siphonActive = station.siphon_active;
  let status: StationStatus = 'SAFE';

  // Handle crash/cohesion collapse
  const isCrashed = last.tensile_stress_pa === 0 || forceCrash || last.height_cm > 280.0 || (station.id === 'birampur' && forceCrash);
  
  if (isCrashed && last.tensile_stress_pa !== 0) {
    // Structural Snap
    nextHeight = Math.max(2.0, last.height_cm * 0.08 + generateNoise(0.5));
    nextVelocity = -12.0 + generateNoise(1);
    nextStress = 0.0;
    nextViscosity = 220.0 + generateNoise(5);
    siphonActive = false;
    status = 'DANGER';
  } else if (last.tensile_stress_pa === 0) {
    // Remain collapsed until reset
    nextHeight = Math.max(1.0, last.height_cm * 0.9 + generateNoise(0.2));
    nextVelocity = 0.0;
    nextStress = 0.0;
    nextViscosity = 220.0 + generateNoise(2);
    siphonActive = false;
    status = 'DANGER';
  } else {
    // Normal Physical State machine
    // Station properties dictate baseline behavior
    if (station.id === 'birampur') {
      // High-activity danger node
      nextVelocity = Math.max(8.0, last.climbing_velocity_cms + 0.6 + generateNoise(0.4));
      nextHeight = Math.min(270, last.height_cm + (nextVelocity * 0.4) + generateNoise(1.2));
      nextViscosity = Math.max(15.0, 100.0 - (nextVelocity * 1.5) + generateNoise(2));
      nextStress = last.tensile_stress_pa + (nextVelocity * 2.5) + generateNoise(5);
      siphonActive = true;
      status = nextStress > 600 ? 'DANGER' : 'WARNING';
    } else if (station.id === 'sundarganj') {
      // Moderate warnings
      nextVelocity = Math.max(4.0, last.climbing_velocity_cms + 0.2 + generateNoise(0.3));
      nextHeight = Math.min(200, last.height_cm + (nextVelocity * 0.35) + generateNoise(1.0));
      nextViscosity = Math.max(30.0, 130.0 - (nextVelocity * 1.8) + generateNoise(3));
      nextStress = last.tensile_stress_pa + (nextVelocity * 1.8) + generateNoise(4);
      siphonActive = true;
      status = nextStress > 500 ? 'DANGER' : nextStress > 300 ? 'WARNING' : 'SAFE';
    } else {
      // Safe stable nodes (chirbandar, phulbari, kaharole)
      // Height builds up slowly, maintains safe levels
      if (last.height_cm > 120.0) {
        // Natural equilibrium
        nextVelocity = Math.max(0.5, last.climbing_velocity_cms - 0.5 + generateNoise(0.2));
        nextHeight = last.height_cm + generateNoise(0.5);
        nextStress = Math.max(40, last.tensile_stress_pa - 5 + generateNoise(2));
        nextViscosity = Math.min(200, last.apparent_viscosity_pas + 2 + generateNoise(1));
      } else {
        nextVelocity = 0.8 + generateNoise(0.1);
        nextHeight = last.height_cm + 1.5 + generateNoise(0.5);
        nextStress = 40 + (nextHeight * 0.4) + generateNoise(1);
        nextViscosity = Math.max(100.0, 160.0 - (nextHeight * 0.1));
      }
      siphonActive = nextHeight > 50.0;
      status = 'SAFE';
    }
  }

  // Round metrics for telemetry display
  const newMetrics: FluidTelemetryEntry = {
    timestamp: now,
    height_cm: parseFloat(nextHeight.toFixed(2)),
    climbing_velocity_cms: parseFloat(nextVelocity.toFixed(2)),
    tensile_stress_pa: parseFloat(nextStress.toFixed(2)),
    apparent_viscosity_pas: parseFloat(nextViscosity.toFixed(2)),
  };

  // Scaled ADC Level (0-1023)
  const adcValue = Math.min(1023, Math.max(0, Math.round(newMetrics.height_cm * 4)));

  // GPIO hardware implied logic gates
  // Trigger LED if ADC exceeds 600
  const gpioLed = adcValue > 600;
  // Trigger Buzzer if stress exceeds 500 Pa
  const gpioBuzzer = newMetrics.tensile_stress_pa > 500;

  return {
    ...station,
    status,
    adc_value: adcValue,
    gpio_led: gpioLed,
    gpio_buzzer: gpioBuzzer,
    siphon_active: siphonActive,
    metrics: newMetrics,
    history: [...history, newMetrics].slice(-50), // Cap timeline history at 50 frames
  };
}

/** Loops through and ticks all stations, maintaining sync */
export function tickAllStations(
  previousState: AntiGravityDashboardState,
  forceCrashActiveNode: boolean
): AntiGravityDashboardState {
  const activeId = previousState.active_station_id;
  
  const updatedStations = previousState.stations.map((st) => {
    const shouldCrash = st.id === activeId ? forceCrashActiveNode : false;
    return tickStation(st, shouldCrash);
  });

  const activeStation = updatedStations.find((st) => st.id === activeId) || updatedStations[0];

  // Synchronize global telemetry values for backward-compatibility with components expecting single values
  return {
    ...previousState,
    stations: updatedStations,
    current_metrics: activeStation.metrics,
    is_siphon_active: activeStation.siphon_active,
    flow_regime: activeStation.status === 'DANGER' ? 'COHESION_FAILURE' : activeStation.siphon_active ? 'STABLE_SIPHON' : 'STAGNANT',
    historical_stream: activeStation.history,
  };
}

import React, { useState, useEffect, useRef } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DashboardPayload } from '../types';

interface IoTPanelProps {
  payload: DashboardPayload | null;
  activeStationId: string;
  setActiveStationId: (id: string) => void;
}

interface GPIOPin {
  pinNumber: number;
  label: string;
  type: 'POWER' | 'GND' | 'ADC' | 'GPIO' | 'SPI' | 'I2C' | 'UART' | 'SYSTEM';
  direction: 'IN' | 'OUT' | 'BIDIR' | 'NC';
  state: 'HIGH' | 'LOW' | 'ANALOG' | 'NC';
  description: string;
}

interface ADCTrack {
  channel: string;
  gpio: string;
  role: string;
  rawValue: number;
  attenuation: string;
  description: string;
}

export const IoTPanel: React.FC<IoTPanelProps> = ({
  payload,
  activeStationId,
  setActiveStationId,
}) => {
  const activeStation = payload?.nodes.find((s) => s.id === activeStationId) || payload?.nodes[0];
  const activeStationName = activeStation?.name || 'NODE-ALPHA-1';

  // Dynamic parameters based on active station and time to simulate activity
  const [vref, setVref] = useState<number>(3.3);
  const [selectedPin, setSelectedPin] = useState<GPIOPin | null>(null);
  const [serialLogs, setSerialLogs] = useState<string[]>([]);
  const [pingRate, setPingRate] = useState<number>(22);
  const [packetLoss, setPacketLoss] = useState<number>(0.0);
  const [timeCounter, setTimeCounter] = useState<number>(0);
  const serialEndRef = useRef<HTMLDivElement | null>(null);

  // FreeRTOS Task list tracking active threads on ESP32
  const freeRTOSTasks = [
    { name: 'LoRaTask', priority: 5, state: 'Running', stackRemaining: '1,420 B', cpuLoad: '42%' },
    { name: 'SensorsTask', priority: 4, state: 'Blocked', stackRemaining: '2,140 B', cpuLoad: '18%' },
    { name: 'SystemMonitor', priority: 1, state: 'Ready', stackRemaining: '890 B', cpuLoad: '5%' },
    { name: 'WiFiTask', priority: 2, state: 'Suspended', stackRemaining: '3,840 B', cpuLoad: '0%' },
    { name: 'IDLE', priority: 0, state: 'Ready', stackRemaining: '512 B', cpuLoad: '35%' },
  ];

  // 1. ESP32 Pin Breakdown list
  const leftPins: GPIOPin[] = [
    { pinNumber: 1, label: '3V3', type: 'POWER', direction: 'NC', state: 'HIGH', description: '3.3V Regulated Output VCC' },
    { pinNumber: 2, label: 'EN', type: 'SYSTEM', direction: 'IN', state: 'HIGH', description: 'CHIP_PU Enable / Reset Pin (Pull-up)' },
    { pinNumber: 3, label: 'G36', type: 'ADC', direction: 'IN', state: 'ANALOG', description: 'ADC1_CH0 / SENS_VP / Battery In' },
    { pinNumber: 4, label: 'G39', type: 'ADC', direction: 'IN', state: 'ANALOG', description: 'ADC1_CH3 / SENS_VN / Solar Sensor' },
    { pinNumber: 5, label: 'G34', type: 'ADC', direction: 'IN', state: 'ANALOG', description: 'ADC1_CH6 / Analog Water Transducer' },
    { pinNumber: 6, label: 'G35', type: 'ADC', direction: 'IN', state: 'ANALOG', description: 'ADC1_CH7 / Analog Rain Sensor' },
    { pinNumber: 7, label: 'G32', type: 'GPIO', direction: 'BIDIR', state: 'LOW', description: 'GPIO32 / XTAL_32K_P / LED Status' },
    { pinNumber: 8, label: 'G33', type: 'GPIO', direction: 'OUT', state: 'HIGH', description: 'GPIO33 / XTAL_32K_N / Transceiver CS' },
    { pinNumber: 9, label: 'G25', type: 'GPIO', direction: 'IN', state: 'LOW', description: 'GPIO25 / DAC_1 / LoRa IRQ Interrupt' },
    { pinNumber: 10, label: 'G26', type: 'GPIO', direction: 'OUT', state: 'HIGH', description: 'GPIO26 / DAC_2 / LoRa Reset Line' },
    { pinNumber: 11, label: 'G27', type: 'GPIO', direction: 'NC', state: 'NC', description: 'GPIO27 / ADC2_CH7 / Touch9 (Available)' },
    { pinNumber: 12, label: 'G14', type: 'SPI', direction: 'OUT', state: 'HIGH', description: 'GPIO14 / HSPI_CLK / LoRa SCK Line' },
    { pinNumber: 13, label: 'G12', type: 'SPI', direction: 'IN', state: 'LOW', description: 'GPIO12 / HSPI_MISO / LoRa MISO Line' },
    { pinNumber: 14, label: 'G13', type: 'SPI', direction: 'OUT', state: 'HIGH', description: 'GPIO13 / HSPI_MOSI / LoRa MOSI Line' },
    { pinNumber: 15, label: 'GND', type: 'GND', direction: 'NC', state: 'NC', description: 'Common Reference Ground Pin' },
    { pinNumber: 16, label: 'G23', type: 'GPIO', direction: 'NC', state: 'NC', description: 'GPIO23 / VSPI_ID / Core Interrupt (Unused)' },
    { pinNumber: 17, label: 'G22', type: 'I2C', direction: 'BIDIR', state: 'HIGH', description: 'GPIO22 / I2C_SCL / Barometric SCL Clock' },
    { pinNumber: 18, label: 'TX0', type: 'UART', direction: 'OUT', state: 'HIGH', description: 'GPIO1 / U0TXD / Serial Console Log TX' },
    { pinNumber: 19, label: 'RX0', type: 'UART', direction: 'IN', state: 'HIGH', description: 'GPIO3 / U0RXD / Serial Console Log RX' },
  ];

  const rightPins: GPIOPin[] = [
    { pinNumber: 20, label: 'GND', type: 'GND', direction: 'NC', state: 'NC', description: 'Common Reference Ground Pin' },
    { pinNumber: 21, label: 'G21', type: 'I2C', direction: 'BIDIR', state: 'HIGH', description: 'GPIO21 / I2C_SDA / Barometric SDA Data' },
    { pinNumber: 22, label: 'RX2', type: 'UART', direction: 'IN', state: 'HIGH', description: 'GPIO16 / U2RXD / Secondary GPS RX' },
    { pinNumber: 23, label: 'TX2', type: 'UART', direction: 'OUT', state: 'HIGH', description: 'GPIO17 / U2TXD / Secondary GPS TX' },
    { pinNumber: 24, label: 'G19', type: 'GPIO', direction: 'NC', state: 'NC', description: 'GPIO19 / VSPI_MISO / Core Debug Line' },
    { pinNumber: 25, label: 'G18', type: 'GPIO', direction: 'NC', state: 'NC', description: 'GPIO18 / VSPI_SCK / Core Debug Clock' },
    { pinNumber: 26, label: 'G5', type: 'GPIO', direction: 'OUT', state: 'LOW', description: 'GPIO5 / VSPI_CS0 / Alert Siren Trigger' },
    { pinNumber: 27, label: 'G17', type: 'GPIO', direction: 'NC', state: 'NC', description: 'GPIO17 / Secondary Core Clock' },
    { pinNumber: 28, label: 'G16', type: 'GPIO', direction: 'NC', state: 'NC', description: 'GPIO16 / Secondary Core Interconnect' },
    { pinNumber: 29, label: 'G4', type: 'GPIO', direction: 'OUT', state: 'LOW', description: 'GPIO4 / ADC2_CH0 / Solenoid Control' },
    { pinNumber: 30, label: 'G0', type: 'SYSTEM', direction: 'IN', state: 'HIGH', description: 'GPIO0 / BOOT Pin (Hold to Enter Flash Mode)' },
    { pinNumber: 31, label: 'G2', type: 'GPIO', direction: 'OUT', state: 'LOW', description: 'GPIO2 / ADC2_CH2 / WiFi Network LED Indicator' },
    { pinNumber: 32, label: 'G15', type: 'GPIO', direction: 'OUT', state: 'HIGH', description: 'GPIO15 / MTDO / SPI Slave Select' },
    { pinNumber: 33, label: 'G8', type: 'GPIO', direction: 'NC', state: 'NC', description: 'GPIO8 / SD_DATA_1 / SD Card Data' },
    { pinNumber: 34, label: 'G7', type: 'GPIO', direction: 'NC', state: 'NC', description: 'GPIO7 / SD_DATA_0 / SD Card Data' },
    { pinNumber: 35, label: 'G6', type: 'GPIO', direction: 'NC', state: 'NC', description: 'GPIO6 / SD_CLK / SD Card SPI Clock' },
    { pinNumber: 36, label: 'G11', type: 'GPIO', direction: 'NC', state: 'NC', description: 'GPIO11 / SD_CMD / SD Card Command' },
    { pinNumber: 37, label: 'G10', type: 'GPIO', direction: 'NC', state: 'NC', description: 'GPIO10 / SD_DATA_3 / SD Card Channel' },
    { pinNumber: 38, label: '5V', type: 'POWER', direction: 'NC', state: 'HIGH', description: '5V Input Power Line (VBUS USB)' },
  ];

  // 2. Simulated real-time RF signal metrics chart over time
  const [rfData, setRfData] = useState<{ time: string; rssi: number; snr: number; per: number }[]>([]);

  // 3. Dynamic ADC Raw Values calculated from active station levels
  const wlCm = activeStation?.waterLevelCm || 0;
  const rainMm = activeStation?.rainfallRateMm || 0;
  const batV = activeStation?.batteryLevel ? (activeStation.batteryLevel * 0.042) : 3.72; // Convert 0-100 to 0-4.2V scale

  // Compute Raw 12-bit ADC registers (0 - 4095)
  // Formula: Raw = (V_in / Vref) * 4095
  const batteryRawAdc = Math.min(4095, Math.max(0, Math.round(((batV / 2) / vref) * 4095))); // 1/2 battery divider circuit
  const waterRawAdc = Math.min(4095, Math.max(0, Math.round(((wlCm / 500) * 3.0 / vref) * 4095))); // transducer scaled to 3.0V max
  const rainRawAdc = Math.min(4095, Math.max(0, Math.round(((rainMm / 20.0) * 2.8 / vref) * 4095))); // rain gauge scaled to 2.8V max
  const solarRawAdc = Math.min(4095, Math.max(0, Math.round((2.45 / vref) * 4095))); // static solar charging reference value

  const adcTracks: ADCTrack[] = [
    { channel: 'ADC1_CH0', gpio: 'GPIO36', role: 'Solar Battery Level V', rawValue: batteryRawAdc, attenuation: '11 dB', description: 'Measures battery stack via 100kΩ voltage divider' },
    { channel: 'ADC1_CH3', gpio: 'GPIO39', role: 'Solar Panel Load V', rawValue: solarRawAdc, attenuation: '11 dB', description: 'Tracks solar panel energy production load' },
    { channel: 'ADC1_CH6', gpio: 'GPIO34', role: 'Water Level Transducer', rawValue: waterRawAdc, attenuation: '11 dB', description: 'Reads hydrostatic pressure water transducer' },
    { channel: 'ADC1_CH7', gpio: 'GPIO35', role: 'Tipping Rain Gauge', rawValue: rainRawAdc, attenuation: '11 dB', description: 'Monitors precipitation density interface' },
  ];

  // Helper function to calculate Voltage in real-time based on current VRef and raw value
  const calcVoltage = (raw: number, atten: string) => {
    const dividerFactor = atten === '11 dB' ? 3.55 : 1; // 11dB attenuation stretches input range to ~3.55 * vref/3.3
    const calculated = (raw / 4095) * vref * dividerFactor;
    return calculated.toFixed(2);
  };

  // 4. Generate dynamic serial logs stream representing active node states
  useEffect(() => {
    // Generate immediate boot sequence on active node switch
    const timestamp = () => `[${new Date().toLocaleTimeString([], { hour12: false })}]`;
    
    const initialLogs = [
      `${timestamp()} 🖥️ [ESP32-CORE] Booting system core... Chip Revision: ESP32-D0WDQ6-v3`,
      `${timestamp()} 🖥️ [ESP32-CORE] Flash Size: 4MB (SPIFFS enabled), Clock speed: 240MHz`,
      `${timestamp()} 🔌 [POWER] Power Source: Solar + Li-Po cell. Battery voltage: ${batV.toFixed(2)}V`,
      `${timestamp()} 🧠 [HEAP] Memory Initialized. Free internal SRAM: 218.42 KB`,
      `${timestamp()} 📶 [LORA-MESH] Initializing RFM95W Transceiver Module...`,
      `${timestamp()} 📶 [LORA-MESH] Bandwidth: 125kHz | Coding Rate: 4/5 | SF: 7 | Freq: 868.1 MHz`,
      `${timestamp()} 🛰️ [LORA-MESH] LoRa client linked to Awash Basin gateway pool (Node ID: ${activeStationId})`,
      `${timestamp()} 🩺 [CALIBRATION] ADC dynamic calibrations completed. Attenuation: 11dB | Vref: ${vref.toFixed(2)}V`,
      `${timestamp()} 📊 [SENSORS] Polling hydrostatic water transducer: ${wlCm.toFixed(1)} cm | rain gauge: ${rainMm.toFixed(1)} mm/h`,
      `${timestamp()} 📡 [WS-RELAY] Asynchronous post generated... Code 201 (Payload synced to Neon database)`,
      `${timestamp()} 😴 [DEEP-SLEEP] Active cycle finished. Entering Light Sleep for 15 seconds...`
    ];

    setSerialLogs(initialLogs);

    // Seed initial signal charts
    const initialRF = Array.from({ length: 8 }, (_, i) => {
      const noise = Math.random() * 4 - 2;
      const baseRSSI = activeStationId === 'NODE-ALPHA-1' ? -65 : activeStationId === 'NODE-BETA-2' ? -78 : -92;
      return {
        time: `${i * 15}s ago`,
        rssi: baseRSSI + Math.round(noise),
        snr: Math.round(8.5 + noise / 2),
        per: Math.max(0, 0.2 + (noise * 0.1)),
      };
    });
    setRfData(initialRF);
    
    setSelectedPin(leftPins[0]); // default select Pin 1
  }, [activeStationId]);

  // Periodic scrolling serial logger
  useEffect(() => {
    const logInterval = setInterval(() => {
      setTimeCounter(prev => prev + 1);
      const timestamp = () => `[${new Date().toLocaleTimeString([], { hour12: false })}]`;
      
      // Calculate dynamic simulated noise
      const noiseVal = Math.random() * 6 - 3;
      const currentWl = Math.max(0, wlCm + noiseVal);
      const currentRain = Math.max(0, rainMm + Math.random() * 0.4);

      // Generate signal metrics
      const baseRSSI = activeStationId === 'NODE-ALPHA-1' ? -65 : activeStationId === 'NODE-BETA-2' ? -78 : -92;
      const computedRSSI = baseRSSI + Math.round(noiseVal);
      const computedSNR = Math.round(9.2 + noiseVal / 3);
      const computedPER = computedRSSI < -90 ? 1.4 : computedRSSI < -75 ? 0.4 : 0.05;

      setRfData(prev => {
        const next = [...prev.slice(1), {
          time: 'Now',
          rssi: computedRSSI,
          snr: computedSNR,
          per: computedPER
        }];
        return next.map((d, index) => {
          if (index === next.length - 1) return d;
          return { ...d, time: `${(next.length - 1 - index) * 15}s ago` };
        });
      });

      // Update active console logs dynamically
      const logOptions = [
        `${timestamp()} 🔌 [POWER] Solar Stack: ${batV.toFixed(2)}V | Load current: 1.42W (Charging)`,
        `${timestamp()} 📊 [SENSORS] ADC Channel [GPIO34]: Read raw bits ${waterRawAdc} (${calcVoltage(waterRawAdc, '11 dB')}V) -> correlated water level: ${currentWl.toFixed(1)} cm`,
        `${timestamp()} 📊 [SENSORS] ADC Channel [GPIO35]: Read raw bits ${rainRawAdc} (${calcVoltage(rainRawAdc, '11 dB')}V) -> rain rate: ${currentRain.toFixed(1)} mm/h`,
        `${timestamp()} 🧠 [SYS-MON] CPU core temp: ${(38.2 + Math.random()).toFixed(1)}°C | Uptime: ${(12500 + timeCounter * 15)} ticks`,
        `${timestamp()} 📶 [LORA-MESH] RSSI: ${computedRSSI} dBm | SNR: ${computedSNR} dB | Tx Status: Success`,
        `${timestamp()} 📡 [RELAY-POST] Dispatched packet payload: node_id=${activeStationId}, wl=${currentWl.toFixed(1)}cm, rain=${currentRain.toFixed(1)}mm/h`,
        `${timestamp()} 💤 [DEEP-SLEEP] Node successfully entering scheduled sleep cycles. (Active power consumption drops to 15µA)`,
        `${timestamp()} ⏰ [WAKE-SOURCE] Wakeup triggered by: RTC_TIMER_INTERRUPT | Free stack margin: 184 KB`
      ];

      const newLog = logOptions[Math.floor(Math.random() * logOptions.length)];
      setSerialLogs(prev => [...prev.slice(-35), newLog]);
      
      // Update pings
      setPingRate(Math.round(22 + Math.random() * 6 - 3));
      setPacketLoss(computedPER);

    }, 3000);

    return () => clearInterval(logInterval);
  }, [activeStationId, wlCm, rainMm, batV, vref, timeCounter]);

  // Handle auto-scroll of console log to bottom
  useEffect(() => {
    serialEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [serialLogs]);

  // Help style pins color code
  const getPinColor = (type: string) => {
    switch (type) {
      case 'POWER': return 'bg-red-500/10 text-red-400 border-red-500/30 shadow-[0_0_8px_rgba(239,68,68,0.15)]';
      case 'GND': return 'bg-slate-800 text-slate-400 border-slate-700';
      case 'ADC': return 'bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-[0_0_8px_rgba(245,158,11,0.15)]';
      case 'GPIO': return 'bg-purple-500/10 text-purple-400 border-purple-500/30 shadow-[0_0_8px_rgba(168,85,247,0.15)]';
      case 'SPI': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 shadow-[0_0_8px_rgba(34,211,238,0.15)]';
      case 'I2C': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30 shadow-[0_0_8px_rgba(99,102,241,0.15)]';
      case 'UART': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.15)]';
      default: return 'bg-slate-900 text-slate-500 border-slate-800';
    }
  };


  return (
    <div className="space-y-8 animate-hologram">
      
      {/* 1. Header Bar */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pb-5 border-b border-white/5 relative">
        <div className="absolute bottom-0 left-0 w-24 h-0.5 bg-gradient-to-r from-purple-500 to-cyan-400"></div>
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[10px] font-black uppercase text-purple-400 tracking-widest font-mono bg-purple-500/10 border border-purple-500/20 px-3.5 py-1 rounded-full">
              🔌 INTEGRATED CIRCUIT DIAGNOSTICS
            </span>
            <span className="text-[10px] font-black uppercase text-cyan-400 tracking-widest font-mono bg-cyan-500/10 border border-cyan-500/20 px-3.5 py-1 rounded-full">
              ESP32 SYSTEM DIAG
            </span>
            <span className="text-[10px] font-black text-slate-400 tracking-widest font-mono bg-white/5 border border-white/10 px-3 py-1 rounded-full">
              CORE VOLTAGE: 3.30V
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight bg-gradient-to-r from-slate-50 via-slate-100 to-indigo-300 bg-clip-text text-transparent mt-3.5">
            IoT Edge System Console
          </h1>
          <p className="text-slate-400 mt-1.5 text-sm font-semibold tracking-wide">
            Live Embedded Microcontroller Core Diagnostics — <span className="font-mono text-cyan-400 text-glow-cyan font-bold">{activeStationName}</span>
          </p>
        </div>

        {/* System Vitals Indicators */}
        <div className="flex items-center gap-6">
          <div className="hidden sm:flex flex-col text-right font-mono text-[10px] text-slate-500 leading-snug">
            <span className="font-bold text-slate-400 uppercase tracking-widest">LoRa Link Speed</span>
            <span className="text-cyan-400 font-extrabold text-xs text-glow-cyan mt-0.5">{pingRate} ms (CONNECTED)</span>
          </div>

          <div className="flex items-center gap-3 bg-[#060a16] border border-purple-500/20 px-5 py-3.5 rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.5)] backdrop-blur-md">
            <div className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500 shadow-[0_0_8px_rgba(34,211,238,0.8)]"></span>
            </div>
            <span className="text-[10px] font-mono font-black tracking-widest text-slate-350 uppercase shrink-0">
              TELEMETRY DENSE MODE
            </span>
          </div>
        </div>
      </div>

      {/* 2. Selection grid & Spec card */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Node selector & active hardware specifications */}
        <div className="xl:col-span-1 glass-panel rounded-3xl p-7 flex flex-col justify-between min-h-[300px]">
          <div>
            <h2 className="text-lg font-extrabold text-slate-100 tracking-wide uppercase">Node Selector</h2>
            <p className="text-xs text-slate-500 mt-1.5 font-bold uppercase tracking-widest font-mono mb-4">Choose an active edge board to inspect</p>
            
            <div className="flex flex-wrap gap-2.5 mb-6">
              {payload?.nodes.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActiveStationId(s.id)}
                  className={`px-4.5 py-3 rounded-xl text-xs font-black border transition-all duration-300 uppercase tracking-widest active:scale-95 flex items-center gap-2
                    ${activeStationId === s.id
                      ? 'bg-gradient-to-r from-purple-600/20 to-cyan-500/10 border-cyan-500/40 text-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.15)]'
                      : 'bg-[#030610] border-white/5 text-slate-400 hover:text-slate-200 hover:border-purple-500/20'}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${s.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-500'}`}></span>
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-[#030610]/80 border border-purple-500/10 rounded-2.5xl p-5 space-y-4">
            <h3 className="text-xs font-black text-purple-400 tracking-widest uppercase font-mono">Microcontroller Specs</h3>
            
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-slate-500">MCU:</span>
                <span className="text-slate-350 font-bold">ESP32-D0WDQ6-V3</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-slate-500">CPU Clock:</span>
                <span className="text-slate-350 font-bold">240 MHz (Dual-Core)</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-slate-500">Flash Size:</span>
                <span className="text-slate-350 font-bold">4 MB (SPIFFS Ext)</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-slate-500">LoRa RF Module:</span>
                <span className="text-cyan-400 font-bold text-glow-cyan">RFM95W (868MHz)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Firmware:</span>
                <span className="text-purple-400 font-bold">SFEWS-v4.2.1-ASTU</span>
              </div>
            </div>
          </div>
        </div>

        {/* High-Fidelity Diagnostic gauges (Solar battery, solar watts, temperatures) */}
        <div className="xl:col-span-2 glass-panel rounded-3xl p-7 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-slate-100 tracking-wide uppercase">Core Power & Environment</h2>
            <p className="text-xs text-slate-500 mt-1.5 font-bold uppercase tracking-widest font-mono">Real-time solar panel and battery stack telemetry</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 my-6">
            
            {/* Battery state of charge */}
            <div className="bg-[#030610] border border-purple-500/10 p-5 rounded-2.5xl flex flex-col justify-between hover:border-purple-500/20 transition-all">
              <div className="flex justify-between items-start">
                <span className="text-[10px] text-slate-550 font-extrabold uppercase tracking-widest font-mono">SOLAR BATTERY</span>
                <span className="px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/25 text-[8px] font-mono text-cyan-400 rounded-md">LI-PO CELL</span>
              </div>
              <div className="my-4">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-4xl font-mono font-black text-cyan-400 text-glow-cyan">{batV.toFixed(2)}</span>
                  <span className="text-xs text-slate-500 font-bold uppercase font-sans">Volts</span>
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mt-1.5">Charge State: {activeStation?.batteryLevel || 84}%</p>
              </div>
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-500 to-cyan-400" style={{ width: `${activeStation?.batteryLevel || 84}%` }}></div>
              </div>
            </div>

            {/* Solar load energy */}
            <div className="bg-[#030610] border border-purple-500/10 p-5 rounded-2.5xl flex flex-col justify-between hover:border-purple-500/20 transition-all">
              <div className="flex justify-between items-start">
                <span className="text-[10px] text-slate-550 font-extrabold uppercase tracking-widest font-mono">SOLAR LOAD</span>
                <span className="px-2 py-0.5 bg-purple-500/10 border border-purple-500/25 text-[8px] font-mono text-purple-400 rounded-md">PV PANEL</span>
              </div>
              <div className="my-4">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-4xl font-mono font-black text-slate-100">1.45</span>
                  <span className="text-xs text-slate-500 font-bold uppercase font-sans">Watts</span>
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mt-1.5">Efficiency Rating: 94.2%</p>
              </div>
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 w-[65%]"></div>
              </div>
            </div>

            {/* MCU Core Temperature */}
            <div className="bg-[#030610] border border-purple-500/10 p-5 rounded-2.5xl flex flex-col justify-between hover:border-purple-500/20 transition-all">
              <div className="flex justify-between items-start">
                <span className="text-[10px] text-slate-550 font-extrabold uppercase tracking-widest font-mono">MCU TEMP</span>
                <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/25 text-[8px] font-mono text-emerald-400 rounded-md">INTERNAL SENS</span>
              </div>
              <div className="my-4">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-4xl font-mono font-black text-emerald-400 text-glow-emerald">38.6</span>
                  <span className="text-xs text-slate-500 font-bold uppercase font-sans">°C</span>
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mt-1.5">Silicon Core: STABLE</p>
              </div>
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500/30" style={{ width: '38.6%' }}></div>
              </div>
            </div>

          </div>

          <div className="border-t border-white/5 pt-4 text-[9px] font-mono text-slate-550 uppercase font-black flex justify-between tracking-wider">
            <span>Uptime Boot count: 18 reboots</span>
            <span>Uptime Session: 14h 22m 18s (Ready)</span>
          </div>
        </div>
      </div>

      {/* 3. Middle grid: Interactive GPIO pins breakout flanked by detailed descriptions */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Left column: Selected PIN registers */}
        <div className="xl:col-span-1 glass-panel rounded-3xl p-7 flex flex-col justify-between min-h-[440px]">
          <div>
            <h2 className="text-lg font-extrabold text-slate-100 tracking-wide uppercase">GPIO Debug Matrix</h2>
            <p className="text-xs text-slate-500 mt-1.5 font-bold uppercase tracking-widest font-mono mb-6">Select a pin on the board layout to examine registers</p>
          </div>

          {selectedPin ? (
            <div className="bg-[#030610]/90 border border-purple-500/15 rounded-2.5xl p-5 space-y-5 animate-in fade-in duration-300">
              <div className="flex justify-between items-center border-b border-white/5 pb-3">
                <div>
                  <h3 className="text-base font-black text-slate-100 font-mono">{selectedPin.label}</h3>
                  <span className="text-[9px] text-slate-500 font-bold tracking-widest uppercase font-mono">Pin Index #{selectedPin.pinNumber}</span>
                </div>
                <span className={`px-3 py-1 rounded-lg border text-[9px] font-black uppercase tracking-widest font-mono ${getPinColor(selectedPin.type)}`}>
                  {selectedPin.type}
                </span>
              </div>

              <div className="space-y-2 text-xs leading-relaxed font-mono">
                <div>
                  <span className="text-slate-500 block text-[9.5px] uppercase tracking-wider font-sans font-bold">Signal role</span>
                  <p className="text-slate-200 font-bold">{selectedPin.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <span className="text-slate-500 block text-[9.5px] uppercase tracking-wider font-sans font-bold">Direction</span>
                    <p className="text-cyan-400 font-bold">{selectedPin.direction}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9.5px] uppercase tracking-wider font-sans font-bold">Logic Level</span>
                    <p className={`font-bold ${selectedPin.state === 'HIGH' ? 'text-emerald-400 text-glow-emerald' : selectedPin.state === 'LOW' ? 'text-red-400' : 'text-amber-400'}`}>
                      {selectedPin.state}
                    </p>
                  </div>
                </div>
                <div className="pt-2">
                  <span className="text-slate-500 block text-[9.5px] uppercase tracking-wider font-sans font-bold">Register debug</span>
                  <span className="px-2 py-0.5 bg-slate-900 border border-slate-800 rounded font-mono text-[10px] text-slate-350 mt-1 block">
                    {selectedPin.type === 'GND' 
                      ? 'GND_BUS_REG: 0x00000000' 
                      : selectedPin.state === 'HIGH' 
                      ? 'GPIO_OUT_W1TS_REG: 0x00000001 (BIT_HIGH)' 
                      : 'GPIO_OUT_W1TC_REG: 0x00000000 (BIT_LOW)'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#030610]/50 border border-white/5 rounded-2.5xl p-5 text-center flex flex-col justify-center items-center py-12 text-slate-500 font-mono text-xs">
              <svg className="w-10 h-10 opacity-20 mb-3 animate-pulse text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Choose any GPIO pin mapping to start tracking register status
            </div>
          )}

          <div className="text-[10px] text-purple-400/80 font-bold tracking-widest uppercase font-mono border-t border-white/5 pt-3.5">
            ⚡ GPIO reference: devkitc breakout
          </div>
        </div>

        {/* Center column: Visual ESP32 Chip layout */}
        <div className="xl:col-span-2 glass-panel rounded-3xl p-7 flex flex-col items-center justify-between min-h-[500px] relative">
          <div className="absolute top-0 right-1/4 w-[50%] h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent"></div>
          
          <div className="text-center w-full">
            <h2 className="text-lg font-extrabold text-slate-100 tracking-wide uppercase">Physical GPIO Pin Breakout</h2>
            <p className="text-xs text-slate-500 mt-1.5 font-bold uppercase tracking-widest font-mono">ESP32 DevKitC 38-Pin Layout Microchip Mockup</p>
          </div>

          {/* Microcontroller visualization wrapper */}
          <div className="w-full max-w-[640px] my-6 bg-[#020409]/95 border border-purple-500/10 rounded-3xl p-6 flex flex-row justify-between items-stretch gap-6 relative shadow-[inset_0_4px_30px_rgba(0,0,0,0.9)] overflow-x-auto min-w-[500px]">
            
            {/* Left Pin column buttons flanking */}
            <div className="flex flex-col justify-between gap-1 z-20 shrink-0 pr-2 border-r border-slate-900/60">
              {leftPins.map(pin => (
                <button
                  key={pin.pinNumber}
                  onClick={() => setSelectedPin(pin)}
                  className={`w-28 px-2 py-1 text-[9.5px] font-black font-mono border rounded-lg flex items-center justify-between transition-all duration-200 active:scale-95
                    ${selectedPin?.pinNumber === pin.pinNumber
                      ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_8px_rgba(34,211,238,0.2)]'
                      : 'bg-[#040813] border-white/5 text-slate-400 hover:text-slate-200 hover:border-slate-800'}`}
                >
                  <span className="opacity-40">{pin.pinNumber}</span>
                  <span className="tracking-wide uppercase font-extrabold">{pin.label}</span>
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${pin.state === 'HIGH' ? 'bg-emerald-400 shadow-[0_0_5px_rgba(16,185,129,0.8)]' : pin.state === 'LOW' ? 'bg-red-400 shadow-[0_0_5px_rgba(239,68,68,0.8)]' : pin.state === 'ANALOG' ? 'bg-amber-400 animate-pulse' : 'bg-slate-700'}`}></span>
                </button>
              ))}
            </div>

            {/* Central Microprocessor Core Design */}
            <div className="flex-grow flex flex-col justify-center items-center relative py-6 px-4">
              
              {/* SVG vector chip background */}
              <div className="w-full max-w-[200px] aspect-[4/5] bg-gradient-to-br from-[#0c1224] to-[#04060c] border border-slate-800 rounded-2xl flex flex-col justify-between p-4 relative shadow-[0_0_40px_rgba(0,0,0,0.8)] z-10">
                <div className="absolute inset-0 bg-[#0c1224]/10 rounded-2xl blur-lg pointer-events-none"></div>
                
                {/* Metallic shine detail line */}
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>

                <div className="flex justify-between items-start">
                  <span className="text-[7.5px] font-black font-mono text-purple-400 uppercase tracking-widest">ASTU LAB</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_5px_#22d3ee] animate-pulse"></span>
                </div>

                <div className="text-center py-4 flex flex-col items-center justify-center">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white font-extrabold text-[11px] shadow-lg shadow-purple-600/30 mb-2 relative">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 5h10a2 2 0 012 2v10a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2z" /></svg>
                  </div>
                  <h4 className="text-xs font-black text-slate-100 tracking-wider font-mono">ESP32-WROOM</h4>
                  <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest font-mono mt-0.5">D0WDQ6 Core</span>
                </div>

                <div className="flex justify-between items-end border-t border-slate-900/60 pt-2 text-[6.5px] font-mono text-slate-500">
                  <span>RFM95W MESH</span>
                  <span>v3.3.0</span>
                </div>
              </div>

              {/* Status flashing LED lights */}
              <div className="absolute top-10 flex gap-1.5 z-15">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_#10b981] animate-pulse"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_5px_#a855f7] animate-ping" style={{ animationDuration: '2s' }}></span>
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_5px_#06b6d4] animate-pulse" style={{ animationDelay: '1s' }}></span>
              </div>
            </div>

            {/* Right Pin column buttons flanking */}
            <div className="flex flex-col justify-between gap-1 z-20 shrink-0 pl-2 border-l border-slate-900/60">
              {rightPins.map(pin => (
                <button
                  key={pin.pinNumber}
                  onClick={() => setSelectedPin(pin)}
                  className={`w-28 px-2 py-1 text-[9.5px] font-black font-mono border rounded-lg flex items-center justify-between transition-all duration-200 active:scale-95
                    ${selectedPin?.pinNumber === pin.pinNumber
                      ? 'bg-gradient-to-r from-purple-500/20 to-cyan-500/20 border-purple-400 text-purple-300 shadow-[0_0_8px_rgba(168,85,247,0.2)]'
                      : 'bg-[#040813] border-white/5 text-slate-400 hover:text-slate-200 hover:border-slate-800'}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${pin.state === 'HIGH' ? 'bg-emerald-400 shadow-[0_0_5px_rgba(16,185,129,0.8)]' : pin.state === 'LOW' ? 'bg-red-400 shadow-[0_0_5px_rgba(239,68,68,0.8)]' : pin.state === 'ANALOG' ? 'bg-amber-400 animate-pulse' : 'bg-slate-700'}`}></span>
                  <span className="tracking-wide uppercase font-extrabold">{pin.label}</span>
                  <span className="opacity-40">{pin.pinNumber}</span>
                </button>
              ))}
            </div>

          </div>

          <div className="w-full flex justify-around text-[10px] font-mono text-slate-500 px-6">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500"></span> POWER</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500"></span> ADC INPUT</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-500"></span> GPIO</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-cyan-500"></span> BUS SPI/I2C</span>
          </div>
        </div>

      </div>

      {/* 4. Bottom row: SAR ADC bit analysis and calibration details */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* ADC Channels bit reading and Calibration input */}
        <div className="xl:col-span-2 glass-panel rounded-3xl p-7 flex flex-col justify-between min-h-[460px]">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg font-extrabold text-slate-100 tracking-wide uppercase">SAR ADC 12-Bit Channel Breakout</h2>
                <p className="text-xs text-slate-500 mt-1.5 font-bold uppercase tracking-widest font-mono">Analog-to-Digital Converter calibration and reference voltage</p>
              </div>
              
              {/* Calibration Input field */}
              <div className="flex items-center gap-3 bg-[#030610] border border-purple-500/15 rounded-xl px-4 py-2 shrink-0">
                <label className="text-[10px] font-black font-mono text-slate-500 uppercase">CALIBRATE VREF:</label>
                <input
                  type="number"
                  step="0.05"
                  min="2.0"
                  max="4.0"
                  value={vref}
                  onChange={(e) => setVref(Number(e.target.value))}
                  className="w-16 bg-[#080d19]/90 border border-slate-800 rounded px-2.5 py-1 text-xs text-cyan-400 font-mono focus:outline-none focus:border-cyan-400 font-bold"
                />
                <span className="text-xs text-slate-500 font-mono">Volts</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-slate-500 uppercase text-[9.5px] tracking-wider">
                    <th className="py-3 font-extrabold">Channel</th>
                    <th className="py-3 font-extrabold">ESP Pin</th>
                    <th className="py-3 font-extrabold">Telemetry Role</th>
                    <th className="py-3 font-extrabold text-right">Raw Register (12-bit)</th>
                    <th className="py-3 font-extrabold text-right">Calibrated Voltage</th>
                    <th className="py-3 font-extrabold">Attenuation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {adcTracks.map((adc) => (
                    <tr key={adc.channel} className="hover:bg-[#030610]/40 transition-colors">
                      <td className="py-3.5 font-bold text-slate-200">{adc.channel}</td>
                      <td className="py-3.5 text-purple-400 font-bold">{adc.gpio}</td>
                      <td className="py-3.5 text-slate-400 font-sans font-semibold">{adc.role}</td>
                      <td className="py-3.5 text-right font-black text-slate-100">{adc.rawValue}</td>
                      <td className="py-3.5 text-right font-black text-cyan-400 text-glow-cyan">{calcVoltage(adc.rawValue, adc.attenuation)} V</td>
                      <td className="py-3.5"><span className="px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-[9.5px] text-slate-500 font-bold">{adc.attenuation}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="border-t border-white/5 pt-4 text-[9.5px] font-mono text-slate-500 flex justify-between leading-relaxed">
            <span>Dynamic mapping formula: V = (ADC_RAW / 4095) * VREF * ATTEN_COEFF</span>
            <span className="text-purple-400">Silicon Reference: Internal SAR Calibration Fuses synced</span>
          </div>
        </div>

        {/* FreeRTOS Core Scheduler details */}
        <div className="xl:col-span-1 glass-panel rounded-3xl p-7 flex flex-col justify-between min-h-[460px]">
          <div>
            <h2 className="text-lg font-extrabold text-slate-100 tracking-wide uppercase">FreeRTOS Thread Monitor</h2>
            <p className="text-xs text-slate-500 mt-1.5 font-bold uppercase tracking-widest font-mono mb-4">Task Scheduler execution stack and memory buffers</p>
            
            <div className="space-y-4">
              
              {/* Stack gauge */}
              <div className="bg-[#030610] border border-purple-500/10 rounded-2.5xl p-4.5">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] text-slate-500 font-bold uppercase font-mono">Heap SRAM Allocation</span>
                  <span className="text-xs text-purple-400 font-bold font-mono">214 KB Free / 320 KB</span>
                </div>
                <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-purple-600 to-indigo-500 w-[67%]"></div>
                </div>
              </div>

              {/* Thread list */}
              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                {freeRTOSTasks.map(task => (
                  <div key={task.name} className="flex items-center justify-between p-3 bg-[#030610]/80 border border-white/5 rounded-2xl hover:border-purple-500/20 transition-all font-mono text-xs">
                    <div>
                      <h4 className="font-extrabold text-slate-100">{task.name}</h4>
                      <span className="text-[9px] text-slate-500 block uppercase">Prio: {task.priority} • Stack: {task.stackRemaining}</span>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-0.5 text-[8.5px] font-black uppercase rounded ${task.state === 'Running' ? 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-400' : 'bg-slate-900 border border-slate-800 text-slate-500'}`}>
                        {task.state}
                      </span>
                      <span className="block text-[9.5px] text-cyan-400 font-black mt-1">{task.cpuLoad}</span>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>

          <div className="border-t border-white/5 pt-3.5 text-[9.5px] font-mono text-slate-500">
            FreeRTOS Kernel: v10.4.3 • System Core [1] active
          </div>
        </div>

      </div>

      {/* 5. Real-time RF signal quality charts & Live Serial Shell */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Real-time LoRa signal dashboard graphs */}
        <div className="xl:col-span-1 glass-panel rounded-3xl p-7 flex flex-col justify-between min-h-[460px]">
          <div>
            <h2 className="text-lg font-extrabold text-slate-100 tracking-wide uppercase">LoRa RF Signal Quality</h2>
            <p className="text-xs text-slate-500 mt-1.5 font-bold uppercase tracking-widest font-mono mb-4">Signal-to-noise floor and RSSI signal level indicators</p>
          </div>

          <div className="flex-grow w-full relative min-h-[220px]">
            {rfData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={rfData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRssi" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#12182e" vertical={false} opacity={0.3} />
                  <XAxis dataKey="time" stroke="#475569" fontSize={9} tickLine={false} axisLine={false} className="font-mono font-semibold" />
                  <YAxis domain={[-110, -50]} stroke="#475569" fontSize={9} tickLine={false} axisLine={false} className="font-mono font-semibold" />
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(5, 8, 20, 0.95)', borderColor: 'rgba(168, 85, 247, 0.3)', borderRadius: '1.25rem', borderWidth: '1.5px', padding: '1rem' }} />
                  <Area type="monotone" dataKey="rssi" name="RSSI (dBm)" stroke="#06b6d4" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRssi)" activeDot={{ r: 5, strokeWidth: 0, fill: '#06b6d4' }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-slate-500 font-bold text-[10px] uppercase font-mono">
                Establishing LoRa connection diagnostics...
              </div>
            )}
          </div>

          <div className="border-t border-white/5 pt-4 text-xs font-mono text-slate-400 flex justify-between bg-[#030610]/45 p-3 rounded-2xl border border-white/5">
            <div>
              <span className="text-[9px] text-slate-500 uppercase block font-sans font-bold">Packet Loss</span>
              <span className={`font-black text-sm ${packetLoss > 1.0 ? 'text-red-400' : 'text-emerald-400'}`}>{packetLoss.toFixed(2)}%</span>
            </div>
            <div>
              <span className="text-[9px] text-slate-500 uppercase block font-sans font-bold">Spread Factor</span>
              <span className="font-black text-slate-200 text-sm">SF7</span>
            </div>
            <div>
              <span className="text-[9px] text-slate-500 uppercase block font-sans font-bold">SNR Value</span>
              <span className="font-black text-cyan-400 text-glow-cyan text-sm">+8.5 dB</span>
            </div>
          </div>
        </div>

        {/* Live Monospaced scrolling serial console */}
        <div className="xl:col-span-2 glass-panel rounded-3xl p-7 flex flex-col justify-between min-h-[460px]">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-extrabold text-slate-100 tracking-wide uppercase">Live Hardware Serial Shell</h2>
              <p className="text-xs text-slate-500 mt-1.5 font-bold uppercase tracking-widest font-mono">Raw asynchronous microcontroller serial output registers</p>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping"></span>
              <span className="text-[9px] font-mono font-black tracking-widest text-cyan-400 uppercase">SYS_LOG ACTIVE</span>
            </div>
          </div>

          {/* Styled monospaced console view */}
          <div className="flex-grow w-full bg-[#020409]/95 border border-purple-500/10 rounded-2.5xl p-5 font-mono text-[11px] leading-relaxed text-slate-350 space-y-2 overflow-y-auto h-[240px] max-h-[250px] shadow-[inset_0_4px_30px_rgba(0,0,0,0.95)] scrollbar-thin">
            {serialLogs.map((log, index) => {
              let logColorClass = 'text-slate-300';
              if (log.includes('🖥️')) logColorClass = 'text-slate-400';
              else if (log.includes('📊')) logColorClass = 'text-amber-400';
              else if (log.includes('🔌')) logColorClass = 'text-cyan-300';
              else if (log.includes('🧠')) logColorClass = 'text-purple-300';
              else if (log.includes('📶')) logColorClass = 'text-indigo-400';
              else if (log.includes('📡')) logColorClass = 'text-emerald-450';
              else if (log.includes('😴') || log.includes('💤')) logColorClass = 'text-slate-500';
              
              return (
                <p key={index} className={logColorClass}>
                  {log}
                </p>
              );
            })}
            <div ref={serialEndRef} />
          </div>

          <div className="border-t border-white/5 pt-4 text-[9px] font-mono text-slate-500 flex justify-between uppercase">
            <span>Baud Rate: 115200 bps</span>
            <span>Console Mode: read_write</span>
          </div>
        </div>

      </div>

    </div>
  );
};

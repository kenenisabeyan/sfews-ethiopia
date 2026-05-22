import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { SensorNode, DashboardPayload, SystemHealth } from '../types';

interface DashboardTabProps {
  payload: DashboardPayload | null;
  health: SystemHealth | null;
  loading: boolean;
  error: string | null;
  liveTime: string;
  activeStationId: string;
  setActiveStationId: (id: string) => void;
  broadcastEmergencySMS: (node: SensorNode) => void;
}

// Landscape imagery for live camera feeds carousel
const CAMERA_FEED_SLIDES = [
  {
    id: 1,
    url: 'https://images.unsplash.com/photo-1548232938-1611d2938166?q=80&w=800&auto=format&fit=crop',
    title: 'Welenchiti Basin Feed - Channel Alpha',
  },
  {
    id: 2,
    url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=800&auto=format&fit=crop',
    title: 'Adama Siphon Feed - Flow Gate Beta',
  },
  {
    id: 3,
    url: 'https://images.unsplash.com/photo-1434725039720-abb26e22fedf?q=80&w=800&auto=format&fit=crop',
    title: 'Awash Melka Feed - Reservoir Delta',
  },
];

export const DashboardTab: React.FC<DashboardTabProps> = ({
  payload,
  health,
  loading,
  liveTime,
  activeStationId,
  setActiveStationId,
  broadcastEmergencySMS,
}) => {
  // Navigation list coordination or local states
  const activeStation = payload?.nodes.find((s) => s.id === activeStationId) || payload?.nodes[0];

  // Dynamically calculate dashboard metrics
  const avgWaterLevel = payload && payload.nodes.length > 0
      ? payload.nodes.reduce((acc, curr) => acc + (curr.waterLevelCm || 0), 0) / payload.nodes.length
      : 0;

  const maxRainfall = payload && payload.nodes.length > 0
      ? Math.max(...payload.nodes.map(n => n.rainfallRateMm || 0))
      : 0;

  const criticalCount = payload?.nodes.filter(n => n.currentRisk === 'Critical').length || 0;
  const warningCount = payload?.nodes.filter(n => n.currentRisk === 'Warning').length || 0;
  const safeCount = payload?.nodes.filter(n => n.currentRisk === 'Safe' || !n.currentRisk).length || 0;

  const latestFloodProb = payload && payload.history.length > 0
      ? Math.round(payload.history[payload.history.length - 1].floodProbability * 100)
      : 78;


  // Mock weather forecast
  const weatherForecast = [
      { day: 'Mon', temp: '34°C', risk: 'Cloudy', rain: '20%', icon: 'cloud' },
      { day: 'Tue', temp: '36°C', risk: 'Heavy Storm', rain: '90%', icon: 'storm' },
      { day: 'Wed', temp: '35°C', risk: 'Rainy', rain: '75%', icon: 'rain' },
      { day: 'Thu', temp: '33°C', risk: 'Thunderstorms', rain: '85%', icon: 'storm' },
      { day: 'Fri', temp: '34°C', risk: 'Scattered Showers', rain: '45%', icon: 'rain' },
      { day: 'Sat', temp: '37°C', risk: 'Partly Sunny', rain: '10%', icon: 'sun' },
      { day: 'Sun', temp: '38°C', risk: 'Sunny', rain: '5%', icon: 'sun' }
  ];

  const getAlertColors = (risk?: string) => {
      switch (risk) {
          case 'Safe': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
          case 'Warning': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
          case 'Critical': return 'text-red-400 bg-red-500/10 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]';
          default: return 'text-slate-400 bg-slate-800/50 border-slate-700/50';
      }
  };

  // SVG Map Node Coordinate generator based on ID
  const getMapCoordinates = (nodeId: string, index: number) => {
      const mapPositions: { [key: string]: { x: number; y: number } } = {
          'NODE-ALPHA-1': { x: 290, y: 120 },
          'NODE-BETA-2': { x: 180, y: 80 },
          'NODE-GAMMA-3': { x: 410, y: 170 },
          'NODE-AWASH-01': { x: 520, y: 210 }
      };
      return mapPositions[nodeId] || { x: 100 + index * 120, y: 110 + (index % 2) * 60 };
  };

  const isSystemOnline = health?.database_connection === 'Active';

  return (
    <div className="space-y-8 animate-hologram">
      
      {/* 1. Cinematic Dashboard Header Status Bar */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pb-5 border-b border-white/5 relative">
        <div className="absolute bottom-0 left-0 w-24 h-0.5 bg-gradient-to-r from-purple-500 to-cyan-400"></div>
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[10px] font-black uppercase text-purple-400 tracking-widest font-mono bg-purple-500/10 border border-purple-500/20 px-3.5 py-1 rounded-full shadow-[0_0_12px_rgba(168,85,247,0.1)]">
              🛰️ AWASH BASIN RELAY CHANNEL [01]
            </span>
            <span className="text-[10px] font-black uppercase text-cyan-400 tracking-widest font-mono bg-cyan-500/10 border border-cyan-500/20 px-3.5 py-1 rounded-full shadow-[0_0_12px_rgba(34,211,238,0.1)]">
              ASTU LAB PROJECT
            </span>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest font-mono bg-white/5 border border-white/10 px-3 py-1 rounded-full">
              SECURE DESKTOP CONSOLE
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight bg-gradient-to-r from-slate-50 via-slate-100 to-indigo-300 bg-clip-text text-transparent mt-3.5">
            Awash Command Console
          </h1>
          <p className="text-slate-400 mt-1.5 text-sm font-semibold tracking-wide flex items-center gap-2">
            Hydrology Intelligence Platform — Ethiopia • <span className="font-mono text-cyan-400 text-glow-cyan font-bold">{liveTime}</span>
          </p>
        </div>
        
        <div className="flex items-center gap-6">
          {/* LoRa Ping Indicator */}
          <div className="hidden sm:flex flex-col text-right font-mono text-[10px] text-slate-500 leading-snug">
            <span className="font-bold text-slate-400 uppercase tracking-widest">LoRa Mesh Node Ping</span>
            <span className="text-cyan-400 font-extrabold text-xs text-glow-cyan mt-0.5">22 ms (STABLE)</span>
          </div>
          
          <div className="flex items-center gap-3 bg-[#060a16] border border-purple-500/20 px-5 py-3.5 rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.5)] backdrop-blur-md relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative flex h-2.5 w-2.5 shrink-0">
              {isSystemOnline ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_8px_#10b981]"></span>
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 animate-pulse"></span>
              )}
            </div>
            <span className="text-[10px] font-mono font-black tracking-widest text-slate-300 uppercase shrink-0">
              NODE POOL SYNC: {isSystemOnline ? 'CONNECTED' : 'STANDBY'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Top Row: High-Fidelity KPI Cards Grid with Sparklines */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* KPI 1: Active Stations Monitored */}
        <div className="glass-panel-interactive rounded-3xl p-6.5 relative overflow-hidden flex flex-col justify-between min-h-[190px] group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-indigo-500/10 transition-colors"></div>
          <div className="flex items-center justify-between">
            <h3 className="text-slate-400 text-xs font-extrabold uppercase tracking-widest flex items-center gap-2.5">
              <svg className="w-4.5 h-4.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Active Stations
            </h3>
            <span className="text-[8px] font-mono font-black text-indigo-400 bg-indigo-500/15 px-2 py-0.5 rounded-md border border-indigo-500/30 tracking-widest">LIVE SCANNER</span>
          </div>
          
          <div className="flex items-baseline mt-4.5 gap-3 relative z-10">
            <span className="text-6xl font-black text-slate-50 tracking-tight text-glow-purple font-mono">
              {payload?.summary.totalNodes || 4}
            </span>
            <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest font-sans">mesh node units</span>
          </div>
          
          {/* Glowing Sparkline Visualization SVG */}
          <div className="absolute bottom-16 right-7 w-36 h-9 opacity-80 group-hover:opacity-100 transition-opacity">
            <svg className="w-full h-full text-indigo-400" viewBox="0 0 100 30" fill="none">
              <path d="M 0,25 Q 15,10 30,20 T 60,5 T 90,15 L 100,8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M 0,25 Q 15,10 30,20 T 60,5 T 90,15 L 100,8 L 100,30 L 0,30 Z" fill="url(#sparklineGradHome)" opacity="0.1" />
              <defs>
                <linearGradient id="sparklineGradHome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-4.5 flex gap-3.5 border-t border-white/5 pt-3.5 z-10 font-mono">
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Safe: {safeCount}</span>
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Warn: {warningCount}</span>
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span> Crit: {criticalCount}</span>
          </div>
        </div>

        {/* KPI 2: Critical Alerts */}
        <div className="glass-panel-interactive rounded-3xl p-6.5 relative overflow-hidden flex flex-col justify-between min-h-[190px] group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-amber-500/10 transition-colors"></div>
          <div className="flex items-center justify-between">
            <h3 className="text-slate-400 text-xs font-extrabold uppercase tracking-widest flex items-center gap-2.5">
              <svg className="w-4.5 h-4.5 text-amber-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Critical Alert Indexes
            </h3>
            <span className="text-[8px] font-mono font-black text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-md border border-amber-500/30 tracking-widest">WARNING DISPATCH</span>
          </div>
          
          <div className="flex items-baseline mt-4.5 gap-3 relative z-10">
            <span className="text-6xl font-black text-slate-100 tracking-tight text-glow-purple font-mono">
              {payload?.summary.activeAlerts || 3}
            </span>
            <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest font-sans">active registers</span>
          </div>
          
          {/* Danger Wave Micro-Sparkline */}
          <div className="absolute bottom-16 right-7 w-36 h-9 opacity-80 group-hover:opacity-100 transition-opacity">
            <svg className="w-full h-full text-amber-500" viewBox="0 0 100 30" fill="none">
              <path d="M 0,15 L 20,15 L 30,5 L 40,25 L 50,12 L 60,18 L 70,2 L 80,28 L 100,15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-4.5 border-t border-white/5 pt-3.5 z-10 font-mono">
            <span className="text-red-400 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
              LoRa Emergency SMS Network Broadcasting Active
            </span>
          </div>
        </div>

        {/* KPI 3: Hydrological & ESP32 Node Vitals */}
        <div className="glass-panel-interactive rounded-3xl p-6.5 relative overflow-hidden flex flex-col justify-between min-h-[190px] group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-emerald-500/10 transition-colors"></div>
          <div className="flex items-center justify-between">
            <h3 className="text-slate-400 text-xs font-extrabold uppercase tracking-widest flex items-center gap-2.5">
              <svg className="w-4.5 h-4.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              System Vitals Matrix
            </h3>
            <span className="text-[8px] font-mono font-black text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-md border border-emerald-500/30 tracking-widest">HEALTH: OK</span>
          </div>
          
          <div className="flex items-baseline mt-4">
            <span className={`text-3xl md:text-3.5xl font-black tracking-tight uppercase text-glow-emerald ${isSystemOnline ? 'text-emerald-400' : 'text-amber-400 animate-pulse'}`}>
              {isSystemOnline ? 'Operational' : 'Degraded State'}
            </span>
          </div>

          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-4.5 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-white/5 pt-3.5 z-10 font-mono">
            <span>Avg WL: <strong className="text-indigo-400 font-black">{avgWaterLevel.toFixed(1)} cm</strong></span>
            <span>Max Rain: <strong className="text-cyan-400 font-black">{maxRainfall.toFixed(1)} mm/h</strong></span>
            <span>Risk: <strong className="text-purple-400 font-black">{latestFloodProb}%</strong></span>
          </div>
        </div>

      </div>

      {/* 3. Middle Row: Main Hydrological Graph & AI Danger Status Radial Ring */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Basin Hydrological Trends Area Chart */}
        <div className="xl:col-span-2 glass-panel rounded-3xl p-7 flex flex-col min-h-[500px] relative">
          <div className="absolute top-0 left-1/4 w-[50%] h-[1px] bg-gradient-to-r from-transparent via-purple-500/20 to-transparent"></div>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h2 className="text-lg font-extrabold text-slate-100 tracking-wide uppercase">Basin Hydrological Vitals Chart</h2>
              <p className="text-xs text-slate-500 mt-1.5 font-bold uppercase tracking-widest font-mono">River level (cm) correlated against precipitation patterns (mm/h)</p>
            </div>
            <div className="flex gap-2.5">
              <span className="flex items-center gap-2 px-3.5 py-1.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-black rounded-xl uppercase tracking-wider shadow-[0_0_8px_rgba(99,102,241,0.05)]">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_#6366f1] animate-pulse"></span> Water Level (cm)
              </span>
              <span className="flex items-center gap-2 px-3.5 py-1.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-black rounded-xl uppercase tracking-wider shadow-[0_0_8px_rgba(34,211,238,0.05)]">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] animate-pulse"></span> Precipitation (mm/h)
              </span>
            </div>
          </div>

          <div className="flex-grow w-full relative min-h-[360px]">
            {loading && !payload ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin"></div>
              </div>
            ) : payload && payload.history.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={payload.history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorWaterHome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorRainHome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#12182e" vertical={false} opacity={0.4} />
                  <XAxis 
                    dataKey="timestamp" 
                    stroke="#475569" 
                    fontSize={10} 
                    tickFormatter={(val) => new Date(val).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}
                    tickMargin={12}
                    axisLine={false}
                    tickLine={false}
                    className="font-mono font-bold"
                  />
                  <YAxis 
                    stroke="#475569" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    tickMargin={12}
                    className="font-mono font-bold"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(5, 8, 20, 0.9)', 
                      borderColor: 'rgba(168, 85, 247, 0.3)', 
                      borderRadius: '1.25rem', 
                      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.85)',
                      padding: '1.25rem',
                      borderWidth: '1.5px',
                      backdropFilter: 'blur(12px)',
                    }}
                    itemStyle={{ color: '#f8fafc', fontWeight: 700 }}
                    labelStyle={{ color: '#c084fc', marginBottom: '0.75rem', fontWeight: 900, fontSize: '0.8rem', textTransform: 'uppercase', fontFamily: 'monospace', letterSpacing: '0.1em' }}
                    labelFormatter={(val) => new Date(val).toLocaleString()}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="waterLevelCm" 
                    name="Water Level (cm)" 
                    stroke="#8b5cf6" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorWaterHome)" 
                    activeDot={{ r: 6, strokeWidth: 0, fill: '#8b5cf6' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="rainfallRateMm" 
                    name="Precipitation (mm/h)" 
                    stroke="#06b6d4" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorRainHome)" 
                    activeDot={{ r: 6, strokeWidth: 0, fill: '#06b6d4' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-slate-500 font-bold text-xs tracking-widest uppercase font-mono">
                Awaiting hydrological telemetry sync...
              </div>
            )}
          </div>
        </div>

        {/* Holographic AI Danger Status Radial Ring Widget */}
        <div className="glass-panel rounded-3xl p-7 flex flex-col items-center justify-between min-h-[500px] relative">
          <div className="absolute top-0 right-1/4 w-[50%] h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent"></div>
          
          <div className="text-center w-full">
            <h2 className="text-lg font-extrabold text-slate-100 tracking-wide uppercase">AI Basin Risk Assessment</h2>
            <p className="text-xs text-slate-500 mt-1.5 font-bold uppercase tracking-widest font-mono">Real-time ML early warning probability</p>
          </div>

          {/* Holographic Radial Progress Indicator with sweep lines */}
          <div className="relative w-56 h-56 flex items-center justify-center my-6">
            <div className="absolute inset-2 border border-purple-500/10 rounded-full animate-pulse-slow opacity-40"></div>
            <div className="absolute inset-6 border border-cyan-500/5 rounded-full opacity-30"></div>
            
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="39" stroke="rgba(10, 15, 30, 0.8)" strokeWidth="6.5" fill="transparent" />
              <circle 
                cx="50" 
                cy="50" 
                r="39" 
                stroke="url(#radialGlowGrad)" 
                strokeWidth="7" 
                strokeDasharray="245" 
                strokeDashoffset={245 - (245 * latestFloodProb) / 100} 
                strokeLinecap="round"
                fill="transparent" 
                className="transition-all duration-1000 ease-out"
                style={{ filter: 'drop-shadow(0 0 12px rgba(168, 85, 247, 0.5))' }}
              />
              <defs>
                <linearGradient id="radialGlowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#c084fc" />
                  <stop offset="50%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#22d3ee" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-6xl font-black text-slate-50 tracking-tight font-mono text-glow-purple animate-pulse">{latestFloodProb}%</span>
              <span className="text-[9px] text-purple-400 font-black tracking-widest uppercase mt-1">HIGH RISK BIAS</span>
            </div>
          </div>

          {/* Detailed Forecast Metrics */}
          <div className="w-full bg-[#040812] border border-purple-500/15 rounded-2.5xl p-5 text-center">
            <span className={`px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest block mx-auto w-fit mb-3 ${latestFloodProb > 75 ? 'bg-red-500/10 border-red-500/30 text-red-400 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.2)]' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'}`}>
              {latestFloodProb > 75 ? '⚠️ NEURAL OVERFLOW DETECTED' : '⚠️ ELEVATED OUTFLOW STATUS'}
            </span>
            <p className="text-slate-300 text-xs font-semibold leading-relaxed">
              {latestFloodProb > 75 
                ? 'ML networks compute imminent channel overflow at Melka Weir within a +6 Hour horizon. SMS dispatching ready.' 
                : 'River discharge rate accelerated by upstream precipitation. LoRa telemetry registers are normal.'}
            </p>
          </div>
        </div>

      </div>

      {/* 4. Bottom Row: ESP32 Node Vitals Telemetry Widgets & scrolling live matrix activity feed */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* ESP32 Hardware Telemetry widgets matrix */}
        <div className="glass-panel rounded-3xl p-7 flex flex-col justify-between min-h-[420px]">
          <div>
            <h2 className="text-lg font-extrabold text-slate-100 tracking-wide uppercase">ESP32 IoT Node Vitals</h2>
            <p className="text-xs text-slate-500 mt-1.5 font-bold uppercase tracking-widest font-mono">Microcontroller diagnostic parameters</p>
          </div>

          <div className="grid grid-cols-2 gap-4.5 my-6">
            
            <div className="bg-[#030610] border border-purple-500/10 p-4 rounded-2xl flex flex-col justify-between hover:border-purple-500/20 transition-all">
              <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-widest font-mono">solar battery</span>
              <div className="flex items-baseline mt-2 gap-1.5">
                <span className="text-2xl font-mono font-black text-cyan-400 text-glow-cyan">3.72</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Volts</span>
              </div>
              <div className="w-full bg-slate-900 h-1.5 rounded-full mt-3 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 w-[78%]"></div>
              </div>
            </div>

            <div className="bg-[#030610] border border-purple-500/10 p-4 rounded-2xl flex flex-col justify-between hover:border-purple-500/20 transition-all">
              <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-widest font-mono">solar load watt</span>
              <div className="flex items-baseline mt-2 gap-1.5">
                <span className="text-2xl font-mono font-black text-slate-200">1.45</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Watts</span>
              </div>
              <span className="text-[8px] text-slate-500 mt-3 font-mono">Solar efficiency: 94.2%</span>
            </div>

            <div className="bg-[#030610] border border-purple-500/10 p-4 rounded-2xl flex flex-col justify-between hover:border-purple-500/20 transition-all">
              <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-widest font-mono">LoRa network delay</span>
              <span className="text-2xl font-mono font-black text-emerald-400 text-glow-emerald mt-2">18 ms</span>
              <span className="text-[8px] text-emerald-400 mt-3 font-bold tracking-widest uppercase font-mono">RSSI: EXCELLENT</span>
            </div>

            <div className="bg-[#030610] border border-purple-500/10 p-4 rounded-2xl flex flex-col justify-between hover:border-purple-500/20 transition-all">
              <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-widest font-mono">free stack heap</span>
              <span className="text-2xl font-mono font-black text-slate-350 mt-2">214 KB</span>
              <span className="text-[8px] text-slate-500 mt-3 font-mono">SRAM usage: 34.2%</span>
            </div>

          </div>

          <div className="border-t border-white/5 pt-4.5 text-[9px] font-mono text-slate-550 uppercase font-black flex justify-between tracking-wider">
            <span>Protocol: ESP-MESH v3.1</span>
            <span>Clock Rate: 240 MHz</span>
          </div>
        </div>

        {/* Scrolling Monospace Live System Activity Feed */}
        <div className="xl:col-span-2 glass-panel rounded-3xl p-7 flex flex-col justify-between min-h-[420px]">
          <div className="flex justify-between items-center mb-5">
            <div>
              <h2 className="text-lg font-extrabold text-slate-100 tracking-wide uppercase">Live System Activity Feed</h2>
              <p className="text-xs text-slate-500 mt-1.5 font-bold uppercase tracking-widest font-mono">Real-time LoRa WebSocket telemetry log updates</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
              <span className="text-[8.5px] font-mono font-black tracking-widest text-cyan-400 uppercase">TELEMETRY LINK ACTIVE</span>
            </div>
          </div>

          {/* scrolling terminal log view */}
          <div className="flex-grow w-full bg-[#020409] border border-purple-500/10 rounded-2xl p-5 font-mono text-[11px] leading-relaxed text-slate-300 space-y-3 overflow-y-auto max-h-[220px] scrollbar-thin">
            <p className="text-emerald-400"><span className="text-slate-600">[04:02:12]</span> ⚡ [LoRa-Mesh] Node-Alpha-1 sync successfully (Water depth: 142.2cm, precipitation: 0.0mm/h, RSSI: -64dBm)</p>
            <p className="text-emerald-400"><span className="text-slate-600">[04:02:18]</span> ⚡ [LoRa-Mesh] Node-Beta-2 sync successfully (Water depth: 298.5cm, precipitation: 2.1mm/h, RSSI: -68dBm)</p>
            <p className="text-purple-400"><span className="text-slate-600">[04:02:24]</span> 🧬 [ML-Predictor] Computed early neural warning vectors. Overflow risk bias at Melka Weir: 78%</p>
            <p className="text-cyan-400"><span className="text-slate-600">[04:02:30]</span> 📡 [Sys-Sync] Hydrological database transactions successfully written to Neon postgres cluster</p>
            <p className="text-amber-400"><span className="text-slate-600">[04:02:36]</span> 📲 [SMS-Center] Proximity Emergency SMS broadcast generated for Abebe Bikila (+251 911 234 567)</p>
            <p className="text-slate-500"><span className="text-slate-600">[04:02:42]</span> 🔌 [ESP32-Core] Microcontroller diagnostic report nominal. Chip temperature: 38.6°C | Solar V: 3.72V</p>
            <p className="text-emerald-400"><span className="text-slate-600">[04:02:48]</span> ⚡ [LoRa-Mesh] Node-Gamma-3 sync successfully (Water depth: 488.1cm, precipitation: 4.8mm/h, RSSI: -72dBm)</p>
            <p className="text-purple-400"><span className="text-slate-600">[04:03:02]</span> 🧬 [ML-Predictor] Warning state confirmed. Executing dynamic warning threshold updates...</p>
          </div>

          <div className="border-t border-white/5 pt-4.5 text-[9px] font-mono text-purple-400 uppercase font-black tracking-widest flex items-center gap-2 justify-end">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></span>
            Relay Server: SECURE_WS_RELAY_v1.0.8
          </div>
        </div>

      </div>

      {/* 5. CCTV Night Vision monitor & Meteorology Outlook */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Early Warning Proximity Responders */}
        <div className="glass-panel rounded-3xl p-7 space-y-6">
          <div>
            <h2 className="text-lg font-extrabold text-slate-100 tracking-wide uppercase">Early Warning Proximity Responders</h2>
            <p className="text-xs text-slate-500 mt-1.5 font-bold uppercase tracking-widest font-mono">Emergency broadcast dispatch centers for active mesh nodes</p>
          </div>

          <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1.5 scrollbar-thin">
            {payload?.nodes.map((node) => (
              <div 
                key={node.id} 
                className={`bg-[#030610]/80 border rounded-2.5xl p-5 flex items-center justify-between transition-all duration-300 hover:scale-[1.01]
                  ${node.currentRisk === 'Critical' ? 'border-red-500/35 shadow-[0_0_15px_rgba(239,68,68,0.15)] bg-red-950/5' : 'border-purple-500/10 hover:border-purple-500/25'}`}
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h4 className="font-extrabold text-slate-50 text-sm">{node.name}</h4>
                    <span className={`px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border ${getAlertColors(node.currentRisk)}`}>
                      {node.currentRisk || 'STANDBY'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono">LAT {node.latitude.toFixed(4)} • LON {node.longitude.toFixed(4)}</p>
                  <div className="flex gap-4 text-xs font-bold text-slate-350 font-mono">
                    <span>Water: <strong className="text-indigo-400 font-black">{node.waterLevelCm?.toFixed(1) || '0.0'} cm</strong></span>
                    <span>Rain: <strong className="text-cyan-400 font-black">{node.rainfallRateMm?.toFixed(1) || '0.0'} mm/h</strong></span>
                  </div>
                </div>

                <button 
                  onClick={() => broadcastEmergencySMS(node)}
                  className={`px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 shrink-0 border active:scale-95
                    ${node.currentRisk === 'Critical' 
                      ? 'bg-red-550/20 hover:bg-red-600/30 text-red-300 border-red-500/40 shadow-[0_0_12px_rgba(239,68,68,0.2)]' 
                      : 'bg-[#060a16] hover:bg-purple-950/30 text-slate-300 hover:text-white border-purple-500/20 hover:border-purple-500/40'}`}
                >
                  Broadcast SMS
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Night vision live camera surveillance stream with radar controls */}
        <div className="glass-panel rounded-3xl p-7 flex flex-col justify-between min-h-[440px] relative">
          <div className="absolute top-0 right-1/4 w-[50%] h-[1px] bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent"></div>
          
          <div className="flex justify-between items-center mb-5">
            <div>
              <h2 className="text-lg font-extrabold text-slate-100 tracking-wide uppercase">Pilot Basin Optical Stream</h2>
              <p className="text-xs text-slate-500 mt-1.5 font-bold uppercase tracking-widest font-mono">Live CCTV river night surveillance matrix</p>
            </div>
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-1.5 rounded-xl text-[9px] font-black tracking-widest text-emerald-400 uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span> • NIGHT VISION FEED
            </div>
          </div>

          {/* Video simulation monitor viewport */}
          <div className="flex-grow w-full bg-[#020409] border border-purple-500/10 rounded-2.5xl relative overflow-hidden flex flex-col justify-between p-5 group select-none min-h-[230px] shadow-[inset_0_0_30px_rgba(0,0,0,0.9)]">
            {/* Unsplash Camera image for realistic river monitoring visual */}
            <div 
              className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-luminosity grayscale contrast-125 pointer-events-none transition-all duration-700"
              style={{ 
                backgroundImage: `url(${CAMERA_FEED_SLIDES[(payload?.nodes.findIndex(n => n.id === activeStationId) !== -1 ? (payload?.nodes.findIndex(n => n.id === activeStationId) ?? 0) : 0) % CAMERA_FEED_SLIDES.length].url})`,
                filter: 'brightness(1.1) contrast(1.2)'
              }}
            ></div>
            <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/20 via-transparent to-transparent opacity-60 z-10 pointer-events-none"></div>
            
            {/* Grid lines night vision effect */}
            <div className="absolute inset-0 opacity-[0.08] pointer-events-none z-10" style={{
              backgroundImage: 'linear-gradient(rgba(16, 185, 129, 0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(16, 185, 129, 0.4) 1px, transparent 1px)',
              backgroundSize: '20px 20px'
            }}></div>

            {/* Scanning laser visual lines */}
            <div className="absolute inset-x-0 h-0.5 bg-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.7)] opacity-40 z-10 animate-scanline pointer-events-none"></div>

            {/* night vision camera overlay text */}
            <div className="flex justify-between text-[9px] font-mono text-emerald-400 z-20 font-black tracking-widest uppercase">
              <span>{CAMERA_FEED_SLIDES[(payload?.nodes.findIndex(n => n.id === activeStationId) !== -1 ? (payload?.nodes.findIndex(n => n.id === activeStationId) ?? 0) : 0) % CAMERA_FEED_SLIDES.length].title.toUpperCase()}</span>
              <span>REC [●] {new Date().toISOString().slice(0, 10)}</span>
            </div>

            {/* Diagnostic target reticle */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-15 opacity-50">
              <div className="w-20 h-20 border border-dashed border-emerald-500/80 rounded-full animate-spin-slow"></div>
              <div className="w-3 h-3 bg-emerald-500 rounded-full absolute shadow-[0_0_8px_#10b981]"></div>
              <div className="w-28 h-[1px] bg-emerald-500/40 absolute"></div>
              <div className="w-[1px] h-28 bg-emerald-500/40 absolute"></div>
            </div>

            {/* Animated Wave SVG graphics representing water currents */}
            <div className="w-full flex-grow flex items-center justify-center relative overflow-hidden min-h-[140px]">
              <svg className="w-full h-full max-h-[100px] text-emerald-500/15 absolute bottom-0 left-0" viewBox="0 0 100 20" preserveAspectRatio="none">
                <path d="M0,10 C30,12 70,8 100,10 L100,20 L0,20 Z" fill="currentColor" className="animate-wave"></path>
                <path d="M0,12 C40,7 60,13 100,12 L100,20 L0,20 Z" fill="currentColor" opacity="0.5" style={{ animationDelay: '2s' }} className="animate-wave"></path>
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center text-emerald-450 font-mono text-[10px] gap-2.5 z-20 font-black tracking-widest">
                <svg className="w-8 h-8 opacity-80 animate-pulse text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span className="text-glow-emerald bg-emerald-950/20 px-3.5 py-1 rounded-md border border-emerald-500/20">OPTICAL ACTIVE LINK — {activeStation?.name || 'NODE-BETA-2'}</span>
              </div>
            </div>

            {/* Bottom camera diagnostics */}
            <div className="flex justify-between text-[9px] font-mono text-emerald-450 z-20 font-bold border-t border-emerald-950/30 pt-2.5 tracking-widest font-mono">
              <span>ISO 1250 • f/1.8 • night scope</span>
              <span>VOLUMETRIC DISCHARGE: ~124.5 m³/s</span>
            </div>
          </div>

          {/* Station select list */}
          <div className="mt-4.5 flex gap-2.5 overflow-x-auto pb-1.5 scrollbar-thin">
            {payload?.nodes.map((s) => (
              <button 
                key={s.id} 
                onClick={() => setActiveStationId(s.id)}
                className={`px-4.5 py-2.5 rounded-xl text-[10px] font-black whitespace-nowrap border transition-all duration-300 uppercase tracking-widest active:scale-95
                  ${activeStationId === s.id 
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.1)]' 
                    : 'bg-[#030610] border-white/5 text-slate-400 hover:text-slate-200 hover:border-purple-500/20'}`}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* 6. Awash GIS Map & Weather Outlook Widgets */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* SVG GIS Map Vector Panel */}
        <div className="xl:col-span-2 glass-panel rounded-3xl p-7 flex flex-col min-h-[490px]">
          <div className="mb-7 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-extrabold text-slate-100 tracking-wide uppercase">Awash Basin Topographic Map</h2>
              <p className="text-xs text-slate-500 mt-1.5 font-bold uppercase tracking-widest font-mono">Spatial vector coordinate layout linking monitored stations</p>
            </div>
            
            {/* Map Legends */}
            <div className="flex flex-wrap gap-4">
              <span className="flex items-center gap-2 text-[10px] text-slate-400 font-extrabold tracking-widest uppercase font-mono"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></span> Safe</span>
              <span className="flex items-center gap-2 text-[10px] text-slate-400 font-extrabold tracking-widest uppercase font-mono"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]"></span> Warning</span>
              <span className="flex items-center gap-2 text-[10px] text-slate-400 font-extrabold tracking-widest uppercase font-mono"><span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444] animate-pulse"></span> Critical</span>
            </div>
          </div>

          {/* Custom SVG Interactive Map */}
          <div className="flex-grow w-full bg-[#010308]/90 border border-purple-500/10 rounded-3xl relative overflow-hidden flex items-center justify-center min-h-[320px] p-5 shadow-[inset_0_4px_30px_rgba(0,0,0,0.8)]">
            <svg className="w-full h-full max-w-[720px] max-h-[310px] text-slate-800" viewBox="0 0 600 300" fill="none">
              
              {/* Curvy River Path representing the Awash River flow */}
              <path 
                d="M 50,80 Q 150,50 220,120 T 380,180 T 550,220" 
                stroke="url(#riverGradientHome)" 
                strokeWidth="10" 
                strokeLinecap="round" 
                fill="none" 
                className="opacity-20" 
              />
              <path 
                d="M 50,80 Q 150,50 220,120 T 380,180 T 550,220" 
                stroke="#6366f1" 
                strokeWidth="3.5" 
                strokeLinecap="round" 
                fill="none" 
                className="opacity-80" 
                style={{ filter: 'drop-shadow(0 0 10px rgba(99, 102, 241, 0.55))' }}
              />

              <defs>
                <linearGradient id="riverGradientHome" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="50%" stopColor="#22d3ee" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
              </defs>

              {/* Basin Topographic contour shapes */}
              <path d="M 80,120 Q 120,160 160,110 T 240,160" stroke="rgba(168,85,247,0.03)" strokeWidth="1.5" fill="none" />
              <path d="M 280,240 Q 320,290 380,220 T 480,260" stroke="rgba(168,85,247,0.03)" strokeWidth="1.5" fill="none" />

              {/* Pulsing neon dots for sensor stations */}
              {payload?.nodes.map((node, index) => {
                const coords = getMapCoordinates(node.id, index);
                const isSelected = activeStationId === node.id;
                
                let strokeColor = '#10b981';
                if (node.currentRisk === 'Warning') {
                  strokeColor = '#f59e0b';
                } else if (node.currentRisk === 'Critical') {
                  strokeColor = '#ef4444';
                }

                return (
                  <g 
                    key={node.id} 
                    transform={`translate(${coords.x}, ${coords.y})`}
                    className="cursor-pointer group"
                    onClick={() => setActiveStationId(node.id)}
                  >
                    <circle r="18" fill={strokeColor} opacity={isSelected ? '0.18' : '0'} className="animate-ping" />
                    <circle r="11" fill="none" stroke={strokeColor} strokeWidth="2.5" opacity="0.3" />
                    <circle 
                      r="6.5" 
                      fill={strokeColor} 
                      className="group-hover:scale-125 transition-transform duration-300" 
                      style={{ filter: `drop-shadow(0 0 10px ${strokeColor})` }}
                    />
                    <text 
                      y="-18" 
                      textAnchor="middle" 
                      fill="#94a3b8" 
                      fontSize="9.5" 
                      fontWeight="bold" 
                      className="font-sans group-hover:fill-slate-100 transition-colors duration-300 uppercase tracking-widest font-mono"
                    >
                      {node.name.split(' ')[0]}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Modern Meteorology Weather Outlook */}
        <div className="glass-panel rounded-3xl p-7 flex flex-col justify-between min-h-[490px]">
          <div className="text-center w-full">
            <h2 className="text-lg font-extrabold text-slate-100 tracking-wide uppercase">Meteorological Outlook</h2>
            <p className="text-xs text-slate-500 mt-1.5 font-bold uppercase tracking-widest font-mono">Semera Region Weather Station</p>
          </div>

          <div className="flex flex-col items-center justify-center my-6 space-y-2">
            <span className="text-glow-purple text-6xl font-black text-slate-50 font-mono tracking-tight flex items-start">
              24<span className="text-2.5xl text-purple-400 font-medium font-sans mt-1">°C</span>
            </span>
            <div className="text-center">
              <p className="text-sm font-black text-slate-100 uppercase tracking-wider">Heavy Rain Watch</p>
              <span className="text-[9.5px] text-slate-500 font-bold uppercase tracking-widest font-mono">humidity: 89% | wind velocity: 12km/h</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest border-b border-white/5 pb-2.5 font-mono">3-Day Forecast Grid</div>
            <div className="grid grid-cols-3 gap-3">
              {weatherForecast.slice(0, 3).map((fc, i) => (
                <div key={i} className="bg-[#030610] border border-purple-500/10 p-3.5 rounded-2xl flex flex-col items-center justify-center text-center hover:border-purple-500/20 transition-all hover:scale-102">
                  <span className="text-slate-500 font-extrabold text-[8.5px] uppercase tracking-widest font-mono">{fc.day}</span>
                  <div className="w-7 h-7 my-2 text-indigo-400">
                    {fc.icon === 'cloud' && (
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>
                    )}
                    {fc.icon === 'rain' && (
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                    )}
                    {fc.icon === 'storm' && (
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    )}
                    {fc.icon === 'sun' && (
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" /></svg>
                    )}
                  </div>
                  <span className="font-mono text-slate-200 font-bold text-xs">{fc.temp}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* 7. Modern Event Activity Table Log */}
      <div className="glass-panel rounded-3xl p-7 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-extrabold text-slate-100 tracking-wide uppercase">Command Center Activity Event log</h2>
            <p className="text-xs text-slate-500 mt-1.5 font-bold uppercase tracking-widest font-mono">Aggregated database ledger and automated early warnings dispatches</p>
          </div>
          <span className="px-3.5 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 font-extrabold text-[9px] uppercase tracking-widest font-mono">
            SECURE COMPLIANCE TRANSCRIPT
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs md:text-sm">
            <thead>
              <tr className="border-b border-white/5 text-slate-400 font-black uppercase tracking-widest text-[9.5px] font-mono">
                <th className="py-4.5 px-6">Event ID</th>
                <th className="py-4.5 px-6">Source Node Station</th>
                <th className="py-4.5 px-6">Hydrological Metrics Trigger</th>
                <th className="py-4.5 px-6">Risk Category</th>
                <th className="py-4.5 px-6">Dispatch System Response</th>
                <th className="py-4.5 px-6 text-right">Activity Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-semibold text-slate-350">
              {payload?.nodes.map((node, i) => {
                const eventId = `EVT-00${3045 + i}`;
                let riskText = 'Safe';
                let triggerVal = `WL: ${node.waterLevelCm?.toFixed(1) || '0.0'} cm`;
                let responseText = 'Monitoring Active';
                
                if (node.currentRisk === 'Warning') {
                  riskText = 'Warning';
                  responseText = 'Warning Alert Broadcast Transmitted';
                } else if (node.currentRisk === 'Critical') {
                  riskText = 'Critical';
                  responseText = 'SMS Dispatched & Siren Triggered';
                }

                return (
                  <tr key={node.id} className="hover:bg-white/5 transition-all">
                    <td className="py-4.5 px-6 font-mono text-slate-500 text-xs font-bold">{eventId}</td>
                    <td className="py-4.5 px-6">
                      <div className="font-extrabold text-slate-100">{node.name}</div>
                      <div className="text-[9px] text-slate-500 font-mono uppercase mt-0.5">{node.id}</div>
                    </td>
                    <td className="py-4.5 px-6">
                      <span className="font-mono text-xs text-indigo-400 font-black">{triggerVal}</span>
                      <span className="text-[9px] text-slate-500 font-bold block font-mono">Rainfall: {node.rainfallRateMm?.toFixed(1) || '0.0'} mm/h</span>
                    </td>
                    <td className="py-4.5 px-6">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border inline-block ${getAlertColors(node.currentRisk)}`}>
                        {riskText}
                      </span>
                    </td>
                    <td className="py-4.5 px-6">
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${node.currentRisk === 'Critical' ? 'bg-red-500 shadow-[0_0_8px_#ef4444] animate-ping' : node.currentRisk === 'Warning' ? 'bg-amber-500 shadow-[0_0_8px_#f59e0b]' : 'bg-emerald-500 shadow-[0_0_8px_#10b981]'}`}></span>
                        <span className="text-xs">{responseText}</span>
                      </div>
                    </td>
                    <td className="py-4.5 px-6 text-right text-slate-400 text-xs font-mono">
                      {i === 0 ? 'Just Now' : `${i * 12} min ago`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      
    </div>
  );
};

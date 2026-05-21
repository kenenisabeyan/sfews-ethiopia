import React, { useState, useEffect } from 'react';
import {
  Subscriber,
  DispatchLog,
  WeatherInfo,
  ActiveTab,
  AntiGravityDashboardState,
} from './types/types';
import { initializeStations, tickAllStations } from './utils/simulation';
import { FluidChart } from './components/FluidChart';
import { GeographicMap } from './components/GeographicMap';
import { CircuitMetrics } from './components/CircuitMetrics';
import { AlertsPanel } from './components/AlertsPanel';
import { WeatherPanel } from './components/WeatherPanel';
import { ReportsPanel } from './components/ReportsPanel';

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

const App: React.FC = () => {
  // Main State Initialization
  const [dashboardState, setDashboardState] = useState<AntiGravityDashboardState>(() => {
    const stations = initializeStations();
    const active_station_id = 'birampur';
    const activeStation = stations.find((s) => s.id === active_station_id) || stations[0];

    const initialSubscribers: Subscriber[] = [
      { id: '1', name: 'Kanafor Nome', phone: '+1245859595', zone: 'Zone A', status: 'Active' },
      { id: '2', name: 'Piles Flant', phone: '+1245556596', zone: 'Zone B', status: 'Active' },
      { id: '3', name: 'Wblny Moon', phone: '+1255125363', zone: 'Zone C', status: 'Active' },
      { id: '4', name: 'Welyi Meen', phone: '+1358135803', zone: 'Zone D', status: 'Offline' },
      { id: '5', name: 'Beett Deet', phone: '+1545365503', zone: 'Zone E', status: 'Active' },
    ];

    const initialDispatchLogs: DispatchLog[] = [
      {
        id: 'log-1',
        timestamp: new Date(Date.now() - 600000).toISOString(),
        stationName: 'Awash Melka (Birampur)',
        message: 'ALERT: Water level 8.92m exceeds critical limit! Dispatched SMS to Zone A.',
        type: 'AUTO',
        status: 'DELIVERED',
      },
      {
        id: 'log-2',
        timestamp: new Date(Date.now() - 1500000).toISOString(),
        stationName: 'Adama Siphon (Sundarganj)',
        message: 'WARN: Viscoelastic fluid tension 420Pa nearing ultimate limit.',
        type: 'AUTO',
        status: 'DELIVERED',
      },
    ];

    const initialWeather: WeatherInfo = {
      temp: 24,
      condition: 'Rainy',
      humidity: 89,
      windSpeed: 12,
      rainfall24h: 0.35,
      location: 'Upper Awash Basin, Ethiopia',
      forecast: [
        { day: 'Mon', tempMax: 25, tempMin: 18, condition: 'Rainy' },
        { day: 'Tue', tempMax: 26, tempMin: 19, condition: 'Rainy' },
        { day: 'Wed', tempMax: 27, tempMin: 20, condition: 'Cloudy' },
        { day: 'Thu', tempMax: 25, tempMin: 18, condition: 'Rainy' },
        { day: 'Fri', tempMax: 24, tempMin: 17, condition: 'Stormy' },
        { day: 'Sat', tempMax: 23, tempMin: 16, condition: 'Stormy' },
        { day: 'Sun', tempMax: 24, tempMin: 17, condition: 'Rainy' },
      ],
    };

    return {
      current_metrics: activeStation.metrics,
      is_siphon_active: activeStation.siphon_active,
      flow_regime: 'STABLE_SIPHON',
      historical_stream: activeStation.history,
      stations,
      active_station_id,
      subscribers: initialSubscribers,
      dispatch_logs: initialDispatchLogs,
      weather: initialWeather,
      active_tab: 'dashboard',
    };
  });

  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [forceCrashActive, setForceCrashActive] = useState<boolean>(false);

  // Live Camera Feed Carousel State
  const [activeSlideIdx, setActiveSlideIdx] = useState<number>(0);

  // Heartbeat loop (500ms ticker)
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setDashboardState((prev) => {
        const updated = tickAllStations(prev, forceCrashActive);
        
        // Auto-dispatch simulation warnings if danger thresholds are crossed
        const dangerNode = updated.stations.find((st) => st.status === 'DANGER');
        if (dangerNode && dangerNode.adc_value > 850) {
          const alreadyLogged = prev.dispatch_logs.some(
            (l) => l.stationName === dangerNode.name && Date.now() - new Date(l.timestamp).getTime() < 30000
          );
          
          if (!alreadyLogged) {
            const newLog: DispatchLog = {
              id: 'log-' + Math.random(),
              timestamp: new Date().toISOString(),
              stationName: dangerNode.name,
              message: `AUTO DISPATCH: Extreme ADC limit ${dangerNode.adc_value} exceeded at ${dangerNode.name.split(' ')[0]}. Safety valves active.`,
              type: 'AUTO',
              status: 'DELIVERED',
            };
            updated.dispatch_logs = [newLog, ...updated.dispatch_logs].slice(0, 30);
          }
        }

        // Reset the dynamic active crash flag once handled
        if (forceCrashActive) {
          setForceCrashActive(false);
        }
        return updated;
      });
    }, 500);

    return () => clearInterval(interval);
  }, [isPaused, forceCrashActive]);

  // Handler: Change active station node tracking
  const handleSelectStation = (id: string) => {
    setDashboardState((prev) => {
      const active = prev.stations.find((st) => st.id === id) || prev.stations[0];
      return {
        ...prev,
        active_station_id: id,
        current_metrics: active.metrics,
        is_siphon_active: active.siphon_active,
        flow_regime: active.status === 'DANGER' ? 'COHESION_FAILURE' : active.siphon_active ? 'STABLE_SIPHON' : 'STAGNANT',
        historical_stream: active.history,
      };
    });
  };

  // Handler: Manual emergency custom broadcast trigger
  const handleManualBroadcast = (message: string, targetName: string) => {
    const newLog: DispatchLog = {
      id: 'log-' + Math.random(),
      timestamp: new Date().toISOString(),
      stationName: targetName,
      message: `MANUAL BROADCAST: ${message}`,
      type: 'MANUAL',
      status: 'DELIVERED',
    };
    setDashboardState((prev) => ({
      ...prev,
      dispatch_logs: [newLog, ...prev.dispatch_logs].slice(0, 30),
    }));
  };

  // Carousel handlers
  const handleNextSlide = () => {
    setActiveSlideIdx((prev) => (prev + 1) % CAMERA_FEED_SLIDES.length);
  };
  const handlePrevSlide = () => {
    setActiveSlideIdx((prev) => (prev - 1 + CAMERA_FEED_SLIDES.length) % CAMERA_FEED_SLIDES.length);
  };

  const activeStation = dashboardState.stations.find((s) => s.id === dashboardState.active_station_id) || dashboardState.stations[0];

  // Map values to standard mockup displays
  const currentWaterLevel = (activeStation.metrics.height_cm * 0.04).toFixed(2);
  const currentRainfall = (activeStation.adc_value / 2500).toFixed(2);
  const currentVelocity = (activeStation.metrics.climbing_velocity_cms * 0.03).toFixed(3);

  // Compute risk level for radial gauge
  let riskLevelStr = 'Low';
  let riskColor = 'stroke-emerald-500 text-emerald-400';
  let riskPercentage = 30;
  if (activeStation.status === 'DANGER') {
    riskLevelStr = 'High';
    riskColor = 'stroke-red-500 text-red-500';
    riskPercentage = 90;
  } else if (activeStation.status === 'WARNING') {
    riskLevelStr = 'Moderate';
    riskColor = 'stroke-amber-500 text-amber-400';
    riskPercentage = 65;
  }

  return (
    <div className="min-h-screen bg-[#060a13] text-slate-200 font-sans flex select-none">
      
      {/* 1. Master Left Sidebar Router Navigation */}
      <aside className="w-[240px] bg-[#0c101d] border-r border-slate-900 flex flex-col justify-between p-5 shrink-0 z-30">
        <div>
          {/* Cyber Title Header */}
          <div className="flex items-center gap-3 mb-8 border-b border-slate-900 pb-5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center font-black text-white text-base shadow-lg shadow-purple-600/35 animate-pulse">
              Ξ
            </div>
            <div>
              <h1 className="text-sm font-black tracking-widest text-slate-100 uppercase">Flood Alert</h1>
              <p className="text-[9px] font-mono font-bold text-purple-400 tracking-wider">COMMAND CONSOLE</p>
            </div>
          </div>

          {/* Navigation Links matching layout mockup icons exactly */}
          <nav className="space-y-1">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
              { id: 'map', label: 'Live Map', icon: '🗺️' },
              { id: 'levels', label: 'Water Levels', icon: '🌊' },
              { id: 'alerts', label: 'Alerts', icon: '🔔' },
              { id: 'weather', label: 'Weather', icon: '🌤️' },
              { id: 'reports', label: 'Reports', icon: '📄' },
            ].map((tab) => {
              const active = dashboardState.active_tab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setDashboardState((p) => ({ ...p, active_tab: tab.id as ActiveTab }))}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-150 text-left
                    ${
                      active
                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                    }`}
                >
                  <span className="text-base">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* System Simulation modifiers */}
        <div className="bg-[#080c14] border border-slate-900/60 p-4 rounded-2xl space-y-3 font-mono text-[9px] text-slate-400">
          <div className="flex items-center justify-between border-b border-slate-900 pb-1.5 mb-1 text-slate-300 font-bold uppercase tracking-wider">
            <span>Simulation</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          </div>

          <div className="space-y-2">
            <button
              onClick={() => setIsPaused((p) => !p)}
              className={`w-full py-1.5 rounded font-black border uppercase tracking-wider transition-all
                ${isPaused 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                  : 'bg-slate-900 border-slate-800 text-slate-300'}`}
            >
              {isPaused ? 'Resume Loop' : 'Pause Loop'}
            </button>
            
            <button
              onClick={() => setForceCrashActive(true)}
              className="w-full py-1.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-black uppercase tracking-wider transition-all"
            >
              Force Siphon Breach
            </button>
            
            <button
              onClick={() => {
                const refreshed = initializeStations();
                setDashboardState((prev) => ({
                  ...prev,
                  stations: refreshed,
                  active_station_id: 'birampur',
                  current_metrics: refreshed[0].metrics,
                  historical_stream: refreshed[0].history,
                }));
              }}
              className="w-full py-1.5 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 font-black uppercase tracking-wider transition-all"
            >
              Reset Network
            </button>
          </div>
        </div>
      </aside>

      {/* 2. Main Workspace Canvas */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#060a13] z-10">
        
        {/* Top Header Bar */}
        <header className="h-[70px] bg-[#0c101d] border-b border-slate-900 flex items-center justify-between px-8 z-20 shrink-0">
          <div>
            <span className="text-[10px] font-mono font-black text-slate-500 uppercase tracking-widest">
              LOCATION CORE TRACKING:
            </span>
            <span className="text-xs font-mono font-black text-cyan-400 ml-2 uppercase">
              {activeStation.name}
            </span>
          </div>

          <div className="flex items-center gap-6">
            {/* Blinking global warning banner if danger breach detected */}
            {dashboardState.stations.some((s) => s.status === 'DANGER') && (
              <span className="hidden md:flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-1.5 rounded-xl text-[10px] font-bold tracking-widest uppercase animate-danger-banner">
                ⚠️ CRITICAL BREACH ALERT ACTIVE
              </span>
            )}

            {/* Bell notification count indicator */}
            <div className="relative cursor-pointer">
              <span className="text-xl">🔔</span>
              <span className="absolute -top-1 -right-1 bg-purple-600 text-white rounded-full text-[8px] font-black w-4.5 h-4.5 flex items-center justify-center border-2 border-[#0c101d]">
                {dashboardState.stations.filter((s) => s.status !== 'SAFE').length}
              </span>
            </div>

            {/* User admin details indicator */}
            <div className="flex items-center gap-2 border-l border-slate-800 pl-6 cursor-pointer">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-300 text-sm border border-slate-700">
                A
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-bold text-slate-200 leading-none">Console Admin</div>
                <div className="text-[8px] font-mono text-purple-400 mt-0.5">ROLE: SYSTEM ARCH</div>
              </div>
            </div>
          </div>
        </header>

        {/* 3. Screen Router Content Area */}
        <div className="flex-1 p-6 md:p-8 overflow-y-auto space-y-6">
          
          {dashboardState.active_tab === 'dashboard' && (
            <div className="space-y-6">
              
              {/* Row 1: KPI Dashboard Overviews */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* KPI 1: Current Water Level */}
                <div className="bg-[#0c101d] border border-slate-900 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between min-h-[120px]">
                  <span className="text-[10px] font-mono text-slate-500 uppercase font-bold tracking-widest">
                    Current Water Level
                  </span>
                  <div className="text-3xl font-black text-slate-100 font-mono tracking-tight mt-2 flex items-baseline gap-1">
                    {currentWaterLevel} <span className="text-sm text-slate-500 font-normal">m</span>
                  </div>
                  <span className={`text-[9px] font-mono font-bold mt-2 inline-block ${
                    activeStation.status === 'DANGER' ? 'text-red-400' : activeStation.status === 'WARNING' ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    ▲ {activeStation.status} STATUS
                  </span>
                </div>

                {/* KPI 2: Rainfall (24h) */}
                <div className="bg-[#0c101d] border border-slate-900 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between min-h-[120px]">
                  <span className="text-[10px] font-mono text-slate-500 uppercase font-bold tracking-widest">
                    Rainfall (24h)
                  </span>
                  <div className="text-3xl font-black text-slate-100 font-mono tracking-tight mt-2 flex items-baseline gap-1">
                    {currentRainfall} <span className="text-sm text-slate-500 font-normal">in</span>
                  </div>
                  <span className="text-[9px] font-mono text-slate-500 mt-2">
                    ⚡ Regional accumulation
                  </span>
                </div>

                {/* KPI 3: River Velocity */}
                <div className="bg-[#0c101d] border border-slate-900 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between min-h-[120px]">
                  <span className="text-[10px] font-mono text-slate-500 uppercase font-bold tracking-widest">
                    River Flow Velocity
                  </span>
                  <div className="text-3xl font-black text-slate-100 font-mono tracking-tight mt-2 flex items-baseline gap-1">
                    {currentVelocity} <span className="text-sm text-slate-500 font-normal">m/s</span>
                  </div>
                  <span className="text-[9px] font-mono text-emerald-400 mt-2">
                    ✓ Non-Newtonian shear steady
                  </span>
                </div>
              </div>

              {/* Row 2: Analytics chart & Risk Status */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-stretch">
                
                {/* Left Area Chart */}
                <div className="xl:col-span-2">
                  <FluidChart data={dashboardState.historical_stream} stationName={activeStation.name} />
                </div>

                {/* Right Radial Progress Status Meter */}
                <div className="xl:col-span-1 bg-[#0c101d] border border-slate-900 rounded-2xl p-6 flex flex-col justify-between items-center text-center min-h-[420px] shadow-2xl">
                  <div>
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest">
                      Regional Flood Risk Status
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">Siphoning cohesive material overload warnings</p>
                  </div>

                  {/* Gorgeous SVG Circular Gauge */}
                  <div className="relative w-48 h-48 flex items-center justify-center mt-4">
                    <svg className="w-full h-full transform -rotate-90">
                      {/* Grey background circle */}
                      <circle
                        cx="96"
                        cy="96"
                        r="72"
                        className="stroke-[#090d16]"
                        strokeWidth="14"
                        fill="transparent"
                      />
                      {/* Color progress circle */}
                      <circle
                        cx="96"
                        cy="96"
                        r="72"
                        className={`transition-all duration-500 ${riskColor}`}
                        strokeWidth="14"
                        fill="transparent"
                        strokeDasharray={2 * Math.PI * 72}
                        strokeDashoffset={2 * Math.PI * 72 * (1 - riskPercentage / 100)}
                        strokeLinecap="round"
                      />
                    </svg>

                    {/* Centered details */}
                    <div className="absolute flex flex-col items-center">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wide leading-none">RISK LEVEL</span>
                      <span className="text-2xl font-black text-slate-100 font-mono tracking-tight mt-1.5">
                        {riskLevelStr}
                      </span>
                      <span className="text-[9px] font-mono text-slate-500 mt-1 uppercase font-bold">
                        {riskPercentage}% Limit
                      </span>
                    </div>
                  </div>

                  <div className="w-full text-[10px] font-mono text-slate-400 bg-slate-950 p-3.5 rounded-xl border border-slate-900">
                    ⚠️ <span className="font-bold text-slate-300">INCIDENT ACTION PRECAUTIONS:</span> Evacuate lower siphoning channel paths immediately. Secure flow pumps.
                  </div>
                </div>
              </div>

              {/* Row 3: Recent Alerts Table & Live Camera Feeds Carousel */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-stretch">
                
                {/* Recent Alerts Table (Panel 1 list) */}
                <div className="xl:col-span-2 bg-[#0c101d] border border-slate-900 rounded-2xl p-6 flex flex-col justify-between shadow-2xl min-h-[300px]">
                  <div>
                    <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest border-b border-slate-900 pb-3 mb-4">
                      Recent Regional Alerts
                    </h3>
                  </div>

                  <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left font-mono text-xs border-collapse">
                      <thead>
                        <tr className="text-slate-500 border-b border-slate-900 pb-2">
                          <th className="py-2.5 font-bold uppercase">Location</th>
                          <th className="py-2.5 font-bold uppercase text-center">Alert Level</th>
                          <th className="py-2.5 font-bold uppercase">Incident Message</th>
                          <th className="py-2.5 font-bold uppercase text-right">Time Registered</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900/40">
                        {dashboardState.stations.map((st) => (
                          <tr
                            key={st.id + '_rec'}
                            onClick={() => handleSelectStation(st.id)}
                            className="text-slate-300 hover:bg-slate-900/30 cursor-pointer"
                          >
                            <td className="py-2.5 font-bold">{st.name.split(' ')[0]} Area</td>
                            <td className="py-2.5 text-center">
                              <span className={`border px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${
                                st.status === 'DANGER' ? 'bg-red-500/10 border-red-500/30 text-red-400' : st.status === 'WARNING' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                              }`}>
                                {st.status === 'DANGER' ? 'High' : st.status === 'WARNING' ? 'Warning' : 'Safe'}
                              </span>
                            </td>
                            <td className="py-2.5 text-slate-450 truncate max-w-[200px]">
                              {st.status === 'DANGER' ? 'Tension limit breach! Column snap risk.' : st.status === 'WARNING' ? 'High siphon shear-thinning rate.' : 'Stable non-Newtonian behavior.'}
                            </td>
                            <td className="py-2.5 text-right text-slate-500">
                              {st.status === 'DANGER' ? '10 min ago' : st.status === 'WARNING' ? '25 min ago' : '1 hour ago'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Live Camera Feeds (Carousel Slide component) */}
                <div className="xl:col-span-1 bg-[#0c101d] border border-slate-900 rounded-2xl p-6 flex flex-col justify-between shadow-2xl min-h-[300px] relative overflow-hidden">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-3 mb-4 z-10">
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest flex items-center gap-1.5">
                      <span>Live Camera Feeds</span>
                    </h3>
                    <span className="flex items-center gap-1 bg-red-500/15 border border-red-500/25 text-red-500 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider animate-[pulse_1s_infinite]">
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                      LIVE FEED
                    </span>
                  </div>

                  {/* Carousel Display Image and text */}
                  <div className="flex-1 flex flex-col justify-between z-10">
                    <div className="relative h-[150px] w-full rounded-xl overflow-hidden border border-slate-900 bg-slate-950">
                      <img
                        src={CAMERA_FEED_SLIDES[activeSlideIdx].url}
                        alt="Channel Feed"
                        className="w-full h-full object-cover opacity-85 hover:scale-102 transition-all duration-500"
                      />
                      
                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none"></div>

                      {/* Direction sliders overlay buttons */}
                      <button
                        onClick={handlePrevSlide}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-slate-950/70 border border-slate-800 hover:bg-slate-900 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs font-black shadow-lg"
                      >
                        ◀
                      </button>
                      <button
                        onClick={handleNextSlide}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-slate-950/70 border border-slate-800 hover:bg-slate-900 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs font-black shadow-lg"
                      >
                        ▶
                      </button>

                      {/* Station Slide Badge */}
                      <div className="absolute bottom-2 left-3 text-[10px] font-mono font-bold text-slate-100 uppercase">
                        {CAMERA_FEED_SLIDES[activeSlideIdx].title}
                      </div>
                    </div>

                    {/* Navigation dot markers */}
                    <div className="flex justify-center gap-1.5 mt-4">
                      {CAMERA_FEED_SLIDES.map((_, idx) => (
                        <button
                          key={'slide-dot-' + idx}
                          onClick={() => setActiveSlideIdx(idx)}
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            activeSlideIdx === idx ? 'w-5 bg-purple-500' : 'w-1.5 bg-slate-800'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* Tab 2: Live Geographic Map */}
          {dashboardState.active_tab === 'map' && (
            <div className="h-full">
              <GeographicMap
                stations={dashboardState.stations}
                activeStationId={dashboardState.active_station_id}
                onSelectStation={handleSelectStation}
              />
            </div>
          )}

          {/* Tab 3: Detailed Water Level & Circuit telemetry */}
          {dashboardState.active_tab === 'levels' && (
            <div className="space-y-6">
              <CircuitMetrics
                stations={dashboardState.stations}
                activeStationId={dashboardState.active_station_id}
                onSelectStation={handleSelectStation}
              />

              {/* Water Level detailed list table matching mockup */}
              <div className="bg-[#0b0f19] border border-slate-800/80 rounded-2xl p-6 relative overflow-hidden shadow-2xl">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest border-b border-slate-800/60 pb-3 mb-4">
                  Water Level Monitoring Registers
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-xs border-collapse">
                    <thead>
                      <tr className="text-slate-500 border-b border-slate-900 pb-2">
                        <th className="py-2.5 font-bold uppercase">Location Station</th>
                        <th className="py-2.5 font-bold uppercase text-right">Current Level (m)</th>
                        <th className="py-2.5 font-bold uppercase text-center">Risk Level</th>
                        <th className="py-2.5 font-bold uppercase text-center">Trend Flow</th>
                        <th className="py-2.5 font-bold uppercase text-right">Last Synchronized</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900/40">
                      {dashboardState.stations.map((st) => {
                        const levelVal = (st.metrics.height_cm * 0.04).toFixed(2);
                        
                        let trendArrow = '→';
                        let trendColor = 'text-slate-500';
                        if (st.status === 'DANGER') {
                          trendArrow = '↑';
                          trendColor = 'text-red-400 font-bold';
                        } else if (st.status === 'WARNING') {
                          trendArrow = '↑';
                          trendColor = 'text-amber-400';
                        } else if (st.id === 'phulbari') {
                          trendArrow = '↓';
                          trendColor = 'text-emerald-400';
                        }

                        return (
                          <tr
                            key={st.id + '_detailed'}
                            onClick={() => handleSelectStation(st.id)}
                            className={`text-slate-300 hover:bg-slate-900/30 cursor-pointer ${
                              st.id === dashboardState.active_station_id ? 'bg-slate-900/20' : ''
                            }`}
                          >
                            <td className="py-3 font-semibold text-slate-100">{st.name}</td>
                            <td className="py-3 text-right font-black text-slate-200">{levelVal} m</td>
                            <td className="py-3 text-center">
                              <span className={`border px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                st.status === 'DANGER' ? 'bg-red-500/10 border-red-500/30 text-red-400 animate-pulse' : st.status === 'WARNING' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                              }`}>
                                {st.status === 'DANGER' ? 'High Danger' : st.status === 'WARNING' ? 'Warning' : 'Safe'}
                              </span>
                            </td>
                            <td className={`py-3 text-center text-base ${trendColor}`}>{trendArrow}</td>
                            <td className="py-3 text-right text-slate-500">
                              {new Date(st.metrics.timestamp).toLocaleTimeString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Subscriber Alerts Panel */}
          {dashboardState.active_tab === 'alerts' && (
            <div className="h-full">
              <AlertsPanel
                stations={dashboardState.stations}
                subscribers={dashboardState.subscribers}
                dispatchLogs={dashboardState.dispatch_logs}
                onManualBroadcast={handleManualBroadcast}
              />
            </div>
          )}

          {/* Tab 5: Atmospheric Weather Forecasts */}
          {dashboardState.active_tab === 'weather' && (
            <div className="h-full">
              <WeatherPanel weather={dashboardState.weather} />
            </div>
          )}

          {/* Tab 6: Weekly reports & Analytics */}
          {dashboardState.active_tab === 'reports' && (
            <div className="h-full">
              <ReportsPanel activeStationName={activeStation.name} />
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default App;

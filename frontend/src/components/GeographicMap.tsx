import React from 'react';
import { PilotStation } from '../types/types';

interface GeographicMapProps {
  stations: PilotStation[];
  activeStationId: string;
  onSelectStation: (id: string) => void;
}

export const GeographicMap: React.FC<GeographicMapProps> = ({
  stations,
  activeStationId,
  onSelectStation,
}) => {
  return (
    <div className="w-full bg-[#0b0f19] border border-slate-800/80 rounded-2xl p-6 relative overflow-hidden flex flex-col min-h-[460px] h-full shadow-2xl">
      {/* Decorative cyber grids */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:24px_24px] opacity-10 pointer-events-none"></div>
      <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/5 via-purple-500/5 to-transparent pointer-events-none"></div>

      {/* Map Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 z-10 gap-3 border-b border-slate-800/60 pb-4">
        <div>
          <h2 className="text-base font-bold text-slate-100 uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span>
            Geographic Fluid Network Map
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Upper Awash Basin Regional Anti-Gravity Snot Polymer Heatmap</p>
        </div>
        <div className="flex flex-wrap gap-2 text-[10px] uppercase font-bold tracking-wider">
          <span className="flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 text-red-400 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-[pulse_0.6s_infinite]"></span>
            1 Danger Breach
          </span>
          <span className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            1 Warning Pulse
          </span>
          <span className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            3 Safe Nodes
          </span>
        </div>
      </div>

      {/* Interactive Map Area */}
      <div className="flex-1 w-full bg-[#080b13] border border-slate-800/40 rounded-xl relative overflow-hidden flex items-center justify-center min-h-[340px]">
        {/* Heatmap filter definitions */}
        <svg className="absolute w-full h-full inset-0 pointer-events-none" style={{ filter: 'drop-shadow(0px 0px 8px rgba(0, 0, 0, 0.5))' }}>
          <defs>
            <radialGradient id="dangerHeat" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.45" />
              <stop offset="50%" stopColor="#a855f7" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="warningHeat" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.35" />
              <stop offset="60%" stopColor="#6366f1" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="polymerFlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#c084fc" stopOpacity="0.25" />
              <stop offset="40%" stopColor="#22d3ee" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Basin Contour Outline (SVG paths) */}
          <path
            d="M 50,50 Q 150,20 280,40 T 520,80 T 640,180 T 580,310 T 360,340 T 150,280 Z"
            fill="none"
            stroke="#1e293b"
            strokeWidth="2.5"
            strokeDasharray="4 4"
            opacity="0.8"
          />

          {/* River channels (SVG Path) styled nicely */}
          <path
            d="M 80,120 Q 180,110 240,150 T 360,160 T 430,220 T 560,200"
            fill="none"
            stroke="#22d3ee"
            strokeWidth="3.5"
            strokeLinecap="round"
            opacity="0.75"
            className="animate-[dash_8s_linear_infinite]"
            style={{
              strokeDasharray: '12 8',
            }}
          />
          <path
            d="M 120,60 Q 200,90 240,150"
            fill="none"
            stroke="#0284c7"
            strokeWidth="2"
            opacity="0.5"
          />
          <path
            d="M 310,290 Q 340,220 360,160"
            fill="none"
            stroke="#0284c7"
            strokeWidth="2"
            opacity="0.5"
          />

          {/* Heatmap radial flow overlays centered on coordinates */}
          {/* Birampur Danger Heatmap */}
          <circle cx="280" cy="180" r="130" fill="url(#dangerHeat)" className="animate-[pulse_4s_ease-in-out_infinite]" />
          {/* Sundarganj Warning Heatmap */}
          <circle cx="480" cy="220" r="100" fill="url(#warningHeat)" className="animate-[pulse_6s_ease-in-out_infinite]" />
          {/* General Polymer Logic flow heatmap path */}
          <path
            d="M 280,180 Q 380,170 480,220"
            fill="none"
            stroke="#d946ef"
            strokeWidth="30"
            strokeLinecap="round"
            opacity="0.12"
            style={{ filter: 'blur(12px)' }}
          />
        </svg>

        {/* Satellite Map Label */}
        <div className="absolute top-4 left-4 z-10 bg-slate-950/80 border border-slate-800/80 px-3 py-1.5 rounded-lg text-xs font-mono font-bold tracking-wider text-slate-300">
          📍 UPPER AWASH REGIONAL GRID
        </div>

        {/* Scale/Compass Widget */}
        <div className="absolute bottom-4 right-4 z-10 bg-slate-950/70 border border-slate-800/60 p-2 rounded-lg text-[9px] font-mono text-slate-400 space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-300">SYSTEM:</span> TEKT-05 ACTIVE
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-300">SCALE:</span> 1 : 25,000
          </div>
          <div className="h-1 bg-slate-800 rounded relative overflow-hidden">
            <div className="absolute left-0 top-0 h-full w-1/2 bg-cyan-500"></div>
          </div>
        </div>

        {/* Live updates log overlay */}
        <div className="absolute bottom-4 left-4 z-10 w-[230px] hidden md:block bg-slate-950/90 border border-slate-800/60 rounded-xl p-3.5 backdrop-blur-md">
          <h4 className="text-[10px] font-bold text-[#c084fc] uppercase tracking-widest mb-2 border-b border-slate-800 pb-1 flex justify-between">
            Live Feed Log
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
          </h4>
          <div className="space-y-2 text-[9px] font-mono text-slate-300">
            <div className="flex justify-between items-start gap-1">
              <span className="text-red-400 font-bold">[10m ago]</span>
              <span className="flex-1 text-slate-400">Birampur ADC breach: 924 value.</span>
            </div>
            <div className="flex justify-between items-start gap-1">
              <span className="text-amber-400 font-bold">[25m ago]</span>
              <span className="flex-1 text-slate-400">Sundarganj Siphon tension 420Pa.</span>
            </div>
            <div className="flex justify-between items-start gap-1">
              <span className="text-emerald-400 font-bold">[1h ago]</span>
              <span className="flex-1 text-slate-400">Chirbandar stability safe.</span>
            </div>
          </div>
        </div>

        {/* Plotting the 5 Interactive Station Pins */}
        {/* We place them at specific absolute positions mimicking the map visual layout */}
        {stations.map((st) => {
          let x = 280;
          let y = 180;
          
          if (st.id === 'birampur') { x = 280; y = 180; }
          else if (st.id === 'sundarganj') { x = 480; y = 220; }
          else if (st.id === 'chirbandar') { x = 380; y = 140; }
          else if (st.id === 'phulbari') { x = 210; y = 240; }
          else if (st.id === 'kaharole') { x = 430; y = 90; }

          const isActive = st.id === activeStationId;

          // Compute color codes for statuses
          const statusStyles = {
            DANGER: {
              pinColor: 'bg-red-500 border-red-300',
              pulseColor: 'bg-red-500 animate-[ping_0.8s_infinite]',
              textColor: 'text-red-400',
              badgeColor: 'border-red-500/40 bg-red-500/10 text-red-400',
            },
            WARNING: {
              pinColor: 'bg-amber-500 border-amber-300',
              pulseColor: 'bg-amber-500 animate-[ping_1.5s_infinite]',
              textColor: 'text-amber-400',
              badgeColor: 'border-amber-500/40 bg-amber-500/10 text-amber-400',
            },
            SAFE: {
              pinColor: 'bg-emerald-500 border-emerald-300',
              pulseColor: 'bg-emerald-500 animate-pulse',
              textColor: 'text-emerald-400',
              badgeColor: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400',
            }
          }[st.status];

          return (
            <button
              key={st.id}
              onClick={() => onSelectStation(st.id)}
              style={{ left: `${x}px`, top: `${y}px` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 group focus:outline-none z-20 flex flex-col items-center cursor-pointer"
            >
              {/* Pulsing glow underlay */}
              <div className={`absolute w-8 h-8 rounded-full opacity-35 ${statusStyles.pulseColor}`}></div>
              
              {/* Outer boundary pin */}
              <div className={`relative w-4.5 h-4.5 rounded-full border-2 shadow-2xl flex items-center justify-center transition-all duration-300
                ${statusStyles.pinColor}
                ${isActive ? 'scale-135 ring-4 ring-cyan-400/50' : 'group-hover:scale-115'}
              `}>
                <div className="w-1.5 h-1.5 rounded-full bg-slate-950"></div>
              </div>

              {/* Tag tooltip label */}
              <div className={`mt-2 flex flex-col items-center bg-[#070a13]/90 border px-2.5 py-1.5 rounded-lg shadow-xl backdrop-blur-sm transition-all duration-200 min-w-[120px]
                ${isActive ? 'border-cyan-400/60 scale-105 shadow-cyan-500/5' : 'border-slate-800/80 group-hover:border-slate-700'}
              `}>
                <span className="text-[10px] font-bold text-slate-200 tracking-wide text-center leading-tight">
                  {st.name.split(' ')[0]} {st.name.split(' ')[1]}
                </span>
                <span className={`text-[8px] font-mono mt-0.5 border px-1.5 py-0.5 rounded-full font-black uppercase ${statusStyles.badgeColor}`}>
                  {st.status}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Map Legend info footer */}
      <div className="grid grid-cols-5 gap-3 mt-4 border-t border-slate-800/40 pt-4 text-xs font-mono">
        {stations.map((st) => (
          <button
            key={st.id + '_legend'}
            onClick={() => onSelectStation(st.id)}
            className={`flex flex-col p-2.5 rounded-xl border text-left transition-all duration-200
              ${st.id === activeStationId 
                ? 'bg-slate-900 border-[#c084fc]/50 shadow-md shadow-[#c084fc]/5' 
                : 'bg-[#080c14] border-slate-800/40 hover:border-slate-800 hover:bg-slate-900/50'}`}
          >
            <span className="text-[10px] text-slate-400 truncate font-semibold leading-tight">{st.name.split(' ')[0]} Area</span>
            <div className="flex items-center justify-between mt-1">
              <span className={`text-[9px] font-bold ${
                st.status === 'DANGER' ? 'text-red-400' : st.status === 'WARNING' ? 'text-amber-400' : 'text-emerald-400'
              }`}>{st.status}</span>
              <span className="text-[9px] text-slate-500 font-bold">{st.adc_value} ADC</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

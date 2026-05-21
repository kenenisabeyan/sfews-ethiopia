import React from 'react';
import { PilotStation } from '../types/types';

interface CircuitMetricsProps {
  stations: PilotStation[];
  activeStationId: string;
  onSelectStation: (id: string) => void;
}

export const CircuitMetrics: React.FC<CircuitMetricsProps> = ({
  stations,
  activeStationId,
  onSelectStation,
}) => {
  return (
    <div className="w-full bg-[#0b0f19] border border-slate-800/80 rounded-2xl p-6 relative overflow-hidden flex flex-col h-full shadow-2xl">
      {/* Visual cyber mesh grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:32px_32px] opacity-[0.05] pointer-events-none"></div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 z-10 gap-3 border-b border-slate-800/60 pb-4">
        <div>
          <h2 className="text-base font-bold text-slate-100 uppercase tracking-widest flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-cyan-400 rounded-sm animate-pulse"></span>
            Real-Time Circuit Execution Metrics
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Physical Microcontroller ADC Registers & GPIO Hardware Outputs</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 px-3.5 py-1.5 rounded-lg text-[10px] font-mono text-slate-300">
          MCU COMPILER: <span className="text-emerald-400 font-bold">ONLINE</span> (FW v2.4.12)
        </div>
      </div>

      {/* Grid of 5 pilot station microcontroller cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5 z-10">
        {stations.map((st) => {
          const isActive = st.id === activeStationId;

          // Color schemes
          const statusStyles = {
            DANGER: {
              cardBorder: isActive ? 'border-red-500 shadow-lg shadow-red-500/5' : 'border-red-950/60 hover:border-red-500/50',
              text: 'text-red-400',
              badge: 'bg-red-500/10 border-red-500/30 text-red-400',
              barFill: 'bg-gradient-to-r from-red-500 to-pink-500',
              ledGlow: 'bg-red-500 shadow-[0_0_12px_#ef4444]',
              buzzerGlow: 'bg-purple-500 shadow-[0_0_12px_#a855f7]',
            },
            WARNING: {
              cardBorder: isActive ? 'border-amber-500 shadow-lg shadow-amber-500/5' : 'border-amber-950/60 hover:border-amber-500/50',
              text: 'text-amber-400',
              badge: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
              barFill: 'bg-gradient-to-r from-amber-500 to-yellow-500',
              ledGlow: 'bg-amber-500 shadow-[0_0_12px_#f59e0b]',
              buzzerGlow: 'bg-slate-800',
            },
            SAFE: {
              cardBorder: isActive ? 'border-indigo-500 shadow-lg shadow-indigo-500/5' : 'border-slate-800/80 hover:border-indigo-500/40',
              text: 'text-emerald-400',
              badge: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
              barFill: 'bg-gradient-to-r from-emerald-500 to-cyan-500',
              ledGlow: 'bg-slate-800',
              buzzerGlow: 'bg-slate-800',
            }
          }[st.status];

          return (
            <div
              key={st.id}
              onClick={() => onSelectStation(st.id)}
              className={`bg-[#080b13] border rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 cursor-pointer relative group overflow-hidden
                ${statusStyles.cardBorder}
                ${isActive ? 'scale-102 bg-[#090e1b]' : 'hover:bg-slate-900/40'}
              `}
            >
              {/* Active neon pointer flag */}
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 h-1 w-16 bg-gradient-to-r from-cyan-400 to-indigo-500 rounded-b"></div>
              )}

              {/* Station Identity block */}
              <div>
                <div className="flex justify-between items-start gap-1.5 mb-2">
                  <span className="text-xs font-bold text-slate-100 leading-tight tracking-wide truncate group-hover:text-cyan-300 transition-colors">
                    {st.name.split(' ')[0]} Station
                  </span>
                  <span className="text-[9px] font-mono text-slate-500">ID: {st.id.slice(0,3).toUpperCase()}</span>
                </div>
                
                {/* Lat/Long Metadata */}
                <div className="text-[9px] font-mono text-slate-500 mb-4">
                  GPS: {st.lat.toFixed(4)}°N, {st.lng.toFixed(4)}°E
                </div>

                {/* Operational Badge */}
                <div className="flex justify-between items-center mb-4 border-b border-slate-900 pb-3">
                  <span className={`text-[9px] font-mono font-black border px-2 py-0.5 rounded-full uppercase ${statusStyles.badge}`}>
                    STATUS:{st.status}
                  </span>
                  <span className="text-[9px] font-mono font-bold text-slate-500 flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${st.is_online ? 'bg-emerald-400' : 'bg-slate-600'}`}></span>
                    {st.is_online ? 'ONLINE' : 'OFFLINE'}
                  </span>
                </div>

                {/* Analog-to-Digital Converter Register (ADC) */}
                <div className="space-y-1.5 mb-4">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-slate-400 font-bold">ADC Register</span>
                    <span className={`font-black ${statusStyles.text}`}>{st.adc_value} / 1023</span>
                  </div>
                  <div className="h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${statusStyles.barFill}`}
                      style={{ width: `${(st.adc_value / 1023) * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* Circuit Node Telemetry Table */}
                <div className="bg-[#05080f] border border-slate-900 rounded-xl p-3.5 space-y-2 mb-4 font-mono text-[9px] text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-500">HEIGHT:</span>
                    <span className="text-purple-400 font-bold">{st.metrics.height_cm.toFixed(1)} cm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">VELOCITY:</span>
                    <span className="text-amber-400 font-bold">{st.metrics.climbing_velocity_cms.toFixed(1)} cm/s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">TENSILE:</span>
                    <span className="text-cyan-400 font-bold">{st.metrics.tensile_stress_pa.toFixed(1)} Pa</span>
                  </div>
                </div>
              </div>

              {/* Physical GPIO Compiler Outputs & Logic Gate Schematics */}
              <div className="border-t border-slate-900 pt-3 mt-1 space-y-3">
                <div className="text-[9px] font-mono text-slate-400 font-bold border-b border-slate-950 pb-1.5">
                  HARDWARE PINOUT CONFIG:
                </div>
                
                {/* Physical pinouts */}
                <div className="flex justify-between items-center text-[9px] font-mono">
                  {/* Pin 12 - Warning LED indicator */}
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${statusStyles.ledGlow}`}></div>
                    <div>
                      <span className="text-slate-500">PIN 12:</span>{' '}
                      <span className={st.gpio_led ? 'text-cyan-400 font-bold' : 'text-slate-600'}>
                        {st.gpio_led ? 'LED_ON' : 'LED_OFF'}
                      </span>
                    </div>
                  </div>

                  {/* Pin 13 - Audio Threshold Buzzer */}
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2.5 h-2.5 rounded-sm transition-all duration-300 ${statusStyles.buzzerGlow}`}></div>
                    <div>
                      <span className="text-slate-500">PIN 13:</span>{' '}
                      <span className={st.gpio_buzzer ? 'text-purple-400 font-bold animate-pulse' : 'text-slate-600'}>
                        {st.gpio_buzzer ? 'BUZZ_HI' : 'BUZZ_LO'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Implied Logic Gate Block diagram */}
                <div className="bg-[#03060c] border border-slate-950/60 p-2.5 rounded-lg text-[7.5px] font-mono leading-relaxed space-y-1">
                  <div className="text-slate-500 flex justify-between border-b border-slate-900 pb-1">
                    <span>LOGIC FLOW REGISTER:</span>
                    <span className="text-indigo-400 font-bold">ARMED</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>ADC &gt; 600</span>
                    <span className="text-slate-600">→</span>
                    <span className={st.gpio_led ? 'text-[#c084fc] font-bold' : 'text-slate-700'}>LED_REG = 1</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Stress &gt; 500</span>
                    <span className="text-slate-600">→</span>
                    <span className={st.gpio_buzzer ? 'text-[#c084fc] font-bold' : 'text-slate-700'}>BUZZ_REG = 1</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

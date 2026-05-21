import React from 'react';
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts';
import { FluidTelemetryEntry } from '../types/types';

interface FluidChartProps {
  data: FluidTelemetryEntry[];
  stationName: string;
}

/** Formats timestamps for display: HH:MM:SS */
const formatTimestamp = (isoString: string): string => {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  } catch {
    return '';
  }
};

/** High-fidelity chart sampler tooltip */
const CustomFluidTooltip: React.FC<TooltipProps<number, string>> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as FluidTelemetryEntry;
    const adcValue = Math.min(1023, Math.round(data.height_cm * 4));
    
    return (
      <div className="bg-[#030712]/95 border border-cyan-500/30 rounded-2xl p-5 shadow-2xl backdrop-blur-md min-w-[280px]">
        <div className="text-slate-400 font-mono text-[10px] mb-3 flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="font-bold text-cyan-400">TELEMETRY FRAME SAMPLER</span>
          <span>{formatTimestamp(label)}</span>
        </div>
        <div className="space-y-2.5">
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-slate-300 font-medium">Rise Index (ADC):</span>
            <span className="font-black text-cyan-400">{adcValue} <span className="text-[10px] font-normal text-slate-500">pts</span></span>
          </div>
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-slate-300 font-medium">Internal Siphon Stress:</span>
            <span className="font-black text-indigo-400">{data.tensile_stress_pa.toFixed(1)} <span className="text-[10px] font-normal text-slate-500">Pa</span></span>
          </div>
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-slate-300 font-medium">Flow Rate:</span>
            <span className="font-black text-amber-400">{data.climbing_velocity_cms.toFixed(1)} <span className="text-[10px] font-normal text-slate-500">cm/s</span></span>
          </div>
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-slate-300 font-medium">Apparent Viscosity:</span>
            <span className="font-black text-emerald-400">{data.apparent_viscosity_pas.toFixed(1)} <span className="text-[10px] font-normal text-slate-500">Pa·s</span></span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export const FluidChart: React.FC<FluidChartProps> = ({ data, stationName }) => {
  // Pre-process data to map raw height to Rise Elevation Index (ADC, scaled 0-1023)
  const chartData = data.map((entry) => ({
    ...entry,
    adc_elevation: Math.min(1023, Math.round(entry.height_cm * 4)),
  }));

  return (
    <div className="w-full h-full min-h-[420px] bg-[#0b0f19] border border-slate-800/80 rounded-2xl p-6 relative overflow-hidden flex flex-col shadow-2xl">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-indigo-500/5 to-transparent pointer-events-none"></div>
      
      {/* Chart Headers */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 z-10 gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-100 tracking-wider uppercase flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
            Historical Fluid Mechanics Analytics ({stationName.split(' ')[0]})
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Correlation profile of siphoning Rise Elevation Index (ADC) and Internal Tensile Stress (Pa)</p>
        </div>
        <div className="flex items-center gap-4 text-[10px] font-bold tracking-wider uppercase font-mono">
          <div className="flex items-center gap-2 bg-cyan-400/10 border border-cyan-400/20 px-3 py-1.5 rounded-lg text-cyan-400">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            Rise Index (ADC)
          </div>
          <div className="flex items-center gap-2 bg-indigo-400/10 border border-indigo-400/20 px-3 py-1.5 rounded-lg text-indigo-400">
            <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
            Stress (Pa)
          </div>
        </div>
      </div>

      {/* Recharts Wrapper */}
      <div className="flex-1 w-full relative min-h-[320px]">
        {chartData.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-slate-600 font-mono text-xs">
            Awaiting telemetry sensor streaming...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: -5, left: -25, bottom: 0 }}>
              <defs>
                {/* Custom blue-to-cyan-to-indigo gradient fill */}
                <linearGradient id="colorAdc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.45} />
                  <stop offset="50%" stopColor="#6366f1" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#c084fc" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#0f172a" vertical={false} opacity={0.6} />
              
              <XAxis
                dataKey="timestamp"
                stroke="#475569"
                fontSize={10}
                tickFormatter={formatTimestamp}
                tickMargin={12}
                axisLine={false}
                tickLine={false}
              />
              
              <YAxis
                yAxisId="left"
                stroke="#22d3ee"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickMargin={12}
                domain={[0, 1023]}
                unit="pt"
              />
              
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#818cf8"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickMargin={12}
                domain={[0, 'auto']}
                unit="Pa"
              />
              
              <Tooltip content={<CustomFluidTooltip />} />
              
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="adc_elevation"
                stroke="#22d3ee"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorAdc)"
                activeDot={{ r: 6, strokeWidth: 0, fill: '#22d3ee' }}
              />
              
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="tensile_stress_pa"
                stroke="#6366f1"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 6, strokeWidth: 0, fill: '#6366f1' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

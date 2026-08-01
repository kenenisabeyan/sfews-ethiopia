import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { HydroLog } from '../../types';

interface HydroChartProps {
  history: HydroLog[];
}

const HydroChart: React.FC<HydroChartProps> = ({ history }) => {
  return (
    <div className="bg-[#090d16] border border-slate-800/70 rounded-2xl p-7 shadow-2xl h-full min-h-[500px] flex flex-col">
      <div className="mb-8">
        <h2 className="text-lg font-bold text-slate-200 tracking-wide uppercase">
          Basin Hydrological Trends
        </h2>
        <p className="text-sm text-slate-500 mt-1 font-medium">
          Real-time correlation of water elevation and precipitation across the network
        </p>
      </div>

      <div className="flex-1 w-full relative min-h-[400px]">
        {history.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-slate-500 font-medium">
            Awaiting telemetry data from Awash River Basin sensors...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorWater" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorRain" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" stroke="#1e293b" vertical={false} opacity={0.6} />
              <XAxis
                dataKey="timestamp"
                stroke="#475569"
                fontSize={11}
                tickFormatter={(val) => new Date(val).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                tickMargin={12}
                axisLine={false}
              />
              <YAxis
                stroke="#475569"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickMargin={12}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#030712',
                  borderColor: '#1e293b',
                  borderRadius: '1rem',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
                  padding: '1rem',
                }}
                itemStyle={{ color: '#f8fafc', fontWeight: 600 }}
                labelStyle={{ color: '#64748b', marginBottom: '0.75rem', fontWeight: 700, fontSize: '0.875rem' }}
                labelFormatter={(val) => new Date(val).toLocaleString()}
              />
              <Area
                type="monotone"
                dataKey="waterLevelCm"
                name="Water Level (cm)"
                stroke="#3b82f6"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorWater)"
                activeDot={{ r: 6, strokeWidth: 0, fill: '#3b82f6' }}
              />
              <Area
                type="monotone"
                dataKey="rainfallRateMm"
                name="Rainfall (mm/h)"
                stroke="#22d3ee"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorRain)"
                activeDot={{ r: 6, strokeWidth: 0, fill: '#22d3ee' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default HydroChart;

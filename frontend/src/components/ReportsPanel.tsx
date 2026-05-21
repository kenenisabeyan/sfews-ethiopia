import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface ReportsPanelProps {
  activeStationName: string;
}

export const ReportsPanel: React.FC<ReportsPanelProps> = ({ activeStationName }) => {
  // Mock weekly summary chart data matching the mockup exactly
  const summaryChartData = [
    { name: 'May 10', level: 5.2 },
    { name: 'May 11', level: 6.4 },
    { name: 'May 12', level: 4.8 },
    { name: 'May 13', level: 7.1 },
    { name: 'May 14', level: 5.9 },
    { name: 'May 15', level: 7.8 },
    { name: 'May 16', level: 8.5 },
  ];

  return (
    <div className="w-full bg-[#0b0f19] border border-slate-800/80 rounded-2xl p-6 relative overflow-hidden flex flex-col h-full shadow-2xl">
      {/* Visual background glow */}
      <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/5 to-transparent pointer-events-none"></div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 z-10 gap-3 border-b border-slate-800/60 pb-4">
        <div>
          <h2 className="text-base font-bold text-slate-100 uppercase tracking-widest flex items-center gap-2">
            📊 Reports & Analytical Timelines
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Historical Regional Fluidity and Stress Accumulations</p>
        </div>
        
        <button
          onClick={() => alert('Engineering PDF Report compilation successfully compiled and queued.')}
          className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[10px] uppercase tracking-wider px-3.5 py-2 rounded-lg border border-cyan-500/30 transition-all shadow-md shadow-cyan-600/15"
        >
          Generate Report PDF
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-stretch z-10">
        
        {/* KPI Summary Cards Grid */}
        <div className="xl:col-span-1 flex flex-col justify-between gap-4">
          
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-900 pb-2">
            Active Summary Report (Last 7 Days)
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            {/* Stat 1: Total Alerts */}
            <div className="bg-[#080c14] border border-slate-900 p-4.5 rounded-xl flex flex-col justify-between min-h-[100px]">
              <span className="text-[9px] font-mono text-slate-500 uppercase font-bold">Total Alert Hits</span>
              <div className="text-2xl font-black text-slate-100 font-mono mt-2">24</div>
              <span className="text-[8px] font-mono text-emerald-400 mt-1">✓ Stable Gateway</span>
            </div>

            {/* Stat 2: High Alerts */}
            <div className="bg-[#080c14] border border-slate-900 p-4.5 rounded-xl flex flex-col justify-between min-h-[100px]">
              <span className="text-[9px] font-mono text-slate-500 uppercase font-bold">Severe Incidents</span>
              <div className="text-2xl font-black text-red-400 font-mono mt-2">8</div>
              <span className="text-[8px] font-mono text-red-500/60 mt-1">⚠️ Action Req.</span>
            </div>

            {/* Stat 3: Avg level */}
            <div className="bg-[#080c14] border border-slate-900 p-4.5 rounded-xl flex flex-col justify-between min-h-[100px]">
              <span className="text-[9px] font-mono text-slate-500 uppercase font-bold">Avg Water Height</span>
              <div className="text-2xl font-black text-[#c084fc] font-mono mt-2">4.52 m</div>
              <span className="text-[8px] font-mono text-slate-500 mt-1">Normal baseline</span>
            </div>

            {/* Stat 4: Rainfall */}
            <div className="bg-[#080c14] border border-slate-900 p-4.5 rounded-xl flex flex-col justify-between min-h-[100px]">
              <span className="text-[9px] font-mono text-slate-500 uppercase font-bold">Total Rainfall</span>
              <div className="text-2xl font-black text-cyan-400 font-mono mt-2">2.45 in</div>
              <span className="text-[8px] font-mono text-cyan-500/60 mt-1">Accumulated</span>
            </div>
          </div>

          <div className="bg-slate-950/70 border border-slate-900/60 rounded-xl p-4 text-[9.5px] font-mono text-slate-400 space-y-2 mt-2">
            <div className="text-slate-300 font-bold border-b border-slate-900 pb-1">
              REPORT AUDIT DESCRIPTIONS:
            </div>
            <p>
              Analytical summary plots metrics from the active monitoring point (<span className="text-cyan-400 font-bold">{activeStationName.split(' ')[0]}</span>).
            </p>
            <p>
              Non-Newtonian polymer column dimensions show high-shear elastic siphoning. Tensile indexes remain within calibrated margins.
            </p>
          </div>
        </div>

        {/* Weekly Water Level Bar Chart */}
        <div className="xl:col-span-2 bg-[#080c14] border border-slate-900 rounded-2xl p-6 flex flex-col justify-between min-h-[300px]">
          <div>
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest mb-1">
              Water Level Summary (Last 7 Days)
            </h3>
            <p className="text-[10px] text-slate-500 font-medium">Weekly water elevation levels across regional command grids</p>
          </div>

          <div className="flex-1 w-full h-[220px] relative mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summaryChartData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#c084fc" stopOpacity={0.85} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.15} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#0f172a" vertical={false} opacity={0.6} />
                <XAxis
                  dataKey="name"
                  stroke="#475569"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                />
                <YAxis
                  stroke="#475569"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  unit="m"
                />
                <Tooltip
                  cursor={{ fill: '#1e293b', opacity: 0.15 }}
                  contentStyle={{
                    backgroundColor: '#030712',
                    borderColor: '#c084fc',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    color: '#e2e8f0',
                  }}
                />
                <Bar
                  dataKey="level"
                  fill="url(#barGradient)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={45}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
};

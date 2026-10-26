import React, { useState } from 'react';
import { SensorNode } from '../types';

interface WaterLevelsPanelProps {
  nodes: SensorNode[];
  broadcastEmergencySMS: (node: SensorNode) => void;
}

export const WaterLevelsPanel: React.FC<WaterLevelsPanelProps> = ({
  nodes,
  broadcastEmergencySMS,
}) => {
  const [levelFilter, setLevelFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredNodes = nodes.filter((node) => {
    const matchesFilter = levelFilter === 'All' || node.currentRisk === levelFilter;
    const matchesSearch =
      node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      node.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getAlertColors = (risk?: string) => {
    switch (risk) {
      case 'Safe':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'Warning':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'Critical':
        return 'text-red-400 bg-red-500/10 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]';
      default:
        return 'text-slate-400 bg-slate-800/50 border-slate-700/50';
    }
  };

  return (
    <div className="glass-panel rounded-2xl sm:rounded-3xl p-4 sm:p-7 space-y-4 sm:space-y-6">
      {/* Search Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 border-b border-slate-900/60 pb-4 sm:pb-6">
        <div>
          <h2 className="text-base sm:text-lg font-extrabold text-slate-100 tracking-wide uppercase">
            Hydrological Telemetry Database
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 font-bold uppercase tracking-wider">
            Execute queries, filter, and inspect station level registries
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center w-full md:w-auto">
          {/* Search Bar Input */}
          <div className="relative w-full sm:w-64">
            <svg
              className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search by name, ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#050911]/80 border border-slate-900 text-slate-300 placeholder-slate-600 text-xs px-10 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl focus:outline-none focus:border-indigo-500/40 transition-colors w-full"
            />
          </div>

          {/* Filter selections */}
          <div className="flex overflow-x-auto rounded-xl sm:rounded-2xl bg-[#050911]/80 border border-slate-900 p-1 no-scrollbar">
            {['All', 'Critical', 'Warning', 'Safe'].map((opt) => (
              <button
                key={opt}
                onClick={() => setLevelFilter(opt)}
                className={`flex-1 sm:flex-initial px-3 sm:px-4.5 py-1.5 sm:py-2.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold transition-all duration-200 uppercase tracking-widest text-center whitespace-nowrap
                  ${
                    levelFilter === opt
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/20'
                      : 'text-slate-500 hover:text-slate-300 border border-transparent'
                  }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile scroll hint */}
      <div className="md:hidden flex items-center justify-between text-[10px] font-mono text-slate-500 px-1">
        <span>Showing {filteredNodes.length} telemetry records</span>
        <span className="text-purple-400 font-bold">← Swipe table →</span>
      </div>

      {/* Database Tabular Grid View */}
      <div className="overflow-x-auto custom-scrollbar -mx-4 sm:mx-0 px-4 sm:px-0">
        <table className="w-full text-left border-collapse text-xs md:text-sm min-w-[680px]">
          <thead>
            <tr className="border-b border-slate-900 text-slate-400 font-extrabold uppercase tracking-widest text-[9px] sm:text-[10px]">
              <th className="py-3.5 sm:py-4.5 px-3 sm:px-6">Station / Node Details</th>
              <th className="py-3.5 sm:py-4.5 px-3 sm:px-6">Coordinates</th>
              <th className="py-3.5 sm:py-4.5 px-3 sm:px-6">Water Elevation</th>
              <th className="py-3.5 sm:py-4.5 px-3 sm:px-6">Rainfall rate</th>
              <th className="py-3.5 sm:py-4.5 px-3 sm:px-6">Battery Vital</th>
              <th className="py-3.5 sm:py-4.5 px-3 sm:px-6 text-center">Status</th>
              <th className="py-3.5 sm:py-4.5 px-3 sm:px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-900/60 font-semibold">
            {filteredNodes.length > 0 ? (
              filteredNodes.map((node) => (
                <tr key={node.id} className="hover:bg-slate-900/20 transition-all">
                  <td className="py-3.5 sm:py-5 px-3 sm:px-6">
                    <div className="font-bold text-slate-100">{node.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono uppercase mt-0.5">
                      {node.id}
                    </div>
                  </td>
                  <td className="py-3.5 sm:py-5 px-3 sm:px-6 font-mono text-slate-400 text-[11px] sm:text-xs">
                    {node.latitude.toFixed(4)}, {node.longitude.toFixed(4)}
                  </td>
                  <td className="py-3.5 sm:py-5 px-3 sm:px-6 font-mono text-indigo-400 font-extrabold text-xs sm:text-sm">
                    {node.waterLevelCm?.toFixed(1) || '0.0'} cm
                  </td>
                  <td className="py-3.5 sm:py-5 px-3 sm:px-6 font-mono text-cyan-400 font-extrabold text-xs sm:text-sm">
                    {node.rainfallRateMm?.toFixed(1) || '0.0'} mm/h
                  </td>
                  <td className="py-3.5 sm:py-5 px-3 sm:px-6">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-12 sm:w-16 bg-slate-900 border border-slate-800/80 rounded-full h-1.5 sm:h-2 overflow-hidden shrink-0">
                        <div
                          className={`h-full rounded-full ${
                            node.batteryLevel > 20 ? 'bg-emerald-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${node.batteryLevel}%` }}
                        ></div>
                      </div>
                      <span className="font-mono text-slate-400 text-[11px] sm:text-xs">{node.batteryLevel}%</span>
                    </div>
                  </td>
                  <td className="py-3.5 sm:py-5 px-3 sm:px-6 text-center">
                    <span
                      className={`px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider border inline-block ${getAlertColors(
                        node.currentRisk
                      )}`}
                    >
                      {node.currentRisk || 'STANDBY'}
                    </span>
                  </td>
                  <td className="py-3.5 sm:py-5 px-3 sm:px-6 text-right">
                    <button
                      onClick={() => broadcastEmergencySMS(node)}
                      className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-[#090e18] hover:bg-red-500/10 text-slate-300 hover:text-red-400 border border-slate-900 hover:border-red-500/20 text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap"
                    >
                      SMS Alert
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={7}
                  className="py-12 sm:py-16 text-center text-slate-500 font-bold uppercase tracking-widest font-mono text-xs"
                >
                  No telemetry records correspond to query parameters
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

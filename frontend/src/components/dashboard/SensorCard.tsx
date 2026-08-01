import React from 'react';
import type { SensorNode } from '../../types';
import { useToast } from '../../context/ToastContext';

interface SensorCardProps {
  node: SensorNode;
}

const SensorCard: React.FC<SensorCardProps> = ({ node }) => {
  const { showToast } = useToast();

  const getAlertColors = (risk: string) => {
    switch (risk) {
      case 'Safe': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      case 'Warning': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
      case 'Critical': return 'text-red-400 bg-red-400/10 border-red-400/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]';
      default: return 'text-slate-400 bg-slate-800/50 border-slate-700/50';
    }
  };

  const isCritical = node.risk_level === 'Critical';

  const broadcastEmergencySMS = () => {
    showToast(`BROADCAST TRIGGERED: Emergency SMS sent to local subscribers in proximity to ${node.name} (Station ID: ${node.id}).`, 'success');
  };

  return (
    <div
      className={`bg-[#090d16] border rounded-2xl p-6 shadow-xl transition-all duration-300 relative overflow-hidden
        ${isCritical ? 'border-red-500/60' : 'border-slate-800/70 hover:border-slate-700'}`}
    >
      {/* Critical pulse overlay */}
      {isCritical && (
        <div className="absolute inset-0 bg-red-500/5 animate-[pulse_2s_ease-in-out_infinite] pointer-events-none" />
      )}

      {/* Header: name + risk badge */}
      <div className="flex justify-between items-start mb-5 relative z-10">
        <div>
          <h3 className="text-lg font-bold text-slate-100">{node.name}</h3>
          <p className="text-xs text-slate-500 mt-1 font-mono tracking-wider">
            LAT {node.latitude} • LON {node.longitude}
          </p>
        </div>
        <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border ${getAlertColors(node.risk_level)}`}>
          {node.risk_level}
        </span>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-4 mb-5 relative z-10">
        <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/60">
          <p className="text-xs text-slate-400 mb-1.5 font-medium uppercase tracking-wider">Water Depth</p>
          <p className="text-xl font-black text-blue-400">
            {node.water_level_cm.toFixed(1)} <span className="text-sm font-medium text-slate-500">cm</span>
          </p>
        </div>
        <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/60">
          <p className="text-xs text-slate-400 mb-1.5 font-medium uppercase tracking-wider">Precipitation</p>
          <p className="text-xl font-black text-cyan-400">
            {node.rainfall_rate_mm.toFixed(1)} <span className="text-sm font-medium text-slate-500">mm/h</span>
          </p>
        </div>
      </div>

      {/* Battery bar */}
      <div className="mb-2 relative z-10">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Battery Vitals</span>
          <span className="text-xs font-bold text-slate-400">{node.battery_level}%</span>
        </div>
        <div className="w-full bg-slate-800/50 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-1.5 rounded-full transition-all duration-500 ${node.battery_level > 20 ? 'bg-emerald-500' : 'bg-red-500'}`}
            style={{ width: `${node.battery_level}%` }}
          />
        </div>
      </div>

      {/* Emergency button */}
      {isCritical && (
        <button
          onClick={broadcastEmergencySMS}
          className="w-full relative z-10 mt-5 bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/40
            py-3 rounded-xl font-black text-sm transition-all tracking-wider uppercase
            shadow-[0_0_10px_rgba(239,68,68,0.2)] hover:shadow-[0_0_15px_rgba(239,68,68,0.3)]"
        >
          Broadcast Emergency SMS
        </button>
      )}
    </div>
  );
};

export default SensorCard;

import React from 'react';
import type { DashboardSummary } from '../../types';

interface KpiGridProps {
  summary: DashboardSummary;
}

const KpiGrid: React.FC<KpiGridProps> = ({ summary }) => {
  const cards = [
    {
      label: 'Monitored Stations',
      value: summary.totalNodes,
      unit: 'active units',
      glow: 'bg-blue-500/10',
    },
    {
      label: 'Active Alerts',
      value: summary.activeAlerts,
      unit: 'warnings triggered',
      glow: 'bg-amber-500/10',
    },
    {
      label: 'System Status',
      value: summary.systemHealthStatus,
      unit: '',
      glow: 'bg-emerald-500/10',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Operational': return 'text-emerald-400';
      case 'Warning': return 'text-amber-400';
      case 'Critical': return 'text-red-400';
      default: return 'text-slate-400';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-[#090d16] border border-slate-800/70 rounded-2xl p-7 shadow-2xl relative overflow-hidden group hover:border-slate-700/70 transition-colors duration-300"
        >
          <div className={`absolute -top-10 -right-10 w-40 h-40 ${card.glow} rounded-full blur-3xl group-hover:scale-125 transition-transform duration-500`} />
          <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-3 relative z-10">
            {card.label}
          </h3>
          <div className="flex items-baseline gap-2 relative z-10">
            {typeof card.value === 'number' ? (
              <>
                <span className="text-5xl font-black text-slate-100">{card.value}</span>
                <span className="text-sm text-slate-500 font-medium">{card.unit}</span>
              </>
            ) : (
              <span className={`text-4xl font-black ${getStatusColor(card.value)}`}>
                {card.value}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default KpiGrid;

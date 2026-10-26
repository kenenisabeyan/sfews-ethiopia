import React, { useState } from 'react';
import { SensorNode } from '../types';

export interface Subscriber {
  id: string;
  name: string;
  phone: string;
  stationId: string;
  status: 'Active' | 'Muted';
}

interface AlertsPanelProps {
  nodes: SensorNode[];
  subscribers: Subscriber[];
  onAddSubscriber: (name: string, phone: string, stationId: string) => void;
  onToggleSubscriber: (id: string) => void;
  onDeleteSubscriber: (id: string) => void;
}

export const AlertsPanel: React.FC<AlertsPanelProps> = ({
  nodes,
  subscribers,
  onAddSubscriber,
  onToggleSubscriber,
  onDeleteSubscriber,
}) => {
  const [newSubName, setNewSubName] = useState<string>('');
  const [newSubPhone, setNewSubPhone] = useState<string>('');
  const [newSubStation, setNewSubStation] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubName || !newSubPhone || !newSubStation) return;
    onAddSubscriber(newSubName, newSubPhone, newSubStation);
    setNewSubName('');
    setNewSubPhone('');
    setNewSubStation('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
      {/* Proximity Subscribers List */}
      <div className="lg:col-span-2 glass-panel rounded-2xl sm:rounded-3xl p-4 sm:p-7 space-y-4 sm:space-y-6">
        <div>
          <h2 className="text-base sm:text-lg font-extrabold text-slate-100 tracking-wide uppercase">
            Awash Proximity Alert Subscribers
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 font-bold uppercase tracking-wider">
            Configure telemetry link and manage early warning SMS notification targets
          </p>
        </div>

        {/* Mobile scroll hint */}
        <div className="sm:hidden flex items-center justify-between text-[10px] font-mono text-slate-500">
          <span>{subscribers.length} configured targets</span>
          <span className="text-purple-400 font-bold">← Swipe table →</span>
        </div>

        <div className="overflow-x-auto custom-scrollbar -mx-4 sm:mx-0 px-4 sm:px-0">
          <table className="w-full text-left border-collapse text-xs md:text-sm min-w-[540px]">
            <thead>
              <tr className="border-b border-slate-900 text-slate-400 font-extrabold uppercase tracking-widest text-[9px] sm:text-[10px] pb-4">
                <th className="py-3 px-3 sm:px-4">Subscriber Name</th>
                <th className="py-3 px-3 sm:px-4">SMS Phone target</th>
                <th className="py-3 px-3 sm:px-4">Anchor Station</th>
                <th className="py-3 px-3 sm:px-4 text-center">Status</th>
                <th className="py-3 px-3 sm:px-4 text-right">Settings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/60 font-semibold">
              {subscribers.map((sub) => (
                <tr key={sub.id} className="hover:bg-slate-900/10 transition-colors">
                  <td className="py-3.5 sm:py-4 px-3 sm:px-4 font-bold text-slate-100">{sub.name}</td>
                  <td className="py-3.5 sm:py-4 px-3 sm:px-4 font-mono text-slate-400 text-[11px] sm:text-xs">{sub.phone}</td>
                  <td className="py-3.5 sm:py-4 px-3 sm:px-4 text-indigo-400 font-bold text-[11px] sm:text-xs">{sub.stationId}</td>
                  <td className="py-3.5 sm:py-4 px-3 sm:px-4 text-center">
                    <button
                      onClick={() => onToggleSubscriber(sub.id)}
                      className={`px-2.5 sm:px-3 py-1 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest border transition-all
                        ${
                          sub.status === 'Active'
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            : 'bg-slate-900 border-slate-800/80 text-slate-500'
                        }`}
                    >
                      {sub.status}
                    </button>
                  </td>
                  <td className="py-3.5 sm:py-4 px-3 sm:px-4 text-right">
                    <button
                      onClick={() => onDeleteSubscriber(sub.id)}
                      className="text-slate-500 hover:text-red-400 font-extrabold text-[11px] sm:text-xs uppercase tracking-wider transition-colors whitespace-nowrap"
                    >
                      Disconnect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Subscriber Panel */}
      <div className="glass-panel rounded-2xl sm:rounded-3xl p-4 sm:p-7 min-h-0 sm:min-h-[450px]">
        <div className="border-b border-slate-900/60 pb-3 sm:pb-5 mb-4 sm:mb-6 text-center">
          <h3 className="text-base sm:text-lg font-extrabold text-slate-100 tracking-wide uppercase">
            Register Alert Target
          </h3>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 font-bold uppercase tracking-wider">
            Anchor new subscriber SMS targets to spatial sensors
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          <div className="space-y-1.5 sm:space-y-2">
            <label className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest block">
              Subscriber Name
            </label>
            <input
              type="text"
              placeholder="Enter Full Name..."
              value={newSubName}
              onChange={(e) => setNewSubName(e.target.value)}
              className="w-full bg-[#050911]/80 border border-slate-900 text-slate-200 placeholder-slate-600 text-xs px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl focus:outline-none focus:border-indigo-500/40 transition-colors"
              required
            />
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <label className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest block">
              SMS Phone Number
            </label>
            <input
              type="tel"
              placeholder="+251 9XX XXX XXX"
              value={newSubPhone}
              onChange={(e) => setNewSubPhone(e.target.value)}
              className="w-full bg-[#050911]/80 border border-slate-900 text-slate-200 placeholder-slate-600 text-xs px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl focus:outline-none focus:border-indigo-500/40 transition-colors"
              required
            />
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <label className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest block">
              Spatial Telemetry Anchor Station
            </label>
            <select
              value={newSubStation}
              onChange={(e) => setNewSubStation(e.target.value)}
              className="w-full bg-[#050911]/80 border border-slate-900 text-slate-200 text-xs px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl focus:outline-none focus:border-indigo-500/40 transition-colors"
              required
            >
              <option value="" disabled>
                Select active station...
              </option>
              {nodes.map((node) => (
                <option key={node.id} value={node.name}>
                  {node.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="w-full mt-6 sm:mt-8 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-slate-50 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl font-extrabold text-xs tracking-wider uppercase transition-all shadow-md shadow-indigo-600/10 active:scale-[0.98]"
          >
            Register Subscriber Link
          </button>
        </form>
      </div>
    </div>
  );//
};

import React, { useState } from 'react';
import { Subscriber, DispatchLog, PilotStation } from '../types/types';

interface AlertsPanelProps {
  stations: PilotStation[];
  subscribers: Subscriber[];
  dispatchLogs: DispatchLog[];
  onManualBroadcast: (msg: string, stationName: string) => void;
}

type AlertFilter = 'ALL' | 'DANGER' | 'WARNING' | 'MODERATE' | 'SAFE';

export const AlertsPanel: React.FC<AlertsPanelProps> = ({
  stations,
  subscribers,
  dispatchLogs,
  onManualBroadcast,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<AlertFilter>('ALL');
  const [isOverrideOpen, setIsOverrideOpen] = useState<boolean>(false);
  const [customMsg, setCustomMsg] = useState<string>('');
  const [selectedStation, setSelectedStation] = useState<string>(stations[0]?.name || 'Upper Awash Basin');

  // Convert station states into list of alerts
  const alertList = stations.map((st) => {
    let msg = 'Fluid column behaves within safe thresholds.';
    let time = '1 hour ago';
    let level: 'High' | 'Warning' | 'Moderate' | 'Safe' = 'Safe';

    if (st.status === 'DANGER') {
      msg = 'Fluid telemetry exceeds critical tension limit! Column SNAP risk.';
      time = '10 min ago';
      level = 'High';
    } else if (st.status === 'WARNING') {
      msg = 'Viscosity falling rapidly under heavy shear-thinning siphon rate.';
      time = '25 min ago';
      level = 'Warning';
    } else if (st.adc_value > 300) {
      msg = 'Mild upward climbing action detected. Flow is stable.';
      time = '3 hours ago';
      level = 'Moderate';
    } else {
      level = 'Safe';
      time = '4 hours ago';
    }

    return {
      id: st.id,
      location: st.name,
      level,
      message: msg,
      time,
      status: st.status,
    };
  });

  // Filter based on active tab selection
  const filteredAlerts = alertList.filter((al) => {
    if (selectedFilter === 'ALL') return true;
    if (selectedFilter === 'DANGER' && al.level === 'High') return true;
    if (selectedFilter === 'WARNING' && al.level === 'Warning') return true;
    if (selectedFilter === 'MODERATE' && al.level === 'Moderate') return true;
    if (selectedFilter === 'SAFE' && al.level === 'Safe') return true;
    return false;
  });

  const handleBroadcastSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customMsg.trim()) return;
    onManualBroadcast(customMsg, selectedStation);
    setCustomMsg('');
    setIsOverrideOpen(false);
  };

  const getAlertBadgeStyle = (level: string) => {
    switch (level) {
      case 'High':
        return 'text-red-400 border-red-500/30 bg-red-500/10';
      case 'Warning':
        return 'text-amber-400 border-amber-500/30 bg-amber-500/10';
      case 'Moderate':
        return 'text-orange-400 border-orange-500/30 bg-orange-500/10';
      case 'Safe':
      default:
        return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 relative">
      
      {/* Column 1 & 2: Alert Feeds & SMS Dispatches */}
      <div className="xl:col-span-2 space-y-6 flex flex-col">
        
        {/* Panel A: Live Alert Ingress */}
        <div className="bg-[#0b0f19] border border-slate-800/80 rounded-2xl p-6 relative overflow-hidden flex flex-col flex-1 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-transparent pointer-events-none"></div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/60 pb-4 mb-4 gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-100 uppercase tracking-widest flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping"></span>
                Active Telemetry Incident Alerts
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Real-time status breaches and warning notifications</p>
            </div>
            
            {/* Filter buttons matching mockup precisely */}
            <div className="flex flex-wrap gap-1.5 text-[9px] font-bold font-mono uppercase bg-slate-950 p-1 rounded-lg border border-slate-850">
              {(['ALL', 'DANGER', 'WARNING', 'MODERATE', 'SAFE'] as AlertFilter[]).map((fl) => (
                <button
                  key={fl}
                  onClick={() => setSelectedFilter(fl)}
                  className={`px-3 py-1.5 rounded-md transition-all duration-150 ${
                    selectedFilter === fl 
                      ? 'bg-purple-600 text-white font-bold' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {fl === 'DANGER' ? 'HIGH' : fl}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className="text-slate-500 border-b border-slate-800/60 pb-2">
                  <th className="py-2.5 font-bold uppercase">Location</th>
                  <th className="py-2.5 font-bold uppercase text-center">Alert Level</th>
                  <th className="py-2.5 font-bold uppercase">Incident Message</th>
                  <th className="py-2.5 font-bold uppercase text-right">Registered Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/30">
                {filteredAlerts.map((al) => (
                  <tr key={al.id} className="text-slate-300 hover:bg-slate-900/30 transition-colors">
                    <td className="py-3 font-semibold text-slate-200">{al.location}</td>
                    <td className="py-3 text-center">
                      <span className={`border px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase inline-block ${getAlertBadgeStyle(al.level)}`}>
                        {al.level}
                      </span>
                    </td>
                    <td className="py-3 text-slate-400 text-[11px] max-w-[280px] truncate">{al.message}</td>
                    <td className="py-3 text-right text-slate-500">{al.time}</td>
                  </tr>
                ))}
                {filteredAlerts.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-slate-600">
                      No active anomalies registered on this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Panel B: Live Dispatch Logs table */}
        <div className="bg-[#0b0f19] border border-slate-800/80 rounded-2xl p-6 relative overflow-hidden flex flex-col shadow-2xl min-h-[260px]">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest border-b border-slate-800/80 pb-3 mb-4 flex justify-between items-center">
            <span>Automated Emergency Broadcast Registry Logs</span>
            <span className="text-[10px] font-mono font-bold bg-[#c084fc]/10 text-[#c084fc] border border-[#c084fc]/20 px-2 py-0.5 rounded">
              GATEWAY: SMS-V3
            </span>
          </h3>

          <div className="overflow-y-auto max-h-[220px] pr-2">
            <table className="w-full text-left font-mono text-[11px] border-collapse">
              <thead>
                <tr className="text-slate-500 border-b border-slate-900 pb-2">
                  <th className="py-2 font-bold uppercase">Timestamp</th>
                  <th className="py-2 font-bold uppercase">Siphon Node</th>
                  <th className="py-2 font-bold uppercase">Type</th>
                  <th className="py-2 font-bold uppercase">Transmission SMS Dispatch</th>
                  <th className="py-2 font-bold uppercase text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/40">
                {dispatchLogs.map((lg) => (
                  <tr key={lg.id} className="text-slate-300 hover:bg-slate-900/20">
                    <td className="py-2.5 text-slate-500">{new Date(lg.timestamp).toLocaleTimeString()}</td>
                    <td className="py-2.5 font-bold text-slate-200">{lg.stationName.split(' ')[0]}</td>
                    <td className="py-2.5">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-black ${
                        lg.type === 'AUTO' 
                          ? 'bg-[#22d3ee]/10 text-cyan-400 border border-cyan-400/20' 
                          : 'bg-[#d946ef]/10 text-purple-400 border border-purple-400/20'
                      }`}>
                        {lg.type}
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-400 max-w-[200px] truncate">{lg.message}</td>
                    <td className="py-2.5 text-right">
                      <span className="text-emerald-400 font-bold text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        {lg.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {dispatchLogs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-slate-600">
                      No broadcast signals transmitted yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Column 3: Subscriber & Dispatch Management */}
      <div className="xl:col-span-1 space-y-6 flex flex-col">
        
        {/* Subscriber Registry card */}
        <div className="bg-[#0b0f19] border border-slate-800/80 rounded-2xl p-6 relative overflow-hidden flex flex-col flex-1 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none"></div>

          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest">
              Subscriber SMS Registry
            </h3>
            <button
              onClick={() => setIsOverrideOpen(true)}
              className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-lg border border-purple-500/30 transition-all shadow-md shadow-purple-600/15"
            >
              Broadcast Override
            </button>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[360px] pr-2">
            {subscribers.map((sb) => (
              <div key={sb.id} className="bg-[#070b13] border border-slate-900 hover:border-slate-800 rounded-xl p-3 flex justify-between items-center transition-all duration-200">
                <div>
                  <div className="text-xs font-bold text-slate-100">{sb.name}</div>
                  <div className="text-[10px] font-mono text-slate-500 mt-0.5">{sb.phone}</div>
                  <div className="text-[9px] font-mono text-slate-400 mt-1 bg-slate-900 border border-slate-850 px-2 py-0.5 rounded-full inline-block">
                    Zone: {sb.zone}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className={`text-[8px] font-black font-mono border px-2 py-0.5 rounded-full uppercase ${
                    sb.status === 'Active' 
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}>
                    {sb.status}
                  </span>
                  <span className="text-[8px] font-mono text-slate-600 uppercase">SYS: ACTIVE</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Manual Override modal overlay */}
      {isOverrideOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-[#0b0f19] border border-purple-500/40 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            <h3 className="text-base font-bold text-slate-100 uppercase tracking-widest border-b border-slate-800 pb-3 mb-4 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-ping"></span>
              Manual Broadcast Override
            </h3>
            
            <form onSubmit={handleBroadcastSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase mb-1.5">
                  Target Siphon Region / Station
                </label>
                <select
                  value={selectedStation}
                  onChange={(e) => setSelectedStation(e.target.value)}
                  className="w-full bg-[#070b13] border border-slate-800 rounded-lg p-2.5 text-xs text-slate-300 font-mono focus:border-purple-500 focus:outline-none"
                >
                  <option value="Upper Awash Basin">Global Upper Awash Basin</option>
                  {stations.map((st) => (
                    <option key={st.id + '_opt'} value={st.name}>
                      {st.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase mb-1.5">
                  Custom Warning Dispatch SMS
                </label>
                <textarea
                  value={customMsg}
                  onChange={(e) => setCustomMsg(e.target.value)}
                  placeholder="ALERT: Viscoelastic polymer stress levels have reached threshold levels. Elevating siphon evacuation pipelines immediately."
                  rows={4}
                  className="w-full bg-[#070b13] border border-slate-800 rounded-lg p-2.5 text-xs text-slate-300 font-mono focus:border-purple-500 focus:outline-none resize-none placeholder:text-slate-650"
                  required
                />
              </div>

              <div className="bg-purple-950/20 border border-purple-500/20 rounded-xl p-3.5 text-[10px] font-mono text-purple-400">
                ⚠️ <span className="font-bold uppercase text-purple-300">Security warning:</span> Manual override sends instant bulk SMS packets directly to active village registry subscribers via cellular base towers.
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOverrideOpen(false)}
                  className="px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 border border-purple-500/30 hover:bg-purple-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-purple-600/15"
                >
                  Transmit Override
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

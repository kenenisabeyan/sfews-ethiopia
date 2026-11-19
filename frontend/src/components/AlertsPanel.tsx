import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { SensorNode, AlertLog, Subscriber } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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
  // Alerts Feed State
  const [alerts, setAlerts] = useState<AlertLog[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState<boolean>(true);
  const [alertFilter, setAlertFilter] = useState<'all' | 'unacknowledged' | 'critical'>('unacknowledged');

  // Emergency Broadcast Form State
  const [broadcastStation, setBroadcastStation] = useState<string>('all');
  const [broadcastRadius, setBroadcastRadius] = useState<number>(35);
  const [broadcastSeverity, setBroadcastSeverity] = useState<'Critical' | 'Warning' | 'Emergency'>('Critical');
  const [broadcastMessage, setBroadcastMessage] = useState<string>(
    'URGENT CIVIL DEFENSE ALERT: Elevated hydrological surge detected. Lowland communities in the Awash riverbed prepare for immediate evacuation.'
  );
  const [isBroadcasting, setIsBroadcasting] = useState<boolean>(false);
  const [broadcastResult, setBroadcastResult] = useState<string | null>(null);

  // New Subscriber Form State
  const [newSubName, setNewSubName] = useState<string>('');
  const [newSubPhone, setNewSubPhone] = useState<string>('');
  const [newSubStation, setNewSubStation] = useState<string>(nodes[0]?.id || 'NODE-ALPHA-1');

  // Search filter for subscribers
  const [subSearch, setSubSearch] = useState<string>('');

  // Fetch live alerts from API
  const fetchAlerts = async () => {
    try {
      const res = await axios.get<AlertLog[]>(`${API_BASE_URL}/api/v1/alerts/`);
      if (Array.isArray(res.data)) {
        setAlerts(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    } finally {
      setLoadingAlerts(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 10000);
    return () => clearInterval(interval);
  }, []);

  // Acknowledge Alert Handler
  const handleAcknowledge = async (alertId: number) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/api/v1/alerts/${alertId}/acknowledge`, {
        acknowledged_by: 'Command Center Officer'
      });
      if (res.status === 200) {
        setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, is_acknowledged: true, acknowledged_by: 'Command Center Officer' } : a));
      }
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  };

  // Dispatch Emergency Broadcast Handler
  const handleDispatchBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMessage.trim()) return;
    setIsBroadcasting(true);
    setBroadcastResult(null);

    try {
      const payload: any = {
        message: broadcastMessage.trim(),
        severity: broadcastSeverity,
        radius_km: broadcastRadius
      };
      if (broadcastStation !== 'all') {
        payload.station_id = broadcastStation;
      }

      const res = await axios.post(`${API_BASE_URL}/api/v1/alerts/broadcast`, payload);
      const data = res.data;
      setBroadcastResult(
        `✅ SUCCESS: Dispatched to ${data.subscribers_notified} active contacts across ${data.delivered_channels.length} channels (${data.delivered_channels.join(', ')}).`
      );
      fetchAlerts();
    } catch (err: any) {
      setBroadcastResult(`⚠️ Broadcast error: ${err.message || 'Gateway unreachable'}`);
    } finally {
      setIsBroadcasting(false);
    }
  };

  // Handle New Subscriber Submit
  const handleSubscriberSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubName.trim() || !newSubPhone.trim() || !newSubStation) return;
    onAddSubscriber(newSubName.trim(), newSubPhone.trim(), newSubStation);
    setNewSubName('');
    setNewSubPhone('');
  };

  // Filtered alerts
  const filteredAlerts = alerts.filter(a => {
    if (alertFilter === 'unacknowledged') return !a.is_acknowledged;
    if (alertFilter === 'critical') return a.severity === 'Critical' || a.severity === 'Emergency';
    return true;
  });

  // Filtered subscribers
  const filteredSubscribers = subscribers.filter(s =>
    s.name.toLowerCase().includes(subSearch.toLowerCase()) ||
    s.phone.includes(subSearch) ||
    s.stationId.toLowerCase().includes(subSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      
      {/* 1. Header Banner & Quick Counters */}
      <div className="glass-panel-premium rounded-3xl p-5 sm:p-7 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 border-glow-purple">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
            <span className="text-[10px] font-mono font-extrabold uppercase tracking-widest text-red-400 bg-red-500/10 px-2.5 py-0.5 rounded-full border border-red-500/20">
              NATIONAL CIVIL DEFENSE ESCALATION MATRIX
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 mt-2 tracking-tight">
            Emergency Alerts & Civil Protection Console
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 font-semibold">
            Real-time hazard detection, automated subscriber alerts, and geospatial SMS broadcast dispatch.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:gap-4 w-full lg:w-auto">
          <div className="bg-slate-100 dark:bg-[#040813] border border-slate-300 dark:border-white/5 rounded-2xl p-3 sm:p-4 text-center min-w-[120px] flex-1 sm:flex-initial shadow-sm">
            <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Active Alerts</span>
            <span className="text-2xl sm:text-3xl font-black text-red-600 dark:text-red-400 font-mono mt-0.5 block">
              {alerts.filter(a => !a.is_acknowledged).length}
            </span>
          </div>
          <div className="bg-slate-100 dark:bg-[#040813] border border-slate-300 dark:border-white/5 rounded-2xl p-3 sm:p-4 text-center min-w-[120px] flex-1 sm:flex-initial shadow-sm">
            <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">SMS Subscribers</span>
            <span className="text-2xl sm:text-3xl font-black text-cyan-600 dark:text-cyan-400 font-mono mt-0.5 block">
              {subscribers.filter(s => s.status === 'Active').length}
            </span>
          </div>
          <div className="bg-slate-100 dark:bg-[#040813] border border-slate-300 dark:border-white/5 rounded-2xl p-3 sm:p-4 text-center min-w-[120px] flex-1 sm:flex-initial shadow-sm">
            <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Coverage Radius</span>
            <span className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400 font-mono mt-0.5 block">
              {broadcastRadius} <span className="text-xs font-normal">km</span>
            </span>
          </div>
        </div>
      </div>

      {/* 2. Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
        
        {/* LEFT COLUMN: Active Alerts Incident Feed (7 cols) */}
        <div className="lg:col-span-7 glass-panel rounded-3xl p-5 sm:p-7 space-y-6 flex flex-col justify-between shadow-2xl">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-white/5">
              <div>
                <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]"></span>
                  Live Flood Anomaly Feed
                </h2>
                <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                  Hydrological breaches & automated threshold incidents
                </p>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-[#030610] p-1 rounded-xl border border-slate-300 dark:border-white/5 text-[10px] font-bold font-mono shadow-inner">
                <button
                  onClick={() => setAlertFilter('unacknowledged')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    alertFilter === 'unacknowledged'
                      ? 'bg-red-500/20 text-red-700 dark:text-red-300 border border-red-500/40 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Open ({alerts.filter(a => !a.is_acknowledged).length})
                </button>
                <button
                  onClick={() => setAlertFilter('critical')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    alertFilter === 'critical'
                      ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Critical Only
                </button>
                <button
                  onClick={() => setAlertFilter('all')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    alertFilter === 'all'
                      ? 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/40 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  All Logs ({alerts.length})
                </button>
              </div>
            </div>

            {/* Alert Cards Container */}
            <div className="space-y-3.5 mt-5 max-h-[580px] overflow-y-auto pr-1 custom-scrollbar">
              {loadingAlerts ? (
                <div className="text-center py-12 text-slate-500 font-mono text-xs">
                  <div className="w-8 h-8 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin mx-auto mb-3"></div>
                  Polling incident logs...
                </div>
              ) : filteredAlerts.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-300 dark:border-white/5 rounded-2xl bg-slate-100/70 dark:bg-[#040814]/40">
                  <span className="text-3xl block mb-2">🛡️</span>
                  <p className="text-slate-800 dark:text-slate-300 font-bold text-sm">No Active Flood Alerts Matching Filter</p>
                  <p className="text-slate-500 text-xs font-mono mt-1">All monitoring corridors operating within retention buffer margins.</p>
                </div>
              ) : (
                filteredAlerts.map(alert => {
                  const isCritical = alert.severity === 'Critical' || alert.severity === 'Emergency';
                  return (
                    <div
                      key={alert.id}
                      className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                        alert.is_acknowledged
                          ? 'bg-slate-100/60 dark:bg-[#040812]/50 border-slate-200 dark:border-white/5 opacity-80'
                          : isCritical
                          ? 'bg-red-500/10 dark:bg-red-950/20 border-red-500/30 shadow-sm'
                          : 'bg-amber-500/10 dark:bg-amber-950/20 border-amber-500/30 shadow-sm'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-200 dark:border-white/5">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-mono font-black uppercase tracking-wider ${
                            isCritical ? 'bg-red-500/20 text-red-700 dark:text-red-300 border border-red-500/30' : 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                          }`}>
                            {alert.severity}
                          </span>
                          {alert.node_id && (
                            <span className="text-[10px] font-mono font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-500/15 px-2 py-0.5 rounded-md border border-indigo-500/25">
                              {alert.node_id}
                            </span>
                          )}
                          {alert.water_level_cm && (
                            <span className="text-[10px] font-mono font-black text-cyan-700 dark:text-cyan-400">
                              {alert.water_level_cm.toFixed(1)} cm
                            </span>
                          )}
                        </div>

                        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                          {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>

                      <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 mt-2.5 tracking-tight">
                        {alert.title}
                      </h3>
                      <p className="text-xs text-slate-700 dark:text-slate-400 mt-1 leading-relaxed font-medium">
                        {alert.message}
                      </p>

                      <div className="flex items-center justify-between mt-3.5 pt-2.5 border-t border-slate-200 dark:border-white/5">
                        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                          {alert.is_acknowledged ? `Acknowledged by: ${alert.acknowledged_by || 'Officer'}` : 'Status: Unacknowledged Action Required'}
                        </span>

                        {!alert.is_acknowledged && (
                          <button
                            onClick={() => handleAcknowledge(alert.id)}
                            className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-sm active:scale-95"
                          >
                            ✓ Acknowledge Incident
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Geospatial Broadcast & Subscribers (5 cols) */}
        <div className="lg:col-span-5 space-y-6 sm:space-y-8">
          
          {/* Geospatial SMS Broadcast Dispatch Console */}
          <div className="glass-panel rounded-3xl p-5 sm:p-7 space-y-5 border border-purple-500/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-base font-black text-slate-900 dark:text-slate-100 uppercase tracking-wide flex items-center gap-2">
                  <span className="text-purple-400">📡</span>
                  Civil Defense SMS Dispatcher
                </h2>
                <span className="text-[8px] font-mono font-black text-purple-400 bg-purple-500/15 px-2 py-0.5 rounded-md border border-purple-500/30 tracking-widest">
                  GEOFENCE READY
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                Target community elders within radius using Haversine formula
              </p>
            </div>

            <form onSubmit={handleDispatchBroadcast} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-1.5">
                  Center Sensor Anchor
                </label>
                <select
                  value={broadcastStation}
                  onChange={(e) => setBroadcastStation(e.target.value)}
                  className="w-full bg-white dark:bg-[#050914] border border-slate-300 dark:border-white/10 rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-purple-500 font-mono"
                >
                  <option value="all">Entire Awash River Basin (Fleet-Wide)</option>
                  {nodes.map(n => (
                    <option key={n.id} value={n.id}>{n.name} ({n.id})</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5 text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                  <span>Geofence Radius:</span>
                  <span className="text-purple-600 dark:text-purple-400 font-bold">{broadcastRadius} km</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="100"
                  step="5"
                  value={broadcastRadius}
                  onChange={(e) => setBroadcastRadius(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-900 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-1.5">
                  Severity Override
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Warning', 'Critical', 'Emergency'] as const).map(sev => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setBroadcastSeverity(sev)}
                      className={`py-1.5 rounded-xl text-[10px] font-mono font-bold uppercase transition-all ${
                        broadcastSeverity === sev
                          ? 'bg-purple-600 text-white shadow-[0_0_12px_rgba(168,85,247,0.4)]'
                          : 'bg-slate-100 dark:bg-[#050914] text-slate-700 dark:text-slate-400 border border-slate-200 dark:border-white/5 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-1.5">
                  Broadcast Directive Message
                </label>
                <textarea
                  rows={3}
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  className="w-full bg-white dark:bg-[#050914] border border-slate-300 dark:border-white/10 rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-purple-500 resize-none leading-relaxed"
                  placeholder="Type emergency alert dispatch..."
                />
              </div>

              {broadcastResult && (
                <div className="p-3 bg-purple-950/30 border border-purple-500/30 rounded-xl text-[11px] text-purple-200 leading-snug">
                  {broadcastResult}
                </div>
              )}

              <button
                type="submit"
                disabled={isBroadcasting}
                className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isBroadcasting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Transmitting Across Channels...
                  </>
                ) : (
                  <>
                    <span>⚡</span>
                    Transmit Emergency Broadcast
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Subscribers Management Directory */}
          <div className="glass-panel rounded-3xl p-5 sm:p-7 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-slate-100 uppercase tracking-wide">
                  Community Elder Directory
                </h2>
                <p className="text-[11px] font-mono text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                  {subscribers.length} Registered alert recipients
                </p>
              </div>
            </div>

            {/* Quick Filter Search */}
            <input
              type="text"
              placeholder="Search by name, phone or station..."
              value={subSearch}
              onChange={(e) => setSubSearch(e.target.value)}
              className="w-full bg-white dark:bg-[#050914] border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-cyan-500 font-mono placeholder:text-slate-400 dark:placeholder:text-slate-600"
            />

            {/* Subscriber Item Cards */}
            <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
              {filteredSubscribers.map(sub => (
                <div
                  key={sub.id}
                  className="p-3 bg-slate-100/90 dark:bg-[#040814]/70 border border-slate-200 dark:border-white/5 rounded-2xl flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 dark:text-slate-100 truncate">{sub.name}</p>
                    <p className="font-mono text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{sub.phone} • <span className="text-indigo-600 dark:text-indigo-400 font-bold">{sub.stationId}</span></p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onToggleSubscriber(sub.id)}
                      className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-black uppercase tracking-wider border ${
                        sub.status === 'Active'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-500 border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {sub.status}
                    </button>
                    <button
                      onClick={() => onDeleteSubscriber(sub.id)}
                      className="text-slate-400 hover:text-red-500 text-xs px-1"
                      title="Remove subscriber"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add New Subscriber Inline Form */}
            <form onSubmit={handleSubscriberSubmit} className="pt-3 border-t border-slate-200 dark:border-white/5 space-y-2.5 text-xs">
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block">
                Register Local Contact
              </span>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Full Name"
                  value={newSubName}
                  onChange={(e) => setNewSubName(e.target.value)}
                  className="bg-white dark:bg-[#050914] border border-slate-300 dark:border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-cyan-500 placeholder:text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Phone (+251...)"
                  value={newSubPhone}
                  onChange={(e) => setNewSubPhone(e.target.value)}
                  className="bg-white dark:bg-[#050914] border border-slate-300 dark:border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-cyan-500 font-mono placeholder:text-slate-400"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={newSubStation}
                  onChange={(e) => setNewSubStation(e.target.value)}
                  className="flex-1 bg-white dark:bg-[#050914] border border-slate-300 dark:border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                >
                  {nodes.map(n => (
                    <option key={n.id} value={n.id}>{n.id} ({n.name.split(' ')[0]})</option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)] shrink-0"
                >
                  + Add
                </button>
              </div>
            </form>
          </div>

        </div>

      </div>

    </div>
  );
};

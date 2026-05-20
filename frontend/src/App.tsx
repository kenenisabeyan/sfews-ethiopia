import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { SensorNode, DashboardPayload, SystemHealth } from './types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const App: React.FC = () => {
    const [payload, setPayload] = useState<DashboardPayload | null>(null);
    const [health, setHealth] = useState<SystemHealth | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchHealth = async () => {
        try {
            const healthRes = await axios.get<SystemHealth>(`${API_BASE_URL}/`);
            setHealth(healthRes.data);
        } catch (err: any) {
            console.error('Health Check Error:', err);
            setError(err.message || 'System network degraded.');
        }
    };

    useEffect(() => {
        fetchHealth();
        
        // Convert http:// to ws:// for WebSocket connection
        const wsUrl = API_BASE_URL.replace(/^http/, 'ws') + '/api/v1/ws/dashboard';
        const ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
            console.log('WebSocket Connected to Command Center');
            setError(null);
        };
        
        ws.onmessage = (event) => {
            try {
                const data: DashboardPayload = JSON.parse(event.data);
                // Reversing history array so that the chart plots left-to-right chronologically
                const chronologicalHistory = [...data.history].reverse();
                setPayload({
                    ...data,
                    history: chronologicalHistory
                });
                setLoading(false);
            } catch (e) {
                console.error("Failed to parse WebSocket data", e);
            }
        };
        
        ws.onerror = (event) => {
            console.error("WebSocket Error", event);
            setError("Live connection lost. System network degraded.");
        };
        
        ws.onclose = () => {
            console.log('WebSocket Disconnected');
        };

        return () => {
            ws.close();
        };
    }, []);

    const broadcastEmergencySMS = (node: SensorNode) => {
        alert(`BROADCAST TRIGGERED: Emergency SMS sent to local subscribers in proximity to ${node.name} (Station ID: ${node.id}).`);
    };

    const getAlertColors = (risk?: string) => {
        switch (risk) {
            case 'Safe': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
            case 'Warning': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
            case 'Critical': return 'text-red-400 bg-red-400/10 border-red-400/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]';
            default: return 'text-slate-400 bg-slate-800/50 border-slate-700/50';
        }
    };

    const isSystemOnline = health?.database_connection === 'Active';

    return (
        <div className="min-h-screen bg-[#030712] text-slate-200 font-sans p-4 md:p-8 selection:bg-cyan-500/30">
            {/* Header Block */}
            <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 border-b border-slate-800/60 pb-6 gap-6">
                <div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent drop-shadow-md">
                        SFEWS Command Center
                    </h1>
                    <p className="text-slate-400 mt-2 text-sm md:text-base font-medium tracking-wide">
                        Awash River Basin - Internet of Things & Machine Learning Framework
                    </p>
                </div>
                
                <div className="flex items-center gap-3 bg-[#090d16] border border-slate-800 px-5 py-2.5 rounded-full shadow-2xl">
                    <div className="relative flex h-3.5 w-3.5">
                        {isSystemOnline ? (
                            <>
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
                            </>
                        ) : (
                            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500"></span>
                        )}
                    </div>
                    <span className="text-sm font-bold tracking-widest text-slate-300 uppercase">
                        API STATUS: {isSystemOnline ? 'ONLINE' : 'OFFLINE'}
                    </span>
                </div>
            </header>

            {error && (
                <div className="mb-8 bg-red-950/40 border border-red-500/30 rounded-xl p-5 flex items-center justify-between backdrop-blur-sm">
                    <p className="text-red-400 font-semibold tracking-wide">Network Error: {error}</p>
                    <button onClick={fetchDashboardData} className="px-5 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-all font-bold text-sm border border-red-500/20">
                        Force Reconnect
                    </button>
                </div>
            )}

            {/* Section A: Analytical KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="bg-[#090d16] border border-slate-800/70 rounded-2xl p-7 shadow-2xl relative overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl"></div>
                    <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-3">Total Monitored Stations</h3>
                    <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-black text-slate-100">{payload?.summary.totalNodes || 0}</span>
                        <span className="text-sm text-slate-500 font-medium">active units</span>
                    </div>
                </div>

                <div className="bg-[#090d16] border border-slate-800/70 rounded-2xl p-7 shadow-2xl relative overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl"></div>
                    <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-3">Thresholds Met</h3>
                    <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-black text-slate-100">{payload?.summary.activeAlerts || 0}</span>
                        <span className="text-sm text-slate-500 font-medium">warnings triggered</span>
                    </div>
                </div>

                <div className="bg-[#090d16] border border-slate-800/70 rounded-2xl p-7 shadow-2xl relative overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl"></div>
                    <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-3">System Network Status</h3>
                    <div className="flex items-baseline gap-2">
                        <span className={`text-4xl font-black ${isSystemOnline ? 'text-emerald-400' : 'text-red-400'}`}>
                            {isSystemOnline ? 'Operational' : 'Degraded'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Section B: Hydrological Grid Map */}
                <div className="xl:col-span-1 space-y-5">
                    <h2 className="text-lg font-bold text-slate-200 border-b border-slate-800/80 pb-3 tracking-wide uppercase">Pilot River Nodes</h2>
                    
                    {loading && !payload && (
                        <div className="animate-pulse space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-40 bg-[#090d16] border border-slate-800/50 rounded-2xl"></div>
                            ))}
                        </div>
                    )}
                    
                    <div className="space-y-4 overflow-y-auto max-h-[800px] pr-2 pb-10 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                        {payload?.nodes.map(node => (
                            <div 
                                key={node.id} 
                                className={`bg-[#090d16] border rounded-2xl p-6 shadow-xl transition-all duration-300 relative overflow-hidden
                                    ${node.currentRisk === 'Critical' ? 'border-red-500/60' : 'border-slate-800/70 hover:border-slate-700'}`}
                            >
                                {node.currentRisk === 'Critical' && (
                                    <div className="absolute inset-0 bg-red-500/5 animate-[pulse_2s_ease-in-out_infinite] pointer-events-none"></div>
                                )}
                                
                                <div className="flex justify-between items-start mb-5 relative z-10">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-100">{node.name}</h3>
                                        <p className="text-xs text-slate-500 mt-1 font-mono tracking-wider">LAT {node.latitude} • LON {node.longitude}</p>
                                    </div>
                                    <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border ${getAlertColors(node.currentRisk)}`}>
                                        {node.currentRisk || 'UNKNOWN'}
                                    </span>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4 mb-5 relative z-10">
                                    <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/60">
                                        <p className="text-xs text-slate-400 mb-1.5 font-medium uppercase tracking-wider">Water Depth</p>
                                        <p className="text-xl font-black text-blue-400">
                                            {node.waterLevelCm?.toFixed(1) || '0.0'} <span className="text-sm font-medium text-slate-500">cm</span>
                                        </p>
                                    </div>
                                    <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/60">
                                        <p className="text-xs text-slate-400 mb-1.5 font-medium uppercase tracking-wider">Precipitation</p>
                                        <p className="text-xl font-black text-cyan-400">
                                            {node.rainfallRateMm?.toFixed(1) || '0.0'} <span className="text-sm font-medium text-slate-500">mm/h</span>
                                        </p>
                                    </div>
                                </div>

                                <div className="mb-2 relative z-10">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Battery Vitals</span>
                                        <span className="text-xs font-bold text-slate-400">{node.batteryLevel}%</span>
                                    </div>
                                    <div className="w-full bg-slate-800/50 rounded-full h-1.5 overflow-hidden">
                                        <div 
                                            className={`h-1.5 rounded-full ${node.batteryLevel > 20 ? 'bg-emerald-500' : 'bg-red-500'}`} 
                                            style={{ width: `${node.batteryLevel}%` }}
                                        ></div>
                                    </div>
                                </div>
                                
                                {node.currentRisk === 'Critical' && (
                                    <button 
                                        onClick={() => broadcastEmergencySMS(node)}
                                        className="w-full relative z-10 mt-5 bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/40 py-3 rounded-xl font-black text-sm transition-all tracking-wider uppercase shadow-[0_0_10px_rgba(239,68,68,0.2)] hover:shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                                    >
                                        Broadcast Emergency SMS
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Section C: Historical Trends Graph */}
                <div className="xl:col-span-2">
                    <div className="bg-[#090d16] border border-slate-800/70 rounded-2xl p-7 shadow-2xl h-full min-h-[500px] flex flex-col">
                        <div className="mb-8">
                            <h2 className="text-lg font-bold text-slate-200 tracking-wide uppercase">Basin Hydrological Trends</h2>
                            <p className="text-sm text-slate-500 mt-1 font-medium">Real-time correlation of water elevation and precipitation across the network</p>
                        </div>
                        
                        <div className="flex-1 w-full relative min-h-[400px]">
                            {loading && !payload ? (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-10 h-10 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
                                </div>
                            ) : payload && payload.history.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={payload.history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorWater" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                            </linearGradient>
                                            <linearGradient id="colorRain" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.4}/>
                                                <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="4 4" stroke="#1e293b" vertical={false} opacity={0.6} />
                                        <XAxis 
                                            dataKey="timestamp" 
                                            stroke="#475569" 
                                            fontSize={11} 
                                            tickFormatter={(val) => new Date(val).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}
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
                                                padding: '1rem'
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
                                            strokeWidth={4}
                                            fillOpacity={1} 
                                            fill="url(#colorWater)" 
                                            activeDot={{ r: 6, strokeWidth: 0, fill: '#3b82f6' }}
                                        />
                                        <Area 
                                            type="monotone" 
                                            dataKey="rainfallRateMm" 
                                            name="Rainfall (mm/h)" 
                                            stroke="#22d3ee" 
                                            strokeWidth={4}
                                            fillOpacity={1} 
                                            fill="url(#colorRain)" 
                                            activeDot={{ r: 6, strokeWidth: 0, fill: '#22d3ee' }}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-slate-500 font-medium">
                                    Awaiting telemetry data from Awash River Basin sensors...
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default App;

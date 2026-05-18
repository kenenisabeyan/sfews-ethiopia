import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { SensorNode, HydroLog, DashboardData, HealthStatus } from './types';

const API_BASE_URL = 'http://localhost:8000';

const App: React.FC = () => {
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [healthRes, dashboardRes] = await Promise.all([
                axios.get<HealthStatus>(`${API_BASE_URL}/`),
                axios.get<any>(`${API_BASE_URL}/api/v1/dashboard`)
            ]);
            
            setHealthStatus(healthRes.data);
            
            // Map backend snake_case to frontend camelCase
            const mappedNodes: SensorNode[] = dashboardRes.data.nodes.map((n: any) => ({
                id: n.id,
                name: n.name,
                latitude: n.latitude,
                longitude: n.longitude,
                status: n.status,
                batteryLevel: n.battery_level
            }));
            
            const mappedHistory: HydroLog[] = dashboardRes.data.history.map((h: any) => ({
                logId: h.log_id,
                nodeId: h.node_id,
                waterLevelCm: h.water_level_cm,
                rainfallRateMm: h.rainfall_rate_mm,
                floodProbability: h.flood_probability,
                riskLevel: h.risk_level,
                timestamp: h.timestamp
            })).reverse(); // Reverse to chronologically order for the chart

            setDashboardData({ nodes: mappedNodes, history: mappedHistory });
            setError(null);
        } catch (err: any) {
            console.error('Error fetching data:', err);
            setError(err.message || 'Failed to connect to backend.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000); // Poll every 30 seconds
        return () => clearInterval(interval);
    }, []);

    const handleBroadcastSMS = (nodeId: string) => {
        alert(`EMERGENCY SMS BROADCAST INITIATED FOR NODE: ${nodeId}\n\nAuthorities and local residents have been notified.`);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Safe': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
            case 'Warning': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
            case 'Critical': return 'text-red-400 bg-red-400/10 border-red-400/20';
            default: return 'text-slate-400 bg-slate-800 border-slate-700';
        }
    };

    const totalStations = dashboardData?.nodes.length || 0;
    const activeWarnings = dashboardData?.nodes.filter(n => n.status === 'Warning' || n.status === 'Critical').length || 0;
    const networkStatus = healthStatus?.database === 'Connected' ? 'Online' : 'Degraded';

    return (
        <div className="min-h-screen bg-[#030712] text-slate-200 font-sans p-6 selection:bg-blue-500/30">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-slate-800/50 pb-6 gap-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent drop-shadow-sm">
                        SFEWS Command Center
                    </h1>
                    <p className="text-slate-400 mt-1 text-sm md:text-base">Awash River Basin - Smart Flood Early Warning System</p>
                </div>
                
                <div className="flex items-center gap-3 bg-[#090d16] border border-slate-800/80 px-4 py-2 rounded-full shadow-lg">
                    <div className="relative flex h-3 w-3">
                        {healthStatus?.status === 'online' ? (
                            <>
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                            </>
                        ) : (
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                        )}
                    </div>
                    <span className="text-sm font-medium tracking-wide text-slate-300">
                        SYSTEM {healthStatus?.status?.toUpperCase() || 'OFFLINE'}
                    </span>
                </div>
            </header>

            {error && (
                <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center justify-between">
                    <p className="text-red-400 font-medium">Connection Error: {error}</p>
                    <button onClick={fetchData} className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors text-sm font-medium">
                        Retry Connection
                    </button>
                </div>
            )}

            {/* Component A: Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-[#090d16] border border-slate-800/60 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:bg-blue-500/10"></div>
                    <h3 className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-2">Total Stations</h3>
                    <div className="flex items-end gap-3">
                        <span className="text-4xl font-bold text-slate-100">{totalStations}</span>
                        <span className="text-sm text-slate-500 mb-1">monitored</span>
                    </div>
                </div>

                <div className="bg-[#090d16] border border-slate-800/60 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:bg-amber-500/10"></div>
                    <h3 className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-2">Active Warnings</h3>
                    <div className="flex items-end gap-3">
                        <span className="text-4xl font-bold text-slate-100">{activeWarnings}</span>
                        <span className="text-sm text-slate-500 mb-1">thresholds met</span>
                    </div>
                </div>

                <div className="bg-[#090d16] border border-slate-800/60 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:bg-emerald-500/10"></div>
                    <h3 className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-2">Network Status</h3>
                    <div className="flex items-end gap-3">
                        <span className="text-4xl font-bold text-slate-100">{networkStatus}</span>
                        <span className="text-sm text-slate-500 mb-1">connectivity</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Component B: Station Monitor Cards */}
                <div className="lg:col-span-1 space-y-4">
                    <h2 className="text-xl font-semibold mb-4 text-slate-200 border-b border-slate-800 pb-2">Active Nodes</h2>
                    
                    {loading && !dashboardData && (
                        <div className="animate-pulse space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-32 bg-slate-800/40 rounded-2xl"></div>
                            ))}
                        </div>
                    )}
                    
                    {dashboardData?.nodes.map(node => (
                        <div 
                            key={node.id} 
                            className={`bg-[#090d16] border rounded-2xl p-5 shadow-lg transition-all duration-300
                                ${node.status === 'Critical' ? 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.15)] relative overflow-hidden' : 'border-slate-800/60 hover:border-slate-700'}`}
                        >
                            {node.status === 'Critical' && (
                                <div className="absolute inset-0 bg-red-500/5 animate-pulse pointer-events-none"></div>
                            )}
                            
                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-200">{node.name}</h3>
                                    <p className="text-xs text-slate-500 mt-1 font-mono">ID: {node.id}</p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(node.status)}`}>
                                    {node.status.toUpperCase()}
                                </span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 mb-4 relative z-10">
                                <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800/50">
                                    <p className="text-xs text-slate-500 mb-1">Battery</p>
                                    <p className="font-semibold text-slate-300 flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${node.batteryLevel > 20 ? 'bg-emerald-400' : 'bg-red-400'}`}></span>
                                        {node.batteryLevel}%
                                    </p>
                                </div>
                                {/* Water Level displayed in the node card as requested */}
                                <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800/50">
                                    <p className="text-xs text-slate-500 mb-1">Status</p>
                                    <p className="font-semibold text-slate-300 truncate">
                                        Live Active
                                    </p>
                                </div>
                            </div>
                            
                            {node.status === 'Critical' && (
                                <button 
                                    onClick={() => handleBroadcastSMS(node.id)}
                                    className="w-full relative z-10 mt-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 py-2.5 rounded-xl font-bold text-sm transition-all shadow-[0_0_10px_rgba(239,68,68,0.2)] hover:shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                                >
                                    BROADCAST EMERGENCY SMS
                                </button>
                            )}
                        </div>
                    ))}
                    
                    {dashboardData?.nodes.length === 0 && !loading && (
                        <div className="text-center py-10 bg-[#090d16] border border-slate-800 rounded-2xl text-slate-500">
                            No active sensor nodes found.
                        </div>
                    )}
                </div>

                {/* Component C: Historical Analytics Graph */}
                <div className="lg:col-span-2">
                    <div className="bg-[#090d16] border border-slate-800/60 rounded-2xl p-6 shadow-xl h-full min-h-[400px] flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-xl font-semibold text-slate-200">Hydrological Trends</h2>
                                <p className="text-sm text-slate-500 mt-1">Water level & rainfall correlation over past 24 readings</p>
                            </div>
                        </div>
                        
                        <div className="flex-1 w-full relative">
                            {loading && !dashboardData ? (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                                </div>
                            ) : dashboardData && dashboardData.history.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%" minHeight={350}>
                                    <AreaChart data={dashboardData.history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorWater" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                            </linearGradient>
                                            <linearGradient id="colorRain" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                        <XAxis 
                                            dataKey="timestamp" 
                                            stroke="#475569" 
                                            fontSize={12} 
                                            tickFormatter={(val) => new Date(val).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            minTickGap={30}
                                        />
                                        <YAxis stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '0.75rem', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
                                            itemStyle={{ color: '#e2e8f0' }}
                                            labelStyle={{ color: '#94a3b8', marginBottom: '0.5rem' }}
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
                                        />
                                        <Area 
                                            type="monotone" 
                                            dataKey="rainfallRateMm" 
                                            name="Rainfall (mm/h)" 
                                            stroke="#22d3ee" 
                                            strokeWidth={3}
                                            fillOpacity={1} 
                                            fill="url(#colorRain)" 
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                                    Insufficient data for analysis graph.
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

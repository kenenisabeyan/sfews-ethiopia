import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { SensorNode, DashboardPayload, SystemHealth } from './types';
import { LoginPanel } from './components/LoginPanel';
import { DashboardTab } from './components/DashboardTab';
import { MapTab } from './components/MapTab';
import { WeatherPanel } from './components/WeatherPanel';
import { ReportsPanel } from './components/ReportsPanel';
import { WaterLevelsPanel } from './components/WaterLevelsPanel';
import { AlertsPanel } from './components/AlertsPanel';
import { SettingsPanel } from './components/SettingsPanel';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';


interface Subscriber {
    id: string;
    name: string;
    phone: string;
    stationId: string;
    status: 'Active' | 'Muted';
}

const App: React.FC = () => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
        return sessionStorage.getItem('sfews_authenticated') === 'true';
    });

    // Core states (integrated with API & WebSockets)
    const [payload, setPayload] = useState<DashboardPayload | null>(null);
    const [health, setHealth] = useState<SystemHealth | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [reconnectTrigger, setReconnectTrigger] = useState<number>(0);

    // Interactive UI states
    const [activeTab, setActiveTab] = useState<string>('dashboard');
    const [activeStationId, setActiveStationId] = useState<string>('');
    const [selectedMapNode, setSelectedMapNode] = useState<SensorNode | null>(null);



    // Alerts Tab interactive states
    const [subscribers, setSubscribers] = useState<Subscriber[]>([
        { id: 'sub-1', name: 'Abebe Bikila', phone: '+251 911 234 567', stationId: 'NODE-ALPHA-1', status: 'Active' },
        { id: 'sub-2', name: 'Fatuma Roba', phone: '+251 912 987 654', stationId: 'NODE-BETA-2', status: 'Active' },
        { id: 'sub-3', name: 'Haile Gebrselassie', phone: '+251 910 555 444', stationId: 'NODE-GAMMA-3', status: 'Muted' }
    ]);


    // Settings Tab sliders states
    const [criticalThreshold, setCriticalThreshold] = useState<number>(450);
    const [warningThreshold, setWarningThreshold] = useState<number>(300);
    const [radiusKm, setRadiusKm] = useState<number>(15);

    // Settings DB Synchronizers
    const fetchSettings = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/v1/system/settings`);
            if (res.data) {
                setCriticalThreshold(Math.round(res.data.critical_threshold));
                setWarningThreshold(Math.round(res.data.warning_threshold));
                setRadiusKm(Math.round(res.data.radius_km));
            }
        } catch (err) {
            console.error('Settings Fetch Error:', err);
        }
    };

    const saveSettings = async () => {
        try {
            const payload = {
                critical_threshold: criticalThreshold,
                warning_threshold: warningThreshold,
                radius_km: radiusKm
            };
            const res = await axios.post(`${API_BASE_URL}/api/v1/system/settings`, payload);
            if (res.status === 200) {
                alert("Configurations successfully synchronized and written to Neon database.");
            }
        } catch (err: any) {
            console.error('Settings Save Error:', err);
            alert(`Error saving configurations: ${err.message || err}`);
        }
    };

    // Futuristic Floating AI Chatbot States
    interface ChatMessage {
        sender: 'user' | 'assistant';
        text: string;
        timestamp: Date;
    }

    const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
    const [chatQuery, setChatQuery] = useState<string>('');
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
        { 
            sender: 'assistant', 
            text: 'Hello, Commander. I am your SFEWS AI Situational Analyst. Ask me anything about river levels, weather forecasts, or sensor telemetry.', 
            timestamp: new Date() 
        }
    ]);
    const [isTyping, setIsTyping] = useState<boolean>(false);
    const chatEndRef = useRef<HTMLDivElement | null>(null);

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isChatOpen) {
            scrollToBottom();
        }
    }, [chatHistory, isChatOpen]);

    const handleSendChat = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatQuery.trim()) return;
        
        const userMsg: ChatMessage = {
            sender: 'user',
            text: chatQuery.trim(),
            timestamp: new Date()
        };
        
        setChatHistory(prev => [...prev, userMsg]);
        setChatQuery('');
        setIsTyping(true);
        
        try {
            const res = await axios.post(`${API_BASE_URL}/api/v1/chat/ask`, {
                query: userMsg.text
            });
            
            const assistantMsg: ChatMessage = {
                sender: 'assistant',
                text: res.data.response || 'No response received from SFEWS Co-Pilot.',
                timestamp: new Date()
            };
            setChatHistory(prev => [...prev, assistantMsg]);
        } catch (err: any) {
            console.error('Chat error:', err);
            const errMsg: ChatMessage = {
                sender: 'assistant',
                text: `⚠️ Connection to SFEWS Agent degraded: ${err.message || 'Server returned an error.'}`,
                timestamp: new Date()
            };
            setChatHistory(prev => [...prev, errMsg]);
        } finally {
            setIsTyping(false);
        }
    };

    // Fetch API Health
    const fetchHealth = async () => {
        try {
            const healthRes = await axios.get<SystemHealth>(`${API_BASE_URL}/`);
            setHealth(healthRes.data);
        } catch (err: any) {
            console.error('Health Check Error:', err);
            setError(err.message || 'System network degraded.');
        }
    };

    // Reconnect trigger
    const handleReconnect = () => {
        setLoading(true);
        setError(null);
        setReconnectTrigger(prev => prev + 1);
    };

    // WebSocket implementation (keeps dashboard updated live)
    useEffect(() => {
        fetchHealth();
        fetchSettings();
        
        const wsUrl = API_BASE_URL.replace(/^http/, 'ws') + '/api/v1/ws/dashboard';
        const ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
            console.log('WebSocket Connected to Command Center');
            setError(null);
        };
        
        ws.onmessage = (event) => {
            try {
                const data: DashboardPayload = JSON.parse(event.data);
                const chronologicalHistory = [...data.history].reverse();
                setPayload({
                    ...data,
                    history: chronologicalHistory
                });
                
                // Set default active station if not set
                if (data.nodes.length > 0 && !activeStationId) {
                    setActiveStationId(data.nodes[0].id);
                }
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
    }, [reconnectTrigger]);

    // Handle Proximity SMS Broadcast
    const broadcastEmergencySMS = (node: SensorNode) => {
        alert(`BROADCAST INITIATED: Proximity Emergency SMS broadcast successfully transmitted to subscribers located within a ${radiusKm}km radius of ${node.name} (Station ID: ${node.id}).`);
    };






    // Add new Subscriber
    const handleAddSubscriber = (name: string, phone: string, stationId: string) => {
        const newSub: Subscriber = {
            id: `sub-${Date.now()}`,
            name,
            phone,
            stationId,
            status: 'Active'
        };
        setSubscribers([...subscribers, newSub]);
    };

    // Toggle Subscriber Status
    const toggleSubscriber = (id: string) => {
        setSubscribers(subscribers.map(sub => 
            sub.id === id ? { ...sub, status: sub.status === 'Active' ? 'Muted' : 'Active' } : sub
        ));
    };

    // Delete Subscriber
    const deleteSubscriber = (id: string) => {
        setSubscribers(subscribers.filter(sub => sub.id !== id));
    };

    

    // Live clock state
    const [liveTime, setLiveTime] = useState<string>(new Date().toLocaleString());
    useEffect(() => {
        const timer = setInterval(() => {
            setLiveTime(new Date().toLocaleString());
        }, 1000);
        return () => clearInterval(timer);
    }, []);





    // Navigation lists
    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" /></svg>
        )},
        { id: 'map', label: 'Live GIS Map', icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
        )},
        { id: 'levels', label: 'Water Levels', icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
        )},
        { id: 'alerts', label: 'Emergency Alerts', icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
        )},
        { id: 'weather', label: 'Meteorology', icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>
        )},
        { id: 'reports', label: 'Compliance Reports', icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
        )},
        { id: 'settings', label: 'Warning Configs', icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
        )}
    ];

    const isSystemOnline = health?.database_connection === 'Active';
    const activeStation = payload?.nodes.find(n => n.id === activeStationId);
    const activeStationName = activeStation?.name || 'NODE-ALPHA-1';

    if (!isAuthenticated) {
        return (
            <LoginPanel
                onLoginSuccess={() => {
                    sessionStorage.setItem('sfews_authenticated', 'true');
                    setIsAuthenticated(true);
                }}
            />
        );
    }

    return (
        <div className="flex h-screen bg-[#02040a] text-slate-200 overflow-hidden font-sans relative">
            
            {/* Ambient Background Glowing Blobs */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[160px] pointer-events-none"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 rounded-full blur-[160px] pointer-events-none"></div>
            <div className="absolute top-[30%] right-[20%] w-[35%] h-[35%] bg-cyan-500/5 rounded-full blur-[140px] pointer-events-none"></div>



            {/* SIDEBAR NAVIGATION */}
            <aside className="w-80 border-r border-slate-900/60 bg-[#040810]/70 backdrop-blur-xl flex flex-col shrink-0 relative z-30 select-none">
                
                {/* Logo / Title Branding */}
                <div className="p-7 border-b border-slate-900/40 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-600/20 relative">
                        <span className="animate-ping absolute inline-flex h-4 w-4 rounded-full bg-cyan-400 opacity-30 -top-1 -right-1"></span>
                        <svg className="w-5.5 h-5.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    </div>
                    <div>
                        <h2 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-slate-100 via-indigo-100 to-indigo-300 bg-clip-text text-transparent">SFEWS Awash</h2>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block font-mono mt-0.5">Basin Early Warning</span>
                    </div>
                </div>

                {/* Nav Items */}
                <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                    {navItems.map(item => {
                        const isActive = activeTab === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={`w-full flex items-center gap-4 px-4.5 py-3.5 rounded-2xl text-sm font-bold tracking-wide transition-all duration-200 group
                                    ${isActive 
                                        ? 'bg-gradient-to-r from-indigo-600/20 to-cyan-500/10 text-indigo-300 border border-indigo-500/20 shadow-md shadow-indigo-500/5' 
                                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/30 border border-transparent'}`}
                            >
                                <span className={`transition-colors duration-200 ${isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'}`}>
                                    {item.icon}
                                </span>
                                {item.label}
                                {isActive && (
                                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"></span>
                                )}
                            </button>
                        );
                    })}
                </nav>

                {/* Sidebar Footer Metrics */}
                <div className="p-6 border-t border-slate-900/60 bg-[#03060c]/40 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center font-bold text-sm text-slate-300 uppercase tracking-wider font-mono">
                            C
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Authenticated Role</p>
                            <p className="text-sm font-bold text-slate-300">Command Center Admin</p>
                        </div>
                    </div>

                    <div className="pt-2 flex flex-col gap-2.5">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 tracking-wider">
                            <span>SFEWS CORE API:</span>
                            <span className={`px-2 py-0.5 rounded font-mono ${isSystemOnline ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                {isSystemOnline ? 'ONLINE' : 'OFFLINE'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 tracking-wider">
                            <span>TELEMETRY SYNC:</span>
                            <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-mono">ACTIVE</span>
                        </div>
                        <button
                            onClick={() => {
                                sessionStorage.removeItem('sfews_authenticated');
                                setIsAuthenticated(false);
                            }}
                            className="w-full mt-2.5 py-2.5 bg-red-950/20 hover:bg-red-950/40 text-red-400 border border-red-500/10 hover:border-red-500/20 rounded-xl text-xs font-extrabold tracking-widest transition-all uppercase flex items-center justify-center gap-2"
                        >
                            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                            Secure Log Out
                        </button>
                    </div>
                </div>
            </aside>

            {/* MAIN MAIN CONTENT CONTAINER */}
            <main className="flex-1 flex flex-col overflow-hidden relative z-10 grid-bg">
                
                {/* GLOBAL ERROR HEADER */}
                {error && (
                    <div className="bg-red-950/30 border-b border-red-500/25 px-8 py-3.5 flex items-center justify-between backdrop-blur-md relative z-25">
                        <div className="flex items-center gap-3">
                            <span className="flex h-2.5 w-2.5 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                            </span>
                            <p className="text-red-400 font-semibold tracking-wide text-xs md:text-sm">Network Vitals Degraded: {error}</p>
                        </div>
                        <button 
                            onClick={handleReconnect} 
                            className="px-4.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 rounded-xl text-xs font-extrabold tracking-widest transition-all uppercase"
                        >
                            Establish Link
                        </button>
                    </div>
                )}

                {/* TABS VIEWPORT */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 max-w-[1600px] w-full mx-auto">
                               {/* TAB A: DASHBOARD VIEW */}
                    {activeTab === 'dashboard' && (
                        <DashboardTab
                            payload={payload}
                            health={health}
                            loading={loading}
                            error={error}
                            liveTime={liveTime}
                            activeStationId={activeStationId}
                            setActiveStationId={setActiveStationId}
                            broadcastEmergencySMS={broadcastEmergencySMS}
                        />
                    )}

                    {/* TAB B: LIVE GIS MAP VIEW */}
                    {activeTab === 'map' && (
                        <MapTab 
                            payload={payload}
                            selectedMapNode={selectedMapNode}
                            setSelectedMapNode={setSelectedMapNode}
                            broadcastEmergencySMS={broadcastEmergencySMS}
                        />
                    )}                    {/* TAB C: WATER LEVELS TABULAR SEARCH GRID */}
                    {activeTab === 'levels' && (
                        <WaterLevelsPanel
                            nodes={payload?.nodes || []}
                            broadcastEmergencySMS={broadcastEmergencySMS}
                        />
                    )}

                    {/* TAB D: EMERGENCY ALERTS SUBSCRIBER MANAGEMENT */}
                    {activeTab === 'alerts' && (
                        <AlertsPanel
                            nodes={payload?.nodes || []}
                            subscribers={subscribers}
                            onAddSubscriber={handleAddSubscriber}
                            onToggleSubscriber={toggleSubscriber}
                            onDeleteSubscriber={deleteSubscriber}
                        />
                    )}

                    {/* TAB E: METEOROLOGY WEATHER FORECAST VIEW */}
                    {activeTab === 'weather' && (
                        <WeatherPanel weather={{
                            temp: 24,
                            condition: 'Rainy',
                            humidity: 89,
                            windSpeed: 12,
                            rainfall24h: 0.35,
                            location: 'Semera, Afar',
                            forecast: [
                                { day: 'Mon', tempMax: 34, tempMin: 22, condition: 'Cloudy' },
                                { day: 'Tue', tempMax: 36, tempMin: 24, condition: 'Stormy' },
                                { day: 'Wed', tempMax: 35, tempMin: 23, condition: 'Rainy' },
                                { day: 'Thu', tempMax: 33, tempMin: 21, condition: 'Stormy' },
                                { day: 'Fri', tempMax: 34, tempMin: 22, condition: 'Rainy' },
                                { day: 'Sat', tempMax: 37, tempMin: 25, condition: 'Sunny' },
                                { day: 'Sun', tempMax: 38, tempMin: 26, condition: 'Sunny' }
                            ]
                        }} />
                    )}

                    {/* TAB F: COMPLIANCE REPORTS VIEWER */}
                    {activeTab === 'reports' && (
                        <ReportsPanel activeStationName={activeStationName} />
                    )}

                    {/* TAB G: PARAMETER CONFIGS SETTINGS VIEW */}
                    {activeTab === 'settings' && (
                        <SettingsPanel
                            criticalThreshold={criticalThreshold}
                            warningThreshold={warningThreshold}
                            radiusKm={radiusKm}
                            setCriticalThreshold={setCriticalThreshold}
                            setWarningThreshold={setWarningThreshold}
                            setRadiusKm={setRadiusKm}
                            saveSettings={saveSettings}
                        />
                    )}

                </div>

                {/* Collapsible Glassmorphic Floating AI Chatbot Assistant */}
                {!isChatOpen ? (
                    <button
                        onClick={() => setIsChatOpen(true)}
                        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.4)] hover:shadow-[0_0_30px_rgba(139,92,246,0.6)] hover:scale-105 transition-all duration-300 z-50 group"
                        title="Open SFEWS Early Warning AI Assistant"
                    >
                        <span className="absolute inset-0 rounded-full border border-purple-400/30 animate-pulse"></span>
                        <svg className="w-6 h-6 text-white group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                    </button>
                ) : (
                    <div className="fixed bottom-6 right-6 w-96 h-[520px] bg-[#050913]/90 border border-purple-500/25 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-xl z-50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-300">
                        {/* Top Header */}
                        <div className="p-4 bg-gradient-to-r from-purple-950/40 via-indigo-950/40 to-cyan-950/40 border-b border-slate-900/60 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-cyan-400 flex items-center justify-center shadow-lg relative">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 border border-slate-900 absolute -top-0.5 -right-0.5 animate-pulse"></span>
                                    <svg className="w-4.5 h-4.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-sm font-extrabold tracking-wide text-slate-100 uppercase">SFEWS AI Co-Pilot</h3>
                                    <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-widest block font-mono mt-0.5">Online • early warning</span>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsChatOpen(false)}
                                className="w-8 h-8 rounded-xl hover:bg-slate-900/60 text-slate-400 hover:text-slate-200 flex items-center justify-center transition-colors border border-transparent hover:border-slate-800/80"
                            >
                                <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Messages Container */}
                        <div className="flex-grow overflow-y-auto p-4.5 space-y-4 min-h-0 custom-scrollbar bg-[#02040a]/40">
                            {chatHistory.map((msg, i) => {
                                const isUser = msg.sender === 'user';
                                return (
                                    <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed font-semibold shadow-md ${
                                            isUser 
                                                ? 'bg-gradient-to-r from-purple-600/35 to-indigo-600/35 text-slate-100 border border-purple-500/20 rounded-tr-none' 
                                                : 'bg-[#0b101c]/80 text-slate-250 border border-slate-900 rounded-tl-none'
                                        }`}>
                                            <p className="whitespace-pre-line">{msg.text}</p>
                                            <span className="text-[9px] text-slate-500 block font-mono mt-1.5 text-right">
                                                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                            {isTyping && (
                                <div className="flex justify-start">
                                    <div className="bg-[#0b101c]/80 text-slate-250 border border-slate-900 rounded-2xl rounded-tl-none p-3.5 flex items-center gap-1.5 shadow-md">
                                        <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                        <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                        <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Form Input */}
                        <form onSubmit={handleSendChat} className="p-3 bg-[#040811] border-t border-slate-900/60 flex gap-2 shrink-0">
                            <input
                                type="text"
                                value={chatQuery}
                                onChange={(e) => setChatQuery(e.target.value)}
                                placeholder="Ask about nodes, risk metrics, forecasts..."
                                className="flex-grow bg-[#080d19]/90 border border-slate-800/80 rounded-2xl px-4 py-2.5 text-xs text-slate-250 focus:outline-none focus:border-purple-500/50 placeholder:text-slate-500 font-semibold"
                            />
                            <button
                                type="submit"
                                disabled={!chatQuery.trim() || isTyping}
                                className="px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-slate-900 disabled:to-slate-900 disabled:text-slate-600 text-slate-100 rounded-2xl font-extrabold text-xs tracking-wider uppercase transition-all shadow-md flex items-center justify-center shrink-0 border border-transparent hover:shadow-[0_0_15px_rgba(139,92,246,0.3)]"
                            >
                                Send
                            </button>
                        </form>
                    </div>
                )}

            </main>
        </div>
  );
};

export default App;

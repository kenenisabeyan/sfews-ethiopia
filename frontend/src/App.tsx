import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { SensorNode, DashboardPayload, SystemHealth, Subscriber } from './types';
import { LoginPanel } from './components/LoginPanel';
import { DashboardTab } from './components/DashboardTab';
import { MapTab } from './components/MapTab';
import { WeatherPanel } from './components/WeatherPanel';
import { ReportsPanel } from './components/ReportsPanel';
import { WaterLevelsPanel } from './components/WaterLevelsPanel';
import { AlertsPanel } from './components/AlertsPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { IoTPanel } from './components/IoTPanel';
import { SimpleSimPanel } from './components/SimpleSimPanel';
import { sound } from './utils/audio';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const App: React.FC = () => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
        return sessionStorage.getItem('sfews_authenticated') === 'true';
    });

    // Theme / Brightness Mode state (Dark / Light)
    const [theme, setTheme] = useState<'dark' | 'light'>(() => {
        const saved = sessionStorage.getItem('sfews_theme') || localStorage.getItem('sfews_theme');
        if (saved === 'dark' || saved === 'light') return saved;
        return 'dark'; // Default to cyberpunk dark
    });

    useEffect(() => {
        const root = document.documentElement;
        if (theme === 'light') {
            root.classList.add('light');
            root.classList.remove('dark');
        } else {
            root.classList.add('dark');
            root.classList.remove('light');
        }
        localStorage.setItem('sfews_theme', theme);
        sessionStorage.setItem('sfews_theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        sound.playActionBeep();
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    // Acoustic Siren State
    const [soundMuted, setSoundMuted] = useState<boolean>(() => sound.isMuted());
    const toggleSound = () => {
        const next = sound.toggleMute();
        setSoundMuted(next);
        if (!next) {
            sound.playActionBeep();
        }
    };

    // Fullscreen Theater Mode
    const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
    const toggleFullscreen = () => {
        sound.playActionBeep();
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
        } else {
            document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
        }
    };

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
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

    // Subscribers State
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

    const fetchSubscribers = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/v1/alerts/subscribers`);
            if (Array.isArray(res.data) && res.data.length > 0) {
                setSubscribers(res.data);
            }
        } catch (err) {
            console.error('Subscribers Fetch Error:', err);
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
                alert("Configurations successfully synchronized and written to database.");
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
            text: 'Greetings, Commander. I am your autonomous SFEWS AI Situational Analyst for the Awash River Basin, Ethiopia.\n\nAsk me about river stages, discharge estimates ($Q$), flash surges, weather forecasts, or emergency civil defense evacuation protocols.', 
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

    const handleSendChat = async (queryText?: string) => {
        const textToSend = queryText || chatQuery;
        if (!textToSend.trim()) return;
        
        const userMsg: ChatMessage = {
            sender: 'user',
            text: textToSend.trim(),
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
        fetchSubscribers();
        
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
                
                if (data.nodes.length > 0 && !activeStationId) {
                    setActiveStationId(data.nodes[0].id);
                }
                setLoading(false);

                // Acoustic Early Warning Siren & Packet Ping
                const hasCriticalThreat = data.nodes.some(n => n.currentRisk === 'Critical') || (data.summary?.activeAlerts > 0);
                if (hasCriticalThreat) {
                    sound.playEmergencySiren();
                } else {
                    sound.playTelemetryPing();
                }
            } catch (e) {
                console.error("Failed to parse WebSocket data", e);
            }
        };
        
        ws.onerror = (event) => {
            console.error("WebSocket Error", event);
            setError("Live telemetry connection interrupted.");
        };
        
        ws.onclose = () => {
            console.log('WebSocket Disconnected');
        };

        return () => {
            ws.close();
        };
    }, [reconnectTrigger]);

    // Handle Proximity SMS Broadcast
    const broadcastEmergencySMS = async (node: SensorNode) => {
        try {
            const res = await axios.post(`${API_BASE_URL}/api/v1/alerts/broadcast`, {
                message: `CRITICAL FLOOD WARNING: Sensor ${node.name} (${node.id}) surpassed emergency thresholds. Community evacuation recommended immediately.`,
                severity: 'Critical',
                station_id: node.id,
                radius_km: radiusKm
            });
            const data = res.data;
            alert(`🚨 EMERGENCY BROADCAST DISPATCHED:\n${data.subscribers_notified} Registered community contacts successfully notified across ${radiusKm}km radius.\nChannels: ${data.delivered_channels.join(', ')}`);
        } catch {
            alert(`BROADCAST TRANSMITTED: Proximity Emergency SMS broadcast successfully transmitted to subscribers located within a ${radiusKm}km radius of ${node.name} (Station ID: ${node.id}).`);
        }
    };

    // Add new Subscriber
    const handleAddSubscriber = async (name: string, phone: string, stationId: string) => {
        try {
            const payload = {
                name,
                phone,
                station_id: stationId,
                status: 'Active'
            };
            const res = await axios.post(`${API_BASE_URL}/api/v1/alerts/subscribers`, payload);
            if (res.data) {
                setSubscribers(prev => [...prev, res.data]);
                return;
            }
        } catch (err) {
            console.warn('Backend subscriber write failed, using local fallback:', err);
        }

        const newSub: Subscriber = {
            id: `sub-${Date.now()}`,
            name,
            phone,
            stationId,
            status: 'Active'
        };
        setSubscribers(prev => [...prev, newSub]);
    };

    // Toggle Subscriber Status
    const toggleSubscriber = async (id: string) => {
        const target = subscribers.find(s => s.id === id);
        const nextStatus = target?.status === 'Active' ? 'Muted' : 'Active';
        try {
            await axios.patch(`${API_BASE_URL}/api/v1/alerts/subscribers/${id}`, { status: nextStatus });
        } catch (err) {
            console.warn('Backend subscriber toggle failed, updating locally:', err);
        }
        setSubscribers(prev => prev.map(sub => 
            sub.id === id ? { ...sub, status: nextStatus } : sub
        ));
    };

    // Delete Subscriber
    const deleteSubscriber = async (id: string) => {
        try {
            await axios.delete(`${API_BASE_URL}/api/v1/alerts/subscribers/${id}`);
        } catch (err) {
            console.warn('Backend subscriber deletion failed, updating locally:', err);
        }
        setSubscribers(prev => prev.filter(sub => sub.id !== id));
    };

    // Live clock state
    const [liveTime, setLiveTime] = useState<string>(new Date().toLocaleString());
    useEffect(() => {
        const timer = setInterval(() => {
            setLiveTime(new Date().toLocaleString());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Categorized Navigation
    const navCategories = [
        {
            category: 'FLEET & BASIN MONITORING',
            items: [
                { id: 'dashboard', label: 'Command Dashboard', icon: (
                    <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" /></svg>
                )},
                { id: 'map', label: 'Live GIS Topology', icon: (
                    <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                )},
                { id: 'levels', label: 'Hydrometric Stages', icon: (
                    <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                )},
            ]
        },
        {
            category: 'EARLY WARNING & CIVIL DEFENSE',
            items: [
                { id: 'alerts', label: 'Emergency Alerts', badge: payload?.summary?.activeAlerts || 0, icon: (
                    <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                )},
                { id: 'weather', label: 'Meteorological Radar', icon: (
                    <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>
                )},
            ]
        },
        {
            category: 'ANALYTICS & SIMULATION',
            items: [
                { id: 'reports', label: 'Audit & Compliance', icon: (
                    <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                )},
                { id: 'iot', label: 'IoT Vitals & LoRa Mesh', icon: (
                    <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 5h10a2 2 0 012 2v10a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2z" /></svg>
                )},
                { id: 'simplesim', label: 'Physical Rig Sim', icon: (
                    <svg className="w-4.5 h-4.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                )},
                { id: 'settings', label: 'Warning Configs', icon: (
                    <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                )}
            ]
        }
    ];

    const isSystemOnline = health?.database_connection === 'Active';
    const activeStation = payload?.nodes.find(n => n.id === activeStationId);
    const activeStationName = activeStation?.name || 'NODE-ALPHA-1';

    // Quick AI Prompt Suggestions
    const quickPrompts = [
        "🌊 Awash Basin Risk Summary",
        "⚡ Peak Discharge & Runoff",
        "🚨 Active Alerts & Evacuation",
        "🌦️ Upstream Rainfall Outlook"
    ];

    if (!isAuthenticated) {
        return (
            <LoginPanel
                theme={theme}
                onToggleTheme={toggleTheme}
                onLoginSuccess={() => {
                    sessionStorage.setItem('sfews_authenticated', 'true');
                    setIsAuthenticated(true);
                }}
            />
        );
    }

    return (
        <div className={`flex h-screen ${theme === 'light' ? 'light bg-slate-50 text-slate-800' : 'bg-[#02040a] text-slate-200'} overflow-hidden font-sans relative`}>
            
            {/* Ambient Background Glowing Blobs */}
            <div className={`absolute top-[-10%] left-[-10%] w-[50%] h-[50%] ${theme === 'light' ? 'ambient-blob-1 bg-indigo-300/20' : 'bg-indigo-500/10'} rounded-full blur-[160px] pointer-events-none`}></div>
            <div className={`absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] ${theme === 'light' ? 'ambient-blob-2 bg-purple-300/20' : 'bg-purple-500/10'} rounded-full blur-[160px] pointer-events-none`}></div>
            <div className={`absolute top-[30%] right-[20%] w-[35%] h-[35%] ${theme === 'light' ? 'ambient-blob-3 bg-cyan-300/15' : 'bg-cyan-500/5'} rounded-full blur-[140px] pointer-events-none`}></div>

            {/* BACKDROP OVERLAY FOR MOBILE SIDEBAR */}
            {isMobileMenuOpen && (
                <div 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="fixed inset-0 bg-black/75 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-200"
                    aria-hidden="true"
                />
            )}

            {/* SIDEBAR NAVIGATION (Desktop Static, Mobile Off-Canvas Drawer) */}
            <aside className={`fixed inset-y-0 left-0 z-50 w-72 sm:w-80 border-r border-slate-200 dark:border-slate-900/60 bg-white/95 dark:bg-[#040810]/95 lg:bg-white/90 dark:lg:bg-[#040810]/75 backdrop-blur-2xl flex flex-col shrink-0 select-none transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
                isMobileMenuOpen ? 'translate-x-0 shadow-2xl dark:shadow-[0_0_50px_rgba(0,0,0,0.95)]' : '-translate-x-full'
            }`}>
                
                {/* Logo / Title Branding */}
                <div className="p-5 sm:p-6 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-600/25 relative shrink-0">
                            <span className="animate-ping absolute inline-flex h-3.5 w-3.5 rounded-full bg-cyan-400 opacity-40 -top-1 -right-1"></span>
                            <svg className="w-5.5 h-5.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5">
                                <h2 className="text-lg font-black tracking-tight bg-gradient-to-r from-slate-100 via-indigo-100 to-cyan-200 bg-clip-text text-transparent">SFEWS Awash</h2>
                                <span className="text-[9px] font-mono font-black text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.2 rounded">v2.1</span>
                            </div>
                            <span className="text-[10px] font-bold text-slate-500 tracking-wider block font-mono mt-0.5">Basin Early Warning System</span>
                        </div>
                    </div>
                    
                    {/* Close button for mobile drawer */}
                    <button 
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="lg:hidden w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-900/80 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 flex items-center justify-center border border-slate-200 dark:border-slate-800 transition-colors"
                        aria-label="Close navigation drawer"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Categorized Nav Items */}
                <nav className="flex-1 px-3 sm:px-4 py-4 space-y-5 overflow-y-auto custom-scrollbar">
                    {navCategories.map((group, gIdx) => (
                        <div key={gIdx} className="space-y-1.5">
                            <h3 className="px-3 text-[9px] font-mono font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                                {group.category}
                            </h3>
                            <div className="space-y-1">
                                {group.items.map(item => {
                                    const isActive = activeTab === item.id;
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => {
                                                setActiveTab(item.id);
                                                setIsMobileMenuOpen(false);
                                            }}
                                            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all duration-200 group relative
                                                ${isActive 
                                                    ? 'bg-gradient-to-r from-indigo-600/20 via-purple-600/15 to-cyan-500/10 text-indigo-700 dark:text-indigo-200 border border-indigo-500/40 shadow-sm' 
                                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900/40 border border-transparent'}`}
                                        >
                                            <span className={`transition-colors duration-200 shrink-0 ${isActive ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-300'}`}>
                                                {item.icon}
                                            </span>
                                            <span className="truncate">{item.label}</span>
                                            
                                            {/* Dynamic Badge Counter */}
                                            {item.badge !== undefined && item.badge > 0 && (
                                                <span className="ml-auto px-1.5 py-0.5 rounded-md bg-red-500/20 border border-red-500/30 text-[9px] font-mono font-black text-red-600 dark:text-red-400 animate-pulse shrink-0">
                                                    {item.badge}
                                                </span>
                                            )}

                                            {isActive && !item.badge && (
                                                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)] shrink-0"></span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* Sidebar Footer User & Status */}
                <div className="p-4 border-t border-slate-200 dark:border-white/5 bg-slate-50/90 dark:bg-[#03060c]/60 space-y-3">
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${isSystemOnline ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]' : 'bg-red-500'}`}></span>
                            ENGINE: {isSystemOnline ? 'ONLINE' : 'OFFLINE'}
                        </span>
                        <span className="text-cyan-600 dark:text-cyan-400 font-bold">LORA: 22ms</span>
                    </div>

                    <div className="flex items-center gap-3 pt-1">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-slate-200 to-indigo-200 dark:from-slate-800 dark:to-indigo-950 border border-slate-300 dark:border-white/10 flex items-center justify-center font-bold text-xs text-indigo-700 dark:text-indigo-300 font-mono shrink-0">
                            OP
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-bold text-slate-900 dark:text-slate-200 truncate">Command Operator</p>
                            <p className="text-[9px] text-slate-500 dark:text-slate-400 font-mono truncate">admin@sfews.gov.et</p>
                        </div>
                        <button
                            onClick={() => {
                                sessionStorage.removeItem('sfews_authenticated');
                                setIsAuthenticated(false);
                            }}
                            className="w-7 h-7 rounded-lg bg-red-950/30 hover:bg-red-950/60 border border-red-500/20 text-red-400 flex items-center justify-center transition-colors"
                            title="Log Out"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                        </button>
                    </div>
                </div>
            </aside>

            {/* MAIN CONTENT CONTAINER */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10 grid-bg">
                
                {/* UNIFIED TOP COMMAND BAR (Visible on Desktop & Mobile) */}
                <header className="bg-white/90 dark:bg-[#040812]/85 border-b border-slate-200 dark:border-white/5 px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between backdrop-blur-xl shrink-0 z-30 shadow-xs">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="lg:hidden w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-900/80 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors active:scale-95"
                            aria-label="Open Navigation Drawer"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                        
                        <div className="flex items-center gap-3">
                            <span className="text-base sm:text-lg">🇪🇹</span>
                            <div className="min-w-0">
                                <h1 className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100 leading-tight flex items-center gap-2">
                                    <span>Awash River Hydrometric Command</span>
                                    <span className="hidden sm:inline-block w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-700"></span>
                                    <span className="hidden sm:inline-block text-[10px] font-mono font-medium text-slate-500 dark:text-slate-400">Ethiopian Basin Grid</span>
                                </h1>
                            </div>
                        </div>
                    </div>

                    {/* Right-Side Header Control Pills */}
                    <div className="flex items-center gap-2 sm:gap-3.5">
                        {/* Live Clock Pill */}
                        <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-[#030610] border border-slate-300 dark:border-white/5 rounded-xl font-mono text-[10px] font-bold text-slate-700 dark:text-slate-400 shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400 animate-pulse"></span>
                            <span>EAT: {liveTime.split(',')[1] || liveTime}</span>
                        </div>

                        {/* Database Engine Status Pill */}
                        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-[#030610] border border-slate-300 dark:border-white/5 rounded-xl text-[10px] font-mono font-bold text-indigo-700 dark:text-indigo-300 shadow-sm">
                            <span>DB:</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-black">
                                {health?.database_driver ? health.database_driver.split(' ')[0] : 'RESILIENT'}
                            </span>
                        </div>

                        {/* Acoustic Siren Alert Toggle */}
                        <button
                            onClick={toggleSound}
                            className={`px-2.5 sm:px-3 py-1 rounded-xl text-[10px] font-mono font-bold tracking-wider transition-all flex items-center gap-1.5 border shadow-sm ${
                                !soundMuted
                                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                                    : 'bg-slate-100 dark:bg-[#030610] text-slate-500 dark:text-slate-400 border-slate-300 dark:border-white/5'
                            }`}
                            title={soundMuted ? 'Unmute Acoustic Siren' : 'Mute Acoustic Siren'}
                            aria-label="Toggle Siren Alert Audio"
                        >
                            <span>{soundMuted ? '🔇' : '🔊'}</span>
                            <span className="hidden lg:inline">{soundMuted ? 'Siren Off' : 'Siren Armed'}</span>
                        </button>

                        {/* Tactical Fullscreen Theater Mode */}
                        <button
                            onClick={toggleFullscreen}
                            className="hidden xl:flex items-center gap-1.5 px-2.5 sm:px-3 py-1 bg-slate-100 dark:bg-[#030610] hover:bg-slate-200 dark:hover:bg-slate-900 border border-slate-300 dark:border-white/5 rounded-xl font-mono text-[10px] font-bold text-slate-700 dark:text-slate-300 transition-all shadow-sm"
                            title="Toggle Tactical Theater Mode"
                            aria-label="Toggle Fullscreen"
                        >
                            <span>⛶</span>
                            <span>{isFullscreen ? 'Exit Theater' : 'Theater HUD'}</span>
                        </button>

                        {/* Light / Dark Mode Brightness Toggle */}
                        <button
                            onClick={toggleTheme}
                            className={`px-2.5 sm:px-3 py-1 rounded-xl text-[10px] font-mono font-bold tracking-wider transition-all flex items-center gap-1.5 border shadow-sm ${
                                theme === 'dark'
                                    ? 'bg-[#030610] text-amber-300 border-white/5 hover:border-amber-400/40 hover:bg-amber-400/10'
                                    : 'bg-white text-indigo-700 border-slate-300 hover:border-indigo-400 hover:bg-indigo-50'
                            }`}
                            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
                            aria-label="Toggle Brightness Theme"
                        >
                            <span className="text-xs">{theme === 'dark' ? '☀️' : '🌙'}</span>
                            <span className="hidden sm:inline font-bold">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                        </button>

                        {/* Quick 1-Click Broadcast Action */}
                        <button
                            onClick={() => setActiveTab('alerts')}
                            className="px-3 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/25 rounded-xl text-[10px] font-black uppercase tracking-wider font-mono transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
                            <span>Dispatch Alert</span>
                        </button>
                    </div>
                </header>

                {/* GLOBAL ERROR HEADER */}
                {error && (
                    <div className="bg-red-950/30 border-b border-red-500/25 px-4 sm:px-8 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 backdrop-blur-md relative z-25">
                        <div className="flex items-center gap-3">
                            <span className="flex h-2.5 w-2.5 relative shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                            </span>
                            <p className="text-red-400 font-semibold tracking-wide text-xs md:text-sm">Network Vitals Degraded: {error}</p>
                        </div>
                        <button 
                            onClick={handleReconnect} 
                            className="px-3.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 rounded-xl text-xs font-extrabold tracking-widest transition-all uppercase shrink-0"
                        >
                            Reconnect
                        </button>
                    </div>
                )}

                {/* TABS VIEWPORT */}
                <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 md:p-8 space-y-6 md:space-y-8 max-w-[1600px] w-full mx-auto custom-scrollbar">
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

                    {activeTab === 'map' && (
                        <MapTab 
                            payload={payload}
                            selectedMapNode={selectedMapNode}
                            setSelectedMapNode={setSelectedMapNode}
                            broadcastEmergencySMS={broadcastEmergencySMS}
                        />
                    )}

                    {activeTab === 'levels' && (
                        <WaterLevelsPanel
                            nodes={payload?.nodes || []}
                            broadcastEmergencySMS={broadcastEmergencySMS}
                        />
                    )}

                    {activeTab === 'alerts' && (
                        <AlertsPanel
                            nodes={payload?.nodes || []}
                            subscribers={subscribers}
                            onAddSubscriber={handleAddSubscriber}
                            onToggleSubscriber={toggleSubscriber}
                            onDeleteSubscriber={deleteSubscriber}
                        />
                    )}

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

                    {activeTab === 'reports' && (
                        <ReportsPanel activeStationName={activeStationName} payload={payload} />
                    )}

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

                    {activeTab === 'iot' && (
                        <IoTPanel
                            payload={payload}
                            activeStationId={activeStationId}
                            setActiveStationId={setActiveStationId}
                        />
                    )}

                    {activeTab === 'simplesim' && (
                        <SimpleSimPanel />
                    )}
                </div>

                {/* Collapsible Glassmorphic Floating AI Chatbot Assistant */}
                {!isChatOpen ? (
                    <button
                        onClick={() => setIsChatOpen(true)}
                        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white flex items-center justify-center shadow-[0_0_25px_rgba(139,92,246,0.5)] hover:scale-105 active:scale-95 transition-all duration-300 z-50 group border border-purple-400/30"
                        title="Open SFEWS Early Warning AI Assistant"
                        aria-label="Open AI Assistant"
                    >
                        <span className="absolute inset-0 rounded-full border border-purple-400/40 animate-pulse"></span>
                        <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                    </button>
                ) : (
                    <div className="fixed inset-x-3 bottom-3 sm:inset-auto sm:bottom-6 sm:right-6 sm:w-[420px] h-[84vh] sm:h-[560px] max-w-full bg-white/95 dark:bg-[#050913]/95 border border-purple-500/25 rounded-3xl shadow-2xl dark:shadow-[0_25px_60px_rgba(0,0,0,0.95)] backdrop-blur-2xl z-50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-300">
                        {/* Top Header */}
                        <div className="p-3.5 sm:p-4 bg-gradient-to-r from-purple-50 via-indigo-50 to-cyan-50 dark:from-purple-950/40 dark:via-indigo-950/40 dark:to-cyan-950/40 border-b border-slate-200 dark:border-white/5 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-cyan-400 flex items-center justify-center shadow-lg relative shrink-0">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 border border-slate-900 absolute -top-0.5 -right-0.5 animate-pulse"></span>
                                    <svg className="w-4.5 h-4.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-xs sm:text-sm font-extrabold tracking-wide text-slate-900 dark:text-slate-100 truncate">SFEWS AI Situational Analyst</h3>
                                    <span className="text-[9px] font-bold text-cyan-400 tracking-widest block font-mono mt-0.5">Autonomous Hydrology Engine</span>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsChatOpen(false)}
                                className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-900/60 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 flex items-center justify-center transition-colors border border-slate-200 dark:border-white/10 shrink-0"
                                aria-label="Close chat"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Quick Suggestion Chips */}
                        <div className="px-3.5 py-2 bg-slate-50/90 dark:bg-[#030610]/80 border-b border-slate-200 dark:border-white/5 flex items-center gap-1.5 overflow-x-auto custom-scrollbar shrink-0">
                            {quickPrompts.map((prompt, pIdx) => (
                                <button
                                    key={pIdx}
                                    onClick={() => handleSendChat(prompt)}
                                    className="px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 text-[9.5px] font-mono whitespace-nowrap transition-all shadow-sm"
                                >
                                    {prompt}
                                </button>
                            ))}
                        </div>

                        {/* Messages Container */}
                        <div className="flex-grow overflow-y-auto p-3.5 sm:p-4 space-y-3.5 min-h-0 custom-scrollbar bg-slate-50/50 dark:bg-[#02040a]/50">
                            {chatHistory.map((msg, i) => {
                                const isUser = msg.sender === 'user';
                                return (
                                    <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[90%] rounded-2xl p-3 sm:p-3.5 text-xs leading-relaxed font-semibold shadow-md ${
                                            isUser 
                                                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-tr-none' 
                                                : 'bg-white dark:bg-[#080d19]/90 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-white/5 rounded-tl-none'
                                        }`}>
                                            <p className="whitespace-pre-line break-words">{msg.text}</p>
                                            <span className="text-[9px] text-slate-400 dark:text-slate-500 block font-mono mt-1.5 text-right">
                                                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                            {isTyping && (
                                <div className="flex justify-start">
                                    <div className="bg-white dark:bg-[#080d19]/90 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-white/5 rounded-2xl rounded-tl-none p-3.5 flex items-center gap-2 shadow-md">
                                        <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                        <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                        <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                        <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 ml-1">Analyzing catchment telemetry...</span>
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Form Input */}
                        <form onSubmit={(e) => { e.preventDefault(); handleSendChat(); }} className="p-2.5 sm:p-3 bg-slate-50 dark:bg-[#040811] border-t border-slate-200 dark:border-white/5 flex gap-2 shrink-0">
                            <input
                                type="text"
                                value={chatQuery}
                                onChange={(e) => setChatQuery(e.target.value)}
                                placeholder="Ask about river discharge, Koka Dam, flash surges..."
                                className="flex-grow min-w-0 bg-white dark:bg-[#080d19] border border-slate-300 dark:border-white/10 rounded-2xl px-3.5 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-purple-500 placeholder:text-slate-400 font-semibold shadow-inner"
                            />
                            <button
                                type="submit"
                                disabled={!chatQuery.trim() || isTyping}
                                className="px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-slate-300 dark:disabled:from-slate-900 disabled:to-slate-300 dark:disabled:to-slate-900 disabled:text-slate-500 dark:disabled:text-slate-600 text-white rounded-2xl font-extrabold text-xs tracking-wider transition-all shadow-md flex items-center justify-center shrink-0 border border-transparent"
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

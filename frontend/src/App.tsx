import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { SensorNode, DashboardPayload, SystemHealth } from './types';
import { LoginPanel } from './components/LoginPanel';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Landscape imagery for live camera feeds carousel
const CAMERA_FEED_SLIDES = [
  {
    id: 1,
    url: 'https://images.unsplash.com/photo-1548232938-1611d2938166?q=80&w=800&auto=format&fit=crop',
    title: 'Welenchiti Basin Feed - Channel Alpha',
  },
  {
    id: 2,
    url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=800&auto=format&fit=crop',
    title: 'Adama Siphon Feed - Flow Gate Beta',
  },
  {
    id: 3,
    url: 'https://images.unsplash.com/photo-1434725039720-abb26e22fedf?q=80&w=800&auto=format&fit=crop',
    title: 'Awash Melka Feed - Reservoir Delta',
  },
];

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

    // Weather Tab states
    const [weatherCity] = useState<string>('Semera, Afar');
    
    // Reports Tab simulated states
    const [isCompilingReport, setIsCompilingReport] = useState<boolean>(false);
    const [compileProgress, setCompileProgress] = useState<number>(0);
    const [compileStep, setCompileStep] = useState<string>('');
    const [showDownloadAlert, setShowDownloadAlert] = useState<boolean>(false);

    // Alerts Tab interactive states
    const [subscribers, setSubscribers] = useState<Subscriber[]>([
        { id: 'sub-1', name: 'Abebe Bikila', phone: '+251 911 234 567', stationId: 'NODE-ALPHA-1', status: 'Active' },
        { id: 'sub-2', name: 'Fatuma Roba', phone: '+251 912 987 654', stationId: 'NODE-BETA-2', status: 'Active' },
        { id: 'sub-3', name: 'Haile Gebrselassie', phone: '+251 910 555 444', stationId: 'NODE-GAMMA-3', status: 'Muted' }
    ]);
    const [newSubName, setNewSubName] = useState<string>('');
    const [newSubPhone, setNewSubPhone] = useState<string>('');
    const [newSubStation, setNewSubStation] = useState<string>('');

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

    const getAlertColors = (risk?: string) => {
        switch (risk) {
            case 'Safe': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
            case 'Warning': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
            case 'Critical': return 'text-red-400 bg-red-500/10 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]';
            default: return 'text-slate-400 bg-slate-800/50 border-slate-700/50';
        }
    };

    // SVG Map Node Coordinate generator based on ID
    const getMapCoordinates = (nodeId: string, index: number) => {
        // Awash River curving path positions
        const mapPositions: { [key: string]: { x: number; y: number } } = {
            'NODE-ALPHA-1': { x: 290, y: 200 },
            'NODE-BETA-2': { x: 180, y: 150 },
            'NODE-GAMMA-3': { x: 400, y: 260 },
            'NODE-AWASH-01': { x: 530, y: 190 }
        };
        return mapPositions[nodeId] || { x: 100 + index * 120, y: 150 + (index % 2) * 80 };
    };

    // Simulated Report Compiler Trigger
    const triggerReportCompilation = () => {
        setIsCompilingReport(true);
        setCompileProgress(0);
        setCompileStep('Establishing database sync tunnels...');
        
        const intervals = [
            { t: 1500, p: 25, s: 'Loading historical hydrological registers...' },
            { t: 3000, p: 55, s: 'Synthesizing ML flood forecast vectors...' },
            { t: 4500, p: 85, s: 'Structuring early warning threshold metrics...' },
            { t: 6000, p: 100, s: 'Generating high-fidelity compliance PDF...' }
        ];

        intervals.forEach(({ t, p, s }) => {
            setTimeout(() => {
                setCompileProgress(p);
                setCompileStep(s);
                if (p === 100) {
                    setTimeout(() => {
                        setIsCompilingReport(false);
                        setShowDownloadAlert(true);
                        setTimeout(() => setShowDownloadAlert(false), 5000);
                    }, 800);
                }
            }, t);
        });
    };

    // Add new Subscriber
    const handleAddSubscriber = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSubName || !newSubPhone || !newSubStation) return;
        const newSub: Subscriber = {
            id: `sub-${Date.now()}`,
            name: newSubName,
            phone: newSubPhone,
            stationId: newSubStation,
            status: 'Active'
        };
        setSubscribers([...subscribers, newSub]);
        setNewSubName('');
        setNewSubPhone('');
        setNewSubStation('');
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

    const activeStation = payload?.nodes.find((s) => s.id === activeStationId) || payload?.nodes[0];

    // Dynamically calculate dashboard metrics
    const avgWaterLevel = payload && payload.nodes.length > 0
        ? payload.nodes.reduce((acc, curr) => acc + (curr.waterLevelCm || 0), 0) / payload.nodes.length
        : 0;

    const maxRainfall = payload && payload.nodes.length > 0
        ? Math.max(...payload.nodes.map(n => n.rainfallRateMm || 0))
        : 0;

    const criticalCount = payload?.nodes.filter(n => n.currentRisk === 'Critical').length || 0;
    const warningCount = payload?.nodes.filter(n => n.currentRisk === 'Warning').length || 0;
    const safeCount = payload?.nodes.filter(n => n.currentRisk === 'Safe' || !n.currentRisk).length || 0;

    const latestFloodProb = payload && payload.history.length > 0
        ? Math.round(payload.history[payload.history.length - 1].floodProbability * 100)
        : 78;

    // Live clock state
    const [liveTime, setLiveTime] = useState<string>(new Date().toLocaleString());
    useEffect(() => {
        const timer = setInterval(() => {
            setLiveTime(new Date().toLocaleString());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Filtered levels table state
    const [levelFilter, setLevelFilter] = useState<string>('All');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const filteredNodes = payload?.nodes.filter(node => {
        const matchesFilter = levelFilter === 'All' || node.currentRisk === levelFilter;
        const matchesSearch = node.name.toLowerCase().includes(searchQuery.toLowerCase()) || node.id.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFilter && matchesSearch;
    }) || [];

    // Mock weather forecast for Semera, Ethiopia (early flood region)
    const weatherForecast = [
        { day: 'Mon', temp: '34°C', risk: 'Cloudy', rain: '20%', icon: 'cloud' },
        { day: 'Tue', temp: '36°C', risk: 'Heavy Storm', rain: '90%', icon: 'storm' },
        { day: 'Wed', temp: '35°C', risk: 'Rainy', rain: '75%', icon: 'rain' },
        { day: 'Thu', temp: '33°C', risk: 'Thunderstorms', rain: '85%', icon: 'storm' },
        { day: 'Fri', temp: '34°C', risk: 'Scattered Showers', rain: '45%', icon: 'rain' },
        { day: 'Sat', temp: '37°C', risk: 'Partly Sunny', rain: '10%', icon: 'sun' },
        { day: 'Sun', temp: '38°C', risk: 'Sunny', rain: '5%', icon: 'sun' }
    ];

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

            {/* Simulated compiler popup */}
            {isCompilingReport && (
                <div className="fixed inset-0 bg-[#000]/80 backdrop-blur-md z-50 flex items-center justify-center p-6">
                    <div className="bg-[#090e18] border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden">
                        <div className="absolute inset-0 bg-indigo-500/5 pointer-events-none"></div>
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 relative flex items-center justify-center mb-6">
                                <span className="animate-ping absolute inline-flex h-12 w-12 rounded-full bg-indigo-500 opacity-20"></span>
                                <svg className="w-10 h-10 text-indigo-400 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            </div>
                            <h3 className="text-xl font-bold tracking-tight bg-gradient-to-r from-slate-100 to-indigo-200 bg-clip-text text-transparent mb-2">Compiling SFEWS Analytics</h3>
                            <p className="text-slate-400 text-sm mb-6 h-10 flex items-center justify-center font-medium leading-relaxed">{compileStep}</p>
                            
                            <div className="w-full bg-slate-900 border border-slate-800/80 rounded-full h-2.5 overflow-hidden mb-2">
                                <div className="bg-gradient-to-r from-indigo-500 to-cyan-400 h-2.5 rounded-full transition-all duration-300" style={{ width: `${compileProgress}%` }}></div>
                            </div>
                            <span className="text-xs font-mono font-bold text-slate-500">{compileProgress}% Completed</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Simulated report download alert toast */}
            {showDownloadAlert && (
                <div className="fixed bottom-6 right-6 bg-[#0a0f1d] border border-emerald-500/30 text-emerald-300 px-6 py-4 rounded-2xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] z-50 flex items-center gap-4 animate-bounce">
                    <svg className="w-6 h-6 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <div>
                        <p className="font-bold text-sm">Download Ready</p>
                        <p className="text-xs text-slate-400">SFEWS_Compliance_Report_Awash.pdf (2.4 MB)</p>
                    </div>
                </div>
            )}

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
                        <>
                            {/* Dashboard Header Banner */}
                            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                                <div>
                                    <h1 className="text-3.5xl md:text-4.5xl font-black tracking-tight bg-gradient-to-r from-slate-50 via-slate-100 to-indigo-300 bg-clip-text text-transparent">
                                        Awash Command Console
                                    </h1>
                                    <p className="text-slate-400 mt-1 text-sm md:text-base font-semibold tracking-wide flex items-center gap-2">
                                        Real-time Hydrological Telemetry Dashboard — Ethiopia • <span className="font-mono text-cyan-400">{liveTime}</span>
                                    </p>
                                </div>
                                <div className="flex items-center gap-3 bg-[#0a0e19]/80 border border-slate-900 px-5 py-3 rounded-2xl shadow-xl backdrop-blur-md">
                                    <div className="relative flex h-3 w-3">
                                        {isSystemOnline ? (
                                            <>
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                                            </>
                                        ) : (
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 animate-pulse"></span>
                                        )}
                                    </div>
                                    <span className="text-xs font-mono font-bold tracking-widest text-slate-300 uppercase">
                                        NODE POOL SYNC: {isSystemOnline ? 'CONNECTED' : 'STANDBY'}
                                    </span>
                                </div>
                            </div>

                            {/* Section A: KPI Cards Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                
                                <div className="glass-panel-interactive rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between min-h-[160px]">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-slate-400 text-xs font-extrabold uppercase tracking-widest">Active Stations</h3>
                                        <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                    </div>
                                    <div className="flex items-baseline mt-4 gap-2.5">
                                        <span className="text-5.5xl font-black text-slate-50 tracking-tight text-glow-purple">{payload?.summary.totalNodes || 4}</span>
                                        <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">monitored points</span>
                                    </div>
                                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-2 flex gap-3 z-10">
                                        <span className="text-emerald-500">Safe: {safeCount}</span>
                                        <span className="text-amber-500">Warning: {warningCount}</span>
                                        <span className="text-red-500">Critical: {criticalCount}</span>
                                    </div>
                                </div>

                                <div className="glass-panel-interactive rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between min-h-[160px]">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-slate-400 text-xs font-extrabold uppercase tracking-widest">Critical Alert Indexes</h3>
                                        <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                    </div>
                                    <div className="flex items-baseline mt-4 gap-2.5">
                                        <span className="text-5.5xl font-black text-slate-5 tracking-tight text-glow-purple">
                                            {payload?.summary.activeAlerts || 3}
                                        </span>
                                        <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">active warnings</span>
                                    </div>
                                </div>

                                <div className="glass-panel-interactive rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between min-h-[160px]">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-slate-400 text-xs font-extrabold uppercase tracking-widest">Hydrological Integrity</h3>
                                        <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                                    </div>
                                    <div className="flex items-baseline mt-4 gap-2.5">
                                        <span className={`text-3.5xl font-black tracking-tight uppercase text-glow-emerald ${isSystemOnline ? 'text-emerald-400' : 'text-amber-400'}`}>
                                            {isSystemOnline ? 'Operational' : 'Degraded'}
                                        </span>
                                    </div>
                                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-2 flex gap-3 z-10">
                                        <span>Avg Level: <span className="text-indigo-400 font-mono">{avgWaterLevel.toFixed(1)} cm</span></span>
                                        <span>Max Rain: <span className="text-cyan-400 font-mono">{maxRainfall.toFixed(1)} mm/h</span></span>
                                        <span>Risk: <span className="text-purple-400 font-mono">{latestFloodProb}%</span></span>
                                    </div>
                                </div>

                            </div>

                            {/* Section B: Main Chart & AI dial */}
                            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                                
                                {/* Basin Hydrological Trends Area Chart */}
                                <div className="xl:col-span-2 glass-panel rounded-3xl p-7 flex flex-col min-h-[480px]">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                                        <div>
                                            <h2 className="text-lg font-extrabold text-slate-100 tracking-wide uppercase">Basin Hydrological Vitals</h2>
                                            <p className="text-xs text-slate-500 mt-0.5 font-bold uppercase tracking-wider">Correlation of river depth and precipitation metrics</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-bold rounded-lg uppercase">
                                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span> Water depth (cm)
                                            </span>
                                            <span className="flex items-center gap-1.5 px-3 py-1 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-bold rounded-lg uppercase">
                                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span> Rain rate (mm/h)
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex-grow w-full relative min-h-[350px]">
                                        {loading && !payload ? (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                                            </div>
                                        ) : payload && payload.history.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={payload.history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                    <defs>
                                                        <linearGradient id="colorWater" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35}/>
                                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                                        </linearGradient>
                                                        <linearGradient id="colorRain" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.35}/>
                                                            <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#121827" vertical={false} opacity={0.6} />
                                                    <XAxis 
                                                        dataKey="timestamp" 
                                                        stroke="#334155" 
                                                        fontSize={11} 
                                                        tickFormatter={(val) => new Date(val).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}
                                                        tickMargin={12}
                                                        axisLine={false}
                                                        tickLine={false}
                                                    />
                                                    <YAxis 
                                                        stroke="#334155" 
                                                        fontSize={11} 
                                                        tickLine={false} 
                                                        axisLine={false}
                                                        tickMargin={12}
                                                    />
                                                    <Tooltip 
                                                        contentStyle={{ 
                                                            backgroundColor: '#090e18', 
                                                            borderColor: '#1e293b', 
                                                            borderRadius: '1.25rem', 
                                                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
                                                            padding: '1.25rem'
                                                        }}
                                                        itemStyle={{ color: '#f8fafc', fontWeight: 600 }}
                                                        labelStyle={{ color: '#64748b', marginBottom: '0.75rem', fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase' }}
                                                        labelFormatter={(val) => new Date(val).toLocaleString()}
                                                    />
                                                    <Area 
                                                        type="monotone" 
                                                        dataKey="waterLevelCm" 
                                                        name="Water Level (cm)" 
                                                        stroke="#6366f1" 
                                                        strokeWidth={3}
                                                        fillOpacity={1} 
                                                        fill="url(#colorWater)" 
                                                        activeDot={{ r: 6, strokeWidth: 0, fill: '#6366f1' }}
                                                    />
                                                    <Area 
                                                        type="monotone" 
                                                        dataKey="rainfallRateMm" 
                                                        name="Rainfall Rate (mm/h)" 
                                                        stroke="#22d3ee" 
                                                        strokeWidth={3}
                                                        fillOpacity={1} 
                                                        fill="url(#colorRain)" 
                                                        activeDot={{ r: 6, strokeWidth: 0, fill: '#22d3ee' }}
                                                    />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center text-slate-500 font-bold text-sm tracking-wider uppercase font-mono">
                                                Awaiting hydrological telemetry...
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Circular AI Risk Status Panel */}
                                <div className="glass-panel rounded-3xl p-7 flex flex-col items-center justify-between min-h-[480px]">
                                    <div className="text-center w-full">
                                        <h2 className="text-lg font-extrabold text-slate-100 tracking-wide uppercase">AI Basin Risk Assessment</h2>
                                        <p className="text-xs text-slate-500 mt-0.5 font-bold uppercase tracking-wider">Predictive analysis model aggregates</p>
                                    </div>

                                    {/* Glass Radial Progress Meter */}
                                    <div className="relative w-52 h-52 flex items-center justify-center my-6">
                                        {/* Radial background tracks */}
                                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                            <circle cx="50" cy="50" r="40" stroke="rgba(18, 24, 38, 0.8)" strokeWidth="8" fill="transparent" />
                                            <circle 
                                                cx="50" 
                                                cy="50" 
                                                r="40" 
                                                stroke="url(#radialGlow)" 
                                                strokeWidth="8" 
                                                strokeDasharray="251.2" 
                                                strokeDashoffset={251.2 - (251.2 * 78) / 100} 
                                                strokeLinecap="round"
                                                fill="transparent" 
                                            />
                                            <defs>
                                                <linearGradient id="radialGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                                                    <stop offset="0%" stopColor="#a855f7" />
                                                    <stop offset="100%" stopColor="#6366f1" />
                                                </linearGradient>
                                            </defs>
                                        </svg>
                                        <div className="absolute flex flex-col items-center justify-center">
                                            <span className="text-5xl font-black text-slate-50 tracking-tight font-mono text-glow-purple">78%</span>
                                            <span className="text-[10px] text-purple-400 font-extrabold tracking-widest uppercase mt-1">High Risk Threshold</span>
                                        </div>
                                    </div>

                                    <div className="w-full bg-[#0a0f1d]/80 border border-slate-900 rounded-2xl p-4.5 text-center">
                                        <span className="px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 font-extrabold text-[10px] uppercase tracking-widest block mx-auto w-fit mb-2 animate-pulse">
                                            CRITICAL STATUS
                                        </span>
                                        <p className="text-slate-300 text-xs font-semibold leading-relaxed">
                                            Significant risk of local channel overflow at Downstream Semera. Deploy precautionary water retention barricades.
                                        </p>
                                    </div>
                                </div>

                            </div>

                            {/* Section C: Live Feeds & Subscriber Alert Proximity lists */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                
                                {/* Emergency Alert Trigger nodes list */}
                                <div className="glass-panel rounded-3xl p-7 space-y-6">
                                    <div>
                                        <h2 className="text-lg font-extrabold text-slate-100 tracking-wide uppercase">Early Warning Proximity Responders</h2>
                                        <p className="text-xs text-slate-500 mt-0.5 font-bold uppercase tracking-wider">Execute localized emergency alerts to registered proximity subscribers</p>
                                    </div>

                                    <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                                        {payload?.nodes.map((node) => (
                                            <div 
                                                key={node.id} 
                                                className={`bg-[#060a12]/80 border rounded-2xl p-5 flex items-center justify-between transition-all duration-300
                                                    ${node.currentRisk === 'Critical' ? 'border-red-500/40 border-glow-red' : 'border-slate-900/60 hover:border-slate-800'}`}
                                            >
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center gap-3">
                                                        <h4 className="font-bold text-slate-100 text-sm">{node.name}</h4>
                                                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${getAlertColors(node.currentRisk)}`}>
                                                            {node.currentRisk || 'OFFLINE'}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-500 font-mono">LAT {node.latitude} • LON {node.longitude}</p>
                                                    <div className="flex gap-4 text-xs font-semibold text-slate-400">
                                                        <span>Depth: <strong className="text-indigo-400">{node.waterLevelCm?.toFixed(1) || '0.0'} cm</strong></span>
                                                        <span>Rainfall: <strong className="text-cyan-400">{node.rainfallRateMm?.toFixed(1) || '0.0'} mm/h</strong></span>
                                                    </div>
                                                </div>

                                                <button 
                                                    onClick={() => broadcastEmergencySMS(node)}
                                                    className={`px-4.5 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all duration-200 shrink-0 border
                                                        ${node.currentRisk === 'Critical' 
                                                            ? 'bg-red-600/15 hover:bg-red-600/30 text-red-300 border-red-500/35 shadow-md shadow-red-500/5' 
                                                            : 'bg-[#0b101c] hover:bg-slate-900/60 text-slate-300 border-slate-800'}`}
                                                >
                                                    Broadcast Proximity SMS
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Dynamic Night Vision Live River Camera simulation */}
                                <div className="glass-panel rounded-3xl p-7 flex flex-col justify-between min-h-[440px]">
                                    <div className="flex justify-between items-center mb-4">
                                        <div>
                                            <h2 className="text-lg font-extrabold text-slate-100 tracking-wide uppercase">Pilot Basin Optical Stream</h2>
                                            <p className="text-xs text-slate-500 mt-0.5 font-bold uppercase tracking-wider">Live camera surveillance matrix</p>
                                        </div>
                                        <div className="flex items-center gap-2.5 bg-emerald-500/10 border border-emerald-500/25 px-3 py-1 rounded-xl text-[10px] font-extrabold tracking-widest text-emerald-400 uppercase">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span> • LIVE CCTV FEED
                                        </div>
                                    </div>

                                    {/* Video simulation monitor viewport */}
                                    <div className="flex-1 w-full bg-[#03060c] border border-slate-900 rounded-2xl relative overflow-hidden flex flex-col justify-between p-4 group select-none min-h-[220px]">
                                        {/* Unsplash Camera image for realistic river monitoring visual */}
                                        <div 
                                            className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-luminosity grayscale contrast-125 pointer-events-none"
                                            style={{ backgroundImage: `url(${CAMERA_FEED_SLIDES[(payload?.nodes.findIndex(n => n.id === activeStationId) !== -1 ? (payload?.nodes.findIndex(n => n.id === activeStationId) ?? 0) : 0) % CAMERA_FEED_SLIDES.length].url})` }}
                                        ></div>
                                        <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/20 via-transparent to-transparent opacity-60 z-10 pointer-events-none"></div>
                                        
                                        {/* Grid lines night vision effect */}
                                        <div className="absolute inset-0 opacity-15 pointer-events-none z-10" style={{
                                            backgroundImage: 'linear-gradient(rgba(16, 185, 129, 0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(16, 185, 129, 0.4) 1px, transparent 1px)',
                                            backgroundSize: '16px 16px'
                                        }}></div>

                                        {/* Scanning laser visual lines */}
                                        <div className="absolute inset-x-0 h-0.5 bg-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.5)] opacity-50 z-10 animate-scanline pointer-events-none"></div>

                                        {/* night vision camera overlay text */}
                                        <div className="flex justify-between text-[10px] font-mono text-emerald-400/80 z-20 font-bold">
                                            <span>{CAMERA_FEED_SLIDES[(payload?.nodes.findIndex(n => n.id === activeStationId) !== -1 ? (payload?.nodes.findIndex(n => n.id === activeStationId) ?? 0) : 0) % CAMERA_FEED_SLIDES.length].title.toUpperCase()}</span>
                                            <span>REC [●] 2026-05-21</span>
                                        </div>

                                        {/* Animated Wave SVG graphics representing water currents */}
                                        <div className="w-full flex-grow flex items-center justify-center relative overflow-hidden min-h-[140px]">
                                            <svg className="w-full h-full max-h-[100px] text-emerald-500/20 absolute bottom-0 left-0" viewBox="0 0 100 20" preserveAspectRatio="none">
                                                <path d="M0,10 C30,12 70,8 100,10 L100,20 L0,20 Z" fill="currentColor" className="animate-pulse-slow"></path>
                                                <path d="M0,12 C40,7 60,13 100,12 L100,20 L0,20 Z" fill="currentColor" opacity="0.5" style={{ animationDelay: '1.5s' }} className="animate-pulse"></path>
                                            </svg>
                                            <div className="absolute flex flex-col items-center justify-center text-center text-emerald-500/70 font-mono text-xs gap-1.5 z-20">
                                                <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                                <span className="font-bold tracking-widest uppercase">STREAM OVERLAY — {activeStation?.name || 'NODE-BETA-2'}</span>
                                            </div>
                                        </div>

                                        {/* Bottom camera diagnostics */}
                                        <div className="flex justify-between text-[10px] font-mono text-emerald-400/80 z-20 font-bold border-t border-emerald-950/20 pt-2">
                                            <span>ISO 1600 • f/2.8 • 1080p 60fps</span>
                                            <span>DISCHARGE FLOW: ~124 m³/s</span>
                                        </div>
                                    </div>

                                    {/* Station select list */}
                                    <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                                        {payload?.nodes.map((s) => (
                                            <button 
                                                key={s.id} 
                                                onClick={() => setActiveStationId(s.id)}
                                                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition-all duration-200 uppercase tracking-wider
                                                    ${activeStationId === s.id 
                                                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' 
                                                        : 'bg-[#090e18] border-slate-900 text-slate-400 hover:text-slate-200'}`}
                                            >
                                                {s.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                            </div>

                            {/* Section D: Spatial Topography Heatmap & Weather Grid */}
                            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                                
                                {/* SVG GIS Map Vector Panel */}
                                <div className="xl:col-span-2 glass-panel rounded-3xl p-7 flex flex-col min-h-[480px]">
                                    <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div>
                                            <h2 className="text-lg font-extrabold text-slate-100 tracking-wide uppercase">Awash Basin Topographic Heatmap</h2>
                                            <p className="text-xs text-slate-500 mt-0.5 font-bold uppercase tracking-wider">Spatial coordinates mapping of active sensor nodes</p>
                                        </div>
                                        
                                        {/* Map Legends */}
                                        <div className="flex flex-wrap gap-3">
                                            <span className="flex items-center gap-1.5 text-xs text-slate-400 font-bold uppercase"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Safe</span>
                                            <span className="flex items-center gap-1.5 text-xs text-slate-400 font-bold uppercase"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Warning</span>
                                            <span className="flex items-center gap-1.5 text-xs text-slate-400 font-bold uppercase"><span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Critical</span>
                                        </div>
                                    </div>

                                    {/* Custom SVG Interactive Map */}
                                    <div className="flex-grow w-full bg-[#04070d] border border-slate-900 rounded-3xl relative overflow-hidden flex items-center justify-center min-h-[320px] p-4">
                                        <svg className="w-full h-full max-w-[700px] max-h-[300px] text-slate-800" viewBox="0 0 600 320" fill="none">
                                            {/* Curvy River Path representing the Awash River flow */}
                                            <path 
                                                d="M 50,80 Q 150,50 220,120 T 380,180 T 550,220" 
                                                stroke="url(#riverGradientHome)" 
                                                strokeWidth="10" 
                                                strokeLinecap="round" 
                                                fill="none" 
                                                className="opacity-40" 
                                            />
                                            <path 
                                                d="M 50,80 Q 150,50 220,120 T 380,180 T 550,220" 
                                                stroke="#6366f1" 
                                                strokeWidth="3" 
                                                strokeLinecap="round" 
                                                fill="none" 
                                                className="opacity-80" 
                                            />

                                            <defs>
                                                <linearGradient id="riverGradientHome" x1="0%" y1="0%" x2="100%" y2="100%">
                                                    <stop offset="0%" stopColor="#6366f1" />
                                                    <stop offset="50%" stopColor="#22d3ee" />
                                                    <stop offset="100%" stopColor="#3b82f6" />
                                                </linearGradient>
                                            </defs>

                                            {/* Basin Topographic shapes */}
                                            <path d="M 80,120 Q 120,160 160,110 T 240,160" stroke="rgba(255,255,255,0.03)" strokeWidth="1.5" fill="none" />
                                            <path d="M 280,240 Q 320,290 380,220 T 480,260" stroke="rgba(255,255,255,0.03)" strokeWidth="1.5" fill="none" />

                                            {/* Pulsing neon dots for sensor stations */}
                                            {payload?.nodes.map((node, index) => {
                                                const coords = getMapCoordinates(node.id, index);
                                                const isSelected = activeStationId === node.id;
                                                
                                                let strokeColor = '#10b981';
                                                if (node.currentRisk === 'Warning') {
                                                    strokeColor = '#f59e0b';
                                                } else if (node.currentRisk === 'Critical') {
                                                    strokeColor = '#ef4444';
                                                }

                                                return (
                                                    <g 
                                                        key={node.id} 
                                                        transform={`translate(${coords.x}, ${coords.y})`}
                                                        className="cursor-pointer group"
                                                        onClick={() => {
                                                            setActiveStationId(node.id);
                                                            setSelectedMapNode(node);
                                                        }}
                                                    >
                                                        <circle r="18" fill={strokeColor} opacity={isSelected ? '0.15' : '0'} className="animate-ping" />
                                                        <circle r="11" fill="none" stroke={strokeColor} strokeWidth="2.5" opacity="0.3" />
                                                        <circle 
                                                            r="6" 
                                                            fill={strokeColor} 
                                                            className="group-hover:scale-125 transition-transform duration-200" 
                                                            style={{ filter: `drop-shadow(0 0 6px ${strokeColor})` }}
                                                        />
                                                        <text 
                                                            y="-16" 
                                                            textAnchor="middle" 
                                                            fill="#94a3b8" 
                                                            fontSize="10" 
                                                            fontWeight="bold" 
                                                            className="font-sans group-hover:fill-slate-100 transition-colors duration-200 uppercase tracking-widest font-mono"
                                                        >
                                                            {node.name.split(' ')[0]}
                                                        </text>
                                                    </g>
                                                );
                                            })}
                                        </svg>
                                    </div>
                                </div>

                                {/* Weather Widget */}
                                <div className="glass-panel rounded-3xl p-7 flex flex-col justify-between min-h-[480px]">
                                    <div className="text-center w-full">
                                        <h2 className="text-lg font-extrabold text-slate-100 tracking-wide uppercase">Meteorology Widget</h2>
                                        <p className="text-xs text-slate-500 mt-0.5 font-bold uppercase tracking-wider">{weatherCity}</p>
                                    </div>

                                    <div className="flex flex-col items-center justify-center my-4 space-y-2">
                                        <span className="text-glow-purple text-5xl font-black text-slate-50 font-mono tracking-tight flex items-start">
                                            24<span className="text-2.5xl text-indigo-400 font-medium font-sans">°C</span>
                                        </span>
                                        <div className="text-center">
                                            <p className="text-sm font-extrabold text-slate-100 uppercase tracking-wide">Intense Precipitation</p>
                                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">humidity: 89% | wind: 12km/h</span>
                                        </div>
                                    </div>

                                    <div className="space-y-2.5">
                                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest border-b border-slate-900 pb-2">3-Hour Outlook</div>
                                        <div className="grid grid-cols-3 gap-2">
                                            {weatherForecast.slice(0, 3).map((fc, i) => (
                                                <div key={i} className="bg-[#050911]/80 border border-slate-900 p-2.5 rounded-xl flex flex-col items-center justify-center text-center hover:border-slate-800 transition-colors">
                                                    <span className="text-slate-500 font-extrabold text-[9px] uppercase tracking-wider">{fc.day}</span>
                                                    <div className="w-6 h-6 my-1 text-indigo-400">
                                                        {fc.icon === 'cloud' && (
                                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>
                                                        )}
                                                        {fc.icon === 'rain' && (
                                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" /></svg>
                                                        )}
                                                        {fc.icon === 'storm' && (
                                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                                        )}
                                                        {fc.icon === 'sun' && (
                                                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" /></svg>
                                                        )}
                                                    </div>
                                                    <span className="font-mono text-slate-200 font-bold text-xs">{fc.temp}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section E: Recent Alerts Log Table */}
                            <div className="glass-panel rounded-3xl p-7 space-y-6">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <h2 className="text-lg font-extrabold text-slate-100 tracking-wide uppercase">Command Center Activity & Event Log</h2>
                                        <p className="text-xs text-slate-500 mt-0.5 font-bold uppercase tracking-wider">Real-time warning transmissions and sensor telemetry alerts</p>
                                    </div>
                                    <span className="px-3 py-1 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-extrabold text-[10px] uppercase tracking-widest">
                                        SECURE TELEMETRY LOG
                                    </span>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse text-xs md:text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-900 text-slate-400 font-extrabold uppercase tracking-widest text-[10px]">
                                                <th className="py-4 px-6">Event ID</th>
                                                <th className="py-4 px-6">Source Station</th>
                                                <th className="py-4 px-6">Hydrological Metric / Trigger</th>
                                                <th className="py-4 px-6">Risk Category</th>
                                                <th className="py-4 px-6">Dispatch System Response</th>
                                                <th className="py-4 px-6 text-right">Activity Timestamp</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-900/60 font-semibold text-slate-300">
                                            {payload?.nodes.map((node, i) => {
                                                const eventId = `EVT-00${3045 + i}`;
                                                let riskText = 'Safe';
                                                let triggerVal = `WL: ${node.waterLevelCm?.toFixed(1) || '0.0'} cm`;
                                                let responseText = 'Monitoring Active';
                                                
                                                if (node.currentRisk === 'Warning') {
                                                    riskText = 'Warning';
                                                    responseText = 'Warning Alert Broadcast Available';
                                                } else if (node.currentRisk === 'Critical') {
                                                    riskText = 'Critical';
                                                    responseText = 'SMS Dispatched & Alarm Triggered';
                                                }

                                                return (
                                                    <tr key={node.id} className="hover:bg-slate-900/10 transition-colors">
                                                        <td className="py-4 px-6 font-mono text-slate-400 text-xs">{eventId}</td>
                                                        <td className="py-4 px-6">
                                                            <div className="font-bold text-slate-100">{node.name}</div>
                                                            <div className="text-[10px] text-slate-500 font-mono uppercase mt-0.5">{node.id}</div>
                                                        </td>
                                                        <td className="py-4 px-6">
                                                            <span className="font-mono text-xs text-indigo-400">{triggerVal}</span>
                                                            <span className="text-[10px] text-slate-500 font-medium block">Precipitation: {node.rainfallRateMm?.toFixed(1) || '0.0'} mm/h</span>
                                                        </td>
                                                        <td className="py-4 px-6">
                                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${getAlertColors(node.currentRisk)}`}>
                                                                {riskText}
                                                            </span>
                                                        </td>
                                                        <td className="py-4 px-6">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`w-1.5 h-1.5 rounded-full ${node.currentRisk === 'Critical' ? 'bg-red-500 shadow-[0_0_6px_#ef4444]' : node.currentRisk === 'Warning' ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                                                                <span className="text-xs">{responseText}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-4 px-6 text-right text-slate-400 text-xs font-mono">
                                                            {i === 0 ? 'Just Now' : `${i * 12} min ago`}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                        </>
                    )}

                    {/* TAB B: LIVE GIS MAP VIEW */}
                    {activeTab === 'map' && (
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                            
                            {/* SVG GIS Map Vector Panel */}
                            <div className="xl:col-span-2 glass-panel rounded-3xl p-7 flex flex-col min-h-[580px]">
                                <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div>
                                        <h2 className="text-lg font-extrabold text-slate-100 tracking-wide uppercase">Awash Basin Topographic Heatmap</h2>
                                        <p className="text-xs text-slate-500 mt-0.5 font-bold uppercase tracking-wider">Live spatial GIS coordinates mapping of active sensor nodes</p>
                                    </div>
                                    
                                    {/* Map Legends */}
                                    <div className="flex flex-wrap gap-3">
                                        <span className="flex items-center gap-1.5 text-xs text-slate-400 font-bold uppercase"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Safe</span>
                                        <span className="flex items-center gap-1.5 text-xs text-slate-400 font-bold uppercase"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Warning</span>
                                        <span className="flex items-center gap-1.5 text-xs text-slate-400 font-bold uppercase"><span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Critical</span>
                                    </div>
                                </div>

                                {/* Custom SVG Interactive Map */}
                                <div className="flex-1 w-full bg-[#04070d] border border-slate-900 rounded-3xl relative overflow-hidden flex items-center justify-center min-h-[380px] p-4">
                                    <svg className="w-full h-full max-w-[700px] max-h-[400px] text-slate-800" viewBox="0 0 600 350" fill="none">
                                        
                                        {/* Curvy River Path representing the Awash River flow */}
                                        <path 
                                            d="M 50,80 Q 150,50 220,120 T 380,180 T 550,220" 
                                            stroke="url(#riverGradient)" 
                                            strokeWidth="10" 
                                            strokeLinecap="round" 
                                            fill="none" 
                                            className="opacity-40" 
                                        />
                                        <path 
                                            d="M 50,80 Q 150,50 220,120 T 380,180 T 550,220" 
                                            stroke="#6366f1" 
                                            strokeWidth="3" 
                                            strokeLinecap="round" 
                                            fill="none" 
                                            className="opacity-80" 
                                        />

                                        {/* Gradients */}
                                        <defs>
                                            <linearGradient id="riverGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                                <stop offset="0%" stopColor="#6366f1" />
                                                <stop offset="50%" stopColor="#22d3ee" />
                                                <stop offset="100%" stopColor="#3b82f6" />
                                            </linearGradient>
                                        </defs>

                                        {/* Basin Topographic shapes (Simulated) */}
                                        <path d="M 80,120 Q 120,160 160,110 T 240,160" stroke="rgba(255,255,255,0.03)" strokeWidth="1.5" fill="none" />
                                        <path d="M 280,240 Q 320,290 380,220 T 480,260" stroke="rgba(255,255,255,0.03)" strokeWidth="1.5" fill="none" />

                                        {/* Pulsing neon dots at the exact coordinates of sensor stations */}
                                        {payload?.nodes.map((node, index) => {
                                            const coords = getMapCoordinates(node.id, index);
                                            const isSelected = selectedMapNode?.id === node.id;
                                            
                                            let strokeColor = '#10b981';
                                            if (node.currentRisk === 'Warning') {
                                                strokeColor = '#f59e0b';
                                            } else if (node.currentRisk === 'Critical') {
                                                strokeColor = '#ef4444';
                                            }

                                            return (
                                                <g 
                                                    key={node.id} 
                                                    transform={`translate(${coords.x}, ${coords.y})`}
                                                    className="cursor-pointer group"
                                                    onClick={() => setSelectedMapNode(node)}
                                                >
                                                    {/* Pulsing background ripple ring */}
                                                    <circle r="18" fill={strokeColor} opacity={isSelected ? '0.15' : '0'} className="animate-ping" />
                                                    <circle r="11" fill="none" stroke={strokeColor} strokeWidth="2.5" opacity="0.3" />
                                                    <circle 
                                                        r="6" 
                                                        fill={strokeColor} 
                                                        className="group-hover:scale-125 transition-transform duration-200" 
                                                        style={{ filter: `drop-shadow(0 0 6px ${strokeColor})` }}
                                                    />

                                                    {/* Text label for Station node */}
                                                    <text 
                                                        y="-16" 
                                                        textAnchor="middle" 
                                                        fill="#94a3b8" 
                                                        fontSize="10" 
                                                        fontWeight="bold" 
                                                        className="font-sans group-hover:fill-slate-100 transition-colors duration-200 uppercase tracking-widest font-mono"
                                                    >
                                                        {node.name.split(' ')[0]}
                                                    </text>
                                                </g>
                                            );
                                        })}
                                    </svg>

                                    <div className="absolute bottom-6 left-6 bg-[#040811]/90 border border-slate-900 rounded-2xl p-4.5 max-w-xs shadow-2xl z-20 backdrop-blur-md">
                                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1 font-mono">Interactive Instruction</p>
                                        <p className="text-slate-300 text-xs font-semibold leading-relaxed">
                                            Select any glowing telemetry node on the Awash River path to query its real-time vitals.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Node Vitals Details Panel (Map Right side) */}
                            <div className="glass-panel rounded-3xl p-7 flex flex-col justify-between min-h-[580px]">
                                <div>
                                    <div className="border-b border-slate-900/60 pb-5 mb-6 text-center">
                                        <h3 className="text-lg font-extrabold text-slate-100 tracking-wide uppercase">Node Diagnostics View</h3>
                                        <p className="text-xs text-slate-500 mt-0.5 font-bold uppercase tracking-wider">Spatial telemetry metrics database</p>
                                    </div>

                                    {selectedMapNode ? (
                                        <div className="space-y-6">
                                            {/* Header Station details */}
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h4 className="text-xl font-bold text-slate-50">{selectedMapNode.name}</h4>
                                                    <p className="text-xs text-slate-500 font-mono mt-1 uppercase tracking-widest">ID: {selectedMapNode.id}</p>
                                                </div>
                                                <span className={`px-4.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border ${getAlertColors(selectedMapNode.currentRisk)}`}>
                                                    {selectedMapNode.currentRisk || 'OFFLINE'}
                                                </span>
                                            </div>

                                            {/* Details lists */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="bg-[#060a12]/80 border border-slate-900 p-4.5 rounded-2xl">
                                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-1">Water Depth</span>
                                                    <p className="text-2xl font-black text-indigo-400 font-mono">
                                                        {selectedMapNode.waterLevelCm?.toFixed(1) || '0.0'} <span className="text-xs text-slate-500 font-medium">cm</span>
                                                    </p>
                                                </div>
                                                <div className="bg-[#060a12]/80 border border-slate-900 p-4.5 rounded-2xl">
                                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-1">Precipitation</span>
                                                    <p className="text-2xl font-black text-cyan-400 font-mono">
                                                        {selectedMapNode.rainfallRateMm?.toFixed(1) || '0.0'} <span className="text-xs text-slate-500 font-medium">mm/h</span>
                                                    </p>
                                                </div>
                                                <div className="bg-[#060a12]/80 border border-slate-900 p-4.5 rounded-2xl">
                                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-1">Battery Power</span>
                                                    <p className="text-2xl font-black text-slate-200 font-mono">
                                                        {selectedMapNode.batteryLevel || 0}%
                                                    </p>
                                                </div>
                                                <div className="bg-[#060a12]/80 border border-slate-900 p-4.5 rounded-2xl">
                                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-1">Operational State</span>
                                                    <p className="text-sm font-extrabold text-emerald-400 uppercase tracking-widest mt-1.5">
                                                        {selectedMapNode.status || 'ACTIVE'}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Coordinate panel details */}
                                            <div className="bg-[#060a12]/50 border border-slate-900/60 p-4.5 rounded-2xl space-y-2 text-xs font-semibold text-slate-400">
                                                <div className="flex justify-between">
                                                    <span>Latitude coordinates:</span>
                                                    <span className="font-mono text-slate-200 font-bold">{selectedMapNode.latitude}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Longitude coordinates:</span>
                                                    <span className="font-mono text-slate-200 font-bold">{selectedMapNode.longitude}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex-grow flex flex-col items-center justify-center text-center text-slate-500 py-16">
                                            <svg className="w-12 h-12 text-slate-700 mb-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" /></svg>
                                            <p className="font-bold text-sm uppercase tracking-wider font-mono">No Node Selected</p>
                                            <p className="text-xs text-slate-600 mt-1 max-w-[200px]">Click any glowing station node on the left GIS map to examine diagnostics.</p>
                                        </div>
                                    )}
                                </div>

                                {selectedMapNode && (
                                    <button 
                                        onClick={() => broadcastEmergencySMS(selectedMapNode)}
                                        className="w-full mt-6 bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/40 py-3 rounded-2xl font-extrabold text-xs transition-all tracking-wider uppercase shadow-[0_0_15px_rgba(239,68,68,0.15)]"
                                    >
                                        Transmit Proximity Emergency SMS
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* TAB C: WATER LEVELS TABULAR SEARCH GRID */}
                    {activeTab === 'levels' && (
                        <div className="glass-panel rounded-3xl p-7 space-y-6">
                            
                            {/* Search Header */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-900/60 pb-6">
                                <div>
                                    <h2 className="text-lg font-extrabold text-slate-100 tracking-wide uppercase">Hydrological Telemetry Database</h2>
                                    <p className="text-xs text-slate-500 mt-0.5 font-bold uppercase tracking-wider">Execute queries, filter, and inspect station level registries</p>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center w-full md:w-auto">
                                    {/* Search Bar Input */}
                                    <div className="relative">
                                        <svg className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                        <input 
                                            type="text" 
                                            placeholder="Search by name, ID..." 
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="bg-[#050911]/80 border border-slate-900 text-slate-300 placeholder-slate-600 text-xs px-10 py-3 rounded-2xl focus:outline-none focus:border-indigo-500/40 transition-colors w-full sm:w-64"
                                        />
                                    </div>

                                    {/* filter selections */}
                                    <div className="flex rounded-2xl bg-[#050911]/80 border border-slate-900 p-1">
                                        {['All', 'Critical', 'Warning', 'Safe'].map((opt) => (
                                            <button
                                                key={opt}
                                                onClick={() => setLevelFilter(opt)}
                                                className={`px-4.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 uppercase tracking-widest
                                                    ${levelFilter === opt 
                                                        ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/20' 
                                                        : 'text-slate-500 hover:text-slate-300 border border-transparent'}`}
                                            >
                                                {opt}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Database Tabular Grid View */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-xs md:text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-900 text-slate-400 font-extrabold uppercase tracking-widest text-[10px]">
                                            <th className="py-4.5 px-6">Station / Node Details</th>
                                            <th className="py-4.5 px-6">Location coordinates</th>
                                            <th className="py-4.5 px-6">Water Elevation</th>
                                            <th className="py-4.5 px-6">Rainfall rate</th>
                                            <th className="py-4.5 px-6">Battery Vital</th>
                                            <th className="py-4.5 px-6 text-center">Early Warning Status</th>
                                            <th className="py-4.5 px-6 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-900/60 font-semibold">
                                        {filteredNodes.length > 0 ? (
                                            filteredNodes.map((node) => (
                                                <tr key={node.id} className="hover:bg-slate-900/20 transition-all">
                                                    <td className="py-5 px-6">
                                                        <div className="font-bold text-slate-150">{node.name}</div>
                                                        <div className="text-[10px] text-slate-500 font-mono uppercase mt-0.5">{node.id}</div>
                                                    </td>
                                                    <td className="py-5 px-6 font-mono text-slate-400 text-xs">
                                                        LAT {node.latitude} <br/> LON {node.longitude}
                                                    </td>
                                                    <td className="py-5 px-6 font-mono text-indigo-400 font-extrabold text-sm">
                                                        {node.waterLevelCm?.toFixed(1) || '0.0'} cm
                                                    </td>
                                                    <td className="py-5 px-6 font-mono text-cyan-400 font-extrabold text-sm">
                                                        {node.rainfallRateMm?.toFixed(1) || '0.0'} mm/h
                                                    </td>
                                                    <td className="py-5 px-6">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-16 bg-slate-900 border border-slate-800/80 rounded-full h-2 overflow-hidden shrink-0">
                                                                <div 
                                                                    className={`h-2 rounded-full ${node.batteryLevel > 20 ? 'bg-emerald-500' : 'bg-red-500'}`} 
                                                                    style={{ width: `${node.batteryLevel}%` }}
                                                                ></div>
                                                            </div>
                                                            <span className="font-mono text-slate-400 text-xs">{node.batteryLevel}%</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-5 px-6 text-center">
                                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border inline-block ${getAlertColors(node.currentRisk)}`}>
                                                            {node.currentRisk || 'STANDBY'}
                                                        </span>
                                                    </td>
                                                    <td className="py-5 px-6 text-right">
                                                        <button 
                                                            onClick={() => broadcastEmergencySMS(node)}
                                                            className="px-4 py-2 rounded-xl bg-[#090e18] hover:bg-red-500/10 text-slate-300 hover:text-red-400 border border-slate-900 hover:border-red-500/20 text-xs font-bold uppercase tracking-wider transition-all"
                                                        >
                                                            SMS Alert
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={7} className="py-16 text-center text-slate-500 font-bold uppercase tracking-widest font-mono">
                                                    No telemetry records correspond to query parameters
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* TAB D: EMERGENCY ALERTS SUBSCRIBER MANAGEMENT */}
                    {activeTab === 'alerts' && (
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                            
                            {/* Proximity Subscribers List */}
                            <div className="xl:col-span-2 glass-panel rounded-3xl p-7 space-y-6">
                                <div>
                                    <h2 className="text-lg font-extrabold text-slate-100 tracking-wide uppercase">Awash Proximity Alert Subscribers</h2>
                                    <p className="text-xs text-slate-500 mt-0.5 font-bold uppercase tracking-wider">Configure telemetry link and manage early warning SMS notification targets</p>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse text-xs md:text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-900 text-slate-400 font-extrabold uppercase tracking-widest text-[10px] pb-4">
                                                <th className="py-3 px-4">Subscriber Name</th>
                                                <th className="py-3 px-4">SMS Phone target</th>
                                                <th className="py-3 px-4">Telemetry Anchor Point</th>
                                                <th className="py-3 px-4 text-center">Warning Link Status</th>
                                                <th className="py-3 px-4 text-right">Settings</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-900/60 font-semibold">
                                            {subscribers.map((sub) => (
                                                <tr key={sub.id} className="hover:bg-slate-900/10 transition-colors">
                                                    <td className="py-4 px-4 font-bold text-slate-150">{sub.name}</td>
                                                    <td className="py-4 px-4 font-mono text-slate-400">{sub.phone}</td>
                                                    <td className="py-4 px-4 text-indigo-400 font-bold">{sub.stationId}</td>
                                                    <td className="py-4 px-4 text-center">
                                                        <button 
                                                            onClick={() => toggleSubscriber(sub.id)}
                                                            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all
                                                                ${sub.status === 'Active' 
                                                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                                                                    : 'bg-slate-900 border-slate-800/80 text-slate-500'}`}
                                                        >
                                                            {sub.status}
                                                        </button>
                                                    </td>
                                                    <td className="py-4 px-4 text-right">
                                                        <button 
                                                            onClick={() => deleteSubscriber(sub.id)}
                                                            className="text-slate-500 hover:text-red-400 font-extrabold text-xs uppercase tracking-wider transition-colors"
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
                            <div className="glass-panel rounded-3xl p-7 min-h-[450px]">
                                <div className="border-b border-slate-900/60 pb-5 mb-6 text-center">
                                    <h3 className="text-lg font-extrabold text-slate-100 tracking-wide uppercase">Register Alert Target</h3>
                                    <p className="text-xs text-slate-500 mt-0.5 font-bold uppercase tracking-wider">Anchor new subscriber SMS targets to spatial sensors</p>
                                </div>

                                <form onSubmit={handleAddSubscriber} className="space-y-5">
                                    <div className="space-y-2">
                                        <label className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest block">Subscriber Name</label>
                                        <input 
                                            type="text" 
                                            placeholder="Enter Full Name..." 
                                            value={newSubName}
                                            onChange={(e) => setNewSubName(e.target.value)}
                                            className="w-full bg-[#050911]/80 border border-slate-900 text-slate-350 placeholder-slate-600 text-xs px-5 py-3 rounded-2xl focus:outline-none focus:border-indigo-500/40 transition-colors"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest block">SMS Phone Number</label>
                                        <input 
                                            type="tel" 
                                            placeholder="+251 9XX XXX XXX" 
                                            value={newSubPhone}
                                            onChange={(e) => setNewSubPhone(e.target.value)}
                                            className="w-full bg-[#050911]/80 border border-slate-900 text-slate-350 placeholder-slate-600 text-xs px-5 py-3 rounded-2xl focus:outline-none focus:border-indigo-500/40 transition-colors"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest block">Spatial Telemetry Anchor Station</label>
                                        <select 
                                            value={newSubStation}
                                            onChange={(e) => setNewSubStation(e.target.value)}
                                            className="w-full bg-[#050911]/80 border border-slate-900 text-slate-350 text-xs px-5 py-3 rounded-2xl focus:outline-none focus:border-indigo-500/40 transition-colors"
                                            required
                                        >
                                            <option value="" disabled>Select active station...</option>
                                            {payload?.nodes.map((node) => (
                                                <option key={node.id} value={node.name}>{node.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <button 
                                        type="submit" 
                                        className="w-full mt-8 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-slate-50 py-3.5 rounded-2xl font-extrabold text-xs tracking-wider uppercase transition-all shadow-md shadow-indigo-600/10"
                                    >
                                        Register Subscriber Link
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* TAB E: METEOROLOGY WEATHER FORECAST VIEW */}
                    {activeTab === 'weather' && (
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                            
                            {/* Weather Card Header and telemetry */}
                            <div className="xl:col-span-1 glass-panel rounded-3xl p-7 flex flex-col justify-between min-h-[480px]">
                                <div className="text-center w-full">
                                    <h2 className="text-lg font-extrabold text-slate-100 tracking-wide uppercase">Early Warning Meteorology</h2>
                                    <p className="text-xs text-slate-500 mt-0.5 font-bold uppercase tracking-wider">Afar Depression localized atmospheric telemetry</p>
                                </div>

                                <div className="flex flex-col items-center justify-center my-6 space-y-4">
                                    <span className="text-glow-purple text-6xl font-black text-slate-50 font-mono tracking-tight flex items-start">
                                        24<span className="text-3xl text-indigo-400 font-medium font-sans">°C</span>
                                    </span>
                                    <div className="text-center">
                                        <p className="text-lg font-extrabold text-slate-150 uppercase tracking-wide">Intense Precipitation</p>
                                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider font-mono mt-1">{weatherCity}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3.5">
                                    <div className="bg-[#050911]/80 border border-slate-900 p-4 rounded-2xl text-center">
                                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-1">Humidity</span>
                                        <p className="text-lg font-extrabold text-slate-200 font-mono">89%</p>
                                    </div>
                                    <div className="bg-[#050911]/80 border border-slate-900 p-4 rounded-2xl text-center">
                                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-1">Barometer</span>
                                        <p className="text-lg font-extrabold text-slate-200 font-mono">1012 hPa</p>
                                    </div>
                                    <div className="bg-[#050911]/80 border border-slate-900 p-4 rounded-2xl text-center">
                                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-1">Wind Velocity</span>
                                        <p className="text-lg font-extrabold text-slate-200 font-mono">12 km/h</p>
                                    </div>
                                    <div className="bg-[#050911]/80 border border-slate-900 p-4 rounded-2xl text-center">
                                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block mb-1">24h Rainfall</span>
                                        <p className="text-lg font-extrabold text-cyan-400 font-mono">0.35 in</p>
                                    </div>
                                </div>
                            </div>

                            {/* 7 Day Forecast Panel */}
                            <div className="xl:col-span-2 glass-panel rounded-3xl p-7 flex flex-col justify-between min-h-[480px]">
                                <div>
                                    <h2 className="text-lg font-extrabold text-slate-100 tracking-wide uppercase">7-Day Localized Early Weather Forecast</h2>
                                    <p className="text-xs text-slate-500 mt-0.5 font-bold uppercase tracking-wider mb-6">Localized Afar & Awash Basin projection metrics</p>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-4">
                                    {weatherForecast.map((fc) => (
                                        <div key={fc.day} className="bg-[#050911]/80 border border-slate-900 p-4 rounded-2xl flex flex-col items-center justify-between text-center min-h-[160px] hover:border-slate-800 transition-colors">
                                            <span className="text-slate-400 font-extrabold text-xs uppercase tracking-wider">{fc.day}</span>
                                            
                                            {/* Beautiful inline weather icons */}
                                            <div className="w-10 h-10 my-2 text-indigo-400">
                                                {fc.icon === 'cloud' && (
                                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>
                                                )}
                                                {fc.icon === 'rain' && (
                                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" /></svg>
                                                )}
                                                {fc.icon === 'storm' && (
                                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                                )}
                                                {fc.icon === 'sun' && (
                                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" /></svg>
                                                )}
                                            </div>

                                            <div className="space-y-1">
                                                <span className="font-mono text-slate-100 font-extrabold text-sm block">{fc.temp}</span>
                                                <span className="text-[9px] text-cyan-400 font-bold uppercase tracking-widest">{fc.rain} RAIN</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="bg-[#050911]/30 border border-slate-900/60 rounded-2xl p-4 text-xs font-semibold text-slate-500 leading-relaxed text-center mt-6">
                                    Meteorological radar indicates deep moisture convection over Afar Highlands starting Tuesday. River Node discharge levels projected to expand.
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB F: COMPLIANCE REPORTS VIEWER */}
                    {activeTab === 'reports' && (
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                            
                            {/* Historical statistics overview */}
                            <div className="xl:col-span-1 glass-panel rounded-3xl p-7 flex flex-col justify-between min-h-[480px]">
                                <div className="text-center w-full">
                                    <h2 className="text-lg font-extrabold text-slate-100 tracking-wide uppercase">Historical Basin Averages</h2>
                                    <p className="text-xs text-slate-500 mt-0.5 font-bold uppercase tracking-wider mb-6">Aggregated weekly statistics (last 7 days)</p>
                                </div>

                                <div className="space-y-5">
                                    <div className="bg-[#050911]/80 border border-slate-900 p-4.5 rounded-2xl flex justify-between items-center">
                                        <span className="text-xs text-slate-400 font-bold uppercase">Total Warnings</span>
                                        <span className="text-xl font-extrabold text-slate-200 font-mono">24</span>
                                    </div>
                                    <div className="bg-[#050911]/80 border border-slate-900 p-4.5 rounded-2xl flex justify-between items-center">
                                        <span className="text-xs text-slate-400 font-bold uppercase">High Danger Warnings</span>
                                        <span className="text-xl font-extrabold text-red-400 font-mono">8</span>
                                    </div>
                                    <div className="bg-[#050911]/80 border border-slate-900 p-4.5 rounded-2xl flex justify-between items-center">
                                        <span className="text-xs text-slate-400 font-bold uppercase">Average Basin Depth</span>
                                        <span className="text-xl font-extrabold text-indigo-400 font-mono">4.52 m</span>
                                    </div>
                                    <div className="bg-[#050911]/80 border border-slate-900 p-4.5 rounded-2xl flex justify-between items-center">
                                        <span className="text-xs text-slate-400 font-bold uppercase">Aggregate Rainfall</span>
                                        <span className="text-xl font-extrabold text-cyan-400 font-mono">2.45 in</span>
                                    </div>
                                </div>

                                <button 
                                    onClick={triggerReportCompilation}
                                    className="w-full mt-6 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-slate-50 py-3.5 rounded-2xl font-extrabold text-xs tracking-wider uppercase transition-all shadow-md"
                                >
                                    Generate Compliance PDF Report
                                </button>
                            </div>

                            {/* Weekly Summary Bar chart */}
                            <div className="xl:col-span-2 glass-panel rounded-3xl p-7 flex flex-col justify-between min-h-[480px]">
                                <div>
                                    <h2 className="text-lg font-extrabold text-slate-100 tracking-wide uppercase">Basin Weekly Depth Summary</h2>
                                    <p className="text-xs text-slate-500 mt-0.5 font-bold uppercase tracking-wider mb-6">Historical correlation charts</p>
                                </div>

                                <div className="flex-grow w-full relative min-h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={[
                                            { day: 'May 10', depth: 3.2 },
                                            { day: 'May 11', depth: 4.8 },
                                            { day: 'May 12', depth: 5.5 },
                                            { day: 'May 13', depth: 6.8 },
                                            { day: 'May 14', depth: 4.2 },
                                            { day: 'May 15', depth: 3.9 },
                                            { day: 'May 16', depth: 4.5 }
                                        ]}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#121827" vertical={false} opacity={0.6} />
                                            <XAxis dataKey="day" stroke="#334155" fontSize={11} axisLine={false} tickLine={false} tickMargin={12} />
                                            <YAxis stroke="#334155" fontSize={11} axisLine={false} tickLine={false} tickMargin={12} />
                                            <Tooltip 
                                                contentStyle={{ backgroundColor: '#090e18', borderColor: '#1e293b', borderRadius: '1.25rem' }} 
                                                itemStyle={{ color: '#f8fafc', fontWeight: 600 }}
                                            />
                                            <Bar dataKey="depth" radius={[6, 6, 0, 0]}>
                                                {[3.2, 4.8, 5.5, 6.8, 4.2, 3.9, 4.5].map((val, idx) => (
                                                    <Cell key={`cell-${idx}`} fill={val > 5 ? '#a855f7' : '#6366f1'} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB G: PARAMETER CONFIGS SETTINGS VIEW */}
                    {activeTab === 'settings' && (
                        <div className="glass-panel rounded-3xl p-7 max-w-3xl mx-auto space-y-8">
                            <div className="border-b border-slate-900/60 pb-6">
                                <h2 className="text-lg font-extrabold text-slate-100 tracking-wide uppercase">Early Warning System Configurations</h2>
                                <p className="text-xs text-slate-500 mt-0.5 font-bold uppercase tracking-wider">Configure threshold parameters for flood classification algorithms</p>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <div className="flex justify-between font-bold text-xs">
                                        <label className="text-slate-400 uppercase tracking-widest">Critical Water Level Threshold</label>
                                        <span className="font-mono text-red-400 font-black">{criticalThreshold} cm</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="350" 
                                        max="600" 
                                        value={criticalThreshold}
                                        onChange={(e) => setCriticalThreshold(parseInt(e.target.value))}
                                        className="w-full accent-red-500 bg-slate-900 border border-slate-800 rounded-full h-2 appearance-none cursor-pointer"
                                    />
                                    <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                                        If river depth surpasses this setting, the telemetry anchor node classification automatically transitions to "Critical".
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between font-bold text-xs">
                                        <label className="text-slate-400 uppercase tracking-widest">Warning Water Level Threshold</label>
                                        <span className="font-mono text-amber-400 font-black">{warningThreshold} cm</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="200" 
                                        max="349" 
                                        value={warningThreshold}
                                        onChange={(e) => setWarningThreshold(parseInt(e.target.value))}
                                        className="w-full accent-amber-500 bg-slate-900 border border-slate-800 rounded-full h-2 appearance-none cursor-pointer"
                                    />
                                    <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                                        If river depth surpasses this setting, the telemetry anchor node classification transitions to "Warning".
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between font-bold text-xs">
                                        <label className="text-slate-400 uppercase tracking-widest">Proximity Broadcast Alert Radius</label>
                                        <span className="font-mono text-indigo-400 font-black">{radiusKm} KM</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="5" 
                                        max="50" 
                                        value={radiusKm}
                                        onChange={(e) => setRadiusKm(parseInt(e.target.value))}
                                        className="w-full accent-indigo-500 bg-slate-900 border border-slate-800 rounded-full h-2 appearance-none cursor-pointer"
                                    />
                                    <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">
                                        Defines the geographical coverage threshold for registered SMS subscriber notifications upon manual early warning broadcast execution.
                                    </p>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-slate-900/60 flex justify-end">
                                <button 
                                    onClick={saveSettings}
                                    className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-slate-50 px-6 py-3 rounded-2xl font-extrabold text-xs tracking-wider uppercase transition-all shadow-md shadow-indigo-600/10"
                                >
                                    Write Parameters
                                </button>
                            </div>
                        </div>
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

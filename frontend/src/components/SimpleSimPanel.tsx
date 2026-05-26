import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface TransmitLog {
    timestamp: string;
    level: number;
    decision: string;
    status: 'success' | 'error';
    message: string;
}

export const SimpleSimPanel: React.FC = () => {
    // Simulator states
    const [isSimulating, setIsSimulating] = useState<boolean>(false);
    const [waterLevel, setWaterLevel] = useState<number>(350);
    const [logs, setLogs] = useState<TransmitLog[]>([]);
    
    // Backend polled state
    const [backendLevel, setBackendLevel] = useState<number | null>(null);
    const [backendStatus, setBackendStatus] = useState<'Online' | 'Offline'>('Offline');
    const [isPolling] = useState<boolean>(true);

    // References
    const consoleEndRef = useRef<HTMLDivElement | null>(null);

    // Auto-scroll logs terminal
    useEffect(() => {
        consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    // Phase 2: Decision Logic helper
    const evaluateDecision = (level: number) => {
        return level > 500 ? 'Alert' : 'Safe';
    };

    // Phase 3: Data Transmission
    const transmitReading = async (level: number) => {
        const timeStr = new Date().toLocaleTimeString([], { hour12: false });
        const decision = evaluateDecision(level);
        
        try {
            const res = await axios.post(`${API_BASE_URL}/flood`, { level });
            if (res.status === 200) {
                setLogs(prev => [
                    ...prev.slice(-49), // Keep last 50 logs
                    {
                        timestamp: timeStr,
                        level,
                        decision,
                        status: 'success',
                        message: `POST /flood - Status 200 OK | level: ${level}`
                    }
                ]);
            } else {
                setLogs(prev => [
                    ...prev.slice(-49),
                    {
                        timestamp: timeStr,
                        level,
                        decision,
                        status: 'error',
                        message: `POST /flood - FAILED (HTTP ${res.status})`
                    }
                ]);
            }
        } catch (err: any) {
            console.error('Transmission error:', err);
            setLogs(prev => [
                ...prev.slice(-49),
                {
                    timestamp: timeStr,
                    level,
                    decision,
                    status: 'error',
                    message: `POST /flood - FAILED (${err.message || 'Network unreachable'})`
                }
            ]);
        }
    };

    // Phase 1: Simulator continuous loop (every 2 seconds)
    useEffect(() => {
        let interval: ReturnType<typeof setInterval> | null = null;
        
        if (isSimulating) {
            // Immediately run first tick
            const initialVal = Math.floor(Math.random() * 1024);
            setWaterLevel(initialVal);
            transmitReading(initialVal);

            interval = setInterval(() => {
                const newVal = Math.floor(Math.random() * 1024);
                setWaterLevel(newVal);
                transmitReading(newVal);
            }, 2000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isSimulating]);

    // Polling backend state (Phase 4 verification) every 1 second
    useEffect(() => {
        let pollInterval: ReturnType<typeof setInterval> | null = null;

        if (isPolling) {
            const fetchBackendState = async () => {
                try {
                    const res = await axios.get(`${API_BASE_URL}/flood`);
                    setBackendLevel(res.data.level);
                    setBackendStatus('Online');
                } catch (err) {
                    setBackendStatus('Offline');
                    setBackendLevel(null);
                }
            };
            
            fetchBackendState(); // Fetch immediately
            pollInterval = setInterval(fetchBackendState, 1000);
        }

        return () => {
            if (pollInterval) clearInterval(pollInterval);
        };
    }, [isPolling]);

    // Handle manual level override
    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value, 10);
        setWaterLevel(val);
        transmitReading(val);
    };

    const isAlert = waterLevel > 500;
    const isBackendAlert = backendLevel !== null && backendLevel > 500;

    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-900/60 pb-6">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-100 flex items-center gap-3">
                        <span className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">🌊</span>
                        SFEWS Core Simulation Console
                    </h1>
                    <p className="text-slate-400 text-xs font-semibold mt-1">
                        High-fidelity software-only simulation of water level telemetry, decision logic thresholds, and real-time alerts.
                    </p>
                </div>
                <div className="flex items-center gap-3.5 bg-slate-900/30 px-5 py-2.5 rounded-2xl border border-slate-800/40 select-none">
                    <span className="text-[10px] font-extrabold tracking-widest text-slate-500 block leading-none">Simulation Server:</span>
                    <span className={`flex items-center gap-2 text-xs font-bold font-mono px-2.5 py-1 rounded-lg ${backendStatus === 'Online' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                        <span className={`w-2 h-2 rounded-full ${backendStatus === 'Online' ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}></span>
                        {backendStatus}
                    </span>
                </div>
            </div>

            {/* Main Interactive Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                
                {/* COLUMN 1: SENSOR GENERATOR & DECISION LOGIC */}
                <div className="xl:col-span-2 space-y-8">
                    
                    {/* PHASE 1: DATA GENERATION */}
                    <div className="glass-panel-premium rounded-3xl p-6.5">
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20 font-bold font-mono text-sm">1</div>
                                <div>
                                    <h3 className="text-sm font-extrabold tracking-wide uppercase text-slate-200">Phase 1: Data Generation</h3>
                                    <span className="text-[10px] text-purple-400 font-bold block uppercase tracking-wider">IoT Sensor Telemetry</span>
                                </div>
                            </div>
                            
                            {/* Toggle Simulator */}
                            <button
                                onClick={() => setIsSimulating(!isSimulating)}
                                className={`px-5 py-2.5 rounded-2xl text-xs font-black tracking-wider uppercase transition-all duration-300 border flex items-center gap-2 ${
                                    isSimulating 
                                        ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.15)]' 
                                        : 'bg-indigo-600 hover:bg-indigo-500 text-white border-transparent shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:scale-[1.02]'
                                }`}
                            >
                                {isSimulating ? (
                                    <>
                                        <span className="w-2.5 h-2.5 bg-red-400 rounded-full animate-ping"></span>
                                        Stop Auto-Loop
                                    </>
                                ) : (
                                    <>
                                        <span className="w-2.5 h-2.5 bg-white rounded-full"></span>
                                        Start Auto-Loop
                                    </>
                                )}
                            </button>
                        </div>

                        <div className="space-y-6 bg-[#02040a]/40 p-5 rounded-2xl border border-slate-900/50">
                            {/* Generator HUD Display */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-[#050913] p-4 rounded-xl border border-slate-900">
                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Telemetry Source</span>
                                    <p className="text-sm font-extrabold text-slate-300 mt-1 font-mono">
                                        {isSimulating ? '🎲 Auto Generator' : '🕹️ Manual Slider'}
                                    </p>
                                </div>
                                <div className="bg-[#050913] p-4 rounded-xl border border-slate-900">
                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Generated Value Range</span>
                                    <p className="text-sm font-extrabold text-indigo-400 mt-1 font-mono">0 - 1023 (10-bit integer)</p>
                                </div>
                            </div>

                            {/* Manual Control Slider */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-slate-400">Manual Inject Override:</label>
                                    <span className="text-xs font-extrabold font-mono text-cyan-400 bg-cyan-950/20 border border-cyan-800/20 px-3 py-1 rounded-lg">
                                        {waterLevel} Units
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="1023"
                                    value={waterLevel}
                                    onChange={handleSliderChange}
                                    disabled={isSimulating}
                                    className="w-full h-2.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                />
                                <div className="flex items-center justify-between text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">
                                    <span>0 (Min)</span>
                                    <span>500 (Threshold)</span>
                                    <span>1023 (Max)</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* PHASE 2: DECISION LOGIC */}
                    <div className="glass-panel rounded-3xl p-6">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20 font-bold font-mono text-sm">2</div>
                            <div>
                                <h3 className="text-sm font-extrabold tracking-wide uppercase text-slate-200">Phase 2: Decision Logic</h3>
                                <span className="text-[10px] text-cyan-400 font-bold block uppercase tracking-wider">Edge-Processing Criteria</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            {/* Threshold display */}
                            <div className="bg-[#02040a]/40 p-4.5 rounded-2xl border border-slate-900/60 flex flex-col justify-between">
                                <div>
                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Hardcoded Threshold</span>
                                    <p className="text-2xl font-black text-slate-200 mt-2 font-mono">500</p>
                                </div>
                                <p className="text-[10px] text-slate-400 font-medium leading-relaxed mt-4">
                                    Standard critical alert line evaluated directly at the edge simulator.
                                </p>
                            </div>

                            {/* Live math comparator */}
                            <div className="bg-[#02040a]/40 p-4.5 rounded-2xl border border-slate-900/60 flex flex-col justify-between items-center text-center">
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block w-full text-left">Live Comparator</span>
                                <div className="my-4 font-mono font-extrabold text-base flex items-center gap-2">
                                    <span className="text-slate-300">{waterLevel}</span>
                                    <span className="text-indigo-400">{isAlert ? '>' : '<='}</span>
                                    <span className="text-slate-400">500</span>
                                </div>
                                <span className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-wider ${
                                    isAlert ? 'bg-red-500/10 text-red-400 border border-red-500/10' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10'
                                }`}>
                                    {isAlert ? 'Threshold Triggered' : 'Threshold Safe'}
                                </span>
                            </div>

                            {/* Computed Action */}
                            <div className="bg-[#02040a]/40 p-4.5 rounded-2xl border border-slate-900/60 flex flex-col justify-between">
                                <div>
                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Computed Output</span>
                                    <p className={`text-lg font-extrabold mt-2 ${isAlert ? 'text-red-400 text-glow-red' : 'text-emerald-400 text-glow-emerald'}`}>
                                        {isAlert ? '🔴 Danger (Alert)' : '🟢 Normal (Safe)'}
                                    </p>
                                </div>
                                <p className="text-[10px] text-slate-400 font-medium leading-relaxed mt-4">
                                    Determines the warning payload metadata generated before network broadcast.
                                </p>
                            </div>
                        </div>
                    </div>

                </div>

                {/* COLUMN 2: PHASE 5 REAL-TIME DASHBOARD VISUALIZATION */}
                <div className="glass-panel-premium rounded-3xl p-6.5 flex flex-col justify-between border-glow-purple">
                    
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20 font-bold font-mono text-sm">5</div>
                        <div>
                            <h3 className="text-sm font-extrabold tracking-wide uppercase text-slate-200">Phase 5: Visualization</h3>
                            <span className="text-[10px] text-purple-400 font-bold block uppercase tracking-wider">HUD Presentation Panel</span>
                        </div>
                    </div>

                    {/* Circular Glowing Gauge */}
                    <div className="flex-1 flex flex-col items-center justify-center my-6 relative select-none">
                        <div className="w-52 h-52 rounded-full bg-slate-950 border border-slate-900/65 flex flex-col items-center justify-center relative overflow-hidden shadow-inner">
                            {/* Glowing Backlights */}
                            <div className={`absolute inset-0 transition-colors duration-500 ${
                                isAlert ? 'bg-red-500/5' : 'bg-emerald-500/5'
                            }`}></div>

                            {/* Water level arc overlay */}
                            <svg className="w-full h-full transform -rotate-90 absolute">
                                <circle
                                    cx="104"
                                    cy="104"
                                    r="86"
                                    stroke="rgba(30, 41, 59, 0.3)"
                                    strokeWidth="10"
                                    fill="transparent"
                                    className="translate-x-[4px] translate-y-[4px]"
                                />
                                <circle
                                    cx="104"
                                    cy="104"
                                    r="86"
                                    stroke={isAlert ? '#ef4444' : '#10b981'}
                                    strokeWidth="10"
                                    fill="transparent"
                                    strokeDasharray={2 * Math.PI * 86}
                                    strokeDashoffset={2 * Math.PI * 86 * (1 - Math.min(1, waterLevel / 1023))}
                                    className="translate-x-[4px] translate-y-[4px] transition-all duration-300 ease-out"
                                    style={{
                                        filter: `drop-shadow(0 0 8px ${isAlert ? 'rgba(239,68,68,0.5)' : 'rgba(16,185,129,0.5)'})`
                                    }}
                                />
                            </svg>

                            {/* Gauge Readout */}
                            <div className="relative z-10 text-center">
                                <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-widest block leading-none">Water Level</span>
                                <h2 className={`text-4xl font-black font-mono my-2.5 transition-colors duration-300 ${
                                    isAlert ? 'text-red-400 text-glow-red' : 'text-emerald-400 text-glow-emerald'
                                }`}>
                                    {waterLevel}
                                </h2>
                                <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest font-mono">
                                    Units
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Flashing Normal / Alert Banners */}
                    <div className="space-y-4">
                        <div className="border-t border-slate-900/60 pt-5">
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-2 text-center">Current Warning Status</span>
                            
                            {isAlert ? (
                                <div className="bg-red-950/20 border border-red-500/25 px-5 py-4.5 rounded-2xl text-center shadow-lg shadow-red-950/20 animate-pulse relative overflow-hidden">
                                    <span className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-red-500 to-transparent"></span>
                                    <p className="text-red-400 text-base font-black tracking-wide text-glow-red">
                                        ⚠️ Flood Alert!
                                    </p>
                                    <p className="text-red-500 text-[10px] font-bold uppercase tracking-wider mt-1.5 font-mono">
                                        Water level ({waterLevel}) exceeded threshold 500
                                    </p>
                                </div>
                            ) : (
                                <div className="bg-emerald-950/15 border border-emerald-500/20 px-5 py-4.5 rounded-2xl text-center shadow-md shadow-emerald-950/5 relative overflow-hidden">
                                    <span className="absolute top-0 left-0 w-full h-[1.5px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent"></span>
                                    <p className="text-emerald-400 text-sm font-extrabold tracking-wide text-glow-emerald">
                                        Water Level Normal
                                    </p>
                                    <p className="text-emerald-500 text-[9px] font-bold uppercase tracking-wider mt-1.5 font-mono">
                                        System state stable • within safe tolerances
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                </div>

            </div>

            {/* Row 2: Transmission Log Terminal & Backend State HUD */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                
                {/* COLUMN 1 & 2: PHASE 3 TELEMETRY TRANSMISSION LOGS */}
                <div className="xl:col-span-2 glass-panel rounded-3xl p-6.5">
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20 font-bold font-mono text-sm">3</div>
                            <div>
                                <h3 className="text-sm font-extrabold tracking-wide uppercase text-slate-200">Phase 3: Data Transmission</h3>
                                <span className="text-[10px] text-purple-400 font-bold block uppercase tracking-wider">HTTP POST Transmission Logs</span>
                            </div>
                        </div>
                        {logs.length > 0 && (
                            <button
                                onClick={() => setLogs([])}
                                className="px-3.5 py-1.5 bg-slate-900/60 hover:bg-slate-900 border border-slate-800/85 hover:border-slate-800 rounded-xl text-[10px] font-bold text-slate-400 hover:text-slate-200 transition-colors uppercase tracking-widest font-mono"
                            >
                                Clear logs
                            </button>
                        )}
                    </div>

                    {/* Console log display */}
                    <div className="bg-[#020408] rounded-2xl border border-slate-950 p-4 font-mono text-xs overflow-hidden">
                        <div className="flex items-center justify-between border-b border-slate-900 pb-2.5 mb-2.5 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                            <span>Request Path / Log Content</span>
                            <span>Payload Model</span>
                        </div>
                        <div className="h-44 overflow-y-auto space-y-2 pr-2 custom-scrollbar select-text">
                            {logs.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-slate-600 text-center font-bold text-xs select-none">
                                    [Console Idle] Initiate simulator auto-loop or adjust the manual slider to log POST transmissions...
                                </div>
                            ) : (
                                logs.map((log, index) => (
                                    <div key={index} className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-900/40 pb-2 leading-relaxed text-slate-300">
                                        <div className="flex items-start gap-2.5">
                                            <span className="text-slate-500 font-semibold select-none">[{log.timestamp}]</span>
                                            <span className={log.status === 'success' ? 'text-indigo-400' : 'text-red-400'}>
                                                {log.message}
                                            </span>
                                        </div>
                                        <span className="text-[10px] text-slate-500 font-semibold mt-1 md:mt-0 font-mono">
                                            {"{"}level: {log.level}{"}"}
                                        </span>
                                    </div>
                                ))
                            )}
                            <div ref={consoleEndRef} />
                        </div>
                    </div>
                </div>

                {/* COLUMN 3: PHASE 4 BACKEND STATE MANAGEMENT */}
                <div className="glass-panel rounded-3xl p-6.5 flex flex-col justify-between">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20 font-bold font-mono text-sm">4</div>
                        <div>
                            <h3 className="text-sm font-extrabold tracking-wide uppercase text-slate-200">Phase 4: Backend State</h3>
                            <span className="text-[10px] text-cyan-400 font-bold block uppercase tracking-wider">FastAPI Global State HUD</span>
                        </div>
                    </div>

                    <div className="bg-[#02040a]/40 p-4.5 rounded-2xl border border-slate-900/60 space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Polled Endpoint</span>
                            <span className="font-mono text-[10px] text-indigo-400 font-semibold">GET /flood</span>
                        </div>

                        <div className="border-t border-slate-900/60 pt-3 flex items-center justify-between">
                            <span className="text-xs text-slate-400 font-bold">Stored Water Level:</span>
                            <span className="font-mono text-base font-black text-slate-200">
                                {backendLevel !== null ? backendLevel : '—'}
                            </span>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                            <span className="text-xs text-slate-400 font-bold">In-Memory Sync:</span>
                            <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-md ${
                                backendStatus === 'Online' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                            }`}>
                                {backendStatus === 'Online' ? 'SYNCHRONIZED' : 'DISCONNECTED'}
                            </span>
                        </div>
                    </div>

                    {/* Backend State Indicator banner */}
                    <div className="mt-4 border-t border-slate-900/60 pt-4.5">
                        {backendLevel !== null ? (
                            isBackendAlert ? (
                                <div className="bg-red-950/20 border border-red-500/15 p-3.5 rounded-xl text-center">
                                    <p className="text-red-400 text-xs font-black uppercase tracking-wider">
                                        ⚠️ Backend State: Flood Alert!
                                    </p>
                                    <p className="text-slate-400 text-[9px] font-bold mt-1">
                                        FastAPI global level is active warning level ({backendLevel})
                                    </p>
                                </div>
                            ) : (
                                <div className="bg-emerald-950/10 border border-emerald-500/10 p-3.5 rounded-xl text-center">
                                    <p className="text-emerald-400 text-xs font-extrabold uppercase tracking-wider">
                                        🟢 Backend State: Normal
                                    </p>
                                    <p className="text-slate-400 text-[9px] font-bold mt-1">
                                        FastAPI global level is safe zone level ({backendLevel})
                                    </p>
                                </div>
                            )
                        ) : (
                            <div className="bg-slate-900/30 border border-slate-800/40 p-3.5 rounded-xl text-center text-slate-500 font-bold text-xs">
                                Waiting for telemetry transmission...
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

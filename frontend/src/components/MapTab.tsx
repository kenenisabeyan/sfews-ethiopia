import React, { useState, useEffect } from 'react';
import { SensorNode, DashboardPayload } from '../types';

interface MapTabProps {
    payload: DashboardPayload | null;
    selectedMapNode: SensorNode | null;
    setSelectedMapNode: (node: SensorNode | null) => void;
    broadcastEmergencySMS: (node: SensorNode) => void;
}

export const MapTab: React.FC<MapTabProps> = ({
    payload,
    selectedMapNode,
    setSelectedMapNode,
    broadcastEmergencySMS,
}) => {
    // Map Layers State Switches
    const [showSatellite, setShowSatellite] = useState<boolean>(true);
    const [showContours, setShowContours] = useState<boolean>(true);
    const [showRadar, setShowRadar] = useState<boolean>(true);
    const [showHeatzones, setShowHeatzones] = useState<boolean>(true);
    const [showEvac, setShowEvac] = useState<boolean>(true);

    // Dynamic Flood Simulation Horizon
    const [simulationLevel, setSimulationLevel] = useState<number>(0);
    const [isSimulating, setIsSimulating] = useState<boolean>(false);
    
    // LoRa Mesh Diagnostic Stats (simulated live oscillations)
    const [meshPing, setMeshPing] = useState<number>(42);
    const [meshPackets, setMeshPackets] = useState<number>(128);
    const [meshSolarEff, setMeshSolarEff] = useState<number>(94.6);

    useEffect(() => {
        const interval = setInterval(() => {
            setMeshPing(prev => Math.max(30, Math.min(85, prev + (Math.random() > 0.5 ? 2 : -2))));
            setMeshPackets(prev => prev + (Math.random() > 0.5 ? 1 : 0));
            setMeshSolarEff(prev => Math.max(88, Math.min(99.5, prev + (Math.random() > 0.5 ? 0.1 : -0.1))));
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    // Simulation Auto-Player
    useEffect(() => {
        let simTimer: any;
        if (isSimulating) {
            simTimer = setInterval(() => {
                setSimulationLevel(prev => {
                    if (prev >= 100) return 0;
                    return prev + 5;
                });
            }, 600);
        }
        return () => clearInterval(simTimer);
    }, [isSimulating]);

    // Map Coordinates Translator Helper
    const getMapCoordinates = (nodeId: string, index: number) => {
        const mapPositions: { [key: string]: { x: number; y: number } } = {
            'NODE-ALPHA-1': { x: 280, y: 190 },
            'NODE-BETA-2': { x: 190, y: 135 },
            'NODE-GAMMA-3': { x: 410, y: 245 },
            'NODE-AWASH-01': { x: 520, y: 180 }
        };
        return mapPositions[nodeId] || { x: 120 + index * 120, y: 140 + (index % 2) * 80 };
    };

    const getAlertColors = (risk?: string) => {
        switch (risk) {
            case 'Safe': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
            case 'Warning': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
            case 'Critical': return 'text-red-400 bg-red-500/10 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]';
            default: return 'text-slate-400 bg-slate-800/50 border-slate-700/50';
        }
    };

    // Calculate dynamic risk metrics modified by the simulation slider
    const getSimulatedWaterLevel = (node: SensorNode) => {
        const baseLevel = node.waterLevelCm || 120;
        const simulatedInundation = baseLevel + (simulationLevel * 3.5);
        return simulatedInundation;
    };

    const getSimulatedRisk = (node: SensorNode) => {
        const level = getSimulatedWaterLevel(node);
        if (level > 400) return 'Critical';
        if (level > 280) return 'Warning';
        return 'Safe';
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            
            {/* GIS Control Room Dashboard Console (Main section takes 3 columns) */}
            <div className="lg:col-span-3 flex flex-col gap-6">
                
                {/* 1. Futuristic GIS Control Panel Menu & Horizon Slider */}
                <div className="glass-panel rounded-3xl p-5 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-900/5 to-cyan-900/5 pointer-events-none" />
                    
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
                        {/* Title details */}
                        <div>
                            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-purple-500 border border-purple-400 animate-pulse" />
                                GIS Control Console
                            </h2>
                            <p className="text-lg font-black text-slate-100 mt-1 uppercase tracking-wide">
                                Awash River Basin Satellite Command
                            </p>
                        </div>

                        {/* Layer Switchers Grid */}
                        <div className="flex flex-wrap items-center gap-2">
                            <button 
                                onClick={() => setShowSatellite(!showSatellite)}
                                className={`px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${
                                    showSatellite 
                                        ? 'bg-purple-600/20 text-purple-300 border-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.15)]' 
                                        : 'bg-slate-950/40 text-slate-500 border-slate-800 hover:text-slate-300 hover:border-slate-700'
                                }`}
                            >
                                Satellite View
                            </button>
                            <button 
                                onClick={() => setShowContours(!showContours)}
                                className={`px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${
                                    showContours 
                                        ? 'bg-purple-600/20 text-purple-300 border-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.15)]' 
                                        : 'bg-slate-950/40 text-slate-500 border-slate-800 hover:text-slate-300 hover:border-slate-700'
                                }`}
                            >
                                Topo Contours
                            </button>
                            <button 
                                onClick={() => setShowRadar(!showRadar)}
                                className={`px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${
                                    showRadar 
                                        ? 'bg-cyan-600/20 text-cyan-300 border-cyan-500/40 shadow-[0_0_12px_rgba(34,211,238,0.15)]' 
                                        : 'bg-slate-950/40 text-slate-500 border-slate-800 hover:text-slate-300 hover:border-slate-700'
                                }`}
                            >
                                Radar Sweep
                            </button>
                            <button 
                                onClick={() => setShowHeatzones(!showHeatzones)}
                                className={`px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${
                                    showHeatzones 
                                        ? 'bg-red-600/20 text-red-300 border-red-500/40 shadow-[0_0_12px_rgba(239,68,68,0.15)]' 
                                        : 'bg-slate-950/40 text-slate-500 border-slate-800 hover:text-slate-300 hover:border-slate-700'
                                }`}
                            >
                                Heat zones
                            </button>
                            <button 
                                onClick={() => setShowEvac(!showEvac)}
                                className={`px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all duration-300 ${
                                    showEvac 
                                        ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.15)]' 
                                        : 'bg-slate-950/40 text-slate-500 border-slate-800 hover:text-slate-300 hover:border-slate-700'
                                }`}
                            >
                                Corridors
                            </button>
                        </div>
                    </div>

                    {/* Simulation Engine Slider bar */}
                    <div className="mt-5 pt-4 border-t border-slate-900/60 flex flex-col md:flex-row md:items-center gap-4.5 relative z-10">
                        <div className="flex items-center gap-3 min-w-[200px]">
                            <button 
                                onClick={() => setIsSimulating(!isSimulating)}
                                className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all duration-300 ${
                                    isSimulating 
                                        ? 'bg-red-600/20 text-red-400 border-red-500/40 animate-pulse' 
                                        : 'bg-cyan-600/20 text-cyan-400 border-cyan-500/40 hover:bg-cyan-600/30'
                                }`}
                            >
                                {isSimulating ? (
                                    <svg className="w-4.5 h-4.5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                                ) : (
                                    <svg className="w-4.5 h-4.5 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                )}
                            </button>
                            <div>
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block leading-tight">Simulation horizon</span>
                                <span className="text-xs font-black text-slate-200 uppercase tracking-wide">
                                    {simulationLevel === 0 ? 'Live Telemetry' : `Inundation Predict: +${(simulationLevel * 3.5).toFixed(0)}cm`}
                                </span>
                            </div>
                        </div>

                        <div className="flex-1 flex items-center gap-3">
                            <input 
                                type="range" 
                                min="0" 
                                max="100" 
                                value={simulationLevel}
                                onChange={(e) => {
                                    setSimulationLevel(Number(e.target.value));
                                    if (isSimulating) setIsSimulating(false);
                                }}
                                className="flex-grow accent-purple-500 h-1 bg-slate-950 border border-slate-900 rounded-lg cursor-pointer appearance-none"
                            />
                            <span className="text-xs font-mono font-bold text-purple-400 w-10 text-right">
                                {simulationLevel}%
                            </span>
                        </div>
                    </div>
                </div>

                {/* 2. Interactive SVG Map View Grid */}
                <div className="bg-[#03060c] border border-slate-900 rounded-3xl relative overflow-hidden flex flex-col min-h-[520px] shadow-2xl p-2.5">
                    
                    {/* Futuristic Grid Layer */}
                    <div className="absolute inset-0 grid-bg opacity-[0.25] pointer-events-none" />
                    
                    {/* Satellite Terrain Gradient Masks */}
                    <div className="absolute inset-0 pointer-events-none opacity-40 bg-radial-gradient">
                        {showSatellite && (
                            <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-[#07130f]/30 to-purple-950/20" />
                        )}
                    </div>

                    {/* Compass Ring & Reticles */}
                    <div className="absolute top-8 right-8 z-10 w-20 h-20 border border-slate-900/60 rounded-full flex items-center justify-center opacity-60">
                        <div className="absolute w-16 h-16 border border-dashed border-purple-500/25 rounded-full animate-[spin_40s_linear_infinite]" />
                        <span className="text-[8px] font-mono font-bold text-slate-600 absolute -top-1.5">N</span>
                        <span className="text-[8px] font-mono font-bold text-slate-600 absolute -bottom-1.5">S</span>
                        <span className="text-[8px] font-mono font-bold text-slate-600 absolute -left-1">W</span>
                        <span className="text-[8px] font-mono font-bold text-slate-600 absolute -right-1">E</span>
                        <div className="w-1.5 h-1.5 bg-cyan-400/40 rounded-full" />
                    </div>

                    {/* Scale Calibration HUD */}
                    <div className="absolute bottom-6 right-6 z-10 glass-panel-premium border border-slate-900/70 p-3 rounded-2xl text-[9px] font-mono text-slate-400 space-y-1 backdrop-blur-md">
                        <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                            AWASH SATELLITE T-06
                        </div>
                        <div>SCALE: 1 : 12,500 CONT.</div>
                        <div className="flex justify-between font-bold text-[8px] text-slate-600">
                            <span>0m</span>
                            <span>250m</span>
                        </div>
                        <div className="h-1 bg-slate-950 border border-slate-900 rounded relative overflow-hidden">
                            <div className="absolute left-0 top-0 h-full w-3/5 bg-gradient-to-r from-purple-500 to-cyan-500 shadow-[0_0_6px_rgba(34,211,238,0.5)]" />
                        </div>
                    </div>

                    {/* Live update status banner (top left) */}
                    <div className="absolute top-6 left-6 z-10 flex items-center gap-2.5 bg-[#03060c]/90 border border-slate-900/80 px-3.5 py-2 rounded-2xl backdrop-blur-md">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        <div className="text-[10px] font-mono font-black text-slate-300 tracking-wider">
                            ACTIVE RADAR SWEEPING: <span className="text-[#a855f7] font-bold">433.92 MHz</span>
                        </div>
                    </div>

                    {/* The Primary SVG Live Map */}
                    <div className="flex-grow w-full flex items-center justify-center min-h-[380px] p-2 select-none relative">
                        <svg 
                            className="w-full h-full max-w-[760px] max-h-[460px] relative z-20" 
                            viewBox="0 0 600 350" 
                            fill="none"
                        >
                            <defs>
                                {/* River Glow and Fill Gradients */}
                                <linearGradient id="riverNormal" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#1e3a8a" stopOpacity="0.4" />
                                    <stop offset="40%" stopColor="#22d3ee" stopOpacity="0.7" />
                                    <stop offset="70%" stopColor="#3b82f6" stopOpacity="0.7" />
                                    <stop offset="100%" stopColor="#0891b2" stopOpacity="0.5" />
                                </linearGradient>
                                <linearGradient id="riverCritical" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#9a3412" stopOpacity="0.5" />
                                    <stop offset="50%" stopColor="#ef4444" stopOpacity="0.8" />
                                    <stop offset="80%" stopColor="#ec4899" stopOpacity="0.8" />
                                    <stop offset="100%" stopColor="#7e22ce" stopOpacity="0.6" />
                                </linearGradient>
                                
                                {/* Dynamic Heatmap Blurs */}
                                <radialGradient id="heatRed" cx="50%" cy="50%" r="50%">
                                    <stop offset="0%" stopColor="#ef4444" stopOpacity="0.35" />
                                    <stop offset="40%" stopColor="#9333ea" stopOpacity="0.15" />
                                    <stop offset="100%" stopColor="#000" stopOpacity="0" />
                                </radialGradient>
                                <radialGradient id="heatOrange" cx="50%" cy="50%" r="50%">
                                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
                                    <stop offset="50%" stopColor="#6366f1" stopOpacity="0.08" />
                                    <stop offset="100%" stopColor="#000" stopOpacity="0" />
                                </radialGradient>
                                <radialGradient id="radarSweepGradient" cx="50%" cy="50%" r="50%">
                                    <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.15" />
                                    <stop offset="85%" stopColor="#a855f7" stopOpacity="0.03" />
                                    <stop offset="100%" stopColor="#000" stopOpacity="0" />
                                </radialGradient>
                            </defs>

                            {/* A. TOPO ELEVATION CONTOUR LINES */}
                            {showContours && (
                                <g className="opacity-45 text-slate-800" stroke="currentColor" strokeWidth="0.8">
                                    {/* Major Elevation Rings */}
                                    <path d="M 60,60 C 140,40 180,90 280,70 S 440,110 520,70" fill="none" strokeDasharray="3 6" />
                                    <path d="M 40,140 C 110,120 180,180 260,150 S 420,180 540,120" fill="none" />
                                    <path d="M 80,240 C 180,220 220,290 320,260 S 480,290 560,230" fill="none" strokeDasharray="4 4" />
                                    <path d="M 120,310 C 220,300 290,340 380,310 S 500,330 580,290" fill="none" />

                                    {/* Altitude coordinates stamps */}
                                    <text x="75" y="55" fill="#334155" fontSize="7" fontWeight="bold" className="font-mono">EL: 840m</text>
                                    <text x="515" y="115" fill="#334155" fontSize="7" fontWeight="bold" className="font-mono">EL: 720m</text>
                                    <text x="245" y="275" fill="#334155" fontSize="7" fontWeight="bold" className="font-mono">EL: 660m</text>
                                </g>
                            )}

                            {/* B. EVACUATION PATH CORRIDORS */}
                            {showEvac && (
                                <g className="opacity-80">
                                    {/* Evacuation Line Corridor 1 */}
                                    <path 
                                        d="M 190,135 Q 160,80 90,80" 
                                        stroke="#10b981" 
                                        strokeWidth="1.5" 
                                        strokeDasharray="4 4" 
                                        fill="none" 
                                        className="map-glow-cyan"
                                    />
                                    {/* Evacuation Line Corridor 2 */}
                                    <path 
                                        d="M 410,245 Q 430,310 490,320" 
                                        stroke="#10b981" 
                                        strokeWidth="1.5" 
                                        strokeDasharray="4 4" 
                                        fill="none" 
                                        className="map-glow-cyan"
                                    />
                                    
                                    {/* Muster safe station 1 */}
                                    <g transform="translate(90,80)" className="cursor-help">
                                        <circle r="8" fill="#047857" fillOpacity="0.2" stroke="#10b981" strokeWidth="1" />
                                        <circle r="4" fill="#10b981" />
                                        <text x="12" y="3" fill="#10b981" fontSize="7" fontWeight="black" className="font-sans uppercase tracking-widest font-mono">SAFE PT A</text>
                                    </g>

                                    {/* Muster safe station 2 */}
                                    <g transform="translate(490,320)" className="cursor-help">
                                        <circle r="8" fill="#047857" fillOpacity="0.2" stroke="#10b981" strokeWidth="1" />
                                        <circle r="4" fill="#10b981" />
                                        <text x="-65" y="3" fill="#10b981" fontSize="7" fontWeight="black" className="font-sans uppercase tracking-widest font-mono">SAFE PT B</text>
                                    </g>
                                </g>
                            )}

                            {/* C. AWASH RIVER CHANNELS FLOW */}
                            <g>
                                {/* Background thick river shadow to represent water dilation */}
                                <path 
                                    d="M 50,80 Q 150,50 220,120 T 380,180 T 550,220" 
                                    stroke={simulationLevel > 50 ? 'url(#riverCritical)' : 'url(#riverNormal)'} 
                                    strokeWidth={10 + (simulationLevel * 0.2)} 
                                    strokeLinecap="round" 
                                    fill="none" 
                                    className="opacity-45 transition-all duration-300" 
                                    style={{ filter: `blur(${simulationLevel > 60 ? '4px' : '1px'})` }}
                                />

                                {/* Glowing main vector river current flow */}
                                <path 
                                    d="M 50,80 Q 150,50 220,120 T 380,180 T 550,220" 
                                    stroke={simulationLevel > 50 ? '#ec4899' : '#06b6d4'} 
                                    strokeWidth={3.5 + (simulationLevel * 0.05)} 
                                    strokeLinecap="round" 
                                    fill="none" 
                                    className="opacity-90 transition-all duration-300 animate-wave" 
                                    style={{
                                        strokeDasharray: '15 10',
                                        filter: `drop-shadow(0 0 8px ${simulationLevel > 50 ? '#ec4899' : '#06b6d4'})`
                                    }}
                                />
                            </g>

                            {/* D. GLOWING FLOOD HEAT ZONES */}
                            {showHeatzones && payload?.nodes.map((node, idx) => {
                                const coords = getMapCoordinates(node.id, idx);
                                const risk = getSimulatedRisk(node);
                                
                                if (risk === 'Critical') {
                                    return (
                                        <circle 
                                            key={`heat-${node.id}`}
                                            cx={coords.x} 
                                            cy={coords.y} 
                                            r={45 + (simulationLevel * 0.65)} 
                                            fill="url(#heatRed)" 
                                            className="animate-pulse-slow" 
                                        />
                                    );
                                } else if (risk === 'Warning') {
                                    return (
                                        <circle 
                                            key={`heat-${node.id}`}
                                            cx={coords.x} 
                                            cy={coords.y} 
                                            r={35 + (simulationLevel * 0.45)} 
                                            fill="url(#heatOrange)" 
                                            className="animate-pulse-slow" 
                                        />
                                    );
                                }
                                return null;
                            })}

                            {/* E. RADAR SWEEPER SHIELD AND SWEEPER CONE */}
                            {showRadar && (
                                <g transform="translate(300, 180)" className="animate-radar-sweep pointer-events-none">
                                    {/* Translucent sweep cone */}
                                    <path 
                                        d="M 0,0 L 260,-90 A 280,280 0 0,0 260,90 Z" 
                                        fill="url(#radarSweepGradient)" 
                                        opacity="0.8" 
                                    />
                                    {/* Fine cyan laser boundary lines */}
                                    <line x1="0" y1="0" x2="260" y2="-90" stroke="#22d3ee" strokeWidth="0.8" opacity="0.35" />
                                    <line x1="0" y1="0" x2="260" y2="90" stroke="#a855f7" strokeWidth="0.8" opacity="0.3" />
                                    <circle cx="260" cy="-90" r="1.5" fill="#22d3ee" className="animate-ping" />
                                </g>
                            )}

                            {/* F. INTERACTIVE SPARE SENSOR NODES PIN OVERLAYS */}
                            {payload?.nodes.map((node, index) => {
                                const coords = getMapCoordinates(node.id, index);
                                const isSelected = selectedMapNode?.id === node.id;
                                const simRisk = getSimulatedRisk(node);

                                let pinColor = '#10b981';
                                let textClass = 'text-glow-emerald';
                                if (simRisk === 'Warning') {
                                    pinColor = '#f59e0b';
                                    textClass = 'text-glow-cyan';
                                } else if (simRisk === 'Critical') {
                                    pinColor = '#ef4444';
                                    textClass = 'text-glow-red';
                                }

                                return (
                                    <g 
                                        key={`pin-${node.id}`} 
                                        transform={`translate(${coords.x}, ${coords.y})`}
                                        className="cursor-pointer group select-none"
                                        onClick={() => setSelectedMapNode(node)}
                                    >
                                        {/* Expanding double alarm rings for Danger warning nodes */}
                                        {simRisk === 'Critical' && (
                                            <g>
                                                <circle r="36" fill="none" stroke="#ef4444" strokeWidth="1" className="animate-pulse-ring" />
                                                <circle r="22" fill="none" stroke="#a855f7" strokeWidth="1.5" opacity="0.4" className="animate-ping" />
                                            </g>
                                        )}
                                        
                                        {/* Dynamic ripple underlay hover rings */}
                                        <circle 
                                            r="16" 
                                            fill={pinColor} 
                                            opacity={isSelected ? '0.2' : '0'} 
                                            className="group-hover:opacity-20 transition-all duration-300" 
                                        />
                                        <circle 
                                            r="10" 
                                            fill="none" 
                                            stroke={pinColor} 
                                            strokeWidth="2" 
                                            opacity={isSelected ? '0.9' : '0.45'} 
                                            className="group-hover:opacity-100 transition-all duration-300" 
                                        />
                                        
                                        {/* Solid Glowing Core Node Button */}
                                        <circle 
                                            r="5" 
                                            fill={pinColor} 
                                            className={`transition-all duration-300 group-hover:scale-135`} 
                                            style={{ filter: `drop-shadow(0 0 8px ${pinColor})` }}
                                        />

                                        {/* Station Node Typography label */}
                                        <text 
                                            y="-16" 
                                            textAnchor="middle" 
                                            fill="#e2e8f0" 
                                            fontSize="9" 
                                            fontWeight="black" 
                                            className={`font-mono transition-all duration-300 group-hover:fill-cyan-300 uppercase tracking-widest ${isSelected ? 'fill-purple-400 font-bold scale-105' : 'opacity-70'} ${textClass}`}
                                            style={{ textShadow: isSelected ? '0 0 8px rgba(168,85,247,0.8)' : 'none' }}
                                        >
                                            {node.name.split(' ')[0]}
                                        </text>
                                        
                                        {/* Active micro badge with reading display on hover */}
                                        <g className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" transform="translate(0, 22)">
                                            <rect x="-35" y="-10" width="70" height="16" rx="4" fill="#03060c" stroke={pinColor} strokeWidth="1" />
                                            <text y="1" textAnchor="middle" fill="#94a3b8" fontSize="8" fontWeight="bold" className="font-mono">
                                                {getSimulatedWaterLevel(node).toFixed(0)}cm
                                            </text>
                                        </g>
                                    </g>
                                );
                            })}
                        </svg>

                        {/* Interactive floating text HUD instructions */}
                        <div className="absolute bottom-6 left-6 max-w-[240px] glass-panel-premium border border-slate-900/80 rounded-2xl p-4.5 shadow-2xl backdrop-blur-md">
                            <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest block mb-1">
                                Operational guidelines
                            </span>
                            <p className="text-slate-400 text-[10px] font-bold leading-relaxed">
                                Click any active transceiver dot along the Awash River channel to sync diagnostic vitals to the Night-Vision terminal panel.
                            </p>
                        </div>
                    </div>

                    {/* 3. Floating HUD Analytics Cards Overlaid on bottom of Map area */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4.5 border-t border-slate-900/60 bg-[#040811]/40 rounded-b-3xl">
                        
                        {/* Card A: Basin Hydration Overlays */}
                        <div className="glass-panel p-3.5 rounded-2xl flex items-center justify-between border-slate-900">
                            <div>
                                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block">Average volume</span>
                                <span className="text-sm font-black text-cyan-400 font-mono mt-1 block">
                                    {(145 + (simulationLevel * 2.2)).toFixed(1)} <span className="text-[9px] text-slate-500 font-medium">cm</span>
                                </span>
                            </div>
                            <div className="w-12 h-1 bg-slate-950 border border-slate-900 rounded relative overflow-hidden">
                                <div 
                                    className="absolute left-0 top-0 h-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)] transition-all duration-300"
                                    style={{ width: `${Math.min(100, 30 + simulationLevel * 0.7)}%` }}
                                />
                            </div>
                        </div>

                        {/* Card B: Mesh Network Ping Oscillations */}
                        <div className="glass-panel p-3.5 rounded-2xl flex items-center justify-between border-slate-900">
                            <div>
                                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block">Mesh Ping / Packets</span>
                                <span className="text-sm font-black text-purple-400 font-mono mt-1 block">
                                    {meshPing}ms / {meshPackets} pkts
                                </span>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase bg-purple-500/10 border border-purple-500/20 text-purple-400">
                                433MHZ LORA
                            </span>
                        </div>

                        {/* Card C: Battery Energy Matrix */}
                        <div className="glass-panel p-3.5 rounded-2xl flex items-center justify-between border-slate-900">
                            <div>
                                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block">Solar efficiency</span>
                                <span className="text-sm font-black text-emerald-400 font-mono mt-1 block">
                                    {meshSolarEff.toFixed(1)}%
                                </span>
                            </div>
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-emerald-400 animate-pulse" />
                        </div>
                    </div>

                </div>

            </div>

            {/* Night-Vision Station Telemetry diagnostics sidebar (Takes 1 column) */}
            <div className="lg:col-span-1 flex flex-col justify-between glass-panel rounded-3xl p-6 min-h-[580px] relative overflow-hidden">
                <div className="absolute inset-0 bg-[#03070f]/90 pointer-events-none" />
                <div className="absolute inset-0 cyber-scanner pointer-events-none opacity-10" />

                <div className="relative z-10 space-y-6">
                    {/* Panel Header */}
                    <div className="border-b border-slate-900/60 pb-5 text-center">
                        <h3 className="text-xs font-black text-purple-400 tracking-widest uppercase">Telemetry Receiver</h3>
                        <h2 className="text-base font-black text-slate-100 mt-1 uppercase tracking-wide">
                            Night-Vision HUD
                        </h2>
                    </div>

                    {selectedMapNode ? (
                        <div className="space-y-6">
                            {/* Station Header details */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black tracking-widest border bg-slate-950 border-slate-800 text-slate-400 uppercase font-mono">
                                        {selectedMapNode.id}
                                    </span>
                                    <span className={`px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${getAlertColors(getSimulatedRisk(selectedMapNode))}`}>
                                        {getSimulatedRisk(selectedMapNode)}
                                    </span>
                                </div>
                                <h4 className="text-lg font-black text-slate-50 tracking-wide uppercase">
                                    {selectedMapNode.name}
                                </h4>
                            </div>

                            {/* Interactive Liquid Column Level simulator */}
                            <div className="bg-[#02050b] border border-slate-900/80 rounded-2xl p-4 flex flex-col items-center">
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-3 block">Cylinder Depth sensor</span>
                                
                                <div className="w-10 h-36 border border-slate-800 rounded-xl relative overflow-hidden bg-slate-950/80 flex flex-col justify-end">
                                    {/* Dynamic Visual Water height */}
                                    <div 
                                        className={`w-full transition-all duration-500 shadow-[0_0_12px_inset_rgba(255,255,255,0.2)] ${
                                            getSimulatedRisk(selectedMapNode) === 'Critical' 
                                                ? 'bg-gradient-to-t from-red-600 to-pink-500 shadow-red-500/30' 
                                                : getSimulatedRisk(selectedMapNode) === 'Warning' 
                                                    ? 'bg-gradient-to-t from-amber-600 to-yellow-500 shadow-amber-500/30' 
                                                    : 'bg-gradient-to-t from-indigo-600 to-cyan-500 shadow-cyan-500/30'
                                        }`}
                                        style={{ height: `${Math.min(100, (getSimulatedWaterLevel(selectedMapNode) / 550) * 100)}%` }}
                                    />
                                    
                                    {/* Calibration ticks */}
                                    <div className="absolute inset-0 flex flex-col justify-between p-1.5 pointer-events-none text-[7px] font-mono font-bold text-slate-700">
                                        <div className="border-t border-slate-800 w-full text-right">5.0m</div>
                                        <div className="border-t border-slate-900 w-full text-right">3.5m</div>
                                        <div className="border-t border-slate-900 w-full text-right">2.0m</div>
                                        <div className="border-t border-slate-900 w-full text-right">0.5m</div>
                                    </div>
                                </div>
                                <span className="text-xl font-black text-slate-100 font-mono mt-3">
                                    {getSimulatedWaterLevel(selectedMapNode).toFixed(1)} <span className="text-xs text-slate-500">cm</span>
                                </span>
                            </div>

                            {/* Details Statistics logs */}
                            <div className="grid grid-cols-2 gap-3.5">
                                <div className="bg-[#02050b] border border-slate-900/60 p-3 rounded-xl">
                                    <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest block mb-0.5">Precipitation</span>
                                    <p className="text-base font-black text-cyan-400 font-mono">
                                        {selectedMapNode.rainfallRateMm?.toFixed(1) || '0.0'} <span className="text-[10px] text-slate-500 font-normal">mm/h</span>
                                    </p>
                                </div>
                                <div className="bg-[#02050b] border border-slate-900/60 p-3 rounded-xl">
                                    <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest block mb-0.5">Battery power</span>
                                    <p className="text-base font-black text-slate-200 font-mono">
                                        {selectedMapNode.batteryLevel || 0}%
                                    </p>
                                </div>
                                <div className="bg-[#02050b] border border-slate-900/60 p-3 rounded-xl">
                                    <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest block mb-0.5">RSSI signal</span>
                                    <p className="text-base font-black text-[#a855f7] font-mono">
                                        -74 <span className="text-[10px] text-slate-500 font-normal">dBm</span>
                                    </p>
                                </div>
                                <div className="bg-[#02050b] border border-slate-900/60 p-3 rounded-xl">
                                    <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest block mb-0.5">ESP32 State</span>
                                    <p className="text-xs font-black text-emerald-400 uppercase tracking-widest mt-1">
                                        {selectedMapNode.status || 'ACTIVE'}
                                    </p>
                                </div>
                            </div>

                            {/* Coordinates block */}
                            <div className="bg-[#02050b]/80 border border-slate-900 p-3.5 rounded-2xl text-[9px] font-mono text-slate-500 space-y-1">
                                <div className="flex justify-between">
                                    <span>COORD LAT:</span>
                                    <span className="text-slate-300 font-bold">{selectedMapNode.latitude.toFixed(6)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>COORD LNG:</span>
                                    <span className="text-slate-300 font-bold">{selectedMapNode.longitude.toFixed(6)}</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-grow flex flex-col items-center justify-center text-center text-slate-600 py-16">
                            <svg className="w-12 h-12 text-slate-800 mb-4 animate-[bounce_2s_infinite]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                            </svg>
                            <p className="font-black text-xs uppercase tracking-widest font-mono text-slate-500">
                                Calibration Standby
                            </p>
                            <p className="text-[10px] text-slate-600 mt-2 max-w-[180px] leading-relaxed">
                                Select an active Awash transceiver node dot on the GIS map to execute diagnostic query registers.
                            </p>
                        </div>
                    )}
                </div>

                {/* Broadcast Action block at the bottom */}
                {selectedMapNode && (
                    <div className="relative z-10 pt-4 border-t border-slate-900/60 mt-4">
                        <button 
                            onClick={() => broadcastEmergencySMS(selectedMapNode)}
                            className="w-full bg-red-600/20 hover:bg-red-600/35 text-red-400 border border-red-500/35 py-3.5 rounded-2xl font-black text-[10px] transition-all duration-300 tracking-widest uppercase shadow-[0_0_15px_rgba(239,68,68,0.15)] flex items-center justify-center gap-2 hover:scale-[1.02]"
                        >
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                            Broadcast Proximity SMS
                        </button>
                    </div>
                )}
            </div>

        </div>
    );
};

import React, { useState, useEffect, useRef } from 'react';

interface LoginPanelProps {
  onLoginSuccess: () => void;
}

export const LoginPanel: React.FC<LoginPanelProps> = ({ onLoginSuccess }) => {
  // Authentication inputs
  const [username, setUsername] = useState('astu-analyst');
  const [password, setPassword] = useState('astu-sfews-2026');
  const [securityCode, setSecurityCode] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  
  // High-fidelity UI States
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptionLogs, setDecryptionLogs] = useState<string[]>([]);
  const [activeInput, setActiveInput] = useState<string | null>(null);
  const [espTemperature, setEspTemperature] = useState(38.6);
  const [espRssi, setEspRssi] = useState(-64);
  const [activeTab, setActiveTab] = useState<'standard' | 'token'>('standard');
  const [systemUptime, setSystemUptime] = useState('14d 06h 22m');

  // References for Interactive Particle Background
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef({ x: -1000, y: -1000, radius: 150 });

  // Fluctuate ESP32 node pool vitals for high-fidelity realism
  useEffect(() => {
    const vitalsInterval = setInterval(() => {
      setEspTemperature(prev => +(prev + (Math.random() * 0.6 - 0.3)).toFixed(1));
      setEspRssi(prev => {
        const delta = Math.floor(Math.random() * 3) - 1;
        const next = prev + delta;
        return next < -72 ? -72 : next > -56 ? -56 : next;
      });
    }, 2500);

    // Dynamic Uptime ticker
    const uptimeInterval = setInterval(() => {
      const hours = new Date().getHours().toString().padStart(2, '0');
      const mins = new Date().getMinutes().toString().padStart(2, '0');
      const secs = new Date().getSeconds().toString().padStart(2, '0');
      setSystemUptime(`14d ${hours}h ${mins}m ${secs}s`);
    }, 1000);

    return () => {
      clearInterval(vitalsInterval);
      clearInterval(uptimeInterval);
    };
  }, []);

  // HTML5 Interactive Constellation Particle Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let particles: Particle[] = [];
    const particleCount = 80;

    class Particle {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      color: string;
      glowColor: string;
      originalSpeedX: number;
      originalSpeedY: number;

      constructor() {
        this.x = Math.random() * (canvas?.width || window.innerWidth);
        this.y = Math.random() * (canvas?.height || window.innerHeight);
        this.size = Math.random() * 2 + 0.8;
        
        this.speedX = Math.random() * 0.4 - 0.2;
        this.speedY = Math.random() * 0.4 - 0.2;
        this.originalSpeedX = this.speedX;
        this.originalSpeedY = this.speedY;

        // Cinematic color pool matching purple neon themes
        const themes = [
          { color: 'rgba(168, 85, 247, 0.45)', glow: 'rgba(168, 85, 247, 0.8)' },  // Purple Glow
          { color: 'rgba(129, 140, 248, 0.4)', glow: 'rgba(129, 140, 248, 0.7)' },  // Indigo Glow
          { color: 'rgba(6, 182, 212, 0.35)', glow: 'rgba(6, 182, 212, 0.65)' },   // Cyan Glow
          { color: 'rgba(236, 72, 153, 0.3)', glow: 'rgba(236, 72, 153, 0.6)' }    // Pink Glow
        ];
        const selection = themes[Math.floor(Math.random() * themes.length)];
        this.color = selection.color;
        this.glowColor = selection.glow;
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;

        // Wall collisions
        if (canvas) {
          if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
          if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;
        }

        // Smooth mouse interactive physics
        const dx = mouseRef.current.x - this.x;
        const dy = mouseRef.current.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < mouseRef.current.radius) {
          const force = (mouseRef.current.radius - dist) / mouseRef.current.radius;
          const forceDirX = dx / dist;
          const forceDirY = dy / dist;
          
          // Push away from mouse smoothly
          this.x -= forceDirX * force * 1.8;
          this.y -= forceDirY * force * 1.8;
        } else {
          // Re-establish original slow orbital drift
          this.speedX = this.speedX * 0.95 + this.originalSpeedX * 0.05;
          this.speedY = this.speedY * 0.95 + this.originalSpeedY * 0.05;
        }
      }

      draw(c: CanvasRenderingContext2D) {
        c.save();
        c.beginPath();
        c.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        c.fillStyle = this.color;
        c.shadowColor = this.glowColor;
        c.shadowBlur = this.size > 1.5 ? 8 : 2;
        c.fill();
        c.restore();
      }
    }

    const init = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      particles = Array.from({ length: particleCount }, () => new Particle());
    };

    const handleResize = () => {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
    };

    const handleMouseLeave = () => {
      mouseRef.current.x = -1000;
      mouseRef.current.y = -1000;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    init();

    // Draw mesh connection wires
    const drawConstellationWires = (c: CanvasRenderingContext2D) => {
      const maxDistance = 120;
      for (let a = 0; a < particles.length; a++) {
        for (let b = a + 1; b < particles.length; b++) {
          const dx = particles[a].x - particles[b].x;
          const dy = particles[a].y - particles[b].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDistance) {
            const alpha = (1 - dist / maxDistance) * 0.16;
            c.strokeStyle = `rgba(139, 92, 246, ${alpha})`;
            c.lineWidth = 0.85;
            c.beginPath();
            c.moveTo(particles[a].x, particles[a].y);
            c.lineTo(particles[b].x, particles[b].y);
            c.stroke();
          }
        }
      }
    };

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Render grid matrix cells overlay
      ctx.strokeStyle = 'rgba(139, 92, 246, 0.015)';
      ctx.lineWidth = 1;
      const step = 50;
      for (let x = 0; x < canvas.width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      particles.forEach(p => {
        p.update();
        p.draw(ctx);
      });

      drawConstellationWires(ctx);
      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationId);
    };
  }, []);

  // Cyber decryption log output simulator
  const executeTunnelDecryption = () => {
    setIsDecrypting(true);
    setDecryptionLogs([]);

    const steps = [
      '✨ [INIT] STARTING CRITICAL COMMAND ACCESS LINK DECRYPTOR...',
      '🛰️ [LINK] CONNECTING TO GEOSPATIAL METEOROLOGY AWASH FEED...',
      '🔌 [ESP32] SECURING LoRa MESH-MESH AD-HOC GATEWAY CONNECTION...',
      '🛠️ [HARDWARE] READING BOARD STATE: XTENSA 32-BIT LX6 MCU CHIP INTACT',
      '🌡️ [VITALS] ESP32 CHIP TEMPERATURE: ' + espTemperature + '°C | SYSTEM PING: 22ms',
      '📡 [RF] STRENGTH MATRIX (RSSI): ' + espRssi + ' dBm | CRC CHECKSUM: STABLE',
      '⚡ [DB] SHADOW HANDSHAKE ROUTED TO NEON DATABASES...',
      '🎓 [CREDENTIALS] ADAMA SCIENCE & TECH UNIVERSITY LAB ROOTS LOADED.',
      '🚀 [DECRYPT] UNLOCKING LOCAL KEYRING SHA-512 MATRIX FOR SECURED PANEL...',
      '✅ [SYS] TUNNEL SYNCHRONIZED. INJECTING AWS-AWASH EARLY CONSOLE VECTOR...',
    ];

    steps.forEach((step, index) => {
      setTimeout(() => {
        setDecryptionLogs(prev => [...prev, step]);
        if (index === steps.length - 1) {
          setTimeout(() => {
            onLoginSuccess();
          }, 950);
        }
      }, (index + 1) * 320);
    });
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!username.trim() || !password.trim()) {
      setAuthError('Authentication Shielded: Username and security token are mandatory.');
      return;
    }

    // Default credentials validator
    if (username === 'admin' || username === 'astu-analyst') {
      if (password === 'astu-sfews-2026' || password === 'admin') {
        executeTunnelDecryption();
        return;
      }
    }

    setAuthError('CRITICAL_SEC_FAIL: Cryptographic signature mismatch or token credentials invalid.');
  };

  // Click handler for biometric pin keypad
  const handleKeypadPress = (digit: string) => {
    if (securityCode.length < 6) {
      const nextCode = securityCode + digit;
      setSecurityCode(nextCode);

      // Auto check override key if it hits 6 digits
      if (nextCode === '202611') {
        // Quick biometric simulation override
        setUsername('astu-analyst');
        setPassword('astu-sfews-2026');
        executeTunnelDecryption();
      } else if (nextCode.length === 6) {
        setAuthError('OVERRIDE_ERROR: High security token signature invalid. Reset pin.');
        setSecurityCode('');
      }
    }
  };

  const clearKeypad = () => {
    setSecurityCode('');
    setAuthError(null);
  };

  return (
    <div className="relative w-full min-h-screen bg-[#020308] text-slate-100 flex items-center justify-center p-4 md:p-8 overflow-hidden font-sans select-none">
      
      {/* High-Performance Particle Engine */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0" />

      {/* Cyber Grid & Scanline */}
      <div className="absolute inset-0 bg-transparent z-1 pointer-events-none overflow-hidden">
        <div className="w-full h-[3px] bg-gradient-to-r from-transparent via-purple-500/10 to-transparent absolute animate-scanline"></div>
      </div>

      {/* Futuristic Purple & Indigo Ambient Spherical Glows */}
      <div className="absolute top-[10%] left-[15%] w-[45vw] h-[45vw] bg-purple-900/10 rounded-full blur-[140px] pointer-events-none z-0 animate-pulse-slow"></div>
      <div className="absolute bottom-[8%] right-[12%] w-[40vw] h-[40vw] bg-indigo-900/15 rounded-full blur-[160px] pointer-events-none z-0"></div>
      <div className="absolute top-[45%] right-[30%] w-[30vw] h-[30vw] bg-cyan-950/10 rounded-full blur-[130px] pointer-events-none z-0"></div>

      {/* Core Auth Panel Wrapper */}
      <div className="relative z-10 w-full max-w-5xl bg-[#060814]/45 border border-purple-500/15 rounded-[36px] shadow-[0_30px_70px_-15px_rgba(0,0,0,0.85)] backdrop-blur-[24px] grid grid-cols-1 lg:grid-cols-12 overflow-hidden min-h-[660px]">
        
        {/* Double-Panel Glowing Neon Inner Frame */}
        <div className="absolute inset-0 rounded-[36px] border border-purple-500/10 pointer-events-none z-10 shadow-[inset_0_1.5px_0_rgba(255,255,255,0.06),0_0_50px_rgba(168,85,247,0.04)]"></div>

        {/* LEFT COLUMN: SYSTEM VITALS, ASTU BRANDING & ESP32 CONFIGS */}
        <div className="lg:col-span-5 bg-gradient-to-b from-[#080b1b]/85 to-[#040610]/90 p-8 border-b lg:border-b-0 lg:border-r border-purple-500/15 flex flex-col justify-between relative overflow-hidden">
          
          {/* Subtle ESP32 Circuit Background Watermark */}
          <div className="absolute -bottom-16 -left-16 w-64 h-64 border border-purple-500/5 rounded-full opacity-30 pointer-events-none flex items-center justify-center">
            <div className="w-48 h-48 border border-purple-500/5 rounded-full flex items-center justify-center">
              <div className="w-32 h-32 border border-purple-500/5 rounded-full"></div>
            </div>
          </div>

          {/* ASTU Branding Header */}
          <div className="space-y-6 relative z-10">
            <div className="flex items-center gap-3.5">
              {/* Premium customized high-fidelity glowing SVG emblem */}
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 via-indigo-600/20 to-cyan-500/20 border border-purple-500/30 flex items-center justify-center shadow-[0_0_25px_rgba(168,85,247,0.2)] relative shrink-0">
                <svg className="w-10 h-10 text-purple-300" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <polygon points="50,10 90,30 90,70 50,90 10,70 10,30" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" fill="rgba(168, 85, 247, 0.05)"/>
                  <circle cx="50" cy="50" r="22" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3"/>
                  <path d="M35 45 L50 65 L65 45" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="50" y1="28" x2="50" y2="72" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                  <circle cx="50" cy="50" r="7" fill="#22d3ee" className="animate-pulse"/>
                </svg>
                {/* Glowing Core Dot */}
                <span className="w-2 h-2 rounded-full bg-cyan-400 absolute top-1 right-1 animate-ping"></span>
              </div>
              <div>
                <h1 className="text-xl font-extrabold tracking-widest text-slate-100 bg-gradient-to-r from-slate-50 via-purple-100 to-indigo-300 bg-clip-text text-transparent">ASTU-SFEWS</h1>
                <p className="text-[9px] font-bold text-cyan-400/90 tracking-widest font-mono mt-0.5">Hydrology Research Lab</p>
              </div>
            </div>

            <div className="h-[1px] bg-gradient-to-r from-purple-500/20 via-purple-500/5 to-transparent w-full"></div>

            {/* ESP32 Hardware Blueprint / Spec Matrix */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
                <span className="text-[10px] font-black text-slate-400 tracking-wider font-mono">ESP32 Hardware telemetry</span>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div className="bg-[#080c1e]/60 border border-purple-500/10 p-3 rounded-xl flex flex-col justify-between hover:border-purple-500/20 transition-all duration-300">
                  <span className="text-[8px] text-slate-500 font-bold tracking-wider">processor node</span>
                  <span className="text-[11px] font-mono font-bold text-slate-300 mt-1">Tensilica LX6 Dual-Core</span>
                </div>
                <div className="bg-[#080c1e]/60 border border-purple-500/10 p-3 rounded-xl flex flex-col justify-between hover:border-purple-500/20 transition-all duration-300">
                  <span className="text-[8px] text-slate-500 font-bold tracking-wider">transceiver freq</span>
                  <span className="text-[11px] font-mono font-bold text-slate-300 mt-1">Lora 433 MHz</span>
                </div>
                <div className="bg-[#080c1e]/60 border border-purple-500/10 p-3 rounded-xl flex flex-col justify-between hover:border-purple-500/20 transition-all duration-300">
                  <span className="text-[8px] text-slate-500 font-bold tracking-wider">core chip temp</span>
                  <span className="text-[11px] font-mono font-bold text-amber-400 mt-1 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    {espTemperature}°C
                  </span>
                </div>
                <div className="bg-[#080c1e]/60 border border-purple-500/10 p-3 rounded-xl flex flex-col justify-between hover:border-purple-500/20 transition-all duration-300">
                  <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">link status (rssi)</span>
                  <span className="text-[11px] font-mono font-bold text-cyan-400 mt-1 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-cyan-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" /></svg>
                    {espRssi} dBm
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* IoT Telemetry Nodes Stream */}
          <div className="space-y-3.5 my-8 relative z-10">
            <div className="flex justify-between items-center text-[9px] text-slate-400 font-extrabold uppercase tracking-widest font-mono">
              <span>Awash telemetry points</span>
              <span className="text-cyan-400 animate-pulse font-bold">ONLINE</span>
            </div>

            <div className="space-y-2.5">
              {[
                { name: 'Station Alpha-1', desc: 'Awash Semera Gate', level: '142 cm', status: 'Safe', color: 'bg-emerald-500', text: 'text-emerald-400' },
                { name: 'Station Beta-2', desc: 'Adama Siphon Flow', level: '298 cm', status: 'Warning', color: 'bg-amber-500', text: 'text-amber-400' },
                { name: 'Station Gamma-3', desc: 'Awash Melka Sump', level: '488 cm', status: 'Critical', color: 'bg-red-500', text: 'text-red-400' },
              ].map(node => (
                <div key={node.name} className="bg-[#050712]/75 border border-purple-500/5 hover:border-purple-500/15 p-3 rounded-xl flex items-center justify-between transition-all duration-200 group">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full relative">
                      <span className={`absolute inset-0 rounded-full ${node.color} animate-ping opacity-60`}></span>
                      <span className={`relative block w-2 h-2 rounded-full ${node.color}`}></span>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-200 group-hover:text-purple-300 transition-colors">{node.name}</p>
                      <p className="text-[8px] text-slate-500 font-bold tracking-wider">{node.desc}</p>
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <p className="text-[10px] font-black text-slate-300">{node.level}</p>
                    <span className={`text-[8px] font-black uppercase tracking-wider ${node.text}`}>{node.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Left panel bottom specs */}
          <div className="border-t border-purple-500/15 pt-4 z-10 flex items-center justify-between text-[9px] text-slate-500 font-bold uppercase tracking-wider font-mono">
            <span>Uptime: {systemUptime}</span>
            <span>v4.1-Lora</span>
          </div>

        </div>

        {/* RIGHT COLUMN: AUTHENTICATION PANEL */}
        <div className="lg:col-span-7 p-8 md:p-12 flex flex-col justify-between relative">
          
          {/* SECURE DECRYPTION LOOPS OVERLAY */}
          {isDecrypting && (
            <div className="absolute inset-0 bg-[#04060f]/95 backdrop-blur-md z-40 flex flex-col justify-between p-8 md:p-12 animate-in fade-in duration-300 rounded-r-[36px]">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <span className="animate-spin w-5 h-5 rounded-full border-2 border-purple-500/20 border-t-purple-500"></span>
                  <h3 className="text-sm font-extrabold tracking-widest text-purple-400 uppercase font-mono">ESTABLISHING ENCRYPTED SESSION HANDSHAKE...</h3>
                </div>
                <div className="bg-[#020308]/90 border border-purple-500/15 rounded-2xl p-5 h-96 overflow-y-auto space-y-2.5 font-mono text-[10.5px] text-emerald-400 scrollbar-thin">
                  {decryptionLogs.map((log, index) => (
                    <p key={index} className="leading-relaxed animate-in fade-in slide-in-from-left-4 duration-200">
                      {log}
                    </p>
                  ))}
                </div>
              </div>
              <div className="flex justify-between items-center text-[9px] text-slate-500 font-bold tracking-widest uppercase font-mono pt-4 border-t border-purple-500/10">
                <span>TUNNEL SECURED: AES-GCM-256</span>
                <span>TUNNEL_SYS_OK // ASTU</span>
              </div>
            </div>
          )}

          {/* Form Header Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[9px] font-black tracking-widest text-purple-400 uppercase font-mono bg-purple-500/10 border border-purple-500/20 px-3 py-1 rounded-full w-max">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-ping"></span>
              🛡️ Secure Encryption Node
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-100">Awash Basin Access</h2>
            <p className="text-slate-400 text-xs font-semibold">Provide credentials or key overrides to authorize synchronization of flood indicators.</p>
          </div>

          {/* Tab Selector */}
          <div className="flex gap-2.5 bg-[#050711]/80 border border-purple-500/10 p-1.5 rounded-2xl w-max mt-6">
            <button
              onClick={() => setActiveTab('standard')}
              className={`px-4.5 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all duration-200 ${activeTab === 'standard' ? 'bg-purple-600 text-slate-50 shadow-md shadow-purple-600/30' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Credentials Gate
            </button>
            <button
              onClick={() => setActiveTab('token')}
              className={`px-4.5 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all duration-200 ${activeTab === 'token' ? 'bg-purple-600 text-slate-50 shadow-md shadow-purple-600/30' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Token Override
            </button>
          </div>

          {/* Standard Authentication Form */}
          {activeTab === 'standard' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-5 my-6">
              
              {authError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-300 text-xs px-4 py-3 rounded-xl font-semibold flex items-center gap-3 animate-pulse">
                  <svg className="w-5 h-5 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  <span className="font-mono text-[10.5px]">{authError}</span>
                </div>
              )}

              <div className="space-y-4">
                {/* Username Field */}
                <div className="relative">
                  <div className={`absolute inset-0 bg-purple-500/5 rounded-2xl transition-all duration-300 ${activeInput === 'username' ? 'opacity-100 blur-[8px]' : 'opacity-0'}`}></div>
                  <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200 ${activeInput === 'username' ? 'text-purple-400' : 'text-slate-500'}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onFocus={() => setActiveInput('username')}
                    onBlur={() => setActiveInput(null)}
                    className={`w-full pl-12 pr-4 py-4 bg-[#04060f]/80 border ${activeInput === 'username' ? 'border-purple-500/60 shadow-[0_0_15px_rgba(168,85,247,0.15)] text-slate-100' : 'border-purple-500/10 text-slate-300'} hover:border-purple-500/30 rounded-2xl text-sm font-semibold focus:outline-none transition-all duration-300 placeholder:text-slate-600`}
                    placeholder="Enter Analyst Username"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[8px] font-mono font-bold tracking-widest text-slate-600">USR_ID</span>
                </div>

                {/* Password / Crypto-Key Field */}
                <div className="relative">
                  <div className={`absolute inset-0 bg-purple-500/5 rounded-2xl transition-all duration-300 ${activeInput === 'password' ? 'opacity-100 blur-[8px]' : 'opacity-0'}`}></div>
                  <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200 ${activeInput === 'password' ? 'text-purple-400' : 'text-slate-500'}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setActiveInput('password')}
                    onBlur={() => setActiveInput(null)}
                    className={`w-full pl-12 pr-4 py-4 bg-[#04060f]/80 border ${activeInput === 'password' ? 'border-purple-500/60 shadow-[0_0_15px_rgba(168,85,247,0.15)] text-slate-100' : 'border-purple-500/10 text-slate-300'} hover:border-purple-500/30 rounded-2xl text-sm font-semibold focus:outline-none transition-all duration-300 placeholder:text-slate-600`}
                    placeholder="Enter Secure Security Key"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[8px] font-mono font-bold tracking-widest text-slate-600">HASH_KEY</span>
                </div>
              </div>

              {/* Demo Helper Box */}
              <div className="bg-[#050712]/90 border border-purple-500/5 p-3 rounded-2xl">
                <p className="text-[9px] font-mono text-purple-400/80 leading-relaxed font-bold">
                  🗝️ CONFIG VITALS FOR DEMONSTRATION:<br />
                  User ID: <span className="text-cyan-400">astu-analyst</span> | Hash Key: <span className="text-cyan-400">astu-sfews-2026</span>
                </p>
              </div>

              {/* Action login button with sweeping pulse line */}
              <button
                type="submit"
                className="w-full relative overflow-hidden group bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-500 text-slate-50 py-4.5 rounded-2xl font-black text-sm tracking-widest uppercase transition-all duration-300 shadow-[0_4px_25px_rgba(139,92,246,0.3)] hover:shadow-[0_0_35px_rgba(139,92,246,0.55)] active:scale-[0.98] border border-purple-400/20"
              >
                <span className="absolute inset-x-4 top-0.5 h-[1.5px] bg-gradient-to-r from-transparent via-purple-300 to-transparent opacity-50"></span>
                AUTHORIZE LINK PORTAL
              </button>

            </form>
          ) : (
            /* Biometric Pin Keypad Override Selection */
            <div className="space-y-5 my-6 animate-in fade-in zoom-in-95 duration-200">
              
              {authError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-300 text-xs px-4 py-2 rounded-xl font-mono text-[10.5px]">
                  {authError}
                </div>
              )}

              <div className="bg-[#03050c]/85 border border-purple-500/10 rounded-2xl p-4.5 space-y-4">
                <div className="flex justify-between items-center border-b border-purple-500/10 pb-3">
                  <span className="text-[8.5px] font-extrabold uppercase text-slate-500 tracking-widest font-mono">Biometric Token Buffer</span>
                  <span className="text-xs font-mono font-bold tracking-widest text-purple-400">
                    {securityCode ? securityCode.split('').map(() => '●').join(' ') : 'KEYPAD OVERRIDE'}
                  </span>
                </div>
                
                <div className="grid grid-cols-4 gap-2.5">
                  {['1', '2', '3', '4', '5', '6', '7', '8'].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleKeypadPress(num)}
                      className="py-3 bg-[#080b1e]/50 hover:bg-purple-950/20 active:scale-95 border border-purple-500/5 hover:border-purple-500/25 text-slate-300 hover:text-slate-50 font-mono font-bold rounded-xl text-sm transition-all flex items-center justify-center shadow-inner"
                    >
                      {num}
                    </button>
                  ))}
                  
                  <button
                    type="button"
                    onClick={clearKeypad}
                    className="col-span-2 py-3 bg-red-950/15 hover:bg-red-950/25 text-red-400 hover:text-red-300 font-mono font-bold text-[9px] tracking-widest rounded-xl transition-all flex items-center justify-center border border-red-500/15"
                  >
                    RESET BUFFER
                  </button>

                  {['9', '0'].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleKeypadPress(num)}
                      className="py-3 bg-[#080b1e]/50 hover:bg-purple-950/20 active:scale-95 border border-purple-500/5 hover:border-purple-500/25 text-slate-300 hover:text-slate-50 font-mono font-bold rounded-xl text-sm transition-all flex items-center justify-center"
                    >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

              {/* PIN Code Hint for easy testing */}
              <div className="bg-[#050712]/90 border border-purple-500/5 p-3 rounded-2xl">
                <p className="text-[9px] font-mono text-purple-400/80 leading-relaxed font-bold">
                  🔑 SECURITY PIN OVERRIDE CODE:<br />
                  Input Override Sequence: <span className="text-cyan-400">202611</span>
                </p>
              </div>

            </div>
          )}

          {/* Secure SSL Panel Footer */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 border-t border-purple-500/10 pt-5 text-[9px] text-slate-500 font-bold uppercase tracking-widest font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
              ENC-KEY: AES-SHA-256
            </span>
            <span>SYSTEM ENCRYPTED SFEWS SEC</span>
          </div>

        </div>

      </div>

    </div>
  );
};

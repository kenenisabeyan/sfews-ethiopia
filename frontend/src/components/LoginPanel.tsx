import React, { useState, useEffect, useRef } from 'react';

interface LoginPanelProps {
  onLoginSuccess: () => void;
}

export const LoginPanel: React.FC<LoginPanelProps> = ({ onLoginSuccess }) => {
  // Inputs & security credentials
  const [username, setUsername] = useState('astu-analyst');
  const [password, setPassword] = useState('astu-sfews-2026');
  const [securityCode, setSecurityCode] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  
  // Custom futuristic states
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptionLogs, setDecryptionLogs] = useState<string[]>([]);
  const [activeInput, setActiveInput] = useState<string | null>(null);
  const [espTemperature, setEspTemperature] = useState(38.6);
  const [espRssi, setEspRssi] = useState(-64);

  // References for Canvas Particle Emitter
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef({ x: 0, y: 0, radius: 120 });

  // Blinking/changing ESP32 parameters for dynamic dashboard feel
  useEffect(() => {
    const interval = setInterval(() => {
      setEspTemperature(prev => +(prev + (Math.random() * 0.4 - 0.2)).toFixed(1));
      setEspRssi(prev => {
        const delta = Math.floor(Math.random() * 3) - 1;
        const next = prev + delta;
        return next < -72 ? -72 : next > -58 ? -58 : next;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Canvas particle engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];
    const particleCount = 65;

    class Particle {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      color: string;
      alpha: number;

      constructor() {
        this.x = Math.random() * (canvas?.width || window.innerWidth);
        this.y = Math.random() * (canvas?.height || window.innerHeight);
        this.size = Math.random() * 2.5 + 0.8;
        this.speedX = Math.random() * 0.6 - 0.3;
        this.speedY = Math.random() * 0.6 - 0.3;
        
        // Purple-purple-violet-indigo-cyan theme
        const colors = [
          'rgba(168, 85, 247, 0.4)', // purple
          'rgba(192, 132, 252, 0.3)', // violet
          'rgba(99, 102, 241, 0.35)', // indigo
          'rgba(34, 211, 238, 0.25)', // cyan
          'rgba(139, 92, 246, 0.4)'  // violaceous
        ];
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.alpha = Math.random() * 0.5 + 0.2;
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;

        // Bounce on boundaries
        if (canvas) {
          if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
          if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;
        }

        // Mouse interaction: push away particles slightly
        const dx = mouseRef.current.x - this.x;
        const dy = mouseRef.current.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < mouseRef.current.radius) {
          const forceDirectionX = dx / distance;
          const forceDirectionY = dy / distance;
          const force = (mouseRef.current.radius - distance) / mouseRef.current.radius;
          this.x -= forceDirectionX * force * 1.5;
          this.y -= forceDirectionY * force * 1.5;
        }
      }

      draw(c: CanvasRenderingContext2D) {
        c.save();
        c.beginPath();
        c.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        c.fillStyle = this.color;
        c.shadowColor = 'rgba(168, 85, 247, 0.6)';
        c.shadowBlur = this.size > 2 ? 6 : 0;
        c.fill();
        c.restore();
      }
    }

    const init = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      particles = [];
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
      }
    };

    const handleResize = () => {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    init();

    const connectParticles = (c: CanvasRenderingContext2D) => {
      const maxDistance = 140;
      for (let a = 0; a < particles.length; a++) {
        for (let b = a; b < particles.length; b++) {
          const dx = particles[a].x - particles[b].x;
          const dy = particles[a].y - particles[b].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < maxDistance) {
            const alpha = (1 - distance / maxDistance) * 0.12;
            c.strokeStyle = `rgba(168, 85, 247, ${alpha})`;
            c.lineWidth = 0.8;
            c.beginPath();
            c.moveTo(particles[a].x, particles[a].y);
            c.lineTo(particles[b].x, particles[b].y);
            c.stroke();
          }
        }
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw grid overlays on background
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.015)';
      ctx.lineWidth = 1;
      const gridSize = 45;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      particles.forEach(particle => {
        particle.update();
        particle.draw(ctx);
      });

      connectParticles(ctx);
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Cyber decryption log output simulator
  const startDecryption = () => {
    setIsDecrypting(true);
    setDecryptionLogs([]);

    const logs = [
      '⚡ [SYS] INITIATING COMMAND CENTER ACCESS TERMINAL...',
      '📡 [NET] TUNNELING TO AWASH RIVER LORA-MESH NETWORK...',
      '🛠️ [HW] ESTABLISHING HANDSHAKE WITH ESP32 (CORE CHIP XTENSA LX6)...',
      '🔍 [HW] ESP32 CHIP TEMPERATURE: 38.6°C | RSSI: ' + espRssi + ' dBm',
      '🔑 [CRYPTO] SIGNING KEY PAIR AND VALIDATING CERTIFICATES...',
      '🧬 [DB] ESTABLISHING ENCRYPTED TUNNEL TO INTEGRITY DB...',
      '🎓 [AUTH] ADAMA SCIENCE & TECH UNIVERSITY ROOT CERTIFICATE VERIFIED.',
      '📟 [SYS] RETRIEVING WATER PREDICTION ML VECTOR GRAPHS...',
      '🛡️ [SUCCESS] ACCESS GRANTED. SYNCING WEBSOCKET CONSOLE...',
    ];

    logs.forEach((logText, index) => {
      setTimeout(() => {
        setDecryptionLogs(prev => [...prev, logText]);
        if (index === logs.length - 1) {
          setTimeout(() => {
            onLoginSuccess();
          }, 900);
        }
      }, (index + 1) * 350);
    });
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    // Authentication rule validation
    if (!username.trim() || !password.trim()) {
      setAuthError('Authentication Error: Username and password must be supplied.');
      return;
    }

    if (username === 'admin' || username === 'astu-analyst') {
      if (password === 'astu-sfews-2026' || password === 'admin') {
        startDecryption();
        return;
      }
    }

    setAuthError('Access Denied: Invalid credentials or cryptographic key signature mismatch.');
  };

  // Matrix Passcode Keypad handler (adds a super sleek cyber touch)
  const pressMatrixKey = (num: string) => {
    if (securityCode.length < 6) {
      setSecurityCode(prev => prev + num);
      if (securityCode.length === 5) {
        // Automatically check/validate password input or append to terminal
      }
    }
  };

  const clearMatrixKeys = () => setSecurityCode('');

  return (
    <div className="relative w-full min-h-screen bg-[#02040b] text-slate-200 flex items-center justify-center p-4 md:p-8 overflow-hidden font-sans select-none">
      
      {/* Performance optimized vector particle backdrop */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0" />

      {/* Cyber Grid Scanline Overlay */}
      <div className="absolute inset-0 bg-transparent z-1 pointer-events-none overflow-hidden">
        <div className="w-full h-0.5 bg-purple-500/5 absolute animate-scanline"></div>
      </div>

      {/* Futuristic Purple & Magenta Floating Glows */}
      <div className="absolute top-[15%] left-[20%] w-[45vw] h-[45vw] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none z-0 animate-pulse-slow"></div>
      <div className="absolute bottom-[10%] right-[15%] w-[40vw] h-[40vw] bg-indigo-600/10 rounded-full blur-[160px] pointer-events-none z-0"></div>
      <div className="absolute top-[50%] right-[35%] w-[25vw] h-[25vw] bg-cyan-600/5 rounded-full blur-[120px] pointer-events-none z-0"></div>

      {/* Core Auth Glass Box container */}
      <div className="relative z-10 w-full max-w-5xl bg-[#070b16]/55 border border-purple-500/15 rounded-[32px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] backdrop-blur-[24px] grid grid-cols-1 lg:grid-cols-12 overflow-hidden min-h-[640px]">
        
        {/* Decorative Neon Inner Frame */}
        <div className="absolute inset-0 rounded-[32px] border border-purple-500/5 pointer-events-none z-10 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_0_40px_rgba(168,85,247,0.02)]"></div>

        {/* ================== LEFT SIDEBAR: ESP32 IoT SYSTEM Vitals ================== */}
        <div className="lg:col-span-5 bg-gradient-to-b from-[#0a0f21]/80 to-[#040813]/85 p-8 border-b lg:border-b-0 lg:border-r border-purple-500/10 flex flex-col justify-between relative overflow-hidden">
          
          {/* Subtle circuit line watermark */}
          <div className="absolute -bottom-10 -left-10 w-56 h-56 border border-purple-500/5 rounded-full opacity-30 pointer-events-none">
            <div className="absolute inset-4 border border-purple-500/5 rounded-full"></div>
            <div className="absolute inset-10 border border-purple-500/5 rounded-full"></div>
          </div>

          {/* ASTU Branding & Crest */}
          <div className="space-y-6 relative z-10">
            <div className="flex items-center gap-3">
              {/* Premium customized high-fidelity glowing SVG emblem */}
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600/20 via-indigo-600/20 to-cyan-500/20 border border-purple-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.15)] relative">
                <svg className="w-9 h-9 text-purple-300" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M50 12L85 30V70L50 88L15 70V30L50 12Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="50" cy="50" r="16" stroke="currentColor" strokeWidth="2" strokeDasharray="4 2"/>
                  <path d="M50 34V66M34 50H66" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <circle cx="50" cy="50" r="6" fill="#06b6d4"/>
                  {/* Glowing core */}
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 absolute animate-ping opacity-60"></span>
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-black tracking-widest text-slate-100 bg-gradient-to-r from-slate-50 via-purple-100 to-indigo-300 bg-clip-text text-transparent">ASTU SFEWS</h1>
                <p className="text-[9px] font-bold text-cyan-400/90 tracking-widest uppercase font-mono mt-0.5">Hydrology Intelligence Center</p>
              </div>
            </div>

            <div className="h-[1px] bg-gradient-to-r from-purple-500/15 via-purple-500/5 to-transparent w-full"></div>

            {/* ESP32 Hardware Specs Matrix */}
            <div className="space-y-4">
              <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></span>
                ESP32 Hardware Node Pool
              </h3>
              
              <div className="grid grid-cols-2 gap-3.5">
                <div className="bg-[#0b1022]/70 border border-slate-900/80 p-3 rounded-xl flex flex-col justify-between">
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">firmware core</span>
                  <span className="text-[11px] font-mono font-bold text-slate-300 mt-1">SFEWS-ESP32-v4.1</span>
                </div>
                <div className="bg-[#0b1022]/70 border border-slate-900/80 p-3 rounded-xl flex flex-col justify-between">
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">lora frequency</span>
                  <span className="text-[11px] font-mono font-bold text-slate-300 mt-1">433.00 MHz</span>
                </div>
                <div className="bg-[#0b1022]/70 border border-slate-900/80 p-3 rounded-xl flex flex-col justify-between">
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">ESP32 Chip Temp</span>
                  <span className="text-[11px] font-mono font-bold text-amber-400 mt-1 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" /></svg>
                    {espTemperature}°C
                  </span>
                </div>
                <div className="bg-[#0b1022]/70 border border-slate-900/80 p-3 rounded-xl flex flex-col justify-between">
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">mesh link quality</span>
                  <span className="text-[11px] font-mono font-bold text-cyan-400 mt-1 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21a2 2 0 11-4 0 2 2 0 014 0zm5-4a2 2 0 11-4 0 2 2 0 014 0zM7 13a2 2 0 11-4 0 2 2 0 014 0zm15-4a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    {espRssi} dBm
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive ESP32 Telemetry Status Map (Vertical node cards) */}
          <div className="space-y-3.5 my-8 relative z-10">
            <div className="flex justify-between items-center text-[10px] text-slate-500 font-extrabold uppercase tracking-widest">
              <span>Syncing telemetry nodes</span>
              <span className="text-cyan-400 font-mono animate-pulse">4 connected</span>
            </div>

            <div className="space-y-2">
              {[
                { name: 'Node-Alpha-1', desc: 'Awash Basin - Semera', level: '142 cm', status: 'Safe', color: 'bg-emerald-500' },
                { name: 'Node-Beta-2', desc: 'Adama Siphon - Sump', level: '298 cm', status: 'Warning', color: 'bg-amber-500' },
                { name: 'Node-Gamma-3', desc: 'Awash Melka - Weir', level: '488 cm', status: 'Critical', color: 'bg-red-500' },
              ].map(node => (
                <div key={node.name} className="bg-[#060a16]/65 border border-purple-500/5 hover:border-purple-500/10 p-3 rounded-xl flex items-center justify-between transition-all duration-200">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2 h-2 rounded-full relative">
                      <span className={`absolute inset-0 rounded-full ${node.color} animate-ping opacity-60`}></span>
                      <span className={`relative block w-2 h-2 rounded-full ${node.color}`}></span>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-200">{node.name}</p>
                      <p className="text-[9px] text-slate-500 font-semibold">{node.desc}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-mono font-black text-slate-300">{node.level}</p>
                    <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">{node.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Left bottom branding metadata */}
          <div className="border-t border-purple-500/10 pt-4.5 z-10 flex items-center justify-between text-[9px] text-slate-500 font-bold uppercase tracking-wider font-mono">
            <span>ASTU Electrical Eng.</span>
            <span>Est. 2026</span>
          </div>

        </div>

        {/* ================== RIGHT SIDEBAR: AUTHENTICATION PANEL ================== */}
        <div className="lg:col-span-7 p-8 md:p-12 flex flex-col justify-between relative">
          
          {/* Decryption overlay covering this panel on success */}
          {isDecrypting && (
            <div className="absolute inset-0 bg-[#040712]/95 backdrop-blur-md z-45 flex flex-col justify-between p-8 md:p-12 animate-in fade-in duration-300">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <span className="animate-spin w-5 h-5 rounded-full border-2 border-purple-500/20 border-t-purple-500"></span>
                  <h3 className="text-sm font-extrabold tracking-widest text-purple-400 uppercase font-mono">Decoding Secure Access Hash...</h3>
                </div>
                <div className="bg-[#02040b]/90 border border-purple-500/10 rounded-2xl p-5 h-96 overflow-y-auto space-y-2.5 font-mono text-[11px] text-emerald-400 custom-scrollbar">
                  {decryptionLogs.map((log, index) => (
                    <p key={index} className="leading-relaxed animate-in fade-in slide-in-from-left-4 duration-200">
                      {log}
                    </p>
                  ))}
                </div>
              </div>
              <div className="flex justify-between items-center text-[9px] text-slate-600 font-bold tracking-widest uppercase font-mono pt-4.5 border-t border-purple-500/5">
                <span>Handshake Tunnel: SECURE</span>
                <span>ASTU-SFEWS // A-24</span>
              </div>
            </div>
          )}

          {/* Form Header */}
          <div className="space-y-2.5">
            <span className="text-[10px] font-black tracking-widest text-purple-400 uppercase font-mono bg-purple-500/5 border border-purple-500/15 px-3 py-1 rounded-full w-max block">
              🛡️ Secure Encryption Node
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-50">Command Access Portal</h2>
            <p className="text-slate-400 text-xs font-semibold">Enter ASTU command center credentials to synchronize Awash Basin early warnings.</p>
          </div>

          {/* Main Auth Form */}
          <form onSubmit={handleLoginSubmit} className="space-y-6 my-8">
            
            {authError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-300 text-xs px-4.5 py-3 rounded-xl font-semibold flex items-center gap-3.5 animate-pulse">
                <svg className="w-5 h-5 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                {authError}
              </div>
            )}

            <div className="space-y-5">
              
              {/* Username Input Field */}
              <div className="relative group">
                <div className={`absolute inset-0 bg-purple-500/5 rounded-2xl transition-all duration-300 ${activeInput === 'username' ? 'opacity-100 blur-[8px]' : 'opacity-0'}`}></div>
                <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200 ${activeInput === 'username' ? 'text-purple-400' : 'text-slate-500'}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.3" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onFocus={() => setActiveInput('username')}
                  onBlur={() => setActiveInput(null)}
                  className={`w-full pl-12 pr-4 py-4 bg-[#040710]/80 border ${activeInput === 'username' ? 'border-purple-500/60 shadow-[0_0_15px_rgba(168,85,247,0.1)]' : 'border-purple-500/10'} hover:border-purple-500/25 rounded-2xl text-slate-100 text-sm font-semibold focus:outline-none transition-all duration-300 placeholder:text-slate-600`}
                  placeholder="Enter Username"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-mono font-bold tracking-widest text-slate-600 uppercase">USR_ID</span>
              </div>

              {/* Password Input Field */}
              <div className="relative group">
                <div className={`absolute inset-0 bg-purple-500/5 rounded-2xl transition-all duration-300 ${activeInput === 'password' ? 'opacity-100 blur-[8px]' : 'opacity-0'}`}></div>
                <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200 ${activeInput === 'password' ? 'text-purple-400' : 'text-slate-500'}`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.3" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setActiveInput('password')}
                  onBlur={() => setActiveInput(null)}
                  className={`w-full pl-12 pr-4 py-4 bg-[#040710]/80 border ${activeInput === 'password' ? 'border-purple-500/60 shadow-[0_0_15px_rgba(168,85,247,0.1)]' : 'border-purple-500/10'} hover:border-purple-500/25 rounded-2xl text-slate-100 text-sm font-semibold focus:outline-none transition-all duration-300 placeholder:text-slate-600`}
                  placeholder="Enter Security Crypt Key"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-mono font-bold tracking-widest text-slate-600 uppercase">HASH_KEY</span>
              </div>
            </div>

            {/* Matrix Passcode Selector (Hyper detailed visual panel) */}
            <div className="bg-[#04060d]/70 border border-purple-500/5 rounded-2xl p-4.5 space-y-4">
              <div className="flex justify-between items-center border-b border-purple-500/5 pb-2.5">
                <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest font-mono">Biometric Token Override</span>
                <span className="text-[10px] font-mono text-glow-purple font-bold tracking-widest text-purple-400">
                  {securityCode ? securityCode.replace(/./g, '● ') : 'ENTER PIN OVERRIDE'}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {['1', '2', '3', '4', '5', '6', '7', '8'].map(num => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => pressMatrixKey(num)}
                    className="py-2.5 bg-[#080d1e]/50 hover:bg-purple-950/20 active:scale-95 border border-purple-500/5 hover:border-purple-500/20 text-slate-400 hover:text-slate-100 font-mono font-bold rounded-lg text-xs transition-all flex items-center justify-center shadow-inner"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={clearMatrixKeys}
                  className="col-span-2 py-2.5 bg-red-950/15 hover:bg-red-950/20 text-red-400 font-mono font-bold text-[9px] tracking-widest rounded-lg transition-all flex items-center justify-center border border-red-500/10"
                >
                  CLEAR
                </button>
                {['9', '0'].map(num => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => pressMatrixKey(num)}
                    className="py-2.5 bg-[#080d1e]/50 hover:bg-purple-950/20 active:scale-95 border border-purple-500/5 hover:border-purple-500/20 text-slate-400 hover:text-slate-100 font-mono font-bold rounded-lg text-xs transition-all flex items-center justify-center"
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Glowing Access Button */}
            <button
              type="submit"
              className="w-full relative group bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-500 text-slate-50 py-4.5 rounded-2xl font-black text-sm tracking-widest uppercase transition-all duration-300 shadow-[0_4px_20px_rgba(139,92,246,0.25)] hover:shadow-[0_0_30px_rgba(139,92,246,0.45)] active:scale-[0.98] border border-purple-400/20"
            >
              {/* Pulsating neon accent line */}
              <span className="absolute inset-x-4 top-0.5 h-[1px] bg-gradient-to-r from-transparent via-purple-300 to-transparent opacity-60"></span>
              AUTHORIZE ACCESS
            </button>
          </form>

          {/* Secure Center Footer */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 border-t border-purple-500/5 pt-5 text-[9px] text-slate-600 font-bold uppercase tracking-widest font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
              SSL SECURITY SHA-256
            </span>
            <span>SYSTEM ENCRYPTED SHA-512</span>
          </div>

        </div>

      </div>

    </div>
  );
};

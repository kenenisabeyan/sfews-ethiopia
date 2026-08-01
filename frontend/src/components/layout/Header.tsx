import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchHealth } from '../../services/api';
import type { SystemHealth } from '../../types';

interface HeaderProps {
  isWsConnected: boolean;
}

const Header: React.FC<HeaderProps> = ({ isWsConnected }) => {
  const { user, logout } = useAuth();
  const [health, setHealth] = useState<SystemHealth | null>(null);

  useEffect(() => {
    fetchHealth()
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  const isApiOnline = health?.database_connection === 'Active';

  return (
    <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 border-b border-slate-800/60 pb-6 gap-6">
      {/* Left — Branding */}
      <div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent drop-shadow-md">
          SFEWS Command Center
        </h1>
        <p className="text-slate-400 mt-2 text-sm md:text-base font-medium tracking-wide">
          Awash River Basin — IoT &amp; Machine Learning Framework
        </p>
      </div>

      {/* Right — Status indicators + User */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* WebSocket status */}
        <div className="flex items-center gap-2 bg-[#090d16] border border-slate-800 px-4 py-2 rounded-full">
          <div className="relative flex h-2.5 w-2.5">
            {isWsConnected ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </>
            ) : (
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500 animate-pulse" />
            )}
          </div>
          <span className="text-xs font-bold tracking-widest text-slate-400 uppercase">
            {isWsConnected ? 'Live' : 'Reconnecting'}
          </span>
        </div>

        {/* API status */}
        <div className="flex items-center gap-2 bg-[#090d16] border border-slate-800 px-4 py-2 rounded-full">
          <div className="relative flex h-2.5 w-2.5">
            {isApiOnline ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </>
            ) : (
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
            )}
          </div>
          <span className="text-xs font-bold tracking-widest text-slate-400 uppercase">
            API {isApiOnline ? 'Online' : 'Offline'}
          </span>
        </div>

        {/* User menu */}
        {user && (
          <div className="flex items-center gap-3 bg-[#090d16] border border-slate-800 px-4 py-2 rounded-full">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-xs font-black text-white">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs font-bold text-slate-300 tracking-wide hidden sm:inline">
              {user.name}
            </span>
            <button
              onClick={logout}
              className="text-xs text-slate-500 hover:text-red-400 font-bold uppercase tracking-wider transition-colors ml-1"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;

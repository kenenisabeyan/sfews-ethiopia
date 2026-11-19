import React from 'react';
import { WeatherInfo } from '../types';

interface WeatherPanelProps {
  weather: WeatherInfo;
}

export const WeatherPanel: React.FC<WeatherPanelProps> = ({ weather }) => {
  const getWeatherIcon = (cond: string, size = 'w-12 h-12') => {
    switch (cond) {
      case 'Rainy':
        return (
          <svg className={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707-.707" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 17.58A5 5 0 0018 8h-1.264A6.978 6.978 0 0013 5.07c-3.554 0-6.502 2.635-6.94 6.1A4.5 4.5 0 006 20h12a4.5 4.5 0 002-2.42z" fill="#38bdf8" opacity="0.3" />
            <path strokeLinecap="round" d="M9 18v2m3-2v3m3-3v2" stroke="#38bdf8" />
          </svg>
        );
      case 'Stormy':
        return (
          <svg className={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 17.58A5 5 0 0018 8h-1.264A6.978 6.978 0 0013 5.07c-3.554 0-6.502 2.635-6.94 6.1A4.5 4.5 0 006 20h12a4.5 4.5 0 002-2.42z" fill="#475569" opacity="0.3" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10l-3 4h3v4l3-4h-3v-4z" stroke="#f59e0b" fill="#f59e0b" />
          </svg>
        );
      case 'Cloudy':
        return (
          <svg className={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 17.58A5 5 0 0018 8h-1.264A6.978 6.978 0 0013 5.07c-3.554 0-6.502 2.635-6.94 6.1A4.5 4.5 0 006 20h12a4.5 4.5 0 002-2.42z" fill="#64748b" opacity="0.3" />
          </svg>
        );
      case 'Sunny':
      default:
        return (
          <svg className={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="5" fill="#f59e0b" opacity="0.3" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41m12.72-12.72l1.41-1.41" stroke="#f59e0b" />
          </svg>
        );
    }
  };

  return (
    <div className="w-full glass-panel-premium rounded-2xl sm:rounded-3xl p-4 sm:p-6 relative overflow-hidden flex flex-col h-full shadow-2xl transition-all duration-300">
      <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 dark:bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 z-10 gap-3 border-b border-slate-200 dark:border-slate-800/60 pb-3 sm:pb-4">
        <div>
          <h2 className="text-sm sm:text-base font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2">
            <span>🌍</span> Atmospheric Climate Telemetry
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
            Hydrological Basin Radar & Regional Weather Indicators
          </p>
        </div>
        <div className="bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 px-3.5 py-1.5 rounded-xl text-[9px] sm:text-[10px] font-mono text-slate-600 dark:text-slate-400 self-start sm:self-auto shadow-sm">
          BAROMETER: <span className="text-cyan-600 dark:text-cyan-400 font-black">1013 hPa</span> (STABLE)
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 items-stretch z-10">
        
        {/* Real-time Condition Card */}
        <div className="lg:col-span-1 glass-panel-interactive rounded-2xl p-4 sm:p-6 flex flex-col justify-between relative overflow-hidden min-h-0 sm:min-h-[220px]">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 dark:from-indigo-950/45 via-transparent to-purple-500/5 pointer-events-none"></div>
          
          <div className="relative z-10">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-slate-100 font-mono tracking-tight">
                  {weather.temp}°C
                </h3>
                <p className="text-purple-600 dark:text-[#c084fc] font-extrabold text-xs uppercase tracking-wider mt-1">
                  {weather.condition} Conditions
                </p>
              </div>
              <div className="drop-shadow-md">{getWeatherIcon(weather.condition as any, 'w-12 h-12 sm:w-14 sm:h-14')}</div>
            </div>
            
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-3 sm:mt-4 font-semibold flex items-center gap-1.5">
              <span>📍</span> {weather.location}
            </p>
          </div>

          <div className="relative z-10 grid grid-cols-3 gap-2 border-t border-slate-200 dark:border-indigo-950/40 pt-3 sm:pt-4 mt-4 sm:mt-6 text-center font-mono text-[9px]">
            <div className="bg-slate-100/80 dark:bg-slate-950/50 p-2 sm:p-2.5 rounded-xl border border-slate-200 dark:border-slate-900">
              <span className="text-slate-500 dark:text-slate-400 uppercase font-bold text-[8px] sm:text-[9px]">HUMIDITY</span>
              <div className="text-slate-800 dark:text-slate-200 font-black text-xs sm:text-sm mt-0.5">{weather.humidity}%</div>
            </div>
            <div className="bg-slate-100/80 dark:bg-slate-950/50 p-2 sm:p-2.5 rounded-xl border border-slate-200 dark:border-slate-900">
              <span className="text-slate-500 dark:text-slate-400 uppercase font-bold text-[8px] sm:text-[9px]">WIND</span>
              <div className="text-slate-800 dark:text-slate-200 font-black text-xs sm:text-sm mt-0.5">{weather.windSpeed} km/h</div>
            </div>
            <div className="bg-slate-100/80 dark:bg-slate-950/50 p-2 sm:p-2.5 rounded-xl border border-slate-200 dark:border-slate-900">
              <span className="text-slate-500 dark:text-slate-400 uppercase font-bold text-[8px] sm:text-[9px]">RAIN 24H</span>
              <div className="text-cyan-600 dark:text-cyan-400 font-black text-xs sm:text-sm mt-0.5">{weather.rainfall24h} in</div>
            </div>
          </div>
        </div>

        {/* 7-Day Regional Hydrological Forecast */}
        <div className="lg:col-span-2 glass-panel-interactive rounded-2xl p-4 sm:p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-2.5 sm:pb-3 mb-3 sm:mb-4">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest font-mono">
              7-Day Regional Hydrological Forecast
            </h4>
            <span className="text-[9px] font-mono font-bold text-emerald-600 dark:text-emerald-400 uppercase bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              ● Synced Live
            </span>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 sm:gap-3.5">
            {weather.forecast.map((fc, idx) => (
              <div
                key={fc.day + idx}
                className="bg-slate-100/70 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-900 hover:border-purple-500/40 hover:bg-white dark:hover:bg-slate-900/40 p-2.5 sm:p-3.5 rounded-xl flex flex-col items-center justify-between text-center transition-all duration-200 shadow-sm hover:shadow"
              >
                <span className="text-[10px] font-extrabold text-slate-600 dark:text-slate-400 font-mono uppercase">{fc.day}</span>
                <div className="my-1.5 sm:my-2.5 drop-shadow-sm">{getWeatherIcon(fc.condition, 'w-7 h-7 sm:w-8 sm:h-8')}</div>
                <div className="text-[10px] font-mono font-bold space-y-0.5">
                  <div className="text-slate-900 dark:text-slate-200">{fc.tempMax}°C</div>
                  <div className="text-slate-500 dark:text-slate-500">{fc.tempMin}°C</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

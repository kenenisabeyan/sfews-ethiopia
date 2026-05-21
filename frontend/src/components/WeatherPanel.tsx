import React from 'react';
import { WeatherInfo } from '../types/types';

interface WeatherPanelProps {
  weather: WeatherInfo;
}

export const WeatherPanel: React.FC<WeatherPanelProps> = ({ weather }) => {
  // SVG weather icons
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
    <div className="w-full bg-[#0b0f19] border border-slate-800/80 rounded-2xl p-6 relative overflow-hidden flex flex-col h-full shadow-2xl">
      {/* Decorative layout elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 z-10 gap-3 border-b border-slate-800/60 pb-4">
        <div>
          <h2 className="text-base font-bold text-slate-100 uppercase tracking-widest flex items-center gap-2">
            🌍 Atmospheric Climate Telemetry
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Hydrological and Weather Station Indicators</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 px-3.5 py-1.5 rounded-lg text-[10px] font-mono text-slate-400">
          BAROMETER: <span className="text-cyan-400 font-bold">1013 hPa</span> (STABLE)
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch z-10">
        
        {/* Core Local Climate status card */}
        <div className="lg:col-span-1 bg-gradient-to-br from-indigo-950/45 to-[#080c14] border border-indigo-500/15 rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden min-h-[220px]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.06),transparent)] pointer-events-none"></div>
          
          <div>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-2xl font-black text-slate-100 font-mono tracking-tight">
                  {weather.temp}°C
                </h3>
                <p className="text-[#c084fc] font-bold text-xs uppercase tracking-wider mt-0.5">
                  {weather.condition} Conditions
                </p>
              </div>
              <div>{getWeatherIcon(weather.condition as any, 'w-14 h-14')}</div>
            </div>
            
            <p className="text-xs text-slate-400 mt-4 font-medium flex items-center gap-1.5">
              <span>📍</span> {weather.location}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 border-t border-indigo-950/40 pt-4 mt-6 text-center font-mono text-[9px]">
            <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-900">
              <span className="text-slate-500 uppercase font-semibold">HUMIDITY</span>
              <div className="text-slate-200 font-bold text-xs mt-0.5">{weather.humidity}%</div>
            </div>
            <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-900">
              <span className="text-slate-500 uppercase font-semibold">WIND</span>
              <div className="text-slate-200 font-bold text-xs mt-0.5">{weather.windSpeed} km/h</div>
            </div>
            <div className="bg-slate-950/50 p-2 rounded-lg border border-slate-900">
              <span className="text-slate-500 uppercase font-semibold">RAIN 24H</span>
              <div className="text-cyan-400 font-bold text-xs mt-0.5">{weather.rainfall24h} in</div>
            </div>
          </div>
        </div>

        {/* 7-Day Forecast Grid */}
        <div className="lg:col-span-2 bg-[#080c14] border border-slate-900 rounded-2xl p-6 flex flex-col justify-between">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-widest border-b border-slate-900 pb-3 mb-4">
            7-Day Regional Hydrological Forecast
          </h4>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3.5">
            {weather.forecast.map((fc, idx) => (
              <div
                key={fc.day + idx}
                className="bg-slate-950/40 border border-slate-900 hover:border-slate-850 hover:bg-slate-900/10 p-3.5 rounded-xl flex flex-col items-center justify-between text-center transition-all duration-200"
              >
                <span className="text-[10px] font-bold text-slate-400 font-mono uppercase">{fc.day}</span>
                <div className="my-2.5">{getWeatherIcon(fc.condition, 'w-8 h-8')}</div>
                <div className="text-[10px] font-mono font-bold space-y-0.5">
                  <div className="text-slate-200">{fc.tempMax}°C</div>
                  <div className="text-slate-500">{fc.tempMin}°C</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

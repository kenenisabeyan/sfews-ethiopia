import React, { useState } from 'react';

interface SettingsPanelProps {
  criticalThreshold: number;
  warningThreshold: number;
  radiusKm: number;
  setCriticalThreshold: (val: number) => void;
  setWarningThreshold: (val: number) => void;
  setRadiusKm: (val: number) => void;
  saveSettings: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  criticalThreshold,
  warningThreshold,
  radiusKm,
  setCriticalThreshold,
  setWarningThreshold,
  setRadiusKm,
  saveSettings,
}) => {
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const handleSave = () => {
    saveSettings();
    setSavedMessage('Hydrological thresholds updated & synced successfully!');
    setTimeout(() => setSavedMessage(null), 3000);
  };

  return (
    <div className="glass-panel-premium rounded-2xl sm:rounded-3xl p-4 sm:p-8 max-w-3xl mx-auto space-y-6 sm:space-y-8 shadow-2xl transition-all duration-300">
      <div className="border-b border-slate-200 dark:border-slate-800/60 pb-4 sm:pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100 tracking-wide uppercase flex items-center gap-2">
            <span>⚙️</span> Early Warning System Configurations
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-bold uppercase tracking-wider">
            Calibrate hydrometric threshold parameters for flood classification algorithms
          </p>
        </div>
        <span className="text-[9px] font-mono font-bold uppercase px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 self-start sm:self-auto">
          Awash Calibration Standard
        </span>
      </div>

      <div className="space-y-6 sm:space-y-7">
        {/* Critical Threshold */}
        <div className="glass-panel-interactive p-4 sm:p-5 rounded-2xl space-y-3">
          <div className="flex justify-between items-center font-bold text-xs">
            <label className="text-slate-700 dark:text-slate-300 uppercase tracking-widest text-[11px] sm:text-xs flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
              Critical Water Level Threshold
            </label>
            <span className="font-mono text-red-600 dark:text-red-400 font-black text-sm bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-lg">
              {criticalThreshold} cm
            </span>
          </div>
          <input
            type="range"
            min="350"
            max="600"
            value={criticalThreshold}
            onChange={(e) => setCriticalThreshold(parseInt(e.target.value))}
            className="w-full accent-red-500 bg-slate-200 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-full h-2.5 appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-[9px] font-mono text-slate-400">
            <span>350 cm</span>
            <span>600 cm</span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
            If river depth surpasses this setting, telemetry anchor classification automatically triggers the "Critical" alarm state.
          </p>
        </div>

        {/* Warning Threshold */}
        <div className="glass-panel-interactive p-4 sm:p-5 rounded-2xl space-y-3">
          <div className="flex justify-between items-center font-bold text-xs">
            <label className="text-slate-700 dark:text-slate-300 uppercase tracking-widest text-[11px] sm:text-xs flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              Warning Water Level Threshold
            </label>
            <span className="font-mono text-amber-600 dark:text-amber-400 font-black text-sm bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-lg">
              {warningThreshold} cm
            </span>
          </div>
          <input
            type="range"
            min="200"
            max="349"
            value={warningThreshold}
            onChange={(e) => setWarningThreshold(parseInt(e.target.value))}
            className="w-full accent-amber-500 bg-slate-200 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-full h-2.5 appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-[9px] font-mono text-slate-400">
            <span>200 cm</span>
            <span>349 cm</span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
            If river depth surpasses this setting, telemetry anchor node classification transitions to the "Warning" advisory stage.
          </p>
        </div>

        {/* Proximity Broadcast Radius */}
        <div className="glass-panel-interactive p-4 sm:p-5 rounded-2xl space-y-3">
          <div className="flex justify-between items-center font-bold text-xs">
            <label className="text-slate-700 dark:text-slate-300 uppercase tracking-widest text-[11px] sm:text-xs flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
              Proximity Broadcast Alert Radius
            </label>
            <span className="font-mono text-indigo-600 dark:text-indigo-400 font-black text-sm bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-lg">
              {radiusKm} KM
            </span>
          </div>
          <input
            type="range"
            min="5"
            max="50"
            value={radiusKm}
            onChange={(e) => setRadiusKm(parseInt(e.target.value))}
            className="w-full accent-indigo-500 bg-slate-200 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-full h-2.5 appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-[9px] font-mono text-slate-400">
            <span>5 KM</span>
            <span>50 KM</span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
            Defines the geographical Haversine coverage radius for registered SMS subscriber notifications upon emergency alert broadcast.
          </p>
        </div>
      </div>

      <div className="pt-4 sm:pt-6 border-t border-slate-200 dark:border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div>
          {savedMessage && (
            <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 animate-in fade-in">
              <span>✓</span> {savedMessage}
            </span>
          )}
        </div>

        <button
          onClick={handleSave}
          className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white px-7 py-3 rounded-xl sm:rounded-2xl font-black text-xs tracking-wider uppercase transition-all shadow-md shadow-indigo-600/20 active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <span>💾</span>
          <span>Save & Deploy Thresholds</span>
        </button>
      </div>
    </div>
  );
};

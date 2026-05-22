import React from 'react';

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
  return (
    <div className="glass-panel rounded-3xl p-7 max-w-3xl mx-auto space-y-8">
      <div className="border-b border-slate-900/60 pb-6">
        <h2 className="text-lg font-extrabold text-slate-100 tracking-wide uppercase">
          Early Warning System Configurations
        </h2>
        <p className="text-xs text-slate-500 mt-0.5 font-bold uppercase tracking-wider">
          Configure threshold parameters for flood classification algorithms
        </p>
      </div>

      <div className="space-y-6">
        <div className="space-y-3">
          <div className="flex justify-between font-bold text-xs">
            <label className="text-slate-400 uppercase tracking-widest">
              Critical Water Level Threshold
            </label>
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
            If river depth surpasses this setting, the telemetry anchor node classification
            automatically transitions to "Critical".
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between font-bold text-xs">
            <label className="text-slate-400 uppercase tracking-widest">
              Warning Water Level Threshold
            </label>
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
            If river depth surpasses this setting, the telemetry anchor node classification
            transitions to "Warning".
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between font-bold text-xs">
            <label className="text-slate-400 uppercase tracking-widest">
              Proximity Broadcast Alert Radius
            </label>
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
            Defines the geographical coverage threshold for registered SMS subscriber notifications
            upon manual early warning broadcast execution.
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
  );
};

import React from 'react';
import { X, RotateCcw, Sliders, Check } from 'lucide-react';
import { SimulationState, CIStrategy, CurrentSpread } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: SimulationState;
  onUpdateState: (updates: Partial<SimulationState>) => void;
  onResetToDefaults: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  state,
  onUpdateState,
  onResetToDefaults,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Laboratory Simulation Settings</h3>
              <p className="text-xs text-slate-500">Configure research pipeline and hardware simulation parameters.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-4 text-xs">
          {/* CI Channel Count */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1.5">
              Cochlear Implant Channels (Active Electrodes)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {([8, 12, 16, 22] as const).map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => onUpdateState({ ciChannels: num })}
                  className={`py-2 rounded-lg font-mono text-center border font-semibold transition-all ${
                    state.ciChannels === num
                      ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {num} Channels
                </button>
              ))}
            </div>
          </div>

          {/* CI Strategy */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1.5">
              Sound Coding Strategy
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['ACE', 'CIS', 'HiRes120', 'FSP'] as CIStrategy[]).map((strat) => (
                <button
                  key={strat}
                  type="button"
                  onClick={() => onUpdateState({ ciStrategy: strat })}
                  className={`py-2 rounded-lg font-mono text-center border font-semibold transition-all ${
                    state.ciStrategy === strat
                      ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {strat}
                </button>
              ))}
            </div>
          </div>

          {/* Current Spread Model */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1.5">
              Intracochlear Current Spread (Channel Interaction)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['Low', 'Medium', 'High'] as CurrentSpread[]).map((spread) => (
                <button
                  key={spread}
                  type="button"
                  onClick={() => onUpdateState({ currentSpread: spread })}
                  className={`py-2 rounded-lg text-center border font-semibold transition-all ${
                    state.currentSpread === spread
                      ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {spread}
                </button>
              ))}
            </div>
          </div>

          {/* Simulation Duration */}
          <div className="grid grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Loop Duration (seconds)
              </label>
              <select
                value={state.duration}
                onChange={(e) => onUpdateState({ duration: parseFloat(e.target.value) })}
                className="w-full py-1.5 px-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs font-medium"
              >
                <option value="5">5.0 seconds (Default)</option>
                <option value="10">10.0 seconds</option>
                <option value="15">15.0 seconds</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Visual Landmark Smoothing
              </label>
              <select
                defaultValue="Kalman Filter (Adaptive)"
                className="w-full py-1.5 px-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs font-medium"
              >
                <option>Kalman Filter (Adaptive)</option>
                <option>One Euro Filter</option>
                <option>Raw Kinematic Spline</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <button
            onClick={onResetToDefaults}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Standard Benchmark</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Apply Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};

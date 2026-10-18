import React from 'react';
import { Settings2 } from 'lucide-react';
import { SimulationState, SoundType, BackgroundNoise, ProcessingMode } from '../types';

interface InputSettingsProps {
  state: SimulationState;
  onUpdateState: (updates: Partial<SimulationState>) => void;
}

export const InputSettingsPanel: React.FC<InputSettingsProps> = ({
  state,
  onUpdateState,
}) => {
  const soundTypes: SoundType[] = [
    'Speech (Male)',
    'Speech (Female)',
    'Child Speech',
    'Multiple Speech',
    'Continuous Speech',
  ];

  const noiseTypes: BackgroundNoise[] = [
    'Restaurant Noise',
    'Street Noise',
    'Car Noise',
    'Crowd Noise',
    'Office Noise',
    'Clean',
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-6 h-6 rounded-md bg-purple-100 text-purple-600 flex items-center justify-center">
          <Settings2 className="w-3.5 h-3.5" />
        </div>
        <h3 className="text-sm font-bold text-slate-900">Input Settings</h3>
      </div>
      <p className="text-xs text-slate-500 mb-4">
        Configure audio and visual input conditions.
      </p>

      <div className="space-y-3.5 text-xs">
        {/* Sound Type */}
        <div className="flex items-center justify-between gap-3">
          <label className="text-slate-600 font-medium shrink-0">Sound Type</label>
          <select
            value={state.soundType}
            onChange={(e) => onUpdateState({ soundType: e.target.value as SoundType })}
            className="w-44 py-1.5 px-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs font-medium focus:outline-hidden focus:border-purple-500 shadow-2xs"
          >
            {soundTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Background Noise */}
        <div className="flex items-center justify-between gap-3">
          <label className="text-slate-600 font-medium shrink-0">Background Noise</label>
          <select
            value={state.backgroundNoise}
            onChange={(e) => onUpdateState({ backgroundNoise: e.target.value as BackgroundNoise })}
            className="w-44 py-1.5 px-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs font-medium focus:outline-hidden focus:border-purple-500 shadow-2xs"
          >
            {noiseTypes.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        {/* SNR Slider */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-slate-600 font-medium">SNR (dB)</label>
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-[11px] font-semibold">
              {state.snr > 0 ? `+${state.snr}` : state.snr} dB
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 font-mono">-10</span>
            <input
              type="range"
              min="-10"
              max="20"
              step="1"
              value={state.snr}
              onChange={(e) => onUpdateState({ snr: parseInt(e.target.value, 10) })}
              className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
            />
            <span className="text-[10px] text-slate-400 font-mono">20</span>
          </div>
        </div>

        {/* Visual Quality Slider */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-slate-600 font-medium">Visual Quality</label>
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-[11px] font-semibold">
              {state.visualQuality}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 font-mono">0</span>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={state.visualQuality}
              onChange={(e) => onUpdateState({ visualQuality: parseInt(e.target.value, 10) })}
              className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
            />
            <span className="text-[10px] text-slate-400 font-mono">100</span>
          </div>
        </div>

        {/* Lip Tracking Toggle */}
        <div className="flex items-center justify-between pt-1">
          <label className="text-slate-600 font-medium">Lip Tracking</label>
          <button
            type="button"
            onClick={() => onUpdateState({ lipTracking: !state.lipTracking })}
            className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
              state.lipTracking ? 'bg-purple-600' : 'bg-slate-300'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                state.lipTracking ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Processing Mode: Segmented Buttons */}
        <div className="pt-2">
          <label className="block text-slate-600 font-medium mb-1.5">Processing Mode</label>
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => onUpdateState({ processingMode: 'Audio Only' })}
              className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                state.processingMode === 'Audio Only'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Audio Only
            </button>
            <button
              type="button"
              onClick={() => onUpdateState({ processingMode: 'Audio + Visual' })}
              className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                state.processingMode === 'Audio + Visual'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Audio + Visual
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { FlaskConical, Play, Check, Download, Copy, Bookmark, RefreshCw, BarChart3 } from 'lucide-react';
import { SimulationState, SavedExperiment, SimulationMetrics } from '../types';
import { calculateMetrics } from '../services/simulationEngine';

interface ExperimentsProps {
  state: SimulationState;
  savedExperiments: SavedExperiment[];
  onSaveExperiment: (exp: SavedExperiment) => void;
  onApplyExperiment: (expState: SimulationState) => void;
}

export const ExperimentsPage: React.FC<ExperimentsProps> = ({
  state,
  savedExperiments,
  onSaveExperiment,
  onApplyExperiment,
}) => {
  const [expName, setExpName] = useState('Experiment #104: Low SNR Babble');
  const [isRunning, setIsRunning] = useState(false);
  const [runStage, setRunStage] = useState<number>(0);
  const [lastResult, setLastResult] = useState<{ metrics: SimulationMetrics; expState: SimulationState } | null>(null);

  // Form parameters
  const [formState, setFormState] = useState<SimulationState>({ ...state });

  const stages = [
    'Input Validation',
    'Audio Spectral Analysis',
    'Visual Kinematic Tracking',
    'Cross-Modal Fusion',
    'CI Channel Sound Coding',
    'Benchmark Psychometric Evaluation',
  ];

  const handleRunExperiment = () => {
    setIsRunning(true);
    setRunStage(0);

    const interval = setInterval(() => {
      setRunStage((prev) => {
        if (prev >= stages.length - 1) {
          clearInterval(interval);
          setIsRunning(false);
          const computed = calculateMetrics(formState);
          setLastResult({ metrics: computed, expState: { ...formState } });
          return stages.length;
        }
        return prev + 1;
      });
    }, 450);
  };

  const handleSaveCurrent = () => {
    if (!lastResult) return;
    const newExp: SavedExperiment = {
      id: `exp-${Date.now()}`,
      name: expName,
      timestamp: new Date().toLocaleString(),
      state: lastResult.expState,
      metrics: lastResult.metrics,
      notes: `SNR: ${lastResult.expState.snr} dB, Mode: ${lastResult.expState.processingMode}, Score: ${lastResult.metrics.speechRecognitionScore}`,
    };
    onSaveExperiment(newExp);
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Experiment Builder & Parameter Sweep Suite
          </h1>
          <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-bold tracking-wide">
            EXPERIMENT BENCHMARK
          </span>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Design reproducible multimodal CI trials, benchmark psychometric curves, and log comparative results.
        </p>
      </div>

      {/* Grid: Form (Left) + Execution & Results (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Experiment Builder Form */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4 text-xs">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <FlaskConical className="w-4 h-4 text-purple-600" />
            <h3 className="text-sm font-bold text-slate-900">New Experiment Parameters</h3>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Experiment Label</label>
            <input
              type="text"
              value={expName}
              onChange={(e) => setExpName(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 font-medium mb-1">Sound Type</label>
              <select
                value={formState.soundType}
                onChange={(e) => setFormState({ ...formState, soundType: e.target.value as any })}
                className="w-full py-1.5 px-2 bg-white border border-slate-200 rounded-lg"
              >
                <option>Speech (Male)</option>
                <option>Speech (Female)</option>
                <option>Child Speech</option>
                <option>Multiple Speech</option>
                <option>Continuous Speech</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">Background Noise</label>
              <select
                value={formState.backgroundNoise}
                onChange={(e) => setFormState({ ...formState, backgroundNoise: e.target.value as any })}
                className="w-full py-1.5 px-2 bg-white border border-slate-200 rounded-lg"
              >
                <option>Restaurant Noise</option>
                <option>Street Noise</option>
                <option>Car Noise</option>
                <option>Crowd Noise</option>
                <option>Office Noise</option>
                <option>Clean</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-slate-600 font-medium">SNR (dB)</label>
                <span className="font-mono font-bold">{formState.snr} dB</span>
              </div>
              <input
                type="range"
                min="-10"
                max="20"
                value={formState.snr}
                onChange={(e) => setFormState({ ...formState, snr: parseInt(e.target.value, 10) })}
                className="w-full h-1.5 bg-slate-200 rounded-lg accent-purple-600"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <label className="text-slate-600 font-medium">Visual Quality</label>
                <span className="font-mono font-bold">{formState.visualQuality}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={formState.visualQuality}
                onChange={(e) => setFormState({ ...formState, visualQuality: parseInt(e.target.value, 10) })}
                className="w-full h-1.5 bg-slate-200 rounded-lg accent-purple-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 font-medium mb-1">Processing Mode</label>
              <select
                value={formState.processingMode}
                onChange={(e) => setFormState({ ...formState, processingMode: e.target.value as any })}
                className="w-full py-1.5 px-2 bg-white border border-slate-200 rounded-lg"
              >
                <option>Audio + Visual</option>
                <option>Audio Only</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">CI Sound Coding Strategy</label>
              <select
                value={formState.ciStrategy}
                onChange={(e) => setFormState({ ...formState, ciStrategy: e.target.value as any })}
                className="w-full py-1.5 px-2 bg-white border border-slate-200 rounded-lg"
              >
                <option>ACE</option>
                <option>CIS</option>
                <option>HiRes120</option>
                <option>FSP</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleRunExperiment}
            disabled={isRunning}
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 text-sm mt-3"
          >
            {isRunning ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Executing Multimodal Pipeline...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>RUN EXPERIMENT</span>
              </>
            )}
          </button>
        </div>

        {/* Right: Live Execution Pipeline & Results */}
        <div className="lg:col-span-5 space-y-5">
          {/* Execution Progress Stepper */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Simulation Execution Pipeline</h3>

            <div className="space-y-2">
              {stages.map((stage, idx) => {
                const isPassed = !isRunning && lastResult ? true : idx < runStage;
                const isCurrent = isRunning && idx === runStage;

                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all ${
                      isPassed
                        ? 'bg-emerald-50/60 border-emerald-200 text-emerald-800'
                        : isCurrent
                        ? 'bg-purple-50 border-purple-300 text-purple-900 shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}
                  >
                    <span className="font-medium">{stage}</span>
                    <div>
                      {isPassed ? (
                        <span className="flex items-center gap-1 font-bold text-emerald-600 font-mono">
                          <Check className="w-4 h-4" /> Passed
                        </span>
                      ) : isCurrent ? (
                        <span className="text-purple-600 animate-pulse font-semibold">Running...</span>
                      ) : (
                        <span className="text-slate-300 font-mono">Pending</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Results Summary Box */}
          {lastResult && (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Trial Results</h3>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  SIMULATED
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block text-[11px]">Speech Recognition</span>
                  <span className="text-xl font-bold font-mono text-purple-700">
                    {lastResult.metrics.speechRecognitionScore}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block text-[11px]">Visual Contribution</span>
                  <span className="text-xl font-bold font-mono text-pink-600">
                    +{lastResult.metrics.visualContribution}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  onClick={handleSaveCurrent}
                  className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>Save Experiment</span>
                </button>
                <button
                  onClick={() => onApplyExperiment(lastResult.expState)}
                  className="px-3 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold transition-colors"
                  title="Apply parameters to live workspace"
                >
                  Apply to Live Scene
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Saved Experiments Log */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-3">Saved Experiment Archive ({savedExperiments.length})</h3>

        {savedExperiments.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">
            No experiments saved yet. Build a configuration above and click "RUN EXPERIMENT" to record trials.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {savedExperiments.map((exp) => (
              <div key={exp.id} className="py-3 flex items-center justify-between text-xs gap-4">
                <div>
                  <h4 className="font-bold text-slate-900">{exp.name}</h4>
                  <p className="text-slate-500 text-[11px]">
                    {exp.timestamp} · {exp.notes}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-purple-700 bg-purple-50 px-2 py-1 rounded">
                    Score: {exp.metrics.speechRecognitionScore}
                  </span>
                  <button
                    onClick={() => onApplyExperiment(exp.state)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-purple-50 text-slate-700 hover:text-purple-700 rounded-lg text-xs font-semibold transition-colors"
                  >
                    Load in Workspace
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

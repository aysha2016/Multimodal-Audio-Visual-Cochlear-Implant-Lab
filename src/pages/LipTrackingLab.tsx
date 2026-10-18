import React, { useState } from 'react';
import { Eye, Sliders, CheckCircle2, RefreshCw, BarChart2, Shield } from 'lucide-react';
import { SimulationState } from '../types';
import { getLipLandmarks } from '../services/simulationEngine';
import { AnimatedSpeakerVideo } from '../components/AnimatedSpeakerVideo';

interface LipTrackingLabProps {
  state: SimulationState;
  onUpdateState: (updates: Partial<SimulationState>) => void;
}

export const LipTrackingLab: React.FC<LipTrackingLabProps> = ({ state, onUpdateState }) => {
  const [showMesh, setShowMesh] = useState(true);
  const [sensitivity, setSensitivity] = useState(85);
  const [smoothing, setSmoothing] = useState(70);
  const [viewMode, setViewMode] = useState<'after' | 'before' | 'split'>('after');

  const { outer, inner, confidence, mouthOpening } = getLipLandmarks(
    state.currentTime,
    state.visualQuality,
    state.lipTracking,
    state.targetSpeaker
  );

  const speakerImg = state.targetSpeaker === 'Speaker 2' 
    ? '/src/assets/images/speaker_2_mouth_1792167604471.jpg' 
    : '/src/assets/images/speaker_1_mouth_1792167604192.jpg';

  // Kinematic Lip movement energy
  const movementEnergy = Math.min(1.0, mouthOpening * 1.6 + 0.1 * Math.sin(state.currentTime * 5));
  const stability = Math.max(0.4, (state.visualQuality / 100) * 0.95 - (100 - smoothing) * 0.002);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Lip Tracking & Facial Landmark Laboratory
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-bold tracking-wide">
              SIMULATED
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Real-time articulatory mouth geometry extraction for visual speech complementation.
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setViewMode('before')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              viewMode === 'before' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Raw Video
          </button>
          <button
            onClick={() => setViewMode('after')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              viewMode === 'after' ? 'bg-white text-purple-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Landmarks Tracked
          </button>
          <button
            onClick={() => setViewMode('split')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              viewMode === 'split' ? 'bg-white text-purple-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Side-by-Side
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Video Canvas Area with Moving Lips */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <AnimatedSpeakerVideo
            state={{
              ...state,
              lipTracking: viewMode === 'before' ? false : state.lipTracking && showMesh,
            }}
            onUpdateState={onUpdateState}
            webcamActive={false}
            onToggleWebcam={() => {}}
            webcamVideoRef={{ current: null }}
          />

          {/* Quick Landmark Coordinates Table */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-800 mb-2">Sample Normalized Kinematic Coordinates</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono">
              {outer.slice(0, 4).map((pt, idx) => (
                <div key={idx} className="p-1.5 bg-slate-50 rounded border border-slate-200">
                  <span className="text-purple-700 font-bold">P{idx + 1}: </span>
                  <span>x:{pt.x.toFixed(1)} y:{pt.y.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Metrics & Controls */}
        <div className="lg:col-span-4 space-y-5">
          {/* Metrics Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3.5">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-purple-600" />
              <span>Tracking Telemetry</span>
            </h3>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-600 font-medium">Tracking Confidence</span>
                <span className="font-mono font-bold text-purple-700">{(confidence * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div className="bg-purple-600 h-1.5 rounded-full" style={{ width: `${confidence * 100}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-600 font-medium">Landmark Stability</span>
                <span className="font-mono font-bold text-emerald-600">{(stability * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${stability * 100}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-600 font-medium">Mouth Opening Aperture</span>
                <span className="font-mono font-bold text-blue-600">{(mouthOpening * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${mouthOpening * 100}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-600 font-medium">Lip Movement Energy</span>
                <span className="font-mono font-bold text-pink-600">{(movementEnergy * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div className="bg-pink-500 h-1.5 rounded-full" style={{ width: `${movementEnergy * 100}%` }} />
              </div>
            </div>
          </div>

          {/* Controls Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4 text-xs">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-purple-600" />
              <span>Tracking Calibration</span>
            </h3>

            {/* Sensitivity */}
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-slate-600 font-medium">Detector Sensitivity</label>
                <span className="font-mono font-bold text-slate-800">{sensitivity}%</span>
              </div>
              <input
                type="range"
                min="30"
                max="100"
                value={sensitivity}
                onChange={(e) => setSensitivity(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
              />
            </div>

            {/* Smoothing */}
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-slate-600 font-medium">Temporal Smoothing</label>
                <span className="font-mono font-bold text-slate-800">{smoothing}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={smoothing}
                onChange={(e) => setSmoothing(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
              />
            </div>

            {/* Mesh visibility toggle */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-slate-700 font-medium">Show Wireframe Mesh</span>
              <button
                type="button"
                onClick={() => setShowMesh(!showMesh)}
                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  showMesh ? 'bg-purple-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    showMesh ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

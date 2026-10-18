import React, { useState } from 'react';
import { Share2, Sliders, Zap, CheckCircle2 } from 'lucide-react';
import { SimulationState, SimulationMetrics } from '../types';

interface MultimodalFusionProps {
  state: SimulationState;
  metrics: SimulationMetrics;
  onUpdateState: (updates: Partial<SimulationState>) => void;
}

export const MultimodalFusionPage: React.FC<MultimodalFusionProps> = ({
  state,
  metrics,
  onUpdateState,
}) => {
  const [audioWeight, setAudioWeight] = useState(55);
  const [visualWeight, setVisualWeight] = useState(45);

  const audioTokens = ['A1: Formant F1', 'A2: Formant F2', 'A3: Pitch F0', 'A4: Plosive Burst', 'A5: Fricative Noise'];
  const visualTokens = ['V1: Lip Width', 'V2: Jaw Height', 'V3: Lip Rounding', 'V4: Velocity Vector', 'V5: Teeth Visibility'];

  // Attention matrix weights (5x5)
  const getAttentionWeight = (aIdx: number, vIdx: number): number => {
    // Correlate vowel aperture with Formant F1, lip rounding with F2
    const baseCorr = [
      [0.85, 0.92, 0.45, 0.30, 0.70],
      [0.60, 0.40, 0.95, 0.50, 0.35],
      [0.40, 0.35, 0.30, 0.75, 0.20],
      [0.25, 0.30, 0.20, 0.90, 0.82],
      [0.15, 0.20, 0.15, 0.40, 0.95],
    ];
    const qualityScale = state.visualQuality / 100;
    const trackingActive = state.lipTracking ? 1.0 : 0.2;
    return Number((baseCorr[aIdx][vIdx] * qualityScale * trackingActive).toFixed(2));
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Cross-Modal Attention & Feature Fusion Matrix
          </h1>
          <span className="px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 text-xs font-bold tracking-wide">
            TRANSFORMER FUSION
          </span>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Mapping acoustic spectral representations to kinematic visual speech visemes via cross-attention heads.
        </p>
      </div>

      {/* Grid: Attention Matrix (Left) + Fusion Weights & Representation (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: 5x5 Attention Heatmap Matrix */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Share2 className="w-4 h-4 text-teal-600" />
              <span>Cross-Modal Multi-Head Attention Map A = Softmax(Q_A · K_V^T / √d)</span>
            </h3>
            <span className="text-xs font-mono text-slate-500">Heads: 8 · Dim: 256</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-center border-collapse">
              <thead>
                <tr>
                  <th className="p-2 text-left text-slate-400 font-normal">Audio \ Visual</th>
                  {visualTokens.map((vt, i) => (
                    <th key={i} className="p-2 font-semibold text-slate-700 bg-slate-50 rounded-t-lg">
                      {vt}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {audioTokens.map((at, rIdx) => (
                  <tr key={rIdx} className="border-t border-slate-100">
                    <td className="p-2 text-left font-semibold text-slate-700 bg-slate-50 rounded-l-lg">
                      {at}
                    </td>
                    {visualTokens.map((_, cIdx) => {
                      const weight = getAttentionWeight(rIdx, cIdx);
                      // Color intensity
                      const opacity = Math.max(0.1, weight);

                      return (
                        <td key={cIdx} className="p-2">
                          <div
                            className="py-2.5 px-1 rounded-md font-mono text-[11px] font-bold transition-all shadow-2xs"
                            style={{
                              backgroundColor: `rgba(20, 184, 166, ${opacity})`,
                              color: opacity > 0.5 ? '#FFFFFF' : '#0F766E',
                            }}
                          >
                            {weight.toFixed(2)}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
            <span>Darker teal indicates stronger cross-modal alignment</span>
            <span className="font-mono">Attention Entropy: 1.42 nats</span>
          </div>
        </div>

        {/* Right: Modal Weights & Confidence */}
        <div className="lg:col-span-4 space-y-5">
          {/* Fusion Confidence Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Fusion Confidence Telemetry</span>
            </h3>

            <div className="text-center py-3 bg-gradient-to-br from-teal-50 to-indigo-50 rounded-xl border border-teal-100">
              <span className="text-3xl font-extrabold font-mono text-teal-800">
                {(metrics.fusionConfidence * 100).toFixed(0)}%
              </span>
              <p className="text-[11px] text-teal-700 font-medium mt-0.5">
                Dynamic Multimodal Coherence
              </p>
            </div>

            <div className="text-xs text-slate-600 leading-relaxed">
              When acoustic signal-to-noise drops, the transformer autonomously shifts weight toward visual tokens to preserve phonemic place-of-articulation features.
            </div>
          </div>

          {/* Weight Controls Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4 text-xs">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-purple-600" />
              <span>Modal Contribution Biasing</span>
            </h3>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-600 font-medium">Acoustic Prior Weight</span>
                <span className="font-mono font-bold text-blue-600">{audioWeight}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="90"
                value={audioWeight}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setAudioWeight(val);
                  setVisualWeight(100 - val);
                }}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-600 font-medium">Visual Speech Prior Weight</span>
                <span className="font-mono font-bold text-purple-600">{visualWeight}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="90"
                value={visualWeight}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setVisualWeight(val);
                  setAudioWeight(100 - val);
                }}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
              />
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-slate-500">
              <span>Automatic Normalization:</span>
              <span className="font-semibold text-emerald-600">Softmax (∑ w_i = 1.0)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

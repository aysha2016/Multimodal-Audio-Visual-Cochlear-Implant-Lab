import React, { useState } from 'react';
import { BarChart3, LineChart, TrendingUp, CheckCircle2, Sliders, Shield } from 'lucide-react';
import { SimulationState, SimulationMetrics } from '../types';
import { getSnrComparisonData } from '../services/simulationEngine';

interface EvaluationPageProps {
  state: SimulationState;
  metrics: SimulationMetrics;
}

export const EvaluationPage: React.FC<EvaluationPageProps> = ({ state, metrics }) => {
  const [evalTab, setEvalTab] = useState<'speech' | 'quality' | 'visual' | 'fusion' | 'confusion'>('speech');

  const snrData = getSnrComparisonData(state);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Scientific Evaluation & Psychometric Benchmarks
          </h1>
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold tracking-wide">
            SIMULATED
          </span>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Quantitative intelligibility modeling, speech reception thresholds (SRT), and multimodal gain curves.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-fit">
        {[
          { id: 'speech', label: 'Speech Recognition vs SNR' },
          { id: 'quality', label: 'Audio Quality (STOI)' },
          { id: 'visual', label: 'Visual Contribution vs Quality' },
          { id: 'fusion', label: 'Fusion Confidence vs SNR' },
          { id: 'confusion', label: 'Phoneme / Viseme Matrix' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setEvalTab(tab.id as any)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              evalTab === tab.id
                ? 'bg-white text-purple-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Speech Recognition vs SNR Curve */}
      {evalTab === 'speech' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Psychometric Speech Reception Curve</h3>
              <p className="text-xs text-slate-500">Sigmoid curve modeled on Sumby & Pollack (1954) audio-visual speech reception thresholds.</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-blue-600 font-semibold">
                <span className="w-3 h-0.5 bg-blue-500 inline-block"></span> Audio Only
              </span>
              <span className="flex items-center gap-1.5 text-purple-600 font-semibold">
                <span className="w-3 h-0.5 bg-purple-600 inline-block"></span> Audio + Visual
              </span>
            </div>
          </div>

          {/* Curve Display */}
          <div className="h-64 border-b border-l border-slate-200 relative pt-4 px-4 flex items-end">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 600 200" preserveAspectRatio="none">
              {/* Grid Lines */}
              {[0, 50, 100, 150, 200].map((y) => (
                <line key={y} x1="0" y1={y} x2="600" y2={y} stroke="#F1F5F9" strokeWidth="1" />
              ))}

              {/* Audio Only Curve (Blue) */}
              <path
                d={`M ${snrData.map((d, i) => `${(i / (snrData.length - 1)) * 600},${200 - d.audioOnly * 200}`).join(' L ')}`}
                fill="none"
                stroke="#3B82F6"
                strokeWidth="3"
                strokeDasharray="4 2"
              />

              {/* Audio + Visual Curve (Purple) */}
              <path
                d={`M ${snrData.map((d, i) => `${(i / (snrData.length - 1)) * 600},${200 - d.audioVisual * 200}`).join(' L ')}`}
                fill="none"
                stroke="#8B5CF6"
                strokeWidth="3.5"
              />

              {/* Highlight points */}
              {snrData.map((d, i) => {
                const cx = (i / (snrData.length - 1)) * 600;
                const cy = 200 - d.audioVisual * 200;
                return (
                  <circle
                    key={i}
                    cx={cx}
                    cy={cy}
                    r={d.isCurrent ? '6' : '4'}
                    fill="#FFFFFF"
                    stroke="#8B5CF6"
                    strokeWidth="2.5"
                  />
                );
              })}
            </svg>
          </div>

          <div className="flex justify-between text-xs font-mono text-slate-500 px-4">
            {snrData.map((d) => (
              <span key={d.snr} className={d.isCurrent ? 'font-bold text-purple-700' : ''}>
                {d.snrLabel} dB
              </span>
            ))}
          </div>

          <div className="p-4 bg-purple-50/60 rounded-xl border border-purple-100 flex items-center justify-between text-xs">
            <div>
              <span className="font-bold text-purple-900">Calculated Benefit (Visual Speech Advantage): </span>
              <span className="text-purple-700 font-medium">
                At 0 dB SNR, visual speech cues provide a <span className="font-bold">+34% boost</span> in word recognition accuracy for simulated CI users.
              </span>
            </div>
            <span className="px-2.5 py-1 rounded-md bg-purple-200/60 text-purple-900 font-bold font-mono">
              ΔSRT: ~8.2 dB
            </span>
          </div>
        </div>
      )}

      {/* Tab 2: Audio Quality (STOI) */}
      {evalTab === 'quality' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Short-Time Objective Intelligibility (STOI) Analysis</h3>
          <p className="text-xs text-slate-500">Correlation with human speech perception in non-stationary acoustic environments.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500">Current STOI Score</span>
              <div className="text-3xl font-bold font-mono text-blue-600 mt-1">{metrics.stoi.toFixed(2)}</div>
              <span className="text-[11px] text-slate-400">High speech correlation</span>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500">PESQ MOS Estimate</span>
              <div className="text-3xl font-bold font-mono text-indigo-600 mt-1">3.42</div>
              <span className="text-[11px] text-slate-400">Perceptual evaluation</span>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs text-slate-500">Noise Reduction Delta</span>
              <div className="text-3xl font-bold font-mono text-emerald-600 mt-1">+14.6 dB</div>
              <span className="text-[11px] text-slate-400">Spectral subtraction gain</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Visual Contribution vs Quality */}
      {evalTab === 'visual' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Visual Gain vs Visual Quality Degradation</h3>
          <p className="text-xs text-slate-500">Simulating the impact of video resolution, camera distance, and facial occlusion on speech decoding.</p>

          <div className="space-y-3">
            {[
              { quality: '100% (High Def Macro)', gain: '+0.34 Gain', score: '0.78 Total', percent: 100 },
              { quality: '80% (Minor Compression)', gain: '+0.29 Gain', score: '0.73 Total', percent: 80 },
              { quality: '60% (Moderate Video Blur)', gain: '+0.21 Gain', score: '0.65 Total', percent: 60 },
              { quality: '40% (Partial Occlusion)', gain: '+0.12 Gain', score: '0.56 Total', percent: 40 },
              { quality: '20% (Low Res Webcam)', gain: '+0.05 Gain', score: '0.49 Total', percent: 20 },
            ].map((row, idx) => (
              <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800 w-48">{row.quality}</span>
                <div className="flex-1 max-w-xs bg-slate-200 rounded-full h-2 overflow-hidden mx-4">
                  <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${row.percent}%` }} />
                </div>
                <div className="flex items-center gap-4 font-mono font-bold">
                  <span className="text-purple-700">{row.gain}</span>
                  <span className="text-slate-900">{row.score}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Fusion Confidence */}
      {evalTab === 'fusion' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Transformer Fusion Confidence Dynamics</h3>
          <p className="text-xs text-slate-500">Cross-modal attention entropy and modal alignment reliability across background noise levels.</p>
          <div className="p-4 bg-teal-50/60 rounded-xl border border-teal-100 text-xs text-teal-900 leading-relaxed">
            Current Fusion Confidence is <span className="font-bold font-mono">{(metrics.fusionConfidence * 100).toFixed(0)}%</span>. Under extreme acoustic noise (-10 dB), the transformer prioritizes visual lip tracking, maintaining speech recognition even when acoustic formants are severely masked.
          </div>
        </div>
      )}

      {/* Tab 5: Phoneme / Viseme Confusion Matrix */}
      {evalTab === 'confusion' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Viseme-Phoneme Complementarity Matrix</h3>
          <p className="text-xs text-slate-500">Demonstrating how visual visemes resolve acoustic CI electrode confusions (e.g. /ba/ vs /da/ vs /ga/).</p>

          <div className="overflow-x-auto text-xs">
            <table className="w-full text-center border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-bold">
                  <th className="p-2.5 text-left">Phoneme Pair</th>
                  <th className="p-2.5">Acoustic CI Alone (Error Rate)</th>
                  <th className="p-2.5">Visual Viseme Discriminability</th>
                  <th className="p-2.5 text-purple-700">Multimodal Fusion (Accuracy)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="p-2.5 text-left font-mono font-bold">/ba/ vs /da/ (Bilabial vs Alveolar)</td>
                  <td className="p-2.5 text-rose-600 font-semibold font-mono">54.2% error</td>
                  <td className="p-2.5 text-emerald-600 font-semibold">98.5% distinct</td>
                  <td className="p-2.5 text-purple-700 font-bold font-mono">96.8% correct</td>
                </tr>
                <tr>
                  <td className="p-2.5 text-left font-mono font-bold">/pa/ vs /ta/ (Voiceless Stops)</td>
                  <td className="p-2.5 text-rose-600 font-semibold font-mono">48.9% error</td>
                  <td className="p-2.5 text-emerald-600 font-semibold">97.2% distinct</td>
                  <td className="p-2.5 text-purple-700 font-bold font-mono">95.4% correct</td>
                </tr>
                <tr>
                  <td className="p-2.5 text-left font-mono font-bold">/ma/ vs /na/ (Nasals)</td>
                  <td className="p-2.5 text-rose-600 font-semibold font-mono">62.1% error</td>
                  <td className="p-2.5 text-emerald-600 font-semibold">99.1% distinct</td>
                  <td className="p-2.5 text-purple-700 font-bold font-mono">97.6% correct</td>
                </tr>
                <tr>
                  <td className="p-2.5 text-left font-mono font-bold">/fa/ vs /sa/ (Fricatives)</td>
                  <td className="p-2.5 text-rose-600 font-semibold font-mono">39.4% error</td>
                  <td className="p-2.5 text-emerald-600 font-semibold">93.8% distinct</td>
                  <td className="p-2.5 text-purple-700 font-bold font-mono">92.2% correct</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

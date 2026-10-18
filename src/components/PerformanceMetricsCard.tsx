import React from 'react';
import { LineChart, ArrowUpRight } from 'lucide-react';
import { SimulationMetrics } from '../types';

interface MetricsProps {
  metrics: SimulationMetrics;
}

export const PerformanceMetricsCard: React.FC<MetricsProps> = ({ metrics }) => {
  // Sparkline SVG path generator
  const renderSparkline = (data: number[], color: string) => {
    if (!data || data.length === 0) return null;
    const width = 120;
    const height = 26;
    const min = Math.min(...data) * 0.85;
    const max = Math.max(...data) * 1.15 || 1;

    const points = data.map((val, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((val - min) / (max - min || 1)) * height;
      return `${x},${Math.max(2, Math.min(height - 2, y))}`;
    });

    const pathD = `M ${points.join(' L ')}`;

    return (
      <svg className="w-full h-7 overflow-visible" viewBox={`0 0 ${width} ${height}`}>
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 rounded-md bg-purple-100 text-purple-600 flex items-center justify-center">
            <LineChart className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Performance Metrics (Simulated)</h3>
        </div>
        <p className="text-xs text-slate-500 mb-3">
          Key metrics for audio-visual CI processing.
        </p>
      </div>

      {/* 2x2 Metric Cards Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Metric 1: Speech Recognition Score */}
        <div className="bg-slate-50/70 rounded-xl p-3 border border-slate-200/80 flex flex-col justify-between hover:border-purple-300 transition-colors">
          <div className="flex items-start justify-between gap-1 mb-1">
            <span className="text-[11px] font-semibold text-slate-700 leading-tight">
              Speech Recognition Score
            </span>
            <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-purple-100/70 text-purple-700 font-semibold tracking-wide shrink-0">
              SIMULATED
            </span>
          </div>

          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono tracking-tight text-slate-900 tabular-nums">
              {metrics.speechRecognitionScore.toFixed(2)}
            </span>
            <div className="flex items-center text-xs font-semibold text-emerald-600">
              <ArrowUpRight className="w-3 h-3 stroke-[2.5]" />
              <span>{metrics.recognitionTrend}%</span>
            </div>
          </div>

          <div className="mt-2">
            {renderSparkline(metrics.recognitionHistory, '#8B5CF6')}
          </div>
        </div>

        {/* Metric 2: Audio Quality (STOI) */}
        <div className="bg-slate-50/70 rounded-xl p-3 border border-slate-200/80 flex flex-col justify-between hover:border-blue-300 transition-colors">
          <div className="flex items-start justify-between gap-1 mb-1">
            <span className="text-[11px] font-semibold text-slate-700 leading-tight">
              Audio Quality (STOI)
            </span>
            <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-blue-100/70 text-blue-700 font-semibold tracking-wide shrink-0">
              SIMULATED
            </span>
          </div>

          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono tracking-tight text-slate-900 tabular-nums">
              {metrics.stoi.toFixed(2)}
            </span>
            <div className="flex items-center text-xs font-semibold text-emerald-600">
              <ArrowUpRight className="w-3 h-3 stroke-[2.5]" />
              <span>{metrics.stoiTrend}%</span>
            </div>
          </div>

          <div className="mt-2">
            {renderSparkline(metrics.stoiHistory, '#3B82F6')}
          </div>
        </div>

        {/* Metric 3: Visual Contribution */}
        <div className="bg-slate-50/70 rounded-xl p-3 border border-slate-200/80 flex flex-col justify-between hover:border-pink-300 transition-colors">
          <div className="flex items-start justify-between gap-1 mb-1">
            <span className="text-[11px] font-semibold text-slate-700 leading-tight">
              Visual Contribution
            </span>
            <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-pink-100/70 text-pink-700 font-semibold tracking-wide shrink-0">
              SIMULATED
            </span>
          </div>

          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono tracking-tight text-slate-900 tabular-nums">
              {metrics.visualContribution.toFixed(2)}
            </span>
            <div className="flex items-center text-xs font-semibold text-emerald-600">
              <ArrowUpRight className="w-3 h-3 stroke-[2.5]" />
              <span>{metrics.visualContributionTrend}%</span>
            </div>
          </div>

          <div className="mt-2">
            {renderSparkline(metrics.visualHistory, '#EC4899')}
          </div>
        </div>

        {/* Metric 4: Fusion Confidence */}
        <div className="bg-slate-50/70 rounded-xl p-3 border border-slate-200/80 flex flex-col justify-between hover:border-teal-300 transition-colors">
          <div className="flex items-start justify-between gap-1 mb-1">
            <span className="text-[11px] font-semibold text-slate-700 leading-tight">
              Fusion Confidence
            </span>
            <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-teal-100/70 text-teal-700 font-semibold tracking-wide shrink-0">
              SIMULATED
            </span>
          </div>

          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono tracking-tight text-slate-900 tabular-nums">
              {metrics.fusionConfidence.toFixed(2)}
            </span>
            <div className="flex items-center text-xs font-semibold text-emerald-600">
              <ArrowUpRight className="w-3 h-3 stroke-[2.5]" />
              <span>{metrics.fusionConfidenceTrend}%</span>
            </div>
          </div>

          <div className="mt-2">
            {renderSparkline(metrics.fusionHistory, '#14B8A6')}
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { SimulationState, SimulationMetrics } from '../types';
import { LiveAudioVisualScene } from '../components/LiveAudioVisualScene';
import { InputSettingsPanel } from '../components/InputSettingsPanel';
import { TargetSpeakerPanel } from '../components/TargetSpeakerPanel';
import { MultimodalPipelineCard } from '../components/MultimodalPipelineCard';
import { CIRepresentationCard } from '../components/CIRepresentationCard';
import { AudioVsVisualChart } from '../components/AudioVsVisualChart';
import { PerformanceMetricsCard } from '../components/PerformanceMetricsCard';

interface AVSceneProps {
  state: SimulationState;
  metrics: SimulationMetrics;
  onUpdateState: (updates: Partial<SimulationState>) => void;
}

export const AVScene: React.FC<AVSceneProps> = ({
  state,
  metrics,
  onUpdateState,
}) => {
  return (
    <div className="space-y-5">
      {/* Main Page Title Header */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Multimodal Audio-Visual CI Processing
          </h1>
          <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-bold tracking-wide">
            RESEARCH PROTOTYPE
          </span>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Combine visual speech cues with audio signals to improve speech understanding in noise.
        </p>
      </div>

      {/* Top Row: Live AV Scene (Left ~8 cols) + Input Settings / Target Speaker (Right ~4 cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Left Column: Live Audio-Visual Scene Card */}
        <div className="xl:col-span-8">
          <LiveAudioVisualScene
            state={state}
            onUpdateState={onUpdateState}
          />
        </div>

        {/* Right Column: Input Settings & Target Speaker */}
        <div className="xl:col-span-4 space-y-5">
          <InputSettingsPanel
            state={state}
            onUpdateState={onUpdateState}
          />
          <TargetSpeakerPanel
            state={state}
            onUpdateState={onUpdateState}
          />
        </div>
      </div>

      {/* Middle Row: Multimodal Processing Pipeline */}
      <div>
        <MultimodalPipelineCard state={state} />
      </div>

      {/* Lower Row: CI Representation + Audio Only vs Audio-Visual + Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <CIRepresentationCard state={state} />
        <AudioVsVisualChart state={state} />
        <PerformanceMetricsCard metrics={metrics} />
      </div>
    </div>
  );
};

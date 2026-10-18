import React, { useState, useEffect, useRef } from 'react';
import { SimulationState, SimulationMetrics, SavedExperiment } from './types';
import { calculateMetrics } from './services/simulationEngine';
import { Header } from './components/Header';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { Footer } from './components/Footer';
import { SettingsModal } from './components/SettingsModal';
import { AIAssistantDrawer } from './components/AIAssistantDrawer';

// Pages
import { AVScene } from './pages/AVScene';
import { Overview } from './pages/Overview';
import { LipTrackingLab } from './pages/LipTrackingLab';
import { AudioAnalysisPage } from './pages/AudioAnalysisPage';
import { MultimodalFusionPage } from './pages/MultimodalFusionPage';
import { CIEncodingPage } from './pages/CIEncodingPage';
import { EvaluationPage } from './pages/EvaluationPage';
import { ExperimentsPage } from './pages/ExperimentsPage';

export default function App() {
  // Standard benchmark default state as specified in prompt
  const defaultState: SimulationState = {
    soundType: 'Speech (Male)',
    backgroundNoise: 'Restaurant Noise',
    snr: 0, // 0 dB default
    visualQuality: 100, // 100% default
    lipTracking: true,
    processingMode: 'Audio + Visual',
    audioMode: 'Clean Speech',
    visualReliability: 80, // 80% default
    targetSpeaker: 'Speaker 1',
    ciStrategy: 'ACE',
    ciChannels: 22,
    currentSpread: 'Medium',
    isLive: true,
    isPlaying: true,
    currentTime: 2.0, // starts at 0:02 / 0:05 as in reference image
    duration: 5.0,
    fps: 30,
    useWebcam: false,
  };

  const [state, setState] = useState<SimulationState>(defaultState);
  const [metrics, setMetrics] = useState<SimulationMetrics>(() => calculateMetrics(defaultState));
  const [activeTab, setActiveTab] = useState<ActiveTab>('av-scene');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [savedExperiments, setSavedExperiments] = useState<SavedExperiment[]>([
    {
      id: 'baseline-1',
      name: 'Baseline ACE 22-Channel (0 dB SNR)',
      timestamp: 'Initial Benchmark',
      state: { ...defaultState },
      metrics: calculateMetrics(defaultState),
      notes: 'Initial standard reference condition in Restaurant Noise.',
    },
  ]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Recalculate metrics whenever relevant state changes
  useEffect(() => {
    setMetrics(calculateMetrics(state));
  }, [
    state.snr,
    state.visualQuality,
    state.lipTracking,
    state.processingMode,
    state.visualReliability,
    state.ciChannels,
    state.currentSpread,
  ]);

  // Synchronized Real-time playback loop
  const animRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());

  useEffect(() => {
    const loop = (now: number) => {
      const dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      if (state.isPlaying) {
        setState((prev) => {
          let nextTime = prev.currentTime + dt;
          if (nextTime >= prev.duration) {
            nextTime = 0;
          }
          return { ...prev, currentTime: nextTime };
        });
      }
      animRef.current = requestAnimationFrame(loop);
    };

    lastTimeRef.current = performance.now();
    animRef.current = requestAnimationFrame(loop);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [state.isPlaying, state.duration]);

  const handleUpdateState = (updates: Partial<SimulationState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  const handleResetToDefaults = () => {
    setState(defaultState);
    setToastMessage('Reset to standard benchmark parameters (0 dB SNR, ACE, 22ch).');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSaveExperiment = (customExp?: SavedExperiment) => {
    const expToSave: SavedExperiment = customExp || {
      id: `exp-${Date.now()}`,
      name: `Trial #${savedExperiments.length + 1} (${state.processingMode}, SNR ${state.snr}dB)`,
      timestamp: new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      state: { ...state },
      metrics: { ...metrics },
      notes: `${state.soundType} with ${state.backgroundNoise}, ${state.ciStrategy} coding.`,
    };

    setSavedExperiments((prev) => [expToSave, ...prev]);
    setToastMessage('Experiment configuration and metrics saved.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleExport = (format: 'json' | 'csv' | 'metrics' | 'summary') => {
    let content = '';
    let filename = '';
    let type = '';

    if (format === 'json') {
      content = JSON.stringify({ state, metrics, savedExperiments }, null, 2);
      filename = `CI-AI_Experiment_${Date.now()}.json`;
      type = 'application/json';
    } else if (format === 'csv') {
      content = `Metric,Value,Unit\nSpeech Recognition Score,${metrics.speechRecognitionScore},ratio\nAudio Quality (STOI),${metrics.stoi},ratio\nVisual Contribution,${metrics.visualContribution},ratio\nFusion Confidence,${metrics.fusionConfidence},ratio\nSNR,${state.snr},dB\nVisual Quality,${state.visualQuality},%\nProcessing Mode,${state.processingMode},mode\nCI Strategy,${state.ciStrategy},algorithm\nCI Channels,${state.ciChannels},channels\n`;
      filename = `CI-AI_Metrics_${Date.now()}.csv`;
      type = 'text/csv';
    } else if (format === 'metrics') {
      content = JSON.stringify(metrics, null, 2);
      filename = `CI-AI_RawMetrics_${Date.now()}.json`;
      type = 'application/json';
    } else {
      content = `# CI-AI Research Summary Report
Date: ${new Date().toLocaleString()}
Prototype: Multimodal Audio-Visual Cochlear Implant Processing

## Active Simulation Configuration
- Sound Type: ${state.soundType}
- Noise Condition: ${state.backgroundNoise}
- Signal-to-Noise Ratio (SNR): ${state.snr} dB
- Processing Mode: ${state.processingMode}
- Visual Quality: ${state.visualQuality}%
- Lip Tracking: ${state.lipTracking ? 'Enabled' : 'Disabled'}
- CI Sound Coding Strategy: ${state.ciStrategy} (${state.ciChannels} channels, ${state.currentSpread} current spread)

## Key Results (SIMULATED)
- Speech Recognition Score: ${metrics.speechRecognitionScore} (+${metrics.recognitionTrend}% over audio-only)
- Audio Quality (STOI): ${metrics.stoi}
- Visual Speech Contribution: +${metrics.visualContribution}
- Cross-Modal Fusion Confidence: ${(metrics.fusionConfidence * 100).toFixed(0)}%

*Disclaimer: Research simulation only. Not a medical device. Not clinically validated.*
`;
      filename = `CI-AI_Research_Summary_${Date.now()}.md`;
      type = 'text/markdown';
    }

    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setToastMessage(`Exported ${filename}`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className="min-h-screen bg-[#F7F9FC] text-slate-900 flex flex-col font-sans">
      {/* Fixed Top Header */}
      <Header
        state={state}
        metrics={metrics}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onToggleAIAssistant={() => setIsAIAssistantOpen(!isAIAssistantOpen)}
        onSaveExperiment={() => handleSaveExperiment()}
        onExport={handleExport}
        isAIAssistantOpen={isAIAssistantOpen}
      />

      {/* Main Body: Left Sidebar + Central Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* Central Workspace */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {activeTab === 'av-scene' && (
            <AVScene
              state={state}
              metrics={metrics}
              onUpdateState={handleUpdateState}
            />
          )}

          {activeTab === 'overview' && (
            <Overview
              state={state}
              metrics={metrics}
              onNavigateToScene={() => setActiveTab('av-scene')}
            />
          )}

          {activeTab === 'lip-tracking' && (
            <LipTrackingLab
              state={state}
              onUpdateState={handleUpdateState}
            />
          )}

          {activeTab === 'audio-analysis' && (
            <AudioAnalysisPage state={state} />
          )}

          {activeTab === 'multimodal-fusion' && (
            <MultimodalFusionPage
              state={state}
              metrics={metrics}
              onUpdateState={handleUpdateState}
            />
          )}

          {activeTab === 'ci-encoding' && (
            <CIEncodingPage
              state={state}
              onUpdateState={handleUpdateState}
            />
          )}

          {activeTab === 'evaluation' && (
            <EvaluationPage
              state={state}
              metrics={metrics}
            />
          )}

          {activeTab === 'experiments' && (
            <ExperimentsPage
              state={state}
              savedExperiments={savedExperiments}
              onSaveExperiment={handleSaveExperiment}
              onApplyExperiment={(loadedState) => {
                setState(loadedState);
                setActiveTab('av-scene');
                setToastMessage('Loaded experiment into workspace.');
                setTimeout(() => setToastMessage(null), 3000);
              }}
            />
          )}
        </main>
      </div>

      {/* Footer */}
      <Footer />

      {/* Modals & Drawers */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        state={state}
        onUpdateState={handleUpdateState}
        onResetToDefaults={handleResetToDefaults}
      />

      <AIAssistantDrawer
        isOpen={isAIAssistantOpen}
        onClose={() => setIsAIAssistantOpen(false)}
        state={state}
        metrics={metrics}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-12 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-xl border border-slate-800 flex items-center gap-2 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

import React, { useRef, useEffect, useState } from 'react';
import { Cpu } from 'lucide-react';
import { SimulationState } from '../types';

interface CIRepresentationProps {
  state: SimulationState;
}

export const CIRepresentationCard: React.FC<CIRepresentationProps> = ({ state }) => {
  const [activeTab, setActiveTab] = useState<'both' | 'spectrogram' | 'electrodes'>('both');
  const heatmapCanvasRef = useRef<HTMLCanvasElement>(null);
  const electrodogramCanvasRef = useRef<HTMLCanvasElement>(null);

  const { currentTime, duration, snr, visualQuality, lipTracking, processingMode, ciChannels, ciStrategy, currentSpread } = state;

  // Render 22-Channel Heatmap
  useEffect(() => {
    const canvas = heatmapCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const cols = 90;
    const rows = ciChannels;
    const cellW = width / cols;
    const cellH = height / rows;

    const isAV = processingMode === 'Audio + Visual';
    const visualBoost = isAV && lipTracking ? (visualQuality / 100) * 0.25 : 0;
    const noiseEffect = Math.max(0.04, (15 - snr) / 30);

    for (let c = 0; c < cols; c++) {
      const timeVal = (c / cols) * duration;
      
      for (let r = 0; r < rows; r++) {
        // Channel index: 0 is apical (low freq), rows-1 is basal (high freq)
        const channelNorm = r / rows;
        
        // Tonotopic speech energy peaks
        const speechPeak = Math.sin(timeVal * 4.2 + channelNorm * 7) * 0.5 + 0.5;
        const formantMod = Math.exp(-Math.pow(channelNorm - 0.35, 2) * 12) * Math.sin(timeVal * 3);
        const noise = Math.random() * noiseEffect * 0.7;

        let energy = Math.max(0, Math.min(1.0, speechPeak * 0.65 + formantMod * 0.3 + noise));
        
        // Visual cue restores energy in mid-frequency consonant channels (channels 10-16)
        if (channelNorm > 0.4 && channelNorm < 0.75) {
          energy = Math.min(1.0, energy + visualBoost * 0.4);
        }

        // Color ramp: Dark Blue -> Cyan -> Yellow -> Orange/Red
        let rVal = 0, gVal = 0, bVal = 0;
        if (energy < 0.25) {
          rVal = 10; gVal = 30; bVal = Math.floor(energy * 4 * 180 + 50);
        } else if (energy < 0.55) {
          const norm = (energy - 0.25) / 0.3;
          rVal = Math.floor(norm * 40);
          gVal = Math.floor(norm * 200 + 40);
          bVal = 230;
        } else if (energy < 0.8) {
          const norm = (energy - 0.55) / 0.25;
          rVal = Math.floor(norm * 220 + 30);
          gVal = 230;
          bVal = Math.floor((1 - norm) * 120);
        } else {
          const norm = (energy - 0.8) / 0.2;
          rVal = 240;
          gVal = Math.floor((1 - norm) * 160 + 30);
          bVal = 20;
        }

        ctx.fillStyle = `rgb(${rVal}, ${gVal}, ${bVal})`;
        ctx.fillRect(c * cellW, r * cellH, cellW + 0.5, cellH + 0.5);
      }
    }

    // Playhead cursor
    const cursorX = (currentTime / duration) * width;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cursorX, 0);
    ctx.lineTo(cursorX, height);
    ctx.stroke();
  }, [currentTime, duration, snr, visualQuality, lipTracking, processingMode, ciChannels]);

  // Render Electrodogram Pulse Trains
  useEffect(() => {
    const canvas = electrodogramCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    const channelsCount = 5; // Rows: 1, 6, 11, 16, 22
    const rowHeight = height / channelsCount;
    const isAV = processingMode === 'Audio + Visual';

    // Current spread line effect
    const spreadBlur = currentSpread === 'High' ? 1.4 : currentSpread === 'Medium' ? 0.8 : 0.4;

    for (let rowIdx = 0; rowIdx < channelsCount; rowIdx++) {
      const yCenter = rowIdx * rowHeight + rowHeight / 2;

      // Draw faint baseline for each electrode
      ctx.beginPath();
      ctx.strokeStyle = '#F1F5F9';
      ctx.lineWidth = 1;
      ctx.moveTo(0, yCenter);
      ctx.lineTo(width, yCenter);
      ctx.stroke();

      // Draw biphasic pulse bursts
      const numPulses = 45;
      for (let p = 0; p < numPulses; p++) {
        const x = (p / numPulses) * width;
        const timeAtX = (p / numPulses) * duration;

        // ACE N-of-M channel selection simulation: only selected channels fire
        const channelSelect = Math.sin(p * 0.4 + rowIdx * 1.8 + timeAtX * 3);
        if (channelSelect > -0.1) {
          const baseAmp = Math.max(0.2, Math.sin(timeAtX * 5 + rowIdx) * 0.5 + 0.5);
          const visualEnhance = (isAV && lipTracking && rowIdx >= 2) ? 0.25 : 0;
          const pulseHeight = Math.min(rowHeight * 0.45, (baseAmp + visualEnhance) * (rowHeight * 0.4));

          // Draw biphasic spike
          ctx.beginPath();
          ctx.strokeStyle = '#8B5CF6';
          ctx.lineWidth = 1.2 * spreadBlur;
          ctx.moveTo(x, yCenter - pulseHeight);
          ctx.lineTo(x, yCenter + pulseHeight);
          ctx.stroke();
        }
      }
    }

    // Playhead cursor
    const cursorX = (currentTime / duration) * width;
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cursorX, 0);
    ctx.lineTo(cursorX, height);
    ctx.stroke();
  }, [currentTime, duration, processingMode, lipTracking, currentSpread]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-purple-100 text-purple-600 flex items-center justify-center">
              <Cpu className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">CI Representation</h3>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-semibold border border-purple-200">
            {state.ciStrategy} · {state.ciChannels}ch
          </span>
        </div>
        <p className="text-xs text-slate-500 mb-3">
          Simulated cochlear implant representation of fused audio-visual input.
        </p>

        {/* Tab switcher */}
        <div className="flex items-center gap-1.5 mb-3 bg-slate-100 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('both')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'both' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Dual View
          </button>
          <button
            onClick={() => setActiveTab('spectrogram')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'spectrogram' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Channel Spectrogram
          </button>
          <button
            onClick={() => setActiveTab('electrodes')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'electrodes' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Electrode Stimulation Pattern
          </button>
        </div>
      </div>

      {/* Grid of Views */}
      <div className={`grid gap-4 ${activeTab === 'both' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
        {/* Left: Channel Spectrogram Heatmap */}
        {(activeTab === 'both' || activeTab === 'spectrogram') && (
          <div>
            <div className="text-[11px] font-semibold text-slate-700 mb-1 flex items-center justify-between">
              <span>Channel Spectrogram</span>
              <span className="text-[10px] text-slate-400 font-normal">22 CI Bands</span>
            </div>
            
            <div className="flex items-stretch">
              {/* Y-axis: CI Channel labels */}
              <div className="flex flex-col justify-between pr-1.5 text-[9px] font-mono text-slate-400 text-right select-none py-1 h-28">
                <span>1</span>
                <span>6</span>
                <span>11</span>
                <span>16</span>
                <span>22</span>
              </div>

              {/* Heatmap Canvas */}
              <div className="flex-1 relative rounded-md overflow-hidden border border-slate-300 shadow-2xs h-28">
                <canvas
                  ref={heatmapCanvasRef}
                  width={260}
                  height={112}
                  className="w-full h-full block"
                />
              </div>

              <div className="absolute -left-3 top-1/2 -rotate-90 -translate-y-1/2 text-[9px] text-slate-400 font-medium tracking-tight pointer-events-none hidden">
                CI Channel
              </div>
            </div>

            {/* X-axis: Time (s) */}
            <div className="flex justify-between pl-5 text-[9px] font-mono text-slate-400 mt-1 select-none">
              <span>0</span>
              <span>1</span>
              <span>2</span>
              <span>3</span>
              <span>4</span>
              <span>5</span>
            </div>
            <div className="text-center text-[9px] text-slate-400 -mt-1">
              Time (s)
            </div>
          </div>
        )}

        {/* Right: Electrode Stimulation Pattern (Electrodogram) */}
        {(activeTab === 'both' || activeTab === 'electrodes') && (
          <div>
            <div className="text-[11px] font-semibold text-slate-700 mb-1 flex items-center justify-between">
              <span>Electrode Stimulation Pattern</span>
              <span className="text-[10px] text-purple-600 font-medium">Biphasic Pulses</span>
            </div>

            <div className="flex items-stretch">
              {/* Y-axis: Electrode Numbers 1, 6, 11, 16, 22 */}
              <div className="flex flex-col justify-between pr-1.5 text-[9px] font-mono text-slate-400 text-right select-none py-1 h-28">
                <span>1</span>
                <span>6</span>
                <span>11</span>
                <span>16</span>
                <span>22</span>
              </div>

              {/* Electrodogram Canvas */}
              <div className="flex-1 relative rounded-md overflow-hidden border border-slate-200 bg-white shadow-2xs h-28">
                <canvas
                  ref={electrodogramCanvasRef}
                  width={260}
                  height={112}
                  className="w-full h-full block"
                />
              </div>
            </div>

            {/* X-axis: Time (s) */}
            <div className="flex justify-between pl-5 text-[9px] font-mono text-slate-400 mt-1 select-none">
              <span>0</span>
              <span>1</span>
              <span>2</span>
              <span>3</span>
              <span>4</span>
              <span>5</span>
            </div>
            <div className="text-center text-[9px] text-slate-400 -mt-1">
              Time (s)
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

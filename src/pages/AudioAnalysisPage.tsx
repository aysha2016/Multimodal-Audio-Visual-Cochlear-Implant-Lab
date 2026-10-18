import React, { useState, useRef, useEffect } from 'react';
import { Activity, Sliders, Volume2, Waves } from 'lucide-react';
import { SimulationState } from '../types';

interface AudioAnalysisProps {
  state: SimulationState;
}

export const AudioAnalysisPage: React.FC<AudioAnalysisProps> = ({ state }) => {
  const [fftSize, setFftSize] = useState<number>(512);
  const [windowType, setWindowType] = useState<string>('Hamming');
  const [freqMax, setFreqMax] = useState<number>(8000);

  const melCanvasRef = useRef<HTMLCanvasElement>(null);

  // Render 64-band Mel Spectrogram
  useEffect(() => {
    const canvas = melCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const melBands = 48;
    const timeSlices = 100;
    const cellW = width / timeSlices;
    const cellH = height / melBands;

    const noiseFactor = Math.max(0.04, (20 - state.snr) / 28);

    for (let t = 0; t < timeSlices; t++) {
      const timeVal = (t / timeSlices) * state.duration;

      for (let m = 0; m < melBands; m++) {
        const melNorm = 1 - m / melBands; // high at top
        
        // Formant resonance centers
        const formant1 = Math.exp(-Math.pow(melNorm - 0.2, 2) * 35) * (0.6 + 0.4 * Math.sin(timeVal * 5));
        const formant2 = Math.exp(-Math.pow(melNorm - 0.5, 2) * 40) * (0.5 + 0.5 * Math.cos(timeVal * 4));
        const formant3 = Math.exp(-Math.pow(melNorm - 0.78, 2) * 50) * (0.4 + 0.3 * Math.sin(timeVal * 7));
        const noise = Math.random() * noiseFactor * (state.backgroundNoise === 'Clean' ? 0.05 : 0.7);

        const energy = Math.min(1.0, formant1 + formant2 + formant3 + noise);

        // Color map: Viridis / Blue to Amber
        const r = Math.floor(energy * 240);
        const g = Math.floor(Math.sin(energy * Math.PI) * 200 + energy * 40);
        const b = Math.floor((1 - energy) * 220 + 30);

        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(t * cellW, m * cellH, cellW + 0.5, cellH + 0.5);
      }
    }

    // Current playhead
    const cursorX = (state.currentTime / state.duration) * width;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cursorX, 0);
    ctx.lineTo(cursorX, height);
    ctx.stroke();
  }, [state.currentTime, state.duration, state.snr, state.backgroundNoise]);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Acoustic Signal & Mel-Scale Spectrogram Analysis
          </h1>
          <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold tracking-wide">
            SIMULATED
          </span>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Spectral decomposition, harmonic tracking, and noise floor estimation for cochlear implant preprocessing.
        </p>
      </div>

      {/* Top 4 Real-Time Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Estimated SNR</span>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1">
            {state.snr > 0 ? `+${state.snr}` : state.snr} dB
          </div>
          <span className="text-[10px] text-purple-600 font-semibold">{state.backgroundNoise}</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Speech Activity (VAD)</span>
          <div className="text-2xl font-bold font-mono text-emerald-600 mt-1">
            {state.isPlaying ? '78.4%' : '0.0%'}
          </div>
          <span className="text-[10px] text-slate-400">Voiced Syllables</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Spectral Energy</span>
          <div className="text-2xl font-bold font-mono text-blue-600 mt-1">
            -24.8 dBFS
          </div>
          <span className="text-[10px] text-slate-400">RMS Energy Level</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Fundamental F0</span>
          <div className="text-2xl font-bold font-mono text-indigo-600 mt-1">
            {state.soundType.includes('Female') ? '214 Hz' : state.soundType.includes('Child') ? '280 Hz' : '128 Hz'}
          </div>
          <span className="text-[10px] text-slate-400">Pitch Tracker</span>
        </div>
      </div>

      {/* Main Mel Spectrogram Viewport */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Waves className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">High-Resolution 48-Band Mel Spectrogram</h3>
          </div>
          <span className="text-xs font-mono text-slate-500">
            Window: {windowType} · FFT: {fftSize} pts · Range: 100 - {freqMax} Hz
          </span>
        </div>

        <div className="relative rounded-xl overflow-hidden border border-slate-300 shadow-inner h-64 bg-slate-950">
          <canvas
            ref={melCanvasRef}
            width={720}
            height={256}
            className="w-full h-full block"
          />
        </div>

        {/* FFT Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100 text-xs">
          <div>
            <label className="block text-slate-600 font-medium mb-1">FFT Transform Size</label>
            <div className="flex gap-2">
              {[256, 512, 1024].map((sz) => (
                <button
                  key={sz}
                  onClick={() => setFftSize(sz)}
                  className={`flex-1 py-1.5 rounded-lg font-mono border font-semibold ${
                    fftSize === sz ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {sz}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-slate-600 font-medium mb-1">Windowing Function</label>
            <select
              value={windowType}
              onChange={(e) => setWindowType(e.target.value)}
              className="w-full py-1.5 px-2 bg-white border border-slate-200 rounded-lg text-slate-700"
            >
              <option>Hamming</option>
              <option>Hanning</option>
              <option>Blackman-Harris</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-600 font-medium mb-1">Upper Frequency Cutoff</label>
            <select
              value={freqMax}
              onChange={(e) => setFreqMax(parseInt(e.target.value, 10))}
              className="w-full py-1.5 px-2 bg-white border border-slate-200 rounded-lg text-slate-700"
            >
              <option value="4000">4,000 Hz (Speech Telecom)</option>
              <option value="8000">8,000 Hz (Standard CI Bandwidth)</option>
              <option value="12000">12,000 Hz (Extended High-Freq)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

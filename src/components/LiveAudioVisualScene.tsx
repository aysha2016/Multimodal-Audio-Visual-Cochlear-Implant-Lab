import React, { useRef, useEffect, useState } from 'react';
import { 
  Play, 
  Pause, 
  Camera, 
  Mic, 
  MicOff, 
  Volume2, 
  ChevronDown 
} from 'lucide-react';
import { SimulationState, AudioMode } from '../types';
import { getLipLandmarks } from '../services/simulationEngine';
import { speechAudioEngine } from '../services/speechAudioEngine';
import { AnimatedSpeakerVideo } from './AnimatedSpeakerVideo';

interface LiveAVSceneProps {
  state: SimulationState;
  onUpdateState: (updates: Partial<SimulationState>) => void;
}

export const LiveAudioVisualScene: React.FC<LiveAVSceneProps> = ({
  state,
  onUpdateState,
}) => {
  const [audioModeOpen, setAudioModeOpen] = useState(false);
  const webcamVideoRef = useRef<HTMLVideoElement>(null);
  const audioCanvasRef = useRef<HTMLCanvasElement>(null);
  const spectrogramCanvasRef = useRef<HTMLCanvasElement>(null);
  const [webcamActive, setWebcamActive] = useState(false);
  const [webcamError, setWebcamError] = useState<string | null>(null);

  const { isPlaying, currentTime, duration, snr, backgroundNoise, audioMode, targetSpeaker } = state;

  // Toggle Webcam
  const toggleWebcam = async () => {
    if (webcamActive) {
      if (webcamVideoRef.current && webcamVideoRef.current.srcObject) {
        const stream = webcamVideoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
        webcamVideoRef.current.srcObject = null;
      }
      setWebcamActive(false);
      onUpdateState({ useWebcam: false });
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (webcamVideoRef.current) {
          webcamVideoRef.current.srcObject = stream;
          webcamVideoRef.current.play();
        }
        setWebcamActive(true);
        setWebcamError(null);
        onUpdateState({ useWebcam: true });
      } catch {
        setWebcamError('Camera/Mic permission not granted. Falling back to Simulated Live mode.');
        setTimeout(() => setWebcamError(null), 4000);
      }
    }
  };

  // Draw Live Waveform synchronized with exact phonetic sentence trajectory
  useEffect(() => {
    const canvas = audioCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Baseline axis
    ctx.beginPath();
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    // Noise factor according to SNR
    const noiseLevel = Math.max(0.04, (20 - snr) / 36);
    const primaryColor = audioMode === 'Clean Speech' ? '#3B82F6' : audioMode === 'Noisy Speech' ? '#6366F1' : '#8B5CF6';

    ctx.beginPath();
    ctx.lineWidth = 2;
    ctx.strokeStyle = primaryColor;

    const pointsCount = 200;

    for (let i = 0; i < pointsCount; i++) {
      const x = (i / pointsCount) * width;
      const tAtPoint = (i / pointsCount) * duration;

      const pointMesh = getLipLandmarks(tAtPoint, 100, true, targetSpeaker);
      const speechAmp = pointMesh.acousticEnergy;

      const pitchFreq = targetSpeaker === 'Speaker 2' ? 120 : 190;
      const carrier = Math.sin(tAtPoint * pitchFreq * Math.PI * 0.4);
      const formantMod = Math.sin(tAtPoint * 1400 * Math.PI * 0.08) * 0.35;
      const noise = (Math.random() - 0.5) * noiseLevel * (audioMode === 'Clean Speech' ? 0.08 : 0.65);

      const amp = (speechAmp * (carrier + formantMod) + noise) * (height * 0.44);
      const y = height / 2 + (isPlaying ? amp : amp * 0.35);

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Subtle vertical playhead cursor synchronized with current playback
    const cursorX = (currentTime / duration) * width;
    ctx.beginPath();
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([2, 2]);
    ctx.moveTo(cursorX, 0);
    ctx.lineTo(cursorX, height);
    ctx.stroke();
    ctx.setLineDash([]);
  }, [currentTime, duration, isPlaying, snr, audioMode, targetSpeaker]);

  // Draw Live Spectrogram synchronized with phonetic sentence
  useEffect(() => {
    const canvas = spectrogramCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const cols = 120;
    const rows = 36;
    const cellW = width / cols;
    const cellH = height / rows;

    const noiseFactor = Math.max(0.02, (20 - snr) / 32);

    for (let c = 0; c < cols; c++) {
      const timeProg = (c / cols) * duration;
      const pointMesh = getLipLandmarks(timeProg, 100, true, targetSpeaker);
      const speechAmp = pointMesh.acousticEnergy;
      const spread = pointMesh.mouthWidth;

      for (let r = 0; r < rows; r++) {
        const freqNorm = 1 - r / rows;

        // Dynamic formant shifts matching the vowel:
        const targetF2 = 0.35 + 0.30 * spread;
        const f1Dist = Math.abs(freqNorm - 0.22);
        const f2Dist = Math.abs(freqNorm - targetF2);
        const f3Dist = Math.abs(freqNorm - 0.72);

        const speechEnergy = speechAmp * (
          Math.exp(-f1Dist * 24) * 0.75 +
          Math.exp(-f2Dist * 28) * 0.85 +
          Math.exp(-f3Dist * 32) * 0.40
        );

        const noise = Math.random() * noiseFactor * (backgroundNoise === 'Clean' ? 0.05 : 0.65);
        const intensity = Math.min(1.0, speechEnergy + noise);

        let rVal = 0, gVal = 0, bVal = 0;
        if (intensity < 0.2) {
          rVal = 15; gVal = 23; bVal = Math.floor(intensity * 5 * 180 + 40);
        } else if (intensity < 0.45) {
          const norm = (intensity - 0.2) / 0.25;
          rVal = Math.floor(norm * 40);
          gVal = Math.floor(norm * 180 + 20);
          bVal = 220;
        } else if (intensity < 0.75) {
          const norm = (intensity - 0.45) / 0.3;
          rVal = Math.floor(norm * 220 + 35);
          gVal = 220;
          bVal = Math.floor((1 - norm) * 160);
        } else {
          const norm = (intensity - 0.75) / 0.25;
          rVal = 245;
          gVal = Math.floor((1 - norm) * 180 + 40);
          bVal = 20;
        }

        ctx.fillStyle = `rgb(${rVal}, ${gVal}, ${bVal})`;
        ctx.fillRect(c * cellW, r * cellH, cellW + 0.5, cellH + 0.5);
      }
    }

    // Active time cursor
    const cursorX = (currentTime / duration) * width;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.moveTo(cursorX, 0);
    ctx.lineTo(cursorX, height);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }, [currentTime, duration, snr, backgroundNoise, targetSpeaker]);

  const togglePlay = () => {
    speechAudioEngine.init();
    speechAudioEngine.resume();
    onUpdateState({ isPlaying: !isPlaying });
  };

  const audioModeOptions: AudioMode[] = [
    'Clean Speech',
    'Noisy Speech',
    'Enhanced Speech',
    'Mixed Audio'
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
      {/* Top Header of the Card */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 leading-tight">
              Live Audio-Visual Scene
            </h2>
            <p className="text-xs text-slate-500">
              Real-time audio and visual speech input ({webcamActive ? 'Hardware Live' : 'simulated'}).
            </p>
          </div>
        </div>

        {/* Status badges */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-[11px] font-medium text-slate-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Live</span>
          </div>
          <div className="px-2 py-1 rounded bg-slate-100 text-[11px] font-mono text-slate-600">
            30 FPS
          </div>
          <button
            onClick={toggleWebcam}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
              webcamActive 
                ? 'bg-purple-600 text-white border-purple-600' 
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
            title="Toggle Camera + Microphone input"
          >
            {webcamActive ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5 text-slate-400" />}
            <span>Camera + Mic</span>
          </button>
        </div>
      </div>

      {webcamError && (
        <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
          {webcamError}
        </div>
      )}

      {/* Grid: Left Video Preview + Right Audio Input */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Video Area with Moving Lips and Exact Tracking (7 cols) */}
        <div className="lg:col-span-7">
          <AnimatedSpeakerVideo
            state={state}
            onUpdateState={onUpdateState}
            webcamActive={webcamActive}
            onToggleWebcam={toggleWebcam}
            webcamVideoRef={webcamVideoRef}
          />
        </div>

        {/* Right: Audio Input Panel (5 cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between bg-slate-50/60 rounded-xl p-3.5 border border-slate-200/80">
          {/* Header of Audio Input */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-blue-100 text-blue-600 flex items-center justify-center">
                <Volume2 className="w-3.5 h-3.5" />
              </div>
              <span className="text-sm font-bold text-slate-900">Audio Input</span>
            </div>

            <div className="flex items-center gap-1.5">
              <div className="relative">
                <button
                  onClick={() => setAudioModeOpen(!audioModeOpen)}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                >
                  <span>{audioMode}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {audioModeOpen && (
                  <div className="absolute right-0 mt-1 w-36 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-30 text-xs">
                    {audioModeOptions.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => {
                          speechAudioEngine.init();
                          speechAudioEngine.resume();
                          onUpdateState({ audioMode: opt });
                          setAudioModeOpen(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 hover:bg-blue-50 transition-colors ${
                          audioMode === opt ? 'font-bold text-blue-600 bg-blue-50/50' : 'text-slate-700'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Instant Audio Audition Switcher Bar: Clean vs Noisy vs Enhanced */}
          <div className="bg-slate-100/80 p-1 rounded-xl mb-2 flex items-center justify-between gap-1 text-[11px] font-semibold">
            <button
              onClick={() => {
                speechAudioEngine.init();
                speechAudioEngine.resume();
                onUpdateState({ audioMode: 'Clean Speech' });
                speechAudioEngine.previewCondition('clean', state.snr, state.backgroundNoise, state.targetSpeaker === 'Speaker 2' ? 'male' : 'female');
              }}
              className={`flex-1 py-1 px-1.5 rounded-lg text-center transition-all cursor-pointer flex items-center justify-center gap-1 ${
                audioMode === 'Clean Speech'
                  ? 'bg-white text-blue-600 shadow-xs font-bold border border-blue-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
              title="Hear pure clean human voice without noise"
            >
              <span>Clean Speech</span>
            </button>

            <button
              onClick={() => {
                speechAudioEngine.init();
                speechAudioEngine.resume();
                onUpdateState({ audioMode: 'Noisy Speech' });
                speechAudioEngine.previewCondition('noisy', state.snr, state.backgroundNoise, state.targetSpeaker === 'Speaker 2' ? 'male' : 'female');
              }}
              className={`flex-1 py-1 px-1.5 rounded-lg text-center transition-all cursor-pointer flex items-center justify-center gap-1 ${
                audioMode === 'Noisy Speech'
                  ? 'bg-amber-500 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
              title="Hear speech masked in restaurant/street noise at current SNR"
            >
              <span>Noisy ({state.snr > 0 ? `+${state.snr}` : state.snr}dB)</span>
            </button>

            <button
              onClick={() => {
                speechAudioEngine.init();
                speechAudioEngine.resume();
                onUpdateState({ audioMode: 'Enhanced Speech', processingMode: 'Audio + Visual' });
                speechAudioEngine.previewCondition('enhanced', state.snr, state.backgroundNoise, state.targetSpeaker === 'Speaker 2' ? 'male' : 'female');
              }}
              className={`flex-1 py-1 px-1.5 rounded-lg text-center transition-all cursor-pointer flex items-center justify-center gap-1 ${
                audioMode === 'Enhanced Speech'
                  ? 'bg-purple-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
              title="Hear AI multimodal noise reduction (Audio + Visual)"
            >
              <span>AV Enhanced</span>
            </button>
          </div>

          {/* Dynamic Waveform Display */}
          <div className="bg-white rounded-lg p-2 border border-slate-200/80 shadow-2xs mb-2 flex items-center gap-2">
            <button
              onClick={togglePlay}
              className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shrink-0 shadow-xs transition-colors cursor-pointer"
              title={isPlaying ? 'Pause' : 'Play audio'}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
            </button>
            <div className="flex-1 h-12 relative">
              <canvas
                ref={audioCanvasRef}
                width={360}
                height={48}
                className="w-full h-full block"
              />
            </div>
          </div>

          {/* Synchronized Live Speech Transcript Ribbon */}
          <div className="bg-white rounded-lg px-2.5 py-1.5 border border-slate-200/80 shadow-2xs mb-2 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1 text-[11px] font-medium text-slate-700 overflow-x-auto">
              <span className="text-slate-400 font-mono mr-1">Voice:</span>
              <span className={`px-1 py-0.5 rounded transition-colors ${currentTime >= 0.0 && currentTime < 0.7 ? 'bg-purple-100 text-purple-700 font-bold' : 'text-slate-600'}`}>
                Multimodal
              </span>
              <span className={`px-1 py-0.5 rounded transition-colors ${currentTime >= 0.7 && currentTime < 1.6 ? 'bg-purple-100 text-purple-700 font-bold' : 'text-slate-600'}`}>
                speech
              </span>
              <span className={`px-1 py-0.5 rounded transition-colors ${currentTime >= 1.6 && currentTime < 2.8 ? 'bg-purple-100 text-purple-700 font-bold' : 'text-slate-600'}`}>
                improves
              </span>
              <span className={`px-1 py-0.5 rounded transition-colors ${currentTime >= 2.8 && currentTime < 3.8 ? 'bg-purple-100 text-purple-700 font-bold' : 'text-slate-600'}`}>
                cochlear
              </span>
              <span className={`px-1 py-0.5 rounded transition-colors ${currentTime >= 3.8 ? 'bg-purple-100 text-purple-700 font-bold' : 'text-slate-600'}`}>
                implants.
              </span>
            </div>
            <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 shrink-0">
              {audioMode === 'Clean Speech' ? 'Natural Studio' : audioMode === 'Noisy Speech' ? `${snr}dB SNR` : 'AV Clean'}
            </span>
          </div>

          {/* Spectrogram (Live) with exact scientific axes */}
          <div className="flex-1 flex flex-col justify-end">
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium mb-1">
              <span>Spectrogram (Live)</span>
              <span className="font-mono text-[10px] text-slate-400">FFT: 512 pts</span>
            </div>

            <div className="relative flex">
              {/* Y-axis: Frequency (kHz) */}
              <div className="flex flex-col justify-between pr-1.5 text-[9px] font-mono text-slate-400 text-right select-none py-1 h-28">
                <span>8</span>
                <span>4</span>
                <span>1</span>
                <span>0.1</span>
              </div>

              {/* Spectrogram Canvas */}
              <div className="flex-1 relative rounded-md overflow-hidden border border-slate-300 shadow-2xs h-28">
                <canvas
                  ref={spectrogramCanvasRef}
                  width={340}
                  height={112}
                  className="w-full h-full block"
                />
              </div>

              {/* Vertical Y-axis label */}
              <div className="absolute -left-5 top-1/2 -rotate-90 -translate-y-1/2 text-[9px] text-slate-400 font-medium tracking-tight pointer-events-none hidden sm:block">
                Freq (kHz)
              </div>
            </div>

            {/* X-axis: Time (s) */}
            <div className="flex justify-between pl-6 text-[9px] font-mono text-slate-400 mt-1 select-none">
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
        </div>
      </div>
    </div>
  );
};

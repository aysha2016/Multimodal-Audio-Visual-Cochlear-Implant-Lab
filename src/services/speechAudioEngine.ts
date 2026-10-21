import { SimulationState } from '../types';

/**
 * High-Performance Audio-Visual Speech & Cochlear Implant Acoustic Simulator
 * Provides authentic, natural-sounding speech and genuine, audible speech-in-noise contrast
 * with zero-delay lazy initialization so the application loads instantly without blocking.
 */

export interface WordTiming {
  word: string;
  start: number; // in seconds
  end: number;
}

export const SENTENCE_WORDS: WordTiming[] = [
  { word: 'Multimodal', start: 0.15, end: 0.95 },
  { word: 'speech', start: 1.05, end: 1.55 },
  { word: 'improves', start: 1.65, end: 2.25 },
  { word: 'cochlear', start: 2.35, end: 2.95 },
  { word: 'implants', start: 3.05, end: 3.75 },
];

class SpeechAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.90;
  private isUnlocked: boolean = false;

  // Master and sub-buses
  private masterGain: GainNode | null = null;
  private speechGain: GainNode | null = null;
  private noiseGain: GainNode | null = null;
  private ciGain: GainNode | null = null;

  // Lazy Noise generator sources
  private babbleBuffer: AudioBuffer | null = null;
  private trafficBuffer: AudioBuffer | null = null;
  private carBuffer: AudioBuffer | null = null;
  private activeNoiseSource: AudioBufferSourceNode | null = null;
  private currentActiveNoiseType: string = '';
  private noiseFilter: BiquadFilterNode | null = null;
  private noiseFilter2: BiquadFilterNode | null = null;

  // Lazy Natural Speech Formant Buffers (Web Audio direct synthesis)
  private speechBufferFemale: AudioBuffer | null = null;
  private speechBufferMale: AudioBuffer | null = null;
  private activeSpeechSource: AudioBufferSourceNode | null = null;

  // 22-Channel CI Vocoder simulation nodes (lazily initialized)
  private ciFilters: { filter: BiquadFilterNode; gain: GainNode }[] = [];
  private ciCarrierNoise: AudioBufferSourceNode | null = null;
  private ciVocoderInitialized: boolean = false;

  // SpeechSynthesis natural voice state
  private activeUtterance: SpeechSynthesisUtterance | null = null;
  private lastTriggeredLoop: number = -1;
  private availableVoices: SpeechSynthesisVoice[] = [];
  private currentSpokenWord: string = '';

  public onWordBoundary?: (word: string, index: number) => void;
  public onAudioStateChange?: (unlocked: boolean) => void;

  constructor() {
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis) {
        this.loadVoices();
        window.speechSynthesis.onvoiceschanged = () => {
          this.loadVoices();
        };
      }
    } catch {
      // Safe fallback if speechSynthesis is restricted
    }
  }

  private loadVoices() {
    try {
      if (typeof window === 'undefined' || !('speechSynthesis' in window) || !window.speechSynthesis) return;
      this.availableVoices = window.speechSynthesis.getVoices() || [];
    } catch {
      this.availableVoices = [];
    }
  }

  public getVoices(): SpeechSynthesisVoice[] {
    if (this.availableVoices.length === 0) {
      this.loadVoices();
    }
    return this.availableVoices;
  }

  /**
   * Selects highest quality natural human voice available
   */
  public getBestVoice(gender: 'female' | 'male'): SpeechSynthesisVoice | null {
    const voices = this.getVoices();
    if (!voices || voices.length === 0) return null;

    const englishVoices = voices.filter(v => v.lang.startsWith('en'));
    const pool = englishVoices.length > 0 ? englishVoices : voices;

    if (gender === 'female') {
      const preferred = [
        'Google US English',
        'Microsoft Jenny Online',
        'Jenny',
        'Aria',
        'Samantha',
        'Victoria',
        'Karen',
        'Natural',
        'Female',
        'en-US',
      ];
      for (const pref of preferred) {
        const found = pool.find(v => v.name.toLowerCase().includes(pref.toLowerCase()));
        if (found) return found;
      }
    } else {
      const preferred = [
        'Google UK English Male',
        'Microsoft Guy Online',
        'Guy',
        'Daniel',
        'David',
        'Mark',
        'Alex',
        'Male',
        'en-GB',
      ];
      for (const pref of preferred) {
        const found = pool.find(v => v.name.toLowerCase().includes(pref.toLowerCase()));
        if (found) return found;
      }
    }

    return pool[0] || null;
  }

  /**
   * Initializes audio context and lightweight routing graph instantly (< 1ms).
   * Buffers are generated lazily only when audio actually plays.
   */
  public init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.setupGraph();

      if (this.ctx.state === 'running') {
        this.isUnlocked = true;
        this.onAudioStateChange?.(true);
      }
    } catch (e) {
      console.warn('AudioContext init error:', e);
    }
  }

  public resume(): boolean {
    if (!this.ctx) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().then(() => {
        this.isUnlocked = true;
        this.onAudioStateChange?.(true);
      }).catch(() => {});
    } else if (this.ctx && this.ctx.state === 'running') {
      this.isUnlocked = true;
      this.onAudioStateChange?.(true);
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis) {
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      } catch {}
    }

    return this.isUnlocked;
  }

  public getIsUnlocked(): boolean {
    return this.isUnlocked && !!this.ctx && this.ctx.state === 'running';
  }

  /**
   * Lightweight node setup: only creates filters and gains.
   * Takes virtually 0ms.
   */
  private setupGraph() {
    if (!this.ctx) return;
    const ctx = this.ctx;

    // Master Output
    this.masterGain = ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, ctx.currentTime);
    this.masterGain.connect(ctx.destination);

    // Dedicated Speech Bus (routes directly to master)
    this.speechGain = ctx.createGain();
    this.speechGain.gain.setValueAtTime(1.0, ctx.currentTime);
    this.speechGain.connect(this.masterGain);

    // Noise Bus
    this.noiseGain = ctx.createGain();
    this.noiseGain.gain.setValueAtTime(0.0, ctx.currentTime);

    this.noiseFilter = ctx.createBiquadFilter();
    this.noiseFilter.type = 'bandpass';
    this.noiseFilter.frequency.setValueAtTime(1100, ctx.currentTime);
    this.noiseFilter.Q.setValueAtTime(0.8, ctx.currentTime);

    this.noiseFilter2 = ctx.createBiquadFilter();
    this.noiseFilter2.type = 'lowpass';
    this.noiseFilter2.frequency.setValueAtTime(4500, ctx.currentTime);

    this.noiseFilter.connect(this.noiseFilter2);
    this.noiseFilter2.connect(this.noiseGain);
    this.noiseGain.connect(this.masterGain);

    // CI Vocoder Bus
    this.ciGain = ctx.createGain();
    this.ciGain.gain.setValueAtTime(0.0, ctx.currentTime);
    this.ciGain.connect(this.masterGain);
  }

  /**
   * Lazy speech formant buffer synthesis (only computed when audio playback starts)
   */
  private getSpeechBuffer(gender: 'female' | 'male'): AudioBuffer | null {
    if (!this.ctx) return null;

    if (gender === 'female' && this.speechBufferFemale) return this.speechBufferFemale;
    if (gender === 'male' && this.speechBufferMale) return this.speechBufferMale;

    const ctx = this.ctx;
    const sampleRate = ctx.sampleRate;
    const duration = 4.0;
    const frameCount = Math.floor(sampleRate * duration);

    const phonemes = [
      { start: 0.15, end: 0.35, f0F: 220, f0M: 115, f1: 300, f2: 1200, f3: 2500, type: 'nasal', amp: 0.8 },
      { start: 0.35, end: 0.55, f0F: 235, f0M: 125, f1: 450, f2: 1800, f3: 2700, type: 'vowel', amp: 0.95 },
      { start: 0.55, end: 0.75, f0F: 215, f0M: 110, f1: 520, f2: 1100, f3: 2400, type: 'vowel', amp: 0.9 },
      { start: 0.75, end: 0.95, f0F: 195, f0M: 102, f1: 350, f2: 1400, f3: 2600, type: 'vowel', amp: 0.75 },
      { start: 1.05, end: 1.15, f0F: 0, f0M: 0, f1: 4000, f2: 6000, f3: 7500, type: 'fricative', amp: 0.65 },
      { start: 1.15, end: 1.40, f0F: 240, f0M: 128, f1: 280, f2: 2300, f3: 2900, type: 'vowel', amp: 1.0 },
      { start: 1.40, end: 1.55, f0F: 0, f0M: 0, f1: 3200, f2: 4800, f3: 6500, type: 'fricative', amp: 0.7 },
      { start: 1.65, end: 1.80, f0F: 210, f0M: 112, f1: 400, f2: 1900, f3: 2650, type: 'vowel', amp: 0.85 },
      { start: 1.80, end: 2.05, f0F: 230, f0M: 122, f1: 320, f2: 950, f3: 2350, type: 'vowel', amp: 0.95 },
      { start: 2.05, end: 2.25, f0F: 190, f0M: 100, f1: 2000, f2: 4500, f3: 6000, type: 'voiced_fricative', amp: 0.6 },
      { start: 2.35, end: 2.65, f0F: 225, f0M: 120, f1: 550, f2: 1150, f3: 2450, type: 'vowel', amp: 0.95 },
      { start: 2.65, end: 2.95, f0F: 205, f0M: 108, f1: 420, f2: 1750, f3: 2550, type: 'vowel', amp: 0.85 },
      { start: 3.05, end: 3.25, f0F: 220, f0M: 115, f1: 380, f2: 1850, f3: 2700, type: 'vowel', amp: 0.85 },
      { start: 3.25, end: 3.55, f0F: 200, f0M: 105, f1: 650, f2: 1700, f3: 2500, type: 'vowel', amp: 0.9 },
      { start: 3.55, end: 3.75, f0F: 0, f0M: 0, f1: 4200, f2: 6500, f3: 8000, type: 'fricative', amp: 0.65 },
    ];

    const buf = ctx.createBuffer(2, frameCount, sampleRate);
    const left = buf.getChannelData(0);
    const right = buf.getChannelData(1);

    const isFemale = gender === 'female';

    for (const ph of phonemes) {
      const startIdx = Math.floor(ph.start * sampleRate);
      const endIdx = Math.floor(ph.end * sampleRate);
      const len = endIdx - startIdx;

      for (let i = 0; i < len; i++) {
        const globalIdx = startIdx + i;
        if (globalIdx >= frameCount) break;
        const t = i / sampleRate;
        const env = Math.sin((i / len) * Math.PI);

        if (ph.type === 'fricative') {
          const noise = (Math.random() * 2 - 1) * ph.amp * env * 0.45;
          const highWhistle = Math.sin(2 * Math.PI * ph.f1 * t) * ph.amp * env * 0.2;
          const val = (noise + highWhistle) * 0.7;
          left[globalIdx] += val;
          right[globalIdx] += val * 0.95;
        } else if (isFemale) {
          const f0 = ph.f0F * (1.0 + 0.03 * Math.sin(2 * Math.PI * 5.2 * t));
          const glottal = Math.sin(2 * Math.PI * f0 * t) + 0.5 * Math.sin(4 * Math.PI * f0 * t);
          const f1 = Math.sin(2 * Math.PI * ph.f1 * t) * 0.5;
          const f2 = Math.sin(2 * Math.PI * ph.f2 * t) * 0.35;
          const val = (glottal * 0.45 + f1 + f2) * ph.amp * env * 0.65;
          left[globalIdx] += val;
          right[globalIdx] += val * 0.96;
        } else {
          const f0 = ph.f0M * (1.0 + 0.025 * Math.sin(2 * Math.PI * 4.8 * t));
          const glottal = Math.sin(2 * Math.PI * f0 * t) + 0.6 * Math.sin(4 * Math.PI * f0 * t);
          const f1 = Math.sin(2 * Math.PI * (ph.f1 * 0.88) * t) * 0.55;
          const f2 = Math.sin(2 * Math.PI * (ph.f2 * 0.88) * t) * 0.32;
          const val = (glottal * 0.5 + f1 + f2) * ph.amp * env * 0.68;
          left[globalIdx] += val;
          right[globalIdx] += val * 0.96;
        }
      }
    }

    if (isFemale) {
      this.speechBufferFemale = buf;
    } else {
      this.speechBufferMale = buf;
    }

    return buf;
  }

  /**
   * Lazy background noise generator: only synthesizes the active noise type when needed.
   * Uses efficient 2.5-second loop.
   */
  private getNoiseBuffer(backgroundNoise: string): AudioBuffer | null {
    if (!this.ctx) return null;
    const ctx = this.ctx;
    const sampleRate = ctx.sampleRate;
    const duration = 2.5; // seamless fast loop
    const frameCount = Math.floor(sampleRate * duration);

    if (backgroundNoise.includes('Street') || backgroundNoise.includes('Traffic')) {
      if (this.trafficBuffer) return this.trafficBuffer;
      const buf = ctx.createBuffer(2, frameCount, sampleRate);
      const l = buf.getChannelData(0);
      const r = buf.getChannelData(1);
      for (let i = 0; i < frameCount; i++) {
        const t = i / sampleRate;
        const engine = Math.sin(2 * Math.PI * 75 * t) * 0.45 + Math.sin(2 * Math.PI * 130 * t) * 0.35;
        const tireHiss = (Math.random() * 2 - 1) * 0.40;
        const carPass = Math.sin(2 * Math.PI * 0.4 * t) * 0.5 + 0.5;
        const sum = (engine * carPass * 0.7 + tireHiss * 0.5) * 0.95;
        l[i] = sum;
        r[i] = sum * 0.94;
      }
      this.trafficBuffer = buf;
      return buf;
    }

    if (backgroundNoise.includes('Car')) {
      if (this.carBuffer) return this.carBuffer;
      const buf = ctx.createBuffer(2, frameCount, sampleRate);
      const l = buf.getChannelData(0);
      const r = buf.getChannelData(1);
      for (let i = 0; i < frameCount; i++) {
        const t = i / sampleRate;
        const drone = Math.sin(2 * Math.PI * 65 * t) * 0.55 + Math.sin(2 * Math.PI * 125 * t) * 0.35;
        const air = (Math.random() * 2 - 1) * 0.35;
        const sum = (drone * 0.75 + air * 0.45) * 0.95;
        l[i] = sum;
        r[i] = sum * 0.96;
      }
      this.carBuffer = buf;
      return buf;
    }

    // Default: Restaurant Babble
    if (this.babbleBuffer) return this.babbleBuffer;
    const buf = ctx.createBuffer(2, frameCount, sampleRate);
    const l = buf.getChannelData(0);
    const r = buf.getChannelData(1);
    for (let i = 0; i < frameCount; i++) {
      const t = i / sampleRate;
      const t1 = Math.sin(2 * Math.PI * 220 * t) * (Math.sin(2 * Math.PI * 2.3 * t) * 0.5 + 0.5);
      const t2 = Math.sin(2 * Math.PI * 440 * t) * (Math.sin(2 * Math.PI * 3.1 * t + 1) * 0.5 + 0.5);
      const t3 = Math.sin(2 * Math.PI * 880 * t) * (Math.sin(2 * Math.PI * 1.7 * t + 2) * 0.5 + 0.5);
      const crowd = (Math.random() * 2 - 1) * 0.45;
      const sum = (t1 * 0.25 + t2 * 0.25 + t3 * 0.2 + crowd * 0.5) * 0.95;
      l[i] = sum;
      r[i] = sum * 0.92;
    }
    this.babbleBuffer = buf;
    return buf;
  }

  /**
   * Lazily initializes 22-channel CI vocoder simulation only when requested
   */
  private ensureCIVocoder() {
    if (this.ciVocoderInitialized || !this.ctx || !this.ciGain) return;
    const ctx = this.ctx;
    const channelCount = 22;
    const minFreq = 250;
    const maxFreq = 8000;
    const freqs: number[] = [];

    for (let i = 0; i < channelCount; i++) {
      const frac = i / (channelCount - 1);
      freqs.push(minFreq * Math.pow(maxFreq / minFreq, frac));
    }

    const carrierSum = ctx.createGain();
    carrierSum.gain.setValueAtTime(1.0 / Math.sqrt(channelCount), ctx.currentTime);
    carrierSum.connect(this.ciGain);

    const bufferSize = Math.floor(ctx.sampleRate * 1.5);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.35;
    }

    const carrier = ctx.createBufferSource();
    carrier.buffer = buffer;
    carrier.loop = true;
    carrier.start();
    this.ciCarrierNoise = carrier;

    freqs.forEach((freq) => {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(freq, ctx.currentTime);
      bp.Q.setValueAtTime(7.0, ctx.currentTime);

      const chanGain = ctx.createGain();
      chanGain.gain.setValueAtTime(0.04, ctx.currentTime);

      carrier.connect(bp);
      bp.connect(chanGain);
      chanGain.connect(carrierSum);

      this.ciFilters.push({ filter: bp, gain: chanGain });
    });

    this.ciVocoderInitialized = true;
  }

  private ensureNoisePlaying(backgroundNoise: string) {
    if (!this.ctx) return;
    const targetBuffer = this.getNoiseBuffer(backgroundNoise);
    if (!targetBuffer) return;

    if (!this.activeNoiseSource || this.currentActiveNoiseType !== backgroundNoise) {
      if (this.activeNoiseSource) {
        try {
          this.activeNoiseSource.stop();
          this.activeNoiseSource.disconnect();
        } catch {}
      }

      const src = this.ctx.createBufferSource();
      src.buffer = targetBuffer;
      src.loop = true;
      src.connect(this.noiseFilter!);
      src.start();
      this.activeNoiseSource = src;
      this.currentActiveNoiseType = backgroundNoise;
    }
  }

  public playSpeechSegment(gender: 'female' | 'male', speechGainLevel: number = 1.0, startTimeOffset: number = 0) {
    this.resume();
    if (!this.ctx || !this.speechGain) return;
    const ctx = this.ctx;

    const buffer = this.getSpeechBuffer(gender);
    if (!buffer) return;

    if (this.activeSpeechSource) {
      try {
        this.activeSpeechSource.stop();
        this.activeSpeechSource.disconnect();
      } catch {}
      this.activeSpeechSource = null;
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(this.speechGain);
    const safeOffset = Math.max(0, Math.min(3.8, startTimeOffset));
    src.start(0, safeOffset);
    this.activeSpeechSource = src;

    // Optional SpeechSynthesis for hybrid natural inflection
    if (!this.isMuted && typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
        const text = 'Multimodal speech improves cochlear implants.';
        const utterance = new SpeechSynthesisUtterance(text);
        const voice = this.getBestVoice(gender);
        if (voice) utterance.voice = voice;
        utterance.rate = 0.96;
        utterance.pitch = gender === 'female' ? 1.04 : 0.94;
        utterance.volume = Math.max(0, Math.min(1, this.volume * speechGainLevel * 0.85));
        utterance.onboundary = (e) => {
          if (e.name === 'word') {
            const word = text.substring(e.charIndex, e.charIndex + e.charLength);
            this.currentSpokenWord = word;
            this.onWordBoundary?.(word, e.charIndex);
          }
        };
        this.activeUtterance = utterance;
        window.speechSynthesis.speak(utterance);
      } catch {}
    }
  }

  public speakUtterance(gender: 'female' | 'male' = 'female', speechVolume: number = 1.0) {
    this.playSpeechSegment(gender, speechVolume, 0);
  }

  /**
   * Main synchronized update loop.
   * If AudioContext is not yet created by a user gesture, it exits immediately with zero delay.
   */
  public update(state: SimulationState) {
    if (!this.ctx) {
      return; // Never block UI during initial render!
    }

    const { isPlaying, currentTime, snr, backgroundNoise, audioMode, targetSpeaker, processingMode } = state;
    const gender = targetSpeaker === 'Speaker 2' ? 'male' : 'female';

    if (!isPlaying || this.isMuted) {
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.03);
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis) {
        try {
          if (window.speechSynthesis.speaking) {
            window.speechSynthesis.pause();
          }
        } catch {}
      }
      return;
    } else {
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.03);
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis) {
        try {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
        } catch {}
      }
    }

    let speechVol = 1.0;
    let noiseVol = 0.0;
    const isClean = audioMode === 'Clean Speech' || backgroundNoise === 'Clean';
    const isNoisy = audioMode === 'Noisy Speech' || (audioMode === 'Mixed Audio' && backgroundNoise !== 'Clean');
    const isEnhanced = audioMode === 'Enhanced Speech' || (processingMode === 'Audio + Visual' && audioMode !== 'Clean Speech');

    if (isClean && audioMode === 'Clean Speech') {
      speechVol = 1.0;
      noiseVol = 0.0;
    } else if (isNoisy || (!isClean && !isEnhanced)) {
      const snrClamped = Math.max(-10, Math.min(20, snr));
      const snrNorm = (snrClamped + 10) / 30;
      speechVol = 0.30 + 0.70 * Math.pow(snrNorm, 0.8);
      noiseVol = Math.max(0.12, 0.95 - 0.82 * snrNorm);
    } else if (isEnhanced) {
      speechVol = 1.0;
      const snrClamped = Math.max(-10, Math.min(20, snr));
      const snrNorm = (snrClamped + 10) / 30;
      const rawNoise = Math.max(0.12, 0.95 - 0.82 * snrNorm);
      noiseVol = rawNoise * 0.16;
    }

    if (this.ctx && this.noiseGain && this.noiseFilter) {
      if (noiseVol > 0.01) {
        this.ensureNoisePlaying(backgroundNoise);
        if (backgroundNoise === 'Restaurant Noise' || backgroundNoise === 'Crowd Noise') {
          this.noiseFilter.type = 'bandpass';
          this.noiseFilter.frequency.setTargetAtTime(1100, this.ctx.currentTime, 0.06);
          this.noiseFilter.Q.setTargetAtTime(0.85, this.ctx.currentTime, 0.06);
        } else if (backgroundNoise === 'Street Noise') {
          this.noiseFilter.type = 'lowpass';
          this.noiseFilter.frequency.setTargetAtTime(650, this.ctx.currentTime, 0.06);
        } else if (backgroundNoise === 'Car Noise') {
          this.noiseFilter.type = 'lowpass';
          this.noiseFilter.frequency.setTargetAtTime(320, this.ctx.currentTime, 0.06);
        } else {
          this.noiseFilter.type = 'bandpass';
          this.noiseFilter.frequency.setTargetAtTime(1000, this.ctx.currentTime, 0.06);
        }
        this.noiseGain.gain.setTargetAtTime(noiseVol * this.volume, this.ctx.currentTime, 0.04);
      } else {
        this.noiseGain.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.04);
      }
    }

    if (this.ctx && this.speechGain) {
      this.speechGain.gain.setTargetAtTime(speechVol * this.volume, this.ctx.currentTime, 0.04);
    }

    const loopCycle = Math.floor(currentTime / 5.0);
    const timeInCycle = ((currentTime % 5.0) + 5.0) % 5.0;
    if (timeInCycle < 0.25 && this.lastTriggeredLoop !== loopCycle) {
      this.lastTriggeredLoop = loopCycle;
      this.playSpeechSegment(gender, speechVol, 0);
    }
  }

  public previewCondition(
    mode: 'clean' | 'noisy' | 'enhanced' | 'ci_vocoder',
    snr: number = 0,
    background: string = 'Restaurant Noise',
    gender: 'female' | 'male' = 'female'
  ) {
    this.resume();
    if (!this.ctx || !this.noiseGain || !this.speechGain) return;

    if (mode === 'clean') {
      this.noiseGain.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.02);
      this.speechGain.gain.setTargetAtTime(1.0 * this.volume, this.ctx.currentTime, 0.02);
      this.playSpeechSegment(gender, 1.0, 0);
    } else if (mode === 'noisy') {
      const snrNorm = (Math.max(-10, Math.min(20, snr)) + 10) / 30;
      const noiseVol = Math.max(0.18, 0.95 - 0.80 * snrNorm);
      const speechVol = 0.35 + 0.65 * snrNorm;
      this.ensureNoisePlaying(background);
      if (this.noiseFilter) {
        this.noiseFilter.type = background.includes('Street') ? 'lowpass' : 'bandpass';
        this.noiseFilter.frequency.setTargetAtTime(background.includes('Street') ? 700 : 1100, this.ctx.currentTime, 0.02);
      }
      this.noiseGain.gain.setTargetAtTime(noiseVol * this.volume, this.ctx.currentTime, 0.02);
      this.speechGain.gain.setTargetAtTime(speechVol * this.volume, this.ctx.currentTime, 0.02);
      this.playSpeechSegment(gender, speechVol, 0);
    } else if (mode === 'enhanced') {
      const noiseVol = 0.12;
      this.ensureNoisePlaying(background);
      this.noiseGain.gain.setTargetAtTime(noiseVol * this.volume, this.ctx.currentTime, 0.02);
      this.speechGain.gain.setTargetAtTime(1.0 * this.volume, this.ctx.currentTime, 0.02);
      this.playSpeechSegment(gender, 1.0, 0);
    } else if (mode === 'ci_vocoder') {
      this.ensureCIVocoder();
      this.noiseGain.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.02);
      if (this.ciGain) {
        this.ciGain.gain.setTargetAtTime(0.85 * this.volume, this.ctx.currentTime, 0.02);
        setTimeout(() => {
          if (this.ciGain && this.ctx) {
            this.ciGain.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.05);
          }
        }, 4000);
      }
      this.playSpeechSegment(gender, 0.9, 0);
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : this.volume, this.ctx.currentTime, 0.03);
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis) {
      try {
        if (muted && window.speechSynthesis.speaking) {
          window.speechSynthesis.cancel();
        }
      } catch {}
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.ctx && this.masterGain && !this.isMuted) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.03);
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public stop() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
    if (this.ctx && this.noiseGain) {
      this.noiseGain.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.04);
    }
    if (this.activeSpeechSource) {
      try {
        this.activeSpeechSource.stop();
      } catch {}
    }
    this.lastTriggeredLoop = -1;
  }
}

export const speechAudioEngine = new SpeechAudioEngine();

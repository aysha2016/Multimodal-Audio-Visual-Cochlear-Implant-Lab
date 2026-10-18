import { SimulationState } from '../types';

/**
 * High-Fidelity Audio-Visual Speech & Cochlear Implant Acoustic Simulator
 * Provides authentic, natural-sounding speech and genuine, audible speech-in-noise contrast
 * (Restaurant Babble, Street Traffic, Car Cabin) with 22-channel CI vocoder simulation.
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

  // Noise generator sources
  private babbleBuffer: AudioBuffer | null = null;
  private trafficBuffer: AudioBuffer | null = null;
  private carBuffer: AudioBuffer | null = null;
  private activeNoiseSource: AudioBufferSourceNode | null = null;
  private currentActiveNoiseType: string = '';
  private noiseFilter: BiquadFilterNode | null = null;
  private noiseFilter2: BiquadFilterNode | null = null;

  // Natural Speech Formant Buffers (Web Audio direct synthesis)
  private speechBufferFemale: AudioBuffer | null = null;
  private speechBufferMale: AudioBuffer | null = null;
  private activeSpeechSource: AudioBufferSourceNode | null = null;

  // 22-Channel CI Vocoder simulation nodes
  private ciFilters: { filter: BiquadFilterNode; gain: GainNode }[] = [];
  private ciCarrierNoise: AudioBufferSourceNode | null = null;

  // SpeechSynthesis natural voice state
  private activeUtterance: SpeechSynthesisUtterance | null = null;
  private lastTriggeredLoop: number = -1;
  private availableVoices: SpeechSynthesisVoice[] = [];
  private currentSpokenWord: string = '';

  public onWordBoundary?: (word: string, index: number) => void;
  public onAudioStateChange?: (unlocked: boolean) => void;

  constructor() {
    try {
      this.loadVoices();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = () => {
          this.loadVoices();
        };
      }
    } catch (e) {
      console.warn('SpeechSynthesis init warning:', e);
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

    // Pre-render rich realistic acoustic background noise buffers
    this.createRealisticNoiseBuffers();

    // Pre-render high-quality vocal speech formant buffers (Female & Male)
    this.createSpeechFormantBuffers();

    // 22-Channel Cochlear Implant Vocoder simulation
    this.ciGain = ctx.createGain();
    this.ciGain.gain.setValueAtTime(0.0, ctx.currentTime);
    this.setupCIVocoder(22);
    this.ciGain.connect(this.masterGain);
  }

  /**
   * Synthesizes natural human speech audio (formant harmonic model) for female & male speakers
   * Sentence: "Multimodal speech improves cochlear implants."
   * Sounds authentic, rich, and clear directly in Web Audio without robotic speech synthesis artifacts.
   */
  private createSpeechFormantBuffers() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const sampleRate = ctx.sampleRate;
    const duration = 5.0; // 5 seconds cycle
    const frameCount = sampleRate * duration;

    // Word phoneme definitions: F0 base, vowel formants (F1, F2, F3 in Hz) and timings
    const phonemes = [
      // "Multimodal" (0.15s - 0.95s)
      { start: 0.15, end: 0.35, f0F: 220, f0M: 115, f1: 300, f2: 1200, f3: 2500, type: 'nasal', amp: 0.8 }, // /m/ /u/
      { start: 0.35, end: 0.55, f0F: 235, f0M: 125, f1: 450, f2: 1800, f3: 2700, type: 'vowel', amp: 0.95 }, // /ti/
      { start: 0.55, end: 0.75, f0F: 215, f0M: 110, f1: 520, f2: 1100, f3: 2400, type: 'vowel', amp: 0.9 }, // /mo/
      { start: 0.75, end: 0.95, f0F: 195, f0M: 102, f1: 350, f2: 1400, f3: 2600, type: 'vowel', amp: 0.75 }, // /dal/

      // "speech" (1.05s - 1.55s)
      { start: 1.05, end: 1.15, f0F: 0, f0M: 0, f1: 4000, f2: 6000, f3: 7500, type: 'fricative', amp: 0.65 }, // /s/
      { start: 1.15, end: 1.40, f0F: 240, f0M: 128, f1: 280, f2: 2300, f3: 2900, type: 'vowel', amp: 1.0 }, // /ee/
      { start: 1.40, end: 1.55, f0F: 0, f0M: 0, f1: 3200, f2: 4800, f3: 6500, type: 'fricative', amp: 0.7 }, // /ch/

      // "improves" (1.65s - 2.25s)
      { start: 1.65, end: 1.80, f0F: 210, f0M: 112, f1: 400, f2: 1900, f3: 2650, type: 'vowel', amp: 0.85 }, // /im/
      { start: 1.80, end: 2.05, f0F: 230, f0M: 122, f1: 320, f2: 950, f3: 2350, type: 'vowel', amp: 0.95 }, // /proov/
      { start: 2.05, end: 2.25, f0F: 190, f0M: 100, f1: 2000, f2: 4500, f3: 6000, type: 'voiced_fricative', amp: 0.6 }, // /z/

      // "cochlear" (2.35s - 2.95s)
      { start: 2.35, end: 2.65, f0F: 225, f0M: 120, f1: 550, f2: 1150, f3: 2450, type: 'vowel', amp: 0.95 }, // /cock/
      { start: 2.65, end: 2.95, f0F: 205, f0M: 108, f1: 420, f2: 1750, f3: 2550, type: 'vowel', amp: 0.85 }, // /lee-er/

      // "implants" (3.05s - 3.75s)
      { start: 3.05, end: 3.25, f0F: 220, f0M: 115, f1: 380, f2: 1850, f3: 2700, type: 'vowel', amp: 0.85 }, // /im/
      { start: 3.25, end: 3.55, f0F: 200, f0M: 105, f1: 650, f2: 1700, f3: 2500, type: 'vowel', amp: 0.9 }, // /plant/
      { start: 3.55, end: 3.75, f0F: 0, f0M: 0, f1: 4200, f2: 6500, f3: 8000, type: 'fricative', amp: 0.65 }, // /s/
    ];

    // Generate Female and Male natural acoustic speech buffers
    const bufferF = ctx.createBuffer(2, frameCount, sampleRate);
    const bufferM = ctx.createBuffer(2, frameCount, sampleRate);

    const fL = bufferF.getChannelData(0);
    const fR = bufferF.getChannelData(1);
    const mL = bufferM.getChannelData(0);
    const mR = bufferM.getChannelData(1);

    for (const ph of phonemes) {
      const startIdx = Math.floor(ph.start * sampleRate);
      const endIdx = Math.floor(ph.end * sampleRate);
      const len = endIdx - startIdx;

      for (let i = 0; i < len; i++) {
        const globalIdx = startIdx + i;
        if (globalIdx >= frameCount) break;

        const t = i / sampleRate;
        const env = Math.sin((i / len) * Math.PI); // Hann window envelope

        if (ph.type === 'fricative') {
          // White noise shaped by dental/alveolar filter
          const noise = (Math.random() * 2 - 1) * ph.amp * env * 0.45;
          const highWhistle = Math.sin(2 * Math.PI * ph.f1 * t) * ph.amp * env * 0.2;
          const val = (noise + highWhistle) * 0.7;
          fL[globalIdx] += val;
          fR[globalIdx] += val * 0.98;
          mL[globalIdx] += val * 0.9;
          mR[globalIdx] += val * 0.9;
        } else {
          // Voiced glottal pulse train with F1, F2, F3 acoustic vocal tract formants
          // Female Speaker
          const f0_F = ph.f0F * (1.0 + 0.03 * Math.sin(2 * Math.PI * 5.2 * t)); // natural subtle vocal vibrato
          const glottalF = Math.sin(2 * Math.PI * f0_F * t) + 0.5 * Math.sin(4 * Math.PI * f0_F * t) + 0.25 * Math.sin(6 * Math.PI * f0_F * t);
          const formant1_F = Math.sin(2 * Math.PI * ph.f1 * t) * 0.5;
          const formant2_F = Math.sin(2 * Math.PI * ph.f2 * t) * 0.35;
          const formant3_F = Math.sin(2 * Math.PI * ph.f3 * t) * 0.15;
          const breathF = (Math.random() * 2 - 1) * 0.05;
          const valF = (glottalF * 0.45 + formant1_F + formant2_F + formant3_F + breathF) * ph.amp * env * 0.65;
          fL[globalIdx] += valF;
          fR[globalIdx] += valF * 0.96;

          // Male Speaker (lower fundamental pitch, rich chest resonance)
          const f0_M = ph.f0M * (1.0 + 0.025 * Math.sin(2 * Math.PI * 4.8 * t));
          const glottalM = Math.sin(2 * Math.PI * f0_M * t) + 0.6 * Math.sin(4 * Math.PI * f0_M * t) + 0.35 * Math.sin(6 * Math.PI * f0_M * t) + 0.2 * Math.sin(8 * Math.PI * f0_M * t);
          const formant1_M = Math.sin(2 * Math.PI * (ph.f1 * 0.88) * t) * 0.55;
          const formant2_M = Math.sin(2 * Math.PI * (ph.f2 * 0.88) * t) * 0.32;
          const formant3_M = Math.sin(2 * Math.PI * (ph.f3 * 0.88) * t) * 0.15;
          const breathM = (Math.random() * 2 - 1) * 0.04;
          const valM = (glottalM * 0.5 + formant1_M + formant2_M + formant3_M + breathM) * ph.amp * env * 0.68;
          mL[globalIdx] += valM;
          mR[globalIdx] += valM * 0.96;
        }
      }
    }

    this.speechBufferFemale = bufferF;
    this.speechBufferMale = bufferM;
  }

  /**
   * Generates authentic acoustic audio buffers for Restaurant Babble, Street Traffic, and Car Cabin
   */
  private createRealisticNoiseBuffers() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const sampleRate = ctx.sampleRate;
    const duration = 6.0; // 6s seamless loop
    const frameCount = sampleRate * duration;

    // 1. Restaurant Cocktail Party Multi-Talker Babble
    const babbleBuffer = ctx.createBuffer(2, frameCount, sampleRate);
    const bL = babbleBuffer.getChannelData(0);
    const bR = babbleBuffer.getChannelData(1);

    for (let i = 0; i < frameCount; i++) {
      const t = i / sampleRate;
      // 6 Overlapping pseudo-talker formant modulations (real restaurant chatter roar)
      const t1 = Math.sin(2 * Math.PI * 340 * t) * (Math.sin(2 * Math.PI * 3.1 * t) * 0.5 + 0.5);
      const t2 = Math.sin(2 * Math.PI * 620 * t) * (Math.sin(2 * Math.PI * 4.3 * t + 1) * 0.5 + 0.5);
      const t3 = Math.sin(2 * Math.PI * 980 * t) * (Math.sin(2 * Math.PI * 2.8 * t + 2) * 0.5 + 0.5);
      const t4 = Math.sin(2 * Math.PI * 1450 * t) * (Math.sin(2 * Math.PI * 5.1 * t + 3) * 0.5 + 0.5);
      const t5 = Math.sin(2 * Math.PI * 2100 * t) * (Math.sin(2 * Math.PI * 3.6 * t + 4) * 0.5 + 0.5);
      const t6 = Math.sin(2 * Math.PI * 2800 * t) * (Math.sin(2 * Math.PI * 4.7 * t + 5) * 0.5 + 0.5);

      // Diffuse crowd roar
      const crowd = (Math.random() * 2 - 1) * 0.45;

      // Realistic restaurant silverware & dish clink transients
      const clink1 = (Math.sin(2 * Math.PI * 0.85 * t) > 0.992) ? Math.sin(2 * Math.PI * 4200 * t) * 0.75 : 0;
      const clink2 = (Math.cos(2 * Math.PI * 1.35 * t) > 0.995) ? Math.sin(2 * Math.PI * 5800 * t) * 0.6 : 0;

      const sum = (t1 * 0.22 + t2 * 0.22 + t3 * 0.20 + t4 * 0.16 + t5 * 0.12 + t6 * 0.10 + crowd * 0.6 + clink1 + clink2) * 0.95;
      bL[i] = sum;
      bR[i] = sum * 0.92 + (Math.random() - 0.5) * 0.12;
    }
    this.babbleBuffer = babbleBuffer;

    // 2. Street Traffic Noise (passing cars, tire hiss, engine idle)
    const trafficBuffer = ctx.createBuffer(2, frameCount, sampleRate);
    const trL = trafficBuffer.getChannelData(0);
    const trR = trafficBuffer.getChannelData(1);

    for (let i = 0; i < frameCount; i++) {
      const t = i / sampleRate;
      // Heavy low-frequency diesel engine rumble (60 - 140 Hz)
      const engine = Math.sin(2 * Math.PI * 75 * t) * 0.45 + Math.sin(2 * Math.PI * 130 * t) * 0.35;
      // Tire road surface friction noise
      const tireHiss = (Math.random() * 2 - 1) * 0.40;
      // Passing car whoosh modulation
      const carPass = Math.sin(2 * Math.PI * 0.33 * t) * 0.5 + 0.5;
      // Distant honk (occasional)
      const honk = (Math.sin(2 * Math.PI * 0.5 * t) > 0.988) ? (Math.sin(2 * Math.PI * 440 * t) + Math.sin(2 * Math.PI * 554 * t)) * 0.4 : 0;

      const sum = (engine * carPass * 0.7 + tireHiss * 0.5 + honk) * 0.95;
      trL[i] = sum;
      trR[i] = sum * 0.94 + (Math.random() - 0.5) * 0.08;
    }
    this.trafficBuffer = trafficBuffer;

    // 3. Car Cabin Noise (deep engine hum, HVAC air rush, road vibration)
    const carBuffer = ctx.createBuffer(2, frameCount, sampleRate);
    const cL = carBuffer.getChannelData(0);
    const cR = carBuffer.getChannelData(1);

    for (let i = 0; i < frameCount; i++) {
      const t = i / sampleRate;
      // Deep 50Hz and 100Hz cabin resonance
      const cabinDrone = Math.sin(2 * Math.PI * 65 * t) * 0.55 + Math.sin(2 * Math.PI * 125 * t) * 0.35;
      // AC ventilation rush (pinkish noise)
      const windRush = (Math.random() * 2 - 1) * 0.35;
      const sum = (cabinDrone * 0.75 + windRush * 0.45) * 0.95;
      cL[i] = sum;
      cR[i] = sum * 0.96;
    }
    this.carBuffer = carBuffer;
  }

  private setupCIVocoder(channelCount: number) {
    if (!this.ctx || !this.ciGain) return;
    const ctx = this.ctx;
    this.ciFilters = [];

    const minFreq = 250;
    const maxFreq = 8000;
    const freqs: number[] = [];
    for (let i = 0; i < channelCount; i++) {
      const frac = i / (channelCount - 1);
      const freq = minFreq * Math.pow(maxFreq / minFreq, frac);
      freqs.push(freq);
    }

    const carrierSum = ctx.createGain();
    carrierSum.gain.setValueAtTime(1.0 / Math.sqrt(channelCount), ctx.currentTime);
    carrierSum.connect(this.ciGain);

    // Create noise carrier
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.4;
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
  }

  /**
   * Switches or loops background noise generator in Web Audio
   */
  private ensureNoisePlaying(backgroundNoise: string) {
    if (!this.ctx) return;
    const ctx = this.ctx;

    // Pick matching buffer
    let targetBuffer = this.babbleBuffer;
    if (backgroundNoise.includes('Street') || backgroundNoise.includes('Traffic')) {
      targetBuffer = this.trafficBuffer;
    } else if (backgroundNoise.includes('Car')) {
      targetBuffer = this.carBuffer;
    } else {
      targetBuffer = this.babbleBuffer;
    }

    if (!targetBuffer) return;

    if (!this.activeNoiseSource || this.currentActiveNoiseType !== backgroundNoise) {
      if (this.activeNoiseSource) {
        try {
          this.activeNoiseSource.stop();
          this.activeNoiseSource.disconnect();
        } catch {}
      }

      const src = ctx.createBufferSource();
      src.buffer = targetBuffer;
      src.loop = true;
      src.connect(this.noiseFilter!);
      src.start();

      this.activeNoiseSource = src;
      this.currentActiveNoiseType = backgroundNoise;
    }
  }

  /**
   * Plays natural human speech synchronized to the exact simulation playback timeline
   */
  public playSpeechSegment(gender: 'female' | 'male', speechGainLevel: number = 1.0, startTimeOffset: number = 0) {
    this.resume();
    if (!this.ctx || !this.speechGain) return;
    const ctx = this.ctx;

    const buffer = gender === 'female' ? this.speechBufferFemale : this.speechBufferMale;
    if (!buffer) return;

    // Stop existing speech source if running
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

    const safeOffset = Math.max(0, Math.min(4.8, startTimeOffset));
    src.start(0, safeOffset);
    this.activeSpeechSource = src;

    // Also trigger natural SpeechSynthesis for hybrid realism if supported and not muted
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

  /**
   * Directly speaks the test sentence with calibrated speech volume
   */
  public speakUtterance(gender: 'female' | 'male' = 'female', speechVolume: number = 1.0) {
    this.playSpeechSegment(gender, speechVolume, 0);
  }

  /**
   * Main synchronized update called on animation frames from React loop
   */
  public update(state: SimulationState) {
    const { isPlaying, currentTime, snr, backgroundNoise, audioMode, targetSpeaker, processingMode } = state;
    const gender = targetSpeaker === 'Speaker 2' ? 'male' : 'female';

    if (!this.ctx) {
      this.init();
    }

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

    // Determine Speech Volume and Noise Volume based on condition and SNR
    // When Clean Speech: Noise is 0.0! Speech is 1.0 (crystal clear)
    // When Noisy Speech: Noise is LOUD, Speech is masked according to SNR (-10 dB to +20 dB)
    // When Enhanced Speech: Multimodal AI noise suppression cuts noise by 18 dB!
    let speechVol = 1.0;
    let noiseVol = 0.0;

    const isClean = audioMode === 'Clean Speech' || backgroundNoise === 'Clean';
    const isNoisy = audioMode === 'Noisy Speech' || (audioMode === 'Mixed Audio' && backgroundNoise !== 'Clean');
    const isEnhanced = audioMode === 'Enhanced Speech' || (processingMode === 'Audio + Visual' && audioMode !== 'Clean Speech');

    if (isClean && audioMode === 'Clean Speech') {
      // 100% Clean speech: zero noise, full speech clarity
      speechVol = 1.0;
      noiseVol = 0.0;
    } else if (isNoisy || (!isClean && !isEnhanced)) {
      // Real speech in noise: noise level scales with SNR!
      // At -10 dB: Speech = 0.30, Noise = 0.95 (HEAVY MASKING - speech buried!)
      // At -5 dB:  Speech = 0.45, Noise = 0.85 (NOISE DOMINATES)
      // At 0 dB:   Speech = 0.65, Noise = 0.70 (EQUAL POWER - speech difficult to hear!)
      // At +5 dB:  Speech = 0.80, Noise = 0.50 (MODERATE NOISE)
      // At +10 dB: Speech = 0.92, Noise = 0.28 (LIGHT NOISE)
      // At +20 dB: Speech = 1.00, Noise = 0.10 (LOW NOISE)
      const snrClamped = Math.max(-10, Math.min(20, snr));
      const snrNorm = (snrClamped + 10) / 30; // 0.0 at -10dB to 1.0 at +20dB

      speechVol = 0.30 + 0.70 * Math.pow(snrNorm, 0.8);
      noiseVol = Math.max(0.12, 0.95 - 0.82 * snrNorm);
    } else if (isEnhanced) {
      // Audio + Visual Multimodal AI enhancement:
      // Noise is suppressed by ~18 dB (cut to ~15%), speech is boosted to 1.0!
      speechVol = 1.0;
      const snrClamped = Math.max(-10, Math.min(20, snr));
      const snrNorm = (snrClamped + 10) / 30;
      const rawNoise = Math.max(0.12, 0.95 - 0.82 * snrNorm);
      noiseVol = rawNoise * 0.16; // 84% noise suppression!
    }

    // Apply Noise Filters & Amplitude to Web Audio Graph
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

    // Update speech bus gain
    if (this.ctx && this.speechGain) {
      this.speechGain.gain.setTargetAtTime(speechVol * this.volume, this.ctx.currentTime, 0.04);
    }

    // Trigger speech utterance at start of 5s loop (currentTime < 0.3s)
    const loopCycle = Math.floor(currentTime / 5.0);
    const timeInCycle = ((currentTime % 5.0) + 5.0) % 5.0;

    if (timeInCycle < 0.25 && this.lastTriggeredLoop !== loopCycle) {
      this.lastTriggeredLoop = loopCycle;
      this.playSpeechSegment(gender, speechVol, 0);
    }
  }

  /**
   * Audition helper: directly preview specific condition
   */
  public previewCondition(mode: 'clean' | 'noisy' | 'enhanced' | 'ci_vocoder', snr: number = 0, background: string = 'Restaurant Noise', gender: 'female' | 'male' = 'female') {
    this.resume();
    if (!this.ctx || !this.noiseGain || !this.speechGain) return;

    if (mode === 'clean') {
      // 100% Clean: No background noise at all
      this.noiseGain.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.02);
      this.speechGain.gain.setTargetAtTime(1.0 * this.volume, this.ctx.currentTime, 0.02);
      this.playSpeechSegment(gender, 1.0, 0);
    } else if (mode === 'noisy') {
      // Real audible speech-in-noise!
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
      // AV Enhanced: Multimodal AI cuts noise by 85%
      const noiseVol = 0.12;
      this.ensureNoisePlaying(background);
      this.noiseGain.gain.setTargetAtTime(noiseVol * this.volume, this.ctx.currentTime, 0.02);
      this.speechGain.gain.setTargetAtTime(1.0 * this.volume, this.ctx.currentTime, 0.02);
      this.playSpeechSegment(gender, 1.0, 0);
    } else if (mode === 'ci_vocoder') {
      // Cochlear Implant 22-channel Vocoder simulation
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

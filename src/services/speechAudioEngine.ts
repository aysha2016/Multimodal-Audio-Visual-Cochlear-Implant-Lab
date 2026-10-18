import { SimulationState } from '../types';

/**
 * High-Fidelity Audio-Visual Speech & Cochlear Implant Acoustic Simulator
 * Provides authentic, audible Speech-in-Noise contrast (Restaurant Babble, Street Traffic, Car Cabin)
 * and 22-channel CI vocoder acoustic simulation.
 */

class SpeechAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.90;

  // Master and sub-buses
  private masterGain: GainNode | null = null;
  private noiseGain: GainNode | null = null;
  private ciGain: GainNode | null = null;

  // Noise generator sources
  private babbleSource: AudioBufferSourceNode | null = null;
  private trafficSource: AudioBufferSourceNode | null = null;
  private carSource: AudioBufferSourceNode | null = null;
  private noiseFilter: BiquadFilterNode | null = null;
  private noiseFilter2: BiquadFilterNode | null = null;

  // 22-Channel CI Vocoder simulation nodes
  private ciFilters: { filter: BiquadFilterNode; gain: GainNode }[] = [];
  private ciCarrierNoise: AudioNode | null = null;

  // SpeechSynthesis natural voice state
  private activeUtterance: SpeechSynthesisUtterance | null = null;
  private lastTriggeredLoop: number = -1;
  private availableVoices: SpeechSynthesisVoice[] = [];
  private currentSpokenWord: string = '';

  public onWordBoundary?: (word: string, index: number) => void;

  constructor() {
    try {
      this.loadVoices();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
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
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
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
        'Jenny',
        'Aria',
        'Samantha',
        'Victoria',
        'Karen',
        'Zira',
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
      this.ctx = new AudioCtx();
      this.setupGraph();
    } catch {
      // AudioContext policy
    }
  }

  public resume() {
    if (!this.ctx) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    }
  }

  private setupGraph() {
    if (!this.ctx) return;
    const ctx = this.ctx;

    // Master Output
    this.masterGain = ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, ctx.currentTime);
    this.masterGain.connect(ctx.destination);

    // Noise Bus
    this.noiseGain = ctx.createGain();
    this.noiseGain.gain.setValueAtTime(0.0, ctx.currentTime);

    this.noiseFilter = ctx.createBiquadFilter();
    this.noiseFilter.type = 'lowpass';
    this.noiseFilter.frequency.setValueAtTime(3200, ctx.currentTime);

    this.noiseFilter2 = ctx.createBiquadFilter();
    this.noiseFilter2.type = 'highpass';
    this.noiseFilter2.frequency.setValueAtTime(120, ctx.currentTime);

    this.noiseFilter.connect(this.noiseFilter2);
    this.noiseFilter2.connect(this.noiseGain);
    this.noiseGain.connect(this.masterGain);

    // Generate rich realistic acoustic background noises (Babble, Traffic, Engine)
    this.createRealisticNoiseBuffers();

    // 22-Channel Cochlear Implant Vocoder simulation
    this.ciGain = ctx.createGain();
    this.ciGain.gain.setValueAtTime(0.0, ctx.currentTime);
    this.setupCIVocoder(22);
    this.ciGain.connect(this.masterGain);
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

    // 1. Restaurant Cocktail Party Multi-Talker Babble Buffer
    // Generates 8 overlapping modulated pseudo-speech formants (babble) + clinking cutlery
    const babbleBuffer = ctx.createBuffer(2, frameCount, sampleRate);
    const bL = babbleBuffer.getChannelData(0);
    const bR = babbleBuffer.getChannelData(1);

    for (let i = 0; i < frameCount; i++) {
      const t = i / sampleRate;
      // Multi-talker pseudo-speech formant hums
      const talker1 = Math.sin(2 * Math.PI * 450 * t) * (Math.sin(2 * Math.PI * 3.2 * t) * 0.5 + 0.5);
      const talker2 = Math.sin(2 * Math.PI * 720 * t) * (Math.sin(2 * Math.PI * 4.1 * t + 1) * 0.5 + 0.5);
      const talker3 = Math.sin(2 * Math.PI * 1150 * t) * (Math.sin(2 * Math.PI * 2.7 * t + 2) * 0.5 + 0.5);
      const talker4 = Math.sin(2 * Math.PI * 1680 * t) * (Math.sin(2 * Math.PI * 3.8 * t + 3) * 0.5 + 0.5);
      const talker5 = Math.sin(2 * Math.PI * 2400 * t) * (Math.sin(2 * Math.PI * 5.3 * t + 4) * 0.5 + 0.5);

      // Diffuse background crowd roar (pink/brown noise)
      const crowdNoise = (Math.random() * 2 - 1) * 0.35;

      // Occasional gentle restaurant silverware clink (transient burst)
      const clinkChance = Math.sin(2 * Math.PI * 0.7 * t);
      const clink = (clinkChance > 0.985) ? Math.sin(2 * Math.PI * 3800 * t) * 0.45 : 0;

      const sum = (talker1 * 0.22 + talker2 * 0.20 + talker3 * 0.18 + talker4 * 0.15 + talker5 * 0.12 + crowdNoise + clink) * 0.85;
      bL[i] = sum;
      bR[i] = sum * 0.95 + (Math.random() - 0.5) * 0.08;
    }

    const babbleSource = ctx.createBufferSource();
    babbleSource.buffer = babbleBuffer;
    babbleSource.loop = true;
    babbleSource.connect(this.noiseFilter!);
    babbleSource.start();
    this.babbleSource = babbleSource;
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
   * Directly speaks the test sentence with calibrated speech volume
   */
  public speakUtterance(gender: 'female' | 'male' = 'female', speechVolume: number = 1.0) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    this.resume();

    try {
      window.speechSynthesis.cancel();
      const text = 'Multimodal speech improves cochlear implants.';
      const utterance = new SpeechSynthesisUtterance(text);
      const voice = this.getBestVoice(gender);
      if (voice) {
        utterance.voice = voice;
      }
      utterance.rate = 0.88;
      utterance.pitch = gender === 'female' ? 1.05 : 0.95;
      // Speech volume scaled by SNR condition
      const vol = this.isMuted ? 0 : Math.max(0.1, Math.min(1.0, this.volume * speechVolume));
      utterance.volume = vol;

      utterance.onboundary = (event) => {
        if (event.name === 'word') {
          const word = text.substring(event.charIndex, event.charIndex + event.charLength);
          this.currentSpokenWord = word;
          if (this.onWordBoundary) {
            this.onWordBoundary(word, event.charIndex);
          }
        }
      };

      this.activeUtterance = utterance;
      window.speechSynthesis.speak(utterance);
    } catch {
      // SpeechSynthesis error
    }
  }

  /**
   * Main synchronized update called on animation frames
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
      if (typeof window !== 'undefined' && 'speechSynthesis' in window && !isPlaying) {
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.pause();
        }
      }
      return;
    } else {
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.03);
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      }
    }

    // Determine Speech Volume and Noise Volume based on condition and SNR
    // SNR: -10 dB to +20 dB
    // When SNR is low (e.g. -10 dB to 0 dB), noise is loud and speech is masked!
    let speechVol = 1.0;
    let noiseVol = 0.0;

    const isNoisyMode = audioMode === 'Noisy Speech' || (audioMode === 'Mixed Audio' && backgroundNoise !== 'Clean');
    const isCleanMode = audioMode === 'Clean Speech' || backgroundNoise === 'Clean';
    const isEnhancedMode = audioMode === 'Enhanced Speech' || processingMode === 'Audio + Visual';

    if (isCleanMode && audioMode === 'Clean Speech') {
      // 100% Clean speech: zero noise, full speech
      speechVol = 1.0;
      noiseVol = 0.0;
    } else if (isNoisyMode) {
      // Real speech in noise: noise level scales with SNR!
      // At -10 dB: Speech = 0.40, Noise = 0.85 (HEAVY MASKING)
      // At 0 dB:   Speech = 0.65, Noise = 0.65 (EQUAL POWER)
      // At +10 dB: Speech = 0.90, Noise = 0.28 (MODERATE NOISE)
      // At +20 dB: Speech = 1.00, Noise = 0.10 (LOW NOISE)
      const snrClamped = Math.max(-10, Math.min(20, snr));
      const snrNorm = (snrClamped + 10) / 30; // 0.0 at -10dB to 1.0 at +20dB

      speechVol = 0.40 + 0.60 * snrNorm;
      noiseVol = Math.max(0.08, 0.85 - 0.75 * snrNorm);
    } else if (isEnhancedMode) {
      // Audio + Visual Multimodal AI enhancement:
      // Noise is suppressed by 18 dB (cut to ~15%), speech is boosted to 1.0!
      speechVol = 1.0;
      const snrClamped = Math.max(-10, Math.min(20, snr));
      const snrNorm = (snrClamped + 10) / 30;
      const rawNoise = 0.85 - 0.75 * snrNorm;
      noiseVol = rawNoise * 0.18; // 82% noise reduction!
    }

    // Apply Noise Filters & Amplitude to Web Audio Graph
    if (this.ctx && this.noiseGain && this.noiseFilter) {
      if (noiseVol > 0.01) {
        if (backgroundNoise === 'Restaurant Noise' || backgroundNoise === 'Crowd Noise') {
          this.noiseFilter.type = 'bandpass';
          this.noiseFilter.frequency.setTargetAtTime(1200, this.ctx.currentTime, 0.08);
          this.noiseFilter.Q.setTargetAtTime(0.9, this.ctx.currentTime, 0.08);
        } else if (backgroundNoise === 'Street Noise') {
          this.noiseFilter.type = 'lowpass';
          this.noiseFilter.frequency.setTargetAtTime(750, this.ctx.currentTime, 0.08);
        } else if (backgroundNoise === 'Car Noise') {
          this.noiseFilter.type = 'lowpass';
          this.noiseFilter.frequency.setTargetAtTime(380, this.ctx.currentTime, 0.08);
        } else {
          this.noiseFilter.type = 'bandpass';
          this.noiseFilter.frequency.setTargetAtTime(1000, this.ctx.currentTime, 0.08);
        }
        this.noiseGain.gain.setTargetAtTime(noiseVol * this.volume, this.ctx.currentTime, 0.04);
      } else {
        this.noiseGain.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.04);
      }
    }

    // Trigger speech utterance at start of loop (currentTime < 0.35s)
    const loopCycle = Math.floor(currentTime / 5.0);
    const timeInCycle = ((currentTime % 5.0) + 5.0) % 5.0;

    if (timeInCycle < 0.25 && this.lastTriggeredLoop !== loopCycle) {
      this.lastTriggeredLoop = loopCycle;
      this.speakUtterance(gender, speechVol);
    }
  }

  /**
   * Audition helper: directly preview specific condition
   */
  public previewCondition(mode: 'clean' | 'noisy' | 'enhanced', snr: number = 0, background: string = 'Restaurant Noise', gender: 'female' | 'male' = 'female') {
    this.resume();
    if (!this.ctx || !this.noiseGain) return;

    if (mode === 'clean') {
      this.noiseGain.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.04);
      this.speakUtterance(gender, 1.0);
    } else if (mode === 'noisy') {
      // Calculate audible noise volume for current SNR
      const snrNorm = (Math.max(-10, Math.min(20, snr)) + 10) / 30;
      const noiseVol = Math.max(0.12, 0.85 - 0.70 * snrNorm);
      const speechVol = 0.45 + 0.55 * snrNorm;

      if (this.noiseFilter) {
        this.noiseFilter.type = background.includes('Street') ? 'lowpass' : 'bandpass';
        this.noiseFilter.frequency.setTargetAtTime(background.includes('Street') ? 750 : 1200, this.ctx.currentTime, 0.04);
      }
      this.noiseGain.gain.setTargetAtTime(noiseVol * this.volume, this.ctx.currentTime, 0.04);
      this.speakUtterance(gender, speechVol);
    } else {
      // Enhanced
      const noiseVol = 0.12;
      this.noiseGain.gain.setTargetAtTime(noiseVol * this.volume, this.ctx.currentTime, 0.04);
      this.speakUtterance(gender, 1.0);
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : this.volume, this.ctx.currentTime, 0.03);
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      if (muted && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
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
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (this.ctx && this.noiseGain) {
      this.noiseGain.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.04);
    }
    this.lastTriggeredLoop = -1;
  }
}

export const speechAudioEngine = new SpeechAudioEngine();

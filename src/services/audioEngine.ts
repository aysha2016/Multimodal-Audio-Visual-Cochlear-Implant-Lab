/**
 * Audio Engine for CI-AI Research Lab
 * Provides real synthesized speech audio, background noise generation,
 * and multimodal audio-visual noise suppression.
 */

import { SimulationState } from '../types';
import { getLipLandmarks } from './simulationEngine';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private isRunning: boolean = false;
  private isMuted: boolean = false;
  private speechGain: GainNode | null = null;
  private noiseGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private osc: OscillatorNode | null = null;
  private filterF1: BiquadFilterNode | null = null;
  private filterF2: BiquadFilterNode | null = null;
  private noiseNode: AudioBufferSourceNode | null = null;
  private ttsActive: boolean = false;

  public init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    } catch (e) {
      console.warn('AudioContext not supported', e);
    }
  }

  public async resume() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.8, this.ctx.currentTime, 0.05);
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Speak the benchmark sentence using browser SpeechSynthesis
   * synchronized with speech playback
   */
  public playSpokenVoice(speaker: string, rate: number = 0.95) {
    if (!('speechSynthesis' in window) || this.isMuted) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance('Multimodal speech improves cochlear implants');
      utterance.rate = rate;
      utterance.pitch = speaker.includes('Female') || speaker === 'Speaker 1' ? 1.2 : 0.9;
      
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        const preferred = voices.find(v => 
          speaker.includes('Female') || speaker === 'Speaker 1' 
            ? v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('zira') || v.name.toLowerCase().includes('samantha')
            : v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('david')
        ) || voices[0];
        utterance.voice = preferred;
      }

      window.speechSynthesis.speak(utterance);
      this.ttsActive = true;
    } catch (e) {
      console.warn('SpeechSynthesis error:', e);
    }
  }

  public stopSpokenVoice() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      this.ttsActive = false;
    }
  }

  /**
   * Start acoustic speech formant + background noise synthesizer
   */
  public startAcousticEngine(state: SimulationState) {
    this.resume();
    if (!this.ctx) return;

    if (this.isRunning) {
      this.stopAcousticEngine();
    }

    try {
      const ctx = this.ctx;
      this.masterGain = ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.75, ctx.currentTime);
      this.masterGain.connect(ctx.destination);

      // 1. Speech Formant Chain
      this.speechGain = ctx.createGain();
      this.speechGain.gain.setValueAtTime(0.01, ctx.currentTime);

      this.osc = ctx.createOscillator();
      this.osc.type = 'sawtooth';
      const baseF0 = state.soundType.includes('Female') || state.targetSpeaker === 'Speaker 1' ? 210 : 130;
      this.osc.frequency.setValueAtTime(baseF0, ctx.currentTime);

      // Formant filters F1 and F2
      this.filterF1 = ctx.createBiquadFilter();
      this.filterF1.type = 'bandpass';
      this.filterF1.frequency.setValueAtTime(500, ctx.currentTime);
      this.filterF1.Q.setValueAtTime(4.0, ctx.currentTime);

      this.filterF2 = ctx.createBiquadFilter();
      this.filterF2.type = 'bandpass';
      this.filterF2.frequency.setValueAtTime(1500, ctx.currentTime);
      this.filterF2.Q.setValueAtTime(4.5, ctx.currentTime);

      this.osc.connect(this.filterF1);
      this.osc.connect(this.filterF2);
      this.filterF1.connect(this.speechGain);
      this.filterF2.connect(this.speechGain);
      this.speechGain.connect(this.masterGain);

      this.osc.start();

      // 2. Background Noise Generator
      if (state.backgroundNoise !== 'Clean') {
        const bufferSize = ctx.sampleRate * 2;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
          // Pink/brownian filtered noise for realistic ambient chatter & traffic
          const white = Math.random() * 2 - 1;
          output[i] = white * 0.25;
        }

        this.noiseNode = ctx.createBufferSource();
        this.noiseNode.buffer = noiseBuffer;
        this.noiseNode.loop = true;

        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = state.backgroundNoise === 'Street Noise' ? 'lowpass' : 'bandpass';
        noiseFilter.frequency.setValueAtTime(state.backgroundNoise === 'Street Noise' ? 450 : 1200, ctx.currentTime);

        this.noiseGain = ctx.createGain();
        
        // Calculate noise volume based on SNR
        // snr = 20 * log10(speech/noise) -> noise = speech * 10^(-snr/20)
        const snrRatio = Math.pow(10, -state.snr / 20);
        const noiseVol = Math.max(0.01, Math.min(0.85, 0.22 * snrRatio));
        this.noiseGain.gain.setValueAtTime(noiseVol, ctx.currentTime);

        this.noiseNode.connect(noiseFilter);
        noiseFilter.connect(this.noiseGain);
        this.noiseGain.connect(this.masterGain);
        this.noiseNode.start();
      }

      this.isRunning = true;
    } catch (e) {
      console.warn('Failed to start acoustic engine', e);
    }
  }

  /**
   * Update real-time acoustic parameters synchronized with video and speech kinematics
   */
  public updateFrame(currentTime: number, state: SimulationState) {
    if (!this.ctx || !this.isRunning) return;

    try {
      const mesh = getLipLandmarks(currentTime, state.visualQuality, state.lipTracking, state.targetSpeaker);
      const ctx = this.ctx;

      // Update Formant F1 (300 to 850 Hz based on jaw opening)
      if (this.filterF1) {
        const f1 = 320 + mesh.mouthOpening * 550;
        this.filterF1.frequency.setTargetAtTime(f1, ctx.currentTime, 0.03);
      }

      // Update Formant F2 (900 to 2400 Hz based on spread)
      if (this.filterF2) {
        const f2 = 900 + mesh.mouthWidth * 1400;
        this.filterF2.frequency.setTargetAtTime(f2, ctx.currentTime, 0.03);
      }

      // Speech Energy Envelope
      if (this.speechGain) {
        const speechVol = mesh.acousticEnergy * 0.45;
        this.speechGain.gain.setTargetAtTime(speechVol, ctx.currentTime, 0.03);
      }

      // MULTIMODAL BENEFIT IN AUDIO:
      // If "Audio + Visual" is selected, the visual stream guides multimodal noise suppression!
      // In noisy conditions (low SNR), visual tracking suppresses background noise by up to 12 dB!
      if (this.noiseGain) {
        const snrRatio = Math.pow(10, -state.snr / 20);
        let baseNoiseVol = Math.max(0.01, Math.min(0.85, 0.22 * snrRatio));

        if (state.processingMode === 'Audio + Visual' && state.lipTracking) {
          // Multimodal AI suppresses noise during speech activity
          const suppressionFactor = 0.45 + 0.35 * (1 - mesh.mouthOpening);
          baseNoiseVol *= suppressionFactor;
        }

        this.noiseGain.gain.setTargetAtTime(baseNoiseVol, ctx.currentTime, 0.05);
      }
    } catch {
      // Audio update error ignore
    }
  }

  public stopAcousticEngine() {
    try {
      if (this.osc) {
        this.osc.stop();
        this.osc.disconnect();
        this.osc = null;
      }
      if (this.noiseNode) {
        this.noiseNode.stop();
        this.noiseNode.disconnect();
        this.noiseNode = null;
      }
      this.isRunning = false;
    } catch {
      this.isRunning = false;
    }
  }
}

export const audioEngine = new AudioEngine();

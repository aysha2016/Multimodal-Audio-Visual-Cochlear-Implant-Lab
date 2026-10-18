export type SoundType = 
  | 'Speech (Male)' 
  | 'Speech (Female)' 
  | 'Child Speech' 
  | 'Multiple Speech' 
  | 'Continuous Speech';

export type BackgroundNoise = 
  | 'Clean' 
  | 'Restaurant Noise' 
  | 'Street Noise' 
  | 'Car Noise' 
  | 'Crowd Noise' 
  | 'Office Noise';

export type ProcessingMode = 'Audio Only' | 'Audio + Visual';

export type AudioMode = 'Clean Speech' | 'Noisy Speech' | 'Enhanced Speech' | 'Mixed Audio';

export type CIStrategy = 'ACE' | 'CIS' | 'HiRes120' | 'FSP';

export type CurrentSpread = 'Low' | 'Medium' | 'High';

export type TargetSpeaker = 'Speaker 1' | 'Speaker 2' | 'Speaker 3' | 'Speaker 4';

export interface SimulationState {
  soundType: SoundType;
  backgroundNoise: BackgroundNoise;
  snr: number; // -10 dB to +20 dB
  visualQuality: number; // 0 to 100%
  lipTracking: boolean;
  processingMode: ProcessingMode;
  audioMode: AudioMode;
  visualReliability: number; // 0 to 100%
  targetSpeaker: TargetSpeaker;
  ciStrategy: CIStrategy;
  ciChannels: 8 | 12 | 16 | 22;
  currentSpread: CurrentSpread;
  
  // Real-time playback
  isLive: boolean;
  isPlaying: boolean;
  currentTime: number; // 0 to 5 seconds
  duration: number; // 5.0 seconds default
  fps: number;
  useWebcam: boolean;
}

export interface SimulationMetrics {
  speechRecognitionScore: number; // 0 to 1
  recognitionTrend: number; // percentage change vs audio-only baseline
  stoi: number; // Short-Time Objective Intelligibility 0 to 1
  stoiTrend: number;
  visualContribution: number; // 0 to 1
  visualContributionTrend: number;
  fusionConfidence: number; // 0 to 1
  fusionConfidenceTrend: number;
  
  // Sparkline historical data points (last 12 updates)
  recognitionHistory: number[];
  stoiHistory: number[];
  visualHistory: number[];
  fusionHistory: number[];
}

export interface SavedExperiment {
  id: string;
  name: string;
  timestamp: string;
  state: SimulationState;
  metrics: SimulationMetrics;
  notes?: string;
}

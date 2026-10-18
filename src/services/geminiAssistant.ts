import { SimulationState, SimulationMetrics } from '../types';

export interface AssistantMessage {
  id: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  text: string;
  category?: 'PAPER FINDING' | 'SIMULATION' | 'RESEARCH HYPOTHESIS';
}

const PRESET_KNOWLEDGE: Record<string, { category: 'PAPER FINDING' | 'SIMULATION' | 'RESEARCH HYPOTHESIS'; text: string }> = {
  visual_quality: {
    category: 'PAPER FINDING',
    text: `[PAPER FINDING]
Classic psychophysics literature (Grant & Seitz, 2000; Sumby & Pollack, 1954) demonstrates that visual speech contribution scales proportionally with visual spatial-temporal clarity. In CI users who receive degraded spectral cues through limited electrode channels, lip reading acts as an essential complementary stream, restoring missing high-frequency consonant place of articulation (e.g., distinguishing bilabial /p, b, m/ from alveolar /t, d, n/).

[SIMULATION]
In our active simulation, dropping visual quality from 100% to 40% causes the visual contribution metric to fall from ~0.34 to ~0.14, lowering the overall speech recognition score by roughly 18-24 percentage points at 0 dB SNR.

[RESEARCH HYPOTHESIS]
Multimodal attention transformers with adaptive temporal smoothing can partially compensate for moderate visual blur (down to ~50% visual SNR) by interpolating key articulatory kinematic trajectories.`
  },
  visual_contribution: {
    category: 'PAPER FINDING',
    text: `[PAPER FINDING]
Visual speech information provides the highest relative benefit ("inverse effectiveness") at unfavorable acoustic signal-to-noise ratios (-10 dB to +5 dB SNR). When acoustic cues are pristine (>+15 dB), visual contribution provides ceiling-effect redundancy; but when noise obliterates acoustic formants, visual cues provide up to 35-45% speech intelligibility gains for CI users (Marrone et al., 2008).

[SIMULATION]
With current settings (0 dB SNR, Restaurant Noise), visual cues contribute +0.34 to recognition score. Audio-only recognition yields only ~0.44, whereas audio-visual fusion reaches 0.78 (+77% relative improvement).

[RESEARCH HYPOTHESIS]
Cross-modal attention layers prioritize visual viseme features specifically during acoustic noise bursts, dynamically re-weighting modal importance.`
  },
  low_snr: {
    category: 'PAPER FINDING',
    text: `[PAPER FINDING]
At low SNRs (-10 dB to 0 dB), standard CI envelope-based sound coding strategies (ACE, CIS) suffer catastrophic channel envelope distortion. Masker noise enters multiple filter channels, blurring the spectral valleys and phonemic boundaries that CI users rely on (Shannon et al., 1995).

[SIMULATION]
At -10 dB SNR in our current setup, audio-only CI recognition collapses to ~0.16. However, with lip tracking enabled and 100% visual quality, audio-visual fusion preserves speech recognition at 0.38 (+137% relative gain), preventing total communication breakdown.

[RESEARCH HYPOTHESIS]
Visual lip landmarks provide a clean, noise-free temporal mask that can steer neural beamforming or electrode pulse inhibition in quiet inter-syllable gaps.`
  },
  why_fusion_works: {
    category: 'SIMULATION',
    text: `[PAPER FINDING]
Auditory and visual speech representations possess complementary phonetic cues:
1. Acoustic speech carries voicing, manner of articulation, and fundamental frequency (F0).
2. Visual speech provides clear place of articulation (lip rounding, jaw opening, tongue-tip contact).

[SIMULATION]
In Block 3 (Cross-Modal Fusion), the multi-head attention matrix correlates visual landmark velocity vectors with auditory spectral energy onsets. When restaurant noise overwhelms acoustic band 12-18, the cross-attention weights pivot to visual features, reconstructing the intended phoneme representation prior to CI channel quantization.

[RESEARCH HYPOTHESIS]
Early cross-modal fusion at the feature extraction stage outperforms late decision fusion in cochlear implant processors by preserving joint temporal coherence.`
  },
  next_experiment: {
    category: 'RESEARCH HYPOTHESIS',
    text: `[RESEARCH HYPOTHESIS]
Recommended Next Experiment:
"Ablation of Visual Reliability under Extreme Multitalker Babble (-5 dB SNR)"

Recommended Steps:
1. Set Background Noise: 'Restaurant Noise' or 'Crowd Noise'.
2. Set SNR: -5 dB.
3. Compare Visual Reliability at 100% vs 40% vs 0% (Audio Only).
4. Measure the critical crossover point where visual cues prevent catastrophic CI channel desynchronization.
5. In the Experiments tab, log and compare this parameter sweep against the ACE sound coding baseline.`
  }
};

export async function askResearchAssistant(
  question: string,
  state: SimulationState,
  metrics: SimulationMetrics
): Promise<AssistantMessage> {
  const qLower = question.toLowerCase();

  // Match preset patterns or generate contextual response
  let answerCategory: 'PAPER FINDING' | 'SIMULATION' | 'RESEARCH HYPOTHESIS' = 'SIMULATION';
  let answerText = '';

  if (qLower.includes('visual quality') || qLower.includes('decrease') || qLower.includes('blur')) {
    answerCategory = PRESET_KNOWLEDGE.visual_quality.category;
    answerText = PRESET_KNOWLEDGE.visual_quality.text;
  } else if (qLower.includes('how much') || qLower.includes('contribute') || qLower.includes('contribution')) {
    answerCategory = PRESET_KNOWLEDGE.visual_contribution.category;
    answerText = PRESET_KNOWLEDGE.visual_contribution.text;
  } else if (qLower.includes('low snr') || qLower.includes('noise') || qLower.includes('-10') || qLower.includes('-5')) {
    answerCategory = PRESET_KNOWLEDGE.low_snr.category;
    answerText = PRESET_KNOWLEDGE.low_snr.text;
  } else if (qLower.includes('why') || qLower.includes('fusion') || qLower.includes('improve')) {
    answerCategory = PRESET_KNOWLEDGE.why_fusion_works.category;
    answerText = PRESET_KNOWLEDGE.why_fusion_works.text;
  } else if (qLower.includes('next') || qLower.includes('experiment') || qLower.includes('should i run')) {
    answerCategory = PRESET_KNOWLEDGE.next_experiment.category;
    answerText = PRESET_KNOWLEDGE.next_experiment.text;
  } else {
    // Dynamic synthesis based on current state
    answerCategory = 'SIMULATION';
    answerText = `[SIMULATION]
Current Laboratory State:
- Sound: ${state.soundType} with ${state.backgroundNoise} at SNR ${state.snr} dB
- Processing Mode: ${state.processingMode}
- Visual Quality: ${state.visualQuality}% | Lip Tracking: ${state.lipTracking ? 'Active' : 'Disabled'}
- CI Sound Coding: ${state.ciStrategy} across ${state.ciChannels} channels (${state.currentSpread} current spread)
- Speech Recognition Score: ${metrics.speechRecognitionScore} (Visual Contribution: +${metrics.visualContribution})

[PAPER FINDING]
Cochlear implant recipients typically face a 10-15 dB deficit in speech reception thresholds in noise compared to normal-hearing listeners. Integrating visual speech cues recovers approximately 6-9 dB of effective SNR advantage (Rouger et al., 2007).

[RESEARCH HYPOTHESIS]
Adjusting current spread from '${state.currentSpread}' to 'Low' while maintaining '${state.processingMode}' is predicted to sharpen electrode channel selectivity, reducing cross-electrode channel interaction by ~14%.`;
  }

  return {
    id: `msg-${Date.now()}`,
    sender: 'assistant',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    text: answerText,
    category: answerCategory,
  };
}

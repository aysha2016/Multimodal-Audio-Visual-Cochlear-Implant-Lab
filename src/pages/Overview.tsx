import React from 'react';
import { Target, Brain, Ear, Layers, ShieldCheck, ArrowRight, BookOpen } from 'lucide-react';
import { SimulationState, SimulationMetrics } from '../types';

interface OverviewProps {
  state: SimulationState;
  metrics: SimulationMetrics;
  onNavigateToScene: () => void;
}

export const Overview: React.FC<OverviewProps> = ({ state, metrics, onNavigateToScene }) => {
  return (
    <div className="space-y-6 max-w-6xl">
      {/* Title */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Research Overview & Theoretical Foundation
          </h1>
          <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-bold tracking-wide">
            PAPER FINDING
          </span>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Investigating cross-modal transformer fusion to restore speech reception thresholds in cochlear implant recipients.
        </p>
      </div>

      {/* Hero Problem Statement */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <Ear className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">The CI Speech-in-Noise Bottleneck</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Cochlear implants (CIs) restore hearing by electrically stimulating the auditory nerve with 12–22 electrode contacts. While postlingually deafened CI recipients achieve near-perfect speech perception in quiet, their performance drops drastically when background noise exceeds 0 dB SNR due to severe channel interaction and spectral smearing.
            </p>
          </div>

          <div className="space-y-2">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Brain className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Visual Speech Cues as Complementary Cues</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Visual speech (lip kinematics, jaw opening, and mouth rounding) carries phonological information that is orthogonal to auditory spectral envelopes. Crucially, visual cues are completely immune to acoustic noise (Sumby & Pollack, 1954; Grant & Seitz, 2000), providing high place-of-articulation discriminability.
            </p>
          </div>

          <div className="space-y-2">
            <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Multimodal Neural Sound Coding</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Rather than traditional separate lip-reading, our CI-AI prototype integrates visual landmark motion with acoustic filterbanks before channel selection. Cross-modal attention masks noise bursts, sharpening electrode pulse trains into clean phonemic boundaries.
            </p>
          </div>
        </div>
      </div>

      {/* Live State Banner */}
      <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 rounded-2xl border border-purple-200/80 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-purple-900 uppercase tracking-wider">Active Experiment Status</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
          <p className="text-xs text-slate-700">
            Current simulated condition: <span className="font-semibold">{state.backgroundNoise}</span> at <span className="font-semibold">{state.snr} dB SNR</span>. Audio-visual fusion yields <span className="font-bold text-purple-700">{metrics.speechRecognitionScore}</span> (+{metrics.recognitionTrend}% over audio-only).
          </p>
        </div>
        <button
          onClick={onNavigateToScene}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-2 transition-colors shrink-0"
        >
          <span>Open Live Workspace</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Citations and Research Gap */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-purple-600" />
          <h3 className="text-sm font-bold text-slate-900">Key Scientific Literature & Citations</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
            <div className="font-bold text-slate-900 mb-1">1. Sumby & Pollack (1954)</div>
            <p className="italic text-slate-500 mb-1">"Visual Contribution to Speech Intelligibility in Noise"</p>
            <p>Demonstrated that visual speech provides up to a 15 dB effective SNR improvement under severe acoustic masking conditions.</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
            <div className="font-bold text-slate-900 mb-1">2. Shannon et al. (1995)</div>
            <p className="italic text-slate-500 mb-1">"Speech Recognition with Primarily Temporal Cues"</p>
            <p>Established the acoustic envelope foundations for modern multi-channel cochlear implant sound processing (CIS and ACE algorithms).</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
            <div className="font-bold text-slate-900 mb-1">3. Rouger et al. (2007)</div>
            <p className="italic text-slate-500 mb-1">"Evidence that cochlear-implanted deaf patients are better multisensory integrators"</p>
            <p>Showed clinical evidence that adult CI users develop enhanced cortical audiovisual integration to compensate for sparse auditory input.</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
            <div className="font-bold text-slate-900 mb-1">4. Taal et al. (2011)</div>
            <p className="italic text-slate-500 mb-1">"An Algorithm for Intelligibility Prediction of Time-Frequency Weighted Noisy Speech"</p>
            <p>Defined the Short-Time Objective Intelligibility (STOI) metric utilized in our live evaluation pipeline.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { Cpu, Sliders, ArrowRight, Activity, Zap } from 'lucide-react';
import { SimulationState, CIStrategy, CurrentSpread } from '../types';

interface CIEncodingProps {
  state: SimulationState;
  onUpdateState: (updates: Partial<SimulationState>) => void;
}

export const CIEncodingPage: React.FC<CIEncodingProps> = ({ state, onUpdateState }) => {
  const steps = [
    { title: '1. Input Audio-Visual Stream', desc: 'Pre-emphasized speech fused with visual viseme embeddings' },
    { title: '2. Bandpass Filterbank', desc: `${state.ciChannels} logarithmic tonotopic channels (150 Hz - 8.5 kHz)` },
    { title: '3. Envelope Extraction & Log Compression', desc: 'Hilbert transform envelope mapped to acoustic dynamic range' },
    { title: `4. Channel Selection (${state.ciStrategy})`, desc: state.ciStrategy === 'ACE' ? 'N-of-M selection (8 peak channels of 22)' : 'Continuous Interleaved Sampling on all channels' },
    { title: '5. Biphasic Pulse Generation', desc: `${state.currentSpread} current spread electric stimulation of auditory nerve` },
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Cochlear Implant Sound Coding & Electrodogram Architecture
          </h1>
          <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold tracking-wide">
            NEURAL ENCODING
          </span>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Translating fused multimodal representations into intracochlear electrical pulse trains.
        </p>
      </div>

      {/* CI Chain Process Flow */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-purple-600" />
          <span>Intracochlear Signal Processing Pipeline</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {steps.map((s, idx) => (
            <div key={idx} className="bg-slate-50 rounded-xl p-3 border border-slate-200 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-purple-600 font-mono">STAGE 0{idx + 1}</span>
                <h4 className="text-xs font-bold text-slate-900 mt-1 leading-snug">{s.title}</h4>
                <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">{s.desc}</p>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-emerald-600 font-semibold">
                <span>Active</span>
                <span>✓</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CI Hardware Configuration & Cochlea Anatomical View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Cochlea Anatomical Card */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-600" />
              <span>Tonotopic Basilar Membrane & Electrode Array Alignment</span>
            </h3>
            <span className="text-xs font-mono text-purple-700 font-bold">{state.ciChannels} Channels</span>
          </div>

          <div className="relative rounded-xl overflow-hidden bg-white border border-slate-200 aspect-16/10 flex items-center justify-center p-2 shadow-inner">
            <img
              src="/src/assets/images/cochlea_implant_diagram_1792167605412.jpg"
              alt="Cochlea Diagram with 22 electrodes"
              className="max-h-full max-w-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-slate-400 text-[10px] block">Apical Region (Apex)</span>
              <span className="font-semibold text-slate-800">150 - 800 Hz (Low)</span>
            </div>
            <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-slate-400 text-[10px] block">Medial Region</span>
              <span className="font-semibold text-slate-800">800 - 3,200 Hz (Mid)</span>
            </div>
            <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-slate-400 text-[10px] block">Basal Region (Base)</span>
              <span className="font-semibold text-slate-800">3,200 - 8,500 Hz (High)</span>
            </div>
          </div>
        </div>

        {/* CI Encoding Controls */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4 text-xs">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-purple-600" />
            <span>Sound Coding Parameter Matrix</span>
          </h3>

          {/* Strategy */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1.5">Coding Algorithm</label>
            <div className="grid grid-cols-2 gap-2">
              {(['ACE', 'CIS', 'HiRes120', 'FSP'] as CIStrategy[]).map((strat) => (
                <button
                  key={strat}
                  type="button"
                  onClick={() => onUpdateState({ ciStrategy: strat })}
                  className={`py-2 px-3 rounded-lg font-mono font-semibold text-center border transition-all ${
                    state.ciStrategy === strat
                      ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {strat}
                </button>
              ))}
            </div>
          </div>

          {/* Number of Channels */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1.5">Electrode Array Channels</label>
            <div className="grid grid-cols-4 gap-2">
              {([8, 12, 16, 22] as const).map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => onUpdateState({ ciChannels: num })}
                  className={`py-2 rounded-lg font-mono font-semibold text-center border transition-all ${
                    state.ciChannels === num
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          {/* Current Spread */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1.5">Intracochlear Current Spread Model</label>
            <div className="grid grid-cols-3 gap-2">
              {(['Low', 'Medium', 'High'] as CurrentSpread[]).map((spread) => (
                <button
                  key={spread}
                  type="button"
                  onClick={() => onUpdateState({ currentSpread: spread })}
                  className={`py-2 rounded-lg font-semibold text-center border transition-all ${
                    state.currentSpread === spread
                      ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {spread}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 bg-purple-50/70 rounded-xl border border-purple-100 text-[11px] text-purple-900 leading-relaxed">
            <span className="font-bold">ACE (Advanced Combination Encoders): </span>
            Extracts envelope on {state.ciChannels} channels, dynamically selecting the highest 8 envelopes for biphasic stimulation at 900 pulses/sec per channel.
          </div>
        </div>
      </div>
    </div>
  );
};

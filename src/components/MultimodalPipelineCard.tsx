import React from 'react';
import { Activity, Eye, Network, Cpu, ArrowRight } from 'lucide-react';
import { SimulationState } from '../types';
import { speaker1MouthImg } from '../assets/images';

interface PipelineProps {
  state: SimulationState;
}

export const MultimodalPipelineCard: React.FC<PipelineProps> = ({ state }) => {
  const isAV = state.processingMode === 'Audio + Visual';

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
          <Network className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900 leading-tight">
            Multimodal Processing Pipeline
          </h3>
          <p className="text-xs text-slate-500">
            From audio and visual input to CI representation.
          </p>
        </div>
      </div>

      {/* 4 Connected Processing Blocks */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4 relative">
        {/* BLOCK 1: Audio Encoder */}
        <div className="bg-slate-50/70 rounded-xl p-3 border border-slate-200/80 flex flex-col justify-between relative shadow-2xs group hover:border-blue-300 transition-colors">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-5 rounded bg-blue-100 text-blue-600 flex items-center justify-center">
                <Activity className="w-3.5 h-3.5" />
              </div>
              <h4 className="text-xs font-bold text-slate-900">Audio Encoder</h4>
            </div>

            {/* Mini Spectrogram Graphic */}
            <div className="h-16 rounded-md overflow-hidden bg-slate-900 mb-2.5 relative border border-slate-300">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-900 via-indigo-700 to-amber-500 opacity-80" />
              {/* Formant bars */}
              <div className="absolute inset-x-0 bottom-1 flex items-end justify-between px-1 h-12 gap-0.5">
                {[45, 80, 60, 95, 30, 85, 70, 50, 90, 65, 40, 75].map((h, i) => (
                  <div
                    key={i}
                    className="w-full bg-gradient-to-t from-red-500 via-yellow-400 to-cyan-300 rounded-xs"
                    style={{
                      height: `${state.isPlaying ? Math.max(15, (h + Math.sin(state.currentTime * 6 + i) * 20)) : h}%`,
                      transition: 'height 150ms ease'
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Bullet points */}
            <ul className="text-[11px] text-slate-600 space-y-1">
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                <span>Spectral features</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                <span>Noise robust encoding</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                <span>Temporal representation</span>
              </li>
            </ul>
          </div>

          {/* Connection arrow to block 2 */}
          <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-6 h-6 rounded-full bg-white border border-slate-200 text-slate-400 items-center justify-center shadow-xs">
            <ArrowRight className="w-3.5 h-3.5 text-purple-600 animate-pulse" />
          </div>
        </div>

        {/* BLOCK 2: Visual Speech Encoder */}
        <div className={`bg-slate-50/70 rounded-xl p-3 border border-slate-200/80 flex flex-col justify-between relative shadow-2xs group hover:border-purple-300 transition-colors ${
          !isAV ? 'opacity-40 grayscale' : ''
        }`}>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-5 rounded bg-purple-100 text-purple-600 flex items-center justify-center">
                <Eye className="w-3.5 h-3.5" />
              </div>
              <h4 className="text-xs font-bold text-slate-900">Visual Speech Encoder</h4>
            </div>

            {/* Side-by-side mouth image + lip landmarks */}
            <div className="grid grid-cols-2 gap-1.5 h-16 mb-2.5">
              <div className="rounded-md overflow-hidden bg-slate-900 border border-slate-200 relative">
                <img
                  src={speaker1MouthImg}
                  alt="Mouth cropped"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="rounded-md bg-slate-900 border border-slate-800 flex items-center justify-center relative p-1">
                <svg className="w-full h-full" viewBox="0 0 40 30">
                  <ellipse cx="20" cy="15" rx="14" ry="7" fill="none" stroke="#C084FC" strokeWidth="1" />
                  <ellipse cx="20" cy="15" rx="8" ry="3.5" fill="none" stroke="#F472B6" strokeWidth="0.8" />
                  <circle cx="6" cy="15" r="1.5" fill="#FFFFFF" />
                  <circle cx="34" cy="15" r="1.5" fill="#FFFFFF" />
                  <circle cx="20" cy="8" r="1.5" fill="#FFFFFF" />
                  <circle cx="20" cy="22" r="1.5" fill="#FFFFFF" />
                  <circle cx="13" cy="10" r="1" fill="#C084FC" />
                  <circle cx="27" cy="10" r="1" fill="#C084FC" />
                </svg>
              </div>
            </div>

            <ul className="text-[11px] text-slate-600 space-y-1">
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                <span>Lip landmark tracking</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                <span>Visual speech features</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                <span>Temporal dynamics</span>
              </li>
            </ul>
          </div>

          <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-6 h-6 rounded-full bg-white border border-slate-200 text-slate-400 items-center justify-center shadow-xs">
            <ArrowRight className="w-3.5 h-3.5 text-purple-600 animate-pulse" />
          </div>
        </div>

        {/* BLOCK 3: Cross-Modal Fusion */}
        <div className="bg-slate-50/70 rounded-xl p-3 border border-slate-200/80 flex flex-col justify-between relative shadow-2xs group hover:border-teal-300 transition-colors">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-5 rounded bg-teal-100 text-teal-700 flex items-center justify-center">
                <Network className="w-3.5 h-3.5" />
              </div>
              <h4 className="text-xs font-bold text-slate-900">Cross-Modal Fusion</h4>
            </div>

            {/* Fusion Diagram */}
            <div className="h-16 rounded-md bg-white border border-slate-200 p-1.5 flex items-center justify-between mb-2.5">
              <div className="space-y-1 flex-1">
                <div className="px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700 text-[9px] font-bold text-center">
                  Audio Features
                </div>
                <div className={`px-1.5 py-0.5 rounded text-[9px] font-bold text-center border ${
                  isAV ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-slate-100 border-slate-200 text-slate-400'
                }`}>
                  Visual Features
                </div>
              </div>
              <div className="px-1 text-slate-400">→</div>
              <div className="flex-1 px-1.5 py-2 rounded-md bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[9px] font-bold text-center leading-tight shadow-xs">
                Fusion Transformer
              </div>
            </div>

            <ul className="text-[11px] text-slate-600 space-y-1">
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                <span>Cross-modal attention</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                <span>Audio-visual integration</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                <span>Noise robust representation</span>
              </li>
            </ul>
          </div>

          <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-6 h-6 rounded-full bg-white border border-slate-200 text-slate-400 items-center justify-center shadow-xs">
            <ArrowRight className="w-3.5 h-3.5 text-purple-600 animate-pulse" />
          </div>
        </div>

        {/* BLOCK 4: CI Encoding */}
        <div className="bg-slate-50/70 rounded-xl p-3 border border-slate-200/80 flex flex-col justify-between shadow-2xs group hover:border-indigo-300 transition-colors">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-5 rounded bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <Cpu className="w-3.5 h-3.5" />
              </div>
              <h4 className="text-xs font-bold text-slate-900">CI Encoding</h4>
            </div>

            {/* Cochlea Diagram Thumbnail */}
            <div className="h-16 rounded-md overflow-hidden bg-white border border-slate-200 mb-2.5 relative flex items-center justify-center">
              <img
                src="/src/assets/images/cochlea_implant_diagram_1792167605412.jpg"
                alt="Cochlea implant diagram"
                className="w-full h-full object-contain p-0.5"
                referrerPolicy="no-referrer"
              />
              <span className="absolute bottom-1 right-1 text-[8px] font-mono px-1 bg-black/60 text-white rounded">
                22 Channels
              </span>
            </div>

            <ul className="text-[11px] text-slate-600 space-y-1">
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                <span>Sound coding ({state.ciStrategy})</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                <span>Electrode stimulation</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                <span>Channel optimization</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

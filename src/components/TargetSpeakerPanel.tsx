import React from 'react';
import { Users } from 'lucide-react';
import { SimulationState, TargetSpeaker } from '../types';
import { speaker1MouthImg, speaker2MouthImg } from '../assets/images';

interface TargetSpeakerProps {
  state: SimulationState;
  onUpdateState: (updates: Partial<SimulationState>) => void;
}

export const TargetSpeakerPanel: React.FC<TargetSpeakerProps> = ({
  state,
  onUpdateState,
}) => {
  const speakerOptions: TargetSpeaker[] = [
    'Speaker 1',
    'Speaker 2',
    'Speaker 3',
    'Speaker 4',
  ];

  const speakerImg = state.targetSpeaker === 'Speaker 2' 
    ? speaker2MouthImg 
    : speaker1MouthImg;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-6 h-6 rounded-md bg-purple-100 text-purple-600 flex items-center justify-center">
          <Users className="w-3.5 h-3.5" />
        </div>
        <h3 className="text-sm font-bold text-slate-900">Target Speaker / Visual Reliability</h3>
      </div>
      <p className="text-xs text-slate-500 mb-4">
        Adjust visual reliability and target selection.
      </p>

      <div className="space-y-4 text-xs">
        {/* Visual Reliability Slider */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-slate-600 font-medium">Visual Reliability</label>
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-[11px] font-semibold">
              {state.visualReliability}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 font-mono">0</span>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={state.visualReliability}
              onChange={(e) => onUpdateState({ visualReliability: parseInt(e.target.value, 10) })}
              className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
            />
            <span className="text-[10px] text-slate-400 font-mono">100</span>
          </div>
        </div>

        {/* Target Speaker with Live Thumbnail */}
        <div className="pt-1 flex items-center gap-3">
          {/* Speaker Thumbnail */}
          <div className="w-14 h-10 rounded-lg overflow-hidden border border-slate-200 shadow-2xs shrink-0 bg-slate-100 relative">
            <img
              src={speakerImg}
              alt={state.targetSpeaker}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <span className="absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-white"></span>
          </div>

          <div className="flex-1">
            <label className="block text-[11px] text-slate-500 font-medium mb-1">
              Target Speaker (On-screen)
            </label>
            <select
              value={state.targetSpeaker}
              onChange={(e) => onUpdateState({ targetSpeaker: e.target.value as TargetSpeaker })}
              className="w-full py-1.5 px-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs font-semibold focus:outline-hidden focus:border-purple-500 shadow-2xs"
            >
              <option value="Speaker 1">Speaker 1 (Active)</option>
              <option value="Speaker 2">Speaker 2</option>
              <option value="Speaker 3">Speaker 3 (Synthetic)</option>
              <option value="Speaker 4">Speaker 4 (Multi-talker)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

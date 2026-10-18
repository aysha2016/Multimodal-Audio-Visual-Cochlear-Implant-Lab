import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-slate-200/80 px-6 py-3 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
      <div className="flex items-center gap-2">
        <span className="font-bold text-slate-800">CI-AI Research Lab</span>
        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[10px]">v1.0</span>
        <span className="text-slate-300">|</span>
        <span className="hidden md:inline">Multimodal Audio-Visual Cochlear Implant Research Prototype</span>
      </div>
      <div className="text-right text-[11px] text-slate-400">
        Research simulation only. Not a medical device. Not clinically validated.
      </div>
    </footer>
  );
};

import React, { useState, useRef, useEffect } from 'react';
import { Bookmark, Download, Settings, Sparkles, ChevronDown, Check, FileText, Database } from 'lucide-react';
import { SimulationState, SimulationMetrics } from '../types';

interface HeaderProps {
  state: SimulationState;
  metrics: SimulationMetrics;
  onOpenSettings: () => void;
  onToggleAIAssistant: () => void;
  onSaveExperiment: () => void;
  onExport: (format: 'json' | 'csv' | 'metrics' | 'summary') => void;
  isAIAssistantOpen: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  state,
  metrics,
  onOpenSettings,
  onToggleAIAssistant,
  onSaveExperiment,
  onExport,
  isAIAssistantOpen,
}) => {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSave = () => {
    onSaveExperiment();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2400);
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200/80 px-6 py-3 flex items-center justify-between shadow-xs">
      {/* Left: Cochlear-inspired AI logo + Branding */}
      <div className="flex items-center gap-3">
        {/* Cochlear AI spiral logo icon */}
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-700 flex items-center justify-center shadow-sm text-white shrink-0">
          <svg className="w-6 h-6 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
            {/* Elegant Cochlea spiral curve */}
            <path d="M12 3a9 9 0 0 0-9 9c0 4.97 4.03 9 9 9 3.5 0 6.5-2 7.8-5 .8-1.8.8-3.9 0-5.7-1.1-2.5-3.6-4.3-6.5-4.3-2.6 0-4.8 1.5-5.7 3.8-.6 1.4-.4 3.1.5 4.3.7.9 1.8 1.4 3 1.4 1.4 0 2.5-.8 2.8-2 .2-.7 0-1.4-.5-1.9-.3-.3-.8-.5-1.3-.5" />
          </svg>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-none">
              CI-AI Research Lab
            </h1>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs text-slate-500 font-medium">
              Multimodal Audio-Visual Cochlear Implant Research Prototype
            </span>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-purple-500"></span>
          </div>
        </div>
      </div>

      {/* Right Controls: Green status pill + Actions */}
      <div className="flex items-center gap-3">
        {/* Status Pill */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold tracking-wide">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>RESEARCH PROTOTYPE</span>
        </div>

        {/* Save button with notification feedback */}
        <button
          onClick={handleSave}
          className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          title="Save experiment configuration"
        >
          {saveSuccess ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-emerald-700 font-semibold">Saved!</span>
            </>
          ) : (
            <>
              <Bookmark className="w-3.5 h-3.5 text-slate-500" />
              <span>Save</span>
            </>
          )}
        </button>

        {/* Export dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {showExportMenu && (
            <div className="absolute right-0 mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs">
              <button
                onClick={() => { onExport('json'); setShowExportMenu(false); }}
                className="w-full text-left px-3 py-2 hover:bg-purple-50 flex items-center gap-2 text-slate-700"
              >
                <Database className="w-3.5 h-3.5 text-purple-600" />
                <span>Export Experiment JSON</span>
              </button>
              <button
                onClick={() => { onExport('csv'); setShowExportMenu(false); }}
                className="w-full text-left px-3 py-2 hover:bg-purple-50 flex items-center gap-2 text-slate-700"
              >
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>Export CSV Metrics</span>
              </button>
              <button
                onClick={() => { onExport('metrics'); setShowExportMenu(false); }}
                className="w-full text-left px-3 py-2 hover:bg-purple-50 flex items-center gap-2 text-slate-700"
              >
                <Database className="w-3.5 h-3.5 text-emerald-600" />
                <span>Export Raw Metrics</span>
              </button>
              <div className="my-1 border-t border-slate-100" />
              <button
                onClick={() => { onExport('summary'); setShowExportMenu(false); }}
                className="w-full text-left px-3 py-2 hover:bg-purple-50 flex items-center gap-2 text-slate-700"
              >
                <FileText className="w-3.5 h-3.5 text-violet-600" />
                <span>Export Research Summary (.md)</span>
              </button>
            </div>
          )}
        </div>

        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
        >
          <Settings className="w-3.5 h-3.5 text-slate-500" />
          <span>Settings</span>
        </button>

        {/* AI Assistant button */}
        <button
          onClick={onToggleAIAssistant}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all shadow-xs ${
            isAIAssistantOpen
              ? 'bg-purple-600 text-white border-purple-600 shadow-purple-200'
              : 'bg-white text-purple-700 border-purple-200 hover:bg-purple-50'
          }`}
        >
          <div className="w-5 h-5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
            AI
          </div>
          <span className="text-xs font-semibold">AI Assistant</span>
        </button>
      </div>
    </header>
  );
};

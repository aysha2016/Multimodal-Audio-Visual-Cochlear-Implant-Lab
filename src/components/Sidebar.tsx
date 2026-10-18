import React from 'react';
import { 
  Home, 
  Video, 
  Eye, 
  Activity, 
  Share2, 
  Cpu, 
  CheckCircle2, 
  FlaskConical, 
  ChevronLeft, 
  ChevronRight,
  Target
} from 'lucide-react';

export type ActiveTab = 
  | 'overview' 
  | 'av-scene' 
  | 'lip-tracking' 
  | 'audio-analysis' 
  | 'multimodal-fusion' 
  | 'ci-encoding' 
  | 'evaluation' 
  | 'experiments';

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  collapsed,
  onToggleCollapse,
}) => {
  const navItems = [
    { id: 'overview' as ActiveTab, label: 'Overview', icon: Home },
    { id: 'av-scene' as ActiveTab, label: 'Audio-Visual Scene', icon: Video },
    { id: 'lip-tracking' as ActiveTab, label: 'Lip Tracking', icon: Eye },
    { id: 'audio-analysis' as ActiveTab, label: 'Audio Analysis', icon: Activity },
    { id: 'multimodal-fusion' as ActiveTab, label: 'Multimodal Fusion', icon: Share2 },
    { id: 'ci-encoding' as ActiveTab, label: 'CI Encoding', icon: Cpu },
    { id: 'evaluation' as ActiveTab, label: 'Evaluation', icon: CheckCircle2 },
    { id: 'experiments' as ActiveTab, label: 'Experiments', icon: FlaskConical },
  ];

  return (
    <aside
      className={`relative z-20 flex flex-col justify-between bg-white border-r border-slate-200/80 transition-all duration-300 ${
        collapsed ? 'w-18' : 'w-64'
      } shrink-0`}
    >
      <div>
        {/* Collapse toggle at top */}
        <div className="flex items-center justify-end px-3 py-2 border-b border-slate-100">
          <button
            onClick={onToggleCollapse}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation items list */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`relative w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-purple-50/90 text-purple-700 font-semibold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
                title={collapsed ? item.label : undefined}
              >
                {/* Active left indicator bar */}
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-1 bg-purple-600 rounded-r-md" />
                )}

                <Icon
                  className={`w-5 h-5 shrink-0 ${
                    isActive ? 'text-purple-600' : 'text-slate-400'
                  }`}
                />

                {!collapsed && (
                  <span className="truncate">{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Research Goal Card */}
      {!collapsed && (
        <div className="p-4 m-3 rounded-2xl bg-gradient-to-br from-purple-50/70 to-indigo-50/40 border border-purple-100 shadow-2xs">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-900">Research Goal</h4>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Leverage audio and visual speech cues to improve speech understanding for cochlear implant users, especially in noisy environments.
          </p>
          <div className="mt-2.5 pt-2 border-t border-purple-100/80 text-[11px] text-purple-800/80 font-medium flex items-center justify-between">
            <span>CI-AI Multimodal</span>
            <span className="text-[10px] bg-purple-200/60 px-1.5 py-0.5 rounded text-purple-900">Sim v1.0</span>
          </div>
        </div>
      )}
    </aside>
  );
};

import React from 'react';
import { BarChart3 } from 'lucide-react';
import { SimulationState } from '../types';
import { getSnrComparisonData } from '../services/simulationEngine';

interface AudioVsVisualChartProps {
  state: SimulationState;
}

export const AudioVsVisualChart: React.FC<AudioVsVisualChartProps> = ({ state }) => {
  const data = getSnrComparisonData(state);

  const chartHeight = 130;
  const yTicks = [1.0, 0.8, 0.6, 0.4, 0.2, 0.0];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-purple-100 text-purple-600 flex items-center justify-center">
              <BarChart3 className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Audio Only vs Audio-Visual</h3>
          </div>
          {/* Legend */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              <span className="text-slate-600 text-[11px] font-medium">Audio Only</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
              <span className="text-slate-600 text-[11px] font-medium">Audio + Visual</span>
            </div>
          </div>
        </div>
        <p className="text-xs text-slate-500 mb-3">
          Simulated speech recognition performance across signal-to-noise ratios.
        </p>
      </div>

      {/* SVG / Flex Grouped Bar Chart */}
      <div className="relative pt-2">
        <div className="flex items-stretch">
          {/* Y-axis Labels & Grid lines */}
          <div className="flex flex-col justify-between pr-2 text-[9px] font-mono text-slate-400 text-right select-none h-32">
            {yTicks.map((tick) => (
              <span key={tick}>{tick.toFixed(1)}</span>
            ))}
          </div>

          {/* Chart Bars Area */}
          <div className="flex-1 relative h-32 border-b border-l border-slate-200 flex items-end justify-between px-2 pt-2">
            {/* Horizontal Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              {yTicks.map((tick, i) => (
                <div key={i} className="w-full border-t border-slate-100" />
              ))}
            </div>

            {/* Grouped Bars */}
            {data.map((item) => {
              const audioHeight = item.audioOnly * chartHeight;
              const avHeight = item.audioVisual * chartHeight;
              const isSelected = item.isCurrent;

              return (
                <div
                  key={item.snr}
                  className={`relative flex flex-col items-center group h-full justify-end px-1 rounded-t-sm transition-all ${
                    isSelected ? 'bg-purple-50/60 ring-1 ring-purple-300' : ''
                  }`}
                >
                  {/* Tooltip on hover */}
                  <div className="absolute -top-9 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] py-0.5 px-2 rounded pointer-events-none z-20 whitespace-nowrap shadow-md">
                    <div>Audio: {item.audioOnly}</div>
                    <div>A+V: {item.audioVisual}</div>
                  </div>

                  {/* Dual Bars Container */}
                  <div className="flex items-end gap-1 h-full z-10 pb-0.5">
                    {/* Audio Only Bar (Blue) */}
                    <div
                      className="w-3 sm:w-3.5 bg-blue-500 rounded-t-xs transition-all duration-300 hover:brightness-110"
                      style={{ height: `${Math.max(4, audioHeight)}px` }}
                    />
                    {/* Audio + Visual Bar (Purple) */}
                    <div
                      className={`w-3 sm:w-3.5 rounded-t-xs transition-all duration-300 hover:brightness-110 ${
                        state.processingMode === 'Audio Only' ? 'bg-purple-300/40' : 'bg-purple-600'
                      }`}
                      style={{ height: `${Math.max(4, avHeight)}px` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Vertical axis title rotated */}
          <div className="absolute -left-6 top-1/2 -rotate-90 -translate-y-1/2 text-[9px] text-slate-400 font-medium tracking-tight pointer-events-none hidden">
            Recognition Score
          </div>
        </div>

        {/* X-axis ticks */}
        <div className="flex justify-between pl-8 text-[9px] font-mono text-slate-500 mt-1.5 px-2 select-none">
          {data.map((item) => (
            <span
              key={item.snr}
              className={`text-center w-8 ${
                item.isCurrent ? 'font-bold text-purple-700 underline decoration-purple-500 decoration-2' : ''
              }`}
            >
              {item.snrLabel}
            </span>
          ))}
        </div>
        <div className="text-center text-[10px] text-slate-400 font-medium mt-0.5">
          SNR (dB)
        </div>
      </div>
    </div>
  );
};

import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, BookOpen, Activity, Lightbulb } from 'lucide-react';
import { SimulationState, SimulationMetrics } from '../types';
import { askResearchAssistant, AssistantMessage } from '../services/geminiAssistant';

interface AIAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  state: SimulationState;
  metrics: SimulationMetrics;
}

export const AIAssistantDrawer: React.FC<AIAssistantDrawerProps> = ({
  isOpen,
  onClose,
  state,
  metrics,
}) => {
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: 'init-1',
      sender: 'assistant',
      timestamp: 'Just now',
      text: `Hello! I am your CI-AI Biomedical Research Assistant. I monitor the current audio-visual simulation parameters in real-time.

Ask me questions about:
• Audio-visual speech psychophysics in noise
• The mathematical contribution of lip landmarks
• Why multimodal fusion outperforms audio-only CI processing
• Recommended experiment setups`,
      category: 'PAPER FINDING',
    },
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || inputQuery;
    if (!textToSend.trim()) return;

    const userMsg: AssistantMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: textToSend,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInputQuery('');
    setIsTyping(true);

    try {
      const response = await askResearchAssistant(textToSend, state, metrics);
      setMessages((prev) => [...prev, response]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          timestamp: 'Just now',
          text: `[SIMULATION] Simulation data: SNR ${state.snr} dB, Score: ${metrics.speechRecognitionScore}. Visual cues currently provide a +${metrics.visualContribution} speech intelligibility gain.`,
          category: 'SIMULATION',
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const sampleQuestions = [
    'What happens when visual quality decreases?',
    'How much does visual information contribute?',
    'What happens at low SNR?',
    'Why does audio-visual fusion improve the simulated score?',
    'What experiment should I run next?',
  ];

  if (!isOpen) return null;

  return (
    <aside className="fixed inset-y-0 right-0 z-40 w-96 bg-white border-l border-slate-200 shadow-2xl flex flex-col justify-between">
      {/* Header */}
      <div className="p-4 border-b border-slate-200/80 flex items-center justify-between bg-purple-50/40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
            AI
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 leading-none">
              AI Research Assistant
            </h3>
            <span className="text-[11px] text-purple-700 font-medium">
              Multimodal CI Psychophysics
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Quick Questions Pills */}
      <div className="p-3 border-b border-slate-100 bg-slate-50/60 overflow-x-auto space-y-1.5">
        <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
          Suggested Inquiries:
        </div>
        <div className="flex flex-col gap-1">
          {sampleQuestions.slice(0, 3).map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q)}
              className="text-left text-[11px] text-purple-700 bg-white hover:bg-purple-100/60 border border-purple-200/60 px-2.5 py-1 rounded-lg transition-colors truncate"
            >
              • {q}
            </button>
          ))}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.sender === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div
              className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-xs ${
                msg.sender === 'user'
                  ? 'bg-purple-600 text-white rounded-br-xs'
                  : 'bg-slate-100/90 text-slate-800 rounded-bl-xs border border-slate-200/70'
              }`}
            >
              {/* Category tag if present */}
              {msg.category && msg.sender === 'assistant' && (
                <div className="mb-1.5 flex items-center gap-1.5">
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded tracking-wide ${
                      msg.category === 'PAPER FINDING'
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : msg.category === 'SIMULATION'
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-100 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {msg.category}
                  </span>
                </div>
              )}
              <div className="whitespace-pre-line leading-relaxed font-sans">
                {msg.text}
              </div>
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 px-1">
              {msg.timestamp}
            </span>
          </div>
        ))}

        {isTyping && (
          <div className="flex items-center gap-1.5 text-xs text-slate-400 italic py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-bounce"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-bounce [animation-delay:0.2s]"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-bounce [animation-delay:0.4s]"></span>
            <span>Synthesizing multimodal psychophysics data...</span>
          </div>
        )}
      </div>

      {/* Bottom Input Field */}
      <div className="p-3 border-t border-slate-200 bg-white">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Ask about speech reading in noise, CI coding..."
            className="flex-1 py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:border-purple-500 focus:bg-white"
          />
          <button
            type="submit"
            disabled={!inputQuery.trim() || isTyping}
            className="p-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl shadow-xs transition-colors shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </aside>
  );
};


import React, { useState, useRef, useEffect } from 'react';
import { sendChatMessage } from '../services/aiService';
import { AppState } from '../types';
import { Send, Loader2, ChevronLeft, BrainCircuit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export const AIChatPage: React.FC<{ state: AppState }> = ({ state }) => {
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'assistant', 
      content: `Привет, **${state.profile.name}**! 👋\n\nЯ твой ассистент на базе **Gemini AI**. Готов проанализировать твои финансы.\n\nЧем могу помочь?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  const handleSend = async (text: string) => {
    if (!text.trim() || isGenerating) return;

    const userMsg: Message = { 
      role: 'user', 
      content: text, 
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsGenerating(true);

    try {
      const summary = `Баланс: ${state.accounts.reduce((a, b) => a + b.balance, 0)} ${state.profile.currency}.`;
      const systemInstruction = `Ты - FinFlow AI (Gemini). Будь краток и профессионален. Твои данные: ${summary}`;

      const apiHistory = messages.map(m => ({ role: m.role, content: m.content }));
      apiHistory.push({ role: 'user', content: text });

      const response = await sendChatMessage(apiHistory, systemInstruction);

      if (response) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: response,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: "🚨 Ошибка связи с Gemini AI.", timestamp: "сейчас" }]);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] max-w-md mx-auto bg-[#f0f2f5] relative">
      <header className="flex-shrink-0 px-4 pt-[calc(env(safe-area-inset-top,0px)+12px)] pb-3 bg-white/90 backdrop-blur-md border-b border-slate-200 flex items-center gap-3 z-50">
        <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center text-slate-500 rounded-full hover:bg-slate-100">
          <ChevronLeft size={24} />
        </button>
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center text-indigo-400 shadow-lg">
            <BrainCircuit size={22} />
          </div>
          <div className="flex flex-col">
            <h2 className="font-bold text-slate-900 text-[15px]">Gemini AI</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{isGenerating ? 'Печатает...' : 'Online'}</p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 no-scrollbar relative z-10 scroll-smooth">
        {messages.map((m, i) => (
          <div key={i} className={`flex w-full ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}>
            <div className={`max-w-[88%] flex flex-col gap-1 ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
               <div className={`relative px-4 py-2.5 shadow-sm text-[15px] leading-relaxed ${
                m.role === 'user' ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-none' : 'bg-white text-slate-800 rounded-2xl rounded-tl-none border border-slate-200/50'
              }`}>
                <div className="markdown-content">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
                <div className={`text-[9px] mt-1.5 flex justify-end font-bold uppercase tracking-wider ${m.role === 'user' ? 'text-indigo-200' : 'text-slate-400'}`}>
                  {m.timestamp}
                </div>
              </div>
            </div>
          </div>
        ))}
        {isGenerating && (
          <div className="flex justify-start">
             <div className="bg-white px-4 py-2 rounded-2xl border border-slate-200 text-slate-400 text-xs animate-pulse">Gemini думает...</div>
          </div>
        )}
        <div ref={chatEndRef} className="h-2" />
      </div>

      <div className="flex-shrink-0 p-3 bg-white/80 backdrop-blur-xl border-t border-slate-200 z-50">
        <div className="flex items-end gap-2 p-1.5 rounded-[1.75rem] bg-slate-100/80 border border-slate-200">
          <textarea 
            rows={1}
            value={input}
            disabled={isGenerating}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(input); } }}
            placeholder="Спроси о тратах..."
            className="flex-grow bg-transparent px-3 py-2 text-[15px] font-medium text-slate-800 outline-none resize-none"
          />
          <button 
            onClick={() => handleSend(input)}
            disabled={!input.trim() || isGenerating}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${input.trim() && !isGenerating ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-200 text-slate-400'}`}
          >
            {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
};

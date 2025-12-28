
import React, { useMemo, useState } from 'react';
import { AppState } from '../types';
import { ChevronLeft, Sparkles, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { sendChatMessage } from '../services/aiService';
import ReactMarkdown from 'react-markdown';

interface AnalyticsPageProps {
  state: AppState;
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ state }) => {
  const navigate = useNavigate();
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { transactions, profile } = state;

  const totalExpense = useMemo(() => {
    return transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  }, [transactions]);

  const generateAIReport = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      const dataStr = transactions.slice(-15).map(t => `${t.amount} ${profile.currency}`).join(', ');
      const prompt = `Проанализируй операции: ${dataStr}. Расход: ${totalExpense}. Дай 2 совета на русском.`;
      
      const response = await sendChatMessage([{ role: 'user', content: prompt }], "Ты аналитик Mistral AI. Пиши четко.");
      setAiReport(response || "Ошибка анализа.");
    } catch (error) {
      setAiReport("🚨 Ошибка Mistral API.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-5 animate-slide-up pb-24">
      <header className="flex items-center gap-3 px-2 pt-2">
        <button onClick={() => navigate(-1)} className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-500 shadow-sm"><ChevronLeft size={20} /></button>
        <div className="flex flex-col">
          <h1 className="text-slate-900 text-[14px] font-extrabold uppercase">Аналитика</h1>
          <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest">Mistral Intelligence</p>
        </div>
      </header>

      <div className="px-1">
        <div className="bg-slate-900 rounded-[2rem] p-6 text-white shadow-xl">
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Всего расходов</p>
          <h2 className="text-3xl font-black">{totalExpense.toLocaleString()} {profile.currency}</h2>
        </div>
      </div>

      <div className="px-1">
        <div className="bg-white rounded-[2rem] p-5 border border-slate-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-800 text-[13px] uppercase tracking-tight">Отчет Mistral AI</h3>
            {!aiReport && (
              <button onClick={generateAIReport} disabled={isGenerating} className="px-4 py-2 bg-slate-900 text-white text-[10px] font-bold uppercase rounded-xl flex items-center gap-2">
                {isGenerating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} Анализ
              </button>
            )}
          </div>
          {aiReport && (
            <div className="bg-indigo-50/50 rounded-2xl p-4 border border-indigo-100/50 animate-slide-up">
              <div className="markdown-content text-[13px] text-slate-700">
                <ReactMarkdown>{aiReport}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

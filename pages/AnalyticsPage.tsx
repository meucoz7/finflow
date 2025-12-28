
import React, { useMemo } from 'react';
import { AppState } from '../types';
import { ChevronLeft, PieChart, TrendingDown, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AnalyticsPageProps {
  state: AppState;
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ state }) => {
  const navigate = useNavigate();
  const { transactions, profile } = state;

  const totalExpense = useMemo(() => {
    return transactions.filter(t => t.type === 'expense' && !t.isPlanned).reduce((s, t) => s + t.amount, 0);
  }, [transactions]);

  const totalIncome = useMemo(() => {
    return transactions.filter(t => t.type === 'income' && !t.isPlanned).reduce((s, t) => s + t.amount, 0);
  }, [transactions]);

  return (
    <div className="space-y-5 animate-slide-up pb-24 pt-[env(safe-area-inset-top,8px)]">
      <header className="flex items-center gap-3 px-2 pt-2">
        <button onClick={() => navigate(-1)} className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-500 shadow-sm"><ChevronLeft size={20} /></button>
        <div className="flex flex-col">
          <h1 className="text-slate-900 text-[14px] font-extrabold uppercase">Статистика</h1>
          <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest">Обзор финансов</p>
        </div>
      </header>

      <div className="px-1 grid grid-cols-1 gap-4">
        <div className="bg-slate-900 rounded-[2rem] p-6 text-white shadow-xl flex flex-col gap-1">
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Всего расходов</p>
          <div className="flex items-baseline gap-2">
            <h2 className="text-3xl font-black">{totalExpense.toLocaleString()}</h2>
            <span className="text-slate-500 font-bold">{profile.currency}</span>
          </div>
        </div>

        <div className="bg-emerald-500 rounded-[2rem] p-6 text-white shadow-xl flex flex-col gap-1">
          <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-widest">Всего доходов</p>
          <div className="flex items-baseline gap-2">
            <h2 className="text-3xl font-black">{totalIncome.toLocaleString()}</h2>
            <span className="text-emerald-200 font-bold">{profile.currency}</span>
          </div>
        </div>
      </div>

      <div className="px-1">
        <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                <PieChart size={32} />
            </div>
            <div className="space-y-1">
                <p className="text-[13px] font-bold text-slate-800 uppercase tracking-tight">Расширенная аналитика</p>
                <p className="text-[11px] text-slate-400 font-medium">Графики по категориям и динамика за год будут доступны в следующем обновлении.</p>
            </div>
        </div>
      </div>
    </div>
  );
};

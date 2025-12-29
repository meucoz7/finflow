
import React, { useMemo, useState } from 'react';
import { AppState, Transaction, Category } from '../types';
import { ChevronLeft, PieChart, TrendingDown, TrendingUp, BarChart3, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AnalyticsPageProps {
  state: AppState;
}

const DonutChart: React.FC<{ data: { label: string, amount: number, color: string }[], total: number }> = ({ data, total }) => {
  let cumulativePercent = 0;

  function getCoordinatesForPercent(percent: number) {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  }

  return (
    <div className="relative w-full aspect-square flex items-center justify-center">
      <svg viewBox="-1.2 -1.2 2.4 2.4" className="w-full h-full -rotate-90">
        {data.length === 0 ? (
          <circle cx="0" cy="0" r="1" fill="#f1f5f9" />
        ) : (
          data.map((slice, i) => {
            const percent = slice.amount / total;
            const [startX, startY] = getCoordinatesForPercent(cumulativePercent);
            cumulativePercent += percent;
            const [endX, endY] = getCoordinatesForPercent(cumulativePercent);
            const largeArcFlag = percent > 0.5 ? 1 : 0;
            const pathData = [
              `M ${startX} ${startY}`,
              `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`,
              `L 0 0`,
            ].join(' ');
            return <path key={i} d={pathData} fill={slice.color} className="transition-all hover:opacity-80 cursor-pointer" />;
          })
        )}
        <circle cx="0" cy="0" r="0.75" fill="white" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Итого</p>
        <p className="text-xl font-black text-slate-900 tracking-tighter">{total.toLocaleString()}</p>
      </div>
    </div>
  );
};

const DynamicsChart: React.FC<{ transactions: Transaction[] }> = ({ transactions }) => {
  const months = useMemo(() => {
    const result = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth();
      const y = d.getFullYear();
      
      const monthTxs = transactions.filter(t => {
        const td = new Date(t.date);
        return td.getMonth() === m && td.getFullYear() === y && !t.isPlanned;
      });

      result.push({
        name: d.toLocaleString('ru-RU', { month: 'short' }).toUpperCase(),
        income: monthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
        expense: monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
      });
    }
    return result;
  }, [transactions]);

  const maxVal = Math.max(...months.map(m => Math.max(m.income, m.expense, 1)));

  return (
    <div className="flex items-end justify-between h-32 gap-3 px-1">
      {months.map((m, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-2">
          <div className="w-full h-full flex items-end gap-1">
            <div 
              className="flex-1 bg-emerald-400 rounded-t-lg transition-all duration-700" 
              style={{ height: `${(m.income / maxVal) * 100}%`, minHeight: m.income > 0 ? '4px' : '0px' }}
            />
            <div 
              className="flex-1 bg-rose-400 rounded-t-lg transition-all duration-700" 
              style={{ height: `${(m.expense / maxVal) * 100}%`, minHeight: m.expense > 0 ? '4px' : '0px' }}
            />
          </div>
          <span className="text-[8px] font-black text-slate-400">{m.name}</span>
        </div>
      ))}
    </div>
  );
};

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ state }) => {
  const navigate = useNavigate();
  const { transactions, profile, categories } = state;

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const currentMonthTransactions = useMemo(() => 
    transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear && !t.isPlanned;
    }),
  [transactions, currentMonth, currentYear]);

  const totalExpense = useMemo(() => 
    currentMonthTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0), 
  [currentMonthTransactions]);

  const totalIncome = useMemo(() => 
    currentMonthTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0), 
  [currentMonthTransactions]);

  const expenseByCategory = useMemo(() => {
    const groups: Record<string, { label: string, amount: number, color: string, icon: string }> = {};
    currentMonthTransactions.filter(t => t.type === 'expense').forEach(t => {
      const cat = categories.find(c => c.id === t.categoryId) || { name: 'Прочее', color: '#94a3b8', icon: '📦' };
      if (!groups[cat.name]) groups[cat.name] = { label: cat.name, amount: 0, color: cat.color, icon: cat.icon };
      groups[cat.name].amount += t.amount;
    });
    return Object.values(groups).sort((a, b) => b.amount - a.amount);
  }, [currentMonthTransactions, categories]);

  return (
    <div className="space-y-6 animate-slide-up pb-24 pt-[env(safe-area-inset-top,8px)]">
      <header className="flex items-center gap-3 px-2 pt-2">
        <button onClick={() => navigate(-1)} className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-500 shadow-sm active:scale-90 transition-all"><ChevronLeft size={20} /></button>
        <div className="flex flex-col">
          <h1 className="text-slate-900 text-[14px] font-extrabold uppercase tracking-tight">Статистика</h1>
          <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest">{new Date().toLocaleString('ru-RU', { month: 'long', year: 'numeric' })}</p>
        </div>
      </header>

      <section className="px-1 grid grid-cols-2 gap-3">
        <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-3xl flex flex-col gap-1">
          <TrendingUp size={16} className="text-emerald-500 mb-1" />
          <p className="text-emerald-700/60 text-[9px] font-black uppercase tracking-widest">Доходы</p>
          <h3 className="text-lg font-black text-emerald-700">+{totalIncome.toLocaleString()}</h3>
        </div>
        <div className="bg-rose-50 border border-rose-100 p-4 rounded-3xl flex flex-col gap-1">
          <TrendingDown size={16} className="text-rose-500 mb-1" />
          <p className="text-rose-700/60 text-[9px] font-black uppercase tracking-widest">Расходы</p>
          <h3 className="text-lg font-black text-rose-700">-{totalExpense.toLocaleString()}</h3>
        </div>
      </section>

      {/* Distribution Section */}
      <section className="px-1 space-y-4">
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center gap-2 px-1">
            <PieChart size={16} className="text-indigo-500" />
            <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Распределение трат</h3>
          </div>
          
          <div className="grid grid-cols-5 gap-6 items-center">
            <div className="col-span-2">
              <DonutChart data={expenseByCategory} total={totalExpense} />
            </div>
            <div className="col-span-3 space-y-2.5">
              {expenseByCategory.slice(0, 4).map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm shrink-0">{item.icon}</span>
                    <span className="text-[10px] font-bold text-slate-600 truncate uppercase">{item.label}</span>
                  </div>
                  <span className="text-[10px] font-black text-slate-900 ml-2 whitespace-nowrap">
                    {Math.round((item.amount / (totalExpense || 1)) * 100)}%
                  </span>
                </div>
              ))}
              {expenseByCategory.length > 4 && (
                <p className="text-[9px] text-slate-400 font-bold uppercase text-center pt-1 italic">
                  + еще {expenseByCategory.length - 4} категорий
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Dynamics Section */}
      <section className="px-1 space-y-4">
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <BarChart3 size={16} className="text-indigo-500" />
              <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Динамика 6 мес.</h3>
            </div>
            <div className="flex gap-2">
               <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-400" /><span className="text-[8px] font-bold text-slate-400 uppercase">Дох</span></div>
               <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-rose-400" /><span className="text-[8px] font-bold text-slate-400 uppercase">Рас</span></div>
            </div>
          </div>
          
          <DynamicsChart transactions={transactions} />
        </div>
      </section>

      {/* Insight Card */}
      <section className="px-1">
        <div className="bg-slate-900 p-6 rounded-[2.5rem] text-white flex items-center gap-5 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-2xl -mr-12 -mt-12" />
          <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center shrink-0 border border-white/10 backdrop-blur-sm">
            <Target size={28} className="text-amber-400" />
          </div>
          <div>
            <p className="text-[14px] font-black uppercase tracking-tight mb-1">Совет от FinFlow</p>
            <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
              В этом месяце вы потратили на 15% меньше, чем в прошлом. Отличная работа! Рекомендуем отложить сэкономленные 
              <span className="text-amber-400 font-black mx-1">{(totalIncome * 0.1).toLocaleString()} {profile.currency}</span> в цели.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

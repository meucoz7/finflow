
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppState, Transaction } from '../types';
import { 
  ChevronLeft, 
  Search, 
  ArrowUpDown, 
  X,
  Calendar as CalendarIcon,
  ChevronRight,
  Filter,
  Check
} from 'lucide-react';

interface FullHistoryPageProps {
  state: AppState;
  onEditTransaction: (tx: Transaction) => void;
}

type Period = 'today' | 'week' | 'month' | 'year' | 'all' | 'custom';
type SortOrder = 'newest' | 'oldest';

export const FullHistoryPage: React.FC<FullHistoryPageProps> = ({ state, onEditTransaction }) => {
  const navigate = useNavigate();
  const { transactions, categories, accounts, profile, debts } = state;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('all');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  
  // Custom Date Range States
  const [isCustomPickerOpen, setIsCustomPickerOpen] = useState(false);
  const [customRange, setCustomRange] = useState<{ start: string | null; end: string | null }>({ start: null, end: null });
  const [viewDate, setViewDate] = useState(new Date());

  // Find the very first transaction date to disable earlier dates
  const minTransactionDate = useMemo(() => {
    if (transactions.length === 0) return new Date().getTime();
    return Math.min(...transactions.map(t => new Date(t.date).getTime()));
  }, [transactions]);

  const filteredAndSorted = useMemo(() => {
    let result = [...transactions].filter(t => !t.isPlanned);

    // Period Filter
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    if (selectedPeriod === 'custom' && customRange.start) {
      const start = new Date(customRange.start).getTime();
      const end = customRange.end ? new Date(customRange.end).getTime() + (24 * 60 * 60 * 1000 - 1) : start + (24 * 60 * 60 * 1000 - 1);
      result = result.filter(t => {
        const tTime = new Date(t.date).getTime();
        return tTime >= start && tTime <= end;
      });
    } else if (selectedPeriod !== 'all' && selectedPeriod !== 'custom') {
      result = result.filter(t => {
        const tDate = new Date(t.date).getTime();
        if (selectedPeriod === 'today') return tDate >= todayStart;
        if (selectedPeriod === 'week') return tDate >= todayStart - 7 * 24 * 60 * 60 * 1000;
        if (selectedPeriod === 'month') return tDate >= new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).getTime();
        if (selectedPeriod === 'year') return tDate >= new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).getTime();
        return true;
      });
    }

    // Account Filter
    if (selectedAccountId !== 'all') {
      result = result.filter(t => t.accountId === selectedAccountId);
    }

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t => {
        const cat = categories.find(c => c.id === t.categoryId);
        const linkedDebt = debts.find(d => d.id === t.linkedDebtId);
        return (
          (cat?.name.toLowerCase().includes(q)) ||
          (t.note.toLowerCase().includes(q)) ||
          (linkedDebt?.personName.toLowerCase().includes(q))
        );
      });
    }

    result.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [transactions, selectedPeriod, customRange, selectedAccountId, searchQuery, sortOrder, categories, debts]);

  const groupedTransactions = useMemo(() => {
    const groups: { date: string, items: Transaction[] }[] = [];
    filteredAndSorted.forEach(t => {
      const d = new Date(t.date);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      let dateStr = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
      if (d.toDateString() === today.toDateString()) dateStr = 'Сегодня';
      else if (d.toDateString() === yesterday.toDateString()) dateStr = 'Вчера';

      const existingGroup = groups.find(g => g.date === dateStr);
      if (existingGroup) existingGroup.items.push(t);
      else groups.push({ date: dateStr, items: [t] });
    });
    return groups;
  }, [filteredAndSorted]);

  // Calendar Helper
  const monthGrid = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    let startDay = firstDay.getDay();
    startDay = startDay === 0 ? 6 : startDay - 1; // Mon-based
    const days = [];
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i).toISOString().split('T')[0]);
    }
    return days;
  }, [viewDate]);

  const handleDateClick = (dateStr: string) => {
    if (new Date(dateStr).getTime() < new Date(new Date(minTransactionDate).setHours(0,0,0,0)).getTime()) return;

    if (!customRange.start || (customRange.start && customRange.end)) {
      setCustomRange({ start: dateStr, end: null });
    } else {
      if (new Date(dateStr) < new Date(customRange.start)) {
        setCustomRange({ start: dateStr, end: customRange.start });
      } else {
        setCustomRange({ ...customRange, end: dateStr });
      }
    }
  };

  const isInRange = (dateStr: string) => {
    if (!customRange.start || !customRange.end) return false;
    const date = new Date(dateStr).getTime();
    const start = new Date(customRange.start).getTime();
    const end = new Date(customRange.end).getTime();
    return date >= start && date <= end;
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 animate-slide-up pb-32">
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-100 pt-[env(safe-area-inset-top,12px)] px-4 pb-4 shadow-sm">
        <div className="flex items-center gap-4 mb-4">
          <button onClick={() => navigate(-1)} className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-500 active:scale-90 transition-all">
            <ChevronLeft size={22} />
          </button>
          <div className="flex-grow">
            <h1 className="text-lg font-black text-slate-900 tracking-tight">История</h1>
            <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">
              Всего: {filteredAndSorted.length}
            </p>
          </div>
          <button 
            onClick={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
            className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${sortOrder === 'oldest' ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-100 text-slate-500'}`}
          >
            <ArrowUpDown size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Поиск..."
              className="w-full bg-slate-100 border border-slate-200 rounded-2xl py-3.5 pl-11 pr-4 text-sm font-bold outline-none focus:bg-white focus:ring-4 focus:ring-indigo-50 transition-all shadow-inner"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300">
                <X size={18} />
              </button>
            )}
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {[
              { id: 'all', label: 'Все' },
              { id: 'today', label: 'Сегодня' },
              { id: 'week', label: 'Неделя' },
              { id: 'month', label: 'Месяц' },
              { id: 'custom', label: 'Свой' }
            ].map(p => (
              <button
                key={p.id}
                onClick={() => {
                  if (p.id === 'custom') setIsCustomPickerOpen(true);
                  setSelectedPeriod(p.id as Period);
                }}
                className={`flex-shrink-0 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  selectedPeriod === p.id 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
                  : 'bg-white border border-slate-100 text-slate-400'
                }`}
              >
                {p.id === 'custom' && customRange.start ? (
                    <span className="flex items-center gap-1.5">
                        <CalendarIcon size={12} />
                        {new Date(customRange.start).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                        {customRange.end && ` - ${new Date(customRange.end).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}`}
                    </span>
                ) : p.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            <button
              onClick={() => setSelectedAccountId('all')}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                selectedAccountId === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'
              }`}
            >
              Все счета
            </button>
            {accounts.map(acc => (
              <button
                key={acc.id}
                onClick={() => setSelectedAccountId(acc.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${
                  selectedAccountId === acc.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'
                }`}
              >
                <span>{acc.icon}</span> {acc.name}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="p-4 space-y-8">
        {groupedTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
             <div className="w-24 h-24 bg-slate-100 rounded-[2.5rem] flex items-center justify-center text-slate-200 mb-4 shadow-inner">
                <Filter size={48} />
             </div>
             <p className="text-[14px] font-black text-slate-900 uppercase">Нет операций</p>
             <p className="text-[11px] text-slate-400 font-bold uppercase tracking-tight mt-1">Попробуйте другие фильтры</p>
          </div>
        ) : (
          groupedTransactions.map(group => (
            <div key={group.date} className="space-y-4">
              <h3 className="sticky top-[245px] z-30 inline-block px-5 py-2 bg-slate-100/90 backdrop-blur-md text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] shadow-sm border border-white/50">
                {group.date}
              </h3>
              
              <div className="space-y-3">
                {group.items.map(t => {
                  const cat = categories.find(c => c.id === t.categoryId);
                  const acc = accounts.find(a => a.id === t.accountId);
                  const linkedDebt = debts.find(d => d.id === t.linkedDebtId);
                  const displayName = linkedDebt ? linkedDebt.personName : (cat?.name || 'Операция');
                  const displayIcon = linkedDebt ? (linkedDebt.isBank ? '🏦' : '🤝') : (cat?.icon || '📦');

                  return (
                    <div 
                      key={t.id} 
                      onClick={() => onEditTransaction(t)}
                      className="bg-white p-4 rounded-[2.2rem] flex items-center justify-between border border-slate-50 shadow-sm active:scale-[0.98] active:bg-slate-50 transition-all group"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div 
                          className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-inner shrink-0"
                          style={{ backgroundColor: `${cat?.color || '#6366f1'}12`, color: cat?.color || '#6366f1' }}
                        >
                          {displayIcon}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-900 text-[14px] leading-tight truncate uppercase tracking-tight">
                            {displayName}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-slate-400 font-bold uppercase truncate">
                              {acc?.name}
                            </span>
                            {t.note && (
                              <>
                                <div className="w-1 h-1 bg-slate-200 rounded-full" />
                                <span className="text-[10px] text-slate-300 font-medium truncate italic max-w-[120px]">
                                  {t.note.replace(/^\[ДОЛГ\]\s*/, '')}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className={`font-black text-[17px] tracking-tighter ${
                          t.type === 'income' ? 'text-emerald-500' : 
                          t.type === 'savings' ? 'text-indigo-600' : 'text-slate-900'
                        }`}>
                          {t.type === 'income' ? '+' : '-'}{t.amount.toLocaleString()}
                        </p>
                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest leading-none mt-1">
                          {profile.currency}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </main>

      {/* Custom Date Picker Modal */}
      {isCustomPickerOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsCustomPickerOpen(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-[2.5rem] p-6 shadow-2xl animate-slide-up flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() - 1)))} className="p-2.5 bg-slate-50 rounded-xl text-slate-500 active:scale-90 transition-all">
                <ChevronLeft size={20} />
              </button>
              <div className="text-center">
                <h3 className="font-black text-slate-900 uppercase text-[12px] tracking-[0.1em]">
                  {viewDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
                </h3>
              </div>
              <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() + 1)))} className="p-2.5 bg-slate-50 rounded-xl text-slate-500 active:scale-90 transition-all">
                <ChevronRight size={20} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => (
                <div key={day} className="text-center text-[9px] font-black text-slate-300 uppercase py-1">{day}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {monthGrid.map((dateStr, idx) => {
                if (!dateStr) return <div key={`empty-${idx}`} />;
                const d = new Date(dateStr);
                const isSelected = customRange.start === dateStr || customRange.end === dateStr;
                const isBetween = isInRange(dateStr);
                const isToday = new Date().toISOString().split('T')[0] === dateStr;
                const isDisabled = d.getTime() < new Date(new Date(minTransactionDate).setHours(0,0,0,0)).getTime();

                return (
                  <button
                    key={dateStr}
                    disabled={isDisabled}
                    onClick={() => handleDateClick(dateStr)}
                    className={`aspect-square rounded-xl flex items-center justify-center transition-all relative text-[13px] ${
                      isDisabled 
                        ? 'text-slate-200 cursor-not-allowed' 
                        : isSelected 
                          ? 'bg-indigo-600 text-white font-black shadow-lg z-10' 
                          : isBetween 
                            ? 'bg-indigo-50 text-indigo-600 font-bold' 
                            : isToday 
                              ? 'text-indigo-500 font-black ring-1 ring-indigo-100' 
                              : 'text-slate-700 font-bold hover:bg-slate-50'
                    }`}
                  >
                    {d.getDate()}
                  </button>
                );
              })}
            </div>

            <div className="mt-8 flex gap-3">
              <button 
                onClick={() => {
                  setCustomRange({ start: null, end: null });
                  setSelectedPeriod('all');
                  setIsCustomPickerOpen(false);
                }}
                className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
              >
                Сбросить
              </button>
              <button 
                disabled={!customRange.start}
                onClick={() => {
                  setSelectedPeriod('custom');
                  setIsCustomPickerOpen(false);
                }}
                className="flex-2 flex items-center justify-center gap-2 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all disabled:opacity-20 px-8"
              >
                Применить <Check size={14} />
              </button>
            </div>

            <button onClick={() => setIsCustomPickerOpen(false)} className="absolute top-4 right-4 p-2 text-slate-300"><X size={20} /></button>
          </div>
        </div>
      )}
    </div>
  );
};


import React, { useMemo, useState, useEffect } from 'react';
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
  Check,
  RefreshCw,
  ListFilter,
  TrendingDown,
  TrendingUp,
  ArrowRightLeft,
  CalendarDays,
  Wallet
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
  const tg = (window as any).Telegram?.WebApp;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('all');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  
  const [isCustomPickerOpen, setIsCustomPickerOpen] = useState(false);
  const [customRange, setCustomRange] = useState<{ start: string | null; end: string | null }>({ start: null, end: null });
  const [viewDate, setViewDate] = useState(new Date());

  useEffect(() => {
    window.scrollTo(0, 0);
    if (tg) {
      tg.setHeaderColor('#ffffff');
    }
    return () => {
      if (tg) tg.setHeaderColor('#f8fafc');
    };
  }, [tg]);

  const minTransactionDate = useMemo(() => {
    if (transactions.length === 0) return new Date().getTime();
    return Math.min(...transactions.map(t => new Date(t.date).getTime()));
  }, [transactions]);

  const filteredAndSorted = useMemo(() => {
    let result = [...transactions].filter(t => !t.isPlanned);
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

    if (selectedAccountId !== 'all') {
      result = result.filter(t => t.accountId === selectedAccountId);
    }

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

  const periodStats = useMemo(() => {
    return filteredAndSorted.reduce((acc, t) => {
      if (t.type === 'income') acc.income += t.amount;
      else if (t.type === 'expense') acc.expense += t.amount;
      return acc;
    }, { income: 0, expense: 0 });
  }, [filteredAndSorted]);

  const groupedTransactions = useMemo(() => {
    const groups: { date: string, items: Transaction[] }[] = [];
    filteredAndSorted.forEach(t => {
      const d = new Date(t.date);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      let dateStr = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
      if (d.toDateString() === today.toDateString()) dateStr = 'Сегодня';
      else if (d.toDateString() === yesterday.toDateString()) dateStr = 'Вчера';
      else if (d.getFullYear() !== today.getFullYear()) {
        dateStr = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
      }

      const existingGroup = groups.find(g => g.date === dateStr);
      if (existingGroup) existingGroup.items.push(t);
      else groups.push({ date: dateStr, items: [t] });
    });
    return groups;
  }, [filteredAndSorted]);

  const monthGrid = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    let startDay = firstDay.getDay();
    startDay = startDay === 0 ? 6 : startDay - 1;
    const days = [];
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i).toISOString().split('T')[0]);
    }
    return days;
  }, [viewDate]);

  const handleDateClick = (dateStr: string) => {
    const dTime = new Date(dateStr).getTime();
    const minTime = new Date(new Date(minTransactionDate).setHours(0,0,0,0)).getTime();
    if (dTime < minTime) return;

    if (!customRange.start || (customRange.start && customRange.end)) {
      setCustomRange({ start: dateStr, end: null });
    } else {
      if (new Date(dateStr) < new Date(customRange.start)) {
        setCustomRange({ start: dateStr, end: customRange.start });
      } else {
        setCustomRange({ ...customRange, end: dateStr });
      }
    }
    tg?.HapticFeedback?.impactOccurred('light');
  };

  const isInRange = (dateStr: string) => {
    if (!customRange.start || !customRange.end) return false;
    const date = new Date(dateStr).getTime();
    const start = new Date(customRange.start).getTime();
    const end = new Date(customRange.end).getTime();
    return date > start && date < end;
  };

  const handleTxClick = (t: Transaction) => {
    onEditTransaction(t);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 animate-fade-in pb-32">
      {/* --- Адаптированная Шапка --- */}
      <div className="sticky top-0 z-[100] w-full bg-white shadow-[0_4px_25px_-5px_rgba(0,0,0,0.06)]">
        <div className="pt-[env(safe-area-inset-top,0px)]">
          <header className="px-4 py-4 flex flex-col gap-5">
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => navigate(-1)} 
                  className="w-12 h-12 flex items-center justify-center text-slate-800 bg-slate-100 rounded-[1.25rem] active:scale-90 transition-all"
                >
                  <ChevronLeft size={24} strokeWidth={2.5} />
                </button>
                <div className="flex flex-col">
                  <h1 className="text-[19px] font-black text-slate-900 tracking-tight leading-none uppercase">История</h1>
                  <p className="text-[11px] font-black text-indigo-500 uppercase tracking-widest mt-1.5 opacity-80">
                    {filteredAndSorted.length} операций
                  </p>
                </div>
              </div>

              <button 
                onClick={() => {
                  setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest');
                  tg?.HapticFeedback?.impactOccurred('light');
                }}
                className={`w-12 h-12 flex items-center justify-center rounded-[1.25rem] transition-all ${sortOrder === 'oldest' ? 'bg-slate-900 text-white shadow-xl' : 'bg-slate-50 text-slate-400'}`}
              >
                <ArrowUpDown size={20} strokeWidth={2.5} />
              </button>
            </div>

            <div className="relative overflow-hidden bg-slate-900 rounded-[2rem] px-6 py-5 text-white shadow-2xl shadow-slate-900/10">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/15 rounded-full blur-2xl -mr-16 -mt-16" />
              
              <div className="relative z-10 flex items-center justify-between gap-6">
                <div className="flex flex-col gap-1.5">
                  <span className="text-white/40 text-[10px] font-black uppercase tracking-[0.25em]">Сальдо периода</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[26px] font-black tracking-tighter leading-none">{(periodStats.income - periodStats.expense).toLocaleString()}</span>
                    <span className="text-[11px] font-bold opacity-30 uppercase tracking-widest">{profile.currency}</span>
                  </div>
                </div>

                <div className="h-12 w-[1px] bg-white/10" />

                <div className="flex flex-col gap-1.5 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-400 font-black text-[13px] tracking-tight">+{periodStats.income.toLocaleString()}</span>
                    <TrendingUp size={12} className="text-emerald-500/40" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-rose-400 font-black text-[13px] tracking-tight">-{periodStats.expense.toLocaleString()}</span>
                    <TrendingDown size={12} className="text-rose-500/40" />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Найти операцию..."
                  className="w-full h-14 bg-slate-50 border-2 border-transparent rounded-[1.25rem] pl-12 pr-12 text-[15px] font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-indigo-100 focus:ring-4 focus:ring-indigo-50/30 transition-all shadow-inner"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-slate-300">
                  <Search size={20} strokeWidth={2.5} />
                </div>
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-slate-300 active:text-slate-600 transition-colors">
                    <X size={18} strokeWidth={3} />
                  </button>
                )}
              </div>

              {/* Улучшенные кнопки фильтров */}
              <div className="flex flex-col gap-3.5">
                <div className="flex gap-2.5 overflow-x-auto no-scrollbar py-1 px-0.5">
                  {[
                    { id: 'all', label: 'Все', icon: <ListFilter size={16} /> },
                    { id: 'today', label: 'Сегодня' },
                    { id: 'week', label: '7 дней' },
                    { id: 'month', label: 'Месяц' },
                    { id: 'custom', label: 'Диапазон', icon: <CalendarDays size={16} /> }
                  ].map(p => (
                    <button
                      key={p.id}
                      onClick={() => {
                        tg?.HapticFeedback?.impactOccurred('light');
                        if (p.id === 'custom') setIsCustomPickerOpen(true);
                        else setSelectedPeriod(p.id as Period);
                      }}
                      className={`flex-shrink-0 h-11 px-6 rounded-2xl text-[12px] font-black uppercase tracking-[0.1em] transition-all flex items-center gap-2.5 border-2 ${
                        selectedPeriod === p.id 
                        ? 'bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-200' 
                        : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                      }`}
                    >
                      {p.icon}
                      {p.id === 'custom' && customRange.start ? (
                          <span className="text-indigo-400 font-black">
                              {new Date(customRange.start).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                              {customRange.end && ` - ${new Date(customRange.end).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}`}
                          </span>
                      ) : p.label}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2.5 overflow-x-auto no-scrollbar py-1 px-0.5">
                  <button
                    onClick={() => { setSelectedAccountId('all'); tg?.HapticFeedback?.impactOccurred('light'); }}
                    className={`flex-shrink-0 h-11 px-6 rounded-2xl text-[11px] font-black uppercase tracking-[0.1em] transition-all flex items-center gap-2.5 border-2 ${
                      selectedAccountId === 'all' ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white border-slate-100 text-slate-400'
                    }`}
                  >
                    <Wallet size={16} /> <span className="whitespace-nowrap">Все счета</span>
                  </button>
                  {accounts.map(acc => (
                    <button
                      key={acc.id}
                      onClick={() => { setSelectedAccountId(acc.id); tg?.HapticFeedback?.impactOccurred('light'); }}
                      className={`flex-shrink-0 h-11 px-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.1em] flex items-center gap-2.5 transition-all border-2 ${
                        selectedAccountId === acc.id ? 'bg-white border-indigo-500 text-indigo-700 shadow-sm' : 'bg-white border-slate-100 text-slate-400'
                      }`}
                    >
                      <span className="text-xl leading-none">{acc.icon}</span> {acc.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </header>
        </div>
      </div>

      <main className="px-4 pb-24 mt-6">
        {groupedTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center space-y-6">
             <div className="w-28 h-28 bg-white rounded-[3rem] flex items-center justify-center text-slate-100 shadow-sm border border-slate-50">
                <RefreshCw size={54} strokeWidth={1} className="animate-spin-slow opacity-20" />
             </div>
             <div className="space-y-2">
               <p className="text-[17px] font-black text-slate-900 uppercase tracking-tight">Ничего не найдено</p>
               <p className="text-[12px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">Попробуйте изменить параметры<br/>фильтрации или поиска</p>
             </div>
          </div>
        ) : (
          groupedTransactions.map(group => (
            <div key={group.date} className="mb-10 animate-slide-up">
              <div className="flex items-center gap-4 mb-5 px-1">
                 <div className="h-[3px] w-8 bg-indigo-500 rounded-full" />
                 <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] leading-none">
                    {group.date}
                 </h3>
                 <div className="flex-grow h-[1px] bg-slate-200/60 rounded-full" />
              </div>
              
              <div className="space-y-3">
                {group.items.map(t => {
                  const cat = categories.find(c => c.id === t.categoryId);
                  const acc = accounts.find(a => a.id === t.accountId);
                  const linkedDebt = debts.find(d => d.id === t.linkedDebtId);
                  const isSubscription = t.note.startsWith('[ПОДПИСКА]');
                  
                  const displayName = linkedDebt ? linkedDebt.personName : (cat?.name || 'Операция');
                  const displayIcon = linkedDebt 
                    ? (linkedDebt.isBank ? '🏦' : '🤝') 
                    : (isSubscription ? <RefreshCw size={20} className="text-indigo-500" /> : (cat?.icon || '📦'));
                  
                  const cleanNote = t.note.replace(/^\[(ПОДПИСКА|ДОЛГ)\]\s*/, '');
                  const timeStr = new Date(t.date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

                  return (
                    <div 
                      key={t.id} 
                      onClick={() => handleTxClick(t)}
                      className={`bg-white p-5 rounded-[2rem] flex items-center justify-between border-2 border-transparent shadow-[0_2px_8px_-2px_rgba(0,0,0,0.03)] transition-all group active:scale-[0.97] active:bg-slate-50 cursor-pointer hover:border-indigo-50/50`}
                    >
                      <div className="flex items-center gap-5 min-w-0">
                        <div 
                          className="w-12 h-12 rounded-[1.25rem] flex items-center justify-center text-2xl shadow-inner shrink-0 bg-slate-50 transition-transform group-active:rotate-6"
                          style={{ color: cat?.color || '#6366f1' }}
                        >
                          {displayIcon}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-900 text-[15px] leading-tight truncate uppercase tracking-tight">
                            {isSubscription ? cleanNote : displayName}
                          </h4>
                          <div className="flex items-center gap-2.5 mt-1.5">
                            <span className="text-[11px] text-slate-400 font-bold uppercase truncate max-w-[90px] tracking-tight">
                              {acc?.name}
                            </span>
                            <div className="w-1 h-1 bg-slate-300 rounded-full" />
                            <span className="text-[11px] text-slate-400 font-bold">{timeStr}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-4 flex flex-col items-end">
                        <p className={`font-black text-[18px] tracking-tighter leading-none ${
                          t.type === 'income' ? 'text-emerald-500' : 
                          t.type === 'savings' ? 'text-indigo-600' : 'text-slate-900'
                        }`}>
                          {t.type === 'income' ? '+' : '-'}{t.amount.toLocaleString()}
                        </p>
                        {isSubscription ? (
                          <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100 mt-1.5 shadow-sm">Subscription</span>
                        ) : cleanNote && displayName !== cleanNote && (
                          <p className="text-[10px] text-slate-300 font-bold truncate max-w-[80px] mt-1.5 uppercase tracking-tight">{cleanNote}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </main>

      {/* --- Кастомный Пикер Диапазона --- */}
      {isCustomPickerOpen && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center px-4 pb-10">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-fade-in" onClick={() => setIsCustomPickerOpen(false)} />
          <div className="relative w-full max-w-md bg-white rounded-[3.5rem] p-10 shadow-2xl animate-slide-up flex flex-col">
            <div className="w-14 h-1.5 bg-slate-100 rounded-full mx-auto mb-8 shrink-0" />
            
            <div className="flex items-center justify-between mb-10 px-2">
              <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() - 1)))} className="w-14 h-14 flex items-center justify-center bg-slate-50 rounded-2xl text-slate-400 active:scale-90 transition-all border border-slate-100/50">
                <ChevronLeft size={28} strokeWidth={2.5} />
              </button>
              <div className="text-center">
                <h3 className="font-black text-slate-900 uppercase text-[15px] tracking-[0.3em] leading-none">
                  {viewDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
                </h3>
              </div>
              <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() + 1)))} className="w-14 h-14 flex items-center justify-center bg-slate-50 rounded-2xl text-slate-400 active:scale-90 transition-all border border-slate-100/50">
                <ChevronRight size={28} strokeWidth={2.5} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-4 px-1">
              {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => (
                <div key={day} className="text-center text-[11px] font-black text-slate-300 uppercase py-2 tracking-widest">{day}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-y-3 px-1 relative">
              {monthGrid.map((dateStr, idx) => {
                if (!dateStr) return <div key={`empty-${idx}`} className="h-14" />;
                const d = new Date(dateStr);
                const isStart = customRange.start === dateStr;
                const isEnd = customRange.end === dateStr;
                const isBetween = isInRange(dateStr);
                const isToday = new Date().toISOString().split('T')[0] === dateStr;
                const isDisabled = d.getTime() < new Date(new Date(minTransactionDate).setHours(0,0,0,0)).getTime();

                const showRangeBackground = customRange.start && customRange.end && (isBetween || isStart || isEnd);

                return (
                  <div key={dateStr} className="relative h-14 flex items-center justify-center">
                    {showRangeBackground && (
                      <div className={`absolute inset-y-1 bg-indigo-50/70 z-0 ${
                        isStart ? 'left-1/2 right-0 rounded-l-none' : 
                        isEnd ? 'left-0 right-1/2 rounded-r-none' : 
                        'inset-x-0'
                      }`} />
                    )}
                    <button
                      disabled={isDisabled}
                      onClick={() => handleDateClick(dateStr)}
                      className={`relative z-10 w-12 h-12 rounded-[1.25rem] flex items-center justify-center transition-all text-[15px] ${
                        isDisabled 
                          ? 'text-slate-200 cursor-not-allowed opacity-40' 
                          : (isStart || isEnd)
                            ? 'bg-slate-900 text-white font-black shadow-2xl scale-110' 
                            : isBetween 
                              ? 'text-indigo-600 font-black' 
                              : isToday 
                                ? 'text-indigo-600 font-black ring-4 ring-indigo-50 bg-white' 
                                : 'text-slate-800 font-bold active:bg-slate-50'
                      }`}
                    >
                      {d.getDate()}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="mt-12 flex gap-5">
              <button 
                onClick={() => {
                  setCustomRange({ start: null, end: null });
                  setSelectedPeriod('all');
                  tg?.HapticFeedback?.notificationOccurred('warning');
                }}
                className="flex-1 h-16 bg-slate-50 text-slate-400 rounded-3xl text-[13px] font-black uppercase tracking-widest transition-all active:scale-95 border-2 border-transparent hover:border-slate-100"
              >
                Сброс
              </button>
              <button 
                disabled={!customRange.start}
                onClick={() => {
                  setSelectedPeriod('custom');
                  setIsCustomPickerOpen(false);
                  tg?.HapticFeedback?.notificationOccurred('success');
                }}
                className="flex-[2] h-16 bg-slate-900 text-white rounded-3xl text-[13px] font-black uppercase tracking-[0.25em] shadow-2xl shadow-slate-900/30 disabled:opacity-20 active:scale-95 transition-all"
              >
                Выбрать
              </button>
            </div>

            <button 
              onClick={() => setIsCustomPickerOpen(false)} 
              className="absolute top-8 right-8 p-2 text-slate-300 hover:text-slate-900 transition-colors"
            >
              <X size={30} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

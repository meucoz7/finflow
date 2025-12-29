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
  ArrowRightLeft
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

  // Эффект для автоматической прокрутки наверх при входе на страницу
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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

  // Statistics for the current view
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

  const handleTxClick = (t: Transaction) => {
    // We now allow clicking even on subscription transactions so the user can "undo" them
    onEditTransaction(t);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 animate-slide-up pb-32">
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl pt-[env(safe-area-inset-top,8px)] px-4 pb-4 border-b border-slate-100 shadow-sm">
        {/* Navigation & Title */}
        <div className="flex items-center justify-between h-12 mb-2">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center text-slate-500 bg-slate-100 rounded-2xl active:scale-90 transition-all">
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 className="text-[16px] font-black text-slate-900 tracking-tight leading-none">История</h1>
              <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mt-1">
                {filteredAndSorted.length} транзакций
              </p>
            </div>
          </div>
          <button 
            onClick={() => {
               setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest');
               tg?.HapticFeedback?.impactOccurred('light');
            }}
            className={`w-9 h-9 flex items-center justify-center rounded-2xl transition-all ${sortOrder === 'oldest' ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}
          >
            <ArrowUpDown size={18} />
          </button>
        </div>

        {/* Stats Card */}
        <div className="bg-slate-900 rounded-[2rem] p-4 text-white mb-4 shadow-xl shadow-slate-200/50 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16" />
           <div className="relative z-10 flex items-center justify-between">
              <div className="space-y-1">
                 <p className="text-white/40 text-[9px] font-black uppercase tracking-widest">Баланс периода</p>
                 <h4 className="text-xl font-black tracking-tighter">
                    {(periodStats.income - periodStats.expense).toLocaleString()} <span className="text-[10px] opacity-40">{profile.currency}</span>
                 </h4>
              </div>
              <div className="flex items-center gap-4 border-l border-white/10 pl-4">
                 <div className="text-right">
                    <p className="text-emerald-400 text-[11px] font-black tracking-tight leading-none">+{periodStats.income.toLocaleString()}</p>
                    <p className="text-rose-400 text-[11px] font-black tracking-tight leading-none mt-1.5">-{periodStats.expense.toLocaleString()}</p>
                 </div>
                 <div className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center">
                    <ArrowRightLeft size={16} className="text-white/60" />
                 </div>
              </div>
           </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <input 
            type="text" 
            placeholder="Поиск по названию или заметке..."
            className="w-full h-11 bg-slate-100 border-none rounded-2xl pl-10 pr-10 text-[13px] font-bold text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-100 transition-all shadow-inner"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300">
              <X size={16} />
            </button>
          )}
        </div>

        {/* Filters Slider */}
        <div className="space-y-3">
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {[
              { id: 'all', label: 'Все' },
              { id: 'today', label: 'Сегодня' },
              { id: 'week', label: '7 дней' },
              { id: 'month', label: 'Месяц' },
              { id: 'custom', label: 'Диапазон' }
            ].map(p => (
              <button
                key={p.id}
                onClick={() => {
                  tg?.HapticFeedback?.impactOccurred('light');
                  if (p.id === 'custom') setIsCustomPickerOpen(true);
                  setSelectedPeriod(p.id as Period);
                }}
                className={`flex-shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                  selectedPeriod === p.id 
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' 
                  : 'bg-white border-slate-100 text-slate-400'
                }`}
              >
                {p.id === 'custom' && customRange.start ? (
                    <span className="flex items-center gap-1.5">
                        <CalendarIcon size={12} />
                        {new Date(customRange.start).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                    </span>
                ) : p.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            <button
              onClick={() => { setSelectedAccountId('all'); tg?.HapticFeedback?.impactOccurred('light'); }}
              className={`flex-shrink-0 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 border ${
                selectedAccountId === 'all' ? 'bg-slate-900 border-slate-900 text-white shadow-md' : 'bg-white border-slate-100 text-slate-400'
              }`}
            >
              Все счета
            </button>
            {accounts.map(acc => (
              <button
                key={acc.id}
                onClick={() => { setSelectedAccountId(acc.id); tg?.HapticFeedback?.impactOccurred('light'); }}
                className={`flex-shrink-0 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all border ${
                  selectedAccountId === acc.id ? 'bg-white border-indigo-200 text-indigo-700 shadow-md ring-1 ring-indigo-50' : 'bg-white border-slate-100 text-slate-400'
                }`}
              >
                <span>{acc.icon}</span> {acc.name}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="px-4 pb-20 mt-4">
        {groupedTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
             <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-slate-200 shadow-sm border border-slate-100">
                <RefreshCw size={40} />
             </div>
             <div>
               <p className="text-[14px] font-black text-slate-900 uppercase tracking-tight">Ничего не найдено</p>
               <p className="text-[11px] text-slate-400 font-medium mt-1">Попробуйте изменить параметры фильтрации</p>
             </div>
          </div>
        ) : (
          groupedTransactions.map(group => (
            <div key={group.date} className="mb-6 animate-slide-up">
              <div className="sticky top-[270px] z-40 bg-slate-50/90 backdrop-blur-md py-2 mb-3">
                 <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                    {group.date}
                 </h3>
              </div>
              
              <div className="space-y-2">
                {group.items.map(t => {
                  const cat = categories.find(c => c.id === t.categoryId);
                  const acc = accounts.find(a => a.id === t.accountId);
                  const linkedDebt = debts.find(d => d.id === t.linkedDebtId);
                  const isSubscription = t.note.startsWith('[ПОДПИСКА]');
                  
                  const displayName = linkedDebt ? linkedDebt.personName : (cat?.name || 'Операция');
                  const displayIcon = linkedDebt 
                    ? (linkedDebt.isBank ? '🏦' : '🤝') 
                    : (isSubscription ? <RefreshCw size={18} className="text-indigo-500" /> : (cat?.icon || '📦'));
                  
                  const cleanNote = t.note.replace(/^\[(ПОДПИСКА|ДОЛГ)\]\s*/, '');
                  const timeStr = new Date(t.date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

                  return (
                    <div 
                      key={t.id} 
                      onClick={() => handleTxClick(t)}
                      className={`bg-white p-4 rounded-[1.75rem] flex items-center justify-between border border-transparent shadow-sm transition-all group active:scale-[0.98] active:bg-slate-50 cursor-pointer hover:border-slate-100`}
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div 
                          className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shadow-inner shrink-0 bg-slate-50"
                          style={{ color: cat?.color || '#6366f1' }}
                        >
                          {displayIcon}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-900 text-[14px] leading-tight truncate uppercase tracking-tight">
                            {isSubscription ? cleanNote : displayName}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-slate-400 font-bold uppercase truncate">
                              {acc?.name}
                            </span>
                            <span className="text-[9px] text-slate-300 font-bold">•</span>
                            <span className="text-[10px] text-slate-400 font-bold">{timeStr}</span>
                            {isSubscription && (
                               <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100 ml-1">Подписка</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className={`font-black text-[16px] tracking-tighter ${
                          t.type === 'income' ? 'text-emerald-500' : 
                          t.type === 'savings' ? 'text-indigo-600' : 'text-slate-900'
                        }`}>
                          {t.type === 'income' ? '+' : '-'}{t.amount.toLocaleString()}
                        </p>
                        {cleanNote && !isSubscription && displayName !== cleanNote && (
                          <p className="text-[9px] text-slate-300 font-bold truncate max-w-[80px] mt-0.5">{cleanNote}</p>
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

      {/* Custom Date Picker Modal */}
      {isCustomPickerOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsCustomPickerOpen(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-[2.5rem] p-6 shadow-2xl animate-slide-up flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() - 1)))} className="p-2 bg-slate-50 rounded-xl text-slate-500 active:scale-90 transition-all">
                <ChevronLeft size={18} />
              </button>
              <div className="text-center">
                <h3 className="font-black text-slate-900 uppercase text-[11px] tracking-widest">
                  {viewDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
                </h3>
              </div>
              <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() + 1)))} className="p-2 bg-slate-50 rounded-xl text-slate-500 active:scale-90 transition-all">
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => (
                <div key={day} className="text-center text-[8px] font-black text-slate-300 uppercase py-1">{day}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
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
                    className={`aspect-square rounded-xl flex items-center justify-center transition-all relative text-[12px] ${
                      isDisabled 
                        ? 'text-slate-100 cursor-not-allowed' 
                        : isSelected 
                          ? 'bg-indigo-600 text-white font-black z-10 shadow-lg shadow-indigo-200' 
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
                className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
              >
                Сброс
              </button>
              <button 
                disabled={!customRange.start}
                onClick={() => {
                  setSelectedPeriod('custom');
                  setIsCustomPickerOpen(false);
                }}
                className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-20 active:scale-95 shadow-xl shadow-slate-200"
              >
                Выбрать
              </button>
            </div>

            <button onClick={() => setIsCustomPickerOpen(false)} className="absolute top-4 right-4 p-1 text-slate-300"><X size={20} /></button>
          </div>
        </div>
      )}
    </div>
  );
};
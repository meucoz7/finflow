
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
  Check,
  RefreshCw,
  ListFilter
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
  
  // Custom Date Range States
  const [isCustomPickerOpen, setIsCustomPickerOpen] = useState(false);
  const [customRange, setCustomRange] = useState<{ start: string | null; end: string | null }>({ start: null, end: null });
  const [viewDate, setViewDate] = useState(new Date());

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
    if (t.note.startsWith('[ПОДПИСКА]')) {
      tg?.HapticFeedback?.notificationOccurred('warning');
      return;
    }
    onEditTransaction(t);
  };

  return (
    <div className="flex flex-col min-h-screen bg-white animate-slide-up pb-32">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl pt-[env(safe-area-inset-top,8px)] px-3 pb-3 space-y-3">
        {/* Top bar */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-8 h-8 flex items-center justify-center text-slate-400 bg-slate-50 rounded-full active:scale-90 transition-all">
            <ChevronLeft size={20} />
          </button>
          <div className="flex-grow">
            <h1 className="text-[15px] font-black text-slate-900 tracking-tight leading-none">История</h1>
            <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mt-0.5">Всего: {filteredAndSorted.length}</p>
          </div>
          <button 
            onClick={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${sortOrder === 'oldest' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-400'}`}
          >
            <ArrowUpDown size={16} />
          </button>
        </div>

        {/* Search & Period container */}
        <div className="flex gap-2 h-10">
          <div className="flex-grow relative">
            <input 
              type="text" 
              placeholder="Поиск..."
              className="w-full h-full bg-slate-100/80 border border-slate-200/50 rounded-2xl pl-9 pr-8 text-[13px] font-bold outline-none focus:bg-white focus:ring-4 focus:ring-indigo-50/50 transition-all shadow-inner"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300">
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Filter Sliders */}
        <div className="space-y-2 pb-1">
          {/* Period selector */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
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
                className={`flex-shrink-0 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                  selectedPeriod === p.id 
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' 
                  : 'bg-white border-slate-100 text-slate-400'
                }`}
              >
                {p.id === 'custom' && customRange.start ? (
                    <span className="flex items-center gap-1.5">
                        <CalendarIcon size={10} />
                        {new Date(customRange.start).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                    </span>
                ) : p.label}
              </button>
            ))}
          </div>

          {/* Account selector */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5 border-t border-slate-50 pt-2">
            <button
              onClick={() => setSelectedAccountId('all')}
              className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${
                selectedAccountId === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'
              }`}
            >
              <ListFilter size={10} /> Счета
            </button>
            {accounts.map(acc => (
              <button
                key={acc.id}
                onClick={() => setSelectedAccountId(acc.id)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all border ${
                  selectedAccountId === acc.id ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-100 text-slate-400'
                }`}
              >
                <span>{acc.icon}</span> {acc.name}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="px-3 pb-10">
        {groupedTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
             <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-200 mb-4">
                <Filter size={32} />
             </div>
             <p className="text-[12px] font-black text-slate-400 uppercase tracking-widest">Ничего не найдено</p>
          </div>
        ) : (
          groupedTransactions.map(group => (
            <div key={group.date} className="mt-4 first:mt-2">
              <h3 className="sticky top-[182px] z-30 inline-block px-3 py-1 bg-slate-100/90 backdrop-blur-md text-slate-500 rounded-lg text-[9px] font-black uppercase tracking-widest mb-3 border border-white/50">
                {group.date}
              </h3>
              
              <div className="space-y-2">
                {group.items.map(t => {
                  const cat = categories.find(c => c.id === t.categoryId);
                  const acc = accounts.find(a => a.id === t.accountId);
                  const linkedDebt = debts.find(d => d.id === t.linkedDebtId);
                  const isSubscription = t.note.startsWith('[ПОДПИСКА]');
                  
                  const displayName = linkedDebt ? linkedDebt.personName : (cat?.name || 'Операция');
                  const displayIcon = linkedDebt 
                    ? (linkedDebt.isBank ? '🏦' : '🤝') 
                    : (isSubscription ? <RefreshCw size={16} className="text-indigo-500" /> : (cat?.icon || '📦'));
                  
                  const cleanNote = t.note.replace(/^\[(ПОДПИСКА|ДОЛГ)\]\s*/, '');

                  return (
                    <div 
                      key={t.id} 
                      onClick={() => handleTxClick(t)}
                      className={`bg-slate-50/50 p-3 rounded-2xl flex items-center justify-between border border-transparent transition-all group active:scale-[0.98] active:bg-slate-100/80 active:border-slate-200/50 ${isSubscription ? 'cursor-default' : 'cursor-pointer'}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div 
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-inner shrink-0 bg-white"
                          style={{ color: cat?.color || '#6366f1' }}
                        >
                          {displayIcon}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-900 text-[13px] leading-tight truncate uppercase tracking-tight">
                            {isSubscription ? cleanNote : displayName}
                          </h4>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[9px] text-slate-400 font-bold uppercase truncate">
                              {acc?.name}
                            </span>
                            {isSubscription && (
                               <span className="text-[7px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 px-1 py-0.5 rounded">Подписка</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className={`font-black text-[15px] tracking-tight ${
                          t.type === 'income' ? 'text-emerald-500' : 
                          t.type === 'savings' ? 'text-indigo-600' : 'text-slate-900'
                        }`}>
                          {t.type === 'income' ? '+' : '-'}{t.amount.toLocaleString()}
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
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setIsCustomPickerOpen(false)} />
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
                        ? 'text-slate-200 cursor-not-allowed' 
                        : isSelected 
                          ? 'bg-indigo-600 text-white font-black z-10' 
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
                className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
              >
                Сброс
              </button>
              <button 
                disabled={!customRange.start}
                onClick={() => {
                  setSelectedPeriod('custom');
                  setIsCustomPickerOpen(false);
                }}
                className="flex-[2] py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-20"
              >
                Применить
              </button>
            </div>

            <button onClick={() => setIsCustomPickerOpen(false)} className="absolute top-4 right-4 p-1 text-slate-300"><X size={18} /></button>
          </div>
        </div>
      )}
    </div>
  );
};

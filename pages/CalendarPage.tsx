import React, { useMemo, useState, useEffect, useRef } from 'react';
import { AppState, Transaction } from '../types';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  CheckCircle, 
  Landmark, 
  ArrowUpRight, 
  ArrowDownLeft,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  X,
  RefreshCw as RefreshIcon,
  Bell,
  Trash2,
  Check
} from 'lucide-react';

interface CalendarPageProps {
  state: AppState;
  onUpdateState: (newState: Partial<AppState>) => void;
  onEditTransaction: (tx: Transaction) => void;
}

const parseLocalDate = (dateStr: string) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const CalendarPage: React.FC<CalendarPageProps> = ({ state, onUpdateState, onEditTransaction }) => {
  const { transactions, categories, debts, profile, subscriptions = [], accounts } = state;
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isFullCalendarOpen, setIsFullCalendarOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date()); 
  const scrollRef = useRef<HTMLDivElement>(null);

  const allPlannedItems = useMemo(() => {
    const plannedTx = transactions
      .filter(t => t.isPlanned)
      .map(t => ({
        id: t.id,
        date: t.date.split('T')[0],
        amount: t.amount,
        type: t.type,
        title: categories.find(c => c.id === t.categoryId)?.name || 'Операция',
        icon: categories.find(c => c.id === t.categoryId)?.icon || '📦',
        color: categories.find(c => c.id === t.categoryId)?.color || '#94a3b8',
        itemType: 'transaction' as const
      }));

    const debtItems = debts
      .filter(d => d.dueDate)
      .map(d => ({
        id: d.id,
        date: d.dueDate!,
        amount: d.amount,
        type: d.type === 'i_owe' ? 'expense' : 'income' as any,
        title: d.personName,
        icon: d.isBank ? '🏦' : d.type === 'i_owe' ? '👤' : '🤲',
        color: d.isBank ? '#f59e0b' : d.type === 'i_owe' ? '#f43f5e' : '#10b981',
        itemType: 'debt' as const,
        isBank: d.isBank,
        isMonthly: d.isMonthly
      }));

    const subItems = subscriptions
      .filter(s => s.isActive)
      .map(s => ({
        id: s.id,
        date: s.nextPaymentDate,
        amount: s.amount,
        type: 'expense' as const,
        title: s.name,
        icon: s.icon,
        color: s.color,
        itemType: 'subscription' as const,
        reminderDays: s.reminderDays
      }));

    return [...plannedTx, ...debtItems, ...subItems].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [transactions, categories, debts, subscriptions]);

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
      const d = new Date(year, month, i);
      days.push(d.toISOString().split('T')[0]);
    }
    return days;
  }, [viewDate]);

  const calendarDays = useMemo(() => {
    const days = [];
    const base = parseLocalDate(selectedDate);
    for (let i = -10; i <= 20; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      days.push(d.toISOString().split('T')[0]);
    }
    return days;
  }, [selectedDate]);

  useEffect(() => {
    const activeEl = document.getElementById(`date-${selectedDate}`);
    if (activeEl && scrollRef.current) {
      const scrollContainer = scrollRef.current;
      const scrollLeft = activeEl.offsetLeft - scrollContainer.offsetWidth / 2 + activeEl.offsetWidth / 2;
      scrollContainer.scrollTo({ left: scrollLeft, behavior: 'smooth' });
    }
  }, [selectedDate, calendarDays]);

  const hasEventsOnDate = (date: string) => allPlannedItems.some(item => item.date === date);

  const filteredItems = useMemo(() => {
    return allPlannedItems.filter(item => item.date === selectedDate);
  }, [allPlannedItems, selectedDate]);

  const totalDailyBalance = useMemo(() => {
    return filteredItems.reduce((acc, curr) => curr.type === 'income' ? acc + curr.amount : acc - curr.amount, 0);
  }, [filteredItems]);

  const changeMonth = (offset: number) => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  const handleExecuteItem = (item: any) => {
    let tx: any;
    
    if (item.itemType === 'transaction') {
      const originalTx = transactions.find(t => t.id === item.id);
      if (originalTx) {
        tx = { ...originalTx, isPlanned: false, date: new Date().toISOString() };
      }
    } else if (item.itemType === 'subscription') {
      const sub = subscriptions.find(s => s.id === item.id);
      if (sub) {
        tx = {
          amount: sub.amount,
          categoryId: sub.categoryId || categories.find(c => c.type === 'expense')?.id || '1',
          accountId: sub.accountId,
          date: new Date().toISOString(),
          note: `[ПОДПИСКА] ${sub.name}`,
          type: 'expense',
          subscriptionId: sub.id
        };
      }
    } else if (item.itemType === 'debt') {
      const debt = debts.find(d => d.id === item.id);
      if (debt) {
        tx = {
          amount: debt.amount,
          categoryId: categories.find(c => c.name.toLowerCase().includes('долг') && c.type === (debt.type === 'i_owe' ? 'expense' : 'income'))?.id || 'debt_system',
          accountId: accounts[0]?.id || '',
          date: new Date().toISOString(),
          note: `[ДОЛГ] ${debt.personName}`,
          type: debt.type === 'i_owe' ? 'expense' : 'income',
          linkedDebtId: debt.id,
          debtAction: 'decrease'
        };
      }
    }
    
    if (tx) {
      onEditTransaction(tx);
    }
  };

  const handleCancelItem = (item: any) => {
    if (!confirm('Вы уверены, что хотите отменить это запланированное событие?')) return;

    if (item.itemType === 'transaction') {
      onUpdateState({ transactions: transactions.filter(t => t.id !== item.id) });
    } else if (item.itemType === 'subscription') {
      // Skipping this payment - maybe just deactivate it or confirm skip? 
      // User said "отменить", so let's just confirm skipping one period or deactivating.
      // We'll deactivate to be safe.
      onUpdateState({ subscriptions: subscriptions.map(s => s.id === item.id ? { ...s, isActive: false } : s) });
    } else if (item.itemType === 'debt') {
      const debt = debts.find(d => d.id === item.id);
      if (debt?.isMonthly) {
        // Skip this installment
        const nextDate = new Date(debt.dueDate!);
        nextDate.setMonth(nextDate.getMonth() + 1);
        onUpdateState({
          debts: debts.map(d => d.id === item.id ? { ...d, dueDate: nextDate.toISOString().split('T')[0] } : d)
        });
      } else {
        // For one-off debts, cancel means delete or clear date
        onUpdateState({ debts: debts.map(d => d.id === item.id ? { ...d, dueDate: undefined } : d) });
      }
    }
  };

  return (
    <div className="space-y-5 animate-slide-up pb-32 pt-[env(safe-area-inset-top,8px)]">
      <header className="px-1 pt-1 flex justify-between items-center">
        <div>
          <h1 className="text-indigo-500 text-[9px] font-black uppercase tracking-[0.2em]">ПЛАН И СОБЫТИЯ</h1>
          <p className="text-slate-900 font-black text-base">
            {parseLocalDate(selectedDate).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        
        <button 
          onClick={() => {
            setViewDate(parseLocalDate(selectedDate));
            setIsFullCalendarOpen(true);
          }}
          className="bg-white border border-slate-100 px-4 py-2.5 rounded-2xl shadow-sm flex items-center gap-2 hover:bg-slate-50 transition-all active:scale-95"
        >
          <CalendarIcon size={16} className="text-indigo-500" />
          <span className="text-[12px] font-black text-slate-900">
            {allPlannedItems.filter(i => i.date.startsWith(selectedDate.slice(0, 7))).length}
          </span>
        </button>
      </header>

      <div 
        ref={scrollRef}
        className="flex gap-2.5 overflow-x-auto no-scrollbar px-1 py-2 scroll-smooth"
      >
        {calendarDays.map((dateStr) => {
          const d = parseLocalDate(dateStr);
          const isSelected = selectedDate === dateStr;
          const isToday = new Date().toISOString().split('T')[0] === dateStr;
          const hasEvents = hasEventsOnDate(dateStr);

          return (
            <button
              key={dateStr}
              id={`date-${dateStr}`}
              onClick={() => setSelectedDate(dateStr)}
              className={`flex-shrink-0 w-12 h-16 rounded-2xl flex flex-col items-center justify-center transition-all relative ${
                isSelected 
                  ? 'bg-slate-900 text-white shadow-xl scale-105' 
                  : isToday 
                    ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' 
                    : 'bg-white border border-slate-100 text-slate-400'
              }`}
            >
              <span className="text-[9px] font-black uppercase opacity-60 mb-1">
                {d.toLocaleDateString('ru-RU', { weekday: 'short' })}
              </span>
              <span className="text-[15px] font-black">
                {d.getDate()}
              </span>
              {hasEvents && (
                <div className={`absolute bottom-2 w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-indigo-400' : 'bg-indigo-500'}`} />
              )}
            </button>
          );
        })}
      </div>

      <div className="mx-1 p-5 bg-slate-900 rounded-[2rem] text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
        <div className="relative z-10 flex justify-between items-center">
           <div className="space-y-1">
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Баланс дня по плану</p>
              <h4 className="text-2xl font-black">
                {totalDailyBalance.toLocaleString()} 
                <span className="text-xs text-indigo-400 ml-1">{profile.currency}</span>
              </h4>
           </div>
           <div className={`p-3 rounded-2xl border border-white/5 ${totalDailyBalance >= 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
                {totalDailyBalance >= 0 ? <ArrowUpRight size={20} className="text-emerald-400" /> : <ArrowDownLeft size={20} className="text-rose-400" />}
           </div>
        </div>
      </div>

      <div className="space-y-4 px-1">
        <div className="flex justify-between items-center mb-2 px-1">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {selectedDate === new Date().toISOString().split('T')[0] ? 'Сегодня' : 'Список планов'}
          </h3>
          {filteredItems.length > 0 && (
            <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-3 py-1 rounded-full">
              {filteredItems.length} событий
            </span>
          )}
        </div>

        {filteredItems.length === 0 ? (
          <div className="bg-slate-50/50 rounded-[2.5rem] border border-dashed border-slate-200 py-16 flex flex-col items-center justify-center text-center px-8 space-y-3">
            <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-slate-200 shadow-sm">
              <Clock size={28} />
            </div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tight leading-relaxed">
              На выбранную дату планов не найдено
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map(item => (
              <PlannedItemCard 
                key={`${item.itemType}-${item.id}`} 
                item={item} 
                onExecute={() => handleExecuteItem(item)} 
                onCancel={() => handleCancelItem(item)}
                profile={profile} 
              />
            ))}
          </div>
        )}
      </div>

      {isFullCalendarOpen && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center px-4 pb-10">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsFullCalendarOpen(false)} />
          <div className="relative w-full max-w-md bg-white rounded-[2.5rem] p-6 shadow-2xl animate-slide-up flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <button onClick={() => changeMonth(-1)} className="p-2 bg-slate-50 rounded-xl text-slate-500 active:scale-90 transition-all"><ChevronLeft size={20} /></button>
                <div className="text-center">
                  <h3 className="font-black text-slate-900 uppercase text-[13px] tracking-widest">
                    {viewDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
                  </h3>
                </div>
                <button onClick={() => changeMonth(1)} className="p-2 bg-slate-50 rounded-xl text-slate-500 active:scale-90 transition-all"><ChevronRight size={20} /></button>
              </div>
              <button onClick={() => setIsFullCalendarOpen(false)} className="p-2 bg-slate-100 rounded-full text-slate-400"><X size={20} /></button>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-4">
              {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => (
                <div key={day} className="text-center text-[9px] font-black text-slate-300 uppercase py-1">{day}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {monthGrid.map((dateStr, idx) => {
                if (!dateStr) return <div key={`empty-${idx}`} />;
                const d = parseLocalDate(dateStr);
                const isSelected = selectedDate === dateStr;
                const isToday = new Date().toISOString().split('T')[0] === dateStr;
                const hasEvents = hasEventsOnDate(dateStr);
                return (
                  <button
                    key={dateStr}
                    onClick={() => {
                      setSelectedDate(dateStr);
                      setIsFullCalendarOpen(false);
                    }}
                    className={`aspect-square rounded-xl flex flex-col items-center justify-center transition-all relative ${
                      isSelected 
                        ? 'bg-slate-900 text-white shadow-lg z-10' 
                        : isToday 
                          ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' 
                          : 'hover:bg-slate-50 text-slate-700 font-bold'
                    }`}
                  >
                    <span className="text-[13px]">{d.getDate()}</span>
                    {hasEvents && (
                      <div className={`absolute bottom-1.5 w-1 h-1 rounded-full ${isSelected ? 'bg-indigo-400' : 'bg-indigo-500 animate-pulse'}`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const PlannedItemCard: React.FC<{ item: any; onExecute: () => void; onCancel: () => void; profile: any }> = ({ item, onExecute, onCancel, profile }) => {
  const isOverdue = new Date(item.date).getTime() < new Date().setHours(0,0,0,0);
  
  return (
    <div className={`group bg-white p-4 rounded-[2rem] border ${isOverdue ? 'border-rose-100 bg-rose-50/10' : 'border-slate-50'} flex items-center gap-4 active:scale-[0.98] transition-all shadow-sm`}>
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 shadow-inner" style={{ backgroundColor: `${item.color}15`, color: item.color }}>
        {item.icon}
      </div>
      <div className="flex-grow min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
           <h5 className="font-bold text-slate-900 text-[14px] truncate uppercase leading-tight tracking-tight">{item.title}</h5>
           {item.isBank && <Landmark size={12} className="text-amber-500" />}
           {(item.isMonthly || item.itemType === 'subscription') && <RefreshIcon size={10} className="text-indigo-400" />}
           {item.itemType === 'subscription' && <Bell size={10} className="text-indigo-600" />}
        </div>
        <div className="flex items-center gap-2">
          <p className="text-[9px] text-slate-400 font-black uppercase flex items-center gap-1">
            <Clock size={10} /> {parseLocalDate(item.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
          </p>
          {isOverdue && (
            <span className="text-rose-500 text-[8px] font-black uppercase tracking-tighter bg-rose-50 px-1.5 py-0.5 rounded">Просрочено</span>
          )}
        </div>
      </div>
      <div className="text-right flex items-center gap-2.5">
        <p className={`text-[15px] font-black mr-1 ${item.type === 'income' ? 'text-emerald-500' : 'text-slate-900'}`}>
          {item.amount.toLocaleString()}
        </p>
        <div className="flex flex-col gap-1.5">
           <button 
            onClick={onExecute}
            className="w-9 h-9 bg-slate-900 text-white rounded-xl flex items-center justify-center active:scale-90 transition-all shadow-lg shadow-slate-200"
            title="Исполнить"
           >
            <Check size={16} strokeWidth={3} />
           </button>
           <button 
            onClick={onCancel}
            className="w-9 h-9 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center active:scale-90 transition-all border border-slate-100"
            title="Отменить"
           >
            <X size={16} strokeWidth={3} />
           </button>
        </div>
      </div>
    </div>
  );
};
import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppState, Transaction, SavingsGoal, DashboardWidget, Category } from '../types';
import { 
  Wallet, 
  Handshake, 
  TrendingUp, 
  TrendingDown, 
  History, 
  Search, 
  Layers, 
  Sparkles, 
  Target, 
  ChevronRight,
  ArrowUpRight,
  Plus,
  ArrowRight,
  RefreshCw,
  Settings2,
  Eye,
  EyeOff,
  MoveUp,
  MoveDown,
  Check,
  ShieldCheck,
  Zap,
  Coffee
} from 'lucide-react';

interface DashboardProps {
  state: AppState;
  isAdmin?: boolean;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onUpdateState: (newState: Partial<AppState>) => void;
  onQuickAction: (categoryId: string, amount: number, note: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ state, isAdmin, onEditTransaction, onDeleteTransaction, onUpdateState, onQuickAction }) => {
  const { transactions, profile, debts, savings, categories, accounts, subscriptions = [] } = state;
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const navigate = useNavigate();
  const tg = (window as any).Telegram?.WebApp;

  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyTransactions = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear && !t.isPlanned;
    });

    const totalIncome = monthlyTransactions.filter(t => t.type === 'income').reduce((s: number, t: Transaction) => s + t.amount, 0);
    const totalExpense = monthlyTransactions.filter(t => t.type === 'expense').reduce((s: number, t: Transaction) => s + t.amount, 0);
    
    const allTimeIncome = transactions.filter(t => t.type === 'income' && !t.isPlanned).reduce((s: number, t: Transaction) => s + t.amount, 0);
    const allTimeExpense = transactions.filter(t => t.type === 'expense' && !t.isPlanned).reduce((s: number, t: Transaction) => s + t.amount, 0);
    const allTimeSavings = transactions.filter(t => t.type === 'savings' && !t.isPlanned).reduce((s: number, t: Transaction) => s + t.amount, 0);

    const currentBalance = accounts.reduce((s: number, a) => s + a.balance, 0) + (allTimeIncome - allTimeExpense - allTimeSavings);
    
    const theyOweMe = debts.filter(d => d.type === 'they_owe').reduce((s: number, d) => s + d.amount, 0);
    const iOwe = debts.filter(d => d.type === 'i_owe' && !d.isBank).reduce((s: number, d) => s + d.amount, 0);
    const netDebt = theyOweMe - iOwe;
    
    const totalSavingsValue = savings.reduce((s: number, g: SavingsGoal) => s + g.currentAmount, 0) + allTimeSavings;
    
    const netWorth = profile.includeDebtsInCapital 
      ? currentBalance + totalSavingsValue + netDebt
      : currentBalance + totalSavingsValue;

    const totalTarget = savings.reduce((s, g) => s + g.targetAmount, 0);
    const goalProgress = totalTarget > 0 ? (totalSavingsValue / totalTarget) * 100 : 0;

    return { 
      currentBalance, 
      netDebt, 
      totalSavingsValue, 
      netWorth, 
      totalExpense, 
      totalIncome,
      goalProgress
    };
  }, [transactions, debts, savings, accounts, profile.includeDebtsInCapital]);

  const quickActionsData = useMemo(() => {
    // Анализируем последние 200 операций для поиска паттернов
    const lastTxs = transactions
      .filter(t => t.type === 'expense' && !t.isPlanned)
      .slice(0, 200);

    const patterns: Record<string, { count: number, categoryId: string, amount: number, note: string }> = {};

    lastTxs.forEach(t => {
      // Ключ паттерна: категория + сумма (примечание игнорируем для группировки, но берем последнее)
      const key = `${t.categoryId}_${t.amount}`;
      if (!patterns[key]) {
        patterns[key] = { count: 0, categoryId: t.categoryId, amount: t.amount, note: t.note };
      }
      patterns[key].count++;
    });

    return Object.values(patterns)
      .sort((a, b) => b.count - a.count)
      .slice(0, 4); // Берем топ-4 частых действия
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    return [...transactions]
      .filter(t => !t.isPlanned)
      .filter(t => {
        const cat = categories.find(c => c.id === t.categoryId);
        const searchString = `${cat?.name} ${t.note}`.toLowerCase();
        return searchString.includes(searchQuery.toLowerCase());
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
  }, [transactions, searchQuery, categories]);

  const activeSubscriptions = subscriptions.filter(s => s.isActive);
  const nextSubscription = useMemo(() => {
    if (activeSubscriptions.length === 0) return null;
    return [...activeSubscriptions].sort((a, b) => new Date(a.nextPaymentDate).getTime() - new Date(b.nextPaymentDate).getTime())[0];
  }, [activeSubscriptions]);

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 6) return 'Доброй ночи';
    if (hour < 12) return 'Доброе утро';
    if (hour < 18) return 'Добрый день';
    return 'Добрый вечер';
  };

  const layout = profile.dashboardLayout || { 
    order: ['hero', 'quick_actions', 'subs', 'summary', 'accounts', 'history'] as DashboardWidget[], 
    hidden: [] as DashboardWidget[] 
  };

  const handleTxClick = (t: Transaction) => {
    onEditTransaction(t);
  };

  const moveWidget = (direction: 'up' | 'down', widget: DashboardWidget) => {
    const newOrder = [...layout.order];
    const index = newOrder.indexOf(widget);
    if (direction === 'up' && index > 0) {
      [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
    } else if (direction === 'down' && index < newOrder.length - 1) {
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    }
    onUpdateState({ profile: { ...profile, dashboardLayout: { ...layout, order: newOrder } } });
  };

  const toggleWidget = (widget: DashboardWidget) => {
    const newHidden = layout.hidden.includes(widget) 
      ? layout.hidden.filter(h => h !== widget)
      : [...layout.hidden, widget];
    onUpdateState({ profile: { ...profile, dashboardLayout: { ...layout, hidden: newHidden } } });
  };

  const renderWidget = (widgetId: DashboardWidget) => {
    const isHidden = layout.hidden.includes(widgetId);
    
    if (isHidden && !isEditMode) return null;

    const content = (() => {
      switch(widgetId) {
        case 'hero':
          return (
            <div className="grid grid-cols-5 gap-3 h-36">
              <div className="col-span-3 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 rounded-[2.5rem] p-6 text-white relative overflow-hidden shadow-2xl border border-white/5">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                <div className="relative z-10 h-full flex flex-col justify-between">
                  <div className="space-y-1">
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">Капитал</p>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-black tracking-tighter leading-none">{stats.netWorth.toLocaleString()}</span>
                      <span className="text-xs font-bold text-indigo-400/60 uppercase">{profile.currency}</span>
                    </div>
                  </div>
                  <Link to="/accounts" className="self-start px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full backdrop-blur-md flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-200 transition-all active:scale-95">
                    Счета <ArrowUpRight size={12} className="opacity-50" />
                  </Link>
                </div>
              </div>
              <Link to="/savings" className="col-span-2 bg-gradient-to-br from-rose-500 to-rose-700 rounded-[2.5rem] p-6 text-white relative overflow-hidden shadow-2xl border border-white/5 active:scale-[0.97] transition-all">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12 blur-2xl"></div>
                <div className="relative z-10 h-full flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <p className="text-rose-100/60 text-[10px] font-black uppercase tracking-[0.2em]">Цели</p>
                    <Target size={16} className="text-rose-200/50" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-black tracking-tighter leading-none">{stats.totalSavingsValue.toLocaleString()}</span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden border border-white/5">
                        <div className="h-full bg-white rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, stats.goalProgress)}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          );
        case 'quick_actions':
          if (quickActionsData.length === 0 && !isEditMode) return null;
          return (
            <section className="space-y-3">
              <div className="flex justify-between items-center px-2">
                <h3 className="font-bold text-slate-800 text-[11px] uppercase tracking-widest flex items-center gap-1.5">
                  <Zap size={15} className="text-amber-500" /> Быстрые записи
                </h3>
              </div>
              <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1 px-1">
                {quickActionsData.map((action, idx) => {
                  const cat = categories.find(c => c.id === action.categoryId);
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        tg?.HapticFeedback?.notificationOccurred('success');
                        onQuickAction(action.categoryId, action.amount, action.note);
                      }}
                      className="flex-shrink-0 bg-white border border-slate-100 p-3 rounded-[1.5rem] shadow-sm flex items-center gap-3 active:scale-90 transition-all group"
                    >
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-inner group-hover:scale-110 transition-transform"
                        style={{ backgroundColor: `${cat?.color || '#6366f1'}15`, color: cat?.color || '#6366f1' }}
                      >
                        {cat?.icon || '📦'}
                      </div>
                      <div className="text-left">
                        <p className="text-[14px] font-black text-slate-900 tracking-tight leading-tight">
                          {action.amount.toLocaleString()} <span className="text-[10px] text-slate-400 font-bold">{profile.currency}</span>
                        </p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase truncate max-w-[80px] mt-0.5">
                          {cat?.name || 'Расход'}
                        </p>
                      </div>
                    </button>
                  );
                })}
                {quickActionsData.length === 0 && isEditMode && (
                   <div className="p-4 bg-slate-100/50 rounded-[1.5rem] border border-dashed border-slate-200 text-center w-full">
                     <p className="text-[10px] font-bold text-slate-400 uppercase">Здесь появятся частые траты</p>
                   </div>
                )}
              </div>
            </section>
          );
        case 'subs':
          return (
            <Link to="/subscriptions" className="bg-white p-3.5 rounded-[1.75rem] border border-slate-100 shadow-sm flex items-center justify-between active:scale-[0.98] transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shadow-inner">
                   <RefreshCw size={20} />
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">Подписки</p>
                  <h4 className="text-[13px] font-black text-slate-900 uppercase tracking-tight leading-tight">
                    {nextSubscription ? `След.: ${nextSubscription.name}` : 'Нет активных'}
                  </h4>
                  {nextSubscription && <p className="text-[9px] text-indigo-500 font-bold uppercase mt-0.5">{nextSubscription.amount} {profile.currency}</p>}
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-300" />
            </Link>
          );
        case 'summary':
          return (
            <div className="grid grid-cols-2 gap-3">
              <div className="relative overflow-hidden bg-emerald-50/70 p-4 rounded-3xl border border-emerald-100 shadow-sm flex flex-col gap-2">
                <TrendingUp size={64} className="absolute -right-4 -bottom-4 text-emerald-500/10 transform -rotate-12" />
                <p className="text-[10px] font-bold text-emerald-600/80 uppercase tracking-tight">Доходы</p>
                <h4 className="text-lg font-black text-emerald-700">+{stats.totalIncome.toLocaleString()}</h4>
              </div>
              <div className="relative overflow-hidden bg-rose-50/70 p-4 rounded-3xl border border-rose-100 shadow-sm flex flex-col gap-2">
                <TrendingDown size={64} className="absolute -right-4 -bottom-4 text-rose-500/10 transform rotate-12" />
                <p className="text-[10px] font-bold text-rose-600/80 uppercase tracking-tight">Расходы</p>
                <h4 className="text-lg font-black text-rose-700">-{stats.totalExpense.toLocaleString()}</h4>
              </div>
            </div>
          );
        case 'accounts':
          return (
            <section className="space-y-3">
              <div className="flex justify-between items-center px-2">
                <h3 className="font-bold text-slate-800 text-[12px] uppercase tracking-widest flex items-center gap-1.5">
                  <Wallet size={16} className="text-indigo-500" /> Кошельки
                </h3>
                <Link to="/accounts" className="text-[11px] font-semibold text-indigo-600 uppercase tracking-widest">Все</Link>
              </div>
              <div className="flex gap-3 overflow-x-auto no-scrollbar px-1 pb-1">
                {accounts.map(acc => {
                  const accTxs = transactions.filter(t => t.accountId === acc.id && !t.isPlanned);
                  const currentAccBalance = acc.balance + accTxs.reduce((sum, t) => t.type === 'income' ? sum + t.amount : sum - t.amount, 0);
                  
                  return (
                    <div key={acc.id} className="relative overflow-hidden min-w-[140px] p-5 rounded-3xl border shadow-sm flex flex-col justify-center gap-1 active:scale-95 transition-all group" style={{ backgroundColor: `${acc.color}08`, borderColor: `${acc.color}15` }}>
                       <div className="absolute -right-2 -bottom-2 opacity-[0.08] pointer-events-none transform -rotate-12 transition-transform group-hover:scale-110">
                          <span className="text-6xl">{acc.icon}</span>
                       </div>
                       
                       <div className="relative z-10">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{acc.name}</p>
                          <p className="text-[18px] font-black text-slate-900 tracking-tight mt-0.5">
                            {currentAccBalance.toLocaleString()} <span className="text-[11px] text-slate-400 font-bold">{profile.currency}</span>
                          </p>
                       </div>
                    </div>
                  );
                })}
                <Link 
                  to="/accounts" 
                  state={{ openAdd: true }}
                  className="min-w-[80px] bg-slate-100/50 border-2 border-dashed border-slate-200 rounded-3xl flex items-center justify-center text-slate-300 active:scale-95 transition-all hover:border-indigo-200 hover:text-indigo-300"
                >
                   <Plus size={24} />
                </Link>
              </div>
            </section>
          );
        case 'history':
          return (
            <section className="space-y-4 px-1">
              <div className="flex justify-between items-center px-1">
                <h3 className="font-bold text-slate-800 text-[12px] uppercase tracking-widest flex items-center gap-1.5">
                  <History size={16} className="text-indigo-500" /> Последние записи
                </h3>
                <div className="relative">
                   <input 
                      type="text" 
                      placeholder="Поиск..."
                      className="bg-white border border-slate-100 rounded-xl py-1.5 pl-8 pr-3 text-[12px] font-medium outline-none focus:ring-4 focus:ring-indigo-50 transition-all w-32 shadow-sm"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                   />
                   <Search size={12} className="absolute left-2.5 top-2 text-slate-300" />
                </div>
              </div>
              
              <div className="space-y-3">
                {filteredTransactions.length > 0 ? (
                  <>
                    {filteredTransactions.map(t => {
                      const cat = categories.find(c => c.id === t.categoryId);
                      const acc = accounts.find(a => a.id === t.accountId);
                      const linkedDebt = debts.find(d => d.id === t.linkedDebtId);
                      const isSubscription = t.note.startsWith('[ПОДПИСКА]');
                      
                      const displayName = linkedDebt ? linkedDebt.personName : (cat?.name || 'Операция');
                      const displayIcon = linkedDebt 
                        ? (linkedDebt.isBank ? '🏦' : '🤝') 
                        : (isSubscription ? (t.note.split(' ')[1] || cat?.icon || '📦') : (cat?.icon || '📦'));
                      
                      const displayNote = t.note.replace(/^\[(ПОДПИСКА|ДОЛГ)\]\s*/, '');

                      return (
                        <div 
                          key={t.id} 
                          onClick={() => handleTxClick(t)}
                          className={`bg-white p-4 rounded-3xl flex items-center justify-between border border-slate-100 shadow-sm transition-all group active:bg-slate-50 active:scale-[0.99] cursor-pointer`}
                        >
                          <div className="flex items-center gap-4 min-w-0">
                            <div 
                              className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shadow-inner group-hover:rotate-6 transition-transform"
                              style={{ backgroundColor: `${cat?.color || '#6366f1'}15`, color: cat?.color || '#6366f1' }}
                            >
                              {isSubscription ? <RefreshCw size={18} className="text-indigo-500" /> : displayIcon}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 text-[14px] leading-tight truncate uppercase tracking-tight">
                                {isSubscription ? displayNote : displayName}
                              </p>
                              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                                {acc?.name} • {new Date(t.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                              </p>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={`font-black text-[15px] tracking-tight ${
                              t.type === 'income' ? 'text-emerald-500' : 
                              t.type === 'savings' ? 'text-indigo-600' : 'text-slate-900'
                            }`}>
                              {t.type === 'income' ? '+' : '-'}{t.amount.toLocaleString()}
                            </p>
                            <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-0.5">{profile.currency}</p>
                          </div>
                        </div>
                      );
                    })}
                    
                    <Link 
                      to="/history" 
                      className="flex items-center justify-center gap-2 w-full py-4 bg-slate-50 border border-slate-100 rounded-[1.75rem] text-[11px] font-black uppercase tracking-widest text-slate-500 active:scale-[0.98] active:bg-slate-100 transition-all"
                    >
                      Перейти к полной истории <ArrowRight size={14} />
                    </Link>
                  </>
                ) : (
                  <div className="text-center py-10 bg-white rounded-[2rem] border border-dashed border-slate-200">
                     <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">Операций не найдено</p>
                  </div>
                )}
              </div>
            </section>
          );
      }
    })();

    return (
      <div key={widgetId} className={`relative group/widget ${isHidden ? 'opacity-40 grayscale blur-[1px]' : ''}`}>
        {isEditMode && (
          <div className="absolute -top-3 left-0 right-0 z-20 flex justify-center gap-2">
             <div className="bg-white shadow-xl border border-slate-100 rounded-full px-4 py-1.5 flex items-center gap-4">
               <button onClick={() => moveWidget('up', widgetId)} className="text-slate-400 hover:text-indigo-600 transition-colors"><MoveUp size={14} /></button>
               <button onClick={() => moveWidget('down', widgetId)} className="text-slate-400 hover:text-indigo-600 transition-colors"><MoveDown size={14} /></button>
               <button onClick={() => toggleWidget(widgetId)} className="text-slate-400 hover:text-rose-500 transition-colors">
                {isHidden ? <EyeOff size={14} /> : <Eye size={14} />}
               </button>
             </div>
          </div>
        )}
        <div className={`transition-all duration-300 ${isEditMode ? 'ring-2 ring-dashed ring-indigo-300 ring-offset-8 rounded-[2.5rem] bg-slate-100/30' : ''}`}>
          {content}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-slide-up pb-10 pt-[env(safe-area-inset-top,8px)]">
      <header className="space-y-5 pt-2 px-1">
        <div className="flex justify-between items-center">
          <Link to="/profile" className="flex items-center gap-3 group">
             <div className="w-11 h-11 rounded-2xl bg-slate-900 border-2 border-white shadow-md flex items-center justify-center text-white text-base font-semibold shrink-0 group-active:scale-90 transition-all overflow-hidden aspect-square">
                {profile.avatar ? <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" /> : <span className="leading-none">{profile.name.charAt(0)}</span>}
             </div>
             <div>
               <h1 className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-1">
                {isAdmin ? <ShieldCheck size={10} className="text-amber-500" /> : <Sparkles size={10} className="text-indigo-500" />} 
                {isAdmin ? 'ADMIN PANEL' : 'FINFLOW'}
               </h1>
               <p className="text-[14px] font-bold text-slate-900 mt-0">{getTimeGreeting()}, {profile.name}</p>
             </div>
          </Link>
          <div className="flex gap-2">
            <Link to="/categories" className="w-9 h-9 bg-white rounded-xl border border-slate-100 shadow-sm flex items-center justify-center text-slate-400 active:scale-90 transition-all">
               <Layers size={16} />
            </Link>
            <Link to="/joint" className="w-9 h-9 bg-white rounded-xl border border-slate-100 shadow-sm flex items-center justify-center text-slate-400 active:scale-90 transition-all">
               <Handshake size={16} />
            </Link>
            <button 
              onClick={() => setIsEditMode(!isEditMode)}
              className={`w-9 h-9 rounded-xl border shadow-sm flex items-center justify-center transition-all ${isEditMode ? 'bg-indigo-600 text-white border-indigo-600 ring-4 ring-indigo-100' : 'bg-white border-slate-100 text-slate-500 active:scale-90'}`}
            >
               {isEditMode ? <Check size={16} /> : <Settings2 size={16} />}
            </button>
          </div>
        </div>
      </header>

      <div className="space-y-8 px-1">
        {layout.order.map(renderWidget)}
      </div>

      {isEditMode && (
        <div className="fixed bottom-32 left-0 right-0 z-[60] flex justify-center px-4 animate-slide-up">
           <div className="bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3">
              <Sparkles size={16} className="text-amber-400" />
              <p className="text-[11px] font-bold uppercase tracking-widest">Режим настройки главного экрана</p>
           </div>
        </div>
      )}
    </div>
  );
};
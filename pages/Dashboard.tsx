
import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppState, Transaction, SavingsGoal } from '../types';
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
  ArrowRight
} from 'lucide-react';

interface DashboardProps {
  state: AppState;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ state, onEditTransaction, onDeleteTransaction }) => {
  const { transactions, profile, debts, savings, categories, accounts } = state;
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

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
    
    // Logic for debts
    const theyOweMe = debts.filter(d => d.type === 'they_owe').reduce((s: number, d) => s + d.amount, 0);
    const iOwe = debts.filter(d => d.type === 'i_owe' && !d.isBank).reduce((s: number, d) => s + d.amount, 0);
    const netDebt = theyOweMe - iOwe;
    
    const totalSavingsValue = savings.reduce((s: number, g: SavingsGoal) => s + g.currentAmount, 0) + allTimeSavings;
    
    // Net worth calculation based on setting
    const netWorth = profile.includeDebtsInCapital 
      ? currentBalance + totalSavingsValue + netDebt
      : currentBalance + totalSavingsValue;

    // Calculate goals progress percentage
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

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 6) return 'Доброй ночи';
    if (hour < 12) return 'Доброе утро';
    if (hour < 18) return 'Добрый день';
    return 'Добрый вечер';
  };

  return (
    <div className="space-y-6 animate-slide-up pb-10 pt-[env(safe-area-inset-top,8px)]">
      <header className="space-y-5 pt-2 px-1">
        <div className="flex justify-between items-center">
          <Link to="/profile" className="flex items-center gap-3 group">
             <div className="w-11 h-11 rounded-2xl bg-slate-900 border-2 border-white shadow-md flex items-center justify-center text-white text-base font-semibold shrink-0 group-active:scale-90 transition-all overflow-hidden aspect-square">
                {profile.avatar ? (
                  <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover aspect-square" />
                ) : (
                  <span className="leading-none">{profile.name.charAt(0)}</span>
                )}
             </div>
             <div>
               <h1 className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-1">
                <Sparkles size={10} className="text-indigo-500" /> FINFLOW 
               </h1>
               <p className="text-[14px] font-bold text-slate-900 mt-0">{getTimeGreeting()}, {profile.name}</p>
             </div>
          </Link>
          <div className="flex gap-2">
            <button 
              onClick={() => navigate('/categories')}
              className="w-9 h-9 bg-white rounded-xl border border-slate-100 shadow-sm flex items-center justify-center text-slate-500 active:scale-90 transition-all"
            >
               <Layers size={16} />
            </button>
            <Link to="/joint" className="w-9 h-9 bg-white rounded-xl border border-slate-100 shadow-sm flex items-center justify-center text-slate-400 active:scale-90 transition-all">
               <Handshake size={16} />
            </Link>
          </div>
        </div>

        {/* Hero Cards Grid */}
        <div className="grid grid-cols-5 gap-3 h-36">
          {/* Capital Card */}
          <div className="col-span-3 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 rounded-[2.5rem] p-6 text-white relative overflow-hidden shadow-2xl border border-white/5 group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 blur-3xl transition-transform group-hover:scale-150 duration-700"></div>
            <div className="absolute bottom-0 left-0 w-20 h-20 bg-slate-500/5 rounded-full -ml-10 -mb-10 blur-2xl"></div>
            
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div className="space-y-1">
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">Капитал</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black tracking-tighter leading-none">
                    {stats.netWorth.toLocaleString()}
                  </span>
                  <span className="text-xs font-bold text-indigo-400/60 uppercase">{profile.currency}</span>
                </div>
              </div>
              
              <Link to="/accounts" className="self-start px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full backdrop-blur-md flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-200 transition-all active:scale-95">
                Счета <ArrowUpRight size={12} className="opacity-50" />
              </Link>
            </div>
          </div>

          {/* Goals Card */}
          <Link to="/savings" className="col-span-2 bg-gradient-to-br from-rose-500 to-rose-700 rounded-[2.5rem] p-6 text-white relative overflow-hidden shadow-2xl border border-white/5 group active:scale-[0.97] transition-all">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12 blur-2xl"></div>
            <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-black/10 rounded-full blur-xl"></div>
            
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <p className="text-rose-100/60 text-[10px] font-black uppercase tracking-[0.2em]">Цели</p>
                <Target size={16} className="text-rose-200/50" />
              </div>
              
              <div className="space-y-3">
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-black tracking-tighter leading-none">
                    {stats.totalSavingsValue.toLocaleString()}
                  </span>
                  <span className="text-[10px] font-bold text-rose-200 uppercase">{profile.currency}</span>
                </div>
                
                <div className="space-y-1.5">
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden border border-white/5">
                    <div 
                      className="h-full bg-white rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(255,255,255,0.4)]" 
                      style={{ width: `${Math.min(100, stats.goalProgress)}%` }}
                    />
                  </div>
                  <p className="text-[8px] font-black uppercase tracking-widest text-rose-100/50 text-right">
                    {Math.round(stats.goalProgress)}%
                  </p>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </header>

      {/* Modern Tinted Stats Cards */}
      <section className="px-1 grid grid-cols-2 gap-3">
        <div className="relative overflow-hidden bg-emerald-50/70 p-4 rounded-3xl border border-emerald-100 shadow-sm flex flex-col gap-2 group active:scale-95 transition-all">
          <TrendingUp size={64} className="absolute -right-4 -bottom-4 text-emerald-500/10 transform -rotate-12 pointer-events-none" />
          <div className="relative z-10 flex justify-between items-start">
            <p className="text-[10px] font-bold text-emerald-600/80 uppercase tracking-tight">Доходы</p>
            <span className="text-[9px] font-bold text-emerald-400/60 uppercase tracking-tight">Месяц</span>
          </div>
          <div className="relative z-10">
            <h4 className="text-lg font-black text-emerald-700">+{stats.totalIncome.toLocaleString()}</h4>
            <p className="text-[9px] font-bold text-emerald-500/60 mt-0.5">Всего за {new Date().toLocaleString('ru-RU', { month: 'long' })}</p>
          </div>
        </div>

        <div className="relative overflow-hidden bg-rose-50/70 p-4 rounded-3xl border border-rose-100 shadow-sm flex flex-col gap-2 group active:scale-95 transition-all">
          <TrendingDown size={64} className="absolute -right-4 -bottom-4 text-rose-500/10 transform rotate-12 pointer-events-none" />
          <div className="relative z-10 flex justify-between items-start">
            <p className="text-[10px] font-bold text-rose-600/80 uppercase tracking-tight">Расходы</p>
            <span className="text-[9px] font-bold text-rose-400/60 uppercase tracking-tight">Месяц</span>
          </div>
          <div className="relative z-10">
            <h4 className="text-lg font-black text-rose-700">-{stats.totalExpense.toLocaleString()}</h4>
            <p className="text-[9px] font-bold text-rose-500/60 mt-0.5">Включая планируемые</p>
          </div>
        </div>
      </section>

      {/* Account Carousel */}
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

      {/* History */}
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
                
                const displayName = linkedDebt ? linkedDebt.personName : (cat?.name || 'Операция');
                const displayIcon = linkedDebt ? (linkedDebt.isBank ? '🏦' : '🤝') : (cat?.icon || '📦');

                return (
                  <div 
                    key={t.id} 
                    onClick={() => onEditTransaction(t)}
                    className="bg-white p-4 rounded-3xl flex items-center justify-between border border-slate-100 shadow-sm active:bg-slate-50 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shadow-inner group-hover:rotate-6 transition-transform"
                        style={{ backgroundColor: `${cat?.color || '#6366f1'}15`, color: cat?.color || '#6366f1' }}
                      >
                        {displayIcon}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 text-[14px] leading-tight truncate uppercase tracking-tight">{displayName}</p>
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
    </div>
  );
};

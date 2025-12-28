
import React, { useMemo, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppState, Transaction } from '../types';
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
  Bot,
  ChevronRight,
  Plus,
  Edit3,
  Trash2
} from 'lucide-react';

interface DashboardProps {
  state: AppState;
  onEditTransaction: (tx: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
}

const SwipeableItem: React.FC<{
  t: Transaction;
  categories: AppState['categories'];
  accounts: AppState['accounts'];
  currency: string;
  onEdit: (t: Transaction) => void;
  onDelete: (id: string) => void;
  isAnySwiped: string | null;
  setIsAnySwiped: (id: string | null) => void;
}> = ({ t, categories, accounts, currency, onEdit, onDelete, isAnySwiped, setIsAnySwiped }) => {
  const [startX, setStartX] = useState<number | null>(null);
  const [currentOffset, setCurrentOffset] = useState(0);
  const isThisSwiped = isAnySwiped === t.id;
  
  const cat = categories.find(c => c.id === t.categoryId);
  const acc = accounts.find(a => a.id === t.accountId);

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startX === null) return;
    const x = e.touches[0].clientX;
    const diff = x - startX;
    
    // Лимит свайпа только влево
    if (diff < 0) {
      setCurrentOffset(Math.max(diff, -140));
    } else if (isThisSwiped && diff > 0) {
      setCurrentOffset(Math.min(-120 + diff, 0));
    }
  };

  const handleTouchEnd = () => {
    if (currentOffset < -60) {
      setIsAnySwiped(t.id);
      setCurrentOffset(-120);
    } else {
      setIsAnySwiped(null);
      setCurrentOffset(0);
    }
    setStartX(null);
  };

  const xPos = isThisSwiped ? -120 : currentOffset;

  return (
    <div className="relative overflow-hidden rounded-[2rem] h-[76px] touch-pan-y group">
      {/* Кнопки действий (интегрированные в фон приложения) */}
      <div className="absolute inset-0 bg-slate-50 flex justify-end rounded-[2rem] overflow-hidden">
        <div className="flex h-full px-2 gap-2">
          <button 
            onClick={(e) => { e.stopPropagation(); onEdit(t); setIsAnySwiped(null); }}
            className="w-[52px] h-full flex items-center justify-center text-indigo-500 active:scale-90 transition-all"
          >
            <div className="w-11 h-11 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100">
              <Edit3 size={18} strokeWidth={2.5} />
            </div>
          </button>
          <button 
            onClick={(e) => { 
              e.stopPropagation(); 
              if (confirm('Удалить эту операцию?')) {
                onDelete(t.id);
              }
              setIsAnySwiped(null);
            }}
            className="w-[52px] h-full flex items-center justify-center text-rose-500 active:scale-90 transition-all"
          >
            <div className="w-11 h-11 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100">
              <Trash2 size={18} strokeWidth={2.5} />
            </div>
          </button>
        </div>
      </div>

      {/* Контентная часть */}
      <div 
        className="absolute inset-0 bg-white px-5 py-4 rounded-[2rem] flex items-center justify-between border border-slate-100 shadow-sm transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1) z-10"
        style={{ transform: `translateX(${xPos}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => {
          if (isThisSwiped) {
            setIsAnySwiped(null);
          } else {
            onEdit(t);
          }
        }}
      >
        <div className="flex items-center gap-4 min-w-0 pointer-events-none">
          <div 
            className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shadow-inner shrink-0"
            style={{ backgroundColor: `${cat?.color}15`, color: cat?.color }}
          >
            {cat?.icon || '📦'}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-slate-900 text-[14px] leading-tight truncate uppercase tracking-tight">{cat?.name}</p>
            <p className="text-[11px] text-slate-400 font-bold mt-0.5 truncate uppercase tracking-tighter">
              {acc?.name} • {new Date(t.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
            </p>
          </div>
        </div>
        <div className="text-right pointer-events-none">
          <p className={`font-black text-[16px] tracking-tighter leading-none ${
            t.type === 'income' ? 'text-emerald-500' : 
            t.type === 'savings' ? 'text-indigo-600' : 'text-slate-900'
          }`}>
            {t.type === 'income' ? '+' : '-'}{t.amount.toLocaleString()}
          </p>
          <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-0.5">{currency}</p>
        </div>
      </div>
    </div>
  );
};

export const Dashboard: React.FC<DashboardProps> = ({ state, onEditTransaction, onDeleteTransaction }) => {
  const { transactions, profile, debts, savings, categories, accounts } = state;
  const [searchQuery, setSearchQuery] = useState('');
  const [swipedId, setSwipedId] = useState<string | null>(null);
  const navigate = useNavigate();

  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyTransactions = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear && !t.isPlanned;
    });

    const totalIncome = monthlyTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpense = monthlyTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    
    const allTimeIncome = transactions.filter(t => t.type === 'income' && !t.isPlanned).reduce((s, t) => s + t.amount, 0);
    const allTimeExpense = transactions.filter(t => t.type === 'expense' && !t.isPlanned).reduce((s, t) => s + t.amount, 0);
    const allTimeSavings = transactions.filter(t => t.type === 'savings' && !t.isPlanned).reduce((s, t) => s + t.amount, 0);

    const currentBalance = accounts.reduce((s, a) => s + a.balance, 0) + (allTimeIncome - allTimeExpense - allTimeSavings);
    
    const theyOweMe = debts.filter(d => d.type === 'they_owe').reduce((s, d) => s + d.amount, 0);
    const iOwe = debts.filter(d => d.type === 'i_owe' && !d.isBank).reduce((s, d) => s + d.amount, 0);
    const netDebt = theyOweMe - iOwe;
    const totalSavingsValue = savings.reduce((s, g) => s + g.currentAmount, 0) + allTimeSavings;
    const netWorth = currentBalance + totalSavingsValue + netDebt;

    return { 
      currentBalance, 
      netDebt, 
      totalSavingsValue, 
      netWorth, 
      totalExpense, 
      totalIncome
    };
  }, [transactions, debts, savings, categories, accounts]);

  const filteredTransactions = useMemo(() => {
    return [...transactions]
      .filter(t => !t.isPlanned)
      .filter(t => {
        const cat = categories.find(c => c.id === t.categoryId);
        const searchString = `${cat?.name} ${t.note}`.toLowerCase();
        return searchString.includes(searchQuery.toLowerCase());
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 15);
  }, [transactions, searchQuery, categories]);

  return (
    <div className="space-y-6 animate-slide-up pb-10" onClick={() => setSwipedId(null)}>
      <header className="space-y-4 pt-2 px-1">
        <div className="flex justify-between items-center">
          <Link to="/profile" className="flex items-center gap-3 group">
             <div className="w-10 h-10 rounded-xl bg-slate-900 border-2 border-white shadow-md flex items-center justify-center text-white text-base font-semibold shrink-0 group-active:scale-90 transition-all overflow-hidden relative">
                {profile.avatar ? (
                  <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  profile.name.charAt(0)
                )}
             </div>
             <div>
               <h1 className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-1">
                <Sparkles size={10} className="text-indigo-500" /> FINFLOW 
               </h1>
               <p className="text-[15px] font-extrabold text-slate-900 mt-0">{profile.name}</p>
             </div>
          </Link>
          <div className="flex gap-2">
            <button 
              onClick={() => navigate('/ai-chat')}
              className="w-10 h-10 bg-indigo-50 rounded-xl border border-indigo-100 shadow-sm flex items-center justify-center text-indigo-600 active:scale-90 transition-all relative overflow-hidden"
            >
               <Bot size={18} />
            </button>
            <Link to="/joint" className="w-10 h-10 bg-white rounded-xl border border-slate-100 shadow-sm flex items-center justify-center text-slate-400 active:scale-90 transition-all">
               <Handshake size={16} />
            </Link>
            <Link to="/categories" className="w-10 h-10 bg-white rounded-xl border border-slate-100 shadow-sm flex items-center justify-center text-slate-400 active:scale-90 transition-all">
               <Layers size={16} />
            </Link>
          </div>
        </div>

        {/* Hero Cards Grid */}
        <div className="grid grid-cols-2 gap-3 h-36">
          <Link to="/accounts" className="h-full bg-[#1e293b] rounded-[2.2rem] p-4 text-white relative overflow-hidden shadow-xl border border-white/5 flex flex-col justify-between group active:scale-[0.98] transition-all">
            <div className="absolute -top-6 -right-6 w-24 h-24 bg-indigo-500/20 rounded-full blur-2xl"></div>
            <div className="relative z-10 flex justify-between items-start">
              <div className="space-y-0.5">
                <p className="text-indigo-300/80 text-[8px] font-black uppercase tracking-[0.2em]">Капитал</p>
                <div className="flex items-baseline gap-1">
                  <h2 className="text-[20px] font-black tracking-tight leading-none">
                    {stats.netWorth.toLocaleString()}
                  </h2>
                  <span className="text-[9px] font-bold text-indigo-400/60 uppercase">{profile.currency}</span>
                </div>
              </div>
              <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center border border-white/5 backdrop-blur-sm">
                <Wallet size={14} className="text-indigo-300" />
              </div>
            </div>
            <div className="relative z-10 flex items-center justify-between group/btn pt-2 border-t border-white/5">
              <span className="text-[8px] font-black uppercase tracking-[0.15em] text-indigo-200/50">Управление</span>
              <div className="w-6 h-6 rounded-full bg-indigo-500/80 text-white flex items-center justify-center shadow-md">
                 <ChevronRight size={12} strokeWidth={3} />
              </div>
            </div>
          </Link>

          <Link to="/savings" className="h-full bg-gradient-to-br from-[#f43f5e] to-[#e11d48] rounded-[2.2rem] p-4 text-white relative overflow-hidden shadow-xl border border-rose-400/20 flex flex-col justify-between active:scale-[0.98] transition-all group">
            <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
            <div className="relative z-10 flex justify-between items-start">
              <div className="space-y-0.5">
                <p className="text-rose-100/80 text-[8px] font-black uppercase tracking-[0.2em]">Накопления</p>
                <div className="flex items-baseline gap-1">
                  <h2 className="text-[20px] font-black tracking-tight leading-none">
                    {stats.totalSavingsValue.toLocaleString()}
                  </h2>
                  <span className="text-[9px] font-bold text-rose-200/60 uppercase">{profile.currency}</span>
                </div>
              </div>
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center border border-white/5 backdrop-blur-sm">
                <Target size={14} className="text-rose-100" />
              </div>
            </div>
            <div className="relative z-10 space-y-1.5 pt-2 border-t border-white/10">
              <div className="flex justify-between items-end">
                 <span className="text-[8px] font-black uppercase tracking-widest text-rose-100/50">Прогресс</span>
                 <span className="text-[9px] font-black text-white/90">64%</span>
              </div>
              <div className="h-1.5 w-full bg-black/10 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(255,255,255,0.4)]" style={{ width: '64%' }}></div>
              </div>
            </div>
          </Link>
        </div>
      </header>

      {/* Stats Cards */}
      <section className="px-1 grid grid-cols-2 gap-3">
        <div className="relative overflow-hidden bg-emerald-50/70 p-4 rounded-3xl border border-emerald-100 shadow-sm flex flex-col gap-2 transition-all">
          <TrendingUp size={64} className="absolute -right-4 -bottom-4 text-emerald-500/10 transform -rotate-12 pointer-events-none" />
          <div className="relative z-10 flex justify-between items-start">
            <p className="text-[10px] font-bold text-emerald-600/80 uppercase tracking-tight">Доходы</p>
            <span className="text-[9px] font-bold text-emerald-400/60 uppercase tracking-tight">Месяц</span>
          </div>
          <div className="relative z-10">
            <h4 className="text-lg font-black text-emerald-700">+{stats.totalIncome.toLocaleString()}</h4>
            <p className="text-[9px] font-bold text-emerald-500/60 mt-0.5">В этом месяце</p>
          </div>
        </div>

        <div className="relative overflow-hidden bg-rose-50/70 p-4 rounded-3xl border border-rose-100 shadow-sm flex flex-col gap-2 transition-all">
          <TrendingDown size={64} className="absolute -right-4 -bottom-4 text-rose-500/10 transform rotate-12 pointer-events-none" />
          <div className="relative z-10 flex justify-between items-start">
            <p className="text-[10px] font-bold text-rose-600/80 uppercase tracking-tight">Расходы</p>
            <span className="text-[9px] font-bold text-rose-400/60 uppercase tracking-tight">Месяц</span>
          </div>
          <div className="relative z-10">
            <h4 className="text-lg font-black text-rose-700">-{stats.totalExpense.toLocaleString()}</h4>
            <p className="text-[9px] font-bold text-rose-500/60 mt-0.5">Включая планы</p>
          </div>
        </div>
      </section>

      {/* History */}
      <section className="space-y-4 px-1">
        <div className="flex justify-between items-center px-1">
          <h3 className="font-bold text-slate-800 text-[12px] uppercase tracking-widest flex items-center gap-1.5">
            <History size={16} className="text-indigo-500" /> История
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
        
        <div className="space-y-2">
          {filteredTransactions.length > 0 ? (
            filteredTransactions.map(t => (
              <SwipeableItem 
                key={t.id} 
                t={t} 
                categories={categories} 
                accounts={accounts} 
                currency={profile.currency}
                onEdit={onEditTransaction}
                onDelete={onDeleteTransaction}
                isAnySwiped={swipedId}
                setIsAnySwiped={setSwipedId}
              />
            ))
          ) : (
            <div className="text-center py-10 bg-white rounded-[2rem] border border-dashed border-slate-200">
               <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">Пусто</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

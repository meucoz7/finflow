
import React, { useMemo, useState, useEffect } from 'react';
import { AppState } from '../types';
import { 
  Handshake, 
  Users, 
  Share2, 
  Check, 
  History,
  Info,
  UserPlus,
  Copy,
  ArrowRight,
  Loader2,
  XCircle
} from 'lucide-react';

interface JointBudgetProps {
  state: AppState;
  onUpdateState: (newState: Partial<AppState>) => void;
}

export const JointBudget: React.FC<JointBudgetProps> = ({ state, onUpdateState }) => {
  const { transactions, categories, profile } = state;
  const [partnerIdInput, setPartnerIdInput] = useState('');
  const [isLinking, setIsLinking] = useState(false);
  const [partnerName, setPartnerName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tg = (window as any).Telegram?.WebApp;
  const myId = tg?.initDataUnsafe?.user?.id || 12345;

  const jointTransactions = useMemo(() => {
    return transactions
      .filter(t => t.isJoint)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions]);

  const jointStats = useMemo(() => {
    const expenses = jointTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const income = jointTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    return { expenses, income, balance: income - expenses };
  }, [jointTransactions]);

  const handlePair = async () => {
    if (!partnerIdInput || isLinking) return;
    setIsLinking(true);
    setError(null);
    try {
      const res = await fetch('/api/pair-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ myId, partnerId: parseInt(partnerIdInput) })
      });
      const data = await res.json();
      if (res.ok) {
        setPartnerName(data.partnerName);
        window.location.reload(); // Перезагружаем для подтяжки данных партнера
      } else {
        setError(data.error || 'Ошибка при связке');
      }
    } catch (err) {
      setError('Ошибка сети');
    } finally {
      setIsLinking(false);
    }
  };

  const copyMyId = () => {
    navigator.clipboard.writeText(myId.toString());
    tg?.HapticFeedback?.notificationOccurred('success');
    alert('Ваш ID скопирован! Отправьте его партнеру.');
  };

  return (
    <div className="space-y-5 animate-slide-up pb-32">
      <header className="px-1 pt-1">
        <h1 className="text-indigo-600 text-[9px] font-black uppercase tracking-[0.2em]">СОВМЕСТНЫЙ ДОСТУП</h1>
        <p className="text-slate-900 font-black text-xl">Семейный бюджет</p>
      </header>

      {/* Stats Card */}
      <div className="bg-slate-900 rounded-[2.5rem] p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
        <div className="relative z-10">
          <p className="text-indigo-300 text-[10px] font-black uppercase tracking-widest mb-1">Общий баланс парных трат</p>
          <h3 className="text-3xl font-black">{jointStats.balance.toLocaleString()} <span className="text-sm text-indigo-400">{profile.currency}</span></h3>
          
          <div className="flex gap-4 mt-6 pt-4 border-t border-white/10">
            <div>
              <p className="text-slate-500 text-[8px] font-black uppercase mb-0.5">Доходы</p>
              <p className="text-emerald-400 font-black text-sm">+{jointStats.income.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-slate-500 text-[8px] font-black uppercase mb-0.5">Расходы</p>
              <p className="text-rose-400 font-black text-sm">-{jointStats.expenses.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pairing Interface */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-5">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ваш уникальный ID</label>
          <div className="flex gap-2">
            <div className="flex-grow bg-slate-50 p-4 rounded-2xl font-mono font-bold text-slate-600 flex justify-between items-center">
              {myId}
              <button onClick={copyMyId} className="text-indigo-500 hover:text-indigo-700"><Copy size={18} /></button>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ID партнера</label>
          <div className="relative">
            <input 
              type="number" 
              placeholder="Введите ID второй половинки..." 
              className="w-full bg-slate-50 p-4 rounded-2xl font-bold text-slate-900 outline-none border border-transparent focus:bg-white focus:ring-4 focus:ring-indigo-50 transition-all"
              value={partnerIdInput}
              onChange={e => setPartnerIdInput(e.target.value)}
            />
            <button 
              onClick={handlePair}
              disabled={!partnerIdInput || isLinking}
              className="absolute right-2 top-2 bottom-2 bg-slate-900 text-white px-4 rounded-xl flex items-center justify-center active:scale-95 transition-all disabled:opacity-20"
            >
              {isLinking ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
            </button>
          </div>
          {error && <p className="text-rose-500 text-[10px] font-bold mt-1 ml-1 flex items-center gap-1"><XCircle size={12} /> {error}</p>}
        </div>

        <div className="p-4 bg-indigo-50 rounded-2xl flex gap-3 items-start">
          <Info size={16} className="text-indigo-500 shrink-0 mt-0.5" />
          <p className="text-[11px] text-indigo-700 font-bold leading-relaxed">
            Когда вы связываете аккаунты, любые транзакции с включенным флагом <strong>"Общий бюджет"</strong> будут мгновенно появляться в лентах обоих пользователей.
          </p>
        </div>
      </div>

      {/* Joint History */}
      <section className="space-y-3 px-1">
        <h3 className="font-black text-slate-800 text-[11px] uppercase tracking-widest flex items-center gap-2">
          <History size={16} className="text-indigo-500" /> История общих трат
        </h3>
        
        <div className="space-y-2">
          {jointTransactions.length === 0 ? (
            <div className="bg-white py-12 rounded-[2.5rem] border border-dashed border-slate-200 text-center">
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Общих операций пока нет</p>
            </div>
          ) : (
            jointTransactions.map(t => {
              const cat = categories.find(c => c.id === t.categoryId);
              return (
                <div key={t.id} className="bg-white p-4 rounded-[1.75rem] border border-slate-50 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ backgroundColor: `${cat?.color}15`, color: cat?.color }}>
                      {cat?.icon || '📦'}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-[13px] uppercase">{cat?.name}</h4>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">{new Date(t.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-black text-[15px] ${t.type === 'income' ? 'text-emerald-500' : 'text-slate-900'}`}>
                      {t.type === 'income' ? '+' : '-'}{t.amount.toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
};

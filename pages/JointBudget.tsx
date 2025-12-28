
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
  XCircle,
  Link2,
  Unlink,
  Clock,
  Sparkles,
  ShieldCheck,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface JointBudgetProps {
  state: AppState;
  onUpdateState: (newState: Partial<AppState>) => void;
}

export const JointBudget: React.FC<JointBudgetProps> = ({ state, onUpdateState }) => {
  const { transactions, categories, profile } = state;
  const [partnerIdInput, setPartnerIdInput] = useState('');
  const [isLinking, setIsLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPairingExpanded, setIsPairingExpanded] = useState(false);

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
      const res = await fetch('/api/request-pairing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ myId, partnerId: parseInt(partnerIdInput) })
      });
      const data = await res.json();
      if (res.ok) {
        onUpdateState({ profile: { ...profile, pendingPartnerId: parseInt(partnerIdInput) } });
        alert('Запрос отправлен партнеру в Telegram! 🚀');
        setPartnerIdInput('');
        setIsPairingExpanded(false);
      } else {
        setError(data.error || 'Ошибка при связке');
      }
    } catch (err) {
      setError('Ошибка сети');
    } finally {
      setIsLinking(false);
    }
  };

  const cancelPairing = async () => {
    if (!confirm('Вы уверены, что хотите отменить связь или текущий запрос?')) return;
    try {
       const res = await fetch('/api/cancel-pairing', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ myId })
       });
       if (res.ok) {
         onUpdateState({ profile: { ...profile, partnerId: null, pendingPartnerId: null } });
         alert('Связь разорвана.');
       }
    } catch (e) {
      alert('Ошибка при отмене.');
    }
  };

  const copyMyId = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(myId.toString());
      tg?.HapticFeedback?.notificationOccurred('success');
      alert('Ваш ID скопирован!');
    }
  };

  return (
    <div className="space-y-6 animate-slide-up pb-32 pt-[env(safe-area-inset-top,8px)]">
      <header className="px-2 pt-2 flex justify-between items-center">
        <div>
          <h1 className="text-indigo-600 text-[10px] font-black uppercase tracking-[0.25em] mb-1">СИНХРОНИЗАЦИЯ</h1>
          <p className="text-slate-900 font-black text-2xl">Общий бюджет</p>
        </div>
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg ${profile.partnerId ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white'}`}>
          {profile.partnerId ? <Link2 size={22} /> : <Users size={22} />}
        </div>
      </header>

      {/* Main Status Display */}
      <div className={`mx-1 p-6 rounded-[2.5rem] shadow-xl relative overflow-hidden transition-all duration-500 ${profile.partnerId ? 'bg-emerald-600 text-white' : profile.pendingPartnerId ? 'bg-amber-500 text-white' : 'bg-slate-900 text-white'}`}>
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        
        <div className="relative z-10 flex flex-col gap-4">
          <div className="flex justify-between items-start">
             <div>
                <p className="text-white/60 text-[10px] font-black uppercase tracking-widest mb-1">Статус подключения</p>
                <h2 className="text-2xl font-black flex items-center gap-2">
                  {profile.partnerId ? 'Связь установлена' : profile.pendingPartnerId ? 'Ожидание ответа' : 'Одиночный режим'}
                  {profile.partnerId && <Sparkles size={20} className="text-amber-300 animate-pulse" />}
                </h2>
             </div>
             {profile.partnerId && (
               <button onClick={cancelPairing} className="p-3 bg-white/10 rounded-2xl hover:bg-white/20 transition-all">
                  <Unlink size={18} />
               </button>
             )}
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
            <div>
              <p className="text-white/40 text-[9px] font-black uppercase mb-1">Общий баланс</p>
              <p className="text-lg font-black">{jointStats.balance.toLocaleString()} {profile.currency}</p>
            </div>
            <div className="text-right">
              <p className="text-white/40 text-[9px] font-black uppercase mb-1">Операций</p>
              <p className="text-lg font-black">{jointTransactions.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Accordion Pairing Flow */}
      {!profile.partnerId && (
        <div className="px-1 space-y-3">
          <button 
            onClick={() => setIsPairingExpanded(!isPairingExpanded)}
            className="w-full bg-white p-5 rounded-[1.75rem] border border-slate-100 shadow-sm flex items-center justify-between group active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                 <UserPlus size={20} />
              </div>
              <div className="text-left">
                <p className="text-[12px] font-black text-slate-900 uppercase tracking-tight">Подключить партнера</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Шаг за шагом</p>
              </div>
            </div>
            {isPairingExpanded ? <ChevronUp size={20} className="text-slate-300" /> : <ChevronDown size={20} className="text-slate-300" />}
          </button>

          {isPairingExpanded && (
            <div className="space-y-4 animate-slide-up pt-1">
              {/* Step 1: My ID Card */}
              <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col gap-4 relative">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <Copy size={16} />
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">Шаг 1: Ваш ID</span>
                </div>
                <div className="flex items-center justify-between bg-slate-50 p-5 rounded-[1.75rem] border border-slate-100 group active:scale-[0.98] transition-all" onClick={copyMyId}>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Коснитесь, чтобы скопировать</p>
                      <p className="text-2xl font-black text-slate-900 tracking-wider">{myId}</p>
                    </div>
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-500 shadow-sm border border-slate-100 group-hover:rotate-12 transition-transform">
                      <Copy size={20} />
                    </div>
                </div>
              </div>

              {/* Step 2: Input Partner ID */}
              <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col gap-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <ArrowRight size={16} />
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">Шаг 2: Введите ID партнера</span>
                </div>
                
                {profile.pendingPartnerId ? (
                  <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <Clock size={18} className="text-amber-500 animate-spin-slow" />
                        <p className="text-[12px] font-bold text-amber-800">Запрос отправлен пользователю {profile.pendingPartnerId}</p>
                      </div>
                      <button onClick={cancelPairing} className="w-full py-2 bg-amber-200/50 text-amber-700 rounded-xl text-[10px] font-black uppercase">Отменить запрос</button>
                  </div>
                ) : (
                  <div className="relative">
                    <input 
                      type="number" 
                      placeholder="ID партнера..." 
                      className="w-full bg-slate-50 p-5 rounded-[1.75rem] font-bold text-slate-900 outline-none border border-transparent focus:bg-white focus:ring-4 focus:ring-indigo-50 transition-all text-lg shadow-inner"
                      value={partnerIdInput}
                      onChange={e => setPartnerIdInput(e.target.value)}
                    />
                    <button 
                      onClick={handlePair}
                      disabled={!partnerIdInput || isLinking}
                      className="absolute right-3 top-3 bottom-3 bg-slate-900 text-white px-6 rounded-2xl flex items-center justify-center active:scale-95 transition-all disabled:opacity-20 shadow-lg shadow-slate-200"
                    >
                      {isLinking ? <Loader2 size={20} className="animate-spin" /> : <ArrowRight size={20} strokeWidth={3} />}
                    </button>
                  </div>
                )}
                {error && <p className="text-rose-500 text-[10px] font-bold mt-1 flex items-center gap-2 px-2"><XCircle size={14} /> {error}</p>}
              </div>
            </div>
          )}
        </div>
      )}

      {profile.partnerId && (
        <div className="px-1">
           <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="w-14 h-14 bg-emerald-50 rounded-[1.5rem] flex items-center justify-center text-emerald-500 shrink-0">
                 <ShieldCheck size={28} />
              </div>
              <div>
                 <p className="text-[14px] font-black text-slate-900 uppercase leading-tight">Синхронизация активна</p>
                 <p className="text-[11px] text-slate-500 font-medium mt-0.5">Любые транзакции с пометкой "Общий" будут доступны вашему партнеру.</p>
              </div>
           </div>
        </div>
      )}

      {/* Joint History Section */}
      <section className="space-y-4 px-1">
        <div className="flex justify-between items-center px-1">
          <h3 className="font-black text-slate-800 text-[11px] uppercase tracking-[0.2em] flex items-center gap-2">
            <History size={16} className="text-indigo-500" /> Совместные операции
          </h3>
          <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-3 py-1 rounded-full">{jointTransactions.length}</span>
        </div>
        
        <div className="space-y-3">
          {jointTransactions.length === 0 ? (
            <div className="bg-white py-16 rounded-[2.5rem] border border-dashed border-slate-200 text-center flex flex-col items-center gap-3">
              <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-200">
                 <Handshake size={24} />
              </div>
              <p className="text-slate-300 text-[10px] font-black uppercase tracking-widest">Общих операций не найдено</p>
            </div>
          ) : (
            jointTransactions.map(t => {
              const cat = categories.find(c => c.id === t.categoryId);
              return (
                <div key={t.id} className="bg-white p-4 rounded-[1.75rem] border border-slate-50 shadow-sm flex items-center justify-between group active:bg-slate-50 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shadow-inner group-hover:scale-110 transition-transform" style={{ backgroundColor: `${cat?.color}15`, color: cat?.color }}>
                      {cat?.icon || '📦'}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-[14px] uppercase tracking-tight">{cat?.name}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                         <p className="text-[9px] text-slate-400 font-bold uppercase">{new Date(t.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</p>
                         <div className="w-1 h-1 bg-slate-200 rounded-full"></div>
                         <p className="text-[9px] text-indigo-500 font-bold uppercase tracking-widest">Общий</p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-black text-[16px] tracking-tight ${t.type === 'income' ? 'text-emerald-500' : 'text-slate-900'}`}>
                      {t.type === 'income' ? '+' : '-'}{t.amount.toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Bottom Info Card */}
      <div className="mx-1 p-5 bg-slate-50 rounded-[2rem] border border-slate-100 flex gap-4 items-center">
         <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-amber-500 shadow-sm shrink-0">
            <Info size={22} />
         </div>
         <p className="text-[11px] text-slate-500 font-bold leading-relaxed">
            Связанные аккаунты объединяют только те транзакции, которые вы явно помечаете как <strong>"Общие"</strong> при создании. Ваши личные счета и история остаются приватными.
         </p>
      </div>
    </div>
  );
};

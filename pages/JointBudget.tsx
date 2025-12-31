
import React, { useMemo, useState, useEffect } from 'react';
import { AppState } from '../types';
import { 
  Handshake, 
  Users, 
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
  ChevronUp,
  Fingerprint,
  RotateCcw
} from 'lucide-react';

interface JointBudgetProps {
  state: AppState;
  onUpdateState: (newState: Partial<AppState>) => void;
}

export const JointBudget: React.FC<JointBudgetProps> = ({ state, onUpdateState }) => {
  const { transactions, categories, profile } = state;
  const [partnerCodeInput, setPartnerCodeInput] = useState('');
  const [pairingCode, setPairingCode] = useState<string>('------');
  const [isLinking, setIsLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPairingExpanded, setIsPairingExpanded] = useState(false);

  const tg = (window as any).Telegram?.WebApp;
  const myId = tg?.initDataUnsafe?.user?.id || 0;

  // Загружаем актуальный код сопряжения при открытии страницы
  useEffect(() => {
    const fetchCode = async () => {
      try {
        const res = await fetch(`/api/user-state/${myId}`);
        const data = await res.json();
        if (data.pairingCode) setPairingCode(data.pairingCode);
        if (data.partnerId) onUpdateState({ profile: { ...profile, partnerId: data.partnerId } });
      } catch (e) {}
    };
    fetchCode();
  }, [myId]);

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
    const code = partnerCodeInput.trim().toUpperCase();
    if (!code || isLinking) return;
    
    if (code === pairingCode) {
      setError('Нельзя использовать собственный код');
      tg?.HapticFeedback?.notificationOccurred('error');
      return;
    }

    setIsLinking(true);
    setError(null);
    try {
      const res = await fetch('/api/request-pairing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ myId, partnerCode: code })
      });
      const data = await res.json();
      if (res.ok) {
        onUpdateState({ profile: { ...profile, partnerId: 999 /* dummy id to trigger view */ } });
        alert(`Связь с партнером установлена! 🚀`);
        setPartnerCodeInput('');
        setIsPairingExpanded(false);
        // Перезагрузка для получения реальных данных
        window.location.reload();
      } else {
        setError(data.error || 'Ошибка при связке');
        tg?.HapticFeedback?.notificationOccurred('error');
      }
    } catch (err) {
      setError('Ошибка сети');
    } finally {
      setIsLinking(false);
    }
  };

  const cancelPairing = async () => {
    if (!confirm('Вы уверены, что хотите разорвать связь с партнером?')) return;
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

  const copyMyCode = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(pairingCode);
      tg?.HapticFeedback?.notificationOccurred('success');
      // Показываем временную подсказку в будущем можно добавить тост
      alert('Код скопирован!');
    }
  };

  return (
    <div className="space-y-6 animate-slide-up pb-32 pt-[env(safe-area-inset-top,8px)]">
      <header className="px-2 pt-2 flex justify-between items-center">
        <div>
          <h1 className="text-indigo-600 text-[10px] font-black uppercase tracking-[0.25em] mb-1">СИНХРОНИЗАЦИЯ</h1>
          <p className="text-slate-900 font-black text-2xl tracking-tighter">Ведем бюджет вместе</p>
        </div>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all ${profile.partnerId ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white'}`}>
          {profile.partnerId ? <Link2 size={24} /> : <Users size={24} />}
        </div>
      </header>

      {/* Main Status Display */}
      <div className={`mx-1 p-7 rounded-[2.5rem] shadow-2xl relative overflow-hidden transition-all duration-700 ${profile.partnerId ? 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white' : 'bg-gradient-to-br from-slate-900 to-indigo-950 text-white'}`}>
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -mr-24 -mt-24"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -ml-16 -mb-16"></div>
        
        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex justify-between items-start">
             <div>
                <p className="text-white/50 text-[10px] font-black uppercase tracking-widest mb-1.5">Режим работы</p>
                <h2 className="text-2xl font-black flex items-center gap-2.5">
                  {profile.partnerId ? 'Связь активна' : 'Соло режим'}
                  {profile.partnerId && <Sparkles size={22} className="text-amber-300 animate-pulse" />}
                </h2>
                {profile.partnerId && <p className="text-emerald-100/60 text-[10px] font-bold mt-1 uppercase">Данные синхронизируются в реальном времени</p>}
             </div>
             {profile.partnerId && (
               <button onClick={cancelPairing} className="w-11 h-11 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/10 active:scale-90 transition-all">
                  <Unlink size={20} />
               </button>
             )}
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-5">
            <div className="space-y-1">
              <p className="text-white/40 text-[9px] font-black uppercase tracking-widest">Общий баланс</p>
              <p className="text-2xl font-black tracking-tighter">{jointStats.balance.toLocaleString()} <span className="text-xs opacity-40 font-bold">{profile.currency}</span></p>
            </div>
            <div className="text-right space-y-1">
              <p className="text-white/40 text-[9px] font-black uppercase tracking-widest">Всего трат</p>
              <p className="text-2xl font-black tracking-tighter">{jointStats.expenses.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pairing Flow */}
      {!profile.partnerId && (
        <div className="px-1 space-y-4">
          <button 
            onClick={() => setIsPairingExpanded(!isPairingExpanded)}
            className={`w-full p-5 rounded-[2rem] border transition-all flex items-center justify-between group active:scale-[0.98] ${isPairingExpanded ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-100 shadow-sm'}`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${isPairingExpanded ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                 <UserPlus size={22} />
              </div>
              <div className="text-left">
                <p className="text-[13px] font-black text-slate-900 uppercase tracking-tight">Настроить связь</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Объединитесь с партнером</p>
              </div>
            </div>
            {isPairingExpanded ? <ChevronUp size={22} className="text-indigo-400" /> : <ChevronDown size={22} className="text-slate-300" />}
          </button>

          {isPairingExpanded && (
            <div className="space-y-4 animate-slide-up">
              {/* Step 1: Secure Code View */}
              <div className="bg-white p-7 rounded-[2.5rem] border border-slate-100 shadow-xl space-y-5">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <Fingerprint size={18} />
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">Ваш код для связи</span>
                </div>
                
                <div 
                  className="flex items-center justify-between bg-slate-50 p-6 rounded-[2rem] border border-slate-100 group active:scale-[0.98] transition-all cursor-pointer shadow-inner"
                  onClick={copyMyCode}
                >
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Коснитесь, чтобы скопировать</p>
                      <p className="text-3xl font-black text-slate-900 tracking-[0.2em] font-mono">{pairingCode}</p>
                    </div>
                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-indigo-500 shadow-md border border-slate-50 group-hover:rotate-12 transition-transform">
                      <Copy size={24} />
                    </div>
                </div>

                <div className="flex items-center gap-2.5 px-2">
                  <RotateCcw size={12} className="text-amber-500 animate-spin-slow" />
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Обновляется каждые 24 часа для безопасности</p>
                </div>
              </div>

              {/* Step 2: Enter Partner's Code */}
              <div className="bg-white p-7 rounded-[2.5rem] border border-slate-100 shadow-xl space-y-5">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <ArrowRight size={18} />
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">Ввести код партнера</span>
                </div>
                
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Введите 6 символов..." 
                    className="w-full bg-slate-50 p-5 rounded-[1.75rem] font-black text-slate-900 outline-none border border-transparent focus:bg-white focus:ring-4 focus:ring-indigo-50/50 transition-all text-xl tracking-widest uppercase shadow-inner"
                    value={partnerCodeInput}
                    maxLength={6}
                    onChange={e => {
                        setPartnerCodeInput(e.target.value);
                        if (error) setError(null);
                    }}
                  />
                  <button 
                    onClick={handlePair}
                    disabled={partnerCodeInput.length < 6 || isLinking}
                    className={`absolute right-3 top-3 bottom-3 px-6 rounded-2xl flex items-center justify-center transition-all ${partnerCodeInput.length === 6 ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-200 text-slate-400'}`}
                  >
                    {isLinking ? <Loader2 size={22} className="animate-spin" /> : <Check size={24} strokeWidth={3} />}
                  </button>
                </div>
                {error && <p className="text-rose-500 text-[10px] font-black uppercase mt-1 flex items-center gap-2 px-3 animate-slide-up"><XCircle size={14} /> {error}</p>}
              </div>
            </div>
          )}
        </div>
      )}

      {profile.partnerId && !isPairingExpanded && (
        <div className="px-1">
           <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-[2.5rem] flex items-center gap-5 shadow-sm">
              <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-emerald-500 shrink-0 shadow-sm">
                 <ShieldCheck size={32} />
              </div>
              <div className="space-y-1">
                 <p className="text-[14px] font-black text-emerald-900 uppercase leading-tight tracking-tight">Безопасное соединение</p>
                 <p className="text-[11px] text-emerald-700/70 font-bold uppercase tracking-widest leading-relaxed">Все данные зашифрованы</p>
              </div>
           </div>
        </div>
      )}

      {/* Joint History */}
      <section className="space-y-4 px-1">
        <div className="flex justify-between items-center px-2">
          <h3 className="font-black text-slate-800 text-[11px] uppercase tracking-[0.25em] flex items-center gap-2.5">
            <History size={18} className="text-indigo-500" /> Последние общие траты
          </h3>
          <span className="text-[10px] font-black text-slate-400 bg-white border border-slate-100 px-3 py-1 rounded-full shadow-sm">{jointTransactions.length}</span>
        </div>
        
        <div className="space-y-3">
          {jointTransactions.length === 0 ? (
            <div className="bg-white py-16 rounded-[2.5rem] border border-dashed border-slate-200 text-center flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-slate-50 rounded-[1.75rem] flex items-center justify-center text-slate-200 shadow-inner">
                 <Handshake size={32} />
              </div>
              <p className="text-slate-300 text-[11px] font-black uppercase tracking-[0.2em]">История пуста</p>
            </div>
          ) : (
            jointTransactions.map(t => {
              const cat = categories.find(c => c.id === t.categoryId);
              return (
                <div key={t.id} className="bg-white p-5 rounded-[2.2rem] border border-transparent shadow-sm flex items-center justify-between group active:bg-slate-50 active:scale-[0.99] transition-all border-slate-50/50">
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-inner group-hover:scale-110 transition-transform" style={{ backgroundColor: `${cat?.color}15`, color: cat?.color }}>
                      {cat?.icon || '📦'}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-[14px] uppercase tracking-tight">{cat?.name}</h4>
                      <div className="flex items-center gap-2.5 mt-1">
                         <p className="text-[9px] text-slate-400 font-bold uppercase">{new Date(t.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</p>
                         <div className="w-1 h-1 bg-indigo-200 rounded-full"></div>
                         <p className="text-[10px] text-indigo-500 font-black uppercase tracking-widest">Joint</p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-black text-[18px] tracking-tighter leading-none ${t.type === 'income' ? 'text-emerald-500' : 'text-slate-900'}`}>
                      {t.type === 'income' ? '+' : '-'}{t.amount.toLocaleString()}
                    </p>
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-1.5">{profile.currency}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Footer Info */}
      <div className="mx-1 p-6 bg-slate-900 rounded-[2.5rem] text-white/80 flex gap-5 items-center shadow-2xl relative overflow-hidden">
         <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-2xl -mr-12 -mt-12"></div>
         <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-amber-400 shadow-inner shrink-0 backdrop-blur-sm border border-white/5">
            <Info size={24} />
         </div>
         <p className="text-[11px] font-bold leading-relaxed tracking-tight">
            Синхронизируются только операции с пометкой <span className="text-indigo-400 font-black uppercase">"Общий"</span>. Ваши личные кошельки и балансы остаются полностью <strong>приватными</strong>.
         </p>
      </div>
    </div>
  );
};

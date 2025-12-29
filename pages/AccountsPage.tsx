
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { AppState, Account } from '../types';
import { 
  Plus, 
  CreditCard, 
  Banknote, 
  Trash2, 
  X, 
  ShieldCheck, 
  Check,
  Users2,
  Palette,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface AccountsPageProps {
  state: AppState;
  onUpdateState: (newState: Partial<AppState>) => void;
}

const WALLET_ICONS = [
  '💳', '💵', '💰', '🏦', '🪙', '💎', '📱', '🔋', '🎁', '🛒', 
  '🚲', '🍕', '🏠', '⚽', '🚗', '✈️', '🎮', '💡', '🛡️', '❤️',
  '🐶', '🐱', '☕', '🍷', '🎭', '🔥', '⭐️', '🌍', '🛠️', '🎒',
  '🍰', '🍿', '🎧', '🎤', '🎬'
];

const WALLET_COLORS = [
  '#6366f1', '#10b981', '#f43f5e', '#f59e0b', '#0ea5e9', 
  '#8b5cf6', '#ec4899', '#2dd4bf', '#a855f7', '#475569',
  '#fb923c', '#22c55e', '#ef4444', '#06b6d4', '#64748b'
];

export const AccountsPage: React.FC<AccountsPageProps> = ({ state, onUpdateState }) => {
  const location = useLocation();
  const [isAdding, setIsAdding] = useState(location.state?.openAdd === true);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const iconPickerRef = useRef<HTMLDivElement>(null);
  
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<'card' | 'cash'>('card');
  const [formBalance, setFormBalance] = useState<number>(0);
  const [formColor, setFormColor] = useState('#6366f1');
  const [formIcon, setFormIcon] = useState('💳');

  // Close icon picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (iconPickerRef.current && !iconPickerRef.current.contains(event.target as Node)) {
        setShowIconPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const accountBalances = useMemo(() => {
    const balances: Record<string, number> = {};
    state.accounts.forEach(a => { balances[a.id] = a.balance; });
    state.transactions.filter(t => !t.isPlanned).forEach(t => {
      if (!balances[t.accountId]) balances[t.accountId] = 0;
      if (t.type === 'income') balances[t.accountId] += t.amount;
      else balances[t.accountId] -= t.amount;
    });
    return balances;
  }, [state.accounts, state.transactions]);

  const totalBalance = useMemo(() => {
    return (Object.values(accountBalances) as number[]).reduce((a, b) => (a || 0) + (b || 0), 0);
  }, [accountBalances]);

  const resetForm = () => {
    setFormName('');
    setFormType('card');
    setFormBalance(0);
    setFormColor('#6366f1');
    setFormIcon('💳');
    setIsAdding(false);
    setEditingAccountId(null);
    setShowIconPicker(false);
  };

  const handleAdd = () => {
    if (!formName.trim()) return;
    const account: Account = { 
      id: Date.now().toString(),
      name: formName,
      type: formType,
      balance: formBalance,
      color: formColor,
      icon: formIcon
    };
    onUpdateState({ accounts: [...state.accounts, account] });
    resetForm();
  };

  const startEditing = (acc: Account) => {
    setEditingAccountId(acc.id);
    setFormName(acc.name);
    setFormType(acc.type);
    setFormIcon(acc.icon);
    setFormColor(acc.color);
    setIsAdding(false);
  };

  const handleSaveEdit = () => {
    if (!formName.trim()) return;
    const updatedAccounts = state.accounts.map(acc => 
      acc.id === editingAccountId 
        ? { ...acc, name: formName, type: formType, icon: formIcon, color: formColor } 
        : acc
    );
    onUpdateState({ accounts: updatedAccounts });
    resetForm();
  };

  const deleteAccount = (id: string) => {
    if (state.accounts.length <= 1) {
      alert("Нельзя удалить последний счет.");
      return;
    }
    if (confirm('Удалить счет? Транзакции останутся, но привязка будет потеряна.')) {
      onUpdateState({ accounts: state.accounts.filter(a => a.id !== id) });
      resetForm();
    }
  };

  const toggleIncludeDebts = () => {
    onUpdateState({
      profile: {
        ...state.profile,
        includeDebtsInCapital: !state.profile.includeDebtsInCapital
      }
    });
  };

  return (
    <div className="space-y-6 animate-slide-up pb-32 pt-[env(safe-area-inset-top,8px)]">
      <header className="px-2 pt-2 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-indigo-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">МОИ СРЕДСТВА</h1>
            <p className="text-slate-900 font-black text-2xl tracking-tighter">Кошельки</p>
          </div>
          <button 
            onClick={() => { 
              if (editingAccountId || isAdding) {
                resetForm();
              } else {
                setIsAdding(true);
              }
            }}
            className={`w-12 h-12 rounded-[1.25rem] flex items-center justify-center transition-all shadow-lg active:scale-90 ${
              isAdding || editingAccountId ? 'bg-slate-900 text-white' : 'bg-white border border-slate-100 text-slate-900 shadow-slate-200/50'
            }`}
          >
            {editingAccountId ? (
              <X size={24} strokeWidth={3} />
            ) : isAdding ? (
              <X size={24} strokeWidth={3} className="rotate-0 transition-transform duration-300" />
            ) : (
              <Plus size={24} strokeWidth={3} />
            )}
          </button>
        </div>

        {/* Global Setting: Include Debts */}
        <div className="px-1">
          <button 
            onClick={toggleIncludeDebts}
            className={`w-full p-4 rounded-3xl border flex items-center justify-between transition-all ${
              state.profile.includeDebtsInCapital 
                ? 'bg-indigo-50 border-indigo-200 text-indigo-900' 
                : 'bg-white border-slate-100 text-slate-500'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                state.profile.includeDebtsInCapital ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'
              }`}>
                <Users2 size={18} />
              </div>
              <div className="text-left">
                <p className="text-[11px] font-black uppercase tracking-tight">Учитывать долги и кредиты</p>
                <p className="text-[9px] font-bold opacity-60 uppercase tracking-widest">В общем капитале</p>
              </div>
            </div>
            <div className={`w-12 h-6 rounded-full relative transition-colors ${
              state.profile.includeDebtsInCapital ? 'bg-indigo-600' : 'bg-slate-200'
            }`}>
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                state.profile.includeDebtsInCapital ? 'left-7' : 'left-1'
              }`} />
            </div>
          </button>
        </div>
      </header>

      {!(isAdding || editingAccountId) ? (
        <div className="px-1 space-y-6">
          {/* Total Balance Card */}
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 p-6 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden ring-1 ring-white/10">
             <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16" />
             <div className="relative z-10">
               <p className="text-white/40 text-[9px] font-black uppercase tracking-widest mb-1">Суммарный остаток</p>
               <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black tracking-tighter">{(totalBalance || 0).toLocaleString()}</span>
                  <span className="text-sm font-bold opacity-30 uppercase tracking-widest">{state.profile.currency}</span>
               </div>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {state.accounts.map(acc => {
              const balance = accountBalances[acc.id] || 0;
              return (
                <div 
                  key={acc.id} 
                  onClick={() => startEditing(acc)}
                  className="relative h-36 rounded-[2rem] p-5 flex flex-col justify-between text-white overflow-hidden shadow-md active:scale-95 transition-all group border border-white/5"
                  style={{ background: `linear-gradient(135deg, ${acc.color} 0%, ${acc.color}cc 100%)` }}
                >
                  <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10 blur-xl" />
                  
                  <div className="flex justify-between items-start relative z-10">
                    <span className="text-2xl drop-shadow-md">{acc.icon}</span>
                    <div className="w-8 h-5 bg-white/20 rounded-lg flex flex-col justify-between p-1.5 backdrop-blur-sm">
                      <div className="h-[1.5px] w-full bg-white/30 rounded-full"></div>
                      <div className="h-[1.5px] w-full bg-white/30 rounded-full"></div>
                    </div>
                  </div>

                  <div className="relative z-10">
                    <p className="text-[9px] font-black uppercase tracking-tight opacity-70 truncate mb-1">{acc.name}</p>
                    <p className="text-lg font-black tracking-tighter leading-none">
                      {balance.toLocaleString()}
                    </p>
                    <p className="text-[8px] font-black uppercase opacity-40 mt-1">{state.profile.currency}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Форма с выпадающим списком иконок */
        <div className="px-1 animate-slide-up">
          <div className="bg-white p-7 rounded-[2.5rem] shadow-2xl border border-slate-100 space-y-7">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                 <div className="w-7 h-7 bg-slate-900 rounded-xl flex items-center justify-center text-white"><Check size={16} /></div>
                 <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">
                  {isAdding ? 'Новый кошелек' : 'Изменение'}
                 </h3>
              </div>
              <button onClick={resetForm} className="p-2 text-slate-300 hover:text-slate-900 transition-colors"><X size={20} /></button>
            </div>

            {/* Карточка-превью */}
            <div 
              className="w-full h-44 rounded-[2.5rem] p-7 flex flex-col justify-between text-white relative overflow-hidden shadow-xl transition-all duration-500 border border-white/10"
              style={{ 
                background: `linear-gradient(135deg, ${formColor} 0%, ${formColor}dd 100%)`,
                boxShadow: `0 20px 40px -10px ${formColor}50`
              }}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16"></div>
              <div className="flex justify-between items-start relative z-10">
                <div className="flex flex-col gap-0.5">
                  <span className="text-4xl drop-shadow-lg">{formIcon}</span>
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mt-1">Wallet Card</p>
                </div>
                <div className="w-11 h-7 bg-white/20 rounded-xl flex flex-col justify-between p-1.5 backdrop-blur-md">
                   <div className="h-[2px] w-full bg-white/30 rounded-full"></div>
                   <div className="h-[2px] w-full bg-white/30 rounded-full"></div>
                </div>
              </div>
              <div className="relative z-10">
                <p className="text-2xl font-black tracking-tighter leading-none">
                  {(isAdding ? formBalance : (accountBalances[editingAccountId!] || 0)).toLocaleString()}
                  <span className="text-xs font-bold opacity-40 ml-1.5">{state.profile.currency}</span>
                </p>
                <p className="text-[11px] font-black uppercase tracking-widest mt-2 truncate opacity-90">{formName || 'Название счета'}</p>
              </div>
            </div>

            <div className="space-y-6">
               <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Название и иконка</label>
                    <div className="flex gap-3">
                       {/* Выбор иконки (кнопка + поповер) */}
                       <div className="relative" ref={iconPickerRef}>
                         <button 
                          type="button"
                          onClick={() => setShowIconPicker(!showIconPicker)}
                          className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-3xl shadow-inner active:scale-95 transition-all relative"
                         >
                            {formIcon}
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white border border-slate-100 rounded-full flex items-center justify-center text-slate-400 shadow-sm">
                               {showIconPicker ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                            </div>
                         </button>

                         {showIconPicker && (
                           <div className="absolute left-0 bottom-full mb-3 z-[100] w-64 bg-white rounded-3xl shadow-2xl border border-slate-100 p-4 animate-slide-up origin-bottom-left">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Выберите иконку</p>
                              <div className="grid grid-cols-5 gap-2 max-h-48 overflow-y-auto no-scrollbar pb-2">
                                {WALLET_ICONS.map(icon => (
                                  <button 
                                    key={icon}
                                    onClick={() => {
                                      setFormIcon(icon);
                                      setShowIconPicker(false);
                                    }}
                                    className={`aspect-square flex items-center justify-center text-2xl rounded-xl transition-all ${formIcon === icon ? 'bg-indigo-50 shadow-inner scale-110 ring-2 ring-indigo-100' : 'hover:bg-slate-50'}`}
                                  >
                                    {icon}
                                  </button>
                                ))}
                              </div>
                           </div>
                         )}
                       </div>

                       <input 
                        type="text" 
                        placeholder="Название кошелька"
                        className="flex-grow bg-slate-50 p-4 rounded-2xl font-bold text-slate-900 outline-none border border-slate-100 focus:bg-white focus:ring-4 focus:ring-indigo-50/50 transition-all text-sm shadow-inner"
                        value={formName}
                        onChange={e => setFormName(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-50 rounded-2xl">
                    <button onClick={() => setFormType('card')} className={`py-3.5 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2 transition-all ${formType === 'card' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400'}`}>
                      <CreditCard size={15} /> Карта
                    </button>
                    <button onClick={() => setFormType('cash')} className={`py-3.5 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2 transition-all ${formType === 'cash' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400'}`}>
                      <Banknote size={15} /> Наличные
                    </button>
                  </div>
               </div>

               {isAdding && (
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Начальный баланс</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        inputMode="decimal"
                        className="w-full bg-slate-50 p-5 rounded-2xl font-black text-3xl outline-none shadow-inner text-slate-900"
                        value={formBalance || ''}
                        placeholder="0"
                        onChange={e => setFormBalance(parseFloat(e.target.value) || 0)}
                      />
                      <span className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 font-black text-xl">{state.profile.currency}</span>
                    </div>
                 </div>
               )}

               {/* Компактный выбор цвета */}
               <div className="space-y-2.5">
                  <div className="flex items-center gap-2 ml-1 text-slate-400">
                    <Palette size={14} />
                    <label className="text-[10px] font-black uppercase tracking-widest">Цвет оформления</label>
                  </div>
                  <div className="flex gap-3 overflow-x-auto no-scrollbar py-1">
                    {WALLET_COLORS.map(color => (
                      <button 
                        key={color}
                        onClick={() => setFormColor(color)}
                        className={`w-9 h-9 rounded-full shrink-0 border-[3.5px] transition-all ${formColor === color ? 'border-slate-900 scale-110 shadow-lg ring-2 ring-slate-100' : 'border-white ring-1 ring-slate-100'}`}
                        style={{ backgroundColor: color }}
                      >
                        {formColor === color && <Check size={16} className="text-white mx-auto" strokeWidth={4} />}
                      </button>
                    ))}
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
               {!isAdding && editingAccountId && (
                 <button 
                  onClick={() => deleteAccount(editingAccountId)}
                  className="h-16 bg-rose-50 text-rose-500 rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 border border-rose-100 active:scale-95 transition-all shadow-sm"
                 >
                   <Trash2 size={18} /> Удалить
                 </button>
               )}
               <button 
                onClick={isAdding ? handleAdd : handleSaveEdit}
                disabled={!formName.trim()}
                className={`h-16 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all disabled:opacity-20 ${!editingAccountId ? 'col-span-2' : ''}`}
               >
                 {isAdding ? 'Создать счет' : 'Сохранить'}
               </button>
            </div>
          </div>
        </div>
      )}

      {!(isAdding || editingAccountId) && (
        <div className="px-1 pt-2">
           <div className="bg-slate-50 border border-slate-100 rounded-[2.5rem] p-6 flex gap-4 items-center">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-500 shadow-sm shrink-0">
                 <ShieldCheck size={24} />
              </div>
              <p className="text-[12px] text-slate-500 font-bold leading-relaxed">
                Вы можете управлять видимостью долгов в общем капитале. Это поможет точнее видеть свободные средства.
              </p>
           </div>
        </div>
      )}
    </div>
  );
};

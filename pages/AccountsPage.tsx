
import React, { useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { AppState, Account } from '../types';
import { 
  Plus, 
  CreditCard, 
  Banknote, 
  Trash2, 
  X, 
  Edit2, 
  ShieldCheck, 
  Wallet, 
  Palette,
  LayoutGrid,
  Check,
  Zap
} from 'lucide-react';

interface AccountsPageProps {
  state: AppState;
  onUpdateState: (newState: Partial<AppState>) => void;
}

const WALLET_ICONS = ['💳', '💵', '💰', '🏦', '🪙', '💎', '📱', '🔋', '🎁', '🛒', '🚲', '🍕', '🏠', '⚽'];
const WALLET_COLORS = ['#6366f1', '#10b981', '#f43f5e', '#f59e0b', '#0ea5e9', '#8b5cf6', '#ec4899', '#475569', '#334155'];

export const AccountsPage: React.FC<AccountsPageProps> = ({ state, onUpdateState }) => {
  const location = useLocation();
  const [isAdding, setIsAdding] = useState(location.state?.openAdd === true);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  
  // States for the form
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<'card' | 'cash'>('card');
  const [formBalance, setFormBalance] = useState<number>(0);
  const [formColor, setFormColor] = useState('#6366f1');
  const [formIcon, setFormIcon] = useState('💳');

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
    return (Object.values(accountBalances) as number[]).reduce((a, b) => a + b, 0);
  }, [accountBalances]);

  const resetForm = () => {
    setFormName('');
    setFormType('card');
    setFormBalance(0);
    setFormColor('#6366f1');
    setFormIcon('💳');
    setIsAdding(false);
    setEditingAccountId(null);
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
    if (state.accounts.length <= 1) return alert("Должен остаться хотя бы один счет");
    if (confirm('Удалить счет? История транзакций сохранится, но привязка к счету будет утеряна.')) {
      onUpdateState({ accounts: state.accounts.filter(a => a.id !== id) });
    }
  };

  return (
    <div className="space-y-6 animate-slide-up pb-32 pt-[env(safe-area-inset-top,8px)]">
      <header className="flex justify-between items-center px-2 pt-2">
        <div>
          <h1 className="text-indigo-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">ФИНАНСОВЫЕ СЧЕТА</h1>
          <p className="text-slate-900 font-black text-xl">Мои кошельки</p>
        </div>
        <button 
          onClick={() => { isAdding ? resetForm() : (setIsAdding(true), setEditingAccountId(null)) }}
          className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all shadow-md active:scale-90 ${
            isAdding || editingAccountId ? 'bg-slate-900 text-white rotate-45' : 'bg-white border border-slate-100 text-slate-900'
          }`}
        >
          <Plus size={22} strokeWidth={2.5} />
        </button>
      </header>

      {/* Summary Total Card */}
      {!isAdding && !editingAccountId && (
        <div className="mx-1 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[2.5rem] p-6 text-white shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-white/20 transition-colors"></div>
          <div className="relative z-10 flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-indigo-100/60 text-[10px] font-bold uppercase tracking-widest">Общий остаток</p>
              <h2 className="text-3xl font-black flex items-baseline gap-2 tracking-tight">
                {totalBalance.toLocaleString()}
                <span className="text-lg font-medium opacity-60">{state.profile.currency}</span>
              </h2>
            </div>
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/10">
              <Wallet size={24} className="text-indigo-100" />
            </div>
          </div>
        </div>
      )}

      {/* Reworked Add / Edit Form Area */}
      {(isAdding || editingAccountId) && (
        <div className="mx-1 bg-white p-5 rounded-[2.5rem] shadow-2xl space-y-6 animate-slide-up border border-slate-100 relative overflow-hidden">
          {/* Progress Indicator Bar */}
          <div className="absolute top-0 left-0 w-full h-1.5 flex gap-0.5">
             <div className="h-full flex-grow transition-all duration-500" style={{ backgroundColor: formName ? formColor : '#e2e8f0' }}></div>
             <div className="h-full flex-grow transition-all duration-500" style={{ backgroundColor: formBalance > 0 || editingAccountId ? formColor : '#e2e8f0' }}></div>
             <div className="h-full flex-grow transition-all duration-500" style={{ backgroundColor: formColor }}></div>
          </div>
          
          <div className="flex justify-between items-center pt-2">
            <div className="flex items-center gap-2">
               <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-indigo-50 text-indigo-500">
                  <Zap size={14} />
               </div>
               <h3 className="font-black text-slate-800 uppercase text-[10px] tracking-widest">
                {isAdding ? 'Новый кошелек' : 'Редактирование'}
               </h3>
            </div>
            <button onClick={resetForm} className="text-slate-300 p-2 hover:text-slate-500 active:scale-75 transition-all"><X size={20} /></button>
          </div>

          {/* Premium Card Preview */}
          <div 
            className="w-full h-40 rounded-[2rem] p-6 flex flex-col justify-between text-white relative overflow-hidden transition-all duration-500 shadow-2xl ring-1 ring-white/20"
            style={{ 
              background: `linear-gradient(135deg, ${formColor} 0%, ${formColor}dd 100%)`,
              boxShadow: `0 20px 40px -15px ${formColor}50`
            }}
          >
            {/* Visual Decor Elements */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/5 rounded-full blur-2xl -ml-16 -mb-16"></div>
            
            <div className="flex justify-between items-start relative z-10">
              <div className="flex flex-col gap-1">
                <span className="text-2xl drop-shadow-md">{formIcon}</span>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">FinFlow Original</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-black uppercase tracking-widest opacity-50 mb-0.5">{formType === 'card' ? 'DIGITAL ASSET' : 'LIQUID ASSET'}</p>
                <p className="text-[15px] font-extrabold truncate max-w-[140px] tracking-tight">{formName || 'Назовите счет'}</p>
              </div>
            </div>

            <div className="flex justify-between items-end relative z-10">
               <div>
                  <p className="text-[22px] font-black tracking-tighter flex items-baseline gap-1.5">
                    {(isAdding ? formBalance : (accountBalances[editingAccountId!] || 0)).toLocaleString()}
                    <span className="text-sm font-medium opacity-60">{state.profile.currency}</span>
                  </p>
               </div>
               {/* Simulating a card chip visual */}
               {formType === 'card' && (
                 <div className="w-10 h-8 bg-gradient-to-br from-amber-200 to-amber-500 rounded-lg opacity-80 flex flex-col justify-between p-1.5">
                    <div className="h-px w-full bg-amber-900/10"></div>
                    <div className="h-px w-full bg-amber-900/10"></div>
                    <div className="h-px w-full bg-amber-900/10"></div>
                 </div>
               )}
            </div>
          </div>
          
          <div className="space-y-5">
            {/* Input Name */}
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                <Edit2 size={10} /> Основная информация
              </label>
              <input 
                type="text" 
                placeholder="Напр. Сбербанк, Наличка..."
                className="w-full bg-slate-50 p-4 rounded-2xl font-bold outline-none border border-transparent focus:bg-white focus:ring-4 focus:ring-indigo-50 transition-all text-[15px] shadow-inner placeholder:text-slate-300"
                value={formName}
                onChange={e => setFormName(e.target.value)}
              />
            </div>

            {/* Type Selector */}
            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1.5 rounded-[1.25rem]">
               <button 
                onClick={() => setFormType('card')}
                className={`py-3.5 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2 transition-all ${
                  formType === 'card'
                  ? 'bg-white text-slate-900 shadow-md' 
                  : 'text-slate-400 hover:text-slate-600'
                }`}
               >
                 <CreditCard size={14} /> Карта
               </button>
               <button 
                onClick={() => setFormType('cash')}
                className={`py-3.5 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2 transition-all ${
                  formType === 'cash'
                  ? 'bg-white text-slate-900 shadow-md' 
                  : 'text-slate-400 hover:text-slate-600'
                }`}
               >
                 <Banknote size={14} /> Наличные
               </button>
            </div>

            {/* Initial Balance (Add only) */}
            {isAdding && (
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Стартовый капитал</label>
                <div className="relative group">
                  <input 
                    type="number" 
                    inputMode="decimal"
                    placeholder="0"
                    className="w-full bg-slate-50 p-4 rounded-2xl font-black text-2xl outline-none border border-transparent focus:bg-white focus:ring-4 focus:ring-indigo-50 transition-all shadow-inner"
                    value={formBalance || ''}
                    onChange={e => setFormBalance(parseFloat(e.target.value) || 0)}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 px-3 py-1 bg-slate-200/50 rounded-lg font-black text-slate-400 text-xs">
                    {state.profile.currency}
                  </div>
                </div>
              </div>
            )}

            {/* Icon Selection */}
            <div className="space-y-3">
               <div className="flex items-center gap-2 ml-1">
                  <LayoutGrid size={12} className="text-slate-400" />
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Выберите символ</label>
               </div>
               <div className="flex gap-2 overflow-x-auto no-scrollbar py-2 px-1">
                  {WALLET_ICONS.map(icon => (
                    <button 
                      key={icon}
                      onClick={() => setFormIcon(icon)}
                      className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-all border-2 ${
                        formIcon === icon ? 'bg-white border-slate-900 shadow-lg scale-110 z-10' : 'bg-slate-50 border-transparent hover:bg-slate-100'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
               </div>
            </div>

            {/* Color Selection */}
            <div className="space-y-3">
               <div className="flex items-center gap-2 ml-1">
                  <Palette size={12} className="text-slate-400" />
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Цвет оформления</label>
               </div>
               <div className="flex gap-3 overflow-x-auto no-scrollbar py-2 px-1">
                  {WALLET_COLORS.map(color => (
                    <button 
                      key={color}
                      onClick={() => setFormColor(color)}
                      className={`flex-shrink-0 w-10 h-10 rounded-full transition-all border-[3px] flex items-center justify-center ${
                        formColor === color ? 'border-slate-900 scale-110 shadow-lg ring-4 ring-slate-100' : 'border-white shadow-sm hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                    >
                       {formColor === color && <Check size={14} className="text-white drop-shadow-md" strokeWidth={4} />}
                    </button>
                  ))}
               </div>
            </div>
          </div>
          
          <button 
            onClick={isAdding ? handleAdd : handleSaveEdit} 
            disabled={!formName.trim()}
            className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase tracking-[0.25em] text-[12px] shadow-2xl active:scale-95 transition-all mt-4 disabled:opacity-20 disabled:grayscale"
          >
            {isAdding ? 'Подтвердить создание' : 'Обновить кошелек'}
          </button>
        </div>
      )}

      {/* Account List Display */}
      {!isAdding && !editingAccountId && (
        <div className="grid gap-3 px-1">
          {state.accounts.map(acc => {
            const balance = accountBalances[acc.id] || 0;
            return (
              <div 
                key={acc.id} 
                className="bg-white p-4 rounded-[2.2rem] border border-slate-50 flex items-center justify-between shadow-sm hover:shadow-md transition-all active:scale-[0.98] group relative overflow-hidden"
                onClick={() => startEditing(acc)}
              >
                <div className="absolute top-0 left-0 w-1.5 h-full opacity-60" style={{ backgroundColor: acc.color }}></div>
                <div className="flex items-center gap-4">
                  <div 
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-inner group-hover:rotate-6 transition-transform"
                    style={{ backgroundColor: `${acc.color}15`, color: acc.color }}
                  >
                    {acc.icon}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-[13px] tracking-tight uppercase leading-none mb-1.5">{acc.name}</h4>
                    <div className="flex items-center gap-1.5 opacity-40">
                      {acc.type === 'card' ? <CreditCard size={10} /> : <Banknote size={10} />}
                      <span className="text-[8px] font-black uppercase tracking-widest">{acc.type === 'card' ? 'Банк' : 'Наличные'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-black text-[16px] text-slate-900 tracking-tight leading-none mb-1">
                      {balance.toLocaleString()}
                    </p>
                    <p className="text-[10px] font-bold text-slate-300 uppercase leading-none">{state.profile.currency}</p>
                  </div>
                  
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    <button 
                      onClick={() => startEditing(acc)}
                      className="p-2.5 rounded-xl bg-slate-50 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 transition-all active:scale-90"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      onClick={() => deleteAccount(acc.id)} 
                      className="p-2.5 rounded-xl bg-slate-50 text-slate-200 hover:text-rose-500 hover:bg-rose-50 transition-all active:scale-90"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Security Info Card */}
      {!isAdding && !editingAccountId && (
        <div className="px-1 pt-4 pb-12">
          <div className="bg-slate-900/[0.03] border border-slate-200/50 rounded-[2.5rem] p-6 flex gap-4 items-start">
             <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-500 shadow-sm shrink-0">
                <ShieldCheck size={20} />
             </div>
             <p className="text-[11px] text-slate-500 font-bold leading-relaxed">
                <span className="text-slate-800">Конфиденциальность:</span> ваши данные хранятся локально. Мы не имеем доступа к вашим балансам и транзакциям. Безопасность — наш приоритет.
             </p>
          </div>
        </div>
      )}
    </div>
  );
};

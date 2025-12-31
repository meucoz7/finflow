
import React, { useState, useEffect, useMemo } from 'react';
import { AppState } from '../types';
import { CURRENCIES } from '../constants';
import { 
  Save, 
  Download, 
  ShieldCheck, 
  AlertTriangle, 
  RotateCcw, 
  Wallet, 
  Info,
  ChevronRight,
  User,
  Settings2,
  Database,
  Check,
  CreditCard,
  RefreshCw,
  LogOut,
  Trash2,
  X,
  Lock,
  Terminal,
  ServerCrash
} from 'lucide-react';

interface ProfileProps {
  state: AppState;
  isAdmin?: boolean;
  onUpdateState: (newState: Partial<AppState>) => void;
}

type MenuTab = 'personal' | 'balance' | 'system' | 'admin';

export const Profile: React.FC<ProfileProps> = ({ state, isAdmin, onUpdateState }) => {
  const [activeTab, setActiveTab] = useState<MenuTab>('balance');
  const [editName, setEditName] = useState(state.profile.name);
  const [accountBalances, setAccountBalances] = useState<Record<string, string>>({});
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    const balances: Record<string, string> = {};
    state.accounts.forEach(acc => {
      balances[acc.id] = acc.balance.toString();
    });
    setAccountBalances(balances);
  }, [state.accounts]);

  const saveProfile = () => {
    onUpdateState({ profile: { ...state.profile, name: editName } });
    alert('Профиль обновлен! ✨');
  };

  const updateAccountBalance = (id: string, value: string) => {
    setAccountBalances(prev => ({ ...prev, [id]: value }));
  };

  const saveBalances = () => {
    const updatedAccounts = state.accounts.map(acc => ({
      ...acc,
      balance: parseFloat(accountBalances[acc.id] || '0') || 0
    }));
    onUpdateState({ accounts: updatedAccounts });
    alert('Балансы синхронизированы! 💰');
  };

  const totalNewBalance = useMemo(() => {
    return (Object.values(accountBalances) as string[]).reduce((sum: number, val: string) => sum + (parseFloat(val) || 0), 0);
  }, [accountBalances]);

  const exportData = () => {
    try {
      const dataStr = JSON.stringify(state, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const exportFileDefaultName = `finflow_backup_${new Date().toISOString().split('T')[0]}.json`;

      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } catch (error) {
      console.error("Export failed:", error);
      alert("Не удалось экспортировать данные.");
    }
  };

  const confirmReset = () => {
    onUpdateState({
      transactions: [],
      debts: [],
      savings: [],
      accounts: state.accounts.map(a => ({ ...a, balance: 0 })),
    });
    setShowResetConfirm(false);
    alert('Данные очищены. 🌱');
  };

  return (
    <div className="space-y-5 animate-slide-up pb-36 pt-[env(safe-area-inset-top,8px)]">
      <header className="px-2 pt-2">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white text-lg font-bold shadow-lg shrink-0 ${isAdmin ? 'bg-amber-500' : 'bg-slate-900'}`}>
              {state.profile.name.charAt(0)}
            </div>
            <div>
              <p className="text-slate-900 font-bold text-lg leading-tight flex items-center gap-1.5">
                {state.profile.name}
                {isAdmin && <ShieldCheck size={16} className="text-amber-500" />}
              </p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                {isAdmin ? 'Administrator Mode' : 'FinFlow Premium'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
             <button className="w-9 h-9 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 active:scale-90 transition-all">
                <Settings2 size={16} />
             </button>
          </div>
        </div>

        <div className="bg-slate-200/40 p-1 rounded-2xl flex gap-1 backdrop-blur-sm border border-slate-100 overflow-x-auto no-scrollbar">
          {[
            { id: 'personal', icon: <User size={14} />, label: 'Личное' },
            { id: 'balance', icon: <Wallet size={14} />, label: 'Баланс' },
            { id: 'system', icon: <Database size={14} />, label: 'Система' },
            ...(isAdmin ? [{ id: 'admin', icon: <Lock size={14} />, label: 'Админ' }] : [])
          ].map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as MenuTab)}
              className={`flex-1 min-w-[80px] py-2.5 rounded-xl font-bold text-[11px] uppercase tracking-wide transition-all flex items-center justify-center gap-2 ${
                activeTab === tab.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </header>

      <main className="px-1 min-h-[400px]">
        {activeTab === 'personal' && (
          <div className="space-y-4 animate-slide-up">
            <section className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Отображаемое имя</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    className="flex-grow bg-slate-50 p-4 rounded-xl font-bold text-slate-900 outline-none border border-transparent focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all text-[14px]"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                  />
                  <button 
                    onClick={saveProfile}
                    className="bg-indigo-600 text-white w-12 rounded-xl flex items-center justify-center shadow-lg active:scale-90 transition-all"
                  >
                    <Check size={20} />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Основная валюта</label>
                <div className="grid grid-cols-4 gap-2">
                  {CURRENCIES.map(curr => (
                    <button
                      key={curr.code}
                      onClick={() => onUpdateState({ profile: { ...state.profile, currency: curr.symbol } })}
                      className={`py-3 rounded-xl font-bold text-[11px] transition-all border ${
                        state.profile.currency === curr.symbol 
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' 
                        : 'bg-white border-slate-100 text-slate-500'
                      }`}
                    >
                      {curr.code}
                    </button>
                  ))}
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'balance' && (
          <div className="space-y-4 animate-slide-up">
            <section className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-6">
                <div className="flex flex-col">
                  <h3 className="font-bold text-slate-800 text-[11px] uppercase tracking-widest flex items-center gap-2">
                    <CreditCard size={14} className="text-indigo-500" /> Кошельки
                  </h3>
                </div>
                <div className="bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">
                   <p className="text-[11px] font-bold text-indigo-600 tracking-tight">
                    {totalNewBalance.toLocaleString()} {state.profile.currency}
                   </p>
                </div>
              </div>
              
              <div className="space-y-3 mb-6">
                {state.accounts.map(acc => (
                  <div key={acc.id} className="group flex items-center justify-between bg-slate-50/50 p-3 rounded-2xl border border-slate-100 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-50 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-xl shadow-sm border border-slate-50 group-hover:scale-105 transition-transform">
                        {acc.icon}
                      </div>
                      <div className="flex flex-col">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{acc.name}</p>
                        <p className="text-[11px] text-slate-900 font-bold">{parseFloat(accountBalances[acc.id] || '0').toLocaleString()} <span className="text-[9px] opacity-40">{state.profile.currency}</span></p>
                      </div>
                    </div>
                    
                    <div className="relative">
                      <input 
                        type="number"
                        inputMode="decimal"
                        value={accountBalances[acc.id] || ''}
                        onChange={(e) => updateAccountBalance(acc.id, e.target.value)}
                        className="w-20 bg-white p-2 rounded-lg font-bold text-[13px] text-slate-900 outline-none text-right border border-slate-100 shadow-inner"
                        placeholder="0"
                      />
                    </div>
                  </div>
                ))}
              </div>
              
              <button 
                onClick={saveBalances}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-[13px] uppercase tracking-widest shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
              >
                <RefreshCw size={16} className="group-active:rotate-180 transition-transform" /> 
                Применить баланс
              </button>
            </section>
          </div>
        )}

        {activeTab === 'system' && (
          <div className="space-y-4 animate-slide-up">
            <section className="bg-white rounded-[2rem] overflow-hidden shadow-sm border border-slate-100">
              <div className="p-5 border-b border-slate-50">
                <h3 className="font-bold text-slate-800 text-[11px] uppercase tracking-widest">Данные и экспорт</h3>
              </div>
              
              <div className="divide-y divide-slate-50">
                <button 
                  onClick={exportData}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                      <Download size={18} />
                    </div>
                    <span className="text-[13px] font-bold text-slate-700">Резервная копия</span>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
                </button>

                <button 
                  onClick={() => setShowResetConfirm(true)}
                  className="w-full flex items-center justify-between p-4 hover:bg-rose-50 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
                      <RotateCcw size={18} />
                    </div>
                    <span className="text-[13px] font-bold text-rose-600">Очистить историю</span>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'admin' && isAdmin && (
          <div className="space-y-4 animate-slide-up">
            <section className="bg-slate-900 rounded-[2rem] p-6 text-white shadow-2xl space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-slate-900">
                   <Terminal size={22} />
                </div>
                <div>
                  <h3 className="font-black text-sm uppercase tracking-widest">Admin Panel</h3>
                  <p className="text-[10px] text-slate-400 font-bold">DEVELOPER TOOLS ENABLED</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                 <button className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10 active:bg-white/10 transition-colors text-left">
                    <div className="flex items-center gap-3">
                      <Database size={18} className="text-indigo-400" />
                      <span className="text-[12px] font-bold">Сбросить серверный кэш</span>
                    </div>
                    <ChevronRight size={14} className="opacity-40" />
                 </button>

                 <button className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10 active:bg-white/10 transition-colors text-left">
                    <div className="flex items-center gap-3">
                      <ServerCrash size={18} className="text-rose-400" />
                      <span className="text-[12px] font-bold">Тест 500 ошибки</span>
                    </div>
                    <ChevronRight size={14} className="opacity-40" />
                 </button>

                 <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                    <p className="text-[10px] font-black text-slate-500 uppercase mb-2">System Diagnostics</p>
                    <div className="space-y-1 text-[11px] font-mono text-indigo-300">
                       <p>STATE_SIZE: {JSON.stringify(state).length} bytes</p>
                       <p>PLATFORM: {(window as any).Telegram?.WebApp?.platform || 'web'}</p>
                       <p>VER: 2.4.0</p>
                    </div>
                 </div>
              </div>
            </section>
          </div>
        )}
      </main>

      {showResetConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setShowResetConfirm(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-[2.5rem] p-8 shadow-2xl animate-slide-up flex flex-col items-center text-center space-y-6">
            <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-[2rem] flex items-center justify-center shadow-inner">
              <AlertTriangle size={40} strokeWidth={2.5} />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">Стереть данные?</h3>
              <p className="text-[13px] text-slate-500 font-bold leading-relaxed">
                Это действие <span className="text-rose-500 uppercase">нельзя отменить</span>. Все транзакции, долги и цели будут удалены навсегда.
              </p>
            </div>

            <div className="flex flex-col gap-3 w-full">
              <button 
                onClick={confirmReset}
                className="w-full bg-rose-500 text-white py-4 rounded-2xl font-black uppercase text-[12px] tracking-widest shadow-lg shadow-rose-200 active:scale-95 transition-all"
              >
                Подтвердить
              </button>
              <button 
                onClick={() => setShowResetConfirm(false)}
                className="w-full bg-slate-100 text-slate-500 py-4 rounded-2xl font-black uppercase text-[12px] tracking-widest active:scale-95 transition-all"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

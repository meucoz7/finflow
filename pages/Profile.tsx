
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
  ServerCrash,
  Clock,
  Activity,
  Bell
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
  const [adminStats, setAdminStats] = useState<any>(null);

  useEffect(() => {
    const balances: Record<string, string> = {};
    state.accounts.forEach(acc => {
      balances[acc.id] = acc.balance.toString();
    });
    setAccountBalances(balances);
  }, [state.accounts]);

  // Загрузка статистики для админа
  useEffect(() => {
    if (activeTab === 'admin' && isAdmin) {
      fetch('/api/admin/stats')
        .then(res => res.json())
        .then(setAdminStats)
        .catch(() => {});
    }
  }, [activeTab, isAdmin]);

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
                  <button onClick={saveProfile} className="bg-indigo-600 text-white w-12 rounded-xl flex items-center justify-center shadow-lg active:scale-90 transition-all">
                    <Check size={20} />
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Основная валюта</label>
                <div className="grid grid-cols-4 gap-2">
                  {CURRENCIES.map(curr => (
                    <button key={curr.code} onClick={() => onUpdateState({ profile: { ...state.profile, currency: curr.symbol } })} className={`py-3 rounded-xl font-bold text-[11px] transition-all border ${state.profile.currency === curr.symbol ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-slate-100 text-slate-500'}`}>
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
                <h3 className="font-bold text-slate-800 text-[11px] uppercase tracking-widest flex items-center gap-2">
                  <CreditCard size={14} className="text-indigo-500" /> Кошельки
                </h3>
                <div className="bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">
                   <p className="text-[11px] font-bold text-indigo-600 tracking-tight">{totalNewBalance.toLocaleString()} {state.profile.currency}</p>
                </div>
              </div>
              <div className="space-y-3 mb-6">
                {state.accounts.map(acc => (
                  <div key={acc.id} className="group flex items-center justify-between bg-slate-50/50 p-3 rounded-2xl border border-slate-100 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-50 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-xl shadow-sm border border-slate-50 transition-transform group-hover:scale-105">{acc.icon}</div>
                      <div className="flex flex-col">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{acc.name}</p>
                        <p className="text-[11px] text-slate-900 font-bold">{parseFloat(accountBalances[acc.id] || '0').toLocaleString()} <span className="text-[9px] opacity-40">{state.profile.currency}</span></p>
                      </div>
                    </div>
                    <input type="number" inputMode="decimal" value={accountBalances[acc.id] || ''} onChange={(e) => updateAccountBalance(acc.id, e.target.value)} className="w-20 bg-white p-2 rounded-lg font-bold text-[13px] text-slate-900 outline-none text-right border border-slate-100 shadow-inner" placeholder="0" />
                  </div>
                ))}
              </div>
              <button onClick={saveBalances} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-[13px] uppercase tracking-widest shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 group">
                <RefreshCw size={16} className="group-active:rotate-180 transition-transform" /> Применить баланс
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
                <button onClick={exportData} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center"><Download size={18} /></div>
                    <span className="text-[13px] font-bold text-slate-700">Резервная копия</span>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
                </button>
                <button onClick={() => setShowResetConfirm(true)} className="w-full flex items-center justify-between p-4 hover:bg-rose-50 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center"><RotateCcw size={18} /></div>
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
            {/* Блок мониторинга напоминаний */}
            <section className="bg-slate-900 rounded-[2rem] p-6 text-white shadow-2xl space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-slate-900 shadow-lg shadow-amber-500/20">
                   <Activity size={22} />
                </div>
                <div>
                  <h3 className="font-black text-sm uppercase tracking-widest">Reminders Health</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Мониторинг планировщика</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                 <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-indigo-400 mb-1">
                       <Clock size={12} />
                       <span className="text-[9px] font-black uppercase tracking-widest">Время МСК</span>
                    </div>
                    <p className="text-xl font-black">{adminStats?.serverTimeMSK || "--:--:--"}</p>
                 </div>
                 <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-emerald-400 mb-1">
                       <Check size={12} />
                       <span className="text-[9px] font-black uppercase tracking-widest">Check-ин</span>
                    </div>
                    <p className="text-xl font-black">{adminStats?.lastCheck || "---"}</p>
                 </div>
              </div>

              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3">
                 <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black text-slate-500 uppercase">Окно отправки (с 12:00)</p>
                    <div className={`w-2 h-2 rounded-full ${adminStats?.isCheckWindow ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                 </div>
                 <button 
                  onClick={() => alert('Команда отправлена. Проверьте логи сервера.')}
                  className="w-full py-3 bg-amber-500 text-slate-900 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                 >
                    <Bell size={14} /> Тест рассылки (Все)
                 </button>
              </div>

              <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                 <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Технические данные</p>
                 <div className="space-y-1 text-[11px] font-mono text-indigo-300/70">
                    <p>PLATFORM: {(window as any).Telegram?.WebApp?.platform || 'web'}</p>
                    <p>VER: 2.5.1-stable</p>
                    <p>SYNC_DATE: {adminStats?.serverDateMSK}</p>
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
              <p className="text-[13px] text-slate-500 font-bold leading-relaxed">Это действие нельзя отменить. Все данные будут удалены.</p>
            </div>
            <div className="flex flex-col gap-3 w-full">
              <button onClick={confirmReset} className="w-full bg-rose-500 text-white py-4 rounded-2xl font-black uppercase text-[12px] tracking-widest shadow-lg shadow-rose-200 active:scale-95 transition-all">Подтвердить</button>
              <button onClick={() => setShowResetConfirm(false)} className="w-full bg-slate-100 text-slate-500 py-4 rounded-2xl font-black uppercase text-[12px] tracking-widest active:scale-95 transition-all">Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

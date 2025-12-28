
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HashRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { CalendarPage } from './pages/CalendarPage';
import { Categories } from './pages/Categories';
import { Debts } from './pages/Debts';
import { Profile } from './pages/Profile';
import { Savings } from './pages/Savings';
import { AccountsPage } from './pages/AccountsPage';
import { JointBudget } from './pages/JointBudget';
import { AIChatPage } from './pages/AIChatPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { TransactionModal } from './components/TransactionModal';
import { AppState, Transaction } from './types';
import { DEFAULT_CATEGORIES, DEFAULT_ACCOUNTS } from './constants';
import { Loader2, CloudOff } from 'lucide-react';

const MOCK_STATE: AppState = {
  transactions: [],
  categories: DEFAULT_CATEGORIES,
  accounts: DEFAULT_ACCOUNTS,
  debts: [],
  savings: [],
  profile: { name: 'Гость', currency: '₽' }
};

// Нативная навигация Telegram BackButton
const TelegramNavigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const tg = (window as any).Telegram?.WebApp;

  useEffect(() => {
    if (!tg?.BackButton) return;

    if (location.pathname === '/') {
      tg.BackButton.hide();
    } else {
      tg.BackButton.show();
    }

    const handleBack = () => navigate(-1);
    tg.BackButton.onClick(handleBack);

    return () => {
      tg.BackButton.offClick(handleBack);
    };
  }, [location.pathname, navigate, tg]);

  return null;
};

// Скелетон загрузки (копия структуры Дашборда)
const SkeletonLoader = () => (
  <div className="flex flex-col min-h-screen bg-[#f8fafc] safe-top p-6 space-y-8 animate-pulse">
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-slate-200 rounded-2xl" />
        <div className="space-y-2">
          <div className="w-16 h-2.5 bg-slate-200 rounded" />
          <div className="w-28 h-4 bg-slate-200 rounded" />
        </div>
      </div>
      <div className="flex gap-2">
        <div className="w-10 h-10 bg-slate-200 rounded-xl" />
        <div className="w-10 h-10 bg-slate-200 rounded-xl" />
      </div>
    </div>
    <div className="grid grid-cols-2 gap-4 h-40">
      <div className="bg-slate-200 rounded-[2.5rem]" />
      <div className="bg-slate-200 rounded-[2.5rem]" />
    </div>
    <div className="space-y-6">
      <div className="w-40 h-4 bg-slate-200 rounded" />
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 bg-white rounded-[2rem] border border-slate-100" />
        ))}
      </div>
    </div>
  </div>
);

const AppContent: React.FC = () => {
  const [state, setState] = useState<AppState>(MOCK_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error' | 'local'>('local');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const tg = (window as any).Telegram?.WebApp;
  const userId = tg?.initDataUnsafe?.user?.id;
  const hasLoadedData = useRef(false);

  // Функция загрузки данных с бэкенда
  const loadData = useCallback(async (uid: number) => {
    setSyncStatus('syncing');
    try {
      const res = await fetch(`/api/user-state/${uid}`);
      if (res.ok) {
        const data = await res.json();
        if (data.state) {
          setState(prev => ({
            ...prev,
            ...data.state,
            categories: data.state.categories?.length ? data.state.categories : DEFAULT_CATEGORIES,
            accounts: data.state.accounts?.length ? data.state.accounts : DEFAULT_ACCOUNTS,
            profile: {
              ...prev.profile,
              ...data.state.profile,
              name: data.state.profile?.name || tg?.initDataUnsafe?.user?.first_name || 'Пользователь'
            }
          }));
        }
        setSyncStatus('synced');
      } else {
        setSyncStatus('error');
      }
    } catch (err) {
      setSyncStatus('error');
    } finally {
      setIsLoading(false);
    }
  }, [tg]);

  // Инициализация при входе
  useEffect(() => {
    if (tg) {
      tg.ready();
      // Разворачиваем только на телефонах, чтобы не ломать вид на ПК
      if (['android', 'ios'].includes(tg.platform)) {
        tg.expand();
      }
      tg.setHeaderColor('#f8fafc');
    }

    // Если ID есть сразу - грузим, если нет - ждем 1 сек и отключаем лоадер (запуск вне TG)
    if (userId) {
      loadData(userId);
      hasLoadedData.current = true;
    } else {
      const timer = setTimeout(() => {
        if (!hasLoadedData.current) setIsLoading(false);
      }, 1000);
      return () => clearTimeout(timer);
    }

    const handleOnline = () => userId && loadData(userId);
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [userId, tg, loadData]);

  // Автосохранение
  useEffect(() => {
    if (!userId || syncStatus === 'local' || isLoading) return;

    const saveData = async () => {
      setSyncStatus('syncing');
      try {
        const res = await fetch(`/api/user-state/${userId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(state)
        });
        if (res.ok) setSyncStatus('synced');
        else setSyncStatus('error');
      } catch (err) {
        setSyncStatus('error');
      }
    };

    const timer = setTimeout(saveData, 2000);
    return () => clearTimeout(timer);
  }, [state, userId, isLoading, syncStatus]);

  const handleUpdateState = (newState: Partial<AppState>) => {
    setState(prev => ({ ...prev, ...newState }));
  };

  const handleSaveTransaction = (newTx: Omit<Transaction, 'id'>) => {
    if (editingTransaction) {
      const updated = state.transactions.map(t => t.id === editingTransaction.id ? { ...newTx, id: t.id } : t);
      handleUpdateState({ transactions: updated });
    } else {
      const transaction: Transaction = { ...newTx, id: `tx_${Date.now()}` };
      handleUpdateState({ transactions: [...state.transactions, transaction] });
    }
  };

  const handleDeleteTransaction = (id: string) => {
    handleUpdateState({ transactions: state.transactions.filter(t => t.id !== id) });
  };

  if (isLoading) {
    return <SkeletonLoader />;
  }

  return (
    <div className="app-container">
      <Layout onAddClick={() => { setEditingTransaction(null); setIsModalOpen(true); }}>
        <TelegramNavigation />
        
        {/* Индикатор синхронизации */}
        <div className="fixed top-4 right-4 z-[2000] pointer-events-none opacity-30">
          {syncStatus === 'syncing' && <Loader2 size={12} className="animate-spin text-indigo-500" />}
          {syncStatus === 'error' && <CloudOff size={12} className="text-rose-500" />}
        </div>

        <Routes>
          <Route path="/" element={<Dashboard state={state} onEditTransaction={(tx) => { setEditingTransaction(tx); setIsModalOpen(true); }} onDeleteTransaction={handleDeleteTransaction} />} />
          <Route path="/accounts" element={<AccountsPage state={state} onUpdateState={handleUpdateState} />} />
          <Route path="/joint" element={<JointBudget state={state} onUpdateState={handleUpdateState} />} />
          <Route path="/calendar" element={<CalendarPage state={state} onUpdateState={handleUpdateState} />} />
          <Route path="/categories" element={<Categories state={state} onUpdateState={handleUpdateState} />} />
          <Route path="/debts" element={<Debts state={state} onUpdateState={handleUpdateState} />} />
          <Route path="/savings" element={<Savings state={state} onUpdateState={handleUpdateState} />} />
          <Route path="/profile" element={<Profile state={state} onUpdateState={handleUpdateState} />} />
          <Route path="/ai-chat" element={<AIChatPage state={state} />} />
          <Route path="/analytics" element={<AnalyticsPage state={state} />} />
        </Routes>

        <TransactionModal 
          isOpen={isModalOpen} 
          onClose={() => { setIsModalOpen(false); setEditingTransaction(null); }} 
          onSave={handleSaveTransaction}
          categories={state.categories}
          accounts={state.accounts}
          initialData={editingTransaction || undefined}
        />
      </Layout>
    </div>
  );
};

const App: React.FC = () => (
  <HashRouter>
    <AppContent />
  </HashRouter>
);

export default App;


import React, { useState, useEffect, useCallback } from 'react';
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
import { Loader2, CloudOff, Wifi } from 'lucide-react';

const MOCK_STATE: AppState = {
  transactions: [],
  categories: DEFAULT_CATEGORIES,
  accounts: DEFAULT_ACCOUNTS,
  debts: [],
  savings: [],
  profile: { name: 'Гость', currency: '₽' }
};

// Вспомогательный компонент для синхронизации BackButton Telegram
const TelegramNavigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const tg = (window as any).Telegram?.WebApp;

  useEffect(() => {
    if (!tg) return;

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
  }, [location, navigate, tg]);

  return null;
};

const SkeletonLoader = () => (
  <div className="flex flex-col min-h-screen bg-slate-50 p-6 space-y-6 animate-pulse">
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-slate-200 rounded-xl" />
        <div className="space-y-2">
          <div className="w-20 h-2 bg-slate-200 rounded" />
          <div className="w-24 h-3 bg-slate-200 rounded" />
        </div>
      </div>
      <div className="flex gap-2">
        <div className="w-10 h-10 bg-slate-200 rounded-xl" />
        <div className="w-10 h-10 bg-slate-200 rounded-xl" />
      </div>
    </div>
    <div className="grid grid-cols-2 gap-3 h-36">
      <div className="bg-slate-200 rounded-[2.2rem]" />
      <div className="bg-slate-200 rounded-[2.2rem]" />
    </div>
    <div className="space-y-4">
      <div className="w-32 h-3 bg-slate-200 rounded" />
      <div className="space-y-3">
        {[1, 2, 3, 4].map(i => (
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

  const loadData = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    setSyncStatus('syncing');
    try {
      const res = await fetch(`/api/user-state/${userId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.state) {
          setState(prev => ({
            ...prev,
            ...data.state,
            categories: data.state.categories?.length ? data.state.categories : DEFAULT_CATEGORIES,
            accounts: data.state.accounts?.length ? data.state.accounts : DEFAULT_ACCOUNTS,
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
  }, [userId]);

  useEffect(() => {
    if (tg) {
      tg.ready();
      tg.expand();
      tg.setHeaderColor('#f8fafc');
    }

    loadData();

    // Слушатель восстановления интернета
    window.addEventListener('online', loadData);
    return () => window.removeEventListener('online', loadData);
  }, [tg, loadData]);

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
    <Layout onAddClick={() => { setEditingTransaction(null); setIsModalOpen(true); }}>
      <TelegramNavigation />
      <div className="fixed top-2 right-2 z-[1000] pointer-events-none opacity-50 flex items-center gap-2">
        {syncStatus === 'syncing' && <Loader2 size={10} className="animate-spin text-indigo-400" />}
        {syncStatus === 'error' && <CloudOff size={10} className="text-rose-400" />}
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
  );
};

const App: React.FC = () => (
  <HashRouter>
    <AppContent />
  </HashRouter>
);

export default App;

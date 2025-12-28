
import React, { useState, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout.tsx';
import { Dashboard } from './pages/Dashboard.tsx';
import { CalendarPage } from './pages/CalendarPage.tsx';
import { Categories } from './pages/Categories.tsx';
import { Debts } from './pages/Debts.tsx';
import { Profile } from './pages/Profile.tsx';
import { Savings } from './pages/Savings.tsx';
import { AccountsPage } from './pages/AccountsPage.tsx';
import { JointBudget } from './pages/JointBudget.tsx';
import { AIChatPage } from './pages/AIChatPage.tsx';
import { AnalyticsPage } from './pages/AnalyticsPage.tsx';
import { TransactionModal } from './components/TransactionModal.tsx';
import { AppState, Transaction } from './types.ts';
import { DEFAULT_CATEGORIES, DEFAULT_ACCOUNTS } from './constants.tsx';
import { Loader2, CloudOff } from 'lucide-react';

const MOCK_STATE: AppState = {
  transactions: [],
  categories: DEFAULT_CATEGORIES,
  accounts: DEFAULT_ACCOUNTS,
  debts: [],
  savings: [],
  profile: { name: 'Гость', currency: '₽' }
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(MOCK_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error' | 'local'>('local');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const tg = (window as any).Telegram?.WebApp;
  const userId = tg?.initDataUnsafe?.user?.id;

  // 1. Первичная загрузка
  useEffect(() => {
    if (tg) {
      tg.ready();
      tg.expand();
      tg.setHeaderColor('#f8fafc');
    }

    const loadData = async () => {
      if (!userId) {
        console.log("🛠️ Local Mode Active");
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
    };

    loadData();
  }, [userId]);

  // 2. Автосохранение
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
  }, [state, userId, isLoading]);

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
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
        <p className="mt-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Загрузка FinFlow...</p>
      </div>
    );
  }

  return (
    <HashRouter>
      <div className="fixed top-2 right-2 z-[1000] pointer-events-none opacity-50">
        {syncStatus === 'syncing' && <Loader2 size={10} className="animate-spin text-indigo-400" />}
        {syncStatus === 'error' && <CloudOff size={10} className="text-rose-400" />}
      </div>

      <Layout onAddClick={() => { setEditingTransaction(null); setIsModalOpen(true); }}>
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
      </Layout>

      <TransactionModal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditingTransaction(null); }} 
        onSave={handleSaveTransaction}
        categories={state.categories}
        accounts={state.accounts}
        initialData={editingTransaction || undefined}
      />
    </HashRouter>
  );
};

export default App;

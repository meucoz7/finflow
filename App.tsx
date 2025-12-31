import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { HashRouter, Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { CalendarPage } from './pages/CalendarPage';
import { Categories } from './pages/Categories';
import { Debts } from './pages/Debts';
import { Profile } from './pages/Profile';
import { Savings } from './pages/Savings';
import { AccountsPage } from './pages/AccountsPage';
import { JointBudget } from './pages/JointBudget';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { FullHistoryPage } from './pages/FullHistoryPage';
import { SubscriptionsPage } from './pages/SubscriptionsPage';
import { TransactionModal } from './components/TransactionModal';
import { AppState, Transaction, Debt } from './types';
import { DEFAULT_CATEGORIES, DEFAULT_ACCOUNTS } from './constants';
import { ADMIN_IDS } from './config';
import { Loader2, CloudOff } from 'lucide-react';

const MOCK_STATE: AppState = {
  transactions: [],
  categories: DEFAULT_CATEGORIES,
  accounts: DEFAULT_ACCOUNTS,
  debts: [],
  savings: [],
  subscriptions: [],
  profile: { 
    name: 'Гость', 
    currency: '₽',
    dashboardLayout: {
      order: ['hero', 'quick_actions', 'subs', 'summary', 'accounts', 'history'],
      hidden: []
    }
  }
};

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

const SkeletonLoader = () => (
  <div className="flex flex-col min-h-screen bg-[#f8fafc] p-6 pt-[env(safe-area-inset-top,24px)] space-y-8 animate-pulse w-full max-w-md mx-auto">
    <div className="flex justify-between items-center mt-4">
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
    <div className="grid grid-cols-5 gap-3 h-32">
        <div className="col-span-3 bg-slate-200 rounded-[2rem]" />
        <div className="col-span-2 bg-slate-200 rounded-[2rem]" />
    </div>
    <div className="grid grid-cols-2 gap-3 h-24">
      <div className="bg-slate-200 rounded-3xl" />
      <div className="bg-slate-200 rounded-3xl" />
    </div>
    <div className="space-y-4">
      <div className="w-40 h-4 bg-slate-200 rounded" />
      {[1, 2].map(i => (
        <div key={i} className="h-20 bg-white rounded-[2rem] border border-slate-100" />
      ))}
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
  const hasAttemptedLoad = useRef(false);

  const isAdmin = useMemo(() => {
    const uid = tg?.initDataUnsafe?.user?.id;
    return uid ? ADMIN_IDS.includes(uid) : false;
  }, [tg]);

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
            subscriptions: data.state.subscriptions || [],
            profile: {
              ...prev.profile,
              ...data.state.profile,
              name: data.state.profile?.name || tg?.initDataUnsafe?.user?.first_name || 'Пользователь',
              dashboardLayout: data.state.profile?.dashboardLayout || MOCK_STATE.profile.dashboardLayout
            }
          }));
        }
        setSyncStatus('synced');
      } else {
        setSyncStatus('error');
      }
    } catch (err) {
      console.error("Load error:", err);
      setSyncStatus('error');
    } finally {
      setIsLoading(false);
    }
  }, [tg]);

  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
      }
    }, 2500);

    if (tg) {
      tg.ready();
      try {
        if (tg.isVersionAtLeast && tg.isVersionAtLeast('7.7')) {
          if (['android', 'ios'].includes(tg.platform)) {
            if (typeof tg.requestFullscreen === 'function') {
              tg.requestFullscreen();
            }
          }
          if (typeof tg.disableVerticalSwipes === 'function') {
            tg.disableVerticalSwipes();
          }
        } else {
          tg.expand();
        }
      } catch (e) {
        tg.expand();
      }

      tg.setHeaderColor('#f8fafc');
      tg.setBackgroundColor('#f8fafc');
      const userId = tg.initDataUnsafe?.user?.id;
      if (userId && !hasAttemptedLoad.current) {
        hasAttemptedLoad.current = true;
        loadData(userId);
      }
    } else {
      setTimeout(() => setIsLoading(false), 500);
    }
    return () => clearTimeout(safetyTimer);
  }, [tg, loadData]);

  useEffect(() => {
    const userId = tg?.initDataUnsafe?.user?.id;
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
  }, [state, tg, isLoading, syncStatus]);

  const handleUpdateState = (newState: Partial<AppState>) => {
    setState(prev => ({ ...prev, ...newState }));
  };

  const handleQuickAction = (categoryId: string, amount: number, note: string) => {
    const newTx: Omit<Transaction, 'id'> = {
      amount,
      categoryId,
      accountId: state.accounts[0].id,
      date: new Date().toISOString(),
      note: note || 'Быстрая запись',
      type: 'expense'
    };
    handleSaveTransaction(newTx);
  };

  const handleSaveTransaction = (newTx: Omit<Transaction, 'id'>, newDebtName?: string) => {
    let finalTx: Transaction;
    let updatedDebts = [...state.debts];
    let updatedSubscriptions = [...state.subscriptions];

    if (editingTransaction) {
      finalTx = { ...newTx, id: editingTransaction.id };
      
      if (editingTransaction.linkedDebtId) {
        updatedDebts = updatedDebts.map(d => {
          if (d.id === editingTransaction.linkedDebtId) {
            const reversalAmount = editingTransaction.debtAction === 'increase' 
              ? -editingTransaction.amount 
              : editingTransaction.amount;
            return { ...d, amount: Math.max(0, d.amount + reversalAmount) };
          }
          return d;
        });
      }
    } else {
      finalTx = { ...newTx, id: `tx_${Date.now()}` };
    }

    if (finalTx.subscriptionId) {
      updatedSubscriptions = updatedSubscriptions.map(sub => {
        if (sub.id === finalTx.subscriptionId) {
          const nextDate = new Date(sub.nextPaymentDate);
          if (sub.period === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
          else if (sub.period === 'yearly') nextDate.setFullYear(nextDate.getFullYear() + 1);
          else if (sub.period === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
          return { ...sub, nextPaymentDate: nextDate.toISOString().split('T')[0] };
        }
        return sub;
      });
    }

    if (finalTx.linkedDebtId || newDebtName) {
      const amount = finalTx.amount;
      const action = finalTx.debtAction;

      if (finalTx.linkedDebtId) {
        updatedDebts = updatedDebts.map(d => {
          if (d.id === finalTx.linkedDebtId) {
            let newAmount = action === 'increase' ? d.amount + amount : Math.max(0, d.amount - amount);
            let newDueDate = d.dueDate;
            
            if (d.isMonthly && action === 'decrease' && d.dueDate) {
               const nextDate = new Date(d.dueDate);
               nextDate.setMonth(nextDate.getMonth() + 1);
               newDueDate = nextDate.toISOString().split('T')[0];
            }

            return { ...d, amount: newAmount, dueDate: newDueDate };
          }
          return d;
        });
      } else if (newDebtName && action === 'increase') {
        const debtType = finalTx.type === 'expense' ? 'they_owe' : 'i_owe';
        const newDebt: Debt = {
          id: `debt_${Date.now()}`,
          personName: newDebtName,
          amount: amount,
          type: debtType,
          date: new Date().toISOString(),
          description: `Создано через транзакцию: ${finalTx.note || 'Без описания'}`
        };
        updatedDebts.push(newDebt);
        finalTx.linkedDebtId = newDebt.id;
      }
    }

    const updatedTransactions = editingTransaction 
      ? state.transactions.map(t => t.id === editingTransaction.id ? finalTx : t)
      : [...state.transactions, finalTx];

    handleUpdateState({ 
      transactions: updatedTransactions,
      debts: updatedDebts,
      subscriptions: updatedSubscriptions
    });
  };

  const handleDeleteTransaction = (id: string) => {
    const txToDelete = state.transactions.find(t => t.id === id);
    if (!txToDelete) return;

    let updatedDebts = [...state.debts];
    let updatedSubscriptions = [...state.subscriptions];

    if (txToDelete.subscriptionId || txToDelete.note.startsWith('[ПОДПИСКА]')) {
      const sub = state.subscriptions.find(s => s.id === txToDelete.subscriptionId || s.name === txToDelete.note.replace('[ПОДПИСКА] ', ''));
      if (sub) {
        const prevDate = new Date(sub.nextPaymentDate);
        if (sub.period === 'monthly') prevDate.setMonth(prevDate.getMonth() - 1);
        else if (sub.period === 'yearly') prevDate.setFullYear(prevDate.getFullYear() - 1);
        else if (sub.period === 'weekly') prevDate.setDate(prevDate.getDate() - 7);
        
        updatedSubscriptions = state.subscriptions.map(s => s.id === sub.id ? { ...s, nextPaymentDate: prevDate.toISOString().split('T')[0] } : s);
      }
    }

    if (txToDelete.linkedDebtId) {
      updatedDebts = updatedDebts.map(d => {
        if (d.id === txToDelete.linkedDebtId) {
          const reversalAmount = txToDelete.debtAction === 'increase' 
            ? -txToDelete.amount 
            : txToDelete.amount;
          return { ...d, amount: Math.max(0, d.amount + reversalAmount) };
        }
        return d;
      });
    }

    handleUpdateState({ 
      transactions: state.transactions.filter(t => t.id !== id),
      debts: updatedDebts,
      subscriptions: updatedSubscriptions
    });
  };

  if (isLoading) {
    return <SkeletonLoader />;
  }

  return (
    <div className="app-container">
      <Layout onAddClick={() => { setEditingTransaction(null); setIsModalOpen(true); }}>
        <TelegramNavigation />
        
        <div className="fixed top-4 right-4 z-[2000] pointer-events-none opacity-30 mt-[env(safe-area-inset-top,0px)]">
          {syncStatus === 'syncing' && <Loader2 size={12} className="animate-spin text-indigo-500" />}
          {syncStatus === 'error' && <CloudOff size={12} className="text-rose-500" />}
        </div>

        <Routes>
          <Route path="/" element={<Dashboard state={state} isAdmin={isAdmin} onEditTransaction={(tx) => { setEditingTransaction(tx); setIsModalOpen(true); }} onDeleteTransaction={handleDeleteTransaction} onUpdateState={handleUpdateState} onQuickAction={handleQuickAction} />} />
          <Route path="/accounts" element={<AccountsPage state={state} onUpdateState={handleUpdateState} />} />
          <Route path="/joint" element={<JointBudget state={state} onUpdateState={handleUpdateState} />} />
          <Route path="/calendar" element={<CalendarPage state={state} onUpdateState={handleUpdateState} onEditTransaction={(tx) => { setEditingTransaction(tx); setIsModalOpen(true); }} />} />
          <Route path="/categories" element={<Categories state={state} onUpdateState={handleUpdateState} />} />
          <Route path="/debts" element={<Debts state={state} onUpdateState={handleUpdateState} />} />
          <Route path="/savings" element={<Savings state={state} onUpdateState={handleUpdateState} />} />
          <Route path="/subscriptions" element={<SubscriptionsPage state={state} onUpdateState={handleUpdateState} />} />
          <Route path="/profile" element={<Profile state={state} isAdmin={isAdmin} onUpdateState={handleUpdateState} />} />
          <Route path="/analytics" element={<AnalyticsPage state={state} />} />
          <Route path="/history" element={<FullHistoryPage state={state} onEditTransaction={(tx) => { setEditingTransaction(tx); setIsModalOpen(true); }} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <TransactionModal 
          isOpen={isModalOpen} 
          onClose={() => { setIsModalOpen(false); setEditingTransaction(null); }} 
          onSave={handleSaveTransaction}
          onDelete={handleDeleteTransaction}
          categories={state.categories}
          accounts={state.accounts}
          debts={state.debts}
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
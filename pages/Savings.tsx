
import React, { useState, useMemo } from 'react';
import { AppState, SavingsGoal } from '../types';
import { Plus, Target, PiggyBank, Trash2, Edit2, X } from 'lucide-react';

interface SavingsProps {
  state: AppState;
  onUpdateState: (newState: Partial<AppState>) => void;
}

export const Savings: React.FC<SavingsProps> = ({ state, onUpdateState }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [showTopUp, setShowTopUp] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [topUpAmount, setTopUpAmount] = useState('');
  
  const [newGoal, setNewGoal] = useState<Omit<SavingsGoal, 'id'>>({
    name: '', targetAmount: 0, currentAmount: 0, icon: '🎯', color: '#6366f1'
  });

  const totalSavedFromTransactions = useMemo(() => {
    return state.transactions.filter(t => t.type === 'savings').reduce((acc, t) => acc + t.amount, 0);
  }, [state.transactions]);

  const totalCurrentSavings = useMemo(() => {
    return state.savings.reduce((acc, g) => acc + g.currentAmount, 0) + totalSavedFromTransactions;
  }, [state.savings, totalSavedFromTransactions]);

  const saveGoal = () => {
    if (!newGoal.name || !newGoal.targetAmount) return;
    
    if (editingId) {
      const updatedSavings = state.savings.map(g => 
        g.id === editingId ? { ...newGoal, id: g.id } : g
      );
      onUpdateState({ savings: updatedSavings });
    } else {
      const goal: SavingsGoal = { ...newGoal, id: Date.now().toString() };
      onUpdateState({ savings: [...state.savings, goal] });
    }
    
    cancelForm();
  };

  const startEdit = (goal: SavingsGoal) => {
    setEditingId(goal.id);
    setNewGoal({
      name: goal.name,
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
      icon: goal.icon,
      color: goal.color
    });
    setShowAdd(true);
    setShowTopUp(null);
  };

  const cancelForm = () => {
    setShowAdd(false);
    setEditingId(null);
    setNewGoal({ name: '', targetAmount: 0, currentAmount: 0, icon: '🎯', color: '#6366f1' });
  };

  const handleTopUp = (goalId: string) => {
    const amount = parseFloat(topUpAmount);
    if (isNaN(amount) || amount <= 0) return;
    const updatedGoals = state.savings.map(g => g.id === goalId ? { ...g, currentAmount: g.currentAmount + amount } : g);
    onUpdateState({ 
      savings: updatedGoals, 
      transactions: [...state.transactions, {
        id: Date.now().toString(), amount, categoryId: 'savings_manual', accountId: state.accounts[0].id,
        date: new Date().toISOString(), note: `В цель: ${state.savings.find(g => g.id === goalId)?.name}`, type: 'savings'
      }] 
    });
    setShowTopUp(null); setTopUpAmount('');
  };

  const deleteGoal = (id: string) => {
    if (confirm('Удалить эту цель? Накопленные средства останутся в истории операций.')) {
      onUpdateState({ savings: state.savings.filter(g => g.id !== id) });
    }
  };

  return (
    <div className="space-y-5 animate-slide-up pb-32 pt-[env(safe-area-inset-top,8px)]">
      <header className="flex justify-between items-center px-1 pt-1">
        <div>
          <h1 className="text-rose-500 text-[9px] font-black uppercase tracking-[0.2em]">ЦЕЛИ</h1>
          <p className="text-slate-900 font-black text-base">Ваши накопления</p>
        </div>
        <button 
          onClick={() => showAdd ? cancelForm() : setShowAdd(true)} 
          className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-md transition-all active:scale-90 ${showAdd ? 'bg-slate-900 text-white rotate-45' : 'bg-white border border-slate-100 text-slate-900'}`}
        >
          <Plus size={18} strokeWidth={3} />
        </button>
      </header>

      {/* Hero Savings Card */}
      <div className="bg-slate-900 rounded-[2rem] p-5 text-white shadow-xl flex items-center justify-between">
         <div className="flex items-center gap-4">
           <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-md border border-white/10 text-rose-300">
             <PiggyBank size={20} />
           </div>
           <div>
             <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest">Общий резерв</p>
             <h2 className="text-xl font-black">{totalCurrentSavings.toLocaleString()} <span className="text-xs text-rose-400">{state.profile.currency}</span></h2>
           </div>
         </div>
      </div>

      {showAdd && (
        <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-slate-100 space-y-4 animate-slide-up relative">
          <button onClick={cancelForm} className="absolute top-4 right-4 p-1 text-slate-300"><X size={20} /></button>
          <div className="space-y-1 pt-2">
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Название цели</label>
            <input 
              type="text" placeholder="На что копим?" className="w-full bg-slate-50 p-4 rounded-xl font-bold text-slate-900 outline-none text-sm"
              value={newGoal.name} onChange={e => setNewGoal({...newGoal, name: e.target.value})}
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-grow space-y-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Сумма</label>
              <input 
                type="number" placeholder="0" className="w-full bg-slate-50 p-4 rounded-xl font-black text-xl outline-none"
                value={newGoal.targetAmount || ''} onChange={e => setNewGoal({...newGoal, targetAmount: parseFloat(e.target.value)})}
              />
            </div>
            <div className="w-20 space-y-1 text-center">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Иконка</label>
              <input 
                type="text" className="w-full bg-slate-50 p-4 rounded-xl text-center text-xl outline-none"
                value={newGoal.icon} onChange={e => setNewGoal({...newGoal, icon: e.target.value})}
              />
            </div>
          </div>
          <button onClick={saveGoal} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-lg">
            {editingId ? 'Обновить цель' : 'Создать цель'}
          </button>
        </div>
      )}

      <div className="space-y-3">
        {state.savings.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-[2rem] border border-dashed border-slate-200">
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Список целей пуст</p>
          </div>
        ) : (
          state.savings.map(goal => {
            const percentage = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
            return (
              <div key={goal.id} className="bg-white p-5 rounded-[2rem] border border-slate-50 shadow-sm transition-all group">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-3 min-w-0" onClick={() => startEdit(goal)}>
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-xl shrink-0">{goal.icon}</div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-900 text-[13px] uppercase truncate">{goal.name}</h4>
                      <p className="text-[9px] text-indigo-500 font-bold uppercase">{Math.round(percentage)}% выполнено</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowTopUp(showTopUp === goal.id ? null : goal.id)} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${showTopUp === goal.id ? 'bg-slate-900 text-white' : 'bg-slate-50 text-indigo-500'}`}><Plus size={16} /></button>
                    <button onClick={() => startEdit(goal)} className="w-8 h-8 bg-slate-50 text-indigo-400 rounded-lg flex items-center justify-center"><Edit2 size={14} /></button>
                    <button onClick={() => deleteGoal(goal.id)} className="w-8 h-8 bg-slate-50 text-slate-300 rounded-lg flex items-center justify-center"><Trash2 size={14} /></button>
                  </div>
                </div>

                {showTopUp === goal.id && (
                  <div className="mb-4 p-3 bg-slate-50 rounded-xl animate-slide-up flex gap-2">
                     <input type="number" placeholder="0" className="flex-grow bg-white p-2 rounded-lg text-sm font-bold outline-none" value={topUpAmount} onChange={e => setTopUpAmount(e.target.value)} autoFocus />
                     <button onClick={() => handleTopUp(goal.id)} className="bg-indigo-600 text-white px-4 rounded-lg text-[10px] font-bold uppercase">Внести</button>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex justify-between items-end text-[10px] font-bold uppercase tracking-tight text-slate-400">
                    <span>{goal.currentAmount.toLocaleString()} {state.profile.currency}</span>
                    <span>Цель: {goal.targetAmount.toLocaleString()}</span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5">
                    <div className="h-full bg-indigo-600 rounded-full transition-all duration-700" style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

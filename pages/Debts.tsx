
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppState, Debt } from '../types';
import { Plus, Trash2, UserPlus, UserMinus, Landmark, Calendar, Info, AlertCircle, RefreshCw, Clock, Edit2, Edit3, X } from 'lucide-react';

// Fix: Define the missing DebtsProps interface to resolve the compilation error.
interface DebtsProps {
  state: AppState;
  onUpdateState: (newState: Partial<AppState>) => void;
}

const SwipeableDebtItem: React.FC<{
  debt: Debt;
  activeTab: 'i_owe' | 'they_owe';
  onEdit: (debt: Debt) => void;
  onDelete: (id: string) => void;
  isAnySwiped: string | null;
  setIsAnySwiped: (id: string | null) => void;
}> = ({ debt, activeTab, onEdit, onDelete, isAnySwiped, setIsAnySwiped }) => {
  const [startX, setStartX] = useState<number | null>(null);
  const [currentOffset, setCurrentOffset] = useState(0);
  const isThisSwiped = isAnySwiped === debt.id;

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startX === null) return;
    const x = e.touches[0].clientX;
    const diff = x - startX;
    
    if (diff < 0) {
      setCurrentOffset(Math.max(diff, -140));
    } else if (isThisSwiped && diff > 0) {
      setCurrentOffset(Math.min(-120 + diff, 0));
    }
  };

  const handleTouchEnd = () => {
    if (currentOffset < -60) {
      setIsAnySwiped(debt.id);
      setCurrentOffset(-120);
    } else {
      setIsAnySwiped(null);
      setCurrentOffset(0);
    }
    setStartX(null);
  };

  const xPos = isThisSwiped ? -120 : currentOffset;

  return (
    <div className="relative overflow-hidden rounded-[2.2rem] h-[82px] touch-pan-y group">
      {/* Кнопки действий (интегрированные в фон приложения) */}
      <div className="absolute inset-0 bg-slate-50 flex justify-end rounded-[2.2rem] overflow-hidden">
        <div className="flex h-full px-2 gap-2">
          <button 
            onClick={(e) => { e.stopPropagation(); onEdit(debt); setIsAnySwiped(null); }}
            className="w-[52px] h-full flex items-center justify-center text-indigo-500 active:scale-90 transition-all"
          >
            <div className="w-11 h-11 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100">
              <Edit3 size={18} strokeWidth={2.5} />
            </div>
          </button>
          <button 
            onClick={(e) => { 
              e.stopPropagation(); 
              onDelete(debt.id);
              setIsAnySwiped(null);
            }}
            className="w-[52px] h-full flex items-center justify-center text-rose-500 active:scale-90 transition-all"
          >
            <div className="w-11 h-11 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100">
              <Trash2 size={18} strokeWidth={2.5} />
            </div>
          </button>
        </div>
      </div>

      {/* Контентная часть */}
      <div 
        className="absolute inset-0 bg-white p-5 rounded-[2.2rem] flex justify-between items-center border border-slate-50 shadow-sm transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1) z-10"
        style={{ transform: `translateX(${xPos}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => {
          if (isThisSwiped) {
            setIsAnySwiped(null);
          } else {
            onEdit(debt);
          }
        }}
      >
        <div className="flex items-center gap-4 min-w-0 pointer-events-none">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${debt.isBank ? 'bg-amber-50 text-amber-600' : activeTab === 'i_owe' ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-600'}`}>
            {debt.isBank ? <Landmark size={22} /> : activeTab === 'i_owe' ? <UserMinus size={22} /> : <UserPlus size={22} />}
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-slate-900 text-[14px] uppercase truncate tracking-tight">{debt.personName}</h4>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-[9px] text-slate-400 font-bold uppercase">{debt.dueDate ? new Date(debt.dueDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : 'Без даты'}</p>
              {debt.isMonthly && <RefreshCw size={8} className="text-indigo-400" />}
              {debt.isBank && <span className="bg-amber-100 text-amber-700 text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter">Банк</span>}
            </div>
          </div>
        </div>
        
        <div className="text-right mr-1 pointer-events-none">
          <p className={`font-black text-[18px] tracking-tighter leading-none ${activeTab === 'i_owe' ? 'text-rose-500' : 'text-emerald-600'}`}>
            {debt.amount.toLocaleString()}
          </p>
          <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-1">Остаток</p>
        </div>
      </div>
    </div>
  );
};

export const Debts: React.FC<DebtsProps> = ({ state, onUpdateState }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'i_owe' | 'they_owe'>('i_owe');
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [swipedId, setSwipedId] = useState<string | null>(null);
  
  const [newDebt, setNewDebt] = useState<Omit<Debt, 'id'>>({
    personName: '', 
    amount: 0, 
    type: 'i_owe', 
    isBank: false, 
    isMonthly: false,
    dueDate: new Date().toISOString().split('T')[0],
    endDate: '',
    date: new Date().toISOString(), 
    description: ''
  });

  const filteredDebts = state.debts.filter(d => d.type === activeTab);
  
  const debtStats = useMemo(() => {
    const theyOweMe = state.debts.filter(d => d.type === 'they_owe').reduce((s, d) => s + d.amount, 0);
    const iOwePerson = state.debts.filter(d => d.type === 'i_owe' && !d.isBank).reduce((s, d) => s + d.amount, 0);
    const iOweBank = state.debts.filter(d => d.type === 'i_owe' && d.isBank).reduce((s, d) => s + d.amount, 0);
    return { theyOweMe, iOweTotal: iOwePerson + iOweBank, iOweBank, balance: theyOweMe - (iOwePerson + iOweBank) };
  }, [state.debts]);

  const saveDebt = () => {
    if (!newDebt.personName || !newDebt.amount) return;
    
    if (editingId) {
      const updatedDebts = state.debts.map(d => 
        d.id === editingId ? { ...newDebt, id: d.id, type: activeTab } : d
      );
      onUpdateState({ debts: updatedDebts });
    } else {
      onUpdateState({ debts: [...state.debts, { ...newDebt, id: Date.now().toString(), type: activeTab }] });
    }
    
    cancelEdit();
  };

  const startEdit = (debt: Debt) => {
    setEditingId(debt.id);
    setNewDebt({
      personName: debt.personName,
      amount: debt.amount,
      type: debt.type,
      isBank: debt.isBank,
      isMonthly: debt.isMonthly,
      dueDate: debt.dueDate || new Date().toISOString().split('T')[0],
      endDate: debt.endDate || '',
      date: debt.date,
      description: debt.description
    });
    setShowAdd(true);
  };

  const cancelEdit = () => {
    setShowAdd(false);
    setEditingId(null);
    setNewDebt({ 
      personName: '', amount: 0, type: activeTab, isBank: false, isMonthly: false,
      dueDate: new Date().toISOString().split('T')[0], endDate: '', date: new Date().toISOString(), description: '' 
    });
  };

  const deleteDebt = (id: string) => {
    if (confirm('Удалить эту запись?')) {
      onUpdateState({ debts: state.debts.filter(d => d.id !== id) });
    }
  };

  return (
    <div className="space-y-5 animate-slide-up pb-32 pt-[env(safe-area-inset-top,8px)]" onClick={() => setSwipedId(null)}>
      <header className="flex justify-between items-center px-1 pt-1">
        <div>
          <h1 className="text-amber-500 text-[9px] font-black uppercase tracking-[0.2em]">ФИНАНСОВЫЕ ОБЯЗАТЕЛЬСТВА</h1>
          <p className="text-slate-900 font-black text-base">Кредиты и долги</p>
        </div>
        <button 
          onClick={() => showAdd ? cancelEdit() : setShowAdd(true)} 
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-lg active:scale-90 ${showAdd ? 'bg-slate-900 text-white rotate-45' : 'bg-white border border-slate-100 text-slate-900'}`}
        >
          <Plus size={20} strokeWidth={3} />
        </button>
      </header>

      {/* Main Stats Card */}
      <div className="bg-slate-900 rounded-[2rem] p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl -mr-16 -mt-16"></div>
        <div className="relative z-10 flex justify-between items-center mb-6">
           <div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Общее сальдо</p>
              <h2 className="text-3xl font-black">{debtStats.balance.toLocaleString()} <span className="text-sm opacity-40">{state.profile.currency}</span></h2>
           </div>
           <div className={`p-3 rounded-2xl ${debtStats.balance >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
              {debtStats.balance >= 0 ? <UserPlus size={24} /> : <UserMinus size={24} />}
           </div>
        </div>
        <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
           <div>
              <p className="text-slate-500 text-[9px] font-black uppercase tracking-tight mb-0.5">Банкам должен</p>
              <p className="text-rose-400 font-black text-sm">{debtStats.iOweBank.toLocaleString()} {state.profile.currency}</p>
           </div>
           <div className="text-right">
              <p className="text-slate-500 text-[9px] font-black uppercase tracking-tight mb-0.5">Мне вернут</p>
              <p className="text-emerald-400 font-black text-sm">{debtStats.theyOweMe.toLocaleString()} {state.profile.currency}</p>
           </div>
        </div>
      </div>

      <div className="bg-slate-100 p-1.5 rounded-2xl flex gap-1">
        <button onClick={() => { setActiveTab('i_owe'); if(editingId) cancelEdit(); }} className={`flex-1 py-3 rounded-xl font-bold text-[10px] uppercase transition-all flex items-center justify-center gap-2 ${activeTab === 'i_owe' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500'}`}>
          Мои долги
        </button>
        <button onClick={() => { setActiveTab('they_owe'); if(editingId) cancelEdit(); }} className={`flex-1 py-3 rounded-xl font-bold text-[10px] uppercase transition-all flex items-center justify-center gap-2 ${activeTab === 'they_owe' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}>
          Мне должны
        </button>
      </div>

      {showAdd && (
        <div className="bg-white p-7 rounded-[2.5rem] shadow-2xl border border-slate-100 space-y-6 animate-slide-up relative">
           <button onClick={cancelEdit} className="absolute top-4 right-4 p-2 text-slate-300"><X size={20} /></button>
           <div className="space-y-4">
              <div className="flex gap-2 p-1 bg-slate-50 rounded-2xl">
                 <button 
                  onClick={() => setNewDebt({...newDebt, isBank: false})}
                  className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${!newDebt.isBank ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}
                 >
                    Человек
                 </button>
                 <button 
                  onClick={() => setNewDebt({...newDebt, isBank: true})}
                  className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${newDebt.isBank ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}
                 >
                    Банк
                 </button>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">{newDebt.isBank ? "Название банка" : "Имя человека"}</label>
                <input 
                  type="text" 
                  placeholder={newDebt.isBank ? "Тинькофф, Сбер..." : "Александр..."} 
                  className="w-full bg-slate-50 p-4 rounded-2xl font-bold text-slate-900 outline-none text-sm border border-transparent focus:bg-white focus:ring-4 focus:ring-amber-50" 
                  value={newDebt.personName} 
                  onChange={e => setNewDebt({...newDebt, personName: e.target.value})} 
                />
              </div>

              <div className="relative">
                <input 
                  type="number" 
                  placeholder="0" 
                  className="w-full bg-slate-50 p-5 rounded-2xl font-black text-3xl outline-none" 
                  value={newDebt.amount || ''} 
                  onChange={e => setNewDebt({...newDebt, amount: parseFloat(e.target.value) || 0})} 
                />
                <span className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-slate-300 text-xl">{state.profile.currency}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Дата платежа</label>
                  <div className="bg-slate-50 rounded-2xl p-3 flex items-center gap-2 border border-transparent focus-within:bg-white focus-within:ring-4 focus-within:ring-amber-50 transition-all">
                    <Calendar size={14} className="text-slate-400" />
                    <input 
                      type="date" 
                      className="bg-transparent text-[12px] font-bold outline-none w-full text-slate-700"
                      value={newDebt.dueDate}
                      onChange={e => setNewDebt({...newDebt, dueDate: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                   <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Тип выплат</label>
                   <button 
                    onClick={() => setNewDebt({...newDebt, isMonthly: !newDebt.isMonthly})}
                    className={`w-full py-3 rounded-2xl text-[9px] font-black uppercase flex items-center justify-center gap-2 border transition-all ${newDebt.isMonthly ? 'bg-amber-100 border-amber-200 text-amber-700' : 'bg-slate-50 border-transparent text-slate-400'}`}
                   >
                     <RefreshCw size={12} className={newDebt.isMonthly ? 'animate-spin-slow' : ''} />
                     {newDebt.isMonthly ? 'Месячный' : 'Разовый'}
                   </button>
                </div>
              </div>

              {newDebt.isMonthly && (
                <div className="space-y-1 animate-slide-up">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Дата окончания (опц.)</label>
                  <div className="bg-slate-50 rounded-2xl p-3 flex items-center gap-2">
                    <Clock size={14} className="text-slate-400" />
                    <input 
                      type="date" 
                      className="bg-transparent text-[12px] font-bold outline-none w-full text-slate-700"
                      value={newDebt.endDate}
                      onChange={e => setNewDebt({...newDebt, endDate: e.target.value})}
                    />
                  </div>
                </div>
              )}
           </div>

           <button 
            onClick={saveDebt} 
            className={`w-full py-5 rounded-[2rem] font-black uppercase text-[11px] tracking-widest text-white shadow-xl transition-all active:scale-95 ${activeTab === 'i_owe' ? 'bg-rose-600' : 'bg-emerald-600'}`}
           >
              {editingId ? 'Обновить данные' : 'Сохранить обязательство'}
           </button>
        </div>
      )}

      <div className="space-y-3 px-1">
        {filteredDebts.length === 0 ? (
          <div className="bg-white py-16 rounded-[2.5rem] border border-dashed border-slate-200 text-center px-8">
            <AlertCircle size={32} className="mx-auto text-slate-200 mb-3" />
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Список пуст</p>
          </div>
        ) : (
          filteredDebts.map(debt => (
            <SwipeableDebtItem 
              key={debt.id} 
              debt={debt} 
              activeTab={activeTab} 
              onEdit={startEdit} 
              onDelete={deleteDebt}
              isAnySwiped={swipedId}
              setIsAnySwiped={setSwipedId}
            />
          ))
        )}
      </div>

      <div className="mx-1 p-5 bg-white rounded-[2rem] text-slate-400 flex gap-4 items-center border border-slate-100 shadow-sm">
         <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center shrink-0">
            <Info size={22} className="text-amber-400" />
         </div>
         <p className="text-[11px] font-bold leading-relaxed">
            Все долги с указанной датой теперь автоматически синхронизируются со страницей <strong>Планирования</strong>.
         </p>
      </div>
    </div>
  );
};

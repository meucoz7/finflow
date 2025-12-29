import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Calendar, Wallet, Loader2, QrCode, Clock, CreditCard, Users, Check, HandCoins, UserPlus, Search, Plus, ChevronDown, ChevronUp, Eraser, Trash2, RefreshCw, AlertCircle } from 'lucide-react';
import { Transaction, Category, TransactionType, Account, Debt } from '../types';
import jsQR from 'jsqr';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaction: Omit<Transaction, 'id'>, newDebtName?: string) => void;
  onDelete?: (id: string) => void;
  categories: Category[];
  accounts: Account[];
  debts: Debt[];
  initialData?: Transaction;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({ isOpen, onClose, onSave, onDelete, categories, accounts, debts, initialData }) => {
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isPlanned, setIsPlanned] = useState(false);
  const [isJoint, setIsJoint] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState('');
  
  // UI States
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  
  // Debt related states
  const [isDebtRelated, setIsDebtRelated] = useState(false);
  const [debtAction, setDebtAction] = useState<'increase' | 'decrease' | null>(null);
  const [selectedDebtId, setSelectedDebtId] = useState<string>('');
  const [newDebtName, setNewDebtName] = useState('');
  const [debtSearch, setDebtSearch] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSubscriptionPayment = !!(initialData?.subscriptionId || initialData?.note.startsWith('[ПОДПИСКА]'));

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setType(initialData.type);
        setAmount(initialData.amount.toString());
        setCategoryId(initialData.categoryId);
        setAccountId(initialData.accountId);
        // Clean note from technical prefixes
        setNote(initialData.note.replace(/^\[(ПОДПИСКА|ДОЛГ)\]\s*/, ''));
        setDate(initialData.date.split('T')[0]);
        setIsPlanned(initialData.isPlanned || false);
        setIsJoint(initialData.isJoint || false);
        setIsDebtRelated(!!initialData.linkedDebtId);
        setSelectedDebtId(initialData.linkedDebtId || '');
        setDebtAction(initialData.debtAction || null);
      } else {
        setAmount(''); setCategoryId(''); setNote(''); setStatusText(''); setIsJoint(false);
        setIsPlanned(false); setIsDebtRelated(false); setDebtAction(null); 
        setSelectedDebtId(''); setNewDebtName(''); setDebtSearch('');
        setShowCategoryPicker(false);
        if (accounts.length > 0) setAccountId(accounts[0].id);
      }
    }
  }, [isOpen, accounts, initialData]);

  const selectedCategory = useMemo(() => 
    categories.find(c => c.id === categoryId), 
  [categories, categoryId]);

  const debtPlaceholder = useMemo(() => {
    if (!debtAction) return "Кому/От кого...";
    if (type === 'expense') {
      return debtAction === 'increase' ? "Кому дали в долг?" : "Кому вернули долг?";
    } else {
      return debtAction === 'increase' ? "У кого взяли в долг?" : "Кто вернул долг?";
    }
  }, [debtAction, type]);

  const filteredDebts = useMemo(() => {
    return debts.filter(d => {
        if (!debtAction) return true;
        if (type === 'expense') {
            return debtAction === 'increase' ? d.type === 'they_owe' : d.type === 'i_owe';
        } else {
            return debtAction === 'increase' ? d.type === 'i_owe' : d.type === 'they_owe';
        }
    }).filter(d => d.personName.toLowerCase().includes(debtSearch.toLowerCase()));
  }, [debts, debtAction, type, debtSearch]);

  const handleDebtActionSelect = (action: 'increase' | 'decrease') => {
    if (debtAction === action) {
      setDebtAction(null);
      setIsDebtRelated(false);
      if (note.includes('долг') || note.includes('вернули')) setNote('');
    } else {
      setDebtAction(action);
      setIsDebtRelated(true);
      
      const prefix = action === 'increase' 
        ? (type === 'expense' ? 'Дал в долг' : 'Взял в долг') 
        : (type === 'expense' ? 'Вернул долг' : 'Мне вернули');
      setNote(prefix);

      const debtCat = categories.find(c => c.name.toLowerCase().includes('долг') && c.type === type);
      if (debtCat) setCategoryId(debtCat.id);
    }
  };

  const clearCategory = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCategoryId('');
    setShowCategoryPicker(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || (!categoryId && !isDebtRelated && !isSubscriptionPayment) || !accountId) return;
    
    // Preserve existing prefix if editing a subscription transaction
    const originalIsSub = initialData?.note.startsWith('[ПОДПИСКА]');
    let prefix = '';
    if (isDebtRelated) prefix = '[ДОЛГ] ';
    else if (originalIsSub) prefix = '[ПОДПИСКА] ';

    const finalNote = `${prefix}${note.trim()}`;
    
    onSave({
      amount: parseFloat(amount),
      categoryId: categoryId || 'subscription_system',
      accountId,
      note: finalNote,
      date: new Date(date).toISOString(),
      type,
      isPlanned,
      isJoint,
      linkedDebtId: selectedDebtId || undefined,
      debtAction: debtAction || undefined,
      subscriptionId: initialData?.subscriptionId
    }, newDebtName || undefined);
    onClose();
  };

  const handleDelete = () => {
    if (initialData && onDelete && confirm('Вы уверены, что хотите удалить эту операцию?')) {
      onDelete(initialData.id);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-white rounded-t-[2rem] shadow-2xl animate-slide-up flex flex-col max-h-[85vh] pb-safe">
        <div className="w-10 h-1 bg-slate-100 rounded-full mx-auto mt-2.5" />

        <div className="px-5 pb-5 overflow-y-auto no-scrollbar">
          <div className="flex justify-between items-center mb-3 pt-2">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">
              {initialData ? (isSubscriptionPayment ? 'Платеж по подписке' : 'Изменить') : 'Запись'}
            </h2>
            <button onClick={onClose} className="p-1.5 bg-slate-50 rounded-full text-slate-400 active:scale-90 transition-all"><X size={16} /></button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {isSubscriptionPayment && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex gap-3 animate-slide-up">
                 <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-indigo-100">
                    <RefreshCw size={18} />
                 </div>
                 <div className="space-y-1">
                   <p className="text-[11px] font-black text-indigo-900 uppercase tracking-tight">Подписка активна</p>
                   <p className="text-[9px] text-indigo-600 font-bold leading-relaxed">
                     Это платеж по подписке. При его <strong>удалении</strong> дата следующего списания будет возвращена назад.
                   </p>
                 </div>
              </div>
            )}

            {!isSubscriptionPayment && (
              <div className="grid grid-cols-3 gap-1 bg-slate-50 p-1 rounded-xl">
                {(['expense', 'income', 'savings'] as const).map(t => (
                  <button key={t} type="button" onClick={() => { setType(t); setCategoryId(''); setIsDebtRelated(false); setDebtAction(null); setShowCategoryPicker(false); }} className={`py-1.5 rounded-lg font-black text-[9px] uppercase tracking-wider transition-all ${type === t ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>
                    {t === 'expense' ? 'Трата' : t === 'income' ? 'Доход' : 'Цель'}
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex gap-1.5">
                <div className={`relative flex-grow h-14 rounded-xl px-4 flex items-center border transition-all ${isSubscriptionPayment ? 'bg-slate-100 border-slate-200' : 'bg-slate-50 border-slate-100 focus-within:ring-2 focus-within:ring-indigo-100'}`}>
                  <input 
                    type="number" 
                    inputMode="decimal" 
                    value={amount} 
                    onChange={(e) => setAmount(e.target.value)} 
                    placeholder="0" 
                    className={`w-full bg-transparent text-3xl font-black outline-none placeholder:text-slate-200 ${isSubscriptionPayment ? 'text-slate-400 cursor-not-allowed' : 'text-slate-900'}`} 
                    required 
                    readOnly={isSubscriptionPayment}
                  />
                  <span className="text-lg font-black text-slate-300 ml-1">₽</span>
                </div>
                {!isSubscriptionPayment && (
                  <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()} 
                    disabled={isProcessing}
                    className="w-14 h-14 bg-slate-900 text-white rounded-xl flex items-center justify-center hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 shrink-0 shadow-lg shadow-slate-200"
                  >
                    {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <QrCode size={20} />}
                  </button>
                )}
              </div>
              <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={() => {}} />
              {statusText && <p className="text-[9px] text-center font-bold text-indigo-500">{statusText}</p>}
            </div>

            {/* Category Dropdown Button - Hidden for Subscriptions per user request */}
            {!isSubscriptionPayment && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowCategoryPicker(!showCategoryPicker)}
                  className={`w-full h-11 px-4 rounded-xl border flex items-center justify-between transition-all ${categoryId ? 'bg-indigo-50 border-indigo-200 shadow-inner' : 'bg-slate-50 border-slate-100'}`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg">{selectedCategory?.icon || (isDebtRelated ? '🤝' : '📦')}</span>
                    <span className={`text-[11px] font-black uppercase tracking-tight ${selectedCategory ? 'text-indigo-900' : 'text-slate-400'}`}>
                      {selectedCategory?.name || (isDebtRelated ? 'Без категории (Долг)' : 'Выбрать категорию')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {categoryId && (
                      <div onClick={clearCategory} className="p-1 rounded-md bg-white text-rose-400 hover:text-rose-600 border border-rose-100 shadow-sm transition-all active:scale-75">
                        <X size={12} strokeWidth={3} />
                      </div>
                    )}
                    {showCategoryPicker ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                  </div>
                </button>

                {showCategoryPicker && (
                  <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-white border border-slate-100 rounded-xl shadow-xl overflow-hidden animate-slide-up max-h-56 overflow-y-auto no-scrollbar p-1 grid grid-cols-3 gap-1">
                    <button
                      type="button"
                      onClick={() => { setCategoryId(''); setShowCategoryPicker(false); }}
                      className="flex items-center gap-2 p-2 rounded-lg bg-slate-50/50 text-slate-400 italic"
                    >
                      <Eraser size={14} />
                      <span className="text-[9px] font-bold uppercase">Сброс</span>
                    </button>
                    {categories.filter(c => c.type === type).map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => { setCategoryId(cat.id); setShowCategoryPicker(false); }}
                        className={`flex items-center gap-2 p-2 rounded-lg transition-all ${categoryId === cat.id ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50 text-slate-600'}`}
                      >
                        <span className="text-base">{cat.icon}</span>
                        <span className="text-[9px] font-bold truncate uppercase">{cat.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!isSubscriptionPayment && (type === 'expense' || type === 'income') && (
              <div className="grid grid-cols-2 gap-1.5">
                <button 
                  type="button" 
                  onClick={() => handleDebtActionSelect('increase')}
                  className={`h-10 rounded-xl border flex items-center justify-center gap-2 transition-all ${debtAction === 'increase' ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-100 shadow-sm' : 'bg-slate-50 border-slate-100 opacity-60'}`}
                >
                  <UserPlus size={14} className={debtAction === 'increase' ? 'text-amber-600' : 'text-slate-400'} />
                  <span className="text-[9px] font-black uppercase tracking-tighter">
                    {type === 'expense' ? 'Дал в долг' : 'Взял в долг'}
                  </span>
                </button>
                <button 
                  type="button" 
                  onClick={() => handleDebtActionSelect('decrease')}
                  className={`h-10 rounded-xl border flex items-center justify-center gap-2 transition-all ${debtAction === 'decrease' ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-100 shadow-sm' : 'bg-slate-50 border-slate-100 opacity-60'}`}
                >
                  <HandCoins size={14} className={debtAction === 'decrease' ? 'text-amber-600' : 'text-slate-400'} />
                  <span className="text-[9px] font-black uppercase tracking-tighter">
                    {type === 'expense' ? 'Вернул долг' : 'Мне вернули'}
                  </span>
                </button>
              </div>
            )}

            {isDebtRelated && (
              <div className="p-3 bg-amber-50/40 rounded-xl border border-amber-100 space-y-2 animate-slide-up">
                {!selectedDebtId && !newDebtName ? (
                  <div className="space-y-1.5">
                    <div className="relative">
                      <input 
                        type="text" 
                        placeholder={debtPlaceholder}
                        className="w-full h-8 bg-white border border-amber-200 rounded-lg p-2 pl-8 text-[10px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-amber-200 transition-all"
                        value={debtSearch}
                        onChange={e => setDebtSearch(e.target.value)}
                      />
                      <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-amber-400" />
                    </div>
                    <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                      {filteredDebts.length > 0 ? (
                        filteredDebts.map(d => (
                          <button key={d.id} type="button" onClick={() => setSelectedDebtId(d.id)} className="flex-shrink-0 px-2.5 py-1 bg-white border border-amber-200 rounded-md text-[9px] font-bold text-amber-700 active:scale-95">
                            {d.personName}
                          </button>
                        ))
                      ) : debtSearch ? (
                        <button type="button" onClick={() => setNewDebtName(debtSearch)} className="flex-shrink-0 px-2.5 py-1 bg-amber-600 text-white rounded-md text-[9px] font-bold flex items-center gap-1 active:scale-95">
                          <Plus size={10} /> {debtSearch}
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-amber-200 shadow-sm">
                    <div className="flex items-center gap-2">
                       <div className="w-6 h-6 bg-amber-100 rounded flex items-center justify-center text-amber-600"><Check size={12} strokeWidth={3} /></div>
                       <p className="text-[10px] font-black text-amber-800 uppercase">{selectedDebtId ? debts.find(d => d.id === selectedDebtId)?.personName : newDebtName}</p>
                    </div>
                    <button type="button" onClick={() => { setSelectedDebtId(''); setNewDebtName(''); }} className="p-1 text-amber-300 hover:text-amber-500"><X size={14} /></button>
                  </div>
                )}
              </div>
            )}

            {!isSubscriptionPayment && (
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsJoint(!isJoint)}
                  className={`h-10 px-3 rounded-xl border flex items-center justify-between transition-all ${isJoint ? 'border-indigo-600 bg-indigo-50 shadow-sm' : 'border-slate-100 bg-slate-50 opacity-70'}`}
                >
                  <div className="flex items-center gap-2">
                    <Users size={14} className={isJoint ? 'text-indigo-600' : 'text-slate-400'} />
                    <span className={`text-[9px] font-black uppercase tracking-tight ${isJoint ? 'text-indigo-900' : 'text-slate-500'}`}>Общий</span>
                  </div>
                  <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${isJoint ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'}`}>
                    {isJoint && <Check size={8} strokeWidth={4} />}
                  </div>
                </button>
                <button 
                  type="button" 
                  onClick={() => setIsPlanned(!isPlanned)} 
                  className={`h-10 rounded-xl border flex items-center justify-center gap-2 font-black text-[9px] uppercase tracking-wide transition-all ${isPlanned ? 'border-amber-400 bg-amber-50 text-amber-600 shadow-sm' : 'border-slate-100 bg-slate-50 text-slate-400'}`}
                >
                  <Clock size={14} /> В план
                </button>
              </div>
            )}

            <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {accounts.map(acc => (
                <button 
                  key={acc.id} 
                  type="button" 
                  disabled={isSubscriptionPayment}
                  onClick={() => setAccountId(acc.id)} 
                  className={`flex-shrink-0 px-3.5 py-2 rounded-xl border transition-all font-black text-[10px] uppercase flex items-center gap-1.5 ${accountId === acc.id ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-slate-100 bg-slate-50 text-slate-400'} ${isSubscriptionPayment ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <span>{acc.icon}</span> {acc.name}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <input 
                type="text" 
                value={note} 
                onChange={e => setNote(e.target.value)} 
                placeholder="Заметка..." 
                className="h-10 bg-slate-50 border border-slate-100 rounded-xl px-3 text-[11px] font-bold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all shadow-inner" 
                readOnly={isSubscriptionPayment}
              />
              <div className="h-10 bg-slate-50 rounded-xl px-3 flex items-center gap-2 border border-slate-100 focus-within:bg-white transition-all shadow-inner">
                <Calendar size={12} className="text-slate-400 shrink-0" />
                <input 
                  type="date" 
                  value={date} 
                  onChange={e => setDate(e.target.value)} 
                  className="bg-transparent text-[10px] font-bold outline-none w-full text-slate-700" 
                  readOnly={isSubscriptionPayment}
                />
              </div>
            </div>

            {/* Сетка кнопок 1х2 для редактирования */}
            <div className={`grid ${initialData ? 'grid-cols-2' : 'grid-cols-1'} gap-3 mt-1 mb-2`}>
              {initialData && (
                <button 
                  type="button" 
                  onClick={handleDelete}
                  className="h-14 bg-rose-50 text-rose-500 rounded-2xl font-black text-[12px] uppercase tracking-widest active:scale-[0.98] transition-all flex items-center justify-center gap-2 border border-rose-100"
                >
                  <Trash2 size={16} /> {isSubscriptionPayment ? 'Отменить' : 'Удалить'}
                </button>
              )}
              <button 
                type="submit" 
                disabled={!amount || (!categoryId && !isDebtRelated && !isSubscriptionPayment) || !accountId || isProcessing || (isDebtRelated && !selectedDebtId && !newDebtName)} 
                className="h-14 bg-slate-900 text-white rounded-2xl font-black text-[12px] uppercase tracking-widest shadow-xl active:scale-[0.98] transition-all disabled:opacity-20"
              >
                {initialData ? 'Обновить' : 'Сохранить'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
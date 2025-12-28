
import React, { useState, useEffect, useRef } from 'react';
import { X, Calendar, Wallet, Loader2, Camera, Clock, CreditCard, Users, Check } from 'lucide-react';
import { Transaction, Category, TransactionType, Account } from '../types';
import { processVisualInput } from '../services/aiService';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaction: Omit<Transaction, 'id'>) => void;
  categories: Category[];
  accounts: Account[];
  initialData?: Transaction;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({ isOpen, onClose, onSave, categories, accounts, initialData }) => {
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
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setType(initialData.type);
        setAmount(initialData.amount.toString());
        setCategoryId(initialData.categoryId);
        setAccountId(initialData.accountId);
        setNote(initialData.note);
        setDate(initialData.date.split('T')[0]);
        setIsPlanned(initialData.isPlanned || false);
        setIsJoint(initialData.isJoint || false);
      } else {
        setAmount('');
        setCategoryId('');
        setNote('');
        setStatusText('');
        setIsJoint(false);
        setIsPlanned(false);
        setType('expense');
        setDate(new Date().toISOString().split('T')[0]);
        if (accounts.length > 0) setAccountId(accounts[0].id);
      }
    }
  }, [isOpen, initialData, accounts]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    setStatusText('Mistral сканирует...');

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      const base64Full = reader.result as string;
      const base64Data = base64Full.split(',')[1];
      
      const result = await processVisualInput(base64Data, categories);
      if (result && result.amount) {
        setAmount(result.amount.toString());
        if (result.categoryName) {
          const cat = categories.find(c => c.name.toLowerCase().includes(result.categoryName.toLowerCase()));
          if (cat) setCategoryId(cat.id);
        }
        if (result.note) setNote(result.note);
        setStatusText('Успех! ✨');
      } else {
        setStatusText('Ошибка анализа');
      }
      setIsProcessing(false);
      setTimeout(() => setStatusText(''), 3000);
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !categoryId || !accountId) return;
    onSave({
      amount: parseFloat(amount),
      categoryId,
      accountId,
      note,
      date: new Date(date).toISOString(),
      type,
      isPlanned,
      isJoint
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-t-[3rem] shadow-2xl animate-slide-up flex flex-col max-h-[95vh]">
        <div className="w-16 h-1.5 bg-slate-100 rounded-full mx-auto mt-4 mb-2" />
        <div className="px-8 pb-10 overflow-y-auto no-scrollbar">
          <div className="flex justify-between items-center mb-6 pt-2">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">{initialData ? 'Изменить' : 'Запись'}</h2>
            <button onClick={onClose} className="p-3 bg-slate-50 rounded-full text-slate-400"><X size={20} /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2 rounded-2xl">
              {(['expense', 'income', 'savings'] as const).map(t => (
                <button key={t} type="button" onClick={() => { setType(t); setCategoryId(''); }} className={`py-3 rounded-xl font-bold text-[11px] uppercase transition-all ${type === t ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>
                  {t === 'expense' ? 'Трата' : t === 'income' ? 'Доход' : 'Цель'}
                </button>
              ))}
            </div>
            {!initialData && (
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()} 
                disabled={isProcessing}
                className="w-full py-4 bg-orange-50 border border-orange-100 rounded-2xl text-orange-600 text-[12px] font-bold uppercase tracking-wider flex items-center justify-center gap-2"
              >
                {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Camera size={18} />}
                {statusText || 'Сканировать чек (Mistral)'}
              </button>
            )}
            <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleFileUpload} />
            <div className="relative flex items-center bg-slate-50 rounded-2xl px-6 py-6 border border-slate-100">
              <input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className="w-full bg-transparent text-5xl font-bold text-slate-900 outline-none" required />
            </div>
            <div className="grid grid-cols-4 gap-3">
              {categories.filter(c => c.type === type).map(cat => (
                <button key={cat.id} type="button" onClick={() => setCategoryId(cat.id)} className={`aspect-square rounded-2xl flex flex-col items-center justify-center gap-1.5 border transition-all ${categoryId === cat.id ? 'border-indigo-600 bg-indigo-50 shadow-md' : 'border-slate-50 bg-slate-50 opacity-70'}`}>
                  <span className="text-2xl">{cat.icon}</span>
                </button>
              ))}
            </div>
            <button type="submit" disabled={!amount || !categoryId} className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-bold text-[15px] uppercase tracking-widest shadow-xl">
              {initialData ? 'Обновить' : 'Сохранить'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

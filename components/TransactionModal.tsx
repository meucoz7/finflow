
import React, { useState, useEffect, useRef } from 'react';
import { X, Calendar, Wallet, Loader2, QrCode, Camera, Clock, CreditCard, Users, Sparkles, Check } from 'lucide-react';
import { Transaction, Category, TransactionType, Account } from '../types';
import { processVisualInput } from '../services/aiService';
import jsQR from 'jsqr';

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
  }, [isOpen, accounts, initialData]);

  const parseQRString = (str: string) => {
    const params = new URLSearchParams(str);
    const s = params.get('s');
    if (s) {
       setAmount(s);
       setStatusText('Чек распознан! ✅');
       const foodCat = categories.find(c => c.name.toLowerCase().includes('продукт'));
       if (foodCat) setCategoryId(foodCat.id);
       return true;
    }
    return false;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    setStatusText('Загрузка...');

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      const base64Full = reader.result as string;
      const base64Data = base64Full.split(',')[1];
      const img = new Image();
      img.src = base64Full;
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width; canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
        if (imageData) {
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && parseQRString(code.data)) {
            setIsProcessing(false); return;
          }
        }
        setStatusText('Анализ...');
        const result = await processVisualInput(base64Data, categories);
        if (result && result.amount) {
          setAmount(result.amount.toString());
          if (result.categoryName) {
            const cat = categories.find(c => c.name.toLowerCase().includes(result.categoryName.toLowerCase()));
            if (cat) setCategoryId(cat.id);
          }
          if (result.note) setNote(result.note);
          setStatusText('Готово! ✨');
        } else {
          setStatusText('Ошибка.');
        }
        setIsProcessing(false);
        setTimeout(() => setStatusText(''), 3000);
      };
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
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">{initialData ? 'Изменить' : 'Новая запись'}</h2>
            <button onClick={onClose} className="p-3 bg-slate-50 rounded-full text-slate-400 active:scale-90 transition-all"><X size={20} /></button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2 rounded-2xl">
              {(['expense', 'income', 'savings'] as const).map(t => (
                <button key={t} type="button" onClick={() => { setType(t); setCategoryId(''); }} className={`py-3 rounded-xl font-bold text-[11px] uppercase tracking-wide transition-all ${type === t ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>
                  {t === 'expense' ? 'Трата' : t === 'income' ? 'Доход' : 'Цель'}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {!initialData && (
                <button 
                  type="button" 
                  onClick={() => fileInputRef.current?.click()} 
                  disabled={isProcessing}
                  className="w-full py-4 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-600 text-[12px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-indigo-100 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Camera size={18} />}
                  {statusText || 'Сканировать чек'}
                </button>
              )}
              <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleFileUpload} />

              <div className="relative flex items-center bg-slate-50 rounded-2xl px-6 py-6 border border-slate-100">
                <input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className="w-full bg-transparent text-5xl font-bold text-slate-900 outline-none placeholder:text-slate-200" required />
                <span className="text-2xl font-bold text-slate-300">₽</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsJoint(!isJoint)}
              className={`w-full p-5 rounded-2xl border flex items-center justify-between transition-all ${isJoint ? 'border-indigo-600 bg-indigo-50 shadow-sm' : 'border-slate-100 bg-slate-50 opacity-70'}`}
            >
              <div className="flex items-center gap-4">
                <Users size={20} className={isJoint ? 'text-indigo-600' : 'text-slate-400'} />
                <span className={`text-[12px] font-bold uppercase tracking-wide ${isJoint ? 'text-indigo-900' : 'text-slate-500'}`}>Общий бюджет</span>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isJoint ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200'}`}>
                {isJoint && <Check size={14} strokeWidth={3} />}
              </div>
            </button>

            <div className="space-y-3">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest ml-1">Кошелек</label>
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                {accounts.map(acc => (
                  <button key={acc.id} type="button" onClick={() => setAccountId(acc.id)} className={`flex-shrink-0 px-5 py-3 rounded-xl border transition-all font-bold text-[12px] flex items-center gap-2.5 ${accountId === acc.id ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-slate-100 bg-slate-50 text-slate-400 opacity-80'}`}>
                    <span className="text-lg">{acc.icon}</span> {acc.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
              {categories.filter(c => c.type === type).map(cat => (
                <button key={cat.id} type="button" onClick={() => setCategoryId(cat.id)} className={`aspect-square rounded-2xl flex flex-col items-center justify-center gap-1.5 border transition-all ${categoryId === cat.id ? 'border-indigo-600 bg-indigo-50 shadow-md scale-105' : 'border-slate-50 bg-slate-50 opacity-70'}`}>
                  <span className="text-2xl">{cat.icon}</span>
                  <span className="text-[11px] font-bold text-slate-500 truncate w-full text-center px-1 tracking-tight">{cat.name}</span>
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="Заметка о покупке..." className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-[14px] font-medium text-slate-700 outline-none focus:bg-white focus:ring-4 focus:ring-indigo-50 transition-all" />
              <div className="flex gap-3">
                 <div className="flex-grow bg-slate-50 rounded-2xl p-4 flex items-center gap-3 border border-slate-100">
                    <Calendar size={18} className="text-slate-400" />
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-transparent text-[13px] font-bold outline-none w-full text-slate-700" />
                 </div>
                 <button type="button" onClick={() => setIsPlanned(!isPlanned)} className={`px-5 rounded-2xl border flex items-center gap-2 font-bold text-[12px] uppercase tracking-wide transition-all ${isPlanned ? 'border-amber-400 bg-amber-50 text-amber-600' : 'border-slate-100 bg-slate-50 text-slate-400'}`}>
                  <Clock size={16} /> План
                </button>
              </div>
            </div>

            <button type="submit" disabled={!amount || !categoryId || !accountId || isProcessing} className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-bold text-[15px] uppercase tracking-[0.1em] shadow-xl shadow-slate-200 active:scale-[0.98] transition-all disabled:opacity-20 mt-4">
              {initialData ? 'Обновить' : 'Сохранить'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

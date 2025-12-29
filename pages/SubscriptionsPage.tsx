
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppState, Subscription } from '../types';
import { 
  Plus, 
  Trash2, 
  ChevronLeft, 
  RefreshCw, 
  Calendar, 
  Bell, 
  CreditCard, 
  Palette, 
  Check, 
  X,
  AlertCircle,
  BellRing,
  ChevronDown,
  ChevronUp,
  Search,
  Sparkles
} from 'lucide-react';

interface SubscriptionsPageProps {
  state: AppState;
  onUpdateState: (newState: Partial<AppState>) => void;
}

const SUB_ICONS = [
  '🎬', '🎵', '📺', '📱', '🏋️', '🏠', '🥘', '🎮', '🚗', '🌐', 
  '🛡️', '📦', '🍿', '🎧', '📖', '🍏', '🍕', '🧼', '✈️', '💻',
  '💡', '📞', '⚽️', '🧸', '💊', '🔋', '➕', '⭐️', '💎', '🔥'
];

const POPULAR_SERVICES = [
  { name: 'Яндекс Плюс', icon: '➕', color: '#ffcc00' },
  { name: 'Кинопоиск', icon: '🍿', color: '#ff6600' },
  { name: 'СберПрайм', icon: '🍏', color: '#21a038' },
  { name: 'VK Музыка', icon: '💙', color: '#0077ff' },
  { name: 'IVI', icon: '🎬', color: '#ec1026' },
  { name: 'Okko', icon: '🟣', color: '#7b00ff' },
  { name: 'Литрес', icon: '📖', color: '#ff8200' },
  { name: 'Wink', icon: '🎥', color: '#ff005b' },
  { name: 'МТС Premium', icon: '🔴', color: '#e30613' },
  { name: 'Ozon Premium', icon: '🔵', color: '#005bff' },
];

export const SubscriptionsPage: React.FC<SubscriptionsPageProps> = ({ state, onUpdateState }) => {
  const navigate = useNavigate();
  const { subscriptions = [], profile, accounts, categories } = state;
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const iconPickerRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState<Omit<Subscription, 'id'>>({
    name: '',
    amount: 0,
    period: 'monthly',
    nextPaymentDate: new Date().toISOString().split('T')[0],
    categoryId: categories.find(c => c.type === 'expense')?.id || '',
    accountId: accounts[0]?.id || '',
    isActive: true,
    reminderDays: 1,
    icon: '🎬',
    color: '#6366f1'
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (iconPickerRef.current && !iconPickerRef.current.contains(event.target as Node)) {
        setShowIconPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const saveSub = () => {
    if (!form.name || form.amount <= 0) return;
    
    if (editingId) {
      const updated = subscriptions.map(s => s.id === editingId ? { ...form, id: s.id } : s);
      onUpdateState({ subscriptions: updated });
    } else {
      const newSub: Subscription = { ...form, id: `sub_${Date.now()}` };
      onUpdateState({ subscriptions: [...subscriptions, newSub] });
    }
    resetForm();
  };

  const deleteSub = (id: string) => {
    if (confirm('Удалить эту подписку?')) {
      onUpdateState({ subscriptions: subscriptions.filter(s => s.id !== id) });
    }
  };

  const resetForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setShowIconPicker(false);
    setForm({
      name: '', amount: 0, period: 'monthly', nextPaymentDate: new Date().toISOString().split('T')[0],
      categoryId: categories.find(c => c.type === 'expense')?.id || '', accountId: accounts[0]?.id || '',
      isActive: true, reminderDays: 1, icon: '🎬', color: '#6366f1'
    });
  };

  const startEdit = (sub: Subscription) => {
    setEditingId(sub.id);
    setForm({ ...sub });
    setIsAdding(true);
  };

  const selectPreset = (service: typeof POPULAR_SERVICES[0]) => {
    setForm(prev => ({
      ...prev,
      name: service.name,
      icon: service.icon,
      color: service.color
    }));
  };

  return (
    <div className="space-y-6 animate-slide-up pb-32 pt-[env(safe-area-inset-top,8px)]">
      <header className="px-2 pt-2 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-500 shadow-sm active:scale-90 transition-all">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-indigo-600 text-[10px] font-black uppercase tracking-[0.2em] mb-1">МЕНЕДЖЕР</h1>
            <p className="text-slate-900 font-black text-2xl tracking-tighter">Подписки</p>
          </div>
        </div>
        <button 
          onClick={() => isAdding ? resetForm() : setIsAdding(true)}
          className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all shadow-lg active:scale-90 ${isAdding ? 'bg-slate-900 text-white' : 'bg-white border border-slate-100 text-slate-900'}`}
        >
          {isAdding ? <X size={20} strokeWidth={3} /> : <Plus size={24} strokeWidth={3} />}
        </button>
      </header>

      {isAdding && (
        <div className="px-1 animate-slide-up space-y-4">
          {/* Quick Presets Slider */}
          {!editingId && (
            <div className="space-y-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3 flex items-center gap-1.5">
                <Sparkles size={12} className="text-amber-500" /> Популярные сервисы
              </p>
              <div className="flex gap-2 overflow-x-auto no-scrollbar px-1 pb-1">
                {POPULAR_SERVICES.map(service => (
                  <button
                    key={service.name}
                    onClick={() => selectPreset(service)}
                    className="flex-shrink-0 bg-white px-4 py-3 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-2.5 active:scale-95 transition-all"
                  >
                    <span className="text-lg">{service.icon}</span>
                    <span className="text-[11px] font-bold text-slate-700 whitespace-nowrap">{service.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white p-6 rounded-[2.5rem] shadow-2xl border border-slate-100 space-y-5">
            <div className="flex gap-3">
              {/* Enhanced Icon Picker */}
              <div className="relative" ref={iconPickerRef}>
                <button 
                  type="button"
                  onClick={() => setShowIconPicker(!showIconPicker)}
                  className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-3xl shadow-inner active:scale-95 transition-all"
                  style={{ color: form.color, backgroundColor: `${form.color}10` }}
                >
                  {form.icon}
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white border border-slate-100 rounded-full flex items-center justify-center text-slate-400 shadow-sm">
                    {showIconPicker ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                  </div>
                </button>

                {showIconPicker && (
                  <div className="absolute left-0 top-full mt-3 z-[100] w-64 bg-white rounded-3xl shadow-2xl border border-slate-100 p-4 animate-slide-up origin-top-left">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">Выберите иконку</p>
                    <div className="grid grid-cols-5 gap-2 max-h-48 overflow-y-auto no-scrollbar pb-1">
                      {SUB_ICONS.map(icon => (
                        <button 
                          key={icon}
                          onClick={() => {
                            setForm({...form, icon});
                            setShowIconPicker(false);
                          }}
                          className={`aspect-square flex items-center justify-center text-2xl rounded-xl transition-all ${form.icon === icon ? 'bg-indigo-50 shadow-inner scale-110 ring-2 ring-indigo-100' : 'hover:bg-slate-50'}`}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <input 
                type="text" placeholder="Название (Netflix, Gym...)"
                className="flex-grow bg-slate-50 p-4 rounded-2xl font-bold text-slate-900 outline-none border border-slate-100 focus:bg-white focus:ring-4 focus:ring-indigo-50 transition-all text-sm shadow-inner"
                value={form.name} onChange={e => setForm({...form, name: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
               <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Сумма</label>
                 <div className="relative">
                    <input type="number" className="w-full bg-slate-50 p-4 rounded-2xl font-black text-xl outline-none shadow-inner" value={form.amount || ''} onChange={e => setForm({...form, amount: parseFloat(e.target.value) || 0})} />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 font-bold">{profile.currency}</span>
                 </div>
               </div>
               <div className="space-y-1">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Период</label>
                 <select className="w-full h-14 bg-slate-50 p-4 rounded-2xl font-bold text-sm outline-none border border-slate-100 appearance-none shadow-inner" value={form.period} onChange={e => setForm({...form, period: e.target.value as any})}>
                   <option value="weekly">Неделя</option>
                   <option value="monthly">Месяц</option>
                   <option value="yearly">Год</option>
                 </select>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
               <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">След. платеж</label>
                  <input type="date" className="w-full h-12 bg-slate-50 px-4 rounded-xl text-xs font-bold border border-slate-100 shadow-inner" value={form.nextPaymentDate} onChange={e => setForm({...form, nextPaymentDate: e.target.value})} />
               </div>
               <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Уведомление (бот)</label>
                  <div className="flex gap-1 h-12 p-1 bg-slate-50 rounded-xl shadow-inner border border-slate-100">
                    {[1, 2].map(d => (
                      <button key={d} onClick={() => setForm({...form, reminderDays: d})} className={`flex-1 rounded-lg text-[10px] font-black uppercase transition-all ${form.reminderDays === d ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400'}`}>За {d} дн.</button>
                    ))}
                  </div>
               </div>
            </div>

            <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 flex items-start gap-3">
               <BellRing size={16} className="text-indigo-500 mt-0.5" />
               <p className="text-[10px] text-indigo-700 font-bold leading-relaxed">
                 Telegram-бот пришлет вам напоминание за {form.reminderDays} {form.reminderDays === 1 ? 'день' : 'дня'} до списания.
               </p>
            </div>

            <div className="flex gap-3 pt-2">
               <button onClick={resetForm} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[11px] tracking-widest active:scale-95 transition-all">Отмена</button>
               <button onClick={saveSub} className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl active:scale-95 transition-all">
                  {editingId ? 'Обновить' : 'Сохранить'}
               </button>
            </div>
          </div>
        </div>
      )}

      <div className="px-1 space-y-3">
        {subscriptions.length === 0 && !isAdding ? (
          <div className="bg-white py-16 rounded-[2.5rem] border border-dashed border-slate-200 text-center flex flex-col items-center gap-3">
            <RefreshCw size={40} className="text-slate-100" />
            <p className="text-slate-400 text-[11px] font-black uppercase tracking-widest">Список подписок пуст</p>
          </div>
        ) : (
          subscriptions.map(sub => {
            const daysLeft = Math.ceil((new Date(sub.nextPaymentDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
            return (
              <div 
                key={sub.id} 
                onClick={() => startEdit(sub)}
                className={`bg-white p-5 rounded-[2.2rem] border shadow-sm flex items-center justify-between active:scale-[0.98] transition-all group ${!sub.isActive ? 'opacity-50 grayscale' : 'border-slate-50'}`}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-2xl shadow-inner shrink-0 group-hover:scale-110 transition-transform" style={{ color: sub.color, backgroundColor: `${sub.color}10` }}>
                    {sub.icon}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-900 text-[14px] uppercase tracking-tight truncate">{sub.name}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                       <p className="text-[9px] text-slate-400 font-black uppercase">
                         {new Date(sub.nextPaymentDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                       </p>
                       <div className="w-1 h-1 bg-slate-200 rounded-full" />
                       <p className={`text-[9px] font-black uppercase ${daysLeft <= 3 ? 'text-rose-500' : 'text-indigo-500'}`}>
                         {daysLeft === 0 ? 'Сегодня' : daysLeft < 0 ? 'Просрочено' : `Через ${daysLeft} дн.`}
                       </p>
                    </div>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                   <p className="text-[16px] font-black text-slate-900 tracking-tight">{sub.amount.toLocaleString()} {profile.currency}</p>
                   <p className="text-[8px] font-bold text-slate-300 uppercase tracking-[0.2em]">{sub.period === 'monthly' ? 'Ежемесячно' : sub.period === 'yearly' ? 'Ежегодно' : 'Еженедельно'}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mx-1 p-5 bg-slate-50 rounded-[2rem] border border-slate-100 flex gap-4 items-center">
         <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-amber-500 shadow-sm shrink-0">
            <Bell size={24} />
         </div>
         <p className="text-[11px] text-slate-500 font-bold leading-relaxed">
            Мы автоматически добавим эти платежи в ваш <strong>Календарь планов</strong>. Не забудьте пометить их как выполненные после оплаты!
         </p>
      </div>
    </div>
  );
};

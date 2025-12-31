
import React, { useState, useMemo } from 'react';
import { AppState, Category, TransactionType } from '../types';
import { Plus, Trash2, Edit2, ShoppingBag, Sparkles, Palette, Check, X } from 'lucide-react';

interface CategoriesProps {
  state: AppState;
  onUpdateState: (newState: Partial<AppState>) => void;
}

const PRESET_COLORS = [
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#f43f5e', // Rose
  '#f97316', // Orange
  '#f59e0b', // Amber
  '#eab308', // Yellow
  '#84cc16', // Lime
  '#10b981', // Emerald
  '#14b8a6', // Teal
  '#0ea5e9', // Sky
  '#3b82f6', // Blue
  '#64748b', // Slate
  '#94a3b8', // Gray-Blue
  '#a8a29e', // Stone
];

const ICON_GROUPS = [
  { name: 'Еда', icons: ['🍎', '🍔', '🍕', '🍣', '🍦', '☕', '🍹', '🥖', '🥦'] },
  { name: 'Транспорт', icons: ['🚌', '🚕', '✈️', '⛽', '🚲', '🛴', '🚆', '🚀', '🚗'] },
  { name: 'Покупки', icons: ['🛒', '🛍️', '👕', '👟', '💄', '💍', '🎁', '📦', '🧸', '📱'] },
  { name: 'Дом', icons: ['🏠', '🛋️', '🔌', '🛠️', '🧼', '🪴', '🧹', '🔑', '🛏️'] },
  { name: 'Досуг', icons: ['🎬', '🎮', '🎸', '🎟️', '🎳', '🎨', '📸', '🎭', '🎡'] },
  { name: 'Здоровье', icons: ['💊', '🏋️', '🦷', '🩺', '🧘', '🩹', '🌡️', '🏃', '🚴'] },
  { name: 'Финансы', icons: ['💰', '💼', '📈', '💳', '🏛️', '💎', '💸', '🏦', '💹'] },
];

export const Categories: React.FC<CategoriesProps> = ({ state, onUpdateState }) => {
  const [activeType, setActiveType] = useState<Exclude<TransactionType, 'savings'>>('expense');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [newCat, setNewCat] = useState({ name: '', icon: '📦', color: '#6366f1' });

  const filtered = state.categories.filter(c => c.type === activeType);

  const config = useMemo(() => {
    if (activeType === 'income') {
      return {
        title: 'Доходы',
        placeholder: 'Например: Зарплата',
        defaultColor: '#10b981',
        icon: <Sparkles size={14} />,
        accent: 'text-emerald-500'
      };
    }
    return {
      title: 'Расходы',
      placeholder: 'Например: Кафе',
      defaultColor: '#6366f1',
      icon: <ShoppingBag size={14} />,
      accent: 'text-indigo-500'
    };
  }, [activeType]);

  const resetForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setShowIconPicker(false);
    setNewCat({ name: '', icon: '📦', color: config.defaultColor });
  };

  const handleToggleForm = () => {
    if (isAdding || editingId) {
      resetForm();
    } else {
      setIsAdding(true);
    }
  };

  const startEditing = (cat: Category) => {
    setEditingId(cat.id);
    setIsAdding(false); // Прячем флаг добавления, чтобы не было конфликта
    setNewCat({ name: cat.name, icon: cat.icon, color: cat.color });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const addCategory = () => {
    if (!newCat.name) return;

    if (editingId) {
      // Режим редактирования
      const updatedCategories = state.categories.map(c => 
        c.id === editingId ? { ...c, ...newCat } : c
      );
      onUpdateState({ categories: updatedCategories });
    } else {
      // Режим создания
      const cat: Category = { ...newCat, id: Date.now().toString(), type: activeType };
      onUpdateState({ categories: [...state.categories, cat] });
    }

    resetForm();
  };

  const deleteCategory = (id: string) => {
    if (confirm('Удалить эту категорию? Это не удалит прошлые операции, но они останутся без группы.')) {
      onUpdateState({ categories: state.categories.filter(c => c.id !== id) });
    }
  };

  return (
    <div className="space-y-4 animate-slide-up pb-24 pt-[env(safe-area-inset-top,8px)] outline-none">
      <header className="flex justify-between items-center px-1 pt-1">
        <div>
          <h1 className={`${config.accent} text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-1.5`}>
            {config.icon} Настройка групп
          </h1>
          <p className="text-slate-900 font-black text-base">
            {editingId ? 'Редактирование' : config.title}
          </p>
        </div>
        <button 
          onClick={handleToggleForm}
          className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-all active:scale-90 outline-none focus:outline-none ${
            isAdding || editingId ? 'bg-slate-900 text-white rotate-45' : 'bg-white border border-slate-100 text-slate-900'
          }`}
        >
          <Plus size={20} strokeWidth={3} />
        </button>
      </header>

      <div className="bg-slate-100 p-1.5 rounded-2xl flex gap-1 mx-0.5">
        {(['expense', 'income'] as const).map(t => (
          <button 
            key={t}
            onClick={() => { setActiveType(t); resetForm(); }}
            className={`flex-1 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all outline-none focus:outline-none ${
              activeType === t ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'
            }`}
          >
            {t === 'expense' ? 'Траты' : 'Доходы'}
          </button>
        ))}
      </div>

      {(isAdding || editingId) && (
        <div className="bg-white p-6 rounded-[2.5rem] shadow-2xl border border-slate-100 space-y-6 animate-slide-up relative overflow-hidden outline-none">
          <div className="absolute top-0 left-0 w-full h-2" style={{ backgroundColor: newCat.color }} />
          
          <div className="flex justify-between items-center -mb-2">
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{editingId ? 'Правка категории' : 'Новая категория'}</span>
             <button onClick={resetForm} className="text-slate-300 hover:text-rose-500"><X size={18} /></button>
          </div>

          <div className="space-y-5">
            <div className="flex gap-4">
              <button 
                type="button"
                onClick={() => setShowIconPicker(!showIconPicker)}
                className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-inner border transition-all outline-none focus:outline-none ${showIconPicker ? 'ring-4 ring-indigo-100 border-indigo-200 bg-white' : 'border-slate-50 bg-slate-50'}`}
                style={!showIconPicker ? { backgroundColor: `${newCat.color}10`, color: newCat.color } : {}}
              >
                {newCat.icon}
              </button>
              <input 
                type="text" 
                placeholder={config.placeholder}
                className="flex-grow bg-slate-50 p-4 rounded-2xl font-bold text-slate-800 outline-none focus:outline-none text-[16px] border border-transparent focus:bg-white focus:ring-4 focus:ring-indigo-50 transition-all shadow-sm"
                value={newCat.name}
                onChange={e => setNewCat({...newCat, name: e.target.value})}
                autoFocus
              />
            </div>

            {showIconPicker && (
              <div className="bg-slate-50 p-4 rounded-3xl animate-slide-up border border-slate-100 max-h-[280px] overflow-y-auto no-scrollbar space-y-4 shadow-inner">
                {ICON_GROUPS.map((group) => (
                  <div key={group.name} className="space-y-2">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">{group.name}</p>
                    <div className="grid grid-cols-5 gap-2">
                      {group.icons.map(icon => (
                        <button
                          key={icon}
                          onClick={() => { setNewCat({...newCat, icon}); setShowIconPicker(false); }}
                          className={`text-xl p-3 rounded-xl transition-all active:scale-75 outline-none focus:outline-none ${newCat.icon === icon ? 'bg-white shadow-md ring-2 ring-indigo-100' : 'hover:bg-white/50'}`}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-4 bg-slate-50/50 p-5 rounded-[2rem] border border-slate-100 shadow-inner">
              <div className="flex justify-between items-center px-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Palette size={12} /> Палитра
                </p>
                <div className="px-2 py-1 bg-white rounded-lg shadow-sm border border-slate-100">
                  <span className="text-[10px] font-black text-slate-900 font-mono">{newCat.color.toUpperCase()}</span>
                </div>
              </div>

              <div className="grid grid-cols-5 gap-3">
                {PRESET_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewCat({...newCat, color})}
                    className={`aspect-square rounded-full transition-all active:scale-90 shadow-sm border-2 flex items-center justify-center outline-none focus:outline-none ${newCat.color === color ? 'border-slate-900 scale-110 shadow-lg' : 'border-white'}`}
                    style={{ backgroundColor: color, boxShadow: newCat.color === color ? `0 0 12px ${color}60` : 'none' }}
                  >
                    {newCat.color === color && <Check size={14} className="text-white" strokeWidth={4} />}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <button 
            onClick={addCategory}
            disabled={!newCat.name}
            className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black uppercase text-[12px] tracking-[0.15em] disabled:opacity-20 transition-all active:scale-95 shadow-xl outline-none focus:outline-none"
          >
            {editingId ? 'Сохранить изменения' : 'Создать группу'}
          </button>
        </div>
      )}

      <div className="space-y-2">
        {filtered.map(cat => (
          <div key={cat.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-50 flex items-center justify-between group active:bg-slate-50 transition-all outline-none">
            <div className="flex items-center gap-4 min-w-0">
              <div 
                className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 shadow-sm transition-transform group-hover:scale-110"
                style={{ backgroundColor: `${cat.color}12`, color: cat.color }}
              >
                {cat.icon}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-slate-900 text-[14px] uppercase truncate tracking-tight">{cat.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                   <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat.color }} />
                   <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">Группа активна</p>
                </div>
              </div>
            </div>
            <div className="flex gap-1 pr-1">
               <button 
                onClick={() => startEditing(cat)}
                className="w-9 h-9 flex items-center justify-center text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 rounded-xl transition-all outline-none"
               >
                <Edit2 size={16} />
               </button>
               <button 
                onClick={() => deleteCategory(cat.id)}
                className="w-9 h-9 flex items-center justify-center text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all outline-none"
               >
                <Trash2 size={16} />
               </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

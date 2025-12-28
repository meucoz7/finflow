
import React, { useState, useMemo, useEffect } from 'react';
import { AppState, Category, TransactionType } from '../types';
import { Plus, Trash2, Edit2, ShoppingBag, Sparkles, Palette } from 'lucide-react';

interface CategoriesProps {
  state: AppState;
  onUpdateState: (newState: Partial<AppState>) => void;
}

const PRESET_COLORS = [
  '#6366f1', // Indigo
  '#10b981', // Emerald
  '#f43f5e', // Rose
  '#f59e0b', // Amber
  '#0ea5e9', // Sky
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#475569', // Slate
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
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [newCat, setNewCat] = useState({ name: '', icon: '📦', color: '#6366f1' });
  const [hue, setHue] = useState(230);

  const filtered = state.categories.filter(c => c.type === activeType);

  const config = useMemo(() => {
    if (activeType === 'income') {
      return {
        title: 'Доходы',
        placeholder: 'Например: Зарплата',
        defaultColor: '#10b981',
        defaultHue: 160,
        icon: <Sparkles size={14} />,
        accent: 'text-emerald-500'
      };
    }
    return {
      title: 'Расходы',
      placeholder: 'Например: Кафе',
      defaultColor: '#6366f1',
      defaultHue: 230,
      icon: <ShoppingBag size={14} />,
      accent: 'text-indigo-500'
    };
  }, [activeType]);

  // Fix: Directly use the 'color' string to avoid type mismatch with 'ctx.fillStyle'
  useEffect(() => {
    const color = `hsl(${hue}, 75%, 55%)`;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = color;
      setNewCat(prev => ({ ...prev, color: color }));
    }
  }, [hue]);

  const addCategory = () => {
    if (!newCat.name) return;
    const cat: Category = { ...newCat, id: Date.now().toString(), type: activeType };
    onUpdateState({ categories: [...state.categories, cat] });
    setIsAdding(false);
    setShowIconPicker(false);
    setNewCat({ name: '', icon: '📦', color: config.defaultColor });
    setHue(config.defaultHue);
  };

  return (
    <div className="space-y-4 animate-slide-up pb-24 pt-[env(safe-area-inset-top,8px)] outline-none">
      <header className="flex justify-between items-center px-1 pt-1">
        <div>
          <h1 className={`${config.accent} text-[9px] font-black uppercase tracking-[0.2em] flex items-center gap-1.5`}>
            {config.icon} Настройка групп
          </h1>
          <p className="text-slate-900 font-black text-base">{config.title}</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-all active:scale-90 outline-none focus:outline-none ${
            isAdding ? 'bg-slate-900 text-white rotate-45' : 'bg-white border border-slate-100 text-slate-900'
          }`}
        >
          <Plus size={20} strokeWidth={3} />
        </button>
      </header>

      <div className="bg-slate-100 p-1.5 rounded-2xl flex gap-1 mx-0.5">
        {(['expense', 'income'] as const).map(t => (
          <button 
            key={t}
            onClick={() => { setActiveType(t); setIsAdding(false); }}
            className={`flex-1 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all outline-none focus:outline-none ${
              activeType === t ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'
            }`}
          >
            {t === 'expense' ? 'Траты' : 'Доходы'}
          </button>
        ))}
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-[2.5rem] shadow-2xl border border-slate-100 space-y-6 animate-slide-up relative overflow-hidden outline-none">
          <div className="absolute top-0 left-0 w-full h-2" style={{ backgroundColor: newCat.color }} />
          
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

            <div className="space-y-5 bg-slate-50/50 p-5 rounded-[2rem] border border-slate-100 shadow-inner">
              <div className="flex justify-between items-center px-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Palette size={12} /> Палитра и тон
                </p>
                <div className="px-2 py-1 bg-white rounded-lg shadow-sm border border-slate-100">
                  <span className="text-[10px] font-black text-slate-900 font-mono">{newCat.color.toUpperCase()}</span>
                </div>
              </div>

              <div className="flex gap-2.5 overflow-x-auto no-scrollbar py-1">
                {PRESET_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => {
                      setNewCat({...newCat, color});
                      const hues: Record<string, number> = { '#6366f1': 230, '#10b981': 160, '#f43f5e': 350, '#f59e0b': 40, '#0ea5e9': 200, '#8b5cf6': 260, '#ec4899': 330, '#475569': 210 };
                      if (hues[color]) setHue(hues[color]);
                    }}
                    className={`w-10 h-10 rounded-full shrink-0 transition-all active:scale-90 shadow-sm border-2 outline-none focus:outline-none ${newCat.color === color ? 'border-slate-900 scale-110 shadow-lg' : 'border-white'}`}
                    style={{ backgroundColor: color, boxShadow: newCat.color === color ? `0 0 15px ${color}40` : 'none' }}
                  />
                ))}
              </div>

              <div className="relative pt-2">
                <div className="h-8 w-full rounded-[1rem] relative shadow-inner overflow-hidden border border-slate-200/50" style={{ background: 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)' }}>
                  <input 
                    type="range" 
                    min="0" 
                    max="360" 
                    value={hue}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20 outline-none focus:outline-none"
                    onChange={(e) => setHue(parseInt(e.target.value))}
                  />
                  <div 
                    className="absolute top-0 bottom-0 w-2.5 bg-white shadow-[0_0_15px_rgba(0,0,0,0.3)] z-10 pointer-events-none rounded-full border-2 border-slate-900/10"
                    style={{ left: `calc(${(hue / 360) * 100}% - 5px)` }}
                  />
                </div>
              </div>
            </div>
          </div>
          
          <button 
            onClick={addCategory}
            disabled={!newCat.name}
            className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black uppercase text-[12px] tracking-[0.15em] disabled:opacity-20 transition-all active:scale-95 shadow-xl outline-none focus:outline-none"
          >
            Создать группу
          </button>
        </div>
      )}

      <div className="space-y-2">
        {filtered.map(cat => (
          <div key={cat.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-50 flex items-center justify-between group active:bg-slate-50 transition-all outline-none">
            <div className="flex items-center gap-4 min-w-0">
              <div 
                className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 shadow-sm"
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
            <div className="flex gap-1 pr-1 opacity-0 group-hover:opacity-100 transition-opacity">
               <button className="w-9 h-9 flex items-center justify-center text-slate-300 hover:text-indigo-500 outline-none"><Edit2 size={16} /></button>
               <button 
                onClick={() => onUpdateState({ categories: state.categories.filter(c => c.id !== cat.id) })}
                className="w-9 h-9 flex items-center justify-center text-slate-300 hover:text-rose-500 outline-none"
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


import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Compass, 
  CalendarDays, 
  Plus,
  PieChart,
  Users2
} from 'lucide-react';

export const Layout: React.FC<{ children: React.ReactNode; onAddClick: () => void }> = ({ children, onAddClick }) => {
  const location = useLocation();

  return (
    <div className="flex flex-col min-h-screen w-full relative selection:bg-indigo-100">
      <main className="flex-grow w-full p-5 pb-40 safe-top">
        {children}
      </main>

      <div className="fixed bottom-6 left-0 right-0 z-50 px-4 flex justify-center">
        <nav className="glass-nav rounded-[2.5rem] px-2 py-2 flex justify-between items-center shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] ring-1 ring-black/5 w-full max-w-lg">
          <NavItem to="/" icon={<Compass size={22} />} />
          <NavItem to="/calendar" icon={<CalendarDays size={22} />} />
          
          <button 
            onClick={onAddClick}
            className="w-14 h-14 bg-[#0f172a] text-white rounded-[1.75rem] flex items-center justify-center shadow-lg active:scale-90 transition-all mx-1 shrink-0"
          >
            <Plus size={28} strokeWidth={3} />
          </button>

          <NavItem to="/debts" icon={<Users2 size={22} />} />
          <NavItem to="/analytics" icon={<PieChart size={22} />} />
        </nav>
      </div>
    </div>
  );
};

const NavItem: React.FC<{ to: string; icon: React.ReactElement }> = ({ to, icon }) => {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <NavLink 
      to={to} 
      className={`relative flex flex-col items-center justify-center transition-all w-12 h-12 rounded-2xl ${
        isActive 
        ? 'text-indigo-600 bg-indigo-50/80' 
        : 'text-slate-400 hover:text-slate-600 active:scale-95'
      }`}
    >
      <div className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'scale-100'}`}>
        {icon}
      </div>
      {isActive && (
        <div className="absolute -bottom-1 w-1 h-1 bg-indigo-600 rounded-full" />
      )}
    </NavLink>
  );
};

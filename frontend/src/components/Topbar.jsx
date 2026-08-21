import { useState } from 'react';
import { Menu, LogOut, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('') || '?';
}

const TODAY = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

export default function Topbar({ onMenuClick, title }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully.');
      navigate('/login');
    } catch {
      toast.error('Something went wrong while logging out.');
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-100 bg-white/85 px-4 backdrop-blur-md sm:px-6">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onMenuClick} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 lg:hidden">
          <Menu size={20} />
        </button>
        <div>
          <h1 className="text-lg font-bold tracking-tight text-gray-900">{title}</h1>
          <p className="hidden text-[11px] text-gray-400 sm:block">{TODAY}</p>
        </div>
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition-colors hover:bg-gray-100"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-700 text-xs font-semibold text-accent-200 ring-2 ring-brand-100">
            {initials(user?.name)}
          </span>
          <div className="hidden text-left sm:block">
            <p className="text-sm font-medium leading-tight text-gray-900">{user?.name}</p>
            <p className="text-[11px] leading-tight text-gray-400">{user?.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'}</p>
          </div>
          <ChevronDown size={15} className={`text-gray-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
        </button>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 z-20 mt-2 w-52 overflow-hidden rounded-xl border border-gray-100 bg-white py-1.5 shadow-soft">
              <div className="border-b border-gray-100 px-3 pb-2.5 pt-1">
                <p className="truncate text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="truncate text-xs text-gray-400">{user?.email}</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="mt-1 flex w-full items-center gap-2 px-3 py-2 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50"
              >
                <LogOut size={15} /> Logout
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}

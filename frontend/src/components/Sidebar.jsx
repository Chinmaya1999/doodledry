import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import {
  LayoutDashboard, Boxes, PlusCircle, History, AlertTriangle, Shirt, Baby, Palette, Tag, PaintBucket,
  Printer, ScanLine, Receipt, Undo2, Users2, FileBarChart, UserCog, ShieldCheck, Settings, X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import doodledryLogo from '../assets/doodledry-logo.png';

function NavItem({ to, icon: Icon, label, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        clsx(
          'group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all',
          isActive
            ? 'bg-brand-700 text-white shadow-soft'
            : 'text-gray-600 hover:bg-brand-50 hover:text-brand-800'
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={17} strokeWidth={isActive ? 2.25 : 2} className={isActive ? 'text-accent-300' : 'text-gray-400 group-hover:text-brand-600'} />
          {label}
        </>
      )}
    </NavLink>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-5">
      {title && <p className="mb-1.5 px-3 text-[10.5px] font-bold uppercase tracking-wider text-gray-400">{title}</p>}
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function initials(name = '') {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('') || '?';
}

export default function Sidebar({ open, onClose }) {
  const { isSuperAdmin, user } = useAuth();

  const content = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2.5">
          <img src={doodledryLogo} alt="doodledry" className="h-10 w-auto rounded-lg shadow-sm" />
          <div>
            <p className="text-[11px] font-semibold leading-tight text-gray-500">Inventory System</p>
            <p className="text-[10px] leading-tight text-gray-400">by doodledry</p>
          </div>
        </div>
        <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 lg:hidden">
          <X size={18} />
        </button>
      </div>

      <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 pb-6 pt-1">
        <Section>
          <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" end />
        </Section>

        <Section title="Inventory">
          <NavItem to="/inventory" icon={Boxes} label="All Inventory" />
          {isSuperAdmin && <NavItem to="/inventory/add-stock" icon={PlusCircle} label="Add Stock" />}
          <NavItem to="/inventory/history" icon={History} label="Stock History" />
          <NavItem to="/inventory/low-stock" icon={AlertTriangle} label="Low Stock" />
        </Section>

        {isSuperAdmin && (
          <Section title="Products">
            <NavItem to="/products" icon={Shirt} label="Products" />
            <NavItem to="/age-groups" icon={Baby} label="Age Groups" />
            <NavItem to="/designs" icon={Palette} label="Designs" />
            <NavItem to="/product-types" icon={Tag} label="Product Types" />
            <NavItem to="/colors" icon={PaintBucket} label="Colors" />
            <NavItem to="/barcode-generator" icon={Printer} label="Barcode Generator" />
          </Section>
        )}

        <Section title="Sales">
          <NavItem to="/scan-sell" icon={ScanLine} label="Scan & Sell" />
          <NavItem to="/sales-history" icon={Receipt} label="Sales History" />
          <NavItem to="/returns" icon={Undo2} label="Returns" />
        </Section>

        {isSuperAdmin && (
          <Section title="Investors">
            <NavItem to="/investors" icon={Users2} label="Investors" />
          </Section>
        )}

        <Section>
          <NavItem to="/reports" icon={FileBarChart} label="Reports" />
          {isSuperAdmin && <NavItem to="/users" icon={UserCog} label="Users" />}
          {isSuperAdmin && <NavItem to="/audit-logs" icon={ShieldCheck} label="Audit Logs" />}
          {isSuperAdmin && <NavItem to="/settings" icon={Settings} label="Settings" />}
        </Section>
      </nav>

      {user && (
        <div className="mx-3 mb-3 flex items-center gap-2.5 rounded-xl border border-gray-100 bg-gray-50/60 p-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-700 text-xs font-semibold text-accent-200">
            {initials(user.name)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-gray-800">{user.name}</p>
            <p className="text-[10.5px] text-gray-400">{user.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'}</p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <aside className="hidden w-64 shrink-0 border-r border-gray-100 bg-white lg:block">{content}</aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-gray-900/50" onClick={onClose} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-white shadow-xl">{content}</aside>
        </div>
      )}
    </>
  );
}

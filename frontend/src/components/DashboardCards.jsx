import clsx from 'clsx';

export function StatCard({ icon: Icon, label, value, hint, tone = 'default' }) {
  const toneClasses = {
    default: 'bg-brand-700 text-accent-200',
    warning: 'bg-amber-500 text-amber-50',
    danger: 'bg-rose-500 text-rose-50',
    success: 'bg-emerald-500 text-emerald-50',
  };

  return (
    <div className="group rounded-2xl border border-gray-100 bg-white p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-soft">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-gray-500">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900">{value}</p>
          {hint && <p className="mt-1 truncate text-xs text-gray-400">{hint}</p>}
        </div>
        {Icon && (
          <div className={clsx('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-sm transition-transform duration-200 group-hover:scale-105', toneClasses[tone])}>
            <Icon size={20} />
          </div>
        )}
      </div>
    </div>
  );
}

export function CardsGrid({ children }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{children}</div>;
}

import clsx from 'clsx';

const CONFIG = {
  IN_STOCK: { label: 'In Stock', className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
  LOW_STOCK: { label: 'Low Stock', className: 'bg-amber-50 text-amber-700 ring-amber-600/20' },
  OUT_OF_STOCK: { label: 'Out of Stock', className: 'bg-rose-50 text-rose-700 ring-rose-600/20' },
};

export function getStockStatus(currentStock, reorderLevel) {
  if (currentStock <= 0) return 'OUT_OF_STOCK';
  if (currentStock <= reorderLevel) return 'LOW_STOCK';
  return 'IN_STOCK';
}

export default function StockBadge({ status }) {
  const cfg = CONFIG[status] || CONFIG.IN_STOCK;
  return (
    <span className={clsx('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset', cfg.className)}>
      {cfg.label}
    </span>
  );
}

export function StatusBadge({ active }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        active ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' : 'bg-gray-100 text-gray-600 ring-gray-500/20'
      )}
    >
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

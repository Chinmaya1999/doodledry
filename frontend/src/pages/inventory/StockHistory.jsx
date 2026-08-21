import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import DataTable from '../../components/DataTable';
import FilterBar from '../../components/FilterBar';
import Pagination from '../../components/Pagination';
import { Select } from '../../components/FormField';
import { getStockHistory } from '../../services/inventoryService';

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'STOCK_IN', label: 'Stock In' },
  { value: 'SALE', label: 'Sale' },
  { value: 'STOCK_ADJUSTMENT', label: 'Adjustment' },
  { value: 'STOCK_RETURN', label: 'Return' },
  { value: 'DAMAGE', label: 'Damage' },
  { value: 'LOSS', label: 'Loss' },
];

const TYPE_STYLE = {
  STOCK_IN: 'text-emerald-700 bg-emerald-50',
  SALE: 'text-rose-700 bg-rose-50',
  STOCK_ADJUSTMENT: 'text-amber-700 bg-amber-50',
  STOCK_RETURN: 'text-brand-700 bg-brand-50',
  DAMAGE: 'text-gray-700 bg-gray-100',
  LOSS: 'text-gray-700 bg-gray-100',
};

export default function StockHistory() {
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['stock-history', type, page],
    queryFn: () => getStockHistory({ type: type || undefined, page, limit: 25 }),
  });

  const columns = [
    { key: 'createdAt', header: 'Date', render: (r) => format(new Date(r.createdAt), 'dd-MMM-yyyy HH:mm') },
    {
      key: 'product', header: 'Product', render: (r) => (
        <div>
          <p className="font-medium text-gray-800">{r.product?.design?.name} · {r.product?.productType?.name}</p>
          <p className="text-xs text-gray-400">{r.product?.ageGroup?.name} · {r.product?.sku}</p>
        </div>
      ),
    },
    { key: 'type', header: 'Type', render: (r) => <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_STYLE[r.type] || ''}`}>{r.type.replace('_', ' ')}</span> },
    { key: 'change', header: 'Previous → New', render: (r) => `${r.previousStock} → ${r.newStock}` },
    { key: 'quantity', header: 'Quantity', render: (r) => (r.quantity > 0 ? `+${r.quantity}` : r.quantity) },
    { key: 'user', header: 'User', render: (r) => r.user?.name || '—' },
    { key: 'reason', header: 'Reason', render: (r) => r.reason || r.notes || '—' },
  ];

  return (
    <div className="space-y-4">
      <FilterBar hasActiveFilters={!!type} onClear={() => setType('')}>
        <Select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} className="w-48">
          {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
      </FilterBar>

      <DataTable columns={columns} rows={data?.data} loading={isLoading} emptyTitle="No stock movements yet" />

      {data?.meta && <Pagination page={data.meta.page} pages={data.meta.pages} total={data.meta.total} onPageChange={setPage} />}
    </div>
  );
}

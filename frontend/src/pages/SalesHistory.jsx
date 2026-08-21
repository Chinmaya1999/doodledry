import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import DataTable from '../components/DataTable';
import FilterBar from '../components/FilterBar';
import SearchBar from '../components/SearchBar';
import Pagination from '../components/Pagination';
import DateRangeFilter from '../components/DateRangeFilter';
import { ColorLabel } from '../components/ColorSwatch';
import { Select } from '../components/FormField';
import { getSales } from '../services/saleService';
import { getColors } from '../services/catalogService';

const CURRENCY = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

export default function SalesHistory() {
  const [search, setSearch] = useState('');
  const [range, setRange] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [color, setColor] = useState('');
  const [page, setPage] = useState(1);

  const { data: colors = [] } = useQuery({ queryKey: ['colors', 'all'], queryFn: () => getColors({}) });

  const { data, isLoading } = useQuery({
    queryKey: ['sales', { search, range, startDate, endDate, color, page }],
    queryFn: () => getSales({
      search: search || undefined, range: range || undefined,
      startDate: range === 'custom' ? startDate || undefined : undefined,
      endDate: range === 'custom' ? endDate || undefined : undefined,
      color: color || undefined,
      page, limit: 25,
    }),
  });

  const columns = [
    { key: 'saleId', header: 'Sale ID', render: (r) => <span className="font-mono text-xs">{r.saleId}</span> },
    { key: 'soldAt', header: 'Date', render: (r) => format(new Date(r.soldAt), 'dd-MMM-yyyy HH:mm') },
    { key: 'design', header: 'Design', render: (r) => r.design?.name },
    { key: 'ageGroup', header: 'Age Group', render: (r) => r.ageGroup?.name },
    { key: 'productType', header: 'Type', render: (r) => r.productType?.name },
    { key: 'color', header: 'Color', render: (r) => <ColorLabel color={r.color} /> },
    { key: 'sku', header: 'SKU', render: (r) => <span className="font-mono text-xs">{r.sku}</span> },
    { key: 'quantity', header: 'Qty' },
    { key: 'unitPrice', header: 'Unit Price', render: (r) => CURRENCY.format(r.unitPrice) },
    { key: 'totalAmount', header: 'Total', render: (r) => CURRENCY.format(r.totalAmount) },
    { key: 'remainingStock', header: 'Remaining Stock' },
    { key: 'soldBy', header: 'Sold By', render: (r) => r.soldBy?.name },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search by Sale ID or SKU..." className="w-72" />
        {data?.meta && (
          <div className="text-sm text-gray-500">
            Total: <span className="font-semibold text-gray-800">{CURRENCY.format(data.meta.totalAmount)}</span>{' '}
            ({data.meta.totalQuantity} units)
          </div>
        )}
      </div>

      <FilterBar hasActiveFilters={!!range || !!color} onClear={() => { setRange(''); setStartDate(''); setEndDate(''); setColor(''); }}>
        <DateRangeFilter
          range={range} onRangeChange={(v) => { setRange(v); setPage(1); }}
          startDate={startDate} endDate={endDate}
          onStartDateChange={setStartDate} onEndDateChange={setEndDate}
        />
        <Select value={color} onChange={(e) => { setColor(e.target.value); setPage(1); }} className="w-40">
          <option value="">All Colors</option>
          {colors.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </Select>
      </FilterBar>

      <DataTable columns={columns} rows={data?.data} loading={isLoading} rowKey="saleId" emptyTitle="No sales recorded yet" />

      {data?.meta && <Pagination page={data.meta.page} pages={data.meta.pages} total={data.meta.total} onPageChange={setPage} />}
    </div>
  );
}

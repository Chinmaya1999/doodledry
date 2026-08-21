import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import DataTable from '../components/DataTable';
import FilterBar from '../components/FilterBar';
import Pagination from '../components/Pagination';
import { Input } from '../components/FormField';
import { getAuditLogs } from '../services/auditService';

export default function AuditLogs() {
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', action, page],
    queryFn: () => getAuditLogs({ action: action || undefined, page, limit: 30 }),
  });

  const columns = [
    { key: 'createdAt', header: 'Date', render: (r) => format(new Date(r.createdAt), 'dd-MMM-yyyy HH:mm:ss') },
    { key: 'userName', header: 'User' },
    { key: 'role', header: 'Role', render: (r) => (r.role === 'SUPER_ADMIN' ? 'Super Admin' : r.role === 'ADMIN' ? 'Admin' : '—') },
    { key: 'action', header: 'Action', render: (r) => <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">{r.action}</span> },
    { key: 'entityType', header: 'Entity' },
    { key: 'ipAddress', header: 'IP Address' },
  ];

  return (
    <div className="space-y-4">
      <FilterBar hasActiveFilters={!!action} onClear={() => setAction('')}>
        <Input value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} placeholder="Filter by action, e.g. SELL_PRODUCT" className="w-64" />
      </FilterBar>

      <DataTable columns={columns} rows={data?.data} loading={isLoading} emptyTitle="No audit logs yet" />

      {data?.meta && <Pagination page={data.meta.page} pages={data.meta.pages} total={data.meta.total} onPageChange={setPage} />}
    </div>
  );
}

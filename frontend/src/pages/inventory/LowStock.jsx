import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import DataTable from '../../components/DataTable';
import StockBadge, { getStockStatus } from '../../components/StockBadge';
import { getLowStock } from '../../services/inventoryService';

export default function LowStock() {
  const navigate = useNavigate();
  const { data = [], isLoading } = useQuery({ queryKey: ['low-stock'], queryFn: getLowStock, refetchInterval: 30_000 });

  const columns = [
    { key: 'ageGroup', header: 'Age', render: (r) => r.ageGroup?.name },
    { key: 'design', header: 'Design', render: (r) => r.design?.name },
    { key: 'productType', header: 'Type', render: (r) => r.productType?.name },
    { key: 'sku', header: 'SKU', render: (r) => <span className="font-mono text-xs">{r.sku}</span> },
    { key: 'currentStock', header: 'Current Stock' },
    { key: 'reorderLevel', header: 'Reorder Level' },
    { key: 'status', header: 'Status', render: (r) => <StockBadge status={getStockStatus(r.currentStock, r.reorderLevel)} /> },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Products at or below their reorder level. Restock these soon to avoid running out.</p>
      <DataTable
        columns={columns}
        rows={data}
        loading={isLoading}
        onRowClick={(row) => navigate(`/products/${row._id}`)}
        emptyTitle="No low stock products"
        emptyDescription="All products are above their reorder level."
      />
    </div>
  );
}

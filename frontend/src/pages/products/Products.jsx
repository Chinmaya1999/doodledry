import { useRef, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Download, Upload } from 'lucide-react';
import DataTable from '../../components/DataTable';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import SearchBar from '../../components/SearchBar';
import FilterBar from '../../components/FilterBar';
import Pagination from '../../components/Pagination';
import StockBadge, { getStockStatus } from '../../components/StockBadge';
import { ColorLabel } from '../../components/ColorSwatch';
import { Select } from '../../components/FormField';
import { getProducts } from '../../services/productService';
import { getAgeGroups, getDesigns, getProductTypes, getColors } from '../../services/catalogService';
import { downloadBulkStockTemplate, bulkUpdateStock } from '../../services/inventoryService';
import { extractErrorMessage } from '../../services/api';

const CURRENCY = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

const RESULT_STATUS_CLASS = {
  UPDATED: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  SKIPPED: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  FAILED: 'bg-rose-50 text-rose-700 ring-rose-600/20',
};

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function Products() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [search, setSearch] = useState('');
  const [ageGroup, setAgeGroup] = useState('');
  const [design, setDesign] = useState('');
  const [productType, setProductType] = useState('');
  const [color, setColor] = useState('');
  const [stockStatus, setStockStatus] = useState('');
  const [page, setPage] = useState(1);

  const templateMutation = useMutation({
    mutationFn: downloadBulkStockTemplate,
    onSuccess: (blob) => downloadBlob(blob, 'stock-update-template.xlsx'),
    onError: (err) => toast.error(extractErrorMessage(err)),
  });

  const uploadMutation = useMutation({
    mutationFn: bulkUpdateStock,
    onSuccess: (data) => {
      setUploadResult(data);
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(`${data.updated} product${data.updated === 1 ? '' : 's'} updated.`);
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });

  function handleFileSelected(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) uploadMutation.mutate(file);
  }

  const { data: ageGroups = [] } = useQuery({ queryKey: ['age-groups', 'all'], queryFn: () => getAgeGroups({}) });
  const { data: designs = [] } = useQuery({ queryKey: ['designs', 'all'], queryFn: () => getDesigns({}) });
  const { data: productTypes = [] } = useQuery({ queryKey: ['product-types', 'all'], queryFn: () => getProductTypes({}) });
  const { data: colors = [] } = useQuery({ queryKey: ['colors', 'all'], queryFn: () => getColors({}) });

  const { data, isLoading } = useQuery({
    queryKey: ['products', { search, ageGroup, design, productType, color, stockStatus, page }],
    queryFn: () => getProducts({
      search: search || undefined, ageGroup: ageGroup || undefined, design: design || undefined,
      productType: productType || undefined, color: color || undefined, stockStatus: stockStatus || undefined, page, limit: 20,
    }),
  });

  const hasActiveFilters = !!(ageGroup || design || productType || color || stockStatus);
  function clearFilters() { setAgeGroup(''); setDesign(''); setProductType(''); setColor(''); setStockStatus(''); setPage(1); }

  const columns = [
    { key: 'ageGroup', header: 'Age Group', render: (r) => r.ageGroup?.name },
    { key: 'design', header: 'Design', render: (r) => r.design?.name },
    { key: 'productType', header: 'Type', render: (r) => r.productType?.name },
    { key: 'color', header: 'Color', render: (r) => <ColorLabel color={r.color} /> },
    { key: 'sku', header: 'SKU', render: (r) => <span className="font-mono text-xs">{r.sku}</span> },
    { key: 'currentStock', header: 'Stock' },
    { key: 'totalSold', header: 'Sold' },
    { key: 'sellingPrice', header: 'Price', render: (r) => CURRENCY.format(r.sellingPrice) },
    { key: 'status', header: 'Status', render: (r) => <StockBadge status={getStockStatus(r.currentStock, r.reorderLevel)} /> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search by SKU, barcode, or product ID..." className="w-72" />
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" icon={Download} loading={templateMutation.isPending} onClick={() => templateMutation.mutate()}>
            Download Sample
          </Button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileSelected} />
          <Button variant="secondary" icon={Upload} loading={uploadMutation.isPending} onClick={() => fileInputRef.current?.click()}>
            Upload Excel
          </Button>
          <Button icon={Plus} onClick={() => navigate('/products/new')}>Create Inventory Product</Button>
        </div>
      </div>

      <FilterBar onClear={clearFilters} hasActiveFilters={hasActiveFilters}>
        <Select value={ageGroup} onChange={(e) => { setAgeGroup(e.target.value); setPage(1); }} className="w-40">
          <option value="">All Age Groups</option>
          {ageGroups.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
        </Select>
        <Select value={design} onChange={(e) => { setDesign(e.target.value); setPage(1); }} className="w-40">
          <option value="">All Designs</option>
          {designs.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
        </Select>
        <Select value={productType} onChange={(e) => { setProductType(e.target.value); setPage(1); }} className="w-40">
          <option value="">All Types</option>
          {productTypes.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
        </Select>
        <Select value={color} onChange={(e) => { setColor(e.target.value); setPage(1); }} className="w-40">
          <option value="">All Colors</option>
          {colors.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </Select>
        <Select value={stockStatus} onChange={(e) => { setStockStatus(e.target.value); setPage(1); }} className="w-40">
          <option value="">All Stock Status</option>
          <option value="IN_STOCK">In Stock</option>
          <option value="LOW_STOCK">Low Stock</option>
          <option value="OUT_OF_STOCK">Out of Stock</option>
        </Select>
      </FilterBar>

      <DataTable
        columns={columns}
        rows={data?.data}
        loading={isLoading}
        onRowClick={(row) => navigate(`/products/${row._id}`)}
        emptyTitle="No inventory products yet"
        emptyDescription="Create your first Age Group + Design + Product Type + Color combination."
      />

      {data?.meta && <Pagination page={data.meta.page} pages={data.meta.pages} total={data.meta.total} onPageChange={setPage} />}

      <Modal
        open={!!uploadResult}
        onClose={() => setUploadResult(null)}
        title="Bulk Stock Update Results"
        size="lg"
        footer={<Button variant="secondary" onClick={() => setUploadResult(null)}>Close</Button>}
      >
        {uploadResult && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                {uploadResult.updated} updated
              </span>
              <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                {uploadResult.skipped} skipped
              </span>
              <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-700 ring-1 ring-inset ring-rose-600/20">
                {uploadResult.failed} failed
              </span>
            </div>
            <div className="max-h-96 overflow-y-auto rounded-xl border border-gray-100">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Row</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">SKU</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {uploadResult.results.map((r) => (
                    <tr key={r.row}>
                      <td className="whitespace-nowrap px-3 py-2 text-gray-500">{r.row}</td>
                      <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{r.sku}</td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${RESULT_STATUS_CLASS[r.status]}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-600">
                        {r.status === 'UPDATED' ? `${r.previousStock} → ${r.newStock} (+${r.added})` : r.message}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

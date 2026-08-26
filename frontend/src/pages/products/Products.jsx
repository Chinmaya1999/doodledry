import { useRef, useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Download, Upload, FileSpreadsheet, PackagePlus, Boxes } from 'lucide-react';
import DataTable from '../../components/DataTable';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import SearchBar from '../../components/SearchBar';
import FilterBar from '../../components/FilterBar';
import Pagination from '../../components/Pagination';
import StockBadge, { getStockStatus } from '../../components/StockBadge';
import { ColorLabel } from '../../components/ColorSwatch';
import { Select } from '../../components/FormField';
import { getProducts, downloadBulkCreateTemplate, bulkCreateProducts } from '../../services/productService';
import { getAgeGroups, getDesigns, getProductTypes, getColors } from '../../services/catalogService';
import { downloadBulkStockTemplate, downloadStockReport, bulkUpdateStock } from '../../services/inventoryService';
import { extractErrorMessage } from '../../services/api';

const CURRENCY = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

const RESULT_STATUS_CLASS = {
  UPDATED: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  CREATED: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
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
  const stockFileInputRef = useRef(null);
  const createFileInputRef = useRef(null);
  const [bulkToolsOpen, setBulkToolsOpen] = useState(false);
  const [resultMode, setResultMode] = useState(null); // 'stock' | 'create'
  const [uploadResult, setUploadResult] = useState(null);
  const [search, setSearch] = useState('');
  const [ageGroup, setAgeGroup] = useState('');
  const [design, setDesign] = useState('');
  const [productType, setProductType] = useState('');
  const [color, setColor] = useState('');
  const [stockStatus, setStockStatus] = useState('');
  const [page, setPage] = useState(1);

  const stockTemplateMutation = useMutation({
    mutationFn: downloadBulkStockTemplate,
    onSuccess: (blob) => downloadBlob(blob, 'stock-update-template.xlsx'),
    onError: (err) => toast.error(extractErrorMessage(err)),
  });

  const stockReportMutation = useMutation({
    mutationFn: downloadStockReport,
    onSuccess: (blob) => downloadBlob(blob, 'stock-details.xlsx'),
    onError: (err) => toast.error(extractErrorMessage(err)),
  });

  const stockUploadMutation = useMutation({
    mutationFn: bulkUpdateStock,
    onSuccess: (data) => {
      setResultMode('stock');
      setUploadResult(data);
      setBulkToolsOpen(false);
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(`${data.updated} product${data.updated === 1 ? '' : 's'} updated.`);
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });

  const createTemplateMutation = useMutation({
    mutationFn: downloadBulkCreateTemplate,
    onSuccess: (blob) => downloadBlob(blob, 'new-products-template.xlsx'),
    onError: (err) => toast.error(extractErrorMessage(err)),
  });

  const createUploadMutation = useMutation({
    mutationFn: bulkCreateProducts,
    onSuccess: (data) => {
      setResultMode('create');
      setUploadResult(data);
      setBulkToolsOpen(false);
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success(`${data.created} product${data.created === 1 ? '' : 's'} created.`);
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });

  function handleStockFileSelected(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) stockUploadMutation.mutate(file);
  }

  function handleCreateFileSelected(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) createUploadMutation.mutate(file);
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
          <Button variant="secondary" icon={Boxes} onClick={() => setBulkToolsOpen(true)}>Bulk Tools</Button>
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

      <input ref={stockFileInputRef} type="file" accept=".xlsx" className="hidden" onChange={handleStockFileSelected} />
      <input ref={createFileInputRef} type="file" accept=".xlsx" className="hidden" onChange={handleCreateFileSelected} />

      <Modal open={bulkToolsOpen} onClose={() => setBulkToolsOpen(false)} title="Bulk Tools" size="md">
        <div className="space-y-6">
          <div>
            <h3 className="mb-1 text-sm font-semibold text-gray-900">Add New Products</h3>
            <p className="mb-3 text-xs text-gray-500">Create many products at once from Age Group + Design + Product Type + Color combinations.</p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary" size="sm" icon={Download}
                loading={createTemplateMutation.isPending}
                onClick={() => createTemplateMutation.mutate()}
              >
                Download Template
              </Button>
              <Button
                variant="secondary" size="sm" icon={PackagePlus}
                loading={createUploadMutation.isPending}
                onClick={() => createFileInputRef.current?.click()}
              >
                Upload & Create Products
              </Button>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <h3 className="mb-1 text-sm font-semibold text-gray-900">Update Existing Stock</h3>
            <p className="mb-3 text-xs text-gray-500">Add stock quantities to products that already exist, matched by SKU.</p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary" size="sm" icon={Download}
                loading={stockTemplateMutation.isPending}
                onClick={() => stockTemplateMutation.mutate()}
              >
                Download Sample
              </Button>
              <Button
                variant="secondary" size="sm" icon={Upload}
                loading={stockUploadMutation.isPending}
                onClick={() => stockFileInputRef.current?.click()}
              >
                Upload Excel
              </Button>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <h3 className="mb-1 text-sm font-semibold text-gray-900">Reports</h3>
            <p className="mb-3 text-xs text-gray-500">Export every product's current stock details.</p>
            <Button
              variant="secondary" size="sm" icon={FileSpreadsheet}
              loading={stockReportMutation.isPending}
              onClick={() => stockReportMutation.mutate()}
            >
              Download Stock Details
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!uploadResult}
        onClose={() => setUploadResult(null)}
        title={resultMode === 'create' ? 'Bulk Product Creation Results' : 'Bulk Stock Update Results'}
        size="lg"
        footer={<Button variant="secondary" onClick={() => setUploadResult(null)}>Close</Button>}
      >
        {uploadResult && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {resultMode === 'create' ? (
                <>
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                    {uploadResult.created} created
                  </span>
                  <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-700 ring-1 ring-inset ring-rose-600/20">
                    {uploadResult.failed} failed
                  </span>
                </>
              ) : (
                <>
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                    {uploadResult.updated} updated
                  </span>
                  <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                    {uploadResult.skipped} skipped
                  </span>
                  <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-700 ring-1 ring-inset ring-rose-600/20">
                    {uploadResult.failed} failed
                  </span>
                </>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto rounded-xl border border-gray-100">
              <table className="min-w-full divide-y divide-gray-100 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Row</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{resultMode === 'create' ? 'Combination' : 'SKU'}</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Status</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {uploadResult.results.map((r) => (
                    <tr key={r.row}>
                      <td className="whitespace-nowrap px-3 py-2 text-gray-500">{r.row}</td>
                      <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{resultMode === 'create' ? (r.sku || r.label) : r.sku}</td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${RESULT_STATUS_CLASS[r.status]}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-600">
                        {r.status === 'UPDATED' && `${r.previousStock} → ${r.newStock} (+${r.added})`}
                        {r.status === 'CREATED' && r.label}
                        {r.status !== 'UPDATED' && r.status !== 'CREATED' && r.message}
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

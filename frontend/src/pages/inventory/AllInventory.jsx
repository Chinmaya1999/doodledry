import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Trash2, AlertTriangle, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import DataTable from '../../components/DataTable';
import SearchBar from '../../components/SearchBar';
import FilterBar from '../../components/FilterBar';
import Pagination from '../../components/Pagination';
import StockBadge, { getStockStatus } from '../../components/StockBadge';
import { ColorLabel } from '../../components/ColorSwatch';
import { Select, Input } from '../../components/FormField';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import { getProducts, clearAllInventory, exportInventory } from '../../services/productService';
import { getAgeGroups, getDesigns, getProductTypes, getColors } from '../../services/catalogService';
import { extractErrorMessage } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const CURRENCY = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const CONFIRM_PHRASE = 'DELETE ALL';

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

export default function AllInventory() {
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const [ageGroup, setAgeGroup] = useState('');
  const [design, setDesign] = useState('');
  const [productType, setProductType] = useState('');
  const [color, setColor] = useState('');
  const [stockStatus, setStockStatus] = useState('');
  const [page, setPage] = useState(1);
  const [clearAllOpen, setClearAllOpen] = useState(false);

  const { data: ageGroups = [] } = useQuery({ queryKey: ['age-groups', 'all'], queryFn: () => getAgeGroups({}) });
  const { data: designs = [] } = useQuery({ queryKey: ['designs', 'all'], queryFn: () => getDesigns({}) });
  const { data: productTypes = [] } = useQuery({ queryKey: ['product-types', 'all'], queryFn: () => getProductTypes({}) });
  const { data: colors = [] } = useQuery({ queryKey: ['colors', 'all'], queryFn: () => getColors({}) });

  const { data, isLoading } = useQuery({
    queryKey: ['inventory', { search, ageGroup, design, productType, color, stockStatus, page }],
    queryFn: () => getProducts({
      search: search || undefined, ageGroup: ageGroup || undefined, design: design || undefined,
      productType: productType || undefined, color: color || undefined, stockStatus: stockStatus || undefined, page, limit: 20,
    }),
  });

  const hasActiveFilters = !!(ageGroup || design || productType || color || stockStatus);
  function clearFilters() { setAgeGroup(''); setDesign(''); setProductType(''); setColor(''); setStockStatus(''); setPage(1); }

  const exportParams = {
    search: search || undefined, ageGroup: ageGroup || undefined, design: design || undefined,
    productType: productType || undefined, color: color || undefined, stockStatus: stockStatus || undefined,
  };
  const exportXlsxMutation = useMutation({
    mutationFn: () => exportInventory({ ...exportParams, format: 'xlsx' }),
    onSuccess: (blob) => downloadBlob(blob, 'all-inventory.xlsx'),
    onError: (err) => toast.error(extractErrorMessage(err)),
  });
  const exportCsvMutation = useMutation({
    mutationFn: () => exportInventory({ ...exportParams, format: 'csv' }),
    onSuccess: (blob) => downloadBlob(blob, 'all-inventory.csv'),
    onError: (err) => toast.error(extractErrorMessage(err)),
  });

  const columns = [
    { key: 'ageGroup', header: 'Age', render: (r) => r.ageGroup?.name },
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
        <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search by SKU, barcode, or product ID..." className="w-full sm:w-80" />
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" icon={Download} loading={exportXlsxMutation.isPending} onClick={() => exportXlsxMutation.mutate()}>
            Download Excel
          </Button>
          <Button variant="secondary" icon={Download} loading={exportCsvMutation.isPending} onClick={() => exportCsvMutation.mutate()}>
            Download CSV
          </Button>
          {isSuperAdmin && (
            <Button variant="danger" icon={Trash2} onClick={() => setClearAllOpen(true)}>
              Clear All Inventory
            </Button>
          )}
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
        emptyTitle="No inventory found"
      />

      {data?.meta && <Pagination page={data.meta.page} pages={data.meta.pages} total={data.meta.total} onPageChange={setPage} />}

      {isSuperAdmin && <ClearAllInventoryModal open={clearAllOpen} onClose={() => setClearAllOpen(false)} totalProducts={data?.meta?.total} />}
    </div>
  );
}

function ClearAllInventoryModal({ open, onClose, totalProducts }) {
  const queryClient = useQueryClient();
  const [confirmText, setConfirmText] = useState('');

  const mutation = useMutation({
    mutationFn: clearAllInventory,
    onSuccess: (res) => {
      toast.success(res.message || 'All inventory cleared.');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      handleClose();
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });

  function handleClose() {
    setConfirmText('');
    onClose();
  }

  function handleConfirm() {
    if (confirmText !== CONFIRM_PHRASE) return;
    mutation.mutate();
  }

  return (
    <Modal
      open={open} onClose={handleClose} title="Clear All Inventory"
      footer={(
        <>
          <Button variant="secondary" onClick={handleClose} disabled={mutation.isPending}>Cancel</Button>
          <Button variant="danger" onClick={handleConfirm} loading={mutation.isPending} disabled={confirmText !== CONFIRM_PHRASE}>
            Permanently Delete Everything
          </Button>
        </>
      )}
    >
      <div className="flex gap-3 rounded-xl bg-rose-50 p-4">
        <AlertTriangle size={20} className="mt-0.5 shrink-0 text-rose-600" />
        <div className="text-sm text-rose-800">
          <p className="font-semibold">This permanently deletes every inventory product{typeof totalProducts === 'number' ? ` (${totalProducts} currently)` : ''}
            {' '}— including all SKUs, barcodes, QR codes, and their entire stock movement history.</p>
          <p className="mt-1">Sales records, investors, users, age groups, designs, product types, and colors are not affected. This action cannot be undone.</p>
        </div>
      </div>

      <p className="mb-1.5 mt-4 text-sm text-gray-600">
        Type <span className="font-mono font-semibold text-gray-900">{CONFIRM_PHRASE}</span> to confirm:
      </p>
      <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder={CONFIRM_PHRASE} autoFocus />
    </Modal>
  );
}

import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Pencil, Trash2, PackagePlus } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { getProduct, updateProduct, deleteProduct } from '../../services/productService';
import { stockIn, adjustStock } from '../../services/inventoryService';
import { extractErrorMessage } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import EmptyState from '../../components/EmptyState';
import QRCodeDisplay from '../../components/QRCodeDisplay';
import BarcodeDisplay from '../../components/BarcodeDisplay';
import StockBadge, { getStockStatus } from '../../components/StockBadge';
import { ColorLabel } from '../../components/ColorSwatch';
import DataTable from '../../components/DataTable';
import Button from '../../components/Button';
import Modal from '../../components/Modal';
import ConfirmationDialog from '../../components/ConfirmationDialog';
import { Field, Input, Checkbox } from '../../components/FormField';

const CURRENCY = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

const TYPE_LABEL = {
  STOCK_IN: 'Stock In', SALE: 'Sale', STOCK_ADJUSTMENT: 'Adjustment', STOCK_RETURN: 'Return', DAMAGE: 'Damaged', LOSS: 'Lost',
};

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isSuperAdmin } = useAuth();

  const [editOpen, setEditOpen] = useState(false);
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ['product', id], queryFn: () => getProduct(id) });

  const invalidateProduct = () => {
    queryClient.invalidateQueries({ queryKey: ['product', id] });
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['inventory'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const deleteMutation = useMutation({
    mutationFn: () => deleteProduct(id),
    onSuccess: (res) => {
      toast.success(res.message || 'Product deleted permanently.');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      navigate('/inventory');
    },
    onError: (err) => { toast.error(extractErrorMessage(err)); setDeleteOpen(false); },
  });

  if (isLoading) return <div className="flex h-64 items-center justify-center"><LoadingSpinner size="lg" /></div>;
  if (!data) return <EmptyState title="Product not found" />;

  const { product, codes, history } = data;
  const stockValue = product.currentStock * product.costPrice;

  const columns = [
    { key: 'createdAt', header: 'Date', render: (r) => format(new Date(r.createdAt), 'dd-MMM-yyyy HH:mm') },
    { key: 'type', header: 'Type', render: (r) => TYPE_LABEL[r.type] || r.type },
    { key: 'change', header: 'Change', render: (r) => `${r.previousStock} → ${r.newStock}` },
    { key: 'quantity', header: 'Quantity', render: (r) => (r.quantity > 0 ? `+${r.quantity}` : r.quantity) },
    { key: 'user', header: 'User', render: (r) => r.user?.name || '—' },
    { key: 'reason', header: 'Reason', render: (r) => r.reason || r.notes || '—' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft size={15} /> Back
        </button>

        {isSuperAdmin && (
          <div className="flex gap-2">
            <Button variant="secondary" icon={PackagePlus} onClick={() => setStockModalOpen(true)}>Edit Stock</Button>
            <Button variant="secondary" icon={Pencil} onClick={() => setEditOpen(true)}>Edit Details</Button>
            <Button variant="danger" icon={Trash2} onClick={() => setDeleteOpen(true)}>Delete Product</Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-card lg:col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{product.design?.name} · {product.productType?.name}</h2>
              <p className="flex items-center gap-1.5 text-sm text-gray-500">
                {product.ageGroup?.name}
                {product.color && <>· <ColorLabel color={product.color} /></>}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!product.isActive && <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">Inactive</span>}
              <StockBadge status={getStockStatus(product.currentStock, product.reorderLevel)} />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-y-4 sm:grid-cols-3">
            <Info label="Product ID" value={product.productId} mono />
            <Info label="SKU" value={product.sku} mono />
            {product.color && <Info label="Color" value={<ColorLabel color={product.color} />} />}
            <Info label="Barcode" value={product.barcode} mono />
            <Info label="Opening Stock" value={product.openingStock} />
            <Info label="Total Added" value={product.totalAdded} />
            <Info label="Total Sold" value={product.totalSold} />
            <Info label="Current Stock" value={product.currentStock} highlight />
            <Info label="Reorder Level" value={product.reorderLevel} />
            <Info label="Stock Value" value={CURRENCY.format(stockValue)} />
            <Info label="Cost Price" value={CURRENCY.format(product.costPrice)} />
            <Info label="Selling Price" value={CURRENCY.format(product.sellingPrice)} />
            <Info label="Created" value={format(new Date(product.createdAt), 'dd-MMM-yyyy')} />
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-card">
          <h3 className="mb-4 text-sm font-semibold text-gray-900">Codes</h3>
          <div className="flex flex-col items-center gap-4">
            <QRCodeDisplay src={codes.qrImage} size={160} />
            <BarcodeDisplay src={codes.barcodeImage} className="w-full" />
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Transaction History</h3>
        <DataTable columns={columns} rows={history} emptyTitle="No transactions yet" />
      </div>

      <EditDetailsModal open={editOpen} product={product} onClose={() => setEditOpen(false)} onUpdated={invalidateProduct} />
      <EditStockModal open={stockModalOpen} product={product} onClose={() => setStockModalOpen(false)} onUpdated={invalidateProduct} />

      <ConfirmationDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
        title="Delete this product permanently"
        description={`This will permanently delete "${product.design?.name} · ${product.productType?.name} · ${product.ageGroup?.name}" (SKU: ${product.sku}) along with its entire stock movement history. This cannot be undone. Sales already recorded against this product will be kept for accounting purposes.`}
        confirmLabel="Delete Permanently"
        danger
        loading={deleteMutation.isPending}
      />
    </div>
  );
}

function EditDetailsModal({ open, product, onClose, onUpdated }) {
  const [form, setForm] = useState(null);

  if (open && !form) {
    setForm({
      costPrice: product.costPrice,
      sellingPrice: product.sellingPrice,
      reorderLevel: product.reorderLevel,
      isActive: product.isActive,
    });
  }

  const mutation = useMutation({
    mutationFn: (payload) => updateProduct(product._id, payload),
    onSuccess: () => { toast.success('Product updated successfully.'); onUpdated(); handleClose(); },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });

  function handleClose() {
    setForm(null);
    onClose();
  }

  function handleSubmit(e) {
    e.preventDefault();
    const costPrice = Number(form.costPrice);
    const sellingPrice = Number(form.sellingPrice);
    const reorderLevel = Number(form.reorderLevel);
    if (costPrice < 0 || sellingPrice < 0) return toast.error('Prices cannot be negative.');
    if (reorderLevel < 0) return toast.error('Reorder level cannot be negative.');
    mutation.mutate({ costPrice, sellingPrice, reorderLevel, isActive: form.isActive });
  }

  if (!form) return null;

  return (
    <Modal
      open={open} onClose={handleClose} title="Edit Product Details"
      footer={(<><Button variant="secondary" onClick={handleClose}>Cancel</Button><Button onClick={handleSubmit} loading={mutation.isPending}>Save Changes</Button></>)}
    >
      <form onSubmit={handleSubmit}>
        <Field label="Cost Price (₹)" required>
          <Input type="number" min="0" step="0.01" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} />
        </Field>
        <Field label="Selling Price (₹)" required>
          <Input type="number" min="0" step="0.01" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} />
        </Field>
        <Field label="Reorder Level" required>
          <Input type="number" min="0" step="1" value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })} />
        </Field>
        <Checkbox
          label="Product is active (visible in inventory and available for sale)"
          checked={form.isActive}
          onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
        />
      </form>
    </Modal>
  );
}

function EditStockModal({ open, product, onClose, onUpdated }) {
  const [newStock, setNewStock] = useState(null);
  const [notes, setNotes] = useState('');

  if (open && newStock === null) {
    setNewStock(String(product.currentStock));
  }

  const mutation = useMutation({
    mutationFn: async (target) => {
      const delta = target - product.currentStock;
      if (delta > 0) {
        return stockIn({ product: product._id, quantity: delta, notes: notes || 'Manual stock edit by Super Admin' });
      }
      return adjustStock({
        product: product._id,
        type: 'STOCK_ADJUSTMENT',
        direction: 'DECREASE',
        quantity: Math.abs(delta),
        reason: 'Other',
        notes: notes || 'Manual stock edit by Super Admin',
      });
    },
    onSuccess: () => { toast.success('Stock updated successfully.'); onUpdated(); handleClose(); },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });

  function handleClose() {
    setNewStock(null);
    setNotes('');
    onClose();
  }

  function handleSubmit(e) {
    e.preventDefault();
    const target = Number(newStock);
    if (!Number.isInteger(target) || target < 0) return toast.error('Enter a valid stock quantity (0 or more).');
    if (target === product.currentStock) return toast.error('Enter a different quantity to update stock.');
    mutation.mutate(target);
  }

  if (newStock === null) return null;
  const delta = Number(newStock) - product.currentStock;

  return (
    <Modal
      open={open} onClose={handleClose} title="Edit Stock"
      footer={(<><Button variant="secondary" onClick={handleClose}>Cancel</Button><Button onClick={handleSubmit} loading={mutation.isPending}>Update Stock</Button></>)}
    >
      <form onSubmit={handleSubmit}>
        <p className="mb-3 text-sm text-gray-500">Current stock: <span className="font-semibold text-gray-800">{product.currentStock}</span></p>
        <Field label="New Stock Quantity" required hint="This is recorded as a stock-in or adjustment transaction, so the change stays fully auditable.">
          <Input type="number" min="0" step="1" value={newStock} onChange={(e) => setNewStock(e.target.value)} autoFocus />
        </Field>
        {Number.isFinite(delta) && delta !== 0 && (
          <p className="mb-3 text-xs text-gray-400">
            This will {delta > 0 ? `add ${delta} units` : `remove ${Math.abs(delta)} units`} ({product.currentStock} → {newStock || 0}).
          </p>
        )}
        <Field label="Notes">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional reason for this change" />
        </Field>
      </form>
    </Modal>
  );
}

function Info({ label, value, mono, highlight }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`text-sm font-medium ${mono ? 'font-mono' : ''} ${highlight ? 'text-lg font-bold text-brand-600' : 'text-gray-800'}`}>{value}</p>
    </div>
  );
}

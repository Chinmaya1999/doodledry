import { useState, useCallback, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ScanLine, PackageSearch, PackagePlus, ShoppingCart, RefreshCcw, Keyboard } from 'lucide-react';
import BarcodeScanner from '../components/BarcodeScanner';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { Field, Input, Textarea } from '../components/FormField';
import StockBadge, { getStockStatus } from '../components/StockBadge';
import { ColorLabel } from '../components/ColorSwatch';
import { lookupProduct } from '../services/productService';
import { createSale } from '../services/saleService';
import { stockIn } from '../services/inventoryService';
import { extractErrorMessage } from '../services/api';
import { playScanBeep } from '../utils/sound';

const CURRENCY = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

export default function ScanSell() {
  const queryClient = useQueryClient();
  const [scannerActive, setScannerActive] = useState(true);
  const [product, setProduct] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [looking, setLooking] = useState(false);
  const [sellModalOpen, setSellModalOpen] = useState(false);
  const [addStockModalOpen, setAddStockModalOpen] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const busyRef = useRef(false);

  const handleScan = useCallback(async (code) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setLooking(true);
    setNotFound(false);
    try {
      const result = await lookupProduct(code);
      setProduct(result.product);
      setScannerActive(false);
      playScanBeep();
    } catch (err) {
      setNotFound(true);
      toast.error(extractErrorMessage(err));
    } finally {
      setLooking(false);
      setTimeout(() => { busyRef.current = false; }, 800);
    }
  }, []);

  function resetScanner() {
    setProduct(null);
    setNotFound(false);
    setScannerActive(true);
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      {scannerActive ? (
        <>
          <BarcodeScanner onScan={handleScan} active={scannerActive} />
          <p className="text-center text-sm text-gray-500">Point the camera at the product's barcode or QR code.</p>
          <Button variant="secondary" className="w-full" icon={Keyboard} onClick={() => setManualEntryOpen(true)}>
            Enter Code Manually
          </Button>
        </>
      ) : looking ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-gray-100 bg-white">
          <ScanLine className="animate-pulse text-brand-500" size={32} />
          <p className="text-sm text-gray-500">Looking up product...</p>
        </div>
      ) : notFound ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-rose-100 bg-rose-50 p-6 text-center">
          <PackageSearch size={32} className="text-rose-500" />
          <p className="text-sm font-medium text-rose-700">Product not found.</p>
          <p className="text-xs text-rose-500">Please scan a valid product barcode.</p>
          <Button onClick={resetScanner} icon={RefreshCcw}>Scan Again</Button>
        </div>
      ) : product ? (
        <ProductFoundCard
          product={product}
          onSell={() => setSellModalOpen(true)}
          onAddStock={() => setAddStockModalOpen(true)}
          onScanAgain={resetScanner}
        />
      ) : null}

      <ManualEntryModal
        open={manualEntryOpen}
        code={manualCode}
        onCodeChange={setManualCode}
        onClose={() => setManualEntryOpen(false)}
        onSubmit={() => {
          if (!manualCode.trim()) return;
          setManualEntryOpen(false);
          setScannerActive(false);
          handleScan(manualCode.trim());
          setManualCode('');
        }}
      />

      <SellModal
        open={sellModalOpen}
        product={product}
        onClose={() => setSellModalOpen(false)}
        onSold={(updatedProduct) => {
          setSellModalOpen(false);
          setProduct(updatedProduct);
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          queryClient.invalidateQueries({ queryKey: ['sales'] });
          queryClient.invalidateQueries({ queryKey: ['products'] });
          queryClient.invalidateQueries({ queryKey: ['inventory'] });
        }}
      />

      <AddStockModal
        open={addStockModalOpen}
        product={product}
        onClose={() => setAddStockModalOpen(false)}
        onAdded={(newStock) => {
          setAddStockModalOpen(false);
          setProduct((prev) => (prev ? { ...prev, currentStock: newStock } : prev));
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
          queryClient.invalidateQueries({ queryKey: ['products'] });
          queryClient.invalidateQueries({ queryKey: ['inventory'] });
        }}
      />
    </div>
  );
}

function ProductFoundCard({ product, onSell, onAddStock, onScanAgain }) {
  const status = getStockStatus(product.currentStock, product.reorderLevel);
  return (
    <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-card">
      <p className="mb-3 text-center text-sm font-medium text-emerald-600">Product Found ✓</p>
      <div className="text-center">
        <h2 className="text-lg font-semibold text-gray-900">{product.design?.name}</h2>
        <p className="text-sm text-gray-500">{product.ageGroup?.name} · {product.productType?.name}</p>
        {product.color && (
          <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-gray-600">
            <ColorLabel color={product.color} />
          </p>
        )}
        <p className="mt-1 font-mono text-xs text-gray-400">SKU: {product.sku}</p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 text-center">
        <div className="rounded-xl bg-gray-50 p-3">
          <p className="text-xs text-gray-400">Available Stock</p>
          <p className="text-xl font-bold text-gray-900">{product.currentStock}</p>
        </div>
        <div className="rounded-xl bg-gray-50 p-3">
          <p className="text-xs text-gray-400">Selling Price</p>
          <p className="text-xl font-bold text-gray-900">{CURRENCY.format(product.sellingPrice)}</p>
        </div>
      </div>

      <div className="mt-3 flex justify-center">
        <StockBadge status={status} />
      </div>

      <div className="mt-5 space-y-2">
        <Button
          className="w-full"
          icon={ShoppingCart}
          disabled={product.currentStock <= 0}
          onClick={onSell}
        >
          {product.currentStock <= 0 ? 'Out of Stock' : 'Sell Product'}
        </Button>
        <Button variant="secondary" className="w-full" icon={PackagePlus} onClick={onAddStock}>
          Add to Inventory
        </Button>
        <Button variant="secondary" className="w-full" icon={RefreshCcw} onClick={onScanAgain}>
          Scan Next Product
        </Button>
      </div>
    </div>
  );
}

function ManualEntryModal({ open, code, onCodeChange, onClose, onSubmit }) {
  return (
    <Modal
      open={open} onClose={onClose} title="Enter Barcode / QR Code" size="sm"
      footer={(<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={onSubmit}>Look Up</Button></>)}
    >
      <Field label="Barcode, QR value, SKU, or Product ID" required>
        <Input value={code} onChange={(e) => onCodeChange(e.target.value)} placeholder="e.g. 06M-HUN-FS" autoFocus />
      </Field>
    </Modal>
  );
}

function SellModal({ open, product, onClose, onSold }) {
  const [quantity, setQuantity] = useState('1');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const idempotencyKeyRef = useRef(null);
  if (open && !idempotencyKeyRef.current) {
    idempotencyKeyRef.current = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  const mutation = useMutation({
    mutationFn: createSale,
    onSuccess: (result) => {
      toast.success(
        `Sale completed successfully. Quantity Sold: ${result.sale.quantity} · Remaining Stock: ${result.sale.remainingStock} · Amount: ${CURRENCY.format(result.sale.totalAmount)}`
      );
      onSold(result.product);
      idempotencyKeyRef.current = null;
      setQuantity('1');
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });

  if (!product) return null;

  const qtyNum = Number(quantity);
  const isValidQty = Number.isInteger(qtyNum) && qtyNum > 0;
  const exceedsStock = isValidQty && qtyNum > product.currentStock;
  const totalAmount = isValidQty ? qtyNum * product.sellingPrice : 0;

  function handleConfirm() {
    if (!isValidQty) return toast.error('Enter a valid quantity greater than 0.');
    if (exceedsStock) return toast.error(`Insufficient stock. Available stock: ${product.currentStock}`);
    if (mutation.isPending) return;
    mutation.mutate({
      product: product._id,
      quantity: qtyNum,
      paymentMethod,
      idempotencyKey: idempotencyKeyRef.current,
    });
  }

  return (
    <Modal
      open={open}
      onClose={() => { idempotencyKeyRef.current = null; onClose(); }}
      title="Confirm Sale"
      footer={(
        <>
          <Button variant="secondary" onClick={() => { idempotencyKeyRef.current = null; onClose(); }} disabled={mutation.isPending}>Cancel</Button>
          <Button onClick={handleConfirm} loading={mutation.isPending} disabled={!isValidQty || exceedsStock}>Confirm Sale</Button>
        </>
      )}
    >
      <div className="space-y-1 text-sm text-gray-600">
        <Row label="Product" value={product.design?.name} />
        <Row label="Age" value={product.ageGroup?.name} />
        <Row label="Type" value={product.productType?.name} />
        {product.color && <Row label="Color" value={<ColorLabel color={product.color} />} />}
        <Row label="Available" value={product.currentStock} />
        <Row label="Unit Price" value={CURRENCY.format(product.sellingPrice)} />
      </div>

      <Field label="Quantity to Sell" required error={exceedsStock ? `Insufficient stock. Available stock: ${product.currentStock}` : undefined} className="mt-4">
        <Input
          type="number" min="1" step="1" value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          autoFocus
        />
      </Field>

      <Field label="Payment Method">
        <div className="flex gap-2">
          {['CASH', 'CARD', 'UPI', 'OTHER'].map((method) => (
            <button
              key={method}
              type="button"
              onClick={() => setPaymentMethod(method)}
              className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium ${paymentMethod === method ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-500'}`}
            >
              {method}
            </button>
          ))}
        </div>
      </Field>

      <div className="mt-4 rounded-xl bg-gray-50 p-3 text-center">
        <p className="text-xs text-gray-400">Total Amount</p>
        <p className="text-xl font-bold text-gray-900">{CURRENCY.format(totalAmount)}</p>
      </div>
    </Modal>
  );
}

function AddStockModal({ open, product, onClose, onAdded }) {
  const [quantity, setQuantity] = useState('1');
  const [notes, setNotes] = useState('');

  const mutation = useMutation({
    mutationFn: stockIn,
    onSuccess: (result) => {
      toast.success(`Stock added successfully. Previous: ${result.previousStock} · Added: +${result.added} · New Stock: ${result.newStock}`);
      onAdded(result.newStock);
      setQuantity('1');
      setNotes('');
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });

  if (!product) return null;

  const qtyNum = Number(quantity);
  const isValidQty = Number.isInteger(qtyNum) && qtyNum > 0;

  function handleConfirm() {
    if (!isValidQty) return toast.error('Enter a valid quantity greater than 0.');
    if (mutation.isPending) return;
    mutation.mutate({ product: product._id, quantity: qtyNum, notes: notes || undefined });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add to Inventory"
      footer={(
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>Cancel</Button>
          <Button icon={PackagePlus} onClick={handleConfirm} loading={mutation.isPending} disabled={!isValidQty}>Add Stock</Button>
        </>
      )}
    >
      <div className="space-y-1 text-sm text-gray-600">
        <Row label="Product" value={product.design?.name} />
        <Row label="Age" value={product.ageGroup?.name} />
        <Row label="Type" value={product.productType?.name} />
        {product.color && <Row label="Color" value={<ColorLabel color={product.color} />} />}
        <Row label="Current Stock" value={product.currentStock} />
      </div>

      <Field label="Quantity to Add" required className="mt-4">
        <Input
          type="number" min="1" step="1" value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          autoFocus
        />
      </Field>

      <Field label="Notes">
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional note about this stock addition" />
      </Field>
    </Modal>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-400">{label}</span>
      <span className="font-medium text-gray-800">{value}</span>
    </div>
  );
}

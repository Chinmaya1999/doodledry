import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { PackagePlus, AlertOctagon } from 'lucide-react';
import { Field, Input, Select, Textarea } from '../../components/FormField';
import Button from '../../components/Button';
import ColorSwatch from '../../components/ColorSwatch';
import { getProducts } from '../../services/productService';
import { getColors } from '../../services/catalogService';
import { stockIn, adjustStock } from '../../services/inventoryService';
import { extractErrorMessage } from '../../services/api';

export default function AddStock() {
  const [tab, setTab] = useState('stock-in');
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex gap-2 rounded-xl bg-gray-100 p-1">
        <TabButton active={tab === 'stock-in'} onClick={() => setTab('stock-in')} icon={PackagePlus} label="Add Stock" />
        <TabButton active={tab === 'adjust'} onClick={() => setTab('adjust')} icon={AlertOctagon} label="Damage / Lost / Adjustment" />
      </div>
      {tab === 'stock-in' ? <StockInForm /> : <AdjustForm />}
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx('flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium transition-colors', active ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-500 hover:text-gray-700')}
    >
      <Icon size={15} /> {label}
    </button>
  );
}

function useProductOptions(search, color) {
  return useQuery({
    queryKey: ['products', 'options', search, color],
    queryFn: () => getProducts({ search: search || undefined, color: color || undefined, limit: 50 }),
  });
}

function useColorOptions() {
  return useQuery({ queryKey: ['colors', 'all'], queryFn: () => getColors({}) });
}

function StockInForm() {
  const queryClient = useQueryClient();
  const [productSearch, setProductSearch] = useState('');
  const [colorFilter, setColorFilter] = useState('');
  const { data } = useProductOptions(productSearch, colorFilter);
  const { data: colors = [] } = useColorOptions();
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm();
  const [result, setResult] = useState(null);
  const selectedProductId = watch('product');
  const selectedProduct = data?.data?.find((p) => p._id === selectedProductId);

  const mutation = useMutation({
    mutationFn: stockIn,
    onSuccess: (res) => {
      toast.success(`Stock added successfully. New stock: ${res.newStock}`);
      setResult(res);
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      reset({ product: '', quantity: '', notes: '' });
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });

  const onSubmit = (values) => {
    mutation.mutate({ product: values.product, quantity: Number(values.quantity), notes: values.notes });
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-card">
      <h2 className="mb-4 text-base font-semibold text-gray-900">Add Stock</h2>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Field label="Product" required error={errors.product?.message}>
          <Input placeholder="Search by SKU or barcode..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} className="mb-2" />
          <Select value={colorFilter} onChange={(e) => setColorFilter(e.target.value)} className="mb-2">
            <option value="">All Colors</option>
            {colors.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </Select>
          <div className="flex items-center gap-2">
            <Select {...register('product', { required: 'Select a product.' })} className="flex-1">
              <option value="">Select product</option>
              {data?.data?.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.sku} — {p.design?.name} / {p.ageGroup?.name} / {p.productType?.name} / {p.color?.name} (Stock: {p.currentStock})
                </option>
              ))}
            </Select>
            {selectedProduct?.color && <ColorSwatch hexCode={selectedProduct.color.hexCode} name={selectedProduct.color.name} size={22} />}
          </div>
        </Field>

        <Field label="Quantity to Add" required error={errors.quantity?.message}>
          <Input type="number" min="1" step="1" {...register('quantity', { required: 'Quantity is required.', min: { value: 1, message: 'Quantity must be greater than 0.' } })} />
        </Field>

        <Field label="Notes">
          <Textarea {...register('notes')} placeholder="Optional note about this stock addition" />
        </Field>

        <Button type="submit" icon={PackagePlus} loading={mutation.isPending} className="w-full">Add Stock</Button>
      </form>

      {result && (
        <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
          Previous Stock: <strong>{result.previousStock}</strong> · Added: <strong>+{result.added}</strong> · New Stock: <strong>{result.newStock}</strong>
        </div>
      )}
    </div>
  );
}

function AdjustForm() {
  const queryClient = useQueryClient();
  const [productSearch, setProductSearch] = useState('');
  const [colorFilter, setColorFilter] = useState('');
  const { data } = useProductOptions(productSearch, colorFilter);
  const { data: colors = [] } = useColorOptions();
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm({ defaultValues: { type: 'DAMAGE', reason: 'Damaged' } });
  const type = watch('type');
  const selectedProductId = watch('product');
  const selectedProduct = data?.data?.find((p) => p._id === selectedProductId);

  const mutation = useMutation({
    mutationFn: adjustStock,
    onSuccess: (res) => {
      toast.success(`Stock updated. New stock: ${res.newStock}`);
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      reset({ product: '', type: 'DAMAGE', quantity: '', reason: 'Damaged', notes: '' });
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });

  const onSubmit = (values) => {
    mutation.mutate({
      product: values.product,
      type: values.type,
      direction: values.type === 'STOCK_ADJUSTMENT' ? values.direction : 'DECREASE',
      quantity: Number(values.quantity),
      reason: values.reason,
      notes: values.notes,
    });
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-card">
      <h2 className="mb-4 text-base font-semibold text-gray-900">Damaged / Lost / Adjustment</h2>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Field label="Product" required error={errors.product?.message}>
          <Input placeholder="Search by SKU or barcode..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} className="mb-2" />
          <Select value={colorFilter} onChange={(e) => setColorFilter(e.target.value)} className="mb-2">
            <option value="">All Colors</option>
            {colors.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </Select>
          <div className="flex items-center gap-2">
            <Select {...register('product', { required: 'Select a product.' })} className="flex-1">
              <option value="">Select product</option>
              {data?.data?.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.sku} — {p.design?.name} / {p.ageGroup?.name} / {p.productType?.name} / {p.color?.name} (Stock: {p.currentStock})
                </option>
              ))}
            </Select>
            {selectedProduct?.color && <ColorSwatch hexCode={selectedProduct.color.hexCode} name={selectedProduct.color.name} size={22} />}
          </div>
        </Field>

        <Field label="Adjustment Type" required>
          <Select {...register('type')}>
            <option value="DAMAGE">Damaged / Lost Stock</option>
            <option value="STOCK_ADJUSTMENT">General Stock Correction</option>
          </Select>
        </Field>

        {type === 'STOCK_ADJUSTMENT' && (
          <Field label="Direction" required>
            <Select {...register('direction')}>
              <option value="DECREASE">Decrease Stock</option>
              <option value="INCREASE">Increase Stock</option>
            </Select>
          </Field>
        )}

        <Field label="Quantity" required error={errors.quantity?.message}>
          <Input type="number" min="1" step="1" {...register('quantity', { required: 'Quantity is required.', min: { value: 1, message: 'Quantity must be greater than 0.' } })} />
        </Field>

        <Field label="Reason" required>
          <Select {...register('reason')}>
            <option value="Damaged">Damaged</option>
            <option value="Lost">Lost</option>
            <option value="Defective">Defective</option>
            <option value="Other">Other</option>
          </Select>
        </Field>

        <Field label="Notes">
          <Textarea {...register('notes')} placeholder="Optional note" />
        </Field>

        <Button type="submit" variant="danger" icon={AlertOctagon} loading={mutation.isPending} className="w-full">Record Adjustment</Button>
      </form>
    </div>
  );
}

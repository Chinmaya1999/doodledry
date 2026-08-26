import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { ArrowLeft, PackagePlus } from 'lucide-react';
import { Field, Input, Select } from '../../components/FormField';
import Button from '../../components/Button';
import QRCodeDisplay from '../../components/QRCodeDisplay';
import BarcodeDisplay from '../../components/BarcodeDisplay';
import { getAgeGroups, getDesigns, getProductTypes, getColors } from '../../services/catalogService';
import ColorSwatch from '../../components/ColorSwatch';
import { createProduct } from '../../services/productService';
import { extractErrorMessage } from '../../services/api';

export default function CreateProduct() {
  const navigate = useNavigate();
  const [created, setCreated] = useState(null);
  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm({
    defaultValues: { openingStock: 0, reorderLevel: 10 },
  });
  const selectedColorId = watch('color');

  const { data: ageGroups = [] } = useQuery({ queryKey: ['age-groups', 'active'], queryFn: () => getAgeGroups({ status: 'ACTIVE' }) });
  const { data: designs = [] } = useQuery({ queryKey: ['designs', 'active'], queryFn: () => getDesigns({ status: 'ACTIVE' }) });
  const { data: productTypes = [] } = useQuery({ queryKey: ['product-types', 'active'], queryFn: () => getProductTypes({ status: 'ACTIVE' }) });
  const { data: colors = [] } = useQuery({ queryKey: ['colors', 'active'], queryFn: () => getColors({ status: 'ACTIVE' }) });

  const mutation = useMutation({
    mutationFn: createProduct,
    onSuccess: (result) => {
      toast.success('Inventory product created successfully.');
      setCreated(result);
      reset({ ageGroup: '', design: '', productType: '', color: '', openingStock: 0, costPrice: '', sellingPrice: '', reorderLevel: 10 });
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });

  const onSubmit = (values) => {
    mutation.mutate({
      ageGroup: values.ageGroup,
      design: values.design,
      productType: values.productType,
      color: values.color,
      openingStock: Number(values.openingStock),
      costPrice: Number(values.costPrice),
      sellingPrice: Number(values.sellingPrice),
      reorderLevel: Number(values.reorderLevel),
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <button type="button" onClick={() => navigate('/products')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft size={15} /> Back to Products
      </button>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-card">
        <h2 className="mb-1 text-base font-semibold text-gray-900">Create Inventory Product</h2>
        <p className="mb-5 text-sm text-gray-500">
          Every Age Group + Design + Product Type + Color combination is a unique inventory item with its own stock, SKU, and barcode.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          <Field label="Age Group" required error={errors.ageGroup?.message}>
            <Select {...register('ageGroup', { required: 'Age group is required.' })}>
              <option value="">Select age group</option>
              {ageGroups.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
            </Select>
          </Field>

          <Field label="Design" required error={errors.design?.message}>
            <Select {...register('design', { required: 'Design is required.' })}>
              <option value="">Select design</option>
              {designs.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
            </Select>
          </Field>

          <Field label="Product Type" required error={errors.productType?.message}>
            <Select {...register('productType', { required: 'Product type is required.' })}>
              <option value="">Select product type</option>
              {productTypes.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
            </Select>
          </Field>

          <Field label="Color" required error={errors.color?.message}>
            <div className="flex items-center gap-2">
              <Select {...register('color', { required: 'Color is required.' })} className="flex-1">
                <option value="">Select color</option>
                {colors.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </Select>
              {selectedColorId && (
                <ColorSwatch hexCode={colors.find((c) => c._id === selectedColorId)?.hexCode} size={22} />
              )}
            </div>
          </Field>

          <Field label="Opening Stock" required error={errors.openingStock?.message}>
            <Input type="number" min="0" step="1" {...register('openingStock', { required: true, min: { value: 0, message: 'Cannot be negative.' } })} />
          </Field>

          <Field label="Reorder Level" required error={errors.reorderLevel?.message}>
            <Input type="number" min="0" step="1" {...register('reorderLevel', { required: true, min: { value: 0, message: 'Cannot be negative.' } })} />
          </Field>

          <Field label="Cost Price (₹)" required error={errors.costPrice?.message}>
            <Input type="number" min="0" step="0.01" {...register('costPrice', { required: 'Cost price is required.', min: { value: 0, message: 'Prices cannot be negative.' } })} />
          </Field>

          <Field label="Selling Price (₹)" required error={errors.sellingPrice?.message}>
            <Input type="number" min="0" step="0.01" {...register('sellingPrice', { required: 'Selling price is required.', min: { value: 0, message: 'Prices cannot be negative.' } })} />
          </Field>

          <div className="sm:col-span-2">
            <Button type="submit" icon={PackagePlus} loading={mutation.isPending} className="w-full sm:w-auto">
              Create Product
            </Button>
          </div>
        </form>
      </div>

      {created && (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-6 shadow-card">
          <h3 className="mb-4 text-sm font-semibold text-gray-900">Product created — codes generated</h3>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div>
              <p className="text-xs text-gray-500">Product ID</p>
              <p className="font-mono text-sm font-semibold">{created.product.productId}</p>
              <p className="mt-2 text-xs text-gray-500">SKU</p>
              <p className="font-mono text-sm font-semibold">{created.product.sku}</p>
              {created.product.color && (
                <>
                  <p className="mt-2 text-xs text-gray-500">Color</p>
                  <p className="flex items-center gap-1.5 text-sm font-semibold">
                    <ColorSwatch hexCode={created.product.color.hexCode} size={14} /> {created.product.color.name}
                  </p>
                </>
              )}
            </div>
            <div className="flex flex-col items-center gap-2">
              <p className="text-xs text-gray-500">QR Code</p>
              <QRCodeDisplay src={created.codes.qrImage} />
            </div>
            <div className="flex flex-col items-center gap-2">
              <p className="text-xs text-gray-500">Barcode</p>
              <BarcodeDisplay src={created.codes.barcodeImage} />
            </div>
          </div>
          <div className="mt-5 flex gap-2">
            <Button variant="secondary" onClick={() => navigate('/barcode-generator')}>Go to Barcode Generator</Button>
            <Button variant="secondary" onClick={() => navigate(`/products/${created.product._id}`)}>View Product</Button>
          </div>
        </div>
      )}
    </div>
  );
}

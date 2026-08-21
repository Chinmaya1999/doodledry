import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Printer, Search } from 'lucide-react';
import { Field, Input, Select } from '../components/FormField';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import { getProducts, getProductLabels } from '../services/productService';
import { getAgeGroups, getDesigns, getProductTypes, getColors } from '../services/catalogService';
import { BRAND_NAME } from '../utils/brand';
import ColorSwatch from '../components/ColorSwatch';

export default function BarcodeGenerator() {
  const [ageGroup, setAgeGroup] = useState('');
  const [design, setDesign] = useState('');
  const [productType, setProductType] = useState('');
  const [color, setColor] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [copies, setCopies] = useState(1);
  const [labels, setLabels] = useState([]);
  const [loading, setLoading] = useState(false);

  const { data: ageGroups = [] } = useQuery({ queryKey: ['age-groups', 'all'], queryFn: () => getAgeGroups({}) });
  const { data: designs = [] } = useQuery({ queryKey: ['designs', 'all'], queryFn: () => getDesigns({}) });
  const { data: productTypes = [] } = useQuery({ queryKey: ['product-types', 'all'], queryFn: () => getProductTypes({}) });
  const { data: colors = [] } = useQuery({ queryKey: ['colors', 'all'], queryFn: () => getColors({}) });

  const { data: productList } = useQuery({
    queryKey: ['products', 'label-select', ageGroup, design, productType, color],
    queryFn: () => getProducts({
      ageGroup: ageGroup || undefined, design: design || undefined, productType: productType || undefined,
      color: color || undefined, limit: 100,
    }),
  });

  async function handleGenerate() {
    if (!selectedProductId) return;
    setLoading(true);
    try {
      const result = await getProductLabels([selectedProductId]);
      const count = Math.max(1, Number(copies) || 1);
      const repeated = Array.from({ length: count }, () => result[0]).filter(Boolean);
      setLabels(repeated);
    } finally {
      setLoading(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="space-y-6">
      <div className="no-print rounded-2xl border border-gray-100 bg-white p-6 shadow-card">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Generate Barcode / QR Labels</h2>
        <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Age Group">
            <Select value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)}>
              <option value="">All</option>
              {ageGroups.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
            </Select>
          </Field>
          <Field label="Design">
            <Select value={design} onChange={(e) => setDesign(e.target.value)}>
              <option value="">All</option>
              {designs.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
            </Select>
          </Field>
          <Field label="Product Type">
            <Select value={productType} onChange={(e) => setProductType(e.target.value)}>
              <option value="">All</option>
              {productTypes.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
            </Select>
          </Field>
          <Field label="Color">
            <Select value={color} onChange={(e) => setColor(e.target.value)}>
              <option value="">All</option>
              {colors.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Number of Labels">
            <Input type="number" min="1" value={copies} onChange={(e) => setCopies(e.target.value)} />
          </Field>
        </div>

        <Field label="Select Product" required>
          <Select value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)}>
            <option value="">Select a product</option>
            {productList?.data?.map((p) => (
              <option key={p._id} value={p._id}>
                {p.sku} — {p.design?.name} / {p.ageGroup?.name} / {p.productType?.name} / {p.color?.name}
              </option>
            ))}
          </Select>
        </Field>

        <div className="flex gap-2">
          <Button icon={Search} onClick={handleGenerate} loading={loading} disabled={!selectedProductId}>Generate Labels</Button>
          {labels.length > 0 && <Button variant="secondary" icon={Printer} onClick={handlePrint}>Print Labels</Button>}
        </div>
      </div>

      {labels.length === 0 ? (
        <div className="no-print">
          <EmptyState title="No labels generated yet" description="Select a product and click Generate Labels to preview printable labels." />
        </div>
      ) : (
        <div className="print-area">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {labels.map((label, idx) => (
              <Label key={`${label.product._id}-${idx}`} label={label} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Label({ label }) {
  const { product, codes } = label;
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border border-gray-200 bg-white p-3 text-center">
      <p className="text-[10px] font-bold tracking-wide text-gray-700">{BRAND_NAME}</p>
      <p className="text-xs font-semibold text-gray-900">{product.design?.name}</p>
      <p className="text-[10px] text-gray-500">{product.ageGroup?.name} · {product.productType?.name}</p>
      {product.color && (
        <p className="flex items-center gap-1 text-[10px] text-gray-500">
          <ColorSwatch hexCode={product.color.hexCode} name={product.color.name} size={9} /> {product.color.name}
        </p>
      )}
      <p className="font-mono text-[10px] text-gray-500">SKU: {product.sku}</p>
      <img src={codes.barcodeImage} alt="barcode" className="mt-1 h-10" />
      <img src={codes.qrImage} alt="qr" className="mt-1 h-16 w-16" />
    </div>
  );
}

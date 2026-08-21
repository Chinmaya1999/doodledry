import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import DataTable from '../../components/DataTable';
import Button from '../../components/Button';
import SearchBar from '../../components/SearchBar';
import FilterBar from '../../components/FilterBar';
import Pagination from '../../components/Pagination';
import StockBadge, { getStockStatus } from '../../components/StockBadge';
import { ColorLabel } from '../../components/ColorSwatch';
import { Select } from '../../components/FormField';
import { getProducts } from '../../services/productService';
import { getAgeGroups, getDesigns, getProductTypes, getColors } from '../../services/catalogService';

const CURRENCY = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

export default function Products() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [ageGroup, setAgeGroup] = useState('');
  const [design, setDesign] = useState('');
  const [productType, setProductType] = useState('');
  const [color, setColor] = useState('');
  const [stockStatus, setStockStatus] = useState('');
  const [page, setPage] = useState(1);

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
        <Button icon={Plus} onClick={() => navigate('/products/new')}>Create Inventory Product</Button>
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
    </div>
  );
}

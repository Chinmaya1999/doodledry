import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Shirt } from 'lucide-react';
import Button from '../../components/Button';
import SearchBar from '../../components/SearchBar';
import FilterBar from '../../components/FilterBar';
import Pagination from '../../components/Pagination';
import EmptyState from '../../components/EmptyState';
import LoadingSpinner from '../../components/LoadingSpinner';
import StockBadge, { getStockStatus } from '../../components/StockBadge';
import ColorSwatch from '../../components/ColorSwatch';
import { Select } from '../../components/FormField';
import { getProducts } from '../../services/productService';
import { getAgeGroups, getDesigns, getProductTypes, getColors } from '../../services/catalogService';
import { API_ORIGIN } from '../../services/api';

const CURRENCY = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

function DesignIcon({ image, name }) {
  if (!image) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
        <Shirt size={18} />
      </div>
    );
  }
  return <img src={`${API_ORIGIN}${image}`} alt={name} className="h-10 w-10 shrink-0 rounded-xl object-cover" />;
}

function groupByDesignVariant(products) {
  const groups = new Map();
  for (const product of products) {
    const key = `${product.ageGroup?._id}-${product.design?._id}-${product.productType?._id}`;
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        ageGroup: product.ageGroup?.name,
        design: product.design?.name,
        designImage: product.design?.image,
        productType: product.productType?.name,
        variants: [],
      });
    }
    groups.get(key).variants.push(product);
  }
  return [...groups.values()];
}

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

  const groups = useMemo(() => groupByDesignVariant(data?.data || []), [data]);

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

      {isLoading ? (
        <div className="flex h-56 items-center justify-center rounded-2xl border border-gray-100 bg-white">
          <LoadingSpinner size="lg" />
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          title="No inventory products yet"
          description="Create your first Age Group + Design + Product Type + Color combination."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {groups.map((group) => {
            const totalStock = group.variants.reduce((sum, v) => sum + v.currentStock, 0);
            return (
              <div key={group.key} className="flex flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-card">
                <div className="mb-3 flex items-start gap-3">
                  <DesignIcon image={group.designImage} name={group.design} />
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-gray-900">{group.design}</h3>
                    <p className="truncate text-xs text-gray-500">{group.ageGroup} · {group.productType}</p>
                  </div>
                </div>

                <div className="flex-1 space-y-1">
                  {group.variants.map((v) => (
                    <button
                      type="button"
                      key={v._id}
                      onClick={() => navigate(`/products/${v._id}`)}
                      className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-gray-50"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <ColorSwatch hexCode={v.color?.hexCode} name={v.color?.name} size={12} />
                        <span className="truncate text-sm text-gray-700">{v.color?.name || '—'}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">{v.currentStock}</span>
                        <StockBadge status={getStockStatus(v.currentStock, v.reorderLevel)} />
                      </span>
                    </button>
                  ))}
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-500">
                  <span>{group.variants.length} color{group.variants.length === 1 ? '' : 's'}</span>
                  <span>Total stock: <span className="font-semibold text-gray-700">{totalStock}</span></span>
                </div>
                {group.variants[0]?.sellingPrice != null && (
                  <p className="mt-1 text-xs text-gray-400">{CURRENCY.format(group.variants[0].sellingPrice)}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {data?.meta && <Pagination page={data.meta.page} pages={data.meta.pages} total={data.meta.total} onPageChange={setPage} />}
    </div>
  );
}

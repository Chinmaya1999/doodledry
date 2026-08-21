import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Printer, TrendingUp, Package, ShoppingBag } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import clsx from 'clsx';
import Button from '../components/Button';
import DataTable from '../components/DataTable';
import DateRangeFilter from '../components/DateRangeFilter';
import { CardsGrid, StatCard } from '../components/DashboardCards';
import {
  getSalesReport, getInventoryReport, getDesignReport, getAgeGroupReport, getProductTypeReport, getColorReport,
} from '../services/reportService';
import { exportToCsv } from '../utils/exportCsv';
import { ColorLabel } from '../components/ColorSwatch';

const CURRENCY = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

const TABS = [
  { key: 'sales', label: 'Sales Report' },
  { key: 'inventory', label: 'Inventory Report' },
  { key: 'design', label: 'Design Report' },
  { key: 'ageGroup', label: 'Age Group Report' },
  { key: 'productType', label: 'Product Type Report' },
  { key: 'color', label: 'Color Report' },
];

export default function Reports() {
  const [tab, setTab] = useState('sales');

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap gap-2 rounded-xl bg-gray-100 p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={clsx('rounded-lg px-3 py-2 text-sm font-medium transition-colors', tab === t.key ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-500 hover:text-gray-700')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'sales' && <SalesReportTab />}
      {tab === 'inventory' && <InventoryReportTab />}
      {tab === 'design' && <SimpleAggregateReport title="Design Report" fetcher={getDesignReport} nameLabel="Design" />}
      {tab === 'ageGroup' && <SimpleAggregateReport title="Age Group Report" fetcher={getAgeGroupReport} nameLabel="Age Group" />}
      {tab === 'productType' && <SimpleAggregateReport title="Product Type Report" fetcher={getProductTypeReport} nameLabel="Product Type" />}
      {tab === 'color' && <SimpleAggregateReport title="Color Report" fetcher={getColorReport} nameLabel="Color" showSwatch />}
    </div>
  );
}

function ReportToolbar({ onExport, onPrint }) {
  return (
    <div className="no-print flex justify-end gap-2">
      {onExport && <Button variant="secondary" icon={Download} onClick={onExport}>Export CSV</Button>}
      <Button variant="secondary" icon={Printer} onClick={onPrint || (() => window.print())}>Print</Button>
    </div>
  );
}

function SalesReportTab() {
  const [range, setRange] = useState('this_month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'sales', range, startDate, endDate],
    queryFn: () => getSalesReport({ range: range || undefined, startDate: startDate || undefined, endDate: endDate || undefined }),
  });

  const columns = [
    { key: '_id', header: 'Date' },
    { key: 'quantity', header: 'Units Sold' },
    { key: 'revenue', header: 'Revenue', render: (r) => CURRENCY.format(r.revenue) },
  ];

  return (
    <div className="print-area space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <DateRangeFilter range={range} onRangeChange={setRange} startDate={startDate} endDate={endDate} onStartDateChange={setStartDate} onEndDateChange={setEndDate} />
        <ReportToolbar onExport={() => exportToCsv('sales-report.csv', data?.daily || [])} />
      </div>

      <CardsGrid>
        <StatCard icon={TrendingUp} label="Total Revenue" value={CURRENCY.format(data?.summary?.totalRevenue || 0)} />
        <StatCard icon={ShoppingBag} label="Total Units Sold" value={data?.summary?.totalQuantity || 0} />
        <StatCard icon={Package} label="Total Sales" value={data?.summary?.totalSales || 0} />
      </CardsGrid>

      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-card">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data?.daily || []}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="_id" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="revenue" fill="#3d63f5" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <DataTable columns={columns} rows={data?.daily} loading={isLoading} rowKey="_id" emptyTitle="No sales in this range" />
    </div>
  );
}

function InventoryReportTab() {
  const { data, isLoading } = useQuery({ queryKey: ['reports', 'inventory'], queryFn: getInventoryReport });

  const columns = [
    { key: 'ageGroup', header: 'Age', render: (r) => r.ageGroup?.name },
    { key: 'design', header: 'Design', render: (r) => r.design?.name },
    { key: 'productType', header: 'Type', render: (r) => r.productType?.name },
    { key: 'color', header: 'Color', render: (r) => <ColorLabel color={r.color} /> },
    { key: 'sku', header: 'SKU', render: (r) => <span className="font-mono text-xs">{r.sku}</span> },
    { key: 'currentStock', header: 'Current Stock' },
    { key: 'totalSold', header: 'Sold' },
    { key: 'costPrice', header: 'Stock Value', render: (r) => CURRENCY.format(r.currentStock * r.costPrice) },
  ];

  return (
    <div className="print-area space-y-4">
      <div className="flex justify-end">
        <ReportToolbar
          onExport={() => exportToCsv('inventory-report.csv', (data?.products || []).map((p) => ({
            ageGroup: p.ageGroup?.name, design: p.design?.name, productType: p.productType?.name, color: p.color?.name, sku: p.sku,
            currentStock: p.currentStock, totalSold: p.totalSold, stockValue: p.currentStock * p.costPrice,
          })))}
        />
      </div>

      <CardsGrid>
        <StatCard icon={Package} label="Total Stock" value={data?.summary?.totalStock || 0} />
        <StatCard icon={TrendingUp} label="Total Stock Value" value={CURRENCY.format(data?.summary?.totalStockValue || 0)} />
        <StatCard icon={ShoppingBag} label="Low Stock Items" value={data?.summary?.lowStock || 0} tone="warning" />
        <StatCard icon={Package} label="Out of Stock" value={data?.summary?.outOfStock || 0} tone="danger" />
      </CardsGrid>

      <DataTable columns={columns} rows={data?.products} loading={isLoading} emptyTitle="No inventory data" />
    </div>
  );
}

function SimpleAggregateReport({ title, fetcher, nameLabel, showSwatch = false }) {
  const { data, isLoading } = useQuery({ queryKey: ['reports', title], queryFn: fetcher });

  const columns = [
    { key: '_id', header: nameLabel, render: (r) => (showSwatch ? <ColorLabel color={{ name: r._id, hexCode: r.hexCode }} /> : r._id) },
    { key: 'quantity', header: 'Units Sold' },
    { key: 'revenue', header: 'Revenue', render: (r) => CURRENCY.format(r.revenue) },
  ];

  return (
    <div className="print-area space-y-4">
      <div className="flex justify-end">
        <ReportToolbar onExport={() => exportToCsv(`${title.toLowerCase().replace(/\s+/g, '-')}.csv`, data || [])} />
      </div>
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-card">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data || []}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="_id" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={70} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="quantity" fill="#5c85ff" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <DataTable columns={columns} rows={data} loading={isLoading} rowKey="_id" emptyTitle="No data available" />
    </div>
  );
}

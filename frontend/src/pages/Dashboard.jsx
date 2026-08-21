import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Boxes, Wallet, ShoppingCart, TrendingUp, AlertTriangle, Users2, PiggyBank, UserCog,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from 'recharts';
import { CardsGrid, StatCard } from '../components/DashboardCards';
import DateRangeFilter from '../components/DateRangeFilter';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import StockBadge, { getStockStatus } from '../components/StockBadge';
import { getDashboard } from '../services/reportService';
import { useAuth } from '../context/AuthContext';

const CURRENCY = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const COLORS = ['#7A362A', '#EF7A3C', '#C0705A', '#FEC194', '#5A2622', '#F89C63'];

export default function Dashboard() {
  const { isSuperAdmin, user } = useAuth();
  const [range, setRange] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard', range, startDate, endDate],
    queryFn: () => getDashboard({ range: range || undefined, startDate: startDate || undefined, endDate: endDate || undefined }),
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isError || !data) {
    return <EmptyState title="Unable to load dashboard" description="Please try again in a moment." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-brand-800 px-5 py-4 shadow-glow sm:px-6">
        <p className="text-sm text-brand-100">
          Welcome back, <span className="font-semibold text-white">{user?.name}</span>. Here's what's happening today.
        </p>
        <DateRangeFilter
          range={range} onRangeChange={setRange}
          startDate={startDate} endDate={endDate}
          onStartDateChange={setStartDate} onEndDateChange={setEndDate}
        />
      </div>

      <CardsGrid>
        <StatCard icon={Boxes} label="Total Products" value={data.totalProducts} />
        <StatCard icon={Boxes} label="Total Available Stock" value={data.totalAvailableStock} tone="success" />
        <StatCard icon={Wallet} label="Total Stock Value" value={CURRENCY.format(data.totalStockValue)} />
        <StatCard icon={ShoppingCart} label="Today's Sales" value={data.todaySalesCount} hint={`${data.todayQuantitySold} units sold`} />
        <StatCard icon={TrendingUp} label="Today's Revenue" value={CURRENCY.format(data.todayRevenue)} tone="success" />
        <StatCard icon={TrendingUp} label="This Month Revenue" value={CURRENCY.format(data.monthRevenue)} hint={`${data.monthQuantitySold} units this month`} />
        <StatCard icon={AlertTriangle} label="Low Stock Products" value={data.lowStockCount} tone="warning" />
        {isSuperAdmin && <StatCard icon={Users2} label="Total Investors" value={data.totalInvestors} hint={`${data.activeInvestors} active`} />}
        {isSuperAdmin && <StatCard icon={PiggyBank} label="Total Investment" value={CURRENCY.format(data.totalInvestment)} />}
        {isSuperAdmin && <StatCard icon={UserCog} label="Total Admin Users" value={data.totalAdminUsers} />}
      </CardsGrid>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Daily Sales (Last 30 Days)">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.charts.dailySales}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="_id" tick={{ fontSize: 11 }} tickFormatter={(v) => v?.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="revenue" fill="#7A362A" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Sales by Age Group">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.charts.salesByAgeGroup} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="_id" type="category" tick={{ fontSize: 11 }} width={90} />
              <Tooltip />
              <Bar dataKey="quantity" fill="#C0705A" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Sales by Design">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.charts.salesByDesign}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="_id" tick={{ fontSize: 10 }} interval={0} angle={-30} textAnchor="end" height={70} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="quantity" fill="#EF7A3C" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Sales by Color">
          {data.charts.salesByColor?.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={data.charts.salesByColor} dataKey="quantity" nameKey="_id" outerRadius={90} label={(d) => d._id}>
                  {data.charts.salesByColor.map((entry, idx) => (
                    <Cell key={entry._id} fill={entry.hexCode || COLORS[idx % COLORS.length]} stroke="#e5e7eb" />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="No sales yet" description="Sales by color will appear here once sales are recorded." />
          )}
        </ChartCard>

        <ChartCard title="Top-Selling Designs">
          {data.charts.topDesigns?.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={data.charts.topDesigns} dataKey="quantity" nameKey="_id" outerRadius={90} label={(d) => d._id}>
                  {data.charts.topDesigns.map((entry, idx) => (
                    <Cell key={entry._id} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="No sales yet" description="Top-selling designs will appear here once sales are recorded." />
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-100 bg-white shadow-card">
          <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
            <AlertTriangle size={15} className="text-amber-500" />
            <h3 className="text-sm font-semibold text-gray-900">Low Stock Products</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {data.lowStockProducts?.length ? (
              data.lowStockProducts.map((p) => (
                <div key={p._id} className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-brand-50/40">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{p.design?.name} · {p.productType?.name}</p>
                    <p className="truncate text-xs text-gray-400">{p.ageGroup?.name} · SKU: {p.sku}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-sm font-semibold text-gray-700">{p.currentStock}</span>
                    <StockBadge status={getStockStatus(p.currentStock, p.reorderLevel)} />
                  </div>
                </div>
              ))
            ) : (
              <div className="px-5 py-8 text-center text-sm text-gray-400">All products are well stocked.</div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white shadow-card">
          <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
            <ShoppingCart size={15} className="text-brand-600" />
            <h3 className="text-sm font-semibold text-gray-900">Recent Sales</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {data.recentSales?.length ? (
              data.recentSales.map((s) => (
                <div key={s._id} className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-brand-50/40">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{s.design?.name} · {s.productType?.name}</p>
                    <p className="truncate text-xs text-gray-400">{s.ageGroup?.name} · Qty {s.quantity} · by {s.soldBy?.name}</p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-gray-700">{CURRENCY.format(s.totalAmount)}</span>
                </div>
              ))
            ) : (
              <div className="px-5 py-8 text-center text-sm text-gray-400">No sales recorded yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-card">
      <h3 className="mb-3 text-sm font-semibold text-gray-900">{title}</h3>
      {children}
    </div>
  );
}

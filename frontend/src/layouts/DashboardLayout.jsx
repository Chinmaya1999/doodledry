import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { BRAND_NAME } from '../utils/brand';

const TITLES = {
  '/dashboard': 'Dashboard',
  '/inventory': 'All Inventory',
  '/inventory/add-stock': 'Add Stock',
  '/inventory/history': 'Stock History',
  '/inventory/low-stock': 'Low Stock',
  '/products': 'Products',
  '/products/new': 'Create Inventory Product',
  '/age-groups': 'Age Groups',
  '/designs': 'Designs',
  '/product-types': 'Product Types',
  '/colors': 'Colors',
  '/barcode-generator': 'Barcode Generator',
  '/scan-sell': 'Scan & Sell',
  '/sales-history': 'Sales History',
  '/returns': 'Returns',
  '/investors': 'Investors',
  '/reports': 'Reports',
  '/users': 'Users',
  '/audit-logs': 'Audit Logs',
  '/settings': 'Settings',
};

function resolveTitle(pathname) {
  if (TITLES[pathname]) return TITLES[pathname];
  if (pathname.startsWith('/products/')) return 'Product Details';
  return `${BRAND_NAME} Inventory`;
}

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setSidebarOpen(true)} title={resolveTitle(location.pathname)} />
        <main className="scrollbar-thin flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AllInventory from './pages/inventory/AllInventory';
import AddStock from './pages/inventory/AddStock';
import StockHistory from './pages/inventory/StockHistory';
import LowStock from './pages/inventory/LowStock';
import Products from './pages/products/Products';
import CreateProduct from './pages/products/CreateProduct';
import ProductDetail from './pages/products/ProductDetail';
import AgeGroups from './pages/catalog/AgeGroups';
import Designs from './pages/catalog/Designs';
import ProductTypes from './pages/catalog/ProductTypes';
import Colors from './pages/catalog/Colors';
import BarcodeGenerator from './pages/BarcodeGenerator';
import ScanSell from './pages/ScanSell';
import SalesHistory from './pages/SalesHistory';
import Returns from './pages/Returns';
import Investors from './pages/Investors';
import Reports from './pages/Reports';
import Users from './pages/Users';
import AuditLogs from './pages/AuditLogs';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: 1, staleTime: 15_000 },
  },
});

const SUPER_ADMIN_ONLY = ['SUPER_ADMIN'];

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<DashboardLayout />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />

                <Route path="/inventory" element={<AllInventory />} />
                <Route path="/inventory/history" element={<StockHistory />} />
                <Route path="/inventory/low-stock" element={<LowStock />} />

                <Route path="/scan-sell" element={<ScanSell />} />
                <Route path="/sales-history" element={<SalesHistory />} />
                <Route path="/returns" element={<Returns />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/products/:id" element={<ProductDetail />} />

                <Route element={<ProtectedRoute roles={SUPER_ADMIN_ONLY} />}>
                  <Route path="/inventory/add-stock" element={<AddStock />} />
                  <Route path="/products" element={<Products />} />
                  <Route path="/products/new" element={<CreateProduct />} />
                  <Route path="/age-groups" element={<AgeGroups />} />
                  <Route path="/designs" element={<Designs />} />
                  <Route path="/product-types" element={<ProductTypes />} />
                  <Route path="/colors" element={<Colors />} />
                  <Route path="/barcode-generator" element={<BarcodeGenerator />} />
                  <Route path="/investors" element={<Investors />} />
                  <Route path="/users" element={<Users />} />
                  <Route path="/audit-logs" element={<AuditLogs />} />
                  <Route path="/settings" element={<Settings />} />
                </Route>
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

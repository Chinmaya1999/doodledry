import { useAuth } from '../context/AuthContext';
import { BRAND_NAME } from '../utils/brand';

export default function Settings() {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-card">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Account</h2>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Info label="Name" value={user?.name} />
          <Info label="Email" value={user?.email} />
          <Info label="Phone" value={user?.phone} />
          <Info label="Role" value={user?.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'} />
        </dl>
        <p className="mt-4 text-xs text-gray-400">To change your password, contact a Super Admin from the Users page.</p>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-card">
        <h2 className="mb-2 text-base font-semibold text-gray-900">Catalog Management</h2>
        <p className="text-sm text-gray-500">
          Age groups, designs, and product types are managed from the Products section of the sidebar. Barcode labels can be
          generated and printed from Barcode Generator.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-card">
        <h2 className="mb-2 text-base font-semibold text-gray-900">System</h2>
        <p className="text-sm text-gray-500">{BRAND_NAME} Inventory Management System · v1.0.0</p>
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <dt className="text-xs text-gray-400">{label}</dt>
      <dd className="text-sm font-medium text-gray-800">{value}</dd>
    </div>
  );
}

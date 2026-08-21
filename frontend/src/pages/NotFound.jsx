import { Link } from 'react-router-dom';
import { Shirt } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-gray-50 px-4 text-center">
      <Shirt size={32} className="text-gray-300" />
      <h1 className="text-2xl font-bold text-gray-900">404 — Page not found</h1>
      <p className="text-sm text-gray-500">The page you're looking for doesn't exist.</p>
      <Link to="/dashboard" className="mt-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
        Back to Dashboard
      </Link>
    </div>
  );
}

import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page, pages, total, onPageChange }) {
  if (!pages || pages <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-gray-100 bg-white px-4 py-3">
      <p className="text-sm text-gray-500">
        Page <span className="font-medium text-gray-800">{page}</span> of{' '}
        <span className="font-medium text-gray-800">{pages}</span>
        {typeof total === 'number' && <span className="ml-1">({total} total)</span>}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 disabled:cursor-not-allowed disabled:opacity-40 hover:bg-gray-50"
        >
          <ChevronLeft size={16} /> Prev
        </button>
        <button
          type="button"
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
          className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 disabled:cursor-not-allowed disabled:opacity-40 hover:bg-gray-50"
        >
          Next <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

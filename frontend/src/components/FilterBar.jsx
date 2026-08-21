import { SlidersHorizontal, X } from 'lucide-react';

export default function FilterBar({ children, onClear, hasActiveFilters }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-gray-100 bg-white p-3 shadow-card">
      <div className="flex items-center gap-1.5 pr-2 text-sm font-medium text-gray-500">
        <SlidersHorizontal size={15} />
        Filters
      </div>
      <div className="flex flex-1 flex-wrap items-center gap-2">{children}</div>
      {hasActiveFilters && (
        <button
          type="button"
          onClick={onClear}
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50"
        >
          <X size={14} /> Clear
        </button>
      )}
    </div>
  );
}

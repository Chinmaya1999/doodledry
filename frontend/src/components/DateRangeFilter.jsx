import { Select, Input } from './FormField';

export const RANGE_OPTIONS = [
  { value: '', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'this_week', label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'custom', label: 'Custom Range' },
];

export default function DateRangeFilter({ range, onRangeChange, startDate, endDate, onStartDateChange, onEndDateChange }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={range} onChange={(e) => onRangeChange(e.target.value)} className="w-40">
        {RANGE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </Select>
      {range === 'custom' && (
        <>
          <Input type="date" value={startDate} onChange={(e) => onStartDateChange(e.target.value)} className="w-40" />
          <span className="text-sm text-gray-400">to</span>
          <Input type="date" value={endDate} onChange={(e) => onEndDateChange(e.target.value)} className="w-40" />
        </>
      )}
    </div>
  );
}

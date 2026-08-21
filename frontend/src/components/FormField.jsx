import { forwardRef } from 'react';
import clsx from 'clsx';

export function Field({ label, error, required, children, hint, className = '' }) {
  return (
    <div className={clsx('mb-4', className)}>
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}

const baseInputClass =
  'block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-gray-50 disabled:text-gray-400';

export const Input = forwardRef(function Input({ className = '', error, ...rest }, ref) {
  return <input ref={ref} className={clsx(baseInputClass, error && 'border-rose-400', className)} {...rest} />;
});

export const Textarea = forwardRef(function Textarea({ className = '', error, ...rest }, ref) {
  return <textarea ref={ref} className={clsx(baseInputClass, error && 'border-rose-400', className)} rows={3} {...rest} />;
});

export const Select = forwardRef(function Select({ className = '', error, children, ...rest }, ref) {
  return (
    <select ref={ref} className={clsx(baseInputClass, 'pr-8', error && 'border-rose-400', className)} {...rest}>
      {children}
    </select>
  );
});

export function Checkbox({ label, className = '', ...rest }) {
  return (
    <label className={clsx('flex items-center gap-2 text-sm text-gray-700', className)}>
      <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" {...rest} />
      {label}
    </label>
  );
}

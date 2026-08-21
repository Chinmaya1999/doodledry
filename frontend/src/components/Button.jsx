import clsx from 'clsx';
import LoadingSpinner from './LoadingSpinner';

const VARIANTS = {
  primary: 'bg-brand-700 text-white hover:bg-brand-800 shadow-soft focus-visible:outline-brand-700',
  secondary: 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 focus-visible:outline-gray-400',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 shadow-soft focus-visible:outline-rose-600',
  ghost: 'text-gray-600 hover:bg-gray-100 shadow-none',
};

const SIZES = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
};

export default function Button({
  children, variant = 'primary', size = 'md', className = '', loading = false, disabled = false, icon: Icon, type = 'button', ...rest
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100',
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...rest}
    >
      {loading ? <LoadingSpinner size="sm" className={variant === 'primary' || variant === 'danger' ? 'text-white' : ''} /> : Icon && <Icon size={16} />}
      {children}
    </button>
  );
}

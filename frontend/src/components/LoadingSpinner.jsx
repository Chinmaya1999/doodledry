import { Loader2 } from 'lucide-react';
import clsx from 'clsx';

const SIZES = { sm: 16, md: 24, lg: 36 };

export default function LoadingSpinner({ size = 'md', className = '' }) {
  return (
    <Loader2
      size={SIZES[size] || SIZES.md}
      className={clsx('animate-spin text-brand-500', className)}
    />
  );
}

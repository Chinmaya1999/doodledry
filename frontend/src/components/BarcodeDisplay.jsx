export default function BarcodeDisplay({ src, alt = 'Barcode', className = '' }) {
  if (!src) return null;
  return <img src={src} alt={alt} className={`h-16 rounded-lg border border-gray-100 bg-white p-2 ${className}`} />;
}

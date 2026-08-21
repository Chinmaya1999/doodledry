export default function QRCodeDisplay({ src, alt = 'QR Code', size = 140 }) {
  if (!src) return null;
  return <img src={src} alt={alt} width={size} height={size} className="rounded-lg border border-gray-100 bg-white p-2" />;
}

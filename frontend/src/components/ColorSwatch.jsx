export default function ColorSwatch({ hexCode, name, size = 14 }) {
  return (
    <span
      className="inline-block shrink-0 rounded-full border border-black/10"
      style={{ width: size, height: size, backgroundColor: hexCode || '#e5e7eb' }}
      title={name}
    />
  );
}

export function ColorLabel({ color, className = '' }) {
  if (!color) return <span className="text-gray-400">—</span>;
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <ColorSwatch hexCode={color.hexCode} name={color.name} />
      {color.name}
    </span>
  );
}

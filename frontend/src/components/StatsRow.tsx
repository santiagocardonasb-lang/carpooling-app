const STATS = [
  { value: '50%',  label: 'menos en gastos' },
  { value: 'CO₂',  label: 'menos emisiones' },
  { value: '100%', label: 'gratuito' },
];

/**
 * Las tres cifras del pie de la portada.
 *
 * Estaban escritas tres veces, literalmente idénticas, una por cada variante
 * de Home. Cambiar una cifra obligaba a acordarse de las otras dos.
 */
export default function StatsRow() {
  return (
    <div className="grid grid-cols-3 gap-4 text-center">
      {STATS.map(({ value, label }) => (
        <div key={label}>
          <p className="text-fg font-extrabold text-xl tracking-tight">{value}</p>
          <p className="text-fg-faint text-[11px] mt-0.5 leading-tight">{label}</p>
        </div>
      ))}
    </div>
  );
}

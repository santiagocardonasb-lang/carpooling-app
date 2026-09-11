import { ReactNode } from 'react';

export interface Segment<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
  /** Segunda línea, más chica. Solo la usa la variante `card`. */
  sub?: string;
  /** Número al lado de la etiqueta, para contadores de pendientes. */
  badge?: number;
}

interface Props<T extends string> {
  options: Segment<T>[];
  value: T;
  onChange: (v: T) => void;
  /**
   * `pill`  — pastillas sueltas, para filtros y orden
   * `group` — pastillas dentro de un carril, para alternar entre dos vistas
   * `card`  — pastillas grandes con subtítulo, para modalidades de viaje
   */
  variant?: 'pill' | 'group' | 'card';
  /** Permite desplazarlas de lado cuando no caben. */
  scroll?: boolean;
  ariaLabel?: string;
}

/**
 * Pastillas de selección con la activa en negro.
 *
 * Unifica tres controles que estaban escritos por separado y no se parecían
 * entre sí: el filtro de vehículo y el orden en la búsqueda, y las pestañas de
 * "Mis viajes". Los tres hacen lo mismo —elegir una opción de una lista corta—
 * así que ahora se ven igual.
 */
export default function SegmentedControl<T extends string>({
  options, value, onChange, variant = 'pill', scroll, ariaLabel,
}: Props<T>) {
  const wrapper = [
    'flex items-center gap-2',
    scroll ? 'overflow-x-auto no-scrollbar -mx-1 px-1' : '',
    variant === 'group' ? 'bg-subtle p-1 rounded-full gap-1' : '',
  ].join(' ');

  return (
    <div className={wrapper} role="tablist" aria-label={ariaLabel}>
      {options.map(({ value: v, label, icon, sub, badge }) => {
        const active = v === value;

        const base = 'flex-shrink-0 flex items-center transition-all font-bold';
        const shape =
          variant === 'card'
            ? 'gap-2.5 px-4 py-2.5 rounded-2xl border text-left'
            : variant === 'group'
              ? 'flex-1 justify-center gap-1.5 px-4 py-2 rounded-full text-[13px]'
              : 'gap-1.5 px-3.5 py-2 rounded-full border text-xs';

        const skin = active
          ? (variant === 'group'
              ? 'bg-surface text-fg shadow-card'
              : 'bg-primary text-on-primary border-primary shadow-card')
          : (variant === 'group'
              ? 'text-fg-muted hover:text-fg'
              : 'bg-surface text-fg-muted border-line hover:border-fg-faint');

        return (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(v)}
            className={`${base} ${shape} ${skin}`}
          >
            {icon}
            {variant === 'card' && sub ? (
              <span className="flex flex-col items-start leading-none gap-0.5">
                <span className="text-[13px]">{label}</span>
                <span className={`text-[10px] font-medium ${
                  active ? 'text-on-primary/70' : 'text-fg-faint'
                }`}>
                  {sub}
                </span>
              </span>
            ) : (
              <span>{label}</span>
            )}
            {badge != null && badge > 0 && (
              <span className={`ml-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px]
                leading-[18px] text-center font-bold ${
                active ? 'bg-on-primary text-primary' : 'bg-notify text-white'
              }`}>
                {badge > 9 ? '9+' : badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

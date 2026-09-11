interface Props {
  /** El texto no es opcional por diseño: ver la nota de abajo. */
  label: string;
  /** Fondo oscuro con texto claro, para ponerlo sobre el mapa. */
  onDark?: boolean;
}

/**
 * Señal de "está pasando ahora": un punto que late junto a una etiqueta.
 *
 * La etiqueta es obligatoria a propósito. El punto verde sobre fondo claro no
 * alcanza el contraste mínimo que se le exige a un elemento que carga
 * significado por sí solo, así que quien no distinga ese verde se quedaría sin
 * la información. Con el texto al lado, el punto pasa a ser refuerzo y no el
 * único portador del mensaje.
 */
export default function LiveDot({ label, onDark }: Props) {
  return (
    <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-bold
      ${onDark ? 'bg-black/80 text-white' : 'bg-subtle text-fg'}`}>
      <span className="relative flex h-2 w-2 flex-shrink-0" aria-hidden>
        <span className="absolute inline-flex h-full w-full rounded-full bg-live opacity-70 animate-ping" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-live" />
      </span>
      {label}
    </span>
  );
}

import { useEffect, useState } from 'react';

/**
 * Pantalla de entrada.
 *
 * Antes usaba Lottie con un JSON de 230 KB: media hora de trabajo del
 * navegador y ~550 KB de descarga sólo para saludar. Esta versión es SVG
 * y CSS, no pesa nada, y usa la misma marca del favicon para que la app
 * se presente igual en todas partes.
 */
export default function LoadingScreen({ onDone }: { onDone: () => void }) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // 1,5 s alcanza para que la animación se lea. Antes eran 2,8 s de
    // espera obligatoria en cada carga, que es mucho pedirle a alguien
    // que solo quiere ver si le aceptaron el viaje.
    const t = setTimeout(() => {
      setFading(true);
      setTimeout(onDone, 420);
    }, 1500);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center
        bg-black transition-opacity duration-[420ms]
        ${fading ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
    >
      <div className="splash-mark">
        <svg viewBox="0 0 32 32" width="88" height="88" fill="none" aria-hidden="true">
          <rect width="32" height="32" rx="7.5" className="splash-badge" />
          <g className="splash-car" fill="#FAFAFA">
            <path d="M6.4 19.9h19.2a1.5 1.5 0 0 0 1.5-1.5v-2.2a2.9 2.9 0 0 0-2.1-2.8l-1.3-.4-1.9-3.6A3.1 3.1 0 0 0 19 7.7h-6a3.1 3.1 0 0 0-2.8 1.7L8.3 13l-1.3.4a2.9 2.9 0 0 0-2.1 2.8v2.2a1.5 1.5 0 0 0 1.5 1.5Z" />
            <circle cx="10.4" cy="20.7" r="3" />
            <circle cx="21.6" cy="20.7" r="3" />
          </g>
          <g fill="#0B0B0F">
            <path d="M13 10h6c.45 0 .87.25 1.08.66L21.5 13.3h-11l1.42-2.64A1.22 1.22 0 0 1 13 10Z" />
            <circle cx="10.4" cy="20.7" r="1.25" />
            <circle cx="21.6" cy="20.7" r="1.25" />
          </g>
        </svg>
      </div>

      <p className="splash-word mt-6 text-white text-2xl font-extrabold tracking-tight select-none">
        carpool
      </p>

      <div className="splash-track mt-5" aria-hidden="true">
        <span className="splash-fill" />
      </div>
    </div>
  );
}

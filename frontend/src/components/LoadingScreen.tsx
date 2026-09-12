import { useEffect, useState } from 'react';
import Wordmark from './Wordmark';

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
        bg-canvas transition-opacity duration-[420ms]
        ${fading ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
    >
      {/* La marca se invierte con el tema: insignia oscura sobre fondo claro y
          al revés. Los rellenos salen de los tokens, no de hexadecimales, para
          que no haya una versión que desaparezca contra su propio fondo. */}
      <div className="splash-mark">
        <svg viewBox="0 0 36 36" width="92" height="92" fill="none" aria-hidden="true">
          <rect x="0" y="4" width="36" height="28" rx="8" className="fill-fg" />
          <g className="splash-car">
            <path d="M7 16L12 10H24L29 16V22H7V16Z" className="fill-canvas" />
            <circle cx="10" cy="24" r="3" className="fill-canvas" />
            <circle cx="26" cy="24" r="3" className="fill-canvas" />
          </g>
          <rect x="11" y="12" width="6" height="4" rx="1" className="fill-fg" />
          <rect x="19" y="12" width="6" height="4" rx="1" className="fill-fg" />
        </svg>
      </div>

      <div className="splash-word mt-6">
        <Wordmark size="lg" mark={false} />
      </div>

      <div className="splash-track mt-5" aria-hidden="true">
        <span className="splash-fill" />
      </div>
    </div>
  );
}

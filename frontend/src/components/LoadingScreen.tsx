import { useEffect, useRef, useState } from 'react';
import Lottie, { LottieRefCurrentProps } from 'lottie-react';
import carAnimation from '../assets/White car.json';

export default function LoadingScreen({ onDone }: { onDone: () => void }) {
  const lottieRef = useRef<LottieRefCurrentProps>(null);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // Show animation for ~2.8s then fade out
    const t = setTimeout(() => {
      setFading(true);
      setTimeout(onDone, 500);
    }, 2800);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      className={`fixed inset-0 bg-black flex flex-col items-center justify-center z-[9999]
        transition-opacity duration-500
        ${fading ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
    >
      <Lottie
        lottieRef={lottieRef}
        animationData={carAnimation}
        loop
        autoplay
        style={{ width: 320, height: 320 }}
      />

      <p className="text-zinc-700 text-[10px] tracking-[0.5em] uppercase -mt-6
                    font-semibold select-none">
        carpool
      </p>
    </div>
  );
}

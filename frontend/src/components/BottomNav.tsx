import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { House, MagnifyingGlass, BookOpen, ChatCircle, Plus, Bell } from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext';
import { useUnread } from '../context/UnreadContext';

interface Tab {
  to: string;
  Icon: Icon;
  label: string;
  badge?: number;
}

/** Posición del botón principal entre las cinco pestañas. */
const MAIN = 2;

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -top-1 -right-1.5 min-w-[15px] h-[15px] bg-notify rounded-full flex items-center justify-center px-0.5 pointer-events-none">
      <span className="text-white text-[8px] font-bold leading-none">{count > 9 ? '9+' : count}</span>
    </span>
  );
}

/**
 * Anima lo que envuelve una sola vez, al montarse.
 *
 * La decisión se congela al montar, así que un re-render cualquiera (llega un
 * mensaje, cambia un contador) no corta ni repite la animación. Para volver a
 * animar se cambia la `key`, que monta una instancia nueva.
 */
function Once({ play, animation, className = '', children }: {
  play: boolean;
  animation: string;
  className?: string;
  children?: ReactNode;
}) {
  const [on] = useState(play);
  return <span className={`${className} ${on ? animation : ''}`}>{children}</span>;
}

/**
 * Barra inferior del móvil.
 *
 * La acción principal de cada rol va en el centro, levantada sobre la barra:
 * publicar para quien conduce, buscar para quien viaja. Es lo único que la
 * app le pide a cada uno, así que es lo único que va en negro. A los lados,
 * lo propio a la izquierda y lo que llega a la derecha.
 *
 * El movimiento al cambiar de pestaña está descrito en index.css, en la
 * sección de la barra inferior.
 *
 * Las pestañas inactivas van en `fg-muted` y no en `fg-faint`: la barra es
 * translúcida, y cuando pasa algo oscuro por debajo el gris más claro quedaba
 * a 2.6:1. Lo activo se sigue distinguiendo por el icono relleno y el
 * indicador.
 */
export default function BottomNav() {
  const { user } = useAuth();
  const location = useLocation();
  const { unreadMsgs, unreadNotifs } = useUnread();
  const isDriver = user?.role !== 'passenger';

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const main: Tab = isDriver
    ? { to: '/create-ride', Icon: Plus,            label: 'Publicar' }
    : { to: '/search',      Icon: MagnifyingGlass, label: 'Buscar' };

  const left: Tab[] = [
    { to: '/',         Icon: House,    label: 'Inicio' },
    { to: '/my-rides', Icon: BookOpen, label: isDriver ? 'Mis viajes' : 'Reservas' },
  ];
  const right: Tab[] = [
    { to: '/messages',      Icon: ChatCircle, label: 'Mensajes', badge: unreadMsgs },
    { to: '/notifications', Icon: Bell,       label: 'Alertas',  badge: unreadNotifs },
  ];

  // -1 cuando la pantalla no corresponde a ninguna pestaña: perfil, historial...
  const activeIndex = [...left, main, ...right].findIndex((t) => isActive(t.to));

  // Nada de la barra se anima en el primer render, solo en los cambios.
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; }, []);

  // De dónde viene cada cambio de pestaña. Se deriva durante el render y se
  // guarda en estado, no en un ref: así un re-render cualquiera (llega un
  // mensaje, cambia un contador) no altera cómo se anima el cambio en curso.
  // Con un ref, un segundo render antes del siguiente cuadro borraba
  // `is-appearing` y el indicador volvía a deslizarse desde donde estaba.
  const [move, setMove] = useState({
    index: activeIndex,
    // Sin pestaña activa, el indicador se desvanece donde estaba en vez de
    // viajar a la primera posición.
    shown: Math.max(activeIndex, 0),
    // Si no había pestaña activa no hay de dónde deslizarse.
    appearing: false,
  });
  if (activeIndex !== move.index) {
    setMove({
      index: activeIndex,
      shown: activeIndex >= 0 ? activeIndex : move.shown,
      appearing: move.index < 0,
    });
  }

  const { shown, appearing } = move;
  const mainActive = activeIndex === MAIN;
  const pillVisible = activeIndex >= 0 && !mainActive;

  const tab = ({ to, Icon, label, badge = 0 }: Tab) => {
    const active = isActive(to);
    return (
      <Link
        key={to}
        to={to}
        aria-current={active ? 'page' : undefined}
        className={`relative flex-1 flex flex-col items-center justify-end pb-2 gap-1 active:opacity-70 ${
          active ? 'text-fg' : 'text-fg-muted'
        }`}
      >
        <Once
          key={active ? 'on' : 'off'}
          play={active && mounted.current}
          animation="nav-pop"
          className="relative flex"
        >
          <Icon size={22} weight={active ? 'fill' : 'regular'} />
          <Badge count={badge} />
        </Once>
        <span className="text-[9px] font-medium tracking-tight leading-none">{label}</span>
      </Link>
    );
  };

  const { Icon: MainIcon } = main;

  return (
    <nav
      className="glass-bar sm:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-line"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {/* `items-end` apoya cada pestaña en el borde inferior; la del centro es
          más alta que la barra y por eso asoma por arriba. */}
      <div className="relative flex items-end h-[58px]">

        {/* Indicador: ocupa una de las cinco columnas y se traslada entre
            ellas. Va primero para quedar debajo de las pestañas, que son
            `relative`; al pasar por el centro se esconde bajo el botón. */}
        <span
          aria-hidden
          className={`nav-track ${appearing ? 'is-appearing' : ''}
            absolute inset-y-0 left-0 w-1/5 pointer-events-none`}
          style={{ transform: `translateX(${shown * 100}%)`, opacity: pillVisible ? 1 : 0 }}
        >
          <Once
            key={shown}
            play={mounted.current && !appearing}
            animation="nav-stretch"
            className="absolute left-1/2 top-[10px] -ml-6 w-12 h-8 rounded-full bg-fg/[0.08]"
          />
        </span>

        {left.map(tab)}

        <Link
          to={main.to}
          aria-current={mainActive ? 'page' : undefined}
          className="group relative flex-1 flex flex-col items-center justify-end pb-2 gap-1"
        >
          <span
            className={`nav-fab relative w-12 h-12 rounded-full bg-primary text-on-primary shadow-lift
              flex items-center justify-center ring-primary/15 group-active:scale-[.97]
              ${mainActive ? 'ring-[3px]' : 'ring-0'}`}
          >
            <Once
              key={mainActive ? 'on' : 'off'}
              play={mainActive && mounted.current}
              animation="nav-ripple"
              className="absolute inset-0 rounded-full bg-primary opacity-0 pointer-events-none"
            />
            <Once key={main.to} play={mounted.current} animation="nav-swap" className="relative flex">
              <MainIcon size={22} weight="bold" />
            </Once>
          </span>
          <Once
            key={main.to}
            play={mounted.current}
            animation="animate-fade"
            className={`text-[9px] font-semibold tracking-tight leading-none transition-colors ${
              mainActive ? 'text-fg' : 'text-fg-muted'
            }`}
          >
            {main.label}
          </Once>
        </Link>

        {right.map(tab)}
      </div>
    </nav>
  );
}

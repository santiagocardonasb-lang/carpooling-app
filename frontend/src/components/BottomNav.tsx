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

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -top-1 -right-1.5 min-w-[15px] h-[15px] bg-notify rounded-full flex items-center justify-center px-0.5 pointer-events-none">
      <span className="text-white text-[8px] font-bold leading-none">{count > 9 ? '9+' : count}</span>
    </span>
  );
}

/**
 * Barra inferior del móvil.
 *
 * La acción principal de cada rol va en el centro, levantada sobre la barra:
 * publicar para quien conduce, buscar para quien viaja. Es lo único que la
 * app le pide a cada uno, así que es lo único que va en negro. A los lados,
 * lo propio a la izquierda y lo que llega a la derecha.
 *
 * El botón sobresale por encima de la barra; `--nav-clear` en index.css
 * cuenta ese alto para que ninguna página termine debajo de él.
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

  const tab = ({ to, Icon, label, badge = 0 }: Tab) => {
    const active = isActive(to);
    return (
      <Link
        key={to}
        to={to}
        aria-current={active ? 'page' : undefined}
        className={`flex-1 flex flex-col items-center justify-end pb-2 gap-1 active:opacity-70 ${
          active ? 'text-fg' : 'text-fg-faint'
        }`}
      >
        <span className="relative">
          <Icon size={22} weight={active ? 'fill' : 'regular'} />
          <Badge count={badge} />
        </span>
        <span className="text-[9px] font-medium tracking-tight leading-none">{label}</span>
      </Link>
    );
  };

  const { Icon: MainIcon } = main;
  const mainActive = isActive(main.to);

  return (
    <nav
      className="glass-bar sm:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-line"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {/* `items-end` apoya cada pestaña en el borde inferior; la del centro es
          más alta que la barra y por eso asoma por arriba. */}
      <div className="flex items-end h-[58px]">
        {left.map(tab)}

        <Link
          to={main.to}
          aria-current={mainActive ? 'page' : undefined}
          className="group flex-1 flex flex-col items-center justify-end pb-2 gap-1"
        >
          <span
            className={`w-14 h-14 rounded-full bg-primary text-on-primary shadow-lift
              flex items-center justify-center
              transition-transform duration-150 group-active:scale-[.97]
              ${mainActive ? 'ring-4 ring-primary/15' : ''}`}
          >
            <MainIcon size={26} weight="bold" />
          </span>
          <span className={`text-[9px] font-semibold tracking-tight leading-none ${
            mainActive ? 'text-fg' : 'text-fg-faint'
          }`}>
            {main.label}
          </span>
        </Link>

        {right.map(tab)}
      </div>
    </nav>
  );
}

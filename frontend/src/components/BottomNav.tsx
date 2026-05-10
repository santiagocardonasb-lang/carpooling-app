import { Link, useLocation } from 'react-router-dom';
import { House, MagnifyingGlass, BookOpen, ChatCircle, Plus, Bell } from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext';
import { useUnread } from '../context/UnreadContext';

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -top-1 -right-1.5 min-w-[15px] h-[15px] bg-red-500 rounded-full flex items-center justify-center px-0.5 pointer-events-none">
      <span className="text-white text-[8px] font-bold leading-none">{count > 9 ? '9+' : count}</span>
    </span>
  );
}

export default function BottomNav() {
  const { user } = useAuth();
  const location = useLocation();
  const { unreadMsgs, unreadNotifs } = useUnread();
  const isDriver = user?.role !== 'passenger';

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const driverTabs = [
    { to: '/',            Icon: House,             label: 'Inicio',    badge: 0 },
    { to: '/create-ride', Icon: Plus,              label: 'Publicar',  badge: 0 },
    { to: '/my-rides',    Icon: BookOpen,          label: 'Mis viajes',badge: 0 },
    { to: '/messages',    Icon: ChatCircle,        label: 'Mensajes',  badge: unreadMsgs },
    { to: '/notifications',Icon: Bell,             label: 'Alertas',   badge: unreadNotifs },
  ];

  const passengerTabs = [
    { to: '/',             Icon: House,            label: 'Inicio',    badge: 0 },
    { to: '/search',       Icon: MagnifyingGlass,  label: 'Buscar',    badge: 0 },
    { to: '/my-rides',     Icon: BookOpen,         label: 'Reservas',  badge: 0 },
    { to: '/messages',     Icon: ChatCircle,       label: 'Mensajes',  badge: unreadMsgs },
    { to: '/notifications',Icon: Bell,             label: 'Alertas',   badge: unreadNotifs },
  ];

  const tabs = isDriver ? driverTabs : passengerTabs;

  return (
    <nav
      className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-sm border-t border-zinc-900"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex">
        {tabs.map(({ to, Icon, label, badge }) => {
          const active = isActive(to);
          return (
            <Link
              key={to}
              to={to}
              className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-colors active:opacity-70 ${
                active ? 'text-white' : 'text-zinc-600'
              }`}
            >
              <div className="relative">
                <Icon size={22} weight={active ? 'fill' : 'regular'} />
                <Badge count={badge} />
              </div>
              <span className="text-[9px] font-medium tracking-tight">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MagnifyingGlass, Plus, BookOpen, Bell, User, Car, SignOut, GearSix, ChatCircle } from '@phosphor-icons/react';
import { useAuth } from '../context/AuthContext';
import { useUnread } from '../context/UnreadContext';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { unreadNotifs, unreadMsgs, clearNotifs, clearMsgs } = useUnread();

  const isActive = (path: string) => location.pathname === path;
  const isDriver = user?.role !== 'passenger';

  useEffect(() => {
    if (location.pathname === '/notifications') clearNotifs();
    if (location.pathname === '/messages') clearMsgs();
  }, [location.pathname]);

  // Total visible en el avatar — engloba notifs + msgs sin leer
  const unreadTotal = unreadNotifs + unreadMsgs;

  useEffect(() => {
    setDropdownOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [dropdownOpen]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black border-b border-zinc-900">
      <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="text-white font-black text-xl tracking-tight">
          carpool
        </Link>

        {isAuthenticated ? (
          <div className="flex items-center gap-1">
            {/* Links de navegación — solo visibles en desktop (en móvil están en BottomNav) */}
            {!isDriver && (
              <Link
                to="/search"
                className={`hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-colors ${isActive('/search') ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}
              >
                <MagnifyingGlass size={14} weight="duotone" />
                Buscar
              </Link>
            )}

            {isDriver && (
              <Link
                to="/create-ride"
                className={`hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-colors ${isActive('/create-ride') ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}
              >
                <Plus size={14} weight="duotone" />
                Publicar
              </Link>
            )}

            <Link
              to="/my-rides"
              className={`hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-colors ${isActive('/my-rides') ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}
            >
              <BookOpen size={14} weight="duotone" />
              {isDriver ? 'Mis viajes' : 'Mis reservas'}
            </Link>

            {/* Avatar + dropdown */}
            <div className="relative ml-2" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(v => !v)}
                className="relative w-8 h-8 rounded-full bg-zinc-800 hover:ring-2 hover:ring-white transition-all flex items-center justify-center flex-shrink-0"
              >
                {/* overflow-hidden only on inner circle so the badge can escape */}
                <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center">
                  {user?.avatar ? (
                    <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white text-sm font-semibold">
                      {user?.name?.[0]?.toUpperCase()}
                    </span>
                  )}
                </div>
                {unreadTotal > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center px-1 pointer-events-none z-10">
                    <span className="text-white text-[9px] font-bold leading-none">{unreadTotal > 9 ? '9+' : unreadTotal}</span>
                  </span>
                )}
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 top-10 w-52 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden py-1 z-50">
                  <Link
                    to="/profile"
                    className="flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-zinc-800 transition-colors"
                  >
                    <User size={15} weight="duotone" className="text-zinc-400 flex-shrink-0" />
                    Perfil
                  </Link>

                  {isDriver && (
                    <Link
                      to="/vehicle"
                      className="flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-zinc-800 transition-colors"
                    >
                      <Car size={15} weight="duotone" className="text-zinc-400 flex-shrink-0" />
                      Información del vehículo
                    </Link>
                  )}

                  <Link
                    to="/messages"
                    className="flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-zinc-800 transition-colors"
                  >
                    <ChatCircle size={15} weight="duotone" className="text-zinc-400 flex-shrink-0" />
                    <span className="flex-1">Mensajes</span>
                    {unreadMsgs > 0 && (
                      <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                        {unreadMsgs > 9 ? '9+' : unreadMsgs}
                      </span>
                    )}
                  </Link>

                  <Link
                    to="/notifications"
                    className="flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-zinc-800 transition-colors"
                  >
                    <Bell size={15} weight="duotone" className="text-zinc-400 flex-shrink-0" />
                    <span className="flex-1">Notificaciones</span>
                    {unreadNotifs > 0 && (
                      <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                        {unreadNotifs > 9 ? '9+' : unreadNotifs}
                      </span>
                    )}
                  </Link>

                  {/* Links de navegación en dropdown solo para móvil */}
                  <div className="sm:hidden border-t border-zinc-800 my-1" />

                  <Link
                    to="/settings"
                    className="flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-zinc-800 transition-colors"
                  >
                    <GearSix size={15} weight="duotone" className="text-zinc-400 flex-shrink-0" />
                    Configuración
                  </Link>

                  <div className="border-t border-zinc-800 my-1" />

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-zinc-800 transition-colors"
                  >
                    <SignOut size={15} weight="duotone" className="flex-shrink-0" />
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
              Entrar
            </Link>
            <Link
              to="/register"
              className="bg-white text-black text-sm font-semibold px-4 py-2 rounded-full hover:bg-zinc-200 transition-colors"
            >
              Registrarse
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}

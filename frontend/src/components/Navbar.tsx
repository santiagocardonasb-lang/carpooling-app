import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, Plus, BookOpen, Bell, User, Car, LogOut, Settings as SettingsIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string) => location.pathname === path;
  const isDriver = user?.role !== 'passenger';

  const fetchUnread = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const { data } = await api.get('/notifications/unread-count');
      setUnreadCount(data.count);
    } catch {}
  }, [isAuthenticated]);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 8000);
    const onVisible = () => { if (document.visibilityState === 'visible') fetchUnread(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [fetchUnread]);

  useEffect(() => {
    if (location.pathname === '/notifications') setUnreadCount(0);
  }, [location.pathname]);

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
            {!isDriver && (
              <Link
                to="/search"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-colors ${isActive('/search') ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}
              >
                <Search size={14} />
                <span className="hidden sm:inline">Buscar</span>
              </Link>
            )}

            {isDriver && (
              <Link
                to="/create-ride"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-colors ${isActive('/create-ride') ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}
              >
                <Plus size={14} />
                <span className="hidden sm:inline">Publicar</span>
              </Link>
            )}

            <Link
              to="/my-rides"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-colors ${isActive('/my-rides') ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}
            >
              <BookOpen size={14} />
              <span className="hidden sm:inline">{isDriver ? 'Mis viajes' : 'Mis reservas'}</span>
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
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center px-1 pointer-events-none z-10">
                    <span className="text-white text-[9px] font-bold leading-none">{unreadCount > 9 ? '9+' : unreadCount}</span>
                  </span>
                )}
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 top-10 w-52 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden py-1 z-50">
                  <Link
                    to="/profile"
                    className="flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-zinc-800 transition-colors"
                  >
                    <User size={15} className="text-zinc-400 flex-shrink-0" />
                    Ajustar perfil
                  </Link>

                  {isDriver && (
                    <Link
                      to="/vehicle"
                      className="flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-zinc-800 transition-colors"
                    >
                      <Car size={15} className="text-zinc-400 flex-shrink-0" />
                      Información del vehículo
                    </Link>
                  )}

                  <Link
                    to="/notifications"
                    className="flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-zinc-800 transition-colors"
                  >
                    <Bell size={15} className="text-zinc-400 flex-shrink-0" />
                    <span className="flex-1">Notificaciones</span>
                    {unreadCount > 0 && (
                      <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </Link>

                  <Link
                    to="/settings"
                    className="flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-zinc-800 transition-colors"
                  >
                    <SettingsIcon size={15} className="text-zinc-400 flex-shrink-0" />
                    Configuración
                  </Link>

                  <div className="border-t border-zinc-800 my-1" />

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-zinc-800 transition-colors"
                  >
                    <LogOut size={15} className="flex-shrink-0" />
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

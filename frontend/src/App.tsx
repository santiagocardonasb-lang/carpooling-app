import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import LoadingScreen from './components/LoadingScreen';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import { UnreadProvider } from './context/UnreadContext';
import { ConfirmProvider, useConfirm } from './context/ConfirmContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import BottomNav from './components/BottomNav';
import api from './api';

// Pantallas que no hacen falta en la primera pintura: se descargan al entrar.
// Esto saca del arranque el mapa, las animaciones y sus dependencias.
const SearchRides = lazy(() => import('./pages/SearchRides'));
const CreateRide = lazy(() => import('./pages/CreateRide'));
const MyRides = lazy(() => import('./pages/MyRides'));
const Profile = lazy(() => import('./pages/Profile'));
const EditRide = lazy(() => import('./pages/EditRide'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const VehicleProfile = lazy(() => import('./pages/VehicleProfile'));
const Settings = lazy(() => import('./pages/Settings'));
const TripInProgress = lazy(() => import('./pages/TripInProgress'));
const RateTrip = lazy(() => import('./pages/RateTrip'));
const ChatPage = lazy(() => import('./pages/ChatPage'));
const MessagesPage = lazy(() => import('./pages/MessagesPage'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));

interface InProgressBooking {
  id: number;
  origin: string;
  destination: string;
  driver_name: string;
  status: string;
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, initialized } = useAuth();
  if (!initialized) return null;
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function DriverRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, initialized } = useAuth();
  if (!initialized) return null;
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (user?.role === 'passenger') return <Navigate to="/" />;
  return <>{children}</>;
}

function RootRoute() {
  const { isAuthenticated, initialized } = useAuth();
  if (!initialized) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Home />;
}

// ── Watcher global: detecta cuando el conductor inicia el viaje y avisa al pasajero ──
function TripStartedWatcher() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const confirmDialog = useConfirm();
  const isPassenger = user?.role === 'passenger';
  const [alert, setAlert] = useState<InProgressBooking | null>(null);
  const pathRef = useRef(location.pathname);

  // Mantener ref actualizada sin disparar el efecto del polling
  useEffect(() => { pathRef.current = location.pathname; }, [location.pathname]);

  useEffect(() => {
    if (!isAuthenticated || !isPassenger) return;
    const poll = async () => {
      // Skip en pantallas focalizadas (no flashar overlay durante navegación)
      if (/^\/(trip|rate|chat|login|register)/.test(pathRef.current)) return;
      try {
        const { data } = await api.get('/bookings/my');
        const found: InProgressBooking | undefined = data.find(
          (b: InProgressBooking) => b.status === 'in_progress'
        );
        if (found) {
          const key = `trip_shown_${found.id}`;
          if (!sessionStorage.getItem(key)) {
            setAlert(found);
          }
        }
      } catch {}
    };
    poll();
    const i = setInterval(poll, 5000);
    return () => clearInterval(i);
  }, [isAuthenticated, isPassenger]);

  if (!alert) return null;

  const setSeenAndClose = () => {
    sessionStorage.setItem(`trip_shown_${alert.id}`, '1');
    setAlert(null);
  };

  const accept = () => {
    setSeenAndClose();
    navigate(`/trip/${alert.id}`);
  };

  const requestDelay = async (minutes: 5 | 10) => {
    try {
      await api.patch(`/bookings/${alert.id}/passenger-delay`, { minutes });
      showToast(`✅ Le avisamos al conductor que llegas en ${minutes} min`);
    } catch {
      showToast('No se pudo enviar el aviso', 'error');
    }
    setSeenAndClose();
  };

  const decline = async () => {
    const ok = await confirmDialog({
      title: '¿Cancelar tu reserva?',
      message: 'El conductor será notificado de inmediato.',
      confirmText: 'Sí, cancelar',
      cancelText: 'No',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.patch(`/bookings/${alert.id}/passenger-decline`);
      showToast('Reserva cancelada');
    } catch {
      showToast('No se pudo cancelar la reserva', 'error');
    }
    setSeenAndClose();
  };

  return (
    <div className="fixed inset-0 z-[300] bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-5">
      <div className="bg-zinc-900 w-full max-w-sm rounded-3xl border border-zinc-800 overflow-hidden shadow-2xl">
        {/* Banner amarillo */}
        <div className="bg-yellow-900/40 border-b border-yellow-800/60 px-6 py-6 text-center">
          <div className="text-4xl mb-2">🚗</div>
          <h2 className="text-yellow-300 font-black text-xl">¡Tu viaje inició!</h2>
          <p className="text-yellow-400/70 text-sm mt-1 leading-relaxed">
            {alert.driver_name} arrancó el recorrido
          </p>
        </div>

        {/* Info */}
        <div className="px-5 py-5 space-y-3">
          <div className="bg-zinc-800 rounded-2xl p-4">
            <div className="flex items-center justify-between text-sm font-semibold text-white">
              <span className="truncate">{alert.origin}</span>
              <span className="text-zinc-500 mx-2 flex-shrink-0">→</span>
              <span className="truncate text-right">{alert.destination}</span>
            </div>
          </div>

          {/* Aceptar */}
          <button
            onClick={accept}
            className="w-full bg-white text-black font-bold py-4 rounded-2xl hover:bg-zinc-100 transition-colors text-sm active:scale-[0.98]"
          >
            ✅ Estoy listo, vamos
          </button>

          {/* Pedir tiempo */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => requestDelay(5)}
              className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white font-medium py-3 rounded-xl text-sm transition-colors active:scale-[0.98]"
            >
              ⏰ 5 min
            </button>
            <button
              onClick={() => requestDelay(10)}
              className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white font-medium py-3 rounded-xl text-sm transition-colors active:scale-[0.98]"
            >
              ⏰ 10 min
            </button>
          </div>

          {/* Rechazar / cancelar */}
          <button
            onClick={decline}
            className="w-full text-red-400 hover:text-red-300 text-xs py-2 transition-colors"
          >
            ❌ Cancelar reserva
          </button>
        </div>
      </div>
    </div>
  );
}


// Mientras se descarga la pantalla. Discreto a propósito: en conexiones
// normales aparece unos pocos cuadros y un spinner llamativo se sentiría
// peor que un vacío breve.
function RouteFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-zinc-700 border-t-white rounded-full animate-spin" />
    </div>
  );
}

function AppRoutes() {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  // Pantallas focalizadas: sin Navbar ni BottomNav
  const focusedRoute = /^\/(trip|rate|chat)\//.test(location.pathname);
  // Rutas sin autenticación: sin BottomNav
  const authRoute = /^\/(login|register|forgot-password)/.test(location.pathname);
  const showBottomNav = isAuthenticated && !focusedRoute && !authRoute;

  return (
    <div className={`min-h-screen ${showBottomNav ? 'pb-16 sm:pb-0' : ''}`}>
      {!focusedRoute && <Navbar />}
      <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<RootRoute />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/search" element={<SearchRides />} />
        <Route path="/create-ride" element={<DriverRoute><CreateRide /></DriverRoute>} />
        <Route path="/edit-ride/:id" element={<DriverRoute><EditRide /></DriverRoute>} />
        <Route path="/my-rides" element={<PrivateRoute><MyRides /></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
        <Route path="/vehicle" element={<DriverRoute><VehicleProfile /></DriverRoute>} />
        <Route path="/notifications" element={<PrivateRoute><NotificationsPage /></PrivateRoute>} />
        <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
        <Route path="/trip/:bookingId" element={<PrivateRoute><TripInProgress /></PrivateRoute>} />
        <Route path="/rate/:bookingId" element={<PrivateRoute><RateTrip /></PrivateRoute>} />
        <Route path="/chat/:bookingId" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
        <Route path="/messages" element={<PrivateRoute><MessagesPage /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      </Suspense>

      {/* Overlay global de viaje iniciado (solo pasajeros autenticados) */}
      {isAuthenticated && <TripStartedWatcher />}

      {/* Barra de navegación inferior — solo móvil, solo autenticado */}
      {showBottomNav && <BottomNav />}
    </div>
  );
}

export default function App() {
  const [loading, setLoading] = useState(true);

  if (loading) {
    return <LoadingScreen onDone={() => setLoading(false)} />;
  }

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <UnreadProvider>
              <ToastProvider>
                <ConfirmProvider>
                  <AppRoutes />
                </ConfirmProvider>
              </ToastProvider>
            </UnreadProvider>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

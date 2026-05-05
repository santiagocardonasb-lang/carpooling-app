import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoadingScreen from './components/LoadingScreen';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import SearchRides from './pages/SearchRides';
import CreateRide from './pages/CreateRide';
import MyRides from './pages/MyRides';
import Profile from './pages/Profile';
import EditRide from './pages/EditRide';
import NotificationsPage from './pages/NotificationsPage';
import VehicleProfile from './pages/VehicleProfile';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, initialized } = useAuth();
  if (!initialized) return null; // wait until sessionStorage is read
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

function DriverRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, initialized } = useAuth();
  if (!initialized) return null; // wait until sessionStorage is read
  if (!isAuthenticated) return <Navigate to="/login" />;
  // Block only explicit passengers; undefined/null role = driver by default
  if (user?.role === 'passenger') return <Navigate to="/" />;
  return <>{children}</>;
}

function RootRoute() {
  const { isAuthenticated, initialized } = useAuth();
  if (!initialized) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Home />;
}

function AppRoutes() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Routes>
        <Route path="/" element={<RootRoute />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/search" element={<SearchRides />} />
        <Route path="/create-ride" element={<DriverRoute><CreateRide /></DriverRoute>} />
        <Route path="/edit-ride/:id" element={<DriverRoute><EditRide /></DriverRoute>} />
        <Route path="/my-rides" element={<PrivateRoute><MyRides /></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
        <Route path="/vehicle" element={<DriverRoute><VehicleProfile /></DriverRoute>} />
        <Route path="/notifications" element={<PrivateRoute><NotificationsPage /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}

export default function App() {
  const [loading, setLoading] = useState(true);

  if (loading) {
    return <LoadingScreen onDone={() => setLoading(false)} />;
  }

  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

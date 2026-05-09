import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  role?: 'driver' | 'passenger';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  // remember=true → localStorage (persiste entre ventanas y al cerrar el navegador).
  // remember=false → sessionStorage (sólo esta pestaña/ventana — permite varios usuarios al tiempo).
  login: (token: string, user: User, remember?: boolean) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  isAuthenticated: boolean;
  initialized: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Helpers que leen sessionStorage primero (sesión por pestaña),
// luego localStorage (sesión persistente).
function readToken(): string | null {
  return sessionStorage.getItem('token') || localStorage.getItem('token');
}
function readUser(): User | null {
  const raw = sessionStorage.getItem('user') || localStorage.getItem('user');
  return raw ? JSON.parse(raw) : null;
}
function clearAll() {
  sessionStorage.removeItem('token'); sessionStorage.removeItem('user');
  localStorage.removeItem('token'); localStorage.removeItem('user');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const t = readToken();
    const u = readUser();
    if (t && u) { setToken(t); setUser(u); }
    setInitialized(true);
  }, []);

  const login = (newToken: string, newUser: User, remember = false) => {
    clearAll();
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem('token', newToken);
    storage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    clearAll();
    setToken(null);
    setUser(null);
  };

  const updateUser = (updates: Partial<User>) => {
    if (!user) return;
    const updated = { ...user, ...updates };
    // Mantener el storage que ya estaba en uso
    const storage = sessionStorage.getItem('user') ? sessionStorage : localStorage;
    storage.setItem('user', JSON.stringify(updated));
    setUser(updated);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser, isAuthenticated: !!token, initialized }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

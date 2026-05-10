import axios from 'axios';

// En producción (Vercel) VITE_API_URL apunta al backend en Render.
// En desarrollo el proxy de Vite redirige /api → localhost:3001.
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

// sessionStorage tiene prioridad: cada pestaña/ventana puede tener su propio usuario.
function readToken(): string | null {
  return sessionStorage.getItem('token') || localStorage.getItem('token');
}

api.interceptors.request.use((config) => {
  const token = readToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-logout si el token expiró/inválido
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401) {
      sessionStorage.removeItem('token'); sessionStorage.removeItem('user');
      localStorage.removeItem('token');   localStorage.removeItem('user');
      const p = window.location.pathname;
      if (p !== '/login' && p !== '/register') window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

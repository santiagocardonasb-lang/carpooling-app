import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

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

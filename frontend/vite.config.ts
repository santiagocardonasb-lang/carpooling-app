import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,          // expone en todas las interfaces → acceso desde celular/LAN
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});

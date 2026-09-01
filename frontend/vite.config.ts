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
  build: {
    rollupOptions: {
      output: {
        // Separar las librerías pesadas del código de la app. Cada una cambia
        // muy poco, así que en su propio archivo el navegador las cachea y no
        // vuelve a bajarlas en cada despliegue.
        manualChunks: {
          react:   ['react', 'react-dom', 'react-router-dom'],
          maplibre: ['maplibre-gl'],
          icons:   ['@phosphor-icons/react'],
        },
      },
    },
    // Con los chunks separados, el aviso por defecto de 500 kB solo genera ruido.
    chunkSizeWarningLimit: 900,
  },
});

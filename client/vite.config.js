import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      '/api/face': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true
      },
      '/api/attendance': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true
      },
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
});

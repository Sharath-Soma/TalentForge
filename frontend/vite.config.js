import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined;
          }

          if (id.includes('@monaco-editor') || id.includes('monaco-editor')) {
            return 'monaco';
          }

          if (
            id.includes('react-router-dom') ||
            id.includes('react-router') ||
            id.includes('@remix-run/router') ||
            id.includes('react-dom') ||
            id.includes('/react/') ||
            id.includes('\\react\\') ||
            id.includes('scheduler')
          ) {
            return 'react-vendor';
          }

          if (id.includes('framer-motion')) {
            return 'motion';
          }

          if (id.includes('lucide-react')) {
            return 'icons';
          }

          if (id.includes('aos')) {
            return 'aos';
          }

          return 'vendor';
        },
      },
    },
  },
});

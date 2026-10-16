import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { creatorPlugin } from './scripts/vite-creator-plugin';

// One codebase, one deploy per creator: CREATOR_SLUG=ayria npm run build
export default defineConfig({
  plugins: [creatorPlugin(), react()],
  server: {
    port: 5173,
    proxy: {
      // Local backend (npm run dev:server). In production VITE_API_URL points to Railway.
      '/api': 'http://localhost:8787',
    },
  },
  build: {
    target: 'es2020',
    sourcemap: false,
  },
});

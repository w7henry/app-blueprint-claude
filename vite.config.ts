import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { creatorPlugin } from './scripts/vite-creator-plugin';

// One codebase, one deploy per creator: CREATOR_SLUG=ayria npm run build
// PREVIEW_FILE=1 builds everything into one self-contained HTML file (npm run preview:file).
const singleFile = process.env.PREVIEW_FILE === '1';

export default defineConfig({
  plugins: [creatorPlugin({ singleFile }), react()],
  server: {
    port: 5173,
    proxy: {
      // Local backend (npm run dev:server). In production VITE_API_URL points to Railway.
      '/api': 'http://localhost:8787',
    },
  },
  build: singleFile
    ? {
        target: 'es2020',
        outDir: 'dist-preview',
        assetsInlineLimit: () => true,
        cssCodeSplit: false,
        modulePreload: false,
        chunkSizeWarningLimit: 5000,
        rolldownOptions: { output: { codeSplitting: false } },
      }
    : {
        target: 'es2020',
        sourcemap: false,
      },
});

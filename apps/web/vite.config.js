import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import bilingual from './src/i18n/compile.mjs';

export default defineConfig({
  plugins: [react({ babel: { plugins: [bilingual] } })],
  server: {
    port: 3000,
    // Saat pengembangan, /api dan /_ diteruskan ke PocketBase lokal sehingga
    // web dan API tetap satu origin seperti di produksi (Caddy).
    proxy: {
      '/api': process.env.MEDCOEL_DEV_PB_URL || 'http://127.0.0.1:8090',
      '/_': process.env.MEDCOEL_DEV_PB_URL || 'http://127.0.0.1:8090',
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    chunkSizeWarningLimit: 900,
  },
});

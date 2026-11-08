import { defineConfig } from 'vite';

// Built for the MEDCOEL site under /anatomy/4d-lab/ (static, outside apps/web/dist; see INTEGRATION.md).
export default defineConfig(({ command }) => ({
  base: command === 'build' ? process.env.LAB4D_BASE || '/anatomy/4d-lab/' : '/',
  build: { target: ['es2022', 'safari16'], assetsInlineLimit: 0, chunkSizeWarningLimit: 900 },
  worker: { format: 'es' },
  server: { port: 4180 },
}));

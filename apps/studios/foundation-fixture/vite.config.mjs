import { defineConfig } from 'vite';
// Build-only fixture: no publication, route, secrets, medical data or license approval.
export default defineConfig({
  root: new URL('.', import.meta.url).pathname,
  base: '/studio-assets/foundation-fixture/fixture-release/',
  build: { outDir: 'dist', emptyOutDir: true },
});

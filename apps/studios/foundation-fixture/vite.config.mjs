import { defineConfig } from 'vite';
// Build-only fixture: no publication, route, secrets, medical data or license approval.
export default defineConfig({
  root: new URL('.', import.meta.url).pathname,
  base: './', // served from /api/medcoel/studio-assets/<id>/<release>/ by the authorised delivery route
  build: { outDir: 'dist', emptyOutDir: true },
});

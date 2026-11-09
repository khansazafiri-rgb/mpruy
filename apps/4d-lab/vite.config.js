import { defineConfig } from 'vite';
import { createReadStream, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertDistributionClean, loadPolicy } from '../../licensing/tools/check-distribution.mjs';

// The 4D Lab reuses the MEDCOEL Anatomy Atlas assets (GLB models, Draco decoder, catalog) from the
// atlas's own URL (/anatomy/viewer/) instead of shipping copies. In production that path is served by
// the existing atlas deployment; in dev/preview this middleware serves apps/anatomy/public there.
const ATLAS_PUBLIC = fileURLToPath(new URL('../anatomy/public/', import.meta.url));
const WITHHELD = Object.keys(loadPolicy().policy.quarantinedSystems).map((sys) => new RegExp(`^models/${sys}\\.glb$`, 'i'));
const TYPES = { '.glb': 'model/gltf-binary', '.json': 'application/json', '.js': 'text/javascript', '.wasm': 'application/wasm' };
function sharedAtlas() {
  const mount = (server) => server.middlewares.use('/anatomy/viewer/', (req, res, next) => {
    const rel = decodeURIComponent((req.url || '/').split('?')[0]).replace(/^\/+/, '');
    const file = path.join(ATLAS_PUBLIC, rel);
    if (!file.startsWith(ATLAS_PUBLIC) || !existsSync(file) || statSync(file).isDirectory()) return next();
    // Licence quarantine: a withheld model is never served, even if someone restores it locally.
    if (WITHHELD.some((re) => re.test(rel))) { res.statusCode = 404; return res.end('Not found'); }
    res.setHeader('content-type', TYPES[path.extname(file)] || 'application/octet-stream');
    createReadStream(file).pipe(res);
  });
  return { name: 'medcoel-shared-atlas', configureServer: mount, configurePreviewServer: mount };
}
// three's DRACOLoader embeds default decoder URLs (new URL(..., import.meta.url)), which makes Vite copy
// ~1.3 MB of decoder files into dist. The lab always uses the atlas's shared decoder (setDecoderPath),
// so the defaults are removed instead of duplicated.
function noBundledDraco() {
  return {
    name: 'medcoel-no-bundled-draco',
    transform(code, id) {
      if (!id.includes('DRACOLoader')) return null;
      return code.replace(/new URL\(\s*'\.\.\/libs\/draco\/[^']+',\s*import\.meta\.url\s*\)\.toString\(\)/g, "''");
    },
  };
}

// Licence quarantine: fail the build if public/ or dist/ carries withheld anatomy (see licensing/).
function licenceQuarantine() {
  let outDir = 'dist';
  return {
    name: 'medcoel-licence-quarantine', apply: 'build',
    configResolved(config) { outDir = path.resolve(config.root, config.build.outDir); },
    buildStart() { assertDistributionClean([fileURLToPath(new URL('./public/', import.meta.url))], '4D Lab public/'); },
    closeBundle() { assertDistributionClean([outDir], '4D Lab build output'); },
  };
}

// Built for the MEDCOEL site under /anatomy/4d-lab/ (static, outside apps/web/dist; see INTEGRATION.md).
export default defineConfig(({ command }) => ({
  base: command === 'build' ? process.env.LAB4D_BASE || '/anatomy/4d-lab/' : '/',
  plugins: [sharedAtlas(), noBundledDraco(), licenceQuarantine()],
  build: { target: ['es2022', 'safari16'], assetsInlineLimit: 0, chunkSizeWarningLimit: 900 },
  worker: { format: 'es' },
  server: { port: 4180 },
}));

import { defineConfig } from 'vite';
import { createReadStream, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertDistributionClean } from '../../licensing/tools/check-distribution.mjs';
import { atlasPackDevFile, buildAtlasPack } from './tools/atlas-pack.mjs';

// The 4D Lab serves a standalone *asset-only* pack. Do NOT load the
// nqwrc/3d-anatomy (CC BY-NC-SA) frontend code at /anatomy/viewer/.
// The separately sourced model rights remain unverified for public distribution.
const TYPES = { '.glb': 'model/gltf-binary', '.json': 'application/json', '.js': 'text/javascript', '.wasm': 'application/wasm', '.txt': 'text/plain' };
function localAtlasPack() {
  let outDir = 'dist', building = false;
  const mount = server => server.middlewares.use('/atlas-assets/', (req, res) => {
    let rel;
    try { rel = decodeURIComponent((req.url || '/').split('?')[0]).replace(/^\/+/, ''); }
    catch { res.statusCode = 400; return res.end('Invalid path'); }
    const source = atlasPackDevFile(rel); // fixed allowlist; path traversal cannot escape
    if (!source || !existsSync(source) || !statSync(source).isFile()) {
      res.statusCode = 404; return res.end('Not found');
    }
    res.setHeader('content-type', TYPES[path.extname(source)] || 'application/octet-stream');
    createReadStream(source).pipe(res);
  });
  return {
    name: 'medcoel-4d-local-atlas-pack',
    configureServer: mount,
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
      building = config.command === 'build';
    },
    // Runs before licenceQuarantine's closeBundle: the final distribution guard
    // checks the real GLB assets alongside CT and 4D Lab application code.
    closeBundle() { if (building) buildAtlasPack(outDir); },
  };
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
  plugins: [localAtlasPack(), noBundledDraco(), licenceQuarantine()],
  // Local review only: separate entrypoint, original implementation, same
  // integrity-checked asset pack. Public staging remains commercial-rights blocked.
  build: {
    target: ['es2022', 'safari16'], assetsInlineLimit: 0, chunkSizeWarningLimit: 900,
    // Never expose the experimental viewer in a normal 4D Lab distribution.
    // It is built only by an explicit local review command.
    rollupOptions: { input: {
      lab: fileURLToPath(new URL('./index.html', import.meta.url)),
      ...(process.env.LAB4D_ATLAS_PILOT === '1'
        ? { independentAtlasPilot: fileURLToPath(new URL('./atlas-preview/index.html', import.meta.url)) }
        : {}),
    } },
  },
  worker: { format: 'es' },
  server: { port: 4180 },
}));

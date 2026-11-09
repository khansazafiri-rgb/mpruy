#!/usr/bin/env node
// Local, read-only STAGING PREVIEW of the MEDCOEL Anatomy Live 4D Lab with the production URL layout:
//   /anatomy/live        MEDCOEL web app page (SPA) that frames the lab   (apps/web, preview build)
//   /anatomy/4d-lab/     the lab's static build                           (apps/4d-lab/dist)
//   /anatomy/viewer/     the Anatomy Atlas build whose models the lab uses (apps/anatomy/dist)
// Headers mirror deploy/Caddyfile + deploy/anatomy.caddy.snippet + deploy/4d-lab.caddy.snippet.
// There is no backend: /api/* answers from preview/fixtures.mjs and the preview build signs in a
// fixture student (apps/web/vite.anatomy-preview.config.js). Nothing is uploaded, deployed or reloaded.
//
//   node scripts/preview-4d-lab.mjs --build      # build all three apps, check them, then serve
//   node scripts/preview-4d-lab.mjs              # serve existing builds (after checking them)
//   PORT=4173 node scripts/preview-4d-lab.mjs --lan   # also reachable from other devices on your network
import { createServer } from 'node:http';
import { readFile, stat, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { apiFixture } from '../preview/fixtures.mjs';
import { validateLab, checkAtlasModels } from './stage-4d-lab.mjs';

const repo = fileURLToPath(new URL('../', import.meta.url));
import { assertDistributionClean, loadPolicy } from '../licensing/tools/check-distribution.mjs';
export const WITHHELD = [...Object.keys(loadPolicy().policy.quarantinedSystems).map((sys) => new RegExp(`^/anatomy/viewer/models/${sys}\\.glb$`, 'i')), /^\/anatomy\/viewer\/thumbnails\/systems\/(nervous|visceral)\.webp$/i];
export const ROOTS = {
  main: path.join(repo, 'apps/web/dist-anatomy-preview'),
  lab: path.join(repo, 'apps/4d-lab/dist'),
  atlas: path.join(repo, 'apps/anatomy/dist'),
};
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.glb': 'model/gltf-binary', '.wasm': 'application/wasm', '.nrrd': 'application/octet-stream',
  '.woff2': 'font/woff2', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
};
// SPA routes of the main web app that must receive index.html (everything else with an extension is an asset)
const SPA_ANATOMY = /^\/anatomy(\/(live|library|structure|region|system|study|explore)(\/|$)|\/?$)/;

/** Production-equivalent router over local build folders. */
export function createLabPreviewServer(roots = ROOTS) {
  return createServer(async (req, res) => {
    const send = (status, body, type = 'text/plain; charset=utf-8', extra = {}) => { res.writeHead(status, { 'Content-Type': type, ...extra }); res.end(req.method === 'HEAD' ? '' : body); };
    try {
      if (!['GET', 'HEAD'].includes(req.method)) return send(405, 'Preview is read-only');
      let p; try { p = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { return send(400, 'Invalid URL'); }
      if (p.split('/').includes('..') || p.includes('\\') || p.includes('\0')) return send(400, 'Invalid path');
      // site-wide headers (deploy/Caddyfile)
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      const lab = p.startsWith('/anatomy/4d-lab/'), atlas = p.startsWith('/anatomy/viewer/');
      // Licence quarantine: withheld paths are never served, even from a stale local build.
      if (WITHHELD.some((re) => re.test(p))) return send(404, 'Not found');
      if (lab || atlas) { res.setHeader('X-Frame-Options', 'SAMEORIGIN'); res.setHeader('Content-Security-Policy', "frame-ancestors 'self'"); }
      else res.setHeader('X-Frame-Options', 'DENY');
      if (p === '/anatomy/4d-lab' || p === '/anatomy/viewer') { res.writeHead(308, { Location: p + '/' }); return res.end(); }
      if (p.startsWith('/api/')) { const f = apiFixture(p); return f ? send(200, JSON.stringify(f), TYPES['.json']) : send(404, JSON.stringify({ message: 'This preview has no backend endpoint.' }), TYPES['.json']); }
      const root = lab ? roots.lab : atlas ? roots.atlas : roots.main;
      const rel = lab ? p.slice('/anatomy/4d-lab/'.length) : atlas ? p.slice('/anatomy/viewer/'.length) : p.slice(1);
      let file = path.resolve(root, rel || 'index.html');
      if (file !== root && !file.startsWith(root + path.sep)) return send(403, 'Forbidden');
      let info; try { info = await stat(file); } catch { /* missing */ }
      if (info?.isDirectory()) { file = path.join(file, 'index.html'); try { info = await stat(file); } catch { info = null; } }
      if (!info?.isFile()) {
        // lab and atlas: never an SPA fallback (a missing model/script must be a 404, as in production)
        if (lab || atlas || p.startsWith('/assets/') || (path.extname(p) && !SPA_ANATOMY.test(p))) return send(404, 'Asset not found');
        file = path.join(roots.main, 'index.html');
      }
      // cache policy as in the Caddy snippets (hashed assets immutable; data/models revalidated)
      const cache = /\/assets\//.test(p) ? 'public, max-age=31536000, immutable' : /\/(data|models|draco)\//.test(p) ? 'public, max-age=3600, must-revalidate' : 'no-cache, max-age=0, must-revalidate';
      return send(200, await readFile(file), TYPES[path.extname(file)] || 'application/octet-stream', { 'Cache-Control': cache });
    } catch { return send(500, 'Preview file unavailable'); }
  });
}

/** Checks that the three builds exist, the lab bundle is consistent, and its atlas dataset matches the atlas models served. */
export async function checkBuilds(roots = ROOTS) {
  const problems = [], facts = {};
  try { await stat(path.join(roots.main, 'index.html')); } catch { problems.push('Web preview build missing: run with --build (apps/web/dist-anatomy-preview).'); }
  try { facts.lab = await validateLab(roots.lab); } catch (e) { problems.push('4D Lab build: ' + e.message + ' (run with --build).'); }
  try {
    const models = (await readdir(path.join(roots.atlas, 'models'))).filter((f) => f.endsWith('.glb'));
    for (const f of ['draco/draco_decoder.wasm', 'draco/draco_wasm_wrapper.js', 'data/atlas-catalog.json', 'LICENSE', 'NOTICE', 'models/License.txt']) await stat(path.join(roots.atlas, f));
    facts.atlasModels = models.length;
    // 6 cleared systems; nervous.glb is withheld by the licence quarantine (licensing/quarantine-policy.json)
    if (models.length < 6) problems.push(`Atlas build has ${models.length} GLBs (expected 6 cleared systems).`);
    try { assertDistributionClean([roots.atlas, roots.lab], 'preview builds'); } catch (e) { problems.push(e.message); }
    const html = await readFile(path.join(roots.atlas, 'index.html'), 'utf8');
    if (!html.includes('/anatomy/viewer/')) problems.push('Atlas build was not made with base /anatomy/viewer/ (run with --build).');
    // the lab's atlas-derived CT was generated from specific model files: they must be the ones served
    try { facts.sourceModelsChecked = (await checkAtlasModels(roots.lab, roots.atlas)).checked; } catch (e) { problems.push(e.message); }
  } catch (e) { problems.push('Anatomy Atlas build missing or incomplete (' + e.message + '): run with --build.'); }
  return { ok: problems.length === 0, problems, facts };
}

function build() {
  const steps = [
    ['Anatomy Atlas (base /anatomy/viewer/)', 'npm', ['run', 'build', '--prefix', 'apps/anatomy'], { ANATOMY_BASE: '/anatomy/viewer/' }],
    ['4D Lab (base /anatomy/4d-lab/)', 'npm', ['run', 'build:4d-lab'], {}],
    ['MEDCOEL web app (preview build)', 'npx', ['vite', 'build', '--config', 'vite.anatomy-preview.config.js'], {}, path.join(repo, 'apps/web')],
  ];
  for (const [label, cmd, args, env, cwd = repo] of steps) {
    console.log(`\n> build ${label}`);
    const r = spawnSync(cmd, args, { cwd, env: { ...process.env, ...env }, stdio: 'inherit' });
    if (r.status !== 0) { console.error(`Build failed: ${label}`); process.exit(1); }
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--build')) build();
  const check = await checkBuilds();
  if (!check.ok) { console.error('\nPreview NOT started:\n - ' + check.problems.join('\n - ')); process.exit(1); }
  const port = Number(process.env.PORT || 4173), host = process.argv.includes('--lan') ? '0.0.0.0' : '127.0.0.1';
  createLabPreviewServer().listen(port, host, () => {
    const b = `http://127.0.0.1:${port}`;
    console.log(`\nMEDCOEL 4D Lab local staging preview (read-only, no backend, nothing deployed)
  Host page (as students see it):  ${b}/anatomy/live
  Lab directly (full window):       ${b}/anatomy/4d-lab/
  Procedural phantom dataset:       ${b}/anatomy/4d-lab/?dataset=phantom
  Anatomy Atlas viewer (shared):    ${b}/anatomy/viewer/
Checks: lab datasets ${check.facts.lab.datasets.join(' + ')}, ${check.facts.atlasModels} atlas GLBs, ${check.facts.sourceModelsChecked} source-model hashes match.
${host === '0.0.0.0' ? 'LAN mode: reachable from other devices on this network via this machine\'s IP. Stop with Ctrl+C when done.\n' : ''}Stop with Ctrl+C.`);
  });
}

#!/usr/bin/env node
// Local, read-only STAGING PREVIEW of the MEDCOEL Anatomy Live 4D Lab with the production URL layout:
//   /anatomy/live        MEDCOEL web app page (SPA) that frames the lab   (apps/web, preview build)
//   /anatomy/4d-lab/     the lab's static build                           (apps/4d-lab/dist)
//   /anatomy/viewer/     the ORIGINAL MEDCOEL Atlas Viewer (apps/anatomy, quarantine-enforced build). The review
//                        preview builds it; the 4D Lab itself never needs it (own verified asset pack).
// Headers mirror deploy/Caddyfile + deploy/anatomy.caddy.snippet + deploy/4d-lab.caddy.snippet.
// There is no backend: /api/* answers from preview/fixtures.mjs and the preview build signs in a
// fixture student (apps/web/vite.anatomy-preview.config.js). Nothing is uploaded, deployed or reloaded.
//
//   node scripts/preview-4d-lab.mjs --build      # build Lab + original Atlas Viewer + MEDCOEL preview pages
//   node scripts/preview-4d-lab.mjs              # serve existing builds (after checking them)
//   PORT=4173 node scripts/preview-4d-lab.mjs --lan   # also reachable from other devices on your network
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { apiFixture } from '../preview/fixtures.mjs';
import { validateLab } from './stage-4d-lab.mjs';

const repo = fileURLToPath(new URL('../', import.meta.url));
import { assertDistributionClean, loadPolicy } from '../licensing/tools/check-distribution.mjs';
const blockedModelRoots = ['/anatomy/viewer/models/', '/anatomy/4d-lab/atlas-assets/models/'];
export const WITHHELD = [
  ...blockedModelRoots.flatMap(root => Object.keys(loadPolicy().policy.quarantinedSystems).map(sys => new RegExp('^' + root + sys + '\\.glb$', 'i'))),
  /^\/anatomy\/viewer\/thumbnails\/systems\/(nervous|visceral)\.webp$/i,
];
export const ROOTS = {
  main: path.join(repo, 'apps/web/dist-anatomy-preview'),
  lab: path.join(repo, 'apps/4d-lab/dist'),
  atlas: path.join(repo, 'apps/anatomy/dist'),
  // Optional, LOCAL ONLY: official BodyParts3D review output for the Atlas preview (?models=bp3d). Gitignored, never in a dist.
  bp3d: path.join(repo, 'local-data/licensing-quarantine/bp3d-batch'),
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
      // BodyParts3D review data: served read-only, only for the Atlas preview and only if the local folder exists.
      if (p.startsWith('/anatomy/viewer/bp3d/')) {
        const rel = p.slice('/anatomy/viewer/bp3d/'.length);
        const base = roots.bp3d && path.resolve(roots.bp3d);
        const file = base && path.resolve(base, rel);
        if (!file || (file !== base && !file.startsWith(base + path.sep)) || !/^(inventory\.json|structures\/[a-z0-9-]+\/model\.glb|reference-surface\/skin\.glb)$/.test(rel)) return send(404, 'Not found');
        try { return send(200, await readFile(file), TYPES[path.extname(file)] || 'application/octet-stream', { 'Cache-Control': 'no-cache' }); } catch { return send(404, 'Not found'); }
      }
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

/** Check the Lab's own complete asset pack; Atlas Viewer build is optional. */
export async function checkBuilds(roots = ROOTS) {
  const problems = [], facts = {};
  try { await stat(path.join(roots.main, 'index.html')); }
  catch { problems.push('Web preview build missing: use --build.'); }
  try {
    facts.lab = await validateLab(roots.lab);
    assertDistributionClean([roots.lab], '4D Lab preview');
    facts.sourceModelsChecked = facts.lab.atlasPack?.models || 0;
  } catch (e) { problems.push('4D Lab build: ' + e.message + ' (use --build).'); }
  // The original Atlas Viewer is part of the review preview. It is built by the same quarantine-guarded Vite config
  // as for staging; the 4D Lab does not depend on it. A missing build is reported, never silently skipped.
  try {
    await stat(path.join(roots.atlas, 'index.html'));
    assertDistributionClean([roots.atlas], 'Atlas Viewer preview');
    facts.atlasViewer = 'built';
  } catch (e) {
    if (e?.code === 'ENOENT') facts.atlasViewer = 'not built (run with --build to preview the original Atlas Viewer)';
    else problems.push('Atlas Viewer build: ' + e.message + ' (use --build).');
  }
  return { ok: problems.length === 0, problems, facts };
}

function build() {
  const steps = [
    ['4D Lab (base /anatomy/4d-lab/)', 'npm', ['run', 'build:4d-lab'], {}],
    ['Original MEDCOEL Atlas Viewer (base /anatomy/viewer/, licence quarantine enforced)', 'npm', ['run', 'build:anatomy'], {}],
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
    const atlasOn = check.facts.atlasViewer === 'built';
    console.log(`\nMEDCOEL local review preview (read-only, no backend, nothing deployed)
  Anatomi Manusia (library + quiz): ${b}/anatomy
  Atlas 3D, original MEDCOEL viewer: ${atlasOn ? b + '/anatomy/explore   (full window: ' + b + '/anatomy/viewer/)' : check.facts.atlasViewer}
  Kuis anatomi 3D:                   ${b}/anatomy/study
  Live 4D Lab (as students see it):  ${b}/anatomy/live
  Lab directly (full window):        ${b}/anatomy/4d-lab/
  Procedural phantom dataset:        ${b}/anatomy/4d-lab/?dataset=phantom
  Atlas 3D + official BodyParts3D:   ${existsSync(path.join(ROOTS.bp3d, 'inventory.json')) ? b + '/anatomy/viewer/?models=bp3d   (local review data found)' : 'not built: npm run batch:bodyparts3d -- --all'}
Checks: lab datasets ${check.facts.lab.datasets.join(' + ')}, ${check.facts.sourceModelsChecked} self-bundled atlas GLBs match source CT hashes; Atlas Viewer build ${atlasOn ? 'passed the licence-quarantine scan' : 'absent'}.
${host === '0.0.0.0' ? 'LAN mode: reachable from other devices on this network via this machine\'s IP. Stop with Ctrl+C when done.\n' : ''}Stop with Ctrl+C.`);
  });
}

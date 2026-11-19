// Local stand-in for the production Caddy routes (deploy/Caddyfile + deploy/4d-lab.caddy.snippet), for browser QA only:
//   /api/*, /_/*        -> PocketBase (PB_URL, default http://127.0.0.1:8090)
//   /anatomy/viewer/*   -> apps/anatomy/dist   (built with ANATOMY_BASE=/anatomy/viewer/), no SPA fallback
//   /anatomy/4d-lab/*   -> apps/4d-lab/dist    (npm run build:4d-lab), no SPA fallback
//   everything else     -> apps/web/dist with index.html fallback
// Usage: PB_URL=http://127.0.0.1:8092 PORT=4180 node scripts/local-prod-layout-server.mjs
// LAB4D_ABSENT=1 answers 404 under /anatomy/4d-lab/ (a server where the separate 4D release is not installed).
// Binds to 127.0.0.1 only. Never use as a production server.
import http from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PB = new URL(process.env.PB_URL || 'http://127.0.0.1:8090');
const PORT = Number(process.env.PORT || 4180);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.wasm': 'application/wasm', '.nrrd': 'application/octet-stream', '.txt': 'text/plain; charset=utf-8', '.woff2': 'font/woff2' };
const MOUNTS = [['/anatomy/viewer/', path.join(repo, 'apps/anatomy/dist'), false], ['/anatomy/4d-lab/', path.join(repo, 'apps/4d-lab/dist'), false], ['/', path.join(repo, 'apps/web/dist'), true]];

async function file(res, root, rel, spa) {
  let p = path.join(root, decodeURIComponent(rel));
  if (!p.startsWith(root)) { res.writeHead(403).end(); return; }
  try { const s = await stat(p); if (s.isDirectory()) p = path.join(p, 'index.html'); await stat(p); } catch {
    if (!spa) { res.writeHead(404, { 'Content-Type': 'text/plain' }).end('not found'); return; }
    p = path.join(root, 'index.html');
  }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
  createReadStream(p).pipe(res);
}

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://local');
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_/')) {
    const up = http.request({ hostname: PB.hostname, port: PB.port, path: req.url, method: req.method, headers: { ...req.headers, host: PB.host } }, (r) => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
    up.on('error', () => res.writeHead(502).end('pocketbase unreachable'));
    req.pipe(up); return;
  }
  if (url.pathname === '/anatomy/viewer' || url.pathname === '/anatomy/4d-lab') { res.writeHead(308, { Location: url.pathname + '/' }).end(); return; }
  if (process.env.LAB4D_ABSENT === '1' && url.pathname.startsWith('/anatomy/4d-lab/')) { res.writeHead(404, { 'Content-Type': 'text/plain' }).end('not installed'); return; }
  const [prefix, root, spa] = MOUNTS.find(([m]) => url.pathname.startsWith(m));
  file(res, root, url.pathname.slice(prefix.length - 1), spa);
}).listen(PORT, '127.0.0.1', () => console.log(`prod-layout QA server on http://127.0.0.1:${PORT} (PocketBase ${PB.href})`));

#!/usr/bin/env node
// One command to look at the assembled BodyParts3D body, locally and privately:
//   npm run review:bodyparts3d            # builds from the official source if needed, then serves
//   npm run review:bodyparts3d -- --rebuild --open
// The output lives in gitignored local-data/ and is served read-only on 127.0.0.1 only. Nothing is uploaded,
// no production file is touched, and no rights are cleared by running this (see licensing/BP3D_WHOLE_BODY_REVIEW.md).
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = fileURLToPath(new URL('../', import.meta.url));
export const BATCH_DIR = path.join(repo, 'local-data/licensing-quarantine/bp3d-batch');
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.glb': 'model/gltf-binary', '.csv': 'text/csv; charset=utf-8', '.css': 'text/css; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.wasm': 'application/wasm',
};

/** Read-only static server for the review directory. Exported so the routing rules can be tested. */
export function createReviewServer(root = BATCH_DIR) {
  const base = path.resolve(root);
  return createServer(async (req, res) => {
    const send = (status, body, type = 'text/plain; charset=utf-8') => {
      res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex, nofollow', 'Referrer-Policy': 'no-referrer' });
      res.end(req.method === 'HEAD' ? '' : body);
    };
    try {
      if (!['GET', 'HEAD'].includes(req.method)) return send(405, 'Read-only review server');
      let p; try { p = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { return send(400, 'Invalid URL'); }
      if (p.includes('\0') || p.includes('\\') || p.split('/').includes('..')) return send(400, 'Invalid path');
      if (p === '/') { res.writeHead(302, { Location: '/body.html' }); return res.end(); }
      let file = path.resolve(base, '.' + p);
      if (file !== base && !file.startsWith(base + path.sep)) return send(403, 'Forbidden');
      let info = await stat(file).catch(() => null);
      if (info?.isDirectory()) { file = path.join(file, 'index.html'); info = await stat(file).catch(() => null); }
      if (!info?.isFile()) return send(404, 'Not found');
      return send(200, await readFile(file), TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream');
    } catch { return send(500, 'Review file unavailable'); }
  });
}

function run(label, cmd, args) {
  console.log(`\n> ${label}`);
  const r = spawnSync(cmd, args, { cwd: repo, stdio: 'inherit' });
  if (r.status !== 0) { console.error(`\nFailed: ${label}`); process.exit(r.status || 1); }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const rebuild = process.argv.includes('--rebuild');
  if (rebuild || !existsSync(path.join(BATCH_DIR, 'body.html')) || !existsSync(path.join(BATCH_DIR, 'inventory.json'))) {
    if (!existsSync(path.join(repo, 'apps/4d-lab/node_modules'))) run('install 4D Lab dependencies', 'npm', ['ci', '--prefix', 'apps/4d-lab']);
    run('download and audit the official BodyParts3D tables and archive (cached when present)', 'node', ['licensing/tools/prepare-bodyparts3d-source.mjs', '--download']);
    run('convert the 470 matched official structures and assemble the body', 'node', ['apps/4d-lab/tools/batch-bp3d-candidates.mjs', '--all']);
  }
  const port = Number(process.env.PORT || 4783);
  const srv = createReviewServer();
  srv.on('error', (e) => { console.error(e.code === 'EADDRINUSE' ? `Port ${port} is in use. Try PORT=${port + 1} npm run review:bodyparts3d` : e.message); process.exit(1); });
  srv.listen(port, '127.0.0.1', () => {
    const url = `http://127.0.0.1:${port}/body.html`;
    console.log(`\nMEDCOEL BodyParts3D body review (local, private, read-only)\n  ${url}\nREVIEW ONLY: not a complete or validated human body, not for public release. Ctrl+C to stop.`);
    if (process.argv.includes('--open')) spawnSync(process.platform === 'darwin' ? 'open' : 'xdg-open', [url], { stdio: 'ignore' });
  });
}

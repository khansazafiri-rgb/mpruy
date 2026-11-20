// Minimal static server for standalone studio browser tests (no auth: local only, 127.0.0.1).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const C = createRequire(import.meta.url)('../../../packages/studio-contract/clearance.cjs');
export function serveStatic(root, port = 0) {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://x');
      const rel = decodeURIComponent(url.pathname.replace(/^\/+/, '')) || 'index.html';
      const safe = C.safeAssetPath(rel);
      if (!safe || /^server\//.test(safe) || !fs.existsSync(path.join(root, safe))) { res.writeHead(404); return res.end('not found'); }
      res.writeHead(200, { 'Content-Type': C.contentTypeFor(safe) || 'application/octet-stream' });
      fs.createReadStream(path.join(root, safe)).pipe(res);
    }).listen(port, '127.0.0.1', () => resolve({ url: 'http://127.0.0.1:' + server.address().port + '/', close: () => server.close() }));
  });
}

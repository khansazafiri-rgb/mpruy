// Minimal static server for dist/ mounted at /anatomy/4d-lab/ (mirrors the Caddy route).
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = fileURLToPath(new URL('../../dist/', import.meta.url));
// The shared Anatomy Atlas assets, mounted where production serves them (/anatomy/viewer/).
const ATLAS = fileURLToPath(new URL('../../../anatomy/public/', import.meta.url));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.glb': 'model/gltf-binary', '.nrrd': 'application/octet-stream', '.png': 'image/png', '.svg': 'image/svg+xml', '.wasm': 'application/wasm' };
export function startServer(port = 0, prefix = '/anatomy/4d-lab/') {
  const srv = createServer(async (req, res) => {
    const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (url === prefix.slice(0, -1)) { res.writeHead(308, { location: prefix }); return res.end(); }
    if (url.startsWith('/anatomy/viewer/')) {
      const file = path.join(ATLAS, url.slice('/anatomy/viewer/'.length));
      if (!file.startsWith(ATLAS)) { res.writeHead(403); return res.end(); }
      try { const body = await readFile(file); res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' }); return res.end(body); }
      catch { res.writeHead(404); return res.end('not found'); }
    }
    if (!url.startsWith(prefix)) { res.writeHead(404); return res.end('not found'); }
    let rel = url.slice(prefix.length) || 'index.html';
    const file = path.join(ROOT, rel);
    if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
    try { if ((await stat(file)).isDirectory()) rel += '/index.html'; const body = await readFile(path.join(ROOT, rel)); res.writeHead(200, { 'content-type': TYPES[path.extname(rel)] || 'application/octet-stream' }); res.end(body); }
    catch { res.writeHead(404); res.end('not found'); }
  });
  return new Promise((r) => srv.listen(port, '127.0.0.1', () => r({ srv, url: `http://127.0.0.1:${srv.address().port}${prefix}` })));
}

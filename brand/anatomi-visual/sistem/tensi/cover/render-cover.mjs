// node brand/anatomi-visual/sistem/tensi/cover/render-cover.mjs -> cover.png (1080x1920), cover.jpg, cover-profil-3x4.png (crop tengah 1080x1440), cover-panduan-area-aman.png, cover-pratinjau-grid.png
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../../../../..');
const MIME = { '.mjs': 'text/javascript', '.js': 'text/javascript', '.html': 'text/html', '.woff2': 'font/woff2', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png' };
const srv = http.createServer((req, res) => { const p = path.join(root, decodeURIComponent(req.url.split('?')[0])); if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
const { chromium } = createRequire(import.meta.url)('/opt/node-tools/node_modules/playwright');
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
p.on('pageerror', (e) => console.log('pageerror', e.message));
await p.goto(`http://127.0.0.1:${port}/brand/anatomi-visual/sistem/tensi/cover/cover.html`); await p.waitForFunction(() => window.__siap === true, null, { timeout: 30000 });
await p.screenshot({ path: path.join(here, 'cover.png') });
await p.evaluate(() => window.__gambar(true)); await p.screenshot({ path: path.join(here, 'cover-panduan-area-aman.png') });
await b.close(); srv.close(); console.log('ok');

// Render video asam urat. Pemakaian:
//   node asam-urat/render.mjs still <dir> <t1> <t2> ... [--scale=0.5]        PNG per waktu
//   node asam-urat/render.mjs bingkai <dir> <dari> <sampai> [--scale=1]       PNG berurut f%05d.png untuk bingkai [dari, sampai)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../..');
const args = process.argv.slice(2);
const mode = args[0], dir = args[1];
const opt = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d; };
const pos = args.slice(2).filter((a) => !a.startsWith('--')).map(Number);
const scale = parseFloat(opt('scale', '1')), fps = 30;
const MIME = { '.mjs': 'text/javascript', '.js': 'text/javascript', '.html': 'text/html', '.woff2': 'font/woff2', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.json': 'application/json' };
const srv = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
});
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const port = srv.address().port;
const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: Math.round(1080 * scale), height: Math.round(1920 * scale) } });
p.on('pageerror', (e) => console.log('pageerror', e.message));
p.on('console', (m) => { if (m.type() === 'error') console.log('console', m.text().slice(0, 300)); });
await p.goto(`http://127.0.0.1:${port}/brand/anatomi-visual/sistem/shell.html?organ=${opt('organ', 'asam-urat')}&scale=${scale}`);
await p.waitForFunction(() => window.__siap === true, null, { timeout: 60000 });
fs.mkdirSync(dir, { recursive: true });
const shot = async (t) => { await p.evaluate((t) => window.__frame(t), t); return p.screenshot({ type: 'png' }); };
if (mode === 'still') { for (const t of pos) fs.writeFileSync(path.join(dir, `t${t.toFixed(2)}.png`), await shot(t)); }
else { const [a, z] = pos; const t0 = Date.now(); for (let i = a; i < z; i++) { fs.writeFileSync(path.join(dir, `f${String(i).padStart(5, '0')}.png`), await shot(i / fps)); if ((i - a) % 60 === 0) console.log('bingkai', i, `${((Date.now() - t0) / 1000).toFixed(0)}s`); } }
await b.close(); srv.close();

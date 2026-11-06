// Merender klip/still Atlas MEDCOEL. Pemakaian:
//   node render.mjs <jantung|gigi|kulit> still [t=detik] [out.png] [--scale=1]
//   node render.mjs <organ> klip [out.mp4] [--scale=0.6667] [--fps=30] [--frames=dir]
// Memakai server statis kecil di akar repo + Chromium (Playwright) + ffmpeg. Hasil: PNG satu bingkai atau MP4 H.264 yuv420p.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const args = process.argv.slice(2);
const organ = args[0], mode = args[1] || 'still';
const opt = (k, d) => { const a = args.find((x) => x.startsWith(`--${k}=`)); return a ? a.split('=')[1] : d; };
const pos = args.slice(2).filter((a) => !a.startsWith('--'));
const scale = parseFloat(opt('scale', mode === 'klip' ? '0.6667' : '1'));
const fps = parseInt(opt('fps', '30'));
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
const W = Math.round(1080 * scale), H = Math.round(1920 * scale);
const p = await b.newPage({ viewport: { width: W, height: H } });
p.on('pageerror', (e) => console.log('pageerror', e.message));
p.on('console', (m) => { if (m.type() === 'error') console.log('console', m.text().slice(0, 300)); });
await p.goto(`http://127.0.0.1:${port}/brand/anatomi-visual/sistem/shell.html?organ=${organ}&scale=${scale}${args.includes('--tanpa-label') ? '&tanpa=1' : ''}`);
await p.waitForFunction(() => window.__siap === true, null, { timeout: 30000 });
const meta = await p.evaluate(() => window.__meta);
async function bingkai(t) { await p.evaluate((t) => window.__frame(t), t); return p.screenshot({ type: 'png' }); }
if (mode === 'still') {
  const t = parseFloat(pos[0] ?? '0'); const out = pos[1] || path.join(here, 'out', `${organ}-still.png`);
  fs.writeFileSync(out, await bingkai(t)); console.log('ok', out, W + 'x' + H);
} else {
  const out = pos[0] || path.join(here, 'out', `${organ}-klip.mp4`), dua = args.includes('--dua'), out2 = out.replace(/\.mp4$/, '-tanpa-label.mp4');
  const dir = opt('frames', fs.mkdtempSync('/tmp/frm-'));
  fs.mkdirSync(dir, { recursive: true });
  const dir2 = dir + '-tanpa'; if (dua) fs.mkdirSync(dir2, { recursive: true });
  const n = Math.round(meta.durasi * fps);
  const t0 = Date.now();
  for (let i = 0; i < n; i++) { fs.writeFileSync(path.join(dir, `f${String(i).padStart(4, '0')}.png`), await bingkai(i / fps)); if (dua) { await p.evaluate(() => window.__sembunyiLabel()); fs.writeFileSync(path.join(dir2, `f${String(i).padStart(4, '0')}.png`), await p.screenshot({ type: 'png' })); } if (i % 30 === 0) console.log('bingkai', i, '/', n, ((Date.now() - t0) / 1000).toFixed(0) + 's'); }
  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', path.join(dir, 'f%04d.png'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-movflags', '+faststart', out], { stdio: 'inherit' });
  console.log(r.status === 0 ? 'ok ' + out : 'ffmpeg gagal', n + ' bingkai', ((Date.now() - t0) / 1000).toFixed(0) + 's', dir);
  if (dua) { const r2 = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', path.join(dir2, 'f%04d.png'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-movflags', '+faststart', out2], { stdio: 'inherit' }); console.log(r2.status === 0 ? 'ok ' + out2 : 'ffmpeg gagal (tanpa label)'); }
}
await b.close(); srv.close();

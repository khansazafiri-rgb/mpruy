// Contoh memakai Raka di render video: menggambar urutan contoh (demoState) frame demi frame ke PNG
// 1080 x 1920, lalu (bila ffmpeg ada) merangkainya jadi MP4.
//   node brand/characters/raka/render-frames.mjs [--out folder] [--fps 30] [--bg "#EAF6EE"|transparent] [--mp4 berkas.mp4]
// Pola yang sama dipakai di video sungguhan: satu halaman Chromium, satu <div> berisi Raka,
// dan per frame: container.innerHTML = rakaSvg(keadaan) lalu screenshot.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const fps = Number(arg('fps', 30));
const out = path.resolve(arg('out', path.join(process.env.TMPDIR || '/tmp', 'raka-frames')));
const bg = arg('bg', '#EAF6EE');
const mp4 = arg('mp4', '');
const W = 1080, H = 1920;

const server = http.createServer((req, res) => {
  const f = path.join(here, decodeURIComponent(req.url.split('?')[0]));
  if (!f.startsWith(here) || !fs.existsSync(f) || !fs.statSync(f).isFile()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': f.endsWith('.js') ? 'text/javascript' : 'text/html' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const base = `http://127.0.0.1:${server.address().port}`;

let chromium;
for (const b of [import.meta.url, path.join(here, '../../video/package.json'), path.join(process.cwd(), 'package.json')]) {
  try { ({ chromium } = createRequire(b)('playwright')); break; } catch { /* lokasi berikutnya */ }
}
if (!chromium) { console.error('Playwright tidak ditemukan. Jalankan `npm ci` di brand/video.'); process.exit(1); }

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.goto(`${base}/index.html`);
await page.evaluate(async ({ bg, base }) => {
  const { mountRaka } = await import(`${base}/raka.js`);
  document.body.style.cssText = `margin:0;background:${bg === 'transparent' ? 'transparent' : bg}`;
  document.body.innerHTML = '<div id="r" style="position:absolute;left:140px;bottom:260px;width:800px"></div>';
  window.__raka = mountRaka(document.getElementById('r'), { shadow: bg !== 'transparent' });
  window.__mod = await import(`${base}/raka.js`);
}, { bg, base });
const { DEMO_LENGTH } = await page.evaluate(() => ({ DEMO_LENGTH: window.__mod.DEMO_LENGTH }));
const total = Math.round(DEMO_LENGTH * fps);
for (let i = 0; i < total; i += 1) {
  await page.evaluate((t) => window.__raka.set(window.__mod.demoState(t)), i / fps);
  await page.screenshot({ path: path.join(out, `f${String(i).padStart(4, '0')}.png`), omitBackground: bg === 'transparent' });
}
await browser.close(); server.close();
console.log(`${total} frame -> ${out}`);
if (mp4) {
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', path.join(out, 'f%04d.png'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', path.resolve(mp4)]);
  console.log(`MP4 -> ${path.resolve(mp4)}`);
}

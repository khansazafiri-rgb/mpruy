// Merender pratinjau Raka ke PNG (untuk memeriksa tampilan tanpa membuka peramban).
//   node brand/characters/raka/render-preview.mjs           -> preview/*.png
//   node brand/characters/raka/render-preview.mjs --serve   -> hanya menyalakan server lokal untuk dilihat di peramban
// Butuh Playwright: dari brand/video jalankan `npm ci` lebih dulu (playwright ada di dependensinya).
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const f = path.join(here, decodeURIComponent(req.url.split('?')[0]).replace(/^\/$/, '/preview.html'));
  if (!f.startsWith(here) || !fs.existsSync(f)) { res.writeHead(404); res.end('tidak ada'); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((ok) => server.listen(process.argv.includes('--serve') ? 8123 : 0, '127.0.0.1', ok));
const url = `http://127.0.0.1:${server.address().port}/preview.html`;
if (process.argv.includes('--serve')) { console.log(`Buka ${url} (Ctrl+C untuk berhenti)`); await new Promise(() => {}); }

let chromium;
for (const base of [import.meta.url, path.join(here, '../../video/package.json'), path.join(process.cwd(), 'package.json')]) {
  try { ({ chromium } = createRequire(base)('playwright')); break; } catch { /* coba lokasi berikutnya */ }
}
if (!chromium) { console.error('Playwright tidak ditemukan. Jalankan `npm ci` di brand/video.'); process.exit(1); }

const out = path.join(here, 'preview');
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1300, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(url);
await page.waitForSelector('body[data-ready="1"]');
await page.waitForTimeout(300);
const shots = [
  ['raka-lembar.png', 'h2:nth-of-type(1) + p + #sheet'], ['raka-wajah.png', '#faces'], ['raka-menoleh.png', '#yaw'],
  ['raka-filmstrip.png', '#strip'], ['raka-ukuran-kecil.png', '#small'],
  ['raka-logo-pose.png', '#logoPoses'], ['raka-logo-closeup.png', '#logoClose'], ['raka-logo-kecil.png', '#logoSmall'],
  ['raka-pakaian.png', '#outfits'], ['raka-jalan.png', '#walk'], ['raka-demo-pose.png', '#demoPoses'],
];
for (const [file, sel] of shots) await page.locator(sel).first().screenshot({ path: path.join(out, file) });
await page.locator('#frame').first().screenshot({ path: path.join(out, 'raka-bingkai-siang.png') });
await page.locator('#frame2').first().screenshot({ path: path.join(out, 'raka-bingkai-malam.png') });
// bingkai penuh 1080 x 1920 (render sungguhan, bukan hasil perbesaran)
const big = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await big.goto(url);
await big.waitForSelector('body[data-ready="1"]');
await big.evaluate(() => {
  const f = document.getElementById('frame'); document.body.innerHTML = ''; document.body.style.margin = 0;
  f.style.cssText = 'width:1080px;height:1920px;position:relative;background:linear-gradient(#CFE8F3,#EAF6EE)';
  const r = f.querySelector('.r'); r.style.cssText = 'position:absolute;left:50%;bottom:312px;transform:translateX(-50%);width:800px';
  const c = f.querySelector('.cap'); c.style.cssText = 'position:absolute;left:56px;right:56px;bottom:72px;background:rgba(15,27,36,.86);color:#fff;padding:40px 48px;border-radius:48px;font:600 52px system-ui;text-align:center';
  document.body.appendChild(f);
});
await big.screenshot({ path: path.join(out, 'raka-1080x1920.png') });
await browser.close(); server.close();
if (errors.length) { console.error('Galat di halaman:\n' + errors.join('\n')); process.exit(1); }
console.log(`Pratinjau tersimpan di ${path.relative(process.cwd(), out)}`);

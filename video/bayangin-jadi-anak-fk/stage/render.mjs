// Merender frame video secara paralel (tiap frame deterministik dari waktu t).
//   node render.mjs <folder_frame> <frame_awal> <frame_akhir> [jumlah_worker] [port]
// Butuh server statis di akar repo:  python3 -m http.server 8124 --directory <akar-repo>
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
let chromium;
for (const b of ['playwright', '/opt/node-tools/node_modules/playwright', path.resolve(import.meta.dirname, '../../../brand/video/node_modules/playwright')]) { try { ({ chromium } = require(b)); break; } catch { /* berikutnya */ } }
if (!chromium) throw new Error('Playwright tidak ditemukan (npm ci di brand/video)');
const [,, out, f0s, f1s, nws, port = '8124'] = process.argv;
const f0 = +f0s, f1 = +f1s, NW = +nws || 4;
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
async function worker(id) {
  const p = await (await browser.newContext({ viewport: { width: 1080, height: 1920 } })).newPage();
  p.on('pageerror', (e) => console.log('pageerror', e.message));
  p.on('console', (m) => { if (m.type() === 'error') console.log('console.error', m.text().slice(0, 200)); });
  await p.goto(`http://127.0.0.1:${port}/video/bayangin-jadi-anak-fk/stage/index.html`);
  await p.waitForFunction(() => window.__ready, null, { timeout: 30000 });
  for (let f = f0 + id; f <= f1; f += NW) {
    await p.evaluate((t) => window.renderFrame(t), f / 30);
    await p.screenshot({ path: `${out}/f${String(f).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 93 });
    if (f % 150 === id) console.log('frame', f);
  }
}
const t0 = Date.now();
await Promise.all(Array.from({ length: NW }, (_, i) => worker(i)));
console.log('selesai', ((Date.now() - t0) / 1000).toFixed(1), 's');
await browser.close();

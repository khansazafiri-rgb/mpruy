// Render frame (JPEG) dari panggung HTML. Pemakaian: node render.mjs OUT F0 F1 [WORKER] atau node render.mjs OUT t1,t2,... (detik)
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const [,, out, a, b, nws] = process.argv;
const FPS = 30;
let frames;
let NW;
if (a.includes(',') || a.includes('.')) { frames = a.split(',').map((s) => Math.round(parseFloat(s) * FPS)); NW = +b || 4; }
else { frames = []; for (let f = +a; f <= +b; f++) frames.push(f); NW = +nws || 4; }
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
async function worker(id) {
  const p = await (await browser.newContext({ viewport: { width: 1080, height: 1920 } })).newPage();
  p.on('pageerror', (e) => console.log('pageerror', e.message));
  p.on('console', (m) => { if (m.type() === 'error') console.log('console', m.text()); });
  await p.goto('http://127.0.0.1:8130/index.html'); await p.waitForFunction(() => window.__ready, null, { timeout: 30000 });
  await p.evaluate(() => document.fonts.ready);
  for (let i = id; i < frames.length; i += NW) {
    const f = frames[i];
    await p.evaluate((t) => window.renderFrame(t), f / FPS);
    await p.screenshot({ path: `${out}/f${String(f).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 92 });
    if (i % 120 === id) console.log('frame', f, `${i}/${frames.length}`);
  }
}
const t0 = Date.now();
await Promise.all(Array.from({ length: Math.min(NW, frames.length) }, (_, i) => worker(i)));
console.log('selesai', ((Date.now() - t0) / 1000).toFixed(1), 's');
await browser.close();

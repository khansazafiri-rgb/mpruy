import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const [,, out, f0s, f1s, nws] = process.argv;
const f0 = +f0s, f1 = +f1s, NW = +nws || 4;
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
async function worker(id) {
  const p = await (await browser.newContext({ viewport: { width: 1080, height: 1920 } })).newPage();
  p.on('pageerror', (e) => console.log('pageerror', e.message));
  await p.goto('http://127.0.0.1:8123/index.html'); await p.waitForFunction(() => window.__ready, null, { timeout: 20000 });
  for (let f = f0 + id; f <= f1; f += NW) {
    await p.evaluate((t) => window.renderFrame(t), f / 30);
    await p.screenshot({ path: `${out}/f${String(f).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 93 });
    if (f % 60 === id) console.log('frame', f);
  }
}
const t0 = Date.now();
await Promise.all(Array.from({ length: NW }, (_, i) => worker(i)));
console.log('selesai', ((Date.now() - t0) / 1000).toFixed(1), 's');
await browser.close();

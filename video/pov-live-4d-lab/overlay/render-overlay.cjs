// node video/pov-live-4d-lab/overlay/render-overlay.cjs -> PNG transparan per baris teks (butuh server statis 8128 dari akar repo)
const { chromium } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  for (const k of ['o1', 'o2', 'e1', 'e2', 'e3', 'c1', 'c2']) { await p.goto('http://127.0.0.1:8128/video/pov-live-4d-lab/overlay/overlay.html?k=' + k); await p.waitForFunction(() => window.__ready); await p.screenshot({ path: path.join(__dirname, k + '.png'), omitBackground: true }); console.log('ok', k); }
  await b.close(); })();

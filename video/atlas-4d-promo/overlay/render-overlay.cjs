// node video/atlas-4d-promo/overlay/render-overlay.cjs -> PNG transparan 1080x1920 (butuh server statis 8128 dari akar repo)
const { chromium } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  for (const k of ['atlas', 'live', 'materi', 'latihan', 'sim', 'klinis', 'outro']) { await p.goto('http://127.0.0.1:8128/video/atlas-4d-promo/overlay/overlay.html?k=' + k); await p.waitForFunction(() => window.__ready); await p.screenshot({ path: path.join(__dirname, k + '.png'), omitBackground: true }); console.log('ok', k); }
  await b.close(); })();

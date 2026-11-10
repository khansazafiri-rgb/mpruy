// node video/live-4d-lab/overlay/render-overlay.cjs  -> t1.png t2.png t3.png klinis.png outro.png (transparan 1080x1920). Butuh server statis 8128 dari akar repo.
const { chromium } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', (e) => console.log('pageerror', e.message));
  for (const k of ['t1', 't2', 't3', 'klinis', 'outro']) { await p.goto('http://127.0.0.1:8128/video/live-4d-lab/overlay/overlay.html?k=' + k); await p.waitForFunction(() => window.__ready); await p.screenshot({ path: path.join(__dirname, k + '.png'), omitBackground: true }); console.log('ok', k); }
  await b.close(); })();

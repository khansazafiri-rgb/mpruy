// node video/live-4d-fitur-baru/overlay/render-overlay.cjs -> PNG transparan 1080x1920 per elemen teks. Butuh server statis (python3 -m http.server 8128) di akar repo.
const { chromium } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', (e) => console.log('pageerror', e.message));
  for (const k of ['unlock', 'live4d', 'probe', 'skenario', 'klinis', 'outro']) { await p.goto('http://127.0.0.1:8128/video/live-4d-fitur-baru/overlay/overlay.html?k=' + k); await p.waitForFunction(() => window.__ready); await p.screenshot({ path: path.join(__dirname, k + '.png'), omitBackground: true }); console.log('ok', k); }
  await b.close(); })();

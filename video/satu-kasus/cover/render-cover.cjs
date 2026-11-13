// node video/satu-kasus/cover/render-cover.cjs  -> cover.png, cover-panduan-area-aman.png (butuh server statis 8128 dari akar repo)
const { chromium } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', (e) => console.log('pageerror', e.message)); p.on('console', (m) => { if (m.type() === 'error') console.log('console', m.text()); });
  for (const [qs, out] of [['', 'cover.png'], ['guide=1', 'cover-panduan-area-aman.png']]) { await p.goto('http://127.0.0.1:8128/video/satu-kasus/cover/cover.html?' + qs); await p.waitForFunction(() => window.__ready); await p.screenshot({ path: path.join(__dirname, out) }); console.log('ok', out); }
  await b.close(); })();

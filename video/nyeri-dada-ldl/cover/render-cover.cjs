// node video/nyeri-dada-ldl/cover/render-cover.cjs  -> cover.png (bersih), cover-panduan-area-aman.png; butuh server statis 8128 dari akar repo
const { chromium } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', (e) => console.log('pageerror', e.message)); p.on('console', (m) => { if (m.type() === 'error') console.log('console', m.text()); });
  for (const [qs, out] of [['', 'cover.png'], ['guide=1', 'cover-panduan-area-aman.png'], ['crop=3x4', 'cover-profil-3x4.png']]) {
    await p.goto('http://127.0.0.1:8128/video/nyeri-dada-ldl/cover/cover.html?' + qs); await p.waitForFunction(() => window.__ready, null, { timeout: 30000 });
    await p.screenshot({ path: path.join(__dirname, out) }); console.log('ok', out); }
  await b.close(); })();

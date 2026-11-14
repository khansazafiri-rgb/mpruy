// node video/promo-satu-bab/cover/render-cover.cjs  -> cover.png (1080x1920), cover-panduan-area-aman.png, cover-360px.png (butuh server statis 8128 dari akar repo)
const { chromium } = require('/opt/node-tools/node_modules/playwright'); const fs = require('fs'); const path = require('path');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', (e) => console.log('pageerror', e.message));
  await p.goto('http://127.0.0.1:8128/video/promo-satu-bab/stage/index.html?cover=1'); await p.waitForFunction(() => window.__ready, null, { timeout: 60000 }); await p.waitForTimeout(800);
  const out = __dirname; await p.screenshot({ path: path.join(out, 'cover.png') }); await b.close(); console.log('ok'); })();

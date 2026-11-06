// node video/cara-kerja-gcu/cover/render-cover.cjs  (server statis 8128 dari akar repo) -> cover.png (1080x1920), cover-panduan-area-aman.png; lalu PIL membuat cover-profil-3x4.png dan pratinjau grid
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', (e) => console.log('pageerror', e.message));
  const url = 'http://127.0.0.1:8128/video/cara-kerja-gcu/cover/cover.html';
  await p.goto(url); await p.waitForFunction(() => window.__ready, null, { timeout: 30000 }); await p.waitForTimeout(300);
  await p.screenshot({ path: path.join(__dirname, 'cover.png') });
  await p.goto(url + '?guide'); await p.waitForFunction(() => window.__ready, null, { timeout: 30000 }); await p.waitForTimeout(300);
  await p.screenshot({ path: path.join(__dirname, 'cover-panduan-area-aman.png') });
  await b.close(); console.log('ok');
})();

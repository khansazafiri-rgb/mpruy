// node video/live-4d-fitur-baru/cover/render-cover.cjs -> cover.png (1080x1920), cover-panduan-area-aman.png, cover-profil-3x4.png (via python). Butuh server statis 8128 dari akar repo.
const { chromium } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', (e) => console.log('pageerror', e.message));
  const u = 'http://127.0.0.1:8128/video/live-4d-fitur-baru/cover/cover.html';
  await p.goto(u); await p.waitForFunction(() => window.__ready); await p.screenshot({ path: path.join(__dirname, 'cover.png') });
  await p.goto(u + '?guide'); await p.waitForFunction(() => window.__ready); await p.screenshot({ path: path.join(__dirname, 'cover-panduan-area-aman.png') });
  await b.close(); })();

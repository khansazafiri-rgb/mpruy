// node video/usg-gema-gambar/cover/render-cover.cjs <keluaran.png>  (butuh server statis 8140 dari akar repo) -> sampul vertikal 1080x1920 dari panggung (rekaman asli Live 4D Lab + judul + logo)
const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', (e) => console.log('pageerror', e.message));
  await p.goto('http://127.0.0.1:8140/video/usg-gema-gambar/stage/index.html'); await p.waitForFunction(() => window.__ready, null, { timeout: 60000 });
  await p.evaluate(() => window.renderFrame('cover')); await p.screenshot({ path: process.argv[2] || 'cover/cover.png' }); await b.close(); })();

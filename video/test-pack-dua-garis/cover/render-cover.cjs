// node video/test-pack-dua-garis/cover/render-cover.cjs <keluaran.png>  (butuh server statis 8140 dari akar repo)
const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', (e) => console.log('pageerror', e.message));
  await p.goto('http://127.0.0.1:8140/video/test-pack-dua-garis/stage/index.html'); await p.waitForFunction(() => window.__ready, null, { timeout: 60000 });
  await p.evaluate(() => window.renderFrame('cover')); await p.screenshot({ path: process.argv[2] || 'cover.png' }); await b.close(); })();

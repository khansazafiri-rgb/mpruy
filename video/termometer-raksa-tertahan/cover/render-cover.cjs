// node video/termometer-raksa-tertahan/cover/render-cover.cjs -> cover.png (butuh server statis 8140 dari akar repo)
const { chromium } = require('/opt/node-tools/node_modules/playwright'); const path = require('path');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', (e) => console.log('pageerror', e.message));
  await p.goto('http://127.0.0.1:8140/video/termometer-raksa-tertahan/stage/index.html?cover=1'); await p.waitForFunction(() => window.__ready, null, { timeout: 60000 }); await p.waitForTimeout(800);
  await p.screenshot({ path: path.join(__dirname, 'cover.png') }); await b.close(); console.log('ok'); })();

// Membuat cover/bg.png (adegan hook (Raka berhenti berputar, mata berputar, latar bergeser) tanpa teks) lalu cover/cover.png + cover-360px.png. Butuh server statis port 8135 dari akar repo.
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1080, height: 1920 } })).newPage();
  await p.goto('http://127.0.0.1:8135/video/masih-berputar-setelah-berhenti/stage/index.html?nocap=1'); await p.waitForFunction(() => window.__ready); await p.evaluate(() => document.fonts.ready);
  await p.evaluate(() => window.renderFrame(4.4)); await p.evaluate(() => { document.getElementById('U').innerHTML = ''; });
  await p.screenshot({ path: path.join(__dirname, 'bg.png') });
  await p.goto('http://127.0.0.1:8135/video/masih-berputar-setelah-berhenti/cover/cover.html'); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
  await p.screenshot({ path: path.join(__dirname, 'cover.png') });
  await b.close();
})();

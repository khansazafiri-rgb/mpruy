// Membuat cover/bg.png (adegan 1 tanpa teks) lalu cover/cover.png + cover-360px.png. Butuh server statis port 8135 dari akar repo.
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1080, height: 1920 } })).newPage();
  await p.goto('http://127.0.0.1:8135/video/telinga-penuh-pop/stage/index.html'); await p.waitForFunction(() => window.__ready); await p.evaluate(() => document.fonts.ready);
  await p.evaluate(() => window.renderFrame(1.3)); await p.evaluate(() => { document.getElementById('U').innerHTML = ''; const A = document.getElementById('A'); A.innerHTML = `<g transform="translate(540 960) scale(1) translate(-540 -960)">${A.innerHTML}</g>`; });
  await p.screenshot({ path: path.join(__dirname, 'bg.png') });
  await p.goto('http://127.0.0.1:8135/video/telinga-penuh-pop/cover/cover.html'); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
  await p.screenshot({ path: path.join(__dirname, 'cover.png') });
  await p.setViewportSize({ width: 360, height: 640 }); await b.close();
})();

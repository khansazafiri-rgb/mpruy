// node video/live-4d-perikardial/shot.cjs <out.png> <t detik> [<t2> ...]  (butuh server statis 8134 dari akar repo; VO=1 untuk penanda voice-over)
const { chromium } = require('playwright');
(async () => {
  const [out, ...ts] = process.argv.slice(2); const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', (e) => console.log('pageerror', e.message)); p.on('console', (m) => { if (m.type() === 'error') console.log('console', m.text()); });
  await p.goto('http://127.0.0.1:8134/video/live-4d-perikardial/stage/index.html' + (process.env.VO ? '?vo=1' : '')); await p.waitForFunction(() => window.__ready, null, { timeout: 30000 });
  for (const t of ts) { await p.evaluate((t) => window.renderFrame(t), +t); await p.screenshot({ path: ts.length > 1 ? out.replace(/(\.\w+)$/, `_${t}$1`) : out }); }
  await b.close(); console.log('ok');
})();

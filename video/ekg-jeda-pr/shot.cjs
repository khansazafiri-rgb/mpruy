// node shot.cjs "<t1,t2,...>" <folder>  -> still (butuh server statis 8140 dari akar repo)
const { chromium } = require('/opt/node-tools/node_modules/playwright');
(async () => { const [ts, out] = process.argv.slice(2); const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', (e) => console.log('pageerror', e.message)); p.on('console', (m) => { if (m.type() === 'error') console.log('console', m.text()); });
  await p.goto('http://127.0.0.1:8140/video/ekg-jeda-pr/stage/index.html'); await p.waitForFunction(() => window.__ready, null, { timeout: 60000 });
  require('fs').mkdirSync(out, { recursive: true });
  for (const t of ts.split(',')) { await p.evaluate((x) => window.renderFrame(x), +t); await p.screenshot({ path: `${out}/t${t}.png` }); console.log('ok', t); }
  await b.close(); })();

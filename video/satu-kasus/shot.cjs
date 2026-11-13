// node video/satu-kasus/shot.cjs "<query>" out.png [w]  -> screenshot panggung (butuh server statis 8128)
const { chromium } = require('playwright');
(async () => { const [qs, out, w] = process.argv.slice(2); const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', (e) => console.log('pageerror', e.message)); p.on('console', (m) => { if (m.type() === 'error') console.log('console', m.text()); });
  await p.goto(`http://127.0.0.1:8128/video/satu-kasus/stage/index.html?${qs}`); await p.waitForFunction(() => window.__ready, null, { timeout: 30000 });
  await p.screenshot({ path: out }); await b.close(); console.log('ok', out); })();

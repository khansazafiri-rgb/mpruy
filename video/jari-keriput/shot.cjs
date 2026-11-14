// node video/jari-keriput/shot.cjs <out.png> <t detik> [<t2> ...]   -> tangkapan panggung (butuh server statis: python3 -m http.server 8131 dari akar repo)
const { chromium } = require('playwright');
(async () => {
  const [out, ...ts] = process.argv.slice(2); const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', (e) => console.log('pageerror', e.message)); p.on('console', (m) => { if (m.type() === 'error') console.log('console', m.text()); });
  await p.goto('http://127.0.0.1:8131/video/jari-keriput/stage/index.html'); await p.waitForFunction(() => window.__ready, null, { timeout: 30000 });
  for (const t of ts) { await p.evaluate((t) => window.renderFrame(t), +t); await p.screenshot({ path: ts.length > 1 ? out.replace(/(\.\w+)$/, `_${t}$1`) : out }); }
  await b.close(); console.log('ok');
})();

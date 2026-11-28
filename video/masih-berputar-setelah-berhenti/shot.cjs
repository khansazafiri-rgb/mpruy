// node video/cegukan-hik/shot.cjs <keluaran.png> <t> [<t2> ...]   (server statis 8135 dari akar repo; NOCAP=1 = tanpa takarir; EXTRA="z=2&cx=540" = parameter uji)
const { chromium } = require('playwright');
(async () => {
  const [out, ...ts] = process.argv.slice(2); const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', (e) => console.log('pageerror', e.message)); p.on('console', (m) => { if (m.type() === 'error') console.log('console', m.text()); });
  const qs = [process.env.NOCAP ? 'nocap=1' : '', process.env.EXTRA || ''].filter(Boolean).join('&');
  await p.goto('http://127.0.0.1:8135/video/masih-berputar-setelah-berhenti/stage/index.html' + (qs ? '?' + qs : '')); await p.waitForFunction(() => window.__ready, null, { timeout: 60000 });
  for (const t of ts) { await p.evaluate((t) => window.renderFrame(t), +t); await p.screenshot({ path: ts.length > 1 ? out.replace(/(\.\w+)$/, `_${t}$1`) : out }); }
  await b.close(); console.log('ok');
})();

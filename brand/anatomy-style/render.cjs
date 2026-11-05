// node brand/anatomy-style/render.cjs [jantung|gigi ...] -> render/<nama>.png (bersih) dan render/<nama>-label.png (dengan label pemeriksaan)
// butuh server statis dari akar repo: python3 -m http.server 8128 --bind 127.0.0.1
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
(async () => {
  const names = process.argv.slice(2).length ? process.argv.slice(2) : ['jantung', 'gigi'];
  const out = path.join(__dirname, 'render'); fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', (e) => console.log('pageerror', e.message)); p.on('console', (m) => { if (m.type() === 'error') console.log('console', m.text()); });
  for (const n of names) for (const mode of ['', 'labels', 'plain']) {
    const lab = mode === 'labels', plain = mode === 'plain';
    await p.goto(`http://127.0.0.1:8128/brand/anatomy-style/render.html?obj=${n}${mode ? '&' + mode : ''}`); await p.waitForFunction(() => window.__ready, null, { timeout: 30000 }); await p.waitForTimeout(400);
    await p.screenshot({ path: path.join(out, `${n}${lab ? '-label' : plain ? '-polos' : ''}.png`) }); console.log('ok', n, mode || 'bersih');
  }
  await b.close();
})();

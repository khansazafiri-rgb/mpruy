// node brand/anatomy-style/siluet-banding.cjs  -> render/siluet-{ref,v5,baru}.png (panel mentah, 1080 x 1920); disusun oleh bandingkan-siluet.py
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', (e) => console.log('pageerror', e.message));
  for (const m of ['ref', 'v5', 'baru']) { await p.goto(`http://127.0.0.1:8128/brand/anatomy-style/siluet.html?m=${m}`); await p.waitForFunction(() => window.__ready, null, { timeout: 30000 }); await p.screenshot({ path: path.join(__dirname, 'render', `siluet-${m}.png`) }); console.log('ok', m); }
  await b.close();
})();

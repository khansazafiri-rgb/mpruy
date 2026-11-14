// node video/jari-keriput/shot-page.cjs <url> <out.png> <w> <h>  -> tangkapan satu halaman uji (butuh server statis 8131 dari akar repo)
const { chromium } = require('playwright');
(async () => {
  const [url, out, w, h] = process.argv.slice(2); const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: +w, height: +h } });
  p.on('pageerror', (e) => console.log('pageerror', e.message)); p.on('console', (m) => { if (m.type() === 'error') console.log('console', m.text()); });
  await p.goto(url); await p.waitForFunction(() => window.__ready, null, { timeout: 30000 }); await p.screenshot({ path: out }); await b.close(); console.log('ok');
})();

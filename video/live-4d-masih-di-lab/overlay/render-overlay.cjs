// node video/live-4d-masih-di-lab/overlay/render-overlay.cjs -> PNG transparan 1080x1920 per baris teks. Butuh server statis (python3 -m http.server 8128) di akar repo.
// Argumen opsional: node render-overlay.cjs cover  -> versi cover (q dan a digeser agar aman untuk potongan profil 3:4), ke ../cover/
const { chromium } = require('playwright'); const path = require('path');
const cover = process.argv[2] === 'cover';
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', (e) => console.log('pageerror', e.message));
  const list = cover ? [['q', 190], ['a', -10], ['p1', -10], ['p2', -10], ['p3', -10]] : [['q', 0], ['a', 0], ['p1', 0], ['p2', 0], ['p3', 0]];
  for (const [k, dy] of list) { await p.goto('http://127.0.0.1:8128/video/live-4d-masih-di-lab/overlay/overlay.html?k=' + k + '&dy=' + dy); await p.waitForFunction(() => window.__ready); await p.waitForTimeout(150);
    await p.screenshot({ path: path.join(__dirname, cover ? '../cover/t-' + k + '.png' : k + '.png'), omitBackground: true }); console.log('ok', k); }
  await b.close(); })();

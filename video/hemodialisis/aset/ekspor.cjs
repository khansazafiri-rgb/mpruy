// node video/hemodialisis/aset/ekspor.cjs  -> berkas SVG mandiri (ginjal, dialiser, latar, sirkuit, serat) dari kode yang sama dengan video. Butuh server statis 8128 dari akar repo.
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', (e) => console.log('pageerror', e.message));
  await p.goto('http://127.0.0.1:8128/video/hemodialisis/stage/index.html'); await p.waitForFunction(() => window.__ready, null, { timeout: 30000 });
  for (const n of ['ginjal-normal', 'ginjal-fungsi-turun', 'dialiser-cangkang', 'dialiser-bening-serat', 'latar', 'sirkuit-dunia', 'serat-memanjang', 'serat-melintang']) {
    const svg = await p.evaluate((x) => window.asetSvg(x), n); fs.writeFileSync(path.join(__dirname, n + '.svg'), svg); console.log('ok', n, svg.length);
  }
  await b.close();
})();

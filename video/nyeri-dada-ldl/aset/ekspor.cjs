// node video/nyeri-dada-ldl/aset/ekspor.cjs  -> aset SVG mandiri yang dapat diedit (butuh server statis 8128 dari akar repo)
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const NAMA = ['latar', 'arteri-normal', 'arteri-plak-menyempit', 'arteri-ruptur-bekuan', 'dinding-ldl-sel-imun', 'jantung-koroner', 'tangga-raka-duduk'];
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', (e) => console.log('pageerror', e.message));
  await p.goto('http://127.0.0.1:8128/video/nyeri-dada-ldl/stage/index.html'); await p.waitForFunction(() => window.__ready, null, { timeout: 30000 });
  for (const n of NAMA) { let svg = await p.evaluate((x) => window.asetSvg(x), n); svg = svg.replace(/href="logo-full\.webp"/g, 'href="../stage/logo-full.webp"'); fs.writeFileSync(path.join(__dirname, n + '.svg'), svg); console.log('ok', n, svg.length); }
  await b.close(); })();

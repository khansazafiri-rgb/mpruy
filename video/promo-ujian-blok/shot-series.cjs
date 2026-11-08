// node video/promo-ujian-blok/shot-series.cjs <keluaran-dir> <t0> <t1> <langkah> [lebar=360]  -> JPEG kecil tiap <langkah> detik (untuk memeriksa sepintas); butuh server statis 8128
const { chromium } = require('playwright'); const fs = require('fs');
(async () => { const [out, a, b, st, w] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
  const br = await chromium.launch(); const p = await br.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: (+w || 360) / 1080 });
  let err = 0; p.on('pageerror', (e) => { err++; console.log('pageerror', e.message); });
  await p.goto('http://127.0.0.1:8128/video/promo-ujian-blok/stage/index.html'); await p.waitForFunction(() => window.__ready, null, { timeout: 30000 });
  for (let t = +a; t <= +b + 1e-6; t += +st) { await p.evaluate((x) => window.renderFrame(x), t); await p.screenshot({ path: `${out}/t${t.toFixed(2).padStart(6, '0')}.png` }); }
  console.log('selesai, pageerror =', err); await br.close(); })();

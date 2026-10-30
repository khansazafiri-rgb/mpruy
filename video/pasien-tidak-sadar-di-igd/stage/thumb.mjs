// Thumbnail 1080x1920: bingkai pandangan orang pertama (wajah dokter dan perawat) + judul. Pemakaian: node thumb.mjs out.jpg
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const out = process.argv[2] || 'thumbnail.jpg';
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1080, height: 1920 } })).newPage();
await p.goto('http://127.0.0.1:8140/video/pasien-tidak-sadar-di-igd/stage/index.html'); await p.waitForFunction(() => window.__ready);
await p.evaluate(() => { window.renderFrame(0.6 + 3.7); for (const id of ['vg', 'lt', 'lb', 'lg']) document.getElementById(id).setAttribute('opacity', 0); for (const id of ['cap', 'hook', 'chips', 'card']) document.getElementById(id).style.display = 'none';
  const d = document.createElement('div');
  d.style.cssText = 'position:absolute;left:0;top:0;width:1080px;height:1920px;background:linear-gradient(180deg,rgba(2,6,14,.82) 0,rgba(2,6,14,0) 38%,rgba(2,6,14,0) 62%,rgba(2,6,14,.85) 100%)';
  d.innerHTML = `<div style="position:absolute;left:60px;top:240px;width:860px;font:800 84px/1.06 'Plus Jakarta Sans';color:#fff;letter-spacing:-.02em">Kamu dibawa ke IGD <span style="color:#F8C038">tidak sadar.</span></div>
  <div style="position:absolute;left:60px;top:560px;max-width:800px;background:#D9382F;color:#fff;font:800 60px/1.1 'Plus Jakarta Sans';padding:16px 30px 20px;border-radius:26px;box-shadow:0 10px 0 rgba(0,0,0,.3)">Dokter harus menunggu keluargamu?</div>
  <img src="logo-full.webp" style="position:absolute;left:60px;top:1560px;left:60px;width:360px;filter:brightness(0) invert(1)">`;
  document.getElementById('root').appendChild(d); });
await p.screenshot({ path: out, type: 'jpeg', quality: 94 });
await b.close();

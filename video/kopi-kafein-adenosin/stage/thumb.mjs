// Thumbnail 1080x1920: Raka mengantuk dengan cangkir + judul. Pemakaian: node thumb.mjs out.jpg
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const out = process.argv[2] || 'thumbnail.jpg';
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1080, height: 1920 } })).newPage();
await p.goto('http://127.0.0.1:8140/video/kopi-kafein-adenosin/stage/index.html'); await p.waitForFunction(() => window.__ready);
await p.evaluate(() => { window.renderFrame(0.6 + 3.3); for (const id of ['cap', 'hook', 'chips', 'legends']) document.getElementById(id).style.display = 'none';
  const d = document.createElement('div');
  d.style.cssText = 'position:absolute;left:0;top:0;width:1080px;height:1920px';
  d.innerHTML = `<div style="position:absolute;left:0;top:1130px;width:1080px;height:790px;background:linear-gradient(180deg,rgba(11,22,38,0) 0,rgba(11,22,38,.85) 30%)"></div>
  <div style="position:absolute;left:60px;top:250px;width:860px;font:800 92px/1.04 'Plus Jakarta Sans';color:#fff;letter-spacing:-.02em;text-shadow:0 6px 0 rgba(0,0,0,.3)">Kenapa kopi bikin <span style="color:#F8C038">nggak ngantuk?</span></div>
  <div style="position:absolute;left:60px;top:1180px;width:860px;font:800 56px/1.14 'Plus Jakarta Sans';color:#fff">Kafein vs <span style="color:#B9A3FF">adenosin</span> di dalam otakmu</div>
  <img src="logo-full.webp" style="position:absolute;left:60px;top:1420px;width:360px;filter:brightness(0) invert(1)">`;
  document.getElementById('root').appendChild(d); });
await p.screenshot({ path: out, type: 'jpeg', quality: 94 });
await b.close();

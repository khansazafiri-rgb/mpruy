// Perekam atlas MEDCOEL asli, deterministik per bingkai.
// Model 3D: kanvas WebGL asli ditangkap tepat setelah aplikasi merender satu bingkai (PNG, alfa).
// Antarmuka: tangkapan layar halaman asli dengan kanvas disembunyikan. Semua aksi lewat klik/seret/roda mouse sungguhan.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
let OUT = process.env.REC_OUT || path.join(__dirname, 'rec');
const W = 1080, H = 1920;
const URL = process.env.ATLAS_URL || 'http://127.0.0.1:8130/anatomy/viewer/';

exports.start = async function (outDir) {
  if (outDir) OUT = outDir; fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await (await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })).newPage();
  p.on('pageerror', (e) => console.log('pageerror', e.message));
  let wait = null, idx = 0;
  await p.exposeFunction('__saved', async (b64) => {
    const f = `f${String(idx).padStart(5, '0')}.png`; fs.writeFileSync(path.join(OUT, f), Buffer.from(b64, 'base64')); idx++;
    if (wait) { const w = wait; wait = null; w(f); }
  });
  await p.addInitScript(() => {
    window.__hold = false; window.__want = false; window.__drew = false; window.__n = 0;
    for (const P of [WebGL2RenderingContext.prototype, WebGLRenderingContext.prototype])
      for (const m of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced', 'drawRangeElements', 'clear']) {
        const o = P[m]; if (!o) continue; P[m] = function (...a) { window.__drew = true; return o.apply(this, a); };
      }
    const gc = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, attrs) { if (type === 'webgl2' || type === 'webgl') attrs = { ...(attrs || {}), antialias: false }; return gc.call(this, type, attrs); };
    const raf = window.requestAnimationFrame.bind(window); const caf = window.cancelAnimationFrame.bind(window);
    let queue = [], sched = false, ids = 0;
    function run(t) {
      sched = false; const q = queue; queue = [];
      for (const it of q) {
        if (it.dead) continue;
        window.__drew = false; it.cb(t); window.__n++;
        if (window.__want && window.__drew) {
          window.__want = false; window.__hold = true;
          const c = document.querySelector('#threeCanvas'); const d = c.toDataURL('image/png');
          window.__saved(d.slice(d.indexOf(',') + 1));
        }
      }
      if (!window.__hold && queue.length) schedule();
    }
    function schedule() { if (!sched) { sched = true; raf(run); } }
    window.__release = () => { window.__hold = false; if (queue.length) schedule(); };
    window.requestAnimationFrame = (cb) => { const it = { id: ++ids, cb, dead: false }; queue.push(it); if (!window.__hold) schedule(); return it.id; };
    window.cancelAnimationFrame = (id) => { for (const it of queue) if (it.id === id) it.dead = true; };
  });
  await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => document.querySelector('.loading-overlay')?.classList.contains('hidden'), null, { timeout: 300000, polling: 1000 });
  await p.evaluate(() => { window.__hold = true; });
  const api = {
    b, p,
    // minta satu bingkai: lepas tahanan, tunggu aplikasi merender satu kali, tahan lagi
    frame: async (timeoutMs = 20000) => {
      const pr = new Promise((r) => { wait = r; });
      await p.evaluate(() => { window.__want = true; window.__release(); });
      const to = new Promise((r) => setTimeout(() => r(null), timeoutMs));
      const res = await Promise.race([pr, to]);
      if (res === null) { wait = null; await p.evaluate(() => { window.__want = false; window.__hold = true; }); }
      return res;
    },
    // paksa render satu kali (mis. setelah klik) lalu tangkap
    poke: async (to = 90000) => { await p.evaluate(() => window.dispatchEvent(new Event('resize'))); return api.frame(to); },
    // klik mouse sungguhan di tengah elemen (tanpa pemeriksaan keterlibatan rAF Playwright)
    click: async (sel) => { const r = await api.rect(sel); if (!r) throw new Error('tidak ada ' + sel); await p.mouse.move(r[0] + r[2] / 2, r[1] + r[3] / 2, { steps: 2 }); await p.mouse.down(); await p.mouse.up(); return r; },
    busyInfo: () => p.evaluate(() => ({ dis: document.querySelectorAll('#atlasGroups input[disabled]').length, st: document.querySelector('#atlasStatus')?.textContent.trim() })),
    ui: async (name) => { // tangkapan antarmuka tanpa kanvas
      await p.evaluate(() => { document.querySelector('#threeCanvas').style.visibility = 'hidden'; });
      await p.screenshot({ path: path.join(OUT, name), timeout: 300000 });
      await p.evaluate(() => { document.querySelector('#threeCanvas').style.visibility = ''; });
    },
    rect: (sel) => p.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map((v) => Math.round(v * 10) / 10); }, sel),
    loaded: () => p.evaluate(() => [...document.querySelectorAll('#atlasGroups strong')].map((s) => s.title)),
    // setelah klik: render terus sampai kontrol aktif lagi (aplikasi selesai menerapkan perubahan), kembalikan semua bingkai
    settle: async (max = 40, log = false, extra = false) => {
      const names = []; let t0 = Date.now();
      for (let i = 0; i < max; i++) {
        await p.waitForTimeout(i === 0 ? 900 : 250);
        const fn = await (i === 0 ? api.poke() : api.frame(4000)); if (fn) names.push(fn);
        const bi = await api.busyInfo(); if (log) console.log('  settle', i, fn, JSON.stringify(bi), ((Date.now() - t0) / 1000).toFixed(0) + 's');
        if (!bi.dis) { if (extra) { const e2 = await api.frame(8000); if (e2) names.push(e2); } names.status = bi.st; return names; }
      }
      return names;
    },
    last: () => `f${String(idx - 1).padStart(5, '0')}.png`,
    count: () => idx,
  };
  return api;
};

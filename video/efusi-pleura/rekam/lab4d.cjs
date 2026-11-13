// Perekam deterministik untuk Live 4D Lab MEDCOEL ASLI (https://medcoel.com/anatomy/4d-lab/, versi produksi).
// Aplikasi memakai WebGL perangkat lunak (SwiftShader) sehingga lambat dan tangkap layar biasa bisa 6 dtk/bingkai. Perekam ini:
//  - mengganti requestAnimationFrame dan performance.now dengan jam virtual yang digerakkan perekam (satu "tick" = satu putaran loop aplikasi),
//  - memajukan fase jantung/napas sesuai laju fisiologi aplikasi (72/mnt, 14/mnt) pada kecepatan nyata (1x),
//  - tiap bingkai keluaran 30 fps: gerakkan input sungguhan (mouse/klik/pilih skenario), tick, tunggu pekerja pencitraan selesai (kualitas penuh), tangkap layar.
// Tidak ada kode aplikasi yang diubah dan tidak ada citra yang digambar ulang: yang ditangkap adalah halaman produksi apa adanya.
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
const URL = process.env.LAB_URL || 'https://medcoel.com/anatomy/4d-lab/';
const INIT = () => {
  let vnow = 1000; const cbs = [];
  performance.now = () => vnow;
  window.requestAnimationFrame = (cb) => { cbs.push(cb); return cbs.length; };
  window.cancelAnimationFrame = () => {};
  const css = '#__cur{position:fixed;left:0;top:0;width:0;height:0;z-index:2147483647;pointer-events:none}#__cur .dot{position:absolute;left:-14px;top:-14px;width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,.55);border:3px solid #0A3830;box-shadow:0 2px 8px rgba(0,0,0,.4)}#__cur .ring{position:absolute;left:-30px;top:-30px;width:60px;height:60px;border-radius:50%;border:4px solid #F8C038;opacity:0}';
  const mk = () => { if (document.getElementById('__cur') || !document.documentElement) return; const st = document.createElement('style'); st.textContent = css; document.documentElement.appendChild(st); const c = document.createElement('div'); c.id = '__cur'; c.innerHTML = '<div class="ring"></div><div class="dot"></div>'; document.documentElement.appendChild(c);
    window.__cur = { x: -100, y: -100, ring: -1, draw() { c.style.transform = `translate(${this.x}px,${this.y}px)`; const r = c.querySelector('.ring'); r.style.opacity = this.ring >= 0 ? 0.95 * (1 - this.ring) : 0; r.style.transform = `scale(${0.4 + 1.2 * Math.max(0, this.ring)})`; } };
    window.addEventListener('mousemove', (e) => { window.__cur.x = e.clientX; window.__cur.y = e.clientY; window.__cur.draw(); }, true);
    window.addEventListener('mousedown', () => { window.__cur.ring = 0; window.__cur.draw(); }, true); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mk); else mk();
  window.__vt = { set: (v) => { vnow = v; }, get: () => vnow, tick: () => { const list = cbs.splice(0); for (const cb of list) { try { cb(vnow); } catch (e) { console.error('tick', e && e.message); } } return list.length; } };
};
async function open({ w = 1600, h = 950, dpr = 1, args = [] } = {}) {
  const browser = await chromium.launch({ args: ['--disable-gpu', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', ...args] });
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });
  await ctx.addInitScript(INIT);
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push('pageerror ' + e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push('console ' + m.text()); });
  await page.goto(URL, { waitUntil: 'load', timeout: 120000 });
  const lab = { browser, ctx, page, errs, V: 2000 };
  const click_ = (l, s) => click(l, s);
  // aplikasi dimuat secara tak sinkron: gerakkan loop sampai status siap
  const t0 = Date.now();
  while (Date.now() - t0 < 120000) {
    await page.evaluate(() => window.__vt.tick()); await page.waitForTimeout(120);
    const ok = await page.evaluate(() => !!(window.__lab && window.__lab.last && window.__lab.last.id > 0 && !/Memulai|Memuat/.test(document.querySelector('#loadStatus')?.textContent || 'x')));
    if (ok) break;
  }
  await click(lab, { text: 'Lewati', exact: true }).catch(() => {});
  await page.evaluate(() => { window.__lab.S.playing = false; });
  return lab;
}
const ev = (lab, fn, arg) => lab.page.evaluate(fn, arg);
/** satu putaran loop pada waktu virtual V; menunggu pencitraan baru (kualitas penuh) */
async function render(lab, { touch = true, wait = true } = {}) {
  const { page } = lab; const V = lab.V;
  if (touch) await page.evaluate((V) => { window.__vt.set(V - 300); const i = document.querySelector('[data-testid="angle-rock"]'); if (i) i.dispatchEvent(new Event('change', { bubbles: true })); window.__vt.set(V); }, V);
  else await page.evaluate((V) => window.__vt.set(V), V);
  const id0 = await ev(lab, () => window.__lab.last.id);
  await ev(lab, () => window.__vt.tick());
  if (wait) {
    try { await page.waitForFunction((id) => window.__lab.last.id > id, id0, { polling: 15, timeout: 15000 }); } catch (e) { /* tidak ada permintaan baru */ }
    await ev(lab, () => window.__vt.tick());
  }
}
/** majukan fase fisiologi (detik nyata aplikasi) tanpa memutar loop */
async function setPhase(lab, tSec) {
  await ev(lab, (t) => { const S = window.__lab.S, c = window.__lab.clock, p = S.params; c.t = t; c.beatPhase = t * p.heartRate / 60; c.breathPhase = t * p.respRate / 60; c.giPhase = t * (p.antralFrequency || 3) / 60; }, tSec);
}
async function shot(lab, file, opts = {}) { await lab.page.screenshot({ path: file, type: 'jpeg', quality: opts.q || 93, clip: opts.clip, timeout: 60000 }); }
/** pusat elemen di layar. spec: selektor CSS (string) atau { text, sel } (cari berdasarkan teks, tanpa locator Playwright karena rAF diganti) */
async function center(lab, spec) {
  const r = await lab.page.evaluate((spec) => {
    let el;
    if (typeof spec === 'string') el = document.querySelector(spec);
    else { const list = [...document.querySelectorAll(spec.sel || 'button')].filter((e) => e.offsetParent !== null && (spec.exact ? e.textContent.trim() === spec.text : e.textContent.includes(spec.text))); el = list[spec.nth || 0]; }
    if (!el) return null; el.scrollIntoView({ block: 'nearest' }); const b = el.getBoundingClientRect(); return b.width && b.height ? [b.x + b.width / 2, b.y + b.height / 2] : null;
  }, spec);
  if (!r) throw new Error('elemen tidak ketemu: ' + JSON.stringify(spec));
  return r;
}
/** klik sungguhan (mouse) tanpa pemeriksaan rAF Playwright; kursor ikut tergambar */
async function click(lab, sel) { const [x, y] = await center(lab, sel); await lab.page.mouse.move(x, y); await lab.page.mouse.down(); await lab.page.mouse.up(); await lab.page.evaluate(() => { if (window.__cur) { window.__cur.ring = 0.15; window.__cur.draw(); } }); return [x, y]; }
async function ring(lab, k) { await lab.page.evaluate((k) => { if (window.__cur) { window.__cur.ring = k; window.__cur.draw(); } }, k); }
module.exports = { open, render, setPhase, shot, ev, center, click, ring };

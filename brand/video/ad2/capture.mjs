// Perekam layar web MEDCOEL per frame (deterministik): tiap frame video diambil pada waktu virtual yang tepat,
// jadi hasilnya mulus 30 fps. Perekam layar bawaan (screencast) hanya menangkap sekitar 6-9 gambar berbeda per detik
// pada 1080x1920, sehingga video terasa nyandet. Di sini:
//   - jam halaman dibekukan (page.clock) dan dimajukan tepat 1/30 detik per frame, jadi timer, ketikan huruf demi huruf,
//     dan animasi JS ikut maju mulus;
//   - animasi CSS dibekukan dan digeser lewat Web Animations API pada tiap frame; transisi CSS dimatikan;
//   - kursor, gulir, dan ketikan digerakkan skrip per frame (bukan oleh waktu nyata);
//   - kursor POV (panah + riak klik) digambar di halaman supaya ikut terekam.
// 360x640 piksel CSS x 2,5 = 900x1600 per frame (kartu web 9:16 utuh, tidak dipotong).
import fs from 'node:fs';
import path from 'node:path';

export const VIEW = { width: 360, height: 640, scale: 2.5 };
export const FPS = 30;
const DT = 1000 / FPS;
// PACE < 1 mempercepat semua gerakan (kursor, gulir, ketikan, jeda) tanpa memutar frame lebih cepat, jadi tetap mulus.
let P = Number(process.env.PACE || 1);
const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

const INIT = `(() => {
  const css = document.createElement('style');
  css.textContent = '.chat-fab{display:none!important}*,*::before,*::after{transition:none!important;scroll-behavior:auto!important;animation-play-state:paused!important;caret-color:#172B38}' +
    '#__cur{position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none;width:30px;height:30px;will-change:transform}' +
    '.__rip{position:fixed;z-index:2147483646;width:60px;height:60px;margin:-30px 0 0 -30px;border-radius:50%;pointer-events:none;background:rgba(255,196,60,.5);border:3px solid #E8A91A;animation:__rip .5s linear forwards}' +
    '@keyframes __rip{from{transform:scale(.3);opacity:1}to{transform:scale(1.4);opacity:0}}';
  const boot = () => {
    if (window.__capReady) return; window.__capReady = true;
    document.documentElement.appendChild(css);
    const cur = document.createElement('div'); cur.id = '__cur'; cur.style.display = 'none';
    cur.innerHTML = '<svg viewBox="0 0 30 30" width="30" height="30"><path d="M4 2 L4 24 L10 18.5 L14 27 L18 25 L14 16.8 L22 16.5 Z" fill="#fff" stroke="#172B38" stroke-width="2.2" stroke-linejoin="round"/></svg>';
    document.documentElement.appendChild(cur);
    window.__cur = (x, y, show = true) => { cur.style.display = show ? 'block' : 'none'; cur.style.transform = 'translate(' + (x - 4) + 'px,' + (y - 2) + 'px)'; };
    window.__rip = (x, y) => { const d = document.createElement('div'); d.className = '__rip'; d.style.left = x + 'px'; d.style.top = y + 'px'; document.documentElement.appendChild(d); };
    window.__step = (dt) => { for (const a of document.getAnimations()) { a.currentTime = (a.currentTime || 0) + dt; } document.querySelectorAll('.__rip').forEach((r) => { if (!r.getAnimations().length) r.remove(); }); };
    // angka uji coba di database dev tidak boleh bertabrakan dengan klaim iklan
    const rules = [/^\\d+\\s*\\/\\s*\\d+(\\s*soal)?(\\s*dikerjakan)?$/i, /^\\d+\\s*\\/\\s*\\d+\\s*soal/i, /^\\d+ siap dikerjakan/i, /^(Siap|Soal) dikerjakan\\s*\\d+(\\s*\\/\\s*\\d+)?$/i];
    setInterval(() => { for (const el of document.querySelectorAll('span,p,div,dd,output,b,li')) { const t = (el.textContent || '').trim(); if (t.length < 70 && el.querySelectorAll('*').length <= 5 && rules.some((r) => r.test(t))) el.style.visibility = 'hidden'; } }, 120);
  };
  if (document.documentElement) boot(); else addEventListener('DOMContentLoaded', boot);
})();`;

export async function openRecorder(browser, { auth, base, outDir, seed = 7, fast = false }) {
  fs.mkdirSync(outDir, { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: VIEW.width, height: VIEW.height }, deviceScaleFactor: VIEW.scale, locale: 'id-ID', timezoneId: 'Asia/Jakarta' });
  await ctx.addInitScript(INIT);
  // Math.random berbiji supaya "pasien acak" selalu sama pada tiap rekaman
  await ctx.addInitScript((s) => { let a = s; Math.random = () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }, seed);
  if (auth) await ctx.addInitScript(([k, v]) => localStorage.setItem(k, v), ['pocketbase_auth', JSON.stringify({ token: auth.token, record: auth.record })]);
  const page = await ctx.newPage();
  page.setDefaultTimeout(10000);
  await page.clock.install({ time: new Date('2026-10-24T09:00:00+07:00') });
  let pending = 0;
  page.on('request', (r) => { if (!['eventsource', 'websocket'].includes(r.resourceType()) && !/realtime/.test(r.url())) pending++; });
  const done = (r) => { if (!['eventsource', 'websocket'].includes(r.resourceType()) && !/realtime/.test(r.url())) pending = Math.max(0, pending - 1); };
  page.on('requestfinished', done); page.on('requestfailed', done);

  let n = 0; let cx = VIEW.width / 2; let cy = VIEW.height / 2; let curShown = false; let paused = false;
  const marks = {}; const rects = {}; const clicks = []; const keys = [];
  const frameFile = (i) => path.join(outDir, `${String(i).padStart(5, '0')}.jpg`);
  fs.readdirSync(outDir).filter((f) => f.endsWith('.jpg')).forEach((f) => fs.rmSync(path.join(outDir, f)));

  const settle = async (ms = 8000) => { const t0 = Date.now(); while (pending > 0 && Date.now() - t0 < ms) await new Promise((r) => setTimeout(r, 20)); await new Promise((r) => setTimeout(r, 30)); };
  const advance = async () => { await page.clock.runFor(DT); await page.evaluate((dt) => window.__step(dt), DT); await settle(); };
  const R = {
    page, get frames() { return n; }, get time() { return n / FPS; },
    async goto(url) {
      await page.goto(base + url, { waitUntil: 'load' });
      await settle(); await page.evaluate(() => document.fonts.ready);
      if (!paused) { const now = await page.evaluate(() => Date.now()); await page.clock.pauseAt(now + 50); paused = true; }
      await page.evaluate(([x, y, s]) => window.__cur && window.__cur(x, y, s), [cx, cy, curShown]);
    },
    // maju tanpa menyimpan frame (mis. menunggu animasi masuk selesai)
    async warm(sec) { for (let i = 0; i < Math.round(sec * FPS); i++) await advance(); },
    async frame() {
      await advance();
      await page.evaluate(([x, y, s]) => window.__cur && window.__cur(x, y, s), [cx, cy, curShown]);
      if (fast) n++; else await page.screenshot({ type: 'jpeg', quality: 92, path: frameFile(++n) });
    },
    async hold(sec) { for (let i = 0; i < Math.round(sec * P * FPS); i++) await R.frame(); },
    // tahan frame terakhir sampai shot (sejak mark `name`) sepanjang `sec` detik; peringatkan bila sudah lebih panjang
    async padTo(name, sec) { const used = (n - Math.round(marks[name] * FPS)) / FPS; if (used > sec + 0.05) console.log(`  PERINGATAN: ${name} ${used.toFixed(2)}s > ${sec}s`); for (let i = used * FPS; i < sec * FPS; i++) await R.frame(); },
    setPace(x) { P = x; },
    mark(name) { marks[name] = +(n / FPS).toFixed(3); },
    showCursor(on = true) { curShown = on; },
    async cursorAt(x, y) { cx = x; cy = y; curShown = true; await page.mouse.move(x, y); },
    // gerak kursor halus (lengkung ringan, percepatan alami)
    async moveTo(x, y, sec = 0.6) {
      curShown = true; const x0 = cx; const y0 = cy; const total = Math.max(1, Math.round(sec * P * FPS));
      const bend = Math.min(40, Math.hypot(x - x0, y - y0) * 0.12);
      for (let i = 1; i <= total; i++) {
        const k = ease(i / total);
        cx = x0 + (x - x0) * k + Math.sin(k * Math.PI) * bend; cy = y0 + (y - y0) * k - Math.sin(k * Math.PI) * bend * 0.6;
        await page.mouse.move(cx, cy); await R.frame();
      }
      cx = x; cy = y; await page.mouse.move(x, y);
    },
    async center(selector) {
      const loc = typeof selector === 'string' ? page.locator(selector).first() : selector;
      await loc.scrollIntoViewIfNeeded();
      const b = await loc.boundingBox();
      if (!b) throw new Error(`elemen tidak terlihat: ${selector}`);
      return { x: b.x + b.width / 2, y: b.y + b.height / 2, b };
    },
    // pindah ke elemen, klik (riak), tahan sebentar
    async click(selector, { move = 0.55, after = 0.35, dx = 0, dy = 0 } = {}) {
      const { x, y } = await R.center(selector);
      await R.moveTo(x + dx, y + dy, move);
      await page.evaluate(([a, b]) => window.__rip(a, b), [x + dx, y + dy]);
      clicks.push(+(n / FPS).toFixed(3));
      await page.mouse.down(); await R.frame(); await page.mouse.up();
      await R.hold(after);
    },
    async type(selector, text, cps = 11) {
      const loc = page.locator(selector).first();
      await loc.focus();
      const per = FPS / (cps / P); let acc = 0;
      for (const ch of text) { keys.push(+(n / FPS).toFixed(3)); await page.keyboard.type(ch); acc += per; while (acc >= 1) { await R.frame(); acc -= 1; } }
      await R.hold(0.2);
    },
    // gulir halaman sampai elemen berada pada pecahan `at` tinggi layar (0 = atas, 1 = bawah), supaya tidak tertutup navigasi bawah
    async reveal(selector, { at = 0.42, sec = 0.7, container = null } = {}) {
      const loc = typeof selector === 'string' ? page.locator(selector).first() : selector;
      await loc.waitFor({ state: 'visible' });
      const info = await loc.evaluate((el, [a, sel]) => { const root = sel ? document.querySelector(sel) : (document.scrollingElement || document.documentElement); const r = el.getBoundingClientRect(); const rr = sel ? root.getBoundingClientRect() : { top: 0, height: innerHeight }; return { target: root.scrollTop + (r.top - rr.top) + r.height / 2 - rr.height * a, max: root.scrollHeight - root.clientHeight }; }, [at, container]);
      const to = Math.max(0, Math.min(info.max, info.target));
      const cur = await page.evaluate((s) => (s ? document.querySelector(s) : (document.scrollingElement || document.documentElement)).scrollTop, container);
      if (Math.abs(to - cur) > 4) await R.scrollTo(to, sec, container);
    },
    // gulir halus (px dari atas) pada elemen penggulir; dihitung per frame
    async scrollTo(top, sec = 0.9, selector = null) {
      const total = Math.max(1, Math.round(sec * P * FPS));
      const from = await page.evaluate((s) => (s ? document.querySelector(s) : (document.scrollingElement || document.documentElement)).scrollTop, selector);
      for (let i = 1; i <= total; i++) {
        const v = from + (top - from) * ease(i / total);
        await page.evaluate(([s, y]) => { (s ? document.querySelector(s) : (document.scrollingElement || document.documentElement)).scrollTop = y; }, [selector, v]);
        await R.frame();
      }
    },
    // kotak elemen (dalam piksel CSS) pada saat ini, untuk sorotan di panggung
    async rect(name, selector) { const loc = typeof selector === 'string' ? page.locator(selector).first() : selector; const b = await loc.boundingBox(); if (b) rects[name] = { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1), t: +(n / FPS).toFixed(3) }; return b; },
    result(name) { return { name, dir: path.basename(outDir), frames: n, duration: +(n / FPS).toFixed(3), fps: FPS, marks, rects, clicks, keys, viewport: VIEW }; },
    async close() { await ctx.close(); },
  };
  return R;
}

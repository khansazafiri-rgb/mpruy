// Perekam kuis anatomi 3D MEDCOEL asli (halaman /anatomy/study dari apps/web + viewer 3D dari proyek Anatomy), deterministik per bingkai 30 fps.
// - Aplikasi asli dijalankan lokal (lihat README: build preview), Chromium dengan WebGL perangkat lunak. Tidak ada data pengguna, token, atau server produksi.
// - Waktu viewer 3D dibuat virtual: requestAnimationFrame dan performance.now hanya maju lewat __step(), 1/30 detik per bingkai, jadi animasi kamera dan sorotan tepat per bingkai.
// - Animasi CSS halaman dimajukan 33,3 ms per bingkai. Math.random dibuat berbenih supaya urutan soal selalu sama (dipilih lewat SEED).
// - Kursor tidak digambar di halaman: posisi dan klik disimpan ke cursor.json dan digambar di panggung video.
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const URL = process.env.QUIZ_URL || 'http://127.0.0.1:4188/anatomy/study';
const W = 540, H = 960, DPR = 2;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

exports.open = async function ({ out, seed = 12345, frames = true, a0 = 0 }) {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DPR, locale: 'id-ID' });
  await ctx.addInitScript((sd) => {
    if (location.pathname.startsWith('/anatomy/viewer/')) {
      let q = [], ids = 0, now = 0;
      performance.now = () => now; Date.now = () => 1.7e12 + now;
      window.requestAnimationFrame = (cb) => { const it = { id: ++ids, cb }; q.push(it); return it.id; };
      window.cancelAnimationFrame = (id) => { q = q.filter((i) => i.id !== id); };
      window.__step = (n = 1) => {
        for (let k = 0; k < n; k++) {
          now += 1000 / 30; const cur = q; q = [];
          for (const it of cur) it.cb(now);
          for (const a of document.getAnimations()) { if (a.playState === 'running') a.pause(); a.currentTime = (+a.currentTime || 0) + 33.3; }
        }
      };
    } else {
      let s = sd; Math.random = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
    }
  }, seed);
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  p.on('pageerror', (e) => console.log('pageerror', e.message));
  await p.goto(URL, { waitUntil: 'networkidle' });
  await p.addStyleTag({ content: '[role=note]{display:none!important}*{scrollbar-width:none!important}::-webkit-scrollbar{display:none!important}' });
  fs.mkdirSync(out, { recursive: true });
  const S = { b, p, cdp, out, n: 0, cx: 430, cy: 800, down: false, cur: [], a0, frames, clicks: [] };
  const viewerFrame = () => p.frames().find((f) => f.url().includes('/anatomy/viewer/'));
  S.step = async (k = 1) => { const f = viewerFrame(); if (f) await f.evaluate((n) => window.__step && window.__step(n), k).catch(() => {}); };
  S.audioT = () => a0 + S.n / 30;
  // satu bingkai video: majukan animasi halaman dan viewer lalu simpan tangkapan layar
  S.frame = async () => {
    await p.evaluate(() => { for (const a of document.getAnimations()) { if (a.playState === 'running') a.pause(); a.currentTime = (+a.currentTime || 0) + 33.3; } });
    await S.step(1);
    if (frames) {
      const r = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 90 });
      fs.writeFileSync(path.join(out, `f${String(S.n).padStart(4, '0')}.jpg`), Buffer.from(r.data, 'base64'));
    }
    S.cur.push([Math.round(S.cx * 10) / 10, Math.round(S.cy * 10) / 10, S.down ? 1 : 0]);
    S.n++;
  };
  S.hold = async (k) => { for (let i = 0; i < k; i++) await S.frame(); };
  S.until = async (a) => { const target = Math.round((a - a0) * 30); if (S.n > target + 2) console.log(`  terlambat ${(S.n - target) / 30}s pada a=${a}`); while (S.n < target) await S.frame(); };
  S.moveTo = async (tx, ty, k = 18) => {
    const sx = S.cx, sy = S.cy;
    for (let i = 1; i <= k; i++) { const e = ease(i / k); S.cx = sx + (tx - sx) * e; S.cy = sy + (ty - sy) * e - Math.sin(Math.PI * e) * 10; await p.mouse.move(S.cx, S.cy); await S.frame(); }
  };
  S.click = async (wait = 6) => {
    await p.mouse.down(); S.down = true; await S.frame(); await S.frame(); await p.mouse.up(); S.down = false; S.clicks.push(S.n);
    await p.waitForTimeout(350); await S.hold(wait);
  };
  // geser halaman halus: dy piksel CSS dalam k bingkai
  S.scrollBy = async (dy, k = 20) => { let done = 0; for (let i = 1; i <= k; i++) { const e = ease(i / k), want = dy * e; await p.mouse.wheel(0, want - done); done = want; await p.waitForTimeout(30); await S.frame(); } };
  S.rect = (fn, arg) => p.evaluate(fn, arg);
  S.center = async (fn, arg) => { const r = await p.evaluate(fn, arg); if (!r) throw new Error('elemen tidak ketemu: ' + String(fn).slice(0, 80)); return [r[0] + r[2] / 2, r[1] + r[3] / 2]; };
  S.ready = async (max = 400) => { for (let i = 0; i < max; i++) { await S.step(1); if (!(await p.evaluate(() => /Menyiapkan/.test(document.body.innerText)))) return i; } throw new Error('viewer tidak siap'); };
  S.close = async () => { fs.writeFileSync(path.join(out, 'cursor.json'), JSON.stringify({ fps: 30, a0, w: W, h: H, dpr: DPR, n: S.n, cur: S.cur, clicks: S.clicks })); await b.close(); };
  return S;
};

// pencari elemen (dijalankan di halaman)
exports.F = {
  btn: (t) => { const e = [...document.querySelectorAll('button')].find((x) => x.textContent.includes(t) && x.getBoundingClientRect().height > 0); if (!e) return null; const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; },
  mode: (t) => { const e = [...document.querySelectorAll('.library-mode-card')].find((x) => x.textContent.includes(t)); if (!e) return null; const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; },
  opt: (i) => { const e = document.querySelectorAll('.library-answer-options button')[i]; if (!e) return null; const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; },
  viewer: () => { const e = document.querySelector('.library-quiz-viewer iframe') || document.querySelector('.library-quiz-viewer'); if (!e) return null; const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; },
  abs: (sel) => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return [r.x, r.y + window.scrollY, r.width, r.height]; },
};

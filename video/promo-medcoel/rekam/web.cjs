// Rekam halaman web MEDCOEL asli (akun demo lokal, data uji) untuk video promo: materi, flashcard, latihan soal, simulasi dokter.
// Viewport desktop 1408 x 792, skala 2 (= 2816 x 1584, sama dengan rekaman layar yang diberikan). Deterministik 30 fps; kursor digambar di halaman.
// node web.cjs <folder-keluaran> [klip ...]   (klip: materi flash soal sim)   Butuh PocketBase (8090, seed video/tab-dua-puluh/seed) dan Vite (3000).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const OUT = process.argv[2] || path.join(__dirname, 'web');
const ONLY = process.argv.slice(3);
const W = 1408, H = 792, DPR = 2, CH = 'fw4bpaps0knp7bq'; // BAB "Osteologi & Artrologi"
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
(async () => {
  const PB = 'http://127.0.0.1:8090';
  const auth = await (await fetch(PB + '/api/collections/users/auth-with-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identity: 'nadia.putri', password: 'rahasia-demo-1' }) })).json();
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DPR, locale: 'id-ID' });
  await ctx.addInitScript((a) => {
    try { localStorage.setItem('pocketbase_auth', JSON.stringify({ token: a.token, record: a.record })); } catch (e) {}
    const css = '*{scrollbar-width:none!important}::-webkit-scrollbar{display:none!important}#__cur{position:fixed;left:0;top:0;width:0;height:0;z-index:2147483647;pointer-events:none}#__cur svg{position:absolute;left:-3px;top:-2px;width:34px;height:40px;filter:drop-shadow(0 3px 4px rgba(10,56,48,.45))}#__cur .ring{position:absolute;left:-26px;top:-26px;width:52px;height:52px;border-radius:50%;border:4px solid #F8C038;background:rgba(248,192,56,.28);opacity:0}';
    const mk = () => { if (document.getElementById('__cur')) return; const st = document.createElement('style'); st.textContent = css; document.documentElement.appendChild(st); const c = document.createElement('div'); c.id = '__cur'; c.innerHTML = '<div class="ring"></div><svg viewBox="0 0 34 40"><path d="M3 2 L3 30 L10.5 23.5 L15.5 35.5 L21 33 L16 21.5 L26 21 Z" fill="#fff" stroke="#0A3830" stroke-width="2.6" stroke-linejoin="round"/></svg>'; document.documentElement.appendChild(c); window.__cur = (x, y, ring) => { c.style.transform = `translate(${x}px,${y}px)`; const r = c.querySelector('.ring'); r.style.opacity = ring > 0 ? 0.95 * (1 - ring) : 0; r.style.transform = `scale(${0.35 + 1.15 * ring})`; }; window.__cur(+sessionStorage.__cx || 900, +sessionStorage.__cy || 600, 0); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mk); else mk();
  }, auth);
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log('pageerror', e.message));
  let cx = 900, cy = 600, n = 0, ringT = -1, dir = OUT;
  const frame = async () => {
    await p.evaluate(({ x, y, r }) => { for (const a of document.getAnimations()) { if (a.playState === 'running') a.pause(); a.currentTime = (+a.currentTime || 0) + 33.3; } try { sessionStorage.__cx = x; sessionStorage.__cy = y; } catch (e) {} if (window.__cur) window.__cur(x, y, r); }, { x: cx, y: cy, r: ringT >= 0 ? ringT : -1 });
    await p.screenshot({ path: path.join(dir, `f${String(n++).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 88 });
    if (ringT >= 0) { ringT += 1 / 14; if (ringT >= 1) ringT = -1; }
  };
  const hold = async (k) => { for (let i = 0; i < k; i++) await frame(); };
  const moveTo = async (tx, ty, k) => { const sx = cx, sy = cy; for (let i = 1; i <= k; i++) { const e = ease(i / k); cx = sx + (tx - sx) * e; cy = sy + (ty - sy) * e - Math.sin(Math.PI * e) * 8; await frame(); } };
  const clickAt = async (tx, ty, wait = 8) => { await p.mouse.move(tx, ty); await p.mouse.down(); await p.mouse.up(); await p.waitForTimeout(450); ringT = 0; for (let i = 0; i < wait; i++) await frame(); };
  const cen = async (loc) => { const bb = await loc.first().boundingBox(); if (!bb) throw new Error('elemen tidak ketemu'); return [bb.x + bb.width / 2, bb.y + bb.height / 2]; };
  const tap = async (loc, k = 14, wait = 10) => { const [x, y] = await cen(loc); await moveTo(x, y, k); await clickAt(x, y, wait); };
  const scrollBy = async (dy, k) => { await p.mouse.move(cx, cy); for (let i = 0; i < k; i++) { await p.mouse.wheel(0, dy / k); await frame(); } };
  const start = async (name) => { dir = path.join(OUT, name); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true }); n = 0; };
  const goto = async (url) => { await p.goto('http://127.0.0.1:3000' + url, { waitUntil: 'networkidle' }); await p.waitForTimeout(900); };
  const want = (k) => !ONLY.length || ONLY.includes(k);

  // ---- 1. catatan materi: BAB Osteologi, gulir pelan melewati daftar isi dan bacaan
  if (want('materi')) {
    await start('materi'); await goto(`/mata-kuliah/anatomi/materi/${CH}`); cx = 1100; cy = 500;
    await hold(12); await scrollBy(560, 56); await hold(8); await scrollBy(520, 50); await hold(8);
    console.log('materi', n);
  }
  // ---- 2. flashcard: balik kartu, tandai hafal, kartu berikutnya
  if (want('flash')) {
    await start('flash'); await goto(`/mata-kuliah/anatomi/flashcard/${CH}`); cx = 1100; cy = 600;
    console.log('flash tombol:', JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('button')].filter((x) => x.getBoundingClientRect().height > 0).map((x) => x.textContent.trim().slice(0, 30)))));
    await hold(14);
    await tap(p.locator('text=Ketuk untuk melihat jawaban'), 16, 22);          // balik kartu: jawaban
    await hold(10);
    console.log('flash tombol2:', JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('button')].filter((x) => x.getBoundingClientRect().height > 0).map((x) => x.textContent.trim().slice(0, 30)))));
    await scrollBy(150, 12); await hold(4);
    const hafal = p.getByRole('button', { name: 'Hafal', exact: true });
    if (await hafal.count()) { await tap(hafal, 14, 14); await hold(14); }
    console.log('flash', n);
  }
  // ---- 3. latihan soal: BAB Osteologi -> Latihan soal -> Mulai -> pilih jawaban -> Cek jawaban
  if (want('soal')) {
    await start('soal'); await goto('/mata-kuliah/anatomi'); cx = 1000; cy = 560;
    await p.evaluate(() => window.scrollTo({ top: 640, behavior: 'instant' })); await p.waitForTimeout(500); await hold(8);
    await tap(p.locator('.chapter-row', { hasText: 'Osteologi' }), 16, 12);
    await p.waitForSelector('.choice-card', { timeout: 8000 });
    await p.evaluate(() => [...document.querySelectorAll('.choice-card')][2].scrollIntoView({ block: 'center', behavior: 'instant' })); await p.waitForTimeout(400); await hold(6);
    await tap(p.getByRole('button', { name: /Latihan soal/ }).first(), 14, 12);
    await p.waitForTimeout(700); await hold(6);
    await tap(p.getByRole('button', { name: /Mulai/ }).first(), 14, 16);
    await p.waitForTimeout(900); await hold(10);
    console.log('runner', p.url());
    const opt = await p.evaluate(() => { const e = [...document.querySelectorAll('button,label,[role=radio]')].find((x) => /^C[^e]/.test(x.textContent.trim()) && x.getBoundingClientRect().height > 30); if (!e) return null; const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
    if (opt) { await moveTo(opt[0], opt[1], 14); await clickAt(opt[0], opt[1], 8); }
    const cek = p.getByRole('button', { name: /Cek jawaban/ }).first();
    if (await cek.count()) { await tap(cek, 12, 16); await hold(16); }
    console.log('soal', n);
  }
  // ---- 4. simulasi dokter: poli -> pasien -> dialog -> pertanyaan
  if (want('sim')) {
    await start('sim'); await goto('/simulasi-dokter'); cx = 700; cy = 620;
    await p.waitForSelector('text=Mau jaga di poli apa'); await hold(14);
    await tap(p.getByRole('button', { name: /Umum/ }).first(), 16, 12);
    await tap(p.getByRole('button', { name: /Mulai di/ }), 14, 14);
    await p.waitForSelector('.sim-dialog'); await p.waitForTimeout(700); await hold(18);
    await tap(p.locator('.sim-dialog'), 12, 14); await hold(16);
    const kel = p.getByText('Keluhan utama', { exact: true }); if (await kel.count()) { await tap(kel, 14, 12); await hold(8); }
    const q = p.locator('.sim-opt').first(); if (await q.count()) { await tap(q, 14, 14); await hold(26); }
    console.log('sim', n);
  }
  await b.close();
})().catch((e) => { console.log('GAGAL', e.message); process.exit(1); });

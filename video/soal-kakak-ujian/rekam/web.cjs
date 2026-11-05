// Rekam halaman web MEDCOEL asli (akun demo lokal, data uji) dalam tampilan laptop 1100 x 680 (skala 2): beranda mata kuliah, catatan materi, latihan soal + pembahasan, flashcard.
// Deterministik 30 fps; kursor dan cincin ketukan digambar di halaman. node web.cjs <folder-keluaran> [klip ...]   (klip: beranda materi soal flash)
// Butuh PocketBase (8090, data uji video/tab-dua-puluh/seed) dan Vite (3000) yang berjalan lokal. Tidak ada token atau akun admin yang tampil.
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs = require('fs');
const path = require('path');
const OUT = process.argv[2] || path.join(__dirname, 'web');
const ONLY = process.argv.slice(3);
const W = 1100, H = 680, DPR = 2;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
(async () => {
  const PB = 'http://127.0.0.1:8090';
  const J = { 'Content-Type': 'application/json' };
  const su = (await (await fetch(PB + '/api/collections/_superusers/auth-with-password', { method: 'POST', headers: J, body: JSON.stringify({ identity: 'dev@medcoel.local', password: 'devpassword123' }) })).json()).token;
  const subj = (await (await fetch(PB + '/api/collections/subjects/records?perPage=60', { headers: { Authorization: su } })).json()).items.find((s) => s.name === 'Anatomi');
  const chs = (await (await fetch(PB + `/api/collections/chapters/records?perPage=100&filter=${encodeURIComponent(`subject="${subj.id}"`)}`, { headers: { Authorization: su } })).json()).items;
  const CH = chs.find((c) => c.title.startsWith('Osteologi')).id;
  const auth = await (await fetch(PB + '/api/collections/users/auth-with-password', { method: 'POST', headers: J, body: JSON.stringify({ identity: 'nadia.putri', password: 'rahasia-demo-1' }) })).json();
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DPR, locale: 'id-ID' });
  await ctx.addInitScript((a) => {
    try { localStorage.setItem('pocketbase_auth', JSON.stringify({ token: a.token, record: a.record })); } catch (e) {}
    const css = '*{scrollbar-width:none!important}::-webkit-scrollbar{display:none!important}#__cur{position:fixed;left:0;top:0;width:0;height:0;z-index:2147483647;pointer-events:none}#__cur svg{position:absolute;left:-3px;top:-2px;width:34px;height:40px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.3))}#__cur .ring{position:absolute;left:-30px;top:-30px;width:60px;height:60px;border-radius:50%;border:4px solid #F8C038;opacity:0}';
    const mk = () => { if (document.getElementById('__cur')) return; const st = document.createElement('style'); st.textContent = css; document.documentElement.appendChild(st); const c = document.createElement('div'); c.id = '__cur'; c.innerHTML = '<div class="ring"></div><svg viewBox="0 0 34 40"><path d="M3 2 L3 30 L10.5 23.5 L15.5 35.5 L21 33 L16 21.5 L26 21 Z" fill="#fff" stroke="#0A3830" stroke-width="2.6" stroke-linejoin="round"/></svg>'; document.documentElement.appendChild(c); window.__cur = (x, y, ring) => { c.style.transform = `translate(${x}px,${y}px)`; const r = c.querySelector('.ring'); r.style.opacity = ring > 0 ? 0.95 * (1 - ring) : 0; r.style.transform = `scale(${0.35 + 1.15 * ring})`; }; window.__cur(+sessionStorage.__cx || 800, +sessionStorage.__cy || 420, 0); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mk); else mk();
  }, auth);
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log('pageerror', e.message));
  let cx = 800, cy = 420, n = 0, ringT = -1, dir = OUT;
  const frame = async () => {
    await p.evaluate(({ x, y, r }) => { for (const a of document.getAnimations()) { if (a.playState === 'running') a.pause(); a.currentTime = (+a.currentTime || 0) + 33.3; } try { sessionStorage.__cx = x; sessionStorage.__cy = y; } catch (e) {} if (window.__cur) window.__cur(x, y, r); }, { x: cx, y: cy, r: ringT >= 0 ? ringT : -1 });
    await p.screenshot({ path: path.join(dir, `f${String(n++).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 90 });
    if (ringT >= 0) { ringT += 1 / 14; if (ringT >= 1) ringT = -1; }
  };
  const hold = async (k) => { for (let i = 0; i < k; i++) await frame(); };
  const moveTo = async (tx, ty, k) => { const sx = cx, sy = cy; for (let i = 1; i <= k; i++) { const e = ease(i / k); cx = sx + (tx - sx) * e; cy = sy + (ty - sy) * e - Math.sin(Math.PI * e) * 8; await frame(); } };
  const clickAt = async (tx, ty, wait = 8) => { await p.mouse.move(tx, ty); await p.mouse.down(); await p.mouse.up(); await p.waitForTimeout(450); ringT = 0; for (let i = 0; i < wait; i++) await frame(); };
  const cen = async (loc) => { const bb = await loc.first().boundingBox(); if (!bb) throw new Error('elemen tidak ketemu'); return [bb.x + bb.width / 2, bb.y + bb.height / 2]; };
  const tap = async (loc, k = 14, wait = 10) => { const [x, y] = await cen(loc); await moveTo(x, y, k); await clickAt(x, y, wait); };
  const scrollTo = async (y, k) => { const y0 = await p.evaluate(() => window.scrollY); for (let i = 1; i <= k; i++) { await p.evaluate((v) => window.scrollTo(0, v), y0 + (y - y0) * ease(i / k)); await frame(); } };
  const start = async (name) => { dir = path.join(OUT, name); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true }); n = 0; };
  const goto = async (url) => { await p.goto('http://127.0.0.1:3000' + url, { waitUntil: 'networkidle' }); await p.waitForTimeout(900); };
  const want = (k) => !ONLY.length || ONLY.includes(k);
  const secTop = (txt) => p.evaluate((t) => { const h = [...document.querySelectorAll('h1,h2,h3')].find((x) => x.textContent.includes(t)); return h ? h.getBoundingClientRect().top + window.scrollY : null; }, txt);

  // ---- 1. beranda mata kuliah: daftar BAB, ketuk BAB, muncul urutan belajar (materi, flashcard, latihan soal)
  if (want('beranda')) {
    await start('beranda'); await goto('/mata-kuliah/anatomi'); cx = 900; cy = 470;
    await hold(4); await scrollTo(560, 20); await hold(4);
    const rowTop = await p.evaluate(() => { const e = [...document.querySelectorAll('.chapter-row')].find((x) => x.textContent.includes('Osteologi')); return e.getBoundingClientRect().top + window.scrollY; });
    await scrollTo(rowTop - 260, 18); await hold(4);
    await tap(p.locator('.chapter-row', { hasText: 'Osteologi' }), 12, 6);
    await p.waitForTimeout(700); await hold(26);
    console.log('beranda', n);
  }
  // ---- 2. catatan materi: halaman BAB, Mulai membaca, gulir tujuan belajar lalu isi bacaan (sebelum bagian bergambar)
  if (want('materi')) {
    await start('materi'); await goto(`/mata-kuliah/anatomi/materi/${CH}`); cx = 880; cy = 430;
    await hold(10); await tap(p.getByText('Mulai membaca').first(), 12, 8);
    await p.waitForTimeout(600); await hold(8);
    const t1 = await secTop('Konsep Dasar Osteologi'); await scrollTo(Math.max(0, t1 - 160), 30); await hold(14);
    await scrollTo(Math.max(0, t1 + 140), 26); await hold(12);
    console.log('materi', n);
  }
  // ---- 3. latihan soal: Latihan soal BAB ini -> Mulai -> pilih jawaban benar -> Cek jawaban -> pembahasan
  if (want('soal')) {
    await start('soal'); await goto(`/mata-kuliah/anatomi/materi/${CH}`); cx = 900; cy = 520;
    await hold(4); await tap(p.getByText('Latihan soal BAB ini').first(), 10, 6);
    await p.waitForTimeout(700); await hold(6);
    await tap(p.getByRole('button', { name: /Mulai 6 soal/ }), 10, 8);
    await p.waitForTimeout(1000); await hold(6);
    await scrollTo(120, 16); await hold(4);
    // soal acak tiap sesi: cari soal di data uji lalu pilih jawabannya yang benar
    const { EKSTREMITAS_ATAS, OSTEOLOGI } = await import(path.resolve(__dirname, '../../tab-dua-puluh/seed/questions.mjs'));
    const body = await p.evaluate(() => document.body.innerText);
    const seed = [...EKSTREMITAS_ATAS, ...OSTEOLOGI].find((q) => body.includes(q.text.slice(0, 40)));
    const right = seed ? seed.options.find((o) => o.correct).text : null;
    console.log('soal dikenali:', !!seed, right);
    const opt = await p.evaluate((rt) => { const e = [...document.querySelectorAll('label.answer-option')].find((x) => (x.textContent || '').trim().replace(/^[A-E]/, '').trim() === rt) || document.querySelector('label.answer-option'); if (!e) return null; const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }, right);
    if (!opt) throw new Error('opsi tidak ketemu');
    await moveTo(opt[0], opt[1], 10); await clickAt(opt[0], opt[1], 6);
    await tap(p.getByRole('button', { name: /Cek jawaban/ }).first(), 10, 8);
    await p.waitForTimeout(600); await hold(8);
    await scrollTo(await p.evaluate(() => window.scrollY) + 300, 22); await hold(14);
    console.log('soal', n);
  }
  // ---- 4. flashcard: balik kartu, tandai hafal, kartu berikutnya
  if (want('flash')) {
    await start('flash'); await goto(`/mata-kuliah/anatomi/flashcard/${CH}`); cx = 900; cy = 520;
    await hold(8); await scrollTo(250, 14); await hold(6);
    await tap(p.locator('text=Ketuk untuk melihat jawaban'), 12, 14); await hold(10);
    const hafal = p.getByRole('button', { name: 'Hafal', exact: true });
    if (await hafal.count()) { await tap(hafal, 10, 8); await hold(8); }
    console.log('flash', n);
  }
  await b.close();
})().catch((e) => { console.log('GAGAL', e.message); process.exit(1); });

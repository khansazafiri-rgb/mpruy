// Rekam web MEDCOEL ASLI (tampilan ponsel 540 x 900 CSS, skala 2 = 1080 x 1800 px) untuk video "Satu Kasus, Banyak yang Harus Nyambung".
// Akun demo lokal (data uji; bukan produksi). Deterministik: animasi CSS di-step 33,3 ms per bingkai (30 fps), ketukan jari digambar di halaman.
// node web.cjs <folder-keluaran> [klip ...]   klip: mk bab materi flash soal
// Butuh PocketBase (8090) + Vite (3000): lihat siapkan.sh (menyertakan soal uji BAB paru dari ../seed).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const OUT = process.argv[2] || path.join(__dirname, 'web');
const ONLY = process.argv.slice(3);
const W = 540, H = 900, DPR = 2;
const BAB = 'Anatomi Paru';   // BAB 'Anatomi Paru & Saluran Napas': materi bergambar + flashcard + 8 soal uji (../seed)
const BANK = (async () => { const m = await import('../seed/paru-soal.mjs'); return m.PARU; })();
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
(async () => {
  const PB = 'http://127.0.0.1:8090';
  const auth = await (await fetch(PB + '/api/collections/users/auth-with-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identity: 'nadia.putri', password: 'rahasia-demo-1' }) })).json();
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DPR, locale: 'id-ID', hasTouch: false });
  await ctx.addInitScript((a) => {
    try { localStorage.setItem('pocketbase_auth', JSON.stringify({ token: a.token, record: a.record })); } catch (e) {}
    const css = '*{scrollbar-width:none!important}::-webkit-scrollbar{display:none!important}#__cur{position:fixed;left:0;top:0;width:0;height:0;z-index:2147483647;pointer-events:none}#__cur .dot{position:absolute;left:-17px;top:-17px;width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,.55);border:3px solid #0A3830;box-shadow:0 2px 8px rgba(0,0,0,.35)}#__cur .ring{position:absolute;left:-30px;top:-30px;width:60px;height:60px;border-radius:50%;border:4px solid #F8C038;opacity:0}';
    const mk = () => { if (document.getElementById('__cur')) return; const st = document.createElement('style'); st.textContent = css; document.documentElement.appendChild(st); const c = document.createElement('div'); c.id = '__cur'; c.innerHTML = '<div class="ring"></div><div class="dot"></div>'; document.documentElement.appendChild(c); window.__cur = (x, y, ring) => { c.style.transform = `translate(${x}px,${y}px)`; const r = c.querySelector('.ring'); r.style.opacity = ring >= 0 ? 0.95 * (1 - ring) : 0; r.style.transform = `scale(${0.4 + 1.2 * Math.max(0, ring)})`; }; window.__cur(+sessionStorage.__cx || 400, +sessionStorage.__cy || 700, -1); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mk); else mk();
  }, auth);
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log('pageerror', e.message));
  let cx = 400, cy = 700, n = 0, ringT = -1, dir = OUT;
  const frame = async () => {
    await p.evaluate(({ x, y, r }) => { for (const a of document.getAnimations()) { if (a.playState === 'running') a.pause(); a.currentTime = (+a.currentTime || 0) + 33.3; } try { sessionStorage.__cx = x; sessionStorage.__cy = y; } catch (e) {} if (window.__cur) window.__cur(x, y, r); }, { x: cx, y: cy, r: ringT });
    await p.screenshot({ path: path.join(dir, `f${String(n++).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 88 });
    if (ringT >= 0) { ringT += 1 / 12; if (ringT >= 1) ringT = -1; }
  };
  const hold = async (k) => { for (let i = 0; i < k; i++) await frame(); };
  const moveTo = async (tx, ty, k) => { const sx = cx, sy = cy; for (let i = 1; i <= k; i++) { const e = ease(i / k); cx = sx + (tx - sx) * e; cy = sy + (ty - sy) * e - Math.sin(Math.PI * e) * 6; await frame(); } };
  const clickAt = async (tx, ty, wait = 8) => { await p.mouse.move(tx, ty); await p.mouse.down(); await p.mouse.up(); ringT = 0; await p.waitForTimeout(450); for (let i = 0; i < wait; i++) await frame(); };
  const cen = async (loc) => { const bb = await loc.first().boundingBox(); if (!bb) throw new Error('elemen tidak ketemu'); return [bb.x + bb.width / 2, bb.y + bb.height / 2]; };
  const tap = async (loc, k = 12, wait = 8) => { const [x, y] = await cen(loc); await moveTo(x, y, k); await clickAt(x, y, wait); };
  const scrollBy = async (dy, k) => { await p.mouse.move(cx, cy); for (let i = 0; i < k; i++) { await p.mouse.wheel(0, dy / k); await frame(); } };
  const scrollEase = async (dy, k) => { await p.mouse.move(cx, cy); let prev = 0; for (let i = 1; i <= k; i++) { const e = ease(i / k) * dy; await p.mouse.wheel(0, e - prev); prev = e; await frame(); } };
  const imgReady = () => p.waitForFunction(() => { const im = [...document.images].filter((i) => i.src.includes('googleusercontent') && i.getBoundingClientRect().top < 900 && i.getBoundingClientRect().bottom > 0); return im.every((i) => i.complete && i.naturalWidth > 0); }, null, { timeout: 8000 }).catch(() => console.log('gambar belum siap'));
  const start = async (name) => { dir = path.join(OUT, name); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true }); n = 0; };
  const goto = async (url) => { await p.goto('http://127.0.0.1:3000' + url, { waitUntil: 'networkidle' }); await p.waitForTimeout(900); };
  const want = (k) => !ONLY.length || ONLY.includes(k);
  const row = () => p.locator('.chapter-row', { hasText: BAB });
  // gulir halaman instan sampai BAB target muncul di sekitar y = 360 (awal klip, tanpa terekam)
  const toRow = async () => { await p.evaluate((t) => { const r = [...document.querySelectorAll('.chapter-row')].find((e) => e.textContent.includes(t)); if (r) window.scrollTo({ top: window.scrollY + r.getBoundingClientRect().top - 330, behavior: 'instant' }); }, BAB); await p.waitForTimeout(500); };
  const optCenter = async (letter) => p.evaluate((L) => { const e = [...document.querySelectorAll('button,label,[role=radio]')].find((x) => new RegExp('^' + L + '[^a-z]|^' + L + '[A-Z. ]').test(x.textContent.trim()) && x.getBoundingClientRect().height > 36 && x.getBoundingClientRect().width > 200); if (!e) return null; const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }, letter);
  const pickOpt = async (letter, wait = 8) => { const o = await optCenter(letter); if (!o) throw new Error('opsi ' + letter + ' tidak ketemu'); await moveTo(o[0], o[1], 10); await clickAt(o[0], o[1], wait); };
  // jawab soal yang tampil: benar bila ok = true, salah bila false (kunci diambil dari bank soal contoh yang sama dengan data uji)
  const answerNow = async (ok, wait = 6) => {
    const bank = await BANK; const body = await p.evaluate(() => document.body.innerText);
    const q = bank.find((x) => body.includes(x.text.slice(0, 40))); if (!q) throw new Error('soal tidak dikenal');
    const opt = ok ? q.options.find((o) => o.correct) : q.options.filter((o) => !o.correct)[0];
    const pos = await p.evaluate((txt) => { const e = [...document.querySelectorAll('button,label,[role=radio]')].find((x) => x.getBoundingClientRect().height > 36 && x.getBoundingClientRect().width > 200 && x.textContent.trim().endsWith(txt)); if (!e) return null; const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }, opt.text);
    if (!pos) throw new Error('opsi tidak ketemu: ' + opt.text);
    await moveTo(pos[0], pos[1], 9); await clickAt(pos[0], pos[1], wait);
  };
  const openPractice = async () => { await tap(row(), 14, 10); await p.waitForSelector('.choice-card', { timeout: 8000 }); await hold(6); await tap(p.locator('.choice-card').nth(2), 12, 10); await p.waitForSelector('.mode-choice'); await hold(8); };
  const mulai = () => p.getByRole('button', { name: /^Mulai \d+ soal/ });

  const openDialog = async () => { await goto('/mata-kuliah/anatomi'); await toRow(); await row().first().click(); await p.waitForSelector('.choice-card'); await p.waitForTimeout(700); cx = 400; cy = 330; };   // tanpa bingkai
  // ---- 1. daftar mata kuliah -> ketuk Anatomi
  if (want('mk')) {
    await start('mk'); await goto('/mata-kuliah'); cx = 440; cy = 760;
    await hold(6); await tap(p.locator('a[href="/mata-kuliah/anatomi"]'), 10, 4); await p.waitForTimeout(800); await hold(6);
    console.log('mk', n);
  }
  // ---- 2. daftar BAB Anatomi -> ketuk "Anatomi Paru & Saluran Napas" -> dialog langkah (Materi / Flashcard / Latihan soal)
  if (want('bab')) {
    await start('bab'); await goto('/mata-kuliah/anatomi'); await toRow(); cx = 440; cy = 760;
    await hold(6); await tap(row(), 10, 4); await p.waitForSelector('.choice-card'); await hold(12);
    console.log('bab', n);
  }
  // ---- 3. Belajar materi: halaman materi -> gulir sampai gambar pertama ("Gambar 1")
  if (want('materi')) {
    await openDialog(); await start('materi');
    await hold(4); await tap(p.locator('.choice-card').nth(0), 8, 5); await p.waitForTimeout(1200); await hold(12); console.log('materi halaman @', n);
    await scrollEase(2780, 50); await p.waitForTimeout(400); await imgReady(); console.log('materi gambar @', n); await hold(30);
    console.log('materi', n);
  }
  // ---- 4. Flashcard: kartu 1 (depan -> balik -> Hafal) lalu kartu 2 muncul
  if (want('flash')) {
    await openDialog(); await start('flash');
    await hold(4); await tap(p.locator('.choice-card').nth(1), 8, 5); await p.waitForTimeout(1200); await hold(10); console.log('flash halaman @', n);
    const flip = p.locator('text=Ketuk untuk melihat jawaban'); await tap(flip, 8, 6); await hold(22); console.log('flash terbalik @', n);
    await tap(p.getByRole('button', { name: 'Hafal', exact: true }), 8, 5); await p.waitForTimeout(500); await hold(12);
    console.log('flash', n);
  }
  // ---- 5. Latihan soal: dialog sesi -> mulai -> jawab (salah) -> Cek jawaban -> pembahasan
  if (want('soal')) {
    await openDialog(); await start('soal');
    await hold(4); await tap(p.locator('.choice-card').nth(2), 8, 5); await p.waitForSelector('.mode-choice'); await hold(12); console.log('soal dialog @', n);
    await tap(mulai(), 8, 6); await p.waitForTimeout(1000); await hold(12); console.log('soal tampil @', n);
    await answerNow(false, 6); console.log('soal dijawab @', n);
    await tap(p.getByRole('button', { name: /Cek jawaban/ }).first(), 8, 10); await p.waitForTimeout(600); await hold(10); console.log('soal pembahasan @', n);
    await scrollEase(330, 26); await hold(26);
    console.log('soal', n);
  }
  await b.close();
})().catch((e) => { console.log('GAGAL', e.message); process.exit(1); });

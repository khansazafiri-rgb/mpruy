// Rekam web MEDCOEL ASLI untuk video promo "Satu bab dulu" (viewport 720 x 1280 CSS, skala 1,5 = 1080 x 1920 px, 30 fps).
// Akun demo lokal + data uji (video/tab-dua-puluh/seed; bukan produksi). Deterministik: animasi CSS di-step 33,3 ms per bingkai, ketukan jari digambar di halaman.
// node web.cjs <folder-keluaran> [klip ...]   klip: pilih materi flashcard latihan beranda
// Butuh PocketBase (8090) + Vite (3000): lihat siapkan.sh.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const OUT = process.argv[2] || path.join(__dirname, 'web');
const ONLY = process.argv.slice(3);
const W = 720, H = 1280, DPR = 1.5;
const BAB = 'Ekstremitas Atas';
const BANK = (async () => { const m = await import('../../tab-dua-puluh/seed/questions.mjs'); return [...m.EKSTREMITAS_ATAS, ...m.OSTEOLOGI]; })();
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
(async () => {
  const PB = 'http://127.0.0.1:8090';
  const auth = await (await fetch(PB + '/api/collections/users/auth-with-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identity: 'nadia.putri', password: 'rahasia-demo-1' }) })).json();
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DPR, locale: 'id-ID', hasTouch: false });
  await ctx.addInitScript((a) => {
    try { localStorage.setItem('pocketbase_auth', JSON.stringify({ token: a.token, record: a.record })); } catch (e) {}
    const css = '*{scrollbar-width:none!important}::-webkit-scrollbar{display:none!important}#__cur{position:fixed;left:0;top:0;width:0;height:0;z-index:2147483647;pointer-events:none}#__cur .dot{position:absolute;left:-19px;top:-19px;width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,.55);border:3px solid #0A3830;box-shadow:0 2px 8px rgba(0,0,0,.35)}#__cur .ring{position:absolute;left:-34px;top:-34px;width:68px;height:68px;border-radius:50%;border:4px solid #F8C038;opacity:0}';
    const mk = () => { if (document.getElementById('__cur')) return; const st = document.createElement('style'); st.textContent = css; document.documentElement.appendChild(st); const c = document.createElement('div'); c.id = '__cur'; c.innerHTML = '<div class="ring"></div><div class="dot"></div>'; document.documentElement.appendChild(c); window.__cur = (x, y, ring) => { c.style.transform = `translate(${x}px,${y}px)`; const r = c.querySelector('.ring'); r.style.opacity = ring >= 0 ? 0.95 * (1 - ring) : 0; r.style.transform = `scale(${0.4 + 1.2 * Math.max(0, ring)})`; }; window.__cur(+sessionStorage.__cx || 560, +sessionStorage.__cy || 900, -1); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mk); else mk();
  }, auth);
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log('pageerror', e.message));
  let cx = 560, cy = 900, n = 0, ringT = -1, dir = OUT, clip = '';
  const CUES = fs.existsSync(path.join(__dirname, 'cues.json')) ? JSON.parse(fs.readFileSync(path.join(__dirname, 'cues.json'))) : {};
  const frame = async () => {
    await p.evaluate(({ x, y, r }) => { for (const a of document.getAnimations()) { if (a.playState === 'running') a.pause(); a.currentTime = (+a.currentTime || 0) + 33.3; } try { sessionStorage.__cx = x; sessionStorage.__cy = y; } catch (e) {} if (window.__cur) window.__cur(x, y, r); }, { x: cx, y: cy, r: ringT });
    await p.screenshot({ path: path.join(dir, `f${String(n++).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 90 });
    if (ringT >= 0) { ringT += 1 / 9; if (ringT >= 1) ringT = -1; }
  };
  const hold = async (k) => { for (let i = 0; i < k; i++) await frame(); };
  const moveTo = async (tx, ty, k) => { const sx = cx, sy = cy; for (let i = 1; i <= k; i++) { const e = ease(i / k); cx = sx + (tx - sx) * e; cy = sy + (ty - sy) * e - Math.sin(Math.PI * e) * 8; await frame(); } };
  const clickAt = async (tx, ty, wait = 6) => { await p.mouse.move(tx, ty); await p.mouse.down(); await p.mouse.up(); ringT = 0; (CUES[clip] = CUES[clip] || []).push(n); await p.waitForTimeout(450); for (let i = 0; i < wait; i++) await frame(); };
  const cen = async (loc) => { const bb = await loc.first().boundingBox(); if (!bb) throw new Error('elemen tidak ketemu'); return [bb.x + bb.width / 2, bb.y + bb.height / 2]; };
  const tap = async (loc, k = 10, wait = 6) => { const [x, y] = await cen(loc); await moveTo(x, y, k); await clickAt(x, y, wait); };
  const scrollBy = async (dy, k) => { await p.mouse.move(cx, cy); for (let i = 0; i < k; i++) { await p.mouse.wheel(0, dy / k); await frame(); } };
  const start = async (name) => { clip = name; CUES[name] = []; dir = path.join(OUT, name); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true }); n = 0; };
  const goto = async (url) => { await p.goto('http://127.0.0.1:3000' + url, { waitUntil: 'networkidle' }); await p.waitForTimeout(900); };
  const want = (k) => !ONLY.length || ONLY.includes(k);
  const row = () => p.locator('.chapter-row', { hasText: BAB });
  const toRow = async (y = 380) => { await p.evaluate(([t, yy]) => { const r = [...document.querySelectorAll('.chapter-row')].find((e) => e.textContent.includes(t)); if (r) window.scrollTo({ top: window.scrollY + r.getBoundingClientRect().top - yy, behavior: 'instant' }); }, [BAB, y]); await p.waitForTimeout(500); };
  const openDialog = async () => { await row().first().click(); await p.waitForSelector('.choice-card', { timeout: 8000 }); await p.waitForTimeout(900); };   // tanpa terekam
  const optCenter = async (letter) => p.evaluate((L) => { const e = [...document.querySelectorAll('button,label,[role=radio]')].find((x) => new RegExp('^' + L + '[^a-z]|^' + L + '[A-Z. ]').test(x.textContent.trim()) && x.getBoundingClientRect().height > 36 && x.getBoundingClientRect().width > 200); if (!e) return null; const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }, letter);
  const pickOpt = async (letter, wait = 8) => { const o = await optCenter(letter); if (!o) throw new Error('opsi ' + letter + ' tidak ketemu'); await moveTo(o[0], o[1], 9); await clickAt(o[0], o[1], wait); };
  const mulai = () => p.getByRole('button', { name: /^Mulai \d+ soal/ });

  // ---- 1. pilih mata kuliah -> Anatomi -> daftar BAB -> ketuk satu BAB -> dialog 3 langkah
  if (want('pilih')) {
    await start('pilih'); await goto('/mata-kuliah'); cx = 560; cy = 980;
    await hold(5); await tap(p.locator('a[href="/mata-kuliah/anatomi"]'), 11, 5); await p.waitForTimeout(900); await hold(5);
    const top = await p.evaluate((t) => { const r = [...document.querySelectorAll('.chapter-row')].find((e) => e.textContent.includes(t)); return r.getBoundingClientRect().top; }, BAB);
    await scrollBy(top - 420, 18); await hold(3);
    await tap(row(), 10, 8); await p.waitForSelector('.choice-card'); await hold(14);
    console.log('pilih', n);
  }
  // ---- 2. Belajar materi
  if (want('materi')) {
    await start('materi'); await goto('/mata-kuliah/anatomi'); await toRow(); await openDialog(); cx = 360; cy = 640;
    await hold(2); await tap(p.locator('.choice-card').nth(0), 9, 6); await p.waitForTimeout(1100); await hold(8);
    await scrollBy(380, 30); await hold(6); await scrollBy(380, 30); await hold(4);
    console.log('materi', n);
  }
  // ---- 3. Flashcard
  if (want('flashcard')) {
    await start('flashcard'); await goto('/mata-kuliah/anatomi'); await toRow(); await openDialog(); cx = 360; cy = 640;
    await hold(2); await tap(p.locator('.choice-card').nth(1), 9, 6); await p.waitForTimeout(1100); await hold(8);
    await tap(p.getByRole('button', { name: /Lihat jawaban/ }), 10, 12); await hold(14);
    console.log('flashcard', n);
  }
  // ---- 4. Latihan soal: dialog sesi -> mulai -> jawab -> Cek jawaban -> pembahasan
  if (want('latihan')) {
    await start('latihan'); await goto('/mata-kuliah/anatomi'); await toRow(); await openDialog(); cx = 360; cy = 640;
    await hold(2); await tap(p.locator('.choice-card').nth(2), 9, 4); await p.waitForSelector('.mode-choice'); await hold(10);
    await tap(mulai(), 10, 10); await p.waitForTimeout(1000); await hold(8);
    await pickOpt('A', 8);
    await tap(p.getByRole('button', { name: /Cek jawaban/ }).first(), 9, 14); await p.waitForTimeout(600); await hold(10);
    await scrollBy(420, 36); await hold(10); await scrollBy(420, 36); await hold(12);
    console.log('latihan', n);
  }
  // ---- 5. beranda web (landing) untuk penutup
  if (want('beranda')) {
    await start('beranda'); await goto('/'); cx = -200; cy = -200;
    await hold(50); await scrollBy(220, 70); await hold(110);
    console.log('beranda', n);
  }
  fs.writeFileSync(path.join(__dirname, 'cues.json'), JSON.stringify(CUES));
  await b.close();
})().catch((e) => { console.log('GAGAL', e.message); process.exit(1); });

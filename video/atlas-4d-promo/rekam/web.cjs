// Rekam web MEDCOEL ASLI (tampilan ponsel 540 x 900 CSS, skala 2 = 1080 x 1800 px) untuk video promo "Besok ujian blok".
// Akun demo lokal (data uji dari video/tab-dua-puluh/seed; bukan produksi). Deterministik: animasi CSS di-step 33,3 ms per bingkai (30 fps), ketukan jari digambar di halaman.
// node web.cjs <folder-keluaran> [klip ...]   klip: mk bab materi latihan learning ujian salah akhir
// Butuh PocketBase (8090) + Vite (3000): lihat siapkan.sh. Urutan penting: `ujian` dulu, baru `salah` (soal salah muncul setelah sesi ujian).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const OUT = process.argv[2] || path.join(__dirname, 'web');
const ONLY = process.argv.slice(3);
const W = 540, H = 900, DPR = 2;
const BAB = 'Ekstremitas Atas';   // BAB berisi materi + flashcard + 20 soal pada data uji
const BANK = (async () => [])();
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

  // ---- 1. pilih mata kuliah: daftar mata kuliah -> Anatomi -> halaman BAB
  if (want('mk')) {
    await start('mk'); await goto('/mata-kuliah'); cx = 420; cy = 760;
    await hold(14); await scrollBy(240, 14); await hold(4);
    await tap(p.locator('a[href="/mata-kuliah/anatomi"]'), 16, 16); await p.waitForTimeout(900); await hold(10);
    console.log('mk', n);
  }
  // ---- 2. daftar BAB (ada Materi, Flashcard, jumlah soal) -> ketuk BAB
  if (want('bab')) {
    await start('bab'); await goto('/mata-kuliah/anatomi'); cx = 420; cy = 760;
    await hold(8); await scrollBy(560, 26); await hold(6); await toRow(); await hold(8);
    await tap(row(), 14, 10); await p.waitForSelector('.choice-card'); await hold(18);
    console.log('bab', n);
  }
  // ---- 3. materi per BAB
  if (want('materi')) {
    await start('materi'); await goto('/mata-kuliah/anatomi'); await toRow(); cx = 420; cy = 760;
    await hold(4); await tap(row(), 12, 8); await p.waitForSelector('.choice-card'); await hold(6);
    await tap(p.locator('.choice-card').nth(0), 12, 10); await p.waitForTimeout(1100); await hold(12);
    await scrollBy(420, 36); await hold(8); await scrollBy(420, 36); await hold(6);
    console.log('materi', n);
  }
  // ---- 4. latihan soal dari BAB yang sama: dialog "Siapkan sesi belajarmu" (Mode Learning terpilih)
  if (want('latihan')) {
    await start('latihan'); await goto('/mata-kuliah/anatomi'); await toRow(); cx = 420; cy = 760;
    await hold(4); await openPractice(); await hold(22);
    console.log('latihan', n);
  }
  // ---- 5. Mode Learning: mulai, jawab (salah), Cek jawaban -> pembahasan per soal
  if (want('learning')) {
    await start('learning'); await goto('/mata-kuliah/anatomi'); await toRow(); cx = 420; cy = 760;
    await hold(3); await openPractice(); await hold(6);
    await tap(mulai(), 14, 14); await p.waitForTimeout(1000); await hold(10);
    await pickOpt('A', 10);
    await tap(p.getByRole('button', { name: /Cek jawaban/ }).first(), 12, 18); await p.waitForTimeout(600); await hold(12);
    await scrollBy(420, 34); await hold(14);
    console.log('learning', n);
  }
  // ---- 6. Mode ujian: pilih Mode ujian, mulai, jawab beberapa soal, selesai -> pembahasan setelah sesi
  if (want('ujian')) {
    await start('ujian'); await goto('/mata-kuliah/anatomi'); await toRow(); cx = 420; cy = 760;
    await hold(3); await openPractice(); await hold(4);
    await tap(p.locator('.mode-choice', { hasText: 'Mode ujian' }), 12, 16);
    await tap(mulai(), 14, 14); await p.waitForTimeout(1000); await hold(10);
    const plan = [true, false, true, true, false, true, true, true, false, true];   // 7 benar, 3 salah
    for (let i = 0; i < plan.length; i++) { await answerNow(plan[i], 5); if (i < plan.length - 1) { await tap(p.getByRole('button', { name: /Berikutnya/ }).first(), 9, 5); await p.waitForTimeout(250); } }
    await tap(p.getByRole('button', { name: /^Selesai/ }).first(), 12, 10); await p.waitForSelector('text=Ya, selesai');
    await hold(14); await tap(p.getByRole('button', { name: /Ya, selesai/ }), 12, 10);
    await p.waitForTimeout(1500); await hold(18); await scrollBy(520, 40); await hold(10); await scrollBy(520, 40); await hold(8);
    console.log('ujian', n, p.url());
  }
  // ---- 7. kembali ke soal yang salah: Riwayat -> Soal salah -> Latih ulang
  if (want('salah')) {
    await start('salah'); await goto('/riwayat?tab=salah'); cx = 420; cy = 760;
    await hold(16); await scrollBy(420, 34); await hold(10); await p.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' })); await p.waitForTimeout(400); await hold(6);
    await tap(p.getByRole('button', { name: /Latih ulang/ }), 14, 14); await p.waitForTimeout(1200); await hold(16);
    console.log('salah', n, p.url());
  }
  // ---- 8. bagian yang perlu diulang: BAB menampilkan "N pernah salah"
  if (want('bab2')) {
    await start('bab2'); await goto('/mata-kuliah/anatomi'); await toRow(); cx = 420; cy = 760;
    await hold(28);
    console.log('bab2', n);
  }
  // ---- 9. satu langkah jelas: pilih satu BAB -> Latihan soal -> mulai
  if (want('akhir')) {
    await start('akhir'); await goto('/mata-kuliah/anatomi'); await toRow(); cx = 420; cy = 760;
    await hold(6); await openPractice(); await hold(4);
    await tap(mulai(), 14, 14); await p.waitForTimeout(1000); await hold(14);
    console.log('akhir', n);
  }
  // ---- Simulasi Dokter (halaman web asli): pilih poli, mulai, dialog pasien, pilih keluhan/pertanyaan
  if (want('sim')) {
    await start('sim'); await goto('/simulasi-dokter'); cx = 420; cy = 760;
    await p.waitForSelector('text=Mau jaga di poli apa'); await hold(14);
    await tap(p.getByRole('button', { name: /Umum/ }).first(), 14, 12);
    await tap(p.getByRole('button', { name: /Mulai di/ }), 12, 14);
    await p.waitForSelector('.sim-dialog'); await p.waitForTimeout(800); await hold(20);
    await tap(p.locator('.sim-dialog'), 10, 14); await hold(14);
    const kel = p.getByText('Keluhan utama', { exact: true }); if (await kel.count()) { await tap(kel, 12, 12); await hold(8); }
    const qq = p.locator('.sim-opt').first(); if (await qq.count()) { await tap(qq, 12, 14); await hold(24); }
    console.log('sim', n);
  }
  await b.close();
})().catch((e) => { console.log('GAGAL', e.message); process.exit(1); });

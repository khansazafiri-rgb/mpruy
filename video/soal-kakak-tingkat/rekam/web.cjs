// Rekam halaman web MEDCOEL asli (akun demo lokal, data uji) untuk video "Soal kakak tingkat": Chat Admin di tampilan HP.
// Viewport HP 430 x 932, skala 2,4. Deterministik 30 fps; jari/kursor digambar di halaman (cincin kuning saat mengetuk).
// node web.cjs <folder-keluaran> [klip ...]   klip: alur (menu -> Upload PDF -> pilihan -> unggah -> ringkasan -> kirim -> status) | tanya (kirim pesan ke admin)
// Butuh PocketBase (8090, seed video/tab-dua-puluh/seed) dan Vite (3000). Berkas contoh: "Soal UTS Anatomi 2025.pdf" (soal buatan untuk demo, bukan soal ujian sungguhan).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const OUT = process.argv[2] || path.join(__dirname, 'web');
const ONLY = process.argv.slice(3);
const W = 430, H = 932, DPR = 2.4;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
(async () => {
  const PB = 'http://127.0.0.1:8090';
  const auth = await (await fetch(PB + '/api/collections/users/auth-with-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identity: 'nadia.putri', password: 'rahasia-demo-1' }) })).json();
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DPR, locale: 'id-ID', hasTouch: false });
  await ctx.addInitScript((a) => {
    try { localStorage.setItem('pocketbase_auth', JSON.stringify({ token: a.token, record: a.record })); } catch (e) {}
    const css = '*{scrollbar-width:none!important}::-webkit-scrollbar{display:none!important}#__cur{position:fixed;left:0;top:0;width:0;height:0;z-index:2147483647;pointer-events:none}#__cur .dot{position:absolute;left:-9px;top:-9px;width:18px;height:18px;border-radius:50%;background:rgba(10,56,48,.35);border:3px solid #fff;opacity:.9}#__cur .ring{position:absolute;left:-30px;top:-30px;width:60px;height:60px;border-radius:50%;border:4px solid #F8C038;background:rgba(248,192,56,.30);opacity:0}';
    const mk = () => { if (document.getElementById('__cur')) return; const st = document.createElement('style'); st.textContent = css; document.documentElement.appendChild(st); const c = document.createElement('div'); c.id = '__cur'; c.innerHTML = '<div class="ring"></div><div class="dot"></div>'; document.documentElement.appendChild(c); window.__cur = (x, y, ring) => { c.style.transform = `translate(${x}px,${y}px)`; const r = c.querySelector('.ring'); r.style.opacity = ring > 0 ? 0.95 * (1 - ring) : 0; r.style.transform = `scale(${0.35 + 1.15 * ring})`; }; window.__cur(+sessionStorage.__cx || 200, +sessionStorage.__cy || 700, 0); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mk); else mk();
  }, auth);
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log('pageerror', e.message));
  let cx = 220, cy = 760, n = 0, ringT = -1, dir = OUT; const marks = {};
  const frame = async () => {
    await p.evaluate(({ x, y, r }) => { for (const a of document.getAnimations()) { if (a.playState === 'running') a.pause(); a.currentTime = (+a.currentTime || 0) + 33.3; } try { sessionStorage.__cx = x; sessionStorage.__cy = y; } catch (e) {} if (window.__cur) window.__cur(x, y, r); }, { x: cx, y: cy, r: ringT >= 0 ? ringT : -1 });
    await p.screenshot({ path: path.join(dir, `f${String(n++).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 88 });
    if (ringT >= 0) { ringT += 1 / 12; if (ringT >= 1) ringT = -1; }
  };
  const hold = async (k) => { for (let i = 0; i < k; i++) await frame(); };
  const moveTo = async (tx, ty, k) => { const sx = cx, sy = cy; for (let i = 1; i <= k; i++) { const e = ease(i / k); cx = sx + (tx - sx) * e; cy = sy + (ty - sy) * e - Math.sin(Math.PI * e) * 8; await frame(); } };
  const clickAt = async (tx, ty, wait = 8) => { await p.mouse.move(tx, ty); await p.mouse.down(); await p.mouse.up(); await p.waitForTimeout(450); ringT = 0; for (let i = 0; i < wait; i++) await frame(); };
  const cen = async (loc) => { await loc.first().scrollIntoViewIfNeeded(); await p.waitForTimeout(120); const bb = await loc.first().boundingBox(); if (!bb) throw new Error('elemen tidak ketemu'); return [bb.x + bb.width / 2, bb.y + bb.height / 2]; };
  const tap = async (loc, k = 12, wait = 8) => { const [x, y] = await cen(loc); await moveTo(x, y, k); await clickAt(x, y, wait); };
  const mark = (name) => { marks[name] = n; };
  const start = async (name) => { dir = path.join(OUT, name); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true }); n = 0; for (const k of Object.keys(marks)) delete marks[k]; };
  const goto = async (url) => { await p.goto('http://127.0.0.1:3000' + url, { waitUntil: 'networkidle' }); await p.waitForTimeout(1000); };
  const chip = (name) => p.getByRole('button', { name, exact: false });
  const want = (k) => !ONLY.length || ONLY.includes(k);
  const list = async () => console.log('tombol:', JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('button,label,a')].filter((x) => x.getBoundingClientRect().height > 0).map((x) => x.textContent.trim().slice(0, 40)))));

  if (want('alur')) {
    await start('alur'); await goto('/chat-admin'); cx = 230; cy = 1000;
    mark('menu'); await hold(24);
    await tap(chip('Upload soal atau PPT materi'), 14, 14); mark('upload');
    await list();
    await p.waitForTimeout(700); await hold(10);
    await tap(chip('Anatomi').first(), 12, 12); mark('subject');
    await tap(chip('Soal (PDF soal)'), 12, 12); mark('kind');
    await tap(chip('Belum ada'), 12, 12); mark('hasKey');
    await tap(chip('Indonesia'), 12, 12); mark('language');
    await list();
    await p.waitForTimeout(300); mark('scope'); await hold(14);
    await tap(chip('General (semua pengguna)'), 12, 12); mark('scopeDone');
    await tap(p.getByRole('button', { name: '1', exact: true }), 12, 12); mark('count');
    await p.waitForSelector('input[type=file]', { state: 'attached' }); await hold(14);
    // pilih berkas lewat input file bawaan halaman (cincin mengetuk area "Pilih PDF")
    const drop = p.locator('.chat-drop'); const [dx, dy] = await cen(drop); await moveTo(dx, dy, 12); await clickAt(dx, dy, 6);
    await p.setInputFiles('input[type=file]', path.join(__dirname, 'Soal UTS Anatomi 2025.pdf')); mark('pickFile');
    await hold(26); await p.waitForSelector('.chat-file', { timeout: 10000 }); await hold(20); mark('fileOk');
    await tap(p.getByRole('button', { name: 'Lanjut ke ringkasan' }), 12, 14); mark('summary'); await hold(30);
    await tap(p.locator('input[type=checkbox]'), 12, 10); mark('agree');
    await tap(p.getByRole('button', { name: 'Kirim pengajuan' }), 12, 10); await p.waitForTimeout(1200); mark('sent'); await hold(40);
    await list();
    await tap(chip('Lihat status pengajuan'), 12, 12); await p.waitForTimeout(900); mark('status'); await hold(40);
    console.log('alur', n, JSON.stringify(marks));
    fs.writeFileSync(path.join(OUT, 'alur', 'marks.json'), JSON.stringify({ n, marks }));
  }
  if (want('tanya')) {
    await start('tanya'); await goto('/chat-admin'); cx = 230; cy = 1000; mark('menu'); await hold(14);
    await tap(chip('Tanya admin'), 14, 14); await p.waitForTimeout(600); mark('tanya'); await hold(18);
    await list();
    const box = p.locator('textarea, input[type=text]').first();
    const [bx, by] = await cen(box); await moveTo(bx, by, 12); await clickAt(bx, by, 4);
    const msg = 'Halo admin, soal UTS ini khusus kampus saya.';
    for (let i = 1; i <= msg.length; i++) { await box.fill(msg.slice(0, i)); if (i % 2 === 0 || i === msg.length) await frame(); }
    mark('typed'); await hold(14);
    const sendBtn = p.getByRole('button', { name: /kirim|send/i }).last(); await tap(sendBtn, 12, 12); await p.waitForTimeout(1200); mark('sentMsg'); await hold(40);
    console.log('tanya', n, JSON.stringify(marks));
    fs.writeFileSync(path.join(OUT, 'tanya', 'marks.json'), JSON.stringify({ n, marks }));
  }
  await b.close();
})();

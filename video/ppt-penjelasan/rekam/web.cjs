// Rekam halaman web MEDCOEL asli (akun demo lokal, data uji) untuk video "PPT penjelasan": pengajuan PPT materi di Chat Admin dan pembaca materi Drilling (tampilan HP).
// Viewport HP 430 x 932, skala 2,4. Deterministik 30 fps; jari/kursor digambar di halaman (cincin kuning saat mengetuk).
// node web.cjs <folder-keluaran> [klip ...]   klip: alur (menu -> Upload -> PPT materi -> unggah PDF -> ringkasan -> kirim -> status) | baca (Drilling -> Anatomi -> materi -> slide 1 dan penjelasannya -> slide 2)
// Butuh PocketBase (8090, seed video/tab-dua-puluh/seed + node siapkan.cjs) dan Vite (3000). Permintaan gambar lh3 dijawab dari rekam/slide/*.png (skema buatan).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const OUT = process.argv[2] || path.join(__dirname, 'web');
const ONLY = process.argv.slice(3);
const DEV = { tablet: { W: 820, H: 1100, DPR: 1.7, cursor: 'jari' }, laptop: { W: 1280, H: 800, DPR: 2, cursor: 'panah' } };
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
(async () => {
  const PB = 'http://127.0.0.1:8090';
  const auth = await (await fetch(PB + '/api/collections/users/auth-with-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identity: 'nadia.putri', password: 'rahasia-demo-1' }) })).json();
  const b = await chromium.launch();
  let ctx, p, W, H, DPR;
  const openDev = async (kind) => {
    if (ctx) await ctx.close();
    ({ W, H, DPR } = DEV[kind]); const cur = DEV[kind].cursor;
    ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DPR, locale: 'id-ID' });
    await ctx.route('https://lh3.googleusercontent.com/**', (route) => { const m = route.request().url().match(/SLIDEBAHU000(\d)/); if (!m) return route.abort(); route.fulfill({ status: 200, contentType: 'image/png', body: fs.readFileSync(path.join(__dirname, 'slide', `slide-${m[1]}.png`)) }); });
    await ctx.addInitScript((a) => {
      try { localStorage.setItem('pocketbase_auth', JSON.stringify({ token: a.token, record: a.record })); } catch (e) {}
      const css = '*{scrollbar-width:none!important}::-webkit-scrollbar{display:none!important}#__cur{position:fixed;left:0;top:0;width:0;height:0;z-index:2147483647;pointer-events:none}#__cur .dot{position:absolute;left:-9px;top:-9px;width:18px;height:18px;border-radius:50%;background:rgba(10,56,48,.35);border:3px solid #fff;opacity:.9}#__cur .ring{position:absolute;left:-30px;top:-30px;width:60px;height:60px;border-radius:50%;border:4px solid #F8C038;background:rgba(248,192,56,.30);opacity:0}#__cur svg{position:absolute;left:-3px;top:-2px;width:34px;height:40px;filter:drop-shadow(0 3px 4px rgba(10,56,48,.45))}';
      const mk = () => { if (document.getElementById('__cur')) return; const st = document.createElement('style'); st.textContent = css; document.documentElement.appendChild(st); const c = document.createElement('div'); c.id = '__cur'; c.innerHTML = '<div class="ring"></div>' + (a.cur === 'panah' ? '<svg viewBox="0 0 34 40"><path d="M3 2 L3 30 L10.5 23.5 L15.5 35.5 L21 33 L16 21.5 L26 21 Z" fill="#fff" stroke="#0A3830" stroke-width="2.6" stroke-linejoin="round"/></svg>' : '<div class="dot"></div>'); document.documentElement.appendChild(c); window.__cur = (x, y, ring) => { c.style.transform = `translate(${x}px,${y}px)`; const r = c.querySelector('.ring'); r.style.opacity = ring > 0 ? 0.95 * (1 - ring) : 0; r.style.transform = `scale(${0.35 + 1.15 * ring})`; }; window.__cur(+sessionStorage.__cx || 200, +sessionStorage.__cy || 700, 0); };
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mk); else mk();
    }, { ...auth, cur });
    p = await ctx.newPage(); p.on('pageerror', (e) => console.log('pageerror', e.message));
  };
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

  const scrollBy = async (dy, k) => { await p.mouse.move(cx, cy); for (let i = 0; i < k; i++) { await p.mouse.wheel(0, dy / k); await frame(); } };
  if (want('alur')) {
    await openDev('tablet'); await start('alur'); await goto('/chat-admin'); cx = 410; cy = 900;
    mark('menu'); await hold(24);
    await tap(chip('Upload soal atau PPT materi'), 14, 14); mark('upload');
    await p.waitForTimeout(700); await hold(8);
    await tap(chip('Anatomi').first(), 12, 12); mark('subject');
    await tap(chip('PPT materi (slide kuliah)'), 12, 8); mark('kind'); await hold(30);   // catatan nyata: ekspor PPT ke PDF dulu
    await list();
    await tap(chip('General (semua pengguna)'), 12, 12); mark('scope');
    await tap(p.getByRole('button', { name: '1', exact: true }), 12, 12); mark('count');
    await p.waitForSelector('input[type=file]', { state: 'attached' }); await hold(14);
    const drop = p.locator('.chat-drop'); const [dx, dy] = await cen(drop); await moveTo(dx, dy, 12); await clickAt(dx, dy, 6);
    await p.setInputFiles('input[type=file]', path.join(__dirname, 'Anatomi Sendi Bahu Kuliah 1.pdf')); mark('pickFile');
    await hold(26); await p.waitForSelector('.chat-file', { timeout: 10000 }); await hold(20); mark('fileOk');
    await tap(p.getByRole('button', { name: 'Lanjut ke ringkasan' }), 12, 14); mark('summary'); await hold(30);
    await tap(p.locator('input[type=checkbox]'), 12, 10); mark('agree');
    await tap(p.getByRole('button', { name: 'Kirim pengajuan' }), 12, 10); await p.waitForTimeout(1200); mark('sent'); await hold(40);
    await tap(chip('Lihat status pengajuan'), 12, 12); await p.waitForTimeout(900); mark('status'); await hold(40);
    console.log('alur', n, JSON.stringify(marks));
    fs.writeFileSync(path.join(OUT, 'alur', 'marks.json'), JSON.stringify({ n, marks }));
  }
  if (want('baca')) {
    await openDev('laptop'); await start('baca'); await goto('/drilling'); cx = 900; cy = 500; mark('drilling'); await hold(30);
    await tap(p.locator('a[href="/drilling/anatomi"]').first(), 14, 14); await p.waitForTimeout(900); mark('matkul'); await hold(24);
    await tap(p.locator('a[href*="/drilling/materi/"]').first(), 14, 14); await p.waitForSelector('.deck-frame img', { timeout: 10000 }); await p.waitForTimeout(900); mark('slide1'); await hold(30);
    await scrollBy(430, 40); mark('penjelasan1'); await hold(40);
    await scrollBy(300, 30); await hold(24);
    await p.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' })); await p.waitForTimeout(300); cx = 900; cy = 400; await hold(14); mark('top');
    await tap(p.getByRole('button', { name: 'Slide berikutnya' }), 12, 14); await p.waitForTimeout(700); mark('slide2'); await hold(30);
    await scrollBy(430, 40); mark('penjelasan2'); await hold(40);
    console.log('baca', n, JSON.stringify(marks));
    fs.writeFileSync(path.join(OUT, 'baca', 'marks.json'), JSON.stringify({ n, marks }));
  }
  await b.close();
})();

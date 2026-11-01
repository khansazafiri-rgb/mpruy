// Rekam halaman web MEDCOEL asli (catatan materi dan latihan soal), deterministik per bingkai 30 fps.
// Animasi CSS dimajukan 33,3 ms per bingkai; kursor digambar di halaman. Data: akun demo lokal (nadia.putri), PocketBase uji.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const OUT = process.argv[2] || path.join(__dirname, 'web');
const W = 600, H = 738, DPR = 1.6;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
(async () => {
  const PB = 'http://127.0.0.1:8090';
  const auth = await (await fetch(PB + '/api/collections/users/auth-with-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identity: 'nadia.putri', password: 'rahasia-demo-1' }) })).json();
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DPR, locale: 'id-ID' });
  await ctx.addInitScript((a) => {
    try { localStorage.setItem('pocketbase_auth', JSON.stringify({ token: a.token, record: a.record })); } catch (e) {}
    const css = '*{scrollbar-width:none!important}::-webkit-scrollbar{display:none!important}#__cur{position:fixed;left:0;top:0;width:0;height:0;z-index:2147483647;pointer-events:none}#__cur svg{position:absolute;left:-3px;top:-2px;width:34px;height:40px;filter:drop-shadow(0 3px 4px rgba(10,56,48,.45))}#__cur .ring{position:absolute;left:-26px;top:-26px;width:52px;height:52px;border-radius:50%;border:4px solid #F8C038;background:rgba(248,192,56,.28);opacity:0}';
    const mk = () => { if (document.getElementById('__cur')) return; const st = document.createElement('style'); st.textContent = css; document.documentElement.appendChild(st); const c = document.createElement('div'); c.id = '__cur'; c.innerHTML = '<div class="ring"></div><svg viewBox="0 0 34 40"><path d="M3 2 L3 30 L10.5 23.5 L15.5 35.5 L21 33 L16 21.5 L26 21 Z" fill="#fff" stroke="#0A3830" stroke-width="2.6" stroke-linejoin="round"/></svg>'; document.documentElement.appendChild(c); window.__cur = (x, y, ring) => { c.style.transform = `translate(${x}px,${y}px)`; const r = c.querySelector('.ring'); r.style.opacity = ring > 0 ? 0.95 * (1 - ring) : 0; r.style.transform = `scale(${0.35 + 1.15 * ring})`; }; window.__cur(+sessionStorage.__cx || 480, +sessionStorage.__cy || 640, 0); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mk); else mk();
  }, auth);
  const p = await ctx.newPage();
  let cx = 480, cy = 640, n = 0, ringT = -1;
  const frame = async (dir) => {
    await p.evaluate(({ x, y, r }) => { for (const a of document.getAnimations()) { if (a.playState === 'running') a.pause(); a.currentTime = (+a.currentTime || 0) + 33.3; } try { sessionStorage.__cx = x; sessionStorage.__cy = y; } catch (e) {} if (window.__cur) window.__cur(x, y, r); }, { x: cx, y: cy, r: ringT >= 0 ? ringT : -1 });
    await p.screenshot({ path: path.join(dir, `f${String(n++).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 90 });
    if (ringT >= 0) { ringT += 1 / 14; if (ringT >= 1) ringT = -1; }
  };
  const hold = async (dir, k) => { for (let i = 0; i < k; i++) await frame(dir); };
  const rectOf = (fn, arg) => p.evaluate(fn, arg);
  const moveTo = async (dir, tx, ty, k) => { const sx = cx, sy = cy; for (let i = 1; i <= k; i++) { const e = ease(i / k); cx = sx + (tx - sx) * e; cy = sy + (ty - sy) * e - Math.sin(Math.PI * e) * 8; await frame(dir); } };
  const clickAt = async (dir, tx, ty, wait = 8) => { await p.mouse.move(tx, ty); await p.mouse.down(); await p.mouse.up(); await p.waitForTimeout(500); ringT = 0; for (let i = 0; i < wait; i++) await frame(dir); };
  const centerOf = async (finder, arg) => { const r = await p.evaluate(finder, arg); if (!r) throw new Error('elemen tidak ketemu: ' + finder); return [r[0] + r[2] / 2, r[1] + r[3] / 2]; };
  const rowFinder = (t) => { const e = [...document.querySelectorAll('.chapter-row')].find((x) => x.textContent.includes(t)); if (!e) return null; const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; };
  const btnFinder = (t) => { const e = [...document.querySelectorAll('button')].find((x) => x.textContent.includes(t) && x.getBoundingClientRect().height > 0); if (!e) return null; const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; };

  // ---- klip 1: catatan materi (pilih BAB Osteologi -> Belajar materi -> gulir)
  const d1 = path.join(OUT, 'materi'); fs.rmSync(d1, { recursive: true, force: true }); fs.mkdirSync(d1, { recursive: true }); n = 0;
  await p.goto('http://127.0.0.1:3000/mata-kuliah/anatomi', { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
  await p.mouse.move(300, 400); await p.mouse.wheel(0, 1050); await p.waitForTimeout(700);
  await hold(d1, 6);
  const ostRow = await centerOf(rowFinder, 'Osteologi');
  await moveTo(d1, ostRow[0] + 40, ostRow[1] + 8, 18); await clickAt(d1, ostRow[0] + 40, ostRow[1] + 8, 14);
  await p.waitForSelector('.choice-card', { timeout: 8000 });
  const bm = await centerOf(btnFinder, 'Belajar materi');
  await moveTo(d1, bm[0], bm[1], 14); await hold(d1, 2); await clickAt(d1, bm[0], bm[1], 16);
  await p.waitForTimeout(600); await hold(d1, 10);
  await p.mouse.move(300, 420);
  for (let i = 0; i < 40; i++) { await p.mouse.wheel(0, 14); cx += 0; await frame(d1); }
  console.log('materi', n, 'bingkai', p.url());

  // ---- klip 2: latihan soal (BAB Osteologi -> Latihan soal -> Mulai -> soal)
  const d2 = path.join(OUT, 'soal'); fs.rmSync(d2, { recursive: true, force: true }); fs.mkdirSync(d2, { recursive: true }); n = 0;
  await p.goto('http://127.0.0.1:3000/mata-kuliah/anatomi', { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
  await p.mouse.move(300, 400); await p.mouse.wheel(0, 1050); await p.waitForTimeout(700);
  cx = 480; cy = 640; await hold(d2, 4);
  const ostRow2 = await centerOf(rowFinder, 'Osteologi');
  await moveTo(d2, ostRow2[0] + 40, ostRow2[1] + 8, 14); await clickAt(d2, ostRow2[0] + 40, ostRow2[1] + 8, 12);
  console.log('kartu:', JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('.choice-card')].map((x) => x.textContent.trim().slice(0, 60) + '|h=' + Math.round(x.getBoundingClientRect().height) + '|dis=' + x.disabled))));
  await p.waitForSelector('.choice-card', { timeout: 8000 });
  await p.evaluate(() => [...document.querySelectorAll('.choice-card')][2].scrollIntoView({ block: 'center', behavior: 'instant' })); await p.waitForTimeout(400); await hold(d2, 4);
  const ls = await centerOf(btnFinder, 'Latihan soal');
  await moveTo(d2, ls[0], ls[1], 12); await hold(d2, 2); await clickAt(d2, ls[0], ls[1], 12);
  await p.waitForTimeout(800); console.log('tombol2:', JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('button')].filter((x) => x.getBoundingClientRect().height > 0 && !/^\d\d/.test(x.textContent.trim())).map((x) => x.textContent.trim().slice(0, 40)))));
  const mulai = await centerOf(btnFinder, 'Mulai');
  await moveTo(d2, mulai[0], mulai[1], 12); await hold(d2, 2); await clickAt(d2, mulai[0], mulai[1], 14);
  await p.waitForTimeout(800); await hold(d2, 10);
  // pilih satu opsi (lalu cek jawaban)
  console.log('runner:', p.url(), JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('button,[role=radio],label')].filter((x) => x.getBoundingClientRect().height > 20 && x.getBoundingClientRect().top < 900).map((x) => x.textContent.trim().slice(0, 30)).slice(0, 14))));
  const opt = await centerOf(() => { const e = [...document.querySelectorAll('button,label,[role=radio]')].find((x) => /^C[^e]/.test(x.textContent.trim()) && x.getBoundingClientRect().height > 30); if (!e) return null; const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; });
  await moveTo(d2, opt[0], opt[1], 14); await clickAt(d2, opt[0], opt[1], 8);
  const cek = await centerOf(btnFinder, 'Cek jawaban');
  await moveTo(d2, cek[0], cek[1], 12); await clickAt(d2, cek[0], cek[1], 14); await hold(d2, 10);
  console.log('soal', n, 'bingkai', p.url());
  await b.close();
})().catch((e) => { console.log('GAGAL', e.message); process.exit(1); });

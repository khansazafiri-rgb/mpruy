// Rekam footage web asli MEDCOEL untuk video "Bayangin kamu jadi anak FK".
//   node rec.mjs <take> [folder_keluar]      take: p1 | a | p2   (web dev :3000 + PocketBase :8090 dari reset.sh)
// Waktu skenario = waktu video final (detik, dari data.json). TSTART = detik video saat frame pertama.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
let chromium;
for (const base of ['playwright', '/opt/node-tools/node_modules/playwright', path.resolve(import.meta.dirname, '../../../brand/video/node_modules/playwright')]) {
  try { ({ chromium } = require(base)); break; } catch { /* lokasi berikutnya */ }
}
if (!chromium) throw new Error('Playwright tidak ditemukan (jalankan npm ci di brand/video)');
const TAKE = process.argv[2];

const APP = 'http://127.0.0.1:3000', PB = 'http://127.0.0.1:8090';
const OUT = process.argv[3] || path.resolve('out-' + TAKE);
const TSTARTS = { p1: 80.9, a: 89.3, p2: 91.9 };
const TSTART = TSTARTS[TAKE];
if (TSTART === undefined) throw new Error('take harus p1, a, atau p2');
const W = 600, H = 738, DPR = 1.6;
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT + '/frames', { recursive: true });

const jcall = async (m, p, b, t) => {
  const r = await fetch(PB + p, { method: m, headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: t } : {}) }, body: b === undefined ? undefined : JSON.stringify(b) });
  const x = await r.text(); try { return JSON.parse(x); } catch { return x; }
};
const auth = await jcall('POST', '/api/collections/users/auth-with-password', { identity: 'raka.fk', password: 'rahasia-demo-1' });

const browser = await chromium.launch({ args: ['--force-device-scale-factor=' + DPR] });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, hasTouch: false, locale: 'id-ID' });
await ctx.addInitScript((a) => {
  if (a.login) { try { localStorage.setItem('pocketbase_auth', JSON.stringify({ token: a.token, record: a.record })); } catch (e) {} }
  const css = '*{scrollbar-width:none!important}::-webkit-scrollbar{display:none!important}' +
    '#__cur{position:fixed;left:0;top:0;width:0;height:0;z-index:2147483647;pointer-events:none}' +
    '#__cur .arrow{position:absolute;left:-3px;top:-2px;width:34px;height:40px;filter:drop-shadow(0 3px 4px rgba(10,56,48,.45));transform-origin:3px 2px;transition:transform .12s}' +
    '#__cur.down .arrow{transform:scale(.86)}' +
    '#__cur .ring{position:absolute;left:-26px;top:-26px;width:52px;height:52px;border-radius:50%;border:4px solid #F8C038;background:rgba(248,192,56,.28);opacity:0;transform:scale(.3)}' +
    '#__cur.fx .ring{animation:__rp .55s ease-out}' +
    '@keyframes __rp{0%{opacity:.95;transform:scale(.35)}100%{opacity:0;transform:scale(1.5)}}';
  const mk = () => {
    if (document.getElementById('__cur')) return;
    const st = document.createElement('style'); st.textContent = css; document.documentElement.appendChild(st);
    const c = document.createElement('div'); c.id = '__cur';
    c.innerHTML = '<div class="ring"></div><svg class="arrow" viewBox="0 0 34 40"><path d="M3 2 L3 30 L10.5 23.5 L15.5 35.5 L21 33 L16 21.5 L26 21 Z" fill="#fff" stroke="#0A3830" stroke-width="2.6" stroke-linejoin="round"/></svg>';
    document.documentElement.appendChild(c);
    let x = 300, y = 520; try { x = +sessionStorage.__cx || x; y = +sessionStorage.__cy || y; } catch (e) {}
    const set = (a, b) => { x = a; y = b; c.style.transform = `translate(${a}px,${b}px)`; try { sessionStorage.__cx = a; sessionStorage.__cy = b; } catch (e) {} };
    set(x, y);
    window.__curMove = (tx, ty, ms) => new Promise((res) => {
      const sx = x, sy = y, t0 = performance.now();
      const ease = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
      const step = (now) => { const t = Math.min(1, (now - t0) / Math.max(1, ms)); const e = ease(t); set(sx + (tx - sx) * e, sy + (ty - sy) * e - Math.sin(Math.PI * e) * 10); if (t < 1) requestAnimationFrame(step); else res(); };
      requestAnimationFrame(step);
    });
    window.__curFx = () => { c.classList.remove('fx'); void c.offsetWidth; c.classList.add('fx', 'down'); setTimeout(() => c.classList.remove('down'), 140); };
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mk); else mk();
  window.__smooth = (sel, y, ms) => new Promise((res) => {
    const el = sel ? document.querySelector(sel) : null; const get = () => (el ? el.scrollTop : window.scrollY); const put = (v) => (el ? el.scrollTo(0, v) : window.scrollTo(0, v));
    const s = get(), t0 = performance.now(); const ease = (t) => (t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
    const step = (now) => { const t = Math.min(1, (now - t0) / Math.max(1, ms)); put(s + (y - s) * ease(t)); if (t < 1) requestAnimationFrame(step); else res(); };
    requestAnimationFrame(step);
  });
}, { ...auth, login: TAKE !== 'a' });

const p = await ctx.newPage();
const cdp = await ctx.newCDPSession(p);
const frames = []; let wall0 = 0; let nframe = 0;
cdp.on('Page.screencastFrame', (f) => {
  const file = `frames/${String(nframe++).padStart(6, '0')}.jpg`;
  fs.writeFileSync(`${OUT}/${file}`, Buffer.from(f.data, 'base64'));
  frames.push({ ts: f.metadata.timestamp, file });
  cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
});

let T0 = 0; const now = () => (performance.now() - T0) / 1000 + TSTART;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const at = async (t) => { const d = (t - now()) * 1000; if (d > 0) await sleep(d); };
const marks = []; const mark = (n) => { marks.push([n, +now().toFixed(2)]); console.log(n.padEnd(34), now().toFixed(2)); };
const late = (t) => { const d = now() - t; if (d > 0.35) console.log('  !! terlambat', d.toFixed(2)); };

const center = async (loc) => { const b = await loc.boundingBox(); if (!b) throw new Error('no box'); return [b.x + b.width / 2, b.y + b.height / 2, b]; };
// Gerakkan kursor ke elemen (selesai tepat di waktu t), lalu ketuk.
async function tap(loc, t, { dur = 0.7, ox = 0, oy = 0, click = true, idx = 0, fixed = false } = {}) {
  const l = idx ? loc.nth(idx) : loc.first();
  await l.waitFor({ state: 'visible', timeout: 8000 });
  await at(t - dur - 0.55);
  let b = await l.boundingBox();
  if (!fixed && b && (b.y + b.height / 2 > H - 120 || b.y + b.height / 2 < 90)) {
    const dlg = await p.evaluate(() => !!document.querySelector('[role=dialog]'));
    if (!dlg) {
      const sy = await p.evaluate(() => window.scrollY);
      await p.evaluate(([y, m]) => window.__smooth(null, y, m), [Math.max(0, sy + b.y + b.height / 2 - H * 0.5), 450]);
      b = await l.boundingBox();
    }
  }
  const x = b.x + b.width / 2 + ox, y = b.y + b.height / 2 + oy;
  await at(t - dur);
  late(t - dur);
  await p.evaluate(([a, c, ms]) => window.__curMove(a, c, ms), [x, y, dur * 1000]);
  await at(t);
  if (click) { p.evaluate(() => window.__curFx()).catch(() => {}); const t1 = performance.now(); await p.mouse.click(x, y); if (performance.now() - t1 > 250) console.log('  (klik memakan', Math.round(performance.now() - t1), 'ms)'); }
}
const moveTo = async (loc, t, o = {}) => tap(loc, t, { ...o, click: false });
const smooth = (y, t, ms, sel) => at(t).then(() => p.evaluate(([s, a, b]) => window.__smooth(s, a, b), [sel || null, y, ms]));
const modalScroller = `(() => { const d = document.querySelector('[role=dialog]'); if (!d) return null; return [...d.querySelectorAll('*')].find((e) => e.scrollHeight > e.clientHeight + 20 && /auto|scroll/.test(getComputedStyle(e).overflowY)) || null; })()`;
async function modalScroll(y, t, ms) {
  await at(t);
  await p.evaluate(([yy, m]) => new Promise((res) => {
    const d = document.querySelector('[role=dialog]'); const el = [...d.querySelectorAll('*')].find((e) => e.scrollHeight > e.clientHeight + 20 && /auto|scroll/.test(getComputedStyle(e).overflowY));
    if (!el) return res(); const s = el.scrollTop, t0 = performance.now();
    const step = (n) => { const k = Math.min(1, (n - t0) / m); const e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; el.scrollTo(0, s + (yy - s) * e); if (k < 1) requestAnimationFrame(step); else res(); };
    requestAnimationFrame(step);
  }), [y, ms]);
}
async function type(text, t, per = 120) { await at(t); await p.keyboard.type(text, { delay: per }); }

// ---------- kunci: soal pembuka sesi (belum direkam) ----------
// "Soal baru didahulukan", jadi urutannya acak: ulangi sesi sampai soal pertama pendek dan sedang/sulit.
async function openGoodQuestion() {
  for (let i = 0; i < 60; i++) {
    await p.goto(APP + '/mata-kuliah/anatomi'); await p.waitForSelector('text=Pilih BAB');
    await p.getByText('Anatomi Ekstremitas Atas', { exact: true }).click();
    await p.locator('button', { hasText: /^Mulai \d+ soal/ }).click();
    await p.waitForSelector('label.answer-option');
    const q = await p.evaluate(() => {
      const t = document.body.innerText.replace(/\s+/g, ' ');
      const m = t.match(/Soal 1 dari \d+ (Easy|Medium|Hard) Tipe A (.+?) A (.+?) B (.+?) C (.+?) D (.+?) E (.+?) Laporkan/);
      return m ? { level: m[1], stem: m[2], options: [m[3], m[4], m[5], m[6], m[7]] } : null;
    });
    if (q && q.level !== 'Easy' && q.stem.length >= 70 && q.stem.length <= 150) return q;
  }
  throw new Error('soal yang cocok tidak muncul');
}
const stopAndSave = async () => {
  await cdp.send('Page.stopScreencast'); await sleep(300);
  fs.writeFileSync(OUT + '/frames.json', JSON.stringify({ wall0, tstart: TSTART, tend: now(), frames, marks }));
  console.log('frame:', frames.length, '| rekam sampai', now().toFixed(2));
  await browser.close();
};
const startRec = async () => {
  T0 = performance.now(); wall0 = Date.now() / 1000;
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, maxWidth: 1000, maxHeight: 1300, everyNthFrame: 1 });
  mark('mulai rekam');
};

if (TAKE === 'p1') {
  // 81.0-86.6  "mencoba, salah, membaca alasannya, lalu mencoba lagi": jawab salah -> cek -> baca pembahasan -> soal berikut
  const q = await openGoodQuestion();
  fs.writeFileSync(OUT + '/question.json', JSON.stringify(q, null, 1)); console.log('soal:', q.stem);
  await p.evaluate(() => window.__curMove(470, 640, 1)); await sleep(300);
  const radios = p.locator('label.answer-option');
  const KEY = q.options.length; // jawaban benar dicari dari pembahasan setelah cek; pilihan awal: opsi pertama (A)
  await startRec();
  try {
    await tap(radios, 82.85, { idx: 0, dur: 0.9 });                                  // "mencoba": memilih jawaban
    await tap(p.locator("button", { hasText: /Cek jawaban/ }), 83.4, { dur: 0.4, fixed: true });   // "salah": dicek
    mark('cek jawaban');
    const y0 = await p.evaluate(() => window.scrollY);
    await smooth(y0 + 330, 83.7, 1500);                                              // "membaca alasannya": gulir pelan ke pembahasan
    await at(85.2);
    await tap(p.locator('button', { hasText: /^Berikutnya/ }), 85.9, { dur: 0.45, fixed: true });   // "lalu mencoba lagi"
    mark('soal berikutnya');
    await at(86.7);
  } catch (e) { console.log('GAGAL di', now().toFixed(2), e.message.split('\n')[0]); }
  await stopAndSave();
}

if (TAKE === 'a') {
  // 89.3-92.2  "Kenalin, MEDCOEL. Gratis.": beranda publik (belum login)
  await p.goto(APP + '/'); await p.waitForSelector('text=semua fitur gratis'); await sleep(900);
  await p.evaluate(() => window.__curMove(430, 600, 1));
  await startRec();
  try {
    await at(90.6); await p.evaluate(() => window.__curMove(300, 380, 900));
    await at(92.3);
  } catch (e) { console.log('GAGAL di', now().toFixed(2), e.message.split('\n')[0]); }
  await stopAndSave();
}

if (TAKE === 'p2') {
  // 91.9-111.4  matkul -> Anatomi -> BAB -> soal -> pembahasan -> Simulasi Dokter -> BAB (mulai dari satu soal)
  // Pindah halaman lewat router (tanpa muat ulang) supaya tidak ada jeda putih di rekaman.
  const go = (to) => p.evaluate((u) => { history.pushState({}, '', u); window.dispatchEvent(new PopStateEvent('popstate')); }, to);
  await p.goto(APP + '/mata-kuliah'); await p.waitForSelector('text=Ruang belajarmu'); await sleep(900);
  await p.evaluate(() => window.__curMove(470, 620, 1)); await sleep(250);
  await startRec();
  try {
    // "Pilih mata kuliah" 92.2-93.1
    await tap(p.getByText('Anatomi', { exact: true }), 92.9, { dur: 0.75 });
    await p.waitForURL('**/mata-kuliah/anatomi'); await p.waitForSelector('text=Pilih BAB'); mark('halaman Anatomi');
    await smooth(470, 93.35, 600);                                                    // "dan bab": daftar BAB
    // "kerjakan soal" 93.8-94.7
    await tap(p.getByText('Anatomi Ekstremitas Atas', { exact: true }), 93.95, { dur: 0.5 });
    await p.waitForSelector('text=Siapkan sesi belajarmu'); mark('dialog sesi');
    await tap(p.locator('button', { hasText: /^Mulai \d+ soal/ }), 94.7, { dur: 0.5, fixed: true });
    await p.waitForURL('**/kerjakan/**'); await p.waitForSelector('label.answer-option'); mark('soal');
    // "baca pembahasannya" 94.96-96.16
    await tap(p.locator('label.answer-option'), 95.45, { idx: 1, dur: 0.4 });
    await tap(p.locator('button', { hasText: /Cek jawaban/ }), 95.9, { dur: 0.35, fixed: true }); mark('pembahasan');
    const y0 = await p.evaluate(() => window.scrollY);
    await smooth(y0 + 260, 96.2, 700);
    // "Simulasi Dokter" 97.1-101.0
    await at(96.85); await go('/simulasi-dokter'); await p.waitForSelector('text=Mau jaga di poli apa'); mark('simulasi dokter');
    await tap(p.locator('button', { hasText: /Umum/ }), 97.9, { dur: 0.55, idx: 0 });
    await tap(p.locator('button', { hasText: /Mulai (pasien baru|di poli)/ }), 98.6, { dur: 0.5, fixed: true });
    await p.waitForSelector('.sim-dialog'); mark('kasus dimulai');
    await tap(p.locator('.sim-dialog'), 99.5, { dur: 0.6 });
    await smooth(380, 100.1, 800); mark('panel anamnesis');
    // "Kamu nggak harus langsung mengerti semuanya" 101.4-103.4
    await at(101.2); await go('/mata-kuliah/anatomi'); await p.waitForSelector('text=Pilih BAB'); await p.evaluate(() => window.scrollTo(0, 0));
    await smooth(470, 102.0, 900); mark('daftar BAB lagi');
    // "Mulai dari satu bab, satu soal, lalu lanjut lagi besok" 103.7-107.2
    await tap(p.getByText('Anatomi Ekstremitas Atas', { exact: true }), 104.1, { dur: 0.7 });
    await p.waitForSelector('text=Siapkan sesi belajarmu');
    await tap(p.locator('[role=dialog] input[type=range]'), 104.95, { dur: 0.5, click: false });
    await p.evaluate(async () => {   // geser jumlah soal 10 -> 1 pelan-pelan (efek input, seperti diseret)
      const e = document.querySelector('[role=dialog] input[type=range]'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      for (let v = 10; v >= 1; v--) { set.call(e, String(v)); e.dispatchEvent(new Event('input', { bubbles: true })); await new Promise((r) => setTimeout(r, 55)); }
    }); mark('1 soal');
    await tap(p.locator('button', { hasText: /^Mulai 1 soal/ }), 106.1, { dur: 0.6, fixed: true });
    await p.waitForURL('**/kerjakan/**'); await p.waitForSelector('label.answer-option'); mark('soal tunggal');
    // R06 107.8-111.0: menyorot pilihan sambil berpikir
    await moveTo(p.locator('label.answer-option'), 108.9, { idx: 1, dur: 0.9 });
    await moveTo(p.locator('label.answer-option'), 110.2, { idx: 2, dur: 0.7 });
    await at(111.5);
  } catch (e) { console.log('GAGAL di', now().toFixed(2), e.message.split('\n')[0]); }
  await stopAndSave();
}

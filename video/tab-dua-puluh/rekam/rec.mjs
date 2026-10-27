// Rekam footage web asli MEDCOEL (R01..R07) sebagai satu take kontinu.
// Pakai: node rec.mjs [out_dir] [from_scene]
// Waktu skenario = waktu video final (detik). TSTART = detik video saat frame pertama.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const { EKSTREMITAS_ATAS, OSTEOLOGI } = await import('../seed/questions.mjs');

const APP = 'http://127.0.0.1:3000', PB = 'http://127.0.0.1:8090';
const OUT = process.argv[2] || path.resolve('out');
const TSTART = 12.0;
const W = 600, H = 738, DPR = 1.6;
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT + '/frames', { recursive: true });

const jcall = async (m, p, b, t) => {
  const r = await fetch(PB + p, { method: m, headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: t } : {}) }, body: b === undefined ? undefined : JSON.stringify(b) });
  const x = await r.text(); try { return JSON.parse(x); } catch { return x; }
};
const auth = await jcall('POST', '/api/collections/users/auth-with-password', { identity: 'nadia.putri', password: 'rahasia-demo-1' });
const su = (await jcall('POST', '/api/collections/_superusers/auth-with-password', { identity: 'dev@medcoel.local', password: 'devpassword123' })).token;
const simCases = (await jcall('GET', '/api/collections/sim_cases/records?perPage=200', undefined, su)).items;
const simContent = await jcall('GET', '/api/medcoel/doctor-sim/content', undefined, auth.token);
const simDx = simContent.dx || {};
const ALLQ = [...EKSTREMITAS_ATAS, ...OSTEOLOGI];
const rightText = (stemText) => { const q = ALLQ.find((x) => stemText.includes(x.text.slice(0, 40))); return q ? q.options.find((o) => o.correct).text : null; };

const browser = await chromium.launch({ args: ['--force-device-scale-factor=' + DPR] });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, hasTouch: false, locale: 'id-ID' });
await ctx.addInitScript((a) => {
  try { localStorage.setItem('pocketbase_auth', JSON.stringify({ token: a.token, record: a.record })); } catch (e) {}
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
}, auth);

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
async function tap(loc, t, { dur = 0.7, ox = 0, oy = 0, click = true, idx = 0 } = {}) {
  const l = idx ? loc.nth(idx) : loc.first();
  await l.waitFor({ state: 'visible', timeout: 8000 });
  await at(t - dur - 0.55);
  let b = await l.boundingBox();
  if (b && (b.y + b.height / 2 > H - 120 || b.y + b.height / 2 < 90)) {
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
  if (click) { await p.evaluate(() => window.__curFx()); await p.mouse.click(x, y); }
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

// ---------- siapkan halaman awal (belum direkam) ----------
await p.goto(APP + '/beranda'); await p.waitForSelector('text=Halo, Nadia'); await sleep(1200);
await p.evaluate(() => window.__curMove(420, 560, 1)); await sleep(200);

T0 = performance.now(); wall0 = Date.now() / 1000;
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, maxWidth: 1000, maxHeight: 1300, everyNthFrame: 1 });
const start = performance.now();
mark('mulai rekam');

try {
// ===== R01: Beranda -> Mata kuliah -> Anatomi -> daftar BAB (12.0 - 25.5) =====
await smooth(260, 13.2, 1100); await smooth(0, 14.8, 900);
await tap(p.getByText('Matkul', { exact: true }), 16.9);
await p.waitForSelector('text=Ruang belajarmu'); mark('daftar mata kuliah');
await tap(p.getByText('Anatomi', { exact: true }), 18.5, { dur: 0.8 });
await p.waitForURL('**/mata-kuliah/anatomi'); await p.waitForSelector('text=Pilih BAB'); mark('halaman Anatomi');
await smooth(560, 19.3, 1000);
await tap(p.locator('summary', { hasText: 'Segera hadir' }), 21.6, { dur: 0.8 }); mark('segera hadir dibuka');
await smooth(700, 22.0, 700);
await tap(p.getByText('Anatomi Ekstremitas Atas', { exact: true }), 24.1, { dur: 0.9 });
await p.waitForSelector('text=Siapkan sesi belajarmu'); mark('dialog sesi');

// ===== R02: dialog -> Mode Learning -> mulai (25.5 - 29.9) =====
await tap(p.getByText('Mode Learning', { exact: true }), 27.0, { dur: 0.8 });
await tap(p.getByRole('button', { name: /^Mulai 10 soal/ }), 28.7, { dur: 0.8 });
await p.waitForURL('**/kerjakan/**'); await p.waitForSelector('label.answer-option'); mark('runner dibuka');

// ===== R03: jawab -> Cek jawaban -> pembahasan (29.96 - 41) =====
const opts = await p.evaluate(() => [...document.querySelectorAll('label.answer-option')].map((e) => e.innerText.replace(/\s+/g, ' ').trim()));
const stemText = await p.evaluate(() => document.body.innerText);
const rt = rightText(stemText);
const rightIdx = opts.findIndex((o) => rt && o.endsWith(rt));
const wrongIdx = [1, 2, 3, 0, 4].find((i) => i !== rightIdx);
console.log('opsi:', opts, 'benar:', rightIdx, 'pilih salah:', wrongIdx);
const radios = p.locator('label.answer-option');
await moveTo(radios, 31.1, { idx: 1, dur: 0.7 });
await moveTo(radios, 31.9, { idx: 2, dur: 0.5 });
await tap(radios, 32.7, { idx: wrongIdx, dur: 0.5 });
await tap(p.getByRole('button', { name: /Cek jawaban/ }), 33.6, { dur: 0.8 }); mark('cek jawaban');
await at(34.6);
const wrongBox = await radios.nth(wrongIdx).boundingBox();
const sy = await p.evaluate(() => window.scrollY);
await smooth(sy + wrongBox.y - 300, 35.0, 1600);
await at(40.0);

// ===== R04: Coba Simulasi (41.3 - 52.2) =====
await p.goto(APP + '/mata-kuliah/anatomi'); await p.waitForSelector('text=Pilih BAB');
await smooth(300, 41.9, 700);
await tap(p.getByRole('button', { name: /Coba Simulasi/ }), 43.4, { dur: 0.8 }); await p.waitForSelector('text=Coba Simulasi: Anatomi'); mark('modal simulasi');
await modalScroll(260, 43.8, 500);
await tap(p.locator('[role=dialog] input[type=checkbox]'), 44.9, { dur: 0.6 });
await tap(p.getByText('Mode ujian', { exact: true }), 46.9, { dur: 0.8 });
const jum = p.locator('[role=dialog] input[type=number]').nth(1);
await tap(jum, 49.0, { dur: 0.7 }); await p.keyboard.press('Control+A'); await type('15', 49.1, 160);
const tm = p.locator('#tm');
await tap(tm, 50.4, { dur: 0.7 }); await p.keyboard.press('Control+A'); await type('20', 50.5, 170);
await moveTo(p.getByRole('button', { name: 'Mulai simulasi' }), 51.7, { dur: 0.9 });
await tap(p.getByRole('button', { name: 'Mulai simulasi' }), 52.0, { dur: 0.3 });
await p.waitForURL('**/kerjakan/**'); await p.waitForSelector('label.answer-option'); mark('simulasi dimulai');
await at(52.9);

// ===== R05: Simulasi Dokter (53.2 - 78.5) =====
await p.goto(APP + '/simulasi-dokter'); await p.waitForSelector('text=Mau jaga di poli apa');
await at(54.2);
await tap(p.getByRole('button', { name: /Umum/ }), 55.5, { dur: 0.9 });
await tap(p.getByRole('button', { name: /Mulai/ }), 57.0, { dur: 0.9 });
await p.waitForSelector('text=Anamnesis'); mark('kasus dimulai');
const hdr = await p.evaluate(() => (document.body.innerText.match(/(Pak|Bu) [A-Za-z]+, \d+ tahun/) || [])[0]);
const kasus = simCases.find((c) => c.title.startsWith(hdr));
console.log('pasien:', hdr, '→ dx', kasus && kasus.dxOk);
// seed kemajuan Nadia di latar belakang untuk leaderboard (R06)
(async () => {
  const chs = (await jcall('GET', '/api/collections/chapters/records?perPage=100', undefined, su)).items;
  const ch = chs.find((c) => c.title === 'Anatomi Ekstremitas Atas');
  const a = await jcall('POST', '/api/medcoel/attempts/practice', { chapter: ch.id, count: 14, mode: 'exam' }, auth.token);
  const data = await jcall('GET', `/api/medcoel/attempts/${a.attempt.id}`, undefined, auth.token);
  let n = 0;
  for (const q of data.questions) {
    const stem = typeof q.stem === 'string' ? q.stem : JSON.stringify(q.stem);
    const src = ALLQ.find((x) => stem.includes(x.text.slice(0, 40))); if (!src) continue;
    const right = q.options.find((o) => o.text === src.options.find((x) => x.correct).text);
    const wrong = q.options.find((o) => o.text !== right.text);
    await jcall('POST', `/api/medcoel/attempts/${a.attempt.id}/answer`, { question: q.id, response: (n++ % 5 === 4 ? wrong : right).label }, auth.token);
  }
  const started = new Date(Date.now() - 14 * 30 * 1000).toISOString().replace('T', ' ');
  await jcall('PATCH', `/api/collections/attempts/records/${a.attempt.id}`, { startedAt: started }, su);
  await jcall('POST', `/api/medcoel/attempts/${a.attempt.id}/finish`, { answers: {} }, auth.token);
  console.log('  (latar) kemajuan Nadia disimpan');
})().catch((e) => console.log('seed latar gagal', e.message));

await tap(p.getByRole('button', { name: /Keluhan utama/ }), 58.7, { dur: 0.9 });
await tap(p.locator('button', { hasText: /^[“"]/ }), 59.9, { dur: 0.7, idx: 1 }); mark('anamnesis: pertanyaan');
await tap(p.getByText(/Ketuk untuk/), 60.6, { dur: 0.5 });
await tap(p.getByRole('button', { name: /2\s*Fisik/ }), 61.2, { dur: 0.6 });
await tap(p.getByRole('button', { name: /Pemeriksaan umum/ }), 62.0, { dur: 0.6 });
await tap(p.getByRole('button', { name: /3\s*Penunjang/ }), 62.8, { dur: 0.6 });
await tap(p.getByRole('button', { name: /Darah rutin/ }), 63.6, { dur: 0.6 }); mark('penunjang');
await tap(p.getByRole('button', { name: /5\s*Diagnosis/ }), 64.6, { dur: 0.6 });
const sel = p.locator('select', { hasText: 'Pilih diagnosis' });
await tap(sel, 66.4, { dur: 0.8, click: false });
await p.evaluate(() => window.__curFx());
const dxVal = kasus ? kasus.dxOk : null;
if (dxVal) await sel.selectOption(dxVal).catch(async (e) => { console.log('selectOption gagal', e.message); });
await tap(p.getByRole('button', { name: 'Tetapkan' }), 67.3, { dur: 0.6 }); mark('diagnosis ditetapkan');
await p.waitForSelector('.sim-sheet-opts button');
const ddxNames = kasus ? (kasus.data.ddx || []).filter((k) => k !== kasus.dxOk && simDx[k]).map((k) => simDx[k][0]) : [];
const shown = await p.locator('.sim-sheet-opts button').allInnerTexts();
const ddxName = shown.find((t) => ddxNames.includes(t.trim())) || shown[0];
console.log('ddx dipilih:', ddxName, '| opsi:', shown.join(' / '));
await tap(p.locator('.sim-sheet-opts button', { hasText: ddxName.trim() }), 68.5, { dur: 0.7 });
await tap(p.getByRole('button', { name: /Akhiri konsultasi/ }), 69.6, { dur: 0.8 });
await p.waitForSelector('text=Laporan konsultasi', { timeout: 10000 }).catch(() => console.log('laporan belum muncul')); mark('laporan');
await at(70.8); await p.evaluate(() => window.scrollTo(0, 0));
await smooth(520, 72.0, 1800); await smooth(1100, 75.0, 1800);
await at(78.2);

// ===== R06: progres BAB + leaderboard (78.88 - 84.09) =====
await p.goto(APP + '/mata-kuliah/anatomi'); await p.waitForSelector('text=Pilih BAB');
await smooth(600, 79.4, 900);
await moveTo(p.getByText('Anatomi Ekstremitas Atas', { exact: true }), 80.8, { dur: 0.8 });
await tap(p.getByText('Peringkat', { exact: true }), 82.3, { dur: 0.9 });
await p.locator('h1', { hasText: 'Leaderboard' }).waitFor();
await tap(p.getByText('Sepanjang waktu', { exact: true }), 83.5, { dur: 0.7 }); mark('leaderboard');
await at(84.2);

// ===== R07: Chat Admin: upload PDF soal (84.44 - 91) =====
await p.goto(APP + '/chat-admin'); await p.getByRole('button', { name: /Upload soal PDF/ }).waitFor();
await tap(p.getByRole('button', { name: /Upload soal PDF/ }), 87.9, { dur: 1.3 }); mark('upload PDF');
await tap(p.getByRole('button', { name: /^Anatomi$/ }), 89.4, { dur: 0.9 }).catch((e) => console.log('chip mata kuliah gagal', e.message));
await at(91.6);

} catch (e) { console.log('GAGAL di', now().toFixed(2), e.message.split('\n')[0]); }
await cdp.send('Page.stopScreencast');
await sleep(300);
fs.writeFileSync(OUT + '/frames.json', JSON.stringify({ wall0, tstart: TSTART, tend: now(), frames, marks }));
console.log('frame:', frames.length, 'durasi rekam', (performance.now() - start) / 1000);
await browser.close();

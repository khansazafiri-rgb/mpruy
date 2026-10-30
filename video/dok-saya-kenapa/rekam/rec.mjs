// Rekam footage web asli MEDCOEL (R01..R07) sebagai satu take kontinu.
// Pakai: node rec.mjs [out_dir] [from_scene]
// Waktu skenario = waktu video final (detik). TSTART = detik video saat frame pertama.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const { EKSTREMITAS_ATAS, OSTEOLOGI } = await import('../../video/seed/questions.mjs');

const APP = 'http://127.0.0.1:3000', PB = 'http://127.0.0.1:8090';
const OUT = process.argv[2] || path.resolve('out');
const TSTART = 0.0;
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

// ---------- Simulasi Dokter asli: poli -> anamnesis -> pemeriksaan (alasan salah lalu benar) -> diagnosis -> laporan -> ulangi ----------
await p.goto(APP + '/simulasi-dokter'); await p.waitForSelector('text=Mau jaga di poli apa'); await sleep(1200);
await p.evaluate(() => window.__curMove(430, 560, 1)); await sleep(200);
T0 = performance.now(); wall0 = Date.now() / 1000;
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, maxWidth: 1000, maxHeight: 1300, everyNthFrame: 1 });
const start = performance.now();
mark('mulai rekam');
const R = (dt) => now() + dt;                       // waktu relatif
const wait = async (dt) => { await at(R(dt)); };
try {
  await tap(p.getByRole('button', { name: /Umum/ }).first(), R(1.2), { dur: 0.7 }); mark('poli umum');
  await tap(p.getByRole('button', { name: /Mulai di/ }), R(1.5), { dur: 0.8 });
  await p.waitForSelector('.sim-dialog'); await sleep(600); mark('pasien masuk');
  const hdr = await p.evaluate(() => (document.body.innerText.match(/(Pak|Bu|Nn|Ny|An|Tn)\.? [A-Za-z]+, \d+ tahun/) || [])[0]);
  const kasus = simCases.find((c) => hdr && c.title.startsWith(hdr));
  console.log('pasien:', hdr, '→ dx', kasus && kasus.dxOk, 'ddx', kasus && kasus.data.ddx);
  await wait(1.0);
  await tap(p.locator('.sim-dialog'), R(0.9), { dur: 0.5 }); mark('dialog lanjut');
  await wait(1.5);
  await smooth(430, R(0.1), 800); await wait(0.9);
  await tap(p.getByText('Keluhan utama', { exact: true }), R(1.2), { dur: 0.8 }); mark('area keluhan utama');
  await tap(p.locator('.sim-opt').nth(0), R(1.3), { dur: 0.8 }); mark('pertanyaan 1');
  await smooth(0, R(0.4), 700); await wait(2.0);
  await smooth(430, R(0.1), 700);
  await tap(p.locator('.sim-opt').nth(1), R(1.2), { dur: 0.7 }); mark('pertanyaan 2');
  await smooth(0, R(0.4), 700); await wait(2.0);
  await smooth(430, R(0.1), 700); await wait(0.5);
  // ---- pemeriksaan fisik: alasan salah dulu, lalu benar
  await tap(p.getByRole('button', { name: /2\s*Fisik/ }), R(1.2), { dur: 0.7 });
  await tap(p.getByText('Pemeriksaan umum', { exact: true }), R(1.2), { dur: 0.7 });
  const reasonLoop = async (order) => {
    let accepted = false, sawWrong = false;
    for (const act of order) {
      if (accepted) break;
      await tap(act, R(1.2), { dur: 0.7 });
      if (!(await p.waitForSelector('.sim-sheet', { timeout: 1500 }).then(() => true).catch(() => false))) { accepted = true; break; }
      mark('lembar alasan'); await wait(1.0);
      await tap(p.locator('.sim-sheet-opts button', { hasText: 'Tidak ada' }), R(1.0), { dur: 0.7 }); await sleep(900); mark('alasan salah (umpan balik)'); sawWrong = true;
      await wait(1.8);
      const labels = await p.locator('.sim-sheet-opts button:not(.is-none)').allInnerTexts();
      for (let i = 0; i < labels.length && (await p.locator('.sim-sheet').count()); i++) {
        const b2 = p.locator('.sim-sheet-opts button:not(.is-none):not(.is-wrong)').first();
        if (!(await b2.count())) break;
        await tap(b2, R(1.0), { dur: 0.6, click: false }); await b2.click(); await sleep(900);
        if (!(await p.locator('.sim-sheet').count())) { accepted = true; mark('alasan diterima'); break; }
      }
      if (!accepted && (await p.locator('.sim-sheet').count())) { await p.getByRole('button', { name: 'Batal' }).click().catch(() => {}); await sleep(500); }
    }
    return { accepted, sawWrong };
  };
  await reasonLoop([p.locator('.sim-opt', { hasText: 'Tanda vital' })]);
  await wait(1.0);
  await tap(p.getByRole('button', { name: /3\s*Penunjang/ }), R(1.2), { dur: 0.7 });
  await tap(p.locator('.sim-area').first(), R(1.2), { dur: 0.7 });
  const pr = await reasonLoop([p.locator('.sim-opt').nth(0), p.locator('.sim-opt').nth(1), p.locator('.sim-opt').nth(2), p.locator('.sim-opt').nth(3)]);
  console.log('penunjang:', pr);
  await wait(2.0);
  // ---- diagnosis: sengaja pilih diagnosis banding dulu
  await tap(p.getByRole('button', { name: /5\s*Diagnosis/ }), R(1.2), { dur: 0.7 });
  const sel = p.locator('select', { hasText: 'Pilih diagnosis' });
  await tap(sel, R(1.2), { dur: 0.7, click: false });
  await p.evaluate(() => window.__curFx());
  const ddxPick = kasus ? (kasus.data.ddx || []).find((k) => k !== kasus.dxOk) : null;
  if (ddxPick) await sel.selectOption(ddxPick).catch((e) => console.log('selectOption gagal', e.message));
  await wait(0.8);
  await tap(p.getByRole('button', { name: 'Tetapkan' }), R(1.0), { dur: 0.7 }); mark('diagnosis ditetapkan');
  await p.waitForSelector('.sim-sheet-opts button').catch(() => {});
  await wait(1.6);
  await tap(p.locator('.sim-sheet-opts button').first(), R(1.2), { dur: 0.7 }); await sleep(600);
  await wait(1.2);
  await tap(p.getByRole('button', { name: /Akhiri konsultasi/ }), R(1.2), { dur: 0.8 }); mark('akhiri konsultasi');
  await p.waitForSelector('text=Laporan konsultasi', { timeout: 10000 }).catch(() => console.log('laporan belum muncul')); mark('laporan');
  await wait(1.8);
  const sy = await p.evaluate(() => window.scrollY);
  await smooth(sy + 380, R(0.2), 1400); await wait(2.4);
  await smooth(sy + 900, R(0.2), 1500); await wait(2.6);
  await smooth(sy + 1500, R(0.2), 1500); await wait(2.6);
  await tap(p.getByRole('button', { name: /Ulangi kasus ini/ }), R(1.4), { dur: 0.9 }); mark('ulangi kasus');
  await wait(2.6);
} catch (e) { console.log('GAGAL di', now().toFixed(2), e.message.split('\n')[0]); try { await p.screenshot({ path: OUT + '/fail.png' }); console.log(await p.evaluate(() => document.body.innerText.slice(0, 400))); } catch (e2) {} }
await cdp.send('Page.stopScreencast');
await sleep(300);
fs.writeFileSync(OUT + '/frames.json', JSON.stringify({ wall0, tstart: TSTART, tend: now(), frames, marks }));
console.log('frame:', frames.length, 'durasi rekam', (performance.now() - start) / 1000);
await browser.close();

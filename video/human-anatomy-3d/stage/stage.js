// "FEATURE UNLOCKED: 3D ANATOMY": orkestrasi. renderFrame(t) deterministik (t = detik video).
// Isi utama = rekaman atlas MEDCOEL asli (bingkai kanvas 3D + tangkapan antarmuka) dari media/<take>/, disusun mengikuti narasi.
import { PLAN, CHIPS } from './plan.js';
const NS = 'http://www.w3.org/2000/svg';
const $ = (id) => document.getElementById(id);
const CLEAN = new URLSearchParams(location.search).has('clean');
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const eo = (x) => { x = clamp(x, 0, 1); return 1 - Math.pow(1 - x, 3); };
const eob = (x) => { x = clamp(x, 0, 1); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const win = (t, a, b, f = 0.25) => clamp((t - a) / f, 0, 1) * clamp((b - t) / f, 0, 1);
const f1 = (n) => Math.round(n * 10) / 10;
await document.fonts.load('800 40px "Plus Jakarta Sans"'); await document.fonts.load('700 30px "Plus Jakarta Sans"'); await document.fonts.ready;
const DATA = await (await fetch('data.json')).json();
const FPS = DATA.fps;

function pchip(keys) {
  const n = keys.length, h = [], d = [], m = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) { h[i] = keys[i + 1][0] - keys[i][0]; d[i] = (keys[i + 1][1] - keys[i][1]) / h[i]; }
  for (let i = 1; i < n - 1; i++) { if (d[i - 1] * d[i] <= 0) m[i] = 0; else { const w1 = 2 * h[i] + h[i - 1], w2 = h[i] + 2 * h[i - 1]; m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]); } }
  m[0] = d[0]; m[n - 1] = d[n - 2];
  return (x) => {
    if (x <= keys[0][0]) return keys[0][1]; if (x >= keys[n - 1][0]) return keys[n - 1][1];
    let i = 0; while (x > keys[i + 1][0]) i++;
    const t = (x - keys[i][0]) / h[i], t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * keys[i][1] + (t3 - 2 * t2 + t) * h[i] * m[i] + (-2 * t3 + 3 * t2) * keys[i + 1][1] + (t3 - t2) * h[i] * m[i + 1];
  };
}

// ---------------------------------------------------------------- manifes rekaman
const MAN = {};
for (const take of PLAN.takes) { try { const r = await fetch(`media/${take}/manifest.json`); if (r.ok) { const j = await r.json(); if (j.some((e) => e.type === 'end')) MAN[take] = j; } } catch (e) { /* take belum direkam */ } }
const evOf = (take, label) => {
  if (label === 'start') return MAN[take].find((e) => e.type === 'start');
  const e = MAN[take].find((x) => x.label === label); if (!e) throw new Error(`peristiwa tidak ada: ${take}/${label}`); return e;
};
const media = (take, f) => (f ? `media/${take}/${f}` : '');
const lastOf = (e) => (e.frames ? e.frames[e.frames.length - 1] : e.frame);

// ---------------------------------------------------------------- langkah -> keadaan layar
// setiap langkah: { take, kind: still|motion|click, t0 (saat mulai/klik), ev, ... }
const STEPS = PLAN.steps.filter((s) => MAN[s.take]).map((s) => {
  const ev = evOf(s.take, s.label || 'start');
  return { ...s, ev, geo: MAN[s.take][0].geo };
});
// keadaan akhir tiap langkah
function endState(s) {
  if (s.kind === 'still') return { take: s.take, ui: s.ev.ui, fr: s.ev.frame };
  if (s.kind === 'motion') return { take: s.take, ui: s.ev.ui, fr: lastOf(s.ev) };
  return { take: s.take, ui: s.ev.afterUi, fr: lastOf(s.ev) };
}
STEPS.forEach((s, i) => { s.end = endState(s); s.prevEnd = i ? STEPS[i - 1].end : null; });
const ST = (st) => (st ? { ui: media(st.take, st.ui), fr: media(st.take, st.fr) } : { ui: '', fr: '' });
function screenAt(t) {
  let i = -1; for (let k = 0; k < STEPS.length; k++) if (STEPS[k].t0 <= t) i = k; else break;
  if (i < 0) return null;
  const s = STEPS[i], prev = s.prevEnd;
  let cur;
  if (s.kind === 'still') cur = s.end;
  else if (s.kind === 'motion') {
    const N = s.ev.frames.length, rate = s.rate || FPS; const idx = clamp(Math.floor((t - s.t0) * rate), 0, N - 1);
    cur = { take: s.take, ui: s.ev.ui, fr: s.ev.frames[idx] };
  } else cur = s.end;
  const tin = s.tin ?? (s.kind === 'click' ? 0.14 : (prev && prev.take !== s.take ? 0.3 : 0));
  const k = tin > 0 ? sm((t - s.t0) / tin) : 1;
  const a = ST(prev && k < 1 ? prev : cur), b = ST(cur);
  return { a, b, k, step: s, idx: i };
}

// ---------------------------------------------------------------- kamera
const camFn = (() => {
  const K = PLAN.cam; const fx = pchip(K.map((k) => [k[0], k[1]])), fy = pchip(K.map((k) => [k[0], k[2]])), fs = pchip(K.map((k) => [k[0], k[3]]));
  return (t) => [fx(t), fy(t), fs(t)];
})();

// ---------------------------------------------------------------- kursor
const centerOf = (r) => [r[0] + r[2] / 2, r[1] + r[3] / 2];
function targetOf(s) {
  if (s.kind === 'click') {
    const e = s.ev;
    if (e.row) return { c: [e.row[0] + 16, e.row[1] + e.row[3] / 2], ring: [e.row[0] - 4, e.row[1] - 2, e.row[2] + 8, e.row[3] + 4] };
    return { c: centerOf(e.rect), ring: [e.rect[0] - 7, e.rect[1] - 7, e.rect[2] + 14, e.rect[3] + 14] };
  }
  return null;
}
const WAY = []; // titik jalur kursor
{
  let px = 960, py = 1100, pt = 0; WAY.push([0, px, py]);
  for (const s of STEPS) {
    if (s.kind === 'click') {
      const tg = targetOf(s); const t1 = s.t0, t0 = Math.max(pt + 0.05, t1 - (s.approach ?? 0.9));
      WAY.push([t0, px, py]); WAY.push([t1, tg.c[0], tg.c[1]]); WAY.push([t1 + 0.35, tg.c[0], tg.c[1]]);
      px = tg.c[0]; py = tg.c[1]; pt = t1 + 0.35; s.tg = tg;
    } else if (s.kind === 'motion') {
      const c = s.ev.cursor, dir = Math.sign(s.ev.totalX || 1), span = s.ev.kind === 'drag' ? 130 : 0;
      const dur = s.ev.frames.length / (s.rate || FPS);
      const t0 = Math.max(pt + 0.05, s.t0 - 0.6);
      WAY.push([t0, px, py]); WAY.push([s.t0, c.x - dir * span / 2, c.y]); WAY.push([s.t0 + dur, c.x + dir * span / 2, c.y]); WAY.push([s.t0 + dur + 0.3, c.x + dir * span / 2, c.y]);
      px = c.x + dir * span / 2; py = c.y; pt = s.t0 + dur + 0.3; s.dur = dur; s.cursorC = c;
    }
  }
  WAY.sort((a, b) => a[0] - b[0]); for (let i = 1; i < WAY.length; i++) if (WAY[i][0] <= WAY[i - 1][0]) WAY[i][0] = WAY[i - 1][0] + 0.001;
}
const curX = pchip(WAY.map((w) => [w[0], w[1]])), curY = pchip(WAY.map((w) => [w[0], w[2]]));

// ---------------------------------------------------------------- takarir
const CHUNKS = [];
for (const L of DATA.lines) {
  let cur = [], len = 0;
  const flush = () => { if (cur.length) { CHUNKS.push({ words: cur, t0: cur[0].s, t1: cur[cur.length - 1].e }); cur = []; len = 0; } };
  for (const w of L.words) { if (len + w.w.length + 1 > 30 && cur.length) flush(); cur.push(w); len += w.w.length + 1; if (/[.?!…]$/.test(w.w) && len >= 12) flush(); }
  flush();
}
CHUNKS.forEach((c) => { c.show0 = c.t0 - 0.05; c.show1 = c.t1 + 0.16; });
let capIdx = -2;
function updateCaption(t) {
  const box = $('capbox'); let ci = -1;
  if (!CLEAN) for (let i = 0; i < CHUNKS.length; i++) if (t >= CHUNKS[i].show0 && t <= CHUNKS[i].show1 && t < PLAN.capEnd && t > PLAN.capStart) { ci = i; break; }
  if (ci !== capIdx) { capIdx = ci; box.innerHTML = ci < 0 ? '' : CHUNKS[ci].words.map((w) => `<span class="w fut">${w.w}</span>`).join(''); }
  $('cap').style.opacity = ci < 0 ? 0 : 1;
  if (ci < 0) return;
  const c = CHUNKS[ci];
  box.querySelectorAll('.w').forEach((s, i) => { const w = c.words[i]; s.className = 'w ' + (t >= w.s && t < w.e ? 'on' : t >= w.e ? 'past' : 'fut'); });
}

const wdFn = (id, i) => DATA.lines.find((l) => l.id === id).words[i].s;
const HELP = { eo, eob, win, sm, f1, clamp, wd: wdFn, MAN, STEPS };
// ---------------------------------------------------------------- gambar
const imgs = { uiA: $('uiA'), uiB: $('uiB'), frA: $('frA'), frB: $('frB'), uiTop: $('uiTop') };
const loaded = new Map();
function pre(url) { if (!url) return Promise.resolve(); if (!loaded.has(url)) { const im = new Image(); im.src = url; loaded.set(url, im.decode().catch(() => {})); } return loaded.get(url); }
async function setImg(el, url) { if (el.dataset.src === url) return; el.dataset.src = url; if (!url) { el.removeAttribute('src'); el.style.visibility = 'hidden'; return; } await pre(url); el.src = url; el.style.visibility = 'visible'; try { await el.decode(); } catch (e) { /* lanjut */ } }

// ---------------------------------------------------------------- lapisan SVG
const fx = $('fx'), ov = $('ov');
const arrow = (x, y, down) => `<g transform="translate(${f1(x)} ${f1(y)}) scale(${down ? 0.86 : 1})"><path d="M0 0L0 34L9 26L16 42L23 39L16 23L28 23Z" fill="#fff" stroke="#0A3830" stroke-width="3.4" stroke-linejoin="round"/></g>`;
const rrect = (r, rx = 12) => `<rect x="${f1(r[0])}" y="${f1(r[1])}" width="${f1(r[2])}" height="${f1(r[3])}" rx="${rx}"/>`;

function renderFx(t, sc, cam) {
  let o = '';
  const s = sc?.step;
  // cincin penanda halus di sekitar kontrol yang dipakai
  for (const st of STEPS) {
    if (st.kind !== 'click') continue;
    const a = win(t, st.t0 - (st.approach ?? 0.9) * 0.7, st.t0 + 0.9, 0.3); if (a <= 0.01) continue;
    const pulse = 0.5 + 0.5 * Math.sin((t - st.t0) * 8);
    o += `<g fill="none" stroke="#F8C038" stroke-width="${f1(4 + pulse * 2)}" opacity="${a.toFixed(3)}">${rrect(st.tg.ring.map((v, i) => (i < 2 ? v - pulse * 2 : v + pulse * 4)))}</g>`;
    const u = (t - st.t0) / 0.5; if (u >= 0 && u < 1) o += `<circle cx="${f1(st.tg.c[0])}" cy="${f1(st.tg.c[1])}" r="${f1(8 + 44 * eo(u))}" fill="none" stroke="#fff" stroke-width="${f1(5 * (1 - u))}" opacity="${(0.9 * (1 - u)).toFixed(2)}"/>`;
  }
  // ring tambahan dari rencana (sorot baris/tombol tanpa klik)
  for (const h of PLAN.rings || []) {
    const a = win(t, h.t0, h.t1, 0.3); if (a <= 0.01) continue; const r = h.rect ?? MAN[h.take][0].geo[h.geo];
    const pulse = 0.5 + 0.5 * Math.sin(t * 7);
    o += `<g fill="none" stroke="#F8C038" stroke-width="${f1(4 + pulse * 2)}" opacity="${a.toFixed(3)}">${rrect(r.map((v, i) => (i < 2 ? v - 6 : v + 12)))}</g>`;
  }
  // kursor
  const show = PLAN.cursorOn.some(([a, b]) => t >= a && t <= b);
  if (show) {
    let down = false; for (const st of STEPS) if (st.kind === 'click' && t >= st.t0 && t < st.t0 + 0.14) down = true;
    for (const st of STEPS) if (st.kind === 'motion' && t >= st.t0 && t < st.t0 + (st.dur ?? 0)) down = true;
    o += arrow(curX(t), curY(t), down);
  }
  fx.innerHTML = o;
}

function renderOverlay(t) {
  let o = '';
  // judul singkat per bagian (di atas model, aman dari tombol IG/TikTok)
  for (const c of CHIPS) {
    const a = win(t, c.t0, c.t1, 0.25); if (a <= 0.01) continue;
    const w = c.w || 560, k = 0.85 + 0.15 * eob((t - c.t0) / 0.4); const txt = typeof c.text === 'function' ? c.text(t, HELP) : c.text;
    o += `<g transform="translate(${c.x ?? 682} ${c.y ?? 292}) scale(${k.toFixed(3)})" opacity="${a.toFixed(3)}"><rect x="${-w / 2}" y="-34" width="${w}" height="76" rx="38" fill="rgba(10,56,48,.28)"/><rect x="${-w / 2}" y="-40" width="${w}" height="76" rx="38" fill="${c.bg || '#0A3830'}"/><text x="0" y="12" text-anchor="middle" font-family="Plus Jakarta Sans" font-weight="800" font-size="${c.fs || 36}" fill="${c.fg || '#fff'}" letter-spacing="1">${txt}</text></g>`;
  }
  ov.innerHTML = o + (PLAN.extra ? PLAN.extra(t, HELP) : '');
}

// ---------------------------------------------------------------- render
async function renderFrame(t) {
  const sc = screenAt(t);
  const cam = camFn(t);
  $('cam').style.transform = `translate(${f1(540 - cam[0] * cam[2])}px, ${f1(960 - cam[1] * cam[2])}px) scale(${cam[2].toFixed(4)})`;
  if (sc) {
    const mix = sc.k;
    await Promise.all([setImg(imgs.uiA, sc.a.ui), setImg(imgs.uiB, sc.b.ui), setImg(imgs.frA, sc.a.fr), setImg(imgs.frB, sc.b.fr), setImg(imgs.uiTop, sc.b.ui)]);
    imgs.uiA.style.opacity = 1; imgs.uiB.style.opacity = mix.toFixed(3);
    imgs.frA.style.opacity = mix < 1 ? 1 : 0; imgs.frB.style.opacity = mix.toFixed(3);
    imgs.uiTop.style.clipPath = PLAN.overlayClip; imgs.uiTop.style.opacity = mix.toFixed(3);
    $('cam').style.opacity = 1;
    // sedikit pre-muat bingkai berikutnya
    if (sc.step.kind === 'motion') { const N = sc.step.ev.frames.length, i = Math.floor((t - sc.step.t0) * (sc.step.rate || FPS)); for (let d = 1; d < 4; d++) if (i + d < N) pre(media(sc.step.take, sc.step.ev.frames[i + d])); }
  } else $('cam').style.opacity = 0;
  renderFx(t, sc, cam);
  renderOverlay(t);
  updateCaption(t);
}
window.renderFrame = renderFrame;
window.__ready = true;

// "POV: SIKLUS ANAK FK" (1080 x 1920, 30 fps, 40 dtk, tanpa narator). Cerita animasi (maskot MEDCOEL asli) + rekaman web MEDCOEL ASLI di panel laptop + montage anatomi dari rekaman produk.
import { f1, MC, FONT, clamp, lerp, sm, eo, ei, eio, eob, seg, win, pchip } from './core.js';
import { bg } from './bg.js';
import { defs } from './art.js';
import { loadMascots, mascot, sweat, qmarks, swirl } from './mascot.js';
import { hud, typer, corridor, lecture, street, desk, card, flash, pixelClip, runPose, LAPTOP, R, C, T, MONO } from './world.js';
const q = new URLSearchParams(location.search), $ = (id) => document.getElementById(id);
await document.fonts.load('800 40px "Plus Jakarta Sans"'); await document.fonts.load('700 30px "Plus Jakarta Sans"'); await document.fonts.ready; await loadMascots();
export const DUR = 40.0;
const WEB = '/video/siklus-anak-fk/rekam/web';
const P1 = { x: 20, y: 470, w: 1040, h: 980 };
const ZS = 1080 / LAPTOP.w, ZOOM_RECT = { x: 0, y: 960 - LAPTOP.h * ZS / 2, w: 1080, h: LAPTOP.h * ZS };
// ---- jadwal rekaman web ASLI: [t0, t1, klip, bingkai0, bingkai1, tampilan0 [cx, cy, zoom], tampilan1]; sumber 1080 x 1800
const SEG = [
  [18.0, 19.5, 'mk', 0, 74, [540, 700, 1.04], [540, 760, 1.04]],
  [19.5, 21.0, 'bab', 40, 90, [540, 760, 1.04], [540, 700, 1.04]],
  [21.0, 22.4, 'materi', 36, 108, [540, 700, 1.04], [540, 780, 1.04]],
  [22.4, 24.4, 'flash', 46, 128, [540, 900, 1.04], [540, 900, 1.04]],
  [24.4, 25.7, 'learning', 39, 98, [540, 1000, 1.04], [540, 1000, 1.04]],
  [25.7, 26.9, 'learning', 98, 140, [540, 760, 1.04], [540, 760, 1.04]],
  [26.9, 29.0, 'learning', 140, 216, [540, 760, 1.04], [540, 1060, 1.04]],
  [29.0, 30.5, 'atlas', 1, 46, null, null],
  [30.5, 31.8, 'probe', 1, 43, null, null],
  [31.8, 33.0, 'ct', 1, 42, null, null],
];
const MONT = new Set(['atlas', 'probe', 'ct']);
const urlOf = (clip, i) => `${WEB}/${clip}/f${String(Math.round(i)).padStart(4, '0')}.jpg`;
const cache = new Map();
const load = (u) => { if (!cache.has(u)) { const im = new Image(); im.src = u; cache.set(u, im.decode().catch(() => {})); } return cache.get(u); };
function webFrame(t) {
  const s = SEG.find((x) => t >= x[0] && t < x[1]) || (t < SEG[0][0] ? SEG[0] : SEG[SEG.length - 1]); const u = clamp((t - s[0]) / (s[1] - s[0]));
  const i = lerp(s[3], s[4], u), v = s[5] ? [0, 1, 2].map((k) => lerp(s[5][k], s[6][k], sm(u))) : null;
  return { clip: s[2], i, v };
}
// ---- HUD per waktu
const stepv = (t, a) => { let v = a[0][1]; for (const [ti, vi] of a) if (t >= ti) v = vi; return v; };
function hudAt(t) {
  const day = stepv(t, [[0, 1], [4.8, 2], [6.2, 3], [7.4, 4]]);
  const energy = stepv(t, [[0, 5], [3.4, 4], [4.8, 3], [6.2, 2], [7.4, 1], [14.6, 2], [18, 3], [29, 3], [35, 4]]);
  const status = stepv(t, [[0, 'SEMANGAT'], [3.6, 'CAPEK'], [5.0, 'BINGUNG'], [7.4, 'KEWALAHAN'], [14.2, 'NEMU SESUATU'], [18, 'COBA 1 BAB'], [29, 'JELAJAH ANATOMI'], [34.5, 'TENANG']]);
  const nC = stepv(t, [[0, 2], [3, 3], [4.8, 7], [6.2, 12], [7.4, 17]]);
  const tugas = t < 8.4 ? Math.min(0.95, nC / 18 + 0.05) : 0.95;
  const clock = t < 3 ? ['07:30', '07:45', '08:00'][Math.min(2, Math.floor(t))] : t < 8.4 ? ['08:00', '16:30', '21:00'][Math.floor(((t - 3) / 0.52) % 3)] : t < 14 ? '02:10' : t < 18 ? '02:15' : t < 34 ? '02:20' : '20:30';
  return { day, energy, status, tugas, clock, alert: t >= 7.4 && t < 14 ? 1 : 0, t };
}
// ---- adegan loop (3,0 - 8,4)
const LOOP = [[3.0, 3.7, 'L', 3], [3.7, 4.2, 'S', 3], [4.2, 4.8, 'D', 3], [4.8, 5.3, 'L', 7], [5.3, 5.7, 'S', 7], [5.7, 6.2, 'D', 7], [6.2, 6.6, 'L', 12], [6.6, 6.95, 'S', 12], [6.95, 7.4, 'D', 12], [7.4, 7.7, 'L', 17], [7.7, 8.0, 'S', 17], [8.0, 8.4, 'D', 17]];
function koriDesk(t, n, extraOver = '') { const tired = Math.min(1, n / 17); return { eyes: 'tired', mouth: 'think', arm: -20 + Math.sin(t * 11) * 14 * (1 - tired * 0.4), bob: Math.sin(t * 6) * 3, rot: Math.sin(t * 5) * 2, over: sweat(0.6 + tired * 0.4) + extraOver }; }
function cardsOnKori(k, t) { let g = ''; const P = [[350, 1020, -12, 0], [470, 1060, 10, 1], [410, 1130, -4, 2], [340, 1200, 8, 3], [480, 1190, -9, 4]]; P.forEach(([x, y, r, i], j) => { const u = clamp(k * 1.4 - j * 0.12); if (u > 0) g += card(x, y + (1 - eo(u)) * -1100, r, i + 2, 0.95); }); return g; }
function scenePart(t) {
  if (t < 3.0) return corridor(t);
  if (t < 8.4) { const s = LOOP.find((x) => t >= x[0] && t < x[1]) || LOOP[LOOP.length - 1]; const lt = t - s[0] + s[0] * 3.7;
    if (s[2] === 'L') return lecture(lt); if (s[2] === 'S') return street(lt);
    return desk(lt, { n: s[3], grow: s[3], laptop: 'off', kori: koriDesk(lt, s[3]), glow: 0 }); }
  if (t < 9.0) { const k = seg(t, 8.4, 9.0, ei), sh = Math.sin(t * 90) * 10 * (t > 8.8 ? 1 : 0);
    return `<g transform="translate(${f1(sh)} 0)">` + desk(t, { n: 17, laptop: 'off', kori: { ...koriDesk(t, 17), sy: lerp(1, 0.78, k), sx: lerp(1, 1.06, k), eyes: 'tired' }, extra: cardsOnKori(k, t) }) + '</g>'; }
  const low = t < 14.0;
  const koriLow = { eyes: 'tired', mouth: 'think', sy: 0.74, sx: 1.07, bob: Math.sin(t * 2.2) * 2, over: sweat(0.9) + `<g transform="translate(20 -20)">${qmarks(t)}</g>` };
  const koriHap = t < 15.6 ? { eyes: 'normal', mouth: 'think', sy: lerp(0.74, 1, seg(t, 14.0, 14.6)), sx: lerp(1.07, 1, seg(t, 14.0, 14.6)), bob: Math.sin(t * 5) * 3 } : { eyes: 'happy', mouth: 'happy', arm: lerp(0, -62, eob(seg(t, 15.4, 15.9))) + (t > 15.9 ? Math.sin(t * 14) * 8 : 0), bob: Math.sin(t * 8) * 4, spark: 1 };
  const lap = t < 14.0 ? 'off' : t < 14.6 ? 'on' : 'prompt'; const k = low ? koriLow : koriHap;
  const crushCards = low ? cardsOnKori(1, t) : cardsOnKori(1 - seg(t, 14.0, 14.7), t);
  if (t < 34.4 && t >= 14.0 || low) return desk(t, { n: 17, laptop: lap, kori: k, extra: crushCards, glow: t >= 14.2 ? 1 : 0 });
  return closing(t);
}
function bookBab(t, p) {
  const x = 250, y = 1262; return `<g transform="translate(${x} ${y}) rotate(-4)" opacity="${f1(clamp(p * 3))}"><ellipse cx="0" cy="12" rx="170" ry="30" fill="#021014" opacity=".3"/><rect x="-150" y="-62" width="150" height="86" rx="6" fill="#FFFFFF" stroke="${MC.ink}" stroke-width="4"/><rect x="0" y="-62" width="150" height="86" rx="6" fill="#F6F1DE" stroke="${MC.ink}" stroke-width="4"/>${T(-76, -10, 'BAB', MC.ink, 40)}${T(76, -10, '13', MC.brand, 52)}<rect x="-146" y="-58" width="142" height="78" rx="4" fill="none" stroke="${MC.gold}" stroke-width="${f1(4 + 3 * Math.sin(t * 6))}" opacity=".9"/></g>`;
}
function closing(t) {
  const k = { eyes: t < 35.6 ? 'normal' : 'happy', mouth: 'happy', arm: -28 + Math.sin(t * 9) * 12, bob: Math.sin(t * 3) * 3, spark: 1, rot: Math.sin(t * 2) * 1.5 };
  let ex = bookBab(t, seg(t, 35.0, 35.6));
  let g = desk(t, { n: 17, laptop: 'after', kori: k, extra: ex, glow: 1 });
  const ka = seg(t, 36.0, 36.5, eob), na = seg(t, 36.4, 36.9, eob);
  g += `<g opacity="${f1(ka)}">${mascot('kila', { x: 640, y: 800 + (1 - ka) * 60, s: 0.62, bob: Math.sin(t * 4) * 8, arm: Math.sin(t * 9) * 20, eyes: 'happy', mouth: 'happy', spark: 0.6 + 0.4 * Math.sin(t * 9) })}</g>`;
  g += `<g opacity="${f1(na)}">${mascot('nilo', { x: 930, y: 1745, s: 0.8, bob: Math.sin(t * 3 + 1) * 3, arm: -20 + Math.sin(t * 6) * 14, eyes: 'normal', mouth: 'happy', spark: 0.8 })}</g>`;
  return g;
}
// ---- panel laptop dengan rekaman web asli / montage
function panelRect(t) {
  if (t < 18.0) return ZOOM_RECT;
  if (t < 18.7) return lerpR(ZOOM_RECT, P1, eio((t - 18.0) / 0.7));
  if (t < 33.0) return P1;
  if (t < 33.7) return lerpR(P1, ZOOM_RECT, eio((t - 33.0) / 0.7));
  return ZOOM_RECT;
}
const lerpR = (a, b, k) => ({ x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), w: lerp(a.w, b.w, k), h: lerp(a.h, b.h, k) });
function panelSvg(t, r, clipId) {
  const f = webFrame(Math.min(Math.max(t, 18.0), 33.0)), mont = MONT.has(f.clip);
  let img;
  if (mont) { img = `<image href="${urlOf(f.clip, f.i)}" x="${f1(r.x)}" y="${f1(r.y)}" width="${f1(r.w)}" height="${f1(r.h)}" preserveAspectRatio="xMidYMid slice"/>`; }
  else { const z = f.v[2], sc = (r.w / 1080) * z, x = r.x + r.w / 2 - f.v[0] * sc, y = r.y + r.h / 2 - f.v[1] * sc; img = `<image href="${urlOf(f.clip, f.i)}" x="${f1(x)}" y="${f1(y)}" width="${f1(1080 * sc)}" height="${f1(1800 * sc)}" preserveAspectRatio="none"/>`; }
  const rad = lerp(10, 28, clamp((r.w - ZOOM_RECT.w * 0.9) / 60)) * 1;
  return { f, mont, svg: `<clipPath id="clipPanel"><rect x="${f1(r.x)}" y="${f1(r.y)}" width="${f1(r.w)}" height="${f1(r.h)}" rx="${f1(rad)}"/></clipPath><g clip-path="url(#clipPanel)"><rect x="${f1(r.x)}" y="${f1(r.y)}" width="${f1(r.w)}" height="${f1(r.h)}" fill="#EAF6F1"/>${img}</g>`, rad };
}
// ---- teks
function captions(t) {
  let g = '';
  g += typer('POV: SIKLUS ANAK FK', t, 0.12, 3.0, { fs: 62, y: 436, cps: 38 });
  g += typer('KULIAH → PULANG → BELAJAR', t, 3.0, 5.0, { fs: 46, y: 436, w: 1000, cps: 30 });
  g += typer('MASIH BINGUNG.', t, 5.0, 6.8, { fs: 58, y: 436, cps: 22, red: true });
  g += typer('BESOK ULANG LAGI…', t, 6.8, 8.7, { fs: 58, y: 436, cps: 22, red: true });
  g += typer('MULAI DARI MANA?', t, 9.4, 14.0, { fs: 66, y: 436, cps: 22 });
  g += typer('PILIH SATU BAB.', t, 18.4, 20.8, { fs: 54, y: 436, cps: 26 });
  g += typer('MATERI → FLASHCARD → LATIHAN', t, 20.9, 25.0, { fs: 44, y: 436, w: 1000, cps: 30 });
  g += typer('SALAH? LIHAT PEMBAHASANNYA.', t, 25.1, 29.0, { fs: 46, y: 436, w: 1000, cps: 30 });
  g += typer('ANATOMI? JELAJAHI 3D & LIVE 4D LAB.', t, 29.0, 33.0, { fs: 42, y: 436, w: 1010, cps: 34 });
  g += typer('SATU BAB DULU.', t, 35.4, 37.6, { fs: 68, y: 436, cps: 22 });
  const fin = clamp((t - 37.6) / 0.25) * clamp((40.2 - t) / 0.1);
  if (fin > 0) g += `<g opacity="${f1(fin)}">${R(60, 372, 960, 110, 'rgba(10,28,36,.94)', 24, `stroke="${MC.gold}" stroke-width="4"`)}<text x="540" y="425" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="40" fill="${MC.ivory}">MEDCOEL GRATIS DI</text><text x="540" y="468" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="46" fill="${MC.gold}">medcoel.com</text></g>`;
  if (t >= 29.0 && t < 33.0) { const a = clamp((t - 29.3) / 0.2); if (t >= 30.5 && t < 33.0) g += `<g opacity="${f1(a)}">${R(40, 1470, 330, 56, 'rgba(10,56,48,.95)', 28, `stroke="${MC.gold}" stroke-width="3"`)}${T(205, 1509, 'Simulasi edukatif', MC.ivory, 28, '', 'middle', 700)}</g>`;
    g += `<g opacity="${f1(a)}">${R(560, 1470, 190, 56, MC.gold, 28, `stroke="${MC.ink}" stroke-width="3"`)}${T(655, 1509, t < 30.5 ? 'Atlas 3D' : 'Live 4D Lab', MC.ink, 28)}</g>`; }
  return g;
}
// ---- maskot pendamping di bagian web
function webMascots(t) {
  let g = '';
  const na = win(t, 27.2, 28.6, 0.25), ka = win(t, 28.4, 29.6, 0.25), ka2 = win(t, 22.7, 24.0, 0.2) * 0;
  if (na > 0.01) g += `<g opacity="${f1(na)}">${mascot('nilo', { x: 940, y: 1760 - (1 - na) * 40, s: 0.62, bob: Math.sin(t * 6) * 5, arm: -18 + Math.sin(t * 8) * 14, eyes: 'normal', mouth: 'think' })}${R(520, 1580, 330, 78, MC.ivory, 34, `stroke="${MC.ink}" stroke-width="3"`)}${T(685, 1630, 'Coba lagi, yuk!', MC.ink, 32)}</g>`;
  if (ka > 0.01) g += `<g opacity="${f1(ka)}">${mascot('kila', { x: 940, y: 1760 - (1 - ka) * 40, s: 0.62, bob: Math.sin(t * 7) * 7, arm: Math.sin(t * 9) * 18, eyes: 'happy', mouth: 'happy', spark: 0.6 + 0.4 * Math.sin(t * 10) })}${R(520, 1580, 330, 78, MC.ivory, 34, `stroke="${MC.ink}" stroke-width="3"`)}${T(685, 1630, 'Mulai nyambung!', MC.ink, 30)}</g>`;
  return g;
}
export function master(t) {
  const bgp = bg(t, { cy: 940 });
  let g = bgp;
  const inWeb = t >= 17.2 && t < 34.4;
  // kamera pada adegan meja (zoom ke layar laptop 16,0 - 17,2 dan kembali 34,4 - 35,4)
  let S = 1; if (t >= 16.0 && t < 17.2) S = lerp(1, ZS, eio((t - 16.0) / 1.2)); else if (t >= 17.2 && t < 34.4) S = ZS; else if (t >= 34.4 && t < 35.4) S = lerp(ZS, 1, eio((t - 34.4) / 1.0));
  const camTf = S === 1 ? '' : `translate(${f1(540 - LAPTOP.cx * S)} ${f1(960 - LAPTOP.cy * S)}) scale(${f1(S * 1000) / 1000})`;
  const sceneT = Math.min(t, 40);
  const showScene = !(t >= 18.0 && t < 33.7 + 0.0) || t < 18.0;
  if (t < 18.0 || t >= 33.7) g += `<g transform="${camTf}">${scenePart(sceneT)}</g>`;
  // kilatan potongan pada loop dan pergantian hari
  if (t >= 3.0 && t < 8.4) { const s = LOOP.find((x) => t >= x[0] && t < x[1]); if (s) g += flash(clamp(1 - (t - s[0]) / 0.1) * 0.55); }
  if (t >= 8.4 && t < 8.9) g += flash(clamp(1 - (t - 8.8) / 0.1) * 0.7 * (t > 8.8 ? 1 : 0));
  // transisi pixel dan panel web
  const pIn = seg(t, 17.2, 18.0, sm), pOut = 1 - seg(t, 33.7, 34.4, sm);
  if (t >= 17.2 && t < 34.4) {
    const r = panelRect(t), p = t < 18.0 ? pIn : t >= 33.7 ? pOut : 1;
    const screenRectNow = r; const px = pixelClip('clipPix', p, ZOOM_RECT, 3, 40);
    const pn = panelSvg(t, r);
    if (t < 18.0 || t >= 33.7) g += px.clip + `<g clip-path="url(#clipPix)">${pn.svg}</g>${px.edge}`;
    else {
      // di luar adegan meja: latar teal + panel yang tumbuh/menyusut
      g += `<rect x="${f1(r.x - 6)}" y="${f1(r.y - 6)}" width="${f1(r.w + 12)}" height="${f1(r.h + 12)}" rx="${f1(pn.rad + 6)}" fill="#141D26" stroke="${MC.gold}" stroke-width="4"/>` + pn.svg;
    }
  }
  if (t >= 18.7 && t < 33.0) g += webMascots(t);
  g += hud(hudAt(t)) + captions(t);
  if (t < 0.2) g += flash(0);
  return g;
}
async function renderFrame(t) {
  // pra-muat bingkai web yang dibutuhkan
  if (t >= 17.2 && t < 34.4) { const f = webFrame(Math.min(Math.max(t, 18.0), 33.0)); await load(urlOf(f.clip, f.i)); }
  $('scene').innerHTML = defs() + master(t); await new Promise((r) => requestAnimationFrame(() => r()));
}
window.renderFrame = renderFrame; await renderFrame(+(q.get('t') ?? 0)); window.__ready = true;

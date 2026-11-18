// "MATA PANDA = KURANG ZAT BESI?" tren "ferritin face" (1080 x 1920, 30 fps, ±44,8 dtk, TANPA AUDIO). Cerita hanya dari visual dan teks layar.
// Dunia = SVG (Raka kanonik dari brand/characters/raka/raka.js + diagram kode) -> kanvas piksel beresolusi rendah -> dikuantisasi ke palet tetap -> diperbesar tanpa pelicin.
// Teks, label, dan rekaman web MEDCOEL asli digambar tajam di lapisan UI (tanpa filter piksel). Semua waktu ada di CUE di bawah.
import { f1, clamp, lerp, sm } from './core.js';
import { raka, rakaSvg, lerpState, PALETTE_ON_DARK } from '/brand/characters/raka/raka.js';
import * as A from './art.js';
const $ = (id) => document.getElementById(id);
await document.fonts.load('800 40px "Plus Jakarta Sans"'); await document.fonts.load('700 30px "Plus Jakarta Sans"'); await document.fonts.load('400 24px "Press Start 2P"'); await document.fonts.ready;
export const CUE = {
  dur: 44.8,
  s1: [0, 5.0], s2: [5.0, 9.0], s3: [9.0, 17.0], s4: [17.0, 24.0], s5: [24.0, 32.0], s6: [32.0, 35.4], web: [35.4, 41.2], end: [41.2, 44.8],
};
export const DUR = CUE.dur;
const FONT = "'Plus Jakarta Sans', system-ui, sans-serif";
const K = { navy: '#0B1F3A', navy2: '#102A4C', cream: '#FFF3DC', cyan: '#5CE1E6', red: '#E63946', gold: '#F8C038', white: '#FFFFFF', ink: '#07142B' };
const win = (t, a, b, f = 0.25) => clamp((t - a) / f) * clamp((b - t) / f);
const R = (x, y, w, h, f, rx = 0, e = '') => `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" rx="${rx}" fill="${f}" ${e}/>`;
const T = (x, y, txt, f, size, w = 800, anchor = 'middle', e = '') => `<text x="${f1(x)}" y="${f1(y)}" font-family="${FONT}" font-weight="${w}" font-size="${size}" fill="${f}" text-anchor="${anchor}" ${e}>${txt}</text>`;
// ------------------------------------------------------------------ teks layar (area aman tengah, maksimal dua baris, bidang gelap di belakang)
const BAND = { y: 1196, h: 216 };                                                        // tengah layar bawah; di atas bilah aplikasi (≥ 1440 bebas) dan jauh dari tepi kanan
function caption(lines, a, o = {}) {
  if (a <= 0.01) return '';
  const fs = o.fs ?? 58, lh = fs * 1.2, h = lh * lines.length + 52, y0 = (o.y ?? BAND.y) + (BAND.h - h) / 2, w = Math.min(1000, Math.max(...lines.map((l) => l.length)) * fs * 0.6 + 90);
  return `<g opacity="${f1(a)}" transform="translate(0 ${f1((1 - a) * 14)})">`
    + `<path d="M${f1(540 - w / 2 + 12)} ${f1(y0)}h${f1(w - 24)}v12h12v${f1(h - 24)}h-12v12h-${f1(w - 24)}v-12h-12v-${f1(h - 24)}h12z" fill="rgba(7,20,43,.9)"/>`
    + `<path d="M${f1(540 - w / 2 + 12)} ${f1(y0)}h${f1(w - 24)}v12h12v${f1(h - 24)}h-12v12h-${f1(w - 24)}v-12h-12v-${f1(h - 24)}h12z" fill="none" stroke="${o.c ?? K.cyan}" stroke-width="5"/>`
    + lines.map((l, i) => T(540, y0 + 26 + fs * 0.95 + i * lh, l, i === (o.hi ?? -1) ? K.gold : K.cream, fs, 800)).join('') + `</g>`;
}
// ------------------------------------------------------------------ pipa piksel
const FONTB64 = await (async () => { const b = new Uint8Array(await (await fetch('fonts/PressStart2P.woff2')).arrayBuffer()); let bin = ''; for (let i = 0; i < b.length; i += 0x8000) bin += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(bin); })();
const FONTCSS = `<style>@font-face{font-family:'Press Start 2P';src:url(data:font/woff2;base64,${FONTB64}) format('woff2')}</style>`;
const cv = $('pix'), ctx = cv.getContext('2d', { alpha: false, willReadFrequently: true });
const PAL = ['#050E1E', '#07142B', '#0B1F3A', '#102A4C', '#173963', '#1F4B7D', '#2D6AA3', '#19C3D9', '#5CE1E6', '#A9F0F5', '#FFF3DC', '#F5E8D6', '#E4D2B4', '#FFFFFF', '#E63946', '#B3202F', '#7A1220', '#FF6B6B', '#F8C038', '#FFD866', '#B8860B', '#F7BC8E', '#EAA676', '#CE8A5F', '#212739', '#3A4468', '#1D7B75', '#19726D', '#23978F', '#017162', '#FBC23A', '#8B3F37', '#7A2D2E', '#EE7A7A', '#5B2F63', '#9A5F78', '#8E97A3', '#5C6B7A', '#33506E', '#25394F', '#6DBBA8', '#F2735E', '#10212B', '#C9606E', '#E58A92', '#3E4E6B'].map((h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)));
const qc = new Map();
function qi(r, g, b) {
  const k = (r << 16) | (g << 8) | b; let v = qc.get(k); if (v !== undefined) return v;
  let best = 1e12; v = 0; for (let i = 0; i < PAL.length; i++) { const p = PAL[i], dr = r - p[0], dg = g - p[1], db = b - p[2], d = 0.35 * dr * dr + 0.5 * dg * dg + 0.15 * db * db; if (d < best) { best = d; v = i; } }
  qc.set(k, v); return v;
}
async function drawWorld(svgInner, res, bgHex = K.navy) {
  const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">${FONTCSS}<rect width="1080" height="1920" fill="${bgHex}"/>${svgInner}</svg>`);
  const im = new Image(); im.src = url; await im.decode();
  if (cv.width !== res[0]) { cv.width = res[0]; cv.height = res[1]; }
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.drawImage(im, 0, 0, res[0], res[1]);
  const d = ctx.getImageData(0, 0, res[0], res[1]), p = d.data;
  for (let i = 0; i < p.length; i += 4) { const c = PAL[qi(p[i], p[i + 1], p[i + 2])]; p[i] = c[0]; p[i + 1] = c[1]; p[i + 2] = c[2]; p[i + 3] = 255; }
  ctx.putImageData(d, 0, 0);
}
// ------------------------------------------------------------------ Raka (kanonik) di dunia piksel
const dark = (svg) => svg.replaceAll('#9A5F78', '#5B2F63');
// lingkaran gelap di bawah mata (dibuat besar agar terbaca): elips di bawah kelopak, koordinat kepala -> koordinat badan (NECK_Y 362, skala 1,2, pivot 306)
const circles = (k = 1) => [160, 240].map((x) => `<ellipse cx="${x}" cy="${212 + 28}" rx="29" ry="${f1(15.5 * k)}" fill="#5B2F63"/>`).join('');
function rk(state, o = {}) { const k = o.k ?? 2.7, tx = o.tx ?? 540 - 200 * k, ty = o.ty ?? 18;
  const svg = dark(rakaSvg(state, { bare: true, uid: o.uid ?? 'rk', palette: PALETTE_ON_DARK, shadow: false, ...(o.opts || {}) }));
  const m = svg.indexOf('<g class="raka-head"'), cut = svg.indexOf('<ellipse', m);   // elips pertama di kepala = telinga/mata; sisipkan lingkaran gelap sebelum wajah digambar penuh
  const withC = o.circles === false ? svg : svg.replace(/(<path d="M200 92C270 92[^>]*\/>)/, `$1${circles(o.cs ?? 1)}`);
  void cut;
  return `<g transform="translate(${f1(tx)} ${f1(ty)}) scale(${k})">${withC}</g>`; }
const blinkAtT = (t, times) => { for (const b of times) if (t > b && t < b + 0.2) return Math.sin(((t - b) / 0.2) * Math.PI); return 0; };
// ------------------------------------------------------------------ S1 dan S5: wajah dari depan (ukuran sama)
function faceState(t, o = {}) {
  const p = clamp((t - (o.pt ?? 1.8)) / 0.7), tap = o.tap ? 0.5 + 0.5 * Math.sin((t - (o.pt ?? 1.8) - 0.7) * 7) : 0;
  const base = raka(o.expr ?? 'netral', 'netral', { bags: 1, blink: blinkAtT(t, o.blinks ?? [1.0, 3.6]), gazeY: 0.15, breath: Math.sin(t * 2.2) * 0.5 + 0.5, ...(o.over || {}) });
  const down = { wx: 314, wy: 556, ex: 312, ey: 488, finger: 0, fa: -90, front: 0, roll: 0 };
  const point = { wx: 276 + 1 * tap, wy: 336 - 3 * tap, ex: 352, ey: 452, finger: 0.7, fa: -112, front: 1, roll: 0 };
  const st = { ...base }; const e = sm(p);
  st.armR = Object.fromEntries(Object.keys(down).map((k2) => [k2, typeof down[k2] === 'number' ? lerp(down[k2], point[k2], e) : down[k2]]));
  return st;
}
function shotFace(t, o = {}) {
  const z = 1 + 0.06 * clamp((t - (o.t0 ?? 0)) / 5), cx = o.cx ?? 540, cy = 690;
  const st = faceState(t, o);
  return `<g transform="translate(${cx} ${cy}) scale(${z}) translate(${-cx} ${-cy})">${rk(st, { tx: cx - 200 * 2.7 })}</g>`;
}

// ------------------------------------------------------------------ label UI tajam (kotak gelap + teks krem)
function tag(x, y, txt, o = {}) {
  const fs = o.fs ?? 36, w = txt.length * fs * 0.62 + 48, h = fs + 30, a = o.a ?? 1; if (a <= 0.01) return '';
  return `<g opacity="${f1(a)}">${R(x - w / 2, y - h / 2, w, h, 'rgba(7,20,43,.92)', 0, `stroke="${o.c ?? K.cyan}" stroke-width="4"`)}${T(x, y + fs * 0.36, txt, o.fg ?? K.cream, fs, 800)}</g>`;
}
const pillTop = (txt, a) => (a > 0.01 ? `<g opacity="${f1(a)}">${R(540 - (txt.length * 12.6 + 60) / 2, 270, txt.length * 12.6 + 60, 52, K.gold, 0)}${T(540, 306, txt, K.ink, 24, 800)}</g>` : '');
// ------------------------------------------------------------------ S2: over-the-shoulder, Raka melihat ponsel
const PH = { cx: 745, cy: 850, w: 340, h: 600 };
function shotPhone(t) {
  const lt = t - CUE.s2[0], bob = Math.sin(lt * 2.4) * 4;
  const st = raka('berpikir', null, { bags: 1, blink: blinkAtT(t, [6.2, 7.6]), tilt: -3, breath: Math.sin(t * 2.2) * 0.5 + 0.5 });
  st.armR = { wx: 352, wy: 356, ex: 400, ey: 480, finger: 0, fa: -90, front: 1, roll: 0 };
  st.armL = { wx: 86, wy: 556, ex: 88, ey: 488, finger: 0, fa: -90, front: 0, roll: 0 };
  const k = 1.95, tx = 290 - 200 * k, ty = 900 - 249 * k;
  let w = `<g transform="translate(0 ${f1(bob * 0.5)})">${rk({ ...st }, { k, tx, ty, circles: false, opts: { back: { turn: 0.72, lift: 0 }, logo: false } })}</g>`;
  w += A.phone(PH.cx, PH.cy + bob, PH.w, PH.h);
  w += A.hand(PH.cx - PH.w / 2 + 10, PH.cy + PH.h / 2 - 90 + bob);
  const qa = win(lt, 0.4, 3.9, 0.3), qb = Math.sin(lt * 5) * 6;
  w += A.qmark(340, 440 + qb, 88, qa);
  // zoom lurus ke kartu layar ponsel (match cut ke diagram): fokus bergeser dari titik kartu ke tengah layar sambil memperbesar
  const u = sm((lt - 2.9) / 1.05), z = lerp(1, 4.3, u), fx = PH.cx, fy = PH.cy - PH.h * 0.04 + bob;
  return `<g transform="translate(${f1(fx + (540 - fx) * u)} ${f1(fy + (960 - fy) * u)}) scale(${f1(z)}) translate(${-fx} ${f1(-fy)})">${w}</g>`;
}
// ------------------------------------------------------------------ S3: papan top-down, ferritin menyimpan cadangan zat besi, lalu bahan untuk Hb
const P3 = { src: [120, 800], box: [400, 740], rbc: [828, 740] };
const arrowD = (x0, y0, x1, y1, col, a = 1) => `<g opacity="${f1(a)}"><path d="M${x0} ${y0}H${x1 - 26}" stroke="${col}" stroke-width="12" stroke-dasharray="26 18" fill="none"/><path d="M${x1 - 34} ${y1 - 22}L${x1} ${y1}L${x1 - 34} ${y1 + 22}Z" fill="${col}"/></g>`;
function slots9(rad, n) { const out = []; for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 - Math.PI / 2; out.push({ x: Math.cos(a) * rad, y: Math.sin(a) * rad }); } out.push({ x: 0, y: 0 }); return out.slice(0, n); }
const S3A = Array.from({ length: 12 }, (_, i) => 9.95 + i * 0.27);          // butir meninggalkan tumpukan menuju kotak
const S3B = Array.from({ length: 7 }, (_, i) => 13.7 + i * 0.42);           // butir meninggalkan kotak menuju pembentukan Hb
function shot3(t) {
  const [bx, by] = P3.box, [rx, ry] = P3.rbc, [sx, sy] = P3.src;
  let w = A.board();
  const arrivedA = S3A.filter((tt) => t >= tt + 0.75).length, leftB = S3B.filter((tt) => t >= tt).length, arrB = S3B.filter((tt) => t >= tt + 0.8).length;
  const level = clamp((arrivedA - leftB * 1.2) / 12 * 0.95 + 0.04);
  const aA = win(t, 9.9, 13.3, 0.3), aB = win(t, 13.5, 17.1, 0.3);
  w += arrowD(sx + 90, sy - 30, bx - 165, by + 20, A.C.cyan, 0.35 + 0.65 * aA) + arrowD(bx + 165, by, rx - 175, ry, A.C.cyan, 0.35 + 0.65 * aB);
  // tumpukan sumber (berkurang saat butir berangkat)
  w += A.pile(sx, sy, Math.max(0, 12 - S3A.filter((tt) => t >= tt).length), 1);
  w += A.box(bx, by, 300, 310, level, { glow: aA * 0.5 * (0.5 + 0.5 * Math.sin(t * 6)) });
  // butir di perjalanan sumber -> kotak
  for (const tt of S3A) { const u = (t - tt) / 0.75; if (u > 0 && u < 1) w += A.grain(lerp(sx + 60, bx - 120, u), lerp(sy - 20, by + 10, u) - 70 * Math.sin(u * Math.PI), 30); }
  // pembentukan sel darah merah: slot Hb terisi per butir yang tiba
  const sl = slots9(86, 9).map((p, i) => (i < arrB ? { ...p, k: 1.1 } : { ...p, empty: true, k: 1.1, a: 0.55 }));
  w += A.rbc(rx, ry, 150, { slots: sl });
  for (const tt of S3B) { const u = (t - tt) / 0.8; if (u > 0 && u < 1) w += A.grain(lerp(bx + 140, rx - 130, sm(u)), lerp(by, ry, u) - 40 * Math.sin(u * Math.PI), 30); }
  return w;
}
// ------------------------------------------------------------------ S4: close-up sel darah merah; cadangan menipis, aliran ke pembentukan Hb berkurang
const S4G = [17.3, 17.85, 18.5, 19.3, 20.4, 21.8, 23.2];                   // jarak butir makin jarang
function shot4(t) {
  const bx = 175, by = 700, rx = 715, ry = 700;
  const gone = S4G.filter((tt) => t >= tt).length, level = clamp(0.92 - sm((t - 18.2) / 4.2) * 0.8 + 0.02 - gone * 0.0);
  const flow = clamp(1 - sm((t - 18.2) / 4.0));
  let w = A.board();
  w += arrowD(bx + 150, by, rx - 305, ry, A.C.cyan, 0.3 + 0.7 * flow);
  w += A.box(bx, by, 230, 250, level, {});
  const arr = S4G.filter((tt) => t >= tt + 0.7).length;
  const base = 6, filled = Math.min(8, base + Math.floor(arr / 3));
  const sl = slots9(136, 9).map((p, i) => (i < filled ? { ...p, k: 1.8 } : { ...p, empty: true, k: 1.8, a: 0.7 }));
  w += A.rbc(rx, ry, 262, { slots: sl });
  for (const tt of S4G) { const u = (t - tt) / 0.7; if (u > 0 && u < 1) w += A.grain(lerp(bx + 120, rx - 190, u), by + 10 * Math.sin(u * 9), 30); }
  return w;
}
// ------------------------------------------------------------------ S5: wajah (ukuran sama) -> tanda tanya -> pemeriksaan darah
function shot5(t) {
  const lt = t - CUE.s5[0], cx = 460;
  const z = 1 + 0.03 * clamp(lt / 8);
  const st = faceState(t, { cx, expr: 'berpikir', blinks: [25.2, 29.0], pt: 999, over: { gazeX: 0.5, gazeY: -0.1 } });
  let w = `<g transform="translate(${cx} 690) scale(${z}) translate(${-cx} -690)">${rk(st, { tx: cx - 200 * 2.7 })}</g>`;
  w += A.qmark(950, 560, 220, sm((lt - 0.8) / 0.4), Math.sin(lt * 4) * 8);
  const ba = sm((lt - 4.4) / 0.5);
  w += `<g opacity="${f1(ba)}"><path d="M950 720V790" stroke="${K.gold}" stroke-width="12" stroke-dasharray="16 12"/><path d="M928 780L950 812L972 780Z" fill="${K.gold}"/></g>`;
  w += `<g opacity="${f1(ba)}">${R(660, 830, 380, 330, 'rgba(7,20,43,.92)', 0, `stroke="${K.gold}" stroke-width="6"`)}</g>` + A.bloodTest(850, 1000, 1.0, ba);
  return w;
}
// ------------------------------------------------------------------ S6: laptop dibuka, dolly-in lurus ke layar
const LP = { cx: 705, base: 1110, w: 520, h: 340 };
function shotLaptop(t) {
  const lt = t - CUE.s6[0], open = sm((lt - 0.35) / 0.9), glow = sm((lt - 1.1) / 0.5);
  const st = raka('netral', null, { bags: 1, blink: blinkAtT(t, [32.9]), tilt: -2, breath: Math.sin(t * 2.2) * 0.5 + 0.5, gazeX: 0.6 });
  const lift = Math.sin(clamp((lt - 0.2) / 1.1) * Math.PI);
  st.armR = { wx: 352, wy: 380 - 40 * lift, ex: 400, ey: 480, finger: 0, fa: -90, front: 1, roll: 0 };
  st.armL = { wx: 86, wy: 556, ex: 88, ey: 488, finger: 0, fa: -90, front: 0, roll: 0 };
  const k = 1.95, tx = 290 - 200 * k, ty = 900 - 249 * k;
  let w = r0(0, 1096, 1080, 900, '#173963') + r0(0, 1086, 1080, 14, '#1F4B7D');
  w += rk(st, { k, tx, ty, circles: false, opts: { back: { turn: 0.72, lift: 0 }, logo: false } });
  w += A.laptop(LP.cx, LP.base, LP.w, LP.h, open, glow);
  w += A.hand(LP.cx - LP.w / 2 + 40, LP.base - 20 - 70 * lift);
  const fx = LP.cx, fy = LP.base - LP.h * 0.5, u = sm((lt - 1.3) / 1.8), z = lerp(1, 3.4, u);
  return `<g transform="translate(${f1(fx + (540 - fx) * u)} ${f1(fy + (960 - fy) * u)}) scale(${f1(z)}) translate(${-fx} ${f1(-fy)})">${w}</g>`;
}
const r0 = (x, y, w, h, f) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}"/>`;
// ------------------------------------------------------------------ rekaman web asli (UI tajam)
const WEBN = 662;
const webUrl = (ts) => `../rekam/web/f${String(Math.max(1, Math.min(WEBN, Math.round(ts * 30) + 1))).padStart(4, '0')}.jpg`;
const ACTS = [
  { id: 'materi', t0: 35.4, t1: 37.4, s0: 3.0, s1: 4.6, c0: { x: 20, y: 430, w: 860, h: 740 }, c1: { x: 30, y: 470, w: 900, h: 775 }, label: 'MATERI FK' },
  { id: 'soal', t0: 37.4, t1: 39.4, s0: 9.6, s1: 11.6, c0: { x: 90, y: 440, w: 940, h: 809 }, c1: { x: 100, y: 620, w: 920, h: 792 }, label: 'LATIHAN SOAL' },
  { id: 'kartu', t0: 39.4, t1: 41.2, s0: 6.5, s1: 8.1, c0: { x: 20, y: 440, w: 860, h: 740 }, c1: { x: 40, y: 560, w: 900, h: 775 }, label: 'FLASHCARD INTERAKTIF' },
];
function webCard(t) {
  let s = '';
  const dst = { x: 40, y: 330, w: 1000, h: 861 };
  const act = ACTS.find((a) => t >= a.t0 && t < a.t1); if (!act) return s;
  const lt = t - act.t0, ts = lerp(act.s0, act.s1, clamp(lt / (act.t1 - act.t0))), zu = sm((lt - 0.35) / (act.t1 - act.t0 - 0.6)), cr = { x: lerp(act.c0.x, act.c1.x, zu), y: lerp(act.c0.y, act.c1.y, zu), w: lerp(act.c0.w, act.c1.w, zu) }, sc = dst.w / cr.w;
  const grow = 1 + 0.04 * (1 - sm(lt / 0.4)), a = clamp(lt / 0.06);
  s += `<clipPath id="cw"><rect x="${dst.x}" y="${dst.y}" width="${dst.w}" height="${dst.h}"/></clipPath><g clip-path="url(#cw)" opacity="${f1(a)}"><g transform="translate(540 ${dst.y + dst.h / 2}) scale(${f1(grow)}) translate(-540 ${-(dst.y + dst.h / 2)})"><image href="${need(webUrl(ts))}" x="${f1(dst.x - cr.x * sc)}" y="${f1(dst.y - cr.y * sc)}" width="${f1(1080 * sc)}" height="${f1(1920 * sc)}"/></g></g>`;
  s += `<rect x="${dst.x}" y="${dst.y}" width="${dst.w}" height="${dst.h}" fill="none" stroke="${K.cyan}" stroke-width="6"/>`;
  s += tag(540, 286, act.label, { fs: 34, c: K.gold });
  return s;
}

// ------------------------------------------------------------------ penyusun
let NEED = [];
const need = (u) => { NEED.push(u); return u; };
const cache = new Map();
const load = (u) => { if (!cache.has(u)) { const im = new Image(); im.src = u; cache.set(u, im.decode().catch(() => {})); } return cache.get(u); };
const stars = (t) => { let s = ''; for (let i = 0; i < 26; i++) { const x = (i * 197 + 61) % 1080, y = 260 + ((i * 331) % 1500), on = Math.floor(t * 1.5 + i) % 3 !== 0; if (on) s += `<rect x="${x - x % 24}" y="${y - y % 24}" width="${i % 4 ? 12 : 24}" height="${i % 4 ? 12 : 24}" fill="${i % 3 ? '#5CE1E6' : '#F8C038'}" opacity=".8"/>`; } return s; };
async function compose(t) {
  NEED = []; let ui = '', world = null;
  const sh = ['s1', 's2', 's3', 's4', 's5', 's6', 'web', 'end'].find((k) => t >= CUE[k][0] && t < CUE[k][1]);
  if (sh === 's1') world = { res: [216, 384], w: shotFace(t) };
  if (sh === 's2') world = { res: [270, 480], w: shotPhone(t) };
  if (sh === 's3') world = { res: [360, 640], w: shot3(t) };
  if (sh === 's4') world = { res: [270, 480], w: shot4(t) };
  if (sh === 's5') world = { res: [216, 384], w: shot5(t) };
  if (sh === 's6') world = { res: [270, 480], w: shotLaptop(t) };
  if (sh === 'end') world = { res: [270, 480], w: stars(t) };
  if (sh === 'web') world = { res: [270, 480], w: '' };
  if (world) { await drawWorld(world.w, world.res); $('pix').style.visibility = 'visible'; }
  // ---- transisi match cut S2 -> S3: kartu krem mengecil menjadi kotak FERRITIN
  if (t >= CUE.s3[0] && t < CUE.s3[0] + 0.7) {
    const u = sm((t - CUE.s3[0]) / 0.6), w2 = lerp(1100, 330, u), h2 = lerp(780, 300, u), cx = lerp(540, P3.box[0], u), cy = lerp(960, P3.box[1], u);
    ui += `<g opacity="${f1(1 - sm((t - CUE.s3[0] - 0.45) / 0.25))}">${R(cx - w2 / 2, cy - h2 / 2, w2, h2, K.cream, 0, `stroke="${K.ink}" stroke-width="10"`)}${T(cx, cy - h2 * 0.04, 'FERRITIN', K.ink, lerp(150, 46, u), 800)}${T(cx, cy + h2 * 0.3, 'FACE', '#B3202F', lerp(150, 46, u), 800)}</g>`;
  }
  // ---- teks layar (satu per satu, maksimal dua baris)
  const NOCAP = new URLSearchParams(location.search).has('nocap');
  const cap = (lines, a0, b0, o) => (NOCAP ? '' : caption(lines, win(t, a0, b0, 0.3), o));
  ui += cap(['MATA PANDA =', 'KURANG ZAT BESI?'], 0.2, 5.0, { fs: 64 });
  ui += cap(['Lagi ramai disebut', '‘ferritin face’.'], 5.4, 8.8, { fs: 62, hi: 1 });
  ui += cap(['Ferritin menyimpan', 'cadangan zat besi.'], 9.6, 13.3, { fs: 62 });
  ui += cap(['Zat besi dibutuhkan', 'untuk membuat hemoglobin.'], 13.5, 17.0, { fs: 58 });
  ui += cap(['Jika cadangannya rendah,', 'pembentukan Hb bisa terganggu.'], 18.4, 24.0, { fs: 56, hi: 1 });
  ui += cap(['Tapi mata panda', 'bukan diagnosis.'], 24.4, 28.0, { fs: 64, hi: 1 });
  ui += cap(['Penyebabnya perlu dinilai', 'dengan pemeriksaan yang tepat.'], 28.3, 32.0, { fs: 54 });
  ui += cap(['Penasaran cara', 'kerja tubuh?'], 32.3, 35.2, { fs: 64 });
  ui += cap(['Belajar FK di MEDCOEL'], 35.6, 38.1, { fs: 56, hi: 0 });
  ui += cap(['Materi • latihan soal', '• fitur interaktif'], 38.2, 41.1, { fs: 52 });
  // ---- label diagram
  if (sh === 's3') {
    ui += tag(P3.src[0], 925, 'ZAT BESI', { fs: 32 }) + tag(P3.box[0], 545, 'FERRITIN', { fs: 44, c: K.gold });
    ui += tag(P3.rbc[0] - 20, 945, 'SEL DARAH MERAH', { fs: 30, a: win(t, 13.2, 17.2, 0.4) }) + tag(P3.rbc[0], 540, 'Hb', { fs: 34, c: K.red, a: win(t, 13.2, 17.2, 0.4) });
  }
  if (sh === 's4') {
    ui += tag(175, 905, 'CADANGAN', { fs: 32 }) + tag(540, 1130, 'DI DALAM TUBUH', { fs: 28, c: K.gold, a: 0 }) + tag(715, 395, 'HEMOGLOBIN (Hb)', { fs: 34, c: K.red }) + pillTop('ILUSTRASI MEKANISME', 1);
  }
  if (sh === 's5') { /* tanpa label tambahan: wajah, tanda tanya, pemeriksaan */ }
  // ---- rekaman web asli + penutup
  if (sh === 'web') ui = R(0, 0, 1080, 1920, '#0B1F3A') + webCard(t) + ui;
  if (t >= CUE.s6[1] - 0.25 && t < CUE.web[0] + 0.35) {   // transisi laptop -> web: layar krem melebur ke kartu rekaman
    const a = t < CUE.web[0] ? sm((t - (CUE.s6[1] - 0.25)) / 0.25) : 1 - sm((t - CUE.web[0]) / 0.35);
    ui = ui.replace(/$/, '') + `<g opacity="${f1(a)}">${R(0, 0, 1080, 1920, K.cream)}<image href="${need('../stage/logo-full.webp')}" x="190" y="800" width="700" height="150" preserveAspectRatio="xMidYMid meet"/></g>`;
  }
  if (sh === 'end') {
    const a = clamp((t - CUE.end[0]) / 0.25), a2 = clamp((t - CUE.end[0] - 0.25) / 0.25);
    ui += `<g opacity="${f1(a)}">${R(120, 520, 840, 300, 'rgba(248,247,243,.98)', 0, `stroke="${K.cyan}" stroke-width="8"`)}<image href="${need('../stage/logo-full.webp')}" x="190" y="560" width="700" height="220" preserveAspectRatio="xMidYMid meet"/></g>`;
    ui += `<g opacity="${f1(a2)}">${R(80, 900, 920, 190, K.gold, 0, `stroke="${K.ink}" stroke-width="8"`)}${T(540, 970, 'Gratis di', K.ink, 52, 800)}${T(540, 1052, 'medcoel.com', K.ink, 84, 800)}</g>`;
  }
  return ui;
}
window.renderFrame = async (t) => {
  const ui = await compose(Math.min(t, CUE.dur - 1e-3)); await Promise.all(NEED.map(load));
  $('ui').innerHTML = ui;
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
};
window.__ready = true;

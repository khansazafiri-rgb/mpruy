// "Jamu bekerja bagaimana, dan apakah alami berarti aman?" (1080 x 1920, 30 fps). Flat vector 2D MEDCOEL: Raka kanonik (brand/characters/raka/raka.js via rakaSvg), objek dari kode (art.js).
// Semua waktu dari ../cues.json (sama dengan yang dipakai audio_mix.py). Teks layar digambar sebagai teks (bukan gambar). Rekaman web asli (rekam/web1, rekam/web2) hanya dipotong dan diperbesar.
import { C, lerp, ease, easeOut, easeInOut, backOut, pop, seg, win, r1, rnd, g, rect, circ, txt, kf } from './core.js';
import { raka, rakaSvg, armShape } from '/brand/characters/raka/raka.js';
// palet untuk tenaga kesehatan: rig dan wajah Raka yang sama, hanya warna rambut/kulit berbeda (tidak ada karakter manusia baru)
const PALETTE_NAKES = { skin: '#B97D52', skinShade: '#A66C44', hair: '#3B3446', pants: '#3B3446', shoes: '#2B2630' };
import * as A from './art.js';
import { P } from './art.js';
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const $ = (id) => document.getElementById(id);
const CUES = await (await fetch('../cues.json')).json(); const EV = CUES.ev, S = CUES.sent;
await document.fonts.load('800 40px "Plus Jakarta Sans"'); await document.fonts.load('700 30px "Plus Jakarta Sans"'); await document.fonts.ready;
export const DUR = CUES.dur;
const F = "'Plus Jakarta Sans',sans-serif";
const NOCAP = new URLSearchParams(location.search).has('nocap');
// ------------------------------------------------------------------ teks layar
const textW = (s, size) => s.length * size * 0.6;
function chip(lines, a, o = {}) {
  if (a <= 0.01) return '';
  const size = o.size ?? 54, w = Math.min(960, Math.max(...lines.map((l) => textW(l, size))) + 70), h = lines.length * size * 1.18 + 34, y = o.y ?? 250, fill = o.fill ?? '#fff', ink = o.ink ?? P.ink;
  return `<g opacity="${r1(a * 100) / 100}" transform="translate(0 ${r1((1 - a) * -26)})"><rect x="${r1(540 - w / 2 + 4)}" y="${y + 9}" width="${r1(w)}" height="${r1(h)}" rx="30" fill="#000" opacity=".22"/><rect x="${r1(540 - w / 2)}" y="${y}" width="${r1(w)}" height="${r1(h)}" rx="30" fill="${fill}"/>`
    + lines.map((l, i) => txt(l, 540, y + 17 + size * 0.88 + i * size * 1.18, { size, fill: ink, weight: 800 })).join('') + `</g>`;
}
function tag(x, y, label, a = 1, o = {}) {
  if (a <= 0.01) return '';
  const size = o.size ?? 32, w = textW(label, size) + 44, h = size + 28;
  return `<g opacity="${r1(a * 100) / 100}"><rect x="${r1(x - w / 2)}" y="${r1(y - h / 2)}" width="${r1(w)}" height="${h}" rx="${h / 2}" fill="${o.fill ?? 'rgba(8,24,36,.92)'}" ${o.stroke ? `stroke="${o.stroke}" stroke-width="4"` : ''}/>${txt(label, x, y + size * 0.36, { size, fill: o.ink ?? '#fff', weight: 800 })}</g>`;
}
function caption(t) {
  if (NOCAP) return '';
  const c = CUES.cap.find(([a, b]) => t >= a - 0.04 && t < b + 0.0); if (!c) return '';
  const a = clamp((t - c[0]) / 0.12), size = 50, w = Math.min(980, textW(c[2], size) + 70);
  return `<g opacity="${r1(a * 100) / 100}"><rect x="${r1(540 - w / 2)}" y="1306" width="${r1(w)}" height="96" rx="34" fill="rgba(8,18,30,.92)"/>${txt(c[2], 540, 1371, { size, fill: '#fff', weight: 800 })}</g>`;
}
// ------------------------------------------------------------------ Raka
const skinCol = '#F7BC8E';
function arm(side, wx, wy, extra = {}) { const ex = side === 'R' ? Math.max(330, wx + 70) : Math.min(70, wx - 70); return { wx, wy, ex, ey: wy + 90, finger: 0, fa: -90, front: 1, roll: 0, ...extra }; }
function rk(st, o = {}) {
  const k = o.k ?? 1.8, tx = (o.cx ?? 540) - 200 * k, ty = o.ty ?? 300;
  const svg = rakaSvg(st, { bare: true, uid: o.uid ?? 'r1', shadow: false, ...(o.opts || {}) });
  const hand = (side) => { const h = armShape(side, st['arm' + side]).hand; return [tx + h[0] * k, ty + h[1] * k]; };
  return { svg: `<g transform="translate(${r1(tx)} ${r1(ty)}) scale(${k})">${svg}</g>`, hand, k, tx, ty };
}
const blinkAt = (t, times) => { for (const b of times) if (t > b && t < b + 0.18) return Math.sin(((t - b) / 0.18) * Math.PI); return 0; };
const gripHand = (x, y, k) => `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(24 * k)}" fill="${skinCol}"/>`;
const table = (y = 1130) => rect(0, y - 8, 1080, 16, P.gold) + rect(0, y, 1080, 1920 - y, '#1B3A4B') + rect(0, y + 10, 1080, 70, 'rgba(0,0,0,.14)');
// ------------------------------------------------------------------ A. hook 0 - 4,96
function sceneHook(t) {
  const u = clamp(t / 3.6), uu = ease(u);
  const st = raka(t < 3.3 ? 'berpikir' : 'khawatir', 'netral', { blink: blinkAt(t, [1.7, 3.9]), breath: Math.sin(t * 2.2) * 0.5 + 0.5, gazeY: 0.9, gazeX: 0.1, lean: 1 });
  st.armR = arm('R', lerp(300, 262, uu), lerp(466, 372, uu)); st.armL = arm('L', lerp(104, 138, uu), lerp(470, 380, uu));
  const r = rk(st, { k: 1.8, cx: 540, ty: 300 });
  const [rx, ry] = r.hand('R'), [lx, ly] = r.hand('L');
  const wob = Math.sin(t * 5) * 2.2 * (1 - u);
  let w = A.room(1130).replace(/<rect x="0" y="1122"[\s\S]*$/, '') ;
  w = rect(0, 0, 1080, 1920, '#F4ECDA') + A.room(99999).slice(0, 0) + circ(130, 420, 190, '#EADFC4') + circ(960, 1020, 230, '#EADFC4', 'opacity=".7"') + r.svg;
  w += A.pillStrip(lx - 4, ly - 70 + wob, 0.78, -6 - 4 * (1 - u)) + gripHand(lx - 40, ly + 2, r.k) + A.jamuPack(rx + 10, ry - 112 - wob, 0.72, 5 + 4 * (1 - u)) + gripHand(rx + 36, ry + 4, r.k);
  w += table(1180);
  // percikan "hampir bertemu" + tanda tanya
  const q = pop(t, 3.7, 0.4);
  w += g(txt('?', 0, 0, { size: 150, fill: P.coral, weight: 800 }), { x: 540, y: 760, s: q, o: clamp(q) });
  const z = lerp(1, 1.75, easeInOut(seg(t, 1.6, 4.6)));
  return `<g transform="translate(540 1000) scale(${r1(z * 100) / 100}) translate(-540 -1000)">${w}</g>`;
}
// ------------------------------------------------------------------ B. "Tunggu dulu" 4,96 - 9,06
function sceneVariety(t) {
  const lt = t - 4.96, st = raka('netral', 'sapa', { blink: blinkAt(t, [5.9, 8.2]), breath: Math.sin(t * 2.2) * 0.5 + 0.5, lean: 1, browL: { y: -8, rot: 6 }, browR: { y: -8, rot: -6 }, mouth: { w: 15, up: 4, lo: 12 } });
  const r = rk(st, { k: 1.7, cx: 300, ty: 470 });
  let w = rect(0, 0, 1080, 1920, '#F4ECDA') + circ(130, 420, 190, '#EADFC4') + circ(960, 1020, 230, '#EADFC4', 'opacity=".7"') + r.svg + table(1130);
  const items = [['pack', 590, 5.5], ['bottle', 780, 6.5], ['bottle2', 950, 7.5]];
  const mixes = [['A', 'B', 'A', 'B'], ['C', 'D', 'A', 'C', 'D'], ['B', 'C', 'D', 'D']];
  items.forEach(([k, x, t0], i) => {
    const p = pop(t, t0, 0.45), yy = 1090;
    if (p <= 0) return;
    const sc = clamp(p, 0, 1.15);
    if (k === 'pack') w += g(A.jamuPack(0, 0, 0.78, 0, 1, 'JAMU A'), { x, y: yy - 110, s: sc });
    if (k === 'bottle') w += g(A.jamuBottle(0, 0, 0.8, 0, 1, '#C98A3C', 'jahe'), { x, y: yy - 90, s: sc });
    if (k === 'bottle2') w += g(A.jamuBottle(0, 0, 0.8, 0, 1, '#E6862A', 'kunyit'), { x, y: yy - 90, s: sc });
    // campuran senyawa berbeda di bawah/atas tiap produk
    mixes[i].forEach((kind, j) => { w += A.part(kind, x - 54 + j * 36, 1008 - 150 - (j % 2) * 30 + Math.sin(t * 2 + j + i) * 4, 13, t * 30 + j * 40, clamp(p)); });
  });
  w += tag(540, 1240, '', 0);
  const cx = lerp(20, -20, ease(seg(t, 5.0, 9.0)));
  return `<g transform="translate(${cx} 0)">${w}</g>`;
}
// ------------------------------------------------------------------ C. bahan -> wadah -> senyawa 9,06 - 11,94
const BURST = Array.from({ length: 28 }, (_, i) => ({ k: 'ABCD'[i % 4], a: (i / 28) * Math.PI * 2 + rnd(i) * 0.5, r: 250 + rnd(i + 5) * 300, ph: rnd(i + 9) * 6 }));
function sceneBowl(t) {
  let w = A.bioBg(t);
  const bx = 540, by = 1010, sc = 1.55;
  const hits = EV.pestle.filter((x) => t >= x - 0.1 && t < x + 0.25).length ? Math.abs(Math.sin(((t - (EV.pestle.find((x) => t >= x - 0.1 && t < x + 0.25) - 0.1)) / 0.35) * Math.PI)) : 0;
  const filled = clamp((t - 9.7) / 0.6);
  w += A.bowl(bx, by, sc, -hits * 70, -10 * hits, filled > 0.05 ? '#7E9B4E' : null);
  // tanaman jatuh ke wadah
  ['jahe', 'kunyit', 'daun'].forEach((kind, i) => {
    const t0 = EV.plant[i] - 0.25, u = clamp((t - t0) / 0.25); if (u <= 0) return;
    const shrink = clamp((t - EV.pestle[0]) / 1.0);
    const y = lerp(380, by - 40, u * u), s = (1.05 - 0.25 * (i === 2 ? 0.4 : 0)) * (1 - 0.8 * shrink), o = u < 1 ? 1 : 1 - shrink;
    if (o > 0.02) w += A.plant(kind, bx - 130 + i * 130, y, s, (1 - u) * (i - 1) * 40, o);
  });
  // senyawa terurai
  const b = clamp((t - EV.burst) / 0.7);
  if (b > 0) BURST.forEach((p, i) => {
    const e = easeOut(b), rr = p.r * 0.9 * e, x = bx + Math.cos(p.a) * rr, y = by - 40 + Math.sin(p.a) * rr * 0.8 + Math.sin(t * 2 + p.ph) * 6;
    w += A.part(p.k, x, y, 15, t * 40 + i * 25, clamp(b * 2));
  });
  return w;
}
// ------------------------------------------------------------------ D. perjalanan senyawa di saluran cerna 11,94 - 19,9
const catmull = (pts) => { let d = `M${pts[0][0]} ${pts[0][1]}`; for (let i = 0; i < pts.length - 1; i++) { const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2; d += `C${r1(p1[0] + (p2[0] - p0[0]) / 6)} ${r1(p1[1] + (p2[1] - p0[1]) / 6)} ${r1(p2[0] - (p3[0] - p1[0]) / 6)} ${r1(p2[1] - (p3[1] - p1[1]) / 6)} ${p2[0]} ${p2[1]}`; } return d; };
const TUBE_PTS = [[540, 470], [540, 880], [540, 1250], [540, 1470], [330, 1640], [750, 1800], [330, 1960], [750, 2120], [540, 2300], [540, 2560]];
const TUBE_D = catmull(TUBE_PTS), VESSEL_D = 'M930 1540L930 2790C930 2860 880 2890 840 2900', LIV2CELL = 'M800 2960C800 3130 540 3150 540 3300';
const measure = (d) => { const el = document.createElementNS('http://www.w3.org/2000/svg', 'path'); el.setAttribute('d', d); return { el, L: el.getTotalLength() }; };
const TUBE = measure(TUBE_D), VES = measure(VESSEL_D), L2C = measure(LIV2CELL);
const at = (m, u) => { const p = m.el.getPointAtLength(clamp(u) * m.L); return [p.x, p.y]; };
const G1 = Array.from({ length: 8 }, (_, i) => ({ k: i < 5 ? 'A' : 'B', t0: 12.15 + 0.11 * i, tAbs: 14.0 + 0.19 * i, sAbs: 0.62 + 0.03 * i, tLiv: 16.15 + 0.07 * i, tCell: 17.3 + 0.1 * i, ring: i }));
const G2 = Array.from({ length: 6 }, (_, j) => ({ k: j < 3 ? 'C' : 'D', t0: 12.3 + 0.15 * j, tEnd: 17.2 + 0.1 * j }));
const camKeys = [[11.94, 560], [13.0, 1180], [14.0, 1700], [15.4, 2020], [16.3, 2560], [17.3, 3000], [18.5, 3280], [19.9, 3330]];
function sceneGI(t) {
  const camY = kf(t, camKeys, easeInOut), off = 960 - camY;
  let w = A.bioBg(t, 1920);
  let wl = '';
  // dinding saluran (stroke tebal) + tonjolan vili + lumen
  wl += `<path d="${TUBE_D}" fill="none" stroke="#F2B4A8" stroke-width="176" stroke-linecap="round"/>`;
  wl += `<ellipse cx="540" cy="1250" rx="250" ry="210" fill="#F2B4A8"/>`;
  wl += `<path d="${TUBE_D}" fill="none" stroke="#F7C9BE" stroke-width="150" stroke-dasharray="6 26" stroke-linecap="round" opacity=".9"/>`;
  wl += `<ellipse cx="540" cy="1250" rx="205" ry="165" fill="#8A4152"/><path d="${TUBE_D}" fill="none" stroke="#8A4152" stroke-width="116" stroke-linecap="round"/>`;
  // pembuluh darah
  wl += `<path d="${VESSEL_D}" fill="none" stroke="#7A1F24" stroke-width="52" stroke-linecap="round"/><path d="${VESSEL_D}" fill="none" stroke="#D9382F" stroke-width="38" stroke-linecap="round"/><path d="${LIV2CELL}" fill="none" stroke="#7A1F24" stroke-width="40" stroke-linecap="round"/><path d="${LIV2CELL}" fill="none" stroke="#D9382F" stroke-width="28" stroke-linecap="round"/>`;
  wl += `<path d="M786 1800H930M786 2120H930M330 1640L900 1640M330 1960L900 1960" stroke="#E26B6B" stroke-width="14" stroke-linecap="round" opacity=".55" stroke-dasharray="2 20"/>`;
  wl += A.liver(800, 2890, 1.15) + A.cell(540, 3380, 118, 1, clamp((t - 18.0) / 0.8));
  // gelas di mulut
  const tilt = ease(seg(t, 11.94, 12.3)) * -48; wl += `<g transform="translate(540 380) rotate(${tilt})"><path d="M-62 -70L62 -70L48 90Q0 104 -48 90Z" fill="#E3C58E"/><path d="M-62 -70H62" stroke="#fff" stroke-width="8" opacity=".7"/><rect x="-54" y="-70" width="108" height="44" fill="#7E9B4E" opacity=".9"/></g>`;
  // partikel kelompok 1 (diserap) dan kelompok 2 (tidak diserap)
  G1.forEach((p, i) => {
    let pos, o = 1;
    if (t < p.t0) { pos = [540, 470 - 60]; o = 0; }
    else if (t < p.tAbs) { pos = at(TUBE, p.sAbs * ease(seg(t, p.t0, p.tAbs))); }
    else {
      const lumen = at(TUBE, p.sAbs), vy0 = lumen[1];
      if (t < p.tAbs + 0.45) { const u = ease((t - p.tAbs) / 0.45); pos = [lerp(lumen[0], 930, u), lerp(vy0, vy0, u)]; }
      else if (t < p.tLiv) { const u = (t - p.tAbs - 0.45) / (p.tLiv - p.tAbs - 0.45); pos = [930, lerp(vy0, 2790, easeInOut(u))]; }
      else if (t < p.tLiv + 0.7) { const u = ease((t - p.tLiv) / 0.7); pos = [lerp(930, 800 + (i % 4) * 14 - 20, u), lerp(2790, 2890 + (i % 3) * 10, u)]; }
      else if (t < p.tCell) { pos = at(L2C, easeInOut((t - p.tLiv - 0.7) / (p.tCell - p.tLiv - 0.7))); }
      else { const a = p.ring / 8 * Math.PI * 2 + t * 0.6, rr = 170 + (i % 2) * 20; const base = at(L2C, 1); const q = ease(seg(t, p.tCell, p.tCell + 0.8)); pos = [lerp(base[0], 540 + Math.cos(a) * rr, q), lerp(base[1], 3380 + Math.sin(a) * rr, q)]; }
    }
    if (o > 0) wl += A.part(p.k, pos[0], pos[1], 15, t * 50 + i * 40, o);
  });
  G2.forEach((p, j) => {
    if (t < p.t0) return;
    const u = ease(seg(t, p.t0, p.tEnd)); const pos = at(TUBE, u * 0.995), o = u > 0.96 ? clamp((1 - u) / 0.04) : 1;
    wl += A.part(p.k, pos[0] + (j % 2 ? 14 : -14), pos[1] + (j % 3) * 10 - 10, 15, t * 60 + j * 50, o);
  });
  // roda gigi di hati
  const gl = win(t, 16.3, 17.7, 0.3); if (gl > 0.01) wl += `<g opacity="${r1(gl * 100) / 100}">${A.gear(800, 2890, 34, t * 120)}</g>`;
  w += `<g transform="translate(0 ${r1(off)})">${wl}</g>`;
  // label (mengikuti dunia)
  const L = (x, y, label, a, o = {}) => tag(x, y + off, label, a, o);
  w += L(540, 1050, 'SALURAN CERNA', win(t, 12.4, 15.0, 0.4), { stroke: P.gold }) + L(330, 1880, 'SEBAGIAN DISERAP', win(t, 14.4, 16.6, 0.4), { stroke: P.green }) + L(540, 2420, 'SEBAGIAN TIDAK DISERAP', win(t, 14.8, 18.0, 0.4), { stroke: P.coral });
  w += L(560, 2790, 'DIPROSES TUBUH', win(t, 15.9, 18.2, 0.4), { stroke: P.gold }) + L(540, 3180, 'MUNGKIN MEMENGARUHI', win(t, 18.0, 19.9, 0.4), { stroke: P.gold }) + L(540, 3238, 'PROSES BIOLOGIS TERTENTU', win(t, 18.0, 19.9, 0.4), { stroke: P.gold });
  w += tag(540, 392, 'ILUSTRASI PERJALANAN UMUM', 1, { size: 26, fill: 'rgba(8,24,36,.7)' });
  return w;
}
// ------------------------------------------------------------------ E. senyawa dan efek berbeda tiap bahan 19,9 - 23,14
const COMP = { jahe: ['A', 'A', 'B', 'B', 'B', 'C', 'A', 'B'], kunyit: ['B', 'C', 'C', 'D', 'D', 'A', 'C', 'D'], daun: ['A', 'D', 'D', 'D', 'B', 'A', 'D', 'A'] };
function sceneDiff(t) {
  let w = A.bioBg(t);
  const xs = [190, 540, 890];
  ['jahe', 'kunyit', 'daun'].forEach((kind, i) => {
    const t0 = 20.0 + i * 0.5, p = pop(t, t0, 0.45); if (p <= 0) return;
    const x = xs[i], cy = 760;
    w += g(`<rect x="-150" y="-330" width="300" height="640" rx="40" fill="#fff"/>${A.plant(kind, 0, -210, 1.15)}${txt(kind.toUpperCase(), 0, -100, { size: 34, fill: P.ink, weight: 800 })}` + COMP[kind].map((k, j) => A.part(k, -78 + (j % 4) * 52, -20 + Math.floor(j / 4) * 62 + Math.sin(t * 2 + j) * 3, 16, t * 25 + j * 30)).join('') + `<path d="M0 150V215" stroke="${P.coral}" stroke-width="8" stroke-dasharray="10 10"/>${txt('efek?', 0, 270, { size: 38, fill: P.coral, weight: 800 })}`, { x, y: cy, s: clamp(p, 0, 1.1), ox: 0, oy: 0 });
  });
  const ne = (x, t0) => { const p = pop(t, t0, 0.35); return p > 0 ? g(txt('≠', 0, 0, { size: 96, fill: P.gold, weight: 800 }), { x, y: 790, s: clamp(p, 0, 1.2) }) : ''; };
  w += ne(365, 21.2) + ne(715, 21.9);
  return w;
}
// ------------------------------------------------------------------ F. jahe dan bukti 23,14 - 32,2
function sceneGinger(t) {
  let w = A.bioBg(t); const bgLen = w.length;
  const lane = (y) => `<rect x="130" y="${y - 22}" width="820" height="44" rx="22" fill="#0A3A48"/>` + Array.from({ length: 16 }, (_, i) => rect(150 + i * 52, y - 4, 24, 8, '#1D7B75', 4)).join('');
  w += lane(700);
  w += A.plant('jahe', 200, 700, 1.5 * clamp(pop(t, 23.2, 0.5), 0, 1.15), 0, 1);
  // kartu studi berjalan ke kotak "mungkin membantu"
  const cx = lerp(250, 400, ease(seg(t, 25.6, 27.0))), cs = pop(t, 24.4, 0.45);
  if (cs > 0) w += g(`<rect x="-170" y="-96" width="340" height="192" rx="26" fill="#fff"/><rect x="-170" y="-96" width="340" height="44" rx="26" fill="${P.gold}"/>${txt('STUDI', 0, -64, { size: 28, fill: P.ink, weight: 800 })}${txt('Jahe & mual', 0, 10, { size: 36, fill: P.ink, weight: 800 })}${txt('pada kehamilan', 0, 54, { size: 34, fill: P.teal, weight: 800 })}`, { x: cx, y: 520 + (700 - 520) * ease(seg(t, 25.4, 25.9)), s: clamp(cs, 0, 1.1) });
  // kotak hasil
  const bs = pop(t, 27.3, 0.45);
  if (bs > 0) w += g(`<rect x="-190" y="-110" width="380" height="220" rx="30" fill="${P.green}" opacity=".95"/>${txt('MUNGKIN', 0, -26, { size: 40, fill: '#fff', weight: 800 })}${txt('MEMBANTU', 0, 22, { size: 40, fill: '#fff', weight: 800 })}${txt('mual pada kehamilan', 0, 76, { size: 26, fill: '#D8F5E8', weight: 700 })}`, { x: 790, y: 700, s: clamp(bs, 0, 1.1) });
  // klaim lain: tidak otomatis terbukti
  const claims = [['setiap jamu jahe?', 29.7, 960], ['semua jenis mual?', 31.4, 1110]];
  claims.forEach(([label, t0, y]) => { const p = pop(t, t0, 0.4); if (p > 0) w += g(`<rect x="-300" y="-52" width="600" height="104" rx="30" fill="none" stroke="#9FB8C4" stroke-width="6" stroke-dasharray="16 12"/>${txt(label, -30, 12, { size: 40, fill: '#C7D8DF', weight: 800 })}${txt('?', 245, 22, { size: 70, fill: P.coral, weight: 800 })}${txt('belum otomatis terbukti', 0, 84, { size: 26, fill: P.gold, weight: 700 })}`, { x: 540, y: y - 130, s: clamp(p, 0, 1.08) }); });
  return w.slice(0, bgLen) + `<g transform="translate(540 800) scale(1.1) translate(-540 -800)">${w.slice(bgLen)}</g>`;
}
// ------------------------------------------------------------------ F2. Raka membandingkan klaim kemasan dengan bukti 32,2 - 34,06
function sceneCompare(t) {
  const lt = t - 32.2, g2 = Math.sin(lt * 5) > 0 ? -0.5 : 0.5;
  const st = raka('berpikir', 'netral', { blink: blinkAt(t, [33.1]), breath: Math.sin(t * 2.2) * 0.5 + 0.5, gazeX: g2, gazeY: 0.5, browL: { y: -6, rot: 10 }, browR: { y: 2, rot: -8 } });
  st.armR = arm('R', 270, 410); st.armL = arm('L', 128, 410);
  const r = rk(st, { k: 1.8, cx: 540, ty: 300 }), [rx, ry] = r.hand('R'), [lx, ly] = r.hand('L');
  let w = rect(0, 0, 1080, 1920, '#F4ECDA') + circ(130, 420, 190, '#EADFC4') + circ(960, 1020, 230, '#EADFC4', 'opacity=".7"') + r.svg;
  // kemasan dengan banyak klaim (kiri layar = tangan kiri Raka) dan kartu bukti (kanan)
  w += g(`<rect x="-110" y="-150" width="220" height="300" rx="22" fill="#F7EBC8" stroke="#D2BC83" stroke-width="5"/><rect x="-110" y="-150" width="220" height="50" rx="22" fill="#2BA676"/>${txt('KLAIM', 0, -116, { size: 26, fill: '#fff', weight: 800 })}` + ['pegal', 'mual', 'kolesterol', 'semua penyakit'].map((l, i) => txt(l, 0, -56 + i * 46, { size: 26, fill: P.ink, weight: 700 }) + `<circle cx="84" cy="${-64 + i * 52}" r="0" fill="none"/>`).join(''), { x: lx - 8, y: ly - 105, r: -6 });
  w += gripHand(lx + 24, ly + 4, r.k);
  w += g(`<rect x="-112" y="-110" width="224" height="220" rx="22" fill="#fff" stroke="${P.gold}" stroke-width="6"/>${txt('BUKTI', 0, -66, { size: 26, fill: P.teal, weight: 800 })}${txt('mual pada', 0, -20, { size: 28, fill: P.ink, weight: 700 })}${txt('kehamilan', 0, 16, { size: 28, fill: P.ink, weight: 700 })}`, { x: rx + 8, y: ry - 85, r: 6 });
  w += A.tick(rx + 82, ry - 168, 1, P.green) + gripHand(rx - 22, ry + 6, r.k);
  const q = pop(t, 33.0, 0.4); w += g(txt('?', 0, 0, { size: 120, fill: P.coral, weight: 800 }), { x: lx - 90, y: ly - 330, s: q, o: clamp(q) });
  w += table(1180);
  return w;
}
// ------------------------------------------------------------------ G. tangga bukti 34,06 - 47,5
const STEP = [{ x: 60, top: 1130 }, { x: 390, top: 930 }, { x: 720, top: 730 }];
const TIER = [{ n: ['JAMU'], s: ['penggunaan', 'empiris'], col: '#F29A2E' }, { n: ['OBAT HERBAL', 'TERSTANDAR'], s: ['standardisasi +', 'uji praklinik'], col: '#2BA676' }, { n: ['FITOFARMAKA'], s: ['uji klinik', 'pada manusia'], col: '#1D7B75' }];
function tierCard(i, a) {
  const tc = TIER[i], w = 310, h = 270;
  return `<g><rect x="5" y="9" width="${w}" height="${h}" rx="28" fill="#000" opacity=".18"/><rect width="${w}" height="${h}" rx="28" fill="#fff"/><rect width="${w}" height="16" rx="8" y="0" fill="${tc.col}"/>`
    + tc.n.map((l, k) => txt(l, w / 2, 74 + k * 44 - (tc.n.length === 1 ? -14 : 0), { size: tc.n.length > 1 ? 38 : 44, fill: P.ink, weight: 800 })).join('')
    + tc.s.map((l, k) => txt(l, w / 2, 170 + k * 38, { size: 32, fill: '#3d5b56', weight: 800 })).join('') + `</g>`;
}
function sceneTiers(t) {
  let w = rect(0, 0, 1080, 1920, '#E6F1EC') + circ(940, 380, 220, '#D3E7DE') + circ(100, 1500, 260, '#D3E7DE');
  STEP.forEach((s, i) => { w += rect(s.x, s.top, 330, 1290 - s.top, ['#1B3A4B', '#1D5C68', '#1D7B75'][i], 0) + rect(s.x, s.top - 10, 330, 14, P.gold, 4); });
  w += `<path d="M120 1200L1010 560" stroke="#9FB8C4" stroke-width="10" stroke-dasharray="4 22" stroke-linecap="round" opacity=".7"/><path d="M980 575l30 -16l-8 34z" fill="#9FB8C4"/>`;
  w += txt('BUKTI ↑', 540, 1252, { size: 28, fill: '#E6F1EC', weight: 800 });
  [0, 1, 2].forEach((i) => {
    const ta = EV.cards[i], u = clamp((t - (ta - 0.9)) / 0.9); if (u <= 0) return;
    const e = easeOut(u), x0 = STEP[i].x + 15 - 430, y0 = STEP[i].top + 40, x1 = STEP[i].x + 15, y1 = STEP[i].top - 292;
    const x = lerp(x0, x1, e), y = lerp(y0, y1, e) - Math.sin(e * Math.PI) * 180, land = u >= 1 ? Math.max(0, 1 - (t - ta) / 0.25) * 8 : 0;
    w += `<g transform="translate(${r1(x)} ${r1(y + land)}) rotate(${r1((1 - e) * -10)})">${tierCard(i, 1)}</g>`;
  });
  // tidak otomatis naik kategori
  const na = win(t, 41.0, 47.4, 0.4);
  if (na > 0.01) w += `<g opacity="${r1(na * 100) / 100}">${A.cross(480, 1000, 0.8)}<path d="M360 1060Q420 880 520 840" stroke="${P.coral}" stroke-width="8" stroke-dasharray="14 12" fill="none" stroke-linecap="round"/></g>`;
  return w;
}
// ------------------------------------------------------------------ H. interaksi 47,5 - 54,48
function sceneInteract(t) {
  let w = A.bioBg(t);
  w += `<rect x="60" y="470" width="960" height="720" rx="120" fill="#12606E" opacity=".75" stroke="#9DE0BD" stroke-width="6" stroke-dasharray="20 16"/>` + txt('RUANG TUBUH', 540, 540, { size: 32, fill: '#9DE0BD', weight: 800, ls: 3 });
  const meet = ease(seg(t, 52.4, 53.4));
  for (let i = 0; i < 10; i++) { const k = 'ABCD'[i % 4], bx = 230 + (i % 5) * 84 + meet * 150, by = 740 + Math.floor(i / 5) * 110 + Math.sin(t * 1.6 + i) * 10; w += A.part(k, bx, by, 31, t * 35 + i * 30, clamp((t - 47.6) / 0.5)); }
  for (let i = 0; i < 4; i++) { const x = lerp(1200, 760 - i * 24, easeOut(seg(t, 52.2 + i * 0.1, 53.4))), y = 700 + i * 92; w += A.pill(x, y, 1.9, -10 + i * 8, clamp((t - 52.1) / 0.3)); }
  w += g(A.jamuBottle(0, 0, 0.7, 0, 1, '#C98A3C', 'jahe'), { x: 150, y: 640, s: pop(t, 47.7, 0.4), o: 1 }) + tag(150, 800, 'HERBAL', clamp((t - 47.9) / 0.3), { size: 30 });
  w += g(A.pillStrip(0, 0, 0.85), { x: 900, y: 610, s: pop(t, 52.0, 0.4) }) + tag(900, 730, 'OBAT RUTIN', clamp((t - 52.2) / 0.3), { size: 30 });
  const es = pop(t, 50.5, 0.4); if (es > 0) w += g(A.warnTri(0, 0, 1.3) + txt('efek samping', 0, 130, { size: 38, fill: '#fff', weight: 800 }) + txt('bisa terjadi', 0, 176, { size: 38, fill: P.gold, weight: 800 }), { x: 540, y: 960, s: clamp(es, 0, 1.1), o: win(t, 50.5, 52.3, 0.3) });
  const ia = pop(t, 53.4, 0.45); if (ia > 0) w += g(A.warnTri(0, -40, 1.4) + tag(0, 120, 'interaksi mungkin terjadi', 1, { size: 36, stroke: P.gold }), { x: 540, y: 960, s: clamp(ia, 0, 1.1) });
  return w;
}
// ------------------------------------------------------------------ I. produk ilegal 54,48 - 60,26
function sceneIllegal(t) {
  let w = rect(0, 0, 1080, 1920, '#14202C') + circ(900, 420, 240, '#1B2C3B') + circ(140, 1450, 260, '#1B2C3B');
  const open = ease(seg(t, 55.7, 56.7));
  w += g(`<ellipse cx="0" cy="190" rx="220" ry="22" fill="#000" opacity=".3"/><rect x="-170" y="-130" width="340" height="320" rx="26" fill="#3A4756" stroke="#566678" stroke-width="6"/><rect x="-170" y="60" width="340" height="60" fill="${P.red}"/>${txt('TANPA IZIN EDAR', 0, 102, { size: 32, fill: '#fff', weight: 800 })}${txt('"JAMU"', 0, -30, { size: 56, fill: '#9AA9B8', weight: 800 })}<path d="M-170 -130l${170 - 20 * open} ${-60 * open}l${170 + 20 * open} ${60 * open}Z" fill="#4C5A6A"/>`, { x: 540, y: 900, s: 1.7 * clamp(pop(t, 54.6, 0.5), 0, 1.05) });
  // bahan kimia obat tersembunyi keluar
  const hid = ['#F7A6B8', '#9FD0F2', '#FFFFFF', '#F8C038'];
  hid.forEach((c, i) => { const p = ease(seg(t, 56.5 + i * 0.12, 57.4 + i * 0.12)); if (p > 0) w += A.pill(lerp(540, 270 + i * 180, p), lerp(800, 520 - (i % 2) * 50 + Math.sin(t * 3 + i) * 6, p), 1.6, i * 30 - 40, 1, c); });
  w += tag(540, 420, 'BAHAN KIMIA OBAT (BKO) TERSEMBUNYI', clamp((t - 57.2) / 0.3), { size: 32, stroke: P.coral });
  const sp = pop(t, 58.2, 0.4); if (sp > 0) w += g(`<rect x="-250" y="-60" width="500" height="120" rx="14" fill="none" stroke="${P.red}" stroke-width="10"/>${txt('PRODUK ILEGAL', 0, 24, { size: 62, fill: P.red, weight: 800 })}`, { x: 540, y: 1190, s: clamp(sp, 0, 1.1), r: -8 });
  const lg = pop(t, 59.0, 0.45); if (lg > 0) w += g(A.jamuPack(0, 0, 0.6, 0, 1, 'JAMU') + A.tick(100, -100, 1.2, P.green) + tag(0, 150, 'bukan semua jamu', 1, { size: 30, stroke: P.green }), { x: 190, y: 1050, s: clamp(lg, 0, 1.1) });
  return w;
}
// ------------------------------------------------------------------ J1. cek kemasan 60,26 - 65,74
const PACK_Z = [{ y: -105, h: 60, label: 'IZIN EDAR' }, { y: -40, h: 66, label: 'KOMPOSISI' }, { y: 28, h: 66, label: 'ATURAN PAKAI' }, { y: 100, h: 46, label: 'KLAIM' }];
function examPack(t) {
  let s = `<rect x="-120" y="-160" width="240" height="320" rx="26" fill="#F7EBC8" stroke="#D2BC83" stroke-width="5"/>`;
  PACK_Z.forEach((z, i) => {
    const on = clamp((t - (EV.check[i] - 0.5)) / 0.3) * clamp(1 - (t - (EV.check[i] + 0.7)) / 0.3);
    s += `<rect x="-106" y="${z.y}" width="212" height="${z.h}" rx="12" fill="${i === 3 ? '#F8C038' : '#FFF8E6'}" stroke="${on > 0.1 ? P.teal : '#E2D3A6'}" stroke-width="${3 + 5 * on}"/>`;
    s += txt(z.label, -96, z.y + 22, { size: 15, fill: P.teal, weight: 800, anchor: 'start' });
    if (i === 0) s += rect(-96, z.y + 32, 110, 14, '#E2D3A6', 7, 'stroke-dasharray="6 4"') + rect(20, z.y + 32, 70, 14, '#E2D3A6', 7);
    if (i === 1) for (let k = 0; k < 2; k++) s += rect(-96, z.y + 30 + k * 18, 150 - k * 30, 9, '#CDBE93', 4);
    if (i === 2) for (let k = 0; k < 2; k++) s += rect(-96, z.y + 30 + k * 18, 170 - k * 50, 9, '#CDBE93', 4);
    if (i === 3) s += rect(-96, z.y + 26, 120, 9, '#7B5A10', 4, 'opacity=".5"');
  });
  s += `<rect x="-120" y="-160" width="240" height="40" rx="26" fill="#2BA676"/>${txt('JAMU', 0, -130, { size: 24, fill: '#fff', weight: 800 })}`;
  return s;
}
function sceneCheckPack(t) {
  let w = rect(0, 0, 1080, 1920, '#F4ECDA') + circ(140, 480, 200, '#EADFC4') + circ(960, 1400, 260, '#EADFC4', 'opacity=".7"');
  const px = 540, py = 800, ps = 2.3, ZS = (z) => py + (z.y + z.h / 2) * ps;
  w += g(examPack(t), { x: px, y: py, s: ps * clamp(pop(t, 60.3, 0.4), 0, 1.04) });
  const idx = EV.check.findIndex((c, i) => t < (EV.check[i + 1] ?? 99) - 0.0), cur = Math.max(0, idx);
  // lengan Raka dan telunjuk menunjuk zona saat ini
  const tgt = PACK_Z[cur], ty = ZS(tgt), tx = px + 180 * ps * 0.5 - 40;
  const fx = lerp(tx + 60, tx, 0.5), fy = ty;
  const ax = fx + 150, ay = fy + 150;
  w += `<path d="M${r1(ax + 260)} ${r1(ay + 420)}L${r1(ax)} ${r1(ay)}" stroke="#1D7B75" stroke-width="80" stroke-linecap="round"/><circle cx="${r1(ax)}" cy="${r1(ay)}" r="44" fill="${skinCol}"/><path d="M${r1(ax)} ${r1(ay)}L${r1(fx + 14)} ${r1(fy + 14)}" stroke="${skinCol}" stroke-width="34" stroke-linecap="round"/>`;
  PACK_Z.forEach((z, i) => { const a = clamp((t - EV.check[i]) / 0.25); if (a > 0) w += g(A.tick(0, 0, 1.4), { x: px + 140 * ps * 0.5 + 64, y: ZS(z), s: backOut(a), o: 1 }); });
  return w;
}
// ------------------------------------------------------------------ J2. tanya tenaga kesehatan 65,74 - 71,36
function sceneAsk(t) {
  const st = raka('khawatir', 'netral', { blink: blinkAt(t, [67.8]), breath: Math.sin(t * 2.2) * 0.5 + 0.5, gazeX: 0.6, browL: { y: -6, rot: 10 }, browR: { y: -6, rot: -10 } });
  st.armR = arm('R', 300, 470); st.armL = arm('L', 100, 470);
  const r = rk(st, { k: 1.8, cx: 270, ty: 500 });
  let w = rect(0, 0, 1080, 1920, '#F4ECDA') + circ(140, 480, 200, '#EADFC4') + circ(960, 1400, 260, '#EADFC4', 'opacity=".7"') + r.svg;
  // tenaga kesehatan: rig Raka dengan jas dan palet dosen
  const ds = raka(t > 70.0 ? 'senang' : 'netral', 'netral', { blink: blinkAt(t, [69.9]), breath: Math.sin(t * 2.2 + 1) * 0.5 + 0.5, flip: 1 });
  const slide = easeOut(seg(t, EV.tenaga - 0.3, EV.tenaga + 0.5)), dr = rk(ds, { k: 1.8, cx: lerp(1400, 800, slide), ty: 500, uid: 'r2', opts: { outfit: 'jas', palette: PALETTE_NAKES, logo: false } });
  w += dr.svg;
  w += table(1260);
  const chips = [['HAMIL', 66.0, 100], ['PENYAKIT TERTENTU', 67.1, 0], ['RUTIN MINUM OBAT', 68.0, 0]];
  const xs = [150, 450, 800]; chips.forEach(([l, t0], i) => { const p = pop(t, t0, 0.35); if (p > 0) w += g(tag(0, 0, l, 1, { size: 32, fill: '#fff', ink: P.ink, stroke: P.coral }), { x: [170, 520, 860][i] * 0 + [120, 410, 830][i], y: 415, s: clamp(p, 0, 1.08) }); });
  const bp = pop(t, EV.tenaga + 0.3, 0.45); if (bp > 0) w += g(A.tick(0, 0, 1.5), { x: 800, y: 520, s: clamp(bp, 0, 1.15) });
  return w;
}
// ------------------------------------------------------------------ J3. jamu tidak menggantikan pengobatan 71,36 - 74,95
function sceneClose(t) {
  const lt = t - 71.36, cl = ease(seg(t, EV.close, EV.close + 0.7));
  const st = raka(lt > 1.4 ? 'lega' : 'berpikir', 'netral', { blink: blinkAt(t, [72.1, 74.1]), breath: Math.sin(t * 2.2) * 0.5 + 0.5, tilt: lt > 1.4 ? Math.sin(lt * 4) * 2 : 0, lean: 1 });
  st.armR = arm('R', 262, 440); st.armL = arm('L', 138, 450);
  const r = rk(st, { k: 1.8, cx: 540, ty: 300 }), [rx, ry] = r.hand('R'), [lx, ly] = r.hand('L');
  let w = rect(0, 0, 1080, 1920, '#F4ECDA') + circ(130, 420, 190, '#EADFC4') + circ(960, 1020, 230, '#EADFC4', 'opacity=".7"') + r.svg;
  w += A.pillStrip(lx - 20, ly - 70, 0.78, -6) + gripHand(lx - 52, ly + 2, r.k) + A.jamuPack(rx + 14, ry - 112, 0.72, 5, 1, 'ALAMI', 1 - cl) + gripHand(rx + 38, ry + 4, r.k);
  w += table(1180);
  // buku catatan naik (awal transisi ke web)
  return w;
}
// ------------------------------------------------------------------ K. transisi catatan -> web, L. web asli, M. penutup
const WB = CUES.t_web, TO = CUES.t_outro;
const srcRate = (a, b, ta, tb, t) => lerp(a, b, clamp((t - ta) / (tb - ta)));
function webSeg(t) {                                           // [clip, waktu sumber, y0 potong, label]
  const v = EV.web;
  if (t < v[1]) return ['web1', srcRate(0.1, 1.6, v[0], v[1], t), 110, 'PILIH MATA KULIAH'];
  if (t < v[2]) return ['web1', srcRate(1.8, 3.4, v[1], v[1] + 2.4, t), 110, 'PILIH BAB'];
  if (t < v[3]) return ['web1', srcRate(4.1, 5.5, v[2], v[3], t), 40, 'MATERI PER BAB'];
  if (t < v[3] + 0.7) return ['web1', srcRate(8.3, 9.0, v[3], v[3] + 0.7, t), 150, 'LATIHAN SOAL'];
  if (t < v[4]) return ['web1', srcRate(11.0, 11.6, v[3] + 0.7, v[4], t), 300, 'JAWABAN + PEMBAHASAN'];
  if (t < v[5]) return ['web2', srcRate(0.5, 2.1, v[4], v[5], t), 100, 'SIMULASI DOKTER'];
  return ['web2', srcRate(4.0, 6.3, v[5], CUES.dur, t), 40, 'SIMULASI DOKTER'];
}
const webUrl = (clip, ts) => `../rekam/${clip}/f${String(Math.max(1, Math.round(ts * 30) + 1)).padStart(4, '0')}.jpg`;
let NEED = [];
const need = (u) => { NEED.push(u); return u; };
const cache = new Map();
const load = (u) => { if (!cache.has(u)) { const im = new Image(); im.src = u; cache.set(u, im.decode().catch(() => {})); } return cache.get(u); };
function sceneWeb(t, final) {
  const [clip, ts, y0, label] = webSeg(t);
  const dst = final ? { x: 40, y: 440, w: 1000, h: 640 } : { x: 40, y: 330, w: 1000, h: 940 };
  const sc = dst.w / 960, ch = dst.h / sc;
  let s = rect(0, 0, 1080, 1920, '#0B2A3A') + `<clipPath id="cw"><rect x="${dst.x}" y="${dst.y}" width="${dst.w}" height="${dst.h}" rx="26"/></clipPath><g clip-path="url(#cw)"><rect x="${dst.x}" y="${dst.y}" width="${dst.w}" height="${dst.h}" fill="#F4ECDA"/><image href="${need(webUrl(clip, ts))}" x="${dst.x}" y="${r1(dst.y - y0 * sc)}" width="${r1(960 * sc)}" height="${r1(1180 * sc)}"/></g><rect x="${dst.x}" y="${dst.y}" width="${dst.w}" height="${dst.h}" rx="26" fill="none" stroke="#9DE0BD" stroke-width="6"/>`;
  if (!final) s += tag(540, 288, label, 1, { size: 34, stroke: P.gold });
  return s;
}
function notebook(t) {
  const u = easeInOut(seg(t, 73.6, 75.3)); if (u <= 0) return '';
  const w = lerp(420, 1120, u), h = lerp(560, 2000, u), cx = lerp(820, 540, u), cy = lerp(1000, 960, u), a = 1 - clamp((t - WB) / 0.5);
  let s = `<g opacity="${r1(a * 100) / 100}"><rect x="${r1(cx - w / 2)}" y="${r1(cy - h / 2)}" width="${r1(w)}" height="${r1(h)}" rx="${r1(28 * (1 - u * 0.8))}" fill="#FFFDF6" stroke="#D9C9A0" stroke-width="6"/>`;
  const sc = lerp(1, 2.0, u);
  ['Izin edar', 'Komposisi', 'Aturan pakai', 'Klaim'].forEach((l, i) => { const y = cy - 150 * sc + i * 100 * sc; s += A.tick(cx - 150 * sc, y, 1.0 * sc) + txt(l, cx - 100 * sc, y + 14 * sc, { size: 44 * sc, fill: P.ink, weight: 800, anchor: 'start' }); });
  return s + `</g>`;
}
function endCard(t) {
  const a = clamp((t - EV.url) / 0.5), a2 = clamp((t - EV.url - 0.4) / 0.4), a3 = clamp((t - EV.url - 0.8) / 0.4);
  let s = `<g opacity="${r1(a * 100) / 100}"><rect x="130" y="230" width="820" height="170" rx="46" fill="#FBF7EA"/><image href="${need('../stage/logo-full.webp')}" x="215" y="248" width="650" height="134" preserveAspectRatio="xMidYMid meet"/></g>`;
  s += `<g opacity="${r1(a2 * 100) / 100}"><rect x="90" y="1110" width="900" height="94" rx="47" fill="${P.teal}"/>${txt('Belajar FK gratis di MEDCOEL', 540, 1174, { size: 46, fill: '#fff', weight: 800 })}</g>`;
  s += `<g opacity="${r1(a3 * 100) / 100}"><rect x="140" y="1212" width="800" height="84" rx="42" fill="${P.gold}"/>${txt('medcoel.com', 540, 1272, { size: 56, fill: P.ink, weight: 800 })}</g>`;
  return s;
}
// ------------------------------------------------------------------ penyusun
function compose(t) {
  NEED = []; let s = '', chips = '';
  const ch = (lines, a0, b0, o) => (chips += chip(lines, win(t, a0, b0, 0.3), o));
  if (t < 4.96) s = sceneHook(t);
  else if (t < 9.06) s = sceneVariety(t);
  else if (t < 11.94) s = sceneBowl(t);
  else if (t < 19.9) s = sceneGI(t);
  else if (t < 23.14) s = sceneDiff(t);
  else if (t < 32.2) s = sceneGinger(t);
  else if (t < 34.06) s = sceneCompare(t);
  else if (t < 47.5) s = sceneTiers(t);
  else if (t < 54.48) s = sceneInteract(t);
  else if (t < 60.26) s = sceneIllegal(t);
  else if (t < 65.74) s = sceneCheckPack(t);
  else if (t < 71.36) s = sceneAsk(t);
  else if (t < WB) s = sceneClose(t);
  else s = sceneWeb(t, t >= EV.url - 0.3);
  if (t >= 73.6 && t < WB + 0.55) s += notebook(t);
  if (t >= EV.url - 0.3) s += endCard(t);
  // teks layar utama
  ch(['ALAMI = PASTI AMAN?'], 0.15, 4.9, { fill: P.coral, ink: '#fff', size: 62 });
  ch(['Bukan satu obat,', 'satu cara kerja'], 5.2, 9.0, { size: 52 });
  ch(['Satu ramuan, banyak senyawa'], 9.1, 19.8, { size: 50 });
  ch(['Senyawa dan efek', 'berbeda tiap bahan'], 20.0, 23.0, { size: 50 });
  ch(['Bukti untuk satu keluhan', '≠ semua keluhan'], 27.9, 34.0, { size: 48 });
  ch(['Tingkat pembuktian'], 34.2, 36.9, { size: 54 });
  ch(['Kategori mengikuti', 'bukti dan izin tiap produk'], 40.0, 47.4, { size: 40, y: 250 });
  ch(['Alami ≠ bebas risiko'], 47.6, 52.5, { size: 54, fill: P.coral, ink: '#fff' });
  ch(['Cek interaksi'], 52.6, 54.4, { size: 58, fill: P.gold });
  ch(['Waspadai produk ilegal'], 54.6, 60.2, { size: 54, fill: P.red, ink: '#fff' });
  ch(['Cek izin • komposisi • aturan pakai'], 60.4, 65.6, { size: 44 });
  ch(['Tanyakan dulu ke tenaga kesehatan'], 65.9, 71.0, { size: 44 });
  ch(['Jamu tidak menggantikan', 'pengobatan yang kamu perlukan'], 71.5, 74.8, { size: 44 });
  return s + chips + caption(t);
}
window.renderFrame = async (t) => {
  const s = compose(Math.min(t, CUES.dur - 1e-3)); await Promise.all(NEED.map(load));
  $('scene').innerHTML = s; await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
};
window.__ready = true;

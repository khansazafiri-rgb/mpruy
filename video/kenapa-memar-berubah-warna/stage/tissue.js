// Penampang kulit (dunia penampang; koordinat = layar saat kamera z=1, pusat (540, 960)): PERMUKAAN KULIT DI ATAS (y = YS), jaringan di bawah, pembuluh kecil di dalam jaringan.
// Urutan: benturan -> pembuluh kecil cedera -> sel darah merah merembes ke jaringan (kulit tetap utuh) -> terperangkap -> sel pembersih menguraikan hemoglobin -> pigmen berubah (kemerahan/keunguan -> kehijauan -> kekuningan -> memudar).
// Ilustrasi skematis edukatif: jumlah sel, ukuran relatif (sel darah merah ~ sepertiga diameter pembuluh kecil), dan gerak disederhanakan.
import { f1, clamp, lerp, sm, eo, eio, K, mixc } from './common.js';
import { bruiseAt, bruiseGrad } from './bruise.js';

export const TS = { ys: 780, x: 540, vy: 1090, vh: 44 };
export const T_IMPACT = 6.30, T_BREAK = 6.52;
const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const dentAmp = (t) => { const d = t - T_IMPACT; if (d < 0 || d > 0.9) return 0; return d < 0.12 ? 26 * eo(d / 0.12) : 26 * Math.exp(-(d - 0.12) * 5.5) * Math.cos((d - 0.12) * 5); };
const dentAt = (x, t, decay = 1) => dentAmp(t) * decay * Math.exp(-Math.pow((x - TS.x) / 95, 2));
const band = (top, bot, x0 = -220, x1 = 1300, st = 20) => { let a = '', b = ''; for (let x = x0; x <= x1; x += st) { a += `${a ? 'L' : 'M'}${x} ${f1(top(x))}`; } for (let x = x1; x >= x0; x -= st) b += `L${x} ${f1(bot(x))}`; return a + b + 'Z'; };
// ------------------------------------------------------------------ lapisan jaringan
export function layers(t) {
  const y = TS.ys, E1 = (x) => y + dentAt(x, t, 1), E2 = (x) => y + 34 + dentAt(x, t, 0.9), D2 = (x) => y + 200 + dentAt(x, t, 0.6), F2 = (x) => y + 520 + dentAt(x, t, 0.25);
  let s = `<path d="${band(E2, D2)}" fill="${K.derm}"/><path d="${band(D2, F2)}" fill="${K.fat}"/><path d="${band(F2, () => 2400)}" fill="${K.musc}"/><path d="${band(F2, (x) => F2(x) + 26)}" fill="${K.muscD}" opacity=".5"/>`;
  // sel lemak
  for (let r = 0; r < 6; r++) for (let c = -1; c < 17; c++) { const cx = c * 78 + (r % 2) * 39 + rnd(r * 31 + c) * 14 - 6, cy = y + 252 + r * 46 + rnd(r * 17 + c) * 10, rr = 22 + rnd(r * 7 + c * 3) * 8; if (cy + rr < F2(cx) - 6) s += `<circle cx="${f1(cx)}" cy="${f1(cy + dentAt(cx, t, 0.3))}" r="${f1(rr)}" fill="${K.fatC}" stroke="${K.fatD}" stroke-width="2.5"/>`; }
  // serat kolagen di dermis
  for (let i = 0; i < 9; i++) { const yy = y + 70 + i * 16; s += `<path d="M-200 ${yy}Q0 ${yy - 10} 200 ${yy}T600 ${yy}T1000 ${yy}T1300 ${yy}" fill="none" stroke="${K.dermD}" stroke-width="3" opacity=".55" transform="translate(0 ${f1(dentAt(540, t, 0.6) * 0.8)})"/>`; }
  s += `<path d="${band(E1, E2)}" fill="${K.epi}"/><path d="M-220 ${f1(E1(-220))}${(() => { let q = ''; for (let x = -200; x <= 1300; x += 20) q += `L${x} ${f1(E1(x))}`; return q; })()}" fill="none" stroke="${K.epiD}" stroke-width="6" stroke-linejoin="round"/>`;
  return s;
}
// ------------------------------------------------------------------ pembuluh kecil + sel darah merah
const vesselPath = (x0, x1) => `M${x0} ${TS.vy}L${x1} ${TS.vy}`;
export const rbcSvg = (x, y, r = 1, rot = 0, a = 1) => a <= 0.01 ? '' : `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)}) scale(${f1(r * 100) / 100})" opacity="${f1(a)}"><ellipse rx="17" ry="11" fill="${K.rbc}" stroke="${K.rbcD}" stroke-width="2.6"/><ellipse rx="8" ry="4" fill="${K.rbcD}" opacity=".35"/><path d="M-12 -5Q0 -10 12 -5" fill="none" stroke="${K.rbcHi}" stroke-width="2.2" stroke-linecap="round" opacity=".8"/></g>`;
const LOOPS = [250, 830];
export function vessels(t) {
  const vy = TS.vy, hh = TS.vh, brk = clamp((t - T_BREAK) / 0.25);
  let s = `<defs><mask id="vm"><rect x="-300" y="500" width="1700" height="900" fill="#fff"/>${brk > 0 ? `<g fill="#000"><path d="M${f1(TS.x - 34 * brk)} ${vy - hh - 6}L${f1(TS.x - 18)} ${vy - 6}L${f1(TS.x + 18)} ${vy - 6}L${f1(TS.x + 34 * brk)} ${vy - hh - 6}Z"/></g>` : ''}</mask></defs>`;
  s += `<g mask="url(#vm)"><rect x="-220" y="${vy - hh - 8}" width="1520" height="${hh * 2 + 16}" rx="${hh + 8}" fill="${K.vessD}"/><rect x="-220" y="${vy - hh}" width="1520" height="${hh * 2}" rx="${hh}" fill="${K.vess}"/><rect x="-220" y="${vy - hh + 8}" width="1520" height="${hh * 2 - 16}" rx="${hh - 8}" fill="#F8C9CF"/></g>`;
  // gelung pembuluh kecil ke dermis
  for (const x of LOOPS) {
    const broken = x === 830 && t > T_BREAK + 0.1, top = 900 + dentAt(x, t, 0.5);
    s += `<path d="M${x - 24} ${vy - hh + 6}L${x - 24} ${top + 20}Q${x - 24} ${top - 8} ${x} ${top - 8}Q${x + 24} ${top - 8} ${x + 24} ${top + 20}L${x + 24} ${vy - hh + 6}" fill="none" stroke="${K.vessD}" stroke-width="34" stroke-linecap="round"/><path d="M${x - 24} ${vy - hh + 6}L${x - 24} ${top + 20}Q${x - 24} ${top - 8} ${x} ${top - 8}Q${x + 24} ${top - 8} ${x + 24} ${top + 20}L${x + 24} ${vy - hh + 6}" fill="none" stroke="#F8C9CF" stroke-width="22" stroke-linecap="round"/>`;
    if (broken) s += `<circle cx="${x}" cy="${top - 8}" r="20" fill="${K.derm}"/>`;
  }
  return s;
}
/** sel darah merah yang mengalir dalam pembuluh (kiri -> kanan) */
export function flowing(t) {
  let s = ''; const N = 26;
  for (let i = 0; i < N; i++) { const x = ((i * 61.3 + 58 * t) % 1560) - 240, y = TS.vy + (rnd(i * 5 + 1) - 0.5) * 36, nearGap = t > T_BREAK && Math.abs(x - TS.x) < 90 && rnd(i) > 0.45; if (nearGap) continue; s += rbcSvg(x, y, 1, (rnd(i * 3) - 0.5) * 40); }
  for (const x of LOOPS) for (let k = 0; k < 3; k++) { const u = ((t * 0.42 + k / 3) % 1), up = u < 0.5, v = up ? u * 2 : (u - 0.5) * 2; if (x === 830 && t > T_BREAK + 0.2 && up && v > 0.55) continue; const top = 900 + dentAt(x, t, 0.5); const yy = up ? lerp(TS.vy - TS.vh + 6, top + 4, v) : lerp(top + 4, TS.vy - TS.vh + 6, v), xx = up ? x - 24 : x + 24; s += rbcSvg(xx, yy, 0.62, 90); }
  return s;
}
// ------------------------------------------------------------------ perembesan
export const NL = 46, NL2 = 10;
const LPOS = (j) => { const a = rnd(j * 3.7) * Math.PI * 2, rr = Math.sqrt(rnd(j * 5.3 + 1)) ; return [TS.x + 5 + Math.cos(a) * rr * 238, 1005 + Math.sin(a) * rr * 108]; };
const LT = (j) => 6.72 + j * 0.062;
export const leakFinal = (j) => LPOS(j);
export const consumeTime = (j) => 14.35 + j * 0.082;
export function leaked(t, cons = true) {
  let s = ''; if (t < T_BREAK) return s;
  for (let j = 0; j < NL; j++) {
    const t0 = LT(j), u = (t - t0) / 1.35; if (u <= 0) continue; const e = 1 - Math.pow(1 - clamp(u), 3), [tx, ty] = LPOS(j), x0 = TS.x + (rnd(j * 9) - 0.5) * 26, y0 = TS.vy - TS.vh + 2;
    let x = lerp(x0, tx, e) + Math.sin(t * 2.2 + j) * 3, y = lerp(y0, ty, e) + Math.cos(t * 1.9 + j * 2) * 3, sc = 1, a = 1;
    if (cons) { const tc = consumeTime(j), m = MAC(j % 4, t), d = tc - t; if (d < 0.55) { const q = clamp(1 - d / 0.55); x = lerp(x, m.x, eio(q)); y = lerp(y, m.y, eio(q)); sc = 1 - 0.7 * clamp((q - 0.7) / 0.3); a = q >= 1 ? 0 : 1; } }
    if (a > 0) s += rbcSvg(x, y, sc, (rnd(j * 11) - 0.5) * 120 + t * 6);
  }
  for (let j = 0; j < NL2; j++) { const t0 = T_BREAK + 0.3 + j * 0.14, u = (t - t0) / 1.1; if (u <= 0) continue; const e = 1 - Math.pow(1 - clamp(u), 3), a = rnd(j * 2.1) * 6.28, rr = rnd(j * 4.4) * 62, tx = 830 + Math.cos(a) * rr, ty = 940 + Math.sin(a) * rr * 0.6; s += rbcSvg(lerp(830, tx, e), lerp(890, ty, e), 0.8, rnd(j) * 120); }
  return s;
}
export function poolWash(t) {
  const a = 0.3 * sm((t - 6.8) / 2.6), tint = mixc('#C8283A', bruiseAt(t).c1, sm((t - 17.4) / 2.2)), fade = 1 - 0.8 * sm((t - 23.5) / 1.5);
  return `<defs><radialGradient id="pw"><stop offset="0" stop-color="${tint}" stop-opacity="${f1(a * 1.2 * fade)}"/><stop offset="0.7" stop-color="${tint}" stop-opacity="${f1(a * 0.8 * fade)}"/><stop offset="1" stop-color="${tint}" stop-opacity="0"/></radialGradient></defs><ellipse cx="${TS.x + 5}" cy="1005" rx="300" ry="170" fill="url(#pw)"/>` + (t > T_BREAK + 0.3 ? `<ellipse cx="830" cy="945" rx="${f1(90 * sm((t - 6.9) / 1.5))}" ry="${f1(52 * sm((t - 6.9) / 1.5))}" fill="url(#pw)"/>` : '');
}
// ------------------------------------------------------------------ sel pembersih + pigmen
const MBASE = [[420, 1030], [660, 1040], [500, 960], [610, 1085]];
export function MAC(m, t) {
  const t0 = 13.1 + m * 0.3, u = clamp((t - t0) / 1.2), e = eo(u), sx = [380, 700, 430, 640][m], sy = TS.vy + TS.vh;
  const [bx, by] = MBASE[m]; return { x: lerp(sx, bx, e) + Math.sin(t * 1.3 + m) * 5, y: lerp(sy, by, e) + Math.cos(t * 1.1 + m * 2) * 5, show: t >= t0 - 0.05, fed: 0 };
}
export function macrophages(t) {
  let s = '';
  for (let m = 0; m < 4; m++) {
    const P = MAC(m, t); if (!P.show) continue; let eaten = 0; for (let j = m; j < NL; j += 4) if (t > consumeTime(j)) eaten++;
    const pulse = 1 + 0.05 * Math.sin(t * 6 + m) + 0.02 * eaten * 0.3, out = 1 - 0.9 * sm((t - 23.3 - m * 0.3) / 1.2);
    s += `<g transform="translate(${f1(P.x)} ${f1(P.y)}) scale(${f1(pulse * (0.35 + 0.65 * out) * 1000) / 1000})" opacity="${f1(out)}"><path d="M-44 4C-52 -26 -22 -48 8 -42C44 -38 56 -6 42 22C30 48 -8 54 -30 40C-40 34 -44 18 -44 4Z" fill="${K.mac}" stroke="${K.macD}" stroke-width="4"/><path d="M-44 6C-62 2 -66 -14 -56 -22M40 24C58 30 66 16 60 6" fill="none" stroke="${K.macD}" stroke-width="7" stroke-linecap="round"/><ellipse cx="-8" cy="-2" rx="17" ry="13" fill="${K.macN}" opacity=".85"/>`;
    for (let g = 0; g < Math.min(eaten, 8); g++) s += `<circle cx="${f1(12 + (g % 3) * 11 - 6)}" cy="${f1(10 + Math.floor(g / 3) * 11 - 6)}" r="5.5" fill="${mixc(K.hb, bruiseAt(t).c1, sm((t - 18) / 3))}" stroke="#fff" stroke-width="1.4" opacity=".95"/>`;
    s += `</g>`;
  }
  return s;
}
export function pigments(t) {
  let s = ''; const b = bruiseAt(t), col = mixc(K.hb, b.c1, sm((t - 17.6) / 2.4)), vis = 1 - sm((t - 23.4) / 1.4);
  for (let j = 0; j < NL; j++) {
    const tc = consumeTime(j), d = t - tc; if (d < 0.05) continue; const m = MAC(j % 4, t), u = clamp(d / 1.4), e = 1 - Math.pow(1 - u, 2);
    const [tx, ty] = LPOS(j), x = lerp(m.x, tx * 0.8 + 540 * 0.2 + (rnd(j * 6) - 0.5) * 40, e), y = lerp(m.y, ty * 0.85 + 1005 * 0.15, e), r = 7 + rnd(j * 2) * 5;
    const c2 = mixc(col, (rnd(j) > 0.5 ? b.c2 : col), 0.35);
    s += `<circle cx="${f1(x + Math.sin(t * 1.4 + j) * 4)}" cy="${f1(y + Math.cos(t * 1.2 + j) * 4)}" r="${f1(r)}" fill="${c2}" stroke="#fff" stroke-width="1.6" opacity="${f1(vis * clamp(u * 3) * 0.95)}"/>`;
  }
  return s;
}
// ------------------------------------------------------------------ benda penabrak (sudut meja) dari atas
export function wedge(t) {
  const d = t - T_IMPACT; if (t < 5.9 || t > 7.2) return '';
  const y = t < T_IMPACT ? lerp(560, TS.ys - 16, Math.pow(clamp((t - 5.9) / 0.4), 2)) : (t < T_IMPACT + 0.12 ? TS.ys - 16 + dentAmp(t) : lerp(TS.ys - 16, 560, sm((t - T_IMPACT - 0.15) / 0.6)));
  const yy = y;
  return `<g transform="translate(${TS.x} ${f1(yy)})"><path d="M-70 -140L70 -140L70 -30Q70 18 22 22L-22 22Q-70 18 -70 -30Z" fill="${K.wood}" stroke="${K.woodD}" stroke-width="5" stroke-linejoin="round"/><path d="M-70 -140L-48 -140L-48 -24Q-48 4 -30 10L-22 12Q-70 8 -70 -30Z" fill="#CDA070"/></g>`;
}
export const dentVisual = (t) => dentAmp(t);
// ------------------------------------------------------------------ kartu kulit tampak luar (di atas penampang; lokasi sama: x yang sama)
export const CARD = { x: 90, y: 400, w: 900, h: 324, bx: 540, by: 562 };
export function surfaceCard(t, a = 1, skin = K.skin, id = 'sg') {
  if (a <= 0.01) return ''; const b = bruiseAt(t), C = CARD;
  return `<g opacity="${f1(a)}"><defs>${bruiseGrad(id, b, 0.5)}<clipPath id="${id}c"><rect x="${C.x}" y="${C.y}" width="${C.w}" height="${C.h}" rx="40"/></clipPath></defs><rect x="${C.x + 4}" y="${C.y + 12}" width="${C.w}" height="${C.h}" rx="40" fill="rgba(0,0,0,.22)"/><rect x="${C.x}" y="${C.y}" width="${C.w}" height="${C.h}" rx="40" fill="${skin}"/><g clip-path="url(#${id}c)">`
    + [0, 1, 2, 3, 4].map((i) => `<path d="M${C.x - 20} ${C.y + 40 + i * 70}Q${C.x + 300} ${C.y + 20 + i * 70} ${C.x + 600} ${C.y + 44 + i * 70}T${C.x + 940} ${C.y + 40 + i * 70}" fill="none" stroke="${K.skinD}" stroke-width="3" opacity=".35"/>`).join('')
    + `<ellipse cx="${C.bx}" cy="${C.by}" rx="150" ry="108" fill="url(#${id})"/></g><rect x="${C.x}" y="${C.y}" width="${C.w}" height="${C.h}" rx="40" fill="none" stroke="#fff" stroke-width="8"/>`
    + `<path d="M${C.x + 14} ${C.by}L${C.x + C.w - 14} ${C.by}" stroke="#172B38" stroke-width="4" stroke-dasharray="14 12" stroke-linecap="round" opacity=".5"/><path d="M${C.x + 8} ${C.by - 12}L${C.x + 8} ${C.by + 12}L${C.x + 26} ${C.by}Z M${C.x + C.w - 8} ${C.by - 12}L${C.x + C.w - 8} ${C.by + 12}L${C.x + C.w - 26} ${C.by}Z" fill="#172B38" opacity=".55"/></g>`;
}
/** penghubung lokasi yang sama: dari bercak -> permukaan kulit di penampang -> kumpulan darah */
export function linkLine(a = 1) { return a <= 0.01 ? '' : `<g opacity="${f1(a)}"><path d="M${TS.x} ${CARD.by + 112}L${TS.x} 1010" stroke="#172B38" stroke-width="5" stroke-dasharray="4 14" stroke-linecap="round" opacity=".55"/><circle cx="${TS.x}" cy="${CARD.by + 112}" r="9" fill="#172B38" opacity=".7"/><circle cx="${TS.x}" cy="${TS.ys}" r="9" fill="#172B38" opacity=".7"/></g>`; }

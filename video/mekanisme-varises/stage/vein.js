// Pembantu vena/katup/sel darah (dipakai adegan hook, mekanisme, perbandingan). Orientasi tetap: ATAS layar = menuju jantung.
import { f1, clamp, lerp, sm, eo, eio, seg, rndf, T } from './common.js';
export const VK = { bg: '#241E4F', bg2: '#2E2766', wall: '#7B6FE0', wallD: '#4E43B0', lumen: '#F1E3EE', cell: '#E5483F', cellD: '#A8281F', dimple: '#C93A33', leaf: '#F8C038', leafD: '#B9861A', up: '#2DD4BF', upD: '#0B8F80', down: '#FF8A3D', downD: '#C25A14', ink: '#172B38' };
// sel darah (cakram bikonkaf, tampak samping-atas): pusat (x,y), jari-jari r, putaran rot
export const cell = (x, y, r, o = 1, rot = 0) => `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)})" opacity="${f1(clamp(o) * 100) / 100}"><ellipse rx="${f1(r)}" ry="${f1(r * 0.78)}" fill="${VK.cell}" stroke="${VK.cellD}" stroke-width="${f1(Math.max(2, r * 0.12))}"/><ellipse rx="${f1(r * 0.46)}" ry="${f1(r * 0.3)}" fill="${VK.dimple}"/></g>`;
// panah arah aliran: ang derajat (-90 = ke atas), panjang L
export const flowArrow = (x, y, ang, L, col, colD, o = 1, w = 22) => { const a = ang * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a), px = -dy, py = dx, ex = x + dx * L, ey = y + dy * L, hw = w * 1.35;
  return `<g opacity="${f1(clamp(o) * 100) / 100}"><path d="M${f1(x)} ${f1(y)}L${f1(ex - dx * hw)} ${f1(ey - dy * hw)}" stroke="${colD}" stroke-width="${w + 8}" stroke-linecap="round"/><path d="M${f1(ex + dx * hw * 0.5)} ${f1(ey + dy * hw * 0.5)}L${f1(ex - dx * hw + px * hw)} ${f1(ey - dy * hw + py * hw)}L${f1(ex - dx * hw - px * hw)} ${f1(ey - dy * hw - py * hw)}Z" fill="${colD}" stroke="${colD}" stroke-width="8" stroke-linejoin="round"/><path d="M${f1(x)} ${f1(y)}L${f1(ex - dx * hw)} ${f1(ey - dy * hw)}" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/><path d="M${f1(ex + dx * hw * 0.5)} ${f1(ey + dy * hw * 0.5)}L${f1(ex - dx * hw + px * hw)} ${f1(ey - dy * hw + py * hw)}L${f1(ex - dx * hw - px * hw)} ${f1(ey - dy * hw - py * hw)}Z" fill="${col}"/></g>`; };
// ---- vena (dunia lokal: sumbu x = 0, katup di y = 0; atas = negatif y)
export const RV = 200, SINUS = 36;
export const halfW = (y, grow = 0) => RV + SINUS * Math.exp(-(((y + 40) / 95) ** 2)) + grow * 100 * sm((y - 90) / 260);
export function veinShape(grow = 0, y0 = -1500, y1 = 1500) {
  const ys = []; for (let y = y0; y <= y1; y += 30) ys.push(y);
  const L = ys.map((y) => `${f1(-halfW(y, grow))} ${y}`), Rr = ys.slice().reverse().map((y) => `${f1(halfW(y, grow))} ${y}`);
  const Lw = ys.map((y) => `${f1(-halfW(y, grow) - 48)} ${y}`), Rw = ys.slice().reverse().map((y) => `${f1(halfW(y, grow) + 48)} ${y}`);
  return `<path d="M${Lw.join('L')}L${Rw.join('L')}Z" fill="${VK.wall}" stroke="${VK.wallD}" stroke-width="8" stroke-linejoin="round"/><path d="M${L.join('L')}L${Rr.join('L')}Z" fill="${VK.lumen}"/>`;
}
// kerja katup. c = penutupan (0 terbuka .. 1 menutup), w = kelemahan (0 sehat .. 1 melemah: celah di tengah)
export function valve(c0, w) {
  const c = Math.max(c0, 0.42 * w);   // katup lemah: daun kaku, setengah menutup dan tidak pernah bertemu
  const ay = 70, aL = -(halfW(ay) + 2), aR = -aL;
  const openTx = (side) => side * (halfW(-150) - 30), closeTx = (side) => side * (3 + w * 62), openTy = -150, closeTy = -78 + w * 34;
  let s = '';
  for (const side of [-1, 1]) {
    const ax = side < 0 ? aL : aR, tx = lerp(openTx(side), closeTx(side), c), ty = lerp(openTy, closeTy, c);
    const cx = (ax + tx) / 2 + side * lerp(-8, 26, 1 - c) , cy = (ay + ty) / 2 + lerp(0, 20, c);
    const d = `M${f1(ax)} ${ay}Q${f1(cx)} ${f1(cy)} ${f1(tx)} ${f1(ty)}`;
    s += `<path d="${d}" fill="none" stroke="${VK.leafD}" stroke-width="40" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${VK.leaf}" stroke-width="28" stroke-linecap="round"/>`;
  }
  return s;
}
// denyut aliran: periode P, fase maju Tf. Mengembalikan fase, perpindahan kumulatif D, penutupan c (0..1)
export const P = 1.2, TF = 0.75, VSP = 560;
export function pulse(t, t0) { const a = t - t0, n = Math.floor(a / P), ph = a - n * P, D = VSP * (n * TF + Math.min(ph, TF)); return { n, ph, D, back: ph >= TF, c: sm((ph - TF) / 0.14) * (1 - sm((ph - (P - 0.22)) / 0.2)) }; }
// sel normal: tersebar di dalam lumen, bergerak naik saat fase maju, diam (memantul sedikit) saat fase mundur
const NC = 34, LOOP = 2600, YTOP = -1200;
const cellsDef = Array.from({ length: NC }, (_, i) => ({ fx: rndf(i + 5) * 2 - 1, y0: YTOP + (i + rndf(i + 3) * 0.6) * (LOOP / NC), r: 28 + 3 * rndf(i + 9), rot: rndf(i + 11) * 360 }));
export function flowCells(t, t0, grow = 0, o = 1, skip = null) {
  const pu = pulse(t, t0); let s = '';
  for (let i = 0; i < NC; i++) {
    if (skip && skip(i)) continue;
    const d = cellsDef[i]; let y = d.y0 - pu.D; y = ((y - YTOP) % LOOP + LOOP) % LOOP + YTOP;
    const bounce = pu.back ? 16 * Math.sin(Math.PI * (pu.ph - TF) / (P - TF)) : 0;
    const hw = halfW(y, grow) - 40, x = d.fx * hw;
    s += cell(x, y + bounce, d.r, o, d.rot + y * 0.2);
  }
  return s;
}
// sel aliran balik (terjadwal): naik di tengah sampai di atas katup, lalu turun lewat celah dan berkumpul di bawah katup
export function refluxCells(t, events, grow = 0) {
  let s = '', k = 0;
  for (const TA of events) for (let j = 0; j < 3; j++) {
    const ta = TA + j * 0.11, xp = (j - 1) * 26, slot = k++, px = ((slot % 4) - 1.5) * 76 + 12 * Math.sin(slot * 2.1), py = 170 + Math.floor(slot / 4) * 70 + 14 * (slot % 2);
    let x, y, o = 1;
    if (t < ta - 1.2) continue;
    if (t < ta) { const u = eio((t - (ta - 1.2)) / 1.2); y = lerp(560, -165, u); x = xp; o = clamp((t - (ta - 1.2)) / 0.2); }
    else if (t < ta + 0.22) { y = -165 - 6 * Math.sin((t - ta) * 14); x = xp; }
    else if (t < ta + 1.45) { const u = eo((t - ta - 0.22) / 1.23); y = lerp(-165, py, u); x = lerp(xp, px, sm(u)); s += flowArrow(xp + 70, lerp(-130, y - 34, 0.5), 90, 56, VK.down, VK.downD, 0.9 * (1 - u), 14); }
    else { x = px + 6 * Math.sin(t * 2.1 + slot); y = py + 5 * Math.cos(t * 1.7 + slot * 1.3); }
    s += cell(x, y, 29, o, slot * 40 + t * 20);
  }
  return s;
}

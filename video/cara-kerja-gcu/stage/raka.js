// Pembungkus Raka untuk video GCU: memakai rakaSvg()/raka() asli (desain, pakaian, proporsi tangan tidak diubah) + pemecah lengan agar
// tangan tepat berada di titik tujuan (memegang meter, jari terangkat) dengan panjang lengan konstan. Koordinat dunia = koordinat lokal Raka (400 x 800).
import { raka, rakaSvg, lerpState, idle as rIdle, armShape } from '../../../brand/characters/raka/raka.js';
import { f1, clamp, rad, rot, MC } from './core.js';
export { raka, rakaSvg, lerpState, rIdle };
export const SHOULDER = { L: [104, 410], R: [296, 410] };
const ARM_LEN = 150;   // panjang lengan sampai pergelangan (lengan netral Raka = 147)

// dunia -> sebelum lean/bob (koordinat yang dimengerti armShape) dan sebaliknya
export const toWorld = (st, p) => { const a = rad(st.lean || 0), dx = p[0] - 200, dy = p[1] - 580, c = Math.cos(a), s = Math.sin(a); return [200 + dx * c - dy * s, 580 + dx * s + dy * c + (st.bob || 0)]; };
export const toPre = (st, w) => { const a = -rad(st.lean || 0), dx = w[0] - 200, dy = w[1] - 580 - (st.bob || 0), c = Math.cos(a), s = Math.sin(a); return [200 + dx * c - dy * s, 580 + dx * s + dy * c]; };

/** pasang lengan 'side' ('L' kiri layar | 'R' kanan layar) agar pusat tangan berada di H (koordinat DUNIA). Mengembalikan objek arm untuk state. */
export function solveArm(st, side, Hworld, o = {}) {
  const S = SHOULDER[side], H = toPre(st, Hworld), out = side === 'L' ? [-1, 0.55] : [1, 0.55];
  let W = [H[0], H[1]], arm;
  for (let it = 0; it < 8; it++) {
    const D = Math.hypot(W[0] - S[0], W[1] - S[1]), L = o.len ?? ARM_LEN;
    const b = D >= L ? 0 : Math.sqrt(Math.max(0, (L - D) * 3 * D / 8));
    const cx = (S[0] + W[0]) / 2, cy = (S[1] + W[1]) / 2, ux = (W[0] - S[0]) / (D || 1), uy = (W[1] - S[1]) / (D || 1);
    let nx = -uy, ny = ux; if (nx * out[0] + ny * out[1] < 0) { nx = -nx; ny = -ny; }
    const bend = o.bend ?? 1;
    arm = { wx: W[0], wy: W[1], ex: cx + nx * b * bend, ey: cy + ny * b * bend, finger: o.finger ?? 0, fa: o.fa ?? -90, front: o.front ?? 1, roll: 0 };
    const h = armShape(side, arm).hand; W = [W[0] + H[0] - h[0], W[1] + H[1] - h[1]];
  }
  arm.wx = W[0]; arm.wy = W[1];
  const D2 = Math.hypot(W[0] - S[0], W[1] - S[1]), L2 = o.len ?? ARM_LEN, b2 = D2 >= L2 ? 0 : Math.sqrt(Math.max(0, (L2 - D2) * 3 * D2 / 8));
  const cx = (S[0] + W[0]) / 2, cy = (S[1] + W[1]) / 2, ux = (W[0] - S[0]) / (D2 || 1), uy = (W[1] - S[1]) / (D2 || 1);
  let nx = -uy, ny = ux; if (nx * out[0] + ny * out[1] < 0) { nx = -nx; ny = -ny; }
  arm.ex = cx + nx * b2 * (o.bend ?? 1); arm.ey = cy + ny * b2 * (o.bend ?? 1);
  return arm;
}
/** posisi dunia pusat tangan dari state yang sudah terpasang */
export const handWorld = (st, side) => toWorld(st, armShape(side, side === 'L' ? st.armL : st.armR).hand);

/** badan Raka (grup SVG, koordinat lokal 400 x 800) */
export const rakaBody = (st, uid = 'rk', o = {}) => rakaSvg(st, { bare: true, uid, shadow: false, outfit: o.outfit || 'harian', dark: o.dark });

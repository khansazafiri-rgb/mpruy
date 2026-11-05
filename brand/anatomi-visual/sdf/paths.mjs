// Jalur anatomi jantung tampak depan dalam koordinat lokal yang sama dengan versi SVG (x 200..830, y 0..940, y ke bawah).
// Dipakai oleh shader SDF sebagai "decal" yang menempel pada permukaan jantung. Hanya jalur utama (tanpa cabang acak).
// Dasar: ringkasan sumber di ../README.md (LM -> LAD + sirkumfleks; RCA di alur AV kanan; vena kardiak besar di samping LAD).
import { catmull } from '../style.mjs';

// [titik kontrol, radius pangkal, radius ujung]
export const ARTERIES = {
  LM:  { pts: [[458, 334], [506, 344]], r0: 12, r1: 8 },
  LAD: { pts: [[504, 344], [506, 490], [538, 680], [592, 912]], r0: 8, r1: 3.5 },
  LCX: { pts: [[508, 352], [580, 384], [690, 454], [750, 598]], r0: 6.5, r1: 3.5 },
  RCA: { pts: [[428, 352], [368, 372], [314, 408], [280, 460], [274, 520], [302, 574], [366, 610], [436, 636], [490, 664], [530, 706]], r0: 8, r1: 4 },
};
export const VEIN_GCV = { pts: [[528, 360], [550, 500], [584, 690], [640, 902]], r0: 5.5, r1: 3 };

// alur lemak (di bawah arteri): LAD, sirkumfleks, RCA bagian alur AV kanan
export const FAT_GROOVES = [
  [[504, 344], [506, 490], [538, 680], [592, 912]],
  [[508, 352], [580, 384], [690, 454], [750, 598]],
  [[274, 520], [302, 574], [366, 610], [436, 636], [490, 664], [530, 706]],
];

// pembuluh besar sebagai rantai kapsul 3D: titik kontrol (x, y, z), radius pangkal dan ujung
// z positif ke arah penonton. Batang pulmonalis di depan aorta; lengkung aorta menuju belakang.
export const VESSELS = {
  AORTA: { pts: [[452, 380, -30], [450, 270, -40], [444, 170, -45], [442, 108, -50], [456, 40, -65], [560, 16, -85], [652, 66, -115]], r0: 52, r1: 42 },
  BRACH: { pts: [[462, 66, -55], [420, 36, -60], [384, 18, -62], [344, 14, -64]], r0: 24, r1: 21 },
  PA:    { pts: [[420, 500, 60], [470, 420, 110], [530, 342, 118], [606, 290, 80]], r0: 44, r1: 34 },
  PAL:   { pts: [[606, 288, 30], [652, 262, 0], [704, 268, -30], [760, 306, -50]], r0: 29, r1: 25 },
  PAR:   { pts: [[606, 288, 30], [566, 272, -10], [526, 262, -45], [488, 256, -60]], r0: 25, r1: 22 },
  SVC:   { pts: [[318, 30, -20], [316, 110, -18], [312, 190, -14], [308, 262, -6]], r0: 29, r1: 27 },
  IVC:   { pts: [[332, 620, -40], [340, 690, -38], [330, 750, -34], [318, 800, -30]], r0: 31, r1: 28 },
};

export function densify(pts, per = 6) { return catmull(pts, per); }

export function cumulative(poly) {
  const c = [0];
  for (let i = 1; i < poly.length; i++) c.push(c[i - 1] + Math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]));
  return c;
}

// lobulus lemak: lingkaran kecil berderet di sepanjang alur (deterministik)
export function fatCircles(seed = 5) {
  let r = seed; const rnd = () => { r = (r * 1664525 + 1013904223) % 4294967296; return r / 4294967296; };
  const out = [];
  for (const g of FAT_GROOVES) {
    const poly = densify(g, 16);
    let acc = 0;
    for (let i = 1; i < poly.length; i++) {
      acc += Math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]);
      if (acc > 15) {
        acc = 0;
        const side = rnd() < 0.5 ? -1 : 1, nx = -(poly[i][1] - poly[i - 1][1]), ny = poly[i][0] - poly[i - 1][0], l = Math.hypot(nx, ny) || 1;
        const off = (rnd() - 0.2) * 7;
        out.push([poly[i][0] + (nx / l) * off * side, poly[i][1] + (ny / l) * off * side, 11 + rnd() * 7]);
      }
    }
  }
  return out;
}

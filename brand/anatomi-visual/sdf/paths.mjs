// Jalur anatomi jantung tampak depan dalam koordinat lokal yang sama dengan versi SVG (x 200..830, y 0..940, y ke bawah).
// Dipakai oleh shader SDF sebagai "decal" yang menempel pada permukaan jantung. Hanya jalur utama (tanpa cabang acak).
// Dasar: ringkasan sumber di ../README.md (LM -> LAD + sirkumfleks; RCA di alur AV kanan; vena kardiak besar di samping LAD).
import { catmull } from '../style.mjs';

// [titik kontrol, radius pangkal, radius ujung]
export const ARTERIES = {
  LM:  { pts: [[458, 334], [506, 344]], r0: 12, r1: 8 },
  LAD: { pts: [[504, 344], [506, 490], [538, 680], [592, 912]], r0: 8, r1: 3.5 },
  LCX: { pts: [[508, 352], [580, 384], [660, 424], [722, 480], [754, 560], [758, 630]], r0: 6.5, r1: 3.5 },
  RCA: { pts: [[428, 352], [368, 372], [314, 408], [280, 460], [274, 520], [302, 574], [366, 610], [436, 636], [490, 664], [530, 706]], r0: 8, r1: 4 },
};
export const VEIN_GCV = { pts: [[528, 360], [550, 500], [584, 690], [640, 902]], r0: 5.5, r1: 3 };

// alur lemak (di bawah arteri): LAD, sirkumfleks, RCA bagian alur AV kanan
export const FAT_GROOVES = [
  [[504, 344], [506, 490], [538, 680], [592, 912]],
  [[508, 352], [580, 384], [660, 424], [722, 480], [754, 560], [758, 630]],
  [[274, 520], [302, 574], [366, 610], [436, 636], [490, 664], [530, 706]],
];

// Pembuluh besar sebagai rantai kapsul 3D: titik kontrol (x, y, z); z positif ke arah penonton.
// cutStart/cutEnd: ujung terpotong dengan lumen; tilt ditambahkan ke arah singgung agar bidang potong miring ke penonton
// (supaya lumen terbaca dari depan). Radius pangkal r0 dan ujung r1.
// Susunan (tampak depan): aorta asenden naik dari akar, lengkung ke kiri pasien (kanan gambar) dan ke belakang, turun sebagai
// aorta desenden terpotong; tiga cabang keluar dari puncak lengkung (brakiosefalika, karotis komunis kiri, subklavia kiri).
// Batang pulmonalis keluar dari jalur keluar ventrikel kanan, di depan aorta, naik ke kiri pasien dan bercabang di bawah lengkung
// aorta: LPA ke kanan gambar, RPA ke belakang aorta menuju kiri gambar (di atas atrium kanan).
export const VESSELS = {
  AORTA: { pts: [[452, 410, -20], [450, 300, -34], [448, 200, -44], [456, 128, -56], [488, 78, -74], [540, 62, -96], [596, 80, -118], [640, 130, -132], [660, 190, -138], [662, 236, -140]], r0: 50, r1: 38, cutEnd: { tilt: [0, 0, 1.1] } },
  BCT:   { pts: [[480, 74, -66], [470, 20, -70], [452, -36, -72], [436, -82, -72]], r0: 23, r1: 20, cutEnd: { tilt: [0, 0, 1.0] } },
  LCC:   { pts: [[526, 66, -90], [528, 10, -92], [530, -40, -92], [532, -78, -92]], r0: 18, r1: 16, cutEnd: { tilt: [0, 0, 1.0] } },
  LSA:   { pts: [[578, 78, -108], [590, 24, -110], [604, -24, -110], [620, -62, -110]], r0: 21, r1: 18, cutEnd: { tilt: [0, 0, 1.0] } },
  PA:    { pts: [[456, 570, 30], [470, 470, 96], [520, 366, 128], [568, 322, 116], [612, 292, 92]], r0: 50, r1: 42 },
  PAL:   { pts: [[612, 292, 92], [660, 278, 52], [720, 288, 4], [776, 312, -24]], r0: 38, r1: 31, cutEnd: { tilt: [0.5, 0, 0.9] } },
  PAR:   { pts: [[612, 292, 92], [574, 282, 34], [524, 262, -42], [470, 244, -104], [396, 238, -122], [320, 236, -118], [250, 238, -108]], r0: 32, r1: 26, cutEnd: { tilt: [-0.5, 0, 0.9] } },
  SVC:   { pts: [[318, 14, -22], [316, 100, -18], [312, 190, -12], [306, 262, -4], [300, 330, 6]], r0: 29, r1: 28, cutStart: { tilt: [0, 0, 1.0] } },
  IVC:   { pts: [[318, 640, -44], [334, 700, -42], [334, 760, -38], [322, 820, -34]], r0: 31, r1: 28, cutEnd: { tilt: [0, 0, 1.0] } },
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

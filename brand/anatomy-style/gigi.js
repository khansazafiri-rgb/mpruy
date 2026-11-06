// Potongan mesiodistal (sagital) gigi MOLAR PERTAMA RAHANG BAWAH permanen (gigi 36/46) dengan jaringan penyangga. Kode murni (SVG + filter), 1080 x 1920. Revisi 8 (sistem visual MEDCOEL, tulang trabekula Voronoi, gusi-kerah, reveal layer).
// JENIS GIGI : molar pertama mandibula (dua akar: mesial dan distal).
// BIDANG POTONG: mesiodistal (sagital) di tengah antara sisi bukal dan lingual; MESIAL di KIRI layar, DISTAL di KANAN, oklusal di atas. Gigi tetangga tidak digambar.
// Struktur DI BIDANG: email, dentin, ruang pulpa + dua tanduk, kanal MB di akar mesial, kanal distal, sementum, lig. periodontal, lamina dura, tulang alveolar, gusi.
// Struktur DI LUAR BIDANG yang digambar SAMAR: kanal ML (lingual terhadap MB); kanal mandibula + berkas n.-a.-v. alveolaris inferior + cabang dental (konteks; letaknya lingual/inferior).
// KOMPOSISI (v6): lebar mahkota 640 px (59% lebar kanvas), tinggi mahkota 0,72 x lebar, panjang akar ~1,10 x lebar, kubah furkasi ~0,27 x lebar di bawah leher; ukuran diturunkan dari PENGUKURAN gambar acuan
//   (proporsi saja) dan TIDAK dari sumber anatomi; angka milimeter mahkota/akar belum terverifikasi. Skala nominal ±58 px/mm (mahkota dianggap 11 mm; belum terverifikasi).
//   Sumber terbuka yang dipakai: email <= 2,5 mm di tonjol; PDL 0,15-0,38 mm; puncak alveolar 1-2 mm dari CEJ; sulkus ±0,7 mm dan lebar biologis ±2 mm (tidak universal); pintu furkasi 1,9 mm (bukal) - 2,9 mm (lingual);
//   kanal mandibula ±6,3 mm di bawah apeks.
// Mode: gigi({labels,t}) = render final; siluet({guides}) = hanya siluet gigi, gusi, massa tulang (tanpa latar/tekstur); render polos (warna datar) = plainify(gigi()) lewat render.html?plain.
// Layer animasi (id grup): #g-tulang, #g-kanal-mandibula, #g-lig-periodontal, #g-dentin, #g-sementum, #g-pulpa, #g-saraf-pembuluh, #g-email, #g-gusi, #g-pulpa-aliran, #g-label.
import { PAL, W, H, f1, rng, mix, lighten, darken, vignette, ribbon, sampleCubic, cubicD, fx, TEMA_MEDCOEL } from './anatomi.js';
import { MC, latar, merek, labels, labelsT, peralihan, selam, maksLabel, KONTUR, E, seg, KLIP, kam, selVoronoi, halus } from './medcoel.js';
export const P = 'g';
export const FLAT = { gEn: '#A9C8C4', gDen: '#F0BC72', gPulp: '#E04A5C', gBone: '#EAD6A4', gMarrow: '#B98440', gGum: '#E4707F', gMuc: '#B0505E' };

const chain = (p0, ...segs) => [...p0, ...segs.flat()];
// ---- bentuk lokal (sama dengan v5: mahkota membulat, DEJ, akar, kanal); dipetakan ke komposisi baru oleh MX/MY di bawah
const CROWN = chain([342, 850], [322, 810, 300, 756, 300, 694], [298, 656, 308, 624, 332, 606], [356, 588, 392, 532, 448, 528], [486, 524, 506, 590, 540, 590], [574, 594, 598, 540, 642, 534], [684, 528, 716, 570, 742, 598], [766, 624, 786, 656, 786, 716], [786, 776, 764, 818, 738, 850]);
const CROWN_IN = chain([347, 850], [328, 812, 318, 760, 338, 700], [340, 668, 350, 646, 372, 636], [396, 628, 418, 616, 450, 616], [484, 618, 506, 650, 540, 650], [574, 650, 598, 620, 640, 620], [676, 622, 702, 632, 722, 648], [742, 660, 748, 688, 746, 722], [746, 772, 740, 816, 733, 850]);
const ROOT = chain([342, 850], [332, 925, 332, 1030, 336, 1130], [342, 1230, 358, 1330, 396, 1410], [414, 1452, 440, 1476, 462, 1470], [486, 1452, 500, 1380, 516, 1290], [522, 1210, 516, 1120, 512, 1060], [506, 1030, 510, 994, 540, 988], [570, 994, 574, 1030, 580, 1070], [588, 1140, 604, 1260, 646, 1350], [668, 1400, 690, 1432, 706, 1452], [718, 1468, 746, 1468, 756, 1440], [764, 1392, 758, 1300, 750, 1210], [746, 1110, 744, 1010, 742, 930], [742, 890, 740, 870, 738, 850]);
const CAN_MB = [466, 930, 458, 975, 440, 1040, 436, 1130, 432, 1220, 436, 1300, 444, 1370, 450, 1410, 452, 1430, 452, 1446];
const CAN_ML = [480, 900, 478, 960, 460, 1040, 452, 1130, 446, 1220, 446, 1300, 446, 1352, 448, 1380, 450, 1396, 452, 1410];
const CAN_D = [616, 930, 632, 985, 650, 1050, 660, 1130, 672, 1220, 690, 1300, 704, 1360, 712, 1395, 718, 1420, 722, 1438];
const CHAMBER_L = 'M430 900C424 830 424 750 436 690C441 664 454 646 460 662C476 704 504 748 540 748C576 748 604 704 620 662C626 646 639 664 644 690C656 750 656 830 650 900C640 925 628 938 612 942C586 934 566 924 540 924C514 924 494 934 468 942C452 938 440 925 430 900Z';

// ---- komposisi: lebar mahkota 640 px; tinggi mahkota 460 px (0,72 x lebar, mengikuti acuan); leher -> kubah furkasi 175 px; leher -> apeks 704 px (1,10 x lebar)
const S = 640 / 484, T0 = 235, CROWN_H = 460, SY = CROWN_H / 322, CEJ = T0 + CROWN_H, SM = 175 / 138, SR = (704 - 150 * SM) / 472;
const MX = (x) => 540 + (x - 540) * S;
const MY = (y) => (y <= 850 ? T0 + (y - 528) * SY : y <= 1000 ? CEJ + (y - 850) * SM : CEJ + 150 * SM + (y - 1000) * SR);
const mapFlat = (a) => a.map((v, i) => f1(i % 2 ? MY(v) : MX(v)));
const mapD = (d) => d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (m, x, y) => `${f1(MX(+x))} ${f1(MY(+y))}`);
const crownAffine = `translate(540 ${T0}) scale(${f1(S * 1000) / 1000} ${f1(SY * 1000) / 1000}) translate(-540 -528)`;   // hanya untuk dekorasi di mahkota (y lokal <= 850)
const CROWNm = mapFlat(CROWN), CROWN_INm = mapFlat(CROWN_IN), ROOTm = mapFlat(ROOT), CAN_MBm = mapFlat(CAN_MB), CAN_MLm = mapFlat(CAN_ML), CAN_Dm = mapFlat(CAN_D), CHAMBER = mapD(CHAMBER_L);
const rev = (a) => { const pts = []; for (let i = 0; i < a.length; i += 2) pts.push([a[i], a[i + 1]]); return pts.reverse().flat(); };
const cubicTail = (arr) => cubicD(arr).replace(/^M[^C]*/, '');
const ROOT_OPEN = cubicD(ROOTm), CROWN_OPEN = cubicD(CROWNm);
const INREV = `L${CROWN_INm[CROWN_INm.length - 2]} ${CROWN_INm[CROWN_INm.length - 1]}${cubicTail(rev(CROWN_INm))}Z`;
const DENTIN_D = `${ROOT_OPEN}${INREV}`, ENAMEL_D = `${CROWN_OPEN}${INREV}`;
const TOOTH_D = `${CROWN_OPEN}${cubicTail(rev(ROOTm))}Z`;   // siluet luar gigi (mahkota + dua akar) sebagai satu bentuk
const offs = (Sm, d) => Sm.map((p, i) => { const a = Sm[Math.max(0, i - 1)], b = Sm[Math.min(Sm.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [p[0] - dy / l * d, p[1] + dx / l * d]; });
const pl = (Sm) => 'M' + Sm.map((p) => `${f1(p[0])} ${f1(p[1])}`).join('L');
const polyD = (pts) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${f1(x)} ${f1(y)}`).join('');
const smoothTail = (pts) => { let d = ''; for (let i = 0; i < pts.length - 1; i++) { const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)]; d += `C${f1(p1[0] + (p2[0] - p0[0]) / 6)} ${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)} ${f1(p2[1] - (p3[1] - p1[1]) / 6)} ${f1(p2[0])} ${f1(p2[1])}`; } return d; };

// ---- landmark (koordinat kanvas) untuk garis bantu dan perbandingan
const cs = sampleCubic(CROWNm, 30), rs = sampleCubic(ROOTm, 30);
const apexM = Math.max(...rs.filter(([x]) => x < 540).map(([, y]) => y)), apexD = Math.max(...rs.filter(([x]) => x > 540).map(([, y]) => y));
const domeY = Math.min(...rs.filter(([x, y]) => Math.abs(x - 540) < 14 && y > CEJ + 50).map(([, y]) => y));
export const LM = { crownTop: T0, cej: CEJ, apexM: f1(apexM), apexD: f1(apexD), dome: f1(domeY), crownL: 540 - 320, crownR: 540 + 320, cx: 540 };

// ---- jaringan lunak dan tulang yang diturunkan dari kontur gigi
const TIP_Y = CEJ - 71, CREST_Y = CEJ + 87;   // tepi gusi bebas ±1,2 mm di atas CEJ (sulkus ±0,7 mm); puncak alveolar ±1,5 mm di bawah CEJ (sumber: 1-2 mm)
const toothLeft = [...cs.filter(([x, y]) => x < 540 && y >= TIP_Y && y <= CEJ).reverse(), ...rs.filter(([x, y]) => x < 540 && y > CEJ && y <= CREST_Y)];   // tepi gusi -> puncak
const rightFromTip = [...cs.filter(([x, y]) => x > 540 && y >= TIP_Y + 6 && y <= CEJ), ...rs.filter(([x, y]) => x > 540 && y > CEJ && y <= CREST_Y + 5).reverse()];
const tipL = toothLeft[0], crestL = toothLeft[toothLeft.length - 1], tipR = rightFromTip[0], crestR = rightFromTip[rightFromTip.length - 1];
const rel = (o, sd, a) => { const r2 = []; for (let i = 0; i < a.length; i += 2) r2.push(f1(o[0] + sd * a[i]), f1(o[1] + a[i + 1])); return r2; };
// gundukan gusi: kerah di leher, tonjolan papila, lalu lereng curam yang bertemu permukaan tulang (tidak berupa pita sampai tepi gambar)
const GUM_ARCL = rel(tipL, -1, [0, 0, 6, 14, 20, 24, 44, 28, 76, 34, 104, 30, 132, 44, 162, 76, 186, CREST_Y + 66 - tipL[1], 214, CREST_Y + 70 - tipL[1]]);
const GUM_ARCR = rel(tipR, 1, [0, 0, 6, 16, 22, 26, 48, 32, 84, 38, 112, 32, 142, 50, 172, 80, 196, CREST_Y + 72 - tipR[1], 226, CREST_Y + 76 - tipR[1]]);
const endL = [GUM_ARCL[GUM_ARCL.length - 2], GUM_ARCL[GUM_ARCL.length - 1]], endR = [GUM_ARCR[GUM_ARCR.length - 2], GUM_ARCR[GUM_ARCR.length - 1]];
const CRESTL = [crestL[0], crestL[1], crestL[0] - 24, crestL[1] + 8, crestL[0] - 60, crestL[1] + 22, crestL[0] - 100, crestL[1] + 38, crestL[0] - 140, crestL[1] + 54, crestL[0] - 190, crestL[1] + 66, endL[0], endL[1]];
const CRESTR = [crestR[0], crestR[1], crestR[0] + 24, crestR[1] + 8, crestR[0] + 60, crestR[1] + 22, crestR[0] + 100, crestR[1] + 40, crestR[0] + 140, crestR[1] + 58, crestR[0] + 190, crestR[1] + 72, endR[0], endR[1]];
const gumL = `M${f1(tipL[0])} ${f1(tipL[1])}${cubicTail(GUM_ARCL)}${cubicTail(rev(CRESTL))}${polyD(toothLeft.slice().reverse()).replace(/^M/, 'L')}Z`;
const gumR = `M${f1(tipR[0])} ${f1(tipR[1])}${cubicTail(GUM_ARCR)}${cubicTail(rev(CRESTR))}${polyD(rightFromTip.slice().reverse()).replace(/^M/, 'L')}Z`;
// massa tulang: puncak mengikuti akar, tepi samping membulat, dasar BERGELOMBANG mengikuti dua ujung akar (bukan balok): k = faktor kedalaman (1 = ringkas; ~1,7 hanya untuk layer konteks)
const wob = (i) => Math.sin(i * 1.7) * 6 + Math.cos(i * 2.9) * 4;
const catmull = (pts, n = 8) => { const o = []; for (let i = 0; i < pts.length - 1; i++) { const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)]; for (let k = 0; k < n; k++) { const t = k / n, t2 = t * t, t3 = t2 * t; o.push([0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3), 0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]); } } o.push(pts[pts.length - 1]); return o; };
const boneOutline = (k) => {
  const bY = (y) => (y > 1380 ? 1380 + (y - 1380) * k : y);
  const OUT = [[endL[0], endL[1]], [endL[0] + 14 + wob(1), 920], [endL[0] + 34 + wob(2), 1040], [endL[0] + 48 + wob(3), 1170], [endL[0] + 72 + wob(4), bY(1290)], [150 + wob(5), bY(1395)], [225 + wob(6), bY(1490)], [320 + wob(7), bY(1558)], [430 + wob(8), bY(1590)], [510 + wob(9), bY(1586)], [580 + wob(10), bY(1560)], [650 + wob(11), bY(1580)], [735 + wob(12), bY(1606)], [830 + wob(13), bY(1582)], [915 + wob(14), bY(1520)], [985 + wob(15), bY(1432)], [endR[0] - 30 + wob(16), bY(1330)], [endR[0] - 14 + wob(17), 1200], [endR[0] - 8 + wob(18), 1060], [endR[0] - 4, 930], [endR[0], endR[1]]];
  return { d: `${cubicD(CRESTL)}${smoothTail(OUT)}${cubicTail(rev(CRESTR))}Z`, poly: [...sampleCubic(CRESTL, 10), ...OUT, ...sampleCubic(rev(CRESTR), 10)], out: OUT };
};
const BONE = boneOutline(1), BONE_DEEP = boneOutline(1.7), boneD = BONE.d;
const crestLineL = cubicD(CRESTL), crestLineR = cubicD(CRESTR);
// mukosa alveolar: lapisan tipis (22 -> 0 px) yang melanjutkan gusi menutupi permukaan tulang ke samping; gusi tidak berhenti seperti tutup
const mucosa = (out, sd) => { const pts = catmull(out.slice(0, 4), 6), A = [], B = []; pts.forEach((q, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, w = 22 * (1 - i / (pts.length - 1)) ** 1.2, nx = sd < 0 ? -dy / l : dy / l, ny = sd < 0 ? dx / l : -dx / l; A.push([q[0], q[1]]); B.push([q[0] + nx * w, q[1] + ny * w]); }); return 'M' + A.map((q) => `${f1(q[0])} ${f1(q[1])}`).join('L') + 'L' + B.reverse().map((q) => `${f1(q[0])} ${f1(q[1])}`).join('L') + 'Z'; };
const mucL = mucosa(BONE.out, -1), mucR = mucosa(BONE.out.slice().reverse(), 1);

// ---- ruang sumsum + batang trabekula dari SEL VORONOI: titik benih disusun mengikuti kontur akar (cincin sejajar soket; jarak antar-cincin > jarak sepanjang cincin sehingga sel dekat soket
//      memanjang tegak lurus akar, makin jauh makin bulat dan besar); dinding antar-sel = batang trabekula (tebal 6-16 px, bervariasi per pasangan sel, lebih tebal dekat soket); sudut dibulatkan.
//      Sebagian benih dibuang agar sebagian rongga menyatu (rongga besar). Ukuran dan kerapatan SKEMATIK (belum bersumber).
function marrowSpaces(r, poly) {
  const rsd = sampleCubic(ROOTm, 22), N = rsd.length;
  const seg = (px, py, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1; let t = ((px - ax) * dx + (py - ay) * dy) / l2; t = Math.max(0, Math.min(1, t)); return Math.hypot(px - (ax + t * dx), py - (ay + t * dy)); };
  const inside = (x, y) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
  const dPoly = (x, y) => { let m = 1e9; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; m = Math.min(m, seg(x, y, a[0], a[1], b[0], b[1])); } return m; };
  const near = (x, y) => { let m = 1e9; for (let i = 0; i < N; i++) { const dd = Math.hypot(x - rsd[i][0], y - rsd[i][1]); if (dd < m) m = dd; } return m; };
  const seeds = [];
  for (let d = 66; d < 640;) {
    const ring = offs(rsd, d).filter((q) => q[1] > CREST_Y + 36 && near(q[0], q[1]) >= d * 0.9 && inside(q[0], q[1]) && dPoly(q[0], q[1]) > 34);
    const sAlong = 26 + 0.1 * d, gapR = 42 + 0.16 * d; let acc = r() * sAlong;
    for (let i = 1; i < ring.length; i++) {
      acc -= Math.hypot(ring[i][0] - ring[i - 1][0], ring[i][1] - ring[i - 1][1]);
      if (acc <= 0) { acc += sAlong * (0.75 + 0.5 * r()); const jx = (r() - 0.5) * sAlong * 0.95, jy = (r() - 0.5) * gapR * 0.8, x = ring[i][0] + jx, y = ring[i][1] + jy; if (inside(x, y) && dPoly(x, y) > 38 && !seeds.some((s2) => Math.hypot(s2[0] - x, s2[1] - y) < 0.62 * sAlong)) seeds.push([x, y]); }
    }
    d += gapR * (0.85 + 0.3 * r());
  }
  const real = seeds.filter(() => r() > 0.16), nReal = real.length, keep = real.slice();
  // benih HANTU (tidak digambar) menutup sel di tepi: sepanjang permukaan akar (membentuk korteks soket ±37 px) dan di luar batas tulang
  const ghost = (x, y) => keep.push([x, y]);
  for (let i = 0; i < rsd.length; i += 2) { const q = offs([rsd[Math.max(0, i - 1)], rsd[i], rsd[Math.min(rsd.length - 1, i + 1)]], 8)[1]; ghost(q[0], q[1]); }
  for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]); for (let u = 0; u < l; u += 46) { const x = a[0] + (b[0] - a[0]) * u / l, y = a[1] + (b[1] - a[1]) * u / l, nx = -(b[1] - a[1]) / l, ny = (b[0] - a[0]) / l; for (const sg of [1, -1]) { const gx = x + nx * 30 * sg, gy = y + ny * 30 * sg; if (!inside(gx, gy)) ghost(gx, gy); } } }   // sebagian benih dibuang -> rongga lebih besar tempat sel tetangga melebur
  const hash = (i, j) => { const a = Math.min(i, j), b = Math.max(i, j); const v = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return v - Math.floor(v); };
  const cells = selVoronoi(keep, { R: 190, tebal: (i, j) => { const [x, y] = keep[i]; const nd = near(x, y), base = nd < 130 ? 9 : 7; return base + 9 * hash(i, j) ** 1.5; } }).filter((c) => c.i < nReal && near(c.c[0], c.c[1]) > 46 && dPoly(c.c[0], c.c[1]) > 30);
  const areaOf = (poly2) => { let a = 0; for (let i = 0; i < poly2.length; i++) { const p0 = poly2[i], p1 = poly2[(i + 1) % poly2.length]; a += p0[0] * p1[1] - p1[0] * p0[1]; } return Math.abs(a) / 2; };
  cells.forEach((c) => { c.luas = areaOf(c.poly); });
  const big = cells.reduce((a, c) => (c.luas > a.luas ? c : a), cells[0]);
  const nb = cells.filter((c) => c !== big).reduce((a, c) => (Math.hypot(c.c[0] - big.c[0], c.c[1] - big.c[1]) < Math.hypot(a.c[0] - big.c[0], a.c[1] - big.c[1]) ? c : a));
  return { d: cells.map((c) => halus(c.poly, 3)).join(''), n: cells.length, big: { x: big.c[0], y: big.c[1] }, mid: [(big.c[0] + nb.c[0]) / 2, (big.c[1] + nb.c[1]) / 2], seeds: keep.length };
}

const gumGrad = 'url(#gGum)';
export function siluet(o = {}) {
  const tone = { tooth: '#F4EEDF', gum: '#E58A9A', bone: '#D8B07C', line: '#2A1A12' };
  let s = `<rect x="0" y="0" width="${W}" height="${H}" fill="#fff"/>`;
  s += `<g stroke="${tone.line}" stroke-width="2.4" stroke-linejoin="round"><path d="${boneD}" fill="${tone.bone}"/><path d="${gumL}" fill="${tone.gum}"/><path d="${gumR}" fill="${tone.gum}"/><path d="${TOOTH_D}" fill="${tone.tooth}"/></g>`;
  if (o.guides) s += guides(LM, '');
  return s;
}
export function guides(L, tag, color = ['#D01030', '#1060D0', '#10A050', '#777']) {
  const [cE, cA, cD, cG] = color, k = L.k || 1, lx = L.labelX ?? 10, line = (y, c, t) => `<line x1="-4000" y1="${f1(y)}" x2="4000" y2="${f1(y)}" stroke="${c}" stroke-width="${f1(2.4 / k)}" stroke-dasharray="${f1(14 / k)} ${f1(8 / k)}"/><text x="${f1(lx)}" y="${f1(y - 6 / k)}" font-family="DejaVu Sans, sans-serif" font-size="${f1(22 / k)}" font-weight="700" fill="${c}">${t}${tag}</text>`;
  return `<g>${line(L.crownTop, cG, 'puncak mahkota')}${line(L.cej, cE, 'garis leher (CEJ)')}${line(L.dome, cD, 'kubah furkasi')}${line(L.apexM, cA, 'ujung akar')}<line x1="${f1(L.crownL)}" y1="${f1(L.crownTop - 30)}" x2="${f1(L.crownL)}" y2="${f1(L.cej)}" stroke="${cG}" stroke-width="${f1(2.4 / k)}" stroke-dasharray="6 6"/><line x1="${f1(L.crownR)}" y1="${f1(L.crownTop - 30)}" x2="${f1(L.crownR)}" y2="${f1(L.cej)}" stroke="${cG}" stroke-width="2.4" stroke-dasharray="6 6"/><line x1="${f1(L.crownL)}" y1="${f1(L.crownTop - 22)}" x2="${f1(L.crownR)}" y2="${f1(L.crownTop - 22)}" stroke="${cG}" stroke-width="2.4"/><text x="${f1(L.cx - 90)}" y="${f1(L.crownTop - 32)}" font-family="DejaVu Sans, sans-serif" font-size="${f1(22 / k)}" font-weight="700" fill="${cG}">lebar mahkota ${L.crownWpx ?? f1(L.crownR - L.crownL)} px</text></g>`;
}


export const TEMA = TEMA_MEDCOEL;
export const LAYERS = [['g-siluet', 'Siluet gigi utuh (pembuka klip)'], ['g-tulang', 'Tulang alveolar (kortikal + trabekula + sumsum)'], ['g-lig-periodontal', 'Ligamen periodontal + lamina dura'], ['g-dentin', 'Dentin'], ['g-sementum', 'Sementum'], ['g-pulpa', 'Ruang pulpa + kanal akar'], ['g-saraf-pembuluh', 'Saraf dan pembuluh'], ['g-email', 'Email'], ['g-gusi', 'Gusi + mukosa'], ['g-kontur', 'Kontur tinta'], ['g-konteks-ian', 'OPSIONAL (mati): kanal mandibula + cabang dental']];
// jadwal reveal (detik) untuk klip 5 dtk: [mulai, selesai, arah]
export const JADWAL = { 'g-email': [1.0, 1.5, 'pudar'], 'g-dentin': [1.3, 1.9, 'pudar'], 'g-pulpa': [1.8, 2.5, 'naik'], 'g-saraf-pembuluh': [2.3, 2.8, 'pudar'], 'g-sementum': [2.4, 2.9, 'pudar'], 'g-lig-periodontal': [2.9, 3.5, 'pudar'], 'g-tulang': [2.8, 3.5, 'naik'], 'g-gusi': [3.5, 4.1, 'naik'], 'g-kontur': [3.4, 3.9, 'pudar'] };   // siluet gigi utuh (g-siluet) tampil sejak awal
// jadwal label (detik) [kunci, sisi, teks, t0, t1]; maksimum 3 label sekaligus (diperiksa oleh maksLabel)
export const LABEL_T = [['email', -1, 'Email', 1.2, 2.8], ['dentin', -1, 'Dentin', 1.6, 3.15], ['pulpa', 1, 'Pulpa', 2.1, 3.7], ['kanal', 1, 'Akar', 2.9, 4.4], ['tulang', -1, 'Tulang', 3.2, 4.55]];

export function gigi(o = {}) {
  const p = 'g', labels = !!o.labels, t = o.t ?? 0, anim = !!o.anim, r = rng(9), konteks = !!o.konteks, bone = konteks ? BONE_DEEP : BONE, bd = bone.d, cav = marrowSpaces(rng(21), bone.poly);
  const SH = 70, K = kam(anim ? t : 0, { cx: 540, cy: 960, dy: -20 }), KP = (x, y) => { const q = K.pt(x, y); return [q[0], q[1] + SH]; };
  const rv = (id, inner) => {
    if (!anim) return inner; const [a, b, dir] = JADWAL[id], u = seg(t, a, b, E.out); if (u >= 1) return inner; if (u <= 0.001) return '';
    if (dir === 'pudar') return `<g opacity="${f1(u)}">${inner}</g>`;
    const Y0 = 100, Y1 = 1900, h = (Y1 - Y0) * u, y = dir === 'naik' ? Y1 - h : Y0;
    return `<clipPath id="gRv${id}"><rect x="-200" y="${f1(y)}" width="1500" height="${f1(h)}"/></clipPath><g opacity="${f1(Math.min(1, u * 2.5))}" clip-path="url(#gRv${id})">${inner}</g>`;
  };
  let s = latar(p, { seed: 5, fokus: { x: 540, y: 1000 }, t: anim ? t : 0 });
  s += `<defs>
  <linearGradient id="gEn" gradientUnits="userSpaceOnUse" x1="260" y1="${T0}" x2="820" y2="${CEJ}"><stop offset="0" stop-color="#C6DCD8"/><stop offset=".5" stop-color="#9FBFBC"/><stop offset="1" stop-color="#6E9694"/></linearGradient>
  <linearGradient id="gSil" gradientUnits="userSpaceOnUse" x1="0" y1="${T0}" x2="0" y2="${CEJ + 60}"><stop offset="0" stop-color="#F4F8F4"/><stop offset=".55" stop-color="#DCEAE4"/><stop offset=".93" stop-color="#C6DCD4"/><stop offset="1" stop-color="#EBDDB8"/></linearGradient>
  <radialGradient id="gDen" gradientUnits="userSpaceOnUse" cx="500" cy="540" r="900"><stop offset="0" stop-color="#FFE7B0"/><stop offset=".5" stop-color="#F3BE76"/><stop offset="1" stop-color="#CC8C46"/></radialGradient>
  <radialGradient id="gPulp" gradientUnits="userSpaceOnUse" cx="520" cy="620" r="520"><stop offset="0" stop-color="#FF8088"/><stop offset=".5" stop-color="#E24A5E"/><stop offset="1" stop-color="#982242"/></radialGradient>
  <linearGradient id="gBone" gradientUnits="userSpaceOnUse" x1="0" y1="780" x2="0" y2="1600"><stop offset="0" stop-color="#F6EBCB"/><stop offset=".55" stop-color="#E6CF9C"/><stop offset="1" stop-color="#CDA96E"/></linearGradient>
  <linearGradient id="gMarrow" gradientUnits="userSpaceOnUse" x1="0" y1="780" x2="0" y2="1600"><stop offset="0" stop-color="#C99654"/><stop offset="1" stop-color="#A06D36"/></linearGradient>
  <linearGradient id="gGum" gradientUnits="userSpaceOnUse" x1="0" y1="${f1(TIP_Y - 20)}" x2="0" y2="${f1(CREST_Y + 80)}"><stop offset="0" stop-color="#F4AAB4"/><stop offset=".5" stop-color="#E06A80"/><stop offset="1" stop-color="#B0444F"/></linearGradient>
  <linearGradient id="gMuc" gradientUnits="userSpaceOnUse" x1="0" y1="780" x2="0" y2="1100"><stop offset="0" stop-color="#C9566A"/><stop offset="1" stop-color="#8F3548"/></linearGradient>
  <filter id="gBlurW" filterUnits="userSpaceOnUse" x="-300" y="0" width="1700" height="2000"><feGaussianBlur stdDeviation="8"/></filter>
  <radialGradient id="gBoneEdge" gradientUnits="userSpaceOnUse" cx="540" cy="1230" r="560" gradientTransform="translate(540 1230) scale(1 .78) translate(-540 -1230)"><stop offset=".6" stop-color="#0A3830" stop-opacity="0"/><stop offset="1" stop-color="#0A3830" stop-opacity=".55"/></radialGradient>
  <clipPath id="gClipDen"><path d="${DENTIN_D}"/></clipPath><clipPath id="gClipEn"><path d="${ENAMEL_D}"/></clipPath><clipPath id="gClipBone"><path d="${bd}"/></clipPath>
  <clipPath id="gClipGumL"><path d="${gumL}"/></clipPath><clipPath id="gClipGumR"><path d="${gumR}"/></clipPath>
  <mask id="gBoneFade" maskUnits="userSpaceOnUse" x="-100" y="700" width="1300" height="1300"><g filter="url(#${p}blur20)"><path d="${bd}" fill="#fff" stroke="#000" stroke-width="44"/><rect x="-100" y="700" width="1300" height="${CREST_Y + 150 - 700}" fill="#fff"/></g><path d="${TOOTH_D}" fill="#000" stroke="#000" stroke-width="30" stroke-linejoin="round"/></mask>
  <mask id="gCanMask" maskUnits="userSpaceOnUse" x="-100" y="1400" width="1300" height="500"><ellipse cx="545" cy="1700" rx="250" ry="64" fill="#fff" filter="url(#${p}blur20)"/></mask>
  </defs>`;
  let sc = '';   // isi adegan (kena kamera)

  // ---- tulang alveolar: massa kortikal-trabekular; rongga sumsum = sel Voronoi bertepi (bukan jaring garis); korteks tipis di puncak; tepi luar memudar
  let bn = `<g mask="url(#gBoneFade)"><g filter="url(#${p}shadow)"><path d="${bd}" fill="url(#gBone)"/></g>`;
  bn += `<g class="nos"><clipPath id="gCav"><path d="${cav.d}"/></clipPath><path d="${cav.d}" fill="#5E3A18"/><g clip-path="url(#gCav)"><g transform="translate(2.8 3.4)"><path d="${cav.d}" fill="url(#gMarrow)"/></g></g></g>`;
  bn += fx(`<g clip-path="url(#gClipBone)"><path d="${bd}" fill="url(#gBoneEdge)"/><path d="${cav.d}" fill="none" stroke="#FFF6DC" stroke-width="2.4" opacity=".6" transform="translate(-1.6 -1.8)"/><path d="${ROOT_OPEN}" fill="none" stroke="#5A3410" stroke-width="64" opacity=".22" filter="url(#${p}blur20)"/></g>`);
  bn += `</g><path d="${crestLineL}" fill="none" stroke="#F8EBC8" stroke-width="3.6" stroke-linecap="round" opacity=".8"/><path d="${crestLineR}" fill="none" stroke="#F8EBC8" stroke-width="3.6" stroke-linecap="round" opacity=".8"/>`;
  sc += rv('g-tulang', `<g id="g-tulang">${bn}</g>`);

  // ---- LAYER OPSIONAL (mati secara default; gigi({konteks:true})): kanal mandibula + berkas saraf-pembuluh + cabang dental. Posisi dan skala belum dapat dipertanggungjawabkan -> bukan bagian render utama.
  if (konteks) {
    const CAN_AXIS = sampleCubic([300, 1700, 400, 1692, 500, 1688, 580, 1692, 660, 1698, 740, 1700, 800, 1696], 20);
    const sk = (dy, w, c) => `<path d="${pl(CAN_AXIS.map(([x, y]) => [x, y + dy]))}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
    let kx = `<g id="g-konteks-ian" opacity=".85"><g mask="url(#gCanMask)">${sk(0, 84, '#F3DDBF')}${sk(0, 74, '#E4B196')}${sk(3, 32, '#D2B25C')}${sk(-22, 9, '#D2605A')}${sk(24, 12, '#6A76C4')}</g>`;
    const FMk = [CAN_MBm[CAN_MBm.length - 2], CAN_MBm[CAN_MBm.length - 1]], FDk = [CAN_Dm[CAN_Dm.length - 2], CAN_Dm[CAN_Dm.length - 1]];
    for (const [F, J] of [[FMk, [480, 1664]], [FDk, [640, 1668]]]) {
      const br = sampleCubic([F[0], F[1], F[0] - 4, F[1] + 120, J[0] + 8, J[1] - 130, J[0], J[1]], 28);
      kx += `<path d="${pl(br)}" fill="none" stroke="#E7A98C" stroke-width="15" stroke-linecap="round" opacity=".8"/>`;
      [[PAL.nerve], ['#F0282A'], ['#4A56E0']].forEach(([c], i) => { kx += `<path d="${pl(offs(br, (i - 1) * 5))}" fill="none" stroke="${c}" stroke-width="3.2" stroke-linecap="round"/>`; });
    }
    sc += kx + `</g>`;
  }

  // ---- ligamen periodontal (0,15-0,38 mm; di sini ±11 px) + lamina dura (±6 px), mengikuti seluruh kontur akar termasuk furkasi
  let pdl = `<path d="${ROOT_OPEN}" fill="none" stroke="#FBF1D2" stroke-width="34" stroke-linejoin="round" stroke-linecap="round"/><path d="${ROOT_OPEN}" fill="none" stroke="#E58E78" stroke-width="22" stroke-linejoin="round" stroke-linecap="round"/>`;
  let fib = '';
  sampleCubic(ROOTm, 16).forEach(([x, y], i) => { if (i % 2 || y < CREST_Y + 6) return; const sx = x < 540 ? -1 : 1; fib += `<path d="M${f1(x)} ${f1(y)}l${f1(sx * 13)} ${f1(y < CEJ + 190 ? -9 : 8)}" stroke="#A9482C" stroke-width="2" opacity=".6" stroke-linecap="round"/>`; });
  sc += rv('g-lig-periodontal', `<g id="g-lig-periodontal">${pdl}${fx(fib)}</g>`);

  // ---- siluet gigi utuh (alur video: dikenali dulu sebagai gigi dengan mahkota, lalu email/dentin/pulpa/akar/tulang dibuka); memakai TOOTH_D yang sudah ada, tertutup oleh dentin+email setelah dibuka
  if (anim && t < 2.4) sc += `<g id="g-siluet" opacity="${f1(1 - seg(t, 2.0, 2.4))}"><g filter="url(#${p}shadow)"><g filter="url(#${p}vol)"><path d="${TOOTH_D}" fill="url(#gSil)"/></g></g>${fx(`<path d="${cubicD(CROWN_INm)}" fill="none" stroke="#FFFFFF" stroke-width="22" opacity=".28" filter="url(#${p}blur8)" transform="translate(-6 -6)"/>`)}<path d="${TOOTH_D}" fill="none" stroke="${KONTUR.warna}" stroke-width="${KONTUR.lebar}" stroke-linejoin="round" opacity="${KONTUR.opasitas}"/></g>`;
  // ---- dentin (mahkota + akar sebagai SATU bentuk): hangat-emas, tubulus radial
  let den = `<g filter="url(#${p}shadow)"><g filter="url(#${p}volS)"><path d="${DENTIN_D}" fill="url(#gDen)"/></g></g>`;
  let tub = '';
  for (let i = 0; i < 150; i++) { const a = (i / 150) * Math.PI * 2, cx = 540, cy = 790, rr0 = 120, rr1 = 360 + Math.sin(a * 2) * 40; tub += `<path d="M${f1(cx + Math.cos(a) * rr0)} ${f1(cy + Math.sin(a) * rr0 * 1.1)}L${f1(cx + Math.cos(a) * rr1)} ${f1(cy + Math.sin(a) * rr1 * 0.95)}" stroke="#A8661F" stroke-width="1.4" opacity=".2"/>`; }
  den += fx(`<g clip-path="url(#gClipDen)"><g transform="${crownAffine}">${tub}</g><path d="${CHAMBER}" fill="none" stroke="#A8581C" stroke-width="64" opacity=".32" filter="url(#${p}blur20)"/><path d="${cubicD(CAN_MBm)}" fill="none" stroke="#A8581C" stroke-width="52" opacity=".26" filter="url(#${p}blur20)"/><path d="${cubicD(CAN_Dm)}" fill="none" stroke="#A8581C" stroke-width="56" opacity=".26" filter="url(#${p}blur20)"/><path d="${ROOT_OPEN}" fill="none" stroke="#FFF4D2" stroke-width="30" opacity=".26" filter="url(#${p}blur8)" transform="translate(13 5)"/><path d="${ROOT_OPEN}" fill="none" stroke="#3A1E08" stroke-width="40" opacity=".32" filter="url(#${p}blur8)" transform="translate(-14 -6)"/><path d="${cubicD(CROWN_INm)}" fill="none" stroke="#3A1E08" stroke-width="40" opacity=".16" filter="url(#${p}blur8)" transform="translate(-7 -7)"/></g>`);
  sc += rv('g-dentin', `<g id="g-dentin">${den}</g>`);
  sc += rv('g-sementum', `<g id="g-sementum"><path d="${ROOT_OPEN}" fill="none" stroke="#C9A064" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"/>${fx(`<path d="${ROOT_OPEN}" fill="none" stroke="#F4D8A0" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round" opacity=".8" transform="translate(-1 -1)"/>`)}</g>`);

  // ---- pulpa: ruang pulpa dengan dua tanduk, kanal MB (dan ML samar di luar bidang), kanal distal (jumlah dan bentuk dasar tidak diubah)
  const cm = sampleCubic(CAN_MBm, 14), cml = sampleCubic(CAN_MLm, 14), cd = sampleCubic(CAN_Dm, 14);
  const eMB = (u) => 1 - Math.pow(1 - u, 2.2), RB = ribbon(cm, 54, 12, eMB), RD = ribbon(cd, 60, 14, eMB);
  let pu = `<g class="nos"><path d="${ribbon(cml, 44, 10, eMB)}" fill="#A02040" opacity=".5"/>`;
  pu += `<g filter="url(#${p}shadowS)"><g filter="url(#${p}volS)"><path d="${CHAMBER}" fill="url(#gPulp)"/><path d="${RB}" fill="url(#gPulp)"/><path d="${RD}" fill="url(#gPulp)"/></g></g>`;
  pu += fx(`<clipPath id="gClipP"><path d="${CHAMBER}"/><path d="${RB}"/><path d="${RD}"/></clipPath><g clip-path="url(#gClipP)"><path d="${CHAMBER}" fill="none" stroke="#5A0A22" stroke-width="36" opacity=".5" filter="url(#${p}blur8)" transform="translate(8 11)"/><path d="${RB}" fill="none" stroke="#5A0A22" stroke-width="16" opacity=".35" filter="url(#${p}blur4)" transform="translate(6 0)"/><path d="${pl([[MX(440), MY(700)], [MX(434), MY(760)], [MX(436), MY(830)], [MX(444), MY(884)]])}" fill="none" stroke="#fff" stroke-width="11" opacity=".3" stroke-linecap="round" filter="url(#${p}blur4)"/></g>`);
  pu += `</g>`;
  sc += rv('g-pulpa', `<g id="g-pulpa">${pu}</g>`);

  // ---- saraf (emas), arteriol (koral), venula (biru akademik): masuk lewat foramen apikal dan naik lewat kanal; berhenti di foramen
  const COLS = [[MC.gold, '#7A5A08'], ['#F0525A', '#5A0610'], [MC.academic, '#0F2F48']];
  const strand = (d, w, c, dk) => `<path d="${d}" fill="none" stroke="${dk}" stroke-width="${f1(w + 1.6)}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${c}" stroke-width="${f1(w)}" stroke-linecap="round" stroke-linejoin="round"/>`;
  let sp = '';
  for (const c0 of [cm, cd]) COLS.forEach(([c, dk], i) => { sp += strand(pl(offs(c0, (i - 1) * 3.2)), 2.6, c, dk); });
  const fan = (x0, y0, targets) => targets.map(([tx, ty], i) => { const [c, dk] = COLS[i % 3]; const a = [MX(x0), MY(y0)], b = [MX(tx), MY(ty)]; return strand(`M${f1(a[0])} ${f1(a[1])}C${f1(a[0] + (b[0] - a[0]) * 0.15)} ${f1(a[1] - 70)} ${f1(b[0] + (a[0] - b[0]) * 0.05)} ${f1(b[1] + 90)} ${f1(b[0])} ${f1(b[1])}`, 2.8, c, dk); }).join('');
  sp += fx(fan(470, 930, [[446, 690], [452, 700], [430, 750], [478, 780]]) + fan(612, 930, [[634, 690], [628, 702], [650, 750], [602, 784]]));
  sc += rv('g-saraf-pembuluh', `<g id="g-saraf-pembuluh">${sp}</g>`);

  // ---- email: cincin tembus cahaya hijau-es (bukan putih pekat); tepi dalam hangat (dentin menembus), tepi luar pantul mint, tebal di tonjol dan menipis ke leher
  let em = `<g filter="url(#${p}shadow)"><g filter="url(#${p}vol)"><path d="${ENAMEL_D}" fill="url(#gEn)"/></g></g>`;
  em += fx(`<g clip-path="url(#gClipEn)"><path d="${cubicD(CROWN_INm)}" fill="none" stroke="#FFD9A0" stroke-width="46" opacity=".42" filter="url(#${p}blur8)"/><path d="${CROWN_OPEN}" fill="none" stroke="${MC.mint2}" stroke-width="30" opacity=".5" filter="url(#${p}blur8)"/><g transform="${crownAffine}"><path d="M770 700C778 650 750 606 716 590" fill="none" stroke="#0F3A36" stroke-width="24" opacity=".3" stroke-linecap="round" filter="url(#${p}blur8)"/><path d="M312 690C316 636 346 600 392 570" fill="none" stroke="#fff" stroke-width="18" opacity=".26" stroke-linecap="round" filter="url(#${p}blur8)"/><path d="M372 552C396 536 424 530 446 534" fill="none" stroke="#FFF6D8" stroke-width="5" opacity=".6" stroke-linecap="round" filter="url(#${p}blur2)"/><path d="M606 548C622 540 640 538 656 542" fill="none" stroke="#FFF6D8" stroke-width="4" opacity=".35" stroke-linecap="round" filter="url(#${p}blur2)"/></g></g>`);
  em += fx(`<path d="${cubicD(CROWN_INm)}" fill="none" stroke="#2E6E68" stroke-width="2.6" opacity=".55" stroke-dasharray="26 4 12 4"/>`);
  sc += rv('g-email', `<g id="g-email">${em}</g>`);

  // ---- gusi: kerah yang naik membungkus leher (tebal di papila, tipis di tepi), melanjutkan sebagai mukosa tipis di atas tulang; bayangan mengikuti leher gigi dan puncak tulang
  let gm = '';
  for (const d of [gumL, gumR]) gm += `<g filter="url(#${p}shadow)"><path d="${d}" fill="url(#gGum)"/></g>`;
    for (const [tooth, arc, crv, cl] of [[toothLeft, GUM_ARCL, CRESTL, 'gClipGumL'], [rightFromTip, GUM_ARCR, CRESTR, 'gClipGumR']]) {
    const sulc = tooth.filter(([, y]) => y <= CEJ - 30), je = tooth.filter(([, y]) => y >= CEJ - 32 && y <= CEJ + 2), ct = tooth.filter(([, y]) => y >= CEJ);
    gm += fx(`<g clip-path="url(#${cl})"><path d="${pl(tooth)}" fill="none" stroke="#6E1838" stroke-width="34" opacity=".42" filter="url(#gBlurW)"/><path d="${cubicD(crv)}" fill="none" stroke="#7A2040" stroke-width="46" opacity=".36" filter="url(#gBlurW)"/><path d="${cubicD(arc)}" fill="none" stroke="#FFD9DE" stroke-width="22" opacity=".5" stroke-linecap="round" filter="url(#gBlurW)" transform="translate(0 14)"/><path d="${cubicD(arc)}" fill="none" stroke="#fff" stroke-width="4" opacity=".35" stroke-linecap="round" filter="url(#${p}blur2)" transform="translate(0 3)"/></g>`);
    gm += `<path d="${pl(sulc)}" fill="none" stroke="#4A0818" stroke-width="3.2" opacity=".6" stroke-linecap="round"/><path d="${pl(je)}" fill="none" stroke="#FFC4CC" stroke-width="5" opacity=".8" stroke-linecap="round"/>` + fx(`<path d="${pl(ct)}" fill="none" stroke="#FFC4CC" stroke-width="5" opacity=".5" stroke-linecap="round"/>`);
  }
  sc += rv('g-gusi', `<g id="g-gusi">${gm}</g>`);
  // ---- kontur tinta tipis di tepi jaringan (memisahkan lapisan dan menjaga keterbacaan di ponsel)
  sc += rv('g-kontur', `<g id="g-kontur" fill="none" stroke="${KONTUR.warna}" stroke-width="${KONTUR.lebar}" stroke-linejoin="round" opacity="${KONTUR.opasitas}"><path d="${TOOTH_D}"/><path d="${gumL}"/><path d="${gumR}"/></g>`);
  let fl = '';
  for (const c of [cm, cd]) for (let i = 0; i < 4; i++) { const u = (((t * 0.4 + i / 4) % 1) + 1) % 1, [x, y] = c[Math.floor((1 - u) * (c.length - 1))]; fl += `<circle cx="${f1(x)}" cy="${f1(y)}" r="5" fill="#FFF3D0" opacity="${f1(0.7 * Math.sin(u * Math.PI))}"/>`; }
  sc += fx(`<g id="g-pulpa-aliran" filter="url(#${p}blur2)">${fl}</g>`);

  // transisi antarorgan (selam): masuk lewat foramen apikal akar distal, keluar lewat ruang pulpa (zoom ke lumen merah)
  const SL = anim ? selam(t, { masuk: { ...fk(KP(MX(722), MY(1438))), r: 26 }, keluar: { ...fk(KP(MX(540), MY(700))), r: 70 } }, 'gsl') : { zoom: '', ov: '', aJudul: 1 };
  s += `<g transform="${SL.zoom}"><g id="mc-adegan" transform="translate(0 ${SH}) ${K.tf}">${sc}</g></g>`;
  s += SL.ov;
  s += vignette(p);
  s += merek({ judul: 'Gigi', sub: 'Molar 1 bawah · potongan mesiodistal', aJudul: SL.aJudul });
  if (labels) {
    const P2 = KP, tl = anim ? t : 4.2;
    const anc = { tulang: P2(cav.big.x, cav.big.y), dentin: P2(MX(380), MY(740)), pulpa: P2(MX(642), MY(676)), email: P2(MX(372), MY(598)), kanal: P2(MX(718), MY(1300)) };
    const pos = { email: ['L', 470], dentin: ['L', 560], pulpa: ['R', 470], kanal: ['R', 1690], tulang: ['L', 1650] };   // chip hanya di jalur bebas (samping mahkota, di bawah organ), tidak menutupi tepi gigi/gusi/tulang
    s += labelsT(LABEL_T.map(([k, sd, tx, t0, t1]) => [...anc[k], sd, tx, t0, t1, pos[k][1], pos[k][0]]), tl, { atas: 330 });
  }
  return s;
}
const labels2 = labels;
function fk([x, y]) { return { x, y }; }

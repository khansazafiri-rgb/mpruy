// Potongan mesiodistal (sagital) gigi MOLAR PERTAMA RAHANG BAWAH permanen (gigi 36/46) dengan jaringan penyangga. Kode murni (SVG + filter), 1080 x 1920. Revisi 6 (komposisi dan proporsi dulu).
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
import { PAL, W, H, f1, rng, mix, lighten, darken, background, vignette, label, ribbon, sampleCubic, cubicD, fx } from './anatomi.js';
export const P = 'g';
export const FLAT = { gEn: '#E6E8F8', gDen: '#EFB473', gPulp: '#D8344E', gBone: '#EBBB84', gGum: '#E8506C' };

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
const GUM_ARCL = rel(tipL, -1, [0, 0, 8, 16, 22, 28, 46, 32, 80, 36, 104, 32, 126, 48, 152, 70, 170, 112, 178, CREST_Y + 36 - tipL[1]]);
const GUM_ARCR = rel(tipR, 1, [0, 0, 8, 18, 24, 30, 50, 36, 86, 40, 112, 34, 134, 52, 160, 76, 178, 120, 186, CREST_Y + 42 - tipR[1]]);
const endL = [GUM_ARCL[GUM_ARCL.length - 2], GUM_ARCL[GUM_ARCL.length - 1]], endR = [GUM_ARCR[GUM_ARCR.length - 2], GUM_ARCR[GUM_ARCR.length - 1]];
const CRESTL = [crestL[0], crestL[1], crestL[0] - 24, crestL[1] + 3, crestL[0] - 60, crestL[1] + 8, crestL[0] - 100, crestL[1] + 12, crestL[0] - 140, crestL[1] + 18, crestL[0] - 190, crestL[1] + 22, endL[0], endL[1]];
const CRESTR = [crestR[0], crestR[1], crestR[0] + 24, crestR[1] + 3, crestR[0] + 60, crestR[1] + 9, crestR[0] + 100, crestR[1] + 14, crestR[0] + 140, crestR[1] + 20, crestR[0] + 190, crestR[1] + 24, endR[0], endR[1]];
// CRESTL/R: 2 + 6*2 = 14 angka -> dua segmen; fix panjang di bawah bila perlu
const gumL = `M${f1(tipL[0])} ${f1(tipL[1])}${cubicTail(GUM_ARCL)}${cubicTail(rev(CRESTL))}${polyD(toothLeft.slice().reverse()).replace(/^M/, 'L')}Z`;
const gumR = `M${f1(tipR[0])} ${f1(tipR[1])}${cubicTail(GUM_ARCR)}${cubicTail(rev(CRESTR))}${polyD(rightFromTip.slice().reverse()).replace(/^M/, 'L')}Z`;
// massa tulang: puncak mengikuti akar, tepi samping dan bawah organik (menyempit ke bawah seperti mangkuk), isi di antara dan di bawah kedua akar
const wob = (i) => Math.sin(i * 1.7) * 7 + Math.cos(i * 2.9) * 5;
const bY = (y) => (y > 1380 ? 1380 + (y - 1380) * 0.78 : y);
const BONE_OUT = [[endL[0], endL[1]], [58 + wob(1), 900], [50 + wob(2), bY(1010)], [54 + wob(3), bY(1140)], [66 + wob(4), bY(1270)], [92 + wob(5), bY(1390)], [142 + wob(6), bY(1500)], [222 + wob(7), bY(1590)], [340 + wob(8), bY(1662)], [460 + wob(9), bY(1708)], [540, bY(1722)], [640 + wob(10), bY(1712)], [760 + wob(11), bY(1672)], [860 + wob(12), bY(1600)], [940 + wob(13), bY(1510)], [992 + wob(14), bY(1400)], [1014 + wob(15), bY(1270)], [1022 + wob(16), bY(1140)], [1020 + wob(17), bY(1010)], [1008 + wob(18), 900], [endR[0], endR[1]]];
const boneD = `${cubicD(CRESTL)}${smoothTail(BONE_OUT)}${cubicTail(rev(CRESTR))}Z`;
const crestLineL = cubicD(CRESTL), crestLineR = cubicD(CRESTR);

// ---- struktur trabekula (terarah): lengkung konsentris mengikuti kontur akar + penopang radial yang tegak lurus permukaan akar; ukuran membesar menjauhi akar
function trabekula(r) {
  const rsd = sampleCubic(ROOTm, 22), near = (p) => { let m = 1e9; for (const q of rsd) { const dd = Math.hypot(p[0] - q[0], p[1] - q[1]); if (dd < m) m = dd; } return m; };
  const rib = (pts, w0, w1, op) => (pts.length > 2 ? `<path d="${ribbon(pts, w0, w1)}" opacity="${f1(op)}"/>` : '');
  let o = '';
  // lengkung konsentris (mengikuti kontur akar), terputus-putus, menipis di ujungnya; jarak makin jauh -> makin jarang dan tebal
  for (const d of [58, 148, 258, 392]) {
    const pts = offs(rsd, d).filter((p) => p[1] > CREST_Y + 18 && near(p) >= d * 0.9);
    let i = 0;
    while (i < pts.length - 4) {
      const len = 5 + Math.floor(r() * (4 + d / 60)), seg = []; let j = i;
      while (j < pts.length && seg.length < len && (j === i || Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1]) < 40)) { seg.push(pts[j]); j += 1; }
      if (seg.length > 4 && r() > 0.35) { const w = (8 + r() * 5) * (1 + d / 700), flip = r() > 0.5; o += rib(seg.filter((_, k) => k % 2 === 0), flip ? w * 0.4 : w, flip ? w : w * 0.4, 0.85 - d / 1500); }
      i = j + 3 + Math.floor(r() * (3 + d / 50));
    }
  }
  // penopang radial: tegak lurus permukaan akar, berkelok, menirus, bercabang Y; panjang dan jarak bervariasi
  let acc = 0;
  for (let i = 1; i < rsd.length - 1; i++) {
    acc += Math.hypot(rsd[i][0] - rsd[i - 1][0], rsd[i][1] - rsd[i - 1][1]);
    if (acc < 38 + r() * 46) continue; acc = 0;
    const a = rsd[i - 1], b = rsd[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, p0 = rsd[i];
    if (p0[1] < CREST_Y + 26) continue;
    const L = 110 + r() * 300, amp = 16 + r() * 30, ph = r() * 6, path = (len, ang, from) => { const c = Math.cos(ang), s2 = Math.sin(ang), ax = nx * c - ny * s2, ay = nx * s2 + ny * c, pts = []; for (let k = 0; k <= 10; k++) { const u = k / 10, off = amp * Math.sin(u * 4 + ph) * u; pts.push([from[0] + ax * (u * len) - ay * off, from[1] + ay * (u * len) + ax * off]); } return pts; };
    const main = path(L, 0, [p0[0] + nx * 16, p0[1] + ny * 16]);
    o += rib(main, 11 + r() * 3, 3.4, 0.85);
    if (r() > 0.25) { const br = path(L * 0.5, (r() > 0.5 ? 1 : -1) * (0.5 + r() * 0.35), main[5]); o += rib(br, 6.5, 2.4, 0.8); }
  }
  return `<g fill="#F4D9A6">${o}</g>`;
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

export function gigi(o = {}) {
  const p = 'g', labels = !!o.labels, t = o.t ?? 0, r = rng(9);
  let s = background(p, { seed: 8, glow: { x: 540, y: 1000, r: 820 }, tint: '#E8B0D8', vesselColor: '#B23A5A', cells: 16, particles: 90 });
  s += `<defs>
  <linearGradient id="gEn" gradientUnits="userSpaceOnUse" x1="260" y1="${T0}" x2="820" y2="${CEJ}"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".5" stop-color="#E9EBFA"/><stop offset="1" stop-color="#B4BCE8"/></linearGradient>
  <radialGradient id="gDen" gradientUnits="userSpaceOnUse" cx="500" cy="540" r="900"><stop offset="0" stop-color="#FFE3B6"/><stop offset=".5" stop-color="#F6B878"/><stop offset="1" stop-color="#C9783A"/></radialGradient>
  <radialGradient id="gPulp" gradientUnits="userSpaceOnUse" cx="520" cy="620" r="520"><stop offset="0" stop-color="#FF6B78"/><stop offset=".5" stop-color="#E03850"/><stop offset="1" stop-color="#8A1030"/></radialGradient>
  <linearGradient id="gBone" gradientUnits="userSpaceOnUse" x1="0" y1="780" x2="0" y2="1900"><stop offset="0" stop-color="#E2AA6A"/><stop offset=".6" stop-color="#CC8D50"/><stop offset="1" stop-color="#A9652F"/></linearGradient>
  <linearGradient id="gGum" gradientUnits="userSpaceOnUse" x1="0" y1="${f1(TIP_Y - 20)}" x2="0" y2="${f1(CREST_Y + 20)}"><stop offset="0" stop-color="#FF9AAC"/><stop offset=".5" stop-color="#EC4A68"/><stop offset="1" stop-color="#B01C44"/></linearGradient>
  <clipPath id="gClipDen"><path d="${DENTIN_D}"/></clipPath>
  <clipPath id="gClipEn"><path d="${ENAMEL_D}"/></clipPath>
  <clipPath id="gClipBone"><path d="${boneD}"/></clipPath>
  <mask id="gBoneFade" maskUnits="userSpaceOnUse" x="-100" y="700" width="1300" height="1300"><g filter="url(#${p}blur20)"><path d="${boneD}" fill="#fff" stroke="#000" stroke-width="100"/><rect x="-100" y="700" width="1300" height="${CREST_Y + 130 - 700}" fill="#fff"/></g></mask>
  <mask id="gCanMask" maskUnits="userSpaceOnUse" x="-100" y="1400" width="1300" height="400"><ellipse cx="545" cy="1552" rx="240" ry="62" fill="#fff" filter="url(#${p}blur20)"/></mask>
  </defs>`;

  // ---- tulang alveolar: massa yang mengikuti sisi dan ruang antar-akar; struktur trabekula terarah; tepi luar memudar ke latar
  s += `<g id="g-tulang"><g mask="url(#gBoneFade)"><g filter="url(#${p}shadow)"><path d="${boneD}" fill="url(#gBone)"/></g>`;
  s += fx(`<g clip-path="url(#gClipBone)">${trabekula(r)}<path d="${ROOT_OPEN}" fill="none" stroke="#7A3A10" stroke-width="70" opacity=".2" filter="url(#${p}blur20)"/></g>`);
  s += `</g>`;
  s += `<path d="${crestLineL}" fill="none" stroke="#FFF1CC" stroke-width="8" stroke-linecap="round" opacity=".95"/><path d="${crestLineR}" fill="none" stroke="#FFF1CC" stroke-width="8" stroke-linecap="round" opacity=".95"/>`;
  s += `</g>`;

  // ---- kanal mandibula (konteks): segmen pendek yang memudar di kedua ujung, bukan pita sepanjang bingkai
  const CAN_AXIS = sampleCubic([330, 1556, 420, 1548, 500, 1544, 570, 1548, 640, 1554, 710, 1556, 760, 1552], 20);
  const sk = (dy, w, c, extra = '') => `<path d="${pl(CAN_AXIS.map(([x, y]) => [x, y + dy]))}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" ${extra}/>`;
  s += `<g id="g-kanal-mandibula" mask="url(#gCanMask)" opacity=".85">`;
  s += sk(0, 84, '#F3DDBF') + sk(0, 74, '#E4B196') + sk(3, 32, '#D2B25C') + sk(-22, 9, '#D2605A') + sk(24, 12, '#6A76C4');
  s += `</g>`;

  // ---- ligamen periodontal (0,15-0,38 mm; di sini ±11 px) + lamina dura (±6 px), mengikuti seluruh kontur akar termasuk furkasi
  s += `<g id="g-lig-periodontal"><path d="${ROOT_OPEN}" fill="none" stroke="#FFF1CC" stroke-width="34" stroke-linejoin="round" stroke-linecap="round"/><path d="${ROOT_OPEN}" fill="none" stroke="#E8967C" stroke-width="22" stroke-linejoin="round" stroke-linecap="round"/>`;
  let fib = '';
  sampleCubic(ROOTm, 16).forEach(([x, y], i) => { if (i % 2 || y < CREST_Y + 6) return; const sx = x < 540 ? -1 : 1; fib += `<path d="M${f1(x)} ${f1(y)}l${f1(sx * 13)} ${f1(y < CEJ + 190 ? -9 : 8)}" stroke="#B5532E" stroke-width="2" opacity=".6" stroke-linecap="round"/>`; });
  s += fx(fib) + `</g>`;

  // ---- dentin (mahkota + akar sebagai SATU bentuk)
  s += `<g id="g-dentin"><g filter="url(#${p}shadow)"><g filter="url(#${p}volS)"><path d="${DENTIN_D}" fill="url(#gDen)"/></g></g>`;
  let tub = '';
  for (let i = 0; i < 150; i++) { const a = (i / 150) * Math.PI * 2, cx = 540, cy = 790, rr0 = 120, rr1 = 360 + Math.sin(a * 2) * 40; tub += `<path d="M${f1(cx + Math.cos(a) * rr0)} ${f1(cy + Math.sin(a) * rr0 * 1.1)}L${f1(cx + Math.cos(a) * rr1)} ${f1(cy + Math.sin(a) * rr1 * 0.95)}" stroke="#B5702E" stroke-width="1.4" opacity=".18"/>`; }
  s += fx(`<g clip-path="url(#gClipDen)"><g transform="${crownAffine}">${tub}</g><path d="${CHAMBER}" fill="none" stroke="#B5602A" stroke-width="64" opacity=".32" filter="url(#${p}blur20)"/><path d="${cubicD(CAN_MBm)}" fill="none" stroke="#B5602A" stroke-width="52" opacity=".26" filter="url(#${p}blur20)"/><path d="${cubicD(CAN_Dm)}" fill="none" stroke="#B5602A" stroke-width="56" opacity=".26" filter="url(#${p}blur20)"/><path d="${ROOT_OPEN}" fill="none" stroke="#fff" stroke-width="30" opacity=".24" filter="url(#${p}blur8)" transform="translate(13 5)"/><path d="${ROOT_OPEN}" fill="none" stroke="#6A2A0A" stroke-width="40" opacity=".3" filter="url(#${p}blur8)" transform="translate(-14 -6)"/><path d="${cubicD(CROWN_INm)}" fill="none" stroke="#6A2A0A" stroke-width="40" opacity=".16" filter="url(#${p}blur8)" transform="translate(-7 -7)"/><path d="${cubicD(CROWN_INm)}" fill="none" stroke="#FFF0CC" stroke-width="24" opacity=".3" filter="url(#${p}blur8)" transform="translate(8 8)"/></g>`);
  s += `</g>`;
  // ---- sementum: lapisan tipis
  s += `<g id="g-sementum"><path d="${ROOT_OPEN}" fill="none" stroke="${PAL.cementum}" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"/>`;
  s += fx(`<path d="${ROOT_OPEN}" fill="none" stroke="#F0CE90" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round" opacity=".8" transform="translate(-1 -1)"/>`);
  s += `</g>`;

  // ---- pulpa: ruang pulpa dengan dua tanduk, kanal MB (dan ML samar), kanal distal (jumlah dan bentuk dasar tetap seperti v4/v5)
  const cm = sampleCubic(CAN_MBm, 14), cml = sampleCubic(CAN_MLm, 14), cd = sampleCubic(CAN_Dm, 14);
  const eMB = (u) => 1 - Math.pow(1 - u, 2.2), RB = ribbon(cm, 54, 12, eMB), RD = ribbon(cd, 60, 14, eMB);
  s += `<g id="g-pulpa" class="nos"><path d="${ribbon(cml, 44, 10, eMB)}" fill="#B02040" opacity=".5"/>`;
  s += `<g filter="url(#${p}shadowS)"><g filter="url(#${p}volS)"><path d="${CHAMBER}" fill="url(#gPulp)"/><path d="${RB}" fill="url(#gPulp)"/><path d="${RD}" fill="url(#gPulp)"/></g></g>`;
  s += fx(`<clipPath id="gClipP"><path d="${CHAMBER}"/><path d="${RB}"/><path d="${RD}"/></clipPath><g clip-path="url(#gClipP)"><path d="${CHAMBER}" fill="none" stroke="#5A0A22" stroke-width="36" opacity=".5" filter="url(#${p}blur8)" transform="translate(8 11)"/><path d="${RB}" fill="none" stroke="#5A0A22" stroke-width="16" opacity=".35" filter="url(#${p}blur4)" transform="translate(6 0)"/><path d="${pl([[MX(440), MY(700)], [MX(434), MY(760)], [MX(436), MY(830)], [MX(444), MY(884)]])}" fill="none" stroke="#fff" stroke-width="11" opacity=".3" stroke-linecap="round" filter="url(#${p}blur4)"/></g>`);
  s += `</g>`;

  // ---- saraf (kuning), arteriol (merah), venula (biru): masuk lewat foramen apikal, naik lewat kanal; cabang dental ke kanal mandibula (konteks)
  const COLS = [[PAL.nerve, '#7A5A08'], ['#F0282A', '#5A0610'], ['#4A56E0', '#141860']];
  const strand = (d, w, c, dk) => `<path d="${d}" fill="none" stroke="${dk}" stroke-width="${f1(w + 1.6)}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${c}" stroke-width="${f1(w)}" stroke-linecap="round" stroke-linejoin="round"/>`;
  s += `<g id="g-saraf-pembuluh">`;
  const FM = [CAN_MBm[CAN_MBm.length - 2], CAN_MBm[CAN_MBm.length - 1]], FD = [CAN_Dm[CAN_Dm.length - 2], CAN_Dm[CAN_Dm.length - 1]], JM = [480, 1520], JD = [640, 1522];
  const branch = (F, J) => sampleCubic([F[0], F[1], F[0] - 4, F[1] + 120, J[0] + 8, J[1] - 130, J[0], J[1]], 28);
  for (const [F, J, c0] of [[FM, JM, cm], [FD, JD, cd]]) {
    const br = branch(F, J);
    s += `<g opacity=".8"><path d="${pl(br)}" fill="none" stroke="#FFE9C8" stroke-width="24" stroke-linecap="round" opacity=".55"/><path d="${pl(br)}" fill="none" stroke="#E7A98C" stroke-width="15" stroke-linecap="round" opacity=".8"/>`;
    COLS.forEach(([c, dk], i) => { s += strand(pl(offs(br, (i - 1) * 5)), 3.2, c, dk); });
    s += `</g>`;
    COLS.forEach(([c, dk], i) => { s += strand(pl(offs(c0, (i - 1) * 3.2)), 2.6, c, dk); });
  }
  const fan = (x0, y0, targets) => targets.map(([tx, ty], i) => { const [c, dk] = COLS[i % 3]; const a = [MX(x0), MY(y0)], b = [MX(tx), MY(ty)]; return strand(`M${f1(a[0])} ${f1(a[1])}C${f1(a[0] + (b[0] - a[0]) * 0.15)} ${f1(a[1] - 70)} ${f1(b[0] + (a[0] - b[0]) * 0.05)} ${f1(b[1] + 90)} ${f1(b[0])} ${f1(b[1])}`, 2.6, c, dk); }).join('');
  s += fx(fan(470, 930, [[446, 690], [452, 700], [430, 750], [478, 780]]) + fan(612, 930, [[634, 690], [628, 702], [650, 750], [602, 784]]));
  s += `</g>`;

  // ---- email: cincin tembus cahaya; tepi dalam hangat, tepi luar kebiruan, tebal di tonjol dan menipis ke leher
  s += `<g id="g-email"><g filter="url(#${p}shadow)"><g filter="url(#${p}vol)"><path d="${ENAMEL_D}" fill="url(#gEn)"/></g></g>`;
  s += fx(`<g clip-path="url(#gClipEn)"><path d="${cubicD(CROWN_INm)}" fill="none" stroke="#FFD9A8" stroke-width="54" opacity=".55" filter="url(#${p}blur8)"/><path d="${CROWN_OPEN}" fill="none" stroke="#A8B4F0" stroke-width="26" opacity=".5" filter="url(#${p}blur8)"/><g transform="${crownAffine}"><path d="M770 700C778 650 750 606 716 590" fill="none" stroke="#4A3A9A" stroke-width="22" opacity=".2" stroke-linecap="round" filter="url(#${p}blur8)"/><path d="M312 690C316 636 346 600 392 570" fill="none" stroke="#fff" stroke-width="20" opacity=".42" stroke-linecap="round" filter="url(#${p}blur8)"/><path d="M372 552C396 536 424 530 446 534" fill="none" stroke="#fff" stroke-width="6" opacity=".7" stroke-linecap="round" filter="url(#${p}blur2)"/><path d="M606 548C622 540 640 538 656 542" fill="none" stroke="#fff" stroke-width="5" opacity=".4" stroke-linecap="round" filter="url(#${p}blur2)"/></g><path d="${CROWN_OPEN}" fill="none" stroke="${PAL.rim}" stroke-width="8" opacity=".4" filter="url(#${p}blur2)" transform="translate(2 2)"/></g>`);
  s += fx(`<path d="${cubicD(CROWN_INm)}" fill="none" stroke="#A9A2E4" stroke-width="2.6" opacity=".55" stroke-dasharray="26 4 12 4"/>`);
  s += `</g>`;

  // ---- gusi: gundukan yang naik membungkus leher (kerah + papila) lalu menurun curam ke permukaan tulang
  s += `<g id="g-gusi">`;
  for (const d of [gumL, gumR]) s += `<g filter="url(#${p}shadow)"><g filter="url(#${p}vol)"><path d="${d}" fill="${gumGrad}"/></g></g>`;
  for (const [tooth, arc, sd] of [[toothLeft, GUM_ARCL, -1], [rightFromTip, GUM_ARCR, 1]]) {
    const sulc = tooth.filter(([, y]) => y <= CEJ - 30), je = tooth.filter(([, y]) => y >= CEJ - 32 && y <= CEJ + 2), ct = tooth.filter(([, y]) => y >= CEJ);
    s += fx(`<path d="${cubicD(arc)}" fill="none" stroke="#FFD6DC" stroke-width="13" opacity=".55" stroke-linecap="round" filter="url(#${p}blur4)" transform="translate(0 8)"/><path d="${cubicD(arc)}" fill="none" stroke="#fff" stroke-width="4" opacity=".4" stroke-linecap="round" filter="url(#${p}blur2)" transform="translate(0 2)"/><path d="${cubicD(sd < 0 ? CRESTL : CRESTR)}" fill="none" stroke="#5A0A22" stroke-width="34" opacity=".3" filter="url(#${p}blur8)" transform="translate(0 -16)"/>`);
    s += `<path d="${pl(sulc)}" fill="none" stroke="#4A0818" stroke-width="3.2" opacity=".6" stroke-linecap="round"/><path d="${pl(je)}" fill="none" stroke="#FFC4CC" stroke-width="5" opacity=".8" stroke-linecap="round"/>`;
    s += fx(`<path d="${pl(ct)}" fill="none" stroke="#FFC4CC" stroke-width="5" opacity=".5" stroke-linecap="round"/>`);
  }
  s += `</g>`;
  let fl = '';
  for (const c of [cm, cd]) for (let i = 0; i < 4; i++) { const u = (((t * 0.4 + i / 4) % 1) + 1) % 1, [x, y] = c[Math.floor((1 - u) * (c.length - 1))]; fl += `<circle cx="${f1(x)}" cy="${f1(y)}" r="5" fill="#FFE6E0" opacity="${f1(0.7 * Math.sin(u * Math.PI))}"/>`; }
  s += fx(`<g id="g-pulpa-aliran" filter="url(#${p}blur2)">${fl}</g>`);
  s += vignette(p);
  if (labels) s += `<g id="g-label">${lblLayout().map(([X, Y, left, ty, txt]) => label(X, Y, left ? 28 : 1052, ty, txt, { fs: 23, anchor: left ? 'start' : 'end' })).join('')}${label(60, 110, 28, 110, 'MESIAL (kiri layar)', { fs: 23, anchor: 'start' })}${label(1020, 110, 1052, 110, 'DISTAL (kanan layar)', { fs: 23, anchor: 'end' })}${label(60, 155, 28, 155, 'Molar 1 rahang bawah, potongan mesiodistal', { fs: 21, anchor: 'start' })}</g>`;
  return s;
}
// label: [x, y, sisi, teks, lokal?]; lokal = true -> koordinat lokal (dipetakan); false -> koordinat kanvas
const LBL = [
  [372, 598, -1, 'Email (enamel)', 1], [380, 740, -1, 'Dentin mahkota', 1], [tipL[0] + 4, tipL[1] + 24, -1, 'Tepi gusi + sulkus', 0], [160, 790, -1, 'Gusi (papila)', 0],
  [crestL[0] - 40, crestL[1] + 8, -1, 'Puncak alveolar', 0], [334, 1060, -1, 'Sementum + PDL', 1], [240, 1180, -1, 'Tulang trabekular', 0],
  [436, 1130, -1, 'Kanal MB', 1], [345, 1300, -1, 'Akar mesial', 1], [452, 1446, -1, 'Foramen apikal', 1], [470, 1470, -1, 'Cabang dental IAN', 0], [350, 1556, -1, 'Kanal mandibula', 0],
  [642, 676, 1, 'Ruang pulpa + tanduk', 1], [572, 924, 1, 'Lantai ruang pulpa', 1], [540, 1010, 1, 'Furkasi', 1], [468, 1070, 1, 'Kanal ML (samar)', 1],
  [668, 1130, 1, 'Kanal akar distal', 1], [756, 1300, 1, 'Akar distal', 1], [tipR[0] + 120, tipR[1] + 50, 1, 'Gusi + papila', 0], [740, 1556, 1, 'Berkas n.-a.-v. IAN', 0],
];
function lblLayout() {
  const out = [];
  for (const side of [-1, 1]) {
    let prev = 200;
    for (const [x, y, txt] of LBL.filter((l) => l[2] === side).map(([x, y, sd, txt, loc]) => [loc ? MX(x) : x, loc ? MY(y) : y, txt]).sort((a, b) => a[1] - b[1])) {
      const ty = Math.max(y, prev + 64); prev = ty; out.push([x, y, side < 0, ty, txt]);
    }
  }
  return out;
}

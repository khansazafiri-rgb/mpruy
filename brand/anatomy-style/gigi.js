// Potongan mesiodistal (sagital) gigi MOLAR PERTAMA RAHANG BAWAH permanen (gigi 36/46) dengan jaringan penyangga dan kanal mandibula. Kode murni (SVG + filter), 1080 x 1920. Revisi 5 (siluet dulu, volume belakangan).
// JENIS GIGI : molar pertama mandibula (dua akar: mesial dan distal).
// BIDANG POTONG: mesiodistal (sagital) melalui sumbu panjang gigi, di tengah antara sisi bukal dan lingual; MESIAL di KIRI layar, DISTAL di KANAN, oklusal di atas. Gigi tetangga tidak digambar
//   (gusi di sisi mesial/distal adalah papila interdental yang menempel pada titik kontak, lalu menurun ke arah celah).
// Struktur DI BIDANG: email, dentin, ruang pulpa dengan dua tanduk, kanal mesiobukal (MB) di akar mesial, kanal distal di akar distal, sementum, ligamen periodontal, lamina dura, tulang alveolar, gusi.
// Struktur DI LUAR BIDANG yang digambar SAMAR: kanal mesiolingual (ML; lingual terhadap MB, di bidang ini hanya bayangan yang menyatu dengan MB di sepertiga apikal, tipe II Vertucci); kanal mandibula + berkas
//   n.-a.-v. alveolaris inferior + cabang dental (letaknya lingual/inferior; diproyeksikan hanya sebagai KONTEKS agar berkas yang keluar foramen apikal berujung pada struktur nyata).
// SKALA: nominal ±44 px/mm. Ukuran mahkota, panjang akar, dan lebar leher TIDAK terverifikasi pada sumber yang dapat dibuka (lihat README); gambar ini memuat PROPORSI PERKIRAAN, bukan ukuran pasti.
//   Yang memiliki sumber terbuka: email ≤ 2,5 mm di puncak tonjol; lebar lig. periodontal 0,15-0,38 mm; puncak alveolar 1-2 mm dari CEJ; lempeng kortikal 1,5-3 mm; sulkus ±0,7 mm dan lebar biologis ±2 mm (Gargiulo,
//   tanpa nilai universal); pintu furkasi molar 1 bawah ±1,9 mm (bukal) dan ±2,9 mm (lingual) dari CEJ; kanal mandibula ±6,3 mm di bawah apeks.
// Layer animasi (id grup): #g-tulang, #g-kanal-mandibula, #g-lig-periodontal, #g-dentin, #g-sementum, #g-pulpa, #g-saraf-pembuluh, #g-email, #g-gusi, #g-pulpa-aliran, #g-label.
import { PAL, W, H, f1, rng, mix, lighten, darken, background, vignette, label, ribbon, sampleCubic, cubicD, fx } from './anatomi.js';
export const P = 'g';
export const FLAT = { gEn: '#E6E8F8', gDen: '#EFB473', gPulp: '#D8344E', gBone: '#F0BC7C', gGum: '#E8506C' };

const chain = (p0, ...segs) => [...p0, ...segs.flat()];
// ---- kontur luar mahkota (dari CEJ mesial ke CEJ distal): bahu mesial membulat, dua tonjol bundar, fossa berbentuk U (bukan V), bahu distal lebih rendah
const CROWN = chain([342, 850],
  [322, 810, 300, 756, 300, 694],
  [298, 656, 308, 624, 332, 606],
  [352, 590, 392, 532, 448, 528],
  [486, 524, 506, 590, 540, 590],
  [574, 594, 598, 540, 642, 534],
  [684, 528, 716, 570, 742, 598],
  [768, 616, 786, 656, 786, 716],
  [786, 776, 764, 818, 738, 850]);
// ---- batas email-dentin (DEJ): tanduk dentin membulat; email ±2 mm di puncak tonjol dan menipis ke leher
const CROWN_IN = chain([347, 850],
  [328, 812, 318, 760, 338, 700],
  [340, 668, 350, 646, 372, 636],
  [396, 628, 418, 616, 450, 616],
  [484, 618, 506, 650, 540, 650],
  [574, 650, 598, 620, 640, 620],
  [676, 622, 702, 632, 722, 648],
  [742, 660, 748, 688, 746, 722],
  [746, 772, 740, 816, 733, 850]);
// ---- kontur akar dari CEJ mesial: sisi mesial akar mesial -> apeks tumpul -> furkasi -> akar distal (lebih ramping) -> CEJ distal; kedua akar condong ke distal
const ROOT = chain([342, 850],
  [332, 925, 332, 1030, 336, 1130],
  [342, 1230, 358, 1330, 396, 1410],
  [414, 1452, 440, 1476, 462, 1470],
  [486, 1452, 500, 1380, 516, 1290],
  [526, 1210, 532, 1120, 536, 1050],
  [538, 1020, 538, 1000, 540, 988],
  [542, 1008, 548, 1040, 558, 1090],
  [572, 1170, 596, 1260, 640, 1350],
  [668, 1400, 690, 1432, 706, 1452],
  [718, 1468, 746, 1468, 756, 1440],
  [772, 1392, 768, 1300, 760, 1210],
  [754, 1110, 752, 1010, 746, 930],
  [742, 890, 740, 870, 738, 850]);
// ---- kanal (garis tengah): MB, ML (samar), distal; foramen apikal 0,5-1 mm di atas apeks anatomis. Bentuk dan jumlah kanal TIDAK diubah dari v4.
const CAN_MB = [466, 930, 458, 975, 440, 1040, 436, 1130, 432, 1220, 436, 1300, 444, 1370, 450, 1410, 452, 1430, 452, 1446];
const CAN_ML = [480, 900, 478, 960, 460, 1040, 452, 1130, 446, 1220, 446, 1300, 446, 1352, 448, 1380, 450, 1396, 452, 1410];
const CAN_D = [616, 930, 632, 985, 650, 1050, 660, 1130, 672, 1220, 690, 1300, 704, 1360, 712, 1395, 718, 1420, 722, 1438];
const CHAMBER = 'M430 900C424 830 424 750 436 690C441 664 454 646 460 662C476 704 504 748 540 748C576 748 604 704 620 662C626 646 639 664 644 690C656 750 656 830 650 900C640 925 628 938 612 942C586 934 566 924 540 924C514 924 494 934 468 942C452 938 440 925 430 900Z';
const rev = (a) => { const pts = []; for (let i = 0; i < a.length; i += 2) pts.push([a[i], a[i + 1]]); return pts.reverse().flat(); };
const ROOT_OPEN = cubicD(ROOT), CROWN_OPEN = cubicD(CROWN);
const INREV = `L${CROWN_IN[CROWN_IN.length - 2]} ${CROWN_IN[CROWN_IN.length - 1]}${cubicD(rev(CROWN_IN)).replace(/^M[^C]*/, '')}Z`;
const DENTIN_D = `${ROOT_OPEN}${INREV}`;   // satu bentuk dentin (mahkota + akar), tanpa garis sambung
const ENAMEL_D = `${CROWN_OPEN}${INREV}`;   // cincin email
const CX = 540, CY = 1100, K = 1.1, DY = -60;
const tf = (x, y) => [CX + (x - CX) * K, CY + DY + (y - CY) * K];
const offs = (Sm, d) => Sm.map((p, i) => { const a = Sm[Math.max(0, i - 1)], b = Sm[Math.min(Sm.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [p[0] - dy / l * d, p[1] + dx / l * d]; });
const pl = (Sm) => 'M' + Sm.map((p) => `${f1(p[0])} ${f1(p[1])}`).join('L');

// ---- jaringan lunak dan tulang: seluruhnya diturunkan dari kontur gigi (menempel persis pada permukaan mahkota/akar)
const TIP_Y = 776, SULC_Y = 806, CREST_Y = 898;   // tepi gusi bebas, dasar sulkus (sulkus ±0,7 mm), puncak alveolar (±1,1 mm di bawah CEJ; kisaran sumber 1-2 mm)
const cs = sampleCubic(CROWN, 30), rs = sampleCubic(ROOT, 30);
const toothLeft = [...cs.filter(([x, y]) => x < 540 && y >= TIP_Y && y <= 850).reverse(), ...rs.filter(([x, y]) => x < 540 && y > 850 && y <= CREST_Y)];   // tepi gusi -> puncak, sisi mesial
const rightFromTip = [...cs.filter(([x, y]) => x > 540 && y >= TIP_Y + 6 && y <= 850), ...rs.filter(([x, y]) => x > 540 && y > 850 && y <= CREST_Y + 5).reverse()];   // tepi gusi -> puncak, sisi distal
const GUMTOP_L = (tip) => [tip[0], tip[1], tip[0] - 8, tip[1] + 18, tip[0] - 34, tip[1] + 30, tip[0] - 70, tip[1] + 34, tip[0] - 110, tip[1] + 38, tip[0] - 150, tip[1] + 34, tip[0] - 196, tip[1] + 44, tip[0] - 250, tip[1] + 56, tip[0] - 290, tip[1] + 96, tip[0] - 340, tip[1] + 140, tip[0] - 390, tip[1] + 184, tip[0] - 430, tip[1] + 224, tip[0] - 470, tip[1] + 262];
const GUMTOP_R = (tip) => [tip[0], tip[1], tip[0] + 8, tip[1] + 20, tip[0] + 30, tip[1] + 36, tip[0] + 66, tip[1] + 42, tip[0] + 116, tip[1] + 50, tip[0] + 170, tip[1] + 44, tip[0] + 226, tip[1] + 58, tip[0] + 290, tip[1] + 74, tip[0] + 340, tip[1] + 118, tip[0] + 396, tip[1] + 164, tip[0] + 460, tip[1] + 214, tip[0] + 500, tip[1] + 238, tip[0] + 540, tip[1] + 262];
const CRESTCURVE_L = (c) => [c[0], c[1], c[0] - 16, c[1] + 22, c[0] - 56, c[1] + 50, c[0] - 108, c[1] + 64, c[0] - 190, c[1] + 86, c[0] - 280, c[1] + 108, c[0] - 360, c[1] + 142, c[0] - 420, c[1] + 180, c[0] - 454, c[1] + 204, c[0] - 480, c[1] + 214];
const CRESTCURVE_R = (c) => [c[0], c[1], c[0] + 18, c[1] + 24, c[0] + 60, c[1] + 52, c[0] + 116, c[1] + 66, c[0] + 200, c[1] + 90, c[0] + 300, c[1] + 116, c[0] + 390, c[1] + 152, c[0] + 456, c[1] + 188, c[0] + 506, c[1] + 208, c[0] + 540, c[1] + 214];
const polyD = (pts) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${f1(x)} ${f1(y)}`).join('');
const crestL = toothLeft[toothLeft.length - 1], crestR = rightFromTip[rightFromTip.length - 1];
const tipL = toothLeft[0], tipR = rightFromTip[0];
const cubicTail = (arr) => cubicD(arr).replace(/^M[^C]*/, '');
// gusi = tepi gusi -> kurva permukaan keluar -> tepi kanvas -> kurva puncak tulang kembali ke gigi -> sepanjang permukaan gigi naik ke tepi gusi
const gumL = `M${f1(tipL[0])} ${f1(tipL[1])}${cubicTail(GUMTOP_L(tipL))}L${f1(crestL[0] - 480)} ${f1(crestL[1] + 214 + 6)}${cubicTail(rev(CRESTCURVE_L(crestL)))}${polyD(rev2(toothLeft)).replace(/^M/, 'L')}Z`;
function rev2(a) { return a.slice().reverse(); }
const gumR = `M${f1(tipR[0])} ${f1(tipR[1])}${cubicTail(GUMTOP_R(tipR))}L${f1(crestR[0] + 540)} ${f1(crestR[1] + 214 + 6)}${cubicTail(rev(CRESTCURVE_R(crestR)))}${polyD(rev2(rightFromTip)).replace(/^M/, 'L')}Z`;
// tulang: permukaan puncak mengikuti akar (tertinggi di gigi, menurun ke arah celah), isi ke bawah kanvas
const boneD = `M${f1(crestL[0] - 480)} ${f1(crestL[1] + 214)}${cubicTail(rev(CRESTCURVE_L(crestL)))}L${f1(crestL[0])} ${f1(crestL[1])}L${f1(crestR[0])} ${f1(crestR[1])}${cubicTail(CRESTCURVE_R(crestR))}L${f1(crestR[0] + 540)} 2000L${f1(crestL[0] - 480)} 2000Z`;
const crestLineL = cubicD(CRESTCURVE_L(crestL)), crestLineR = cubicD(CRESTCURVE_R(crestR));

export function gigi(o = {}) {
  const p = 'g', labels = !!o.labels, t = o.t ?? 0, r = rng(9);
  let s = background(p, { seed: 8, glow: { x: 540, y: 1040, r: 780 }, tint: '#FFD6C0', vesselColor: '#B23A5A', cells: 16, particles: 90 });
  s += `<defs>
  <linearGradient id="gEn" gradientUnits="userSpaceOnUse" x1="320" y1="520" x2="770" y2="860"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".5" stop-color="#E9EBFA"/><stop offset="1" stop-color="#B4BCE8"/></linearGradient>
  <radialGradient id="gDen" gradientUnits="userSpaceOnUse" cx="500" cy="760" r="760"><stop offset="0" stop-color="#FFE3B6"/><stop offset=".5" stop-color="#F6B878"/><stop offset="1" stop-color="#C9783A"/></radialGradient>
  <radialGradient id="gPulp" gradientUnits="userSpaceOnUse" cx="520" cy="780" r="420"><stop offset="0" stop-color="#FF6B78"/><stop offset=".5" stop-color="#E03850"/><stop offset="1" stop-color="#8A1030"/></radialGradient>
  <linearGradient id="gBone" gradientUnits="userSpaceOnUse" x1="0" y1="900" x2="0" y2="1900"><stop offset="0" stop-color="#FFE9BA"/><stop offset=".45" stop-color="#F5C07A"/><stop offset="1" stop-color="#C47A38"/></linearGradient>
  <linearGradient id="gGum" gradientUnits="userSpaceOnUse" x1="0" y1="760" x2="0" y2="1010"><stop offset="0" stop-color="#FF9AAC"/><stop offset=".5" stop-color="#EC4A68"/><stop offset="1" stop-color="#B01C44"/></linearGradient>
  <linearGradient id="gDens" gradientUnits="userSpaceOnUse" x1="0" y1="900" x2="0" y2="1500"><stop offset="0" stop-color="#000" stop-opacity=".6"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>
  <linearGradient id="gLow" gradientUnits="userSpaceOnUse" x1="0" y1="1180" x2="0" y2="1700"><stop offset="0" stop-color="#000" stop-opacity="1"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>
  <filter id="gTrabD" filterUnits="userSpaceOnUse" x="-200" y="860" width="1500" height="1200" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.05 0.034" numOctaves="3" seed="14"/><feColorMatrix type="matrix" values="0 0 0 0 .60  0 0 0 0 .34  0 0 0 0 .15  22 0 0 0 -12.4"/><feGaussianBlur stdDeviation="1"/></filter>
  <filter id="gTrabL" filterUnits="userSpaceOnUse" x="-200" y="860" width="1500" height="1200" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.05 0.034" numOctaves="3" seed="14"/><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 .93  0 0 0 0 .76  22 0 0 0 -12.4"/><feGaussianBlur stdDeviation="1"/></filter>
  <filter id="gBigD" filterUnits="userSpaceOnUse" x="-200" y="860" width="1500" height="1200" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.016 0.011" numOctaves="2" seed="5"/><feColorMatrix type="matrix" values="0 0 0 0 .58  0 0 0 0 .32  0 0 0 0 .13  14 0 0 0 -8.6"/><feGaussianBlur stdDeviation="1.6"/></filter>
  <mask id="gTrabMask" maskUnits="userSpaceOnUse" x="-200" y="860" width="1500" height="1200"><rect x="-200" y="860" width="1500" height="1200" fill="#fff"/><rect x="-200" y="860" width="1500" height="1200" fill="url(#gDens)"/><path d="${ROOT_OPEN}" fill="none" stroke="#000" stroke-width="76" filter="url(#${p}blur20)"/><path d="${crestLineL}" fill="none" stroke="#000" stroke-width="58" filter="url(#${p}blur20)"/><path d="${crestLineR}" fill="none" stroke="#000" stroke-width="58" filter="url(#${p}blur20)"/></mask>
  <mask id="gBigMask" maskUnits="userSpaceOnUse" x="-200" y="860" width="1500" height="1200"><rect x="-200" y="860" width="1500" height="1200" fill="#000"/><ellipse cx="540" cy="1650" rx="640" ry="380" fill="#fff" filter="url(#${p}blur40)"/><path d="${ROOT_OPEN}" fill="none" stroke="#000" stroke-width="110" filter="url(#${p}blur20)"/></mask>
  <clipPath id="gClipDen"><path d="${DENTIN_D}"/></clipPath>
  <clipPath id="gClipEn"><path d="${ENAMEL_D}"/></clipPath>
  <mask id="gCanMask" maskUnits="userSpaceOnUse" x="-400" y="1500" width="1900" height="600"><rect x="-400" y="1500" width="1900" height="600" fill="#000"/><ellipse cx="540" cy="1806" rx="400" ry="150" fill="#fff" filter="url(#${p}blur40)"/></mask>
  <mask id="gMask" maskUnits="userSpaceOnUse" x="-400" y="860" width="1900" height="1300"><rect x="-400" y="860" width="1900" height="1300" fill="#000"/><ellipse cx="540" cy="1380" rx="800" ry="640" fill="#fff" filter="url(#${p}blur40)"/></mask>
  </defs>`;
  s += `<g transform="translate(${CX} ${CY + DY}) scale(${K}) translate(${-CX} ${-CY})">`;

  // ---- tulang alveolar: puncak mengikuti akar dan menurun ke celah; trabekula acak (kerapatan tinggi dekat lamina dura dan puncak, rongga sumsum membesar ke bawah); memudar ke tepi
  s += `<g id="g-tulang"><g mask="url(#gMask)"><g filter="url(#${p}shadow)"><path d="${boneD}" fill="url(#gBone)"/></g>`;
  s += fx(`<g clip-path="url(#gClipBone)"><g mask="url(#gTrabMask)"><rect x="-200" y="860" width="1500" height="1200" fill="#fff" filter="url(#gTrabL)" transform="translate(-2.6 -2.6)"/><rect x="-200" y="860" width="1500" height="1200" fill="#fff" filter="url(#gTrabD)"/></g><g mask="url(#gBigMask)" opacity=".3"><rect x="-200" y="860" width="1500" height="1200" fill="#fff" filter="url(#gBigD)"/></g><path d="${ROOT_OPEN}" fill="none" stroke="#7A3A10" stroke-width="64" opacity=".22" filter="url(#${p}blur20)"/></g><clipPath id="gClipBone"><path d="${boneD}"/></clipPath>`);
  s += `</g>`;
  s += `<path d="${crestLineL}" fill="none" stroke="#FFF1CC" stroke-width="9" stroke-linecap="round" opacity=".95"/><path d="${crestLineR}" fill="none" stroke="#FFF1CC" stroke-width="9" stroke-linecap="round" opacity=".95"/>`;   // korteks tipis di puncak
  s += `</g>`;

  // ---- kanal mandibula (konteks): tabung halus berkontras rendah, berkas saraf-pembuluh tipis di dalamnya; memudar di tepi bersama tulang
  const CAN_AXIS = sampleCubic([-140, 1806, 100, 1798, 400, 1790, 640, 1798, 880, 1806, 1060, 1812, 1220, 1808], 26);
  const at = (dy, w) => ribbon(CAN_AXIS.map(([x, y]) => [x, y + dy]), w, w);
  s += `<g id="g-kanal-mandibula" mask="url(#gCanMask)" opacity=".85"><g class="nos">`;
  s += `<path d="${at(0, 92)}" fill="#F3DDBF"/><path d="${at(0, 82)}" fill="#E9B79E"/>`;
  s += fx(`<path d="${at(0, 82)}" fill="none" stroke="#7A3A20" stroke-width="12" opacity=".3" filter="url(#${p}blur8)" transform="translate(3 7)"/>`);
  s += `<path d="${at(4, 36)}" fill="#C9A24A"/><path d="${at(4, 31)}" fill="#E2C268"/>`;
  s += `<path d="${at(-24, 11)}" fill="#B4403E"/><path d="${at(-24, 7)}" fill="#E0605A"/>`;
  s += `<path d="${at(28, 14)}" fill="#4650A8"/><path d="${at(28, 9)}" fill="#6A76D2"/>`;
  s += fx(`<path d="${pl(CAN_AXIS.map(([x, y]) => [x, y - 14]))}" fill="none" stroke="#FFF3C0" stroke-width="6" opacity=".5" stroke-linecap="round" filter="url(#${p}blur2)"/>`);
  s += `</g></g>`;

  // ---- ligamen periodontal (0,15-0,38 mm; di sini ±9 px) + lamina dura, mengikuti seluruh kontur akar termasuk furkasi
  s += `<g id="g-lig-periodontal"><path d="${ROOT_OPEN}" fill="none" stroke="#FFF1CC" stroke-width="32" stroke-linejoin="round" stroke-linecap="round"/><path d="${ROOT_OPEN}" fill="none" stroke="#E8967C" stroke-width="19" stroke-linejoin="round" stroke-linecap="round"/>`;
  let fib = '';
  sampleCubic(ROOT, 16).forEach(([x, y], i) => { if (i % 2 || y < CREST_Y + 6) return; const sx = x < 540 ? -1 : 1; fib += `<path d="M${f1(x)} ${f1(y)}l${f1(sx * 11)} ${f1(y < 1040 ? -8 : 7)}" stroke="#B5532E" stroke-width="2" opacity=".6" stroke-linecap="round"/>`; });
  s += fx(fib) + `</g>`;

  // ---- dentin (mahkota + akar sebagai SATU bentuk) dengan tubulus radial dan bayangan yang mengikuti bentuk
  s += `<g id="g-dentin"><g filter="url(#${p}shadow)"><g filter="url(#${p}volS)"><path d="${DENTIN_D}" fill="url(#gDen)"/></g></g>`;
  let tub = '';
  for (let i = 0; i < 150; i++) { const a = (i / 150) * Math.PI * 2, cx = 540, cy = 790, rr0 = 120, rr1 = 360 + Math.sin(a * 2) * 40; tub += `<path d="M${f1(cx + Math.cos(a) * rr0)} ${f1(cy + Math.sin(a) * rr0 * 1.1)}L${f1(cx + Math.cos(a) * rr1)} ${f1(cy + Math.sin(a) * rr1 * 0.95)}" stroke="#B5702E" stroke-width="1.6" opacity=".18"/>`; }
  s += fx(`<g clip-path="url(#gClipDen)">${tub}<path d="${CHAMBER}" fill="none" stroke="#B5602A" stroke-width="54" opacity=".32" filter="url(#${p}blur20)"/><path d="${cubicD(CAN_MB)}" fill="none" stroke="#B5602A" stroke-width="44" opacity=".26" filter="url(#${p}blur20)"/><path d="${cubicD(CAN_D)}" fill="none" stroke="#B5602A" stroke-width="48" opacity=".26" filter="url(#${p}blur20)"/><path d="${ROOT_OPEN}" fill="none" stroke="#fff" stroke-width="26" opacity=".24" filter="url(#${p}blur8)" transform="translate(11 4)"/><path d="${ROOT_OPEN}" fill="none" stroke="#6A2A0A" stroke-width="34" opacity=".3" filter="url(#${p}blur8)" transform="translate(-12 -5)"/><path d="${cubicD(CROWN_IN)}" fill="none" stroke="#6A2A0A" stroke-width="36" opacity=".16" filter="url(#${p}blur8)" transform="translate(-6 -6)"/><path d="${cubicD(CROWN_IN)}" fill="none" stroke="#FFF0CC" stroke-width="20" opacity=".3" filter="url(#${p}blur8)" transform="translate(7 7)"/></g>`);
  s += `</g>`;
  // ---- sementum: lapisan tipis (lebih tebal di sepertiga apikal)
  s += `<g id="g-sementum"><path d="${ROOT_OPEN}" fill="none" stroke="${PAL.cementum}" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"/>`;
  s += fx(`<path d="${ROOT_OPEN}" fill="none" stroke="#F0CE90" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round" opacity=".8" transform="translate(-1 -1)"/>`);
  for (const [ax, ay] of [[452, 1464], [730, 1458]]) s += `<ellipse cx="${ax}" cy="${ay}" rx="28" ry="12" fill="${PAL.cementum}" opacity=".7" class="nos"/>`;
  s += `</g>`;

  // ---- pulpa: ruang pulpa dengan dua tanduk, kanal MB (dan ML samar di luar bidang), kanal tunggal di akar distal (tidak diubah dari v4)
  const cm = sampleCubic(CAN_MB, 14), cml = sampleCubic(CAN_ML, 14), cd = sampleCubic(CAN_D, 14);
  const eMB = (u) => 1 - Math.pow(1 - u, 2.2), RB = ribbon(cm, 44, 10, eMB), RD = ribbon(cd, 50, 12, eMB);
  s += `<g id="g-pulpa" class="nos"><path d="${ribbon(cml, 36, 8, eMB)}" fill="#B02040" opacity=".5"/>`;
  s += `<g filter="url(#${p}shadowS)"><g filter="url(#${p}volS)"><path d="${CHAMBER}" fill="url(#gPulp)"/><path d="${RB}" fill="url(#gPulp)"/><path d="${RD}" fill="url(#gPulp)"/></g></g>`;
  s += fx(`<clipPath id="gClipP"><path d="${CHAMBER}"/><path d="${RB}"/><path d="${RD}"/></clipPath><g clip-path="url(#gClipP)"><path d="${CHAMBER}" fill="none" stroke="#5A0A22" stroke-width="30" opacity=".5" filter="url(#${p}blur8)" transform="translate(7 9)"/><path d="${RB}" fill="none" stroke="#5A0A22" stroke-width="14" opacity=".35" filter="url(#${p}blur4)" transform="translate(5 0)"/><path d="M440 700C434 760 436 830 444 884" fill="none" stroke="#fff" stroke-width="9" opacity=".3" stroke-linecap="round" filter="url(#${p}blur4)"/></g>`);
  s += `</g>`;

  // ---- saraf (kuning), arteriol (merah), venula (biru): masuk lewat foramen apikal, naik lewat kanal, bercabang ke tanduk pulpa; di luar apeks turun lewat saluran tulang menuju berkas alveolar inferior (konteks)
  const COLS = [[PAL.nerve, '#7A5A08'], ['#F0282A', '#5A0610'], ['#4A56E0', '#141860']];
  const strand = (d, w, c, dk) => `<path d="${d}" fill="none" stroke="${dk}" stroke-width="${f1(w + 1.6)}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${c}" stroke-width="${f1(w)}" stroke-linecap="round" stroke-linejoin="round"/>`;
  s += `<g id="g-saraf-pembuluh">`;
  const FM = [452, 1446], FD = [722, 1438], JM = [474, 1772], JD = [694, 1774];
  const branch = (F, J) => sampleCubic([F[0], F[1], F[0] - 4, F[1] + 100, J[0] + 8, J[1] - 110, J[0], J[1]], 28);
  for (const [F, J, c0] of [[FM, JM, cm], [FD, JD, cd]]) {
    const br = branch(F, J);
    s += `<path d="${pl(br)}" fill="none" stroke="#FFE9C8" stroke-width="24" stroke-linecap="round" opacity=".55"/><path d="${pl(br)}" fill="none" stroke="#E7A98C" stroke-width="16" opacity=".8" stroke-linecap="round"/>`;   // saluran tulang + selubung berkas
    COLS.forEach(([c, dk], i) => { s += strand(pl(offs(br, (i - 1) * 5.5)), 3.4, c, dk) + strand(pl(offs(c0, (i - 1) * 3.2)), 2.4, c, dk); });
  }
  const fan = (x0, y0, targets) => targets.map(([tx, ty], i) => { const [c, dk] = COLS[i % 3]; return strand(`M${x0} ${y0}C${x0 + (tx - x0) * 0.15} ${y0 - 60} ${tx + (x0 - tx) * 0.05} ${ty + 80} ${tx} ${ty}`, 2.4, c, dk); }).join('');
  s += fx(fan(470, 930, [[446, 690], [452, 700], [430, 750], [478, 780]]) + fan(612, 930, [[634, 690], [628, 702], [650, 750], [602, 784]]));
  s += `</g>`;

  // ---- email: cincin tembus cahaya; tepi dalam hangat (dentin menembus), tepi luar kebiruan, tebal di puncak tonjol dan menipis ke leher
  s += `<g id="g-email"><g filter="url(#${p}shadow)"><g filter="url(#${p}vol)"><path d="${ENAMEL_D}" fill="url(#gEn)"/></g></g>`;
  s += fx(`<g clip-path="url(#gClipEn)"><path d="${cubicD(CROWN_IN)}" fill="none" stroke="#FFD9A8" stroke-width="46" opacity=".55" filter="url(#${p}blur8)"/><path d="${CROWN_OPEN}" fill="none" stroke="#A8B4F0" stroke-width="22" opacity=".5" filter="url(#${p}blur8)"/><path d="M770 700C778 650 750 606 716 590" fill="none" stroke="#4A3A9A" stroke-width="26" opacity=".2" stroke-linecap="round" filter="url(#${p}blur8)"/><path d="M312 690C316 636 346 600 392 570" fill="none" stroke="#fff" stroke-width="24" opacity=".42" stroke-linecap="round" filter="url(#${p}blur8)"/><path d="M372 552C396 536 424 530 446 534" fill="none" stroke="#fff" stroke-width="7" opacity=".7" stroke-linecap="round" filter="url(#${p}blur2)"/><path d="M606 548C622 540 640 538 656 542" fill="none" stroke="#fff" stroke-width="5" opacity=".4" stroke-linecap="round" filter="url(#${p}blur2)"/><path d="${CROWN_OPEN}" fill="none" stroke="${PAL.rim}" stroke-width="7" opacity=".4" filter="url(#${p}blur2)" transform="translate(2 2)"/></g>`);
  s += fx(`<path d="${cubicD(CROWN_IN)}" fill="none" stroke="#A9A2E4" stroke-width="2.6" opacity=".55" stroke-dasharray="26 4 12 4"/>`);
  s += `</g>`;

  // ---- gusi: membungkus leher; tepi bebas setajam pisau, permukaan membulat menurun ke celah, tebal bervariasi (papila tebal di dekat gigi, menipis ke tepi); sulkus, epitel penyatu, serat jaringan ikat sampai puncak tulang
  const gumG = (d, side) => {
    let g = `<g filter="url(#${p}shadow)"><g filter="url(#${p}vol)"><path d="${d}" fill="url(#gGum)"/></g></g>`;
    return g;
  };
  s += `<g id="g-gusi">${gumG(gumL, 0)}${gumG(gumR, 1)}`;
  for (const [tooth, topc, sd] of [[toothLeft, GUMTOP_L(tipL), -1], [rightFromTip, GUMTOP_R(tipR), 1]]) {
    const sulc = tooth.filter(([, y]) => y <= SULC_Y + 1), je = tooth.filter(([, y]) => y >= SULC_Y && y <= 850), ct = tooth.filter(([, y]) => y >= 850);
    s += fx(`<path d="${cubicD(topc)}" fill="none" stroke="#FFD6DC" stroke-width="12" opacity=".55" stroke-linecap="round" filter="url(#${p}blur4)" transform="translate(${-sd * 0} 7)"/><path d="${cubicD(topc)}" fill="none" stroke="#fff" stroke-width="4" opacity=".4" stroke-linecap="round" filter="url(#${p}blur2)" transform="translate(0 2)"/><path d="${cubicD(sd < 0 ? CRESTCURVE_L(crestL) : CRESTCURVE_R(crestR))}" fill="none" stroke="#5A0A22" stroke-width="30" opacity=".3" filter="url(#${p}blur8)" transform="translate(0 -14)"/>`);
    s += `<path d="${pl(sulc)}" fill="none" stroke="#4A0818" stroke-width="3.2" opacity=".6" stroke-linecap="round"/>`;
    s += `<path d="${pl(je)}" fill="none" stroke="#FFC4CC" stroke-width="5" opacity=".8" stroke-linecap="round"/>`;
    s += fx(`<path d="${pl(ct)}" fill="none" stroke="#FFC4CC" stroke-width="5" opacity=".5" stroke-linecap="round"/>`);
  }
  s += `</g>`;
  let fl = '';
  for (const c of [cm, cd]) for (let i = 0; i < 4; i++) { const u = (((t * 0.4 + i / 4) % 1) + 1) % 1, [x, y] = c[Math.floor((1 - u) * (c.length - 1))]; fl += `<circle cx="${f1(x)}" cy="${f1(y)}" r="4.6" fill="#FFE6E0" opacity="${f1(0.7 * Math.sin(u * Math.PI))}"/>`; }
  s += fx(`<g id="g-pulpa-aliran" filter="url(#${p}blur2)">${fl}</g>`);
  s += `</g>`;
  s += vignette(p);
  if (labels) s += `<g id="g-label">${lblLayout().map(([X, Y, left, ty, txt]) => label(X, Y, left ? 28 : 1052, ty, txt, { fs: 23, anchor: left ? 'start' : 'end' })).join('')}${label(60, 170, 28, 170, 'MESIAL (kiri layar)', { fs: 23, anchor: 'start' })}${label(1020, 170, 1052, 170, 'DISTAL (kanan layar)', { fs: 23, anchor: 'end' })}${label(60, 215, 28, 215, 'Molar 1 rahang bawah, potongan mesiodistal', { fs: 21, anchor: 'start' })}</g>`;
  return s;
}
// label pemeriksaan: [x, y pada struktur (koordinat dasar), sisi (-1 kiri / 1 kanan), teks]; posisi y teks dihitung otomatis (sejajar titik, jarak minimal agar tidak bertumpuk)
const LBL = [
  [372, 598, -1, 'Email (enamel)'], [372, 750, -1, 'Dentin mahkota'], [312, 784, -1, 'Tepi gusi + sulkus'], [204, 879, -1, 'Gusi'],
  [338, 880, -1, 'Epitel penyatu'], [300, 934, -1, 'Puncak alveolar'], [334, 1060, -1, 'Sementum + PDL'], [240, 1300, -1, 'Tulang trabekular'],
  [436, 1130, -1, 'Kanal MB'], [345, 1300, -1, 'Akar mesial'], [452, 1446, -1, 'Foramen apikal'], [462, 1600, -1, 'Cabang dental IAN'], [250, 1800, -1, 'Kanal mandibula'],
  [642, 676, 1, 'Ruang pulpa + tanduk'], [572, 924, 1, 'Lantai ruang pulpa'], [540, 1010, 1, 'Furkasi'], [468, 1070, 1, 'Kanal ML (samar)'],
  [668, 1130, 1, 'Kanal akar distal'], [756, 1300, 1, 'Akar distal'], [884, 892, 1, 'Gusi + papila'], [850, 1800, 1, 'Berkas n.-a.-v. IAN'],
];
function lblLayout() {
  const out = [];
  for (const side of [-1, 1]) {
    let prev = 250;
    for (const [x, y, sd, txt] of LBL.filter((l) => l[2] === side).map(([x, y, sd, txt]) => { const [X, Y] = tf(x, y); return [X, Y, sd, txt]; }).sort((a, b) => a[1] - b[1])) {
      const ty = Math.max(y, prev + 64); prev = ty; out.push([x, y, side < 0, ty, txt]);
    }
  }
  return out;
}

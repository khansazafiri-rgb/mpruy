// Potongan mesiodistal (sagital) gigi MOLAR PERTAMA RAHANG BAWAH permanen dengan jaringan penyangga. Kode murni (SVG + filter), 1080 x 1920. Revisi 2.
// Jenis dan arah potongan: molar pertama mandibula, dilihat dari sisi bukal-lingual ke arah gigi (potongan mesiodistal); MESIAL di KIRI layar, DISTAL di KANAN.
// Dasar anatomi yang diperiksa (lihat README): dua akar (mesial dan distal; 95-97% pada studi CBCT), akar mesial lebih lebar dengan apeks tumpul dan umumnya 2 kanal (tipe Vertucci II atau IV;
// kanal MB dan ML saling bertumpuk pada bidang ini sehingga kanal ML digambar samar di belakang bidang potong dan menyatu dengan MB di sepertiga apikal), akar distal lebih lurus dengan 1 kanal
// (tipe I paling sering); kedua akar sedikit melengkung ke distal; empat tanduk pulpa (di bidang ini terlihat dua); puncak alveolar sekitar 1-2 mm di bawah batas sementum-email;
// berkas saraf-pembuluh masuk pulpa lewat foramen apikal; margin gusi bebas bergerigi mengikuti kontur CEJ, dengan sulkus dan epitel penyatu.
// Layer animasi (id grup): #g-tulang, #g-lig-periodontal, #g-dentin, #g-sementum, #g-email, #g-pulpa, #g-pulpa-aliran, #g-saraf-pembuluh, #g-gusi, #g-label.
import { PAL, W, H, f1, rng, mix, lighten, darken, background, vignette, tube, label, ribbon, sampleCubic, cubicD } from './anatomi.js';
export const P = 'g';

// ---- geometri (koordinat kanvas dasar; seluruh gambar diskalakan 1,28 di sekitar (544, 930))
const CROWN = [318, 910, 290, 800, 296, 660, 345, 575, 385, 508, 462, 490, 508, 540, 528, 566, 556, 566, 578, 540, 622, 492, 700, 500, 740, 568, 786, 650, 790, 790, 766, 910];
const CROWN_IN = [348, 910, 332, 806, 342, 684, 384, 622, 414, 580, 468, 566, 502, 602, 526, 622, 558, 622, 582, 602, 616, 566, 676, 572, 708, 622, 742, 690, 750, 800, 736, 910];
const ROOT = [318, 910, 300, 1050, 318, 1250, 384, 1380, 396, 1410, 420, 1428, 442, 1414, 480, 1330, 508, 1150, 542, 1020, 576, 1150, 606, 1310, 660, 1396, 672, 1428, 708, 1436, 718, 1404, 760, 1300, 780, 1100, 766, 910];
const CAN_MB = [452, 930, 428, 1070, 402, 1230, 410, 1330, 414, 1380, 416, 1402, 418, 1420];
const CAN_ML = [476, 934, 446, 1080, 420, 1220, 412, 1310, 412, 1330, 414, 1346, 416, 1362];   // kanal mesiolingual (di belakang bidang potong), menyatu dengan MB (tipe II)
const CAN_D = [632, 934, 640, 1090, 652, 1240, 670, 1350, 684, 1398, 688, 1412, 690, 1424];
const CHAMBER = 'M410 890C402 812 408 742 424 680C430 660 448 658 456 676C470 712 498 726 540 726C582 726 610 712 624 676C632 658 650 660 656 680C672 742 678 812 670 890C652 918 640 936 626 942C598 936 566 912 542 908C518 912 486 936 458 942C444 936 428 918 410 890Z';
const CROWN_D = `${cubicD(CROWN)}Z`, CROWN_IN_D = `${cubicD(CROWN_IN)}Z`, ROOT_D = `${cubicD(ROOT)}Z`, ROOT_OPEN = cubicD(ROOT);
const CX = 544, CY = 930, K = 1.28;
const tf = (x, y) => [540 + (x - CX) * K, CY + (y - CY) * K];
const offs = (Sm, d) => Sm.map((p, i) => { const a = Sm[Math.max(0, i - 1)], b = Sm[Math.min(Sm.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [p[0] - dy / l * d, p[1] + dx / l * d]; });
const pl = (Sm) => 'M' + Sm.map((p) => `${f1(p[0])} ${f1(p[1])}`).join('L');

export function gigi(o = {}) {
  const p = 'g', labels = !!o.labels, t = o.t ?? 0, r = rng(9);
  let s = background(p, { seed: 8, glow: { x: 540, y: 980, r: 760 }, tint: '#FFD6C0', vesselColor: '#B23A5A', cells: 16, particles: 90 });
  s += `<defs>
  <linearGradient id="gEn" gradientUnits="userSpaceOnUse" x1="330" y1="500" x2="770" y2="900"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".5" stop-color="#E6E6FB"/><stop offset="1" stop-color="#B9BEEC"/></linearGradient>
  <radialGradient id="gDen" gradientUnits="userSpaceOnUse" cx="520" cy="780" r="720"><stop offset="0" stop-color="#FFE3B6"/><stop offset=".5" stop-color="#F6B878"/><stop offset="1" stop-color="#C9783A"/></radialGradient>
  <radialGradient id="gPulp" gradientUnits="userSpaceOnUse" cx="520" cy="760" r="460"><stop offset="0" stop-color="#FF6B78"/><stop offset=".5" stop-color="#E03850"/><stop offset="1" stop-color="#8A1030"/></radialGradient>
  <radialGradient id="gBone" gradientUnits="userSpaceOnUse" cx="544" cy="1100" r="900"><stop offset="0" stop-color="#FFE9B8"/><stop offset=".55" stop-color="#F4BC74"/><stop offset="1" stop-color="#B9672E"/></radialGradient>
  <linearGradient id="gGum" gradientUnits="userSpaceOnUse" x1="0" y1="820" x2="0" y2="1000"><stop offset="0" stop-color="#FF8FA0"/><stop offset=".45" stop-color="#EC3F5E"/><stop offset="1" stop-color="#A5123A"/></linearGradient>
  <clipPath id="gClipDen"><path d="${CROWN_IN_D}"/><path d="${ROOT_D}"/></clipPath>
  <clipPath id="gClipC"><path d="${CROWN_IN_D}"/></clipPath>
  <mask id="gMask" maskUnits="userSpaceOnUse" x="-300" y="700" width="1700" height="1200"><rect x="-300" y="700" width="1700" height="1200" fill="#000"/><ellipse cx="544" cy="1110" rx="500" ry="470" fill="#fff" filter="url(#${p}blur40)"/></mask>
  </defs>`;
  s += `<g transform="translate(540 ${CY}) scale(${K}) translate(${-CX} ${-CY})">`;

  // ---- tulang alveolar (trabekular tak beraturan, rapat dekat akar) + lamina dura; memudar ke bawah (awan)
  const BONE = 'M-120 1012C20 1008 160 992 262 972L318 960L772 960L826 972C930 992 1068 1008 1208 1012L1208 1700L-120 1700Z';
  s += `<g id="g-tulang"><g mask="url(#gMask)">`;
  s += `<g filter="url(#${p}shadow)"><path d="${BONE}" fill="url(#gBone)"/></g>`;
  let pores = '', pts = [];
  const grid = new Map(), cell = 40, key = (x, y) => `${Math.floor(x / cell)},${Math.floor(y / cell)}`;
  for (let i = 0; i < 4200; i++) {
    const x = -100 + r() * 1280, y = 985 + r() * 720; if (y < 1010 && (x < 300 || x > 790)) continue;
    const nearRoot = Math.abs(x - 544) < 270 && y < 1450 ? 0.62 : 1, rr = (5 + 15 * r() * r()) * nearRoot * (0.85 + 0.3 * Math.min(1, (y - 980) / 500));
    let ok = true; const gx = Math.floor(x / cell), gy = Math.floor(y / cell);
    for (let a = gx - 1; a <= gx + 1 && ok; a++) for (let b = gy - 1; b <= gy + 1 && ok; b++) for (const q of (grid.get(`${a},${b}`) || [])) if (Math.hypot(q[0] - x, q[1] - y) < q[2] + rr + 5) { ok = false; break; }
    if (!ok) continue; pts.push([x, y, rr]); const k = key(x, y); if (!grid.has(k)) grid.set(k, []); grid.get(k).push([x, y, rr]);
    const ry = rr * (0.62 + 0.5 * r()), rot = r() * 180;
    pores += `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)})"><ellipse rx="${f1(rr + 3)}" ry="${f1(ry + 3)}" fill="#FFEBC2" opacity=".85" transform="translate(-1.6 -1.6)"/><ellipse rx="${f1(rr)}" ry="${f1(ry)}" fill="#BE6A2A"/><ellipse rx="${f1(rr * 0.72)}" ry="${f1(ry * 0.7)}" cx="${f1(rr * 0.14)}" cy="${f1(ry * 0.14)}" fill="#8F4514" opacity=".9"/></g>`;
  }
  s += `<g filter="url(#${p}blur2)">${pores}</g>`;
  s += `</g>`;
  s += `<path d="M-120 1012C20 1008 160 992 262 972L318 960" fill="none" stroke="#FFF1CC" stroke-width="12" stroke-linecap="round" opacity=".9"/><path d="M1208 1012C1068 1008 930 992 826 972L772 960" fill="none" stroke="#FFF1CC" stroke-width="12" stroke-linecap="round" opacity=".9"/>`;
  s += `</g>`;
  // ---- lamina dura + ligamen periodontal (lebar sekitar 0,2 mm) + serat Sharpey miring
  s += `<g id="g-lig-periodontal"><path d="${ROOT_OPEN}" fill="none" stroke="#FFF1CC" stroke-width="40" stroke-linejoin="round" stroke-linecap="round"/><path d="${ROOT_OPEN}" fill="none" stroke="#EFA088" stroke-width="26" stroke-linejoin="round" stroke-linecap="round"/>`;
  let fib = '';
  sampleCubic(ROOT, 18).forEach(([x, y], i) => { if (i % 2 || y < 975) return; const sx = x < 544 ? -1 : 1, nearCrest = y < 1100; fib += `<path d="M${f1(x)} ${f1(y)}l${f1(sx * (nearCrest ? 10 : 12))} ${f1(nearCrest ? -8 : 7)}" stroke="#B5532E" stroke-width="2" opacity=".6" stroke-linecap="round"/>`; });
  s += fib + `</g>`;

  // ---- dentin (mahkota + akar) dengan tubulus radial dan garis pertumbuhan
  s += `<g id="g-dentin"><g filter="url(#${p}shadow)"><g filter="url(#${p}volS)"><path d="${ROOT_D}" fill="url(#gDen)"/><path d="${CROWN_IN_D}" fill="url(#gDen)"/><rect x="350" y="880" width="380" height="80" fill="url(#gDen)"/></g></g>`;
  let tub = '';
  for (let i = 0; i < 170; i++) { const a = (i / 170) * Math.PI * 2, cx = 540, cy = 790, rr0 = 110, rr1 = 360 + Math.sin(a * 2) * 40; tub += `<path d="M${f1(cx + Math.cos(a) * rr0)} ${f1(cy + Math.sin(a) * rr0 * 1.1)}L${f1(cx + Math.cos(a) * rr1)} ${f1(cy + Math.sin(a) * rr1 * 0.95)}" stroke="#B5702E" stroke-width="1.6" opacity=".2"/>`; }
  const cm0 = sampleCubic(CAN_MB, 14), cd0 = sampleCubic(CAN_D, 14);
  let tr = ''; cm0.concat(cd0).forEach(([x, y], i) => { if (i % 2 || y < 960) return; const sx = x < 544 ? -1 : 1; tr += `<path d="M${f1(x)} ${f1(y)}l${f1(sx * 40)} ${f1(-22)}M${f1(x)} ${f1(y)}l${f1(-sx * 40)} ${f1(-22)}" stroke="#B5702E" stroke-width="1.6" opacity=".22"/>`; });
  s += `<g clip-path="url(#gClipDen)">${tub}${tr}</g>`;
  s += `<g clip-path="url(#gClipC)" fill="none" stroke="#9A5A22" stroke-width="2" opacity=".16"><path d="M366 900C354 790 376 690 432 632"/><path d="M386 900C376 800 398 716 446 660"/><path d="M732 900C744 790 722 690 656 632"/><path d="M712 900C722 800 700 716 640 660"/></g></g>`;
  // ---- sementum (garis tipis; lebih tebal di apeks)
  s += `<g id="g-sementum"><path d="${ROOT_OPEN}" fill="none" stroke="${PAL.cementum}" stroke-width="8" stroke-linejoin="round" stroke-linecap="round"/><path d="${ROOT_OPEN}" fill="none" stroke="#F0CE90" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round" opacity=".8" transform="translate(-1 -1)"/>`;
  for (const [ax, ay] of [[414, 1418], [692, 1424]]) s += `<ellipse cx="${ax}" cy="${ay - 4}" rx="30" ry="14" fill="${PAL.cementum}" opacity=".75"/>`;
  s += `</g>`;

  // ---- pulpa: ruang pulpa dengan dua tanduk, kanal MB (dan ML samar) di akar mesial, kanal tunggal di akar distal; foramen apikal
  const cm = sampleCubic(CAN_MB, 14), cml = sampleCubic(CAN_ML, 14), cd = sampleCubic(CAN_D, 14);
  s += `<g id="g-pulpa"><path d="${ribbon(cml, 26, 14)}" fill="#8A1030" opacity=".5" filter="url(#${p}blur2)"/>`;
  s += `<g filter="url(#${p}shadowS)"><g filter="url(#${p}volS)"><path d="${CHAMBER}" fill="url(#gPulp)"/><path d="${ribbon(cm, 36, 9)}" fill="url(#gPulp)"/><path d="${ribbon(cd, 42, 11)}" fill="url(#gPulp)"/></g></g>`;
  s += `<path d="${CHAMBER}" fill="none" stroke="#7A0E28" stroke-width="3" opacity=".55"/><path d="M416 706C408 766 410 830 420 884" fill="none" stroke="#fff" stroke-width="8" opacity=".3" stroke-linecap="round" filter="url(#${p}blur4)"/>`;
  s += `</g>`;
  // ---- saraf (kuning), arteriol (merah), venula (biru): berkas naik dari foramen apikal lewat kanal, bercabang ke tanduk pulpa dan dinding; keluar apeks menuju tulang
  const strand = (d, w, c, dk) => `<path d="${d}" fill="none" stroke="${dk}" stroke-width="${f1(w + 1.8)}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${c}" stroke-width="${f1(w)}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const COLS = [[PAL.nerve, '#7A5A08'], ['#F0282A', '#5A0610'], ['#4A56E0', '#141860']];
  s += `<g id="g-saraf-pembuluh">`;
  for (const [Sm, ext] of [[cm, 'M418 1420C418 1470 404 1520 400 1620'], [cd, 'M690 1424C690 1474 700 1524 704 1620']]) COLS.forEach(([c, dk], i) => { const o2 = (i - 1) * 6; s += strand(pl(offs(Sm, o2)), 3.4, c, dk) + strand(ext.replace(/(\d+) (\d+)/g, (m, a, b) => `${+a + o2 * (i === 1 ? 0 : 1)} ${b}`), 3.2, c, dk); });
  const fan = (x0, y0, targets) => targets.map(([tx, ty], i) => { const [c, dk] = COLS[i % 3]; return strand(`M${x0} ${y0}C${x0 + (tx - x0) * 0.15} ${y0 - 60} ${tx + (x0 - tx) * 0.05} ${ty + 80} ${tx} ${ty}`, 2.8, c, dk); }).join('');
  s += fan(452, 936, [[420, 688], [438, 700], [404, 744], [474, 760], [398, 810], [500, 770]]) + fan(632, 936, [[662, 690], [646, 702], [680, 748], [606, 764], [686, 814], [580, 772]]) + fan(544, 912, [[524, 770], [560, 770], [542, 744]]);
  // lengkung kapiler terminal di bawah puncak tanduk (di dekat lapisan odontoblas)
  for (const [x, y] of [[424, 678], [440, 684], [660, 680], [648, 686]]) s += `<path d="M${x - 6} ${y + 10}Q${x} ${y - 8} ${x + 6} ${y + 10}" fill="none" stroke="#F0282A" stroke-width="2.2" stroke-linecap="round"/>`;
  s += `</g>`;

  // ---- email (enamel): selubung tembus cahaya; tebal di puncak tonjol, menipis ke leher; batas email-dentin sedikit bergelombang
  s += `<g id="g-email"><g filter="url(#${p}shadow)"><g filter="url(#${p}vol)"><path d="${CROWN_D} ${CROWN_IN_D}" fill="url(#gEn)" fill-rule="evenodd"/></g></g>`;
  s += `<path d="${cubicD(CROWN_IN)}" fill="none" stroke="#A9A2E4" stroke-width="3.4" opacity=".7" stroke-dasharray="26 4 12 4"/>`;
  s += `<g fill="none" stroke="#8C94E0" stroke-width="2" opacity=".26"><path d="M318 860C300 760 322 650 372 590"/><path d="M334 860C318 770 338 668 386 610"/><path d="M766 860C784 760 762 650 708 590"/><path d="M750 860C766 770 746 668 696 610"/></g>`;
  s += `<path d="M358 590C404 522 460 514 496 546" fill="none" stroke="#fff" stroke-width="18" opacity=".85" stroke-linecap="round" filter="url(#${p}blur4)"/><path d="M326 700C316 760 320 820 334 870" fill="none" stroke="#fff" stroke-width="12" opacity=".6" stroke-linecap="round" filter="url(#${p}blur4)"/>`;
  s += `<path d="M590 546C634 518 694 524 722 568" fill="none" stroke="#fff" stroke-width="11" opacity=".5" stroke-linecap="round" filter="url(#${p}blur4)"/>`;
  s += `<path d="${cubicD(CROWN)}" fill="none" stroke="${PAL.rim}" stroke-width="7" opacity=".5" filter="url(#${p}blur2)" transform="translate(2 2)"/></g>`;

  // ---- gusi: margin bebas setajam pisau yang mengikuti kontur CEJ, sulkus sempit dan epitel penyatu, papila interdental, permukaan bertitik (attached gingiva), serat gingiva
  const gum = (m) => {
    const X = (x) => (m ? 1088 - x : x);
    const d = `M${X(-120)} 1002L${X(-120)} 912C${X(0)} 900 ${X(110)} 876 ${X(176)} 830C${X(214)} 802 ${X(266)} 798 ${X(300)} 830C${X(314)} 852 ${X(320)} 862 ${X(321)} 872L${X(329)} 880C${X(333)} 896 ${X(333)} 912 ${X(331)} 926L${X(324)} 962C${X(250)} 976 ${X(120)} 992 ${X(-120)} 1002Z`;
    let g = `<g filter="url(#${p}shadow)"><g filter="url(#${p}vol)"><path d="${d}" fill="url(#gGum)"/></g></g>`;
    g += `<path d="M${X(-110)} 912C${X(8)} 904 ${X(114)} 882 ${X(182)} 840C${X(220)} 814 ${X(262)} 812 ${X(292)} 838" fill="none" stroke="#FFD0D6" stroke-width="9" opacity=".7" stroke-linecap="round" filter="url(#${p}blur2)"/>`;
    g += `<path d="M${X(321)} 872L${X(329)} 880C${X(333)} 896 ${X(333)} 912 ${X(331)} 926" fill="none" stroke="#4A0818" stroke-width="4" opacity=".75" stroke-linecap="round"/><path d="M${X(326)} 884C${X(329)} 900 ${X(329)} 914 ${X(327)} 930" fill="none" stroke="#FFC4CC" stroke-width="5" opacity=".7" stroke-linecap="round"/>`;
    for (let i = 0; i < 34; i++) { const u = i / 33, x = -100 + u * 300, y = 914 - Math.sin(Math.min(1, u * 1.1) * Math.PI * 0.55) * 64 + 8; g += `<circle cx="${f1(X(x + r() * 8))}" cy="${f1(y + 8 + r() * 6)}" r="1.9" fill="#FFB4BE" opacity=".55"/>`; }
    for (let i = 0; i < 7; i++) g += `<path d="M${X(40 + i * 40)} ${958 - (i % 2) * 6}C${X(90 + i * 36)} ${934 - (i % 3) * 8} ${X(150 + i * 26)} ${912} ${X(190 + i * 22)} ${888}" fill="none" stroke="#B80F34" stroke-width="2.2" opacity=".45"/>`;
    return g;
  };
  s += `<g id="g-gusi">${gum(0)}${gum(1)}</g>`;
  let fl = '';
  for (const c of [cm, cd]) for (let i = 0; i < 4; i++) { const u = (((t * 0.4 + i / 4) % 1) + 1) % 1, [x, y] = c[Math.floor((1 - u) * (c.length - 1))]; fl += `<circle cx="${f1(x)}" cy="${f1(y)}" r="4.6" fill="#FFE6E0" opacity="${f1(0.7 * Math.sin(u * Math.PI))}"/>`; }
  s += `<g id="g-pulpa-aliran" filter="url(#${p}blur2)">${fl}</g>`;
  s += `</g>`;
  s += vignette(p);
  if (labels) s += `<g id="g-label">${LBL.map(([x, y, tx, ty, txt]) => { const [X, Y] = tf(x, y), left = tx < 540; return label(X, Y, left ? 28 : 1052, ty, txt, { fs: 23, anchor: left ? 'start' : 'end' }); }).join('')}${label(60, 190, 28, 190, 'MESIAL (kiri layar)', { fs: 23, anchor: 'start' })}${label(1020, 190, 1052, 190, 'DISTAL (kanan layar)', { fs: 23, anchor: 'end' })}</g>`;
  return s;
}
// label pemeriksaan: [x, y pada struktur (koordinat dasar), tx, ty (kanvas), teks]
const LBL = [
  [420, 520, 28, 250, 'Email (enamel)'], [352, 760, 28, 340, 'Dentin mahkota'], [200, 850, 28, 470, 'Gusi: papila interdental'], [326, 900, 28, 560, 'Sulkus + epitel penyatu'],
  [276, 972, 28, 650, 'Puncak tulang alveolar'], [306, 1200, 28, 840, 'Sementum (tipis)'], [294, 1200, 28, 930, 'Lig. periodontal'], [282, 1200, 28, 1020, 'Lamina dura'],
  [150, 1180, 28, 1110, 'Tulang alveolar (trabekular)'], [410, 1250, 28, 1210, 'Kanal MB (akar mesial)'], [448, 1110, 28, 1300, 'Kanal ML (samar, di belakang)'],
  [350, 1330, 28, 1400, 'Akar mesial (lebih lebar)'], [418, 1420, 28, 1500, 'Foramen apikal'], [404, 1500, 28, 1600, 'Berkas saraf-pembuluh ke tulang'],
  [664, 690, 1052, 330, 'Ruang pulpa + tanduk pulpa'], [542, 908, 1052, 440, 'Lantai ruang pulpa'], [542, 1030, 1052, 1040, 'Furkasi'], [650, 1240, 1052, 1140, 'Kanal tunggal (akar distal)'], [740, 1200, 1052, 1240, 'Akar distal'],
];

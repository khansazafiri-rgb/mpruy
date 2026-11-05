// Potongan longitudinal (mesiodistal) gigi molar bawah dengan jaringan penyangga. Kode murni (SVG + filter), 1080 x 1920.
// Lapisan: email (enamel) tembus cahaya di mahkota, dentin dengan tubulus radial, pulpa (ruang pulpa + dua kanal akar) berisi pembuluh dan saraf, sementum di akar,
// ligamen periodontal, tulang alveolar (kortikal + trabekular berpori), gusi dengan sulkus, berkas saraf-pembuluh alveolaris inferior di bawah.
// Bagian yang dapat dianimasikan (id grup): #g-pulpa-aliran (aliran darah di pulpa), #g-sinyal (impuls saraf), #g-gusi, #g-tulang, #g-label.
import { PAL, W, H, f1, rng, mix, lighten, darken, background, vignette, tube, label, ribbon, sampleCubic, cubicD } from './anatomi.js';
export const P = 'g';

// ---- geometri (koordinat kanvas)
const CROWN = [322, 910, 296, 790, 300, 650, 352, 570, 395, 505, 470, 495, 515, 545, 530, 562, 550, 562, 565, 545, 610, 495, 685, 505, 728, 570, 780, 650, 784, 790, 758, 910];
const CROWN_IN = [354, 910, 340, 800, 350, 696, 394, 634, 426, 584, 470, 568, 502, 598, 526, 616, 554, 616, 578, 598, 610, 568, 654, 584, 686, 634, 730, 696, 740, 800, 726, 910];
const ROOT = [322, 910, 308, 1060, 328, 1260, 382, 1398, 398, 1434, 428, 1430, 440, 1398, 478, 1292, 505, 1112, 540, 1012, 575, 1112, 602, 1292, 640, 1398, 652, 1430, 682, 1434, 698, 1398, 752, 1260, 772, 1060, 758, 910];
const CAN_M = [472, 930, 452, 1030, 424, 1200, 408, 1330, 404, 1390, 402, 1410, 400, 1425];
const CAN_D = [608, 930, 628, 1030, 656, 1200, 672, 1330, 676, 1390, 678, 1410, 680, 1425];
const CHAMBER = 'M398 884C390 800 398 730 424 668C432 648 452 646 460 666C478 704 506 716 540 716C574 716 602 704 620 666C628 646 648 648 656 668C682 730 690 800 682 884C660 915 630 935 606 942C585 930 560 906 540 904C520 906 495 930 474 942C450 935 420 915 398 884Z';
const CROWN_D = `${cubicD(CROWN)}Z`, CROWN_IN_D = `${cubicD(CROWN_IN)}Z`, ROOT_D = `${cubicD(ROOT)}Z`, ROOT_OPEN = cubicD(ROOT);
// poligon seluruh gigi (mahkota luar + akar) untuk bayangan dan klip
const TOOTH_D = `${cubicD(CROWN)}L758 910L${ROOT.slice(34).join(' ')}Z`;

export function gigi(o = {}) {
  const p = 'g', labels = !!o.labels, t = o.t ?? 0, r = rng(9);
  let s = background(p, { seed: 8, glow: { x: 540, y: 960, r: 720 }, tint: '#FFD6C0', vesselColor: '#B23A5A', cells: 16, particles: 90 });
  s += `<defs>
  <linearGradient id="gEn" x1=".15" y1="0" x2=".85" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".45" stop-color="#E4E4FA"/><stop offset="1" stop-color="#B8BEEA"/></linearGradient>
  <radialGradient id="gDen" gradientUnits="userSpaceOnUse" cx="500" cy="760" r="760"><stop offset="0" stop-color="#FFE0B0"/><stop offset=".5" stop-color="#F6B878"/><stop offset="1" stop-color="#C9783A"/></radialGradient>
  <radialGradient id="gPulp" gradientUnits="userSpaceOnUse" cx="500" cy="740" r="420"><stop offset="0" stop-color="#FF6B78"/><stop offset=".5" stop-color="#E33B52"/><stop offset="1" stop-color="#8E1230"/></radialGradient>
  <radialGradient id="gBone" gradientUnits="userSpaceOnUse" cx="540" cy="1100" r="900"><stop offset="0" stop-color="#FFE9B8"/><stop offset=".6" stop-color="#F2B66A"/><stop offset="1" stop-color="#B9672E"/></radialGradient>
  <linearGradient id="gGum" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF8A98"/><stop offset=".5" stop-color="#EA3A5A"/><stop offset="1" stop-color="#9E1034"/></linearGradient>
  <linearGradient id="gBoneFade" x1="0" y1="0" x2="0" y2="1"><stop offset=".7" stop-color="#1B0A30" stop-opacity="0"/><stop offset="1" stop-color="#1B0A30" stop-opacity=".95"/></linearGradient>
  <clipPath id="gClipC"><path d="${CROWN_IN_D}"/></clipPath>
  <clipPath id="gClipDen"><path d="${CROWN_IN_D}"/><path d="${ROOT_D}"/></clipPath>
  <clipPath id="gClipBone"><path id="gBoneP" d="M-40 990C80 985 200 960 290 948L312 948L312 1000L770 1000L770 948L790 948C880 960 1000 985 1120 990L1120 1640L-40 1640Z"/></clipPath>
  </defs>`;
  s += `<g transform="translate(540 960) scale(1.2) translate(-540 -960)">`;
  s += `<mask id="gMask" maskUnits="userSpaceOnUse" x="-200" y="700" width="1480" height="1100"><rect x="-200" y="700" width="1480" height="1100" fill="#000"/><ellipse cx="540" cy="1130" rx="600" ry="500" fill="#fff" filter="url(#${p}blur40)"/></mask><g mask="url(#gMask)">`;
  // ---- tulang alveolar (belakang): blok trabekular berpori dengan kortikal tipis di tepi
  const BONE = 'M-40 990C80 985 200 960 290 948L330 948L330 1060L750 1060L750 948L790 948C880 960 1000 985 1120 990L1120 1640L-40 1640Z';
  s += `<g id="g-tulang"><g filter="url(#${p}shadow)"><path d="${BONE}" fill="url(#gBone)"/></g>`;
  s += `<g clip-path="url(#gClipBone)">`;
  // pori trabekular: lingkaran besar-kecil dengan tepi terang (tepi atas-kiri) dan dalam gelap
  let pores = '';
  for (let row = 0; row < 24; row++) for (let col = 0; col < 36; col++) {
    const x = -30 + col * 33 + (row % 2) * 16.5 + (r() - 0.5) * 9, y = 975 + row * 29 + (r() - 0.5) * 9, rr = 8 + r() * 9;
    if (y < 1015 && (x < 305 || x > 775)) continue;
    pores += `<g transform="translate(${f1(x)} ${f1(y)})"><circle r="${f1(rr + 2.5)}" fill="#FFEBC0" opacity=".85" transform="translate(-1.8 -1.8)"/><circle r="${f1(rr)}" fill="#C0702A"/><circle r="${f1(rr * 0.74)}" cx="${f1(rr * 0.16)}" cy="${f1(rr * 0.16)}" fill="#8F4514" opacity=".9"/></g>`;
  }
  s += `<g filter="url(#${p}blur2)">${pores}</g>`;
  s += `<rect x="-40" y="940" width="1160" height="720" fill="url(#gBoneFade)"/>`;
  s += `</g>`;
  // kortikal tepi atas tulang di kiri/kanan puncak alveolar
  s += `<path d="M-40 990C80 985 200 960 290 948L330 948" fill="none" stroke="#FFF0C8" stroke-width="12" stroke-linecap="round" opacity=".9"/><path d="M790 948C880 960 1000 985 1120 990" fill="none" stroke="#FFF0C8" stroke-width="12" stroke-linecap="round" opacity=".9"/>`;
  s += `</g>`;
  // ---- berkas saraf-pembuluh alveolaris inferior (kanal mandibula) + cabang dental ke apeks
  const CANAL = 'M-40 1540C200 1520 420 1530 540 1528C700 1526 900 1520 1120 1540';
  s += `<path d="${CANAL}" fill="none" stroke="#7A3414" stroke-width="92" opacity=".55" stroke-linecap="round" filter="url(#${p}blur4)"/>`;
  s += `<path d="${CANAL}" fill="none" stroke="#FFD7A0" stroke-width="12" opacity=".35" stroke-linecap="round" transform="translate(0 -52)"/>`;
  s += tube('M-40 1520C220 1500 420 1512 540 1510C700 1508 900 1500 1120 1520', 26, PAL.nerve, { dark: '#A8821A', light: '#FFF2B0', p });
  s += tube('M-40 1552C220 1532 420 1544 540 1542C700 1540 900 1532 1120 1552', 18, '#E8362E', { dark: '#6A0810', light: '#FF9A90', p });
  s += tube('M-40 1580C220 1560 420 1572 540 1570C700 1568 900 1560 1120 1580', 20, '#4048CC', { dark: '#141860', light: '#8E96F8', p });
  // cabang dental menuju apeks akar (saraf kuning, arteri merah, vena biru)
  for (const [x0, ax, ay] of [[420, 400, 1428], [660, 680, 1428]]) {
    s += tube(`M${x0 - 6} 1512C${x0 - 6} 1480 ${ax - 6} 1460 ${ax} ${ay}`, 8, PAL.nerve, { dark: '#A8821A', light: '#FFF2B0', p, shadow: false });
    s += tube(`M${x0 + 4} 1546C${x0 + 16} 1500 ${ax + 12} 1470 ${ax + 3} ${ay}`, 6, '#E8362E', { dark: '#6A0810', light: '#FF9A90', p, shadow: false });
    s += tube(`M${x0 + 18} 1572C${x0 + 36} 1510 ${ax + 22} 1476 ${ax + 7} ${ay}`, 5.5, '#4048CC', { dark: '#141860', light: '#8E96F8', p, shadow: false });
  }
  s += `</g>`;
  // ---- ligamen periodontal (celah merah muda di sekitar akar) + serat Sharpey
  s += `<g filter="url(#${p}shadowS)"><path d="${ROOT_OPEN}" fill="none" stroke="${PAL.pdl}" stroke-width="30" stroke-linejoin="round" stroke-linecap="round"/></g><path d="${ROOT_OPEN}" fill="none" stroke="#FFC9A8" stroke-width="22" stroke-linejoin="round" stroke-linecap="round" opacity=".9"/>`;
  let fib = '';
  sampleCubic(ROOT, 20).forEach(([x, y], i) => { if (i % 3 || y < 960) return; const sx = x < 540 ? -1 : 1; fib += `<path d="M${f1(x)} ${f1(y)}l${f1(sx * 14)} ${f1(10)}" stroke="#A8532E" stroke-width="2.2" opacity=".55" stroke-linecap="round"/>`; });
  s += `<g>${fib}</g>`;
  s += `<path d="${ROOT_OPEN}" fill="none" stroke="#FFF0C8" stroke-width="5" stroke-linejoin="round" opacity=".8" transform="translate(540 1100) scale(1.05 1.03) translate(-540 -1100)"/>`;
  // ---- dentin (mahkota + akar)
  s += `<g filter="url(#${p}shadow)"><g filter="url(#${p}volS)"><path d="${ROOT_D}" fill="url(#gDen)"/><path d="${CROWN_IN_D}" fill="url(#gDen)"/><rect x="350" y="900" width="380" height="70" fill="url(#gDen)"/></g></g>`;
  // tubulus dentin: garis radial halus dari pulpa ke arah luar
  let tub = '';
  for (let i = 0; i < 150; i++) { const a = (i / 150) * Math.PI * 2, cx = 540, cy = 800, rr0 = 120, rr1 = 360 + (Math.sin(a * 2) * 40); tub += `<path d="M${f1(cx + Math.cos(a) * rr0)} ${f1(cy + Math.sin(a) * rr0 * 1.1)}L${f1(cx + Math.cos(a) * rr1)} ${f1(cy + Math.sin(a) * rr1 * 0.95)}" stroke="#B5702E" stroke-width="1.6" opacity=".22"/>`; }
  s += `<g clip-path="url(#gClipDen)">${tub}`;
  // akar: tubulus miring dari kanal ke luar
  let tr = ''; sampleCubic(CAN_M, 14).concat(sampleCubic(CAN_D, 14)).forEach(([x, y], i) => { if (i % 2 || y < 950) return; const sx = x < 540 ? -1 : 1; tr += `<path d="M${f1(x)} ${f1(y)}l${f1(sx * 34)} ${f1(-22)}M${f1(x)} ${f1(y)}l${f1(-sx * 34)} ${f1(-22)}" stroke="#B5702E" stroke-width="1.6" opacity=".24"/>`; });
  s += tr + `</g>`;
  // garis pertumbuhan dentin (Owen) lengkung mengikuti mahkota
  s += `<g clip-path="url(#gClipC)" fill="none" stroke="#9A5A22" stroke-width="2" opacity=".18"><path d="M360 900C348 790 372 680 430 620"/><path d="M380 900C372 800 394 706 444 650"/><path d="M730 900C742 790 718 680 650 620"/><path d="M712 900C720 800 698 706 636 650"/></g>`;
  // ---- sementum (garis cokelat keemasan di permukaan akar) lebih tebal di apeks
  s += `<path d="${ROOT_OPEN}" fill="none" stroke="${PAL.cementum}" stroke-width="9" stroke-linejoin="round" stroke-linecap="round"/><path d="${ROOT_OPEN}" fill="none" stroke="#F0CE90" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" opacity=".8" transform="translate(-1 -1)"/>`;
  // ---- pulpa: ruang pulpa dan kanal akar (meruncing) dengan pembuluh dan saraf
  const cm = sampleCubic(CAN_M, 14), cd2 = sampleCubic(CAN_D, 14);
  s += `<g filter="url(#${p}shadowS)"><g filter="url(#${p}volS)"><path d="${CHAMBER}" fill="url(#gPulp)"/><path d="${ribbon(cm, 40, 9)}" fill="url(#gPulp)"/><path d="${ribbon(cd2, 40, 9)}" fill="url(#gPulp)"/></g></g>`;
  s += `<path d="${CHAMBER}" fill="none" stroke="#7A0E28" stroke-width="3" opacity=".6"/>`;
  s += `<path d="M420 700C410 760 410 830 420 880" fill="none" stroke="#fff" stroke-width="8" opacity=".3" stroke-linecap="round" filter="url(#${p}blur4)"/>`;
  // pembuluh dan saraf: tiga garis halus (merah arteri, biru vena, kuning saraf) naik dari foramen apikal lalu bercabang ke tanduk pulpa
  const strand = (pts, w, col, dark) => `<path d="${pts}" fill="none" stroke="${dark}" stroke-width="${f1(w + 1.8)}" stroke-linecap="round"/><path d="${pts}" fill="none" stroke="${col}" stroke-width="${f1(w)}" stroke-linecap="round"/>`;
  const up = (cx0, sgn) => {
    let o2 = '';
    const lines = [[-7, PAL.nerve, '#7A5A08'], [0, '#F0282A', '#5A0610'], [7, '#4A56E0', '#141860']];
    for (const [off, c, dk] of lines) {
      const d = `M${cx0 + off * 0.3 + sgn * (-8)} 1428C${cx0 + off + sgn * 4} 1330 ${cx0 + sgn * 36 + off} 1200 ${cx0 + sgn * 50 + off} 1090C${cx0 + sgn * 62 + off} 1000 ${cx0 + sgn * 66 + off * 0.6} 960 ${cx0 + sgn * 62} 930`;
      o2 += strand(d, 3.8, c, dk);
    }
    return o2;
  };
  s += up(404, 1) + up(676, -1);
  // di ruang pulpa: kedua berkas bercabang ke tanduk dan dinding (pohon halus)
  const fan = (x0, y0, tips) => tips.map(([tx, ty, c, dk, w]) => strand(`M${x0} ${y0}C${x0 + (tx - x0) * 0.2} ${y0 - 50} ${tx - (tx - x0) * 0.1} ${ty + 70} ${tx} ${ty}`, w, c, dk)).join('');
  const cols = [['#F0282A', '#5A0610'], ['#4A56E0', '#141860'], [PAL.nerve, '#7A5A08']];
  const mk = (x0, y0, xs) => xs.map((tx, i) => [tx, 676 + (i % 3) * 14 + Math.abs(tx - 540) * 0.0, ...cols[i % 3], 2.6]);
  s += fan(470, 930, mk(470, 930, [428, 446, 470, 500, 530, 440, 462]));
  s += fan(610, 930, mk(610, 930, [652, 634, 610, 580, 550, 640, 618]));
  s += fan(540, 920, [[520, 760, '#F0282A', '#5A0610', 2.2], [560, 760, '#4A56E0', '#141860', 2.2], [540, 740, PAL.nerve, '#7A5A08', 2.2]]);
  // ---- email (enamel): selubung tembus cahaya di mahkota; tebal di puncak tonjol, tipis di leher
  const enamel = `<path d="${CROWN_D}" fill="url(#gEn)" fill-rule="evenodd"/>`;
  s += `<g filter="url(#${p}shadow)"><g filter="url(#${p}vol)"><path d="${CROWN_D} ${CROWN_IN_D}" fill="url(#gEn)" fill-rule="evenodd"/></g></g>`;
  s += `<path d="${cubicD(CROWN_IN)}" fill="none" stroke="#9FA7E8" stroke-width="3" opacity=".7"/>`;
  // striae/pita email tipis dan sorotan lebar
  s += `<g fill="none" stroke="#8C94E0" stroke-width="2" opacity=".28"><path d="M318 860C300 760 322 650 372 590"/><path d="M330 860C316 770 336 668 384 606"/><path d="M762 860C780 760 758 650 708 590"/><path d="M750 860C764 770 744 668 696 606"/></g>`;
  s += `<path d="M360 590C402 528 456 520 492 548" fill="none" stroke="#fff" stroke-width="16" opacity=".85" stroke-linecap="round" filter="url(#${p}blur4)"/><path d="M328 700C318 760 322 820 336 870" fill="none" stroke="#fff" stroke-width="12" opacity=".6" stroke-linecap="round" filter="url(#${p}blur4)"/>`;
  s += `<path d="M590 548C630 520 690 524 716 566" fill="none" stroke="#fff" stroke-width="10" opacity=".5" stroke-linecap="round" filter="url(#${p}blur4)"/>`;
  s += `<path d="${cubicD(CROWN)}" fill="none" stroke="${PAL.rim}" stroke-width="7" opacity=".5" filter="url(#${p}blur2)" transform="translate(2 2)"/>`;
  // ---- gusi (gingiva): mengapit leher gigi, margin dengan sulkus, papila, dan epitel pelekat
  const gum = (m) => {
    const X = (x) => (m ? 1080 - x : x), sg = m ? -1 : 1;
    const d = `M${X(-40)} 1004L${X(-40)} 872C${X(50)} 866 ${X(150)} 840 ${X(214)} 800C${X(256)} 774 ${X(296)} 790 ${X(312)} 836C${X(322)} 866 ${X(325)} 898 ${X(322)} 934L${X(318)} 966C${X(250)} 978 ${X(120)} 990 ${X(-40)} 1004Z`;
    let g = `<g filter="url(#${p}shadow)"><g filter="url(#${p}vol)"><path d="${d}" fill="url(#gGum)"/></g></g>`;
    g += `<path d="${d}" fill="#fff" filter="url(#${p}tex)" opacity=".16" style="mix-blend-mode:multiply"/>`;
    g += `<path d="M${X(-30)} 890C${X(60)} 884 ${X(150)} 862 ${X(214)} 826C${X(250)} 806 ${X(284)} 818 ${X(298)} 856" fill="none" stroke="#FFC4CC" stroke-width="10" opacity=".75" stroke-linecap="round" filter="url(#${p}blur2)"/>`;
    // sulkus gingiva dan epitel penyatu (garis gelap tipis di sepanjang leher)
    g += `<path d="M${X(318)} 846C${X(326)} 880 ${X(328)} 910 ${X(326)} 936" fill="none" stroke="#5A0A22" stroke-width="5" opacity=".7" stroke-linecap="round"/>`;
    g += `<path d="M${X(306)} 858C${X(312)} 890 ${X(312)} 920 ${X(308)} 950" fill="none" stroke="#FFB4BC" stroke-width="3" opacity=".6" stroke-linecap="round"/>`;
    // serat gingiva dan kapiler halus
    for (let i = 0; i < 6; i++) g += `<path d="M${X(60 + i * 40)} ${955 + (i % 2) * 6}C${X(100 + i * 40)} ${930 - (i % 3) * 10} ${X(150 + i * 28)} ${905} ${X(188 + i * 24)} ${880}" fill="none" stroke="#C0183C" stroke-width="2.2" opacity=".5"/>`;
    g += `<path d="M${X(-30)} 960C${X(100)} 962 ${X(200)} 966 ${X(300)} 976" fill="none" stroke="#FFB0B8" stroke-width="3" opacity=".4" stroke-dasharray="3 9"/>`;
    return g;
  };
  s += `<g id="g-gusi">${gum(0)}${gum(1)}</g>`;
  // partikel aliran darah di pulpa (animasi)
  let fl = '';
  for (const [c, sg] of [[CAN_M, 1], [CAN_D, 1]]) { const S = sampleCubic(c, 10); for (let i = 0; i < 4; i++) { const u = (((t * 0.4 + i / 4) % 1) + 1) % 1, [x, y] = S[Math.floor((1 - u) * (S.length - 1))]; fl += `<circle cx="${f1(x)}" cy="${f1(y)}" r="4.6" fill="#FFE6E0" opacity="${f1(0.7 * Math.sin(u * Math.PI))}"/>`; } }
  s += `<g id="g-pulpa-aliran" filter="url(#${p}blur2)">${fl}</g>`;
  s += `</g>`;
  s += vignette(p);
  if (labels) s += `<g id="g-label">${[
    [430, 520, 70, 410, 'Email (enamel)'], [352, 760, 70, 520, 'Dentin mahkota'], [540, 760, 800, 410, 'Ruang pulpa'], [628, 640, 800, 470, 'Tanduk pulpa'],
    [440, 1160, 70, 1020, 'Dentin akar'], [616, 1100, 800, 1000, 'Kanal akar (pulpa)'], [324, 1100, 70, 1180, 'Sementum'], [330, 1180, 70, 1260, 'Lig. periodontal'],
    [540, 1030, 800, 1110, 'Furkasi'], [880, 1300, 800, 1400, 'Tulang alveolar (trabekular)'], [160, 874, 70, 700, 'Gusi (gingiva)'], [322, 900, 70, 830, 'Sulkus + epitel penyatu'],
    [404, 1428, 70, 1440, 'Foramen apikal'], [540, 1510, 700, 1640, 'Saraf (kuning), arteri (merah), vena (biru)'], [900, 970, 800, 880, 'Puncak tulang alveolar'], [720, 1180, 800, 1220, 'Akar distal'], [360, 1260, 70, 1380, 'Akar mesial'],
  ].map(([x, y, tx, ty, txt]) => { const left = tx < 540; return label(540 + (x - 540) * 1.2, 960 + (y - 960) * 1.2, left ? 28 : 1052, 960 + (ty - 960) * 1.2, txt, { fs: 23, anchor: left ? 'start' : 'end' }); }).join('')}</g>`;
  return s;
}

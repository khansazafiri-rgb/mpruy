// Jantung manusia tampak depan (permukaan sternokostal) dengan pembuluh besar dan arteri koroner utama. Kode murni (SVG + filter pencahayaan), 1080 x 1920. Revisi 4 (geometri dulu).
// Orientasi: kanan pasien = kiri layar; apeks mengarah ke kiri-bawah pasien (kanan-bawah layar).
// Dasar anatomi yang diperiksa (lihat README): batang pulmonal keluar dari ventrikel kanan ke atas dan ke kiri pasien, bercabang di bawah arkus aorta; aorta asenden keluar dari
// ventrikel kiri di belakang batang pulmonal lalu berada di kanan-depannya, arkus melengkung di atas bifurkasi pulmonal dengan tiga cabang (brakiosefalika, karotis komunis kiri, subklavia kiri);
// RCA di sulkus koronarius kanan, LAD di sulkus interventrikular anterior sampai takik apeks, sirkumfleksa di sulkus AV kiri, vena jantung magna naik di samping LAD.
// Mode polos: render.html?plain membuang semua bagian efek (dibungkus fx()) sehingga yang tersisa hanya geometri dengan warna datar.
// Layer animasi (id grup): #h-denyut (semua), #h-ventrikel, #h-atrium, #h-aorta, #h-pulmonal, #h-vena-besar, #h-koroner, #h-vena-jantung, #h-lemak, #h-aliran, #h-label.
import { PAL, W, H, f1, rng, mix, lighten, darken, defs, background, vignette, label, ribbon, sampleCubic, cubicD, vessel, endCap, tangent, fx, TEMA_MEDCOEL } from './anatomi.js';
import { MC, latar, merek, labels as chipLabels, E, seg, KLIP, kam, clamp01 } from './medcoel.js';
export const TEMA = TEMA_MEDCOEL;   // ?tema=lama merender gaya lama (ungu-magenta) untuk pembanding
export const LAYERS = [['h-vena-besar', 'V. kava superior + a. pulmonalis kanan'], ['h-vena-pulmonalis', 'Vv. pulmonalis kiri'], ['h-ventrikel', 'Ventrikel'], ['h-atrium', 'Atrium kanan + V. kava inferior'], ['h-lemak', 'Lemak epikardium'], ['h-koroner', 'Arteri koroner'], ['h-vena-jantung', 'Vena jantung'], ['h-aorta', 'Aorta + arkus + cabang'], ['h-atrium-aurikel', 'Aurikel'], ['h-pulmonal', 'Batang pulmonal + a. pulmonalis kiri']];
export const P = 'h';
// warna datar untuk versi polos (pengganti gradien)
export const FLAT = { hBody: '#D2372E', hLV: '#C22A34', hAtr: '#8C1E36', hFat: '#F2B03C' };

// ---- geometri (koordinat kanvas; area aman x 60-1020, y 250-1450)
const BODY = [330, 770, 262, 796, 214, 880, 204, 980, 196, 1070, 238, 1140, 292, 1200, 370, 1290, 480, 1380, 590, 1424, 622, 1438, 656, 1442, 684, 1428, 712, 1412, 740, 1380, 776, 1330, 860, 1220, 900, 1100, 904, 980, 902, 860, 858, 756, 770, 700, 700, 660, 620, 650, 560, 656, 470, 662, 390, 716, 330, 770];
const LAD = [575, 702, 584, 820, 600, 960, 612, 1090, 624, 1200, 636, 1310, 650, 1408];
const RCA = [468, 735, 430, 760, 404, 820, 400, 890, 396, 960, 398, 1030, 372, 1096, 356, 1140, 348, 1180, 360, 1222];   // di sulkus koronarius kanan (batas atrium kanan dan ventrikel kanan), lalu membelok ke tepi akut
const RMA = [360, 1222, 372, 1254, 414, 1292, 470, 1330, 520, 1360, 560, 1380, 596, 1392];   // a. marginalis kanan di tepi akut (inferior), lanjutan RCA
const LCX = [600, 700, 680, 690, 760, 712, 818, 760, 858, 812, 878, 880, 884, 960];
const D1 = [586, 790, 660, 800, 736, 850, 790, 936], D2 = [602, 950, 680, 975, 752, 1030, 806, 1106];
const OM = [846, 806, 868, 866, 876, 936, 868, 1010];                              // a. marginalis kiri (di tepi kiri)
const GCV = [650, 1396, 642, 1290, 630, 1190, 620, 1085, 606, 960, 596, 826, 594, 730, 640, 700, 720, 722, 800, 770];
const SCV = [322, 1206, 360, 1264, 424, 1318, 500, 1366];
const AO = [484, 780, 470, 700, 466, 614, 488, 536, 510, 460, 556, 410, 622, 400, 690, 392, 744, 430, 764, 500, 772, 560, 774, 640, 770, 730];
const PT = [516, 800, 526, 700, 556, 606, 628, 552, 700, 524, 790, 520, 874, 548];   // batang pulmonal yang melengkung mulus menjadi a. pulmonalis kiri (satu pembuluh)
const RPA = [628, 552, 560, 524, 440, 508, 296, 530];
const SVC = [352, 306, 362, 400, 354, 520, 330, 620, 322, 700, 330, 760, 346, 812];
const RA = 'M350 752C282 790 226 870 218 960C212 1036 250 1096 314 1104C372 1108 398 1050 396 980C394 900 406 810 350 752Z';
const RAU = 'M330 792C340 716 420 676 506 690C536 696 548 724 530 752C500 780 430 800 372 836C346 850 322 826 330 792Z';
const LAU = 'M696 704C730 664 810 662 846 712C872 750 846 790 806 786C766 780 730 762 704 744C688 732 684 716 696 704Z';

export function jantung(o = {}) {
  const p = 'h', labels = !!o.labels, t = o.t ?? 0, r = rng(21), lama = o.tema === 'lama', anim = !!o.anim, SH = lama ? 0 : 60, K = kam(anim ? t : 0, { cx: 540, cy: 900, dy: -10 });
  // kontraksi lokal (60 dpm): ventrikel menipis dari apeks dan menyempit ke arah pangkal (titik tumpu dekat pangkal pembuluh, sehingga pembuluh tetap tersambung); atrium mengembang berlawanan fase; pembuluh besar tidak ikut diskalakan
  const ramp = anim ? seg(t, 0, 0.9, E.soft) : 0, ph = (((t % 1) + 1) % 1), cV = anim ? ramp * (ph < 0.3 ? E.out(ph / 0.3) : ph < 0.62 ? 1 - E.soft((ph - 0.3) / 0.32) : 0) : 0, cA = anim ? ramp * (ph < 0.3 ? 0 : ph < 0.62 ? E.soft((ph - 0.3) / 0.32) : 1 - E.soft((ph - 0.62) / 0.38)) : 0;
  const OV = [585, 780], dV = `translate(${OV[0]} ${OV[1]}) rotate(${f1(-0.9 * cV)}) scale(${(1 - 0.03 * cV).toFixed(4)} ${(1 - 0.052 * cV).toFixed(4)}) translate(${-OV[0]} ${-OV[1]})`, OA = [330, 920], dA = `translate(${OA[0]} ${OA[1]}) scale(${(1 + 0.02 * cA).toFixed(4)}) translate(${-OA[0]} ${-OA[1]})`;
  const S = (pts, n = 28) => sampleCubic(pts, n);
  let s = lama ? background(p, { seed: 5, glow: { x: 560, y: 900, r: 720 }, tint: '#FFD0E8', vesselColor: '#B23A5A', cells: 18, particles: 90 }) : latar(p, { seed: 7, fokus: { x: 560, y: 960 }, t: anim ? t : 0, kilau: [[110, 330, 28], [980, 300, 20], [1010, 1620, 32], [80, 1700, 20], [820, 1840, 18], [260, 1790, 24]] });
  s += `<defs>
  <radialGradient id="hBody" gradientUnits="userSpaceOnUse" cx="470" cy="900" r="640"><stop offset="0" stop-color="#E23C32"/><stop offset=".35" stop-color="#C92430"/><stop offset=".72" stop-color="#97102A"/><stop offset="1" stop-color="#44040F"/></radialGradient>
  <radialGradient id="hLV" gradientUnits="userSpaceOnUse" cx="760" cy="900" r="420"><stop offset="0" stop-color="#F5463C"/><stop offset=".6" stop-color="#C81F2C"/><stop offset="1" stop-color="#6A0A18"/></radialGradient>
  <radialGradient id="hAtr" gradientUnits="userSpaceOnUse" cx="300" cy="900" r="240"><stop offset="0" stop-color="#B02848"/><stop offset=".55" stop-color="#7C1630"/><stop offset="1" stop-color="#340614"/></radialGradient>
  <radialGradient id="hFat" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#FFE48A"/><stop offset=".55" stop-color="${PAL.fat}"/><stop offset="1" stop-color="${PAL.fatDark}"/></radialGradient>
  <radialGradient id="hShade" gradientUnits="userSpaceOnUse" cx="470" cy="860" r="820"><stop offset=".45" stop-color="#1A0008" stop-opacity="0"/><stop offset="1" stop-color="#1A0008" stop-opacity=".3"/></radialGradient>
  <filter id="hWob" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="6" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="14" xChannelSelector="R" yChannelSelector="G"/></filter>
  <filter id="hGoo" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="3.2" result="b"/><feColorMatrix in="b" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9"/></filter>
  <clipPath id="hClip"><path d="${cubicD(BODY)}Z"/></clipPath>
  <clipPath id="hClipLV"><path d="M${LAD[0]} ${LAD[1]}C${LAD.slice(2, 8).join(' ')} ${LAD.slice(8).join(' ')}L760 1500L1000 1500L1000 600L640 600Z"/></clipPath>
  </defs>`;
  const beat = 1 + 0.012 * Math.sin(t * 8);
  s += lama ? `<g id="h-denyut" transform="translate(540 960) scale(${f1(beat)}) translate(-540 -960)">` : `<g id="h-denyut" transform="translate(0 ${SH}) ${K.tf}">`;
  s += fx(`<ellipse cx="560" cy="1000" rx="470" ry="520" fill="${lama ? '#FF3A5E' : MC.mint3}" opacity="${lama ? 0.38 : 0.16}" filter="url(#${p}blur40)"/>`);

  // ---- belakang: v. kava superior, a. pulmonalis kanan (lewat di belakang aorta), v. pulmonalis kiri
  s += `<g id="h-vena-besar">`;
  const svc = S(SVC), rpa = S(RPA);
  s += vessel(rpa, 66, 56, PAL.pulm, { p, dark: darken(PAL.pulm, 0.55), light: lighten(PAL.pulm, 0.6) }) + endCap(rpa[rpa.length - 1][0], rpa[rpa.length - 1][1], tangent(rpa), 56, PAL.pulm, '#161A66');
  s += vessel(svc, 62, 72, PAL.vein, { p, dark: PAL.veinDark, light: PAL.veinLight }) + endCap(svc[0][0], svc[0][1] + 2, -90, 62, PAL.vein, '#10165A');
  s += `</g>`;
  s += `<g id="h-vena-pulmonalis">`;
  for (const [y0, y1] of [[690, 664], [770, 786]]) { const pv = S([780, y0, 840, y0 - 10, 910, y1 - 8, 984, y1], 16); s += vessel(pv, 50, 44, PAL.artery, { p, dark: PAL.arteryDark, light: PAL.arteryLight }) + endCap(pv[pv.length - 1][0], pv[pv.length - 1][1], tangent(pv), 44, PAL.artery, '#3A060C'); }
  s += `</g>`;

  if (!lama) s += `<g id="h-deform" transform="${dV}">`;
  // ---- ventrikel: siluet bervolume (kubah) lalu lapisan cahaya bertingkat (semua efek dibungkus fx)
  s += `<g id="h-ventrikel"><g filter="url(#${p}shadow)"><g filter="url(#${p}vol)"><path d="${cubicD(BODY)}Z" fill="url(#hBody)"/></g></g>`;
  s += `<g clip-path="url(#hClip)"><path d="M${LAD[0]} ${LAD[1]}C${LAD.slice(2, 8).join(' ')} ${LAD.slice(8).join(' ')}L760 1500L1000 1500L1000 600L640 600Z" fill="#C22A34" opacity=".55" class="nos"/></g>`;
  let sh = `<g clip-path="url(#hClip)">`;
  sh += `<g filter="url(#${p}blur20)"><g clip-path="url(#hClipLV)"><rect x="560" y="600" width="480" height="900" fill="url(#hLV)" opacity=".8"/></g></g>`;
  sh += `<ellipse cx="420" cy="1040" rx="170" ry="300" transform="rotate(14 420 1040)" fill="#FF5A3C" opacity=".22" filter="url(#${p}blur40)"/>`;
  sh += `<ellipse cx="810" cy="1150" rx="120" ry="270" transform="rotate(14 810 1150)" fill="#5A0620" opacity=".4" filter="url(#${p}blur40)"/>`;
  sh += `<g style="mix-blend-mode:soft-light"><ellipse cx="540" cy="800" rx="90" ry="70" fill="#fff" opacity=".25" filter="url(#${p}blur20)"/><ellipse cx="440" cy="1000" rx="95" ry="210" transform="rotate(16 440 1000)" fill="#fff" opacity=".2" filter="url(#${p}blur40)"/><ellipse cx="725" cy="930" rx="100" ry="250" transform="rotate(12 725 930)" fill="#fff" opacity=".28" filter="url(#${p}blur40)"/></g>`;
  sh += `<path d="M858 790C900 880 902 1010 866 1120" fill="none" stroke="#fff" stroke-width="40" opacity=".22" stroke-linecap="round" filter="url(#${p}blur20)"/>`;
  sh += `<path d="M300 1070C330 1180 410 1290 520 1360" fill="none" stroke="#fff" stroke-width="30" opacity=".18" stroke-linecap="round" filter="url(#${p}blur20)"/>`;
  sh += `<ellipse cx="560" cy="1210" rx="70" ry="190" transform="rotate(10 560 1210)" fill="#2A0210" opacity=".34" filter="url(#${p}blur40)"/>`;
  sh += `<path d="${cubicD(LAD)}" fill="none" stroke="#2A0210" stroke-width="46" opacity=".34" stroke-linecap="round" filter="url(#${p}blur20)"/>`;
  sh += `<rect x="150" y="600" width="860" height="900" fill="url(#hShade)"/>`;
  sh += `<ellipse cx="545" cy="805" rx="130" ry="62" fill="#2A0210" opacity=".42" filter="url(#${p}blur20)"/><ellipse cx="770" cy="780" rx="90" ry="46" fill="#2A0210" opacity=".35" filter="url(#${p}blur20)"/>`;
  sh += `<path d="M904 980C900 1100 860 1220 776 1330C740 1380 712 1412 684 1428" fill="none" stroke="#FF8AA0" stroke-width="16" opacity=".3" filter="url(#${p}blur8)"/>`;
  sh += `<path d="${cubicD(BODY)}Z" fill="none" stroke="${lama ? PAL.rim : MC.mint2}" stroke-width="12" opacity=".4" filter="url(#${p}blur4)" transform="translate(-3 -3)"/>`;
  sh += `</g>`;
  s += fx(sh);
  for (const [pts, w] of [[LAD, 34], [RCA, 28], [LCX, 28]]) s += fx(`<path d="${cubicD(pts)}" fill="none" stroke="#3A0210" stroke-width="${w}" opacity=".5" stroke-linecap="round" filter="url(#${p}blur8)"/>`);
  s += `</g>`;

  // ---- v. kava inferior + atrium kanan
  const ivc = S([290, 1075, 280, 1120, 262, 1170, 246, 1215], 12);
  s += `<g id="h-atrium"${lama ? '' : ` transform="${dA}"`}>`;
  s += vessel(ivc, 90, 84, PAL.vein, { p, dark: PAL.veinDark, light: PAL.veinLight }) + endCap(ivc[ivc.length - 1][0], ivc[ivc.length - 1][1], tangent(ivc), 84, PAL.vein, '#10165A');
  s += `<g filter="url(#${p}shadowS)"><g filter="url(#${p}vol)"><path d="${RA}" fill="url(#hAtr)"/></g></g>`;
  s += fx(`<path d="M330 800C275 850 252 930 262 1010" fill="none" stroke="#fff" stroke-width="30" opacity=".22" stroke-linecap="round" filter="url(#${p}blur8)"/>`);
  s += `</g>`;

  // ---- lemak epikardium (gugusan lobulus; hanya tampil di versi final) + arteri koroner utama (bertaper) + cabang bernama + vena jantung
  let fat = '';
  const fatClusters = (pts, spacing, rr, half, sides = [-1, 1], taper = [1, 0.62]) => {
    const Sm = sampleCubic(pts, 60), m = Sm.length, acc = [0]; for (let i = 1; i < m; i++) acc.push(acc[i - 1] + Math.hypot(Sm[i][0] - Sm[i - 1][0], Sm[i][1] - Sm[i - 1][1]));
    const total = acc[m - 1], n = Math.max(3, Math.floor(total / spacing));
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n, tg = u * total; let k = 1; while (k < m - 2 && acc[k] < tg) k++;
      const a = Sm[k], b = Sm[Math.min(m - 1, k + 2)], nx = -(b[1] - a[1]), ny = b[0] - a[0], nl = Math.hypot(nx, ny) || 1, size = rr * (taper[0] + (taper[1] - taper[0]) * u);
      for (const sd of sides) { if (r() < 0.08) continue; const bx = a[0] + nx / nl * sd * (half + size * 0.45), by = a[1] + ny / nl * sd * (half + size * 0.45), nb = 3 + Math.floor(r() * 3);
        for (let q = 0; q < nb; q++) { const rad = size * (0.62 + 0.5 * r()), cx = bx + (r() - 0.5) * size * 0.9, cy = by + (r() - 0.5) * size * 0.9; fat += `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(rad)}" fill="url(#hFat)"/>`; } }
    }
  };
  fatClusters(RCA, 12.5, 13, 12, [-1, 1], [1, 0.7]); fatClusters(LAD, 12.5, 12.5, 13, [-1, 1], [1, 0.4]); fatClusters(LCX, 13.5, 12.5, 11, [-1, 1], [1, 0.65]); fatClusters(RMA, 13.5, 10, 9, [-1, 1], [1, 0.5]);
  s += `<g id="h-lemak"><g filter="url(#${p}shadowS)"><g filter="url(#${p}volS)"><g filter="url(#hGoo)" class="nos">${fat}</g></g></g></g>`;
  const art = (pts, w0, w1) => { const Sm = S(pts, 26); return vessel(Sm, w0, w1, PAL.coronary, { p, dark: PAL.coronaryDark, light: '#FF9A90', filter: 'volS' }); };
  s += `<g id="h-koroner" clip-path="url(#hClip)">`;
  s += art(RCA, 22, 12) + art(RMA, 14, 8) + art(LAD, 26, 10) + art(D1, 14, 7) + art(D2, 13, 7) + art(LCX, 21, 10) + art(OM, 13, 7);
  s += `</g>`;
  s += `<g id="h-vena-jantung" clip-path="url(#hClip)">`;
  const vein = (pts, w0, w1) => vessel(S(pts, 26), w0, w1, '#4A56E0', { p, dark: '#141860', light: '#9AA2FA', filter: 'volS', shadow: false });
  s += vein(GCV, 15, 10) + vein(SCV, 10, 7);
  for (const v of ['M430 940C418 900 410 860 408 820', 'M470 1060C440 1030 420 1000 408 970']) s += `<path d="${v}" fill="none" stroke="#141860" stroke-width="7.4" stroke-linecap="round"/><path d="${v}" fill="none" stroke="#5A66F0" stroke-width="4.6" stroke-linecap="round"/>`;
  s += `</g>`;

  if (!lama) s += `</g>`;   // h-deform
  // ---- aorta asenden + arkus + tiga cabang (di belakang batang pulmonal), akar aorta dengan sinus
  s += `<g id="h-aorta">`;
  const ao = S(AO, 30), br = [[S([540, 438, 520, 404, 482, 356, 462, 316], 18), 50, 44], [S([628, 404, 630, 372, 630, 340, 630, 312], 18), 36, 34], [S([704, 398, 720, 370, 744, 342, 766, 314], 18), 40, 36]];
  for (const [b, w0, w1] of br) s += vessel(b, w0, w1, PAL.artery, { p, dark: PAL.arteryDark, light: PAL.arteryLight }) + endCap(b[b.length - 1][0], b[b.length - 1][1], tangent(b), w1, PAL.artery, '#3A060C');
  s += vessel(ao, 112, 80, PAL.artery, { p, dark: PAL.arteryDark, light: PAL.arteryLight, shadowF: 'shadow', ease: (t) => 1 - Math.pow(1 - t, 2.2) });
  s += `<g filter="url(#${p}shadowS)"><g filter="url(#${p}volV)"><path d="M412 790C404 740 428 700 480 694C530 700 552 740 544 790C526 808 430 808 412 790Z" fill="${PAL.artery}"/></g></g>`;
  s += fx(`<path d="M436 732C456 714 484 712 504 722" fill="none" stroke="#fff" stroke-width="9" opacity=".4" stroke-linecap="round" filter="url(#${p}blur4)"/>`);
  s += `</g>`;
  // ---- aurikel kanan (di depan akar aorta) dan kiri (di sisi batang pulmonal), tepi bergelombang
  s += `<g id="h-atrium-aurikel"${lama ? '' : ` transform="${dA}"`}>`;
  for (const d of [RAU, LAU]) s += `<g filter="url(#${p}shadowS)"><g filter="url(#${p}vol)"><g filter="url(#hWob)"><path d="${d}" fill="url(#hAtr)"/></g></g></g>`;
  s += fx(`<g fill="none" stroke="#3A0612" stroke-width="4.5" opacity=".42" stroke-linecap="round"><path d="M340 800C378 772 436 748 492 728"/><path d="M348 828C396 800 452 780 510 758"/><path d="M730 692C770 674 814 686 836 718"/><path d="M724 718C768 702 812 716 838 748"/></g><path d="M326 790C362 744 440 706 512 702" fill="none" stroke="#fff" stroke-width="10" opacity=".34" stroke-linecap="round" filter="url(#${p}blur2)"/><path d="M712 692C750 666 806 670 838 708" fill="none" stroke="#fff" stroke-width="10" opacity=".36" stroke-linecap="round" filter="url(#${p}blur2)"/>`);
  s += `</g>`;
  // ---- batang pulmonal yang melengkung mulus menjadi a. pulmonalis kiri (satu pembuluh bertaper, di depan aorta; kedua aurikel mengapitnya)
  s += `<g id="h-pulmonal">`;
  const pt = S(PT, 28);
  s += vessel(pt, 150, 64, PAL.pulm, { p, dark: darken(PAL.pulm, 0.55), light: lighten(PAL.pulm, 0.6), shadowF: 'shadow', ease: (t) => 1 - Math.pow(1 - t, 2.6) }) + endCap(pt[pt.length - 1][0], pt[pt.length - 1][1], tangent(pt), 64, PAL.pulm, '#161A66');
  s += `</g>`;
  let fl = '';
  for (let i = 0; i < 5; i++) { const u = (((t * 0.5 + i / 5) % 1) + 1) % 1, [x, y] = ao[Math.floor(u * (ao.length - 1))]; fl += `<circle cx="${f1(x)}" cy="${f1(y)}" r="9" fill="#FFE8D0" opacity="${f1(0.5 * Math.sin(u * Math.PI))}"/>`; }
  s += fx(`<g id="h-aliran" filter="url(#${p}blur2)">${fl}</g>`);
  s += `</g>`; // h-denyut
  s += vignette(p);
  if (!lama) s += merek({ judul: 'Jantung', sub: 'Tampak depan · pembuluh besar + koroner' });
  if (labels && lama) s += `<g id="h-label">${LBL.map(([x, y, tx, ty, txt]) => { const left = tx < 540; return label(x, y, left ? 28 : 1052, ty, txt, { fs: 24, anchor: left ? 'start' : 'end' }); }).join('')}</g>`;
  else if (labels) {
    const la = (t0) => (anim ? seg(t, t0, t0 + KLIP.labelMasuk, E.out) : 1), A = (v) => ({ a: v }), P2 = (x, y) => { const q = K.pt(x, y); return [q[0], q[1] + SH]; };
    const it = [
      [...P2(600, 408), 1, 'Arkus aorta', A(la(3.9))], [...P2(580, 640), 1, 'Batang pulmonal', A(la(4.0))], [...P2(346, 540), -1, 'V. kava sup.', A(la(4.1))], [...P2(330, 1040), -1, 'Atrium kanan', A(la(4.2))],
      [...P2(470, 1200), -1, 'Ventrikel kanan', A(la(4.3))], [...P2(730, 1250), 1, 'Ventrikel kiri', A(la(4.4))], [...P2(606, 1000), 1, 'LAD', A(la(4.5))], [...P2(398, 960), -1, 'Koroner kanan', A(la(4.6))], [...P2(654, 1426), 1, 'Apeks', A(la(4.7))],
    ];
    s += chipLabels(it, { atas: 330 });
  }
  return s;
}
// label pemeriksaan: [x titik pada struktur, y, tx, ty, teks]
const LBL = [
  [458, 318, 28, 236, 'a. brakiosefalika'], [624, 314, 1052, 236, 'a. karotis komunis kiri'], [764, 316, 1052, 292, 'a. subklavia kiri'],
  [352, 340, 28, 330, 'V. kava sup.'], [330, 524, 28, 410, 'A. pulmonalis kanan'], [470, 600, 28, 490, 'Aorta asenden'],
  [690, 396, 1052, 380, 'Arkus aorta'], [580, 640, 1052, 470, 'Batang pulmonal'], [850, 534, 1052, 556, 'A. pulmonalis kiri'], [900, 676, 1052, 640, 'V. pulmonalis kiri'],
  [420, 740, 28, 640, 'Aurikel kanan'], [780, 690, 1052, 724, 'Aurikel kiri'], [402, 850, 28, 770, 'Lemak epikardium (alur)'], [270, 960, 28, 900, 'Atrium kanan'],
  [398, 960, 28, 1010, 'A. koronaria kanan (RCA)'], [480, 1100, 28, 1110, 'Ventrikel kanan'], [250, 1190, 28, 1210, 'V. kava inferior'], [380, 1280, 28, 1310, 'A. marginalis kanan'],
  [790, 740, 1052, 810, 'A. sirkumfleksa'], [790, 936, 1052, 900, 'Cabang diagonal'], [872, 930, 1052, 985, 'A. marginalis kiri'], [606, 980, 1052, 1070, 'LAD (desendens anterior)'],
  [632, 1100, 1052, 1150, 'V. jantung magna'], [790, 1040, 1052, 1230, 'Ventrikel kiri'], [650, 1410, 1052, 1330, 'Apeks'],
];

// geometri untuk pemeriksaan sambungan (periksa-jantung.mjs)
export const GEOM = { BODY, AO, PT, SVC, RA, LAD, RCA, RAU, LAU };
export { jantung as 'jantung-v4m' };

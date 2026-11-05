// Jantung manusia tampak depan (permukaan sternokostal) dengan pembuluh besar dan arteri koroner utama. Kode murni (SVG + filter pencahayaan), 1080 x 1920. Revisi 2.
// Orientasi: kanan pasien = kiri layar; apeks mengarah ke kiri-bawah pasien (kanan-bawah layar).
// Dasar anatomi yang diperiksa (lihat README): batang pulmonal keluar dari ventrikel kanan ke atas dan ke kiri pasien, bercabang di bawah arkus aorta; aorta asenden keluar dari
// ventrikel kiri di belakang batang pulmonal lalu berada di kanan-depannya, arkus melengkung di atas bifurkasi pulmonal dengan tiga cabang (brakiosefalika, karotis komunis kiri, subklavia kiri);
// RCA di sulkus koronarius kanan, LAD di sulkus interventrikular anterior sampai takik apeks, sirkumfleksa di sulkus AV kiri, vena jantung magna naik di samping LAD.
// Layer animasi (id grup): #h-denyut (semua), #h-ventrikel, #h-atrium, #h-aorta, #h-pulmonal, #h-vena-besar, #h-koroner, #h-vena-jantung, #h-lemak, #h-aliran, #h-label.
import { PAL, W, H, f1, rng, mix, lighten, darken, defs, background, vignette, label, ribbon, sampleCubic, cubicD, vessel, endCap, tangent } from './anatomi.js';
export const P = 'h';

// ---- geometri (koordinat kanvas; area aman x 60-1020, y 250-1450)
const BODY = [330, 770, 250, 800, 200, 900, 185, 1010, 172, 1090, 215, 1150, 270, 1205, 360, 1300, 480, 1385, 590, 1425, 640, 1440, 690, 1432, 728, 1398, 850, 1290, 932, 1130, 926, 960, 920, 840, 860, 740, 770, 692, 700, 660, 620, 650, 560, 656, 470, 662, 390, 720, 330, 770];
const LAD = [575, 702, 584, 820, 600, 960, 614, 1090, 626, 1200, 638, 1310, 652, 1408];
const RCA = [468, 735, 430, 760, 404, 820, 400, 890, 396, 960, 398, 1030, 372, 1096, 356, 1140, 348, 1180, 360, 1222];   // di sulkus koronarius kanan (batas atrium kanan dan ventrikel kanan), lalu membelok ke tepi akut
const RMA = [360, 1222, 372, 1254, 414, 1292, 470, 1330, 520, 1360, 560, 1380, 596, 1392];   // a. marginalis kanan di tepi akut (inferior), lanjutan RCA
const LCX = [600, 700, 680, 690, 760, 712, 820, 760, 868, 810, 892, 880, 896, 960];
const D1 = [586, 790, 660, 800, 740, 850, 800, 940], D2 = [602, 950, 680, 975, 760, 1030, 815, 1110];
const OM = [858, 800, 884, 860, 892, 930, 884, 1010];                              // a. marginalis kiri (di tepi kiri)
const GCV = [662, 1396, 654, 1290, 642, 1190, 630, 1085, 614, 960, 600, 826, 596, 730, 640, 700, 720, 722, 800, 770];
const SCV = [322, 1206, 360, 1264, 424, 1318, 500, 1366];
const AO = [470, 760, 462, 660, 470, 560, 505, 480, 548, 424, 650, 392, 730, 414, 800, 440, 828, 510, 830, 600, 830, 640, 828, 690, 826, 730];
const PT = [510, 790, 520, 680, 548, 600, 625, 548];
const LPA = [625, 548, 700, 520, 790, 514, 880, 540];
const RPA = [625, 548, 560, 520, 440, 504, 296, 526];
const SVC = [338, 292, 338, 420, 336, 560, 332, 770];

export function jantung(o = {}) {
  const p = 'h', labels = !!o.labels, t = o.t ?? 0, r = rng(21);
  const S = (pts, n = 28) => sampleCubic(pts, n);
  let s = background(p, { seed: 5, glow: { x: 560, y: 900, r: 720 }, tint: '#FFD0E8', vesselColor: '#B23A5A', cells: 18, particles: 90 });
  s += `<defs>
  <radialGradient id="hBody" gradientUnits="userSpaceOnUse" cx="470" cy="900" r="640"><stop offset="0" stop-color="#E23C32"/><stop offset=".35" stop-color="#C92430"/><stop offset=".72" stop-color="#97102A"/><stop offset="1" stop-color="#44040F"/></radialGradient>
  <radialGradient id="hLV" gradientUnits="userSpaceOnUse" cx="760" cy="900" r="420"><stop offset="0" stop-color="#F5463C"/><stop offset=".6" stop-color="#C81F2C"/><stop offset="1" stop-color="#6A0A18"/></radialGradient>
  <radialGradient id="hAtr" gradientUnits="userSpaceOnUse" cx="300" cy="900" r="240"><stop offset="0" stop-color="#B02848"/><stop offset=".55" stop-color="#7C1630"/><stop offset="1" stop-color="#340614"/></radialGradient>
  <radialGradient id="hFat" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#FFE48A"/><stop offset=".55" stop-color="${PAL.fat}"/><stop offset="1" stop-color="${PAL.fatDark}"/></radialGradient>
  <radialGradient id="hShade" gradientUnits="userSpaceOnUse" cx="470" cy="860" r="820"><stop offset=".45" stop-color="#1A0008" stop-opacity="0"/><stop offset="1" stop-color="#1A0008" stop-opacity=".3"/></radialGradient>
  <filter id="hWob" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="6" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="16" xChannelSelector="R" yChannelSelector="G"/></filter>
  <filter id="hGoo" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="3.2" result="b"/><feColorMatrix in="b" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9"/></filter>
  <clipPath id="hClip"><path d="${cubicD(BODY)}Z"/></clipPath>
  <clipPath id="hClipLV"><path d="M${LAD[0]} ${LAD[1]}C${LAD.slice(2, 8).join(' ')} ${LAD.slice(8).join(' ')}L760 1500L1000 1500L1000 600L640 600Z"/></clipPath>
  </defs>`;
  const beat = 1 + 0.012 * Math.sin(t * 8);
  s += `<g id="h-denyut" transform="translate(540 960) scale(${f1(beat)}) translate(-540 -960)">`;
  s += `<ellipse cx="560" cy="1000" rx="470" ry="520" fill="#FF3A5E" opacity=".38" filter="url(#${p}blur40)"/>`;

  // ---- belakang: v. kava superior, a. pulmonalis kanan (lewat di belakang aorta), v. pulmonalis kiri
  s += `<g id="h-vena-besar">`;
  const svc = S(SVC), rpa = S(RPA);
  s += vessel(rpa, 66, 56, PAL.pulm, { p, dark: darken(PAL.pulm, 0.55), light: lighten(PAL.pulm, 0.6) }) + endCap(rpa[rpa.length - 1][0], rpa[rpa.length - 1][1], tangent(rpa), 56, PAL.pulm, '#161A66');
  s += vessel(svc, 66, 70, PAL.vein, { p, dark: PAL.veinDark, light: PAL.veinLight }) + endCap(svc[0][0], svc[0][1] + 2, -90, 66, PAL.vein, '#10165A');
  s += `</g>`;
  s += `<g id="h-vena-pulmonalis">`;
  for (const [y0, y1] of [[690, 664], [770, 786]]) { const pv = S([800, y0, 850, y0 - 10, 910, y1 - 8, 990, y1], 16); s += vessel(pv, 52, 46, PAL.artery, { p, dark: PAL.arteryDark, light: PAL.arteryLight }) + endCap(pv[pv.length - 1][0], pv[pv.length - 1][1], tangent(pv), 46, PAL.artery, '#3A060C'); }
  s += `</g>`;

  // ---- ventrikel: siluet bervolume (kubah), lalu lapisan cahaya bertingkat per gundukan (RV dan LV), bayangan inti, cahaya pantul, perubahan rona; semua lembut dan tanpa tekstur acak
  s += `<g id="h-ventrikel"><g filter="url(#${p}shadow)"><g filter="url(#${p}vol)"><path d="${cubicD(BODY)}Z" fill="url(#hBody)"/></g></g>`;
  s += `<g clip-path="url(#hClip)">`;
  // rona: RV lebih hangat dan LV lebih dalam, batas lembut di sepanjang LAD
  s += `<g filter="url(#${p}blur20)"><g clip-path="url(#hClipLV)"><rect x="560" y="600" width="480" height="900" fill="url(#hLV)" opacity=".8"/></g></g>`;
  s += `<ellipse cx="420" cy="1040" rx="170" ry="300" transform="rotate(14 420 1040)" fill="#FF5A3C" opacity=".22" filter="url(#${p}blur40)"/>`;
  s += `<ellipse cx="820" cy="1150" rx="130" ry="270" transform="rotate(14 820 1150)" fill="#5A0620" opacity=".4" filter="url(#${p}blur40)"/>`;
  // gundukan: konus keluaran RV di bawah batang pulmonal, RV, LV (sorotan lebar bercampur soft-light, lalu sorotan sempit mengilap)
  s += `<g style="mix-blend-mode:soft-light">`;
  s += `<ellipse cx="540" cy="800" rx="90" ry="70" fill="#fff" opacity=".25" filter="url(#${p}blur20)"/>`;
  s += `<ellipse cx="440" cy="1000" rx="95" ry="210" transform="rotate(16 440 1000)" fill="#fff" opacity=".2" filter="url(#${p}blur40)"/>`;
  s += `<ellipse cx="735" cy="930" rx="100" ry="250" transform="rotate(12 735 930)" fill="#fff" opacity=".28" filter="url(#${p}blur40)"/>`;
  s += `</g>`;
  s += `<path d="M868 780C920 880 922 1010 880 1130" fill="none" stroke="#fff" stroke-width="40" opacity=".24" stroke-linecap="round" filter="url(#${p}blur20)"/>`;
  s += `<path d="M880 830C908 900 908 990 880 1070" fill="none" stroke="#fff" stroke-width="11" opacity=".46" stroke-linecap="round" filter="url(#${p}blur4)"/>`;
  s += `<path d="M452 900C436 960 440 1030 470 1090" fill="none" stroke="#fff" stroke-width="24" opacity=".2" stroke-linecap="round" filter="url(#${p}blur8)"/>`;
  s += `<path d="M300 1070C330 1180 410 1290 520 1360" fill="none" stroke="#fff" stroke-width="30" opacity=".2" stroke-linecap="round" filter="url(#${p}blur20)"/>`;
  s += `<path d="M312 1110C342 1192 402 1262 472 1316" fill="none" stroke="#fff" stroke-width="8" opacity=".3" stroke-linecap="round" filter="url(#${p}blur4)"/>`;
  // pantulan kilau permukaan epikardium mengikuti lengkung gundukan (bukan ornamen)
  s += `<path d="M742 742C772 820 790 910 786 1010C782 1070 764 1120 738 1160" fill="none" stroke="#fff" stroke-width="15" opacity=".34" stroke-linecap="round" filter="url(#${p}blur4)"/><path d="M424 880C404 950 410 1030 440 1110C456 1150 478 1182 506 1210" fill="none" stroke="#fff" stroke-width="13" opacity=".26" stroke-linecap="round" filter="url(#${p}blur4)"/><path d="M296 1080C318 1170 376 1250 456 1318" fill="none" stroke="#1A0008" stroke-width="26" opacity=".3" stroke-linecap="round" filter="url(#${p}blur8)"/>`;
  // bayangan inti (sisi menjauhi cahaya) dan alur
  s += `<ellipse cx="560" cy="1210" rx="70" ry="190" transform="rotate(10 560 1210)" fill="#2A0210" opacity=".34" filter="url(#${p}blur40)"/>`;
  s += `<path d="${cubicD(LAD)}" fill="none" stroke="#2A0210" stroke-width="46" opacity=".34" stroke-linecap="round" filter="url(#${p}blur20)"/>`;
  s += `<rect x="150" y="600" width="860" height="900" fill="url(#hShade)"/>`;
  // oklusi ambien di dasar pembuluh besar (membuat pangkal batang pulmonal dan aurikel terasa duduk di badan jantung)
  s += `<ellipse cx="545" cy="805" rx="130" ry="62" fill="#2A0210" opacity=".42" filter="url(#${p}blur20)"/><ellipse cx="770" cy="780" rx="90" ry="46" fill="#2A0210" opacity=".35" filter="url(#${p}blur20)"/>`;
  // cahaya pantul hangat di tepi kanan-bawah dan cahaya tepi dingin
  s += `<path d="M926 960C920 1090 840 1250 728 1398C690 1432 640 1440 590 1425" fill="none" stroke="#FF8AA0" stroke-width="16" opacity=".3" filter="url(#${p}blur8)"/>`;
  s += `<path d="${cubicD(BODY)}Z" fill="none" stroke="${PAL.rim}" stroke-width="12" opacity=".4" filter="url(#${p}blur4)" transform="translate(-3 -3)"/>`;
  s += `</g>`;
  // alur (sulkus) sebagai bayangan dalam
  for (const [pts, w] of [[LAD, 34], [RCA, 28], [LCX, 28]]) s += `<path d="${cubicD(pts)}" fill="none" stroke="#3A0210" stroke-width="${w}" opacity=".5" stroke-linecap="round" filter="url(#${p}blur8)"/>`;
  s += `</g>`;

  // ---- v. kava inferior + atrium kanan (menonjol di tepi kanan jantung, kiri layar)
  const ivc = S([290, 1075, 280, 1120, 262, 1170, 246, 1215], 12);
  s += `<g id="h-atrium">`;
  s += vessel(ivc, 96, 88, PAL.vein, { p, dark: PAL.veinDark, light: PAL.veinLight }) + endCap(ivc[ivc.length - 1][0], ivc[ivc.length - 1][1], tangent(ivc), 88, PAL.vein, '#10165A');
  const RA = 'M338 760C262 790 205 880 205 990C205 1070 245 1124 318 1112C384 1100 404 1040 400 960C396 880 420 796 338 760Z';
  s += `<g filter="url(#${p}shadowS)"><g filter="url(#${p}vol)"><path d="${RA}" fill="url(#hAtr)"/></g></g>`;
  s += `<path d="M330 800C275 850 252 930 262 1010" fill="none" stroke="#fff" stroke-width="30" opacity=".26" stroke-linecap="round" filter="url(#${p}blur8)"/><path d="M300 830C268 880 258 940 262 990" fill="none" stroke="#fff" stroke-width="8" opacity=".4" stroke-linecap="round" filter="url(#${p}blur2)"/>`;
  s += `</g>`;

  // ---- lemak epikardium (lobulus beruntun di sepanjang alur) + arteri koroner utama (bertaper) + cabang bernama + vena jantung
  // lemak epikardium: gugusan lobulus (2-4 bulatan tumpang tindih) di kedua sisi alur, menipis ke apeks, dijaga jarak dari arteri utama supaya tidak menutupinya
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
  s += `<g id="h-lemak"><g filter="url(#${p}shadowS)"><g filter="url(#${p}volS)"><g filter="url(#hGoo)">${fat}</g></g></g></g>`;
  const art = (pts, w0, w1) => { const Sm = S(pts, 26); return vessel(Sm, w0, w1, PAL.coronary, { p, dark: PAL.coronaryDark, light: '#FF9A90', filter: 'volS' }); };
  s += `<g id="h-koroner" clip-path="url(#hClip)">`;
  s += art(RCA, 22, 12) + art(RMA, 14, 8) + art(LAD, 26, 10) + art(D1, 14, 7) + art(D2, 13, 7) + art(LCX, 21, 10) + art(OM, 13, 7);
  s += `</g>`;
  s += `<g id="h-vena-jantung" clip-path="url(#hClip)">`;
  const vein = (pts, w0, w1) => vessel(S(pts, 26), w0, w1, '#4A56E0', { p, dark: '#141860', light: '#9AA2FA', filter: 'volS', shadow: false });
  s += vein(GCV, 15, 10) + vein(SCV, 10, 7);
  // vena kardiaka anterior: dua saja, mengalir dari dinding ventrikel kanan langsung ke atrium kanan
  for (const v of ['M430 940C418 900 410 860 408 820', 'M470 1060C440 1030 420 1000 408 970']) s += `<path d="${v}" fill="none" stroke="#141860" stroke-width="7.4" stroke-linecap="round"/><path d="${v}" fill="none" stroke="#5A66F0" stroke-width="4.6" stroke-linecap="round"/>`;
  s += `</g>`;

  // ---- aorta asenden + arkus + tiga cabang (di belakang batang pulmonal), akar aorta dengan sinus
  s += `<g id="h-aorta">`;
  const ao = S(AO, 30), br = [[S([520, 452, 500, 400, 452, 350, 440, 300], 18), 54, 48], [S([616, 408, 618, 360, 622, 322, 626, 290], 18), 40, 38], [S([692, 410, 712, 364, 744, 326, 770, 294], 18), 44, 40]];
  for (const [b, w0, w1] of br) s += vessel(b, w0, w1, PAL.artery, { p, dark: PAL.arteryDark, light: PAL.arteryLight }) + endCap(b[b.length - 1][0], b[b.length - 1][1], tangent(b), w1, PAL.artery, '#3A060C');
  s += vessel(ao, 124, 88, PAL.artery, { p, dark: PAL.arteryDark, light: PAL.arteryLight, shadowF: 'shadow', ease: (t) => 1 - Math.pow(1 - t, 2.2) });
  // akar aorta: pembengkakan sinus Valsalva di pangkal
  s += `<g filter="url(#${p}shadowS)"><g filter="url(#${p}volV)"><path d="M404 780C396 730 420 690 470 684C520 690 546 730 538 780C520 800 424 800 404 780Z" fill="${PAL.artery}"/></g></g>`;
  s += `<path d="M426 722C446 704 474 702 494 712" fill="none" stroke="#fff" stroke-width="9" opacity=".4" stroke-linecap="round" filter="url(#${p}blur4)"/>`;
  s += `</g>`;
  // ---- batang pulmonal (di depan aorta) + a. pulmonalis kiri
  s += `<g id="h-pulmonal">`;
  const lpa = S(LPA, 24), pt = S(PT, 30);
  s += `<g filter="url(#${p}shadowS)"><g filter="url(#${p}volV)"><ellipse cx="636" cy="548" rx="66" ry="56" fill="${PAL.pulm}"/></g></g>`;   // bifurkasi yang halus
  s += vessel(lpa, 76, 64, PAL.pulm, { p, dark: darken(PAL.pulm, 0.55), light: lighten(PAL.pulm, 0.6) }) + endCap(lpa[lpa.length - 1][0], lpa[lpa.length - 1][1], tangent(lpa), 64, PAL.pulm, '#161A66');
  s += vessel(pt, 170, 92, PAL.pulm, { p, dark: darken(PAL.pulm, 0.55), light: lighten(PAL.pulm, 0.6), shadowF: 'shadow', ease: (t) => 1 - Math.pow(1 - t, 2.6) });
  s += `</g>`;
  // ---- aurikel kanan (di depan akar aorta) dan kiri (di sisi kiri batang pulmonal), tepi bergelombang
  const RAU = 'M296 800C320 722 420 668 506 688C552 700 566 746 534 778C492 818 408 846 342 868C308 874 286 842 296 800Z';
  const LAU = 'M690 704C730 650 822 646 858 716C882 764 850 806 800 796C756 788 726 764 700 748C684 736 682 720 690 704Z';
  s += `<g id="h-atrium-aurikel">`;
  for (const d of [RAU, LAU]) s += `<g filter="url(#${p}shadowS)"><g filter="url(#${p}vol)"><g filter="url(#hWob)"><path d="${d}" fill="url(#hAtr)"/></g></g></g>`;
  s += `<g fill="none" stroke="#3A0612" stroke-width="4.5" opacity=".42" stroke-linecap="round"><path d="M330 800C370 770 430 746 490 726"/><path d="M340 830C392 800 450 778 510 756"/><path d="M370 850C410 828 450 812 496 794"/><path d="M730 690C770 672 814 684 836 716"/><path d="M724 716C768 700 812 714 838 746"/><path d="M742 744C772 736 800 744 820 762"/></g>`;
  s += `<path d="M322 790C360 742 440 702 512 700" fill="none" stroke="#fff" stroke-width="12" opacity=".4" stroke-linecap="round" filter="url(#${p}blur2)"/><path d="M712 690C750 664 810 668 842 706" fill="none" stroke="#fff" stroke-width="11" opacity=".42" stroke-linecap="round" filter="url(#${p}blur2)"/>`;
  s += `</g>`;
  let fl = '';
  for (let i = 0; i < 5; i++) { const u = (((t * 0.5 + i / 5) % 1) + 1) % 1, [x, y] = ao[Math.floor(u * (ao.length - 1))]; fl += `<circle cx="${f1(x)}" cy="${f1(y)}" r="9" fill="#FFE8D0" opacity="${f1(0.5 * Math.sin(u * Math.PI))}"/>`; }
  s += `<g id="h-aliran" filter="url(#${p}blur2)">${fl}</g>`;
  s += `</g>`; // h-denyut
  s += vignette(p);
  if (labels) s += `<g id="h-label">${LBL.map(([x, y, tx, ty, txt]) => { const left = tx < 540; return label(x, y, left ? 28 : 1052, ty, txt, { fs: 24, anchor: left ? 'start' : 'end' }); }).join('')}</g>`;
  return s;
}
// label pemeriksaan: [x titik pada struktur, y, tx, ty, teks]
const LBL = [
  [440, 292, 28, 236, 'a. brakiosefalika'], [626, 284, 1052, 236, 'a. karotis komunis kiri'], [770, 288, 1052, 292, 'a. subklavia kiri'],
  [338, 330, 28, 330, 'V. kava superior'], [330, 516, 28, 410, 'A. pulmonalis kanan'], [460, 600, 28, 490, 'Aorta asenden'],
  [700, 392, 1052, 380, 'Arkus aorta'], [580, 640, 1052, 470, 'Batang pulmonal'], [850, 528, 1052, 556, 'A. pulmonalis kiri'], [900, 676, 1052, 640, 'V. pulmonalis kiri'],
  [420, 740, 28, 640, 'Aurikel kanan'], [780, 690, 1052, 724, 'Aurikel kiri'], [402, 850, 28, 770, 'Lemak epikardium (alur)'], [270, 960, 28, 900, 'Atrium kanan'],
  [398, 960, 28, 1010, 'A. koronaria kanan (RCA)'], [480, 1100, 28, 1110, 'Ventrikel kanan'], [250, 1190, 28, 1210, 'V. kava inferior'], [380, 1280, 28, 1310, 'A. marginalis kanan'],
  [790, 740, 1052, 810, 'A. sirkumfleksa'], [800, 940, 1052, 900, 'Cabang diagonal'], [884, 930, 1052, 985, 'A. marginalis kiri'], [606, 980, 1052, 1070, 'LAD (desendens anterior)'],
  [632, 1100, 1052, 1150, 'V. jantung magna'], [790, 1040, 1052, 1230, 'Ventrikel kiri'], [660, 1410, 1052, 1330, 'Apeks'],
];

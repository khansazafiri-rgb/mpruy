// Jantung manusia tampak depan (anterior) dengan pembuluh besar dan arteri koroner. Kode murni (SVG + filter pencahayaan), 1080 x 1920.
// Orientasi: kanan pasien = kiri layar. Apeks mengarah ke kiri-bawah pasien (kanan-bawah layar).
// Bagian yang dapat dianimasikan (id grup): #h-denyut (seluruh jantung berdenyut kecil), #h-aliran (partikel aliran di aorta dan batang pulmonal), #h-koroner, #h-lemak, #h-label.
import { PAL, W, H, f1, rng, mix, lighten, darken, defs, background, vignette, tube, label } from './anatomi.js';

// kurva kubik bersambung: pts = [x0,y0, c1x,c1y, c2x,c2y, x1,y1, c1x,c1y, c2x,c2y, x2,y2, ...]
const cd = (pts) => { let d = `M${pts[0]} ${pts[1]}`; for (let i = 2; i < pts.length; i += 6) d += `C${pts.slice(i, i + 6).join(' ')}`; return d; };
const bez = (a, b, c, d, t) => (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t * t * c + t ** 3 * d;
export function sample(pts, n) { const out = [], segs = (pts.length - 2) / 6; for (let s = 0; s < segs; s++) { const o = s * 6, [x0, y0, a, b, c, d, x1, y1] = [pts[o], pts[o + 1], pts[o + 2], pts[o + 3], pts[o + 4], pts[o + 5], pts[o + 6], pts[o + 7]]; for (let i = 0; i < n; i++) { const t = i / n; out.push([bez(x0, a, c, x1, t), bez(y0, b, d, y1, t)]); } } const l = pts.length; out.push([pts[l - 2], pts[l - 1]]); return out; }

// ---- geometri (koordinat kanvas)
const BODY = [385, 640, 335, 725, 322, 855, 366, 970, 408, 1065, 490, 1160, 585, 1245, 622, 1277, 668, 1287, 704, 1257, 794, 1177, 862, 1052, 856, 912, 852, 790, 808, 690, 740, 635, 690, 598, 640, 585, 590, 588, 520, 590, 450, 600, 395, 640];
const RA = [405, 625, 345, 690, 330, 800, 350, 905, 360, 945, 395, 965, 430, 945, 465, 910, 472, 800, 482, 700, 487, 650, 450, 610, 405, 625];
const LAD = [588, 655, 584, 760, 590, 880, 604, 985, 614, 1085, 626, 1170, 642, 1245];
const RCA = [520, 668, 478, 662, 440, 684, 420, 735, 396, 805, 384, 885, 410, 955, 432, 1005, 470, 1062, 520, 1130, 548, 1170, 585, 1215, 600, 1236];
const CX = [610, 655, 665, 650, 725, 685, 770, 745, 800, 795, 815, 855, 810, 925];
const AO = [537, 665, 537, 570, 540, 480, 580, 432, 620, 388, 690, 386, 722, 432, 746, 470, 746, 540, 746, 610];
const PT = [566, 725, 562, 660, 590, 590, 640, 548];
const LPA = [640, 548, 690, 522, 745, 520, 805, 548];
const RPA = [640, 548, 585, 522, 480, 520, 345, 532];
const SVC = [418, 322, 418, 420, 414, 520, 412, 625];

export const P = 'h';
// cabang pembuluh halus: beberapa cabang panjang yang mulus di sepanjang jalur utama, tiap arteri didampingi vena biru sejajar (seperti acuan)
function branches(pts, r, o) {
  const n = o.n, S = sample(pts, 40), out = [];
  const mk = (x, y, ang, L, w, depth) => {
    const bend = (r() - 0.5) * 0.9, ang2 = ang + bend;
    const cx = x + Math.cos(ang) * L * 0.5, cy = y + Math.sin(ang) * L * 0.5, x1 = x + Math.cos(ang2) * L, y1 = y + Math.sin(ang2) * L;
    out.push({ x, y, cx, cy, x1, y1, w, depth });
    if (depth < 1) for (const t of [0.4, 0.7]) { if (r() < 0.75) { const qx = (1 - t) ** 2 * x + 2 * (1 - t) * t * cx + t * t * x1, qy = (1 - t) ** 2 * y + 2 * (1 - t) * t * cy + t * t * y1; mk(qx, qy, ang2 + (r() > 0.5 ? 1 : -1) * (0.45 + r() * 0.4), L * (0.45 + r() * 0.15), Math.max(2.2, w * 0.58), depth + 1); } }
  };
  for (let i = 0; i < n; i++) {
    const k = 4 + Math.floor((i + 0.3 + r() * 0.4) * (S.length - 9) / n), a = S[k], b = S[k + 2], tan = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const side = o.side ?? (i % 2 ? 1 : -1);
    mk(a[0], a[1], tan + side * (0.5 + r() * 0.35), o.len * (0.75 + r() * 0.6), o.w, 0);
  }
  return out;
}

export function jantung(o = {}) {
  const p = 'h', labels = !!o.labels, t = o.t ?? 0;
  const r = rng(21), rb = rng(5);
  let s = background(p, { seed: 5, glow: { x: 560, y: 860, r: 700 }, tint: '#FFD0E8', vesselColor: '#B23A5A', cells: 18, particles: 90 });
  s += `<defs>
  <radialGradient id="hBody" cx=".42" cy=".3" r=".8"><stop offset="0" stop-color="#FF7A60"/><stop offset=".35" stop-color="${PAL.myo}"/><stop offset=".78" stop-color="#A5141F"/><stop offset="1" stop-color="#5E0612"/></radialGradient>
  <radialGradient id="hLV" cx=".35" cy=".28" r=".85"><stop offset="0" stop-color="#FF6A52"/><stop offset=".5" stop-color="${PAL.lv}"/><stop offset="1" stop-color="#6E0A16"/></radialGradient>
  <radialGradient id="hRV" cx=".3" cy=".3" r=".9"><stop offset="0" stop-color="#FF5A48"/><stop offset=".5" stop-color="#D8262E"/><stop offset="1" stop-color="#6E0816"/></radialGradient>
  <radialGradient id="hAtr" cx=".3" cy=".25" r=".95"><stop offset="0" stop-color="#E0506A"/><stop offset=".55" stop-color="${PAL.atrium}"/><stop offset="1" stop-color="#520A1E"/></radialGradient>
  <radialGradient id="hFat" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#FFE48A"/><stop offset=".55" stop-color="${PAL.fat}"/><stop offset="1" stop-color="${PAL.fatDark}"/></radialGradient>
  <linearGradient id="hBelow" x1="0" y1="0" x2="0" y2="1"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#3A0210" stop-opacity=".5"/></linearGradient>
  <clipPath id="hClip"><path d="${cd(BODY)}Z"/></clipPath>
  <clipPath id="hClipLV"><path d="M${LAD[0]} ${LAD[1]}C${LAD.slice(2, 8).join(' ')} ${LAD.slice(8).join(' ')}L760 1300L900 1300L900 560L640 560Z"/></clipPath>
  <clipPath id="hClipRV"><path d="M${LAD[0]} ${LAD[1]}C${LAD.slice(2, 8).join(' ')} ${LAD.slice(8).join(' ')}L300 1330L300 560L560 560Z"/></clipPath>
  </defs>`;
  s += `<g id="h-denyut" transform="translate(540 870) scale(${f1(1.3 * (1 + 0.012 * Math.sin(t * 8)))} ${f1(1.17 * (1 + 0.012 * Math.sin(t * 8)))}) translate(-585 -800)">`;
  s += `<ellipse cx="600" cy="980" rx="430" ry="500" fill="#FF3A5E" opacity=".4" filter="url(#${p}blur40)"/>`;
  // ---- belakang: vena pulmonalis kiri (dua), arteri pulmonalis kanan, vena kava superior
  for (const [y0, y1] of [[672, 650], [738, 748]]) { s += tube(`M760 ${y0}C800 ${y0 - 6} 840 ${y1 - 8} 884 ${y1}`, 42, PAL.artery, { dark: PAL.arteryDark, light: PAL.arteryLight, cap: 'butt', p }); s += cap(884, y1, 21, 9, 90, PAL.artery, '#4A0B0F'); }
  s += tube(cd(RPA), 62, PAL.pulm, { dark: darken(PAL.pulm, 0.55), light: lighten(PAL.pulm, 0.6), cap: 'butt', p });
  s += cap(RPA[RPA.length - 2], RPA[RPA.length - 1], 31, 13, 90, PAL.pulm, '#161A66');
  s += tube(cd(SVC), 66, PAL.vein, { dark: PAL.veinDark, light: PAL.veinLight, cap: 'butt', p });
  s += cap(SVC[0], SVC[1], 33, 12, 0, PAL.vein, '#10165A');
  // ---- badan jantung (ventrikel)
  s += `<g filter="url(#${p}shadow)"><g filter="url(#${p}vol)"><path d="${cd(BODY)}Z" fill="url(#hBody)"/></g></g>`;
  s += `<g clip-path="url(#hClip)">`;
  s += `<g clip-path="url(#hClipRV)"><rect x="300" y="540" width="620" height="800" fill="url(#hRV)" opacity=".95"/></g>`;
  s += `<g clip-path="url(#hClipLV)"><rect x="560" y="540" width="400" height="800" fill="url(#hLV)" opacity=".95"/></g>`;
  let fib = '';
  for (let i = 0; i < 30; i++) { const x0 = 610 + i * 8 + r() * 6, y0 = 640 + r() * 30, bend = 40 + r() * 50; fib += `<path d="M${f1(x0)} ${f1(y0)}C${f1(x0 + bend)} ${f1(y0 + 220)} ${f1(x0 + bend * 0.7 + 30)} ${f1(y0 + 440)} ${f1(Math.min(690, x0 - 40 + i * 2))} ${f1(1230 - r() * 20)}" fill="none" stroke="${i % 2 ? '#FF9C90' : '#4E0A12'}" stroke-width="${f1(3 + r() * 4)}" opacity="${f1(0.05 + r() * 0.05)}" stroke-linecap="round"/>`; }
  s += `<g filter="url(#${p}blur2)">${fib}</g>`;
  s += `<rect x="300" y="540" width="620" height="800" fill="#fff" filter="url(#${p}tex)" opacity=".16" style="mix-blend-mode:multiply"/>`;
  s += `<rect x="300" y="540" width="620" height="800" fill="url(#hBelow)"/>`;
  // sorotan lebar: kilap permukaan epikardium (goresan diagonal besar, lembut)
  s += `<path d="M430 700C405 800 410 900 450 1010" fill="none" stroke="#fff" stroke-width="40" opacity=".26" stroke-linecap="round" filter="url(#${p}blur20)"/>`;
  s += `<path d="M700 700C750 780 790 860 800 960" fill="none" stroke="#fff" stroke-width="46" opacity=".3" stroke-linecap="round" filter="url(#${p}blur20)"/>`;
  s += `<path d="M720 1000C710 1080 670 1150 620 1200" fill="none" stroke="#fff" stroke-width="24" opacity=".16" stroke-linecap="round" filter="url(#${p}blur8)"/>`;
  s += `<path d="M452 740C440 820 446 900 470 970" fill="none" stroke="#fff" stroke-width="10" opacity=".38" stroke-linecap="round" filter="url(#${p}blur4)"/>`;
  s += `<path d="M742 706C782 756 806 820 812 890" fill="none" stroke="#fff" stroke-width="11" opacity=".42" stroke-linecap="round" filter="url(#${p}blur4)"/>`;
  s += `<path d="M420 640C380 700 372 800 392 900" fill="none" stroke="#fff" stroke-width="26" opacity=".24" stroke-linecap="round" filter="url(#${p}blur8)"/><path d="M760 660C830 740 856 840 846 940" fill="none" stroke="#fff" stroke-width="22" opacity=".3" stroke-linecap="round" filter="url(#${p}blur8)"/><ellipse cx="640" cy="1020" rx="30" ry="160" transform="rotate(16 640 1020)" fill="#fff" opacity=".14" filter="url(#${p}blur20)"/>`;
  s += `<path d="${cd(BODY)}Z" fill="none" stroke="${PAL.rim}" stroke-width="12" opacity=".4" filter="url(#${p}blur4)" transform="translate(-3 -3)"/>`;
  s += `</g>`;
  for (const [pts, w] of [[LAD, 30], [RCA, 26], [CX, 26]]) s += `<path d="${cd(pts)}" fill="none" stroke="#3A0210" stroke-width="${w}" opacity=".5" stroke-linecap="round" filter="url(#${p}blur8)"/>`;
  // ---- atrium kanan + vena kava inferior
  s += tube('M372 940C368 975 358 1005 352 1040', 72, PAL.vein, { dark: PAL.veinDark, light: PAL.veinLight, cap: 'butt', p });
  s += cap(352, 1040, 36, 13, 8, PAL.vein, '#10165A');
  s += `<g filter="url(#${p}shadowS)"><g filter="url(#${p}vol)"><path d="${cd(RA)}Z" fill="url(#hAtr)"/></g></g>`;
  s += `<path d="${cd(RA)}Z" fill="#fff" filter="url(#${p}tex)" opacity=".2" style="mix-blend-mode:multiply"/>`;
  s += `<path d="M395 700C375 760 372 830 392 900" fill="none" stroke="#fff" stroke-width="11" opacity=".34" stroke-linecap="round" filter="url(#${p}blur4)"/>`;
  s += `<path d="M360 760C358 820 366 880 380 930" fill="none" stroke="#fff" stroke-width="6" opacity=".18" stroke-linecap="round" filter="url(#${p}blur2)"/>`;
  // ---- aorta ascendens, arkus, tiga cabang
  const BR = [[548, 440, 524, 395, 506, 350, 500, 318, 50], [602, 408, 608, 370, 612, 340, 616, 312, 36], [672, 392, 690, 366, 706, 342, 722, 318, 40]];
  for (const b of BR) s += tube(`M${b[0]} ${b[1]}C${b[2]} ${b[3]} ${b[4]} ${b[5]} ${b[6]} ${b[7]}`, b[8], PAL.artery, { dark: PAL.arteryDark, light: PAL.arteryLight, cap: 'butt', p });
  s += tube(cd(AO), 100, PAL.artery, { dark: PAL.arteryDark, light: PAL.arteryLight, cap: 'butt', p });
  for (const b of BR) s += cap(b[6], b[7], b[8] / 2, b[8] / 4.5, 0, PAL.artery, '#3A060C');
  // ---- batang pulmonal dan arteri pulmonalis kiri
  s += tube(cd(LPA), 70, PAL.pulm, { dark: darken(PAL.pulm, 0.55), light: lighten(PAL.pulm, 0.6), cap: 'butt', p });
  s += cap(LPA[LPA.length - 2], LPA[LPA.length - 1], 35, 14, 90, PAL.pulm, '#161A66');
  s += tube(cd(PT), 96, PAL.pulm, { dark: darken(PAL.pulm, 0.55), light: lighten(PAL.pulm, 0.6), cap: 'round', p });
  // ---- aurikel
  const RAU = 'M462 650C500 590 570 598 556 670C546 712 508 742 468 712C450 696 452 668 462 650Z';
  const LAU = 'M664 622C712 586 782 606 790 664C796 704 758 728 724 700C702 682 678 678 656 656C650 642 654 630 664 622Z';
  for (const d of [RAU, LAU]) {
    s += `<g filter="url(#${p}shadowS)"><g filter="url(#${p}volS)"><path d="${d}" fill="url(#hAtr)"/></g></g>`;
    s += `<path d="${d}" fill="#fff" filter="url(#${p}tex)" opacity=".25" style="mix-blend-mode:multiply"/>`;
  }
  s += `<g fill="none" stroke="#3A0612" stroke-width="4" opacity=".4" stroke-linecap="round"><path d="M486 652C503 626 534 620 549 640"/><path d="M482 676C506 654 536 652 551 670"/><path d="M488 698C506 684 528 684 540 698"/><path d="M688 630C716 612 746 620 762 646"/><path d="M682 656C712 640 742 646 760 670"/><path d="M698 680C718 670 738 674 748 688"/></g>`;
  s += `<path d="M482 650C498 622 530 614 550 630" fill="none" stroke="#fff" stroke-width="9" opacity=".4" stroke-linecap="round" filter="url(#${p}blur2)"/><path d="M680 622C712 602 750 610 768 638" fill="none" stroke="#fff" stroke-width="9" opacity=".4" stroke-linecap="round" filter="url(#${p}blur2)"/>`;
  // ---- lemak epikardium: lobulus beruntun di sepanjang alur (dua sisi pembuluh), jingga-kuning mengilap
  let fat = '';
  const fatAt = (pts, n, rr, off) => { const S = sample(pts, 40), m = S.length; for (let i = 2; i < n; i++) { const k = Math.min(m - 3, Math.floor(i * (m - 4) / n) + 1), a = S[k], b = S[k + 1], nx = -(b[1] - a[1]), ny = b[0] - a[0], nl = Math.hypot(nx, ny) || 1; for (const sd of off) fat += `<ellipse cx="${f1(a[0] + nx / nl * sd + (r() - 0.5) * 6)}" cy="${f1(a[1] + ny / nl * sd + (r() - 0.5) * 6)}" rx="${f1(rr * (0.8 + r() * 0.5))}" ry="${f1(rr * (0.65 + r() * 0.4))}" fill="url(#hFat)" transform="rotate(${f1(r() * 180)} ${f1(a[0])} ${f1(a[1])})"/>`; } };
  fatAt(RCA, 40, 13, [-12, 12]); fatAt(LAD, 46, 11.5, [-12, 12]); fatAt(CX, 34, 12.5, [-11, 11]);
  for (let i = 0; i < 10; i++) fat += `<ellipse cx="${f1(396 + i * 20 + r() * 8)}" cy="${f1(955 + 30 * Math.sin(i) + r() * 10)}" rx="${f1(11 + r() * 7)}" ry="${f1(9 + r() * 6)}" fill="url(#hFat)"/>`;
  s += `<g id="h-lemak"><g filter="url(#${p}shadowS)"><g filter="url(#${p}volS)">${fat}</g></g></g>`;
  // ---- arteri koroner dan cabang halus (merah) + vena jantung (biru), dipangkas ke permukaan jantung
  const D1 = [592, 770, 640, 780, 690, 810, 722, 865], D2 = [602, 905, 650, 920, 700, 950, 728, 1010], OM = [786, 790, 810, 830, 826, 880, 826, 940], RVm = [400, 895, 430, 930, 470, 955, 500, 1000], RVm2 = [440, 740, 470, 790, 500, 840, 520, 880];
  const tree = (pts, n, len, w, side, seed) => branches(pts, rng(seed), { n, len, w, side }).map((b) => {
    const dx = b.x1 - b.x, dy = b.y1 - b.y, nl = Math.hypot(dx, dy) || 1, ox = -dy / nl * (4 + b.w), oy = dx / nl * (4 + b.w);
    const dA = `M${f1(b.x)} ${f1(b.y)}Q${f1(b.cx)} ${f1(b.cy)} ${f1(b.x1)} ${f1(b.y1)}`, dV = `M${f1(b.x + ox)} ${f1(b.y + oy)}Q${f1(b.cx + ox)} ${f1(b.cy + oy)} ${f1(b.x1 * 0.94 + b.x * 0.06 + ox)} ${f1(b.y1 * 0.94 + b.y * 0.06 + oy)}`;
    return `<path d="${dV}" fill="none" stroke="#141860" stroke-width="${f1(b.w * 0.8 + 2.2)}" stroke-linecap="round"/><path d="${dV}" fill="none" stroke="#4A56E0" stroke-width="${f1(b.w * 0.8)}" stroke-linecap="round"/>`
      + `<path d="${dA}" fill="none" stroke="#6A0810" stroke-width="${f1(b.w + 2.4)}" stroke-linecap="round"/><path d="${dA}" fill="none" stroke="#F4302E" stroke-width="${f1(b.w)}" stroke-linecap="round"/><path d="${dA}" fill="none" stroke="#FF9A8C" stroke-width="${f1(b.w * 0.3)}" stroke-linecap="round" transform="translate(-.6 -.6)" opacity=".8"/>`;
  }).join('');
  s += `<g clip-path="url(#hClip)" id="h-koroner-halus">`;
  s += tree(LAD, 7, 125, 6, undefined, 31) + tree(RCA, 6, 105, 5.6, 1, 32) + tree(CX, 5, 100, 5.6, 1, 33) + tree(D1, 2, 70, 4.4, undefined, 34) + tree(D2, 2, 70, 4.4, undefined, 35);
  s += `</g>`;
  s += `<g id="h-koroner">`;
  const cor = (pts, w, ex = {}) => tube(cd(pts), w, PAL.coronary, { dark: PAL.coronaryDark, light: '#FF9A90', p, ...ex });
  s += cor(RCA, 15); s += cor(RVm, 8); s += cor(RVm2, 7); s += cor(LAD, 16); s += cor(D1, 9); s += cor(D2, 8); s += cor(CX, 14); s += cor(OM, 8);
  s += `</g>`;
  s += tube(cd(GCVp()), 10, PAL.vein, { dark: PAL.veinDark, light: PAL.veinLight, p });
  s += tube(cd(SCV()), 7, PAL.vein, { dark: PAL.veinDark, light: PAL.veinLight, p });
  let fl = '';
  for (let i = 0; i < 5; i++) { const u = (((t * 0.5 + i / 5) % 1) + 1) % 1, [x, y] = sample(AO, 12)[Math.floor(u * 11)]; fl += `<circle cx="${f1(x)}" cy="${f1(y)}" r="8" fill="#FFE8D0" opacity="${f1(0.5 * Math.sin(u * Math.PI))}"/>`; }
  s += `<g id="h-aliran" filter="url(#${p}blur2)">${fl}</g>`;
  s += `</g>`; // h-denyut
  s += vignette(p);
  if (labels) s += `<g id="h-label">${LBL.map(([x, y, tx, ty, txt]) => { const [X, Y] = tf(x, y); const left = tx < 540; return label(X, Y, left ? 28 : 1052, ty, txt, { fs: 24, anchor: left ? 'start' : 'end' }); }).join('')}</g>`;
  return s;
}
// vena jantung magna sepanjang LAD lalu sulkus AV kiri, vena jantung kecil di sepanjang alur kanan
const GCVp = () => [648, 1230, 640, 1130, 628, 1020, 620, 920, 614, 820, 622, 730, 646, 676];
const SCV = () => [412, 1010, 440, 1050, 478, 1090, 520, 1128];
// peta titik koordinat gambar -> kanvas (transformasi global yang sama dengan grup h-denyut pada t = 0)
const tf = (x, y) => [540 + (x - 585) * 1.3, 870 + (y - 800) * 1.17];
const LBL = [
  [500, 318, 90, 232, 'a. brakiosefalika'], [616, 312, 650, 232, 'a. karotis komunis kiri'], [722, 318, 850, 262, 'a. subklavia kiri'],
  [740, 420, 920, 380, 'Arkus aorta'], [540, 520, 90, 340, 'Aorta ascendens'], [418, 420, 90, 300, 'V. kava superior'],
  [610, 600, 930, 520, 'Batang pulmonal'], [790, 536, 930, 560, 'A. pulmonalis kiri'], [350, 530, 90, 400, 'A. pulmonalis kanan'],
  [830, 670, 930, 640, 'V. pulmonalis kiri'], [500, 680, 90, 470, 'Aurikel kanan'], [740, 650, 930, 710, 'Aurikel kiri'], [372, 800, 90, 560, 'Atrium kanan'],
  [352, 1030, 90, 1130, 'V. kava inferior'], [415, 760, 90, 900, 'A. koronaria kanan'], [588, 800, 930, 1000, 'LAD (desendens ant.)'],
  [770, 740, 930, 800, 'A. sirkumfleksa'], [622, 1000, 930, 1080, 'V. jantung magna'], [760, 1040, 930, 1160, 'Ventrikel kiri'], [470, 1060, 90, 1240, 'Ventrikel kanan'], [650, 1262, 930, 1280, 'Apeks'],
];
// ujung potong pembuluh: ellipse lumen gelap dengan tepi dinding berkilau
function cap(x, y, rx, ry, rot, wall, lumen) {
  return `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${rot})"><ellipse rx="${f1(rx)}" ry="${f1(ry)}" fill="${darken(wall, 0.35)}"/><ellipse rx="${f1(rx * 0.86)}" ry="${f1(ry * 0.8)}" fill="${lighten(wall, 0.25)}"/><ellipse rx="${f1(rx * 0.68)}" ry="${f1(ry * 0.58)}" fill="${lumen}"/><ellipse cx="${f1(-rx * 0.2)}" cy="${f1(-ry * 0.2)}" rx="${f1(rx * 0.3)}" ry="${f1(ry * 0.18)}" fill="#fff" opacity=".3"/></g>`;
}

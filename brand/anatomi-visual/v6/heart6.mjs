// Jantung v6: ilustrasi vektor buatan tangan (SVG murni dari kode), tampak depan, dirancang dari ukuran komposisi gambar acuan.
// Tanpa SDF dan tanpa rantai kapsul: siluet adalah kurva Bezier dari titik jangkar yang ditempatkan satu per satu, pembuluh adalah
// tabung meruncing dengan lebar yang ditetapkan per titik, dan volume dibangun dari tumpukan bentuk bergeser/menyusut yang dipotong
// oleh siluetnya (clip), sehingga gradasi mengikuti kontur. Gambar acuan TIDAK ditempel; hanya dipakai untuk mengukur koordinat.
// Koordinat = piksel potongan kiri gambar acuan (572 x 1375). Mode: 'sil' (siluet), 'flat' (warna datar + garis tinta), 'final'.
import { smooth, sample, ribbon, openingAt } from './geom.mjs';

const f = (n) => (Math.round(n * 10) / 10).toString();
const VIEW = { x: 0, y: 200, w: 572, h: 900 };

// ---------------------------------------------------------------- data bentuk (jangkar buatan tangan)
export const G = {
  // badan: dari puncak atrium kanan searah jarum jam; sisi atas tersembunyi di balik batang pulmonalis dan aurikula
  body: smooth([[116, 549], [88, 583], [62, 630], [47, 690], [42, 745], [56, 806], [84, 858], [126, 910], [182, 960], [246, 1006], [322, 1047], [405, 1070], [458, 1050], [497, 990], [522, 915], [534, 835], [530, 760], [512, 695], [492, 640], [466, 596], [410, 576], [320, 570], [230, 552], [170, 543]], true),
  // atrium kanan + aurikula kanan (massa gelap di kiri atas; batasnya ditutup lemak alur AV kanan)
  ra: smooth([[116, 549], [150, 545], [192, 542], [234, 553], [266, 570], [284, 592, 'c'], [252, 610], [212, 620], [176, 636], [146, 676], [128, 730], [127, 790], [136, 838], [110, 868], [84, 858], [56, 806], [42, 745], [44, 690], [58, 630], [84, 583]], true),
  // ventrikel kanan (terang, kiri alur interventrikular) dan kiri (kanan alur)
  rv: smooth([[286, 598], [236, 618], [184, 636], [148, 672], [128, 732], [128, 792], [142, 850], [168, 902], [226, 950], [286, 992], [346, 1026], [356, 960], [372, 886], [388, 800], [396, 718], [392, 656], [360, 626]], true),
  lv: smooth([[396, 650], [404, 724], [392, 800], [376, 880], [360, 960], [350, 1030], [405, 1070], [458, 1050], [497, 990], [522, 915], [534, 835], [530, 760], [512, 695], [492, 640], [450, 618]], true),
  // aurikula kiri: dua lobus dengan takik, menyatu dengan badan di kanan bawah
  laa: smooth([[388, 606], [398, 586], [428, 574], [466, 584], [490, 606], [500, 622], [492, 632], [503, 648], [503, 676], [488, 704], [460, 716], [432, 708], [412, 690], [398, 664]], true),
};

// sumbu tabung: [x, y, lebar]
export const AX = {
  svc: [[167, 260, 67], [167, 400, 67], [168, 500, 69], [170, 566, 82]],
  rpa: [[40, 512, 46], [100, 502, 46], [160, 490, 44], [215, 480, 42], [300, 466, 44], [390, 460, 50]],
  ivc: [[140, 1056, 76], [139, 990, 76], [138, 930, 76], [138, 860, 76]],
  arch: [[256, 612, 88], [256, 500, 88], [262, 440, 84], [290, 395, 76], [340, 378, 74], [392, 388, 76], [424, 418, 80], [436, 470, 82], [438, 612, 82]],
  bct: [[272, 372, 54], [256, 312, 43], [239, 258, 40]],
  lcc: [[336, 372, 42], [336, 302, 33], [336, 237, 32]],
  lsa: [[392, 372, 50], [404, 312, 41], [420, 256, 38]],
  pa: [[330, 650, 126], [322, 585, 114], [334, 530, 98], [372, 494, 80], [436, 476, 66], [500, 483, 56], [514, 486, 54]],
};

// ujung cabang dihitung dari sumbu supaya tepi potong persis sama dengan elips lumen
const tipEnds = (k) => { const a = AX[k], p = a[a.length - 1], q = a[a.length - 2]; let tx = p[0] - q[0], ty = p[1] - q[1]; const l = Math.hypot(tx, ty); tx /= l; ty /= l; const nx = -ty, ny = tx, w = p[2] / 2; return { L: [p[0] - nx * w, p[1] - ny * w, 'c'], R: [p[0] + nx * w, p[1] + ny * w, 'c'] }; };
const TB = tipEnds('bct'), TL = tipEnds('lcc'), TS = tipEnds('lsa');
// kontur aorta: lengkung + tiga cabang, satu jalur dengan lekuk bulat di antara cabang
const AORTA_OUT = smooth([
  // BCT (puncak kiri), lekuk bulat ke LCC, lekuk bulat ke LSA, sisi luar lengkung kanan, tepi dalam lengkung, sisi luar kiri
  TB.L, TB.R, [272, 288], [285, 316], [300, 340], [316, 332], [319, 296], TL.L, TL.R, [352, 292], [356, 332], [372, 336], [386, 300], [404, 262], TS.L, TS.R,
  [420, 300], [406, 336], [418, 362], [446, 384], [464, 412], [473, 444], [479, 484], [482, 612, 'c'], [396, 612, 'c'], [399, 520], [398, 482], [390, 450], [370, 428], [346, 416], [322, 430], [308, 452], [300, 484], [298, 524], [298, 612, 'c'], [213, 612, 'c'],
  [212, 540], [212, 480], [218, 440], [232, 408], [246, 384], [255, 362], [252, 340], [242, 314], [232, 288],
], true, 0.8);

// ---------------------------------------------------------------- alur permukaan (sumbu arteri/lemak)
export const GROOVE = {
  rca: [[266, 592], [224, 610], [172, 636], [138, 682], [124, 744], [124, 806], [138, 866], [168, 914], [208, 956]],
  lad: [[394, 660], [403, 722], [396, 792], [382, 862], [367, 932], [356, 990], [351, 1030]],
  lcx: [[432, 688], [468, 702], [499, 727], [519, 766], [526, 804]],
};

// ---------------------------------------------------------------- palet
const C = {
  ink: '#2b0a18', sil: '#15121b',
  muscle: { dk: '#4a0614', d2: '#7e0a1c', md: '#b8142a', base: '#d82130', lt: '#ee4a46', hi: '#ff8a80' },
  lv: { dk: '#4a0614', base: '#b0122a', lt: '#d22a38', hi: '#ef5a5c' },
  ra: { dk: '#3b0a22', base: '#7a1230', lt: '#a82448', hi: '#d2506c' },
  red: { dk: '#6a0b14', base: '#d3282c', md: '#ea4638', lt: '#ff8a6c' },
  blue: { dk: '#16146e', base: '#3438c8', md: '#5560e8', lt: '#9aa6ff' },
  fat: { dk: '#a8680c', base: '#f0b42a', lt: '#ffe48a' },
  art: { dk: '#5c0812', base: '#c4141e', lt: '#ff6a5a' }, vein: { dk: '#12106a', base: '#3036c0', lt: '#8890ff' },
  flat: { body: '#c9172a', lv: '#b0122a', ra: '#7a1230', red: '#c8222a', blue: '#3438c8', fat: '#f0b42a', art: '#8f0c18', vein: '#3036c0', rim: '#f2a8a0', lumen: '#22042a' },
};

function tubeOutline(s) {
  const n = s.length, L = [], R = [];
  for (let i = 0; i < n; i++) { const nx = -s[i][4], ny = s[i][3], w = s[i][2] / 2; L.push([s[i][0] + nx * w, s[i][1] + ny * w]); R.push([s[i][0] - nx * w, s[i][1] - ny * w]); }
  const p = [...L, ...R.reverse()];
  return 'M' + p.map((q) => `${f(q[0])} ${f(q[1])}`).join('L') + 'Z';
}

export function buildSvg({ mode = 'final', id = 'h6' } = {}) {
  const fin = mode === 'final', flat = mode === 'flat', sil = mode === 'sil';
  const S = {};
  for (const k of Object.keys(AX)) S[k] = sample(AX[k], k === 'arch' ? 120 : 70);
  const O = {}; for (const k of Object.keys(S)) O[k] = tubeOutline(S[k]);
  const paBase = { cx: 330, cy: 646, rx: 63, ry: 28 };
  const defs = [];
  const cp = (name, inner) => defs.push(`<clipPath id="${id}-${name}">${inner}</clipPath>`);
  cp('body', `<path d="${G.body}"/>`); cp('ra', `<path d="${G.ra}"/>`); cp('rv', `<path d="${G.rv}"/>`); cp('lv', `<path d="${G.lv}"/>`); cp('laa', `<path d="${G.laa}"/>`);
  cp('aorta', `<path d="${AORTA_OUT}"/>`); cp('svc', `<path d="${O.svc}"/>`); cp('rpa', `<path d="${O.rpa}"/>`); cp('ivc', `<path d="${O.ivc}"/>`);
  cp('pa', `<path d="${O.pa}"/><ellipse cx="${paBase.cx}" cy="${paBase.cy}" rx="${paBase.rx}" ry="${paBase.ry}"/>`);
  defs.push(`<linearGradient id="${id}-lf" gradientUnits="userSpaceOnUse" x1="440" y1="590" x2="500" y2="730"><stop offset="0.55" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient><mask id="${id}-laafade" maskUnits="userSpaceOnUse" x="350" y="540" width="200" height="220"><rect x="350" y="540" width="200" height="220" fill="url(#${id}-lf)"/></mask>`);
  for (const b of [1.2, 2.5, 4, 7, 11, 16, 24]) defs.push(`<filter id="${id}-b${String(b).replace('.', '_')}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${b}"/></filter>`);
  const B = (b) => `url(#${id}-b${String(b).replace('.', '_')})`;
  defs.push(`<radialGradient id="${id}-fat" cx="36%" cy="30%" r="75%"><stop offset="0" stop-color="${C.fat.lt}"/><stop offset=".5" stop-color="${C.fat.base}"/><stop offset="1" stop-color="${C.fat.dk}"/></radialGradient>`);
  defs.push(`<linearGradient id="${id}-pab" gradientUnits="userSpaceOnUse" x1="0" y1="585" x2="0" y2="678"><stop offset="0" stop-color="${C.blue.dk}" stop-opacity="0"/><stop offset=".6" stop-color="#1a1070" stop-opacity=".7"/><stop offset="1" stop-color="#2a0a40" stop-opacity=".95"/></linearGradient>`);
  defs.push(`<radialGradient id="${id}-lum" cx="50%" cy="40%" r="70%"><stop offset="0" stop-color="#3a0a3c"/><stop offset="1" stop-color="#0c0212"/></radialGradient>`);
  defs.push(`<linearGradient id="${id}-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b0a2e"/><stop offset=".5" stop-color="#3c0f48"/><stop offset="1" stop-color="#1f0830"/></linearGradient>`);
  defs.push(`<radialGradient id="${id}-glow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#d03a86" stop-opacity=".5"/><stop offset="1" stop-color="#d03a86" stop-opacity="0"/></radialGradient>`);

  let out = '';
  // helper tumpukan bentuk bergeser/menyusut (volume mengikuti kontur) -> dipotong oleh clip
  const stack = (clip, d, cx, cy, layers) => {
    let s = `<g clip-path="url(#${id}-${clip})">`;
    for (const L of layers) {
      const sc = L.s ?? 1, dx = L.dx ?? 0, dy = L.dy ?? 0;
      const tf = `translate(${f(cx + dx)} ${f(cy + dy)}) scale(${sc}) translate(${f(-cx)} ${f(-cy)})`;
      s += `<path d="${d}" fill="${L.fill}" transform="${tf}"${L.b ? ` filter="${B(L.b)}"` : ''}${L.o != null ? ` opacity="${L.o}"` : ''}/>`;
    }
    return s + '</g>';
  };
  // tabung dengan ribbon pembayang yang mengikuti sumbu dan menjauh dari sisi terang
  const shadeTube = (clip, samples, col, opt = {}) => {
    const sp = 'spec' in opt ? opt.spec : [0.3, 0.8];
    let s = `<g clip-path="url(#${id}-${clip})">`;
    s += `<rect x="-50" y="100" width="700" height="1100" fill="${col.dk}"/>`;
    s += `<path d="${ribbon(samples, { scale: 0.9, shift: 0.06 })}" fill="${col.base}" filter="${B(4)}"/>`;
    s += `<path d="${ribbon(samples, { scale: 0.62, shift: 0.16 })}" fill="${col.md}" filter="${B(5)}"/>`;
    s += `<path d="${ribbon(samples, { scale: 0.26, shift: 0.27 })}" fill="${col.lt}" filter="${B(4)}" opacity=".9"/>`;
    if (sp) s += `<path d="${ribbon(samples, { scale: 0.08, shift: 0.3, from: sp[0], to: sp[1] })}" fill="#ffffff" filter="${B(1.2)}" opacity=".75"/>`;
    return s + '</g>';
  };
  const opening = (s, wallCol, tilt = 0.3) => {
    const o = openingAt(s, tilt);
    const tf = `translate(${f(o.cx)} ${f(o.cy)}) rotate(${f(o.ang)})`;
    if (sil) return '';
    if (flat) return `<g transform="${tf}"><ellipse rx="${f(o.rx)}" ry="${f(o.ry)}" fill="${C.flat.rim}" stroke="${C.ink}" stroke-width="2"/><ellipse rx="${f(o.rx * 0.74)}" ry="${f(o.ry * 0.66)}" fill="${C.flat.lumen}"/></g>`;
    return `<g transform="${tf}"><ellipse rx="${f(o.rx)}" ry="${f(o.ry)}" fill="${wallCol}"/><ellipse rx="${f(o.rx * 0.76)}" ry="${f(o.ry * 0.7)}" fill="url(#${id}-lum)"/><ellipse rx="${f(o.rx * 0.9)}" ry="${f(o.ry * 0.9)}" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.2" transform="translate(-1 -1.2)" clip-path="inset(0 0 55% 0)"/></g>`;
  };
  // satu bagian: sil / flat / final
  const part = (name, d, flatFill, finalFn, extra = '') => {
    if (sil) return `<path d="${d}" fill="${C.sil}"/>${extra && ''}`;
    if (flat) return `<path d="${d}" fill="${flatFill}" stroke="${C.ink}" stroke-width="2.2" stroke-linejoin="round"/>`;
    return finalFn();
  };
  const paShape = `<path d="${O.pa}"/><ellipse cx="${paBase.cx}" cy="${paBase.cy}" rx="${paBase.rx}" ry="${paBase.ry}"/>`;

  // ---------------- latar (hanya final)
  if (fin) {
    out += `<rect x="${VIEW.x}" y="${VIEW.y}" width="${VIEW.w}" height="${VIEW.h}" fill="url(#${id}-bg)"/><ellipse cx="290" cy="690" rx="330" ry="400" fill="url(#${id}-glow)"/>`;
  } else if (flat) out += `<rect x="${VIEW.x}" y="${VIEW.y}" width="${VIEW.w}" height="${VIEW.h}" fill="#f0f0eb"/>`;
  else out += `<rect x="${VIEW.x}" y="${VIEW.y}" width="${VIEW.w}" height="${VIEW.h}" fill="#fff"/>`;

  // ---------------- 1. RPA (di belakang aorta dan SVC)
  out += part('rpa', O.rpa, C.flat.blue, () => shadeTube('rpa', S.rpa, C.blue, { spec: null }));
  out += opening(S.rpa[0], '#8f98ff');
  // ---------------- 2. IVC
  out += part('ivc', O.ivc, C.flat.blue, () => shadeTube('ivc', S.ivc, C.blue, { spec: null }));
  out += opening(S.ivc[0], '#8f98ff', 0.26);
  // ---------------- 3. SVC
  out += part('svc', O.svc, C.flat.blue, () => shadeTube('svc', S.svc, C.blue, { spec: null }));
  out += opening(S.svc[0], '#8f98ff', 0.26);
  // ---------------- 4. aorta (lengkung + tiga cabang)
  out += part('aorta', AORTA_OUT, C.flat.red, () => {
    let s = `<g clip-path="url(#${id}-aorta)"><rect x="-50" y="100" width="700" height="1100" fill="${C.red.dk}"/>`;
    for (const k of ['arch', 'bct', 'lcc', 'lsa']) {
      s += `<path d="${ribbon(S[k], { scale: 0.9, shift: 0.06 })}" fill="${C.red.base}" filter="${B(4)}"/>`;
    }
    for (const k of ['arch', 'bct', 'lcc', 'lsa']) {
      s += `<path d="${ribbon(S[k], { scale: 0.62, shift: 0.16 })}" fill="${C.red.md}" filter="${B(5)}"/>`;
    }
    for (const k of ['arch', 'bct', 'lcc', 'lsa']) {
      s += `<path d="${ribbon(S[k], { scale: 0.26, shift: 0.27, from: k === 'arch' ? 0.05 : 0 })}" fill="${C.red.lt}" filter="${B(4)}" opacity=".9"/>`;
    }
    s += `<path d="${ribbon(S.arch, { scale: 0.07, shift: 0.3, from: 0.36, to: 0.52 })}" fill="#fff" filter="${B(1.2)}" opacity=".8"/>`;
    return s + '</g>';
  });
  out += opening(S.bct[S.bct.length - 1], '#ffb8a0', 0.34) + opening(S.lcc[S.lcc.length - 1], '#ffb8a0', 0.34) + opening(S.lsa[S.lsa.length - 1], '#ffb8a0', 0.34);

  // ---------------- 5. badan: dasar, massa ventrikel kanan/kiri, atrium kanan
  out += part('body', G.body, C.flat.body, () => {
    let s = stack('body', G.body, 290, 800, [
      { fill: C.muscle.dk }, { fill: C.muscle.d2, s: 0.97, dx: -8, dy: -10, b: 9 }, { fill: C.muscle.md, s: 0.9, dx: -16, dy: -20, b: 14 },
    ]);
    return s;
  });
  if (fin) {
    // massa ventrikel kanan (terang, bundar) dan kiri (lebih gelap), dengan bayangan alur di antaranya
    out += stack('rv', G.rv, 250, 800, [
      { fill: '#d42230' }, { fill: '#de2a36', s: 0.94, dx: -8, dy: -12, b: 14 }, { fill: '#e8393f', s: 0.8, dx: -14, dy: -20, b: 18 }, { fill: '#f1534d', s: 0.62, dx: -20, dy: -30, b: 20 }, { fill: '#fb766c', s: 0.42, dx: -26, dy: -42, b: 22, o: 0.7 },
    ]);
    out += stack('lv', G.lv, 450, 840, [
      { fill: C.lv.base }, { fill: '#bf1a2e', s: 0.92, dx: -8, dy: -12, b: 14 }, { fill: C.lv.lt, s: 0.74, dx: -14, dy: -22, b: 18 }, { fill: C.lv.hi, s: 0.4, dx: -30, dy: -50, b: 22, o: 0.5 },
    ]);
    out += stack('ra', G.ra, 120, 700, [
      { fill: C.ra.base }, { fill: C.ra.lt, s: 0.86, dx: -8, dy: -12, b: 16, o: 0.5 }, { fill: C.ra.hi, s: 0.36, dx: -26, dy: -40, b: 18, o: 0.28 },
    ]);
  } else if (flat) {
    out += `<path d="${G.rv}" fill="${C.flat.body}"/><path d="${G.lv}" fill="${C.flat.lv}"/><path d="${G.ra}" fill="${C.flat.ra}" stroke="${C.ink}" stroke-width="2"/>`;
    out += `<path d="${G.body}" fill="none" stroke="${C.ink}" stroke-width="2.2" stroke-linejoin="round"/>`;
  }
  // ---------------- 6. aurikula kiri (lobus bertakik, menyatu dengan badan)
  if (fin) {
    out += `<g mask="url(#${id}-laafade)">` + stack('laa', G.laa, 455, 645, [{ fill: C.ra.dk }, { fill: C.ra.base, s: 0.93, dx: -5, dy: -6, b: 4 }, { fill: C.ra.lt, s: 0.68, dx: -10, dy: -12, b: 7 }, { fill: C.ra.hi, s: 0.3, dx: -18, dy: -18, b: 7, o: 0.55 }]) + '</g>';
    // bayangan kontak hanya di tepi atas-kiri (di bawah batang pulmonalis)
    // lipatan (jaringan melipat): dua lekuk gelap dan takik
    out += `<path d="M412 650C430 640 452 640 474 656" fill="none" stroke="${C.ra.dk}" stroke-width="3.4" stroke-linecap="round" opacity=".75" filter="${B(1.2)}"/><path d="M430 600C452 610 470 626 482 650" fill="none" stroke="${C.ra.dk}" stroke-width="2.6" stroke-linecap="round" opacity=".55" filter="${B(1.2)}"/>`;
  } else if (flat) out += `<path d="${G.laa}" fill="${C.flat.ra}" stroke="${C.ink}" stroke-width="2.2"/>`;
  if (fin) {
    // lipatan aurikula kanan (di atas massa RA)
    out += `<path d="M150 560C186 566 224 580 262 596" fill="none" stroke="${C.ra.dk}" stroke-width="3.4" stroke-linecap="round" opacity=".7" filter="${B(1.2)}"/><path d="M130 592C166 600 206 612 244 606" fill="none" stroke="${C.ra.dk}" stroke-width="2.6" stroke-linecap="round" opacity=".5" filter="${B(1.2)}"/>`;
  }
  // ---------------- 6b. serat otot halus: garis yang diinterpolasi antara dua batas (alur AV/alur interventrikular/tepi), jadi mengikuti kelengkungan
  if (fin) {
    const lerpPoly = (A, Bp, u, k) => { const a = sample(A.map((p) => [p[0], p[1], 1]), 40), b = sample(Bp.map((p) => [p[0], p[1], 1]), 40); return a.map((p, i) => [p[0] * (1 - u) + b[i][0] * u + Math.sin(i * 0.35 + k) * 1.6, p[1] * (1 - u) + b[i][1] * u]); };
    const rvA = [[268, 598], [224, 612], [172, 638], [138, 684], [126, 748], [126, 808], [140, 868], [166, 922], [226, 970], [290, 1010], [346, 1030]];
    const ladA = [[394, 660], [403, 722], [396, 792], [382, 862], [367, 932], [356, 990], [351, 1030]];
    const lvB = [[470, 640], [512, 700], [530, 760], [534, 835], [522, 915], [497, 990], [458, 1050], [410, 1068]];
    const fib = (A, Bp, clip, us) => { let s = `<g clip-path="url(#${id}-${clip})" fill="none" stroke-linecap="round">`; us.forEach((u, i) => { const pts = lerpPoly(A, Bp, u, i * 1.7); const d = 'M' + pts.map((p) => `${f(p[0])} ${f(p[1])}`).join('L'); s += `<path d="${d}" stroke="${i % 2 ? '#7a0a1c' : '#ff9a90'}" stroke-width="${i % 2 ? 3 : 2.2}" opacity=".12" filter="${B(1.2)}"/>`; }); return s + '</g>'; };
    out += fib(rvA, ladA, 'rv', [0.14, 0.26, 0.38, 0.5, 0.62, 0.74, 0.86]);
    out += fib(ladA, lvB, 'lv', [0.16, 0.3, 0.46, 0.62, 0.78]);
  }
  // ---------------- 7. alur: bayangan kontak, lemak (gugus lobulus), arteri, vena
  const rnd = (() => { let r = 7; return () => { r = (r * 1664525 + 1013904223) % 4294967296; return r / 4294967296; }; })();
  const grooveS = {};
  const widths = { rca: [12, 5], lad: [12, 4.5], lcx: [9, 4.5] };
  for (const k of Object.keys(GROOVE)) { const a = GROOVE[k]; grooveS[k] = sample(a.map((p, i) => [p[0], p[1], widths[k][0] + (widths[k][1] - widths[k][0]) * (i / (a.length - 1))]), 60); }
  const gpath = (a) => smooth(a);
  if (fin) {
    out += `<g clip-path="url(#${id}-body)">`;
    for (const k of Object.keys(GROOVE)) out += `<path d="${gpath(GROOVE[k])}" fill="none" stroke="#2a030c" stroke-width="40" stroke-linecap="round" opacity=".42" filter="${B(8)}"/>`;
    // bayangan jatuh batang pulmonalis dan lipatan aurikula ke badan
    out += `<g transform="translate(6 16)" filter="${B(11)}" opacity=".55" fill="#26030c">${paShape}</g>`;
    out += `<path d="${G.ra}" transform="translate(5 12)" fill="#26030c" opacity=".35" filter="${B(7)}"/>`;
    out += '</g>';
  }
  // lobulus lemak sepanjang alur: gugus bundar dengan ukuran mengecil ke ujung
  const fatSizes = { rca: [13, 7], lad: [12, 6], lcx: [10, 6] };
  const lobules = [];
  for (const k of Object.keys(GROOVE)) {
    const smp = sample(GROOVE[k].map((p) => [p[0], p[1], 1]), 140);
    const total = smp.reduce((a, p, i) => (i ? a + Math.hypot(p[0] - smp[i - 1][0], p[1] - smp[i - 1][1]) : 0), 0);
    let acc = 0, next = 0;
    for (let i = 1; i < smp.length; i++) {
      acc += Math.hypot(smp[i][0] - smp[i - 1][0], smp[i][1] - smp[i - 1][1]);
      if (acc >= next) {
        const t = acc / total, base = fatSizes[k][0] + (fatSizes[k][1] - fatSizes[k][0]) * t;
        const nx = -smp[i][4], ny = smp[i][3];
        const n = t < 0.85 ? 2 : 1;
        for (let q = 0; q < n; q++) {
          const side = n === 2 ? (q ? 1 : -1) : (rnd() < 0.5 ? -1 : 1);
          const r = base * (0.6 + rnd() * 0.6), off = side * base * (0.55 + rnd() * 0.4);
          lobules.push({ x: smp[i][0] + nx * off, y: smp[i][1] + ny * off, r, k, t });
        }
        next += base * 0.7;
      }
    }
  }
  const drawLobule = (L) => {
    if (sil) return '';
    if (flat) return `<circle cx="${f(L.x)}" cy="${f(L.y)}" r="${f(L.r)}" fill="${C.flat.fat}" stroke="${C.ink}" stroke-width="1.3"/>`;
    return `<circle cx="${f(L.x + 2)}" cy="${f(L.y + 3.5)}" r="${f(L.r)}" fill="#2a030c" opacity=".38" filter="${B(2.5)}"/><circle cx="${f(L.x)}" cy="${f(L.y)}" r="${f(L.r)}" fill="url(#${id}-fat)"/>`;
  };
  // vena kardiak besar (menyertai LAD lalu sirkumfleks) dan arteri
  const veinPts = [[348, 1004], [359, 950], [371, 888], [385, 820], [391, 752], [387, 704], [402, 686], [436, 704], [470, 718], [500, 742]];
  const veinS = sample(veinPts.map((p, i) => [p[0] - 10, p[1] + (i > 5 ? 9 : 0), 8 - 3 * (i / (veinPts.length - 1))]), 80);
  const vessel = (smp, cols, flatFill) => {
    if (sil) return '';
    if (flat) return `<path d="${ribbon(smp)}" fill="${flatFill}" stroke="${C.ink}" stroke-width="1.2"/>`;
    return `<path d="${ribbon(smp, { scale: 1.08 })}" fill="${cols.dk}"/><path d="${ribbon(smp, { scale: 0.78, shift: 0.1 })}" fill="${cols.base}" filter="${B(1.2)}"/><path d="${ribbon(smp, { scale: 0.28, shift: 0.2 })}" fill="${cols.lt}" filter="${B(1.2)}" opacity=".85"/>`;
  };
  if (!sil) {
    out += `<g clip-path="url(#${id}-body)">`;
    for (const L of lobules) out += drawLobule(L);
    out += vessel(veinS, C.vein, C.flat.vein);
    for (const k of Object.keys(GROOVE)) out += vessel(grooveS[k], C.art, C.flat.art);
    // beberapa lobulus menutupi tepi arteri (lemak tumpang tindih pembuluh)
    lobules.filter((_, i) => i % 9 === 4).forEach((L) => { out += drawLobule({ ...L, r: L.r * 0.5 }); });
    out += '</g>';
  }
  // ---------------- 8. batang pulmonalis (paling depan): melebar dari pangkal lalu melengkung di depan aorta
  if (sil) out += `<path d="${O.pa}" fill="${C.sil}"/><ellipse cx="${paBase.cx}" cy="${paBase.cy}" rx="${paBase.rx}" ry="${paBase.ry}" fill="${C.sil}"/>`;
  else if (flat) out += `<g stroke="${C.ink}" stroke-width="4.4" stroke-linejoin="round" fill="${C.ink}">${paShape}</g><g fill="${C.flat.blue}">${paShape}</g>`;
  else {
    out += shadeTube('pa', S.pa, C.blue, { spec: [0.5, 0.74] });
    out += `<g clip-path="url(#${id}-pa)"><rect x="240" y="580" width="200" height="110" fill="url(#${id}-pab)"/><ellipse cx="336" cy="700" rx="86" ry="46" fill="${C.blue.dk}" opacity=".8" filter="${B(11)}"/>`
      + `<path d="${ribbon(S.pa, { scale: 0.2, shift: 0.24, from: 0.08, to: 0.9 })}" fill="#c4cbff" opacity=".26" filter="${B(5)}"/></g>`;
  }
  out += opening(S.pa[S.pa.length - 1], '#8f98ff', 0.3);
  // ---------------- 9. kilau dan cahaya permukaan badan (hanya final): lebar mengikuti lengkung, tajam hanya di beberapa titik
  if (fin) {
    out += `<g clip-path="url(#${id}-body)">`;
    out += `<ellipse cx="236" cy="722" rx="42" ry="86" transform="rotate(16 236 722)" fill="#ffc4bc" opacity=".26" filter="${B(16)}"/>`;
    out += `<path d="M512 706C531 770 531 842 520 906" fill="none" stroke="#ff9aa8" stroke-width="6" stroke-linecap="round" opacity=".5" filter="${B(2.5)}"/>`;
    out += `<path d="M96 826C108 868 134 906 168 936" fill="none" stroke="#ff7a8e" stroke-width="4.5" stroke-linecap="round" opacity=".4" filter="${B(2.5)}"/>`;
    out += `<ellipse cx="244" cy="690" rx="8" ry="26" transform="rotate(14 244 690)" fill="#fff" opacity=".85" filter="${B(1.2)}"/>`;
    out += `<ellipse cx="118" cy="596" rx="6" ry="15" transform="rotate(-24 118 596)" fill="#fff" opacity=".8" filter="${B(1.2)}"/>`;
    out += `<ellipse cx="476" cy="760" rx="5" ry="16" transform="rotate(8 476 760)" fill="#ffd6d6" opacity=".6" filter="${B(1.2)}"/>`;
    out += '</g>';
    out += `<g clip-path="url(#${id}-laa)"><ellipse cx="438" cy="600" rx="22" ry="8" transform="rotate(14 438 600)" fill="#fff" opacity=".5" filter="${B(2.5)}"/></g>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}" width="${VIEW.w * 2}" height="${VIEW.h * 2}"><defs>${defs.join('')}</defs>${out}</svg>`;
  return svg;
}

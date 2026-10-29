// Raka: karakter manusia 2D untuk seri video MEDCOEL. Ini ASET PRODUKSI VIDEO, bukan fitur web.
//
// Seluruh gambar dibuat dari kode: satu fungsi, rakaSvg(state), mengubah sebuah objek keadaan
// (ekspresi, arah pandang, arah kepala, pose lengan, efek) menjadi SVG. Karena keadaannya hanya
// angka, animasi cukup menginterpolasi dua keadaan (lerpState) lalu menggambar ulang tiap frame.
// Lengan digambar ulang sebagai SATU bentuk meruncing dari bahu sampai pergelangan setiap frame,
// jadi tidak ada sendi atau sambungan yang terlihat ketika tangan bergerak.
//
// Modul ini murni (tanpa DOM, tanpa dependensi) sehingga jalan di Node (membuat berkas .svg)
// dan di Chromium (merender frame video).
//
// Sistem koordinat: viewBox "0 0 400 800", Raka menghadap depan, tengah badan x = 200,
// lantai di y = 778. Lihat README.md untuk proporsi kanoniknya.

export const VIEWBOX = { w: 400, h: 800 };

export const PALETTE = {
  skin: '#F7BC8E',
  skinShade: '#EAA676',
  hair: '#212739',
  ink: '#212739', // mata dan alis
  sweater: '#1D7B75',
  sleeveFront: '#19726D',
  pants: '#212739',
  shoes: '#F5E8D6',
  mouth: '#8B3F37',
  mouthIn: '#7A2D2E',
  tongue: '#EE7A7A',
  fxWarm: '#F2735E',
  fxCool: '#6DBBA8',
  // patch logo MEDCOEL di dada: kain krem berbentuk kotak membulat + simbol (warna logo-mark.webp)
  patch: '#F5E8D6',
  patchEdge: '#E4D2B4',
  logoTeal: '#017162',
  logoGold: '#FBC23A',
};

/**
 * Palet untuk latar gelap: rambut dan celana navy diangkat sedikit supaya tidak lebur ke latar,
 * warna lain sama. Pakai: rakaSvg(state, { palette: PALETTE_ON_DARK }).
 */
export const PALETTE_ON_DARK = { hair: '#3A4468', pants: '#38426A', sweater: '#23978F', sleeveFront: '#1F8780' };

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a * (1 - t) + b * t; // tepat a pada t=0 dan b pada t=1
const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const mix = (c1, c2, t) => '#' + hex(c1).map((v, i) => Math.round(lerp(v, hex(c2)[i], clamp(t, 0, 1))).toString(16).padStart(2, '0')).join('');
const r1 = (n) => Math.round(n * 10) / 10;
export const ease = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };

/* ------------------------------------------------------------------ keadaan */

// Lengan: bahu tetap, pergelangan (wx, wy), siku (ex, ey) = titik yang dilewati lengan, jari (0..1 panjang
// telunjuk, fa = arah jari dalam derajat SVG, -90 = lurus ke atas), front (1 = digambar di depan badan).
const ARM_DOWN_L = { wx: 86, wy: 556, ex: 88, ey: 488, finger: 0, fa: -90, front: 0 };
const ARM_DOWN_R = { wx: 314, wy: 556, ex: 312, ey: 488, finger: 0, fa: -90, front: 0 };

/** Keadaan netral. Semua nilai angka supaya bisa diinterpolasi. */
export const NEUTRAL = {
  yaw: 0,        // -1 (menoleh ke kiri layar) .. 1 (kanan layar)
  tilt: 0,       // derajat, memiringkan kepala dari leher
  gazeX: 0, gazeY: 0, // -1..1, titik mata bergeser
  blink: 0,      // 0 terbuka .. 1 tertutup
  happyEyes: 0,  // 0 titik .. 1 lengkung "^ ^"
  wide: 0,       // 0..1 mata membesar (kaget)
  browL: { y: 0, rot: 0 }, // y: piksel (negatif = naik), rot: derajat (positif = ujung dalam naik)
  browR: { y: 0, rot: 0 },
  mouth: { w: 14, up: 9, lo: 9 }, // lebar setengah, lengkung bibir atas dan bawah (y kontrol)
  lean: 0, bob: 0, breath: 0,      // badan: condong (derajat), naik-turun (px), napas (0..1)
  armL: { ...ARM_DOWN_L },
  armR: { ...ARM_DOWN_R },
  fxBurst: 0, fxSpark: 0,          // tanda seru kecil di sekitar kepala / ujung jari
  flip: 0,                         // 1 = cermin (Raka menghadap sisi lain)
  bags: 0, sparkle: 0, shades: 0, shadesY: 0, sweat: 0, slump: 0, // tambahan video: kantung mata, kilau mata, kacamata, keringat, bahu turun
};

/** Ekspresi wajah (hanya bagian wajah; pose lengan terpisah). */
export const EXPRESSIONS = {
  netral:   { happyEyes: 0, wide: 0, browL: { y: 0, rot: 0 }, browR: { y: 0, rot: 0 }, mouth: { w: 14, up: 9, lo: 9 } },
  kaget:    { happyEyes: 0, wide: 1, browL: { y: -15, rot: 8 }, browR: { y: -15, rot: -8 }, mouth: { w: 9, up: -6, lo: 34 } },
  berpikir: { happyEyes: 0, wide: 0, browL: { y: -4, rot: 12 }, browR: { y: 3, rot: -6 }, mouth: { w: 10, up: 1, lo: 1 } },
  senang:   { happyEyes: 1, wide: 0, browL: { y: -7, rot: 0 }, browR: { y: -7, rot: 0 }, mouth: { w: 24, up: 4, lo: 38 } },
  menunjuk: { happyEyes: 0, wide: 0.15, browL: { y: -6, rot: 2 }, browR: { y: -6, rot: -2 }, mouth: { w: 17, up: 5, lo: 24 } },
  sedih:    { happyEyes: 0, wide: 0, browL: { y: 0, rot: 14 }, browR: { y: 0, rot: -14 }, mouth: { w: 12, up: -9, lo: -9 } },
};

/** Pose badan dan lengan. Koordinat pergelangan (wx, wy) dan lekukan siku (bend, px). */
export const POSES = {
  netral: {},
  kaget: {
    lean: -1,
    armL: { wx: 164, wy: 486, ex: 90, ey: 530, finger: 0, front: 1 },
    armR: { wx: 236, wy: 486, ex: 310, ey: 530, finger: 0, front: 1 },
    fxBurst: 1,
  },
  berpikir: {
    lean: 1.5,
    armL: { wx: 178, wy: 372, ex: 80, ey: 466, finger: 0.5, fa: -52, front: 1 },
    armR: { wx: 138, wy: 508, ex: 278, ey: 526, finger: 0, front: 1 },
  },
  menunjuk: {
    lean: 1.2,
    armR: { wx: 358, wy: 334, ex: 344, ey: 388, finger: 1, fa: -78, front: 1 },
    fxSpark: 1,
  },
  senang: {
    armL: { wx: 50, wy: 418, ex: 52, ey: 494, finger: 0, front: 0 },
    armR: { wx: 350, wy: 418, ex: 348, ey: 494, finger: 0, front: 0 },
  },
  sapa: {
    armR: { wx: 360, wy: 314, ex: 352, ey: 404, finger: 0, front: 1 },
  },
};

/** Gabungan ekspresi + pose + perubahan bebas (override) menjadi satu keadaan lengkap. */
export function raka(expression = 'netral', pose = null, overrides = {}) {
  const e = EXPRESSIONS[expression];
  if (!e) throw new Error(`Ekspresi tidak dikenal: ${expression}. Pilihan: ${Object.keys(EXPRESSIONS).join(', ')}`);
  const poseName = pose || ({ kaget: 'kaget', berpikir: 'berpikir', menunjuk: 'menunjuk', senang: 'senang' }[expression] || 'netral');
  const p = POSES[poseName];
  if (!p) throw new Error(`Pose tidak dikenal: ${poseName}. Pilihan: ${Object.keys(POSES).join(', ')}`);
  return mergeState(NEUTRAL, e, p, overrides);
}

function mergeState(...parts) {
  const out = JSON.parse(JSON.stringify(parts[0]));
  const walk = (dst, src) => {
    for (const k of Object.keys(src)) {
      if (src[k] && typeof src[k] === 'object') walk(dst[k] || (dst[k] = {}), src[k]);
      else dst[k] = src[k];
    }
  };
  parts.slice(1).forEach((s) => walk(out, s));
  return out;
}

/** Interpolasi dua keadaan lengkap (t = 0..1). Dipakai untuk transisi antar-ekspresi dan antar-pose. */
export function lerpState(a, b, t) {
  const walk = (x, y) => {
    if (x && typeof x === 'object') { const o = {}; for (const k of Object.keys(x)) o[k] = walk(x[k], y[k]); return o; }
    return lerp(x, y, t);
  };
  return walk(a, b);
}

/* ------------------------------------------------------------------ animasi contoh */

/** Kedipan: 0..1 pada waktu t (detik). Satu kedipan 0,16 detik tiap ±3,4 detik. */
export function blinkAt(t, period = 3.4, offset = 0.9) {
  const x = ((t - offset) % period + period) % period;
  if (x > 0.16) return 0;
  return Math.sin((x / 0.16) * Math.PI);
}

/** Gerak diam (napas, goyang halus) yang ditambahkan ke keadaan apa pun supaya Raka tidak kaku. */
export function idle(state, t) {
  const s = JSON.parse(JSON.stringify(state));
  s.breath = 0.5 + 0.5 * Math.sin(t * 2.1);
  s.bob = s.bob + Math.sin(t * 2.1) * 1.2;
  s.tilt = s.tilt + Math.sin(t * 0.9) * 0.7;
  s.blink = Math.max(s.blink, blinkAt(t));
  return s;
}

/**
 * Contoh urutan 11 detik: berkedip, menoleh, kaget, berpikir, menunjuk, senang, kembali netral.
 * Hanya untuk pratinjau; video sungguhan menyusun urutannya sendiri dengan raka() + lerpState().
 */
export const DEMO_LENGTH = 11;
export function demoState(t) {
  t = ((t % DEMO_LENGTH) + DEMO_LENGTH) % DEMO_LENGTH;
  const seq = [
    // [mulai, keadaan]  (keadaan dicapai pada waktu mulai; transisi 0,35 detik dari keadaan sebelumnya)
    [0.0, raka('netral')],
    [1.6, raka('netral', null, { yaw: -0.8, gazeX: -0.9 })], // menoleh ke kiri layar
    [2.7, raka('netral', null, { yaw: 0.8, gazeX: 0.9 })],   // menoleh ke kanan layar
    [3.7, raka('netral')],
    [4.4, raka('kaget')],
    [5.8, raka('berpikir', null, { gazeX: -0.5, gazeY: -0.6 })],
    [7.4, raka('menunjuk', null, { yaw: 0.35, gazeX: 0.6 })],
    [9.0, raka('senang')],
    [10.2, raka('netral')],
  ];
  let i = 0;
  while (i + 1 < seq.length && t >= seq[i + 1][0]) i += 1;
  const prev = seq[Math.max(0, i - 1)][1];
  const [start, cur] = seq[i];
  const k = i === 0 ? 1 : ease((t - start) / 0.35);
  let s = i === 0 ? cur : lerpState(prev, cur, k);
  // kaget: sedikit melonjak saat tiba
  if (seq[i][1] === seq[4][1]) s = { ...s, bob: s.bob - 10 * Math.max(0, 1 - (t - start) / 0.3) };
  return idle(s, t);
}

/* ------------------------------------------------------------------ penggambaran */

// Bahu tetap; kepala digambar dalam koordinat sendiri lalu diskalakan 1,2 ke atas leher.
const SHOULDER = { L: [104, 410], R: [296, 410] };
const HEAD_SCALE = 1.2, NECK_Y = 362, HEAD_PIVOT_Y = 306;

// Lengan = SATU bentuk meruncing (lengan baju) dari bahu ke pergelangan, digambar ulang tiap frame.
// Garis tengahnya kurva kuadrat yang melewati titik siku (ex, ey). Bentuknya gabungan lingkaran
// berwarna sama sepanjang garis itu (jari-jari 33 di bahu -> 25 di ujung), sehingga tikungan siku
// tetap mulus dan tidak ada sambungan atau sendi yang tampak.
function sleeve(sx, sy, a) {
  const cx = 2 * a.ex - (sx + a.wx) / 2, cy = 2 * a.ey - (sy + a.wy) / 2;
  const N = 40;
  const dots = [];
  for (let i = 0; i <= N; i += 1) {
    const t = i / N, u = 1 - t;
    dots.push([u * u * sx + 2 * u * t * cx + t * t * a.wx, u * u * sy + 2 * u * t * cy + t * t * a.wy, lerp(33, 25, ease(t))]);
  }
  const ex = a.wx - cx, ey = a.wy - cy, el = Math.hypot(ex, ey) || 1;
  return { dots, dx: ex / el, dy: ey / el };
}

/** Bentuk lengan: bulatan lengan baju (x, y, r), titik tangan, dan arah lengan bawah. Dipakai menggambar dan menguji. */
export function armShape(side, a) {
  const [sx, sy] = SHOULDER[side];
  const { dots, dx, dy } = sleeve(sx, sy, a);
  return { dots, dx, dy, hand: [a.wx + dx * 17, a.wy + dy * 17], handR: 22 };
}

function armSvg(side, a, P) {
  const [sx, sy] = SHOULDER[side];
  const { dots, dx, dy, hand: [hx, hy] } = armShape(side, a);
  const finger = a.finger > 0.02
    ? `<rect x="0" y="-9.5" width="${r1(12 + 52 * a.finger)}" height="19" rx="9.5" fill="${P.skin}" transform="translate(${r1(hx)} ${r1(hy)}) rotate(${r1(a.fa)})"/>`
    : '';
  const c = mix(P.sweater, P.sleeveFront, a.front);
  return `<g class="raka-arm-${side}" fill="${c}">`
    + dots.map((p) => `<circle cx="${r1(p[0])}" cy="${r1(p[1])}" r="${r1(p[2])}"/>`).join('')
    + `<circle cx="${r1(hx)}" cy="${r1(hy)}" r="22" fill="${P.skin}"/>${finger}</g>`;
}

// Patch logo MEDCOEL di dada kiri pemakai (kanan layar). Simbolnya digambar ulang dari
// apps/web/src/assets/logo-mark.webp (dua huruf C bersarang + bintang emas) dalam kotak 256 x 256.
// Patch dan simbol punya ukuran tetap; yang berubah hanya posisinya mengikuti badan (lihat rakaSvg).
export const PATCH = { x: 236, y: 421, size: 56, mark: 44 }; // pusat, sisi kain (kotak membulat), lebar simbol (px kanvas)
const LOGO_MARK = (teal, gold) => `<g fill="none" stroke="${teal}" stroke-width="27.5" stroke-linecap="round" stroke-linejoin="round">`
  + `<path d="M164.5 30H39.5A26 26 0 0 0 13.5 56V205.5A26 26 0 0 0 39.5 231.5H221.5"/>`
  + `<path d="M165 75.5H85A24 24 0 0 0 61 99.5V160.5A24 24 0 0 0 85 184.5H196A24 24 0 0 0 220 160.5V102"/></g>`
  + `<path d="M222 10Q231 31 248 46Q231 58 222 78Q213 58 196 46Q213 31 222 10Z" fill="${gold}"/>`;

function patchSvg(P, breath, flip, side) {
  const dir = side === 'kanan' ? -1 : 1;                     // 'kiri' = dada kiri pemakai
  const cx = 200 + dir * (PATCH.x - 200);
  const cy = PATCH.y + (PATCH.y - 580) * breath * 0.012;     // ikut naik-turun dada saat bernapas, ukuran tetap
  const k = PATCH.mark / 256;
  // bila gambar dicerminkan (flip), simbol dibalik lagi supaya tidak terbaca terbalik
  const keep = flip ? ` transform="translate(${r1(cx)} 0) scale(-1 1) translate(${r1(-cx)} 0)"` : '';
  return `<g class="raka-patch"${keep}>`
    + `<rect x="${r1(cx - PATCH.size / 2)}" y="${r1(cy - PATCH.size / 2)}" width="${PATCH.size}" height="${PATCH.size}" rx="17" fill="${P.patch}" stroke="${P.patchEdge}" stroke-width="2.5"/>`
    + `<g transform="translate(${r1(cx)} ${r1(cy)}) scale(${r1(k * 1000) / 1000}) translate(-128 -128)">${LOGO_MARK(P.logoTeal, P.logoGold)}</g></g>`;
}


// ---- tambahan khusus video "Masih Dua Minggu" (salinan; aset asli di brand/characters/raka tidak diubah)
function bagsSvg(s, lx, rx, ey, P) {
  const b = clamp(s.bags, 0, 1); if (b < 0.01) return '';
  const th = 1.5 + 9.5 * b, col = '#9A5F78', op = r1(0.3 + 0.68 * b);
  const one = (cx) => `<path d="M${cx - 17} ${ey + 17}Q${cx} ${ey + 17 + 12 + th * 0.9} ${cx + 17} ${ey + 17}Q${cx} ${ey + 17 + 12 - th * 0.35 + 2} ${cx - 17} ${ey + 17}Z" fill="${col}" opacity="${op}"/>`;
  return one(lx) + one(rx);
}
function sparkleSvg(s, lx, rx, ey, gx, gy) {
  const k = clamp(s.sparkle, 0, 1); if (k < 0.02) return '';
  const star = (cx, cy, r) => `<path d="M${cx} ${r1(cy - r)}Q${r1(cx + r * 0.18)} ${r1(cy - r * 0.18)} ${r1(cx + r)} ${cy}Q${r1(cx + r * 0.18)} ${r1(cy + r * 0.18)} ${cx} ${r1(cy + r)}Q${r1(cx - r * 0.18)} ${r1(cy + r * 0.18)} ${r1(cx - r)} ${cy}Q${r1(cx - r * 0.18)} ${r1(cy - r * 0.18)} ${cx} ${r1(cy - r)}Z" fill="#fff"/>`;
  const e = (cx) => star(r1(cx + gx + 3), r1(ey + gy - 3), 8.5 * k) + `<circle cx="${r1(cx + gx - 4)}" cy="${r1(ey + gy + 5)}" r="${r1(2.6 * k)}" fill="#fff"/>`;
  return e(lx) + e(rx);
}
function shadesSvg(s, lx, rx, ey) {
  const k = clamp(s.shades, 0, 1); if (k < 0.02) return '';
  const y = ey + 12 + s.shadesY - 14 * (1 - k);
  const lens = (cx) => `<rect x="${cx - 28}" y="${r1(y - 16)}" width="56" height="38" rx="16" fill="#1B2A33"/><path d="M${cx - 17} ${r1(y - 8)}l13 -1" stroke="#fff" stroke-opacity=".35" stroke-width="4" stroke-linecap="round"/>`;
  return `<g opacity="${r1(k)}">${lens(lx)}${lens(rx)}<path d="M${lx + 28} ${r1(y - 4)}Q200 ${r1(y - 10)} ${rx - 28} ${r1(y - 4)}" fill="none" stroke="#1B2A33" stroke-width="5"/><path d="M${lx - 25} ${r1(y - 6)}L86 ${r1(y - 12)}M${rx + 25} ${r1(y - 6)}L314 ${r1(y - 12)}" stroke="#1B2A33" stroke-width="5" stroke-linecap="round"/></g>`;
}
function sweatSvg(s) {
  const k = clamp(s.sweat, 0, 1); if (k < 0.02) return '';
  const d = (x, y, sc) => `<path d="M${x} ${r1(y - 15 * sc)}Q${r1(x + 9 * sc)} ${r1(y + 2 * sc)} ${x} ${r1(y + 9 * sc)}Q${r1(x - 9 * sc)} ${r1(y + 2 * sc)} ${x} ${r1(y - 15 * sc)}Z" fill="#9FD6F2" stroke="#6FB1D6" stroke-width="2"/>`;
  return `<g opacity="${r1(k)}">${d(96, r1(150 + 12 * (1 - k)), 1.15)}${d(310, r1(176 + 10 * (1 - k)), 0.95)}</g>`;
}

function browSvg(cx, cy, b, side, P) {
  // lengkung kecil; rot positif = ujung dalam (dekat hidung) naik
  const rot = b.rot * (side === 'L' ? -1 : 1);
  return `<path d="M${cx - 14} ${cy + 3}Q${cx} ${cy - 8} ${cx + 14} ${cy + 3}" fill="none" stroke="${P.ink}" stroke-width="5.5" stroke-linecap="round" transform="translate(0 ${r1(b.y)}) rotate(${r1(rot)} ${cx} ${cy})"/>`;
}

// Mulut: bibir atas dan bawah sama-sama kurva kubik; up/lo = titik tertinggi/terendah. up == lo -> garis
// (senyum atau cemberut), lo > up -> terbuka. Satu rumus untuk semua ekspresi, jadi bisa diinterpolasi.
function mouthSvg(m, P, uid) {
  const w = m.w, up = m.up, lo = m.lo;
  const open = lo - up;
  const k = 1.333, e = 0.92 * w;
  const shape = `M${r1(-w)} 0C${r1(-e)} ${r1(up * k)} ${r1(e)} ${r1(up * k)} ${r1(w)} 0C${r1(e)} ${r1(lo * k)} ${r1(-e)} ${r1(lo * k)} ${r1(-w)} 0Z`;
  const fillOp = clamp((open - 3) / 8, 0, 1);
  const tongueOp = clamp((open - 14) / 12, 0, 1);
  return `<defs><clipPath id="${uid}-mc"><path d="${shape}"/></clipPath></defs>`
    + `<path d="${shape}" fill="${P.mouthIn}" fill-opacity="${r1(fillOp)}" stroke="${P.mouth}" stroke-width="5" stroke-linejoin="round"/>`
    + `<ellipse cx="0" cy="${r1(lo * 1.05)}" rx="${r1(w * 0.6)}" ry="${r1(Math.max(1, open * 0.42))}" fill="${P.tongue}" clip-path="url(#${uid}-mc)" opacity="${r1(tongueOp)}"/>`;
}

/**
 * Gambar Raka sebagai string SVG.
 * @param {object} state keadaan lengkap (lihat NEUTRAL / raka())
 * @param {object} [opts] { uid: id unik bila ada beberapa Raka dalam satu halaman, shadow: false = tanpa bayangan lantai,
 *   background: warna latar atau null, palette: ganti sebagian warna, bare: true = hanya isi gambar tanpa <svg>, width,
 *   logo: false = tanpa patch logo, 'kanan' = patch di dada kanan pemakai (kiri layar); bawaan: dada kiri pemakai }
 */
export function rakaSvg(state, opts = {}) {
  const P = { ...PALETTE, ...(opts.palette || {}) };
  const s = state;
  const uid = opts.uid || 'raka';
  const flip = s.flip > 0.5;
  const yaw = clamp(s.yaw, -1, 1);

  // ---- kepala (koordinat kepala: pusat x = 200, dagu y = 304)
  const faceDx = yaw * 30, faceSq = 1 - 0.14 * Math.abs(yaw);
  const eyeY = 212, eyeLx = 160, eyeRx = 240;
  const blink = clamp(s.blink, 0, 1);
  const eyeRy = lerp(lerp(12, 15.5, s.wide), 1.8, blink);
  const eyeRxx = lerp(10, 11.6, s.wide);
  const gx = s.gazeX * 6, gy = s.gazeY * 4;
  const eye = (cx) => `<ellipse cx="${r1(cx + gx)}" cy="${r1(eyeY + gy)}" rx="${r1(eyeRxx)}" ry="${r1(Math.max(1.8, eyeRy * (1 - s.happyEyes)))}" fill="${P.ink}" opacity="${r1(1 - clamp((s.happyEyes - 0.5) / 0.15, 0, 1))}"/>`
    + `<path d="M${r1(cx + gx - 14)} ${r1(eyeY + 5)}Q${r1(cx + gx)} ${r1(eyeY - 17)} ${r1(cx + gx + 14)} ${r1(eyeY + 5)}" fill="none" stroke="${P.ink}" stroke-width="6" stroke-linecap="round" opacity="${r1(clamp((s.happyEyes - 0.45) / 0.15, 0, 1) * (1 - blink))}"/>`;
  const earL = `<circle cx="${r1(94 + yaw * 9)}" cy="216" r="${r1(22 - Math.max(0, -yaw) * 7)}" fill="${P.skin}"/>`;
  const earR = `<circle cx="${r1(306 + yaw * 9)}" cy="216" r="${r1(22 - Math.max(0, yaw) * 7)}" fill="${P.skin}"/>`;
  const headSkin = `M200 92C270 92 308 138 308 204C308 262 264 304 200 304C136 304 92 262 92 204C92 138 130 92 200 92Z`;
  const hair = `<g transform="translate(${r1(yaw * 13)} 0)" fill="${P.hair}">`
    + `<path d="M92 218C68 176 70 112 124 76C162 52 236 50 278 78C318 104 332 160 314 218C308 198 302 184 296 172C270 176 236 152 214 122C190 154 154 172 116 174C108 188 100 204 92 218Z"/>`
    + `<path d="M98 200C76 202 64 184 78 168C80 180 88 184 102 184Z"/>`
    + `<path d="M214 66C206 34 244 18 266 38C250 32 234 42 238 68Z"/>`
    + `</g>`;
  const face = `<g transform="translate(${r1(200 + faceDx)} 0) scale(${r1(faceSq)} 1) translate(-200 0)">`
    + browSvg(eyeLx, 184, s.browL, 'L', P) + browSvg(eyeRx, 184, s.browR, 'R', P)
    + eye(eyeLx) + eye(eyeRx) + bagsSvg(s, eyeLx, eyeRx, eyeY, P) + sparkleSvg(s, eyeLx, eyeRx, eyeY, gx, gy) + shadesSvg(s, eyeLx, eyeRx, eyeY)
    + `<g transform="translate(200 ${r1(264 + s.gazeY * 1.5)})">${mouthSvg(s.mouth, P, uid)}</g>`
    + `</g>`;
  const burst = s.fxBurst > 0.02
    ? `<g opacity="${r1(s.fxBurst)}" stroke="${P.fxWarm}" stroke-width="6" stroke-linecap="round"><path d="M40 150L64 170M32 206H62M52 104L70 128"/><path d="M360 150L336 170M368 206H338M348 104L330 128"/></g>`
    : '';
  const headG = `<g class="raka-head" transform="translate(200 ${NECK_Y}) rotate(${r1(s.tilt)}) scale(${HEAD_SCALE}) translate(-200 -${HEAD_PIVOT_Y})">`
    + earL + earR + `<path d="${headSkin}" fill="${P.skin}"/>` + face + hair + burst + sweatSvg(s) + `</g>`;

  // ---- badan
  const breath = 1 + s.breath * 0.012;
  const torso = `<g transform="translate(200 580) scale(1 ${r1(breath)}) translate(-200 -580)">`
    + `<path d="M114 452C112 396 150 374 172 372C182 388 218 388 228 372C250 374 288 396 286 452L296 566C250 588 150 588 104 566Z" fill="${P.sweater}"/></g>`;
  const slump = clamp(s.slump, 0, 40);
  const neck = `<rect x="170" y="336" width="60" height="${r1(62 + slump)}" rx="16" fill="${P.skinShade}"/>`;
  const patch = opts.logo === false ? '' : patchSvg(P, s.breath, flip, opts.logo);
  const arms = (front) => ['L', 'R'].map((sd) => {
    const a = sd === 'L' ? s.armL : s.armR;
    return (a.front > 0.5) === front ? armSvg(sd, a, P) : '';
  }).join('');
  const sl = (x) => `<g transform="translate(0 ${r1(slump)})">${x}</g>`;
  const body = `<g class="raka-body" transform="translate(0 ${r1(s.bob)}) rotate(${r1(s.lean)} 200 580)">`
    + sl(arms(false)) + neck + sl(torso + patch) + headG + sl(arms(true)) + `</g>`;

  // ---- kaki (tetap diam)
  const legs = `<path d="M130 566L194 566L190 736L134 736Z" fill="${P.pants}" stroke="${P.pants}" stroke-width="12" stroke-linejoin="round"/>`
    + `<path d="M206 566L270 566L266 736L210 736Z" fill="${P.pants}" stroke="${P.pants}" stroke-width="12" stroke-linejoin="round"/>`
    + `<path d="M88 778C82 750 112 734 152 736L190 738C202 752 200 778 188 778Z" fill="${P.shoes}"/>`
    + `<path d="M312 778C318 750 288 734 248 736L210 738C198 752 200 778 212 778Z" fill="${P.shoes}"/>`;
  const shadow = opts.shadow === false ? '' : `<ellipse cx="200" cy="781" rx="124" ry="9" fill="#10212B" opacity=".13"/>`;

  // tanda kecil di ujung jari (menunjuk)
  const spark = s.fxSpark > 0.02
    ? `<g opacity="${r1(s.fxSpark)}" stroke="${P.fxCool}" stroke-width="6" stroke-linecap="round" transform="translate(0 ${r1(s.bob)})"><path d="M${r1(s.armR.wx - 38)} ${r1(s.armR.wy - 66)}l-6 -16M${r1(s.armR.wx + 2)} ${r1(s.armR.wy - 68)}l10 -14M${r1(s.armR.wx + 26)} ${r1(s.armR.wy - 44)}l14 -9"/></g>`
    : '';

  const bg = opts.background ? `<rect width="${VIEWBOX.w}" height="${VIEWBOX.h}" fill="${opts.background}"/>` : '';
  const inner = `${shadow}${legs}${body}${spark}`;
  const wrapped = flip ? `<g transform="translate(400 0) scale(-1 1)">${inner}</g>` : inner;
  if (opts.bare) return wrapped;
  const size = opts.width ? ` width="${opts.width}"` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEWBOX.w} ${VIEWBOX.h}"${size} role="img" aria-label="Raka">${bg}${wrapped}</svg>`;
}

/**
 * Pasang Raka ke elemen DOM (di Chromium). Mengembalikan { set(state) } yang menggambar ulang
 * satu frame; panggil dari loop render video: raka.set(idle(lerpState(a, b, k), t)).
 */
export function mountRaka(container, opts = {}) {
  return { set(state) { container.innerHTML = rakaSvg(state, opts); } };
}

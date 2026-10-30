// Tokoh pendukung untuk video "Pasien tidak sadar di IGD": dokter, perawat, anak, dan ibu.
// Dibuat dengan konstruksi yang sama dengan Raka (brand/characters/raka/raka.js): kepala besar membulat, bentuk datar tanpa garis tepi,
// canvas 400 x 800 dengan tengah badan x = 200 dan lantai y = 778. Lengan = SATU bentuk meruncing dari bahu ke pergelangan (rantai
// lingkaran), jadi tidak ada sendi. Kaki dan sepatu menempel pada badan di semua frame (celana lurus yang sama dengan Raka kanonik).
// Satu fungsi menggambar semuanya; yang membedakan tokoh hanyalah LOOKS (warna, gaya rambut, pakaian).

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a * (1 - t) + b * t;
const r1 = (n) => Math.round(n * 10) / 10;
export const ease = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };

export const LOOKS = {
  // dokter pria: jas dokter putih di atas scrub biru, stetoskop
  dokterPria: { skin: '#C98F63', skinShade: '#B87B52', hair: '#1B1E2B', style: 'pendek', top: '#2A6FA8', topDark: '#235E91', pants: '#2A6FA8', shoes: '#EEF2F4', coat: true, stetho: true, short: false },
  // dokter perempuan: scrub hijau-teal dan penutup kepala scrub, lengan pendek
  dokterWanita: { skin: '#E0A676', skinShade: '#CC9262', hair: '#2B2A33', style: 'cap', cap: '#2FA39A', top: '#2FA39A', topDark: '#278F87', pants: '#2FA39A', shoes: '#EEF2F4', coat: false, stetho: true, short: true },
  // perawat berhijab: seragam merah muda dengan kerah putih
  perawat: { skin: '#EDB88C', skinShade: '#DDA478', hair: '#2A2230', style: 'hijab', hijab: '#F4EFE6', hijabShade: '#E6DFD1', top: '#E58CA5', topDark: '#D77892', pants: '#F4EFE6', shoes: '#EEF2F4', collar: '#FFFFFF', coat: false, stetho: false, short: true },
  // anak laki-laki sekitar enam tahun: kaus kuning, celana jin, sepatu merah. Skala kecil, kepala lebih besar.
  anak: { skin: '#F0BC92', skinShade: '#E0A77C', hair: '#2A2230', style: 'anak', top: '#F8C038', topDark: '#EDB028', pants: '#4A6FA5', shoes: '#E8665F', coat: false, stetho: false, short: true, scale: 0.6, headScale: 1.5 },
  // ibu berhijab: blus teal tua dan rok panjang (menutupi kaki)
  ibu: { skin: '#E6B088', skinShade: '#D49C74', hair: '#2A2230', style: 'hijab', hijab: '#8F6BA8', hijabShade: '#7E5C96', top: '#B25A6B', topDark: '#A24D5E', pants: '#B25A6B', shoes: '#3B3446', coat: false, stetho: false, short: false, skirt: true },
};

const ARM_DOWN_L = { wx: 86, wy: 556, ex: 88, ey: 488, finger: 0, front: 0 };
const ARM_DOWN_R = { wx: 314, wy: 556, ex: 312, ey: 488, finger: 0, front: 0 };
export const NEUTRAL = {
  yaw: 0, tilt: 0, gazeX: 0, gazeY: 0, blink: 0, wide: 0, happyEyes: 0,
  browL: { y: 0, rot: 0 }, browR: { y: 0, rot: 0 }, mouth: { w: 14, up: 7, lo: 7 },
  lean: 0, bob: 0, breath: 0, flip: 0, headDown: 0,
  armL: { ...ARM_DOWN_L }, armR: { ...ARM_DOWN_R },
};
export const EXPR = {
  netral:  {},
  peduli:  { browL: { y: -6, rot: 12 }, browR: { y: -6, rot: -12 }, mouth: { w: 11, up: 2, lo: 8 } },
  fokus:   { browL: { y: 2, rot: -8 }, browR: { y: 2, rot: 8 }, mouth: { w: 10, up: 2, lo: 2 } },
  tegas:   { browL: { y: 1, rot: -6 }, browR: { y: 1, rot: 6 }, mouth: { w: 12, up: 4, lo: 4 } },
  senyum:  { happyEyes: 0.7, browL: { y: -3, rot: 0 }, browR: { y: -3, rot: 0 }, mouth: { w: 19, up: 6, lo: 12 } },
  tanya:   { wide: 0.4, browL: { y: -10, rot: 9 }, browR: { y: -13, rot: -6 }, mouth: { w: 9, up: 0, lo: 9 } },
  heran:   { wide: 0.7, browL: { y: -12, rot: 8 }, browR: { y: -12, rot: -8 }, mouth: { w: 8, up: -3, lo: 14 } },
  lega:    { happyEyes: 0.8, browL: { y: -4, rot: 2 }, browR: { y: -4, rot: -2 }, mouth: { w: 17, up: 6, lo: 9 } },
  khawatir:{ wide: 0.2, browL: { y: -6, rot: 15 }, browR: { y: -6, rot: -15 }, mouth: { w: 11, up: -3, lo: 0 } },
  bicara:  { mouth: { w: 12, up: 3, lo: 15 } },
};
export const POSE = {
  berdiri: {},
  // tangan di depan perut membawa papan catatan
  catat: { lean: 1, armL: { wx: 196, wy: 500, ex: 90, ey: 540, finger: 0, front: 1 }, armR: { wx: 232, wy: 514, ex: 312, ey: 548, finger: 0, front: 1 } },
  // lengan terjulur ke depan-bawah memeriksa pasien
  periksa: { lean: 3, armL: { wx: 150, wy: 560, ex: 92, ey: 520, finger: 0, front: 1 }, armR: { wx: 262, wy: 566, ex: 316, ey: 520, finger: 0, front: 1 } },
  // satu tangan menjelaskan (telapak terbuka ke samping)
  jelaskan: { lean: 1, armR: { wx: 338, wy: 452, ex: 346, ey: 520, finger: 0, front: 1 } },
  tunjuk: { lean: 1.5, armR: { wx: 354, wy: 366, ex: 342, ey: 424, finger: 1, fa: -72, front: 1 } },
  // tangan di pinggang
  pinggang: { armL: { wx: 128, wy: 530, ex: 62, ey: 480, finger: 0, front: 0 }, armR: { wx: 272, wy: 530, ex: 338, ey: 480, finger: 0, front: 0 } },
  // dua tangan di depan, menyimak
  simak: { armL: { wx: 176, wy: 530, ex: 94, ey: 540, finger: 0, front: 1 }, armR: { wx: 224, wy: 530, ex: 306, ey: 540, finger: 0, front: 1 } },
  // tangan di dada (mohon / terkejut) dan di mulut
  dada: { armL: { wx: 168, wy: 466, ex: 90, ey: 520, finger: 0, front: 1 }, armR: { wx: 232, wy: 466, ex: 310, ey: 520, finger: 0, front: 1 } },
  // dadah / menunjuk ke atas
  angkat: { armR: { wx: 350, wy: 330, ex: 350, ey: 400, finger: 0, front: 1 } },
};

const merge = (...parts) => {
  const out = JSON.parse(JSON.stringify(parts[0]));
  const walk = (d, s) => { for (const k of Object.keys(s)) { if (s[k] && typeof s[k] === 'object') walk(d[k] || (d[k] = {}), s[k]); else d[k] = s[k]; } };
  parts.slice(1).forEach((s) => walk(out, s));
  return out;
};
export function orang(expr = 'netral', pose = 'berdiri', over = {}) {
  if (!EXPR[expr]) throw new Error(`Ekspresi tidak dikenal: ${expr}`);
  if (!POSE[pose]) throw new Error(`Pose tidak dikenal: ${pose}`);
  return merge(NEUTRAL, EXPR[expr], POSE[pose], over);
}
export function lerpOrang(a, b, t) {
  const walk = (x, y) => { if (x && typeof x === 'object') { const o = {}; for (const k of Object.keys(x)) o[k] = walk(x[k], y[k]); return o; } return lerp(x, y, t); };
  return walk(a, b);
}
const blinkAt = (t, period = 3.6, offset = 1.1) => { const x = (((t - offset) % period) + period) % period; return x > 0.16 ? 0 : Math.sin((x / 0.16) * Math.PI); };
export function idleOrang(s, t, off = 0) {
  const o = JSON.parse(JSON.stringify(s));
  o.breath = 0.5 + 0.5 * Math.sin(t * 2.0 + off);
  o.bob += Math.sin(t * 2.0 + off) * 1.0;
  o.tilt += Math.sin(t * 0.8 + off) * 0.6;
  o.blink = Math.max(o.blink, blinkAt(t, 3.6 + (off % 1), 1.1 + off));
  return o;
}

const SHOULDER = { L: [104, 410], R: [296, 410] };
const NECK_Y = 362, HEAD_PIVOT_Y = 306;

// lengan: rantai lingkaran; bagian atas = lengan baju, bagian bawah = kulit bila baju lengan pendek
function armSvg(side, a, L, front) {
  const [sx, sy] = SHOULDER[side];
  const cx = 2 * a.ex - (sx + a.wx) / 2, cy = 2 * a.ey - (sy + a.wy) / 2;
  const N = 36, dots = [];
  for (let i = 0; i <= N; i += 1) { const t = i / N, u = 1 - t; dots.push([u * u * sx + 2 * u * t * cx + t * t * a.wx, u * u * sy + 2 * u * t * cy + t * t * a.wy, lerp(32, 24, ease(t)), t]); }
  const ex = a.wx - cx, ey = a.wy - cy, el = Math.hypot(ex, ey) || 1, dx = ex / el, dy = ey / el;
  const hx = a.wx + dx * 16, hy = a.wy + dy * 16;
  const sleeve = front ? L.topDark : L.top;
  const cut = L.short ? 0.42 : 2;
  const finger = a.finger > 0.02 ? `<rect x="0" y="-9" width="${r1(12 + 50 * a.finger)}" height="18" rx="9" fill="${L.skin}" transform="translate(${r1(hx)} ${r1(hy)}) rotate(${r1(a.fa ?? -90)})"/>` : '';
  return `<g>` + dots.map((p) => `<circle cx="${r1(p[0])}" cy="${r1(p[1])}" r="${r1(p[2])}" fill="${p[3] <= cut ? sleeve : L.skin}"/>`).join('')
    + `<circle cx="${r1(hx)}" cy="${r1(hy)}" r="21" fill="${L.skin}"/>${finger}</g>`;
}

const HEAD_SKIN = 'M200 92C270 92 308 138 308 204C308 262 264 304 200 304C136 304 92 262 92 204C92 138 130 92 200 92Z';

function hairBack(L) {
  if (L.style === 'hijab') return `<path d="M64 214C54 118 116 62 200 62C284 62 346 118 336 214C336 280 360 334 372 396L28 396C40 334 64 280 64 214Z" fill="${L.hijab}"/><path d="M64 230C72 300 52 346 40 396L96 396C92 340 88 290 92 240Z" fill="${L.hijabShade}"/><path d="M336 230C328 300 348 346 360 396L304 396C308 340 312 290 308 240Z" fill="${L.hijabShade}"/>`;
  if (L.style === 'cap') return `<path d="M96 200C86 250 96 280 116 286C112 252 108 226 108 204Z" fill="${L.hair}"/><path d="M304 200C314 250 304 280 284 286C288 252 292 226 292 204Z" fill="${L.hair}"/>`;
  return '';
}
function hairFront(L) {
  switch (L.style) {
    case 'pendek': return `<path d="M94 206C80 140 120 84 200 80C284 84 322 140 306 206C298 172 274 148 244 142C206 136 164 138 134 150C112 160 100 180 94 206Z" fill="${L.hair}"/><path d="M146 116C176 96 232 96 262 120" stroke="#3A4060" stroke-width="5" stroke-linecap="round" fill="none" opacity=".6"/>`;
    case 'cap': return `<path d="M88 204C78 124 136 74 200 74C264 74 322 124 312 204C286 178 244 166 200 166C156 166 114 178 88 204Z" fill="${L.cap}"/><path d="M96 196C128 180 168 172 200 172C232 172 272 180 304 196" stroke="#fff" stroke-opacity=".25" stroke-width="5" fill="none" stroke-linecap="round"/>`;
    case 'hijab': return `<path d="M90 206C92 134 146 98 200 98C254 98 308 134 310 206C292 160 252 128 200 128C148 128 108 160 90 206Z" fill="${L.hijab}"/><path d="M96 190C128 144 168 128 200 128" stroke="${L.hijabShade}" stroke-width="5" fill="none" stroke-linecap="round" opacity=".7"/>`;
    case 'anak': return `<path d="M92 204C78 134 124 84 200 82C276 84 322 134 308 204C300 174 282 156 256 152C232 164 168 164 144 152C118 156 100 174 92 204Z" fill="${L.hair}"/><path d="M204 76C200 50 232 40 248 58C236 54 224 62 226 80Z" fill="${L.hair}"/>`;
    default: return '';
  }
}

function browSvg(cx, cy, b, side, ink) {
  const rot = b.rot * (side === 'L' ? -1 : 1);
  return `<path d="M${cx - 14} ${cy + 3}Q${cx} ${cy - 8} ${cx + 14} ${cy + 3}" fill="none" stroke="${ink}" stroke-width="5.2" stroke-linecap="round" transform="translate(0 ${r1(b.y)}) rotate(${r1(rot)} ${cx} ${cy})"/>`;
}
function mouthSvg(m, uid) {
  const w = m.w, up = m.up, lo = m.lo, open = lo - up, k = 1.333, e = 0.92 * w;
  const shape = `M${r1(-w)} 0C${r1(-e)} ${r1(up * k)} ${r1(e)} ${r1(up * k)} ${r1(w)} 0C${r1(e)} ${r1(lo * k)} ${r1(-e)} ${r1(lo * k)} ${r1(-w)} 0Z`;
  const fillOp = clamp((open - 3) / 8, 0, 1), tongueOp = clamp((open - 14) / 12, 0, 1);
  return `<defs><clipPath id="${uid}-mc"><path d="${shape}"/></clipPath></defs>`
    + `<path d="${shape}" fill="#7A2D2E" fill-opacity="${r1(fillOp)}" stroke="#8B3F37" stroke-width="5" stroke-linejoin="round"/>`
    + `<ellipse cx="0" cy="${r1(lo * 1.05)}" rx="${r1(w * 0.6)}" ry="${r1(Math.max(1, open * 0.42))}" fill="#EE7A7A" clip-path="url(#${uid}-mc)" opacity="${r1(tongueOp)}"/>`;
}

function coatSvg() {
  const W = '#F6F9FA', Sd = '#E3EBEE', LINE = '#C9D5D9';
  return `<path d="M104 566C150 588 250 588 296 566L306 690C250 714 150 714 94 690Z" fill="${W}"/><path d="M200 500V700" stroke="${LINE}" stroke-width="3.5"/><rect x="118" y="610" width="58" height="46" rx="9" fill="none" stroke="${LINE}" stroke-width="3.5"/><rect x="224" y="610" width="58" height="46" rx="9" fill="none" stroke="${LINE}" stroke-width="3.5"/>`
    + `<path d="M172 372L146 424L186 458L200 486L180 384Z" fill="${Sd}"/><path d="M228 372L254 424L214 458L200 486L220 384Z" fill="${Sd}"/>`
    + `<path d="M172 372L156 398L184 408Z" fill="${W}"/><path d="M228 372L244 398L216 408Z" fill="${W}"/>`;
}
function stethoSvg() {
  return `<path d="M170 386C150 470 250 470 230 386" fill="none" stroke="#2B3A44" stroke-width="7" stroke-linecap="round"/><circle cx="200" cy="474" r="11" fill="#B7C6CC"/><circle cx="200" cy="474" r="5" fill="#8FA6A9"/>`;
}

/**
 * Gambar satu tokoh. look = LOOKS.xxx, state = orang(...), opts = { uid, shadow, legs (false = tanpa kaki, mis. duduk di balik perabot), bare }.
 */
export function orangSvg(s, look, opts = {}) {
  const L = look, uid = opts.uid || 'orang';
  const flip = s.flip > 0.5, yaw = clamp(s.yaw, -1, 1);
  const headScale = L.headScale || 1.2, sc = L.scale || 1;
  const faceDx = yaw * 30, faceSq = 1 - 0.14 * Math.abs(yaw);
  const eyeY = 212, eyeLx = 160, eyeRx = 240, ink = '#212739';
  const blink = clamp(s.blink, 0, 1);
  const eyeRy = lerp(lerp(12, 15.5, s.wide), 1.8, blink), eyeRxx = lerp(10, 11.6, s.wide);
  const gx = s.gazeX * 6, gy = s.gazeY * 4;
  const eye = (cx) => `<ellipse cx="${r1(cx + gx)}" cy="${r1(eyeY + gy)}" rx="${r1(eyeRxx)}" ry="${r1(Math.max(1.8, eyeRy * (1 - s.happyEyes)))}" fill="${ink}" opacity="${r1(1 - clamp((s.happyEyes - 0.5) / 0.15, 0, 1))}"/>`
    + `<path d="M${r1(cx + gx - 14)} ${r1(eyeY + 5)}Q${r1(cx + gx)} ${r1(eyeY - 17)} ${r1(cx + gx + 14)} ${r1(eyeY + 5)}" fill="none" stroke="${ink}" stroke-width="6" stroke-linecap="round" opacity="${r1(clamp((s.happyEyes - 0.45) / 0.15, 0, 1) * (1 - blink))}"/>`;
  const earL = L.style === 'hijab' ? '' : `<circle cx="${r1(94 + yaw * 9)}" cy="216" r="${r1(22 - Math.max(0, -yaw) * 7)}" fill="${L.skin}"/>`;
  const earR = L.style === 'hijab' ? '' : `<circle cx="${r1(306 + yaw * 9)}" cy="216" r="${r1(22 - Math.max(0, yaw) * 7)}" fill="${L.skin}"/>`;
  const blush = `<ellipse cx="128" cy="246" rx="18" ry="10" fill="#E98B7A" opacity=".28"/><ellipse cx="272" cy="246" rx="18" ry="10" fill="#E98B7A" opacity=".28"/>`;
  const face = `<g transform="translate(${r1(200 + faceDx)} 0) scale(${r1(faceSq)} 1) translate(-200 0)">${blush}`
    + browSvg(eyeLx, 184, s.browL, 'L', ink) + browSvg(eyeRx, 184, s.browR, 'R', ink) + eye(eyeLx) + eye(eyeRx)
    + `<g transform="translate(200 ${r1(264 + s.gazeY * 1.5)})">${mouthSvg(s.mouth, uid)}</g></g>`;
  const hs = (extra) => `translate(${r1(yaw * extra)} 0)`;
  const headG = `<g transform="translate(200 ${NECK_Y}) rotate(${r1(s.tilt + s.headDown)}) scale(${headScale}) translate(-200 -${HEAD_PIVOT_Y})">`
    + `<g transform="${hs(8)}">${hairBack(L)}</g>` + earL + earR + `<path d="${HEAD_SKIN}" fill="${L.skin}"/>` + face + `<g transform="${hs(12)}">${hairFront(L)}</g></g>`;

  const breath = 1 + s.breath * 0.012;
  const torso = `<g transform="translate(200 580) scale(1 ${r1(breath)}) translate(-200 -580)">`
    + `<path d="M114 452C112 396 150 374 172 372C182 388 218 388 228 372C250 374 288 396 286 452L296 566C250 588 150 588 104 566Z" fill="${L.top}"/>`
    + (L.coat ? coatSvg() : '')
    + (!L.coat && L.collar ? `<path d="M168 376Q200 420 232 376Q224 366 200 372Q176 366 168 376Z" fill="${L.collar}"/>` : '')
    + (!L.coat && !L.collar ? `<path d="M176 376L200 426L224 376Q200 392 176 376Z" fill="${L.skinShade}"/><rect x="222" y="470" width="40" height="34" rx="7" fill="${L.topDark}"/>` : '')
    + (L.stetho ? stethoSvg() : '') + `</g>`;
  const neck = `<rect x="170" y="336" width="60" height="62" rx="16" fill="${L.hijab ? L.skin : L.skinShade}"/>`;
  const arms = (front) => ['L', 'R'].map((sd) => { const a = sd === 'L' ? s.armL : s.armR; return (a.front > 0.5) === front ? armSvg(sd, a, L, front) : ''; }).join('');
  // opts.parts: 'all' (bawaan), 'body' (tanpa lengan) atau 'arms' (hanya lengan): dipakai untuk menaruh lengan di depan pasien dan badan di belakangnya
  const parts = opts.parts || 'all';
  const tr = `translate(0 ${r1(s.bob)}) rotate(${r1(s.lean)} 200 580)`;
  const body = parts === 'arms' ? `<g transform="${tr}">${arms(false)}${arms(true)}</g>`
    : `<g transform="${tr}">${parts === 'all' ? arms(false) : ''}${neck}${torso}${headG}${parts === 'all' ? arms(true) : ''}</g>`;

  let legs = '';
  if (opts.legs !== false && parts !== 'arms') {
    if (L.skirt) legs = `<path d="M104 566C150 588 250 588 296 566L330 760C250 784 150 784 70 760Z" fill="${L.pants}"/><path d="M110 744C160 760 240 760 290 744" stroke="${L.topDark}" stroke-width="6" fill="none" stroke-linecap="round" opacity=".7"/><path d="M130 770C128 752 150 744 172 746L196 748C204 760 202 776 192 778L136 778Z" fill="${L.shoes}"/><path d="M270 770C272 752 250 744 228 746L204 748C196 760 198 776 208 778L264 778Z" fill="${L.shoes}"/>`;
    else legs = `<path d="M130 566L194 566L190 736L134 736Z" fill="${L.pants}" stroke="${L.pants}" stroke-width="12" stroke-linejoin="round"/><path d="M206 566L270 566L266 736L210 736Z" fill="${L.pants}" stroke="${L.pants}" stroke-width="12" stroke-linejoin="round"/>`
      + `<path d="M88 778C82 750 112 734 152 736L190 738C202 752 200 778 188 778Z" fill="${L.shoes}"/><path d="M312 778C318 750 288 734 248 736L210 738C198 752 200 778 212 778Z" fill="${L.shoes}"/>`;
  }
  const shadow = (opts.shadow === false || parts === 'arms') ? '' : `<ellipse cx="200" cy="781" rx="124" ry="9" fill="#10212B" opacity=".13"/>`;
  const inner = `${shadow}${legs}${body}`;
  const wrapped = flip ? `<g transform="translate(400 0) scale(-1 1)">${inner}</g>` : inner;
  if (opts.bare) return sc === 1 ? wrapped : `<g transform="translate(200 778) scale(${sc}) translate(-200 -778)">${wrapped}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 800" role="img" aria-label="Tokoh">${sc === 1 ? wrapped : `<g transform="translate(200 778) scale(${sc}) translate(-200 -778)">${wrapped}</g>`}</svg>`;
}

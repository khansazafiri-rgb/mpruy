// Grelin: tokoh kecil pembawa pesan "hormon lapar" (ghrelin) untuk seri video MEDCOEL.
// Satu fungsi grelinSvg(state) menggambar tokoh dari angka. Tanpa dependensi, jalan di Node dan Chromium.
// Gaya sama dengan Raka: datar, tanpa garis tepi, lengan dan kaki satu bentuk yang menyatu dengan badan.
// Bukan fitur web: aset video. Penjelasan medis di video tetap mengikuti naskah (ghrelin membantu mengirim sinyal lapar ke otak).
export const VIEWBOX = { w: 200, h: 260 };
export const FLOOR_Y = 250;
export const PALETTE = {
  body: '#F28C38', bodyShade: '#E27623', hi: '#FFC27A', cheek: '#F8A8A0', ink: '#2A1D22', mouthIn: '#7A2D2E', tongue: '#EE7A7A',
  shoe: '#8A4A1E', paper: '#FFF9EA', paperEdge: '#D9C8A3', bolt: '#F8C038', drop: '#9FD6F2',
};
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const r1 = (n) => Math.round(n * 10) / 10;
export const ease = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };

export const NEUTRAL = {
  tilt: 0, bob: 0, squash: 0, blink: 0, happyEyes: 0, wide: 0, gazeX: 0, gazeY: 0,
  brow: { y: 0, rot: 0 }, mouth: { w: 12, up: 4, lo: 4 }, blush: 1, drool: 0,
  armL: { hx: 22, hy: 150, kx: 28, ky: 176 },   // tangan kiri layar: titik tangan dan lengkung siku
  armR: { hx: 178, hy: 150, kx: 172, ky: 176 },
  legs: { dxL: 0, dxR: 0, liftL: 0, liftR: 0 }, // geser dan angkat kaki (jalan)
  hold: 0,   // 1 = memegang surat sinyal (amplop)
  spark: 0,  // kilat kecil di atas kepala
  flip: 0,
};
export const EXPRESSIONS = {
  netral:   {},
  // lapar: mata lebar berharap, mulut terbuka, setetes liur
  lapar:    { wide: 0.8, brow: { y: -6, rot: 10 }, mouth: { w: 13, up: 2, lo: 16 }, drool: 1 },
  // semangat: mata melengkung gembira, senyum lebar
  semangat: { happyEyes: 1, brow: { y: -5, rot: 0 }, mouth: { w: 20, up: 6, lo: 20 } },
  // kenyang: mata setengah terpejam puas, senyum kecil, pipi merah
  kenyang:  { blink: 0.6, brow: { y: 2, rot: -4 }, mouth: { w: 12, up: 8, lo: 8 }, blush: 1.5 },
  // bingung: satu alis naik, mulut kecil bergelombang
  bingung:  { wide: 0.2, brow: { y: -8, rot: 14 }, mouth: { w: 9, up: 0, lo: 4 } },
  // serius: dipakai saat mengantar sinyal
  serius:   { brow: { y: 4, rot: -10 }, mouth: { w: 10, up: 2, lo: 2 } },
};
export const POSES = {
  berdiri: {},
  // memegang surat sinyal dengan dua tangan di depan badan
  kirim_sinyal: { hold: 1, armL: { hx: 70, hy: 168, kx: 28, ky: 170 }, armR: { hx: 130, hy: 168, kx: 172, ky: 170 }, spark: 1 },
  // angkat satu tangan menyapa
  sapa: { armR: { hx: 186, hy: 96, kx: 178, ky: 130 } },
  // dua tangan memegang perut (kenyang atau lapar)
  pegang_perut: { armL: { hx: 82, hy: 170, kx: 30, ky: 168 }, armR: { hx: 118, hy: 170, kx: 170, ky: 168 } },
  // dua tangan terangkat gembira
  hore: { armL: { hx: 18, hy: 78, kx: 26, ky: 122 }, armR: { hx: 182, hy: 78, kx: 174, ky: 122 } },
};
export function grelin(expression = 'netral', pose = 'berdiri', overrides = {}) {
  const e = EXPRESSIONS[expression]; if (!e) throw new Error(`Ekspresi Grelin tidak dikenal: ${expression}. Pilihan: ${Object.keys(EXPRESSIONS).join(', ')}`);
  const p = POSES[pose]; if (!p) throw new Error(`Pose Grelin tidak dikenal: ${pose}. Pilihan: ${Object.keys(POSES).join(', ')}`);
  const merge = (...parts) => { const out = JSON.parse(JSON.stringify(parts[0])); const walk = (d, s) => { for (const k of Object.keys(s)) { if (s[k] && typeof s[k] === 'object') walk(d[k] || (d[k] = {}), s[k]); else d[k] = s[k]; } }; parts.slice(1).forEach((s) => walk(out, s)); return out; };
  return merge(NEUTRAL, e, p, overrides);
}
export function lerpState(a, b, t) { const w = (x, y) => (x && typeof x === 'object' ? Object.fromEntries(Object.keys(x).map((k) => [k, w(x[k], y[k])])) : lerp(x, y, t)); return w(a, b); }
export function idle(state, t) { const s = JSON.parse(JSON.stringify(state)); s.bob += Math.sin(t * 3) * 2; s.squash += Math.sin(t * 3) * 0.015; s.tilt += Math.sin(t * 1.3) * 1.2; const p = ((t - 0.7) % 3.1 + 3.1) % 3.1; if (p < 0.14) s.blink = Math.max(s.blink, Math.sin(p / 0.14 * Math.PI)); return s; }

const BODY = 'M100 34C128 34 152 68 157 114C162 162 134 206 100 206C66 206 38 162 43 114C48 68 72 34 100 34Z';
// bentuk lengan: dari bahu (SHOULDER) ke tangan lewat lengkung siku; tangan = lingkaran di ujung (menyatu karena satu warna dan garis tebal)
const SHOULDER = { L: [50, 142], R: [150, 142] };
export function armShape(side, a) { const [sx, sy] = SHOULDER[side]; return { start: [sx, sy], ctrl: [a.kx, a.ky], hand: [a.hx, a.hy] }; }
export function legShape(side, s) {
  const x0 = side === 'L' ? 80 : 120, lift = side === 'L' ? s.legs.liftL : s.legs.liftR, dx = side === 'L' ? s.legs.dxL : s.legs.dxR;
  return { start: [x0, 196], foot: [x0 + dx + (side === 'L' ? -4 : 4), FLOOR_Y - 8 - lift] };
}
function mouthSvg(m, P) {
  const w = m.w, up = m.up, lo = m.lo, k = 1.333, e = 0.92 * w, open = lo - up;
  const shape = `M${r1(-w)} 0C${r1(-e)} ${r1(up * k)} ${r1(e)} ${r1(up * k)} ${r1(w)} 0C${r1(e)} ${r1(lo * k)} ${r1(-e)} ${r1(lo * k)} ${r1(-w)} 0Z`;
  return `<path d="${shape}" fill="${P.mouthIn}" fill-opacity="${r1(clamp((open - 3) / 8, 0, 1))}" stroke="${P.ink}" stroke-width="4.4" stroke-linejoin="round"/>`
    + (open > 12 ? `<ellipse cx="0" cy="${r1(lo * 1.0)}" rx="${r1(w * 0.55)}" ry="${r1(Math.max(1, open * 0.34))}" fill="${P.tongue}" opacity="${r1(clamp((open - 12) / 10, 0, 1))}"/>` : '');
}
/**
 * Gambar Grelin sebagai string SVG.
 * @param {object} state keadaan lengkap (lihat NEUTRAL / grelin())
 * @param {object} [opts] { uid, shadow: false = tanpa bayangan lantai, bare: true = hanya isi gambar tanpa <svg>, palette: ganti sebagian warna, width }
 */
export function grelinSvg(state, opts = {}) {
  const P = { ...PALETTE, ...(opts.palette || {}) }, s = state, uid = opts.uid || 'grelin';
  const sq = 1 + s.squash, blink = clamp(s.blink, 0, 1);
  const eyeRy = lerp(lerp(8.5, 11, s.wide), 1.6, blink), gx = s.gazeX * 4, gy = s.gazeY * 3;
  const eye = (cx) => `<ellipse cx="${r1(cx + gx)}" cy="${r1(116 + gy)}" rx="${r1(lerp(7, 8.2, s.wide))}" ry="${r1(Math.max(1.6, eyeRy * (1 - s.happyEyes)))}" fill="${P.ink}" opacity="${r1(1 - clamp((s.happyEyes - 0.5) / 0.15, 0, 1))}"/>`
    + `<path d="M${r1(cx + gx - 10)} 121Q${r1(cx + gx)} 103 ${r1(cx + gx + 10)} 121" fill="none" stroke="${P.ink}" stroke-width="5" stroke-linecap="round" opacity="${r1(clamp((s.happyEyes - 0.5) / 0.15, 0, 1))}"/>`;
  const brow = (cx, side) => `<path d="M${cx - 10} 100Q${cx} 94 ${cx + 10} 100" fill="none" stroke="${P.ink}" stroke-width="4.4" stroke-linecap="round" transform="translate(0 ${r1(s.brow.y * 0.6)}) rotate(${r1(s.brow.rot * (side === 'L' ? -1 : 1))} ${cx} 100)"/>`;
  const arm = (side) => {
    const a = armShape(side, side === 'L' ? s.armL : s.armR);
    return `<path d="M${a.start[0]} ${a.start[1]}Q${a.ctrl[0]} ${a.ctrl[1]} ${a.hand[0]} ${a.hand[1]}" fill="none" stroke="${P.body}" stroke-width="15" stroke-linecap="round"/><circle cx="${a.hand[0]}" cy="${a.hand[1]}" r="11" fill="${P.hi}"/>`;
  };
  const leg = (side) => {
    const l = legShape(side, s), sg = side === 'L' ? -1 : 1;
    return `<path d="M${l.start[0]} ${l.start[1]}L${r1((l.start[0] + l.foot[0]) / 2)} ${r1((l.start[1] + l.foot[1]) / 2)}L${l.foot[0]} ${l.foot[1]}" fill="none" stroke="${P.bodyShade}" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/><ellipse cx="${r1(l.foot[0] + sg * 5)}" cy="${r1(l.foot[1] + 8)}" rx="19" ry="9" fill="${P.shoe}"/>`;
  };
  const envelope = s.hold > 0.5 ? `<g transform="translate(100 168)"><rect x="-28" y="-18" width="56" height="38" rx="6" fill="${P.paper}"/><path d="M-28 -16L0 8L28 -16" fill="none" stroke="${P.paperEdge}" stroke-width="4" stroke-linejoin="round"/><path d="M4 -6L-6 6h8l-4 10L10 2H2Z" fill="${P.bolt}" transform="translate(0 4) scale(.8)"/></g>` : '';
  const spark = s.spark > 0.02 ? `<g opacity="${r1(s.spark)}" stroke="${P.bolt}" stroke-width="6" stroke-linecap="round"><path d="M56 24l-12-10M144 24l12-10M100 14V0"/></g>` : '';
  const drool = s.drool > 0.02 ? `<path d="M${r1(104 + 2)} 142Q112 154 106 164Q100 154 104 142Z" fill="${P.drop}" opacity="${r1(s.drool)}"/>` : '';
  const body = `<g transform="translate(100 ${FLOOR_Y - 44 + s.bob}) rotate(${r1(s.tilt)}) scale(1 ${r1(sq)}) translate(-100 ${-(FLOOR_Y - 44)})">`
    + arm('L') + `<path d="${BODY}" fill="${P.body}"/><path d="M60 170C66 192 84 204 100 204C124 204 146 188 152 150C140 176 120 190 96 190C80 190 66 184 60 170Z" fill="${P.bodyShade}" opacity=".55"/><ellipse cx="70" cy="86" rx="14" ry="22" fill="${P.hi}" opacity=".55" transform="rotate(18 70 86)"/>`
    + `<path d="M104 36C100 22 112 12 126 18C116 18 110 26 112 36Z" fill="${P.bodyShade}"/>`
    + `<ellipse cx="66" cy="136" rx="14" ry="8" fill="${P.cheek}" opacity="${r1(0.45 * s.blush)}"/><ellipse cx="134" cy="136" rx="14" ry="8" fill="${P.cheek}" opacity="${r1(0.45 * s.blush)}"/>`
    + brow(78, 'L') + brow(122, 'R') + eye(78) + eye(122) + `<g transform="translate(100 ${r1(142 + s.gazeY)})">${mouthSvg(s.mouth, P)}</g>` + drool + spark
    + arm('R') + envelope + `</g>`;
  const shadow = opts.shadow === false ? '' : `<ellipse cx="100" cy="${FLOOR_Y + 4}" rx="62" ry="7" fill="#10212B" opacity=".13"/>`;
  const inner = `${shadow}${leg('L')}${leg('R')}${body}`;
  const wrapped = s.flip > 0.5 ? `<g transform="translate(200 0) scale(-1 1)">${inner}</g>` : inner;
  if (opts.bare) return wrapped;
  const size = opts.width ? ` width="${opts.width}"` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEWBOX.w} ${VIEWBOX.h}"${size} role="img" aria-label="Grelin">${wrapped}</svg>`;
}

// Jambi ("jam biologis"): tokoh jam bundar untuk seri video MEDCOEL. Menjelaskan irama tubuh sepanjang hari.
// Cincin jam setengah kuning (siang) dan setengah indigo (malam); kaki dan lengan satu bentuk yang menyatu dengan badan.
// Satu fungsi jambiSvg(state) menggambar dari angka. Tanpa dependensi, jalan di Node dan Chromium. Bukan fitur web: aset video.
export const VIEWBOX = { w: 220, h: 280 };
export const FLOOR_Y = 270;
export const PALETTE = {
  day: '#F8C038', night: '#3B4A8C', dial: '#FFF9EA', tick: '#B7C6CC', ink: '#2A1D22', hand: '#172B38', minute: '#E8665F', bell: '#C98F00',
  limb: '#3B4A8C', shoe: '#232C5A', cheek: '#F8A8A0', mouthIn: '#7A2D2E', tongue: '#EE7A7A', zz: '#8E7CE8',
};
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const r1 = (n) => Math.round(n * 10) / 10;
export const ease = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
export const NEUTRAL = {
  jam: 20.0,          // waktu 0..24 yang ditunjuk jarum (20,0 = pukul 8 malam)
  tilt: 0, bob: 0, shake: 0, blink: 0, happyEyes: 0, wide: 0, gazeX: 0, gazeY: 0, brow: { y: 0, rot: 0 }, mouth: { w: 12, up: 4, lo: 4 }, blush: 1,
  armL: { hx: 18, hy: 168, kx: 26, ky: 190 }, armR: { hx: 202, hy: 168, kx: 194, ky: 190 },
  legs: { dxL: 0, dxR: 0, liftL: 0, liftR: 0 },
  zzz: 0,   // huruf Z melayang (mengantuk)
  ring: 1,  // 1 = cincin siang/malam tampil
  flip: 0,
};
export const EXPRESSIONS = {
  netral:   {},
  semangat: { happyEyes: 1, mouth: { w: 18, up: 5, lo: 18 }, brow: { y: -5, rot: 0 } },
  ngantuk:  { blink: 0.65, brow: { y: 3, rot: 6 }, mouth: { w: 9, up: 2, lo: 12 }, zzz: 1 },
  bingung:  { wide: 0.2, brow: { y: -8, rot: 13 }, mouth: { w: 9, up: 0, lo: 4 } },
  kaget:    { wide: 1, brow: { y: -9, rot: 6 }, mouth: { w: 8, up: -4, lo: 22 } },
};
export const POSES = {
  berdiri: {},
  sapa: { armR: { hx: 208, hy: 112, kx: 202, ky: 146 } },
  menunjuk: { armL: { hx: 8, hy: 120, kx: 14, ky: 152 } },
  hore: { armL: { hx: 12, hy: 100, kx: 20, ky: 146 }, armR: { hx: 208, hy: 100, kx: 200, ky: 146 } },
  // dua tangan menggenggam di depan (menunggu)
  pegang: { armL: { hx: 88, hy: 196, kx: 30, ky: 192 }, armR: { hx: 132, hy: 196, kx: 190, ky: 192 } },
};
export function jambi(expression = 'netral', pose = 'berdiri', overrides = {}) {
  const e = EXPRESSIONS[expression]; if (!e) throw new Error(`Ekspresi Jambi tidak dikenal: ${expression}. Pilihan: ${Object.keys(EXPRESSIONS).join(', ')}`);
  const p = POSES[pose]; if (!p) throw new Error(`Pose Jambi tidak dikenal: ${pose}. Pilihan: ${Object.keys(POSES).join(', ')}`);
  const merge = (...parts) => { const out = JSON.parse(JSON.stringify(parts[0])); const walk = (d, s) => { for (const k of Object.keys(s)) { if (s[k] && typeof s[k] === 'object') walk(d[k] || (d[k] = {}), s[k]); else d[k] = s[k]; } }; parts.slice(1).forEach((s) => walk(out, s)); return out; };
  return merge(NEUTRAL, e, p, overrides);
}
export function lerpState(a, b, t) { const w = (x, y) => (x && typeof x === 'object' ? Object.fromEntries(Object.keys(x).map((k) => [k, w(x[k], y[k])])) : lerp(x, y, t)); return w(a, b); }
export function idle(state, t) { const s = JSON.parse(JSON.stringify(state)); s.bob += Math.sin(t * 2.6) * 2; s.tilt += Math.sin(t * 1.2) * 1.5; const p = ((t - 1.1) % 3.3 + 3.3) % 3.3; if (p < 0.14) s.blink = Math.max(s.blink, Math.sin(p / 0.14 * Math.PI)); return s; }
const CENTER = [110, 128], R_OUT = 86, R_DIAL = 70;
const SHOULDER = { L: [30, 150], R: [190, 150] };
export function armShape(side, a) { const [sx, sy] = SHOULDER[side]; return { start: [sx, sy], ctrl: [a.kx, a.ky], hand: [a.hx, a.hy] }; }
export function legShape(side, s) {
  const x0 = side === 'L' ? 84 : 136, lift = side === 'L' ? s.legs.liftL : s.legs.liftR, dx = side === 'L' ? s.legs.dxL : s.legs.dxR;
  return { start: [x0, 206], foot: [x0 + dx + (side === 'L' ? -4 : 4), FLOOR_Y - 8 - lift] };
}
function mouthSvg(m, P) {
  const w = m.w, up = m.up, lo = m.lo, k = 1.333, e = 0.92 * w, open = lo - up;
  const shape = `M${r1(-w)} 0C${r1(-e)} ${r1(up * k)} ${r1(e)} ${r1(up * k)} ${r1(w)} 0C${r1(e)} ${r1(lo * k)} ${r1(-e)} ${r1(lo * k)} ${r1(-w)} 0Z`;
  return `<path d="${shape}" fill="${P.mouthIn}" fill-opacity="${r1(clamp((open - 3) / 8, 0, 1))}" stroke="${P.ink}" stroke-width="4.4" stroke-linejoin="round"/>`
    + (open > 12 ? `<ellipse cx="0" cy="${r1(lo)}" rx="${r1(w * 0.55)}" ry="${r1(Math.max(1, open * 0.34))}" fill="${P.tongue}" opacity="${r1(clamp((open - 12) / 10, 0, 1))}"/>` : '');
}
/**
 * Gambar Jambi sebagai string SVG.
 * @param {object} state keadaan lengkap (lihat NEUTRAL / jambi())
 * @param {object} [opts] { uid, shadow: false, bare: true, palette, width }
 */
export function jambiSvg(state, opts = {}) {
  const P = { ...PALETTE, ...(opts.palette || {}) }, s = state, [cx, cy] = CENTER;
  const hh = (((s.jam % 12) + 12) % 12) / 12 * 360, mm = ((s.jam % 1) + 1) % 1 * 360;
  const hand = (len, w, ang, col) => `<line x1="${cx}" y1="${cy}" x2="${r1(cx + Math.sin(ang * Math.PI / 180) * len)}" y2="${r1(cy - Math.cos(ang * Math.PI / 180) * len)}" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>`;
  const ticks = Array.from({ length: 12 }, (_, i) => { const a = i * 30 * Math.PI / 180, r0 = R_DIAL - 10, r2 = R_DIAL - (i % 3 === 0 ? 20 : 15); return `<line x1="${r1(cx + Math.sin(a) * r0)}" y1="${r1(cy - Math.cos(a) * r0)}" x2="${r1(cx + Math.sin(a) * r2)}" y2="${r1(cy - Math.cos(a) * r2)}" stroke="${P.tick}" stroke-width="${i % 3 === 0 ? 5 : 3.5}" stroke-linecap="round"/>`; }).join('');
  const blink = clamp(s.blink, 0, 1), eyeRy = lerp(lerp(9, 11.5, s.wide), 1.6, blink), gx = s.gazeX * 4, gy = s.gazeY * 3;
  const eye = (x) => `<ellipse cx="${r1(x + gx)}" cy="${r1(112 + gy)}" rx="7.2" ry="${r1(Math.max(1.6, eyeRy * (1 - s.happyEyes)))}" fill="${P.ink}" opacity="${r1(1 - clamp((s.happyEyes - 0.5) / 0.15, 0, 1))}"/>`
    + `<path d="M${r1(x + gx - 10)} 117Q${r1(x + gx)} 99 ${r1(x + gx + 10)} 117" fill="none" stroke="${P.ink}" stroke-width="5" stroke-linecap="round" opacity="${r1(clamp((s.happyEyes - 0.5) / 0.15, 0, 1))}"/>`;
  const brow = (x, side) => `<path d="M${x - 10} 94Q${x} 88 ${x + 10} 94" fill="none" stroke="${P.ink}" stroke-width="4.4" stroke-linecap="round" transform="translate(0 ${r1(s.brow.y * 0.6)}) rotate(${r1(s.brow.rot * (side === 'L' ? -1 : 1))} ${x} 94)"/>`;
  const arm = (side) => { const a = armShape(side, side === 'L' ? s.armL : s.armR); return `<path d="M${a.start[0]} ${a.start[1]}Q${a.ctrl[0]} ${a.ctrl[1]} ${a.hand[0]} ${a.hand[1]}" fill="none" stroke="${P.limb}" stroke-width="15" stroke-linecap="round"/><circle cx="${a.hand[0]}" cy="${a.hand[1]}" r="11" fill="${P.dial}"/>`; };
  const leg = (side) => { const l = legShape(side, s), sg = side === 'L' ? -1 : 1; return `<path d="M${l.start[0]} ${l.start[1]}L${r1((l.start[0] + l.foot[0]) / 2)} ${r1((l.start[1] + l.foot[1]) / 2)}L${l.foot[0]} ${l.foot[1]}" fill="none" stroke="${P.limb}" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/><ellipse cx="${r1(l.foot[0] + sg * 5)}" cy="${r1(l.foot[1] + 8)}" rx="20" ry="9" fill="${P.shoe}"/>`; };
  const ring = `<path d="M${cx - R_OUT} ${cy}A${R_OUT} ${R_OUT} 0 0 1 ${cx + R_OUT} ${cy}" fill="none" stroke="${P.day}" stroke-width="16"/><path d="M${cx - R_OUT} ${cy}A${R_OUT} ${R_OUT} 0 0 0 ${cx + R_OUT} ${cy}" fill="none" stroke="${P.night}" stroke-width="16"/>`;
  const sun = `<circle cx="${cx}" cy="${cy - R_OUT}" r="9" fill="#fff" opacity=".9"/><path d="M${cx - 5} ${cy + R_OUT - 2}a8 8 0 1 0 8 8a6 6 0 1 1 -8 -8z" fill="#fff" opacity=".9"/>`;
  const bells = `<circle cx="64" cy="50" r="22" fill="${P.bell}"/><circle cx="156" cy="50" r="22" fill="${P.bell}"/><path d="M110 40L110 22" stroke="${P.bell}" stroke-width="8" stroke-linecap="round"/><circle cx="110" cy="20" r="8" fill="${P.bell}"/>`;
  const zzz = s.zzz > 0.02 ? `<g opacity="${r1(s.zzz)}" fill="${P.zz}" font-family="Plus Jakarta Sans" font-weight="800">${['Z|164|52|30', 'z|182|32|22', 'z|196|16|16'].map((q) => { const [c, x, y, f] = q.split('|'); return `<text x="${x}" y="${y}" font-size="${f}">${c}</text>`; }).join('')}</g>` : '';
  const body = `<g transform="translate(${cx} ${FLOOR_Y - 60 + s.bob}) rotate(${r1(s.tilt + s.shake)}) translate(${-cx} ${-(FLOOR_Y - 60)})">`
    + arm('L') + bells + `<circle cx="${cx}" cy="${cy}" r="${R_OUT + 8}" fill="${P.limb}" opacity=".18" transform="translate(0 6)"/>`
    + (s.ring > 0.5 ? ring : `<circle cx="${cx}" cy="${cy}" r="${R_OUT}" fill="none" stroke="${P.night}" stroke-width="16"/>`)
    + `<circle cx="${cx}" cy="${cy}" r="${R_DIAL + 4}" fill="${P.dial}"/>` + (s.ring > 0.5 ? sun : '') + ticks
    + hand(R_DIAL - 28, 8, hh + mm / 12, P.hand) + hand(R_DIAL - 12, 5, mm, P.minute) + `<circle cx="${cx}" cy="${cy}" r="6" fill="${P.hand}"/>`
    + `<ellipse cx="${cx - 40}" cy="136" rx="12" ry="7" fill="${P.cheek}" opacity="${r1(0.45 * s.blush)}"/><ellipse cx="${cx + 40}" cy="136" rx="12" ry="7" fill="${P.cheek}" opacity="${r1(0.45 * s.blush)}"/>`
    + brow(cx - 26, 'L') + brow(cx + 26, 'R') + eye(cx - 26) + eye(cx + 26) + `<g transform="translate(${cx} ${r1(150 + s.gazeY)})">${mouthSvg(s.mouth, P)}</g>`
    + arm('R') + zzz + `</g>`;
  const shadow = opts.shadow === false ? '' : `<ellipse cx="${cx}" cy="${FLOOR_Y + 4}" rx="70" ry="7" fill="#10212B" opacity=".13"/>`;
  const inner = `${shadow}${leg('L')}${leg('R')}${body}`;
  const wrapped = s.flip > 0.5 ? `<g transform="translate(220 0) scale(-1 1)">${inner}</g>` : inner;
  if (opts.bare) return wrapped;
  const size = opts.width ? ` width="${opts.width}"` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEWBOX.w} ${VIEWBOX.h}"${size} role="img" aria-label="Jambi">${wrapped}</svg>`;
}

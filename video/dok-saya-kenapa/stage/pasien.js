// Pasien (Bu): perempuan dewasa, sopan dan tenang. Karakter 2D baru untuk video "Dok, saya kenapa?". Dibuat dari kerangka teman.js.
// Gaya mengikuti Raka: kepala besar membulat, bentuk datar, tanpa garis tepi, satu viewBox 400 x 800, tengah badan x = 200.
// Beda: rambut bob cokelat tua dengan poni miring dan jepit emas kecil, hoodie lilac (warna lain dari sweater teal Raka),
// semburat pipi, kelopak setengah turun, dan senyum miring yang jahil. Lengan = satu bentuk meruncing seperti Raka.

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a * (1 - t) + b * t;
const r1 = (n) => Math.round(n * 10) / 10;
const ease = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };

export const TP = {
  skin: '#D9A074', skinShade: '#C78D63', hair: '#5A4A4C', hairHi: '#BDB6B8', ink: '#2A1D22',
  hoodie: '#6F8F5E', sleeve: '#648255', hood: '#EADFC8', string: '#F4ECD8', clip: '#8F6B45',
  mouth: '#8B3F37', mouthIn: '#7A2D2E', tongue: '#EE7A7A', blush: '#E58C7C',
};

const ARM_REST_L = { wx: 150, wy: 536, ex: 92, ey: 500, finger: 0, front: 0 };
const ARM_REST_R = { wx: 250, wy: 536, ex: 308, ey: 500, finger: 0, front: 0 };

export const T_NEUTRAL = {
  yaw: 0, tilt: 0, gazeX: 0, gazeY: 0, blink: 0, lid: 0.1, squint: 0, blush: 0.6,
  browL: { y: 0, rot: 0 }, browR: { y: 0, rot: 0 },
  mouth: { w: 15, up: 5, lo: 5, cl: 0, cr: 0 },
  lean: 0, bob: 0, breath: 0,
  armL: { ...ARM_REST_L }, armR: { ...ARM_REST_R },
  flip: 0,
};

const mergeState = (...parts) => {
  const out = JSON.parse(JSON.stringify(parts[0]));
  const walk = (d, s) => { for (const k of Object.keys(s)) { if (s[k] && typeof s[k] === 'object') walk(d[k] || (d[k] = {}), s[k]); else d[k] = s[k]; } };
  parts.slice(1).forEach((s) => walk(out, s));
  return out;
};

export const T_EXPR = {
  // sopan: senyum tipis, menunggu dengan tenang
  sopan:   { lid: 0.15, browL: { y: -2, rot: 3 }, browR: { y: -2, rot: -3 }, mouth: { w: 14, up: 5, lo: 5, cl: 0, cr: 0 } },
  // peduli: alis naik di tengah, mulut kecil (khawatir ramah)
  peduli:  { lid: 0, browL: { y: -7, rot: 11 }, browR: { y: -7, rot: -11 }, mouth: { w: 10, up: 0, lo: 8, cl: 0, cr: 0 } },
  // senyum hangat
  hangat:  { lid: 0.1, squint: 0.3, browL: { y: -3, rot: 2 }, browR: { y: -3, rot: -2 }, mouth: { w: 18, up: 8, lo: 8, cl: 0, cr: 0 } },
  // tanya: bicara sambil sedikit khawatir
  tanya:   { lid: 0, browL: { y: -5, rot: 8 }, browR: { y: -5, rot: -8 }, mouth: { w: 13, up: 3, lo: 9, cl: 0, cr: 0 } },
  // santai: kelopak setengah, senyum miring tipis
  santai:  { lid: 0.38, browL: { y: 1, rot: -2 }, browR: { y: -5, rot: 6 }, mouth: { w: 15, up: 4, lo: 4, cl: 1, cr: -5 } },
  // jahil: satu alis naik, senyum miring lebih lebar
  jahil:   { lid: 0.28, browL: { y: 2, rot: -4 }, browR: { y: -11, rot: 10 }, mouth: { w: 17, up: 3, lo: 9, cl: 2, cr: -7 } },
  // geli: tertawa tertahan, mata melengkung
  geli:    { lid: 0, squint: 0.85, browL: { y: -4, rot: 4 }, browR: { y: -6, rot: -2 }, mouth: { w: 14, up: 2, lo: 8, cl: -1, cr: -4 } },
  // heran kecil: alis naik, mulut kecil
  heran:   { lid: 0, browL: { y: -9, rot: 6 }, browR: { y: -12, rot: -6 }, mouth: { w: 9, up: -1, lo: 12, cl: 0, cr: 0 } },
  // datar: menilai
  datar:   { lid: 0.5, browL: { y: 2, rot: 0 }, browR: { y: 0, rot: 0 }, mouth: { w: 12, up: 1, lo: 1, cl: 0, cr: 0 } },
};

export const T_POSE = {
  duduk: { armL: { wx: 176, wy: 540, ex: 100, ey: 504, finger: 0, front: 1 }, armR: { wx: 224, wy: 540, ex: 300, ey: 504, finger: 0, front: 1 } },
  // siku di meja, dagu di tangan (kanan layar)
  dagu: { lean: -1.5, armR: { wx: 300, wy: 358, ex: 346, ey: 478, finger: 0, front: 1 } },
};

export function pasien(expr = 'sopan', pose = 'duduk', over = {}) {
  return mergeState(T_NEUTRAL, T_EXPR[expr] || {}, T_POSE[pose] || {}, over);
}
export function lerpPasien(a, b, t) {
  const walk = (x, y) => { if (x && typeof x === 'object') { const o = {}; for (const k of Object.keys(x)) o[k] = walk(x[k], y[k]); return o; } return lerp(x, y, t); };
  return walk(a, b);
}
export function idlePasien(s, t, off = 0) {
  const o = JSON.parse(JSON.stringify(s));
  o.breath = 0.5 + 0.5 * Math.sin(t * 2.0 + off);
  o.bob += Math.sin(t * 2.0 + off) * 1.0;
  o.tilt += Math.sin(t * 0.8 + off) * 0.6;
  const x = (((t - (1.7 + off)) % 3.9) + 3.9) % 3.9; // kedip
  if (x < 0.15) o.blink = Math.max(o.blink, Math.sin((x / 0.15) * Math.PI));
  return o;
}

const SHOULDER = { L: [104, 410], R: [296, 410] };
const HEAD_SCALE = 1.2, NECK_Y = 362, HEAD_PIVOT_Y = 306;

function sleeveDots(sx, sy, a) {
  const cx = 2 * a.ex - (sx + a.wx) / 2, cy = 2 * a.ey - (sy + a.wy) / 2;
  const N = 36, dots = [];
  for (let i = 0; i <= N; i += 1) { const t = i / N, u = 1 - t; dots.push([u * u * sx + 2 * u * t * cx + t * t * a.wx, u * u * sy + 2 * u * t * cy + t * t * a.wy, lerp(32, 24, ease(t))]); }
  const ex = a.wx - cx, ey = a.wy - cy, el = Math.hypot(ex, ey) || 1;
  return { dots, dx: ex / el, dy: ey / el };
}
function armSvg(side, a) {
  const [sx, sy] = SHOULDER[side];
  const { dots, dx, dy } = sleeveDots(sx, sy, a);
  const hx = a.wx + dx * 16, hy = a.wy + dy * 16;
  return `<g fill="${TP.sleeve}">` + dots.map((p) => `<circle cx="${r1(p[0])}" cy="${r1(p[1])}" r="${r1(p[2])}"/>`).join('') + `<circle cx="${r1(hx)}" cy="${r1(hy)}" r="21" fill="${TP.skin}"/></g>`;
}

function browSvg(cx, cy, b, side) {
  const rot = b.rot * (side === 'L' ? -1 : 1);
  return `<path d="M${cx - 14} ${cy + 4}Q${cx} ${cy - 9} ${cx + 14} ${cy + 3}" fill="none" stroke="${TP.ink}" stroke-width="4.6" stroke-linecap="round" transform="translate(0 ${r1(b.y)}) rotate(${r1(rot)} ${cx} ${cy})"/>`;
}

function mouthSvg(m, uid) {
  const w = m.w, up = m.up, lo = m.lo, cl = m.cl || 0, cr = m.cr || 0;
  const open = lo - up, k = 1.333, e = 0.9 * w;
  const shape = `M${r1(-w)} ${r1(cl)}C${r1(-e)} ${r1(up * k + cl * 0.6)} ${r1(e)} ${r1(up * k + cr * 0.6)} ${r1(w)} ${r1(cr)}C${r1(e)} ${r1(lo * k + cr * 0.4)} ${r1(-e)} ${r1(lo * k + cl * 0.4)} ${r1(-w)} ${r1(cl)}Z`;
  const fillOp = clamp((open - 3) / 8, 0, 1), tongueOp = clamp((open - 14) / 12, 0, 1);
  return `<defs><clipPath id="${uid}-mc"><path d="${shape}"/></clipPath></defs>`
    + `<path d="${shape}" fill="${TP.mouthIn}" fill-opacity="${r1(fillOp)}" stroke="${TP.mouth}" stroke-width="4.6" stroke-linejoin="round"/>`
    + `<ellipse cx="0" cy="${r1(lo * 1.05)}" rx="${r1(w * 0.6)}" ry="${r1(Math.max(1, open * 0.42))}" fill="${TP.tongue}" clip-path="url(#${uid}-mc)" opacity="${r1(tongueOp)}"/>`
    // lesung pipi kecil di sisi senyum miring
    + `<path d="M${r1(w + 4)} ${r1(cr - 5)}q4 5 0 10" fill="none" stroke="${TP.mouth}" stroke-width="3" stroke-linecap="round" opacity="${r1(clamp((Math.abs(cr) - 2) / 4, 0, 1) * 0.8)}"/>`;
}

export function pasienSvg(s, opts = {}) {
  const uid = opts.uid || 'pasien';
  const flip = s.flip > 0.5;
  const yaw = clamp(s.yaw, -1, 1);
  const faceDx = yaw * 30, faceSq = 1 - 0.14 * Math.abs(yaw);
  const eyeY = 212, eyeLx = 160, eyeRx = 240;
  const blink = clamp(s.blink, 0, 1), lid = clamp(s.lid, 0, 0.9), sq = clamp(s.squint, 0, 1);
  const gx = s.gazeX * 6, gy = s.gazeY * 4;
  // mata: lonjong, kelopak menurunkan bagian atas; squint = lengkung "^ ^"
  const ry0 = 12 * (1 - lid * 0.62), ryEff = lerp(ry0, 1.8, blink);
  const cyEye = eyeY + (12 - ry0) * 0.9;
  const eye = (cx, side) => {
    const o = clamp(1 - (sq - 0.5) / 0.15, 0, 1);
    const lash = `<path d="M${r1(cx + side * 9)} ${r1(cyEye - ryEff + 2)}l${side * 9} -5" stroke="${TP.ink}" stroke-width="3" stroke-linecap="round" opacity="${r1(o)}"/>`;
    return `<ellipse cx="${r1(cx + gx)}" cy="${r1(cyEye + gy)}" rx="10" ry="${r1(Math.max(1.8, ryEff))}" fill="${TP.ink}" opacity="${r1(o)}"/>` + lash
      + `<path d="M${r1(cx + gx - 13)} ${r1(eyeY + 5)}Q${r1(cx + gx)} ${r1(eyeY - 14)} ${r1(cx + gx + 13)} ${r1(eyeY + 5)}" fill="none" stroke="${TP.ink}" stroke-width="5.4" stroke-linecap="round" opacity="${r1(clamp((sq - 0.45) / 0.15, 0, 1) * (1 - blink))}"/>`;
  };
  const earL = `<circle cx="${r1(94 + yaw * 9)}" cy="216" r="${r1(21 - Math.max(0, -yaw) * 7)}" fill="${TP.skin}"/>`;
  const earR = `<circle cx="${r1(306 + yaw * 9)}" cy="216" r="${r1(21 - Math.max(0, yaw) * 7)}" fill="${TP.skin}"/>`;
  const headSkin = `M200 92C270 92 308 138 308 204C308 262 264 304 200 304C136 304 92 262 92 204C92 138 130 92 200 92Z`;
  const hairBack = `<g transform="translate(${r1(yaw * 8)} 0)"><circle cx="200" cy="52" r="40" fill="${TP.hair}"/><path d="M200 62C288 62 326 122 322 204C320 236 326 262 316 280C306 292 292 288 288 276L112 276C108 288 94 292 84 280C74 262 80 236 78 204C74 122 112 62 200 62Z" fill="${TP.hair}"/></g>`;
  const hairFront = `<g transform="translate(${r1(yaw * 12)} 0)" fill="${TP.hair}">`
    + `<path d="M94 214C74 160 96 104 160 86C226 70 296 94 312 166C316 188 314 204 310 218C300 190 280 170 250 160C210 152 176 138 156 114C150 146 128 184 94 214Z"/>`
    + `<path d="M170 92C198 80 238 82 266 98C238 94 204 100 170 92Z" fill="${TP.hairHi}" opacity=".85"/>`
    + `<path d="M120 120C140 104 160 98 184 98" stroke="${TP.hairHi}" stroke-width="5" fill="none" stroke-linecap="round" opacity=".7"/>`
    + `<path d="M84 196C72 232 78 268 98 290C110 262 110 232 108 200Z"/><path d="M316 196C328 232 322 268 302 290C290 262 290 232 292 200Z"/>`
    + `</g>`;
  const blush = `<ellipse cx="128" cy="244" rx="20" ry="11" fill="${TP.blush}" opacity="${r1(0.32 * s.blush)}"/><ellipse cx="272" cy="244" rx="20" ry="11" fill="${TP.blush}" opacity="${r1(0.32 * s.blush)}"/>`;
  const face = `<g transform="translate(${r1(200 + faceDx)} 0) scale(${r1(faceSq)} 1) translate(-200 0)">`
    + blush + browSvg(eyeLx, 184, s.browL, 'L') + browSvg(eyeRx, 184, s.browR, 'R') + eye(eyeLx, -1) + eye(eyeRx, 1)
    + `<g fill="none" stroke="#6B5640" stroke-width="4.2"><circle cx="${eyeLx}" cy="${eyeY}" r="27"/><circle cx="${eyeRx}" cy="${eyeY}" r="27"/><path d="M187 ${eyeY - 2}Q200 ${eyeY - 8} 213 ${eyeY - 2}"/></g>`
    + `<g transform="translate(200 ${r1(266 + s.gazeY * 1.5)})">${mouthSvg(s.mouth, uid)}</g></g>`;
  const headG = `<g transform="translate(200 ${NECK_Y}) rotate(${r1(s.tilt)}) scale(${HEAD_SCALE}) translate(-200 -${HEAD_PIVOT_Y})">`
    + hairBack + earL + earR + `<path d="${headSkin}" fill="${TP.skin}"/>` + face + hairFront + `</g>`;
  const breath = 1 + s.breath * 0.012;
  const torso = `<g transform="translate(200 580) scale(1 ${r1(breath)}) translate(-200 -580)"><path d="M114 452C112 396 150 374 172 372C182 388 218 388 228 372C250 374 288 396 286 452L296 566C250 588 150 588 104 566Z" fill="${TP.hoodie}"/>`
    + `<path d="M160 378C176 410 224 410 240 378C228 372 214 386 200 386C186 386 172 372 160 378Z" fill="${TP.hood}"/>` + [430, 470, 510].map((y) => `<circle cx="200" cy="${y}" r="4.8" fill="${TP.string}"/>`).join('') + `</g>`;
  const neck = `<rect x="172" y="338" width="56" height="60" rx="16" fill="${TP.skinShade}"/>`;
  const frontArm = (a) => a.front > 0.5;
  const arms = (front) => ['L', 'R'].map((sd) => { const a = sd === 'L' ? s.armL : s.armR; return frontArm(a) === front ? armSvg(sd, a) : ''; }).join('');
  const body = `<g transform="translate(0 ${r1(s.bob)}) rotate(${r1(s.lean)} 200 580)">${arms(false)}${neck}${torso}${headG}${arms(true)}</g>`;
  const wrapped = flip ? `<g transform="translate(400 0) scale(-1 1)">${body}</g>` : body;
  if (opts.bare) return wrapped;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 800" role="img" aria-label="Pasien">${wrapped}</svg>`;
}

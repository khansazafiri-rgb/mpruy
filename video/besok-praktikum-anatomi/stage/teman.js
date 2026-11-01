// Teman Raka: mahasiswi FK seumuran. Karakter 2D baru untuk video "Masih Dua Minggu".
// Gaya mengikuti Raka: kepala besar membulat, bentuk datar, tanpa garis tepi, satu viewBox 400 x 800, tengah badan x = 200.
// Beda: rambut bob cokelat tua dengan poni miring dan jepit emas kecil, hoodie lilac (warna lain dari sweater teal Raka),
// semburat pipi, kelopak setengah turun, dan senyum miring yang jahil. Lengan = satu bentuk meruncing seperti Raka.

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a * (1 - t) + b * t;
const r1 = (n) => Math.round(n * 10) / 10;
const ease = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };

export const TP = {
  skin: '#EDAB80', skinShade: '#DB966B', hair: '#4A2D2B', hairHi: '#5E3B37', ink: '#2A1D22',
  hoodie: '#8B7BE0', sleeve: '#7F6FD6', hood: '#6C5CC8', string: '#F1EDFF', clip: '#F8C038',
  mouth: '#8B3F37', mouthIn: '#7A2D2E', tongue: '#EE7A7A', blush: '#F28F85',
};

const ARM_REST_L = { wx: 150, wy: 536, ex: 92, ey: 500, finger: 0, front: 0 };
const ARM_REST_R = { wx: 250, wy: 536, ex: 308, ey: 500, finger: 0, front: 0 };

export const T_NEUTRAL = {
  yaw: 0, tilt: 0, gazeX: 0, gazeY: 0, blink: 0, lid: 0.35, squint: 0, blush: 1,
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
  duduk: {},
  // siku di meja, dagu di tangan (kanan layar)
  dagu: { lean: -1.5, armR: { wx: 300, wy: 358, ex: 346, ey: 478, finger: 0, front: 1 } },
};

export function teman(expr = 'santai', pose = 'duduk', over = {}) {
  return mergeState(T_NEUTRAL, T_EXPR[expr] || {}, T_POSE[pose] || {}, over);
}
export function lerpTeman(a, b, t) {
  const walk = (x, y) => { if (x && typeof x === 'object') { const o = {}; for (const k of Object.keys(x)) o[k] = walk(x[k], y[k]); return o; } return lerp(x, y, t); };
  return walk(a, b);
}
export function idleTeman(s, t, off = 0) {
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

export function temanSvg(s, opts = {}) {
  const uid = opts.uid || 'teman';
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
  const hairBack = `<g transform="translate(${r1(yaw * 8)} 0)"><path d="M200 50C296 50 338 118 332 214C330 262 340 302 326 334C312 356 284 350 272 334L128 334C116 350 88 356 74 334C60 302 70 262 68 214C62 118 104 50 200 50Z" fill="${TP.hair}"/></g>`;
  const hairFront = `<g transform="translate(${r1(yaw * 12)} 0)" fill="${TP.hair}">`
    + `<path d="M94 222C70 166 94 96 166 76C236 60 306 88 314 170C318 192 316 210 312 226C304 196 284 172 250 162C206 152 172 134 152 108C148 144 126 184 94 222Z"/>`
    + `<path d="M84 196C70 236 76 290 100 318C112 286 110 238 108 200Z"/><path d="M316 196C330 236 324 290 300 318C288 286 290 238 292 200Z"/>`
    + `<path d="M170 82C196 70 240 70 270 86C240 84 206 92 170 82Z" fill="${TP.hairHi}" opacity=".7"/>`
    + `<g transform="translate(262 112) rotate(-18)"><rect x="-17" y="-7" width="34" height="14" rx="7" fill="${TP.clip}"/><rect x="-9" y="-3" width="18" height="3" rx="1.5" fill="#fff" opacity=".5"/></g>`
    + `</g>`;
  const blush = `<ellipse cx="128" cy="244" rx="20" ry="11" fill="${TP.blush}" opacity="${r1(0.32 * s.blush)}"/><ellipse cx="272" cy="244" rx="20" ry="11" fill="${TP.blush}" opacity="${r1(0.32 * s.blush)}"/>`;
  const face = `<g transform="translate(${r1(200 + faceDx)} 0) scale(${r1(faceSq)} 1) translate(-200 0)">`
    + blush + browSvg(eyeLx, 184, s.browL, 'L') + browSvg(eyeRx, 184, s.browR, 'R') + eye(eyeLx, -1) + eye(eyeRx, 1)
    + `<g transform="translate(200 ${r1(266 + s.gazeY * 1.5)})">${mouthSvg(s.mouth, uid)}</g></g>`;
  const headG = `<g transform="translate(200 ${NECK_Y}) rotate(${r1(s.tilt)}) scale(${HEAD_SCALE}) translate(-200 -${HEAD_PIVOT_Y})">`
    + hairBack + earL + earR + `<path d="${headSkin}" fill="${TP.skin}"/>` + face + hairFront + `</g>`;
  const breath = 1 + s.breath * 0.012;
  const torso = `<g transform="translate(200 580) scale(1 ${r1(breath)}) translate(-200 -580)"><path d="M114 452C112 396 150 374 172 372C182 388 218 388 228 372C250 374 288 396 286 452L296 566C250 588 150 588 104 566Z" fill="${TP.hoodie}"/>`
    + `<path d="M150 380C164 410 236 410 250 380C238 372 214 388 200 388C186 388 162 372 150 380Z" fill="${TP.hood}"/>`
    + `<path d="M182 400V440M218 400V440" stroke="${TP.string}" stroke-width="4.5" stroke-linecap="round"/><circle cx="182" cy="444" r="4.6" fill="${TP.string}"/><circle cx="218" cy="444" r="4.6" fill="${TP.string}"/></g>`;
  const neck = `<rect x="172" y="338" width="56" height="60" rx="16" fill="${TP.skinShade}"/>`;
  const frontArm = (a) => a.front > 0.5;
  const arms = (front) => ['L', 'R'].map((sd) => { const a = sd === 'L' ? s.armL : s.armR; return frontArm(a) === front ? armSvg(sd, a) : ''; }).join('');
  const body = `<g transform="translate(0 ${r1(s.bob)}) rotate(${r1(s.lean)} 200 580)">${arms(false)}${neck}${torso}${headG}${arms(true)}</g>`;
  const wrapped = flip ? `<g transform="translate(400 0) scale(-1 1)">${body}</g>` : body;
  if (opts.bare) return wrapped;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 800" role="img" aria-label="Teman">${wrapped}</svg>`;
}

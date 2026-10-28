// Tokoh 2D datar membulat untuk "Dunia tanpa cuci tangan".
// Prinsip: tidak ada garis tepi, tidak ada ruas kaku. Lengan dan kaki = satu bentuk lengkung yang meruncing
// (kurva Bezier + lebar berubah), menyatu dengan badan lewat bahu membulat. Gerak = target yang di-ease.
const NS = 'http://www.w3.org/2000/svg';
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
export const smoother = (t) => { t = clamp(t, 0, 1); return t * t * t * (t * (6 * t - 15) + 10); };

// Interpolasi kubik monoton (tanpa overshoot, kecepatan kontinu). Ujung dibuat landai.
export function pchip(keys) {
  const n = keys.length, x = keys.map((k) => k[0]), y = keys.map((k) => k[1]);
  if (n === 1) return () => y[0];
  const h = [], d = [];
  for (let i = 0; i < n - 1; i++) { h[i] = x[i + 1] - x[i]; d[i] = (y[i + 1] - y[i]) / h[i]; }
  const m = new Array(n).fill(0);
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) m[i] = 0;
    else { const w1 = 2 * h[i] + h[i - 1], w2 = h[i] + 2 * h[i - 1]; m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]); }
  }
  return (t) => {
    if (t <= x[0]) return y[0];
    if (t >= x[n - 1]) return y[n - 1];
    let lo = 0, hi = n - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (x[mid] <= t) lo = mid; else hi = mid; }
    const u = (t - x[lo]) / h[lo], u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * y[lo] + (u3 - 2 * u2 + u) * h[lo] * m[lo] + (-2 * u3 + 3 * u2) * y[hi] + (u3 - u2) * h[lo] * m[hi];
  };
}

const el = (tag, attrs = {}, parent) => {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
};
const f1 = (v) => (Math.round(v * 10) / 10).toString();

// ---------- anggota badan yang meruncing ----------
// S = pangkal, T = ujung, L = panjang total (menentukan seberapa melengkung), flip = arah tekuk.
export function limbCurve(S, T, L, flip, softness = 0.5) {
  let dx = T[0] - S[0], dy = T[1] - S[1], d = Math.hypot(dx, dy) || 1e-6;
  const maxd = L * 1.04;
  if (d > maxd) { T = [S[0] + dx * maxd / d, S[1] + dy * maxd / d]; dx = T[0] - S[0]; dy = T[1] - S[1]; d = maxd; }
  if (d < L) L = d + (L - d) * softness;
  const half = L / 2, h = d >= L ? 0 : Math.sqrt(Math.max(0, half * half - (d / 2) * (d / 2)));
  const nx = (-dy / d) * flip, ny = (dx / d) * flip;
  const C = [(S[0] + T[0]) / 2 + 2 * h * nx, (S[1] + T[1]) / 2 + 2 * h * ny];
  return { S, C, T };
}
const bz = (c, t) => {
  const u = 1 - t;
  return [u * u * c.S[0] + 2 * u * t * c.C[0] + t * t * c.T[0], u * u * c.S[1] + 2 * u * t * c.C[1] + t * t * c.T[1]];
};
const bzd = (c, t) => [2 * (1 - t) * (c.C[0] - c.S[0]) + 2 * t * (c.T[0] - c.C[0]), 2 * (1 - t) * (c.C[1] - c.S[1]) + 2 * t * (c.T[1] - c.C[1])];
export function limbPath(c, w0, w1, t0 = 0, t1 = 1, grow = 0, N = 22) {
  const L = [], R = [];
  for (let i = 0; i <= N; i++) {
    const t = t0 + (t1 - t0) * (i / N);
    const p = bz(c, t), v = bzd(c, t), vl = Math.hypot(v[0], v[1]) || 1;
    const hw = (lerp(w0, w1, smooth(t)) * (1 + 0.07 * Math.sin(Math.PI * t)) + grow) / 2;
    const nx = -v[1] / vl, ny = v[0] / vl;
    L.push([p[0] + nx * hw, p[1] + ny * hw]); R.push([p[0] - nx * hw, p[1] - ny * hw]);
  }
  return 'M' + L.map((p) => f1(p[0]) + ' ' + f1(p[1])).join('L') + 'L' + R.reverse().map((p) => f1(p[0]) + ' ' + f1(p[1])).join('L') + 'Z';
}

// ---------- palet ----------
export const PAL = {
  ink: '#1B2430', skinN: '#EDB78E', skinNd: '#DDA07A', hair: '#252A38',
  scrub: '#2FB5A9', scrubD: '#239C92', pants: '#1E8A86', shoe: '#F6F4EC', sole: '#C9D3D1',
  blush: '#F28B82', mouth: '#7A3A34',
};

// ---------- perawat ----------
export function createNurse() {
  const root = el('g', { class: 'nurse' });
  const body = el('g', {}, root);
  const legBack = el('path', { fill: PAL.pants }, body), legFront = el('path', { fill: PAL.pants }, body);
  const footB = el('g', {}, body), footF = el('g', {}, body);
  const mkFoot = (g) => { el('ellipse', { rx: 44, ry: 21, fill: PAL.shoe }, g); el('rect', { x: -40, y: 10, width: 80, height: 9, rx: 4.5, fill: PAL.sole }, g); };
  mkFoot(footB); mkFoot(footF);
  const hips = el('g', {}, body);
  hips.innerHTML = `<rect x="-80" y="-170" width="160" height="56" rx="26" fill="${PAL.pants}"/>`;
  const torso = el('g', {}, body);
  torso.innerHTML = `
    <path d="M-100 -326C-100 -344 -62 -356 0 -356C62 -356 100 -344 100 -326L114 -170C114 -148 98 -138 76 -138L-76 -138C-98 -138 -114 -148 -114 -170Z" fill="${PAL.scrub}"/>
    <path d="M-36 -356L0 -300L36 -356Z" fill="${PAL.skinN}"/>
    <path d="M-44 -356L0 -290L44 -356L30 -356L0 -312L-30 -356Z" fill="${PAL.scrubD}"/>
    <rect x="26" y="-246" width="50" height="44" rx="10" fill="${PAL.scrubD}"/>
    <rect x="-70" y="-248" width="32" height="42" rx="8" fill="#fff"/><rect x="-70" y="-248" width="32" height="12" rx="6" fill="#9DE0BD"/>`;
  const armB = mkArm(root), armF = mkArm(root);
  // kepala
  const head = el('g', {}, root);
  const hairBack = el('g', {}, head);
  hairBack.innerHTML = ``;
  head.appendChild(el('ellipse', { cx: -98, cy: -430, rx: 17, ry: 20, fill: PAL.skinNd }));
  head.appendChild(el('ellipse', { cx: 98, cy: -430, rx: 17, ry: 20, fill: PAL.skinNd }));
  el('ellipse', { cx: 0, cy: -436, rx: 104, ry: 108, fill: PAL.skinN }, head);
  el('path', { d: 'M-74 -366Q0 -326 74 -366Q66 -330 0 -318Q-66 -330 -74 -366Z', fill: '#C58E68', opacity: 0.28 }, head);
  const face = el('g', {}, head);
  const cheekL = el('ellipse', { cx: -62, cy: -396, rx: 20, ry: 12, fill: PAL.blush, opacity: 0.35 }, face);
  const cheekR = el('ellipse', { cx: 62, cy: -396, rx: 20, ry: 12, fill: PAL.blush, opacity: 0.35 }, face);
  const eyeL = el('ellipse', { cx: -38, cy: -432, rx: 11, ry: 15, fill: PAL.ink }, face);
  const eyeR = el('ellipse', { cx: 38, cy: -432, rx: 11, ry: 15, fill: PAL.ink }, face);
  const hiL = el('circle', { cx: -42, cy: -438, r: 3.6, fill: '#fff' }, face), hiR = el('circle', { cx: 34, cy: -438, r: 3.6, fill: '#fff' }, face);
  const happyL = el('path', { d: 'M-54 -426Q-38 -450 -22 -426', fill: 'none', stroke: PAL.ink, 'stroke-width': 8, 'stroke-linecap': 'round', opacity: 0 }, face);
  const happyR = el('path', { d: 'M22 -426Q38 -450 54 -426', fill: 'none', stroke: PAL.ink, 'stroke-width': 8, 'stroke-linecap': 'round', opacity: 0 }, face);
  const browL = el('path', { fill: 'none', stroke: PAL.hair, 'stroke-width': 10, 'stroke-linecap': 'round' }, face);
  const browR = el('path', { fill: 'none', stroke: PAL.hair, 'stroke-width': 10, 'stroke-linecap': 'round' }, face);
  const mouth = el('path', { fill: 'none', stroke: PAL.mouth, 'stroke-width': 7, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, face);
  const hairFront = el('g', {}, head);
  hairFront.innerHTML = `<path d="M-106 -432C-114 -528 -58 -558 4 -558C66 -558 116 -526 106 -432C100 -458 92 -474 76 -484C40 -470 -6 -486 -40 -500C-70 -490 -96 -468 -106 -432Z" fill="${PAL.hair}"/>
    <path d="M-60 -520Q-24 -546 30 -540" fill="none" stroke="#3B4262" stroke-width="9" stroke-linecap="round"/>`;
  return { root, body, legBack, legFront, footB, footF, hips, torso, armB, armF, head, face, eyeL, eyeR, hiL, hiR, happyL, happyR, browL, browR, mouth, cheekL, cheekR, hairFront, hairBack };
}

function mkArm(parent) {
  const g = el('g', {}, parent);
  const skin = el('path', { fill: PAL.skinN }, g);
  const sleeve = el('path', { fill: PAL.scrub }, g);
  const cuff = el('path', { fill: PAL.scrubD }, g);
  const hand = el('g', {}, g);
  el('ellipse', { cx: 0, cy: 0, rx: 27, ry: 31, fill: PAL.skinN }, hand);
  const thumb = el('ellipse', { cx: 21, cy: -10, rx: 10, ry: 19, fill: PAL.skinN }, hand);
  const shoulder = el('circle', { r: 31, fill: PAL.scrub }, g);
  return { g, skin, sleeve, cuff, hand, thumb, shoulder };
}

const SHOULDER = { back: [-90, -316], front: [90, -316] };
const ARM_LEN = 188;

function setArm(a, S, T, flip, grip = 0) {
  const c = limbCurve(S, T, ARM_LEN, flip);
  a.skin.setAttribute('d', limbPath(c, 52, 40));
  a.sleeve.setAttribute('d', limbPath(c, 52, 40, 0, 0.46, 10));
  a.cuff.setAttribute('d', limbPath(c, 52, 40, 0.42, 0.49, 12));
  a.shoulder.setAttribute('cx', S[0]); a.shoulder.setAttribute('cy', S[1]);
  const p = c.T, v = bzd(c, 1), ang = Math.atan2(v[1], v[0]) * 180 / Math.PI - 90;
  a.hand.setAttribute('transform', `translate(${f1(p[0] + v[0] / (Math.hypot(v[0], v[1]) || 1) * 17)} ${f1(p[1] + v[1] / (Math.hypot(v[0], v[1]) || 1) * 17)}) rotate(${f1(ang)}) scale(${f1(1 - 0.12 * grip)} ${f1(1 - 0.18 * grip)})`);
  a.thumb.setAttribute('cx', flip > 0 ? -21 : 21);
  const vl = Math.hypot(v[0], v[1]) || 1;
  return [p[0] + v[0] / vl * 17, p[1] + v[1] / vl * 17];
}

// s = { x, y, sc, dir, phi, mv, handB:[x,y,flip,grip], handF:[...], head:{tilt,nod,turn}, face:{expr,look,env,blink}, lean }
const REST_B = [-100, -112], REST_F = [100, -112];
const STRIDE = 46;
export const WALK_DIST = 4 * STRIDE; // jarak per siklus penuh agar kaki tidak meluncur

const EXPR = {
  neutral: { brow: [0, 0], eyes: 'dot', mouth: 'smile', blush: 0.3 },
  calm: { brow: [0, 2], eyes: 'dot', mouth: 'smile', blush: 0.3 },
  busy: { brow: [2, 6], eyes: 'dot', mouth: 'flat', blush: 0.25 },
  warm: { brow: [-4, -2], eyes: 'happy', mouth: 'smile', blush: 0.5 },
  curious: { brow: [-6, 10], eyes: 'dot', mouth: 'flat', blush: 0.3 },
  hurry: { brow: [4, 8], eyes: 'dot', mouth: 'smile', blush: 0.25 },
  focus: { brow: [3, 12], eyes: 'dot', mouth: 'flat', blush: 0.28 },
  relieved: { brow: [-6, -3], eyes: 'happy', mouth: 'grin', blush: 0.5 },
  surprised: { brow: [-12, -6], eyes: 'wide', mouth: 'o', blush: 0.35 },
};

function mouthPath(kind, env) {
  const y = -392;
  if (env > 0.07) {
    const h = 5 + env * 26, w = 17 + env * 8;
    return { d: `M${-w} ${y - 2}Q0 ${y - 8} ${w} ${y - 2}Q${w * 0.7} ${y + h} 0 ${y + h}Q${-w * 0.7} ${y + h} ${-w} ${y - 2}Z`, fill: PAL.mouth };
  }
  switch (kind) {
    case 'grin': return { d: `M-26 ${y - 4}Q0 ${y + 32} 26 ${y - 4}Z`, fill: PAL.mouth };
    case 'flat': return { d: `M-17 ${y + 3}L17 ${y + 3}`, fill: 'none' };
    case 'o': return { d: `M-11 ${y}a11 14 0 1 0 22 0a11 14 0 1 0 -22 0z`, fill: PAL.mouth };
    default: return { d: `M-22 ${y}Q0 ${y + 19} 22 ${y}`, fill: 'none' };
  }
}

export function updateNurse(n, s) {
  const mv = s.mv || 0, phi = s.phi || 0;
  const bobAmt = mv * 4;
  const bob = -Math.abs(Math.sin(Math.PI * 2 * phi)) * bobAmt + Math.sin((s.t || 0) * 2.1) * 1.8 * (1 - mv);
  const lean = (s.lean || 0) + Math.sin(Math.PI * 2 * phi) * 1.2 * mv;
  const sx = s.dir < 0 ? -s.sc : s.sc;
  n.root.setAttribute('transform', `translate(${f1(s.x)} ${f1(s.y)}) scale(${f1(sx * 1000) / 1000} ${s.sc})`);
  n.body.setAttribute('transform', `translate(0 ${f1(bob)}) rotate(${f1(lean)} 0 -150)`);
  // kaki: fase berbasis posisi; saat diam kembali ke pose berdiri
  for (const [leg, foot, hipx, ph] of [[n.legBack, n.footB, -36, 0.5], [n.legFront, n.footF, 36, 0]]) {
    const p = ((phi + ph) % 1 + 1) % 1;
    let fx, fy;
    if (p < 0.5) { fx = lerp(STRIDE, -STRIDE, p / 0.5); fy = 0; }
    else { const u = (p - 0.5) / 0.5; fx = lerp(-STRIDE, STRIDE, smooth(u)); fy = -Math.sin(Math.PI * u) * 24; }
    fx *= mv; fy *= mv;
    const hip = [hipx, -146], ank = [hipx + fx, -20 + fy];
    const c = limbCurve(hip, ank, 128, 1, 0.9);
    leg.setAttribute('d', limbPath(c, 62, 46));
    const lift = fy * -0.5;
    foot.setAttribute('transform', `translate(${f1(ank[0] + 14)} ${f1(ank[1] + 16)}) rotate(${f1(-fy * 0.6 * 0 + (p >= 0.5 ? -(Math.sin(Math.PI * ((p - 0.5) / 0.5))) * 10 * mv : 0))})`);
    void lift;
  }
  // lengan: target dasar + ayunan jalan
  const sw = Math.sin(Math.PI * 2 * phi) * 30 * mv;
  const hB = s.handB || REST_B, hF = s.handF || REST_F;
  const restB = [REST_B[0], REST_B[1]], restF = [REST_F[0], REST_F[1]];
  const wB = s.handB ? 0 : 1, wF = s.handF ? 0 : 1;
  const pB = setArm(n.armB, SHOULDER.back, [hB[0] + (wB ? 10 * sw / 30 : 0), hB[1] + (wB ? 0 : 0) + (wB ? 0 : 0)], hB[2] != null ? hB[2] : 1, hB[3] || 0);
  const pF = setArm(n.armF, SHOULDER.front, [hF[0] - (wF ? 10 * sw / 30 : 0), hF[1]], hF[2] != null ? hF[2] : -1, hF[3] || 0);
  void restB; void restF; void sw;
  // kepala
  const h = s.head || {};
  const turn = h.turn || 0;
  n.head.setAttribute('transform', `translate(${f1((h.dx || 0))} ${f1((h.nod || 0) + bob * 0.3 + (s.face && s.face.env ? s.face.env * 3 : 0))}) rotate(${f1((h.tilt || 0) + Math.sin((s.t || 0) * 1.3) * 0.8)} 0 -340)`);
  n.face.setAttribute('transform', `translate(${f1(turn * 22)} 0)`);
  n.hairFront.setAttribute('transform', `translate(${f1(turn * 6)} 0)`);
  n.hairBack.setAttribute('transform', `translate(${f1(turn * 4)} 0)`);
  const fc = s.face || {}, e = EXPR[fc.expr || 'neutral'];
  const look = fc.look || [0, 0];
  const blink = clamp(fc.blink || 0, 0, 1);
  const wide = e.eyes === 'wide', happy = e.eyes === 'happy';
  const sy = Math.max(0.1, 1 - blink * 0.9);
  for (const [eye, hi, cx] of [[n.eyeL, n.hiL, -38], [n.eyeR, n.hiR, 38]]) {
    eye.setAttribute('cx', cx + look[0] * 7); eye.setAttribute('cy', -432 + look[1] * 6);
    eye.setAttribute('rx', wide ? 13 : 11); eye.setAttribute('ry', (wide ? 19 : 15) * sy);
    hi.setAttribute('cx', cx - 4 + look[0] * 7); hi.setAttribute('cy', -438 + look[1] * 6);
    eye.setAttribute('opacity', happy ? 0 : 1); hi.setAttribute('opacity', happy || sy < 0.5 ? 0 : 1);
  }
  n.happyL.setAttribute('opacity', happy ? 1 : 0); n.happyR.setAttribute('opacity', happy ? 1 : 0);
  const [lift, tin] = e.brow;
  const by = -470 + lift;
  n.browL.setAttribute('d', `M-62 ${by + 6}Q-40 ${by - 6} -16 ${by + 2 - tin * 0.5}`);
  n.browR.setAttribute('d', `M16 ${by + 2 - tin * 0.5}Q40 ${by - 6} 62 ${by + 6}`);
  const m = mouthPath(fc.mouth || e.mouth, fc.env || 0);
  n.mouth.setAttribute('d', m.d); n.mouth.setAttribute('fill', m.fill);
  n.mouth.setAttribute('stroke', m.fill === 'none' ? PAL.mouth : 'none');
  n.cheekL.setAttribute('opacity', e.blush * 0.7); n.cheekR.setAttribute('opacity', e.blush * 0.7);
  return { B: [pB[0], pB[1] + bob], F: [pF[0], pF[1] + bob] };
}

// Karakter gaya datar sederhana (tanpa garis tepi, tanpa sendi siku):
//  - Nadia: bentuk blok & kepala bulat besar, mata titik, lengan satu potong.
//  - Kori: maskot MEDCOEL asli (SVG dari apps/web/src/mascots) dipakai apa adanya.
const NS = 'http://www.w3.org/2000/svg';
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const ease = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const el = (tag, attrs = {}, parent) => {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
};
const frag = (html) => { const g = document.createElementNS(NS, 'g'); g.innerHTML = html; return g; };

const SKIN = '#F2C29B', SKIN_D = '#E5AC82';
const HAIR = '#262A38';
const HOOD = '#F3E9CF', HOOD_D = '#E3D5AE';

// ============ NADIA ============
export function createNadia() {
  const root = el('g', { class: 'nadia' });
  const body = el('g', { class: 'n-body' }, root);
  body.appendChild(frag(`<ellipse cx="200" cy="318" rx="108" ry="38" fill="${HOOD_D}"/>`));
  body.appendChild(frag(`<path d="M86 210C66 96 132 44 200 44C268 44 334 96 314 210L322 322Q300 350 268 318L132 318Q100 350 78 322Z" fill="${HAIR}"/>`));
  body.appendChild(frag(`<path d="M52 580L62 380Q68 322 140 312L260 312Q332 322 338 380L348 580Z" fill="${HOOD}"/>
    <path d="M168 312Q200 366 232 312Z" fill="#F28B82"/>
    <path d="M186 326L180 420M214 326L220 416" stroke="${HOOD_D}" stroke-width="7" stroke-linecap="round"/>`));
  body.appendChild(frag(`<rect x="176" y="258" width="48" height="66" rx="22" fill="${SKIN_D}"/>`));
  const straps = el('g', { class: 'n-straps', opacity: 0 }, body);
  straps.appendChild(frag(`<path d="M104 330Q96 430 104 580M296 330Q304 430 296 580" fill="none" stroke="#1F5C54" stroke-width="34" stroke-linecap="round"/>`));
  const lanyard = el('g', { class: 'n-lanyard' }, body);
  lanyard.appendChild(frag(`<path d="M158 318L196 470M242 318L204 470" stroke="#00A383" stroke-width="9" stroke-linecap="round" fill="none"/>
    <rect x="174" y="468" width="52" height="68" rx="9" fill="#fff"/><rect x="174" y="468" width="52" height="16" rx="8" fill="#00A383"/>
    <circle cx="200" cy="506" r="9" fill="${SKIN}"/>`));

  const head = el('g', { class: 'n-head' }, body);
  head.appendChild(frag(`<path d="M200 66C288 66 316 132 312 192C307 258 258 296 200 296C142 296 93 258 88 192C84 132 112 66 200 66Z" fill="${SKIN}"/>`));
  head.appendChild(frag(`<ellipse cx="136" cy="238" rx="19" ry="11" fill="#F27C7C" class="n-blush" opacity=".35"/><ellipse cx="264" cy="238" rx="19" ry="11" fill="#F27C7C" class="n-blush" opacity=".35"/>`));
  const eyes = el('g', { class: 'n-eyes' }, head);
  const eyeL = el('ellipse', { cx: 156, cy: 202, rx: 11, ry: 15, fill: '#171B28' }, eyes);
  const eyeR = el('ellipse', { cx: 244, cy: 202, rx: 11, ry: 15, fill: '#171B28' }, eyes);
  const hiL = el('circle', { cx: 152, cy: 196, r: 3.4, fill: '#fff' }, eyes), hiR = el('circle', { cx: 240, cy: 196, r: 3.4, fill: '#fff' }, eyes);
  const happyEyes = el('path', { d: 'M138 208q18-24 36 0M226 208q18-24 36 0', fill: 'none', stroke: '#171B28', 'stroke-width': 9, 'stroke-linecap': 'round', opacity: 0 }, head);
  head.appendChild(frag(`<g fill="rgba(255,255,255,.14)" stroke="${HAIR}" stroke-width="5"><circle cx="156" cy="202" r="35"/><circle cx="244" cy="202" r="35"/></g>
    <path d="M190 198Q200 190 210 198M121 196L96 190M279 196L304 190" stroke="${HAIR}" stroke-width="5" fill="none" stroke-linecap="round"/>`));
  const browL = el('path', { fill: 'none', stroke: HAIR, 'stroke-width': 8, 'stroke-linecap': 'round' }, head);
  const browR = el('path', { fill: 'none', stroke: HAIR, 'stroke-width': 8, 'stroke-linecap': 'round' }, head);
  const mouth = el('path', { fill: 'none', stroke: '#8A3F36', 'stroke-width': 7, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, head);
  const sweat = el('g', { opacity: 0 }, head);
  sweat.appendChild(frag(`<path d="M322 120q15 26 6 38-9 12-21 1-9-13 15-39z" fill="#9FE3F6"/>`));
  head.appendChild(frag(`<path d="M90 206C78 100 140 58 200 58C268 58 326 100 310 206C296 150 262 128 232 130C196 160 130 148 90 206Z" fill="${HAIR}"/>
    <path d="M122 142Q142 112 186 106" fill="none" stroke="#3A4160" stroke-width="8" stroke-linecap="round"/>
    <g transform="translate(150 118) rotate(-32)"><rect x="-28" y="-10" width="56" height="20" rx="10" fill="#F8C038"/></g>`));

  const mkArm = (side) => {
    const g = el('g', { class: 'n-arm-' + side }, root);
    const inner = el('g', {}, g);
    inner.appendChild(frag(`<path d="M-30 0Q-31 8 -30 150Q-30 190 0 190Q30 190 30 150Q31 8 30 0Z" fill="${HOOD}"/>
      <rect x="-30" y="138" width="60" height="24" fill="${HOOD_D}"/>
      <circle cx="0" cy="206" r="30" fill="${SKIN}"/>`));
    return { g, inner };
  };
  const armL = mkArm('L'), armR = mkArm('R');
  return { root, body, head, eyeL, eyeR, hiL, hiR, happyEyes, browL, browR, mouth, sweat, armL, armR, straps, kind: 'nadia', eyes };
}

// Sudut "angkat" lengan: 0 = turun, 90 = lurus ke samping, 180 = lurus ke atas, >180 = condong ke kepala.
export const ARMS = {
  down: [6, 6], rest: [10, 10], panic: [192, 192], cheeks: [168, 168],
  wave: [140, 12], waveL: [12, 140], cheer: [158, 158], point: [8, 112],
  present: [8, 96], think: [8, 152], hold: [34, 34], shrug: [60, 60], thumb: [8, 140],
};

const BROWS = {
  neutral: [0, 0], panic: [-14, 26], worried: [-6, 18], happy: [-10, 0], think: [-4, 12], surprised: [-20, -6], smug: [-8, -2], sleepy: [8, 8],
};
export const EXPR = {
  neutral: { brow: 'neutral', eyes: 'dot', mouth: 'smile', blush: 0.3 },
  calm: { brow: 'neutral', eyes: 'dot', mouth: 'smile', blush: 0.3 },
  panic: { brow: 'panic', eyes: 'wide', mouth: 'wavy', blush: 0.15, sweat: 1 },
  worried: { brow: 'worried', eyes: 'dot', mouth: 'wavy', blush: 0.3 },
  happy: { brow: 'happy', eyes: 'happy', mouth: 'smile', blush: 0.55 },
  grin: { brow: 'happy', eyes: 'happy', mouth: 'grin', blush: 0.55 },
  think: { brow: 'think', eyes: 'dot', mouth: 'flat', blush: 0.3, look: [-0.7, -0.9] },
  surprised: { brow: 'surprised', eyes: 'wide', mouth: 'o', blush: 0.35 },
  aha: { brow: 'surprised', eyes: 'wide', mouth: 'grin', blush: 0.5 },
  nervous: { brow: 'worried', eyes: 'dot', mouth: 'wavy', blush: 0.4, sweat: 1 },
  sleepy: { brow: 'sleepy', eyes: 'half', mouth: 'flat', blush: 0.2 },
};

function mouthPath(kind, env) {
  const x = 200, y = 252;
  if (env > 0.08) {
    const h = 4 + env * 22, w = 15 + env * 6;
    return { d: `M${x - w} ${y - 2}Q${x} ${y - 6} ${x + w} ${y - 2}Q${x + w * 0.7} ${y + h} ${x} ${y + h}Q${x - w * 0.7} ${y + h} ${x - w} ${y - 2}Z`, fill: '#8A3F36', stroke: 'none' };
  }
  switch (kind) {
    case 'grin': return { d: `M${x - 24} ${y - 2}Q${x} ${y + 34} ${x + 24} ${y - 2}Z`, fill: '#8A3F36' };
    case 'wavy': return { d: `M${x - 22} ${y + 6}Q${x - 11} ${y - 7} ${x} ${y + 3}T${x + 22} ${y + 4}`, fill: 'none' };
    case 'flat': return { d: `M${x - 16} ${y + 3}L${x + 16} ${y + 3}`, fill: 'none' };
    case 'o': return { d: `M${x - 10} ${y}a10 13 0 1 0 20 0a10 13 0 1 0 -20 0z`, fill: '#8A3F36' };
    default: return { d: `M${x - 20} ${y}Q${x} ${y + 17} ${x + 20} ${y}`, fill: 'none' };
  }
}

export function poseNadia(r, p) {
  const e = EXPR[p.expr || 'neutral'];
  const t = p.t || 0, env = p.env || 0;
  const bob = Math.sin(t * 2.0) * 2.5 - env * 2;
  r.body.setAttribute('transform', `translate(0 ${bob.toFixed(2)})`);
  const tilt = (p.tilt || 0) + Math.sin(t * 1.2) * 1 + env * Math.sin(t * 8.5) * 1.6;
  r.head.setAttribute('transform', `translate(0 ${(env * 3).toFixed(2)}) rotate(${tilt.toFixed(2)} 200 300)`);
  const wide = e.eyes === 'wide', happy = e.eyes === 'happy', half = e.eyes === 'half';
  const look = p.look || e.look || [0, 0];
  const blink = clamp(p.blink || 0, 0, 1);
  const sy = Math.max(0.1, (half ? 0.45 : 1) * (1 - blink * 0.92));
  for (const [eye, hi, cx] of [[r.eyeL, r.hiL, 156], [r.eyeR, r.hiR, 244]]) {
    eye.setAttribute('cx', cx + look[0] * 6); eye.setAttribute('cy', 202 + look[1] * 5);
    eye.setAttribute('rx', wide ? 13 : 11); eye.setAttribute('ry', (wide ? 19 : 15) * sy);
    hi.setAttribute('cx', cx - 4 + look[0] * 6); hi.setAttribute('cy', 196 + look[1] * 5);
    hi.setAttribute('opacity', happy || sy < 0.5 ? 0 : 1);
    eye.setAttribute('opacity', happy ? 0 : 1);
  }
  r.happyEyes.setAttribute('opacity', happy ? 1 : 0);
  const [lift, tin] = BROWS[e.brow];
  const by = 150 + lift;
  r.browL.setAttribute('d', `M120 ${by + 6}Q150 ${by - 6} 186 ${by + 3 - tin * 0.6}`);
  r.browR.setAttribute('d', `M214 ${by + 3 - tin * 0.6}Q250 ${by - 6} 280 ${by + 6}`);
  const m = mouthPath(p.mouth || e.mouth, env);
  r.mouth.setAttribute('d', m.d); r.mouth.setAttribute('fill', m.fill);
  r.mouth.setAttribute('stroke', m.stroke || '#8A3F36');
  r.head.querySelectorAll('.n-blush').forEach((b) => b.setAttribute('opacity', p.blush != null ? p.blush : e.blush));
  const sw = p.sweat != null ? p.sweat : e.sweat || 0;
  r.sweat.setAttribute('opacity', sw);
  if (sw) r.sweat.setAttribute('transform', `translate(0 ${((t * 36) % 22).toFixed(1)})`);
  r.straps.setAttribute('opacity', p.straps ? 1 : 0);
  const a = p.arms || ARMS.rest;
  const wig = Math.sin(t * 1.7) * 1.2;
  const wave = (p.wave || 0) * Math.sin(t * 9) * 14;
  r.armL.g.setAttribute('transform', `translate(78 352) rotate(${(a[0] + wig + (p.waveSide === 'L' ? wave : 0)).toFixed(2)})`);
  r.armR.g.setAttribute('transform', `translate(322 352) rotate(${(-(a[1] - wig) + (p.waveSide === 'R' ? wave : 0)).toFixed(2)})`);
}

// ============ MASKOT (SVG asli dari web) ============
export function createMascot(svgText, name) {
  const root = el('g', { class: 'mascot ' + name });
  const inner = el('g', {}, root);
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml').documentElement;
  inner.innerHTML = doc.innerHTML;
  const q = (s) => inner.querySelector(s);
  return {
    root, inner, name,
    float: q('.mc-float'),
    eyesN: q('.mc-eyes-normal'), eyesH: q('.mc-eyes-happy'),
    mN: q('.mc-mouth-normal'), mH: q('.mc-mouth-happy'), mT: q('.mc-mouth-think'),
    arm: q('.mc-arm-right'), spark: q('.mc-spark'),
    dots: [...inner.querySelectorAll('.mc-eyes > circle')],
  };
}

export function poseMascot(r, p) {
  const t = p.t || 0, env = p.env || 0;
  const mood = p.mood || 'normal'; // normal | happy | think
  const happy = mood === 'happy';
  const ph = p.phase || 0;
  const bob = Math.sin(t * 2.3 + ph) * 6 - env * 4;
  const sq = 1 + Math.sin(t * 2.3 + ph + 1.2) * 0.012;
  r.float.setAttribute('transform', `translate(0 ${bob.toFixed(2)}) rotate(${((p.tilt || 0) + Math.sin(t * 1.4 + ph) * 1.4).toFixed(2)} 160 260) scale(1 ${sq.toFixed(3)})`);
  const blinking = (p.blink || 0) > 0.5;
  if (r.eyesN) {
    r.eyesN.setAttribute('opacity', happy ? 0 : 1);
    r.eyesN.setAttribute('style', `transform-box:fill-box;transform-origin:center;transform:scaleY(${blinking ? 0.1 : 1})`);
  }
  if (r.eyesH) r.eyesH.setAttribute('opacity', happy ? 1 : 0);
  r.dots.forEach((c) => c.setAttribute('opacity', happy || blinking ? 0 : 1));
  const speaking = env > 0.1;
  if (r.mN) r.mN.setAttribute('opacity', !speaking && mood === 'normal' ? 1 : 0);
  if (r.mT) r.mT.setAttribute('opacity', !speaking && mood === 'think' ? 1 : 0);
  if (r.mH) {
    if (speaking) {
      r.mH.setAttribute('opacity', 1);
      r.mH.setAttribute('style', `transform-box:fill-box;transform-origin:50% 0%;transform:scale(${(0.8 + env * 0.5).toFixed(2)},${(0.5 + env * 0.9).toFixed(2)})`);
    } else {
      r.mH.setAttribute('opacity', happy ? 1 : 0);
      r.mH.setAttribute('style', 'transform-box:fill-box;transform-origin:50% 0%;transform:none');
    }
  }
  if (r.arm) {
    const w = (p.wave || 0) * (Math.sin(t * 9) * 16 - 10);
    r.arm.setAttribute('style', `transform-box:fill-box;transform-origin:10% 60%;transform:rotate(${(w + (p.arm || 0)).toFixed(1)}deg)`);
  }
  if (r.spark) r.spark.setAttribute('opacity', 0.7 + Math.sin(t * 6) * 0.3);
}

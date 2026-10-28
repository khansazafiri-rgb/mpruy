// Rig karakter 2D datar untuk "Dunia tanpa oralit".
// Prinsip: tidak ada garis tepi dan tidak ada lingkaran sendi. Lengan dan kaki adalah SATU pita lengkung
// (poligon dari garis tengah bezier dengan lebar yang menyempit), berwarna sama dengan baju sehingga menyatu
// dengan badan. Tangan berupa gumpalan kulit. Semua dihitung dari parameter pose, jadi tiap frame deterministik.
const NS = 'http://www.w3.org/2000/svg';
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const ease = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
export const easeInOut = (t) => { t = clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
export const easeOut = (t) => { t = clamp(t, 0, 1); return 1 - Math.pow(1 - t, 3); };
export const easeOutBack = (x) => { x = clamp(x, 0, 1); const c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
export const mix = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));

export const el = (tag, attrs = {}, parent) => {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
};
const f1 = (v) => (Math.round(v * 10) / 10);

// ---- pita lengkung ----
// pts: [S, E, W]; lebar w0 (bahu) -> w1 (siku) -> w2 (pergelangan). Kurva halus melewati titik siku.
export function ribbonPath(S, E, W, w0, w1, w2, n = 22) {
  const C = [2 * E[0] - (S[0] + W[0]) / 2, 2 * E[1] - (S[1] + W[1]) / 2];
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    const x = u * u * S[0] + 2 * u * t * C[0] + t * t * W[0];
    const y = u * u * S[1] + 2 * u * t * C[1] + t * t * W[1];
    const dx = 2 * u * (C[0] - S[0]) + 2 * t * (W[0] - C[0]);
    const dy = 2 * u * (C[1] - S[1]) + 2 * t * (W[1] - C[1]);
    const L = Math.hypot(dx, dy) || 1;
    const w = t < 0.5 ? lerp(w0, w1, ease(t * 2)) : lerp(w1, w2, ease((t - 0.5) * 2));
    pts.push({ x, y, nx: -dy / L, ny: dx / L, w, dx: dx / L, dy: dy / L });
  }
  const left = pts.map((p) => [p.x + p.nx * p.w / 2, p.y + p.ny * p.w / 2]);
  const right = pts.map((p) => [p.x - p.nx * p.w / 2, p.y - p.ny * p.w / 2]).reverse();
  const a = pts[n], b = pts[0];
  // tutup ujung dengan setengah lingkaran (kuadrat) agar bulat
  const capW = [a.x + a.dx * a.w * 0.62, a.y + a.dy * a.w * 0.62];
  const capS = [b.x - b.dx * b.w * 0.62, b.y - b.dy * b.w * 0.62];
  let d = `M${f1(left[0][0])} ${f1(left[0][1])}`;
  for (let i = 1; i < left.length; i++) d += `L${f1(left[i][0])} ${f1(left[i][1])}`;
  d += `Q${f1(capW[0] + a.nx * a.w * 0.5)} ${f1(capW[1] + a.ny * a.w * 0.5)} ${f1(capW[0])} ${f1(capW[1])}`;
  d += `Q${f1(capW[0] - a.nx * a.w * 0.5)} ${f1(capW[1] - a.ny * a.w * 0.5)} ${f1(right[0][0])} ${f1(right[0][1])}`;
  for (let i = 1; i < right.length; i++) d += `L${f1(right[i][0])} ${f1(right[i][1])}`;
  d += `Q${f1(capS[0] - b.nx * b.w * 0.5)} ${f1(capS[1] - b.ny * b.w * 0.5)} ${f1(capS[0])} ${f1(capS[1])}`;
  d += `Q${f1(capS[0] + b.nx * b.w * 0.5)} ${f1(capS[1] + b.ny * b.w * 0.5)} ${f1(left[0][0])} ${f1(left[0][1])}Z`;
  const last = pts[n];
  return { d, end: [last.x, last.y], dir: [last.dx, last.dy] };
}

// IK dua tulang: kembalikan titik siku. bend = +1/-1 sisi tekukan
export function ik2(S, W, L1, L2, bend) {
  let dx = W[0] - S[0], dy = W[1] - S[1];
  let d = Math.hypot(dx, dy);
  const dmax = (L1 + L2) * 0.985, dmin = Math.abs(L1 - L2) + 4;
  const dc = clamp(d, dmin, dmax);
  const ux = dx / (d || 1), uy = dy / (d || 1);
  const a = (dc * dc + L1 * L1 - L2 * L2) / (2 * dc);
  const h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
  const E = [S[0] + ux * a - uy * h * bend, S[1] + uy * a + ux * h * bend];
  const Wc = [S[0] + ux * dc, S[1] + uy * dc];
  return { E, W: Wc };
}

// ---- profil karakter ----
export const PROFILES = {
  parent: {
    s: 1, headR: 84, headY: -520, neckY: -442, shY: -430, hipY: -222, shW: 112, hipW: 104, tw: 214,
    arm: [118, 108], armW: [50, 42, 33], leg: [108, 108], legW: [56, 46, 40], hipX: 34,
    skin: '#E8B48A', skinD: '#D89F74', hair: '#2A2433', top: '#F2B04C', topD: '#E39F3A', inner: '#FFF6E4',
    pants: '#5E7F9A', shoe: '#2F3E4D', blush: '#E98B7A', hand: 24,
  },
  child: {
    s: 1, headR: 78, headY: -330, neckY: -268, shY: -262, hipY: -128, shW: 84, hipW: 82, tw: 160,
    arm: [74, 68], armW: [38, 32, 27], leg: [64, 64], legW: [40, 33, 29], hipX: 22,
    skin: '#F0C09A', skinD: '#E0A97F', hair: '#3A2C2A', top: '#8CCBE6', topD: '#79BCD9', inner: '#8CCBE6',
    pants: '#F4D88A', shoe: '#E8665F', blush: '#EF8C80', hand: 20,
  },
};

let uid = 0;
export function createPerson(kind) {
  const P = PROFILES[kind];
  const id = 'p' + (uid++);
  const root = el('g', { class: 'person ' + kind });
  const defs = el('defs', {}, root);
  const gradL = el('linearGradient', { id: id + 'gl', gradientUnits: 'userSpaceOnUse' }, defs);
  el('stop', { offset: 0, 'stop-color': P.top }, gradL); el('stop', { offset: 0.55, 'stop-color': P.top }, gradL); el('stop', { offset: 1, 'stop-color': P.topD }, gradL);
  const gradR = el('linearGradient', { id: id + 'gr', gradientUnits: 'userSpaceOnUse' }, defs);
  el('stop', { offset: 0, 'stop-color': P.top }, gradR); el('stop', { offset: 0.55, 'stop-color': P.top }, gradR); el('stop', { offset: 1, 'stop-color': P.topD }, gradR);
  const shadow = el('ellipse', { cx: 0, cy: 6, rx: P.tw * 0.62, ry: 16, fill: '#172B38', opacity: 0.1 }, root);
  const body = el('g', { class: 'body' }, root);
  const armBack = el('g', {}, body);
  const legL = el('path', { fill: P.pants }, body), legR = el('path', { fill: P.pants }, body);
  const footL = el('path', { fill: P.shoe }, body), footR = el('path', { fill: P.shoe }, body);
  const neckEl = el('path', { fill: P.skinD }, body);
  const torsoG = el('g', { class: 'torso' }, body);
  const torso = el('path', { fill: P.top }, torsoG);
  const vneck = el('path', { fill: P.inner }, torsoG);
  const hips = el('path', { fill: P.pants }, body);
  const headG = el('g', { class: 'head' }, body);
  const hairBack = el('path', { fill: P.hair }, headG);
  const earL = el('ellipse', { rx: 13, ry: 17, fill: P.skin }, headG), earR = el('ellipse', { rx: 13, ry: 17, fill: P.skin }, headG);
  const face = el('ellipse', { rx: P.headR * 0.98, ry: P.headR, fill: P.skin }, headG);
  const feat = el('g', {}, headG);
  const blushL = el('ellipse', { rx: 16, ry: 9, fill: P.blush, opacity: 0.45 }, feat), blushR = el('ellipse', { rx: 16, ry: 9, fill: P.blush, opacity: 0.45 }, feat);
  const eyeL = el('ellipse', { rx: 8.5, ry: 12, fill: '#1F2430' }, feat), eyeR = el('ellipse', { rx: 8.5, ry: 12, fill: '#1F2430' }, feat);
  const glintL = el('circle', { r: 3, fill: '#fff' }, feat), glintR = el('circle', { r: 3, fill: '#fff' }, feat);
  const lidL = el('path', { fill: 'none', stroke: '#1F2430', 'stroke-width': 6, 'stroke-linecap': 'round' }, feat), lidR = el('path', { fill: 'none', stroke: '#1F2430', 'stroke-width': 6, 'stroke-linecap': 'round' }, feat);
  const browL = el('path', { fill: 'none', stroke: P.hair, 'stroke-width': 7, 'stroke-linecap': 'round' }, feat), browR = el('path', { fill: 'none', stroke: P.hair, 'stroke-width': 7, 'stroke-linecap': 'round' }, feat);
  const nose = el('path', { fill: 'none', stroke: P.skinD, 'stroke-width': 5, 'stroke-linecap': 'round' }, feat);
  const mouth = el('path', { fill: 'none', stroke: '#8A3F36', 'stroke-width': 6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, feat);
  const hairFront = el('path', { fill: P.hair }, headG);
  const armFront = el('g', {}, body);
  const prop = el('g', { class: 'prop' }, root);
  const overlay = el('g', { class: 'overlay' });
  return { overlay, kind, P, id, root, body, armBack, armFront, legL, legR, footL, footR, torsoG, torso, neckEl, vneck, hips, headG, hairBack, earL, earR, face, feat, blushL, blushR, eyeL, eyeR, glintL, glintR, lidL, lidR, browL, browR, nose, mouth, hairFront, gradL, gradR, shadow, prop };
}

// ---- bentuk wajah ----
function mouthD(kind, env, w = 1) {
  const x = 22 * w;
  switch (kind) {
    case 'smile': return { d: `M${-x} 0Q0 ${18} ${x} 0`, fill: 'none' };
    case 'smallsmile': return { d: `M${-x * 0.7} 0Q0 ${11} ${x * 0.7} 0`, fill: 'none' };
    case 'bigsmile': return { d: `M${-x * 1.1} -2Q0 ${34} ${x * 1.1} -2Z`, fill: '#8A3F36' };
    case 'flat': return { d: `M${-x * 0.6} 3Q0 0 ${x * 0.6} 3`, fill: 'none' };
    case 'worry': return { d: `M${-x * 0.8} 8Q0 -6 ${x * 0.8} 8`, fill: 'none' };
    case 'o': return { d: `M-8 -2Q0 -10 8 -2Q12 8 0 11Q-12 8 -8 -2Z`, fill: '#8A3F36' };
    case 'sip': return { d: `M-9 0Q0 -4 9 0Q0 9 -9 0Z`, fill: '#8A3F36' };
    default: return { d: `M${-x * 0.7} 2Q0 8 ${x * 0.7} 2`, fill: 'none' };
  }
}
const BROWS = { neutral: [0, 0], up: [-8, 0], worry: [-2, 10], sad: [2, 9], happy: [-6, -2], focus: [2, -8] };

// ---- pose ----
// p: { x, y, s, flip, lean, headTilt, look:[lx,ly], expr:{brow,eye,mouth}, blink, env,
//      armL:{w:[x,y], bend}, armR:{...}, walk:{phase, amp}, seated, kneel, t }
export function posePerson(r, p) {
  const P = r.P, t = p.t || 0;
  const s = (p.s || 1) * (P.s || 1), flip = p.flip || 1;
  r.root.setAttribute('transform', `translate(${f1(p.x)} ${f1(p.y)}) scale(${f1(s * flip * 1000) / 1000} ${f1(s * 1000) / 1000})`);
  r.shadow.setAttribute('opacity', p.noShadow ? 0 : 0.1);
  const breathe = Math.sin(t * 2.2 + (p.ph || 0)) * 1.0;
  const seated = !!p.seated;
  const lean = p.lean || 0;
  const bob = p.walk ? -Math.abs(Math.sin(p.walk.phase)) * 9 * (p.walk.amp ?? 1) : 0;
  const hipY = P.hipY + (p.hipDrop || 0);
  const shY = P.shY + (p.hipDrop || 0) + bob + breathe * 0.4;
  const px = p.torsoShift || 0;

  // torso: bentuk membulat, rotasi (condong) di pinggul
  const tw = P.tw / 2, sw = P.shW, hw = P.hipW;
  const nb = 36; // pangkal leher
  const hem = hipY + 38;
  const tp = `M${-nb} ${shY - 6}Q${-sw * 0.72} ${shY - 6} ${-sw} ${shY + 34}Q${-sw - 4} ${shY + 80} ${-hw - 2} ${hem - 40}Q${-hw - 6} ${hem} ${-hw + 22} ${hem}L${hw - 22} ${hem}Q${hw + 6} ${hem} ${hw + 2} ${hem - 40}Q${sw + 4} ${shY + 80} ${sw} ${shY + 34}Q${sw * 0.72} ${shY - 6} ${nb} ${shY - 6}Z`;
  r.torso.setAttribute('d', tp);
  const cT = 1 - 0.26 * Math.abs(p.turn || 0);
  r.torsoG.setAttribute('transform', `rotate(${lean} 0 ${hipY}) translate(${px + (p.turn || 0) * 8} 0) scale(${cT} 1)`);
  r.vneck.setAttribute('d', `M-30 ${shY - 4}Q0 ${shY + 54} 30 ${shY - 4}Q0 ${shY + 22} -30 ${shY - 4}Z`);
  r.vneck.setAttribute('opacity', r.kind === 'parent' ? 1 : 0);
  r.hips.setAttribute('d', `M${-hw + 14} ${hipY + 20}L${hw - 14} ${hipY + 20}L${hw - 10} ${hipY + 52}L${-hw + 10} ${hipY + 52}Z`);
  r.hips.setAttribute('opacity', 0);

  // kepala
  const hr = P.headR;
  const rotP = (x, y) => { const c = Math.cos(lean * Math.PI / 180), s_ = Math.sin(lean * Math.PI / 180), dx = x, dy = y - hipY; return [dx * c - dy * s_, dx * s_ + dy * c + hipY]; };
  const tx0 = px + (p.turn || 0) * 8;
  const [hx, hy] = rotP(tx0 + (p.turn || 0) * 3 + (p.look ? p.look[0] * 3 : 0), P.headY + (shY - P.shY));
  const tilt = (p.headTilt || 0) + lean * 0.3;
  r.headG.setAttribute('transform', `translate(${f1(hx)} ${f1(hy)}) rotate(${f1(tilt)} 0 ${f1(P.headR * 0.8)})`);
  // leher: pita dari dalam badan sampai ke dagu, selalu menyambung dengan kepala
  const nBase = rotP(tx0, shY + 26), nTop = [hx + Math.sin(tilt * Math.PI / 180) * -P.headR * 0.4, hy + P.headR * 0.62];
  const nMid = [(nBase[0] + nTop[0]) / 2, (nBase[1] + nTop[1]) / 2];
  r.neckEl.setAttribute('d', ribbonPath(nBase, nMid, nTop, 54, 48, 46, 8).d);
  r.face.setAttribute('cx', 0); r.face.setAttribute('cy', 0);
  r.earL.setAttribute('cx', -hr * 0.97); r.earL.setAttribute('cy', 8); r.earR.setAttribute('cx', hr * 0.97); r.earR.setAttribute('cy', 8);
  const look = p.look || [0, 0];
  const fx = look[0] * 16, fy = look[1] * 8 + 10;
  r.feat.setAttribute('transform', `translate(${f1(fx)} ${f1(fy)})`);
  const ex = hr * 0.38;
  const ey = -4;
  const ex_ = p.expr || {};
  const blink = clamp(p.blink || 0, 0, 1);
  const eye = ex_.eye || 'open';
  const closed = eye === 'happy' || eye === 'closed';
  const lidH = eye === 'sleepy' ? 0.55 : 1;
  const sy = (closed ? 0 : 1) * lidH * (1 - blink * 0.92);
  for (const [e, g, lid, sx] of [[r.eyeL, r.glintL, r.lidL, -1], [r.eyeR, r.glintR, r.lidR, 1]]) {
    e.setAttribute('cx', sx * ex + look[0] * 3); e.setAttribute('cy', ey + look[1] * 3);
    e.setAttribute('ry', f1(12 * Math.max(sy, 0.06))); e.setAttribute('rx', eye === 'wide' ? 9.5 : 8.5);
    e.setAttribute('opacity', closed ? 0 : 1);
    g.setAttribute('cx', sx * ex - 3 + look[0] * 3); g.setAttribute('cy', ey - 5 + look[1] * 3);
    g.setAttribute('opacity', closed || sy < 0.5 ? 0 : 1);
    lid.setAttribute('d', eye === 'happy' ? `M${sx * ex - 12} ${ey + 4}Q${sx * ex} ${ey - 14} ${sx * ex + 12} ${ey + 4}` : eye === 'closed' ? `M${sx * ex - 11} ${ey}Q${sx * ex} ${ey + 8} ${sx * ex + 11} ${ey}` : '');
    lid.setAttribute('opacity', closed ? 1 : 0);
  }
  const bw = BROWS[ex_.brow || 'neutral'];
  const by = -26 + bw[0];
  const bo = bw[1] * 0.3, bi = -bw[1] * 0.4; // ujung luar / dalam alis: cemas = bagian dalam naik
  r.browL.setAttribute('d', `M${-ex - 15} ${by + bo}Q${-ex} ${by - 7} ${-ex + 15} ${by + bi}`);
  r.browR.setAttribute('d', `M${ex - 15} ${by + bi}Q${ex} ${by - 7} ${ex + 15} ${by + bo}`);
  r.blushL.setAttribute('cx', -ex - 14); r.blushL.setAttribute('cy', 24); r.blushR.setAttribute('cx', ex + 14); r.blushR.setAttribute('cy', 24);
  r.nose.setAttribute('d', `M-4 12Q0 17 5 12`);
  const env = clamp(p.env || 0, 0, 1);
  const m = env > 0.06 ? { d: `M-15 0Q0 ${-4 + env * 8} 15 0Q${15} ${6 + env * 26} 0 ${8 + env * 28}Q-15 ${6 + env * 26} -15 0Z`, fill: '#8A3F36' } : mouthD(ex_.mouth || 'smile', 0);
  r.mouth.setAttribute('d', m.d); r.mouth.setAttribute('fill', m.fill);
  r.mouth.setAttribute('transform', `translate(0 38)`);
  // rambut
  const hs = r.kind === 'parent';
  if (hs) {
    r.hairBack.setAttribute('d', `M${-hr - 6} 6Q${-hr - 10} ${-hr * 1.18} 0 ${-hr * 1.12}Q${hr + 10} ${-hr * 1.18} ${hr + 6} 6Q${hr + 2} ${hr * 0.5} ${hr * 0.7} ${hr * 0.7}L${-hr * 0.7} ${hr * 0.7}Q${-hr - 2} ${hr * 0.5} ${-hr - 6} 6Z`);
    r.hairFront.setAttribute('d', `M${-hr - 2} -6Q${-hr - 6} ${-hr * 1.1} 0 ${-hr * 1.08}Q${hr + 6} ${-hr * 1.1} ${hr + 2} -6Q${hr * 0.7} ${-hr * 0.5} ${hr * 0.15} ${-hr * 0.62}Q${-hr * 0.5} ${-hr * 0.5} ${-hr * 0.78} ${-hr * 0.2}Q${-hr * 0.9} 0 ${-hr - 2} -6Z`);
  } else {
    r.hairBack.setAttribute('d', `M${-hr - 2} -4Q${-hr - 4} ${-hr * 1.08} 0 ${-hr * 1.06}Q${hr + 4} ${-hr * 1.08} ${hr + 2} -4Q${hr * 0.5} ${-hr * 0.45} 0 ${-hr * 0.5}Q${-hr * 0.5} ${-hr * 0.45} ${-hr - 2} -4Z`);
    r.hairFront.setAttribute('d', `M${-hr * 0.2} ${-hr * 1.04}Q${-hr * 0.1} ${-hr * 1.36} ${hr * 0.18} ${-hr * 1.3}Q${hr * 0.05} ${-hr * 1.15} ${hr * 0.3} ${-hr * 1.02}Z`);
  }

  // kaki
  const walk = p.walk;
  const hipXs = [-P.hipX, P.hipX];
  const legPaths = [r.legL, r.legR], feet = [r.footL, r.footR];
  if (seated) {
    legPaths.forEach((l) => l.setAttribute('d', '')); feet.forEach((f) => f.setAttribute('d', ''));
  } else {
    for (let i = 0; i < 2; i++) {
      const sgn = i === 0 ? -1 : 1;
      const H = [hipXs[i], hipY + 6];
      let ankle;
      let toeUp = 0;
      if (walk) {
        const ph = walk.phase + (i === 0 ? 0 : Math.PI);
        const amp = walk.amp ?? 1;
        ankle = [H[0] * 0.8 + Math.sin(ph) * 46 * amp, -4 - Math.max(0, Math.cos(ph)) * 26 * amp];
        toeUp = Math.max(0, Math.cos(ph)) * 0.3;
      } else {
        ankle = [H[0] * 1.05 + (p.stance ?? 0) * sgn, -4];
      }
      const kneeRes = ik2(H, ankle, P.leg[0], P.leg[1], walk ? -1 : 1);
      const rb = ribbonPath(H, kneeRes.E, kneeRes.W, P.legW[0], P.legW[1], P.legW[2], 14);
      legPaths[i].setAttribute('d', rb.d);
      const fxp = kneeRes.W[0], fyp = kneeRes.W[1];
      const L = P.legW[2] * 1.0;
      feet[i].setAttribute('d', `M${f1(fxp - L * 0.62)} ${f1(fyp - 6)}Q${f1(fxp - L * 0.7)} ${f1(fyp + 14)} ${f1(fxp - L * 0.2)} ${f1(fyp + 15)}L${f1(fxp + L * 1.0)} ${f1(fyp + 15)}Q${f1(fxp + L * 1.5)} ${f1(fyp + 14)} ${f1(fxp + L * 1.1)} ${f1(fyp - 2)}Q${f1(fxp + L * 0.5)} ${f1(fyp - 10)} ${f1(fxp - L * 0.1)} ${f1(fyp - 14)}Z`);
      feet[i].setAttribute('transform', `translate(${f1(fxp)} ${f1(fyp)}) rotate(${f1(-toeUp * 20)}) translate(${f1(-fxp)} ${f1(-fyp)})`);
    }
  }

  // lengan
  r.armBack.innerHTML = ''; r.armFront.innerHTML = '';
  if (r.overlay) { r.overlay.innerHTML = ''; r.overlay.setAttribute('transform', r.root.getAttribute('transform')); }
  const rotC = lean * Math.PI / 180;
  const arms = [['L', p.armL], ['R', p.armR]];
  for (const [side, a] of arms) {
    const sgn = side === 'L' ? -1 : 1;
    let Sx = sgn * (sw - 14) * (1 - 0.26 * Math.abs(p.turn || 0)), Sy = shY + 38;
    // ikut condong badan
    const dx = Sx - 0, dy = Sy - hipY;
    Sx = dx * Math.cos(rotC) - dy * Math.sin(rotC) + px; Sy = dx * Math.sin(rotC) + dy * Math.cos(rotC) + hipY;
    let W = a ? a.w : [Sx + sgn * 16, Sy + (P.arm[0] + P.arm[1]) * 0.93];
    const idle = Math.sin(t * 1.6 + (sgn > 0 ? 1.2 : 0)) * 3;
    if (!a || a.idle !== false) W = [W[0] + idle * 0.5, W[1] + idle];
    const bend = (a && a.bend != null ? a.bend : 1);
    const res = ik2([Sx, Sy], W, P.arm[0], P.arm[1], -sgn * bend);
    const rb = ribbonPath([Sx, Sy], res.E, res.W, P.armW[0], P.armW[1], P.armW[2], 18);
    const target = (a && a.back) ? r.armBack : (a && a.top && r.overlay ? r.overlay : r.armFront);
    const grad = side === 'L' ? r.gradL : r.gradR;
    grad.setAttribute('x1', Sx); grad.setAttribute('y1', Sy); grad.setAttribute('x2', res.W[0]); grad.setAttribute('y2', res.W[1]);
    const g = el('g', {}, target);
    el('path', { d: rb.d, fill: `url(#${r.id}${side === 'L' ? 'gl' : 'gr'})` }, g);
    const ang = Math.atan2(rb.dir[1], rb.dir[0]) * 180 / Math.PI;
    const hs = P.hand * (a && a.fist ? 0.9 : 1);
    const hg = el('g', { transform: `translate(${f1(rb.end[0])} ${f1(rb.end[1])}) rotate(${f1(ang - 90)})` }, g);
    el('ellipse', { cx: 0, cy: hs * 0.7, rx: hs * 0.82, ry: hs * 1.02, fill: P.skin }, hg);
    el('ellipse', { cx: -sgn * hs * 0.72, cy: hs * 0.25, rx: hs * 0.36, ry: hs * 0.62, fill: P.skin, transform: `rotate(${sgn * 20} ${-sgn * hs * 0.72} ${hs * 0.25})` }, hg);
    if (a) a._end = { W: res.W, E: res.E, ang };
  }
  return null;
}

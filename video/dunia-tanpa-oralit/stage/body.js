// Metafora "di dalam tubuh": siluet anak yang membulat, perut berupa tabung kaca berisi air (tetesan biru)
// dan elektrolit (bentuk berlian emas). Bukan diagram anatomi dan tidak memakai angka.
import { el, clamp, lerp, ease } from './rig.js';
import { C } from './world.js';

let ids = 0;
const TANK = { x: 400, y: 720, w: 280, h: 400, r: 78 };
const EXIT = { x: 540, y: 1180 };

export function createBody(parent, opts = {}) {
  const id = 'b' + (ids++);
  const root = el('g', { class: 'bodyview' }, parent);
  const defs = el('defs', {}, root);
  const clip = el('clipPath', { id: id + 'c' }, defs);
  el('rect', { x: TANK.x + 8, y: TANK.y + 8, width: TANK.w - 16, height: TANK.h - 16, rx: TANK.r - 8 }, clip);
  if (opts.bg !== false) {
    el('rect', { x: -40, y: -40, width: 1160, height: 1700, fill: '#E5F6EE' }, root);
    for (let i = 0; i < 9; i++) el('circle', { cx: 80 + (i * 197) % 1000, cy: 120 + (i * 331) % 1300, r: 40 + (i * 29) % 70, fill: '#fff', opacity: 0.35 }, root);
  }
  const sil = el('g', {}, root);
  sil.innerHTML = `
    <path d="M300 650Q300 566 384 562L696 562Q780 566 780 650L780 1070Q780 1186 662 1186L418 1186Q300 1186 300 1070Z" fill="#BDE7D6"/>
    <rect x="236" y="640" width="108" height="330" rx="54" fill="#B0DECB"/><rect x="736" y="640" width="108" height="330" rx="54" fill="#B0DECB"/>
    <rect x="496" y="520" width="88" height="70" rx="30" fill="#B0DECB"/>
    <circle cx="540" cy="410" r="150" fill="#C8ECDC"/>
    <path d="M488 400q16 14 32 0M560 400q16 14 32 0" fill="none" stroke="#3A6B5F" stroke-width="8" stroke-linecap="round"/>
    <path d="M520 468q20 8 40 0" fill="none" stroke="#3A6B5F" stroke-width="8" stroke-linecap="round"/>
    <ellipse cx="462" cy="446" rx="22" ry="12" fill="#F3A99A" opacity=".5"/><ellipse cx="618" cy="446" rx="22" ry="12" fill="#F3A99A" opacity=".5"/>`;
  // tabung
  const tank = el('g', {}, root);
  el('rect', { x: TANK.x, y: TANK.y, width: TANK.w, height: TANK.h, rx: TANK.r, fill: '#fff', opacity: 0.94 }, tank);
  const inner = el('g', { 'clip-path': `url(#${id}c)` }, tank);
  const liquidBack = el('path', { fill: C.waterD, opacity: 0.55 }, inner);
  const liquid = el('path', { fill: C.water }, inner);
  const ambient = el('g', {}, inner);
  const ring = el('rect', { x: TANK.x, y: TANK.y, width: TANK.w, height: TANK.h, rx: TANK.r, fill: 'none', stroke: '#37B983', 'stroke-width': 14 }, tank);
  el('path', { d: `M${TANK.x + 34} ${TANK.y + 70}Q${TANK.x + 30} ${TANK.y + 150} ${TANK.x + 40} ${TANK.y + 230}`, fill: 'none', stroke: '#fff', 'stroke-width': 10, 'stroke-linecap': 'round', opacity: 0.6 }, tank);
  // pangkal aliran keluar
  const flow = el('g', {}, root);
  const NA = 11, NF = 14;
  const mk = (kind, parentG) => {
    const g = el('g', {}, parentG);
    if (kind === 0) el('path', { d: 'M0 -17Q15 6 15 12a15 15 0 0 1-30 0Q-15 6 0 -17z', fill: C.water }, g);
    else { el('path', { d: 'M0 -18L16 0 0 18-16 0z', fill: C.elec }, g); el('path', { d: 'M0 -18L16 0H-16z', fill: '#FBD56B' }, g); }
    return g;
  };
  const amb = Array.from({ length: NA }, (_, i) => mk(i % 2, ambient));
  const fl = Array.from({ length: NF }, (_, i) => mk(i % 2, flow));
  const glass = el('g', { transform: 'translate(540 230)', opacity: 0 }, root);
  glass.innerHTML = `<path d="M-40 -56L40 -56L34 20Q33 30 23 30L-23 30Q-33 30 -34 20Z" fill="#fff" stroke="#9ED3E8" stroke-width="6"/><path d="M-36 -22L36 -22L34 20Q33 30 23 30L-23 30Q-33 30 -34 20Z" fill="#F7E7AE"/>`;
  const wave = (top, a, ph, t) => {
    let d = `M${TANK.x} ${TANK.y + TANK.h + 20}L${TANK.x} ${top}`;
    for (let x = 0; x <= TANK.w; x += 20) d += `L${TANK.x + x} ${(top + Math.sin(x * 0.045 + t * 2.1 + ph) * a).toFixed(1)}`;
    return d + `L${TANK.x + TANK.w} ${TANK.y + TANK.h + 20}Z`;
  };
  return {
    root, tankRect: TANK,
    // p: { t, level (0..1), mode: 'out'|'in'|'off', flow (0..1), danger (0..1), glass (0..1) }
    update(p) {
      const t = p.t, L = clamp(p.level, 0.05, 1);
      const innerH = TANK.h - 16;
      const top = TANK.y + 8 + innerH * (1 - L);
      liquid.setAttribute('d', wave(top, 5, 0, t));
      liquidBack.setAttribute('d', wave(top - 6, 6, 1.7, t * 0.8));
      const dg = clamp(p.danger || 0, 0, 1);
      ring.setAttribute('stroke', dg > 0.5 ? (dg > 0.85 ? '#F07E3A' : '#F2A93E') : '#37B983');
      amb.forEach((g, i) => {
        const x = TANK.x + 60 + ((i * 67) % 160) + Math.sin(t * 1.3 + i) * 8;
        const y = top + 34 + (((i * 131) % 100) / 100) * Math.max(10, TANK.y + TANK.h - top - 90) + Math.cos(t * 1.1 + i * 2) * 7;
        const vis = y < TANK.y + TANK.h - 40 && y > top + 22 ? 1 : 0;
        g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${(0.8 + 0.2 * Math.sin(t * 2 + i)).toFixed(2)})`);
        g.setAttribute('opacity', vis);
      });
      const fi = clamp(p.flow || 0, 0, 1);
      fl.forEach((g, i) => {
        if (fi <= 0 || p.mode === 'off') { g.setAttribute('opacity', 0); return; }
        const rate = 0.42 + (i % 3) * 0.08;
        const k = (((t * rate + i / NF) % 1) + 1) % 1;
        const vis = (i / NF) < fi ? 1 : 0;
        let x, y, a;
        if (p.mode === 'in') {
          // dari gelas, lewat mulut, turun ke tabung
          const kk = ease(k);
          x = lerp(540 + ((i * 17) % 40 - 20), TANK.x + 70 + ((i * 59) % 140), kk);
          y = lerp(250, TANK.y + TANK.h * 0.55, kk);
          a = clamp(k / 0.12, 0, 1) * clamp((1 - k) / 0.2, 0, 1);
        } else {
          const x0 = TANK.x + 60 + ((i * 71) % 160);
          const y0 = TANK.y + 120 + ((i * 97) % 220);
          const kk = k * k * (3 - 2 * k);
          x = k < 0.5 ? lerp(x0, EXIT.x + (((i * 13) % 30) - 15), ease(k * 2)) : EXIT.x + (((i * 13) % 30) - 15) + Math.sin(k * 9 + i) * 6;
          y = k < 0.5 ? lerp(y0, EXIT.y - 40, ease(k * 2)) : lerp(EXIT.y - 40, EXIT.y + 300, ease((k - 0.5) * 2));
          a = clamp(k / 0.1, 0, 1) * clamp((1 - k) / 0.18, 0, 1);
        }
        g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${(0.9 + 0.25 * Math.sin(i)).toFixed(2)})`);
        g.setAttribute('opacity', (a * vis).toFixed(2));
      });
      glass.setAttribute('opacity', clamp(p.glass || 0, 0, 1));
      glass.setAttribute('transform', `translate(540 ${(250 + Math.sin(t * 2) * 4).toFixed(1)}) rotate(${p.glass ? -10 + Math.sin(t * 1.7) * 3 : 0})`);
    },
  };
}

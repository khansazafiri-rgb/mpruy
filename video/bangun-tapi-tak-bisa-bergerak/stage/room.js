// Kamar tidur tampak depan: malam yang gelap berubah menjadi hangat dan terang saat lampu dinyalakan.
import { el, clamp, lerp, createPerson, posePerson } from './rig.js';

const g = (p, a = {}) => el('g', a, p);
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mixc = (a, b, k) => { const A = hex(a), B = hex(b); return `rgb(${Math.round(lerp(A[0], B[0], k))},${Math.round(lerp(A[1], B[1], k))},${Math.round(lerp(A[2], B[2], k))})`; };

export function createRoom(parent) {
  const root = g(parent);
  const defs = el('defs', {}, root);
  defs.innerHTML = `<radialGradient id="rmGlow"><stop offset="0" stop-color="#FFE3A3" stop-opacity=".9"/><stop offset="1" stop-color="#FFE3A3" stop-opacity="0"/></radialGradient>
    <radialGradient id="rmVig" cx=".5" cy=".5" r=".75"><stop offset=".55" stop-color="#06091A" stop-opacity="0"/><stop offset="1" stop-color="#06091A" stop-opacity=".7"/></radialGradient>`;
  const P = []; // [element, attr, nightColor, litColor]
  const fill = (tag, attrs, night, lit) => { const e = el(tag, { ...attrs, fill: night }, root); P.push([e, night, lit]); return e; };
  const layer = (n) => g(root, { class: n });
  const back = layer('back');
  const fillIn = (parent2, tag, attrs, night, lit) => { const e = el(tag, { ...attrs, fill: night }, parent2); P.push([e, night, lit]); return e; };
  fillIn(back, 'rect', { x: -20, y: -20, width: 1120, height: 1300 }, '#1C2848', '#F6E5C6');
  for (let i = 0; i < 10; i++) fillIn(back, 'rect', { x: i * 124 - 30, y: -20, width: 60, height: 1300, opacity: 0.35 }, '#17223F', '#F0D9B2');
  fillIn(back, 'rect', { x: -20, y: 1236, width: 1120, height: 34 }, '#26335B', '#FFF3DC');
  fillIn(back, 'rect', { x: -20, y: 1270, width: 1120, height: 700 }, '#141C34', '#D8AE7C');
  for (let i = 0; i < 8; i++) fillIn(back, 'rect', { x: -20, y: 1340 + i * 90, width: 1120, height: 5, opacity: 0.6 }, '#0B1022', '#C99C69');
  // jendela (malam di luar tetap malam)
  const win = g(back); win.innerHTML = `<rect x="90" y="150" width="340" height="470" rx="18" fill="#2A365C"/><rect x="112" y="172" width="296" height="426" rx="10" fill="#5F7DB8"/><rect x="256" y="172" width="8" height="426" fill="#2A365C"/><rect x="112" y="372" width="296" height="8" fill="#2A365C"/><circle cx="190" cy="270" r="34" fill="#EEF3FF"/>`;
  const curt = [fillIn(back, 'path', { d: 'M50 130Q120 142 140 230Q146 440 110 640Q80 652 50 640Z' }, '#323F70', '#F2A99A'), fillIn(back, 'path', { d: 'M470 130Q400 142 380 230Q374 440 410 640Q440 652 470 640Z' }, '#323F70', '#F2A99A')];
  fillIn(back, 'rect', { x: 36, y: 112, width: 450, height: 18, rx: 9 }, '#26325A', '#B27843');
  // papan kepala dan kasur
  fillIn(back, 'rect', { x: 200, y: 470, width: 680, height: 780, rx: 90 }, '#3E3355', '#B98A5E');
  fillIn(back, 'rect', { x: 230, y: 500, width: 620, height: 720, rx: 70 }, '#463A5E', '#C9996B');
  fillIn(back, 'rect', { x: 270, y: 900, width: 250, height: 200, rx: 70 }, '#C9D7EE', '#FFFFFF');
  fillIn(back, 'rect', { x: 560, y: 900, width: 250, height: 200, rx: 70 }, '#BFCDE8', '#FBF6EC');
  // meja samping + lampu + jam
  const stand = g(back, { transform: 'translate(-70 0)' });
  fillIn(stand, 'rect', { x: 860, y: 1000, width: 200, height: 270, rx: 22 }, '#4A3A4A', '#C98F5B');
  fillIn(stand, 'rect', { x: 876, y: 1034, width: 168, height: 96, rx: 12 }, '#5A4757', '#E2AE78');
  fillIn(stand, 'rect', { x: 936, y: 880, width: 28, height: 124, rx: 12 }, '#2C3361', '#8A6B4F');
  const shade = fillIn(stand, 'path', { d: 'M880 890L1020 890L990 760L910 760Z' }, '#3E4577', '#FFD98A');
  fillIn(stand, 'rect', { x: 880, y: 968, width: 70, height: 38, rx: 8 }, '#0B0F1F', '#2B3552');
  const clockT = el('text', { x: 915, y: 996, 'text-anchor': 'middle', 'font-family': 'Plus Jakarta Sans', 'font-weight': 800, 'font-size': 26, fill: '#FFB84D' }, stand); clockT.textContent = '03:13';
  const glow = el('circle', { cx: 880, cy: 830, r: 520, fill: 'url(#rmGlow)', opacity: 0 }, root);
  // kursi + jaket di pojok kiri
  const chair = g(back);
  fillIn(chair, 'rect', { x: 40, y: 1030, width: 250, height: 36, rx: 14 }, '#1F2745', '#8E6A4A');
  fillIn(chair, 'rect', { x: 62, y: 1066, width: 20, height: 190, rx: 8 }, '#171E39', '#7A5A3F');
  fillIn(chair, 'rect', { x: 240, y: 1066, width: 20, height: 190, rx: 8 }, '#171E39', '#7A5A3F');
  fillIn(chair, 'rect', { x: 58, y: 700, width: 220, height: 330, rx: 36 }, '#1B2341', '#A57B57');
  const coat = g(chair);
  fillIn(coat, 'path', { d: 'M20 1150C26 990 56 860 98 790C80 736 100 670 176 666C252 670 274 736 256 790C298 862 326 990 320 1150C262 1180 78 1180 20 1150Z' }, '#0A1024', '#6F8F5C');
  fillIn(coat, 'path', { d: 'M98 790C80 736 100 670 176 666C252 670 274 736 256 790C230 770 120 770 98 790Z' }, '#0A1024', '#5B7A4A');
  fillIn(coat, 'rect', { x: 150, y: 800, width: 52, height: 340, rx: 10, opacity: 0.0 }, '#0A1024', '#547344');
  const hero = createPerson('hero');
  root.appendChild(hero.root);
  const front = layer('front');
  // selimut di pangkuan
  const blank = g(front);
  fillIn(blank, 'path', { d: 'M150 1170Q540 1120 930 1170L960 1470Q540 1520 120 1470Z' }, '#46608F', '#6FB9AB');
  fillIn(blank, 'path', { d: 'M150 1170Q540 1120 930 1170L938 1236Q540 1276 142 1236Z' }, '#D9E4F7', '#FFF9EE');
  fillIn(blank, 'path', { d: 'M420 1260Q430 1380 410 1470M660 1260Q650 1380 670 1470' }, 'none', 'none').setAttribute('stroke', 'rgba(0,0,0,.12)');
  root.appendChild(hero.overlay);
  const vig = el('rect', { x: -20, y: -20, width: 1120, height: 1960, fill: 'url(#rmVig)', opacity: 0.8 }, root);
  const flash = el('rect', { x: -20, y: -20, width: 1120, height: 1960, fill: '#FFE9B8', opacity: 0 }, root);
  return {
    root, hero, glow,
    // p: { lit 0..1, flash, clock }
    update(p) {
      const k = clamp(p.lit, 0, 1);
      for (const [e, n, l] of P) { if (n === 'none') continue; e.setAttribute('fill', mixc(n, l, k)); }
      glow.setAttribute('opacity', (k * 0.75).toFixed(3));
      vig.setAttribute('opacity', (0.85 - 0.6 * k).toFixed(3));
      flash.setAttribute('opacity', (p.flash || 0).toFixed(3));
      clockT.textContent = p.clock || '03:13';
    },
  };
}

// Kamar tidur dilihat dari atas: tokoh terbaring, selimut sampai dada, lengan di atas selimut.
import { el, clamp, lerp, ease, createPerson, posePerson } from './rig.js';

const g = (p, a = {}) => el('g', a, p);
const raw = (p, s, a = {}) => { const e = g(p, a); e.innerHTML = s; return e; };

export function createTopDown(parent) {
  const root = g(parent);
  raw(root, `
    <defs>
      <radialGradient id="tdGlow"><stop offset="0" stop-color="#FFB84D" stop-opacity=".6"/><stop offset="1" stop-color="#FFB84D" stop-opacity="0"/></radialGradient>
      <radialGradient id="tdDoor" cx=".5" cy="1" r="1"><stop offset="0" stop-color="#FFD38A" stop-opacity=".75"/><stop offset="1" stop-color="#FFD38A" stop-opacity="0"/></radialGradient>
      <linearGradient id="tdMoon" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#C5D6FF" stop-opacity=".26"/><stop offset="1" stop-color="#C5D6FF" stop-opacity="0"/></linearGradient>
    </defs>
    <rect x="-20" y="-20" width="1120" height="1960" fill="#231F3A"/>
    ${Array.from({ length: 22 }, (_, i) => `<rect x="-20" y="${i * 92 - 10}" width="1120" height="5" fill="#1C1830" opacity=".9"/>`).join('')}
    <rect x="130" y="250" width="820" height="1560" rx="70" fill="#34305A"/>
    <rect x="150" y="270" width="780" height="1520" rx="58" fill="#3A3665"/>
    <rect x="228" y="352" width="624" height="1306" rx="46" fill="#6B4F3A"/>
    <rect x="206" y="290" width="668" height="112" rx="36" fill="#5A4130"/>
    <rect x="252" y="396" width="576" height="1240" rx="30" fill="#C9D7EE"/>
    <rect x="356" y="420" width="368" height="246" rx="74" fill="#E7EEFB"/><path d="M372 640Q540 690 708 640" fill="none" stroke="#C3D0EA" stroke-width="10" stroke-linecap="round"/>`);
  const hero = createPerson('hero');
  root.appendChild(hero.root);
  const blanket = raw(root, `
    <path d="M262 790Q540 764 818 790L826 1612Q540 1650 254 1612Z" fill="#46608F"/>
    <path d="M262 790Q540 764 818 790L820 884Q540 920 260 884Z" fill="#D9E4F7"/>
    <path d="M262 884Q540 920 820 884" fill="none" stroke="#B9C9E6" stroke-width="8" stroke-linecap="round"/>
    <path d="M436 960Q448 1250 440 1580M644 960Q632 1250 640 1580" fill="none" stroke="#3B5282" stroke-width="22" stroke-linecap="round" opacity=".55"/>
    <path d="M300 1010Q320 1300 300 1580M780 1010Q760 1300 780 1580" fill="none" stroke="#587AB0" stroke-width="12" stroke-linecap="round" opacity=".5"/>`);
  root.appendChild(hero.overlay);
  // meja samping + jam
  raw(root, `
    <rect x="40" y="470" width="190" height="250" rx="24" fill="#4A3A4A"/><rect x="56" y="486" width="158" height="218" rx="16" fill="#5A4757"/>
    <circle cx="135" cy="560" r="130" fill="url(#tdGlow)"/>
    <rect x="78" y="530" width="114" height="62" rx="10" fill="#0B0F1F"/>
    <circle cx="150" cy="660" r="34" fill="#3C3F66"/>`);
  const clockT = el('text', { x: 135, y: 575, 'text-anchor': 'middle', 'font-family': 'Plus Jakarta Sans', 'font-weight': 800, 'font-size': 38, fill: '#FFB84D' }, root);
  clockT.textContent = '03:12';
  // pintu di bawah (garis cahaya), kursi + jaket di pojok kiri bawah
  raw(root, `
    <rect x="640" y="1830" width="360" height="60" rx="8" fill="#1B1A33"/>
    <path d="M660 1830L980 1830L1060 1500L580 1500Z" fill="url(#tdDoor)"/>
    <rect x="660" y="1822" width="320" height="10" fill="#FFD38A"/>
    <rect x="40" y="1490" width="230" height="230" rx="34" fill="#4B3F66"/><rect x="60" y="1510" width="190" height="190" rx="22" fill="#554873"/>
    <path d="M70 1560C80 1500 140 1488 190 1504C240 1520 262 1580 250 1650C240 1700 160 1716 100 1696C60 1680 56 1610 70 1560Z" fill="#12182E"/>
    <path d="M110 1530C140 1516 190 1520 220 1546" fill="none" stroke="#33407A" stroke-width="8" stroke-linecap="round" opacity=".8"/>`);
  const moon = raw(root, `<path d="M-20 -20L520 -20L900 1180L330 1180Z" fill="url(#tdMoon)"/>`);
  const ring = el('circle', { cx: 150, cy: 1610, r: 175, fill: 'none', stroke: '#9DE0BD', 'stroke-width': 12, 'stroke-dasharray': '22 18', 'stroke-linecap': 'round', opacity: 0 }, root);
  const warm = el('rect', { x: -20, y: -20, width: 1120, height: 1960, fill: '#FFC98A', opacity: 0 }, root);
  const dark = el('rect', { x: -20, y: -20, width: 1120, height: 1960, fill: '#0A1030', opacity: 0 }, root);
  return {
    root, hero,
    // p: { t, mood 0 malam..1 fajar, eyes, blink, look, lift (0..1 angkat tangan), twL, twR, breath, brow, mouth, tilt }
    update(p) {
      const t = p.t;
      const breath = Math.sin(t * 1.9) * (p.breath ?? 1);
      const lift = p.lift || 0;
      const trem = (k) => ({ dx: Math.sin(t * 38) * 7 * k * Math.exp(-((p.tw0 ? t - p.tw0 : 0)) * 1.5), dy: Math.cos(t * 41) * 5 * k });
      const tl = trem(p.twL || 0), tr = trem(p.twR || 0);
      const handL = [-165 + tl.dx + lift * 40, -140 - lift * 60 + tl.dy], handR = [165 + tr.dx - lift * 40, -140 - lift * 60 + tr.dy];
      posePerson(hero, {
        x: 540, y: 1132, s: 1.1, t, seated: true, noShadow: true, headTilt: p.tilt ?? 0, look: p.look || [0, 0], blink: p.blink || 0,
        expr: { brow: p.brow || 'worry', eye: p.eyes || 'closed', mouth: p.mouth || 'flat' }, lean: 0, ph: 0, breath: 1,
        armL: { w: handL, bend: 1, top: true }, armR: { w: handR, bend: 1, top: true },
      });
      blanket.setAttribute('transform', `translate(540 800) scale(${(1 + breath * 0.004).toFixed(4)} ${(1 + breath * 0.006).toFixed(4)}) translate(-540 -800)`);
      moon.setAttribute('opacity', (1 - p.mood * 0.85).toFixed(2));
      warm.setAttribute('opacity', (p.mood * 0.2).toFixed(3));
      dark.setAttribute('opacity', (p.dark || 0).toFixed(3));
      ring.setAttribute('opacity', (p.ring || 0).toFixed(2)); ring.setAttribute('r', (175 + Math.sin(t * 4) * 8).toFixed(1));
      clockT.textContent = p.clock;
    },
  };
}

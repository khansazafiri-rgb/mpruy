// Pandangan orang pertama dari tempat tidur: panorama kamar malam dengan kedalaman (jauh/tengah/dekat) yang bisa kabur bergantian.
import { el, clamp, lerp, ease, easeInOut, ribbonPath } from './rig.js';

export const POV_W = 2400;
const NIGHT = { wall: '#1C2848', wall2: '#17223F', ceil: '#0F1730', floor: '#141C34', base: '#26335B' };
const g = (p, a = {}) => el('g', a, p);
const raw = (p, s, a = {}) => { const e = g(p, a); e.innerHTML = s; return e; };

export function createPOV(parent) {
  const root = g(parent);
  const defs = el('defs', {}, root);
  defs.innerHTML = `
    <filter id="bFar" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur id="gFar" stdDeviation="0"/></filter>
    <filter id="bMid" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur id="gMid" stdDeviation="0"/></filter>
    <filter id="bNear" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur id="gNear" stdDeviation="0"/></filter>
    <linearGradient id="pWall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1F2D52"/><stop offset="1" stop-color="#16213C"/></linearGradient>
    <linearGradient id="pFloor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1A2340"/><stop offset="1" stop-color="#0E1428"/></linearGradient>
    <linearGradient id="pWin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7C9AD2"/><stop offset="1" stop-color="#B5C9EE"/></linearGradient>
    <radialGradient id="pGlow"><stop offset="0" stop-color="#FFB84D" stop-opacity=".55"/><stop offset="1" stop-color="#FFB84D" stop-opacity="0"/></radialGradient>
    <radialGradient id="pDoorGlow"><stop offset="0" stop-color="#FFD38A" stop-opacity=".6"/><stop offset="1" stop-color="#FFD38A" stop-opacity="0"/></radialGradient>
    <linearGradient id="pShaft" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#BFD2FF" stop-opacity=".22"/><stop offset="1" stop-color="#BFD2FF" stop-opacity=".02"/></linearGradient>`;
  const cam = g(root);
  const far = g(cam, { filter: 'url(#bFar)' }), mid = g(cam, { filter: 'url(#bMid)' }), near = g(cam, { filter: 'url(#bNear)' });
  // ---- jauh ----
  raw(far, `
    <rect x="-300" y="-1000" width="3000" height="1260" fill="${NIGHT.ceil}"/>
    <rect x="-300" y="250" width="3000" height="1020" fill="url(#pWall)"/>
    <rect x="-300" y="250" width="640" height="1020" fill="#121B34"/>
    <path d="M340 250V1270" stroke="#0D1428" stroke-width="10"/>
    <rect x="-300" y="1236" width="3000" height="34" fill="${NIGHT.base}"/>
    <rect x="-300" y="1270" width="3000" height="1300" fill="url(#pFloor)"/>
    ${Array.from({ length: 12 }, (_, i) => `<rect x="-300" y="${1330 + i * 105}" width="3000" height="4" fill="#0B1022" opacity=".7"/>`).join('')}
    <ellipse cx="1150" cy="-170" rx="150" ry="44" fill="#1B2547"/><ellipse cx="1150" cy="-188" rx="96" ry="22" fill="#26335B"/>
    <path d="M700 -520Q760 -430 740 -300M1500 -640Q1450 -520 1520 -420" fill="none" stroke="#18224A" stroke-width="5" stroke-linecap="round"/>
    <rect x="540" y="290" width="440" height="520" rx="20" fill="#2A365C"/>
    <rect x="566" y="316" width="388" height="468" rx="10" fill="url(#pWin)"/>
    <rect x="756" y="316" width="8" height="468" fill="#2A365C"/><rect x="566" y="540" width="388" height="8" fill="#2A365C"/>
    <circle cx="660" cy="430" r="46" fill="#EEF3FF"/><circle cx="676" cy="420" r="40" fill="#C8D8F6" opacity=".55"/>
    <path d="M500 270Q570 280 590 360Q596 560 560 800Q528 812 500 800Z" fill="#323F70"/><path d="M1020 270Q950 280 930 360Q924 560 960 800Q992 812 1020 800Z" fill="#323F70"/>
    <rect x="470" y="256" width="580" height="18" rx="9" fill="#26325A"/>
    <path d="M566 790L954 790L1330 1520L690 1520Z" fill="url(#pShaft)"/>
    <rect x="1180" y="560" width="440" height="26" rx="10" fill="#33406A"/>
    ${['#8E5C7A', '#5C8E86', '#C9A04A', '#5B6FA8', '#A8574F', '#6C9AB5', '#8E8E5C'].map((c, i) => `<rect x="${1210 + i * 34}" y="${470 + (i % 3) * 8}" width="26" height="${90 - (i % 3) * 8}" rx="4" fill="${c}" opacity=".72"/>`).join('')}
    <rect x="1230" y="330" width="130" height="160" rx="10" fill="#2D3A66"/><rect x="1244" y="344" width="102" height="132" rx="6" fill="#3B4A7E"/><circle cx="1295" cy="400" r="22" fill="#566A9F"/>
    <rect x="1420" y="360" width="170" height="110" rx="10" fill="#2D3A66"/><rect x="1434" y="374" width="142" height="82" rx="6" fill="#3B4A7E"/>
    <rect x="1700" y="380" width="360" height="868" rx="14" fill="#262B48"/><rect x="1730" y="420" width="130" height="320" rx="8" fill="#2E3555" /><rect x="1890" y="420" width="130" height="320" rx="8" fill="#2E3555"/><rect x="1730" y="780" width="130" height="380" rx="8" fill="#2E3555"/><rect x="1890" y="780" width="130" height="380" rx="8" fill="#2E3555"/>
    <circle cx="1760" cy="860" r="18" fill="#6B6A7E"/>
    <rect x="1722" y="1240" width="316" height="20" fill="#FFD38A"/>
    <path d="M1722 1262L2038 1262L2240 1560L1520 1560Z" fill="url(#pDoorGlow)"/>
    <ellipse cx="1880" cy="1262" rx="250" ry="36" fill="#FFD38A" opacity=".5"/>
    <rect x="2130" y="330" width="330" height="930" rx="14" fill="#212A49"/><rect x="2150" y="350" width="140" height="890" rx="8" fill="#273151"/>`);
  // ---- tengah: kursi dan jaket di sudut ----
  const chair = g(mid);
  raw(chair, `
    <rect x="130" y="1060" width="230" height="38" rx="14" fill="#1F2745"/>
    <rect x="150" y="1098" width="20" height="170" rx="8" fill="#171E39"/><rect x="320" y="1098" width="20" height="170" rx="8" fill="#171E39"/>
    <rect x="140" y="730" width="210" height="330" rx="34" fill="#1B2341"/>`);
  const coat = g(mid, {});
  coat.innerHTML = `
    <path id="coatShape" d="M96 1180C100 1010 126 880 166 810C150 760 170 690 244 686C318 690 340 760 322 810C366 884 392 1010 388 1180C330 1210 150 1210 96 1180Z" fill="#0A1024"/>
    <path d="M166 810C150 760 170 690 244 686" fill="none" stroke="#2A3868" stroke-width="7" stroke-linecap="round" opacity=".8"/>
    <path d="M122 1120C130 1010 150 930 176 870" fill="none" stroke="#1E2A55" stroke-width="10" stroke-linecap="round" opacity=".7"/>`;
  // ---- dekat: meja samping dan jam ----
  raw(near, `
    <rect x="640" y="1000" width="400" height="36" rx="14" fill="#4A3A4A"/>
    <rect x="660" y="1036" width="360" height="520" rx="16" fill="#352B3C"/><rect x="690" y="1076" width="300" height="190" rx="10" fill="#403546"/><rect x="690" y="1296" width="300" height="190" rx="10" fill="#403546"/>
    <circle cx="840" cy="1170" r="9" fill="#8B7C8A"/><circle cx="840" cy="1390" r="9" fill="#8B7C8A"/>
    <circle cx="820" cy="930" r="230" fill="url(#pGlow)"/>
    <rect x="700" y="868" width="250" height="132" rx="18" fill="#0B0F1F"/>
    <rect x="990" y="880" width="46" height="120" rx="12" fill="#2C3361"/><path d="M968 880L1058 880L1034 780L992 780Z" fill="#3E4577"/>`);
  const clockTxt = el('text', { x: 826, y: 962, 'text-anchor': 'middle', 'font-family': 'Plus Jakarta Sans', 'font-weight': 800, 'font-size': 82, fill: '#FFB84D', style: 'letter-spacing:2px' }, near);
  clockTxt.innerHTML = `<tspan id="cH">03</tspan><tspan id="cC">:</tspan><tspan id="cM">12</tspan>`;
  const cH = clockTxt.querySelector('#cH'), cC = clockTxt.querySelector('#cC'), cM = clockTxt.querySelector('#cM');
  // ---- tempat tidur di depan: selimut dan kedua tangan ----
  const bed = g(near);
  raw(bed, `
    <path d="M200 2600L260 1900Q340 1640 700 1600Q1100 1560 1500 1620Q1880 1680 1960 1920L2040 2600Z" fill="#33497A"/>
    <path d="M260 1900Q340 1640 700 1600Q1100 1560 1500 1620Q1880 1680 1960 1920" fill="none" stroke="#4A6399" stroke-width="16" stroke-linecap="round" opacity=".7"/>
    <path d="M620 2100Q900 2050 1200 2110M520 2300Q900 2240 1350 2320" fill="none" stroke="#2A3C68" stroke-width="12" stroke-linecap="round" opacity=".8"/>`);
  const handsG = g(bed);
  const handL = g(handsG), handR = g(handsG);
  const mkHand = (gp, sx) => {
    const arm = el('path', { fill: '#7FA7D9' }, gp);
    const palm = el('g', {}, gp);
    palm.innerHTML = `<ellipse cx="0" cy="40" rx="64" ry="78" fill="#D9A27A"/>
      <g fill="#D9A27A"><rect x="-62" y="-56" width="26" height="92" rx="13" transform="rotate(-8 -49 -10)"/><rect x="-30" y="-78" width="26" height="104" rx="13" transform="rotate(-3 -17 -26)"/><rect x="2" y="-80" width="26" height="106" rx="13" transform="rotate(3 15 -27)"/><rect x="34" y="-60" width="26" height="92" rx="13" transform="rotate(10 47 -14)"/></g>
      <rect x="${sx > 0 ? -88 : 52}" y="22" width="36" height="78" rx="18" fill="#D9A27A" transform="rotate(${sx > 0 ? 52 : -52} ${sx > 0 ? -70 : 70} 60)"/>`;
    return { arm, palm };
  };
  const hl = mkHand(handL, 1), hr = mkHand(handR, -1);
  const strain = el('g', { opacity: 0 }, handsG);
  strain.innerHTML = `<g stroke="#FFE9B0" stroke-width="7" stroke-linecap="round" fill="none"><path d="M610 1700q-30-18-44-50M670 1668q-12-30-6-62M1150 1700q30-18 44-50M1090 1668q12-30 6-62"/></g>`;
  const setHand = (h, hx, hy, sx, tremor) => {
    const base = [hx + (sx > 0 ? -170 : 170), 2640], mid = [hx + (sx > 0 ? -100 : 100), 2250], w = [hx, hy];
    h.arm.setAttribute('d', ribbonPath(base, mid, w, 150, 120, 96, 14).d);
    h.palm.setAttribute('transform', `translate(${(hx + tremor).toFixed(1)} ${(hy - 20).toFixed(1)}) rotate(${(sx > 0 ? 8 : -8)})`);
  };
  return {
    root,
    // p: { cx, cy, z, roll, fFar, fMid, fNear (kabur px layar), colon, strain, tremor, coatBreath, clock:[h,m] }
    update(p) {
      const z = p.z;
      cam.setAttribute('transform', `translate(540 960) rotate(${(p.roll || 0).toFixed(2)}) scale(${z.toFixed(4)}) translate(${-p.cx.toFixed(1)} ${-p.cy.toFixed(1)})`);
      const s = (id, v) => root.querySelector('#' + id).setAttribute('stdDeviation', (Math.max(0, v) / z).toFixed(2));
      s('gFar', p.fFar); s('gMid', p.fMid); s('gNear', p.fNear);
      far.setAttribute('filter', p.fFar < 0.4 ? 'none' : 'url(#bFar)'); mid.setAttribute('filter', p.fMid < 0.4 ? 'none' : 'url(#bMid)'); near.setAttribute('filter', p.fNear < 0.4 ? 'none' : 'url(#bNear)');
      cC.setAttribute('opacity', p.colon ? 1 : 0.12);
      cH.textContent = p.clock[0]; cM.textContent = p.clock[1];
      const tr = p.tremor || 0;
      setHand(hl, 760 + Math.sin(p.t * 33) * tr, 1930 + Math.cos(p.t * 29) * tr * 0.6, 1, 0);
      setHand(hr, 1090 + Math.sin(p.t * 31 + 1) * tr, 1940 + Math.cos(p.t * 27) * tr * 0.6, -1, 0);
      strain.setAttribute('opacity', (p.strain || 0).toFixed(2));
      const b = p.coatBreath || 0;
      coat.setAttribute('transform', `translate(244 1180) scale(${(1 + b * 0.035).toFixed(4)} ${(1 + b * 0.05).toFixed(4)}) translate(-244 -1180)`);
    },
  };
}

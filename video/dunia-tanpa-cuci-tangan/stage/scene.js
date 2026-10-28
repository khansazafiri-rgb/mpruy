// Dunia 2D "Dunia tanpa cuci tangan": bangsal (ruang A, lorong, ruang B), perawat, pasien, titik simbolis.
// Semua keadaan = fungsi murni dari waktu video t, sehingga setiap frame deterministik dan gerak selalu halus.
import { createNurse, updateNurse, pchip, clamp, lerp, smooth, smoother, WALK_DIST, PAL } from './chars2.js';

const NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
const grp = (html, attrs = {}, parent) => { const g = el('g', attrs, parent); if (html) g.innerHTML = html; return g; };
const f1 = (v) => (Math.round(v * 10) / 10).toString();

// ======================= GEOMETRI DUNIA =======================
const X_DOOR_A = 260, X_DOOR_B = 960;
const BED_A = { x0: -760, w: 640, head: -1 };
const BED_B = { x0: 1260, w: 640, head: 1 };
const DISP_X = 210; // dispenser handrub di dinding lorong
const RAIL_Y = -198;

// ======================= LINIMASA =======================
export const T = { cut: [4.62, 4.92, 5.22], freeze: 26.9, rewind: [38.4, 39.9], alt0: 39.9, scene6: 57.2 };
const TAU_BACK = 18.5, TAU_FREEZE = 25.6;
const warpKeys = [[-3, -3]]; for (let k = 0; k <= 24; k += 2) warpKeys.push([k, k]);
warpKeys.push([24.4, 24.4], [25.4, 25.0], [26.4, 25.45], [26.9, TAU_FREEZE]);
const warp = pchip(warpKeys);
export function tauAt(t) {
  if (t < T.freeze) return { mode: 'main', tau: warp(t) };
  if (t < T.rewind[0]) return { mode: 'main', tau: TAU_FREEZE, frozen: true };
  if (t < T.rewind[1]) { const u = smoother((t - T.rewind[0]) / (T.rewind[1] - T.rewind[0])); return { mode: 'main', tau: lerp(TAU_FREEZE, TAU_BACK, u), rewind: true }; }
  return { mode: 'alt', tau: t - T.alt0 };
}

// ---------- jalur kamera ----------
const trk = (keys) => { const fx = pchip(keys.map((k) => [k[0], k[1]])), fy = pchip(keys.map((k) => [k[0], k[2]])), fz = pchip(keys.map((k) => [k[0], k[3]])); return (t) => [fx(t), fy(t), fz(t)]; };
const camHook = trk([[-3, 630, -200, 2.15], [0, 630, -200, 2.15], [1.8, 630, -204, 2.1], [3.4, 620, -240, 1.6], [4.9, 610, -262, 1.2]]);
const camMainKeys = trk([[4.9, -430, -262, 1.3], [9.2, -420, -262, 1.3], [10.3, -230, -252, 1.6], [11.6, -230, -252, 1.6], [13.0, -400, -262, 1.3], [15.8, -400, -262, 1.3], [17.0, -235, -252, 1.6], [18.4, -235, -252, 1.6], [19.2, -180, -262, 1.35], [20.4, 60, -262, 1.3], [21.8, 400, -262, 1.3], [23.2, 790, -262, 1.3], [24.4, 1180, -250, 1.3], [25.0, 1360, -240, 1.3], [25.6, 1500, -232, 1.35]]);
export const camMain = (tau) => (tau < 4.92 ? camHook(tau) : camMainKeys(tau));
const cam19 = camMainKeys(TAU_BACK);
const camAlt = trk([[0, cam19[0], cam19[1], cam19[2]], [1.0, -150, -262, 1.3], [2.0, 150, -285, 1.65], [2.6, 205, -300, 1.8], [4.4, 205, -300, 1.8], [5.2, 420, -250, 1.3], [6.6, 820, -262, 1.15], [8.2, 1120, -255, 1.25], [9.4, 1460, -232, 1.4], [11.5, 1500, -232, 1.38], [17.3, 1500, -232, 1.35], [19.8, 1500, -285, 1.0], [60, 1500, -285, 1.0]]);

// ---------- perawat: lintasan utama ----------
const nxMain = pchip([[4.9, -330], [18.6, -330], [19.2, -290], [20.4, -10], [21.8, 350], [23.2, 730], [24.4, 1060], [25.0, 1160], [25.6, 1215]]);
const nxAlt = pchip([[0, -330], [0.4, -330], [0.9, -262], [1.5, -100], [2.1, 60], [2.6, 150], [4.3, 150], [4.9, 215], [5.9, 480], [7.1, 820], [8.3, 1120], [9.0, 1195], [9.4, 1210], [60, 1210]]);

const handTrack = (keys) => { const fx = pchip(keys.map((k) => [k[0], k[1]])), fy = pchip(keys.map((k) => [k[0], k[2]])); return (t) => [fx(t), fy(t)]; };
// hB = tangan kiri-layar (gestur bicara), hF = tangan kanan-layar (menyentuh pagar ranjang A, lalu pasien B)
const hbMain = handTrack([[4.9, -112, -250], [6.0, -150, -284], [7.0, -140, -252], [8.0, -176, -300], [9.0, -132, -262], [10.0, -120, -180], [12.0, -104, -120], [14.0, -100, -112], [60, -100, -112]]);
const hfMain = handTrack([[4.9, 110, -100], [6.0, 120, -130], [8.0, 100, -112], [9.0, 110, -140], [9.8, 140, -190], [10.5, 152, -198], [11.5, 152, -198], [12.4, 120, -170], [14.0, 104, -100], [16.6, 130, -160], [17.5, 152, -198], [18.4, 152, -198], [18.9, 120, -150], [19.6, 120, -170], [23.3, 120, -170], [24.6, 236, -204], [25.6, 262, -198]]);
const hbAlt = handTrack([[0, -100, -112], [2.6, -100, -112], [3.1, -22, -236], [4.2, -22, -236], [4.9, -100, -112], [60, -100, -112]]);
const hfAlt = handTrack([[0, 152, -198], [0.45, 120, -150], [1.1, 100, -112], [1.5, 100, -112], [2.1, 62, -206], [2.55, 62, -196], [2.75, 62, -214], [3.1, 24, -234], [4.2, 24, -234], [4.9, 100, -112], [8.6, 100, -112], [9.4, 236, -198], [9.9, 252, -192], [60, 252, -192]]);

const speedOf = (f, t, d = 0.06) => Math.abs(f(t + d) - f(t - d)) / (2 * d);

function nurseMain(tau) {
  const s = { sc: 1, y: 0, t: tau };
  if (tau < 4.92) {
    s.x = 610; s.mv = 0; s.phi = 610 / WALK_DIST;
    s.handB = [-100, -112, 1, 0]; s.handF = [100, -112, -1, 0];
    // gestur gelisah: tangan kanan terangkat sedikit sambil menimbang
    const g = smooth((tau - 2.6) / 0.7) * (1 - smooth((tau - 4.0) / 0.7));
    s.handF = [100 + 30 * g, -72 - 140 * g, -1, 0];
    const turn = pchip([[0, 0], [2.6, 0], [3.3, -0.85], [3.9, -0.85], [4.3, 0.85], [4.9, 0.1]]);
    s.head = { turn: turn(tau), nod: 0, tilt: 0 };
    s.face = { expr: 'curious', look: [turn(tau) * 0.8, 0] };
    return s;
  }
  s.x = nxMain(tau);
  const sp = speedOf(nxMain, tau); s.mv = smooth((sp - 20) / 110); s.phi = s.x / WALK_DIST;
  const hb = hbMain(tau), hf = hfMain(tau);
  const sw = Math.sin(Math.PI * 2 * s.phi) * 30 * s.mv;
  s.handB = [hb[0] - sw * 0.45 * (tau > 18.9 ? 1 : 0), hb[1], 1, 0];
  s.handF = [hf[0] + sw * 0.45 * (tau > 19.2 && tau < 23.3 ? 1 : 0), hf[1], -1, tau > 10.3 && tau < 11.6 ? 0.2 : 0];
  const turn = pchip([[4.9, -0.85], [14.0, -0.85], [16.6, -0.7], [18.2, -0.5], [19.2, 0.3], [20.2, 0.9], [25.6, 0.95]]);
  const look = pchip([[4.9, 0.1], [60, 0.1]]);
  s.head = { turn: turn(tau), nod: 0, tilt: tau > 19 ? 3 : 0 };
  s.face = { expr: tau < 6.9 ? 'busy' : tau < 9.6 ? 'warm' : tau < 18.8 ? 'busy' : tau < 24.2 ? 'hurry' : 'focus', look: [turn(tau) * 0.7, look(tau)] };
  s.lean = tau > 19 ? 3 * s.mv : 0;
  return s;
}

function nurseAlt(sg) {
  const s = { sc: 1, y: 0, t: TAU_BACK + sg };
  s.x = nxAlt(sg);
  const sp = speedOf(nxAlt, sg); s.mv = smooth((sp - 20) / 110); s.phi = s.x / WALK_DIST;
  const hb = hbAlt(sg), hf = hfAlt(sg);
  const sw = Math.sin(Math.PI * 2 * s.phi) * 30 * s.mv;
  const rub = smooth((sg - 3.1) / 0.3) * (1 - smooth((sg - 4.15) / 0.3));
  const w = sg * 15;
  s.handB = [hb[0] - sw * 0.45 + Math.cos(w) * 11 * rub, hb[1] + Math.sin(w) * 8 * rub, 1, rub];
  s.handF = [hf[0] + sw * 0.45 * (sg < 8.2 ? 1 : 0) - Math.cos(w) * 11 * rub, hf[1] - Math.sin(w) * 8 * rub + (sg > 9.6 ? Math.sin(sg * 1.6) * 2 : 0), -1, rub];
  const turn = pchip([[0, -0.4], [0.6, 0.9], [4.3, 0.5], [4.9, 0.9], [9.0, 0.9], [9.6, 0.8], [60, 0.8]]);
  const look = pchip([[0, 0], [2.0, 0.1], [2.8, 0.8], [4.3, 0.8], [4.9, 0], [9.0, 0], [9.8, 0.4], [60, 0.4]]);
  s.head = { turn: turn(sg), nod: 0, tilt: 2 };
  const e = sg < 3.0 ? 'hurry' : sg < 4.3 ? 'focus' : sg < 6 ? 'relieved' : sg < 9.0 ? 'calm' : 'warm';
  s.face = { expr: e, look: [turn(sg) * 0.7, look(sg)] };
  s.lean = 2 * s.mv;
  return s;
}

// ======================= BANGUN DUNIA =======================
export function buildWorld(svg) {
  svg.innerHTML = '';
  const cam = el('g', { id: 'cam' }, svg);
  const wl = el('g', { id: 'wl' }, cam);
  // dinding & lantai
  grp(`
    <rect x="-1400" y="-1800" width="1660" height="1800" fill="#F8E8C8"/>
    <rect x="260" y="-1800" width="700" height="1800" fill="#D3EEE6"/>
    <rect x="960" y="-1800" width="1800" height="1800" fill="#E3EBF8"/>
    <rect x="-1400" y="-80" width="1660" height="80" fill="#EBD5A9" opacity=".6"/>
    <rect x="260" y="-80" width="700" height="80" fill="#BFE3D8" opacity=".7"/>
    <rect x="960" y="-80" width="1800" height="80" fill="#CBD9F0" opacity=".7"/>
    <rect x="-1400" y="0" width="4200" height="900" fill="#B9D3CD"/>
    ${Array.from({ length: 34 }, (_, i) => `<rect x="${-1400 + i * 130}" y="0" width="5" height="900" fill="#A3C1BA" opacity=".6"/>`).join('')}
    <rect x="-1400" y="0" width="4200" height="14" fill="#9DBDB5"/>
    <rect x="-1400" y="-1010" width="4200" height="32" fill="#FFFFFF" opacity=".5"/><rect x="-1400" y="-1800" width="4200" height="790" fill="#fff" opacity=".35"/>
    ${[-700, 80, 610, 1500, 2100].map((x) => `<rect x="${x - 130}" y="-1000" width="260" height="22" rx="11" fill="#fff" opacity=".9"/>`).join('')}
    `, {}, wl);
  // bingkai pintu
  for (const x of [X_DOOR_A, X_DOOR_B]) {
    grp(`<rect x="${x - 16}" y="-560" width="32" height="560" fill="#9FBDB5"/><rect x="${x - 16}" y="-580" width="32" height="30" fill="#8CAEA6"/>`, {}, wl);
  }
  grp(`<rect x="${X_DOOR_A - 120}" y="-640" width="240" height="64" rx="16" fill="#fff"/><text x="${X_DOOR_A}" y="-594" text-anchor="middle" font-family="Plus Jakarta Sans" font-weight="800" font-size="40" fill="#007060">RUANG A</text>
    <rect x="${X_DOOR_B - 120}" y="-640" width="240" height="64" rx="16" fill="#fff"/><text x="${X_DOOR_B}" y="-594" text-anchor="middle" font-family="Plus Jakarta Sans" font-weight="800" font-size="40" fill="#007060">RUANG B</text>`, {}, wl);

  // ---- ruang A: jendela, gambar, infus, meja ----
  grp(`<g transform="translate(-520 -690)"><rect width="300" height="300" rx="24" fill="#FFF8E8"/><rect x="18" y="18" width="264" height="264" rx="12" fill="#BFE6F2"/>
      <rect x="144" y="18" width="12" height="264" fill="#FFF8E8"/><rect x="18" y="144" width="264" height="12" fill="#FFF8E8"/><circle cx="210" cy="90" r="38" fill="#FFE9A8"/><circle cx="90" cy="200" r="46" fill="#fff" opacity=".75"/></g>
    <g transform="translate(-130 -640)"><rect width="150" height="120" rx="14" fill="#fff"/><rect x="12" y="12" width="126" height="96" rx="8" fill="#CFF1DF"/><path d="M26 82l28-30 24 20 20-14 28 24" fill="none" stroke="#007060" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/></g>
    <g transform="translate(-900 0)"><rect x="-8" y="-560" width="16" height="560" fill="#C8D3D8"/><rect x="-50" y="-14" width="100" height="14" rx="7" fill="#C8D3D8"/>
      <rect x="-34" y="-560" width="68" height="100" rx="26" fill="#E9F5FB"/><rect x="-34" y="-520" width="68" height="60" rx="26" fill="#9FE3F6" opacity=".8"/></g>
    <g transform="translate(-1000 0)"><rect x="-70" y="-250" width="140" height="22" rx="8" fill="#B77C4E"/><rect x="-60" y="-228" width="120" height="228" rx="10" fill="#D49A67"/><rect x="-40" y="-296" width="40" height="46" rx="10" fill="#fff"/><rect x="-32" y="-286" width="24" height="10" rx="5" fill="#9DE0BD"/></g>`, {}, wl);
  // ---- lorong: pegangan, jendela, poster, dispenser ----
  grp(`<rect x="260" y="-270" width="700" height="18" fill="#E9F3F0"/>
    <g transform="translate(520 -700)"><rect width="260" height="280" rx="22" fill="#fff"/><rect x="16" y="16" width="228" height="248" rx="12" fill="#BFE6F2"/><rect x="124" y="16" width="12" height="248" fill="#fff"/><circle cx="188" cy="82" r="30" fill="#FFE9A8"/></g>
    <g transform="translate(800 -640)"><rect width="110" height="150" rx="14" fill="#fff"/><rect x="10" y="10" width="90" height="130" rx="8" fill="#E8F7F2"/><path d="M55 40c-14 0-22 10-20 26l4 34h32l4-34c2-16-6-26-20-26z" fill="#9DE0BD"/><circle cx="55" cy="28" r="10" fill="#F8C038"/></g>
    <g id="dispenser" transform="translate(${DISP_X} -290)"><rect x="-44" y="-26" width="88" height="170" rx="20" fill="#fff"/><rect x="-34" y="-12" width="68" height="40" rx="12" fill="#CFF1DF"/><rect x="-6" y="38" width="12" height="40" rx="6" fill="#9FB6B0"/><rect x="-22" y="70" width="44" height="16" rx="8" fill="#007060"/><circle cx="0" cy="8" r="10" fill="#007060"/></g>`, {}, wl);
  // ---- ruang B: jendela, tanaman, tirai ----
  grp(`<g transform="translate(1360 -690)"><rect width="330" height="300" rx="24" fill="#fff"/><rect x="18" y="18" width="294" height="264" rx="12" fill="#CDE7F6"/><rect x="156" y="18" width="12" height="264" fill="#fff"/><circle cx="90" cy="90" r="36" fill="#FFE9A8"/><circle cx="240" cy="200" r="50" fill="#fff" opacity=".75"/></g>
    <g transform="translate(2060 0)"><rect x="-44" y="-100" width="88" height="100" rx="16" fill="#C98A58"/><path d="M0 -96Q-80 -150 -56 -250Q0 -200 0 -96ZM0 -96Q84 -156 58 -270Q0 -216 0 -96ZM0 -96Q-10 -200 0 -300Q14 -200 0 -96Z" fill="#55C79D"/></g>
    <g transform="translate(1100 0)"><rect x="-8" y="-360" width="16" height="360" fill="#C8D3D8"/><rect x="-40" y="-12" width="80" height="12" rx="6" fill="#C8D3D8"/><rect x="-34" y="-380" width="68" height="90" rx="24" fill="#E9F5FB"/></g>`, {}, wl);

  // ---- ranjang + pasien ----
  const beds = {};
  for (const [key, B, colors] of [['A', BED_A, { blanket: '#8EC9E8', blanketD: '#79B6D8', gown: '#CFE6F5', hair: '#8E96A2', skin: '#E3AD86', stache: true }], ['B', BED_B, { blanket: '#CDB6E8', blanketD: '#B9A0DA', gown: '#E8DFF5', hair: '#6B4B3A', skin: '#F0BF98', stache: false }]]) {
    const g = el('g', { class: 'bed' + key }, wl);
    const hx = B.head < 0 ? B.x0 + 20 : B.x0 + B.w - 20; // ujung kepala
    const dirx = -B.head; // arah dari kepala ke kaki
    const x1 = B.x0 + B.w;
    // kaki & rangka
    g.appendChild(grp(`<rect x="${B.x0 + 20}" y="-34" width="24" height="34" fill="#8FA6A0"/><rect x="${x1 - 44}" y="-34" width="24" height="34" fill="#8FA6A0"/>
      <circle cx="${B.x0 + 32}" cy="-10" r="13" fill="#5C706B"/><circle cx="${x1 - 32}" cy="-10" r="13" fill="#5C706B"/>
      <rect x="${B.x0}" y="-102" width="${B.w}" height="70" rx="18" fill="#A9BFBA"/>
      <rect x="${B.head < 0 ? B.x0 - 22 : x1 - 6}" y="-300" width="28" height="270" rx="12" fill="#8FA6A0"/>
      <rect x="${B.head < 0 ? x1 - 6 : B.x0 - 22}" y="-190" width="28" height="160" rx="12" fill="#9DB4AE"/>
      <rect x="${B.x0 + 4}" y="-168" width="${B.w - 8}" height="70" rx="22" fill="#F4F8F9"/>`));
    // bantal
    const px = B.head < 0 ? B.x0 + 40 : x1 - 40 - 150;
    g.appendChild(grp(`<rect x="${px}" y="-216" width="150" height="64" rx="30" fill="#fff"/>`));
    // pasien: badan (kerah baju) di bawah selimut + kepala
    const cx = B.head < 0 ? B.x0 + 118 : x1 - 118;
    const pat = el('g', { class: 'pat' }, g);
    pat.innerHTML = `<g class="pb"><path d="M${cx - 78} -150 C ${cx - 78} -210 ${cx - 40} -232 ${cx} -232 C ${cx + 40} -232 ${cx + 78} -210 ${cx + 78} -150 Z" fill="${colors.gown}"/></g>
      <g class="ph" transform="translate(${cx} -262)">
        ${colors.hair ? `<ellipse cx="0" cy="-8" rx="84" ry="86" fill="${colors.hair}"/>` : ''}
        <ellipse cx="-84" cy="4" rx="13" ry="16" fill="${colors.skin}"/><ellipse cx="84" cy="4" rx="13" ry="16" fill="${colors.skin}"/>
        <ellipse cx="0" cy="0" rx="82" ry="86" fill="${colors.skin}"/>
        <ellipse cx="-50" cy="30" rx="16" ry="10" fill="#F28B82" opacity=".35"/><ellipse cx="50" cy="30" rx="16" ry="10" fill="#F28B82" opacity=".35"/>
        <g class="eyes"><ellipse class="eL" cx="-30" cy="-4" rx="9" ry="12" fill="${PAL.ink}"/><ellipse class="eR" cx="30" cy="-4" rx="9" ry="12" fill="${PAL.ink}"/></g>
        <path class="brL" d="M-48 -26Q-30 -36 -12 -28" fill="none" stroke="${colors.hair || PAL.hair}" stroke-width="6" stroke-linecap="round"/><path class="brR" d="M12 -28Q30 -36 48 -26" fill="none" stroke="${colors.hair || PAL.hair}" stroke-width="6" stroke-linecap="round"/>
        <path class="mo" d="M-17 36Q0 50 17 36" fill="none" stroke="${PAL.mouth}" stroke-width="6" stroke-linecap="round"/>
        ${colors.stache ? `<path d="M-30 22Q-12 12 0 22Q12 12 30 22Q10 34 0 28Q-10 34 -30 22Z" fill="#8E96A2"/>` : ''}
        ${colors.hair && !colors.stache ? `<path d="M-84 -2C-92 -80 -40 -96 0 -96C40 -96 92 -80 84 -2C70 -38 40 -52 14 -50C-12 -34 -56 -42 -84 -2Z" fill="${colors.hair}"/>` : ''}
        ${colors.stache ? `<path d="M-82 -30C-70 -70 -40 -84 0 -84C40 -84 70 -70 82 -30C60 -56 30 -64 0 -62C-30 -64 -60 -56 -82 -30Z" fill="${colors.hair}" opacity=".9"/>` : ''}
      </g>`;
    // selimut
    const bx0 = B.head < 0 ? cx + 70 : B.x0 + 10, bx1 = B.head < 0 ? x1 - 10 : cx - 70;
    g.appendChild(grp(`<path d="M${bx0} -176 Q${(bx0 + bx1) / 2} -214 ${bx1} -176 L${bx1} -108 Q${(bx0 + bx1) / 2} -92 ${bx0} -108 Z" fill="${colors.blanket}"/>
      <path d="M${bx0 + 30} -150 Q${(bx0 + bx1) / 2} -176 ${bx1 - 30} -150" fill="none" stroke="${colors.blanketD}" stroke-width="10" stroke-linecap="round"/>
      <path d="M${bx0} -138 Q${(bx0 + bx1) / 2} -122 ${bx1} -138 L${bx1} -108 Q${(bx0 + bx1) / 2} -92 ${bx0} -108 Z" fill="${colors.blanketD}"/>`));
    // tangan pasien (diam di selimut)
    const hxp = key === 'B' ? 1450 : -560;
    g.appendChild(grp(`<ellipse cx="${hxp}" cy="-188" rx="36" ry="22" fill="${colors.skin}"/><ellipse cx="${hxp + 28 * dirx}" cy="-186" rx="20" ry="14" fill="${colors.skin}" opacity="0"/>`));
    beds[key] = { g, pat, hx, head: pat.querySelector('.ph'), body: pat.querySelector('.pb'), eL: pat.querySelector('.eL'), eR: pat.querySelector('.eR'), mo: pat.querySelector('.mo'), cx, B };
  }
  // pagar ranjang (di depan selimut)
  const rails = el('g', { class: 'rails' }, wl);
  const railPath = (B) => {
    const a = B.x0 + 110, b = B.x0 + B.w - 40;
    return `<rect x="${a - 8}" y="-232" width="16" height="120" rx="8" fill="#B7C7CF"/><rect x="${b - 8}" y="-232" width="16" height="120" rx="8" fill="#B7C7CF"/>
      <rect x="${a - 8}" y="${RAIL_Y - 8}" width="${b - a + 16}" height="16" rx="8" fill="#CBD8DE"/><rect x="${a - 8}" y="-160" width="${b - a + 16}" height="14" rx="7" fill="#B7C7CF"/>
      <rect x="${a + (b - a) / 3 - 7}" y="-232" width="14" height="120" rx="7" fill="#B7C7CF" opacity=".8"/><rect x="${a + 2 * (b - a) / 3 - 7}" y="-232" width="14" height="120" rx="7" fill="#B7C7CF" opacity=".8"/>`;
  };
  rails.innerHTML = railPath(BED_A) + railPath(BED_B);
  const railGlow = el('ellipse', { cx: -250, cy: RAIL_Y, rx: 70, ry: 26, fill: '#F8C038', opacity: 0 }, rails);

  // ---- perawat ----
  const shadow = el('ellipse', { cx: 0, cy: 6, rx: 110, ry: 14, fill: '#2B4F57', opacity: 0.16 }, wl);
  const nurse = createNurse();
  wl.appendChild(nurse.root);

  // ---- titik simbolis ----
  const dotsG = el('g', { class: 'dots' }, wl);
  const COLS = ['#F8C038', '#E8665F', '#8E7CE8', '#4CC3D9', '#7BD389'];
  const homes = [
    // pengendara (naik ke tangan) — dekat pagar
    [-190, -208], [-160, -228], [-218, -214], [-142, -214], [-226, -186], [-178, -242],
    // lingkungan lain
    [-300, -214], [-460, -206], [-380, -176], [-560, -170], [-650, -140], [-900, -320], [-1000, -300], [-170, -128], [-130, -250], [-620, -204], [-740, -112], [-520, -218],
  ];
  const dots = homes.map((h, i) => {
    const g = el('g', {}, dotsG);
    const r = 11 + (i % 3) * 3;
    const col = COLS[i % COLS.length];
    const spikes = Array.from({ length: 8 }, (_, k) => { const a = (k / 8) * Math.PI * 2; return `<line x1="${Math.cos(a) * r * 0.9}" y1="${Math.sin(a) * r * 0.9}" x2="${Math.cos(a) * r * 1.55}" y2="${Math.sin(a) * r * 1.55}" stroke="${col}" stroke-width="4" stroke-linecap="round"/>`; }).join('');
    g.innerHTML = `<circle r="${r * 2.1}" fill="${col}" opacity=".18"/>${spikes}<circle r="${r}" fill="${col}"/><circle cx="${-r * 0.3}" cy="${-r * 0.3}" r="${r * 0.28}" fill="#fff" opacity=".7"/>`;
    return { g, home: h, rider: i < 6, i, ang: (i / 6) * Math.PI * 2, rad: 40 + (i % 3) * 14, col };
  });
  const fx = el('g', { class: 'fx' }, wl);

  const star = (r) => `M0 ${-r}Q${r * 0.14} ${-r * 0.14} ${r} 0Q${r * 0.14} ${r * 0.14} 0 ${r}Q${-r * 0.14} ${r * 0.14} ${-r} 0Q${-r * 0.14} ${-r * 0.14} 0 ${-r}Z`;

  // pasien: kedip & napas
  const blinkAt = (t, per, off) => { const ph = ((t + off) % per + per) % per; const d = Math.abs(ph - 0.1); return d < 0.1 ? 1 - d / 0.1 : 0; };

  function handWorld(n, st) {
    // posisi tangan pada dunia dari state perawat (hitung tanpa menggambar ulang)
    return st;
  }
  void handWorld;

  // ================= render =================
  const wall = { clean: 0 };
  function render(t, ex) {
    const ph = tauAt(t);
    const alt = ph.mode === 'alt';
    const tau = ph.tau;
    // kamera
    const c = alt ? camAlt(tau) : camMain(tau);
    // ----- perawat -----
    const st = alt ? nurseAlt(tau) : nurseMain(tau);
    const sp = ex.spk && ex.spk.P ? ex.spk.P : 0;
    st.face = { ...st.face, env: sp, blink: blinkAt(t, 3.6, 0.5) };
    st.t = t;
    const hands = updateNurse(nurse, st);
    shadow.setAttribute('cx', f1(st.x));
    // ----- pasien -----
    for (const key of ['A', 'B']) {
      const b = beds[key];
      const br = Math.sin(t * 1.9 + (key === 'B' ? 1 : 0)) * 2;
      b.head.setAttribute('transform', `translate(${f1(b.cx)} ${f1(-262 + br)})`);
      b.body.setAttribute('transform', `translate(0 ${f1(br * 0.6)})`);
      const bl = Math.max(0.12, 1 - blinkAt(t, key === 'A' ? 4.1 : 3.3, key === 'A' ? 0.7 : 1.4) * 0.9);
      b.eL.setAttribute('ry', 12 * bl); b.eR.setAttribute('ry', 12 * bl);
      const look = key === 'A' ? (t < 12 ? 0.5 : 0.2) : 0.3;
      const dx = (key === 'A' ? 1 : -1) * look * 0;
      b.eL.setAttribute('cx', -30 + dx); b.eR.setAttribute('cx', 30 + dx);
      const smile = key === 'B' && alt && tau > 9.3 ? 1 : 0.4;
      b.mo.setAttribute('d', smile > 0.8 ? 'M-24 32Q0 58 24 32' : 'M-17 36Q0 48 17 36');
    }
    // ----- titik -----
    const hand = (which) => { const hp = hands[which]; return [st.x + hp[0] * st.sc, hp[1] * st.sc]; };
    const wobT = alt ? TAU_BACK + tau : tau; // waktu "alami" agar gerak titik menyambung saat putar balik
    const handB = hand('F');
    const riderAt = (i, tt) => { // posisi titik pengendara dengan jeda halus di belakang tangan
      const lag = 0.06 + i * 0.045;
      const sN = alt ? nurseAlt(Math.max(0, tt - lag - TAU_BACK)) : nurseMain(Math.max(4.95, tt - lag));
      return sN;
    };
    void riderAt;
    for (const d of dots) {
      let x, y, a = 1, sc = 1;
      const bob = Math.sin(wobT * 2.1 + d.i) * 4;
      if (!d.rider) {
        const appear = 12.0 + (d.i - 6) * 0.22;
        const k = smooth((wobT - appear) / 0.45) * (alt || wobT < 4.9 ? 1 : 1);
        x = d.home[0] + Math.sin(wobT * 0.9 + d.i * 1.7) * 6; y = d.home[1] + bob;
        a = wobT < appear ? 0 : k; sc = 0.4 + 0.6 * clamp((wobT - appear) / 0.4, 0, 1.15);
        if (alt) { a = 1; sc = 1; }
      } else {
        const appear = 10.9 + d.i * 0.1;
        const attach = 17.7 + d.i * 0.14;
        const ang = d.ang + wobT * 1.4;
        // lag: tangan pada waktu lebih awal
        let hp;
        if (alt) { const sN = nurseAlt(Math.max(0, tau - 0.05 - d.i * 0.05)); hp = updateNurseHandOnly(sN); } else { const sN = nurseMain(Math.max(4.95, tau - 0.05 - d.i * 0.05)); hp = updateNurseHandOnly(sN); }
        const orb = [hp[0] + Math.cos(ang) * d.rad * 0.6, hp[1] + Math.sin(ang) * d.rad * 0.5 - 6 + bob * 0.4];
        if (alt) {
          const pop = 3.2 + d.i * 0.18;
          const u = (tau - pop) / 0.55;
          if (u >= 0) { x = orb[0]; y = orb[1]; a = 1 - smooth(u); sc = 1 + u * 1.1; } else { x = orb[0]; y = orb[1]; }
          if (tau < 0.01) { x = orb[0]; y = orb[1]; }
        } else if (wobT < appear) { a = 0; x = d.home[0]; y = d.home[1]; }
        else if (wobT < attach) {
          const k = smooth((wobT - appear) / 0.4);
          x = d.home[0] + Math.sin(wobT * 1.1 + d.i) * 5; y = d.home[1] + bob; a = k; sc = 0.4 + 0.6 * k;
        } else {
          const u = smoother((wobT - attach) / 1.0);
          x = lerp(d.home[0], orb[0], u); y = lerp(d.home[1], orb[1], u) - Math.sin(Math.PI * u) * 40; sc = 1 - 0.15 * u;
        }
      }
      d.g.setAttribute('transform', `translate(${f1(x)} ${f1(y)}) scale(${f1(sc * 100) / 100})`);
      d.g.setAttribute('opacity', clamp(a, 0, 1).toFixed(3));
      d.g.firstChild.setAttribute('r', (11 + (d.i % 3) * 3) * (2.0 + Math.sin(wobT * 3 + d.i) * 0.2));
    }
    // ----- fx: sentuh pagar, kilau bersih, kehangatan -----
    let fh = '';
    const ripple = (cx, cy, u, col) => (u > 0 && u < 1 ? `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(20 + u * 70)}" fill="none" stroke="${col}" stroke-width="${f1(8 * (1 - u))}" opacity="${f1(1 - u)}"/>` : '');
    if (!alt) {
      fh += ripple(-180, RAIL_Y, (tau - 10.5) / 0.8, '#F8C038');
      fh += ripple(-180, RAIL_Y, (tau - 17.5) / 0.8, '#F8C038');
    }
    railGlow.setAttribute('cx', -185);
    const glow = (!alt ? (smooth((tau - 10.5) / 0.4) * (1 - smooth((tau - 12.2) / 0.6)) + smooth((tau - 17.5) / 0.4) * (1 - smooth((tau - 18.8) / 0.4))) : 0);
    railGlow.setAttribute('opacity', f1(glow * 0.55 * 100) / 100);
    if (alt) {
      // kilau tangan bersih
      const u = (tau - 4.3) / 1.5;
      if (u > 0 && u < 1) {
        const hp = hands.B, hq = hands.F;
        for (const [k, p] of [[0, hp], [1, hq]]) for (let j = 0; j < 3; j++) {
          const a = u * 2 + j * 2.1 + k, rr = 36 + j * 14;
          const sx = st.x + p[0] + Math.cos(a) * rr * 0.6, sy = p[1] - 20 + Math.sin(a) * rr * 0.5 - u * 30;
          const s2 = (1 - Math.abs(u * 2 - 1)) * (12 + j * 4);
          fh += `<path d="${star(s2)}" transform="translate(${f1(sx)} ${f1(sy)})" fill="#fff" opacity="${f1(0.95 * (1 - u * 0.5))}"/>`;
        }
      }
      // ledakan kecil saat titik dibersihkan
      for (const d of dots) if (d.rider) {
        const pop = 3.2 + d.i * 0.18, u = (tau - pop) / 0.6;
        if (u > 0 && u < 1) {
          const hp = [st.x + hands.F[0] + Math.cos(d.ang + wobT * 1.4) * d.rad * 0.6, hands.F[1] + Math.sin(d.ang + wobT * 1.4) * d.rad * 0.5];
          for (let j = 0; j < 5; j++) { const a = j * 1.26 + d.i; fh += `<path d="${star(10 * (1 - u))}" transform="translate(${f1(hp[0] + Math.cos(a) * u * 60)} ${f1(hp[1] + Math.sin(a) * u * 60)})" fill="#fff" opacity="${f1(1 - u)}"/>`; }
        }
      }
      // kehangatan saat menyentuh pasien B
      const wu = smooth((tau - 9.4) / 0.6);
      if (wu > 0) {
        const px = st.x + hands.F[0], py = hands.F[1];
        const pulse = 1 + Math.sin(tau * 3) * 0.08;
        fh += `<circle cx="${f1(px)}" cy="${f1(py)}" r="${f1(70 * pulse)}" fill="#9DE0BD" opacity="${f1(0.35 * wu)}"/><circle cx="${f1(px)}" cy="${f1(py)}" r="${f1(40 * pulse)}" fill="#fff" opacity="${f1(0.4 * wu)}"/>`;
      }
    }
    fx.innerHTML = fh;
    // ----- kamera -----
    cam.setAttribute('transform', `translate(540 960) scale(${f1(c[2] * 1000) / 1000}) translate(${f1(-c[0])} ${f1(-c[1])})`);
    return { cam: c, tau, mode: ph.mode, frozen: !!ph.frozen, rewind: !!ph.rewind, nurseX: st.x, hands, alt };
  }

  function updateNurseHandOnly(sN) {
    // ujung tangan kanan-layar (F) memakai solver yang sama tetapi tanpa menggambar
    const S = [90, -316], T = sN.handF, L = 188;
    let dx = T[0] - S[0], dy = T[1] - S[1], d = Math.hypot(dx, dy) || 1;
    const maxd = L * 1.04; if (d > maxd) { dx *= maxd / d; dy *= maxd / d; d = maxd; }
    return [sN.x + S[0] + dx + dx / d * 17, S[1] + dy + dy / d * 17];
  }

  return { render, beds, nurse, svg };
}

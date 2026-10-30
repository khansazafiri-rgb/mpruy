// Latar dan benda: bilik IGD (ranjang, monitor, tirai, tiang infus), meja perawat, ruang konsultasi, dan ikon.
import { clamp, lerp, ease, kf, win, r1, rnd, rect, circ, txt, poly, g, place, C } from './lib.js';
import { raka, rakaSvg } from '../../../brand/characters/raka/raka.js';
import { orang, orangSvg, LOOKS, idleOrang } from './orang.js';

const mixHex = (a, b, k) => { const A = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16)), B = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16)); return '#' + A.map((v, i) => Math.round(lerp(v, B[i], clamp(k, 0, 1))).toString(16).padStart(2, '0')).join(''); };

// ---------- jam dinding ----------
export function wallClock(x, y, minutes, r = 64) {
  const m = ((minutes % 60) + 60) % 60, h = ((minutes / 60) % 12 + 12) % 12;
  const ang = (a, len, w, col) => `<path d="M${x} ${y}L${r1(x + Math.sin(a) * len)} ${r1(y - Math.cos(a) * len)}" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>`;
  let s = circ(x, y, r + 8, '#E4ECEE') + circ(x, y, r, '#FFFFFF');
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; s += `<path d="M${r1(x + Math.sin(a) * (r - 10))} ${r1(y - Math.cos(a) * (r - 10))}L${r1(x + Math.sin(a) * (r - 4))} ${r1(y - Math.cos(a) * (r - 4))}" stroke="#7A8D95" stroke-width="3" stroke-linecap="round"/>`; }
  s += ang((h / 12) * Math.PI * 2, r * 0.5, 6, '#2A3A44') + ang((m / 60) * Math.PI * 2, r * 0.78, 4, '#2A3A44') + circ(x, y, 5, '#D9382F');
  return s;
}

// ---------- monitor pasien (hanya gelombang, tanpa angka) ----------
export function monitor(x, y, t, mode = 'alarm') {
  const w = 270, h = 190;
  const period = mode === 'alarm' ? 0.62 : 0.95;
  const pts = [];
  const N = 70;
  for (let i = 0; i <= N; i++) {
    const u = i / N, tt = t * 1.0 - (1 - u) * 1.9;
    const ph = ((tt / period) % 1 + 1) % 1;
    let v = 0;
    if (ph < 0.08) v = -Math.sin((ph / 0.08) * Math.PI) * 0.25; // P
    else if (ph > 0.18 && ph < 0.22) v = (ph - 0.18) / 0.04 * 0.25;            // Q
    else if (ph >= 0.22 && ph < 0.27) v = -1 + (ph - 0.22) / 0.05 * 1.35 * 0 - Math.sin(((ph - 0.22) / 0.05) * Math.PI) * 1; // R
    else if (ph > 0.4 && ph < 0.58) v = -Math.sin(((ph - 0.4) / 0.18) * Math.PI) * 0.35; // T
    v += mode === 'alarm' ? (rnd(Math.floor(tt * 7)) - 0.5) * 0.18 : 0;
    pts.push([x + 22 + u * (w - 44), y + h * 0.5 + v * 46]);
  }
  const path = pts.map((p, i) => (i ? 'L' : 'M') + r1(p[0]) + ' ' + r1(p[1])).join('');
  const flash = mode === 'alarm' ? 0.5 + 0.5 * Math.sin(t * 9) : 0;
  let s = rect(x - 8, y - 8, w + 16, h + 16, '#25323C', 18) + rect(x, y, w, h, '#06141A', 12);
  if (mode === 'alarm') s += rect(x - 8, y - 8, w + 16, h + 16, 'none', 18, `stroke="#FF5A4E" stroke-width="7" opacity="${r1(0.25 + 0.75 * flash)}"`);
  s += `<path d="${path}" fill="none" stroke="#5BFF9C" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`;
  s += `<path d="M${x + 22} ${y + h - 38}H${x + w - 22}" stroke="#3EA9FF" stroke-width="3" opacity=".6" stroke-dasharray="10 8"/>`;
  s += `<path d="M${x + 22} ${y + 28}H${x + 90}" stroke="#FFD34D" stroke-width="5" stroke-linecap="round" opacity=".85"/><path d="M${x + 22} ${y + 46}H${x + 60}" stroke="#FF8A7A" stroke-width="5" stroke-linecap="round" opacity=".6"/>`;
  s += rect(x + w / 2 - 12, y + h + 8, 24, 60, '#25323C', 6);
  return s;
}

// ---------- tiang infus ----------
export function ivPole(x, y0, t, level = 0.7) {
  let s = rect(x - 5, y0, 10, 620, '#9FB2BF', 4) + rect(x - 60, y0 - 4, 120, 10, '#9FB2BF', 5);
  s += `<path d="M${x - 34} ${y0 + 6}V${y0 + 34}M${x + 34} ${y0 + 6}V${y0 + 34}" stroke="#9FB2BF" stroke-width="5" stroke-linecap="round"/>`;
  s += `<path d="M${x - 62} ${y0 + 34}H${x - 8}V${y0 + 150}Q${x - 8} ${y0 + 160} ${x - 18} ${y0 + 160}H${x - 52}Q${x - 62} ${y0 + 160} ${x - 62} ${y0 + 150}Z" fill="#EAF6FB" opacity=".95"/>`;
  s += `<path d="M${x - 62} ${r1(y0 + 34 + 126 * (1 - level))}H${x - 8}V${y0 + 150}Q${x - 8} ${y0 + 160} ${x - 18} ${y0 + 160}H${x - 52}Q${x - 62} ${y0 + 160} ${x - 62} ${y0 + 150}Z" fill="#9FD6F2" opacity=".85"/>`;
  s += rect(x - 44, y0 + 160, 24, 34, '#DCEBF2', 6);
  const drip = (t * 1.3) % 1;
  s += circ(x - 32, y0 + 172 + drip * 14, 3.6, '#7FC4EC', `opacity="${r1(1 - drip)}"`);
  s += rect(x - 124, y0 + 614, 248, 12, '#7F929E', 6) + circ(x - 100, y0 + 640, 12, '#4B5A64') + circ(x + 100, y0 + 640, 12, '#4B5A64');
  return s;
}

// ---------- bilik IGD ----------
export const BAY = { mattressY: 1112, floorY: 1272 };
/**
 * Bilik IGD tampak samping. o = { t, lit (0 = darurat dingin, 1 = hangat tenang), sky (0 malam, 1 siang), minutes (jam dinding),
 *  rakaState (keadaan Raka), rakaOpts, staff: [{ who, x, state }], monitorMode, ivLevel, extraFront (string SVG di depan), extraBack, xRaka }
 * Raka digambar dari raka.js (varian rebah) di atas kasur; tenaga kesehatan berdiri di balik ranjang, badan di belakang pasien
 * dan lengannya di depan pasien sehingga terlihat memeriksa.
 */
export function bay(o) {
  const t = o.t, lit = o.lit ?? 0, sky = o.sky ?? 0;
  const wall = mixHex('#DDEAF0', '#F6EBD6', lit), wall2 = mixHex('#CFE0E6', '#EADCC0', lit), floor = mixHex('#B9CAD3', '#D8C7AA', lit), floor2 = mixHex('#A9BBC5', '#CDBB9B', lit);
  let s = '';
  s += rect(-20, -20, 1120, BAY.floorY + 30, wall) + rect(-20, 940, 1120, 340, wall2);
  s += rect(-20, 934, 1120, 12, mixHex('#C2D2D8', '#DCCAA8', lit));       // pegangan dinding
  // langit-langit dan panel lampu
  s += rect(-20, -20, 1120, 120, mixHex('#C8D6DC', '#F0E4CC', lit));
  for (const x of [120, 460, 800]) s += rect(x, 26, 220, 34, mixHex('#F4FBFF', '#FFF6DE', lit), 10) + rect(x - 14, 20, 248, 46, '#FFFFFF', 14, `opacity="${r1(0.16 + 0.12 * lit)}"`);
  // jendela (malam atau siang)
  const skyCol = mixHex('#14284A', '#BFE5FF', sky);
  s += rect(700, 330, 250, 250, '#E9F0F2', 16) + rect(716, 346, 218, 218, skyCol, 8) + rect(819, 346, 12, 218, '#E9F0F2') + rect(716, 449, 218, 12, '#E9F0F2');
  if (sky < 0.5) s += circ(770, 410, 22, '#EAF1FF', `opacity="${r1(1 - sky * 2)}"`);
  else s += circ(880, 400, 30, '#FFE9A8', `opacity="${r1(sky * 2 - 1)}"`);
  // jam dinding
  s += wallClock(580, 440, o.minutes ?? 12);
  // lantai
  s += rect(-20, BAY.floorY, 1120, 700, floor);
  for (let i = 0; i < 7; i++) s += rect(-20, BAY.floorY + 40 + i * 74, 1120, 4, floor2, 0, 'opacity=".7"');
  for (let i = -3; i < 16; i++) s += `<path d="M${r1(i * 150 + 40)} ${BAY.floorY}L${r1(i * 150 - 140 + (i - 6) * 40)} ${BAY.floorY + 520}" stroke="${floor2}" stroke-width="4" opacity=".55"/>`;
  s += rect(-20, BAY.floorY - 14, 1120, 18, mixHex('#C2D2D8', '#E2D2B2', lit));
  // monitor dan tiang infus
  s += monitor(120, 620, t, o.monitorMode || 'alarm');
  s += ivPole(985, 600, t, o.ivLevel ?? 0.7);
  if (o.extraBack) s += o.extraBack;
  // tenaga kesehatan: badan di belakang pasien (lengan menyusul di depan pasien)
  const staff = o.staff || [];
  const dyn = (st, parts) => place(orangSvg(st.state, LOOKS[st.who], { bare: true, shadow: false, legs: false, parts, uid: 'b' + st.who + (st.id || '') }), st.x, st.y ?? 1190, st.s ?? 0.8, st.flip ? '' : '');
  for (const st of staff) s += dyn(st, 'body');
  // ranjang: kasur, bantal, Raka, seprai
  const rk = o.rakaState;
  const rkx = o.xRaka ?? 120, rky = 800 + (o.rakaDy || 0);
  s += rect(130, BAY.mattressY - 6, 770, 62, '#B7C9D2', 22);
  s += `<ellipse cx="${r1(rkx + 190)}" cy="${BAY.mattressY - 40}" rx="150" ry="52" fill="#FFFFFF"/>`;
  s += `<g transform="translate(${r1(rkx)} ${r1(rky)}) scale(0.9)">${rakaSvg(rk, { bare: true, rebah: true, shadow: false, uid: 'bayraka', ...(o.rakaOpts || {}) })}</g>`;
  // seprai menutupi kaki: dari pinggul ke ujung
  s += `<path d="M${r1(rkx + 370)} ${BAY.mattressY - 128}C${r1(rkx + 420)} ${BAY.mattressY - 150} ${r1(rkx + 520)} ${BAY.mattressY - 118} ${r1(rkx + 700)} ${BAY.mattressY - 100}L${r1(rkx + 740)} ${BAY.mattressY + 8}L${r1(rkx + 370)} ${BAY.mattressY + 8}Z" fill="#EAF4F2"/>`;
  s += `<path d="M${r1(rkx + 372)} ${BAY.mattressY - 120}C${r1(rkx + 380)} ${BAY.mattressY - 60} ${r1(rkx + 372)} ${BAY.mattressY - 30} ${r1(rkx + 378)} ${BAY.mattressY}" stroke="#C9DEDB" stroke-width="10" fill="none" stroke-linecap="round"/>`;
  s += `<path d="M${r1(rkx + 470)} ${BAY.mattressY - 90}Q${r1(rkx + 520)} ${BAY.mattressY - 70} ${r1(rkx + 560)} ${BAY.mattressY - 20}M${r1(rkx + 600)} ${BAY.mattressY - 96}Q${r1(rkx + 640)} ${BAY.mattressY - 60} ${r1(rkx + 660)} ${BAY.mattressY - 10}" stroke="#D3E6E3" stroke-width="12" fill="none" stroke-linecap="round" opacity=".9"/>`;
  // selang infus dari kantung ke tangan
  if (o.iv !== false) s += `<path d="M923 ${600 + 160}C900 ${860} ${r1(rkx + 640)} ${BAY.mattressY - 220} ${r1(rkx + 460)} ${BAY.mattressY - 80}" stroke="#BFE6F5" stroke-width="5" fill="none" stroke-linecap="round" opacity=".9"/>`;
  // lengan tenaga kesehatan di depan pasien
  for (const st of staff) s += dyn(st, 'arms');
  // badan ranjang: panel putih menutupi bagian bawah (kaki tenaga kesehatan tersembunyi), rel samping, roda
  s += rect(110, BAY.mattressY + 56, 800, 92, '#F3F8F8', 18) + rect(110, BAY.mattressY + 56, 800, 14, '#DCE8EA', 7);
  s += rect(150, BAY.mattressY + 146, 18, 70, '#8CA0AB', 6) + rect(852, BAY.mattressY + 146, 18, 70, '#8CA0AB', 6) + rect(140, BAY.mattressY + 196, 740, 12, '#8CA0AB', 6);
  for (const wx of [170, 850]) s += circ(wx, BAY.mattressY + 232, 30, '#3B4A54') + circ(wx, BAY.mattressY + 232, 12, '#9FB2BF');
  s += rect(886, BAY.mattressY - 58, 20, 130, '#C5D3DC', 8);   // pagar ranjang di ujung kaki
  // tirai pemeriksaan di kiri dan kanan
  const cur = (x0, w, flip) => {
    let c = `<path d="M${x0} 300H${x0 + w}V${BAY.floorY + 8}H${x0}Z" fill="${mixHex('#3FA7A0', '#5DB8A8', lit)}"/>`;
    for (let i = 0; i < 6; i++) c += `<path d="M${r1(x0 + (w / 6) * (i + 0.5))} 300V${BAY.floorY}" stroke="${mixHex('#2E8F89', '#49A394', lit)}" stroke-width="${r1(w / 14)}" opacity=".5"/>`;
    return c + `<path d="M${x0} ${BAY.floorY - 10}Q${x0 + w / 2} ${BAY.floorY + 20} ${x0 + w} ${BAY.floorY - 10}" stroke="${mixHex('#2E8F89', '#49A394', lit)}" stroke-width="8" fill="none"/>`;
  };
  s += rect(-20, 286, 1120, 16, '#9FB2BF', 8) + cur(-40, 150, 0) + cur(940, 190, 1);
  if (o.extraFront) s += o.extraFront;
  // suasana cahaya: dingin dan redup saat darurat, hangat saat tenang
  s += rect(-20, -20, 1120, 1420, '#0A1830', 0, `opacity="${r1(0.24 * (1 - lit))}"`);
  s += rect(-20, -20, 1120, 1420, '#FFE2A8', 0, `opacity="${r1(0.1 * lit)}"`);
  return s;
}

// ---------- ikon sederhana ----------
export const ICON = {
  phoneOff: (x, y, s = 1, t = 0) => g(`${rect(-46, -80, 92, 160, '#2B3A44', 18)}${rect(-38, -62, 76, 108, '#CFE7EF', 8)}${circ(0, 62, 8, '#8CA0AB')}`
    + `<path d="M-24 -20h48M-24 4h30" stroke="#8CA0AB" stroke-width="7" stroke-linecap="round"/>${rect(-30, 24, 60, 18, '#E8665F', 9)}`
    + `<g stroke="#8CA0AB" stroke-width="6" stroke-linecap="round" fill="none" opacity="${r1(0.4 + 0.4 * Math.sin(t * 7))}"><path d="M60 -50q18 14 0 28M76 -62q30 26 0 52"/></g>`, { x, y, s }),
  scale: (x, y, s = 1) => g(`<path d="M0 -70V60M-60 60H60" stroke="#0A3830" stroke-width="10" stroke-linecap="round"/><path d="M-78 -40H78" stroke="#0A3830" stroke-width="10" stroke-linecap="round"/><path d="M-78 -40L-110 18H-46Z M78 -40L46 18H110Z" fill="#F8C038"/><path d="M-110 18Q-78 44 -46 18M46 18Q78 44 110 18" stroke="#0A3830" stroke-width="8" fill="none" stroke-linecap="round"/><circle cx="0" cy="-78" r="12" fill="#0A3830"/>`, { x, y, s }),
  clipboard: (x, y, s = 1, check = 0) => g(`${rect(-60, -78, 120, 156, '#E9F0F2', 14)}${rect(-60, -78, 120, 156, 'none', 14, 'stroke="#8CA0AB" stroke-width="6"')}${rect(-28, -92, 56, 26, '#8CA0AB', 10)}`
    + `<path d="M-36 -36h72M-36 -8h72M-36 20h46" stroke="#B5C4CB" stroke-width="8" stroke-linecap="round"/>`
    + (check > 0.02 ? `<g opacity="${r1(check)}"><circle cx="30" cy="42" r="24" fill="#00A383"/><path d="M18 42l9 9 17-20" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></g>` : ''), { x, y, s }),
  qmark: (x, y, s = 1, col = '#E8665F') => g(txt('?', 0, 0, { size: 150, fill: col }), { x, y, s }),
  hourglass: (x, y, s = 1, t = 0) => g(`<path d="M-44 -70H44M-44 70H44" stroke="#0A3830" stroke-width="10" stroke-linecap="round"/><path d="M-36 -70C-36 -10 -8 -10 0 0C-8 10 -36 10 -36 70H36C36 10 8 10 0 0C8 -10 36 -10 36 -70Z" fill="#EAF6FB" stroke="#0A3830" stroke-width="7" stroke-linejoin="round"/><path d="M-26 -62H26C26 -26 8 -16 0 -6C-8 -16 -26 -26 -26 -62Z" fill="#F8C038" opacity="${r1(1 - (t % 1) * 0.9)}"/><path d="M-30 64H30C28 40 10 22 0 10C-10 22 -28 40 -30 64Z" fill="#F8C038" opacity="${r1(0.2 + (t % 1) * 0.8)}"/>`, { x, y, s }),
  heart: (x, y, s = 1, pulse = 0) => g(`<path d="M0 62S-72 14-72 -30q0-34 32-34 28 0 40 26 12-26 40-26 32 0 32 34C72 14 0 62 0 62z" fill="#E8665F"/>`, { x, y, s: s * (1 + pulse * 0.08) }),
  shield: (x, y, s = 1) => g(`<path d="M0 -70L62 -46V8C62 44 30 66 0 78C-30 66 -62 44 -62 8V-46Z" fill="#00A383"/><path d="M-26 6l18 18 34-40" fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>`, { x, y, s }),
};

// ---------- ruang konsultasi (situasi umum): dokter menjelaskan, pasien Bu memahami dan menyetujui ----------
export function consult(o) {
  const { t, dokter, pasienSvg: ps, check } = o;
  let s = rect(0, 0, 960, 760, '#EAF3F1') + rect(0, 560, 960, 200, '#D6E6E3') + rect(0, 556, 960, 10, '#C2D6D2');
  s += rect(60, 90, 220, 170, '#F7FBFB', 14) + rect(70, 100, 200, 150, '#BFE0EF', 8) + rect(165, 100, 10, 150, '#F7FBFB') + rect(70, 170, 200, 10, '#F7FBFB');
  s += `<g transform="translate(720 190)">${rect(-64, -84, 128, 168, '#E4EEF1', 12)}<path d="M-40 -40h80M-40 -10h80M-40 20h54" stroke="#B5C4CB" stroke-width="8" stroke-linecap="round"/><path d="M0 -84v-14" stroke="#B5C4CB" stroke-width="6"/></g>`;
  s += dokter;
  s += ps;
  // meja dan formulir
  s += rect(380, 520, 460, 36, '#C98F5B', 10) + rect(400, 556, 420, 170, '#B9773F', 8) + rect(410, 560, 400, 30, '#A5672F', 6);
  s += `<g transform="translate(610 508)">${rect(-70, -14, 140, 18, '#fff', 4)}${rect(-60, -10, 120, 10, '#fff', 3)}</g>`;
  s += g(ICON.clipboard(0, 0, 1, check), { x: 610, y: 470, s: 0.75 });
  return s;
}

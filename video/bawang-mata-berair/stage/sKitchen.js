// Peta ruang DAPUR (satu orientasi di seluruh video): Raka di sisi KIRI layar menghadap ke kanan, talenan dan bawang di sisi KANAN, meja dapur di y = 1300.
// Naik di layar = menjauh dari bawang menuju wajah Raka. Partikel iritan SELALU berawal dari irisan bawang (bukan dari tangan atau mata) dan bergerak ke mata Raka.
// Adegan: A hook (0 - 5,95) · B perjalanan partikel (11,5 - 13,8) · C wajah Raka + ringkasan (19,8 - 25,4).
import { f1, clamp, lerp, sm, eo, eio, eob, track, pchip, R, C, T, K, CREAM, chip, tag, op, armTo, rk, raka, rIdle, lerpState, camG, ka, tw, pop, rndf } from './common.js';

export const CY = 1300, RK = { cx: 330, k: 1.25 }, TY = CY - 580 * RK.k;
export const EDGE0 = 800, STEP = 16, CH = [0.30, 0.76, 1.22, 1.68];       // tepi kiri bawang; irisan tiap pisau mendarat
export const PATH = [[820, 1196], [800, 1030], [600, 900], [452, 886]];     // rute iritan: dari irisan bawang -> mata kanan-layar Raka
export const bez = (u, P = PATH) => { const a = 1 - u, [p0, p1, p2, p3] = P; return [a * a * a * p0[0] + 3 * a * a * u * p1[0] + 3 * a * u * u * p2[0] + u * u * u * p3[0], a * a * a * p0[1] + 3 * a * a * u * p1[1] + 3 * a * u * u * p2[1] + u * u * u * p3[1]]; };
const rot = (x, y, deg) => { const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); return [x * c - y * s, x * s + y * c]; };
/** keadaan memotong: sudut pisau (0 = rata di talenan, naik hingga 24 derajat), posisi ujung, jumlah irisan yang sudah lepas, tepi bawang */
export function chop(t) {
  const n = CH.filter((c) => t >= c).length, edge = EDGE0 + STEP * n;
  let th;
  if (t < CH[0]) th = 10 * (1 - Math.pow(clamp(t / CH[0]), 3));
  else if (n >= CH.length) th = 0;
  else { const c = CH[n - 1], d = t - c; th = d < 0.05 ? 0 : d < 0.27 ? 24 * sm((d - 0.05) / 0.22) : 24 * (1 - Math.pow(clamp((d - 0.27) / (CH[n] - c - 0.27)), 3)); }
  const sx = n === 0 ? 0 : (n >= CH.length ? STEP * n : STEP * (n - 1) + STEP * sm((t - CH[n - 1]) / 0.25));
  const tip = [EDGE0 + 14 + sx, 1262], g = rot(-236, -22, th);
  return { th, tip, hand: [tip[0] + g[0], tip[1] + g[1]], n, edge };
}
export const handToRaka = (h) => [200 + (h[0] - RK.cx) / RK.k, (h[1] - TY) / RK.k];
export const armOnKnife = (hand) => { const [hx, hy] = handToRaka(hand); return armTo('R', hx, hy, { ex: hx - 20, ey: hy + 44 }); };

// ------------------------------------------------------------------ gambar benda
/** molekul iritan (glyph kecil, satu bentuk dan satu warna di seluruh video) */
export const mol = (x, y, s = 1, rt = 0, a = 1) => a <= 0.01 ? '' : `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(rt)}) scale(${f1(s * 100) / 100})" opacity="${f1(Math.min(1, a) * 100) / 100}"><circle r="19" fill="${K.irrHi}" opacity=".35"/><path d="M0 0L13 -9M0 0L11 11" stroke="${K.irrD}" stroke-width="3.2" stroke-linecap="round"/><circle cx="13" cy="-9" r="5.5" fill="${K.irr}" stroke="${K.irrD}" stroke-width="2"/><circle cx="11" cy="11" r="5.5" fill="${K.irr}" stroke="${K.irrD}" stroke-width="2"/><circle r="8.5" fill="${K.irr}" stroke="${K.irrD}" stroke-width="2.6"/><circle cx="-2.5" cy="-2.5" r="2.4" fill="#fff" opacity=".7"/></g>`;
export function kitchenBg() {
  let s = `<rect x="-9000" y="-9000" width="18000" height="18000" fill="${CREAM}"/>`;
  for (let r = 0; r < 12; r++) for (let c = 0; c < 8; c++) s += `<rect x="${c * 140 - 20 + (r % 2) * 70}" y="${620 + r * 56}" width="132" height="50" rx="6" fill="#F1E6CD"/>`;
  s += `<rect x="-20" y="560" width="1120" height="14" fill="#E4D6B6"/><circle cx="110" cy="420" r="170" fill="#EADFC4" opacity=".7"/>`;
  s += `<rect x="760" y="360" width="250" height="26" rx="10" fill="#B98A5A"/>` + [['#E8665F', 790, 288], ['#F8C038', 850, 300], ['#5FA77F', 915, 292]].map(([c, x, y]) => `<rect x="${x}" y="${y}" width="46" height="${386 - y - 26}" rx="10" fill="${c}"/><rect x="${x + 6}" y="${y - 12}" width="34" height="14" rx="5" fill="#C98F55"/>`).join('');
  return s;
}
export function counter() {
  return `<rect x="-20" y="${CY}" width="1120" height="56" fill="#E9EDF1"/><rect x="-20" y="${CY + 56}" width="1120" height="700" fill="#B9C3CE"/><rect x="-20" y="${CY}" width="1120" height="8" fill="#FFFFFF" opacity=".7"/><rect x="40" y="${CY + 110}" width="460" height="520" rx="22" fill="#A9B4C0"/><rect x="580" y="${CY + 110}" width="460" height="520" rx="22" fill="#A9B4C0"/><circle cx="470" cy="${CY + 150}" r="12" fill="#8896A5"/><circle cx="610" cy="${CY + 150}" r="12" fill="#8896A5"/>`;
}
export const board = () => `<rect x="540" y="1262" width="520" height="44" rx="14" fill="#C99A5B"/><rect x="540" y="1262" width="520" height="30" rx="14" fill="#E3B77B"/><path d="M590 1272L720 1272M800 1278L960 1278" stroke="#D2A267" stroke-width="5" stroke-linecap="round"/>`;
/** setengah bawang, sisi potong menghadap kita: kulit emas, lapisan krem berlingkar. Dipotong dari kiri (irisan lepas tiap pisau mendarat) */
export function onion(edge) {
  const body = 'M790 1262C780 1180 840 1110 900 1110C960 1110 1020 1180 1010 1262Z', face = 'M804 1258C796 1186 848 1128 900 1128C952 1128 1004 1186 996 1258Z';
  const rings = [0.8, 0.6, 0.4, 0.2].map((k) => `<path d="M${f1(900 - 96 * k)} 1258C${f1(900 - 100 * k)} ${f1(1258 - 70 * k)} ${f1(900 - 54 * k)} ${f1(1258 - 130 * k)} 900 ${f1(1258 - 130 * k)}C${f1(900 + 54 * k)} ${f1(1258 - 130 * k)} ${f1(900 + 100 * k)} ${f1(1258 - 70 * k)} ${f1(900 + 96 * k)} 1258" fill="none" stroke="#E6D3A4" stroke-width="4"/>`).join('');
  return `<defs><clipPath id="onClip"><rect x="${f1(edge)}" y="1080" width="400" height="200"/></clipPath></defs><g clip-path="url(#onClip)"><path d="${body}" fill="#E3A840" stroke="#B87822" stroke-width="6" stroke-linejoin="round"/><path d="${face}" fill="#FFF6E0"/>${rings}<path d="M900 1110L896 1084" stroke="#B87822" stroke-width="7" stroke-linecap="round"/></g>`;
}
/** irisan (pil krem) yang lepas dari kiri bawang lalu jatuh ke tumpukan di kiri */
export function strips(t) {
  let s = '';
  CH.forEach((c, i) => { const d = t - c; if (d < 0) return; const u = eo(clamp(d / 0.3)), x0 = EDGE0 + STEP * i - 4, y0 = 1190, x1 = 736 - 7 * i, y1 = 1262 - 8 - 14 * Math.floor(i / 2);
    const x = lerp(x0, x1, u), y = lerp(y0, y1, u) - Math.sin(Math.PI * u) * 34, r = lerp(90, i % 2 ? 4 : -3, u);
    s += `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(r)})"><rect x="-26" y="-7" width="52" height="14" rx="7" fill="#FFF6E0" stroke="#E6D3A4" stroke-width="3"/></g>`; });
  return s;
}
export function knife(c, lying = false) {
  const [tx, ty] = c.tip;
  return `<g transform="translate(${f1(tx)} ${f1(ty)}) rotate(${f1(c.th)}) scale(.9)"><path d="M0 0L-214 0L-214 -50C-130 -60 -44 -44 0 0Z" fill="${K.steel}" stroke="${K.steelD}" stroke-width="5" stroke-linejoin="round"/><path d="M-200 -34C-140 -42 -70 -30 -22 -10" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".8"/><rect x="-232" y="-52" width="22" height="50" rx="4" fill="#8A97A3"/><rect x="-330" y="-48" width="104" height="38" rx="16" fill="#5A3A2A"/><circle cx="-300" cy="-29" r="4" fill="#E3C79A"/><circle cx="-262" cy="-29" r="4" fill="#E3C79A"/></g>`;
}
// ------------------------------------------------------------------ partikel
/** satu partikel menempuh rute dari irisan ke mata: mulai t0, durasi d; mengembalikan [x, y, sudut, alfa] atau null */
export function flight(t, t0, d, seed = 0) {
  const u = (t - t0) / d; if (u < 0 || u > 1.02) return null;
  const e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2, ee = lerp(u, e, 0.45), [x, y] = bez(clamp(ee));
  const w = Math.sin(u * 9 + seed * 2.1) * 14 * (1 - u * 0.5), [px, py] = [-(bez(clamp(ee + 0.01))[1] - y), bez(clamp(ee + 0.01))[0] - x]; const L = Math.hypot(px, py) || 1;
  return [x + px / L * w, y + py / L * w, u * 220 + seed * 40, clamp(u * 7) * (u > 0.94 ? clamp((1.02 - u) / 0.08) : 1)];
}
export const dashPath = (a = 1, prog = 1) => { const [p0, p1, p2, p3] = PATH, L = 640; return `<path d="M${p0[0]} ${p0[1]}C${p1[0]} ${p1[1]} ${p2[0]} ${p2[1]} ${p3[0]} ${p3[1]}" fill="none" stroke="${K.irrD}" stroke-width="6" stroke-linecap="round" stroke-dasharray="4 18" stroke-dashoffset="0" opacity="${f1(a * 0.55 * 100) / 100}" pathLength="${L}" style="stroke-dasharray:4 18"/>`; };
// ------------------------------------------------------------------ Raka di dapur
export function rakaState(t, mode, o = {}) {
  const base = { yaw: 0.55, gazeX: 0.9, gazeY: 0.8, lean: 2 };
  const chopS = (tt) => raka('netral', null, { ...base, armR: armOnKnife(chop(tt).hand) });
  const rub = (tt) => raka('perih', 'usap_mata', { yaw: 0.55, gazeX: 0.9, gazeY: 0.8, tearsT: tt * 1.4, armR: { wx: 258 + 8 * Math.sin(tt * 17), wy: 272 + 5 * Math.cos(tt * 17), ex: 332, ey: 360, finger: 0, fa: -90, front: 1, hold: 0, holdRot: 0 } });
  let st;
  if (mode === 'hook') st = t < 1.62 ? chopS(t) : lerpState(chopS(Math.min(t, 1.7)), rub(t), sm((t - 1.62) / 0.5));
  else if (mode === 'flight') { st = chopS(10); st = lerpState(st, raka('khawatir', null, { ...base, armR: st.armR }), sm((t - 12.6) / 0.5)); }
  else { // wajah: dari menggosok mata -> paham (lega + menunjuk), air mata masih mengalir
    const a = rub(t), b = raka('lega', 'menunjuk', { yaw: 0.35, gazeX: 0.4, gazeY: -0.1, tears: 0.8, tearsT: t * 1.4, lean: 1.5 });
    st = lerpState(a, b, sm((t - 20.4) / 0.55));
  }
  return rIdle(st, t);
}
export function kitchenWorld(t, mode, o = {}) {
  const st = rakaState(t, mode), r = rk(st, RK.cx, TY, RK.k, 'rK'), c = chop(mode === 'hook' ? t : 10);
  let w = kitchenBg() + `<defs><clipPath id="rkc"><rect x="-300" y="0" width="1700" height="${CY}"/></clipPath></defs><g clip-path="url(#rkc)">${r.svg}</g>` + counter() + board() + onion(c.edge) + strips(mode === 'hook' ? t : 10) + knife(c);
  return { w, r, st };
}
// ------------------------------------------------------------------ A. HOOK
export const hookCam = (() => {
  const k = [[0, 650, 1190, Math.log(1.4)], [0.85, 660, 1150, Math.log(1.38)], [1.8, 590, 1040, Math.log(1.2)], [2.7, 600, 1030, Math.log(1.12)], [5.1, 610, 1035, Math.log(1.17)], [5.95, 836, 1226, Math.log(5.2)]];
  const f = pchip(k.map((q) => [q[0], q[1]])), g = pchip(k.map((q) => [q[0], q[2]])), h = pchip(k.map((q) => [q[0], q[3]]));
  return (t) => [f(t), g(t), Math.exp(h(t))];
})();
export function sceneHook(t, out) {
  const { w, r } = kitchenWorld(t, 'hook'); let world = w;
  // partikel dari irisan: spawn tepat sesudah pisau mendarat; rute ke mata
  const P = [[0.30, 0], [0.36, 1], [0.76, 2], [0.82, 3], [1.22, 4], [1.28, 5], [1.68, 6]];
  P.forEach(([t0, sd]) => { const f = flight(t, t0 + 0.03, 1.35, sd); if (f) world += mol(f[0], f[1], 1.05, f[2], f[3]); });
  const eyeHit = t > 1.62 ? clamp((t - 1.62) / 0.4) : 0;
  const [cx, cy, z] = hookCam(t), shake = t < 0.5 ? 0 : 0;
  out.A += camG(world, z, cx, cy, 540, 960);
  out.U += chip(['KOK BAWANG', 'BIKIN NANGIS?'], t, 2.45, 5.3, { size: 76, bg: K.red, fg: '#fff' });
  return { cut: [540 + (836 - cx) * z, 960 + (1226 - cy) * z] };
}
// ------------------------------------------------------------------ B. PERJALANAN PARTIKEL (kamera mengikuti iritan dari talenan ke mata)
export const flightCam = (() => {
  const k = [[11.5, 880, 1215, Math.log(1.7)], [12.2, 760, 1090, Math.log(1.45)], [12.9, 560, 940, Math.log(1.6)], [13.35, 470, 893, Math.log(2.2)]];
  const f = pchip(k.map((q) => [q[0], q[1]])), g = pchip(k.map((q) => [q[0], q[2]])), h = pchip(k.map((q) => [q[0], q[3]]));
  return (t) => [f(t), g(t), Math.exp(h(t))];
})();
export function sceneFlight(t, out) {
  const { w, r } = kitchenWorld(t, 'flight'); let world = w + dashPath(clamp((t - 11.6) / 0.3) * (1 - clamp((t - 13.1) / 0.3)));
  [[11.58, 0], [11.68, 1], [11.78, 2], [11.9, 3], [12.0, 4], [12.12, 5], [12.24, 6]].forEach(([t0, sd]) => { const f = flight(t, t0, 1.25, sd); if (f) world += mol(f[0], f[1], 1.05, f[2], f[3]); });
  const [cx, cy, z] = flightCam(t);
  out.A += camG(world, z, cx, cy, 540, 960);
  const sc = (x, y) => [540 + (x - cx) * z, 960 + (y - cy) * z];
  const a = ka(t, 11.7, 13.3, 0.25), p = sc(PATH[0][0] + 20, PATH[0][1] - 60);
  out.U += chip(['IRITAN MENUJU MATA'], t, 11.85, 13.4, { size: 54 });
  return { eye: sc(PATH[3][0] - 40, PATH[3][1]) };
}

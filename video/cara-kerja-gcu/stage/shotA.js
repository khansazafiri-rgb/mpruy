// ADEGAN A (0 - 11,4 dtk): dunia Raka. Frame pertama = close-up tangan Raka bergerak; lancet menusuk sisi ujung jari (1,06 dtk "ditusuk"), tetes muncul (1,94 "setetes"),
// ujung strip (strip SUDAH terpasang di alat) menyentuh tetes (2,9-3,1 "menyentuh strip"), darah naik ke strip karena kapiler (3,1-4,6), alat menjauh, layar menampilkan angka contoh (5,66 "muncul"),
// kamera mundur ke wajah Raka yang penasaran (6,84 "Kok alat sekecil ini..."), lalu menyelam ke strip (10,1-11,4 "lihat ke dalam stripnya").
// KONTAK jari-tetes-strip dihitung dari geometri yang sama pada tiap bingkai (bukan ditempel): posisi tetes diturunkan dari ujung jari; ujung strip diturunkan dari tetes saat kontak.
import { f1, clamp, lerp, sm, eo, ei, eio, seg, win, rad, rot, MC, pchip, track, step } from './core.js';
import { raka, rakaSvg, lerpState, rIdle, solveArm, handWorld, toWorld, rakaBody } from './raka.js';
import * as A from './art.js';

const EX = (n) => raka(n, 'netral');
const FACE = { tegang: EX('waspada'), perih: EX('perih'), lihat: EX('berpikir'), penasaran: EX('penasaran'), kaget: EX('kaget'), menunjuk: EX('menunjuk'), mengerti: EX('mengerti') };
// keadaan wajah berkunci: [t, nama, durasi transisi]
const FACE_KEYS = [[0, 'tegang', 0.01], [1.06, 'perih', 0.1], [1.78, 'lihat', 0.3], [3.0, 'penasaran', 0.3], [5.62, 'kaget', 0.2], [6.2, 'penasaran', 0.4], [7.6, 'lihat', 0.35], [8.6, 'penasaran', 0.35]];
function faceState(t) {
  let cur = FACE[FACE_KEYS[0][1]], i = 0;
  for (let k = 1; k < FACE_KEYS.length; k++) { const [tk, nm, d] = FACE_KEYS[k]; if (t >= tk) { cur = lerpState(FACE[FACE_KEYS[k - 1][1]], FACE[nm], sm((t - tk) / d)); } else break; }
  return JSON.parse(JSON.stringify(cur));
}

// ---- geometri
const GRIP_SU = 720;          // titik genggam pada meter (su)
const R_FIN = 6.5;            // jari-jari tetes (unit lokal Raka)
export const TH_C = 58;       // sudut meter saat kontak (derajat, searah jarum jam dari tegak)
const HR_REST = [300, 500];   // pusat tangan kanan layar (jari terangkat)
// kunci posisi tangan kanan layar (jari): [t, x, y, fa, finger]
const HR = track([[0, 292, 512, -97, 1], [0.9, 300, 500, -90, 1], [1.05, 300, 500, -90, 1], [1.12, 305, 506, -84, 1], [1.5, 301, 501, -89, 1], [1.9, 300, 500, -90, 1], [4.8, 300, 500, -90, 1], [5.5, 292, 536, -70, 0.55], [6.1, 270, 548, -40, 0.1], [6.9, 292, 520, -100, 0.6], [7.6, 300, 500, -150, 1], [9.4, 298, 506, -150, 1], [10.4, 290, 530, -120, 0.4]]);
export function fingerGeom(t) {
  const [x, y, fa, fg] = HR(t), u = [Math.cos(rad(fa)), Math.sin(rad(fa))], len = 12 + 52 * fg;
  return { H: [x, y], fa, fg, len, u, tip: [x + u[0] * len, y + u[1] * len] };
}
// tetes menempel di sisi KIRI (sisi yang menghadap meter) dekat ujung jari
function dropCenter(t, r = R_FIN) {
  const F = fingerGeom(t), s = F.len - 20, pl = [F.u[1], -F.u[0]];
  return [F.H[0] + F.u[0] * s + pl[0] * (9.5 + 0.38 * r), F.H[1] + F.u[1] * s + pl[1] * (9.5 + 0.38 * r)];
}
// ujung strip saat kontak (dari geometri tetes pada saat t = T_CONTACT; jari diam sejak 1,9 hingga 4,8 sehingga tetap benar)
export const T_CONTACT = 3.0;
const sdir = (th) => [Math.sin(rad(th)), -Math.cos(rad(th))];
function tipContact() { const D = dropCenter(2.5), s = sdir(TH_C); return [D[0] - s[0] * R_FIN * 0.62, D[1] - s[1] * R_FIN * 0.62]; }
// lintasan ujung strip T(t) dan sudut meter theta(t)
const TC = tipContact();
const T_REST = [226, 388];   // posisi ujung strip sebelum didekatkan (meter dipegang tinggi, strip menunjuk ke jari)
const THETA = track([[0, 24], [1.7, 26], [2.0, 30], [2.9, TH_C], [3.0, TH_C], [4.6, TH_C], [5.2, 12], [5.8, 0], [6.5, 0], [7.2, -6], [9.2, -4], [9.9, 0], [11.4, 0]]);
function tipPos(t) {
  const jit = [-3 * Math.sin(t * 3.1), 2.4 * Math.sin(t * 2.3)];
  if (t < 2.0) return [T_REST[0] + jit[0], T_REST[1] + jit[1]];
  if (t < 3.0) { const u = eio((t - 2.0) / 1.0), j0 = [-3 * Math.sin(2.0 * 3.1), 2.4 * Math.sin(2.0 * 2.3)]; return [lerp(T_REST[0] + j0[0], TC[0], u), lerp(T_REST[1] + j0[1], TC[1], u)]; }
  if (t < 4.6) return TC.slice();
  return null;
}
const GRIP = track([[4.6, 0, 0], [5.0, 0, 0]]);   // placeholder
// posisi genggam G(t): sebelum 4,6 dari ujung strip; sesudahnya dari kunci
const G_AFTER = track([[4.6, 0, 0, 0], [5.4, 190, 602, 0], [6.4, 200, 600, 0], [7.4, 196, 590, 0], [9.2, 198, 596, 0], [11.4, 200, 602, 0]]);
export function gripPos(t) {
  const th = THETA(t)[0];
  if (t <= 4.6) { const T = tipPos(t), v = rot([0, -GRIP_SU * A.U], th); return [T[0] - v[0], T[1] - v[1]]; }
  const Gc = (() => { const v = rot([0, -GRIP_SU * A.U], TH_C); return [TC[0] - v[0], TC[1] - v[1]]; })();
  const u = sm((t - 4.6) / 0.8);
  const g = G_AFTER(t);
  return t < 5.4 ? [lerp(Gc[0], g[0], u), lerp(Gc[1], g[1], u)] : [g[0], g[1]];
}
const suToWorld = (G, th, p) => { const v = rot([(p[0]) * A.U, (p[1] - GRIP_SU) * A.U], th); return [G[0] + v[0], G[1] + v[1]]; };

// kilap strip: isi darah (kapiler), reagen berwarna
export const FILL_T = [3.08, 4.5];
export const fillAt = (t) => seg(t, FILL_T[0], FILL_T[1], (x) => 1 - Math.pow(1 - x, 2.0));
const SCREEN_T = 5.64;   // "muncul"

export function stateAt(t, uid = 'rk') {
  const base = faceState(t);
  const gz = step(t, [[0, 0.55], [6.5, 0.0], [7.6, 0.25]], 0.5);
  const gzy = step(t, [[0, 0.8], [6.5, 0.0], [7.6, 0.35]], 0.5);
  base.gazeX = gz; base.gazeY = gzy; base.yaw = step(t, [[0, 0.35], [6.5, 0.0]], 0.6);
  base.lean = 0.5 + 2.2 * win(t, 0.9, 1.9, 0.2) * (t > 1.06 ? 1 : 0);   // sentakan kecil saat ditusuk
  base.bob = (t > 1.06 && t < 1.7 ? -7 * Math.exp(-(t - 1.06) * 7) : 0);
  base.tilt = t > 1.06 && t < 1.9 ? 4 * Math.exp(-(t - 1.06) * 3) : 0;
  const st = rIdle(base, t);
  const F = fingerGeom(t), th = THETA(t)[0], G = gripPos(t);
  st.armR = solveArm(st, 'R', F.H, { finger: F.fg, fa: F.fa, front: 1, len: 142 });
  st.armL = solveArm(st, 'L', G, { finger: 0, front: 1, len: 150 });
  return { st, F, th, G };
}

export function raws(t, uid = 'rk') {
  const { st, F, th, G } = stateAt(t, uid);
  const D = dropCenter(t), contact = t >= T_CONTACT - 0.05 && t <= 4.9;
  // ---- lancet: datang dari kanan, menekan sisi kanan ujung jari, menarik diri
  let lan = '';
  if (t > 0.35 && t < 1.7) {
    const pl = [-F.u[1], F.u[0]], base = [F.tip[0] + (F.H[0] - F.tip[0]) * 0.14, F.tip[1] + (F.H[1] - F.tip[1]) * 0.14];   // titik di sisi kanan dekat ujung
    const sideX = base[0] + 9.5, y = base[1];
    const out = 70, push = t < 0.9 ? 0 : t < 1.06 ? eo((t - 0.9) / 0.16) : t < 1.2 ? 1 - 0.3 * sm((t - 1.06) / 0.14) : 0.7 * (1 - sm((t - 1.2) / 0.45));
    const appear = sm((t - 0.35) / 0.55) * (1 - sm((t - 1.3) / 0.4));
    const x = sideX + lerp(out, 0, Math.max(appear * (t < 1.2 ? 1 : 0) + (t >= 1.2 ? push / 0.7 * 0 : 0), push));
    const xx = t < 0.9 ? sideX + lerp(out, 16, sm((t - 0.35) / 0.55)) : t < 1.2 ? sideX + lerp(16, 0, eo((t - 0.9) / 0.16)) : sideX + lerp(0, out, sm((t - 1.2) / 0.5));
    lan = `<g transform="translate(${f1(xx)} ${f1(y)}) rotate(0) scale(1)">${A.lancetSvg({ needle: t > 1.0 && t < 1.2 ? 1 : 0 })}</g>`;
  }
  // ---- tetes pada jari: tumbuh 1,94 -> 2,5; mengecil saat darah ditarik ke strip (3,1 -> 4,5)
  let drop = '';
  const grow = seg(t, 1.94, 2.5, (x) => 1 - Math.pow(1 - x, 2.2)), shrink = seg(t, FILL_T[0], FILL_T[1] - 0.1, sm);
  const r = R_FIN * grow * (1 - 0.82 * shrink);
  if (r > 0.25 && t < 4.7) drop = A.blobSvg(D[0], D[1], r, { sx: 0.92, sy: 1.0, rot: F.fa + 90 });
  // ---- strip + meter
  const scr = t >= SCREEN_T ? { text: '92', tag: 'GLUKOSA', a: sm((t - SCREEN_T) / 0.25), unit: 'mg/dL' } : { dash: t > 4.7 ? 0.7 + 0.3 * Math.sin(t * 9) : 0.0 };
  const asm = A.assemblySvg({ id: 'wA', meter: { screen: t < 3.2 ? { dash: 0 } : scr }, strip: { cover: 1, fill: fillAt(t), tint: A.ANALYT.glukosa.warna, tintDark: A.ANALYT.glukosa.gelap } });
  const dev = `<g transform="translate(${f1(G[0])} ${f1(G[1])}) rotate(${f1(th)}) scale(${A.U}) translate(0 ${-GRIP_SU})">${asm}</g>`;
  // tangan kiri layar menggenggam (lingkaran tangan + ibu jari) di atas meter
  const hand = `<g transform="translate(${f1(G[0])} ${f1(G[1])}) rotate(${f1(th)})"><circle cx="0" cy="0" r="22" fill="#F7BC8E"/><rect x="-6" y="-34" width="16" height="46" rx="8" fill="#F7BC8E" transform="rotate(-14 0 0)"/></g>`;
  const body = rakaBody(st, uid);
  return { st, F, th, G, D, svg: `<g>${body}${dev}${hand}${drop}${lan}</g>` };
}
export const worldPts = (t) => { const { F, th, G } = stateAt(t); return { G, th, tip: suToWorld(G, th, [0, 0]), su: (p) => suToWorld(G, th, p), D: dropCenter(t), F }; };

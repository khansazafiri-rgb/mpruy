// Peta ruang (satu orientasi di seluruh video): Raka duduk di tepi kursi tinggi, tampak samping tiga perempat, menghadap KANAN layar.
// KAKI YANG TERKENA = kaki dekat-kamera (R di raka.js), SELALU yang sama. Kaki yang menekan = kaki jauh (L), disilangkan di atas paha R; digambar ulang di depan lewat legOverlay().
import { f1, clamp, lerp, sm, eo, K, raka, lerpState, rk } from './common.js';
import { rakaSvg, legShape, PALETTE } from '../../../brand/characters/raka/raka.js';
export const SK = { cx: 470, ty: 420, k: 1.2 };
export const rp = (x, y) => [SK.cx + (x - 200) * SK.k, SK.ty + y * SK.k];
export const rg = (inner) => `<g transform="translate(${f1(SK.cx - 200 * SK.k)} ${f1(SK.ty)}) scale(${SK.k})">${inner}</g>`;
export const FLOOR = 778, SHIN = 98, KNEE_R = [343, 578];
const rad = (d) => d * Math.PI / 180;
/** pasang tungkai bawah satu kaki: lutut (kx, ky), sudut ayun th (derajat; 0 = menggantung, + = maju) */
export function setLeg(st, side, kx, ky, th) {
  const ax = kx + SHIN * Math.sin(rad(th)), ay = ky + SHIN * Math.cos(rad(th)), L = st.legs[side];
  L.sit = 1; L.kneeX = kx; L.kneeY = ky; L.kx = 0; L.dx = ax - (side === 'L' ? 162 : 238); L.lift = 752 - ay; L.foot = -th; return st;
}
const clone = (o) => JSON.parse(JSON.stringify(o));
/** duduk tidak menyilang (L di posisi duduk biasa) */
export const seatedU = (expr = 'netral', o = {}) => { const st = clone(raka(expr, 'duduk', o)); setLeg(st, 'R', 343, 578, 4); setLeg(st, 'L', 271, 590, 0); return st; };
/** duduk menyilang: kaki jauh (L) bertumpu di atas paha R (kaki terkena) */
export const CROSS_L = [322, 604, 40];
export const seatedC = (expr = 'netral', o = {}) => { const st = seatedU(expr, o); setLeg(st, 'L', CROSS_L[0], CROSS_L[1], CROSS_L[2]); return st; };
/** berdiri (kaki lurus, sepatu rata di lantai) */
export const standS = (expr = 'netral', o = {}) => raka(expr, 'berhenti', { yaw: 0.4, ...o });
// ------------------------------------------------------------------ gambar ulang satu kaki di DEPAN (koordinat Raka)
export function legOverlay(side, st, clipFromX = 292) {
  const P = PALETTE, { dots, ankle: [ax, ay], dir, tilt } = legShape(side, st);
  const shoe = `<g transform="translate(${f1(ax)} ${f1(ay)}) scale(${dir} 1) rotate(${f1(tilt)})"><path d="M-30 -10C-30 -26 -14 -28 -2 -26L16 -22C34 -18 44 -8 44 6C44 18 40 26 30 26L-24 26C-34 26 -38 16 -36 4Z" fill="${P.shoes}"/><path d="M-35 16H42C41 22 38 26 30 26H-24C-32 26 -36 22 -35 16Z" fill="${P.patchEdge}"/></g>`;
  return `<g clip-path="url(#ovclip)"><g fill="${P.pants}">${dots.map((d) => `<circle cx="${f1(d[0])}" cy="${f1(d[1])}" r="${f1(d[2])}"/>`).join('')}</g>${shoe}</g><defs><clipPath id="ovclip"><rect x="${clipFromX}" y="592" width="260" height="260"/></clipPath></defs>`;
}
/** titik pada kaki R (tekanan) di koordinat Raka: u sepanjang kurva pinggul -> pergelangan */
export const legPt = (st, u = 0.78) => { const D = legShape('R', st).dots, i = Math.round(clamp(u) * (D.length - 1)); return { x: D[i][0], y: D[i][1], r: D[i][2], D }; };
/** Raka (+ kaki penindih di depan bila crossAmt > 0.02) -> { svg(dunia), pt(titik tekanan, dunia) } */
export function rakaSeat(st, uid = 'rS', cross = 0) {
  const r = rk(st, SK.cx, SK.ty, SK.k, uid);
  let ov = ''; if (cross > 0.02) ov = rg(legOverlay('L', st));
  const p = legPt(st), [px, py] = rp(p.x, p.y);
  return { svg: r.svg + ov, pt: [px, py], r };
}
// ------------------------------------------------------------------ ruang
export function room() {
  const fy = rp(0, FLOOR)[1] - 20;
  let s = `<rect x="-9000" y="-9000" width="18000" height="18000" fill="#F2EFE6"/><rect x="-200" y="${f1(fy)}" width="1500" height="1200" fill="#DDCDB1"/><rect x="-200" y="${f1(fy - 14)}" width="1500" height="16" fill="#C9B796"/>`;
  s += `<circle cx="120" cy="560" r="190" fill="#EADFC4" opacity=".7"/><rect x="790" y="430" width="230" height="300" rx="22" fill="#D5E6EE"/><rect x="806" y="446" width="198" height="268" rx="14" fill="#EAF4F8"/><rect x="897" y="446" width="12" height="268" fill="#D5E6EE"/><rect x="806" y="570" width="198" height="12" fill="#D5E6EE"/>`;
  return s;
}
export function chair() {
  return `<ellipse cx="205" cy="782" rx="170" ry="11" fill="#10212B" opacity=".14"/>`
    + `<rect x="84" y="636" width="16" height="142" rx="5" fill="#8E6A43"/><rect x="306" y="636" width="16" height="142" rx="5" fill="#8E6A43"/><rect x="112" y="640" width="190" height="10" rx="4" fill="#8E6A43" opacity=".7"/>`
    + `<rect x="62" y="402" width="34" height="238" rx="14" fill="#B98A5A"/><rect x="62" y="402" width="12" height="238" rx="6" fill="#CDA070"/>`
    + `<rect x="78" y="612" width="254" height="30" rx="12" fill="#C99A63"/><rect x="78" y="612" width="254" height="10" rx="5" fill="#DDB27C"/>`;
}

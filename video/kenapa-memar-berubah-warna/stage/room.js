// Peta ruang RUANG TAMU (satu orientasi): Raka berjalan ke KANAN, meja di kanan dengan sudut kiri setinggi tulang kering. Area memar = SISI LUAR tungkai bawah kaki dekat-kamera (kaki R di raka.js),
// pada u = 0,72 sepanjang kurva kaki dari pinggul ke pergelangan: SELALU area yang sama di seluruh video. Celana digulung (kulit terbuka) hanya sebagai lapisan di atas kaki Raka kanonik.
import { f1, clamp, lerp, sm, eo, eio, K, mixc, chip, op, camG, pchip, rk, raka, rIdle, lerpState, ka } from './common.js';
import { rakaSvg, legShape, walkCycle } from '../../../brand/characters/raka/raka.js';
import { bruiseAt, bruiseGrad } from './bruise.js';

export const RM = { k: 1.1, floor: 1280 }; RM.ty = RM.floor - 778 * RM.k;
export const T_HIT = 0.55, WALK_RATE = 1.6, U_BRUISE = 0.72, CX_HIT = 410;
export const cxAt = (t) => (t < T_HIT ? 300 + 200 * t : CX_HIT - 7 * sm((t - T_HIT) / 0.25));
export const rpt = (cx, x, y) => [cx + (x - 200) * RM.k, RM.ty + y * RM.k];
const walkS = (t, o = {}) => raka('netral', 'jalan', { ...walkCycle(t * WALK_RATE, { dir: 1 }), yaw: 0.5, gazeX: 0.8, gazeY: 0.2, ...o });
export const standS = (expr, o = {}) => raka(expr, 'jalan', { yaw: 0.5, gazeX: 0.8, gazeY: 0.3, lean: 0, ...o });
export const legPoint = (st, u) => { const D = legShape('R', st).dots, i = Math.round(clamp(u) * (D.length - 1)); return { x: D[i][0], y: D[i][1], r: D[i][2], i, D }; };
// geometri benturan dihitung dari keadaan jalan pada T_HIT
const PH = legPoint(walkS(T_HIT), U_BRUISE), HIT = rpt(cxAt(T_HIT), PH.x, PH.y);
export const TABLE = { x: HIT[0] + PH.r * RM.k * 0.85, y: HIT[1] };       // sisi kiri (sudut) meja tepat di permukaan luar tungkai bawah saat kontak
export function hookState(t) {
  const w = walkS(t), s0 = standS('kaget', { gazeY: 0.6 }), s1 = standS('khawatir', { gazeX: 0.9, gazeY: 1, tilt: 6, lean: 3 }), s2 = standS('berpikir', { gazeX: 0.9, gazeY: 1, tilt: 5, lean: 2 });
  let st;
  if (t < T_HIT) st = lerpState(w, walkS(t, { gazeX: 0.9 }), 0);
  else if (t < 1.0) st = lerpState(lerpState(w, s0, sm((t - T_HIT) / 0.28)), s1, sm((t - 0.8) / 0.2));
  else if (t < 1.6) st = s1;
  else st = lerpState(s1, s2, sm((t - 1.6) / 0.5));
  if (t >= T_HIT) { st = lerpState(walkS(T_HIT + 0.0001), st, sm((t - T_HIT) / 0.3)); }
  return rIdle(st, t);
}
// ------------------------------------------------------------------ gambar
export function roomBg() {
  return `<rect x="-9000" y="-9000" width="18000" height="18000" fill="#F2EFE6"/><rect x="-200" y="${RM.floor - 6}" width="1500" height="1200" fill="#D9C8AC"/><rect x="-200" y="${RM.floor - 20}" width="1500" height="16" fill="#C9B796"/>`
    + `<circle cx="140" cy="560" r="190" fill="#EADFC4" opacity=".7"/><rect x="700" y="470" width="260" height="330" rx="22" fill="#D5E6EE"/><rect x="716" y="486" width="228" height="298" rx="14" fill="#EAF4F8"/><rect x="824" y="486" width="12" height="298" fill="#D5E6EE"/><rect x="716" y="626" width="228" height="12" fill="#D5E6EE"/>`;
}
export function table() {
  const x = TABLE.x, y = TABLE.y, top = y - 34, bot = y + 34;
  return `<ellipse cx="${f1((x + 1040) / 2)}" cy="${RM.floor + 6}" rx="${f1((1040 - x) / 2 + 20)}" ry="10" fill="#10212B" opacity=".13"/>`
    + `<rect x="${f1(x + 22)}" y="${f1(bot - 4)}" width="30" height="${f1(RM.floor - bot + 4)}" fill="${K.woodD}"/><rect x="990" y="${f1(bot - 4)}" width="30" height="${f1(RM.floor - bot + 4)}" fill="${K.woodD}"/>`
    + `<rect x="${f1(x)}" y="${f1(top)}" width="${f1(1040 - x)}" height="68" rx="9" fill="${K.wood}"/><rect x="${f1(x)}" y="${f1(top)}" width="${f1(1040 - x)}" height="16" rx="8" fill="#CDA070"/>`
    + `<rect x="${f1(x + 120)}" y="${f1(top - 56)}" width="46" height="56" rx="8" fill="#E8665F"/><path d="M${f1(x + 143)} ${f1(top - 56)}C${f1(x + 118)} ${f1(top - 110)} ${f1(x + 150)} ${f1(top - 130)} ${f1(x + 143)} ${f1(top - 150)}M${f1(x + 143)} ${f1(top - 56)}C${f1(x + 170)} ${f1(top - 100)} ${f1(x + 168)} ${f1(top - 118)} ${f1(x + 178)} ${f1(top - 132)}" fill="none" stroke="#5FA77F" stroke-width="8" stroke-linecap="round"/>`;
}
/** lapisan di atas kaki dekat (koordinat Raka): celana digulung (kulit terbuka + lipatan) dan bercak memar. rolled 0..1; b = { c1, c2, a } dari bruiseAt */
export function legOverlay(st, rolled, b, id = 'lb') {
  const L = legPoint(st, U_BRUISE), D = L.D, iEnd = Math.round(0.93 * (D.length - 1)), iCuff = Math.round(lerp(iEnd, 0.5 * (D.length - 1), eo(rolled)));
  let s = '';
  if (rolled > 0.01) {
    for (let i = iCuff; i <= iEnd; i++) s += `<circle cx="${f1(D[i][0])}" cy="${f1(D[i][1])}" r="${f1(D[i][2] - 0.5)}" fill="${K.skin}"/>`;
    const dx = D[Math.min(iCuff + 1, D.length - 1)][0] - D[Math.max(iCuff - 1, 0)][0], dy = D[Math.min(iCuff + 1, D.length - 1)][1] - D[Math.max(iCuff - 1, 0)][1], an = Math.atan2(dy, dx) * 180 / Math.PI - 90, rc = D[iCuff][2] + 3;
    s += `<g transform="translate(${f1(D[iCuff][0])} ${f1(D[iCuff][1])}) rotate(${f1(an)})"><rect x="${f1(-rc)}" y="-7" width="${f1(rc * 2)}" height="15" rx="7.5" fill="#2B3350"/><rect x="${f1(-rc + 3)}" y="-7" width="${f1(rc * 2 - 6)}" height="5" rx="2.5" fill="#46517A"/></g>`;
  }
  if (b.a > 0.01 && rolled > 0.6) {
    const dx = D[L.i + 1][0] - D[L.i - 1][0], dy = D[L.i + 1][1] - D[L.i - 1][1], ang = Math.atan2(dy, dx) * 180 / Math.PI - 90, rr = L.r;
    s += `<defs>${bruiseGrad(id, b)}</defs><ellipse cx="${f1(L.x)}" cy="${f1(L.y)}" rx="${f1(rr * 0.78)}" ry="${f1(rr * 1.05)}" transform="rotate(${f1(ang)} ${f1(L.x)} ${f1(L.y)})" fill="url(#${id})"/>`;
  }
  return s;
}
export const bruiseScreen = (cx, st) => { const L = legPoint(st, U_BRUISE); return rpt(cx, L.x, L.y); };
const wrapRaka = (cx, inner) => `<g transform="translate(${f1(cx - 200 * RM.k)} ${f1(RM.ty)}) scale(${RM.k})">${inner}</g>`;
export function stageWorld(t, st, cx, rolled, b) {
  const r = rk(st, cx, RM.ty, RM.k, 'rR');
  return { svg: roomBg() + table() + r.svg + wrapRaka(cx, legOverlay(st, rolled, b)), r };
}
// ------------------------------------------------------------------ A. HOOK
export const PATCH_STAND = (() => { const L = legPoint(standS('berpikir'), U_BRUISE); return rpt(CX_HIT - 7, L.x, L.y); })();
export const hookCam = (() => {
  const k = [[0, 540, 960, 0], [0.55, 520, 1000, 0], [1.0, 470, 1100, Math.log(1.7)], [1.35, 455, 1150, Math.log(2.8)], [2.0, 455, 1150, Math.log(2.8)], [2.5, 520, 985, Math.log(1.0)], [4.9, 520, 985, Math.log(1.02)], [5.9, 0, 0, Math.log(7)]];
  const f = pchip(k.map((q) => [q[0], q[1]])), g = pchip(k.map((q) => [q[0], q[2]])), h = pchip(k.map((q) => [q[0], q[3]]));
  return (t) => { const w = sm((t - 4.95) / 0.95); return [lerp(f(t), PATCH_STAND[0], w), lerp(g(t), PATCH_STAND[1], w), Math.exp(h(t))]; };
})();
export function sceneHook(t, out) {
  const st = hookState(t), cx = cxAt(t), rolled = sm((t - 1.3) / 0.3), b = bruiseAt(t), { svg } = stageWorld(t, st, cx, rolled, b);
  let w = svg;
  const d = t - T_HIT; if (d > 0 && d < 0.3) { const u = d / 0.3; w += `<g opacity="${f1(1 - u)}" stroke="#fff" stroke-width="7" stroke-linecap="round" transform="translate(${f1(TABLE.x)} ${f1(TABLE.y)})"><path d="M${f1(8 + 14 * u)} -34l22 -16M${f1(14 + 16 * u)} 0l30 0M${f1(8 + 14 * u)} 34l22 16"/></g>`; }
  // cincin penanda berdenyut pada bercak yang sama (2,5 - 5,0): memudahkan terbaca pada bidikan lebar
  const rg0 = ka(t, 2.5, 5.0, 0.3); if (rg0 > 0.01) { const [px, py] = PATCH_STAND, pr = 40 + 5 * Math.sin(t * 6); w += `<circle cx="${f1(px)}" cy="${f1(py)}" r="${f1(pr)}" fill="none" stroke="#172B38" stroke-width="9" opacity="${f1(0.28 * rg0)}"/><circle cx="${f1(px)}" cy="${f1(py)}" r="${f1(pr)}" fill="none" stroke="#fff" stroke-width="5" opacity="${f1(0.95 * rg0)}"/>`; }
  const [cx2, cy2, z] = hookCam(t);
  out.A += camG(w, z, cx2, cy2, 540, 960);
  // jeda waktu singkat: kilau cahaya lembut saat memar muncul di area yang sama (1,25 - 1,7)
  const fl = Math.max(0, 1 - Math.abs(t - 1.38) / 0.22); if (fl > 0.01) out.A += `<rect x="0" y="0" width="1080" height="1920" fill="#FFF6DC" opacity="${f1(0.55 * fl)}"/>`;
  out.U += chip(['KOK MEMAR', 'BERUBAH WARNA?'], t, 2.3, 5.0, { size: 74, bg: K.red, fg: '#fff' });
  return { patch: bruiseScreen(cx, st) };
}

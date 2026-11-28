// Adegan luar (peta ruang tetap: Raka duduk menghadap kanan, kaki terkena = kaki dekat-kamera R, ditekan oleh kaki jauh L yang menyilang).
import { f1, clamp, lerp, sm, eo, eio, K, T, tw, op, chip, tag, callout, camG, pchip, rIdle, lerpState, raka, rndf } from './common.js';
import { SK, rp, rg, room, chair, seatedC, seatedU, standS, rakaSeat, legPt, FLOOR } from './seat.js';
import { legShape } from '../../../brand/characters/raka/raka.js';
const FACE = ['happyEyes', 'wide', 'browL', 'browR', 'mouth', 'blink', 'fxBurst', 'sweat', 'gazeX', 'gazeY', 'yaw'];
const faceOf = (st, f) => { const o = JSON.parse(JSON.stringify(st)); for (const k of FACE) o[k] = JSON.parse(JSON.stringify(f[k])); return o; };
const mixFace = (a, b, u) => { const m = lerpState(a, b, u); return m; };
export const proj = (pt, cam) => [540 + cam[2] * (pt[0] - cam[0]), 960 + cam[2] * (pt[1] - cam[1])];
// ------------------------------------------------------------------ marker tekanan (cincin koral pada titik yang sama di kaki R)
export function marker(pt, t, a = 1, k = 1) {
  if (a <= 0.01) return ''; const pul = 0.5 + 0.5 * Math.sin(t * 7);
  return `<g opacity="${f1(a * 100) / 100}"><circle cx="${f1(pt[0])}" cy="${f1(pt[1])}" r="${f1((42 + 6 * pul) * k)}" fill="${K.press}" opacity=".35"/><circle cx="${f1(pt[0])}" cy="${f1(pt[1])}" r="${f1(40 * k)}" fill="none" stroke="#fff" stroke-width="${f1(13 * k)}"/><circle cx="${f1(pt[0])}" cy="${f1(pt[1])}" r="${f1(40 * k)}" fill="none" stroke="${K.press}" stroke-width="${f1(7 * k)}" stroke-dasharray="${f1(16 * k)} ${f1(9 * k)}"/></g>`;
}
function pressArrows(pt, a) {
  if (a <= 0.01) return ''; let s = '';
  for (const dx of [-26, 26]) s += `<path d="M${f1(pt[0] + dx)} ${f1(pt[1] - 100)}L${f1(pt[0] + dx)} ${f1(pt[1] - 52)}" stroke="${K.press}" stroke-width="9" stroke-linecap="round"/><path d="M${f1(pt[0] + dx - 14)} ${f1(pt[1] - 58)}L${f1(pt[0] + dx)} ${f1(pt[1] - 38)}L${f1(pt[0] + dx + 14)} ${f1(pt[1] - 58)}Z" fill="${K.press}" stroke="${K.pressD}" stroke-width="3" stroke-linejoin="round"/>`;
  return `<g opacity="${f1(a * 100) / 100}">${s}</g>`;
}
function sparks(pt, t, a) {
  if (a <= 0.01) return ''; let s = '';
  for (let i = 0; i < 9; i++) {
    const per = 0.32 + rndf(i * 3) * 0.3, u = ((t + rndf(i * 5) * 9) / per) % 1, on = Math.sin(Math.PI * u) ** 2, seed = Math.floor((t + rndf(i * 5) * 9) / per);
    const x = pt[0] + (rndf(i + seed * 3) - 0.5) * 180, y = pt[1] + (rndf(i * 2 + seed * 5) - 0.35) * 170, r = 7 + 8 * rndf(i + seed);
    s += `<path d="M${f1(x)} ${f1(y - r)}L${f1(x + r * 0.3)} ${f1(y - r * 0.3)}L${f1(x + r)} ${f1(y)}L${f1(x + r * 0.3)} ${f1(y + r * 0.3)}L${f1(x)} ${f1(y + r)}L${f1(x - r * 0.3)} ${f1(y + r * 0.3)}L${f1(x - r)} ${f1(y)}L${f1(x - r * 0.3)} ${f1(y - r * 0.3)}Z" fill="${K.spark}" stroke="${K.sparkD}" stroke-width="1.5" opacity="${f1(on * a * 100) / 100}"/>`;
  }
  return s;
}
// ------------------------------------------------------------------ A. HOOK
export const hookCam = (() => {
  const k = [[0, 600, 1110, Math.log(1.35)], [1.3, 580, 1060, Math.log(1.25)], [2.7, 530, 990, Math.log(1.0)], [5.6, 520, 1000, Math.log(1.0)], [6.5, 515, 1200, Math.log(1.6)], [7.0, 515, 1250, Math.log(1.9)]];
  const f = pchip(k.map((q) => [q[0], q[1]])), g = pchip(k.map((q) => [q[0], q[2]])), h = pchip(k.map((q) => [q[0], q[3]]));
  return (t) => [f(t), g(t), Math.exp(h(t))];
})();
export function hookState(t) {
  const c = 0.62 * (1 - sm(t / 1.5)), lean0 = 5 * sm((t - 0.3) / 1.2) * (1 - sm((t - 2.2) / 0.5));
  let body = lerpState(seatedU('netral', { lean: lean0 }), seatedC('netral', { lean: lean0 }), c);
  const s = sm((t - 2.3) / 0.75), ST = standS('netral', { lean: 0 });
  body = lerpState(body, ST, s);
  // wobble kaki R setelah berdiri (tidak jatuh)
  const w = clamp((t - 3.0) / 0.4) * (1 - sm((t - 6.4) / 0.7)), ph = t - 3.0;
  body.legs.R.dx += w * (6 * Math.sin(ph * 10));
  body.legs.R.lift += w * (10 + 14 * Math.max(0, Math.sin(ph * 9)));
  body.lean += w * 3 * Math.sin(ph * 5);
  body.bob += w * 2 * Math.sin(ph * 10);
  const expr = t < 2.3 ? 'khawatir' : t < 4.5 ? 'kaget' : t < 5.6 ? 'khawatir' : 'berpikir';
  const f0 = raka('khawatir', 'duduk', { yaw: 0.4, gazeX: 0.9, gazeY: 0.9 }), f1_ = raka('kaget', 'duduk', { yaw: 0.4, gazeX: 0.9, gazeY: 0.9 }), f2 = raka('khawatir', 'duduk', { yaw: 0.4, gazeX: 0.9, gazeY: 1 }), f3 = raka('berpikir', 'duduk', { yaw: 0.4, gazeX: 0.9, gazeY: 1, tilt: 4 });
  const face = t < 2.0 ? f0 : t < 3.3 ? lerpState(f0, f1_, sm((t - 2.4) / 0.4)) : t < 4.5 ? f1_ : t < 5.5 ? lerpState(f1_, f2, sm((t - 4.5) / 0.4)) : lerpState(f2, f3, sm((t - 5.5) / 0.5));
  return { st: rIdle(faceOf(body, face), t), c };
}
export function sceneHook(t, out) {
  const { st, c } = hookState(t), cam = hookCam(t);
  const R = rakaSeat(st, 'rH', c * 1.6);
  const pt = R.pt;
  let w = room() + rg(chair()) + R.svg;
  w += marker(pt, t, clamp(1 - (t - 6.4) / 0.4), 1) + pressArrows([pt[0] + 6, pt[1] - 8], c > 0.1 ? clamp(c * 2.2) * (1 - sm((t - 1.9) / 0.4)) : 0);
  const ank = rp(...legShape('R', st).ankle); w += sparks([ank[0] + 4, ank[1] - 70], t, sm((t - 4.6) / 0.25) * (1 - sm((t - 6.7) / 0.4)));
  out.A += camG(w, cam[2], cam[0], cam[1], 540, 960);
  out.U += chip(['KOK KAKI JADI', 'KESEMUTAN?'], t, 3.4, 6.2, { size: 64, bg: K.red, fg: '#fff' });
  out.hookPt = proj(pt, cam);
}
// ------------------------------------------------------------------ kebas + tekanan hilang (24,4 - 28,9)
export const kebasCam = [560, 1040, 1.12];
export function kebasState(t) {
  const c = 1 - sm((t - 27.0) / 1.2);
  const a = seatedU('khawatir', { yaw: 0.4, gazeX: 0.9, gazeY: 1, tilt: 3 }), b = seatedC('khawatir', { yaw: 0.4, gazeX: 0.9, gazeY: 1, tilt: 3 });
  let st = lerpState(a, b, c);
  if (t > 27.0) st = lerpState(st, lerpState(st, seatedU('lega', { yaw: 0.4, gazeX: 0.9, gazeY: 0.6 }), 1), sm((t - 27.9) / 0.6) * 0.8);
  return { st: rIdle(st, t), c };
}
/** tinta kebas (abu keunguan) pada tungkai bawah dan sepatu kaki R */
function numbTint(st, a) {
  if (a <= 0.01) return ''; const { dots, ankle: [ax, ay], dir, tilt } = legShape('R', st);
  return `<g opacity="${f1(a * 0.62 * 100) / 100}" transform="translate(${f1(SK.cx - 200 * SK.k)} ${f1(SK.ty)}) scale(${SK.k})"><g fill="${K.violet}">${dots.slice(15).map((d) => `<circle cx="${f1(d[0])}" cy="${f1(d[1])}" r="${f1(d[2] + 1)}"/>`).join('')}</g><g transform="translate(${f1(ax)} ${f1(ay)}) scale(${dir} 1) rotate(${f1(tilt)})"><path d="M-30 -10C-30 -26 -14 -28 -2 -26L16 -22C34 -18 44 -8 44 6C44 18 40 26 30 26L-24 26C-34 26 -38 16 -36 4Z" fill="${K.violet}"/></g></g>`;
}
export function sceneKebas(t, out) {
  const { st, c } = kebasState(t), cam = kebasCam;
  const R0 = rakaSeat(st, 'rK', 0), R1 = rakaSeat(st, 'rK', c * 1.6), pt = R1.pt, na = sm((t - 24.7) / 0.5) * 0.9 + 0.1 * (t > 27 ? 1 : 0);
  // urutan: Raka dasar -> tinta kebas -> kaki penindih di depan
  const base = R0.svg, over = R1.svg.slice(R0.svg.length);
  let w = room() + rg(chair()) + base + numbTint(st, na) + over;
  w += marker(pt, t, clamp(c * 1.3), 1) + pressArrows([pt[0] + 10, pt[1] - 10], clamp(c * 1.4));
  const ank = rp(...legShape('R', st).ankle);
  out.A += camG(w, cam[2], cam[0], cam[1], 540, 960);
  const sp = proj([ank[0] + 20, ank[1] - 30], cam);
  out.U += tag('KEBAS', sp[0] + 150, sp[1] + 10, clamp((t - 25.9) / 0.25) * clamp((28.5 - t) / 0.3) , { size: 44, bg: K.violet, fg: K.navy });
  out.U += chip(['TEKANAN HILANG'], t, 27.0, 28.95, { size: 62 });
  out.hookPt = proj(pt, cam);
}
// ------------------------------------------------------------------ E. kembali ke Raka (40,4 - 49,2)
export function endState(t) {
  const a = standS('lega', { yaw: 0.4, gazeX: 0.9, gazeY: 0.5 }), b = standS('berpikir', { yaw: 0.4, gazeX: 0.9, gazeY: 1, tilt: 4 });
  let st = lerpState(a, b, sm((t - 43.6) / 0.8));
  // menapak nyaman: berat badan berpindah, kaki R menapak mantap (tanpa goyang)
  const ph = (t - 41.0) * 2.2, w = clamp((t - 41.0) / 0.6) * (1 - 0.55 * sm((t - 44.2) / 0.8));
  st.legs.R.dx += w * 5 * Math.sin(ph); st.legs.L.dx -= w * 4 * Math.sin(ph); st.legs.R.lift += w * 6 * Math.max(0, Math.sin(ph - 0.5)); st.bob += w * 1.5 * Math.sin(ph * 2);
  return rIdle(st, t);
}
export function sceneEnd(t, out) {
  const st = endState(t), R = rakaSeat(st, 'rE', 0), cam = [520, 960, 1.0];
  let w = room() + rg(chair()) + R.svg;
  out.A += camG(w, cam[2], cam[0], cam[1], 540, 960);
  out.U += chip(['MENETAP ATAU BERULANG?', 'PERLU DINILAI'], t, 42.1, 49.3, { size: 54, bg: '#fff', fg: K.forest, f: 0.4 });
}

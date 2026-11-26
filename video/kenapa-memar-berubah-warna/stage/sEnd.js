// C. VARIASI ANTARORANG + PENUTUP (23,9 - 30,0): kamera keluar dari memar ke Raka (tungkai bawah yang sama, memar memudar); dua tampilan kulit dengan warna dasar berbeda
// memperlihatkan bahwa warna yang terlihat dan lama pemulihan dapat berbeda, tanpa jadwal pasti, tanpa angka hari.
import { f1, clamp, lerp, sm, eo, eio, K, mixc, chip, tag, op, camG, pchip, rIdle, lerpState } from './common.js';
import { standS, stageWorld, RM, CX_HIT, PATCH_STAND, TABLE } from './room.js';
import { bruiseAt, bruiseGrad } from './bruise.js';

export const endCam = (() => {
  const k = [[23.9, 0, 0, Math.log(6.5)], [24.9, 520, 985, Math.log(1.02)], [30, 520, 985, Math.log(1.02)]];
  const f = pchip(k.map((q) => [q[0], q[1]])), g = pchip(k.map((q) => [q[0], q[2]])), h = pchip(k.map((q) => [q[0], q[3]]));
  return (t) => { const w = 1 - sm((t - 23.9) / 1.0); return [lerp(f(t), PATCH_STAND[0], w), lerp(g(t), PATCH_STAND[1], w), Math.exp(h(t))]; };
})();
export function endState(t) {
  const a = standS('berpikir', { gazeX: 0.9, gazeY: 1, tilt: 4, lean: 2 }), b = standS('lega', { gazeX: 0.9, gazeY: 0.5 }), c = standS('lega', { gazeX: 0.7, gazeY: 0.1 });
  let st = lerpState(a, b, sm((t - 25.0) / 0.6));
  st = lerpState(st, c, sm((t - 28.4) / 0.6));
  return rIdle(st, t);
}
const dark = (b) => ({ c1: mixc(b.c1, '#2E1B2E', 0.38), c2: mixc(b.c2, '#4F3434', 0.38), a: b.a * 0.85 });
const lightSkin = K.skin, deepSkin = K.skinDk;
function skinCard(x, y, w, h, skin, tau, prog, deep, id, a) {
  if (a <= 0.01) return ''; const b0 = bruiseAt(tau), b = deep ? dark(b0) : b0, sw = 170;
  const bx = x + 22, by = y + 45;
  return `<g opacity="${f1(a)}"><defs>${bruiseGrad(id, b, 0.5)}<clipPath id="${id}c"><rect x="${bx}" y="${by}" width="${sw}" height="${sw}" rx="28"/></clipPath></defs><rect x="${x + 4}" y="${y + 12}" width="${w}" height="${h}" rx="40" fill="rgba(0,0,0,.22)"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="40" fill="#fff"/>`
    + `<rect x="${bx}" y="${by}" width="${sw}" height="${sw}" rx="28" fill="${skin}"/><g clip-path="url(#${id}c)"><ellipse cx="${bx + sw / 2}" cy="${by + sw / 2}" rx="${sw * 0.36}" ry="${sw * 0.28}" fill="url(#${id})"/></g>`
    + `<rect x="${bx}" y="${by}" width="${sw}" height="${sw}" rx="28" fill="none" stroke="${deep ? K.skinDkD : K.skinD}" stroke-width="5"/>`
    + (() => { const x0 = x + 226, x1 = x + w - 30, yy = y + h / 2; let s = `<rect x="${x0}" y="${yy - 7}" width="${x1 - x0}" height="14" rx="7" fill="#E4DECB"/><rect x="${x0}" y="${yy - 7}" width="${f1((x1 - x0) * prog)}" height="14" rx="7" fill="${K.forest}" opacity=".4"/>`; for (const [u, c] of [[0.14, '#B4547A'], [0.46, K.green], [0.68, K.yellow], [0.9, '#EFD79A']]) s += `<circle cx="${f1(lerp(x0, x1, u))}" cy="${yy}" r="10" fill="${c}" stroke="#fff" stroke-width="3"/>`; return s + `<circle cx="${f1(lerp(x0, x1, prog))}" cy="${yy}" r="11" fill="#fff" stroke="${K.forest}" stroke-width="5"/>`; })()
    + `</g>`;
}
export function sceneEnd(t, out) {
  const st = endState(t), cx = CX_HIT - 7, rolled = 1, b = bruiseAt(t), { svg } = stageWorld(t, st, cx, rolled, b);
  const [cx2, cy2, z] = endCam(t);
  out.A += camG(svg, z, cx2, cy2, 540, 960);
  // dua tampilan kulit (warna dasar berbeda): fase sama, tetapi tampilan dan kecepatan berbeda
  const a = sm((t - 24.95) / 0.4) * (1 - sm((t - 28.5) / 0.6)), pA = clamp((t - 25.1) / 2.7), pB = clamp((t - 25.1) / 4.4);
  const tauA = lerp(12.3, 28.5, pA), tauB = lerp(12.3, 24.0, pB);
  let cards = '';
  for (const [y, skin, tau, prog, deep, id, d0] of [[420, lightSkin, tauA, pA, false, 'ca', 0], [710, deepSkin, tauB, pB, true, 'cb', 0.25]]) {
    const k = 0.9 + 0.1 * eo(clamp((t - 24.95 - d0) / 0.35)); cards += `<g transform="translate(${1034 - 204} ${y + 130}) scale(${f1(k * 1000) / 1000}) translate(${-(1034 - 204)} ${-(y + 130)})">${skinCard(626, y, 408, 260, skin, tau, prog, deep, id, a)}</g>`;
  }
  out.U += cards;
  out.U += chip(['TIDAK SELALU SAMA'], t, 24.9, 28.6, { size: 62 });
}

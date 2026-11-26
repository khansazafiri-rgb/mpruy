// C. WAJAH RAKA + RINGKASAN (19,6 - 25,4): kembali ke dapur (Raka kiri, bawang kanan); Raka paham (lega, bukan sedih), air mata masih mengalir;
// empat tahap bergerak berurutan: bawang dipotong -> iritan terbentuk -> mata terkena -> air mata keluar.
import { f1, clamp, lerp, sm, eo, eio, eob, track, pchip, R, C, T, K, chip, tag, op, camG, ka, tw, pop } from './common.js';
import { kitchenWorld, mol, RK, TY } from './sKitchen.js';

export const faceCam = (() => {
  const k = [[19.6, 412, 888, Math.log(3.6)], [21.0, 540, 960, 0]];
  const f = pchip(k.map((q) => [q[0], q[1]])), g = pchip(k.map((q) => [q[0], q[2]])), h = pchip(k.map((q) => [q[0], q[3]]));
  return (t) => [f(t), g(t), Math.exp(h(t))];
})();
const almond = (cx, cy, w, h) => `M${cx - w} ${cy}C${cx - w * 0.6} ${cy - h * 1.3} ${cx + w * 0.4} ${cy - h * 1.3} ${cx + w} ${cy}C${cx + w * 0.4} ${cy + h * 1.3} ${cx - w * 0.6} ${cy + h * 1.3} ${cx - w} ${cy}Z`;
const eyeIcon = (cx, cy, kind, t) => `<path d="${almond(cx, cy, 44, 24)}" fill="#fff" stroke="#C98A6A" stroke-width="5"/><circle cx="${cx + 6}" cy="${cy}" r="17" fill="${K.iris}"/><circle cx="${cx + 6}" cy="${cy}" r="8" fill="#1B1B2A"/>`
  + (kind === 'hit' ? mol(cx + 24, cy - 2, 0.8, t * 60, 1) : `<path d="M${cx - 6} ${cy + 36}C${cx - 2} ${cy + 46} ${cx + 8} ${cy + 46} ${cx + 12} ${cy + 36}C${cx + 10} ${cy + 30} ${cx + 4} ${cy + 24} ${cx + 3} ${cy + 22}C${cx + 2} ${cy + 24} ${cx - 4} ${cy + 30} ${cx - 6} ${cy + 36}Z" fill="${K.tear}" stroke="${K.tearD}" stroke-width="3" transform="translate(0 ${f1(Math.sin(t * 6) * 3)})"/>`);
const icons = [
  (t) => `<path d="M26 92C22 52 40 30 60 30C80 30 98 52 94 92Z" fill="#E3A840" stroke="#B87822" stroke-width="4"/><path d="M32 88C30 58 44 40 60 40C76 40 90 58 88 88Z" fill="#FFF6E0"/><path d="M44 82C44 62 52 52 60 52C68 52 76 62 76 82" fill="none" stroke="#E6D3A4" stroke-width="3"/><g transform="translate(70 ${f1(30 + Math.sin(t * 8) * 4)}) rotate(-35)"><path d="M0 0L-4 -40L8 -40L8 0Z" fill="${K.steel}" stroke="${K.steelD}" stroke-width="3"/></g>`,
  (t) => `${mol(60, 62, 2.6, t * 40, 1)}`,
  (t) => eyeIcon(58, 60, 'hit', t),
  (t) => eyeIcon(58, 52, 'tear', t),
];
const labs = [['BAWANG', 'DIPOTONG'], ['IRITAN', 'TERBENTUK'], ['MATA', 'TERKENA'], ['AIR MATA', 'KELUAR']];
export function sceneFace(t, out) {
  const { w } = kitchenWorld(t, 'face'), [cx, cy, z] = faceCam(t);
  let world = w;
  // kartu ringkasan (koordinat dunia = layar saat z = 1)
  const t0 = [20.55, 21.2, 21.85, 22.5], X = 680, Y0 = 470, CH = 140, GAP = 26, W = 370;
  let cards = '';
  for (let i = 0; i < 4; i++) {
    const a = clamp((t - t0[i]) / 0.15), k = pop(t, t0[i], 0.4); if (a <= 0) continue;
    const y = Y0 + i * (CH + GAP), hl = t >= 23.5 ? clamp(1 - Math.abs((t - (23.5 + 0.33 * i + 0.17)) / 0.2)) : 0, lit = t >= 23.5 + 0.33 * i ? 1 : 0;
    cards += `<g opacity="${f1(a)}" transform="translate(${X + W / 2} ${y + CH / 2}) scale(${f1((k + 0.06 * hl) * 1000) / 1000}) translate(${-(X + W / 2)} ${-(y + CH / 2)})"><rect x="${X + 4}" y="${y + 10}" width="${W}" height="${CH}" rx="34" fill="rgba(10,56,48,.22)"/><rect x="${X}" y="${y}" width="${W}" height="${CH}" rx="34" fill="#fff" stroke="${lit ? K.gold : '#fff'}" stroke-width="${lit ? 8 : 0}"/><g transform="translate(${X + 14} ${y + 10}) scale(1)">${icons[i](t)}</g><circle cx="${X + 28}" cy="${y + 26}" r="22" fill="${K.gold}" stroke="#fff" stroke-width="4"/>${T(String(i + 1), X + 28, y + 36, { size: 28, fill: '#172B38' })}${T(labs[i][0], X + 146, y + 62, { size: 33, fill: K.forest, anchor: 'start' })}${T(labs[i][1], X + 146, y + 102, { size: 33, fill: K.forest, anchor: 'start' })}</g>`;
    if (i < 3 && t >= t0[i] + 0.45) { const aa = clamp((t - t0[i] - 0.45) / 0.2); cards += `<path d="M${X + W / 2 - 22} ${y + CH + 4}L${X + W / 2 + 22} ${y + CH + 4}L${X + W / 2} ${y + CH + 24}Z" fill="${K.forest}" opacity="${f1(aa)}"/>`; }
  }
  out.A += camG(world, z, cx, cy, 540, 960) + `<g opacity="${f1(sm((t - 20.4) / 0.2))}">${cards}</g>`;
  out.U += chip('MATA BERAIR', t, 20.4, 21.7, { size: 60 }) + chip('RESPONS PERLINDUNGAN TUBUH', t, 21.72, 25.4, { size: 50, bg: K.tear, fg: '#0A3830' });
}

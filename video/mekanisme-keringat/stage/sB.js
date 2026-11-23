// B. peta tubuh (4,7 - 14,0): suhu naik -> hipotalamus (lensa otak) -> saraf simpatis -> kelenjar ekrin di kulit (lensa kulit). Ilustrasi, tidak sesuai skala.
import { f1, clamp, lerp, sm, eo, eio, seg, pop, pathPt, R, C, P, T, GOLD, FOREST, INK, rndf, K, W, bgCream, chip, tag, callout, op, armTo, rk, raka, rIdle, sdrop, thermo, mixc, heatArrow, ach, ka, dashed } from './common.js';

const BR = { x: 800, y: 580, r: 215 }, SK = { x: 790, y: 1050, r: 195 };
// jalur saraf simpatis (dari batang otak keluar lensa, turun di sisi kanan, masuk lensa kulit dari kanan menuju kelenjar)
export const NERVE_B = `M770 625C795 700 826 745 830 790C836 850 960 830 985 940S1020 1050 930 1080S840 1120 800 1135`;
function brain(cx, cy, s, t, glow) {
  // otak tampak samping, menghadap kiri; hipotalamus emas di dasar bagian depan; batang otak ke bawah
  return `<g transform="translate(${cx} ${cy}) scale(${s})">`
    + `<path d="M-150 20C-170 -90 -80 -170 30 -165C140 -160 190 -80 170 10C150 80 80 110 20 100L-20 100C-100 100 -140 80 -150 20Z" fill="#F4B8C1" stroke="#D98B99" stroke-width="6" stroke-linejoin="round"/>`
    + `<path d="M-90 -90C-40 -130 40 -140 100 -100M-120 -20C-60 -60 20 -70 80 -30M-30 10C20 -20 80 -10 120 30" fill="none" stroke="#E69AA7" stroke-width="7" stroke-linecap="round"/>`
    + `<path d="M70 96C100 70 170 80 175 118C178 150 110 160 70 130Z" fill="#E9A5B0" stroke="#D98B99" stroke-width="6"/><path d="M95 108H150M92 124H155" stroke="#D98B99" stroke-width="4"/>`
    + `<path d="M10 96L40 96L50 230L22 230Z" fill="#EDA8B3" stroke="#D98B99" stroke-width="6" stroke-linejoin="round"/>`
    + `<circle cx="-18" cy="68" r="${f1(30 + glow * 16)}" fill="${K.gold}" opacity="${f1(glow * 0.35)}"/><ellipse cx="-18" cy="68" rx="26" ry="19" fill="${K.gold}" stroke="${K.goldD}" stroke-width="6"/></g>`;
}
// kulit mini dalam lensa: permukaan di ATAS, kelenjar gulung di bawah, saluran ke pori, saraf dari kanan
function miniSkin(cx, cy, t, act, fillU) {
  const sy = cy - 120;
  let s = `<rect x="${cx - 220}" y="${cy - 220}" width="440" height="${sy - cy + 220}" fill="${K.air}"/><rect x="${cx - 220}" y="${sy}" width="440" height="340" fill="${K.derm}"/><rect x="${cx - 220}" y="${sy}" width="440" height="26" fill="${K.epi}"/>`;
  const gx = cx + 10, gy = cy + 90;
  s += `<path d="M${gx} ${gy - 30}C${gx - 14} ${gy - 80} ${gx + 14} ${gy - 140} ${gx} ${sy + 20}" fill="none" stroke="${K.glandD}" stroke-width="22" stroke-linecap="round"/><path d="M${gx} ${gy - 30}C${gx - 14} ${gy - 80} ${gx + 14} ${gy - 140} ${gx} ${sy + 20}" fill="none" stroke="${act > 0.5 ? K.sweat : K.lumen}" stroke-width="10" stroke-linecap="round"/>`;
  let coil = ''; for (let i = 0; i < 4; i++) { const a = i * 1.9; coil += `<ellipse cx="${f1(gx + 6 * Math.sin(a))}" cy="${f1(gy + 4 * Math.cos(a))}" rx="${f1(54 - i * 6)}" ry="${f1(34 - i * 3)}" transform="rotate(${f1(i * 38)} ${gx} ${gy})" fill="none" stroke="${K.gland}" stroke-width="22"/>`; }
  s += (act > 0.1 ? `<circle cx="${gx}" cy="${gy}" r="${f1(70 + 10 * Math.sin(t * 8))}" fill="${K.gold}" opacity="${f1(0.25 * act)}"/>` : '') + coil;
  return s;
}
export function sceneB(t, out) {
  const rA = 0; const hot = lerpHot(t);
  const st = rIdle(raka(t < 9.6 ? 'sedih' : 'netral', 'netral', { armR: armTo('R', 308, 560), armL: armTo('L', 92, 560), browL: { y: 3, rot: 12 }, browR: { y: 3, rot: -12 } }), t);
  const r = rk(st, 300, 400, 1.15, 'rB');
  let w = bgCream + r.svg;
  // sinyal dari tubuh ke otak: suhu naik
  const on = seg(t, 4.9, 5.7), head = r.at(268, 190);
  w += dashed(head[0] + 10, head[1] - 10, BR.x - BR.r + 10, BR.y, K.heat, on, 7);
  // titik sinyal koral dari tubuh ke otak + panah panas yang naik dari tubuh (4,9 - 9,6)
  const sg = clamp((t - 4.9) / 0.3) * (1 - clamp((t - 9.4) / 0.4));
  if (sg > 0.01) {
    const x1 = head[0] + 10, y1 = head[1] - 10, x2 = BR.x - BR.r + 10, y2 = BR.y;
    for (let i = 0; i < 5; i++) { const ph = ((t * 0.9 + i / 5) % 1); w += `<circle cx="${f1(lerp(x1, x2, ph))}" cy="${f1(lerp(y1, y2, ph))}" r="${f1(9 + 4 * Math.sin(ph * Math.PI))}" fill="${K.heat}" opacity="${f1(sg * Math.sin(ph * Math.PI))}"/>`; }
    for (let i = 0; i < 4; i++) { const ph = ((t * 0.6 + i / 4) % 1), x = 150 + i * 105; w += `<g opacity="${f1(sg * 0.8 * Math.sin(ph * Math.PI))}">${heatArrow(x, lerp(1020, 760, ph), -90, 54, 1, 11)}</g>`; }
  }
  // lensa otak
  const glow = seg(t, 6.1, 6.6) * (0.65 + 0.35 * Math.sin(t * 5)) * (t < 13.8 ? 1 : 0);
  w += `<defs><clipPath id="clB"><circle cx="${BR.x}" cy="${BR.y}" r="${BR.r}"/></clipPath><clipPath id="clS"><circle cx="${SK.x}" cy="${SK.y}" r="${SK.r}"/></clipPath></defs>`;
  const popB = pop(t, 4.8, 0.45);
  w += `<g transform="translate(${BR.x} ${BR.y}) scale(${f1(popB)}) translate(${-BR.x} ${-BR.y})" opacity="${clamp(popB)}"><circle cx="${BR.x}" cy="${BR.y}" r="${BR.r + 10}" fill="rgba(0,0,0,.18)" transform="translate(0 8)"/><circle cx="${BR.x}" cy="${BR.y}" r="${BR.r}" fill="#12485A" stroke="#fff" stroke-width="10"/><g clip-path="url(#clB)">${brain(BR.x - 10, BR.y - 30, 1.1, t, glow)}</g></g>`;
  // ring pulsa di hipotalamus saat mengatur respons
  const hy = [BR.x - 10 - 18 * 1.1, BR.y - 30 + 68 * 1.1];
  if (t > 6.2 && t < 13.8) { const ph = ((t - 6.2) % 1.0); w += `<circle cx="${f1(hy[0])}" cy="${f1(hy[1])}" r="${f1(34 + ph * 70)}" fill="none" stroke="${K.gold}" stroke-width="${f1(8 * (1 - ph))}" opacity="${f1((1 - ph) * 0.9)}"/>`; }
  if (t > 6.9 && t < 9.7) for (let j = 1; j < 3; j++) { const ph = (((t - 6.9) * 0.7 + j / 3) % 1); w += `<circle cx="${f1(hy[0])}" cy="${f1(hy[1])}" r="${f1(40 + ph * 150)}" fill="none" stroke="${K.gold}" stroke-width="${f1(7 * (1 - ph))}" opacity="${f1((1 - ph) * 0.7)}" clip-path="url(#clB)"/>`; }
  // lensa kulit
  const popS = pop(t, 11.9, 0.45);
  w += dashed(r.at(310, 560)[0] + 20, r.at(310, 560)[1], SK.x - SK.r + 6, SK.y - 20, K.goldD, popS, 7);
  const act = seg(t, 13.2, 13.9);
  w += `<g transform="translate(${SK.x} ${SK.y}) scale(${f1(popS)}) translate(${-SK.x} ${-SK.y})" opacity="${clamp(popS)}"><circle cx="${SK.x}" cy="${SK.y}" r="${SK.r + 10}" fill="rgba(0,0,0,.18)" transform="translate(0 8)"/><circle cx="${SK.x}" cy="${SK.y}" r="${SK.r}" fill="#fff" stroke="#fff" stroke-width="10"/><g clip-path="url(#clS)">${miniSkin(SK.x, SK.y, t, act)}</g><circle cx="${SK.x}" cy="${SK.y}" r="${SK.r}" fill="none" stroke="#fff" stroke-width="10"/></g>`;
  // saraf simpatis: garis + denyut emas yang bergerak
  const nOn = seg(t, 9.7, 10.4); if (nOn > 0) {
    w += `<path d="${NERVE_B}" fill="none" stroke="rgba(0,0,0,.2)" stroke-width="20" stroke-linecap="round" transform="translate(0 5)" opacity="${nOn}"/><path d="${NERVE_B}" fill="none" stroke="${K.goldD}" stroke-width="16" stroke-linecap="round" opacity="${nOn}"/><path d="${NERVE_B}" fill="none" stroke="${K.nerve}" stroke-width="8" stroke-linecap="round" opacity="${nOn}"/>`;
    for (let i = 0; i < 4; i++) { const u = (t - 10.1 - i * 0.55) / 2.4; if (u > 0 && u < 1) { const p = pathPt(NERVE_B, u); w += `<circle cx="${f1(p.x)}" cy="${f1(p.y)}" r="26" fill="#fff" opacity=".9"/><circle cx="${f1(p.x)}" cy="${f1(p.y)}" r="15" fill="${K.gold}" stroke="${K.goldD}" stroke-width="4"/>`; } }
  }
  out.A += w;
  const thv = lerpHot(t);
  let u = thermo(60, 520, 380, thv, { w: 36 }) + tag('SUHU', 60, 470, 1, { size: 26 });
  u += chip(['SUHU TUBUH NAIK'], t, 4.75, 6.05, { size: 58, bg: '#fff' }) + chip(['HIPOTALAMUS →', 'SARAF SIMPATIS'], t, 6.15, 13.9, { size: 54, bg: '#fff' });
  u += callout('hipotalamus', 600, 735, hy[0] - 10, hy[1] + 6, ka(t, W.hipotalamus - 0.1, 9.6, 0.25) * 0 + ka(t, W.hipotalamus - 0.1, 9.4, 0.25), { size: 38, col: K.gold, k: eo(clamp((t - W.hipotalamus + 0.1) / 0.4)) });
  u += tag('pengatur respons pendinginan', 640, 805, ka(t, 7.9, 9.5, 0.3), { size: 32, bg: K.gold, fg: INK });
  u += tag('saraf simpatis', 930, 845, ka(t, W.saraf - 0.2, 13.5, 0.25) * 0 + ka(t, W.saraf - 0.2, 12.2, 0.25), { size: 34, bg: '#fff' });
  u += callout('kelenjar ekrin', 520, 1000, SK.x - 20, SK.y + 80, ka(t, W.ekrin - 0.9, 13.9, 0.25), { size: 38, col: K.gland, k: eo(clamp((t - W.ekrin + 0.9) / 0.4)) });
  out.U += u;
}
function lerpHot(t) { return t < 4.9 ? lerp(0.3, 0.86, clamp(t / 4.6)) : lerp(0.86, 0.9, clamp((t - 4.9) / 8)); }

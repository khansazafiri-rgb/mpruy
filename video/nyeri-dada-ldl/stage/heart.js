// Jantung: memakai ASET JANTUNG MEDCOEL (brand/anatomy-style, jantung v7) tanpa menggambar ulang bentuknya. Di sini hanya dipasang di panggung video
// (kamera + denyut + penanda penyumbatan di arteri koroner LAD + area otot hilir). Koordinat dunia = koordinat gambar aset (px acuan).
import { buildSvg } from '../../../brand/anatomy-style/jantung7-aset.mjs';
import { PARAM, amplop } from '../../../brand/anatomy-style/jantung.js';
import { f1, clamp, lerp, seg, eo, MC } from './core.js';
export const LAD_PT = [389, 830];       // titik penyumbatan pada arteri LAD (koordinat gambar)
const ISK = [[396, 830], [440, 812], [494, 828], [526, 872], [532, 932], [506, 996], [456, 1046], [396, 1062], [353, 1034], [368, 934], [383, 862]];
export function heartDefs() {
  return `<filter id="hKontur" x="-3%" y="-3%" width="106%" height="106%"><feMorphology in="SourceAlpha" operator="dilate" radius="1.2" result="d"/><feComposite in="d" in2="SourceAlpha" operator="out" result="tepi"/><feFlood flood-color="${MC.ink}" flood-opacity=".55"/><feComposite in2="tepi" operator="in" result="tinta"/><feMerge><feMergeNode in="tinta"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
}
/** t = detik video; cam = { cx, cy, S } dalam koordinat gambar; o: { blocked 0..1 (penanda), isk 0..1 (area otot kekurangan darah), t0 (awal denyut) } */
export function heart(t, cam, o = {}) {
  const t0 = o.t0 ?? 7.9, tt = Math.max(0, t - t0), e = amplop(t), tw = PARAM.tambat;
  const flow = clamp(((tt - 0.3) % 2.5) / (2.5 * 0.62)), flowO = Math.min(1, flow * 6, (1 - flow) * 5 + 0.3);
  const h = buildSvg({ layers: true, bg: false, anim: { flow, flowO }, id: 'jt' });
  const sy = 1 - PARAM.amplitudo.sy * e.s + 0.01 * e.a, sx = 1 - PARAM.amplitudo.sx * e.s + 0.012 * e.a;
  const tfBody = `translate(${tw[0]} ${tw[1]}) rotate(${(PARAM.amplitudo.putar * e.s).toFixed(3)}) scale(${sx.toFixed(4)} ${sy.toFixed(4)}) translate(${-tw[0]} ${-tw[1]})`;
  const tf = `translate(${f1(540 - cam.cx * cam.S)} ${f1(960 - cam.cy * cam.S)}) scale(${f1(cam.S * 1000) / 1000})`;
  const isi = `<g id="h-pembuluh-belakang">${h.back}</g><g id="h-massa" transform="${tfBody}">${h.body}</g><g id="h-batang-pulmonal">${h.trunk}</g><g id="h-sorotan" transform="${tfBody}">${h.hi}</g>`;
  let s = `<defs>${h.defs}${heartDefs()}</defs><g transform="${tf}"><g filter="url(#fSh)"><g filter="url(#hKontur)">${isi}</g></g>`;
  // area otot di hilir penyumbatan (kekurangan darah): hanya bagian ini, bukan seluruh jantung
  const isk = o.isk ?? 0;
  if (isk > 0.01) { const pulse = 0.8 + 0.2 * Math.sin(t * 5); s += `<g transform="${tfBody}"><g clip-path="url(#jt-lv)"><path d="${ISK.map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1]}`).join('')}Z" fill="#150826" opacity="${f1(0.45 * isk)}"/><path d="${ISK.map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1]}`).join('')}Z" fill="none" stroke="${MC.gold}" stroke-width="${f1(5 / Math.max(1, cam.S * 0.6))}" stroke-dasharray="10 8" opacity="${f1(0.95 * isk * pulse)}" stroke-linejoin="round"/></g></g>`; }
  const bl = o.blocked ?? 0;
  if (bl > 0.01) { const pulse = 0.5 + 0.5 * Math.sin(t * 6); s += `<g transform="${tfBody}" opacity="${f1(bl)}"><circle cx="${LAD_PT[0]}" cy="${LAD_PT[1]}" r="${f1(16 + 8 * pulse)}" fill="none" stroke="#FF5A4A" stroke-width="${f1(5 / Math.max(1, cam.S * 0.5))}"/><circle cx="${LAD_PT[0]}" cy="${LAD_PT[1]}" r="9" fill="#FF5A4A" opacity=".85"/></g>`; }
  return s + '</g>';
}
// posisi layar dari koordinat gambar
export const heartToScreen = (cam, x, y) => [540 + (x - cam.cx) * cam.S, 960 + (y - cam.cy) * cam.S];

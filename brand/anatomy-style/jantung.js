// Jantung (tampak depan) dengan ASET JANTUNG v7 dari cabang claude/anatomi-visual-kalibrasi (commit 9c7ff84: brand/anatomi-visual/v6/heart7.mjs + gerak lokal di sistem/scenes/jantung.mjs),
// diadaptasi ke sistem visual MEDCOEL milik cabang ini (latar, kontur tinta, bayangan, label, kamera, easing, tempo). Siluet/pembuluh/volume jantung v7 TIDAK digambar ulang
// (lihat jantung7-aset.mjs dan jantung7-geom.mjs: salinan dengan catatan perubahan). Jantung v4 lama tetap ada hanya sebagai pembanding: jantung-v4.js dan jantung-v4m.js.
// Gerak lokal (dari scenes/jantung.mjs): massa jantung (badan, aurikula kiri, alur, lemak, koroner, sorotan) berkontraksi terhadap titik tambat di dasar jantung; pembuluh besar tidak bergerak,
// jadi sambungan pembuluh-badan tetap utuh. Penanda aliran cahaya koroner = infografis, bukan rekaman aliran darah.
// Layer (id grup): #h-pembuluh-belakang (RPA, IVC, SVC, aorta+arkus+cabang), #h-massa (badan, aurikula, alur, lemak, arteri koroner, vena jantung), #h-batang-pulmonal, #h-sorotan, #h-kontur.
import { buildSvg } from './jantung7-aset.mjs';
import { vignette, fx, f1, TEMA_MEDCOEL } from './anatomi.js';
import { MC, latar, merek, labelsT, peralihan, KONTUR, E, seg, KLIP, kam, clamp01 } from './medcoel.js';
export const P = 'h';
export const TEMA = TEMA_MEDCOEL;
export const FLAT = {};
export const LAYERS = [['h-pembuluh-belakang', 'V. kava (superior, inferior), a. pulmonalis kanan, aorta + arkus + 3 cabang'], ['h-massa', 'Badan jantung, aurikula, lemak epikardium, arteri koroner, vena jantung (berkontraksi)'], ['h-batang-pulmonal', 'Batang pulmonalis (di depan aorta, tidak ikut berkontraksi)'], ['h-sorotan', 'Kilau permukaan (ikut berkontraksi)'], ['h-kontur', 'Kontur tinta']];
// parameter gerak (dari scenes/jantung.mjs, 9c7ff84)
export const PARAM = { periode: 1.25, tambat: [350, 600], amplitudo: { sy: 0.045, sx: 0.02, putar: 0.8 }, aliran: { periode: 2.5, awal: 0.3 }, skala: 1.42, tempat: [128, 300] };
const clamp = clamp01;
export function amplop(t) { const u = (t % PARAM.periode) / PARAM.periode; return { s: Math.exp(-Math.pow((u - 0.22) / 0.13, 2)), a: 0.35 * Math.exp(-Math.pow((u - 0.06) / 0.07, 2)) }; }
// jadwal label (detik) [kunci, sisi, teks, t0, t1]; maksimum 3 sekaligus
export const LABEL_T = [['aorta', 1, 'Arkus aorta', 0.7, 2.1, 470], ['pulmonal', 1, 'Pulmonalis', 1.1, 2.5, 800], ['koroner', 1, 'A. koroner', 1.9, 3.3], ['ventrikel', 1, 'Ventrikel kiri', 2.6, 4.0, 1360], ['aurikula', 1, 'Aurikula', 3.3, 4.7, 870], ['atrium', -1, 'Atrium kanan', 4.05, 5.0]];

export function jantung(o = {}) {
  const p = 'h', labels = !!o.labels, t = o.t ?? 0, anim = !!o.anim, tt = anim ? t : 0, P2 = PARAM, k = P2.skala, [ox, oy] = P2.tempat;
  const K = kam(tt, { cx: 540, cy: 960, dy: -10 });
  const e = anim ? amplop(t) : { s: 0, a: 0 }, tw = P2.tambat;
  const flow = clamp(((tt - P2.aliran.awal) % P2.aliran.periode) / (P2.aliran.periode * 0.62)), flowO = Math.min(1, flow * 6, (1 - flow) * 5 + 0.3);
  const h = buildSvg({ layers: true, bg: false, anim: anim ? { flow: tt >= P2.aliran.awal ? flow : 0, flowO } : null, id: 'jt' });
  const sy = 1 - P2.amplitudo.sy * e.s + 0.01 * e.a, sx = 1 - P2.amplitudo.sx * e.s + 0.012 * e.a;
  const tfBody = `translate(${tw[0]} ${tw[1]}) rotate(${(P2.amplitudo.putar * e.s).toFixed(3)}) scale(${sx.toFixed(4)} ${sy.toFixed(4)}) translate(${-tw[0]} ${-tw[1]})`;
  const gambar = (x, y) => K.pt(ox + x * k, oy + (y - 200) * k);   // koordinat gambar (piksel acuan) -> kanvas setelah kamera (label)
  let s = latar(p, { seed: 7, fokus: { x: 560, y: 900 }, t: tt, kilau: [[110, 330, 28], [980, 300, 20], [1010, 1620, 32], [80, 1700, 20], [820, 1840, 18], [260, 1790, 24]] });
  s += `<defs><filter id="${p}hKontur" x="-3%" y="-3%" width="106%" height="106%"><feMorphology in="SourceAlpha" operator="dilate" radius="${(KONTUR.lebar / 2).toFixed(2)}" result="d"/><feComposite in="d" in2="SourceAlpha" operator="out" result="tepi"/><feFlood flood-color="${KONTUR.warna}" flood-opacity="${KONTUR.opasitas}"/><feComposite in2="tepi" operator="in" result="tinta"/><feMerge><feMergeNode in="tinta"/><feMergeNode in="SourceGraphic"/></feMerge></filter><filter id="${p}hLembut" x="-4%" y="-4%" width="108%" height="108%"><feGaussianBlur stdDeviation="3"/></filter>${h.defs}</defs>`;
  const rimBadan = fx(`<path d="${h.outline.badan[0]}" fill="none" stroke="${MC.mint2}" stroke-width="${(7 / k).toFixed(2)}" opacity=".32" transform="translate(${(3 / k).toFixed(2)} ${(3 / k).toFixed(2)})" filter="url(#${p}hLembut)"/>`);
  const isi = `<g transform="translate(${ox} ${oy}) scale(${k}) translate(0 -200)"><g id="h-pembuluh-belakang">${h.back}</g><g id="h-massa" transform="${tfBody}">${h.body}${rimBadan}</g><g id="h-batang-pulmonal">${h.trunk}</g><g id="h-sorotan" transform="${tfBody}">${h.hi}</g>`
    + `</g>`;
  s += `<g id="mc-adegan" transform="${K.tf}"><g filter="url(#${p}shadow)"><g id="h-kontur" filter="url(#${p}hKontur)">${isi}</g></g></g>`;
  s += vignette(p);
  s += merek({ judul: 'Jantung', sub: 'Tampak depan · pembuluh besar + koroner' });
  if (labels) {
    const tl = anim ? t : 3.0;
    const anc = { aorta: gambar(466, 408), pulmonal: gambar(505, 484), koroner: gambar(398, 850), ventrikel: gambar(480, 900), aurikula: gambar(470, 650), atrium: gambar(88, 760) };
    s += labelsT(LABEL_T.map(([kk, sd, tx, t0, t1, ty]) => [...anc[kk], sd, tx, t0, t1, ty]), tl, { atas: 330 });
  }
  if (anim) s += peralihan(t);
  return s;
}
export const GEOM_INFO = { sumber: 'claude/anatomi-visual-kalibrasi@9c7ff84 brand/anatomi-visual/v6/heart7.mjs', titikTambat: PARAM.tambat };

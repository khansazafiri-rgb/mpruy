// Peta sendi: kerangka kaki kanan tampak punggung kaki (jari ke bawah) dengan sendi MTP pertama menyala; sendi lain (pergelangan kaki, jari lain, lutut, pergelangan tangan dan jari) menyala lebih lemah.
import { f1, clamp, lerp, seg, ease } from '../tensi/util.mjs';
import { C, GADING, EMAS, TINTA, pil, garis } from './bentuk.mjs';
import { W as KATA } from './waktu.mjs';
const TL = '#F1E7D0', TLG = '#CDBD9A';
const bone = (d, o = 1) => `<path d="${d}" fill="${TL}" stroke="${TLG}" stroke-width="3" stroke-linejoin="round" opacity="${o}"/>`;
const cap = (x, y, w, h, r = 14) => bone(`M${f1(x - w / 2 + r)} ${f1(y - h / 2)}H${f1(x + w / 2 - r)}Q${f1(x + w / 2)} ${f1(y - h / 2)} ${f1(x + w / 2)} ${f1(y - h / 2 + r)}V${f1(y + h / 2 - r)}Q${f1(x + w / 2)} ${f1(y + h / 2)} ${f1(x + w / 2 - r)} ${f1(y + h / 2)}H${f1(x - w / 2 + r)}Q${f1(x - w / 2)} ${f1(y + h / 2)} ${f1(x - w / 2)} ${f1(y + h / 2 - r)}V${f1(y - h / 2 + r)}Q${f1(x - w / 2)} ${f1(y - h / 2)} ${f1(x - w / 2 + r)} ${f1(y - h / 2)}Z`);
const glowJ = (x, y, r, p, c = C.koral, T = 0) => (p < 0.01 ? '' : `<circle cx="${x}" cy="${y}" r="${f1(r * (2.4 + 0.3 * Math.sin(T * 6)))}" fill="${c}" opacity="${f1(0.22 * p)}"/><circle cx="${x}" cy="${y}" r="${f1(r * 1.35)}" fill="${c}" opacity="${f1(0.55 * p)}"/><circle cx="${x}" cy="${y}" r="${r}" fill="#FF8F86" stroke="#fff" stroke-width="3" opacity="${f1(p)}"/>`);
export const MTP1 = [590, 984];
function kaki() {
  let g = '';
  // ujung tibia dan fibula + talus
  g += cap(500, 380, 90, 150, 30) + cap(610, 390, 52, 130, 22);
  g += bone('M470 470C470 430 610 430 616 470C620 520 590 560 545 560C500 560 470 520 470 470Z');             // talus
  g += bone('M440 580C440 540 560 556 566 600C570 650 520 690 470 680C440 674 436 620 440 580Z');            // kalkaneus/kuboid (disederhanakan)
  g += bone('M580 580C610 566 660 580 662 620C664 660 620 684 584 674C560 666 556 600 580 580Z');            // navikular
  // tiga tulang baji
  [[560, 716], [612, 716], [664, 716]].forEach(([x, y]) => (g += cap(x, y, 44, 56, 14)));
  // lima metatarsal: sebuah kipas; I paling tebal di sisi medial (kanan layar)
  const mt = [[664, 760, 664, 960, 40], [604, 760, 596, 954, 26], [552, 760, 538, 944, 24], [500, 756, 480, 930, 22], [452, 728, 424, 906, 22]];
  mt.forEach(([x0, y0, x1, y1, w]) => { const dx = (x1 - x0), dy = (y1 - y0), L = Math.hypot(dx, dy), nx = -dy / L * w / 2, ny = dx / L * w / 2; g += bone(`M${f1(x0 + nx)} ${f1(y0 + ny)}L${f1(x1 + nx * 1.4)} ${f1(y1 + ny * 1.4)}Q${f1(x1)} ${f1(y1 + w * 0.6)} ${f1(x1 - nx * 1.4)} ${f1(y1 - ny * 1.4)}L${f1(x0 - nx)} ${f1(y0 - ny)}Z`); });
  // falang: ibu jari dua ruas, lainnya tiga ruas
  g += cap(664, 1016, 46, 78, 18) + cap(664, 1096, 40, 64, 18);
  const ph = [[596, 1010, 3], [538, 998, 3], [480, 982, 3], [424, 958, 3]];
  ph.forEach(([x, y, n], i) => { let yy = y; const sz = [26, 24, 22, 20][i]; for (let k = 0; k < n; k++) { g += cap(x, yy, sz, 44 - k * 6, 12); yy += 52 - k * 8; } });
  return g;
}
/** Ikon kecil lutut dan tangan (lingkaran sorot) */
function ikonLutut(cx, cy, p, T) {
  let g = `<g opacity="${f1(p)}"><circle cx="${cx}" cy="${cy}" r="118" fill="#0E2A33" stroke="${GADING}" stroke-opacity=".3" stroke-width="3"/><g transform="translate(${cx} ${cy})"><path d="M-46 -90H46L58 -34C66 -6 40 6 0 6C-40 6 -66 -6 -58 -34Z" fill="${TL}" stroke="${TLG}" stroke-width="3"/><path d="M-40 14H40L36 94H-36Z" fill="${TL}" stroke="${TLG}" stroke-width="3"/><ellipse cx="0" cy="-6" rx="32" ry="22" fill="#E9DDBE" stroke="${TLG}" stroke-width="3"/></g></g>`;
  return g;
}
function ikonTangan(cx, cy, p) {
  let g = `<g opacity="${f1(p)}"><circle cx="${cx}" cy="${cy}" r="118" fill="#0E2A33" stroke="${GADING}" stroke-opacity=".3" stroke-width="3"/><g transform="translate(${cx} ${cy + 20})" fill="${TL}" stroke="${TLG}" stroke-width="3">`;
  g += `<path d="M-52 70C-60 30 -54 0 -36 -12L36 -12C54 0 60 30 52 70Z"/>`;
  [[-40, -12, -46, -78], [-14, -12, -16, -92], [14, -12, 14, -90], [40, -12, 44, -72]].forEach(([x0, y0, x1, y1]) => (g += `<path d="M${x0 - 9} ${y0}L${x1 - 8} ${y1}Q${x1} ${y1 - 8} ${x1 + 8} ${y1}L${x0 + 9} ${y0}Z"/>`));
  g += `<path d="M-52 20C-84 4 -92 -22 -80 -44L-62 -30C-60 -16 -50 -2 -38 6Z"/></g></g>`;
  return g;
}
export function lokasi(T, lbl = true) {
  const o = seg(T, 29.55, 30.0) * (1 - seg(T, 33.55, 34.05)); if (o < 0.01) return '';
  const pMTP = seg(T, KATA.pangkal, KATA.pangkal + 0.5), pLain = seg(T, KATA.sendiLain - 0.1, KATA.sendiLain + 0.5, ease.out);
  let g = `<g opacity="${f1(o)}"><g transform="translate(0 110) scale(1.0)">${kaki()}`;
  // sendi lain (lemah): pergelangan kaki, MTP jari lain, sendi tengah kaki
  [[560, 520], [610, 400]].forEach(([x, y]) => (g += glowJ(x, y, 12, 0.7 * pLain, C.hangat, T)));
  [[596, 954], [538, 944], [480, 930], [424, 906]].forEach(([x, y]) => (g += glowJ(x, y, 9, 0.7 * pLain, C.hangat, T)));
  g += glowJ(MTP1[0] + 14, MTP1[1] - 24, 20, pMTP, C.koral, T) + `</g>`;
  g += ikonLutut(190, 1520, pLain, T) + ikonTangan(890, 1520, pLain);
  if (lbl) {
    g += pil('PANGKAL IBU JARI KAKI', 540, 1330, pMTP, { warna: C.koral, size: 36, anchor: 'middle' }) + garis([MTP1[0] + 14, MTP1[1] + 126], [540 + 120, 1332], pMTP);
    g += pil('SENDI LAIN', 540, 1480, pLain, { warna: C.hangat, size: 36, anchor: 'middle' });
  }
  return g + `</g>`;
}

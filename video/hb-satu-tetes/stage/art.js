// Aset gambar video "Bagaimana satu tetes darah bisa menghasilkan angka Hb?" (kode murni: angka -> SVG datar).
// Kode warna dipakai SAMA di semua adegan: sel darah merah = koral-merah, hemoglobin = merah tua (tetramer 4 bulatan), Hb membawa O2 = merah cerah + titik putih O2,
// Hb tanpa O2 = ungu tua, reagen 1 = mint, reagen 2 = biru, bentuk terukur = ambar, cahaya panjang gelombang 1 = kuning-hijau, 2 = ungu (warna cahaya ILUSTRATIF).
import { f1, clamp, lerp, sm, eo, eio, R, C, P, T, G, FONT, rndf } from './lib.js';

export const K = { rbc: '#E8574D', rbcD: '#B8362E', rbcIn: '#F59A8F', hb: '#A8232F', oxy: '#FF3B30', deoxy: '#6B2A52', r1: '#4FC79D', r2: '#4FA3D9', meas: '#C98B2B', l1: '#C8E04A', l2: '#B452FF', blood: '#8E1F2B', plasma: '#F3C7B7', skin: '#F7BC8E', skinD: '#EAA676', ink: '#172B38', navy: '#0F3A47', teal: '#0B2F38', cream: '#F7F2E4', gold: '#F8C038', coral: '#F2735E', mint: '#9DE0BD' };
const mixHex = (a, b, t) => { const h = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)); const A = h(a), B = h(b); return '#' + A.map((v, i) => Math.round(lerp(v, B[i], clamp(t))).toString(16).padStart(2, '0')).join(''); };
export { mixHex };

/** molekul hemoglobin (tetramer: 4 bulatan). kind: oxy | deoxy | free | meas | mix (m = 0..1 dari free ke meas) */
export function hbm(x, y, s = 1, kind = 'free', o = 1, m = 0) {
  const col = kind === 'oxy' ? K.oxy : kind === 'deoxy' ? K.deoxy : kind === 'meas' ? K.meas : kind === 'mix' ? mixHex(K.hb, K.meas, m) : K.hb;
  const d = 0.55 * s, r = 0.52 * s, dk = mixHex(col, '#000000', 0.28);
  let g = `<g transform="translate(${f1(x)} ${f1(y)})" opacity="${f1(o * 100) / 100}">`;
  for (const [dx, dy] of [[-d, -d], [d, -d], [-d, d], [d, d]]) g += `<circle cx="${f1(dx)}" cy="${f1(dy)}" r="${f1(r)}" fill="${col}" stroke="${dk}" stroke-width="${f1(s * 0.12)}"/>`;
  if (kind === 'oxy') for (const [dx, dy] of [[-d, -d], [d, d]]) g += `<circle cx="${f1(dx - r * 0.05)}" cy="${f1(dy)}" r="${f1(s * 0.2)}" fill="#fff"/>`;
  return g + `</g>`;
}
export const o2 = (x, y, s = 1, o = 1) => `<g transform="translate(${f1(x)} ${f1(y)})" opacity="${o}"><circle cx="${f1(-s * 0.3)}" cy="0" r="${f1(s * 0.32)}" fill="#fff" stroke="#9AB" stroke-width="${f1(s * 0.06)}"/><circle cx="${f1(s * 0.3)}" cy="0" r="${f1(s * 0.32)}" fill="#fff" stroke="#9AB" stroke-width="${f1(s * 0.06)}"/></g>`;
/** sel darah merah: cakram dengan lekuk. lys 0..1 = membran terbuka (cakram memudar menjadi garis putus-putus) */
export function rbc(x, y, r, rot = 0, lys = 0, o = 1) {
  const a = clamp(1 - lys * 0.92);
  return `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)})" opacity="${f1(o * 100) / 100}"><ellipse rx="${f1(r)}" ry="${f1(r * 0.82)}" fill="${K.rbc}" opacity="${f1(a * 100) / 100}"/><ellipse rx="${f1(r * 0.55)}" ry="${f1(r * 0.42)}" fill="${K.rbcIn}" opacity="${f1(a * 100) / 100}"/><ellipse rx="${f1(r)}" ry="${f1(r * 0.82)}" fill="none" stroke="${K.rbcD}" stroke-width="${f1(Math.max(2, r * 0.07))}" stroke-dasharray="${lys > 0.05 ? `${f1(r * 0.28)} ${f1(r * 0.2 + r * 0.5 * lys)}` : '0'}" opacity="${f1(clamp(0.45 + 0.55 * (1 - lys)) * 100) / 100}"/></g>`;
}
export const drop = (x, y, r, o = 1) => `<g transform="translate(${f1(x)} ${f1(y)})" opacity="${o}"><path d="M0 ${f1(-r * 1.5)}C${f1(r * 0.4)} ${f1(-r * 0.6)} ${f1(r)} ${f1(-r * 0.2)} ${f1(r)} ${f1(r * 0.35)}A${f1(r)} ${f1(r)} 0 0 1 ${f1(-r)} ${f1(r * 0.35)}C${f1(-r)} ${f1(-r * 0.2)} ${f1(-r * 0.4)} ${f1(-r * 0.6)} 0 ${f1(-r * 1.5)}Z" fill="#B3202B" stroke="#7E141E" stroke-width="${f1(Math.max(1.5, r * 0.1))}"/><ellipse cx="${f1(-r * 0.35)}" cy="${f1(r * 0.1)}" rx="${f1(r * 0.17)}" ry="${f1(r * 0.3)}" fill="#fff" opacity=".55"/></g>`;

// ------------------------------------------------------------------ mikrokuvet (SATU geometri; koordinat lokal, ujung terbuka di x=0, sumbu ke kanan)
export const CV = { L: 820, H: 54, chanEnd: 250, cavA: 250, cavB: 560, chH: 9, cavH: 32 };
const cvVoid = () => { const { chanEnd: e, cavB: b, chH: c, cavH: v } = CV; return `M0 ${-c}L${e - 30} ${-c}L${e + 10} ${-v}L${b - 20} ${-v}Q${b + 4} ${-v} ${b + 4} ${-v + 14}L${b + 4} ${v - 14}Q${b + 4} ${v} ${b - 20} ${v}L${e + 10} ${v}L${e - 30} ${c}L0 ${c}Z`; };
export const CV_VOID = cvVoid();
/** mikrokuvet: fill 0..1 = darah mengisi dari ujung terbuka (kapiler), bubble = gelembung udara, dryR = reagen kering di dinding, dark = latar gelap */
export function cuvette(x, y, s = 1, { fill = 0, rot = 0, dark = true, dryR = 1, bubble = 0, o = 1, col = K.blood, uid = 'cv' } = {}) {
  const { L, H, cavB } = CV, fx = fill * (cavB + 4), id = `cvc${uid}`;
  let g = `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)}) scale(${s})" opacity="${f1(o * 100) / 100}"><defs><clipPath id="${id}"><path d="${CV_VOID}"/></clipPath></defs>`;
  g += `<rect x="0" y="${-H}" width="${L}" height="${2 * H}" rx="26" fill="${dark ? 'rgba(206,236,242,.30)' : 'rgba(255,255,255,.7)'}" stroke="${dark ? '#CDEFF3' : '#7FBFC8'}" stroke-width="5"/>`;
  g += `<rect x="${L - 150}" y="${-H + 10}" width="110" height="${2 * H - 20}" rx="12" fill="${dark ? 'rgba(206,236,242,.16)' : 'rgba(120,170,180,.18)'}"/>`;
  g += `<path d="${CV_VOID}" fill="${dark ? '#0D2230' : '#DDE8EC'}"/>`;
  if (dryR > 0.01) for (let i = 0; i < 22; i++) { const px = CV.cavA + 14 + i * 14.5, top = i % 2 ? CV.cavH - 4 : -CV.cavH + 4; g += `<circle cx="${f1(px)}" cy="${f1(top)}" r="${f1(3.4 * dryR)}" fill="${K.r1}" opacity="${f1(0.95 * dryR * 100) / 100}"/>`; }
  if (fill > 0.001) g += `<g clip-path="url(#${id})"><rect x="-4" y="${-H}" width="${f1(fx + 4)}" height="${2 * H}" fill="${col}"/><circle cx="${f1(fx)}" cy="0" r="${f1(CV.cavH * (fx < CV.chanEnd ? 0.3 : 1.05))}" fill="${col}"/><rect x="0" y="${-CV.chH + 2}" width="${f1(Math.max(0, fx))}" height="5" fill="#fff" opacity=".22"/></g>`;
  if (bubble > 0.01) g += `<circle cx="${f1(CV.cavA + 120)}" cy="${f1(-6)}" r="${f1(20 * bubble)}" fill="#EAF4F7" opacity=".92" stroke="#9AB" stroke-width="2"/>`;
  g += `<path d="${CV_VOID}" fill="none" stroke="${dark ? 'rgba(220,244,248,.85)' : 'rgba(80,140,150,.8)'}" stroke-width="2.4"/>`;
  return g + `</g>`;
}
/** posisi titik lokal mikrokuvet di layar */
export const cvPt = (x, y, s, rot, lx, ly) => { const a = rot * Math.PI / 180; return [x + (lx * Math.cos(a) - ly * Math.sin(a)) * s, y + (lx * Math.sin(a) + ly * Math.cos(a)) * s]; };

// ------------------------------------------------------------------ alat pembaca (contoh): badan abu-abu, layar, laci mikrokuvet
export function analyzer(x, y, s = 1, { disp = '', unit = '', drawer = 0, dim = 0, o = 1, light = 0 } = {}) {
  let g = `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})" opacity="${f1(o * 100) / 100}">`;
  g += `<rect x="-26" y="26" width="552" height="760" rx="72" fill="rgba(0,0,0,.25)"/>`;
  g += `<rect x="0" y="0" width="520" height="760" rx="72" fill="#C7D1D6" stroke="#172B38" stroke-width="7"/>`;
  g += `<rect x="38" y="34" width="444" height="270" rx="34" fill="#2E3E48" stroke="#172B38" stroke-width="5"/>`;
  g += `<rect x="58" y="54" width="404" height="230" rx="22" fill="${disp ? '#B8D8C6' : '#6E8C86'}"/>`;
  if (disp) { g += T(disp, 210, 190, { size: disp.length > 3 ? 112 : 128, fill: '#0A3830', w: 800 }) + T(unit, 400, 190, { size: 46, fill: '#0A3830', w: 800 }); }
  // laci mikrokuvet (bergeser ke kiri saat dikeluarkan)
  const dx = -300 * drawer;
  g += `<rect x="0" y="400" width="520" height="116" fill="#9DAAB2" stroke="#172B38" stroke-width="5"/>`;
  g += `<g transform="translate(${f1(dx)} 0)"><rect x="40" y="418" width="${f1(440 + 300 * drawer * 0)}" height="80" rx="18" fill="#7E8E98" stroke="#172B38" stroke-width="5"/><rect x="60" y="440" width="${f1(300)}" height="36" rx="10" fill="#58666F"/></g>`;
  g += `<rect x="190" y="580" width="140" height="40" rx="20" fill="#F8C038" stroke="#172B38" stroke-width="5"/>`;
  g += `<circle cx="104" cy="660" r="26" fill="#9DAAB2" stroke="#172B38" stroke-width="4"/><circle cx="416" cy="660" r="26" fill="#9DAAB2" stroke="#172B38" stroke-width="4"/>`;
  return g + `</g>`;
}
export const arrow = (x1, y1, x2, y2, col, w = 8, o = 1) => { const a = Math.atan2(y2 - y1, x2 - x1), h = w * 2.2; return `<g opacity="${f1(o * 100) / 100}" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" fill="none"><path d="M${f1(x1)} ${f1(y1)}L${f1(x2)} ${f1(y2)}M${f1(x2 - Math.cos(a - 0.5) * h)} ${f1(y2 - Math.sin(a - 0.5) * h)}L${f1(x2)} ${f1(y2)}L${f1(x2 - Math.cos(a + 0.5) * h)} ${f1(y2 - Math.sin(a + 0.5) * h)}"/></g>`; };
/** kartu hasil: judul kecil, angka besar, satuan; tone: oke | rendah | netral */
export function card(x, y, w, h, { label = '', value = '', unit = '', tone = 'netral', note = '', o = 1, s = 1, flag = '' } = {}) {
  const bd = tone === 'rendah' ? '#D9382F' : tone === 'oke' ? '#00A383' : '#9AA9B0', bg = tone === 'rendah' ? '#FFF1EE' : tone === 'oke' ? '#EAF7F1' : '#F4F1E8';
  return `<g transform="translate(${f1(x + w / 2)} ${f1(y + h / 2)}) scale(${f1(s * 1000) / 1000}) translate(${f1(-w / 2)} ${f1(-h / 2)})" opacity="${f1(o * 100) / 100}"><rect x="6" y="12" width="${w}" height="${h}" rx="34" fill="rgba(0,0,0,.25)"/><rect x="0" y="0" width="${w}" height="${h}" rx="34" fill="${bg}" stroke="${bd}" stroke-width="8"/>`
    + T(label, w / 2, 62, { size: 40, fill: '#0A3830' }) + T(value, w / 2 - (unit ? 32 : 0), h / 2 + 56, { size: 116, fill: bd === '#9AA9B0' ? K.ink : bd }) + (unit ? T(unit, w / 2 + 128, h / 2 + 54, { size: 38, fill: '#0A3830' }) : '')
    + (note ? T(note, w / 2, h - 30, { size: 28, fill: '#44606A', w: 700 }) : '') + (flag ? `<g transform="translate(${w - 54} 54)"><circle r="30" fill="#D9382F"/><path d="M0 -12V12M-9 3L0 12L9 3" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"/></g>` : '') + `</g>`;
}

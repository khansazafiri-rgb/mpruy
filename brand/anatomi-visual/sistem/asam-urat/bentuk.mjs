// Unsur gambar bersama video asam urat: molekul purin, partikel urat (larut), kristal urat berbentuk jarum kecil, sel pertahanan, sel tubuh, makanan, label.
// Semua skematis (bukan struktur kimia sebenarnya); warna tetap di seluruh video agar penonton mengenali: purin = biru-teal, urat larut = emas, kristal = putih-biru pucat berbentuk jarum.
import { FONT, MEREK } from '../tokens.mjs';
import { f1, clamp, lerp, seg, ease, mix, gelap, terang } from '../tensi/util.mjs';

export const GADING = MEREK.gading, EMAS = MEREK.emas, TINTA = MEREK.tinta, HIJAU = MEREK.hijau;
export const C = {
  purin: '#79D2E6', purinG: '#2A6F86', urat: '#F8C038', uratT: '#FFE49A', kristal: '#EEF6F8', kristalG: '#8DBBCB', darah: '#C5373F', darahG: '#7C1F2C', darahT: '#F2706E',
  sel: '#EAF0F8', selG: '#9DB0CC', inti: '#7A66B0', koral: '#EE6C58', hangat: '#FF9A4D', saraf: '#F8C038', ginjal: '#C46B5A', ginjalG: '#8C3E3A',
};
/** Pseudo-acak deterministik 0..1 */
export const rnd = (i, k = 0) => { const x = Math.sin(i * 127.1 + k * 311.7 + 7.7) * 43758.5453; return x - Math.floor(x); };
export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

/** Molekul purin: cincin enam + cincin lima menyatu, titik N. (x,y) pusat, s = ukuran, rot = derajat. */
export function purin(x, y, s = 1, rot = 0, o = 1, glow = 0.5) {
  const hex = [[0, -1], [0.87, -0.5], [0.87, 0.5], [0, 1], [-0.87, 0.5], [-0.87, -0.5]].map(([a, b]) => [a * 15, b * 15]);
  const pent = [[0.87 * 15, -0.5 * 15], [0.87 * 15 + 14, -8], [0.87 * 15 + 22, 4], [0.87 * 15 + 12, 15], [0.87 * 15, 0.5 * 15]];
  const pts = (A) => A.map((p) => `${f1(p[0])} ${f1(p[1])}`).join('L');
  return `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)}) scale(${f1(s * 100) / 100}) translate(-14 0)" opacity="${f1(o)}">`
    + (glow > 0 ? `<circle cx="14" cy="0" r="34" fill="${C.purin}" opacity="${f1(0.14 * glow)}"/>` : '')
    + `<path d="M${pts(hex)}Z" fill="${C.purinG}" stroke="${C.purin}" stroke-width="3.4" stroke-linejoin="round"/><path d="M${pts(pent)}" fill="${C.purinG}" stroke="${C.purin}" stroke-width="3.4" stroke-linejoin="round"/>`
    + `<circle cx="0" cy="-15" r="3.8" fill="${C.purin}"/><circle cx="0" cy="15" r="3.8" fill="${C.purin}"/><circle cx="${f1(0.87 * 15 + 22)}" cy="4" r="3.8" fill="${C.purin}"/><circle cx="${f1(0.87 * 15 + 12)}" cy="15" r="3.8" fill="#fff" opacity=".8"/></g>`;
}
/** Urat larut: titik emas dengan halo lembut. */
export function urat(x, y, r = 6, o = 1, halo = 1) {
  return `<g opacity="${f1(o)}">${halo ? `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r * 2.4)}" fill="${C.urat}" opacity=".2"/>` : ''}<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="${C.urat}"/><circle cx="${f1(x - r * 0.3)}" cy="${f1(y - r * 0.3)}" r="${f1(r * 0.38)}" fill="${C.uratT}"/></g>`;
}
/** Kristal urat: jarum kecil (belah ketupat memanjang) dengan kilau; tumbuh dari titik (g 0..1). */
export function jarum(x, y, len = 34, w = 5.4, rot = 0, g = 1, o = 1) {
  const L = len * g, W = w * (0.4 + 0.6 * g);
  return `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)})" opacity="${f1(o)}"><path d="M${f1(-L / 2)} 0L${f1(-L * 0.18)} ${f1(-W)}L${f1(L / 2)} 0L${f1(-L * 0.18)} ${f1(W)}Z" fill="${C.kristal}" stroke="${C.kristalG}" stroke-width="1.8" stroke-linejoin="round"/><path d="M${f1(-L * 0.35)} ${f1(-W * 0.35)}L${f1(L * 0.3)} 0" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".85" fill="none"/></g>`;
}
/** Sel pertahanan (neutrofil): badan bulat pucat, inti berlobus ungu, tonjolan (pseudopod) menuju arah dir (derajat). */
export function sel(x, y, r = 20, dir = 0, o = 1, aktif = 0) {
  const d = dir * Math.PI / 180, px = Math.cos(d), py = Math.sin(d);
  return `<g opacity="${f1(o)}">${aktif > 0 ? `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r * 1.9)}" fill="${C.hangat}" opacity="${f1(0.22 * aktif)}"/>` : ''}`
    + `<ellipse cx="${f1(x + px * r * 0.45)}" cy="${f1(y + py * r * 0.45)}" rx="${f1(r * 0.62)}" ry="${f1(r * 0.5)}" transform="rotate(${f1(dir)} ${f1(x + px * r * 0.45)} ${f1(y + py * r * 0.45)})" fill="${C.sel}" stroke="${C.selG}" stroke-width="2.2"/>`
    + `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="${C.sel}" stroke="${C.selG}" stroke-width="2.6"/>`
    + `<circle cx="${f1(x - r * 0.26)}" cy="${f1(y - r * 0.2)}" r="${f1(r * 0.34)}" fill="${C.inti}"/><circle cx="${f1(x + r * 0.2)}" cy="${f1(y - r * 0.12)}" r="${f1(r * 0.3)}" fill="${C.inti}"/><circle cx="${f1(x)}" cy="${f1(y + r * 0.26)}" r="${f1(r * 0.3)}" fill="${C.inti}"/>`
    + `<circle cx="${f1(x - r * 0.34)}" cy="${f1(y - r * 0.5)}" r="${f1(r * 0.12)}" fill="#fff" opacity=".7"/></g>`;
}
/** Sel tubuh (pergantian sel): bulat besar dengan inti dan benang purin; fase 0 utuh .. 1 terurai. */
export function selTubuh(x, y, r, fase = 0, T = 0) {
  const o = 1 - 0.4 * fase, wob = 1 + 0.03 * Math.sin(T * 3);
  let s = `<g opacity="${f1(o)}" transform="translate(${f1(x)} ${f1(y)}) scale(${f1(wob * (1 - 0.1 * fase) * 100) / 100}) translate(${-f1(x)} ${-f1(y)})"><circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r * 1.12)}" fill="#E7A8A2" opacity=".35"/><circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="#F0C1B5" stroke="#D68E82" stroke-width="5"/>`
    + `<circle cx="${f1(x - r * 0.08)}" cy="${f1(y - r * 0.05)}" r="${f1(r * 0.42)}" fill="#A9788E" stroke="#8A5A72" stroke-width="4"/>`;
  // benang DNA kecil di inti
  s += `<path d="M${f1(x - r * 0.25)} ${f1(y - r * 0.1)}c${f1(r * 0.12)} ${f1(-r * 0.2)} ${f1(r * 0.2)} ${f1(r * 0.2)} ${f1(r * 0.32)} 0s${f1(r * 0.1)} ${f1(-r * 0.15)} ${f1(r * 0.16)} ${f1(r * 0.05)}" fill="none" stroke="#F4D8E6" stroke-width="4" stroke-linecap="round"/>`;
  return s + `<circle cx="${f1(x - r * 0.45)}" cy="${f1(y - r * 0.5)}" r="${f1(r * 0.12)}" fill="#fff" opacity=".5"/></g>`;
}
/** Ikon makanan datar (tanpa menonjolkan satu jenis): ikan, daging (paha), kacang-kacangan, roti. */
export function makanan(jenis, x, y, s = 1) {
  const g = (b) => `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})">${b}</g>`;
  if (jenis === 'ikan') return g(`<path d="M-34 0C-20 -22 12 -24 30 -2C14 20 -20 22 -34 0Z" fill="#7FB6D2"/><path d="M28 -2L48 -16L46 0L48 16Z" fill="#6AA3C0"/><circle cx="-16" cy="-4" r="3.6" fill="#10212B"/><path d="M-6 -12C-2 -4 -2 4 -6 12" fill="none" stroke="#5E97B3" stroke-width="3" stroke-linecap="round"/>`);
  if (jenis === 'daging') return g(`<path d="M-30 6C-38 -16 -14 -30 6 -22C24 -16 28 6 14 16C2 26 -22 22 -30 6Z" fill="#C8624F"/><path d="M-22 -4C-14 -12 -2 -14 6 -10" fill="none" stroke="#E79A86" stroke-width="5" stroke-linecap="round"/><rect x="14" y="10" width="26" height="9" rx="4.5" transform="rotate(35 14 10)" fill="#F2E6CF"/><circle cx="40" cy="26" r="7" fill="#F2E6CF"/>`);
  if (jenis === 'kacang') return g(`<ellipse cx="-16" cy="2" rx="13" ry="18" transform="rotate(-24 -16 2)" fill="#8E5A3C"/><ellipse cx="8" cy="-4" rx="13" ry="18" transform="rotate(20 8 -4)" fill="#A8704A"/><ellipse cx="22" cy="14" rx="12" ry="16" transform="rotate(50 22 14)" fill="#7C4C33"/><path d="M-22 -8C-18 -14 -12 -14 -8 -8" stroke="#C99B76" stroke-width="3" fill="none" stroke-linecap="round"/>`);
  return g(`<path d="M-30 14C-34 -10 -16 -26 2 -26C22 -26 34 -10 30 14Z" fill="#E4B26A"/><path d="M-26 14H26V22H-26Z" fill="#C98F48"/><path d="M-14 -14C-8 -20 0 -20 6 -16" stroke="#F4D49A" stroke-width="4" fill="none" stroke-linecap="round"/>`);
}
/** Label berbentuk pil gading (gaya seri): teks pendek huruf besar, penanda titik berwarna. */
export function pil(teks, x, y, p = 1, { warna = EMAS, size = 34, ink = TINTA, fill = GADING, anchor = 'start' } = {}) {
  if (p <= 0.01) return '';
  const w = size * 1.9 + teks.length * size * 0.78, h = size * 1.9, x0 = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x, dy = (1 - ease.out(p)) * 18;
  return `<g opacity="${f1(clamp(p * 1.5))}" transform="translate(0 ${f1(dy)})"><rect x="${f1(x0)}" y="${f1(y + 6)}" width="${f1(w)}" height="${f1(h)}" rx="${f1(h / 2)}" fill="#000" opacity=".3"/><rect x="${f1(x0)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" rx="${f1(h / 2)}" fill="${fill}"/>`
    + `<circle cx="${f1(x0 + h / 2)}" cy="${f1(y + h / 2)}" r="${f1(size * 0.32)}" fill="${warna}" stroke="${ink}" stroke-opacity=".4" stroke-width="2"/><text x="${f1(x0 + h * 0.95)}" y="${f1(y + h / 2 + size * 0.36)}" font-family="${FONT}" font-weight="800" font-size="${size}" fill="${ink}">${esc(teks)}</text></g>`;
}
export const lebarPil = (teks, size = 34) => size * 1.9 + teks.length * size * 0.78;
/** Penunjuk garis dari titik a ke pil di b. */
export const garis = (a, b, p = 1, c = GADING) => (p < 0.01 ? '' : `<path d="M${f1(a[0])} ${f1(a[1])}L${f1(lerp(a[0], b[0], ease.out(p)))} ${f1(lerp(a[1], b[1], ease.out(p)))}" stroke="${c}" stroke-width="4" stroke-linecap="round" opacity=".85"/><circle cx="${f1(a[0])}" cy="${f1(a[1])}" r="7" fill="${c}"/>`);
export const logoMark = 'logo-mark.webp';

// Unsur layar (bukan anatomi): chip bab, takarir, indikator, kartu perempuan, tensimeter, rantai peringatan, kartu penutup.
import { FONT, MEREK } from '../tokens.mjs';
import { f1, clamp, lerp, seg, ease, mix, jendela, B, mulus } from './util.mjs';
import { bintang } from '../latar.mjs';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
export const TINTA = MEREK.tinta, GADING = MEREK.gading, EMAS = MEREK.emas;

export function chip(teks, p) {
  if (p <= 0.01) return '';
  const w = 70 + teks.length * 17.2;
  return `<g opacity="${f1(p)}" transform="translate(${f1((1 - p) * -24)} 0)"><rect x="64" y="104" width="${f1(w)}" height="64" rx="32" fill="#06161A" opacity=".55"/><rect x="64" y="100" width="${f1(w)}" height="64" rx="32" fill="${GADING}"/><circle cx="98" cy="132" r="11" fill="${EMAS}" stroke="${TINTA}" stroke-opacity=".35" stroke-width="2"/><text x="124" y="143" font-family="${FONT}" font-weight="800" font-size="30" fill="${TINTA}">${esc(teks)}</text></g>`;
}
/** Takarir: kalimat naskah apa adanya, dibungkus per baris. */
export function bungkus(teks, maks = 38) {
  const kata = teks.split(' '), baris = []; let cur = '';
  for (const k of kata) { if ((cur + ' ' + k).trim().length > maks) { baris.push(cur); cur = k; } else cur = (cur + ' ' + k).trim(); }
  if (cur) baris.push(cur);
  // seimbangkan baris terakhir yang terlalu pendek
  if (baris.length > 1 && baris[baris.length - 1].length < 9) { const l = baris.pop(), p = baris.pop().split(' '); const k = p.pop(); baris.push(p.join(' ')); baris.push(k + ' ' + l); }
  return baris;
}
export function takarir(teks, p) {
  if (!teks || p <= 0.01) return '';
  const B2 = bungkus(teks), n = B2.length, h = 42 + n * 52;
  const y0 = 1752 - h;
  return `<g opacity="${f1(p)}"><rect x="56" y="${y0 + 6}" width="968" height="${h}" rx="36" fill="#000" opacity=".3"/><rect x="56" y="${y0}" width="968" height="${h}" rx="36" fill="#06161A" opacity=".82"/><rect x="56" y="${y0}" width="968" height="${h}" rx="36" fill="none" stroke="${GADING}" stroke-opacity=".18" stroke-width="2"/>`
    + B2.map((b, i) => `<text x="540" y="${y0 + 66 + i * 52}" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="40" fill="${GADING}">${esc(b)}</text>`).join('') + `</g>`;
}
export const catatan = () => `<text x="540" y="1818" text-anchor="middle" font-family="${FONT}" font-weight="500" font-size="23" fill="${GADING}" opacity=".58">Gambar skematis dari kode · edukasi umum, bukan pengganti pemeriksaan tenaga kesehatan</text>`;

/** Satu batang indikator: label kiri, batang kanan. v 0..1 (1 = normal). */
export function batang(y, label, v, p = 1, warnaTinggi = '#3FC9A5') {
  if (p <= 0.01) return '';
  const w = 330, x = 64, lx = 64 + 258, c = mix('#F0735E', warnaTinggi, clamp((v - 0.35) / 0.5));
  return `<g opacity="${f1(p)}"><rect x="${x}" y="${y}" width="${w + 258}" height="50" rx="25" fill="#06161A" opacity=".6"/>`
    + `<text x="${x + 22}" y="${y + 34}" font-family="${FONT}" font-weight="800" font-size="29" fill="${GADING}">${esc(label)}</text>`
    + `<rect x="${lx}" y="${y + 13}" width="${w - 20}" height="24" rx="12" fill="#fff" opacity=".14"/><rect x="${lx}" y="${y + 13}" width="${f1(Math.max(16, (w - 20) * clamp(v)))}" height="24" rx="12" fill="${c}"/><rect x="${lx + 6}" y="${y + 17}" width="${f1(Math.max(6, (w - 20) * clamp(v) - 12))}" height="6" rx="3" fill="#fff" opacity=".35"/></g>`;
}

// ---- ikon sederhana (garis tebal, satu warna) ----
export const ikon = {
  tetes: (x, y, s, c = '#E5483F', o = 1) => `<path transform="translate(${f1(x)} ${f1(y)}) scale(${s})" d="M0 -22C10 -8 15 0 15 8C15 17 8 23 0 23C-8 23 -15 17 -15 8C-15 0 -10 -8 0 -22Z" fill="${c}" opacity="${o}"/><ellipse transform="translate(${f1(x - 5 * s)} ${f1(y + 3 * s)}) scale(${s})" cx="0" cy="0" rx="3" ry="7" fill="#fff" opacity="${0.5 * o}"/>`,
  segitiga: (x, y, s, c = '#F8C038') => `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})"><path d="M0 -20L20 15H-20Z" fill="${c}" stroke="${TINTA}" stroke-width="3" stroke-linejoin="round"/><rect x="-2.4" y="-8" width="4.8" height="13" rx="2" fill="${TINTA}"/><circle cx="0" cy="10" r="2.6" fill="${TINTA}"/></g>`,
  pil: (x, y, s, o = 1) => `<g transform="translate(${f1(x)} ${f1(y)}) rotate(-35) scale(${s})" opacity="${o}"><rect x="-22" y="-10" width="44" height="20" rx="10" fill="#F4F0E8"/><path d="M0 -10H12A10 10 0 0 1 12 10H0Z" fill="#E5675C"/><rect x="-14" y="-6" width="14" height="4" rx="2" fill="#fff" opacity=".7"/></g>`,
  gelas: (x, y, s, o = 1) => `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})" opacity="${o}"><path d="M-14 -18H14L11 18H-11Z" fill="#CFE9F0" opacity=".35" stroke="#E8F6FA" stroke-width="2.5"/><path d="M-13 -2H13L11 18H-11Z" fill="#7FD0E8" opacity=".9"/><path d="M-4 22H4" stroke="#fff" stroke-width="0"/></g>`,
  putar: (x, y, s, c = '#F8C038', o = 1) => `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})" opacity="${o}"><path d="M0 0C0 -6 7 -6 7 0C7 10 -10 10 -10 0C-10 -16 12 -16 12 0C12 22 -15 22 -15 0" fill="none" stroke="${c}" stroke-width="3.6" stroke-linecap="round"/></g>`,
};

/** Bintang pusing yang mengorbit di atas kepala (satuan tokoh). d 0..1. */
export function bintangPusing(T, d, cx = 200, cy = 100) {
  if (d < 0.05) return '';
  let s = `<g opacity="${f1(clamp(d * 1.4))}">`;
  for (let i = 0; i < 4; i++) { const a = T * 3.2 + i * Math.PI / 2, x = cx + Math.cos(a) * 130, y = cy + Math.sin(a) * 24, front = Math.sin(a) > 0; s += bintang(x, y, 14 + (front ? 4 : 0), i % 2 ? '#FFF3C4' : '#F8C038', front ? 1 : 0.6); }
  return s + '</g>';
}

/** Dial tekanan (tanpa angka): busur tiga zona dan jarum. v 0..1 (0 rendah, .5 normal). */
export function dial(cx, cy, r, v, p = 1, label = '') {
  const a = (u) => Math.PI * (1 + u), P2 = (u, rr) => [cx + Math.cos(a(u)) * rr, cy + Math.sin(a(u)) * rr];
  const arc = (u0, u1, c) => { const [x0, y0] = P2(u0, r), [x1, y1] = P2(u1, r); return `<path d="M${f1(x0)} ${f1(y0)}A${r} ${r} 0 0 1 ${f1(x1)} ${f1(y1)}" fill="none" stroke="${c}" stroke-width="${f1(r * 0.2)}" stroke-linecap="butt"/>`; };
  const [nx, ny] = P2(clamp(v), r * 0.82);
  return `<g opacity="${f1(p)}">${arc(0, 0.33, '#F0735E')}${arc(0.335, 0.665, '#3FC9A5')}${arc(0.67, 1, '#F8C038')}<path d="M${f1(cx)} ${f1(cy)}L${f1(nx)} ${f1(ny)}" stroke="${GADING}" stroke-width="${f1(r * 0.07)}" stroke-linecap="round"/><circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r * 0.1)}" fill="${GADING}"/>${label ? `<text x="${f1(cx)}" y="${f1(cy + r * 0.42)}" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="${f1(r * 0.26)}" fill="${GADING}">${esc(label)}</text>` : ''}</g>`;
}

/** Potongan pembuluh memanjang dengan sel darah. cairan = tinggi cairan 0..1; sel = kerapatan sel; plasma = warna; kec = fase gerak. */
export function pembuluhPanjang(x, y, w, h, { cairan = 1, sel = 1, T = 0, kec = 1, plasma = '#E5483F', pucat = 0 }) {
  const wall = '#F3D2CA';
  let s = `<rect x="${x - 10}" y="${y - 10}" width="${w + 20}" height="${h + 20}" rx="${h / 2 + 10}" fill="${wall}" opacity=".9"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="#2A1018"/>`;
  const hh = h * clamp(cairan), yy = y + h - hh;
  s += `<clipPath id="pp${Math.round(x + y)}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}"/></clipPath><g clip-path="url(#pp${Math.round(x + y)})"><rect x="${x}" y="${f1(yy)}" width="${w}" height="${f1(hh + 2)}" fill="${mix(plasma, '#F7B7A8', pucat * 0.7)}" opacity="${f1(0.55 + 0.1 * (1 - pucat))}"/>`;
  const n = 16;
  for (let i = 0; i < n; i++) {
    const vis = (i / n) < sel, ph = ((T * 0.18 * kec + i / n) % 1);
    const cxp = x + 30 + ph * (w - 60), cyp = yy + hh * (0.28 + 0.44 * ((i * 0.37) % 1));
    if (!vis || hh < 26) continue;
    s += `<ellipse cx="${f1(cxp)}" cy="${f1(cyp)}" rx="19" ry="12" fill="${mix('#C9232F', '#F08E86', pucat * 0.5)}"/><ellipse cx="${f1(cxp - 3)}" cy="${f1(cyp - 2)}" rx="8" ry="4.4" fill="#fff" opacity=".28"/>`;
  }
  return s + '</g>';
}

/** Penampang pembuluh (kehamilan): tonus normal -> rileks. r 0 normal, 1 rileks. */
export function penampang(cx, cy, R, r, T = 0) {
  const lumen = R * lerp(0.4, 0.66, r), tebal = R - lumen, wallC = mix('#C95A66', '#EBA0A8', r);
  let s = `<circle cx="${cx}" cy="${cy}" r="${f1(R + 6)}" fill="#0A0E14" opacity=".5"/><circle cx="${cx}" cy="${cy}" r="${f1(R)}" fill="${wallC}"/>`;
  // serat otot polos melingkar (makin renggang saat rileks)
  s += `<g fill="none" stroke="#7A2236" stroke-linecap="round">`;
  for (let i = 0; i < 3; i++) s += `<circle cx="${cx}" cy="${cy}" r="${f1(lumen + tebal * (0.25 + i * 0.25))}" stroke-width="${f1(lerp(5, 2, r))}" opacity="${f1(lerp(0.65, 0.3, r))}"/>`;
  s += `</g><circle cx="${cx}" cy="${cy}" r="${f1(lumen)}" fill="#8C1620"/><circle cx="${cx - lumen * 0.2}" cy="${cy - lumen * 0.25}" r="${f1(lumen * 0.62)}" fill="#C42632" opacity=".7"/>`;
  for (let i = 0; i < 7; i++) { const a = T * 0.6 + i * 0.9, rr = lumen * (0.25 + 0.55 * ((i * 0.31) % 1)); s += `<ellipse cx="${f1(cx + Math.cos(a) * rr)}" cy="${f1(cy + Math.sin(a) * rr)}" rx="9" ry="6" fill="#F26A63" opacity=".8" transform="rotate(${f1(a * 57)} ${f1(cx + Math.cos(a) * rr)} ${f1(cy + Math.sin(a) * rr)})"/>`; }
  // panah tonus: ke dalam (normal) vs longgar (rileks)
  return s;
}

/** Kartu (panel bulat) dengan judul. */
export function kartu(x, y, w, h, judul, p = 1, warna = '#0B2630') {
  if (p <= 0.01) return '';
  return `<g opacity="${f1(p)}"><rect x="${x}" y="${y + 8}" width="${w}" height="${h}" rx="44" fill="#000" opacity=".3"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="44" fill="${warna}" opacity=".94"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="44" fill="none" stroke="${GADING}" stroke-opacity=".22" stroke-width="2.5"/>${judul ? `<text x="${x + 36}" y="${y + 62}" font-family="${FONT}" font-weight="800" font-size="36" fill="${EMAS}">${esc(judul)}</text>` : ''}</g>`;
}
export const pil = (x, y, teks, { fill = GADING, ink = TINTA, size = 32, p = 1, ikonSvg = '' } = {}) => {
  if (p <= 0.01) return '';
  const w = 44 + teks.length * size * 0.57 + (ikonSvg ? 52 : 0), h = size * 1.9;
  return `<g opacity="${f1(p)}" transform="translate(0 ${f1((1 - p) * 14)})"><rect x="${f1(x)}" y="${f1(y + 5)}" width="${f1(w)}" height="${f1(h)}" rx="${f1(h / 2)}" fill="#000" opacity=".28"/><rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" rx="${f1(h / 2)}" fill="${fill}"/>${ikonSvg}<text x="${f1(x + 26 + (ikonSvg ? 52 : 0))}" y="${f1(y + h / 2 + size * 0.36)}" font-family="${FONT}" font-weight="800" font-size="${size}" fill="${ink}">${esc(teks)}</text></g>`;
};
export const pilLebar = (teks, size = 32, ikon = false) => 44 + teks.length * size * 0.57 + (ikon ? 52 : 0);
export { esc };

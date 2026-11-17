// Ilustrasi mekanisme efusi perikardial (penampang sederhana, SKEMATIK, bukan citra pasien/rekaman produk).
// Jantung (ukuran TETAP, tidak membesar) dikelilingi lapisan dalam perikardium (viseral, menempel pada jantung) dan lapisan luar (parietal). Di antaranya = ruang perikardium berisi sedikit cairan.
// Cairan bertambah perlahan; hanya lapisan LUAR yang meregang. Cairan tidak pernah masuk ke ruang jantung. Satuan: koordinat lokal 1000 x 900; pusat (500, 450).
import { f1, clamp, lerp, sm } from './core.js';
export const CX = 500, CY = 450, HRX = 205, HRY = 190;     // jantung (elips miokardium)
const win = (t, a, b, f = 0.4) => clamp((t - a) / f) * clamp((b - t) / f);
const ell = (cx, cy, rx, ry) => `M${f1(cx - rx)} ${f1(cy)}a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(2 * rx)} 0a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-2 * rx)} 0Z`;
/** celah ruang perikardium (px) menurut waktu video */
export function gap(t, C) {
  const A = C.anim;
  if (t < A.radang[0]) return 9;
  if (t < A.terkumpul[0]) return lerp(9, 24, sm((t - A.radang[0] - 1.2) / (A.radang[1] - A.radang[0] - 1.6)));
  return lerp(24, 60, sm((t - A.terkumpul[0]) / (A.terkumpul[1] - A.terkumpul[0] - 0.6)));
}
/** penekanan ruang isi (0..1) pada adegan tekanan */
export function squeeze(t, C) { const A = C.anim; return sm((t - A.tekanan[0] - 0.6) / 1.6) * (1 - sm((t - A.tekanan[1] + 0.2) / 0.6)); }
/** gambar ilustrasi. o.alpha mengatur opasitas total; o.lab menyalakan label. */
export function illus(t, C, o = {}) {
  const A = C.anim, g = o.gap ?? gap(t, C), sq = o.sq ?? squeeze(t, C), inf = win(t, A.radang[0], A.radang[1] + 0.6, 0.6) * (o.keepInf ? 1 : 1) + (o.inflamed ? 1 : 0);
  const infl = clamp(inf);
  const prx = HRX + 6 + g, pry = HRY + 6 + g, wob = 1 + 0.004 * Math.sin(t * 3) * (g > 30 ? 1 : 0);
  const layer = (c) => `${c}`;
  const red = (base, hot) => (infl > 0.01 ? mix(base, hot, infl) : base);
  let s = `<defs><radialGradient id="myo" cx=".45" cy=".4" r=".7"><stop offset="0" stop-color="#E58A92"/><stop offset="1" stop-color="#C9606E"/></radialGradient><clipPath id="clipHeart"><path d="${ell(CX, CY, HRX, HRY)}"/></clipPath></defs>`;
  // ruang perikardium + cairan: cincin antara lapisan dalam (jantung) dan lapisan luar
  s += `<path d="${ell(CX, CY, prx * wob, pry * wob)}${ell(CX, CY, HRX + 3, HRY + 3)}" fill-rule="evenodd" fill="#F7E6A2" opacity=".96"/>`;
  // riak halus pada cairan
  for (let i = 0; i < 5; i++) { const a = (t * 0.5 + i * 1.26) % 6.28, r = (g > 20 ? 1 : 0.4); s += `<ellipse cx="${f1(CX + Math.cos(a) * (HRX + 3 + g * 0.55))}" cy="${f1(CY + Math.sin(a) * (HRY + 3 + g * 0.55))}" rx="${f1(6 + g * 0.18)}" ry="${f1(2.5 + g * 0.06)}" fill="rgba(255,255,255,.45)" opacity="${f1(r * 0.7)}" transform="rotate(${f1(a * 57.3 + 90)} ${f1(CX + Math.cos(a) * (HRX + 3 + g * 0.55))} ${f1(CY + Math.sin(a) * (HRY + 3 + g * 0.55))})"/>`; }
  // jantung (ukuran tetap)
  const k = 1 - 0.14 * sq, kr = 1 - 0.30 * sq;
  s += `<path d="${ell(CX, CY, HRX, HRY)}" fill="url(#myo)"/>`;
  s += `<ellipse cx="${f1(CX - 28)}" cy="${f1(CY + 4)}" rx="${f1(86 * k)}" ry="${f1(98 * k)}" fill="#8A2B3C"/><ellipse cx="${f1(CX + 128)}" cy="${f1(CY - 6)}" rx="${f1(40 * kr)}" ry="${f1(92 * kr)}" fill="#5E7FB8"/>`;
  s += `<path d="M${CX + 62} ${CY - 90}Q${CX + 82} ${CY} ${CX + 62} ${CY + 90}" stroke="rgba(255,225,225,.35)" stroke-width="6" fill="none"/>`;
  // lapisan dalam (viseral, menempel) dan luar (parietal, meregang)
  s += `<path d="${ell(CX, CY, HRX + 3, HRY + 3)}" fill="none" stroke="${red('#F3C9BE', '#E0505A')}" stroke-width="7"/>`;
  s += `<path d="${ell(CX, CY, prx * wob, pry * wob)}" fill="none" stroke="${red('#E3A097', '#D8404C')}" stroke-width="${f1(11 - Math.min(3.2, g * 0.05))}"/>`;
  s += `<path d="${ell(CX, CY, prx * wob + 9, pry * wob + 9)}" fill="none" stroke="rgba(220,200,190,.45)" stroke-width="3" stroke-dasharray="10 8"/>`;
  // peradangan: bintik kemerahan + contoh kuman kecil di dekat lapisan
  if (infl > 0.02) {
    const pts = 14;
    for (let i = 0; i < pts; i++) { const a = i / pts * 6.28 + 0.3, rr = 1 + 0.5 * Math.sin(t * 5 + i * 2.1); s += `<circle cx="${f1(CX + Math.cos(a) * (prx * wob + 4))}" cy="${f1(CY + Math.sin(a) * (pry * wob + 4))}" r="${f1((6 + 3 * rr) * infl)}" fill="rgba(255,90,90,${f1(0.5 * infl)})"/>`; }
    for (let i = 0; i < 5; i++) { const a = 0.9 + i * 1.15, d = prx * wob + 38 + 8 * Math.sin(t * 2 + i), x = CX + Math.cos(a) * d, y = CY + Math.sin(a) * (pry * wob + 38);
      s += `<g opacity="${f1(infl * (o.germ ?? 1))}" transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(a * 57 + t * 20)})"><ellipse rx="13" ry="7" fill="#3E7B4A"/><path d="M-13 0h-9M13 0h9M0 -7v-8M0 7v8" stroke="#3E7B4A" stroke-width="2.5"/></g>`; }
  }
  // produksi vs penyerapan (panah) saat cairan terkumpul
  const ar = win(t, A.terkumpul[0] + 0.2, A.terkumpul[1], 0.5);
  if (ar > 0.01) {
    const bigIn = (x, y, rot) => `<g transform="translate(${x} ${y}) rotate(${rot})" opacity="${f1(ar)}"><path d="M0 -44V24M-26 0L0 30L26 0" stroke="#F8C038" stroke-width="12" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>`;
    const smallOut = (x, y, rot) => `<g transform="translate(${x} ${y}) rotate(${rot})" opacity="${f1(ar)}"><path d="M0 12V-18M-12 -4L0 -20L12 -4" stroke="#7CE0B8" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>`;
    s += bigIn(CX - prx * wob - 56, CY - 30, -90) + bigIn(CX - prx * wob - 56, CY + 50, -90) + smallOut(CX + prx * wob + 54, CY - 30, -90);
  }
  // tekanan: panah dari cairan ke dalam menekan ruang isi
  if (sq > 0.02) {
    const pa = (x, y, rot) => `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${rot})" opacity="${f1(sq)}"><path d="M0 -30V16M-20 -2L0 20L20 -2" stroke="#FF8A7A" stroke-width="11" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>`;
    s += pa(CX - prx * wob + 28, CY - 40, -90) + pa(CX - prx * wob + 28, CY + 60, -90) + pa(CX + prx * wob - 28, CY - 40, 90) + pa(CX, CY - pry * wob + 26, 180) + pa(CX, CY + pry * wob - 26, 0);
  }
  return s;
}
function mix(a, b, k) { const p = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)); const A = p(a), B = p(b); return '#' + A.map((v, i) => Math.round(lerp(v, B[i], k)).toString(16).padStart(2, '0')).join(''); }
/** label dengan garis penunjuk; dikembalikan sebagai SVG dalam koordinat lokal */
export function labels(t, C) {
  const A = C.anim, g = gap(t, C), prx = HRX + 6 + g, pry = HRY + 6 + g;
  const L = (a, b, txt, x0, y0, x1, y1, c) => { const al = win(t, a, b, 0.35); if (al <= 0.01) return ''; return `<g opacity="${f1(al)}"><path d="M${f1(x0)} ${f1(y0)}L${f1(x1)} ${f1(y1 + (y1 < y0 ? 18 : -34))}" stroke="${c}" stroke-width="4" stroke-linecap="round"/><circle cx="${f1(x0)}" cy="${f1(y0)}" r="8" fill="${c}"/><text x="${f1(x1)}" y="${f1(y1)}" font-family="'Plus Jakarta Sans',sans-serif" font-weight="800" font-size="31" fill="#fff" text-anchor="middle" stroke="rgba(3,29,24,.8)" stroke-width="8" paint-order="stroke">${txt}</text></g>`; };
  const top = CY - 360, bot = CY + 330;
  let s = '';
  s += L(A.normal[0] + 0.5, A.normal[1], 'JANTUNG', CX - 40, CY + 60, CX - 190, bot, '#E58A92');
  s += L(A.normal[0] + 1.6, A.normal[1], 'LAPISAN DALAM', CX + HRX * 0.72, CY - HRY * 0.72, CX + 210, top, '#F3C9BE');
  s += L(A.normal[0] + 2.8, A.normal[1], 'LAPISAN LUAR', CX - prx * 0.68, CY - pry * 0.68, CX - 220, top, '#E3A097');
  s += L(A.normal[0] + 3.6, A.normal[1] - 0.2, 'SEDIKIT CAIRAN', CX + prx * 0.7, CY + pry * 0.7, CX + 200, bot, '#F7E6A2');
  s += L(A.terkumpul[0] + 1.0, A.terkumpul[1] - 0.2, 'LAPISAN LUAR MEREGANG', CX + prx * 0.7, CY - pry * 0.7, CX + 130, top - 6, '#F8C038');
  s += L(A.terkumpul[0] + 2.4, A.terkumpul[1] - 0.2, 'CAIRAN BERTAMBAH', CX - prx * 0.7, CY + pry * 0.7, CX - 170, bot, '#F7E6A2');
  s += L(A.tekanan[0] + 1.6, A.tekanan[1] - 0.15, 'RUANG ISI TERBATAS', CX + 128, CY + 40, CX + 200, bot, '#FF8A7A');
  return s;
}

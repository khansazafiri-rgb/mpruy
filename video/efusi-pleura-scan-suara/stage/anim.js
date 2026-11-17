// Ilustrasi mekanisme efusi pleura (SKEMATIK, bukan citra pasien dan bukan rekaman produk): penampang samping (lateral) rongga dada kanan.
// Depan = kiri gambar, belakang = kanan gambar, kepala di atas (posisi tegak). Dua lapis pleura (dalam menempel paru, luar menempel dinding dada) dengan sedikit cairan di antaranya.
// Cairan = bagian ruang pleura di bawah garis air; garis air selalu tegak lurus gravitasi dunia, sehingga saat gambar diputar ke posisi terlentang cairan mengalir ke sisi belakang.
// Paru tidak pernah kolaps total: paru hanya kehilangan sebagian luasnya (±14%) di tempat cairan berada. Cairan tidak pernah berada di dalam paru. Satuan lokal 1000 x 900, pusat (500, 450).
import { f1, clamp, lerp, sm } from './core.js';
export const CX = 500, CY = 450;
const N = 220, RX = 300, RY = 335, FILM = 10;
// rongga dada: superellips dengan cekungan resesus kostofrenikus di belakang-bawah (kanan-bawah)
function cavityR(a) { const bulge = Math.exp(-Math.pow((a - 1.05) / 0.5, 2)); return 1 + 0.06 * bulge; }
function ringPts(rx, ry, inset = 0) {
  const pts = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), e = 2.5;
    const r = Math.pow(Math.pow(Math.abs(c), e) + Math.pow(Math.abs(s), e), -1 / e) * cavityR(a);
    pts.push([CX + c * (rx - inset) * r, CY + s * (ry - inset) * r]);
  }
  return pts;
}
const CAV = ringPts(RX, RY), INN = ringPts(RX, RY, FILM);
const area = (p) => { let s = 0; for (let i = 0; i < p.length; i++) { const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % p.length]; s += x1 * y2 - x2 * y1; } return Math.abs(s) / 2; };
const A_CAV = area(CAV), A_INN = area(INN);
// potong poligon dengan setengah bidang g·p >= L (keep = 'ge') atau <= L ('le')
function clipHP(poly, g, L, keep) {
  const sgn = keep === 'ge' ? 1 : -1, d = (p) => sgn * (g[0] * p[0] + g[1] * p[1] - L), out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], da = d(a), db = d(b);
    if (da >= 0) out.push(a);
    if ((da >= 0) !== (db >= 0)) { const u = da / (da - db); out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]); }
  }
  return out;
}
function chaikin(p, it = 2) { for (let k = 0; k < it; k++) { const q = []; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; q.push([0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]], [0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]]); } p = q; } return p; }
const path = (p) => 'M' + p.map((q) => f1(q[0]) + ' ' + f1(q[1])).join('L') + 'Z';
/** garis air (g·p >= L adalah cairan) sehingga luas cairan di bawah paru (di dalam INN) = v * A_INN */
function level(g, v) {
  if (v <= 0) return 1e9;
  let lo = -1000, hi = 1000;
  for (let i = 0; i < 28; i++) { const mid = (lo + hi) / 2, f = area(clipHP(INN, g, mid, 'ge')) / A_INN; if (f > v) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}
const win = (t, a, b, f = 0.3) => clamp((t - a) / f) * clamp((b - t) / f);
/** parameter waktu: theta (derajat, putaran searah jarum jam), v (luas cairan tambahan / luas paru) */
export function params(t, K) {
  const th = 90 * sm((t - (K.terlentang - 0.25)) / 1.9);
  const v = 0.15 * sm((t - (K.masuk - 0.1)) / (K.menumpuk + 0.4 - K.masuk));
  return { th, v };
}
const dotP = (a, b) => a[0] * b[0] + a[1] * b[1];
/** titik lokal -> koordinat kartu (relatif pusat kartu), untuk label */
export function toWorld(p, th, s) { const a = th * Math.PI / 180, c = Math.cos(a), sn = Math.sin(a), x = p[0] - CX, y = p[1] - CY; return [s * (x * c - y * sn), s * (x * sn + y * c)]; }
/** SVG ilustrasi di pusat (cx, cy) dengan skala s */
export function illus(t, K, o) {
  const { cx, cy, s } = o, { th, v } = params(t, K), a = th * Math.PI / 180;
  const g = [Math.sin(a), Math.cos(a)], L = level(g, v);                            // gravitasi dunia dalam koordinat lokal
  const fluid = v > 0 ? clipHP(CAV, g, L, 'ge') : [];
  const lungRaw = v > 0 ? clipHP(INN, g, L, 'le') : INN, lung = chaikin(lungRaw, v > 0 ? 3 : 1);
  const ar = win(t, K.terbentuk - 0.2, K.diserap + 1.0, 0.3), ar2 = win(t, K.masuk - 0.3, K.menumpuk + 0.2, 0.3);
  const sw = (w) => f1(w / s);
  let q = `<defs><linearGradient id="lung" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E9AFB0"/><stop offset="1" stop-color="#C9808C"/></linearGradient><linearGradient id="flu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9AD9F2"/><stop offset="1" stop-color="#5FB6E0"/></linearGradient><clipPath id="clipCav"><path d="${path(CAV)}"/></clipPath></defs>`;
  q += `<g transform="translate(${cx} ${cy}) scale(${s}) rotate(${f1(th)}) translate(${-CX} ${-CY})">`;
  // dinding dada (tulang rusuk digambar sebagai pita) di luar rongga
  const wall = ringPts(RX + 46, RY + 46);
  q += `<path d="${path(wall)}" fill="#C79B7A"/><path d="${path(wall)}" fill="none" stroke="#E7C9A8" stroke-width="3"/>`;
  for (let i = 0; i < 22; i++) { const k = Math.round(i * N / 22), p0 = ringPts(RX + 8, RY + 8)[k], p1 = ringPts(RX + 40, RY + 40)[k]; q += `<line x1="${f1(p0[0])}" y1="${f1(p0[1])}" x2="${f1(p1[0])}" y2="${f1(p1[1])}" stroke="#E8CDAF" stroke-width="7" stroke-linecap="round" opacity=".75"/>`; }
  // rongga pleura: latar sangat gelap lalu lapisan cairan film (di seluruh keliling) dan cairan tertimbun
  q += `<path d="${path(CAV)}" fill="#7FCBEA" opacity=".95"/>`;
  if (v > 0.001) q += `<path d="${path(fluid)}" fill="url(#flu)"/>`;
  // paru
  q += `<path d="${path(lung)}" fill="url(#lung)"/>`;
  // percabangan bronkus (garis halus di dalam paru) agar terbaca sebagai paru
  q += `<g clip-path="url(#clipCav)" opacity=".45" stroke="#F8DADA" stroke-width="5" fill="none" stroke-linecap="round"><path d="M${CX - 30} ${CY - 220}V${CY - 40}M${CX - 30} ${CY - 120}L${CX - 130} ${CY - 60}M${CX - 30} ${CY - 120}L${CX + 80} ${CY - 70}M${CX - 30} ${CY - 20}L${CX - 120} ${CY + 60}M${CX - 30} ${CY - 20}L${CX + 70} ${CY + 70}"/></g>`;
  // dua lapis pleura: luar (parietal) sepanjang dinding, dalam (viseral) sepanjang paru
  q += `<path d="${path(CAV)}" fill="none" stroke="#F6D4C8" stroke-width="${sw(6)}"/>`;
  q += `<path d="${path(lung)}" fill="none" stroke="#F6D4C8" stroke-width="${sw(5)}"/>`;
  // diafragma = pita otot di dasar rongga (sisi bawah pada posisi tegak): cairan menumpuk DI ATAS-nya
  const o1 = ringPts(RX, RY), o2 = ringPts(RX + 46, RY + 46), i0 = Math.round(N * 0.15), i1 = Math.round(N * 0.35);
  const seg = []; for (let i = i0; i <= i1; i++) seg.push(o1[i]); for (let i = i1; i >= i0; i--) seg.push(o2[i]);
  q += `<path d="${path(seg)}" fill="#B65A4F"/><path d="${path(seg)}" fill="none" stroke="#E0877A" stroke-width="3"/>`;
  q += `</g>`;
  // panah: pembentukan (besar, kuning) dan penyerapan (kecil, hijau) ke dan dari ruang pleura (digambar di sisi depan rongga, koordinat kartu)
  const P = (lx, ly) => { const [wx, wy] = toWorld([lx, ly], th, s); return [cx + wx, cy + wy]; };
  const arrow = (x, y, ang, len, col, w, al) => `<g opacity="${f1(al)}" transform="translate(${f1(x)} ${f1(y)}) rotate(${ang})"><path d="M0 ${-len}V${len * 0.4}M${-len * 0.45} ${-len * 0.1}L0 ${len * 0.55}L${len * 0.45} ${-len * 0.1}" stroke="${col}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>`;
  if (ar > 0.01 || ar2 > 0.01) {
    const big = Math.max(ar, ar2), inA = big, outA = Math.max(ar * win(t, K.diserap - 0.2, K.diserap + 1.4, 0.2), ar2 * win(t, K.berkurang - 0.2, K.menumpuk + 0.2, 0.2));
    const [a1x, a1y] = P(CX - RX - 135, CY - 60), [a2x, a2y] = P(CX - RX - 135, CY + 40), [b1x, b1y] = P(CX + RX + 135, CY - 80);
    const bw = 1 + 0.35 * ar2;
    q += arrow(a1x, a1y, th - 90, 44 * s * bw, '#F8C038', f1(12 * s), inA * win(t, K.terbentuk - 0.2, K.menumpuk + 0.2, 0.2)) + arrow(a2x, a2y, th - 90, 44 * s * bw, '#F8C038', f1(12 * s), inA * win(t, K.terbentuk - 0.2, K.menumpuk + 0.2, 0.2));
    q += arrow(b1x, b1y, th - 90, 34 * s, '#7CE0B8', f1(10 * s), outA * (1 - 0.5 * ar2));
  }
  return q;
}
/** Titik jangkar label dalam koordinat lokal */
/** kaca pembesar: lapisan dinding dada | pleura luar | sedikit cairan | pleura dalam | paru (skematik, tidak berskala). Koordinat kartu. */
export function magnifier(t, K, cx, cy, r, a) {
  if (a <= 0.01) return '';
  const H = (y0, y1, c) => `<rect x="${-r}" y="${y0}" width="${2 * r}" height="${y1 - y0}" fill="${c}"/>`;
  let q = `<g opacity="${f1(a)}"><defs><clipPath id="clipMag"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath></defs><g clip-path="url(#clipMag)"><g transform="translate(${cx} ${cy})">`;
  q += H(-r, -70, '#C79B7A') + H(-70, -62, '#F6D4C8') + H(-62, -22, '#7FCBEA') + H(-22, -14, '#F6D4C8') + H(-14, r, '#D99A9C');
  q += `<ellipse cx="-60" cy="-92" rx="80" ry="14" fill="#E8CDAF" opacity=".6"/><ellipse cx="70" cy="-100" rx="70" ry="12" fill="#E8CDAF" opacity=".6"/></g></g><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#F8C038" stroke-width="6"/>`;
  return q + '</g>';
}
export const MAG = { wall: -110, parietal: -66, fluid: -42, visceral: -18, lung: 70 };
export const ANCH = { paru: [CX - 40, CY - 40], sedikit: [CX - RX + 4, CY - 120], dinding: [CX - RX - 26, CY + 20], pleuraDalam: [CX - RX + FILM + 6, CY + 110], pleuraLuar: [CX - RX - 4, CY + 150], cairanBawah: [CX + 10, CY + RY * 0.84] };
export const geom = { RX, RY, FILM, CAV, INN, A_CAV, A_INN, level, clipHP, area, dotP };

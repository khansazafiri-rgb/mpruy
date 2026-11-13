// Alat dan unsur layar: pengukur tekanan (jarum + dua penanda), jejak bunyi stetoskop, label besar, jantung mini v7, kartu penutup.
import { buildSvg } from '../../v6/heart7.mjs';
import { FONT, MEREK } from '../tokens.mjs';
import { f1, clamp, lerp, seg, ease, mix } from '../tensi/util.mjs';
import { EV, K } from './waktu.mjs';
import { PS, PD, PMAKS, tAnim, tekananManset, tNyata, daftarKetukan, tekananArteri, T_BEAT, denyutAntara } from './fisika.mjs';
import { bintang } from '../latar.mjs';

const GADING = MEREK.gading, EMAS = MEREK.emas, TINTA = MEREK.tinta, MINT = '#7FE0C8';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const H7 = buildSvg({ layers: true, bg: false, id: 'jk' });
export const DEFS_JANTUNG = H7.defs;
const KETUKAN = daftarKetukan();

// ---------------------------------------------------------------- pengukur tekanan (tanpa angka)
export const SKALA = 300, ARC0 = 135, ARC = 270;
export const sudut = (P) => (ARC0 + ARC * clamp(P / SKALA)) * Math.PI / 180;
/** Pengukur aneroid. cx,cy,r; P tekanan skala; flags = {s:0..1, d:0..1} kemunculan penanda; getar = goyangan jarum kecil saat ketukan. */
export function pengukur(cx, cy, r, P, { s = 0, d = 0, getar = 0, tag = true, bayang = true, uid = 'pg', denyutS = 0, denyutD = 0 } = {}) {
  const pt = (a, rr) => [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr];
  let g = '';
  if (bayang) g += `<ellipse cx="${cx}" cy="${f1(cy + r * 0.08)}" rx="${f1(r * 1.08)}" ry="${f1(r * 1.08)}" fill="#000" opacity=".28" filter="url(#blur-pg)"/>`;
  g += `<circle cx="${cx}" cy="${cy}" r="${f1(r * 1.06)}" fill="url(#${uid}-ring)"/><circle cx="${cx}" cy="${cy}" r="${f1(r * 0.99)}" fill="#1A2A38"/><circle cx="${cx}" cy="${cy}" r="${f1(r * 0.94)}" fill="#F6F1E4"/>`;
  g += `<circle cx="${cx}" cy="${cy}" r="${f1(r * 0.94)}" fill="url(#${uid}-face)"/>`;
  // zona skala (tanpa angka): garis tipis tiap 10, tebal tiap 50
  for (let p = 0; p <= SKALA; p += 10) { const a = sudut(p), big = p % 50 === 0, [x1, y1] = pt(a, r * 0.86), [x2, y2] = pt(a, r * (big ? 0.7 : 0.78)); g += `<path d="M${f1(x1)} ${f1(y1)}L${f1(x2)} ${f1(y2)}" stroke="${TINTA}" stroke-width="${big ? 5 : 2.6}" stroke-linecap="round" opacity="${big ? 0.9 : 0.6}"/>`; }
  // busur penanda: dari penanda sistolik ke diastolik pada satu pengukur
  const arc = (p0, p1, rr, c, w, o) => { const a0 = sudut(p0), a1 = sudut(p1), [x0, y0] = pt(a0, rr), [x1, y1] = pt(a1, rr); return `<path d="M${f1(x0)} ${f1(y0)}A${f1(rr)} ${f1(rr)} 0 ${(a1 - a0) > Math.PI ? 1 : 0} 1 ${f1(x1)} ${f1(y1)}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" opacity="${o}"/>`; };
  const pS = PS - 1, pD = PD - 1;
  if (s > 0.01 && d > 0.01) g += arc(pD, pS, r * 0.6, '#1D7B75', 10, f1(0.35 * Math.min(s, d)));
  const penanda = (p, c, p01, nama, sisi, pul = 0) => {
    if (p01 < 0.01) return '';
    const a = sudut(p), [x0, y0] = pt(a, r * 0.98), [x1, y1] = pt(a, r * (0.66 + 0.0)), sc = 0.7 + 0.3 * ease.out(p01);
    let m = `<g opacity="${f1(clamp(p01 * 1.5))}"><path d="M${f1(x0)} ${f1(y0)}L${f1(x1)} ${f1(y1)}" stroke="${c}" stroke-width="9" stroke-linecap="round"/><circle cx="${f1(x1)}" cy="${f1(y1)}" r="${f1(11 * sc * (1 + 0.5 * pul))}" fill="${c}" stroke="${TINTA}" stroke-width="3"/>${pul > 0.02 ? `<circle cx="${f1(x1)}" cy="${f1(y1)}" r="${f1(24 + 26 * pul)}" fill="none" stroke="${c}" stroke-width="7" opacity="${f1(pul)}"/>` : ''}`;
    // bendera di luar bezel: segitiga + teks pendek
    const [fx, fy] = pt(a, r * 1.14), dx = Math.cos(a), dy = Math.sin(a), tx = fx + dx * 16 + (dx < 0 ? -2 : 2), ty = fy + dy * 16;
    if (tag) m += `<g transform="translate(${f1(tx)} ${f1(ty)})"><text text-anchor="${dx < -0.2 ? 'end' : dx > 0.2 ? 'start' : 'middle'}" dominant-baseline="middle" y="${dy < -0.5 ? -10 : 0}" font-family="${FONT}" font-weight="800" font-size="31" letter-spacing="1" fill="${c}" stroke="#06161A" stroke-width="7" paint-order="stroke">${nama}</text></g>`;
    return m + '</g>';
  };
  g += penanda(pS, EMAS, s, 'SISTOLIK', 0, denyutS) + penanda(pD, MINT, d, 'DIASTOLIK', 0, denyutD);
  // jarum
  const a = sudut(P + getar), [nx, ny] = pt(a, r * 0.8), [tx2, ty2] = pt(a + Math.PI, r * 0.18);
  g += `<path d="M${f1(tx2)} ${f1(ty2)}L${f1(nx)} ${f1(ny)}" stroke="#06161A" stroke-width="12" stroke-linecap="round" opacity=".25" transform="translate(4 6)"/><path d="M${f1(tx2)} ${f1(ty2)}L${f1(nx)} ${f1(ny)}" stroke="#C93A3A" stroke-width="9" stroke-linecap="round"/><path d="M${f1(cx)} ${f1(cy)}L${f1(nx)} ${f1(ny)}" stroke="#FF8A7A" stroke-width="3" stroke-linecap="round" opacity=".7"/>`;
  g += `<circle cx="${cx}" cy="${cy}" r="${f1(r * 0.085)}" fill="${EMAS}" stroke="${TINTA}" stroke-width="4"/><circle cx="${f1(cx - r * 0.02)}" cy="${f1(cy - r * 0.02)}" r="${f1(r * 0.03)}" fill="#fff" opacity=".55"/>`;
  // kaca: kilau
  g += `<path d="M${f1(cx - r * 0.7)} ${f1(cy - r * 0.45)}A${f1(r * 0.82)} ${f1(r * 0.82)} 0 0 1 ${f1(cx + r * 0.1)} ${f1(cy - r * 0.8)}" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" opacity=".18"/>`;
  return g;
}
export const defsPengukur = (uid = 'pg') => `<defs><linearGradient id="${uid}-ring" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F2F4F6"/><stop offset=".5" stop-color="#B7C0C9"/><stop offset="1" stop-color="#6D7885"/></linearGradient><radialGradient id="${uid}-face" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".7"/><stop offset="1" stop-color="#E4DCC6" stop-opacity=".0"/></radialGradient><filter id="blur-pg" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="14"/></filter></defs>`;

// ---------------------------------------------------------------- jejak bunyi stetoskop (garis gulung)
/** Jendela 4,4 dtk (waktu animasi); lonjakan = teredam sinus per ketukan terdengar. */
export function jejak(T, x0, y0, w, h, p = 1) {
  if (p < 0.02) return '';
  const Ta = tAnim(T), kecep = w / 4.6, mid = y0 + h / 2;
  const jb = (e) => ({ ta: tAnim(e.t), a: e.a });
  let pts = [];
  const nS = 240; for (let i = 0; i <= nS; i++) {
    const x = x0 + 70 + (w - 90) * i / nS, ta = Ta - (x0 + w - 20 - x) / kecep; let y = 0;
    for (const e of KETUKAN) { if (e.jenis === 'ringkas' && T < 39.5) continue; const dt = ta - tAnim(e.t); if (dt > -0.02 && dt < 0.34) y += e.a * Math.sin(dt * 2 * Math.PI * 21) * Math.exp(-dt / 0.07) * (h * 0.4); }
    pts.push([x, mid - y]);
  }
  const live = KETUKAN.some((e) => { const dt = Ta - tAnim(e.t); return dt >= 0 && dt < 0.2 && !(e.jenis === 'ringkas' && T < 39.5); });
  let s = `<g opacity="${f1(p)}"><rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="${h / 2}" fill="#06161A" opacity=".72"/><rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="${h / 2}" fill="none" stroke="${GADING}" stroke-opacity=".18" stroke-width="2"/>`;
  // ikon pendengaran: kepala stetoskop + gelombang kecil
  const ix = x0 + 40, iy = mid;
  s += `<circle cx="${ix}" cy="${iy}" r="17" fill="none" stroke="${GADING}" stroke-width="4" opacity=".85"/><circle cx="${ix}" cy="${iy}" r="6" fill="${GADING}" opacity=".85"/>`;
  for (let j = 1; j <= 2; j++) s += `<path d="M${ix + 17 + j * 8} ${iy - 8 - j * 3}Q${ix + 24 + j * 10} ${iy} ${ix + 17 + j * 8} ${iy + 8 + j * 3}" fill="none" stroke="${EMAS}" stroke-width="3.4" stroke-linecap="round" opacity="${live ? 0.95 : 0.3}"/>`;
  s += `<path d="M${x0 + 70} ${mid}H${x0 + w - 20}" stroke="${GADING}" stroke-opacity=".2" stroke-width="2" stroke-dasharray="3 9"/>`;
  s += `<path d="M${pts.map((q) => `${f1(q[0])} ${f1(q[1])}`).join('L')}" fill="none" stroke="${EMAS}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`;
  s += `<circle cx="${x0 + w - 20}" cy="${f1(pts[pts.length - 1][1])}" r="7" fill="${EMAS}" stroke="${TINTA}" stroke-width="2.4"/></g>`;
  return s;
}

// ---------------------------------------------------------------- label besar
export function labelBesar(teks, warna, p, y, { ukuran = 56 } = {}) {
  if (p < 0.01) return '';
  const w = 150 + teks.length * ukuran * 0.62, h = ukuran + 50, x = 540 - w / 2, dy = (1 - ease.out(p)) * 26;
  return `<g opacity="${f1(clamp(p * 1.6))}" transform="translate(0 ${f1(dy)})"><rect x="${f1(x)}" y="${y + 8}" width="${f1(w)}" height="${h}" rx="${h / 2}" fill="#000" opacity=".32"/><rect x="${f1(x)}" y="${y}" width="${f1(w)}" height="${h}" rx="${h / 2}" fill="${GADING}"/><rect x="${f1(x)}" y="${y}" width="${f1(w)}" height="${h}" rx="${h / 2}" fill="none" stroke="${warna}" stroke-width="6"/>`
    + `<circle cx="${f1(x + 46)}" cy="${y + h / 2}" r="15" fill="${warna}" stroke="${TINTA}" stroke-width="3"/><text x="${f1(540 + 24)}" y="${f1(y + h / 2 + ukuran * 0.36)}" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="${ukuran}" fill="${TINTA}">${esc(teks)}</text></g>`;
}
/** Pertanyaan pembuka (teks hanya untuk pertanyaan, dua pembacaan). */
export function pertanyaan(p) {
  if (p < 0.01) return '';
  const t = 'BUNYI INI DARI MANA?', w = 150 + t.length * 36, x = 540 - w / 2, y = 292, h = 120, dy = (1 - ease.out(p)) * 30;
  return `<g opacity="${f1(clamp(p * 1.6))}" transform="translate(0 ${f1(dy)})"><rect x="${f1(x)}" y="${y + 10}" width="${f1(w)}" height="${h}" rx="${h / 2}" fill="#000" opacity=".32"/><rect x="${f1(x)}" y="${y}" width="${f1(w)}" height="${h}" rx="${h / 2}" fill="${EMAS}"/><rect x="${f1(x)}" y="${y}" width="${f1(w)}" height="${h}" rx="${h / 2}" fill="none" stroke="${TINTA}" stroke-opacity=".5" stroke-width="4"/>`
    + `<text x="540" y="${y + h / 2 + 24}" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="66" fill="${TINTA}">${t}</text></g>`;
}

// ---------------------------------------------------------------- jantung mini v7 (tidak diubah) + denyut
export function jantungMini(T, cx, cy, k = 0.3) {
  const Ta = tAnim(T);
  // denyut jantung tiba di manset DAHULU 0,95 dtk sebelumnya (waktu rambat) — jantung berdenyut lebih awal daripada gelombang di lengan
  let sist = 0; for (const tb of denyutAntara(Ta - 2, Ta + 2)) { const th = tb - 0.95; sist = Math.max(sist, Math.exp(-Math.pow((Ta - th - 0.12) / 0.11, 2))); }
  const tw = [350, 600], sy = 1 - 0.06 * sist, sx = 1 - 0.025 * sist, tfBody = `translate(${tw[0]} ${tw[1]}) scale(${sx.toFixed(4)} ${sy.toFixed(4)}) translate(${-tw[0]} ${-tw[1]})`;
  return `<g transform="translate(${cx} ${cy}) scale(${k}) translate(-290 -765)"><g>${H7.back}</g><g transform="${tfBody}">${H7.body}</g><g>${H7.trunk}</g><g transform="${tfBody}">${H7.hi}</g></g>`;
}
export { H7 };

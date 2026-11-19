// Aset gambar termometer klinis air raksa (kode murni: angka -> SVG datar). SATU geometri dipakai di semua adegan (tampak luar, penampang, ikon kecil):
// wadah merkuri (bulb) di ujung bawah, saluran kaca sangat sempit ke atas, PENYEMPITAN tepat di atas wadah, skala di sisi KANAN saluran.
// Koordinat model: x ke kanan, d = jarak ke atas dari ujung bawah wadah (px model). SVG memakai y = -d. Saluran dan penyempitan DIGAMBAR DIPERBESAR dari ukuran asli.
import { f1, clamp, lerp, sm, eo, eio, R, C, P, T, G, FONT, rndf } from './lib.js';

export const GEO = {
  W: 30, BW: 36, top: 1240, bulbTop: 150,           // setengah lebar badan kaca, setengah lebar wadah, ujung atas, bahu wadah
  boreHW: 5, bulbIn: 24,                            // setengah lebar saluran dalam (sempit) dan rongga wadah
  consLo: 172, consHi: 214, consHW: 2.0, cutAt: 182, // penyempitan (rentang d) dan titik putus kolom saat dingin
  d35: 300, perC: 110,                              // posisi 35 °C pada skala dan jarak per 1 °C (satu garis kecil = 0,1 °C = 11 px model)
};
export const dOf = (Tc) => GEO.d35 + GEO.perC * (Tc - 35);
export const tOf = (d) => 35 + (d - GEO.d35) / GEO.perC;
const Y = (d) => f1(-d);

// bentuk luar kaca (wadah sedikit lebih lebar dari badan)
const outerPath = () => { const { W, BW, top, bulbTop } = GEO; return `M${-W} ${Y(top - W)}A${W} ${W} 0 0 1 ${W} ${Y(top - W)}L${W} ${Y(bulbTop + 46)}C${W} ${Y(bulbTop + 18)} ${BW} ${Y(bulbTop + 10)} ${BW} ${Y(bulbTop - 14)}L${BW} ${Y(BW)}A${BW} ${BW} 0 0 1 ${-BW} ${Y(BW)}L${-BW} ${Y(bulbTop - 14)}C${-BW} ${Y(bulbTop + 10)} ${-W} ${Y(bulbTop + 18)} ${-W} ${Y(bulbTop + 46)}Z`; };
// rongga dalam: wadah lebar -> corong -> saluran sempit (dengan penyempitan) -> ujung atas
const borePath = () => {
  const { boreHW: h, bulbIn: b, consLo, consHi, consHW: c, top } = GEO, m = (consLo + consHi) / 2;
  const left = [[-b, 36], [-b, 126], [-b * 0.7, 150], [-h, 164], [-h, consLo], [-c, consLo + 14], [-c, consHi - 14], [-h, consHi], [-h, top - 40]];
  const right = left.map(([x, d]) => [-x, d]).reverse();
  let d = `M${left[0][0]} ${Y(left[0][1])}`;
  for (let i = 1; i < left.length; i++) d += `L${left[i][0]} ${Y(left[i][1])}`;
  d += `A${h} ${h} 0 0 1 ${h} ${Y(top - 40)}`;
  for (let i = 1; i < right.length; i++) d += `L${right[i][0]} ${Y(right[i][1])}`;
  return d + `A${b} ${b} 0 0 1 ${-b} ${Y(36)}Z`;
};
export const OUTER = outerPath(), BORE = borePath();

/** Termometer lengkap. s = { dUp (ujung kolom atas), dLow (ujung atas merkuri bawah; >= cutAt berarti menyambung), cut (0..1 penampang), heat (-1 dingin .. 1 hangat), exp (0..1 pemuaian), t, z (zoom, untuk garis skala), dark, ink, uid, scale, extra } */
export function thermo(s = {}) {
  const { dUp = dOf(37.5), dLow = 9999, cut = 0, heat = 0, exp = 0, t = 0, z = 1, dark = true, uid = 'a', scale = true, ink = dark ? '#F4F7F8' : '#172B38', ghost = 0 } = s;
  const G_ = GEO, cont = dLow >= G_.cutAt - 0.01, lowTop = cont ? dUp : Math.min(dLow, G_.cutAt - 1), lowBase = 10;
  const glassFill = dark ? 'rgba(206,236,242,' : 'rgba(255,255,255,', gA = lerp(dark ? 0.30 : 0.62, dark ? 0.16 : 0.34, cut);
  const id = (n) => `${n}${uid}`;
  let o = `<defs><clipPath id="${id('bc')}"><path d="${BORE}"/></clipPath>`
    + `<linearGradient id="${id('gb')}" gradientUnits="userSpaceOnUse" x1="${-G_.bulbIn}" x2="${G_.bulbIn}" y1="0" y2="0"><stop offset="0" stop-color="#7F93A2"/><stop offset=".2" stop-color="#D9E4EA"/><stop offset=".42" stop-color="#FFFFFF"/><stop offset=".72" stop-color="#BCCAD5"/><stop offset="1" stop-color="#7D91A1"/></linearGradient>`
    + `<linearGradient id="${id('gt')}" gradientUnits="userSpaceOnUse" x1="${-G_.boreHW}" x2="${G_.boreHW}" y1="0" y2="0"><stop offset="0" stop-color="#8296A5"/><stop offset=".3" stop-color="#E4EDF2"/><stop offset=".5" stop-color="#FFFFFF"/><stop offset=".78" stop-color="#B9C7D2"/><stop offset="1" stop-color="#7E93A3"/></linearGradient>`
    + `<radialGradient id="${id('hg')}"><stop offset="0" stop-color="#FF8A5C" stop-opacity=".85"/><stop offset=".55" stop-color="#F2735E" stop-opacity=".35"/><stop offset="1" stop-color="#F2735E" stop-opacity="0"/></radialGradient>`
    + `<radialGradient id="${id('cg')}"><stop offset="0" stop-color="#7FD3F0" stop-opacity=".7"/><stop offset=".6" stop-color="#7FD3F0" stop-opacity=".25"/><stop offset="1" stop-color="#7FD3F0" stop-opacity="0"/></radialGradient></defs>`;
  // aura panas / dingin (warna = ilustrasi suhu, bukan warna merkuri)
  if (heat > 0.02) o += `<circle cx="0" cy="${Y(78)}" r="${f1(70 + 120 * heat)}" fill="url(#${id('hg')})" opacity="${f1(Math.min(1, heat * 1.2) * 100) / 100}"/>`;
  if (heat < -0.02) o += `<circle cx="0" cy="${Y(78)}" r="${f1(70 + 90 * -heat)}" fill="url(#${id('cg')})" opacity="${f1(-heat * 100) / 100}"/>`;
  // kaca
  o += `<path d="${OUTER}" fill="${glassFill}${f1(gA * 100) / 100})" stroke="${dark ? '#CDEFF3' : '#7FBFC8'}" stroke-width="3" stroke-linejoin="round"/>`;
  o += `<path d="${BORE}" fill="${dark ? '#0D2230' : '#E3EDF1'}" opacity="${f1((dark ? 0.35 + 0.65 * cut : 1) * 100) / 100}"/>`;
  o += `<path d="${BORE}" fill="none" stroke="${dark ? 'rgba(220,244,248,.8)' : 'rgba(80,140,150,.7)'}" stroke-width="${f1(1.3 + 0.9 * cut)}" stroke-linejoin="round"/>`;
  // merkuri (perak) di dalam rongga
  let m = '';
  m += `<rect x="-30" y="${Y(Math.min(lowTop, 168))}" width="60" height="${f1(Math.max(0, Math.min(lowTop, 168) - lowBase))}" fill="url(#${id('gb')})"/>`;
  if (!dark) { if (lowTop > 168) m += `<rect x="-7.2" y="${Y(lowTop + 1)}" width="14.4" height="${f1(lowTop - 167)}" fill="#4C6577"/>`; if (!cont) m += `<rect x="-7.2" y="${Y(dUp + 1)}" width="14.4" height="${f1(Math.max(0, dUp - G_.cutAt) + 2)}" fill="#4C6577"/>`; m += `<circle cx="0" cy="${Y(dUp - 1)}" r="${G_.boreHW + 1.6}" fill="#4C6577"/>`; }
  if (lowTop > 168) m += `<rect x="-6" y="${Y(lowTop)}" width="12" height="${f1(lowTop - 168)}" fill="url(#${id('gt')})"/>`;
  if (!cont) m += `<rect x="-6" y="${Y(dUp)}" width="12" height="${f1(Math.max(0, dUp - G_.cutAt))}" fill="url(#${id('gt')})"/>`;
  if (cont) { /* satu kolom menyambung */ }
  // ujung kolom (meniskus bulat) dan ujung bawah kolom atas bila terputus
  m += `<circle cx="0" cy="${Y(dUp - 1)}" r="${G_.boreHW}" fill="url(#${id('gt')})"/>`;
  if (!cont) { m += `<circle cx="0" cy="${Y(G_.cutAt)}" r="${G_.boreHW * 0.9}" fill="url(#${id('gt')})"/>`; m += `<circle cx="0" cy="${Y(lowTop)}" r="${G_.boreHW * 0.9}" fill="url(#${id('gt')})"/>`; }
  // kilau perak yang meluncur pelan sepanjang kolom (tanda hidup, tidak mengubah posisi ujung)
  if (s.t !== undefined) { const L0 = Math.max(0, dUp - G_.cutAt), ph = ((t * 0.4) % 1); const gd = (cont ? 168 : G_.cutAt) + ph * Math.max(10, (cont ? dUp - 168 : L0)); m += `<ellipse cx="-1.5" cy="${Y(gd)}" rx="1.6" ry="9" fill="#fff" opacity="${f1(Math.sin(ph * Math.PI) * 0.9 * 100) / 100}"/>`; }
  // kilau di wadah
  m += `<rect x="-14" y="${Y(128)}" width="6" height="${f1(88)}" rx="3" fill="#fff" opacity=".75"/>`;
  o += `<g clip-path="url(#${id('bc')})">${m}</g>`;
  // titik-titik atom (ilustrasi): makin hangat makin renggang dan bergetar
  o += atoms(t, Math.max(exp, 0.06), id);
  // kilau kaca di tepi kiri
  o += `<path d="M${-G_.W + 5} ${Y(G_.top - 50)}L${-G_.W + 5} ${Y(G_.bulbTop + 60)}" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity="${dark ? 0.45 : 0.8}"/>`;
  o += `<path d="M${-G_.BW + 6} ${Y(G_.bulbTop - 30)}L${-G_.BW + 6} ${Y(60)}" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity="${dark ? 0.4 : 0.7}"/>`;
  if (scale) o += scaleSvg(z, ink);
  return o;
}
function atoms(t, exp, id) {
  let a = '';
  for (let n = 0; n < 24; n++) {
    const bx = (rndf(n * 3 + 1) - 0.5) * 38, bd = 26 + rndf(n * 3 + 2) * 100, k = 1 + exp * 0.55, jit = 1 + exp * 3.4;
    const x = bx * (1 + exp * 0.12) + Math.sin(t * (2.5 + rndf(n) * 3) + n) * jit, d = bd * (1 + exp * 0.1) + Math.cos(t * (2.5 + rndf(n + 9) * 3) + n * 1.7) * jit;
    if (Math.abs(x) > 19 || d > 126 || d < 20) continue;
    a += `<circle cx="${f1(x)}" cy="${Y(d)}" r="${f1((1.6 + rndf(n + 4) * 1.4) * k)}" fill="#4F6A7E" opacity="${f1(0.28 + 0.3 * exp)}"/>`;
  }
  return `<g clip-path="url(#${id('bc')})">${a}</g>`;
}
/** garis skala 35-42 °C di sisi kanan saluran + angka di luar kaca. z = zoom kamera (garis kecil hanya muncul saat cukup besar). */
export function scaleSvg(z = 1, ink = '#F4F7F8') {
  const { d35, perC, W } = GEO; let o = '';
  const tenth = clamp((z - 0.55) / 0.3), half = clamp((z - 0.3) / 0.2);
  for (let i = 0; i <= 70; i++) {
    const d = d35 + i * perC / 10, whole = i % 10 === 0, hf = i % 5 === 0;
    if (!whole && !hf && tenth < 0.02) continue; if (hf && !whole && half < 0.02) continue;
    const len = whole ? 20 : hf ? 14 : 8, op = whole ? 1 : hf ? half : tenth;
    o += `<path d="M${W - 2 - len} ${Y(d)}H${W - 2}" stroke="${ink}" stroke-width="${whole ? 3.2 : 2}" stroke-linecap="round" opacity="${f1(op * 100) / 100}"/>`;
    if (whole) o += `<text x="${W + 16}" y="${f1(-d + 13)}" font-family="${FONT}" font-weight="800" font-size="38" fill="${ink}">${35 + i / 10}</text>`;
  }
  return o + `<text x="${W + 16}" y="${Y(d35 + perC * 7.55)}" font-family="${FONT}" font-weight="800" font-size="30" fill="${ink}" opacity=".85">°C</text>`;
}

/** peta kamera: model (x, d) -> layar. cam = { cx, cy: titik layar untuk (mx, md); mx, md; z; rot (derajat) } */
export function proj(cam, x, d) {
  const a = (cam.rot || 0) * Math.PI / 180, dx = (x - (cam.mx || 0)) * cam.z, dy = -(d - cam.md) * cam.z;
  return [cam.cx + dx * Math.cos(a) - dy * Math.sin(a), cam.cy + dx * Math.sin(a) + dy * Math.cos(a)];
}
export const camT = (c) => `translate(${f1(c.cx)} ${f1(c.cy)}) rotate(${f1(c.rot || 0)}) scale(${f1(c.z * 1000) / 1000}) translate(${f1(-(c.mx || 0))} ${f1(c.md)})`;

// ----------------------------------------------------------------- alat dan ikon lain
export const SKIN = '#F7BC8E', SKIN_D = '#EAA676';
/** termometer digital bebas merkuri: badan krem, layar angka, tombol, ujung sensor logam */
export function digital(x, y, s = 1, { val = '36,8', beep = 0, rot = 0, o = 1 } = {}) {
  return `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${rot}) scale(${s})" opacity="${o}"><rect x="-26" y="-250" width="52" height="64" rx="26" fill="#9FB1BC" stroke="#172B38" stroke-width="5"/>`
    + `<rect x="-34" y="-212" width="68" height="330" rx="34" fill="#F4EBD8" stroke="#172B38" stroke-width="6"/>`
    + `<rect x="-24" y="-180" width="48" height="26" rx="8" fill="#E5D9BC"/>`
    + `<rect x="-26" y="-130" width="52" height="82" rx="10" fill="#B8D8C6" stroke="#172B38" stroke-width="4"/>`
    + `<text x="0" y="-74" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="${val.length > 4 ? 22 : 25}" fill="#0A3830">${val}</text>`
    + `<circle cx="0" cy="-8" r="15" fill="#F8C038" stroke="#172B38" stroke-width="4"/>`
    + (beep > 0.02 ? `<g opacity="${beep}" stroke="#F8C038" stroke-width="5" stroke-linecap="round" fill="none"><path d="M46 -20Q60 -8 46 4"/><path d="M58 -30Q80 -8 58 14"/></g>` : '') + `</g>`;
}
export const warnTri = (x, y, s = 1, o = 1) => `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})" opacity="${o}"><path d="M0 -46L50 38H-50Z" fill="#F8C038" stroke="#172B38" stroke-width="7" stroke-linejoin="round"/><path d="M0 -14V12" stroke="#172B38" stroke-width="9" stroke-linecap="round"/><circle cx="0" cy="26" r="5.5" fill="#172B38"/></g>`;
export const arrowD = (x, y, len, col, w = 8, dir = 'up', o = 1) => { const s = dir === 'up' ? -1 : 1; return `<g opacity="${o}" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" fill="none"><path d="M${f1(x)} ${f1(y)}V${f1(y + s * len)}M${f1(x - w * 1.5)} ${f1(y + s * (len - w * 1.6))}L${f1(x)} ${f1(y + s * len)}L${f1(x + w * 1.5)} ${f1(y + s * (len - w * 1.6))}"/></g>`; };

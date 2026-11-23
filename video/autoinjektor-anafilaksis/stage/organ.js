// Panel organ (ilustrasi): pembuluh darah (koral), jalan napas (biru tua), jantung; dipakai bersama di adegan akibat (16-26 dtk) dan efek adrenalin (35-48 dtk) agar orientasi dan warna konsisten.
// Peta warna tetap: alergen hijau | mediator imun ungu | pembuluh koral | jalan napas biru tua | adrenalin emas | alfa oranye | beta 2 sian | beta 1 magenta.
import { f1, clamp, lerp, R, T, GOLD, INK, rndf } from './lib.js';
export const CL = { alg: '#7BC043', med: '#8E6BFF', ves: '#F2685B', vesD: '#B5413A', blood: '#A52F33', rbc: '#E0524B', plasma: '#9AD1F5', air: '#1D4E89', airL: '#3C78B8', lumen: '#D6EDFA', musc: '#C9774B', adr: '#FFC93C', alfa: '#FF8A3D', b2: '#2EC4B6', b1: '#E0408F', panel: '#0D2733', edge: 'rgba(255,255,255,.28)' };
const sm = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
export const ease = sm;
const mod = (a, n) => ((a % n) + n) % n;
export function frame(x, y, w, h, title, col, o = {}) {
  const dim = o.dim ?? 1;
  return `<g opacity="${f1(dim * 100) / 100}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="32" fill="${CL.panel}" stroke="${o.on ? col : CL.edge}" stroke-width="${o.on ? 9 : 4}"/><rect x="${x + 24}" y="${y + 18}" width="${f1(title.length * 21 + 50)}" height="52" rx="26" fill="${col}"/><text x="${x + 44}" y="${y + 55}" font-family="'Plus Jakarta Sans'" font-weight="800" font-size="30" fill="#fff" ${o.dark ? `fill-opacity="1"` : ''}>${title}</text></g>`;
}
const bar = (x, y, w, h, v, col, label) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${w / 2}" fill="rgba(255,255,255,.14)"/><rect x="${x}" y="${f1(y + h * (1 - v))}" width="${w}" height="${f1(h * v)}" rx="${w / 2}" fill="${col}"/><text x="${x + w / 2}" y="${y + h + 34}" text-anchor="middle" font-family="'Plus Jakarta Sans'" font-weight="800" font-size="27" fill="#CFE8E2">${label}</text>`;
/** pembuluh (memanjang, aliran kiri -> kanan). d: -0.3..1 (pelebaran; negatif = menyempit), leak 0..1, bp 0..1, adr 0..1 (partikel emas), t detik */
export function vessel(x, y, w, h, o = {}) {
  const d = o.d ?? 0, leak = o.leak ?? 0, t = o.t ?? 0, cy = y + h * 0.58, hh = 34 + 56 * d, wall = 28, X0 = x + 30, X1 = x + w - 210;
  let s = `<clipPath id="cv${o.id ?? 0}"><rect x="${x + 6}" y="${y + 80}" width="${w - 12}" height="${h - 90}"/></clipPath><g clip-path="url(#cv${o.id ?? 0})">`;
  s += `<rect x="${X0}" y="${f1(cy - hh - wall)}" width="${X1 - X0}" height="${f1(2 * (hh + wall))}" fill="${CL.blood}"/>`;
  // dinding: sel endotel dengan celah yang melebar saat bocor
  const n = 14, seg = (X1 - X0) / n, gap = 4 + 26 * leak;
  for (let i = 0; i < n; i++) { const a = X0 + i * seg + gap / 2, ww = seg - gap; s += `<rect x="${f1(a)}" y="${f1(cy - hh - wall)}" width="${f1(ww)}" height="${wall}" rx="10" fill="${CL.ves}" stroke="${CL.vesD}" stroke-width="3"/><rect x="${f1(a)}" y="${f1(cy + hh)}" width="${f1(ww)}" height="${wall}" rx="10" fill="${CL.ves}" stroke="${CL.vesD}" stroke-width="3"/>`; }
  // sel darah merah mengalir
  const sp = 120, lane = (j) => cy + (rndf(j * 3.1) - 0.5) * (hh * 1.2);
  for (let j = 0; j < 9; j++) { const xx = X0 + mod(j * 130 + t * sp * (1 - 0.2 * d), X1 - X0 + 60) - 30; if (xx < X0 - 10 || xx > X1 + 10) continue; s += `<ellipse cx="${f1(xx)}" cy="${f1(lane(j))}" rx="26" ry="${f1(Math.min(18, hh * 0.45))}" fill="${CL.rbc}"/><ellipse cx="${f1(xx)}" cy="${f1(lane(j))}" rx="10" ry="6" fill="${CL.blood}" opacity=".6"/>`; }
  // plasma bocor melalui celah
  if (leak > 0.03) for (let j = 0; j < 22; j++) { const gx = X0 + (j % n + 0.5) * seg, up = j % 2 === 0, ph = mod(t * 0.7 + rndf(j) , 1), dist = ph * (30 + 70 * leak), a = Math.sin(ph * Math.PI) * leak; const yy = up ? cy - hh - wall - dist : cy + hh + wall + dist; s += `<circle cx="${f1(gx + (rndf(j + 4) - 0.5) * 20)}" cy="${f1(yy)}" r="${f1(8 + 5 * leak)}" fill="${CL.plasma}" opacity="${f1(a * 0.95)}"/>`; }
  // adrenalin emas (di lumen) dan reseptor alfa pada dinding
  if ((o.adr ?? 0) > 0) for (let j = 0; j < 6; j++) { const xx = X0 + mod(j * 150 + t * 150, X1 - X0 + 40) - 20, yy = cy + (rndf(j + 9) - 0.5) * hh; s += `<circle cx="${f1(xx)}" cy="${f1(yy)}" r="9" fill="${CL.adr}" stroke="${INK}" stroke-width="3" opacity="${f1(o.adr)}"/>`; }
  if (o.rec != null) for (let j = 0; j < 5; j++) { const xx = X0 + 90 + j * 140; s += receptor(xx, cy - hh - wall, 180, o.rec, CL.alfa) + receptor(xx, cy + hh + wall, 0, o.rec, CL.alfa); }
  s += `</g>`;
  s += bar(x + w - 150, y + 100, 44, h - 190, clamp(o.bp ?? 1), CL.ves, 'TEKANAN');
  s += `<text x="${x + w - 128}" y="${y + h - 14}" text-anchor="middle" font-family="'Plus Jakarta Sans'" font-weight="800" font-size="27" fill="#CFE8E2">DARAH</text>`;
  return s;
}
/** reseptor: soket kecil pada dinding; fill emas = adrenalin menempel (k 0..1) */
export function receptor(x, y, rot, k, col) {
  return `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${rot})"><path d="M-13 0L-13 -22Q0 -34 13 -22L13 0Z" fill="${k > 0.5 ? CL.adr : 'none'}" fill-opacity="${f1(clamp(k) * 100) / 100}" stroke="${col}" stroke-width="5"/></g>`;
}
/** jalan napas (potongan melintang). swell 0..1, contract 0..1, flow 0..1 -> bar; rec/adr untuk beta 2 */
export function airway(x, y, w, h, o = {}) {
  const sw = o.swell ?? 0, ct = o.contract ?? 0, t = o.t ?? 0, cx = x + w * 0.34, cy = y + h * 0.58, Ro = 150;
  const Rm = Ro - 26 * ct, tm = 22 + 20 * ct, Rin = Rm - tm, mu = 26 + 56 * sw + 8 * ct, r = Math.max(14, Rin - mu);
  let s = `<circle cx="${cx}" cy="${cy}" r="${f1(Rm)}" fill="${CL.musc}"/><circle cx="${cx}" cy="${cy}" r="${f1(Rin)}" fill="${CL.air}"/><circle cx="${cx}" cy="${cy}" r="${f1(Rin - mu + 14)}" fill="${CL.airL}"/><circle cx="${cx}" cy="${cy}" r="${f1(r)}" fill="${CL.lumen}"/>`;
  // alur otot melingkar (garis otot) memberi kesan kontraksi
  for (let i = 0; i < 12; i++) { const a = i * 30 * Math.PI / 180 + 0.2, r0 = Rm - tm, r1 = Rm; s += `<path d="M${f1(cx + Math.cos(a) * r0)} ${f1(cy + Math.sin(a) * r0)}L${f1(cx + Math.cos(a) * r1)} ${f1(cy + Math.sin(a) * r1)}" stroke="#A85B33" stroke-width="5" opacity="${f1(0.4 + 0.5 * ct)}"/>`; }
  // aliran udara: panah masuk ke lumen
  const fl = (r / (Rin - 26)); for (let i = 0; i < 3; i++) { const ph = mod(t * 0.9 + i / 3, 1); s += `<circle cx="${f1(cx + (i - 1) * r * 0.45)}" cy="${f1(cy)}" r="${f1(Math.max(3, r * 0.14))}" fill="#fff" opacity="${f1(Math.sin(ph * Math.PI) * 0.9)}"/>`; }
  if ((o.adr ?? 0) > 0) for (let j = 0; j < 6; j++) { const a = j * 60 * Math.PI / 180 + t * 0.6; s += `<circle cx="${f1(cx + Math.cos(a) * (Ro + 22))}" cy="${f1(cy + Math.sin(a) * (Ro + 22))}" r="9" fill="${CL.adr}" stroke="${INK}" stroke-width="3" opacity="${f1(o.adr)}"/>`; }
  if (o.rec != null) for (let j = 0; j < 6; j++) { const a = (j * 60 + 20) * Math.PI / 180; s += receptor(cx + Math.cos(a) * (Rm + 2), cy + Math.sin(a) * (Rm + 2), a * 180 / Math.PI + 90, o.rec, CL.b2); }
  s += `<text x="${cx}" y="${y + h - 14}" text-anchor="middle" font-family="'Plus Jakarta Sans'" font-weight="800" font-size="27" fill="#CFE8E2">potongan melintang</text>`;
  s += bar(x + w - 150, y + 100, 44, h - 190, clamp(fl * fl * 1.05), '#7FD1F5', 'ALIRAN');
  s += `<text x="${x + w - 128}" y="${y + h - 14}" text-anchor="middle" font-family="'Plus Jakarta Sans'" font-weight="800" font-size="27" fill="#CFE8E2">UDARA</text>`;
  s += `<g font-family="'Plus Jakarta Sans'" font-weight="800" font-size="26"><text x="${f1(cx + Ro + 32)}" y="${f1(cy - 40)}" fill="${CL.musc}">otot</text><text x="${f1(cx + Ro + 32)}" y="${f1(cy + 2)}" fill="${CL.airL}">dinding</text><text x="${f1(cx + Ro + 32)}" y="${f1(cy + 40)}" fill="#D6EDFA">rongga</text></g>`;
  return s;
}
/** jantung (skematis) dengan denyut; a = kekuatan denyut 0..1, rec 0..1 untuk reseptor beta 1, adr 0..1 */
export function heart(x, y, w, h, o = {}) {
  const a = o.a ?? 0.3, t = o.t ?? 0, rate = o.rate ?? 1.2, ph = mod(t * rate, 1), pulse = Math.exp(-ph * 6) * Math.sin(ph * Math.PI * 1.4 + 0.4), k = 1 + (0.035 + 0.10 * a) * pulse * 2.2, cx = x + w * 0.34, cy = y + h * 0.58;
  let s = `<g transform="translate(${cx} ${cy}) scale(${f1(k * 1000) / 1000}) scale(1.5)"><path d="M0 92C-130 10 -118 -78 -58 -88C-22 -94 0 -66 0 -52C0 -66 22 -94 58 -88C118 -78 130 10 0 92Z" fill="${CL.b1}" stroke="#7A1E4B" stroke-width="6"/><path d="M-44 -50Q-72 -40 -70 -6" stroke="#fff" stroke-width="9" fill="none" stroke-linecap="round" opacity=".45"/></g>`;
  // ring kontraksi (kekuatan)
  s += `<circle cx="${cx}" cy="${cy}" r="${f1(150 + 60 * pulse * (0.4 + a))}" fill="none" stroke="${CL.b1}" stroke-width="${f1(3 + 6 * a)}" opacity="${f1(Math.max(0, pulse) * 0.7)}"/>`;
  if ((o.adr ?? 0) > 0) for (let j = 0; j < 6; j++) { const aa = j * 60 * Math.PI / 180 + t * 0.5; s += `<circle cx="${f1(cx + Math.cos(aa) * 185)}" cy="${f1(cy + Math.sin(aa) * 165)}" r="9" fill="${CL.adr}" stroke="${INK}" stroke-width="3" opacity="${f1(o.adr)}"/>`; }
  if (o.rec != null) for (let j = 0; j < 4; j++) { const aa = (j * 90 + 45) * Math.PI / 180; s += receptor(cx + Math.cos(aa) * 150, cy + Math.sin(aa) * 125, aa * 180 / Math.PI + 90, o.rec, CL.b1); }
  s += bar(x + w - 150, y + 100, 44, h - 190, clamp(0.3 + 0.7 * a), CL.b1, 'KERJA');
  s += `<text x="${x + w - 128}" y="${y + h - 14}" text-anchor="middle" font-family="'Plus Jakarta Sans'" font-weight="800" font-size="27" fill="#CFE8E2">JANTUNG</text>`;
  return s;
}

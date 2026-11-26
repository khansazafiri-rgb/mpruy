// Inset besar (lensa pembesar, koordinat layar) untuk (1) sensor regang di dalam otot dan (2) penampang sumsum tulang belakang dengan lengkung refleks.
// Warna tetap: sensorik = teal (masuk), motorik = jingga (kembali). Jalur sinyal di dalam inset mengikuti arah yang sama dengan jalur di tubuh (masuk dari bawah, keluar ke bawah).
import { f1, clamp, lerp, sm, eo, eio, K, T, tw } from './common.js';

export const INSET = { cx: 540, cy: 790, r: 318 };
/** bingkai lensa yang membuka dari titik asal (fx, fy) di layar menuju pusat inset; p 0..1 */
export function lensFrame(inner, p, from, id = 'lens') {
  if (p <= 0.003) return '';
  const e = eo(clamp(p)), x = lerp(from[0], INSET.cx, e), y = lerp(from[1], INSET.cy, e), r = INSET.r * e;
  return `<defs><clipPath id="${id}"><circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}"/></clipPath></defs><circle cx="${f1(x)}" cy="${f1(y + 8)}" r="${f1(r + 6)}" fill="rgba(0,0,0,.3)"/><g clip-path="url(#${id})"><circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="#1A2750"/><g transform="translate(${f1(x)} ${f1(y)}) scale(${f1(e * 1000) / 1000})">${inner}</g></g><circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="none" stroke="${K.gold}" stroke-width="9"/><circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r + 11)}" fill="none" stroke="#fff" stroke-width="3" opacity=".35"/>`;
}
const arrowL = (x, y, col) => `<path d="M${x} ${y - 16}L${x - 26} ${y}L${x} ${y + 16}" fill="none" stroke="${col}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`;
/** isi inset sensor regang. str = regang 0..1; fire = 0..1 (sensor aktif); t untuk denyut */
export function spindleInner(t, str, fire) {
  const sp = 28 * (1 + 0.14 * str), ex = 1 + 0.11 * str;
  let s = '';
  for (const y of [-232, -150, 150, 232]) { s += `<rect x="-340" y="${y - 31}" width="680" height="62" rx="31" fill="${K.quad}" stroke="${K.quadD}" stroke-width="4"/>`; for (let x = -330; x < 330; x += sp) s += `<path d="M${f1(x)} ${y - 26}L${f1(x)} ${y + 26}" stroke="${K.quadD}" stroke-width="3" opacity=".5"/>`; }
  // kapsul gelendong otot + dua serabut di dalamnya
  s += `<g transform="scale(${f1(ex * 1000) / 1000} 1)"><path d="M-232 0C-150 -66 150 -66 232 0C150 66 -150 66 -232 0Z" fill="#E8F7F5" stroke="${K.sensD}" stroke-width="7"/><rect x="-206" y="-24" width="412" height="16" rx="8" fill="#FFF3D6" stroke="#E6D3A4" stroke-width="2"/><rect x="-206" y="8" width="412" height="16" rx="8" fill="#FFF3D6" stroke="#E6D3A4" stroke-width="2"/><ellipse cx="0" cy="-16" rx="48" ry="12" fill="#FFE9B8"/><ellipse cx="0" cy="16" rx="48" ry="12" fill="#FFE9B8"/>`;
  // ujung saraf sensorik melilit serabut (kumparan teal); makin renggang makin renggang lilitannya
  const g = 24 * (1 + 0.25 * str);
  for (let i = -3; i <= 3; i++) s += `<path d="M${f1(i * g - 12)} -38Q${f1(i * g + 14)} 0 ${f1(i * g - 12)} 38" fill="none" stroke="${K.sens}" stroke-width="${f1(8 + 3 * fire)}" stroke-linecap="round"/>`;
  s += `</g>`;
  // saraf sensorik keluar ke kiri (arah paha -> sumsum tulang belakang)
  s += `<path d="M-60 -44C-120 -80 -200 -40 -340 -40" fill="none" stroke="${K.sensD}" stroke-width="16" stroke-linecap="round" opacity=".6"/><path d="M-60 -44C-120 -80 -200 -40 -340 -40" fill="none" stroke="${K.sens}" stroke-width="9" stroke-linecap="round"/>`;
  // denyut yang berjalan ke kiri
  for (let k = 0; k < 4; k++) { const u = ((t - 8.78 - k * 0.22) / 0.62); if (u < 0 || u > 1 || t < 8.78) continue; const x = lerp(-70, -330, u), y = lerp(-46, -40, u) - 36 * Math.sin(Math.PI * Math.min(1, u * 1.2)) * (1 - u); s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="17" fill="${K.sens}" opacity=".4"/><circle cx="${f1(x)}" cy="${f1(y)}" r="9" fill="#fff" stroke="${K.sens}" stroke-width="4"/>`; }
  s += arrowL(-312, -40, K.sensHi);
  // panah regang di kedua ujung
  if (str > 0.05) s += `<g opacity="${f1(str)}" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none"><path d="M-252 -96L-290 -96M-272 -114L-290 -96L-272 -78"/><path d="M252 -96L290 -96M272 -114L290 -96L272 -78"/></g>`;
  return s;
}
// jalur di penampang sumsum tulang belakang (koordinat lokal inset): masuk dari bawah (kiri = punggung), keluar ke bawah (kanan = depan)
export const C_SENS = [[-86, 330], [-112, 230], [-150, 140], [-156, 40], [-124, -26], [-40, -30]];
export const C_MOT = [[118, -30], [158, 40], [168, 130], [134, 232], [96, 330]];
const polyl = (P) => P.map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1]}`).join('');
function ptOn(P, u) { let L = [0], d = 0; for (let i = 1; i < P.length; i++) { d += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); L.push(d); } const D = d * clamp(u); let i = 1; while (i < P.length - 1 && L[i] < D) i++; const q = (D - L[i - 1]) / ((L[i] - L[i - 1]) || 1); return { x: lerp(P[i - 1][0], P[i][0], q), y: lerp(P[i - 1][1], P[i][1], q), pts: [...P.slice(0, i), [lerp(P[i - 1][0], P[i][0], q), lerp(P[i - 1][1], P[i][1], q)]] }; }
export function cordInner(t) {
  const us = clamp((t - 10.3) / 1.15), um = clamp((t - 12.75) / 0.62), syn = clamp((t - 11.45) / 0.5) * (1 - clamp((t - 12.1) / 0.5)), soma = sm((t - 12.0) / 0.35) * (1 - sm((t - 13.1) / 0.4));
  let s = `<circle cx="0" cy="-30" r="222" fill="#F1EFE6" stroke="${K.cordD}" stroke-width="6"/>`;
  s += `<g fill="#A9B2D4" stroke="#7F89B3" stroke-width="5" stroke-linejoin="round"><ellipse cx="-104" cy="-30" rx="118" ry="72"/><ellipse cx="104" cy="-30" rx="108" ry="88"/><rect x="-60" y="-64" width="120" height="68" rx="20" stroke="none"/></g><circle cx="0" cy="-30" r="9" fill="#fff"/>`;
  // akar dorsal (sensorik), ganglion, akar ventral (motorik)
  s += `<path d="${polyl(C_SENS)}" fill="none" stroke="${K.sensD}" stroke-width="17" stroke-linecap="round" stroke-linejoin="round" opacity=".7"/><path d="${polyl(C_SENS)}" fill="none" stroke="${K.sens}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><ellipse cx="-142" cy="118" rx="22" ry="34" fill="${K.sensD}" stroke="${K.sens}" stroke-width="4"/>`;
  s += `<path d="${polyl(C_MOT)}" fill="none" stroke="${K.motD}" stroke-width="17" stroke-linecap="round" stroke-linejoin="round" opacity=".7"/><path d="${polyl(C_MOT)}" fill="none" stroke="${K.mot}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>`;
  // neuron motorik (badan sel jingga), sinaps
  s += `<circle cx="118" cy="-30" r="${f1(36 + 6 * soma)}" fill="${K.mot}" opacity="${f1(0.25 + 0.4 * soma)}"/><circle cx="118" cy="-30" r="30" fill="${K.motD}" stroke="${K.mot}" stroke-width="6"/><circle cx="118" cy="-30" r="11" fill="${K.motHi}"/>`;
  s += `<path d="M90 -34L-10 -30" stroke="${K.mot}" stroke-width="6" stroke-linecap="round" opacity=".8"/><path d="M130 -62L170 -100M138 -4L172 30" stroke="${K.mot}" stroke-width="5" stroke-linecap="round" opacity=".7"/>`;
  s += `<circle cx="-30" cy="-30" r="17" fill="${K.sens}" stroke="${K.sensD}" stroke-width="4"/>`;
  if (syn > 0.01) s += `<circle cx="-24" cy="-30" r="${f1(22 + 56 * (1 - syn))}" fill="none" stroke="#fff" stroke-width="7" opacity="${f1(syn)}"/>`;
  // denyut
  if (us > 0 && us < 1) { const p = ptOn(C_SENS, us); s += `<path d="${polyl(p.pts)}" fill="none" stroke="${K.sensHi}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${f1(p.x)}" cy="${f1(p.y)}" r="20" fill="${K.sens}" opacity=".45"/><circle cx="${f1(p.x)}" cy="${f1(p.y)}" r="10" fill="#fff" stroke="${K.sens}" stroke-width="4"/>`; }
  if (us >= 1) s += `<path d="${polyl(C_SENS)}" fill="none" stroke="${K.sensHi}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" opacity="${f1(1 - clamp((t - 12.3) / 0.5))}"/>`;
  if (um > 0) { const p = ptOn(C_MOT, um); s += `<path d="${polyl(p.pts)}" fill="none" stroke="${K.motHi}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${f1(p.x)}" cy="${f1(p.y)}" r="20" fill="${K.mot}" opacity=".45"/><circle cx="${f1(p.x)}" cy="${f1(p.y)}" r="10" fill="#fff" stroke="${K.mot}" stroke-width="4"/>`; }
  s += `<path d="M-86 300l-10 -26m10 26l26 -10" stroke="${K.sensHi}" stroke-width="0"/>`;
  return s;
}

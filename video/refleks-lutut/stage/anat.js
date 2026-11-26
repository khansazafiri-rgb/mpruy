// Lapisan anatomi skematis (koordinat RAKA; dipasang lewat rg() di seat.js): femur, otot paha depan, tempurung lutut, tendon patela, tibia, otot lain (redup),
// jalur saraf sensorik (teal, masuk) dan motorik (jingga, kembali), tulang belakang + sumsum tulang belakang. Ilustrasi edukatif, bukan skala sebenarnya.
// Orientasi mengikuti peta ruang: paha mendatar di kiri lutut, tungkai bawah ke bawah; bagian depan paha = sisi atas; punggung = kiri.
import { f1, clamp, lerp, sm, eo, eio, K } from './common.js';
import { KNEE, rad, tendonAt } from './seat.js';

export const SENS = [[266, 528], [238, 536], [208, 540], [176, 522], [146, 498], [118, 478], [106, 476]];      // sensorik: gelendong otot -> sumsum (kiri-atas)
export const MOT = [[112, 488], [136, 506], [166, 528], [200, 544], [236, 548], [272, 542]];                    // motorik: sumsum -> otot paha depan
export const SPINDLE = [266, 528], CORD = [106, 476];
const lens = (P) => { let L = [0], d = 0; for (let i = 1; i < P.length; i++) { d += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); L.push(d); } return L; };
/** titik pada jalur P untuk u 0..1 dan polyline dari awal sampai u */
export function along(P, u) {
  const L = lens(P), D = L[L.length - 1] * clamp(u); let i = 1; while (i < P.length - 1 && L[i] < D) i++;
  const q = (D - L[i - 1]) / ((L[i] - L[i - 1]) || 1), x = lerp(P[i - 1][0], P[i][0], q), y = lerp(P[i - 1][1], P[i][1], q);
  return { x, y, pts: [...P.slice(0, i), [x, y]] };
}
const poly = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${f1(p[0])} ${f1(p[1])}`).join('');
/** sinyal: jalur redup + jejak terang sampai u + kepala berpendar */
export function signalPath(P, u, col, colD, a = 1) {
  const base = `<path d="${poly(P)}" fill="none" stroke="${colD}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity="${f1(0.45 * a)}"/>`;
  if (u <= 0.001) return base;
  const { x, y, pts } = along(P, u);
  return base + `<path d="${poly(pts)}" fill="none" stroke="${col}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity="${f1(a)}"/><circle cx="${f1(x)}" cy="${f1(y)}" r="13" fill="${col}" opacity="${f1(0.35 * a)}"/><circle cx="${f1(x)}" cy="${f1(y)}" r="7" fill="#fff" stroke="${col}" stroke-width="3" opacity="${f1(a)}"/>`;
}
/** tulang belakang (punggung di kiri) + sumsum tulang belakang; hi 0..1 menyorot bagian bawah sumsum */
export function spineAnat(hi = 0) {
  let s = ''; for (let y = 392; y < 612; y += 26) s += `<rect x="116" y="${y}" width="30" height="20" rx="7" fill="${K.bone}" stroke="${K.boneD}" stroke-width="2.5"/><path d="M116 ${y + 10}L98 ${y + 14}L98 ${y + 6}Z" fill="${K.bone}" stroke="${K.boneD}" stroke-width="2"/>`;
  s += `<rect x="98" y="388" width="14" height="214" rx="7" fill="${K.boneD}" opacity=".35"/><rect x="101" y="392" width="8" height="112" rx="4" fill="${K.cord}" stroke="${K.cordD}" stroke-width="1.5"/><rect x="101" y="452" width="8" height="46" rx="4" fill="${K.gold}" opacity="${f1(0.25 + 0.6 * hi)}"/>`;
  if (hi > 0.05) s += `<circle cx="105" cy="476" r="${f1(16 + 8 * hi)}" fill="none" stroke="${K.gold}" stroke-width="4" opacity="${f1(hi)}"/>`;
  return s;
}
/** tungkai kanan-layar (kaki dekat): th = sudut ayun, str = regang otot 0..1, con = kontraksi 0..1, glow = sorot otot (jingga) 0..1, wave = fase gelombang regang 0..1 (atau -1) */
export function legAnat(o = {}) {
  const th = o.th ?? 0, str = o.str ?? 0, con = o.con ?? 0, glow = o.glow ?? 0, wave = o.wave ?? -1, [kx, ky] = KNEE;
  const sx = 1 + 0.07 * str - 0.07 * con, sy = 1 - 0.12 * str + 0.42 * con, ax = 204, ay = 556;
  const pp = [354 - 5 * con, 557 - 2 * con], tAt = tendonAt(th), pa = rad(-th * 0.35);
  let s = '';
  // otot redup (belakang paha, betis)
  s += `<path d="M206 574C240 592 300 604 338 592L338 604C300 622 238 610 204 590Z" fill="${K.muscle2}" opacity=".75"/>`;
  s += `<g transform="translate(${kx} ${ky}) rotate(${f1(-th)})"><path d="M-10 12C-42 28 -44 70 -14 96L-9 96Z" fill="${K.muscle2}" opacity=".8"/>`;
  // tibia + tuberositas
  s += `<rect x="-9" y="8" width="18" height="92" rx="8" fill="${K.bone}" stroke="${K.boneD}" stroke-width="2.5"/><ellipse cx="0" cy="6" rx="19" ry="10" fill="${K.bone}" stroke="${K.boneD}" stroke-width="2.5"/><circle cx="13" cy="38" r="8" fill="${K.bone}" stroke="${K.boneD}" stroke-width="2.5"/></g>`;
  // femur
  s += `<path d="M196 563L338 577" stroke="${K.boneD}" stroke-width="23" stroke-linecap="round"/><path d="M196 563L338 577" stroke="${K.bone}" stroke-width="18" stroke-linecap="round"/><circle cx="${kx}" cy="${ky}" r="18" fill="${K.bone}" stroke="${K.boneD}" stroke-width="2.5"/>`;
  // otot paha depan (di atas femur) -- meregang / berkontraksi
  const belly = 'M204 548C238 498 300 504 328 536L333 552C300 534 240 540 204 566Z';
  s += `<g transform="translate(${ax} ${ay}) scale(${f1(sx * 1000) / 1000} ${f1(sy * 1000) / 1000}) translate(${-ax} ${-ay})">`
    + (glow > 0.01 ? `<path d="${belly}" fill="none" stroke="${K.mot}" stroke-width="${f1(14 + 8 * glow)}" stroke-linejoin="round" opacity="${f1(0.55 * glow)}"/>` : '')
    + `<path d="${belly}" fill="${K.quad}" stroke="${K.quadD}" stroke-width="3.5" stroke-linejoin="round"/>`;
  for (const k of [0, 1, 2]) s += `<path d="M${210 + k * 4} ${562 - k * 6}C250 ${526 + k * 4} 298 ${528 + k * 4} ${326 - k * 3} ${548 - k * 2}" fill="none" stroke="#fff" stroke-width="2.6" opacity="${f1(0.28 + 0.4 * str + 0.15 * con)}"/>`;
  s += `</g>`;
  // gelombang regang (garis putih bergerak dari tendon ke arah paha)
  if (wave >= 0 && wave <= 1) for (let i = 0; i < 3; i++) { const u = clamp(wave * 1.3 - i * 0.16); if (u <= 0 || u >= 1) continue; const x = lerp(330, 214, u), a = Math.sin(Math.PI * u);
    s += `<path d="M${f1(x)} ${f1(532 - 26 * Math.sin(Math.PI * (x - 204) / 130) * 0.55)}q-7 ${f1(18)} 0 ${f1(36)}" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity="${f1(a * 0.95)}"/>`; }
  // tendon kuadrisep -> tempurung lutut -> tendon patela -> tuberositas tibia
  s += `<path d="M328 538L350 541" stroke="${K.tendonD}" stroke-width="14" stroke-linecap="round"/><path d="M328 538L350 541" stroke="${K.tendon}" stroke-width="9" stroke-linecap="round"/>`;
  s += `<path d="M${f1(pp[0] + 3)} ${f1(pp[1] + 14)}L${f1(tAt[0])} ${f1(tAt[1])}" stroke="${K.tendonD}" stroke-width="15" stroke-linecap="round"/><path d="M${f1(pp[0] + 3)} ${f1(pp[1] + 14)}L${f1(tAt[0])} ${f1(tAt[1])}" stroke="${K.tendon}" stroke-width="10" stroke-linecap="round"/>`;
  s += `<ellipse cx="${f1(pp[0])}" cy="${f1(pp[1])}" rx="13" ry="17" transform="rotate(${f1(-12 + th * -0.35)} ${f1(pp[0])} ${f1(pp[1])})" fill="${K.patella}" stroke="${K.boneD}" stroke-width="3"/>`;
  return s;
}
/** penanda sensor regang pada otot (cincin kecil) */
export const spindleMark = (a, pulse = 0) => a <= 0.01 ? '' : `<g opacity="${f1(a)}"><ellipse cx="${SPINDLE[0]}" cy="${SPINDLE[1]}" rx="${f1(15 + 3 * pulse)}" ry="${f1(6 + 1.5 * pulse)}" fill="${K.sens}" stroke="#fff" stroke-width="2.5"/><circle cx="${SPINDLE[0]}" cy="${SPINDLE[1]}" r="${f1(20 + 8 * pulse)}" fill="none" stroke="${K.sens}" stroke-width="3" opacity="${f1(0.7 - 0.5 * pulse)}"/></g>`;

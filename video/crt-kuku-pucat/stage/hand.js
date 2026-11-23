// Jari dan kuku gaya kartun MEDCOEL (datar, bulat, tebal, kontur hangat): jari montok dengan ujung bulat, tonjolan sendi, kuku besar berkilau, bayangan berupa bentuk (bukan garis kaku),
// tangan lengkap (telapak + ibu jari + jari lain) yang bergoyang halus; jari pemeriksa gepeng saat menekan dan memantul saat lepas. Warna kulit mengikuti Raka (#F7BC8E).
// Hanya untuk ilustrasi anatomi/makro; Raka tetap aset resmi (brand/characters/raka/raka.js).
import { f1, clamp, lerp } from './lib.js';
export const SKIN = { patient: ['#F7BC8E', '#EAA676', '#FFDDBF', '#B9714A'], exam: ['#F1AE82', '#E39A6C', '#FBCBA6', '#A9633E'] };   // [dasar, bayangan, kilau, kontur]
export const NAILC = { pale: '#F7E9E1', pink: '#F59A98', pinkD: '#E27977' };
const mix = (a, b, t) => { const h = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)), A = h(a), B = h(b); return '#' + A.map((x, i) => Math.round(x + (B[i] - x) * clamp(t)).toString(16).padStart(2, '0')).join(''); };
export const mixc = mix;
let uid = 0;
const OUT = 7;
function center(x, y, deg, L, curl) { const N = 70, P = []; let a = deg * Math.PI / 180, px = x, py = y; const da = curl * Math.PI / 180 / N; for (let i = 0; i <= N; i++) { P.push({ x: px, y: py, a }); px += Math.cos(a) * L / N; py += Math.sin(a) * L / N; a += da * (0.5 + 1.0 * i / N); } return (u) => { const f = clamp(u) * N, i = Math.min(N - 1, Math.floor(f)), t = f - i; return { x: lerp(P[i].x, P[i + 1].x, t), y: lerp(P[i].y, P[i + 1].y, t), a: lerp(P[i].a, P[i + 1].a, t) }; }; }
const wprof = (u, w0, w1) => lerp(w0, w1, u) * (1 + 0.075 * Math.sin(u * Math.PI * 3.0 - 0.4) + 0.05 * Math.sin(u * Math.PI * 7));      // montok, ada tonjolan sendi
/** jari kartun. o { x,y,deg,L,curl,w0,w1,skin,nail:{u0,u1,fill,color},id,alpha,sway } */
export function finger(o) {
  const { x, y, deg, L, curl = 8, w0 = 150, w1 = 132, skin = SKIN.patient, nail = null, id = `fg${uid++}`, alpha = 1 } = o, C = center(x, y, deg, L, curl), N = 56, U1 = 0.9;
  const off = (u, s) => { const c = C(u), w = wprof(u, w0, w1) / 2 * s; return [c.x - Math.sin(c.a) * w, c.y + Math.cos(c.a) * w]; };
  const left = [], right = []; for (let i = 0; i <= N; i++) { const u = i / N * U1; left.push(off(u, 1)); right.push(off(u, -1)); }
  const tip = C(U1), wt = wprof(U1, w0, w1) / 2, tl = [], nx = -Math.sin(tip.a), ny = Math.cos(tip.a), dx = Math.cos(tip.a), dy = Math.sin(tip.a);
  for (let i = 1; i <= 18; i++) { const th = i / 19 * Math.PI, rr = Math.cos(th), fw = Math.sin(th) * wt * 0.95; tl.push([tip.x + nx * wt * rr + dx * fw, tip.y + ny * wt * rr + dy * fw]); }
  const pts = [...left, ...tl, ...right.reverse()], d = 'M' + pts.map((p) => `${f1(p[0])} ${f1(p[1])}`).join('L') + 'Z';
  let s = `<g opacity="${alpha}"><defs><clipPath id="${id}"><path d="${d}"/></clipPath></defs><path d="${d}" fill="${skin[0]}"/>`;
  // bayangan sisi bawah (bentuk melengkung besar) dan kilau bulat
  const line = (sOff, wd, col, o2, u0, u1) => { let q = ''; for (let i = 0; i <= 28; i++) { const u = u0 + (u1 - u0) * i / 28, c = C(u), w = wprof(u, w0, w1) / 2 * sOff; q += `${i ? 'L' : 'M'}${f1(c.x - Math.sin(c.a) * w)} ${f1(c.y + Math.cos(c.a) * w)}`; } return `<path d="${q}" fill="none" stroke="${col}" stroke-width="${f1(wd)}" stroke-linecap="round" opacity="${o2}"/>`; };
  s += `<g clip-path="url(#${id})">${line(-1.0, w0 * 0.42, skin[1], 1, 0.0, 1.0)}${line(0.58, w0 * 0.14, skin[2], 0.9, 0.06, 0.8)}`;
  // dua lipatan sendi: busur pendek, satu garis bersih per sendi
  for (const u of [0.3, 0.52]) { const c = C(u), w = wprof(u, w0, w1) / 2; const q0 = [c.x + (-Math.sin(c.a)) * w * 0.5, c.y + Math.cos(c.a) * w * 0.5], q1 = [c.x + Math.cos(c.a) * 7, c.y + Math.sin(c.a) * 7], q2 = [c.x + Math.sin(c.a) * w * 0.5, c.y - Math.cos(c.a) * w * 0.5]; s += `<path d="M${f1(q0[0])} ${f1(q0[1])}Q${f1(q1[0])} ${f1(q1[1])} ${f1(q2[0])} ${f1(q2[1])}" fill="none" stroke="${skin[3]}" stroke-width="5" stroke-linecap="round" opacity=".42"/>`; }
  s += `</g><path d="${d}" fill="none" stroke="${skin[3]}" stroke-width="${OUT}" stroke-linejoin="round"/>`;
  if (nail) s += nailSvg(C, w0, w1, nail, skin, id);
  return s + '</g>';
}
/** kuku besar, bulat, dengan pengisian warna menyapu dari pangkal ke ujung (nail.fill 0..1), kilau, lunula */
function nailSvg(C, w0, w1, nail, skin, id) {
  const { u0 = 0.55, u1 = 0.9, fill = 1, lun = 0.5 } = nail, N = 36, wmax = (u) => wprof(u, w0, w1) * 0.74 / 2;
  const half = (t) => Math.pow(Math.max(0, 1 - Math.pow(t, 2.6)), 1 / 2.2) * (0.9 + 0.1 * Math.min(1, t * 5));
  const L = [], R = [];
  for (let i = 0; i <= N; i++) { const t = i / N, u = lerp(u0, u1, t), c = C(u), w = wmax(u) * half(t); L.push([c.x - Math.sin(c.a) * w, c.y + Math.cos(c.a) * w]); R.push([c.x + Math.sin(c.a) * w, c.y - Math.cos(c.a) * w]); }
  const pts = [...L, ...R.reverse()], d = 'M' + pts.map((p) => `${f1(p[0])} ${f1(p[1])}`).join('L') + 'Z', cb = C(u0), ce = C(u1), wb = wmax(u0);
  const gid = `ng${id}`, f = clamp(fill), edge0 = f - 0.16, edge1 = f + 0.16;
  let s = `<defs><linearGradient id="${gid}" gradientUnits="userSpaceOnUse" x1="${f1(cb.x)}" y1="${f1(cb.y)}" x2="${f1(ce.x)}" y2="${f1(ce.y)}"><stop offset="0" stop-color="${NAILC.pink}"/><stop offset="${f1(clamp(edge0) * 100) / 100}" stop-color="${NAILC.pink}"/><stop offset="${f1(clamp(edge1) * 100) / 100}" stop-color="${NAILC.pale}"/><stop offset="1" stop-color="${NAILC.pale}"/></linearGradient></defs>`;
  const base = nail.solid ?? null, fillc = f >= 0.999 ? NAILC.pink : f <= 0.07 ? NAILC.pale : `url(#${gid})`;
  s += `<path d="${d}" fill="${base ?? fillc}" stroke="${mix(NAILC.pinkD, '#7A3F3A', 0.25)}" stroke-width="5" stroke-linejoin="round" opacity="1"/>`;
  s += `<path d="M${f1(cb.x - Math.sin(cb.a) * wb * 0.8)} ${f1(cb.y + Math.cos(cb.a) * wb * 0.8)}Q${f1(cb.x + Math.cos(cb.a) * wb * 1.25)} ${f1(cb.y + Math.sin(cb.a) * wb * 1.25)} ${f1(cb.x + Math.sin(cb.a) * wb * 0.8)} ${f1(cb.y - Math.cos(cb.a) * wb * 0.8)}Z" fill="#FFFBF7" opacity="${f1(0.5 * lun * 100) / 100}"/>`;
  const cu = C(u0 - 0.03); s += `<path d="M${f1(cu.x - Math.sin(cu.a) * wb * 1.05)} ${f1(cu.y + Math.cos(cu.a) * wb * 1.05)}Q${f1(cu.x + Math.cos(cu.a) * wb * 0.7)} ${f1(cu.y + Math.sin(cu.a) * wb * 0.7)} ${f1(cu.x + Math.sin(cu.a) * wb * 1.05)} ${f1(cu.y - Math.cos(cu.a) * wb * 1.05)}" fill="none" stroke="${skin[3]}" stroke-width="7" stroke-linecap="round" opacity=".5"/>`;
  // kilau besar (bulat panjang) dan titik kecil
  const a = C(lerp(u0, u1, 0.3)), b = C(lerp(u0, u1, 0.72)), ww = wmax(lerp(u0, u1, 0.7)) * 0.5;
  s += `<path d="M${f1(a.x - Math.sin(a.a) * ww)} ${f1(a.y + Math.cos(a.a) * ww)}L${f1(b.x - Math.sin(b.a) * ww * 0.9)} ${f1(b.y + Math.cos(b.a) * ww * 0.9)}" stroke="#fff" stroke-width="11" stroke-linecap="round" opacity=".7"/><circle cx="${f1(a.x - Math.sin(a.a) * ww)}" cy="${f1(a.y + Math.cos(a.a) * ww - 22 * Math.sin(a.a))}" r="0" fill="#fff"/>`;
  return s;
}
const sw = (tn, k, a = 3.2) => Math.sin(tn * 1.4 + k) * a;
/** tangan pasien (tampak punggung, relaks, hidup): telunjuk (yang diperiksa) di tengah, jari tengah, manis, kelingking, dan ibu jari di kiri; goyangan halus */
export function patientFingers(o = {}) {
  const tn = o.tn ?? 0, fill = o.fill ?? 1; let s = '';
  // telapak (blok bulat di bawah)
  s += `<path d="M-300 520C-300 440 -250 400 -170 400L190 400C270 400 330 440 330 520V700H-300Z" fill="${SKIN.patient[0]}"/><path d="M-300 520C-300 440 -250 400 -170 400L190 400C270 400 330 440 330 520V560C300 500 240 470 170 470L-170 470C-250 470 -290 500 -300 560Z" fill="${SKIN.patient[1]}" opacity=".35"/>`;
  s += finger({ x: -300, y: 440, deg: -142 + sw(tn, 0, 1.2), L: 250, curl: 26, w0: 128, w1: 112, id: 'pt' });                            // ibu jari (kiri, miring)
  s += finger({ x: 292, y: 470, deg: -72 + sw(tn, 1.6, 1.8), L: 330, curl: -22, w0: 112, w1: 98, id: 'pk' });                         // kelingking
  s += finger({ x: 190, y: 440, deg: -78 + sw(tn, 2.1, 1.6), L: 440, curl: -14, w0: 132, w1: 114, id: 'pr' });                         // manis
  s += finger({ x: 36, y: 430, deg: -91 + sw(tn, 0.6, 1.0), L: 500, curl: -7, w0: 146, w1: 124, id: 'pm' });                          // tengah (di belakang telunjuk)
  s += finger({ x: -150, y: 430, deg: -102 + sw(tn, 3.1, 0.8), L: 470, curl: 8, w0: 152, w1: 132, id: 'pi', nail: { fill, u0: 0.56, u1: 0.9, lun: o.lun ?? 0.55 } });   // telunjuk
  return s;
}
/** jari pemeriksa: ujungnya menekan kuku (gepeng saat menekan, memantul saat lepas); masuk dari kanan atas */
export function examinerFinger(o = {}) {
  const { press = 0, lift = 0, cx = -150, cy = -118 } = o, pr = clamp(press), L = 540, ph = Math.PI * 2 * lift;
  const tx = cx + lerp(120 + 560 * lift, 14, pr), ty = cy + lerp(-80 - 430 * lift, 30, pr), deg = lerp(150 + 18 * lift, 160, pr), a = deg * Math.PI / 180;
  const bx = tx - Math.cos(a) * L * 0.9, by = ty - Math.sin(a) * L * 0.9, bounce = lift > 0 && lift < 1 ? 1 + 0.06 * Math.sin(ph * 2) * (1 - lift) : 1, squash = 1 - 0.07 * pr;
  const sh = `<ellipse cx="${f1(tx + 8)}" cy="${f1(ty + 38 + 30 * lift)}" rx="${f1(86 + 50 * lift)}" ry="${f1(34 + 24 * lift)}" fill="#7A3F2A" opacity="${f1((0.30 - 0.16 * lift) * (0.35 + 0.65 * clamp(pr + lift)) * 100) / 100}"/>`;
  const f = finger({ x: bx, y: by, deg, L, curl: -4, w0: 152, w1: 134, skin: SKIN.exam, nail: { fill: 1, u0: 0.58, u1: 0.9, lun: 0.4 }, id: 'ex' });
  // tekanan: cincin tipis di sekitar titik kontak; saat lepas: percikan garis pendek ("pop")
  let fx = ''; if (pr > 0.3) fx += `<ellipse cx="${f1(tx - 20)}" cy="${f1(ty + 8)}" rx="${f1(70 + 18 * pr)}" ry="${f1(40 + 10 * pr)}" fill="none" stroke="#fff" stroke-width="5" opacity="${f1(0.45 * pr * 100) / 100}"/>`;
  if (lift > 0.02 && lift < 0.55) { const k = lift / 0.55; for (let i = 0; i < 6; i++) { const aa = (-40 + i * 34) * Math.PI / 180 + Math.PI, r0 = 90 + 40 * k, r1 = 130 + 60 * k; fx += `<path d="M${f1(tx - 30 + Math.cos(aa) * r0)} ${f1(ty + Math.sin(aa) * r0)}L${f1(tx - 30 + Math.cos(aa) * r1)} ${f1(ty + Math.sin(aa) * r1)}" stroke="#FFC93C" stroke-width="9" stroke-linecap="round" opacity="${f1((1 - k) * 100) / 100}"/>`; } }
  return `<g transform="translate(${f1(tx)} ${f1(ty)}) rotate(${f1(deg)}) scale(${f1(squash * 1000) / 1000} ${f1(bounce * 1000) / 1000}) rotate(${f1(-deg)}) translate(${f1(-tx)} ${f1(-ty)})">${sh}${f}</g>${fx}`;
}

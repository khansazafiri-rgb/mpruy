// Adegan Raka: hook (0 - 4,9), kulit luar (28,5 - 32,8), respons lain (47,0 - 52,94). Tata letak tetap: Raka di KIRI, lengan kanan menjulur ke kanan; lensa (inset) memperbesar kulit lengan yang sama.
import { f1, clamp, lerp, sm, eo, eio, seg, pop, track, T, GOLD, INK, rndf, W, bgCream, chip, tag, callout, op, armTo, rk, raka, rIdle, ka, camG, mixc } from './common.js';
import { armShape } from '../../../brand/characters/raka/raka.js';
import { SK } from './skin.js';

export const RK = { cx: 320, ty: 440, k: 1.5 };
const ARM = { hx: 440, hy: 462, ex: 352, ey: 536 };
export function rakaArm(t, expr = 'netral', o = {}) {
  const a = armTo('R', ARM.hx, ARM.hy, { ex: ARM.ex, ey: ARM.ey });
  const st = rIdle(raka(expr, 'netral', { armR: a, armL: armTo('L', 92, 556), lean: 1.5 * Math.sin(t * 1.7), tilt: 1.8 * Math.sin(t * 1.25), ...o }), t);
  const r = rk(st, RK.cx, RK.ty, RK.k, o.uid || 'rA');
  const dots = armShape('R', st.armR).dots.map((p) => r.at(p[0], p[1]));
  const arm = (u) => { const i = clamp(u) * (dots.length - 1), k = Math.floor(i), f = i - k, A = dots[k], B = dots[Math.min(dots.length - 1, k + 1)]; return [lerp(A[0], B[0], f), lerp(A[1], B[1], f)]; };
  return { r, dots, arm, hand: r.hand('R') };
}
export const bgRoom = () => bgCream.replace(/#EADFC4/g, '#E3EAF1');
// angin dingin: garis lengkung biru muda bergerak dari kiri ke kanan melewati Raka + partikel halus (tanpa salju/es)
export function wind(t, a = 1) {
  let s = '';
  for (let i = 0; i < 7; i++) { const sp = 360 + 90 * rndf(i + 2), x = -300 + ((t * sp + rndf(i) * 1500) % 1700), y = 480 + i * 150 + 20 * Math.sin(t * 2 + i); s += `<path d="M${f1(x)} ${f1(y)}q80 -34 160 0t160 0t160 0" fill="none" stroke="${SK.cold}" stroke-width="9" stroke-linecap="round" opacity="${f1(a * (0.28 + 0.2 * rndf(i + 9)))}"/>`; }
  for (let i = 0; i < 16; i++) { const sp = 240 + 120 * rndf(i + 4), x = -80 + ((t * sp + rndf(i + 20) * 1400) % 1300), y = 420 + rndf(i + 5) * 1000 + 12 * Math.sin(t * 3 + i); s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(5 + 5 * rndf(i + 8))}" fill="#fff" stroke="${SK.cold}" stroke-width="3" opacity="${f1(a * 0.8)}"/>`; }
  return s;
}
// lensa: potongan samping permukaan kulit lengan dengan rambut halus; p_i = tingkat berdiri tiap rambut (tidak serempak)
export function lens(t, cx, cy, r, o = {}) {
  const t0 = o.t0 ?? 2.0, spread = o.spread ?? 1.0, n = 9, k = r / 235, base = cy + 0.28 * r;
  let g = `<rect x="${cx - r}" y="${cy - r}" width="${2 * r}" height="${2 * r}" fill="#EEF7FC"/>`;
  g += `<path d="M${cx - r} ${f1(base)}${Array.from({ length: 25 }, (_, i) => { const x = cx - r + i * (2 * r / 24); let y = base; for (let h = 0; h < n; h++) { const hx = cx + (-0.82 + h * 0.205) * r, p = clamp(o.p ? o.p(h, t) : eio(seg(t, t0 + spread * rndf(h + 4), t0 + spread * rndf(h + 4) + 0.9))); y -= p * 11 * k * Math.exp(-(((x - hx) / (34 * k)) ** 2)); } return `L${f1(x)} ${f1(y)}`; }).join('')}L${cx + r} ${cy + r}L${cx - r} ${cy + r}Z" fill="${SK.epi}" stroke="${SK.epiD}" stroke-width="${f1(5 * k)}"/><rect x="${cx - r}" y="${f1(base + 38 * k)}" width="${2 * r}" height="${2 * r}" fill="${SK.derm}"/>`;
  for (let h = 0; h < n; h++) {
    const hx = cx + (-0.82 + h * 0.205) * r, p = clamp(o.p ? o.p(h, t) : eio(seg(t, t0 + spread * rndf(h + 4), t0 + spread * rndf(h + 4) + 0.9))), ang = lerp(72, 11, p) * Math.PI / 180, L = (96 + 14 * rndf(h)) * k, hy = base - p * 11 * k;
    g += `<path d="M${f1(hx - 6 * k)} ${f1(hy + 6 * k)}L${f1(hx + Math.sin(ang) * L)} ${f1(hy - Math.cos(ang) * L)}" stroke="${SK.hair}" stroke-width="${f1(5.5 * k)}" stroke-linecap="round"/>`;
  }
  if (o.cold) for (let i = 0; i < 8; i++) { const x = cx + r - ((t * 120 + rndf(i) * 2 * r) % (2 * r)), y = cy - 0.5 * r + 0.8 * r * rndf(i + 3); g += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(5 * k)}" fill="#fff" stroke="${SK.cold}" stroke-width="${f1(2.5 * k)}" opacity=".85"/>`; }
  return `<defs><clipPath id="${o.id || 'lc'}"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath></defs><circle cx="${cx}" cy="${cy}" r="${r + 12}" fill="rgba(0,0,0,.2)" transform="translate(0 8)"/><g clip-path="url(#${o.id || 'lc'})">${g}</g><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#fff" stroke-width="${f1(12 * k)}"/>`;
}
const leader = (ra, cx, cy, r, a) => { const A = ra.arm(0.9); return `<g opacity="${f1(a)}"><circle cx="${f1(A[0])}" cy="${f1(A[1])}" r="26" fill="none" stroke="#fff" stroke-width="7"/><circle cx="${f1(A[0])}" cy="${f1(A[1])}" r="26" fill="none" stroke="${SK.cold}" stroke-width="4" stroke-dasharray="8 6"/><path d="M${f1(A[0] + 14)} ${f1(A[1] - 22)}L${f1(cx - r * 0.55)} ${f1(cy + r * 0.82)}" stroke="#fff" stroke-width="7" stroke-linecap="round"/></g>`; };
export function sceneHook(t, out) {
  const sh = Math.sin(Math.PI * clamp(t / 0.8)) * 0.6 + clamp((t - 0.2) / 0.6) * 0.4;     // bahu terangkat sejak awal
  const ra = rakaArm(t, 'khawatir', { yaw: 0.35, gazeX: 0.8, gazeY: 0.3, bob: -10 * sh, slump: -sh, browL: { y: 3, rot: 12 }, browR: { y: 3, rot: -12 } });
  const lc = [790, 640, 235], pl = pop(t, 0.7, 0.5);
  let w = bgRoom() + wind(t, 1 - clamp((t - 4.0) / 0.6)) + ra.r.svg + leader(ra, lc[0], lc[1], lc[2], clamp(pl));
  w += `<g transform="translate(${lc[0]} ${lc[1]}) scale(${f1(Math.max(0.001, pl))}) translate(${-lc[0]} ${-lc[1]})" opacity="${clamp(pl)}">${lens(t, lc[0], lc[1], lc[2], { t0: 2.0, spread: 0.9, cold: true, id: 'lcH' })}</g>`;
  const zk = track([[0, 540, 960, 0], [3.2, 540, 960, 0], [4.7, lc[0], lc[1], Math.log(2.1)], [5.0, lc[0], lc[1], Math.log(2.1)]])(t);
  out.A += camG(w, Math.exp(zk[2]), zk[0], zk[1], 540, lerp(960, 640, sm((t - 3.2) / 1.5)));
  out.U += chip(['KOK BISA', 'MERINDING?'], t, -0.4, 5.0, { size: 66, bg: '#D9382F', fg: '#fff' }) + tag('bulu lengan berdiri', 790, 930, ka(t, 2.2, 3.4, 0.25) * (1 - clamp((t - 3.3) / 0.3)), { size: 30, bg: '#fff' });
}
// D. kembali ke kulit luar: lensa mengecil ke posisi lengan Raka; banyak rambut bereaksi kecil dan tidak serempak
export function sceneOuter(t, out) {
  const ra = rakaArm(t, 'khawatir', { yaw: 0.35, gazeX: 0.8, gazeY: 0.3, uid: 'rD' });
  const u = eio(seg(t, 28.6, 29.8)), lc = [lerp(540, 790, u), lerp(860, 640, u), lerp(560, 235, u)];
  let w = bgRoom() + wind(t, 0.8) + ra.r.svg + leader(ra, 790, 640, 235, u);
  w += lens(t, lc[0], lc[1], lc[2], { t0: 28.6, spread: 2.4, cold: true, id: 'lcD', p: (h, tt) => 0.55 + 0.45 * eio(seg(tt, 28.6 + 0.2 * h, 29.4 + 0.2 * h)) * (0.85 + 0.15 * Math.sin(tt * 2 + h * 1.9)) });
  out.A += w;
  out.U += chip(['TONJOLAN KECIL', 'MERINDING'], t, 28.6, 32.8, { size: 60, bg: '#fff' }) + tag('banyak folikel, gerak kecil serupa', 540, 1240, ka(t, 30.0, 32.7, 0.3), { size: 28, bg: '#fff' });
}
// F. respons lain: pembuluh kulit menyempit (inset) dan Raka menggigil kecil; fokus akhir pada Raka dan lengan
const redCell = (x, y, r, o = 1) => `<g opacity="${o}"><ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${r}" ry="${f1(r * 0.78)}" fill="#E5483F" stroke="#A8281F" stroke-width="3"/><ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(r * 0.45)}" ry="${f1(r * 0.3)}" fill="#C93A33"/></g>`;
function vesselInset(t, cx, cy, r, k) {
  const hh = lerp(64, 26, eio(seg(t, 50.0, 51.4))) * 1.0;
  let g = `<rect x="${cx - r}" y="${cy - r}" width="${2 * r}" height="${2 * r}" fill="${SK.derm}"/><rect x="${cx - r}" y="${cy - r}" width="${2 * r}" height="${f1(r * 0.42)}" fill="${SK.epi}"/>`;
  g += `<rect x="${cx - r}" y="${f1(cy - hh - 22)}" width="${2 * r}" height="${f1(2 * hh + 44)}" fill="#C0524F"/><rect x="${cx - r}" y="${f1(cy - hh)}" width="${2 * r}" height="${f1(2 * hh)}" fill="#F6C9C4"/>`;
  const flow = 1 - 0.55 * eio(seg(t, 50.0, 51.4));
  for (let i = 0; i < 9; i++) { const x = cx - r + ((i * 118 + t * 170 * flow) % (2 * r + 40)), y = cy + (rndf(i) - 0.5) * (hh * 1.2); g += redCell(x, y, Math.min(24, hh * 0.5), clamp(1 - Math.abs(x - cx) / (r + 20) * 0.2)); }
  return `<defs><clipPath id="clV"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath></defs><g transform="translate(${cx} ${cy}) scale(${f1(k)}) translate(${-cx} ${-cy})" opacity="${clamp(k)}"><circle cx="${cx}" cy="${cy}" r="${r + 12}" fill="rgba(0,0,0,.2)" transform="translate(0 8)"/><g clip-path="url(#clV)">${g}</g><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#fff" stroke-width="12"/></g>`;
}
export function sceneOther(t, out) {
  const shake = seg(t, 52.0, 52.3) * (1 - 0) , jx = shake * (3.5 * Math.sin(t * 70) + 2 * Math.sin(t * 43)), jy = shake * 2.5 * Math.sin(t * 61);
  const ra = rakaArm(t, 'khawatir', { yaw: 0.35, gazeX: 0.8, gazeY: 0.3, tilt: 2 * Math.sin(t * 1.25) + shake * 3 * Math.sin(t * 55), lean: shake * 2.5 * Math.sin(t * 47), uid: 'rF' });
  const lc = [790, 640, 235];
  let w = bgRoom() + `<g transform="translate(${f1(jx)} ${f1(jy)})">` + ra.r.svg + '</g>' + leader(ra, lc[0], lc[1], lc[2], 1) + lens(t, lc[0], lc[1], lc[2], { p: (h, tt) => 0.9 + 0.1 * Math.sin(tt * 2 + h), id: 'lcF', cold: true });
  const vk = pop(t, 49.2, 0.5) * (1 - clamp((t - 52.3) / 0.5));
  w += vesselInset(t, 790, 1130, 190, Math.max(0.001, vk));
  out.A += w;
  let u = chip(['RESPONS LAIN'], t, 47.3, 50.5, { size: 66, bg: '#fff' }) + chip(['ALIRAN DARAH', 'KE KULIT BERKURANG'], t, 50.5, 52.05, { size: 50, bg: '#D4EEFB', fg: INK }) + chip(['MENGGIGIL'], t, 52.05, 53.0, { size: 70, bg: '#E7DDFF', fg: INK });
  u += tag('pembuluh kulit menyempit', 790, 910, ka(t, 50.3, 52.2, 0.3), { size: 28, bg: '#fff' });
  out.U += u;
}

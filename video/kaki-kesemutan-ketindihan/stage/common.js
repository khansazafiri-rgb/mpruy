// Pembantu bersama video "Kenapa kaki kesemutan setelah ketindihan?". 1080 x 1920, 30 fps. Gaya datar 2D MEDCOEL; Raka kanonik lewat rakaSvg() (brand/characters/raka/raka.js).
// Kode warna tetap: SINYAL saraf = teal (selalu bergerak dari kaki menuju otak = ke kiri layar pada penampang), DARAH = merah (di pembuluh), saraf = kuning gading, tekanan = koral, kesemutan = amber.
import { f1, clamp, lerp, sm, eo, eio, eob, seg, win, pop, track, pchip, R, C, P, T, G, FONT, tw, pill, rndf, GOLD, FOREST, INK } from './lib.js';
import { raka, rakaSvg, armShape, lerpState, idle as rIdle } from '../../../brand/characters/raka/raka.js';
export { raka, rIdle, lerpState };
export * from './lib.js';
export const CUES = await (await fetch('../cues.json')).json(); export const W = CUES.w;
export const NOCAP = new URLSearchParams(location.search).has('nocap');
export const CREAM = '#F7F2E4', NAVY = '#16224A', CORAL = '#F2735E', MINT = '#9DE0BD';
export const K = {
  sig: '#2DD4BF', sigD: '#0F8F82', sigHi: '#C9FBF3', nerve: '#FFE98A', nerveD: '#B89412', nerveDull: '#CBC7B0', nerveDullD: '#8D8A78',
  blood: '#D4202F', bloodD: '#7E1220', bloodHi: '#F5777D', vess: '#C8505E', vessD: '#8E2E3E', lumen: '#F9CFD2',
  skin: '#F7BC8E', skinD: '#EAA676', fat: '#FCE7B2', fatD: '#E8CB7E', muscle: '#E88A84', muscleD: '#C25D5E', muscleL: '#F3A9A3',
  press: '#F2735E', pressD: '#B8452F', spark: '#FFB02E', sparkD: '#C77A00', pants: '#212739', grey: '#8FA0B3', violet: '#B7A9D9',
  wood: '#B98A5A', woodD: '#8E6A43', red: '#D9382F', ink: '#172B38', forest: '#0A3830', gold: '#FFC53D', navy: '#101A3A',
};
export const ka = (t, t0, t1, f = 0.25) => clamp((t - t0) / f) * clamp((t1 - t) / f);
export const op = (a, inner) => `<g opacity="${f1(clamp(a) * 1000) / 1000}">${inner}</g>`;
export const camG = (inner, z, cx, cy, ox = 540, oy = 960) => `<g transform="translate(${f1(ox)} ${f1(oy)}) scale(${f1(z * 1000) / 1000}) translate(${f1(-cx)} ${f1(-cy)})">${inner}</g>`;
// ------------------------------------------------------------------ teks layar (area aman: atas >= y 250, takarir y 1306-1402)
export function chip(lines, t, t0, t1, o = {}) { const k = ka(t, t0, t1, o.f ?? 0.3); return k > 0.01 ? pill(lines, 540, (o.y ?? 250) + (1 - eo(clamp((t - t0) / 0.35))) * -40, { a: k, size: o.size ?? 56, bg: o.bg, fg: o.fg, k: o.k }) : ''; }
export function tag(txt, x, y, a = 1, o = {}) {
  if (a <= 0.01) return ''; const size = o.size ?? 36, w = tw(txt, size) + 46, h = size + 26;
  return `<g opacity="${f1(a * 100) / 100}"><rect x="${f1(x - w / 2)}" y="${f1(y - h / 2 + 5)}" width="${f1(w)}" height="${f1(h)}" rx="${h / 2}" fill="rgba(0,0,0,.28)"/><rect x="${f1(x - w / 2)}" y="${f1(y - h / 2)}" width="${f1(w)}" height="${f1(h)}" rx="${h / 2}" fill="${o.bg ?? '#fff'}"/>${T(txt, x, y + size * 0.36, { size, fill: o.fg ?? FOREST })}</g>`;
}
/** label dengan garis penunjuk: kotak di (tx, ty), ujung garis di (ax, ay) pada benda; k = 0..1 panjang garis */
export function callout(txt, tx, ty, ax, ay, a, o = {}) {
  if (a <= 0.01) return ''; const size = o.size ?? 38, w = tw(txt, size) + 46, h = size + 26, col = o.col ?? GOLD, k = o.k ?? 1;
  const ex = o.ex ?? (ax < tx ? tx - w / 2 : tx + w / 2), ey = ty, ux = lerp(ex, ax, k), uy = lerp(ey, ay, k);
  return `<g opacity="${f1(a * 100) / 100}"><path d="M${f1(ex)} ${f1(ey)}L${f1(ux)} ${f1(uy)}" stroke="#000" stroke-opacity=".3" stroke-width="9" stroke-linecap="round" transform="translate(0 4)"/><path d="M${f1(ex)} ${f1(ey)}L${f1(ux)} ${f1(uy)}" stroke="${col}" stroke-width="6" stroke-linecap="round"/><circle cx="${f1(ux)}" cy="${f1(uy)}" r="${f1(11 * k)}" fill="${col}" stroke="${INK}" stroke-width="3"/></g>` + tag(txt, tx, ty, a, { size, bg: o.bg, fg: o.fg });
}
export function caption(t) {
  if (NOCAP || t >= CUES.cut) return '';
  const c = CUES.cap.find(([a, b]) => t >= a - 0.04 && t < b); if (!c) return '';
  const a = clamp((t - c[0]) / 0.12); let size = 50; while (tw(c[2], size) + 70 > 980 && size > 36) size -= 2;
  const w = Math.min(980, tw(c[2], size) + 70);
  return `<g opacity="${f1(a * 100) / 100}">${R(540 - w / 2, 1306, w, 96, 'rgba(8,18,30,.92)', 34)}${T(c[2], 540, 1306 + 48 + size * 0.36, { size, fill: '#fff' })}</g>`;
}
// ------------------------------------------------------------------ gerak
/** sentakan cegukan: 0..1 puncak di t0 (naik 0,05 dtk, turun eksponensial) */
export const jolt = (t, t0, dec = 0.16) => { const d = t - t0; if (d < -0.001 || d > 1.2) return 0; return d < 0.05 ? clamp(d / 0.05) : Math.exp(-(d - 0.05) / dec); };
export const rk = (st, cx, ty, k, uid, o = {}) => { const tx = cx - 200 * k; return { svg: `<g transform="translate(${f1(tx)} ${f1(ty)}) scale(${k})">${rakaSvg(st, { bare: true, uid, shadow: false, ...o })}</g>`, at: (x, y) => [tx + x * k, ty + y * k], hand: (side) => { const h = armShape(side, st['arm' + side]).hand; return [tx + h[0] * k, ty + h[1] * k]; }, tx, ty, k }; };
/** lengan yang tangannya tepat di (hx, hy) (koordinat Raka) */
export const armTo = (side, hx, hy, extra = {}) => { const a = { wx: hx, wy: hy, ex: side === 'R' ? Math.max(330, hx + 70) : Math.min(70, hx - 70), ey: hy + 90, finger: 0, fa: -90, front: 1, roll: 0, hold: 0, holdRot: 0, ...extra }; const h = armShape(side, a).hand; a.wx += hx - h[0]; a.wy += hy - h[1]; return a; };
/** gelembung "hik" (UI): pusat (x, y), skala k, a = opasitas */
export function hikBubble(x, y, k, a, txt = 'hik!', o = {}) {
  if (a <= 0.01 || k <= 0.01) return ''; const size = o.size ?? 64, w = tw(txt, size) + 60, h = size + 40;
  return `<g opacity="${f1(a * 100) / 100}" transform="translate(${f1(x)} ${f1(y)}) rotate(${o.rot ?? -6}) scale(${f1(k * 100) / 100})"><rect x="${f1(-w / 2 + 4)}" y="${f1(-h / 2 + 8)}" width="${f1(w)}" height="${f1(h)}" rx="${h / 2}" fill="rgba(0,0,0,.25)"/><rect x="${f1(-w / 2)}" y="${f1(-h / 2)}" width="${f1(w)}" height="${f1(h)}" rx="${h / 2}" fill="${o.bg ?? '#fff'}" stroke="${o.stroke ?? CORAL}" stroke-width="7"/><path d="M${f1(-w * 0.12)} ${f1(h / 2 - 3)}L${f1(-w * 0.22)} ${f1(h / 2 + 26)}L${f1(w * 0.04)} ${f1(h / 2 - 3)}Z" fill="${o.bg ?? '#fff'}" stroke="${o.stroke ?? CORAL}" stroke-width="7" stroke-linejoin="round"/><rect x="${f1(-w * 0.2)}" y="${f1(h / 2 - 10)}" width="${f1(w * 0.3)}" height="14" fill="${o.bg ?? '#fff'}"/>${T(txt, 0, size * 0.36, { size, fill: o.fg ?? CORAL })}</g>`;
}
/** peralihan lensa: lama digambar dulu, baru di dalam lingkaran (cx, cy, jari-jari p*Rmax) ; p 0..1 */
export function iris(oldS, newS, cx, cy, p, id = 'iris', ring = K.gold) {
  const pp = clamp(p); if (pp <= 0.001) return oldS; if (pp >= 0.999) return newS; const r = pp * 2300;
  return `${oldS}<mask id="${id}"><rect x="-4000" y="-4000" width="9000" height="9000" fill="#000"/><circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r)}" fill="#fff"/></mask><g mask="url(#${id})">${newS}</g><circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r)}" fill="none" stroke="${ring}" stroke-width="${f1(14 * (1 - pp) + 3)}" opacity="${f1(1 - pp * 0.6)}"/>`;
}
export const bgCream = `<rect x="-9000" y="-9000" width="18000" height="18000" fill="${CREAM}"/><circle cx="110" cy="480" r="190" fill="#EADFC4"/><circle cx="980" cy="1040" r="230" fill="#EADFC4" opacity=".7"/>`;
export { f1, clamp, lerp };
/** campuran dua warna heks (#rrggbb), t 0..1 */
export function mixc(a, b, t) { const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); const A = p(a), B = p(b), c = A.map((v, i) => Math.round(lerp(v, B[i], clamp(t)))); return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join(''); }

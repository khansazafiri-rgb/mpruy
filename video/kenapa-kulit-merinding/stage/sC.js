// E. perbandingan: hewan berbulu tebal (lapisan udara tertahan) vs manusia (rambut sedikit, respons ada tetapi bukan cara utama menghangatkan)
import { f1, clamp, lerp, sm, eo, eio, seg, pop, T, INK, rndf, chip, tag, callout, ka } from './common.js';
import { SK } from './skin.js';
import { bgRoom } from './sA.js';
const AIRC = '#BFE3F7', HEAT = '#F28A2E';
const heatArrow = (x, y, a, s = 1) => `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})" opacity="${f1(a)}"><path d="M0 14V-16M-14 -4L0 -18L14 -4" fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/><path d="M0 14V-16M-14 -4L0 -18L14 -4" fill="none" stroke="${HEAT}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></g>`;
// panel penampang: kulit di dasar, rambut menjulur ke atas; pita udara di dekat kulit; panah panas dari kulit
function panel(t, cx, cy, o) {
  const w = 900, h = 400, x0 = cx - w / 2, y0 = cy - h / 2, base = y0 + h - 84, id = o.id;
  let g = `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="#EEF7FC"/>`;
  const airH = o.airH * o.airA;
  if (airH > 1) { g += `<rect x="${x0}" y="${f1(base - airH)}" width="${w}" height="${f1(airH)}" fill="${AIRC}" opacity=".55"/><path d="M${x0} ${f1(base - airH)}H${x0 + w}" stroke="#5FB3E3" stroke-width="4" stroke-dasharray="14 10" opacity="${f1(o.airA)}"/>`;
    for (let i = 0; i < 22; i++) g += `<circle cx="${f1(x0 + 30 + rndf(i + o.sd) * (w - 60))}" cy="${f1(base - 14 - rndf(i + 30 + o.sd) * Math.max(4, airH - 28))}" r="${f1(5 + 5 * rndf(i + 60))}" fill="#fff" stroke="#5FB3E3" stroke-width="2.5" opacity="${f1(0.9 * o.airA)}"/>`; }
  g += `<rect x="${x0}" y="${base}" width="${w}" height="${h}" fill="${SK.epi}"/><rect x="${x0}" y="${base + 30}" width="${w}" height="${h}" fill="${SK.derm}"/><path d="M${x0} ${base}H${x0 + w}" stroke="${SK.epiD}" stroke-width="5"/>`;
  for (let i = 0; i < o.n; i++) {
    const x = x0 + (i + 0.5) * w / o.n + (rndf(i + o.sd) - 0.5) * (w / o.n) * 0.5, lean = (rndf(i + o.sd + 7) - 0.5) * 0.5, p = clamp(o.p(i, t)), ang = lerp(1.25, 0.1, p) * (rndf(i + 3) > 0.5 ? 1 : -1) + lean * p + 0.05 * Math.sin(t * 2.3 + i * 1.7) * (0.3 + p), L = o.len * (0.85 + 0.3 * rndf(i + 11)), tx = x + Math.sin(ang) * L, ty = base - Math.cos(ang) * L;
    g += `<path d="M${f1(x)} ${base + 4}Q${f1(x + Math.sin(ang) * L * 0.3 + 6)} ${f1(base - L * 0.5)} ${f1(tx)} ${f1(ty)}" fill="none" stroke="${o.col}" stroke-width="${o.sw}" stroke-linecap="round"/>`;
  }
  for (let k = 0; k < 6; k++) { const ph = ((t * 70 + k * 83) % 330) / 330, x = x0 + 90 + k * 144, y = base - 20 - ph * (h - 70); const a = (o.blockAt ? clamp((base - airH - y) / 0 + 1) * (y > base - airH ? 1 : clamp(1 - (base - airH - y) / 30)) : clamp(1 - Math.max(0, ph - 0.7) / 0.3)) * o.heatA * clamp(ph * 8); g += heatArrow(x, y, a, 0.9); }
  return `<defs><clipPath id="${id}"><rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="34"/></clipPath></defs><rect x="${x0}" y="${y0 + 8}" width="${w}" height="${h}" rx="34" fill="rgba(0,0,0,.2)"/><g clip-path="url(#${id})">${g}</g><rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="34" fill="none" stroke="#fff" stroke-width="8"/>`;
}
function cat(t, cx, cy, p) {
  const fur = '#C99A68', furD = '#8D6B4A';
  let spikes = '';
  const n = 46, rx = 270, ry = 130;
  for (let i = 0; i < n; i++) { const a = Math.PI * (1.05 + 0.9 * i / (n - 1)) , x = cx + 20 + Math.cos(a) * rx, y = cy + Math.sin(a) * ry, L = 9 + 36 * p * (0.7 + 0.5 * rndf(i + 3)), nx = Math.cos(a), ny = Math.sin(a); spikes += `<path d="M${f1(x - ny * 9)} ${f1(y + nx * 9)}L${f1(x + nx * L)} ${f1(y + ny * L)}L${f1(x + ny * 9)} ${f1(y - nx * 9)}Z" fill="${fur}"/>`; }
  const tail = `<path d="M${cx + 280} ${cy - 10}C${cx + 400} ${cy - 40} ${cx + 380} ${cy - 190} ${cx + 330} ${cy - 220}" fill="none" stroke="${furD}" stroke-width="${f1(52 + 26 * p)}" stroke-linecap="round"/><path d="M${cx + 280} ${cy - 10}C${cx + 400} ${cy - 40} ${cx + 380} ${cy - 190} ${cx + 330} ${cy - 220}" fill="none" stroke="${fur}" stroke-width="${f1(40 + 26 * p)}" stroke-linecap="round"/>`;
  let legs = ''; for (const dx of [-150, -70, 120, 200]) legs += `<rect x="${cx + dx - 26}" y="${cy + 80}" width="52" height="${f1(112 - 0)}" rx="26" fill="${furD}"/><rect x="${cx + dx - 22}" y="${cy + 80}" width="44" height="110" rx="22" fill="${fur}"/>`;
  const hx = cx - 270, hy = cy - 30;
  return `<ellipse cx="${cx}" cy="${cy + 205}" rx="330" ry="14" fill="rgba(0,0,0,.12)"/>${tail}${legs}${spikes}<ellipse cx="${cx + 20}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fur}"/>
  <path d="M${hx - 60} ${hy - 70}L${hx - 40} ${hy - 150 - 16 * p}L${hx + 10} ${hy - 90}Z M${hx + 60} ${hy - 90}L${hx + 100} ${hy - 150 - 16 * p}L${hx + 120} ${hy - 50}Z" fill="${fur}" stroke="${furD}" stroke-width="5" stroke-linejoin="round"/><circle cx="${hx}" cy="${hy}" r="${f1(98 + 16 * p)}" fill="${fur}"/>
  <circle cx="${hx - 34}" cy="${hy - 12}" r="13" fill="#2B1B10"/><circle cx="${hx + 34}" cy="${hy - 12}" r="13" fill="#2B1B10"/><circle cx="${hx - 30}" cy="${hy - 17}" r="4" fill="#fff"/><circle cx="${hx + 38}" cy="${hy - 17}" r="4" fill="#fff"/><path d="M${hx - 10} ${hy + 20}h20l-10 12z" fill="#E58C95"/><path d="M${hx} ${hy + 32}q-16 20 -34 6M${hx} ${hy + 32}q16 20 34 6" fill="none" stroke="#2B1B10" stroke-width="4" stroke-linecap="round"/>`;
}
export function sceneE(t, out) {
  const furP = eo(seg(t, 33.2, 35.0)), airA = eio(seg(t, 36.0, 37.2));
  const k1 = pop(t, 32.9, 0.5);
  let w = bgRoom() + `<g opacity="${f1(clamp(k1) * (1 - clamp((t - 37.9) / 0.3)))}">${cat(t, 540, 610, furP)}</g>`;
  w += panel(t, 540, 1110, { id: 'pA', n: 34, len: 195, sw: 7, col: '#8D6B4A', sd: 1, airH: 150, airA, heatA: seg(t, 35.0, 35.6) * 1, blockAt: true, p: (i, tt) => 0.15 + 0.85 * eo(seg(tt, 33.4 + 0.05 * (i % 6), 34.9)) });
  const kh = pop(t, 38.1, 0.5);
  let cover = '';
  if (t >= 38.0) {
    const op = clamp((t - 38.0) / 0.3);
    cover = `<g opacity="${f1(op)}"><g transform="translate(540 660) scale(${f1(0.5 + 0.5 * clamp(kh))}) translate(-540 -660)">${panel(t, 540, 660, { id: 'pH', n: 5, len: 110, sw: 5, col: SK.hair, sd: 9, airH: 44, airA: eio(seg(t, 42.2, 43.2)), heatA: seg(t, 43.0, 43.6), blockAt: false, p: (i, tt) => 0.1 + 0.55 * eio(seg(tt, 38.6 + 0.2 * i, 40.6 + 0.2 * i)) })}</g></g>`;
  }
  out.A += w + cover;
  const hum = t >= 38.1;
  out.U += chip(['HEWAN', 'BERBULU TEBAL'], t, 32.8, 35.9, { size: 60, bg: '#fff' }) + chip(['LAPISAN UDARA', 'TERTAHAN'], t, 35.9, 38.1, { size: 58, bg: SK.air, fg: INK })
    + chip(['MANUSIA: MASIH', 'ADA RESPONS'], t, 38.1, 42.3, { size: 54, bg: '#fff' }) + chip(['RAMBUT TUBUH', 'RELATIF SEDIKIT'], t, 42.3, 44.1, { size: 56, bg: '#fff' }) + chip(['BUKAN CARA UTAMA', 'MENGHANGATKAN'], t, 44.1, 47.0, { size: 56, bg: '#FFF2C7', fg: INK });
  out.U += tag('rambut tegak menahan udara', 540, 880, ka(t, 36.1, 38.0, 0.25), { size: 28, bg: '#fff' }) + tag('panas tertahan dekat kulit', 540, 955, ka(t, 36.6, 38.0, 0.25), { size: 28, bg: '#FFF2C7', fg: INK });
  if (hum) out.U += tag('rambut jarang, lapisan udara tipis', 540, 885, ka(t, 42.4, 47.0, 0.25), { size: 28, bg: '#fff' }) + tag('panas mudah lepas', 540, 505, ka(t, 43.4, 47.0, 0.25), { size: 28, bg: '#FFF2C7', fg: INK }) + tag('Hewan berbulu tebal', 880, 935, ka(t, 38.3, 47.0, 0.3), { size: 24, bg: '#fff' });
  out.U += tag('Ilustrasi edukatif', 905, 1425, 1, { size: 24, bg: '#fff' });
}

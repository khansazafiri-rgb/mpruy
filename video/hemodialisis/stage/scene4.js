// ADEGAN 4 (64,0 - 78,84 dtk): dialisis tidak menggantikan seluruh pekerjaan ginjal dan tidak menyembuhkan penyebabnya (diagram); lalu kendalikan gula darah dan tekanan darah, periksa fungsi ginjal bila berisiko (Raka mengerti).
import { f1, clamp, lerp, sm, eo, eob, eio, seg, win, MC, FONT } from './core.js';
import * as A from './art.js';
import { raka, rakaSvg, rIdle, solveArm, rakaBody } from './raka.js';

const card = (x, y, w, h, a, inner, hi = 0) => `<g opacity="${f1(a)}" transform="translate(${f1(x + w / 2)} ${f1(y + h / 2)}) scale(${f1(0.92 + 0.08 * Math.min(1, a) + 0.03 * hi)}) translate(${f1(-(x + w / 2))} ${f1(-(y + h / 2))})"><rect x="${x + 6}" y="${y + 10}" width="${w}" height="${h}" rx="40" fill="#021014" opacity=".35"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="40" fill="#0A2A33" stroke="${hi > 0.05 ? MC.gold : MC.ivory}" stroke-width="${hi > 0.05 ? 7 : 3}"/>${inner}</g>`;
const cap = (x, y, txt, fs = 40) => `<text x="${x}" y="${y}" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="${fs}" fill="${MC.ivory}">${txt}</text>`;
const hex = (x, y, r) => `<path transform="translate(${f1(x)} ${f1(y)})" d="${Array.from({ length: 6 }, (_, i) => { const a = (i / 6) * Math.PI * 2 - Math.PI / 2; return `${i ? 'L' : 'M'}${f1(Math.cos(a) * r)} ${f1(Math.sin(a) * r)}`; }).join('')}Z" fill="#FFD25A" stroke="#9A6A08" stroke-width="${f1(r * 0.16)}" stroke-linejoin="round"/>`;

// ---- 64,0 - 70,1: bukan pengganti penuh dan bukan penyembuh
export function limits(t) {
  const a = seg(t, 64.2, 64.9) * (1 - seg(t, 69.9, 70.5)); if (a <= 0.01) return '';
  let g = `<g opacity="${f1(a)}">`;
  // ginjal (dominan) dengan "pekerjaan ginjal" terbagi: sebagian digantikan dialisis, sisanya tidak
  g += `<g transform="translate(540 850) scale(1.3)">${A.kidney({ fn: 0.55, cut: 1, id: 'k4', glow: 0 })}</g>`;
  const u = seg(t, 65.0, 66.6, eio), v = seg(t, 66.6, 67.6, eo);
  const bx = 120, by = 1240, bw = 840, bh = 74;
  g += `<text x="${bx}" y="${by - 20}" font-family="${FONT}" font-weight="800" font-size="36" fill="${MC.ivory}">Pekerjaan ginjal</text><rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="37" fill="#06202A" stroke="${MC.ivory}" stroke-width="4"/>`;
  g += `<clipPath id="lbar"><rect x="${bx + 5}" y="${by + 5}" width="${bw - 10}" height="${bh - 10}" rx="32"/></clipPath><g clip-path="url(#lbar)"><rect x="${bx + 5}" y="${by + 5}" width="${f1((bw - 10) * 0.42 * u)}" height="${bh - 10}" fill="${A.COL.dial}"/><g opacity="${f1(v)}"><rect x="${f1(bx + 5 + (bw - 10) * 0.42)}" y="${by + 5}" width="${f1((bw - 10) * 0.58)}" height="${bh - 10}" fill="#394B52"/>${Array.from({ length: 22 }, (_, i) => `<path d="M${f1(bx + 5 + (bw - 10) * 0.42 + i * 38)} ${by + bh}l30 -${bh}" stroke="#8FA3AA" stroke-width="5" opacity=".6"/>`).join('')}</g></g>`;
  g += `<text x="${f1(bx + 5 + (bw - 10) * 0.21)}" y="${by + 50}" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="30" fill="#06202A" opacity="${f1(u)}">dialisis</text>`;
  g += `<text x="${f1(bx + 5 + (bw - 10) * 0.71)}" y="${by + 50}" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="30" fill="${MC.ivory}" opacity="${f1(v)}">tidak digantikan</text>`;
  // penyebab tetap ada: ikon diabetes (glukosa) dan tekanan darah tinggi (dial) dengan tanda "tidak sembuh"
  const w = seg(t, 68.2, 68.9, eo), cx1 = 330, cx2 = 750, cy = 1560;
  if (w > 0.01) {
    g += `<g opacity="${f1(w)}">${[cx1, cx2].map((x) => `<circle cx="${x}" cy="${cy}" r="108" fill="#0A2A33" stroke="${MC.ivory}" stroke-width="4"/>`).join('')}${[0, 1, 2, 3, 4].map((i) => hex(cx1 - 52 + (i % 3) * 52, cy - 26 + Math.floor(i / 3) * 56, 22)).join('')}`
      + `<path d="M${cx2 - 66} ${cy + 26}A72 72 0 0 1 ${cx2 + 66} ${cy + 26}" fill="none" stroke="#FFB38A" stroke-width="14" stroke-linecap="round"/><path d="M${cx2} ${cy + 26}L${cx2 + 36} ${cy - 30}" stroke="${MC.ivory}" stroke-width="9" stroke-linecap="round"/><circle cx="${cx2}" cy="${cy + 26}" r="12" fill="${MC.gold}" stroke="${MC.ink}" stroke-width="3"/>`
      + `<text x="${cx1}" y="${cy + 160}" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="30" fill="${MC.ivory}">diabetes</text><text x="${cx2}" y="${cy + 160}" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="30" fill="${MC.ivory}">tekanan darah tinggi</text>`
      + `<g transform="translate(540 ${cy - 10})"><circle r="58" fill="#E8665F" stroke="${MC.ink}" stroke-width="5"/><path d="M-26 -26L26 26M26 -26L-26 26" stroke="#fff" stroke-width="12" stroke-linecap="round"/></g></g>`;
  }
  g += '</g>';
  const L = [[65.2, 67.9, 'Tidak menggantikan\nseluruh pekerjaan ginjal', [540, 1210], [540, 380]], [68.3, 70.0, 'Penyebab tidak\ndisembuhkan', [540, 1480], [540, 1010]]];
  L.forEach(([t0, t1, txt, anc, pos]) => { const al = seg(t, t0, t0 + 0.3, eo) * (1 - seg(t, t1 - 0.3, t1)); if (al > 0.01) g += A.chip(anc[0], anc[1], txt, { cx: pos[0], cy: pos[1], a: al, noLine: true, fs: 34 }); });
  return g;
}
// ---- 70,1 - 78,84: tiga tindakan pencegahan + Raka mengerti
const POSE = (t) => ({ expr: t < 75.0 ? 'mengerti' : 'senang' });
function iconSugar(x, y, k) { return `<g transform="translate(${x} ${y}) scale(${k})">${A.dropSvg ? '' : ''}<path d="M0 -62C18 -30 46 -10 46 22A46 46 0 0 1 -46 22C-46 -10 -18 -30 0 -62Z" fill="url(#gBlood)" stroke="${MC.ink}" stroke-width="4"/>${hex(14, 18, 16)}${hex(-14, 30, 12)}</g>`; }
function iconBP(x, y, k) { return `<g transform="translate(${x} ${y}) scale(${k})"><circle r="62" fill="#F7F2E4" stroke="${MC.ink}" stroke-width="5"/><path d="M-46 22A52 52 0 0 1 46 22" fill="none" stroke="#6EE0B8" stroke-width="12" stroke-linecap="round"/><path d="M0 22L30 -22" stroke="${MC.ink}" stroke-width="8" stroke-linecap="round"/><circle cy="22" r="10" fill="${MC.gold}" stroke="${MC.ink}" stroke-width="3"/><rect x="-60" y="62" width="120" height="22" rx="11" fill="#4F7FE0" stroke="${MC.ink}" stroke-width="4"/></g>`; }
function iconKid(x, y, k) { return `<g transform="translate(${x} ${y}) scale(${k})"><g transform="scale(.2)">${A.kidney({ fn: 1, cut: 1, id: 'k5', shadow: false })}</g><g transform="translate(44 40)"><circle r="30" fill="none" stroke="${MC.ivory}" stroke-width="9"/><path d="M22 22L50 50" stroke="${MC.ivory}" stroke-width="11" stroke-linecap="round"/></g></g>`; }
export function actions(t) {
  const a0 = seg(t, 70.0, 70.7) * (1 - seg(t, 79.5, 80)); if (a0 <= 0.01) return '';
  const a1 = seg(t, 72.9, 73.5, eob), a2 = seg(t, 74.05, 74.65, eob), a3 = seg(t, 75.6, 76.2, eob);
  const hi = (u0, u1) => win(t, u0, u1, 0.2);
  let g = `<g opacity="${f1(a0)}">`;
  // tahap 1 (70,16 - 72,6): ginjal sehat dilindungi
  const s0 = seg(t, 70.2, 70.9, eo) * (1 - seg(t, 72.7, 73.3));
  if (s0 > 0.01) g += `<g opacity="${f1(s0)}" transform="translate(540 650)"><g transform="scale(1.1)">${A.kidney({ fn: 1, cut: 1, id: 'k6' })}</g><path d="M0 -330C90 -300 170 -290 230 -300V-130C230 0 140 90 0 150C-140 90 -230 0 -230 -130V-300C-170 -290 -90 -300 0 -330Z" fill="none" stroke="${MC.gold}" stroke-width="12" opacity=".0"/></g>`;
  g += card(90, 250, 900, 190, a1, `${iconSugar(210, 345, 1.05)}${cap(640, 372, 'Kendalikan gula darah', 46)}`, hi(72.9, 74.0));
  g += card(90, 470, 900, 190, a2, `${iconBP(210, 565, 1.05)}${cap(640, 592, 'Kendalikan tekanan darah', 46)}`, hi(74.05, 75.5));
  g += card(90, 690, 900, 190, a3, `${iconKid(210, 785, 1.1)}${cap(640, 812, 'Periksa fungsi ginjal', 46)}`, hi(75.6, 77.0));
  const r = seg(t, 77.0, 77.5, eo); if (r > 0.01) g += `<g opacity="${f1(r)}">${A.tag(540, 940, 'jika punya faktor risiko', { fs: 36, bg: MC.gold, fg: MC.ink, stroke: MC.ink })}</g>`;
  return g + '</g>';
}
export function raka4(t) {
  const st0 = raka(POSE(t).expr, 'netral', { yaw: 0, gazeX: 0, gazeY: -0.3 });
  const st = rIdle(st0, t);
  const hp = t < 72.9 ? [330, 480] : t < 74.0 ? [372, 400] : t < 75.6 ? [376, 380] : [378, 372];
  st.armR = solveArm(st, 'R', hp, { finger: t >= 72.9 ? 1 : 0, fa: -62, front: 1, len: 160 });
  st.armL = solveArm(st, 'L', [90, 520], { finger: 0, front: 1, len: 150 });
  const k = 1.28, X = 540, FY = 1920 + 20;
  return `<g transform="translate(${f1(X - 200 * k)} ${f1(FY - 778 * k)}) scale(${k})">${rakaBody(st, 'rk4', { dark: true })}</g>`;
}

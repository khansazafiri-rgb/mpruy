// Model kanalis semisirkular (tampak atas, orientasi tetap di seluruh video) + pembesaran kupula/sel rambut + jalur sinyal ke otak.
// Warna tetap: koral = gerak KEPALA/dinding (searah jarum jam), biru = gerak CAIRAN, emas = kupula, merah muda = sel rambut, teal = sinyal saraf.
import { f1, clamp, lerp, sm, eo, K, T, tw, op, pathPt } from './common.js';
import { wallV, fluidV, wallTh, fluidTh, bendDeg, PULSES, TRAVEL, flash } from './model.js';
const rad = (d) => d * Math.PI / 180;
export const RC = [540, 640], RM = 175, TW = 33;               // pusat cincin, jari-jari tengah tabung, setengah lebar tabung
const AMP = 126;                                                // sudut ampula (derajat, saat dinding diam)
const pol = (a, r = RM, c = RC) => [c[0] + r * Math.cos(rad(a)), c[1] + r * Math.sin(rad(a))];
const arcD = (a0, a1, r = RM) => { const [x0, y0] = pol(a0, r), [x1, y1] = pol(a1, r); return `M${f1(x0)} ${f1(y0)}A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${f1(x1)} ${f1(y1)}`; };
/** garis tengah kupula dari dasar (px,py) naik setinggi H, membengkok bend derajat di ujung; mengembalikan titik + pita */
export function cupulaShape(px, py, H, bend, w0, w1, n = 16) {
  const pts = []; let x = px, y = py; const ds = H / n;
  for (let i = 0; i <= n; i++) { const s = i / n, ph = rad(bend) * s; pts.push({ x, y, ph, s, w: lerp(w0, w1, s) }); x += Math.sin(ph) * ds; y -= Math.cos(ph) * ds; }
  const L = pts.map((p) => [p.x - Math.cos(p.ph) * p.w / 2, p.y - Math.sin(p.ph) * p.w / 2]), Rr = pts.map((p) => [p.x + Math.cos(p.ph) * p.w / 2, p.y + Math.sin(p.ph) * p.w / 2]).reverse();
  const d = 'M' + L.concat(Rr).map((p) => `${f1(p[0])} ${f1(p[1])}`).join('L') + 'Z';
  return { pts, d };
}
// ------------------------------------------------------------------ kepala dari atas (glif): hidung = arah muka
function headGlyph(x, y, th, s = 1) {
  return `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(th)}) scale(${s})"><ellipse cx="0" cy="6" rx="64" ry="30" fill="#1D7B75"/><ellipse cx="-50" cy="0" rx="9" ry="16" fill="#F7BC8E"/><ellipse cx="50" cy="0" rx="9" ry="16" fill="#F7BC8E"/><path d="M-11 40L0 62L11 40Z" fill="#F7BC8E" transform="translate(0 -4)"/><circle cx="0" cy="0" r="46" fill="#212739"/><path d="M-26 -14C-12 -34 14 -34 28 -14" fill="none" stroke="#2F3858" stroke-width="6" stroke-linecap="round"/><path d="M-12 22L0 40L12 22Z" fill="#F7BC8E"/></g>`;
}
export { headGlyph };
// ------------------------------------------------------------------ busur panah
function arcArrow(c, r, a0, a1, col, colD, wdt = 12, ccw = false) {
  const [x0, y0] = pol(a0, r, c), [x1, y1] = pol(a1, r, c), ca = Math.cos(rad(a1)), sa = Math.sin(rad(a1)), hl = 28, hw = 22;
  const sg = ccw ? -1 : 1, tx = -sa * sg, ty = ca * sg, bx = x1 - tx * 4, by = y1 - ty * 4;          // singgung (searah jarum jam bila ccw = false)
  const d = `M${f1(x0)} ${f1(y0)}A${r} ${r} 0 ${Math.abs(a1 - a0) > 180 ? 1 : 0} ${ccw ? 0 : 1} ${f1(bx)} ${f1(by)}`;
  const head = `M${f1(x1 + ca * hw)} ${f1(y1 + sa * hw)}L${f1(x1 + tx * hl)} ${f1(y1 + ty * hl)}L${f1(x1 - ca * hw)} ${f1(y1 - sa * hw)}Z`;
  return `<path d="${d}" fill="none" stroke="#000" stroke-opacity=".22" stroke-width="${wdt + 5}" stroke-linecap="round" transform="translate(0 4)"/><path d="${d}" fill="none" stroke="${col}" stroke-width="${wdt}" stroke-linecap="butt"/><path d="${head}" fill="${col}" stroke="${colD}" stroke-width="3" stroke-linejoin="round"/>`;
}
export { arcArrow };
// ------------------------------------------------------------------ cincin saluran (tampak atas)
export function ringSvg(t, o = {}) {
  const th = wallTh(t), tf = fluidTh(t), ww = wallV(t), wf = fluidV(t), bd = bendDeg(t), a = o.a ?? 1;
  const gap0 = 76, gap1 = 104, A0 = gap1, A1 = gap0 + 360;
  const arc = arcD(A0, A1);
  let rot = `<g transform="rotate(${f1(th)} ${RC[0]} ${RC[1]})">`;
  // vestibulum (ruang penghubung) di celah
  const vb = pol(90, RM + 2);
  rot += `<ellipse cx="${f1(vb[0])}" cy="${f1(vb[1])}" rx="70" ry="44" fill="${K.wallD}"/><ellipse cx="${f1(vb[0])}" cy="${f1(vb[1])}" rx="62" ry="37" fill="${K.wall}"/><ellipse cx="${f1(vb[0])}" cy="${f1(vb[1])}" rx="48" ry="25" fill="${K.fluid}"/>`;
  rot += `<path d="${arc}" fill="none" stroke="${K.wallD}" stroke-width="${2 * TW + 8}" stroke-linecap="round"/><path d="${arc}" fill="none" stroke="${K.wall}" stroke-width="${2 * TW}" stroke-linecap="round"/><path d="${arc}" fill="none" stroke="${K.fluid}" stroke-width="${2 * TW - 20}" stroke-linecap="round"/>`;
  // ampula (pembesaran di salah satu ujung) + kupula kecil
  const ap = pol(AMP, RM);
  rot += `<circle cx="${f1(ap[0])}" cy="${f1(ap[1])}" r="${TW + 14}" fill="${K.wallD}"/><circle cx="${f1(ap[0])}" cy="${f1(ap[1])}" r="${TW + 8}" fill="${K.wall}"/><circle cx="${f1(ap[0])}" cy="${f1(ap[1])}" r="${TW - 6}" fill="${K.fluid}"/>`;
  // tanda dinding (koral) bergerak bersama dinding: titik-titik di tepi luar
  rot += `<path d="${arcD(A0 + 4, A1 - 4, RM + TW + 1)}" fill="none" stroke="${K.head}" stroke-width="9" stroke-linecap="round" stroke-dasharray="1 30" opacity=".95"/>`;
  rot += `</g>`;
  // kupula kecil pada ampula (bingkai lokal: x = arah gerak searah jarum jam, atas = keluar)
  const aa = AMP + th, pin = pol(aa, RM - TW + 6), beta = aa + 90;
  const cs = cupulaShape(0, 0, 50, bd * 1.3, 24, 14, 10);
  rot += '';
  const cup = `<g transform="translate(${f1(pin[0])} ${f1(pin[1])}) rotate(${f1(beta)})"><path d="${cs.d}" fill="${K.cup}" stroke="${K.cupD}" stroke-width="3" stroke-linejoin="round"/></g>`;
  // titik cairan (biru) mengikuti cairan, bukan dinding
  let dots = '';
  for (let i = 0; i < 12; i++) { const ang = i * 30 + tf, [x, y] = pol(ang, RM - 4); dots += `<circle cx="${f1(x)}" cy="${f1(y)}" r="8.5" fill="${K.flow}" stroke="#fff" stroke-width="3"/>`; }
  // penanda acuan diam (segitiga abu di atas cincin)
  const ref = `<path d="M${RC[0] - 14} ${RC[1] - RM - TW - 30}L${RC[0] + 14} ${RC[1] - RM - TW - 30}L${RC[0]} ${RC[1] - RM - TW - 10}Z" fill="#8A96A3" opacity=".0"/>`;
  const gl = headGlyph(RC[0], RC[1], th, 1);
  const arrH = op(clamp(ww * 2.2), arcArrow(RC, 100, 200, 200 + 70 + 40 * ww, K.head, K.headD, 13));
  const arrF = op(clamp(wf * 2.2), arcArrow(RC, 230, -78, -78 + 40 + 40 * wf, K.flow, K.flowD, 13));
  return `<g opacity="${f1(a * 100) / 100}">${rot}${cup}${dots}${gl}${arrH}${arrF}${ref}</g>`;
}
/** lingkaran sorot emas di ampula */
export function ampHi(t, a) {
  if (a <= 0.01) return ''; const p = pol(AMP + wallTh(t), RM);
  return `<circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="${TW + 26}" fill="none" stroke="${K.gold}" stroke-width="8" opacity="${f1(a * 100) / 100}" stroke-dasharray="14 10"/>`;
}
// ------------------------------------------------------------------ panel pembesaran: kupula + sel rambut (bingkai: kanan = arah gerak searah jarum jam)
export const PN = { x: 60, y: 905, w: 890, h: 378 };
const LU = { y0: 972, y1: 1096 }, FLOORY = 1096, CX0 = 510;
export function panelSvg(t, a, o = {}) {
  if (a <= 0.01) return ''; const ww = wallV(t), wf = fluidV(t), th = wallTh(t), tf = fluidTh(t), bd = bendDeg(t);
  const V = 1.35, x0 = PN.x + 16, x1 = PN.x + PN.w - 16;
  let s = `<rect x="${PN.x + 5}" y="${PN.y + 12}" width="${PN.w}" height="${PN.h}" rx="40" fill="rgba(0,0,0,.24)"/><rect x="${PN.x}" y="${PN.y}" width="${PN.w}" height="${PN.h}" rx="40" fill="#FBF8EE" stroke="#fff" stroke-width="4"/>`;
  s += `<clipPath id="pc"><rect x="${PN.x + 8}" y="${PN.y + 8}" width="${PN.w - 16}" height="${PN.h - 16}" rx="34"/></clipPath><g clip-path="url(#pc)">`;
  // dinding atas dan bawah (mauve) + tanda koral bergeser bersama dinding
  s += `<rect x="${PN.x}" y="${LU.y0 - 40}" width="${PN.w}" height="40" fill="${K.wall}"/><rect x="${PN.x}" y="${LU.y0 - 6}" width="${PN.w}" height="6" fill="${K.wallD}"/><rect x="${PN.x}" y="${LU.y1}" width="${PN.w}" height="44" fill="${K.wall}"/><rect x="${PN.x}" y="${LU.y1}" width="${PN.w}" height="6" fill="${K.wallD}"/>`;
  s += `<rect x="${PN.x}" y="${LU.y0}" width="${PN.w}" height="${LU.y1 - LU.y0}" fill="${K.fluid}"/>`;
  const sp = 64, off = ((th * V) % sp + sp) % sp;
  for (let i = -1; i < PN.w / sp + 2; i++) { const x = PN.x + i * sp + off; s += `<rect x="${f1(x)}" y="${LU.y0 - 30}" width="12" height="20" rx="6" fill="${K.head}"/><rect x="${f1(x)}" y="${LU.y1 + 14}" width="12" height="20" rx="6" fill="${K.head}"/>`; }
  // aliran cairan (garis biru pendek) bergeser dengan kecepatan cairan
  const sp2 = 96, off2 = ((tf * V) % sp2 + sp2) % sp2;
  for (const [yy, ph] of [[LU.y0 + 24, 0], [LU.y0 + 62, 48], [LU.y0 + 100, 20]]) for (let i = -1; i < PN.w / sp2 + 2; i++) { const x = PN.x + i * sp2 + off2 + ph; s += `<path d="M${f1(x)} ${yy}h34" stroke="${K.flow}" stroke-width="9" stroke-linecap="round"/><path d="M${f1(x + 34)} ${yy - 8}l10 8l-10 8" fill="none" stroke="${K.flow}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`; }
  // dasar sensor: gundukan + sel rambut
  s += `<rect x="${CX0 - 92}" y="${FLOORY - 8}" width="184" height="90" rx="26" fill="${K.cellD}" opacity=".35"/>`;
  const offs = [-56, -28, 0, 28, 56];
  for (const ox of offs) s += `<rect x="${CX0 + ox - 11}" y="${FLOORY}" width="22" height="58" rx="11" fill="${K.cell}" stroke="${K.cellD}" stroke-width="3"/>`;
  // serat saraf ke bawah
  for (const ox of offs) s += `<path d="M${CX0 + ox} ${FLOORY + 58}Q${CX0 + ox} ${FLOORY + 84} ${CX0} ${FLOORY + 96}" fill="none" stroke="${K.sigD}" stroke-width="3.5" stroke-linecap="round"/>`;
  // kupula (tirai gel) + stereosilia
  const H = FLOORY - LU.y0 + 4, cs = cupulaShape(CX0, FLOORY, H, bd * 1.6, 118, 86, 18);
  s += `<path d="${cs.d}" fill="${K.cup}" stroke="${K.cupD}" stroke-width="5" stroke-linejoin="round" opacity=".95"/>`;
  for (const ox of offs) { const k = cs.pts.filter((p) => p.s <= 0.55).map((p) => [p.x + Math.cos(p.ph) * ox * (1 - p.s * 1.1), p.y + Math.sin(p.ph) * ox * (1 - p.s * 1.1)]); s += `<path d="M${k.map((p) => `${f1(p[0])} ${f1(p[1])}`).join('L')}" fill="none" stroke="#7A5A00" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`; }
  s += `</g>`;
  return `<g opacity="${f1(a * 100) / 100}" transform="translate(0 ${f1((1 - eo(a)) * 60)})">${s}</g>`;
}
export const cupPt = (t) => { const bd = bendDeg(t), H = FLOORY - LU.y0 + 4, c = cupulaShape(CX0, FLOORY, H, bd * 1.6, 118, 86, 18); return c.pts; };
// ------------------------------------------------------------------ jalur saraf + otak
export const NERVE = `M${CX0} ${FLOORY + 96 + 8}L${CX0} 1246L992 1246L992 432L970 432`;
export const BRAIN = [895, 410];
export function brainSvg(t, a) {
  if (a <= 0.01) return ''; const [x, y] = BRAIN, fl = clamp(flash(t)), s = 1;
  const lobe = `M${x - 70} ${y + 8}C${x - 88} ${y - 30} ${x - 52} ${y - 58} ${x - 18} ${y - 48}C${x - 4} ${y - 64} ${x + 38} ${y - 62} ${x + 50} ${y - 38}C${x + 84} ${y - 36} ${x + 92} ${y + 4} ${x + 66} ${y + 24}C${x + 70} ${y + 50} ${x + 30} ${y + 58} ${x + 12} ${y + 42}C${x - 4} ${y + 60} ${x - 44} ${y + 56} ${x - 48} ${y + 32}C${x - 66} ${y + 34} ${x - 78} ${y + 22} ${x - 70} ${y + 8}Z`;
  return `<g opacity="${f1(a * 100) / 100}"><circle cx="${x}" cy="${y}" r="${f1(88 + 12 * fl)}" fill="${K.sig}" opacity="${f1(0.45 * fl * 100) / 100}"/><path d="${lobe}" fill="${fl > 0.05 ? K.brain : K.brain}" stroke="${K.brainD}" stroke-width="6" stroke-linejoin="round"/><path d="M${x - 40} ${y - 18}C${x - 22} ${y - 6} ${x - 28} ${y + 14} ${x - 10} ${y + 22}M${x + 8} ${y - 36}C${x + 4} ${y - 12} ${x + 22} ${y - 4} ${x + 18} ${y + 20}M${x + 44} ${y - 12}C${x + 36} ${y + 2} ${x + 52} ${y + 14} ${x + 40} ${y + 32}" fill="none" stroke="${K.brainD}" stroke-width="5" stroke-linecap="round"/></g>`;
}
export function nerveSvg(t, a) {
  if (a <= 0.01) return ''; let s = `<g opacity="${f1(a * 100) / 100}"><path d="${NERVE}" fill="none" stroke="#000" stroke-opacity=".18" stroke-width="14" stroke-linejoin="round" stroke-linecap="round" transform="translate(0 4)"/><path d="${NERVE}" fill="none" stroke="#C9D6D4" stroke-width="10" stroke-linejoin="round" stroke-linecap="round"/>`;
  for (const p of PULSES) { const d = t - p; if (d < 0 || d > TRAVEL) continue; const u = d / TRAVEL, q = pathPt(NERVE, u); s += `<circle cx="${f1(q.x)}" cy="${f1(q.y)}" r="17" fill="${K.sig}" opacity=".35"/><circle cx="${f1(q.x)}" cy="${f1(q.y)}" r="10" fill="${K.sig}" stroke="#fff" stroke-width="3"/>`; }
  return s + `</g>`;
}
// ------------------------------------------------------------------ dua gambar kecil: sebelum / sesudah berhenti (hanya fase berhenti)
export function miniCard(x, y, w, h, title, kind, t, a) {
  if (a <= 0.01) return ''; const cx = x + w / 2, fy = y + h - 52, ph = kind === 'before' ? 32.3 : t, bd = bendDeg(ph), wv = kind === 'before' ? 1 : wallV(t), fv = kind === 'before' ? 1 : fluidV(t);
  let s = `<rect x="${x + 4}" y="${y + 10}" width="${w}" height="${h}" rx="30" fill="rgba(0,0,0,.24)"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="30" fill="#FBF8EE" stroke="#fff" stroke-width="3"/>`;
  s += T(title[0], cx, y + 40, { size: 30, fill: '#0A3830' }) + T(title[1], cx, y + 74, { size: 30, fill: '#0A3830' });
  const ly0 = y + 100, ly1 = fy; const wallY0 = ly0 - 14, wallY1 = ly1 + 14;
  s += `<clipPath id="mc${kind}"><rect x="${x + 10}" y="${y + 84}" width="${w - 20}" height="${h - 94}" rx="20"/></clipPath><g clip-path="url(#mc${kind})"><rect x="${x}" y="${ly0}" width="${w}" height="${ly1 - ly0}" fill="${K.fluid}"/><rect x="${x}" y="${wallY0}" width="${w}" height="14" fill="${K.wall}"/><rect x="${x}" y="${ly1}" width="${w}" height="26" fill="${K.wall}"/>`;
  const cs = cupulaShape(cx, ly1, ly1 - ly0 + 2, bd * 1.55, 70, 34, 12);
  s += `<path d="${cs.d}" fill="${K.cup}" stroke="${K.cupD}" stroke-width="4" stroke-linejoin="round"/>`;
  for (const ox of [-22, 0, 22]) s += `<rect x="${cx + ox - 7}" y="${ly1}" width="14" height="22" rx="7" fill="${K.cell}" stroke="${K.cellD}" stroke-width="2.5"/>`;
  s += `</g>`;
  // panah: koral = dinding, biru = cairan (arah dan warna sama dengan model besar)
  const top = y + 100;
  s += (wv > 0.05 ? `<path d="M${x + 24} ${y + h - 22}h${f1(70 * wv)}" stroke="${K.head}" stroke-width="10" stroke-linecap="round"/><path d="M${f1(x + 24 + 70 * wv)} ${y + h - 34}l16 12l-16 12Z" fill="${K.head}"/>` : `<rect x="${x + 24}" y="${y + h - 32}" width="22" height="22" rx="4" fill="${K.head}"/>`);
  s += `<path d="M${x + w / 2 + 8} ${y + h - 22}h${f1(70 * fv)}" stroke="${K.flow}" stroke-width="10" stroke-linecap="round"/><path d="M${f1(x + w / 2 + 8 + 70 * fv)} ${y + h - 34}l16 12l-16 12Z" fill="${K.flow}"/>`;
  return `<g opacity="${f1(a * 100) / 100}" transform="translate(${f1((1 - eo(a)) * -80)} 0)">${s}</g>`;
}

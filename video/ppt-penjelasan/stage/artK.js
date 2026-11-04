// Properti datar untuk "Kok dia sekali dengar langsung paham?". Koordinat kanvas 1080 x 1920. Semua ilustrasi buatan (bukan data, bukan hasil studi).
// Tampilan produk MEDCOEL TIDAK digambar di sini: semuanya rekaman layar asli (lihat stage.js, panel()).
import { R, C, E, P, L, T, f1, clamp, COL } from './art.js';

const sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };

// ---------------------------------------------------------------- ruang kelas FK
export function classBg(t) {
  let s = R(-100, -100, 1300, 1300, '#DCEBE6') + R(-100, 1000, 1300, 1000, '#C9A27A') + R(-100, 992, 1300, 14, '#A9855F');
  // jendela kanan dengan langit biru dan awan bergerak pelan
  s += `<g transform="translate(940 560)">${R(-110, -210, 220, 300, '#9ED8F0', 14)}${E(-10 + Math.sin(t * 0.4) * 14, -90, 54, 22, 'rgba(255,255,255,.9)')}${E(30 + Math.sin(t * 0.4) * 14, -70, 40, 18, 'rgba(255,255,255,.9)')}${R(-110, -210, 220, 300, 'none', 14, 'stroke="#fff" stroke-width="12"')}${R(-4, -210, 8, 300, '#fff')}</g>`;
  // lampu langit-langit
  s += R(300, -10, 480, 22, '#fff', 11, 'opacity=".75"');
  return s;
}
// papan tulis dengan diagram rumit (sengaja kusut: panah, kotak, tanda tanya, rumus abstrak)
export function board(x, y, w, h, t, o = {}) {
  const k = o.k ?? 1;
  let s = `<g transform="translate(${f1(x)} ${f1(y)})">${R(-6, 10, w + 12, h + 12, 'rgba(0,0,0,.18)', 22)}${R(-12, -12, w + 24, h + 24, '#9AA9B0', 22)}${R(0, 0, w, h, '#F7FAF8', 14)}`;
  const ink = ['#1D7B75', '#E8665F', '#3B4A8C', '#8E7CE8'];
  const box = (bx, by, bw, bh, c, i) => R(bx, by, bw, bh, 'none', 14, `stroke="${c}" stroke-width="5"`) + L(`M${bx + 16} ${by + bh * 0.4}h${bw - 32}M${bx + 16} ${by + bh * 0.7}h${(bw - 32) * 0.6}`, c, 4, 'opacity=".7"');
  s += box(w * 0.06, h * 0.12, w * 0.28, h * 0.22, ink[0], 0) + box(w * 0.38, h * 0.08, w * 0.24, h * 0.2, ink[1], 1) + box(w * 0.68, h * 0.14, w * 0.26, h * 0.24, ink[2], 2);
  s += box(w * 0.1, h * 0.58, w * 0.24, h * 0.24, ink[2], 3) + box(w * 0.46, h * 0.52, w * 0.2, h * 0.26, ink[0], 4) + box(w * 0.74, h * 0.6, w * 0.2, h * 0.24, ink[1], 5);
  const arr = (d, c) => L(d, c, 5, 'stroke-dasharray="14 10"');
  s += arr(`M${w * 0.34} ${h * 0.2}C${w * 0.36} ${h * 0.18} ${w * 0.37} ${h * 0.18} ${w * 0.38} ${h * 0.18}`, ink[3]) + arr(`M${w * 0.62} ${h * 0.2}L${w * 0.68} ${h * 0.24}`, ink[3]);
  s += arr(`M${w * 0.2} ${h * 0.34}C${w * 0.18} ${h * 0.46} ${w * 0.2} ${h * 0.5} ${w * 0.22} ${h * 0.58}`, ink[3]) + arr(`M${w * 0.5} ${h * 0.28}C${w * 0.5} ${h * 0.38} ${w * 0.54} ${h * 0.44} ${w * 0.56} ${h * 0.52}`, ink[3]);
  s += arr(`M${w * 0.34} ${h * 0.7}L${w * 0.46} ${h * 0.64}`, ink[3]) + arr(`M${w * 0.66} ${h * 0.66}L${w * 0.74} ${h * 0.7}`, ink[3]) + arr(`M${w * 0.8} ${h * 0.38}C${w * 0.86} ${h * 0.46} ${w * 0.84} ${h * 0.54} ${w * 0.82} ${h * 0.6}`, ink[3]);
  s += T(w * 0.05, h * 0.5, 'Σ', ink[2], 46, '', 'start') + T(w * 0.9, h * 0.52, 'Δ', ink[1], 40, '', 'start') + T(w * 0.43, h * 0.93, '→ ? →', ink[0], 36, '', 'start');
  s += `</g>`;
  return s;
}
export const deskTop = (y = 1196) => `<defs><linearGradient id="dtg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C98F5E"/><stop offset="1" stop-color="#B3744A"/></linearGradient></defs>${R(-100, y, 1300, 96, 'url(#dtg)')}${R(-100, y + 94, 1300, 14, '#8A5A34')}`;
export const deskFront = (y = 1196) => R(-100, y + 108, 1300, 420, '#8A5A34') + R(80, y + 140, 340, 190, '#7A4D2C', 12) + R(660, y + 140, 340, 190, '#7A4D2C', 12);

// ---------------------------------------------------------------- kamar belajar
export function studyBg(t, o = {}) {
  let s = R(-100, -100, 1300, 1300, o.day ? '#EAD9B8' : '#24395A') + R(-100, 1000, 1300, 1000, o.day ? '#B98F63' : '#2E2A3E') + R(-100, 992, 1300, 12, o.day ? '#8A6A47' : '#141F33');
  const stars = [[-70, -120], [-20, -60], [50, -140], [80, -30]].map(([x, y], i) => C(x, y, 3.5, '#fff', `opacity="${(0.5 + 0.3 * Math.sin(t * 2 + i)).toFixed(2)}"`)).join('');
  if (o.clean) return s + (o.day ? '' : '');
  s += `<g transform="translate(180 540)">${R(-120, -190, 240, 360, o.day ? '#9ED8F0' : '#0F2036', 16)}${o.day ? E(0, -100, 50, 20, 'rgba(255,255,255,.9)') + C(60, -150, 36, '#F8C038') : stars + C(40, -100, 34, '#F4EBC8') + C(54, -110, 30, '#0F2036')}${R(-120, -190, 240, 360, 'none', 16, `stroke="${o.day ? '#fff' : '#B3C2D6'}" stroke-width="12"`)}${R(-4, -190, 8, 360, o.day ? '#fff' : '#B3C2D6')}</g>`;
  // rak buku
  s += `<g transform="translate(820 420)">${R(-150, 0, 300, 14, '#8A5A34', 6)}${R(-130, -100, 36, 100, '#E8665F', 4)}${R(-86, -124, 34, 124, '#5BD0E6', 4)}${R(-46, -86, 40, 86, '#F8C038', 4)}${R(4, -112, 34, 112, '#9DE0BD', 4)}${R(48, -90, 40, 90, '#8E7CE8', 4)}</g>`;
  // lampu meja menyorot
  if (!o.day) s += `<path d="M830 760L560 1190H1100Z" fill="#FFE9A8" opacity=".10"/>`;
  return s;
}
export const lamp = (x, y, s = 1) => `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})">${R(-34, 0, 68, 12, '#5B6A72', 6)}${R(-5, -150, 10, 150, '#5B6A72', 4)}${P('M-60 -150Q0 -230 60 -150Z', '#F8C038')}${E(0, -150, 60, 8, '#FFE9A8')}</g>`;

// ---------------------------------------------------------------- buku dan catatan di meja (tampak depan miring)
// buku terbuka: dua halaman dengan garis tulisan; flip 0..1 = halaman kanan terangkat dan membalik
export function openBook(x, y, s = 1, o = {}) {
  const flip = o.flip ?? 0, pc = o.page ?? '#fff', ink = o.ink ?? '#9AA9B0';
  const lines = (x0, y0, n, w) => Array.from({ length: n }, (_, i) => R(x0, y0 + i * 18, i % 4 === 3 ? w * 0.6 : w, 6, ink, 3)).join('');
  let g = `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})">`;
  g += E(0, 14, 230, 22, 'rgba(0,0,0,.22)');
  g += P('M-220 -10L0 14L220 -10L220 -120L0 -96L-220 -120Z', o.cover ?? '#E8665F') + P('M-206 -18L0 6L0 -100L-206 -122Z', pc) + P('M206 -18L0 6L0 -100L206 -122Z', pc);
  g += lines(-186, -100, 5, 150).replace(/<rect/g, '<rect transform="skewY(9)"') + lines(24, -92, 5, 150).replace(/<rect/g, '<rect transform="skewY(-9)"');
  if (o.figure) g += o.figure;
  if (flip > 0 && flip < 1) { // halaman kanan terangkat ke kiri
    const a = flip * 2 - 1, wd = 206 * Math.abs(a), side = a >= 0 ? 1 : -1;
    g += P(`M0 6L${f1(side * -wd)} ${f1(-18 - 6 * Math.sin(flip * Math.PI))}L${f1(side * -wd)} ${f1(-122 - 24 * Math.sin(flip * Math.PI))}L0 -100Z`, '#F3F6F7', 'stroke="#C9D4D9" stroke-width="3"');
  }
  g += `</g>`;
  return g;
}
export const closedBook = (x, y, s = 1, rot = 0, c = '#E8665F') => `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)}) scale(${s})">${E(0, 16, 120, 14, 'rgba(0,0,0,.2)')}${R(-110, -18, 220, 36, '#fff', 8)}${R(-110, -34, 220, 28, c, 10)}${R(-110, -30, 28, 56, '#C9473F', 8)}${T(8, -12, 'CATATAN', '#fff', 20)}</g>`;
// buku dipegang menghadap penonton (sampul), dipakai bersama pose pegang_buku
export const heldBook = (x, y, s = 1, rot = 0, c = '#E8665F') => `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)}) scale(${s})">${R(-84, -112, 168, 224, 'rgba(0,0,0,.2)', 14, 'transform="translate(5 8)"')}${R(-84, -112, 168, 224, c, 14)}${R(-84, -112, 22, 224, '#C9473F', 12)}${R(-42, -80, 100, 12, '#fff', 6, 'opacity=".9"')}${R(-42, -56, 70, 10, '#fff', 5, 'opacity=".7"')}${T(10, 52, 'CATATAN', '#fff', 22)}</g>`;

// ---------------------------------------------------------------- ikon dan efek
export function bulb(x, y, s = 1, on = 1, t = 0) {
  const rays = on > 0.05 ? Array.from({ length: 8 }, (_, i) => { const a = i * Math.PI / 4 + Math.PI / 8, r0 = 62, r1 = 62 + 22 * on; return L(`M${f1(Math.cos(a) * r0)} ${f1(Math.sin(a) * r0 - 18)}L${f1(Math.cos(a) * r1)} ${f1(Math.sin(a) * r1 - 18)}`, '#F8C038', 8, `opacity="${(0.9 * on).toFixed(2)}"`); }).join('') : '';
  return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})">${on > 0.05 ? C(0, -18, 74 * on, `rgba(255,224,120,${(0.28 * on).toFixed(2)})`) : ''}${rays}${C(0, -18, 44, on > 0.5 ? '#FFE08A' : '#D5DEE2')}${C(-14, -30, 12, 'rgba(255,255,255,.7)')}${R(-20, 18, 40, 30, '#8A9AA3', 8)}${R(-16, 24, 32, 6, '#6B7A83', 3)}${R(-16, 36, 32, 6, '#6B7A83', 3)}</g>`;
}
export const qmarks = (x, y, t, s = 1, n = 3, c = '#3B4A8C') => Array.from({ length: n }, (_, i) => { const a = -50 + i * 50, bob = Math.sin(t * 4 + i * 1.7) * 6; return `<g transform="translate(${f1(x + (i - (n - 1) / 2) * 62 * s)} ${f1(y + bob - (i % 2) * 22 * s)}) rotate(${a / 3}) scale(${s})">${T(0, 0, '?', c, 70, 'stroke="#fff" stroke-width="10" paint-order="stroke"')}</g>`; }).join('');
export const spiral = (x, y, t, s = 1, c = '#8E7CE8') => `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(t * 240)}) scale(${s})"><path d="M0 0m0-4a4 4 0 1 1-4 4a12 12 0 1 1 12 12a22 22 0 1 1-22-22a34 34 0 1 1 34 34" fill="none" stroke="${c}" stroke-width="7" stroke-linecap="round"/></g>`;
export const fly = (cx, cy, t, r = 120) => { const a = t * 5, x = cx + Math.cos(a) * r, y = cy + Math.sin(a * 1.3) * r * 0.45, w = Math.sin(t * 90) * 6; return `<g transform="translate(${f1(x)} ${f1(y)})">${E(-6, -7 - w * 0.2, 8, 4 + w * 0.3, 'rgba(255,255,255,.85)')}${E(6, -7 + w * 0.2, 8, 4 - w * 0.3 + 3, 'rgba(255,255,255,.85)')}${E(0, 0, 8, 5.5, '#2A2230')}${C(8, -1, 3.5, '#2A2230')}</g>`; };
export const dots3 = (x, y, t, c = '#fff') => [0, 1, 2].map((i) => C(x + i * 34, y - Math.max(0, Math.sin(t * 4 - i * 0.9)) * 12, 9, c)).join('');
export const zz = (x, y, t, s = 1) => [0, 1, 2].map((i) => { const u = (t * 0.7 + i * 0.33) % 1; return `<g transform="translate(${f1(x + u * 60)} ${f1(y - u * 110)}) scale(${(s * (0.6 + 0.6 * u)).toFixed(2)})" opacity="${(Math.sin(u * Math.PI)).toFixed(2)}">${T(0, 0, 'Z', '#C9D4F5', 52, 'stroke="#2A3F66" stroke-width="8" paint-order="stroke"')}</g>`; }).join('');
export const spark = (x, y, s = 1, c = '#F8C038', a = 1) => `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})" opacity="${a}">${P('M0 -30Q4 -4 30 0Q4 4 0 30Q-4 4 -30 0Q-4 -4 0 -30Z', c)}</g>`;
export const heartK = (x, y, s = 1, c = '#E8665F') => `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})">${P('M0 22C-46 -8 -34 -42 -14 -42C-6 -42 0 -36 0 -30C0 -36 6 -42 14 -42C34 -42 46 -8 0 22Z', c)}</g>`;
export const pencil = (x, y, s = 1, rot = 0) => `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${rot}) scale(${s})">${R(-70, -9, 110, 18, '#F8C038', 4)}${P('M40 -9L72 0L40 9Z', '#F2C29B')}${P('M62 -3L72 0L62 3Z', '#2A2230')}${R(-82, -9, 14, 18, '#E8665F', 4)}</g>`;
export const phoneBuzz = (x, y, t, s = 1, on = 1) => { const sh = on ? Math.sin(t * 50) * 3 : 0; return `<g transform="translate(${f1(x + sh)} ${f1(y)}) rotate(${f1(-8)}) scale(${s})">${R(-34, -62, 68, 124, '#2A2230', 12)}${R(-28, -52, 56, 98, on ? '#5BD0E6' : '#3A3F55', 6)}${on ? R(-20, -40, 40, 12, '#fff', 6) + R(-20, -20, 28, 10, '#fff', 5, 'opacity=".7"') + C(20, -34, 8, '#E8665F') : ''}</g>`; };
export const bell = (x, y, s = 1) => `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})">${P('M-26 18Q-26 -34 0 -34Q26 -34 26 18Z', '#F8C038')}${R(-32, 14, 64, 8, '#E8A92C', 4)}${C(0, 30, 7, '#E8A92C')}</g>`;
export const moonK = (x, y, r = 40, bg = '#24395A') => `<g transform="translate(${x} ${y})">${C(0, 0, r, '#F4EBC8')}${C(r * 0.42, -r * 0.32, r * 0.86, bg)}</g>`;
export const sunK = (x, y, r = 34, t = 0) => `<g transform="translate(${x} ${y})">${C(0, 0, r, '#F8C038')}${Array.from({ length: 8 }, (_, i) => { const a = i * Math.PI / 4 + t; return L(`M${f1(Math.cos(a) * (r + 10))} ${f1(Math.sin(a) * (r + 10))}L${f1(Math.cos(a) * (r + 24))} ${f1(Math.sin(a) * (r + 24))}`, '#F8C038', 7); }).join('')}</g>`;
export const target = (x, y, s = 1, t = 0) => `<g transform="translate(${f1(x)} ${f1(y)}) scale(${(s * (1 + 0.04 * Math.sin(t * 6))).toFixed(3)})">${C(0, 0, 54, '#fff')}${C(0, 0, 54, 'none', 'stroke="#E8665F" stroke-width="10"')}${C(0, 0, 32, 'none', 'stroke="#E8665F" stroke-width="10"')}${C(0, 0, 11, '#E8665F')}</g>`;

// ---------------------------------------------------------------- kepingan konsep (puzzle jigsaw)
// tepi: 0 rata, 1 menonjol, -1 melekuk. Titik sudut searah jarum jam dari kiri-atas, sisi s.
export function piecePath(s, e) {
  const C0 = [[0, 0], [s, 0], [s, s], [0, s]];
  let d = `M0 0`;
  for (let i = 0; i < 4; i++) {
    const [x0, y0] = C0[i], [x1, y1] = C0[(i + 1) % 4], ax = (x1 - x0) / s, ay = (y1 - y0) / s, nx = ay, ny = -ax, dd = e[i];
    const Pt = (u, v) => `${f1(x0 + ax * s * u + nx * s * v * dd)} ${f1(y0 + ay * s * u + ny * s * v * dd)}`;
    if (!dd) { d += `L${x1} ${y1}`; continue; }
    d += `L${Pt(0.36, 0)}C${Pt(0.36, 0.1)} ${Pt(0.28, 0.2)} ${Pt(0.5, 0.2)}C${Pt(0.72, 0.2)} ${Pt(0.64, 0.1)} ${Pt(0.64, 0)}L${x1} ${y1}`;
  }
  return d + 'Z';
}
const edgeFlag = (a, b) => ((a * 7 + b * 3) % 2 ? 1 : -1);
export function pieceEdges(c, r, n) { // tepi atas, kanan, bawah, kiri sel (c, r) dalam papan n x n
  const top = r === 0 ? 0 : -edgeFlag(c, r - 1 + 10), bottom = r === n - 1 ? 0 : edgeFlag(c, r + 10), left = c === 0 ? 0 : -edgeFlag(r + 20, c - 1), right = c === n - 1 ? 0 : edgeFlag(r + 20, c);
  return [top, right, bottom, left];
}
export const PCOL = ['#7CCFA6', '#5BD0E6', '#8E7CE8', '#F2A07B', '#6FC27A', '#E58FB0', '#7FA3F0', '#F0C65A', '#9AD0C9'];
// satu keping pada (x, y) = pojok kiri-atas sel; label opsional di tengah
export function piece(x, y, s, e, col, o = {}) {
  const a = o.a ?? 1, k = o.k ?? 1, rot = o.rot ?? 0, glow = o.glow ?? 0;
  return `<g transform="translate(${f1(x + s / 2)} ${f1(y + s / 2)}) rotate(${f1(rot)}) scale(${k.toFixed(3)}) translate(${f1(-s / 2)} ${f1(-s / 2)})" opacity="${a.toFixed(3)}">`
    + (glow ? `<path d="${piecePath(s, e)}" fill="none" stroke="#FFE08A" stroke-width="${f1(10 + glow * 10)}" opacity="${(0.7 * glow).toFixed(2)}" stroke-linejoin="round"/>` : '')
    + `<path d="${piecePath(s, e)}" fill="${col}" stroke="#fff" stroke-width="5" stroke-linejoin="round"/>`
    + (o.label ? T(s / 2, s / 2 + 14, o.label, o.fg ?? '#fff', o.fs ?? 44, 'opacity=".95"') : '')
    + `</g>`;
}
// kerangka papan kosong n x n (siluet slot)
export function boardFrame(x, y, s, n, o = {}) {
  let g = R(x - 22, y - 22, s * n + 44, s * n + 44, o.bg ?? 'rgba(255,255,255,.16)', 36) + R(x - 22, y - 22, s * n + 44, s * n + 44, 'none', 36, 'stroke="#fff" stroke-width="5" opacity=".55"');
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) g += `<g transform="translate(${x + c * s} ${y + r * s})"><path d="${piecePath(s, pieceEdges(c, r, n))}" fill="rgba(0,0,0,.14)" stroke="rgba(255,255,255,.35)" stroke-width="3" stroke-dasharray="10 8" stroke-linejoin="round"/></g>`;
  return g;
}

// ---------------------------------------------------------------- tombol "upgrade" (lelucon)
export function upgradeBtn(x, y, s = 1, press = 0, prog = 0) {
  const w = 330, h = 100, dy = press * 10;
  return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s.toFixed(3)})">${R(-w / 2, -h / 2 + 18, w, h, '#7A1F2B', 28)}${R(-w / 2, -h / 2 + 18 - dy * 0, w, h - 18 + (10 - dy), '#B52C3E', 28)}${R(-w / 2, -h / 2 + dy, w, h - 10, '#E8665F', 28)}${T(0, 20 + dy, 'UPGRADE', '#fff', 52, 'letter-spacing="2"')}${R(-w / 2 + 20, h / 2 + 34, w - 40, 22, 'rgba(0,0,0,.25)', 11)}${R(-w / 2 + 20, h / 2 + 34, (w - 40) * prog, 22, '#F8C038', 11)}</g>`;
}
// kalender yang membalik halaman: label hari
export function calendarFlip(x, y, s, label, flip = 0, sub = '') {
  const w = 300, h = 300;
  let g = `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})">${R(-w / 2 + 6, -h / 2 + 14, w, h, 'rgba(0,0,0,.2)', 28)}${R(-w / 2, -h / 2, w, h, '#fff', 28)}${R(-w / 2, -h / 2, w, 74, '#E8665F', 28)}${R(-w / 2, -h / 2 + 40, w, 34, '#E8665F')}${[-80, 80].map((px) => R(px - 8, -h / 2 - 20, 16, 44, '#8A9AA3', 8)).join('')}`;
  g += T(0, 44, label, '#172B38', 70) + (sub ? T(0, 100, sub, '#6B7A83', 34) : '');
  if (flip > 0 && flip < 1) { const f = Math.sin(flip * Math.PI); g += `<g transform="translate(0 ${-h / 2 + 74}) scale(1 ${(1 - flip).toFixed(3)})">${R(-w / 2, 0, w, h - 74, '#F3F6F7', 0)}</g>`; }
  return g + `</g>`;
}
// papan pembahasan: kartu soal (netral, tidak mempermalukan)
export const qCard = (x, y, w, h, title, a = 1, k = 1) => `<g transform="translate(${f1(x)} ${f1(y)}) scale(${k.toFixed(3)})" opacity="${a.toFixed(3)}">${R(-w / 2 + 6, -h / 2 + 12, w, h, 'rgba(0,0,0,.22)', 34)}${R(-w / 2, -h / 2, w, h, '#fff', 34)}${R(-w / 2, -h / 2, w, 14, '#8E7CE8', 34)}${R(-w / 2 + 30, -h / 2 + 36, 150, 38, '#EDE9FC', 19)}${T(-w / 2 + 105, -h / 2 + 64, 'LATIHAN', '#5B4BB5', 22)}${title}</g>`;
export const stampSoft = (x, y, txt, col, s = 1, rot = -6) => `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${rot}) scale(${s.toFixed(3)})">${R(-170, -44, 340, 88, 'rgba(255,255,255,.94)', 44)}${R(-170, -44, 340, 88, 'none', 44, `stroke="${col}" stroke-width="7"`)}${T(0, 17, txt, col, 46)}</g>`;
export const hiliteBar = (x, y, w, p) => R(x, y, w * p, 26, 'rgba(248,192,56,.8)', 8);
export function bed(x, y, s = 1) { return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})">${R(-230, 0, 460, 50, '#6B5CC8', 16)}${R(-224, 50, 18, 70, '#4B3FA0')}${R(206, 50, 18, 70, '#4B3FA0')}${R(-220, -46, 120, 50, '#fff', 22)}${P('M-90 -30Q60 -50 220 -20V2H-90Z', '#9DE0BD')}</g>`; }

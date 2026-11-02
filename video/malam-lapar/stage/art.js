// Properti datar untuk "Kenapa malam-malam lapar?". Koordinat kanvas 1080 x 1920. Semua ilustrasi buatan (bukan rekaman, bukan data).
export const R = (x, y, w, h, f, rx = 0, e = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${f}" ${e}/>`;
export const C = (x, y, r, f, e = '') => `<circle cx="${x}" cy="${y}" r="${r}" fill="${f}" ${e}/>`;
export const E = (x, y, rx, ry, f, e = '') => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${f}" ${e}/>`;
export const P = (d, f, e = '') => `<path d="${d}" fill="${f}" ${e}/>`;
export const L = (d, s, w, e = '') => `<path d="${d}" fill="none" stroke="${s}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${e}/>`;
export const FONT = 'font-family="Plus Jakarta Sans" font-weight="800"';
export const T = (x, y, txt, f, size, e = '', anchor = 'middle') => `<text x="${x}" y="${y}" ${FONT} font-size="${size}" fill="${f}" text-anchor="${anchor}" ${e}>${txt}</text>`;
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const f1 = (n) => Math.round(n * 10) / 10;
export const FLOOR = 1330;
export const COL = { forest: '#0A3830', green: '#007060', mint: '#9DE0BD', cream: '#F7F2E4', gold: '#F8C038', coral: '#E8665F', ink: '#172B38', indigo: '#3B4A8C', night: '#1A2D52', sky: '#5BD0E6', violet: '#8E7CE8', leaf: '#3DB46E' };

// ------------------------------------------------------------ kartu dan label
export const card = (x, y, w, h, fill = '#fff', rx = 36, shadow = true) => `${shadow ? R(x, y + 10, w, h, 'rgba(0,0,0,.22)', rx) : ''}${R(x, y, w, h, fill, rx)}`;
export function chip(cx, cy, text, o = {}) { // pil label berskala; o.k = skala, o.a = opacity
  const w = o.w ?? Math.max(240, text.length * (o.fs ?? 38) * 0.66 + 70), fs = o.fs ?? 38, k = o.k ?? 1, a = o.a ?? 1;
  return `<g transform="translate(${f1(cx)} ${f1(cy)}) scale(${k.toFixed(3)})" opacity="${a.toFixed(3)}">${R(-w / 2, -34, w, 76, 'rgba(0,0,0,.25)', 38)}${R(-w / 2, -40, w, 76, o.bg ?? '#E8665F', 38)}${T(0, 12, text, o.fg ?? '#fff', fs, 'letter-spacing="1"')}</g>`;
}
export const pops = (k, a = 1) => `transform-origin="0 0" opacity="${a}"`;

// ------------------------------------------------------------ latar
export function nightBg(t, o = {}) {
  const wall = R(-400, -300, 1900, 1700, '#1F3552') + R(-400, 1180, 1900, 800, '#2E2A3E') + R(-400, 1176, 1900, 12, '#141F33');
  const stars = [[-110, -210], [-30, -150], [60, -90], [-80, -30]].map(([x, y], i) => C(x, y, 3 + (i % 2), '#fff', `opacity="${(0.55 + 0.3 * Math.sin(t * 2 + i)).toFixed(2)}"`)).join('');
  const win = `<g transform="translate(860 520)">${R(-150, -220, 300, 420, '#0F2036', 18)}${stars}${C(60, -120, 44, '#F4EBC8')}${C(78, -132, 38, '#0F2036')}${R(-150, -220, 300, 420, 'none', 18, 'stroke="#B3C2D6" stroke-width="14"')}${R(-4, -220, 8, 420, '#B3C2D6')}</g>`;
  const poster = `<g transform="translate(560 330) rotate(-3)">${R(-90, -110, 180, 220, '#F7F2E4', 8)}${L('M-50 50Q-20 -10 0 -40Q22 -10 50 50', '#C98F67', 6)}${C(0, -64, 18, '#C98F67')}${L('M-60 70H60', '#8A9AA3', 6)}</g>`;
  return wall + (o.noWindow ? '' : win) + (o.noPoster ? '' : poster);
}
export function softBg(c0 = '#0F5F57', c1 = '#0A3830', id = 'sb') {
  return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c0}"/><stop offset="1" stop-color="${c1}"/></linearGradient></defs>${R(-100, -100, 1300, 2200, `url(#${id})`)}${C(160, 320, 220, 'rgba(255,255,255,.05)')}${C(960, 1500, 280, 'rgba(255,255,255,.05)')}${C(900, 260, 120, 'rgba(255,255,255,.04)')}`;
}
export function creamBg(id = 'cb') {
  return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FBF7EA"/><stop offset="1" stop-color="#EFE8D2"/></linearGradient></defs>${R(-100, -100, 1300, 2200, `url(#${id})`)}${C(940, 260, 200, 'rgba(0,112,96,.07)')}${C(120, 1500, 260, 'rgba(232,102,95,.06)')}`;
}

// ------------------------------------------------------------ kulkas (terbuka, bercahaya) — pusat pintu kiri atas di (0,0)
export function fridge(glow = 1) {
  const sh = (y, h = 14) => R(26, y, 448, h, '#C9D9E0');
  const food = `<g transform="translate(60 150)">${R(0, 0, 70, 110, '#fff', 8)}${R(0, 0, 70, 38, '#5BD0E6', 8)}${R(10, 52, 50, 10, '#B7C6CC', 5)}${R(100, 36, 150, 74, '#F3E3B8', 14)}${[0, 1, 2, 3, 4].map((i) => E(26 + 100 + i * 30, 48 + (i % 2) * 6, 14, 19, '#FFF9EA')).join('')}${R(280, 30, 70, 80, '#E8665F', 12)}${R(290, 12, 50, 26, '#8A3A2E', 8)}${R(364, 44, 52, 66, '#8E7CE8', 10)}</g>`
    + `<g transform="translate(60 330)">${R(0, 40, 170, 80, '#fff', 14)}${R(0, 40, 170, 80, 'none', 14, 'stroke="#C9D9E0" stroke-width="5"')}${C(60, 66, 26, '#F8C038')}${C(100, 76, 22, '#E8665F')}${C(130, 62, 18, '#3DB46E')}${R(210, 20, 120, 100, '#F4E1B3', 16)}${P('M214 40h112l-18 78h-76z', '#E8665F', 'opacity=".9"')}${R(350, 60, 70, 60, '#fff', 10)}${R(350, 60, 70, 18, '#9DE0BD', 10)}</g>`
    + `<g transform="translate(60 520)">${C(40, 70, 44, '#E8665F')}${C(110, 82, 38, '#F2A950')}${L('M104 46q16-26 40-18', '#3DB46E', 8)}${R(190, 24, 62, 100, '#fff', 12)}${R(190, 24, 62, 36, '#F8A8C0', 12)}${R(268, 24, 62, 100, '#fff', 12)}${R(268, 24, 62, 36, '#9DE0BD', 12)}${R(350, 50, 70, 74, '#F2C29B', 14)}</g>`;
  return `<g>${R(-10, 10, 520, 820, 'rgba(0,0,0,.28)', 40)}${R(0, 0, 500, 820, '#DDE5E9', 38)}<defs><linearGradient id="fi" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFBE6"/><stop offset="1" stop-color="#FFE9A8"/></linearGradient></defs>${R(26, 26, 448, 768, 'url(#fi)', 22)}${sh(260)}${sh(470)}${sh(650)}${food}${R(26, 690, 448, 104, '#CFE0E8', 14)}${R(170, 724, 160, 22, '#9AA9AF', 11)}${P('M0 10L-30 40L-30 770L0 820Z', '#B7C6CC')}${R(490, 10, 30, 810, '#C4CFD5', 14)}${R(504, 360, 10, 180, '#7B8A93', 5)}</g>`;
}
export function fridgeGlow(x, y, a = 1) {
  return `<defs><radialGradient id="gl" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#FFF1BD" stop-opacity="${(0.55 * a).toFixed(2)}"/><stop offset=".6" stop-color="#FFE9A8" stop-opacity="${(0.2 * a).toFixed(2)}"/><stop offset="1" stop-color="#FFE9A8" stop-opacity="0"/></radialGradient></defs>${E(x, y, 820, 980, 'url(#gl)')}`;
}

// ------------------------------------------------------------ jam dinding. hour 0..24
export function wallClock(cx, cy, r, hour, label = '') {
  const hh = (hour % 12) / 12 * Math.PI * 2, mm = (hour % 1) * Math.PI * 2;
  const tick = Array.from({ length: 12 }, (_, i) => { const a = i * Math.PI / 6; return `<line x1="${f1(Math.sin(a) * r * 0.74)}" y1="${f1(-Math.cos(a) * r * 0.74)}" x2="${f1(Math.sin(a) * r * 0.86)}" y2="${f1(-Math.cos(a) * r * 0.86)}" stroke="#B7C6CC" stroke-width="${i % 3 ? 3 : 5}" stroke-linecap="round"/>`; }).join('');
  return `<g transform="translate(${cx} ${cy})">${C(0, 8, r + 2, 'rgba(0,0,0,.25)')}${C(0, 0, r, '#fff')}${C(0, 0, r, 'none', `stroke="#3B4A8C" stroke-width="${f1(r * 0.16)}"`)}${tick}<line x1="0" y1="0" x2="${f1(Math.sin(hh) * r * 0.46)}" y2="${f1(-Math.cos(hh) * r * 0.46)}" stroke="#172B38" stroke-width="${f1(r * 0.1)}" stroke-linecap="round"/><line x1="0" y1="0" x2="${f1(Math.sin(mm) * r * 0.68)}" y2="${f1(-Math.cos(mm) * r * 0.68)}" stroke="#E8665F" stroke-width="${f1(r * 0.065)}" stroke-linecap="round"/>${C(0, 0, r * 0.08, '#172B38')}</g>${label ? T(cx, cy + r + 52, label, '#F4EBC8', 42) : ''}`;
}
export const fmtHour = (h) => { const hh = Math.floor(h) % 24, mm = Math.floor((h % 1) * 60); return String(hh).padStart(2, '0') + '.' + String(mm).padStart(2, '0'); };

// ------------------------------------------------------------ organ ilustrasi
// lambung (bentuk J sederhana) pusat (0,0), lebar ~ 300
export function stomach(o = {}) {
  const pulse = o.pulse ?? 0, s = 1 + 0.03 * Math.sin(pulse * 8) * (o.rumble ?? 0);
  const fill = o.fill ?? '#F4A29B', shade = o.shade ?? '#E58478';
  return `<g transform="scale(${s.toFixed(3)})">${P('M-20 -190Q40 -200 50 -150Q56 -120 20 -90Q120 -70 140 40Q160 170 40 190Q-90 210 -150 120Q-190 40 -130 -40Q-80 -100 -50 -130Q-60 -170 -20 -190Z', fill)}${P('M-40 -160Q-10 -180 20 -150Q10 -110 -40 -110Z', shade, 'opacity=".5"')}${L('M-90 60Q-30 130 70 100', shade, 12, 'opacity=".55"')}${L('M-70 -10Q0 40 90 0', shade, 12, 'opacity=".4"')}</g>`;
}
// kerongkongan: tabung vertikal dari (0,-250) sampai mulut lambung
export function esophagus() { return R(-14, -330, 36, 190, '#F0B6AC', 16); }
// otak sederhana, pusat (0,0), lebar ~220
export function brain(o = {}) {
  const f = o.fill ?? '#F7A8C0', sh = o.shade ?? '#E58AA8', glow = o.glow ?? 0;
  return `<g>${glow > 0 ? C(0, 0, 150 + 20 * glow, '#FFE08A', `opacity="${(0.35 * glow).toFixed(2)}"`) : ''}${P('M-96 10Q-120 -50 -70 -80Q-50 -130 0 -112Q50 -130 74 -82Q124 -50 100 14Q112 66 62 82Q30 112 -8 92Q-56 112 -80 70Q-120 50 -96 10Z', f)}${L('M0 -108Q-8 -40 4 20Q-6 60 -4 92', sh, 8)}${L('M-72 -40Q-40 -50 -34 -14M-88 22Q-50 24 -34 50M70 -40Q40 -50 34 -14M88 26Q50 28 34 56', sh, 8)}</g>`;
}

// ------------------------------------------------------------ makanan (ilustrasi datar)
export function plate(x, y, s = 1, kind = 'nasi') {
  const base = `${E(0, 14, 120, 24, 'rgba(0,0,0,.18)')}${E(0, 0, 118, 30, '#fff')}${E(0, -4, 88, 20, '#EEF3F4')}`;
  let top = '';
  if (kind === 'nasi') top = E(-10, -22, 54, 30, '#fff') + E(-10, -26, 50, 26, '#F4F1E6') + C(52, -18, 22, '#E8665F') + E(46, -34, 26, 14, '#3DB46E') + R(-90, -22, 26, 20, '#F2A950', 6);
  if (kind === 'burger') top = E(0, -8, 56, 12, '#F2A950') + R(-58, -22, 116, 12, '#3DB46E', 6) + R(-54, -34, 108, 14, '#8A3A2E', 7) + P('M-58 -36Q0 -92 58 -36Z', '#F2A950') + [-22, 0, 22].map((q) => E(q, -56, 4, 2.4, '#FFF3C4')).join('');
  return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})">${base}${top}</g>`;
}
// mangkuk yogurt + buah
export function yogurtBowl(x, y, s = 1) {
  return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})">${E(0, 74, 124, 18, 'rgba(0,0,0,.2)')}${P('M-108 -4H108Q104 74 54 90H-54Q-104 74 -108 -4Z', '#fff')}${P('M-108 -4H108Q106 14 100 24H-100Q-106 14 -108 -4Z', '#CFE9F5')}${E(0, -6, 108, 28, '#FFFDF4')}${E(0, -8, 94, 22, '#FFF9EA')}${C(-44, -22, 22, '#E8665F')}${P('M-44 -44q8-10 16-4', '#3DB46E')}${C(-6, -26, 20, '#E8665F')}${C(34, -22, 22, '#8E7CE8')}${R(58, -42, 58, 20, '#F8C038', 10, 'transform="rotate(-16 80 -30)"')}${C(2, -40, 10, '#FFF3C4')}</g>`;
}
// roti dengan telur
export function toastEgg(x, y, s = 1) {
  return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})">${E(0, 70, 128, 18, 'rgba(0,0,0,.2)')}${E(0, 56, 126, 26, '#fff')}${E(0, 52, 100, 18, '#EEF3F4')}${P('M-92 20Q-96 -54 -30 -58Q0 -78 30 -58Q96 -54 92 20Q92 40 60 44H-60Q-92 40 -92 20Z', '#E7B876')}${P('M-78 16Q-80 -42 -26 -46Q0 -62 26 -46Q80 -42 78 16Q78 30 54 34H-54Q-78 30 -78 16Z', '#F6D9A0')}${P('M-52 -2Q-60 -30 -20 -30Q10 -44 40 -24Q70 -4 44 14Q10 30 -30 18Q-48 14 -52 -2Z', '#fff')}${C(-2, -6, 20, '#F8C038')}${C(-8, -12, 6, '#FFF3C4')}</g>`;
}
export function donut(x, y, s = 1) { return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})">${C(0, 6, 44, 'rgba(0,0,0,.18)')}${C(0, 0, 44, '#D9A066')}${C(0, -4, 42, '#F28CB0')}${C(0, -4, 14, '#7A4D2C')}${[[-24, -20], [20, -26], [28, 6], [-26, 14]].map(([a, b], i) => R(a - 6, b - 2, 12, 5, ['#fff', '#F8C038', '#5BD0E6', '#fff'][i], 2.5, `transform="rotate(${i * 50} ${a} ${b})"`)).join('')}</g>`; }
export function chips(x, y, s = 1) { return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})">${R(-42, -60, 84, 118, '#E8665F', 10)}${P('M-42 -60L-36 -72L-24 -60L-12 -72L0 -60L12 -72L24 -60L36 -72L42 -60Z', '#C5463F')}${C(0, 0, 24, '#F8C038')}${T(0, 10, 'C', '#E8665F', 30)}</g>`; }
export function salad(x, y, s = 1) { return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})">${E(0, 40, 66, 12, 'rgba(0,0,0,.18)')}${P('M-64 0H64Q58 46 22 58H-22Q-58 46 -64 0Z', '#fff')}${C(-26, -8, 22, '#3DB46E')}${C(10, -16, 24, '#6FCB8B')}${C(36, -4, 18, '#3DB46E')}${C(-6, -4, 10, '#E8665F')}${C(30, -22, 8, '#F8C038')}</g>`; }
export function apple(x, y, s = 1) { return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})">${C(-12, 0, 26, '#E8665F')}${C(12, 0, 26, '#E8665F')}${L('M0 -24q4-18 16-22', '#7A4D2C', 5)}${P('M4 -28q18-14 30-2q-18 12-30 2z', '#3DB46E')}</g>`; }

// ------------------------------------------------------------ orang (ikon sederhana, tanpa wajah) dan awan pikiran
export function person(x, y, s = 1, c = '#5BD0E6', hair = '#262A38') {
  return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})">${E(0, 104, 34, 6, 'rgba(0,0,0,.16)')}${P('M-30 100V44Q-30 18 0 18Q30 18 30 44V100Z', c)}${C(0, -6, 26, '#F2C29B')}${P('M-27 -6Q-28 -34 0 -34Q28 -34 27 -6Q14 -22 -4 -20Q-20 -20 -27 -6Z', hair)}</g>`;
}
export function bubble(x, y, w, h, fill = '#fff', tail = 'bl', e = '') {
  const t = tail === 'bl' ? `<path d="M${x + 40} ${y + h - 6}L${x + 20} ${y + h + 46}L${x + 86} ${y + h - 6}Z" fill="${fill}"/>` : tail === 'br' ? `<path d="M${x + w - 40} ${y + h - 6}L${x + w - 20} ${y + h + 46}L${x + w - 86} ${y + h - 6}Z" fill="${fill}"/>` : '';
  return `<g ${e}>${R(x, y + 8, w, h, 'rgba(0,0,0,.2)', 40)}${R(x, y, w, h, fill, 40)}${t}</g>`;
}
export function thought(x, y, w, h, fill = '#fff', toward = [0, 0]) { // gelembung pikiran dengan tiga lingkaran menuju (toward)
  const [tx, ty] = toward; const c = [[0.18, 0, 16], [0.42, 0, 11], [0.7, 0, 7]].map(([p, , r]) => C(f1(x + w / 2 + (tx - x - w / 2) * p), f1(y + h + (ty - y - h) * p), r, fill)).join('');
  return `${R(x, y + 8, w, h, 'rgba(0,0,0,.2)', 50)}${R(x, y, w, h, fill, 50)}${c}`;
}
// grafik: sumbu dan kurva halus (titik [x,y] kanvas); dipotong pada progres p (0..1) menurut panjang x
export function curve(pts, p, stroke, w = 12, extra = '') {
  const n = pts.length; if (n < 2) return '';
  const xmax = pts[0][0] + (pts[n - 1][0] - pts[0][0]) * p; let d = `M${f1(pts[0][0])} ${f1(pts[0][1])}`;
  for (let i = 1; i < n; i++) {
    const a = pts[i - 1], b = pts[i]; if (a[0] >= xmax) break;
    const c1x = a[0] + (b[0] - a[0]) / 2, c2x = c1x;
    if (b[0] <= xmax) d += `C${f1(c1x)} ${f1(a[1])} ${f1(c2x)} ${f1(b[1])} ${f1(b[0])} ${f1(b[1])}`;
    else { const u = (xmax - a[0]) / (b[0] - a[0]), yy = bez(a[1], a[1], b[1], b[1], u); d += `L${f1(xmax)} ${f1(yy)}`; }
  }
  return `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
}
const bez = (a, b, c, d, u) => (1 - u) ** 3 * a + 3 * (1 - u) ** 2 * u * b + 3 * (1 - u) * u * u * c + u ** 3 * d;
export function curveY(pts, x) { // y kurva (kubik horizontal) pada x
  for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i]; if (x <= b[0] || i === pts.length - 1) { const u = clamp((x - a[0]) / (b[0] - a[0]), 0, 1); return bez(a[1], a[1], b[1], b[1], (() => { let lo = 0, hi = 1; for (let k = 0; k < 24; k++) { const m = (lo + hi) / 2, xx = bez(a[0], a[0] + (b[0] - a[0]) / 2, a[0] + (b[0] - a[0]) / 2, b[0], m); if (xx < x) lo = m; else hi = m; } return (lo + hi) / 2; })()); } }
  return pts[pts.length - 1][1];
}
export const sparkle = (x, y, s = 1, c = '#F8C038', a = 1) => `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})" opacity="${a}">${P('M0 -22Q3 -3 22 0Q3 3 0 22Q-3 3 -22 0Q-3 -3 0 -22Z', c)}</g>`;
export const check = (x, y, s = 1, c = '#3DB46E') => `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})">${C(0, 0, 26, c)}${L('M-12 0L-4 9L13 -9', '#fff', 7)}</g>`;
export const cross = (x, y, s = 1, c = '#E8665F') => `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})">${C(0, 0, 26, c)}${L('M-10 -10L10 10M10 -10L-10 10', '#fff', 7)}</g>`;
export const moon = (x, y, r = 40, bg = '#1A2D52') => `<g transform="translate(${x} ${y})">${C(0, 0, r, '#F4EBC8')}${C(r * 0.4, -r * 0.3, r * 0.85, bg)}</g>`;
export const sun = (x, y, r = 36) => `<g transform="translate(${x} ${y})">${C(0, 0, r, '#F8C038')}${Array.from({ length: 8 }, (_, i) => { const a = i * Math.PI / 4; return L(`M${f1(Math.cos(a) * (r + 8))} ${f1(Math.sin(a) * (r + 8))}L${f1(Math.cos(a) * (r + 22))} ${f1(Math.sin(a) * (r + 22))}`, '#F8C038', 6); }).join('')}</g>`;
export const qmark = (x, y, s = 1, rot = 0) => `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)}) scale(${s})">${T(0, 0, '?', '#F8C038', 74, 'stroke="#172B38" stroke-width="7" paint-order="stroke"')}</g>`;

// Properti tambahan untuk "Makan malam bikin berat badan naik?". Semua ilustrasi buatan (bukan data, bukan hasil studi).
import { R, C, E, P, L, T, f1, clamp, COL } from './art.js';
import * as A from './art.js';

// ---------------------------------------------------------------- ruang makan kos malam
export function kosNight(t, o = {}) {
  let s = R(-400, -300, 1900, 1700, '#22385A') + R(-400, 1176, 1900, 900, '#2E2A3E') + R(-400, 1172, 1900, 12, '#141F33');
  // jendela dan bulan
  const stars = [[-90, -120], [-30, -60], [60, -150], [90, -40]].map(([x, y], i) => C(x, y, 3.5, '#fff', `opacity="${(0.5 + 0.3 * Math.sin(t * 2 + i)).toFixed(2)}"`)).join('');
  s += `<g transform="translate(${o.winX ?? 190} 520)">${R(-130, -190, 260, 380, '#0F2036', 16)}${stars}${A.moon(40, -90, 36, '#0F2036')}${R(-130, -190, 260, 380, 'none', 16, 'stroke="#B3C2D6" stroke-width="12"')}${R(-4, -190, 8, 380, '#B3C2D6')}</g>`;
  // rak kecil
  s += `<g transform="translate(560 430)">${R(-150, 0, 300, 14, '#8A5A34', 6)}${R(-130, -100, 36, 100, '#E8665F', 4)}${R(-86, -124, 34, 124, '#5BD0E6', 4)}${R(-46, -86, 40, 86, '#F8C038', 4)}${R(4, -112, 34, 112, '#9DE0BD', 4)}${R(48, -90, 40, 90, '#8E7CE8', 4)}${C(120, -30, 28, '#B3744A')}${P('M108 -54q12-30 24 0z', '#3DB46E')}</g>`;
  return s;
}
export const tableTop = () => R(-100, 1196, 1300, 30, '#B3744A', 8);
export const tableFront = () => R(-100, 1226, 1300, 260, '#8A5A34') + R(60, 1246, 380, 150, '#7A4D2C', 10);
export const spoon = (x, y, rot = 0, s = 1, rice = true) => `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)}) scale(${s})">${R(-5, -150, 10, 150, '#C9D4D9', 5)}${E(0, -166, 26, 34, '#DDE5E9')}${rice ? E(0, -174, 20, 18, '#fff') : ''}</g>`;
export const wrist = (st, side, x, fy, k) => { const a = side === 'L' ? st.armL : st.armR; return [x - 200 * k + a.wx * k, fy - 778 * k + (a.wy + (st.bob || 0)) * k]; };

// ---------------------------------------------------------------- alarm lucu
export function alarmClock(x, y, s, t, shake = 1, o = {}) {
  const sh = Math.sin(t * 46) * 7 * shake;
  const arcs = shake > 0.05 ? [-1, 1].map((d) => [0, 1, 2].map((i) => `<path d="M${d * (118 + i * 22)} -40Q${d * (136 + i * 24)} 0 ${d * (118 + i * 22)} 40" fill="none" stroke="#FFD36B" stroke-width="8" stroke-linecap="round" opacity="${(0.9 - i * 0.28).toFixed(2)}"/>`).join('')).join('') : '';
  const face = o.face === 'x' ? `${L('M-34 -24l24 24M-10 -24l-24 24', '#172B38', 7)}${L('M10 -24l24 24M34 -24l-24 24', '#172B38', 7)}${L('M-22 38Q0 22 22 38', '#172B38', 7)}` : `${C(-24, -10, 11, '#172B38')}${C(24, -10, 11, '#172B38')}${P('M-30 26Q0 66 30 26Z', '#8B1E2E')}`;
  return `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(sh)}) scale(${s})">${E(0, 120, 120, 14, 'rgba(0,0,0,.25)')}${L('M-70 100L-96 128M70 100L96 128', '#8B1E2E', 14)}${[-1, 1].map((d) => `<g transform="translate(${d * 66} -108) rotate(${d * 24})">${P('M-34 8Q0 -40 34 8Z', '#F8C038')}${C(0, -30, 8, '#C98F00')}</g>`).join('')}${C(0, 0, 108, '#E8665F')}${C(0, 0, 108, 'none', 'stroke="#B0302F" stroke-width="12"')}${C(0, 0, 84, '#fff')}${face}${arcs}</g>`;
}
export function alarmBanner(x, y, t, a = 1, k = 1) {
  const j = Math.sin(t * 38) * 3;
  return `<g transform="translate(${f1(x + j)} ${f1(y)}) rotate(${(-4 + Math.sin(t * 9) * 1.2).toFixed(1)}) scale(${k.toFixed(3)})" opacity="${a.toFixed(3)}"><rect x="-430" y="-110" width="860" height="250" rx="48" fill="rgba(0,0,0,.35)" transform="translate(0 12)"/><rect x="-430" y="-110" width="860" height="250" rx="48" fill="#D93A3A"/><rect x="-410" y="-90" width="820" height="210" rx="36" fill="none" stroke="#fff" stroke-width="6" opacity=".7"/>${T(0, -2, 'JANGAN MAKAN', '#fff', 96)}${T(0, 96, 'MALAM?', '#FFE08A', 108)}</g>`;
}
export const digitalClock = (x, y, txt, s = 1, color = '#FFE08A') => `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})">${R(-120, -52, 240, 100, '#0F2036', 20)}${T(0, 26, txt, color, 76)}</g>`;

// ---------------------------------------------------------------- makanan, kalender, ikon
export function plateVaried(x, y, s = 1) { // piring beragam: nasi, sayur, lauk, buah (netral, tidak ada makanan "jahat")
  return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})">${E(0, 16, 130, 26, 'rgba(0,0,0,.18)')}${E(0, 0, 128, 34, '#fff')}${E(0, -4, 100, 24, '#EEF3F4')}${E(-44, -16, 40, 18, '#FFF9EA')}${E(40, -14, 36, 17, '#6FCB8B')}${C(30, -22, 10, '#3DB46E')}${E(-6, -2, 28, 14, '#E8A66B')}${C(66, 4, 14, '#E8665F')}${C(-84, 2, 12, '#F8C038')}</g>`;
}
export function snackBowl(x, y, s = 1) { // mangkuk camilan netral (potongan buah dan biskuit)
  return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})">${E(0, 44, 92, 14, 'rgba(0,0,0,.2)')}${C(-30, -16, 24, '#F2A950')}${C(10, -26, 22, '#E8665F')}${C(40, -10, 20, '#F8C038')}${R(-8, -34, 36, 26, '#D9A066', 6, 'transform="rotate(14 10 -20)"')}${P('M-84 -2H84Q78 44 40 56H-40Q-78 44 -84 -2Z', '#9DE0BD')}${P('M-84 -2H84Q82 12 78 20H-78Q-82 12 -84 -2Z', '#7FCBA3')}</g>`;
}
export const shoeIcon = (x, y, s = 1) => `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})">${P('M-46 20V-6Q-46 -20 -30 -20H-6L14 4H40Q54 6 54 20Z', '#5BD0E6')}${R(-50, 18, 108, 12, '#fff', 6)}${L('M-14 -12L0 4M-2 -16L12 0', '#fff', 5)}</g>`;
export const stethoscope = (x, y, s = 1) => `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})">${L('M-30 -40V-6Q-30 22 0 22Q30 22 30 -6V-40', '#3B4A8C', 9)}${L('M0 22V44', '#3B4A8C', 9)}${C(0, 56, 14, '#F8C038')}${C(-30, -44, 8, '#3B4A8C')}${C(30, -44, 8, '#3B4A8C')}</g>`;
export const clipboard = (x, y, s = 1) => `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})">${R(-44, -56, 88, 112, '#C98F67', 10)}${R(-34, -44, 68, 92, '#fff', 6)}${R(-18, -62, 36, 18, '#8A6A4A', 6)}${L('M-22 -20H22M-22 -2H22M-22 16H6', '#9AA9AF', 6)}</g>`;
export const questionBubble = (x, y, s = 1, t = 0) => `<g transform="translate(${f1(x)} ${f1(y + Math.sin(t * 4) * 6)}) scale(${s})">${C(0, 0, 44, '#fff')}${T(0, 20, '?', COL.coral, 66)}</g>`;
export function fatBlob(x, y, s = 1, t = 0) { // gumpalan kuning lucu bertanda tanya: representasi pertanyaan "lemak?", bukan ilustrasi medis
  const w = 1 + 0.05 * Math.sin(t * 6);
  return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${(s * w).toFixed(3)} ${(s / w).toFixed(3)})">${E(0, 4, 96, 80, 'rgba(0,0,0,.18)')}${P('M-86 10Q-92 -62 -10 -70Q80 -76 90 -4Q96 66 14 72Q-80 78 -86 10Z', '#F9DA6B')}${C(-26, -4, 9, '#172B38')}${C(26, -4, 9, '#172B38')}${L('M-16 30Q0 40 16 30', '#172B38', 6)}${C(-48, 22, 10, 'rgba(232,102,95,.5)')}${C(48, 22, 10, 'rgba(232,102,95,.5)')}</g>`;
}
export const magicButton = (x, y, s = 1, pressed = 0) => `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})">${E(0, 64, 140, 26, 'rgba(0,0,0,.3)')}${E(0, 40, 130, 32, '#8B1E2E')}<g transform="translate(0 ${f1(pressed * 22)})">${R(-130, -20, 260, 60, '#D93A3A')}${E(0, -20, 130, 38, '#F05A5A')}${T(0, 8, '?', '#fff', 64)}</g></g>`;
export const scaleIcon = (x, y, s = 1, tilt = 0, labels = ['', '']) => `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})">${R(-8, -30, 16, 150, '#8A9AA3', 6)}${E(0, 128, 80, 14, '#6D7C84')}<g transform="rotate(${f1(tilt)} 0 -30)">${R(-170, -40, 340, 14, '#C9D4D9', 7)}${L('M-150 -26V20M150 -26V20', '#8A9AA3', 5)}<g transform="rotate(${f1(-tilt)} -150 20)">${E(-150, 34, 70, 18, '#fff')}${T(-150, 90, labels[0], '#fff', 28)}</g><g transform="rotate(${f1(-tilt)} 150 20)">${E(150, 34, 70, 18, '#fff')}${T(150, 90, labels[1], '#fff', 28)}</g></g>${C(0, -34, 14, '#F8C038')}</g>`;
export function calendarGrid(x, y, w, h, t, o = {}) {
  const cols = 7, rows = o.rows ?? 2, cw = w / cols, ch = h / (rows + 0.6), days = ['SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB', 'MIN'];
  let s = `<g transform="translate(${f1(x)} ${f1(y)})">${R(0, 8, w, h, 'rgba(0,0,0,.2)', 30)}${R(0, 0, w, h, '#fff', 30)}${R(0, 0, w, ch * 0.6, COL.coral, 30)}${R(0, ch * 0.3, w, ch * 0.3, COL.coral)}`;
  days.forEach((d, i) => { s += T(cw * (i + 0.5), ch * 0.42, d, '#fff', 24); });
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const cx = cw * (c + 0.5), cy = ch * (0.6 + r + 0.5), n = r * 7 + c + 1;
    s += R(cw * c + 6, ch * (0.6 + r) + 6, cw - 12, ch - 12, '#F4F1E8', 16);
    s += T(cx - cw * 0.26, cy - ch * 0.2, String(n), '#9AA9AF', 20);
    if (o.fill) s += o.fill(r, c, cx, cy + 6, cw, ch);
  }
  return s + '</g>';
}
// bayangan tubuh sederhana (kepala + badan) untuk adegan "masuk ke dalam tubuh"
export function bodyShell() {
  return `<g>${E(540, 1320, 270, 30, 'rgba(0,0,0,.22)')}${P('M300 1300V820Q300 680 400 650Q440 636 470 628L470 570H610L610 628Q640 636 680 650Q780 680 780 820V1300Z', '#F7BC8E')}${C(540, 470, 138, '#F7BC8E')}${P('M402 440Q410 350 540 336Q670 350 678 440Q640 396 540 396Q440 396 402 440Z', '#212739')}${C(540, 480, 114, 'rgba(255,255,255,.12)')}</g>`;
}
export const GUT = [[540, 560], [540, 640], [540, 760], [520, 850], [572, 940], [470, 990], [602, 1050], [462, 1110], [590, 1170], [500, 1220]];
export function gutPipes(t, o = {}) {
  const pipe = `<path d="M540 556V780" stroke="#F0B6AC" stroke-width="38" stroke-linecap="round" fill="none"/>`;
  const stomach = `<g transform="translate(520 862) scale(.46)">${A.stomach({ pulse: t, rumble: o.rumble ?? 0.5 })}</g>`;
  const gut = `<path d="M572 940Q620 960 600 1000Q470 1000 470 1030Q470 1060 602 1062Q650 1090 590 1110Q460 1110 462 1140Q464 1168 590 1172" stroke="#F4A29B" stroke-width="34" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M572 940Q620 960 600 1000Q470 1000 470 1030Q470 1060 602 1062Q650 1090 590 1110Q460 1110 462 1140Q464 1168 590 1172" stroke="#E58478" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity=".45"/>`;
  return `<g>${A.brain && `<g transform="translate(540 470) scale(.42)" opacity=".95">${A.brain({})}</g>`}${pipe}${stomach}${gut}</g>`;
}
export function gutPoint(u) { // u 0..1 sepanjang jalur makanan GUT
  const n = GUT.length - 1, x = clamp(u, 0, 1) * n, i = Math.min(n - 1, Math.floor(x)), v = x - i, a = GUT[i], b = GUT[i + 1];
  return [a[0] + (b[0] - a[0]) * v, a[1] + (b[1] - a[1]) * v];
}
export const food = (x, y, s = 1) => `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})">${C(0, 0, 22, '#fff')}${C(0, 0, 22, 'none', 'stroke="#E8A66B" stroke-width="5"')}${C(7, -6, 7, '#E8665F')}</g>`;
export const laptopClosed = (x, y, s = 1) => `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})">${R(-130, -14, 260, 20, '#C9D4D9', 8)}${R(-130, -2, 260, 14, '#9AA5AB', 8)}</g>`;
export function bed(x, y, s = 1) { return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})">${R(-230, 0, 460, 50, '#6B5CC8', 16)}${R(-224, 50, 18, 70, '#4B3FA0')}${R(206, 50, 18, 70, '#4B3FA0')}${R(-220, -46, 120, 50, '#fff', 22)}${P('M-90 -30Q60 -50 220 -20V2H-90Z', '#9DE0BD')}</g>`; }

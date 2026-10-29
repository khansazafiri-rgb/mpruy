// Pustaka kecil untuk panggung video "Bayangin kamu jadi anak FK": warna, easing, dan properti SVG datar
// (meja, laptop, tumpukan kertas, folder, ponsel, dompet, dll.) yang dipakai adegan. Semua murni: input waktu -> string SVG.
export const C = {
  cream: '#F7F2E4', forest: '#0A3830', green: '#007060', mint: '#9DE0BD', gold: '#F8C038', coral: '#F2735E', ink: '#172B38',
  teal: '#1D7B75', navy: '#212739', night: '#16222E', night2: '#1D3042', wood: '#8A6240', woodD: '#69472C', lamp: '#F6C770',
  paper: '#FFFDF6', sky: '#CFE8F3', wall: '#EFE6D2', wallD: '#E2D6BC', skin: '#F7BC8E',
};
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, t) => a * (1 - t) + b * t;
export const ease = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
export const easeOut = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
export const easeInOut = (t) => { t = clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
export const backOut = (x) => { x = clamp(x, 0, 1); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
export const pop = (t, t0, d = 0.38) => (t < t0 ? 0 : backOut((t - t0) / d));
export const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);               // 0..1 di antara a dan b
export const win = (t, a, b, fade = 0.25) => clamp((t - a) / fade, 0, 1) * clamp((b - t) / fade, 0, 1);
export const r1 = (n) => Math.round(n * 10) / 10;
// pseudo-acak deterministik (supaya frame yang sama selalu identik)
export const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

export const g = (inner, { x = 0, y = 0, s = 1, r = 0, o = 1, ox = 0, oy = 0, sx, sy } = {}) =>
  `<g transform="translate(${r1(x)} ${r1(y)}) rotate(${r1(r)}) scale(${sx ?? s} ${sy ?? s}) translate(${-ox} ${-oy})" opacity="${r1(o * 100) / 100}">${inner}</g>`;
export const rect = (x, y, w, h, fill, rx = 0, extra = '') => `<rect x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}" rx="${rx}" fill="${fill}" ${extra}/>`;
export const circ = (x, y, r, fill, extra = '') => `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(r)}" fill="${fill}" ${extra}/>`;
export const txt = (s, x, y, { size = 40, fill = C.ink, weight = 800, anchor = 'middle', font = "'Plus Jakarta Sans',sans-serif", ls = 0, extra = '' } = {}) =>
  `<text x="${r1(x)}" y="${r1(y)}" font-family="${font}" font-weight="${weight}" font-size="${size}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${ls}" ${extra}>${s}</text>`;
export const hand = (s, x, y, o = {}) => txt(s, x, y, { font: "'Caveat',cursive", weight: 700, ...o });

/* ------------------------------------------------------------ properti */

/** Laptop tampak depan: layar (w x h) dengan isi; dasar tipis di bawah. */
export function laptop(x, y, w, h, screen = '', { glow = true } = {}) {
  return `<g transform="translate(${r1(x)} ${r1(y)})">`
    + (glow ? `<ellipse cx="${w / 2}" cy="${h / 2}" rx="${w * 0.78}" ry="${h * 0.8}" fill="#9DE0BD" opacity=".10"/>` : '')
    + rect(0, 0, w, h, '#2A3446', 22) + rect(14, 14, w - 28, h - 28, '#EAF6EE', 12)
    + `<svg x="14" y="14" width="${w - 28}" height="${h - 28}" viewBox="0 0 ${w - 28} ${h - 28}" overflow="hidden">${screen}</svg>`
    + rect(-34, h, w + 68, 22, '#3A455B', 11) + `</g>`;
}
/** Tumpukan kertas: n lembar sedikit bergeser. */
export function paperStack(x, y, n, { w = 220, h = 14, tilt = 1 } = {}) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const dx = (rnd(i + 3) - 0.5) * 18 * tilt, rot = (rnd(i + 9) - 0.5) * 3 * tilt;
    s += `<g transform="translate(${r1(x + dx)} ${r1(y - (i + 1) * h)}) rotate(${r1(rot)} ${w / 2} ${h / 2})">${rect(0, 0, w, h + 1, i % 2 ? '#FFFDF6' : '#F1EAD6', 4)}</g>`;
  }
  return s;
}
/** Folder dengan label. */
export function folder(x, y, w, h, color, label = '') {
  return `<g transform="translate(${r1(x)} ${r1(y)})">${rect(0, 0, w * 0.42, h * 0.22, color, 10)}${rect(0, h * 0.1, w, h * 0.9, color, 14)}${rect(0, h * 0.28, w, h * 0.72, 'rgba(255,255,255,.22)', 14)}`
    + (label ? txt(label, w / 2, h * 0.68, { size: Math.min(34, w / (label.length * 0.62)), fill: '#fff', weight: 800 }) : '') + `</g>`;
}
export function mug(x, y, s = 1, steam = 0, t = 0) {
  let st = '';
  if (steam > 0) for (let i = 0; i < 2; i++) st += `<path d="M${30 + i * 26} -8q-12 -22 0 -44t0 -44" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity="${r1(0.35 * steam)}" transform="translate(0 ${r1(Math.sin(t * 2 + i) * 4)})"/>`;
  return `<g transform="translate(${r1(x)} ${r1(y)}) scale(${s})">${st}${rect(0, 0, 92, 84, '#F4EBD8', 14)}<path d="M92 18q34 0 34 26t-34 26" fill="none" stroke="#F4EBD8" stroke-width="12"/>${rect(8, 8, 76, 14, '#6B4A33', 7)}</g>`;
}
export function clock(x, y, label, { size = 1, color = C.gold } = {}) {
  return `<g transform="translate(${r1(x)} ${r1(y)}) scale(${size})">${rect(0, 0, 290, 130, '#101B25', 24)}${txt(label, 145, 96, { size: 86, fill: color, weight: 800, font: "'Plus Jakarta Sans',sans-serif", ls: 3 })}</g>`;
}
export function phone(x, y, w, h, inner = '') {
  return `<g transform="translate(${r1(x)} ${r1(y)})">${rect(0, 0, w, h, '#1B2733', 48)}${rect(14, 14, w - 28, h - 28, '#F7F2E4', 36)}<svg x="14" y="14" width="${w - 28}" height="${h - 28}" viewBox="0 0 ${w - 28} ${h - 28}" overflow="hidden">${inner}</svg></g>`;
}
export function wallet(x, y, s = 1, fill = 0.25) {
  return `<g transform="translate(${r1(x)} ${r1(y)}) scale(${s})">${rect(0, 0, 260, 170, '#C58E5B', 28, 'stroke="#3E2A1B" stroke-width="6"')}${rect(0, 0, 260, 60, '#DCAE7C', 28, 'stroke="#3E2A1B" stroke-width="6"')}`
    + `<g opacity="${r1(fill > 0.05 ? 1 : 0)}">${rect(30, -14 - fill * 18, 150 * fill + 40, 26, '#9DE0BD', 6)}</g>${circ(222, 96, 22, '#F8C038')}${circ(222, 96, 12, '#E0A720')}</g>`;
}
/** Ikon lembar catatan dengan garis teks; marks = daftar [barisIndex, warna] yang disorot. */
export function notePage(x, y, w, h, lines = 12, marks = {}, seed = 0) {
  let s = `<g transform="translate(${r1(x)} ${r1(y)})">${rect(0, 0, w, h, C.paper, 20, 'stroke="#E5DCC4" stroke-width="3"')}`;
  const lh = (h - 70) / lines;
  for (let i = 0; i < lines; i++) {
    const ly = 44 + i * lh, lw = (w - 80) * (0.6 + rnd(i + seed) * 0.4);
    if (marks[i]) s += rect(30, ly - lh * 0.18, lw + 10, lh * 0.62, marks[i], 6, 'opacity=".85"');
    s += rect(36, ly, lw, lh * 0.26, '#B8B2A0', 5);
  }
  return s + `</g>`;
}
/** Gelembung obrolan; side 'l' atau 'r'. */
export function chatBubble(x, y, w, h, label, { side = 'l', fill = '#fff', ink = C.ink, avatar = C.mint, size = 30 } = {}) {
  return `<g transform="translate(${r1(x)} ${r1(y)})">${side === 'l' ? circ(26, h / 2, 26, avatar) : ''}`
    + rect(side === 'l' ? 62 : 0, 0, w - 62, h, fill, 26, 'stroke="rgba(10,56,48,.10)" stroke-width="2"')
    + txt(label, (side === 'l' ? 62 : 0) + (w - 62) / 2, h / 2 + size * 0.34, { size, fill: ink, weight: 700 }) + `</g>`;
}
/** Lencana notifikasi merah. */
export const badge = (x, y, n, s = 1) => `<g transform="translate(${r1(x)} ${r1(y)}) scale(${s})">${circ(0, 0, 34, C.coral, 'stroke="#fff" stroke-width="6"')}${txt(n, 0, 12, { size: 32, fill: '#fff' })}</g>`;
/** Tanda tanya melayang. */
export const qmark = (x, y, s = 1, o = 1, r = 0) => g(txt('?', 0, 0, { size: 90, fill: C.coral, weight: 800 }), { x, y, s, o, r });
/** Bintang kecil / percikan. */
export const sparkle = (x, y, s = 1, fill = C.gold, o = 1) => g(`<path d="M0 -26Q4 -4 26 0Q4 4 0 26Q-4 4 -26 0Q-4 -4 0 -26Z" fill="${fill}"/>`, { x, y, s, o });
/** Tanda centang dalam lingkaran. */
export const checkDot = (x, y, s = 1, o = 1) => g(circ(0, 0, 24, C.green) + `<path d="M-10 0l7 8l14 -17" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>`, { x, y, s, o });

// Pembantu tampilan bersama (kapsul label, label ilustrasi).
import { f1, clamp, FONT } from './core.js';
export const K = { bg0: '#06222B', bg1: '#0A4553', teal: '#00A08A', cyan: '#7FE7EE', gold: '#F8C038', coral: '#FF8A7A', ink: '#0B1F26', text: '#EEF9F7', mute: '#A8D0CC', line: 'rgba(124,224,184,.4)' };
export const R = (x, y, w, h, f, rx = 0, e = '') => `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" rx="${rx}" fill="${f}" ${e}/>`;
export const T = (x, y, txt, f, size, w = 800, anchor = 'middle', e = '') => `<text x="${f1(x)}" y="${f1(y)}" font-family="${FONT}" font-weight="${w}" font-size="${size}" fill="${f}" text-anchor="${anchor}" ${e}>${txt}</text>`;
export const tw = (txt, fs, w = 700) => txt.length * fs * (w >= 800 ? 0.645 : 0.58);
/** kapsul label; (x, y) = garis dasar teks; anchor m/l/r */
export function pill(x, y, txt, o = {}) {
  const fs = o.fs ?? 30, w = tw(txt, fs, o.w ?? 800) + (o.px ?? 36), h = fs + 22, a = o.a ?? 1; if (a <= 0.01) return '';
  const x0 = o.anchor === 'l' ? x : o.anchor === 'r' ? x - w : x - w / 2;
  return `<g opacity="${f1(a)}">${R(x0, y - fs - 6, w, h, o.bg ?? 'rgba(6,28,34,.88)', h / 2, `stroke="${o.c ?? K.cyan}" stroke-width="${o.sw ?? 3}"`)}${T(x0 + w / 2, y + 4, txt, o.fg ?? K.text, fs, o.w ?? 800)}</g>`;
}
export const ILU = (a = 1, txt = 'Ilustrasi sederhana, bukan citra pasien') => pill(540, 1418, txt, { fs: 26, c: 'rgba(248,192,56,.7)', w: 700, a, sw: 2 });
export const win = (t, a, b, f = 0.3) => clamp((t - a) / f) * clamp((b - t) / f);

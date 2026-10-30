// Judul dan label di atas dunia (tidak ikut kamera). Zona aman Reels: atas >= 280 px, bawah <= 1560 px.
import { clamp, sm, eob, win, wd, ln } from './scenes.js';
import * as W from './world3.js';
const { R, T } = W;
const card = (x, y, w, h, bg, rx = 36) => R(x - w / 2, y - h / 2 + 8, w, h, 'rgba(10,56,48,.28)', rx) + R(x - w / 2, y - h / 2, w, h, bg, rx);
const pop = (t, a, d = 0.35) => 0.7 + 0.3 * eob((t - a) / d);
const g = (x, y, s, a, inner) => (a > 0.005 ? `<g transform="translate(${x} ${y}) scale(${s.toFixed(3)})" opacity="${clamp(a, 0, 1).toFixed(3)}">${inner}</g>` : '');
export function overlay(t) {
  let o = '';
  // judul pembuka (K01, K02)
  o += g(540, 420, pop(t, 0.07), win(t, 0.07, 1.98, 0.18), card(0, 0, 920, 230, '#E8665F') + T(0, -6, 'KENA GAS AIR MATA', '#fff', 72) + T(0, 72, 'SAAT DEMO?', '#FFF1C6', 82));
  o += g(540, 420, pop(t, 2.36), win(t, 2.36, 3.8, 0.18), card(0, 0, 940, 230, '#0A3830') + T(0, -6, 'APA YANG TERJADI', '#fff', 72) + T(0, 72, 'DI TUBUHMU?', '#F8C038', 82));
  return o;
}

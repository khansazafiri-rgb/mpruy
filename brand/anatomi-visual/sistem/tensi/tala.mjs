// Tokoh: TALA (brand/characters/teman), mahasiswi teman Raka, dipakai apa adanya lewat temanSvg (tanpa menggambar manusia baru).
// File ini hanya menyusun gerak (kunci pose -> lerpTeman) dan menempatkan Tala di panggung video.
import { teman, temanSvg, lerpTeman, idleTeman } from '../../../characters/teman/teman.js';
import { clamp, lerp, ease } from './util.mjs';

export const SKALA = 1.38;                 // satuan tokoh (400 x 800) -> piksel kanvas
export const X0 = 470, Y0 = 1500;          // sumbu tengah badan dan lantai pada kanvas (sebelum kamera)
/** titik tokoh (u,v) -> kanvas */
export const kek = (u, v) => [X0 + (u - 200) * SKALA, Y0 - (778 - v) * SKALA];
export const DUNIA = `translate(${X0 - 200 * SKALA} ${Y0 - 778 * SKALA}) scale(${SKALA})`;

const KAKI_BERDIRI = { on: 1, dir: 0, sit: 0, L: { dx: 0, lift: 0, kx: 0 }, R: { dx: 0, lift: 0, kx: 0 } };
const KAKI_DUDUK = { on: 1, dir: 0, sit: 1, L: { dx: -8, lift: 0, kx: 0 }, R: { dx: 8, lift: 0, kx: 0 } };
export const BOB_DUDUK = 64;               // pinggul turun saat duduk (pantat di dudukan kursi)
export const MEJA_Y = 578;                 // permukaan meja (u, v tokoh), tepi kanan meja di u = 60
export const MEJA_X = 60;

/** Lengan ke titik dunia (u,v) tokoh, memperhitungkan bob dan condong (badan berputar di sekitar (200,580)). */
export function lenganKe(u, v, bob, lean, sisi = 'L', siku = null) {
  const a = -lean * Math.PI / 180, dx = u - 200, dy = v - bob - 580;
  const x = 200 + dx * Math.cos(a) - dy * Math.sin(a), y = 580 + dx * Math.sin(a) + dy * Math.cos(a);
  const sx = sisi === 'L' ? 104 : 296;
  const ex = siku ? siku[0] : sx + (x - sx) * 0.35 + (sisi === 'L' ? -26 : 26), ey = siku ? siku[1] : 410 + (y - 410) * 0.5 + 18;
  return { wx: x, wy: y, ex, ey, finger: 0, front: 1 };
}

/** Bangun state dari parameter ringkas. */
export function P(o = {}) {
  const d = { ekspresi: 'santai', sit: 0, bob: 0, lean: 0, tilt: 0, yaw: 0, gazeX: 0, gazeY: 0, lid: null, blink: 0, kiriMeja: true, kananBebas: 0, kananXY: null, brow: 0, mulut: null, ...o };
  const s = teman(d.ekspresi, 'berdiri', { legs: { ...(d.sit > 0.5 ? KAKI_DUDUK : KAKI_BERDIRI), sit: d.sit } });
  s.legs.sit = d.sit; s.legs.on = 1;
  s.bob = d.bob; s.lean = d.lean; s.tilt = d.tilt; s.yaw = d.yaw; s.gazeX = d.gazeX; s.gazeY = d.gazeY; s.blink = d.blink;
  if (d.lid != null) s.lid = d.lid;
  if (d.brow) { s.browL.y -= d.brow; s.browR.y -= d.brow; }
  if (d.mulut) Object.assign(s.mouth, d.mulut);
  // lengan kiri layar (sisi meja)
  if (d.kiriMeja === true) s.armL = lenganKe(MEJA_X - 6, MEJA_Y - 6, d.bob, d.lean, 'L');
  else if (d.kiriMeja) s.armL = { ...s.armL, ...d.kiriMeja };
  else s.armL = { wx: 96, wy: 556, ex: 90, ey: 488, finger: 0, front: 0 };
  if (d.kananXY) s.armR = { wx: d.kananXY[0], wy: d.kananXY[1], ex: d.kananXY[2] ?? 330, ey: d.kananXY[3] ?? 480, finger: 0, front: 1 };
  else s.armR = { wx: 304, wy: 556, ex: 310, ey: 488, finger: 0, front: 0, ...(d.kananBebas ? { wx: 304 + 36 * d.kananBebas, wy: 556 - 70 * d.kananBebas, ex: 312 + 30 * d.kananBebas, ey: 488 - 10 * d.kananBebas } : {}) };
  return s;
}
export { teman, temanSvg, lerpTeman, idleTeman };

/** Interpolasi antar kunci [[t, state]] dengan easing halus antar pasangan. */
export function antarKunci(t, ks, e = ease.sm) {
  if (t <= ks[0][0]) return ks[0][1];
  for (let i = 0; i < ks.length - 1; i++) if (t <= ks[i + 1][0]) { const u = (t - ks[i][0]) / (ks[i + 1][0] - ks[i][0]); return lerpTeman(ks[i][1], ks[i + 1][1], e(clamp(u))); }
  return ks[ks.length - 1][1];
}
export const gambarTala = (s, o = {}) => temanSvg(s, { bare: true, uid: o.uid || 'tl', ...o });

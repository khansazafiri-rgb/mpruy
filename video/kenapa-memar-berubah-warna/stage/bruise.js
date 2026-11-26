// Warna memar sepanjang video (ILUSTRATIF, tanpa jadwal hari): [waktu video, warna tengah, warna tepi, kepekatan]. Dipakai bersama oleh tampak luar (kaki Raka, kartu kulit) dan penampang jaringan,
// sehingga tampilan permukaan selalu cocok dengan pigmen di jaringan. Urutan mengikuti narasi: kemerahan/keunguan -> kehijauan -> kekuningan -> memudar.
import { clamp, lerp, mixc } from './common.js';
export const STOPS = [
  [1.30, '#C75366', '#E07A88', 0.0], [2.00, '#C75366', '#E58A94', 0.85], [4.90, '#8C4A8A', '#C65F78', 0.95], [12.3, '#7E4A92', '#BB5A78', 1.0], [19.0, '#7B4E9E', '#C85A70', 1.0],
  [21.0, '#6F5A9A', '#8E9A52', 1.0], [21.9, '#7FA64C', '#A3B24F', 1.0], [22.9, '#D9BD4E', '#B6B64F', 0.95], [23.6, '#E3C65E', '#E8CF7A', 0.8], [24.6, '#EBCF86', '#EFD79A', 0.4], [26.5, '#F0D8A0', '#F2DDB0', 0.18], [28.5, '#F7BC8E', '#F7BC8E', 0.0],
];
/** warna memar pada waktu t -> { c1, c2, a } (a = kepekatan 0..1) */
export function bruiseAt(t) {
  if (t <= STOPS[0][0]) return { c1: STOPS[0][1], c2: STOPS[0][2], a: 0 };
  for (let i = 1; i < STOPS.length; i++) if (t <= STOPS[i][0]) { const [t0, a0, b0, p0] = STOPS[i - 1], [t1, a1, b1, p1] = STOPS[i], u = (t - t0) / (t1 - t0), e = u * u * (3 - 2 * u); return { c1: mixc(a0, a1, e), c2: mixc(b0, b1, e), a: lerp(p0, p1, e) }; }
  const L = STOPS[STOPS.length - 1]; return { c1: L[1], c2: L[2], a: L[3] };
}
/** gradien radial untuk bercak memar (id unik) */
export const bruiseGrad = (id, b, soft = 0.55) => `<radialGradient id="${id}"><stop offset="0" stop-color="${b.c1}" stop-opacity="${b.a}"/><stop offset="${soft}" stop-color="${b.c1}" stop-opacity="${(b.a * 0.9).toFixed(3)}"/><stop offset="0.82" stop-color="${b.c2}" stop-opacity="${(b.a * 0.6).toFixed(3)}"/><stop offset="1" stop-color="${b.c2}" stop-opacity="0"/></radialGradient>`;

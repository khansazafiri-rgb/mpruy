// Peta ruang RUANG PERIKSA (satu orientasi di seluruh video): Raka duduk di tepi kursi, tampak samping tiga perempat, menghadap KANAN layar.
// Paha mendatar ke kanan, lutut di kanan paha, tungkai bawah menggantung ke bawah dan maju (ke kanan) saat refleks. Lutut yang diperiksa = lutut dekat-kamera (kaki R di raka.js), SELALU yang sama.
// Dokter hanya tampak sebagai lengan jas + tangan + palu dari kanan layar (tanpa karakter baru). Raka hanya dari rakaSvg() (pose `duduk`).
import { f1, clamp, lerp, sm, eo, eio, eob, K, T, R, C, raka, rIdle, lerpState, rk } from './common.js';

export const SK = { cx: 375, ty: 420, k: 1.2 };                       // Raka: pusat badan x, atas, skala
export const rp = (x, y) => [SK.cx + (x - 200) * SK.k, SK.ty + y * SK.k];   // koordinat Raka -> koordinat layar (dunia)
export const rg = (inner) => `<g transform="translate(${f1(SK.cx - 200 * SK.k)} ${f1(SK.ty)}) scale(${SK.k})">${inner}</g>`;
export const KNEE = [343, 578], SHIN = 98, HIP = [236, 566];          // pusat lutut kaki dekat, panjang tungkai bawah, pinggul (koordinat Raka)
export const FLOOR = 778;
export const rad = (d) => d * Math.PI / 180;
/** ankle kaki dekat untuk sudut ayun th (derajat; 0 = menggantung, + = maju/naik) */
export const ankleAt = (th) => [KNEE[0] + SHIN * Math.sin(rad(th)), KNEE[1] + SHIN * Math.cos(rad(th))];
export const tendonAt = (th) => { const a = rad(-th), [dx, dy] = [14, 38]; return [KNEE[0] + dx * Math.cos(a) - dy * Math.sin(a), KNEE[1] + dx * Math.sin(a) + dy * Math.cos(a)]; };
/** ayunan refleks: naik cepat ke amp (rise detik), lalu kembali dengan ayun teredam seperti bandul */
export function kick(t, t0, rise = 0.28, amp = 32) {
  const d = t - t0; if (d <= 0) return 0;
  if (d < rise) return amp * eo(d / rise);
  const e = d - rise; return amp * Math.exp(-e * 2.6) * Math.cos(2 * Math.PI * e / 1.4);
}
/** pasang sudut ayun th ke keadaan Raka (hanya kaki dekat bergerak) */
export function withKick(st, th) {
  const [ax, ay] = ankleAt(th); st.legs.R.dx = ax - 238; st.legs.R.lift = 752 - ay; st.legs.R.foot = -th; return st;
}
export const seated = (expr = 'netral', o = {}) => raka(expr, 'duduk', o);
// ------------------------------------------------------------------ lingkungan
export function room() {
  const fy = rp(0, FLOOR)[1] - 20;
  let s = `<rect x="-9000" y="-9000" width="18000" height="18000" fill="#F2EFE6"/><rect x="-200" y="${f1(fy)}" width="1500" height="1200" fill="#DDCDB1"/><rect x="-200" y="${f1(fy - 14)}" width="1500" height="16" fill="#C9B796"/>`;
  s += `<circle cx="120" cy="560" r="190" fill="#EADFC4" opacity=".7"/><rect x="760" y="440" width="230" height="300" rx="22" fill="#D5E6EE"/><rect x="776" y="456" width="198" height="268" rx="14" fill="#EAF4F8"/><rect x="867" y="456" width="12" height="268" fill="#D5E6EE"/><rect x="776" y="580" width="198" height="12" fill="#D5E6EE"/>`;
  return s;
}
/** kursi (belakang Raka), koordinat Raka */
export function chair() {
  return `<ellipse cx="205" cy="782" rx="170" ry="11" fill="#10212B" opacity=".14"/>`
    + `<rect x="84" y="636" width="16" height="142" rx="5" fill="#8E6A43"/><rect x="306" y="636" width="16" height="142" rx="5" fill="#8E6A43"/><rect x="112" y="640" width="190" height="10" rx="4" fill="#8E6A43" opacity=".7"/>`
    + `<rect x="62" y="402" width="34" height="238" rx="14" fill="#B98A5A"/><rect x="62" y="402" width="12" height="238" rx="6" fill="#CDA070"/>`
    + `<rect x="78" y="612" width="254" height="30" rx="12" fill="#C99A63"/><rect x="78" y="612" width="254" height="10" rx="5" fill="#DDB27C"/>`;
}
// ------------------------------------------------------------------ palu refleks dan lengan dokter
const HC = (() => { const [x, y] = rp(KNEE[0] + 31, KNEE[1] + 44); return [x + 24, y]; })();   // pusat kepala palu saat kontak: permukaan depan tungkai, tepat di bawah tempurung (tendon patela)
export const CONTACT = HC;
const HLEN = 272;
/** kunci gerak palu: [{ tc: waktu kontak }] -> { head, alpha, hit }; hit = 0..1 sesaat setelah kontak (untuk tanda benturan) */
export function hammerPose(t, taps) {
  const REST = { h: [1320, 830], a: -38 }, UP = { h: [HC[0] + 74, HC[1] - 150], a: -52 }, HIT = { h: HC, a: -24 }, BACK = { h: [HC[0] + 70, HC[1] - 52], a: -36 };
  let p = REST, hit = 0;
  for (const tc of taps) {
    const d = t - tc;
    if (d < -0.95 || d > 1.0) continue;
    const mix = (a, b, u) => ({ h: [lerp(a.h[0], b.h[0], u), lerp(a.h[1], b.h[1], u)], a: lerp(a.a, b.a, u) });
    if (d < -0.28) p = mix(REST, UP, sm((d + 0.95) / 0.67));
    else if (d < 0) p = mix(UP, HIT, Math.pow((d + 0.28) / 0.28, 2.2));
    else if (d < 0.2) { p = mix(HIT, BACK, eo(d / 0.2)); hit = d < 0.12 ? 1 - d / 0.12 : 0; }
    else p = mix(BACK, REST, sm((d - 0.2) / 0.8));
    break;
  }
  return { head: p.h, alpha: p.a, hit };
}
export function hammerSvg(t, taps) {
  const { head: [hx, hy], alpha } = hammerPose(t, taps), a = rad(alpha), wx = hx + HLEN * Math.cos(a), wy = hy + HLEN * Math.sin(a);
  if (wx > 1500) return '';
  const ang = alpha;   // palu menunjuk dari kepala ke pergelangan; kepala digambar di ujung kiri-bawah
  return `<g transform="translate(${f1(hx)} ${f1(hy)}) rotate(${f1(ang)})">`
    + `<rect x="0" y="-8" width="${HLEN}" height="16" rx="8" fill="${K.steel}" stroke="${K.steelD}" stroke-width="3"/>`
    + `<rect x="-6" y="-26" width="50" height="52" rx="6" fill="${K.steelD}"/>`
    + `<path d="M-36 -30L-6 -26L-6 26L-36 30C-46 22 -46 -22 -36 -30Z" fill="${K.hammer}" stroke="${K.hammerD}" stroke-width="4" stroke-linejoin="round"/>`
    + `</g>`
    + `<g transform="translate(${f1(wx)} ${f1(wy)}) rotate(${f1(ang)})"><rect x="0" y="-34" width="360" height="68" rx="22" fill="${K.coat}" stroke="${K.coatD}" stroke-width="4"/><rect x="-6" y="-38" width="22" height="76" rx="8" fill="${K.coatD}"/><circle cx="-14" cy="0" r="30" fill="#D9A47C"/><rect x="-44" y="-12" width="40" height="24" rx="12" fill="#D9A47C" transform="rotate(8)"/></g>`;
}
/** tanda benturan kecil di titik kontak */
export function impact(t, taps) {
  let s = '';
  for (const tc of taps) { const d = t - tc; if (d < 0 || d > 0.3) continue; const u = d / 0.3, [x, y] = [HC[0] - 22, HC[1]]; s += `<g opacity="${f1(1 - u)}" stroke="#fff" stroke-width="6" stroke-linecap="round" transform="translate(${f1(x)} ${f1(y)})"><path d="M${f1(-6 - 14 * u)} ${f1(-20 - 10 * u)}l${f1(-12)} -14M${f1(-14 - 16 * u)} 0l-20 0M${f1(-6 - 14 * u)} ${f1(20 + 10 * u)}l-12 14"/></g>`; }
  return s;
}

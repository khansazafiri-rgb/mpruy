// Bentuk dasar test pack hCG (aliran lateral). SATU peta ruang di seluruh video:
// sumbu x dunia = arah aliran, kiri -> kanan: ujung bantalan sampel (x 0) -> bantalan konjugat -> membran dengan zona T (x 1330) lalu zona C (x 1590) -> bantalan penyerap (x ~2400).
// Tampak atas (plan) dan tampak samping (penampang) memakai x yang sama, jadi label T dan C tidak pernah berpindah.
import { f1, clamp, R, T, INK, GOLD, FOREST, rndf } from './lib.js';
export const CC = { urine: '#FFD76A', urineD: '#F2B93B', mem: '#F6EEDD', memD: '#E6D8BC', casing: '#EEF3F6', edge: '#9FB0BA', pad: '#FFFFFF', backing: '#C5D0D7', particle: '#F4577A', line: '#E0356B', hcg: '#9B6BFF', hcgD: '#6A3FD6', yT: '#17B5A5', yC: '#5B8CFF', yDet: '#FFF1C1', ink: '#17303D', ok: '#2FBF92', bad: '#F2546B' };
export const XT = 1330, XC = 1590, WIN = { x0: 1060, x1: 1840, h: 130 }, TIP = { x0: 0, x1: 420 }, CASE = { x0: 380, x1: 2560, h: 230 }, SEC = { sample: [0, 620], conj: [560, 900], mem: [860, 2000], absorb: [1960, 2480] };
const sm = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
export const ease = sm;
/** antibodi berbentuk Y: pangkal di (x,y), menghadap arah rot (derajat, 0 = ke atas) */
export function Y(x, y, rot = 0, s = 1, fill = CC.yDet, o = {}) {
  const w = (o.w ?? 6) * s, k = 26 * s, a = 14 * s, ks = `M0 0L0 ${-k}M0 ${-k}L${-a} ${-k - 15 * s}M0 ${-k}L${a} ${-k - 15 * s}`;
  return `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)})" opacity="${o.a ?? 1}"><path d="${ks}" stroke="${CC.ink}" stroke-width="${f1(w + 5 * s)}" stroke-linecap="round" fill="none"/><path d="${ks}" stroke="${fill}" stroke-width="${f1(w)}" stroke-linecap="round" fill="none"/></g>`;
}
/** partikel berwarna dengan antibodi penangkap hCG (kind 'det') atau partikel kontrol dengan penanda kotak (kind 'ctl') */
export function particle(x, y, r = 24, kind = 'det', o = {}) {
  const n = kind === 'det' ? 5 : 5, ang0 = o.rot ?? 0; let ab = '';
  const free = o.free ?? [];      // indeks antibodi yang diberi warna menonjol
  for (let i = 0; i < n; i++) {
    const th = ang0 + (i * 360) / n + 18, px = Math.sin(th * Math.PI / 180) * (r - 2), py = -Math.cos(th * Math.PI / 180) * (r - 2);
    if (kind === 'det') ab += Y(px, py, th, r / 24, CC.yDet, { a: o.ab ?? 1 });
    else ab += `<g transform="translate(${f1(px)} ${f1(py)}) rotate(${f1(th)})" opacity="${o.ab ?? 1}"><path d="M0 0L0 ${-r * 0.7}" stroke="${CC.ink}" stroke-width="${f1(r * 0.3)}" stroke-linecap="round"/><rect x="${f1(-r * 0.26)}" y="${f1(-r * 1.15)}" width="${f1(r * 0.52)}" height="${f1(r * 0.52)}" fill="#FFB84D" stroke="${CC.ink}" stroke-width="${f1(r * 0.12)}"/></g>`;
  }
  return `<g transform="translate(${f1(x)} ${f1(y)})">${ab}<circle r="${r}" fill="${CC.particle}" stroke="${CC.ink}" stroke-width="${f1(r * 0.17)}"/><circle cx="${f1(-r * 0.32)}" cy="${f1(-r * 0.32)}" r="${f1(r * 0.24)}" fill="#fff" opacity=".45"/></g>`;
}
/** molekul hCG (dua subunit alfa dan beta) */
export function hcg(x, y, s = 1, rot = 0, o = {}) {
  return `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)}) scale(${s})" opacity="${o.a ?? 1}"><circle cx="-9" cy="0" r="13" fill="${CC.hcg}" stroke="${CC.ink}" stroke-width="4"/><circle cx="9" cy="-4" r="11" fill="#B592FF" stroke="${CC.ink}" stroke-width="4"/><circle cx="-12" cy="-4" r="3.5" fill="#fff" opacity=".5"/></g>`;
}
const wob = (x, ph, amp) => amp * Math.sin(x / 9 + ph) + amp * 0.6 * Math.sin(x / 3.7 + ph * 2.1);
/** tampak atas: tongkat test pack, jendela hasil, label T dan C tercetak pada casing. o: front (x dunia ujung cairan, 0 = kering), aT, aC (0..1), hot ('T'|'C'|null, 0..1), pool (0..1 genangan urine di kiri) */
export function plan(o = {}) {
  const fr = o.front ?? -1, aT = o.aT ?? 0, aC = o.aC ?? 0, hotK = o.hotK ?? 0, hotW = o.hot;
  let s = '';
  // genangan urine di kiri (ujung dicelupkan)
  if ((o.pool ?? 0) > 0.01) s += `<g opacity="${f1(o.pool * 100) / 100}"><path d="M-420 -170Q-420 220 -150 220L60 220L60 -170Z" fill="${CC.urine}" opacity=".9"/><path d="M-420 -170L60 -170" stroke="${CC.urineD}" stroke-width="8"/></g>`;
  // ujung bantalan sampel (terbuka) dan badan casing
  const tipWet = clamp(fr / 380);
  s += `<rect x="${TIP.x0}" y="-150" width="${TIP.x1 - TIP.x0}" height="300" rx="26" fill="${CC.pad}" stroke="${CC.edge}" stroke-width="7"/>`;
  s += `<rect x="${TIP.x0 + 4}" y="-146" width="${f1((TIP.x1 - TIP.x0 - 8) * tipWet)}" height="292" rx="24" fill="${CC.urine}" opacity=".85"/>`;
  s += `<rect x="${CASE.x0}" y="${-CASE.h}" width="${CASE.x1 - CASE.x0}" height="${2 * CASE.h}" rx="80" fill="${CC.casing}" stroke="${CC.edge}" stroke-width="8"/>`;
  s += `<rect x="${CASE.x0 + 16}" y="${-CASE.h + 18}" width="${CASE.x1 - CASE.x0 - 32}" height="46" rx="23" fill="#fff" opacity=".6"/>`;
  // jendela hasil + membran
  s += `<rect x="${WIN.x0 - 10}" y="${-WIN.h - 10}" width="${WIN.x1 - WIN.x0 + 20}" height="${2 * WIN.h + 20}" rx="22" fill="${CC.edge}"/>`;
  s += `<rect x="${WIN.x0}" y="${-WIN.h}" width="${WIN.x1 - WIN.x0}" height="${2 * WIN.h}" rx="14" fill="${CC.mem}"/>`;
  const wx = clamp(fr, WIN.x0, WIN.x1);
  if (fr > WIN.x0) {
    s += `<clipPath id="wc"><rect x="${WIN.x0}" y="${-WIN.h}" width="${WIN.x1 - WIN.x0}" height="${2 * WIN.h}" rx="14"/></clipPath><g clip-path="url(#wc)"><rect x="${WIN.x0}" y="${-WIN.h}" width="${f1(wx - WIN.x0)}" height="${2 * WIN.h}" fill="${CC.urine}" opacity=".55"/><path d="M${f1(wx)} ${-WIN.h}${Array.from({ length: 9 }, (_, i) => `L${f1(wx + wob(i * 20, 1, 7))} ${f1(-WIN.h + (i + 1) * (2 * WIN.h) / 9)}`).join('')}" fill="none" stroke="${CC.urineD}" stroke-width="6" opacity="${wx < WIN.x1 - 2 ? 0.9 : 0}"/></g>`;
  }
  const line = (x, a, cl) => `<rect x="${x - 18}" y="${-WIN.h}" width="36" height="${2 * WIN.h}" fill="${cl}" opacity="${f1(a * 1000) / 1000}"/>`;
  s += line(XT, aT, CC.line) + line(XC, aC, CC.line);
  // label tercetak (tidak pernah berpindah): T dan C di atas jendela
  s += T('T', XT, -WIN.h - 40, { size: 96, fill: CC.ink, w: 800 }) + T('C', XC, -WIN.h - 40, { size: 96, fill: CC.ink, w: 800 });
  if (hotK > 0.01) { for (const [k, x] of [['T', XT], ['C', XC]]) if (hotW === k || hotW === 'TC') s += `<rect x="${x - 64}" y="${-WIN.h - 10}" width="128" height="${2 * WIN.h + 20}" rx="22" fill="none" stroke="${GOLD}" stroke-width="10" stroke-dasharray="26 14" opacity="${f1(hotK * 100) / 100}"/>`; }
  s += `<circle cx="${CASE.x1 - 120}" cy="0" r="26" fill="${CC.edge}" opacity=".6"/>`;
  return s;
}
/** tampak samping (penampang) pada x dunia yang sama. o: front (x ujung cairan), aT, aC, arrows (0..1) */
export function side(o = {}) {
  const fr = o.front ?? -1; let s = '';
  const L = (x0, x1, y0, y1, fill, rx = 6, e = '') => `<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" rx="${rx}" fill="${fill}" ${e}/>`;
  const SH = `stroke="${CC.edge}" stroke-width="6"`;
  // casing: pelat bawah, pelat atas (dengan jendela hasil terbuka) dan dua ujung
  s += L(CASE.x0, CASE.x1, 90, 150, CC.casing, 10, SH);
  s += L(CASE.x0, WIN.x0, -190, -130, CC.casing, 10, SH) + L(WIN.x1, CASE.x1, -190, -130, CC.casing, 10, SH);
  s += L(CASE.x0, CASE.x0 + 46, -190, 150, CC.casing, 14, SH) + L(CASE.x1 - 46, CASE.x1, -190, 150, CC.casing, 14, SH);
  // kartu pendukung dan lapisan strip (lebih tebal agar terbaca)
  s += L(0, 2480, 50, 90, CC.backing, 8);
  s += L(SEC.absorb[0], SEC.absorb[1], -120, 50, '#EFE6D2', 18, `stroke="${CC.memD}" stroke-width="5"`);
  s += L(SEC.mem[0], SEC.mem[1], -34, 50, CC.mem, 6, `stroke="${CC.memD}" stroke-width="5"`);
  s += L(SEC.conj[0], SEC.conj[1], -84, 50, '#FBEFE0', 12, `stroke="${CC.memD}" stroke-width="5"`);
  s += L(SEC.sample[0], SEC.sample[1], -110, 50, CC.pad, 24, `stroke="${CC.edge}" stroke-width="5"`);
  if (fr > 0) {
    const wet = (x0, x1, y0) => { const a = Math.max(x0, 0), b = Math.min(x1, fr); return b > a ? `<rect x="${a}" y="${y0}" width="${f1(b - a)}" height="${50 - y0}" rx="10" fill="${CC.urine}" opacity=".85"/>` : ''; };
    s += wet(...SEC.sample, -110) + wet(...SEC.conj, -84) + wet(...SEC.mem, -34) + wet(...SEC.absorb, -120);
  }
  const lineS = (x, a) => `<rect x="${x - 12}" y="-44" width="24" height="14" fill="${CC.line}" opacity="${f1((a ?? 0) * 1000) / 1000}"/>`;
  s += lineS(XT, o.aT) + lineS(XC, o.aC);
  s += T('T', XT, -200, { size: 84, fill: CC.ink }) + T('C', XC, -200, { size: 84, fill: CC.ink });
  return s;
}
/** peta mini (tampak atas, diperkecil) yang menandai zona yang sedang diperbesar; kiri-kanan = arah aliran */
export function minimap(x, y, w, zoneX, o = {}) {
  const k = w / 2600, a = o.a ?? 1;
  return `<g opacity="${a}" transform="translate(${f1(x)} ${f1(y)}) scale(${f1(k * 1000) / 1000})"><rect x="-60" y="-190" width="2740" height="380" rx="70" fill="rgba(8,24,34,.78)"/><g transform="translate(0 0)">${plan({ aT: o.aT ?? 0, aC: o.aC ?? 0, front: o.front ?? -1 })}</g><circle cx="${zoneX}" cy="0" r="170" fill="none" stroke="${GOLD}" stroke-width="22"/></g>`;
}

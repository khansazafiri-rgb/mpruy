// Penampang depan (koronal) dada dan perut atas + laring. Satu sistem koordinat dunia (x tengah = 540):
// paru-paru di atas, diafragma melengkung di bawahnya, hati dan lambung di bawah diafragma, trakea naik ke laring (y ~ 150-268) di leher.
// Ilustrasi skematis edukatif (bukan citra pemeriksaan). Semua murni: parameter -> string SVG.
import { f1, clamp, lerp, K, op } from './common.js';

export const LAR = { x: 540, y: 212 };                 // pusat pita suara di dunia (kamera laring menuju ke sini)
export const DIA = { x: 540, y: 880 };                 // pusat diafragma
export const CAVITY = 'M404 262C300 290 226 385 214 525C208 650 232 790 262 890L240 1000L236 1900L844 1900L840 1000L818 890C848 790 872 650 866 525C854 385 780 290 676 262Z';
const BODY = 'M470 70L470 222C396 240 205 255 150 335C118 390 130 470 150 560L160 1900L920 1900L930 560C950 470 962 390 930 335C875 255 684 240 610 222L610 70Z';
const bump = (u) => { u = Math.abs(u); return u >= 1 ? 0 : Math.pow(1 - u * u, 1.6); };
/** tepi atas diafragma di x untuk kontraksi c (0 = melengkung santai, 1 = kubah turun dan mendatar) */
export const domeY = (x, c = 0) => 914 - (86 - 44 * c) * bump((x - 385) / 160) - (50 - 36 * c) * bump((x - 705) / 165);
const poly = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${f1(p[0])} ${f1(p[1])}`).join('');
const xs = (a, b, s = 8) => { const o = []; for (let x = a; x < b; x += s) o.push(x); o.push(b); return o; };

function lungs(c, a) {
  const yb = (x) => domeY(x, c) - 2, wd = 1 + 0.028 * c;
  let rl = `M512 ${f1(yb(512))}C514 760 508 590 496 500C486 430 446 392 402 396C330 404 270 480 244 600C228 690 230 790 262 ${f1(yb(262))}`;
  for (const x of xs(270, 512)) rl += `L${x} ${f1(yb(x))}`; rl += 'Z';
  let ll = `M574 ${f1(yb(574))}C572 760 578 600 590 510C600 440 640 398 684 400C760 408 826 490 848 610C862 700 848 790 818 ${f1(yb(818))}`;
  for (const x of xs(574, 810).reverse()) ll += `L${x} ${f1(yb(x))}`; ll += 'Z';
  const br = (d) => `<path d="${d}" fill="none" stroke="#E2788C" stroke-width="5" stroke-linecap="round" opacity=".65"/>`;
  const tree = br('M462 612L430 690L402 760M430 690L470 770M462 612L392 640L340 700M392 640L350 590M444 650L330 760') + br('M628 600L690 680L724 760M690 680L760 700M628 600L720 600L780 650M720 600L760 540M672 640L780 760');
  const g = `<g transform="translate(540 0) scale(${f1(wd * 1000) / 1000} 1) translate(-540 0)">`;
  return `${g}<path d="${rl}" fill="${K.lung}" stroke="${K.lungD}" stroke-width="6" stroke-linejoin="round"/><path d="${ll}" fill="${K.lung}" stroke="${K.lungD}" stroke-width="6" stroke-linejoin="round"/>${tree}`
    + `<path d="M300 520C284 560 276 620 276 680" stroke="#FAC2CB" stroke-width="12" stroke-linecap="round" fill="none" opacity=".75"/><path d="M800 530C816 570 822 630 818 690" stroke="#FAC2CB" stroke-width="12" stroke-linecap="round" fill="none" opacity=".75"/></g>`;
}
function organsBelow(c) {
  const top = (x) => domeY(x, c) + 42, d = 16 * c;
  let lv = `M250 ${f1(top(250))}`; for (const x of xs(258, 650)) lv += `L${x} ${f1(top(x))}`;
  lv += `C690 ${f1(1000 + d)} 650 ${f1(1130 + d)} 540 ${f1(1165 + d)}C430 ${f1(1195 + d)} 300 ${f1(1170 + d)} 262 ${f1(1090 + d)}C244 1040 240 ${f1(top(250) + 60)} 250 ${f1(top(250))}Z`;
  let st = `M668 ${f1(top(668))}`; for (const x of xs(676, 840)) st += `L${x} ${f1(top(x))}`;
  st += `C890 ${f1(1010 + d * 0.8)} 890 ${f1(1150 + d * 0.8)} 800 ${f1(1192 + d * 0.8)}C730 ${f1(1222 + d * 0.8)} 650 ${f1(1170 + d * 0.8)} 662 ${f1(1090 + d * 0.6)}C668 1040 660 ${f1(top(668) + 20)} 668 ${f1(top(668))}Z`;
  return `<path d="${lv}" fill="${K.liver}" stroke="${K.liverD}" stroke-width="6" stroke-linejoin="round"/><path d="M300 1060C380 1100 470 1110 560 1080" stroke="#C4795F" stroke-width="10" stroke-linecap="round" fill="none" opacity=".6"/>`
    + `<path d="${st}" fill="${K.stomach}" stroke="${K.stomachD}" stroke-width="6" stroke-linejoin="round"/><path d="M700 1040C740 1000 800 1010 830 1050" stroke="#F8BBA8" stroke-width="10" stroke-linecap="round" fill="none" opacity=".7"/>`;
}
function heart() {
  return `<g transform="translate(612 764) rotate(-24)"><path d="M0 74C-74 22 -86 -40 -42 -64C-16 -78 0 -60 0 -46C0 -60 24 -78 48 -64C92 -40 74 22 0 74Z" fill="${K.heart}" stroke="${K.heartD}" stroke-width="6" stroke-linejoin="round"/><path d="M-44 -44C-52 -22 -46 0 -30 14" stroke="#F08A92" stroke-width="9" stroke-linecap="round" fill="none" opacity=".7"/></g>`;
}
/** diafragma: pita emas melengkung. glow 0..1 menyorot (halo + tepi putih) */
function diaphragm(c, glow = 0, pulse = 0) {
  const top = xs(204, 884).map((x) => [x, domeY(x, c)]), bot = top.map(([x, y]) => [x, y + 44]).reverse();
  const d = poly(top) + 'L' + poly(bot).slice(1) + 'Z';
  const hi = poly(xs(250, 840).map((x) => [x, domeY(x, c) + 9]));
  const halo = glow > 0.01 ? `<path d="${d}" fill="none" stroke="${K.gold}" stroke-width="${f1(26 + 14 * pulse)}" stroke-linejoin="round" opacity="${f1(0.45 * glow)}"/><path d="${d}" fill="none" stroke="#fff" stroke-width="5" stroke-linejoin="round" opacity="${f1(glow)}" transform="translate(0 0)"/>` : '';
  return `${halo}<path d="${d}" fill="${K.gold}" stroke="${K.goldD}" stroke-width="6" stroke-linejoin="round"/><path d="${hi}" fill="none" stroke="${K.goldHi}" stroke-width="7" stroke-linecap="round" opacity=".8"/>`;
}
function trachea() {
  let rings = ''; for (let y = 276; y < 512; y += 17) rings += `<rect x="514" y="${y}" width="52" height="6" rx="3" fill="${K.airD}" opacity=".85"/>`;
  const br = (d, w, col) => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>`;
  return br('M532 506Q522 560 462 612', 36, K.wallD) + br('M548 506Q558 556 628 600', 36, K.wallD) + br('M532 506Q522 560 462 612', 26, K.air) + br('M548 506Q558 556 628 600', 26, K.air)
    + `<rect x="516" y="266" width="48" height="250" fill="${K.air}" stroke="${K.wallD}" stroke-width="6"/><rect x="519" y="266" width="42" height="250" fill="${K.air}"/>${rings}`;
}
/** laring (kotak suara) dan pita suara. g = jarak antara ujung kedua pita (px dunia): ~24 terbuka, ~-2 menutup. */
export function larynx(g = 24, o = {}) {
  const tip = 540 - g / 2;
  const L = `M506 190L${f1(tip - 8)} 205Q${f1(tip)} 210 ${f1(tip)} 218Q${f1(tip - 1)} 228 ${f1(tip - 10)} 232L506 246Z`;
  const mir = 'transform="translate(1080 0) scale(-1 1)"';
  const stroke = `stroke="${K.cordD}" stroke-width="4" stroke-linejoin="round"`;
  const tension = o.tension ?? 0;
  return `<rect x="494" y="76" width="92" height="82" rx="10" fill="#A7B8DA" stroke="${K.wallD}" stroke-width="5"/>`
    + `<path d="M480 160Q480 150 490 150L590 150Q600 150 600 160L602 250Q602 266 586 268L494 268Q478 266 478 250Z" fill="${K.wall}" stroke="${K.wallD}" stroke-width="5" stroke-linejoin="round"/>`
    + `<path d="M510 76L570 76L570 232L562 244L562 270L518 270L518 244L510 232Z" fill="${K.air}"/>`
    + `<path d="M514 90L514 190" stroke="${K.airHi}" stroke-width="5" stroke-linecap="round" opacity=".9"/>`
    + `<path d="${L}" fill="${K.cord}" ${stroke}/><path d="${L}" fill="${K.cord}" ${stroke} ${mir}/>`
    + `<path d="M513 199L${f1(tip - 7)} 209" stroke="${K.cordHi}" stroke-width="4" stroke-linecap="round" opacity="${f1(0.9 - 0.3 * tension)}"/><path d="M513 199L${f1(tip - 7)} 209" stroke="${K.cordHi}" stroke-width="4" stroke-linecap="round" opacity="${f1(0.9 - 0.3 * tension)}" ${mir}/>`;
}
/** panah udara (menunjuk ke atas) berujung di (x, y) */
export const airArrow = (x, y, h = 70, a = 1, w = 14, down = true) => `<g opacity="${f1(clamp(a) * 100) / 100}" ${down ? `transform="rotate(180 ${f1(x)} ${f1(y + h / 2)})"` : ''}><path d="M${f1(x)} ${f1(y)}L${f1(x + w * 1.45)} ${f1(y + h * 0.36)}L${f1(x + w * 0.5)} ${f1(y + h * 0.36)}L${f1(x + w * 0.5)} ${f1(y + h)}L${f1(x - w * 0.5)} ${f1(y + h)}L${f1(x - w * 0.5)} ${f1(y + h * 0.36)}L${f1(x - w * 1.45)} ${f1(y + h * 0.36)}Z" fill="#3E96BE" stroke="#2A7AA0" stroke-width="2.5" stroke-linejoin="round"/></g>`;
/** busur bunyi dari (cx, cy) ke atas; p 0..1 */
export function soundArcs(cx, cy, p) {
  if (p <= 0 || p >= 1) return ''; let s = '';
  for (let i = 0; i < 3; i++) { const q = clamp(p * 1.35 - i * 0.18); if (q <= 0 || q >= 1) continue; const r = 12 + q * 62 + i * 5, a = (1 - q) * 0.95;
    s += `<path d="M${f1(cx - r * 0.82)} ${f1(cy - r * 0.57)}A${f1(r)} ${f1(r)} 0 0 1 ${f1(cx + r * 0.82)} ${f1(cy - r * 0.57)}" fill="none" stroke="${i === 1 ? K.gold : K.cord}" stroke-width="${f1(4.2 - i * 0.6)}" stroke-linecap="round" opacity="${f1(a)}"/>`; }
  return s;
}
/** seluruh penampang. c = kontraksi diafragma; dim = redupkan organ lain 0..1; glow = sorot diafragma 0..1; g = celah pita suara */
export function anatomy(o = {}) {
  const c = o.c ?? 0, dim = o.dim ?? 0, uid = o.uid ?? 'an', od = 1 - 0.55 * dim;
  return `<defs><clipPath id="cav-${uid}"><path d="${CAVITY}"/></clipPath></defs>`
    + `<path d="${BODY}" fill="${K.skin}" stroke="${K.skinD}" stroke-width="8" stroke-linejoin="round"/>`
    + `<path d="${CAVITY}" fill="${K.cavity}" stroke="${K.cavityD}" stroke-width="8"/>`
    + `<g clip-path="url(#cav-${uid})"><g opacity="${f1(od * 100) / 100}">${organsBelow(c)}</g><g opacity="${f1(od * 100) / 100}">${lungs(c)}${o.noHeart ? '' : heart()}</g>${diaphragm(c, o.glow ?? 0, o.pulse ?? 0)}</g>`
    + `<g opacity="${f1(Math.max(od, o.airKeep ?? 0) * 100) / 100}">${trachea()}</g>${larynx(o.g ?? 24, o)}`;
}
/** peta mini badan: titik 1 (diafragma) dan 2 (pita suara); aktif 0..2; denyut tiap titik */
export function miniMap(x, y, w, h, o = {}) {
  const k = (w - 28) / 860, c = o.c ?? 0, a1 = o.a1 ?? 0, a2 = o.a2 ?? 0, tx = x + 14 - 140 * k, ty = y + 66 - 70 * k;
  const pt = (wx, wy, col, a, n, pul) => { const px = tx + wx * k, py = ty + wy * k; return `<circle cx="${f1(px)}" cy="${f1(py)}" r="${f1(14 + 10 * pul)}" fill="${col}" opacity="${f1(0.35 * a)}"/><circle cx="${f1(px)}" cy="${f1(py)}" r="13" fill="${col}" stroke="#fff" stroke-width="4"/><text x="${f1(px)}" y="${f1(py + 7)}" text-anchor="middle" font-family="'Plus Jakarta Sans'" font-weight="800" font-size="19" fill="#172B38">${n}</text>`; };
  return `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="30" fill="rgba(10,16,40,.78)" stroke="rgba(255,255,255,.25)" stroke-width="3"/>`
    + `<clipPath id="mm-clip"><rect x="${x + 6}" y="${y + 6}" width="${w - 12}" height="${h - 80}" rx="26"/></clipPath><g clip-path="url(#mm-clip)"><g transform="translate(${f1(tx)} ${f1(ty)}) scale(${f1(k * 1000) / 1000})">${anatomy({ c, uid: 'mm', noHeart: false })}</g>`
    + `${pt(DIA.x, 870, K.gold, 1, '1', o.p1 ?? 0)}${pt(LAR.x, LAR.y + 10, K.cord, a2, '2', o.p2 ?? 0)}</g>`
    + `<text x="${x + w / 2}" y="${y + h - 48}" text-anchor="middle" font-family="'Plus Jakarta Sans'" font-weight="800" font-size="30" fill="${K.gold}" opacity="${f1(0.55 + 0.45 * a1)}">1 diafragma</text>`
    + `<text x="${x + w / 2}" y="${y + h - 14}" text-anchor="middle" font-family="'Plus Jakarta Sans'" font-weight="800" font-size="30" fill="${K.cordHi}" opacity="${f1(0.55 + 0.45 * a2)}">2 pita suara</text></g>`;
}
export const navyBg = `<defs><linearGradient id="nbg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1D2E5E"/><stop offset="1" stop-color="#0F1938"/></linearGradient></defs><rect x="-9000" y="-9000" width="18000" height="18000" fill="url(#nbg)"/>`;

// Tokoh "orang yang mengalami reaksi" (BUKAN Raka): dewasa, proporsi wajar. Satuan lokal: kepala setinggi ~300 (tinggi kepala dewasa ~ 22 cm -> 1 cm = 13,6 satuan), bahu lebar ~540 (40 cm).
// Titik acuan: pusat kepala (0,0); dagu y ~148; bahu y ~250; dada bawah y ~700. Menghadap depan.
import { f1, clamp, lerp, R, INK } from './lib.js';
export const SK0 = '#C98E64', SKD0 = '#B97C54', HAIR0 = '#2B2233', SHIRT0 = '#8AA5C8', SHIRTD0 = '#7690B3', WHEAL = '#F0675B', WHEALH = '#FFB3A8';
const HIVES = [[-78, 52, 11], [86, 38, 12], [-40, 108, 9], [60, 100, 10], [-100, 6, 8], [20, 196, 10], [-60, 210, 11], [74, 214, 9], [-120, 320, 12], [120, 300, 12], [0, 330, 11], [-30, 440, 12], [60, 410, 10], [-150, 500, 10], [150, 480, 11]];
/** o: hives 0..1, flush 0..1, worry 0..1, mouth 0..1, eyes 0..1 (1 = tertutup), tilt derajat, breathe 0..1 (fase), amp (amplitudo napas), hand 0..1 (tangan ke leher), eat 0..1 (garpu ke mulut), sweat 0..1 */
export function orang(o = {}) {
  const SK = o.sk ?? SK0, SKD = o.skd ?? SKD0, HAIR = o.hair ?? HAIR0, SHIRT = o.shirt ?? SHIRT0, SHIRTD = o.shirtd ?? SHIRTD0;
  const hv = o.hives ?? 0, fl = o.flush ?? 0, wr = o.worry ?? 0, mo = o.mouth ?? 0, ey = o.eyes ?? 0, tilt = o.tilt ?? 0, am = o.amp ?? 0.03, ph = o.breathe ?? 0, ha = o.hand ?? 0, ea = o.eat ?? 0, sw = o.sweat ?? 0;
  const br = 1 + am * Math.sin(ph * 2 * Math.PI);
  let s = '';
  // badan: kaus + bahu
  s += `<g transform="translate(0 250) scale(${f1((1 + am * 0.35 * Math.sin(ph * 2 * Math.PI)) * 1000) / 1000} ${f1(br * 1000) / 1000}) translate(0 -250)"><path d="M-270 260Q-270 215 -215 205L-120 180Q0 220 120 180L215 205Q270 215 270 260L285 560L260 760H-260L-285 560Z" fill="${SHIRT}"/><path d="M-120 180Q0 250 120 180Q60 230 0 232Q-60 230 -120 180Z" fill="${SHIRTD}"/></g>`;
  // leher
  s += `<rect x="-52" y="110" width="104" height="110" rx="30" fill="${SKD}"/><path d="M-120 180Q0 250 120 180L110 196Q0 262 -110 196Z" fill="${SK}" opacity="0"/><path d="M-70 206Q0 252 70 206L56 170Q0 215 -56 170Z" fill="${SK}"/>`;
  // lengan: kiri layar = tangan ke leher; kanan layar = garpu
  const armL = (() => { const sh = [-235, 250], el0 = [-290, 480], h0 = [-300, 690], el1 = [-300, 390], h1 = [-70, 235]; const el = [lerp(el0[0], el1[0], ha), lerp(el0[1], el1[1], ha)], hd = [lerp(h0[0], h1[0], ha), lerp(h0[1], h1[1], ha)]; return `<path d="M${sh[0]} ${sh[1]}L${f1(el[0])} ${f1(el[1])}" stroke="${SHIRT}" stroke-width="84" stroke-linecap="round" fill="none"/><path d="M${f1(el[0])} ${f1(el[1])}L${f1(hd[0])} ${f1(hd[1])}" stroke="${SK}" stroke-width="64" stroke-linecap="round" fill="none"/><circle cx="${f1(hd[0])}" cy="${f1(hd[1])}" r="42" fill="${SK}"/>`; })();
  const armR = (() => { const sh = [235, 250], el0 = [300, 470], h0 = [250, 650], el1 = [250, 400], h1 = [60, 150]; const k = ea; const el = [lerp(el0[0], el1[0], k), lerp(el0[1], el1[1], k)], hd = [lerp(h0[0], h1[0], k), lerp(h0[1], h1[1], k)]; return `<path d="M${sh[0]} ${sh[1]}L${f1(el[0])} ${f1(el[1])}" stroke="${SHIRT}" stroke-width="84" stroke-linecap="round" fill="none"/><path d="M${f1(el[0])} ${f1(el[1])}L${f1(hd[0])} ${f1(hd[1])}" stroke="${SK}" stroke-width="64" stroke-linecap="round" fill="none"/>${o.fork !== false ? `<g transform="translate(${f1(hd[0])} ${f1(hd[1])}) rotate(${f1(lerp(10, -20, k))})"><path d="M0 -10L0 -120" stroke="#B9C3CC" stroke-width="10" stroke-linecap="round"/><path d="M-14 -120V-155M0 -120V-158M14 -120V-155" stroke="#B9C3CC" stroke-width="7" stroke-linecap="round"/><circle cx="0" cy="-165" r="14" fill="#7BC043"/></g>` : ''}<circle cx="${f1(hd[0])}" cy="${f1(hd[1])}" r="42" fill="${SK}"/>`; })();
  // kepala (miring dari leher)
  let head = '';
  head += `<ellipse cx="-126" cy="6" rx="22" ry="36" fill="${SKD}"/><ellipse cx="126" cy="6" rx="22" ry="36" fill="${SKD}"/><ellipse cx="0" cy="0" rx="124" ry="150" fill="${SK}"/>`;
  head += `<path d="M-132 -20Q-150 -150 0 -158Q150 -150 132 -20Q120 -92 40 -110Q-50 -96 -132 -20Z" fill="${HAIR}"/><path d="M-90 -112Q-20 -150 100 -100Q40 -134 -90 -112Z" fill="${HAIR}"/>`;
  head += `<ellipse cx="-72" cy="48" rx="40" ry="28" fill="${WHEAL}" opacity="${f1(fl * 0.45 * 100) / 100}"/><ellipse cx="72" cy="48" rx="40" ry="28" fill="${WHEAL}" opacity="${f1(fl * 0.45 * 100) / 100}"/>`;
  const ey0 = 9 * (1 - ey * 0.85);
  head += `<ellipse cx="-48" cy="-8" rx="11" ry="${f1(ey0 + 1)}" fill="${INK}"/><ellipse cx="48" cy="-8" rx="11" ry="${f1(ey0 + 1)}" fill="${INK}"/>`;
  head += `<path d="M-72 ${f1(-44 - wr * 6)}L-26 ${f1(-52 + wr * 12)}" stroke="${HAIR}" stroke-width="9" stroke-linecap="round"/><path d="M72 ${f1(-44 - wr * 6)}L26 ${f1(-52 + wr * 12)}" stroke="${HAIR}" stroke-width="9" stroke-linecap="round"/>`;
  head += `<path d="M-8 20Q0 38 8 20" stroke="${SKD}" stroke-width="6" fill="none" stroke-linecap="round"/>`;
  head += mo > 0.05 ? `<ellipse cx="0" cy="82" rx="${f1(22 + 10 * mo)}" ry="${f1(8 + 22 * mo)}" fill="#7A2D2E"/>` : `<path d="M-26 ${f1(84 + wr * 8)}Q0 ${f1(94 - wr * 14)} 26 ${f1(84 + wr * 8)}" stroke="#7A2D2E" stroke-width="8" fill="none" stroke-linecap="round"/>`;
  if (sw > 0.05) head += `<path d="M118 -90q16 26 0 40q-16 -14 0 -40Z" fill="#9AD1F5" opacity="${f1(sw)}"/><path d="M-130 -66q14 22 0 34q-14 -12 0 -34Z" fill="#9AD1F5" opacity="${f1(sw)}"/>`;
  // bentol (berurutan)
  let hvs = '';
  HIVES.forEach(([x, y, r], i) => { const a = clamp(hv * HIVES.length - i); if (a > 0.01) hvs += `<g opacity="${f1(a * 100) / 100}"><circle cx="${x}" cy="${y}" r="${f1(r * (0.5 + 0.5 * a))}" fill="${WHEAL}"/><circle cx="${x - r * 0.25}" cy="${y - r * 0.25}" r="${f1(r * 0.4)}" fill="${WHEALH}"/></g>`; });
  const headHives = hvs, bodyHives = '';
  s += `<g transform="rotate(${f1(tilt)} 0 190)">${head}</g>`;
  s += `<g>${headHives}</g>`;
  if (o.arms !== false) s += armL + armR;
  return s;
}
export const orangBust = (o) => orang(o);

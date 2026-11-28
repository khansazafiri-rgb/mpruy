// Penampang kulit SATU unit folikel (ilustrasi edukatif). Orientasi tetap: permukaan di ATAS, akar rambut di BAWAH, otot arrector pili miring dari folikel (kiri-bawah) ke lapisan atas kulit (kanan),
// saraf simpatik datang dari bawah ke otot, reseptor dingin di dekat permukaan (kiri). Warna: dingin = biru, sinyal simpatik = emas, otot = merah muda, rambut = cokelat tua.
import { f1, clamp, lerp, sm, eo, eio, seg, rndf, mixc, pathPt, pathLen } from './common.js';
export const SK = { epi: '#F2B08E', epiD: '#D98E6C', derm: '#FAD9C6', dermD: '#F0BFA8', fat: '#FBE6A6', fatD: '#F0D27F', sheath: '#E6A9B9', sheathD: '#B8758A', inner: '#F9E3E8', hair: '#3A2A22', musc: '#D96C7A', muscD: '#9E3A4D', mact: '#FF6B7E', gold: '#F8C038', goldD: '#B9861A', cold: '#4FC3F7', coldD: '#1B88C4', seb: '#FFF0B8', sebD: '#E0C060', air: '#DDF1FB', deep: '#1E2B55' };
export const TH0 = 42 * Math.PI / 180, TH1 = 9 * Math.PI / 180, LF = 430, LH = 190, MS = 250, AP = [240, 72];
const dirOf = (th) => [-Math.sin(th), Math.cos(th)];
export const folF = (th) => { const d = dirOf(th); return [MS * d[0], MS * d[1]]; };
export const surfY = (x, bump) => -bump * Math.exp(-((x / 90) ** 2)) + 0.38 * bump * Math.exp(-(((x - AP[0]) / 55) ** 2));
export const SENS = 'M-250 66C-250 300 -300 680 -90 1000';
export const BRAIN = [0, 1100];
const L_SENS = pathLen(SENS);
export const symPath = (nb) => `M60 1000C130 760 270 520 ${f1(nb[0])} ${f1(nb[1])}`;
export const muscEnds = (st) => { const F0 = folF(TH0), F1 = folF(TH1), mc = st.mc || 0; return [lerp(F0[0], F1[0], mc), lerp(F0[1], F1[1], mc)]; };
export const nerveBelly = (st) => { const E = muscEnds(st); return [lerp(E[0], AP[0], 0.56), lerp(E[1], AP[1], 0.56) + 20]; };
const poly = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${f1(p[0])} ${f1(p[1])}`).join('');
/** st = { th, mc, act, bump, cold, ghost, t, sensP (0..1), symP (0..1) } */
export function skinWorld(t, st, o = {}) {
  const th = st.th ?? TH0, d = dirOf(th), bump = st.bump || 0, cold = st.cold || 0;
  let w = `<rect x="-2400" y="-2000" width="4800" height="2000" fill="#EEF7FC"/>`;
  // dermis + lemak + area dalam tubuh
  w += `<rect x="-2400" y="0" width="4800" height="640" fill="${SK.derm}"/><rect x="-2400" y="640" width="4800" height="280" fill="${SK.fat}"/>`;
  for (let i = 0; i < 46; i++) w += `<circle cx="${f1(-1100 + rndf(i) * 2200)}" cy="${f1(100 + rndf(i + 40) * 520)}" r="${f1(8 + rndf(i + 4) * 14)}" fill="${SK.dermD}" opacity=".5"/>`;
  for (let i = 0; i < 18; i++) w += `<ellipse cx="${f1(-1000 + rndf(i + 90) * 2000)}" cy="${f1(700 + rndf(i + 70) * 180)}" rx="${f1(40 + rndf(i + 2) * 40)}" ry="${f1(30 + rndf(i + 5) * 22)}" fill="${SK.fatD}" opacity=".55"/>`;
  w += `<rect x="-2400" y="900" width="4800" height="2400" fill="${SK.deep}"/>`;
  // epidermis (permukaan mengikuti tonjolan), warna mendingin saat dingin
  const xs = []; for (let x = -1500; x <= 1500; x += 20) xs.push(x);
  const top = xs.map((x) => [x, surfY(x, bump)]), bot = xs.slice().reverse().map((x) => [x, 62 + surfY(x, bump) * 0.4]);
  const epc = mixc(SK.epi, '#C4B9F0', cold * 0.5);
  w += `<path d="${poly(top)}${poly(bot).replace('M', 'L')}Z" fill="${epc}" stroke="${SK.epiD}" stroke-width="5" stroke-linejoin="round"/>`;
  // folikel: selubung, rambut, bulbus
  const P = [0, surfY(0, bump) * 0.7], B = [P[0] + LF * d[0], P[1] + LF * d[1]], Hh = [P[0] - LH * d[0], P[1] - LH * d[1] - (th < 0.4 ? 0 : 0)];
  const fol = (alpha, dash, ghost) => `<g opacity="${alpha}"${ghost ? ` fill="none"` : ''}>${ghost ? `<path d="M${f1(P[0])} ${f1(P[1])}L${f1(B[0])} ${f1(B[1])}" stroke="${SK.sheathD}" stroke-width="80" stroke-dasharray="14 12" stroke-linecap="round" fill="none"/>` : `<path d="M${f1(P[0])} ${f1(P[1])}L${f1(B[0])} ${f1(B[1])}" stroke="${SK.sheathD}" stroke-width="84" stroke-linecap="round"/><path d="M${f1(P[0])} ${f1(P[1])}L${f1(B[0])} ${f1(B[1])}" stroke="${SK.sheath}" stroke-width="72" stroke-linecap="round"/><path d="M${f1(P[0])} ${f1(P[1])}L${f1(B[0])} ${f1(B[1])}" stroke="${SK.inner}" stroke-width="40" stroke-linecap="round"/><circle cx="${f1(B[0])}" cy="${f1(B[1])}" r="52" fill="${SK.sheath}" stroke="${SK.sheathD}" stroke-width="8"/><circle cx="${f1(B[0] - d[0] * 8)}" cy="${f1(B[1] - d[1] * 8)}" r="20" fill="#D9677A"/>`}</g>`;
  // kelenjar sebasea (di sisi berlawanan dengan otot)
  const gs = [P[0] + 130 * d[0] - 72 * d[1] * -1 * -1, P[1] + 130 * d[1] + 72 * d[0]];
  w += `<ellipse cx="${f1(P[0] + 130 * d[0] - 74 * d[1] * -1 + 0)}" cy="${f1(P[1] + 130 * d[1] - 74 * d[0] * 0 + 0)}" rx="0" ry="0"/>`;
  const gx = P[0] + 130 * d[0] - 70, gy = P[1] + 130 * d[1] + 4;
  w += `<ellipse cx="${f1(gx)}" cy="${f1(gy)}" rx="46" ry="30" fill="${SK.seb}" stroke="${SK.sebD}" stroke-width="6" transform="rotate(-20 ${f1(gx)} ${f1(gy)})"/>`;
  if (st.ghost > 0.01) { w += fol(f1(0.55 * st.ghost), true, true); const d0 = dirOf(TH0), P0 = [0, 0], H0 = [LH * Math.sin(TH0), -LH * Math.cos(TH0)]; w += `<path d="M${f1(-8 * Math.sin(TH0))} 0L${f1(H0[0])} ${f1(H0[1])}" stroke="${SK.hair}" stroke-width="10" stroke-dasharray="10 9" stroke-linecap="round" opacity="${f1(0.5 * st.ghost)}"/>`; }
  w += fol(1, false, false);
  w += `<path d="M${f1(B[0])} ${f1(B[1])}L${f1(P[0])} ${f1(P[1])}L${f1(P[0] - LH * d[0])} ${f1(P[1] - LH * d[1])}" stroke="${SK.hair}" stroke-width="22" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
  // otot arrector pili: gelendong dari ujung (menempel pada folikel lewat jaringan ikat) ke lapisan atas dermis; memendek = menebal
  const E = muscEnds(st), Fth = folF(th), L0 = Math.hypot(folF(TH0)[0] - AP[0], folF(TH0)[1] - AP[1]), L = Math.hypot(E[0] - AP[0], E[1] - AP[1]);
  const ux = (AP[0] - E[0]) / L, uy = (AP[1] - E[1]) / L, nx = -uy, ny = ux, wd = 38 * Math.pow(L0 / L, 1.2), act = clamp(st.act || 0);
  const L1 = [], R1 = []; for (let i = 0; i <= 24; i++) { const s = i / 24, h = wd / 2 * Math.pow(Math.sin(Math.PI * s), 0.65) + 5, c = [lerp(E[0], AP[0], s), lerp(E[1], AP[1], s)]; L1.push([c[0] + nx * h, c[1] + ny * h]); R1.push([c[0] - nx * h, c[1] - ny * h]); }
  const mcol = mixc(SK.musc, SK.mact, act);
  if (Math.hypot(Fth[0] - E[0], Fth[1] - E[1]) > 4) w += `<path d="M${f1(E[0])} ${f1(E[1])}L${f1(Fth[0])} ${f1(Fth[1])}" stroke="#E8C9A8" stroke-width="9" stroke-linecap="round" stroke-dasharray="3 9"/>`;
  w += `<path d="${poly(L1)}${poly(R1.reverse()).replace('M', 'L')}Z" fill="${mcol}" stroke="${SK.muscD}" stroke-width="6" stroke-linejoin="round"/>`;
  for (let k = -1; k <= 1; k++) w += `<path d="M${f1(lerp(E[0], AP[0], 0.1) + nx * k * wd * 0.22)} ${f1(lerp(E[1], AP[1], 0.1) + ny * k * wd * 0.22)}L${f1(lerp(E[0], AP[0], 0.9) + nx * k * wd * 0.22)} ${f1(lerp(E[1], AP[1], 0.9) + ny * k * wd * 0.22)}" stroke="${SK.muscD}" stroke-width="3" opacity=".55"/>`;
  // saraf: sensorik (biru, dari reseptor dingin ke otak) dan simpatik (emas, dari otak ke otot)
  const nb = nerveBelly(st), SYM = symPath(nb), L_SYM = pathLen(SYM);
  w += `<path d="${SENS}" fill="none" stroke="#1B88C4" stroke-width="16" stroke-linecap="round"/><path d="${SENS}" fill="none" stroke="${SK.cold}" stroke-width="8" stroke-linecap="round"/>`;
  w += `<path d="${SYM}" fill="none" stroke="${SK.goldD}" stroke-width="18" stroke-linecap="round"/><path d="${SYM}" fill="none" stroke="${SK.gold}" stroke-width="10" stroke-linecap="round"/><circle cx="${f1(nb[0])}" cy="${f1(nb[1])}" r="${f1(22 + 6 * act)}" fill="${SK.gold}" stroke="${SK.goldD}" stroke-width="7"/>`;
  // reseptor dingin (ujung saraf bebas) dekat permukaan: bersinar biru saat dingin
  w += `<circle cx="-250" cy="66" r="${f1(30 + 22 * cold * (0.6 + 0.4 * Math.sin(t * 8)))}" fill="${SK.cold}" opacity="${f1(0.35 * cold)}"/><circle cx="-250" cy="66" r="20" fill="${SK.cold}" stroke="${SK.coldD}" stroke-width="7"/>`;
  // denyut sinyal
  const orb = (p, col, colD) => `<circle cx="${f1(p.x)}" cy="${f1(p.y)}" r="38" fill="#fff" opacity=".8"/><circle cx="${f1(p.x)}" cy="${f1(p.y)}" r="22" fill="${col}" stroke="${colD}" stroke-width="6"/>`;
  if (st.sensP > 0 && st.sensP < 1) w += orb(pathPt(SENS, st.sensP), SK.cold, SK.coldD);
  if (st.symP > 0 && st.symP < 1) w += orb(pathPt(SYM, st.symP), SK.gold, SK.goldD);
  // otak / pusat kontrol di bagian dalam tubuh (jauh di bawah kulit; di luar skala)
  const bl = clamp(st.brain || 0);
  w += `<g transform="translate(${BRAIN[0]} ${BRAIN[1]}) scale(1.1)"><circle r="${f1(190 + 24 * bl * Math.sin(t * 6))}" fill="${SK.cold}" opacity="${f1(0.22 * bl * (1 - clamp(st.sym ?? 0)))}"/><circle r="${f1(190 + 24 * clamp(st.sym ?? 0) * Math.sin(t * 6))}" fill="${SK.gold}" opacity="${f1(0.25 * clamp(st.sym ?? 0))}"/><path d="M-150 20C-170 -90 -80 -170 30 -165C140 -160 190 -80 170 10C150 80 80 110 20 100L-20 100C-100 100 -140 80 -150 20Z" fill="${mixc('#F4B8C1', '#FFE6A0', clamp(st.sym ?? 0) * 0.7)}" stroke="#D98B99" stroke-width="6"/><path d="M-90 -90C-40 -130 40 -140 100 -100M-120 -20C-60 -60 20 -70 80 -30M-30 10C20 -20 80 -10 120 30" fill="none" stroke="#E69AA7" stroke-width="7" stroke-linecap="round"/></g>`;
  return w;
}
// partikel udara dingin (halus) di atas permukaan, bergerak dari kanan ke kiri; a = intensitas
export function coldAir(t, a, x0 = -520, x1 = 560) {
  let s = ''; for (let i = 0; i < 26; i++) { const sp = 80 + 60 * rndf(i + 3), x = x1 - ((t * sp + rndf(i) * (x1 - x0)) % (x1 - x0)), y = -50 - rndf(i + 9) * 280 + 14 * Math.sin(t * 2 + i); s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(4 + 5 * rndf(i + 5))}" fill="#fff" stroke="${SK.cold}" stroke-width="2.5" opacity="${f1(a * 0.8)}"/>`; }
  for (let i = 0; i < 5; i++) { const x = x1 - ((t * 140 + i * 230) % (x1 - x0 + 200)), y = -70 - i * 52; s += `<path d="M${f1(x)} ${f1(y)}q-60 -18 -120 0t-120 0" fill="none" stroke="${SK.cold}" stroke-width="7" stroke-linecap="round" opacity="${f1(a * 0.45)}"/>`; }
  return s;
}

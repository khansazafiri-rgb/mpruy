// Pandangan laparoskopi SKEMATIS fossa iliaka kanan: sekum bersakulasi dengan tiga taenia yang bertemu di pangkal apendiks, apendiks meradang,
// mesoapendiks dengan arteri apendikularis, usus halus terminal (ileum), omentum, dua instrumen. Dunia 2000 x 2000. Cahaya dari kiri atas.
import { f1, lerp, mulus, poli, volum, tumpuk, B, mix, terang, gelap, clamp } from '../tensi/util.mjs';
import { sampel, pita, pitaD, di, normalDi } from './geom.mjs';

export const PAL = { peri: '#C86E70', periT: '#E39A98', sekum: '#E9B9A2', taenia: '#F6DFCB', lemak: '#F2C65A', ileum: '#E28F8C', normal: '#E7ADA3', radang: '#B2243A', radangT: '#D94A55', fibrin: '#F1E3B0', arteri: '#B01C2A', logam: '#B9C2CC' };
export const AP = sampel([[1000, 880], [1078, 1022], [1170, 1172], [1248, 1330], [1262, 1500], [1196, 1640]], 12);
export const AP_ANCHOR = { pangkal: [1000, 880], tengah: [1190, 1210], ujung: [1196, 1640], sekum: [690, 690], ileum: [380, 780], meso: [1010, 1300] };

const rngs = (seed) => { let s = seed * 9301 + 49297; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; };

export function lapDunia({ T = 0, infl = 1, alat = { u: 1, buka: 0.5 }, grasp = 0 } = {}) {
  const R = rngs(7);
  let s = '';
  s += '<!--L:latar-->';
  // ---- latar: peritoneum dinding perut + pembuluh halus ----
  s += `<defs><radialGradient id="lpg" cx="48%" cy="42%" r="75%"><stop offset="0" stop-color="#E2908F"/><stop offset=".6" stop-color="#C46B6C"/><stop offset="1" stop-color="#7E3A40"/></radialGradient></defs>`;
  s += `<rect x="-300" y="-300" width="2600" height="2600" fill="url(#lpg)"/>`;
  s += `<g fill="none" stroke-linecap="round" opacity=".42">`;
  for (let i = 0; i < 16; i++) { const x = R() * 2000, y = R() * 2000, a = R() * 6.28, l = 160 + R() * 280; s += `<path d="M${f1(x)} ${f1(y)}q${f1(Math.cos(a) * l * 0.5 + 40)} ${f1(Math.sin(a) * l * 0.5 - 30)} ${f1(Math.cos(a) * l)} ${f1(Math.sin(a) * l)}" stroke="#8E2A33" stroke-width="${f1(3 + R() * 5)}"/>`; }
  s += `</g>`;
  s += '<!--L:omentum-->';
  // ---- omentum / lemak (kuning): gugusan lobulus tidak beraturan ----
  const lobus = (cx, cy, r) => tumpuk(`M${cx - r} ${cy}a${r} ${r * 0.9} 0 1 0 ${2 * r} 0a${r} ${r * 0.9} 0 1 0 ${-2 * r} 0Z`, [cx, cy], [{ fill: '#A97A1E' }, { fill: '#DCA93A', dx: -r * 0.1, dy: -r * 0.12, s: 0.92, b: 5 }, { fill: '#F4D170', dx: -r * 0.3, dy: -r * 0.34, s: 0.55, b: 9, o: 0.9 }]);
  const gugus = (cx, cy, r, n, seed) => { const g = rngs(seed); let o = `<g>`; for (let i = 0; i < n; i++) { const a = g() * 6.28, d = g() * r * 0.9; o += lobus(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.8, r * (0.32 + g() * 0.26)); } return o + '</g>'; };
  [[1700, 300, 230, 9, 1], [1760, 760, 170, 6, 2], [150, 1740, 210, 8, 3], [1780, 1560, 220, 8, 4], [1560, 1860, 170, 6, 5]].forEach(([x, y, r, n, sd]) => { s += gugus(x, y, r, n, sd); });
  s += '<!--L:ileum-->';
  // ---- ileum terminal: tabung merah muda ke sekum ----
  const IL = sampel([[2200, 560], [1800, 640], [1420, 700], [1120, 680]], 10);
  const ilD = pitaD(IL, (t) => 62 + 16 * t, 'akhir');
  s += `<path d="${ilD}" transform="translate(8 14)" fill="#3A0A14" opacity=".35" filter="${B(9)}"/>` + volum(ilD, [1650, 640], PAL.ileum);
  s += '<!--L:kolon-sekum-->';
  // ---- kolon asendens + sekum: kantong bersakulasi ----
  const COL = sampel([[610, 600], [600, 200], [590, -300]], 10);
  const colD = pitaD(COL, () => 250, false);
  s += `<path d="${colD}" transform="translate(12 18)" fill="#3A0A14" opacity=".35" filter="${B(14)}"/>` + volum(colD, [560, 100], PAL.sekum);
  const ptsC = []; for (let k = 0; k < 28; k++) { const th = k / 28 * Math.PI * 2, sc = 1 + 0.045 * Math.cos(th * 6 + 0.5); ptsC.push([700 + Math.cos(th) * 430 * sc, 740 + Math.sin(th) * (Math.sin(th) > 0 ? 330 : 300) * sc]); }
  const cec = mulus(ptsC, true);
  s += `<path d="${cec}" transform="translate(12 20)" fill="#3A0A14" opacity=".4" filter="${B(14)}"/>`;
  s += volum(cec, [640, 640], PAL.sekum);
  s += `<clipPath id="cecC"><path d="${cec}"/><path d="${colD}"/></clipPath><g clip-path="url(#cecC)" fill="none" stroke-linecap="round">`;
  for (const y of [-120, 60, 240, 420]) s += `<path d="M300 ${y}C500 ${y + 60} 700 ${y + 60} 920 ${y}" stroke="#B87864" stroke-width="14" opacity=".55" filter="${B(2.5)}"/><path d="M300 ${y - 10}C500 ${y + 50} 700 ${y + 50} 920 ${y - 10}" stroke="#F8E2D0" stroke-width="6" opacity=".45"/>`;
  for (const y of [560, 700, 840]) s += `<path d="M290 ${y}C500 ${y + 50} 800 ${y + 40} 1140 ${y - 30}" stroke="#B87864" stroke-width="12" opacity=".5" filter="${B(2.5)}"/><path d="M290 ${y - 10}C500 ${y + 40} 800 ${y + 30} 1140 ${y - 40}" stroke="#F8E2D0" stroke-width="6" opacity=".4"/>`;
  // tiga taenia koli menyusuri kolon dan sekum, bertemu di pangkal apendiks
  for (const off of [-150, 0, 150]) { const tn = sampel([[600 + off, -320], [620 + off * 0.8, 300], [840 + off * 0.15, 700], [1000, 880]], 10); s += `<path d="${poli(tn)}" stroke="#9C6858" stroke-width="34" opacity=".35" filter="${B(3)}"/><path d="${poli(tn)}" stroke="${PAL.taenia}" stroke-width="24"/><path d="${poli(tn)}" transform="translate(-4 -6)" stroke="#fff" stroke-width="7" opacity=".5" filter="${B(2.5)}"/>`; }
  for (let i = 0; i < 14; i++) { const x = 360 + R() * 700, y = -200 + R() * 1200, a = R() * 6.28, l = 70 + R() * 110; s += `<path d="M${f1(x)} ${f1(y)}q${f1(Math.cos(a) * l * 0.5 + 20)} ${f1(Math.sin(a) * l * 0.5 - 14)} ${f1(Math.cos(a) * l)} ${f1(Math.sin(a) * l)}" stroke="#C05A5A" stroke-width="${f1(3 + R() * 3)}" opacity=".45"/>`; }
  s += `</g>`;
  s += '<!--L:mesoapendiks-->';
  // ---- mesoapendiks (selaput) dengan lemak dan arteri apendikularis ----
  const ML = [], MO = [], nM = AP.length;
  for (let i = 4; i < nM - 3; i++) { const t = i / (nM - 1), nm = normalDi(AP, i), tp = (i - 4) / (nM - 8); const w = 30 + 330 * Math.sin(Math.PI * Math.pow(tp, 0.65)) * (1 - 0.45 * tp); ML.push([AP[i][0] + nm[0] * 30, AP[i][1] + nm[1] * 30]); MO.push([AP[i][0] + nm[0] * (30 + w), AP[i][1] + nm[1] * (30 + w)]); }
  const meso = mulus([...ML, ...MO.slice().reverse()], true, 0.5);
  s += `<path d="${meso}" transform="translate(10 14)" fill="#3A0A14" opacity=".3" filter="${B(12)}"/>`;
  s += `<path d="${meso}" fill="#EDB59C" opacity=".92"/><path d="${meso}" transform="translate(-10 -12)" fill="#F8D8C2" opacity=".55" filter="${B(8)}"/>`;
  s += `<clipPath id="msC"><path d="${meso}"/></clipPath><g clip-path="url(#msC)">`;
  for (let i = 0; i < 16; i++) { const t = 0.08 + i * 0.055, d = di(AP, t), k = i % 3, r = 22 + k * 9, off = 70 + (150 + 80 * k) * Math.pow(1 - t, 0.9); s += `<ellipse cx="${f1(d.p[0] + d.n[0] * off)}" cy="${f1(d.p[1] + d.n[1] * off)}" rx="${r * 1.6}" ry="${r}" fill="#F2C65A" opacity=".7" filter="${B(2.5)}" transform="rotate(${f1(i * 31)} ${f1(d.p[0] + d.n[0] * off)} ${f1(d.p[1] + d.n[1] * off)})"/>`; }
  s += `</g>`;
  // arteri apendikularis: berkelok di dekat tepi bebas, bercabang makin halus ke dinding
  const art = []; for (let i = 4; i < nM - 3; i += 2) { const t = i / (nM - 1), nm = normalDi(AP, i), off = 70 + 180 * Math.pow(1 - t, 0.9); art.push([AP[i][0] + nm[0] * off + Math.sin(i * 1.3) * 12, AP[i][1] + nm[1] * off + Math.cos(i * 1.3) * 12]); }
  const aD = mulus(art);
  s += `<path d="${aD}" fill="none" stroke="#4A0A12" stroke-width="15" stroke-linecap="round" opacity=".55"/><path d="${aD}" fill="none" stroke="${PAL.arteri}" stroke-width="11" stroke-linecap="round"/><path d="${aD}" transform="translate(-2 -3)" fill="none" stroke="#FF8A7A" stroke-width="3.5" stroke-linecap="round" opacity=".7"/>`;
  [8, 15, 22, 29].forEach((i, j) => { if (i >= nM - 4) return; const t = i / (nM - 1), nm = normalDi(AP, i), off = 70 + 180 * Math.pow(1 - t, 0.9), a = [AP[i][0] + nm[0] * off, AP[i][1] + nm[1] * off], b = [AP[i][0] + nm[0] * 30, AP[i][1] + nm[1] * 30], w = 8 - j * 0.6; s += `<path d="M${f1(a[0])} ${f1(a[1])}C${f1(a[0] + (b[0] - a[0]) * 0.3 + 26)} ${f1(a[1] + (b[1] - a[1]) * 0.3 - 20)} ${f1(a[0] + (b[0] - a[0]) * 0.7 - 20)} ${f1(a[1] + (b[1] - a[1]) * 0.7 + 22)} ${f1(b[0])} ${f1(b[1])}" fill="none" stroke="${PAL.arteri}" stroke-width="${f1(w)}" stroke-linecap="round" opacity=".9"/>`; });
  s += '<!--L:apendiks-->';
  // ---- apendiks meradang ----
  const wf = (t) => 38 + 20 * infl * Math.sin(Math.min(1, t * 1.15) * Math.PI * 0.92) + 14 * infl * t * t + 34 * Math.pow(Math.max(0, 1 - t / 0.1), 2);
  const apD = pitaD(AP, wf, 'akhir');
  const base = mix(PAL.normal, PAL.radang, infl);
  s += `<path d="${apD}" transform="translate(12 18)" fill="#2A0610" opacity=".45" filter="${B(10)}"/>`;
  s += volum(apD, [1190, 1260], base);
  s += `<clipPath id="apC"><path d="${apD}"/></clipPath><g clip-path="url(#apC)">`;
  // bercak hiperemis dan fibrin
  const fib = [[0.5, 0.25, 40], [0.62, -0.3, 34], [0.8, 0.1, 44], [0.9, -0.2, 30], [0.35, -0.15, 26]];
  for (const [t, o, r] of fib) { const d = di(AP, t); s += `<ellipse cx="${f1(d.p[0] + d.n[0] * o * 40)}" cy="${f1(d.p[1] + d.n[1] * o * 40)}" rx="${r}" ry="${r * 0.55}" fill="${PAL.fibrin}" opacity="${f1(0.55 * infl)}" filter="${B(5)}"/>`; }
  for (const [t, o, r] of [[0.3, 0.2, 40], [0.7, 0.15, 50], [0.95, -0.2, 38]]) { const d = di(AP, t); s += `<ellipse cx="${f1(d.p[0] + d.n[0] * o * 30)}" cy="${f1(d.p[1] + d.n[1] * o * 30)}" rx="${r}" ry="${r * 0.7}" fill="#5C0C20" opacity="${f1(0.4 * infl)}" filter="${B(8)}"/>`; }
  // pembuluh permukaan membesar (bendungan)
  for (let k = 0; k < 7; k++) { const t0 = 0.08 + k * 0.12; const pts = []; for (let j = 0; j < 5; j++) { const d = di(AP, t0 + j * 0.035); pts.push([d.p[0] + d.n[0] * (Math.sin(k * 2 + j) * 24), d.p[1] + d.n[1] * (Math.sin(k * 2 + j) * 24)]); } s += `<path d="${mulus(pts)}" fill="none" stroke="#4C0814" stroke-width="${f1(5 + 3 * infl)}" stroke-linecap="round" opacity=".55"/><path d="${mulus(pts)}" fill="none" stroke="#F0505A" stroke-width="${f1(3 + 2 * infl)}" stroke-linecap="round" opacity=".9"/>`; }
  // kilau basah (kiri atas)
  for (const [t, o, l] of [[0.18, 0.5, 70], [0.38, 0.55, 90], [0.6, 0.5, 100], [0.82, 0.45, 70]]) { const d = di(AP, t); s += `<ellipse cx="${f1(d.p[0] + d.n[0] * wf(t) * o - 10)}" cy="${f1(d.p[1] + d.n[1] * wf(t) * o - 14)}" rx="10" ry="${l * 0.5}" fill="#fff" opacity=".62" filter="${B(2.5)}" transform="rotate(${f1(Math.atan2(d.n[0], -d.n[1]) * 57.3)} ${f1(d.p[0])} ${f1(d.p[1])})"/>`; }
  s += `</g>`;
  s += '<!--L:pangkal-sekum-->';
  // kerah sekum di pangkal apendiks (apendiks keluar dari dinding sekum)
  s += `<g transform="rotate(-38 1000 880)">${volum('M920 880a82 58 0 1 0 164 0a82 58 0 1 0 -164 0Z', [1000, 870], PAL.sekum, { tipis: true })}</g>`;
  for (const off of [-150, 0, 150]) { const tn = sampel([[840 + off * 0.15, 700], [930, 790], [1000, 880]], 8); s += `<path d="${poli(tn)}" fill="none" stroke="${PAL.taenia}" stroke-width="22" stroke-linecap="round"/>`; }
  // kilau pada sekum
  s += `<ellipse cx="560" cy="520" rx="120" ry="26" fill="#fff" opacity=".35" filter="${B(9)}" transform="rotate(-18 560 520)"/><ellipse cx="800" cy="440" rx="80" ry="16" fill="#fff" opacity=".3" filter="${B(6)}" transform="rotate(-8 800 440)"/>`;
  s += '<!--L:instrumen-->';
  // ---- instrumen: forsep (grasper) masuk dari kiri bawah, lalu alat kedua dari kanan ----
  const ins = (x0, y0, x1, y1, buka, sk = 1) => {
    const JS = 1.5;
    const ang = Math.atan2(y1 - y0, x1 - x0) * 57.3, L = Math.hypot(x1 - x0, y1 - y0);
    return `<g transform="translate(${f1(x1)} ${f1(y1)}) rotate(${f1(ang)})"><path d="M${f1(-L - 600)} -40L-60 -26V26L${f1(-L - 600)} 40Z" transform="translate(6 12)" fill="#2A0610" opacity=".35" filter="${B(6)}"/>`
      + `<path d="M${f1(-L - 600)} -40L-60 -26V26L${f1(-L - 600)} 40Z" fill="#8A94A0"/><path d="M${f1(-L - 600)} -22L-60 -14L-60 -5L${f1(-L - 600)} -16Z" fill="#E6EDF3"/><path d="M${f1(-L - 600)} 22L-60 14V10L${f1(-L - 600)} 18Z" fill="#5C6670"/>`
      + `<path d="M-110 -30H-40L-30 -18H-110Z" fill="#6B7580"/>`
      + `<g transform="translate(-40 0)"><g transform="rotate(${f1(-10 - 22 * buka)})"><path d="M0 -18L190 -12L204 12L2 0Z" fill="#CDD5DD"/><path d="M0 -18L190 -12L196 -3L0 -6Z" fill="#fff" opacity=".7"/><path d="M20 -5H140" stroke="#6B7580" stroke-width="3" stroke-dasharray="6 7"/></g><g transform="rotate(${f1(10 + 22 * buka)})"><path d="M0 18L190 12L204 -12L2 0Z" fill="#A8B2BC"/><path d="M20 5H140" stroke="#5C6670" stroke-width="3" stroke-dasharray="6 7"/></g></g></g>`;
  };
  const u = alat.u, e = (x) => x * x * (3 - 2 * x);
  const gx = lerp(-300, 1156, e(u)), gy = lerp(1960, 1380, e(u));
  s += ins(-300, 1960, gx, gy, alat.buka);
  return { svg: s, anchor: AP_ANCHOR };
}

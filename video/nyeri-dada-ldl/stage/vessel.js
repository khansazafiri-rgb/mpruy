// Dunia pembuluh (arteri koroner dipotong memanjang, sumbu vertikal, aliran ke bawah). Dinding berlapis: endotel, intima, media, adventitia.
// Semua dikendalikan parameter waktu: g (plak), rup (tudung pecah), c (bekuan), serta agen mikroskopik (LDL, monosit -> makrofag -> sel busa).
// Koordinat dunia: pusat lumen x = 0; dinding kanan memuat plak. Ukuran partikel TIDAK sesuai skala (LDL dan sel digambar besar agar terbaca).
import { f1, clamp, lerp, sm, eo, eio, seg, win, pchip, rnd, MC } from './core.js';
import { COL } from './art.js';

export const H0 = 230, IB = 62, MB = 150, AB = 130, HM = 270, WP = 210;
export const gauss = (y) => Math.exp(-(y * y) / (2 * WP * WP));
export const XR = (y, g, extra = 0) => H0 - (g * HM + extra) * gauss(y);          // permukaan lumen sisi kanan
// ---- jadwal keadaan makro (detik video)
export const G = pchip([[0, 1], [17.0, 1], [19.8, 0], [31.0, 0], [32.3, 0.13], [33.2, 0.16], [36.3, 0.6], [39.6, 0.88], [60, 0.88]]);
export const RUP = (t) => (t < 17.8 ? 1 : t < 18.8 ? 1 - seg(t, 17.8, 18.8) : t < 40.2 ? 0 : seg(t, 40.2, 41.2));
export const CLOT = (t) => (t < 17.0 ? 1 : t < 18.3 ? 1 - seg(t, 17.0, 18.3) : t < 41.0 ? 0 : seg(t, 41.0, 43.8));
const CY = -50, CH = 240;   // pusat dan setengah panjang bekuan (y)

// ------------------------------------------------------------------ partikel
const E = (x, y, rx, ry, f, e = '') => `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(rx)}" ry="${f1(ry)}" fill="${f}" ${e}/>`;
const C = (x, y, r, f, e = '') => `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="${f}" ${e}/>`;
export function rbc(x, y, r = 28, rot = 0, a = 1) { return `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)})" opacity="${f1(a)}"><ellipse rx="${r}" ry="${f1(r * 0.7)}" fill="url(#gRbc)"/><ellipse rx="${f1(r * 0.5)}" ry="${f1(r * 0.3)}" fill="#7F1022" opacity=".55"/></g>`; }
/** LDL: cangkang fosfolipid (butir terang), inti ester kolesterol, apoB (lengkung ungu). det = 1 untuk detail; ox 0..1 = teroksidasi */
export function ldl(x, y, r = 14, o = {}) {
  const a = o.a ?? 1, ox = o.ox ?? 0, det = o.det ?? 0;
  let s = `<g transform="translate(${f1(x)} ${f1(y)})" opacity="${f1(a)}">${C(0, 0, r, 'url(#gLdl)')}`;
  if (ox > 0.01) s += `<g opacity="${f1(ox)}">${C(0, 0, r, 'url(#gLdlOx)')}${[0, 1, 2, 3, 4, 5].map((i) => { const an = i * 1.05 + 0.3; return `<path d="M${f1(Math.cos(an) * r)} ${f1(Math.sin(an) * r)}L${f1(Math.cos(an) * (r + 5))} ${f1(Math.sin(an) * (r + 5))}" stroke="#7A3A0A" stroke-width="2.4" stroke-linecap="round"/>`; }).join('')}</g>`;
  if (det > 0) {
    s += C(0, 0, r * 0.58, '#C98E1C', 'opacity=".85"');
    for (let i = 0; i < 14; i += 1) { const an = (i / 14) * Math.PI * 2; s += C(Math.cos(an) * r * 0.86, Math.sin(an) * r * 0.86, r * 0.09, '#FFF6CC'); }
    s += `<path d="M${f1(-r * 0.7)} ${f1(-r * 0.2)}C${f1(-r * 0.3)} ${f1(-r * 0.95)} ${f1(r * 0.4)} ${f1(-r * 0.7)} ${f1(r * 0.8)} ${f1(-r * 0.1)}C${f1(r * 0.5)} ${f1(r * 0.5)} ${f1(-r * 0.2)} ${f1(r * 0.9)} ${f1(-r * 0.6)} ${f1(r * 0.55)}" fill="none" stroke="#7D5BD0" stroke-width="${f1(Math.max(2, r * 0.14))}" stroke-linecap="round" opacity=".9"/>`;
    for (let i = 0; i < 5; i += 1) s += C((i % 3 - 1) * r * 0.22, (i % 2 ? 0.18 : -0.18) * r + (i > 2 ? r * 0.12 : 0), r * 0.1, '#FFE7A3', 'opacity=".9"');
  }
  return s + '</g>';
}
export function platelet(x, y, r = 8, rot = 0, a = 1) { return `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)})" opacity="${f1(a)}">${E(0, 0, r, r * 0.55, 'url(#gPlt)')}</g>`; }
/** monosit (m = 0) -> makrofag (m = 1, lebih besar dengan pseudopod) -> sel busa (f = 1, vakuola kuning) */
export function immune(x, y, r = 24, o = {}) {
  const m = o.m ?? 0, f = o.f ?? 0, a = o.a ?? 1, rot = o.rot ?? 0, R = r * (1 + 0.35 * m), ph = o.ph ?? 0;
  let s = `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)})" opacity="${f1(a)}">`;
  const lobes = Math.round(5 * m);
  for (let i = 0; i < lobes; i += 1) { const an = (i / 5) * Math.PI * 2 + ph + 0.4; s += C(Math.cos(an) * R * 0.9, Math.sin(an) * R * 0.9, R * 0.34, f > 0.5 ? 'url(#gFoam)' : 'url(#gImm)'); }
  s += C(0, 0, R, f > 0.5 ? 'url(#gFoam)' : 'url(#gImm)');
  if (f > 0.02) s += `<g opacity="${f1(f)}">${C(0, 0, R, 'url(#gFoam)')}${Array.from({ length: 9 }, (_, i) => { const an = i * 2.4 + 0.5, rr = R * (0.25 + 0.5 * ((i * 37) % 10) / 10); return C(Math.cos(an) * rr, Math.sin(an) * rr * 0.9, R * 0.17, '#FFF8C8', 'stroke="#D9A91E" stroke-width="2.2"'); }).join('')}</g>`;
  s += `<g opacity="${f1(1 - f)}"><path d="M${f1(-R * 0.45)} ${f1(-R * 0.15)}C${f1(-R * 0.4)} ${f1(-R * 0.6)} ${f1(R * 0.35)} ${f1(-R * 0.6)} ${f1(R * 0.45)} ${f1(-R * 0.05)}C${f1(R * 0.35)} ${f1(R * 0.2)} ${f1(R * 0.1)} ${f1(R * 0.15)} ${f1(R * 0.0)} ${f1(R * 0.38)}C${f1(-R * 0.3)} ${f1(R * 0.5)} ${f1(-R * 0.55)} ${f1(R * 0.25)} ${f1(-R * 0.45)} ${f1(-R * 0.15)}Z" fill="#4B3AA8" opacity=".85"/></g>`;
  return s + '</g>';
}

// ------------------------------------------------------------------ geometri dinding
const ys = (y0, y1, st = 24) => { const a = []; for (let y = y0; y <= y1 + 0.1; y += st) a.push(y); return a; };
const pathX = (Y, fx) => Y.map((y, i) => `${i ? 'L' : 'M'}${f1(fx(y))} ${f1(y)}`).join('');
const band = (Y, fa, fb) => pathX(Y, fa) + Y.slice().reverse().map((y) => `L${f1(fb(y))} ${f1(y)}`).join('') + 'Z';

/** keadaan makro pada waktu t */
export const stateAt = (t) => ({ g: G(t), rup: RUP(t), c: CLOT(t), gap: 0 });

/** dinding + lumen. yr = [ymin, ymax] terlihat; o: { g, rup, c, t, gm (bonjol mikro), gap (0..1 celah endotel), infl (0..1 peradangan) } */
export function wall(t, yr, o) {
  const [y0, y1] = yr, Y = ys(Math.floor(y0 / 24) * 24 - 24, y1 + 24), { g, rup } = o;
  const xs = (y) => XR(y, g), xl = () => -H0;
  const IBx = H0 + IB, MBx = H0 + IB + MB, ABx = H0 + IB + MB + AB;
  let s = '';
  // lumen (darah) di belakang segalanya
  s += `<rect x="${-H0 - 4}" y="${f1(y0 - 40)}" width="${H0 * 2 + 8}" height="${f1(y1 - y0 + 80)}" fill="url(#gLumen)"/>`;
  // adventitia, media, intima (kanan dan kiri)
  s += `<path d="${band(Y, () => MBx, () => ABx)}" fill="url(#gAdv)"/><path d="${band(Y, () => -ABx, () => -MBx)}" fill="url(#gAdv)"/>`;
  s += `<rect x="${ABx - 1}" y="${f1(y0 - 60)}" width="900" height="${f1(y1 - y0 + 120)}" fill="url(#gAdvFadeR)"/><rect x="${-ABx - 899}" y="${f1(y0 - 60)}" width="900" height="${f1(y1 - y0 + 120)}" fill="url(#gAdvFadeL)"/>`;
  s += `<path d="${band(Y, () => IBx, () => MBx)}" fill="url(#gMedia)"/><path d="${band(Y, () => -MBx, () => -IBx)}" fill="url(#gMedia)"/>`;
  s += `<path d="${band(Y, xs, () => IBx)}" fill="url(#gIntima)"/><path d="${band(Y, () => -IBx, () => -H0)}" fill="url(#gIntima)"/>`;
  // tekstur: serat kolagen (adventitia), lamina elastik, sel otot polos (media), serat matriks (intima)
  const r = rnd(7);
  for (let y = Math.floor(y0 / 60) * 60 - 60; y <= y1 + 60; y += 60) {
    const j = ((y * 7919) % 41) - 20;
    for (const sg of [1, -1]) {
      s += `<path d="M${sg * (MBx + 18)} ${y + j}q${sg * 30} 26 ${sg * 6} 70" fill="none" stroke="${COL.advDk}" stroke-width="3" opacity=".55" stroke-linecap="round"/><path d="M${sg * (MBx + 66)} ${y - j}q${sg * -24} 30 ${sg * 4} 74" fill="none" stroke="${COL.advDk}" stroke-width="3" opacity=".45" stroke-linecap="round"/>`;
      s += E(sg * (IBx + 40), y + j * 0.4, 7, 26, COL.mediaDk, 'opacity=".42"') + E(sg * (IBx + 98), y + 30 - j * 0.4, 7, 28, COL.mediaDk, 'opacity=".42"') + E(sg * (IBx + 66), y + 8, 7, 24, '#7A2F3A', 'opacity=".28"');
      s += `<path d="M${sg * (IBx + 3)} ${y0 - 60}V${y1 + 60}" stroke="#7A2F3A" stroke-width="3.4" opacity=".55"/><path d="M${sg * (MBx - 3)} ${y0 - 60}V${y1 + 60}" stroke="#7A2F3A" stroke-width="3.4" opacity=".55"/>`;
    }
  }
  for (let y = Math.floor(y0 / 50) * 50 - 50; y <= y1 + 50; y += 50) {
    const j = ((y * 4421) % 31) - 15;
    s += `<path d="M${f1(xs(y + j) + 26)} ${y + j}q8 20 0 40" fill="none" stroke="${COL.intimaDk}" stroke-width="3" opacity=".6" stroke-linecap="round"/>`;
    s += `<path d="M${-IBx + 20} ${y + j}q-8 20 0 40" fill="none" stroke="${COL.intimaDk}" stroke-width="3" opacity=".6" stroke-linecap="round"/>`;
  }
  return s;
}

/** plak: inti lemak (sel busa), tudung fibrosa. Digambar di atas dinding, di bawah endotel */
const bumpOf = (y, g) => g * HM * gauss(y);
const coreW = (y, g) => 0.8 * bumpOf(y, g) + 36 * Math.pow(gauss(y), 3) * clamp(g * 6);
export function plaque(t, yr, o) {
  const { g, rup } = o; if (g < 0.04) return '';
  const capT = lerp(14, 30, clamp(g * 1.4));
  const topC = (y) => XR(y, g) + capT;
  const Y = ys(-480, 480, 12).filter((y) => coreW(y, g) > 6);
  if (Y.length < 3) return '';
  let s = '';
  const core = Y.map((y, i) => `${i ? 'L' : 'M'}${f1(topC(y))} ${f1(y)}`).join('') + Y.slice().reverse().map((y) => `L${f1(topC(y) + coreW(y, g))} ${f1(y)}`).join('') + 'Z';
  s += `<path d="${core}" fill="url(#gCore)"/>`;
  s += `<clipPath id="clipCore"><path d="${core}"/></clipPath><g clip-path="url(#clipCore)">`;
  for (let i = 0; i < 22; i += 1) { const y = -400 + i * 38 + ((i * 53) % 17), x = topC(y) + 26 + ((i * 29) % 80); s += `<path d="M${f1(x)} ${y}l${(i % 2 ? 1 : -1) * 22} 12" stroke="${COL.coreDk}" stroke-width="3" opacity=".5" stroke-linecap="round"/>`; }
  const nF = Math.round(16 * clamp(g * 1.2));
  for (let i = 0; i < nF; i += 1) { const y = -230 + ((i * 97) % 460), w = coreW(y, g); if (w > 62) s += immune(topC(y) + 34 + ((i * 41) % Math.max(10, w - 70)), y, 21, { m: 1, f: 1, ph: i }); }
  s += '</g>';
  // tudung fibrosa
  const arc = (a0, a1) => Y.filter((y) => y >= a0 && y <= a1).map((y, i) => `${i ? 'L' : 'M'}${f1(XR(y, g) + capT * 0.45)} ${f1(y)}`).join('');
  const rW = 120;
  if (rup > 0.01) s += `<path d="${arc(Y[0], -90 - 6)}" fill="none" stroke="url(#gCap)" stroke-width="${f1(capT * 0.9)}" stroke-linecap="round"/><path d="${arc(-90 + rW * rup + 6, Y[Y.length - 1])}" fill="none" stroke="url(#gCap)" stroke-width="${f1(capT * 0.9)}" stroke-linecap="round"/>`;
  else s += `<path d="${arc(Y[0], Y[Y.length - 1])}" fill="none" stroke="url(#gCap)" stroke-width="${f1(capT * 0.9)}" stroke-linecap="round"/>`;
  return s;
}

/** endotel sepanjang permukaan: kapsul pipih dengan inti. gap: lebar celah di y = gy (sambungan longgar); rupture menghilangkan sel di atas tudung pecah */
export function endothelium(t, yr, o) {
  const { g, rup, gap = 0, gy = 0, gm = 0 } = o, [y0, y1] = yr;
  let s = '';
  const surf = (y) => XR(y, g);
  const step = 46;
  for (let y = Math.floor(y0 / step) * step - step; y <= y1 + step; y += step) {
    const yc = y + step / 2, near = Math.abs(yc - gy);
    if (gap > 0.02 && near < 20 + 14 * gap) continue;
    if (rup > 0.01 && yc > -92 && yc < -92 + 128 * rup) continue;
    const x = surf(yc), dx = (surf(yc + 8) - surf(yc - 8)) / 16, ang = Math.atan2(1, dx) * 180 / Math.PI - 90 + 90;
    s += `<g transform="translate(${f1(x + 3)} ${f1(yc)}) rotate(${f1(Math.atan(dx) * 180 / Math.PI)})"><rect x="-8" y="${-step / 2 + 2}" width="16" height="${step - 4}" rx="8" fill="${COL.endo}" stroke="${COL.endoDk}" stroke-width="2"/>${E(0, 0, 4.5, 8, COL.endoDk, 'opacity=".75"')}</g>`;
  }
  const hl = ys(Math.floor(y0 / 24) * 24 - 24, y1 + 24).map((y, i) => `${i ? 'L' : 'M'}${f1(surf(y))} ${f1(y)}`).join('');
  s = `<path d="${hl}" fill="none" stroke="${COL.endoDk}" stroke-width="2" opacity=".5"/>` + s;
  // sisi kiri (normal)
  for (let y = Math.floor(y0 / step) * step - step; y <= y1 + step; y += step) { const yc = y + step / 2; s += `<g transform="translate(${-H0 - 3} ${f1(yc)})"><rect x="-8" y="${-step / 2 + 2}" width="16" height="${step - 4}" rx="8" fill="${COL.endo}" stroke="${COL.endoDk}" stroke-width="2"/>${E(0, 0, 4.5, 8, COL.endoDk, 'opacity=".75"')}</g>`; }
  return s;
}

// ------------------------------------------------------------------ aliran darah (sel darah merah + LDL dalam plasma) dan bekuan
export const FL = 3400, SPR = 92, SPL = 330;
export const flowPhase = (t) => t * 150;
const inYr = (y, yr, m = 60) => y > yr[0] - m && y < yr[1] + m;
export function blood(t, yr, o) {
  const { g, c } = o; let s = '';
  const n = Math.floor(FL / SPR), P = flowPhase(t), frontY = CY - CH, A0 = frontY - 230;
  for (let i = 0; i < n; i += 1) {
    let y = ((i * SPR + P + ((i * 13) % 7) * 11) % FL) - FL / 2;
    let al = 1;
    if (c > 0.02) {
      if (y > A0 && y < CY + CH) { if (y > frontY) { al = 1 - clamp((c - 0.2) / 0.5); } y = A0 + (y - A0) * (1 - 0.78 * c); }
      else if (y >= CY + CH && c > 0.3 && i % 4) al = 1 - 0.85 * c;
    }
    if (al <= 0.02 || !inYr(y, yr)) continue;
    const xr = XR(y, g), w = xr + H0 - 70; if (w < 40) continue;
    const f = ((i * 0.618) % 1), x = -H0 + 36 + f * w;
    s += rbc(x, y, 27, (i * 41) % 180, al);
  }
  return s;
}
export function ldlFlow(t, yr, o, det = 0) {
  const { g, c } = o; let s = '';
  const n = Math.floor(FL / SPL), P = flowPhase(t) * 0.95, frontY = CY - CH;
  for (let j = 0; j < n; j += 1) {
    let y = ((j * SPL + P + 140) % FL) - FL / 2; let al = 1;
    if (c > 0.3 && y > frontY - 230) { if (y > frontY) al = 1 - clamp(c * 1.5); }
    if (al <= 0.02 || !inYr(y, yr)) continue;
    const xr = XR(y, g), w = xr + H0 - 90; if (w < 40) continue;
    const x = -H0 + 45 + (((j * 0.37 + 0.11) % 1)) * w;
    s += ldl(x, y, 17, { det, a: al, ox: o.oxAll ?? 0 });
  }
  return s;
}
/** bekuan: sumbat dari permukaan kanan ke seberang; jaring fibrin, sel darah terjerat, trombosit. c 0..1 */
export function clot(t, yr, o) {
  const { g, c, rup } = o; if (c < 0.01) return '';
  const pts = [], Y = ys(CY - CH, CY + CH, 10);
  const xl = (y) => { const u = 1 - Math.pow(Math.abs((y - CY) / CH), 2.6); return lerp(XR(y, g), -H0 + 8, clamp(c * Math.sqrt(Math.max(0, u)) * 1.06)); };
  const d = Y.map((y, i) => `${i ? 'L' : 'M'}${f1(XR(y, g))} ${f1(y)}`).join('') + Y.slice().reverse().map((y) => `L${f1(xl(y))} ${f1(y)}`).join('') + 'Z';
  let s = `<clipPath id="clipClot"><path d="${d}"/></clipPath><path d="${d}" fill="#3B0A1E"/><g clip-path="url(#clipClot)">`;
  for (let i = 0; i < 26; i += 1) { const y = CY - CH + i * 15 + ((i * 7) % 9), a = -230 + ((i * 53) % 250); s += `<path d="M${a} ${y}Q${a + 70} ${y + 26} ${a + 150} ${y - 14}" fill="none" stroke="${COL.fibrin}" stroke-width="3.4" opacity=".8"/>`; }
  for (let i = 0; i < 18; i += 1) { const y = CY - CH + 20 + ((i * 59) % (CH * 2 - 30)), x = -200 + ((i * 83) % 330); s += rbc(x, y, 22, i * 47, 0.95); }
  for (let i = 0; i < 20; i += 1) { const y = CY - CH + ((i * 41) % (CH * 2)), x = -210 + ((i * 67) % 400); s += platelet(x, y, 8.5, i * 33, 0.95); }
  s += `</g><path d="${d}" fill="none" stroke="#F5C6CF" stroke-width="4" opacity=".7" stroke-linejoin="round"/>`;
  return s;
}
// trombosit menempel di tudung pecah (sebelum bekuan besar): y ~ -90 .. +30
export function plateletsAtRupture(t, o) {
  const { rup, c, g } = o; if (rup < 0.3 || c > 0.95) return '';
  let s = '';
  for (let i = 0; i < 10; i += 1) { const y = -86 + i * 12 + ((i * 7) % 9), x = XR(y, g) - 14 - (i % 3) * 9 - 10 * Math.sin(t * 3 + i); s += platelet(x, y, 8.5, i * 40, clamp((rup - 0.3) * 2)); }
  return s;
}
// isi inti lemak yang terbuka ke lumen saat tudung pecah: butir lemak melayang
export function spill(t, o) {
  const { rup, g, c } = o; if (rup < 0.4 || c > 0.9) return '';
  let s = '';
  for (let i = 0; i < 7; i += 1) { const ph = (t * 0.7 + i * 0.31) % 1, y = -70 + ph * 150 + i * 4, x = XR(-60, g) - 20 - ph * 60 + (i % 3) * 10; s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(9 + (i % 3) * 3)}" fill="${COL.foam}" opacity="${f1(0.9 * (1 - ph) * clamp(rup * 1.5 - 0.4))}"/>`; }
  return s;
}

// ------------------------------------------------------------------ patogenesis mikroskopik (23,8 - 33 dtk): LDL masuk dan tertahan di intima, monosit -> makrofag -> sel busa
const NL = 9, GY = 0;                       // jumlah LDL yang tertahan; y celah endotel
const retTe = (k) => 24.55 + 0.3 * k;
const retFin = (k) => [H0 + 26 + (k % 3) * 20, -80 + Math.floor(k / 3) * 70 + (k % 3) * 14 + (k % 2) * 6];
const MONO_T0 = (m) => 27.7 + 0.35 * m;
const macPos = (m) => [H0 + 40 + (m % 2) * 18, -78 + m * 78];
export const gapOpen = (t) => seg(t, 24.0, 24.8) * (1 - seg(t, 33.0, 34.0));
export const oxAt = (t) => seg(t, 27.4, 29.2);
export const inflAt = (t) => seg(t, 29.8, 30.8) * (1 - seg(t, 34.5, 36));
export const retained = (t) => {
  const out = [];
  for (let k = 0; k < NL; k += 1) {
    const te = retTe(k); if (t < te - 1.3) continue;
    const ya = -430 - k * 36, xa = -20 + (k % 3) * 40;
    const a = seg(t, te, te + 0.95, eio), b = seg(t, te + 0.95, te + 1.4, eio), c2 = seg(t, te + 1.4, te + 2.0, eo);
    const jit = ((k * 31) % 17) - 8, [fx, fy] = retFin(k);
    let x = lerp(lerp(xa, H0 - 30, a), H0 + 14, b), y = lerp(lerp(ya, GY + jit, a), GY + jit, b);
    x = lerp(x, fx, c2); y = lerp(y, fy, c2);
    // dimakan makrofag (m = k % 3): bergerak ke sel lalu mengecil
    const m = k % 3, t0 = MONO_T0(m), eng = seg(t, t0 + 3.2 + 0.15 * k % 0.6, t0 + 4.0 + 0.15 * (k % 3), eio);
    const [mx, my] = macPos(m); x = lerp(x, mx, eng); y = lerp(y, my, eng);
    out.push({ k, x, y, r: 14 * (1 - 0.85 * eng), a: 1 - seg(t, t0 + 3.9, t0 + 4.4) * eng, ox: oxAt(t), settled: c2 > 0.95 && eng < 0.02, eng });
  }
  return out;
};
export const monos = (t) => {
  const out = [];
  for (let m = 0; m < 3; m += 1) {
    const t0 = MONO_T0(m); if (t < t0 - 1.0) continue;
    const yAdh = -150 + m * 120, xAdh = H0 - 30;
    const ap = seg(t, t0 - 0.8, t0 + 0.5, eo);                      // tiba dari atas bersama aliran, menempel
    const cr = seg(t, t0 + 0.5, t0 + 1.2, eio);                     // merayap ke celah
    const tg = seg(t, t0 + 1.2, t0 + 2.0, eio);                     // menembus endotel
    const st = seg(t, t0 + 2.0, t0 + 2.4, eo);                      // menetap di intima
    const [mx, my] = macPos(m);
    let x = lerp(-60 + m * 30, xAdh, ap), y = lerp(yAdh - 260, yAdh, ap);
    y = lerp(y, GY - 6 + (m - 1) * 8, cr); x = lerp(x, xAdh + 2, cr);
    x = lerp(x, H0 + 22, tg); x = lerp(x, mx, st); y = lerp(y, my, st);
    const mm = seg(t, t0 + 2.4, t0 + 3.0), f = seg(t, t0 + 3.2, t0 + 4.2);
    out.push({ m, x, y, mm, f, a: 1 });
  }
  return out;
};
/** isi dunia mikro (di atas dinding dan plak, di bawah endotel untuk yang di intima; endotel digambar terpisah) */
export function micro(t, det = 1) {
  if (t < 23.0 || t > 36.5) return '';
  let s = '';
  const infl = inflAt(t);
  if (infl > 0.02) { const k = 0.85 + 0.15 * Math.sin(t * 6); s += `<g opacity="${f1(infl * 0.9)}"><ellipse cx="${H0 + 44}" cy="0" rx="${f1(130 * k)}" ry="${f1(200 * k)}" fill="url(#gGlowR)"/></g>`; }
  const R = retained(t);
  for (const p of R) {
    if (p.a < 0.02) continue;
    if (p.settled && det) { s += `<path d="M${f1(p.x - 12)} ${f1(p.y - 8)}l-16 -22M${f1(p.x + 12)} ${f1(p.y + 8)}l20 22" stroke="#9A6A1A" stroke-width="3.4" stroke-linecap="round" opacity="${f1(0.8 * clamp((t - retTe(p.k) - 2) * 2))}"/>`; }
    s += ldl(p.x, p.y, p.r * 17 / 14, { det, ox: p.ox, a: p.a });
  }
  for (const m of monos(t)) { s += immune(m.x, m.y, 24, { m: m.mm, f: m.f, ph: m.m + t * 0.6, a: m.a }); }
  // penanda peradangan: percikan kecil di sekitar sel
  if (infl > 0.05) for (let i = 0; i < 6; i += 1) { const an = i * 1.1 + t * 2, x = H0 + 40 + Math.cos(an) * (110 + (i % 3) * 20), y = Math.sin(an * 0.9) * (170 + (i % 2) * 20); s += `<path d="M${f1(x - 9)} ${f1(y - 3)}l9 -9l-3 12l12 -6l-9 12" fill="none" stroke="#FFB36B" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" opacity="${f1(infl * 0.85)}"/>`; }
  return s;
}

// ------------------------------------------------------------------ pengatur: seluruh dunia pembuluh pada waktu t dan kamera cam = { cx, cy, S }
export function vesselWorld(t, cam, o = {}) {
  const hv = 1920 / cam.S / 2 + 80, yr = [cam.cy - hv, cam.cy + hv];
  const st = { g: G(t), rup: RUP(t), c: CLOT(t), t };
  st.gap = gapOpen(t); st.gy = GY;
  const det = cam.S > 1.6 ? 1 : 0;
  let s = wall(t, yr, st);
  s += blood(t, yr, st) + ldlFlow(t, yr, { ...st, oxAll: 0 }, det);
  s += plaque(t, yr, st);
  s += endothelium(t, yr, st);
  s += clot(t, yr, st) + plateletsAtRupture(t, st) + spill(t, st);
  s += micro(t, det);
  return s;
}

// Video "Bunyi tensi dari mana?" (Korotkoff), 1080x1920, 30 fps, 45,96 dtk (narasi 43,16 dtk + penutup 2,8 dtk). Tokoh: Raka (brand/characters/raka/raka.js, apa adanya).
// Alur: Raka menempelkan stetoskop di lipatan siku dan jarum tensimeter turun (dua "duk") -> kamera mendekat ke lengan -> manset dipompa -> kamera masuk dan penampang memanjang terbuka
// -> arteri terjepit, denyut tiba tanpa bunyi -> manset dikempiskan, dinding arteri mulai bergerak, getaran merambat ke diafragma -> ketukan pertama (dibekukan) = sistolik -> ketukan mengikuti denyut ->
// bunyi menghilang, arteri terbuka sepanjang siklus = diastolik -> dua penanda pada satu pengukur -> kembali sekejap ke Raka -> kartu penutup.
// Model: ../korotkoff/fisika.mjs (satu sumber untuk gambar dan bunyi). Skematis: bukan simulasi hemodinamik; tidak ada angka tekanan di layar.
import { FONT, MEREK } from '../tokens.mjs';
import { latar } from '../latar.mjs';
import { f1, clamp, lerp, seg, ease, kf, mulus, poli, BLUR_DEFS } from '../tensi/util.mjs';
import { raka, rakaSvg, idle } from '../../../characters/raka/raka.js';
import { EV, K, DURASI, NARASI_DTK } from '../korotkoff/waktu.mjs';
import { PS, PD, PMAKS, tAnim, tekananManset, daftarKetukan, tekananArteri, denyutAntara } from '../korotkoff/fisika.mjs';
import * as L from '../korotkoff/lengan.mjs';
import * as A from '../korotkoff/alat.mjs';

export const meta = { id: 'korotkoff', judul: 'Bunyi tensi dari mana?', sub: 'bunyi Korotkoff', organ: 'arteri brakialis', durasi: DURASI, fps: 30 };
const GADING = MEREK.gading, EMAS = MEREK.emas, TINTA = MEREK.tinta, MINT = '#7FE0C8';
const KETUKAN = daftarKetukan();
const ZOOM = 1.74, W0 = [480, 1030], S0 = [690, 600];
const G = `translate(${W0[0]} ${W0[1]}) scale(${f1(1 / ZOOM * 10000) / 10000}) translate(${-S0[0]} ${-S0[1]})`;

// ------------------------------------------------------------------ kamera: layar = z * (dunia - f) + g
const KAM = [
  [0, 1.09, 600, 1000, 540, 840], [1.3, 1.0, 540, 960, 540, 830], [2.9, 1.0, 540, 960, 540, 830], [4.6, 1.22, 600, 1060, 540, 887], [6.8, 1.24, 600, 1062, 540, 890],
  [8.2, 1.3, 585, 1062, 540, 880], [9.3, ZOOM, W0[0], W0[1], S0[0], S0[1]], [39.72, ZOOM, W0[0], W0[1], S0[0], S0[1]],
  [40.5, 1.0, 540, 960, 540, 830], [NARASI_DTK, 1.05, 540, 980, 540, 845],
];
function kamera(T) {
  let a = KAM[0], b = KAM[KAM.length - 1];
  for (let i = 0; i < KAM.length - 1; i++) if (T >= KAM[i][0] && T <= KAM[i + 1][0]) { a = KAM[i]; b = KAM[i + 1]; break; }
  const u = a === b ? 1 : ease.inOut(clamp((T - a[0]) / (b[0] - a[0])));
  const m = (i) => lerp(a[i], b[i], u), z = m(1), fx = m(2), fy = m(3), gx = m(4), gy = m(5);
  return { z, tf: `translate(${f1(gx - z * fx)} ${f1(gy - z * fy)}) scale(${f1(z * 10000) / 10000})` };
}

// ------------------------------------------------------------------ tekanan pada adegan luar (hook: jarum turun; lalu fisika)
function tekananLuar(T) {
  if (T < EV.pompa[0] - 0.05) return T < 6.9 ? lerp(165, 0, ease.sm(seg(T, 3.4, 6.7))) * 1 + (T < 3.4 ? lerp(0, 0, 0) : 0) - 0 : 0;
  return tekananManset(tAnim(T));
}
const pHook = (T) => (T < 3.4 ? lerp(168, 128, T / 3.4) : T < 6.9 ? lerp(128, 0, ease.sm(seg(T, 3.4, 6.7))) : 0);
const tekan = (T) => (T < EV.pompa[0] - 0.05 ? pHook(T) : tekananManset(tAnim(T)));
function hookAmp(T) { let a = 0; for (const e of [EV.duk1, EV.duk2]) { const d = T - e + 0.034; if (d >= 0 && d < 0.26) a = Math.max(a, 1 - d / 0.26); } return a; }
const hookNew = (T) => hookAmp(T);

// ------------------------------------------------------------------ Raka
const RK = { k: 1.5, x: 860, y0: 498 };
const kunci = (T, ks) => kf(T, ks, ease.sm);
const HS = (() => { const w = [W0[0] + (L.STET.x - S0[0]) / ZOOM, W0[1] + (L.YT - 34 - S0[1]) / ZOOM]; return [200 + (w[0] - RK.x) / RK.k, (w[1] - RK.y0) / RK.k]; })();
const pasangT = (T) => 1 - ease.out(seg(T, 0, 0.9, ease.lin));
function rakaState(T) {
  const pasang = pasangT(T);
  const kn = hookAmp(T), kn2 = T > 39.9 ? 0 : 0;
  const tanya = seg(T, K.k2.a - 0.1, K.k2.a + 0.5) * (1 - seg(T, 6.7, 7.2)), paham = seg(T, EV.raka[1] - 0.2, EV.raka[1] + 0.5);
  const pump = EV.pompa.reduce((m, t0) => Math.max(m, Math.sin(Math.PI * clamp((T - t0) / 0.3))), 0) * (T > 7.2 && T < 8.5 ? 1 : 0);
  const lihatGauge = seg(T, 6.9, 7.3) * (1 - seg(T, 8.4, 8.8));
  let s = raka('netral', null, {
    yaw: lerp(-0.4, -0.2, paham), gazeX: lerp(lerp(-0.85, -0.9, lihatGauge), 0.1, paham), gazeY: lerp(lerp(0.4, -0.55, lihatGauge), 0.1, paham),
    tilt: -3 - 5 * kn - 7 * tanya + 3 * paham, lean: -2 + 1.5 * kn,
    wide: 0.55 * kn, browL: { y: -8 * kn - 5 * tanya - 4 * paham, rot: 8 * tanya }, browR: { y: -8 * kn + 2 * tanya - 4 * paham, rot: -6 * tanya },
    happyEyes: 0.9 * paham, mouth: { w: lerp(lerp(14, 9, tanya), 20, paham), up: lerp(lerp(9, 6, tanya), 12, paham), lo: lerp(lerp(9, 5, tanya), 12, paham) },
    armL: { wx: HS[0] + 12 + 14 * pasang, wy: HS[1] - 26 + 2 * kn - 17.6 * pasang, ex: (104 + HS[0]) / 2 + 10, ey: Math.min(410, HS[1]) - 62, finger: 0, fa: -90, front: 1, roll: 0 },
    armR: { wx: 262, wy: 470 + 15 * pump, ex: 334, ey: 505, finger: 0, fa: -90, front: 1, roll: 0 },
    bob: 2 * Math.sin(T * 2.2) * 0.3 + 4 * paham * Math.max(0, Math.sin((T - EV.raka[1]) * 5)) * seg(T, EV.raka[1], EV.raka[1] + 1.2) * (1 - seg(T, 42.6, 43.1)),
  });
  return idle(s, T);
}
function rakaDunia(T) {
  const s = rakaSvg(rakaState(T), { width: 400 * RK.k, uid: 'rk', shadow: false, dark: true });
  return s.replace('<svg ', `<svg x="${RK.x - 200 * RK.k}" y="${RK.y0}" width="${400 * RK.k}" height="${800 * RK.k}" style="overflow:visible" `);
}
const rakaP = (cx, cy) => [RK.x + (cx - 200) * RK.k, RK.y0 + cy * RK.k];
const S2W = ([x, y]) => [W0[0] + (x - S0[0]) / ZOOM, W0[1] + (y - S0[1]) / ZOOM];
const W2S = ([x, y]) => [S0[0] + (x - W0[0]) * ZOOM, S0[1] + (y - W0[1]) * ZOOM];
const GAUGE_W = [370, 700, 130];
const GAUGE_S = (() => { const c = W2S([GAUGE_W[0], GAUGE_W[1]]); return [c[0], c[1], GAUGE_W[2] * ZOOM]; })();

// ------------------------------------------------------------------ meja, selang, bola pompa, tabung stetoskop (koordinat S di dalam grup lengan)
function meja() {
  return `<defs><linearGradient id="mj" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2D6762"/><stop offset="1" stop-color="#1B4642"/></linearGradient><linearGradient id="mj2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0F3836"/><stop offset="1" stop-color="#082220"/></linearGradient></defs>`
    + `<rect x="-300" y="${L.YB}" width="2400" height="46" fill="url(#mj)"/><rect x="-300" y="${L.YB}" width="2400" height="7" fill="#58A39A" opacity=".55"/><rect x="-300" y="${L.YB + 46}" width="2400" height="2400" fill="url(#mj2)"/>`
    + `<ellipse cx="560" cy="${L.YB + 6}" rx="760" ry="20" fill="#000" opacity=".28"/>`;
}
const BULB = [1356, 916, 62];
function selangDanBola(P, Pn) {
  let s = `<path d="M${L.CUFF.x1 - 30} ${L.YB + 22 + 12 * Pn}C700 ${L.YB + 50} 1000 ${L.YB + 30} 1290 ${BULB[1] + 26}" fill="none" stroke="${L.WARNA.tabung}" stroke-width="14" stroke-linecap="round" opacity=".95"/>`;
  s += `<path d="M${L.CUFF.x0 + 82} ${f1(L.YT - 22 - 12 * Pn)}C${L.CUFF.x0 + 60} 480 ${L.CUFF.x0 - 40} 430 -260 420" fill="none" stroke="${L.WARNA.tabung}" stroke-width="14" stroke-linecap="round" opacity=".95"/>`;
  return s;
}
function bola(T) {
  const sq = EV.pompa.reduce((m, t0) => Math.max(m, Math.sin(Math.PI * clamp((T - t0) / 0.3))), 0) * (T > 7.2 && T < 8.5 ? 1 : 0);
  const [bx, by, br] = BULB, sx = 1 + 0.12 * sq, sy = 1 - 0.2 * sq;
  return `<g transform="translate(${bx} ${f1(by + br * 0.5)}) scale(${f1(sx * 100) / 100} ${f1(sy * 100) / 100}) translate(${-bx} ${f1(-(by + br * 0.5))})"><ellipse cx="${bx}" cy="${by}" rx="${br}" ry="${br * 0.78}" fill="#1D7B75"/><ellipse cx="${bx - 18}" cy="${by - 20}" rx="${br * 0.5}" ry="${br * 0.3}" fill="#fff" opacity=".22"/><rect x="${bx - 30}" y="${by + br * 0.5}" width="46" height="26" rx="8" fill="${L.WARNA.perakG}"/></g>`;
}
const TUBE_END = [1210, 556];
const tabungStet = (x = L.STET.x, y = L.YT) => `<path d="M${x} ${y - 70}C${x} ${y - 140} ${x + 120} ${y - 124} ${x + 300} ${y - 110}S${x + 440} ${y - 50} ${TUBE_END[0]} ${TUBE_END[1]}" fill="none" stroke="${L.WARNA.tabung}" stroke-width="15" stroke-linecap="round"/><path d="M${x + 3} ${y - 72}C${x + 3} ${y - 142} ${x + 123} ${y - 126} ${x + 303} ${y - 112}S${x + 443} ${y - 52} ${TUBE_END[0]} ${TUBE_END[1] - 2}" fill="none" stroke="#3C5670" stroke-width="3.4" stroke-linecap="round" opacity=".8"/>`;
function kepalaStet(info, dnt) {
  const x = L.STET.x, y = L.YT, d = dnt, dent = 3.5 * d;
  let s = `<g transform="translate(0 ${f1(dent)})"><rect x="${x - 10}" y="${y - 70}" width="20" height="40" rx="7" fill="${L.WARNA.perakG}"/><rect x="${x - 54}" y="${y - 36}" width="108" height="34" rx="15" fill="${L.WARNA.perak}"/><rect x="${x - 54}" y="${y - 36}" width="108" height="12" rx="6" fill="#fff" opacity=".45"/><rect x="${x - 50}" y="${y - 8}" width="100" height="7" rx="3.5" fill="${L.WARNA.perakG}"/></g>`;
  if (d > 0.04) for (let j = 0; j < 3; j++) { const r = 40 + j * 24 + d * 6; s += `<path d="M${x - r} ${y - 36}A${r} ${r} 0 0 1 ${x + r} ${y - 36}" transform="translate(0 ${f1(-2 - j * 4)})" fill="none" stroke="#F8C038" stroke-width="${f1(6 - j * 1.4)}" stroke-linecap="round" stroke-opacity="${f1((0.95 - j * 0.28) * d)}"/>`; }
  return s;
}
/** Selang telinga stetoskop pada Raka (koordinat dunia): dari simpul Y di leher ke kedua telinga, lalu ke S tabung. */
function selangRaka() {
  const J = S2W(TUBE_END), eL = rakaP(94, 216), eR = rakaP(306, 216), neck = rakaP(200, 372);
  const tube = (d) => `<path d="${d}" fill="none" stroke="${L.WARNA.tabung}" stroke-width="9" stroke-linecap="round"/>`;
  return tube(`M${f1(J[0])} ${f1(J[1])}C${f1(J[0] + 40)} ${f1(J[1] + 10)} ${f1(neck[0] - 30)} ${f1(neck[1] + 30)} ${f1(neck[0])} ${f1(neck[1] + 36)}`)
    + tube(`M${f1(neck[0])} ${f1(neck[1] + 36)}C${f1(neck[0] - 70)} ${f1(neck[1] + 20)} ${f1(eL[0] - 8)} ${f1(eL[1] + 120)} ${f1(eL[0] + 8)} ${f1(eL[1] + 14)}`)
    + tube(`M${f1(neck[0])} ${f1(neck[1] + 36)}C${f1(neck[0] + 70)} ${f1(neck[1] + 20)} ${f1(eR[0] + 8)} ${f1(eR[1] + 120)} ${f1(eR[0] - 8)} ${f1(eR[1] + 14)}`)
    + `<circle cx="${f1(eL[0] + 8)}" cy="${f1(eL[1] + 12)}" r="8" fill="${L.WARNA.perak}"/><circle cx="${f1(eR[0] - 8)}" cy="${f1(eR[1] + 12)}" r="8" fill="${L.WARNA.perak}"/>`;
}

// ------------------------------------------------------------------ dunia (adegan luar + penampang)
function dunia(T, sweep) {
  const S = L.keadaan(T), P = tekan(T), Pn = P / PMAKS;
  const Sx = { ...S, P, Pn };
  const reveal = sweep, sweepX = lerp(-60, 1260, ease.inOut(reveal));
  const dnt = T < 5 ? hookAmp(T) : 0;
  const pen = L.penampang(T);
  const infoSt = { diafragma: Math.max(pen.info.diafragma || 0, dnt) };
  let g = '';
  const luarVisible = reveal < 1, dalamVisible = reveal > 0;
  g += `<defs><clipPath id="cE"><rect x="${f1(sweepX)}" y="-600" width="2600" height="3000"/></clipPath><clipPath id="cD"><rect x="-300" y="-600" width="${f1(sweepX + 300)}" height="3000"/></clipPath></defs>`;
  if (luarVisible) {
    g += `<g clip-path="url(#cE)">${L.luar(Sx)}${selangDanBola(P, Pn)}${bola(T)}`;
    g += `${L.mansetLuar(Sx)}</g>`;
  }
  if (dalamVisible) g += `<g id="SEC" clip-path="url(#cD)">${pen.svg}${L.mansetPenampang(S)}${tabungStet()}${kepalaStet(infoSt, infoSt.diafragma)}</g>`;
  // tepi sapuan emas
  if (reveal > 0.001 && reveal < 0.999) g += `<rect x="${f1(sweepX - 4)}" y="${L.YT - 40}" width="8" height="${L.H + 80}" rx="4" fill="${EMAS}"/><rect x="${f1(sweepX - 30)}" y="${L.YT - 40}" width="60" height="${L.H + 80}" fill="url(#sw)" opacity=".55"/>`;
  if (!dalamVisible) g += `<g transform="translate(0 ${f1(-46 * pasangT(T))})">${tabungStet()}${kepalaStet(infoSt, infoSt.diafragma)}</g>`; else if (luarVisible) g += `<g clip-path="url(#cE)">${tabungStet()}${kepalaStet(infoSt, infoSt.diafragma)}</g>`;
  return { g, pen, S: Sx };
}

// ------------------------------------------------------------------ overlay penampang
const FEED = [[132, 470], [70, 562], [16, 664], [-34, 776]];
const FEED_D = mulus(FEED);
function jantungDanJalur(T, p) {
  if (p < 0.01) return '';
  const Ta = tAnim(T);
  let s = `<g opacity="${f1(p)}"><path d="${FEED_D}" fill="none" stroke="#7E2330" stroke-width="30" stroke-linecap="round"/><path d="${FEED_D}" fill="none" stroke="#E5484D" stroke-width="19" stroke-linecap="round"/><path d="${FEED_D}" fill="none" stroke="#fff" stroke-opacity=".16" stroke-width="5" stroke-linecap="round" transform="translate(-3 -2)"/>`;
  for (const tb of denyutAntara(Ta - 0.6, Ta + 1.2)) { const sp = (Ta - (tb - 0.95)) / 0.28 * 340; if (sp < -40 || sp > 380) continue; s += `<path d="${FEED_D}" pathLength="340" fill="none" stroke="#FFD9CF" stroke-opacity=".9" stroke-width="15" stroke-linecap="round" stroke-dasharray="46 420" stroke-dashoffset="${f1(-(sp - 23))}"/>`; }
  s += A.jantungMini(T, 118, 372, 0.34) + `</g>`;
  return s;
}
function tanda(T) { // penanda sistolik/diastolik pada pengukur
  const s = seg(T, EV.labelS, EV.labelS + 0.45, ease.out), d = seg(T, EV.labelD, EV.labelD + 0.45, ease.out);
  return { s, d };
}
function getarJarum(T) { let g = 0; for (const e of KETUKAN) { if (e.jenis !== 'korotkoff') continue; const dt = tAnim(T) - tAnim(e.t); if (dt >= 0 && dt < 0.3) g += e.a * 3.2 * Math.exp(-dt / 0.09) * Math.sin(dt * 60); } return g; }

// ------------------------------------------------------------------ bingkai
export function frame(T, opt = {}) {
  const kam = kamera(T), sweepA = seg(T, EV.masuk[0], EV.masuk[1], ease.lin), sweepB = 1 - seg(T, EV.raka[0], EV.raka[0] + 0.8, ease.lin);
  const sweep = T < EV.raka[0] ? sweepA : sweepB;
  const secP = seg(T, 8.9, 9.6) * (1 - seg(T, EV.raka[0] - 0.1, EV.raka[0] + 0.5));
  const D = dunia(T, sweep);
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1080" height="1920" viewBox="0 0 1080 1920"><defs><clipPath id="vp"><rect width="1080" height="1920"/></clipPath><linearGradient id="sw" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${EMAS}" stop-opacity="0"/><stop offset=".5" stop-color="${EMAS}" stop-opacity=".9"/><stop offset="1" stop-color="${EMAS}" stop-opacity="0"/></linearGradient></defs>${BLUR_DEFS}<defs>${A.DEFS_JANTUNG}</defs>${A.defsPengukur('pg')}${A.defsPengukur('pw')}<g clip-path="url(#vp)">`;
  svg += latar('jantung', T);
  const showWorldA = T < 9.35 || T > EV.raka[0] - 0.05;
  svg += `<g transform="${kam.tf}">`;
  if (showWorldA) svg += rakaDunia(T) + selangRaka();
  svg += `<g transform="${G}">${showWorldA ? meja() : ''}${D.g}</g></g>`;
  // ---- overlay layar: pertanyaan
  const q = seg(T, EV.tanya, EV.tanya + 0.4, ease.out) * (1 - seg(T, 7.0, 7.4));
  svg += A.pertanyaan(q);
  // ---- overlay penampang
  const S = D.S, pr = secP;
  if (pr > 0.01) {
    svg += jantungDanJalur(T, pr);
    svg += A.jejak(T, 40, 1036, 1000, 76, pr);
    { const lp = seg(T, K.k6.a, K.k6.a + 0.5) * (1 - seg(T, EV.dua - 0.3, EV.dua + 0.1)) * pr; // lupa pada tepi distal manset (dinding arteri dan getaran ke diafragma)
      if (lp > 0.01) { const cx = 790, cy = 410, r = 158, sx = 650, sy = 664, k = 1.5;
        svg += `<g opacity="${f1(lp)}"><defs><clipPath id="lupa"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath></defs><circle cx="${cx}" cy="${cy + 6}" r="${r + 8}" fill="#000" opacity=".35"/><circle cx="${cx}" cy="${cy}" r="${r + 8}" fill="#0D1F2D"/><g clip-path="url(#lupa)"><rect x="${cx - r}" y="${cy - r}" width="${2 * r}" height="${2 * r}" fill="#0D1F2D"/><use href="#SEC" transform="translate(${cx} ${cy}) scale(${k}) translate(${-sx} ${-sy})"/></g><circle cx="${cx}" cy="${cy}" r="${r + 5}" fill="none" stroke="${GADING}" stroke-width="9"/><circle cx="${cx}" cy="${cy}" r="${r + 5}" fill="none" stroke="${EMAS}" stroke-width="3.5" opacity=".9"/><circle cx="${sx}" cy="${sy}" r="${f1(r / k)}" fill="none" stroke="${GADING}" stroke-width="3" stroke-dasharray="9 8" opacity=".8"/></g>`; } }
    const td = tanda(T), Pg = D.S.P, jarum = Pg;
    // peredupan saat momen pertama dibekukan, kecuali pengukur dan label
    const beku = seg(T, EV.beku[0], EV.beku[0] + 0.2) * (1 - seg(T, EV.beku[1] - 0.15, EV.beku[1]));
    if (beku > 0.01) {
      const hx = L.STET.x, hy = L.YT + 40;
      svg += `<rect x="0" y="0" width="1080" height="1920" fill="#03101A" opacity="${f1(0.42 * beku)}"/>`;
      svg += `<circle cx="${hx}" cy="${hy - 40}" r="${f1(100 + 6 * Math.sin(T * 16))}" fill="none" stroke="${EMAS}" stroke-width="7" opacity="${f1(beku)}" stroke-dasharray="26 16"/>`;
      svg += L.stetoskopTop ? '' : '';
    }
    svg += '';
    const lS = seg(T, EV.labelS, EV.labelS + 0.4, ease.out) * (1 - seg(T, EV.labelD - 0.3, EV.labelD));
    const lD = seg(T, EV.labelD, EV.labelD + 0.4, ease.out) * (1 - seg(T, EV.dua - 0.1, EV.dua + 0.3));
    svg += A.labelBesar('BUNYI PERTAMA → SISTOLIK', EMAS, lS * pr, 1118);
    svg += A.labelBesar('BUNYI HILANG → DIASTOLIK', MINT, lD * pr, 1118);
  }
  // ---- pengukur tekanan besar: tampil sejak bingkai pertama (jarum turun pada hook) sampai penutup
  { const td = tanda(T), hook = T < 5 ? hookAmp(T) : 0, rk = T >= EV.raka[0];
    const sPul = rk ? seg(T, 40.13, 40.3) * (1 - seg(T, 41.3, 41.5)) : seg(T, K.k11b.a, K.k11b.a + 0.15) * (1 - seg(T, K.k11b.a + 0.35, K.k11b.a + 0.5)), dPul = rk ? seg(T, 41.53, 41.7) * (1 - seg(T, 42.8, 43.0)) : seg(T, K.k11b.a + 0.45, K.k11b.a + 0.6) * (1 - seg(T, K.k11b.a + 0.8, K.k11b.a + 0.95));
    svg += `<g>${A.pengukur(540, 1486, 190, D.S.P, { s: Math.max(td.s, 0), d: Math.max(td.d, 0), getar: getarJarum(T) + 3 * hook * Math.sin(T * 50), uid: 'pg', denyutS: sPul, denyutD: dPul })}</g>`; }
  { const pr2 = seg(T, 8.9, 9.6) * (1 - seg(T, EV.raka[0] - 0.1, EV.raka[0] + 0.5)); const jarum = D.S.P, beku = seg(T, EV.beku[0], EV.beku[0] + 0.2) * (1 - seg(T, EV.beku[1] - 0.15, EV.beku[1]));
    if (beku > 0.01 && pr2 > 0.01) { const a = A.sudut(jarum), x = 540 + Math.cos(a) * 152, y = 1486 + Math.sin(a) * 152; svg += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(42 + 5 * Math.sin(T * 14))}" fill="none" stroke="${EMAS}" stroke-width="8" opacity="${f1(beku)}"/>`; } }
  // ---- kartu penutup
  const kt = seg(T, NARASI_DTK, NARASI_DTK + 0.45);
  if (kt > 0.01) {
    const u = ease.out(seg(T, NARASI_DTK + 0.1, NARASI_DTK + 0.8));
    svg += `<g opacity="${f1(kt)}"><rect x="-80" y="-80" width="1240" height="2080" fill="#06161A"/><image href="logo-mark.webp" x="400" y="${f1(650 + (1 - u) * 24)}" width="280" height="280"/>`
      + `<text x="540" y="1030" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="76" letter-spacing="8" fill="${GADING}">MEDCOEL</text>`
      + `<text x="540" y="1150" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="52" fill="${EMAS}">Belajar FK gratis di</text><text x="540" y="1222" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="64" fill="${GADING}">medcoel.com</text>`
      + `<text x="540" y="1330" text-anchor="middle" font-family="${FONT}" font-weight="500" font-size="28" fill="${GADING}" opacity=".7">Animasi skematis, bukan pengganti pemeriksaan tenaga kesehatan</text></g>`;
  }
  svg += `</g></svg>`;
  return svg;
}

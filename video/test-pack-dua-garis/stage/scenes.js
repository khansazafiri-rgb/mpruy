// Semua adegan edukasi. frame(t) -> { A: SVG dunia, U: SVG teks/label }. tn = t - OFF (detik narasi).
import { f1, clamp, lerp, R, T, GOLD, INK, FOREST, pill, eo, eio, sm, rndf, tw } from './lib.js';
import { raka, rakaSvg, rIdle } from './raka.js';
import { CC, XT, XC, WIN, SEC, CASE, plan, side, minimap, Y, particle, hcg, ease } from './strip.js';
import * as TL from './timeline.js';
import { stream, channelBg, camBase, CH, V, BT, capturedAt } from './micro.js';
export const A = TL.A, OFF = TL.OFF;
const kw = (tn, t0, t1, f = 0.22) => clamp((tn - t0) / f) * clamp((t1 - tn) / f);
const camT = (cx, cy, z, sx = 540, sy = 780) => `translate(${f1(sx - cx * z)} ${f1(sy - cy * z)}) scale(${f1(z * 1000) / 1000})`;
const gOp = (svg, a) => `<g opacity="${f1(clamp(a) * 100) / 100}">${svg}</g>`;
const bgDark = `<defs><linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1B6075"/><stop offset="1" stop-color="#0A2B34"/></linearGradient></defs>${R(-1000, -1000, 4000, 5000, 'url(#g2)')}`;
const wrap = (s, size, maxW) => { const words = s.split(' '), lines = []; let cur = ''; for (const w of words) { const t = cur ? cur + ' ' + w : w; if (cur && tw(t, size) > maxW) { lines.push(cur); cur = w; } else cur = t; } if (cur) lines.push(cur); return lines; };
export function captions(tn, list = TL.KAL, y = 1400) {
  const c = list.find(([a, b]) => tn >= a - 0.02 && tn <= b + 0.12); if (!c) return '';
  const size = 46, lines = wrap(c[2], size, 840), a = clamp((tn - c[0] + 0.02) / 0.15) * clamp((c[1] + 0.12 - tn) / 0.12 + 0.2), lh = size * 1.22, h = lines.length * lh + 30;
  return `<g opacity="${f1(a * 100) / 100}">${R(90, y + 6, 900, h, 'rgba(0,0,0,.28)', 34)}${R(90, y, 900, h, 'rgba(8,16,28,.92)', 34)}${lines.map((l, i) => T(l, 540, y + 14 + size * 0.88 + i * lh, { size, fill: '#fff', w: 800 })).join('')}</g>`;
}
const pillAt = (tn, t0, t1, lines, y, o = {}) => { const k = kw(tn, t0, t1, 0.3); return k > 0.01 ? pill(lines, o.cx ?? 540, y + (1 - eo(clamp((tn - t0) / 0.35))) * -44, { a: k, size: o.size ?? 54, bg: o.bg, fg: o.fg }) : ''; };
const tag = (tn, t0, t1, lines, x, y, o = {}) => { const k = kw(tn, t0, t1, 0.25); return k > 0.01 ? pill(lines, x, y, { a: k, size: o.size ?? 36, bg: o.bg ?? '#fff', fg: o.fg, k: 0.9 + 0.1 * eo(clamp((tn - t0) / 0.3)) }) : ''; };
const ARROWS = (x, y, a, t, n = 3, sc = 1) => { let s = ''; for (let i = 0; i < n; i++) { const ph = (t * 1.2 + i / n) % 1, xx = x - ph * 160 * sc - i * 0; s += `<path d="M${f1(xx - 18 * sc)} ${f1(y - 22 * sc)}L${f1(xx + 6 * sc)} ${f1(y)}L${f1(xx - 18 * sc)} ${f1(y + 22 * sc)}" fill="none" stroke="${GOLD}" stroke-width="${f1(9 * sc)}" stroke-linecap="round" stroke-linejoin="round" opacity="${f1(a * Math.sin(ph * Math.PI) * 100) / 100}"/>`; } return s; };

// ================================================================ ADEGAN 1: hasil dulu (makro jendela hasil), cairan sudah bergerak sejak bingkai pertama
function sceneHook(tn) {
  const fr = lerp(1530, 1840, ease(tn / 1.3)), aC = ease((tn - 0.15) / 1.5), aT = ease((tn - 0.8) / 1.7);
  const out = clamp((tn - 3.55) / 0.6);       // kembali ke awal: garis memudar saat adegan berikut
  const world = plan({ front: fr, aT: aT * (1 - out), aC: aC * (1 - out) });
  const A_ = `${bgDark}<g transform="${camT(1450, 0, 1.15, 540, 780)}">${world}</g>`;
  const U = pillAt(tn, -1, 3.2, ['DUA GARIS INI', 'DARI MANA?'], 150, { bg: '#fff', fg: FOREST, size: 62 }) + tag(tn, 0.6, 3.2, ['hasil tes (ilustrasi)'], 540, 1030, { size: 34 });
  return { A: A_, U };
}

// ================================================================ ADEGAN 2: kamera mundur ke test pack utuh, ujung kena urine, masuk ke penampang, cairan merambat melalui bahan berpori
function sceneFlow(tn) {
  // fase tampak atas (3.76 - 5.9) lalu tampak samping (5.5 - 8.9)
  const zoom = lerp(1.15, 0.34, ease((tn - 3.7) / 1.3)), cx = lerp(1450, 1070, ease((tn - 3.7) / 1.3));
  const poolK = ease((tn - 3.9) / 0.6), frPlan = tn < 4.5 ? -1 : lerp(0, 380, ease((tn - 4.5) / 1.1));
  const plK = clamp((5.9 - tn) / 0.5);                               // tampak atas memudar
  const stK = clamp((tn - 5.4) / 0.5);                               // tampak samping muncul
  const frS = tn < 5.7 ? 0 : 520 * (tn - 5.7);                       // ujung cairan (x dunia)
  const zS = 1.5, cxS = clamp(frS + 200, 420, 1800);
  let A_ = bgDark;
  if (plK > 0.01) A_ += gOp(`<g transform="${camT(cx, 0, zoom, 540, 760)}">${plan({ pool: poolK, front: frPlan })}</g>`, plK);
  if (stK > 0.01) A_ += gOp(`<g transform="${camT(cxS, 0, zS, 540, 800)}">${side({ front: frS })}${ARROWS(frS - 30, -150, tn > 6 ? 1 : 0, tn, 4, 1.3)}</g>`, stK);
  let U = pillAt(tn, A.saat - 0.1, 5.4, ['TEST PACK KENA URINE'], 150, { bg: '#fff', fg: FOREST, size: 52 }) + pillAt(tn, 5.8, 8.55, ['CAIRAN MERAMBAT'], 150, { bg: GOLD, fg: INK, size: 60 });
  if (stK > 0.5) U += tag(tn, 6.0, 7.3, ['bantalan sampel'], 540, 1010) + tag(tn, 7.3, 8.55, ['bahan berpori: cairan ikut tertarik'], 540, 1010, { size: 34 });
  if (tn < 6.2) U += tag(tn, 4.2, 5.6, ['ujung dicelup urine'], 540, 1000, { size: 34 });
  // pemandu kecil: Raka mengamati (tanpa memegang apa pun)
  const kr = kw(tn, A.saat, 6.1, 0.5);
  if (kr > 0.01) { let st = raka('berpikir', null, { yaw: -0.2, tilt: 5, gazeX: -0.5, gazeY: -0.3 }); st = rIdle(st, tn); U += `<g opacity="${f1(kr * 100) / 100}" transform="translate(${f1(850 - 200 * 0.7)} ${f1(1580 + (1 - eo(clamp((tn - A.saat) / 0.5))) * 120)}) scale(0.7)">${rakaSvg(st, { bare: true, shadow: false, uid: 'rkF', dark: true })}</g>`; }
  return { A: A_, U };
}
// ================================================================ ADEGAN 3 - 5: mikroskopis (ilustrasi): partikel + antibodi, hCG menempel, tertangkap di zona T
function sceneMicro(tn) {
  const cam = camBase(tn), st = stream(tn);
  const zz = lerp(1, 1.4, ease((tn - 21.0) / 1.0)), zc = clamp(st.bandX, 300, 800), zt = `translate(${f1(zc)} 810) scale(${f1(zz * 1000) / 1000}) translate(${f1(-zc)} -810)`;
  let A_ = bgDark + `<g transform="${zt}">${channelBg(cam)}${st.bg}${st.fg}</g>`;
  let U = '';
  // 'area T': huruf T besar berdenyut di atas zona (ruang visual sesaat setelah kata itu)
  const bT = kw(tn, 20.8, 21.9, 0.2); if (bT > 0.01 && st.bandX > 0 && st.bandX < 1100) U += `<g opacity="${f1(bT * 100) / 100}"><circle cx="${f1(st.bandX)}" cy="500" r="${f1(70 + 6 * Math.sin((tn - 20.8) * 9))}" fill="${GOLD}" stroke="${INK}" stroke-width="8"/>${T('T', st.bandX, 530, { size: 96, fill: INK })}</g>`;
  // peta mini + legenda
  U += minimap(150, 400, 780, 1000, { a: 0.95, aT: capturedAt(tn) / 7 * clamp((tn - 22.3) / 2), front: 1100 });
  U += pillAt(tn, 8.7, 13.4, ['PARTIKEL + ANTIBODI'], 150, { bg: '#fff', fg: FOREST, size: 52 }) + pillAt(tn, 13.45, 19.4, ['hCG + PENANDA'], 150, { bg: GOLD, fg: INK, size: 60 }) + pillAt(tn, 19.5, 26, ['T = GARIS TES'], 150, { bg: GOLD, fg: INK, size: 60 });
  const lg = clamp((tn - 9.2) / 0.5) * 0.95;
  if (lg > 0.02) U += `<g opacity="${f1(lg * 100) / 100}">${R(70, 1140, 940, 190, 'rgba(4,16,24,.78)', 28)}${particleLegend(tn)}</g>`;
  return { A: A_, U, st };
}
const particleLegend = (tn) => {
  const row = (x, y, icon, label, a = 1) => `<g opacity="${a}">${icon}${T(label, x + 54, y + 12, { size: 34, fill: '#fff', anchor: 'start', w: 700 })}</g>`;
  return row(110, 1195, particle(0, 0, 16, 'det'), 'partikel berwarna', 1) + row(540, 1195, Y(0, 22, 0, 0.9, CC.yDet), 'antibodi (Y)', tn > 11 ? 1 : 0.25) + row(110, 1275, hcg(0, 0, 1, 0), 'hormon hCG', tn > 14 ? 1 : 0.15) + row(540, 1275, Y(0, 22, 0, 0.9, CC.yT), 'antibodi penangkap di T', tn > 19.6 ? 1 : 0.15);
};
// ================================================================ ADEGAN 6: kembali ke strip utuh; garis T muncul; cairan terus ke C
const frontAt = (tn) => clamp(1380 + (tn - 24.4) * 60, 1380, 1840);
function scenePlanT(tn) {
  const aT = ease((tn - 24.2) / 1.7), fr = frontAt(tn), aC = tn < 29.9 ? 0 : ease((tn - 29.9) / 1.8);
  const hotT = tn >= 24.9 && tn < 26.4 ? 0.5 + 0.5 * Math.sin((tn - 24.9) * 7) : 0, hotC = tn >= 27.94 && tn < 29.0 ? 0.5 + 0.5 * Math.sin((tn - 27.94) * 7) : 0;
  const world = plan({ front: fr, aT, aC, hot: hotT > 0 ? 'T' : 'C', hotK: Math.max(hotT, hotC) });
  let A_ = `${bgDark}<g transform="${camT(1450, 0, 1.15, 540, 780)}">${world}${tn < 29 ? ARROWS(fr - 20, 0, 1, tn, 4, 1.4) : ''}</g>`;
  let U = pillAt(tn, 24.5, 26.0, ['T = GARIS TES'], 150, { bg: GOLD, fg: INK, size: 62 }) + pillAt(tn, 26.1, 29.0, ['CAIRAN MENUJU C'], 150, { bg: '#fff', fg: FOREST, size: 56 });
  U += tag(tn, 25.2, 26.4, ['partikel tertahan di T'], 540, 1010);
  if (tn >= 29.9) U += pillAt(tn, 29.9, 33, ['C = KONTROL'], 150, { bg: GOLD, fg: INK, size: 62 });
  if (tn >= 30.9) U += tag(tn, 30.94, 33.0, ['tes berjalan  ✓'], 540, 1010, { size: 42, bg: CC.ok, fg: '#fff' });
  return { A: A_, U };
}
// ================================================================ ADEGAN 7: mikroskopis zona C (partikel kontrol tertangkap antibodi kontrol)
const CTL = [{ x0: -80, y: 800, tc: 29.35, wall: 0, col: 0 }, { x0: -220, y: 700, tc: 29.65, wall: 1, col: 1 }, { x0: -330, y: 930, tc: 29.95, wall: 0, col: 2 }, { x0: -440, y: 760, tc: 30.2, wall: 1, col: 3 }];
function sceneMicroC(tn) {
  const k = 150, cam = 0, BC = 700; let bg = '', fg = '';
  const tcap = CTL.map((c) => c.tc);
  const cnt = CTL.filter((c) => tn >= c.tc - 0.1).length / CTL.length;
  const t0 = 28.88; let A_ = bgDark;
  bg += channelBg(60 + (tn - t0) * 60) + `<rect x="${BC - 250}" y="${CH.y0}" width="500" height="${CH.y1 - CH.y0}" fill="${CC.line}" opacity="${f1(0.05 + 0.34 * cnt)}"/>`;
  const YS = 36 / 24, YC = 41 * YS * 1.15, TIPD = 34 + 41 * YS * 0.92;
  for (let i = 0; i < 7; i++) { const x = BC - 190 + i * 78; fg += Y(x, CH.y1 - 2, 0, YS * 1.15, CC.yC) + Y(x, CH.y0 + 2, 180, YS * 1.15, CC.yC); }
  // partikel berwarna biasa melintas (tidak tertangkap di C)
  const pass = [[100, 640], [-300, 930], [-620, 700], [-900, 880]];
  pass.forEach(([x0, y], i) => { const x = x0 + k * (tn - t0); if (x > -80 && x < 1160) fg += particle(x, y + 14 * Math.sin(tn * 1.2 + i), 36, 'det', { rot: 0 }); });
  for (const c of CTL) {
    const xf = c.x0 + k * (tn - t0), yf = c.y + 14 * Math.sin(tn * 1.1 + c.x0), fx = BC - 190 + c.col * 104 + 40, fy = c.wall === 0 ? (CH.y1 - 2 - YC) - 18 - TIPD : (CH.y0 + 2 + YC) + 18 + TIPD;
    const e = ease((tn - (c.tc - 0.9)) / 0.9), er = ease((tn - (c.tc - 1.3)) / 1.0), rot = lerp(0, c.wall === 0 ? 18 : 54, er);
    const x = tn < c.tc - 0.9 ? xf : lerp(xf, fx, e), y = tn < c.tc - 0.9 ? yf : lerp(yf, fy, e);
    if (x > -100 && x < 1200) fg += particle(x, y, 36, 'ctl', { rot });
  }
  A_ += bg + fg;
  let U = minimap(150, 400, 780, 1590, { aT: 1, aC: cnt * 0.9, front: 1700 }) + pillAt(tn, 28.9, 30.5, ['C = GARIS KONTROL'], 150, { bg: GOLD, fg: INK, size: 56 });
  U += `<g opacity="${f1(clamp((tn - 28.95) / 0.4) * 0.95 * 100) / 100}">${R(70, 1140, 940, 120, 'rgba(4,16,24,.78)', 28)}${particle(130, 1200, 16, 'ctl')}${T('partikel kontrol', 164, 1212, { size: 34, fill: '#fff', anchor: 'start', w: 700 })}${Y(560, 1222, 0, 0.9, CC.yC)}${T('antibodi penangkap di C', 600, 1212, { size: 34, fill: '#fff', anchor: 'start', w: 700 })}</g>`;
  return { A: A_, U };
}
// ================================================================ ADEGAN 8: valid vs tidak valid
function card(cx, wc, z, o = {}) {      // kartu hasil: wc = tengah jendela; huruf T/C di atas jendela ikut masuk kartu
  const w = plan({ front: 1840, aT: o.aT ?? 0, aC: o.aC ?? 0 }), id = o.id ?? 'k1', top = wc - 239 * z - 12, hh = 369 * z + 24;
  return `<defs><clipPath id="${id}"><rect x="${f1(cx - 470)}" y="${f1(top)}" width="940" height="${f1(hh)}" rx="34"/></clipPath></defs><g clip-path="url(#${id})"><g transform="${camT(1450, 0, z, cx, wc)}">${w}</g></g><rect x="${f1(cx - 470)}" y="${f1(top)}" width="940" height="${f1(hh)}" rx="34" fill="none" stroke="${o.border ?? 'rgba(255,255,255,.35)'}" stroke-width="${o.bw ?? 5}"/>${rings(cx, wc, z, o)}`;
}
// cincin sorot bergerak (dash berjalan) pada garis yang dibahas: on = ada garis, off = tempat garis yang kosong
function rings(cx, wc, z, o) {
  if (!o.rings) return '';
  const tn = o.tn ?? 0, pulse = 0.65 + 0.35 * Math.sin(tn * 7);
  return `<g transform="${camT(1450, 0, z, cx, wc)}">${o.rings.map(([x, on]) => `<rect x="${x - 62}" y="${-WIN.h - 12}" width="124" height="${2 * WIN.h + 24}" rx="22" fill="none" stroke="${on ? GOLD : CC.bad}" stroke-width="${on ? 11 : 9}" stroke-dasharray="${on ? '30 16' : '14 14'}" stroke-dashoffset="${f1(-tn * 70)}" opacity="${f1(on ? pulse : 0.9)}"/>`).join('')}</g>`;
}
function sceneValid(tn) {
  const ap = clamp((tn - 32.8) / 0.5);
  let A_ = bgDark + gOp(card(540, 680, 0.72, { aC: 1, id: 'kv1', tn, rings: tn > 33.2 ? [[XC, true]] : null, border: CC.ok, bw: 10 }), ap) + gOp(card(540, 1080, 0.72, { id: 'kv2', border: CC.bad, bw: 10 }), ap);
  let U = pillAt(tn, 32.95, 36.6, ['TANPA C → TIDAK VALID'], 150, { bg: GOLD, fg: INK, size: 54 });
  U += tag(tn, 33.0, 36.7, ['ada garis C: tes berjalan  ✓'], 540, 800, { size: 38, bg: CC.ok, fg: '#fff' });
  U += tag(tn, 34.0, 36.7, ['tidak ada garis C: TIDAK VALID  ✕'], 540, 1200, { size: 38, bg: CC.bad, fg: '#fff' });
  // sorot lokasi C (kosong) saat "tidak valid"
  if (tn > 33.6 && tn < 36.4) { const k = 0.5 + 0.5 * Math.sin((tn - 33.6) * 6); A_ += `<g transform="${camT(1450, 0, 0.72, 540, 1080)}"><rect x="${XC - 64}" y="${-WIN.h - 10}" width="128" height="${2 * WIN.h + 20}" rx="22" fill="none" stroke="${GOLD}" stroke-width="12" stroke-dasharray="26 14" stroke-dashoffset="${f1(-tn * 80)}" opacity="${f1(k * 0.9 + 0.1)}"/></g>`; }
  return { A: A_, U };
}
// ================================================================ ADEGAN 9: tiga hasil (C+T, C saja, tanpa C)
function sceneResults(tn) {
  const ys = [480, 840, 1200], hi = tn < 40.0 ? 0 : 1, hl = (i) => (tn >= 36.6 && tn < 40.0 && i === 0) || (tn >= 40.0 && tn < 44.7 && i === 1);
  const defs = [{ aT: 1, aC: 1, id: 'r1', tn, rings: hl(0) ? [[XT, true], [XC, true]] : null }, { aT: 0, aC: 1, id: 'r2', tn, rings: hl(1) ? [[XT, false], [XC, true]] : null }, { aT: 0, aC: 0, id: 'r3', tn, rings: tn > 36.9 ? [[XC, false]] : null }];
  let A_ = bgDark;
  defs.forEach((d, i) => { const on = hl(i), dim = !on ? 0.82 : 1; A_ += `<g opacity="${dim}">${card(540, ys[i], 0.72, { ...d, border: on ? GOLD : 'rgba(255,255,255,.3)', bw: on ? 12 : 5 })}</g>`; });
  let U = pillAt(tn, 36.7, 44.7, ['TIGA HASIL'], 150, { bg: '#fff', fg: FOREST, size: 52 });
  const lab = (i, text, bg, a) => pill([text], 540, ys[i] + 118, { a, size: 38, bg, fg: '#fff' });
  U += lab(0, 'C + T  →  hCG TERDETEKSI', CC.ok, kw(tn, 37.0, 44.8, 0.3) * (hl(0) ? 1 : 0.6));
  U += lab(1, 'hanya C  →  BELUM TERDETEKSI', '#3F7FBF', kw(tn, 40.0, 44.8, 0.3) * (hl(1) ? 1 : 0.6));
  U += lab(2, 'tanpa C  →  TIDAK VALID', CC.bad, kw(tn, 36.8, 44.8, 0.3) * 0.7);
    return { A: A_, U };
}
// ================================================================ ADEGAN 10: tes terlalu dini (kadar hCG belum mencapai ambang) -> hasil bisa negatif
function sceneEarly(tn) {
  const X0 = 150, X1 = 930, Y0 = 820, Y1 = 380, th = 0.55, h = (u) => 0.04 + 0.96 * Math.pow(u, 2.6);
  const px = (u) => X0 + u * (X1 - X0), py = (v) => Y0 - v * (Y0 - Y1), prog = ease((tn - 45.2) / 3.4);
  let pts = ''; for (let i = 0; i <= 60; i++) { const u = i / 60 * prog; pts += `${i ? 'L' : 'M'}${f1(px(u))} ${f1(py(h(u)))}`; }
  const uE = 0.34, mk = clamp((tn - 45.6) / 0.5), pulse = 0.6 + 0.4 * Math.sin((tn - 45.6) * 6);
  let A_ = bgDark + R(90, 330, 900, 560, 'rgba(4,16,24,.7)', 36);
  A_ += `<path d="M${X0} ${Y1 - 20}V${Y0}H${X1 + 30}" stroke="#CFE8E2" stroke-width="6" fill="none" stroke-linecap="round"/>`;
  A_ += `<path d="M${X0} ${f1(py(th))}H${X1 + 20}" stroke="${GOLD}" stroke-width="7" stroke-dasharray="22 14"/>`;
  A_ += `<path d="${pts}" stroke="${CC.hcg}" stroke-width="12" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  if (prog > 0.02) { const u = prog, x = px(u), y = py(h(u)); A_ += hcg(x, y, 1.5, 0); }
  A_ += `<g opacity="${f1(mk * 100) / 100}"><path d="M${f1(px(uE))} ${f1(py(h(uE)))}V${Y0}" stroke="#fff" stroke-width="6" stroke-dasharray="10 10"/><circle cx="${f1(px(uE))}" cy="${f1(py(h(uE)))}" r="${f1(16 + 6 * pulse)}" fill="none" stroke="${CC.bad}" stroke-width="8"/></g>`;
  let U = pillAt(tn, 44.8, 50.3, ['TES TERLALU DINI', 'BISA NEGATIF'], 120, { bg: GOLD, fg: INK, size: 54 });
  U += T('kadar hCG di urine', 120, 372, { size: 30, fill: '#CFE8E2', anchor: 'start', w: 700 }) + T('waktu  →', 930, 868, { size: 30, fill: '#CFE8E2', anchor: 'end', w: 700 });
  U += T('batas yang bisa terbaca tes', 930, py(th) - 14, { size: 30, fill: GOLD, anchor: 'end', w: 700 });
  U += tag(tn, 45.9, 50.3, ['tes dilakukan di sini'], px(uE) + 20, 880, { size: 32, bg: '#fff' });
  U += tag(tn, 48.9, 50.3, ['negatif yang terlalu dini belum menyingkirkan kehamilan'], 540, 1305, { size: 30, bg: 'rgba(255,255,255,.92)' });
  U += tag(tn, 48.2, 50.3, ['belum cukup tinggi'], px(uE) + 190, py(h(uE)) - 120, { size: 32, bg: CC.bad, fg: '#fff' });
  // hasil pada saat itu: hanya C
  U += `<g opacity="${f1(clamp((tn - 46.2) / 0.5) * 100) / 100}"></g>`;
  const cardA = clamp((tn - 46.0) / 0.5);
  A_ += gOp(card(540, 1130, 0.72, { aC: 1, id: 'ke', tn, rings: tn > 46.3 ? [[XT, false], [XC, true]] : null, border: '#3F7FBF', bw: 8 }), cardA);
  U += gOp(pill(['C saja: hCG belum terbaca'], 540, 1248, { a: 1, size: 38, bg: '#3F7FBF', fg: '#fff' }), cardA);
  return { A: A_, U };
}
// ================================================================ ADEGAN 11: baca hasil sesuai petunjuk (Raka mengamati kemasan petunjuk; tanpa angka waktu)
function sceneRead(tn) {
  const a = clamp((tn - 50.2) / 0.5);
  const cx = 690, cy = 760; let A_ = bgDark;
  // kartu petunjuk (bukan kemasan merek tertentu): judul, baris teks, ikon jam tanpa angka
  const clk = `<g transform="translate(${cx} ${cy - 110})"><circle r="92" fill="#fff" stroke="${INK}" stroke-width="10"/><circle r="80" fill="#FFF5D6"/>${Array.from({ length: 12 }, (_, i) => `<path d="M0 -70V-${i % 3 ? 62 : 56}" stroke="${INK}" stroke-width="${i % 3 ? 4 : 7}" transform="rotate(${i * 30})"/>`).join('')}<path d="M0 0V-52" stroke="${INK}" stroke-width="9" stroke-linecap="round" transform="rotate(${f1(40 + (tn - 50.2) * 18)})"/><path d="M0 0V-38" stroke="${CC.line}" stroke-width="9" stroke-linecap="round" transform="rotate(${f1(-20 + (tn - 50.2) * 4)})"/><circle r="10" fill="${INK}"/></g>`;
  A_ += `<g opacity="${f1(a * 100) / 100}" transform="translate(0 ${f1((1 - ea(a)) * 40)})">${R(cx - 270, cy - 250, 540, 640, '#fff', 36, `stroke="${CC.ink}" stroke-width="8"`)}${R(cx - 270, cy - 250, 540, 70, FOREST, 36)}${R(cx - 270, cy - 215, 540, 35, FOREST, 0)}${T('PETUNJUK PENGGUNAAN', cx, cy - 200, { size: 32, fill: '#fff' })}${clk}${[0, 1, 2, 3, 4].map((i) => R(cx - 200, cy + 40 + i * 52, 400 - (i % 3) * 70, 18, '#CBD5DB', 9)).join('')}${R(cx - 200, cy + 300, 400, 54, CC.ok, 27)}${T('baca di waktu yang tertulis', cx, cy + 337, { size: 28, fill: '#fff' })}</g>`;
  let st = raka('senang', 'senang', { yaw: 0.25, tilt: 3 }); st = rIdle(st, tn);
  A_ += `<g opacity="${f1(a * 100) / 100}" transform="translate(${f1(250 - 200 * 0.86)} ${f1(560)}) scale(0.86)">${rakaSvg(st, { bare: true, shadow: false, uid: 'rkR', dark: true })}</g>`;
  const U = pillAt(tn, 50.25, 55, ['BACA SESUAI WAKTU', 'DI PETUNJUK KEMASAN'], 120, { bg: GOLD, fg: INK, size: 54 }) + tag(tn, 50.6, 55, ['ilustrasi prinsip: desain dan waktu baca tiap produk bisa berbeda'], 540, 1305, { size: 30, bg: 'rgba(255,255,255,.92)' });
  return { A: A_, U };
}
const ea = (x) => 1 - Math.pow(1 - clamp(x), 3);
export const cover = async () => {
  let st = raka('senang', null, { yaw: -0.15, tilt: -3 }); st = rIdle(st, 0.8);
  const world = plan({ front: 1840, aT: 1, aC: 1 });
  let A_ = `${bgDark}<g transform="${camT(1450, 0, 1.15, 540, 900)}">${world}</g>`;
  A_ += `<g transform="translate(${f1(150 - 200 * 0.6)} 1170) scale(0.6)">${rakaSvg(st, { bare: true, shadow: false, uid: 'rkC', dark: true })}</g>`;
  A_ += `<g>${R(300, 1330, 700, 260, '#F7F2E4', 40)}<image href="logo-full.webp" x="360" y="1350" width="580" height="${f1(580 * 160 / 794)}" preserveAspectRatio="xMidYMid meet"/>${R(380, 1470, 540, 96, FOREST, 48)}${T('medcoel.com', 650, 1540, { size: 60, fill: GOLD })}</g>`;
  const U = `${T('KENAPA TEST PACK', 540, 170, { size: 84, fill: '#fff', w: 800, e: 'stroke="#0A2B34" stroke-width="10" paint-order="stroke"' })}${T('BISA DUA GARIS?', 540, 270, { size: 96, fill: GOLD, w: 800, e: 'stroke="#0A2B34" stroke-width="10" paint-order="stroke"' })}${pill(['T = garis tes · C = garis kontrol'], 540, 1100, { size: 36, bg: '#fff', fg: FOREST })}`;
  return { A: A_, U };
};
const SCENES = [[-9, sceneHook], [A.saat - 0.02, sceneFlow], [8.66, sceneMicro], [24.4, scenePlanT], [28.88, sceneMicroC], [30.5, scenePlanT], [32.9, sceneValid], [36.6, sceneResults], [44.7, sceneEarly], [50.2, sceneRead]];
export async function frame(t) {
  const tn = t - OFF; let i = 0; for (let k = 0; k < SCENES.length; k++) if (tn >= SCENES[k][0]) i = k;
  const s = SCENES[i][1](tn); let A_ = s.A, U = s.U; const fd = 0.4, k = i > 0 ? clamp((tn - SCENES[i][0]) / fd) : 1;
  if (k < 1) { const p = SCENES[i - 1][1](tn), e = ease(k); A_ = p.A + `<g opacity="${f1(e * 100) / 100}">${s.A}</g>`; U = `<g opacity="${f1((1 - e) * 100) / 100}">${p.U}</g><g opacity="${f1(e * 100) / 100}">${s.U}</g>`; }
  return { A: A_, U: U + captions(tn) };
}

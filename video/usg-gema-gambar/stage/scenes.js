// Semua adegan edukasi. frame(t) -> { A, U, bm, web }: A = dunia SVG (gambar), U = teks/label, bm = permintaan citra B-mode (kanvas), web = rekaman asli (kanvas).
// Waktu narasi tn = t - OFF; semua kata kunci dari ASR (timeline.js). Orientasi penampang SELALU: probe di atas, kulit di y = 0, kedalaman ke bawah; pulsa keluar = emas, ke bawah; gema = sian, ke atas.
import { f1, clamp, lerp, R, C, P, T, COL, INK, GOLD, MC, FONT, FOREST, seg, win, eo, eio, sm, pill, pop, rndf, tw } from './lib.js';
import { raka, rakaSvg, lerpState, rIdle } from './raka.js';
import { SHAPES, TIS, sectionSvg, probeSvg, tissueAt, bSkin } from './body.js';
import * as TL from './timeline.js';
export const A = TL.A, OFF = TL.OFF;
export const camT = (cx, cy, z, sx = 540, sy = 880) => `translate(${f1(sx - cx * z)} ${f1(sy - cy * z)}) scale(${f1(z * 1000) / 1000})`;
export const kw = (tn, t0, t1, f = 0.22) => clamp((tn - t0) / f) * clamp((t1 - tn) / f);
export const gOp = (svg, a) => `<g opacity="${f1(clamp(a) * 100) / 100}">${svg}</g>`;
export const lerpK = (keys, x) => { if (x <= keys[0][0]) return keys[0].slice(1); for (let i = 0; i + 1 < keys.length; i++) if (x <= keys[i + 1][0]) { const u = sm((x - keys[i][0]) / (keys[i + 1][0] - keys[i][0])); return keys[i].slice(1).map((v, j) => lerp(v, keys[i + 1][j + 1], u)); } return keys[keys.length - 1].slice(1); };
const wrap = (s, size, maxW) => { const words = s.split(' '), lines = []; let cur = ''; for (const w of words) { const t = cur ? cur + ' ' + w : w; if (cur && tw(t, size) > maxW) { lines.push(cur); cur = w; } else cur = t; } if (cur) lines.push(cur); return lines; };
export function captions(tn, list = TL.KAL, y = 1345) {
  const c = list.find(([a, b]) => tn >= a - 0.02 && tn <= b + 0.12); if (!c) return '';
  const size = 48, lines = wrap(c[2], size, 840), a = clamp((tn - c[0] + 0.02) / 0.15) * clamp((c[1] + 0.12 - tn) / 0.12 + 0.2), lh = size * 1.22, h = lines.length * lh + 30;
  return `<g opacity="${f1(a * 100) / 100}">${R(90, y + 6, 900, h, 'rgba(0,0,0,.28)', 34)}${R(90, y, 900, h, 'rgba(8,16,28,.92)', 34)}${lines.map((l, i) => T(l, 540, y + 14 + size * 0.88 + i * lh, { size, fill: '#fff', w: 800 })).join('')}</g>`;
}
export const pillAt = (tn, t0, t1, lines, y, o = {}) => { const k = kw(tn, t0, t1, 0.3); return k > 0.01 ? pill(lines, o.cx ?? 540, y + (1 - eo(clamp((tn - t0) / 0.35))) * -44, { a: k, size: o.size ?? 52, bg: o.bg, fg: o.fg }) : ''; };
export const bgDark = `<defs><linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1B6075"/><stop offset="1" stop-color="#0A2B34"/></linearGradient></defs>${R(-1000, -1000, 4000, 5000, 'url(#g2)')}`;
export const TAG = 'Ilustrasi cara kerja USG · bukan citra pasien';
// ================================================================ jenis gelombang (vektor): pulsa keluar (emas, ke bawah) dan gema (sian, ke atas)
/** tiga busur gelombang pada pusat (x, y) lebar w; dir = +1 (ke bawah) | -1 (ke atas); amp 0..1 menentukan tebal dan kepekatan; ang = sudut (derajat) arah rambat dari vertikal */
export function waveArcs(x, y, w, dir, amp, col, ang = 0, ks = 1) {
  if (amp < 0.02) return '';
  const R_ = 420; let s = '';
  for (let k = 0; k < 3; k++) {
    const yy = y - dir * k * 17 * ks, a = (1 - k * 0.22) * amp, half = w / 2, sag = dir * (R_ - Math.sqrt(R_ * R_ - half * half));
    s += `<path d="M${f1(-half)} ${f1(-sag)} Q 0 ${f1(sag * 0.2 + sag)} ${f1(half)} ${f1(-sag)}" transform="translate(${f1(x)} ${f1(yy)}) rotate(${f1(ang)})" fill="none" stroke="${INK}" stroke-width="${f1((15 * a + 4) * ks)}" stroke-linecap="round" opacity="${f1(0.4 * a * 100) / 100}"/>`
      + `<path d="M${f1(-half)} ${f1(-sag)} Q 0 ${f1(sag * 0.2 + sag)} ${f1(half)} ${f1(-sag)}" transform="translate(${f1(x)} ${f1(yy)}) rotate(${f1(ang)})" fill="none" stroke="${col}" stroke-width="${f1((10 * a + 2) * ks)}" stroke-linecap="round" opacity="${f1(clamp(a + 0.15) * 100) / 100}"/>`;
  }
  return s;
}
export const OUTC = '#FFC93C', ECHC = '#4FE3FF';    // pulsa keluar (emas), gema kembali (sian): warna dan arah berbeda

// ================================================================ model blok (adegan gel, pulsa, gema): kulit, jaringan lunak, organ A, organ B
const BM = { y1: 170, y2: 340 };
const ys = (x) => 5 * Math.sin(x / 14) + 2.6 * Math.sin(x / 5.5);                 // permukaan kulit (kasar pada skala mikro)
const yf = (x) => -4 + 6 * Math.sin(x / 17 + 1) + 3 * Math.sin(x / 6);             // dasar lensa probe (kasar); rata-rata menempel pada kulit
const FW = 80;                                                                    // setengah lebar muka probe (satuan dunia)
function pathX(f, x0, x1, step = 2) { let d = ''; for (let x = x0; x <= x1; x += step) d += `${x === x0 ? 'M' : 'L'}${x} ${f1(f(x))}`; return d; }
function blockSvg(x0 = -700, x1 = 700, ybot = 760) {
  return `<rect x="${x0}" y="0" width="${x1 - x0}" height="${ybot}" fill="#C5B2E8"/><rect x="${x0}" y="0" width="${x1 - x0}" height="${BM.y2}" fill="#9CC4EA"/><rect x="${x0}" y="0" width="${x1 - x0}" height="${BM.y1}" fill="#F4C6BC"/>`
    + `<path d="${pathX((x) => 24 + ys(x) * 0.4, x0, x1, 10)}L${x1} 0L${x0} 0Z" fill="#F0B596"/><path d="${pathX(ys, x0, x1, 4)}L${x1} -40L${x0} -40Z" fill="none"/>`;
}
const T_GAP = (x) => yf(x) < ys(x);
/** gel di antara lensa dan kulit (film tipis) sampai jari-jari front gelR; udara = kantong sisa di luar front */
function contactSvg(gelR, airA, zoomMicro) {
  const xs = []; for (let x = -FW; x <= FW; x += 2) xs.push(x);
  let gel = '', air = '';
  // film gel: luas antara lensa (yf) dan kulit (ys) sepanjang |x| <= gelR + lapisan tipis 3 px di atasnya di zona gel
  const gelPath = (xa, xb) => { let top = '', bot = ''; for (let x = xa; x <= xb; x += 2) { top += `${x === xa ? 'M' : 'L'}${x} ${f1(Math.min(yf(x), ys(x)) - 1.2)}`; bot = `L${x} ${f1(Math.max(ys(x), yf(x)) + 0.4)}` + bot; } return top + bot + 'Z'; };
  if (gelR > 0.5) gel = `<path d="${gelPath(-Math.min(FW, gelR), Math.min(FW, gelR))}" fill="#46D4E6" opacity=".92"/><path d="${gelPath(-Math.min(FW, gelR), Math.min(FW, gelR))}" fill="none" stroke="#B8F6FF" stroke-width=".8"/>`;
  // kantong udara: rongga di mana lensa terangkat dari kulit (yf < ys - 0.3) pada |x| > gelR
  let seg_ = null; const pockets = [];
  for (let x = -FW; x <= FW; x += 1) { const g = (ys(x) - yf(x)) > 0.35 && Math.abs(x) > gelR; if (g && !seg_) seg_ = x; if ((!g || x === FW) && seg_ !== null) { if (x - seg_ >= 2) pockets.push([seg_, x]); seg_ = null; } }
  for (const [a, b] of pockets) { let top = '', bot = ''; for (let x = a; x <= b; x += 1) { top += `${x === a ? 'M' : 'L'}${x} ${f1(yf(x))}`; bot = `L${x} ${f1(ys(x))}` + bot; } air += `<path d="${top}${bot}Z" fill="#F4F7F8" opacity="${f1(airA * 100) / 100}" stroke="#9AA9B2" stroke-width=".5"/>`; }
  return gel + air;
}
function macroProbe(extra = '') { return `<g transform="translate(0 -2)">${probeSvg({ w: 160, glow: 0 })}</g>${extra}`; }
// ================================================================ ADEGAN 3: gel
function sceneGel(tn) {
  const gelR = 110 * eo(clamp((tn - A.gel) / 1.9)), airA = 1;
  const camK = [[8.0, 0, -6, 5.2], [13.2, 0, -6, 5.2], [14.7, 0, 190, 2.3]];
  const [cx, cy, z] = lerpK(camK, tn);
  const micro = clamp((z - 2.5) / 1.5);
  const face = `<path d="${pathX(yf, -FW, FW, 2)}L${FW} -26L${-FW} -26Z" fill="#9FE3D8" stroke="${INK}" stroke-width="${f1(2.4 * Math.max(0.5, 2.3 / z) * 0.5)}"/>`;
  const skin = `<path d="${pathX(ys, -160, 160, 2)}L160 70L-160 70Z" fill="#F0B596" stroke="#C98A6E" stroke-width=".8"/><path d="M-160 26L160 26L160 70L-160 70Z" fill="#F7E1A8" opacity=".9"/>`;
  let w = '';
  // gelombang: sebelum gel -> terhalang udara; sesudah gel -> lewat
  const pass = seg(tn, A.lewat - 0.2, A.lewat + 0.6);
  const tt = tn - 8.5; const prog = (tt * 40) % 70, ks = 2.3 / z;           // gelombang berulang, bergerak ke bawah dari muka probe
  if (tn > 8.5 && tn < 13.6) {
    const blocked = 1 - pass;
    for (let k = 0; k < 2; k++) { const yy = ((prog + k * 35) % 70) - 14; w += waveArcs(0, yy, 2 * FW - 10, 1, clamp(0.9 * (yy < 6 ? 1 : pass)), OUTC, 0, ks); }
    if (pass < 0.99) for (const [a, b] of [[-62, -40], [-8, 12], [38, 60]]) w += `<g opacity="${f1(blocked * 0.9)}"><path d="M${a} ${f1(ys(a) - 3)}L${b} ${f1(ys(b) + 3)}M${a} ${f1(ys(a) + 3)}L${b} ${f1(ys(b) - 3)}" stroke="#E8433A" stroke-width="${f1(2.4 * ks)}" stroke-linecap="round"/></g>`;
  }
  const wave2 = tn > A.lewat ? `<g clip-path="url(#cg)">${waveArcs(0, ((tn - A.lewat) * 40) % 150 + 20, 2 * FW - 10, 1, 0.8 * pass, OUTC, 0, ks)}</g>` : '';
  const dot = (x, y) => `<circle cx="${x}" cy="${y}" r="0.9" fill="#fff"/>`;
  let airDots = ''; for (let i = 0; i < 14; i++) { const x = -FW + 6 + i * 11, y = (ys(x) + yf(x)) / 2; if (Math.abs(x) > gelR && ys(x) - yf(x) > 0.5) airDots += dot(x, y); }
  const macro = blockSvg(-700, 700, 760) + `<g opacity="${f1(1 - micro * 0.0)}">` + `</g>`;
  const A_ = `${bgDark}<defs><clipPath id="cg"><rect x="-90" y="2" width="180" height="170"/></clipPath></defs><g transform="${camT(cx, cy, z)}">${macro}${skin}${contactSvg(gelR, airA, micro)}${airDots}${face}${macroProbeBody()}${w}${wave2}</g>`;
  let U = pillAt(tn, A.pertama - 0.1, A.gel - 0.1, ['Probe menempel di kulit'], 250, { bg: '#fff' });
  U += pillAt(tn, A.gel - 0.1, A.udara + 0.4, ['GEL MEMBANTU SUARA MASUK'], 250, { bg: GOLD, fg: INK, size: 52 });
  // label udara / gel
  const kair = kw(tn, 8.5, A.gel + 0.6, 0.3), kgel = kw(tn, A.gel + 1.0, A.udara + 0.5, 0.3), p = (x, y) => [540 + (x - cx) * z, 880 + (y - cy) * z];
  if (kair > 0.01 && micro > 0.3) { const [ax, ay] = p(-62, -1); U += pill(['celah udara', 'menahan suara'], 270, 1030, { a: kair * micro, size: 40, bg: '#fff' }); U += `<path d="M300 1015L${f1(ax)} ${f1(ay + 8)}" stroke="${GOLD}" stroke-width="5" opacity="${f1(kair * micro * 0.9)}"/>`; }
  if (kgel > 0.01 && micro > 0.3) { U += pill(['gel mengisi celah', 'suara lewat'], 810, 1030, { a: kgel * micro, size: 40, bg: '#46D4E6', fg: INK }); const [gx, gy] = p(40, 0); U += `<path d="M790 1015L${f1(gx)} ${f1(gy + 8)}" stroke="${GOLD}" stroke-width="5" opacity="${f1(kgel * micro * 0.9)}"/>`; }
  return { A: A_, U };
}
function macroProbeBody() { return `<path d="M${-FW + 6} -26 L${-FW + 22} -140 L${FW - 22} -140 L${FW - 6} -26 Z" fill="#3E74A6" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/><rect x="${-FW + 28}" y="-96" width="${2 * FW - 56}" height="10" rx="5" fill="#00A383"/><path d="M${-FW + 22} -140 L${-FW + 36} -250 L${FW - 36} -250 L${FW - 22} -140 Z" fill="#2F5C88" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/><path d="M0 -250 C 10 -310, 150 -310, 160 -410" fill="none" stroke="${INK}" stroke-width="14" stroke-linecap="round"/><path d="M0 -250 C 10 -310, 150 -310, 160 -410" fill="none" stroke="#3A4F66" stroke-width="7" stroke-linecap="round"/>`; }

// ================================================================ ADEGAN 4: SATU pulsa -> batas -> gema -> probe menangkap (lalu beberapa pulsa)
const blockWorldSvg = (extra = '') => `${blockSvg(-700, 700, 760)}<path d="${pathX(yf, -FW, FW, 2)}L${FW} -26L${-FW} -26Z" fill="#9FE3D8" stroke="${INK}" stroke-width="2.4"/>${contactSvg(110, 1, 0)}${macroProbeBody()}${extra}`;
const bLines = (a1 = 1, a2 = 1, x0 = -330, x1 = 330) => `<g stroke="#fff" stroke-width="3" stroke-dasharray="10 9" stroke-linecap="round"><path d="M${x0} ${BM.y1}H${x1}" opacity="${f1(a1 * 0.8)}"/><path d="M${x0} ${BM.y2}H${x1}" opacity="${f1(a2 * 0.8)}"/></g>`;
const scr = (cam, x, y) => [cam.sx + (x - cam.cx) * cam.z, cam.sy + (y - cam.cy) * cam.z];
export const glowPulse = (tn, t0, dur = 1.6) => { const u = (tn - t0) / dur; return u < 0 || u > 1 ? 0 : Math.sin(Math.PI * clamp(u * 1.2)) ** 0.7; };
function waveField(tn, te, v, hits, ks, ang = 0, xo = 0) {
  // hits: [{y, tr (amp transmisi), re (amp gema)}] berurutan; mengembalikan gambar pulsa keluar + gema, dan waktu-waktu tiba gema di probe
  let s = ''; const arr = [];
  const dir = (a) => [Math.sin(a * Math.PI / 180), Math.cos(a * Math.PI / 180)];
  const [dx, dy] = dir(ang);
  let amp = 1, ytrav = v * (tn - te);
  // pulsa keluar: berhenti digambar setelah melewati batas terakhir + 90
  const yLast = hits.length ? hits[hits.length - 1].y : 1e9;
  let a = 1; for (const h of hits) if (ytrav > h.y) a *= h.tr;
  if (tn > te && ytrav > 0 && ytrav < yLast + 90) { const fade = hits.length && ytrav > yLast ? 1 - (ytrav - yLast) / 90 : 1; s += waveArcs(xo + dx * ytrav, dy * ytrav, 130, 1, a * fade, OUTC, ang, ks); }
  // gema dari tiap batas
  let aIn = 1;
  for (const h of hits) {
    const tHit = te + h.y / v, tArr = tHit + h.y / v, ye = h.y - v * (tn - tHit);
    arr.push(tArr);
    if (tn > tHit && ye > -20) s += waveArcs(xo + dx * Math.max(ye, 0), dy * Math.max(ye, 0), 130, -1, aIn * h.re * clamp(ye / 20 + 1), ECHC, ang, ks);
    aIn *= h.tr;
  }
  return { s, arr };
}
function sceneEcho(tn) {
  const cyF = lerp(150, 235, eio(clamp((tn - 15.4) / 2.5))) - 0 * tn;
  const cyB = tn > 18.6 ? lerp(235, 150, eio(clamp((tn - 18.6) / 2.4))) : cyF;
  const cam = { cx: 0, cy: cyB, z: 2.3, sx: 540, sy: 880 }, ks = 1;
  const te = A.mengirim, v = 60, hits = [{ y: BM.y1, tr: 0.55, re: 0.5 }];
  const wf = waveField(tn, te, v, hits, ks);
  const tArr = te + 2 * BM.y1 / v, glow = Math.max(glowPulse(tn, tArr, 2.0), kw(tn, A.menangkap, 24.6, 0.4));
  // beberapa pulsa lain (sudut berbeda), setelah siklus tunggal dipahami
  let multi = ''; if (tn > 23.2) for (const [ang, t0] of [[0, 23.25], [-26, 23.7], [26, 24.15]]) { const d = 60 * (tn - t0); if (d > 0 && d < 150) multi += waveArcs(Math.sin(ang * Math.PI / 180) * d, Math.cos(ang * Math.PI / 180) * d, 120, 1, 0.9, OUTC, ang, ks); }
  const probe = `${macroProbeBody()}${glow > 0.02 ? `<path d="M${-FW - 6} -28 L${-FW + 8} -150 L${FW - 8} -150 L${FW + 6} -28 Z" fill="none" stroke="#fff" stroke-width="${f1(7 * glow)}" opacity="${f1(glow)}" stroke-linejoin="round"/>` : ''}`;
  const world = `${blockSvg(-700, 700, 760)}<path d="${pathX(yf, -FW, FW, 2)}L${FW} -26L${-FW} -26Z" fill="#9FE3D8" stroke="${INK}" stroke-width="2.4"/>${contactSvg(110, 1, 0)}${bLines(clamp((tn - 17.0) * 2), 0.0)}${probe}${wf.s}${multi}`;
  const A_ = `${bgDark}<g transform="${camT(cam.cx, cam.cy, cam.z)}">${world}</g>`;
  let U = '';
  U += pillAt(tn, A.probeKirim - 0.1, 24.95, ['PULSA → GEMA'], 250, { bg: GOLD, fg: INK, size: 60 });
  const P_ = (x, y) => scr(cam, x, y);
  const yp = v * (tn - te), kPulse = kw(tn, 15.4, A.ketika, 0.3);
  if (kPulse > 0.01) { const [px, py] = P_(70, Math.max(yp, 10)); U += pill(['pulsa keluar'], 800, clamp(py - 20, 520, 1150), { a: kPulse, size: 40, bg: OUTC, fg: INK }); }
  const kb = kw(tn, A.bertemu - 0.2, 20.6, 0.3); if (kb > 0.01) { const [bx, by] = P_(150, BM.y1); U += pill(['batas antarjaringan'], 800, clamp(by + 70, 520, 1200), { a: kb, size: 40, bg: '#fff' }); U += `<path d="M740 ${f1(clamp(by + 70, 520, 1200) + 12)}L${f1(bx)} ${f1(by + 4)}" stroke="${GOLD}" stroke-width="5" opacity="${f1(kb * 0.9)}"/>`; }
  const ke = kw(tn, A.sebagian, 22.9, 0.3); if (ke > 0.01) { const ye = BM.y1 - v * (tn - (te + BM.y1 / v)); const [ex, ey] = P_(-70, clamp(ye, 30, BM.y1)); U += pill(['sebagian jadi gema'], 270, clamp(ey + 40, 560, 1200), { a: ke, size: 40, bg: ECHC, fg: INK }); }
  const kc = kw(tn, A.menangkap, 24.9, 0.3); if (kc > 0.01) { const [qx, qy] = P_(0, -100); U += pill(['probe yang sama', 'menangkap gema'], 540, 700, { a: kc, size: 42, bg: '#fff' }); }
  const km = kw(tn, 23.25, 24.95, 0.25); if (km > 0.01) U += pill(['lalu beberapa pulsa lain'], 540, 1090, { a: km, size: 40, bg: '#fff' });
  // legenda arah
  U += `<g>${R(60, 1236, 960, 74, 'rgba(8,18,30,.82)', 24)}<path d="M110 1258v32M96 1276l14 16l14 -16" stroke="${OUTC}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>${T('pulsa keluar (ke bawah)', 160, 1286, { size: 32, fill: '#fff', anchor: 'start', w: 700 })}<path d="M560 1292v-32M546 1274l14 -16l14 16" stroke="${ECHC}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>${T('gema kembali (ke atas)', 610, 1286, { size: 32, fill: '#fff', anchor: 'start', w: 700 })}</g>`;
  U += `<g>${R(60, 1190, 540, 38, 'rgba(0,0,0,0)', 0)}</g>`;
  return { A: A_, U };
}

// ================================================================ ADEGAN 5: dekat vs dalam: waktu gema = kedalaman (layar terbagi: penampang di atas, hasil di bawah)
const PANEL = { y0: 330, y1: 885 };
const clipTop = `<clipPath id="tp"><rect x="0" y="${PANEL.y0}" width="1080" height="${PANEL.y1 - PANEL.y0}"/></clipPath>`;
const resultFrame = (title) => `${R(40, 900, 1000, 425, '#050B0D', 30, 'stroke="rgba(255,255,255,.18)" stroke-width="3"')}${T(title, 70, 942, { size: 28, fill: '#9DE0BD', anchor: 'start', w: 800 })}`;
function sceneNearDeep(tn) {
  const cam = { cx: 0, cy: 140, z: 1.25, sx: 540, sy: 605 }, ks = 2.3 / cam.z, te = 24.9, v = 130;
  const hits = [{ y: BM.y1, tr: 0.6, re: 0.6 }, { y: BM.y2, tr: 0, re: 0.3 }], wf = waveField(tn, te, v, hits, ks);
  const [t1, t2] = wf.arr, glow = Math.max(glowPulse(tn, t1, 1.2), glowPulse(tn, t2, 1.2));
  const probe = `${macroProbeBody()}${glow > 0.02 ? `<path d="M${-FW - 6} -28 L${-FW + 8} -150 L${FW - 8} -150 L${FW + 6} -28 Z" fill="none" stroke="#fff" stroke-width="${f1(7 * glow)}" opacity="${f1(glow)}" stroke-linejoin="round"/>` : ''}`;
  const world = `${blockSvg(-700, 700, 760)}<path d="${pathX(yf, -FW, FW, 2)}L${FW} -26L${-FW} -26Z" fill="#9FE3D8" stroke="${INK}" stroke-width="2.4"/>${contactSvg(110, 1, 0)}${bLines(1, 1, -420, 420)}${probe}${wf.s}`;
  let A_ = `${bgDark}<defs>${clipTop}</defs><g clip-path="url(#tp)"><g transform="${camT(cam.cx, cam.cy, cam.z, cam.sx, cam.sy)}">${world}</g></g>${R(0, PANEL.y0 - 4, 1080, 4, 'rgba(255,255,255,.25)')}${R(0, PANEL.y1, 1080, 4, 'rgba(255,255,255,.25)')}`;
  // hasil: satu garis pemindaian (kedalaman ke bawah, sama dengan penampang)
  const Y = (d) => 975 + d * 0.93, X0 = 250, kd1 = clamp((tn - t1) / 0.3), kd2 = clamp((tn - t2) / 0.3);
  A_ += resultFrame('Hasil USG: satu garis pemindaian');
  A_ += `<path d="M${X0} 960V1300" stroke="rgba(255,255,255,.25)" stroke-width="3" stroke-dasharray="4 8"/><path d="M${X0 - 18} 962l18 -14l18 14" fill="none" stroke="${GOLD}" stroke-width="0"/>`;
  A_ += `${T('dangkal', 66, 990, { size: 26, fill: '#CFE8E2', anchor: 'start', w: 700 })}${T('dalam', 66, 1296, { size: 26, fill: '#CFE8E2', anchor: 'start', w: 700 })}<path d="M130 1004V1270M118 1256l12 16l12 -16" stroke="#CFE8E2" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".7"/>`;
  if (kd1 > 0) A_ += `<g transform="translate(${X0} ${f1(Y(BM.y1))}) scale(${f1(0.4 + 0.6 * eo(kd1))})"><circle r="34" fill="#FFFFFF" opacity=".25"/><circle r="22" fill="#FFFFFF"/></g>`;
  if (kd2 > 0) A_ += `<g transform="translate(${X0} ${f1(Y(BM.y2))}) scale(${f1(0.4 + 0.6 * eo(kd2))})"><circle r="26" fill="#9AA6AE" opacity=".3"/><circle r="16" fill="#9AA6AE"/></g>`;
  // penghitung waktu: batang tumbuh sejak pulsa berangkat sampai gema tiba (panjang batang = waktu tempuh)
  const T1 = t1 - te, T2 = t2 - te, e = tn - te, SC = 78;
  const bar = (y, Tm, lab, col) => `${T(lab, 590, y + 8, { size: 26, fill: '#fff', anchor: 'end', w: 800 })}${R(610, y - 12, 410, 24, 'rgba(255,255,255,.1)', 12)}${R(610, y - 12, f1(clamp(e, 0, Tm) * 78), 24, col, 12)}`;
  if (tn > te) { A_ += bar(1005, T1, 'waktu gema dekat', ECHC) + bar(1045, T2, 'waktu gema dalam', ECHC); }
  let U = '';
  U += pillAt(tn, 24.9, 27.2, ['PULSA → GEMA'], 250, { bg: GOLD, fg: INK, size: 56 });
  U += pillAt(tn, 27.25, 31.4, ['WAKTU GEMA = KEDALAMAN'], 150, { bg: GOLD, fg: INK, size: 52 });
  const k1 = kw(tn, t1 - 0.1, 31.0, 0.3), k2 = kw(tn, t2 - 0.1, 31.0, 0.3);
  if (k1 > 0.01) U += pill(['gema cepat, dangkal', 'kuat → terang'], 640, Y(BM.y1) - 22, { a: k1, size: 30, bg: '#fff' });
  if (k2 > 0.01) U += pill(['gema lambat, dalam', 'lemah → redup'], 640, Y(BM.y2) - 40, { a: k2, size: 30, bg: '#fff' });
  const [bx1, by1] = scr(cam, 330, BM.y1), [bx2, by2] = scr(cam, 330, BM.y2);
  const kl = kw(tn, 25.2, 31.2, 0.3);
  U += `<g opacity="${f1(kl)}">${T('batas dekat', clamp(bx1, 100, 1000), by1 - 12, { size: 28, fill: '#fff', anchor: 'end', w: 800 })}${T('batas dalam', clamp(bx2, 100, 1000), by2 - 12, { size: 28, fill: '#fff', anchor: 'end', w: 800 })}</g>`;
  U += `<g>${R(60, 840, 960, 36, 'rgba(8,18,30,.0)', 0)}</g>`;
  U += T(TAG, 540, PANEL.y0 - 16, { size: 24, fill: '#CFE8E2', w: 700 });
  return { A: A_, U };
}

// ================================================================ ADEGAN 6 - 7: banyak garis -> gambar; probe digeser/dimiringkan -> bidang dan gambar berubah BERSAMAAN
const HALF = 40, DEPTH = 560, IMG = { x: 280, y: 925, w: 520, h: 380 };
const wedgePath = (px, tilt, r = DEPTH, half = HALF) => { const a1 = (tilt - half) * Math.PI / 180, a2 = (tilt + half) * Math.PI / 180; return `M${f1(px)} 0L${f1(px + r * Math.sin(a1))} ${f1(r * Math.cos(a1))}A${r} ${r} 0 0 0 ${f1(px + r * Math.sin(a2))} ${f1(r * Math.cos(a2))}Z`; };
const sliceProbe = (px, tilt, glow = 0) => `<g transform="translate(${f1(px)} 0) rotate(${f1(tilt)})"><path d="M${-FW} -26 L${FW} -26 L${FW} 0 L${-FW} 0 Z" fill="#9FE3D8" stroke="${INK}" stroke-width="3"/>${macroProbeBody()}</g>`;
function sliceWorld(px, tilt, extra = '', alphaWedge = 0.22) {
  return `${sectionSvg(-760, 760, 640)}<path d="${wedgePath(px, tilt)}" fill="#FFC93C" opacity="${alphaWedge}"/><path d="${wedgePath(px, tilt)}" fill="none" stroke="#FFC93C" stroke-width="3" stroke-dasharray="10 8" stroke-linejoin="round"/>${extra}${sliceProbe(px, tilt)}`;
}
const resultSector = (title, extraSvg = '') => `${resultFrame(title)}<g fill="none" stroke="rgba(255,255,255,.16)" stroke-width="2">${[0.25, 0.5, 0.75, 1].map((k) => { const r = IMG.h * k, a = HALF * Math.PI / 180; return `<path d="M${f1(540 - r * Math.sin(a))} ${f1(IMG.y + r * Math.cos(a))}A${f1(r)} ${f1(r)} 0 0 0 ${f1(540 + r * Math.sin(a))} ${f1(IMG.y + r * Math.cos(a))}"/>`; }).join('')}</g>${T('dangkal', 70, IMG.y + 66, { size: 26, fill: '#CFE8E2', anchor: 'start', w: 700 })}${T('dalam', 70, IMG.y + IMG.h - 4, { size: 26, fill: '#CFE8E2', anchor: 'start', w: 700 })}<path d="M130 ${IMG.y + 80}V${IMG.y + IMG.h - 30}M118 ${IMG.y + IMG.h - 44}l12 16l12 -16" stroke="#CFE8E2" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".7"/>${extraSvg}`;
const camSlice = (z = 0.8) => ({ cx: 0, cy: 218.75, z, sx: 540, sy: 605 });
function topPanel(world, cam) { return `${bgDark}<defs>${clipTop}</defs><g clip-path="url(#tp)"><g transform="${camT(cam.cx, cam.cy, cam.z, cam.sx, cam.sy)}">${world}</g></g>${R(0, PANEL.y0 - 4, 1080, 4, 'rgba(255,255,255,.25)')}${R(0, PANEL.y1, 1080, 4, 'rgba(255,255,255,.25)')}`; }
function sceneBuild(tn) {
  const cam = camSlice(0.8), u = clamp((tn - 31.75) / 3.6), th = (-HALF + 2 * HALF * u) * Math.PI / 180, done = tn >= 35.45;
  const d = DEPTH * ((tn * 6.2) % 1), phi = th, bx = Math.sin(phi), by = Math.cos(phi);
  let beam = '';
  if (!done && tn > 31.7) beam = `<path d="M0 0L${f1(DEPTH * bx)} ${f1(DEPTH * by)}" stroke="#FFC93C" stroke-width="4" opacity=".9"/><circle cx="${f1(d * bx)}" cy="${f1(d * by)}" r="11" fill="#FFC93C" stroke="${INK}" stroke-width="3"/>`;
  const world = sliceWorld(0, 0, beam, done ? 0.14 : 0.2);
  const A_ = topPanel(world, cam) + resultSector('Citra: garis demi garis');
  const reveal = done ? null : { theta: th, r: d };
  const bm = [{ dst: { x: IMG.x, y: IMG.y, w: IMG.w, h: IMG.h }, pose: { px: 0, tilt: 0 }, o: { reveal, half: HALF, depth: DEPTH, step: 2 }, alpha: clamp((tn - 31.6) / 0.2) }];
  let U = pillAt(tn, A.mesin - 0.1, 36.5, ['BANYAK GARIS → SATU GAMBAR'], 150, { bg: GOLD, fg: INK, size: 52 }) + T(TAG, 540, PANEL.y0 - 16, { size: 24, fill: '#CFE8E2', w: 700 });
  return { A: A_, U, bm };
}
function sceneSlide(tn) {
  const [px, tilt] = lerpK([[36.5, 0, 0], [39.0, -260, 0], [40.4, -150, 14], [42.0, 80, -8], [43.8, 260, -14], [46.6, 120, 8]], tn);
  const z = lerp(0.95, 0.8, eio(clamp((tn - 36.6) / 1.4))), cam = camSlice(z);
  const world = sliceWorld(px, tilt);
  const A_ = topPanel(world, cam) + resultSector('Citra: bidang yang dipindai');
  const bm = [{ dst: { x: IMG.x, y: IMG.y, w: IMG.w, h: IMG.h }, pose: { px, tilt }, o: { half: HALF, depth: DEPTH, step: 2 } }];
  let U = pillAt(tn, A.digeserLagi, A.maka - 0.05, ['GESER · MIRING', '= BIDANG BERUBAH'], 150, { bg: GOLD, fg: INK, size: 50 }) + pillAt(tn, A.maka - 0.05, 43.9, ['GAMBAR IKUT BERUBAH'], 150, { bg: '#fff', size: 52 }) + pillAt(tn, A.jadi - 0.05, 46.5, ['BUKAN KAMERA'], 150, { bg: '#fff', size: 56 });
  U += T(TAG, 540, PANEL.y0 - 16, { size: 24, fill: '#CFE8E2', w: 700 });
  return { A: A_, U, bm };
}

// ================================================================ ADEGAN 1 dan 8: rekaman ASLI Live 4D Lab (kanvas pasien 3D + kanvas monitor USG), potongan sama
const SIMLAB = 'Simulasi edukatif, bukan alat diagnosis';
const P3 = { sx: 40, sy: 80, sw: 702, sh: 331, x: 0, y: 250, w: 1080, h: 510 };
const PU = { x: 150, y: 790, w: 780, h: 612, sx: 0, sy: 0, sw: 759, sh: 596, dx: 0, dy: 0, dw: 780, dh: 612 };
const webFrames = (take, idx, a = 1) => [{ kind: 'lab', take, idx, alpha: a, p3: P3, pu: PU, clip: null }];
const webFrame = (a, tag) => `<g opacity="${f1(a * 100) / 100}">${R(0, P3.y - 3, 1080, 3, 'rgba(255,255,255,.55)')}${R(0, P3.y + P3.h, 1080, 3, 'rgba(255,255,255,.55)')}${R(PU.x - 3, PU.y - 3, PU.w + 6, PU.h + 6, 'none', 8, 'stroke="rgba(255,255,255,.55)" stroke-width="3"')}${pill([SIMLAB], 540, PU.y + PU.h + 18, { a: 1, size: 30, bg: GOLD, fg: INK })}${T('LIVE 4D LAB', 36, P3.y + 50, { size: 30, fill: '#fff', anchor: 'start', w: 800, e: 'stroke="#0A2B34" stroke-width="6" paint-order="stroke"' })}${tag || ''}</g>`;
function sceneHook(tn) {
  const a = clamp((7.55 - tn) / 0.5), idx = clamp(Math.floor((tn + OFF) * 30), 0, 219);
  return { A: bgDark, U: webFrame(a) + gOp(pillAt(tn, -1, 7.6, ['KOK GESER PROBE,', 'GAMBARNYA BERUBAH?'], 90, { bg: GOLD, fg: INK, size: 52 }), a), web: webFrames('hook', idx, a) };
}
function sceneFinal(tn) {
  const t0 = 46.55, a = clamp((tn - t0) / 0.45), idx = Math.min(185, 46 + Math.floor(Math.max(0, tn - t0) * 30));
  return { A: '', U: webFrame(a, '') + gOp(pillAt(tn, 46.9, 99, ['SUARA → GEMA → GAMBAR'], 120, { bg: GOLD, fg: INK, size: 56 }), a) + gOp(pill(['kembali ke simulasi MEDCOEL'], 540, 215, { a: 1, size: 28, bg: '#fff' }), a * kw(tn, 46.6, 49.2, 0.3)), web: webFrames('akhir', idx, a) };
}

// ================================================================ OUTRO: rekaman web ASLI (Atlas 3D, Live 4D Lab, materi, latihan soal, Simulasi Dokter) + logo + URL; audio outro-baru.wav mulai di u = 1,0
const RECT = { x: 70, y: 340, w: 940, h: 1156 };
const OSEG = [   // [u0, u1, label, tipe, bingkai awal pada outro-web.mp4 (0-based)]
  [0.0, 3.3, 'ATLAS 3D', 'img', 0], [3.3, 5.4, 'LIVE 4D LAB', 'lab', 0], [5.4, 6.9, 'Materi per bab', 'img', 99], [6.9, 8.0, 'Latihan soal + pembahasan', 'img', 144], [8.0, 10.2, 'Simulasi Dokter', 'img', 177],
];
const P3o = { sx: 40, sy: 80, sw: 702, sh: 314, x: 70, y: 340, w: 940, h: 420 }, PUo = { x: 190, y: 772, w: 700, h: 550, sx: 0, sy: 0, sw: 759, sh: 596, dx: 0, dy: 0, dw: 700, dh: 550 };
function sceneOutro(t) {
  const u = t - TL.O0, a = clamp(u / 0.35), kc = clamp((u - 9.85) / 0.3), keep = 1 - kc;
  let A_ = `<g opacity="${f1(a * 100) / 100}">${R(-10, -10, 1100, 1940, '#0B2F38')}</g><g opacity="${f1(kc * 100) / 100}">${R(-10, -10, 1100, 1940, '#F7F2E4')}<circle cx="0" cy="1500" r="300" fill="#EAF3E0"/><circle cx="1040" cy="260" r="260" fill="#EAF3E0"/></g>`;
  let U = '', web = [];
  const seg_ = OSEG.find((o) => u >= o[0] && u < o[1]);
  if (seg_ && keep > 0.02) {
    const [u0, u1, lab, kind, f0] = seg_, fi = Math.min(Math.floor((u - u0) * 30), { 0: 98, 99: 44, 144: 32, 177: 44 }[f0] ?? 999);
    U += `<g opacity="${f1(keep * a * 100) / 100}"><rect x="${RECT.x - 8}" y="${RECT.y - 8}" width="${RECT.w + 16}" height="${RECT.h + 16}" rx="28" fill="none" stroke="${GOLD}" stroke-width="8"/></g>`;
    U += gOp(pill([lab], 540, 210 + (1 - eo(clamp((u - u0) / 0.3))) * -40, { a: 1, size: 56, bg: '#fff' }), keep * kw(u, u0, u1, 0.12) * 0 + keep);
    if (kind === 'img') web = [{ kind: 'img', src: `../rekam/web/f${String(f0 + fi + 1).padStart(4, '0')}.jpg`, rect: RECT, clip: { ...RECT, r: 22 }, alpha: a * keep }];
    else {
      web = [{ kind: 'lab', take: 'outro', idx: Math.min(fi, 109), alpha: a * keep, p3: P3o, pu: PUo, clip: null }];
      U += `<g opacity="${f1(keep * 100) / 100}">${R(PUo.x - 3, PUo.y - 3, PUo.w + 6, PUo.h + 6, 'none', 8, 'stroke="rgba(255,255,255,.55)" stroke-width="3"')}${pill([SIMLAB], 540, PUo.y + PUo.h + 22, { a: 1, size: 32, bg: GOLD, fg: INK })}</g>`;
    }
    if (u0 >= 5.4) U += gOp(pill(['tampilan dipercepat'], 540, 296, { a: 1, size: 24, bg: 'rgba(255,255,255,.85)' }), keep * 0.9);
  }
  if (kc > 0.01) {
    const ke = clamp((u - 10.1) / 0.45);
    U += `<g opacity="${f1(ke * 100) / 100}" transform="translate(0 ${f1((1 - ke) * -30)})"><image href="logo-full.webp" x="170" y="190" width="740" height="${f1(740 * 160 / 794)}" preserveAspectRatio="xMidYMid meet"/>${T('BELAJAR FK GRATIS', 540, 450, { size: 76, fill: FOREST })}${R(230, 500, 620, 140, FOREST, 70)}${T('medcoel.com', 540, 600, { size: 88, fill: GOLD })}</g>`;
    let st = raka('senang', 'netral', { yaw: -0.1, tilt: -3 }); st = rIdle(st, u);
    U += `<g opacity="${f1(ke * 100) / 100}" transform="translate(${f1(540 - 200 * 1.05)} ${f1(790 + (1 - ke) * 80)}) scale(1.05)">${rakaSvg(st, { bare: true, shadow: false, uid: 'rkO' })}</g>`;
  }
  U += captions(u - 1.0, TL.OUT_CAPS, kc > 0.5 ? 1640 : 1560);
  return { A: A_, U, bm: [], web };
}

export async function frame(t) {
  if (t >= TL.O0) return sceneOutro(t);
  const tn = t - OFF; let A_ = '', U = '', bm = [], web = [], capY = 1345;
  if (tn < 7.5) { const s = sceneHook(tn); A_ = s.A; U = s.U; web = s.web; capY = 1480; }
  else {
    const s = tn < 14.4 ? sceneGel(tn) : tn < 24.9 ? sceneEcho(tn) : tn < 31.24 ? sceneNearDeep(tn) : tn < 36.5 ? sceneBuild(tn) : sceneSlide(tn);
    A_ = s.A; U = s.U; bm = s.bm || [];
    if (tn > 7.4 && tn < 10.4) { const k = kw(tn, 7.5, 10.3, 0.4); let st = raka('berpikir', 'netral', { yaw: -0.2, tilt: 5, gazeX: -0.4, gazeY: -0.2 }); st = rIdle(st, tn); U += `<g opacity="${f1(k * 100) / 100}" transform="translate(${f1(660 - 200 * 0.78)} ${f1(1500 + (1 - eo(clamp((tn - 7.5) / 0.5))) * 120)}) scale(0.78)">${rakaSvg(st, { bare: true, shadow: false, uid: 'rkS', dark: true })}</g>`; }
    if (tn < 9.6) U += pill(['ILUSTRASI: ALAT USG SUNGGUHAN'], 540, 120, { a: kw(tn, 7.55, 9.4, 0.3), size: 44, bg: '#fff' });
    if (tn >= 46.4) { const f = sceneFinal(tn); if (tn >= 47.0) { A_ = f.A; U = f.U; bm = []; } else U += f.U; web = f.web; capY = 1480; }
  }
  U += captions(tn, undefined, capY);
  return { A: A_, U, bm, web };
}

// ================================================================ SAMPUL (vertikal 1080x1920): rekaman asli Live 4D Lab + judul + logo
export async function cover() {
  let st = raka('senang', 'netral', { yaw: -0.15, tilt: -3 }); st = rIdle(st, 0.8);
  const U = webFrame(1) + `${T('USG BUKAN KAMERA', 540, 150, { size: 92, fill: GOLD, w: 800, e: 'stroke="#0A2B34" stroke-width="10" paint-order="stroke"' })}${T('Gambar disusun dari GEMA suara', 540, 235, { size: 56, fill: '#fff', w: 800 })}`
    + `<g transform="translate(${f1(120 - 200 * 0.5)} ${f1(1470)}) scale(0.5)">${rakaSvg(st, { bare: true, shadow: false, uid: 'rkC', dark: true })}</g>`
    + `<g>${R(250, 1490, 770, 250, '#F7F2E4', 40)}<image href="logo-full.webp" x="335" y="1510" width="600" height="${f1(600 * 160 / 794)}" preserveAspectRatio="xMidYMid meet"/>${R(340, 1640, 580, 80, FOREST, 40)}${T('medcoel.com', 630, 1698, { size: 56, fill: GOLD })}</g>`;
  return { A: bgDark, U, bm: [], web: webFrames('hook', 66) };
}

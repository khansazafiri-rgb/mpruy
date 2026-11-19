// "Bagaimana satu tetes darah bisa menghasilkan angka Hb?" — adegan (1080 x 1920, 30 fps). Gaya datar 2D MEDCOEL, Raka kanonik (rakaSvg), semua objek dari kode (art.js).
// Waktu dari ../cues.json (sama dengan audio/audio_mix.py). Contoh alat = HemoCue Hb 201+ (lembar produk: reaksi azidemethemoglobin termodifikasi, dua panjang gelombang 570 dan 880 nm untuk kompensasi kekeruhan, ~10 uL, hasil < 60 dtk, g/dL).
import { f1, clamp, lerp, sm, eo, eio, seg, win, pop, track, pchip, R, C, P, T, G, FONT, tw, pill, rndf, GOLD, FOREST, INK } from './lib.js';
import { raka, rakaSvg, armShape, lerpState, idle as rIdle } from '../../../brand/characters/raka/raka.js';
import * as A from './art.js';
import { K } from './art.js';
const CUES = await (await fetch('../cues.json')).json(); const W = CUES.w;
const NOCAP = new URLSearchParams(location.search).has('nocap');
const CREAM = '#F7F2E4', NAVY = '#0F3A47', TEAL = '#0B2F38', CORAL = '#F2735E', MINT = '#9DE0BD';
const ka = (t, t0, t1, f = 0.25) => clamp((t - t0) / f) * clamp((t1 - t) / f);
// ------------------------------------------------------------------ teks layar
function chip(lines, t, t0, t1, o = {}) { const k = ka(t, t0, t1, o.f ?? 0.3); return k > 0.01 ? pill(lines, 540, (o.y ?? 250) + (1 - eo(clamp((t - t0) / 0.35))) * -40, { a: k, size: o.size ?? 54, bg: o.bg, fg: o.fg }) : ''; }
function tag(txt, x, y, a = 1, o = {}) {
  if (a <= 0.01) return ''; const size = o.size ?? 36, w = tw(txt, size) + 46, h = size + 26;
  return `<g opacity="${f1(a * 100) / 100}"><rect x="${f1(x - w / 2)}" y="${f1(y - h / 2 + 5)}" width="${f1(w)}" height="${h}" rx="${h / 2}" fill="rgba(0,0,0,.28)"/><rect x="${f1(x - w / 2)}" y="${f1(y - h / 2)}" width="${f1(w)}" height="${h}" rx="${h / 2}" fill="${o.bg ?? '#fff'}"/>${T(txt, x, y + size * 0.36, { size, fill: o.fg ?? FOREST })}</g>`;
}
/** label dengan garis penunjuk: kotak di (tx, ty), ujung garis di (ax, ay) pada benda */
function callout(txt, tx, ty, ax, ay, a, o = {}) {
  if (a <= 0.01) return ''; const size = o.size ?? 38, w = tw(txt, size) + 46, h = size + 26, col = o.col ?? GOLD, k = o.k ?? 1;
  const ex = ax < tx ? tx - w / 2 : tx + w / 2, ey = ty;
  const ux = lerp(ex, ax, k), uy = lerp(ey, ay, k);
  return `<g opacity="${f1(a * 100) / 100}"><path d="M${f1(ex)} ${f1(ey)}L${f1(ux)} ${f1(uy)}" stroke="#000" stroke-opacity=".3" stroke-width="9" stroke-linecap="round" transform="translate(0 4)"/><path d="M${f1(ex)} ${f1(ey)}L${f1(ux)} ${f1(uy)}" stroke="${col}" stroke-width="6" stroke-linecap="round"/><circle cx="${f1(ux)}" cy="${f1(uy)}" r="${f1(11 * k)}" fill="${col}" stroke="${INK}" stroke-width="3"/></g>` + tag(txt, tx, ty, a, { size, bg: o.bg, fg: o.fg });
}
function caption(t) {
  if (NOCAP || t >= CUES.t_web) return '';
  const c = CUES.cap.find(([a, b]) => t >= a - 0.04 && t < b); if (!c) return '';
  const a = clamp((t - c[0]) / 0.12), size = 50, w = Math.min(980, tw(c[2], size) + 70);
  return `<g opacity="${f1(a * 100) / 100}">${R(540 - w / 2, 1306, w, 96, 'rgba(8,18,30,.92)', 34)}${T(c[2], 540, 1371, { size, fill: '#fff' })}</g>`;
}
const dashed = (x1, y1, x2, y2, col = GOLD, a = 1, w = 5) => `<path d="M${f1(x1)} ${f1(y1)}L${f1(x2)} ${f1(y2)}" stroke="${col}" stroke-width="${w}" stroke-dasharray="14 12" stroke-linecap="round" opacity="${f1(a * 100) / 100}"/>`;
// ------------------------------------------------------------------ alat bantu umum
const mod = (a, b) => ((a % b) + b) % b;
const camG = (inner, z, cx, cy, ox = 540, oy = 960) => `<g transform="translate(${f1(ox)} ${f1(oy)}) scale(${f1(z * 1000) / 1000}) translate(${f1(-cx)} ${f1(-cy)})">${inner}</g>`;
const bgNavy = `<defs><linearGradient id="nbg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#12485A"/><stop offset="1" stop-color="#0A2B36"/></linearGradient></defs><rect x="-9000" y="-9000" width="18000" height="18000" fill="url(#nbg)"/><circle cx="90" cy="560" r="220" fill="#134B5C" opacity=".6"/><circle cx="1000" cy="1100" r="260" fill="#134B5C" opacity=".5"/>`;
const bgCream = `<rect x="-9000" y="-9000" width="18000" height="18000" fill="${CREAM}"/><circle cx="110" cy="480" r="190" fill="#EADFC4"/><circle cx="980" cy="1040" r="230" fill="#EADFC4" opacity=".7"/>`;
const bgTeal = `<rect x="-9000" y="-9000" width="18000" height="18000" fill="${TEAL}"/><circle cx="90" cy="560" r="220" fill="#104049" opacity=".7"/><circle cx="1000" cy="1100" r="260" fill="#104049" opacity=".6"/>`;
const op = (a, inner) => `<g opacity="${f1(clamp(a) * 1000) / 1000}">${inner}</g>`;
const armTo = (side, hx, hy, extra = {}) => { const a = { wx: hx, wy: hy, ex: side === 'R' ? Math.max(330, hx + 70) : Math.min(70, hx - 70), ey: hy + 90, finger: 0, fa: -90, front: 1, roll: 0, hold: 0, holdRot: 0, ...extra }; const h = armShape(side, a).hand; a.wx += hx - h[0]; a.wy += hy - h[1]; return a; };
const rk = (st, cx, ty, k, uid) => { const tx = cx - 200 * k; return { svg: `<g transform="translate(${f1(tx)} ${f1(ty)}) scale(${k})">${rakaSvg(st, { bare: true, uid, shadow: false })}</g>`, hand: (side) => { const h = armShape(side, st['arm' + side]).hand; return [tx + h[0] * k, ty + h[1] * k]; }, tx, k }; };
const blink = (t) => { const x = mod(t - 0.9, 3.4); return x > 0.16 ? 0 : Math.sin((x / 0.16) * Math.PI); };

// ------------------------------------------------------------------ A. hook: SpO2 normal, Hb rendah (0 - 7,0)
const RAK = { cx: 440, ty: 700, k: 1.45 };
function sceneA(t, out) {
  const raise = seg(t, 0.0, 0.9, eio), look = seg(t, W.hb - 0.1, W.hb + 0.5), conf = seg(t, W.hb, W.hb + 0.6), think = seg(t, W.kokbisa - 0.1, W.kokbisa + 0.4);
  const arm = armTo('R', lerp(318, 352, raise), lerp(540, 420, raise), { finger: 1, fa: -78 });
  const st0 = raka(t < W.hb ? 'lega' : (t < W.kokbisa ? 'bingung' : 'berpikir'), 'netral', { armR: arm, armL: armTo('L', 92, 540), yaw: 0.2 + 0.1 * look, gazeY: -0.6 + 0.9 * look, gazeX: -0.3, tilt: -9 * conf, lean: 0.5, browL: { y: -4 - 5 * conf, rot: 4 }, browR: { y: -4 - 5 * conf, rot: -4 } });
  const r = rk(rIdle(st0, t), RAK.cx, RAK.ty, RAK.k, 'rA'); r.svg;
  const hand = r.hand('R'), tip = [hand[0] + Math.cos(-78 * Math.PI / 180) * 64 * RAK.k, hand[1] + Math.sin(-78 * Math.PI / 180) * 64 * RAK.k];
  const spo = t < 0.9 ? Math.round(lerp(92, 96, seg(t, 0, 0.9, (x) => Math.floor(x * 5) / 5))) : 96, beat = Math.max(0, Math.sin(t * 7.5));
  let w = bgCream + r.svg;
  // penjepit di ujung telunjuk (pulse oximeter) + denyut cahaya
  w += `<g transform="translate(${f1(tip[0])} ${f1(tip[1] + 18)}) scale(1.35)"><circle r="${f1(46 + 16 * beat)}" fill="#FF4A3D" opacity="${f1(0.16 + 0.18 * beat)}"/><rect x="-36" y="-52" width="72" height="92" rx="22" fill="#2E3E48" stroke="${INK}" stroke-width="6"/><circle cx="0" cy="-26" r="9" fill="#FF4A3D"/><rect x="-22" y="0" width="44" height="26" rx="8" fill="#B8D8C6"/></g>`;
  // kartu SpO2 (dari jari) dan kartu Hb (dari tes darah)
  const c1 = A.card(60, 420, 450, 300, { label: 'SpO₂ (jari)', value: String(spo), unit: '%', tone: 'oke', note: 'ilustrasi' });
  const hp = pop(t, W.hb - 0.1, 0.45);
  const c2 = hp > 0.01 ? A.card(570, 420, 450, 300, { label: 'Hb (tes darah)', value: '8,2', unit: 'g/dL', tone: 'rendah', note: 'ilustrasi', s: Math.min(1.08, hp), o: clamp(hp), flag: 1 }) : '';
  w += `<path d="M${f1(tip[0])} ${f1(tip[1] - 40)}Q${f1(tip[0] - 40)} 620 285 740" fill="none" stroke="${GOLD}" stroke-width="6" stroke-linecap="round" stroke-dasharray="2 14"/>`;
  w += c1 + c2;
  const z = lerp(1.2, 1.0, sm(seg(t, 0.3, 3.4))), cy = lerp(800, 960, sm(seg(t, 0.3, 3.4))), cxA = lerp(440, 540, sm(seg(t, 0.3, 3.4)));
  out.A += camG(w, z, cxA, cy, 540, 960);
  out.U += chip(['SpO₂ NORMAL,', 'Hb RENDAH?'], t, 0.1, 6.9, { size: 58, bg: '#D9382F', fg: '#fff' });
}
// ------------------------------------------------------------------ B. dua angka berbeda: proporsi vs kadar (6,9 - 19,8)
const VY = [600, 930];
const NHB = [50, 25];
function vessels(t, a) {
  let s = '';
  const prop = ka(t, W.persentase - 0.2, 12.0, 0.3), cnt = ka(t, W.banyaknya - 0.2, 15.6, 0.3);
  [0, 1].forEach((v) => {
    const yc = VY[v], n = NHB[v];
    s += `<rect x="30" y="${yc - 125}" width="1020" height="250" rx="125" fill="rgba(206,236,242,.14)" stroke="#CDEFF3" stroke-width="5"/><rect x="60" y="${yc - 100}" width="960" height="200" rx="100" fill="#3C1A28" opacity=".55"/>`;
    for (let i = 0; i < n; i++) {
      const x = 80 + mod((i + 0.5 * rndf(i + v * 9)) * (900 / n) + t * 32, 900), y = yc + (((i * 7 + v * 3) % 11) / 10 - 0.5) * 150 + Math.sin(t * 1.6 + i) * 5;
      const deox = i === 11;
      const sweep = cnt * clamp(1 - Math.abs(((t - 13.6) / 1.4) * 900 + 80 - x) / 60);
      if (sweep > 0.02) s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(26 + 8 * sweep)}" fill="none" stroke="${GOLD}" stroke-width="5" opacity="${f1(sweep)}"/>`;
      if (prop > 0.02 && !deox) s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(22 + 5 * Math.sin(t * 6 + i))}" fill="#fff" opacity="${f1(0.16 * prop)}"/>`;
      s += A.hbm(x, y, 19, deox ? 'deoxy' : 'oxy');
    }
  });
  return op(a, s);
}
function ringGauge(x, y, r, frac, col, o = 1) { const c = 2 * Math.PI * r; return `<g transform="translate(${f1(x)} ${f1(y)}) rotate(-90)" opacity="${o}"><circle r="${r}" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="${r * 0.28}"/><circle r="${r}" fill="none" stroke="${col}" stroke-width="${r * 0.28}" stroke-dasharray="${f1(c * frac)} ${f1(c)}" stroke-linecap="round"/></g>`; }
function sceneB(t, out) {
  out.A += bgNavy;
  const a1 = 1 - seg(t, 15.4, 15.9);
  out.A += vessels(t, a1);
  let u = '';
  // 7,4 - 12: proporsi
  u += tag('Hb 14,0 g/dL', 200, VY[0] - 160, ka(t, W.dua + 0.8, 19, 0.3) * a1, { size: 36 }) + tag('Hb 8,2 g/dL', 200, VY[1] - 160, ka(t, W.dua + 0.8, 19, 0.3) * a1, { size: 36, bg: '#FFE3DC', fg: '#8A2F22' });
  const pk = ka(t, W.persentase - 0.1, 12.2, 0.3) * a1;
  u += op(pk, `${ringGauge(930, VY[0] - 175, 38, 0.98, K.oxy)}${tag('SpO₂ ≈ 98 %', 760, VY[0] - 175, 1, { size: 34 })}${ringGauge(930, VY[1] - 175, 38, 0.96, K.oxy)}${tag('SpO₂ ≈ 96 %', 760, VY[1] - 175, 1, { size: 34 })}`);
  u += tag('membawa O₂', 250, VY[1] + 175, ka(t, W.membawa - 0.2, 12.2, 0.3) * a1, { size: 32, bg: '#FFE3DC', fg: '#8A2F22' });
  u += tag('tanpa O₂', 820, VY[1] + 175, ka(t, W.membawa - 0.2, 12.2, 0.3) * a1, { size: 32, bg: '#E7DAF0' });
  u += chip(['SpO₂ = PROPORSI'], t, W.dua + 2.4, 12.2, { size: 56 });
  u += chip(['Hb = KADAR'], t, W.tesHb - 0.1, 15.5, { size: 56 });
  u += tag('banyak', 900, VY[0] - 160, ka(t, W.banyaknya, 15.5, 0.3) * a1, { size: 34, bg: '#fff' }) + tag('lebih sedikit', 860, VY[1] - 160, ka(t, W.banyaknya + 0.3, 15.5, 0.3) * a1, { size: 34, bg: '#FFE3DC', fg: '#8A2F22' });
  u += tag('proporsi sama, jumlah berbeda', 540, 1270, ka(t, W.hemoglobin2, 15.6, 0.3) * a1, { size: 36, bg: GOLD, fg: INK });
  // 15,9 - 19,8: apa itu hemoglobin
  const ak = seg(t, 15.7, 16.2) * (1 - seg(t, 19.5, 19.9));
  if (ak > 0.01) {
    const cx = 480, cy = 840, rr = 250;
    let s = A.rbc(cx, cy, rr, 0, 0);
    for (let i = 0; i < 12; i++) { const an = i * 2.4 + 0.5, d = 40 + 105 * Math.sqrt((i + 1) / 12); s += A.hbm(cx + Math.cos(an) * d * 1.18 + Math.sin(t + i) * 3, cy + Math.sin(an) * d * 0.9 + Math.cos(t * 1.3 + i) * 3, 24, 'oxy'); }
    // O2 meninggalkan sel menuju jaringan
    const ox = seg(t, 18.3, 19.7, eio);
    for (let i = 0; i < 4; i++) { const p0 = clamp(ox * 1.3 - i * 0.14); if (p0 > 0 && p0 < 1.05) s += A.o2(lerp(cx + 150, 900, p0), lerp(cy - 20 + i * 14, cy + 40, p0), 22, 1); }
    s += `<g opacity="${f1(clamp(seg(t, 18.5, 19.3)) * 100) / 100}"><rect x="820" y="${cy - 150}" width="230" height="330" rx="70" fill="#E9B7A0" stroke="#B9806B" stroke-width="6"/><circle cx="900" cy="${cy - 60}" r="26" fill="#D98F78"/><circle cx="960" cy="${cy + 60}" r="30" fill="#D98F78"/><circle cx="900" cy="${cy + 110}" r="22" fill="#D98F78"/></g>`;
    out.A += op(ak, s);
    u += op(ak, tag('hemoglobin: protein pembawa O₂', 540, 420, ka(t, 16.0, 19.6, 0.3), { size: 36 }) + callout('sel darah merah', 190, cy + 270, cx - 190, cy + 130, ka(t, W.sel - 0.1, 19.6, 0.25), { k: eo(clamp((t - W.sel + 0.1) / 0.4)) }) + callout('hemoglobin', 800, cy - 250, cx + 60, cy - 60, ka(t, 16.4, 19.6, 0.25), { k: eo(clamp((t - 16.4) / 0.4)) }) + tag('jaringan', 935, cy - 190, ka(t, W.jaringan - 0.1, 19.7, 0.25), { size: 34, bg: '#FFE3DC', fg: '#8A2F22' }));
  }
  out.U += u;
}
// ------------------------------------------------------------------ C. tetes darah -> mikrokuvet, gaya kapiler (19,8 - 31,0)
function fingerSvg(t) {
  let s = `<rect x="360" y="-300" width="200" height="1100" rx="100" fill="${K.skin}" stroke="${K.skinD}" stroke-width="6"/>`;
  for (let i = 0; i < 5; i++) s += `<path d="M${392 + i * 2} ${660 + i * 14}Q460 ${628 + i * 14} ${528 - i * 2} ${660 + i * 14}" fill="none" stroke="${K.skinD}" stroke-width="3" opacity=".6"/>`;
  return s;
}
function sceneC(t, out) {
  const dropR = 8 + 22 * seg(t, 21.9, 23.3, eo), dropR2 = dropR * (1 - seg(t, 25.6, 26.6));
  const touch = seg(t, 23.7, 25.3, eio);
  // C1: tampak luar (20 - 26,3)
  const a1 = ka(t, 19.7, 26.35, 0.3);
  if (a1 > 0.01) {
    let w = bgCream + fingerSvg(t);
    // lanset singkat
    const lp = seg(t, 20.9, 21.2) * (1 - seg(t, 21.5, 21.9)), lx = lerp(760, 520, lp);
    if (lp > 0.01) { w += `<g transform="translate(${f1(lx)} 735) rotate(-8)"><rect x="0" y="-26" width="190" height="52" rx="18" fill="#9DAAB2" stroke="${INK}" stroke-width="5"/><rect x="-14" y="-8" width="20" height="16" rx="4" fill="#58666F"/></g>`; if (lp > 0.85) w += `<g stroke="${GOLD}" stroke-width="6" stroke-linecap="round"><path d="M500 720l-30 -26M505 740l-38 6M500 760l-26 26"/></g>`; }
    if (dropR2 > 1) w += A.drop(470, 722 + 0, dropR2);
    // mikrokuvet mendekat dan menyentuh tetes
    const cx = lerp(1250, 482, touch), cy = lerp(1080, 726, touch), rt = lerp(12, 3, touch);
    w += A.cuvette(cx, cy, 0.95, { rot: rt, dark: false, fill: seg(t, 25.4, 26.3) * 0.08, uid: 'c1' });
    w += `<g transform="translate(${f1(cx + 700 * 0.95)} ${f1(cy + 40)})"><rect x="-30" y="-46" width="300" height="92" rx="46" fill="#7FB6D6" stroke="#4B87A8" stroke-width="5" transform="rotate(8)"/><circle r="62" fill="#9CC9E2" stroke="#4B87A8" stroke-width="5"/></g>`;
    const z = lerp(1.0, 1.7, sm(seg(t, 21.0, 23.0))), zc = lerp(1.7, 1.9, sm(seg(t, 23.8, 25.4)));
    out.A += op(a1, camG(w, t < 23.5 ? z : zc, lerp(540, 520, sm(seg(t, 21, 23))), lerp(900, 735, sm(seg(t, 21, 23))), 540, 800));
  }
  // C2: penampang mikrokuvet terisi kapiler (26 - 31,1)
  const a2 = ka(t, 26.0, 31.1, 0.3);
  if (a2 > 0.01) {
    const p = eio(seg(t, 26.4, 30.2)), s = 1.05, ox = 130, oy = 820;
    let w = bgNavy + A.cuvette(ox, oy, s, { fill: p, dark: true, dryR: 1, col: '#B3202B', uid: 'c2' });
    w += A.drop(ox - 36, oy + 8, 26 * (1 - seg(t, 26.4, 28.4)) + 2, 1 - seg(t, 28.2, 28.6));
    // panah gaya kapiler: halus, searah aliran
    const fx = ox + p * 564 * s;
    for (let i = 0; i < 3; i++) w += A.arrow(ox + 20 + mod(t * 160 + i * 90, 320) * (fx > ox + 120 ? 1 : 0.3), oy - 100, ox + 90 + mod(t * 160 + i * 90, 320) * (fx > ox + 120 ? 1 : 0.3), oy - 100, GOLD, 8, ka(t, 26.8, 30.8, 0.3) * 0.9);
    out.A += op(a2, w);
    out.U += op(a2, tag('saluran sempit', 300, oy - 180, ka(t, W.sempit - 0.4, 31.0, 0.25), { size: 36 }) + tag('ruang sampel', 620, oy + 150, ka(t, 28.4, 31.0, 0.25), { size: 36 }) + tag('gaya kapiler: darah tertarik masuk', 540, oy + 260, ka(t, W.kapiler - 0.4, 31.0, 0.25), { size: 36, bg: GOLD, fg: INK }));
  }
  out.U += chip(['TETES DARAH', '→ MIKROKUVET'], t, 22.3, 30.9, { size: 54 });
  out.U += tag('satu tetes dari ujung jari', 540, 1250, ka(t, W.tetes - 0.1, 25.2, 0.3) * (a1 > 0.3 ? 1 : 0), { size: 34 });
  out.U += tag('tidak dituang, ditarik kapiler', 540, 1180, ka(t, 25.5, 26.4, 0.2) * a1, { size: 32, bg: GOLD, fg: INK });
}
// ------------------------------------------------------------------ D. reagen, sel terbuka, Hb terlepas dan berubah (31,1 - 43,5)
const RB = Array.from({ length: 12 }, (_, i) => ({ x: 120 + (i % 4) * 255 + (rndf(i) - 0.5) * 70, y: 700 + Math.floor(i / 4) * 150 + (rndf(i + 9) - 0.5) * 40, r: 50 + rndf(i + 3) * 8, tl: 35.0 + i * 0.2 }));
function sceneD(t, out) {
  out.A += bgNavy;
  // mini-peta: mikrokuvet utuh dengan jendela ruang sampel
  out.A += A.cuvette(130, 450, 1.05, { fill: 1, dark: true, dryR: 0, col: '#7C1822', uid: 'd0' });
  out.A += `<rect x="${130 + (CV_A() - 6) * 1.05}" y="${450 - 44}" width="${(CV_B() - CV_A() + 14) * 1.05}" height="88" rx="14" fill="none" stroke="${GOLD}" stroke-width="6" stroke-dasharray="14 10"/><path d="M${130 + CV_A() * 1.05} 494L90 590M${130 + CV_B() * 1.05} 494L990 590" stroke="${GOLD}" stroke-width="4" stroke-dasharray="4 10" opacity=".8"/>`;
  const X0 = 50, Y0 = 600, PW = 980, PH = 560;
  let s = `<defs><clipPath id="pnl"><rect x="${X0}" y="${Y0}" width="${PW}" height="${PH}" rx="40"/></clipPath></defs><rect x="${X0}" y="${Y0}" width="${PW}" height="${PH}" rx="40" fill="#F3C7B7"/>`;
  let inner = '';
  const diss = seg(t, 34.4, 36.6), mixk = seg(t, 39.64, 41.9), r2k = seg(t, 38.8, 40.4);
  // reagen 1 kering di dinding -> larut
  for (let i = 0; i < 24; i++) { const x = X0 + 40 + i * 40, top = i % 2 === 0, y = top ? Y0 + 24 : Y0 + PH - 24; inner += `<circle cx="${f1(x + (rndf(i) - 0.5) * 20 + diss * (rndf(i + 5) - 0.5) * 220)}" cy="${f1(y + (top ? 1 : -1) * diss * (60 + 200 * rndf(i + 2)))}" r="${f1(11 + 12 * diss)}" fill="${K.r1}" opacity="${f1((0.95 - 0.6 * diss) * 100) / 100}"/>`; }
  // reagen 2 (biru) mengikuti
  if (r2k > 0.01) for (let i = 0; i < 14; i++) { const x = X0 + 70 + i * 66, top = i % 2 === 0; inner += `<circle cx="${f1(x + (rndf(i + 20) - 0.5) * 80 * r2k)}" cy="${f1((top ? Y0 + 24 : Y0 + PH - 24) + (top ? 1 : -1) * r2k * (80 + 180 * rndf(i + 8)))}" r="${f1(10 + 9 * r2k)}" fill="${K.r2}" opacity="${f1((0.95 - 0.7 * seg(t, 40.6, 42.2)) * Math.min(1, r2k * 3) * 100) / 100}"/>`; }
  // sel darah merah dan Hb terlepas
  RB.forEach((c, i) => {
    const lys = seg(t, c.tl, c.tl + 0.9), dx = Math.sin(t * 0.9 + i) * 10, dy = Math.cos(t * 0.7 + i * 2) * 8;
    if (lys < 0.98) inner += A.rbc(c.x + dx, c.y + dy, c.r, rndf(i) * 40 + Math.sin(t + i) * 4, lys);
    if (lys > 0.3) for (let j = 0; j < 4; j++) { const an = j * 1.6 + i, sp = eo(seg(t, c.tl + 0.3, c.tl + 2.2)); inner += A.hbm(c.x + dx + Math.cos(an) * (18 + 70 * sp) + Math.sin(t * 2 + j) * 3, c.y + dy + Math.sin(an) * (14 + 60 * sp), 15, 'mix', clamp((lys - 0.3) * 2), mixk); }
  });
  s += `<g clip-path="url(#pnl)">${inner}</g><rect x="${X0}" y="${Y0}" width="${PW}" height="${PH}" rx="40" fill="none" stroke="#CDEFF3" stroke-width="8"/>`;
  out.A += s;
  let u = '';
  u += chip(['SEL TERBUKA → Hb TERLEPAS', '→ BEREAKSI'], t, W.reagen + 0.7, 43.4, { size: 46 });
  u += callout('reagen kering', 220, Y0 - 52, 160, Y0 + 28, ka(t, W.reagen - 0.4, 34.9, 0.25), { size: 34, col: K.r1, k: eo(clamp((t - W.reagen + 0.4) / 0.4)) });
  u += callout('sel darah merah', 760, Y0 + PH + 60, RB[7].x + 40, RB[7].y + 40, ka(t, 34.34, 35.8, 0.25), { size: 34 });
  u += tag('membran terbuka', 300, Y0 + PH + 60, ka(t, W.memecah - 0.2, 38.1, 0.25), { size: 34 });
  u += tag('hemoglobin terlepas', 740, Y0 + PH + 60, ka(t, W.melepaskan - 0.2, 38.6, 0.25), { size: 34, bg: '#FFE3DC', fg: '#8A2F22' });
  u += tag('reagen berikutnya', 280, Y0 + PH + 60, ka(t, 38.7, 41.0, 0.25), { size: 34, bg: '#DCEBFA' });
  u += tag('bentuk terukur (cahaya)', 700, Y0 + PH + 60, ka(t, W.bentuk - 0.2, 43.4, 0.25), { size: 34, bg: '#F6E7C4' });
  u += tag('contoh metode Hb 201+', 540, 1290, ka(t, 31.2, 43.4, 0.3), { size: 32, bg: 'rgba(8,24,36,.92)', fg: '#fff' });
  out.U += u;
}
const CV_A = () => 250, CV_B = () => 560;
// ------------------------------------------------------------------ E/F. alat, jalur cahaya, dua panjang gelombang (43,4 - 55,3)
function optics(t, o) {
  const { two = false, turb = 0, readout = 1 } = o, cx = 440, sy = 900;
  let s = `<rect x="${cx - 190}" y="${sy - 70}" width="380" height="36" rx="8" fill="rgba(206,236,242,.30)" stroke="#CDEFF3" stroke-width="4"/><rect x="${cx - 190}" y="${sy + 34}" width="380" height="36" rx="8" fill="rgba(206,236,242,.30)" stroke="#CDEFF3" stroke-width="4"/>`;
  s += `<rect x="${cx - 190}" y="${sy - 34}" width="380" height="68" fill="#8E1F2B" opacity=".9"/>`;
  for (let i = 0; i < 14; i++) s += A.hbm(cx - 170 + i * 26 + Math.sin(t * 1.5 + i) * 3, sy + Math.sin(i * 2.1 + t) * 12, 8, 'meas');
  for (let i = 0; i < Math.round(turb * 22); i++) s += `<circle cx="${f1(cx - 180 + rndf(i * 3) * 360)}" cy="${f1(sy - 28 + rndf(i * 3 + 1) * 56)}" r="${f1(2.2 + rndf(i) * 2.4)}" fill="#E9D9C9" opacity=".8"/>`;
  const beam = (x, col, atten, w0) => `<path d="M${x - w0} ${sy - 440}L${x + w0} ${sy - 440}L${x + w0 * 0.9} ${sy - 70}L${x - w0 * 0.9} ${sy - 70}Z" fill="${col}" opacity=".5"/><path d="M${x - w0 * 0.9} ${sy + 70}L${x + w0 * 0.9} ${sy + 70}L${x + w0 * 0.8} ${sy + 330}L${x - w0 * 0.8} ${sy + 330}Z" fill="${col}" opacity="${f1(atten * 0.5 * 100) / 100}"/>`;
  const sensor = (x, col, v) => `<rect x="${x - 70}" y="${sy + 330}" width="140" height="64" rx="16" fill="#2E3E48" stroke="#CDEFF3" stroke-width="4"/><rect x="${x - 56}" y="${sy + 344}" width="112" height="14" rx="7" fill="#0D2230"/><rect x="${x - 56}" y="${sy + 344}" width="${f1(112 * v)}" height="14" rx="7" fill="${col}"/>`;
  const led = (x, col) => `<rect x="${x - 70}" y="${sy - 504}" width="140" height="64" rx="16" fill="#2E3E48" stroke="#CDEFF3" stroke-width="4"/><circle cx="${x}" cy="${sy - 472}" r="14" fill="${col}"/>`;
  if (!two) { s += beam(cx, '#FFE27A', 0.35, 80) + led(cx, '#FFE27A') + sensor(cx, '#FFE27A', 0.35 * readout);
    const pa = seg(t, W.diserap - 0.6, W.diserap + 1.0);
    for (let i = 0; i < 6; i++) { const u = mod(t * 1.1 + i / 6, 1); s += `<circle cx="${f1(cx - 50 + i * 20)}" cy="${f1(sy - 60 + u * 60)}" r="5" fill="#fff" opacity="${f1(pa * (1 - u) * 100) / 100}"/>`; }
  } else {
    s += beam(cx - 80, K.l1, 0.4, 44) + beam(cx + 80, K.l2, 0.5, 44) + led(cx - 80, K.l1).replace(/width="140"/g, 'width="120"') + led(cx + 80, K.l2).replace(/width="140"/g, 'width="120"');
    s += sensor(cx - 80, K.l1, 0.4).replace(/width="140"/, 'width="120"') + sensor(cx + 80, K.l2, 0.5).replace(/width="140"/, 'width="120"');
  }
  const lanes = two ? [[cx - 80, K.l1, 0.4], [cx + 80, K.l2, 0.5]] : [[cx, '#FFE27A', 0.35]];
  lanes.forEach(([x, col, at], li) => { for (let i = 0; i < 7; i++) { const u = mod(t * 0.55 + i / 7 + li * 0.13, 1), y = sy - 440 + u * 880, thru = i % 3 === 0 || y < sy - 70; if (!thru && y > sy - 70) continue; s += `<circle cx="${f1(x + (rndf(i + li * 7) - 0.5) * (two ? 40 : 90))}" cy="${f1(y)}" r="6" fill="#fff" opacity="${f1(0.85 * (y > sy + 70 ? at * 1.6 : 1) * 100) / 100}"/>`; } });
  return s;
}
function sceneE(t, out) {
  // E1: tampak luar - laci, mikrokuvet masuk (43,4 - 46)
  const a1 = ka(t, 43.3, 46.1, 0.3);
  if (a1 > 0.01) {
    const dr = 1 - eio(seg(t, 44.2, 45.5)), ax = 290, ay = 470, ox = ax + (-300 * dr + 340) * 1.0, oy = ay + 458;
    const cvx = lerp(1180, 0, 0) ; void cvx;
    const drop = seg(t, 43.4, 44.1, eio);
    const cvPos = [lerp(ax + 340 + 560 - 300 * dr * 1 + (1 - drop) * 520, ox, 0) , oy];
    let w = bgCream + A.analyzer(ax, ay, 1, { drawer: dr });
    w += A.cuvette(ox + (1 - drop) * 560, oy - (1 - drop) * 120, 0.33, { rot: 180, dark: false, fill: 1, col: '#7C1822', dryR: 0, uid: 'e1' });
    out.A += op(a1, w);
    out.U += op(a1, tag('mikrokuvet dimasukkan ke alat', 540, 1260, ka(t, W.dimasukkan - 0.3, 46.0, 0.3), { size: 36 }));
  }
  // E2: potongan jalur cahaya (45,9 - 50,5)
  const a2 = ka(t, 45.8, 50.5, 0.3);
  if (a2 > 0.01) {
    out.A += op(a2, bgNavy + optics(t, {}));
    let u = chip(['CAHAYA MELEWATI SAMPEL'], t, W.cahaya2 - 0.1, 50.4, { size: 52 });
    u += callout('sumber cahaya', 840, 460, 520, 430, ka(t, W.cahaya2 - 0.1, 50.4, 0.25), { size: 34, col: '#FFE27A', k: eo(clamp((t - W.cahaya2 + 0.1) / 0.4)) });
    u += callout('sampel', 840, 900, 630, 900, ka(t, W.sampel - 0.1, 50.4, 0.25), { size: 34, k: eo(clamp((t - W.sampel + 0.1) / 0.4)) });
    u += callout('sensor', 840, 1250, 510, 1250, ka(t, W.sensor - 0.1, 50.4, 0.25), { size: 34, col: MINT, k: eo(clamp((t - W.sensor + 0.1) / 0.4)) });
    u += tag('lewat sampel di mikrokuvet, bukan lewat jari', 540, 372, ka(t, 46.4, 50.4, 0.3), { size: 28, bg: GOLD, fg: INK });
    u += tag('sebagian cahaya diserap', 700, 1080, ka(t, W.diserap - 0.3, 50.4, 0.25), { size: 34, bg: GOLD, fg: INK });
    out.U += op(a2, u);
  }
}
function sceneF(t, out) {
  const a = ka(t, 50.3, 55.3, 0.3); if (a < 0.01) return;
  const turb = seg(t, W.salah, W.keruh + 0.6) * 0.9 * 1;
  out.A += op(a, bgNavy + optics(t, { two: true, turb }));
  let u = chip(['DUA PANJANG GELOMBANG'], t, 50.4, 55.2, { size: 52 });
  u += tag('570 nm', 220, 470, ka(t, W.duaPG - 0.3, 55.2, 0.25), { size: 38, bg: K.l1, fg: INK }) + tag('880 nm', 660, 470, ka(t, W.duaPG - 0.1, 55.2, 0.25), { size: 38, bg: '#D9B6FF', fg: INK });
  u += tag('contoh Hb 201+ · warna cahaya ilustratif', 540, 400, ka(t, 50.6, 55.2, 0.3), { size: 28, bg: 'rgba(8,24,36,.92)', fg: '#fff' });
  // sinyal dua jalur -> perhitungan
  const calc = seg(t, 51.6, 52.4);
  u += `<g opacity="${f1(calc * 100) / 100}"><path d="M420 1262Q620 1290 700 1090" stroke="${K.l1}" stroke-width="7" fill="none" stroke-dasharray="2 14" stroke-linecap="round"/><path d="M580 1262Q650 1262 720 1100" stroke="${K.l2}" stroke-width="7" fill="none" stroke-dasharray="2 14" stroke-linecap="round"/><rect x="680" y="990" width="340" height="110" rx="30" fill="#fff"/>${T('perhitungan', 850, 1058, { size: 40, fill: FOREST })}</g>`;
  u += tag('membantu koreksi kekeruhan', 700, 940, ka(t, W.salah - 0.2, 55.2, 0.25), { size: 34, bg: '#F6E7C4' });
  u += tag('sampel keruh', 800, 760, ka(t, W.salah + 0.4, 55.2, 0.25), { size: 32, bg: '#fff' });
  out.U += op(a, u);
}
// ------------------------------------------------------------------ G. hasil g/dL + Raka (55,2 - 61,3)
function sceneG(t, out) {
  const a = ka(t, 55.1, 61.4, 0.3); if (a < 0.01) return;
  const num = seg(t, W.ditampilkan, W.ditampilkan + 1.4, eio), v = Math.round(num * 82) / 10, calc = t < W.ditampilkan;
  const disp = calc ? '· · ·'.slice(0, 1 + Math.floor(t * 3) % 5) : String(v.toFixed(1)).replace('.', ',');
  const st = rIdle(raka(t < 60.0 ? 'berpikir' : 'lega', 'netral', { yaw: -0.5, gazeX: -0.9, gazeY: 0.2, tilt: -4, armR: armTo('R', 330, 520), armL: armTo('L', 86, 552) }), t);
  const r = rk(st, 840, 640, 1.2, 'rG');
  let w = bgCream + A.analyzer(70, 470, 0.9, { disp: calc ? '' : disp, unit: calc ? '' : 'g/dL' }) + r.svg;
  if (calc) w += `<text x="${70 + 210 * 0.9}" y="${470 + 190 * 0.9}" font-family="${FONT}" font-weight="800" font-size="110" fill="#0A3830" text-anchor="middle" transform="translate(0 0)">${disp}</text>`;
  out.A += op(a, w);
  let u = chip(['Hb: GRAM PER DESILITER'], t, W.kadar - 0.3, 61.2, { size: 54 });
  u += tag('kadar hemoglobin di sampel', 330, 1250, ka(t, W.kadar - 0.1, 61.2, 0.25), { size: 36 });
  u += tag('bukan persentase saturasi', 330, 1180, ka(t, W.gram + 0.2, 61.2, 0.25), { size: 34, bg: '#FFE3DC', fg: '#8A2F22' });
  out.U += op(a, u);
}
// ------------------------------------------------------------------ H. kegunaan dan batas (61,2 - 77,6)
function sceneH(t, out) {
  const a = ka(t, 61.1, 77.7, 0.3); if (a < 0.01) return;
  let w = bgCream, u = '';
  // H1 pemantauan
  const h1 = ka(t, 61.1, 65.3, 0.3);
  if (h1 > 0.01) {
    const vals = ['8,2', '9,6', '11,0'], lab = ['awal', 'kontrol 1', 'kontrol 2'];
    let s = '';
    vals.forEach((v, i) => { const pp = pop(t, 61.4 + i * 0.7, 0.4); s += A.card(40 + i * 345, 620, 310, 330, { label: lab[i], value: v, unit: '', tone: i === 0 ? 'rendah' : 'netral', note: 'g/dL · ilustrasi', s: Math.min(1.05, pp), o: clamp(pp) }); if (i < 2) s += A.arrow(352 + i * 345, 785, 392 + i * 345, 785, GOLD, 9, clamp(pp)); });
    w += op(h1, s);
    u += chip(['MENILAI KEMUNGKINAN', 'ANEMIA · MEMANTAU'], t, 61.2, 65.2, { size: 50 }) + tag('kemungkinan anemia', 195, 1010, ka(t, W.anemia - 0.2, 65.2, 0.25) * h1, { size: 34, bg: '#FFE3DC', fg: '#8A2F22' }) + tag('memantau perubahan', 740, 1010, ka(t, W.memantau - 0.2, 65.2, 0.25) * h1, { size: 34 });
  }
  // H2 penyebab belum diketahui
  const h2 = ka(t, 65.2, 68.7, 0.3);
  if (h2 > 0.01) {
    let s = A.card(300, 600, 480, 350, { label: 'Hb', value: '8,2', unit: 'g/dL', tone: 'rendah', note: 'ilustrasi' });
    const q = [[120, 560], [900, 600], [160, 1040], [880, 1020]];
    q.forEach(([x, y], i) => { const pp = pop(t, 65.9 + i * 0.25, 0.4); s += `<g transform="translate(${x} ${y}) scale(${f1(Math.max(0.01, pp) * 1000) / 1000})"><circle r="74" fill="#fff" stroke="#9AA9B0" stroke-width="6"/>${T('?', 0, 38, { size: 110, fill: CORAL })}</g>`; });
    w += op(h2, s);
    u += chip(['SATU ANGKA HB', 'BELUM MENJELASKAN PENYEBAB'], t, 65.3, 68.6, { size: 46 }) + tag('penyebab: belum diketahui', 540, 1130, ka(t, W.penyebab - 0.3, 68.6, 0.25) * h2, { size: 36 });
  }
  // H3 pengambilan sampel bermasalah (singkat, tanpa langkah prosedur)
  const h3 = ka(t, 68.5, 73.9, 0.3);
  if (h3 > 0.01) {
    const bub = seg(t, 69.4, 70.2);
    let s = A.cuvette(70, 760, 1.15, { fill: 0.62, dark: false, bubble: bub * 1.4, col: '#A8232F', uid: 'h3', dryR: 0.5 });
    const wob = Math.sin(t * 5) * 0.5 * seg(t, W.kurangTepat - 0.3, W.kurangTepat + 0.5);
    s += A.card(270, 960, 540, 290, { label: 'hasil Hb', value: '7,6?', unit: 'g/dL', tone: 'netral', note: 'bisa kurang tepat', s: 1 + wob * 0.02 });
    w += op(h3, s);
    u += chip(['PENGAMBILAN SAMPEL', 'BERMASALAH?'], t, 68.7, 73.8, { size: 50, bg: '#fff' }) + tag('mikrokuvet tidak terisi baik', 540, 640, ka(t, 69.6, 73.8, 0.25) * h3, { size: 34 }) + tag('hasil bisa kurang tepat', 540, 1240, ka(t, W.kurangTepat - 0.3, 73.8, 0.25) * h3, { size: 36, bg: GOLD, fg: INK });
  }
  // H4 angka tidak cocok gejala -> pemeriksaan lanjutan
  const h4 = ka(t, 73.7, 77.8, 0.3);
  if (h4 > 0.01) {
    const st = rIdle(raka('khawatir', 'netral', { armR: armTo('R', 330, 540), armL: armTo('L', 80, 545), yaw: 0.25, tilt: 5 }), t), r = rk(st, 280, 660, 1.3, 'rH');
    let s = r.svg + A.card(560, 540, 440, 300, { label: 'Hb', value: '11,8', unit: 'g/dL', tone: 'netral', note: 'angka tampak baik', s: 1 });
    s += `<g transform="translate(790 960)"><rect x="-210" y="-70" width="420" height="140" rx="60" fill="#fff" stroke="#9AA9B0" stroke-width="6"/>${T('pusing, lemas', 0, 18, { size: 46, fill: '#8A2F22' })}</g>`;
    const ck = seg(t, W.lanjutan - 0.3, W.lanjutan + 0.4);
    s += `<g opacity="${f1(ck * 100) / 100}" transform="translate(790 1150)"><rect x="-120" y="-90" width="240" height="180" rx="26" fill="#fff" stroke="#00A383" stroke-width="7"/><rect x="-60" y="-110" width="120" height="36" rx="14" fill="#00A383"/>${[-40, 0, 40].map((y) => `<path d="M-84 ${y}h20M-44 ${y}h108" stroke="#00A383" stroke-width="7" stroke-linecap="round"/>`).join('')}</g>`;
    w += op(h4, s);
    u += chip(['ANGKA ≠ GEJALA?', 'PERIKSA LEBIH LANJUT'], t, 73.9, 77.6, { size: 50 }) + tag('angka tidak cocok dengan gejala', 760, 880, ka(t, W.gejala - 0.9, 77.6, 0.25) * h4, { size: 34 }) + tag('pemeriksaan lanjutan', 790, 1015, ka(t, W.lanjutan - 0.3, 77.6, 0.25) * h4, { size: 34, bg: '#B8E5D6' });
  }
  out.A += op(a, w); out.U += op(a, u);
}
// ------------------------------------------------------------------ I. ringkasan: PROPORSI != KADAR (78,2 - akhir)
function sceneI(t, out) {
  const k = ka(t, 77.9, 99, 0.4); if (k < 0.01) return;
  let w = bgTeal;
  const p1 = pop(t, 78.3, 0.45), p2 = pop(t, 80.0, 0.45);
  const fl = 5 * Math.sin(t * 1.3);
  w += A.card(40, 470 + fl, 480, 400, { label: 'SpO₂', value: '96', unit: '%', tone: 'oke', note: 'proporsi Hb membawa O₂', s: Math.min(1.04, p1), o: clamp(p1) });
  w += A.card(560, 470 - fl, 480, 400, { label: 'Hb', value: '8,2', unit: 'g/dL', tone: 'rendah', note: 'jumlah Hb tersedia', s: Math.min(1.04, p2), o: clamp(p2), flag: 1 });
  // ikon: persentase -> SpO2 ; jumlah -> Hb
  const m1 = eio(seg(t, W.proporsi - 0.3, W.proporsi + 0.7)), m2 = eio(seg(t, W.banyak - 0.3, W.banyak + 0.7));
  w += `<g transform="translate(${f1(lerp(540, 280, m1))} ${f1(lerp(1040, 1040, m1))})" opacity="${f1(seg(t, W.proporsi - 0.6, W.proporsi) * 100) / 100}">${ringGauge(0, 0, 100 + 4 * Math.sin(t * 3), 0.96, K.oxy)}${T('%', 0, 24, { size: 72, fill: '#fff' })}</g>`;
  let stack = '';
  for (let i = 0; i < 9; i++) stack += A.hbm((i % 3 - 1) * 56 + Math.sin(t * 2 + i) * 3, -Math.floor(i / 3) * 56 + 56 + Math.cos(t * 2.3 + i) * 3, 22, 'oxy');
  w += `<g transform="translate(${f1(lerp(540, 800, m2))} ${f1(1040)})" opacity="${f1(seg(t, W.banyak - 0.6, W.banyak) * 100) / 100}">${stack}</g>`;
  out.A += op(k, w);
  out.U += op(k, chip(['PROPORSI ≠ KADAR'], t, 78.3, 99, { size: 60, bg: GOLD, fg: INK }) + tag('persentase yang membawa O₂', 280, 1210, ka(t, W.proporsi - 0.3, 99, 0.3), { size: 32 }) + tag('banyaknya hemoglobin', 800, 1210, ka(t, W.banyak - 0.3, 99, 0.3), { size: 32, bg: '#FFE3DC', fg: '#8A2F22' }));
}
// ------------------------------------------------------------------ outro (salinan pola video SpO2: web asli + master suara)
export const OUTRO_FRAMES = 455;
const RECT_A = { x: 70, y: 340, w: 940, h: 1156 }, RECT_B = { x: 280, y: 800, w: 520, h: 639 };
const O0 = CUES.t_web;
function outroState(t) {
  const to = t - O0, kk = seg(to, 9.0, 9.75, eio);
  return { to, rect: { x: lerp(RECT_A.x, RECT_B.x, kk), y: lerp(RECT_A.y, RECT_B.y, kk), w: lerp(RECT_A.w, RECT_B.w, kk), h: lerp(RECT_A.h, RECT_B.h, kk) }, frame: clamp(Math.round(to * 30), 0, OUTRO_FRAMES - 1), cream: kk, kk };
}
function wrapText(s, size, maxW) { const words = s.split(' '), lines = []; let cur = ''; for (const w of words) { const t = cur ? cur + ' ' + w : w; if (cur && tw(t, size) > maxW) { lines.push(cur); cur = w; } else cur = t; } if (cur) lines.push(cur); return lines; }
function outroUI(t) {
  const { to, rect, cream, kk } = outroState(t), a = seg(to, 0, 0.35);
  const bg = `<g opacity="${f1(a * 100) / 100}">${R(-10, -10, 1100, 1940, '#0B2F38')}</g><g opacity="${f1(cream * 100) / 100}">${R(-10, -10, 1100, 1940, '#F7F2E4')}<circle cx="0" cy="1500" r="300" fill="#EAF3E0"/><circle cx="1040" cy="260" r="260" fill="#EAF3E0"/></g>`;
  let u = `<g opacity="${f1(a * 100) / 100}"><rect x="${f1(rect.x - 8)}" y="${f1(rect.y - 8)}" width="${f1(rect.w + 16)}" height="${f1(rect.h + 16)}" rx="${f1(lerp(28, 22, kk))}" fill="none" stroke="${cream > 0.5 ? FOREST : GOLD}" stroke-width="8"/></g>`;
  const lab = [[5.0, 6.7, 'Materi per bab'], [6.7, 7.75, 'Latihan soal + pembahasan'], [7.75, 9.2, 'Simulasi Dokter']];
  for (const [a0, a1, tx] of lab) { const k = ka(to, a0, a1, 0.25); if (k > 0.01) u += pill([tx], 540, 255 + (1 - eo(clamp((to - a0) / 0.3))) * -40, { a: k, size: 50, bg: '#fff' }); }
  const ke = seg(to, 9.35, 9.95, eo);
  if (ke > 0.01) u += `<g opacity="${f1(ke * 100) / 100}" transform="translate(0 ${f1((1 - ke) * -30)})"><image href="logo-full.webp" x="170" y="290" width="740" height="${f1(740 * 160 / 794)}" preserveAspectRatio="xMidYMid meet"/>${T('Belajar FK gratis di MEDCOEL', 540, 520, { size: 56, fill: FOREST })}${R(250, 590, 580, 128, FOREST, 64)}${T('medcoel.com', 540, 680, { size: 82, fill: GOLD })}</g>`;
  const caps = [[1.2, 4.56, 'Masih penasaran? Lanjutkan belajarnya di MEDCOEL.'], [5.06, 8.98, 'Jelajahi materi per bab, latihan soal, dan simulasi dokter.'], [9.54, 11.7, 'Semuanya gratis di medcoel.com.']];
  for (const [a0, a1, tx] of caps) { const k = ka(to, a0, a1, 0.12); if ((k > 0.01 && to < 9.4) || (k > 0.01 && a0 > 9)) { const ls = wrapText(tx, 48, 820); const y = a0 > 9 ? 1470 : 1330, h = ls.length * 58 + 30; u += `<g opacity="${f1(k * 100) / 100}">${R(100, y + 6, 880, h, 'rgba(0,0,0,.25)', 30)}${R(100, y, 880, h, 'rgba(8,16,28,.92)', 30)}${ls.map((l, i) => T(l, 540, y + 14 + 42 + i * 58, { size: 48, fill: '#fff' })).join('')}</g>`; } }
  return { bg, u };
}
// ------------------------------------------------------------------ penyusun frame
export async function frame(t) {
  const out = { A: '', U: '', web: null };
  out.A += `<rect width="1080" height="1920" fill="${NAVY}"/>`;
  const seq = (t0, t1, fn, fi = 0.3, fo = 0.3) => { if (t < t0 - 0.01 || t >= t1 + 0.01) return; const o = { A: '', U: '' }; fn(t, o); const a = (fi <= 0 ? 1 : clamp((t - t0) / fi)) * clamp((t1 - t) / fo); const dx = 3 * Math.sin(t * 0.9), dy = 4 * Math.sin(t * 0.7 + 1); out.A += op(a, `<g transform="translate(${f1(dx)} ${f1(dy)})">${o.A}</g>`); out.U += op(a, o.U); };
  seq(0, 7.2, sceneA, 0, 0.3);
  seq(6.9, 19.95, sceneB, 0.3, 0.3);
  seq(19.7, 31.2, sceneC, 0.3, 0.3);
  seq(31.0, 43.55, sceneD, 0.3, 0.3);
  seq(43.3, 50.6, (t, o) => sceneE(t, o), 0.3, 0.3);
  seq(50.3, 55.4, sceneF, 0.3, 0.3);
  seq(55.1, 61.5, sceneG, 0.3, 0.3);
  seq(61.0, 77.9, sceneH, 0.3, 0.3);
  if (t >= 77.9) sceneI(t, out);
  if (t < CUES.t_web) out.U += caption(t);
  if (t >= O0 - 0.25) {
    const o = outroState(t), ui = outroUI(t), a = seg(t, O0 - 0.25, O0 + 0.05);
    out.A = `<g opacity="${f1((1 - a) * 1000) / 1000}">${out.A}</g>`; out.U = (t < O0 + 0.05 ? `<g opacity="${f1((1 - a) * 1000) / 1000}">${out.U}</g>` : '') + ui.u;
    out.A = ui.bg + out.A;
    out.A = `<rect width="1080" height="1920" fill="${TEAL}"/>` + out.A;
    out.web = { frame: o.frame, rect: o.rect, a };
  }
  return out;
}

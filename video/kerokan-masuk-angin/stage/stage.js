// Panggung video "Kerokan bisa menyembuhkan masuk angin? Kenapa bekasnya merah?": renderFrame(t) deterministik. a = waktu audio narator asli, t = a + LEAD.
import { C, clamp, lerp, ease, easeOut, easeInOut, backOut, kf, win, seg, r1, rnd, g, rect, circ, txt, poly, cam } from './lib.js';
import { raka, rakaSvg, lerpState, idle } from '../../../brand/characters/raka/raka.js';
import { orang, orangSvg, LOOKS, idleOrang } from './orang.js';
import { W, H, FLOOR, ruang, bangku, koin, minyak, sofaBelakang, sofaDepan, cangkir, cermin, kacaPembesar, klinik, mejaKlinik, bubble } from './world.js';

await document.fonts.load('800 40px "Plus Jakarta Sans"'); await document.fonts.load('700 30px "Plus Jakarta Sans"'); await document.fonts.ready;
const DATA = await (await fetch('data.json')).json();
const LEAD = DATA.lead;
const $ = (id) => document.getElementById(id);
const camEl = $('cam');
const OUT = 'rumah';
const mixHex = (a, b, k) => { const A = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16)), B = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16)); return '#' + A.map((v, i) => Math.round(lerp(v, B[i], clamp(k, 0, 1))).toString(16).padStart(2, '0')).join(''); };
const stops = (cols, k) => { const n = cols.length - 1, x = clamp(k, 0, 1) * n, i = Math.min(n - 1, Math.floor(x)); return mixHex(cols[i], cols[i + 1], x - i); };
const mixS = (a, b, k) => lerpState(a, b, clamp(k, 0, 1));
const holdKeys = (a, keys) => {
  if (a <= keys[0][0]) return keys[0][1];
  for (let i = 0; i + 1 < keys.length; i++) if (a <= keys[i + 1][0]) return mixS(keys[i][1], keys[i + 1][1], ease((a - keys[i][0]) / (keys[i + 1][0] - keys[i][0])));
  return keys[keys.length - 1][1];
};
const speak = (a) => DATA.env[Math.round((a + LEAD) * DATA.fps)] || 0;
const speaking = (a, a0, a1) => (a >= a0 && a <= a1 ? clamp(speak(a), 0, 1) : 0);

// ================================================================ teks layar
const chipHost = $('chips');
const mkEl = (host, cls, html) => { const d = document.createElement('div'); d.className = cls; d.innerHTML = html; d.style.display = 'none'; host.appendChild(d); return d; };
const CHIPS = [
  { a0: 0.06, a1: 2.5, cls: 'big red', html: '<span>KEROKAN BISA SEMBUHKAN <em>MASUK ANGIN?</em></span>' },
  { a0: 8.3, a1: 11.3, cls: 'big q', html: '<span>ANGINNYA <em>KELUAR?</em></span>' },
  { a0: 14.6, a1: 17.3, cls: 'big blue', html: '<span>GESEKAN + TEKANAN</span>' },
  { a0: 17.4, a1: 19.7, cls: 'big green', html: '<span>RESPONS PADA KULIT</span>' },
  { a0: 19.8, a1: 23.2, cls: 'big red', html: '<span>BISA TERLIHAT <em>MERAH</em></span>' },
  { a0: 23.4, a1: 25.7, cls: 'big violet', html: '<span>BEKAS SEPERTI MEMAR</span>' },
  { a0: 26.0, a1: 30.55, cls: 'big red', html: '<span><em>MERAH</em> ≠ JUMLAH<br>ANGIN KELUAR</span>' },
  { a0: 34.8, a1: 37.65, cls: 'big', html: '<span>RASA NYAMAN BISA<br><em>BEDA-BEDA</em></span>' },
  { a0: 38.05, a1: 44.2, cls: 'big green', html: '<span>LEBIH ENAK ≠ PENYEBAB<br>PASTI TERATASI</span>' },
  { a0: 44.6, a1: 49.4, cls: 'big', html: '<span><em>MASUK ANGIN</em> = ISTILAH<br>SEHARI-HARI</span>' },
  { a0: 53.5, a1: 56.55, cls: 'big violet', html: '<span>KELUHAN MIRIP,<br>PENYEBAB BEDA</span>' },
  { a0: 57.6, a1: 62.3, cls: 'warn', html: '<span>KALAU KELUHAN <b>MENETAP</b></span>' },
  { a0: 59.1, a1: 62.3, cls: 'warn', html: '<span><b>MAKIN BERAT</b></span>' },
  { a0: 60.1, a1: 62.3, cls: 'warn', html: '<span>GEJALA <b>MENGKHAWATIRKAN</b></span>' },
  { a0: 62.4, a1: 64.8, cls: 'big green', html: '<span>PERIKSAKAN DIRI KE<br>TENAGA KESEHATAN</span>' },
  { a0: 65.6, a1: 69.7, cls: 'big red', html: '<span>SEMAKIN MERAH ≠ SEMAKIN<br>BANYAK ANGIN KELUAR</span>' },
];
const chipEls = CHIPS.map((c) => mkEl(chipHost, 'chip ' + c.cls, c.html));
function popEls(list, els, a) {
  list.forEach((c, i) => {
    const d = els[i], on = a >= c.a0 && a <= c.a1 + 0.2;
    if (!on) { d.style.display = 'none'; return; }
    d.style.display = 'inline-flex';
    const k = backOut(clamp((a - c.a0) / 0.4, 0, 1)), o = clamp((c.a1 + 0.2 - a) / 0.2, 0, 1);
    d.style.opacity = Math.min(1, (a - c.a0) / 0.12) * o;
    d.style.transform = `scale(${lerp(0.75, 1, k).toFixed(3)}) translateY(${lerp(-18, 0, clamp(k, 0, 1)).toFixed(1)}px)`;
  });
}
const capBox = $('capbox'); let capIdx = -2;
function updateCaption(a) {
  let idx = -1;
  for (let i = 0; i < DATA.caps.length; i++) if (a >= DATA.caps[i].a0 - 0.04 && a < DATA.caps[i].a1) { idx = i; break; }
  if (idx !== capIdx) { capIdx = idx; if (idx < 0) capBox.style.display = 'none'; else { capBox.style.display = 'block'; capBox.textContent = DATA.caps[idx].text; } }
}

// ================================================================ maskot Kori
const KORI_SVG = await (await fetch('kori.svg')).text();
function mkKori(host) {
  const wrap = document.createElementNS('http://www.w3.org/2000/svg', 'g'); host.appendChild(wrap);
  const inner = document.createElementNS('http://www.w3.org/2000/svg', 'g'); wrap.appendChild(inner);
  inner.innerHTML = new DOMParser().parseFromString(KORI_SVG, 'image/svg+xml').documentElement.innerHTML;
  const q = (s) => inner.querySelector(s);
  const K = { float: q('.mc-float'), eN: q('.mc-eyes-normal'), eH: q('.mc-eyes-happy'), mN: q('.mc-mouth-normal'), mH: q('.mc-mouth-happy'), mT: q('.mc-mouth-think'), arm: q('.mc-arm-right'), dots: [...inner.querySelectorAll('.mc-eyes > circle')] };
  return {
    set(a, { x = 0, y = 0, s = 1, rot = 0, o = 1, mood = 'happy', wave = 0, flip = 1 } = {}) {
      wrap.setAttribute('transform', `translate(${r1(x)} ${r1(y)}) rotate(${r1(rot)}) scale(${(Math.round(s * 1000) / 1000) * flip} ${(Math.round(s * 1000) / 1000)}) translate(-160 -290)`);
      wrap.setAttribute('opacity', o);
      K.float.setAttribute('transform', `translate(0 ${(Math.sin(a * 2.6) * 6).toFixed(1)})`);
      const happy = mood === 'happy';
      K.eN.setAttribute('opacity', happy ? 0 : 1); K.eH.setAttribute('opacity', happy ? 1 : 0); K.dots.forEach((c) => c.setAttribute('opacity', happy ? 0 : 1));
      K.mN.setAttribute('opacity', mood === 'normal' ? 1 : 0); K.mH.setAttribute('opacity', happy ? 1 : 0); if (K.mT) K.mT.setAttribute('opacity', mood === 'think' ? 1 : 0);
      if (K.arm) K.arm.setAttribute('style', `transform-box:fill-box;transform-origin:10% 60%;transform:rotate(${wave.toFixed(1)}deg)`);
    },
  };
}
const koriMain = mkKori($('koriLayer'));
const waveAt = (a) => Math.sin(a * 9) * 18 - 14;
// jadwal Kori: [mulai, selesai, x, y, skala, suasana, cermin]
const KORI = [
  [11.6, 14.0, 905, 1215, 1.3, 'happy', 1],
  [26.0, 30.75, 170, 1190, 1.15, 'happy', 1],
  [30.75, 34.6, 890, 1070, 1.2, 'think', -1],
  [34.7, 44.3, 175, 1255, 1.1, 'happy', 1],
  [44.5, 56.6, 940, 500, 0.85, 'think', -1],
  [56.7, 64.6, 540, 1030, 0.7, 'happy', 1],
  [64.6, 69.8, 830, 1100, 1.45, 'happy', -1],
];
function koriShow(a) {
  for (const [a0, a1, x, y, s, mood, fl] of KORI) {
    if (a < a0 - 0.02 || a > a1 + 0.35) continue;
    const pin = backOut(seg(a, a0, a0 + 0.5)), pout = 1 - ease(seg(a, a1, a1 + 0.3));
    const p = pin * pout, hop = Math.abs(Math.sin(a * 5)) * 10;
    koriMain.set(a, { x: x + (1 - pin) * (x < 540 ? -240 : 240), y: y - hop, s: s * Math.max(0.01, p), rot: (1 - pin) * (x < 540 ? 18 : -18), o: Math.min(1, p * 2), mood, wave: waveAt(a), flip: fl });
    return;
  }
  koriMain.set(a, { o: 0, s: 0.01 });
}

// ================================================================ pembantu gambar
const RUMAH = (o = {}) => ({ uid: 'rk', outfit: OUT, ...o });
const rakaAt = (st, { x, base, s, uid = 'rk', outfit = OUT, back = null, bare = true }) =>
  `<g transform="translate(${r1(x - 200 * s)} ${r1(base - 580 * s)}) scale(${s})">${rakaSvg(st, { bare, shadow: false, uid, outfit, back })}</g>`;
const orangAt = (st, look, { x, base, s, uid = 'o', legs = false }) =>
  `<g transform="translate(${r1(x - 200 * s)} ${r1(base - 580 * s)}) scale(${s})">${orangSvg(st, look, { bare: true, shadow: false, uid, legs })}</g>`;
const clipBelow = (id, y, inner) => `<clipPath id="${id}"><rect x="0" y="0" width="${W}" height="${y}"/></clipPath><g clip-path="url(#${id})">${inner}</g>`;
const card = (x, y, w, h, fill = '#fff', rx = 34, o = 1) => `<g opacity="${r1(o * 100) / 100}">${rect(x, y + 9, w, h, 'rgba(0,0,0,.2)', rx)}${rect(x, y, w, h, fill, rx)}</g>`;
const qmark = (x, y, sz, o = 1, r = 0) => g(txt('?', 0, 0, { size: sz, fill: '#E8665F', extra: 'stroke="#fff" stroke-width="10" paint-order="stroke"' }), { x, y, o, r });
const pill = (x, y, label, { fill = '#fff', ink = '#0A3830', size = 34, o = 1, s = 1 } = {}) => {
  const w = label.length * size * 0.56 + 44;
  return g(rect(-w / 2, -size * 0.8, w, size * 1.6, fill, size) + txt(label, 0, size * 0.36, { size, fill: ink }), { x, y, o, s });
};
/** Potret Raka (kepala dan bahu) dipotong dalam kartu: viewBox berpusat di kepala. */
const potret = (st, x, y, w, h, uid, outfit = OUT) => `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="40 52 320 320" overflow="hidden">${rakaSvg(st, { bare: true, shadow: false, uid, outfit })}</svg>`;

// ================================================================ ADEGAN A: kerokan (hook) dan D: punggung merah (dipakai ulang)
const RB = { x: 350, seat: 1200, s: 1.25 };
const IBU = { x: 668, floor: FLOOR, s: 1.0 };
const KEROK = { happyEyes: 0.85, browL: { y: -3, rot: 11 }, browR: { y: -3, rot: -11 }, mouth: { w: 22, up: 3, lo: 12 }, yaw: 0.55, tilt: -4 };
const STR_T0 = -0.25, STR_D = 0.5, STR_N = 5;
function strokePath(i) {   // sisi kanan layar: koordinat lokal punggung Raka
  const y0 = 440, span = 86, y = y0 + 22 + (span * i) / (STR_N - 0.5);
  return { p0: [210, y], c: [250, y + 2], p1: [280, y + 14] };
}
const bez = (p, u) => [(1 - u) * (1 - u) * p.p0[0] + 2 * (1 - u) * u * p.c[0] + u * u * p.p1[0], (1 - u) * (1 - u) * p.p0[1] + 2 * (1 - u) * u * p.c[1] + u * u * p.p1[1]];
function strokeState(a) {  // posisi koin (lokal punggung) dan kemajuan garis sisi kanan
  const k = (a - STR_T0) / STR_D, i = clamp(Math.floor(k), 0, STR_N - 1), f = k - Math.floor(k);
  if (a < STR_T0) { const p = strokePath(0); return { pt: p.p0, drawn: 0, active: true }; }
  if (k >= STR_N) { const p = strokePath(STR_N - 1), e = ease(seg(a, STR_T0 + STR_N * STR_D, STR_T0 + STR_N * STR_D + 0.35)); return { pt: [p.p1[0] + 30 * e, p.p1[1] - 40 * e], drawn: 1, active: e < 1 }; }
  const p = strokePath(i);
  if (f < 0.8) { const u = easeInOut(f / 0.8); return { pt: bez(p, u), drawn: (i + u) / STR_N, active: true }; }
  const nxt = strokePath(Math.min(STR_N - 1, i + 1)), e = ease((f - 0.8) / 0.2);
  return { pt: [lerp(p.p1[0], nxt.p0[0], e), lerp(p.p1[1], nxt.p0[1], e) - 10 * Math.sin(Math.PI * e)], drawn: (i + 1) / STR_N, active: true };
}
function sceneKerok(a, t) {
  const sw = Math.sin(a * 12.6);
  const st = idle(raka('netral', 'netral', { ...KEROK, lean: sw * 1.3, bob: Math.abs(sw) * -2 }), t);
  const ss = strokeState(a);
  let s = ruang(t);
  s += bangku(RB.x, RB.seat + 12, 340);
  s += clipBelow('cpA', RB.seat + 14, rakaAt(st, { x: RB.x, base: RB.seat, s: RB.s, uid: 'rkA', back: { lift: 1, marks: 0.85, drawnL: 1, drawnR: ss.drawn, turn: 0.95, oil: 1 } }));
  // koin di tangan Ibu menyentuh punggung
  const cx = RB.x + (ss.pt[0] - 200) * RB.s, cy = RB.seat + (ss.pt[1] - 580) * RB.s;
  const wx = 200 + (cx - IBU.x) / IBU.s + 22, wy = 778 + (cy - IBU.floor) / IBU.s - 2;
  const ibu = orang(a % 1.9 < 1.5 ? 'peduli' : 'senyum', 'berdiri', { yaw: -0.85, gazeX: -0.9, tilt: 3, armL: { wx, wy, ex: (104 + wx) / 2 + 6, ey: (410 + wy) / 2 + 46, finger: 0, front: 1 }, armR: { wx: 292, wy: 560, ex: 306, ey: 490, finger: 0, front: 0 } });
  s += orangAt(idleOrang(ibu, t), LOOKS.ibu, { x: IBU.x, base: IBU.floor - 778 * IBU.s + 580 * IBU.s, s: IBU.s, uid: 'ibuA', legs: true });
  s += koin(cx + 2, cy, 24, a * 120);
  s += minyak(176, RB.seat + 14, 0.9);
  return cam(s, lerp(1.04, 1.1, ease(seg(a, -0.6, 2.7))), 500, 1250);
}

// ================================================================ ADEGAN B: cermin (kaget)
function sceneCermin(a, t) {
  const kag = ease(seg(a, 2.75, 3.1));
  const st = idle(holdKeys(a, [[2.5, raka('netral', 'netral', { ...KEROK, happyEyes: 0.4, yaw: 0.2, wide: 0 })], [3.0, raka('kaget', 'netral', { yaw: 0.35, gazeX: 0.5 })], [4.9, raka('kaget', 'netral', { yaw: 0.35, gazeX: 0.5 })]]), t);
  const refl = clipBelow('cpB', 1380, rakaAt(st, { x: 540, base: 1370, s: 1.5, uid: 'rkB', back: { lift: 1, marks: 0.9, drawnL: 1, drawnR: 1, turn: 1, oil: 0.7 } }));
  let s = ruang(t, { glow: 0.5 });
  s += cermin(190, 360, 700, 1020, refl, t, 0.0);
  // tanda seru kaget di sisi cermin
  const k = backOut(seg(a, 2.95, 3.4)) * (1 - ease(seg(a, 4.4, 4.8)));
  [[130, 560, -14], [950, 600, 14], [150, 760, -8]].forEach(([x, y, r], i) => { s += qmark(x, y, 120 - i * 14, k, r).replace('?', '!'); });
  const z = lerp(1.0, 1.1 + 0.04 * kag, ease(seg(a, 2.55, 4.9)));
  return cam(s, z, 540, 900);
}

// ================================================================ ADEGAN C/H: sofa, lega dan hangat
const MUG_L = { wx: 150, wy: 520, ex: 100, ey: 500, finger: 0, front: 1 }, MUG_R = { wx: 250, wy: 520, ex: 300, ey: 500, finger: 0, front: 1 };
function sceneSofa(a, t, { zoom = [1.0, 1.06], a0 = 4.8, a1 = 8.4, bubbleQ = false } = {}) {
  const lega = raka('lega', 'netral', { armL: MUG_L, armR: MUG_R, tilt: -3 });
  const st = idle(lega, t);
  const sy = 1160, s0 = 1.3;
  let s = ruang(t);
  s += sofaBelakang(sy);
  s += rakaAt(st, { x: 540, base: sy + 4, s: s0, uid: 'rkS' });
  s += cangkir(540, sy - 60 * s0 + 4, t, 1) .replace('<g transform="translate(', '<g transform="translate(') ;
  s += sofaDepan(sy, t);
  if (bubbleQ) {
    const k = backOut(seg(a, 31.2, 31.7));
    s += g(card(0, 0, 330, 120, '#fff', 60) + txt('kenapa ya?', 165, 78, { size: 46, fill: '#0A3830' }), { x: 160, y: 520, o: k, s: k });
  }
  return cam(s, lerp(zoom[0], zoom[1], ease(seg(a, a0, a1))), 540, 900);
}

// ================================================================ ADEGAN D: punggung merah, "ANGINNYA KELUAR?", kaca pembesar Kori
const RD = { x: 450, seat: 1250, s: 1.5 };
const LENS = { x: 540, y: 1120, r: 150 };
const lensZoom = (a) => 1 + 1.8 * easeInOut(seg(a, 12.9, 14.45));
function skinLens(t, a) {   // isi lensa: kulit tampak atas dengan garis kerokan (awal masuk ke ilustrasi kulit)
  const r = LENS.r;
  let s = `<clipPath id="lensClip"><circle cx="0" cy="0" r="${r}"/></clipPath><g clip-path="url(#lensClip)">` + circ(0, 0, r, '#F4B98C');
  for (let i = 0; i < 3; i++) s += `<path d="M${-r} ${-60 + i * 60}Q0 ${-50 + i * 60} ${r} ${-72 + i * 60}" fill="none" stroke="#D9453D" stroke-width="34" stroke-linecap="round" opacity=".8"/>`;
  s += `</g>`;
  return s;
}
function sceneBelakang(a, t) {
  const stBase = raka('bingung', 'netral', { yaw: 0.25, gazeX: 0.6, gazeY: -0.5, tilt: 4 });
  const stCur = holdKeys(a, [[8.1, stBase], [11.6, stBase], [12.2, raka('berpikir', 'netral', { yaw: 0.35, gazeX: 0.7, gazeY: -0.4, tilt: 5 })]]);
  const st = idle(stCur, t);
  let s = ruang(t);
  s += bangku(RD.x, RD.seat + 12, 330);
  s += clipBelow('cpD', RD.seat + 14, rakaAt(st, { x: RD.x, base: RD.seat, s: RD.s, uid: 'rkD', back: { lift: 1, marks: 0.95, drawnL: 1, drawnR: 1, turn: 0.9, oil: 0.6 } }));
  // tanda tanya melayang di sekitar kepala
  const qk = ease(seg(a, 8.4, 8.9)) * (1 - ease(seg(a, 11.7, 12.1)));
  if (qk > 0.01) [[300, 560, -12, 120], [640, 520, 10, 100], [790, 700, 16, 86]].forEach(([x, y, r, sz], i) => { s += qmark(x, y + Math.sin(t * 3 + i) * 12, sz, qk, r); });
  // kaca pembesar masuk dari kanan (11,7 - 12,4), lalu memandu masuk ke kulit
  const lk = backOut(seg(a, 11.7, 12.35)), lo = lk * (1 - ease(seg(a, 14.2, 14.5)));
  if (lo > 0.01) {
    const lx = lerp(1100, LENS.x, easeOut(seg(a, 11.7, 12.3))), ly = LENS.y + Math.sin(t * 3) * 5;
    s += kacaPembesar(lx, ly, LENS.r, 35, skinLens(t, a)).replace('<g transform', `<g opacity="${r1(lo * 100) / 100}" transform`);
  }
  const z = lensZoom(a);
  return cam(s, lerp(1.0, 1.06, ease(seg(a, 8.1, 12.9))) * z, LENS.x, LENS.y);
}

// ================================================================ ADEGAN F: penampang kulit (bagian dalam, animasi)
const BGIN = '#12313F';
const insideBg = (t) => {
  let s = rect(0, 0, W, H, BGIN);
  for (let i = 0; i < 12; i++) s += circ(70 + ((i * 197) % 940), 260 + ((i * 331) % 1400) + Math.sin(t * 0.8 + i) * 10, 10 + (i % 3) * 8, '#6DBBA8', 'opacity=".12"');
  return s;
};
const PASS = [[14.7, 16.15], [16.25, 17.7], [17.8, 19.25]];
const LANE_Y = [540, 610, 680];
const X0 = 170, X1 = 860;
function redness(a) { return kf(a, [[14.6, 0.05], [17.3, 0.3], [19.9, 0.55], [23.4, 0.8], [25.6, 1.0]], (u) => u); }
const SKIN_STOPS = ['#F4B98C', '#EE8F7C', '#D9453D', '#B3324F'];
function topCard(a, t, { y = 470, scale = 1, lanes = true } = {}) {
  const x = 100, w = 880, h = 290, R = redness(a);
  let s = card(x, y, w, h, '#F4B98C', 36);
  s += `<clipPath id="tc${y}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="36"/></clipPath><g clip-path="url(#tc${y})">`;
  for (let i = 0; i < 40; i++) s += circ(x + 20 + rnd(i) * (w - 40), y + 20 + rnd(i + 50) * (h - 40), 2 + rnd(i + 9) * 3, '#C98B62', 'opacity=".25"');
  let coinTop = '';
  PASS.forEach(([p0, p1], i) => {
    const pp = seg(a, p0, p1), ly = y + (LANE_Y[i] - 470) + 20;
    if (pp <= 0) return;
    const cx = lerp(X0, X1, ease(pp)), col = stops(SKIN_STOPS, R);
    s += `<path d="M${X0} ${ly}H${r1(cx)}" stroke="#fff" stroke-opacity="${r1(0.22 * (1 - ease(seg(a, 19.3, 21))) * 100) / 100}" stroke-width="86" stroke-linecap="round" fill="none"/>`;
    s += `<path d="M${X0} ${ly}H${r1(cx)}" stroke="${col}" stroke-width="46" stroke-linecap="round" fill="none" opacity="${r1(0.9) }"/>`;
    if (pp < 1) coinTop = koin(cx + 10, ly, 36, cx * 2);
  });
  s += coinTop + `</g>` + txt('TAMPAK ATAS', x + 6, y - 12, { size: 30, fill: '#9DE0BD', anchor: 'start', weight: 800 });
  return s;
}
const AIR = '#E9F3F6';
function sectionPanel(a, t, { y = 820 } = {}) {
  const x = 100, w = 880, h = 440, R = redness(a), D = ease(seg(a, 16.9, 19.6));
  const top = y + 90, epiH = 50, derm = top + epiH, fat = y + 320;
  let s = card(x, y, w, h, AIR, 36);
  s += `<clipPath id="sp"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="36"/></clipPath><g clip-path="url(#sp)">`;
  // lemak, dermis, epidermis
  s += rect(x, fat, w, y + h - fat, '#F6D88C');
  for (let i = 0; i < 18; i++) s += `<ellipse cx="${x + 30 + (i % 9) * 100 + (Math.floor(i / 9) ? 50 : 0)}" cy="${fat + 38 + Math.floor(i / 9) * 56}" rx="34" ry="22" fill="#F9E7B0" stroke="#EBC76B" stroke-width="4"/>`;
  s += rect(x, derm, w, fat - derm, '#F2A98B') + rect(x, top, w, epiH, '#F9CBA3');
  // pembuluh darah kecil: lengkung kapiler di bawah epidermis, dua pembuluh mendatar, cabang penghubung
  const vc = '#C23B3B', wd = (a0, a1) => lerp(a0, a1, D);
  s += `<g fill="none" stroke-linecap="round" stroke="${vc}">`;
  for (let k = 0; k < 9; k++) {
    const vx = x + 55 + k * 96;
    s += `<path d="M${vx - 10} ${top + 10}V${top + 62}Q${vx - 10} ${top + 78} ${vx} ${top + 78}Q${vx + 10} ${top + 78} ${vx + 10} ${top + 62}V${top + 10}" stroke-width="${r1(wd(7, 13))}"/>`;
    s += `<path d="M${vx} ${top + 78}V${y + 245}" stroke-width="${r1(wd(5, 9))}"/>`;
  }
  s += `<path d="M${x} ${y + 245}H${x + w}" stroke-width="${r1(wd(16, 28))}"/><path d="M${x} ${y + 285}H${x + w}" stroke-width="${r1(wd(10, 18))}" opacity=".85"/></g>`;
  for (let i = 0; i < 8; i++) { const fx = x + ((t * 150 + i * 118) % w); s += circ(fx, y + 245, wd(3.5, 6), '#F7A9A0', 'opacity=".75"'); }
  // warna merah menjalar di kulit setelah koin lewat
  const cover = lerp(x, x + w, ease(seg(a, 14.8, 19.4)));
  s += rect(x, top, cover - x, fat - top, '#D83F3F', 0, `opacity="${r1(0.62 * R * 100) / 100}"`);
  const mem = ease(seg(a, 23.4, 25.3));
  if (mem > 0.01) s += `<path d="M500 ${top + 6}C520 ${top - 6} 640 ${top - 6} 690 ${top + 8}C730 ${top + 44} 700 ${top + 92} 640 ${top + 92}C560 ${top + 100} 490 ${top + 70} 500 ${top + 6}Z" fill="#8E2E5A" opacity="${r1(0.5 * mem * 100) / 100}"/>`;
  // minyak dan koin (tampak samping)
  s += rect(x, top - 8, w, 8, '#F8E7A0', 4, 'opacity=".9"');
  let active = null;
  PASS.forEach(([p0, p1]) => { if (a >= p0 && a < p1) active = lerp(X0, X1, ease(seg(a, p0, p1))); });
  if (active != null || (a >= 14.55 && a < 14.7)) {
    const cx = active ?? X0, press = 0.5 + 0.5 * Math.sin(t * 14);
    s += `<g transform="translate(${r1(cx)} ${top - 8})">${rect(-72, -40, 144, 32, '#C9CED6', 14)}${rect(-72, -40, 144, 8, '#E9ECF0', 4)}${rect(-72, -16, 144, 8, '#9AA2AE', 4)}</g>`;
    // panah tekanan (turun) dan gesekan (searah gerak, di permukaan)
    const arr = (px, py, dx, dy, col) => `<path d="M${r1(px)} ${r1(py)}l${dx} ${dy}" stroke="${col}" stroke-width="10" stroke-linecap="round"/>`;
    for (const o of [-38, 38]) s += arr(cx + o, top - 130 + press * 8, 0, 64, '#2A57B2') + `<path d="M${r1(cx + o - 14)} ${r1(top - 74 + press * 8)}l14 16l14 -16" fill="none" stroke="#2A57B2" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>`;
    s += `<path d="M${r1(cx - 120)} ${top + 24}h-70" stroke="#E8665F" stroke-width="10" stroke-linecap="round"/><path d="M${r1(cx - 140)} ${top + 6}l-24 18l24 18" fill="none" stroke="#E8665F" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  // gelombang respons di sekitar pembuluh saat melebar
  const rp = seg(a, 17.4, 19.6) * (1 - ease(seg(a, 19.6, 20.2)));
  if (rp > 0.01) for (let i = 0; i < 3; i++) { const u = (t * 0.9 + i / 3) % 1; s += circ(x + 440 + (i - 1) * 190, y + 245, 30 + u * 60, 'none', `stroke="#fff" stroke-width="6" opacity="${r1((1 - u) * 0.6 * rp * 100) / 100}"`); }
  s += `</g>`;
  // label kecil
  const lab = (tx, ty, str, o = 1) => txt(str, tx, ty, { size: 27, fill: '#7A2E24', anchor: 'start', weight: 800, extra: `opacity="${r1(o * 100) / 100}"` });
  s += txt('TAMPAK SAMPING', x + 6, y - 12, { size: 30, fill: '#9DE0BD', anchor: 'start', weight: 800 });
  const lp = (str, lx, ly) => rect(lx, ly - 26, str.length * 15 + 26, 38, 'rgba(255,255,255,.82)', 19) + txt(str, lx + 13, ly, { size: 24, fill: '#5A3A2B', anchor: 'start', weight: 800 });
  s += lp('epidermis', x + 14, top + 34) + lp('dermis', x + 14, derm + 150) + lp('lemak', x + 14, fat + 60);
  const lb = ease(seg(a, 17.3, 17.8)) * (1 - ease(seg(a, 19.6, 20.0)));
  if (lb > 0.01) s += g(rect(0, 0, 360, 56, '#fff', 28) + txt('pembuluh darah kecil', 180, 38, { size: 28, fill: '#7A2E24' }), { x: x + 410, y: y + 188, o: lb, s: 0.9 + 0.1 * lb });
  return s;
}
function sceneKulit(a, t) {
  const rIris = (LENS.r + 14) * lensZoom(a) * (1 + 7 * easeInOut(seg(a, 13.7, 14.5)));
  let s = '';
  const inner = insideBg(t) + topCard(a, t) + sectionPanel(a, t);
  // slide keluar menuju adegan "merah bukan ukuran" (25,8 - 26,2)
  const out = ease(seg(a, 25.75, 26.25));
  const body = `<g transform="translate(0 ${r1(out * 1500)})">${inner}</g>`;
  if (a < 14.6) s += `<clipPath id="iris"><circle cx="${LENS.x}" cy="${LENS.y}" r="${r1(rIris)}"/></clipPath><g clip-path="url(#iris)">${body}</g>`;
  else s += body;
  return s;
}

// ================================================================ ADEGAN G: merah bukan ukuran angin
function sceneBeda(a, t) {
  let s = insideBg(t);
  const sw = [['merah tipis', '#EE8F7C'], ['merah sedang', '#D9453D'], ['merah tua', '#B3324F']];
  sw.forEach(([lab, col], i) => {
    const k = backOut(seg(a, 26.2 + i * 0.6, 26.65 + i * 0.6)), x = 85 + i * 275;
    let c = card(x, 480, 250, 220, '#F4B98C', 30);
    c += `<clipPath id="sw${i}"><rect x="${x}" y="480" width="250" height="220" rx="30"/></clipPath><g clip-path="url(#sw${i})">` + [0, 1, 2].map((j) => `<path d="M${x - 10} ${540 + j * 62}H${x + 270}" stroke="${col}" stroke-width="40" stroke-linecap="round"/>`).join('') + `</g>`;
    c += pill(x + 125, 740, lab, { size: 30 });
    s += g(c, { x: x + 125, y: 590, s: k, o: Math.min(1, k * 2), ox: x + 125, oy: 590 });
  });
  const ne = backOut(seg(a, 28.0, 28.5));
  s += g(txt('≠', 0, 0, { size: 190, fill: '#F2735E', extra: 'stroke="#fff" stroke-width="12" paint-order="stroke"' }), { x: 480, y: 930, s: ne, o: Math.min(1, ne * 2) });
  const dk = backOut(seg(a, 28.6, 29.1));
  const dash = `<rect x="0" y="0" width="520" height="230" rx="40" fill="rgba(255,255,255,.08)" stroke="#9DE0BD" stroke-width="6" stroke-dasharray="22 14"/>`
    + `<path d="M120 150Q170 150 200 120Q230 90 270 110M120 110Q160 80 200 60Q240 40 270 70" fill="none" stroke="#9DE0BD" stroke-width="12" stroke-linecap="round" transform="translate(-30 20)"/>`
    + txt('angin keluar?', 365, 150, { size: 42, fill: '#fff' }) + qmark(455, 75, 100, 1, 12);
  s += g(dash, { x: 610, y: 1115, s: dk, o: Math.min(1, dk * 2), ox: 260, oy: 115 });
  return s;
}

// ================================================================ ADEGAN I: papan Kori (nyaman beda-beda, belum cukup memastikan)
function sceneNyaman(a, t) {
  let s = rect(-40, -40, 1160, 2000, '#FBF3E2') + circ(940, 340, 260, '#EAF3E0') + circ(110, 1500, 300, '#EAF3E0');
  const phase2 = ease(seg(a, 37.85, 38.35));
  const CARDS = [['Lebih nyaman', raka('lega', 'netral')], ['Biasa saja', raka('netral', 'netral')], ['Masih kurang enak', raka('khawatir', 'netral')]];
  CARDS.forEach(([lab, st], i) => {
    const k = backOut(seg(a, 34.75 + i * 0.5, 35.2 + i * 0.5)), x = 60 + i * 300;
    let c = card(x, 500, 280, 400, '#fff', 30) + potret(idle(st, t + i), x + 10, 520, 260, 260, 'pn' + i) + txt(lab, x + 140, 852, { size: 32, fill: '#0A3830' });
    if (i === 0) { /* tetap untuk fase 2 */ }
    s += g(c, { x: x + 140, y: 700, s: i === 0 ? lerp(k, 0, phase2) : k * (1 - phase2), o: (i === 0 ? 1 - phase2 : (1 - phase2)) * Math.min(1, k * 2), ox: x + 140, oy: 700 });
  });
  if (phase2 > 0.01) {
    const k = backOut(seg(a, 38.0, 38.5));
    // kiri: rasa lebih enak; kanan: penyebab keluhan sudah teratasi?
    const L = card(70, 480, 340, 440, '#fff', 34) + potret(idle(raka('lega', 'netral'), t), 90, 500, 300, 300, 'pl') + pill(240, 860, 'rasa lebih enak', { size: 32 });
    s += g(L, { x: 240, y: 700, s: k, o: Math.min(1, k * 2), ox: 240, oy: 700 });
    const ne = backOut(seg(a, 39.9, 40.4));
    s += g(txt('≠', 0, 0, { size: 150, fill: '#F2735E', extra: 'stroke="#fff" stroke-width="10" paint-order="stroke"' }), { x: 485, y: 730, s: ne, o: Math.min(1, ne * 2) });
    const k2 = backOut(seg(a, 40.6, 41.1));
    const lens = `<circle cx="170" cy="190" r="74" fill="#EAF6F9" stroke="#F8C038" stroke-width="16"/><path d="M222 242l52 52" stroke="#8A5A33" stroke-width="22" stroke-linecap="round"/>` + txt('?', 170, 226, { size: 100, fill: '#E8665F' });
    const R2 = card(560, 480, 340, 440, '#fff', 34) + `<g transform="translate(560 440)">${lens}</g>` + pill(730, 860, 'penyebab teratasi?', { size: 29 });
    s += g(R2, { x: 730, y: 700, s: k2, o: Math.min(1, k2 * 2), ox: 730, oy: 700 });
  }
  return s;
}

// ================================================================ ADEGAN J: apa itu "masuk angin"
const SYM = [
  { lab: 'Badan pegal', a0: 49.55, st: () => raka('perih', 'netral', { tears: 0, blink: 0.2, happyEyes: 0.3 }), col: '#FFF1DA' },
  { lab: 'Kembung', a0: 50.85, st: null, col: '#E3F4E8' },
  { lab: 'Nggak enak badan', a0: 51.55, st: () => raka('ngantuk', 'netral', { sweat: 0.7 }), col: '#E8EEFB' },
];
const tummy = (t) => `<g transform="translate(70 70)"><circle r="62" fill="#F7BC8E"/><ellipse cx="0" cy="14" rx="46" ry="42" fill="#F2A98B"/><circle cx="0" cy="22" r="5" fill="#C98B62"/>${[[-34, -38, 9], [30, -44, 12], [44, -14, 7]].map(([x, y, r], i) => circ(x, y + Math.sin(t * 4 + i) * 4, r, '#fff', 'opacity=".85"')).join('')}</g>`;
function sceneMasukAngin(a, t) {
  let s = rect(-40, -40, 1160, 2000, '#E9F6EF') + circ(960, 1300, 280, '#D6EEDF') + circ(80, 400, 200, '#D6EEDF');
  const p2 = ease(seg(a, 53.25, 53.8));
  const hk = backOut(seg(a, 44.9, 45.4));
  s += g(card(0, 0, 640, 130, '#fff', 65) + txt('MASUK ANGIN', 320, 86, { size: 62, fill: '#0A3830' }) + `<circle cx="80" cy="150" r="14" fill="#fff"/><circle cx="50" cy="180" r="9" fill="#fff"/>`, { x: 410, y: 505, s: hk, o: Math.min(1, hk * 2) * (1 - p2), ox: 320, oy: 65 });
  SYM.forEach((c, i) => {
    const k = backOut(seg(a, c.a0, c.a0 + 0.45)), y = 660 + i * 225;
    let ic = '';
    if (c.st) ic = potret(idle(c.st(), t + i), 0, 0, 120, 120, 'sy' + i); else ic = `<g transform="scale(.9) translate(8 8)">${tummy(t)}</g>`;
    const body = card(0, 0, 720, 190, c.col, 40) + `<g transform="translate(28 34)">${rect(0, 0, 122, 122, '#fff', 61)}<clipPath id="syc${i}"><circle cx="61" cy="61" r="61"/></clipPath><g clip-path="url(#syc${i})" transform="translate(1 1)">${ic}</g></g>` + txt(c.lab, 196, 118, { size: 52, fill: '#0A3830', anchor: 'start' });
    s += g(body, { x: 90 + 360, y: y + 95, s: k * (1 - p2), o: Math.min(1, k * 2) * (1 - p2), ox: 360, oy: 95 });
  });
  // fase 2: keluhan mirip, penyebab berbeda
  if (p2 > 0.01) {
    const ka = backOut(seg(a, 53.6, 54.1));
    s += g(card(0, 0, 300, 330, '#fff', 40) + potret(idle(raka('khawatir', 'netral'), t), 20, 10, 260, 250, 'ma') + pill(150, 290, 'keluhan mirip', { size: 31 }), { x: 250, y: 930, s: ka, o: Math.min(1, ka * 2) * p2, ox: 150, oy: 165 });
    [['#6F4CC4', 'A', 640], ['#F5941F', 'B', 800], ['#2A57B2', 'C', 960]].forEach(([col, lb, yy], i) => {
      const kk = backOut(seg(a, 54.5 + i * 0.35, 54.95 + i * 0.35)), cy = 660 + i * 190;
      s += `<path d="M410 935Q480 ${cy + 65} 545 ${cy + 65}" fill="none" stroke="#7A8F8A" stroke-width="7" stroke-linecap="round" stroke-dasharray="14 12" opacity="${r1(kk * 100) / 100}"/>`;
      s += g(card(0, 0, 350, 130, col, 36) + txt('?', 70, 98, { size: 92, fill: '#fff' }) + txt('penyebab ' + lb, 210, 80, { size: 36, fill: '#fff' }), { x: 545, y: cy, s: kk, o: Math.min(1, kk * 2), ox: 0, oy: 65 });
    });
  }
  return s;
}

// ================================================================ ADEGAN K: bertemu tenaga kesehatan
function sceneKlinik(a, t) {
  const dy = 1190;
  const rk = holdKeys(a, [[56.6, raka('khawatir', 'netral', { yaw: 0.4, armL: { wx: 108, wy: 540, ex: 90, ey: 520, finger: 0, front: 1 }, armR: { wx: 292, wy: 540, ex: 310, ey: 520, finger: 0, front: 1 } })], [62.2, raka('khawatir', 'netral', { yaw: 0.4 })], [63.2, raka('lega', 'netral', { yaw: 0.4 })]]);
  const talkR = speaking(a, 57.6, 62.1) > 0 ? { mouth: { w: 13, up: 3, lo: 6 + 12 * speaking(a, 57.6, 62.1) } } : {};
  const rst = idle({ ...rk, ...talkR }, t);
  const doc = orang(a > 62.3 ? 'peduli' : 'netral', a > 62.3 ? 'jelaskan' : 'simak', { yaw: -0.4 });
  let s = klinik(t);
  s += rakaAt(rst, { x: 320, base: dy + 4, s: 1.2, uid: 'rkK', outfit: 'harian' });
  s += orangAt(idleOrang(doc, t), LOOKS.dokterPria, { x: 770, base: dy + 4, s: 1.2, uid: 'dkK' });
  s += mejaKlinik(dy);
  s += g(rect(-120, 0, 240, 28, '#F4EBD8', 6) + rect(-100, -62, 200, 62, '#fff', 8) + rect(-84, -44, 130, 8, '#B9C7C2', 4) + rect(-84, -26, 90, 8, '#B9C7C2', 4), { x: 540, y: dy + 20 });
  return cam(s, lerp(1.0, 1.06, ease(seg(a, 56.6, 64.6))), 540, 900);
}

// ================================================================ ADEGAN L: kesimpulan (punggung semakin merah, bukan ukuran angin)
function sceneRekap(a, t) {
  const st = idle(holdKeys(a, [[64.5, raka('berpikir', 'netral', { yaw: 0.4, gazeX: 0.5, tilt: 3 })], [66.5, raka('lega', 'netral', { yaw: 0.4, gazeX: 0.4, tilt: -2 })]]), t);
  let s = ruang(t);
  s += bangku(400, 1280, 330);
  s += clipBelow('cpL', 1270, rakaAt(st, { x: 400, base: 1260, s: 1.5, uid: 'rkL', back: { lift: 1, marks: 0.65 + 0.35 * ease(seg(a, 65.6, 68.5)), drawnL: 1, drawnR: 1, turn: 0.9, oil: 0.5 } }));
  return cam(s, lerp(1.0, 1.05, ease(seg(a, 64.5, 69.8))), 480, 1000);
}

// ================================================================ kartu akhir
const popCss = (d, k, dy = 24) => { const kk = backOut(k); d.style.opacity = clamp(k * 4, 0, 1); d.style.transform = `scale(${lerp(0.85, 1, kk).toFixed(3)}) translateY(${lerp(dy, 0, clamp(kk, 0, 1)).toFixed(1)}px)`; };
$('er1').textContent = 'BELAJAR BARENG MEDCOEL'; $('er2').innerHTML = 'GRATIS DI <b>medcoel.com</b>';
const endSvg = $('endsvg'); endSvg.innerHTML = '<g id="rakaEnd"></g>';
const koriEnd = mkKori(endSvg);
function updateEnd(a, t) {
  const endK = ease(seg(a, 69.75, 70.2));
  $('end').style.opacity = endK.toFixed(3);
  if (endK <= 0) return;
  const lk = backOut(seg(a, 69.9, 70.5)); const lg = $('elogo'); lg.style.transform = `scale(${lerp(0.7, 1, lk).toFixed(3)})`; lg.style.opacity = clamp((a - 69.85) / 0.3, 0, 1);
  popCss($('er1'), seg(a, 72.0, 72.45), 24); popCss($('er2'), seg(a, 73.7, 74.15), 24);
  const rk = clamp((a - 70.2) / 0.5, 0, 1);
  const rs = idle(raka('senang', 'sapa'), t); rs.armR = { ...rs.armR, wx: rs.armR.wx + Math.sin(a * 8) * 10 };
  $('rakaEnd').innerHTML = `<g transform="translate(300 1500) scale(${(0.88 * backOut(rk)).toFixed(3)}) translate(-200 -778)" opacity="${rk}">${rakaSvg(rs, { bare: true, shadow: true, uid: 'endraka', outfit: 'harian' })}</g>`;
  const kr = backOut(clamp((a - 70.4) / 0.5, 0, 1));
  koriEnd.set(a, { x: 740, y: 1460, s: 1.8 * kr, o: kr, mood: 'happy', wave: waveAt(a) });
}

// ================================================================ render utama
const SCENES = [
  { a0: -1, a1: 2.85, fn: sceneKerok },
  { a0: 2.55, a1: 5.0, fn: sceneCermin, f: [2.55, 2.75] },
  { a0: 4.75, a1: 8.45, fn: (a, t) => sceneSofa(a, t, { a0: 4.8, a1: 8.4 }), f: [4.75, 4.95] },
  { a0: 8.1, a1: 14.8, fn: sceneBelakang, f: [8.1, 8.3] },
  { a0: 13.25, a1: 26.4, fn: sceneKulit },
  { a0: 25.8, a1: 31.0, fn: sceneBeda, f: [25.85, 26.1] },
  { a0: 30.6, a1: 34.9, fn: (a, t) => sceneSofa(a, t, { zoom: [1.06, 1.12], a0: 30.8, a1: 34.6, bubbleQ: true }), f: [30.6, 30.85] },
  { a0: 34.5, a1: 44.6, fn: sceneNyaman, f: [34.5, 34.75] },
  { a0: 44.3, a1: 56.8, fn: sceneMasukAngin, f: [44.3, 44.55] },
  { a0: 56.5, a1: 64.8, fn: sceneKlinik, f: [56.5, 56.75] },
  { a0: 64.4, a1: 70.2, fn: sceneRekap, f: [64.4, 64.65] },
];
window.renderFrame = async function (t) {
  const a = t - LEAD;
  let svg = '';
  SCENES.forEach((sc) => {
    if (a < sc.a0 || a > sc.a1) return;
    const o = sc.f ? ease(seg(a, sc.f[0], sc.f[1])) : 1;
    if (o <= 0.002) return;
    svg += o < 0.999 ? `<g opacity="${o.toFixed(3)}">${sc.fn(a, t)}</g>` : sc.fn(a, t);
  });
  camEl.innerHTML = svg;
  koriShow(a);
  popEls(CHIPS, chipEls, a);
  updateCaption(a); updateEnd(a, t);
  $('fade').style.opacity = '0';
  window.__t = t;
};
window.__ready = true;

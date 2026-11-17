// "SESEORANG KOLAPS DI KAMPUS: LANGKAH AWAL" (1080 x 1920, 30 fps). Ringkasan langkah awal PPGD, bukan pengganti pelatihan praktik.
// 0-31 dtk: cerita tanpa narator (koridor pixel; Raka kanonik dari brand/characters/raka/raka.js; korban dewasa dan teman memakai konstruksi/palet Raka). 31-43,5 dtk: outro rekaman web MEDCOEL asli + narasi.
// Lapisan dunia (SVG) digambar ke kanvas 360x640 lalu diperbesar tanpa pelicin (pixel); teks, kapsul, dan rekaman web digambar tajam di atasnya. Semua waktu dari ../cues.json.
import { raka, rakaSvg, lerpState, walkCycle, PALETTE_DOSEN, PALETTE_KAKAK } from '/brand/characters/raka/raka.js';
import { f1, clamp, lerp, sm, eo, ei, eio } from './core.js';
import { corridor, aed, padIcon, phone, dust, pxShadow, PX, FLOOR_Y } from './world.js';
import { outroUI, outroNeeds } from './outro.js';
const $ = (id) => document.getElementById(id);
const C = await (await fetch('../cues.json')).json();
await document.fonts.load('400 30px "Press Start 2P"'); await document.fonts.load('800 40px "Plus Jakarta Sans"'); await document.fonts.load('700 30px "Plus Jakarta Sans"'); await document.fonts.ready;
export const DUR = C.dur;
const FONT = "'Plus Jakarta Sans', system-ui, sans-serif";
const win = (t, a, b, f = 0.25) => clamp((t - a) / f) * clamp((b - t) / f);
const R = (x, y, w, h, f, e = '') => `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" fill="${f}" ${e}/>`;

// ------------------------------------------------------------------ penempatan (koordinat layar 1080 x 1920)
const S = 0.74, BZ = 1.2, BX = 540, BY = 1190;
const Wp = (x, y) => [BX + (x - BX) * BZ, BY + (y - BY) * BZ];                                        // skala Raka/teman/korban (satu skala untuk semua tokoh dewasa)
const FY = 1296;                                       // lantai tempat kaki berdiri
const LY = { s: S, tx: 217, ty: 1009, chestX: 520, topY: 1098, floorY: 1316 };   // korban berbaring (kepala di kanan, hasil cermin)
const VICTIM = { palette: PALETTE_DOSEN, logo: false, shadow: false };
const FRIEND = { palette: PALETTE_KAKAK, logo: false, shadow: false };
// ------------------------------------------------------------------ pembantu sprite
function stand(state, opts, x, fy, scale = S, flipX = false) {
  const svg = rakaSvg(state, { ...opts, bare: true });
  return `<g transform="translate(${f1(x)} ${f1(fy)}) ${flipX ? 'scale(-1 1)' : ''} translate(${f1(-200 * scale)} ${f1(-778 * scale)}) scale(${scale})">${svg}</g>`;
}
const faceSerious = { browL: { y: 3, rot: -9 }, browR: { y: 3, rot: 9 }, mouth: { w: 11, up: 2, lo: 3 } };
const faceWorry = { wide: 0.25, browL: { y: -6, rot: 14 }, browR: { y: -6, rot: -14 }, mouth: { w: 11, up: -3, lo: 0 } };
const ARM_STRAIGHT = (wx, wy, side) => { const sx = side === 'L' ? 104 : 296, sy = 410; return { wx, wy, ex: (sx + wx) / 2, ey: (sy + wy) / 2, finger: 0, front: 1 }; };
// korban berbaring: badan (bisa 'ditekan') dan kepala dipisah supaya dada bisa turun tanpa menggeser kepala
function lying(t, o = {}) {
  const gasp = o.gasp || 0, comp = o.comp || 0, breath = o.breath || 0;
  const st = raka('pingsan', 'netral', { breath: breath, mouth: gasp > 0.05 ? { w: 15, up: 2, lo: 8 + 18 * gasp } : { w: 11, up: 5, lo: 11 } });
  const svg = rakaSvg(st, { ...VICTIM, rebah: true, flip: false, rebahTilt: 0, bare: true });
  const k = svg.indexOf('<g class="raka-head-rebah"'), body = svg.slice(0, k), head = svg.slice(k);
  const sq = 1 - 0.075 * comp + 0.03 * gasp + 0.012 * breath;
  const inner = `<g transform="translate(0 415) scale(1 ${f1(sq * 1000) / 1000}) translate(0 -415)">${body}</g>${head}`;
  return `<g transform="translate(${LY.tx} ${LY.ty}) scale(${LY.s})"><g transform="translate(800 0) scale(-1 1)">${inner}</g></g>`;
}
// kompresi dada 110 per menit: turun 45% siklus, naik penuh (recoil) 30%, jeda 25%
const BPM = 110, CYC = 60 / BPM;
const compPhase = (t, t0) => { const p = (((t - t0) / CYC) % 1 + 1) % 1; return p < 0.45 ? sm(p / 0.45) : p < 0.75 ? 1 - sm((p - 0.45) / 0.3) : 0; };

// ------------------------------------------------------------------ UI piksel (tajam)
const box = (x, y, w, h, o = {}) => `${R(x - 6, y - 6, w + 12, h + 12, o.edge ?? '#F8C038')}${R(x, y, w, h, o.bg ?? 'rgba(8,24,34,.94)')}${R(x + 6, y + 6, w - 12, 6, 'rgba(255,255,255,.08)')}`;
const pxt = (x, y, txt, fill, size, anchor = 'middle', e = '') => `<text x="${f1(x)}" y="${f1(y)}" font-family="${PX}" font-size="${size}" fill="${fill}" text-anchor="${anchor}" ${e}>${txt}</text>`;
function banner(lines, a, o = {}) {
  if (a <= 0.01) return '';
  const fs = o.fs ?? 36, lh = fs + 22, w = Math.max(...lines.map((l) => l.length)) * fs + 72, h = lines.length * lh + 36, x = 540 - w / 2, y = o.y ?? 290;
  return `<g opacity="${f1(a)}">${box(x, y, w, h, { edge: o.edge })}${lines.map((l, i) => pxt(540, y + 28 + fs + i * lh, l, i === 0 && o.num ? '#F8C038' : '#F5F1E6', fs)).join('')}</g>`;
}
function typed(txt, t, t0, cps = 26) { const n = clamp(Math.floor((t - t0) * cps), 0, txt.length); return txt.slice(0, n); }
function bubble(x, y, lines, a, o = {}) {      // balon bicara piksel (ekor ke bawah di tx)
  if (a <= 0.01) return ''; const fs = o.fs ?? 26, w = Math.max(...lines.map((l) => l.length)) * fs + 44, h = lines.length * (fs + 14) + 30, bx = x - w / 2, by = y - h, tx = o.tx ?? x;
  return `<g opacity="${f1(a)}">${R(bx - 6, by - 6, w + 12, h + 12, o.edge ?? '#13303A')}${R(bx, by, w, h, '#FFFDF4')}${R(tx - 18, by + h, 36, 12, o.edge ?? '#13303A')}${R(tx - 12, by + h - 6, 24, 12, '#FFFDF4')}${R(tx - 6, by + h + 12, 12, 12, o.edge ?? '#13303A')}${lines.map((l, i) => pxt(bx + w / 2, by + 20 + fs + i * (fs + 14), l, o.fill ?? '#13303A', fs)).join('')}</g>`;
}
function chip(x, y, txt, c, a = 1, fs = 24) { const w = txt.length * fs + 40; return a <= 0.01 ? '' : `<g opacity="${f1(a)}">${R(x - w / 2 - 5, y - 5, w + 10, fs + 34, '#0B1F26')}${R(x - w / 2, y, w, fs + 24, c)}${pxt(x, y + fs + 8, txt, '#0B1F26', fs)}</g>`; }
const check = (x, y, a, c = '#42E58C') => (a <= 0.01 ? '' : `<g opacity="${f1(a)}">${R(x - 36, y - 36, 72, 72, '#0B1F26')}${R(x - 30, y - 30, 60, 60, c)}<path d="M${x - 16} ${y}l10 12l22 -26" stroke="#0B1F26" stroke-width="10" fill="none" stroke-linecap="square"/></g>`);
function stepDots(n, a) { return `<g opacity="${f1(a)}">${[1, 2, 3, 4].map((i) => R(540 + (i - 2.5) * 56 - 18, 252, 36, 12, i < n ? '#42E58C' : i === n ? '#F8C038' : 'rgba(255,255,255,.28)')).join('')}</g>`; }
const DISC = () => `<g>${R(140, 1392, 800, 50, 'rgba(8,24,34,.82)')}<text x="540" y="1426" font-family="${FONT}" font-weight="700" font-size="24" fill="#CFE3E0" text-anchor="middle">Ringkasan langkah awal · bukan pengganti pelatihan praktik</text></g>`;

// ------------------------------------------------------------------ koreografi 0-31 dtk
// Raka berdiri di kanan (x 880) -> menoleh, kaget -> memindai area -> mendekat -> berjongkok di belakang korban (kaki tersembunyi di balik badan korban).
const KNEEL_Y = 1158;                                   // lantai Raka saat berlutut (lebih jauh dari kamera daripada korban; kaki tertutup korban)
function rakaState(t) {
  // mengembalikan {svg, ui} untuk Raka pada waktu t
  const W = C.walk; let x = 880, fy = FY, st, flip = false, extra = '', scale = S;
  const look = (yaw) => ({ yaw, gazeX: yaw * 0.9 });
  if (t < 1.5) { st = raka('netral', null, { ...look(-0.5 + 0.1 * Math.sin(t * 2)), ...faceWorry, wide: 0.1 }); }
  else if (t < 3.2) { const u = sm((t - 1.5) / 0.25); st = raka('kaget', 'kaget', { ...look(-1), bob: -12 * Math.max(0, 1 - (t - 1.5) / 0.35) }); st = lerpState(raka('netral', null, { ...look(-0.7), ...faceWorry }), st, u); }
  else if (t < 5.3) {   // memindai kiri-kanan (memastikan area aman)
    const yaw = t < 3.9 ? -1 + 1.8 * sm((t - 3.2) / 0.7) : t < 4.6 ? 0.8 - 1.8 * sm((t - 3.9) / 0.7) : -0.15 * sm((t - 4.6) / 0.5);
    st = raka('khawatir', null, { ...look(yaw), tilt: yaw * 3 });
  }
  else if (t < 6.2) {   // melangkah mendekat
    const u = (t - 5.3) / 0.9, ph = ((t - 5.3) * 1.7) % 1; x = lerp(880, 650, sm(u)); st = raka('khawatir', 'jalan', { ...walkCycle(ph, { dir: -1 }), ...faceSerious, wide: 0.1 });
  }
  else {                // berjongkok di sisi korban: mulai dari berdiri di x=650 turun ke posisi berlutut
    const k = sm((t - 6.2) / 0.45); x = lerp(650, LY.chestX + 8, k); fy = lerp(FY, KNEEL_Y, k);
    const kneel = raka('netral', 'jongkok', { ...faceSerious, yaw: 0, gazeX: 0, gazeY: 0.5 });
    st = lerpState(raka('netral', null, faceSerious), kneel, k);
    if (t < 6.65) st = lerpState(raka('netral', 'jalan', { ...walkCycle(0.3, { dir: -1 }), ...faceSerious }), st, sm((t - 6.2) / 0.3));
    st = applyActions(st, t);
  }
  return { st, x, fy, flip, scale };
}
// tindakan tangan/kepala selama berlutut
function applyActions(st, t) {
  const o = {};
  const WX = 200, WY = 544;
  if (t >= 6.8 && t < 10.0) {                       // menepuk bahu korban sambil memanggil (dua tepukan bergantian)
    const tap = (t0) => Math.max(0, Math.sin(Math.PI * clamp((t - t0) / 0.32, 0, 1)));
    const taps = tap(7.0) + tap(7.65) + tap(8.3) + tap(8.95);
    o.armR = ARM_STRAIGHT(250, 505 + 34 * taps, 'R'); o.yaw = 0.15; o.gazeX = 0.3;
    const mouthOpen = (t > 6.9 && t < 8.6 && Math.floor(t * 5) % 2 === 0) ? { w: 13, up: 3, lo: 14 } : faceSerious.mouth; o.mouth = mouthOpen;
  } else if (t >= 10.0 && t < 14.0) {              // menoleh ke teman di kanan dan menunjuk
    const k = sm((t - 10.0) / 0.4) * (1 - sm((t - 13.6) / 0.4));
    o.yaw = 0.9 * k; o.gazeX = 0.9 * k; o.armR = lerpArm({ wx: 262, wy: 566, ex: 300, ey: 500, finger: 0, front: 1 }, { wx: 346, wy: 384, ex: 320, ey: 430, finger: 1, fa: -75, front: 1 }, k);
    o.mouth = Math.floor(t * 5) % 2 === 0 && (t < 13.4) ? { w: 13, up: 3, lo: 14 } : faceSerious.mouth;
  } else if (t >= 14.0 && t < 18.3) {              // membungkuk, melihat dada dan mendengarkan napas (dekatkan telinga ke wajah korban)
    const k = sm((t - 14.0) / 0.5);
    o.lean = -2 * k; o.tilt = 0; o.gazeY = 0.8; o.yaw = 0.0; o.armL = ARM_STRAIGHT(150, 500, 'L'); o.armR = ARM_STRAIGHT(250, 500, 'R');
    o.bob = 142 + 18 * k; o.mouth = faceSerious.mouth;
  } else if (t >= 18.3) {                           // RJP: tangan bertumpuk di tengah dada, lengan lurus, bahu di atas tangan
    const enter = sm((t - 18.0) / 0.5), c = compPhase(t, 18.5) * (t >= 18.5 && t < 28.9 ? 1 : 0);
    const arrive = t >= 28.9 ? sm((t - 28.9) / 0.4) : 0;
    o.armL = ARM_STRAIGHT(196, 544, 'L'); o.armR = ARM_STRAIGHT(204, 544, 'R'); o.bob = 142 + 24 * c; o.mouth = { w: 11, up: 2, lo: 3 };
    o.yaw = 0; o.tilt = 0; o.gazeY = 0.4;
    if (arrive > 0) { o.armL = lerpArm(o.armL, { wx: 84, wy: 572, ex: 66, ey: 508, finger: 0, front: 1 }, arrive); o.armR = lerpArm(o.armR, { wx: 316, wy: 572, ex: 334, ey: 508, finger: 0, front: 1 }, arrive); o.yaw = 0.8 * arrive; o.gazeX = 0.8 * arrive; o.bob = 142; }
    void enter;
  }
  return { ...st, ...o, armL: o.armL || st.armL, armR: o.armR || st.armR };
}
const lerpArm = (a, b, k) => ({ wx: lerp(a.wx, b.wx, k), wy: lerp(a.wy, b.wy, k), ex: lerp(a.ex, b.ex, k), ey: lerp(a.ey, b.ey, k), finger: lerp(a.finger || 0, b.finger || 0, k), fa: b.fa ?? a.fa ?? 0, front: 1 });

// korban: berjalan -> goyah -> jatuh ke depan -> berbaring (pingsan, tidak merespons)
function victimWorld(t) {
  const walk = (ph, x) => stand(raka('netral', 'jalan', walkCycle(ph, { dir: 1 })), VICTIM, x, FY);
  if (t < 1.35) { const x = 150 + t * 255; return { svg: walk((t * 1.5) % 1, x), dustU: 0 }; }
  if (t < 1.95) {                                   // jatuh: berputar searah jarum jam terhadap kaki (jatuh ke depan), makin cepat
    const u = (t - 1.35) / 0.6, x = 150 + 1.35 * 255, ang = 90 * ei(u) * 0.95 + 4 * Math.sin(u * 3) * (1 - u);
    const st = raka('khawatir', null, { lean: 6 * u, armL: { wx: 60, wy: 520, ex: 56, ey: 470, finger: 0, front: 1 }, armR: { wx: 340, wy: 520, ex: 344, ey: 470, finger: 0, front: 1 }, mouth: { w: 12, up: 2, lo: 8 }, blink: 0.8 });
    return { svg: `<g transform="rotate(${f1(ang)} ${f1(x)} ${FY})">${stand(st, VICTIM, x, FY)}</g>`, dustU: 0 };
  }
  const g = C.napas; let gasp = 0;
  for (const g0 of g.megap) { const u = (t - g0) / 0.7; if (u > 0 && u < 1) gasp = Math.max(gasp, Math.sin(Math.PI * u) ** 1.5); }
  const comp = t >= 18.5 && t < 28.9 ? compPhase(t, 18.5) : 0, still = t < 14 ? 0.0 : 0;
  void still;
  return { svg: lying(t, { gasp, comp, breath: 0 }), dustU: clamp((t - 1.95) / 0.7, 0, 1) };
}
// teman (palet berbeda): datang dari kanan, menelepon 119, lari mengambil AED, kembali membawa AED
function friendWorld(t) {
  const F = C.teman; let x = null, ph = 0, run = false, st = null, hold = null;
  const walkFrom = (t0, t1, x0, x1, dir, rn = false) => { const u = clamp((t - t0) / (t1 - t0), 0, 1); return { x: lerp(x0, x1, rn ? u : sm(u)), ph: ((t - t0) * (rn ? 3.0 : 1.7)) % 1, dir }; };
  let svg = '', ui = '';
  if (t >= F.masuk && t < F.telepon) { const w = walkFrom(F.masuk, F.telepon, 1220, 890, -1); st = raka('khawatir', 'jalan', walkCycle(w.ph, { dir: -1, run: true })); x = w.x; }
  else if (t >= F.telepon && t < F.lari) {
    const k = sm((t - F.telepon) / 0.3);
    st = raka('khawatir', null, { yaw: -0.3, gazeX: -0.4, armR: { wx: 320, wy: 318, ex: 336, ey: 390, finger: 0, front: 1 }, armL: { wx: 86, wy: 556, ex: 88, ey: 488, finger: 0, front: 0 }, mouth: Math.floor(t * 5) % 2 ? { w: 12, up: 2, lo: 10 } : faceWorry.mouth });
    x = 890; hold = k;
  }
  else if (t >= F.lari && t < F.pergi) { const w = walkFrom(F.lari, F.pergi, 890, 1300, 1, true); st = raka('khawatir', 'jalan', walkCycle(w.ph, { dir: 1, run: true })); x = w.x; }
  else if (t >= F.kembali && t < F.pasang) { const w = walkFrom(F.kembali, F.pasang, 1300, 935, -1, true); st = raka('khawatir', 'jalan', walkCycle(w.ph, { dir: -1, run: true })); x = w.x; hold = 2; }
  else if (t >= F.pasang) { st = raka('khawatir', null, { yaw: -0.5, gazeX: -0.6, armR: { wx: 330, wy: 470, ex: 346, ey: 480, finger: 0, front: 1 }, mouth: faceWorry.mouth }); x = 935; hold = 3; }
  if (x === null) return { svg: '', ui: '' };
  svg = stand(st, FRIEND, x, FY, S, false);
  if (t >= F.telepon && t < F.lari) { svg += phone(x + 130 * S - 8, FY - 448 * S - 30, 1.15, 8); }
  return { svg, ui, x };
}

// ------------------------------------------------------------------ AED dan bantalan
function aedWorld(t) {
  const F = C.teman, A = C.aed; if (t < F.kembali) return { svg: '', ui: '' };
  const fx = t < F.pasang ? lerp(1300, 935, clamp((t - F.kembali) / (F.pasang - F.kembali), 0, 1)) - 100 : 740;
  const settle = t >= F.pasang ? sm((t - F.pasang) / 0.4) : 0, on = t >= A.nyala ? 1 : 0;
  const ax = t < F.pasang ? fx : lerp(fx, 830, settle), ay = t < F.pasang ? FY - 20 : FY + 10;
  let svg = pxShadow(ax, ay + 4, 220) + aed(ax, ay, 0.9, on, t);
  // bantalan menempel di dada (kabel ke AED)
  const k = sm((t - A.bantalan[0]) / (A.bantalan[1] - A.bantalan[0]));
  if (k > 0.01) { const px = (u) => lerp(ax, u, k); svg += `<path d="M${f1(ax - 40)} ${f1(ay - 110)}C${f1(ax - 120)} ${f1(ay - 160)} ${f1(LY.chestX + 120)} ${f1(LY.topY - 30)} ${f1(lerp(ax - 40, LY.chestX + 60, k))} ${f1(lerp(ay - 110, LY.topY + 30, k))}" stroke="#2A3A44" stroke-width="8" fill="none"/>` + padIcon(lerp(ax - 40, LY.chestX + 60, k), lerp(ay - 110, LY.topY + 34, k), 78, 54) + `<path d="M${f1(ax - 40)} ${f1(ay - 110)}C${f1(ax - 150)} ${f1(ay - 190)} ${f1(LY.chestX - 40)} ${f1(LY.topY - 50)} ${f1(lerp(ax - 40, LY.chestX - 80, k))} ${f1(lerp(ay - 110, LY.topY + 70, k))}" stroke="#2A3A44" stroke-width="8" fill="none"/>` + padIcon(lerp(ax - 40, LY.chestX - 80, k), lerp(ay - 110, LY.topY + 74, k), 78, 54); }
  return { svg, ui: '', ax, ay };
}
// ------------------------------------------------------------------ panel perbandingan napas (adegan 14-18 dtk)
function napasPanel(t) {
  const a = win(t, 14.3, 18.2, 0.35); if (a <= 0.01) return '';
  const x0 = 640, y0 = 420, w = 400, h = 300; let g = `<g opacity="${f1(a)}">${R(x0 - 6, y0 - 6, w + 12, h + 12, '#F8C038')}${R(x0, y0, w, h, 'rgba(8,24,34,.95)')}`;
  const row = (yy, label, col, f) => { let d = ''; for (let i = 0; i <= 80; i++) { const x = i / 80, y = f(x); d += `${i ? 'L' : 'M'}${f1(x0 + 20 + x * (w - 40))} ${f1(yy - y * 34)}`; } return pxt(x0 + 20, yy - 54, label, col, 20, 'start') + `<path d="${d}" fill="none" stroke="${col}" stroke-width="6" stroke-linejoin="round"/>`; };
  const ph = t * 0.55;
  g += row(y0 + 108, 'NORMAL', '#42E58C', (x) => Math.sin((x + ph) * Math.PI * 6) * 0.9);
  g += row(y0 + 240, 'MEGAP-MEGAP', '#FF8A7A', (x) => { const u = (x + ph * 0.35) % 1; return (u > 0.12 && u < 0.2 ? 1 : 0) * Math.sin((u - 0.12) / 0.08 * Math.PI) + (u > 0.62 && u < 0.7 ? 1 : 0) * Math.sin((u - 0.62) / 0.08 * Math.PI) * 0.9 + 0.03 * Math.sin(x * 30); });
  g += `<path d="M${x0 + w - 90} ${y0 + 190}l56 56m0 -56l-56 56" stroke="#FF8A7A" stroke-width="12" stroke-linecap="square" opacity="${f1(win(t, 15.6, 18.0, 0.3))}"/></g>`;
  return g;
}
// ------------------------------------------------------------------ rakit adegan
const TXT = [
  [0.2, 3.0, ['Kalau seseorang', 'tiba-tiba kolaps?'], false, 0],
  [3.0, 6.0, ['1. Pastikan aman'], true, 1], [6.0, 10.0, ['2. Cek respons'], true, 2],
  [10.0, 14.0, ['3. Panggil bantuan', '· minta AED'], true, 3], [14.0, 18.0, ['4. Napas normal?'], true, 4],
  [18.0, 27.0, ['Mulai RJP'], false, 5], [27.0, 31.0, ['AED: ikuti', 'instruksinya'], false, 6],
];
function storyUI(t) {
  let s = '';
  for (const [a, b, lines, num, step] of TXT) {
    const al = win(t, a, b, 0.3); if (al <= 0.01) continue;
    const L = a === 0.2 ? lines.map((l, i) => (i === 0 ? typed(l, t, a, 30) : typed(l, t, a + 0.6, 30))) : lines;
    s += banner(a === 0.2 ? lines.map((l, i) => l) : L, al, { num, fs: lines.some((l) => l.length > 17) ? 32 : 36, edge: step === 5 ? '#FF8A7A' : step === 6 ? '#42E58C' : '#F8C038' });
    if (step >= 1 && step <= 4) s += stepDots(step, al);
  }
  // keterangan kecil tiap langkah
  { const [cx, cy] = Wp(860, 700); s += check(cx, cy, win(t, 4.7, 6.0, 0.25), '#42E58C') + chip(cx, cy + 50, 'AREA AMAN', '#42E58C', win(t, 4.8, 6.0, 0.25), 24); }
  { const [bx, by] = Wp(470, 735); s += bubble(bx, by, ['HALO! BISA', 'DENGAR SAYA?'], win(t, 6.8, 8.7, 0.2), { tx: bx }); }
  s += chip(540, 1290, 'TIDAK ADA RESPONS', '#FF8A7A', win(t, 8.9, 10.0, 0.2), 22);
  { const [bx, by] = Wp(740, 760); s += bubble(bx, by, ['TOLONG TELEPON', '119!'], win(t, 10.3, 12.0, 0.2), { tx: bx + 120 }); s += bubble(bx, by, ['AMBIL AED!'], win(t, 12.0, 13.9, 0.2), { tx: bx + 120 }); }
  s += napasPanel(t);
  s += chip(540, 1330, 'MEGAP-MEGAP = BUKAN NAPAS NORMAL', '#FF8A7A', win(t, 16.0, 18.0, 0.3), 24);
  s += chip(540, 1330, 'TIDAK RESPONS + TIDAK BERNAPAS NORMAL', '#FF8A7A', win(t, 18.0, 20.5, 0.3), 22);
  s += chip(540, 1330, 'TEKAN TENGAH DADA · KUAT · CEPAT', '#F8C038', win(t, 20.5, 24.5, 0.3), 23);
  s += chip(540, 1330, '100-120 TEKANAN / MENIT', '#F8C038', win(t, 24.5, 27.0, 0.3), 26);
  // penghitung irama (metronom) selama RJP
  if (t >= 18.5 && t < 29.0) { const a = win(t, 18.5, 28.9, 0.3), p = compPhase(t, 18.5); s += `<g opacity="${f1(a)}">${R(60, 1180, 40, 160, '#0B1F26')}${R(66, 1186, 28, 148, '#22414A')}${R(66, 1334 - 148 * p, 28, 148 * p, '#F8C038')}${pxt(80, 1368, '110', '#F5F1E6', 14)}</g>`; }
  { const [bx, by] = Wp(790, 1010); s += bubble(bx, by, ['TEMPELKAN', 'BANTALAN'], win(t, C.aed.nyala + 0.6, C.aed.nyala + 2.2, 0.2), { tx: bx }); s += bubble(bx, by, ['IKUTI SUARA', 'AED'], win(t, C.aed.nyala + 2.2, 31.0, 0.2), { tx: bx, edge: '#1F8F5F' }); }
  s += DISC();
  return s;
}
function storyWorld(t) {
  let w = corridor(t);
  const v = victimWorld(t), r = rakaState(t), f = friendWorld(t), ad = aedWorld(t);
  const kneel = t >= 6.2;
  if (t >= 1.95) w += pxShadow(520, LY.floorY + 4, 560);
  if (t < 1.95) w += v.svg;
  // urutan lapis: teman, Raka (di belakang korban saat berlutut), korban, AED
  w += f.svg;
  if (kneel) { w += stand(r.st, { shadow: false }, r.x, r.fy, S); } else w += stand(r.st, { shadow: false }, r.x, r.fy, S);
  if (t >= 1.95) w += v.svg;
  w += dust(560, LY.floorY - 20, v.dustU);
  w += ad.svg;
  // fokus kamera RJP: zoom halus ke dada
  return `<g transform="translate(${BX} ${BY}) scale(${BZ}) translate(${-BX} ${-BY})">${w}</g>`;
}
// ------------------------------------------------------------------ penggambaran: dunia -> kanvas piksel, UI -> SVG tajam
let NEED = [];
const cache = new Map();
const load = (u) => { if (!cache.has(u)) { const im = new Image(); im.src = u; cache.set(u, im.decode().catch(() => {})); } return cache.get(u); };
const cv = $('pix'), ctx = cv.getContext('2d', { alpha: false }); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
async function drawWorld(svgInner) {
  const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">${svgInner}</svg>`);
  const im = new Image(); im.src = url; await im.decode(); ctx.clearRect(0, 0, 360, 640); ctx.drawImage(im, 0, 0, 360, 640);
}
const flash = (a) => (a > 0.01 ? `<rect width="1080" height="1920" fill="#fff" opacity="${f1(a)}"/>` : '');
window.renderFrame = async (t) => {
  NEED = [];
  const story = t < C.sc.outro[0] + 0.5;
  if (story) { await drawWorld(storyWorld(Math.min(t, C.sc.outro[0]))); }
  let ui = '';
  if (story) ui += storyUI(Math.min(t, C.sc.outro[0]));
  const o = outroUI(t, C, need);
  ui += o;
  ui += flash(win(t, 1.95, 2.2, 0.12) * 0.5);
  await Promise.all(NEED.map(load));
  $('ui').innerHTML = ui;
  $('pix').style.visibility = t >= C.sc.outro[0] + 0.45 ? 'hidden' : 'visible';
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
};
function need(u) { NEED.push(u); return u; }
void outroNeeds;
window.__ready = true;

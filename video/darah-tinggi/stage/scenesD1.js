// Adegan 1-4: hook di stasiun periksa (Raka berjalan, duduk, menggulung lengan baju, manset dipasang), hasil tinggi, angka tensi, kriteria.
import { camG, camX, w2s, RK, TK, rk, tk, clamp, sm, eo, eob, lerp, rLerp, walkCycle, win, f1, A, R, C, E, P, L, T, chip, ks, lin, trackR, trackT, toCv, armPts, cuffAt, STN, stationBg, tube, devPort, kori, ringPulse, exMark, qMark, note, lab2, H, COLR } from './common.js';
import { armShape } from '../../../brand/characters/raka/raka.js';

const { X0, FY, k: K0, tableTop } = STN;
const DEVX = STN.devX, DEVS = STN.devS;

// ---- keadaan Raka dipakai berulang
const cl = (o) => JSON.parse(JSON.stringify(o));
const STAND = rk('penasaran', 'netral', { legs: { dir: 0 } });
const walkAt = (ph, ex = 'penasaran', dir = 'depan') => rk(ex, 'jalan', walkCycle(ph, dir === 'depan' ? { mode: 'depan' } : { dir: dir === 'kiri' ? -1 : 1 }));
// gulungan lengan baju kiri; tangan kanan memegang batas gulungan (boleh sampai siku; lebih tinggi dibantu Kori)
function withRoll(base, r) {
  const s = cl(base); s.armL.roll = r;
  const iR = Math.max(16, Math.round((1 - r) * 40)), d = armShape('L', s.armL).dots[iR];
  s.armR = { ...s.armR, wx: d[0] + 40, wy: d[1] + 22, ex: 252, ey: 500 };
  return s;
}
const SIT = rk('netral', 'duduk');
const ROLL0 = withRoll(rk('penasaran', 'gulung_lengan', { gazeY: 0.8, tilt: -3, yaw: -0.2 }), 0.02);
const ROLL1 = withRoll(rk('penasaran', 'gulung_lengan', { gazeY: 0.8, tilt: -3, yaw: -0.2 }), 0.72);
const ULUR = (ex = 'waspada', o = {}) => rk(ex, 'ulur_lengan', { armL: { roll: 0.72 }, yaw: -0.5, gazeX: -0.7, gazeY: 0.2, ...o });

// ---- stasiun: menggambar latar, Raka, alat, manset, tabung, Kori
function station(t, o) {
  const rs = o.rs, rx = o.x ?? X0, fy = o.fy ?? FY, k = o.k ?? K0;
  let s = o.bg ?? stationBg();
  const dev = H.tensi(DEVX, tableTop, DEVS, o.dev || { mode: 'idle' });
  s += (o.pre || '');
  s += dev;
  const cf = o.cuff;
  if (cf && cf.mode === 'rest') s += H.cuffBand(cf.x ?? 400, cf.y ?? tableTop - 16, 0, 78, 44, 0) + `<path d="M${f1((cf.x ?? 400) - 34)} ${f1(tableTop - 18)}C${f1(DEVX + 200)} ${tableTop - 6} ${f1(DEVX + 170)} ${tableTop - 40} ${f1(devPort()[0])} ${f1(devPort()[1])}" fill="none" stroke="#2C3E50" stroke-width="9" stroke-linecap="round"/>`;
  s += RK(rs, rx, fy, k, { t, uid: 'rk', outfit: 'harian' });
  if (cf && cf.mode === 'on') {
    const dots = armPts(rs, 'L', rx, fy, k).dots, c = dots[8], p = devPort();
    s += tube(c[0] - 4, c[1] + 22, p[0], p[1]) + cuffAt(rs, rx, fy, k, cf.inflate ?? 0, 8);
  }
  if (cf && cf.mode === 'fly') { const p = devPort(); s += tube(cf.x, cf.y + 10, p[0], p[1]) + H.cuffBand(cf.x, cf.y, cf.ang, cf.len ?? 58, cf.thick ?? 60, 0); }
  s += (o.post || '');
  return (o.cam ? camX(s, ...o.cam) : camG(s)) + (o.screen || '');
}

// ================================================================ 1. HOOK (0 - 5.66)
// Raka berjalan masuk menuju meja periksa, duduk, menggulung lengan baju kiri dengan tangan kanan, mengulurkan lengan ke meja; Kori membawa manset.
const S1 = {
  t0: 0,
  draw(t) {
    const u = t;
    // 0-1.7 berjalan (tampak samping, ayunan lengan jelas) dari tepi kanan ke kursi; 1.7-2.6 melambai ke Kori; 2.6-3.1 melirik meja; 3.1-3.9 duduk
    const walkEnd = rk('penasaran', 'jalan', walkCycle(1.7 * 2.0, { dir: -1 }));
    let rs, x = X0 + 6, fy = FY, k = K0;
    const greet = rk('senang', 'sapa', { legs: { dir: 0 }, yaw: -0.25, gazeX: -0.5, tilt: -3 });
    if (u < 1.7) { x = lerp(960, X0 + 6, u / 1.7); rs = walkEnd && rk('penasaran', 'jalan', walkCycle(u * 2.0, { dir: -1 })); }
    else {
      x = X0 + 6 * (1 - sm((u - 2.6) / 0.6));
      rs = trackR(u, [{ t: 1.7, d: 0.01, s: walkEnd }, { t: 1.7, d: 0.3, s: STAND }, { t: 1.95, d: 0.3, s: greet }, { t: 2.65, d: 0.3, s: rk('penasaran', 'netral', { legs: { dir: 0 }, yaw: -0.7, gazeX: -0.9, gazeY: 0.1 }) }, { t: 3.1, d: 0.8, s: SIT }, { t: 3.95, d: 0.4, s: ROLL0 }, { t: 4.35, d: 1.3, s: ROLL1 }, { t: 5.75, d: 0.8, s: ULUR('penasaran') }]);
      if (u > 2.1 && u < 2.7) { const w = Math.sin((u - 2.1) * 16); rs.armR.wy += w * 26; rs.armR.wx += w * 8; }
      if (u > 4.35 && u < 5.7) { const w = Math.sin((u - 4.35) * 15) * 7; rs.armR.wx += w; rs.armR.wy += w * 0.6; }
    }
    // manset: tergeletak di meja, lalu dibawa Kori ke lengan Raka (4.7 - 5.7)
    const onArm = cuffPoseOn(ULUR('penasaran'));
    const fu = sm((u - 4.7) / 1.0);
    let cuff = { mode: 'rest', x: 420 };
    let kx = 400, ky = 1004;
    if (u >= 4.7) {
      const sx = 420, sy = tableTop - 16;
      if (u < 5.7) { const cx = lerp(sx, onArm[0], fu), cy = lerp(sy, onArm[1], fu) - Math.sin(fu * Math.PI) * 90; cuff = { mode: 'fly', x: cx, y: cy, ang: lerp(0, onArm[2], fu), len: lerp(78, 58, fu), thick: lerp(44, 66, fu) }; kx = cx - 110; ky = cy - 50; }
      else { cuff = { mode: 'on', inflate: 0 }; kx = onArm[0] - 130; ky = onArm[1] - 40; }
    } else { kx = 400 + Math.sin(u * 1.6) * 14; ky = 1004 + Math.sin(u * 2.3) * 8; }
    const pre = A.softBg ? '' : '';
    const kori_ = kori(kx, ky, 0.55, t, { mood: 'happy', wave: u < 2.7 ? 1 : 0, arm: u >= 4.7 && u < 5.7 ? -18 : -8, flip: false, tilt: u >= 4.7 ? -8 : 4 });
    // judul
    const ti = clamp((u + 0.3) / 0.35, 0, 1), to = 1 - clamp((u - 5.2) / 0.4, 0, 1), ta = ti * to;
    const title = `<g opacity="${f1(ta)}" transform="translate(540 ${f1(300 - 14 * (1 - eo(ti)))})">${R(-420, -96, 840, 192, 'rgba(0,0,0,.22)', 70, 'transform="translate(0 10)"')}${R(-420, -96, 840, 192, '#F7F2E4', 70)}${T(0, -12, 'DARAH TINGGI:', '#007060', 66)}${T(0, 66, 'SEBAHAYA APA?', '#E8665F', 80)}</g>`;
    return station(t, { rs, x, fy, k, cuff, dev: { mode: 'idle' }, post: kori_, screen: title });
  },
};
// posisi manset (x, y, sudut) pada lengan terulur: dipakai sebagai titik tujuan terbang
function cuffPoseOn(rs) {
  const st = cl(rs), dots = armPts(st, 'L', X0, FY, K0).dots, a = dots[5], b = dots[11], c = dots[8];
  return [c[0], c[1], Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI + 90];
}

// ================================================================ 2. HASIL TINGGI, "BADAN BAIK-BAIK SAJA" (5.66 - 14.88)
const S2 = {
  t0: 5.66, tr: { type: 'wipe', d: 0.01 },
  draw(t) {
    const u = t - 5.66;
    // alat: tekan mulai (6.3), tekanan naik (6.5-7.7), turun (7.7-8.9), hasil 152/96
    const press = u > 0.55 && u < 0.85 ? 1 : 0;
    let dev; const cur = u < 2.1 ? lin(u, [[0.8, 20], [2.0, 168]]) : lin(u, [[2.1, 168], [3.2, 96]]);
    if (u < 0.7) dev = { mode: 'idle', press }; else if (u < 3.2) dev = { mode: 'ukur', cur, press: 0 }; else dev = { mode: 'hasil', sys: 152, dia: 96, hi: true };
    const infl = u > 0.8 && u < 3.2 ? (u < 2.1 ? sm((u - 0.8) / 1.3) : 1 - sm((u - 2.1) / 1.1)) : 0;
    const lookAt = rk('waspada', 'ulur_lengan', { armL: { roll: 0.72 }, yaw: -0.8, gazeX: -0.9, gazeY: 0.15, lean: -5, tilt: -3 });
    const sitUp = rk('senang', 'ulur_lengan', { armL: { roll: 0.72 }, armR: { wx: 242, wy: 470, ex: 330, ey: 504, finger: 0, front: 1 }, yaw: 0, gazeX: 0, lean: 1 });
    const free = rk('senang', 'duduk', { yaw: 0.1 });
    const standU = rk('senang', 'netral', { legs: { dir: -1 } });
    const shrug = rk('lega', 'angkat_bahu', { legs: { dir: -1 }, yaw: 0.2, tilt: 5 });
    let rs, x = X0, fy = FY, k = K0, cuff = { mode: 'on', inflate: infl }, kxy = [400, 1000], armK = -8, wave = 0, tilt = 4, mood = 'happy', post = '';
    const think = rk('penasaran', 'ulur_lengan', { armL: { roll: 0.72 }, armR: { wx: 222, wy: 372, ex: 320, ey: 466, finger: 0, front: 1 }, yaw: -0.7, gazeX: -0.8, gazeY: 0.1, tilt: -2 });
    if (u < 3.25) {
      rs = trackR(u, [{ t: 0, d: 0.01, s: ULUR('penasaran') }, { t: 0.2, d: 0.5, s: think }, { t: 3.2, d: 0.35, s: lookAt }]);
    } else if (u < 5.6) {
      rs = trackR(u, [{ t: 0, d: 0.01, s: lookAt }, { t: 3.75, d: 0.5, s: sitUp }]);
      cuff = u < 4.9 ? { mode: 'on', inflate: 0 } : { mode: 'fly', x: 0, y: 0 };
    } else rs = free;
    // Kori: menekan tombol (u 0.4 - 0.9), menunjuk layar, lalu melepas manset (4.4 - 5.2)
    if (u < 3.4) { kxy = [lerp(430, 300, sm(u / 0.5)), lerp(1010, 960, sm(u / 0.5))]; armK = u > 0.4 && u < 0.95 ? -40 + 30 * Math.sin((u - 0.4) / 0.55 * Math.PI) : -30; tilt = -8; }
    else { kxy = [330, 980]; armK = -30; tilt = -8; mood = 'happy'; }
    if (u > 3.3 && u < 3.9) post += `<g transform="translate(210 880)">${A.sparkle ? A.sparkle(0, 0, 1.3, '#FF6B5E') : ''}</g>`;
    if (u >= 3.2 && u < 3.7) post += exMark(396, 860, 1 + 0.2 * Math.sin(u * 18), clamp((u - 3.2) / 0.1, 0, 1) * (1 - clamp((u - 3.5) / 0.2, 0, 1)));
    // 9.4+ "badan terasa baik-baik saja": Raka tegak, senyum, tangan di dada; manset dilepas Kori dan Raka berdiri, mengangkat bahu, berjalan pergi
    if (u >= 3.75 && u < 4.4) { cuff = { mode: 'on', inflate: 0 }; }
    if (u >= 4.4 && u < 5.2) { const f = (u - 4.4) / 0.8, onA = cuffPoseOn(ULUR('penasaran')); cuff = { mode: 'fly', x: lerp(onA[0], 420, sm(f)), y: lerp(onA[1], tableTop - 16, sm(f)) - Math.sin(f * Math.PI) * 70, ang: lerp(onA[2], 0, f), len: lerp(58, 78, f), thick: lerp(66, 44, f) }; kxy = [cuff.x + 70, cuff.y - 50]; armK = -16; }
    if (u >= 5.2) cuff = { mode: 'rest', x: 420 };
    // berdiri dan pergi
    if (u >= 5.4) {
      const w = u - 5.4;
      // 5.4-6.2 berdiri dari kursi, 6.2-6.9 angkat bahu, 6.9-7.9 berjalan ke kanan, 7.9 berhenti (Kori memanggil), 8.1-9.2 berbalik khawatir
      const stand0 = rk('senang', 'netral', { legs: { dir: 1 }, yaw: 0.1 });
      const p1 = trackR(u, [{ t: 0, d: 0.01, s: free }, { t: 5.4, d: 0.8, s: standU }, { t: 6.25, d: 0.45, s: shrug }, { t: 6.85, d: 0.35, s: stand0 }]);
      if (u < 6.85) rs = p1;
      else if (u < 7.9) { const ph = (u - 6.85) * 1.8; x = lerp(X0, 880, (u - 6.85) / 1.05); rs = rk('lega', 'jalan', walkCycle(ph, { dir: 1 })); }
      else { x = 880; rs = trackR(u, [{ t: 0, d: 0.01, s: rk('lega', 'jalan', walkCycle((7.9 - 6.85) * 1.8, { dir: 1 })) }, { t: 7.9, d: 0.25, s: rk('kaget', 'berhenti', { legs: { dir: 1 } }) }, { t: 8.4, d: 0.5, s: rk('khawatir', 'netral', { legs: { dir: 0 }, yaw: 0, gazeX: 0, tilt: 3 }) }]); }
      if (u >= 6.0) { kxy = [lerp(kxy[0], 520, sm((u - 6.4) / 1.2)), lerp(kxy[1], 940, sm((u - 6.4) / 1.2))]; }
      if (u >= 7.6) { wave = 1; armK = -50; tilt = -12; }
    }
    // tanda seru Kori memanggil dan tanda tanya Raka
    if (u >= 7.5 && u < 8.6) post += exMark(kxy[0] + 40, kxy[1] - 190, 1.1, clamp((u - 7.5) / 0.1, 0, 1) * (1 - clamp((u - 8.4) / 0.2, 0, 1)));
    if (u >= 8.5) { const a = clamp((u - 8.5) / 0.3, 0, 1); post += qMark(x + 30, 760, 0.8 + 0.25 * a, a); }
    const kori_ = kori(kxy[0], kxy[1], 0.55, t, { mood, wave, arm: armK, tilt, flip: u >= 6.0 });
    // hasil: kartu peringatan kecil (satu kali ukur)
    if (u >= 3.3 && u < 5.6) post += `<g opacity="${f1(clamp((u - 3.3) / 0.3, 0, 1) * (1 - clamp((u - 5.2) / 0.4, 0, 1)))}">${lab2(340, 640, 'Hasil: 152/96 mmHg', { fs: 34, bg: '#E8665F' })}</g>`;
    if (u >= 5.4 && u < 7.4) post += lab2(340, 640, 'Terasa baik-baik saja', { fs: 36, bg: COLR.green, a: clamp((u - 5.4) / 0.3, 0, 1) });
    if (u >= 8.9) post += lab2(400, 640, '1 kali ukur ≠ diagnosis', { fs: 36, bg: COLR.coral, a: clamp((u - 8.9) / 0.4, 0, 1) });
    if (!rs) rs = free;
    // pastikan lengan terulur tidak jatuh ke meja saat berdiri
    return station(t, { rs, x, fy, k, cuff, dev, post: post + kori_ });
  },
};

// ================================================================ 3a. KENALAN DENGAN ANGKA TENSI (14.88 - 24.2)
const S3 = {
  t0: 14.88, tr: { type: 'wipe', d: 0.01 },
  draw(t) {
    const u = t - 14.88;
    // Raka berjalan kembali ke meja (dari kanan), berhenti, menunjuk layar alat, lalu menunjuk kartu angka yang diperbesar
    const px = 470, pfy = 1330, pk = 0.85;
    const tapAt = (a) => Math.sin(Math.max(0, u - a) * 16) * 6;
    const pointDev = (jab) => rk('menunjuk', 'netral', { legs: { dir: 0 }, armL: { wx: -26 - jab, wy: 424, ex: 44, ey: 426, finger: 1, fa: 180, front: 1 }, armR: { wx: 314, wy: 556, ex: 312, ey: 488, finger: 0, front: 0 }, yaw: -0.5, gazeX: -0.8, lean: -2, fxSpark: 0 });
    const pointCard = rk('senang', 'netral', { legs: { dir: 0 }, armL: { wx: 22, wy: 296, ex: 46, ey: 372, finger: 1, fa: -112, front: 1 }, yaw: -0.2, gazeX: -0.3, gazeY: -0.8, tilt: -3, fxSpark: 0 });
    const nodS = rk('mengerti', 'netral', { legs: { dir: 0 }, armL: { wx: 22, wy: 296, ex: 46, ey: 372, finger: 1, fa: -112, front: 1 }, gazeY: -0.6, tilt: 3 });
    let rs, x = px, k = pk;
    if (u < 1.9) { x = lerp(860, px, u / 1.9); rs = rk('penasaran', 'jalan', walkCycle(u * 2.0, { dir: -1 })); }
    else rs = trackR(u, [{ t: 1.9, d: 0.01, s: rk('penasaran', 'jalan', walkCycle(1.9 * 2.0, { dir: -1 })) }, { t: 1.9, d: 0.3, s: rk('penasaran', 'netral', { legs: { dir: 0 } }) }, { t: 2.35, d: 0.45, s: pointDev(0) }, { t: 5.8, d: 0.6, s: pointCard }, { t: 8.0, d: 0.5, s: nodS }]);
    if (u > 2.8 && u < 4.6) { const j = Math.max(0, Math.sin((u - 2.8) * 6.5)) * 22; rs.armL.wx += j; rs.armL.ex += j * 0.6; }
    // alat di meja memperlihatkan 120/80; kartu zoom di atas (kartu dan garis zoom di koordinat layar)
    let world = stationBg();
    world += H.tensi(DEVX, tableTop, DEVS, { mode: 'hasil', sys: 120, dia: 80, hi: false });
    world += H.cuffBand(420, tableTop - 16, 0, 78, 44, 0);
    world += RK(rs, x, pfy, pk, { t, uid: 'rk', outfit: 'harian' });
    const kx = 880 + Math.sin(u * 1.7) * 12, ky = 1010 + Math.sin(u * 2.4) * 8;
    world += kori(kx, ky, 0.55, t, { mood: u > 4 ? 'happy' : 'normal', arm: -42, flip: true, tilt: 6, wave: 0 });
    let s = camG(world);
    const ca = clamp((u - 2.5) / 0.5, 0, 1);
    const cx = 540, cy = 410, cw = 860, ch = 330;
    const [dsx, dsy] = w2s(DEVX, tableTop - 150);
    if (ca > 0) {
      s += `<g opacity="${f1(ca * 0.9)}"><path d="M${f1(dsx - 70)} ${f1(dsy)}L${cx - cw / 2 + 10} ${cy + ch / 2 - 6}M${f1(dsx + 78)} ${f1(dsy)}L${cx + cw / 2 - 10} ${cy + ch / 2 - 6}" stroke="#fff" stroke-width="5" stroke-dasharray="14 12" fill="none"/></g>`;
      const sc = 0.82 + 0.18 * eob((u - 2.5) / 0.5);
      s += `<g transform="translate(${cx} ${cy}) scale(${sc.toFixed(3)}) translate(${-cx} ${-cy})" opacity="${f1(ca)}">${R(cx - cw / 2, cy - ch / 2 + 10, cw, ch, 'rgba(0,0,0,.25)', 40)}${R(cx - cw / 2, cy - ch / 2, cw, ch, '#0C2A28', 40)}${R(cx - cw / 2, cy - ch / 2, cw, ch, 'none', 40, 'stroke="#2D4F4B" stroke-width="8"')}`
        + T(cx, cy - ch / 2 + 50, 'TEKANAN DARAH', '#7CF2B7', 32)
        + T(cx - 175, cy + 52, '120', '#7CF2B7', 150, 'font-family="JetBrains Mono, monospace"') + T(cx, cy + 52, '/', '#7CF2B7', 150) + T(cx + 175, cy + 52, '80', '#7CF2B7', 150, 'font-family="JetBrains Mono, monospace"')
        + T(cx, cy + ch / 2 - 26, 'mmHg', '#7CF2B7', 32)
        + (u >= 6.3 ? `<g opacity="${f1(sm((u - 6.3) / 0.4))}">${R(cx - 380, cy - 82, 760, 200, 'none', 36, `stroke="#F8C038" stroke-width="${f1(8 + 3 * Math.sin(u * 7))}"`)}</g>` : '') + `</g>`;
    }
    if (u >= 6.2) s += lab2(760, 640, 'Contoh acuan orang dewasa', { fs: 34, bg: COLR.gold, fg: COLR.ink, a: sm((u - 6.2) / 0.4) });
    return s;
  },
};

// ================================================================ 3b. SISTOLIK / DIASTOLIK (24.2 - 35.12): jantung berdenyut + gelombang tekanan + angka
const BEAT = 1.1;
const S3B = {
  t0: 24.2, tr: { type: 'iris', d: 0.7, cx: 540, cy: 600 },
  draw(t) {
    const u = t - 24.2;
    // fase denyut: sistol (kontraksi) di 0-0.4 per BEAT, diastol (relaksasi) sisanya; narasi: sistolik 24.4-29.3, diastolik 29.3-35.1
    const ph = ((t - 24.2) / BEAT) % 1;
    const con = ph < 0.14 ? sm(ph / 0.14) : ph < 0.45 ? 1 - 0.2 * sm((ph - 0.14) / 0.31) : 1 - sm((ph - 0.45) / 0.45) * 0.97 - 0.0;
    const sysPhase = t < 29.3;
    let s = A.softBg('#0F5F57', '#0A3830', 'sbD3');
    s += R(60, 210, 960, 1160, 'rgba(255,255,255,.05)', 44);
    s += H.heartCut(560, 560, 0.82, { c: clamp(con, 0, 1), t, flow: 1 });
    const la = clamp((u - 0.9) / 0.5, 0, 1);
    s += H.label(690, 640, 770, 720, 'Ventrikel kiri', { a: la });
    s += H.label(745, 300, 800, 240, 'Aorta', { a: la });
    const hiSys = t >= 24.4 && t < 29.3, hiDia = t >= 29.3;
    s += H.bpWave(80, 1030, 920, 310, t - 24.2, { sys: 120, dia: 80, per: BEAT, aSys: hiSys || !hiDia ? 1 : 0.4, aDia: hiDia ? 1 : 0.4, sysLabel: 'Sistolik 120', diaLabel: 'Diastolik 80' });
    const cardTxt = sysPhase ? ['SISTOLIK', 'jantung memompa', COLR.gold] : ['DIASTOLIK', 'jantung rileks di antara detak', COLR.mint];
    const swap = sysPhase ? sm((u - 0.2) / 0.4) : sm((t - 29.3) / 0.4);
    s += `<g opacity="${f1(sysPhase ? clamp((u - 0.2) / 0.3, 0, 1) : 1)}" transform="translate(600 ${f1(900 - 12 * (1 - swap))})">${R(-300, -58, 600, 140, 'rgba(0,0,0,.28)', 48, 'transform="translate(0 8)"')}${R(-300, -58, 600, 140, cardTxt[2], 48)}${T(0, 4, cardTxt[0] + (sysPhase ? ' (angka atas)' : ' (angka bawah)'), COLR.ink, 38)}${T(0, 52, cardTxt[1], COLR.ink, 28)}</g>`;
    const hand = ph < 0.2 ? 8 * Math.sin(ph / 0.2 * Math.PI) : 0;
    const rs = rk('penasaran', 'pegang_dada', { legs: { dir: 0 }, armR: { wx: 242 + hand * 0.4, wy: 470 - hand, ex: 330, ey: 504 }, yaw: -0.3, gazeX: -0.4, gazeY: -0.3, tilt: Math.sin(u * 2.2) * 2 + (sysPhase ? 0 : -2), lean: -hand * 0.15 });
    s += RK(rs, 150, 1015, 0.56, { t, uid: 'rk', outfit: 'harian' });
    s += kori(940, 1000, 0.5, t, { mood: 'happy', arm: -38, flip: true, tilt: 6 + Math.sin(u * 5.7) * 2, wave: 0 });
    return s;
  },
};

// ================================================================ 4a. LALU KAPAN DISEBUT DARAH TINGGI? (35.12 - 38.0)
const S4A = {
  t0: 35.12, tr: { type: 'wipe', d: 0.5 },
  draw(t) {
    const u = t - 35.12;
    let s = A.creamBg ? A.creamBg('cbD4') : '';
    s += A.softBg ? '' : '';
    // Raka berjalan pelan mondar-mandir sambil berpikir; tanda tanya besar
    const x = 540 + 130 * Math.sin(u * 1.1 - 0.4), dir = Math.cos(u * 1.1 - 0.4) >= 0 ? 1 : -1;
    const rs = rk('berpikir', 'berpikir', { ...walkCycle(u * 1.5, { dir, stride: 20, lift: 14, swing: 0 }), armL: { wx: 178, wy: 372, ex: 80, ey: 466, finger: 0.5, fa: -52, front: 1 }, armR: { wx: 138, wy: 508, ex: 278, ey: 526, finger: 0, front: 1 }, gazeX: Math.sin(u * 1.1) * 0.6, gazeY: -0.7, tilt: Math.sin(u * 1.1) * 5, lean: 1.5 });
    s += `<g opacity=".95">${E(540, 1310, 330, 24, 'rgba(0,0,0,.1)')}</g>`;
    s += RK(rs, x, 1310, 0.95, { t, uid: 'rk', outfit: 'harian' });
    s += qMark(560 + (x - 540) * 0.5, 610 + Math.sin(u * 4) * 6, 1.8, clamp((u - 0.1) / 0.3, 0, 1));
    s += chip(540, 360, 'Kapan disebut darah tinggi?', { bg: COLR.forest, fs: 46, k: 0.9 + 0.1 * eob(u / 0.4), a: clamp(u / 0.2, 0, 1), w: 900 });
    s += kori(900, 1030, 0.55, t, { mood: 'think', arm: -20, flip: true, tilt: 8 });
    return s;
  },
};

// ================================================================ 4b. KRITERIA (38.0 - 48.4)
const S4B = {
  t0: 38.0, tr: { type: 'iris', d: 0.6, cx: 540, cy: 700 },
  draw(t) {
    const u = t - 38.0;
    let s = A.creamBg('cbD4b');
    const mk = (x, y, w, h, head, big, sub, col, a, hl) => `<g opacity="${f1(a)}" transform="translate(${x} ${y}) scale(${(0.9 + 0.1 * eob((a - 0) * 1)).toFixed(3)}) translate(${-x} ${-y})">${R(x - w / 2, y - h / 2 + 10, w, h, 'rgba(0,0,0,.18)', 44)}${R(x - w / 2, y - h / 2, w, h, '#fff', 44)}${R(x - w / 2, y - h / 2, w, 70, col, 44)}${R(x - w / 2, y - h / 2 + 40, w, 30, col)}${T(x, y - h / 2 + 50, head, COLR.ink, 36)}${T(x, y + 36, big, hl ? '#E8665F' : COLR.ink, 120, `font-family="JetBrains Mono, monospace"`)}${T(x, y + h / 2 - 28, sub, '#5B6F77', 28)}</g>`;
    // kata sumber
    s += chip(540, 290, 'Kriteria Kemenkes dan WHO', { bg: COLR.forest, fs: 40, a: clamp((u - 0.2) / 0.3, 0, 1), w: 860 });
    const a1 = clamp((u - 3.5) / 0.4, 0, 1), a2 = clamp((u - 7.0) / 0.4, 0, 1);
    s += mk(290, 480, 470, 280, 'SISTOLIK', '≥140', 'mmHg atau lebih', COLR.gold, a1, a1 > 0.9 && u < 6.5 || u > 9.0);
    s += mk(790, 480, 470, 280, 'DIASTOLIK', '≥90', 'mmHg atau lebih', COLR.mint, a2, a2 > 0.9 && u > 8.5);
    const ao = clamp((u - 5.4) / 0.4, 0, 1);
    s += `<g opacity="${f1(ao)}" transform="translate(540 ${f1(480 + 10 * (1 - ao))})">${R(-96, -36, 192, 72, 'rgba(0,0,0,.25)', 36, 'transform="translate(0 6)"')}${R(-96, -36, 192, 72, COLR.coral, 36)}${T(0, 14, 'dan/atau', '#fff', 34)}</g>`;
    // contoh: salah satu angka saja sudah cukup
    const ex = (x, a, sysv, diav, hs, hd, cap) => `<g opacity="${f1(a)}" transform="translate(${x} 770)">${R(-230, -72, 460, 160, 'rgba(0,0,0,.15)', 36, 'transform="translate(0 7)"')}${R(-230, -72, 460, 160, '#0C2A28', 36)}${T(-90, 24, sysv, hs ? '#FF6B5E' : '#7CF2B7', 92, 'font-family="JetBrains Mono, monospace"')}${T(0, 24, '/', '#7CF2B7', 92)}${T(90, 24, diav, hd ? '#FF6B5E' : '#7CF2B7', 92, 'font-family="JetBrains Mono, monospace"')}${T(0, 112, cap, COLR.ink, 28, '')}</g>`;
    const ea = clamp((u - 8.4) / 0.4, 0, 1);
    s += ex(300, ea, '150', '82', true, false, 'sistolik saja sudah cukup');
    s += ex(780, ea, '128', '94', false, true, 'diastolik saja sudah cukup');
    s += lab2(540, 940, 'Perlu diperhatikan', { fs: 40, bg: COLR.coral, a: clamp((u - 9.0) / 0.4, 0, 1) });
    // Raka melangkah ke kartu sesuai bagian yang disebut dan menunjuknya
    const pt1 = rk('menunjuk', 'menunjuk', { legs: { dir: 0 }, yaw: -0.4, gazeX: -0.5, gazeY: -0.5, armR: { wx: 348, wy: 330, ex: 340, ey: 394, finger: 1, fa: -60, front: 1 } });
    const pt2 = rk('menunjuk', 'menunjuk', { legs: { dir: 0 }, yaw: 0.4, gazeX: 0.5, gazeY: -0.5, armR: { wx: 362, wy: 340, ex: 340, ey: 394, finger: 1, fa: -40, front: 1 } });
    let rx = 190, rs;
    if (u < 3.2) { rx = lerp(120, 190, sm(u / 1.2)); rs = trackR(u, [{ t: 0, d: 0.01, s: rk('penasaran', 'jalan', walkCycle(u * 1.6, { dir: 1 })) }, { t: 1.2, d: 0.3, s: rk('penasaran', 'netral', { legs: { dir: 0 } }) }, { t: 2.2, d: 0.5, s: pt1 }]); if (u < 1.2) rs = rk('penasaran', 'jalan', walkCycle(u * 1.6, { dir: 1 })); }
    else if (u < 7.0) { rx = 190 + 0 * u; rs = pt1; }
    else { rx = lerp(190, 830, sm((u - 6.4) / 1.3)); rs = (u < 7.7) ? rk('menunjuk', 'jalan', { ...walkCycle(u * 1.8, { dir: 1 }), armR: { wx: 348, wy: 330, ex: 340, ey: 394, finger: 1, fa: -60, front: 1 }, armL: { wx: 86, wy: 556, ex: 88, ey: 488, finger: 0, fa: -90, front: 0 } }) : trackR(u, [{ t: 0, d: 0.01, s: pt1 }, { t: 7.7, d: 0.35, s: pt2 }]); }
    rs = rs || pt1;
    if (u >= 2.2 && u < 7.4) { const jab = Math.max(0, Math.sin((u - 2.2) * 4.2 + 1.2)) * 16 + 4, sw = Math.sin((u - 2.2) * 1.3); rs = { ...rs, yaw: sw * 0.5, gazeX: sw * 0.7, tilt: Math.sin(u * 3) * 2, bob: rs.bob + Math.abs(Math.sin(u * 4.2)) * -5, armR: { ...rs.armR, wx: rs.armR.wx + jab * (sw > 0 ? 1 : 0.5), wy: rs.armR.wy - jab * 0.3 } }; rx += sw * 34; }
    s += RK(rs, rx, 1340, 0.6, { t, uid: 'rk', outfit: 'harian' });
    s += kori(rx < 500 ? 880 : 200, 1230, 0.5, t, { mood: 'happy', arm: -34, flip: rx < 500, tilt: rx < 500 ? 6 : -6 });
    return s;
  },
};

// ================================================================ 4c. SATU KALI HASIL TINGGI BELUM TENTU HIPERTENSI -> UKUR ULANG (48.4 - 56.18)
const S4C = {
  t0: 48.4, tr: { type: 'wipe', d: 0.5 },
  draw(t) {
    const u = t - 48.4;
    let s = A.creamBg('cbD4c');
    // 48.4-53.0: kartu "1 kali ukur" + Raka angkat bahu / tangan "tunggu dulu"; 53.0-56.18: stasiun dengan tenaga kesehatan (Tala berjas) mengukur ulang
    if (u < 4.5) {
      const a = clamp(u / 0.4, 0, 1);
      s += `<g opacity="${f1(a)}" transform="translate(540 520)">${R(-420, -150, 840, 330, 'rgba(0,0,0,.18)', 52, 'transform="translate(0 10)"')}${R(-420, -170, 840, 360, '#fff', 52)}${T(-210, -70, 'Hari ini', '#5B6F77', 36)}${T(-210, 20, '152/96', '#E8665F', 100, 'font-family="JetBrains Mono, monospace"')}${T(-210, 90, '1 kali ukur', COLR.ink, 34)}${T(0, 20, '≠', COLR.ink, 120)}${T(210, -70, 'Diagnosis', '#5B6F77', 36)}${T(210, 20, 'Hipertensi', COLR.ink, 62)}${T(210, 90, 'belum tentu', COLR.coral, 36)}</g>`;
      if (u > 1.4) s += lab2(760, 800, 'Perlu penilaian ulang', { fs: 38, bg: COLR.forest, a: clamp((u - 1.4) / 0.4, 0, 1) });
      const shr = rk('lega', 'angkat_bahu', { legs: { dir: 0 }, tilt: 4, yaw: 0.1 });
      const think = rk('penasaran', 'netral', { legs: { dir: 0 }, armL: { wx: 70, wy: 330, ex: 60, ey: 400, finger: 0, front: 1 }, armR: { wx: 330, wy: 330, ex: 340, ey: 400, finger: 0, front: 1 }, yaw: 0, tilt: -3 });
      const rs = trackR(u, [{ t: 0, d: 0.01, s: rk('waspada', 'netral', { legs: { dir: 0 } }) }, { t: 0.6, d: 0.5, s: shr }, { t: 2.2, d: 0.5, s: think }, { t: 3.6, d: 0.4, s: rk('mengerti', 'pegang_dada', { legs: { dir: 0 } }) }]);
      s += RK(rs, 330, 1330, 0.8, { t, uid: 'rk', outfit: 'harian' });
      s += kori(860, 1060, 0.6, t, { mood: 'think', arm: -30, flip: true, tilt: 8 });
    } else {
      const v = u - 4.5; // 0..3.28
      s = '';
      let wd = stationBg();
      const press = v > 1.5 && v < 1.85 ? 1 : 0;
      const dev = v < 1.5 ? { mode: 'idle' } : v < 2.8 ? { mode: 'ukur', cur: lin(v, [[1.8, 40], [2.5, 150], [2.8, 120]]), press } : { mode: 'hasil', sys: 118, dia: 78, hi: false };
      wd += H.tensi(DEVX, tableTop, DEVS, { ...dev, press });
      const rsit = rk('lega', 'ulur_lengan', { armL: { roll: 0.72 }, yaw: -0.4, gazeX: -0.6 });
      const rss = v < 0.9 ? trackR(v, [{ t: 0, d: 0.01, s: rk('lega', 'duduk') }, { t: 0.1, d: 0.7, s: rsit }]) : rsit;
      wd += `<g>${RK(rss, X0, FY, K0, { t, uid: 'rk', outfit: 'harian' })}</g>`;
      const dots = armPts(rss, 'L', X0, FY, K0).dots, c = dots[8], p = devPort();
      wd += tube(c[0] - 4, c[1] + 22, p[0], p[1]) + cuffAt(rss, X0, FY, K0, v > 1.8 && v < 2.8 ? 0.8 : 0, 8);
      // Tala berjas (tenaga kesehatan) berjalan masuk dari kiri bawah, menekan tombol, mengangguk
      const tx = lerp(1180, 440, sm(v / 1.0)), pressTala = v > 1.45;
      const ts = v < 1.0 ? tk('fokus', 'berdiri', walkCycle(v * 2.0, { dir: -1 })) : trackT(v, [{ t: 0, d: 0.01, s: tk('fokus', 'berdiri', { legs: { dir: 0 } }) }, { t: 1.0, d: 0.5, s: tk('fokus', 'tunjuk', { legs: { dir: 0 }, armL: { wx: -14, wy: 440, ex: 50, ey: 440, finger: 1, fa: 180, front: 1 }, yaw: -0.4, gazeX: -0.6 }) }, { t: 2.9, d: 0.4, s: tk('senang', 'berdiri', { legs: { dir: 0 }, yaw: 0.2 }) }]);
      wd += TK(ts, tx, 1340, 0.86, { t, uid: 'tk', peneliti: true });
      const ca = clamp(v / 0.4, 0, 1);
      wd += `<g opacity="${f1(ca)}">${lab2(430, 600, 'Hari lain: ukur ulang', { fs: 40, bg: COLR.forest })}${lab2(430, 670, 'oleh tenaga kesehatan', { fs: 36, bg: COLR.green })}</g>`;
      if (v > 2.8) wd += `<g opacity="${f1(clamp((v - 2.8) / 0.3, 0, 1))}">${A.check(130, 790, 1.6)}</g>`;
      wd += kori(960, 1010, 0.5, t, { mood: 'happy', arm: -30, flip: true, tilt: 6 });
      s = camG(wd);
    }
    return s;
  },
};

const S4D = { t0: 52.9, tr: { type: 'wipe', d: 0.5 }, draw: S4C.draw };
export const SCENES_D1 = [S1, S2, S3, S3B, S4A, S4B, S4C, S4D];
export { station, ULUR, cuffPoseOn };

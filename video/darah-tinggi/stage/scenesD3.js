// Adegan 10-12: komplikasi serius dan sering tanpa gejala, langkah yang bisa dilakukan (cek rutin, garam, bergerak, obat dari dokter), penutup.
import { RK, TK, rk, tk, clamp, sm, eo, eob, lerp, rLerp, walkCycle, win, f1, A, R, C, E, P, L, T, chip, ks, lin, trackR, trackT, toCv, armPts, cuffAt, STN, camG, w2s, tube, devPort, kori, ringPulse, exMark, qMark, note, lab2, H, COLR } from './common.js';
import { station, ULUR } from './scenesD1.js';
import { logoCard } from './shared.js';

const BG = (id) => A.softBg('#0F5F57', '#0A3830', id);
const cl = (o) => JSON.parse(JSON.stringify(o));
const organCard = (x, y, kind, a = 1, sc = 1, t = 0, warn = false) => {
  const inner = kind === 'otak' ? H.brainStroke(x, y + 6, 0.42, 'iskemik', 0) : kind === 'jantung' ? H.heartCut(x, y + 14, 0.3, { c: 0, t }) : H.kidney(x + 14, y, 0.32);
  return `<g opacity="${f1(a)}"><g transform="translate(${x} ${y}) scale(${sc.toFixed(3)}) translate(${-x} ${-y})">${C(x, y + 8, 110, 'rgba(0,0,0,.18)')}${C(x, y, 110, '#0A3830')}${C(x, y, 110, 'none', `stroke="${warn ? '#F8C038' : '#fff'}" stroke-width="5"`)}${inner}${warn ? `<g transform="translate(${x + 78} ${y - 80})">${C(0, 0, 28, '#F8C038', 'stroke="#172B38" stroke-width="5"')}${T(0, 12, '!', '#172B38', 38)}</g>` : ''}</g></g>`;
};

// ================================================================ 10a. KOMPLIKASI SERIUS (85.0 - 89.4)
const S10A = {
  t0: 85.0, tr: { type: 'iris', d: 0.6, cx: 540, cy: 900 },
  draw(t) {
    const u = t - 85.0;
    let s = A.softBg('#16424A', '#0A2A2D', 'sbD10a') + C(540, 760, 520, 'rgba(255,255,255,.04)');
    const cards = [['otak', 200, 470, 85.5], ['jantung', 540, 410, 86.2], ['ginjal', 880, 470, 86.9]];
    for (const [k, x, y, t0] of cards) { const a = clamp((t - t0) / 0.35, 0, 1); if (a > 0) s += organCard(x, y + Math.sin(t * 1.6 + x) * 6, k, a, 0.7 + 0.3 * eob((t - t0) / 0.5), t, true); }
    // Raka menoleh dan menunjuk organ satu per satu lalu menyentuh dada (hening, serius)
    const base = { legs: { dir: 0 } };
    const toL = rk('khawatir', 'menunjuk', { ...base, armL: { wx: 20, wy: 316, ex: 46, ey: 380, finger: 1, fa: -126, front: 1 }, armR: { wx: 314, wy: 556, ex: 312, ey: 488, finger: 0, fa: -90, front: 0 }, yaw: -0.6, gazeX: -0.9, gazeY: -0.7, fxSpark: 0 });
    const toM = rk('khawatir', 'menunjuk', { ...base, armR: { wx: 330, wy: 270, ex: 350, ey: 370, finger: 1, fa: -80, front: 1 }, yaw: 0.1, gazeY: -0.9, fxSpark: 0 });
    const toR = rk('khawatir', 'menunjuk', { ...base, armR: { wx: 372, wy: 310, ex: 352, ey: 380, finger: 1, fa: -54, front: 1 }, yaw: 0.6, gazeX: 0.9, gazeY: -0.7, fxSpark: 0 });
    const hand = rk('sedih', 'pegang_dada', { ...base, gazeY: 0.5, tilt: -3 });
    const rs = trackR(u, [{ t: 0, d: 0.01, s: rk('khawatir', 'netral', base) }, { t: 0.2, d: 0.35, s: toL }, { t: 1.0, d: 0.35, s: toM }, { t: 1.7, d: 0.35, s: toR }, { t: 2.9, d: 0.6, s: hand }]);
    s += E(540, 1342, 300, 20, 'rgba(0,0,0,.2)') + RK(rs, 540, 1335, 0.85, { t, uid: 'rk', outfit: 'harian' });
    if (t >= 87.3) s += lab2(540, 660, 'Komplikasi berat bisa berakibat fatal', { fs: 36, bg: COLR.coral, w: 900, a: clamp((t - 87.3) / 0.5, 0, 1) });
    s += kori(935, 1260, 0.5, t, { mood: 'normal', arm: 10, flip: true, tilt: 4 });
    return s;
  },
};

// ================================================================ 10b. SERING TANPA GEJALA (89.7 - 94.86)
const S10B = {
  t0: 89.4, tr: { type: 'wipe', d: 0.5 },
  draw(t) {
    const u = t - 89.4;
    let s = H.pathBg(t);
    // Raka berjalan santai, mengangkat tangan menyapa Kori, lalu acungan jempol (merasa sehat) sementara angka tensi di kartu tinggi
    const ph = u * 1.7;
    const walk = rk('senang', 'jalan', walkCycle(ph, { dir: 1 }));
    const wave = rk('senang', 'jalan', { ...walkCycle(ph, { dir: 1 }), armR: { wx: 362, wy: 300, ex: 352, ey: 394 + Math.sin(u * 14) * 6, finger: 0, front: 1 } });
    const thumb = rk('senang', 'jalan', { ...walkCycle(ph, { dir: 1 }), armR: { wx: 342, wy: 392, ex: 330, ey: 470, finger: 0.0, front: 1 } });
    const rs = trackR(u, [{ t: 0, d: 0.01, s: walk }, { t: 1.4, d: 0.25, s: wave }, { t: 3.0, d: 0.25, s: walk }]);
    // lengan tetap mengikuti siklus jalan saat tidak melambai: trackR di atas hanya menimpa saat jeda; hitung ulang jalan dinamis
    const rs2 = (u > 1.4 && u < 3.0) ? { ...rs, legs: walk.legs, bob: walk.bob, lean: walk.lean, armL: walk.armL } : walk;
    const final = (u > 1.4 && u < 3.0) ? rs2 : (u > 3.0 ? rk('mengerti', 'jalan', walkCycle(ph, { dir: 1 })) : walk);
    s += E(540, 1346, 320, 20, 'rgba(0,0,0,.14)') + RK(final, 460, 1340, 0.88, { t, uid: 'rk', outfit: 'harian' });
    // kartu tensi tinggi yang tidak terasa
    const ca = clamp((u - 0.9) / 0.4, 0, 1);
    if (ca > 0) s += `<g opacity="${f1(ca)}" transform="translate(850 ${f1(560 + Math.sin(u * 2) * 8)})">${R(-190, -112, 380, 230, 'rgba(0,0,0,.2)', 36, 'transform="translate(0 8)"')}${R(-190, -112, 380, 230, '#0C2A28', 36)}${T(0, -66, 'Tekanan darah', '#7CF2B7', 28)}${T(0, 30, '160/100', '#FF6B5E', 88, 'font-family="JetBrains Mono, monospace"')}${T(0, 84, 'tidak terasa apa-apa', '#fff', 26)}</g>`;
    // organ melayang (risiko diam-diam)
    const oa = clamp((u - 1.8) / 0.4, 0, 1);
    for (const [k, x, y] of [['otak', 190, 520], ['jantung', 400, 360], ['ginjal', 640, 300]]) if (oa > 0) s += organCard(x, y + Math.sin(t * 1.4 + x) * 8, k, oa * 0.95, 0.62, t, false);
    if (u >= 3.3) s += lab2(560, 650, 'Sering tanpa gejala', { fs: 40, bg: COLR.coral, a: clamp((u - 3.3) / 0.4, 0, 1) });
    if (u >= 0.4 && u < 3.0) s += lab2(250, 690, 'Merasa sehat', { fs: 34, bg: COLR.green, a: clamp((u - 0.4) / 0.4, 0, 1) * (1 - clamp((u - 2.8) / 0.2, 0, 1)) });
    s += kori(860 - Math.sin(u * 1.2) * 20, 1010 + Math.sin(u * 2.3) * 12, 0.5, t, { mood: 'happy', arm: -20, flip: true, tilt: -6, wave: u > 1.4 && u < 3.0 ? 1 : 0 });
    return s;
  },
};

// ================================================================ 11a. JANGAN TUNGGU PUSING (94.86 - 98.46)
const S11A = {
  t0: 94.86, tr: { type: 'iris', d: 0.6, cx: 540, cy: 900 },
  draw(t) {
    const u = t - 94.86;
    const dizzy = rk('bingung', 'usap_mata', { legs: { dir: 1 }, yaw: 0, tilt: 5, dizzy: 0 });
    const no = rk('netral', 'netral', { legs: { dir: 1 }, armR: { wx: 330, wy: 420, ex: 340, ey: 470, finger: 0, front: 1 }, yaw: Math.sin(u * 14) * 0.5 });
    let rs, x = 840, k = 0.85, fy = 1290, cuff = { mode: 'rest', x: 420 }, dev = { mode: 'idle' }, post = '';
    if (u < 1.0) rs = trackR(u, [{ t: 0, d: 0.01, s: rk('penasaran', 'netral', { legs: { dir: 1 } }) }, { t: 0.1, d: 0.35, s: dizzy }]);
    else if (u < 1.8) { rs = trackR(u, [{ t: 0, d: 0.01, s: dizzy }, { t: 1.0, d: 0.3, s: rk('waspada', 'netral', { legs: { dir: 1 }, yaw: Math.sin(u * 14) * 0.5, armR: { wx: 330, wy: 420, ex: 340, ey: 470, finger: 0, front: 1 } }) }]); rs.yaw = Math.sin((u - 1.0) * 14) * 0.5; }
    else if (u < 2.6) { x = lerp(840, 722, (u - 1.8) / 0.8); rs = rk('semangat' in {} ? 'senang' : 'senang', 'jalan', walkCycle((u - 1.8) * 1.9, { dir: -1 })); }
    else rs = trackR(u, [{ t: 0, d: 0.01, s: rk('senang', 'jalan', walkCycle(0.8 * 1.9, { dir: -1 })) }, { t: 2.6, d: 0.25, s: rk('senang', 'netral', { legs: { dir: 0 } }) }, { t: 2.85, d: 0.7, s: rk('senang', 'duduk') }, { t: 3.4, d: 0.2, s: ULUR('lega', { armL: { roll: 0.72 } }) }]);
    if (u >= 2.6) x = lerp(722, 714, sm((u - 2.6) / 0.8));
    // gelembung "pusing?" lalu dicoret
    if (u >= 0.3 && u < 1.9) { const a = clamp((u - 0.3) / 0.25, 0, 1) * (1 - clamp((u - 1.7) / 0.2, 0, 1)); post += `<g opacity="${f1(a)}" transform="translate(${x - 120} 660)">${R(-170, -52, 340, 104, '#fff', 40)}${T(0, 18, 'Pusing dulu?', COLR.ink, 40)}</g>`; }
    if (u >= 1.0 && u < 1.9) post += `<g opacity="${f1(clamp((u - 1.0) / 0.2, 0, 1))}" transform="translate(${x - 120} 660)">${A.cross(160, -40, 1.1)}</g>`;
    const kx = u < 2.6 ? 420 : 380;
    post += kori(kx, 1000 + Math.sin(u * 2.3) * 8, 0.55, t, { mood: u < 1.8 ? 'normal' : 'happy', arm: u > 1.0 && u < 1.8 ? -45 : -12, tilt: 4, wave: 0 });
    return station(t, { rs, x, fy, k, cuff, dev, post });
  },
};

// ================================================================ 11b. CEK TEKANAN DARAH SECARA BERKALA (98.46 - 100.3)
const S11B = {
  t0: 98.46, tr: { type: 'wipe', d: 0.01 },
  draw(t) {
    const u = t - 98.46;
    const press = u > 0.1 && u < 0.4 ? 1 : 0;
    const dev = u < 0.1 ? { mode: 'idle' } : u < 1.3 ? { mode: 'ukur', cur: lin(u, [[0.3, 30], [0.8, 140], [1.3, 118]]), press } : { mode: 'hasil', sys: 118, dia: 76, hi: false };
    const infl = u > 0.4 && u < 1.3 ? sm((u - 0.4) / 0.4) * (1 - sm((u - 0.9) / 0.4)) : 0;
    const thumbs = rk('senang', 'ulur_lengan', { armL: { roll: 0.72 }, armR: { wx: 346, wy: 360, ex: 330, ey: 460, finger: 0, front: 1 }, yaw: 0, gazeX: 0 });
    const rs = trackR(u, [{ t: 0, d: 0.01, s: ULUR('lega') }, { t: 1.4, d: 0.4, s: thumbs }]);
    let post = '';
    const [dsx, dsy] = [0, 0];
    post += kori(400 + Math.sin(u * 2) * 6, 1000, 0.55, t, { mood: 'happy', arm: u > 0.05 && u < 0.5 ? -40 : -14, tilt: -4 });
    // kalender: cek berulang (centang demi centang), bukan sekali
    let screen = '';
    const days = ['S', 'S', 'R', 'K', 'J'];
    const ca = clamp((u - 0.2) / 0.3, 0, 1);
    screen += `<g opacity="${f1(ca)}" transform="translate(540 330)">${R(-360, -76, 720, 152, 'rgba(0,0,0,.22)', 40, 'transform="translate(0 8)"')}${R(-360, -76, 720, 152, '#fff', 40)}${T(0, -30, 'Cek berkala', COLR.forest, 36)}${[0, 1, 2, 3].map((i) => `<g transform="translate(${-225 + i * 150} 28)">${R(-50, -30, 100, 68, '#E4F1EC', 16)}${T(0, -4, ['Cek 1', 'Cek 2', 'Cek 3', 'Cek 4'][i], COLR.ink, 22)}<g opacity="${f1(clamp((u - 0.4 - i * 0.28) / 0.15, 0, 1))}">${A.check(0, 28, 0.5)}</g></g>`).join('')}</g>`;
    return station(t, { rs, cuff: { mode: 'on', inflate: infl }, dev, post, screen });
  },
};

// ================================================================ 11c. KURANGI GARAM BERLEBIHAN (100.3 - 102.0)
const S11C = {
  t0: 100.3, tr: { type: 'iris', d: 0.5, cx: 540, cy: 1000 },
  draw(t) {
    const u = t - 100.3;
    let s = H.kitchenBg() + H.counter(60, 1020, 1060);
    const RX = 470, RF = 1335, RKk = 0.85;
    // Raka mengambil botol garam di kanan, menaburkan sedikit (3 kali goyang) ke wajan, mengembalikannya, lalu mencicipi
    const reach = rk('penasaran', 'siapkan', { legs: { dir: 0 }, armR: { wx: 372, wy: 520, ex: 344, ey: 500, finger: 0, front: 1 }, yaw: 0.3, gazeX: 0.6, gazeY: 0.4 });
    const hold = rk('penasaran', 'siapkan', { legs: { dir: 0 }, armR: { wx: 300, wy: 392, ex: 346, ey: 450, finger: 0, front: 1 }, yaw: -0.2, gazeX: -0.5, gazeY: 0.5 });
    const rs = trackR(u, [{ t: 0, d: 0.01, s: rk('penasaran', 'siapkan', { legs: { dir: 0 } }) }, { t: 0.15, d: 0.3, s: reach }, { t: 0.55, d: 0.3, s: hold }, { t: 1.25, d: 0.3, s: reach }, { t: 1.6, d: 0.2, s: rk('lega', 'siapkan', { legs: { dir: 0 } }) }]);
    const shake = (u > 0.8 && u < 1.2) ? Math.sin((u - 0.8) * 30) * 5 : 0;
    s += H.pan(310, 1052, 1.1, 0.8 + 0.2 * Math.sin(u * 4));
    s += RK(rs, RX, RF, RKk, { t, uid: 'rk', outfit: 'harian' });
    const hand = armPts(rs, 'R', RX, RF, RKk).hand;
    const shaker = u < 1.55 ? [hand[0] + 6, hand[1] - 38 + shake, 70 + shake * 2] : [hand[0] + 6, hand[1] - 38, 0];
    s += H.saltShaker(shaker[0], shaker[1], 0.62, 180 - (u > 0.55 && u < 1.3 ? 150 : 0) + (shaker[2] - 70) * 0.5);
    // butir garam sedikit
    if (u > 0.8 && u < 1.4) for (let i = 0; i < 6; i++) { const v = ((u - 0.8) * 2.2 + i * 0.17) % 1; s += C(f1(hand[0] - 30 - i * 5 + Math.sin(i) * 8), f1(hand[1] + 10 + v * 130), 3.2, '#fff', `opacity="${f1(1 - v)}"`); }
    s += lab2(540, 470, 'Kurangi garam berlebihan', { fs: 40, bg: COLR.coral, w: 840, a: clamp((u - 0.1) / 0.3, 0, 1) });
    s += kori(900, 960 + Math.sin(u * 2.4) * 8, 0.55, t, { mood: 'happy', arm: -24, flip: true, tilt: 6 });
    return s;
  },
};

// ================================================================ 11d. TETAP AKTIF BERGERAK (102.0 - 103.9)
const S11D = {
  t0: 102.0, tr: { type: 'wipe', d: 0.45 },
  draw(t) {
    const u = t - 102.0;
    let s = H.pathBg(t * 1.6);
    const ph = u * 2.1;
    const rs = rk('senang', 'jalan', walkCycle(ph, { dir: 1, swing: 40, lift: 34, stride: 42 }));
    rs.armR.wy -= 10; rs.armL.wy -= 10;
    s += E(480, 1346, 320, 20, 'rgba(0,0,0,.14)') + RK(rs, 480, 1340, 0.9, { t, uid: 'rk', outfit: 'harian' });
    s += lab2(540, 520, 'Tetap aktif bergerak', { fs: 44, bg: COLR.green, w: 800, a: clamp((u - 0.1) / 0.3, 0, 1) });
    // detak jantung kecil sehat menyertai langkah
    s += `<g opacity="${f1(clamp((u - 0.5) / 0.4, 0, 1))}" transform="translate(850 760)">${H.heartCut(0, 0, 0.2, { c: 0.5 + 0.5 * Math.sin(u * 8), t })}</g>`;
    s += kori(780 - Math.sin(u * 3) * 10, 1010 + Math.sin(u * 4) * 14, 0.5, t, { mood: 'happy', arm: -20, flip: true, tilt: -8 });
    return s;
  },
};

// ================================================================ 11e. OBAT DARI DOKTER: MINUM SESUAI ANJURAN, JANGAN BERHENTI SENDIRI (103.9 - 109.3)
const S11E = {
  t0: 103.9, tr: { type: 'iris', d: 0.6, cx: 540, cy: 900 },
  draw(t) {
    const u = t - 103.9;
    let s = H.kitchenBg().replace(/<rect[^>]*fill="#FFFDF6"[^>]*\/>/, '') + H.counter(60, 1020, 1090);
    const RX = 300, RF = 1335, RKk = 0.82;
    // Tala (peneliti berjas, berperan dokter) menyerahkan resep; Raka menerima, minum obat dengan air, lalu menggeleng saat ditanya berhenti sendiri
    const take = rk('penasaran', 'siapkan', { legs: { dir: 0 }, armR: { wx: 376, wy: 524, ex: 346, ey: 500, finger: 0, front: 1 }, yaw: 0.4, gazeX: 0.7, gazeY: 0.5 });
    const pillTo = rk('senang', 'ke_mulut', { legs: { dir: 0 }, tilt: -4 });
    const drink = rk('lega', 'ke_mulut', { legs: { dir: 0 }, armR: { wx: 232, wy: 300, ex: 326, ey: 372, finger: 0, front: 1 }, tilt: -10, gazeY: -0.3 });
    const noShake = rk('netral', 'netral', { legs: { dir: 0 }, armR: { wx: 330, wy: 420, ex: 340, ey: 470, finger: 0, front: 1 }, armL: { wx: 70, wy: 420, ex: 60, ey: 480, finger: 0, front: 1 } });
    const rs = trackR(u, [{ t: 0, d: 0.01, s: rk('penasaran', 'netral', { legs: { dir: 0 }, yaw: 0.3, gazeX: 0.5 }) }, { t: 0.9, d: 0.4, s: take }, { t: 2.0, d: 0.4, s: rk('mengerti', 'netral', { legs: { dir: 0 } }) }, { t: 2.3, d: 0.3, s: pillTo }, { t: 2.9, d: 0.3, s: drink }, { t: 3.5, d: 0.3, s: noShake }]);
    if (u > 3.7) rs.yaw = Math.sin((u - 3.7) * 12) * 0.5;
    if (u > 1.3 && u < 2.3) { const q = Math.sin((u - 1.3) * 9) * 8; rs.armR.wx += q; rs.armR.wy += q * 0.5; rs.tilt += Math.sin(u * 6) * 2; }
    s += H.pillbox(440, 1058, 0.9, u > 1.8 && u < 2.4 ? 1 : 0) + H.glass(560, 1042, 1.0, u > 2.9 && u < 3.4 ? 0.3 : 0.7);
    s += RK(rs, RX, RF, RKk, { t, uid: 'rk', outfit: 'harian' });
    // Tala
    const ts = trackT(u, [{ t: 0, d: 0.01, s: tk('fokus', 'catat', { legs: { dir: 0 }, yaw: -0.3 }) }, { t: 0.6, d: 0.4, s: tk('fokus', 'tunjuk', { legs: { dir: 0 }, armR: { wx: 330, wy: 440, ex: 322, ey: 462, finger: 0.0, front: 1 }, yaw: -0.4 }) }, { t: 3.6, d: 0.4, s: tk('senang', 'tunjuk', { legs: { dir: 0 }, armR: { wx: 348, wy: 380, ex: 330, ey: 450, finger: 0, front: 1 }, yaw: -0.3 }) }]);
    s += TK(ts, 790, 1340, 0.82, { t, uid: 'tk', peneliti: true });
    // resep di tangan Tala (papan klip)
    const ta = armPts(ts, 'R', 790, 1340, 0.82).hand;
    s += H.clipboard(ta[0] - 18, ta[1] - 40, 0.9);
    if (u >= 0.4 && u < 2.9) s += lab2(560, 560, 'Minum sesuai anjuran dokter', { fs: 36, bg: COLR.forest, w: 860, a: clamp((u - 0.4) / 0.3, 0, 1) });
    if (u >= 2.9) { const a = clamp((u - 2.9) / 0.3, 0, 1); s += lab2(560, 540, 'Jangan berhenti sendiri', { fs: 40, bg: COLR.coral, w: 800, a }) + `<g opacity="${f1(a)}">${A.cross(190, 540, 0.9)}</g>`; }
    s += kori(545, 930 + Math.sin(u * 2.3) * 8, 0.5, t, { mood: 'happy', arm: -24, flip: true, tilt: 6 });
    return s;
  },
};

// ================================================================ 12. PENUTUP (109.3 - 115.12)
const S12 = {
  t0: 109.3, tr: { type: 'wipe', d: 0.5 },
  draw(t) {
    const u = t - 109.3;
    let s = A.creamBg('cbD12');
    const f = sm((u - 1.6) / 0.7);  // jantung mengecil dan naik memberi ruang logo
    const hc = [540, lerp(640, 330, f)], hs = lerp(0.7, 0.26, f);
    const beat = ((u / 0.9) % 1), con = beat < 0.16 ? sm(beat / 0.16) : 1 - sm((beat - 0.16) / 0.6);
    s += `<g>${H.heartCut(hc[0], hc[1], hs, { c: clamp(con, 0, 1), t, flow: 1 })}</g>`;
    if (f < 0.9) s += H.label(hc[0] + 150 * hs / 0.7 * 0.7, hc[1] + 20, 940, 940, 'Jantung', { a: 1 - f, anchor: 'end', line: COLR.coral }).replace(/fill="rgba\(6,28,32,\.88\)"/g, 'fill="rgba(6,28,32,.88)"');
    // Raka menunjuk jantung, lalu melambai; Kori melompat girang lalu melambai
    const point = rk('menunjuk', 'menunjuk', { legs: { dir: 0 }, yaw: 0.3, gazeX: 0.6, gazeY: -0.4, armR: { wx: 366, wy: 330, ex: 344, ey: 392, finger: 1, fa: -52, front: 1 } });
    const wave = rk('senang', 'sapa', { legs: { dir: 0 }, yaw: 0.2 });
    const rs = trackR(u, [{ t: 0, d: 0.01, s: rk('penasaran', 'netral', { legs: { dir: 0 } }) }, { t: 0.1, d: 0.4, s: point }, { t: 1.8, d: 0.4, s: wave }]);
    if (u > 2.2) { const w = Math.sin((u - 2.2) * 9); rs.armR.wy += w * 34; rs.armR.wx += w * 10; rs.armR.ex += w * 6; rs.tilt += w * 3; rs.bob -= Math.abs(Math.sin((u - 2.2) * 4.5)) * 8; }
    s += E(150, 1346, 150, 14, 'rgba(0,0,0,.12)') + RK(rs, 150, 1340, 0.72, { t, uid: 'rk', outfit: 'harian' });
    const hop = u < 1.6 ? Math.abs(Math.sin(u * 4)) * 40 : 0;
    s += kori(930, 1200 - hop, 0.62, t, { mood: 'happy', arm: -20, flip: true, tilt: -6, wave: u > 1.8 ? 1 : 0 });
    if (u >= 1.7) { const a = clamp((u - 1.7) / 0.4, 0, 1); s += logoCard(540, 640, 0.85 + 0.15 * eob((u - 1.7) / 0.5), a, 760); }
    if (u >= 1.9) for (let i = 0; i < 4; i++) { const p = (((u - 1.9) * 0.6 + i * 0.25) % 1); s += A.sparkle(540 + (i - 1.5) * 190 + Math.sin(i * 3 + u * 2) * 20, 560 - p * 40 + (i % 2) * 150, 0.5 + 0.5 * Math.sin(p * Math.PI), '#F8C038', Math.sin(p * Math.PI)); }
    if (u >= 3.6) { const a = clamp((u - 3.6) / 0.3, 0, 1); s += chip(540, 840, 'Belajar bersama, gratis', { bg: COLR.green, fs: 38, a, k: 0.9 + 0.1 * eob((u - 3.6) / 0.4), w: 640 }); }
    if (u >= 4.5) { const a = clamp((u - 4.5) / 0.3, 0, 1); s += chip(540, 980, 'medcoel.com', { bg: COLR.coral, fs: 62, a, k: 0.9 + 0.1 * eob((u - 4.5) / 0.4), w: 640 }); }
    return s;
  },
};

export const SCENES_D3 = [S10A, S10B, S11A, S11B, S11C, S11D, S11E, S12];

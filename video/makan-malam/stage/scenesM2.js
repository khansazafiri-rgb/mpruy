// Adegan 10-18: kebiasaan (lewatkan makan, lapar malam, begadang), langkah praktis, konsisten vs ekstrem, konsultasi, penutup tenang, outro.
import { rk, RK, TK, tk, M, BR, keyed, pchip, pop, popK, popA, topChip, rLerp, lerpTeman, walkCycle, f1, COL, A, R, C, E, P, L, T, chip, card, getKori, getLogo } from './core.js';
import { clamp, lerp, sm, eo, eob, win } from './core.js';
import { rakaSvg, raka } from '../../../brand/characters/raka/raka.js';
import * as B from './art2.js';
import { koriAt, ARMS_TABLE, TK_, TFY } from './scenesM1.js';

const FY = 1330;
const tag = (t, a, b, txt, x = 540, y = 345, fs = 30, w = 760) => { const al = win(t, a, b, 0.2); if (al < 0.01) return ''; return `<g opacity="${al.toFixed(3)}" transform="translate(${x} ${y})"><rect x="${-w / 2}" y="-28" width="${w}" height="56" rx="28" fill="rgba(255,255,255,.92)"/>${T(0, 11, txt, COL.forest, fs)}</g>`; };

// ================================================================ 10. WAKTU MAKAN <-> KEBIASAAN (36.98 - 40.56)
function kebiasaan(t) {
  let o = A.softBg('#0F5F57', '#0A3830', 'sbK');
  const st = keyed([{ t: 0, d: 0.01, s: rk('berpikir', 'berpikir', { yaw: 0, gazeY: -0.4, mouth: M.mid }) }, { t: 38.9, d: 0.4, s: rk('senang', 'menunjuk', { mouth: M.smile, happyEyes: 0.3 }) }], t, rLerp);
  o += RK(st, 540, FY, 1.0, { t, uid: 'rkK', outfit: 'santai' });
  const L1 = pop(t, 37.58, 230, 640, `<g transform="translate(230 640)">${R(-170, -150, 340, 300, 'rgba(0,0,0,.2)', 44, 'transform="translate(0 10)"')}${R(-170, -150, 340, 300, '#fff', 44)}${A.plate(0, -20, 0.8, 'nasi')}${A.wallClock(80, 70, 50, 21.0, '')}${T(0, 128, 'WAKTU MAKAN', COL.forest, 34)}</g>`, 0.45);
  const R1 = pop(t, 39.34, 850, 640, `<g transform="translate(850 640)">${R(-170, -150, 340, 300, 'rgba(0,0,0,.2)', 44, 'transform="translate(0 10)"')}${R(-170, -150, 340, 300, '#fff', 44)}${A.moon(-80, -50, 36, '#fff')}${A.apple(0, -30, 0.9)}${B.shoeIcon(86, -30, 0.7)}${T(0, 128, 'KEBIASAANMU', COL.forest, 34)}</g>`, 0.45);
  o += L1 + R1;
  if (t > 39.5) o += `<g opacity="${clamp((t - 39.5) / 0.3, 0, 1)}">${L('M410 640H670', '#fff', 10, 'stroke-dasharray="3 16"')}${C(540, 640, 30, COL.gold)}${L('M526 640h28M540 626v28', COL.forest, 7)}</g>`;
  o += topChip(t, 37.05, 40.5, 'WAKTU MAKAN BERKAITAN DENGAN KEBIASAAN', { w: 1000, fs: 34, bg: COL.green });
  return o;
}

// ================================================================ 11. MELEWATKAN MAKAN SIANG (40.56 - 43.42)
function siang(t) {
  let o = A.campusBg(t, 1100) + R(-100, 1190, 1300, 900, '#E9D5B5');
  const st = keyed([{ t: 0, d: 0.01, s: rk('berpikir', 'netral', { ...ARMS_TABLE, mouth: M.mid, gazeY: 0.5, yaw: 0.2 }) }], t, rLerp);
  o += RK(st, 620, TFY, TK_, { t, uid: 'rkS', outfit: 'kuliah' });
  o += R(-100, 1196, 1300, 30, '#C9A27A', 8) + R(-100, 1226, 1300, 260, '#B3844F');
  o += `<g transform="translate(620 1170)">${R(-130, -150, 260, 156, '#2E3744', 14)}${R(-118, -138, 236, 132, '#CFE8FF', 8)}${R(-150, 6, 300, 18, '#C9D4D9', 8)}</g>`;
  o += `<g transform="translate(250 1200)">${A.plate(0, 0, 1.1, 'nasi')}</g>${A.book(930, 1190, 1.2, COL.sky)}`;
  o += A.wallClock(930, 480, 90, 12.5, '') + B.digitalClock(930, 670, '12.30', 0.75);
  const a = clamp((t - 41.64) / 0.3, 0, 1);
  o += `<g opacity="${a}" transform="translate(250 1030)">${R(-150, -34, 300, 68, COL.indigo, 34)}${T(0, 12, 'DILEWATI', '#fff', 34)}</g>`;
  o += topChip(t, 40.6, 43.4, 'CONTOH: LEWATKAN MAKAN SIANG', { w: 940, fs: 36, bg: COL.indigo });
  o += tag(t, 41.0, 43.4, 'bisa terjadi pada siapa saja, bukan salahmu', 540, 1320, 28, 860);
  return o;
}

// ================================================================ 12. LAPAR BANGET DI MALAM (43.42 - 47.6)
function malamLapar(t) {
  const RX = 620, k = TK_;
  const st = keyed([{ t: 0, d: 0.01, s: rk('lapar', 'netral', { ...ARMS_TABLE, mouth: M.hungry, wide: 0.8, bags: 0.2, ...BR(-8, 14, -8, -14) }) }, { t: 45.8, d: 0.4, s: rk('lapar', 'netral', { ...ARMS_TABLE, mouth: M.hungry, wide: 0.9, bags: 0.3, ...BR(-9, 14, -9, -14) }) }], t, rLerp);
  let w = B.kosNight(t) + RK(st, RX, TFY, k, { t, uid: 'rkM', outfit: 'santai' });
  const [hx, hy] = B.wrist(st, 'R', RX, TFY, k);
  w += B.tableTop() + A.plate(RX - 150, 1204, 1.3, 'nasi') + A.plate(RX + 160, 1204, 1.0, 'nasi') + B.tableFront() + B.spoon(hx, hy + 6, 0, 1.0, true);
  w += A.wallClock(900, 560, 96, 21.0, '') + B.digitalClock(900, 760, '21.00', 0.8, '#FFE08A');
  let ov = topChip(t, 43.5, 47.5, 'CONTOH: LAPAR BANGET DI MALAM', { w: 940, fs: 36, bg: COL.coral });
  if (t > 44.66) ov += `<g opacity="${(0.9 * win(t, 44.66, 47.5, 0.2)).toFixed(2)}" transform="translate(${f1(360)} 780) rotate(${f1(-8 + Math.sin(t * 20) * 4)})">${T(0, 0, 'grrk…', '#FFD9A0', 56)}</g>`;
  ov += tag(t, 45.6, 47.55, 'contoh kemungkinan, bukan untuk semua orang', 540, 1320, 28, 880);
  return w + ov;
}

// ================================================================ 13. BEGADANG (47.6 - 50.94)
function begadang(t) {
  const RX = 640, k = TK_;
  const hour = pchip([[47.5, 23.0], [50.9, 25.5]])(t);
  const st = rk('ngantuk', 'netral', { ...ARMS_TABLE, mouth: M.mid, bags: 0.8, yaw: 0.15 });
  let w = B.kosNight(t) + RK(st, RX, TFY, k, { t, uid: 'rkB', outfit: 'santai' });
  w += B.tableTop() + `<g transform="translate(${RX - 10} 1186)">${R(-150, -170, 300, 176, '#2E3744', 14)}${R(-136, -156, 272, 148, '#CFE8FF', 8)}${R(-170, 6, 340, 18, '#C9D4D9', 8)}</g>` + B.snackBowl(RX + 280, 1196, 0.95) + B.tableFront();
  w += A.wallClock(900, 560, 96, hour % 24, '') + B.digitalClock(900, 760, A.fmtHour(hour % 24), 0.8, '#FFE08A');
  // garis waktu: lebih banyak waktu untuk ngemil
  const u = clamp((t - 48.2) / 2.3, 0, 1);
  let ov = `<g opacity="${clamp((t - 48.0) / 0.3, 0, 1)}" transform="translate(70 360)">${card(0, 0, 940, 150, '#fff', 36)}${R(60, 60, 820, 24, '#E4EBEC', 12)}${R(60, 60, f1(820 * u), 24, COL.indigo, 12)}${T(60, 118, '23.00', '#6D7C84', 24, '', 'start')}${T(880, 118, '02.00', '#6D7C84', 24, '', 'end')}${T(470, 34, 'LEBIH BANYAK WAKTU', COL.forest, 28)}`;
  [0.15, 0.4, 0.62, 0.85].forEach((p, i) => { if (u > p) ov += `<g transform="translate(${f1(60 + 820 * p)} 72) scale(${popK(t, 48.2 + p * 2.3, 0.3).toFixed(3)})">${C(0, 0, 24, '#fff')}${C(0, 0, 24, 'none', 'stroke="#F8C038" stroke-width="5"')}${A.apple(0, 2, 0.4)}</g>`; });
  ov += `</g>`;
  ov += topChip(t, 47.65, 50.9, 'CONTOH: BEGADANG', { w: 640, fs: 42, bg: COL.violet, y: 286 });
  ov += tag(t, 48.6, 50.9, 'kemungkinan, bukan berarti pasti ngemil banyak', 540, 1320, 26, 900);
  return w + ov;
}

// ================================================================ 14. MULAI DARI MANA? (50.94 - 54.06)
function mulai(t) {
  let w = B.kosNight(t, { winX: 170 });
  const st = keyed([{ t: 0, d: 0.01, s: rk('berpikir', 'berpikir', { yaw: 0.3, gazeY: -0.5, mouth: M.mid }) }], t, rLerp);
  w += RK(st, 600, FY, 1.05, { t, uid: 'rkQ', outfit: 'santai' });
  let ov = topChip(t, 51.0, 54.0, 'KALAU KAMU INGIN MENURUNKAN BERAT BADAN', { w: 1000, fs: 32, bg: COL.indigo });
  const k = popK(t, 52.74, 0.45), a = popA(t, 52.74);
  ov += `<g opacity="${a}" transform="translate(800 640) scale(${k.toFixed(3)})">${A.thought(-190, -150, 380, 240, '#fff', [-150, 160])}${T(0, 40, '?', COL.coral, 170)}</g>`;
  ov += tag(t, 52.3, 54.0, 'tidak semua orang perlu menurunkan berat badan', 540, 1320, 28, 920);
  return w + ov;
}

// ================================================================ 15a. PIRING SEIMBANG + PORSI (54.06 - 58.94)
function piring(t) {
  let o = A.softBg('#0F5F57', '#0A3830', 'sbP');
  const st = keyed([{ t: 0, d: 0.01, s: rk('senang', 'netral', { ...ARMS_TABLE, mouth: M.smile, happyEyes: 0.3 }) }], t, rLerp);
  o += RK(st, 330, FY + 10, 1.0, { t, uid: 'rkP', outfit: 'santai' });
  o += R(-100, 1196, 1300, 30, '#B3744A', 8) + R(-100, 1226, 1300, 260, '#8A5A34');
  const pa = popK(t, 55.1, 0.45);
  o += `<g transform="translate(720 1000) scale(${pa.toFixed(3)})" opacity="${popA(t, 55.1)}">${B.plateVaried(0, 80, 1.9)}</g>`;
  o += pop(t, 55.3, 740, 700, `<g transform="translate(740 690)">${R(-300, -40, 600, 80, COL.green, 40)}${T(0, 14, 'MAKAN CUKUP & SEIMBANG', '#fff', 38)}</g>`, 0.4);
  if (t > 57.62) { const u = clamp((t - 57.62) / 0.5, 0, 1); o += `<g opacity="${u}"><circle cx="720" cy="1080" r="${f1(200 + 20 * (1 - u))}" fill="none" stroke="${COL.gold}" stroke-width="10" stroke-dasharray="4 18" stroke-linecap="round"/></g>` + pop(t, 57.62, 720, 1330, `<g transform="translate(720 840)">${R(-250, -40, 500, 80, COL.gold, 40)}${T(0, 14, 'PERHATIKAN PORSI', COL.forest, 38)}</g>`, 0.4).replace('translate(720 840)', 'translate(720 830)'); }
  o += topChip(t, 54.1, 58.9, 'MULAI DARI POLA MAKAN', { w: 800, fs: 42, bg: COL.coral });
  return o;
}
// 15b. bergerak teratur (58.94 - 60.28)
function gerak(t) {
  let o = A.campusBg(t, 1100) + R(-100, 1190, 1300, 900, '#E9D5B5');
  const st = rk('senang', 'jalan', { ...walkCycle((t - 58.94) * 1.7, { dir: 1 }), yaw: 0.45, mouth: M.smile });
  o += RK(st, lerp(300, 780, clamp((t - 58.94) / 1.34, 0, 1)), FY - 20, 1.0, { t, uid: 'rkG', outfit: 'santai', noIdle: true });
  o += B.shoeIcon(900, 560, 1.5);
  o += topChip(t, 58.96, 60.25, 'BERGERAK TERATUR', { w: 700, fs: 44, bg: COL.sky, fg: COL.forest });
  return o;
}
// 15c. tidur cukup (60.28 - 62.18)
function tidur(t) {
  let w = B.kosNight(t, { winX: 850 });
  const closed = clamp((t - 60.45) / 0.45, 0, 1), inBed = t > 61.1;
  w += B.bed(480, 1110, 1.15);
  // meja kecil dengan laptop yang ditutup
  w += `<g transform="translate(910 1130)">${R(-120, 0, 240, 16, '#B3744A', 6)}${R(-6, 16, 12, 150, '#8A5A34')}${R(-100, -16, 200, 16, '#C9D4D9', 6)}${R(-90, -16 - 130 * (1 - closed), 180, 14 + 130 * (1 - closed), '#2E3744', 8)}${closed < 0.95 ? R(-80, -10 - 120 * (1 - closed), 160, 100 * (1 - closed), '#CFE8FF', 6) : ''}</g>`;
  if (!inBed) {
    const st = rk(closed > 0.9 ? 'ngantuk' : 'berpikir', 'netral', { yaw: 0.5, flip: 0, bags: 0.6, mouth: M.mid });
    w += RK(st, 700, FY, 1.0, { t, uid: 'rkT', outfit: 'santai' });
  } else {
    const st = raka('lega', 'berbaring', { happyEyes: 0.9 });
    w += `<g transform="translate(215 818) scale(.74)">${rakaSvg(st, { bare: true, rebah: true, rebahTilt: -90, shadow: false, uid: 'rkT2', outfit: 'santai' })}</g>`;
    w += `<path d="M410 1104C470 1030 620 1006 730 1018C746 1024 750 1090 748 1140L410 1140Z" fill="#9DE0BD" opacity=".96"/>` + A.zzz(700, 940, t, 1.0);
  }
  w += topChip(t, 60.3, 62.1, 'TIDUR CUKUP', { w: 560, fs: 46, bg: COL.indigo });
  return w;
}

// ================================================================ 16. KECIL & KONSISTEN vs EKSTREM (62.18 - 68.0)
function konsisten(t) {
  let o = A.creamBg('cbC');
  const a1 = popA(t, 62.4), k1 = popK(t, 62.4, 0.45);
  o += `<g opacity="${a1}" transform="translate(540 590) scale(${k1.toFixed(3)}) translate(-540 -590)">${card(70, 400, 940, 380, '#fff', 40)}${R(70, 400, 940, 16, COL.leaf, 8)}${T(540, 480, 'KECIL TAPI KONSISTEN', COL.forest, 46)}`;
  for (let i = 0; i < 7; i++) { const x = 150 + i * 130, t0 = 63.5 + i * 0.4; o += R(x - 44, 540, 88, 120, '#F4F1E8', 18) + T(x, 580, ['SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB', 'MIN'][i], '#9AA9AF', 22); if (t > t0) o += `<g transform="translate(${x} 625) scale(${popK(t, t0, 0.3).toFixed(3)})">${A.check(0, 0, 0.9)}</g>`; }
  o += `</g>`;
  const a2 = popA(t, 65.26), k2 = popK(t, 65.26, 0.45);
  o += `<g opacity="${a2}" transform="translate(540 1030) scale(${k2.toFixed(3)}) translate(-540 -1030)">${card(70, 840, 940, 380, '#fff', 40)}${R(70, 840, 940, 16, COL.coral, 8)}${T(540, 920, 'ATURAN EKSTREM', COL.forest, 46)}`;
  for (let i = 0; i < 7; i++) { const x = 150 + i * 130, on = i < 3; o += R(x - 44, 980, 88, 120, '#F4F1E8', 18) + T(x, 1020, ['SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB', 'MIN'][i], '#9AA9AF', 22); const t0 = 66.0 + i * 0.12; if (on && t > t0) o += `<g transform="translate(${x} 1065) scale(${popK(t, t0, 0.3).toFixed(3)})">${A.check(0, 0, 0.9, COL.gold)}</g>`; else if (!on && t > 66.9 + i * 0.05) o += `<g opacity=".45" transform="translate(${x} 1065)">${L('M-14 -14L14 14M14 -14L-14 14', '#9AA9AF', 6)}</g>`; }
  if (t > 66.44) o += `<g opacity="${clamp((t - 66.44) / 0.3, 0, 1)}">${L('M770 856L810 920L770 960L820 1030L790 1100', COL.coral, 8)}</g>`;
  o += T(540, 1190, 'cuma bertahan beberapa hari', '#6D7C84', 28);
  o += `</g>`;
  o += topChip(t, 62.2, 68.0, 'PILIH YANG BISA KAMU JALANI', { w: 940, fs: 38, bg: COL.green });
  return o;
}

// ================================================================ 17. KONSULTASI TENAGA KESEHATAN (68.0 - 74.96)
function konsultasi(t) {
  let w = A.creamBg('cbQ') + R(-100, 1200, 1300, 900, '#E0D4BC') + R(-100, 1196, 1300, 8, '#C9B99A');
  const rs = keyed([{ t: 0, d: 0.01, s: rk('berpikir', 'berpikir', { yaw: -0.3, mouth: M.mid, bags: 0.15 }) }, { t: 72.4, d: 0.4, s: rk('lega', 'netral', { yaw: -0.3, mouth: M.smile, happyEyes: 0.4 }) }], t, rLerp);
  w += RK(rs, 260, FY, 0.85, { t, uid: 'rkC', outfit: 'harian' });
  const ts = keyed([{ t: 0, d: 0.01, s: tk('fokus', 'catat', { yaw: 0.3, flip: 1 }) }, { t: 72.6, d: 0.4, s: tk('senang', 'tunjuk', { yaw: 0.3, flip: 1 }) }], t, lerpTeman);
  w += TK(ts, 790, FY, 0.95, { t, uid: 'tkC', peneliti: true });
  w += B.stethoscope(900, 1100, 1.1) ;
  let ov = '';
  const b1 = popK(t, 68.92, 0.45), a1 = popA(t, 68.92);
  ov += `<g opacity="${a1}" transform="translate(280 440) scale(${b1.toFixed(3)})">${A.bubble(-210, -80, 420, 130, '#fff', 'bl')}${B.stethoscope(-140, -16, 0.5)}${T(40, -8, 'KONDISI', COL.forest, 32)}${T(40, 26, 'KESEHATAN', COL.forest, 32)}</g>`;
  if (t > 70.38) { const b2 = popK(t, 70.38, 0.45); ov += `<g opacity="${popA(t, 70.38)}" transform="translate(300 590) scale(${b2.toFixed(3)})">${A.bubble(-190, -60, 380, 110, '#fff', 'bl')}${T(0, -4, 'BINGUNG', COL.forest, 34)}${T(0, 30, 'KEBUTUHANMU?', COL.forest, 28)}</g>`; }
  if (t > 72.6) { const b3 = popK(t, 72.6, 0.45); ov += `<g opacity="${popA(t, 72.6)}" transform="translate(790 560) scale(${b3.toFixed(3)})">${A.bubble(-230, -100, 460, 170, COL.mint, 'br')}${T(0, -30, 'KONSULTASI DENGAN', COL.forest, 32)}${T(0, 14, 'TENAGA', COL.forest, 44)}${T(0, 58, 'KESEHATAN', COL.forest, 44)}</g>`; }
  ov += topChip(t, 68.1, 74.9, 'BOLEH BERKONSULTASI', { w: 760, fs: 42, bg: COL.green });
  return w + ov;
}

// ================================================================ 18. PENUTUP TENANG (74.96 - 80.38)
function tenang(t) {
  const RX = 620, k = TK_;
  const eat = Math.max(0, Math.sin(((t - 77.9) * 1.3) * Math.PI)) * (t > 77.9 ? 1 : 0);
  const st = keyed([{ t: 0, d: 0.01, s: rk('lapar', 'netral', { ...ARMS_TABLE, mouth: M.hungry, bags: 0.2 }) }, { t: 76.62, d: 0.4, s: rk('berpikir', 'netral', { ...ARMS_TABLE, mouth: M.mid, bags: 0.2, gazeX: 0.8, gazeY: -0.4 }) }, { t: 77.7, d: 0.5, s: rk('lega', 'netral', { ...ARMS_TABLE, mouth: M.smile, happyEyes: 0.6, bags: 0.2, sparkle: 0.6 }) }], t, rLerp);
  st.armR = { ...st.armR, wy: st.armR.wy - 120 * eat, wx: st.armR.wx - 40 * eat };
  let w = B.kosNight(t) + RK(st, RX, TFY, k, { t, uid: 'rkE', outfit: 'santai' });
  const [hx, hy] = B.wrist(st, 'R', RX, TFY, k);
  w += B.tableTop() + A.plate(RX - 30, 1204, 1.15, 'nasi') + B.tableFront() + B.spoon(hx, hy + 6, -eat * 24, 1.0, true);
  w += A.wallClock(900, 560, 96, 21.0, '') + B.digitalClock(900, 760, '21.00', 0.8, t < 77.7 ? '#FFE08A' : '#9DE0BD');
  let ov = topChip(t, 75.0, 77.15, 'LAPAR SETELAH PULANG KULIAH?', { w: 960, fs: 36, bg: COL.indigo });
  ov += topChip(t, 77.5, 80.3, 'JANGAN LANGSUNG PANIK', { w: 800, fs: 42, bg: COL.green });
  if (t > 77.7) ov += A.sparkle(380, 700, 0.9, COL.gold) + A.sparkle(880, 940, 0.7, COL.gold);
  return w + ov;
}

// ================================================================ 19. OUTRO (80.38 - akhir)
function outro(t) {
  let o = `<defs><linearGradient id="og" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#DDF5EA"/><stop offset="1" stop-color="#F7F2E4"/></linearGradient></defs>${R(-100, -100, 1300, 2200, 'url(#og)')}`;
  for (let i = 0; i < 6; i++) o += `<path d="M540 760L${(-300 + i * 340)} -100L${(-100 + i * 340)} -100Z" fill="#fff" opacity="${(0.28 + 0.1 * Math.sin(t * 0.9 + i)).toFixed(2)}"/>`;
  o += R(-100, 1330, 1300, 700, '#9DE0BD') + R(-100, 1330, 1300, 14, '#7FCBA3');
  const rs = keyed([{ t: 80.3, d: 0.01, s: rk('berpikir', 'berpikir', { yaw: 0.2, mouth: M.mid }) }, { t: 82.6, d: 0.4, s: rk('senang', 'sapa', { yaw: 0.2, happyEyes: 1, mouth: M.smile }) }], t, rLerp);
  if (t > 83.0) rs.armR = { wx: 340 + Math.sin(t * 9) * 14, wy: 318, ex: 350, ey: 404, finger: 0, front: 1 };
  rs.sparkle = t > 82.6 ? 0.5 + 0.3 * Math.sin(t * 5) : 0;
  o += RK(rs, 250, 1334, 0.78, { t, uid: 'rkO', outfit: 'santai' });
  o += koriAt(getKori(), 800, 1336, lerp(1.1, 1.6, eob((t - 80.6) / 0.5)), t, { wave: t > 82.9 ? 1 : 0, a: clamp((t - 80.4) / 0.2, 0, 1) });
  const E_ = (x) => { x = clamp(x, 0, 1); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
  const pp = (t0) => 0.7 + 0.3 * E_((t - t0) / 0.38), aa = (t0) => clamp((t - t0) / 0.15, 0, 1);
  if (t < 82.6) o += chip(540, 400, 'PENASARAN CARA KERJA TUBUH LAIN?', { w: 1000, fs: 34, bg: COL.coral, k: 0.85 + 0.15 * E_((t - 80.4) / 0.4), a: clamp((t - 80.4) / 0.2, 0, 1) });
  if (t > 83.34) o += `<g transform="translate(540 360) scale(${pp(83.34).toFixed(3)})" opacity="${aa(83.34)}"><rect x="-290" y="-84" width="580" height="190" rx="54" fill="rgba(10,56,48,.22)" transform="translate(0 8)"/><rect x="-290" y="-84" width="580" height="190" rx="54" fill="#fff"/><image href="${getLogo()}" x="-230" y="-46" width="460" height="92.7"/></g>`;
  if (t > 82.62) o += `<g transform="translate(540 530) scale(${pp(82.62).toFixed(3)})" opacity="${aa(82.62)}"><rect x="-470" y="-62" width="940" height="140" rx="70" fill="rgba(10,56,48,.22)" transform="translate(0 8)"/><rect x="-470" y="-62" width="940" height="140" rx="70" fill="#E8665F"/>${T(0, 14, 'BELAJAR BARENG MEDCOEL', '#fff', 52)}</g>`;
  if (t > 83.96) o += `<g transform="translate(540 663) scale(${pp(83.96).toFixed(3)})" opacity="${aa(83.96)}"><rect x="-380" y="-50" width="760" height="100" rx="50" fill="rgba(10,56,48,.25)" transform="translate(0 8)"/><rect x="-380" y="-50" width="760" height="100" rx="50" fill="#0A3830"/>${T(0, 22, `<tspan fill="#fff">GRATIS DI</tspan> <tspan fill="#F8C038">medcoel.com</tspan>`, '#fff', 52)}</g>`;
  return o;
}

export const SCENES_M2 = [
  { id: 'kebiasaan', t0: 36.9, draw: kebiasaan, tr: { type: 'whip', d: 0.35 } },
  { id: 'siang', t0: 40.5, draw: siang, tr: { type: 'whip', d: 0.3 } },
  { id: 'malamLapar', t0: 43.38, draw: malamLapar, tr: { type: 'whip', d: 0.3 } },
  { id: 'begadang', t0: 47.55, draw: begadang, tr: { type: 'whip', d: 0.3 } },
  { id: 'mulai', t0: 50.9, draw: mulai, tr: { type: 'iris', d: 0.45, cx: 540, cy: 800 } },
  { id: 'piring', t0: 54.02, draw: piring, tr: { type: 'whip', d: 0.3 } },
  { id: 'gerak', t0: 58.9, draw: gerak, tr: { type: 'whip', d: 0.25 } },
  { id: 'tidur', t0: 60.24, draw: tidur, tr: { type: 'whip', d: 0.25 } },
  { id: 'konsisten', t0: 62.14, draw: konsisten, tr: { type: 'whip', d: 0.3 } },
  { id: 'konsultasi', t0: 67.96, draw: konsultasi, tr: { type: 'whip', d: 0.35 } },
  { id: 'tenang', t0: 74.9, draw: tenang, tr: { type: 'iris', d: 0.5, cx: 620, cy: 900 } },
  { id: 'outro', t0: 80.32, draw: outro, tr: { type: 'iris', d: 0.5, cx: 540, cy: 900 } },
];

// Adegan 1-9: hook alarm, jalan pulang, jam, suara di kepala, "lemak?", Kori menghentikan alarm, masuk tubuh, kalender faktor, bukan tombol ajaib.
import { rk, RK, M, BR, keyed, pchip, pop, popK, popA, topChip, rLerp, walkCycle, f1, COL, A, R, C, E, P, L, T, chip, card, getKori } from './core.js';
import { clamp, lerp, sm, eo, eob, win } from './core.js';
import * as B from './art2.js';

const FY = 1330, TK_ = 1.1, TFY = 1376;
const STAND = { on: 1, dir: 1, L: { dx: 0, lift: 0, kx: 0 }, R: { dx: 0, lift: 0, kx: 0 } };
const ARMS_TABLE = { armL: { wx: 166, wy: 640, ex: 112, ey: 596, finger: 0, fa: -90, front: 1 }, armR: { wx: 242, wy: 600, ex: 300, ey: 650, finger: 0, fa: -90, front: 1 } };
const koriAt = (K, x, y, ks, t, o = {}) => { if (!K) return ''; return koriSvg(K, x, y, ks, t, o); };
import { poseMascot } from './mascot.js';
function koriSvg(K, x, y, ks, t, o) {
  poseMascot(K.r, { t, mood: o.mood ?? 'happy', env: 0, wave: o.wave ?? 0, phase: 0.5, tilt: o.tilt ?? 0 });
  return `<g transform="translate(${f1(x - 160 * ks)} ${f1(y - 290 * ks)}) scale(${ks.toFixed(3)})" opacity="${(o.a ?? 1).toFixed(3)}">${K.r.root.outerHTML}</g>`;
}

// ================================================================ 1. HOOK (0 - 3.96): jam 20.59 -> 21.00, alarm, Raka membeku
function hook(t) {
  const RX = 640, k = TK_, FYm = TFY, frozen = t >= 0.5;
  const punch = 1 + 0.07 * sm((t - 0.5) / 0.35) * (1 - 0.55 * sm((t - 1.2) / 0.8));
  const base = { ...ARMS_TABLE, mouth: M.small };
  const st = frozen ? rk('kaget', 'netral', { ...base, wide: 0.9, mouth: M.o, sweat: 0.7, gazeY: 0.5, bags: 0.2 }) : rk('lapar', 'netral', { ...base, wide: 0.6, mouth: M.hungry, bags: 0.2 });
  if (!frozen) st.armR = { ...st.armR, wy: 600 - 18 * Math.sin(Math.min(1, t / 0.45) * Math.PI) };
  let w = B.kosNight(t) + RK(st, RX, FYm, k, { t, uid: 'rkH', outfit: 'kuliah', noIdle: frozen });
  const [hx, hy] = B.wrist(st, 'R', RX, FYm, k);
  w += B.tableTop() + A.plate(RX - 30, 1204, 1.15, 'nasi') + B.tableFront() + B.spoon(hx, hy + 6, 0, 1.0, true);
  // jam dinding: 20.59 -> 21.00 pada detik 0,5
  const hour = t < 0.5 ? 20 + 59 / 60 : 21.0;
  w += A.wallClock(900, 560, 96, hour, '') + B.digitalClock(900, 760, t < 0.5 ? '20.59' : '21.00', 0.8, t < 0.5 ? '#FFE08A' : '#FF7A6B');
  let ov = '';
  if (frozen) {
    const a = win(t, 0.5, 3.8, 0.12), flash = 0.16 * (0.5 + 0.5 * Math.sin(t * 20)) * win(t, 0.5, 2.2, 0.1);
    ov += `<rect width="1080" height="1920" fill="#D93A3A" opacity="${flash.toFixed(3)}"/>`;
    ov += B.alarmBanner(540, 410, t, a, 0.62 + 0.28 * eob((t - 0.5) / 0.35));
    ov += `<g opacity="${a.toFixed(2)}">${B.alarmClock(230, 790, 1.35, t, clamp(1 - (t - 2.6) / 1.2, 0.15, 1))}</g>`;
    ov += `<g opacity="${a.toFixed(2)}">${B.alarmClock(850, 880, 0.8, t + 0.4, clamp(1 - (t - 2.6) / 1.2, 0.15, 1))}</g>`;
  }
  return `<g transform="translate(540 960) scale(${punch.toFixed(4)}) translate(-540 -960) translate(${f1(frozen ? Math.sin(t * 60) * 3 * win(t, 0.5, 1.0, 0.05) : 0)} 0)">${w}</g>${ov}`;
}

// ================================================================ 2a. JALAN PULANG KULIAH (3.96 - 6.5)
function jalan(t) {
  let w = `<defs><linearGradient id="sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14233F"/><stop offset="1" stop-color="#2B3A63"/></linearGradient></defs>${R(-100, -100, 1300, 2200, 'url(#sk)')}${A.moon(860, 420, 60, '#14233F')}`;
  [[80, 200], [300, 140], [520, 260], [700, 180], [980, 120]].forEach(([x, y], i) => { w += C(x, y, 3.5, '#fff', `opacity="${(0.5 + 0.3 * Math.sin(t * 2 + i)).toFixed(2)}"`); });
  // gedung kampus dan lampu jalan
  for (let i = 0; i < 4; i++) { const x = -40 + i * 300, h = 360 + (i % 2) * 120; w += R(x, 1180 - h, 260, h, '#1B2B4D', 10) + [0, 1, 2].map((r) => [0, 1].map((c) => R(x + 40 + c * 100, 1180 - h + 50 + r * 90, 56, 56, (r + c + i) % 3 === 0 ? '#FFE9A8' : '#2E4170', 8)).join('')).join(''); }
  w += R(-100, 1180, 1300, 900, '#2E2A3E') + R(-100, 1176, 1300, 10, '#141F33') + R(-100, 1300, 1300, 10, 'rgba(255,255,255,.08)');
  [180, 720].forEach((x) => { w += R(x - 6, 780, 12, 400, '#5B6A72', 5) + P(`M${x - 34} 780Q${x} 744 ${x + 34} 780Z`, '#F8C038') + `<path d="M${x - 26} 784L${x - 110} 1180H${x + 110}L${x + 26} 784Z" fill="#FFE9A8" opacity=".10"/>`; });
  const u = clamp((t - 3.96) / 2.5, 0, 1), x = lerp(150, 900, u);
  const st = rk('lapar', 'jalan', { ...walkCycle((t - 3.96) * 1.7, { dir: 1 }), yaw: 0.45, bags: 0.2, mouth: M.hungry, wide: 0.5 });
  st.armR = { wx: 232, wy: 590, ex: 280, ey: 640, finger: 0, fa: -90, front: 1 };
  w += RK(st, x, FY - 30, 0.95, { t, uid: 'rkJ', outfit: 'kuliah', noIdle: true });
  let ov = topChip(t, 4.0, 6.45, 'SELESAI KULIAH, LAPAR', { w: 840, fs: 40, bg: COL.indigo });
  if (t > 4.5) { const a = 0.5 + 0.5 * Math.sin(t * 9); ov += `<g opacity="${(0.9 * win(t, 4.5, 6.4, 0.2)).toFixed(2)}" transform="translate(${f1(x + 60)} ${f1(FY - 640)}) rotate(${f1(-8 + Math.sin(t * 22) * 4)})">${T(0, 0, 'grrk…', '#FFD9A0', 52)}</g>`; }
  return w + ov;
}

// ================================================================ 2b. LIHAT JAM (6.5 - 7.74)
function lihatJam(t) {
  const RX = 640, k = TK_;
  const st = rk('berpikir', 'netral', { ...ARMS_TABLE, yaw: -0.5, gazeX: 0.9, gazeY: -0.5, mouth: M.mid, bags: 0.25, tilt: -4 });
  let w = B.kosNight(t) + RK(st, RX, TFY, k, { t, uid: 'rkH', outfit: 'kuliah' });
  const [hx, hy] = B.wrist(st, 'R', RX, TFY, k);
  w += B.tableTop() + A.plate(RX - 30, 1204, 1.15, 'nasi') + B.tableFront() + B.spoon(hx, hy + 6, 0, 1.0, true);
  w += A.wallClock(900, 560, 96, 21.0, '') + B.digitalClock(900, 760, '21.00', 0.8, '#FF7A6B');
  const z = 1 + 0.1 * sm((t - 6.6) / 1.0);
  return `<g transform="translate(900 650) scale(${z.toFixed(3)}) translate(-900 -650)">${w}</g>` + topChip(t, 6.55, 7.7, 'LIHAT JAM…', { fs: 44, bg: COL.coral, w: 460 });
}

// ================================================================ 3. SUARA DI KEPALA (7.74 - 13.86)
function suara(t) {
  const RX = 600, k = TK_;
  const fr = t > 11.46;
  const st = keyed([{ t: 0, d: 0.01, s: rk('khawatir', 'netral', { ...ARMS_TABLE, mouth: M.worry, bags: 0.25, sweat: 0.2 }) }, { t: 9.46, d: 0.4, s: rk('kaget', 'netral', { ...ARMS_TABLE, mouth: M.o, wide: 0.7, sweat: 0.5, bags: 0.25 }) }, { t: 11.46, d: 0.3, s: rk('khawatir', 'netral', { ...ARMS_TABLE, mouth: M.worry, sweat: 0.8, wide: 0.9, bags: 0.25, ...BR(-8, 10, -8, -10) }) }], t, rLerp);
  let w = B.kosNight(t) + RK(st, RX, TFY, k, { t, uid: 'rkH', outfit: 'kuliah', noIdle: t > 9.46 });
  const [hx, hy] = B.wrist(st, 'R', RX, TFY, k);
  w += B.tableTop() + A.plate(RX - 30, 1204, 1.15, 'nasi') + B.tableFront() + B.spoon(hx, hy + 6, 0, 1.0, true);
  w += A.wallClock(900, 560, 96, 21.0, '') + B.digitalClock(900, 760, '21.00', 0.8, '#FF7A6B');
  let ov = topChip(t, 7.8, 9.4, 'SUDAH JAM 9 MALAM', { w: 760, fs: 42, bg: COL.indigo });
  ov += topChip(t, 9.5, 13.8, 'SUARA DI KEPALA', { w: 640, fs: 44, bg: COL.coral });
  // gelembung suara (alarm kecil + teks), bergetar
  if (t > 9.46) {
    const a = popA(t, 9.46), kk = popK(t, 9.46, 0.45), j = Math.sin(t * 34) * (fr ? 5 : 2.5);
    ov += `<g opacity="${a}" transform="translate(${f1(560 + j)} 560) scale(${kk.toFixed(3)})">${A.thought(-380, -170, 760, 270, '#fff', [40, 150])}<g transform="translate(-270 -40) scale(.55)">${B.alarmClock(0, 0, 1, t, 1)}</g>${T(60, -50, 'JANGAN MAKAN', '#D93A3A', 66)}${T(60, 38, 'MALAM?', '#D93A3A', 80)}</g>`;
  }
  return w + ov;
}

// ================================================================ 4. LANGSUNG JADI LEMAK? (13.86 - 19.2)
function lemak(t) {
  let o = A.softBg('#16406A', '#0B2540', 'sbL');
  const RX = 300, k = 0.7;
  const st = keyed([{ t: 0, d: 0.01, s: rk('bingung', 'berpikir', { yaw: 0.45, gazeX: 0.6, mouth: M.worry, bags: 0.25 }) }, { t: 16.14, d: 0.3, s: rk('kaget', 'berpikir', { yaw: 0.45, gazeX: 0.6, mouth: M.o, wide: 0.6, bags: 0.25 }) }], t, rLerp);
  o += RK(st, RX, FY + 20, k, { t, uid: 'rkL', outfit: 'kuliah' });
  // gelembung besar berisi alur "makanan -> jam 21.00 -> lemak?"
  const ba = popA(t, 14.0), bk = popK(t, 14.0, 0.5);
  o += `<g opacity="${ba}" transform="translate(560 600) scale(${bk.toFixed(3)})">${R(-470, -250, 940, 470, 'rgba(0,0,0,.2)', 70, 'transform="translate(0 10)"')}${R(-470, -250, 940, 470, '#fff', 70)}${C(-300, 250, 20, '#fff')}${C(-340, 312, 13, '#fff')}`;
  o += pop(t, 14.26, -270, -20, `<g transform="translate(-290 -20)">${A.plate(0, 20, 1.15, 'nasi')}${T(0, 112, 'MAKANAN', COL.forest, 32)}</g>`, 0.4);
  const ar = clamp((t - 15.66) / 0.6, 0, 1);
  if (ar > 0) o += `<g opacity="${ar}" transform="translate(0 -20)">${L('M-130 0H90', COL.coral, 14)}${P('M90 -36L150 0L90 36Z', COL.coral)}</g>`;
  if (t > 17.02) o += pop(t, 17.02, 0, -150, `<g transform="translate(-20 -120)">${C(0, 0, 66, '#1A2D52')}${A.moon(14, -8, 36, '#1A2D52')}${T(0, 112, '21.00', COL.indigo, 40)}</g>`, 0.4);
  if (t > 16.14) o += `<g transform="translate(290 -10) scale(${popK(t, 16.14, 0.45).toFixed(3)})" opacity="${popA(t, 16.14)}">${B.fatBlob(0, 0, 0.95, t)}${T(0, 128, 'LEMAK?', COL.coral, 40)}</g>`;
  if (t > 16.6) o += [0, 1, 2].map((i) => A.qmark(160 + i * 110, -190 + Math.sin(t * 4 + i) * 10 - (i % 2) * 24, 0.9, Math.sin(t * 4 + i) * 12)).join('');
  o += `</g>`;
  o += topChip(t, 14.0, 19.1, 'LANGSUNG JADI LEMAK?', { w: 900, fs: 42, bg: COL.coral });
  return o;
}

// ================================================================ 5. KORI MENGHENTIKAN ALARM (19.2 - 22.38)
function kori(t) {
  const K = getKori();
  const RX = 700, k = 0.98;
  const st = keyed([{ t: 0, d: 0.01, s: rk('khawatir', 'netral', { ...ARMS_TABLE, mouth: M.worry, sweat: 0.6, bags: 0.25 }) }, { t: 19.95, d: 0.35, s: rk('lega', 'netral', { ...ARMS_TABLE, mouth: M.smile, happyEyes: 0.5, bags: 0.25, sparkle: 0.6 }) }], t, rLerp);
  let w = B.kosNight(t, { winX: 170 }) + RK(st, RX, FY, k, { t, uid: 'rkH', outfit: 'kuliah' });
  const [hx, hy] = B.wrist(st, 'R', RX, FY, k);
  w += B.tableTop() + A.plate(RX - 50, 1200, 1.0, 'nasi') + B.tableFront() + B.spoon(hx, hy + 6, 0, 0.9, true);
  w += A.wallClock(900, 480, 80, 21.0, '');
  // alarm berhenti saat Kori menekan (19,9)
  const stop = t > 19.9, sh = stop ? 0 : 1;
  const ax = 170, ay = stop ? lerp(760, 860, eo((t - 19.9) / 0.4)) : 760;
  let ov = '';
  ov += B.alarmClock(ax, ay, 1.15, t, sh, { face: stop ? 'x' : 'n' });
  if (!stop) ov += `<g opacity=".95">${B.alarmBanner(540, 400, t, 0.9, 0.62)}</g>`;
  // Kori melompat masuk dari kanan, menekan alarm, lalu melambai
  const jin = sm((t - 19.3) / 0.6), hop = Math.abs(Math.sin((t - 19.3) * 7)) * (t < 19.95 ? 40 : 0);
  const kx = lerp(1250, 330, jin), ky = 1000 - hop + (1 - jin) * -200;
  ov += koriAt(K, t < 19.3 ? 1400 : kx, ky + (t > 19.95 ? 260 * sm((t - 19.95) / 0.5) : 0), 0.95, t, { wave: t > 20.4 ? 1 : 0, a: clamp((t - 19.25) / 0.1, 0, 1) });
  if (t > 19.9 && t < 20.4) { const u = (t - 19.9) / 0.5; ov += `<g opacity="${(1 - u).toFixed(2)}"><circle cx="${ax}" cy="${ay - 60}" r="${f1(40 + 140 * u)}" fill="none" stroke="#fff" stroke-width="${f1(10 * (1 - u))}"/></g>`; }
  if (t > 20.28) {
    const bk = 0.5 + 0.5 * eob((t - 20.28) / 0.35), sh2 = Math.sin(t * 28) * 3 * win(t, 20.28, 20.9, 0.05);
    ov += `<g transform="translate(${f1(540 + sh2)} 560) rotate(-3) scale(${bk.toFixed(3)})" opacity="${popA(t, 20.28)}"><rect x="-440" y="-110" width="880" height="250" rx="48" fill="rgba(0,0,0,.35)" transform="translate(0 12)"/><rect x="-440" y="-110" width="880" height="250" rx="48" fill="${COL.green}"/><rect x="-420" y="-90" width="840" height="210" rx="36" fill="none" stroke="#fff" stroke-width="6" opacity=".7"/>${T(0, -4, 'NGGAK', '#fff', 96)}${T(0, 96, 'SESEDERHANA ITU!', '#FFE08A', 78)}</g>`;
  }
  return w + ov;
}

// ================================================================ 6. MASUK KE DALAM TUBUH (22.38 - 27.02)
function tubuh(t) {
  let o = A.softBg('#0F5F57', '#0A3830', 'sbT');
  const zs = lerp(0.82, 1, eo((t - 22.38) / 0.8));
  o += `<g transform="translate(540 960) scale(${zs.toFixed(3)}) translate(-540 -960)">${B.bodyShell()}${B.gutPipes(t, { rumble: 0.4 })}`;
  // makanan berjalan sepanjang saluran (23,84 -> 26,04)
  const u = clamp((t - 23.84) / 2.3, 0, 1);
  if (t >= 23.84 && u < 1) { const [fx, fy] = B.gutPoint(u); o += `<g transform="translate(${f1(fx)} ${f1(fy)})">${B.food(0, 0, 1 + 0.1 * Math.sin(t * 10))}</g>`; }
  if (u >= 0.35 && t < 27) { for (let i = 0; i < 5; i++) { const a = (t * 2.4 + i * 1.3) % 2.6, v = clamp(a / 2.0, 0, 1); const tx = [540, 330, 750, 460, 620][i], ty = [470, 820, 880, 1250, 1230][i]; const [gx, gy] = B.gutPoint(0.55 + 0.1 * i / 5); o += `<g opacity="${(Math.sin(v * Math.PI) * 0.95).toFixed(2)}" transform="translate(${f1(lerp(gx, tx, v))} ${f1(lerp(gy, ty, v))})">${A.sparkle(0, 0, 0.7, COL.gold)}</g>`; } }
  o += `</g>`;
  // piring masuk mulut
  o += pop(t, 23.84, 840, 520, `<g transform="translate(850 500)">${A.plate(0, 0, 0.8, 'nasi')}${T(0, 70, 'POLA MAKAN', '#fff', 30)}</g>`, 0.4);
  if (t > 23.9 && t < 25) o += `<g opacity="${win(t, 23.9, 25, 0.2).toFixed(2)}">${L('M760 500Q640 470 600 500', '#fff', 6, 'stroke-dasharray="3 14"')}</g>`;
  // energi
  if (t > 24.74) {
    o += pop(t, 24.74, 190, 840, `<g transform="translate(190 840)">${R(-150, -34, 300, 68, COL.gold, 34)}${T(0, 12, 'ENERGI MASUK', COL.forest, 32)}</g>`, 0.4);
    o += pop(t, 25.5, 880, 780, `<g transform="translate(870 780)">${R(-150, -34, 300, 68, COL.coral, 34)}${T(0, 12, 'DIPAKAI', '#fff', 34)}</g>`, 0.4);
    o += pop(t, 25.9, 880, 1000, `<g transform="translate(870 1000)">${R(-150, -34, 300, 68, COL.indigo, 34)}${T(0, 12, 'DISIMPAN', '#fff', 34)}</g>`, 0.4);
    o += `<g opacity="${win(t, 24.8, 27.0, 0.2).toFixed(2)}">${L('M330 840H410', COL.gold, 8)}${P('M410 818L446 840L410 862Z', COL.gold)}</g>`;
  }
  o += topChip(t, 22.45, 23.8, 'DI DALAM TUBUHMU', { w: 640, fs: 42, bg: COL.green });
  o += topChip(t, 23.9, 24.7, 'POLA MAKAN', { w: 460, fs: 42, bg: COL.coral });
  o += topChip(t, 24.8, 27.0, 'KESEIMBANGAN ENERGI', { w: 800, fs: 40, bg: COL.indigo });
  return o;
}

// ================================================================ 7. KALENDER DAN FAKTOR (27.02 - 31.96)
function faktor(t) {
  let o = A.creamBg('cbF');
  const ca = clamp((t - 26.6) / 0.4, 0, 1);
  o += `<g opacity="${ca}" transform="translate(0 ${f1((1 - eo((t - 26.6) / 0.5)) * 40)})">`;
  o += B.calendarGrid(70, 380, 940, 620, t, { rows: 2, fill: (r, c, cx, cy, cw, ch) => {
    const n = r * 7 + c, t0 = 26.8 + n * 0.12, pa = clamp((t - t0) / 0.25, 0, 1); if (pa <= 0) return '';
    const col = [COL.coral, COL.sky, COL.gold, COL.leaf, COL.violet][(n * 3) % 5];
    return `<g opacity="${pa}" transform="translate(${f1(cx)} ${f1(cy + 6)}) scale(${(0.6 + 0.4 * eob((t - t0) / 0.3)).toFixed(3)})">${C(-14, 0, 12, col)}${C(10, 6, 9, [COL.gold, COL.coral, COL.sky][(n + 1) % 3])}${n % 3 === 0 ? C(22, -10, 6, COL.leaf) : ''}</g>`;
  } });
  o += `</g>`;
  const tiles = [[26.9, 'POLA MAKAN', (x, y) => A.plate(x, y + 10, 0.62, 'nasi'), COL.coral], [27.7, 'AKTIVITAS', (x, y) => B.shoeIcon(x, y, 1.0), COL.sky], [28.88, 'TIDUR', (x, y) => A.moon(x, y, 42, '#fff'), COL.indigo], [29.54, 'KESEHATAN', (x, y) => B.stethoscope(x, y - 4, 0.9), COL.leaf], [30.78, 'FAKTOR LAIN', (x, y) => `${C(x - 30, y, 10, COL.violet)}${C(x, y, 10, COL.violet)}${C(x + 30, y, 10, COL.violet)}`, COL.violet]];
  tiles.forEach(([t0, label, ic, col], i) => {
    if (t < t0) return; const x = 76 + i * 188, w = 176, y = 1060, k = popK(t, t0, 0.4), a = popA(t, t0);
    o += `<g transform="translate(${x + w / 2} ${y + 130}) scale(${k.toFixed(3)}) translate(${-(x + w / 2)} ${-(y + 130)})" opacity="${a}">${card(x, y, w, 260, '#fff', 32)}${R(x, y, w, 16, col, 8)}${ic(x + w / 2, y + 120)}${T(x + w / 2, y + 224, label, COL.forest, label.length > 9 ? 22 : 26)}</g>`;
  });
  o += topChip(t, 26.9, 31.9, 'BANYAK FAKTOR, BUKAN SATU JAM', { w: 940, fs: 36, bg: COL.green });
  return o;
}

// ================================================================ 8. BUKAN TOMBOL AJAIB (31.96 - 36.98)
function tombol(t) {
  const K = getKori();
  let o = A.softBg('#16406A', '#0B2540', 'sbB');
  const hour = pchip([[31.9, 20 + 59 / 60], [32.7, 21.0], [36.9, 21.8]])(t);
  const label = A.fmtHour(hour);
  o += `<g transform="translate(540 660)">${A.C(0, 10, 196, 'rgba(0,0,0,.25)')}</g>` + A.wallClock(540, 610, 170, hour, '') + B.digitalClock(540, 850, label, 1.0, t > 32.7 ? '#FF7A6B' : '#FFE08A');
  const bp = clamp(Math.sin(clamp((t - 33.5) / 0.5, 0, 1) * Math.PI), 0, 1);
  o += pop(t, 33.16, 540, 1060, `${B.magicButton(540, 1090, 0.9, bp)}${T(540, 975, 'TOMBOL AJAIB', '#fff', 38)}`, 0.4);
  if (t > 33.56) { const k = eob((t - 33.56) / 0.3); o += `<g transform="translate(540 1100) scale(${clamp(k, 0, 1.1).toFixed(3)})" opacity=".95">${L('M-170 -70L170 90M170 -70L-170 90', COL.coral, 26)}</g>`; }
  // makanan tidak berubah
  o += A.plate(190, 1260, 0.8, 'nasi') + `<g opacity="${clamp((t - 34.38) / 0.3, 0, 1)}">${L('M300 1250H420', '#fff', 8, 'stroke-dasharray="4 12"')}<g transform="translate(560 1250) scale(.5)">${B.fatBlob(0, 0, 1, t)}</g><g transform="translate(560 1250)">${L('M-46 -40L46 40M46 -40L-46 40', COL.coral, 14)}</g></g>`;
  o += koriAt(K, 930, 1330, 0.55, t, { mood: 'think', tilt: Math.sin(t * 6) * 6 * win(t, 33.5, 36, 0.3) });
  o += topChip(t, 32.0, 36.9, 'JAM 9 BUKAN TOMBOL AJAIB', { w: 900, fs: 40, bg: COL.coral });
  return o;
}

export const SCENES_M1 = [
  { id: 'hook', t0: 0, draw: hook },
  { id: 'jalan', t0: 3.96, draw: jalan, tr: { type: 'whip', d: 0.3 } },
  { id: 'lihatjam', t0: 6.5, draw: lihatJam, tr: { type: 'whip', d: 0.25 } },
  { id: 'suara', t0: 7.74, draw: suara, tr: { type: 'whip', d: 0.25 } },
  { id: 'lemak', t0: 13.86, draw: lemak, tr: { type: 'iris', d: 0.45, cx: 540, cy: 700 } },
  { id: 'kori', t0: 19.2, draw: kori, tr: { type: 'whip', d: 0.3 } },
  { id: 'tubuh', t0: 22.38, draw: tubuh, tr: { type: 'iris', d: 0.5, cx: 540, cy: 900 } },
  { id: 'faktor', t0: 27.0, draw: faktor, tr: { type: 'whip', d: 0.35 } },
  { id: 'tombol', t0: 31.96, draw: tombol, tr: { type: 'whip', d: 0.35 } },
];
export { koriAt, ARMS_TABLE, TK_, TFY };

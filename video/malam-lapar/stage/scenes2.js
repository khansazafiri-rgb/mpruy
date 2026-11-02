// Adegan 5-14 "Kenapa malam-malam lapar?" (studi, variasi, begadang, "Nggak harus!", camilan, makan teratur, refluks, rekap, penutup).
import * as A from './art.js';
import { clamp, lerp, sm, eo, eob, win, rk, RK, GR, JB, M, BR, keyed, pchip, pop, popK, popA, topChip, rLerp, gLerp, jLerp, grelin, jambi, getLogo, getKori, SIG } from './scenes.js';

const { R, C, E, P, L, T, chip, card, f1, COL } = A;
const PCOL = ['#5BD0E6', '#E8665F', '#8E7CE8', '#F8C038', '#3DB46E', '#F28CB0', '#5BD0E6', '#E8665F', '#8E7CE8', '#F8C038', '#3DB46E', '#F28CB0'];
const HCOL = ['#262A38', '#4B3621', '#262A38', '#7A4D2C', '#262A38', '#3A2A1F', '#4B3621', '#262A38', '#7A4D2C', '#262A38', '#4B3621', '#3A2A1F'];

// ================================================================ 5. PENELITIAN KECIL 12 ORANG (25.26 - 35.84)
const HPTS = (() => { const X = (h) => 150 + (h - 8) / 18 * 760, Y = (v) => 1270 - v * 480; return [[X(8), Y(0.18)], [X(14), Y(0.5)], [X(20), Y(1)], [X(26), Y(0.42)]]; })();
function studi(t) {
  let o = A.creamBg('cb5');
  const u = sm((t - 28.5) / 0.7); // grid -> strip
  const cardY = lerp(430, 410, u), cardH = lerp(700, 170, u);
  o += card(90, cardY, 900, cardH, '#fff', 40);
  // 12 orang
  for (let i = 0; i < 12; i++) {
    const r = Math.floor(i / 4), c = i % 4;
    const gx = 90 + 112 + c * 225, gy = 535 + r * 168, sx = 150 + i * 70, sy = 490;
    const x = lerp(gx, sx, u), y = lerp(gy, sy, u), s = lerp(0.9, 0.34, u);
    const t0 = 25.9 + i * 0.12;
    if (t < t0) continue;
    const k = 0.5 + 0.5 * clamp(eob((t - t0) / 0.35), 0, 1.1);
    o += `<g opacity="${clamp((t - t0) / 0.1, 0, 1)}" transform="translate(${f1(x)} ${f1(y + 40 * s)}) scale(${k.toFixed(3)}) translate(${-f1(x)} ${-f1(y + 40 * s)})">${A.person(f1(x), f1(y), s, PCOL[i], HCOL[i])}</g>`;
  }
  if (u < 1) o += `<g opacity="${(1 - u).toFixed(2)}">${pop(t, 27.18, 540, 1070, `<g transform="translate(540 1068)">${R(-300, -40, 600, 80, COL.forest, 40)}${T(0, 14, '12 ORANG DEWASA SEHAT', '#fff', 42)}</g>`, 0.4)}</g>`;
  // grafik
  const ga = clamp((t - 28.9) / 0.4, 0, 1);
  if (ga > 0) {
    o += `<g opacity="${ga}" transform="translate(0 ${f1((1 - eo((t - 28.9) / 0.5)) * 40)})">${card(90, 640, 900, 740, '#fff', 40)}`;
    o += L('M120 700V1270H950', '#B7C6CC', 6) + T(130, 690, 'RASA LAPAR', COL.forest, 28, '', 'start');
    const xs = [[8, '08.00'], [14, '14.00'], [20, '20.00'], [26, '02.00']];
    for (const [h, lab] of xs) { const x = 150 + (h - 8) / 18 * 760; o += `<line x1="${f1(x)}" y1="1262" x2="${f1(x)}" y2="1282" stroke="#B7C6CC" stroke-width="5"/>` + T(f1(x), 1322, lab, '#6D7C84', 28); }
    const p = clamp((t - 29.2) / 5.0, 0, 1);
    // malam biologis: pita bulan di belakang kurva
    const mb = clamp((t - 32.76) / 0.5, 0, 1);
    if (mb > 0) o += `<g opacity="${(0.9 * mb).toFixed(2)}">${R(HPTS[2][0] - 150, 730, 300, 540, 'rgba(59,74,140,.13)', 24)}${A.moon(HPTS[2][0] - 100, 1236, 24, '#EDEAF6')}${T(HPTS[2][0] + 14, 1246, 'MALAM BIOLOGIS', COL.indigo, 26)}</g>`;
    o += A.curve(HPTS, p, COL.coral, 14);
    // titik puncak
    const pk = clamp((t - 34.3) / 0.5, 0, 1);
    if (pk > 0) { const [x, y] = HPTS[2]; o += `<g transform="translate(${f1(x)} ${f1(y)})">${C(0, 0, 20 + 8 * Math.sin(t * 9), COL.gold)}${C(0, 0, 11, '#fff')}</g><g transform="translate(${f1(x)} ${f1(y - 70)}) scale(${(0.8 + 0.2 * eob((t - 34.3) / 0.4)).toFixed(3)})" opacity="${pk}">${R(-165, -34, 330, 68, COL.indigo, 34)}${T(0, 13, '± 20.00 · 8 MALAM', '#fff', 34)}</g>`; }
    o += T(540, 1360, 'ILUSTRASI POLA, BUKAN DATA ASLI', '#9AA9AF', 22);
    o += `</g>`;
  }
  o += topChip(t, 25.35, 28.7, 'PENELITIAN KECIL', { w: 640, fs: 42, bg: COL.indigo });
  o += topChip(t, 28.9, 35.8, 'LAPAR MENGIKUTI JAM BIOLOGIS', { w: 900, fs: 36, bg: COL.gold, fg: COL.forest });
  return o;
}

// ================================================================ 6. TIDAK SEMUA SAMA (35.84 - 39.64)
function beda(t) {
  let o = A.softBg('#16406A', '#0B2540', 'sb6');
  const T_ = [19.5, 20.5, 22.0, 23.5];
  for (let i = 0; i < 4; i++) {
    const x = 170 + i * 247, t0 = 36.3 + i * 0.35;
    const bob = Math.sin(t * 3 + i) * 4;
    o += A.person(x, f1(1010 + bob), 1.7, PCOL[i], HCOL[i]).replace('<g ', `<g opacity="${clamp((t - 36.0) / 0.25, 0, 1)}" `);
    if (t > t0) {
      const k = popK(t, t0, 0.4), a = popA(t, t0);
      o += `<g transform="translate(${x} 700) scale(${(k * 1.35).toFixed(3)})" opacity="${a}">${A.thought(-92, -110, 184, 220, '#fff', [0, 130])}<g transform="translate(0 -4)">${A.wallClock(0, -20, 54, T_[i])}</g>${T(0, 62, A.fmtHour(T_[i]), COL.forest, 28)}</g>`;
    }
  }
  const ne = clamp((t - 38.0) / 0.4, 0, 1);
  o += `<g opacity="${ne}">${T(540, 1230, 'JAMNYA BISA BEDA', '#fff', 62)}${T(540, 1290, 'contoh ilustrasi', '#9DE0BD', 30)}</g>`;
  o += topChip(t, 35.95, 39.6, 'TIDAK SEMUA ORANG SAMA', { w: 800, fs: 40, bg: COL.coral });
  return o;
}

// ================================================================ 7. BEGADANG dan KURANG TIDUR (39.64 - 54.58)
function begadang(t) {
  let o = A.nightBg(t, { noWindow: true, noPoster: true });
  const hour = pchip([[39.6, 23.0], [44.66, 23.2], [49.66, 28.0], [54.6, 28.1]])(t);
  const win_ = `<g transform="translate(860 700)">${R(-130, -190, 260, 360, '#0F2036', 16)}${A.moon(40, -90, 36, '#0F2036')}${[[-70, -120], [-30, -60], [-80, 0]].map(([x, y], i) => C(x, y, 3.5, '#fff', `opacity="${(0.5 + 0.3 * Math.sin(t * 2 + i)).toFixed(2)}"`)).join('')}${R(-130, -190, 260, 360, 'none', 16, 'stroke="#B3C2D6" stroke-width="12"')}</g>`;
  o += win_;
  o += A.wallClock(240, 800, 78, hour % 24, A.fmtHour(hour % 24));
  const sleepy = t > 49.9;
  const rs = keyed([
    { t: 0, d: 0.01, s: rk('ngantuk', 'netral', { flip: 1, yaw: 0.45, gazeX: 0.8, bags: 0.6, mouth: M.mid }) },
    { t: 44.66, d: 0.3, s: rk('kaget', 'netral', { flip: 1, yaw: 0.45, gazeX: 0.8, bags: 0.7, wide: 0.6, mouth: M.o }) },
    { t: 45.9, d: 0.5, s: rk('ngantuk', 'netral', { flip: 1, yaw: 0.45, gazeX: 0.8, bags: 0.8, mouth: M.mid }) },
    { t: 50.1, d: 0.4, s: rk('ngantuk', 'usap_mata', { flip: 1, yaw: 0.45, gazeX: 0.4, bags: 1, blink: 0.75, mouth: M.flat }) },
  ], t, rLerp);
  if (sleepy) rs.tilt = (rs.tilt || 0) + Math.sin(t * 2.2) * 4;
  // laptop dan meja
  const desk = R(-100, 1190, 1280, 34, '#B3744A', 8);
  const lap = `<g transform="translate(450 1190)">${P('M-190 0L-160 -190L160 -190L190 0Z', '#2E3744')}${P('M-168 -8L-144 -176L144 -176L168 -8Z', '#CFE8FF', `opacity="${(0.85 + 0.1 * Math.sin(t * 6)).toFixed(2)}"`)}${R(-205, 0, 410, 20, '#C9D4D9', 8)}</g>`;
  o += `${desk}${RK(rs, 760, 1330, 0.85, { t, uid: 'rkD', shadow: false })}${R(-100, 1224, 1280, 220, '#8A5A34')}${R(560, 1224, 380, 150, '#7A4D2C', 10)}${lap}`;
  // lampu meja
  o += `<g transform="translate(110 1190)">${R(-48, -10, 96, 14, '#3A4A58', 7)}${L('M0 -6L-30 -130L34 -220', '#5B6A72', 12)}${P('M8 -220L92 -232L74 -176Z', COL.gold)}</g>`;
  // kartu: kesempatan makan
  const cardA = win(t, 44.7, 49.9, 0.3);
  if (cardA > 0.01) {
    const prog = clamp((t - 45.76) / 3.9, 0, 1);
    o += `<g opacity="${cardA.toFixed(2)}" transform="translate(0 ${f1((1 - eo((t - 44.7) / 0.4)) * 30)})">${card(70, 400, 940, 230, '#fff', 40)}${T(540, 448, 'SEMAKIN LAMA TERJAGA', COL.forest, 32)}`;
    o += R(130, 480, 820, 36, '#E4EBEC', 18) + R(130, 480, f1(820 * prog), 36, COL.indigo, 18);
    ['22.00', '01.00', '04.00'].forEach((s, i) => { o += T(130 + i * 410, 552, s, '#6D7C84', 26, '', i ? (i === 2 ? 'end' : 'middle') : 'start'); });
    [0.17, 0.4, 0.62, 0.86].forEach((p, i) => { const tt = 45.76 + p * 3.9; if (t > tt) { const x = 130 + 820 * p; o += `<g transform="translate(${f1(x)} 498) scale(${popK(t, tt, 0.35).toFixed(3)})">${C(0, 0, 30, '#fff')}${C(0, 0, 30, 'none', 'stroke="#F8C038" stroke-width="6"')}${A.apple(0, 2, 0.5)}</g>`; } });
    o += T(540, 604, 'TIAP JAM = KESEMPATAN MAKAN', COL.coral, 28);
    o += `</g>`;
  }
  // kartu: kurang tidur
  const cardB = win(t, 50.2, 54.6, 0.3);
  if (cardB > 0.01) {
    o += `<g opacity="${cardB.toFixed(2)}" transform="translate(0 ${f1((1 - eo((t - 50.2) / 0.4)) * 30)})">${card(70, 400, 940, 270, '#fff', 40)}${T(540, 446, 'KURANG TIDUR BISA MEMENGARUHI', COL.forest, 30)}`;
    const a1 = clamp((t - 51.5) / 0.3, 0, 1), a2 = clamp((t - 52.76) / 0.3, 0, 1);
    o += `<g opacity="${a1}" transform="translate(290 520)">${E(0, 40, 110, 12, 'rgba(0,0,0,.08)')}<g transform="scale(.3) translate(0 -20)">${A.stomach({ pulse: t, rumble: 1 })}</g><g transform="translate(96 -20)">${P('M0 -30L-26 6H-10V32H10V6H26Z', COL.coral)}</g>${T(0, 76, 'NAFSU MAKAN', COL.coral, 28)}</g>`;
    o += `<g opacity="${a2}" transform="translate(760 520)">${A.donut(-90, 0, 0.8)}${A.chips(0, 0, 0.55)}${A.salad(90, 6, 0.8)}${T(0, 76, 'PILIHAN MAKANAN', COL.indigo, 28)}</g>`;
    const a3 = clamp((t - 53.92) / 0.3, 0, 1);
    o += `<g opacity="${a3}">${R(330, 616, 420, 40, COL.gold, 20)}${T(540, 645, 'pada sebagian orang', COL.forest, 26)}</g>`;
    o += `</g>`;
  }
  o += topChip(t, 39.8, 44.5, 'ADA SATU HAL LAGI', { w: 660, fs: 40, bg: COL.indigo });
  o += topChip(t, 44.7, 50.0, 'BEGADANG', { w: 520, fs: 46, bg: COL.coral, y: 330 });
  o += topChip(t, 50.2, 54.55, 'KURANG TIDUR', { w: 560, fs: 44, bg: COL.violet, y: 330 });
  return o;
}

// ================================================================ 8. NGGAK HARUS! (54.58 - 60.38)
function nggak(t) {
  const c = 1;
  const rs = keyed([
    { t: 0, d: 0.01, s: rk('lapar', 'pegang_perut', { flip: 1, yaw: 0.45, gazeX: 0.8, bags: 0.6, ...BR(-9, 14, -3, -6) }) },
    { t: 56.2, d: 0.4, s: rk('bingung', 'pegang_perut', { flip: 1, yaw: 0.45, gazeX: 0.5, gazeY: -0.3, bags: 0.6, mouth: M.worry, sweat: 0.3, ...BR(-6, 10, -6, -10) }) },
    { t: 59.36, d: 0.2, s: rk('senang', 'pegang_perut', { flip: 1, yaw: 0.45, gazeX: 0.8, bags: 0.4, mouth: M.grin, happyEyes: 0.6, sparkle: 0.8 }) },
  ], t, rLerp);
  let o = `${A.nightBg(t, { noWindow: true, noPoster: true })}<g transform="translate(70 520)">${A.fridge()}</g>${A.fridgeGlow(420, 960, 0.9)}${A.wallClock(945, 585, 64, 23 + 59 / 60, '23.59')}${RK(rs, 748, 1330, 0.92, { t, uid: 'rkE' })}`;
  const q = win(t, 56.9, 59.3, 0.3);
  if (q > 0.01) o += [0, 1, 2].map((i) => A.qmark(660 + i * 90, 470 + Math.sin(t * 5 + i) * 10 + (i % 2) * 40, 0.95, Math.sin(t * 4 + i) * 12)).join('').replace(/<g /, `<g opacity="${q}" `);
  o += topChip(t, 54.7, 59.3, 'HARUS DITAHAN?', { w: 620, fs: 44, bg: COL.indigo });
  if (t > 59.36) {
    const k = 0.5 + 0.5 * clamp(eob((t - 59.36) / 0.3), 0, 1.15), sh = Math.sin(t * 30) * 3 * clamp((60 - t) / 0.4, 0, 1);
    o += `<g transform="translate(${400 + sh} 545) rotate(-6) scale(${k.toFixed(3)})">${R(-350, -75, 700, 160, 'rgba(0,0,0,.28)', 40, 'transform="translate(0 12)"')}${R(-350, -75, 700, 160, COL.coral, 40)}${R(-334, -60, 668, 130, 'none', 30, 'stroke="#fff" stroke-width="5" opacity=".7"')}${T(0, 26, 'NGGAK HARUS!', '#fff', 76)}</g>`;
  }
  return o;
}

// ================================================================ 9. CEK DULU (60.38 - 66.34)
function cek(t) {
  let o = A.creamBg('cb9');
  o += topChip(t, 60.45, 66.3, 'CEK DULU', { w: 460, fs: 46, bg: COL.green });
  const a1 = clamp((t - 60.6) / 0.35, 0, 1);
  o += `<g opacity="${a1}" transform="translate(0 ${f1((1 - eo((t - 60.6) / 0.5)) * 40)})">${card(70, 400, 940, 440, '#fff', 40)}${T(540, 470, 'SUDAH MAKAN CUKUP', COL.forest, 44)}${T(540, 520, 'SEPANJANG HARI?', COL.forest, 44)}`;
  [['PAGI', 62.0], ['SIANG', 62.6], ['MALAM', 63.2]].forEach(([s, tt], i) => {
    const x = 220 + i * 320; o += `<g transform="translate(${x} 0)">${A.plate(0, 665, 0.9, 'nasi')}${T(0, 740, s, '#6D7C84', 28)}${t > tt ? `<g transform="translate(70 615) scale(${popK(t, tt, 0.3).toFixed(3)})">${A.check(0, 0, 0.9)}</g>` : ''}</g>`;
  });
  o += `</g>`;
  if (t < 63.9) o += `<g opacity="${clamp((t - 61.0) / 0.4, 0, 1)}">${R(70, 880, 940, 450, 'rgba(255,255,255,.5)', 40, 'stroke="#B7C6CC" stroke-width="5" stroke-dasharray="4 16" stroke-linecap="round"')}${T(540, 1160, '?', '#B7C6CC', 170)}</g>`;
  const a2 = clamp((t - 63.9) / 0.35, 0, 1);
  if (a2 > 0) {
    o += `<g opacity="${a2}" transform="translate(0 ${f1((1 - eo((t - 63.9) / 0.5)) * 40)})">${card(70, 880, 940, 450, '#fff', 40)}${T(540, 950, 'KAPAN TERAKHIR', COL.forest, 44)}${T(540, 1000, 'KAMU MAKAN?', COL.forest, 44)}`;
    o += `<g transform="translate(0 0)">${A.wallClock(260, 1155, 72, 17.5)}${T(260, 1272, '17.30', COL.forest, 32)}${T(260, 1307, 'terakhir makan', '#6D7C84', 24)}`;
    o += L('M400 1155H650', COL.coral, 10) + P('M650 1125L700 1155L650 1185Z', COL.coral);
    o += A.wallClock(820, 1155, 72, 23 + 47 / 60) + T(820, 1272, '23.47', COL.forest, 32) + T(820, 1307, 'sekarang', '#6D7C84', 24);
    o += `<g transform="translate(540 1110)">${R(-52, -28, 104, 56, COL.gold, 28)}${T(0, 12, 'berapa jam?', COL.forest, 22)}</g>`;
    o += `</g></g>`;
  }
  return o;
}

// ================================================================ 10. CAMILAN (66.34 - 73.1)
function camilan(t) {
  let o = A.softBg('#0F5F57', '#0A3830', 'sb10');
  o += topChip(t, 66.45, 73.0, 'CAMILAN YANG MENGENYANGKAN', { w: 940, fs: 36, bg: COL.gold, fg: COL.forest });
  const slots = [[430, 'BUAH + YOGURT', 70.2, (x, y) => A.yogurtBowl(x, y, 1)], [830, 'ROTI + TELUR', 71.7, (x, y) => A.toastEgg(x, y, 1)]];
  const ph = clamp((t - 67.7) / 0.3, 0, 1);
  for (const [y, lab, t0, fn] of slots) {
    const x = 500, w = 510, h = 350;
    if (t < t0) { o += `<g opacity="${ph}">${R(x, y, w, h, 'rgba(255,255,255,.08)', 40, 'stroke="#fff" stroke-width="5" stroke-dasharray="4 16" stroke-linecap="round"')}${T(x + w / 2, y + 220, '?', 'rgba(255,255,255,.7)', 160)}</g>`; continue; }
    const k = popK(t, t0, 0.45), a = popA(t, t0);
    o += `<g transform="translate(${x + w / 2} ${y + h / 2}) scale(${k.toFixed(3)}) translate(${-(x + w / 2)} ${-(y + h / 2)})" opacity="${a}">${card(x, y, w, h, '#fff', 40)}${fn(x + w / 2, y + 145)}${T(x + w / 2, y + 310, lab, COL.forest, 38)}</g>`;
  }
  const rs = keyed([{ t: 0, d: 0.01, s: rk('netral', 'netral', { yaw: 0.45, gazeX: 0.8, mouth: M.mid }) }, { t: 70.2, d: 0.3, s: rk('senang', 'menunjuk', { yaw: 0.45, gazeX: 0.8, mouth: M.smile, happyEyes: 0.5 }) }], t, rLerp);
  o += RK(rs, 250, 1330, 0.85, { t, uid: 'rkF' });
  return o;
}

// ================================================================ 11. MAKAN TERATUR + TIDUR (73.1 - 77.86)
function teratur(t) {
  let o = A.creamBg('cb11');
  o += topChip(t, 73.2, 76.2, 'MAKAN CUKUP & TERATUR', { w: 860, fs: 38, bg: COL.coral });
  o += topChip(t, 76.3, 77.8, 'TIDUR CUKUP', { w: 520, fs: 42, bg: COL.indigo });
  const a = clamp((t - 73.3) / 0.35, 0, 1);
  o += `<g opacity="${a}">${card(70, 430, 940, 360, '#fff', 40)}${L('M170 720Q540 380 910 720', '#D9E3E5', 8, 'stroke-dasharray="3 16"')}`;
  [['PAGI', 74.2, 190, 690, 'sun'], ['SIANG', 74.9, 540, 545, 'sun'], ['MALAM', 75.7, 890, 690, 'moon']].forEach(([s, tt, x, y, ic]) => {
    if (t > tt) o += `<g transform="translate(${x} ${y}) scale(${popK(t, tt, 0.4).toFixed(3)})">${A.plate(0, 0, 0.62, 'nasi')}${ic === 'sun' ? A.sun(0, -64, 22) : A.moon(0, -64, 24, '#fff')}${T(0, 60, s, COL.forest, 26)}</g>`;
  });
  o += `</g>`;
  const rs = keyed([{ t: 0, d: 0.01, s: rk('lega', 'netral', { yaw: 0.2, mouth: M.smile, sparkle: 0.6 }) }, { t: 76.3, d: 0.5, s: rk('ngantuk', 'netral', { yaw: 0.2, mouth: M.mid, bags: 0.5 }) }], t, rLerp);
  o += RK(rs, 760, 1330, 0.7, { t, uid: 'rkG' });
  if (t < 76.2) o += GR(grelin('kenyang', 'hore'), 300, 1330, 1.0, { t, uid: 'gF' });
  if (t > 76.2) {
    const k = popK(t, 76.2, 0.4);
    o += `<g transform="translate(300 1330) scale(${k.toFixed(3)}) translate(-300 -1330)" opacity="${popA(t, 76.2)}">${JB(jambi('ngantuk', 'berdiri', { jam: 23 }), 300, 1330, 1.15, { t, uid: 'jbB' })}${A.moon(120, 930, 44, '#EFE8D2')}${A.sparkle(190, 880, 0.7, COL.gold)}${A.sparkle(70, 990, 0.5, COL.gold)}</g>`;
  }
  return o;
}

// ================================================================ 12. ASAM LAMBUNG NAIK (77.86 - 84.92)
function refluks(t) {
  let o = A.softBg('#16406A', '#0B2540', 'sb12');
  const perih = t > 82.76;
  const rs = keyed([{ t: 0, d: 0.01, s: rk('netral', 'pegang_perut', { yaw: 0.45, gazeX: 0.5, bags: 0.4, mouth: M.worry }) }, { t: 78.4, d: 0.3, s: rk('khawatir', 'pegang_perut', { yaw: 0.45, gazeX: 0.5, bags: 0.5, mouth: M.worry, sweat: 0.4, ...BR(-6, 12, -6, -12) }) }, { t: 82.8, d: 0.3, s: rk('perih', 'pegang_perut', { yaw: 0.45, gazeX: 0.5, bags: 0.6, sweat: 0.6 }) }], t, rLerp);
  o += RK(rs, 270, 1300, 0.9, { t, uid: 'rkH' });
  const wx = 700, wy = 1030, wr = 250;
  const wk = 0.7 + 0.3 * eob((t - 77.9) / 0.5), wa = clamp((t - 77.9) / 0.2, 0, 1);
  const lvl = pchip([[77.86, 0.15], [79.8, 0.25], [80.5, 0.3], [82.6, 0.45], [83.4, 0.8], [84.6, 1]])(t); // tinggi asam 0..1 (naik di kerongkongan)
  const bubb = (x, y, r, ph) => C(f1(x), f1(y - ((t * 60 + ph) % 140)), r, '#FFD36B', `opacity="${(0.8 * lvl).toFixed(2)}"`);
  o += `<g opacity="${wa}"><line x1="275" y1="1070" x2="${wx - wr + 14}" y2="${wy - 50}" stroke="#fff" stroke-width="5" stroke-dasharray="3 14" stroke-linecap="round"/><line x1="275" y1="1070" x2="${wx - wr + 40}" y2="${wy + 110}" stroke="#fff" stroke-width="5" stroke-dasharray="3 14" stroke-linecap="round"/>`;
  o += `<g transform="translate(${wx} ${wy}) scale(${wk.toFixed(3)}) translate(${-wx} ${-wy})"><defs><clipPath id="wclip2"><circle cx="${wx}" cy="${wy}" r="${wr}"/></clipPath></defs>${C(wx, wy + 10, wr + 14, 'rgba(0,0,0,.25)')}${C(wx, wy, wr + 14, '#fff')}<g clip-path="url(#wclip2)">${R(wx - wr, wy - wr, wr * 2, wr * 2, '#FFEFE4')}`;
  o += `<g transform="translate(${wx} ${wy + 20})">${R(-17, -300, 40, 200, '#F0B6AC', 18)}${A.stomach({ pulse: t, rumble: perih ? 1 : 0.3 })}`;
  // asam: cairan di dasar lambung dan naik di kerongkongan
  o += `<g opacity="${(0.55 + 0.45 * lvl).toFixed(2)}">${P(`M-110 60Q0 ${f1(20 - 30 * lvl)} 110 60Q130 150 20 170Q-110 180 -110 60Z`, '#F8C038', 'opacity=".85"')}</g>`;
  o += `<g clip-path="url(#esc)"><defs><clipPath id="esc"><rect x="-17" y="-300" width="40" height="200" rx="18"/></clipPath></defs>${R(-17, f1(-100 - 200 * lvl), 40, 200 * lvl + 4, '#F8C038', 0, 'opacity=".9"')}</g>`;
  o += `</g>`;
  if (lvl > 0.3) o += `<g transform="translate(${wx} ${wy + 20})">${bubb(2, -110, 6, 0)}${bubb(-4, -110, 5, 60)}${bubb(8, -110, 4, 100)}</g>`;
  o += `</g></g></g>`;
  // panah naik
  if (t > 79.6) o += `<g opacity="${win(t, 79.6, 84.9, 0.3).toFixed(2)}" transform="translate(${wx + 90} ${wy - 40 - Math.sin(t * 6) * 8})">${P('M0 -42L-34 6H-12V50H12V6H34Z', COL.coral)}</g>`;
  // panel kanan atas: makan besar -> tidur
  const pa = clamp((t - 80.44) / 0.4, 0, 1);
  if (pa > 0) o += `<g opacity="${pa}" transform="translate(0 ${f1((1 - eo((t - 80.44) / 0.5)) * 30)})">${card(480, 400, 540, 300, '#fff', 36)}${A.plate(640, 560, 0.8, 'burger')}${T(640, 640, 'MAKAN BESAR', COL.coral, 26)}${L('M730 540H800', COL.coral, 8)}${P('M800 515L840 540L800 565Z', COL.coral)}${A.moon(900, 520, 40, '#fff')}${T(900, 640, 'WAKTU TIDUR', COL.indigo, 24)}</g>`;
  o += topChip(t, 77.95, 80.3, 'ASAM LAMBUNG NAIK', { w: 700, fs: 40, bg: COL.coral });
  o += topChip(t, 80.4, 82.7, 'MAKAN BESAR DEKAT TIDUR', { w: 860, fs: 36, bg: COL.indigo });
  o += topChip(t, 82.8, 84.9, 'KELUHAN BISA MEMBURUK', { w: 820, fs: 36, bg: COL.coral });
  return o;
}

// ================================================================ 13. REKAP (84.92 - 93.24)
function rekap(t) {
  let o = A.creamBg('cb13');
  o += topChip(t, 85.0, 93.2, 'DIPENGARUHI BANYAK HAL', { w: 840, fs: 40, bg: COL.forest });
  const rows = [
    [420, 88.94, 'WAKTU MAKAN', 'ghrelin naik dan turun', COL.coral, (x, y) => GR(grelin('lapar', 'pegang_perut'), x, y, 0.9, { t, uid: 'gE' })],
    [700, 90.56, 'JAM BIOLOGIS', 'irama lapar sepanjang hari', COL.indigo, (x, y) => JB(jambi('semangat', 'sapa', { jam: 20 }), x, y, 0.82, { t, uid: 'jbC' })],
    [980, 91.94, 'POLA TIDUR', 'begadang dan kurang tidur', COL.violet, (x, y) => RK(rk('ngantuk', 'netral', { yaw: 0.2, bags: 0.8, mouth: M.mid }), x, y + 4, 0.3, { t, uid: 'rkI' })],
  ];
  rows.forEach(([y, t0, ttl, sub, col, ch], i) => {
    const h = 250, x = 70, w = 940, tt0 = 85.4 + i * 0.25;
    const ap = clamp((t - tt0) / 0.35, 0, 1);
    o += `<g opacity="${ap}" transform="translate(0 ${f1((1 - eo((t - tt0) / 0.5)) * 30)})">`;
    if (t < t0) {
      o += R(x, y, w, h, 'rgba(255,255,255,.55)', 40, 'stroke="#B7C6CC" stroke-width="5" stroke-dasharray="4 16" stroke-linecap="round"') + T(540, y + 160, '?', '#B7C6CC', 130);
    } else {
      const k = popK(t, t0, 0.45), a = popA(t, t0);
      o += `<g transform="translate(540 ${y + h / 2}) scale(${k.toFixed(3)}) translate(-540 ${-(y + h / 2)})" opacity="${a}">${card(x, y, w, h, '#fff', 40)}${R(x, y, 18, h, col, 9)}<g>${ch(190, y + h - 18)}</g>${T(330, y + 110, ttl, col, 52, '', 'start')}${T(330, y + 168, sub, '#6D7C84', 32, '', 'start')}</g>`;
    }
    o += `</g>`;
  });
  return o;
}

// ================================================================ 14. PENUTUP (93.24 - akhir)
function outro(t) {
  const u = t - 93.2;
  let o = `<defs><linearGradient id="og" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#DDF5EA"/><stop offset="1" stop-color="#F7F2E4"/></linearGradient></defs>${R(-100, -100, 1300, 2200, 'url(#og)')}`;
  for (let i = 0; i < 6; i++) o += `<path d="M540 760L${(-300 + i * 340)} -100L${(-100 + i * 340)} -100Z" fill="#fff" opacity="${(0.28 + 0.1 * Math.sin(t * 0.9 + i)).toFixed(2)}"/>`;
  o += R(-100, 1330, 1300, 700, '#9DE0BD') + R(-100, 1330, 1300, 14, '#7FCBA3');
  const keys = [{ t: 93.2, d: 0.01, s: rk('berpikir', 'berpikir', { yaw: 0.2, mouth: M.mid }) }, { t: 95.5, d: 0.4, s: rk('senang', 'sapa', { yaw: 0.2, happyEyes: 1, mouth: M.smile }) }];
  const s = keyed(keys, t, rLerp); if (t > 95.9) s.armR = { wx: 340 + Math.sin(t * 9) * 14, wy: 318, ex: 350, ey: 404, finger: 0, front: 1 };
  s.sparkle = t > 95.5 ? 0.5 + 0.3 * Math.sin(t * 5) : 0;
  o += RK(s, 300, 1334, 0.76, { t, uid: 'rkJ' });
  const K = getKori();
  if (K) { K.pose(K.r, { t, mood: t > 95.4 ? 'happy' : 'idle', env: 0, wave: t > 95.9 ? 1 : 0, phase: 0.5 }); const ks = lerp(1.2, 1.78, eob((t - 93.6) / 0.5)), ka = clamp((t - 93.4) / 0.2, 0, 1); o += `<g transform="translate(${f1(800 - 160 * ks)} ${f1(1336 - 290 * ks)}) scale(${ks.toFixed(3)})" opacity="${ka}">${K.r.root.outerHTML}</g>`; }
  const E_ = (x) => { x = clamp(x, 0, 1); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
  const pp = (t0) => 0.7 + 0.3 * E_((t - t0) / 0.38), aa = (t0) => clamp((t - t0) / 0.15, 0, 1);
  if (t < 95.45) o += chip(540, 400, 'PENASARAN CARA KERJA TUBUH?', { w: 960, fs: 38, bg: COL.coral, k: 0.85 + 0.15 * E_((t - 93.3) / 0.4), a: clamp((t - 93.3) / 0.2, 0, 1) });
  if (t > 95.5) o += `<g transform="translate(540 360) scale(${pp(95.5).toFixed(3)})" opacity="${aa(95.5)}"><rect x="-290" y="-84" width="580" height="190" rx="54" fill="rgba(10,56,48,.22)" transform="translate(0 8)"/><rect x="-290" y="-84" width="580" height="190" rx="54" fill="#fff"/><image href="${getLogo()}" x="-230" y="-46" width="460" height="92.7"/></g>`;
  if (t > 96.0) o += `<g transform="translate(540 530) scale(${pp(96.0).toFixed(3)})" opacity="${aa(96.0)}"><rect x="-470" y="-62" width="940" height="140" rx="70" fill="rgba(10,56,48,.22)" transform="translate(0 8)"/><rect x="-470" y="-62" width="940" height="140" rx="70" fill="#E8665F"/>${T(0, 14, 'BELAJAR KEDOKTERAN GRATIS', '#fff', 52)}</g>`;
  if (t > 97.3) o += `<g transform="translate(540 663) scale(${pp(97.3).toFixed(3)})" opacity="${aa(97.3)}"><rect x="-300" y="-50" width="600" height="100" rx="50" fill="rgba(10,56,48,.25)" transform="translate(0 8)"/><rect x="-300" y="-50" width="600" height="100" rx="50" fill="#0A3830"/>${T(0, 24, 'medcoel.com', '#F8C038', 72)}</g>`;
  return o;
}

export const SCENES2 = [
  { id: 'studi', t0: 25.2, draw: studi, tr: { type: 'whip', d: 0.35 } },
  { id: 'beda', t0: 35.74, draw: beda, tr: { type: 'whip', d: 0.3 } },
  { id: 'begadang', t0: 39.5, draw: begadang, tr: { type: 'iris', d: 0.5, cx: 540, cy: 1000 } },
  { id: 'nggak', t0: 54.5, draw: nggak, tr: { type: 'whip', d: 0.35 } },
  { id: 'cek', t0: 60.3, draw: cek, tr: { type: 'whip', d: 0.3 } },
  { id: 'camilan', t0: 66.2, draw: camilan, tr: { type: 'whip', d: 0.35 } },
  { id: 'teratur', t0: 73.0, draw: teratur, tr: { type: 'whip', d: 0.35 } },
  { id: 'refluks', t0: 77.8, draw: refluks, tr: { type: 'iris', d: 0.5, cx: 700, cy: 1000 } },
  { id: 'rekap', t0: 84.84, draw: rekap, tr: { type: 'whip', d: 0.35 } },
  { id: 'outro', t0: 93.15, draw: outro, tr: { type: 'iris', d: 0.5, cx: 540, cy: 900 } },
];

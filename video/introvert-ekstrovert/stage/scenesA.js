// Adegan 1-6: hook kampus, ajakan nongkrong, pertanyaan + Kori, spektrum, ekstrovert/introvert, "bukan berarti...".
import { rk, RK, TK, tk, M, BR, keyed, pchip, camFn, CAM, pop, popK, popA, topChip, rLerp, lerpTeman, walkCycle, f1, COL, A, R, C, E, P, L, T, chip, card, getKori } from './core.js';
import { clamp, lerp, sm, eo, eob, win } from './core.js';

const PC = ['#5BD0E6', '#E8665F', '#8E7CE8', '#F8C038', '#3DB46E', '#F28CB0'];
const HC = ['#262A38', '#4B3621', '#7A4D2C', '#3A2A1F'];
const fy0 = 1330;
const STANDL = { on: 1, dir: 1, L: { dx: 0, lift: 0, kx: 0 }, R: { dx: 0, lift: 0, kx: 0 } };
// lompat: j = 0..1
const jump = (j) => ({ bob: -j * 40, legs: { on: 1, dir: 1, L: { dx: -8, lift: j * 40, kx: 0 }, R: { dx: 8, lift: j * 40, kx: 0 } } });

// ================================================================ 1. KAMPUS (0 - 6.0): keramaian lalu sudut tenang
const camK = camFn([[0, 540, 960, 1.0], [2.5, 575, 960, 1.0], [3.5, 1590, 960, 1.0], [6.2, 1620, 960, 1.02]]);
function kampus(t) {
  const c = camK(t);
  let w = A.campusBg(t, 2300);
  // kiri: keramaian
  w += A.bunting(40, 1040, 380, t) + `<g transform="translate(540 505)">${R(-330, -50, 660, 100, 'rgba(0,0,0,.18)', 26, 'transform="translate(0 8)"')}${R(-330, -50, 660, 100, '#E8665F', 26)}${T(0, 18, 'ACARA KAMPUS', '#fff', 56)}</g>`;
  for (let i = 0; i < 11; i++) { const x = 70 + i * 90 + (i % 2) * 14, s = 1.3 + (i % 3) * 0.12, j = Math.abs(Math.sin(t * 5 + i * 1.3)) * (i % 2 ? 34 : 18); w += A.person(x, f1(1160 - j), s, PC[i % 6], HC[i % 4]); }
  const jt = Math.abs(Math.sin(t * 5.2));
  const ts = tk('semangat', 'hore', jump(jt));
  w += TK(ts, 540, fy0, 0.9, { t, uid: 'tkA', noIdle: true }) + A.confetti(t, 40, 1040, 420, 1250, 34, 3);
  // kanan: sudut tenang
  w += `<g transform="translate(1590 1090)">${R(-70, -440, 140, 460, '#9A6B45', 24)}${C(0, -470, 190, '#6FCB8B')}${C(-120, -380, 120, '#58BB78')}${C(120, -390, 130, '#58BB78')}</g>`;
  w += `<g transform="translate(1800 1200)">${R(-150, -60, 300, 22, '#B3744A', 8)}${R(-140, -38, 14, 54, '#8A5A34')}${R(126, -38, 14, 54, '#8A5A34')}${R(-150, -130, 300, 14, '#B3744A', 7)}</g>`;
  const rs = keyed([{ t: 0, d: 0.01, s: rk('senang', 'netral', { yaw: 0.2, mouth: M.smile, happyEyes: 0.25 }) }, { t: 4.3, d: 0.5, s: rk('lega', 'netral', { yaw: 0.2, mouth: M.smile, sparkle: 0.5 }) }], t, rLerp);
  w += RK(rs, 1520, fy0, 0.98, { t, uid: 'rkA' }) + `<g transform="translate(1900 1170)">${A.mug(0, 0, 1.3, 1)}</g>`;
  let ov = '';
  ov += topChip(t, 0.15, 5.95, 'INTROVERT VS EKSTROVERT?', { w: 920, fs: 42, bg: COL.coral });
  return `<g transform="${CAM(c)}">${w}</g>${ov}`;
}

// ================================================================ 2. GERBANG SORE (6.0 - 12.4)
function gerbang(t) {
  const u = clamp((t - 6.0) / 6.4, 0, 1), k = 1 + 0.06 * u;
  let w = A.campusBg(t, 1300) + `<rect x="-200" y="-300" width="1700" height="1700" fill="#FF9A55" opacity=".16"/>`;
  w += R(-200, 1090, 1700, 20, 'rgba(255,255,255,.0)');
  // lampu jalan
  [110, 980].forEach((x, i) => { w += R(x - 7, 700, 14, 520, '#5B6A72', 6) + `<path d="M${x - 40} 700Q${x} 650 ${x + 40} 700Z" fill="#F8C038"/>` + C(x, 706, 12, '#FFF3C4'); });
  const j = Math.abs(Math.sin(t * 4)) * 0.6;
  const ts = tk('semangat', 'ajak', { ...jump(j * 0.5) });
  w += TK(ts, 320, fy0, 0.98, { t, uid: 'tkB', noIdle: true });
  const rs = keyed([{ t: 0, d: 0.01, s: rk('senang', 'netral', { yaw: -0.2, flip: 1, mouth: M.smile, happyEyes: 0.3 }) }, { t: 9.76, d: 0.4, s: rk('lega', 'netral', { yaw: -0.2, flip: 1, mouth: M.smile, happyEyes: 0.7, bags: 0.5 }) }], t, rLerp);
  w += RK(rs, 780, fy0, 0.98, { t, uid: 'rkB' });
  let ov = '';
  // gelembung Tala
  if (t > 6.4) { const k2 = popK(t, 6.4, 0.4), a = popA(t, 6.4); ov += `<g transform="translate(330 560) scale(${k2.toFixed(3)}) translate(-330 -560)" opacity="${a * (t > 9.6 ? clamp((9.9 - t) / 0.3, 0, 1) : 1)}">${A.bubble(100, 430, 470, 150, '#fff', 'bl')}${A.mug(190, 528, 1.2, 1)}${T(425, 525, 'NONGKRONG YUK!', COL.forest, 44)}</g>`; }
  // gelembung pikiran Raka: kasur
  if (t > 9.76) {
    const k2 = popK(t, 9.76, 0.45), a = popA(t, 9.76);
    ov += `<g transform="translate(770 600) scale(${k2.toFixed(3)}) translate(-770 -600)" opacity="${a}">${A.thought(560, 400, 420, 220, '#fff', [780, 690])}<g transform="translate(770 520)">${R(-130, 18, 260, 36, '#8E7CE8', 12)}${R(-130, 54, 18, 40, '#6B5CC8')}${R(112, 54, 18, 40, '#6B5CC8')}${R(-124, -16, 90, 40, '#fff', 18)}${R(-40, -10, 170, 34, '#B9A8FF', 14)}${A.zzz(60, -30, t, 0.9)}</g></g>`;
  }
  ov += topChip(t, 6.1, 9.7, 'SETELAH ACARA SELESAI', { w: 800, fs: 40, bg: COL.indigo });
  ov += topChip(t, 9.8, 12.3, 'RAKA: KASUR…', { w: 560, fs: 42, bg: COL.violet });
  return `<g transform="translate(540 960) scale(${k.toFixed(4)}) translate(-540 -960)">${w}</g>${ov}`;
}

// ================================================================ 3. PERTANYAAN + KORI (12.46 - 19.04)
function tanya(t) {
  let w = A.campusBg(t, 1300) + `<rect x="-200" y="-300" width="1700" height="1700" fill="#FF9A55" opacity=".16"/>`;
  const rs = keyed([{ t: 0, d: 0.01, s: rk('bingung', 'berpikir', { yaw: 0.3, gazeX: 0.5, gazeY: -0.6, mouth: M.mid }) }, { t: 16.3, d: 0.3, s: rk('kaget', 'netral', { yaw: 0.3, wide: 0.8, mouth: M.o }) }], t, rLerp);
  const ts = keyed([{ t: 0, d: 0.01, s: tk('heran', 'berdiri', { yaw: -0.2, gazeX: -0.4, gazeY: -0.5 }) }, { t: 16.3, d: 0.3, s: tk('heran', 'berdiri', { yaw: -0.2, gazeX: 0.4, wide: 0.8 }) }], t, lerpTeman);
  w += TK(ts, 220, fy0, 0.95, { t, uid: 'tkC' }) + RK(rs, 860, fy0, 0.95, { t, uid: 'rkC' });
  let ov = '';
  // satu otak dengan tanda tanya
  const ba = clamp((t - 12.7) / 0.4, 0, 1), grow = t < 17.5 ? 1 : 1 + 2.6 * sm((t - 17.5) / 1.4);
  const bx = 540, by = t < 17.5 ? 700 : lerp(700, 860, sm((t - 17.5) / 1.4));
  ov += `<g opacity="${ba}" transform="translate(${bx} ${by}) scale(${(grow * (0.9 + 0.1 * eob((t - 12.7) / 0.5)) * (1 + 0.03 * Math.sin(t * 5))).toFixed(3)})">${A.C(0, 8, 150, 'rgba(0,0,0,.18)')}${A.C(0, 0, 150, '#fff')}<g transform="scale(.95)">${A.brain({ glow: 0 })}</g></g>`;
  if (t < 17.4) ov += [0, 1, 2].map((i) => A.qmark(380 + i * 160, 520 + Math.sin(t * 5 + i) * 12 - (i % 2) * 40, 1.1, Math.sin(t * 4 + i) * 12)).join('').replace(/<g /, `<g opacity="${ba}" `);
  ov += topChip(t, 12.55, 16.3, 'APA BEDANYA DI OTAK?', { w: 760, fs: 42, bg: COL.coral });
  // Kori mengajak masuk
  const K = getKori();
  if (K && t > 16.44) {
    const jumpIn = sm((t - 17.9) / 0.9), kx = lerp(540, 540, jumpIn), ky = lerp(1330, 820, jumpIn), ks = lerp(1.7, 0.4, jumpIn) * (0.85 + 0.15 * eob((t - 16.44) / 0.5));
    K.pose(K.r, { t, mood: 'happy', env: 0, wave: t < 17.9 ? 1 : 0, phase: 0.5 });
    ov += `<g opacity="${clamp((t - 16.44) / 0.12, 0, 1) * (1 - sm((t - 18.6) / 0.4))}" transform="translate(${f1(kx - 160 * ks)} ${f1(ky - 290 * ks)}) scale(${ks.toFixed(3)})">${K.r.root.outerHTML}</g>`;
    ov += topChip(t, 16.5, 18.9, 'YUK, KITA INTIP!', { w: 640, fs: 46, bg: COL.green, y: 330 });
  }
  return w + ov;
}

// ================================================================ 4. SPEKTRUM (19.0 - 28.5)
const SPEC = [[150, 0.9], [215, 1.15], [275, 1.0], [345, 1.2], [420, 0.95], [480, 1.1], [545, 1.0], [610, 1.2], [670, 0.9], [735, 1.1], [800, 1.0], [865, 1.15], [930, 0.95]];
function spektrum(t) {
  let o = A.neuralBg(t, 'nb4');
  const LY = 1000;
  // garis spektrum (gradien lembut dari biru ke jingga)
  o += `<defs><linearGradient id="spg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5BD0E6"/><stop offset=".5" stop-color="#B9A8FF"/><stop offset="1" stop-color="#F8A04A"/></linearGradient></defs>`;
  const la = clamp((t - 19.2) / 0.5, 0, 1);
  o += `<g opacity="${la}">${R(100, LY, 880, 28, 'url(#spg)', 14)}${R(100, LY, 880, 28, 'none', 14, 'stroke="#fff" stroke-width="4"')}`;
  o += T(110, LY + 90, '← LEBIH INTROVERT', '#BFEFFF', 30, '', 'start') + T(970, LY + 90, 'LEBIH EKSTROVERT →', '#FFD4A0', 30, '', 'end') + `</g>`;
  // orang-orang di sepanjang garis
  SPEC.forEach(([x, s], i) => {
    const t0 = 19.9 + i * 0.22; if (t < t0) return;
    const kk = 0.5 + 0.5 * clamp(eob((t - t0) / 0.4), 0, 1.1), b = Math.sin(t * 3 + i) * 4;
    o += `<g transform="translate(${x} ${LY}) scale(${kk.toFixed(3)}) translate(${-x} ${-LY})" opacity="${clamp((t - t0) / 0.1, 0, 1)}">${A.person(x, f1(LY - 104 * s * 1.25 + b), s * 1.25, PC[i % 6], HC[i % 4])}</g>`;
  });
  // Raka dan Tala di garis
  if (t > 21.8) { const kk = popK(t, 21.8, 0.5); o += `<g transform="translate(330 ${LY}) scale(${kk.toFixed(3)}) translate(-330 ${-LY})" opacity="${popA(t, 21.8)}">${RK(rk('senang', 'netral', { yaw: 0.2, mouth: M.smile }), 330, LY + 4, 0.5, { t, uid: 'rkD', shadow: false })}</g>`; }
  if (t > 22.3) { const kk = popK(t, 22.3, 0.5); o += `<g transform="translate(760 ${LY}) scale(${kk.toFixed(3)}) translate(-760 ${-LY})" opacity="${popA(t, 22.3)}">${TK(tk('semangat', 'berdiri', {}), 760, LY + 4, 0.5, { t, uid: 'tkD', shadow: false })}</g>`; }
  // dua kotak dicoret
  const ba = clamp((t - 24.86) / 0.3, 0, 1), fade = 1 - sm((t - 27.4) / 0.6);
  if (ba > 0 && fade > 0.01) {
    const shake = Math.sin(t * 24) * 3 * clamp((t - 26.1) / 0.3, 0, 1) * clamp((27.2 - t) / 0.3, 0, 1);
    o += `<g opacity="${(ba * fade).toFixed(2)}" transform="translate(${f1(shake)} ${f1((1 - eo((t - 24.86) / 0.4)) * -30)})">${R(90, 440, 400, 170, 'rgba(0,0,0,.2)', 30, 'transform="translate(0 8)"')}${R(90, 440, 400, 170, '#fff', 30)}${T(290, 540, 'INTROVERT', '#3B4A8C', 48)}${R(590, 440, 400, 170, 'rgba(0,0,0,.2)', 30, 'transform="translate(0 8)"')}${R(590, 440, 400, 170, '#fff', 30)}${T(790, 540, 'EKSTROVERT', '#C75B1A', 48)}`;
    if (t > 26.0) { const kx = sm((t - 26.0) / 0.4); o += `<g opacity="${kx}" stroke="${COL.coral}" stroke-width="10" stroke-linecap="round" opacity=".9">${`<path d="M120 460L460 590M460 460L120 590"/><path d="M620 460L960 590M960 460L620 590"/>`}</g>`; }
    o += `</g>`;
  }
  o += topChip(t, 19.6, 24.7, 'SPEKTRUM KEPRIBADIAN', { w: 780, fs: 40, bg: COL.violet });
  o += topChip(t, 24.9, 28.4, 'BUKAN DUA KOTAK', { w: 640, fs: 44, bg: COL.coral });
  return o;
}

// ================================================================ 5a. EKSTROVERT: interaksi ramai (28.5 - 33.36)
function ekstrovert(t) {
  let o = A.cafeBg(t);
  const friends = [[130, 0], [330, 2], [770, 4], [950, 1]];
  friends.forEach(([x, c], i) => { const j = Math.abs(Math.sin(t * 4 + i * 1.7)) * 16; o += A.person(x, f1(1230 - j), 1.15, PC[(c + i) % 6], HC[i % 4]); });
  const j = Math.abs(Math.sin(t * 4.5));
  o += TK(tk('tertawa', 'ajak', jump(j * 0.5)), 540, fy0, 1.0, { t, uid: 'tkE', noIdle: true });
  // ikon obrolan muncul
  [[170, 700, 'chat', 29.2], [350, 620, 'heart', 29.9], [760, 640, 'note', 30.5], [930, 720, 'chat', 31.3], [540, 520, 'star', 32.0]].forEach(([x, y, k, t0]) => {
    if (t < t0) return; const s = popK(t, t0, 0.4) * (1 + 0.06 * Math.sin(t * 5 + x)), a = popA(t, t0);
    const ic = k === 'chat' ? A.chatIcon(0, 0, 1.2, '#5BD0E6') : k === 'heart' ? A.heart(0, 0, 1.4) : k === 'note' ? A.note(0, 0, 1.3) : A.starIcon(0, 0, 0.9);
    o += `<g transform="translate(${x} ${f1(y + Math.sin(t * 3 + x) * 8)}) scale(${s.toFixed(3)})" opacity="${a}">${ic}</g>`;
  });
  o += A.confetti(t, 60, 1020, 380, 1250, 18, 7);
  o += topChip(t, 28.6, 33.3, 'EKSTROVERT: INTERAKSI RAMAI', { w: 900, fs: 38, bg: '#E58A2E' });
  return o;
}

// ================================================================ 5b. INTROVERT: suasana tenang / kelompok kecil (33.36 - 39.86)
function introvert(t) {
  let o = `<defs><linearGradient id="nk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EAF3EC"/><stop offset="1" stop-color="#D5E6D8"/></linearGradient></defs>${R(-100, -100, 1300, 2200, 'url(#nk)')}${R(-100, 1180, 1300, 600, '#C9B79A')}${R(-100, 1174, 1300, 10, '#B09E80')}`;
  // rak buku, tanaman, lampu
  o += `<g transform="translate(180 620)">${R(-140, -200, 280, 380, '#B3744A', 14)}${[-110, 0, 110].map((y) => R(-124, y - 70, 248, 100, '#F2E1C8', 8) + [0, 1, 2, 3, 4].map((i) => R(-112 + i * 46, y - 60, 36, 82, PC[(i + (y > 0 ? 2 : 0)) % 6], 4)).join('')).join('')}</g>`;
  o += `<g transform="translate(900 1180)">${R(-34, -140, 68, 140, '#E8A66B', 14)}${[-1, 0, 1].map((i) => P(`M0 -130Q${i * 70} -260 ${i * 110} -210Q${i * 40} -170 0 -130Z`, '#58BB78')).join('')}</g>`;
  o += `<g transform="translate(760 1180)">${R(-8, -380, 16, 380, '#8A6A4A', 6)}${P('M-70 -380Q0 -460 70 -380Z', '#F8C038')}<path d="M-50 -372L-130 -100H130L50 -372Z" fill="#FFE9A8" opacity=".16"/></g>`;
  // meja kecil
  o += `<g transform="translate(300 1180)">${R(-120, -150, 240, 16, '#B3744A', 7)}${R(-8, -134, 16, 134, '#8A5A34')}${A.mug(-50, -150, 1.2, 1)}${A.book(40, -152, 1.2, '#5BD0E6')}</g>`;
  o += RK(keyed([{ t: 0, d: 0.01, s: rk('lega', 'netral', { yaw: 0.2, mouth: M.smile, happyEyes: 0.6 }) }], t, rLerp), 600, fy0, 0.98, { t, uid: 'rkE' });
  // satu teman duduk membaca (ikon)
  o += `<g transform="translate(880 ${f1(1180 - 104 * 1.1 + 0)})">${A.person(0, 0, 1.1, '#F28CB0', '#262A38')}</g>`;
  o += `<g opacity="${0.9 + 0.1 * Math.sin(t * 2)}">${A.sparkle(740, 640, 0.8, COL.gold)}</g>`;
  o += topChip(t, 33.45, 39.7, 'INTROVERT: TENANG / KELOMPOK KECIL', { w: 940, fs: 34, bg: COL.green });
  return o;
}

// ================================================================ 6. BUKAN BERARTI... (39.86 - 45.78)
function bukan(t) {
  let o = A.creamBg('cb6');
  const c1 = clamp((t - 41.0) / 0.4, 0, 1), c2 = clamp((t - 43.4) / 0.4, 0, 1);
  const ph = (y, a) => `<g opacity="${a}">${R(70, y, 940, 450, 'rgba(255,255,255,.55)', 40, 'stroke="#B7C6CC" stroke-width="5" stroke-dasharray="4 16" stroke-linecap="round"')}${T(540, y + 290, '?', '#B7C6CC', 150)}</g>`;
  if (c1 < 1) o += ph(400, 1 - c1); if (c2 < 1) o += ph(880, 1 - c2);
  if (c1 > 0) {
    const k = popK(t, 41.0, 0.45);
    o += `<g opacity="${c1}" transform="translate(540 625) scale(${k.toFixed(3)}) translate(-540 -625)">${card(70, 400, 940, 450, '#fff', 40)}`;
    o += RK(rk('senang', 'netral', { yaw: 0.35, mouth: M.grin, happyEyes: 0.8 }), 300, 830, 0.42, { t, uid: 'rkF', shadow: false });
    o += TK(tk('tertawa', 'berdiri', { yaw: -0.35, flip: 1 }), 720, 830, 0.42, { t, uid: 'tkF', shadow: false });
    o += A.heart(520, 560, 1 + 0.1 * Math.sin(t * 6)) + A.chatIcon(520, 660, 0.9) + `${T(540, 450, 'INTROVERT: TETAP BISA MENIKMATI INTERAKSI', COL.forest, 30)}</g>`;
  }
  if (c2 > 0) {
    const k = popK(t, 43.4, 0.45);
    o += `<g opacity="${c2}" transform="translate(540 1105) scale(${k.toFixed(3)}) translate(-540 -1105)">${card(70, 880, 940, 450, '#fff', 40)}`;
    o += TK(tk('senang', 'berdiri', { yaw: 0.3 }), 330, 1310, 0.42, { t, uid: 'tkG', shadow: false });
    o += `<g transform="translate(700 1290)">${R(-130, -110, 260, 14, '#B3744A', 6)}${R(-8, -96, 16, 96, '#8A5A34')}${A.mug(-60, -110, 1.3, 1)}${A.book(50, -112, 1.3, '#E8665F')}</g>`;
    o += `${T(540, 930, 'EKSTROVERT: TETAP BUTUH WAKTU SENDIRI', COL.forest, 30)}</g>`;
  }
  o += topChip(t, 39.95, 45.7, 'TAPI, TUNGGU DULU', { w: 700, fs: 42, bg: COL.coral });
  return o;
}

export const SCENES_A = [
  { id: 'kampus', t0: 0, draw: kampus },
  { id: 'gerbang', t0: 6.0, draw: gerbang, tr: { type: 'whip', d: 0.35 } },
  { id: 'tanya', t0: 12.4, draw: tanya, tr: { type: 'whip', d: 0.3 } },
  { id: 'spektrum', t0: 19.0, draw: spektrum, tr: { type: 'iris', d: 0.6, cx: 540, cy: 860 } },
  { id: 'ekstrovert', t0: 28.5, draw: ekstrovert, tr: { type: 'whip', d: 0.35 } },
  { id: 'introvert', t0: 33.3, draw: introvert, tr: { type: 'whip', d: 0.35 } },
  { id: 'bukan', t0: 39.8, draw: bukan, tr: { type: 'whip', d: 0.35 } },
];

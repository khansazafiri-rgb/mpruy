// Adegan 7-13: lab peneliti (sistem pemrosesan imbalan, dopamin), hubungan (ilustrasi), klaim keliru, faktor kepribadian, istirahat, kafe malam, penutup.
import { rk, RK, TK, tk, M, BR, keyed, pchip, pop, popK, popA, topChip, rLerp, lerpTeman, f1, COL, A, R, C, E, P, L, T, chip, card, getKori, getLogo } from './core.js';
import { clamp, lerp, sm, eo, eob, win } from './core.js';
import { rakaSvg, raka } from '../../../brand/characters/raka/raka.js';

const PC = ['#5BD0E6', '#E8665F', '#8E7CE8', '#F8C038', '#3DB46E', '#F28CB0'];
const HC = ['#262A38', '#4B3621', '#7A4D2C', '#3A2A1F'];
const fy0 = 1330;
const rnd = (i, k = 1) => Math.abs(Math.sin(i * 12.9898 + k * 78.233));

// otak di layar: bentuk otak + area "sistem pemrosesan imbalan" (ilustrasi sederhana, bukan peta anatomi)
const REGION = { x: 18, y: 28, rx: 52, ry: 36 };
function brainScreen(t, glow, o = {}) {
  const sw = ((t * 0.5) % 1);
  return `<g transform="translate(250 230) scale(${o.s ?? 1.5})">${A.brain({ glow: 0 })}<ellipse cx="${REGION.x}" cy="${REGION.y}" rx="${REGION.rx}" ry="${REGION.ry}" fill="#F8C038" opacity="${(0.12 + 0.6 * glow).toFixed(2)}"/><ellipse cx="${REGION.x}" cy="${REGION.y}" rx="${REGION.rx}" ry="${REGION.ry}" fill="none" stroke="#FFF3C4" stroke-width="${(2 + 4 * glow).toFixed(1)}" stroke-dasharray="${glow > 0.2 ? '0' : '6 8'}" opacity="${(0.5 + 0.5 * glow).toFixed(2)}"/></g>`;
}

// ================================================================ 7. LAB (45.78 - 64.3)
function lab(t) {
  let o = A.labBg();
  // layar monitor 520 wide, 440 tall
  const g = clamp((t - 53.38) / 0.6, 0, 1) * (t < 64.3 ? 1 : 0), pulse = 0.6 + 0.4 * Math.sin(t * 5);
  const glow = g * (t > 56.6 ? 1 : pulse);
  let scr = `<rect x="0" y="0" width="520" height="440" fill="#13293D" rx="12"/>`;
  if (t < 53.38) scr += `<line x1="0" y1="${f1(60 + ((t * 120) % 340))}" x2="520" y2="${f1(60 + ((t * 120) % 340))}" stroke="#7FE0C8" stroke-width="3" opacity=".5"/>`;
  scr += `<g transform="translate(260 205) scale(1.15)">${A.brain({})}<ellipse cx="${REGION.x}" cy="${REGION.y}" rx="${REGION.rx}" ry="${REGION.ry}" fill="#F8C038" opacity="${(0.0 + 0.7 * glow).toFixed(2)}"/><ellipse cx="${REGION.x}" cy="${REGION.y}" rx="${REGION.rx}" ry="${REGION.ry}" fill="none" stroke="#FFF3C4" stroke-width="${(1.5 + 4 * glow).toFixed(1)}" opacity="${(0.0 + g).toFixed(2)}"/></g>`;
  // titik dopamin mengalir ke area
  if (t > 59.6 && t < 64.3) for (let i = 0; i < 14; i++) { const u = ((t * 0.55 + i / 14) % 1), x = lerp(40, 280, u), y = lerp(80 + rnd(i) * 280, 160, sm(u)); scr += C(f1(x), f1(y), 7, '#F8C038', `opacity="${(Math.sin(u * Math.PI)).toFixed(2)}"`); }
  o += A.monitor(500, 430, 520, 440, scr);
  // label "Sistem pemrosesan imbalan"
  const la = clamp((t - 56.6) / 0.4, 0, 1);
  if (la > 0 && t < 64.3) o += `<g opacity="${la}"><path d="M760 700L840 560" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-dasharray="2 12"/><g transform="translate(790 970) scale(${(0.8 + 0.2 * eob((t - 56.6) / 0.4)).toFixed(3)})">${R(-285, -40, 570, 80, COL.gold, 40)}${T(0, 13, 'Sistem pemrosesan imbalan', COL.forest, 36)}</g></g>`;
  // ikon imbalan terbang ke layar
  [[cookie_, 53.4, 140], [chat_, 54.9, 90], [note_, 56.1, 190]].forEach(([fn, t0, y0], i) => { const u = clamp((t - t0) / 1.2, 0, 1); if (t < t0 || u >= 1) return; const x = lerp(250, 760, sm(u)), y = lerp(1060 - y0, 640, sm(u)) - Math.sin(u * Math.PI) * 120; o += `<g opacity="${(1 - sm((u - 0.8) / 0.2)).toFixed(2)}">${fn(f1(x), f1(y), 1.0 - 0.3 * u)}</g>`; });
  // meja dan peneliti
  const rs = keyed([{ t: 0, d: 0.01, s: tk('fokus', 'catat', { yaw: -0.1 }) }, { t: 53.38, d: 0.4, s: tk('senang', 'tunjuk', { yaw: -0.2, flip: 0 }) }, { t: 60.4, d: 0.4, s: tk('fokus', 'catat', { yaw: -0.2 }) }], t, lerpTeman);
  o += TK(rs, 240, fy0, 1.0, { t, uid: 'tkH', peneliti: true }) + A.labBench();
  // meja: tablet/catatan kecil
  o += `<g transform="translate(560 1150)">${R(-60, -34, 120, 34, '#fff', 8)}${L('M-40 -22H30M-40 -12H10', '#9AA9AF', 5)}</g>`;
  // chip
  o += topChip(t, 45.85, 48.0, 'LALU, BAGAIMANA OTAKNYA?', { w: 900, fs: 40, bg: COL.violet });
  o += topChip(t, 48.1, 53.3, 'PENELITI MEMPELAJARI…', { w: 800, fs: 40, bg: COL.green });
  o += topChip(t, 53.4, 57.0, 'RESPONS TERHADAP IMBALAN', { w: 880, fs: 38, bg: COL.coral });
  // dopamin: satu label bergantian di bawah "Sistem pemrosesan imbalan"
  const slot = [[59.0, 60.45, 'DOPAMIN', '#fff', COL.forest, true], [60.5, 61.85, 'IKUT BERPERAN', COL.indigo, '#fff'], [61.9, 62.85, 'MOTIVASI', COL.coral, '#fff'], [62.9, 64.3, 'PEMROSESAN IMBALAN', COL.green, '#fff']];
  for (const [a0, b0, txt, bg, fg, dot] of slot) { const al = win(t, a0, b0, 0.18); if (al < 0.01) continue; const w = txt.length * 24 + 90; o += `<g opacity="${al.toFixed(2)}" transform="translate(790 1060) scale(${(0.85 + 0.15 * eob((t - a0) / 0.35)).toFixed(3)})">${R(-w / 2, -34, w, 68, bg, 34)}${dot ? C(-w / 2 + 38, 0, 15, '#F8C038') : ''}${T(dot ? 20 : 0, 13, txt, fg, 34)}</g>`; }
  if (t < 64.3 && t > 53.4) o += '';
  return o;
}
const cookie_ = (x, y, s) => A.cookie(x, y, s * 1.2), chat_ = (x, y, s) => A.chatIcon(x, y, s * 1.2), note_ = (x, y, s) => A.note(x, y, s * 1.4);

// ================================================================ 8. HUBUNGAN (64.4 - 71.26)
const SC = { x0: 150, x1: 690, y0: 1250, y1: 620 };
function hubungan(t) {
  let o = A.creamBg('cb8');
  const a = clamp((t - 64.5) / 0.4, 0, 1);
  o += `<g opacity="${a}" transform="translate(0 ${f1((1 - eo((t - 64.5) / 0.5)) * 40)})">${card(70, 440, 700, 860, '#fff', 40)}`;
  o += L(`M${SC.x0 - 20} 540V${SC.y0}H${SC.x1 + 20}`, '#B7C6CC', 6);
  o += T(SC.x0 - 10, 520, 'RESPONS OTAK TERHADAP IMBALAN', COL.forest, 22, '', 'start');
  o += T(SC.x1 + 20, SC.y0 + 56, 'TINGKAT EKSTROVERSI →', COL.forest, 24, '', 'end');
  // titik data (ilustrasi): tren naik, tetapi tersebar
  const n = 26;
  for (let i = 0; i < n; i++) {
    const t0 = 65.0 + i * 0.1, u = (i + 0.5) / n, x = lerp(SC.x0 + 30, SC.x1 - 30, rnd(i, 2) * 0.9 + 0.05), tr = (x - SC.x0) / (SC.x1 - SC.x0);
    const y = lerp(SC.y0 - 70, SC.y1 + 70, clamp(tr * 0.7 + 0.15 + (rnd(i, 5) - 0.5) * 0.55, 0, 1));
    if (t < t0) continue; const k = clamp(eob((t - t0) / 0.3), 0, 1.15);
    o += C(f1(x), f1(y), 13 * k, PC[i % 6], 'opacity=".9"');
  }
  const la = clamp((t - 68.6) / 1.2, 0, 1);
  if (la > 0) o += L(`M${SC.x0 + 40} ${SC.y0 - 150}L${f1(SC.x0 + 40 + 480 * la)} ${f1(SC.y0 - 150 - 330 * la)}`, COL.coral, 8, 'stroke-dasharray="3 16"');
  o += T(420, 1350, 'ILUSTRASI HUBUNGAN, BUKAN DATA ASLI', '#9AA9AF', 22);
  o += `</g>`;
  o += TK(tk('fokus', 'tunjuk', { yaw: 0.1, flip: 1 }), 900, fy0, 0.62, { t, uid: 'tkI', peneliti: true });
  o += topChip(t, 64.5, 67.2, 'BEBERAPA PENELITIAN', { w: 700, fs: 42, bg: COL.violet });
  o += topChip(t, 67.3, 71.2, 'ADA HUBUNGAN, BUKAN SEBAB-AKIBAT', { w: 940, fs: 34, bg: COL.coral });
  return o;
}

// ================================================================ 9. SERING DISALAHPAHAMI (71.26 - 81.34)
function klaim(t) {
  let o = A.neuralBg(t, 'nb9');
  const rowY = [450, 740];
  const claims = [[74.5, 75.9, ['“Ekstrovert pasti', 'lebih banyak dopamin”']], [78.48, 79.8, ['“Introvert', 'kekurangan dopamin”']]];
  claims.forEach(([t0, tx, lines], i) => {
    const y = rowY[i];
    if (t < t0) { o += `<g opacity="${clamp((t - 72.0) / 0.4, 0, 1)}">${R(70, y, 940, 250, 'rgba(255,255,255,.12)', 40, 'stroke="#CFC2FF" stroke-width="5" stroke-dasharray="4 16" stroke-linecap="round"')}${T(540, y + 180, '?', '#CFC2FF', 130)}</g>`; return; }
    const k = popK(t, t0, 0.45), a = popA(t, t0);
    o += `<g opacity="${a}" transform="translate(540 ${y + 135}) scale(${k.toFixed(3)}) translate(-540 ${-(y + 135)})">${card(70, y, 940, 250, '#fff', 40)}${T(540, y + 110, lines[0], COL.forest, 54)}${T(540, y + 184, lines[1], COL.forest, 54)}</g>`;
    if (t > tx) { const kk = clamp(eob((t - tx) / 0.35), 0, 1.15); o += `<g transform="translate(900 ${y + 20}) scale(${kk.toFixed(3)}) rotate(-8)">${A.xmark(0, 0, 1.0)}</g>`; }
  });
  const K = getKori();
  if (K) { const mood = t > 74.4 ? 'think' : 'normal'; K.pose(K.r, { t, mood, env: 0, wave: 0, phase: 0.5, tilt: Math.sin(t * 6) * (t > 79.5 ? 6 : 0) }); const ks = 1.1, ka = clamp((t - 71.4) / 0.2, 0, 1); o += `<g opacity="${ka}" transform="translate(${f1(540 - 160 * ks)} ${f1(1330 - 290 * ks)}) scale(${ks})">${K.r.root.outerHTML}</g>`; }
  o += topChip(t, 71.3, 74.4, 'SERING DISALAHPAHAMI', { w: 800, fs: 42, bg: COL.coral });
  o += topChip(t, 74.5, 81.3, 'BUKAN BEGITU', { w: 520, fs: 44, bg: COL.indigo });
  return o;
}

// ================================================================ 10. FAKTOR (81.34 - 88.26)
function faktor(t) {
  let o = A.creamBg('cb10');
  const cx = 540, cy = 830;
  const tiles = [[84.44, 'BIOLOGIS', 290, 560, '#E8665F', (x, y) => A.dnaIcon(x, y, 1.0)], [85.1, 'PENGALAMAN', 790, 560, '#F8C038', (x, y) => A.starIcon(x, y, 0.85)], [86.36, 'LINGKUNGAN', 290, 1100, '#3DB46E', (x, y) => A.houseIcon(x, y, 1.0)], [87.28, 'SITUASI', 790, 1100, '#5B7CE8', (x, y) => A.pinClock(x, y, 1.1)]];
  // garis penghubung
  tiles.forEach(([t0, , x, y]) => { if (t > t0) { const u = sm((t - t0) / 0.4); o += L(`M${cx} ${cy}L${f1(lerp(cx, x, u))} ${f1(lerp(cy, y, u))}`, '#B7C6CC', 8, 'stroke-dasharray="3 14"'); } });
  const ca = clamp((t - 81.5) / 0.4, 0, 1), pulse = 1 + 0.03 * Math.sin(t * 4);
  o += `<g opacity="${ca}" transform="translate(${cx} ${cy}) scale(${(pulse * (0.8 + 0.2 * eob((t - 81.5) / 0.5))).toFixed(3)})">${C(0, 10, 112, 'rgba(0,0,0,.18)')}${C(0, 0, 112, COL.forest)}${C(0, 0, 102, 'none', 'stroke="#9DE0BD" stroke-width="5" stroke-dasharray="2 14" stroke-linecap="round"')}${T(0, -6, 'KEPRI-', '#fff', 34)}${T(0, 32, 'BADIAN', '#F8C038', 36)}</g>`;
  tiles.forEach(([t0, label, x, y, col, ic]) => {
    if (t < t0) return; const k = popK(t, t0, 0.45), a = popA(t, t0);
    o += `<g opacity="${a}" transform="translate(${x} ${y}) scale(${k.toFixed(3)})">${R(-170, -112 + 10, 340, 224, 'rgba(0,0,0,.18)', 36)}${R(-170, -112, 340, 224, '#fff', 36)}${R(-170, -112, 340, 18, col, 9)}<g transform="translate(0 -26)">${ic(0, 0)}</g>${T(0, 76, label, COL.forest, 38)}</g>`;
  });
  o += topChip(t, 81.4, 88.2, 'KEPRIBADIAN: BANYAK UNSUR', { w: 900, fs: 40, bg: COL.green });
  return o;
}

// ================================================================ 11. RAKA ISTIRAHAT (88.26 - 95.78)
function istirahat(t) {
  let o = A.nightBg(t, { noWindow: true, noPoster: true });
  o += `<g transform="translate(830 560)">${R(-140, -200, 280, 380, '#0F2036', 16)}${A.moon(40, -90, 36, '#0F2036')}${[[-70, -120], [-30, -50], [-85, 10]].map(([x, y], i) => C(x, y, 3.5, '#fff', `opacity="${(0.5 + 0.3 * Math.sin(t * 2 + i)).toFixed(2)}"`)).join('')}${R(-140, -200, 280, 380, 'none', 16, 'stroke="#B3C2D6" stroke-width="12"')}</g>`;
  // lampu tidur menyala hangat di atas meja kecil, dengan cangkir
  o += `<defs><radialGradient id="lg" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#FFE9A8" stop-opacity=".45"/><stop offset="1" stop-color="#FFE9A8" stop-opacity="0"/></radialGradient></defs>${E(210, 960, 380, 360, 'url(#lg)')}`;
  o += `<g transform="translate(170 1130)">${R(-80, 0, 160, 18, '#9A6B45', 8)}${R(-60, 18, 14, 150, '#7A4D2C')}${R(46, 18, 14, 150, '#7A4D2C')}${R(-40, -10, 80, 12, '#3A4A58', 6)}${L('M0 -6V-130', '#5B6A72', 10)}${P('M-46 -130Q0 -220 46 -130Z', COL.gold)}${C(0, -136, 12, '#FFF3C4')}${A.mug(-58, -8, 0.8, 1)}</g>`;
  // kasur, bantal, Raka berbaring (rebah, kepala SEJAJAR badan: rebahTilt -90), lalu selimut menutup tubuh bagian bawah
  o += R(300, 1130, 760, 70, '#6B5CC8', 22) + R(290, 1190, 20, 110, '#4B3FA0') + R(1040, 1190, 20, 110, '#4B3FA0');
  o += `<ellipse cx="420" cy="1136" rx="165" ry="50" fill="#fff"/>`;
  const rs = keyed([{ t: 0, d: 0.01, s: raka('lega', 'berbaring', { happyEyes: 0.6 }) }, { t: 92.9, d: 0.5, s: raka('lega', 'berbaring', { happyEyes: 0.95, mouth: { w: 20, up: 10, lo: 10 } }) }], t, rLerp);
  o += `<g transform="translate(260 804) scale(0.82)">${rakaSvg(rs, { bare: true, rebah: true, rebahTilt: -90, shadow: false, uid: 'rkI' })}</g>`;
  o += `<path d="M640 1136C700 940 860 924 1030 936C1046 940 1050 1000 1046 1196L640 1196Z" fill="#9DE0BD"/><path d="M646 1100C700 944 860 926 1030 938" fill="none" stroke="#7FCBA3" stroke-width="8" stroke-linecap="round"/><path d="M700 1000C712 1040 712 1090 714 1190M860 944C872 1040 872 1100 872 1190" stroke="#7FCBA3" stroke-width="8" fill="none" stroke-linecap="round"/>`;
  o += A.sparkle(560, 830, 0.8, COL.gold) + A.sparkle(980, 1010, 0.6, COL.gold) + A.zzz(900, 900, t, 0.9);
  o += topChip(t, 88.3, 92.9, 'PULANG & ISTIRAHAT', { w: 760, fs: 40, bg: COL.indigo });
  o += topChip(t, 93.0, 95.7, 'BUKAN ANTISOSIAL', { w: 700, fs: 42, bg: COL.green });
  return o;
}

// ================================================================ 12. KAFE MALAM (95.78 - 102.34)
function kafe(t) {
  let o = A.cafeBg(t);
  const hour = lerp(23.7, 24.5, clamp((t - 95.8) / 6.5, 0, 1));
  o += A.wallClock(190, 540, 70, hour % 24, '');
  [[130, 0], [330, 2], [790, 4], [950, 1]].forEach(([x, c], i) => { const j = Math.abs(Math.sin(t * 3 + i * 1.7)) * (t < 99.3 ? 14 : 5); o += A.person(x, f1(1230 - j), 1.15, PC[(c + i) % 6], HC[i % 4]); });
  const ts = keyed([{ t: 0, d: 0.01, s: tk('tertawa', 'ajak', {}) }, { t: 99.3, d: 0.6, s: tk('senang', 'berdiri', { lid: 0.2 }) }, { t: 100.9, d: 0.6, s: tk('senang', 'berdiri', { lid: 0.3, blush: 1.3 }) }], t, lerpTeman);
  o += TK(ts, 540, fy0, 1.0, { t, uid: 'tkJ' });
  // baterai sosial
  const ba = clamp((t - 99.0) / 0.4, 0, 1), level = lerp(0.9, 0.55, clamp((t - 99.3) / 2.5, 0, 1));
  if (ba > 0) { const k = 0.8 + 0.2 * eob((t - 99.0) / 0.4); o += `<g opacity="${ba}" transform="translate(540 490) scale(${k.toFixed(3)})">${T(0, -56, 'BATERAI SOSIAL', '#fff', 34)}${A.battery(0, 18, level, t, 1.7)}</g>`; }
  if (t > 101.0) o += `<g opacity="${popA(t, 101.0)}" transform="translate(830 500) scale(${popK(t, 101.0, 0.4).toFixed(3)})">${R(-150, -42, 300, 84, '#fff', 42)}${T(0, 14, '∞ ?', COL.coral, 48)}</g>`;
  o += topChip(t, 95.9, 99.2, 'TEMAN MASIH NONGKRONG', { w: 840, fs: 38, bg: '#E58A2E' });
  o += topChip(t, 99.3, 102.3, 'BATERAI SOSIAL ADA BATASNYA', { w: 940, fs: 34, bg: COL.indigo });
  return o;
}

// ================================================================ 13. PENUTUP (102.34 - akhir)
function penutup(t) {
  let o = `<defs><linearGradient id="og" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#DDF5EA"/><stop offset="1" stop-color="#F7F2E4"/></linearGradient></defs>${R(-100, -100, 1300, 2200, 'url(#og)')}`;
  for (let i = 0; i < 6; i++) o += `<path d="M540 760L${(-300 + i * 340)} -100L${(-100 + i * 340)} -100Z" fill="#fff" opacity="${(0.28 + 0.1 * Math.sin(t * 0.9 + i)).toFixed(2)}"/>`;
  o += R(-100, 1330, 1300, 700, '#9DE0BD') + R(-100, 1330, 1300, 14, '#7FCBA3');
  const rs = keyed([{ t: 102.3, d: 0.01, s: rk('berpikir', 'berpikir', { yaw: 0.3, mouth: M.mid }) }, { t: 104.7, d: 0.4, s: rk('senang', 'sapa', { yaw: 0.2, happyEyes: 1, mouth: M.smile }) }], t, rLerp);
  if (t > 105.1) rs.armR = { wx: 340 + Math.sin(t * 9) * 14, wy: 318, ex: 350, ey: 404, finger: 0, front: 1 };
  rs.sparkle = t > 104.7 ? 0.5 + 0.3 * Math.sin(t * 5) : 0;
  o += RK(rs, 130, 1334, 0.72, { t, uid: 'rkJ' });
  const ts = keyed([{ t: 102.3, d: 0.01, s: tk('heran', 'berdiri', { yaw: -0.2 }) }, { t: 104.7, d: 0.4, s: tk('semangat', 'ajak', {}) }], t, lerpTeman);
  o += TK(ts, 410, 1334, 0.72, { t, uid: 'tkK' });
  const K = getKori();
  if (K) { K.pose(K.r, { t, mood: t > 104.6 ? 'happy' : 'normal', env: 0, wave: t > 105.1 ? 1 : 0, phase: 0.5 }); const ks = lerp(1.0, 1.55, eob((t - 102.6) / 0.5)), ka = clamp((t - 102.4) / 0.2, 0, 1); o += `<g transform="translate(${f1(800 - 160 * ks)} ${f1(1336 - 290 * ks)}) scale(${ks.toFixed(3)})" opacity="${ka}">${K.r.root.outerHTML}</g>`; }
  const E_ = (x) => { x = clamp(x, 0, 1); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
  const pp = (t0) => 0.7 + 0.3 * E_((t - t0) / 0.38), aa = (t0) => clamp((t - t0) / 0.15, 0, 1);
  if (t < 104.7) o += chip(540, 400, 'PENASARAN CARA KERJA OTAK & TUBUH?', { w: 1000, fs: 34, bg: COL.coral, k: 0.85 + 0.15 * E_((t - 102.4) / 0.4), a: clamp((t - 102.4) / 0.2, 0, 1) });
  if (t > 104.74) o += `<g transform="translate(540 360) scale(${pp(104.74).toFixed(3)})" opacity="${aa(104.74)}"><rect x="-290" y="-84" width="580" height="190" rx="54" fill="rgba(10,56,48,.22)" transform="translate(0 8)"/><rect x="-290" y="-84" width="580" height="190" rx="54" fill="#fff"/><image href="${getLogo()}" x="-230" y="-46" width="460" height="92.7"/></g>`;
  if (t > 105.6) o += `<g transform="translate(540 530) scale(${pp(105.6).toFixed(3)})" opacity="${aa(105.6)}"><rect x="-470" y="-62" width="940" height="140" rx="70" fill="rgba(10,56,48,.22)" transform="translate(0 8)"/><rect x="-470" y="-62" width="940" height="140" rx="70" fill="#E8665F"/>${T(0, 14, 'BELAJAR KEDOKTERAN GRATIS', '#fff', 52)}</g>`;
  if (t > 107.2) o += `<g transform="translate(540 663) scale(${pp(107.2).toFixed(3)})" opacity="${aa(107.2)}"><rect x="-300" y="-50" width="600" height="100" rx="50" fill="rgba(10,56,48,.25)" transform="translate(0 8)"/><rect x="-300" y="-50" width="600" height="100" rx="50" fill="#0A3830"/>${T(0, 24, 'medcoel.com', '#F8C038', 72)}</g>`;
  return o;
}

export const SCENES_B = [
  { id: 'lab', t0: 45.7, draw: lab, tr: { type: 'iris', d: 0.5, cx: 760, cy: 650 } },
  { id: 'hubungan', t0: 64.3, draw: hubungan, tr: { type: 'whip', d: 0.35 } },
  { id: 'klaim', t0: 71.2, draw: klaim, tr: { type: 'whip', d: 0.35 } },
  { id: 'faktor', t0: 81.3, draw: faktor, tr: { type: 'whip', d: 0.35 } },
  { id: 'istirahat', t0: 88.2, draw: istirahat, tr: { type: 'iris', d: 0.5, cx: 540, cy: 1000 } },
  { id: 'kafe', t0: 95.7, draw: kafe, tr: { type: 'whip', d: 0.35 } },
  { id: 'penutup', t0: 102.3, draw: penutup, tr: { type: 'iris', d: 0.5, cx: 540, cy: 900 } },
];

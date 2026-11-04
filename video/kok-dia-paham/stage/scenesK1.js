// Adegan 1-7: kelas FK (hook), baca tiga kali, "upgrade" (lelucon), kepingan konsep (bekal, menghubungkan, menyusun satu per satu), sama-sama lanjut.
import { rk, RK, TK, tk, M, BR, pop, popK, popA, topChip, rLerp, f1, COL, A, R, C, E, P, L, T, chip, getKori } from './core.js';
import { clamp, lerp, sm, eo, eob, win } from './core.js';
import * as K from './artK.js';
import { poseMascot } from './mascot.js';

export const koriSvg = (x, y, ks, t, o = {}) => {
  const Kx = getKori(); if (!Kx) return '';
  poseMascot(Kx.r, { t, mood: o.mood ?? 'happy', env: 0, wave: o.wave ?? 0, phase: 0.5, tilt: o.tilt ?? 0 });
  return `<g transform="translate(${f1(x - 160 * ks)} ${f1(y - 290 * ks)}) scale(${ks.toFixed(3)})" opacity="${(o.a ?? 1).toFixed(3)}">${Kx.r.root.outerHTML}</g>`;
};
import { PALETTE_DOSEN as DOSEN } from '../../../brand/characters/raka/raka.js';
const outline = (txt, x, y, size, fill = '#fff', stroke = '#172B38', sw = 14, e = '') => T(x, y, txt, fill, size, `stroke="${stroke}" stroke-width="${sw}" paint-order="stroke" stroke-linejoin="round" ${e}`);
const DESK_ARMS = { armL: { wx: 150, wy: 540, ex: 92, ey: 500, finger: 0, front: 1 }, armR: { wx: 250, wy: 540, ex: 308, ey: 500, finger: 0, front: 1 } };
const TDESK = { armL: { wx: 150, wy: 540, ex: 92, ey: 500, finger: 0, front: 1 }, armR: { wx: 262, wy: 540, ex: 316, ey: 504, finger: 0, front: 1 } };
const banner = (lines, y, a, k, bg = '#3B4A8C') => `<g transform="translate(540 ${y}) scale(${k.toFixed(3)})" opacity="${a.toFixed(3)}">${R(-470, -150, 940, 330, 'rgba(0,0,0,.28)', 60, 'transform="translate(0 12)"')}${R(-470, -150, 940, 330, bg, 60)}${R(-446, -126, 892, 282, 'none', 44, 'stroke="#fff" stroke-width="5" opacity=".6"')}${lines.map((l, i) => T(0, -50 + i * 100, l[0], l[1] ?? '#fff', l[2] ?? 90)).join('')}</g>`;

// ================================================================ 1. HOOK + KELAS (0 - 5.34)
function kelas(t) {
  const k = 0.82, FY = 1445, RX = 780, TX = 300, DY = 1272;
  let w = K.classBg(t) + K.board(80, 330, 920, 440, t);
  // dosen menunjuk papan tulis (rig Raka dengan palet dosen)
  const ds = rk('netral', 'menunjuk', { yaw: 0.4, gazeX: 0.6, mouth: M.mid, armR: { wx: 330, wy: 330, ex: 340, ey: 400, finger: 1, fa: -60, front: 1 } });
  w += RK(ds, 120, 1010, 0.58, { t, uid: 'ds', palette: DOSEN, noIdle: false });
  w += L('M236 690L450 520', '#8A5A34', 7);
  // Tala (paham) dan Raka (bingung) di meja
  const ps = t < 0.9 ? tk('fokus', 'catat', { ...TDESK, lid: 0.15 }) : tk('semangat', 'catat', { ...TDESK, mouth: { w: 21, up: 5, lo: 20, cl: -1, cr: -1 }, yaw: 0 });
  const tt = t < 0.9 ? 0 : sm((t - 0.9) / 0.4);
  const rs = rk(t < 3 ? 'melongo' : 'bingung', 'netral', { ...DESK_ARMS, gazeY: 0.7, gazeX: -0.3, tilt: -3, sweat: 0.6 + 0.4 * sm((t - 1.5) / 1.5), bags: 0.15, mouth: t < 3 ? { w: 10, up: 0, lo: 20 } : { w: 11, up: -4, lo: -1 } });
  w += TK(ps, TX, FY, k, { t, uid: 'tk1' });
  w += RK(rs, RX, FY, k, { t, uid: 'rk1', outfit: 'kuliah' });
  w += K.deskTop(DY) + K.deskFront(DY);
  w += K.openBook(TX, DY + 56, 0.5, { cover: '#1D7B75' }) + K.pencil(TX + 70, DY + 66, 0.8, -20) + K.openBook(RX, DY + 56, 0.5, { cover: '#E8665F', ink: '#C9D4D9' });
  // reaksi kontras: Tala "ting!", Raka tanda tanya dan spiral
  w += K.bulb(TX + 30, 775, 0.8 * tt, tt, t);
  let ov = '';
  if (t >= 0.9) { w += K.spark(TX - 130, 700, 0.6 * tt, '#F8C038', tt) + K.spark(TX + 130, 730, 0.5 * tt, '#F8C038', tt); }
  const rq = sm((t - 1.0) / 0.4);
  if (rq > 0.01) w += `<g opacity="${rq.toFixed(2)}">${K.qmarks(RX, 790, t, 0.8, 3)}</g>${K.spiral(RX + 150, 880, t, 0.5)}`;
  // pertanyaan besar di layar (hook), lalu label kecil
  const bA = win(t, 0, 2.5, 0.14), bk = (0.8 + 0.2 * eob(t / 0.35)) * (1 + 0.012 * Math.sin(t * 6));
  ov += banner([['EMANG ORANG', '#fff', 96], ['JENIUS ITU', '#F8C038', 112], ['BENERAN ADA?', '#fff', 96]], 515, bA, bk);
  if (t > 2.6) {
    const a1 = win(t, 3.3, 5.3, 0.2), a2 = win(t, 4.0, 5.3, 0.2);
    ov += chip(TX, 295, 'OOH, PAHAM!', { bg: '#1D7B75', w: 400, fs: 40, a: a1, k: 0.85 + 0.15 * eob((t - 3.3) / 0.3) });
    ov += chip(RX, 295, 'HAH? APA?', { bg: '#E8665F', w: 340, fs: 40, a: a2, k: 0.85 + 0.15 * eob((t - 4.0) / 0.3) });
  }
  const z = 1 + 0.045 * clamp(t / 5.34, 0, 1);
  return `<g transform="translate(540 1100) scale(${z.toFixed(4)}) translate(-540 -1100)">${w}</g>${ov}`;
}

// ================================================================ 2. BACA TIGA KALI, MELONGO, TENANG (5.34 - 11.9)
function baca(t) {
  const k = 1.05, FY = 1450, RX = 520;
  let w = K.studyBg(t) + K.lamp(1000, 1196, 1.1);
  const melong = t >= 7.46, lega = t >= 10.5;
  const gz = melong ? 0.05 : 0.8;
  const rs = rk(lega ? 'lega' : melong ? 'melongo' : 'netral', 'netral', { ...DESK_ARMS, gazeY: gz, tilt: lega ? 4 : melong ? -2 + 3.5 * Math.sin(t * 1.9) : -4, bags: 0.25, ...(melong && !lega ? { mouth: { w: 10, up: 0, lo: 22 } } : {}) });
  w += RK(rs, RX, FY, k, { t, uid: 'rk2', outfit: 'santai' });
  w += K.deskTop(1196) + K.deskFront(1196);
  // halaman dibalik cepat selama membaca (5.4 - 7.3), tiga kali
  const readT = t - 5.4, flip = readT >= 0 && readT < 1.9 ? (readT % 0.64) / 0.64 : 0;
  w += K.openBook(RX, 1262, 0.82, { flip, cover: '#1D7B75' });
  // penghitung bacaan: 1x, 2x, 3x
  const cnt = t >= 6.72 ? 3 : t >= 6.4 ? 2 : t >= 6.05 ? 1 : 0;
  let ov = '';
  if (t < 7.9) {
    const a = win(t, 5.45, 7.9, 0.15);
    ov += `<g opacity="${a.toFixed(2)}">${R(240, 262, 600, 120, 'rgba(0,0,0,.3)', 60, 'transform="translate(0 8)"')}${R(240, 262, 600, 120, '#3B4A8C', 60)}`;
    for (let i = 1; i <= 3; i++) { const on = cnt >= i, kk = on ? 1 + 0.25 * Math.exp(-(t - [6.05, 6.4, 6.72][i - 1]) * 9) : 1; ov += `<g transform="translate(${300 + i * 140} 322) scale(${kk.toFixed(3)})">${C(0, 0, 44, on ? '#F8C038' : 'rgba(255,255,255,.18)')}${T(0, 17, i + '×', on ? '#172B38' : 'rgba(255,255,255,.5)', 46)}</g>`; }
    ov += T(330, 332, 'BACA', '#fff', 40, '', 'middle') + `</g>`;
  }
  if (melong) {
    const u = clamp((t - 7.46) / 0.4, 0, 1);
    w += `<g opacity="${(u * (lega ? 1 - sm((t - 10.5) / 0.4) : 1)).toFixed(2)}">${K.dots3(RX - 50, 640, t)}${K.fly(RX, 650, t - 7.46, 210)}</g>`;
    ov += `<g opacity="${(u * (lega ? 1 - sm((t - 10.4) / 0.3) : 1)).toFixed(2)}">${chip(RX, 330, 'MASIH BENGONG…', { bg: '#E8665F', w: 600, fs: 44, k: 0.85 + 0.15 * eob((t - 7.46) / 0.3) })}</g>`;
  }
  if (t >= 10.22) { const hop = eob((t - 10.22) / 0.5); w += koriSvg(830, 1230 - 10 + (1 - hop) * 300, 0.7 + 0.2 * hop, t, { wave: 1, a: clamp((t - 10.22) / 0.15, 0, 1) }); }
  const zb = 1 + 0.08 * clamp((t - 7.4) / 3.2, 0, 1); w = `<g transform="translate(540 1000) scale(${zb.toFixed(4)}) translate(-540 -1000)">${w}</g>`;
  if (t >= 10.5) ov += chip(500, 330, 'TENANG…', { bg: COL.green, w: 440, fs: 48, a: clamp((t - 10.5) / 0.15, 0, 1), k: 0.85 + 0.15 * eob((t - 10.5) / 0.35) });
  return w + ov;
}

// ================================================================ 3. "UPGRADE" (lelucon, 11.9 - 15.02)
function upgrade(t) {
  let w = A.softBg('#0F5F57', '#0A3830', 'sbu');
  const jok = t >= 14.55; // setelah lelucon: tertawa
  const ps = tk(jok ? 'tertawa' : 'semangat', 'berdiri', { yaw: 0 });
  w += TK(ps, 540, 1410, 0.92, { t, uid: 'tk3' });
  // gelembung pikiran dengan tombol upgrade (lelucon, bukan penjelasan ilmiah)
  const a = sm((t - 13.0) / 0.35) * (1 - sm((t - 14.45) / 0.25));
  if (a > 0.01) {
    const prog = clamp((t - 13.55) / 0.9, 0, 1), press = t > 13.98 && t < 14.22 ? 1 : 0;
    w += `<g opacity="${a.toFixed(2)}" transform="translate(540 600) scale(${(0.85 + 0.15 * eob((t - 13.0) / 0.4)).toFixed(3)}) translate(-540 -600)">${A.thought(260, 380, 560, 330, '#fff', [540, 770])}${K.upgradeBtn(540, 540, 1, press, prog)}</g>`;
    if (t > 14.0) w += K.spark(380, 440, 0.8 * sm((t - 14) / 0.2), '#F8C038') + K.spark(700, 460, 0.7 * sm((t - 14.05) / 0.2), '#F8C038') + K.spark(560, 380, 0.5 * sm((t - 14.1) / 0.2), '#fff');
  }
  let ov = '';
  if (t >= 11.95) ov += chip(540, 300, 'BENARKAH ADA “UPGRADE”?', { bg: COL.indigo, w: 880, fs: 40, a: win(t, 11.95, 13.0, 0.15) * 1, k: 0.85 + 0.15 * eob((t - 11.95) / 0.3) });
  if (jok) { const u = sm((t - 14.6) / 0.3); w += `<g opacity="${u.toFixed(2)}">${C(540, 600, 70 * (1 - u) + 20, 'rgba(255,255,255,.18)')}</g>`; ov += `<g transform="translate(540 560) rotate(-5) scale(${(0.6 + 0.4 * eob((t - 14.6) / 0.35)).toFixed(3)})" opacity="${clamp((t - 14.6) / 0.1, 0, 1).toFixed(2)}">${R(-300, -52, 600, 104, '#F8C038', 52)}${T(0, 22, 'CUMA BERCANDA!', '#172B38', 56)}</g>`; }
  w += koriSvg(880, 1385, 0.58, t, { mood: jok ? 'happy' : 'happy', wave: jok ? 1 : 0, a: clamp((t - 12.3) / 0.2, 0, 1) });
  return w + ov;
}

// ================================================================ 4. KEPINGAN: bekal (15.02 - 18.36), hubungkan (18.36 - 24.06)
const PS = 190, BX = 255, BY = 360, N = 3;
const slotXY = (c, r) => [BX + c * PS, BY + r * PS];
const TALA_SET = [[0, 0, 'A'], [1, 0, 'B'], [2, 0, 'C'], [0, 1, 'D'], [1, 1, 'E']];
const idxOf = (c, r) => r * N + c;
function pieceAt(c, r, o = {}) { const [x, y] = slotXY(c, r); return K.piece(x, y, PS, K.pieceEdges(c, r, N), K.PCOL[idxOf(c, r) % K.PCOL.length], o); }
function bekal(t) {
  let w = A.softBg('#1B6B8A', '#0A3830', 'sbp') + K.boardFrame(BX, BY, PS, N);
  const times = [15.7, 16.05, 16.45, 16.9, 17.3];
  TALA_SET.forEach(([c, r, lb], i) => { const tt = times[i]; if (t >= tt) { const u = eob((t - tt) / 0.35); w += pieceAt(c, r, { label: lb, k: 0.5 + 0.5 * u, a: clamp((t - tt) / 0.1, 0, 1), rot: (1 - u) * (i % 2 ? 14 : -14) }); } });
  // info baru turun (18.86) dan melayang di atas slot, lalu terhubung (21.7)
  const slot = [2, 1], [sx, sy] = slotXY(...slot);
  const link = t >= 21.7, fly0 = 18.86;
  let ov = '';
  if (t >= fly0) {
    const u = sm((t - fly0) / 0.7), snap = sm((t - 21.7) / 0.28);
    const hx = lerp(960, sx + 190, u), hy = lerp(150, sy - 130 + Math.sin(t * 3) * 14, u);
    const x = lerp(hx, sx, snap), y = lerp(hy, sy, snap), glow = link ? Math.exp(-(t - 21.98) * 2.4) : 0.4 + 0.2 * Math.sin(t * 5);
    w += K.piece(x, y, PS, K.pieceEdges(2, 1, N), '#F8C038', { label: '★', fs: 70, fg: '#172B38', glow: Math.max(0, glow), rot: lerp(Math.sin(t * 3) * 6, 0, snap), k: 1 + 0.06 * Math.sin(t * 4) * (1 - snap) });
    if (link) { // garis penghubung menyala ke keping tetangga
      const pulse = clamp((t - 21.85) / 0.5, 0, 1), a = (1 - sm((t - 23.4) / 0.4)) * 0.95;
      const nb = [[2, 0], [1, 1]].map(([c, r]) => { const [ax, ay] = slotXY(c, r); return L(`M${f1(sx + PS / 2)} ${f1(sy + PS / 2)}L${f1(ax + PS / 2)} ${f1(ay + PS / 2)}`, '#FFE08A', 12, `opacity="${(a * pulse).toFixed(2)}" stroke-dasharray="26 16"`); }).join('');
      w += nb + K.spark(sx + PS / 2, sy + PS / 2, 1.1 * Math.max(0, Math.exp(-(t - 21.9) * 3)), '#fff') + K.spark(sx + PS - 10, sy + 20, 0.8 * Math.exp(-(t - 22.3) * 3), '#FFE08A');
    }
    const lb = win(t, 19.0, 21.65, 0.2);
    if (lb > 0.01) ov += chip(sx + 250, sy - 205, 'INFO BARU', { bg: '#F8C038', fg: '#172B38', w: 400, fs: 44, a: lb, k: 0.85 + 0.15 * eob((t - 19) / 0.3) });
  }
  // label bekal
  const tagA = win(t, 17.0, 18.4, 0.2);
  if (tagA > 0.01) ov += chip(540, 275, 'BEKAL: MATERI SEBELUMNYA', { bg: COL.green, w: 860, fs: 40, a: tagA, k: 0.85 + 0.15 * eob((t - 17) / 0.3) });
  if (t >= 21.7 && t < 23.9) ov += chip(540, 275, 'NYAMBUNG DENGAN YANG SUDAH ADA', { bg: COL.green, w: 960, fs: 38, a: win(t, 21.75, 23.9, 0.2), k: 0.85 + 0.15 * eob((t - 21.75) / 0.3) });
  // Tala di bawah papan
  const ps = link ? tk('senang', 'berdiri') : tk('fokus', 'berdiri', { yaw: 0.1 });
  w += TK(ps, 540, 1420, 0.72, { t, uid: 'tk4' });
  return w + ov;
}

// ================================================================ 5. MENYUSUN SATU PER SATU (24.06 - 29.95)
function susun(t) {
  let w = A.softBg('#2A5E8A', '#0A3830', 'sbs') + K.boardFrame(BX, BY, PS, N);
  const place = [[0, 0, 24.4, 'A'], [1, 0, 27.2], [0, 1, 28.0], [1, 1, 28.7], [2, 0, 29.2], [2, 1, 29.56]];
  let ov = '';
  // keping A sudah ada
  const placed = [];
  place.forEach(([c, r, tt], i) => {
    const u = clamp((t - tt) / 0.45, 0, 1), s0 = sm(u);
    const [sx, sy] = slotXY(c, r), nt = place.length, trayX = 560 + (i % 3) * 150, trayY = 985 + Math.floor(i / 3) * 140;
    const x = i === 0 ? sx : lerp(trayX - 40 + 0, sx, s0), y = i === 0 ? sy : lerp(trayY - 20, sy, s0) - 70 * Math.sin(Math.PI * s0) * (u < 1 ? 1 : 0);
    const col = K.PCOL[idxOf(c, r) % K.PCOL.length];
    if (i === 0) { w += pieceAt(c, r, { label: 'A', k: eob((t - 24.1) / 0.4), a: clamp((t - 24.1) / 0.1, 0, 1) }); return; }
    const asing = t < 26.6; // masih asing: keping abu-abu bertanda tanya di nampan
    const done = u >= 1;
    w += K.piece(x, y, PS * (done ? 1 : 0.66), K.pieceEdges(c, r, N), asing && !done ? '#9AA9B0' : col, { label: done ? String.fromCharCode(65 + i) : asing ? '?' : '', k: done ? 1 + 0.12 * Math.exp(-(t - tt - 0.45) * 8) * (t > tt + 0.45 ? 1 : 0) : 1, rot: done ? 0 : (i % 2 ? 6 : -6) });
    if (done) { const nb = clamp((t - tt - 0.2) / 0.1, 0, 1); ov += `<g transform="translate(${f1(sx + PS - 18)} ${f1(sy + 24)}) scale(${(0.6 + 0.4 * eob((t - tt - 0.4) / 0.3)).toFixed(3)})" opacity="${nb.toFixed(2)}">${C(0, 0, 26, '#fff')}${T(0, 10, String(i), '#172B38', 30)}</g>`; }
  });
  // info baru mencoba masuk tapi belum pas (konsep dasar masih asing)
  if (t >= 25.1 && t < 26.7) {
    const u = (t - 25.1) / 1.6, [sx, sy] = slotXY(2, 1), bump = Math.sin(u * Math.PI * 3) * 14 * (1 - u);
    w += K.piece(sx + 30 + bump + 260 * (1 - sm(u * 2)), sy - 40 - 20 * Math.sin(u * 5), PS * 0.9, K.pieceEdges(2, 1, N), '#F8C038', { label: '★', fs: 60, fg: '#172B38', rot: 10 * Math.sin(u * 12) * (1 - u), a: 1 - sm((u - 0.8) / 0.2) });
    ov += `<g transform="translate(${f1(sx + 80)} ${f1(sy - 80)}) rotate(${f1(Math.sin(t * 12) * 6)})">${T(0, 0, '?!', '#E8665F', 76, 'stroke="#fff" stroke-width="12" paint-order="stroke"')}</g>`;
  }
  const t1 = win(t, 25.2, 26.6, 0.2);
  if (t1 > 0.01) ov += chip(540, 275, 'KONSEP DASAR MASIH ASING', { bg: COL.coral, w: 900, fs: 40, a: t1, k: 0.85 + 0.15 * eob((t - 25.2) / 0.3) });
  const t2 = win(t, 26.7, 29.95, 0.2);
  if (t2 > 0.01) ov += chip(540, 275, 'SUSUN SATU PER SATU: WAJAR', { bg: COL.indigo, w: 940, fs: 40, a: t2, k: 0.85 + 0.15 * eob((t - 26.7) / 0.3) });
  const ex = t < 26.6 ? 'bingung' : t < 28.6 ? 'berpikir' : 'senang';
  const rs = rk(ex, 'netral', { yaw: -0.2, tilt: 0 });
  w += RK(rs, 240, 1420, 0.64, { t, uid: 'rk5', outfit: 'kuliah' });
  return w + ov;
}

// ================================================================ 6. SAMA-SAMA LANJUT (29.95 - 31.1)
function lanjut(t) {
  let w = A.softBg('#0F5F57', '#0A3830', 'sbl');
  const cx = 540, cy = 560, s = 120;
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) { const i = r * 3 + c; w += K.piece(cx - 180 + c * s, cy - 180 + r * s, s, K.pieceEdges(c, r, 3), K.PCOL[i % K.PCOL.length], { k: 1, a: 1, glow: 0.35 + 0.25 * Math.sin(t * 5 + i) }); }
  const u = eob((t - 29.95) / 0.4);
  w += RK(rk('senang', 'netral', { lean: -2 }), 290, 1400 + (1 - u) * 80, 0.8, { t, uid: 'rk6', outfit: 'kuliah' });
  w += TK(tk('senang', 'berdiri'), 790, 1400 + (1 - u) * 80, 0.8, { t, uid: 'tk6' });
  w += K.spark(250, 420, 0.8, '#F8C038') + K.spark(830, 700, 0.7, '#F8C038') + K.spark(540, 330, 0.6, '#fff');
  const ov = chip(540, 275, 'SAMA-SAMA BISA LANJUT BELAJAR', { bg: COL.green, w: 960, fs: 38, a: clamp((t - 29.95) / 0.15, 0, 1), k: 0.85 + 0.15 * eob((t - 29.95) / 0.3) });
  return w + ov;
}

export const SCENES_K1 = [
  { t0: 0, draw: kelas },
  { t0: 5.34, tr: { type: 'wipe', d: 0.4 }, draw: baca },
  { t0: 11.9, tr: { type: 'iris', d: 0.45, cx: 540, cy: 900 }, draw: upgrade },
  { t0: 15.02, tr: { type: 'wipe', d: 0.4 }, draw: bekal },
  { t0: 24.06, tr: { type: 'iris', d: 0.45, cx: 540, cy: 700 }, draw: susun },
  { t0: 29.95, tr: { type: 'wipe', d: 0.35 }, draw: lanjut },
];

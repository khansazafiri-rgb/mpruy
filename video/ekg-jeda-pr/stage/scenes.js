// Video "Kenapa ada jeda setelah gelombang P?" (1080 x 1920, 30 fps). Gaya datar 2D MEDCOEL.
// Jantung dan garis EKG memakai SATU waktu animasi: s = sOf(tn) (timeline.js) -> heartSvg(s) dan ecgSlow(s) (heart.js). Raka dari brand/characters/raka/raka.js.
import { f1, clamp, lerp, sm, eo, eio, seg, track, R, C, P, T, FONT, tw, pill, GOLD, FOREST, INK } from './lib.js';
import { raka, rakaSvg, armShape, idle as rIdle } from '../../../brand/characters/raka/raka.js';
import * as H from './heart.js';
import * as TL from './timeline.js';
export const A = TL.A, OFF = TL.OFF, sOf = TL.sOf;
const ka = (t, t0, t1, f = 0.25) => clamp((t - t0) / f) * clamp((t1 - t) / f);
const op = (a, inner) => `<g opacity="${f1(clamp(a) * 1000) / 1000}">${inner}</g>`;
const CREAM = '#F7F2E4', GRID = '#1F5A5E', TRACE = '#7DF0C4', CORAL = '#D9382F';
const bgNavy = `<defs><linearGradient id="nbg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#12485A"/><stop offset="1" stop-color="#0A2B36"/></linearGradient></defs><rect x="-9000" y="-9000" width="18000" height="18000" fill="url(#nbg)"/>`;
// ------------------------------------------------------------------ teks layar
function chip(lines, t, t0, t1, o = {}) { const k = ka(t, t0, t1, o.f ?? 0.3); return k > 0.01 ? pill(lines, 540, (o.y ?? 120) + (1 - eo(clamp((t - t0) / 0.35))) * -40, { a: k, size: o.size ?? 54, bg: o.bg, fg: o.fg }) : ''; }
function tag(txt, x, y, a = 1, o = {}) {
  if (a <= 0.01) return ''; const size = o.size ?? 34, w = tw(txt, size) + 46, h = size + 26;
  return `<g opacity="${f1(a * 100) / 100}"><rect x="${f1(x - w / 2)}" y="${f1(y - h / 2 + 5)}" width="${f1(w)}" height="${h}" rx="${h / 2}" fill="rgba(0,0,0,.28)"/><rect x="${f1(x - w / 2)}" y="${f1(y - h / 2)}" width="${f1(w)}" height="${h}" rx="${h / 2}" fill="${o.bg ?? '#fff'}"/>${T(txt, x, y + size * 0.36, { size, fill: o.fg ?? FOREST })}</g>`;
}
function callout(txt, tx, ty, ax, ay, a, o = {}) {
  if (a <= 0.01) return ''; const size = o.size ?? 36, w = tw(txt, size) + 46, h = size + 26, col = o.col ?? GOLD, ex = ax < tx ? tx - w / 2 : tx + w / 2;
  return `<g opacity="${f1(a * 100) / 100}"><path d="M${f1(ex)} ${f1(ty)}L${f1(ax)} ${f1(ay)}" stroke="#000" stroke-opacity=".3" stroke-width="9" stroke-linecap="round" transform="translate(0 4)"/><path d="M${f1(ex)} ${f1(ty)}L${f1(ax)} ${f1(ay)}" stroke="${col}" stroke-width="6" stroke-linecap="round"/><circle cx="${f1(ax)}" cy="${f1(ay)}" r="9" fill="${col}" stroke="#000" stroke-opacity=".35" stroke-width="3"/><rect x="${f1(tx - w / 2)}" y="${f1(ty - h / 2)}" width="${f1(w)}" height="${h}" rx="${h / 2}" fill="${o.bg ?? '#0F3A47'}" stroke="${col}" stroke-width="4"/>${T(txt, tx, ty + size * 0.36, { size, fill: o.fg ?? '#fff' })}</g>`;
}
function caption(tn) {
  const c = TL.KAL.find(([a, b]) => tn >= a - 0.04 && tn < b + 0.1); if (!c) return '';
  const size = 46, words = c[2].split(' '), lines = []; let cur = ''; for (const w of words) { const t = cur ? cur + ' ' + w : w; if (cur && tw(t, size) > 840) { lines.push(cur); cur = w; } else cur = t; } if (cur) lines.push(cur);
  const a = clamp((tn - c[0]) / 0.14) * clamp((c[1] + 0.1 - tn) / 0.12 + 0.2), lh = size * 1.22, h = lines.length * lh + 30, y = 1340;
  return `<g opacity="${f1(a * 100) / 100}">${R(90, y + 6, 900, h, 'rgba(0,0,0,.28)', 34)}${R(90, y, 900, h, 'rgba(8,16,28,.92)', 34)}${lines.map((l, i) => T(l, 540, y + 14 + size * 0.88 + i * lh, { size, fill: '#fff', w: 800 })).join('')}</g>`;
}
// ------------------------------------------------------------------ panel EKG (garis dari ecgSlow(s)); sumbu x = s pada jendela WIN
const WIN = [17.4, 26.6];
function ecgPanel(s, o = {}) {
  const { x0 = 40, y0 = 960, w = 1000, h = 330, prHL = 0, dimP = 0, dimQ = 0, labels = {}, id = 'e' } = o, xa = x0 + 50, xb = x0 + w - 50, xs = (ss) => xa + (xb - xa) * (ss - WIN[0]) / (WIN[1] - WIN[0]), yb = y0 + h * 0.72, amp = h * 0.46;
  let g = `<rect x="${x0 + 8}" y="${y0 + 12}" width="${w}" height="${h}" rx="34" fill="rgba(0,0,0,.3)"/><rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="34" fill="#0A2330" stroke="#CDEFF3" stroke-width="4"/>`;
  for (let gx = 0; gx <= w - 40; gx += 25) g += `<path d="M${x0 + 20 + gx} ${y0 + 16}V${y0 + h - 16}" stroke="${GRID}" stroke-width="${gx % 125 === 0 ? 2.4 : 1}"/>`;
  for (let gy = 0; gy <= h - 32; gy += 25) g += `<path d="M${x0 + 20} ${y0 + 16 + gy}H${x0 + w - 20}" stroke="${GRID}" stroke-width="${gy % 125 === 0 ? 2.4 : 1}"/>`;
  g += `<path d="M${xa} ${yb}H${xb}" stroke="#2D6F70" stroke-width="2.5" stroke-dasharray="4 8"/>`;
  const sEnd = clamp(s, WIN[0], WIN[1]);
  // pita segmen PR (akhir P -> awal QRS)
  const PR0 = 20.95, PR1 = 24.72;
  if (prHL > 0.01) { const a = xs(PR0), b = xs(Math.min(PR1, Math.max(PR0, sEnd + 0.0))), bb = xs(PR1); g += `<rect x="${f1(a)}" y="${f1(y0 + 24)}" width="${f1(bb - a)}" height="${f1(h - 48)}" rx="16" fill="${GOLD}" opacity="${f1(0.16 * prHL * 100) / 100}"/><rect x="${f1(a)}" y="${f1(y0 + 24)}" width="${f1(bb - a)}" height="${f1(h - 48)}" rx="16" fill="none" stroke="${GOLD}" stroke-width="5" stroke-dasharray="18 12" stroke-dashoffset="${f1(-s * 40)}" opacity="${f1(prHL * 100) / 100}"/>`; }
  const path = (a, b, col, lw, al = 1) => { if (b <= a) return ''; let d = ''; const n = Math.max(2, Math.round((b - a) / 0.03)); for (let i = 0; i <= n; i++) { const ss = a + (b - a) * i / n; d += `${i ? 'L' : 'M'}${f1(xs(ss))} ${f1(yb - H.ecgSlow(ss) * amp)}`; } return `<path d="${d}" fill="none" stroke="${col}" stroke-width="${lw}" stroke-linejoin="round" stroke-linecap="round" opacity="${al}"/>`; };
  g += path(WIN[0], sEnd, TRACE, 5);
  if (sEnd > 18.7) g += path(18.7, Math.min(21.0, sEnd), H.COL.P, 9, 1 - 0.55 * dimP);
  if (prHL > 0.01 && sEnd > PR0) g += path(PR0, Math.min(PR1, sEnd), GOLD, 10, prHL);
  if (sEnd > 24.7) g += path(24.7, Math.min(26.0, sEnd), H.COL.QRS, 9, 1 - 0.55 * dimQ);
  const cy = yb - H.ecgSlow(sEnd) * amp, pulse = 0.5 + 0.5 * Math.sin(s * 9);
  g += `<circle cx="${f1(xs(sEnd))}" cy="${f1(cy)}" r="${f1(22 + 6 * pulse)}" fill="none" stroke="#fff" stroke-width="3" opacity=".5"/><circle cx="${f1(xs(sEnd))}" cy="${f1(cy)}" r="13" fill="#fff" stroke="${H.segCol(sEnd) || TRACE}" stroke-width="6"/>`;
  const lab = (txt, s0, col, ya, a, size = 40) => `<g opacity="${f1(a * 100) / 100}">${R(xs(s0) - tw(txt, size) / 2 - 18, ya - size * 1.05, tw(txt, size) + 36, size * 1.55, col, size * 0.78)}${T(txt, xs(s0), ya + size * 0.1, { size, fill: INK })}</g>`;
  if (labels.P) g += lab('P', 19.9, H.COL.P, yb - 0.24 * amp - 60, labels.P * (1 - 0.5 * dimP));
  if (labels.PR) g += lab('SEGMEN PR', 22.85, GOLD, yb + 100, labels.PR, 40);
  if (labels.QRS) g += lab('QRS', 25.22, H.COL.QRS, yb - amp - 40, labels.QRS * (1 - 0.5 * dimQ));
  return { svg: g, xs, yb, amp, geom: { x0, y0, w, h } };
}
// ------------------------------------------------------------------ kartu jantung dengan kamera (zoom ke titik jantung)
const HPP = { x: 540, y: 640, sc: 0.88, rot: -10 };
function heartCard(s, tn, o = {}) {
  const { x = 40, y = 290, w = 1000, h = 650, hp = HPP, z = 1, fx = 540, fy = 615, id = 'hc', fill = 0, flow = 0, nodes = true } = o, ccx = x + w / 2, ccy = y + h / 2;
  const Zt = (px, py) => [ccx + (px - fx) * z, ccy + (py - fy) * z];
  let d = `<defs><clipPath id="cl${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="44"/></clipPath></defs><rect x="${x + 8}" y="${y + 12}" width="${w}" height="${h}" rx="44" fill="rgba(0,0,0,.28)"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="44" fill="${CREAM}"/>`;
  d += `<g clip-path="url(#cl${id})"><circle cx="${x + 90}" cy="${y + 90}" r="110" fill="#EADFC4"/><circle cx="${x + w - 60}" cy="${y + h - 70}" r="130" fill="#EADFC4" opacity=".8"/><g transform="translate(${f1(ccx)} ${f1(ccy)}) scale(${f1(z * 1000) / 1000}) translate(${f1(-fx)} ${f1(-fy)})">${H.heartSvg(s, { uid: id, x: hp.x, y: hp.y, sc: hp.sc, rot: hp.rot, nodes, fill, flow })}</g></g>`;
  const pt = (hx, hy) => Zt(...H.heartPt(hx, hy, hp));
  return { svg: d, pt, Zt };
}
// ------------------------------------------------------------------ Raka (aset asli)
const armTo = (side, hx, hy, extra = {}) => { const a = { wx: hx, wy: hy, ex: side === 'R' ? Math.max(330, hx + 70) : Math.min(70, hx - 70), ey: hy + 90, finger: 0, fa: -90, front: 1, roll: 0, hold: 0, holdRot: 0, ...extra }; const hh = armShape(side, a).hand; a.wx += hx - hh[0]; a.wy += hy - hh[1]; return a; };
const rk = (st, cx, ty, k, uid) => { const tx = cx - 200 * k; return { svg: `<g transform="translate(${f1(tx)} ${f1(ty)}) scale(${k})">${rakaSvg(st, { bare: true, uid, shadow: false })}</g>`, toLocal: (x, y) => [(x - tx) / k, (y - ty) / k], hand: (side, st2) => { const hh = armShape(side, st2['arm' + side]).hand; return [tx + hh[0] * k, ty + hh[1] * k]; } }; };
const SHL = [104, 410];
function reach(r, tx, ty, maxLen = 255) { const [lx, ly] = r.toLocal(tx, ty); let dx = lx - SHL[0], dy = ly - SHL[1]; const L = Math.hypot(dx, dy); if (L > maxLen) { dx *= maxLen / L; dy *= maxLen / L; } return [SHL[0] + dx, SHL[1] + dy]; }
// ------------------------------------------------------------------ HOOK (0 - 3,9): P selesai, penunjuk melaju di ruas datar; impuls bergerak di jantung; Raka mengikuti garis
const RH = { cx: 840, ty: 300, k: 1.1 };
function layoutHook(tn) {
  const s = sOf(tn), ecg = ecgPanel(s, { x0: 40, y0: 860, w: 1000, h: 400, id: 'h', labels: { P: ka(tn, 1.0, 3.8, 0.3) } });
  let A_ = bgNavy; const hc = heartCard(s, tn, { x: 40, y: 330, w: 560, h: 480, hp: { x: 320, y: 575, sc: 0.62, rot: -10 }, fx: 320, fy: 575, z: 1, id: 'hk' });
  A_ += hc.svg;
  const base = RH, st0 = rIdle(raka(tn < 2.2 ? 'netral' : 'berpikir', 'netral', { yaw: -0.2, tilt: 3, gazeX: -0.7, gazeY: 0.5 }), tn);
  const r0 = rk(st0, base.cx, base.ty, base.k, 'rH'), cur = [ecg.xs(clamp(s, WIN[0], WIN[1])), ecg.yb - H.ecgSlow(s) * ecg.amp];
  const hnd = reach(r0, clamp(cur[0], 560, 900), cur[1] - 30), dir = Math.atan2(cur[1] - 30 - 0, cur[0] - 700) * 180 / Math.PI;
  const st = rIdle(raka(tn < 2.2 ? 'netral' : 'berpikir', 'netral', { armL: armTo('L', hnd[0], hnd[1], { finger: 1, fa: dir }), armR: armTo('R', 314, 552), yaw: -0.2, tilt: 3, gazeX: -0.7, gazeY: 0.5 }), tn);
  const r = rk(st, base.cx, base.ty, base.k, 'rH');
  A_ += ecg.svg + r.svg;
  let U = chip(['KOK SETELAH P', 'GARISNYA DATAR?'], tn, -1, 3.9, { size: 60, bg: CORAL, fg: '#fff', y: 100 });
  U += tag('garis EKG (ilustrasi)', 300, 1296, ka(tn, 0.3, 3.8, 0.3), { size: 30 });
  return { A: A_, U };
}
// ------------------------------------------------------------------ UTAMA (3,9 - 22): dua panel besar, satu s
const CAM = track([[3.9, 540, 615, 1.0], [4.6, 540, 600, 1.12], [7.8, 470, 520, 1.16], [8.4, 500, 520, 1.36], [9.6, 540, 575, 1.55], [14.7, 540, 575, 1.55], [15.5, 540, 520, 1.15], [18.5, 540, 520, 1.15], [19.4, 540, 560, 1.0], [22, 540, 615, 1.0]]);
function layoutMain(tn) {
  const s = sOf(tn), cam = CAM(clamp(tn, 3.9, 22)), fill = eio(seg(tn, 12.4, 18.4)) * (tn < 21.6 ? 1 : 1 - seg(tn, 21.6, 22)), flow = fill > 0.02 && tn < 18.5 ? 1 : 0;
  const prHL = eo(seg(tn, 10.9, 11.6)) * (1 - 0.0), dimP = seg(tn, 8.0, 8.5), dimQ = 1 - seg(tn, 18.3, 19.2);
  const hc = heartCard(s, tn, { z: cam[2], fx: cam[0] + 0, fy: cam[1], id: 'mc', fill, flow });
  const ecg = ecgPanel(s, { prHL: prHL * (tn < 19.2 ? 1 : 1 - seg(tn, 19.2, 19.8)), dimP, dimQ, id: 'm', labels: { P: ka(tn, 6.2, 22, 0.3), PR: ka(tn, 11.0, 19.3, 0.3), QRS: ka(tn, 19.9, 22, 0.3) } });
  let A_ = bgNavy + hc.svg + ecg.svg;
  const sn = hc.pt(H.ptSA[0], H.ptSA[1]), av = hc.pt(H.ptAV[0], H.ptAV[1]), at = hc.pt(430, 170), vt = hc.pt(190, 440);
  // lingkaran halus di nodus AV (dihitung pada koordinat layar setelah zoom)
  const rk_ = ka(tn, 8.0, 15.2, 0.3); if (rk_ > 0.01) A_ += `<g opacity="${f1(rk_ * 100) / 100}"><circle cx="${f1(av[0])}" cy="${f1(av[1])}" r="${f1((46 + 4 * Math.sin(tn * 5)) * (cam[2] / 1.2 + 0.4))}" fill="none" stroke="${GOLD}" stroke-width="6" stroke-dasharray="16 12" stroke-dashoffset="${f1(-tn * 30)}"/></g>`;
  const lb = (txt, x, y, p, a0, a1, col) => callout(txt, x, y, p[0], p[1], ka(tn, a0, a1, 0.25), { col, k: 1 });
  let U = lb('nodus sinus', 220, 400, sn, 4.0, 5.6, H.COL.sa) + lb('serambi', 860, 420, at, 5.3, 8.0, H.COL.P);
  U += lb('NODUS AV', 840, 470, av, 8.4, 15.0, GOLD);
  U += lb('bilik', 200, 880, vt, 15.4, 22, H.COL.QRS);
  U += chip(['SERAMBI → P'], tn, 4.5, 7.9, { size: 54, bg: '#FFF4B8', fg: INK }) + chip(['IMPULS MELAMBAT', 'DI NODUS AV'], tn, 8.1, 10.9, { size: 50 }) + chip(['SEGMEN PR = JEDA'], tn, 11.0, 14.5, { size: 54, bg: GOLD, fg: INK }) + chip(['JEDA = BILIK', 'TERISI DARAH'], tn, 14.6, 18.5, { size: 50 }) + chip(['BILIK → QRS'], tn, 18.6, 21.9, { size: 54, bg: '#FFD9BC', fg: INK });
  U += tag('GERAK DIPERLAMBAT', 210, 330, ka(tn, 4.0, 21.9, 0.3), { size: 30, bg: '#FFF4B8', fg: INK });
  U += tag('impuls masih bergerak, hanya tertahan sejenak', 540, 905, ka(tn, 11.2, 14.5, 0.3), { size: 32, bg: '#0F3A47', fg: '#fff' });
  U += tag('bilik terisi darah', 800, 880, ka(tn, 15.2, 18.5, 0.3), { size: 34, bg: '#FFE3DC', fg: '#8A2F22' });
  U += tag('listrik lebih dulu, kontraksi menyusul', 540, 905, ka(tn, 20.6, 21.95, 0.3), { size: 32, bg: '#FFD9BC', fg: INK });
  return { A: A_, U };
}
// ------------------------------------------------------------------ PENUTUP (22 - akhir): putar ulang P -> segmen PR -> QRS; Raka menunjuk ruas datar
const RC = { cx: 825, ty: 300, k: 1.0 };
function layoutClose(tn) {
  const s = sOf(tn), prHL = 1, inPR = s >= 20.9 && s < 24.8, dimP = s > 21 ? 1 : 0, dimQ = s < 24.7 ? 1 : 0;
  const ecg = ecgPanel(s, { prHL, dimP: 0.9 * (s > 21.2 ? 1 : 0.0) + 0.0, dimQ: s < 24.7 ? 1 : 0, id: 'c', labels: { P: 1, PR: 1, QRS: 1 } });
  const hc = heartCard(s, tn, { x: 40, y: 290, w: 620, h: 650, hp: { x: 350, y: 615, sc: 0.64, rot: -10 }, fx: 350, fy: 615, z: 1, id: 'cc', fill: eio(seg(s, 22.5, 24.4)) * (1 - seg(s, 25.95, 26.4)) });
  let A_ = bgNavy + hc.svg;
  const base = RC, st0 = rIdle(raka('menunjuk', 'menunjuk', { yaw: 0.25, tilt: 3, gazeX: -0.6, gazeY: 0.5 }), tn), r0 = rk(st0, base.cx, base.ty, base.k, 'rC');
  const tgt = [ecg.xs(22.85), ecg.yb - 30], hnd = reach(r0, tgt[0], tgt[1] - 20, 330), ang = Math.atan2(tgt[1] - 940, tgt[0] - 700) * 180 / Math.PI;
  const st = rIdle(raka(tn < 24.6 ? 'menunjuk' : 'senang', 'menunjuk', { armL: armTo('L', hnd[0], hnd[1], { finger: 1, fa: ang }), armR: armTo('R', 314, 552), yaw: 0.25, tilt: 3, gazeX: tn < 24 ? -0.6 : -0.3, gazeY: 0.5 }), tn);
  const r = rk(st, base.cx, base.ty, base.k, 'rC');
  A_ += ecg.svg + r.svg;
  const rk2 = ka(tn, 22.0, 26.6, 0.3);
  let U = chip(['P → SEGMEN PR → QRS'], tn, 22.0, 24.4, { size: 54, bg: '#fff', y: 100 }) + chip(['DATAR ≠ JANTUNG', 'BERHENTI'], tn, 24.5, 28, { size: 54, bg: GOLD, fg: INK, y: 100 });
  U += tag('GERAK DIPERLAMBAT', 210, 330, rk2, { size: 28, bg: '#FFF4B8', fg: INK });
  U += tag(inPR ? 'impuls di nodus AV dan berkas His' : (s < 20.9 ? 'serambi → P' : 'bilik → QRS'), 350, 905, rk2, { size: 30, bg: '#0F3A47', fg: '#fff' });
  return { A: A_, U };
}
// ------------------------------------------------------------------ penyusun frame
const SCENES = [[-9, layoutHook], [3.85, layoutMain], [21.95, layoutClose]];
export async function frame(t) {
  const tn = t - OFF; let i = 0; for (let k = 0; k < SCENES.length; k++) if (tn >= SCENES[k][0]) i = k;
  const s = SCENES[i][1](tn); let A_ = s.A, U = s.U; const fd = 0.35, k = i > 0 ? clamp((tn - SCENES[i][0]) / fd) : 1;
  if (k < 1) { const p = SCENES[i - 1][1](tn), e = sm(k); A_ = p.A + op(e, s.A); U = op(1 - e, p.U) + op(e, s.U); }
  return { A: bgNavy + A_, U: U + caption(tn) };
}
export const cover = async () => {
  let st = raka('berpikir', 'netral', { yaw: -0.2, tilt: 3, gazeX: -0.7, gazeY: 0.5 }); st = rIdle(st, 0.8);
  const r = rk(st, 800, 300, 0.95, 'rCv'); const s = 26.0;
  const ecg = ecgPanel(s, { x0: 40, y0: 920, w: 1000, h: 380, prHL: 1, id: 'cv', dimP: 0.5, dimQ: 0, labels: { P: 1, PR: 1, QRS: 1 } });
  const hc = heartCard(s, 0, { x: 40, y: 330, w: 520, h: 400, hp: { x: 300, y: 540, sc: 0.5, rot: -10 }, fx: 300, fy: 540, id: 'cvh', nodes: true });
  const A_ = bgNavy + hc.svg + r.svg + ecg.svg + `<g>${R(300, 1420, 700, 230, '#F7F2E4', 40)}<image href="logo-full.webp" x="360" y="1436" width="580" height="${f1(580 * 160 / 794)}" preserveAspectRatio="xMidYMid meet"/>${R(380, 1546, 540, 86, FOREST, 43)}${T('medcoel.com', 650, 1610, { size: 60, fill: GOLD })}</g>`;
  const U = `${T('KENAPA ADA JEDA', 540, 170, { size: 84, fill: '#fff', w: 800, e: 'stroke="#0A2B34" stroke-width="10" paint-order="stroke"' })}${T('SETELAH GELOMBANG P?', 540, 262, { size: 78, fill: GOLD, w: 800, e: 'stroke="#0A2B34" stroke-width="10" paint-order="stroke"' })}${pill(['garis datar ≠ jantung berhenti'], 540, 1316, { size: 36, bg: '#fff', fg: FOREST })}`;
  return { A: A_, U };
};

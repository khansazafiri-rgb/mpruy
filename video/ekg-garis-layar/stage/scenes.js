// "Bagaimana EKG menghasilkan garis di layar?" — adegan (1080 x 1920, 30 fps). Gaya datar 2D MEDCOEL, Raka kanonik (rakaSvg), jantung/EKG dari kode (heart.js).
// Waktu dari ../cues.json (sama dengan audio/audio_mix.py). Elektroda = PENANGKAP sinyal (cincin sinyal menuju elektroda, tidak ada panah dari elektroda ke tubuh).
import { f1, clamp, lerp, sm, eo, eio, seg, win, pop, track, pchip, R, C, P, T, G, FONT, tw, pill, rndf, GOLD, FOREST, INK } from './lib.js';
import { raka, rakaSvg, armShape, idle as rIdle } from '../../../brand/characters/raka/raka.js';
import * as H from './heart.js';
const CUES = await (await fetch('../cues.json')).json(); const W = CUES.w, OW = CUES.ow;
const NOCAP = new URLSearchParams(location.search).has('nocap');
const CREAM = '#F7F2E4', NAVY = '#0F3A47', TEAL = '#0B2F38', CORAL = '#F2735E', MINT = '#9DE0BD';
const ka = (t, t0, t1, f = 0.25) => clamp((t - t0) / f) * clamp((t1 - t) / f);
// ------------------------------------------------------------------ teks layar
function chip(lines, t, t0, t1, o = {}) { const k = ka(t, t0, t1, o.f ?? 0.3); return k > 0.01 ? pill(lines, 540, (o.y ?? 250) + (1 - eo(clamp((t - t0) / 0.35))) * -40, { a: k, size: o.size ?? 54, bg: o.bg, fg: o.fg }) : ''; }
function tag(txt, x, y, a = 1, o = {}) {
  if (a <= 0.01) return ''; const size = o.size ?? 36, w = tw(txt, size) + 46, h = size + 26;
  return `<g opacity="${f1(a * 100) / 100}"><rect x="${f1(x - w / 2)}" y="${f1(y - h / 2 + 5)}" width="${f1(w)}" height="${h}" rx="${h / 2}" fill="rgba(0,0,0,.28)"/><rect x="${f1(x - w / 2)}" y="${f1(y - h / 2)}" width="${f1(w)}" height="${h}" rx="${h / 2}" fill="${o.bg ?? '#fff'}"/>${T(txt, x, y + size * 0.36, { size, fill: o.fg ?? FOREST })}</g>`;
}
/** label dengan garis penunjuk: kotak di (tx, ty), ujung garis di (ax, ay) pada benda */
function callout(txt, tx, ty, ax, ay, a, o = {}) {
  if (a <= 0.01) return ''; const size = o.size ?? 38, w = tw(txt, size) + 46, h = size + 26, col = o.col ?? GOLD, k = o.k ?? 1;
  const ex = ax < tx ? tx - w / 2 : tx + w / 2, ey = ty;
  const ux = lerp(ex, ax, k), uy = lerp(ey, ay, k);
  return `<g opacity="${f1(a * 100) / 100}"><path d="M${f1(ex)} ${f1(ey)}L${f1(ux)} ${f1(uy)}" stroke="#000" stroke-opacity=".3" stroke-width="9" stroke-linecap="round" transform="translate(0 4)"/><path d="M${f1(ex)} ${f1(ey)}L${f1(ux)} ${f1(uy)}" stroke="${col}" stroke-width="6" stroke-linecap="round"/><circle cx="${f1(ux)}" cy="${f1(uy)}" r="${f1(11 * k)}" fill="${col}" stroke="${INK}" stroke-width="3"/></g>` + tag(txt, tx, ty, a, { size, bg: o.bg, fg: o.fg });
}
function caption(t) {
  if (NOCAP || t >= CUES.t_web) return '';
  const c = CUES.cap.find(([a, b]) => t >= a - 0.04 && t < b); if (!c) return '';
  const a = clamp((t - c[0]) / 0.12), size = 50, w = Math.min(980, tw(c[2], size) + 70);
  return `<g opacity="${f1(a * 100) / 100}">${R(540 - w / 2, 1306, w, 96, 'rgba(8,18,30,.92)', 34)}${T(c[2], 540, 1371, { size, fill: '#fff' })}</g>`;
}
const dashed = (x1, y1, x2, y2, col = GOLD, a = 1, w = 5) => `<path d="M${f1(x1)} ${f1(y1)}L${f1(x2)} ${f1(y2)}" stroke="${col}" stroke-width="${w}" stroke-dasharray="14 12" stroke-linecap="round" opacity="${f1(a * 100) / 100}"/>`;
// ------------------------------------------------------------------ alat bantu
const mod = (a, b) => ((a % b) + b) % b;
const camG = (inner, z, cx, cy, ox = 540, oy = 960) => `<g transform="translate(${f1(ox)} ${f1(oy)}) scale(${f1(z * 1000) / 1000}) translate(${f1(-cx)} ${f1(-cy)})">${inner}</g>`;
const bgNavy = `<defs><linearGradient id="nbg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#12485A"/><stop offset="1" stop-color="#0A2B36"/></linearGradient></defs><rect x="-9000" y="-9000" width="18000" height="18000" fill="url(#nbg)"/><circle cx="90" cy="560" r="220" fill="#134B5C" opacity=".6"/><circle cx="1000" cy="1100" r="260" fill="#134B5C" opacity=".5"/>`;
const bgCream = `<rect x="-9000" y="-9000" width="18000" height="18000" fill="${CREAM}"/><circle cx="110" cy="480" r="190" fill="#EADFC4"/><circle cx="980" cy="1040" r="230" fill="#EADFC4" opacity=".7"/>`;
const op = (a, inner) => `<g opacity="${f1(clamp(a) * 1000) / 1000}">${inner}</g>`;
const armTo = (side, hx, hy, extra = {}) => { const a = { wx: hx, wy: hy, ex: side === 'R' ? Math.max(330, hx + 70) : Math.min(70, hx - 70), ey: hy + 90, finger: 0, fa: -90, front: 1, roll: 0, hold: 0, holdRot: 0, ...extra }; const h = armShape(side, a).hand; a.wx += hx - h[0]; a.wy += hy - h[1]; return a; };
const rk = (st, cx, ty, k, uid) => { const tx = cx - 200 * k; return { svg: `<g transform="translate(${f1(tx)} ${f1(ty)}) scale(${k})">${rakaSvg(st, { bare: true, uid, shadow: false })}</g>`, at: (x, y) => [tx + x * k, ty + y * k], hand: (side) => { const h = armShape(side, st['arm' + side]).hand; return [tx + h[0] * k, ty + h[1] * k]; }, tx, k }; };
const GRID = '#1F5A5E', TRACE = '#7DF0C4';
// ------------------------------------------------------------------ elektroda (PENANGKAP sinyal) dan monitor
function electrode(x, y, r, o = {}) {
  const { s = 1, a = 1, glow = 0 } = o;
  return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${f1(s * 1000) / 1000})" opacity="${f1(a * 100) / 100}">${glow > 0.01 ? `<circle r="${f1(r * (1.25 + 0.3 * glow))}" fill="none" stroke="${H.COL.P}" stroke-width="${f1(r * 0.07)}" opacity="${f1(glow * 100) / 100}"/>` : ''}<circle r="${f1(r + r * 0.05)}" fill="rgba(0,0,0,.16)" transform="translate(${f1(r * 0.05)} ${f1(r * 0.08)})"/><circle r="${r}" fill="#FAFAF5" stroke="#C5CED2" stroke-width="${f1(Math.max(2, r * 0.04))}"/><circle r="${f1(r * 0.66)}" fill="#BFE3F0"/><circle r="${f1(r * 0.3)}" fill="#C9D0D6" stroke="#8FA0AA" stroke-width="${f1(Math.max(2, r * 0.05))}"/><circle cx="${f1(-r * 0.07)}" cy="${f1(-r * 0.08)}" r="${f1(r * 0.1)}" fill="#fff" opacity=".85"/></g>`;
}
const cable = (x1, y1, x2, y2, sag, w = 7, col = '#2E3E48') => `<path d="M${f1(x1)} ${f1(y1)}C${f1(x1)} ${f1(y1 + sag)} ${f1(x2 - sag * 0.6)} ${f1(y2 + sag * 0.3)} ${f1(x2)} ${f1(y2)}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>`;
/** monitor: layar menggulung garis EKG normal. mulai = detik mulai terhubung (garis datar sebelum itu) */
function monitor(x, y, w, h, t, o = {}) {
  const { mulai = 0, span = 3.0, lw = 5, marks = null } = o, sx = x + 22, sy = y + 22, sw = w - 44, sh = h - 44, yb = sy + sh * 0.62, amp = sh * 0.5, sp = sw / span;
  let s = `<rect x="${f1(x + 8)}" y="${f1(y + 12)}" width="${w}" height="${h}" rx="30" fill="rgba(0,0,0,.25)"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="30" fill="#2E3E48" stroke="${INK}" stroke-width="5"/><rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" rx="14" fill="#0A2330"/>`;
  s += `<clipPath id="mk${Math.round(x)}"><rect x="${sx}" y="${sy}" width="${sw}" height="${sh}" rx="14"/></clipPath><g clip-path="url(#mk${Math.round(x)})">`;
  for (let gx = 0; gx <= sw; gx += sw / 15) s += `<path d="M${f1(sx + gx)} ${sy}V${sy + sh}" stroke="${GRID}" stroke-width="${Math.abs(gx % (sw / 3)) < 1 ? 2.5 : 1.2}"/>`;
  for (let gy = 0; gy <= sh; gy += sh / 8) s += `<path d="M${sx} ${f1(sy + gy)}H${sx + sw}" stroke="${GRID}" stroke-width="1.2"/>`;
  let d = ''; const n = Math.round(sw / 4);
  for (let i = 0; i <= n; i++) { const xx = sx + sw * i / n, tt = t - (sx + sw - xx) / sp, v = tt < mulai ? 0 : H.ecgAt(tt, mulai); d += `${i ? 'L' : 'M'}${f1(xx)} ${f1(yb - v * amp)}`; }
  s += `<path d="${d}" fill="none" stroke="${TRACE}" stroke-width="${lw}" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${f1(sx + sw)}" cy="${f1(yb - (t < mulai ? 0 : H.ecgAt(t, mulai)) * amp)}" r="${lw * 1.5}" fill="#fff"/></g>`;
  return { svg: s, geom: { sx, sw, yb, amp, sp, sy, sh } };
}
// ------------------------------------------------------------------ A. hook: elektroda ditempel, monitor langsung menggambar (0 - 4,72)
const RA = { cx: 400, ty: 400, k: 1.55 };
const ELE = [[130, 446], [176, 530], [266, 530]];
const MON = { x: 650, y: 860, w: 400, h: 300 };
function sceneA(t, out) {
  const press = seg(t, 0.0, 0.5), arm = t < 0.9 ? armTo('L', 130, 440) : armTo('L', lerp(130, 86, eio(seg(t, 0.9, 1.7))), lerp(440, 552, eio(seg(t, 0.9, 1.7))));
  const st = rIdle(raka(t < 2.4 ? 'netral' : 'berpikir', 'netral', { armL: arm, armR: armTo('R', 314, 552), yaw: 0.25, gazeX: 0.5, gazeY: 0.4, tilt: 3 }), t);
  const r = rk(st, RA.cx, RA.ty, RA.k, 'rA'), mon = monitor(MON.x, MON.y, MON.w, MON.h, t, { mulai: 0.45 });
  let w = bgCream + r.svg;
  const E = ELE.map(([x, y]) => r.at(x, y)), port = [MON.x + 120, MON.y + MON.h];
  E.forEach((e, i) => { w += cable(e[0], e[1], MON.x + 90 + i * 70, MON.y + MON.h, 90 + i * 20, 7); });
  w += `<rect x="${MON.x + 60}" y="${MON.y + MON.h - 4}" width="220" height="26" rx="10" fill="#2E3E48"/>` + mon.svg;
  E.forEach((e, i) => { const pp = pop(t, 0.12 + i * 0.28, 0.35); if (pp > 0.01) w += electrode(e[0], e[1], 36, { s: Math.min(1.08, pp) * (i === 0 ? 1 - 0.08 * Math.sin(Math.PI * press) : 1), a: clamp(pp) }); });
  // tangan menekan elektroda pertama (hanya awal)
  const hnd = r.hand('L'); if (t < 0.95) w += `<circle cx="${f1(hnd[0])}" cy="${f1(hnd[1])}" r="${f1(22 * RA.k)}" fill="#F7BC8E" opacity="${f1(1 - seg(t, 0.7, 0.95))}"/>`;
  const cam = track([[0, E[0][0] + 40, E[0][1] + 30, Math.log(2.0)], [1.5, 520, 900, Math.log(1.5)], [2.9, MON.x + 200, MON.y + 150, Math.log(1.7)], [4.2, 540, 820, Math.log(1.0)], [9, 540, 820, Math.log(1.0)]])(t);
  out.A += camG(w, Math.exp(cam[2]), cam[0], cam[1], 540, lerp(900, 960, seg(t, 3, 4.2)));
  out.U += chip(['KOK STIKER BISA', 'BIKIN GARIS INI?'], t, 0.1, 4.72, { size: 58, bg: '#D9382F', fg: '#fff' });
  out.U += tag('elektroda', 280, 1180, ka(t, 2.0, 4.6, 0.3) * 0, { size: 34 });
}
// ------------------------------------------------------------------ B. elektroda = PENANGKAP sinyal (4,72 - 9,0)
function sceneB(t, out) {
  let w = `<rect x="-9000" y="-9000" width="18000" height="18000" fill="${K_SKIN}"/>`;
  for (let i = 0; i < 70; i++) w += `<circle cx="${f1(rndf(i) * 1080)}" cy="${f1(380 + rndf(i + 90) * 900)}" r="${f1(3 + rndf(i + 9) * 4)}" fill="#EAA676" opacity=".5"/>`;
  const ex = 540, ey = 800, zb = 1 + 0.03 * Math.sin(t * 1.2);
  // cincin sinyal mengecil menuju elektroda (tangkap), bukan keluar
  for (let i = 0; i < 4; i++) { const u = mod(t * 0.55 + i / 4, 1), rr = lerp(520, 200, u); w += `<circle cx="${ex}" cy="${ey}" r="${f1(rr)}" fill="none" stroke="${H.COL.P}" stroke-width="10" stroke-dasharray="26 22" opacity="${f1(Math.sin(u * Math.PI) * 0.8 * ka(t, 5.0, 8.9, 0.4) * 100) / 100}"/>`; }
  w += `<path d="M${ex + 140} ${ey - 140}C${ex + 300} ${ey - 300} ${ex + 330} ${ey - 520} ${ex + 460} ${ey - 640}" fill="none" stroke="#2E3E48" stroke-width="16" stroke-linecap="round"/>`;
  w += electrode(ex, ey, 210, { s: zb * pop(t, 4.8, 0.45) });
  out.A += w;
  let u = chip(['ELEKTRODA = PENANGKAP', 'SINYAL LISTRIK'], t, 4.85, 9.0, { size: 54 });
  u += callout('elektroda', 190, 560, ex - 120, ey - 120, ka(t, W.elektroda - 0.4, 9.0, 0.25), { size: 42, k: eo(clamp((t - W.elektroda + 0.4) / 0.4)) });
  u += tag('menangkap perubahan listrik dari kulit', 540, 1130, ka(t, 7.0, 9.0, 0.3), { size: 36, bg: GOLD, fg: INK });
  // tidak menyetrum: petir dicoret
  const ks = ka(t, W.menyetrum - 0.5, 9.0, 0.3);
  if (ks > 0.01) u += `<g opacity="${f1(ks * 100) / 100}" transform="translate(850 430)"><circle r="104" fill="#fff" stroke="#D9382F" stroke-width="12"/><path d="M12 -64L-34 8H-4L-18 64L36 -14H6Z" fill="${GOLD}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/><path d="M-76 -76L76 76" stroke="#D9382F" stroke-width="16" stroke-linecap="round"/></g>${tag('tidak menyetrum tubuh', 810, 590, ks, { size: 36, bg: '#FFE3DC', fg: '#8A2F22' })}`;
  out.U += u;
}
const K_SKIN = '#F7BC8E';
// ------------------------------------------------------------------ C. penampang dada: jantung -> kulit -> tiga elektroda (9,0 - 13,8)
const HC = { x: 540, y: 640, sc: 0.88, rot: -10 };
function sceneC(t, out) {
  const ph = mod((t - 9.0) / 1.3, 1), sF = 16 + ph * 18, k = (x) => x;
  const zoom = eio(seg(t, 11.6, 13.5)), z = lerp(0.52, 1.0, zoom), cy = lerp(130, HC.y, zoom);
  let w = bgNavy;
  const top = -440;
  // lapisan: epidermis, dermis, lemak, otot+tulang rusuk, rongga dada
  w += `<rect x="-300" y="${top}" width="1680" height="40" fill="#F7BC8E"/><rect x="-300" y="${top + 40}" width="1680" height="80" fill="#EFA982"/><rect x="-300" y="${top + 120}" width="1680" height="150" fill="#F6D88E"/><rect x="-300" y="${top + 270}" width="1680" height="120" fill="#A8454E"/>`;
  for (let i = 0; i < 5; i++) w += `<ellipse cx="${60 + i * 240}" cy="${top + 330}" rx="76" ry="30" fill="#F4EBD8"/>`;
  w += `<rect x="-300" y="${top + 390}" width="1680" height="1600" fill="#E6B9B6"/>`;
  // elektroda tampak samping di atas kulit + kabel
  const exs = [190, 540, 890];
  exs.forEach((x, i) => { const hit = clamp(1 - Math.abs(t - (9.55 + i * 0.12 + Math.floor((t - 9.0) / 1.3) * 1.3)) / 0.35); w += `<path d="M${x} ${top - 40}C${x} ${top - 160} ${x + 40} ${top - 240} ${x + 80} ${top - 330}" fill="none" stroke="#2E3E48" stroke-width="12" stroke-linecap="round"/><rect x="${x - 70}" y="${top - 26}" width="140" height="28" rx="10" fill="#FAFAF5" stroke="#C5CED2" stroke-width="4"/><rect x="${x - 52}" y="${top - 2}" width="104" height="14" rx="5" fill="#BFE3F0"/><rect x="${x - 18}" y="${top - 44}" width="36" height="20" rx="8" fill="#C9D0D6" stroke="#8FA0AA" stroke-width="3"/>`; if (hit > 0.02) w += `<ellipse cx="${x}" cy="${top}" rx="${f1(90 + 40 * hit)}" ry="${f1(22 + 12 * hit)}" fill="none" stroke="${H.COL.P}" stroke-width="8" opacity="${f1(hit * 100) / 100}"/>`; });
  // cincin menjalar dari jantung ke kulit (setiap QRS), sampai elektroda -> elektroda menyala
  const tQ = 9.0 + (((H.EV.qrs0 + 0.3) - 16) / 18) * 1.3;
  for (let b = -1; b < 12; b++) { const t0 = tQ + b * 1.3, u = (t - t0) / 0.8; if (u > 0 && u < 1) w += `<ellipse cx="${HC.x}" cy="${HC.y}" rx="${f1(120 + u * 760)}" ry="${f1(100 + u * 780)}" fill="none" stroke="${H.COL.QRS}" stroke-width="${f1(14 - 8 * u)}" stroke-dasharray="22 18" opacity="${f1(Math.sin(u * Math.PI) * 0.8 * 100) / 100}"/>`; }
  w += H.heartSvg(sF, { uid: 'c', x: HC.x, y: HC.y, sc: HC.sc, rot: HC.rot, nodes: false });
  out.A += camG(w, z, 540, cy, 540, lerp(900, HC.y, zoom));
  // minikartu tegangan antar elektroda (garis hidup)
  const kc = ka(t, 9.1, 12.9, 0.3);
  let u = chip(['ELEKTRODA MENANGKAP', 'PERUBAHAN LISTRIK'], t, 9.1, 13.2, { size: 50 });
  if (kc > 0.01) { const x0 = 110, w0 = 860, y0 = 440; let d = ''; for (let i = 0; i <= 140; i++) { const tt = t - (140 - i) / 140 * 3.0; d += `${i ? 'L' : 'M'}${f1(x0 + w0 * i / 140)} ${f1(y0 + 40 - H.ecgAt(tt, 0.2) * 70)}`; } u += `<g opacity="${f1(kc * 100) / 100}"><rect x="90" y="${y0 - 50}" width="900" height="150" rx="30" fill="rgba(10,35,48,.92)" stroke="${TRACE}" stroke-width="4"/><path d="${d}" fill="none" stroke="${TRACE}" stroke-width="5" stroke-linejoin="round"/>${T('tegangan antar elektroda berubah', 540, y0 + 140, { size: 30, fill: '#fff' })}</g>`; }
  u += tag('kulit', 120, 330, ka(t, 9.4, 11.8, 0.3) * (1 - zoom) * 0, { size: 30 });
  u += tag('muncul saat jantung bekerja', 540, 1230, ka(t, W.jantung - 0.5, 13.5, 0.3), { size: 38, bg: GOLD, fg: INK });
  out.U += op(1 - seg(t, 13.1, 13.6), u);
}
// ------------------------------------------------------------------ D. mekanisme: jantung (atas) dan garis EKG (bawah) berdampingan (13,4 - 38,7)
const HP_ = { x: 540, y: 640, sc: 0.88, rot: -10 };
const hp = (x, y) => H.heartPt(x, y, HP_);
const PX = { x0: 40, y0: 960, w: 1000, h: 330, a0: 80, a1: 1000 };
const xOfS = (s) => PX.a0 + (PX.a1 - PX.a0) * (s - H.EV.trace0) / (H.EV.trace1 - H.EV.trace0);
function ecgPanelSlow(t, s, replayPtr) {
  const { x0, y0, w, h } = PX, yb = y0 + h * 0.72, amp = h * 0.42;
  let o = `<rect x="${x0 + 8}" y="${y0 + 12}" width="${w}" height="${h}" rx="34" fill="rgba(0,0,0,.3)"/><rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="34" fill="#0A2330" stroke="#CDEFF3" stroke-width="4"/>`;
  for (let gx = 0; gx <= w - 40; gx += 25) o += `<path d="M${x0 + 20 + gx} ${y0 + 16}V${y0 + h - 16}" stroke="${GRID}" stroke-width="${gx % 125 === 0 ? 2.4 : 1}"/>`;
  for (let gy = 0; gy <= h - 32; gy += 25) o += `<path d="M${x0 + 20} ${y0 + 16 + gy}H${x0 + w - 20}" stroke="${GRID}" stroke-width="${gy % 125 === 0 ? 2.4 : 1}"/>`;
  o += `<path d="M${PX.a0} ${yb}H${PX.a1 + 10}" stroke="#2D6F70" stroke-width="2.5" stroke-dasharray="4 8"/>`;
  const sEnd = Math.min(s, H.EV.trace1);
  // garis dasar sampai penunjuk, lalu potongan berwarna (P, QRS, T) dengan tebal lebih besar
  const seg_ = (a, b, col, lw) => { if (b <= a) return ''; let d = ''; const n = Math.max(2, Math.round((b - a) / 0.03)); for (let i = 0; i <= n; i++) { const ss = a + (b - a) * i / n; d += `${i ? 'L' : 'M'}${f1(xOfS(ss))} ${f1(yb - H.ecgSlow(ss) * amp)}`; } return `<path d="${d}" fill="none" stroke="${col}" stroke-width="${lw}" stroke-linejoin="round" stroke-linecap="round"/>`; };
  o += seg_(H.EV.trace0, sEnd, TRACE, 5);
  const ints = [[H.EV.atria0 - 0.05, 20.95, H.COL.P], [H.EV.qrs0 - 0.05, 25.95, H.COL.QRS], [H.EV.t0, H.EV.t1 + 0.1, H.COL.T]];
  for (const [a, b, col] of ints) if (sEnd > a) o += seg_(a, Math.min(b, sEnd), col, 9);
  const cur = replayPtr ?? sEnd, cy = yb - H.ecgSlow(cur) * amp;
  o += `<circle cx="${f1(xOfS(cur))}" cy="${f1(cy)}" r="13" fill="#fff" stroke="${H.segCol(cur) || TRACE}" stroke-width="6"/>`;
  if (replayPtr !== undefined) o += `<path d="M${f1(xOfS(cur))} ${y0 + 20}V${y0 + h - 20}" stroke="#fff" stroke-width="3" stroke-dasharray="8 8" opacity=".8"/>`;
  const lab = (txt, s0, col, ya, o_ = 1) => `<g opacity="${f1(o_ * 100) / 100}">${R(xOfS(s0) - tw(txt, 40) / 2 - 18, ya - 42, tw(txt, 40) + 36, 62, col, 31)}${T(txt, xOfS(s0), ya + 4, { size: 40, fill: INK })}</g>`;
  const rp = replayPtr !== undefined;
  o += lab('P', 19.9, H.COL.P, yb - 0.24 * amp - 70, rp ? clamp(1 - Math.abs(cur - 19.9) / 3) * 0.6 + 0.4 : clamp((s - 20.0) / 0.3));
  o += lab('QRS', 25.2, H.COL.QRS, yb - amp - 58, rp ? clamp(1 - Math.abs(cur - 25.2) / 3) * 0.6 + 0.4 : clamp((s - 25.4) / 0.3));
  o += lab('T', 32.15, H.COL.T, yb - 0.36 * amp - 70, rp ? clamp(1 - Math.abs(cur - 32.15) / 3) * 0.6 + 0.4 : clamp((s - 32.6) / 0.3));
  if (t >= 37.2 && t < 38.7) { const u = (t - 37.2) / 1.2, xg = lerp(PX.a0, PX.a1, u), d0 = Math.max(H.EV.trace0, 16 + (xg - PX.a0) / (PX.a1 - PX.a0) * 18.3 - 1.4), d1 = Math.min(H.EV.trace1, 16 + (xg - PX.a0) / (PX.a1 - PX.a0) * 18.3 + 0.2); if (d1 > d0) { let d = ''; for (let i = 0; i <= 24; i++) { const ss = d0 + (d1 - d0) * i / 24; d += `${i ? 'L' : 'M'}${f1(xOfS(ss))} ${f1(yb - H.ecgSlow(ss) * amp)}`; } o += `<path d="${d}" fill="none" stroke="#fff" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" opacity=".85"/>`; } }
  return o;
}
function sceneD(t, out) {
  const rep = t >= 33.7 && t < 37.3, s = t < 33.7 ? t : rep ? lerp(18.4, 34.3, (t - 33.7) / 3.6) : 34.3;
  out.A += bgNavy;
  const k = pop(t, 13.3, 0.5), pk = eo(seg(t, 13.9, 14.7));
  // kartu jantung
  let w = `<rect x="48" y="347" width="1000" height="580" rx="44" fill="rgba(0,0,0,.28)"/><rect x="40" y="335" width="1000" height="580" rx="44" fill="${CREAM}"/><circle cx="130" cy="420" r="110" fill="#EADFC4"/><circle cx="980" cy="840" r="130" fill="#EADFC4" opacity=".8"/>`;
  w += H.heartSvg(s, { uid: 'd', x: HP_.x, y: HP_.y, sc: HP_.sc, rot: HP_.rot });
  out.A += `<g opacity="${f1(clamp(k) * 100) / 100}">${w}</g>`;
  out.A += `<g transform="translate(0 ${f1((1 - pk) * 420)})" opacity="${f1(pk * 100) / 100}">${ecgPanelSlow(t, s, rep ? s : undefined)}</g>`;
  let u = '';
  const lb = (txt, x, y, ax, ay, a0, a1, col) => callout(txt, x, y, ax, ay, ka(t, a0, a1, 0.25), { size: 38, bg: '#0F3A47', fg: '#fff', col: col ?? GOLD, k: eo(clamp((t - a0) / 0.4)) });
  const sn = hp(H.ptSA[0], H.ptSA[1]), av = hp(H.ptAV[0], H.ptAV[1]), at = hp(430, 170), vt = hp(190, 430), lv = hp(420, 420);
  if (t < 33.6) {
    u += lb('nodus sinus', 200, 520, sn[0] - 6, sn[1] + 6, W.sinus - 0.35, 18.2);
    u += lb('serambi', 880, 470, at[0], at[1], W.serambi - 0.2, 21.0, H.COL.P);
    u += lb('nodus AV', 880, 600, av[0], av[1], W.nodusAV - 0.45, 23.8);
    u += lb('bilik', 170, 800, vt[0], vt[1], W.bilik - 0.9, 26.4, H.COL.QRS);
    u += tag('bilik berkontraksi', 540, 880, ka(t, W.berkontraksi - 0.4, 30.0, 0.3), { size: 38, bg: '#FFE3DC', fg: '#8A2F22' });
    u += tag('bilik memulihkan keadaan listriknya', 540, 880, ka(t, W.memulihkan - 0.3, 33.7, 0.3), { size: 36, bg: '#CFF5E6', fg: '#0A4A3A' });
  }
  u += chip(['P — AKTIVITAS LISTRIK SERAMBI'], t, 18.6, 21.6, { size: 46, bg: '#FFF4B8', fg: INK });
  u += chip(['QRS — AKTIVITAS LISTRIK BILIK'], t, 24.4, 29.6, { size: 46, bg: '#FFD9BC', fg: INK });
  u += chip(['T — PEMULIHAN LISTRIK BILIK'], t, 30.2, 33.8, { size: 46, bg: '#CFF5E6', fg: INK });
  u += chip(['ULANGI: P → QRS → T'], t, 33.5, 36.9, { size: 48 });
  u += chip(['GARIS = JEJAK LISTRIK'], t, 37.0, 38.7, { size: 48 });
  u += chip(['LIHAT DARI DALAM'], t, 13.6, 14.9, { size: 50 }) + chip(['SINYAL MULAI DI NODUS SINUS'], t, 15.0, 18.5, { size: 44 });
  u += tag('listrik mendahului kontraksi', 540, 930, ka(t, 26.0, 28.3, 0.3) * 0, { size: 30 });
  out.U += u;
}
// ------------------------------------------------------------------ E. keluar ke Raka dan monitor: siklus berulang, laju, irama (38,5 - 45,4)
function sceneE(t, out) {
  const st = rIdle(raka(t < 42 ? 'lega' : 'senang', 'netral', { armL: armTo('L', 92, 552), armR: armTo('R', 314, 552), yaw: 0.3, gazeX: 0.7, gazeY: 0.3, tilt: -3 }), t);
  const r = rk(st, 360, 520, 1.45, 'rE'), M = { x: 560, y: 760, w: 480, h: 360 }, mon = monitor(M.x, M.y, M.w, M.h, t, { mulai: -100, span: 3.4 });
  let w = bgCream + r.svg;
  const E = [[130, 446], [176, 530], [266, 530]].map(([x, y]) => r.at(x, y));
  E.forEach((e, i) => { w += cable(e[0], e[1], M.x + 90 + i * 70, M.y + M.h, 90 + i * 20, 7); });
  w += `<rect x="${M.x + 60}" y="${M.y + M.h - 4}" width="260" height="26" rx="10" fill="#2E3E48"/>` + mon.svg;
  E.forEach((e) => { w += electrode(e[0], e[1], 33); });
  // penanda laju (jarak R-R) dan irama (selang sama)
  const g = mon.geom, tr = (tt) => g.sx + g.sw - (t - tt) * g.sp;
  const nb = Math.floor(t / H.BEAT); let rpk = []; for (let b = nb - 5; b <= nb; b++) { const tt = b * H.BEAT + 0.272 * H.BEAT / 0.86 * 0.86; const x = tr(b * H.BEAT + 0.272); if (x > g.sx + 30 && x < g.sx + g.sw - 20) rpk.push(x); }
  const kl = ka(t, W.laju - 0.3, 44.9, 0.3), ki = ka(t, W.irama - 0.3, 44.9, 0.3);
  let ov = '';
  if (kl > 0.01 && rpk.length > 1) { rpk.forEach((x, i) => { ov += `<path d="M${f1(x)} ${g.yb - g.amp - 18}V${g.yb + 40}" stroke="${H.COL.QRS}" stroke-width="3.5" stroke-dasharray="6 6" opacity="${f1(kl * 100) / 100}"/>`; if (i) ov += `<g opacity="${f1(kl * 100) / 100}"><path d="M${f1(rpk[i - 1] + 6)} ${g.sy + 24}H${f1(x - 6)}M${f1(rpk[i - 1] + 18)} ${g.sy + 12}L${f1(rpk[i - 1] + 6)} ${g.sy + 24}L${f1(rpk[i - 1] + 18)} ${g.sy + 36}M${f1(x - 18)} ${g.sy + 12}L${f1(x - 6)} ${g.sy + 24}L${f1(x - 18)} ${g.sy + 36}" stroke="${GOLD}" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>`; }); }
  const cz = lerp(0.55, 1.0, eo(seg(t, 38.5, 39.7)));
  out.A += op(seg(t, 38.5, 39.3), camG(w + ov, cz, 540, 820, 540, 900));
  let u = chip(['EKG MEREKAM', 'AKTIVITAS LISTRIK'], t, 39.2, 45.4, { size: 56, bg: '#fff' });
  u += tag('laju: berapa kali per menit', 800, 1215, kl, { size: 36, bg: '#FFF4B8', fg: INK }) + tag('irama: jarak antar-denyut teratur', 780, 1285, ki, { size: 36, bg: '#CFF5E6', fg: INK });
  u += tag('garis contoh, bukan diagnosis', 790, 700, ka(t, 39.5, 45.3, 0.3), { size: 30, bg: 'rgba(8,24,36,.92)', fg: '#fff' });
  u += tag('dibaca bersama kondisi pasien', 330, 480, ka(t, W.kondisi - 0.4, 45.0, 0.3), { size: 34 });
  out.U += op(seg(t, 38.6, 39.4), u);
}
// ------------------------------------------------------------------ outro: rekaman asli (Atlas 3D, Live 4D Lab, materi, latihan soal, Simulasi Dokter) + suara outro BARU
export const OUTRO_FRAMES = 432;
const RECT_A = { x: 70, y: 340, w: 940, h: 1156 }, RECT_B = { x: 280, y: 800, w: 520, h: 639 };
const O0 = CUES.t_web, MA = CUES.t_master - CUES.t_web;
function outroState(t) {
  const to = t - O0, kk = seg(to, 9.0, 9.75, eio);
  return { to, rect: { x: lerp(RECT_A.x, RECT_B.x, kk), y: lerp(RECT_A.y, RECT_B.y, kk), w: lerp(RECT_A.w, RECT_B.w, kk), h: lerp(RECT_A.h, RECT_B.h, kk) }, frame: clamp(Math.round(to * 30), 0, OUTRO_FRAMES - 1), cream: kk, kk };
}
function wrapText(s, size, maxW) { const words = s.split(' '), lines = []; let cur = ''; for (const w of words) { const t = cur ? cur + ' ' + w : w; if (cur && tw(t, size) > maxW) { lines.push(cur); cur = w; } else cur = t; } if (cur) lines.push(cur); return lines; }
function outroUI(t) {
  const { to, rect, cream, kk } = outroState(t), a = seg(to, 0, 0.35);
  const bg = `<g opacity="${f1(a * 100) / 100}">${R(-10, -10, 1100, 1940, '#0B2F38')}</g><g opacity="${f1(cream * 100) / 100}">${R(-10, -10, 1100, 1940, '#F7F2E4')}<circle cx="0" cy="1500" r="300" fill="#EAF3E0"/><circle cx="1040" cy="260" r="260" fill="#EAF3E0"/></g>`;
  let u = `<g opacity="${f1(a * 100) / 100}"><rect x="${f1(rect.x - 8)}" y="${f1(rect.y - 8)}" width="${f1(rect.w + 16)}" height="${f1(rect.h + 16)}" rx="${f1(lerp(28, 22, kk))}" fill="none" stroke="${cream > 0.5 ? FOREST : GOLD}" stroke-width="8"/></g>`;
  const lab = [[0.15, 2.95, 'ATLAS 3D'], [3.0, 5.3, 'LIVE 4D LAB'], [5.35, 6.9, 'MATERI PER BAB'], [6.9, 8.3, 'LATIHAN SOAL'], [8.3, 9.3, 'SIMULASI DOKTER']];
  for (const [a0, a1, tx] of lab) { const k = ka(to, a0, a1, 0.2); if (k > 0.01) u += pill([tx], 540, 255 + (1 - eo(clamp((to - a0) / 0.3))) * -40, { a: k, size: 56, bg: '#fff' }); }
  const kd = ka(to, 3.1, 5.3, 0.25); if (kd > 0.01) u += tag('Simulasi edukatif, bukan alat diagnosis', 540, 352, kd, { size: 34, bg: GOLD, fg: INK });
  const ke = seg(to, 9.35, 9.95, eo);
  if (ke > 0.01) u += `<g opacity="${f1(ke * 100) / 100}" transform="translate(0 ${f1((1 - ke) * -30)})"><image href="logo-full.webp" x="170" y="290" width="740" height="${f1(740 * 160 / 794)}" preserveAspectRatio="xMidYMid meet"/>${T('BELAJAR FK GRATIS', 540, 520, { size: 60, fill: FOREST })}${R(250, 590, 580, 128, FOREST, 64)}${T('medcoel.com', 540, 680, { size: 82, fill: GOLD })}</g>`;
  for (const [a0, a1, tx] of CUES.cap.filter((c) => c[0] >= O0 - 0.01)) { const s0 = a0 - O0, s1 = a1 - O0, k = ka(to, s0, s1, 0.12); if (k > 0.01 && (to < 9.4 || s0 > 9)) { const ls = wrapText(tx, 48, 820), y = s0 > 9 ? 1470 : 1330, h = ls.length * 58 + 30; u += `<g opacity="${f1(k * 100) / 100}">${R(100, y + 6, 880, h, 'rgba(0,0,0,.25)', 30)}${R(100, y, 880, h, 'rgba(8,16,28,.92)', 30)}${ls.map((l, i) => T(l, 540, y + 14 + 42 + i * 58, { size: 48, fill: '#fff' })).join('')}</g>`; } }
  return { bg, u };
}
// ------------------------------------------------------------------ penyusun frame
export async function frame(t) {
  const out = { A: '', U: '', web: null };
  out.A += `<rect width="1080" height="1920" fill="${NAVY}"/>`;
  const seq = (t0, t1, fn, fi = 0.3, fo = 0.3) => { if (t < t0 - 0.01 || t >= t1 + 0.01) return; const o = { A: '', U: '' }; fn(t, o); const a = (fi <= 0 ? 1 : clamp((t - t0) / fi)) * clamp((t1 - t) / fo); out.A += op(a, o.A); out.U += op(a, o.U); };
  seq(0, 4.9, sceneA, 0, 0.25); seq(4.6, 9.2, sceneB, 0.25, 0.25); seq(8.9, 13.9, sceneC, 0.25, 0.4); seq(13.2, 38.9, sceneD, 0.3, 0.3); seq(38.5, 45.7, sceneE, 0.3, 0.3);
  if (t < CUES.t_web) out.U += caption(t);
  if (t >= O0 - 0.25) {
    const o = outroState(t), ui = outroUI(t), a = seg(t, O0 - 0.25, O0 + 0.05);
    out.A = `<g opacity="${f1((1 - a) * 1000) / 1000}">${out.A}</g>`; out.U = (t < O0 + 0.05 ? `<g opacity="${f1((1 - a) * 1000) / 1000}">${out.U}</g>` : '') + ui.u;
    out.A = ui.bg + out.A; out.A = `<rect width="1080" height="1920" fill="${TEAL}"/>` + out.A;
    out.web = { frame: o.frame, rect: o.rect, a };
  }
  return out;
}

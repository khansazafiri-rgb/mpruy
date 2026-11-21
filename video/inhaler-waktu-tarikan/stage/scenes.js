// "Kenapa waktu menekan inhaler penting?" — adegan (1080 x 1920, 30 fps). Gaya datar 2D MEDCOEL, Raka kanonik (rakaSvg), alat/saluran napas dari kode.
// Contoh: inhaler dosis terukur TANPA spacer berisi salbutamol. Kode warna tetap: partikel obat = emas, aliran udara = biru muda, otot dinding saluran napas = merah muda tua, reseptor = ungu.
import { f1, clamp, lerp, sm, eo, eio, seg, win, pop, track, pchip, R, C, P, T, G, FONT, tw, pill, rndf, GOLD, FOREST, INK } from './lib.js';
import { raka, rakaSvg, armShape, idle as rIdle } from '../../../brand/characters/raka/raka.js';
const CUES = await (await fetch('../cues.json')).json(); const W = CUES.w;
const NOCAP = new URLSearchParams(location.search).has('nocap');
const CREAM = '#F7F2E4', NAVY = '#0F3A47', TEAL = '#0B2F38', CORAL = '#F2735E', MINT = '#9DE0BD';
const K = { drug: '#FFB020', drugD: '#A86200', air: '#7FD3F0', muscle: '#D96C7A', muscleD: '#A8454F', recep: '#8E6BD6', lumen: '#123D52', tissue: '#F1B3AE', tissueD: '#D98F8F', boot: '#2F80D0', bootD: '#1C5BA0', skin: '#F7BC8E', skinD: '#EAA676' };
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
// ------------------------------------------------------------------ alat bantu umum
const mod = (a, b) => ((a % b) + b) % b;
const camG = (inner, z, cx, cy, ox = 540, oy = 960) => `<g transform="translate(${f1(ox)} ${f1(oy)}) scale(${f1(z * 1000) / 1000}) translate(${f1(-cx)} ${f1(-cy)})">${inner}</g>`;
const bgNavy = `<defs><linearGradient id="nbg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#12485A"/><stop offset="1" stop-color="#0A2B36"/></linearGradient></defs><rect x="-9000" y="-9000" width="18000" height="18000" fill="url(#nbg)"/><circle cx="90" cy="560" r="220" fill="#134B5C" opacity=".6"/><circle cx="1000" cy="1100" r="260" fill="#134B5C" opacity=".5"/>`;
const bgCream = `<rect x="-9000" y="-9000" width="18000" height="18000" fill="${CREAM}"/><circle cx="110" cy="480" r="190" fill="#EADFC4"/><circle cx="980" cy="1040" r="230" fill="#EADFC4" opacity=".7"/>`;
const op = (a, inner) => `<g opacity="${f1(clamp(a) * 1000) / 1000}">${inner}</g>`;
const armTo = (side, hx, hy, extra = {}) => { const a = { wx: hx, wy: hy, ex: side === 'R' ? Math.max(330, hx + 70) : Math.min(70, hx - 70), ey: hy + 90, finger: 0, fa: -90, front: 1, roll: 0, hold: 0, holdRot: 0, ...extra }; const h = armShape(side, a).hand; a.wx += hx - h[0]; a.wy += hy - h[1]; return a; };
const rk = (st, cx, ty, k, uid) => { const tx = cx - 200 * k; return { svg: `<g transform="translate(${f1(tx)} ${f1(ty)}) scale(${k})">${rakaSvg(st, { bare: true, uid, shadow: false })}</g>`, at: (x, y) => [tx + x * k, ty + y * k], hand: (side) => { const h = armShape(side, st['arm' + side]).hand; return [tx + h[0] * k, ty + h[1] * k]; }, tx, ty, k }; };
const dropDot = (x, y, r, o = 1, ring = 0) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r)}" fill="${K.drug}" stroke="${K.drugD}" stroke-width="${f1(Math.max(1.5, r * 0.22))}" opacity="${f1(o * 100) / 100}"/>${ring > 0.01 ? `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(r * 2.2)}" fill="none" stroke="#fff" stroke-width="${f1(r * 0.3)}" opacity="${f1(ring * 100) / 100}"/>` : ''}`;
// ------------------------------------------------------------------ inhaler dosis terukur (tampak luar, ukuran wajar terhadap tangan Raka: tinggi total ±2 diameter telapak)
// koordinat lokal: ujung corong di kiri; kaleng di atas; (0,0) = pusat badan inhaler
function inhalerOut(x, y, s, { press = 0, rot = 0, o = 1 } = {}) {
  const pr = press * 8;
  return `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${rot}) scale(${s})" opacity="${o}"><rect x="-44" y="12" width="30" height="26" rx="10" fill="${K.boot}" stroke="${K.bootD}" stroke-width="3"/>`
    + `<rect x="-14" y="${f1(-48 + pr)}" width="28" height="${f1(52)}" rx="5" fill="#E9EEF1" stroke="#9AA8B0" stroke-width="3"/><rect x="-14" y="${f1(-24 + pr)}" width="28" height="12" fill="${CORAL}"/><rect x="-16" y="${f1(-52 + pr)}" width="32" height="8" rx="4" fill="#C9D3D8" stroke="#9AA8B0" stroke-width="3"/>`
    + `<rect x="-19" y="-6" width="38" height="52" rx="12" fill="${K.boot}" stroke="${K.bootD}" stroke-width="3"/><rect x="-8" y="-6" width="16" height="6" fill="${K.bootD}" opacity=".6"/></g>`;
}
// jari menekan (jari telunjuk dan ibu jari = kapsul kulit, satu telapak = lingkaran rig): dipasang di sisi kanan badan inhaler
function holdFingers(x, y, s, press = 0) {
  const pr = press * 8, hx = 38, hy = 10;
  return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})"><path d="M${hx - 4} ${hy - 8}L${f1(8)} ${f1(-48 + pr - 6)}" stroke="${K.skin}" stroke-width="13" stroke-linecap="round"/><path d="M${hx - 6} ${hy + 8}L16 44" stroke="${K.skin}" stroke-width="13" stroke-linecap="round"/><circle cx="${hx}" cy="${hy}" r="21" fill="${K.skin}" stroke="${K.skinD}" stroke-width="2.5"/><path d="M${hx - 12} ${hy - 6}Q${hx - 4} ${hy + 4} ${hx - 12} ${hy + 14}" fill="none" stroke="${K.skinD}" stroke-width="3" stroke-linecap="round"/></g>`;
}
// kabut semprotan di depan corong: n butir deterministik (waktu lokal u detik sejak semprot)
function mist(x, y, u, o = 1, dir = -1, n = 16, sp = 1) {
  if (u < 0) return '';
  let s = '';
  for (let i = 0; i < n; i++) { const a = (rndf(i + 3) - 0.5) * 1.0, v = (60 + 90 * rndf(i + 9)) * sp, tt = Math.min(u, 1.4), dx = dir * v * (1 - Math.exp(-tt * 3)) * 1.3, dy = Math.tan(a) * Math.abs(dx) * 0.9 + 12 * tt * tt, fade = clamp(1.5 - u * 0.5); s += dropDot(x + dx, y + dy, 5 + 4 * rndf(i + 21), o * fade * 0.95); }
  return s;
}
// ------------------------------------------------------------------ diagram waktu: NAPAS vs SEMPROTAN (dua keadaan jelas: terlalu awal / cocok)
function timingDiagram(t, o) {
  const { w0, ts, tb, y0 = 880, mode = 'awal', a = 1, title = '' } = o, x0 = 40, wd = 1000, hh = 400, X = (tt) => 130 + (tt - w0) * 150, yb = y0 + 170, amp = 110;
  const breath = (tt) => { const u = (tt - tb) / 3.6; return u < 0 || u > 1 ? 0 : Math.sin(Math.PI * u) ** 1.3; };
  let s = `<rect x="${x0 + 8}" y="${y0 + 12}" width="${wd}" height="${hh}" rx="34" fill="rgba(0,0,0,.28)"/><rect x="${x0}" y="${y0}" width="${wd}" height="${hh}" rx="34" fill="#F7F2E4"/>`;
  s += T(title, 540, y0 + 52, { size: 38, fill: mode === 'awal' ? '#B8362E' : '#0A5A44' });
  s += `<path d="M130 ${yb}H${x0 + wd - 30}" stroke="#B9B4A0" stroke-width="3"/>${T('NAPAS', 85, yb - 46, { size: 24, fill: '#2C7DA0' })}${T('masuk', 85, yb - 20, { size: 24, fill: '#2C7DA0', w: 700 })}`;
  let d = ''; const cur = Math.min(t, w0 + 6.4); for (let tt = w0; tt <= cur; tt += 0.04) d += `${tt === w0 ? 'M' : 'L'}${f1(X(tt))} ${f1(yb - breath(tt) * amp)}`;
  if (d) s += `<path d="${d}" fill="none" stroke="#33A9D8" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>`;
  const yS = y0 + 300;
  s += `<path d="M130 ${yS + 60}H${x0 + wd - 30}" stroke="#B9B4A0" stroke-width="3"/>${T('SEMPROT', 80, yS + 20, { size: 24, fill: '#B36B00' })}`;
  if (t >= ts) s += `<path d="M${f1(X(ts))} ${yS + 60}V${yS - 10}" stroke="${K.drug}" stroke-width="14" stroke-linecap="round"/><circle cx="${f1(X(ts))}" cy="${yS - 14}" r="16" fill="${K.drug}" stroke="${K.drugD}" stroke-width="4"/>`;
  if (t >= tb) s += `<path d="M${f1(X(tb))} ${yb + 6}V${yS + 70}" stroke="#33A9D8" stroke-width="3" stroke-dasharray="6 8"/>`;
  if (t >= ts) s += `<path d="M${f1(X(ts))} ${yb + 6}V${yS - 30}" stroke="${K.drugD}" stroke-width="3" stroke-dasharray="6 8" opacity=".6"/>`;
  if (mode === 'awal' && t >= tb) s += `<g><path d="M${f1(X(ts))} ${y0 + 118}H${f1(X(tb))}" stroke="#D9382F" stroke-width="7" stroke-linecap="round"/>${T('jeda: terlalu awal', (X(ts) + X(tb)) / 2, y0 + 102, { size: 28, fill: '#B8362E' })}</g>`;
  if (mode === 'cocok' && t >= tb) s += `<g>${T('bersamaan di awal tarikan', X(tb) + 150, y0 + 108, { size: 28, fill: '#0A5A44' })}<path d="M${f1(X(tb))} ${y0 + 122}V${y0 + 150}" stroke="#00A383" stroke-width="7" stroke-linecap="round"/></g>`;
  if (t >= w0) s += `<path d="M${f1(X(Math.min(t, w0 + 6.4)))} ${y0 + 70}V${y0 + hh - 20}" stroke="#172B38" stroke-width="3" opacity=".55"/>`;
  return op(a, s);
}
// ------------------------------------------------------------------ saluran napas (satu skema: mulut -> tenggorok -> trakea -> percabangan -> paru), partikel obat, aliran udara
const PTS = [[40, 420], [300, 420], [540, 424], [640, 445], [690, 500], [700, 580], [700, 1000]];
const BR = [[[700, 1000], [676, 1070], [620, 1150], [570, 1290]], [[700, 1000], [724, 1070], [780, 1150], [830, 1290]]];
const cum = (pts) => { const c = [0]; for (let i = 1; i < pts.length; i++) c.push(c[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return c; };
const MAIN = { pts: PTS, c: cum(PTS) }, LEFT = { pts: BR[0], c: cum(BR[0]) }, MAINL = MAIN.c[MAIN.c.length - 1];
function onPath(p, a) {
  const pts = p.pts, c = p.c; a = clamp(a, 0, c[c.length - 1] - 0.001); let i = 1; while (c[i] < a) i++;
  const u = (a - c[i - 1]) / (c[i] - c[i - 1]), x = lerp(pts[i - 1][0], pts[i][0], u), y = lerp(pts[i - 1][1], pts[i][1], u), dx = pts[i][0] - pts[i - 1][0], dy = pts[i][1] - pts[i - 1][1], L = Math.hypot(dx, dy) || 1;
  return { x, y, nx: -dy / L, ny: dx / L };
}
const halfW = (a) => a < 560 ? 52 : a < 760 ? lerp(52, 38, (a - 560) / 200) : 38;
function posAlong(a, lane) {
  if (a <= MAINL) { const q = onPath(MAIN, a), h = halfW(a) * 0.82; return [q.x + q.nx * lane * h, q.y + q.ny * lane * h]; }
  const q = onPath(LEFT, a - MAINL), h = 24 * 0.8; return [q.x + q.nx * lane * h, q.y + q.ny * lane * h];
}
const NP = 20;
/** keadaan partikel i pada waktu t. mode 'awal': semprot sebelum tarikan; 'cocok': bersamaan. */
function particle(i, mode, t, ts, tb) {
  const lane = (rndf(i * 2 + 1) - 0.5) * 1.7, kf = 0.88 + 0.24 * rndf(i + 40), lag = 0.25 * rndf(i + 70), tau = t - ts - lag;
  if (tau < 0) return null;
  const burst = 150 * (1 - Math.exp(-tau / 0.35)) * (0.55 + 0.6 * rndf(i + 5));
  const carried = mode === 'cocok' ? true : i % 5 === 0;               // 'awal': hanya sebagian kecil ikut aliran
  const stuckAt = mode === 'cocok' ? (i % 4 === 1 ? 430 + 60 * rndf(i) : 1e9) : 1e9;
  const tf = Math.max(0, t - tb - lag);                                 // lama sejak tarikan napas dimulai
  let a = burst + (carried ? 95 * kf * (mode === 'cocok' ? Math.max(0, t - ts - lag) : tf) : 0);
  let ln = lane, stuck = false;
  if (mode === 'awal' && !carried) { const sett = clamp((tau - 0.6) / 1.1); ln = lerp(lane, lane > 0 ? 0.98 : -0.98, sett); stuck = sett >= 1; }
  if (a >= stuckAt) { a = stuckAt; ln = lane > 0 ? 0.98 : -0.98; stuck = true; }
  const [x, y] = posAlong(a, ln);
  return { x, y, stuck, a };
}
// ------------------------------------------------------------------ A. hook: Raka menekan inhaler TERLALU AWAL (0 - 6,9)
const RAK = { cx: 470, ty: 360, k: 1.75 };
const INH = { x: 208, y: 299 };                    // pusat badan inhaler dalam koordinat Raka (corong menyentuh bibir)
const TS_A = -0.15, TB_A = 1.6;                       // semprot (t = 0,2) mendahului tarikan napas (t = 1,6)
function sceneA(t, out) {
  const press = 1 - seg(t, 0.3, 0.75), conf = seg(t, 1.8, 2.5);
  const hand = [INH.x + 38, INH.y + 10];
  const st0 = raka(t < 1.6 ? 'netral' : 'bingung', 'netral', { armR: armTo('R', hand[0], hand[1]), armL: armTo('L', 92, 548), yaw: 0.0, gazeY: 0.3, tilt: -4 * conf, browL: { y: -4 * conf, rot: 4 }, browR: { y: -4 * conf, rot: -4 }, mouth: { w: 12, up: 4, lo: 4 } });
  const r = rk(rIdle(st0, t), RAK.cx, RAK.ty, RAK.k, 'rA');
  let w = bgCream + r.svg;
  const ip = r.at(INH.x, INH.y), k = RAK.k;
  w += inhalerOut(ip[0], ip[1], k, { press }) + holdFingers(ip[0], ip[1], k, press);
  // semprotan terlihat bergerak sebelum Raka menarik napas
  const tipx = ip[0] - 44 * k, tipy = ip[1] + 26 * k, u = t - TS_A;
  w += mist(tipx, tipy, u, 1, -1, 18, 1.2 * k / 1.2);
  const zk = track([[0, 540, 690, Math.log(1.0)], [2.0, 540, 690, Math.log(1.0)], [3.0, tipx - 20, tipy - 20, Math.log(2.1)], [5.6, tipx - 20, tipy - 20, Math.log(2.1)], [6.8, tipx - 20, tipy - 20, Math.log(2.1)]])(t);
  out.A += camG(w, Math.exp(zk[2]), zk[0], zk[1], 540, lerp(780, 860, sm(seg(t, 2, 3))));
  let u2 = chip(['KOK OBATNYA TIDAK', 'BANYAK SAMPAI?'], t, 0.1, 6.9, { size: 58, bg: '#D9382F', fg: '#fff' });
  out.U += u2 + timingDiagram(t, { w0: -0.3, ts: TS_A, tb: TB_A, y0: 900, mode: 'awal', a: seg(t, 1.0, 1.5) * (1 - seg(t, 6.3, 6.8)), title: 'SEMPROT DULU, BARU TARIK NAPAS' }).replace(/y0/g, 'y0');
}
// ------------------------------------------------------------------ shot makro TERPISAH: jari menekan tabung (6,7 - 8,7)
function sceneMacro(t, out) {
  const press = eio(seg(t, 7.35, 8.0)), s = 5.4, cx = 470, cy = 900, pr = press * 8 * s;
  let w = `<rect x="-9000" y="-9000" width="18000" height="18000" fill="#E9F3F2"/><circle cx="880" cy="420" r="280" fill="#D5E8E6"/>`;
  // badan inhaler + kaleng (besar); tangan hanya jari telunjuk dan ibu jari (hasil makro, bukan menempel pada Raka kecil)
  w += `<g transform="translate(${cx} ${cy}) scale(${s})"><rect x="-44" y="12" width="30" height="26" rx="10" fill="${K.boot}" stroke="${K.bootD}" stroke-width="2.2"/><rect x="-19" y="-6" width="38" height="52" rx="12" fill="${K.boot}" stroke="${K.bootD}" stroke-width="2.2"/><rect x="-14" y="${f1(-48 + press * 8)}" width="28" height="${f1(52)}" rx="5" fill="#E9EEF1" stroke="#9AA8B0" stroke-width="2.2"/><rect x="-14" y="${f1(-24 + press * 8)}" width="28" height="12" fill="${CORAL}"/><rect x="-16" y="${f1(-52 + press * 8)}" width="32" height="8" rx="4" fill="#C9D3D8" stroke="#9AA8B0" stroke-width="2.2"/><path d="M-19 4H19" stroke="${K.bootD}" stroke-width="1.6" opacity=".5"/></g>`;
  w += `<path d="M1180 ${cy + 40}L760 ${cy + 60}" stroke="${K.skin}" stroke-width="110" stroke-linecap="round"/><path d="M1180 ${cy + 52}L744 ${cy + 40}" stroke="${K.skinD}" stroke-width="4" opacity=".7"/>`;                      // ibu jari di bawah badan
  w += `<g transform="translate(0 ${f1(pr)})"><path d="M1190 ${cy - 520}C1000 ${cy - 520} 800 ${cy - 440} 640 ${cy - 330}" fill="none" stroke="${K.skin}" stroke-width="124" stroke-linecap="round"/><path d="M640 ${cy - 330}L${cx + 40} ${cy - 275 * 1}" stroke="${K.skin}" stroke-width="116" stroke-linecap="round"/><ellipse cx="${cx + 120}" cy="${cy - 292}" rx="52" ry="26" fill="#FBE0CB" transform="rotate(-16 ${cx + 120} ${cy - 292})"/><path d="M900 ${cy - 470}Q930 ${cy - 440} 905 ${cy - 410}M760 ${cy - 410}Q790 ${cy - 380} 770 ${cy - 350}" fill="none" stroke="${K.skinD}" stroke-width="4" stroke-linecap="round"/></g>`;
  w += `<rect x="840" y="${cy - 470}" width="520" height="640" rx="150" fill="${K.skin}"/><path d="M880 ${cy - 440}Q930 ${cy - 330} 900 ${cy - 200}" fill="none" stroke="${K.skinD}" stroke-width="5" stroke-linecap="round" opacity=".6"/>`;
  out.A += w;
  out.U += chip(['TEKAN TABUNG'], t, 6.95, 8.7, { size: 60, bg: '#fff' }) + tag('shot dekat: jari menekan kaleng', 540, 1240, ka(t, 7.0, 8.6, 0.2), { size: 34, bg: 'rgba(8,24,36,.92)', fg: '#fff' });
}
// ------------------------------------------------------------------ B. penampang inhaler: tekan tabung -> katup melepas SATU dosis terukur -> corong (8,5 - 11,5)
function sceneSection(t, out) {
  const s = 2.6, ox = 700, oy = 860, press = eio(seg(t, 8.9, 9.5)), dy = press * 26, tRel = 9.6;     // kaleng turun 26 satuan saat ditekan
  const Pt = (x, y) => [ox + x * s, oy + y * s];
  let w = bgNavy;
  w += `<g transform="translate(${ox} ${oy}) scale(${s})">`;
  // badan inhaler (potongan): dinding biru, rongga terang; corong ke kiri
  w += `<path d="M-40 -10H40V135H-135V70H-40Z" fill="#CFE6F5" stroke="${K.boot}" stroke-width="7" stroke-linejoin="round"/><path d="M-135 70V135M-40 70H-135" stroke="${K.boot}" stroke-width="7"/><rect x="-135" y="76" width="95" height="38" fill="#EAF6FC"/>`;
  // kaleng + suspensi obat (titik emas kecil), turun saat ditekan
  w += `<g transform="translate(0 ${f1(dy)})"><rect x="-32" y="-175" width="64" height="188" rx="8" fill="#F2F5F7" stroke="#9AA8B0" stroke-width="5"/><rect x="-32" y="-175" width="64" height="26" rx="8" fill="#C9D3D8"/>`;
  for (let i = 0; i < 46; i++) w += `<circle cx="${f1(-24 + rndf(i) * 48)}" cy="${f1(-135 + rndf(i + 50) * 130 + 3 * Math.sin(t * 2 + i))}" r="2.6" fill="${K.drug}" opacity=".9"/>`;
  w += `<rect x="-9" y="12" width="18" height="20" fill="#9AA8B0"/><rect x="-14" y="30" width="28" height="30" rx="4" fill="#DDE5E9" stroke="#9AA8B0" stroke-width="4"/></g>`;
  // batang katup dan ruang takar (di dalam badan, tidak ikut turun)
  w += `<rect x="-22" y="40" width="44" height="42" rx="6" fill="#fff" stroke="#9AA8B0" stroke-width="4"/>`;
  w += `<path d="M0 82V100H-134" fill="none" stroke="#EAF6FC" stroke-width="20" stroke-linejoin="round"/>`;
  w += `</g>`;
  // satu dosis terukur: 12 partikel di ruang takar, lalu keluar lewat corong
  const path = [[0, 62], [0, 96], [-125, 96], [-250, 96]], Lc = [0]; for (let i = 1; i < path.length; i++) Lc.push(Lc[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]));
  const at = (a) => { let i = 1; while (Lc[i] < a && i < Lc.length - 1) i++; const u = clamp((a - Lc[i - 1]) / (Lc[i] - Lc[i - 1])); return [lerp(path[i - 1][0], path[i][0], u), lerp(path[i - 1][1], path[i][1], u)]; };
  for (let i = 0; i < 12; i++) {
    const tt = t - tRel - 0.03 * i, lane = (rndf(i + 3) - 0.5) * 20;
    if (tt < 0) { const [px, py] = Pt(-14 + (i % 4) * 9.5, 48 + Math.floor(i / 4) * 11 + dy * 0.0); w += dropDot(px, py, 5.2 * s * 0.55, 1); continue; }
    const a = 32 * (1 - Math.exp(-tt * 2.2)) + 200 * Math.min(1, tt / 1.6) ** 1.4 + Math.max(0, tt - 1.6) * 70, [x, y] = at(Math.min(a, Lc[3]) + 0), over = Math.max(0, a - Lc[3]);
    const [px, py] = Pt(x - over * 0.8, y + lane * (over > 0 ? over / 25 : 0.2) * 0.4);
    w += dropDot(px, py, 8 * s * 0.55, clamp(1.2 - over / 300), i < 3 && tt > 0.1 ? 0.8 : 0);
  }
  // tanda tekan
  w += `<g opacity="${f1((seg(t, 8.5, 8.8) * (1 - seg(t, 9.6, 9.9))) * 100) / 100}" transform="translate(${ox} ${oy - 190 * s + dy * s - 80})"><path d="M0 0V70M-26 44L0 74L26 44" stroke="#fff" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" fill="none"/></g>`;
  out.A += w;
  const ch = Pt(0, 62), kn = Pt(0, -140), mp = Pt(-135, 96);
  let u = chip(['SATU TEKANAN', '→ SATU SEMPROTAN'], t, 8.6, 11.4, { size: 54 });
  u += callout('tabung ditekan', 200, 470, kn[0] - 36, kn[1] + dy * s, ka(t, W.menekan - 0.2, 10.0, 0.25), { size: 38, k: eo(clamp((t - W.menekan + 0.2) / 0.4)) });
  u += callout('satu dosis terukur', 220, 1060, ch[0] - 40, ch[1], ka(t, 9.9, 11.4, 0.25), { size: 38, col: K.drug, k: eo(clamp((t - 9.9) / 0.4)) });
  u += tag('semprotan keluar lewat corong', 540, 1210, ka(t, W.semprotan - 0.2, 11.4, 0.25), { size: 34, bg: '#FFF1CC', fg: INK });
  out.U += u;
}
// ------------------------------------------------------------------ saluran napas (mulut -> tenggorok -> trakea -> percabangan -> paru) dengan partikel; dipakai C, D, E, F
function airwayWorld(t, o) {
  const { mode, ts, tb, fl = 0 } = o;
  let w = '';
  w += `<rect x="-120" y="262" width="940" height="380" rx="110" fill="${K.tissue}"/><rect x="610" y="480" width="180" height="620" rx="70" fill="${K.tissue}"/><path d="M700 980C690 1060 620 1120 560 1300H840C790 1120 720 1060 700 980Z" fill="${K.tissue}"/>`;
  w += `<ellipse cx="470" cy="1400" rx="280" ry="340" fill="#F6C9C2" stroke="${K.tissueD}" stroke-width="6"/><ellipse cx="930" cy="1400" rx="280" ry="340" fill="#F6C9C2" stroke="${K.tissueD}" stroke-width="6"/>`;
  const stroke = (d, wd) => `<path d="${d}" fill="none" stroke="${K.lumen}" stroke-width="${wd}" stroke-linecap="round" stroke-linejoin="round"/>`;
  w += stroke('M40 420L540 424C640 445 690 500 700 580L700 1000', 104).replace('stroke-width="104"', 'stroke-width="104"') + stroke('M700 1000C676 1070 620 1150 570 1290', 52) + stroke('M700 1000C724 1070 780 1150 830 1290', 52);
  w += `<path d="M700 580V1000" stroke="${K.lumen}" stroke-width="76" stroke-linecap="butt"/>`;
  // lidah, langit-langit, gigi, bibir (mulut dipotong sagital)
  w += `<path d="M110 480Q300 428 540 466V490H110Z" fill="#E9777F"/><path d="M96 366Q300 352 560 392L560 366H96Z" fill="#E8A3A3"/><rect x="80" y="338" width="42" height="52" rx="14" fill="#fff" stroke="#D9D2C0" stroke-width="3"/><rect x="80" y="456" width="42" height="52" rx="14" fill="#fff" stroke="#D9D2C0" stroke-width="3"/>`;
  w += `<path d="M10 360C30 330 80 330 94 372L94 396H10Z" fill="#E98E8E"/><path d="M10 480C30 510 80 510 94 468L94 446H10Z" fill="#E98E8E"/>`;
  for (let y = 640; y < 1000; y += 46) w += `<path d="M668 ${y}Q700 ${y + 14} 732 ${y}" fill="none" stroke="#E7D6C6" stroke-width="5" opacity=".9"/>`;
  // corong inhaler (di kiri) dan badan; kaleng turun saat ditekan
  const pr = eio(seg(t, ts - 0.35, ts)) * (1 - eio(seg(t, ts + 0.25, ts + 0.7)));
  w += `<rect x="-230" y="392" width="330" height="56" rx="16" fill="${K.boot}" stroke="${K.bootD}" stroke-width="5"/><rect x="-330" y="392" width="150" height="260" rx="30" fill="${K.boot}" stroke="${K.bootD}" stroke-width="5"/><g transform="translate(0 ${f1(pr * 24)})"><rect x="-300" y="190" width="90" height="230" rx="10" fill="#F2F5F7" stroke="#9AA8B0" stroke-width="5"/><rect x="-300" y="250" width="90" height="36" fill="${CORAL}"/></g>`;
  // aliran udara (garis putus-putus biru muda bergerak searah tarikan)
  if (fl > 0.02) { const pth = 'M40 420L540 424C640 445 690 500 700 580L700 1000'; w += `<path d="${pth}" fill="none" stroke="${K.air}" stroke-width="${f1(10 + 12 * fl)}" stroke-dasharray="26 40" stroke-dashoffset="${f1(-t * 90)}" stroke-linecap="round" opacity="${f1(0.75 * fl * 100) / 100}"/>`; }
  // partikel
  let stuckN = 0;
  for (let i = 0; i < NP; i++) { const p = particle(i, mode, t, ts, tb); if (!p) continue; if (p.stuck) stuckN++; w += dropDot(p.x, p.y, 9, 1, p.stuck ? 0.9 : 0); }
  return w;
}
function flowAmt(t, tb) { return clamp(seg(t, tb, tb + 1.4) * (1 - seg(t, tb + 8, tb + 9))); }
// ------------------------------------------------------------------ C/D/E/F. waktu semprot vs tarikan napas; partikel mengikuti aliran udara ke saluran napas
const legend = (t, a, salb) => op(a, `<g transform="translate(60 1170)"><rect x="0" y="0" width="560" height="96" rx="30" fill="rgba(8,24,36,.88)"/>${dropDot(44, 34, 10)}${T(salb ? 'partikel obat: salbutamol (contoh)' : 'partikel obat (satu semprotan)', 74, 44, { size: 28, fill: '#fff', anchor: 'start' })}<path d="M26 72H62" stroke="${K.air}" stroke-width="8" stroke-dasharray="14 8" stroke-linecap="round"/>${T('aliran udara', 74, 80, { size: 28, fill: '#fff', anchor: 'start' })}</g>`);
const bodyMap = (x, y, s, prog, a = 1) => op(a, `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-86" y="-20" width="172" height="330" rx="28" fill="rgba(8,24,36,.85)"/><circle cx="0" cy="40" r="32" fill="#E9B7A0"/><rect x="-14" y="64" width="28" height="24" fill="#E9B7A0"/><path d="M-52 92Q0 78 52 92L60 270Q0 286 -60 270Z" fill="#E9B7A0"/><ellipse cx="-30" cy="190" rx="26" ry="62" fill="#F6C9C2"/><ellipse cx="30" cy="190" rx="26" ry="62" fill="#F6C9C2"/><path d="M0 60V128M0 128L-26 170M0 128L26 170" fill="none" stroke="${K.lumen}" stroke-width="8" stroke-linecap="round"/><path d="M0 52L0 128" stroke="${K.lumen}" stroke-width="8"/><circle cx="${f1(prog < 0.45 ? 0 : (prog - 0.45) / 0.55 * -22)}" cy="${f1(lerp(52, 128, clamp(prog / 0.45)) + (prog > 0.45 ? (prog - 0.45) / 0.55 * 42 : 0))}" r="8" fill="${K.drug}" stroke="${K.drugD}" stroke-width="3"/>${T('saluran napas', 0, 304, { size: 22, fill: '#fff' })}</g>`);
function sceneMouthEarly(t, out) {
  const ts = 12.5, tb = 14.2, fl = flowAmt(t, tb);
  out.A += bgNavy + camG(airwayWorld(t, { mode: 'awal', ts, tb, fl }), 1.2, 320, 480, 540, 610);
  let u = chip(['TERLALU AWAL'], t, 11.8, 16.9, { size: 64, bg: '#D9382F', fg: '#fff' });
  u += tag('tekan sekarang', 200, 380, ka(t, ts - 0.5, ts + 0.8, 0.2), { size: 34, bg: '#fff' });
  u += tag('belum menarik napas', 540, 760, ka(t, W.sebelum, tb, 0.25), { size: 36, bg: '#FFE3DC', fg: '#8A2F22' });
  u += tag('obat tertinggal di mulut', 540, 800, ka(t, W.tertinggal - 0.4, 16.9, 0.25), { size: 38, bg: GOLD, fg: INK });
  out.U += u + timingDiagram(t, { w0: 11.8, ts, tb, y0: 880, mode: 'awal', title: 'TERLALU AWAL: SEMPROT SEBELUM TARIK NAPAS' }) + legend(t, ka(t, 12.0, 16.9, 0.3), false);
}
const TS_D = 18.9, TB_D = 18.9;
const aMean = (t) => t < TS_D ? 0 : 95 * (t - TS_D) + 110;
function sceneRun(t, out) {
  const fl = flowAmt(t, TB_D), w = sm(seg(t, 21.8, 24.6)), p = posAlong(aMean(t), 0), cx = lerp(320, p[0], w), cy = lerp(480, p[1], w), z = lerp(1.2, 1.05, w), oy = lerp(610, 800, w);
  out.A += bgNavy + camG(airwayWorld(t, { mode: 'cocok', ts: TS_D, tb: TB_D, fl }), z, cx, cy, 540, oy);
  let u = chip(['SAAT MULAI', 'MENARIK NAPAS'], t, 17.1, 21.8, { size: 56, bg: '#00A383', fg: '#fff' }) + chip(['OBAT IKUT ALIRAN UDARA'], t, 22.2, 27.0, { size: 52 }) + chip(['CONTOH: SALBUTAMOL'], t, W.contoh - 0.2, 31.4, { size: 56, bg: '#fff' });
  u += tag('semprot + tarik napas dimulai bersamaan', 540, 760, ka(t, W.bersamaan - 0.3, 21.9, 0.25), { size: 34, bg: '#CFF5E6', fg: '#0A4A3A' });
  u += tag('melewati mulut', 540, 560, ka(t, W.melewatiMulut - 0.5, 25.0, 0.25) * (1 - w), { size: 36 });
  u += tag('saluran napas (bukan pembuluh darah)', 540, 1120, ka(t, W.masuk - 0.3, 29.0, 0.3), { size: 34, bg: '#fff' });
  u += tag('sebagian besar ikut aliran udara (ilustrasi)', 540, 1060, ka(t, 28.0, 31.4, 0.3), { size: 32, bg: GOLD, fg: INK });
  out.U += u + timingDiagram(t, { w0: 17.2, ts: TS_D, tb: TB_D, y0: 880, mode: 'cocok', a: 1 - seg(t, 21.6, 22.2), title: 'COCOK: SEMPROT SAAT MULAI TARIK NAPAS' }) + legend(t, ka(t, 17.2, 31.4, 0.3), t >= 28.0) + bodyMap(930, 520, 1.0, clamp(aMean(t) / 1350), seg(t, 22.4, 22.9) * (1 - seg(t, 31.0, 31.5)));
}
// ------------------------------------------------------------------ G/H. penampang saluran napas menyempit: reseptor beta dua di otot dinding; otot mengendur, saluran melebar (31,4 - 40,9)
function sceneAxial(t, out) {
  const cx = 540, cy = 800, rel = eio(seg(t, 36.3, 40.0)), Rl0 = 175, Rl = lerp(Rl0, 222, rel), mt = lerp(96, 66, rel), amp = lerp(0.12, 0.03, rel);
  let w = bgNavy;
  w += `<circle cx="${cx}" cy="${cy}" r="470" fill="#F6C9C2" stroke="${K.tissueD}" stroke-width="6"/>`;
  for (let i = 0; i < 26; i++) { const a = rndf(i) * 6.283, r = 395 + rndf(i + 9) * 55; w += `<circle cx="${f1(cx + Math.cos(a) * r)}" cy="${f1(cy + Math.sin(a) * r)}" r="${f1(14 + rndf(i + 4) * 18)}" fill="#EFB3AA" opacity=".8"/>`; }
  const ringPath = (r0, r1, a0 = 0, a1 = Math.PI * 2, wav = 0) => { let o = '', n = 64; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n, rr = r1 * (1 + wav * Math.sin(9 * a)); o += `${i ? 'L' : 'M'}${f1(cx + Math.cos(a) * rr)} ${f1(cy + Math.sin(a) * rr)}`; } for (let i = n; i >= 0; i--) { const a = a0 + (a1 - a0) * i / n, rr = r0 * (1 + wav * Math.sin(9 * a)); o += `L${f1(cx + Math.cos(a) * rr)} ${f1(cy + Math.sin(a) * rr)}`; } return o + 'Z'; };
  const epiO = Rl + 20, musI = epiO + 4, musO = musI + mt;
  // otot polos: ruas-ruas sel, warna menegang -> mengendur
  const mc = mixc(K.muscleD, '#E7909B', rel);
  for (let i = 0; i < 18; i++) { const a0 = i / 18 * 6.283 + 0.02, a1 = (i + 1) / 18 * 6.283 - 0.02; w += `<path d="${ringPath(musI, musO, a0, a1, amp * 0.6)}" fill="${mc}" stroke="${K.muscleD}" stroke-width="3"/>`; }
  w += `<path d="${ringPath(Rl, epiO, 0, 6.283, amp)}" fill="#F7DCD6" stroke="#E2B7AE" stroke-width="3"/>`;
  w += `<path d="${ringPath(0.5, Rl, 0, 6.283, amp)}" fill="${K.lumen}"/>`;
  if (rel > 0.02) w += `<circle cx="${cx}" cy="${cy}" r="${Rl0}" fill="none" stroke="#fff" stroke-width="5" stroke-dasharray="12 12" opacity="${f1(0.75 * Math.min(1, rel * 3)) }"/>`;
  // reseptor beta dua (ungu) di sisi dalam sel otot
  const RN = 16, recepP = [];
  for (let i = 0; i < RN; i++) { const a = (i + 0.5) / RN * 6.283, rr = musI + 2, rx = cx + Math.cos(a) * rr, ry = cy + Math.sin(a) * rr, bound = clamp((t - (32.6 + 0.22 * (i % 8))) / 0.5) * (i % 2 === 0 ? 1 : 0), ax = Math.cos(a), ay = Math.sin(a); recepP.push([rx, ry, a, bound]);
    w += `<g transform="translate(${f1(rx)} ${f1(ry)}) rotate(${f1(a * 180 / Math.PI + 90)})"><path d="M0 4V-16M0 -16L-11 -30M0 -16L11 -30" fill="none" stroke="${bound > 0.5 ? '#B79BFF' : K.recep}" stroke-width="7" stroke-linecap="round"/>${bound > 0.5 ? `<circle cy="-18" r="${f1(24 + 6 * Math.sin(t * 6))}" fill="none" stroke="#fff" stroke-width="4" opacity=".8"/>` : ''}</g>`; }
  // partikel salbutamol: dari tengah lumen menuju reseptor, lalu menempel
  for (let i = 0; i < 8; i++) { const j = i * 2, [rx, ry, a] = recepP[j], t0 = 31.7 + 0.28 * i, u = eio(clamp((t - t0) / 1.5)), sx = cx + (rndf(i) - 0.5) * 120, sy = cy + (rndf(i + 5) - 0.5) * 120, tx = cx + Math.cos(a) * (epiO + 8), ty = cy + Math.sin(a) * (epiO + 8); if (t < t0 - 0.2) continue;
    w += dropDot(lerp(sx, tx, u) + (1 - u) * 6 * Math.sin(t * 3 + i), lerp(sy, ty, u) + (1 - u) * 6 * Math.cos(t * 3 + i), 11, clamp((t - t0 + 0.2) / 0.3)); }
  // aliran udara melewati lumen (lingkaran biru muda berukuran sesuai luas lumen)
  const nAir = 7; for (let i = 0; i < nAir; i++) { const a = i / nAir * 6.283 + 0.4, rr = Rl * (i === 0 ? 0 : 0.5), ax = cx + Math.cos(a) * rr, ay = cy + Math.sin(a) * rr, sz = (Rl / Rl0) ** 2; w += `<circle cx="${f1(ax)}" cy="${f1(ay)}" r="${f1(15 * sz)}" fill="none" stroke="${K.air}" stroke-width="${f1(5 * sz)}" opacity=".9"/><circle cx="${f1(ax)}" cy="${f1(ay)}" r="${f1(4.5 * sz)}" fill="${K.air}"/>`; }
  out.A += w;
  const rp = recepP[2], ml = [cx + Math.cos(2.0) * (musI + mt * 0.55), cy + Math.sin(2.0) * (musI + mt * 0.55)];
  let u = chip(['RESEPTOR BETA DUA'], t, 31.7, 36.0, { size: 56, bg: '#E7DDFF', fg: INK }) + chip(['OTOT MENGENDUR →', 'SALURAN MELEBAR'], t, 36.1, 40.9, { size: 52 });
  u += tag('penampang saluran napas yang menyempit', 540, 1330, ka(t, 31.6, 34.0, 0.3) * 0, { size: 32 });
  u += callout('reseptor beta dua', 800, 420 + 300, rp[0] + 14, rp[1] - 8, ka(t, W.reseptor - 0.3, 36.0, 0.25), { size: 38, col: K.recep, bg: '#E7DDFF', fg: INK, k: eo(clamp((t - W.reseptor + 0.3) / 0.4)) });
  u += callout('otot dinding saluran napas', 380, 1240, ml[0], ml[1], ka(t, W.otot - 0.5, 36.4, 0.25), { size: 36, col: K.muscle, k: eo(clamp((t - W.otot + 0.5) / 0.4)) });
  u += tag('partikel salbutamol', 330, 470, ka(t, 31.8, 34.8, 0.3), { size: 34, bg: GOLD, fg: INK });
  u += tag('sebelum', cx, cy - Rl0 - 30, ka(t, 36.5, 40.9, 0.25) * 0, { size: 30 }) + tag('sebelum', cx - 250, cy + 30, ka(t, 37.0, 40.9, 0.3), { size: 32, bg: '#fff' }) + tag('sesudah: melebar sedikit', cx + 250, cy + 190, ka(t, 38.2, 40.9, 0.3), { size: 32, bg: '#CFF5E6', fg: '#0A4A3A' }) + tag('udara lebih mudah lewat', 540, 1180, ka(t, W.udara - 0.3, 40.9, 0.3), { size: 36, bg: '#DDF3FB', fg: INK });
  out.U += u;
}
function mixc(a, b, k) { const h = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)); const A = h(a), B = h(b); return '#' + A.map((v, i) => Math.round(lerp(v, B[i], clamp(k))).toString(16).padStart(2, '0')).join(''); }
// ------------------------------------------------------------------ I. ringkasan: waktu menekan vs tarikan (40,9 - 46,3), Raka proporsional
function miniTiming(t, X, Y, s, o) { return `<g transform="translate(${f1(X - 40 * s)} ${f1(Y)}) scale(${s})">${timingDiagram(t, { ...o, y0: 0 })}</g>`; }
function sceneSummary(t, out) {
  const st = rIdle(raka(t < 43.7 ? 'berpikir' : 'lega', 'netral', { armR: armTo('R', 330, 478), armL: armTo('L', 88, 548), yaw: 0.2, gazeX: 0.4, tilt: -3 }), t);
  const r = rk(st, 230, 760, 1.18, 'rI'); let w = bgCream + r.svg;
  const ip = r.at(262, 440), k = r.k; w += inhalerOut(ip[0], ip[1], k * 0.95, {}) + holdFingers(ip[0], ip[1], k * 0.95, 0);
  out.A += w;
  const loop = (a) => 17.0 + mod(t - 40.9, 6.0);       // demo berulang: penunjuk waktu bergerak pada kedua diagram
  const tt = mod(t - 40.9, 6.4);
  let u = chip(['WAKTU MENEKAN +', 'TARIKAN NAPAS HARUS COCOK'], t, 41.0, 46.3, { size: 48 });
  u += miniTiming(tt, 440, 440, 0.6, { w0: 0, ts: 0.8, tb: 2.6, mode: 'awal', title: 'TERLALU AWAL' });
  u += miniTiming(tt, 440, 720, 0.6, { w0: 0, ts: 1.6, tb: 1.6, mode: 'cocok', title: 'COCOK' });
  u += `<g transform="translate(1000 640)">${T('✕', 0, 20, { size: 80, fill: '#D9382F' })}</g><g transform="translate(1000 920)">${T('✓', 0, 20, { size: 80, fill: '#00A383' })}</g>`;
  u += tag('inhaler dosis terukur tanpa spacer', 540, 1180, ka(t, 43.7, 46.3, 0.3), { size: 34, bg: '#fff' });
  out.U += u;
}
// ------------------------------------------------------------------ J. jenis lain berbeda: kenali jenis inhaler (46,3 - 52,3)
function inhalerDPI(x, y, s) { return `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-34" y="-30" width="68" height="72" rx="24" fill="#8E6BD6" stroke="#5E43A6" stroke-width="4"/><rect x="-18" y="-58" width="36" height="34" rx="10" fill="#B79BFF" stroke="#5E43A6" stroke-width="4"/><circle cx="0" cy="14" r="14" fill="#F4EBD8" stroke="#5E43A6" stroke-width="3"/></g>`; }
function inhalerSpacer(x, y, s) { return `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-70" y="-20" width="110" height="46" rx="20" fill="rgba(206,236,242,.7)" stroke="#6FA7B5" stroke-width="4"/><rect x="40" y="-14" width="24" height="34" rx="8" fill="${K.boot}"/>${inhalerOut(66, 4, 0.9, {}).replace(/<g transform="translate\([^"]*\)"/, '<g transform="translate(14 -6) scale(0.7)"')}</g>`; }
function sceneTypes(t, out) {
  const st = rIdle(raka(t < 48.9 ? 'netral' : 'lega', 'netral', { armR: armTo('R', 322, 520), armL: armTo('L', 92, 552), yaw: 0.0, tilt: 0 }), t);
  const r = rk(st, 235, 760, 1.12, 'rJ'); let w = bgCream + r.svg;
  const ip = r.at(240, 432), k = r.k; w += inhalerOut(ip[0], ip[1], k * 0.95, {}) + holdFingers(ip[0], ip[1], k * 0.95, 0);
  out.A += w;
  const cards = [[450, 'DOSIS TERUKUR', 'contoh di video ini', inhalerOut, true], [670, 'BUBUK KERING', 'cara pakai berbeda', inhalerDPI, false], [890, 'DENGAN SPACER', 'cara pakai berbeda', inhalerSpacer, false]];
  let u = chip(['KENALI JENIS', 'INHALERMU'], t, 46.5, 52.3, { size: 60, bg: '#fff' });
  const cs = [570, 800, 1030];
  [['DOSIS TERUKUR', 'contoh di video ini', inhalerOut, true], ['BUBUK KERING', 'cara pakai berbeda', inhalerDPI, false], ['DENGAN SPACER', 'cara pakai berbeda', inhalerSpacer, false]].forEach(([ttl, sub, fn, ex], i) => {
    const pp = pop(t, 46.9 + i * 0.35, 0.4); if (pp < 0.01) return; const y = cs[i] + 7 * Math.sin(t * 2.1 + i * 1.7) * clamp(pp);
    u += `<g transform="translate(790 ${y}) scale(${f1(Math.min(1.04, pp) * 1000) / 1000}) translate(-260 -105)" opacity="${f1(clamp(pp) * 100) / 100}"><rect x="6" y="10" width="520" height="210" rx="34" fill="rgba(0,0,0,.2)"/><rect width="520" height="210" rx="34" fill="#fff" stroke="${ex ? '#00A383' : '#9AA9B0'}" stroke-width="8"/>${fn === inhalerOut ? inhalerOut(120, 128, 1.45, {}) : fn(i === 2 ? 108 : 130, 112, i === 2 ? 1.2 : 1.5)}${T(ttl, i === 2 ? 378 : 360, 92, { size: i === 2 ? 28 : 34, fill: FOREST })}${T(sub, i === 2 ? 378 : 360, 142, { size: 28, fill: ex ? '#0A5A44' : '#8A2F22', w: 700 })}</g>`;
  });
  u += tag('ikuti petunjuk pada alat dan tenaga kesehatan', 540, 1230, ka(t, W.ikuti - 0.3, 52.3, 0.3), { size: 36, bg: GOLD, fg: INK });
  u += tag('isi obat dan cara pakai bisa berbeda', 790, 1180, ka(t, W.jenis - 0.5, 48.9, 0.3), { size: 32, bg: '#fff' });
  out.U += u;
}
// ------------------------------------------------------------------ penyusun frame (edukasi saja; master outro ditempel utuh oleh encode.sh)
export async function frame(t) {
  const out = { A: '', U: '' };
  out.A += `<rect width="1080" height="1920" fill="${NAVY}"/>`;
  const seq = (t0, t1, fn, fi = 0.15, fo = 0.15) => { if (t < t0 - 0.01 || t >= t1 + 0.01) return; const o = { A: '', U: '' }; fn(t, o); const a = (fi <= 0 ? 1 : clamp((t - t0) / fi)) * clamp((t1 - t) / fo); const dx = 3 * Math.sin(t * 0.9), dy = 4 * Math.sin(t * 0.7 + 1); out.A += op(a, `<g transform="translate(${f1(dx)} ${f1(dy)})">${o.A}</g>`); out.U += op(a, o.U); };
  seq(0, 6.8, sceneA, 0, 0.1); seq(6.7, 8.65, sceneMacro, 0.1, 0.1); seq(8.55, 11.5, sceneSection, 0.12, 0.2); seq(11.4, 16.95, sceneMouthEarly, 0.2, 0.2);
  seq(16.85, 31.5, sceneRun, 0.2, 0.2); seq(31.4, 41.0, sceneAxial, 0.25, 0.2); seq(40.9, 46.4, sceneSummary, 0.2, 0.2); seq(46.3, 52.2, sceneTypes, 0.2, 0.0);
  out.U += caption(t);
  return out;
}

// Video "Capillary refill time (CRT)": satu urutan waktu crt(tn) untuk tekanan jari, pengisian pembuluh (warna kuku), dan timer. Raka: aset resmi (hook dan penutup). Jari/kuku: hand.js.
import { f1, clamp, lerp, sm, eo, eio, seg, R, T, FONT, tw, pill, GOLD, FOREST, INK } from './lib.js';
import { raka, rakaSvg, armShape, idle as rIdle } from '../../../brand/characters/raka/raka.js';
import * as Hd from './hand.js';
import { cross } from './anat.js';
import * as TL from './timeline.js';
export const A = TL.A, OFF = TL.OFF, crt = TL.crt;
const ka = (t, t0, t1, f = 0.25) => clamp((t - t0) / f) * clamp((t1 - t) / f);
const op = (a, inner) => `<g opacity="${f1(clamp(a) * 1000) / 1000}">${inner}</g>`;
const CREAM = '#F7F2E4', LIGHT = '#E9F1F3', CORAL = '#D9382F', GOOD = '#2FBF92', AMBER = '#F2A33A';
const bgNavy = `<defs><linearGradient id="nbg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#12485A"/><stop offset="1" stop-color="#0A2B36"/></linearGradient></defs><rect x="-9000" y="-9000" width="18000" height="18000" fill="url(#nbg)"/>`;
// ------------------------------------------------------------------ teks layar
function chip(lines, t, t0, t1, o = {}) { const k = ka(t, t0, t1, o.f ?? 0.3); return k > 0.01 ? pill(lines, o.cx ?? 540, (o.y ?? 120) + (1 - eo(clamp((t - t0) / 0.35))) * -40, { a: k, size: o.size ?? 54, bg: o.bg, fg: o.fg }) : ''; }
function tag(txt, x, y, a = 1, o = {}) {
  if (a <= 0.01) return ''; const size = o.size ?? 34, w = tw(txt, size) + 46, h = size + 26;
  return `<g opacity="${f1(a * 100) / 100}"><rect x="${f1(x - w / 2)}" y="${f1(y - h / 2 + 5)}" width="${f1(w)}" height="${h}" rx="${h / 2}" fill="rgba(0,0,0,.28)"/><rect x="${f1(x - w / 2)}" y="${f1(y - h / 2)}" width="${f1(w)}" height="${h}" rx="${h / 2}" fill="${o.bg ?? '#fff'}"/>${T(txt, x, y + size * 0.36, { size, fill: o.fg ?? FOREST })}</g>`;
}
function caption(tn) {
  const c = TL.KAL.find(([a, b]) => tn >= a - 0.04 && tn < b + 0.1); if (!c) return '';
  const size = 46, words = c[2].split(' '), lines = []; let cur = ''; for (const w of words) { const t = cur ? cur + ' ' + w : w; if (cur && tw(t, size) > 840) { lines.push(cur); cur = w; } else cur = t; } if (cur) lines.push(cur);
  const a = clamp((tn - c[0]) / 0.14) * clamp((c[1] + 0.1 - tn) / 0.12 + 0.2), lh = size * 1.22, h = lines.length * lh + 30, y = 1340;
  return `<g opacity="${f1(a * 100) / 100}">${R(90, y + 6, 900, h, 'rgba(0,0,0,.28)', 34)}${R(90, y, 900, h, 'rgba(8,16,28,.92)', 34)}${lines.map((l, i) => T(l, 540, y + 14 + size * 0.88 + i * lh, { size, fill: '#fff', w: 800 })).join('')}</g>`;
}
// ------------------------------------------------------------------ timer (dari crt(tn)): mulai saat jari BENAR-BENAR lepas, berhenti saat warna pulih
function timerCard(c, x, y, o = {}) {
  const w = o.w ?? 380, h = o.h ?? 168, v = c.tVal, over = v > 2.0 + 1e-6, col = c.done ? (over ? AMBER : GOOD) : (c.running ? '#fff' : '#9FB4BF'), st = c.done ? (over ? 'LEBIH LAMBAT' : 'WARNA PULIH') : c.running ? 'MENGHITUNG' : 'MENUNGGU';
  const txt = (c.running ? v : 0).toFixed(1).replace('.', ',');
  const bw = w - 60, bx = x + 30, by = y + h - 40, fillw = clamp(v / 4) * bw;
  return `<g opacity="${o.a ?? 1}"><rect x="${x + 6}" y="${y + 10}" width="${w}" height="${h}" rx="34" fill="rgba(0,0,0,.3)"/><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="34" fill="#0B2530" stroke="${c.running && !c.done ? GOLD : '#4B6C78'}" stroke-width="5"/>${T('WAKTU', x + 30, y + 40, { size: 26, fill: '#9FB4BF', anchor: 'start', w: 800 })}${T(st, x + w - 30, y + 40, { size: 24, fill: col, anchor: 'end', w: 800 })}${T(txt, x + w / 2 - 28, y + 112, { size: 78, fill: col, w: 800 })}${T('dtk', x + w / 2 + 92, y + 112, { size: 36, fill: '#9FB4BF', w: 800, anchor: 'start' })}<rect x="${bx}" y="${by}" width="${bw}" height="12" rx="6" fill="#26414C"/><rect x="${bx}" y="${by}" width="${f1(fillw)}" height="12" rx="6" fill="${over ? AMBER : GOLD}"/><path d="M${f1(bx + bw / 2)} ${by - 8}V${by + 20}" stroke="#fff" stroke-width="4"/>${T('2', bx + bw / 2, by + 44, { size: 20, fill: '#fff', w: 800 })}</g>`;
}
// ------------------------------------------------------------------ makro punggung jari (ruang lokal lensa; pusat kuku ≈ (-62, -111))
const NAIL = [-221, 95];
function macro(c, tn) {
  return `<g transform="rotate(-3 0 420)">${Hd.patientFingers({ tn, fill: c.fill })}</g>${Hd.examinerFinger({ press: c.press, lift: c.lift, cx: -236, cy: 62 })}`;
}
const camMacro = (z, ax = 540, ay = 780, fx = NAIL[0], fy = NAIL[1]) => `translate(${f1(ax)} ${f1(ay)}) scale(${f1(z * 1000) / 1000}) translate(${f1(-fx)} ${f1(-fy)})`;
// ------------------------------------------------------------------ HOOK: Raka menekan kuku (0 - 3,2) -> kamera masuk ke lensa makro -> makro penuh
const LENS = { x: 735, y: 700, r: 330 }, RK = { cx: 270, ty: 380, k: 1.3 };
const armTo = (side, hx, hy, extra = {}) => { const a = { wx: hx, wy: hy, ex: side === 'R' ? Math.max(330, hx + 70) : Math.min(70, hx - 70), ey: hy + 90, finger: 0, fa: -90, front: 1, roll: 0, hold: 0, holdRot: 0, ...extra }; const hh = armShape(side, a).hand; a.wx += hx - hh[0]; a.wy += hy - hh[1]; return a; };
const rk = (st, cx, ty, k, uid) => { const tx = cx - 200 * k; return `<g transform="translate(${f1(tx)} ${f1(ty)}) scale(${k})">${rakaSvg(st, { bare: true, uid, shadow: false })}</g>`; };
const camHook = (tn) => { const u = eio(seg(tn, 1.6, 3.2)), z = lerp(1, 3.1, u), fx = lerp(540, LENS.x + NAIL[0], u), fy = lerp(960, LENS.y + NAIL[1], u), ay = lerp(960, 780, u); return `translate(540 ${f1(ay)}) scale(${f1(z * 1000) / 1000}) translate(${f1(-fx)} ${f1(-fy)})`; };
function sceneHook(tn) {
  const c = crt(tn), press = c.press, reach = clamp(1 - c.lift);
  const aL = armTo('L', 92, 480, { finger: 1, fa: -80 }), aR = armTo('R', lerp(215, 128, reach), lerp(540, 470, reach), { finger: 1, fa: 205 });
  let st = raka(tn < 2.6 ? 'berpikir' : 'netral', 'menunjuk', { armL: aL, armR: aR, yaw: -0.15, tilt: 3, gazeX: 0.5, gazeY: -0.2 }); st = rIdle(st, tn);
  const lensG = `<defs><clipPath id="lens"><circle cx="${LENS.x}" cy="${LENS.y}" r="${LENS.r}"/></clipPath></defs><circle cx="${LENS.x + 8}" cy="${LENS.y + 14}" r="${LENS.r + 6}" fill="rgba(0,0,0,.25)"/><circle cx="${LENS.x}" cy="${LENS.y}" r="${LENS.r}" fill="${LIGHT}"/><g clip-path="url(#lens)"><g transform="translate(${LENS.x} ${LENS.y})">${macro(c, tn)}</g></g><circle cx="${LENS.x}" cy="${LENS.y}" r="${LENS.r}" fill="none" stroke="#fff" stroke-width="16"/><circle cx="${LENS.x}" cy="${LENS.y}" r="${LENS.r + 8}" fill="none" stroke="${GOLD}" stroke-width="5" stroke-dasharray="26 16"/>`;
  const world = `<rect x="-3000" y="-3000" width="9000" height="9000" fill="${CREAM}"/><circle cx="90" cy="520" r="230" fill="#EADFC4"/><circle cx="1000" cy="1500" r="260" fill="#EADFC4" opacity=".7"/>${rk(st, RK.cx, RK.ty, RK.k, 'rH')}${lensG}`;
  const zoomK = seg(tn, 2.4, 3.2);
  let A_ = `<g transform="${camHook(tn)}">${world}</g>`;
  if (zoomK > 0.01) A_ += `<g opacity="${f1(zoomK * 100) / 100}"><rect width="1080" height="1920" fill="${LIGHT}"/><g transform="${camMacro(3.1)}">${macro(c, tn)}</g></g>`;
  let U = chip(['KOK KUKU', 'JADI PUTIH?'], tn, -1, 3.0, { size: 62, bg: CORAL, fg: '#fff', y: 100 });
  U += tag('ilustrasi edukatif (perbesaran)', 735, 1100, ka(tn, 0.2, 1.8, 0.25) * (1 - zoomK), { size: 30, bg: '#fff' });
  const tm = ka(tn, 2.8, 6.7, 0.3); if (tm > 0.01) U += timerCard(c, 350, 1120, { a: tm });
  U += chip(['LEPAS → MULAI HITUNG'], tn, 3.3, 6.5, { size: 50, bg: GOLD, fg: INK, y: 100 });
  return { A: A_, U };
}
// ------------------------------------------------------------------ MAKRO PENUH (6,7 - 10,7 dan 20,0 - 26,7)
function sceneMacro(tn) {
  const c = crt(tn); let A_ = `<rect width="1080" height="1920" fill="${LIGHT}"/><g transform="${camMacro(3.1)}">${macro(c, tn)}</g>`, U = '';
  const idle = tn < 10.7;
  // langkah CRT (6,7 - 10,7)
  if (idle) {
    const steps = ['TEKAN', 'LEPAS', 'HITUNG', 'WARNA PULIH'], t0 = [7.2, 8.0, 8.8, 9.5];
    steps.forEach((s, i) => { const k = clamp((tn - t0[i]) / 0.3), x = 140 + i * 265; U += `<g opacity="${f1(ka(tn, 7.0, 10.6, 0.3) * 100) / 100}">${R(x - 120, 1130, 240, 88, k > 0.5 ? GOLD : 'rgba(255,255,255,.85)', 44)}${T(s, x, 1186, { size: s.length > 6 ? 28 : 34, fill: INK, w: 800 })}${i < 3 ? T('→', x + 132, 1182, { size: 40, fill: '#17303D' }) : ''}</g>`; });
    U += chip(['CAPILLARY REFILL TIME'], tn, 6.7, 9.3, { size: 52, bg: '#fff', fg: FOREST, y: 100 }) + chip(['CRT = WAKTU WARNA', 'KEMBALI SETELAH DITEKAN'], tn, 9.3, 10.9, { size: 46, bg: GOLD, fg: INK, y: 100 });
    U += tag('pembuluh kecil di bawah kuku = kapiler', 540, 1060, ka(tn, 7.2, 10.5, 0.3), { size: 32 });
  } else {
    U += timerCard(c, 350, 1120, { a: ka(tn, 20.0, 26.7, 0.3) });
    U += chip(['SEKITAR 2 DETIK', 'ATAU KURANG'], tn, 20.6, 23.4, { size: 54, bg: GOLD, fg: INK, y: 100 });
    U += tag('acuan umum, bukan jaminan untuk semua usia dan kondisi', 540, 1085, ka(tn, 21.6, 23.4, 0.3), { size: 28, bg: '#FFF4B8', fg: INK });
    U += chip(['LEBIH LAMBAT?', 'LIHAT KONTEKSNYA'], tn, 23.6, 26.7, { size: 54, bg: '#fff', fg: FOREST, y: 100 });
    U += tag('contoh pengisian lebih lambat (ilustrasi)', 540, 1050, ka(tn, 24.3, 26.6, 0.3), { size: 30 });
    U += tag('aliran darah ke jaringan berkurang → warna kembali lebih lama', 540, 1290 - 0, ka(tn, 25.0, 26.6, 0.3) * 0, { size: 28 });
  }
  return { A: A_, U };
}
// ------------------------------------------------------------------ TAMPILAN GANDA: kuku (luar) + penampang dasar kuku (10,7 - 20,0 dan 26,7 - 32,3)
function sceneSplit(tn) {
  const c = crt(tn), cold = sm((tn - 27.6) / 1.0) * (tn >= 26.6 ? 1 : 0);
  let A_ = bgNavy;
  const d = { x: 40, y: 230, w: 1000, h: 490 }, cs = { x: 40, y: 745, w: 1000, h: 450 };
  A_ += `<defs><clipPath id="cd"><rect x="${d.x}" y="${d.y}" width="${d.w}" height="${d.h}" rx="40"/></clipPath><clipPath id="cc"><rect x="${cs.x}" y="${cs.y}" width="${cs.w}" height="${cs.h}" rx="40"/></clipPath></defs>`;
  A_ += `<rect x="${d.x}" y="${d.y}" width="${d.w}" height="${d.h}" rx="40" fill="${LIGHT}"/><g clip-path="url(#cd)"><g transform="${camMacro(1.5, 540, 478)}">${macro(c, tn)}</g></g><rect x="${d.x}" y="${d.y}" width="${d.w}" height="${d.h}" rx="40" fill="none" stroke="rgba(255,255,255,.4)" stroke-width="5"/>`;
  A_ += `<rect x="${cs.x}" y="${cs.y}" width="${cs.w}" height="${cs.h}" rx="40" fill="#F4F0E6"/><g clip-path="url(#cc)"><g transform="translate(${cs.x + 117} ${cs.y + 167}) scale(0.85)">${cross(c, { tn, cold })}</g></g><rect x="${cs.x}" y="${cs.y}" width="${cs.w}" height="${cs.h}" rx="40" fill="none" stroke="rgba(255,255,255,.4)" stroke-width="5"/>`;
  // garis penghubung warna kuku <-> isi pembuluh
  const k = ka(tn, 12.3, 19.9, 0.3) + ka(tn, 27.0, 32.2, 0.3); A_ += `<path d="M540 ${d.y + d.h - 4}V${cs.y + 4}" stroke="${GOLD}" stroke-width="6" stroke-dasharray="14 12" stroke-linecap="round" opacity="${f1(clamp(k) * 0.9 * 100) / 100}" transform="translate(0 0)"/>`;
  let U = '';
  const mech = tn < 26;
  if (mech) {
    U += chip(['DITEKAN'], tn, 10.8, 15.9, { size: 60, bg: '#FFE3DC', fg: '#8A2F22', y: 100 }) + chip(['DILEPAS'], tn, 15.9, 20.0, { size: 60, bg: '#CFF5E6', fg: '#0A4A3A', y: 100 });
    U += tag('darah terdorong keluar → kuku pucat', 540, d.y + d.h - 34, ka(tn, 13.2, 15.9, 0.3), { size: 32, bg: '#fff' });
    U += tag('darah mengisi pembuluh lagi → warna kembali', 540, d.y + d.h - 34, ka(tn, 17.2, 19.9, 0.3), { size: 32, bg: '#fff' });
    U += timerCard(c, 640, 250, { a: ka(tn, 16.0, 20.0, 0.3), w: 380, h: 168 });
  } else {
    U += chip(['SUHU, USIA, CARA', 'PEMERIKSAAN'], tn, 26.7, 32.2, { size: 52, bg: '#fff', fg: FOREST, y: 100 });
    const cards = [['DINGIN', 27.8, '❄'], ['USIA', 28.84, 'usia'], ['CARA PERIKSA', 29.56, 'cara']];
    cards.forEach(([t, t0, ic], i) => { const x = 195 + i * 345, a = clamp((tn - t0) / 0.3) * clamp((32.3 - tn) / 0.3); if (a > 0.01) U += `<g opacity="${f1(a * 100) / 100}">${R(x - 160, 1215, 320, 92, i === 0 ? '#D9F0FF' : '#fff', 46)}${T(t, x, 1276, { size: 38, fill: i === 0 ? '#0B4F73' : FOREST })}</g>`; });
    if (cold > 0.05) U += `<g opacity="${f1(cold * ka(tn, 27.6, 32.2, 0.3) * 100) / 100}">${T('❄', 950, 940, { size: 110, fill: '#8FD3F5' })}${T('❄', 120, 470, { size: 70, fill: '#8FD3F5' })}</g>${tag('dingin: pembuluh menyempit, aliran melambat', 540, d.y + d.h - 34, cold * ka(tn, 27.8, 32.2, 0.3), { size: 30, bg: '#D9F0FF', fg: '#0B4F73' })}`;
    U += timerCard(c, 640, 250, { a: ka(tn, 26.7, 29.8, 0.3) });
  }
  return { A: A_, U };
}
// ------------------------------------------------------------------ PENUTUP: Raka melihat timer dan hasil bersama tanda lain (32,3 - akhir)
function sceneClose(tn) {
  const c = crt(tn), pt = seg(tn, 34.4, 35.2);
  let st = raka(tn < 35 ? 'berpikir' : 'senang', 'menunjuk', { armL: armTo('L', 92, 552), armR: armTo('R', lerp(314, 360, pt), lerp(552, 360, pt), { finger: pt > 0.4 ? 1 : 0, fa: -40 }), yaw: 0.25, tilt: 3, gazeX: 0.7, gazeY: 0.2 }); st = rIdle(st, tn);
  let A_ = `<rect width="1080" height="1920" fill="${CREAM}"/><circle cx="90" cy="520" r="230" fill="#EADFC4"/><circle cx="1000" cy="1500" r="260" fill="#EADFC4" opacity=".7"/>${rk(st, 270, 300, 1.05, 'rX')}`;
  // kartu hasil + tanda klinis lain (tanpa angka pasien)
  const x0 = 470, y0 = 280, w = 570;
  const fl = f1(Math.sin(tn * 2.4) * 5);
  A_ += `<g transform="translate(0 ${fl})"><rect x="${x0 + 8}" y="${y0 + 12}" width="${w}" height="700" rx="40" fill="rgba(0,0,0,.18)"/><rect x="${x0}" y="${y0}" width="${w}" height="700" rx="40" fill="#fff" stroke="#BFD3D6" stroke-width="4"/>`;
  A_ += `<g transform="translate(${x0 + 285} ${y0 + 190}) scale(0.62)"><rect x="-300" y="-150" width="600" height="300" rx="34" fill="#0B2530"/>${T('0,0', -20, 40, { size: 130, fill: '#fff' })}<text x="170" y="40" font-family="${FONT}" font-weight="800" font-size="52" fill="#9FB4BF">dtk</text><rect x="-250" y="90" width="500" height="14" rx="7" fill="#26414C"/><rect x="-250" y="90" width="${f1(250 + 0)}" height="14" rx="7" fill="${GOLD}"/><path d="M0 70V120" stroke="#fff" stroke-width="5"/></g>`;
  A_ = A_.replace(`>0,0<`, `>≈ 2<`);
  const tiles = [['KONDISI PASIEN', 'kesadaran, napas, nadi'], ['SUHU & LINGKUNGAN', 'tangan dingin atau hangat'], ['TANDA KLINIS LAIN', 'dinilai bersama']];
  tiles.forEach(([a, b], i) => { const y = y0 + 330 + i * 116, k = clamp((tn - (35.4 + i * 0.5)) / 0.3); A_ += `<g opacity="${f1(k * 100) / 100}"><rect x="${x0 + 28}" y="${y}" width="${w - 56}" height="100" rx="24" fill="${i === 0 ? '#E3F6EE' : i === 1 ? '#E1F0FA' : '#FFF4D6'}"/>${T(a, x0 + 56, y + 42, { size: 32, fill: INK, anchor: 'start', w: 800 })}${T(b, x0 + 56, y + 82, { size: 27, fill: '#4C6773', anchor: 'start', w: 700 })}</g>`; });
  A_ += `<path d="M${x0 + 285} ${y0 + 320}V${y0 + 330}" stroke="${GOLD}" stroke-width="6"/></g>`;
  let U = chip(['ANGKA 2 DETIK =', 'PETUNJUK AWAL'], tn, 32.4, 35.0, { size: 54, bg: GOLD, fg: INK, y: 100 }) + chip(['CRT + TANDA KLINIS LAIN'], tn, 35.1, 36.9, { size: 50, bg: '#fff', fg: FOREST, y: 100 });
  const kf = clamp((tn - 36.6) / 0.35); if (kf > 0.01) U += `<g opacity="${f1(kf * 100) / 100}">${R(70, 1130, 940, 150, FOREST, 44)}${T('SATU PETUNJUK,', 540, 1200, { size: 56, fill: '#fff' })}${T('BUKAN DIAGNOSIS', 540, 1262, { size: 56, fill: GOLD })}</g>`;
  return { A: A_, U };
}
// ------------------------------------------------------------------ penyusun frame
const SCENES = [[-9, sceneHook], [6.68 - 0.02, sceneMacro], [10.68 - 0.02, sceneSplit], [20.0, sceneMacro], [26.62 - 0.02, sceneSplit], [32.3, sceneClose]];
export async function frame(t) {
  const tn = t - OFF; let i = 0; for (let k = 0; k < SCENES.length; k++) if (tn >= SCENES[k][0]) i = k;
  const s = SCENES[i][1](tn); let A_ = s.A, U = s.U; const fd = 0.3, k = i > 0 ? clamp((tn - SCENES[i][0]) / fd) : 1;
  if (k < 1) { const p = SCENES[i - 1][1](tn), e = sm(k); A_ = p.A + op(e, s.A); U = op(1 - e, p.U) + op(e, s.U); }
  return { A: bgNavy + A_, U: U + caption(tn) };
}
export const cover = async () => {
  let st = raka('senang', 'menunjuk', { armL: armTo('L', 92, 552), armR: armTo('R', 300, 470, { finger: 1, fa: -50 }), yaw: 0.2, tilt: 2 }); st = rIdle(st, 0.8);
  const c = { press: 0, lift: 0.6, fill: 0.03 };
  const outl = 'stroke="#fff" stroke-width="14" paint-order="stroke"';
  let A_ = `<rect width="1080" height="1920" fill="${LIGHT}"/><g transform="${camMacro(2.35, 560, 960)}">${macro(c, 0)}</g>`;
  A_ += `<rect x="0" y="1260" width="1080" height="440" fill="${FOREST}"/><g transform="translate(150 1190)">${rk(st, 0, 0, 0.62, 'rC')}</g>`;
  const U = `${T('KOK KUKU', 540, 405, { size: 130, fill: CORAL, w: 800, e: outl })}${T('JADI PUTIH?', 540, 545, { size: 130, fill: CORAL, w: 800, e: outl })}${T('CAPILLARY REFILL TIME', 640, 1395, { size: 58, fill: '#fff', w: 800 })}${T('berapa detik sampai pulih?', 640, 1468, { size: 46, fill: GOLD, w: 800 })}${tag('ilustrasi edukatif', 540, 1180, 1, { size: 30 })}`;
  return { A: A_, U };
};

// Adegan 5-9: zoom dari lengan ke pembuluh (tekanan terus-menerus tinggi, dinding menebal seiring waktu), organ sasaran: jantung, otak (tersumbat vs pecah), ginjal.
import { RK, TK, rk, tk, clamp, sm, eo, eob, lerp, rLerp, walkCycle, win, f1, A, R, C, E, P, L, T, chip, ks, lin, trackR, kori, ringPulse, exMark, qMark, note, lab2, H, COLR } from './common.js';
import { station, ULUR } from './scenesD1.js';
import { STN } from './common.js';

const BG = (id) => A.softBg('#0F5F57', '#0A3830', id) + R(50, 200, 980, 1170, 'rgba(255,255,255,.05)', 44);
const pill = (cx, cy, txt, o = {}) => lab2(cx, cy, txt, o);

// ================================================================ 5a. "BAYANGKAN" + ZOOM DARI LENGAN (56.18 - 59.7)
const S5A = {
  t0: 56.18, tr: { type: 'wipe', d: 0.01 },
  draw(t) {
    const u = t - 56.18;
    const idea = rk('penasaran', 'ulur_lengan', { armL: { roll: 0.72 }, armR: { wx: 350, wy: 292, ex: 346, ey: 396, finger: 1, fa: -90, front: 1, roll: 0 }, yaw: 0.15, gazeX: 0.3, gazeY: -0.8, tilt: 4 });
    const rs = trackR(u, [{ t: 0, d: 0.01, s: rk('lega', 'ulur_lengan', { armL: { roll: 0.72 }, yaw: -0.4, gazeX: -0.6 }) }, { t: 0.4, d: 0.5, s: idea }, { t: 2.2, d: 0.6, s: rk('waspada', 'ulur_lengan', { armL: { roll: 0.72 }, yaw: -0.7, gazeX: -0.9, gazeY: 0.3 }) }]);
    // kamera: dari 1.15 (stasiun) masuk ke lengan (zoom hingga 3.6x, lengan di tengah layar)
    const z = u < 1.2 ? 1.15 : 1.15 + (3.6 - 1.15) * sm((u - 1.2) / 2.0);
    const f = sm((u - 1.2) / 2.0);
    const wx = lerp(560, 520, f), wy = lerp(1290, 1085, f), sx = 540, sy = lerp(1290, 700, f);
    const k = kori(330, 1000, 0.55, t, { mood: 'think', arm: -30, tilt: -6 });
    let s = station(t, { rs, cuff: { mode: 'on', inflate: 0.25 + 0.15 * Math.sin(u * 6) }, dev: { mode: 'hasil', sys: 152, dia: 96, hi: true }, post: k, cam: [z, wx, wy, sx, sy] });
    const a = clamp(u / 0.3, 0, 1) * (1 - clamp((u - 2.2) / 0.5, 0, 1));
    s += chip(540, 330, 'Bayangkan: di dalam lengan…', { bg: COLR.forest, fs: 40, a, w: 860 });
    return s;
  },
};

// ================================================================ 5b. PEMBULUH: TEKANAN TERUS-MENERUS TINGGI, DINDING MENEBAL SERING WAKTU (59.7 - 68.9)
const S5B = {
  t0: 59.7, tr: { type: 'iris', d: 0.8, cx: 540, cy: 700 },
  draw(t) {
    const u = t - 59.7;
    const wall = sm((t - 62.6) / 5.2);          // bertahap sepanjang "seiring waktu" (62.6 - 67.8)
    const pr = 0.95;
    let s = BG('sbD5');
    const vc = [540, 610, 300];
    s += H.pressVessel(vc[0], vc[1], vc[2], { pr, wall, t });
    // label
    const la = clamp((u - 1.0) / 0.4, 0, 1);
    s += H.label(500, 600, 60, 330, 'Lumen (darah)', { a: la, anchor: 'start', fs: 28 });
    s += H.label(540 + 255, 610 - 80, 1030, 360, 'Dinding pembuluh', { a: la, fs: 28, anchor: 'end' });
    if (t >= 65.0) { const wa = clamp((t - 65.0) / 0.4, 0, 1); s += lab2(430, 1100, 'Dinding menebal dan kaku', { fs: 28, bg: COLR.coral, a: wa }) + lab2(430, 1152, 'lumen menyempit', { fs: 28, bg: COLR.coral, a: wa }); }
    // penunjuk tekanan terus-menerus tinggi
    if (u < 2.9) s += `<g opacity="${f1(clamp((u - 0.3) / 0.3, 0, 1))}">${lab2(540, 250, 'Tekanan terus-menerus tinggi', { fs: 36, bg: COLR.coral })}</g>`;
    // garis waktu: sekarang -> bulan -> tahun (bertahap, bukan seketika)
    const ta = clamp((t - 62.4) / 0.4, 0, 1);
    if (ta > 0) {
      const x0 = 290, x1 = 790, y = 1000, p = clamp((t - 62.6) / 5.2, 0, 1);
      s += `<g opacity="${f1(ta)}">${R(x0 - 20, y - 56, x1 - x0 + 40, 118, 'rgba(0,0,0,.35)', 40)}${R(x0, y - 4, x1 - x0, 8, 'rgba(255,255,255,.35)', 4)}${R(x0, y - 4, (x1 - x0) * p, 8, COLR.gold, 4)}${C(x0 + (x1 - x0) * p, y, 16, COLR.gold, 'stroke="#fff" stroke-width="4"')}${T(x0, y + 42, 'sekarang', '#fff', 24, '', 'start')}${T((x0 + x1) / 2, y + 42, 'bulan', '#fff', 24)}${T(x1, y + 42, 'tahun', '#fff', 24, '', 'end')}${T(540, y - 22, 'Seiring waktu', COLR.gold, 26)}</g>`;
    }
    // jantung bekerja lebih keras (66.4 - 68.9)
    if (t >= 66.2) {
      const a = sm((t - 66.2) / 0.5), ph = (((t - 66.2) / 0.62) % 1);
      const con = ph < 0.2 ? sm(ph / 0.2) : 1 - sm((ph - 0.2) / 0.5);
      s += `<g opacity="${f1(a)}">${R(760, 1060, 280, 270, 'rgba(0,0,0,.4)', 40)}${H.heartCut(900, 1190, 0.26, { c: con, t, flow: 1 })}${T(900, 1308, 'jantung lebih keras', '#fff', 22)}</g>`;
    }
    // Raka: menunjuk pembuluh -> memegang dagu mengamati -> tangan di dada (bekerja lebih keras)
    const point = rk('waspada', 'menunjuk', { legs: { dir: 0 }, yaw: 0.35, gazeX: 0.6, gazeY: -0.7, armR: { wx: 356, wy: 330, ex: 342, ey: 392, finger: 1, fa: -62, front: 1 } });
    const chin = rk('berpikir', 'berpikir', { legs: { dir: 0 }, gazeX: 0.5, gazeY: -0.6 });
    const hand = (t >= 66.2 && ((t - 66.2) / 0.62) % 1 < 0.25) ? 8 : 0;
    const chest = rk('khawatir', 'pegang_dada', { legs: { dir: 0 }, armR: { wx: 242, wy: 470 - hand, ex: 330, ey: 504 }, sweat: 1, gazeX: 0.4, gazeY: -0.4 });
    const rs = trackR(u, [{ t: 0, d: 0.01, s: point }, { t: 2.9, d: 0.5, s: chin }, { t: 6.4, d: 0.5, s: chest }]);
    s += RK(rs, 150, 1345, 0.62, { t, uid: 'rk', outfit: 'harian' });
    s += kori(690, 1300, 0.46, t, { mood: u < 6.4 ? 'think' : 'normal', arm: -25, flip: true, tilt: 6 + Math.sin(u * 5) * 2 });
    return s;
  },
};

// ================================================================ 6. BEBERAPA ORGAN (68.9 - 71.18): Raka menyentuh kepala, dada, pinggang; kartu organ muncul
const S6 = {
  t0: 68.9, tr: { type: 'wipe', d: 0.5 },
  draw(t) {
    const u = t - 68.9;
    let s = A.creamBg('cbD6');
    const head = rk('penasaran', 'usap_mata', { legs: { dir: 0 }, yaw: 0, tilt: 3, gazeX: 0.2 });
    const chest = rk('waspada', 'pegang_dada', { legs: { dir: 0 } });
    const waist = rk('waspada', 'netral', { legs: { dir: 0 }, armL: { wx: 128, wy: 528, ex: 62, ey: 478, finger: 0, front: 1 }, armR: { wx: 272, wy: 528, ex: 338, ey: 478, finger: 0, front: 1 } });
    const rs = trackR(u, [{ t: 0, d: 0.01, s: rk('penasaran', 'netral', { legs: { dir: 0 } }) }, { t: 0.1, d: 0.3, s: head }, { t: 0.85, d: 0.3, s: chest }, { t: 1.5, d: 0.3, s: waist }]);
    const RX = 540, RF = 1335, RKk = 0.85;
    const cards = [
      { t0: 0.35, x: 190, y: 560, fn: (c) => H.brainStroke(c[0], c[1] + 10, 0.5, 'iskemik', 0), name: 'Otak', to: [RX, RF + (212 - 778) * RKk] },
      { t0: 1.0, x: 890, y: 840, fn: (c) => H.heartCut(c[0], c[1] + 10, 0.36, { c: 0, t }), name: 'Jantung', to: [RX + 50, RF + (470 - 778) * RKk] },
      { t0: 1.6, x: 190, y: 1010, fn: (c) => H.kidney(c[0] + 20, c[1], 0.36), name: 'Ginjal', to: [RX - 80, RF + (540 - 778) * RKk] },
    ];
    for (const c of cards) {
      const a = clamp((u - c.t0) / 0.25, 0, 1); if (a <= 0) continue;
      const sc = 0.7 + 0.3 * eob((u - c.t0) / 0.4);
      s += `<g opacity="${f1(a)}"><path d="M${c.x} ${c.y}L${f1(c.to[0])} ${f1(c.to[1])}" stroke="${COLR.coral}" stroke-width="6" stroke-dasharray="4 14" stroke-linecap="round"/>${C(f1(c.to[0]), f1(c.to[1]), 10, COLR.coral)}<g transform="translate(${c.x} ${c.y}) scale(${sc.toFixed(3)}) translate(${-c.x} ${-c.y})">${C(c.x, c.y + 8, 140, 'rgba(0,0,0,.14)')}${C(c.x, c.y, 140, '#0A3830')}${c.fn([c.x, c.y])}${R(c.x - 90, c.y + 122, 180, 52, COLR.coral, 26)}${T(c.x, c.y + 160, c.name, '#fff', 34)}</g></g>`;
    }
    s += RK(rs, RX, RF, RKk, { t, uid: 'rk', outfit: 'harian' });
    s += kori(930, 1250, 0.5, t, { mood: 'think', arm: -30, flip: true, tilt: 8 });
    return s;
  },
};

// ================================================================ 7. JANTUNG (71.18 - 76.7)
const S7 = {
  t0: 71.18, tr: { type: 'iris', d: 0.7, cx: 540, cy: 620 },
  draw(t) {
    const u = t - 71.18;
    const hyper = sm((t - 72.0) / 3.4), fail = sm((t - 75.4) / 0.9);
    const per = lerp(1.1, 0.8, sm((t - 72.0) / 1.5));
    const ph = (((t - 71.18) / per) % 1);
    let con = ph < 0.14 ? sm(ph / 0.14) : ph < 0.45 ? 1 - 0.2 * sm((ph - 0.14) / 0.31) : 1 - sm((ph - 0.45) / 0.45) * 0.97;
    con = clamp(con, 0, 1) * (1 - 0.55 * fail);
    let s = BG('sbD7');
    s += H.heartCut(580, 600, 0.95, { c: con, hyper, t, flow: 1 - fail });
    const la = clamp((u - 0.4) / 0.4, 0, 1);
    s += H.label(700, 640, 1040, 760, 'Ventrikel kiri', { a: la, anchor: 'end' });
    if (hyper > 0.35) s += H.label(745, 720, 1040, 850, 'Otot menebal', { a: clamp((hyper - 0.35) / 0.3, 0, 1), c: COLR.gold, line: COLR.gold, anchor: 'end' });
    s += H.label(790, 270, 880, 220, 'Aorta', { a: la });
    // beban kerja naik bertahap
    const wa = clamp((t - 72.0) / 0.4, 0, 1);
    if (wa > 0) { const p = clamp(sm((t - 72.2) / 2.4), 0, 1); s += `<g opacity="${f1(wa)}">${R(170, 1000, 740, 82, 'rgba(0,0,0,.35)', 41)}${R(190, 1020, 700 * p, 42, mixBar(p), 21)}${R(190, 1020, 700, 42, 'none', 21, 'stroke="#fff" stroke-width="3" opacity=".6"')}${T(540, 1130, 'beban kerja jantung naik', '#fff', 28)}</g>`; }
    if (fail > 0.02) s += `<g opacity="${f1(fail)}" transform="translate(540 ${f1(1215 - 8 * (1 - fail))})">${R(-300, -44, 600, 90, COLR.coral, 45)}${T(0, 16, 'Gagal jantung (risiko)', '#fff', 40)}</g>`;
    // Raka: tangan di dada berdenyut cepat, lalu lelah (bahu turun + keringat); Kori menunjuk jantung
    const hand = ph < 0.2 ? 9 * Math.sin(ph / 0.2 * Math.PI) : 0;
    const rs = rk(fail > 0.5 ? 'khawatir' : 'waspada', 'pegang_dada', { legs: { dir: 0 }, armR: { wx: 242 + hand * 0.4, wy: 470 - hand, ex: 330, ey: 504 }, sweat: clamp((u - 1.0) / 1.0, 0, 1), slump: 14 * fail, gazeX: 0.5, gazeY: -0.3, yaw: 0.25, lean: 2 - hand * 0.15, tilt: 3 });
    s += RK(rs, 135, 1290, 0.6, { t, uid: 'rk', outfit: 'harian' });
    s += kori(950, 1000, 0.5, t, { mood: 'normal', arm: -38, flip: true, tilt: 6 });
    return s;
  },
};
const mixBar = (p) => (p < 0.5 ? '#F8C038' : p < 0.8 ? '#F28C4B' : '#E8665F');

// ================================================================ 8. OTAK: TERSUMBAT ATAU PECAH (76.7 - 80.9)
const S8 = {
  t0: 76.7, tr: { type: 'wipe', d: 0.5 },
  draw(t) {
    const u = t - 76.7;
    let s = BG('sbD8');
    s += chip(540, 262, 'STROKE: dua mekanisme berbeda', { bg: COLR.coral, fs: 38, a: clamp(u / 0.3, 0, 1), w: 900 });
    const pa = clamp((t - 78.1) / 1.4, 0, 1), pb = clamp((t - 78.8) / 1.5, 0, 1);
    const ca = clamp((u - 0.2) / 0.4, 0, 1);
    const card = (cx, title, sub, col, inner) => `<g opacity="${f1(ca)}">${R(cx - 245, 360, 490, 640, 'rgba(0,0,0,.28)', 44)}${R(cx - 245, 350, 490, 640, '#0A3830', 44)}${R(cx - 245, 350, 490, 640, 'none', 44, `stroke="${col}" stroke-width="6"`)}${inner}${R(cx - 205, 850, 410, 104, col, 36)}${T(cx, 900, title, COLR.ink, 36)}${T(cx, 940, sub, COLR.ink, 26)}</g>`;
    s += card(290, 'TERSUMBAT', 'stroke iskemik', COLR.gold, H.brainStroke(290, 600, 0.78, 'iskemik', pa, t));
    s += card(790, 'PECAH', 'stroke hemoragik', COLR.coral, H.brainStroke(790, 600, 0.78, 'hemoragik', pb, t));
    if (u >= 2.4) s += `<g opacity="${f1(clamp((u - 2.4) / 0.4, 0, 1))}">${lab2(600, 1050, 'Stroke punya banyak penyebab;', { fs: 28, bg: 'rgba(0,0,0,.55)' })}${lab2(600, 1104, 'tekanan darah tinggi: salah satu faktor risiko utama', { fs: 26, bg: 'rgba(0,0,0,.55)' })}</g>`;
    // Raka menunjuk bergantian kiri (tersumbat) lalu kanan (pecah)
    const pl = rk('waspada', 'netral', { legs: { dir: 0 }, armL: { wx: 22, wy: 300, ex: 48, ey: 376, finger: 1, fa: -126, front: 1 }, yaw: -0.4, gazeX: -0.8, gazeY: -0.5 });
    const pr_ = rk('khawatir', 'menunjuk', { legs: { dir: 0 }, armR: { wx: 372, wy: 300, ex: 352, ey: 376, finger: 1, fa: -54, front: 1 }, yaw: 0.4, gazeX: 0.8, gazeY: -0.5 });
    const rs = trackR(u, [{ t: 0, d: 0.01, s: rk('waspada', 'netral', { legs: { dir: 0 } }) }, { t: 1.0, d: 0.35, s: pl }, { t: 2.1, d: 0.4, s: pr_ }, { t: 3.4, d: 0.4, s: rk('khawatir', 'pegang_dada', { legs: { dir: 0 } }) }]);
    s += RK(rs, 120, 1345, 0.58, { t, uid: 'rk', outfit: 'harian' });
    s += kori(940, 1260, 0.48, t, { mood: 'normal', arm: -30, flip: true, tilt: 6 });
    return s;
  },
};

// ================================================================ 9. GINJAL (80.92 - 85.0)
const S9 = {
  t0: 80.92, tr: { type: 'iris', d: 0.7, cx: 300, cy: 600 },
  draw(t) {
    const u = t - 80.92;
    const dmg = sm((t - 83.0) / 1.9);
    let s = BG('sbD9');
    s += chip(540, 262, 'GINJAL: penyaring darah', { bg: COLR.coral, fs: 38, a: clamp(u / 0.3, 0, 1), w: 860 });
    s += H.kidney(290, 640, 0.9, { hl: 1 });
    // lensa dari ginjal ke glomerulus
    const za = clamp((u - 0.5) / 0.4, 0, 1);
    s += `<g opacity="${f1(za)}"><path d="M${f1(290 - 50 * 0.9 + 18)} ${f1(640 - 70 * 0.9 - 30)}L560 600M${f1(290 - 50 * 0.9 + 28)} ${f1(640 - 70 * 0.9 + 28)}L560 880" stroke="#fff" stroke-width="4" stroke-dasharray="12 12" fill="none"/></g>`;
    s += `<g opacity="${f1(za)}">${C(780, 740, 270, 'rgba(0,0,0,.28)')}${C(780, 740, 262, '#0F4A43', 'stroke="#fff" stroke-width="6"')}${H.glomerulus(770, 740, 0.58, { dmg, t })}</g>`;
    const la = clamp((u - 1.3) / 0.4, 0, 1);
    s += H.label(250, 590, 120, 330, 'Ginjal', { a: la, anchor: 'start' });
    s += H.label(770, 740, 900, 1040, 'Glomerulus (saring darah)', { a: la, anchor: 'end', fs: 28 });
    if (t >= 83.2) s += H.label(640, 560, 760, 470, 'Pembuluh kecil', { a: clamp((t - 83.2) / 0.4, 0, 1), fs: 28, anchor: 'start' });
    if (t >= 83.9) s += lab2(640, 1150, 'Perlahan rusak: penyaringan menurun', { fs: 28, bg: COLR.coral, a: clamp((t - 83.9) / 0.4, 0, 1) });
    // Raka: tangan di pinggang (area ginjal), lalu menunjuk glomerulus
    const waist = rk('waspada', 'netral', { legs: { dir: 0 }, armL: { wx: 128, wy: 528, ex: 62, ey: 478, finger: 0, front: 1 }, armR: { wx: 272, wy: 528, ex: 338, ey: 478, finger: 0, front: 1 }, yaw: 0.2, gazeX: 0.5, gazeY: -0.4 });
    const point = rk('khawatir', 'menunjuk', { legs: { dir: 0 }, armR: { wx: 372, wy: 330, ex: 350, ey: 392, finger: 1, fa: -50, front: 1 }, yaw: 0.35, gazeX: 0.7, gazeY: -0.5 });
    const rs = trackR(u, [{ t: 0, d: 0.01, s: rk('penasaran', 'netral', { legs: { dir: 0 } }) }, { t: 0.2, d: 0.35, s: waist }, { t: 2.0, d: 0.45, s: point }]);
    s += RK(rs, 190, 1345, 0.62, { t, uid: 'rk', outfit: 'harian' });
    s += kori(940, 1270, 0.48, t, { mood: 'normal', arm: -30, flip: true, tilt: 6 });
    return s;
  },
};

export const SCENES_D2 = [S5A, S5B, S6, S7, S8, S9];

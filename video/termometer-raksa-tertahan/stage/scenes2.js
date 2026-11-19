// Adegan 5 - 6 (perbandingan dengan termometer bebas merkuri, ringkasan) dan outro SpO2 (web asli + master suara yang sama).
import { f1, clamp, lerp, R, C, P, T, INK, GOLD, MC, FONT, FOREST, seg, win, eo, eio, sm, pill, pop, rndf, tw } from './lib.js';
import { raka, rakaSvg, lerpState, rIdle, solveArm } from './raka.js';
import { G, sim, xOfT } from './physics.js';
import { thermo } from './thermo.js';
import * as TL from './timeline.js';
import { camT, proj, gOp, kw, leader, pillAt, captions, A, OFF } from './scenes.js';
export const bgDark = `<defs><linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#103F4A"/><stop offset="1" stop-color="#0A2B34"/></linearGradient></defs>${R(-1000, -1000, 4000, 5000, 'url(#g2)')}`;
const U0 = [G.bx, G.by];
const place = (s, x, y) => `translate(${f1(x)} ${f1(y)}) scale(${s}) translate(${-U0[0]} ${-U0[1]})`;
// ---------------------------------------------------------------- termometer digital (bebas merkuri), vektor datar
export function digital(x, y, s = 1, reading = '36,8', on = 1) {
  return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})"><rect x="-10" y="-34" width="440" height="68" rx="34" fill="#F4F1E6" stroke="${INK}" stroke-width="6"/><path d="M-10 -34C-60 -34 -70 -6 -70 0C-70 6 -60 34 -10 34Z" fill="#B9C7D0" stroke="${INK}" stroke-width="6"/><rect x="140" y="-22" width="160" height="44" rx="12" fill="#0B1A20" stroke="${INK}" stroke-width="3"/><text x="220" y="12" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="34" fill="#9DE0BD" opacity="${on}">${reading}</text><circle cx="360" cy="0" r="16" fill="#00A383" stroke="${INK}" stroke-width="4"/><text x="318" y="-26" font-family="${FONT}" font-weight="800" font-size="1" fill="none"></text></g>`;
}
const crack = (x, y, a) => `<g opacity="${f1(a * 100) / 100}" transform="translate(${x} ${y})"><path d="M0 -50L14 -22L-8 -6L16 16L-4 46" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><path d="M0 -50L14 -22L-8 -6L16 16L-4 46" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></g>`;
// ---------------------------------------------------------------- B5: perbandingan (pecah -> uap berbahaya; digital sebagai alternatif)
export function sceneCompare(tn) {
  const a = kw(tn, A.digital - 0.3, A.jadi - 0.1, 0.3);
  const kd = seg(tn, A.digital, A.digital + 0.5, eo);
  const sH = { Tb: 31, tip: 645, gap: 58, zone: 0, mode: 'hold' };
  const away = seg(tn, A.beralih, A.beralih + 0.8, sm);
  const MS = 0.85, MX = 150, MY = 700, FLOOR = 880;
  let s = bgDark + `<g opacity="${f1(a * 100) / 100}">`;
  s += R(-100, FLOOR, 1300, 12, '#1D5560') + R(-100, FLOOR + 12, 1300, 80, '#0B3039');
  // termometer merkuri (retak) di atas; memudar saat alat digital dipilih
  s += `<g opacity="${f1((1 - 0.65 * away) * 100) / 100}"><g transform="${place(MS, MX, MY)}">${thermo(sH, { detail: 1, t: tn, heatShow: false })}</g>`;
  const ox = MX + (330 - 170) * MS, oy = MY + 10;
  const ck = seg(tn, A.pecah, A.pecah + 0.35);
  if (ck > 0) s += crack(ox, oy, ck);
  const tb = tn - A.pecah, tsp = tn - A.tersebar;
  if (tb > 0) {
    for (let i = 0; i < 9; i++) {
      const vx = (rndf(i * 2.3) - 0.4) * 130, vy0 = -60 - rndf(i + 7) * 50, g = 900, t = Math.min(tb, 3);
      const tFall = (-vy0 + Math.sqrt(vy0 * vy0 + 2 * g * (FLOOR - oy))) / g;
      let x = ox + vx * Math.min(t, tFall), y = oy + vy0 * t + 0.5 * g * t * t;
      if (t >= tFall) { const bt = t - tFall; y = FLOOR - 6 - Math.abs(Math.sin(bt * 8)) * 26 * Math.exp(-bt * 3.2); x += vx * 0.25 * Math.min(bt, 1); }
      const spread = tsp > 0 ? Math.min(tsp, 2.5) * (rndf(i + 11) - 0.35) * 110 : 0;
      s += `<circle cx="${f1(x + spread)}" cy="${f1(y)}" r="${f1(8 + rndf(i + 1) * 5)}" fill="#C9D4DB" stroke="#5B6B77" stroke-width="2.5"/><circle cx="${f1(x + spread - 2.5)}" cy="${f1(y - 3)}" r="2.8" fill="#fff"/>`;
    }
  }
  const ku = kw(tn, A.uap, A.beralih + 0.4, 0.4);
  if (ku > 0.01) for (let i = 0; i < 7; i++) { const ph = (tn * 0.5 + i * 0.15) % 1, x = ox - 120 + i * 62, y = FLOOR - 10 - ph * 190; s += `<path d="M${f1(x)} ${f1(y)}q16 -24 0 -48t0 -48" fill="none" stroke="#B7C4CC" stroke-width="8" stroke-linecap="round" opacity="${f1(0.75 * ku * Math.sin(ph * Math.PI))}"/>`; }
  s += `</g>`;
  s += `<g opacity="${f1(a * kd * 100) / 100}">${digital(260 + (1 - kd) * 60, 1090, 1.3, '36,8')}</g></g>`;
  const kr = seg(tn, A.beralih - 0.1, A.beralih + 0.7, eo);
  if (kr > 0.01) {
    const RKx = 900, top = 640 + (1 - kr) * 300, sc = 1.0;
    let st = raka('senang', 'netral', { yaw: -0.15, tilt: -3 });
    st.armL = solveArm(st, 'L', [(820 - (RKx - 200 * sc)) / sc, (1090 - top) / sc], { len: 215, finger: 0, front: 1 });
    st = rIdle(st, tn);
    s += `<g opacity="${f1(a * kr * 100) / 100}" transform="translate(${f1(RKx - 200 * sc)} ${f1(top)}) scale(${sc})">${rakaSvg(st, { bare: true, shadow: false, uid: 'rkC', dark: true })}</g>`;
    s += `<g opacity="${f1(a * kr * 100) / 100}">${digital(260, 1090, 1.3, '36,8')}</g>`;
  }
  let u = pillAt(tn, A.digital, A.pecah, ['Termometer digital'], 250, { bg: '#fff' });
  const kp = kw(tn, A.pecah, A.beralih - 0.1, 0.3);
  if (kp > 0.01) u += `<g opacity="${f1(kp * 100) / 100}">${pill(['Merkuri berbahaya', 'jika terlepas'], 540, 250, { size: 50, bg: '#D9382F', fg: '#fff' })}${tn > A.uap ? `<g transform="translate(930 700) scale(1.3)"><path d="M0 -46L48 38H-48Z" fill="${GOLD}" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/><path d="M0 -14V12" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><circle cx="0" cy="26" r="5.5" fill="${INK}"/></g>` : ''}</g>`;
  const kb = kw(tn, A.beralih, A.jadi - 0.1, 0.3);
  if (kb > 0.01) u += `<g opacity="${f1(kb * 100) / 100}">${pill(['Kini ada alternatif', 'bebas merkuri'], 540, 250, { size: 50, bg: '#00A383', fg: '#fff' })}<g transform="translate(160 1090)"><circle r="34" fill="#00A383" stroke="${INK}" stroke-width="5"/><path d="M-15 0L-4 11L16 -11" stroke="#fff" stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g></g>`;
  return { A: s, U: u };
}
// ---------------------------------------------------------------- B6: ringkasan MEMUAI -> NAIK -> TERTAHAN (komponen bergerak masuk)
const TILES = [
  { key: 'pemuaian', txt: 'MEMUAI', from: [170, 900], col: '#F8704F', draw: (x, y) => `<ellipse cx="${x}" cy="${y}" rx="62" ry="38" fill="#C9D4DB" stroke="${INK}" stroke-width="5"/>${[0, 90, 180, 270].map((a) => `<path transform="translate(${x} ${y}) rotate(${a}) translate(70 0)" d="M0 0h26M16 -8l10 8l-10 8" stroke="#FF7A45" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`).join('')}` },
  { key: 'saluranSempit', txt: 'NAIK', from: [620, 900], col: GOLD, draw: (x, y) => `<rect x="${x - 90}" y="${y - 12}" width="180" height="24" rx="12" fill="#183B46" stroke="${INK}" stroke-width="4"/><rect x="${x - 86}" y="${y - 6}" width="120" height="12" rx="6" fill="#C9D4DB"/><path d="M${x + 40} ${y}h40M${x + 66} ${y - 12}l14 12l-14 12" stroke="#00A383" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>` },
  { key: 'penyempitanKecil', txt: 'TERTAHAN', from: [G.neckX, 900], col: '#00A383', draw: (x, y) => `<path d="M${x - 90} ${y - 16}H${x - 12}Q${x} ${y - 16} ${x} ${y - 4}Q${x} ${y} ${x + 12} ${y - 2}H${x + 90}V${y + 8}H${x + 12}Q${x} ${y + 8} ${x} ${y + 12}Q${x} ${y + 20} ${x - 12} ${y + 20}H${x - 90}Z" fill="#183B46" stroke="${INK}" stroke-width="4"/><rect x="${x + 8}" y="${y - 3}" width="74" height="9" rx="4" fill="#C9D4DB"/><rect x="${x - 82}" y="${y - 6}" width="52" height="16" rx="8" fill="#C9D4DB"/><path d="M${x - 30} ${y - 40}v-0" stroke="none"/><g transform="translate(${x} ${y - 46})"><rect x="-24" y="-8" width="48" height="36" rx="8" fill="#00A383" stroke="${INK}" stroke-width="4"/><path d="M-12 -8v-12a12 12 0 0 1 24 0v12" fill="none" stroke="${INK}" stroke-width="6"/></g>` },
];
export function sceneSummary(tn) {
  const a = kw(tn, A.jadi - 0.3, TL.EDU_END + 0.4, 0.3);
  const S = { ...sim(A.membaca + 0.5) };
  const cam = { cx: 548, cy: 900, z: 1.12, sy: 640 };
  let s = bgDark + `<g opacity="${f1(a * 100) / 100}"><g transform="${camT(cam.cx, cam.cy, cam.z, cam.sy)}">${thermo(S, { detail: 1, t: tn, heatShow: false })}</g>`;
  const pos = [[190, 1010], [540, 1010], [890, 1010]];
  TILES.forEach((tl, i) => {
    const t0 = A[tl.key], k = seg(tn, t0, t0 + 0.7, eio), pr = proj(cam, tl.from[0], tl.from[1]);
    // pulsa di lokasi asal pada termometer
    const pulse = kw(tn, t0 - 0.3, t0 + 0.7, 0.2);
    if (pulse > 0.01) s += `<circle cx="${f1((pr[0] - 540) / cam.z + 540)}" cy="${f1(0)}" r="0" fill="none"/>`;
    const sx = lerp(pr[0], pos[i][0], k), sy = lerp(pr[1], pos[i][1], k), sc = lerp(0.25, 1, k);
    if (k > 0.001) s += `<g opacity="${f1(Math.min(1, k * 2) * 100) / 100}" transform="translate(${f1(sx)} ${f1(sy)}) scale(${f1(sc)})">${R(-165, -150, 330, 300, 'rgba(8,18,30,.92)', 36, `stroke="${tl.col}" stroke-width="8"`)}<g transform="translate(0 -30)">${tl.draw(0, 0)}</g>${T(tl.txt, 0, 112, { size: 54, fill: '#fff' })}</g>`;
  });
  s += `</g>`;
  let u = '';
  const kk = seg(tn, A.penyempitanKecil + 0.9, A.penyempitanKecil + 1.5, eo);
  if (kk > 0.01) u += pill(['MEMUAI → NAIK → TERTAHAN'], 540, 250, { a: kk, size: 56, bg: GOLD, fg: INK });
  return { A: s, U: u };
}
// ---------------------------------------------------------------- outro: web asli + master suara (sama dengan video SpO2/jamu)
export const OUTRO_FRAMES = 455;
const RECT_A = { x: 70, y: 340, w: 940, h: 1156 }, RECT_B = { x: 280, y: 800, w: 520, h: 639 };
export function outroState(t) {
  const to = t - TL.O0, kk = seg(to, 9.0, 9.75, eio);
  const rect = { x: lerp(RECT_A.x, RECT_B.x, kk), y: lerp(RECT_A.y, RECT_B.y, kk), w: lerp(RECT_A.w, RECT_B.w, kk), h: lerp(RECT_A.h, RECT_B.h, kk) };
  return { to, rect, frame: clamp(Math.round(to * 30), 0, OUTRO_FRAMES - 1), cream: kk, kk };
}
function wrapText(s, size, maxW) { const words = s.split(' '), lines = []; let cur = ''; for (const w of words) { const t = cur ? cur + ' ' + w : w; if (cur && tw(t, size) > maxW) { lines.push(cur); cur = w; } else cur = t; } if (cur) lines.push(cur); return lines; }
export function outroUI(t) {
  const { to, rect, cream, kk } = outroState(t);
  const a = seg(to, 0, 0.35);
  let bg = `<g opacity="${f1(a * 100) / 100}">${R(-10, -10, 1100, 1940, '#0B2F38')}</g>` + `<g opacity="${f1(cream * 100) / 100}">${R(-10, -10, 1100, 1940, '#F7F2E4')}<circle cx="0" cy="1500" r="300" fill="#EAF3E0"/><circle cx="1040" cy="260" r="260" fill="#EAF3E0"/></g>`;
  let u = '';
  u += `<g opacity="${f1(a * 100) / 100}"><rect x="${f1(rect.x - 8)}" y="${f1(rect.y - 8)}" width="${f1(rect.w + 16)}" height="${f1(rect.h + 16)}" rx="${f1(lerp(28, 22, kk))}" fill="none" stroke="${cream > 0.5 ? FOREST : GOLD}" stroke-width="8"/></g>`;
  const lab = [[5.0, 6.7, 'Materi per bab'], [6.7, 7.75, 'Latihan soal + pembahasan'], [7.75, 9.2, 'Simulasi Dokter']];
  for (const [a0, a1, tx] of lab) { const k = kw(to, a0, a1, 0.25); if (k > 0.01) u += pill([tx], 540, 255 + (1 - eo(clamp((to - a0) / 0.3))) * -40, { a: k, size: 50, bg: '#fff' }); }
  const ke = seg(to, 9.35, 9.95, eo);
  if (ke > 0.01) u += `<g opacity="${f1(ke * 100) / 100}" transform="translate(0 ${f1((1 - ke) * -30)})"><image href="logo-full.webp" x="170" y="290" width="740" height="${f1(740 * 160 / 794)}" preserveAspectRatio="xMidYMid meet"/>${T('Belajar FK gratis di MEDCOEL', 540, 520, { size: 56, fill: FOREST })}${R(250, 590, 580, 128, FOREST, 64)}${T('medcoel.com', 540, 680, { size: 82, fill: GOLD })}</g>`;
  const caps = [[1.2, 4.56, 'Masih penasaran? Lanjutkan belajarnya di MEDCOEL.'], [5.06, 8.98, 'Jelajahi materi per bab, latihan soal, dan simulasi dokter.'], [9.54, 11.7, 'Semuanya gratis di medcoel.com.']];
  for (const [a0, a1, tx] of caps) { const k = kw(to, a0, a1, 0.12); if (k > 0.01 && (to < 9.4 || a0 > 9)) { const ls = wrapText(tx, 48, 820), y = a0 > 9 ? 1470 : 1330, h = ls.length * 58 + 30; u += `<g opacity="${f1(k * 100) / 100}">${R(100, y + 6, 880, h, 'rgba(0,0,0,.25)', 30)}${R(100, y, 880, h, 'rgba(8,16,28,.92)', 30)}${ls.map((l, i) => T(l, 540, y + 14 + 42 + i * 58, { size: 48, fill: '#fff' })).join('')}</g>`; } }
  return { bg, u };
}

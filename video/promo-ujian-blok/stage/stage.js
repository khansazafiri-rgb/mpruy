// Promo MEDCOEL "Besok ujian blok" (1080 x 1920, 30 fps, 42,04 dtk; durasi mengikuti narasi audio/narator.wav).
// Cerita animasi (kamar belajar, kartu "satu langkah") + rekaman web MEDCOEL ASLI (tampilan ponsel, frame dari rekam/web.cjs) dalam panel ponsel yang membesar dari layar ponsel Raka.
import { f1, MC, FONT, clamp, lerp, seg, eo, eio, sm, win, pchip } from './core.js';
import * as A from './art.js';
import { bg } from './bg.js';
import { roomScene, roomBackdrop, rakaState, rakaDesk, desk, phone, phoneScreen, PHONE, DESK_Y } from './room.js';
import { raka, rakaBody, lerpState, rIdle, solveArm } from './raka.js';
const q = new URLSearchParams(location.search), $ = (id) => document.getElementById(id);
await document.fonts.load('800 40px "Plus Jakarta Sans"'); await document.fonts.load('700 30px "Plus Jakarta Sans"'); await document.fonts.ready;
export const DUR = 42.04;
const P1 = { x: 60, y: 330, w: 960, h: 1100 };                 // panel ponsel (aman dari tombol TikTok/Reels: y 330 - 1430)
const WEB = '/video/promo-ujian-blok/rekam/web';
const lerpR = (a, b, k) => ({ x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), w: lerp(a.w, b.w, k), h: lerp(a.h, b.h, k) });

// ------------------------------------------------------------------ jadwal rekaman web: [t0, t1, klip, bingkai0, bingkai1, tampilan0, tampilan1]; tampilan = [cx, cy, z] dalam piksel sumber 1080 x 1800
// Bingkai dipetakan linear antar (t0, t1); kecepatan berbeda per potongan. cx, cy = titik sumber di pusat panel; z = perbesaran (1 = lebar penuh).
export const SEG = [
  [7.2, 8.3, 'mk', 0, 20, [540, 620, 1], [540, 620, 1]],
  [8.3, 10.0, 'mk', 20, 74, [540, 620, 1], [540, 700, 1]],
  [10.0, 10.9, 'bab', 40, 75, [540, 760, 1], [540, 640, 1]],
  [10.9, 12.0, 'materi', 36, 108, [540, 640, 1], [540, 660, 1]],
  [12.0, 13.7, 'latihan', 0, 86, [540, 900, 1], [540, 1050, 1]],
  [13.7, 15.4, 'learning', 50, 95, [540, 1050, 1], [540, 1050, 1.12]],
  [15.4, 16.6, 'learning', 95, 140, [540, 700, 1], [540, 700, 1]],
  [16.6, 19.3, 'learning', 140, 216, [540, 760, 1], [540, 1100, 1]],
  [38.7, 42.04, 'akhir', 0, 111, [540, 900, 1], [540, 700, 1]],
];
export const UJIAN_SEG = [];   // diisi di bawah setelah rekaman ujian ditinjau
SEG.push(...UJIAN_SEG);

const urlOf = (clip, i) => `${WEB}/${clip}/f${String(i).padStart(4, '0')}.jpg`;
const segAt = (t) => { for (const s of SEG) if (t >= s[0] && t < s[1]) return s; return null; };
const cache = new Map();
const load = (u) => { if (!cache.has(u)) { const im = new Image(); im.src = u; cache.set(u, im.decode().catch(() => {})); } return cache.get(u); };
function frameAt(t) {
  const s = segAt(t) || (t < SEG[0][0] ? SEG[0] : [...SEG].reverse().find((x) => t >= x[1]) || SEG[0]);
  const u = clamp((t - s[0]) / (s[1] - s[0])), eu = u, fr = Math.round(lerp(s[3], s[4], eu));
  const v = [0, 1, 2].map((i) => lerp(s[5][i], s[6][i], sm(u)));
  return { clip: s[2], fr, view: v };
}
// ------------------------------------------------------------------ panel ponsel
function panelRect(t) {
  const ph = phoneScreen();
  if (t < 6.3) return null;
  if (t < 7.4) return { r: lerpR(ph, P1, eio((t - 6.3) / 1.1)), a: 1 };
  if (t < 32.3) return { r: P1, a: 1 };
  if (t < 33.0) { const k = (t - 32.3) / 0.7; return { r: lerpR(P1, { x: 540 - 380, y: 560, w: 760, h: 900 }, eio(k)), a: 1 - sm(k) }; }
  if (t < 38.0) return null;
  if (t < 38.8) return { r: lerpR(ph, P1, eio((t - 38.0) / 0.8)), a: 1 };
  return { r: P1, a: 1 };
}
function panel(t) {
  const pr = panelRect(t); if (!pr) return '';
  const { r, a } = pr, f = frameAt(Math.max(t, 7.2)), view = f.view, sc = (r.w / 1080) * view[2];
  const x = r.x + r.w / 2 - view[0] * sc, y = r.y + r.h / 2 - view[1] * sc;
  const rad = lerp(26, 56, clamp(r.w / P1.w)), bez = lerp(4, 14, clamp(r.w / P1.w));
  const grow = t < 7.4 ? seg(t, 6.7, 7.2) : t > 38 && t < 38.8 ? seg(t, 38.3, 38.8) : 1;
  const img = grow > 0.001 ? `<g opacity="${f1(grow)}"><image href="${urlOf(f.clip, f.fr)}" x="${f1(x)}" y="${f1(y)}" width="${f1(1080 * sc)}" height="${f1(1800 * sc)}" preserveAspectRatio="none"/></g>` : '';
  return `<g opacity="${f1(a)}"><rect x="${f1(r.x - bez)}" y="${f1(r.y - bez + 8)}" width="${f1(r.w + 2 * bez)}" height="${f1(r.h + 2 * bez)}" rx="${f1(rad + bez)}" fill="#021014" opacity=".35"/><rect x="${f1(r.x - bez)}" y="${f1(r.y - bez)}" width="${f1(r.w + 2 * bez)}" height="${f1(r.h + 2 * bez)}" rx="${f1(rad + bez)}" fill="#141D26" stroke="#3B4D5B" stroke-width="3"/><clipPath id="clipPanel"><rect x="${f1(r.x)}" y="${f1(r.y)}" width="${f1(r.w)}" height="${f1(r.h)}" rx="${f1(rad)}"/></clipPath><rect x="${f1(r.x)}" y="${f1(r.y)}" width="${f1(r.w)}" height="${f1(r.h)}" rx="${f1(rad)}" fill="${MC.ivory}"/><g clip-path="url(#clipPanel)">${img}</g></g>`;
}
// ------------------------------------------------------------------ Raka kecil (reaksi) di sudut panel
const REACT = [[7.2, 'penasaran'], [8.6, 'mengerti'], [12.0, 'senang'], [13.7, 'berpikir'], [17.0, 'mengerti'], [19.8, 'waspada'], [23.2, 'lega'], [25.8, 'berpikir'], [29.5, 'mengerti'], [38.7, 'senang']];
function reaction(t) {
  const a = seg(t, 7.4, 7.9, eo) * (t > 32.3 && t < 38.7 ? 0 : 1) * (t >= 38.7 ? seg(t, 38.8, 39.2, eo) : 1);
  if (a <= 0.01 || (t > 32.3 && t < 38.7)) return '';
  let ex = 'penasaran'; for (const [t0, e] of REACT) if (t >= t0) ex = e;
  const st = rIdle(raka(ex, 'netral', { yaw: 0.2, gazeX: 0.3, gazeY: -0.1 }), t * 1.1), k = 0.6, cx = 920, cy = 395, R = 100;
  const sb = Math.sin(t * 9) * 0.0;
  return `<g opacity="${f1(a)}"><circle cx="${cx + 5}" cy="${cy + 8}" r="${R + 8}" fill="#021014" opacity=".35"/><circle cx="${cx}" cy="${cy}" r="${R + 8}" fill="${MC.ivory}" stroke="${MC.ink}" stroke-width="4"/><clipPath id="clipRx"><circle cx="${cx}" cy="${cy}" r="${R}"/></clipPath><circle cx="${cx}" cy="${cy}" r="${R}" fill="#12474F"/><g clip-path="url(#clipRx)"><g transform="translate(${f1(cx - 200 * k)} ${f1(cy - 225 * k)}) scale(${k})">${rakaBody(st, 'rkx', { dark: true })}</g></g></g>`;
}
// ------------------------------------------------------------------ label langkah (di atas panel) dan sorotan
const STEPS = [
  [7.6, 10.2, '1  Pilih mata kuliah'], [10.2, 11.95, '2  Materi per BAB'], [12.0, 13.9, '3  Latihan soal BAB yang sama'],
  [14.1, 19.3, 'Mode Learning: pembahasan per soal'], [19.8, 25.3, 'Mode Ujian: pembahasan setelah sesi'], [25.8, 32.3, 'Ulangi soal yang pernah salah'],
  [38.9, 42.04, 'Buka medcoel.com'],
];
function steps(t) {
  let g = '';
  for (const [t0, t1, txt] of STEPS) { const a = clamp((t - t0) / 0.3) * clamp((t1 - t) / 0.3); if (a <= 0.01) continue; g += A.tag(540, 280, txt, { fs: 42, a: sm(a), bg: MC.gold, fg: MC.ink, stroke: MC.ink }); }
  return g;
}
// ------------------------------------------------------------------ adegan "satu langkah" (32,3 - 38,6): satu blok penuh vs semalam, lalu satu BAB yang jelas
const tile = (x, y, n, a = 1, hi = 0, k = 1) => `<g opacity="${f1(a)}" transform="translate(${f1(x)} ${f1(y)}) scale(${f1(k * 1000) / 1000})"><rect x="-40" y="-34" width="80" height="68" rx="14" fill="${hi > 0 ? MC.gold : '#DCE9E4'}" stroke="${MC.ink}" stroke-width="${hi > 0 ? 4 : 2.5}"/><text y="10" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="30" fill="${MC.ink}">${n}</text></g>`;
function stepScene(t) {
  const a = seg(t, 32.4, 33.0, eo) * (1 - seg(t, 38.2, 38.8)); if (a <= 0.01) return '';
  const aA = seg(t, 32.5, 33.0, eo), aB = seg(t, 32.9, 33.4, eo), neq = seg(t, 33.7, 34.2, eo), one = seg(t, 36.0, 36.8, eio), fadeAB = 1 - seg(t, 36.0, 36.5);
  let g = '';
  // kartu kiri: satu blok penuh (banyak BAB)
  g += `<g opacity="${f1(aA * fadeAB)}"><rect x="76" y="352" width="440" height="360" rx="40" fill="#021014" opacity=".3" transform="translate(7 10)"/><rect x="70" y="344" width="440" height="360" rx="40" fill="${MC.ivory}" stroke="${MC.ink}" stroke-width="3"/>${A.tag(290, 392, 'Satu blok penuh', { fs: 36, bg: MC.brand, stroke: MC.ink })}${Array.from({ length: 12 }, (_, i) => tile(122 + (i % 4) * 106, 478 + Math.floor(i / 4) * 92, i + 1, 1, 0, 0.98)).join('')}</g>`;
  // kartu kanan: semalam
  g += `<g opacity="${f1(aB * fadeAB)}"><rect x="596" y="352" width="410" height="360" rx="40" fill="#021014" opacity=".3" transform="translate(7 10)"/><rect x="590" y="344" width="410" height="360" rx="40" fill="${MC.ivory}" stroke="${MC.ink}" stroke-width="3"/>${A.tag(795, 392, 'Semalam', { fs: 36, bg: '#1A3668', stroke: MC.ink })}<g transform="translate(730 540)"><circle r="62" fill="#F4EBC8"/><circle cx="26" cy="-18" r="54" fill="${MC.ivory}"/></g><g transform="translate(870 560)"><circle r="56" fill="#fff" stroke="${MC.ink}" stroke-width="5"/><path d="M0 0V-34M0 0L26 14" stroke="${MC.ink}" stroke-width="6" stroke-linecap="round"/></g>${['z', 'z', 'Z'].map((z, i) => `<text x="${760 + i * 36}" y="${450 - i * 8 - ((t * 20 + i * 14) % 18)}" font-family="${FONT}" font-weight="800" font-size="${30 + i * 8}" fill="#5B7BFF" opacity=".8">${z}</text>`).join('')}</g>`;
  // "bukan pengganti"
  g += `<g opacity="${f1(neq * fadeAB)}" transform="translate(540 528) scale(${f1(0.7 + 0.3 * neq)})"><circle r="46" fill="${MC.gold}" stroke="${MC.ink}" stroke-width="4"/><text y="22" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="64" fill="${MC.ink}">≠</text></g>`;
  // satu BAB yang jelas (BAB 13 = BAB yang dipakai di rekaman): ubin emas membesar di tengah
  if (one > 0.01) { const pulse = 1 + 0.04 * Math.sin(t * 6); g += `<g opacity="${f1(one)}"><ellipse cx="540" cy="520" rx="300" ry="190" fill="url(#gLamp)"/>${tile(540, lerp(560, 520, one), '13', 1, 1, lerp(1, 2.3, one) * pulse)}${A.tag(540, 664, '1 BAB. Mulai dari sini.', { fs: 38, a: seg(t, 36.5, 37.0), bg: MC.ink, stroke: MC.gold })}</g>`; }
  return `<g opacity="${f1(a)}">${g}</g>`;
}
function rakaMid(t) {
  const e = (n, ov = {}) => raka(n, 'duduk', ov);
  let st = t < 35.7 ? lerpState(e('sedih', { gazeY: 0.2, tilt: 3 }), e('khawatir', { gazeY: 0.1, tilt: -2 }), seg(t, 33.4, 35.2)) : lerpState(e('khawatir'), e('mengerti', { yaw: 0, gazeX: 0.2, gazeY: -0.3 }), seg(t, 35.7, 36.4));
  const lerpArm = (a, b, k) => { const o = {}; for (const key of Object.keys(a)) o[key] = typeof a[key] === 'number' ? lerp(a[key], b[key], k) : a[key]; return o; };
  const pt = seg(t, 36.2, 36.8, eo) * (1 - seg(t, 37.8, 38.2)), grab = seg(t, 37.9, 38.4, eio);
  const L0 = solveArm(st, 'L', [150, 556], { finger: 0, front: 1, len: 170 });
  const R0 = solveArm(st, 'R', [250, 556], { finger: 0, front: 1, len: 170 }), R1 = solveArm(st, 'R', [330, 300], { finger: 1, fa: -78, front: 1, len: 190 });
  const R2 = solveArm(st, 'R', [(PHONE.cx - 540) / 1.2 + 194, 590], { finger: 0, front: 1, len: 230 });
  st.armL = L0; st.armR = lerpArm(lerpArm(R0, R1, pt), R2, grab); st.breath = 0.5 + 0.5 * Math.sin(t * 2.2);
  return rIdle(st, t);
}
function midRoom(t) {
  const a = seg(t, 32.3, 33.0, eo) * (1 - seg(t, 38.4, 38.9));
  if (a <= 0.01) return '';
  const st = rakaMid(t), glow = seg(t, 37.9, 38.3);
  return `<g opacity="${f1(a)}">${roomBackdrop(t)}${rakaDesk(t, st)}${desk()}${phone(t, 37.9)}</g>`;
}
// ------------------------------------------------------------------ tampilan akhir: logo + medcoel.com
function endCard(t) {
  const a = seg(t, 40.0, 40.5, eo); if (a <= 0.01) return '';
  return `<g opacity="${f1(a)}"><rect x="40" y="236" width="256" height="64" rx="32" fill="${MC.ivory}" stroke="${MC.ink}" stroke-width="3"/><image href="logo-full.webp" x="58" y="247" height="42" preserveAspectRatio="xMinYMid meet"/></g>`;
}

export function master(t) {
  const room = 1 - seg(t, 6.9, 7.6);
  let g = bg(t);
  if (t < 7.7) g += `<g opacity="${f1(room)}">${roomScene(t)}</g>`;
  g += midRoom(t) + stepScene(t) + panel(t) + reaction(t) + steps(t) + endCard(t);
  if (t < 7.2) g += A.chips(t, [[1.9, 3.7, 'PPT numpuk', 230, 1030, 230, 800], [3.2, 5.0, 'Soal belum\ndisentuh', 975, 1150, 880, 800]]);
  return g;
}
async function renderFrame(t) {
  const f = frameAt(Math.max(t, 7.2)); const pr = panelRect(t);
  if (pr) await Promise.all([load(urlOf(f.clip, f.fr))]);
  $('scene').innerHTML = A.defs() + master(t);
  await new Promise((r) => requestAnimationFrame(() => r()));
}
window.renderFrame = renderFrame; await renderFrame(+(q.get('t') ?? 0)); window.__ready = true;

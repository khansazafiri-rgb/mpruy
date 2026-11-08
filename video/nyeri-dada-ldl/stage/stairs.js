// Adegan tangga: Raka naik, dada tertekan, keringat dingin, jatuh terduduk (0 - 8 dtk) dan kembali ke Raka duduk (44 - 51 dtk).
// Raka memakai rakaSvg() asli. Kaki memakai rig berengsel (legs.on = 1); tiap kaki ditempatkan LANGSUNG pada permukaan anak tangga
// (posisi telapak dunia -> dx dan lift lokal), badan naik mengikuti kaki penumpu, jadi kontak kaki-tangga wajar.
import { f1, clamp, lerp, sm, eo, ei, eio, seg, win, pchip, MC, FONT } from './core.js';
import { raka, rakaSvg, lerpState, rIdle, solveArm, rakaBody } from './raka.js';
import { walkCycle, PALETTE, OUTFITS } from '../../../brand/characters/raka/raka.js';
import { bg } from './bg.js';

export const K = 0.9;                       // skala Raka (px layar per px lokal)
export const WT = 128, HT = 46, DEP = 44;   // lebar anak tangga, tinggi anak tangga, kedalaman permukaan (px layar)
export const ST = { x0: 0, y0: 0 };         // anak tangga ke-i: sisi atas di y = -i*HT, mulai x = i*WT
export const SOLE = (i) => ({ x: (i + 0.5) * WT, y: -i * HT - DEP * 0.42 });    // titik telapak pada anak tangga i (tengah permukaan)

// jumlah anak tangga yang sudah dinaiki: s(t) naik terus lalu melambat sampai berhenti di bilangan bulat
const S_END = 5, T_SLOW = 2.1, V0 = 1.4, T_STOP = 4.9;
const S_OFF = S_END - (V0 * T_SLOW + V0 * (T_STOP - T_SLOW) / 2);
export const sCl = (t) => (t <= T_SLOW ? V0 * t + S_OFF : V0 * T_SLOW + S_OFF + V0 * (T_STOP - T_SLOW) * (Math.min(1, (t - T_SLOW) / (T_STOP - T_SLOW)) - Math.pow(Math.min(1, (t - T_SLOW) / (T_STOP - T_SLOW)), 2) / 2));

const ARC = 30;   // tinggi lengkung kaki ayun (px lokal)
/** pose naik tangga pada s langkah: kembali { st (state Raka), X, Y (titik pijak badan di dunia) } */
export function climb(s, o = {}) {
  const n = Math.floor(s), u = s - n;
  // kaki depan (di tangga n+1), kaki belakang berayun dari tangga n ke tangga n+2; berganti sisi tiap langkah
  const front = SOLE(n + 1), rear = SOLE(n), tgt = SOLE(n + 2);
  const e = eio(u), sw = { x: lerp(rear.x, tgt.x, e), y: lerp(rear.y, tgt.y, e) - Math.sin(Math.PI * u) * ARC * K };
  const Xb = front.x + WT * (u - 0.5) + (o.xo ?? 0), Yb = front.y + K * lerp(50, 0, eio(u));
  const swingIsL = (n % 2) === 0;
  const dxOf = (fx, side) => (fx - Xb) / K + (side === 'L' ? 38 : -38), liftOf = (fy) => (Yb - fy) / K;
  const mk = (fp, side) => { const dx = dxOf(fp.x, side), lift = liftOf(fp.y), hx = side === 'L' ? 164 : 236, ax = (side === 'L' ? 162 : 238) + dx, ay = 752 - lift, c = Math.hypot(ax - hx, ay - (566)); const kx = c < 190 ? Math.min(46, Math.sqrt(Math.max(0, 3 * c * (190 - c) / 8))) : 0; return { dx, lift, kx }; };
  const Lf = swingIsL ? sw : front, Rf = swingIsL ? front : sw;
  const Lg = mk(Lf, 'L'), Rg = mk(Rf, 'R');
  const wc = walkCycle(s / 2 + 0.25, { dir: 1, swing: 20 });
  const st = raka(o.expr || 'netral', 'jalan', { ...wc, legs: { on: 1, dir: 1, sit: 0, L: Lg, R: Rg }, bob: -6 * 0 + (o.bob ?? 0), lean: (o.lean ?? 5), yaw: 0.45, gazeX: 0.7, gazeY: -0.2 });
  return { st, X: Xb, Y: Yb, feet: { L: Lf, R: Rf } };
}

// ------------------------------------------------------------------ latar tangga (dunia, px layar)
export function stairsWorld(x0 = -400, x1 = 1400, o = {}) {
  let g = '';
  const iMin = Math.floor(x0 / WT) - 1, iMax = Math.ceil(x1 / WT) + 1;
  // dinding belakang: panel vertikal samar dan pegangan tangga di belakang Raka
  const wallH = 3600;
  g += `<g opacity=".95"><path d="M${iMin * WT - 300} ${-iMin * HT - 60}L${iMax * WT + 300} ${-iMax * HT - 60}V${-iMax * HT - wallH}H${iMin * WT - 300}Z" fill="#12474F" opacity=".5"/></g>`;
  for (let i = iMin; i <= iMax; i += 1) {
    if (i % 2 === 0) { const px = i * WT + WT * 0.5, py = -i * HT - 330; g += `<rect x="${f1(px - 5)}" y="${f1(py - 330)}" width="10" height="${f1(330 + 120)}" rx="5" fill="#2E8E88" opacity=".35"/>`; }
  }
  // pegangan tangga: garis sejajar kemiringan tangga
  const slope = -HT / WT, rail = (dy, w, c, op) => `<path d="M${iMin * WT} ${f1(iMin * WT * slope + dy)}L${iMax * WT} ${f1(iMax * WT * slope + dy)}" stroke="${c}" stroke-width="${w}" stroke-linecap="round" opacity="${op}"/>`;
  g += rail(-610, 18, '#C4E4D2', 0.55) + rail(-598, 5, '#F8F7F3', 0.5);
  // balok anak tangga (sisi depan + permukaan), digambar dari atas ke bawah supaya tumpang tindih benar
  for (let i = iMax; i >= iMin; i -= 1) {
    const x = i * WT, y = -i * HT;
    g += `<path d="M${x} ${y}h${WT}l${DEP * 0.55} ${-DEP * 0.45}h${-WT}z" fill="#F6EFDD"/>`;                      // permukaan
    g += `<path d="M${x} ${y}h${WT}V${y + 2600}H${x}z" fill="url(#stF)"/>`;                                       // sisi depan (badan tangga)
    g += `<path d="M${x} ${y}h${WT}" stroke="#FFFFFF" stroke-width="5" opacity=".7"/><path d="M${x} ${y}V${y + 2600}" stroke="#021014" stroke-width="3" opacity=".35"/>`;
  }
  return g;
}
export const stairsDefs = () => `<defs><linearGradient id="stF" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E4EEEA"/><stop offset=".08" stop-color="#9FC8BE"/><stop offset=".7" stop-color="#3E8B84"/><stop offset="1" stop-color="#1A5C5B"/></linearGradient></defs>`;


// ------------------------------------------------------------------ kaki berengsel lutut (IK dua tulang). Menggantikan rig kaki bawaan agar lutut menekuk wajar saat naik/duduk.
const PAL = { ...PALETTE, ...OUTFITS.harian.onDark };
export function stripLegs(svg, cls = 'raka-legs') {
  const a = svg.indexOf(`<g class="${cls}">`); if (a < 0) return svg;
  let d = 0, i = a;
  for (;;) { const o = svg.indexOf('<g', i + 1), c = svg.indexOf('</g>', i + 1); if (c < 0) return svg; if (o >= 0 && o < c && /^<g[\s>]/.test(svg.slice(o, o + 3))) { d += 1; i = o; } else { if (d === 0) return svg.slice(0, a) + svg.slice(c + 4); d -= 1; i = c; } }
}
const L1 = 100;
function ik(H, A, dirUp = 1) {   // lutut mengarah ke depan (+x) untuk kaki yang lurus; dirUp = 1 -> lutut di sisi "depan/atas" garis H-A
  const dx = A[0] - H[0], dy = A[1] - H[1], D = Math.hypot(dx, dy), h = D >= 2 * L1 ? 0 : Math.sqrt(L1 * L1 - D * D / 4);
  const mx = (H[0] + A[0]) / 2, my = (H[1] + A[1]) / 2; let nx = -dy / (D || 1), ny = dx / (D || 1);
  if (nx * dirUp < 0 || (Math.abs(nx) < 0.2 && ny > 0)) { nx = -nx; ny = -ny; }   // pilih normal yang menunjuk ke kanan (atau ke atas)
  return [mx + nx * h, my + ny * h];
}
function limb(pts, rs, fill) {
  let g = '';
  for (let k = 0; k < pts.length - 1; k += 1) for (let j = 0; j <= 14; j += 1) { const u = j / 14, p = [lerp(pts[k][0], pts[k + 1][0], u), lerp(pts[k][1], pts[k + 1][1], u)], r = lerp(rs[k], rs[k + 1], u); g += `<circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="${f1(r)}"/>`; }
  return `<g fill="${fill}">${g}</g>`;
}
const SHOE = (ax, ay, tilt, P) => `<g transform="translate(${f1(ax)} ${f1(ay)}) rotate(${f1(tilt)})"><path d="M-30 -10C-30 -26 -14 -28 -2 -26L16 -22C34 -18 44 -8 44 6C44 18 40 26 30 26L-24 26C-34 26 -38 16 -36 4Z" fill="${P.shoes}"/><path d="M-35 16H42C41 22 38 26 30 26H-24C-32 26 -36 22 -35 16Z" fill="${P.patchEdge}"/></g>`;
/** kaki: ankles = { L: [ax, ay], R: [ax, ay] } koordinat lokal Raka; bob = turun badan; mengembalikan SVG kaki (digambar SETELAH badan) */
export function legsSvg(ankles, bob = 0, o = {}) {
  const P = o.pal || PAL, hips = { L: [164, 566 + bob], R: [236, 566 + bob] }, far = o.far || 'R';
  const draw = (sd) => { const H = hips[sd], A = ankles[sd], K1 = ik(H, A, 1), col = sd === far ? '#2E3862' : P.pants; return limb([H, K1, A], [36, 31, 27], col) + SHOE(A[0], A[1], o.tilt?.[sd] ?? 0, P); };
  return `<g class="legs-ik">${draw(far)}${draw(far === 'L' ? 'R' : 'L')}</g>`;
}
export const withLegs = (svg, legs) => stripLegs(svg) + legs;
export const rakaBodyIK = (st, uid, ankles, o = {}) => withLegs(rakaBody(st, uid, { dark: true }), legsSvg(ankles, st.bob || 0, o));

// ------------------------------------------------------------------ Raka dalam urutan: naik -> dada tertekan -> keringat -> jatuh terduduk (0 - 8,2 dtk)
const SEAT = () => ({ x: 5.5 * WT - 52, y: -5 * HT - DEP * 0.3 });      // titik duduk: badan di tepi kiri permukaan anak tangga 5, telapak di anak tangga yang sama
const SEAT_ANK = { L: [262, 752], R: [286, 752] };                       // pergelangan lokal saat duduk (lutut ke atas, telapak datar)
export function rakaS1(t) {
  const s = sCl(Math.min(t, T_STOP));
  const base = climb(s, { expr: 'netral', bob: 0, lean: 5 });
  let st = base.st, X = base.X, Y = base.Y;
  const toLocal = (f, X0, Y0) => [200 + (f.x - X0) / K, 752 + (f.y - Y0) / K];
  const cl = base.feet;
  let ank = { L: toLocal(cl.L, X, Y), R: toLocal(cl.R, X, Y) };
  const kChest = seg(t, 2.3, 3.0, eio), kWorry = seg(t, 2.4, 3.1);
  const chestArm = solveArm(st, 'R', [222, 442], { finger: 0, front: 1, len: 168 });
  const worry = raka('khawatir', 'jalan', { yaw: 0.35, gazeX: 0.5, gazeY: 0.1 });
  st = lerpState(st, { ...st, armR: chestArm, browL: worry.browL, browR: worry.browR, mouth: worry.mouth, wide: worry.wide }, Math.max(kChest, kWorry));
  st.lean = lerp(st.lean, 11, seg(t, 3.0, 4.9));
  st.slump = 22 * seg(t, 3.4, 5.4);
  st.sweat = seg(t, 4.9, 5.9);
  const fa = seg(t, 5.5, 6.3, eio), fb = seg(t, 6.3, 7.15, eio);
  const feetW = { L: cl.L, R: cl.R };
  if (fa > 0) { st.bob = 46 * fa; st.lean = lerp(st.lean, 14, fa); st.tilt = 4 * fa; }
  if (fb > 0) {
    const sp = SEAT(), Xs = sp.x, Ys = sp.y;
    st.bob = lerp(46, 176, fb); st.lean = lerp(14, -7, fb); st.tilt = lerp(4, -4, fb); st.slump = lerp(22, 26, fb); st.yaw = lerp(st.yaw, 0.3, fb);
    const fw = (a) => ({ x: Xs + (a[0] - 200) * K, y: Ys + (a[1] - 752) * K });
    const Xn = lerp(X, Xs, fb), Yn = lerp(Y, Ys, fb);
    // pergelangan: kaki tetap menapak (dunia) lalu bergeser ke posisi duduk
    const tgt = { L: fw(SEAT_ANK.L), R: fw(SEAT_ANK.R) };
    const cur = { L: { x: lerp(cl.L.x, tgt.L.x, fb), y: lerp(cl.L.y, tgt.L.y, fb) }, R: { x: lerp(cl.R.x, tgt.R.x, fb), y: lerp(cl.R.y, tgt.R.y, fb) } };
    X = Xn; Y = Yn; ank = { L: toLocal(cur.L, X, Y), R: toLocal(cur.R, X, Y) };
    // tangan kiri layar menopang di anak tangga, tangan kanan tetap di dada
    st.armL = solveArm(st, 'L', [96, 756], { finger: 0, front: 0, len: 170 });
  }
  const land = 1 - seg(t, 7.1, 7.5);
  st.bob += -6 * Math.sin(Math.PI * clamp((t - 7.0) / 0.4)) * land;
  if (t > 5.5) { const e = raka('khawatir', null, {}); st = lerpState(st, { ...st, browL: e.browL, browR: e.browR, mouth: e.mouth, wide: e.wide }, seg(t, 5.5, 5.9)); st.blink = Math.max(st.blink, 0.5 * seg(t, 6.0, 6.5)); }
  return { st: rIdle(st, t), X, Y, ank };
}
export const rakaGroup = (st, X, Y, ank, uid = 'rk', o = {}) => `<g transform="translate(${f1(X - 200 * K)} ${f1(Y - 778 * K)}) scale(${K})">${rakaBodyIK(st, uid, ank, o)}</g>`;
export const chestWorld = (st, X, Y) => [X + (222 - 200) * K, Y + (440 + (st.bob || 0) - 778) * K];

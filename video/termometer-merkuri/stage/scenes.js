// "Kenapa angka termometer air raksa tidak langsung turun?" — adegan (1080 x 1920, 30 fps). Gaya datar 2D MEDCOEL, Raka kanonik dari brand/characters/raka (rakaSvg),
// termometer dari kode (art.js, SATU geometri di semua adegan), semua waktu dari ../cues.json (sama dengan audio/audio_mix.py). Teks digambar sebagai teks, bukan gambar.
import { f1, clamp, lerp, sm, eo, eio, seg, win, pop, track, pchip, R, C, P, T, G, FONT, tw, pill, rndf, GOLD, FOREST, INK } from './lib.js';
import { raka, rakaSvg, armShape, lerpState, idle as rIdle } from '../../../brand/characters/raka/raka.js';
import * as A from './art.js';
const CUES = await (await fetch('../cues.json')).json(); const W = CUES.w, TSEP = CUES.t_sep;
const NOCAP = new URLSearchParams(location.search).has('nocap');
const colT = pchip(CUES.colKeys);
const TIP = A.dOf(37.5), TIP0 = A.dOf(34.5);
const CREAM = '#F7F2E4', NAVY = '#0F3A47', TEAL = '#0B2F38', CORAL = '#F2735E', MINT = '#9DE0BD';
const ka = (t, t0, t1, f = 0.25) => clamp((t - t0) / f) * clamp((t1 - t) / f);
// ------------------------------------------------------------------ matriks 2D (kamera di ruang termometer)
const mul = (a, b) => [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3], a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]];
const inv = (m) => { const d = m[0] * m[3] - m[1] * m[2]; return [m[3] / d, -m[1] / d, -m[2] / d, m[0] / d, (m[2] * m[5] - m[3] * m[4]) / d, (m[1] * m[4] - m[0] * m[5]) / d]; };
const svgM = (m) => `matrix(${m.map((v) => Math.round(v * 1e5) / 1e5).join(' ')})`;
const tr = (x, y) => [1, 0, 0, 1, x, y], rot = (deg) => { const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); return [c, s, -s, c, 0, 0]; }, sc = (s) => [s, 0, 0, s, 0, 0];
const camM = (c) => mul(mul(mul(tr(c.cx, c.cy), rot(c.rot || 0)), sc(c.z)), tr(-(c.mx || 0), c.md));
const apply = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
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
// ------------------------------------------------------------------ keadaan termometer demonstrasi (B..G), satu fungsi waktu
const DLOW_KEYS = [[TSEP, 181.9], [41.0, 166], [42.0, 130], [43.2, 104], [44.6, 96]];
const dLowF = pchip(DLOW_KEYS);
export function thState(t) {
  let dUp = TIP0, dLow = 9999, heat = 0, exp = 0, contact = 0;
  if (t >= 17.26 && t < 49.9) {
    const Tc = colT(t); dUp = A.dOf(Tc); exp = clamp((Tc - 34.5) / 3);
    contact = seg(t, 17.0, 18.2, eio) * (1 - seg(t, W.dilepas, W.dilepas + 1.0, eio));
    heat = seg(t, 17.5, 20.5) * (1 - seg(t, W.dilepas + 0.2, 42.5)) - 0.3 * seg(t, 41.0, 43.5) * (1 - seg(t, 44, 47));
    if (t >= TSEP) { dLow = dLowF(Math.min(t, 44.6)); exp = Math.max(0, 1 - seg(t, TSEP, 44.6)); }
  }
  if (t >= 49.9) {        // diatur ulang: wadah terisi lagi sampai menyambung, lalu kolom turun pelan melewati penyempitan (ilustrasi alat lama)
    const a = seg(t, 49.95, 50.8, eio), b = seg(t, 50.9, 52.3, eio);
    dLow = a < 1 ? lerp(96, 181.9, a) : 9999; dUp = lerp(TIP, TIP0, b); exp = 0;
  }
  if (t >= 52.4) { dUp = TIP; dLow = 96; exp = 0; }
  return { dUp, dLow, heat, exp, contact };
}
// ------------------------------------------------------------------ A. hook dengan Raka (0 - 7,3)
const RK = 1.6, RTX = 520 - 200 * RK, RTY = 270, SH = 0.44, DG = 1100;
const CF = '#19726D';
const armTo = (side, hx, hy) => { const a = { wx: hx, wy: hy, ex: side === 'R' ? Math.max(330, hx + 70) : Math.min(70, hx - 70), ey: hy + 90, finger: 0, fa: -90, front: 1, roll: 0, hold: 0, holdRot: 0 }; const h = armShape(side, a).hand; a.wx += hx - h[0]; a.wy += hy - h[1]; return a; };
function hookState(t) {
  const L = armTo('L', 238, 468), s1 = seg(t, 0.0, 1.5, eio), s2 = seg(t, 1.2, 2.9, eio);
  // tangan kanan menarik termometer ke kanan (keluar dari jepitan lengan), lalu mengangkatnya ke samping wajah
  const hx = lerp(lerp(347, 394, s1), 362, s2), hy = lerp(472, 330, s2), ang = lerp(90, 10, s2);
  const Rr = armTo('R', hx, hy);
  const look = seg(t, 1.8, 2.7), tilt = 9 * seg(t, 2.4, 3.3, eio);
  let st = raka(t < 2.2 ? 'netral' : 'bingung', 'netral', { armL: L, armR: Rr, yaw: 0.25 + 0.15 * look, gazeX: 0.9, gazeY: 0.5 * (1 - look) + 0.2, tilt, lean: 0.5, browL: { y: -3 - 5 * look, rot: 3 }, browR: { y: -3 - 5 * look, rot: -3 } });
  st = rIdle(st, t); st.armL = L; st.armR = Rr;
  return { st, hand: armShape('R', Rr).hand, ang };
}
const wpos = (p) => [RTX + p[0] * RK, RTY + p[1] * RK];
function poseAt(t) { const h = hookState(t), hw = wpos(h.hand); return { h, M: mul(mul(mul(tr(hw[0], hw[1]), rot(h.ang)), sc(SH)), tr(0, DG)) }; }
const TC = 3.4;
const worldBG = `<rect x="-9000" y="-9000" width="18000" height="18000" fill="${CREAM}"/><circle cx="110" cy="480" r="190" fill="#EADFC4"/><circle cx="980" cy="1040" r="230" fill="#EADFC4" opacity=".7"/>`;
const table = `<rect x="-9000" y="1262" width="18000" height="14" fill="${GOLD}"/><rect x="-9000" y="1276" width="18000" height="9000" fill="#1B3A4B"/><rect x="-9000" y="1286" width="18000" height="70" fill="rgba(0,0,0,.14)"/>`;
const sleeveOver = (side, a, k = RK, ox = RTX, oy = RTY) => { const s = armShape(side, a); return `<g transform="translate(${ox} ${oy}) scale(${k})" fill="${CF}">${s.dots.map((d) => `<circle cx="${f1(d[0])}" cy="${f1(d[1])}" r="${f1(d[2])}"/>`).join('')}<circle cx="${f1(s.hand[0])}" cy="${f1(s.hand[1])}" r="22" fill="#F7BC8E"/></g>`; };
function sceneA(t, out) {
  const { h, M } = poseAt(t);
  // kamera: dunia di-skala sehingga termometer (dalam ruang modelnya) mengikuti kamera di ruang termometer
  const Z0 = 1 + 0.42 * (1 - seg(t, 0, 2.8)); let Wm = mul(mul(tr(540, 1000), sc(Z0)), tr(-540, -1000)), cam = null;
  if (t >= TC) {
    const p0 = poseAt(TC).M; const c0 = { cx: apply(p0, 0, -DG)[0], cy: apply(p0, 0, -DG)[1], md: DG, z: SH * 1, rot: 90 * 0 };
    // kunci pertama = pose termometer pada TC (bukan 0): hitung dari matriks
    const ang0 = Math.atan2(p0[1], p0[0]) * 180 / Math.PI, z0 = Math.hypot(p0[0], p0[1]);
    const u = seg(t, TC, 7.0, (x) => x);
    const k = (x) => x; void k;
    const cx0 = c0.cx, cy0 = c0.cy;
    const L = (a0, a1, w) => lerp(a0, a1, w);
    const w1 = sm(seg(t, TC, 4.9)), w2 = sm(seg(t, 5.9, 7.0));
    const ZA = (t < 5.9) ? Math.exp(L(Math.log(z0), Math.log(1.1), w1)) : Math.exp(L(Math.log(1.1), Math.log(2.4), w2));
    const MDv = (t < 5.9) ? L(DG, 560, w1) : L(560, 245, w2);
    const CX = (t < 5.9) ? L(cx0, 540, w1) : L(540, 540, w2), CY = (t < 5.9) ? L(cy0, 770, w1) : L(770, 700, w2);
    const RT = (t < 5.9) ? L(ang0, ang0 * 0.55, w1) : L(ang0 * 0.55, 0, w2);
    cam = { cx: CX, cy: CY, mx: 0, md: MDv, z: ZA, rot: RT };
    Wm = mul(camM(cam), inv(M));
  }
  const aw = 1 - seg(t, 7.0, 7.4);
  // ----- dunia (krem): Raka, termometer di tangan, aura suhu
  let w = worldBG;
  w += `<g transform="translate(${RTX} ${RTY}) scale(${RK})">${rakaSvg(h.st, { bare: true, uid: 'rA', shadow: false })}</g>`;
  w += table;
  const cool = seg(t, 0.6, 2.6, eio);
  const st = { dUp: TIP, dLow: t < 1.2 ? 9999 : lerp(181.9, 100, sm(seg(t, 1.2, 3.0))), heat: 0.9 * (1 - cool) - 0.5 * cool * (1 - seg(t, 3, 5)), exp: 0, t, z: 0.3, dark: false, uid: 'ha', scale: true };
  if (t >= 1.2 && t < 1.25) st.dLow = 9999;
  w += `<g transform="${svgM(M)}">${A.thermo(st)}</g>`;
  w += sleeveOver('L', h.st.armL);
  // genggaman tangan kanan di atas termometer (lengan baju tetap di belakang termometer)
  const hw = wpos(h.hand);
  w += `<g transform="translate(${f1(hw[0])} ${f1(hw[1])}) rotate(${f1(h.ang)})"><circle r="${f1(22 * RK)}" fill="#F7BC8E"/><rect x="-30" y="-12" width="60" height="10" rx="5" fill="#EAA676"/><rect x="-30" y="4" width="60" height="10" rx="5" fill="#EAA676"/></g>`;
  // "suhu sekitar turun" tepat di dekat wadah
  const bulb = apply(M, 0, -60);
  w += tag('suhu turun', bulb[0] + 150, bulb[1] + 20, ka(t, 0.9, 3.2, 0.3), { size: 34, bg: '#CFEFFA' });
  w += `<g opacity="${f1(ka(t, 0.9, 3.2, 0.3))}" stroke="#4FA3D9" stroke-width="6" stroke-linecap="round" fill="none" transform="translate(${f1(bulb[0] + 150)} ${f1(bulb[1] + 70)})"><path d="M0 -14V16M-10 6L0 16L10 6"/></g>`;
  out.A += `<g opacity="${f1(aw * 1000) / 1000}"><g transform="${svgM(Wm)}">${w}</g></g>`;
  // ----- ujung garis tetap: garis putus-putus + angka (U)
  if (cam) {
    const tp = apply(camM(cam), 0, -TIP), ang = cam.rot * Math.PI / 180, d = 900, ux = Math.cos(ang) * d, uy = Math.sin(ang) * d;
    const a = ka(t, 4.0, 7.0, 0.35) * (1 - seg(t, 6.2, 6.9));
    out.U += `<g opacity="${f1(a * 100) / 100}">${dashed(tp[0] - ux, tp[1] - uy, tp[0] + ux, tp[1] + uy, '#D9382F', 1, 6)}</g>`;
  }
  return cam;
}
// ------------------------------------------------------------------ kamera B..E (ruang termometer)
const CAMB = track([
  [7.0, 540, 700, 245, Math.log(2.4)], [9.0, 540, 700, 245, Math.log(2.4)],
  [9.9, 540, 830, 70, Math.log(4.0)], [11.3, 540, 830, 70, Math.log(4.0)],
  [12.2, 540, 780, 105, Math.log(3.0)], [14.3, 540, 780, 105, Math.log(3.0)],
  [15.2, 540, 700, 245, Math.log(2.4)], [17.0, 540, 700, 245, Math.log(2.4)],
  [18.2, 540, 860, 330, Math.log(1.25)], [24.8, 540, 860, 340, Math.log(1.25)], [28.0, 540, 860, 340, Math.log(1.25)],
  [29.3, 540, 780, 540, Math.log(1.9)], [32.2, 540, 780, 540, Math.log(1.9)],
  [33.6, 540, 700, 330, Math.log(1.7)], [35.0, 540, 700, 150, Math.log(2.4)], [38.0, 540, 700, 150, Math.log(2.4)],
  [39.4, 540, 760, 380, Math.log(1.4)], [43.5, 540, 760, 380, Math.log(1.4)],
  [44.8, 540, 780, 560, Math.log(1.9)], [46.8, 540, 780, 560, Math.log(1.9)],
  [47.9, 540, 780, 470, Math.log(1.1)], [52.2, 540, 780, 470, Math.log(1.1)],
]);
function camFromKeys(t) { const v = CAMB(t); return { cx: v[0] + 5 * Math.sin(t * 0.8), cy: v[1] + 7 * Math.sin(t * 0.63 + 1), mx: 0, md: v[2], z: Math.exp(v[3]) * (1 + 0.007 * Math.sin(t * 0.7)), rot: 0.35 * Math.sin(t * 0.5) }; }
const navyBG = `<defs><linearGradient id="nbg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#12485A"/><stop offset="1" stop-color="#0A2B36"/></linearGradient></defs><rect x="-9000" y="-9000" width="18000" height="18000" fill="url(#nbg)"/><circle cx="90" cy="560" r="220" fill="#134B5C" opacity=".6"/><circle cx="1000" cy="1100" r="260" fill="#134B5C" opacity=".5"/>`;
const sk = (cam, x, d) => apply(camM(cam), x, -d);   // titik model -> layar
// permukaan tubuh yang menempel di sisi kiri wadah: lengkung besar (bagian badan), gelombang panas mengalir dari tubuh ke kaca lalu merkuri
const SK_R = 430;
function skinSvg(contact, t) {
  if (contact <= 0.01) return '';
  const ox = (1 - contact) * -330;
  let s = `<g transform="translate(${f1(ox)} 0)"><circle cx="${-36 - SK_R}" cy="-130" r="${SK_R}" fill="${A.SKIN}" stroke="${A.SKIN_D}" stroke-width="14"/><path d="M${-36 - SK_R + 80} ${-130 - 480}A${SK_R - 90} ${SK_R - 90} 0 0 1 ${-36 - 70} ${-130 - 190}" fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round" opacity=".35"/></g>`;
  const ph = t * 1.3; let wv = '';
  for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) {
    const d = 20 + i * 62 + j * 20, u = (ph + i * 0.27 + j * 0.5) % 1, x0 = -210 + u * 150;
    wv += `<path d="M${f1(x0)} ${-d}q12 -16 24 0t24 0t24 0" fill="none" stroke="#D9382F" stroke-width="8" stroke-linecap="round" opacity="${f1(Math.sin(u * Math.PI) * 0.9 * contact * 100) / 100}"/>`;
  }
  return s + wv;
}
function bulbMarks(t, k, exp) { // panah pemuaian kecil di dalam wadah (ilustrasi)
  if (k <= 0.02) return '';
  let s = '';
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + 0.3, r0 = 8 + 3 * Math.sin(t * 5 + i), r1_ = 20 + 6 * exp; s += `<path d="M${f1(Math.cos(a) * r0)} ${f1(-76 + Math.sin(a) * r0 * 2.1)}L${f1(Math.cos(a) * r1_)} ${f1(-76 + Math.sin(a) * r1_ * 2.6)}" stroke="#D9382F" stroke-width="3.6" stroke-linecap="round" opacity="${f1(k * 100) / 100}"/>`; }
  return s;
}
function thermoLayer(t, cam, st, o = {}) {
  let s = `<g transform="${A.camT(cam)}">`;
  s += skinSvg(st.contact, t);
  s += A.thermo({ dUp: st.dUp, dLow: st.dLow, cut: o.cut ?? 1, heat: st.heat, exp: st.exp, t, z: cam.z, dark: true, uid: o.uid ?? 'b', scale: o.scale ?? true });
  s += bulbMarks(t, o.marks ? clamp(st.exp * 1.5) * st.contact : 0, st.exp);
  return s + `</g>`;
}
const zk = (cam, a = 1.8, b = 0.4) => clamp((cam.z - a) / b);      // label hanya saat kamera cukup dekat
// ------------------------------------------------------------------ adegan B..E
function sceneThermo(t, out) {
  const cam = camFromKeys(t), st = thState(t), P_ = (x, d) => sk(cam, x, d);
  let u = '';
  out.A += navyBG;
  const cutK = seg(t, 6.7, 7.6);
  out.A += thermoLayer(t, cam, st, { cut: cutK, marks: true });
  // ---- B 7,0 - 17,3: apa isi termometer
  if (t < 17.3) {
    u += chip(['AIR RAKSA = MERKURI'], t, W.airRaksa - 0.05, 11.5, { y: 250, size: 54 });
    u += tag('penampang kaca (dibelah memanjang)', 540, 392, ka(t, 7.4, 9.3, 0.3), { size: 30 });
    u += tag('contoh: sebelum dipakai', 540, 450, ka(t, 7.4, 9.3, 0.3), { size: 34, bg: '#CFEFFA' });
    const wl = P_(34, 80), sl = P_(-6, 410);
    u += callout('wadah merkuri', 840, wl[1] + 130, wl[0], wl[1], ka(t, W.wadah - 0.1, 17.2, 0.25), { k: eo(clamp((t - (W.wadah - 0.1)) / 0.4)) });
    u += callout('saluran sempit', 200, sl[1], sl[0], sl[1], ka(t, W.saluran - 0.1, 17.2, 0.25), { k: eo(clamp((t - (W.saluran - 0.1)) / 0.4)) });
    const ck = ka(t, W.logam - 0.1, 11.7, 0.3); if (ck > 0.01) u += liquidCard(t, ck);
  }
  // ---- C 17,3 - 32,8: panas -> memuai -> naik -> angka
  if (t >= 17.0 && t < 32.9) {
    const sk0 = P_(-90, 130), tb = P_(-300, 130);
    u += tag('tubuh', tb[0], tb[1] - 20, ka(t, W.panas, 21, 0.3) * st.contact, { size: 40, bg: '#fff' });
    u += callout('panas dari tubuh', 800, P_(0, 20)[1] + 40, P_(-30, 60)[0], P_(-30, 60)[1], ka(t, W.panas - 0.05, 21.0, 0.25), { k: eo(clamp((t - W.panas) / 0.4)), col: '#D9382F' });
    u += chip(['PANAS → MERKURI MEMUAI', '→ KOLOM NAIK'], t, W.memuai - 0.2, 28.2, { size: 46, y: 232 });
    if (t > W.bertambah - 0.2) {
      const y0 = P_(0, TIP0)[1], a0 = ka(t, W.bertambah - 0.2, 29.0, 0.3);
      u += dashed(P_(-60, TIP0)[0], y0, P_(120, TIP0)[0], y0, MINT, a0, 4);
      u += tag('awal', P_(120, TIP0)[0] + 70, y0, a0, { size: 28 });
      const y1 = P_(0, st.dUp)[1]; u += `<g opacity="${f1(a0 * 100) / 100}"><path d="M${f1(P_(70, TIP0)[0])} ${f1(y0)}V${f1(y1)}" stroke="${GOLD}" stroke-width="7" stroke-linecap="round"/>${t > 21.5 ? tag('volume bertambah', P_(70, TIP0)[0] + 175, (y0 + y1) / 2, clamp((t - 21.5) / 0.4) * ka(t, 21.5, 24.9, 0.3), { size: 34, bg: '#FFF4CC' }) : ''}</g>`;
    }
    if (t > W.semakin - 0.1 && t < 28.6) {   // semakin tinggi suhu, semakin jauh: perpanjangan bayangan (bukan hasil nyata)
      const kg = ka(t, W.semakin - 0.1, 28.4, 0.3), g1 = P_(0, TIP)[1], g2 = P_(0, A.dOf(38.6))[1], gy = lerp(g1, g2, eo(clamp((t - W.semakin) / 1.4)));
      u += `<g opacity="${f1(kg * 0.9 * 100) / 100}"><path d="M${f1(P_(0, 0)[0])} ${f1(g1)}V${f1(gy)}" stroke="${CORAL}" stroke-width="13" stroke-linecap="round" stroke-dasharray="2 18"/></g>`;
      u += tag('lebih panas → lebih jauh', 800, (g1 + g2) / 2 + 40, kg * eo(clamp((t - W.semakin) / 0.6)), { size: 34, bg: '#FFE3DC', fg: '#8A2F22' });
    }
    if (t >= W.angka - 0.2) {
      const tp = P_(0, TIP), a = ka(t, W.angka - 0.2, 32.9, 0.3);
      u += dashed(tp[0] - 380, tp[1], tp[0] + 380, tp[1], GOLD, a, 5);
      u += tag('posisi ujung garis', tp[0] - 250, tp[1] - 58, ka(t, W.angka + 0.4, 32.9, 0.3), { size: 30 });
      u += `<g opacity="${f1(a * clamp(pop(t, W.ujung - 0.1, 0.4)) * 100) / 100}">${tag('37,5 °C', tp[0] + 330, tp[1] - 70, 1, { size: 58, bg: GOLD, fg: INK })}</g>`;
    }
  }
  // ---- D 32,9 - 47,2: penyempitan menahan hasil
  if (t >= 32.7 && t < 47.1) {
    const cons = P_(0, 193), bl = P_(36, 90), z = zk(cam);
    u += chip(['BAGIAN KECIL YANG', 'MENAHAN HASIL'], t, W.penting - 0.1, 38.3, { size: 46, y: 232 });
    u += chip(['BAGIAN KECIL YANG', 'MENAHAN HASIL'], t, W.menahan - 0.2, 44.0, { size: 46, y: 232 });
    const kr = ka(t, W.penting + 0.1, 41.6, 0.3) * z;
    u += `<circle cx="${f1(cons[0])}" cy="${f1(cons[1])}" r="${f1(80 * (1 + 0.08 * Math.sin(t * 6)))}" fill="none" stroke="${GOLD}" stroke-width="7" stroke-dasharray="16 12" opacity="${f1(kr * 100) / 100}"/>`;
    u += callout('penyempitan', 170, cons[1] - 90, cons[0] - 24, cons[1] - 6, ka(t, W.penyempitan - 0.1, 41.8, 0.25) * z, { k: eo(clamp((t - (W.penyempitan - 0.1)) / 0.4)) });
    u += callout('wadah merkuri', 850, bl[1] + 120, bl[0] - 2, bl[1] + 54, ka(t, W.wadah2 - 0.1, 38.1, 0.25) * z, { k: eo(clamp((t - (W.wadah2 - 0.1)) / 0.4)) });
    if (t < 38.6 && t > 35.4) u += tag('hangat: merkuri bisa terdorong lewat', 540, cons[1] + 330, ka(t, 35.6, 38.4, 0.3), { size: 34, bg: '#FFE3DC', fg: '#8A2F22' });
    if (t > 35.4 && t < 38.7 && cam.z > 1.8) { let fl = ''; for (let i = 0; i < 5; i++) { const uu = ((t * 0.9 + i / 5) % 1), d = lerp(150, 238, uu); fl += `<circle cx="${f1(P_(0, d)[0])}" cy="${f1(P_(0, d)[1])}" r="5" fill="#fff" opacity="${f1(Math.sin(uu * Math.PI) * 0.9 * ka(t, 35.4, 38.5, 0.3) * 100) / 100}"/>`; } u += fl; }
    if (t >= W.dilepas) {
      const tp = P_(0, TIP), a = ka(t, W.dilepas + 0.6, 46.9, 0.35), sep = P_(0, 182);
      u += dashed(tp[0] - 400, tp[1], tp[0] + 400, tp[1], GOLD, a, 5);
      u += tag('dilepas dari tubuh', 250, P_(0, 150)[1] - 10, ka(t, W.dilepas, 40.1, 0.25) * z, { size: 34, bg: '#fff' });
      u += tag('mulai dingin', 810, P_(0, 60)[1] - 30, ka(t, W.dingin - 0.05, 43.8, 0.3), { size: 32, bg: '#CFEFFA' });
      u += callout('terputus di sini', 810, sep[1] - 20, sep[0] + 16, sep[1], ka(t, TSEP + 0.15, 43.6, 0.3), { size: 32, k: eo(clamp((t - TSEP - 0.1) / 0.4)) });
      u += tag(t < 42.7 ? 'tertahan' : 'tidak langsung turun', 800, tp[1] - 46, ka(t, W.menahan, 44.0, 0.3), { size: 36, bg: GOLD, fg: INK });
      const fl = clamp(1 - (t - TSEP) / 0.7) * (t >= TSEP ? 1 : 0);
      if (fl > 0.01) u += `<circle cx="${f1(sep[0])}" cy="${f1(sep[1])}" r="${f1(30 + 110 * (1 - fl))}" fill="none" stroke="${MINT}" stroke-width="8" opacity="${f1(fl * 100) / 100}"/>`;
    }
    if (t >= W.tertinggi - 0.9) { const tp = P_(0, TIP), a = ka(t, W.tertinggi - 0.9, 47.0, 0.3); u += `<g opacity="${f1(a * 100) / 100}">${tag('37,5 °C', tp[0] + 330, tp[1] - 70, 1, { size: 60, bg: GOLD, fg: INK })}${tag('suhu tertinggi yang tercapai', tp[0] - 200, tp[1] + 66, 1, { size: 30 })}</g>`; }
  }
  // ---- E 47,2 - 52,4: diatur ulang (ilustrasi alat lama, tanpa mengayun)
  if (t >= 47.0 && t < 52.5) {
    u += chip(['PERLU DIATUR ULANG'], t, W.diatur - 0.15, 52.3, { size: 58, bg: '#fff', y: 250 });
    u += `<g opacity="${f1(ka(t, 50.9, 52.3, 0.3) * 100) / 100}">${A.arrowD(300, 600, 190, MINT, 13, 'down')}</g>`;
    u += tag('ilustrasi alat lama · bukan anjuran memakai', 540, 1235, ka(t, 49.4, 52.3, 0.3), { size: 32, bg: 'rgba(8,24,36,.92)', fg: '#fff' });
    u += tag('sebelum pengukuran berikutnya', 540, 1170, ka(t, 50.2, 52.3, 0.3), { size: 32 });
  }
  out.U += u;
  return cam;
}
function liquidCard(t, a) {
  const x = 840, y = 560, w = 300, h = 290; let s = `<g opacity="${f1(a * 100) / 100}" transform="translate(${x} ${y})">`;
  s += `<rect x="${-w / 2}" y="${-h / 2 + 8}" width="${w}" height="${h}" rx="34" fill="rgba(0,0,0,.28)"/><rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="34" fill="#F4EFE0"/>`;
  const wob = Math.sin(t * 6) * 0.07, wob2 = Math.sin(t * 6 + 1.7) * 0.06;
  s += `<ellipse cx="0" cy="62" rx="${f1(92 * (1 + wob * 1.8))}" ry="${f1(24 * (1 - wob))}" fill="#9AABB6" opacity=".8"/>`;
  s += `<defs><radialGradient id="drp" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#fff"/><stop offset=".45" stop-color="#D4DEE5"/><stop offset="1" stop-color="#7C909F"/></radialGradient></defs>`;
  s += `<ellipse cx="0" cy="${f1(14 + wob * 14)}" rx="${f1(70 * (1 + wob))}" ry="${f1(52 * (1 + wob2))}" fill="url(#drp)" stroke="#6F8494" stroke-width="3"/><ellipse cx="-24" cy="-10" rx="16" ry="9" fill="#fff" opacity=".85"/>`;
  s += T('logam · cair', 0, -96, { size: 34, fill: FOREST }) + T('pada suhu ruang', 0, 100, { size: 26, fill: '#44606A', w: 700 }) + `</g>`;
  return s;
}
// ------------------------------------------------------------------ F. alat digital + risiko pecah + Raka memilih (52,4 - 65,2)
const beadGrad = `<defs><radialGradient id="bd" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="#D4DEE5"/><stop offset="1" stop-color="#7C909F"/></radialGradient></defs>`;
function sceneF(t, out) {
  let a = `<rect x="-9000" y="-9000" width="18000" height="18000" fill="${CREAM}"/><circle cx="130" cy="520" r="190" fill="#EADFC4"/><circle cx="960" cy="1060" r="230" fill="#EADFC4" opacity=".7"/>`;
  let u = '';
  const glass = (cam, st, o = {}) => `<g transform="${A.camT(cam)}">${A.thermo({ dUp: TIP, dLow: 96, cut: 0, dark: false, uid: o.uid ?? 'f', z: cam.z, t, scale: true, ...st })}${o.extra ?? ''}</g>`;
  // 52,4 - 55,9: dua alat berdampingan
  if (t < 56.1) {
    const k = ka(t, 52.3, 55.95, 0.3), e = eo(clamp((t - 52.4) / 0.7)), dgt = eo(clamp((t - W.digital + 0.7) / 0.6));
    a += `<g opacity="${f1(k * 100) / 100}">${glass({ cx: lerp(540, 290, e), cy: 830, mx: 0, md: 620, z: 0.72, rot: 0 }, {}, { uid: 'f1' })}`;
    a += `<g opacity="${f1(dgt * 100) / 100}">${A.digital(lerp(1010, 760, dgt), 890, 2.1, { val: '36,8', beep: Math.max(0, Math.sin(t * 7)) > 0.6 && t > W.digital ? 1 : 0 })}</g></g>`;
    u += tag('air raksa (kaca)', 290, 1245, ka(t, 52.9, 55.95, 0.3) * k, { size: 34 });
    u += tag('digital', 760, 1245, dgt * k, { size: 34, bg: '#B8D8C6' });
    u += chip(['KENAPA SEKARANG', 'LEBIH SERING DIGITAL?'], t, 52.5, 55.8, { size: 52 });
  }
  // 55,9 - 60,8: kaca retak (tidak sengaja), merkuri tersebar, uap berbahaya
  if (t >= 55.8 && t < 60.9) {
    const k = ka(t, 55.8, 60.8, 0.15), crack = seg(t, W.pecah - 0.05, W.pecah + 0.35), spread = seg(t, W.tersebar - 0.1, W.tersebar + 1.3, eo), vap = seg(t, W.uapnya - 0.1, W.uapnya + 0.6);
    const cam = { cx: 540, cy: 905, mx: 0, md: 560, z: 2.0, rot: 90 };
    const cr = `<g opacity="${f1(crack * 100) / 100}" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" fill="none"><path d="M-34 -560l20 18l-22 14l22 16l-18 20"/><path d="M-14 -526l30 -8M-18 -490l-22 8"/></g>`;
    a += `<g opacity="${f1(k * 100) / 100}"><rect x="0" y="990" width="1080" height="14" fill="${GOLD}"/><rect x="0" y="1004" width="1080" height="900" fill="#1B3A4B"/><rect x="0" y="1014" width="1080" height="60" fill="rgba(0,0,0,.14)"/>`;
    a += glass(cam, { scale: false }, { uid: 'f2', extra: cr });
    const cp = apply(camM(cam), 0, -560);
    let beads = '';
    for (let i = 0; i < 12; i++) { const ang = (i / 12) * Math.PI * 2 + rndf(i) * 0.6, r = (30 + rndf(i + 3) * 300) * spread, bx = cp[0] + Math.cos(ang) * r * 1.2, by = 1040 + Math.abs(Math.sin(ang)) * r * 0.16 + 40 * rndf(i + 7), rr = 10 + rndf(i + 5) * 14; beads += `<circle cx="${f1(bx)}" cy="${f1(Math.min(by, 1180))}" r="${f1(rr * Math.min(1, spread * 3))}" fill="url(#bd)" stroke="#6F8494" stroke-width="2"/>`; }
    a += beadGrad + beads;
    let vp = '';
    for (let i = 0; i < 4; i++) { const ux = cp[0] - 150 + i * 100 + Math.sin(t * 2 + i) * 10, ph = ((t * 0.5 + i * 0.27) % 1); vp += `<path d="M${f1(ux)} ${f1(800 - ph * 300)}q26 -30 0 -60t0 -60" fill="none" stroke="#8D7FB8" stroke-width="11" stroke-linecap="round" opacity="${f1(vap * Math.sin(ph * Math.PI) * 0.85 * 100) / 100}"/>`; }
    a += vp + `</g>` + `<g opacity="${f1(vap * k * 100) / 100}">${A.warnTri(880, 560, 1.9)}</g>`;
    u += chip(['MERKURI BERBAHAYA', 'JIKA TERLEPAS'], t, W.pecah - 0.2, 60.4, { size: 54, bg: '#D9382F', fg: '#fff' });
    u += tag('kaca retak tidak sengaja', 760, 1215, ka(t, W.pecah, 60.4, 0.3), { size: 30 });
    u += tag('merkuri tersebar', 300, 1215, ka(t, W.tersebar, 60.4, 0.3), { size: 30 });
    u += tag('uap berbahaya', 880, 690, ka(t, W.uapnya, 60.4, 0.3), { size: 34, bg: '#E7E1F5' });
  }
  // 60,7 - 65,2: Raka memilih alat tanpa merkuri
  if (t >= 60.5) {
    const k = ka(t, 60.5, 65.3, 0.3), lt = t - 60.7;
    const st = rIdle(raka('senang', 'netral', { lean: 0.5, armR: armTo('R', 372, 520 - 80 * eo(clamp(lt / 0.9))), armL: armTo('L', 96, 520), yaw: 0.2, happyEyes: 0.6 }), t);
    a += `<g opacity="${f1(k * 100) / 100}"><rect x="0" y="1182" width="1080" height="14" fill="${GOLD}"/><rect x="0" y="1196" width="1080" height="800" fill="#1B3A4B"/>`;
    a += `<g transform="translate(${RTX - 80} ${RTY + 20}) scale(${RK})">${rakaSvg(st, { bare: true, uid: 'rF', shadow: false })}</g>`;
    const h = armShape('R', st.armR).hand, hx = RTX - 80 + h[0] * RK, hy = RTY + 20 + h[1] * RK;
    a += `<g transform="translate(850 1230) rotate(-8)" opacity=".6"><g transform="rotate(90) scale(.3)">${A.thermo({ dUp: TIP, dLow: 96, cut: 0, dark: false, uid: 'f3', z: 0.3, scale: false })}</g></g>`;
    a += A.digital(hx + 6, hy - 60, 1.05, { val: '36,8', beep: Math.max(0, Math.sin(t * 6)) > 0.7 ? 1 : 0 });
    a += `<circle cx="${f1(hx)}" cy="${f1(hy)}" r="${f1(22 * RK)}" fill="#F7BC8E"/><rect x="${f1(hx - 28)}" y="${f1(hy - 13)}" width="56" height="10" rx="5" fill="#EAA676"/><rect x="${f1(hx - 28)}" y="${f1(hy + 3)}" width="56" height="10" rx="5" fill="#EAA676"/></g>`;
    u += chip(['KINI ADA ALTERNATIF', 'BEBAS MERKURI'], t, 60.8, 65.2, { size: 54, bg: '#fff' });
    u += tag('bebas merkuri', hx + 190, hy - 130, ka(t, W.tanpa - 0.1, 65.1, 0.3), { size: 36, bg: '#B8D8C6' });
    u += tag('kaca merkuri', 850, 1330 + 0, ka(t, 61.0, 64.5, 0.3) * 0, { size: 26 });
  }
  out.A += a; out.U += u;
}
// ------------------------------------------------------------------ G. rangkuman: MEMUAI -> NAIK -> TERTAHAN (65,2 - 72,7)
function sceneG(t, out) {
  const k = ka(t, 65.1, 99, 0.4), cam = { cx: 640 + 5 * Math.sin(t * 0.8), cy: 800 + 7 * Math.sin(t * 0.63), mx: 0, md: 580, z: 0.84 * (1 + 0.008 * Math.sin(t * 0.7)), rot: 0.4 * Math.sin(t * 0.5) };
  out.A += `<g opacity="${f1(k * 100) / 100}"><rect x="-9000" y="-9000" width="18000" height="18000" fill="${TEAL}"/><circle cx="90" cy="560" r="220" fill="#104049" opacity=".7"/><circle cx="1000" cy="1100" r="260" fill="#104049" opacity=".6"/>`;
  const e1 = pop(t, W.pemuayan - 0.05, 0.4), e2 = pop(t, W.saluran3 - 0.05, 0.4), e3 = pop(t, W.penyempitan2 - 0.05, 0.4);
  // ulang singkat cara kerjanya: hangat -> kolom naik (65,4 - 68,0), lalu dingin: merkuri bawah menyusut, kolom atas tertahan (70,4 -)
  const rise = seg(t, 65.5, 68.2, eio), cool = seg(t, 70.4, 72.0, eio);
  const st = { dUp: lerp(TIP0, TIP, rise), dLow: t < 70.4 ? 9999 : lerp(181.9, 96, cool), cut: 1, heat: 0.75 * Math.sin(Math.PI * rise) * (t < 70.4 ? 1 : 0) + 0.35 * Math.max(0, Math.sin((t - W.pemuayan) * 5)) * ka(t, W.pemuayan, W.saluran3, 0.1), exp: Math.sin(Math.PI * rise), t, z: cam.z, dark: true, uid: 'g', scale: true };
  out.A += `<g transform="${A.camT(cam)}">${A.thermo(st)}`;
  const pulse = (a) => 1 + 0.14 * Math.sin(t * 7) * a, sw = (w) => f1(w / cam.z);
  out.A += `<circle cx="0" cy="-70" r="${f1(62 * pulse(e1 > 0.3 ? 1 : 0))}" fill="none" stroke="${CORAL}" stroke-width="${sw(7)}" opacity="${f1(clamp(e1) * ka(t, W.pemuayan - 0.05, 99, 0.2) * 100) / 100}"/>`;
  out.A += `<rect x="-17" y="${-A.dOf(37.5) - 8}" width="34" height="${f1(A.dOf(37.5) - 205)}" rx="17" fill="none" stroke="${GOLD}" stroke-width="${sw(7)}" opacity="${f1(clamp(e2) * 100) / 100}"/>`;
  out.A += `<circle cx="0" cy="${-190}" r="${f1(44 * pulse(e3 > 0.3 ? 1 : 0))}" fill="none" stroke="${MINT}" stroke-width="${sw(8)}" stroke-dasharray="${sw(18)} ${sw(12)}" opacity="${f1(clamp(e3) * 100) / 100}"/>`;
  out.A += `</g></g>`;
  const P_ = (x, d) => sk(cam, x, d), wb = P_(-36, 80), wc = P_(-17, 800), wk = P_(-40, 193);
  out.U += callout('wadah', 200, wb[1], wb[0], wb[1], clamp(e1) * k, { size: 40, col: CORAL });
  out.U += callout('saluran sempit', 250, wc[1], wc[0], wc[1], clamp(e2) * k, { size: 40 });
  out.U += callout('penyempitan', 250, wk[1] - 70, wk[0], wk[1], clamp(e3) * k, { size: 40, col: MINT });
  const row = [['MEMUAI', e1, CORAL, '#fff'], ['NAIK', e2, GOLD, INK], ['TERTAHAN', e3, MINT, INK]];
  const widths = row.map(([s]) => tw(s, 54) + 64), gap = 74, total = widths.reduce((a, b) => a + b, 0) + gap * 2; let x0 = 540 - total / 2;
  row.forEach(([s, e, bg, fg], i) => {
    const w = widths[i], sx = Math.max(0.01, e), cx = x0 + w / 2;
    out.U += `<g transform="translate(${f1(cx)} 296) scale(${f1(sx * 1000) / 1000}) translate(${f1(-cx)} -296)" opacity="${f1(clamp(e) * k * 100) / 100}">${R(x0, 250, w, 92, bg, 46)}${T(s, cx, 313, { size: 54, fill: fg })}</g>`;
    if (i < 2) out.U += `<g opacity="${f1(clamp(row[i + 1][1]) * k * 100) / 100}">${T('→', x0 + w + gap / 2, 312, { size: 60, fill: '#fff' })}</g>`;
    x0 += w + gap;
  });
}
// ------------------------------------------------------------------ outro (salinan pola video SpO2: web asli + master suara)
export const OUTRO_FRAMES = 455;
const RECT_A = { x: 70, y: 340, w: 940, h: 1156 }, RECT_B = { x: 280, y: 800, w: 520, h: 639 };
const O0 = CUES.t_web;
function outroState(t) {
  const to = t - O0, kk = seg(to, 9.0, 9.75, eio);
  return { to, rect: { x: lerp(RECT_A.x, RECT_B.x, kk), y: lerp(RECT_A.y, RECT_B.y, kk), w: lerp(RECT_A.w, RECT_B.w, kk), h: lerp(RECT_A.h, RECT_B.h, kk) }, frame: clamp(Math.round(to * 30), 0, OUTRO_FRAMES - 1), cream: kk, kk };
}
function wrapText(s, size, maxW) { const words = s.split(' '), lines = []; let cur = ''; for (const w of words) { const t = cur ? cur + ' ' + w : w; if (cur && tw(t, size) > maxW) { lines.push(cur); cur = w; } else cur = t; } if (cur) lines.push(cur); return lines; }
function outroUI(t) {
  const { to, rect, cream, kk } = outroState(t), a = seg(to, 0, 0.35);
  const bg = `<g opacity="${f1(a * 100) / 100}">${R(-10, -10, 1100, 1940, '#0B2F38')}</g><g opacity="${f1(cream * 100) / 100}">${R(-10, -10, 1100, 1940, '#F7F2E4')}<circle cx="0" cy="1500" r="300" fill="#EAF3E0"/><circle cx="1040" cy="260" r="260" fill="#EAF3E0"/></g>`;
  let u = `<g opacity="${f1(a * 100) / 100}"><rect x="${f1(rect.x - 8)}" y="${f1(rect.y - 8)}" width="${f1(rect.w + 16)}" height="${f1(rect.h + 16)}" rx="${f1(lerp(28, 22, kk))}" fill="none" stroke="${cream > 0.5 ? FOREST : GOLD}" stroke-width="8"/></g>`;
  const lab = [[5.0, 6.7, 'Materi per bab'], [6.7, 7.75, 'Latihan soal + pembahasan'], [7.75, 9.2, 'Simulasi Dokter']];
  for (const [a0, a1, tx] of lab) { const k = ka(to, a0, a1, 0.25); if (k > 0.01) u += pill([tx], 540, 255 + (1 - eo(clamp((to - a0) / 0.3))) * -40, { a: k, size: 50, bg: '#fff' }); }
  const ke = seg(to, 9.35, 9.95, eo);
  if (ke > 0.01) u += `<g opacity="${f1(ke * 100) / 100}" transform="translate(0 ${f1((1 - ke) * -30)})"><image href="logo-full.webp" x="170" y="290" width="740" height="${f1(740 * 160 / 794)}" preserveAspectRatio="xMidYMid meet"/>${T('Belajar FK gratis di MEDCOEL', 540, 520, { size: 56, fill: FOREST })}${R(250, 590, 580, 128, FOREST, 64)}${T('medcoel.com', 540, 680, { size: 82, fill: GOLD })}</g>`;
  const caps = [[1.2, 4.56, 'Masih penasaran? Lanjutkan belajarnya di MEDCOEL.'], [5.06, 8.98, 'Jelajahi materi per bab, latihan soal, dan simulasi dokter.'], [9.54, 11.7, 'Semuanya gratis di medcoel.com.']];
  for (const [a0, a1, tx] of caps) { const k = ka(to, a0, a1, 0.12); if ((k > 0.01 && to < 9.4) || (k > 0.01 && a0 > 9)) { const ls = wrapText(tx, 48, 820); const y = a0 > 9 ? 1470 : 1330, h = ls.length * 58 + 30; u += `<g opacity="${f1(k * 100) / 100}">${R(100, y + 6, 880, h, 'rgba(0,0,0,.25)', 30)}${R(100, y, 880, h, 'rgba(8,16,28,.92)', 30)}${ls.map((l, i) => T(l, 540, y + 14 + 42 + i * 58, { size: 48, fill: '#fff' })).join('')}</g>`; } }
  return { bg, u };
}
// ------------------------------------------------------------------ penyusun frame
export async function frame(t) {
  const out = { A: '', U: '', web: null };
  out.A += `<rect width="1080" height="1920" fill="${NAVY}"/>`;
  if (t < 7.6) sceneA(t, out);
  if (t >= 6.4 && t < 52.5) {
    const o = { A: '', U: '' };
    sceneThermo(t, o);
    const a = t < 7.4 ? seg(t, 6.5, 7.1) : t > 52.0 ? 1 - seg(t, 52.0, 52.4) : 1;
    out.A += `<g opacity="${f1(a * 1000) / 1000}">${o.A}</g>`; out.U += `<g opacity="${f1(a * 1000) / 1000}">${o.U}</g>`;
  }
  if (t >= 52.2 && t < 65.4) { const o = { A: '', U: '' }; sceneF(t, o); const a = seg(t, 52.2, 52.6) * (1 - seg(t, 65.0, 65.4)); out.A += `<g opacity="${f1(a * 1000) / 1000}">${o.A}</g>`; out.U += `<g opacity="${f1(a * 1000) / 1000}">${o.U}</g>`; }
  if (t >= 65.0) sceneG(t, out);
  if (t < 6.9 && t >= 0) { out.U += chip(['SUDAH DILEPAS,', 'KOK ANGKANYA TETAP?'], t, 4.15, 6.7, { size: 56, bg: '#D9382F', fg: '#fff' }); }
  if (t < CUES.t_web) out.U += caption(t);
  if (t >= O0 - 0.25) {
    const o = outroState(t), ui = outroUI(t), a = seg(t, O0 - 0.25, O0 + 0.05);
    out.A = `<g opacity="${f1((1 - a) * 1000) / 1000}">${out.A}</g>`; out.U = (t < O0 + 0.05 ? `<g opacity="${f1((1 - a) * 1000) / 1000}">${out.U}</g>` : '') + ui.u;
    out.A = ui.bg + out.A; // latar outro di bawah
    out.A = `<rect width="1080" height="1920" fill="${TEAL}"/>` + out.A;
    out.web = { frame: o.frame, rect: o.rect, a };
  }
  return out;
}

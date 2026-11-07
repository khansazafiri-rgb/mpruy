// Paruh kedua: Raka duduk + Tala menelepon + IGD, "jangan menunggu hasil lab", kartu pencegahan, dokter, berjalan (tanpa gejala), penutup.
import { f1, clamp, lerp, sm, eo, eio, ei, eob, seg, win, pchip, MC, FONT } from './core.js';
import * as A from './art.js';
import { bg } from './bg.js';
import { raka, rakaBody, lerpState, rIdle, solveArm, handWorld } from './raka.js';
import { walkCycle, PALETTE, PALETTE_DOSEN } from '../../../brand/characters/raka/raka.js';
import { teman, temanSvg, idleTeman, TP } from '../../../brand/characters/teman/teman.js';
import { stairsWorld, stairsDefs, K, WT, HT, DEP, SOLE, climb, legsSvg, stripLegs, rakaS1, rakaGroup, chestWorld } from './stairs.js';
import { vesselWorld } from './vessel.js';

const lerpV = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
const shade = (x, y, c, o = 0.3) => `<rect x="${x}" y="${y}" width="0" height="0"/>`;
const floor = (y, x0 = 0, x1 = 1080) => `<ellipse cx="540" cy="${y + 6}" rx="300" ry="22" fill="#021014" opacity=".28"/>`;

// ------------------------------------------------------------------ ikon dan benda
export function igdSign(x, y, k = 1, t = 0, a = 1) {
  const pulse = 0.5 + 0.5 * Math.sin(t * 7), sirenA = Math.floor(t * 4) % 2;
  return `<g opacity="${f1(a)}" transform="translate(${f1(x)} ${f1(y)}) scale(${f1(k * 1000) / 1000})"><circle r="260" fill="url(#gGlowR)" opacity="${f1(0.4 + 0.3 * pulse)}"/><rect x="-200" y="-110" width="400" height="220" rx="36" fill="#021014" opacity=".3" transform="translate(8 12)"/><rect x="-200" y="-110" width="400" height="220" rx="36" fill="#FFFFFF" stroke="#D93B3B" stroke-width="10"/><path d="M-150 -22h40v-40h36v40h40v36h-40v40h-36v-40h-40z" fill="#D93B3B"/><text x="62" y="30" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="100" fill="#D93B3B">IGD</text><circle cx="-168" cy="-144" r="20" fill="${sirenA ? '#FF4A4A' : '#5B7BFF'}"/><circle cx="168" cy="-144" r="20" fill="${sirenA ? '#5B7BFF' : '#FF4A4A'}"/></g>`;
}
export function ambulance(x, y, k = 1, t = 0) {
  const sirenA = Math.floor(t * 4) % 2, bob = Math.sin(t * 22) * 2;
  return `<g transform="translate(${f1(x)} ${f1(y + bob)}) scale(${k})"><ellipse cx="10" cy="150" rx="260" ry="16" fill="#021014" opacity=".3"/><path d="M-250 -80H90V150H-250Z" fill="#FFFFFF" stroke="${MC.ink}" stroke-width="5"/><path d="M90 -20H190Q230 -20 250 30L270 90V150H90Z" fill="#F2F4F5" stroke="${MC.ink}" stroke-width="5"/><path d="M118 -2H186Q210 -2 224 26L240 66H118Z" fill="#9DD6EC" stroke="${MC.ink}" stroke-width="4"/><rect x="-250" y="60" width="340" height="30" fill="#D93B3B"/><path d="M-120 -50h30v-30h28v30h30v28h-30v30h-28v-30h-30z" fill="#D93B3B" transform="translate(0 6)"/><rect x="-18" y="-112" width="60" height="32" rx="10" fill="${sirenA ? '#FF4A4A' : '#5B7BFF'}"/><g transform="translate(-130 150)"><circle r="46" fill="${MC.ink}"/><circle r="22" fill="#B8C4C8"/></g><g transform="translate(150 150)"><circle r="46" fill="${MC.ink}"/><circle r="22" fill="#B8C4C8"/></g></g>`;
}
const phone = (x, y, rot = 0) => `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${rot})"><rect x="-22" y="-44" width="44" height="88" rx="10" fill="#1E2A36" stroke="#9FB4C0" stroke-width="3"/><rect x="-16" y="-36" width="32" height="64" rx="5" fill="#5FD0A8"/></g>`;

// ------------------------------------------------------------------ adegan 11: Raka duduk di tangga, Tala datang dan menelepon (44,0 - 51,9)
function talaAt(t) {
  const s = 0.1 + 2.9 * eio(clamp((t - 44.1) / 2.7));
  const cl = climb(s, { expr: 'netral', xo: -150 });
  const phoneA = seg(t, 47.4, 48.0), react = seg(t, 46.7, 47.1) * (1 - phoneA);
  const base = teman(t > 47.0 ? 'fokus' : 'heran', 'berdiri', { yaw: 0.45, gazeX: 0.6, bob: cl.st.bob, lean: cl.st.lean, armL: cl.st.armL, armR: cl.st.armR, legs: cl.st.legs });
  let st = idleTeman(base, t, 1.3);
  const ear = solveArm(st, 'R', [326, 252], { finger: 0, front: 1, len: 178 });
  const cheek = solveArm(st, 'R', [300, 330], { finger: 0, front: 1, len: 170 });
  st = { ...st, armR: lerpArm(st.armR, lerpArm(cheek, ear, phoneA), Math.max(react, phoneA)) };
  return { st, X: cl.X, Y: cl.Y, feet: cl.feet, phoneA };
}
const lerpArm = (a, b, k) => { const o = {}; for (const key of Object.keys(a)) o[key] = typeof a[key] === 'number' ? lerp(a[key], b[key], k) : a[key]; return o; };
export function sceneSeated(t) {
  const r = rakaS1(8.2);
  const st = r.st; st.sweat = 1; st.bob += Math.sin(t * 5.5) * 2.5; st.breath = 0.5 + 0.5 * Math.sin(t * 5.5);
  const tl = talaAt(t);
  const cx = lerp(600, 570, seg(t, 44, 51)), cy = r.Y - 340, S = 1.38 + 0.05 * seg(t, 47, 51);
  const tf = `translate(${f1(540 - cx * S)} ${f1(980 - cy * S)}) scale(${f1(S * 1000) / 1000})`;
  // Tala: kaki IK sesuai pijakan; telapak = posisi dunia dari climb()
  const ank = { L: [200 + (tl.feet.L.x - tl.X) / K, 752 + (tl.feet.L.y - tl.Y) / K], R: [200 + (tl.feet.R.x - tl.X) / K, 752 + (tl.feet.R.y - tl.Y) / K] };
  const palT = { pants: TP.jeans || '#4E6AA8', shoes: TP.shoes || '#F5E8D6', patchEdge: '#E4D2B4' };
  const body = stripLegs(temanSvg(tl.st, { bare: true, uid: 'tl' }), 'teman-legs') + legsSvg(ank, tl.st.bob || 0, { pal: palT, farCol: '#3B5590' });
  const tg = `<g transform="translate(${f1(tl.X - 200 * K)} ${f1(tl.Y - 778 * K)}) scale(${K})">${body}</g>`;
  // ponsel di tangan Tala saat menelepon
  let ph = '';
  if (tl.phoneA > 0.01) { const h = handWorld(tl.st, 'R'); ph = `<g opacity="${f1(tl.phoneA)}" transform="translate(${f1(tl.X - 200 * K)} ${f1(tl.Y - 778 * K)}) scale(${K})">${phone(h[0] + 6, h[1] - 6, 14)}</g>`; }
    let s = bg(t, { px: cx, py: cy }) + stairsDefs() + `<g transform="${tf}">${stairsWorld(cx - 700, cx + 700)}${rakaGroup(st, r.X, r.Y, r.ank, 'rkS')}${tg}${ph}</g>`;
  // papan IGD (layar)
  const sa = seg(t, 49.3, 49.9, eob) * (1 - seg(t, 51.5, 51.9));
  s += igdSign(810, 640, 0.9, t, sa);
  // label
  const [chx, chy] = [r.X + 22 * K, r.Y + (440 + st.bob - 778) * K], toS = (wx, wy) => [540 + (wx - cx) * S, 980 + (wy - cy) * S];
  const [cx1, cy1] = toS(...chestWorld(st, r.X, r.Y)), [hx, hy] = toS(r.X + 10, r.Y + (150 + st.bob - 778) * K);
  s += A.chips(t, [
    [44.6, 46.9, 'Nyeri dada\nmenekan', cx1, cy1, 905, 1260],
    [47.3, 49.3, 'Keringat dingin\natau sesak', hx, hy, 880, 930],
    [49.7, 51.6, 'Segera ke IGD', 810, 800, 810, 860, { noLine: true }],
  ]);
  return s;
}

// ------------------------------------------------------------------ adegan 12: jangan menunggu hasil lab, cari pertolongan (51,3 - 55,0)
function labCard(t, hot) {
  const row = (y, txt, bar, h) => `<text x="34" y="${y}" font-family="${FONT}" font-weight="700" font-size="30" fill="${MC.ink}">${txt}</text><rect x="34" y="${y + 10}" width="270" height="18" rx="9" fill="#E4E1D6"/><rect x="34" y="${y + 10}" width="${f1(270 * bar)}" height="18" rx="9" fill="${h ? '#E8665F' : '#7FB8A6'}"/>`;
  return `<rect x="8" y="12" width="380" height="330" rx="26" fill="#021014" opacity=".3"/><rect width="380" height="330" rx="26" fill="#FBFAF4" stroke="${MC.ink}" stroke-width="3"/><rect width="380" height="64" rx="26" fill="${MC.brand}"/><rect y="32" width="380" height="32" fill="${MC.brand}"/><text x="34" y="44" font-family="${FONT}" font-weight="800" font-size="28" fill="#fff">PROFIL LIPID</text>${row(112, 'LDL', 0.86, true)}${row(180, 'HDL', 0.45, false)}${row(248, 'Trigliserida', 0.5, false)}${row(316, '', 0, false)}`.replace(/<text[^>]*><\/text>/g, '');
}
function hourglass(x, y, t, a = 1) {
  const ph = (t * 0.35) % 1;
  return `<g opacity="${f1(a)}" transform="translate(${f1(x)} ${f1(y)})"><rect x="-70" y="-120" width="140" height="18" rx="9" fill="${MC.ink}"/><rect x="-70" y="102" width="140" height="18" rx="9" fill="${MC.ink}"/><path d="M-56 -102H56C56 -40 10 -14 10 0C10 14 56 40 56 102H-56C-56 40 -10 14 -10 0C-10 -14 -56 -40 -56 -102Z" fill="#E6F2F3" stroke="${MC.ink}" stroke-width="6" opacity=".95"/><path d="M-46 ${f1(-92 + ph * 70)}H46C40 -60 14 -40 0 -10C-14 -40 -40 -60 -46 ${f1(-92 + ph * 70)}Z" fill="#F2C14E"/><path d="M0 -10V${f1(40)}" stroke="#F2C14E" stroke-width="5"/><path d="M-50 100C-40 ${f1(80 - ph * 40)} 40 ${f1(80 - ph * 40)} 50 100Z" fill="#F2C14E"/></g>`;
}
export function sceneWait(t) {
  const a = seg(t, 51.3, 51.9) * (1 - seg(t, 54.6, 55.2)); if (a <= 0.01) return '';
  let s = bg(t);
  // atas: menunggu hasil lab (dicoret)
  const aT = seg(t, 51.5, 52.0, eo), x = seg(t, 52.7, 53.2);
  s += `<g opacity="${f1(aT)}" transform="translate(90 ${f1(420 - (1 - aT) * 40)}) scale(1.05)">${labCard(t, 1)}</g>`;
  s += hourglass(790, 575, t, aT);
  s += `<g opacity="${f1(x)}"><path d="M70 410L1010 850M1010 410L70 850" stroke="#E8433A" stroke-width="26" stroke-linecap="round" stroke-dasharray="1100" stroke-dashoffset="${f1(1100 * (1 - x))}" opacity=".9"/></g>`;
  s += A.tag(540, 360, 'Menunggu hasil tes kolesterol', { fs: 38, a: aT, bg: '#6B6F78', stroke: MC.ivory });
  // bawah: cari pertolongan (ambulans + IGD)
  const aB = seg(t, 53.4, 53.9, eo), drive = seg(t, 53.4, 54.4, eo);
  s += igdSign(540, 1230, 0.95, t, aB);
  s += `<g opacity="${f1(aB)}">${ambulance(lerp(-340, 540, drive), 1560, 1.0, t)}</g>`;
  s += A.tag(540, 1000, 'Cari pertolongan segera', { fs: 42, a: aB, bg: MC.gold, fg: MC.ink, stroke: MC.ink });
  return `<g opacity="${f1(a)}">${s}</g>`;
}

// ------------------------------------------------------------------ adegan 13: pencegahan (54,7 - 62,9)
const cardBox = (x, y, w, h, a, k, hi, inner, label, label2 = '') => {
  if (a <= 0.01) return '';
  return `<g opacity="${f1(a)}" transform="translate(${f1(x + w / 2)} ${f1(y + h / 2 + (1 - a) * 40)}) scale(${f1(k * 1000) / 1000}) translate(${-w / 2} ${-h / 2})"><rect x="8" y="12" width="${w}" height="${h}" rx="38" fill="#021014" opacity=".32"/><rect width="${w}" height="${h}" rx="38" fill="${MC.ivory}" stroke="${hi > 0.01 ? MC.gold : MC.ink}" stroke-width="${f1(3 + 6 * hi)}"/>${hi > 0.01 ? `<rect x="-10" y="-10" width="${w + 20}" height="${h + 20}" rx="46" fill="none" stroke="${MC.gold}" stroke-width="5" opacity="${f1(0.5 * hi)}"/>` : ''}<g transform="translate(${w / 2} 118)">${inner}</g><text x="${w / 2}" y="${h - (label2 ? 62 : 34)}" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="40" fill="${MC.ink}">${label}</text>${label2 ? `<text x="${w / 2}" y="${h - 22}" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="40" fill="${MC.ink}">${label2}</text>` : ''}</g>`;
};
const icoTube = (t) => `<g transform="rotate(-18) translate(-40 0)"><rect x="-24" y="-92" width="48" height="170" rx="24" fill="#F1F6F7" stroke="${MC.ink}" stroke-width="5"/><path d="M-19 -14H19V54Q19 72 0 72Q-19 72 -19 54Z" fill="#C8283C"/><rect x="-28" y="-104" width="56" height="26" rx="10" fill="#4F7FE0" stroke="${MC.ink}" stroke-width="4"/></g><g transform="translate(62 6)"><rect x="-46" y="-78" width="92" height="124" rx="14" fill="#fff" stroke="${MC.ink}" stroke-width="4"/>${[-50, -26, -2, 22].map((yy, i) => `<rect x="-30" y="${yy}" width="${[60, 44, 56, 36][i]}" height="10" rx="5" fill="${i === 0 ? '#E8665F' : '#9FB8B0'}"/>`).join('')}</g>`;
const icoPlate = () => `<circle r="86" fill="#FFFFFF" stroke="${MC.ink}" stroke-width="5"/><circle r="62" fill="#F1F5F2" stroke="#C6D3CC" stroke-width="3"/><g transform="translate(-34 -4)"><rect x="-30" y="-26" width="60" height="50" rx="20" fill="#E1A445" stroke="#9A6612" stroke-width="3"/><circle cx="-8" cy="-6" r="4" fill="#B87A22"/><circle cx="10" cy="8" r="4" fill="#B87A22"/><circle cx="12" cy="-12" r="3" fill="#B87A22"/></g><g transform="translate(36 8)"><ellipse rx="26" ry="16" fill="#58B7C9" stroke="${MC.ink}" stroke-width="3"/><path d="M24 0L46 -16V16Z" fill="#58B7C9" stroke="${MC.ink}" stroke-width="3"/><circle cx="-12" cy="-3" r="3.4" fill="${MC.ink}"/></g><g transform="translate(40 -44)"><ellipse rx="16" ry="9" fill="#5FB26A" transform="rotate(-30)"/><ellipse cx="-4" cy="14" rx="14" ry="8" fill="#7CCB86" transform="rotate(20)"/></g><g transform="translate(-86 -76)"><circle r="22" fill="#E8665F" stroke="${MC.ink}" stroke-width="3"/><path d="M-10 0H10" stroke="#fff" stroke-width="7" stroke-linecap="round"/></g>`;
const icoRun = (t) => { const a = Math.sin(t * 9) * 0.5; return `<g stroke="#1D7B75" stroke-width="13" stroke-linecap="round" stroke-linejoin="round" fill="none"><circle cx="14" cy="-70" r="18" fill="#1D7B75"/><path d="M6 -48L-8 -4L-34 ${f1(40 + a * 14)}M-8 -4L18 ${f1(30 - a * 12)}L8 ${f1(76 + a * 10)}M-2 -34L-34 ${f1(-14 - a * 10)}M0 -30L32 ${f1(-12 + a * 10)}"/></g><g stroke="#9FB8B0" stroke-width="6" stroke-linecap="round" opacity=".7"><path d="M-78 -40H-50M-90 -10H-52M-78 20H-48"/></g>`; };
const icoSmoke = (t) => `<g transform="rotate(-24)"><rect x="-84" y="-14" width="132" height="28" rx="6" fill="#F6F3EA" stroke="${MC.ink}" stroke-width="4"/><rect x="48" y="-14" width="40" height="28" rx="6" fill="#E59A3A" stroke="${MC.ink}" stroke-width="4"/><path d="M-84 -14V14" stroke="#B0442F" stroke-width="5"/></g><path d="M-62 -34C-80 -56 -48 -70 -66 -96M-34 -40C-52 -62 -20 -76 -38 -102" fill="none" stroke="#B9C4C8" stroke-width="7" stroke-linecap="round" opacity=".85"/><circle r="86" fill="none" stroke="#E8433A" stroke-width="12"/><path d="M-62 -62L62 62" stroke="#E8433A" stroke-width="12" stroke-linecap="round"/>`;
export function scenePrevent(t) {
  const a = seg(t, 54.6, 55.2) * (1 - seg(t, 62.4, 63.0)); if (a <= 0.01) return '';
  const W = 470, H = 330;
  const it = (t0, t1, x, y, ico, l1, l2) => { const ap = seg(t, t0, t0 + 0.4, eob), hi = win(t, t0 + 0.1, t1, 0.3); return cardBox(x, y, W, H, ap, 0.94 + 0.06 * ap, hi, ico, l1, l2); };
  let s = bg(t) + floor(1862);
  s += it(57.5, 58.8, 60, 300, icoTube(t), 'Periksa', 'profil lipid');
  s += it(58.8, 60.0, 550, 300, icoPlate(), 'Batasi', 'lemak jenuh');
  s += it(60.0, 61.2, 60, 660, icoRun(t), 'Aktif', 'bergerak');
  s += it(61.2, 62.6, 550, 660, icoSmoke(t), 'Hindari', 'rokok');
  // Raka: mendengar -> menunjuk -> jalan di tempat saat "aktif bergerak" -> mengerti
  const wc = walkCycle(t * 1.5, { dir: 1, stride: 26, swing: 22 }), jog = seg(t, 59.9, 60.3) * (1 - seg(t, 61.1, 61.5));
  const pt = raka('menunjuk', 'menunjuk', { yaw: 0, gazeX: 0.3, gazeY: -0.3 });
  const hear = raka('berpikir', 'berpikir', { yaw: 0, gazeY: -0.3 }), good = raka('mengerti', 'netral', { yaw: 0 });
  let st = t < 57.3 ? hear : t < 60.0 ? pt : t < 61.2 ? raka('senang', 'jalan', { ...wc, yaw: 0.3, gazeX: 0.5 }) : good;
  st = lerpState(st, st, 1); st = rIdle(st, t);
  const k = 1.1;
  s += `<g transform="translate(${f1(540 - 200 * k)} ${f1(1860 - 778 * k)}) scale(${k})">${rakaBody(st, 'rkP', { dark: true })}</g>`;
  s += A.chips(t, [[55.3, 57.4, 'Menurunkan risiko', 0, 0, 540, 640, { noLine: true, fs: 44, bg: MC.gold }]]);
  return `<g opacity="${f1(a)}">${s}</g>`;
}

// ------------------------------------------------------------------ adegan 14: dokter menilai obat (62,4 - 66,0)
export function sceneDoctor(t) {
  const a = seg(t, 62.4, 63.0) * (1 - seg(t, 65.6, 66.2)); if (a <= 0.01) return '';
  let s = bg(t) + floor(1800);
  const pill = (x, y, r, k = 1) => `<g transform="translate(${x} ${y}) rotate(${r}) scale(${k})"><rect x="-64" y="-28" width="128" height="56" rx="28" fill="#fff" stroke="${MC.ink}" stroke-width="5"/><path d="M0 -28H36A28 28 0 0 1 36 28H0Z" fill="#E8665F"/><rect x="-64" y="-28" width="128" height="56" rx="28" fill="none" stroke="${MC.ink}" stroke-width="5"/></g>`;
  // kartu lab melayang + kapsul
  const ap = seg(t, 63.1, 63.6, eo);
  s += `<g opacity="${f1(ap)}" transform="translate(${f1(560 - 190 * 0.9)} ${f1(470 - (1 - ap) * 50)}) scale(.9) rotate(-3)">${labCard(t, 1)}</g>`;
  s += `<g opacity="${f1(seg(t, 64.3, 64.8, eob))}">${pill(790, 760, 25 + Math.sin(t * 3) * 6, 1.15)}</g>`;
  // Raka (kiri) dan dokter (kanan, menghadap kiri)
  const rk = rIdle(raka('berpikir', 'berpikir', { yaw: 0.35, gazeX: 0.6 }), t), k = 1.12;
  s += `<g transform="translate(${f1(300 - 200 * k)} ${f1(1800 - 778 * k)}) scale(${k})">${rakaBody(rk, 'rkD', { dark: true })}</g>`;
  const pDoc = rIdle(raka('lega', 'menunjuk', { yaw: 0.3, gazeX: 0.5, flip: 1 }), t + 0.7);
  const dr = rakaSvg(pDoc, { bare: true, outfit: 'jas', palette: PALETTE_DOSEN, uid: 'dr', dark: true });
  s += `<g transform="translate(${f1(790 - 200 * k)} ${f1(1800 - 778 * k)}) scale(${k})">${dr}</g>`;
  s += A.chips(t, [[63.3, 65.4, 'Dokter menilai kebutuhan obat', 0, 0, 540, 392, { noLine: true, fs: 42, bg: MC.gold }]]);
  return `<g opacity="${f1(a)}">${s}</g>`;
}
import { rakaSvg } from './raka.js';

// ------------------------------------------------------------------ adegan 15: kolesterol tinggi sering tidak terasa (65,6 - 68,8): Raka berjalan santai, jendela memperlihatkan plak yang diam-diam ada
export function sceneStroll(t) {
  const a = seg(t, 65.6, 66.2) * (1 - seg(t, 68.4, 69.0)); if (a <= 0.01) return '';
  let s = bg(t) + floor(1790);
  // lantai bergulir
  for (let i = -1; i < 9; i += 1) { const x = ((i * 150 - (t * 150) % 150) + 1200) % 1350 - 135; s += `<rect x="${f1(x)}" y="1800" width="90" height="10" rx="5" fill="#2E8E88" opacity=".35"/>`; }
  const wc = walkCycle(t * 1.45, { dir: 1, stride: 34, swing: 24 });
  const st = rIdle(raka('senang', 'jalan', { ...wc, yaw: 0.3, gazeX: 0.5 }), t), k = 1.12;
  s += `<g transform="translate(${f1(540 - 200 * k)} ${f1(1790 - 778 * k)}) scale(${k})">${rakaBody(st, 'rkW', { dark: true })}</g>`;
  // jendela "di dalam tubuh": arteri dengan plak, tidak ada gejala
  const ap = seg(t, 66.1, 66.7, eo), cx = 540, cy = 640, R = 270, tw = 37.2 + (t - 65.6) * 0.8;
  const tail = [[540, 1060, 20], [540, 960, 30], [540, 880, 40]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r * ap}" fill="${MC.ivory}" stroke="${MC.ink}" stroke-width="4"/>`).join('');
  s += `<g opacity="${f1(ap)}">${tail}<circle cx="${cx}" cy="${cy}" r="${R + 14}" fill="${MC.ivory}" stroke="${MC.ink}" stroke-width="5"/><clipPath id="clipLens"><circle cx="${cx}" cy="${cy}" r="${R}"/></clipPath><g clip-path="url(#clipLens)"><g transform="translate(${cx} ${cy}) scale(.66) translate(-70 0)">${vesselWorld(tw, { cx: 70, cy: 0, S: 0.66 })}</g></g></g>`;
  s += A.chips(t, [[66.4, 68.4, 'Sering tanpa gejala', cx + 190, cy - 200, 540, 330, { fs: 42 }]]);
  return `<g opacity="${f1(a)}">${s}</g>`;
}

// ------------------------------------------------------------------ adegan 16: penutup (68,4 - 72,24)
export function sceneClose(t) {
  const a = seg(t, 68.4, 69.0); if (a <= 0.01) return '';
  let s = bg(t) + floor(1790);
  const wave = Math.sin(t * 6) * 0.5;
  const base = raka('mengerti', 'senang', { yaw: 0, gazeY: -0.2 });
  const st = rIdle(lerpState(raka('mengerti', 'netral', { yaw: 0 }), base, seg(t, 70.5, 71.0)), t), k = 1.12;
  s += `<g transform="translate(${f1(540 - 200 * k)} ${f1(1790 - 778 * k)}) scale(${k})">${rakaBody(st, 'rkC', { dark: true })}</g>`;
  // tiga kebiasaan sebagai pita ikon di atas Raka, muncul mengikuti "kenali risikonya"
  const row = (t0, x, y, ico, l1, l2) => { const ap = seg(t, t0, t0 + 0.4, eob); return `<g opacity="${f1(ap)}" transform="translate(${x} ${f1(y + (1 - ap) * 30)}) scale(${f1(0.94 + 0.06 * ap)})"><rect x="-150" y="-120" width="300" height="250" rx="34" fill="#021014" opacity=".3" transform="translate(6 10)"/><rect x="-150" y="-120" width="300" height="250" rx="34" fill="${MC.ivory}" stroke="${MC.ink}" stroke-width="3"/><g transform="translate(0 -22) scale(.62)">${ico}</g><text y="86" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="36" fill="${MC.ink}">${l1}</text><text y="124" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="36" fill="${MC.ink}">${l2}</text></g>`; };
  s += row(69.7, 200, 470, icoTube(t), 'Periksa', 'profil lipid') + row(70.2, 540, 470, icoPlate(), 'Atur', 'pola makan') + row(70.7, 880, 470, icoRun(t), 'Aktif', 'bergerak');
  s += A.tag(540, 750, 'Kenali risikonya sebelum darurat', { fs: 40, a: seg(t, 69.6, 70.1), bg: MC.gold, fg: MC.ink, stroke: MC.ink });
  const lg = seg(t, 71.0, 71.6, eo);
  s += `<g opacity="${f1(lg)}" transform="translate(0 ${f1((1 - lg) * 20)})"><rect x="384" y="170" width="312" height="76" rx="38" fill="${MC.ivory}" stroke="${MC.ink}" stroke-width="3"/><image href="logo-full.webp" x="406" y="183" height="50" preserveAspectRatio="xMinYMid meet"/></g>`;
  return `<g opacity="${f1(a)}">${s}</g>`;
}

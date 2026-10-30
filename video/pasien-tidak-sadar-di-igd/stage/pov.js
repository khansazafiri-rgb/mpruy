// Pembuka: pandangan orang pertama pasien di atas ranjang yang didorong. Semuanya string SVG yang dihitung dari waktu.
import { clamp, lerp, ease, easeOut, easeInOut, kf, win, seg, r1, rnd, rect, circ, txt, poly, g, place, placeHead, C } from './lib.js';
import { raka, rakaSvg } from '../../../brand/characters/raka/raka.js';
import { orang, orangSvg, LOOKS, idleOrang } from './orang.js';

const VPY = 250, KX = 640, KY = 470;
const proj = (X, z) => [540 + (X / z) * KX, VPY + (1 / z) * KY];

// Langit-langit IGD: panel lampu memanjang yang meluncur dari jauh (atas layar) ke dekat (bawah layar). travel = jarak tempuh.
export function povCeiling(travel, dim = 1) {
  let s = '';
  s += rect(0, 0, 1080, 1920, '#101F33');
  // dasar langit-langit lebih terang di dekat lampu
  s += `<defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1B2E47"/><stop offset=".6" stop-color="#2A4560"/><stop offset="1" stop-color="#355470"/></linearGradient></defs>` + rect(0, 0, 1080, 1920, 'url(#cg)');
  // garis rel langit-langit yang menuju titik hilang
  for (const X of [-3.6, -2.4, -1.5, -0.5, 0.5, 1.5, 2.4, 3.6]) {
    const [x0, y0] = proj(X, 0.16), [x1, y1] = proj(X, 9);
    s += `<path d="M${r1(x0)} ${r1(y0)}L${r1(x1)} ${r1(y1)}" stroke="#0E1B2D" stroke-width="3" opacity=".7"/>`;
  }
  // garis melintang (sambungan ubin) bergerak bersama
  for (let j = 0; j < 14; j++) {
    const z = (((j * 0.9 - travel) % 12.6) + 12.6) % 12.6 + 0.16;
    const [xa, ya] = proj(-4, z), [xb] = proj(4, z);
    s += `<path d="M${r1(xa)} ${r1(ya)}L${r1(xb)} ${r1(ya)}" stroke="#0E1B2D" stroke-width="${r1(1 + 3 / z)}" opacity=".55"/>`;
  }
  // panel lampu
  const items = [];
  for (const X of [-1.25, -0.42, 0.42, 1.25]) for (let j = 0; j < 10; j++) {
    const z = (((j * 1.25 - travel + (Math.abs(X) < 1 ? 0.62 : 0)) % 12.5) + 12.5) % 12.5 + 0.2;
    items.push([z, X]);
  }
  items.sort((a, b) => b[0] - a[0]);
  for (const [z, X] of items) {
    const hw = 0.2, l = 0.62;
    const a = proj(X - hw, z), b = proj(X + hw, z), c = proj(X + hw, z + l), d = proj(X - hw, z + l);
    const fade = clamp(1 - (z - 6) / 6, 0.2, 1) * dim;
    const hh = 0.5;
    const ha = proj(X - hh, z - 0.05), hb = proj(X + hh, z - 0.05), hc = proj(X + hh, z + l + 0.1), hd = proj(X - hh, z + l + 0.1);
    s += poly([ha, hb, hc, hd], '#9ED8FF', `opacity="${r1(0.16 * fade)}"`);
    s += poly([a, b, c, d], '#E4F4FF', `opacity="${r1(fade)}"`);
    s += poly([a, b, c, d].map((p, i) => [lerp(p[0], 540 + (p[0] - 540) * 0.0 + (X * 0), 0), p[1]]), '#FFFFFF', 'opacity="0"');
  }
  // pipa/ducting memanjang di sisi
  for (const X of [-2.7, 2.7]) {
    const [x0, y0] = proj(X, 0.2), [x1, y1] = proj(X, 8);
    s += `<path d="M${r1(x0)} ${r1(y0)}L${r1(x1)} ${r1(y1)}" stroke="#314A63" stroke-width="${r1(40)}" stroke-linecap="round" opacity=".55"/>`;
  }
  return s;
}

const blurId = (b) => (b < 0.5 ? '' : b < 2 ? ' filter="url(#bl1)"' : b < 4.5 ? ' filter="url(#bl3)"' : ' filter="url(#bl6)"');
export const POV_DEFS = `<defs><filter id="bl1" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="1.6"/></filter><filter id="bl3" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="4"/></filter><filter id="bl6" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="9"/></filter></defs>`;

// Wajah tenaga kesehatan yang menunduk melihat pasien (potongan kepala dan bahu dari bawah). k = 0..1 seberapa jauh sudah masuk.
export function povFace(who, side, k, t, o = {}) {
  const look = LOOKS[who];
  const sgn = side === 'L' ? -1 : 1;
  const talk = o.talk ? Math.max(0, Math.sin(t * 11 + (o.seed || 0))) : 0;
  const st = idleOrang(orang('peduli', 'berdiri', { yaw: -sgn * 0.5, gazeX: 0, gazeY: 0.6, headDown: 0, mouth: { w: 11, up: 2, lo: 8 + talk * 10 } }), t, o.seed || 0);
  const svg = orangSvg(st, look, { bare: true, shadow: false, legs: false, uid: 'pf' + side + who });
  const hx = lerp(sgn * 330 + 540, side === 'L' ? 150 : 930, easeOut(k)) + (o.dx || 0);
  const hy = (o.y || 1150) + (1 - easeOut(k)) * 260 + Math.sin(t * 6 + (o.seed || 0)) * 6;
  const s = o.s || 1.7;
  return `<g${blurId(o.blur ?? (1 - k) * 8)}>` + placeHead(svg, hx, hy, s, sgn * -14 * easeOut(k)) + '</g>';
}

// Tubuh sendiri dilihat dari mata: seprai, pagar ranjang, dua tangan di perut dengan bercak darah secukupnya.
export function povBody(t, o = {}) {
  const tw = o.tremor || 0;
  const st = raka('netral', 'pov_perut', { blood: 1, breath: 0.5 + 0.5 * Math.sin(t * 2.0), armL: { wx: 168 + Math.sin(t * 23) * tw, wy: 536 + Math.cos(t * 19) * tw * 0.6 }, armR: { wx: 236 - Math.sin(t * 21) * tw, wy: 528 } });
  const body = rakaSvg(st, { bare: true, shadow: false, uid: 'povb' });
  const sc = 2.9;
  let s = rect(0, 0, 1080, 1920, '#1E2C3C');
  s += `<g clip-path="url(#povclip)"><g transform="translate(${r1(540 - 200 * sc)} ${r1(710 - 366 * sc)}) scale(${sc})">${body}</g></g>`;
  s += `<defs><clipPath id="povclip"><rect x="0" y="710" width="1080" height="${r1(250 * sc)}"/></clipPath></defs>`;
  // seprai rumah sakit menutupi bagian bawah dan kiri-kanan, pagar ranjang di tepi
  s += `<path d="M0 1380C200 1352 380 1368 540 1384C720 1368 880 1352 1080 1380L1080 1920L0 1920Z" fill="#E4EFEE"/>`;
  s += `<path d="M0 1520C180 1498 400 1510 560 1524C740 1510 900 1496 1080 1522" stroke="#C8DCDA" stroke-width="18" fill="none" stroke-linecap="round"/>`;
  s += `<path d="M0 1700C220 1680 420 1692 600 1704C780 1692 940 1678 1080 1700" stroke="#D6E7E5" stroke-width="14" fill="none" stroke-linecap="round"/>`;
  s += rect(-20, 700, 70, 1300, '#9FB2BF', 30) + rect(1030, 700, 70, 1300, '#9FB2BF', 30) + rect(-20, 700, 28, 1300, '#C5D3DC', 14) + rect(1052, 700, 28, 1300, '#C5D3DC', 14);
  // bantalan perekat di punggung tangan (tanpa detail)
  return s;
}

// Pintu IGD dari jauh: dua daun pintu hijau pucat dengan jendela bundar dan papan IGD yang menyala. k = 0..1 (mendekat).
export function povDoors(k, t) {
  const w = lerp(150, 860, easeInOut(k)), h = w * 1.18, cx = 540, cy = lerp(430, 790, easeInOut(k));
  let s = '';
  s += rect(cx - w * 0.64, cy - h * 0.7, w * 1.28, h * 1.32, '#CFE0E3', w * 0.04);
  s += rect(cx - w / 2, cy - h / 2, w / 2 - 3, h, '#A8D3C8', w * 0.02) + rect(cx + 3, cy - h / 2, w / 2 - 3, h, '#A8D3C8', w * 0.02);
  for (const sx of [-1, 1]) { s += circ(cx + sx * w * 0.25, cy - h * 0.12, w * 0.13, '#DDF3F7'); s += circ(cx + sx * w * 0.25, cy - h * 0.12, w * 0.13, 'none', `stroke="#7FB5AF" stroke-width="${r1(w * 0.02)}"`); }
  s += rect(cx - w * 0.04, cy - h * 0.02, w * 0.02, h * 0.18, '#7B8F98', w * 0.01) + rect(cx + w * 0.02, cy - h * 0.02, w * 0.02, h * 0.18, '#7B8F98', w * 0.01);
  const pulse = 0.85 + 0.15 * Math.sin(t * 6);
  s += `<g opacity="${r1(pulse)}">` + rect(cx - w * 0.3, cy - h * 0.7 - w * 0.2, w * 0.6, w * 0.16, '#D9382F', w * 0.03) + txt('IGD', cx, cy - h * 0.7 - w * 0.2 + w * 0.12, { size: r1(w * 0.12), fill: '#fff', ls: w * 0.01 }) + '</g>';
  s += circ(cx, cy - h * 0.7 - w * 0.12, w * 0.5, '#FF6B5E', `opacity="${r1(0.12 * pulse)}"`);
  return s;
}

// Sosok tenaga kesehatan kecil di kiri dan kanan dekat pintu (berjalan bersama ranjang)
export function povRunners(t, k) {
  let s = '';
  const mk = (who, x, y, sc, flip, seed) => {
    const bob = Math.sin(t * 9 + seed) * 5;
    const st = idleOrang(orang('fokus', 'berdiri', { flip, bob }), t, seed);
    return place(orangSvg(st, LOOKS[who], { bare: true, shadow: false, legs: false }), x, y + bob, sc);
  };
  s += `<g opacity="${r1(clamp(k * 2, 0, 1))}">` + mk('perawat', lerp(40, 160, k), 1480, 0.62, 1, 1) + mk('dokterPria', lerp(1040, 930, k), 1500, 0.66, 0, 2) + '</g>';
  return s;
}

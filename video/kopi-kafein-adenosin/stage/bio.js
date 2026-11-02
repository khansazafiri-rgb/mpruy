// Dunia dalam tubuh: molekul (adenosin ungu, kafein oranye), reseptor (biru), neuron, perjalanan pencernaan -> darah -> otak.
// Semua penyederhanaan visual; bentuk dan warna konsisten sepanjang video. Semua fungsi murni (waktu -> string SVG).
import { C, clamp, lerp, ease, easeOut, easeInOut, backOut, seg, win, kf, r1, rnd, g, rect, circ, txt, poly } from './lib.js';

export const COL = {
  aden: '#9A78E8', adenD: '#6F4CC4', caf: '#F5941F', cafD: '#C86A06', cafBump: '#FFE7B8',
  rec: '#3F7AE0', recD: '#2A57B2', recIn: '#17398A',
  mem: '#F0A8BE', memD: '#D98AA6', cell: '#6B3F7E', cellD: '#55306A',
  bg1: '#1C1946', bg2: '#2E2A6B', blood: '#E24B4B', bloodD: '#B83434', plasma: '#F59A98',
};

// ---------- bentuk purin (cincin enam + cincin lima) dipakai adenosin dan kafein ----------
const HEX = [[30, 0], [15, 26], [-15, 26], [-30, 0], [-15, -26], [15, -26]];
const PENT = (() => {
  const A = [15, -26], B = [30, 0], M = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2], L = Math.hypot(B[0] - A[0], B[1] - A[1]);
  const nrm = [M[0] / Math.hypot(...M), M[1] / Math.hypot(...M)], ap = L / (2 * Math.tan(Math.PI / 5)), R = L / (2 * Math.sin(Math.PI / 5));
  const c = [M[0] + nrm[0] * ap, M[1] + nrm[1] * ap], a0 = Math.atan2(B[1] - c[1], B[0] - c[0]);
  return Array.from({ length: 5 }, (_, i) => [c[0] + R * Math.cos(a0 - i * (2 * Math.PI) / 5), c[1] + R * Math.sin(a0 - i * (2 * Math.PI) / 5)]);
})();
const pts = (a) => a.map((p) => r1(p[0]) + ',' + r1(p[1])).join(' ');
const PURINE = (fill, dark) => `<polygon points="${pts(HEX)}" fill="${fill}" stroke="${fill}" stroke-width="10" stroke-linejoin="round"/><polygon points="${pts(PENT)}" fill="${fill}" stroke="${fill}" stroke-width="10" stroke-linejoin="round"/>`
  + `<polygon points="${pts(HEX.map((p) => [p[0] * 0.55, p[1] * 0.55]))}" fill="${dark}" opacity=".35"/>`;
/** Adenosin: purin ungu + gula (lingkaran ungu tua) di kanan-bawah. */
export function adenosine(x, y, s = 1, r = 0, o = 1, glow = 0) {
  return g((glow > 0.02 ? circ(10, -10, 84, COL.aden, `opacity="${r1(0.28 * glow)}"`) : '') + PURINE(COL.aden, COL.adenD)
    + `<path d="M20 22L40 50" stroke="${COL.adenD}" stroke-width="9" stroke-linecap="round"/>` + circ(46, 58, 19, COL.adenD) + circ(46, 58, 8, '#C8B3FF'), { x, y, s, r, o });
}
/** Kafein: purin oranye + tiga tonjolan krem (gugus metil). */
export function caffeine(x, y, s = 1, r = 0, o = 1, glow = 0) {
  return g((glow > 0.02 ? circ(10, -10, 84, COL.caf, `opacity="${r1(0.3 * glow)}"`) : '') + PURINE(COL.caf, COL.cafD)
    + [[-30, 0, -50, 0], [15, 26, 26, 50], [PENT[2][0], PENT[2][1], PENT[2][0] + 18, PENT[2][1] - 18]].map(([x1, y1, x2, y2]) => `<path d="M${r1(x1)} ${r1(y1)}L${r1(x2)} ${r1(y2)}" stroke="${COL.cafD}" stroke-width="8" stroke-linecap="round"/>${circ(x2, y2, 12, COL.cafBump)}`).join(''), { x, y, s, r, o });
}
/** Reseptor adenosin: protein biru berbentuk cangkir terbuka yang menancap di membran (alas di (x, y)). Takik di tengah tempat molekul menempel. */
export function receptor(x, y, s = 1, o = 1, lit = 0, litCol = COL.aden) {
  return g((lit > 0.02 ? circ(0, -100, 92, litCol, `opacity="${r1(0.35 * lit)}"`) : '')
    + `<path d="M-34 6L-50 -70Q-60 -126 -26 -138L-12 -112Q0 -104 12 -112L26 -138Q60 -126 50 -70L34 6Z" fill="${COL.rec}"/>`
    + `<path d="M-18 -118Q0 -92 18 -118L12 -110Q0 -100 -12 -110Z" fill="${COL.recIn}" opacity=".7"/>`
    + `<path d="M-34 6L-50 -70" stroke="${COL.recD}" stroke-width="8" stroke-linecap="round" fill="none" opacity=".6"/>`, { x, y, s, o });
}
/** Titik tempat ligan menempel pada reseptor (koordinat layar). */
export const dock = (x, y, s = 1) => [x, y - 118 * s];

// ---------- neuron: membran + reseptor + isi sel ----------
export const NEURON = { memY: 1100, xs: [190, 410, 630, 850] };
export function neuronBg(t, { pulse = 0 } = {}) {
  let s = `<defs><linearGradient id="nbg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${COL.bg2}"/><stop offset="1" stop-color="${COL.bg1}"/></linearGradient></defs>` + rect(-40, -40, 1160, 2000, 'url(#nbg)');
  // sel-sel samar di latar
  for (let i = 0; i < 9; i++) {
    const x = 90 + rnd(i) * 900 + Math.sin(t * 0.3 + i) * 14, y = 560 + rnd(i + 11) * 480 + Math.cos(t * 0.27 + i) * 12, r = 36 + rnd(i + 3) * 60;
    s += circ(x, y, r, '#FFFFFF', `opacity=".035"`);
  }
  // membran: pita pink + kepala fosfolipid berderet
  const my = NEURON.memY;
  s += rect(-40, my, 1160, 1000, COL.cell) + rect(-40, my + 120, 1160, 900, COL.cellD, 0, 'opacity=".55"');
  s += rect(-40, my - 4, 1160, 50, COL.mem);
  for (let x = -20; x < 1100; x += 34) s += circ(x, my - 2, 12, COL.memD) + circ(x, my + 44, 10, COL.memD, 'opacity=".7"');
  // inti sel samar di bawah
  s += circ(540, my + 420, 170, '#7C5392', 'opacity=".6"') + circ(500, my + 400, 66, '#5E3A75', 'opacity=".6"');
  return s;
}

// ---------- gauge dorongan tidur (horizontal) ----------
export function sleepGauge(fill, t, { x = 60, y = 430, w = 870, label = 'DORONGAN TIDUR', face = null } = {}) {
  const f = clamp(fill, 0, 1), col = f < 0.5 ? '#9DE0BD' : f < 0.8 ? '#F8C038' : '#F2735E';
  let s = rect(x, y, w, 138, 'rgba(10,8,40,.72)', 34);
  s += txt(label, x + 176, y + 50, { size: 32, fill: '#CFC8FF', anchor: 'start', ls: 2 });
  s += rect(x + 176, y + 72, w - 216, 38, '#2C2760', 19) + rect(x + 176, y + 72, Math.max(0, (w - 216) * f), 38, col, 19);
  for (let i = 1; i < 5; i++) s += rect(x + 176 + (w - 216) * i / 5 - 2, y + 72, 4, 38, '#2C2760');
  s += face ? face(x + 88, y + 69) : `<g transform="translate(${x + 88} ${y + 69})">${circ(0, 0, 46, '#F4EBD8')}<path d="M10 -26a26 26 0 1 0 14 40a22 22 0 1 1 -14 -40z" fill="#F8C038"/></g>`;
  return s;
}

// ---------- sinyal "z z z" (kantuk) yang keluar dari reseptor aktif ----------
export function zzz(x, y, t, o = 1, size = 1) {
  let s = '';
  for (let i = 0; i < 3; i++) {
    const p = ((t * 0.7 + i / 3) % 1), yy = y - p * 120 * size, xx = x + Math.sin(p * 6 + i) * 10 * size;
    s += txt('z', xx, yy, { size: (30 + i * 8) * size, fill: '#E4DDFF', weight: 800, extra: `opacity="${r1(o * Math.sin(p * Math.PI))}"` });
  }
  return s;
}

// ---------- perjalanan pencernaan -> darah (dunia vertikal) ----------
// Koordinat dunia: x 0..1080; y menurun. Kamera menggeser seluruh dunia.
export const GI = { mugY: 700, throatY: 1500, stomachY: 2300, gutY: 3200, absY: 3620, vesselY: 4500 };
const wavyTube = (cx, y0, y1, w, t, amp = 14, fill = '#F4A6A6', inner = '#B65B6B') => {
  const left = [], right = [];
  for (let y = y0; y <= y1; y += 40) { const sq = Math.sin(y * 0.02 - t * 3) * amp; left.push([cx - w / 2 - sq, y]); right.push([cx + w / 2 + sq, y]); }
  const outer = left.concat(right.reverse());
  const iw = w - 70; const li = [], ri = [];
  for (let y = y0; y <= y1; y += 40) { const sq = Math.sin(y * 0.02 - t * 3) * amp; li.push([cx - iw / 2 - sq * 0.8, y]); ri.push([cx + iw / 2 + sq * 0.8, y]); }
  return poly(outer, fill) + poly(li.concat(ri.reverse()), inner);
};
/** Dunia pencernaan: cangkir (kopi) -> kerongkongan -> lambung -> usus + vili -> pembuluh. flow = 0..1 posisi kamera sepanjang jalur. */
export function giWorld(t, a, T) {
  let s = '';
  // latar jaringan hangat (merah muda gelap)
  s += rect(-40, -200, 1160, 6800, '#7E3A52');
  for (let i = 0; i < 26; i++) s += circ(100 + rnd(i) * 880, 300 + rnd(i + 9) * 4800, 40 + rnd(i + 4) * 60, '#9A4B66', 'opacity=".35"');
  // 1) cangkir kopi: permukaan kopi cokelat dengan kafein berputar
  s += rect(-40, GI.mugY - 420, 1160, 840, '#4B2E1E') + rect(-40, GI.mugY - 420, 1160, 90, '#6B4330');
  for (let i = 0; i < 4; i++) s += `<path d="M${-40} ${GI.mugY - 200 + i * 130}q270 -${50 + i * 10} 540 0t540 0" stroke="#7A5139" stroke-width="10" fill="none" opacity=".6" transform="translate(${r1(Math.sin(t * 1.2 + i) * 30)} 0)"/>`;
  // 2) kerongkongan: tabung bergelombang menurun
  s += wavyTube(540, GI.mugY + 380, GI.stomachY - 200, 330, t, 16);
  // 3) lambung: kantung besar
  s += `<path d="M300 ${GI.stomachY - 260}Q250 ${GI.stomachY + 200} 520 ${GI.stomachY + 330}Q860 ${GI.stomachY + 380} 840 ${GI.stomachY + 40}Q820 ${GI.stomachY - 140} 700 ${GI.stomachY - 260}Z" fill="#F4A6A6"/>`
    + `<path d="M350 ${GI.stomachY - 220}Q320 ${GI.stomachY + 170} 530 ${GI.stomachY + 270}Q790 ${GI.stomachY + 310} 780 ${GI.stomachY + 40}Q765 ${GI.stomachY - 110} 670 ${GI.stomachY - 220}Z" fill="#B65B6B"/>`;
  // 4) usus halus: pita lebar berkelok dengan vili (jari-jari kecil) di dinding
  s += `<path d="M540 ${GI.stomachY + 320}C540 ${GI.gutY - 400} 200 ${GI.gutY - 300} 200 ${GI.gutY - 100}S880 ${GI.gutY + 100} 880 ${GI.gutY + 300}S300 ${GI.gutY + 460} 380 ${GI.gutY + 700}" fill="none" stroke="#F4A6A6" stroke-width="250" stroke-linecap="round"/>`
    + `<path d="M540 ${GI.stomachY + 320}C540 ${GI.gutY - 400} 200 ${GI.gutY - 300} 200 ${GI.gutY - 100}S880 ${GI.gutY + 100} 880 ${GI.gutY + 300}S300 ${GI.gutY + 460} 380 ${GI.gutY + 700}" fill="none" stroke="#B65B6B" stroke-width="170" stroke-linecap="round"/>`;
  for (let i = 0; i < 22; i++) {
    const u = i / 21, yy = GI.gutY - 300 + u * 1000, xx = 540 + Math.sin(u * 7 + 0.5) * 330;
    s += `<path d="M${r1(xx)} ${r1(yy)}q-8 -50 0 -80q10 30 0 80z" fill="#F7C0C0" transform="rotate(${r1(Math.sin(i) * 20)} ${r1(xx)} ${r1(yy)}) translate(${r1(Math.sin(t * 2 + i) * 4)} 0)"/>`;
  }
  // 4b) dinding usus: vili besar dengan kapiler merah di dalamnya (tempat kafein diserap ke darah)
  s += rect(-40, GI.absY - 250, 1160, 220, '#B65B6B') + rect(-40, GI.absY - 40, 1160, 560, '#9A4B66');
  for (let i = 0; i < 5; i++) {
    const vx = 130 + i * 205, wob = Math.sin(t * 2 + i) * 6;
    s += `<path d="M${vx - 70} ${GI.absY - 40}Q${vx - 80} ${GI.absY + 330} ${r1(vx + wob)} ${GI.absY + 350}Q${vx + 80} ${GI.absY + 330} ${vx + 70} ${GI.absY - 40}Z" fill="#F7C0C0"/>`
      + `<path d="M${vx - 20} ${GI.absY - 20}V${GI.absY + 260}Q${vx} ${GI.absY + 310} ${vx + 20} ${GI.absY + 260}V${GI.absY - 20}" fill="none" stroke="${COL.blood}" stroke-width="24" stroke-linecap="round"/>`;
  }
  // 5) pembuluh darah: lorong horizontal luas dengan sel darah merah
  s += rect(-40, GI.vesselY - 380, 1160, 760, COL.plasma) + rect(-40, GI.vesselY - 380, 1160, 70, '#D9706E') + rect(-40, GI.vesselY + 310, 1160, 70, '#D9706E');
  for (let i = 0; i < 9; i++) {
    const xx = (((i * 260 + t * 240) % 1500) + 1500) % 1500 - 200, yy = GI.vesselY - 220 + (i * 137) % 440;
    s += `<g transform="translate(${r1(xx)} ${r1(yy)}) rotate(${r1(Math.sin(t + i) * 14)})">${`<ellipse rx="70" ry="48" fill="${COL.blood}"/><ellipse rx="34" ry="22" fill="${COL.bloodD}" opacity=".8"/>`}</g>`;
  }
  return s;
}

// ---------- peta tubuh ringkas: kafein menuju otak ----------
export function bodyMap(t, k, { glowBrain = 0 } = {}) {
  // siluet datar (bukan anatomi realistis): kepala, leher, badan; organ digambar sederhana
  let s = rect(-40, -40, 1160, 2000, '#F7EAD3');
  s += circ(540, 560, 190, '#F4C9A4') + rect(480, 700, 120, 100, '#F4C9A4') + rect(300, 780, 480, 620, '#F4C9A4', 120);
  // otak (di dalam kepala)
  s += `<path d="M440 560C420 480 480 430 540 450C600 430 660 480 640 560C670 620 610 670 540 650C470 670 410 620 440 560Z" fill="#F29BB0"/>`
    + `<path d="M540 452V640M470 520q30 20 0 50M610 520q-30 20 0 50" stroke="#D97592" stroke-width="7" fill="none" stroke-linecap="round"/>`;
  if (glowBrain > 0.02) s += circ(540, 550, 120, COL.caf, `opacity="${r1(0.3 * glowBrain)}"`);
  // lambung dan usus
  s += `<path d="M470 980Q430 1060 500 1100Q600 1130 600 1040Q590 980 530 960Z" fill="#E88C98"/>`;
  s += `<path d="M420 1160Q540 1120 660 1160Q700 1220 640 1250Q540 1280 440 1250Q380 1210 420 1160Z" fill="none" stroke="#E88C98" stroke-width="34" stroke-linecap="round"/>`;
  // jantung
  s += g(`<path d="M0 40S-56 6-56 -26q0-26 24-26 20 0 32 20 12-20 32-20 24 0 24 26C56 6 0 40 0 40z" fill="${COL.blood}"/>`, { x: 600, y: 900, s: 1.1 * (1 + 0.06 * Math.sin(t * 8)) });
  // jalur kafein: usus -> jantung -> otak
  const path = [[540, 1200], [640, 1130], [660, 980], [600, 900], [560, 780], [540, 640]];
  const L = [0]; for (let i = 1; i < path.length; i++) L.push(L[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]));
  const tot = L[L.length - 1], d = clamp(k, 0, 1) * tot;
  let d2 = `M${path[0][0]} ${path[0][1]}`, hx = path[0][0], hy = path[0][1];
  for (let i = 1; i < path.length; i++) {
    if (d >= L[i]) { d2 += `L${path[i][0]} ${path[i][1]}`; hx = path[i][0]; hy = path[i][1]; }
    else { const u = (d - L[i - 1]) / (L[i] - L[i - 1]); hx = lerp(path[i - 1][0], path[i][0], u); hy = lerp(path[i - 1][1], path[i][1], u); d2 += `L${r1(hx)} ${r1(hy)}`; break; }
  }
  s += `<path d="${d2}" fill="none" stroke="${COL.blood}" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" opacity=".75"/>`;
  s += caffeine(hx, hy, 0.62, t * 40, 1, 1);
  return s;
}

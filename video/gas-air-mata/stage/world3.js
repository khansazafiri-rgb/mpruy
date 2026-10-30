// Latar dan benda untuk video "Kena gas air mata saat demo?". Gambar datar, koordinat kanvas 1080 x 1920.
// Kerumunan, spanduk, dan poster sengaja tanpa pesan politik: papan kosong atau simbol umum.
export const R = (x, y, w, h, f, rx = 0, e = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${f}" ${e}/>`;
export const C = (x, y, r, f, e = '') => `<circle cx="${x}" cy="${y}" r="${r}" fill="${f}" ${e}/>`;
export const P = (d, f, e = '') => `<path d="${d}" fill="${f}" ${e}/>`;
export const L = (d, s, w, e = '') => `<path d="${d}" fill="none" stroke="${s}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${e}/>`;
export const FONT = `font-family="Plus Jakarta Sans" font-weight="800"`;
export const T = (x, y, txt, f, size, e = '', anchor = 'middle') => `<text x="${x}" y="${y}" ${FONT} font-size="${size}" fill="${f}" text-anchor="${anchor}" ${e}>${txt}</text>`;
const W = -400, WW = 1900;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const rnd = (i, k = 1) => { const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return s - Math.floor(s); };
export const FLOOR = 1330; // garis tanah tempat kaki Raka berpijak

// ------------------------------------------------------------ JALAN KOTA (latar demo)
// o.pan: geser latar (px) untuk efek paralaks saat kamera mengikuti Raka; o.haze: kabut ringan di latar
export function streetBg(t, o = {}) {
  const pan = o.pan || 0;
  const cols = ['#C9D4D9', '#DCCDB2', '#BFD0CB', '#E4CBB8'];
  const windows = (x, y, w, h, c, seed) => { let s = ''; const nc = Math.floor((w - 40) / 62), nr = Math.floor((h - 60) / 78); for (let i = 0; i < nc; i++) for (let j = 0; j < nr; j++) s += R(x + 28 + i * 62, y + 40 + j * 78, 36, 48, ((i * 7 + j * 3 + seed) % 5 === 0) ? '#F8E6A0' : c, 6); return s; };
  // gedung jauh: deretan berulang agar tetap penuh saat kamera berjalan
  let far = ''; const fx = pan * 0.25;
  for (let i = -2; i < 14; i++) {
    const x = i * 300 - 60 + fx, top = 300 + rnd(i + 20, 1) * 130, w = 270 + rnd(i + 20, 2) * 60, h = 980 - top, c = cols[((i % 4) + 4) % 4];
    if (x > 1200 || x + w < -100) continue;
    far += R(x, top, w, h, c) + windows(x, top, w, h, 'rgba(255,255,255,.55)', i + 9) + R(x, top - 12, w, 14, 'rgba(10,56,48,.16)');
  }
  const gx = 340 + pan * 0.3;
  const gedung = R(gx, 520, 520, 460, '#E8E0CF') + R(gx - 20, 500, 560, 26, '#D2C7AD') + Array.from({ length: 6 }, (_, i) => R(gx + 30 + i * 80, 540, 28, 440, '#F4EEE0')).join('') + P(`M${gx - 20} 500L${gx + 260} 430L${gx + 540} 500Z`, '#D9CFB4') + R(gx + 220, 760, 80, 220, '#9DB4AE', 6);
  const tree = (x, y, s) => { const tx = x + pan * 0.55; if (tx < -200 || tx > 1300) return ''; return R(tx - 12 * s, y, 24 * s, 150 * s, '#8A5A34', 8) + C(tx, y - 20 * s, 96 * s, '#3DB46E') + C(tx - 70 * s, y + 20 * s, 66 * s, '#2E9E5B') + C(tx + 74 * s, y + 14 * s, 70 * s, '#3DB46E'); };
  const palm = (x, y, s) => { const tx = x + pan * 0.55; if (tx < -250 || tx > 1330) return ''; let l = ''; for (let i = 0; i < 7; i++) { const a = -160 + i * 50; l += `<g transform="rotate(${a} ${tx} ${y})"><path d="M${tx} ${y}Q${tx + 70 * s} ${y - 26 * s} ${tx + 150 * s} ${y + 14 * s}Q${tx + 70 * s} ${y - 6 * s} ${tx} ${y + 6}Z" fill="#2E9E5B"/></g>`; } return L(`M${tx} ${y + 280 * s}Q${tx + 14} ${y + 120 * s} ${tx} ${y}`, '#9C6B47', 24 * s) + l + C(tx, y + 6, 14 * s, '#6B4527'); };
  let trees = '';
  for (let i = 0; i < 9; i++) { const x = 120 + i * 560; trees += i % 3 === 1 ? palm(x, 600, 1) : tree(x + (i % 2) * 90, 760 + (i % 2) * 40, 1 - (i % 2) * 0.1); }
  const pole = (x) => { const px = x + pan * 0.8; if (px < -100 || px > 1200) return ''; return R(px - 8, 520, 16, 520, '#6D7C84', 4) + R(px - 70, 560, 140, 10, '#6D7C84', 4) + R(px - 70, 600, 140, 10, '#6D7C84', 4); };
  let poles = ''; for (let i = 0; i < 8; i++) poles += pole(250 + i * 760);
  const wires = `<path d="M-40 570Q300 640 620 570T1300 570" fill="none" stroke="#5B6A72" stroke-width="3"/><path d="M-40 610Q300 680 620 610T1300 610" fill="none" stroke="#5B6A72" stroke-width="3"/>`;
  const road = R(W, 1000, WW, 1100, '#707B85') + R(W, 1000, WW, 52, '#C7CFD2') + R(W, 1052, WW, 8, '#9AA5AB');
  let lines = ''; for (let i = -3; i < 14; i++) { const x = ((i * 240 + pan * 1.0) % 3360 + 3360) % 3360 - 400; lines += R(x, 1620, 130, 16, 'rgba(255,255,255,.55)', 8); }
  const haze = o.haze ? R(W, 0, WW, 1500, `rgba(222,214,196,${(0.55 * o.haze).toFixed(3)})`) : '';
  return R(W, -300, WW, 1300, '#CFE8F3') + R(W, 640, WW, 360, '#E4F0EE') + far + gedung + trees + poles + wires + road + lines + haze;
}

// ------------------------------------------------------------ KERUMUNAN
// i-th orang: posisi dasar, kedalaman (0 jauh .. 1 dekat), warna baju dari set campuran. o.panic 0..1: berlari ke samping.
const SHIRT = ['#1F2429', '#C9D4D9', '#E8665F', '#F8C038', '#5BD0E6', '#8E7CE8', '#3DB46E', '#1F2429', '#E9E4D4', '#2E3744', '#1F2429', '#F2A950'];
const SKINS = ['#F2C29B', '#D9A074', '#C98F67', '#E8B88E', '#B97C55'];
export function crowdBack(t, o = {}) { return crowd(t, o, 0); }
export function crowdFront(t, o = {}) { return crowd(t, o, 1); }
function person(x, y, s0, i, t, o) {
  const s = s0 * 2.2;
  const panic = o.panic || 0, phase = t * (2.2 + panic * 3.2) + i * 1.7;
  const wf = o.walkF ?? 1, swing = Math.sin(phase) * 14 * s * wf, bob = Math.abs(Math.sin(phase)) * -6 * s * wf;
  const shirt = SHIRT[i % SHIRT.length], pants = ['#2E3744', '#3A4A58', '#5B4A3A', '#2A2F3A'][i % 4], skin = SKINS[i % SKINS.length];
  const dir = o.dir || 1;
  const hat = i % 5 === 0 ? P(`M${-24 * s} ${-100 * s}Q0 ${-132 * s} ${24 * s} ${-100 * s}Z`, '#E8665F') : i % 7 === 3 ? C(0, -108 * s, 24 * s, '#2A2F3A') : '';
  const sign = (i % 4 === 1) && !o.noSigns
    ? `${R(14 * s, -230 * s, 8 * s, 150 * s, '#8A5A34', 3)}${R(-40 * s, -330 * s, 110 * s, 84 * s, ['#fff', '#FFF1C6', '#DDF5EA', '#FFE3DF'][i % 4], 8 * s)}${C(15 * s, -288 * s, 18 * s, ['#E8665F', '#007060', '#F8C038', '#8E7CE8'][(i + 1) % 4])}`
    : '';
  return `<g transform="translate(${x.toFixed(1)} ${(y + bob).toFixed(1)})">`
    + P(`M${-22 * s} ${-46 * s}L${-26 * s - swing} 0L${-6 * s - swing} 0L${-2 * s} ${-46 * s}Z`, pants) + P(`M${22 * s} ${-46 * s}L${26 * s + swing} 0L${6 * s + swing} 0L${2 * s} ${-46 * s}Z`, pants)
    + R(-30 * s, -118 * s, 60 * s, 78 * s, shirt, 22 * s)
    + (o.cover && i % 3 === 0 ? R(8 * s, -128 * s, 30 * s, 12 * s, skin, 6 * s, `transform="rotate(-20 ${8 * s} ${-122 * s})"`) : '')
    + C(0, -138 * s, 24 * s, skin) + hat + P(`M${-24 * s} ${-140 * s}Q0 ${-170 * s} ${24 * s} ${-140 * s}Q${10 * s} ${-152 * s} ${-24 * s} ${-140 * s}Z`, ['#2A2F3A', '#4A2D2B', '#1F2429'][i % 3])
    + sign + `</g>`;
}
function crowd(t, o, layer) {
  // o.pan: geser latar (px, negatif = kamera maju ke kanan); o.walkF 0..1 langkah; o.panic + o.tPanic: berhamburan
  const N = o.n ?? 30, pan = o.pan || 0, panic = o.panic || 0, tp = o.tPanic ?? 1e9;
  const avoid = o.avoid; // [x, setengahLebar]: orang dekat Raka memudar supaya tidak menutupi
  const arr = [];
  for (let i = 0; i < N; i++) {
    const z = rnd(i, 2), front = z > 0.6 ? 1 : 0;
    if (front !== layer) continue;
    const s = 0.5 + z * 0.55;
    const baseX = -500 + rnd(i, 3) * 2300;
    let x = baseX + pan * (0.55 + z * 0.45);
    const k = clamp((t - tp) / 1.3, 0, 1);
    if (panic > 0 && t > tp) x += (i % 2 ? 1 : -1) * (k * k * 900 + k * 200) * (0.6 + rnd(i, 5));
    x = ((x + 700) % 2300 + 2300) % 2300 - 700;
    const y = FLOOR - 200 + z * 150 - (1 - z) * 30;
    arr.push([y, x, s, i]);
  }
  arr.sort((a, b) => a[0] - b[0]);
  let out = '';
  arr.forEach(([y, x, s, i]) => {
    if (x < -260 || x > 1340) return;
    let a = 1; if (avoid) a = clamp((Math.abs(x - avoid[0]) - avoid[1]) / 160, 0, 1);
    if (a <= 0.02) return;
    const running = panic > 0 && t > tp && t < tp + 3.2;
    const g = person(x, y, s, i, t, { ...o, walkF: running ? 1 : (o.walkF ?? 1), panic: running ? 1 : 0 });
    out += a < 0.99 ? `<g opacity="${a.toFixed(2)}">${g}</g>` : g;
  });
  return out;
}

// ------------------------------------------------------------ ASAP GAS AIR MATA (datar, kepulan)
// pusat (cx, cy); t0 = saat menyebar; scale = ukuran akhir; o.alpha = kepekatan
export function smokeSvg(t, t0, cx, cy, scale = 1, alpha = 0.9, seed = 1) {
  const u = clamp((t - t0) / 1.5, 0, 1); if (u <= 0) return '';
  const grow = 1 - Math.pow(1 - u, 3);
  let out = '';
  for (let i = 0; i < 18; i++) {
    const a = rnd(i, seed) * Math.PI * 2, d = (60 + rnd(i, seed + 1) * 360) * grow * scale;
    const x = cx + Math.cos(a) * d * 1.5 + Math.sin(t * 0.7 + i) * 14, y = cy + Math.sin(a) * d * 0.55 - rnd(i, seed + 2) * 110 * grow * scale + Math.cos(t * 0.6 + i * 2) * 8;
    const r = (60 + rnd(i, seed + 3) * 110) * (0.35 + 0.65 * grow) * scale;
    out += C(x.toFixed(1), y.toFixed(1), r.toFixed(1), i % 3 === 0 ? '#E9E5D6' : '#D5D0BF', `opacity="${(alpha * (0.6 + 0.4 * rnd(i, seed + 4))).toFixed(2)}"`);
  }
  return out;
}
export function canisterSvg(t, t0, t1, from, to) { // tabung gas melengkung dari 'from' ke 'to'
  if (t < t0 || t > t1 + 0.05) return '';
  const u = clamp((t - t0) / (t1 - t0), 0, 1);
  const x = from[0] + (to[0] - from[0]) * u, y = from[1] + (to[1] - from[1]) * u - Math.sin(u * Math.PI) * 340;
  let trail = ''; for (let k = 1; k <= 6; k++) { const uu = Math.max(0, u - k * 0.04); trail += C(from[0] + (to[0] - from[0]) * uu, from[1] + (to[1] - from[1]) * uu - Math.sin(uu * Math.PI) * 340, 12 - k, '#E9E5D6', `opacity="${(0.55 - k * 0.08).toFixed(2)}"`); }
  return trail + `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(u * 700).toFixed(0)})">${R(-30, -12, 60, 24, '#6D7C84', 10)}${R(-30, -12, 18, 24, '#4B5963', 8)}${R(10, -6, 14, 12, '#C9D4D9', 4)}</g>`;
}

// ------------------------------------------------------------ TEMPAT AMAN (taman dekat jalan)
export function parkBg(t, o = {}) {
  const day = o.warm ?? 0, pan = o.pan || 0;
  const tree = (x, y, s) => R(x - 14 * s, y, 28 * s, 190 * s, '#8A5A34', 8) + C(x, y - 30 * s, 120 * s, '#3DB46E') + C(x - 90 * s, y + 20 * s, 84 * s, '#2E9E5B') + C(x + 94 * s, y + 18 * s, 90 * s, '#3DB46E');
  const bench = (x, y) => R(x - 150, y - 60, 300, 20, '#B3744A', 8) + R(x - 150, y - 130, 300, 18, '#B3744A', 8) + R(x - 130, y - 40, 14, 60, '#6B4A2B') + R(x + 116, y - 40, 14, 60, '#6B4A2B') + R(x - 130, y - 130, 14, 90, '#6B4A2B') + R(x + 116, y - 130, 14, 90, '#6B4A2B');
  const far = `<g opacity="${o.farSmoke ?? 0}">${C(930, 880, 120, '#D5D0BF')}${C(1030, 840, 150, '#E1DCCB')}${C(820, 860, 90, '#E1DCCB')}</g>`;
  let trees = ''; for (let i = 0; i < 8; i++) { const x = 150 + i * 520 + pan * 0.45; if (x > -200 && x < 1300) trees += tree(x, 640 + (i % 2) * 60, 1 - (i % 3) * 0.1); }
  let benches = ''; for (let i = 0; i < 4; i++) { const x = 250 + i * 1100 + pan; if (x > -250 && x < 1330) benches += bench(x, 1230); }
  let lamps = ''; for (let i = 0; i < 4; i++) { const x = 900 + i * 1100 + pan; if (x > -200 && x < 1300) lamps += `<g transform="translate(${x} 1150)">${R(-14, -60, 28, 210, '#8FA6A0', 8)}${R(-40, -90, 80, 40, '#8FA6A0', 12)}${R(-8, -60, 70, 14, '#8FA6A0', 7)}</g>`; }
  return R(W, -300, WW, 1200, `rgb(${Math.round(207 + 30 * day)},${Math.round(232 + 8 * day)},${Math.round(243 - 28 * day)})`) + R(W, 760, WW, 300, '#E8F2E4')
    + `<g transform="translate(${pan * 0.2} 0)">${far}</g>` + trees
    + R(W, 1020, WW, 1100, '#8FCB8A') + R(W, 1020, WW, 20, '#7FBC7B') + R(W, 1180, WW, 14, 'rgba(255,255,255,.18)')
    + benches + lamps;
}

// ------------------------------------------------------------ POS BANTUAN MEDIS (tenda umum)
export function postBg(t) {
  return parkBg(t, { warm: 0.3 })
    + `<g transform="translate(720 1010)">${P('M-340 -120L0 -300L340 -120Z', '#fff')}${P('M-340 -120L-226 -184L-226 -120Z M-113 -250L0 -300L113 -250L113 -120L-113 -120Z M226 -184L340 -120L226 -120Z', '#DDF5EA')}${R(-340, -120, 680, 18, '#E8665F', 6)}${R(-300, -102, 12, 240, '#8FA6A0')}${R(288, -102, 12, 240, '#8FA6A0')}`
    + `${R(-48, -250, 96, 96, '#E8665F', 20)}${R(-14, -236, 28, 68, '#fff', 6)}${R(-34, -216, 68, 28, '#fff', 6)}</g>`
    + R(420, 1190, 560, 24, '#C9D4D9', 10) + R(440, 1214, 12, 120, '#8FA6A0') + R(940, 1214, 12, 120, '#8FA6A0') + `<g transform="translate(700 1190)">${R(-60, -52, 120, 52, '#fff', 10)}${R(-40, -36, 80, 8, '#E8665F', 4)}${R(-40, -20, 56, 8, '#C9D4D9', 4)}</g>`;
}

// ------------------------------------------------------------ KARTU, IKON TUBUH
export function eyeIcon(x, y, s = 1, tears = 0) {
  return `<g transform="translate(${x} ${y}) scale(${s})">${P('M-130 0Q0 -110 130 0Q0 110 -130 0Z', '#fff')}${C(0, 0, 54, '#3AA78F')}${C(0, 0, 26, '#172B38')}${C(12, -14, 10, '#fff')}${L('M-130 0Q0 -110 130 0', '#172B38', 9)}`
    + (tears ? [-60, 10, 70].map((dx, i) => P(`M${dx} ${46 + i * 8}Q${dx + 16} ${80 + i * 8} ${dx} ${106 + i * 8}Q${dx - 16} ${80 + i * 8} ${dx} ${46 + i * 8}Z`, '#9FD6F2', `opacity="${(0.6 + 0.4 * ((i + 1) / 3)).toFixed(2)}"`)).join('') : '') + `</g>`;
}
export function noseIcon(x, y, s = 1, drip = 0) {
  return `<g transform="translate(${x} ${y}) scale(${s})">${P('M0 -120Q40 -50 70 40Q96 100 40 112Q0 124 -40 112Q-96 100 -70 40Q-40 -50 0 -120Z', '#F2C29B')}${C(-26, 84, 11, '#C98F67')}${C(26, 84, 11, '#C98F67')}`
    + (drip ? [-26, 26].map((dx) => P(`M${dx} 112Q${dx + 14} 148 ${dx} 176Q${dx - 14} 148 ${dx} 112Z`, '#9FD6F2')).join('') : '') + `</g>`;
}
export function mouthIcon(x, y, s = 1) {
  return `<g transform="translate(${x} ${y}) scale(${s})">${P('M-120 -20Q0 -80 120 -20Q110 90 0 100Q-110 90 -120 -20Z', '#7A2D2E')}${P('M-70 50Q0 20 70 50Q40 96 0 98Q-40 96 -70 50Z', '#EE7A7A')}${L('M150 -60l50 -26M158 -10l60 0M150 40l50 26', '#8FA6A0', 12)}${C(226, -86, 10, '#B7C6CC')}</g>`;
}
export function lungsIcon(x, y, s = 1, squeeze = 0) {
  const k = squeeze;
  return `<g transform="translate(${x} ${y}) scale(${s})">${R(-14, -150, 28, 130, '#E8B8B0', 12)}${P('M-14 -30Q-60 -10 -90 20L-96 120Q-98 150 -64 150Q-4 150 -14 40Z', '#F2A0A0')}${P('M14 -30Q60 -10 90 20L96 120Q98 150 64 150Q4 150 14 40Z', '#F2A0A0')}`
    + L('M-60 40L-30 30M-70 80L-34 66M60 40L30 30M70 80L34 66', '#E88080', 8)
    + (k ? `<g stroke="#E8665F" stroke-width="12" stroke-linecap="round" fill="none"><path d="M-170 70L-120 70M-150 50L-120 70L-150 90"/><path d="M170 70L120 70M150 50L120 70L150 90"/></g>` : '') + `</g>`;
}
export function tubeSvg(x, y, s = 1, rot = 0, smear = 0) { // tube odol: badan putih, tutup hijau, label garis
  return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">${P('M-70 -120H70L58 150H-58Z', 'rgba(10,56,48,.18)', 'transform="translate(8 10)"')}${P('M-70 -120H70L58 150H-58Z', '#fff')}${P('M-70 -120H70L66 -60H-66Z', '#EAF4F2')}${R(-56, 150, 112, 22, '#E4EBEC', 6)}${R(-44, -168, 88, 50, '#007060', 12)}${R(-30, -184, 60, 24, '#00A383', 8)}${R(-52, -30, 104, 60, '#5BD09B', 8)}${T(0, 12, 'ODOL', '#fff', 40, 'letter-spacing="2"')}${smear ? C(0, 188, 20, '#fff', 'stroke="#E4EBEC" stroke-width="4"') : ''}</g>`;
}
// bendera/larangan merah di atas benda
export function banSvg(x, y, r, a = 1) { return `<g opacity="${a}" transform="translate(${x} ${y})">${C(0, 0, r, 'none', `stroke="#E8665F" stroke-width="${r * 0.16}"`)}${L(`M${-r * 0.7} ${-r * 0.7}L${r * 0.7} ${r * 0.7}`, '#E8665F', r * 0.16)}</g>`; }

// ------------------------------------------------------------ PETA SEDERHANA (Indonesia -> Portland)
// proyeksi equirectangular; bujur 92..250 (timur), lintang -14..54. Bentuk disederhanakan, hanya gambaran letak.
const MAP = { lon0: 92, lon1: 250, lat0: 56, lat1: -14, w: 960, h: 460 };
export const mapXY = (lon, lat) => [((lon - MAP.lon0) / (MAP.lon1 - MAP.lon0)) * MAP.w, ((lat - MAP.lat0) / (MAP.lat1 - MAP.lat0)) * MAP.h];
const poly = (pts, f, e = '') => P(pts.map(([lo, la], i) => `${i ? 'L' : 'M'}${mapXY(lo, la).map((v) => v.toFixed(1)).join(' ')}`).join('') + 'Z', f, e);
export function mapSvg(t, prog = 1) {
  const land = '#6CC59A', landD = '#4FB383';
  const ina = [
    poly([[95.3, 5.6], [98.5, 4], [102.5, 1], [106, -3], [106, -5.9], [104, -5.7], [100.5, -2.8], [97.5, 1.2]], land),
    poly([[105.2, -6.3], [108, -6.6], [111, -6.6], [114.5, -7.6], [114.4, -8.7], [110, -8.2], [106, -7.6]], land),
    poly([[109, 1.8], [111.5, 1.6], [114.5, 4.2], [117.5, 6.8], [119, 5], [117.7, 1], [116.4, -3.8], [114, -4], [111, -3.1], [109.4, -1.2]], land),
    poly([[118.9, 0.6], [120.5, 1.2], [124.8, 1.2], [122, -0.8], [121.3, -3.2], [123, -5.4], [121, -4.2], [120, -5.5], [119.6, -3], [118.8, -2.7]], land),
    poly([[130.8, -0.8], [134, -0.6], [138, -1.6], [141, -2.6], [141, -9.1], [137.5, -8.3], [135, -4.4], [132.2, -2.8]], land),
  ].join('');
  const usa = poly([[255, 56], [236, 56], [235.5, 49], [237, 48], [235.9, 46.2], [235.7, 43], [235.5, 40.4], [237.6, 37.8], [240.4, 34.6], [242.6, 32.6], [255, 32], [255, 56]], land);
  const [ix, iy] = mapXY(110, -1.5), [px, py] = mapXY(237.3, 45.6);
  const cx = (ix + px) / 2, cy = Math.min(iy, py) - 190;
  const d = `M${ix.toFixed(1)} ${iy.toFixed(1)}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${px.toFixed(1)} ${py.toFixed(1)}`;
  const pin = (x, y, c, lab, dx) => `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})">${C(0, 0, 30, 'rgba(10,56,48,.2)', 'transform="translate(0 6)"')}${C(0, 0, 28, c)}${C(0, 0, 11, '#fff')}<g transform="translate(${dx} -34)">${R(-100, -26, 200, 50, '#fff', 25)}${T(0, 11, lab, '#0A3830', 32)}</g></g>`;
  const k = clamp(prog, 0, 1);
  const tip = (() => { const u = k; const x = (1 - u) * (1 - u) * ix + 2 * (1 - u) * u * cx + u * u * px, y = (1 - u) * (1 - u) * iy + 2 * (1 - u) * u * cy + u * u * py; return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})">${C(0, 0, 13, '#E8665F')}</g>`; })();
  return `${R(0, 0, MAP.w, MAP.h, '#CFE8F3', 40)}<g clip-path="url(#mapClip)">${poly([[90, 0], [90, 0]], '#fff')}${ina}${usa}${L('M0 120H960M0 230H960M0 340H960M160 0V460M320 0V460M480 0V460M640 0V460M800 0V460', 'rgba(255,255,255,.55)', 3)}</g>`
    + `<path d="${d}" fill="none" stroke="#E8665F" stroke-width="7" stroke-linecap="round" stroke-dasharray="4 20" pathLength="1" stroke-dashoffset="0" opacity="${k.toFixed(2)}"/>`
    + (k > 0 && k < 1 ? tip : '') + pin(ix, iy, '#007060', 'Indonesia', 10) + (k >= 0.98 ? pin(px, py, '#E8665F', 'Portland, AS', -30) : '');
}
export const MAP_SIZE = [MAP.w, MAP.h];

// Latar lokasi "Masih Dua Minggu". Semua gambar datar (tanpa garis tepi). Koordinat kanvas 1080 x 1920.
// Raka selalu duduk di tempat yang sama: mata di y = 760, garis meja di y = 1244 (permukaan) dan 1264 (muka meja).
// Motif pencocok antar-potongan: benda bulat di (850, 340): jam dinding / matahari / lampu / bulan.
export const TOP = 1244, FRONT = 1264, MX = 850, MY = 340;
const FONT = `font-family="Plus Jakarta Sans" font-weight="800"`;
const HAND = `font-family="Caveat" font-weight="700"`;
const R = (x, y, w, h, f, rx = 0, e = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${f}" ${e}/>`;
const C = (x, y, r, f, e = '') => `<circle cx="${x}" cy="${y}" r="${r}" fill="${f}" ${e}/>`;
const P = (d, f, e = '') => `<path d="${d}" fill="${f}" ${e}/>`;
const L = (d, s, w, e = '') => `<path d="${d}" fill="none" stroke="${s}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${e}/>`;
const T = (x, y, txt, f, size, e = '', fam = FONT) => `<text x="${x}" y="${y}" ${fam} font-size="${size}" fill="${f}" text-anchor="middle" ${e}>${txt}</text>`;
const W = -260, WW = 1600; // lebar penuh (untuk kamera menjauh)

// ------------------------------------------------------------ jam / matahari / bulan (motif pencocok)
export function clock(t, speed = 1, tint = '#fff', rim = '#0A3830') {
  const mh = (t * speed * 36) % 360, hh = (t * speed * 3) % 360;
  const hand = (a, len, w) => { const r = (a - 90) * Math.PI / 180; return L(`M${MX} ${MY}L${(MX + Math.cos(r) * len).toFixed(1)} ${(MY + Math.sin(r) * len).toFixed(1)}`, rim, w); };
  const ticks = [0, 90, 180, 270].map((a) => { const r = (a - 90) * Math.PI / 180; return L(`M${(MX + Math.cos(r) * 52).toFixed(1)} ${(MY + Math.sin(r) * 52).toFixed(1)}L${(MX + Math.cos(r) * 62).toFixed(1)} ${(MY + Math.sin(r) * 62).toFixed(1)}`, rim, 6); }).join('');
  return C(MX, MY + 6, 78, 'rgba(10,56,48,.14)') + C(MX, MY, 78, rim) + C(MX, MY, 68, tint) + ticks + hand(mh, 52, 6) + hand(hh, 34, 8) + C(MX, MY, 8, '#E8665F');
}

// ------------------------------------------------------------ benda genggam (posisi tangan = (x,y) kanvas)
export function heldObject(kind, x, y, s = 1, t = 0) {
  const g = (inner) => `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s})">${inner}</g>`;
  switch (kind) {
    case 'esteh': return g(P('M-30 -86 L30 -86 L24 40 Q0 48 -24 40Z', '#D98A3D') + P('M-30 -86 L30 -86 L28 -62 L-28 -62Z', 'rgba(255,255,255,.5)') + R(-18, -66, 17, 17, 'rgba(255,255,255,.7)', 4, 'transform="rotate(12)"') + R(4, -50, 17, 17, 'rgba(255,255,255,.7)', 4) + L('M8 -86 L22 -140', '#E8665F', 8) + P('M-32 -90H32V-80H-32Z', 'rgba(255,255,255,.35)'));
    case 'kelapa': return g(C(0, -34, 52, '#8A5A34') + P('M-30 -62 Q0 -88 30 -62 Q0 -70 -30 -62Z', '#A77449') + C(-14, -50, 5, '#5B3A22') + C(6, -56, 5, '#5B3A22') + C(-4, -38, 5, '#5B3A22') + L('M8 -80 L28 -150', '#E8665F', 8) + L('M26 -150 q18 -8 30 4', '#E8665F', 8) + P('M-8 -86 q-30 -30 -62 -18 q30 2 48 24Z', '#2E9E5B') + P('M-4 -86 q18 -34 50 -34 q-24 10 -34 38Z', '#3DB46E'));
    case 'tabung': return g(P('M-14 -120 H14 V-30 Q14 4 0 4 Q-14 4 -14 -30Z', 'rgba(220,240,246,.85)') + P('M-14 -62 H14 V-30 Q14 4 0 4 Q-14 4 -14 -30Z', '#5BD09B') + R(-18, -126, 36, 9, '#B7CDD4', 4) + C(5, -40, 3, 'rgba(255,255,255,.8)') + C(-4, -22, 2.4, 'rgba(255,255,255,.8)'));
    case 'spidol': return g(R(-12, -130, 24, 100, '#E8665F', 8) + R(-12, -48, 24, 18, '#fff', 4) + P('M-9 -130 L9 -130 L5 -152 L-5 -152Z', '#172B38'));
    case 'pena': return g(R(-8, -140, 16, 104, '#F8C038', 8) + P('M-8 -38 L8 -38 L0 -16Z', '#172B38') + R(-8, -140, 16, 20, '#0A3830', 8));
    case 'hp': return g(R(-30, -112, 60, 106, '#172B38', 12) + R(-25, -104, 50, 90, '#7FD3C4', 6) + R(-12, -98, 24, 5, '#172B38', 3));
    default: return '';
  }
}

// ------------------------------------------------------------ KANTIN
function kantinBg() {
  const lamp = (x) => L(`M${x} -40V210`, '#8F6B45', 5) + P(`M${x - 56} 290 Q${x} 190 ${x + 56} 290Z`, '#F8C038') + C(x, 296, 14, '#FFF1B8') + `<ellipse cx="${x}" cy="330" rx="150" ry="70" fill="#FFF1B8" opacity=".22"/>`;
  const stripes = Array.from({ length: 9 }, (_, i) => R(40 + i * 46, 600, 23, 70, '#E8665F')).join('') + R(40, 600, 414, 70, 'rgba(255,255,255,.55)', 0, 'opacity=".0"');
  const bowl = (x, c) => P(`M${x - 30} 884 H${x + 30} Q${x + 26} 922 ${x} 922 Q${x - 26} 922 ${x - 30} 884Z`, c) + C(x - 12, 880, 12, '#F2A950') + C(x + 12, 880, 12, '#E8665F');
  return R(W, -1300, WW, 2700, '#F7E0B8') + R(W, 1000, WW, 400, '#EDB878') + R(W, 996, WW, 8, '#D79C5C')
    + R(W, -1300, WW, 1560, '#EBC48D') + R(W, 250, WW, 10, '#D8AB6E') + lamp(150) + lamp(560) + lamp(960)
    // kios makanan
    + R(-30, 420, 500, 580, '#C68850', 30) + R(-30, 420, 500, 60, '#B3743F', 30) + R(20, 500, 400, 120, '#8EC9D9', 16, 'opacity=".55"') + stripes
    + R(40, 690, 380, 230, '#E6F4F5', 18) + R(54, 704, 352, 202, '#D3EAEE', 12) + bowl(130, '#fff') + bowl(240, '#fff') + bowl(350, '#fff')
    + R(40, 930, 380, 18, '#A96B3A', 6)
    + R(60, 436, 340, 100, '#1E4A42', 14) + R(66, 442, 328, 88, '#0F3A33', 10) + T(230, 500, 'KANTIN', '#F7F2E4', 56, 'letter-spacing="6"')
    // jendela
    + R(740, 470, 340, 260, '#BFE6F5', 24) + C(1000, 540, 34, '#FFE08A') + P('M740 730 Q820 640 900 690 Q980 620 1080 710V730Z', '#7BC98B') + R(732, 462, 356, 14, '#A56B3A', 7) + R(732, 724, 356, 14, '#A56B3A', 7) + R(900, 470, 8, 260, '#A56B3A')
    ;
}
// jam kantin bergerak dari luar (kantinBg memakai jam diam); jam hidup digambar terpisah lewat clock()
function kantinFg() {
  return R(W, FRONT, WW, 800, '#B9794A') + R(W, FRONT + 26, WW, 6, '#A5683F') + R(W, FRONT + 120, WW, 6, '#A5683F');
}
function tableTop(c = '#D6A06B') { return R(W, TOP, WW, FRONT - TOP, c); }
function kantinTableProps() {
  // piring gorengan kiri + botol saus
  return `<g transform="translate(250 ${TOP})">${P('M-60 0 Q0 22 60 0Z', '#F1E5D2')}${C(-22, -10, 20, '#E7A23C')}${C(10, -14, 20, '#EDB24E')}${C(34, -6, 18, '#D98F2B')}</g>`
    + `<g transform="translate(120 ${TOP})">${R(-16, -66, 32, 66, '#E8665F', 8)}${R(-9, -88, 18, 26, '#F8C038', 5)}</g>`;
}

// ------------------------------------------------------------ PANTAI
export function beachBg(t, o = {}) {
  const k = o.storm || 0; // 0 cerah .. 1 mendung
  const mixc = (a, b) => { const h = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)); const A = h(a), B = h(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join(''); };
  const sky1 = mixc('#82D2F3', '#8EA6B8'), sky2 = mixc('#BDEBFA', '#B7C6CF'), sea1 = mixc('#27B0C8', '#2E7083'), sea2 = mixc('#4CCBDA', '#3F8798');
  const sway = Math.sin(t * 1.4) * 3;
  const leaf = (a, l) => `<g transform="rotate(${(a + sway).toFixed(1)})">${P(`M0 0 Q${l * 0.5} -${l * 0.34} ${l} 8 Q${l * 0.5} -${l * 0.1} 0 10Z`, '#2E9E5B')}${P(`M0 0 Q${l * 0.5} -${l * 0.16} ${l * 0.86} 6 Q${l * 0.5} 0 0 6Z`, '#3DB46E')}</g>`;
  const palm = `<g>${L('M120 1230 Q150 980 130 640', '#8A5A34', 38)}${L('M120 1230 Q150 980 130 640', '#A77449', 14, 'transform="translate(-6 0)"')}<g transform="translate(130 640)">${[-150, -118, -86, -52, -18].map((a, i) => leaf(a, 220 - (i % 2) * 30)).join('')}${[-30, 8, 40, 72].map((a) => leaf(180 - a * 0 + a, 200)).join('')}${C(0, 12, 22, '#6B4527')}${C(30, 26, 18, '#5B3A22')}</g></g>`;
  const waveLines = (y, ph, c, n, amp) => L(Array.from({ length: n }, (_, i) => { const x = -100 + i * 150 + ((ph * 40) % 150); return `M${x} ${y}q37 -${amp} 75 0t75 0`; }).join(''), c, 8, 'opacity=".75"');
  const cloud = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})" opacity="${(1 - 0.35 * k).toFixed(2)}">${R(-90, -20, 180, 40, '#fff', 20)}${C(-30, -26, 34, '#fff')}${C(26, -34, 42, '#fff')}</g>`;
  const sunC = mixc('#FFE08A', '#F1E6C4');
  return R(W, -300, WW, 1100, sky1) + R(W, 560, WW, 320, sky2)
    + (k < 0.99 ? C(MX, MY, 128, '#FFF3B8', `opacity="${(0.42 * (1 - k)).toFixed(2)}"`) + C(MX, MY, 86, sunC, `opacity="${(1 - 0.6 * k).toFixed(2)}"`) : '')
    + cloud(250 + ((t * 8) % 1500) - 200, 470, 1.2) + cloud(600 + ((t * 5) % 1500) - 200, 600, 0.9)
    + R(W, 880, WW, 140, sea1) + R(W, 960, WW, 90, sea2) + waveLines(930, t, 'rgba(255,255,255,.6)', 12, 14) + waveLines(990, -t * 0.8, 'rgba(255,255,255,.5)', 12, 12)
    + R(W, 1010, WW, 500, '#F6DDA4') + R(W, 1010, WW, 16, 'rgba(255,255,255,.4)') + P('M-300 1130 Q200 1080 600 1130 T1400 1120V1400H-300Z', '#EFD08E')
    + palm
    + `<g transform="translate(930 1010)">${L('M0 0V-210', '#A77449', 10)}${P('M-150 -200 Q0 -330 150 -200Z', '#E8665F')}${P('M-50 -267 Q0 -272 50 -267 L100 -214 L50 -255 L0 -214 L-50 -255 L-100 -214Z', '#fff')}${P('M-150 -200 Q-100 -230 -50 -210 L-100 -190Z', '#fff', 'opacity=".0"')}</g>`;
}
function beachFg() { return R(W, FRONT, WW, 800, '#EBCB86') + R(W, FRONT + 40, WW, 8, '#DDB972') + R(W, FRONT, WW, 12, 'rgba(255,255,255,.35)'); }
function beachTop() { return R(W, TOP, WW, FRONT - TOP, '#F2D898'); }

// ------------------------------------------------------------ LAB
function labBg() {
  const tiles = Array.from({ length: 26 }, (_, i) => R(-260 + i * 70, -300, 2, 1700, '#D1E3DF')).join('') + Array.from({ length: 24 }, (_, i) => R(W, -200 + i * 70, WW, 2, '#D1E3DF')).join('');
  const flask = (x, y, c, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})">${P('M-14 -90 H14 V-52 L46 0 Q50 10 40 10 H-40 Q-50 10 -46 0 L-14 -52Z', 'rgba(210,235,241,.9)')}${P('M-30 -26 L30 -26 L46 0 Q50 10 40 10 H-40 Q-50 10 -46 0Z', c)}${R(-18, -96, 36, 9, '#B7CDD4', 4)}</g>`;
  const beaker = (x, y, c) => `<g transform="translate(${x} ${y})">${R(-30, -64, 60, 70, 'rgba(210,235,241,.9)', 8)}${R(-30, -30, 60, 36, c, 8)}${R(-34, -68, 68, 8, '#B7CDD4', 4)}</g>`;
  const skel = `<g transform="translate(890 560)">${R(-110, -190, 220, 380, '#fff', 14)}${R(-110, -190, 220, 380, 'none', 14, 'stroke="#9FB8B2" stroke-width="6"')}${C(0, -120, 30, '#E8DFCB')}${R(-6, -92, 12, 120, '#E8DFCB', 6)}${[-60, -34, -8, 18].map((y) => L(`M-38 ${y}Q0 ${y - 16} 38 ${y}`, '#E8DFCB', 8)).join('')}${R(-34, 30, 68, 20, '#E8DFCB', 10)}${R(-50, 50, 24, 100, '#E8DFCB', 10)}${R(26, 50, 24, 100, '#E8DFCB', 10)}</g>`;
  return R(W, -300, WW, 1700, '#E6F2F0') + tiles
    + R(W, -300, WW, 300, '#CFE4E1') + R(280, 60, 520, 26, '#fff', 13) + R(280, 60, 520, 8, '#F1F9F8', 4)
    + R(20, 440, 560, 14, '#9FB8B2', 5) + flask(120, 440, '#5BD09B') + flask(220, 440, '#F8C038', 0.9) + beaker(330, 440, '#E8665F') + flask(440, 440, '#8E7CE8', 1.1) + beaker(530, 440, '#5BD0E6')
    + R(20, 720, 560, 14, '#9FB8B2', 5) + beaker(110, 720, '#5BD09B') + flask(230, 720, '#E8665F', 0.9) + flask(340, 720, '#5BD0E6') + beaker(450, 720, '#F8C038') + flask(540, 720, '#5BD09B', 0.8)
    + skel + R(30, 880, 560, 14, '#9FB8B2', 5) + R(40, 782, 6, 98, '#9FB8B2') + R(560, 782, 6, 98, '#9FB8B2');
}
function labTop() { return R(W, TOP, WW, FRONT - TOP, '#4D6670') + `<g transform="translate(220 ${TOP})">${R(-46, -26, 92, 14, '#2F4A55', 6)}${R(-12, -118, 24, 96, '#C8D3D8', 8)}${R(-34, -140, 60, 28, '#8FA6A0', 10, 'transform="rotate(-24 0 -120)"')}${R(-54, -14, 108, 14, '#2F4A55', 6)}</g>`; }
function labFg() { return R(W, FRONT, WW, 800, '#D6E7E3') + R(W, FRONT, WW, 10, '#B7CDC9') + [140, 540, 940].map((x) => R(x - 190, FRONT + 40, 380, 300, '#C3D9D4', 14) + R(x - 20, FRONT + 70, 40, 12, '#8FA6A0', 6)).join(''); }

// ------------------------------------------------------------ MEJA TUGAS KELOMPOK
function groupBg() {
  const sticky = (x, y, c, r) => `<g transform="translate(${x} ${y}) rotate(${r})">${R(0, 0, 100, 96, c, 8)}${L('M14 28H84M14 50H72M14 72H58', 'rgba(23,43,56,.35)', 5)}</g>`;
  const bar = (x, y, w, c) => R(x, y, w, 24, c, 12);
  return R(W, -300, WW, 1700, '#F1ECFF') + R(W, 1000, WW, 300, '#E3DCF8')
    + R(90, 330, 900, 400, '#fff', 26) + R(90, 330, 900, 400, 'none', 26, 'stroke="#CFC6EA" stroke-width="10"') + R(120, 720, 840, 16, '#CFC6EA', 8)
    + bar(150, 380, 260, '#5BD09B') + bar(330, 430, 360, '#F8C038') + bar(560, 480, 300, '#E8665F') + bar(260, 530, 200, '#8E7CE8') + bar(640, 580, 260, '#5BD0E6') + bar(150, 630, 180, '#F8C038')
    + sticky(160, 300, '#FFE08A', -6) + sticky(790, 296, '#FFB5AA', 5) + sticky(930, 360, '#B8E8D2', -4) + sticky(60, 480, '#C9BDF4', 4)
    + `<g transform="translate(60 770)">${P('M0 160 Q-24 60 30 20 Q70 -10 76 70 Q100 20 130 60 Q150 120 110 160Z', '#3DB46E')}${R(-10, 150, 140, 90, '#C98B54', 16)}</g>`
    + `<g transform="translate(950 790)">${P('M0 160 Q-24 60 30 20 Q70 -10 76 70 Q100 20 130 60 Q150 120 110 160Z', '#2E9E5B')}${R(-10, 150, 140, 90, '#C98B54', 16)}</g>`;
}
function groupTop() {
  const lap = (x, flip) => `<g transform="translate(${x} ${TOP})">${R(-130, -150, 260, 150, '#C9D3DA', 14)}${R(-118, -138, 236, 126, '#E2E9EE', 8)}${C(0, -76, 14, '#0A7A67')}${R(-150, -8, 300, 14, '#AEB9C1', 7)}</g>`;
  return R(W, TOP, WW, FRONT - TOP, '#E2BE92') + lap(190) + lap(890)
    + `<g transform="translate(120 ${TOP})">${R(-40, -34, 80, 34, '#fff', 8)}${R(-34, -62, 68, 30, '#E8665F', 8)}</g>`
    + `<g transform="translate(940 ${TOP})">${R(-26, -48, 52, 48, '#fff', 10)}${L('M26 -36 q22 4 0 22', '#fff', 7)}</g>`;
}
function groupFg() { return R(W, FRONT, WW, 800, '#CCA578') + R(W, FRONT + 30, WW, 6, '#B8915F'); }

// ------------------------------------------------------------ RUANG KULIAH
function lectBg() {
  const row = (y, c, n, s) => Array.from({ length: n }, (_, i) => { const x = -40 + i * s; return R(x, y, s - 14, 140, c, 22) + C(x + (s - 14) / 2, y - 12, 30, ['#F2C9A0', '#C58F62', '#F7BC8E', '#9C6B47'][i % 4]) + P(`M${x + 12} ${y + 26} q${(s - 38) / 2} -40 ${s - 38} 0`, ['#8E7CE8', '#E8665F', '#5BD0E6', '#F8C038'][(i + 1) % 4], 'opacity=".0"'); }).join('');
  return R(W, -300, WW, 1700, '#DDE7EC') + R(W, 880, WW, 500, '#B4C6D0')
    + R(150, 300, 780, 430, '#fff', 20) + R(150, 300, 780, 430, 'none', 20, 'stroke="#8FA6B4" stroke-width="12"') + R(150, 292, 780, 18, '#6F8794', 8)
    + R(200, 350, 420, 48, '#0A7A67', 14) + L('M210 440H600M210 480H540M210 520H580M210 560H470', '#B8C7CE', 14) + `<g transform="translate(790 560)">${C(0, 0, 90, '#EAF6F2')}${P('M-64 20 Q-20 -90 40 -40 Q76 -10 64 40Z', '#5BD09B')}${C(8, -6, 24, '#F8C038')}</g>`
    + row(800, '#2C5A68', 5, 250) + row(930, '#3C7080', 5, 250) + R(W, 1060, WW, 40, 'rgba(10,56,48,.08)');
}
function lectTop() { return R(W, TOP, WW, FRONT - TOP, '#D8A777') + `<g transform="translate(640 ${TOP})">${R(-110, -14, 220, 14, '#EFE6D2', 6)}${R(-104, -22, 208, 10, '#fff', 5)}${L('M-80 -12H70', '#C8D3D8', 3)}</g>`; }
function lectFg() { return R(W, FRONT, WW, 800, '#B98558') + R(W, FRONT + 26, WW, 6, '#A57246'); }

// ------------------------------------------------------------ PERJALANAN PULANG (malam)
export function journeyBg(t) {
  const sp = t * 150;
  const bld = (x, w, h, c) => R(x, 1000 - h, w, h, c) + Array.from({ length: Math.floor(h / 70) }, (_, j) => Array.from({ length: Math.floor(w / 46) }, (_, i) => ((i * 7 + j * 3 + Math.floor(x)) % 5 === 0 ? R(x + 14 + i * 46, 1000 - h + 20 + j * 70, 20, 28, '#F8C038', 3) : '')).join('')).join('');
  let city = '';
  for (let i = -2; i < 12; i++) { const x = ((i * 190 - (sp * 0.3) % 190)); const h = 260 + ((((i * 97 + 13) % 7) + 7) % 7) * 46; city += bld(x, 170, h + 100 * ((((i * 31) % 2) + 2) % 2), ['#1F3258', '#25396A', '#1A2B4E'][((i % 3) + 3) % 3]); }
  let poles = '';
  for (let i = -1; i < 4; i++) { const x = (i * 480 - (sp) % 480) + 120; poles += R(x - 7, 520, 14, 520, '#0E1830') + R(x - 7, 520, 90, 12, '#0E1830') + C(x + 80, 540, 70, 'rgba(248,192,56,.32)') + C(x + 80, 540, 30, '#FFE08A'); }
  const stars = Array.from({ length: 30 }, (_, i) => C((i * 173) % 1100, 40 + ((i * 89) % 520), 2 + (i % 3), '#fff', `opacity="${(0.4 + 0.4 * Math.abs(Math.sin(t * 1.5 + i))).toFixed(2)}"`)).join('');
  return R(W, -300, WW, 1700, '#14214A') + R(W, 500, WW, 520, '#1E3166') + stars + C(MX, MY, 68, '#FFF3C4') + C(MX + 22, MY - 10, 60, '#14214A', 'opacity=".0"') + C(MX, MY, 100, 'rgba(255,243,196,.14)')
    + city + poles + R(W, 1000, WW, 400, '#0B1430')
    + R(W, 120, WW, 170, '#162338') + R(W, 1030, WW, 240, '#162338') + R(-40, 120, 120, 1000, '#162338') + R(1000, 120, 160, 1000, '#162338') + R(W, 1044, WW, 14, '#C8D3D8', 7) + R(W, 1128, WW, 10, '#3A4A7A') + Array.from({ length: 8 }, (_, i) => R(((i * 260 - (sp * 1.0) % 260)) - 40, 1120, 120, 24, '#E9E4C8')).join('');
}
function journeyFg() {
  // sandaran kursi depan (muka meja)
  return R(W, FRONT, WW, 800, '#10303A') + R(W, FRONT, WW, 10, '#1B4A56') + R(W, FRONT + 150, WW, 8, '#0B2229');
}
function journeyTop() { return R(W, TOP, WW, FRONT - TOP, '#10303A'); }

// ------------------------------------------------------------ KAMAR RAKA
function roomBg(t) {
  const spines = (x, y, n, h0) => Array.from({ length: n }, (_, i) => R(x + i * 26, y - (h0 + ((i * 37) % 40)), 22, h0 + ((i * 37) % 40), ['#E8665F', '#0A7A67', '#F8C038', '#8E7CE8', '#5BD0E6', '#F2A950'][i % 6], 4)).join('');
  const bulbs = Array.from({ length: 12 }, (_, i) => C(40 + i * 92, 200 + Math.sin(i * 0.9) * 30 + 40, 9, '#FFE08A', `opacity="${(0.75 + 0.25 * Math.sin(t * 2 + i)).toFixed(2)}"`)).join('');
  return R(W, -300, WW, 1700, '#EBD3AE') + R(W, 1000, WW, 400, '#DDBF93')
    + L('M-20 240 Q540 340 1100 240', '#8F6B45', 4) + bulbs
    + R(690, 380, 340, 330, '#13204A', 22) + C(940, 470, 36, '#FFF3C4') + C(960, 462, 30, '#13204A', 'opacity=".0"') + Array.from({ length: 9 }, (_, i) => C(730 + (i * 53) % 280, 430 + (i * 71) % 240, 3, '#fff')).join('') + R(682, 372, 356, 14, '#A56B3A', 7) + R(682, 704, 356, 14, '#A56B3A', 7)
    + P('M690 380 Q760 520 700 720 H640 V380Z', '#B9A8F0') + P('M1030 380 Q990 520 1040 720 H1090 V380Z', '#B9A8F0')
    + R(30, 380, 330, 12, '#9C6B47', 5) + spines(44, 380, 12, 100) + R(30, 560, 330, 12, '#9C6B47', 5) + spines(44, 560, 12, 96) + R(30, 740, 330, 12, '#9C6B47', 5) + spines(44, 740, 12, 98)
    + R(380, 400, 270, 180, '#FFF7E4', 10) + L('M410 440H620M410 480H590M410 520H610', '#D8C9A8', 8) + R(374, 394, 282, 192, 'none', 12, 'stroke="#C98B54" stroke-width="10"')
    + `<g transform="translate(540 -20)">${L('M0 0V240', '#8F6B45', 4)}${P('M-60 330 Q0 220 60 330Z', '#E8665F', 'opacity=".0"')}</g>`;
}
function roomTop(o = {}) {
  const pf = o.piles ?? 1;
  const pile = (x, n, c0) => Array.from({ length: Math.ceil(n * pf) }, (_, i) => R(x - 90 + ((i * 17) % 22) - 11, TOP - 34 - i * 36, 180 - (i % 3) * 16, 34, [c0, '#E8665F', '#F8C038', '#8E7CE8', '#5BD0E6', '#0A7A67'][(i + 2) % 6], 7)).join('');
  return R(W, TOP, WW, FRONT - TOP, '#B5835A') + pile(150, 7, '#0A7A67') + pile(930, 8, '#8E7CE8') + pile(300, 3, '#F8C038') + pile(800, 3, '#5BD0E6')
    + `<g transform="translate(100 ${TOP - 2})">${R(-26, -66, 52, 66, '#E8665F', 10)}${L('M18 -50 q24 4 0 24', '#E8665F', 7)}</g>`
    + `<g transform="translate(620 ${TOP})" opacity="0"></g>`;
}
function roomFg() { return R(W, FRONT, WW, 800, '#8F5F3C') + R(W, FRONT + 26, WW, 6, '#7A4F30'); }

// ------------------------------------------------------------ registrasi
export const SCENES = {
  kantin:  { bg: () => kantinBg(), top: () => tableTop() + kantinTableProps(), fg: () => kantinFg(), dark: false },
  pantai:  { bg: (t, o) => beachBg(t, o), top: () => beachTop(), fg: () => beachFg(), dark: false },
  lab:     { bg: () => labBg(), top: () => labTop(), fg: () => labFg(), dark: false },
  group:   { bg: () => groupBg(), top: () => groupTop(), fg: () => groupFg(), dark: false },
  kuliah:  { bg: () => lectBg(), top: () => lectTop(), fg: () => lectFg(), dark: false },
  jalan:   { bg: (t) => journeyBg(t), top: () => journeyTop(), fg: () => journeyFg(), dark: true },
  kamar:   { bg: (t) => roomBg(t), top: (t, o) => roomTop(o), fg: () => roomFg(), dark: false },
};
export const hasClock = { kantin: true, lab: true, group: true, kuliah: true };
export { R, C, P, L, T, FONT, HAND };

// Properti dan latar datar untuk "Besok Praktikum Anatomi, Tapi Masih Bingung?". Koordinat kanvas 1080 x 1920.
// Model tulang di ruang praktikum hanyalah properti ilustrasi (bukan model 3D MEDCOEL).
export const R = (x, y, w, h, f, rx = 0, e = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${f}" ${e}/>`;
export const C = (x, y, r, f, e = '') => `<circle cx="${x}" cy="${y}" r="${r}" fill="${f}" ${e}/>`;
export const E = (x, y, rx, ry, f, e = '') => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${f}" ${e}/>`;
export const P = (d, f, e = '') => `<path d="${d}" fill="${f}" ${e}/>`;
export const L = (d, s, w, e = '') => `<path d="${d}" fill="none" stroke="${s}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${e}/>`;
export const FONT = 'font-family="Plus Jakarta Sans" font-weight="800"';
export const T = (x, y, txt, f, size, e = '', anchor = 'middle') => `<text x="${x}" y="${y}" ${FONT} font-size="${size}" fill="${f}" text-anchor="${anchor}" ${e}>${txt}</text>`;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const f1 = (n) => Math.round(n * 10) / 10;
export const FLOOR = 1330;

// ------------------------------------------------------------ ruang praktikum
export function labBg(t) {
  const tile = (x, y) => R(x, y, 118, 118, (((x / 118) + (y / 118)) % 2 ? '#D8E6E3' : '#E6EFEC'));
  let floor = ''; for (let i = -1; i < 10; i++) for (let j = 0; j < 6; j++) floor += tile(i * 118, 1230 + j * 118);
  const wall = R(-400, -200, 1900, 1480, '#DDF0EA') + R(-400, 760, 1900, 470, '#CFE7E0') + R(-400, 752, 1900, 14, '#B7D8CE');
  const win = `<g transform="translate(180 330)">${R(-130, -150, 260, 340, '#CFE8F3', 16)}${R(-130, -150, 260, 340, 'none', 16, 'stroke="#fff" stroke-width="16"')}${R(-5, -150, 10, 340, '#fff')}${R(-130, 10, 260, 10, '#fff')}${C(70, -70, 36, '#FFE08A')}</g>`;
  const poster = (x, y, c) => `<g transform="translate(${x} ${y})">${R(-90, -120, 180, 240, '#fff', 10)}${R(-90, -120, 180, 240, 'none', 10, 'stroke="#E4EBEC" stroke-width="6"')}${C(0, -50, 34, c)}${R(-22, -12, 44, 90, c, 18)}${L('M-70 90H70M-70 60H40', '#B7C6CC', 8)}</g>`;
  const cabinet = `<g transform="translate(930 760)">${R(-120, -300, 240, 330, '#B3744A', 14)}${R(-108, -288, 216, 150, '#E8F2F6', 10)}${R(-108, -126, 216, 140, '#E8F2F6', 10)}${[-70, 0, 70].map((x) => R(x - 18, -266, 36, 64, '#BFE6F5', 8) + R(x - 18, -104, 36, 64, '#F8C0B8', 8)).join('')}</g>`;
  return wall + win + poster(560, 360, '#E8665F') + poster(760, 360, '#5BD0E6') + cabinet + floor + R(-400, 1226, 1900, 10, 'rgba(10,56,48,.1)');
}
// meja praktikum (depan model)
export function labTable() { return R(-100, 1130, 1280, 36, '#C9A27A', 8) + R(-100, 1166, 1280, 170, '#B3844F') + R(-60, 1166, 20, 170, '#9A6D3F') + R(1100, 1166, 20, 170, '#9A6D3F'); }

// model tulang (properti): theta derajat, 0 = depan, 90 = samping. Pusat dasar di (0,0) = tengah alas.
export function skeletonModel(theta, opt = {}) {
  const th = theta * Math.PI / 180, ct = Math.cos(th), st = Math.sin(th), ac = Math.abs(ct), as = Math.abs(st);
  const bone = '#EFE3C8', shade = '#D9C8A3', dark = '#8F7E5A';
  const wid = (a, b) => Math.sqrt(a * a * ct * ct + b * b * st * st);
  let o = '';
  // alas dan tiang
  o += E(0, -8, 150, 22, '#8A5A34') + R(-8, -420, 16, 410, '#9AA9AF', 6);
  // tulang belakang (kurva S terlihat dari samping)
  const sp = []; for (let i = 0; i <= 14; i++) { const y = -430 - i * 18, c = Math.sin(i * 0.5) * 18 * st * (opt.dir ?? 1); sp.push([c, y]); }
  o += L('M' + sp.map((p) => p[0].toFixed(1) + ' ' + p[1]).join('L'), dark, 22 * (0.6 + 0.4 * as) + 8);
  sp.forEach((p, i) => { o += R(f1(p[0] - 14), p[1] - 7, 28, 14, shade, 6); });
  // tulang rusuk: tujuh pasang
  for (let i = 0; i < 7; i++) {
    const y = -450 - i * 34 - 20, a = 118 * Math.sin(Math.PI * (i + 1.1) / 8.4) + 20, b = a * 0.62, rx = wid(a, b), cx = -22 * st * (opt.dir ?? 1) * 0.5;
    o += `<ellipse cx="${f1(cx)}" cy="${y}" rx="${f1(rx)}" ry="${24 - i}" fill="none" stroke="${bone}" stroke-width="13"/><ellipse cx="${f1(cx)}" cy="${y + 4}" rx="${f1(rx)}" ry="${24 - i}" fill="none" stroke="${shade}" stroke-width="3" opacity=".7"/>`;
  }
  // tulang dada (hanya dari depan)
  if (ac > 0.15) o += `<g opacity="${clamp((ac - 0.15) / 0.5, 0, 1)}">` + R(f1(-9 * ac), -690, f1(18 * ac), 190, bone, 8) + R(f1(-30 * ac), -700, f1(60 * ac), 20, bone, 8) + `</g>`;
  // klavikula
  o += L(`M${f1(-110 * ac - 6 * as)} ${-716}Q0 ${-730} ${f1(110 * ac - 6 * as)} ${-716}`, bone, 14);
  // pinggul
  const pw = wid(112, 50); o += `<g transform="translate(0 -402)">${E(f1(-pw * 0.55), 0, f1(pw * 0.55 + 8), 54, bone)}${E(f1(pw * 0.55), 0, f1(pw * 0.55 + 8), 54, bone)}${E(0, 26, f1(Math.max(14, pw * 0.3)), 24, shade)}</g>`;
  // tengkorak
  const hx = 10 * st * (opt.dir ?? 1) * 0.5;
  o += `<g transform="translate(${f1(hx)} -770)">${E(0, 0, f1(wid(60, 66)), 66, bone)}${E(0, 44, f1(wid(40, 48)), 28, bone)}`;
  const face = ct > -0.35; // sisi wajah terlihat
  if (face) { const ex = 24 * ct + 36 * st * (opt.dir ?? 1), o2 = clamp((ct + 0.35) / 0.6, 0, 1); o += `<g opacity="${f1(o2)}">${E(f1(-ex), 6, f1(14 * Math.max(0.35, ac)), 17, '#3A3126')}${E(f1(ex * 0.0 + (as > 0.5 ? 0 : ex)), 6, f1(as > 0.5 ? 0 : 14 * ac), 17, '#3A3126')}${P(`M${f1(ex * 0.0)} 24l${f1(-7)} 16h14z`, '#6B5B3E', `transform="translate(${f1(36 * st * (opt.dir ?? 1) * 0.8)} 0)"`)}</g>`; }
  o += `</g>`;
  // lengan model (rangka lengan atas bergantung)
  [-1, 1].forEach((s) => { const x0 = s * (120 * ac + 10 * as); o += `<g transform="translate(${f1(x0)} -704)">${L('M0 0Q' + (s * 16) + ' 120 ' + (s * 10) + ' 250', bone, 18)}${C(0, 0, 18, bone)}${C(s * 10, 252, 13, shade)}</g>`; });
  return o;
}
// pin bernomor di model (praktikum)
export function pin(x, y, n, c = '#E8665F', s = 1) { return `<g transform="translate(${f1(x)} ${f1(y)}) scale(${s})">${L('M0 0V40', '#6D7C84', 5)}${C(0, 0, 20, c)}${T(0, 8, n, '#fff', 24)}</g>`; }

// ------------------------------------------------------------ kamar kos malam
export function kosBg(t, o = {}) {
  const night = o.night ?? 1;
  const wall = R(-400, -300, 1900, 1700, '#1F3552') + R(-400, 1180, 1900, 800, '#2E2A3E') + R(-400, 1176, 1900, 12, '#141F33');
  const stars = [[90, 240], [300, 140], [520, 320], [760, 180], [960, 300]].map(([x, y], i) => C(x, y, 3 + (i % 2), '#fff', `opacity="${(0.55 + 0.3 * Math.sin(t * 2 + i)).toFixed(2)}"`)).join('');
  const win = `<g transform="translate(860 520)">${R(-150, -220, 300, 420, '#0F2036', 18)}${stars.replace(/cx="(\d+)"/g, (m, x) => `cx="${+x - 860}"`).replace(/cy="(\d+)"/g, (m, y) => `cy="${+y - 520}"`)}${C(60, -120, 44, '#F4EBC8')}${C(78, -132, 38, '#0F2036')}${R(-150, -220, 300, 420, 'none', 18, 'stroke="#B3C2D6" stroke-width="14"')}${R(-4, -220, 8, 420, '#B3C2D6')}</g>`;
  const shelf = `<g transform="translate(230 560)">${R(-170, 0, 340, 16, '#8A5A34', 6)}${R(-150, -120, 40, 120, '#E8665F', 4)}${R(-104, -150, 36, 150, '#5BD0E6', 4)}${R(-62, -100, 44, 100, '#F8C038', 4)}${R(-12, -140, 38, 140, '#9DE0BD', 4)}${R(34, -110, 46, 110, '#8E7CE8', 4)}${C(124, -34, 34, '#B3744A')}${P('M110 -62q14-36 28 0z', '#3DB46E')}</g>`;
  const poster = `<g transform="translate(560 330) rotate(-3)">${R(-90, -110, 180, 220, '#F7F2E4', 8)}${L('M-50 50Q-20 -10 0 -40Q22 -10 50 50', '#C98F67', 6)}${C(0, -64, 18, '#C98F67')}${L('M-60 70H60', '#8A9AA3', 6)}</g>`;
  return wall + win + shelf + poster;
}
export function deskFront() { return R(-100, 1190, 1280, 34, '#B3744A', 8) + R(-100, 1224, 1280, 220, '#8A5A34') + R(40, 1224, 380, 150, '#7A4D2C', 10) + R(60, 1244, 340, 14, '#5B3A21', 6); }
export function lampCone(t) { return `<defs><linearGradient id="lc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE9A8" stop-opacity=".42"/><stop offset="1" stop-color="#FFE9A8" stop-opacity="0"/></linearGradient></defs><path d="M180 470L-40 1190H680Z" fill="url(#lc)" opacity="${(0.9 + 0.1 * Math.sin(t * 3)).toFixed(2)}"/>`; }
export function lamp() { return `<g transform="translate(170 1190)">${R(-52, -10, 104, 14, '#3A4A58', 7)}${L('M0 -6L-34 -150L40 -250', '#5B6A72', 12)}${P('M10 -250L100 -262L80 -200Z', '#F8C038')}${C(86, -228, 8, '#FFF3C4')}</g>`; }

// atlas anatomi (buku): a = sudut putar (derajat), pusat (0,0), ukuran 460 x 320 saat terbuka
export function atlasBook(a, s = 1, tone = 1) {
  const page = `${R(-232, -160, 230, 320, '#FFF9EA', 10)}${R(2, -160, 230, 320, '#FFFDF4', 10)}${R(-4, -160, 8, 320, '#D9C8A3')}`;
  const sk = `<g transform="translate(-116 0)">${C(0, -96, 26, '#EFE3C8')}${R(-8, -72, 16, 116, '#EFE3C8', 6)}${[0, 1, 2, 3, 4].map((i) => `<path d="M-6 ${-60 + i * 18}Q${-38 + i * 2} ${-48 + i * 18} ${-40} ${-30 + i * 18}M6 ${-60 + i * 18}Q${38 - i * 2} ${-48 + i * 18} 40 ${-30 + i * 18}" fill="none" stroke="#D9C8A3" stroke-width="7" stroke-linecap="round"/>`).join('')}${E(0, 62, 44, 18, '#EFE3C8')}</g>`;
  const rt = `<g transform="translate(116 0)">${L('M-70 -90H70M-70 -60H40M-70 -30H70M-70 0H20M-70 30H60M-70 60H30', '#B7C6CC', 8)}${C(40, 100, 22, '#E8665F')}${T(40, 110, '?', '#fff', 30)}</g>`;
  return `<g transform="scale(${s}) rotate(${f1(a)})"><g opacity="${tone}">${E(0, 176, 250, 22, 'rgba(0,0,0,.25)')}${R(-246, -174, 492, 348, '#007060', 18)}${page}${sk}${rt}</g></g>`;
}
export function laptop(open = 1, screenFill = '#0A3830', logo = '') {
  const h = 230 * open;
  return `<g>${P(`M-230 0L-200 ${-h}L200 ${-h}L230 0Z`, '#2E3744')}${P(`M-208 -8L-182 ${-h + 14}L182 ${-h + 14}L208 -8Z`, screenFill)}${logo}${R(-250, 0, 500, 22, '#C9D4D9', 8)}${R(-60, 0, 120, 8, '#9AA5AB', 4)}</g>`;
}
// lampu "pemahaman" yang tersesat (tokoh kecil; kaki menyatu dengan badan)
export function bulb(t, o = {}) {
  const sw = Math.sin(t * 7) * 10;
  const face = `${C(-14, -18, 6, '#172B38')}${C(14, -18, 6, '#172B38')}${L('M-12 4Q0 14 12 4', '#172B38', 5)}`;
  return `<g>${L(`M-10 70L${f1(-18 - sw)} 120M10 70L${f1(18 + sw)} 120`, '#6D7C84', 12)}${E(f1(-22 - sw), 124, 16, 8, '#4B5963')}${E(f1(22 + sw), 124, 16, 8, '#4B5963')}${R(-22, 46, 44, 32, '#6D7C84', 8)}${R(-18, 76, 36, 10, '#4B5963', 5)}${C(0, 0, 58, '#FFE9A8')}${P('M-30 38Q0 70 30 38', '#FFE9A8')}${C(-18, -20, 14, 'rgba(255,255,255,.55)')}${face}</g>`;
}
// emoji "pusing" (digambar sendiri)
export function dizzyEmoji(t, s = 1) {
  const sp = (cx, dir) => { let d = ''; for (let i = 0; i <= 26; i++) { const a = i * 0.6 * dir + t * 9, r = 1 + i * 0.7; d += (i ? 'L' : 'M') + f1(cx + Math.cos(a) * r) + ' ' + f1(-6 + Math.sin(a) * r); } return `<path d="${d}" fill="none" stroke="#172B38" stroke-width="3.4" stroke-linecap="round"/>`; };
  return `<g transform="scale(${s})">${C(0, 0, 44, '#F8C038')}${C(-16, -6, 14, '#fff')}${C(16, -6, 14, '#fff')}${sp(-16, 1)}${sp(16, -1)}${P('M-16 22Q-8 14 0 22T16 22', 'none', 'stroke="#172B38" stroke-width="4.4" stroke-linecap="round"')}</g>`;
}
// lapisan "bayangan di kepala": tulang, otot, pembuluh dalam satu tubuh sederhana (ilustrasi, bukan model MEDCOEL)
export function layersBody(t, k = 1) {
  const j = (i) => Math.sin(t * 2.2 + i * 1.7) * 10 * k;
  const body = (c, e = '') => `<g ${e}>${C(0, -150, 44, c)}${R(-70, -100, 140, 190, c, 50)}${R(-120, -90, 40, 170, c, 20, 'transform="rotate(8 -100 -90)"')}${R(80, -90, 40, 170, c, 20, 'transform="rotate(-8 100 -90)"')}${R(-58, 80, 52, 200, c, 22)}${R(6, 80, 52, 200, c, 22)}</g>`;
  const bones = `<g transform="translate(${f1(j(0))} ${f1(j(1))}) rotate(${f1(Math.sin(t * 1.3) * 5)})" opacity=".95">${body('#EFE3C8')}${L('M0 -100V70', '#D9C8A3', 10)}${[0, 1, 2, 3].map((i) => L(`M-40 ${-70 + i * 28}Q0 ${-50 + i * 28} 40 ${-70 + i * 28}`, '#D9C8A3', 8)).join('')}</g>`;
  const muscle = `<g transform="translate(${f1(j(2) + 16)} ${f1(j(3) - 8)}) rotate(${f1(Math.sin(t * 1.7 + 1) * -6)})" opacity=".62">${body('#E8665F')}</g>`;
  const vessel = `<g transform="translate(${f1(j(4) - 14)} ${f1(j(5) + 10)}) rotate(${f1(Math.sin(t * 1.1 + 2) * 7)})" opacity=".85">${L('M0 -100V60M0 -60Q-60 -30 -100 40M0 -60Q60 -30 100 40M-20 70L-30 250M20 70L30 250', '#5B7CE8', 10)}${L('M10 -90V50', '#E8665F', 8)}</g>`;
  return bones + muscle + vessel;
}
export function qmarks(t, n = 3, r = 120) { return Array.from({ length: n }, (_, i) => { const a = t * 2 + i * 2.1, x = Math.cos(a) * r, y = Math.sin(a) * r * 0.5; return `<g transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(Math.sin(t * 5 + i) * 14)})">${T(0, 0, '?', '#F8C038', 74, 'stroke="#172B38" stroke-width="7" paint-order="stroke"')}</g>`; }).join(''); }

// Promo MEDCOEL "Bingung belajar anatomi?" (Reels/TikTok 1080 x 1920, 30 fps). renderFrame(t) deterministik.
// Semua visual produk = rekaman MEDCOEL asli (rekaman layar yang diberikan + rekaman web lokal dengan data uji), dipotong/diperbesar per panel.
// Panel: sumber = deretan bingkai (clips/ dan web/), tampilan (s, cx, cy) = skala layar-per-css-px dan titik sumber yang berada di tengah panel.
import { createMascot, poseMascot } from './mascot.js';

const $ = (id) => document.getElementById(id);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const eo = (x) => 1 - Math.pow(1 - clamp(x, 0, 1), 3);
const eob = (x) => { x = clamp(x, 0, 1); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const f1 = (n) => Math.round(n * 10) / 10;
const win = (t, a, b, f = 0.14) => clamp((t - a) / f, 0, 1) * clamp((b - t) / f, 0, 1);
const COL = { forest: '#0A3830', green: '#007060', mint: '#9DE0BD', gold: '#F8C038', coral: '#E8665F', ink: '#172B38', cream: '#F7F2E4', indigo: '#3B4A8C', sky: '#5BD0E6' };

await document.fonts.load('800 40px "Plus Jakarta Sans"'); await document.fonts.load('700 30px "Plus Jakarta Sans"'); await document.fonts.ready;
const KORI = createMascot(await (await fetch('kori.svg')).text(), 'kori');
let LOGO = ''; { const b = await (await fetch('logo-full.webp')).blob(); LOGO = await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(b); }); }

// ---------------------------------------------------------------- sumber bingkai
const rec = (dir, n, first = 1, h = 1582) => ({ dir, n, first, w: 2816, h });
const CLIPS = {
  lnd: rec('clips/lnd', 79), a: rec('clips/a', 49), b: rec('clips/b', 96), c: rec('clips/c', 108), d: rec('clips/d', 108), e: rec('clips/e', 36),
  q1: rec('clips/q1', 168), q2: rec('clips/q2', 121), q3: rec('clips/q3', 109),
  materi: rec('web/materi', 134, 0, 1584), flash: rec('web/flash', 120, 0, 1584), soal: rec('web/soal', 180, 0, 1584), sim: rec('web/sim', 218, 0, 1584),
};
const pool = new Map(); let used = new Set(); let loads = [];
function panel(id, o) {
  used.add(id); let p = pool.get(id);
  if (!p) { const d = document.createElement('div'); d.className = 'panel'; const im = document.createElement('img'); im.decoding = 'sync'; d.appendChild(im); $('panels').appendChild(d); p = { d, im, src: '' }; pool.set(id, p); }
  const c = CLIPS[o.clip], fi = clamp(Math.round(o.f), 0, c.n - 1), url = `media/${c.dir}/f${String(c.first + fi).padStart(4, '0')}.jpg`;
  if (p.src !== url) { p.src = url; p.im.src = url; loads.push(p.im.decode().catch(() => {})); }
  const [x, y, w, h] = o.rect, [s, cx, cy] = o.view, d = p.d.style;
  d.display = 'block'; d.left = f1(x) + 'px'; d.top = f1(y) + 'px'; d.width = f1(w) + 'px'; d.height = f1(h) + 'px'; d.borderRadius = (o.r ?? 28) + 'px'; d.opacity = o.a ?? 1;
  d.boxShadow = o.full ? 'none' : '0 0 0 5px #fff, 0 16px 36px rgba(0,0,0,.45)';
  const k = o.k ?? 1; d.transform = k !== 1 ? `scale(${k.toFixed(3)})` : 'none'; d.transformOrigin = `${f1(w / 2)}px ${f1(h / 2)}px`;
  p.im.style.width = c.w + 'px'; p.im.style.height = c.h + 'px';
  p.im.style.transform = `translate(${f1(w / 2 - cx * s)}px,${f1(h / 2 - cy * s)}px) scale(${(s / 2).toFixed(4)})`;
}
const fr = (t, t0, speed, off = 0) => (t - t0) * 30 * speed + off; // nomor bingkai sumber

// ---------------------------------------------------------------- gambar overlay
const T = (x, y, txt, fill, size, extra = '', anchor = 'middle') => `<text x="${f1(x)}" y="${f1(y)}" font-family="Plus Jakarta Sans" font-weight="800" font-size="${size}" fill="${fill}" text-anchor="${anchor}" ${extra}>${txt}</text>`;
const STROKE = 'stroke="#062B25" stroke-width="16" paint-order="stroke" stroke-linejoin="round"';
function pill(cx, cy, txt, o = {}) {
  const fs = o.fs ?? 40, w = o.w ?? Math.round(txt.length * fs * 0.64 + 76), h = o.h ?? Math.round(fs * 1.9), k = o.k ?? 1, a = o.a ?? 1;
  return `<g transform="translate(${f1(cx)} ${f1(cy)}) scale(${k.toFixed(3)}) rotate(${o.rot ?? 0})" opacity="${a.toFixed(3)}"><rect x="${-w / 2}" y="${-h / 2 + 8}" width="${w}" height="${h}" rx="${h / 2}" fill="rgba(0,0,0,.35)"/><rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="${h / 2}" fill="${o.bg ?? COL.coral}"/>${T(0, fs * 0.36, txt, o.fg ?? '#fff', fs, 'letter-spacing="1"')}</g>`;
}
const topChip = (t, a, b, txt, o = {}) => { const al = win(t, a, b); if (al <= 0.01) return ''; return pill(o.x ?? 540, o.y ?? 286, txt, { ...o, k: 0.85 + 0.15 * eob((t - a) / 0.3), a: al }); };
const tag = (rect, txt, a = 1) => `<g opacity="${a.toFixed(3)}" transform="translate(${f1(rect[0] + 22)} ${f1(rect[1] + 22)})"><rect x="0" y="0" width="${Math.round(txt.length * 15.5 + 34)}" height="46" rx="23" fill="rgba(6,43,37,.88)"/>${T(17, 31, txt, '#fff', 24, '', 'start')}</g>`;
function logoCard(cx, cy, k = 1, a = 1, w = 640) {
  const h = w * 0.31; return `<g transform="translate(${f1(cx)} ${f1(cy)}) scale(${k.toFixed(3)})" opacity="${a.toFixed(3)}"><rect x="${-w / 2}" y="${-h / 2 + 10}" width="${w}" height="${h}" rx="${h / 2}" fill="rgba(0,0,0,.3)"/><rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="${h / 2}" fill="#fff"/><image href="${LOGO}" x="${-w * 0.36}" y="${-w * 0.36 * 0.2015}" width="${w * 0.72}" height="${w * 0.72 * 0.2015}"/></g>`;
}
function kori(x, y, ks, t, o = {}) {
  poseMascot(KORI, { t, mood: o.mood ?? 'happy', env: 0, wave: o.wave ?? 0, phase: 0.5 });
  return `<g transform="translate(${f1(x - 160 * ks)} ${f1(y - 290 * ks)}) scale(${ks.toFixed(3)})" opacity="${(o.a ?? 1).toFixed(3)}">${KORI.root.outerHTML}</g>`;
}
function bgFor(mode) {
  if (mode === 'none') return '';
  return `<defs><linearGradient id="bgg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0B4A3F"/><stop offset="1" stop-color="#062B25"/></linearGradient></defs><rect width="1080" height="1920" fill="url(#bgg)"/><circle cx="130" cy="330" r="300" fill="rgba(255,255,255,.04)"/><circle cx="1000" cy="1500" r="380" fill="rgba(255,255,255,.04)"/><circle cx="960" cy="250" r="160" fill="rgba(248,192,56,.07)"/>`;
}

// ---------------------------------------------------------------- adegan
const FLASHES = [0.72, 1.44, 5.76, 6.48, 4.80, 7.20];
const SAFE = { x: 24, w: 1032, y0: 340, y1: 1496 }; // area panel (di atas bilah bawah Reels/TikTok)

function hook(t, ov) {
  const shots = [[0.0, 0.72, 'a', 1.0, 8.0], [0.72, 1.44, 'c', 2.0, 0], [1.44, 2.45, 'e', 1.0, 0]];
  for (const [a, b, clip, sp] of shots) if (t >= a && t < b) { const l = t - a, d = b - a; panel('hk', { clip, f: fr(t, a, sp), rect: [0, 0, 1080, 1920], r: 0, full: true, view: [2.43 * (1 + 0.07 * l / d), 704, 396] }); }
  ov.push(`<rect width="1080" height="1920" fill="rgba(2,24,20,.28)"/>`);
  const lines = [['BINGUNG', 0.0, '#fff', 0.0], ['BELAJAR', 0.1, '#fff', 0.88], ['ANATOMI?', 0.2, COL.gold, 1.26]];
  lines.forEach(([txt, t0, col, hit], i) => {
    const k = (0.55 + 0.45 * eob((t - t0) / 0.3)) * (1 + 0.1 * Math.exp(-Math.max(0, t - hit) * 7) * (t >= hit ? 1 : 0)), a = clamp((t - t0) / 0.08, 0, 1) * (1 - sm((t - 2.28) / 0.12));
    if (a > 0.01) ov.push(`<g transform="translate(540 ${820 + i * 170}) scale(${k.toFixed(3)})" opacity="${a.toFixed(3)}">${T(0, 0, txt, col, 154, STROKE.replace('16', '22'))}</g>`);
  });
}
function intro(t, ov, bgmode) {
  // 2.40-3.84 logo + GRATIS; 3.84-4.80 halaman web asli naik dari bawah
  const up = sm((t - 3.84) / 0.42); // 0 -> 1
  const lk = t < 2.4 ? 0 : 0.7 + 0.3 * eob((t - 2.4) / 0.35);
  const lx = lerp(540, 330, up), ly = lerp(760, 340, up), ls = lerp(1.0, 0.66, up);
  for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6 + t * 0.2; bgmode.extra += `<path d="M540 ${lerp(900, 640, up)}L${f1(540 + Math.cos(a) * 1400)} ${f1(lerp(900, 640, up) + Math.sin(a) * 1400)}L${f1(540 + Math.cos(a + 0.13) * 1400)} ${f1(lerp(900, 640, up) + Math.sin(a + 0.13) * 1400)}Z" fill="rgba(255,255,255,${(0.035 * (1 - up)).toFixed(3)})"/>`; }
  if (t >= 3.84) panel('lnd', { clip: 'lnd', f: fr(t, 3.84, 0.9, 50), rect: [24, lerp(1920, 520, eo((t - 3.84) / 0.42)), 1032, 860], view: [1.0 + 0.16 * sm((t - 3.9) / 0.9), 704 + 40 * sm((t - 3.9) / 0.9), 430 - 20 * sm((t - 3.9) / 0.9)] });
  if (lk > 0) ov.push(logoCard(lx, ly, lk * ls, clamp((t - 2.4) / 0.1, 0, 1), 700));
  if (t >= 3.6) { const sk = 0.5 + 0.5 * eob((t - 3.6) / 0.28), sx = lerp(540, 770, up), sy = lerp(1010, 340, up), ss = lerp(1.0, 0.5, up); ov.push(`<g transform="translate(${f1(sx)} ${f1(sy)}) rotate(-7) scale(${(sk * ss).toFixed(3)})"><rect x="-330" y="-110" width="660" height="240" rx="48" fill="rgba(0,0,0,.35)"/><rect x="-330" y="-120" width="660" height="240" rx="48" fill="${COL.coral}"/><rect x="-308" y="-98" width="616" height="196" rx="34" fill="none" stroke="#fff" stroke-width="6" opacity=".75"/>${T(0, 50, 'GRATIS!', '#fff', 150)}</g>`); }
  if (t >= 2.64 && t < 4.3) { const hop = 1 - sm((t - 3.84) / 0.4); ov.push(kori(540, 1380 + (1 - hop) * 420, 1.45, t, { wave: t < 3.84 ? 1 : 0, a: hop })); }
}
function anatomi3d(t, ov) {
  const shots = [[4.80, 5.76, 'b', 2.0, 0, 710, 396], [5.76, 6.48, 'c', 4.9, 0, 692, 396], [6.48, 7.2, 'd', 4.2, 0, 704, 396]];
  for (const [a, b, clip, sp, off, cx, cy] of shots) if (t >= a && t < b) { const l = t - a, d = b - a; panel('a3', { clip, f: fr(t, a, sp, off), rect: [0, 0, 1080, 1920], r: 0, full: true, view: [2.43 * (1 + 0.06 * l / d), cx, cy] }); }
  ov.push(topChip(t, 4.82, 7.2, 'ANATOMI 3D', { fs: 46, bg: COL.green, w: 470 }));
  ov.push(topChip(t, 5.1, 7.2, 'PUTAR · PERBESAR · GANTI SISTEM', { y: 1440, fs: 34, bg: 'rgba(6,43,37,.9)', w: 860 }));
}
function kuis(t, ov) {
  const p0 = 7.2, z = sm((t - 8.64) / 0.42);
  const R1 = [24, 340, 1032, 520], R2 = [24, 876, 508, 620], R3 = [548, 876, 508, 620], RZ = [24, 340, 1032, 1156];
  const mix = (a, b) => a.map((v, i) => lerp(v, b[i], z));
  const pop = (a) => 0.7 + 0.3 * eob((t - a) / 0.3), pa = (a) => clamp((t - a) / 0.1, 0, 1);
  const out = 1 - clamp((z - 0.0) / 0.5, 0, 1);
  if (z < 1) {
    panel('k1', { clip: 'q1', f: fr(t, p0, 2.5, 12), rect: R1, view: [1.0, 702, 470], a: pa(p0) * out, k: pop(p0) });
    panel('k2', { clip: 'q2', f: fr(t, p0, 1.5, 0), rect: R2, view: [1.45, 486, 410], a: pa(p0 + 0.12) * out, k: pop(p0 + 0.12) });
    ov.push(tag(R1, '1 · PILIH AREA & SISTEM', pa(p0) * out), tag(R2, '2 · LIHAT DI 3D', pa(p0 + 0.12) * out));
  }
  const r3 = z > 0 ? mix(R3, RZ) : R3;
  panel('k3', { clip: 'q3', f: fr(t, p0, 0.9, 6) + (t > 8.64 ? (t - 8.64) * 30 * 0.4 : 0), rect: r3, view: [lerp(1.23, 2.5, z), 1003, lerp(440, 428, z)], a: pa(p0 + 0.24), k: pop(p0 + 0.24) });
  ov.push(tag(r3, '3 · JAWAB, LANGSUNG ADA RESPONS', pa(p0 + 0.24)));
  ov.push(topChip(t, 7.22, 9.6, 'KUIS INTERAKTIF', { fs: 46, bg: COL.coral, w: 560 }));
}
function lain(t, ov) {
  // tiga panel bertumpuk; panel yang sedang dibahas membesar (tinggi bertambah, skala naik)
  const p0 = 9.6, em = 1 - sm((t - 10.75) / 0.3);
  const fl = sm((t - 10.75) / 0.3) * (1 - sm((t - 11.85) / 0.3)), so = sm((t - 11.85) / 0.3);
  const total = SAFE.y1 - SAFE.y0 - 32, wts = [1 + 0.95 * em, 1 + 0.95 * fl, 1 + 0.95 * so], sum = wts[0] + wts[1] + wts[2];
  const hs = wts.map((w) => total * w / sum);
  let y = SAFE.y0; const rects = hs.map((h) => { const r = [SAFE.x, y, SAFE.w, h]; y += h + 16; return r; });
  const pop = (a) => 0.7 + 0.3 * eob((t - a) / 0.3), pa = (a) => clamp((t - a) / 0.1, 0, 1);
  const sM = 0.75 + 0.32 * em, sF = 1.1 + 0.35 * fl, sS = 1.0 + 0.4 * so;
  panel('l1', { clip: 'materi', f: fr(t, p0, 1.0, 0), rect: rects[0], view: [sM, 105 + SAFE.w / (2 * sM), 52 + hs[0] / (2 * sM)], a: pa(p0), k: pop(p0) });
  panel('l2', { clip: 'flash', f: fr(t, 10.0, 1.0, 0), rect: rects[1], view: [sF, 712, 300 + hs[1] / (2 * sF)], a: pa(p0 + 0.12), k: pop(p0 + 0.12) });
  panel('l3', { clip: 'soal', f: Math.max(90, fr(t, 11.8, 1.5, 90)), rect: rects[2], view: [sS, 130 + SAFE.w / (2 * sS), 250 + hs[2] / (2 * sS)], a: pa(p0 + 0.24), k: pop(p0 + 0.24) });
  ov.push(tag(rects[0], 'CATATAN MATERI', pa(p0)), tag(rects[1], 'FLASHCARD', pa(p0 + 0.12)), tag(rects[2], 'LATIHAN SOAL', pa(p0 + 0.24)));
  ov.push(topChip(t, 9.62, 10.78, 'BACA MATERI', { fs: 46, bg: COL.green, w: 500 }), topChip(t, 10.8, 11.88, 'FLASHCARD', { fs: 46, bg: COL.indigo, w: 450 }), topChip(t, 11.9, 13.4, 'LATIHAN SOAL', { fs: 46, bg: COL.coral, w: 520 }));
}
function sim(t, ov) {
  const p0 = 13.44, se = sm((t - 15.36) / 0.4);
  const tH = lerp(620, 380, se), pop = (a) => 0.7 + 0.3 * eob((t - a) / 0.3), pa = (a) => clamp((t - a) / 0.1, 0, 1);
  const rT = [SAFE.x, SAFE.y0, SAFE.w, tH], rB = [SAFE.x, SAFE.y0 + tH + 16, SAFE.w, SAFE.y1 - SAFE.y0 - tH - 16];
  const f = fr(t, p0, 1.6, 57);
  panel('s1', { clip: 'sim', f, rect: rT, view: [1.47, 494, 345], a: pa(p0), k: pop(p0) });
  panel('s2', { clip: 'sim', f, rect: rB, view: [2.59, 1064, lerp(420, 440, se)], a: pa(p0 + 0.14), k: pop(p0 + 0.14) });
  ov.push(tag(rT, 'PASIEN', pa(p0)), tag(rB, 'PILIH PERTANYAAN & PEMERIKSAAN', pa(p0 + 0.14)));
  ov.push(topChip(t, 13.46, 16.7, 'SIMULASI JADI DOKTER', { fs: 46, bg: COL.indigo, w: 700 }));
}
function penutup(t, ov) {
  const p0 = 16.8;
  const tiles = [[24, 560, 'c', 3.0, 700, 395, 1.1, 0, '3D ANATOMY'], [548, 560, 'q3', 1.2, 905, 400, 0.85, 40, 'KUIS'], [24, 958, 'materi', 1.0, 690, 260, 0.67, 40, 'MATERI & SOAL'], [548, 958, 'sim', 1.2, 704, 330, 0.7, 120, 'SIMULASI DOKTER']];
  tiles.forEach(([x, y, clip, sp, cx, cy, s, off, label], i) => {
    const a0 = p0 + i * 0.24; if (t < a0) return;
    const rect = [x, y, 508, 382], k = 0.7 + 0.3 * eob((t - a0) / 0.3);
    panel('c' + i, { clip, f: Math.min(fr(t, a0, sp, off), clip === 'q3' ? 80 : 9999), rect, view: [s, cx, cy], a: clamp((t - a0) / 0.1, 0, 1), k });
    ov.push(tag(rect, label, clamp((t - a0) / 0.1, 0, 1)));
  });
  const a1 = clamp((t - 16.9) / 0.15, 0, 1), k1 = 0.8 + 0.2 * eob((t - 16.9) / 0.35);
  ov.push(`<g opacity="${a1.toFixed(3)}" transform="translate(540 380) scale(${k1.toFixed(3)})">${T(0, 0, 'BELAJAR KEDOKTERAN', '#fff', 68, STROKE.replace('16', '18'))}${T(0, 122, 'GRATIS', COL.gold, 136, STROKE.replace('16', '22'))}</g>`);
  if (t > 18.6) ov.push(logoCard(215, 1420, 0.7 + 0.3 * eob((t - 18.6) / 0.35), clamp((t - 18.6) / 0.12, 0, 1), 350));
  if (t > 19.4) ov.push(pill(625, 1420, 'medcoel.com', { fs: 58, w: 450, h: 112, bg: COL.gold, fg: COL.forest, k: 0.8 + 0.2 * eob((t - 19.4) / 0.3), a: clamp((t - 19.4) / 0.1, 0, 1) }));
  if (t > 18.84) ov.push(kori(935, 1496, 0.52, t, { wave: 1, a: clamp((t - 18.84) / 0.15, 0, 1) }));
}

// ---------------------------------------------------------------- renderFrame
async function renderFrame(t) {
  used = new Set(); loads = []; const ov = []; const bgm = { extra: '' };
  let bgmode = 'green';
  if (t < 2.4 || (t >= 4.8 && t < 7.2)) bgmode = 'none';
  if (t < 2.4) hook(t, ov);
  else if (t < 4.8) intro(t, ov, bgm);
  else if (t < 7.2) anatomi3d(t, ov);
  else if (t < 9.6) kuis(t, ov);
  else if (t < 13.44) lain(t, ov);
  else if (t < 16.8) sim(t, ov);
  else penutup(t, ov);
  for (const [id, p] of pool) if (!used.has(id)) { p.d.style.display = 'none'; }
  $('bg').innerHTML = bgFor(bgmode) + bgm.extra;
  $('ov').innerHTML = ov.join('');
  // kilatan putih tipis di setiap potongan
  let fl = 0; for (const c of FLASHES) if (t >= c && t < c + 0.14) fl = Math.max(fl, 0.5 * (1 - (t - c) / 0.14));
  $('flash').style.opacity = fl.toFixed(3);
  await Promise.all(loads);
}
window.renderFrame = renderFrame;
window.__ready = true;

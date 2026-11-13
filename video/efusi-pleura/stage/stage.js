// "EFUSI PLEURA KANAN DI LIVE 4D LAB" (1080 x 1920, 30 fps, durasi = narasi 52,88 dtk). Narasi Google AI Studio dipakai apa adanya (audio/narasi.wav).
// Visual utama = rekaman Live 4D Lab MEDCOEL ASLI (produksi) yang direkam deterministik oleh rekam/rekam.cjs (15 fps; tiap bingkai video memakai bingkai rekaman terakhir).
// Penanda (cincin halus) digambar dari raster struktur milik aplikasi sendiri (cairan pleura, diafragma, atelektasis), bukan ditebak.
// Sisipan penampang (12,4-17,4 dtk) dan ilustrasi tekanan paru (32,4-38,6 dtk) adalah ILUSTRASI SVG dan diberi label "Ilustrasi".
import { f1, clamp, lerp, sm, eo, eio, FONT } from './core.js';
const $ = (id) => document.getElementById(id);
const C = await (await fetch('../cues.json')).json();
const AN = await (await fetch('../data/anchors.json')).json();
await document.fonts.load('800 40px "Plus Jakarta Sans"'); await document.fonts.load('700 30px "Plus Jakarta Sans"'); await document.fonts.load('600 30px "Plus Jakarta Sans"'); await document.fonts.ready;
export const DUR = C.dur;

const K = { bg0: '#061519', bg1: '#0B2C31', teal: '#00A08A', cyan: '#5CE1E6', gold: '#F8C038', coral: '#FF7A9C', ink: '#0B1F26', text: '#EAF7F4', mute: '#9CC4BE', line: 'rgba(124,224,184,.38)' };
const FR = '../rekam/frames', IW = 1600, IH = 950;
const kOf = (sg, t) => { const [a, b] = C.rec[sg]; return Math.max(a, Math.min(b - 1, Math.floor(t * 15 + 1e-6))); };
const pad = (k) => String(k).padStart(4, '0');
const furl = (sg, k) => `${FR}/${sg}/f${pad(k)}.jpg`;
const murl = (sg, k, n) => `${FR}/${sg}/f${pad(k)}_${n}.png`;
let NEED = [];
const need = (u) => { NEED.push(u); return u; };
const cache = new Map();
const load = (u) => { if (!cache.has(u)) { const im = new Image(); im.src = u; cache.set(u, im.decode().catch(() => {})); } return cache.get(u); };
const lerpR = (a, b, k) => ({ x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), w: lerp(a.w, b.w, k), h: lerp(a.h, b.h, k) });
const win = (t, a, b, f = 0.3) => clamp((t - a) / f) * clamp((b - t) / f);

// ---------------------------------------------------------------- primitif
const R = (x, y, w, h, f, rx = 0, e = '') => `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" rx="${rx}" fill="${f}" ${e}/>`;
const T = (x, y, txt, f, size, w = 800, anchor = 'middle', e = '') => `<text x="${f1(x)}" y="${f1(y)}" font-family="${FONT}" font-weight="${w}" font-size="${size}" fill="${f}" text-anchor="${anchor}" ${e}>${txt}</text>`;
const tw = (txt, fs, w = 700) => txt.length * fs * (w >= 800 ? 0.6 : 0.56);
/** label kapsul; (x, y) = tengah-bawah garis dasar; anchor "m" tengah / "l" kiri */
function pill(x, y, txt, o = {}) {
  const fs = o.fs ?? 30, w = tw(txt, fs, o.w ?? 800) + (o.px ?? 34), h = fs + 22, a = o.a ?? 1; if (a <= 0.01) return '';
  const x0 = o.anchor === 'l' ? x : o.anchor === 'r' ? x - w : x - w / 2;
  return `<g opacity="${f1(a)}">${R(x0, y - fs - 6, w, h, o.bg ?? 'rgba(6,21,25,.86)', h / 2, `stroke="${o.c ?? K.cyan}" stroke-width="${o.sw ?? 3}"`)}${T(x0 + w / 2, y + 4, txt, o.fg ?? K.text, fs, o.w ?? 800)}</g>`;
}
const EDU = (a = 1, big = false) => pill(540, big ? 1400 : 1418, 'Simulasi edukatif, bukan alat diagnosis', { fs: big ? 36 : 26, c: big ? K.gold : 'rgba(124,224,184,.5)', w: 700, a, sw: big ? 4 : 2 });
const ILU = (a = 1) => pill(540, 1418, 'Ilustrasi sederhana, bukan hasil simulasi', { fs: 26, c: 'rgba(248,192,56,.7)', w: 700, a, sw: 2 });
const defs = () => `<defs>
${[['cyan', K.cyan], ['gold', K.gold], ['coral', K.coral]].map(([n, c]) => `<filter id="mk-${n}" x="-4%" y="-4%" width="108%" height="108%" color-interpolation-filters="sRGB">
<feGaussianBlur in="SourceAlpha" stdDeviation="3.2" result="b"/><feComponentTransfer in="b" result="s"><feFuncA type="linear" slope="16" intercept="-7"/></feComponentTransfer>
<feMorphology in="s" operator="erode" radius="2.2" result="e"/><feComposite in="s" in2="e" operator="out" result="edge"/>
<feFlood flood-color="${c}" flood-opacity=".95" result="fc"/><feComposite in="fc" in2="edge" operator="in" result="ring"/>
<feFlood flood-color="${c}" flood-opacity=".07" result="ff"/><feComposite in="ff" in2="s" operator="in" result="fill"/>
<feMerge><feMergeNode in="fill"/><feMergeNode in="ring"/></feMerge></filter>`).join('')}
<linearGradient id="bgG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${K.bg0}"/><stop offset="1" stop-color="${K.bg1}"/></linearGradient>
<radialGradient id="glow" cx=".5" cy=".42" r=".6"><stop offset="0" stop-color="#0E4A4A" stop-opacity=".55"/><stop offset="1" stop-color="#0E4A4A" stop-opacity="0"/></radialGradient>
</defs>`;
const bg = () => `<rect width="1080" height="1920" fill="url(#bgG)"/><rect width="1080" height="1920" fill="url(#glow)"/>`;

// ---------------------------------------------------------------- potong rekaman asli (koordinat sumber = px CSS bingkai 1600 x 950)
function crop(id, u, src, dst, o = {}) {
  const sc = dst.w / src.w, rad = o.r ?? 0, ix = dst.x - src.x * sc, iy = dst.y - src.y * sc;
  const svg = `<clipPath id="${id}"><rect x="${f1(dst.x)}" y="${f1(dst.y)}" width="${f1(dst.w)}" height="${f1(dst.h)}" rx="${rad}"/></clipPath><g clip-path="url(#${id})"><image href="${need(u)}" x="${f1(ix)}" y="${f1(iy)}" width="${f1(IW * sc)}" height="${f1(IH * sc)}" preserveAspectRatio="none"/>${o.inner ? o.inner({ sc, X: (x) => dst.x + (x - src.x) * sc, Y: (y) => dst.y + (y - src.y) * sc }) : ''}</g>${o.stroke === false ? '' : `<rect x="${f1(dst.x)}" y="${f1(dst.y)}" width="${f1(dst.w)}" height="${f1(dst.h)}" rx="${rad}" fill="none" stroke="${o.border ?? K.line}" stroke-width="${o.bw ?? 3}"/>`}`;
  return { svg, sc, X: (x) => dst.x + (x - src.x) * sc, Y: (y) => dst.y + (y - src.y) * sc };
}
/** persegi sumber dengan lebar w, pusat (cx, cy), proporsi mengikuti tujuan lebar dw x tinggi dh */
const srcAt = (cx, cy, w, dw, dh) => ({ x: cx - w / 2, y: cy - (w * dh / dw) / 2, w, h: w * dh / dw });
const dstC = (cy, w, h, cx = 540) => ({ x: cx - w / 2, y: cy - h / 2, w, h });
const lay = (a, key) => a.lay[key] || a.lay.us || a.lay.ct || Object.values(a.lay)[0];
/** titik topeng (0..420, 0..298) -> px CSS bingkai */
function mpt(a, p, key) { const l = lay(a, key), [cx, cy] = a.cv; return [cx + l.x0 / 2 + p[0] / 420 * l.dw / 2, cy + l.y0 / 2 + p[1] / 298 * l.dh / 2]; }
function maskImg(sg, k, name, col, map, o = {}) {
  const a = AN[sg][k]; if (!a || !a.m || !a.m[name]) return '';
  const l = lay(a, o.key), [cx, cy] = a.cv, x0 = cx + l.x0 / 2, y0 = cy + l.y0 / 2;
  return `<image href="${need(murl(sg, k, name))}" x="${f1(map.X(x0))}" y="${f1(map.Y(y0))}" width="${f1(l.dw / 2 * map.sc)}" height="${f1(l.dh / 2 * map.sc)}" preserveAspectRatio="none" filter="url(#mk-${col})" opacity="${f1(o.a ?? 1)}"/>`;
}
const TOOL = { x: 0, y: 53, w: 560, h: 46 };          // bilah mode asli: USG | CT | USG + CT | Bantuan anatomi
const FAN = { x: 400, y: 102, w: 780, h: 722 };         // citra USG/CT diperbesar (monitor diperluas); tinggi tujuan tetap 1000 px
const START = { x: 0, y: 0, w: 1026, h: 950 };         // bingkai pertama: halaman web asli (header MEDCOEL + monitor)
const DH = 1000, DCY = 872;
const FULL = { x: 0, y: 0, w: IW, h: IH };
function strip(sg, k, a, y = 282) {
  if (a <= 0.01) return '';
  const w = 1000, h = TOOL.h * w / TOOL.w;
  return `<g opacity="${f1(a)}">${crop('cTool' + sg, furl(sg, k), TOOL, { x: 40, y, w, h }, { r: 16, bw: 2 }).svg}</g>`;
}
// ---------------------------------------------------------------- A: USG diperbesar + penanda halus (0-5,0 dtk)
function usgView(sg, t, o = {}) {
  const k = kOf(sg, t), a = AN[sg][k]; let s = '';
  const zoom = o.zoom ?? 1, src = lerpR(START, FAN, zoom), dst = { x: 0, y: DCY - DH / 2, w: 1080, h: DH };
  const marks = [];
  const mk = (name, col, t0, t1) => { const al = win(t, t0, t1, 0.35); if (al > 0.01) marks.push([name, col, al]); };
  (o.marks || []).forEach((m) => mk(...m));
  const cr = crop('cMain', furl(sg, k), src, dst, { r: 0, stroke: false, inner: (map) => marks.map(([n, c, al]) => maskImg(sg, k, n, c, map, { a: al * (0.88 + 0.12 * Math.sin(t * 5)) })).join('') });
  s += cr.svg;
  const map = cr; const at = (name, dx = 0, dy = 0) => { const m = a.m && a.m[name]; if (!m) return null; const [px, py] = mpt(a, m.c); return [map.X(px) + dx, map.Y(py) + dy]; };
  return { s, map, a, at, k, dst };
}
function sceneA(t) {
  const sg = 'A', k = kOf(sg, t), z = sm(clamp((t - C.A.zoom[0]) / (C.A.zoom[1] - C.A.zoom[0])));
  const o = { zoom: z, marks: [['pleural_fluid', 'cyan', C.A.gelap, 4.9], ['diaphragm', 'gold', C.A.diafragma, 4.9]] };
  const v = usgView(sg, t, o); let s = v.s;
  const lf = v.at('pleural_fluid', 0, 10), ld = v.at('diaphragm', 0, 0);
  if (lf) s += pill(lf[0], lf[1], 'AREA GELAP', { fs: 30, c: K.cyan, a: win(t, C.A.gelap + 0.1, 4.9, 0.3) });
  if (ld) s += pill(ld[0] - 16, ld[1] + 44, 'DIAFRAGMA', { fs: 28, c: K.gold, a: win(t, C.A.diafragma + 0.05, 4.9, 0.3) });
  if (lf) { const q = win(t, C.A.tanya, 4.95, 0.3); if (q > 0.01) s += `<g opacity="${f1(q)}"><circle cx="${f1(lf[0] + 150)}" cy="${f1(lf[1] - 110)}" r="38" fill="rgba(6,21,25,.88)" stroke="${K.cyan}" stroke-width="3"/>${T(lf[0] + 150, lf[1] - 96, '?', K.cyan, 52, 800)}</g>`; }
  s += strip(sg, k, sm(clamp((t - 1.1) / 0.6)));
  s += EDU(clamp((t - 1.4) / 0.4));
  return s;
}
// ---------------------------------------------------------------- BC: probe + pilih jendela + 3D + bandingkan dengan normal (5,0-12,4 dtk)
const BCS = { s3d: { x: 0, y: 385, w: 650, h: 317 }, list: { x: 0, y: 598, w: 400, h: 262 }, usg: { x: 905, y: 135, w: 690, h: 460 }, tbl: { x: 0, y: 596, w: 360, h: 265 } };
const BCT = { open1: 6.95, close1: 8.22, open2: 9.28, close2: 12.0, normal: [10.27, 11.22], jump: 7.52 };   // waktu (dtk) drawer terlihat terbuka/tertutup di rekaman
function sceneBC(t) {
  const sg = 'BC', k = kOf(sg, t), a = AN[sg][k]; let s = '';
  const ph = t < BCT.open1 ? 1 : t < BCT.close1 ? 2 : t < BCT.open2 ? 3 : t < BCT.close2 ? 4 : 5;
  const fade = (t0) => clamp((t - t0) / 0.25);
  const D1 = { x: 90, y: 300, w: 900, h: 439 }, D2 = { x: 90, y: 770, w: 900, h: 600 };
  const frame = (id, src, dst, o = {}) => crop(id, furl(sg, k), src, dst, { r: 22, bw: 3, ...o });
  if (ph === 1 || ph === 3 || ph === 5) {
    const c1 = frame('cP1', BCS.s3d, D1, { inner: (m) => '' });
    s += c1.svg; s += frame('cP2', BCS.usg, D2).svg;
    if (ph === 3) { const [px, py] = a.probe; s += tetherLine(t, c1.X(px), c1.Y(py), D2); }
    s += pill(540, 280, ph === 1 ? 'probe digerakkan · posisinya terlihat di 3D' : 'jendela basal kanan posterolateral · posisi probe di 3D', { fs: 28, c: K.cyan, a: 1 });
  } else if (ph === 2) {
    s += frame('cP1', BCS.list, { x: 90, y: 300, w: 900, h: 585 }).svg;
    s += frame('cP2', BCS.usg, { x: 210, y: 925, w: 660, h: 440 }).svg;
    s += pill(540, 335 + 0, 'pilih jendela efusi pada Live 4D Lab', { fs: 26, c: K.cyan, a: fade(BCT.open1) * 0.0 });
  } else {
    const nm = t >= BCT.normal[0] && t < BCT.normal[1];
    s += frame('cP1', BCS.usg, { x: 140, y: 290, w: 800, h: 533 }).svg;
    s += pill(540, 872, nm ? 'TAMPILAN NORMAL' : 'SKENARIO EFUSI PLEURA KANAN', { fs: 32, c: nm ? K.gold : K.cyan, a: 1, px: 50 });
    s += frame('cP2', BCS.tbl, { x: 200, y: 890, w: 680, h: 500 }).svg;
    s += `<rect x="222" y="1229" width="636" height="58" rx="12" fill="none" stroke="${K.gold}" stroke-width="5" opacity="${f1(clamp((t - 10.0) / 0.3))}"/>`;
  }
  s += EDU(1);
  return s;
}
const tether = () => '';
function tetherLine(t, x, y, D2) {
  const u = sm(clamp((t - 8.4) / 0.6)), fx = 90 + 900 * 0.62, fy = 770 + 40, pulse = 0.5 + 0.5 * Math.sin(t * 7);
  const al = clamp((t - 8.3) / 0.2) * clamp((9.27 - t) / 0.12);
  return `<g opacity="${f1(al)}"><circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(34 + 6 * pulse)}" fill="none" stroke="${K.gold}" stroke-width="5"/><circle cx="${f1(x)}" cy="${f1(y)}" r="9" fill="${K.gold}"/><path d="M${f1(x)} ${f1(y + 36)} C ${f1(x)} ${f1(y + 160)} ${f1(fx)} ${f1(fy - 160)} ${f1(fx)} ${f1(fy)}" fill="none" stroke="${K.gold}" stroke-width="5" stroke-linecap="round" stroke-dasharray="${f1(900 * u)} 2000"/><circle cx="${f1(fx)}" cy="${f1(fy)}" r="${f1(14 * u)}" fill="${K.gold}"/></g>`;
}

// ---------------------------------------------------------------- D: penampang sederhana (12,4-17,4 dtk)
function sceneD(t) {
  const u = t - C.sc.D[0], a = win(t, C.sc.D[0], C.sc.D[1], 0.4);
  const ox = 90, oy = 350, S = 1.0;                 // ilustrasi 900 x 900 dalam koordinat lokal
  const level = lerp(792, 585, sm(clamp((t - C.D.cairan[0]) / (C.D.cairan[1] - C.D.cairan[0]))));
  const cx = 470, cy = 430, innerRx = 355, innerRy = 360, lungRx = 335, lungRy = 342;
  const glowTip = win(t, C.D.ruangTipis[0], C.D.ruangTipis[1], 0.4);
  const ribs = Array.from({ length: 9 }, (_, i) => { const ang = (-70 + i * 21) * Math.PI / 180, rr = (innerRx + 40), x = cx + Math.cos(ang + Math.PI) * rr * 1.05 - 0, y = cy + Math.sin(ang) * (innerRy + 40); return [x, y, ang]; });
  let g = `<defs><clipPath id="inner"><ellipse cx="${cx}" cy="${cy}" rx="${innerRx}" ry="${innerRy}"/></clipPath>
  <clipPath id="lungC"><rect x="0" y="0" width="900" height="${f1(level - 8)}"/></clipPath><clipPath id="lungE"><ellipse cx="${cx - 4}" cy="${cy}" rx="${lungRx}" ry="${lungRy}"/></clipPath>
  <radialGradient id="lungG" cx=".45" cy=".35" r=".8"><stop offset="0" stop-color="#F6B8B4"/><stop offset=".7" stop-color="#E58F93"/><stop offset="1" stop-color="#C96A78"/></radialGradient>
  <linearGradient id="fluG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6FD0FF" stop-opacity=".92"/><stop offset="1" stop-color="#2B86D6" stop-opacity=".95"/></linearGradient></defs>`;
  // dinding dada (kulit, otot, rusuk) + rongga pleura
  g += `<ellipse cx="${cx}" cy="${cy}" rx="${innerRx + 92}" ry="${innerRy + 80}" fill="#2B4B52" stroke="#56848A" stroke-width="3"/>`;
  g += `<ellipse cx="${cx}" cy="${cy}" rx="${innerRx + 56}" ry="${innerRy + 48}" fill="#4A7077"/>`;
  g += ribs.map(([x, y, an]) => `<ellipse cx="${f1(x - 8)}" cy="${f1(y)}" rx="22" ry="14" transform="rotate(${f1(an * 180 / Math.PI + 90)} ${f1(x - 8)} ${f1(y)})" fill="#EBDDBE" stroke="#BFAE86" stroke-width="2"/>`).join('');
  g += `<ellipse cx="${cx}" cy="${cy}" rx="${innerRx}" ry="${innerRy}" fill="#173E46" stroke="#8FD9CF" stroke-width="3"/>`;     // permukaan dalam dinding dada (pleura parietal)
  // paru (terpotong rata oleh permukaan cairan = tertekan)
  const sq = clamp((792 - level) / 207);
  g += `<g clip-path="url(#lungC)"><ellipse cx="${cx - 4}" cy="${cy}" rx="${lungRx}" ry="${lungRy}" fill="url(#lungG)" stroke="#F4A7AA" stroke-width="3"/>${Array.from({ length: 7 }, (_, i) => `<path d="M${cx + 20} ${cy - 40} Q${cx - 80 + i * 20} ${cy + 60 + i * 28} ${cx - 190 + i * 55} ${cy + 220 + (i % 2) * 40}" fill="none" stroke="rgba(160,60,80,.28)" stroke-width="4" stroke-linecap="round"/>`).join('')}<g clip-path="url(#lungE)"><rect x="0" y="${f1(level - 110)}" width="900" height="130" fill="rgba(110,40,70,${f1(0.34 * sq)})"/></g></g>`;
  // cairan di rongga pleura (antara paru dan dinding dada, di bagian punggung)
  g += `<g clip-path="url(#inner)"><rect x="0" y="${f1(level)}" width="900" height="520" fill="url(#fluG)"/><rect x="0" y="${f1(level - 3)}" width="900" height="6" fill="rgba(255,255,255,.55)"/></g>`;
  // tulang belakang + mediastinum (acuan arah)
  g += `<ellipse cx="${cx + 392}" cy="${cy + 280}" rx="58" ry="48" fill="#EBDDBE" stroke="#BFAE86" stroke-width="3"/>`;
  // ruang tipis (disorot)
  if (glowTip > 0.01) g += `<ellipse cx="${cx}" cy="${cy}" rx="${innerRx - 8}" ry="${innerRy - 8}" fill="none" stroke="${K.cyan}" stroke-width="${f1(7 * glowTip)}" opacity="${f1(0.9 * glowTip)}" stroke-dasharray="3 14" stroke-linecap="round"/>`;
  // label
  const lab = (t0, x, y, tx, ty, txt, c) => { const al = clamp((t - t0) / 0.35); if (al <= 0.01) return ''; return `<g opacity="${f1(al)}"><line x1="${x}" y1="${y}" x2="${tx}" y2="${ty}" stroke="${c}" stroke-width="3"/><circle cx="${x}" cy="${y}" r="7" fill="${c}"/>${pill(tx, ty + 12, txt, { fs: 28, c, anchor: 'l' })}</g>`; };
  let L = '';
  L += lab(C.D.ruangTipis[0] + 0.5, cx - innerRx + 8, cy - 40, 20, 110, 'RONGGA PLEURA (ruang tipis)', K.cyan);
  L += lab(C.D.cairan[0] + 0.3, cx - 120, level + 70, 40, 880, 'CAIRAN', '#7FD3FF');
  L += lab(C.D.paru, cx + 40, cy - 150, 700, 130, 'PARU', '#F4A7AA');
  L += lab(C.D.dinding, cx - innerRx - 70, cy + 120, 20, 250, 'DINDING DADA', '#EBDDBE');
  L += (t > C.D.cairan[0] ? `<g opacity="${f1(clamp((t - 16.3) / 0.5))}">${T(450, 24, 'cairan berada di rongga pleura, bukan di dalam paru', K.text, 26, 700)}</g>` : '');
  const sc = `translate(${ox} ${oy}) scale(${S})`;
  let s = `<g opacity="${f1(a)}"><g transform="${sc}">${g}${L}</g>${T(540, 330, 'PENAMPANG DADA (ilustrasi)', K.mute, 24, 700)}${T(540, 1296, 'punggung (posterior) di bawah · posisi telentang', K.mute, 24, 600)}</g>`;
  return s + ILU(a);
}
// ---------------------------------------------------------------- EF: USG (17,4-26,7) lalu mode CT (26,75-32,4)
let ctFocus = null;
function ctFocusPt() {
  if (ctFocus) return ctFocus; const ks = Object.keys(AN.EF).map(Number).filter((k) => k >= 420 && AN.EF[k].m && AN.EF[k].m.pleural_fluid); let sx = 0, sy = 0, n = 0, bw = 0, bh = 0;
  for (const k of ks) { const a = AN.EF[k], m = a.m.pleural_fluid, [x0, y0] = mpt(a, [m.bb[0], m.bb[1]]), [x1, y1] = mpt(a, [m.bb[2], m.bb[3]]); sx += (x0 + x1) / 2; sy += (y0 + y1) / 2; bw += x1 - x0; bh += y1 - y0; n++; }
  ctFocus = n ? { cx: sx / n, cy: sy / n, w: bw / n, h: bh / n } : { cx: 760, cy: 420, w: 560, h: 300 }; return ctFocus;
}
function sceneEF(t) {
  const sg = 'EF', k = kOf(sg, t), isCT = t >= C.EF.modeCT + 0.15;
  const marks = isCT ? [['pleural_fluid', 'cyan', C.EF.ctLabel, 32.5]] : [['pleural_fluid', 'cyan', C.EF.cairan, 26.4], ['diaphragm', 'gold', C.EF.diafragma, 26.4], ['atelectasis', 'coral', C.EF.paruTertekan, 26.4]];
  let zoom = 0, o = { zoom: 1, marks };
  // zoom CT ke daerah cairan (setelah perpindahan mode)
  let s;
  if (isCT) {
    const f = ctFocusPt(), zt = sm(clamp((t - 27.5) / 1.1));
    const cs = lerpR(FAN, srcAt(f.cx, f.cy + 10, Math.max(640, f.w * 1.2), 1080, DH), zt);
    const dst = { x: 0, y: DCY - DH / 2, w: 1080, h: DH }; const a = AN[sg][k];
    const cr = crop('cMain', furl(sg, k), cs, dst, { stroke: false, inner: (map) => marks.map(([n, c, al]) => maskImg(sg, k, n, c, map, { a: win(t, al, 32.5, 0.35) })).join('') });
    s = cr.svg;
    const al = win(t, C.EF.ctLabel, 32.35, 0.35);
    if (al > 0.01 && a && a.m && a.m.pleural_fluid) {
      const m = a.m.pleural_fluid, [px, py] = mpt(a, m.c), X = cr.X(px), Y = cr.Y(py), [bx, by] = mpt(a, [m.c[0], m.bb[1]]), top = cr.Y(by), ly = Math.max(top - 30, dst.y + 70), lx = clamp(X, 330, 750);
      s += `<g opacity="${f1(al)}"><line x1="${f1(lx)}" y1="${f1(ly + 24)}" x2="${f1(X)}" y2="${f1(Y)}" stroke="${K.cyan}" stroke-width="3"/><circle cx="${f1(X)}" cy="${f1(Y)}" r="8" fill="${K.cyan}" stroke="#06191d" stroke-width="3"/></g>`;
      s += pill(lx, ly, 'CAIRAN DI RONGGA PLEURA', { fs: 36, c: K.cyan, a: al, px: 44 });
    }
  } else {
    const v = usgView(sg, t, o); s = v.s;
    const lf = v.at('pleural_fluid', 0, 14), ld = v.at('diaphragm', 0, 0), la = v.at('atelectasis', 0, 0);
    if (lf) s += pill(lf[0] - 20, lf[1], 'CAIRAN', { fs: 32, c: K.cyan, a: win(t, C.EF.cairan + 0.15, 26.4, 0.3) });
    if (ld) s += pill(ld[0] - 10, ld[1] + 50, 'DIAFRAGMA', { fs: 28, c: K.gold, a: win(t, C.EF.diafragma + 0.05, 26.4, 0.3) });
    if (ld && lf) { const al = win(t, 21.2, 24.2, 0.35); if (al > 0.01) { const mx = (ld[0] + lf[0]) / 2, my = (ld[1] + lf[1]) / 2 - 70; s += `<g opacity="${f1(al)}"><path d="M${f1(ld[0] + 40)} ${f1(ld[1] - 70)} L${f1(lf[0] - 60)} ${f1(lf[1] - 70)}" stroke="${K.gold}" stroke-width="4" stroke-dasharray="14 10" fill="none"/><path d="M${f1(lf[0] - 60)} ${f1(lf[1] - 70)} l-18 -12 m18 12 l-18 12" stroke="${K.gold}" stroke-width="4" fill="none" stroke-linecap="round"/>${pill(mx, my - 18, 'DI ATAS DIAFRAGMA (S)', { fs: 24, c: K.gold, w: 700 })}</g>`; } }
    if (la) { const al = win(t, C.EF.paruTertekan + 0.05, 26.4, 0.3); if (al > 0.01) s += `<g opacity="${f1(al)}"><line x1="${f1(la[0])}" y1="${f1(la[1])}" x2="${f1(la[0] - 110)}" y2="${f1(la[1] + 90)}" stroke="${K.coral}" stroke-width="3"/>${pill(la[0] - 110, la[1] + 112, 'PARU TERTEKAN', { fs: 28, c: K.coral, anchor: 'r' })}</g>`; }
  }
  s += strip(sg, k, 1);
  s += EDU(1);
  return s;
}
// ---------------------------------------------------------------- G: ilustrasi tekanan pada paru (32,4-38,6 dtk)
function sceneG(t) {
  const a = win(t, C.sc.G[0], C.sc.G[1], 0.4), ox = 90, oy = 400;
  const lev = lerp(628, 438, sm(clamp((t - C.G.naik[0]) / (C.G.naik[1] - C.G.naik[0]))));
  const comp = sm(clamp((t - C.G.tertekan[0]) / (C.G.tertekan[1] - C.G.tertekan[0])));
  const breath = 1 + (0.030 - 0.018 * comp) * Math.sin(t * 2 * Math.PI * 14 / 60 * 2);
  const top = 205, bot0 = 648, bottom = Math.min(bot0, lev - 10), sy = (bottom - top) / (bot0 - top) * breath, sx = (1 - 0.13 * comp) * (1 + 0.012 * Math.sin(t * 2 * Math.PI * 14 / 60 * 2));
  const cav = 'M120 150 L120 650 A330 62 0 0 0 780 650 L780 150 A330 62 0 0 0 120 150 Z';
  let g = `<defs><clipPath id="cav"><path d="${cav}"/></clipPath>
  <linearGradient id="glass" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7FE0D0" stop-opacity=".30"/><stop offset=".5" stop-color="#7FE0D0" stop-opacity=".07"/><stop offset="1" stop-color="#7FE0D0" stop-opacity=".26"/></linearGradient>
  <radialGradient id="lungG3" cx=".38" cy=".3" r=".9"><stop offset="0" stop-color="#FFC9C4"/><stop offset=".55" stop-color="#EE9A9C"/><stop offset="1" stop-color="#B85A6C"/></radialGradient>
  <linearGradient id="fl3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7FD6FF" stop-opacity=".80"/><stop offset="1" stop-color="#2878D0" stop-opacity=".92"/></linearGradient>
  <clipPath id="lungClip"><rect x="0" y="0" width="900" height="${f1(lev + 4)}"/></clipPath></defs>`;
  g += `<g clip-path="url(#cav)"><rect x="120" y="60" width="660" height="660" fill="#0C2A30"/></g>`;           // dinding belakang rongga
  // paru: dua lobus (bentuk sederhana) yang menyusut mengikuti tinggi cairan
  g += `<g clip-path="url(#lungClip)"><g transform="translate(450 ${top}) scale(${f1(sx * 1000) / 1000} ${f1(sy * 1000) / 1000}) translate(-450 ${-top})">
    <ellipse cx="450" cy="${top + 165}" rx="185" ry="160" fill="url(#lungG3)"/><ellipse cx="450" cy="${top + 290}" rx="205" ry="170" fill="url(#lungG3)"/>
    <path d="M300 ${top + 235} Q450 ${top + 285} 600 ${top + 215}" fill="none" stroke="rgba(150,50,80,.45)" stroke-width="5" stroke-linecap="round"/>
    <path d="M450 ${top - 10} L450 ${top + 120} M450 ${top + 70} L395 ${top + 130} M450 ${top + 70} L505 ${top + 130}" stroke="#F1D3D0" stroke-width="9" stroke-linecap="round" fill="none"/>
    <ellipse cx="450" cy="${top + 340}" rx="205" ry="165" fill="rgba(110,35,80,${f1(0.42 * comp)})"/></g></g>`;
  // cairan (volume + permukaan)
  g += `<g clip-path="url(#cav)"><rect x="120" y="${f1(lev)}" width="660" height="${f1(720 - lev)}" fill="url(#fl3)"/><ellipse cx="450" cy="${f1(lev)}" rx="330" ry="62" fill="rgba(160,226,255,.58)" stroke="rgba(255,255,255,.65)" stroke-width="3"/>${[0, 1, 2].map((i) => `<ellipse cx="450" cy="${f1(lev)}" rx="${f1(120 + i * 70 + 10 * Math.sin(t * 3 + i))}" ry="${f1(18 + i * 12)}" fill="none" stroke="rgba(255,255,255,.28)" stroke-width="2"/>`).join('')}</g>`;
  // kaca/dinding dada depan + tulang rusuk
  g += `<path d="${cav}" fill="url(#glass)" stroke="${K.cyan}" stroke-opacity=".6" stroke-width="3"/>`;
  g += [250, 330, 410, 490, 570].map((y) => `<path d="M122 ${y} Q450 ${y + 130} 778 ${y}" fill="none" stroke="rgba(235,221,190,.55)" stroke-width="10" stroke-linecap="round"/>`).join('');
  // label
  const lab = (t0, x, y, tx, ty, txt, c, anc = 'l') => { const al = clamp((t - t0) / 0.35); return al <= 0.01 ? '' : `<g opacity="${f1(al)}"><line x1="${x}" y1="${y}" x2="${tx}" y2="${ty}" stroke="${c}" stroke-width="3"/><circle cx="${x}" cy="${y}" r="7" fill="${c}"/>${pill(tx, ty + 12, txt, { fs: 28, c, anchor: anc })}</g>`; };
  let L = lab(C.G.naik[0] + 0.3, 330, lev + 70, 20, 790, 'CAIRAN', '#7FD3FF');
  L += lab(C.G.tertekan[0] + 0.15, 520, Math.max(top + 260, lev - 80), 600, 120, 'PARU TERTEKAN', '#FF9AB4');
  const cap = (t0, t1, txt) => pill(540, 1320, txt, { fs: 34, c: K.cyan, a: win(t, t0, t1, 0.4), px: 50 });
  const s = `<g opacity="${f1(a)}">${T(540, 330, 'ILUSTRASI 3D: CAIRAN MENEKAN PARU', K.mute, 24, 700)}<g transform="translate(${ox} ${oy})">${g}${L}</g>${cap(33.0, 37.5, 'cairan banyak: paru bisa tertekan')}${cap(37.6, 38.6, 'dapat terasa sesak')}</g>`;
  return s + ILU(a);
}
// ---------------------------------------------------------------- H: web yang dapat dikenali (38,6-49,4 dtk)
function sceneH(t) {
  const sg = 'H', k = kOf(sg, t); let s = '';
  const MON = { x: 900, y: 100, w: 696, h: 640 };
  const HB = { x: 640, y: 50, w: 960, h: 889 };                                   // pad probe + monitor USG|CT (web dikenali)
  const push = sm(clamp((t - 42.7) / 1.4)) * (1 - sm(clamp((t - 46.2) / 1.2)));
  const mon = { x: MON.x, y: MON.y - 20, w: MON.w, h: MON.w * 1000 / 1080 };
  const src = lerpR(HB, mon, push);
  const dst = { x: 0, y: DCY - DH / 2, w: 1080, h: DH };
  const hl = win(t, 41.0, 47.8, 0.5);
  const cr = crop('cMain', furl(sg, k), src, dst, { stroke: false, inner: (map) => hl > 0.01 ? `<rect x="${f1(map.X(MON.x + 6))}" y="${f1(map.Y(MON.y + 2))}" width="${f1((MON.w - 14) * map.sc)}" height="${f1((MON.h - 6) * map.sc)}" rx="${f1(14 * map.sc)}" fill="none" stroke="${K.cyan}" stroke-width="${f1(5 * hl)}" opacity="${f1(0.9 * hl)}" stroke-dasharray="${f1(26 * map.sc)} ${f1(16 * map.sc)}"/>` : '' });
  s += cr.svg;
  const cap = (t0, t1, txt, y = 1392) => pill(540, y, txt, { fs: 34, c: K.cyan, a: win(t, t0, t1, 0.4), px: 50 });
  s += cap(39.1, 42.4, 'Gambar saja belum menjawab penyebabnya', 1360);
  s += cap(43.3, 46.3, 'mengenali pola · memahami letak', 1360);
  s += EDU(1 - win(t, 46.4, 49.0, 0.35)) + (win(t, 46.4, 49.0, 0.35) > 0.01 ? pill(540, 1360, 'Simulasi edukatif, bukan alat diagnosis', { fs: 36, c: K.gold, a: win(t, 46.4, 49.1, 0.35), sw: 4 }) : '');
  return s;
}
// ---------------------------------------------------------------- I: penutup (49,4-52,9 dtk)
function sceneI(t) {
  const u = t - 49.4, al = clamp(u / 0.5);
  const k = kOf('H', 49.4);
  let s = `<g filter="none">${crop('cBg', furl('H', k), FULL, { x: -300, y: 560, w: 1680, h: 997 }, { stroke: false }).svg}</g><rect width="1080" height="1920" fill="rgba(5,20,26,${f1(0.5 + 0.38 * al)})"/>`;
  const web = clamp((u - 0.0) / 0.5), lg = sm(clamp((u - 0.25) / 0.5)), cta = sm(clamp((u - 1.0) / 0.6));
  s += `<g opacity="${f1(web)}">${crop('cWeb', furl('H', k), FULL, { x: 90, y: 330, w: 900, h: 534 }, { r: 26, bw: 4, border: 'rgba(124,224,184,.55)' }).svg}</g>`;
  s += `<g opacity="${f1(lg)}" transform="translate(0 ${f1((1 - lg) * 24)})">${R(190, 930, 700, 170, 'rgba(248,247,243,.97)', 36)}<image href="../stage/logo-full.webp" x="290" y="946" width="500" height="138" preserveAspectRatio="xMidYMid meet"/></g>`;
  s += `<g opacity="${f1(lg)}">${T(540, 1160, 'Anatomy Live 4D Lab', K.text, 44, 800)}</g>`;
  s += `<g opacity="${f1(cta)}" transform="translate(0 ${f1((1 - cta) * 30)})">${R(110, 1196, 860, 150, K.gold, 75)}${T(540, 1255, 'Jelajahi Live 4D Lab gratis', K.ink, 44, 800)}${T(540, 1313, 'di medcoel.com', K.ink, 48, 800)}</g>`;
  s += EDU(clamp((u - 0.8) / 0.4));
  need('../stage/logo-full.webp');
  return s;
}
// ---------------------------------------------------------------- rakit
const SCENES = [[0, C.sc.A[1], sceneA], [C.sc.BC[0], C.sc.BC[1], sceneBC], [C.sc.D[0], C.sc.D[1], sceneD], [C.sc.EF[0], C.sc.EF[1], sceneEF], [C.sc.G[0], C.sc.G[1], sceneG], [C.sc.H[0], C.sc.H[1], sceneH], [C.sc.I[0], DUR + 0.5, sceneI]];
function compose(t) {
  NEED = []; let s = defs() + bg();
  const XF = 0.25;
  for (const [a, b, fn] of SCENES) if (t >= a - 1e-6 && t < b) {
    const prev = a === C.sc.BC[0] ? sceneA : a === C.sc.I[0] ? sceneH : null;       // penyilangan halus antar adegan penuh (A -> BC, H -> I)
    if (prev && t - a < XF) s += prev(t) + `<g opacity="${f1(clamp((t - a) / XF))}">${fn(t)}</g>`; else s += fn(t);
  }
  for (const e of [C.sc.EF[0], C.sc.H[0]]) { const d = t - e; if (d >= 0 && d < 0.25) s += `<rect width="1080" height="1920" fill="${K.bg0}" opacity="${f1(1 - d / 0.25)}"/>`; }
  return s;
}
window.renderFrame = async (t) => {
  const s = compose(t); await Promise.all(NEED.map(load));
  $('scene').innerHTML = s;
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
};
window.__ready = true;

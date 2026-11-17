// "KANTONG GELAP BESAR DI PANGGUL INI APA?" (1080 x 1920, 30 fps, ±41 dtk): scan USG + CT sintetis skenario "Kandung kemih penuh (retensi urin)" di Live 4D Lab MEDCOEL (rekaman produk asli, klip 01 dan 02)
// + ilustrasi mekanisme berkemih/retensi (SVG skematik, anim.js). Penanda kandung kemih = segmentasi PIKSEL (tools/mask_kandung_kemih.py), bukan gambar organ baru.
// Voice-over pemesan disusun per kalimat (tools/susun_linimasa.py) -> cues.json. Tidak ada suara jantung/organ: hanya musik lembut dan klik kecil.
import { f1, clamp, lerp, sm } from './core.js';
import { bladder, normalState, mechState, dims } from './anim.js';
const $ = (id) => document.getElementById(id);
const C = await (await fetch('../cues.json')).json();
await document.fonts.load('800 40px "Plus Jakarta Sans"'); await document.fonts.load('700 30px "Plus Jakarta Sans"'); await document.fonts.load('600 30px "Plus Jakarta Sans"'); await document.fonts.ready;
export const DUR = C.dur;
const FONT = "'Plus Jakarta Sans', system-ui, sans-serif";
const K = { bg0: '#031D18', bg1: '#0A4A3E', mint: '#7CE0B8', gold: '#F8C038', white: '#FFFFFF', ink: '#05231D', mute: '#A8D3C6', coral: '#FF8A7A', urine: '#F6D860' };
const win = (t, a, b, f = 0.25) => clamp((t - a) / f) * clamp((b - t) / f);
const R = (x, y, w, h, f, rx = 0, e = '') => `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" rx="${rx}" fill="${f}" ${e}/>`;
const T = (x, y, txt, f, size, w = 800, anchor = 'middle', e = '') => `<text x="${f1(x)}" y="${f1(y)}" font-family="${FONT}" font-weight="${w}" font-size="${size}" fill="${f}" text-anchor="${anchor}" ${e}>${txt}</text>`;
const tw = (txt, fs, w = 700) => txt.length * fs * (w >= 800 ? 0.62 : 0.57);
function pill(x, y, txt, o = {}) {
  const fs = o.fs ?? 32, w = tw(txt, fs, o.w ?? 800) + (o.px ?? 44), h = fs + 30, a = o.a ?? 1; if (a <= 0.01) return '';
  const x0 = o.anchor === 'l' ? x : o.anchor === 'r' ? x - w : x - w / 2;
  return `<g opacity="${f1(a)}">${R(x0, y - fs - 8, w, h, o.bg ?? 'rgba(3,29,24,.92)', h / 2, `stroke="${o.c ?? K.mint}" stroke-width="${o.sw ?? 3}"`)}${T(x0 + w / 2, y + 4, txt, o.fg ?? K.white, fs, o.w ?? 800)}</g>`;
}
const stroke = 'stroke="rgba(3,29,24,.65)" stroke-width="9" paint-order="stroke" stroke-linejoin="round"';
function lines(arr, a, y, fs, hi = [], gap = 14, c2 = K.mint) {
  if (a <= 0.01) return '';
  return `<g opacity="${f1(a)}" transform="translate(0 ${f1((1 - a) * 16)})">${arr.map((l, i) => T(540, y + i * (fs + gap), l, hi.includes(i) ? c2 : K.white, fs, 800, 'middle', stroke)).join('')}</g>`;
}
// label wajib selama citra tampil (dua baris agar terbaca di ponsel)
const DISC = (a = 1) => `<g opacity="${f1(a)}">${R(60, 1340, 960, 96, 'rgba(3,29,24,.92)', 48, 'stroke="rgba(124,224,184,.8)" stroke-width="3"')}${T(540, 1380, 'Simulasi edukatif • USG/CT sintetis •', K.white, 30, 700)}${T(540, 1418, 'bukan alat diagnosis', K.gold, 32, 800)}</g>`;
const ILU = (x, y, a = 1, anchor = 'm') => pill(x, y, 'Ilustrasi mekanisme', { fs: 28, c: K.gold, w: 800, a, sw: 3, px: 48, anchor });
// ------------------------------------------------------------------ bingkai sumber
let NEED = [];
const need = (u) => { NEED.push(u); return u; };
const cache = new Map();
const load = (u) => { if (!cache.has(u)) { const im = new Image(); im.src = u; cache.set(u, im.decode().catch(() => {})); } return cache.get(u); };
const NF = { '01': 210, '02': 360 };
const fr = (clip, ts) => `../rekam/frames/${clip}/f${String(Math.max(1, Math.min(NF[clip], Math.round(ts * 30) + 1))).padStart(4, '0')}.jpg`;
const pp = (u, a, b) => { const L = b - a, m = ((u % (2 * L)) + 2 * L) % (2 * L); return a + (m < L ? m : 2 * L - m); };   // bolak-balik agar tidak melompat
const scan01 = (t) => pp(t, 2.0, 6.9);                                              // klip 01: skenario retensi urin (sejak ±1,6 dtk setelah skenario dipilih)
const scanScen = (t) => pp(t, 0.4, 7.6);                                            // klip 02: skenario (sebelum klik Bandingkan di 7,77; citra normal tampil 8,6)
const scanNorm = (t) => pp(t, 9.0, 11.9);                                           // klip 02: tampilan normal
const MK = `<filter id="mkG" x="-4%" y="-4%" width="108%" height="108%" color-interpolation-filters="sRGB"><feGaussianBlur in="SourceAlpha" stdDeviation="2.4" result="b"/><feComponentTransfer in="b" result="s"><feFuncA type="linear" slope="18" intercept="-8"/></feComponentTransfer><feMorphology in="s" operator="erode" radius="2" result="e"/><feComposite in="s" in2="e" operator="out" result="edge"/><feFlood flood-color="#F8C038" flood-opacity=".96" result="fc"/><feComposite in="fc" in2="edge" operator="in" result="ring"/><feFlood flood-color="#F8C038" flood-opacity=".10" result="ff"/><feComposite in="ff" in2="s" operator="in" result="fill"/><feMerge><feMergeNode in="fill"/><feMergeNode in="ring"/></feMerge></filter>`;
const bg = (t) => `<defs><linearGradient id="bgG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${K.bg0}"/><stop offset="1" stop-color="${K.bg1}"/></linearGradient><radialGradient id="glow" cx=".5" cy=".5" r=".6"><stop offset="0" stop-color="#0F7A66" stop-opacity=".35"/><stop offset="1" stop-color="#0F7A66" stop-opacity="0"/></radialGradient>${MK}</defs><rect width="1080" height="1920" fill="url(#bgG)"/><ellipse cx="${f1(540 + 40 * Math.sin(t * 0.4))}" cy="900" rx="720" ry="680" fill="url(#glow)"/>`;
/** kartu rekaman: bingkai sumber 1920x1080 dengan kamera (cx, cy sumber; z zoom) dipotong ke dst; mk = opasitas penanda; ms = 'scen' | 'norm' (himpunan penanda) */
function card(id, clip, ts, dst, cam, o = {}) {
  const z = cam.z, ix = dst.x + dst.w / 2 - cam.cx * z, iy = dst.y + dst.h / 2 - cam.cy * z, rad = o.r ?? 26;
  const X = (x) => dst.x + dst.w / 2 + (x - cam.cx) * z, Y = (y) => dst.y + dst.h / 2 + (y - cam.cy) * z, m = { X, Y, z };
  let s = `<clipPath id="${id}"><rect x="${f1(dst.x)}" y="${f1(dst.y)}" width="${f1(dst.w)}" height="${f1(dst.h)}" rx="${rad}"/></clipPath><g clip-path="url(#${id})"><rect x="${f1(dst.x)}" y="${f1(dst.y)}" width="${f1(dst.w)}" height="${f1(dst.h)}" fill="#04090c"/>`;
  s += `<image href="${need(fr(clip, ts))}" x="${f1(ix)}" y="${f1(iy)}" width="${f1(1920 * z)}" height="${f1(1080 * z)}" preserveAspectRatio="none"/>`;
  if ((o.mk ?? 0) > 0.01) for (const n of ['ct', 'usg']) s += `<image href="${need(`../data/mask_${o.ms ?? 'scen'}_${n}.png`)}" x="${f1(X(1075))}" y="${f1(Y(290))}" width="${f1(845 * z)}" height="${f1(310 * z)}" preserveAspectRatio="none" filter="url(#mkG)" opacity="${f1(o.mk)}"/>`;
  if (o.inner) s += o.inner(m);
  return s + `</g>` + (o.border === false ? '' : `<rect x="${f1(dst.x)}" y="${f1(dst.y)}" width="${f1(dst.w)}" height="${f1(dst.h)}" rx="${rad}" fill="none" stroke="${o.bc ?? 'rgba(124,224,184,.55)'}" stroke-width="3"/>`);
}
/** sepotong antarmuka asli (bar atas: nama MEDCOEL dan nama skenario) */
function header(id, clip, ts, y, a) {
  const A = { x: 40, y: 3, w: 350, h: 40 }, B = { x: 1262, y: 3, w: 396, h: 40 }, k = 1.28, wa = A.w * k, wb = B.w * k, x0 = 540 - (wa + wb + 18) / 2, h = A.h * k;
  const one = (nm, S, x) => `<clipPath id="${id}${nm}"><rect x="${f1(x)}" y="${y}" width="${f1(S.w * k)}" height="${f1(h)}" rx="14"/></clipPath><g clip-path="url(#${id}${nm})"><image href="${need(fr(clip, ts))}" x="${f1(x - S.x * k)}" y="${f1(y - S.y * k)}" width="${f1(1920 * k)}" height="${f1(1080 * k)}" preserveAspectRatio="none"/></g>`;
  return `<g opacity="${f1(a)}">${one('A', A, x0)}${one('B', B, x0 + wa + 18)}</g>`;
}
// ------------------------------------------------------------------ jadwal (dari cues.json)
const V = Object.fromEntries(C.vo.map((v) => [v.id, v.t])), KK = C.k;
const SH = { hook: [0, 3.9], s2: [3.9, 7.7], s3: [7.7, 11.8], a1: [11.8, 19.8], a2: [19.8, 26.4], cmp1: [26.4, 28.9], cmp2: [28.9, V.s10[0] - 0.06], disc: [V.s10[0] - 0.06, V.s11[0] - 0.06], cta: [V.s11[0] - 0.06, C.dur + 1] };
const SHOT = (t, k) => { const [a, b] = SH[k]; return t >= a && t < b + 0.2 ? clamp((t - a) / 0.2) : 0; };
const WIDE = { cx: 1502.5, cy: 448.5, z: 1.198 }, USGZ = { cx: 1340, cy: 470, z: 1.9 }, CTZ = { cx: 1650, cy: 470, z: 1.9 };
const camMix = (a, b, u) => ({ cx: lerp(a.cx, b.cx, u), cy: lerp(a.cy, b.cy, u), z: lerp(a.z, b.z, u) });
const BIG = { x: 40, y: 684, w: 1000, h: 600 }, TOP = { x: 40, y: 300, w: 1000, h: 400 };
// ------------------------------------------------------------------ pembuka (scan asli + penanda), zoom USG -> CT -> lebar
function scanOpen(t, a) {
  const ts = scan01(t), u1 = sm((t - 1.9) / 0.7), u2 = sm((t - 3.95) / 0.7), u3 = sm((t - 7.55) / 0.6);
  const cam = camMix(camMix(camMix(WIDE, USGZ, u1), CTZ, u2), WIDE, u3);
  const mk = sm((t - (KK.gelap - 0.1)) / 0.5);
  const hl = 1 - sm((t - 1.8) / 0.35), ans = sm((t - 1.7) / 0.35), c1 = win(t, 2.05, 3.9, 0.3), c2 = win(t, 4.1, 7.6, 0.3), c3 = sm((t - 7.8) / 0.35) * (t < SH.s3[1] + 0.1 ? 1 : 0);
  let s = `<g opacity="${f1(a)}">`;
  s += lines(['KANTONG GELAP BESAR', 'DI PANGGUL', 'INI APA?'], hl, 410, 76, [2]);
  s += lines(['KANTONG GELAP DI USG', 'ANECHOIC = TANPA GEMA'], c1, 430, 58, [0]);
  s += lines(['KANDUNG KEMIH', 'YANG TERISI'], c2, 430, 74, [1]);
  s += lines(['KANDUNG KEMIH PENUH', '≠ OTOMATIS RETENSI'], c3, 420, 62, [1], 14, K.gold);
  s += pill(540, 312, 'KANDUNG KEMIH PADA SKENARIO RETENSI URIN', { fs: 32, c: K.gold, bg: 'rgba(248,192,56,.96)', fg: K.ink, w: 800, a: ans, sw: 0, px: 56 });
  s += header('hd', '01', ts, 620, 1) + card('cO', '01', ts, BIG, cam, { mk });
  const lb = (txt, a0) => (a0 > 0.01 ? pill(540, 1262, txt, { fs: 30, c: K.gold, w: 700, a: a0 * sm((t - 2.6) / 0.4), px: 40 }) : '');
  s += lb('Penanda emas: kandung kemih pada citra asli', c1) + lb('CT sintetis: lumen kandung kemih (abu-abu seragam)', c2);
  return s + DISC(1) + `</g>`;
}
// ------------------------------------------------------------------ animasi A1 (layar penuh): proses normal
const PX = (s, cx, cy) => (lx, ly) => [cx + (lx - 250) * s, cy + (ly - 300) * s];
const leader = (x0, y0, x1, y1, txt, c, a, anchor = 'middle', fs = 29) => (a <= 0.01 ? '' : `<g opacity="${f1(a)}"><path d="M${f1(x0)} ${f1(y0)}L${f1(x1)} ${f1(y1)}" stroke="${c}" stroke-width="4" stroke-linecap="round"/><circle cx="${f1(x0)}" cy="${f1(y0)}" r="8" fill="${c}"/>${T(x1, y1 + (y1 > y0 ? 34 : -12), txt, K.white, fs, 800, anchor, stroke)}</g>`);
function shotA1(t, a) {
  const s = 1.5, cx = 540, cy = 790, P = PX(s, cx, cy), st = normalState(t, KK), d = dims(st.fill, st.c);
  let q = `<g opacity="${f1(a)}">` + R(40, 290, 1000, 1010, 'rgba(3,29,24,.55)', 40, 'stroke="rgba(124,224,184,.35)" stroke-width="3"') + `<g transform="translate(${cx} ${cy}) scale(${s}) translate(-250 -300)">${bladder(t, st)}</g>`;
  // label
  const [bx, by] = P(255, 230), [wx, wy] = P(255 - (d.R + d.th * 0.5) * 0.96 * 0.72, 230 - (d.R + d.th * 0.5) * 0.72), [ux, uy] = P(255, 462), [px, py] = P(70, 330);
  q += `<g opacity="${f1(win(t, 12.1, KK.otot - 0.3, 0.35))}">${T(bx, by + 14, 'URIN', K.ink, 44, 800, 'middle')}</g>`;
  q += leader(wx, wy, 110, wy - 130, 'OTOT KANDUNG KEMIH', '#E58A92', win(t, KK.otot - 0.2, 19.6, 0.35), 'start', 28);
  q += leader(ux + 14, uy, ux + 150, uy + 10, 'JALAN KELUAR', '#F6D4C8', win(t, KK.jalan - 0.3, 19.7, 0.35), 'start', 28);
  q += leader(px - 14, py - 40, 120, py - 160, 'TULANG PANGGUL', '#EADBC0', win(t, 12.2, KK.menyimpan + 0.9, 0.35), 'start', 26);
  const cap = (txt, a0, b0, c = K.mint) => pill(540, 1262, txt, { fs: 32, c, a: win(t, a0, b0, 0.3), px: 50 });
  q += cap('Sebelum berkemih: kandung kemih menyimpan urin', 11.9, KK.otot - 0.2) + cap('Otot kandung kemih berkontraksi', KK.otot - 0.1, KK.jalan - 0.2, '#FF8A7A') + cap('Jalan keluar membuka, urin keluar', KK.jalan - 0.1, 19.85, K.gold);
  return q + ILU(540, 1368, 1) + `</g>`;
}
// ------------------------------------------------------------------ A2 (layar terbagi): dua kemungkinan mekanisme retensi, scan tetap di atas
function shotA2(t, a) {
  const ts = scanScen(t + 1), s = 0.82, cyy = 1055, panels = [['A', 300, 'A. ALIRAN KELUAR TERHAMBAT'], ['B', 780, 'B. KONTRAKSI KURANG KUAT']];
  let q = `<g opacity="${f1(a)}">` + card('cA2', '02', ts, TOP, WIDE, { mk: 1 });
  q += pill(540, 668, t >= KK.tertahan ? 'Penyebab di skenario ini tidak ditentukan model web' : 'Scan: penanda kandung kemih', { fs: 26, c: K.gold, w: 700, px: 36 });
  q += R(40, 722, 1000, 596, 'rgba(3,29,24,.55)', 36, 'stroke="rgba(124,224,184,.35)" stroke-width="3"') + ILU(540, 760, 1);
  for (const [w, x, lab] of panels) {
    const st = mechState(t, KK, w), hl = w === 'A' ? win(t, KK.terhambat - 0.3, KK.kontraksi + 0.2, 0.3) : win(t, KK.kontraksi - 0.2, KK.tertahan, 0.3);
    q += `<g transform="translate(${x} ${cyy}) scale(${s}) translate(-250 -300)">${bladder(t, st)}</g>`;
    q += pill(x, 836, lab, { fs: 23, c: hl > 0.05 ? K.gold : 'rgba(124,224,184,.5)', w: 800, px: 36, a: 1 });
    if (w === 'A' && st.obst > 0.3) { const [ox, oy] = PX(s, x, cyy)(250 + 70, 230 + dims(st.fill, st.c).R + 92); q += `<g opacity="${f1(st.obst)}">${T(ox + 14, oy + 6, 'TERHAMBAT', K.white, 22, 800, 'start', stroke)}</g>`; }
  }
  const cap = (txt, a0, b0, c = K.mint) => pill(540, 1300, txt, { fs: 28, c, a: win(t, a0, b0, 0.3), px: 44 });
  q += cap('Dua kemungkinan mekanisme retensi', SH.a2[0] + 0.1, KK.terhambat - 0.2) + cap('A: otot berkontraksi, tetapi jalan keluar menyempit', KK.terhambat - 0.2, KK.kontraksi - 0.1, K.gold) + cap('B: jalan keluar terbuka, tetapi kontraksi otot lemah', KK.kontraksi - 0.1, KK.tertahan - 0.1, '#FF8A7A') + cap('Urin tertahan, kandung kemih meregang', KK.tertahan - 0.1, SH.a2[1] + 0.3, K.mint);
  return q + DISC(1) + `</g>`;
}
// ------------------------------------------------------------------ perbandingan: tombol di drawer Patologi (klik asli 7,77 dtk klip 02) lalu normal vs skenario
function shotCmp1(t, a) {
  const srcT = 7.77 + (t - KK.bandingkan), ts = Math.min(srcT, 11.8), flipped = ts >= 8.6;
  let s = `<g opacity="${f1(a)}">` + card('cC', '02', ts, TOP, WIDE, { mk: 1, ms: flipped ? 'norm' : 'scen' });
  s += pill(540, 668, flipped ? 'NORMAL' : 'SKENARIO RETENSI', { fs: 30, c: flipped ? K.mint : K.gold, px: 56 });
  const src = { x: 0, y: 600, w: 340, h: 250 }, dst = { x: 175, y: 730, w: 730, h: 730 * 250 / 340 }, zz = dst.w / src.w;
  const ringB = (m) => `<rect x="${f1(m.X(10))}" y="${f1(m.Y(602))}" width="${f1(204 * m.z)}" height="${f1(48 * m.z)}" rx="${f1(14 * m.z)}" fill="none" stroke="${K.gold}" stroke-width="6" opacity="${f1(win(t, KK.bandingkan - 0.9, KK.bandingkan + 0.9, 0.2))}"/><rect x="${f1(m.X(8))}" y="${f1(m.Y(799))}" width="${f1(320 * m.z)}" height="${f1(28 * m.z)}" rx="${f1(8 * m.z)}" fill="none" stroke="${K.gold}" stroke-width="5" opacity="${f1(sm((t - (KK.bandingkan + 0.6)) / 0.4))}"/>`;
  s += card('cD', '02', ts, dst, { cx: 170, cy: 725, z: zz }, { mk: 0, inner: ringB });
  s += pill(540, 1316, 'Tombol Bandingkan dengan normal di aplikasi', { fs: 26, c: K.mint, w: 700, px: 36 });
  return s + DISC(1) + `</g>`;
}
function shotCmp2(t, a) {
  const cam = { cx: 1497.5, cy: 443, z: 1.183 }, A = { x: 40, y: 330, w: 1000, h: 350 }, B = { x: 40, y: 704, w: 1000, h: 350 };
  const tsS = scanScen(t), tsN = scanNorm(t);
  let s = `<g opacity="${f1(a)}">` + card('cS', '02', tsS, A, cam, { mk: 1, ms: 'scen' }) + card('cN', '02', tsN, B, cam, { mk: 1, ms: 'norm' });
  s += pill(80, 372, 'SKENARIO RETENSI', { fs: 28, c: K.gold, px: 40, anchor: 'l', bg: 'rgba(3,29,24,.92)' }) + pill(80, 746, 'NORMAL', { fs: 28, c: K.mint, px: 40, anchor: 'l' });
  // teks utama sesuai narasi
  const t9 = sm((t - (V.s9[0] - 0.1)) / 0.35), k1 = 1 - t9;
  s += lines(['Kandung kemih normal', 'vs skenario'], win(t, SH.cmp2[0] + 0.1, V.s9[0] - 0.1, 0.3), 1128, 52, [1]);
  s += lines(['KANDUNG KEMIH PENUH', '≠ OTOMATIS RETENSI'], t9, 1118, 60, [1], 14, K.gold);
  s += pill(540, 1262, t >= KK.satuGambar - 0.2 ? 'Retensi tidak ditentukan dari satu gambar saja' : 'Teks aplikasi: lumen skenario membesar ±30 mm ke segala arah', { fs: 28, c: K.mint, w: 700, px: 44, a: sm((t - (SH.cmp2[0] + 0.5)) / 0.4) });
  return s + DISC(1) + `</g>`;
}
function shotDisc(t, a) {
  let s = `<g opacity="${f1(a)}">` + card('cDS', '02', scanScen(t), { x: 40, y: 330, w: 1000, h: 560 }, WIDE, { mk: 0 }) + R(40, 330, 1000, 560, 'rgba(3,29,24,.6)', 26);
  s += lines(['SIMULASI EDUKATIF', 'USG/CT SINTETIS', 'BUKAN ALAT DIAGNOSIS'], sm((t - (V.s10[0] - 0.1)) / 0.3), 1010, 56, [2]);
  return s + DISC(1) + `</g>`;
}
function shotCta(t, a) {
  const c2 = clamp((t - (V.s11[0] + 0.4)) / 0.4), dst = { x: 40, y: 520, w: 1000, h: 562 };
  let s = `<g opacity="${f1(a)}">` + R(190, 290, 700, 120, 'rgba(248,247,243,.97)', 36) + `<image href="${need('../stage/logo-full.webp')}" x="290" y="300" width="500" height="100" preserveAspectRatio="xMidYMid meet"/>`;
  s += card('cT', '02', 0.4 + pp((t - V.s11[0]) * 0.5, 0, 1.6), dst, { cx: 960, cy: 540, z: 1000 / 1920 }, { mk: 0 });
  s += `<g opacity="${f1(sm(c2))}" transform="translate(0 ${f1((1 - sm(c2)) * 22)})">${R(70, 1130, 940, 170, K.gold, 80)}${T(540, 1196, 'Eksplorasi gratis', K.ink, 48, 800)}${T(540, 1264, 'di medcoel.com', K.ink, 62, 800)}</g>`;
  return s + DISC(1) + `</g>`;
}
function compose(t) {
  NEED = []; let s = bg(t);
  if (t < SH.a1[0] + 0.2) s += scanOpen(t, 1);
  for (const [k, f] of [['a1', shotA1], ['a2', shotA2], ['cmp1', shotCmp1], ['cmp2', shotCmp2], ['disc', shotDisc], ['cta', shotCta]]) { const a = SHOT(t, k); if (a > 0.001) s += f(t, a); }
  return s;
}
window.renderFrame = async (t) => {
  const s = compose(Math.min(t, C.dur - 1e-3)); await Promise.all(NEED.map(load));
  $('scene').innerHTML = s;
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
};
window.__ready = true;

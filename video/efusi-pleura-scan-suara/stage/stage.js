// "RUANG GELAP DI ATAS DIAFRAGMA KANAN?" (1080 x 1920, 30 fps, ±45 dtk): scan USG + CT sintetis efusi pleura kanan di Live 4D Lab MEDCOEL (rekaman produk asli) + ilustrasi mekanisme (SVG skematik, anim.js).
// Sumber produk: klip 02 (skenario efusi, tombol Bandingkan dengan normal) dan klip 01 (saat skenario dipilih). Penanda cairan = selisih piksel normal-vs-skenario (tools/mask_dari_selisih.py), BUKAN gambar baru di atas citra.
// Voice-over pemesan disusun ulang per kalimat (tools/susun_linimasa.py) -> cues.json; bunyi napas simulasi dari 04/05 diputar di audio, grafik amplitudo dihitung dari berkasnya.
import { f1, clamp, lerp, sm } from './core.js';
import { illus, magnifier, MAG, toWorld, CX, CY, ANCH, geom } from './anim.js';
const $ = (id) => document.getElementById(id);
const C = await (await fetch('../cues.json')).json(), ENV = await (await fetch('../data/env.json')).json();
await document.fonts.load('800 40px "Plus Jakarta Sans"'); await document.fonts.load('700 30px "Plus Jakarta Sans"'); await document.fonts.load('600 30px "Plus Jakarta Sans"'); await document.fonts.ready;
export const DUR = C.dur;
const FONT = "'Plus Jakarta Sans', system-ui, sans-serif";
const K = { bg0: '#031D18', bg1: '#0A4A3E', mint: '#7CE0B8', gold: '#F8C038', white: '#FFFFFF', ink: '#05231D', mute: '#A8D3C6', coral: '#FF8A7A', fluid: '#7FCBEA' };
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
function lines(arr, a, y, fs, hi = [], gap = 14) {
  if (a <= 0.01) return '';
  return `<g opacity="${f1(a)}" transform="translate(0 ${f1((1 - a) * 16)})">${arr.map((l, i) => T(540, y + i * (fs + gap), l, hi.includes(i) ? K.mint : K.white, fs, 800, 'middle', stroke)).join('')}</g>`;
}
// label wajib selama citra/bunyi tampil (dua baris agar terbaca di ponsel)
const DISC = (a = 1) => `<g opacity="${f1(a)}">${R(60, 1340, 960, 96, 'rgba(3,29,24,.92)', 48, 'stroke="rgba(124,224,184,.8)" stroke-width="3"')}${T(540, 1380, 'Simulasi edukatif • bukan citra atau suara pasien •', K.white, 29, 700)}${T(540, 1418, 'bukan alat diagnosis', K.gold, 31, 800)}</g>`;
const ILU = (x, y, a = 1, anchor = 'm') => pill(x, y, 'Ilustrasi mekanisme', { fs: 28, c: K.gold, w: 800, a, sw: 3, px: 48, anchor });
// ------------------------------------------------------------------ bingkai sumber
let NEED = [];
const need = (u) => { NEED.push(u); return u; };
const cache = new Map();
const load = (u) => { if (!cache.has(u)) { const im = new Image(); im.src = u; cache.set(u, im.decode().catch(() => {})); } return cache.get(u); };
const NF = { '01': 210, '02': 420 };
const fr = (clip, ts) => `../rekam/frames/${clip}/f${String(Math.max(1, Math.min(NF[clip], Math.round(ts * 30) + 1))).padStart(4, '0')}.jpg`;
const pp = (u, a, b) => { const L = b - a, m = ((u % (2 * L)) + 2 * L) % (2 * L); return a + (m < L ? m : 2 * L - m); };   // bolak-balik agar tidak melompat
const scanPat = (t) => pp(t * 1.0, 2.0, 10.4);                                    // skenario efusi (sebelum klik "Bandingkan dengan normal" 10,93; citra berubah 11,67)
const scanNor = (t) => pp(t * 1.0, 11.9, 13.9);                                   // tampilan normal
const MK = `<filter id="mkG" x="-4%" y="-4%" width="108%" height="108%" color-interpolation-filters="sRGB"><feGaussianBlur in="SourceAlpha" stdDeviation="2.4" result="b"/><feComponentTransfer in="b" result="s"><feFuncA type="linear" slope="18" intercept="-8"/></feComponentTransfer><feMorphology in="s" operator="erode" radius="2" result="e"/><feComposite in="s" in2="e" operator="out" result="edge"/><feFlood flood-color="#F8C038" flood-opacity=".96" result="fc"/><feComposite in="fc" in2="edge" operator="in" result="ring"/><feFlood flood-color="#F8C038" flood-opacity=".10" result="ff"/><feComposite in="ff" in2="s" operator="in" result="fill"/><feMerge><feMergeNode in="fill"/><feMergeNode in="ring"/></feMerge></filter>`;
const bg = (t) => `<defs><linearGradient id="bgG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${K.bg0}"/><stop offset="1" stop-color="${K.bg1}"/></linearGradient><radialGradient id="glow" cx=".5" cy=".5" r=".6"><stop offset="0" stop-color="#0F7A66" stop-opacity=".35"/><stop offset="1" stop-color="#0F7A66" stop-opacity="0"/></radialGradient>${MK}</defs><rect width="1080" height="1920" fill="url(#bgG)"/><ellipse cx="${f1(540 + 40 * Math.sin(t * 0.4))}" cy="900" rx="720" ry="680" fill="url(#glow)"/>`;
/** kartu rekaman: bingkai sumber 1920x1080 dengan kamera (cx, cy sumber; z zoom) dipotong ke dst; mk = opasitas penanda cairan */
function card(id, clip, ts, dst, cam, o = {}) {
  const z = cam.z, ix = dst.x + dst.w / 2 - cam.cx * z, iy = dst.y + dst.h / 2 - cam.cy * z, rad = o.r ?? 26;
  const X = (x) => dst.x + dst.w / 2 + (x - cam.cx) * z, Y = (y) => dst.y + dst.h / 2 + (y - cam.cy) * z, m = { X, Y, z };
  let s = `<clipPath id="${id}"><rect x="${f1(dst.x)}" y="${f1(dst.y)}" width="${f1(dst.w)}" height="${f1(dst.h)}" rx="${rad}"/></clipPath><g clip-path="url(#${id})"><rect x="${f1(dst.x)}" y="${f1(dst.y)}" width="${f1(dst.w)}" height="${f1(dst.h)}" fill="#04090c"/>`;
  s += `<image href="${need(fr(clip, ts))}" x="${f1(ix)}" y="${f1(iy)}" width="${f1(1920 * z)}" height="${f1(1080 * z)}" preserveAspectRatio="none"/>`;
  if ((o.mk ?? 0) > 0.01) for (const n of ['ct', 'usg']) if (!o.only || o.only === n) s += `<image href="${need(`../data/mask_${n}.png`)}" x="${f1(X(1075))}" y="${f1(Y(290))}" width="${f1(845 * z)}" height="${f1(310 * z)}" preserveAspectRatio="none" filter="url(#mkG)" opacity="${f1(o.mk)}"/>`;
  if (o.inner) s += o.inner(m);
  return s + `</g>` + (o.border === false ? '' : `<rect x="${f1(dst.x)}" y="${f1(dst.y)}" width="${f1(dst.w)}" height="${f1(dst.h)}" rx="${rad}" fill="none" stroke="${o.bc ?? 'rgba(124,224,184,.55)'}" stroke-width="3"/>`);
}
/** sepotong antarmuka asli (sedikit bagian bar atas: nama MEDCOEL dan nama skenario) */
function header(id, ts, y, a) {
  const A = { x: 40, y: 3, w: 350, h: 40 }, B = { x: 1262, y: 3, w: 396, h: 40 }, k = 1.28, wa = A.w * k, wb = B.w * k, x0 = 540 - (wa + wb + 18) / 2, h = A.h * k;
  const one = (nm, S, x) => `<clipPath id="${id}${nm}"><rect x="${f1(x)}" y="${y}" width="${f1(S.w * k)}" height="${f1(h)}" rx="14"/></clipPath><g clip-path="url(#${id}${nm})"><image href="${need(fr('02', ts))}" x="${f1(x - S.x * k)}" y="${f1(y - S.y * k)}" width="${f1(1920 * k)}" height="${f1(1080 * k)}" preserveAspectRatio="none"/></g>`;
  return `<g opacity="${f1(a)}">${one('A', A, x0)}${one('B', B, x0 + wa + 18)}</g>`;
}
// ------------------------------------------------------------------ jadwal (dari cues.json)
const V = Object.fromEntries(C.vo.map((v) => [v.id, v.t])), KK = C.k;
const SH = {
  hook: [0, V.s2[0] - 0.05], s2: [V.s2[0] - 0.05, V.s3[0] - 0.05], s3: [V.s3[0] - 0.05, V.s4[0] - 0.25], a1: [V.s4[0] - 0.25, V.s6[0] - 0.05],
  a2: [V.s6[0] - 0.05, V.s9[0] - 0.2], s9: [V.s9[0] - 0.2, V.s10[0] - 0.05], snd: [V.s10[0] - 0.05, V.s11[0] - 0.05], cmp: [V.s11[0] - 0.05, V.s12[0] - 0.05], disc: [V.s12[0] - 0.05, V.s13[0] - 0.05], cta: [V.s13[0] - 0.05, C.dur + 1],
};
const SHOT = (t, k) => { const [a, b] = SH[k]; return t >= a && t < b + 0.2 ? clamp((t - a) / 0.2) : 0; };
const WIDE = { cx: 1502.5, cy: 448.5, z: 1.198 }, USGZ = { cx: 1340, cy: 450, z: 1.9 }, CTZ = { cx: 1650, cy: 452, z: 1.9 };
const camMix = (a, b, u) => ({ cx: lerp(a.cx, b.cx, u), cy: lerp(a.cy, b.cy, u), z: lerp(a.z, b.z, u) });
const BIG = { x: 40, y: 684, w: 1000, h: 600 };                                   // kartu scan besar (pembuka, zoom USG/CT)
const TOP = { x: 40, y: 300, w: 1000, h: 400 };                                   // kartu scan atas pada layar terbagi
// ------------------------------------------------------------------ pembuka + penanda (0 - A1)
function scanOpen(t, a) {                                                         // hook, s2, s3 memakai kartu yang sama; kamera bergerak
  const t2 = V.s2[0], t3 = V.s3[0];
  let cam = WIDE; const u1 = sm((t - (t2 - 0.5)) / 1.0), u2 = sm((t - (t3 - 0.1)) / 0.8);
  cam = camMix(camMix(WIDE, USGZ, u1), CTZ, u2);
  const mk = sm((t - (t2 + 0.7)) / 0.6), ts = scanPat(t);
  const ans = sm((t - 1.7) / 0.35), hl = 1 - sm((t - (t2 - 0.3)) / 0.35);
  let s = `<g opacity="${f1(a)}">`;
  // judul besar (pembuka) -> keterangan sesuai narasi
  s += lines(['RUANG GELAP', 'DI ATAS DIAFRAGMA', 'KANAN?'], hl, 410, 80, [2]);
  const c2 = win(t, t2 + 0.1, t3 - 0.1, 0.3), c3 = win(t, t3 + 0.1, SH.s3[1] + 0.1, 0.3);
  s += lines(['RUANG GELAP DI USG', 'ANECHOIC = TANPA GEMA'], c2, 430, 58, [0]);
  s += lines(['CAIRAN DI', 'RONGGA PLEURA'], c3, 430, 74, [1]);
  s += pill(540, 312, 'SKENARIO: EFUSI PLEURA KANAN', { fs: 38, c: K.gold, bg: 'rgba(248,192,56,.96)', fg: K.ink, w: 800, a: ans, sw: 0, px: 56 });
  s += header('hd', ts, 620, 1) + card('cO', '02', ts, BIG, cam, { mk });
  if (c2 > 0.01 || c3 > 0.01) {                                                   // label pada kartu
    s += pill(540, 1262, c2 > 0.01 ? 'Penanda: area yang berubah dibanding normal' : 'CT sintetis: area abu-abu = cairan simulasi', { fs: 30, c: K.gold, w: 700, a: Math.max(c2, c3) * sm((t - (t2 + 1.0)) / 0.5), px: 40 });
  }
  return s + DISC(1) + `</g>`;
}
// ------------------------------------------------------------------ animasi A1 (layar penuh) dan A2 (terbagi di atas scan)
const label = (txt, x0, y0, x1, y1, c, a, anchor = 'middle', fs = 29) => (a <= 0.01 ? '' : `<g opacity="${f1(a)}"><path d="M${f1(x0)} ${f1(y0)}L${f1(x1)} ${f1(y1)}" stroke="${c}" stroke-width="4" stroke-linecap="round"/><circle cx="${f1(x0)}" cy="${f1(y0)}" r="8" fill="${c}"/>${T(x1, y1 + (y1 > y0 ? 34 : -12), txt, K.white, fs, 800, anchor, stroke)}</g>`);
function shotA1(t, a) {
  const S = SH.a1, sc = 0.86, cx = 540, cy = 868;
  let s = `<g opacity="${f1(a)}">` + R(40, 290, 1000, 1010, 'rgba(3,29,24,.55)', 40, 'stroke="rgba(124,224,184,.35)" stroke-width="3"') + illus(t, KK, { cx, cy, s: sc });
  const W = (p) => { const [x, y] = toWorld(p, 0, sc); return [cx + x, cy + y]; };
  const t0 = V.s4[0], w1 = win(t, t0 + 0.2, KK.antaraParu + 2.2, 0.35);
  const lungP = W(ANCH.paru), wallP = W([CX - 300 - 28, CY - 20]);
  const paA = win(t, t0 + 0.3, V.s4[1] + 1.4, 0.35), da = win(t, KK.antaraParu - 0.3, V.s4[1] + 1.4, 0.35);
  if (paA > 0.01) s += `<g opacity="${f1(paA)}">${T(lungP[0] + 10, lungP[1] + 12, 'PARU', K.white, 50, 800, 'middle', stroke)}</g>`;
  if (da > 0.01) s += `<g opacity="${f1(da)}"><path d="M${f1(wallP[0])} ${f1(wallP[1])}L${f1(wallP[0] - 52)} ${f1(wallP[1] - 50)}" stroke="#E7C9A8" stroke-width="4" stroke-linecap="round"/><circle cx="${f1(wallP[0])}" cy="${f1(wallP[1])}" r="8" fill="#E7C9A8"/>${T(wallP[0] - 56, wallP[1] - 88, 'DINDING', K.white, 27, 800, 'middle', stroke)}${T(wallP[0] - 56, wallP[1] - 58, 'DADA', K.white, 27, 800, 'middle', stroke)}</g>`;
  // kaca pembesar: dua lapis pleura dan sedikit cairan di antaranya
  const mA = win(t, KK.sedikitCairan - 0.5, V.s5[0] + 0.2, 0.4), mx = 850, my = 440, mr = 110, tp = W([CX + 220, CY - 262]);
  if (mA > 0.01) {
    s += `<g opacity="${f1(mA)}"><path d="M${mx - 70} ${my + 85}L${f1(tp[0])} ${f1(tp[1])}" stroke="${K.gold}" stroke-width="4" stroke-linecap="round"/><circle cx="${f1(tp[0])}" cy="${f1(tp[1])}" r="7" fill="${K.gold}"/></g>`;
    s += magnifier(t, KK, mx, my, mr, mA);
    const lab = (txt, ly, stripY, c, a0) => `<g opacity="${f1(mA * a0)}"><path d="M${mx - mr * 0.5} ${my + stripY}L${mx - mr - 18} ${my + ly}" stroke="${c}" stroke-width="3.5"/><circle cx="${mx - mr * 0.5}" cy="${my + stripY}" r="6" fill="${c}"/>${T(mx - mr - 26, my + ly + 9, txt, K.white, 27, 800, 'end', stroke)}</g>`;
    s += lab('PLEURA LUAR', -78, MAG.parietal, '#F6D4C8', win(t, KK.antaraParu - 0.4, V.s5[0], 0.3)) + lab('SEDIKIT CAIRAN', -4, MAG.fluid, K.fluid, win(t, KK.sedikitCairan - 0.3, V.s5[0], 0.3)) + lab('PLEURA DALAM', 70, MAG.visceral, '#F6D4C8', win(t, KK.antaraParu - 0.4, V.s5[0], 0.3));
  }
  // takarir fase
  const cap = (txt, a0, b0, c = K.mint) => pill(540, 1250, txt, { fs: 32, c, a: win(t, a0, b0, 0.3), px: 50 });
  s += cap('NORMAL: sedikit cairan di antara dua lapis pleura', t0 + 0.1, V.s4[1] + 0.2) + cap('Cairan terus terbentuk dan terus diserap', V.s5[0] - 0.1, SH.a1[1] + 0.1, K.gold);
  // label panah
  s += `<g opacity="${f1(win(t, KK.terbentuk - 0.1, V.s5[1] + 0.3, 0.3))}">${T(150, 1040, 'TERBENTUK', K.gold, 28, 800, 'middle', stroke)}</g><g opacity="${f1(win(t, KK.diserap - 0.1, V.s5[1] + 0.3, 0.3))}">${T(930, 1040, 'DISERAP', K.mint, 28, 800, 'middle', stroke)}</g>`;
  s += ILU(540, 1368, 1);
  return s + `</g>`;
}
function shotA2(t, a) {
  const sc = 0.66, cx = 540, cy = 1005, ts = scanPat(t + 3);
  let s = `<g opacity="${f1(a)}">` + header('hd2', ts, 0, 0) + card('cA2', '02', ts, TOP, WIDE, { mk: 1 });
  s += pill(540, 668, 'Scan: penanda cairan', { fs: 26, c: K.gold, w: 700, px: 36, a: 1 });
  s += R(40, 722, 1000, 596, 'rgba(3,29,24,.55)', 36, 'stroke="rgba(124,224,184,.35)" stroke-width="3"') + illus(t, KK, { cx, cy, s: sc });
  const th = (() => { const x = clamp((t - (KK.terlentang - 0.25)) / 1.9); return 90 * sm(x); })();
  const W = (p) => { const [x, y] = toWorld(p, th, sc); return [cx + x, cy + y]; };
  s += ILU(60, 770, 1, 'l');
  const cap = (txt, a0, b0, c = K.mint) => pill(540, 1292, txt, { fs: 30, c, a: win(t, a0, b0, 0.3), px: 46 });
  s += cap('Masuk > diserap: cairan mulai menumpuk', V.s6[0] - 0.1, V.s6[1] + 0.2, K.gold) + cap('Terlentang: cairan mengalir ke belakang dan bawah', V.s7[0] - 0.1, V.s7[1] + 0.2, K.fluid) + cap('Paru di dekatnya sedikit tertekan, tidak kolaps total', V.s8[0] - 0.1, V.s8[1] + 0.35, K.mint);
  // keterangan sumbu setelah diputar: depan-belakang dan arah gravitasi
  const ax = win(t, KK.bebas, V.s8[1] + 0.35, 0.4);
  if (ax > 0.01) {
    s += `<g opacity="${f1(ax)}">${T(962, 905, 'DEPAN', K.white, 26, 800, 'middle', stroke)}${T(962, 1235, 'BELAKANG', K.white, 26, 800, 'middle', stroke)}<path d="M962 925V1190" stroke="${K.gold}" stroke-width="5" stroke-linecap="round"/><path d="M944 1170L962 1198L980 1170" stroke="${K.gold}" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>${T(1004, 1060, 'GRAVITASI', K.gold, 22, 800, 'middle', `transform="rotate(90 1004 1060)" ${stroke}`)}</g>`;
  }
  const lp = win(t, KK.tertekan - 0.4, V.s8[1] + 0.35, 0.35);
  if (lp > 0.01) { const p = W([CX - 120, CY - 60]); s += label('PARU', p[0], p[1], p[0] - 130, p[1] - 90, '#F8DADA', lp, 'middle', 26); }
  const fl = win(t, KK.bawah - 0.4, V.s8[1] + 0.35, 0.35);
  if (fl > 0.01) { const p = W([CX + 262, CY + 20]); s += `<g opacity="${f1(fl)}">${T(p[0], p[1] + 9, 'CAIRAN', K.white, 26, 800, 'middle', stroke)}</g>`; }
  return s + DISC(1) + `</g>`;
}
// ------------------------------------------------------------------ 3D + suara + pembanding + penutup
function shot3D(t, a) {
  const S = SH.s9, k1 = lerp(5.55, 6.97, clamp((t - S[0]) / 1.4)), use01 = t < S[0] + 1.5;
  const dst = { x: 40, y: 330, w: 1000, h: 781 }, cam = { cx: 537.5, cy: 460, z: 1000 / 1075 };
  const ringA = sm((t - (S[0] + 1.7)) / 0.5) * 1;
  const ring = (m) => `<ellipse cx="${f1(m.X(500))}" cy="${f1(m.Y(650))}" rx="${f1(150 * m.z)}" ry="${f1(78 * m.z)}" fill="none" stroke="${K.gold}" stroke-width="5" opacity="${f1(ringA)}"/>`;
  let s = `<g opacity="${f1(a)}">` + card('c3', use01 ? '01' : '02', use01 ? k1 : 5.0, dst, cam, { inner: ring });
  s += pill(540, 1160, 'BASAL KANAN', { fs: 44, c: K.gold, a: ringA, px: 70 });
  s += pill(540, 1262, 'Bunyi napas di sini: lebih lemah pada model efusi', { fs: 28, c: K.mint, w: 700, a: win(t, KK.basal - 0.3, V.s9[1] + 0.8, 0.3), px: 40 });
  return s + DISC(1) + `</g>`;
}
function wave(key, x, y, w, h, prog, col, label, a) {
  const e = ENV[key], mx = 0.17, n = e.length, bw = w / n; let s = `<g opacity="${f1(a)}">` + R(x, y, w, h, 'rgba(3,29,24,.7)', 18, 'stroke="rgba(124,224,184,.4)" stroke-width="2"') + `<line x1="${x + 10}" y1="${y + h / 2}" x2="${x + w - 10}" y2="${y + h / 2}" stroke="rgba(255,255,255,.18)" stroke-width="2"/>`;
  e.forEach((v, i) => { const hh = Math.max(3, (v / mx) * (h - 24)), on = i / n <= prog; s += R(x + i * bw + 1, y + h / 2 - hh / 2, Math.max(2, bw - 3), hh, on ? col : 'rgba(255,255,255,.14)', 2); });
  return s + T(x + 18, y - 12, label, col, 26, 800, 'start', stroke) + `</g>`;
}
function shotSound(t, a) {
  const D = C.demo, nrm = t >= D.N[0] - 0.05 && t < D.W[0] - 0.05, wk = t >= D.W[0] - 0.05, ts = wk ? scanPat(t) : scanNor(t);
  const pN = clamp((t - D.N[0]) / (D.N[1] - D.N[0])), pW = clamp((t - D.W[0]) / (D.W[1] - D.W[0]));
  const cur = nrm ? 'Normal' : wk ? 'Basal kanan pada model efusi' : '';
  let s = `<g opacity="${f1(a)}">` + header('hd3', 3, 270, 1) + card('cS', '02', ts, { x: 40, y: 334, w: 1000, h: 400 }, WIDE, { mk: wk ? 1 : 0 });
  s += wave('N', 60, 915, 960, 130, nrm || wk ? (wk ? 1 : pN) : 0, K.mint, 'Normal', 1) + wave('W', 60, 1115, 960, 130, wk ? pW : 0, K.coral, 'Basal kanan pada model efusi', 1);
  s += T(540, 1285, 'Bunyi napas simulasi • skala amplitudo sama (dihitung dari audio)', K.mute, 25, 700, 'middle');
  const big = nrm || wk;
  if (big) s += `<g opacity="${f1(clamp((t - (nrm ? D.N[0] : D.W[0])) / 0.2))}">${R(80, 806, 920, 0, 'none')}</g>`;
  s += pill(540, 840, cur || 'Dengar bedanya', { fs: 44, c: nrm ? K.mint : wk ? K.coral : K.gold, a: 1, px: 70 });
  return s + DISC(1) + `</g>`;
}
function shotCmp(t, a) {
  const S = SH.cmp, p = t - V.s11[0], tc = lerp(0, 0, 0);
  // peta waktu sumber: klik tombol 10,93 pada "bandingkan"; citra berubah 11,67 pada "dan normalnya"
  const srcT = (() => { const kb = (KK.bandingkan - V.s11[0]), kn = (KK.normalnya - V.s11[0]) - 0.1; if (p <= kb) return lerp(10.2, 10.93, clamp(p / kb)); if (p <= kn) return lerp(10.93, 11.62, (p - kb) / (kn - kb)); return 11.67 + (p - kn); })();
  const ts = Math.min(srcT, 13.9), flipped = ts >= 11.67;
  const dst2 = { x: 40, y: 300, w: 1000, h: 400 };
  let s = `<g opacity="${f1(a)}">` + card('cC', '02', ts, dst2, WIDE, { mk: flipped ? 0 : 1 });
  s += pill(540, 668, flipped ? 'NORMAL' : 'SKENARIO EFUSI', { fs: 30, c: flipped ? K.mint : K.gold, px: 56 });
  // pembesaran bagian drawer Patologi asli: tombol "Bandingkan dengan normal" + baris tabel Efusi pleura (0 mL vs 650 mL)
  const src = { x: 0, y: 600, w: 340, h: 210 }, dst = { x: 140, y: 740, w: 800, h: 800 * 210 / 340 }, zz = dst.w / src.w;
  const ringB = (m) => `<rect x="${f1(m.X(10))}" y="${f1(m.Y(604))}" width="${f1(204 * m.z)}" height="${f1(52 * m.z)}" rx="${f1(14 * m.z)}" fill="none" stroke="${K.gold}" stroke-width="6" opacity="${f1(win(t, KK.bandingkan - 0.9, KK.bandingkan + 0.9, 0.2))}"/><rect x="${f1(m.X(10))}" y="${f1(m.Y(776))}" width="${f1(318 * m.z)}" height="${f1(30 * m.z)}" rx="${f1(8 * m.z)}" fill="none" stroke="${K.gold}" stroke-width="5" opacity="${f1(sm((t - (KK.normalnya - 0.3)) / 0.4))}"/>`;
  s += card('cD', '02', Math.min(ts, 13.9), dst, { cx: 170, cy: 705, z: zz }, { mk: 0, inner: ringB, bc: 'rgba(124,224,184,.55)' });
  s += pill(540, 1312, 'Tombol Bandingkan dengan normal di aplikasi', { fs: 28, c: K.mint, w: 700, px: 40, a: 1 });
  return s + DISC(1) + `</g>`;
}
function shotDisc(t, a) {
  const ts = scanNor(t);
  let s = `<g opacity="${f1(a)}">` + card('cDS', '02', ts, { x: 40, y: 330, w: 1000, h: 560 }, camMix(WIDE, WIDE, 0), { mk: 0 }) + R(40, 330, 1000, 560, 'rgba(3,29,24,.6)', 26);
  s += lines(['SIMULASI EDUKATIF', 'BUKAN CITRA ATAU SUARA PASIEN', 'BUKAN ALAT DIAGNOSIS'], sm((t - (V.s12[0] - 0.1)) / 0.3), 1010, 52, [2]);
  return s + DISC(1) + `</g>`;
}
function shotCta(t, a) {
  const c2 = clamp((t - (V.s13[0] + 0.8)) / 0.4), dst = { x: 40, y: 520, w: 1000, h: 562 };
  let s = `<g opacity="${f1(a)}">` + R(190, 290, 700, 120, 'rgba(248,247,243,.97)', 36) + `<image href="${need('../stage/logo-full.webp')}" x="290" y="300" width="500" height="100" preserveAspectRatio="xMidYMid meet"/>`;
  s += card('cT', '02', 6.0 + (t - V.s13[0]) * 0.5, dst, { cx: 960, cy: 540, z: 1000 / 1920 }, { mk: 0 });
  s += `<g opacity="${f1(sm(c2))}" transform="translate(0 ${f1((1 - sm(c2)) * 22)})">${R(70, 1130, 940, 170, K.gold, 80)}${T(540, 1196, 'Eksplorasi patologi gratis', K.ink, 44, 800)}${T(540, 1264, 'di medcoel.com', K.ink, 58, 800)}</g>`;
  return s + DISC(1) + `</g>`;
}
function compose(t) {
  NEED = []; let s = bg(t);
  const o = Math.min(SHOT(t, 'hook'), 1);
  const openA = (t < SH.a1[0] + 0.2) ? 1 : 0;
  if (t < SH.a1[0] + 0.2) s += scanOpen(t, 1);
  for (const [k, f] of [['a1', shotA1], ['a2', shotA2], ['s9', shot3D], ['snd', shotSound], ['cmp', shotCmp], ['disc', shotDisc], ['cta', shotCta]]) { const a = SHOT(t, k); if (a > 0.001) s += f(t, a); }
  return s;
}
window.renderFrame = async (t) => {
  const s = compose(Math.min(t, C.dur - 1e-3)); await Promise.all(NEED.map(load));
  $('scene').innerHTML = s;
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
};
window.__ready = true;

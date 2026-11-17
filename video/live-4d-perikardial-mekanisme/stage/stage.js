// "KENAPA ADA CAIRAN DI SEKITAR JANTUNG?" (1080 x 1920, 30 fps, 38,8 dtk): mekanisme efusi perikardial (ilustrasi berlabel) + contoh skenario di Live 4D Lab MEDCOEL (rekaman produk asli, bagian dari klip 00/01/04).
// Ilustrasi mekanisme = SVG skematik (anim.js), bukan rekaman pasien dan bukan citra produk. Penanda pada CT = topeng per bingkai dari piksel klip 04 (tools/masks.py). Voice-over Google AI Studio (audio/voiceover.wav) disinkronkan lewat cues.json.
import { f1, clamp, lerp, sm } from './core.js';
import { illus, labels, gap, squeeze, CX, CY } from './anim.js';
const $ = (id) => document.getElementById(id);
const C = await (await fetch('../cues.json')).json();
await document.fonts.load('800 40px "Plus Jakarta Sans"'); await document.fonts.load('700 30px "Plus Jakarta Sans"'); await document.fonts.load('600 30px "Plus Jakarta Sans"'); await document.fonts.ready;
export const DUR = C.dur;
const FONT = "'Plus Jakarta Sans', system-ui, sans-serif";
const K = { bg0: '#031D18', bg1: '#0A4A3E', mint: '#7CE0B8', gold: '#F8C038', white: '#FFFFFF', ink: '#05231D', mute: '#A8D3C6', coral: '#FF8A7A' };
const win = (t, a, b, f = 0.25) => clamp((t - a) / f) * clamp((b - t) / f);
const R = (x, y, w, h, f, rx = 0, e = '') => `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" rx="${rx}" fill="${f}" ${e}/>`;
const T = (x, y, txt, f, size, w = 800, anchor = 'middle', e = '') => `<text x="${f1(x)}" y="${f1(y)}" font-family="${FONT}" font-weight="${w}" font-size="${size}" fill="${f}" text-anchor="${anchor}" ${e}>${txt}</text>`;
const tw = (txt, fs, w = 700) => txt.length * fs * (w >= 800 ? 0.62 : 0.57);
function pill(x, y, txt, o = {}) {
  const fs = o.fs ?? 32, w = tw(txt, fs, o.w ?? 800) + (o.px ?? 44), h = fs + 30, a = o.a ?? 1; if (a <= 0.01) return '';
  const x0 = o.anchor === 'l' ? x : o.anchor === 'r' ? x - w : x - w / 2;
  return `<g opacity="${f1(a)}">${R(x0, y - fs - 8, w, h, o.bg ?? 'rgba(3,29,24,.9)', h / 2, `stroke="${o.c ?? K.mint}" stroke-width="${o.sw ?? 3}"`)}${T(x0 + w / 2, y + 4, txt, o.fg ?? K.white, fs, o.w ?? 800)}</g>`;
}
function headline(lines, a, y = 330, fs = 70, hi = []) {
  if (a <= 0.01) return '';
  return `<g opacity="${f1(a)}" transform="translate(0 ${f1((1 - a) * 18)})">${lines.map((l, i) => T(540, y + i * (fs + 14), l, hi.includes(i) ? K.mint : K.white, fs, 800, 'middle', 'stroke="rgba(3,29,24,.6)" stroke-width="8" paint-order="stroke" stroke-linejoin="round"')).join('')}</g>`;
}
const DISCTXT = 'Simulasi edukatif • CT sintetis • bukan alat diagnosis';
const DISC = (a = 1) => pill(540, 1410, DISCTXT, { fs: 27, c: 'rgba(124,224,184,.75)', w: 700, a, sw: 2, px: 40 });
const ILU = (a = 1) => pill(540, 1410, 'Ilustrasi mekanisme', { fs: 29, c: K.gold, w: 800, a, sw: 3, px: 56 });
// ------------------------------------------------------------------ bingkai sumber
let NEED = [];
const need = (u) => { NEED.push(u); return u; };
const cache = new Map();
const load = (u) => { if (!cache.has(u)) { const im = new Image(); im.src = u; cache.set(u, im.decode().catch(() => {})); } return cache.get(u); };
const SZ = { '00': [1920, 1078], '01': [1920, 1078], '04': [1080, 1080] };
const fnum = (clip, ts) => Math.max(1, Math.min(C.clip[clip], Math.round(ts * 30) + 1));
const frameUrl = (clip, ts) => `../rekam/frames/${clip}/f${String(fnum(clip, ts)).padStart(4, '0')}.jpg`;
const maskUrl = (ts) => `../data/masks/f${String(fnum('04', ts)).padStart(4, '0')}.png`;
const prog = (S, t) => clamp((t - S.out[0]) / (S.out[1] - S.out[0]));
const srcT = (S, t) => lerp(S.src[0], S.src[1], prog(S, t));
function crop(id, clip, ts, src, dst, o = {}) {
  const [SW, SH] = SZ[clip], sc = dst.w / src.w, ix = dst.x - src.x * sc, iy = dst.y - src.y * sc, rad = o.r ?? 26;
  const map = { sc, X: (x) => dst.x + (x - src.x) * sc, Y: (y) => dst.y + (y - src.y) * sc };
  return `<clipPath id="${id}"><rect x="${f1(dst.x)}" y="${f1(dst.y)}" width="${f1(dst.w)}" height="${f1(dst.h)}" rx="${rad}"/></clipPath><g clip-path="url(#${id})"><image href="${need(frameUrl(clip, ts))}" x="${f1(ix)}" y="${f1(iy)}" width="${f1(SW * sc)}" height="${f1(SH * sc)}" preserveAspectRatio="none"/>${o.inner ? o.inner(map) : ''}</g>${o.stroke === false ? '' : `<rect x="${f1(dst.x)}" y="${f1(dst.y)}" width="${f1(dst.w)}" height="${f1(dst.h)}" rx="${rad}" fill="none" stroke="${o.border ?? 'rgba(124,224,184,.55)'}" stroke-width="${o.bw ?? 3}"/>`}`;
}
const dstW = (cx, y, w, srcw, srch) => ({ x: cx - w / 2, y, w, h: w * srch / srcw });
const CTSRC = { x: 150, y: 150, w: 710, h: 610 }, CTDST = dstW(540, 470, 1000, CTSRC.w, CTSRC.h);
const MK = `<filter id="mk" x="-3%" y="-3%" width="106%" height="106%" color-interpolation-filters="sRGB"><feGaussianBlur in="SourceAlpha" stdDeviation="2.4" result="b"/><feComponentTransfer in="b" result="s"><feFuncA type="linear" slope="18" intercept="-8"/></feComponentTransfer><feMorphology in="s" operator="erode" radius="1.6" result="e"/><feComposite in="s" in2="e" operator="out" result="edge"/><feFlood flood-color="#F8C038" flood-opacity=".95" result="fc"/><feComposite in="fc" in2="edge" operator="in" result="ring"/><feFlood flood-color="#F8C038" flood-opacity=".05" result="ff"/><feComposite in="ff" in2="s" operator="in" result="fill"/><feMerge><feMergeNode in="fill"/><feMergeNode in="ring"/></feMerge></filter>`;
const maskLayer = (ts, a) => (m) => (a > 0.01 ? `<image href="${need(maskUrl(ts))}" x="${f1(m.X(CTSRC.x))}" y="${f1(m.Y(CTSRC.y))}" width="${f1(CTSRC.w * m.sc)}" height="${f1(CTSRC.h * m.sc)}" preserveAspectRatio="none" filter="url(#mk)" opacity="${f1(a)}"/>` : '');
const bg = (t) => `<defs><linearGradient id="bgG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${K.bg0}"/><stop offset="1" stop-color="${K.bg1}"/></linearGradient><radialGradient id="glow" cx=".5" cy=".5" r=".6"><stop offset="0" stop-color="#0F7A66" stop-opacity=".35"/><stop offset="1" stop-color="#0F7A66" stop-opacity="0"/></radialGradient>${MK}</defs><rect width="1080" height="1920" fill="url(#bgG)"/><ellipse cx="${f1(540 + 40 * Math.sin(t * 0.4))}" cy="900" rx="720" ry="680" fill="url(#glow)"/>`;
// ------------------------------------------------------------------ shot
function shotHook(t) {
  const S = C.shots.hook;
  return headline(['KENAPA ADA CAIRAN', 'DI SEKITAR JANTUNG?'], 1, 330, 78, [1]) + crop('cH', '04', srcT(S, t), CTSRC, CTDST) + DISC(1);
}
function shotPatologi(t) {
  const S = C.shots.patologi, P = C.shots.patologi.playUntil, play = clamp((t - S.out[0]) / (P - S.out[0])), ts = lerp(S.src[0], S.src[1], play);
  const pan = sm((t - P - 0.2) / 2.8);                                  // setelah klip berhenti: geser dari kartu skenario ke teks deskripsi asli aplikasi
  const a0 = { x: 0, y: 62, w: 420, h: 336 }, a1 = { x: 0, y: 500, w: 420, h: 190 };
  const src = { x: 0, y: lerp(a0.y, a1.y, pan), w: 420, h: lerp(a0.h, a1.h, pan) };
  const dst = dstW(540, 410, 960, src.w, src.h);
  const card = { x: 212, y: 214, w: 188, h: 84 }, u = clamp((t - S.out[0]) / 1.8), p = 0.5 + 0.5 * Math.sin(t * 6);
  const ring = (m) => `<rect x="${f1(m.X(card.x) - 7)}" y="${f1(m.Y(card.y) - 7)}" width="${f1(card.w * m.sc + 14)}" height="${f1(card.h * m.sc + 14)}" rx="22" fill="none" stroke="${K.gold}" stroke-width="${f1(5 + 2 * p)}" opacity="${f1(sm(u * 3) * (1 - pan))}"/>`;
  const hl = { x: 10, y: 560, w: 400, h: 52 }, hlA = pan > 0.5 ? (pan - 0.5) * 2 : 0;
  const inner = (m) => ring(m) + `<rect x="${f1(m.X(hl.x))}" y="${f1(m.Y(hl.y))}" width="${f1(hl.w * m.sc)}" height="${f1(hl.h * m.sc)}" rx="12" fill="rgba(248,192,56,.18)" stroke="${K.gold}" stroke-width="5" opacity="${f1(hlA)}"/>`;
  let s = headline(['EFUSI PERIKARDIAL', '(sedang)'], 1, 300, 66, [1]);
  s += crop('cP', '01', ts, src, dst, { inner });
  s += pill(540, 1290, pan < 0.5 ? 'Panel Patologi · skenario di Live 4D Lab' : 'Teks asli panel Patologi di aplikasi', { fs: 28, c: K.gold });
  return s + DISC(1);
}
function shotAnim(t) {
  const A = C.anim, a = win(t, C.shots.anim.out[0], C.shots.anim.out[1], 0.4);
  const k = 1.18, ox = 540 - CX * k, oy = 800 - CY * k;
  const cap = (arr, txt, c = K.gold) => pill(540, 1325, txt, { fs: 30, c, a: win(t, arr[0] + 0.1, arr[1] - 0.1, 0.3), px: 56 });
  let s = `<g opacity="${f1(a)}">`;
  s += R(40, 250, 1000, 1080, 'rgba(3,29,24,.55)', 40, 'stroke="rgba(248,192,56,.35)" stroke-width="3"');
  s += `<g transform="translate(${f1(ox)} ${f1(oy)}) scale(${k})">${illus(t, C)}${labels(t, C)}</g>`;
  s += T(540, 300, 'jantung tampak melintang (skematik)', K.mute, 26, 600);
  s += cap(A.normal, 'NORMAL: ada sedikit cairan di antara dua lapis', K.mint) + cap(A.radang, 'PERADANGAN, misalnya infeksi', K.coral) + cap(A.terkumpul, 'Cairan terkumpul lebih cepat daripada diserap', K.gold) + cap(A.tekanan, 'Tekanan naik → ruang isi jantung terbatas', K.coral);
  s += pill(540, 1270, 'Mekanisme umum, bukan kasus simulasi MEDCOEL', { fs: 24, c: 'rgba(168,211,198,.7)', w: 700, a: win(t, A.tekanan[0] + 0.3, A.tekanan[1] - 0.1, 0.3), sw: 2 });
  s += `</g>` + ILU(a);
  return s;
}
function shotMorf(t) {
  const S = C.shots.morf, ts = srcT(S, t), u = prog(S, t), M = C.morf;
  const mk = sm((u - 0.4) / 0.4), ill = (1 - sm((u - 0.1) / 0.5)) * 0.6;
  const sc = (M.rx * 2) / (1000 * 0.55) * 0.55;       // ilustrasi dipasang agar cincin luarnya (±268 px lokal) menutup cincin pada CT
  const tf = (m) => { const gx = m.X(CTSRC.x + M.cx), gy = m.Y(CTSRC.y + M.cy), s = 0.58 * m.sc; return `<g transform="translate(${f1(gx)} ${f1(gy)}) scale(${f1(s * 1000) / 1000}) translate(${-CX} ${-CY})" opacity="${f1(ill)}">${illus(C.anim.terkumpul[1] + 1, C, { gap: 38, sq: 0, inflamed: false })}</g>`; };
  const inner = (m) => maskLayer(ts, mk)(m) + tf(m);
  let s = headline(['CAIRAN DI RUANG', 'SEKITAR JANTUNG'], clamp((t - S.out[0]) / 0.3), 290, 58);
  s += crop('cM', '04', ts, CTSRC, CTDST, { inner });
  s += pill(540, 1318, 'Bentuk ilustrasi dicocokkan dengan area di sekitar jantung', { fs: 25, c: K.gold, a: win(t, C.teks.ringMorf[0], S.out[1], 0.3) });
  return s + DISC(clamp((t - S.out[0]) / 0.3));
}
function shotProbe(t) {
  const S = C.shots.probe, ts = lerp(0.03, 0.75, clamp(prog(S, t) * 1.7)), a = win(t, S.out[0], S.out[1], 0.2);
  const body = { x: 0, y: 70, w: 1075, h: 690 }, d1 = dstW(540, 390, 840, body.w, body.h), ct = { x: 1215, y: 300, w: 620, h: 380 }, d2 = dstW(540, 390 + d1.h + 22, 640, ct.w, ct.h);
  const pul = 0.5 + 0.5 * Math.sin(t * 7), ring = (m) => `<circle cx="${f1(m.X(318))}" cy="${f1(m.Y(548))}" r="${f1((74 + 6 * pul) * m.sc / 0.8)}" fill="none" stroke="${K.gold}" stroke-width="6" opacity="${f1(a)}"/>`;
  let s = headline(['CAIRAN DI RUANG', 'SEKITAR JANTUNG'], 1, 290, 58) + `<g opacity="${f1(a)}">`;
  s += crop('cB', '00', ts, body, d1, { inner: ring }) + crop('cC', '00', ts, ct, d2) + pill(540 - 420 + 20, d1.y + 58, 'POSISI PROBE', { fs: 26, c: K.gold, anchor: 'l' }) + `</g>`;
  return s + DISC(1);
}
function shotCt(t) {
  const S = C.shots.ct, ts = srcT(S, t), mk = win(t, C.teks.ring[0] - 1.5, C.teks.ring[1], 0.3);
  let s = headline(['CAIRAN DI RUANG', 'SEKITAR JANTUNG'], 1, 290, 58);
  s += crop('cT', '04', ts, CTSRC, CTDST, { inner: maskLayer(ts, 1) });
  s += pill(540, 1318, 'Penanda mengikuti lapisan abu-abu di sekitar jantung', { fs: 26, c: K.gold, a: sm((t - S.out[0]) * 3) });
  return s + DISC(1);
}
function shotDisc(t) {
  const S = C.shots.disc, a = win(t, S.out[0], S.out[1], 0.25), ts = srcT(S, t), big = win(t, C.teks.disc[0], C.teks.disc[1], 0.25);
  let s = `<g opacity="${f1(a)}">` + crop('cD', '04', ts, CTSRC, CTDST) + `<rect x="40" y="470" width="1000" height="859" rx="26" fill="rgba(3,29,24,.62)"/>`;
  s += `<g opacity="${f1(big)}">${R(80, 700, 920, 250, 'rgba(3,29,24,.94)', 40, `stroke="${K.gold}" stroke-width="5"`)}${T(540, 790, 'Simulasi edukatif • CT sintetis', K.white, 42, 800)}${T(540, 860, 'bukan alat diagnosis', K.gold, 58, 800)}</g></g>`;
  return s + DISC(1);
}
function shotTutup(t) {
  const S = C.shots.tutup, a = clamp((t - S.out[0]) / 0.35), c2 = clamp((t - C.teks.url) / 0.4), dst = dstW(540, 600, 1000, 1920, 1078);
  let s = `<g opacity="${f1(a)}">` + R(190, 262, 700, 120, 'rgba(248,247,243,.97)', 36) + `<image href="${need('../stage/logo-full.webp')}" x="290" y="272" width="500" height="100" preserveAspectRatio="xMidYMid meet"/>`;
  s += crop('cE', '00', 13.4 + prog(S, t) * 3.2, { x: 0, y: 0, w: 1920, h: 1078 }, dst) + `</g>`;
  s += `<g opacity="${f1(sm(c2))}" transform="translate(0 ${f1((1 - sm(c2)) * 22)})">${R(70, 1200, 940, 150, K.gold, 75)}${T(540, 1262, 'Eksplorasi gratis', K.ink, 40, 800)}${T(540, 1320, 'di medcoel.com', K.ink, 54, 800)}</g>`;
  return s + DISC(1);
}
function compose(t) {
  NEED = []; let s = bg(t); const sh = C.shots; const inR = (x) => t >= x.out[0] - 1e-6 && t < x.out[1];
  if (inR(sh.hook)) s += shotHook(t);
  if (inR(sh.patologi)) s += shotPatologi(t);
  if (inR(sh.anim)) s += shotAnim(t);
  if (inR(sh.morf)) s += shotMorf(t);
  if (inR(sh.probe)) s += shotProbe(t);
  if (inR(sh.ct)) s += shotCt(t);
  if (inR(sh.disc)) s += shotDisc(t);
  if (inR(sh.tutup)) s += shotTutup(t);
  return s;
}
window.renderFrame = async (t) => {
  const s = compose(Math.min(t, C.dur - 1e-3)); await Promise.all(NEED.map(load));
  $('scene').innerHTML = s;
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
};
window.__ready = true;

// "ADA CAIRAN DI SEKITAR JANTUNG?" (1080 x 1920, 30 fps, 29,6 dtk). Promosi MEDCOEL Live 4D Lab, skenario "Efusi perikardial (sedang)".
// Semua gambar produk = bingkai dari lima rekaman asli (src/*.mp4): hanya dipotong, diperbesar, diperlambat, ditumpuk dua tampilan, diberi sorotan dan teks. Tidak ada UI/organ/cairan/hasil scan buatan.
// Penanda "ruang sekitar jantung": topeng per bingkai (data/masks, tools/masks.py) dari piksel citra CT sintetis klip 04 (lapisan abu-abu ±95 yang mengelilingi jantung), jadi bergerak tepat mengikuti gambar.
// Voice-over Google AI Studio (audio/voiceover.wav) diselaraskan lewat cues.json (ASR).
import { f1, clamp, lerp, sm } from './core.js';
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
// ------------------------------------------------------------------ bingkai sumber
let NEED = [];
const need = (u) => { NEED.push(u); return u; };
const cache = new Map();
const load = (u) => { if (!cache.has(u)) { const im = new Image(); im.src = u; cache.set(u, im.decode().catch(() => {})); } return cache.get(u); };
const SZ = { '00': [1920, 1078], '01': [1920, 1078], '02': [1920, 1078], '03': [1920, 1078], '04': [1080, 1080] };
const fnum = (clip, ts) => Math.max(1, Math.min(C.clip[clip], Math.round(ts * 30) + 1));
const frameUrl = (clip, ts) => `../rekam/frames/${clip}/f${String(fnum(clip, ts)).padStart(4, '0')}.jpg`;
const maskUrl = (ts) => `../data/masks/f${String(fnum('04', ts)).padStart(4, '0')}.png`;
const prog = (S, t) => clamp((t - S.out[0]) / (S.out[1] - S.out[0]));
const srcT = (S, t) => lerp(S.src[0], S.src[1], prog(S, t));
/** potong bagian sumber ke kotak tujuan; inner(map) menggambar lapisan di dalam klip (koordinat sumber). */
function crop(id, clip, ts, src, dst, o = {}) {
  const [SW, SH] = SZ[clip], sc = dst.w / src.w, ix = dst.x - src.x * sc, iy = dst.y - src.y * sc, rad = o.r ?? 26;
  const map = { sc, X: (x) => dst.x + (x - src.x) * sc, Y: (y) => dst.y + (y - src.y) * sc };
  return `<clipPath id="${id}"><rect x="${f1(dst.x)}" y="${f1(dst.y)}" width="${f1(dst.w)}" height="${f1(dst.h)}" rx="${rad}"/></clipPath><g clip-path="url(#${id})"><image href="${need(frameUrl(clip, ts))}" x="${f1(ix)}" y="${f1(iy)}" width="${f1(SW * sc)}" height="${f1(SH * sc)}" preserveAspectRatio="none"/>${o.inner ? o.inner(map) : ''}</g>${o.stroke === false ? '' : `<rect x="${f1(dst.x)}" y="${f1(dst.y)}" width="${f1(dst.w)}" height="${f1(dst.h)}" rx="${rad}" fill="none" stroke="${o.border ?? 'rgba(124,224,184,.55)'}" stroke-width="${o.bw ?? 3}"/>`}`;
}
const dstW = (cx, y, w, srcw, srch) => ({ x: cx - w / 2, y, w, h: w * srch / srcw });
const CTSRC = { x: 150, y: 150, w: 710, h: 610 };           // jendela citra CT pada klip 04 (1080 x 1080)
// penanda tipis mengikuti topeng per bingkai
const MK = `<filter id="mk" x="-3%" y="-3%" width="106%" height="106%" color-interpolation-filters="sRGB"><feGaussianBlur in="SourceAlpha" stdDeviation="2.4" result="b"/><feComponentTransfer in="b" result="s"><feFuncA type="linear" slope="18" intercept="-8"/></feComponentTransfer><feMorphology in="s" operator="erode" radius="1.6" result="e"/><feComposite in="s" in2="e" operator="out" result="edge"/><feFlood flood-color="#F8C038" flood-opacity=".95" result="fc"/><feComposite in="fc" in2="edge" operator="in" result="ring"/><feFlood flood-color="#F8C038" flood-opacity=".05" result="ff"/><feComposite in="ff" in2="s" operator="in" result="fill"/><feMerge><feMergeNode in="fill"/><feMergeNode in="ring"/></feMerge></filter>`;
const maskLayer = (ts, a) => (m) => (a > 0.01 ? `<image href="${need(maskUrl(ts))}" x="${f1(m.X(CTSRC.x))}" y="${f1(m.Y(CTSRC.y))}" width="${f1(CTSRC.w * m.sc)}" height="${f1(CTSRC.h * m.sc)}" preserveAspectRatio="none" filter="url(#mk)" opacity="${f1(a)}"/>` : '');
const bg = (t) => `<defs><linearGradient id="bgG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${K.bg0}"/><stop offset="1" stop-color="${K.bg1}"/></linearGradient><radialGradient id="glow" cx=".5" cy=".5" r=".6"><stop offset="0" stop-color="#0F7A66" stop-opacity=".35"/><stop offset="1" stop-color="#0F7A66" stop-opacity="0"/></radialGradient>${MK}</defs><rect width="1080" height="1920" fill="url(#bgG)"/><ellipse cx="${f1(540 + 40 * Math.sin(t * 0.4))}" cy="900" rx="720" ry="680" fill="url(#glow)"/>`;
const CTDST = dstW(540, 470, 1000, CTSRC.w, CTSRC.h);       // 1000 x 859
// ------------------------------------------------------------------ shot-shot
function shotHook(t) {
  const S = C.shots.hook, ts = srcT(S, t);
  let s = headline(['ADA CAIRAN DI', 'SEKITAR JANTUNG?'], 1, 330, 84, [1]);
  s += crop('cH', '04', ts, CTSRC, CTDST);
  s += pill(540, 1300, 'PERIKARDIUM = selaput pembungkus jantung', { fs: 28, c: K.gold, a: win(t, C.teks.perikardium[0], C.teks.perikardium[1], 0.3) });
  return s + DISC(1);
}
function shotPatologi(t) {
  const S = C.shots.patologi, u = prog(S, t), play = clamp((t - S.out[0]) / (C.shots.patologi.playUntil - S.out[0]));
  const ts = lerp(S.src[0], S.src[1], play), src0 = { x: 0, y: 62, w: 420, h: 336 };
  const z = 1 + 0.07 * sm((t - C.shots.patologi.playUntil) / (S.out[1] - C.shots.patologi.playUntil));
  const src = { x: 0 + 150 * (1 - 1 / z) * 0.25, y: 62 + 90 * (1 - 1 / z), w: src0.w / z, h: src0.h / z };
  const dst = dstW(540, 400, 960, src0.w, src0.h);   // 960 x 768
  const card = { x: 212, y: 214, w: 188, h: 84 };
  const ring = (m) => { const p = 0.5 + 0.5 * Math.sin(t * 6); return `<rect x="${f1(m.X(card.x) - 7)}" y="${f1(m.Y(card.y) - 7)}" width="${f1(card.w * m.sc + 14)}" height="${f1(card.h * m.sc + 14)}" rx="22" fill="none" stroke="${K.gold}" stroke-width="${f1(5 + 2 * p)}" opacity="${f1(sm(u * 4))}"/>`; };
  let s = headline(['EFUSI PERIKARDIAL'], win(t, C.teks.efusi[0], C.teks.efusi[1], 0.3), 330, 80);
  s += crop('cP', '01', ts, src, dst, { inner: ring });
  s += pill(540, 1260, 'Panel Patologi · skenario Efusi perikardial (sedang)', { fs: 28, c: K.gold, a: sm((u - 0.2) * 4) });
  return s + DISC(1);
}
function shotProbe(t) {
  const S = C.shots.probe, ts = lerp(0.03, 0.75, clamp(prog(S, t) * 1.7)), a = win(t, S.out[0], S.out[1] + 0.2, 0.2);
  const body = { x: 0, y: 70, w: 1075, h: 690 }, d1 = dstW(540, 390, 840, body.w, body.h);
  const ct = { x: 1215, y: 300, w: 620, h: 380 }, d2 = dstW(540, 390 + d1.h + 22, 640, ct.w, ct.h);
  const rg = win(t, C.teks.ringProbe[0], C.teks.ringProbe[1], 0.2), pul = 0.5 + 0.5 * Math.sin(t * 7);
  const ring = (m) => (rg > 0.01 ? `<circle cx="${f1(m.X(318))}" cy="${f1(m.Y(548))}" r="${f1((74 + 6 * pul) * m.sc / 0.8)}" fill="none" stroke="${K.gold}" stroke-width="6" opacity="${f1(rg)}"/>` : '');
  let s = headline(['CAIRAN DI RUANG', 'SEKITAR JANTUNG'], win(t, C.teks.cairan[0], C.teks.cairan[1], 0.3), 290, 58);
  s += `<g opacity="${f1(a)}">` + crop('cB', C.shots.probe.clip, ts, body, d1, { inner: ring }) + crop('cC', '00', ts, ct, d2) + pill(540 - 420 + 20, d1.y + 58, 'POSISI PROBE', { fs: 26, c: K.gold, anchor: 'l', a: rg }) + `</g>`;
  return s + DISC(1);
}
function shotCT(t, S, label) {
  const ts = srcT(S, t), mk = win(t, C.teks.ring[0], C.teks.ring[1], 0.4), ring = maskLayer(ts, mk);
  return crop('cT', '04', ts, CTSRC, CTDST, { inner: ring, border: 'rgba(124,224,184,.55)' });
}
function shotCt(t) {
  const S = C.shots.ct;
  let s = headline(['CAIRAN DI RUANG', 'SEKITAR JANTUNG'], win(t, C.teks.cairan[0], C.teks.cairan[1], 0.3), 290, 58);
  s += shotCT(t, S) + pill(540, 1318, 'Penanda mengikuti lapisan abu-abu di sekitar jantung', { fs: 26, c: K.gold, a: sm((t - 13.8) * 3) });
  return s + DISC(1);
}
function shotIsi(t) {
  const S = C.shots.isi;
  let s = headline(['Cairan banyak atau terbentuk cepat', 'bisa mengganggu pengisian jantung'], win(t, S.out[0], S.out[1], 0.3), 300, 46);
  s += shotCT(t, S) + `</g>`.slice(0, 0);
  return s + DISC(1);
}
function shotModel(t) {
  const S = C.shots.model, a = win(t, S.out[0], S.out[1], 0.3);
  const src = { x: 0, y: 500, w: 420, h: 195 }, dst = dstW(540, 480, 1000, src.w, src.h);
  const hl = { x: 10, y: 615, w: 400, h: 70 }, p = 0.5 + 0.5 * Math.sin(t * 5);
  const inner = (m) => `<rect x="${f1(m.X(hl.x))}" y="${f1(m.Y(hl.y))}" width="${f1(hl.w * m.sc)}" height="${f1(hl.h * m.sc)}" rx="14" fill="rgba(248,192,56,.22)" stroke="${K.gold}" stroke-width="${f1(5 + 2 * p)}"/>`;
  let s = `<g opacity="${f1(a)}">` + headline(['Dampak hemodinamik', 'tidak dimodelkan'], 1, 300, 60, [1]);
  s += crop('cM', '01', S.src[0], src, dst, { inner });
  s += pill(540, 1060, 'Teks asli panel Patologi di aplikasi', { fs: 28, c: K.mint });
  s += pill(540, 1170, 'Tidak menilai tamponade', { fs: 42, c: K.gold, px: 60, sw: 4 }) + `</g>`;
  return s + DISC(1);
}
function shotDisc(t) {
  const S = C.shots.disc, a = win(t, S.out[0], S.out[1], 0.25), ts = srcT(S, t), big = win(t, C.teks.discBesar[0], C.teks.discBesar[1], 0.25);
  let s = `<g opacity="${f1(a)}">` + crop('cD', '04', ts, CTSRC, CTDST) + `<rect x="40" y="470" width="1000" height="859" rx="26" fill="rgba(3,29,24,.62)"/>`;
  s += `<g opacity="${f1(big)}">${R(80, 700, 920, 250, 'rgba(3,29,24,.94)', 40, `stroke="${K.gold}" stroke-width="5"`)}${T(540, 790, 'Simulasi edukatif • CT sintetis', K.white, 42, 800)}${T(540, 860, 'bukan alat diagnosis', K.gold, 58, 800)}${T(540, 920, 'Ini bahan belajar, bukan alat diagnosis.', K.mute, 28, 600)}</g></g>`;
  return s + DISC(1);
}
function shotTutup(t) {
  const S = C.shots.tutup, a = clamp((t - S.out[0]) / 0.35), ts = srcT(S, t) + 13.4 - S.src[0];
  const dst = dstW(540, 600, 1000, 1920, 1078), c1 = clamp((t - C.teks.coba) / 0.4), c2 = clamp((t - C.teks.url) / 0.4);
  let s = `<g opacity="${f1(a)}">` + R(190, 262, 700, 120, 'rgba(248,247,243,.97)', 36) + `<image href="${need('../stage/logo-full.webp')}" x="290" y="272" width="500" height="100" preserveAspectRatio="xMidYMid meet"/>`;
  s += `<g opacity="${f1(sm(c1))}">${T(540, 484, 'COBA LIVE 4D LAB GRATIS', K.mint, 56, 800, 'middle', 'stroke="rgba(3,29,24,.6)" stroke-width="8" paint-order="stroke"')}</g>`;
  s += crop('cE', '00', 13.4 + clamp((t - S.out[0]) / (S.out[1] - S.out[0])) * 3.2, { x: 0, y: 0, w: 1920, h: 1078 }, dst, { stroke: true }) + `</g>`;
  s += `<g opacity="${f1(sm(c2))}" transform="translate(0 ${f1((1 - sm(c2)) * 22)})">${R(70, 1200, 940, 150, K.gold, 75)}${T(540, 1262, 'Eksplorasi patologi gratis', K.ink, 40, 800)}${T(540, 1320, 'di medcoel.com', K.ink, 54, 800)}</g>`;
  void ts;
  return s + DISC(1);
}
// ------------------------------------------------------------------ rakit
function compose(t) {
  NEED = []; let s = bg(t); const sh = C.shots;
  const inR = (x) => t >= x.out[0] - 1e-6 && t < x.out[1];
  if (inR(sh.hook)) s += shotHook(t);
  if (inR(sh.patologi)) s += shotPatologi(t);
  if (inR(sh.probe)) s += shotProbe(t);
  if (inR(sh.ct)) s += shotCt(t);
  if (inR(sh.isi)) s += shotIsi(t);
  if (inR(sh.model)) s += shotModel(t);
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

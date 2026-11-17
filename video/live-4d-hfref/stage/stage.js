// "JANTUNG BERDETAK, TAPI POMPANYA MELEMAH?" (1080 x 1920, 30 fps, 28 dtk). Promosi MEDCOEL Live 4D Lab, skenario "Fungsi sistolik LV menurun (pola HFrEF)".
// Semua gambar produk = bingkai dari empat rekaman asli (src/*.mp4, 1920 x 1078); stage ini hanya memotong/memperbesar/memperlambat, menambah sorotan dan teks. Tidak ada UI/angka/hasil buatan.
// Angka "EF model 58% | 26%" tertulis di tabel panel Patologi aplikasi (dibaca dari rekaman). Voice-over BELUM ada: ?vo=1 menggambar penanda posisi VO untuk rough cut (cues.json "vo").
import { f1, clamp, lerp, sm, eio } from './core.js';
const $ = (id) => document.getElementById(id);
const C = await (await fetch('../cues.json')).json();
const Q = new URLSearchParams(location.search), VO = Q.has('vo');
await document.fonts.load('800 40px "Plus Jakarta Sans"'); await document.fonts.load('700 30px "Plus Jakarta Sans"'); await document.fonts.load('600 30px "Plus Jakarta Sans"'); await document.fonts.ready;
export const DUR = C.dur;
const FONT = "'Plus Jakarta Sans', system-ui, sans-serif";
const K = { bg0: '#031D18', bg1: '#0A4A3E', brand: '#007060', mint: '#7CE0B8', mint2: '#C4F1DD', gold: '#F8C038', white: '#FFFFFF', ink: '#05231D', coral: '#FF8A7A', mute: '#A8D3C6' };
const win = (t, a, b, f = 0.25) => clamp((t - a) / f) * clamp((b - t) / f);
const R = (x, y, w, h, f, rx = 0, e = '') => `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" rx="${rx}" fill="${f}" ${e}/>`;
const T = (x, y, txt, f, size, w = 800, anchor = 'middle', e = '') => `<text x="${f1(x)}" y="${f1(y)}" font-family="${FONT}" font-weight="${w}" font-size="${size}" fill="${f}" text-anchor="${anchor}" ${e}>${txt}</text>`;
const tw = (txt, fs, w = 700) => txt.length * fs * (w >= 800 ? 0.62 : 0.57);
function pill(x, y, txt, o = {}) {
  const fs = o.fs ?? 32, w = tw(txt, fs, o.w ?? 800) + (o.px ?? 44), h = fs + 30, a = o.a ?? 1; if (a <= 0.01) return '';
  const x0 = o.anchor === 'l' ? x : o.anchor === 'r' ? x - w : x - w / 2;
  return `<g opacity="${f1(a)}">${R(x0, y - fs - 8, w, h, o.bg ?? 'rgba(3,29,24,.9)', h / 2, `stroke="${o.c ?? K.mint}" stroke-width="${o.sw ?? 3}"`)}${T(x0 + w / 2, y + 4, txt, o.fg ?? K.white, fs, o.w ?? 800)}</g>`;
}
// ------------------------------------------------------------------ bingkai sumber
let NEED = [];
const need = (u) => { NEED.push(u); return u; };
const cache = new Map();
const load = (u) => { if (!cache.has(u)) { const im = new Image(); im.src = u; cache.set(u, im.decode().catch(() => {})); } return cache.get(u); };
const SW = 1920, SH = 1078;
const frameUrl = (clip, ts) => { const n = Math.max(1, Math.min(C.clip[clip], Math.round(ts * 30) + 1)); return `../rekam/frames/${clip}/f${String(n).padStart(4, '0')}.jpg`; };
const srcT = (shot, t, rng = shot.src, out = shot.out) => lerp(rng[0], rng[1], clamp((t - out[0]) / (out[1] - out[0])));
/** potong bagian sumber {x,y,w,h} ke kotak tujuan {x,y,w,h}; skala dari lebar. inner(map) = lapisan di dalam klip (koordinat sumber) */
function crop(id, url, src, dst, o = {}) {
  const sc = dst.w / src.w, ix = dst.x - src.x * sc, iy = dst.y - src.y * sc, rad = o.r ?? 26;
  const map = { sc, X: (x) => dst.x + (x - src.x) * sc, Y: (y) => dst.y + (y - src.y) * sc };
  return `<clipPath id="${id}"><rect x="${f1(dst.x)}" y="${f1(dst.y)}" width="${f1(dst.w)}" height="${f1(dst.h)}" rx="${rad}"/></clipPath><g clip-path="url(#${id})"><image href="${need(url)}" x="${f1(ix)}" y="${f1(iy)}" width="${f1(SW * sc)}" height="${f1(SH * sc)}" preserveAspectRatio="none"/>${o.inner ? o.inner(map) : ''}</g>${o.stroke === false ? '' : `<rect x="${f1(dst.x)}" y="${f1(dst.y)}" width="${f1(dst.w)}" height="${f1(dst.h)}" rx="${rad}" fill="none" stroke="${o.border ?? 'rgba(124,224,184,.55)'}" stroke-width="${o.bw ?? 3}"/>`}`;
}
const aspectDst = (cx, y, w, srcw, srch) => ({ x: cx - w / 2, y, w, h: w * srch / srcw });
const HEART = { x: 1170, y: 305, w: 660, h: 367 };       // citra jantung (sektor) pada panel kanan sumber
// ------------------------------------------------------------------ latar, penanda, label wajib
const bg = (t) => `<defs><linearGradient id="bgG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${K.bg0}"/><stop offset="1" stop-color="${K.bg1}"/></linearGradient><radialGradient id="glow" cx=".5" cy=".5" r=".6"><stop offset="0" stop-color="#0F7A66" stop-opacity=".35"/><stop offset="1" stop-color="#0F7A66" stop-opacity="0"/></radialGradient></defs><rect width="1080" height="1920" fill="url(#bgG)"/><ellipse cx="${f1(540 + 40 * Math.sin(t * 0.4))}" cy="860" rx="720" ry="680" fill="url(#glow)"/>`;
const DISC = (a = 1) => pill(540, 1340, 'Simulasi edukatif, bukan alat diagnosis', { fs: 28, c: 'rgba(124,224,184,.7)', w: 700, a, sw: 2, px: 40 });
const CTX = (a = 1, txt = 'Citra CT sintetis dari Atlas MEDCOEL · bukan citra pasien') => `<g opacity="${f1(a)}">${T(540, 1288, txt, K.mute, 25, 600)}</g>`;
function headline(lines, a, y = 330, fs = 70, c = K.white, hi = null) {
  if (a <= 0.01) return '';
  return `<g opacity="${f1(a)}" transform="translate(0 ${f1((1 - a) * 18)})">${lines.map((l, i) => T(540, y + i * (fs + 14), l, hi && hi[i] ? K.mint : c, fs, 800, 'middle', 'stroke="rgba(3,29,24,.55)" stroke-width="8" paint-order="stroke" stroke-linejoin="round"')).join('')}</g>`;
}
// ------------------------------------------------------------------ shot-shot
function shotHook(t) {
  const S = C.shots.hook, u = (t - S.out[0]) / (S.out[1] - S.out[0]), z = 1 + 0.07 * sm(u);
  const src = { x: HEART.x + HEART.w * (1 - 1 / z) / 2, y: HEART.y + HEART.h * (1 - 1 / z) / 2, w: HEART.w / z, h: HEART.h / z };
  const dst = aspectDst(540, 640, 1000, HEART.w, HEART.h);
  let s = crop('cHook', need(frameUrl(S.clip, srcT(S, t))), src, dst);
  s += headline(['JANTUNG BERDETAK,', 'TAPI POMPANYA', 'MELEMAH?'], 1, 350, 92, K.white, [false, false, true]);
  s += CTX(1) + DISC(1);
  return s;
}
function shotPilih(t) {
  const S = C.shots.pilih, a = win(t, S.out[0], S.out[1], 0.3), u = (t - S.out[0]) / (S.out[1] - S.out[0]);
  const src = { x: 0, y: 64, w: 560, h: 456 }, dst = aspectDst(540, 345, 1000, src.w, src.h);
  const card = { x: 212, y: 124, w: 190, h: 84 };      // kartu "Fungsi sistolik LV menurun (pola HFrEF)" pada sumber
  const ring = (m) => { const p = 0.5 + 0.5 * Math.sin(t * 6); return `<rect x="${f1(m.X(card.x) - 8)}" y="${f1(m.Y(card.y) - 8)}" width="${f1(card.w * m.sc + 16)}" height="${f1(card.h * m.sc + 16)}" rx="22" fill="none" stroke="${K.gold}" stroke-width="${f1(5 + 2 * p)}" opacity="${f1(0.55 + 0.45 * sm(u * 3))}"/>`; };
  let s = `<g opacity="${f1(a)}">` + headline(['Pilih skenario di panel Patologi'], 1, 300, 52) + crop('cPilih', need(frameUrl(S.clip, srcT(S, t))), src, dst, { inner: ring });
  s += pill(540, 1232, 'Fungsi sistolik LV menurun (pola HFrEF)', { fs: 34, c: K.gold, a: sm((u - 0.15) * 4) }) + `</g>`;
  s += DISC(a);
  return s;
}
function shotLV(t) {
  const S = C.shots.lv, a = win(t, S.out[0], S.out[1], 0.3), sp = S.split;
  const ts = t < sp ? lerp(S.src[0], S.src[1], (t - S.out[0]) / (sp - S.out[0])) : lerp(S.src2[0], S.src2[1], (t - sp) / (S.out[1] - sp));
  const dst = aspectDst(540, 560, 1000, HEART.w, HEART.h);
  const rg = win(t, C.teks.lvRing[0], C.teks.lvRing[1], 0.3), pul = 0.5 + 0.5 * Math.sin(t * 7);
  const ring = (m) => (rg > 0.01 ? `<g opacity="${f1(rg)}"><circle cx="${f1(m.X(1462))}" cy="${f1(m.Y(517))}" r="${f1((78 + 8 * pul))}" fill="none" stroke="${K.gold}" stroke-width="7"/><circle cx="${f1(m.X(1462))}" cy="${f1(m.Y(517))}" r="${f1(104 + 12 * pul)}" fill="none" stroke="rgba(248,192,56,.35)" stroke-width="4"/></g>` : '');
  let s = `<g opacity="${f1(a)}">` + headline(['Kontraksi ventrikel kiri', 'menurun'], 1, 330, 66, K.white, [false, true]);
  s += crop('cLV', need(frameUrl(S.clip, ts)), HEART, dst, { inner: ring });
  s += pill(540, 1232, 'VENTRIKEL KIRI', { fs: 34, c: K.gold, a: rg }) + `</g>` + CTX(a) + DISC(a);
  return s;
}
function shotTombol(t) {
  const S = C.shots.tombol, a = win(t, S.out[0], S.out[1], 0.3), u = (t - S.out[0]) / (S.out[1] - S.out[0]);
  const src = { x: 0, y: 690, w: 560, h: 330 }, dst = aspectDst(540, 370, 1000, src.w, src.h);
  const press = C.klik[0], pa = win(t, press - 0.5, press + 0.9, 0.12);
  const btn = { x: 17, y: 700, w: 176, h: 42 };
  const ring = (m) => `<rect x="${f1(m.X(btn.x) - 8)}" y="${f1(m.Y(btn.y) - 8)}" width="${f1(btn.w * m.sc + 16)}" height="${f1(btn.h * m.sc + 16)}" rx="16" fill="none" stroke="${K.gold}" stroke-width="5" opacity="${f1(0.4 + 0.6 * pa)}"/>`;
  let s = `<g opacity="${f1(a)}">` + headline(['Bandingkan dengan normal'], 1, 300, 56) + crop('cTombol', need(frameUrl(S.clip, srcT(S, t))), src, dst, { inner: ring });
  s += pill(540, 1010, 'Tombol di panel Patologi', { fs: 32, c: K.mint, a: sm(u * 4) });
  s += `</g>` + DISC(a);
  return s;
}
function shotBanding(t) {
  const S = C.shots.banding, a = win(t, S.out[0], S.out[1], 0.3), u = (t - S.out[0]) / (S.out[1] - S.out[0]);
  const tn = lerp(S.normal.src[0], S.normal.src[1], u), ts = lerp(S.skenario.src[0], S.skenario.src[1], u), cr = { x: 1180, y: 310, w: 640, h: 350 };
  const W = 700, d1 = aspectDst(540, 345, W, cr.w, cr.h), d2 = aspectDst(540, 345 + d1.h + 54, W, cr.w, cr.h);
  const lab = (y, txt, c, a2) => pill(540 - W / 2 + 18, y, txt, { fs: 30, c, anchor: 'l', a: a2, bg: 'rgba(3,29,24,.92)' });
  const ef = win(t, C.teks.ef[0], C.teks.ef[1], 0.3);
  let s = `<g opacity="${f1(a)}">` + headline(['Normal vs skenario HFrEF'], 1, 300, 54);
  s += crop('cN', need(frameUrl(S.normal.clip, tn)), cr, d1, { border: 'rgba(124,224,184,.7)' }) + lab(d1.y + 54, 'NORMAL', K.mint, 1);
  s += crop('cS', need(frameUrl(S.skenario.clip, ts)), cr, d2, { border: 'rgba(248,192,56,.85)' }) + lab(d2.y + 54, 'SKENARIO HFrEF', K.gold, 1);
  const yb = d2.y + d2.h + 68;
  s += `<g opacity="${f1(ef)}">${pill(540, yb, 'EF model: normal ≈58% | skenario ≈26%', { fs: 38, c: K.gold, px: 50 })}${T(540, yb + 52, 'parameter simulasi, bukan angka pasien', K.mute, 27, 600)}</g></g>`;
  s += DISC(a);
  return s;
}
function shotGejala(t) {
  const S = C.shots.gejala, a = win(t, S.out[0], S.out[1], 0.3);
  const dst = aspectDst(540, 560, 1000, HEART.w, HEART.h);
  const p1 = clamp((t - C.teks.cepatLelah) / 0.35), p2 = clamp((t - C.teks.sesak) / 0.35);
  let s = `<g opacity="${f1(a)}">` + headline(['Gejala yang dapat muncul', 'pada gagal jantung'], 1, 330, 56);
  s += crop('cG', need(frameUrl(S.clip, srcT(S, t))), HEART, dst);
  s += `<rect x="${dst.x}" y="${dst.y}" width="${dst.w}" height="${dst.h}" rx="26" fill="rgba(3,29,24,.58)"/>`;
  const big = (y, txt, p, c) => `<g opacity="${f1(sm(p))}" transform="translate(0 ${f1((1 - sm(p)) * 24)})">${R(130, y - 78, 820, 124, 'rgba(3,29,24,.9)', 62, `stroke="${c}" stroke-width="5"`)}${T(540, y + 4, txt, K.white, 76, 800)}</g>`;
  s += big(760, 'Cepat lelah', p1, K.mint) + big(930, 'Sesak', p2, K.gold) + `</g>`;
  s += `<g opacity="${f1(a)}">${T(540, 1288, 'Rujukan: American Heart Association (tanda dan gejala gagal jantung)', K.mute, 24, 600)}</g>` + DISC(a);
  return s;
}
function shotTutup(t) {
  const S = C.shots.tutup, u = (t - S.out[0]) / (S.out[1] - S.out[0]), a = clamp((t - S.out[0]) / 0.4);
  const z = 1 + 0.06 * sm(u), w = 1020 * z, dst = { x: 540 - w / 2, y: 540, w, h: w * SH / SW };
  const dst2 = { x: 30, y: 540, w: 1020, h: 1020 * SH / SW };
  let s = `<g opacity="${f1(a)}">` + R(190, 262, 700, 120, 'rgba(248,247,243,.97)', 36) + `<image href="${need('../stage/logo-full.webp')}" x="290" y="272" width="500" height="100" preserveAspectRatio="xMidYMid meet"/>`;
  s += `<clipPath id="cT"><rect x="${f1(dst2.x)}" y="${f1(dst2.y)}" width="${f1(dst2.w)}" height="${f1(dst2.h)}" rx="26"/></clipPath><g clip-path="url(#cT)"><image href="${need(frameUrl(S.clip, srcT(S, t)))}" x="${f1(540 - w / 2)}" y="${f1(540 - (w - 1020) * 0.1)}" width="${f1(w)}" height="${f1(dst.h)}" preserveAspectRatio="none"/></g><rect x="30" y="540" width="1020" height="${f1(dst2.h)}" rx="26" fill="none" stroke="rgba(124,224,184,.6)" stroke-width="3"/>`;
  s += `</g>`;
  const h1 = clamp((t - S.out[0] - 0.2) / 0.4), h2 = clamp((t - S.out[0] - 0.8) / 0.4);
  s += `<g opacity="${f1(sm(h1))}">${T(540, 466, 'Eksplorasi patologi gratis', K.white, 60, 800, 'middle', 'stroke="rgba(3,29,24,.55)" stroke-width="8" paint-order="stroke"')}</g>`;
  s += `<g opacity="${f1(sm(h2))}" transform="translate(0 ${f1((1 - sm(h2)) * 22)})">${R(240, 1190, 600, 120, K.gold, 60)}${T(540, 1267, 'medcoel.com', K.ink, 66, 800)}</g>`;
  s += DISC(a);
  return s;
}
// ------------------------------------------------------------------ penanda posisi voice-over (rough cut, ?vo=1)
function voMarkers(t) {
  const cur = C.vo.find((v) => t >= v.t[0] && t < v.t[1]); let s = '';
  s += `<g>${R(0, 0, 1080, 14, 'rgba(0,0,0,.4)')}${C.vo.map((v) => R(v.t[0] / C.dur * 1080, 0, (v.t[1] - v.t[0]) / C.dur * 1080, 14, 'rgba(248,192,56,.9)')).join('')}${R(t / C.dur * 1080 - 2, 0, 4, 14, '#fff')}</g>`;
  if (cur) s += `<g>${R(30, 40, 1020, 150, 'rgba(180,0,40,.88)', 18)}${T(60, 92, `● POSISI VOICE-OVER ${cur.id.toUpperCase()}  ·  ${cur.t[0].toFixed(1)}–${cur.t[1].toFixed(1)} dtk`, '#fff', 30, 800, 'start')}${T(60, 142, cur.usul.length > 62 ? cur.usul.slice(0, 60) + '…' : cur.usul, '#FFE9EE', 26, 600, 'start')}</g>`;
  else s += `<g>${R(30, 40, 560, 52, 'rgba(0,0,0,.55)', 14)}${T(52, 76, 'rough cut · tanpa narator', '#ddd', 26, 700, 'start')}</g>`;
  return s;
}
// ------------------------------------------------------------------ rakit
function compose(t) {
  NEED = []; let s = bg(t); const sh = C.shots; let body = '';
  const inRange = (x) => t >= x.out[0] - 1e-6 && t < x.out[1];
  if (inRange(sh.hook)) body += shotHook(t);
  if (inRange(sh.pilih)) body += shotPilih(t);
  if (inRange(sh.lv)) body += shotLV(t);
  if (inRange(sh.tombol)) body += shotTombol(t);
  if (inRange(sh.banding)) body += shotBanding(t);
  if (inRange(sh.gejala)) body += shotGejala(t);
  if (inRange(sh.tutup)) body += shotTutup(t);
  s += `<g transform="translate(0 70)">${body}</g>`;
  if (VO) s += voMarkers(t);
  return s;
}
window.renderFrame = async (t) => {
  const s = compose(Math.min(t, C.dur - 1e-3)); await Promise.all(NEED.map(load));
  $('scene').innerHTML = s;
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
};
window.__ready = true;

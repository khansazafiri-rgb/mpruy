// Promo MEDCOEL "Satu bab dulu" (1080 x 1920, 30 fps, 40,0 dtk). Animasi: latar piksel + Raka/Nilo/Kila vektor asli; lalu rekaman web MEDCOEL asli.
import { f1, clamp, lerp, sm, eo, eio, MC, FONT } from './core.js';
import { loadMascots } from './mascot.js';
import { rasterize, blit, mergeData, clipB, mkCanvas, GW, GH, inB, MB, MC_, MR } from './pix.js';
import { DUR, S, TR, SEG } from './timeline.mjs';
import * as SC from './scenes.js';
const $ = (id) => document.getElementById(id);
await document.fonts.load('800 40px "Plus Jakarta Sans"'); await document.fonts.load('700 30px "Plus Jakarta Sans"'); await document.fonts.load('700 40px Caveat'); await document.fonts.ready;
await loadMascots();
export { DUR };
const WEB = '/video/promo-satu-bab/rekam/web';
const q = new URLSearchParams(location.search);
// jadwal adegan animasi: [mulai, nama]
const SCN = [[0, 'desk'], [3, 'kuliah'], [5, 'lab'], [7, 'kasus'], [9, 'kelompok'], [11, 'pulang'], [12.3, 'laptop']];
const FN = { desk: SC.sceneDesk, kuliah: SC.sceneKuliah, lab: SC.sceneLab, kasus: SC.sceneKasus, kelompok: SC.sceneKelompok, pulang: SC.scenePulang, laptop: SC.sceneLaptop };
const sceneAt = (t) => { let i = 0; for (let k = 0; k < SCN.length; k++) if (t >= SCN[k][0]) i = k; return i; };
const cb = $('cb'), cf = $('cf'), sm_ = $('sm'), st_ = $('st'), cam = $('cam'), webC = $('web'), ov = $('ov');
const wctx = webC.getContext('2d');
const cache = new Map();
const loadImg = (u) => { if (!cache.has(u)) { const im = new Image(); im.src = u; cache.set(u, im.decode().then(() => im).catch(() => null)); } return cache.get(u); };
const pad = (i) => String(i).padStart(4, '0');
function webAt(t) {
  let s = SEG.find((x) => t >= x[0] && t < x[1]) || (t < SEG[0][0] ? SEG[0] : SEG[SEG.length - 1]);
  const u = clamp((t - s[0]) / (s[1] - s[0])), fr = Math.round(lerp(s[3], s[4], u));
  return `${WEB}/${s[2]}/f${pad(fr)}.jpg`;
}
const blank = () => new ImageData(GW, GH);
let lastBack = null;
async function layers(name, t) { return FN[name](t); }
/** satu bingkai animasi (adegan 1 - 4) */
async function animFrame(t) {
  const i = sceneAt(t), cur = SCN[i], prev = i > 0 ? SCN[i - 1] : null;
  const k = prev ? clamp((t - cur[0]) / TR) : 1;
  const B = await layers(cur[1], t);
  if (!prev || k >= 1) {
    const [db, df] = await Promise.all([rasterize(B.back), rasterize(B.front, { alpha: true })]);
    blit(cb, db); blit(cf, df); sm_.innerHTML = B.mid; st_.innerHTML = B.top; return;
  }
  const A = await layers(prev[1], t);
  const [dbA, dbB, dfA, dfB] = await Promise.all([rasterize(A.back), rasterize(B.back), rasterize(A.front, { alpha: true }), rasterize(B.front, { alpha: true })]);
  blit(cb, mergeData(dbA, dbB, k)); blit(cf, mergeData(dfA, dfB, k));
  const wrap = (a, b) => `<defs>${clipB('mkB', k)}${clipB('mkA', k, true)}</defs><g clip-path="url(#mkA)">${a}</g><g clip-path="url(#mkB)">${b}</g>`;
  sm_.innerHTML = wrap(A.mid, B.mid); st_.innerHTML = wrap(A.top, B.top);
}
function setCam(t) {
  const L = SC.LAPTOP, cx = L.x + L.w / 2, cy = L.y + L.h / 2, k = eio(clamp((t - 19.3) / 0.7)), s = lerp(1, 1080 / L.w * 1.02, k);
  cam.style.transform = `translate(${f1(cx - cx * s)}px,${f1(cy - cy * s)}px) scale(${f1(s * 1000) / 1000})`;
  return { s, cx, cy, k };
}
async function drawWeb(t, rect, mosaic = 1) {
  const im = await loadImg(webAt(t)); wctx.clearRect(0, 0, 1080, 1920); if (!im) return;
  wctx.save(); wctx.beginPath(); wctx.rect(rect.x, rect.y, rect.w, rect.h); wctx.clip();
  const sc = rect.w / 1080, hh = 1920 * sc, y0 = rect.y + rect.h / 2 - hh / 2;
  if (mosaic > 1) { const sw = Math.max(4, Math.round(rect.w / mosaic)), shh = Math.max(4, Math.round(hh / mosaic)), tmp = mkCanvas(sw, shh); tmp.getContext('2d').drawImage(im, 0, 0, sw, shh); wctx.imageSmoothingEnabled = false; wctx.drawImage(tmp, rect.x, y0, rect.w, hh); }
  else { wctx.imageSmoothingEnabled = true; wctx.imageSmoothingQuality = 'high'; wctx.drawImage(im, rect.x, y0, rect.w, hh); }
  wctx.restore();
}
export async function renderFrame(t) {
  const web = t >= 19.3;
  if (t < 20.0) { await animFrame(t); } else { cam.style.display = 'none'; }
  if (t < 19.3) { webC.style.display = 'none'; cam.style.display = 'block'; cam.style.transform = 'none'; ov.innerHTML = ''; return; }
  const { s, cx, cy, k } = setCam(t); webC.style.display = 'block';
  const L = SC.LAPTOP, base = { x: cx + (L.x - cx) * s, y: cy + (L.y - cy) * s, w: L.w * s, h: L.h * s };
  if (t < 20.0) {
    const e = eio(clamp((t - 19.5) / 0.5)), rect = { x: lerp(base.x, 0, e), y: lerp(base.y, 0, e), w: lerp(base.w, 1080, e), h: lerp(base.h, 1920, e) };
    await drawWeb(t, { x: rect.x, y: rect.y, w: rect.w, h: rect.h }, Math.max(1, Math.round(lerp(26, 1, clamp((t - 19.5) / 0.5)))));
    ov.innerHTML = ''; return;
  }
  await drawWeb(t, { x: 0, y: 0, w: 1080, h: 1920 }, 1);
  if (t >= 32.0 && t < 32.0 + TR) {   // mosaik web -> web (balik ke beranda)
    const A = await loadImg(webAt(31.99)), B = await loadImg(webAt(t)), kk = (t - 32.0) / TR;
    wctx.clearRect(0, 0, 1080, 1920); wctx.drawImage(A, 0, 0, 1080, 1920); wctx.save(); wctx.beginPath();
    for (let j = 0; j < MR; j++) for (let i = 0; i < MC_; i++) if (inB(i, j, kk)) wctx.rect(i * MB, j * MB, MB, MB);
    wctx.clip(); wctx.drawImage(B, 0, 0, 1080, 1920); wctx.restore();
  }
  ov.innerHTML = SC.overlay ? SC.overlay(t) : '';
}
window.renderFrame = renderFrame; window.__ready = true;
if (q.has('cover')) {
  const C = SC.sceneCover(); const [db, df] = await Promise.all([rasterize(C.back), rasterize(C.front, { alpha: true })]);
  blit(cb, db); blit(cf, df); sm_.innerHTML = C.mid; st_.innerHTML = C.top; cam.style.transform = 'none'; webC.style.display = 'none';
  const im = new Image(); im.src = `${WEB}/pilih/f0070.jpg`; await im.decode().catch(() => {});
}
if (q.has('t')) await renderFrame(+q.get('t'));

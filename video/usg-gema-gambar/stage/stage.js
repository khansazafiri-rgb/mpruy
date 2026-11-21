// Panggung video "USG: dari gema jadi gambar" — renderFrame(t) deterministik. t = detik video; tn = t - OFF = detik narasi.
import { f1, clamp } from './lib.js';
import { renderBmode } from './body.js';
import * as S from './scenes.js';
await document.fonts.load('800 40px "Plus Jakarta Sans"'); await document.fonts.load('700 30px "Plus Jakarta Sans"'); await document.fonts.ready;
const $ = (id) => document.getElementById(id);
const REK = '../rekam/';
const cache = new Map();
const loadImg = (u) => { if (!cache.has(u)) { const im = new Image(); im.src = u; cache.set(u, im.decode().then(() => im).catch(() => null)); } return cache.get(u); };
const rr = (c, x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
export async function renderFrame(t) {
  const out = t === 'cover' ? await S.cover() : await S.frame(t);
  $('A').innerHTML = out.A || ''; $('U').innerHTML = out.U || '';
  const bm = $('bm').getContext('2d'); bm.clearRect(0, 0, 1080, 1920);
  for (const b of out.bm || []) { if (b.alpha != null) bm.globalAlpha = b.alpha; renderBmode(bm, b.dst, b.pose, b.o || {}); bm.globalAlpha = 1; }
  const wc = $('web').getContext('2d'); wc.clearRect(0, 0, 1080, 1920);
  for (const w of out.web || []) await drawWeb(wc, w);
}
async function drawWeb(c, w) {
  c.save(); c.globalAlpha = w.alpha ?? 1;
  if (w.clip) { const r = w.clip; rr(c, r.x, r.y, r.w, r.h, r.r ?? 0); c.clip(); }
  if (w.kind === 'lab') {   // dua kanvas ASLI Live 4D Lab: pasien 3D (probe di tubuh) dan monitor USG
    const n = String(w.idx).padStart(4, '0'), [a, m] = await Promise.all([loadImg(`${REK}lab/${w.take}/a/f${n}.jpg`), loadImg(`${REK}lab/${w.take}/m/f${n}.png`)]);
    const y0 = w.y ?? 0, p3 = w.p3, pu = w.pu;
    if (a) c.drawImage(a, p3.sx, p3.sy, p3.sw, p3.sh, p3.x, y0 + p3.y, p3.w, p3.h);
    c.fillStyle = '#04090B'; c.fillRect(pu.x, y0 + pu.y, pu.w, pu.h);
    if (m) c.drawImage(m, pu.sx, pu.sy, pu.sw, pu.sh, pu.x + pu.dx, y0 + pu.y + pu.dy, pu.dw, pu.dh);
  } else if (w.kind === 'img') {
    const im = await loadImg(w.src); if (im) { const r = w.rect; if (w.sc) c.drawImage(im, w.sc.x, w.sc.y, w.sc.w, w.sc.h, r.x, r.y, r.w, r.h); else c.drawImage(im, r.x, r.y, r.w, r.h); }
  }
  c.restore();
}
window.renderFrame = renderFrame; window.__ready = true;
const q = new URLSearchParams(location.search);
if (q.has('t')) await renderFrame(+q.get('t'));
if (q.has('cover')) await renderFrame('cover');

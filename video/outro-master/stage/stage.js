// Panggung outro master MEDCOEL: renderFrame(v) deterministik, v = detik dari awal file (0 ... DUR).
import * as S from './scene.js';
await document.fonts.load('800 40px "Plus Jakarta Sans"'); await document.fonts.load('700 30px "Plus Jakarta Sans"'); await document.fonts.ready;
const $ = (id) => document.getElementById(id);
const cache = new Map();
const loadImg = (u) => { if (!cache.has(u)) { const im = new Image(); im.src = u; cache.set(u, im.decode().then(() => im).catch(() => null)); } return cache.get(u); };
const rr = (c, x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
export async function renderFrame(v) {
  const out = S.frame(v);
  $('A').innerHTML = out.A || ''; $('U').innerHTML = out.U || '';
  const wc = $('web').getContext('2d'); wc.clearRect(0, 0, 1080, 1920);
  for (const w of out.web || []) await drawWeb(wc, w);
}
async function drawWeb(c, w) {
  c.save(); c.globalAlpha = w.alpha ?? 1;
  if (w.clip) { const r = w.clip; rr(c, r.x, r.y, r.w, r.h, r.r ?? 0); c.clip(); }
  if (w.kind === 'lab') {   // dua kanvas ASLI Live 4D Lab (pasien 3D + monitor USG)
    const [a, m] = await Promise.all([loadImg(w.a), loadImg(w.m)]), p3 = w.p3, pu = w.pu;
    c.fillStyle = '#04090B'; c.fillRect(p3.x, p3.y, p3.w, p3.h);
    if (a) c.drawImage(a, p3.sx, p3.sy, p3.sw, p3.sh, p3.x, p3.y, p3.w, p3.h);
    c.fillStyle = '#04090B'; c.fillRect(pu.x, pu.y, pu.w, pu.h);
    if (m) c.drawImage(m, 0, 0, m.naturalWidth, m.naturalHeight, pu.x, pu.y, pu.w, pu.h);
  } else if (w.kind === 'img') {
    const im = await loadImg(w.src); if (im) { const r = w.rect, s = w.sc; c.imageSmoothingQuality = 'high'; c.drawImage(im, s.x, s.y, s.w, s.h, r.x, r.y, r.w, r.h); }
  }
  c.restore();
}
window.renderFrame = renderFrame; window.__ready = true;
const q = new URLSearchParams(location.search);
if (q.has('t')) await renderFrame(+q.get('t'));

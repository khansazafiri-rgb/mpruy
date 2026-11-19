// Panggung video "Bagaimana penjepit jari bisa membaca SpO2?" — renderFrame(t) deterministik. t = detik video; tn = t - OFF = detik narasi.
import { f1, clamp } from './lib.js';
import * as S from './scenes.js';
await document.fonts.load('800 40px "Plus Jakarta Sans"'); await document.fonts.load('700 30px "Plus Jakarta Sans"'); await document.fonts.load('700 40px Caveat'); await document.fonts.ready;
const $ = (id) => document.getElementById(id);
const WEB = '../rekam/web';
const cache = new Map();
const loadImg = (u) => { if (!cache.has(u)) { const im = new Image(); im.src = u; cache.set(u, im.decode().then(() => im).catch(() => null)); } return cache.get(u); };
const rr = (c, x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
export async function renderFrame(t) {
  const out = await S.frame(t);
  $('A').innerHTML = out.A || ''; $('B').innerHTML = out.B || ''; $('U').innerHTML = out.U || '';
  const cv = $('web'), c = cv.getContext('2d');
  if (out.web) {
    cv.style.display = 'block'; c.clearRect(0, 0, 1080, 1920);
    const im = await loadImg(`${WEB}/f${String(out.web.frame + 1).padStart(4, '0')}.jpg`);
    if (im) { const r = out.web.rect; c.save(); c.globalAlpha = out.web.a; rr(c, r.x, r.y, r.w, r.h, 24); c.clip(); c.imageSmoothingQuality = 'high'; c.drawImage(im, r.x, r.y, r.w, r.h); c.restore(); }
  } else cv.style.display = 'none';
}
window.renderFrame = renderFrame; window.__ready = true;
const q = new URLSearchParams(location.search);
if (q.has('cover')) { const c = S.coverFrame(); $('A').innerHTML = ''; $('B').innerHTML = c.B; $('U').innerHTML = c.U; $('web').style.display = 'none'; }
if (q.has('t')) await renderFrame(+q.get('t'));

// Panel rekaman layar ASLI MEDCOEL (bingkai JPG hasil ekstrak, lihat README). Tidak ada UI yang digambar ulang.
// Sumber = deretan bingkai; tampilan (s, cx, cy) = skala layar-per-css-px dan titik sumber (css px) yang berada di tengah panel.
const $ = (id) => document.getElementById(id);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const f1 = (n) => Math.round(n * 10) / 10;
const rec = (dir, n, first = 1, h = 1582, w = 2816, dpr = 2) => ({ dir, n, first, w, h, dpr });
export const CLIPS = {
  // rekaman web asli (akun demo lokal, data uji) lewat rekam/web.cjs: alur = Chat Admin di iPad (820 x 1100, skala 1,7), baca = Drilling > materi di laptop (1280 x 800, skala 2)
  alur: rec('web/alur', 464, 0, 1870, 1394, 1.7), baca: rec('web/baca', 424, 0, 1600, 2560, 2),
};
const pool = new Map(); let used = new Set(); export let loads = [];
export function beginFrame() { used = new Set(); loads = []; }
export function endFrame() { for (const [id, p] of pool) if (!used.has(id)) p.d.style.display = 'none'; }
export function panel(id, o) {
  used.add(id); let p = pool.get(id);
  if (!p) { const d = document.createElement('div'); d.className = 'panel'; const im = document.createElement('img'); im.decoding = 'sync'; d.appendChild(im); $('panels').appendChild(d); p = { d, im, src: '' }; pool.set(id, p); }
  const c = CLIPS[o.clip], fi = clamp(Math.round(o.f), 0, c.n - 1), url = `media/${c.dir}/f${String(c.first + fi).padStart(4, '0')}.jpg`;
  if (p.src !== url) { p.src = url; p.im.src = url; loads.push(p.im.decode().catch(() => {})); }
  const [x, y, w, h] = o.rect, [s, cx, cy] = o.view, d = p.d.style; const bz = o.bezel;
  d.display = 'block'; d.left = f1(x) + 'px'; d.top = f1(y) + 'px'; d.width = f1(w) + 'px'; d.height = f1(h) + 'px'; d.borderRadius = (o.r ?? 28) + 'px'; d.opacity = o.a ?? 1;
  d.boxShadow = o.noShadow ? 'none' : '0 0 0 6px #fff, 0 18px 40px rgba(0,0,0,.45)';
  const k = o.k ?? 1; d.transform = k !== 1 ? `scale(${k.toFixed(3)})` : 'none'; d.transformOrigin = `${f1(w / 2)}px ${f1(h / 2)}px`;
  p.im.style.width = c.w + 'px'; p.im.style.height = c.h + 'px';
  p.im.style.transform = `translate(${f1(w / 2 - cx * s)}px,${f1(h / 2 - cy * s)}px) scale(${(s / (c.dpr || 2)).toFixed(4)})`;
}
export const fr = (t, t0, speed, off = 0) => (t - t0) * 30 * speed + off; // nomor bingkai sumber

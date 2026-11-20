// 2D image engine (radiographs, ultrasound frames): zoom/pan, brightness-contrast, ruler (mm only with calibrated
// spacing), polygon annotation overlay and image-space hit testing.
import { pointInPolygon, measure } from './geometry.js';

export function createImageViewer(container, { onState = () => {} } = {}) {
  const canvas = document.createElement('canvas'); container.append(canvas);
  const ctx = canvas.getContext('2d');
  let img = null, meta = null, ann = [], showAnn = false, zoom = 1, pan = [0, 0], contrast = 1, brightness = 1, ruler = false, pts = [], click = null, drag = null;
  const state = () => ({ zoom, contrast, brightness, showAnnotations: showAnn, lastMeasure: pts.length === 2 ? measure(pts[0], pts[1], meta?.pixelSpacingMm) : null, lastClick: click, hit: click ? hitAt(click) : null });
  const emit = () => onState(state());
  function hitAt(p) { const a = ann.find(r => pointInPolygon(p, r.polygon)); return a ? a.id : null; }
  function fit() { if (!img) return; const s = Math.min(canvas.width / img.width, canvas.height / img.height); return s; }
  function toImage(cx, cy) { const s = fit() * zoom, ox = (canvas.width - img.width * s) / 2 + pan[0], oy = (canvas.height - img.height * s) / 2 + pan[1]; return [(cx - ox) / s, (cy - oy) / s]; }
  function toCanvas([x, y]) { const s = fit() * zoom, ox = (canvas.width - img.width * s) / 2 + pan[0], oy = (canvas.height - img.height * s) / 2 + pan[1]; return [ox + x * s, oy + y * s]; }
  function draw() {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (!img) return;
    const s = fit() * zoom, [ox, oy] = toCanvas([0, 0]);
    ctx.filter = 'brightness(' + brightness + ') contrast(' + contrast + ')'; ctx.drawImage(img, ox, oy, img.width * s, img.height * s); ctx.filter = 'none';
    if (showAnn) for (const r of ann) { ctx.beginPath(); r.polygon.forEach((p, i) => { const [x, y] = toCanvas(p); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.closePath(); ctx.strokeStyle = '#ffd400'; ctx.lineWidth = 2 * devicePixelRatio; ctx.stroke(); }
    if (pts.length) { ctx.strokeStyle = '#19d39a'; ctx.lineWidth = 2 * devicePixelRatio; ctx.beginPath(); pts.forEach((p, i) => { const [x, y] = toCanvas(p); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); ctx.fillStyle = '#19d39a'; ctx.fillRect(x - 3, y - 3, 6, 6); }); ctx.stroke(); }
  }
  const resize = () => { const r = container.getBoundingClientRect(); canvas.width = Math.max(320, r.width) * devicePixelRatio; canvas.height = Math.max(240, r.height) * devicePixelRatio; canvas.style.width = '100%'; canvas.style.height = '100%'; draw(); };
  const ro = new ResizeObserver(resize); ro.observe(container); resize();
  const local = e => { const r = canvas.getBoundingClientRect(); return [(e.clientX - r.left) * devicePixelRatio, (e.clientY - r.top) * devicePixelRatio]; };
  canvas.addEventListener('pointerdown', e => { drag = { start: local(e), pan: pan.slice(), moved: false }; });
  canvas.addEventListener('pointermove', e => { if (!drag || ruler) return; const p = local(e); if (Math.hypot(p[0] - drag.start[0], p[1] - drag.start[1]) > 4) { drag.moved = true; pan = [drag.pan[0] + p[0] - drag.start[0], drag.pan[1] + p[1] - drag.start[1]]; draw(); } });
  canvas.addEventListener('pointerup', e => {
    if (!img || !drag) return; const moved = drag.moved; drag = null; if (moved) { emit(); return; }
    const p = toImage(...local(e));
    if (ruler) { pts = pts.length >= 2 ? [p] : pts.concat([p]); } else click = p;
    draw(); emit();
  });
  canvas.addEventListener('wheel', e => { e.preventDefault(); zoom = Math.max(0.5, Math.min(8, zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15))); draw(); emit(); }, { passive: false });
  return {
    async load(url, metadata, annotations = []) { img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(Error('dataset unavailable: ' + url)); i.src = url; }); meta = metadata; ann = annotations; pts = []; click = null; zoom = 1; pan = [0, 0]; draw(); emit(); },
    setZoom(f) { zoom = Math.max(0.5, Math.min(8, zoom * f)); draw(); emit(); },
    setContrast(c, b) { contrast = c; brightness = b; draw(); emit(); },
    setAnnotations(on) { showAnn = !!on; draw(); emit(); },
    setRuler(on) { ruler = !!on; pts = []; draw(); emit(); },
    reset() { zoom = 1; pan = [0, 0]; contrast = 1; brightness = 1; pts = []; draw(); emit(); },
    imageToClient(p) { const r = canvas.getBoundingClientRect(), c = toCanvas(p); return [r.left + c[0] / devicePixelRatio, r.top + c[1] / devicePixelRatio]; },
    state, dispose() { ro.disconnect(); },
  };
}

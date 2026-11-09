// Imaging monitor (2D canvas): US / CT / split / tri-planar CT with zoom, pan, fit, 1:1 and an anatomy overlay.
// Display transforms never touch the imaging geometry.
const DIR = [['L', 'R'], ['P', 'A'], ['S', 'I']];
/** Patient direction letter for an LPS vector (dominant component). */
export function dirLetter(v) {
  let k = 0; for (let i = 1; i < 3; i++) if (Math.abs(v[i]) > Math.abs(v[k])) k = i;
  return v[k] >= 0 ? DIR[k][0] : DIR[k][1];
}

/**
 * Where an image of im.w x im.h pixels is drawn inside a panel (canvas pixels). Shared by drawing AND
 * hit-testing, so hover/click identification uses exactly the transform the user sees (zoom, pan, fit, 1:1,
 * resize, fullscreen, device pixel ratio).
 */
export function panelLayout(panel, im, view, dpr) {
  const pad = (panel.compact ? 22 : 34) * dpr;
  const fitS = Math.min((panel.w - 2 * pad) / im.w, (panel.h - 2 * pad) / im.h);
  const s = (view.mode === '1:1' ? dpr : fitS) * view.zoom;
  const dw = im.w * s, dh = im.h * s;
  const x0 = panel.x + (panel.w - dw) / 2 + view.panX * dpr, y0 = panel.y + Math.max(pad, (panel.h - dh) / 2) + view.panY * dpr;
  return { x0, y0, s, dw, dh };
}
/** Canvas pixel -> fractional image pixel (pixel centres at +0.5). */
export const canvasToImage = (L, cx, cy) => ({ px: (cx - L.x0) / L.s, py: (cy - L.y0) / L.s });
/** Image pixel -> canvas pixel. */
export const imageToCanvas = (L, px, py) => ({ x: L.x0 + px * L.s, y: L.y0 + py * L.s });

const TRI = { ax: { label: 'AKSIAL', color: '#ffd166' }, co: { label: 'KORONAL', color: '#7bd389' }, sa: { label: 'SAGITAL', color: '#7cc4ff' } };

export class Monitor {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d');
    this.view = { zoom: 1, panX: 0, panY: 0, mode: 'fit' };
    this.images = {}; this.meta = {}; this.layouts = {}; this.overlay = null;
    this.layers = {};
    this._interaction();
    new ResizeObserver(() => { this.resize(); this.draw(); }).observe(canvas.parentElement);
    this.resize();
  }
  resize() {
    const r = this.canvas.parentElement.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.max(10, Math.round(r.width * dpr)); this.canvas.height = Math.max(10, Math.round(r.height * dpr));
    this.canvas.style.width = r.width + 'px'; this.canvas.style.height = r.height + 'px'; this.dpr = dpr;
  }
  _layer(k) { return (this.layers[k] ||= document.createElement('canvas')); }
  setFrame(frame, meta) {
    const put = (k, im) => {
      const c = this._layer(k); if (c.width !== im.w || c.height !== im.h) { c.width = im.w; c.height = im.h; }
      c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(im.rgba), im.w, im.h), 0, 0);
      this.images[k] = { w: im.w, h: im.h, outsideFraction: im.outsideFraction };
    };
    for (const k of ['us', 'ct']) if (frame[k]) put(k, frame[k]);
    for (const t of frame.tri || []) put(t.key, t);
    this.meta = meta;
    this.draw();
  }
  /** Anatomy overlay: {level, rasters: {key: {groups, w, h, contours: Map}}, color(g), selected, hover, label(g), neutral} */
  setOverlay(o) { this.overlay = o; this.draw(); }
  fit() { this.view = { zoom: 1, panX: 0, panY: 0, mode: 'fit' }; this.draw(); }
  oneToOne() { this.view = { zoom: 1, panX: 0, panY: 0, mode: '1:1' }; this.draw(); }
  zoomBy(f) { this.view.zoom = Math.min(12, Math.max(0.25, this.view.zoom * f)); this.draw(); }

  _panels() {
    const W = this.canvas.width, H = this.canvas.height, d = this.meta.display || 'us', g = 3 * (this.dpr || 1);
    if (d === 'split') return [{ key: 'us', x: 0, y: 0, w: W / 2 - 2, h: H }, { key: 'ct', x: W / 2 + 2, y: 0, w: W / 2 - 2, h: H }];
    if (d === 'tri') {
      const w = W / 2 - g, h = H / 2 - g;
      return [{ key: 'ax', x: 0, y: 0, w, h, compact: true }, { key: 'co', x: W / 2 + g, y: 0, w, h, compact: true }, { key: 'sa', x: 0, y: H / 2 + g, w, h, compact: true }, { key: 'info', x: W / 2 + g, y: H / 2 + g, w, h, compact: true }];
    }
    return [{ key: d, x: 0, y: 0, w: W, h: H }];
  }
  planeOf(key) { return key === 'us' || key === 'ct' ? this.meta.plane : this.meta.tri?.planes?.[key]; }
  /** Client point -> {key, px, py, plane} if over an image (fractional image pixels), else null. */
  hitTest(clientX, clientY) {
    const r = this.canvas.getBoundingClientRect(), dpr = this.dpr || 1, cx = (clientX - r.left) * dpr, cy = (clientY - r.top) * dpr;
    for (const [key, L] of Object.entries(this.layouts)) {
      const p = L.panel; if (cx < p.x || cy < p.y || cx > p.x + p.w || cy > p.y + p.h) continue;
      const { px, py } = canvasToImage(L, cx, cy), im = this.images[key];
      if (!im || px < 0 || py < 0 || px >= im.w || py >= im.h) return { key, outside: true };
      return { key, px, py, w: im.w, h: im.h, plane: this.planeOf(key) };
    }
    return null;
  }
  draw() {
    const ctx = this.ctx, W = this.canvas.width, H = this.canvas.height, dpr = this.dpr || 1;
    ctx.fillStyle = '#04080b'; ctx.fillRect(0, 0, W, H); this.layouts = {};
    if (!this.meta.plane && !this.meta.tri) { ctx.fillStyle = '#7f9aa3'; ctx.font = `${14 * dpr}px system-ui`; ctx.fillText('Memuat volume…', 20 * dpr, 30 * dpr); return; }
    for (const p of this._panels()) p.key === 'info' ? this._drawInfo(p) : this._drawPanel(p);
  }
  _drawInfo(p) {
    const ctx = this.ctx, dpr = this.dpr || 1, t = this.meta.tri; if (!t) return;
    ctx.save(); ctx.fillStyle = '#081217'; ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = '#9ff3df'; ctx.font = `700 ${13 * dpr}px system-ui`; ctx.fillText('CT TRI-PLANAR (MPR)', p.x + 12 * dpr, p.y + 24 * dpr);
    ctx.font = `${12 * dpr}px ui-monospace, Menlo, monospace`; ctx.fillStyle = '#d9e6e6';
    const P = t.point;
    [`Titik silang (LPS mm)`, `  x (kiri+)      ${P[0].toFixed(1)}`, `  y (posterior+) ${P[1].toFixed(1)}`, `  z (superior+)  ${P[2].toFixed(1)}`].forEach((s, i) => ctx.fillText(s, p.x + 12 * dpr, p.y + (48 + 17 * i) * dpr));
    ctx.font = `${11.5 * dpr}px system-ui`; ctx.fillStyle = 'rgba(220,235,235,.85)';
    ['Klik pada satu bidang: pindahkan titik silang.', 'Scroll pada satu bidang: geser irisan itu (1 voxel).', 'Ctrl/⌘ + scroll: zoom. Seret: geser tampilan.', 'Bidang CT dalam koordinat pasien — bukan', 'geometri akuisisi USG.'].forEach((s, i) => ctx.fillText(s, p.x + 12 * dpr, p.y + (128 + 16 * i) * dpr));
    ctx.fillStyle = 'rgba(255,214,140,.92)'; ctx.fillText(this.ctCaption || 'CT sintetis · bukan data pasien', p.x + 12 * dpr, p.y + p.h - 12 * dpr);
    ctx.restore();
  }
  _drawPanel(p) {
    const ctx = this.ctx, im = this.images[p.key], dpr = this.dpr || 1, m = this.meta, plane = this.planeOf(p.key);
    ctx.save(); ctx.beginPath(); ctx.rect(p.x, p.y, p.w, p.h); ctx.clip();
    if (!im || !plane) { ctx.restore(); return; }
    const L = panelLayout(p, im, this.view, dpr); this.layouts[p.key] = { ...L, panel: p };
    const { x0, y0, s, dw, dh } = L;
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(this.layers[p.key], x0, y0, dw, dh);
    this._drawOverlay(p.key, this.layouts[p.key]);
    if (m.tri && TRI[p.key]) this._drawCrosshair(p.key, L, plane);
    const mmPerPx = plane.height / im.h;
    ctx.strokeStyle = 'rgba(160,220,210,.85)'; ctx.fillStyle = 'rgba(160,220,210,.95)'; ctx.lineWidth = 1 * dpr;
    ctx.font = `${11 * dpr}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    const xr = x0 + dw + 6 * dpr;
    for (let cm = 0; cm * 10 <= plane.height + 0.01; cm++) {
      const y = y0 + (cm * 10 / mmPerPx) * s;
      ctx.beginPath(); ctx.moveTo(xr, y); ctx.lineTo(xr + (cm % 5 === 0 ? 9 : 5) * dpr, y); ctx.stroke();
      if (cm % (plane.height > 120 ? (p.compact ? 5 : 2) : 1) === 0) ctx.fillText(String(cm), xr + 11 * dpr, y + 4 * dpr);
    }
    if (!p.compact) ctx.fillText('cm', xr + 8 * dpr, y0 - 8 * dpr);
    ctx.font = `600 ${12 * dpr}px system-ui, sans-serif`;
    const lines = TRI[p.key] ? m.tri.headers[p.key] : p.key === 'us' ? m.usHeader : m.ctHeader;
    lines?.forEach((t, i) => { ctx.fillStyle = i === 0 ? (TRI[p.key]?.color || '#9ff3df') : 'rgba(220,235,235,.9)'; ctx.fillText(t, p.x + 10 * dpr, p.y + (18 + 15 * i) * dpr); });
    ctx.font = `700 ${13 * dpr}px system-ui`;
    if (p.key === 'us' && plane.mode === 'clinical') { ctx.fillStyle = '#ff8a2a'; ctx.beginPath(); ctx.arc(x0 + 10 * dpr, y0 + 10 * dpr, 5 * dpr, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#ffd38a';
    const Lt = (v) => dirLetter(v), u = plane.u, v = plane.v;
    ctx.fillText(Lt(u.map((x) => -x)), x0 + 4 * dpr, y0 + dh * 0.62);
    ctx.fillText(Lt(u), x0 + dw - 14 * dpr, y0 + dh * 0.62);
    ctx.fillText(Lt(v.map((x) => -x)), x0 + dw / 2 - 4 * dpr, y0 - 6 * dpr);
    ctx.fillText(Lt(v), x0 + dw / 2 - 4 * dpr, Math.min(p.y + p.h - 22 * dpr, y0 + dh + 16 * dpr));
    const out = (TRI[p.key] ? im.outsideFraction : this.images.ct?.outsideFraction) ?? 0;
    if (out > 0.001 && (p.key === 'ct' || TRI[p.key] || plane.mode === 'free')) {
      ctx.fillStyle = 'rgba(190,40,40,.9)'; const txt = `${Math.round(out * 100)}% bidang di luar cakupan CT`;
      ctx.font = `700 ${12 * dpr}px system-ui`; const tw = ctx.measureText(txt).width;
      ctx.fillRect(p.x + p.w - tw - 22 * dpr, p.y + 8 * dpr, tw + 14 * dpr, 20 * dpr);
      ctx.fillStyle = '#fff'; ctx.fillText(txt, p.x + p.w - tw - 15 * dpr, p.y + 22 * dpr);
    }
    if (!p.compact) {
      ctx.font = `${11 * dpr}px system-ui`; ctx.fillStyle = 'rgba(255,214,140,.92)';
      ctx.fillText(p.key === 'us' ? 'SIMULASI USG EDUKATIF · bukan citra pasien · tidak untuk diagnosis' : (this.ctCaption || 'Reformat CT phantom sintetis · bukan data pasien'), p.x + 10 * dpr, p.y + p.h - 10 * dpr);
    }
    ctx.restore();
  }
  /** Contours/selection drawn in image-pixel space through the panel transform (sub-pixel vertices). */
  _drawOverlay(key, L) {
    const o = this.overlay, ctx = this.ctx, dpr = this.dpr || 1;
    const R = o?.rasters?.[key === 'us' || key === 'ct' ? 'main' : key];
    if (!o || o.level === 'off' || !R) return;
    const showAll = o.level === 'contours' || o.level === 'guided' || o.level === 'challenge';
    ctx.save(); ctx.translate(L.x0, L.y0); ctx.scale(L.s, L.s);
    const stroke = (g, width, color, alpha = 1) => {
      const seg = R.contours.get(g); if (!seg) return;
      ctx.beginPath(); for (let i = 0; i < seg.length; i += 4) { ctx.moveTo(seg[i], seg[i + 1]); ctx.lineTo(seg[i + 2], seg[i + 3]); }
      ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = width / L.s; ctx.lineCap = 'round'; ctx.stroke(); ctx.globalAlpha = 1;
    };
    if (showAll) for (const g of R.contours.keys()) if (g !== o.selected) stroke(g, 1.1 * dpr, o.level === 'challenge' ? '#e8f1f2' : o.color(g), o.level === 'challenge' ? 0.55 : 0.85);
    const emph = o.selected > 0 ? o.selected : o.level === 'hover' ? o.hover : 0;
    if (emph > 0 && R.contours.has(emph)) {
      // translucent fill of the selected structure only (the rest of the scan stays untinted)
      const mask = R.mask?.(emph);
      if (mask) { ctx.globalAlpha = 0.28; ctx.imageSmoothingEnabled = true; ctx.drawImage(mask, 0, 0); ctx.globalAlpha = 1; }
      stroke(emph, 2.2 * dpr, o.color(emph), 1);
    } else if (o.hover > 0 && showAll && R.contours.has(o.hover)) stroke(o.hover, 2 * dpr, '#ffffff', 0.9);
    ctx.restore();
    // one label at most (guided): the selected structure, at its centroid, with a backing pill
    if (o.level === 'guided' && o.selected > 0 && R.centroid) {
      const c = R.centroid(o.selected); if (!c) return;
      // subtle label: translucent dark pill placed ABOVE the structure with a short leader line (never covers it)
      const p = imageToCanvas(L, c[0], c[1]), txt = o.label(o.selected);
      ctx.save(); ctx.font = `600 ${11 * dpr}px system-ui`; const tw = ctx.measureText(txt).width;
      const lx = p.x, ly = Math.max(L.panel.y + 14 * dpr, p.y - 34 * dpr);
      ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1 * dpr; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(lx, ly + 8 * dpr); ctx.stroke();
      ctx.fillStyle = 'rgba(10,22,28,.55)'; roundRect(ctx, lx - tw / 2 - 6 * dpr, ly - 8 * dpr, tw + 12 * dpr, 16 * dpr, 8 * dpr); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.95)'; ctx.fillText(txt, lx - tw / 2, ly + 4 * dpr); ctx.restore();
    }
  }
  _drawCrosshair(key, L, plane) {
    const t = this.meta.tri, ctx = this.ctx, dpr = this.dpr || 1, im = this.images[key];
    const q = [t.point[0] - plane.top[0], t.point[1] - plane.top[1], t.point[2] - plane.top[2]];
    const sx = q[0] * plane.u[0] + q[1] * plane.u[1] + q[2] * plane.u[2], dy = q[0] * plane.v[0] + q[1] * plane.v[1] + q[2] * plane.v[2];
    const px = ((sx + plane.width / 2) / plane.width) * im.w, py = (dy / plane.height) * im.h;
    const c = imageToCanvas(L, px, py);
    // each line is the trace of another plane: colour of that plane
    const others = Object.keys(TRI).filter((k) => k !== key);
    const vertical = others.find((k) => Math.abs(dot(t.planes[k].n, plane.u)) > 0.7), horizontal = others.find((k) => k !== vertical);
    ctx.save(); ctx.lineWidth = 1 * dpr; ctx.setLineDash([6 * dpr, 4 * dpr]);
    ctx.strokeStyle = TRI[vertical]?.color || '#fff'; ctx.beginPath(); ctx.moveTo(c.x, L.y0); ctx.lineTo(c.x, L.y0 + L.dh); ctx.stroke();
    ctx.strokeStyle = TRI[horizontal]?.color || '#fff'; ctx.beginPath(); ctx.moveTo(L.x0, c.y); ctx.lineTo(L.x0 + L.dw, c.y); ctx.stroke();
    ctx.restore();
  }
  _interaction() {
    const c = this.canvas; let drag = null;
    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (this.meta.display === 'tri' && !(e.ctrlKey || e.metaKey)) { const h = this.hitTest(e.clientX, e.clientY); if (h && h.key !== 'info') this.onSlice?.(h.key, e.deltaY < 0 ? 1 : -1); return; }
      this.zoomBy(e.deltaY < 0 ? 1.12 : 1 / 1.12);
    }, { passive: false });
    // touch: two fingers = pinch zoom (iPad/phone); one finger = pan / tap to identify
    const touches = new Map(); let pinch = null;
    const spread = () => { const p = [...touches.values()]; return Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y); };
    c.addEventListener('pointerdown', (e) => {
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touches.size === 2) { pinch = { d: spread(), zoom: this.view.zoom }; drag = null; return; }
      drag = { x: e.clientX, y: e.clientY, px: this.view.panX, py: this.view.panY, moved: false }; c.setPointerCapture(e.pointerId);
    });
    const lift = (e) => { touches.delete(e.pointerId); if (touches.size < 2) pinch = null; };
    c.addEventListener('pointercancel', lift);
    c.addEventListener('pointermove', (e) => {
      if (touches.has(e.pointerId)) touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && touches.size === 2) { this.view.zoom = Math.min(12, Math.max(0.25, pinch.zoom * spread() / Math.max(1, pinch.d))); this.draw(); return; }
      if (!drag) { this.onHover?.(this.hitTest(e.clientX, e.clientY), e); return; }
      if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 4) drag.moved = true;
      if (!drag.moved) return;
      c.style.cursor = 'move'; this.view.panX = drag.px + e.clientX - drag.x; this.view.panY = drag.py + e.clientY - drag.y; this.draw();
    });
    c.addEventListener('pointerup', (e) => { const wasPinch = !!pinch; lift(e); const d = drag; drag = null; c.style.cursor = ''; if (d && !d.moved && !wasPinch) this.onPick?.(this.hitTest(e.clientX, e.clientY), e); });
    c.addEventListener('pointerleave', () => { if (!drag) this.onHover?.(null); });
    c.addEventListener('dblclick', () => this.fit());
  }
}
function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Physiology strip: schematic ECG timing, PCG, respiration and antral activity over the last `span` seconds. */
export function drawStrip(canvas, traces, span) {
  const r = canvas.parentElement.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = Math.round(r.width * dpr), H = Math.round(r.height * dpr);
  if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; canvas.style.width = r.width + 'px'; canvas.style.height = r.height + 'px'; }
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#071015'; ctx.fillRect(0, 0, W, H);
  const rows = traces.length, rh = H / rows, left = 108 * dpr;
  traces.forEach((t, i) => {
    const y0 = i * rh, mid = y0 + rh / 2;
    ctx.fillStyle = 'rgba(255,255,255,.04)'; if (i % 2) ctx.fillRect(0, y0, W, rh);
    ctx.font = `600 ${11 * dpr}px system-ui`; ctx.fillStyle = t.color; ctx.fillText(t.label, 8 * dpr, mid - 2 * dpr);
    ctx.font = `${10 * dpr}px system-ui`; ctx.fillStyle = 'rgba(200,215,220,.75)'; if (t.value) ctx.fillText(t.value, 8 * dpr, mid + 12 * dpr);
    ctx.strokeStyle = t.color; ctx.lineWidth = 1.4 * dpr; ctx.beginPath();
    const n = t.data.length;
    for (let k = 0; k < n; k++) {
      const x = left + (k / (n - 1)) * (W - left - 8 * dpr), y = mid - t.data[k] * (rh * 0.42) * (t.scale || 1);
      if (t.envelope) { ctx.moveTo(x, mid - Math.abs(t.data[k]) * rh * 0.42); ctx.lineTo(x, mid + Math.abs(t.data[k]) * rh * 0.42); }
      else if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    for (const mk of t.markers || []) {
      const x = left + mk.f * (W - left - 8 * dpr);
      ctx.fillStyle = mk.color || t.color; ctx.font = `700 ${10 * dpr}px system-ui`; ctx.fillText(mk.text, x - 6 * dpr, y0 + 11 * dpr);
    }
  });
  ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.setLineDash([4 * dpr, 4 * dpr]);
  ctx.beginPath(); ctx.moveTo(W - 8 * dpr, 0); ctx.lineTo(W - 8 * dpr, H); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(200,215,220,.7)'; ctx.font = `${10 * dpr}px system-ui`; ctx.fillText(`${span} s · sekarang →`, W - 90 * dpr, H - 4 * dpr);
}

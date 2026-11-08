// Imaging monitor (2D canvas): US / CT / split display with zoom, pan, fit and 1:1.
// Display transforms never touch the imaging geometry.
const DIR = [['L', 'R'], ['P', 'A'], ['S', 'I']];
/** Patient direction letter for an LPS vector (dominant component). */
export function dirLetter(v) {
  let k = 0; for (let i = 1; i < 3; i++) if (Math.abs(v[i]) > Math.abs(v[k])) k = i;
  return v[k] >= 0 ? DIR[k][0] : DIR[k][1];
}

export class Monitor {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d');
    this.view = { zoom: 1, panX: 0, panY: 0, mode: 'fit' };
    this.images = {}; this.meta = {};
    this.layers = { us: document.createElement('canvas'), ct: document.createElement('canvas') };
    this._interaction();
    new ResizeObserver(() => { this.resize(); this.draw(); }).observe(canvas.parentElement);
    this.resize();
  }
  resize() {
    const r = this.canvas.parentElement.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.max(10, Math.round(r.width * dpr)); this.canvas.height = Math.max(10, Math.round(r.height * dpr));
    this.canvas.style.width = r.width + 'px'; this.canvas.style.height = r.height + 'px'; this.dpr = dpr;
  }
  setFrame(frame, meta) {
    for (const k of ['us', 'ct']) {
      const im = frame[k]; if (!im) continue;
      const c = this.layers[k]; if (c.width !== im.w || c.height !== im.h) { c.width = im.w; c.height = im.h; }
      c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(im.rgba), im.w, im.h), 0, 0);
      this.images[k] = { w: im.w, h: im.h, outsideFraction: im.outsideFraction };
    }
    this.meta = meta;
    this.draw();
  }
  fit() { this.view = { zoom: 1, panX: 0, panY: 0, mode: 'fit' }; this.draw(); }
  oneToOne() { this.view = { zoom: 1, panX: 0, panY: 0, mode: '1:1' }; this.draw(); }
  zoomBy(f) { this.view.zoom = Math.min(12, Math.max(0.25, this.view.zoom * f)); this.draw(); }

  _panels() {
    const W = this.canvas.width, H = this.canvas.height, d = this.meta.display || 'us';
    if (d === 'split') return [{ key: 'us', x: 0, y: 0, w: W / 2 - 2, h: H }, { key: 'ct', x: W / 2 + 2, y: 0, w: W / 2 - 2, h: H }];
    return [{ key: d, x: 0, y: 0, w: W, h: H }];
  }
  draw() {
    const ctx = this.ctx, W = this.canvas.width, H = this.canvas.height, dpr = this.dpr || 1;
    ctx.fillStyle = '#04080b'; ctx.fillRect(0, 0, W, H);
    if (!this.meta.plane) { ctx.fillStyle = '#7f9aa3'; ctx.font = `${14 * dpr}px system-ui`; ctx.fillText('Memuat volume…', 20 * dpr, 30 * dpr); return; }
    for (const p of this._panels()) this._drawPanel(p);
  }
  _drawPanel(p) {
    const ctx = this.ctx, im = this.images[p.key], dpr = this.dpr || 1, m = this.meta, plane = m.plane;
    ctx.save(); ctx.beginPath(); ctx.rect(p.x, p.y, p.w, p.h); ctx.clip();
    if (!im) { ctx.restore(); return; }
    const pad = 34 * dpr;
    const fitS = Math.min((p.w - 2 * pad) / im.w, (p.h - 2 * pad) / im.h);
    const s = (this.view.mode === '1:1' ? dpr : fitS) * this.view.zoom;
    const dw = im.w * s, dh = im.h * s;
    const x0 = p.x + (p.w - dw) / 2 + this.view.panX * dpr, y0 = p.y + Math.max(pad, (p.h - dh) / 2) + this.view.panY * dpr;
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(this.layers[p.key], x0, y0, dw, dh);
    const mmPerPx = plane.height / im.h; // vertical mm per image pixel
    // depth scale (cm) along the right edge of the image
    ctx.strokeStyle = 'rgba(160,220,210,.85)'; ctx.fillStyle = 'rgba(160,220,210,.95)'; ctx.lineWidth = 1 * dpr;
    ctx.font = `${11 * dpr}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    const xr = x0 + dw + 6 * dpr;
    for (let cm = 0; cm * 10 <= plane.height + 0.01; cm++) {
      const y = y0 + (cm * 10 / mmPerPx) * s;
      ctx.beginPath(); ctx.moveTo(xr, y); ctx.lineTo(xr + (cm % 5 === 0 ? 9 : 5) * dpr, y); ctx.stroke();
      if (cm % (plane.height > 120 ? 2 : 1) === 0) ctx.fillText(String(cm), xr + 11 * dpr, y + 4 * dpr);
    }
    ctx.fillText('cm', xr + 8 * dpr, y0 - 8 * dpr);
    // header text
    ctx.font = `600 ${12 * dpr}px system-ui, sans-serif`;
    const lines = p.key === 'us' ? m.usHeader : m.ctHeader;
    lines?.forEach((t, i) => { ctx.fillStyle = i === 0 ? '#9ff3df' : 'rgba(220,235,235,.9)'; ctx.fillText(t, p.x + 10 * dpr, p.y + (18 + 15 * i) * dpr); });
    // orientation: probe marker (US) or patient letters (CT)
    ctx.font = `700 ${13 * dpr}px system-ui`;
    if (p.key === 'us' && plane.mode === 'clinical') {
      ctx.fillStyle = '#ff8a2a'; ctx.beginPath(); ctx.arc(x0 + 10 * dpr, y0 + 10 * dpr, 5 * dpr, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#ffd38a';
    const L = (v) => dirLetter(v), u = plane.u, v = plane.v;
    // patient-direction letters just inside the image edges (fan corners are empty)
    ctx.fillText(L(u.map((x) => -x)), x0 + 4 * dpr, y0 + dh * 0.62);
    ctx.fillText(L(u), x0 + dw - 14 * dpr, y0 + dh * 0.62);
    ctx.fillText(L(v.map((x) => -x)), x0 + dw / 2 - 4 * dpr, y0 - 6 * dpr);
    ctx.fillText(L(v), x0 + dw / 2 - 4 * dpr, Math.min(p.y + p.h - 22 * dpr, y0 + dh + 16 * dpr));
    // out-of-volume indication
    const out = this.images.ct?.outsideFraction ?? 0;
    if (out > 0.001 && (p.key === 'ct' || plane.mode === 'free')) {
      ctx.fillStyle = 'rgba(190,40,40,.9)'; const txt = `${Math.round(out * 100)}% bidang di luar cakupan CT`;
      ctx.font = `700 ${12 * dpr}px system-ui`; const tw = ctx.measureText(txt).width;
      ctx.fillRect(p.x + p.w - tw - 22 * dpr, p.y + 8 * dpr, tw + 14 * dpr, 20 * dpr);
      ctx.fillStyle = '#fff'; ctx.fillText(txt, p.x + p.w - tw - 15 * dpr, p.y + 22 * dpr);
    }
    // footer disclaimer
    ctx.font = `${11 * dpr}px system-ui`; ctx.fillStyle = 'rgba(255,214,140,.92)';
    ctx.fillText(p.key === 'us' ? 'SIMULASI USG EDUKATIF · bukan citra pasien · tidak untuk diagnosis' : (this.ctCaption || 'Reformat CT phantom sintetis · bukan data pasien'), p.x + 10 * dpr, p.y + p.h - 10 * dpr);
    ctx.restore();
  }
  _interaction() {
    const c = this.canvas; let drag = null;
    c.addEventListener('wheel', (e) => { e.preventDefault(); this.zoomBy(e.deltaY < 0 ? 1.12 : 1 / 1.12); }, { passive: false });
    c.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, px: this.view.panX, py: this.view.panY }; c.setPointerCapture(e.pointerId); c.style.cursor = 'grabbing'; });
    c.addEventListener('pointermove', (e) => { if (!drag) return; this.view.panX = drag.px + e.clientX - drag.x; this.view.panY = drag.py + e.clientY - drag.y; this.draw(); });
    c.addEventListener('pointerup', () => { drag = null; c.style.cursor = 'grab'; });
    c.addEventListener('dblclick', () => this.fit());
  }
}

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

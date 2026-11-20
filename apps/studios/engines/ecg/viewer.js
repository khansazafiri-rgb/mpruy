// ECG engine: calibrated canvas rendering (25 mm/s, 10 mm/mV, 1 mm grid), 12-lead 3x4 overview, single-lead detail with
// time navigation and zoom, and two-point calipers that report milliseconds and the rate implied by an R-R interval.
import { detectRPeaks, heartRate, interval } from './wfdb.js';

export function createEcgViewer(container, { onState = () => {} } = {}) {
  const canvas = document.createElement('canvas');
  container.append(canvas);
  const ctx = canvas.getContext('2d');
  let rec = null, view = 'overview', lead = 'II', pxPerMm = 4, offsetS = 0, calipers = [], mv = {}, peaks = {};
  const state = () => ({ view, lead, zoom: pxPerMm / 4, offsetS, calipers: calipers.slice(), measurement: measurement(), hr: rec ? heartRate(peaks.II || [], rec.fs) : null });
  const emit = () => onState(state());
  function measurement() { if (!rec || calipers.length < 2) return null; return interval(calipers[0], calipers[1], rec.fs); }
  function load(record) {
    rec = record; mv = {}; peaks = {};
    for (const l of rec.leads) mv[l.lead] = Float32Array.from(l.adu, v => (v - l.baselineAdu) / l.gainAduPerMv);
    for (const name of Object.keys(mv)) peaks[name] = detectRPeaks(mv[name], rec.fs);
    calipers = []; offsetS = 0; draw(); emit();
  }
  function resize() { const r = container.getBoundingClientRect(); canvas.width = Math.max(320, r.width) * devicePixelRatio; canvas.height = Math.max(240, r.height) * devicePixelRatio; canvas.style.width = '100%'; canvas.style.height = '100%'; draw(); }
  function grid(x0, y0, w, h, mmPx) {
    ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, w, h); ctx.clip();
    for (let k = 0; k * mmPx <= w; k++) { ctx.strokeStyle = k % 5 ? '#f6c9c9' : '#e58b8b'; ctx.lineWidth = k % 5 ? 0.5 : 1; ctx.beginPath(); ctx.moveTo(x0 + k * mmPx, y0); ctx.lineTo(x0 + k * mmPx, y0 + h); ctx.stroke(); }
    for (let k = 0; k * mmPx <= h; k++) { ctx.strokeStyle = k % 5 ? '#f6c9c9' : '#e58b8b'; ctx.lineWidth = k % 5 ? 0.5 : 1; ctx.beginPath(); ctx.moveTo(x0, y0 + k * mmPx); ctx.lineTo(x0 + w, y0 + k * mmPx); ctx.stroke(); }
    ctx.restore();
  }
  function trace(name, x0, yMid, t0, t1, mmPx) {
    const s = mv[name], fs = rec.fs, pxPerS = 25 * mmPx, pxPerMv = 10 * mmPx;
    ctx.strokeStyle = '#111'; ctx.lineWidth = 1.2 * devicePixelRatio; ctx.beginPath();
    for (let i = Math.max(0, Math.floor(t0 * fs)); i < Math.min(s.length, Math.ceil(t1 * fs)); i++) { const x = x0 + (i / fs - t0) * pxPerS, y = yMid - s[i] * pxPerMv; i === Math.floor(t0 * fs) ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.stroke();
  }
  function calibration(x, yMid, mmPx) { ctx.strokeStyle = '#111'; ctx.lineWidth = 1.2 * devicePixelRatio; ctx.beginPath(); ctx.moveTo(x, yMid); ctx.lineTo(x + 1 * mmPx, yMid); ctx.lineTo(x + 1 * mmPx, yMid - 10 * mmPx); ctx.lineTo(x + 6 * mmPx, yMid - 10 * mmPx); ctx.lineTo(x + 6 * mmPx, yMid); ctx.lineTo(x + 7 * mmPx, yMid); ctx.stroke(); }
  function draw() {
    if (!rec) return;
    const W = canvas.width, H = canvas.height, dpr = devicePixelRatio;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
    ctx.font = 12 * dpr + 'px system-ui'; ctx.fillStyle = '#333';
    if (view === 'overview') {
      const mmPx = Math.min(W / (8 + 250), H / (4 * 30)) ; const rowH = H / 4, colW = (W - 8 * mmPx) / 4;
      grid(0, 0, W, H, mmPx);
      const layout = [['I', 'aVR', 'V1', 'V4'], ['II', 'aVL', 'V2', 'V5'], ['III', 'aVF', 'V3', 'V6']];
      layout.forEach((row, r) => { const y = rowH * (r + 0.5); calibration(1 * mmPx, y, mmPx); row.forEach((name, c) => { trace(name, 8 * mmPx + c * colW, y, c * 2.5, c * 2.5 + 2.5, mmPx); ctx.fillText(name, 8 * mmPx + c * colW + 4, y - 12 * mmPx); }); });
      calibration(1 * mmPx, rowH * 3.5, mmPx); trace('II', 8 * mmPx, rowH * 3.5, 0, 10, mmPx * 0.98); ctx.fillText('II (ritme 10 s)', 8 * mmPx + 4, rowH * 3.5 - 12 * mmPx);
      ctx.fillText('25 mm/s · 10 mm/mV', W - 140 * dpr, H - 6 * dpr);
    } else {
      const mmPx = pxPerMm * dpr, yMid = H / 2, x0 = 8 * mmPx, secs = (W - x0) / (25 * mmPx);
      grid(0, 0, W, H, mmPx); calibration(1 * mmPx, yMid, mmPx);
      trace(lead, x0, yMid, offsetS, offsetS + secs, mmPx);
      ctx.fillText(lead + ' · ' + offsetS.toFixed(2) + '–' + (offsetS + secs).toFixed(2) + ' s · 25 mm/s · 10 mm/mV', x0 + 4, 16 * dpr);
      calipers.forEach(i => { const x = x0 + (i / rec.fs - offsetS) * 25 * mmPx; ctx.strokeStyle = '#0a7'; ctx.lineWidth = 2 * dpr; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); });
      const m = measurement();
      if (m) { ctx.fillStyle = '#065'; ctx.fillText('Δ ' + Math.round(m.ms) + ' ms' + (m.bpmIfRr ? ' · bila R-R: ' + Math.round(m.bpmIfRr) + ' bpm' : ''), x0 + 4, 34 * dpr); }
    }
  }
  canvas.addEventListener('click', e => {
    if (!rec || view !== 'detail') return;
    const r = canvas.getBoundingClientRect(), mmPx = pxPerMm * devicePixelRatio, x = (e.clientX - r.left) * devicePixelRatio, x0 = 8 * mmPx;
    const sample = Math.round((offsetS + (x - x0) / (25 * mmPx)) * rec.fs);
    if (sample < 0 || sample >= rec.samples) return;
    calipers = calipers.length >= 2 ? [sample] : calipers.concat(sample); draw(); emit();
  });
  const ro = new ResizeObserver(resize); ro.observe(container); resize();
  return {
    load, state,
    setView(v, l) { view = v; if (l && mv[l]) lead = l; calipers = []; draw(); emit(); },
    zoom(f) { pxPerMm = Math.max(2, Math.min(16, pxPerMm * f)); draw(); emit(); },
    pan(dt) { if (!rec) return; offsetS = Math.max(0, Math.min(rec.samples / rec.fs - 1, offsetS + dt)); draw(); emit(); },
    setCalipers(a, b) { calipers = [a, b]; draw(); emit(); },
    peaks: name => (peaks[name] || []).slice(),
    sampleToClientX(sample) { const r = canvas.getBoundingClientRect(), mmPx = pxPerMm; return r.left + 8 * mmPx + (sample / rec.fs - offsetS) * 25 * mmPx; },
    dispose() { ro.disconnect(); },
  };
}

// WFDB reader (header + format 16 signal file) and ECG measurements. Pure: Node tools, tests and the browser.
// Keeps the physical meaning explicit: sampling frequency, ADC gain per mV, baseline, units and lead names.

/** Parse a WFDB .hea for a single-segment record. */
export function parseHeader(text) {
  const lines = String(text).split(/\r?\n/).filter(l => l.trim() && !l.startsWith('#'));
  const [name, nsig, fs, nsamp] = lines[0].trim().split(/\s+/);
  const signals = lines.slice(1, 1 + Number(nsig)).map(l => {
    const c = l.trim().split(/\s+/);
    const g = c[2].match(/^([\d.]+)(?:\((-?\d+)\))?(?:\/(\w+))?$/);
    if (!g) throw Error('WFDB_GAIN');
    return { file: c[0], format: Number(c[1]), gain: Number(g[1]), baseline: g[2] !== undefined ? Number(g[2]) : Number(c[4]), units: g[3] || 'mV', adcResolution: Number(c[3]), adcZero: Number(c[4]), initValue: Number(c[5]), checksum: Number(c[6]), blockSize: Number(c[7]), lead: c[8] };
  });
  if (signals.length !== Number(nsig)) throw Error('WFDB_SIGNAL_COUNT');
  return { name, fs: Number(fs), samples: Number(nsamp), signals };
}

/** Decode interleaved format-16 samples; verifies every column checksum from the header (16-bit two's complement sum). */
export function decodeFormat16(header, bytes) {
  const n = header.samples, k = header.signals.length;
  if (header.signals.some(s => s.format !== 16)) throw Error('WFDB_FORMAT');
  if (bytes.byteLength < n * k * 2) throw Error('WFDB_SHORT');
  const view = new DataView(bytes.buffer || bytes, bytes.byteOffset || 0, n * k * 2);
  const adu = header.signals.map(() => new Int16Array(n));
  for (let i = 0; i < n; i++) for (let s = 0; s < k; s++) adu[s][i] = view.getInt16((i * k + s) * 2, true);
  header.signals.forEach((sig, s) => {
    let sum = 0; for (let i = 0; i < n; i++) sum = (sum + adu[s][i]) | 0;
    const c = ((sum % 65536) + 65536) % 65536, expected = ((sig.checksum % 65536) + 65536) % 65536;
    if (c !== expected) throw Error('WFDB_CHECKSUM_' + sig.lead);
    if (adu[s][0] !== sig.initValue) throw Error('WFDB_INITIAL_VALUE_' + sig.lead);
  });
  return adu;
}

export const STANDARD_LEADS = ['I', 'II', 'III', 'AVR', 'AVL', 'AVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'];

/** Physical value in mV of an ADC sample. */
export const toMv = (adu, sig) => (adu - sig.baseline) / sig.gain;

/**
 * R-peak detection on one lead (band-pass by differencing + squared slope + moving window + adaptive threshold).
 * Engineering helper for teaching feedback, NOT a validated diagnostic algorithm.
 */
export function detectRPeaks(mv, fs) {
  const n = mv.length, d = new Float64Array(n), win = Math.max(1, Math.round(0.15 * fs)), integ = new Float64Array(n);
  for (let i = 2; i < n - 2; i++) { const v = (2 * mv[i + 2] + mv[i + 1] - mv[i - 1] - 2 * mv[i - 2]) / 8; d[i] = v * v; }
  let acc = 0; for (let i = 0; i < n; i++) { acc += d[i]; if (i >= win) acc -= d[i - win]; integ[i] = acc / win; }
  const sorted = Array.from(integ).sort((a, b) => a - b), thr = sorted[Math.floor(n * 0.98)] * 0.35;
  const refractory = Math.round(0.25 * fs), peaks = [];
  for (let i = 1; i < n - 1; i++) {
    if (integ[i] < thr || integ[i] < integ[i - 1] || integ[i] < integ[i + 1]) continue;
    // refine: largest absolute deflection within ±80 ms
    let best = i, lo = Math.max(0, i - Math.round(0.08 * fs)), hi = Math.min(n - 1, i + Math.round(0.08 * fs));
    for (let j = lo; j <= hi; j++) if (Math.abs(mv[j]) > Math.abs(mv[best])) best = j;
    if (peaks.length && best - peaks[peaks.length - 1] < refractory) { if (Math.abs(mv[best]) > Math.abs(mv[peaks[peaks.length - 1]])) peaks[peaks.length - 1] = best; continue; }
    peaks.push(best);
  }
  return peaks;
}

/** Heart rate from R-R intervals: 60 / mean RR (s). Also returns RR statistics (irregularity hint). */
export function heartRate(peaks, fs) {
  if (peaks.length < 2) return null;
  const rr = peaks.slice(1).map((p, i) => (p - peaks[i]) / fs);
  const mean = rr.reduce((a, b) => a + b, 0) / rr.length;
  const sd = Math.sqrt(rr.reduce((a, b) => a + (b - mean) ** 2, 0) / rr.length);
  return { bpm: 60 / mean, meanRrMs: mean * 1000, rrSdMs: sd * 1000, beats: peaks.length };
}

/** Caliper measurement between two sample indices. */
export const interval = (a, b, fs) => { const ms = Math.abs(b - a) / fs * 1000; return { ms, bpmIfRr: ms > 0 ? 60000 / ms : null }; };

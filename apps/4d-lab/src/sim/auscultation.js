// Virtual auscultation: SYNTHESISED educational sounds (no recordings, no licensing issues).
// Heart sounds are damped low-frequency transients timed by the SAME cardiac model that moves
// the heart (physiology.js), so sound, motion, ECG strip and images share one clock.
// Simplifications: no murmurs except where stated, no chest-wall filtering model beyond simple
// distance / lung attenuation, no stereo or stethoscope resonance modelling.
import { systoleSeconds, CARDIAC_TIMING } from './physiology.js';

export const SOUND_COMPONENTS = {
  M1: { label: 'M1 (mitral closure)', f: 45, h: 92, tau: 0.024, at: 'S1' },
  T1: { label: 'T1 (tricuspid closure)', f: 52, h: 104, tau: 0.02, at: 'S1' },
  A2: { label: 'A2 (aortic closure)', f: 70, h: 145, tau: 0.014, at: 'S2' },
  P2: { label: 'P2 (pulmonic closure)', f: 62, h: 125, tau: 0.013, at: 'S2' },
  S3: { label: 'S3 (early diastolic filling)', f: 30, h: 55, tau: 0.03, at: 'S3' },
};

/** Event times (s from beat onset). P2 splits later with inspiration (physiological splitting). */
export function heartEventTimes(T, { r = 0, s3 = false } = {}) {
  const Ts = systoleSeconds(T);
  const ev = { M1: 0.02, T1: 0.045, A2: Ts, P2: Ts + 0.015 + 0.035 * r };
  if (s3) ev.S3 = Ts + CARDIAC_TIMING.ivr + 0.11;
  return ev;
}

function burst(out, sr, t0, comp, amp) {
  const n0 = Math.round(t0 * sr), len = Math.round(comp.tau * 7 * sr);
  for (let i = 0; i < len && n0 + i < out.length; i++) {
    if (n0 + i < 0) continue;
    const t = i / sr;
    const env = (1 - Math.exp(-t / 0.003)) * Math.exp(-t / comp.tau);
    out[n0 + i] += amp * env * (Math.sin(2 * Math.PI * comp.f * t) + 0.35 * Math.sin(2 * Math.PI * comp.h * t + 0.7));
  }
}

/**
 * One cardiac cycle of heart sounds at a chest site.
 * @param weights {M1,T1,A2,P2,S3} site-dependent amplitudes (0..1)
 */
export function heartCycle({ T, r = 0, s3 = false, weights, sampleRate = 8000 }) {
  const out = new Float32Array(Math.max(1, Math.round(T * sampleRate)));
  const ev = heartEventTimes(T, { r, s3 });
  for (const [k, t] of Object.entries(ev)) burst(out, sampleRate, t, SOUND_COMPONENTS[k], weights[k] ?? 0);
  return { samples: out, events: ev };
}

// deterministic noise
function lcg(seed) { let s = seed >>> 0; return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296) * 2 - 1; }
/** Biquad band-pass (RBJ cookbook) applied in place. */
function bandpass(x, sr, f0, q) {
  const w = 2 * Math.PI * f0 / sr, al = Math.sin(w) / (2 * q), a0 = 1 + al;
  const b0 = al / a0, b2 = -al / a0, a1 = -2 * Math.cos(w) / a0, a2 = (1 - al) / a0;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) { const y = b0 * x[i] + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x[i]; y2 = y1; y1 = y; x[i] = y; }
  return x;
}

/** One respiratory cycle of vesicular breath sound (inspiration louder and longer than expiration). */
export function breathCycle({ period, amplitude = 1, sampleRate = 8000, seed = 1 }) {
  const n = Math.max(1, Math.round(period * sampleRate)), out = new Float32Array(n), rnd = lcg(seed);
  for (let i = 0; i < n; i++) out[i] = rnd();
  bandpass(out, sampleRate, 280, 0.9); bandpass(out, sampleRate, 220, 0.7);
  for (let i = 0; i < n; i++) {
    const ph = i / n;
    let env = 0;
    if (ph < 0.4) env = Math.sin(Math.PI * ph / 0.4) ** 0.8; // inspiration (flow-shaped)
    else if (ph < 0.62) env = 0.32 * Math.sin(Math.PI * (ph - 0.4) / 0.22); // early expiration, softer
    out[i] *= env * amplitude * 2.2;
  }
  return out;
}

/** A single bowel-sound gurgle (short, frequency-swept, irregular). */
export function bowelGurgle({ sampleRate = 8000, seed = 1, amplitude = 1 }) {
  const rnd = lcg(seed), dur = 0.15 + 0.35 * (rnd() * 0.5 + 0.5), n = Math.round(dur * sampleRate), out = new Float32Array(n);
  const f0 = 180 + 220 * (rnd() * 0.5 + 0.5), pulses = 3 + Math.round(4 * (rnd() * 0.5 + 0.5));
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate, ph = i / n;
    const pulse = Math.max(0, Math.sin(Math.PI * pulses * ph)) ** 2;
    out[i] = amplitude * 0.5 * pulse * Math.sin(2 * Math.PI * (f0 + 160 * ph) * t + 2 * rnd() * 0.05) * Math.sin(Math.PI * ph);
  }
  return out;
}

/**
 * Site-dependent mix at a chestpiece position (current-space contact + outward normal).
 * Heart components are weighted by distance to their classic auscultation areas and attenuated by
 * aerated lung between the chest wall and the heart; breath sound amplitude follows the fraction of
 * aerated lung directly under the chestpiece (fluid or collapsed lung reduce it).
 */
export function siteMix({ point, normal, sites, labelAt, s3 = false }) {
  const site = Object.fromEntries(sites.map((s) => [s.key, s]));
  const near = (k, sigma) => { const s = site[k]; if (!s) return 0; const d = Math.hypot(point[0] - s.point[0], point[1] - s.point[1], point[2] - s.point[2]); return Math.exp(-((d / sigma) ** 2)); };
  // inward path sampling (15..75 mm)
  let lung = 0, fluid = 0, heart = 0, bowel = 0, n = 0;
  for (let t = 15; t <= 75; t += 3) {
    const lab = labelAt(point[0] - normal[0] * t, point[1] - normal[1] * t, point[2] - normal[2] * t);
    n++;
    if (lab === 7 || lab === 8) lung++;
    else if (lab === 39 || lab === 41) fluid++;
    else if (lab >= 9 && lab <= 16) heart++;
    else if (lab >= 22 && lab <= 28) bowel++;
  }
  lung /= n; fluid /= n; heart /= n; bowel /= n;
  const precordium = Math.max(near('mitral', 70), near('tricuspid', 70), near('aortic', 70), near('pulmonic', 70), near('erb', 70));
  const lungDamp = 1 - 0.55 * lung; // air is a poor conductor of heart sounds
  const heartGain = Math.min(1, 0.12 + precordium + 0.5 * heart) * lungDamp;
  const weights = {
    M1: heartGain * (0.35 + 0.65 * near('mitral', 55) + 0.25 * near('tricuspid', 55)),
    T1: heartGain * (0.2 + 0.7 * near('tricuspid', 50)),
    A2: heartGain * (0.35 + 0.65 * near('aortic', 55) + 0.3 * near('erb', 50) + 0.2 * near('pulmonic', 50)),
    P2: heartGain * (0.12 + 0.6 * near('pulmonic', 45)),
    S3: s3 ? heartGain * (0.15 + 0.85 * near('mitral', 45)) : 0,
  };
  const breath = Math.min(1, lung * 1.25) * (1 - 0.8 * fluid / Math.max(fluid + lung, 1e-6) * (fluid > 0 ? 1 : 0));
  const keys = sites.map((s) => [s.key, Math.hypot(point[0] - s.point[0], point[1] - s.point[1], point[2] - s.point[2])]).sort((a, b) => a[1] - b[1]);
  return { weights, breath, bowel: Math.min(1, bowel * 2.2), nearest: keys[0] ? { key: keys[0][0], distanceMM: keys[0][1] } : null, path: { lung, fluid, heart, bowel } };
}

/**
 * Adventitious lung-sound DEMOS (pattern recognition only; synthetic; not clinically reviewed).
 * Crackles: short discontinuous damped transients (~2-5 ms decay) in late inspiration.
 * Wheeze: continuous musical tone (~400 Hz with harmonics) during expiration.
 * Timing uses the same respiratory cycle as breathCycle (inspiration = first 40 % of the period).
 */
export function crackleTrain({ period, sampleRate = 8000, seed = 1, amplitude = 1 }) {
  const n = Math.max(1, Math.round(period * sampleRate)), out = new Float32Array(n), rnd = lcg(seed);
  const count = 7 + Math.round(4 * (rnd() * 0.5 + 0.5));
  for (let k = 0; k < count; k++) {
    const at = (0.22 + 0.17 * (k / count) + 0.01 * rnd()) * n, f = 350 + 250 * (rnd() * 0.5 + 0.5), tau = 0.002 + 0.002 * (rnd() * 0.5 + 0.5);
    const len = Math.round(6 * tau * sampleRate);
    for (let i = 0; i < len && at + i < n; i++) { const t = i / sampleRate; out[Math.floor(at) + i] += amplitude * Math.sin(2 * Math.PI * f * t) * Math.exp(-t / tau); }
  }
  return out;
}
export function wheezeTone({ period, sampleRate = 8000, amplitude = 1 }) {
  const n = Math.max(1, Math.round(period * sampleRate)), out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const ph = i / n, t = i / sampleRate;
    if (ph < 0.45 || ph > 0.92) continue;
    const env = Math.sin(Math.PI * (ph - 0.45) / 0.47) ** 0.7, f = 400 * (1 + 0.015 * Math.sin(2 * Math.PI * 5 * t));
    out[i] = amplitude * env * (0.75 * Math.sin(2 * Math.PI * f * t) + 0.25 * Math.sin(4 * Math.PI * f * t));
  }
  return out;
}

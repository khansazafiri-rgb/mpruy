// Pembantu bersama video "Cara kerja GCU". Semua nilai angka; tidak ada gambar tempelan.
export const f1 = (n) => Math.round(n * 10) / 10;
export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const sm = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
export const eo = (x) => { x = clamp(x); return 1 - Math.pow(1 - x, 3); };
export const ei = (x) => { x = clamp(x); return x * x * x; };
export const eio = (x) => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
export const eob = (x) => { x = clamp(x); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
export const seg = (t, a, b, e = sm) => e(clamp((t - a) / (b - a)));
export const win = (t, a, b, f = 0.25) => clamp((t - a) / f) * clamp((b - t) / f);
export const MC = { brand: '#007060', brandDark: '#00584E', gold: '#F8C038', ink: '#172B38', ivory: '#F8F7F3', forest: '#0A3830', forest2: '#104C40', paper: '#F6F3EA', cream: '#F7F2E4', mint: '#C4E4D2', mint2: '#9DE0BD', mint3: '#55C79D', academic: '#255F85', progress: '#63579B', coral: '#E8665F', coral2: '#B0444F' };
export const FONT = "'Plus Jakarta Sans', Inter, system-ui, sans-serif";
export const rad = (d) => d * Math.PI / 180;
export const rot = (p, deg) => { const a = rad(deg), c = Math.cos(a), s = Math.sin(a); return [p[0] * c - p[1] * s, p[0] * s + p[1] * c]; };

// interpolasi monoton kubik (tanpa berhenti-mulai di tiap kunci): keys = [[t, nilai], ...]
export function pchip(keys) {
  const n = keys.length, h = [], d = [], m = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) { h[i] = keys[i + 1][0] - keys[i][0]; d[i] = (keys[i + 1][1] - keys[i][1]) / h[i]; }
  for (let i = 1; i < n - 1; i++) { if (d[i - 1] * d[i] <= 0) m[i] = 0; else { const w1 = 2 * h[i] + h[i - 1], w2 = h[i] + 2 * h[i - 1]; m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]); } }
  m[0] = d[0] ?? 0; m[n - 1] = d[n - 2] ?? 0;
  return (x) => {
    if (x <= keys[0][0]) return keys[0][1]; if (x >= keys[n - 1][0]) return keys[n - 1][1];
    let i = 0; while (x > keys[i + 1][0]) i++;
    const t = (x - keys[i][0]) / h[i], t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * keys[i][1] + (t3 - 2 * t2 + t) * h[i] * m[i] + (-2 * t3 + 3 * t2) * keys[i + 1][1] + (t3 - t2) * h[i] * m[i + 1];
  };
}
// kunci halus berlapis: tiap kunci = [t, a, b, c...]; mengembalikan fungsi t -> [a, b, c...]
export function track(keys) { const k = keys[0].length - 1, fs = Array.from({ length: k }, (_, j) => pchip(keys.map((q) => [q[0], q[j + 1]]))); return (t) => fs.map((f) => f(t)); }
// kunci bertahap dengan transisi halus: stops = [[t, nilai], ...] (nilai tetap sampai kunci berikutnya lalu smoothstep selama d)
export const step = (t, stops, d = 0.3) => { let v = stops[0][1]; for (let i = 1; i < stops.length; i++) { const [ti, vi] = stops[i]; if (t >= ti) v = lerp(stops[i - 1][1], vi, sm((t - ti) / d)); else break; } return v; };

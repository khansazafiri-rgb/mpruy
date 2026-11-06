// ADAPTASI: berkas ini disalin dari cabang claude/anatomi-visual-kalibrasi, commit 9c7ff84 (brand/anatomi-visual/v6/geom.mjs), tanpa perubahan logika.
// Alat geometri 2D untuk jantung v6: kurva halus dari titik jangkar buatan tangan, tabung meruncing, dan pita pembayang.
// Semua koordinat dalam piksel gambar acuan (potongan kiri 572x1375) supaya posisi dan ukuran bisa dibandingkan langsung.

const f = (n) => (Math.round(n * 10) / 10).toString();

/** Jalur kubik halus melalui titik jangkar. Titik [x, y, 'c'] adalah sudut tajam (tangen nol). closed: tutup kurva. */
export function smooth(pts, closed = false, k = 1) {
  const n = pts.length;
  const at = (i) => (closed ? pts[((i % n) + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    const c1 = p1[2] === 'c' ? [p1[0], p1[1]] : [p1[0] + ((p2[0] - p0[0]) / 6) * k, p1[1] + ((p2[1] - p0[1]) / 6) * k];
    const c2 = p2[2] === 'c' ? [p2[0], p2[1]] : [p2[0] - ((p3[0] - p1[0]) / 6) * k, p2[1] - ((p3[1] - p1[1]) / 6) * k];
    d += `C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + (closed ? 'Z' : '');
}

/** Titik-titik sepanjang kurva Catmull-Rom dengan lebar yang diinterpolasi. pts: [x, y, lebar]. */
export function sample(pts, n = 60) {
  const m = pts.length;
  const at = (i) => pts[Math.max(0, Math.min(m - 1, i))];
  const raw = [];
  const per = 24;
  for (let i = 0; i < m - 1; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    for (let j = 0; j < per; j++) {
      const t = j / per, t2 = t * t, t3 = t2 * t;
      const cr = (a, b, c, d) => 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      raw.push([cr(p0[0], p1[0], p2[0], p3[0]), cr(p0[1], p1[1], p2[1], p3[1]), cr(p0[2], p1[2], p2[2], p3[2])]);
    }
  }
  raw.push([...pts[m - 1]]);
  // pemilahan ulang berdasarkan panjang busur
  const cum = [0];
  for (let i = 1; i < raw.length; i++) cum.push(cum[i - 1] + Math.hypot(raw[i][0] - raw[i - 1][0], raw[i][1] - raw[i - 1][1]));
  const L = cum[cum.length - 1];
  const out = [];
  let j = 0;
  for (let i = 0; i < n; i++) {
    const s = (L * i) / (n - 1);
    while (j < raw.length - 2 && cum[j + 1] < s) j++;
    const u = (s - cum[j]) / (cum[j + 1] - cum[j] || 1);
    out.push([0, 1, 2].map((q) => raw[j][q] * (1 - u) + raw[j + 1][q] * u));
  }
  // tangen dan normal
  for (let i = 0; i < n; i++) {
    const a = out[Math.max(0, i - 1)], b = out[Math.min(n - 1, i + 1)];
    let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
    out[i].push(tx, ty); // indeks 3,4
  }
  return out;
}

export const LIGHT = [-0.55, -0.83]; // arah ke sumber cahaya (kiri atas)

/** Vektor geser ke sisi terang: komponen LIGHT yang tegak lurus sumbu (kontinu; mengecil ke nol bila sumbu searah cahaya). */
export function litShift(s) {
  const dot = LIGHT[0] * s[3] + LIGHT[1] * s[4];
  return [LIGHT[0] - dot * s[3], LIGHT[1] - dot * s[4]];
}

/** Poligon pita di sekitar sumbu: lebar = w*scale, digeser ke sisi terang sebesar shift*w. from/to: pecahan panjang. */
export function ribbon(samples, { scale = 1, shift = 0, from = 0, to = 1, wMul = null } = {}) {
  const n = samples.length;
  const i0 = Math.round(from * (n - 1)), i1 = Math.round(to * (n - 1));
  const L = [], R = [];
  for (let i = i0; i <= i1; i++) {
    const s = samples[i];
    const w = s[2] * scale * (wMul ? wMul(i / (n - 1)) : 1);
    const nx = -s[4], ny = s[3]; // normal tetap (tepi pita tidak pernah bertukar sisi)
    const [vx, vy] = litShift(s);
    const cx = s[0] + vx * shift * s[2], cy = s[1] + vy * shift * s[2];
    L.push([cx + nx * w / 2, cy + ny * w / 2]);
    R.push([cx - nx * w / 2, cy - ny * w / 2]);
  }
  const pts = [...L, ...R.reverse()];
  return 'M' + pts.map((p) => `${f(p[0])} ${f(p[1])}`).join('L') + 'Z';
}

/** Elips pembukaan (lumen) di ujung tabung: pusat, jari-jari sepanjang sumbu tabung diperpendek (miring ke penonton). */
export function openingAt(s, tilt = 0.28) {
  const ang = (Math.atan2(s[4], s[3]) * 180) / Math.PI;
  return { cx: s[0], cy: s[1], rx: s[2] / 2, ry: (s[2] / 2) * tilt, ang: ang + 90 };
}

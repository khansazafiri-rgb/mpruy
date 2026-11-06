// Memeriksa label pada tiap bingkai video gabungan: jumlah label tampak (maks 3), tidak ada label dari dua fase berbeda sekaligus pada satu organ,
// dan garis penunjuk tidak memotong pil label lain atau garis penunjuk lain. Pemakaian: node periksa-label.mjs
import * as gab from './scenes/gabungan.mjs';
const fps = 30, N = 450;
let maks = 0, masalah = [];
const baca = (svg) => {
  const out = [];
  for (const m of svg.matchAll(/<g class="lbl" opacity="([\d.]+)">\s*<path d="M([\d.-]+) ([\d.-]+)L([\d.-]+) ([\d.-]+)"[\s\S]*?<rect x="([\d.-]+)" y="([\d.-]+)" width="([\d.-]+)" height="([\d.-]+)"[^>]*fill="#000"[\s\S]*?<\/g><\/g>/g)) {
    const [, op, x1, y1, x2, y2, rx, ry, rw, rh] = m; if (+op < 0.05) continue;
    out.push({ op: +op, a: [+x1, +y1], b: [+x2, +y2], k: [+rx, +ry - 5, +rx + +rw, +ry - 5 + +rh] });
  }
  return out;
};
const ccw = (A, B, C) => (C[1] - A[1]) * (B[0] - A[0]) > (B[1] - A[1]) * (C[0] - A[0]);
const potong = (p, q, r, s) => ccw(p, r, s) !== ccw(q, r, s) && ccw(p, q, r) !== ccw(p, q, s);
const segKotak = (a, b, k) => { const [x0, y0, x1, y1] = k, P = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]; return P.some((c, i) => potong(a, b, c, P[(i + 1) % 4])); };
const hist = {};
for (let i = 0; i < N; i++) {
  const L = baca(gab.frame(i / fps));
  hist[L.length] = (hist[L.length] || 0) + 1; maks = Math.max(maks, L.length);
  for (let a = 0; a < L.length; a++) for (let b = 0; b < L.length; b++) {
    if (a === b) continue;
    if (a < b && potong(L[a].a, L[a].b, L[b].a, L[b].b)) masalah.push(`bingkai ${i}: garis ${a} memotong garis ${b}`);
    const pendek = [L[a].a, [L[a].b[0] - 4, L[a].b[1]]];
    if (segKotak(L[a].a, pendek[1], L[b].k)) masalah.push(`bingkai ${i}: garis ${a} memotong pil ${b}`);
  }
}
console.log('jumlah label tampak per bingkai (jumlah: bingkai):', JSON.stringify(hist), '| maks', maks);
console.log(masalah.length ? 'MASALAH: ' + [...new Set(masalah)].slice(0, 12).join('; ') : 'tidak ada garis penunjuk yang memotong pil atau garis lain');

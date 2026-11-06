// Memeriksa bahwa pembuluh besar tetap tersambung saat ventrikel/atrium berdeformasi: titik pangkal pembuluh harus tetap berada DI DALAM siluet badan/atrium
// setelah transformasi kontraksi maksimum (dan margin tumpang-tindih dilaporkan). Pakai: node brand/anatomy-style/periksa-jantung.mjs
import { GEOM } from './jantung.js';
import { sampleCubic } from './anatomi.js';
const OV = [585, 780], OA = [330, 920];
const inside = (pt, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi) c = !c; } return c; };
const dist = (pt, poly) => { let m = 1e9; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length], dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1; let t = ((pt[0] - a[0]) * dx + (pt[1] - a[1]) * dy) / l2; t = Math.max(0, Math.min(1, t)); m = Math.min(m, Math.hypot(pt[0] - a[0] - t * dx, pt[1] - a[1] - t * dy)); } return m; };
const tfV = (p, c) => { const a = -0.9 * c * Math.PI / 180, sx = 1 - 0.03 * c, sy = 1 - 0.052 * c, x = (p[0] - OV[0]) * sx, y = (p[1] - OV[1]) * sy; return [OV[0] + x * Math.cos(a) - y * Math.sin(a), OV[1] + x * Math.sin(a) + y * Math.cos(a)]; };
const tfA = (p, c) => [OA[0] + (p[0] - OA[0]) * (1 + 0.02 * c), OA[1] + (p[1] - OA[1]) * (1 + 0.02 * c)];
const body = sampleCubic(GEOM.BODY, 24);
const ra = (() => { const nums = GEOM.RA.match(/-?\d+(?:\.\d+)?/g).map(Number); const pts = []; for (let i = 0; i < nums.length; i += 2) pts.push([nums[i], nums[i + 1]]); return pts; })();
const ao = sampleCubic(GEOM.AO, 30), pt = sampleCubic(GEOM.PT, 28), svc = sampleCubic(GEOM.SVC, 28);
const cek = [['pangkal aorta asenden (ujung bawah)', ao[ao.length - 1], 'body'], ['pangkal aorta (titik 0)', ao[0], 'body'], ['pangkal batang pulmonal', pt[0], 'body'], ['pangkal batang pulmonal + 40 px', pt[Math.min(4, pt.length - 1)], 'body']];
let gagal = 0;
for (const c of [0, 0.5, 1]) {
  const bodyC = body.map((q) => tfV(q, c)), raC = ra.map((q) => tfA(q, c));
  for (const [nama, p, target] of cek) { const ok = inside(p, bodyC), m = dist(p, bodyC); if (!ok) gagal++; console.log(`c=${c} ${nama}: ${ok ? 'di dalam' : 'DI LUAR'} badan (jarak ke tepi ${m.toFixed(1)} px)`); }
  const sv = svc[svc.length - 1], ok2 = inside(sv, raC), m2 = dist(sv, raC); if (!ok2) gagal++; console.log(`c=${c} ujung bawah v. kava superior: ${ok2 ? 'di dalam' : 'DI LUAR'} atrium kanan (jarak ke tepi ${m2.toFixed(1)} px)`);
}
console.log(gagal ? `GAGAL: ${gagal} titik terlepas` : 'OK: semua titik pangkal tetap di dalam siluet saat kontraksi maksimum');
process.exit(gagal ? 1 : 0);

// Pemeriksaan otomatis label video apendisitis: jumlah label serempak (maks 3), pil keluar layar, pil saling menimpa.
import { frame } from '../scenes/apendisitis.mjs';
let maxN = 0, masalah = [];
for (let i = 0; i <= 75.2 * 30; i += 3) {
  const T = i / 30, svg = frame(T);
  const m = svg.match(/<g class="lbl-wadah">([\s\S]*?)<\/g><\/g>/); // satu wadah
  const wadah = svg.split('<g class="lbl-wadah">')[1]; if (!wadah) continue;
  const bagian = wadah.split('<g class="lbl" opacity="').slice(1).map((s) => ({ op: parseFloat(s), rects: [...s.matchAll(/<rect x="([\d.-]+)" y="([\d.-]+)" width="([\d.]+)" height="([\d.]+)" rx="[\d.]+" fill="#F8F7F3"/g)].map((r) => r.slice(1).map(Number)) }));
  const tampak = bagian.filter((b) => b.op > 0.5 && b.rects.length);
  maxN = Math.max(maxN, tampak.length);
  if (tampak.length > 3) masalah.push(`t=${T.toFixed(2)} ${tampak.length} label`);
  const R = tampak.map((b) => b.rects[0]);
  R.forEach((r, a) => { if (r[0] + r[2] > 1076 || r[0] < 8 || r[1] < 8 || r[1] + r[3] > 1600) masalah.push(`t=${T.toFixed(2)} pil keluar/tertutup caption ${r.map(Math.round)}`); for (let b = a + 1; b < R.length; b++) { const q = R[b]; if (r[0] < q[0] + q[2] && q[0] < r[0] + r[2] && r[1] < q[1] + q[3] && q[1] < r[1] + r[3]) masalah.push(`t=${T.toFixed(2)} pil saling menimpa`); } });
}
console.log('maks label serempak:', maxN); console.log(masalah.length ? [...new Set(masalah)].slice(0, 30).join('\n') : 'tidak ada masalah');

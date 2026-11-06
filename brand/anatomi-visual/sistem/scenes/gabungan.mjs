// Video gabungan 15 dtk: jantung -> gigi -> kulit. Tiap organ 5,4 dtk, tumpang tindih 0,6 dtk (3 x 5,4 - 2 x 0,6 = 15,0).
// Transisi: latar silang-pudar; organ dan label memudar keluar (0,3 dtk pertama), lalu organ berikutnya memudar masuk (0,3 dtk terakhir);
// logo dan "ATLAS ANATOMI" tetap diam; judul diganti berurutan (tanpa dua judul tumpang tindih); kaki halaman tetap.
import * as jantung from './jantung.mjs';
import * as gigi from './gigi.mjs';
import * as kulit from './kulit.mjs';
import { TEMPO, KANVAS, EASE, seg } from '../tokens.mjs';
import { FONT } from '../tokens.mjs';

export const meta = { id: 'gabungan', judul: 'Atlas', sub: '', organ: 'jantung', durasi: 15, fps: 30 };
const URUT = [jantung, gigi, kulit];
const D = TEMPO.durasi, X = TEMPO.transisi, MULAI = URUT.map((_, i) => i * (D - X));

export function frame(T) {
  const W = KANVAS.w, H = KANVAS.h;
  // organ aktif (satu atau dua pada jendela transisi)
  const aktif = URUT.map((m, i) => ({ m, i, t: T - MULAI[i] })).filter((o) => o.t >= -1e-6 && o.t <= D + 1e-6);
  const parts = aktif.map((o) => ({ ...o, p: o.m.frame(Math.min(Math.max(o.t, 0), D), { bagian: true }) }));
  const ada = parts.length === 2;
  const u = ada ? EASE.inOut((T - MULAI[parts[1].i]) / X) : 0;          // 0 -> 1 di jendela transisi
  const kel = ada ? 1 - seg(T, MULAI[parts[1].i], MULAI[parts[1].i] + X / 2, EASE.lin) : 1;   // organ lama: pudar keluar pada paruh pertama
  const mas = ada ? seg(T, MULAI[parts[1].i] + X / 2, MULAI[parts[1].i] + X, EASE.lin) : 1;   // organ baru: pudar masuk pada paruh kedua
  let s = '';
  if (ada) s += `<g opacity="${(1 - u).toFixed(3)}">${parts[0].p.bg}</g><g opacity="${u.toFixed(3)}">${parts[1].p.bg}</g>`; else s += parts[0].p.bg;
  if (ada) {
    s += `<g opacity="${kel.toFixed(3)}">${parts[0].p.isi}${parts[0].p.overlay}</g><g opacity="${mas.toFixed(3)}">${parts[1].p.isi}${parts[1].p.overlay}</g>`;
    s += parts[0].p.tetap + `<g opacity="${kel.toFixed(3)}">${parts[0].p.judul}</g><g opacity="${mas.toFixed(3)}">${parts[1].p.judul}</g>` + parts[0].p.footer;
  } else s += parts[0].p.isi + parts[0].p.overlay + parts[0].p.tetap + parts[0].p.judul + parts[0].p.footer;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="${FONT}"><defs><clipPath id="vp"><rect width="${W}" height="${H}"/></clipPath></defs><g clip-path="url(#vp)">${s}</g></svg>`;
}

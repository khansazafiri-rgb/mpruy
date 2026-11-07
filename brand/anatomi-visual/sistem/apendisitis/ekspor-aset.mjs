// Mengekspor aset berlapis yang dapat diedit: SVG gabungan (dengan <g id> per lapisan) dan satu SVG per lapisan, plus ikon dan parameter animasi.
//   node brand/anatomi-visual/sistem/apendisitis/ekspor-aset.mjs   ->  aset/*.svg, aset/layer/*.svg, aset/parameter-animasi.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lapDunia } from './art-lap.mjs';
import { penampang } from './art-penampang.mjs';
import { petaPerut } from './art-peta.mjs';
import { ikn } from './ikon.mjs';
import { BLUR_DEFS } from '../tensi/util.mjs';
import { KALIMAT, M, DURASI, AUDIO_DURASI } from './waktu.mjs';
const here = path.dirname(fileURLToPath(import.meta.url)), out = path.join(here, 'aset'), lay = path.join(out, 'layer');
fs.mkdirSync(lay, { recursive: true });
const FONT_DEFS = '';
function tulis(nama, vb, svg) {
  const [x, y, w, h] = vb;
  const bagian = svg.split(/<!--L:([a-z-]+)-->/); // [pra, nama1, isi1, nama2, isi2, ...]
  let gab = '', i = 1;
  const lapis = [];
  for (; i < bagian.length; i += 2) lapis.push([bagian[i], bagian[i + 1]]);
  const doc = (inner) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}">${BLUR_DEFS}${inner}</svg>`;
  gab = lapis.map(([n, s]) => `<g id="${nama}-${n}">${s}</g>`).join('');
  fs.writeFileSync(path.join(out, `${nama}.svg`), doc(bagian[0] + gab));
  lapis.forEach(([n, s]) => fs.writeFileSync(path.join(lay, `${nama}-${n}.svg`), doc(`<g id="${nama}-${n}">${bagian[0]}${s}</g>`)));
  return lapis.map((l) => l[0]);
}
const ket = {};
ket['lap-laparoskopi'] = tulis('lap-laparoskopi', [0, 0, 2000, 2000], lapDunia({ infl: 1, alat: { u: 1, buka: 0.5 } }).svg);
ket['peta-perut'] = tulis('peta-perut', [0, 0, 1000, 1300], petaPerut({ sorot: 1, radang: 1, nyeri: { pusat: 0, kanan: 0 } }).svg);
ket['penampang-normal'] = tulis('penampang-normal', [0, 0, 1000, 1400], penampang({ T: 18, d: 0.04, ph: 3, muc: 0, sorot: { ostium: 1, drain: 1 } }).svg);
ket['penampang-tersumbat-tinja'] = tulis('penampang-tersumbat-tinja', [0, 0, 1000, 1400], penampang({ T: 30, d: 0.1, ph: 3, muc: 0.9, mucT0: 26, mucT1: 31, sumbat: { kind: 'tinja', k: 1 } }).svg);
ket['penampang-tersumbat-limfoid'] = tulis('penampang-tersumbat-limfoid', [0, 0, 1000, 1400], penampang({ T: 24, d: 0.05, ph: 3, sumbat: { kind: 'limfoid', k: 1 } }).svg);
ket['penampang-radang-meregang'] = tulis('penampang-radang-meregang', [0, 0, 1000, 1400], penampang({ T: 36, d: 1, radang: 0.9, iskemia: 0.85, tekanan: 1, aliran: 0.22, ph: 3, bakteri: 1, muc: 1, mucT0: 26, mucT1: 31, sumbat: { kind: 'tinja', k: 1 } }).svg);
// ikon
const ik = Object.entries(ikn).map(([k, f]) => `<g id="ikon-${k}">${f(0, 0, 1)}</g>`);
fs.writeFileSync(path.join(out, 'ikon.svg'), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-100 -100 200 200" width="200" height="200">${ikn.stetoskop(0, 0, 1)}</svg>`);
Object.entries(ikn).forEach(([k, f]) => fs.writeFileSync(path.join(lay, `ikon-${k}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-100 -100 200 200" width="200" height="200"><g id="ikon-${k}">${f(0, 0, 1)}</g></svg>`));
fs.writeFileSync(path.join(out, 'parameter-animasi.json'), JSON.stringify({ video: { durasi: DURASI, audioDurasi: AUDIO_DURASI, fps: 30, ukuran: [1080, 1920] }, kalimat: KALIMAT, penanda: M, lapisan: ket }, null, 1));
console.log('ok', Object.keys(ket).length, 'aset berlapis,', Object.keys(ikn).length, 'ikon');

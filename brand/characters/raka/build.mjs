// Membuat berkas SVG statis Raka dari raka.js (satu per ekspresi + satu per pose tambahan).
//   node brand/characters/raka/build.mjs
// SVG statis berguna untuk slide, thumbnail, atau alat yang tidak menjalankan JavaScript.
// Untuk animasi, pakai raka.js langsung (lihat README.md).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EXPRESSIONS, OUTFITS, raka, rakaSvg, walkCycle } from './raka.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, 'svg');
fs.mkdirSync(out, { recursive: true });

const files = [
  ...Object.keys(EXPRESSIONS).map((name) => [`raka-${name}.svg`, raka(name)]),
  ['raka-sapa.svg', raka('senang', 'sapa')],
];
for (const [file, state] of files) fs.writeFileSync(path.join(out, file), `${rakaSvg(state, { uid: file.replace('.svg', '') })}\n`);

// Varian pakaian (opsi outfit): berdiri, jalan (dua fase), kaget, batuk, jongkok. Nama berkas: raka-<pakaian>-<pose>.svg
export const OUTFIT_SHEET = [
  ['netral', raka('netral')],
  ['jalan-a', raka('netral', 'jalan', walkCycle(0.12))],
  ['jalan-b', raka('netral', 'jalan', walkCycle(0.62))],
  ['kaget', raka('kaget')],
  ['batuk', raka('batuk')],
  ['jongkok', raka('khawatir', 'jongkok')],
];
let nOutfit = 0;
for (const outfit of ['demo', 'jas']) {
  for (const [pose, state] of OUTFIT_SHEET) {
    const file = `raka-${outfit}-${pose}.svg`;
    fs.writeFileSync(path.join(out, file), `${rakaSvg(state, { uid: file.replace('.svg', ''), outfit })}\n`);
    nOutfit += 1;
  }
}

// Berbaring (opsi rebah), keadaan darurat (bercak darah) dan pandangan dari mata sendiri (potongan badan, tanpa kepala).
const extra = [
  ['raka-berbaring-pingsan.svg', rakaSvg(raka('pingsan', 'berbaring', { blood: 1 }), { uid: 'berbaring-pingsan', rebah: true })],
  ['raka-berbaring-bingung.svg', rakaSvg(raka('bingung', 'berbaring', { blood: 1 }), { uid: 'berbaring-bingung', rebah: true })],
  ['raka-berbaring-sadar.svg', rakaSvg(raka('lega', 'berbaring'), { uid: 'berbaring-sadar', rebah: true, rebahTilt: -5 })],
  ['raka-darurat.svg', rakaSvg(raka('bingung', null, { blood: 1 }), { uid: 'darurat' })],
  ['raka-pov-perut.svg', rakaSvg(raka('netral', 'pov_perut', { blood: 1 }), { uid: 'pov-perut', shadow: false }).replace('viewBox="0 0 400 800"', 'viewBox="30 366 340 250"')],
];
for (const [file, svg] of extra) fs.writeFileSync(path.join(out, file), `${svg}\n`);

// Kepala saja (avatar, bubble bicara, thumbnail): viewBox dipotong ke wajah.
for (const name of Object.keys(EXPRESSIONS)) {
  const svg = rakaSvg(raka(name), { uid: `wajah-${name}`, shadow: false }).replace('viewBox="0 0 400 800"', 'viewBox="0 0 400 420"');
  fs.writeFileSync(path.join(out, `raka-wajah-${name}.svg`), `${svg}\n`);
}
console.log(`${files.length + Object.keys(EXPRESSIONS).length + nOutfit + extra.length} berkas SVG (${Object.keys(OUTFITS).join(', ')}) -> ${path.relative(process.cwd(), out)}`);

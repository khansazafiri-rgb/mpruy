// Membuat berkas SVG statis Raka dari raka.js (satu per ekspresi + satu per pose tambahan).
//   node brand/characters/raka/build.mjs
// SVG statis berguna untuk slide, thumbnail, atau alat yang tidak menjalankan JavaScript.
// Untuk animasi, pakai raka.js langsung (lihat README.md).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EXPRESSIONS, raka, rakaSvg } from './raka.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, 'svg');
fs.mkdirSync(out, { recursive: true });

const files = [
  ...Object.keys(EXPRESSIONS).map((name) => [`raka-${name}.svg`, raka(name)]),
  ['raka-sapa.svg', raka('senang', 'sapa')],
];
for (const [file, state] of files) fs.writeFileSync(path.join(out, file), `${rakaSvg(state, { uid: file.replace('.svg', '') })}\n`);

// Kepala saja (avatar, bubble bicara, thumbnail): viewBox dipotong ke wajah.
for (const name of Object.keys(EXPRESSIONS)) {
  const svg = rakaSvg(raka(name), { uid: `wajah-${name}`, shadow: false }).replace('viewBox="0 0 400 800"', 'viewBox="0 0 400 420"');
  fs.writeFileSync(path.join(out, `raka-wajah-${name}.svg`), `${svg}\n`);
}
console.log(`${files.length + Object.keys(EXPRESSIONS).length} berkas SVG -> ${path.relative(process.cwd(), out)}`);

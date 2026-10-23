// Lab pelafalan: membuat beberapa varian ejaan sebuah kata supaya bisa didengar
// dan dipilih, lalu hasilnya dimasukkan ke lexicon.json.
//   npm run lab -- "MEDCOEL" "Med koel" "Med-koel" "Medikoel" "Med ko el"
import fs from 'node:fs';
import path from 'node:path';
import { synthPiper } from './tts.mjs';
import { KIT } from './lib.mjs';

const [word, ...variants] = process.argv.slice(2);
if (!word || !variants.length) { console.error('Pakai: npm run lab -- "KATA" "varian 1" "varian 2" ...'); process.exit(1); }
const dir = path.join(KIT, 'build', 'lab'); fs.mkdirSync(dir, { recursive: true });
variants.forEach((v, i) => {
  const f = path.join(dir, `${i + 1}-${v.replace(/[^\p{L}\p{N}]+/gu, '_')}.wav`);
  synthPiper(`Selamat datang di ${v}. Terima kasih sudah belajar bersama ${v}.`, f, {});
  console.log(`${i + 1}. "${v}"  ->  ${f}`);
});
console.log(`\nDengarkan file di ${dir}, pilih yang paling pas, lalu tulis di lexicon.json:  "${word}": "<varian terbaik>"`);

// Dengarkan satu kalimat dengan cepat:  npm run say -- "Halo, aku Kori." [hasil.wav]
// Memakai kamus pelafalan yang sama dengan video.
import fs from 'node:fs';
import path from 'node:path';
import { applyLexicon, synthPiper } from './tts.mjs';
import { KIT, readJson } from './lib.mjs';

const text = process.argv[2];
if (!text) { console.error('Pakai: npm run say -- "kalimat" [berkas.wav]'); process.exit(1); }
const out = path.resolve(process.argv[3] || path.join(KIT, 'build', 'say.wav'));
fs.mkdirSync(path.dirname(out), { recursive: true });
const lex = readJson(path.join(KIT, 'lexicon.json'));
const spoken = applyLexicon(text, lex);
console.log('Dibacakan sebagai:', spoken);
synthPiper(spoken, out, {});
console.log('Hasil:', out);

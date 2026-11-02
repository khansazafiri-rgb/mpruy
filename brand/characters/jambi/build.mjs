// Membuat ulang svg/ dari jambi.js: node brand/characters/jambi/build.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EXPRESSIONS, POSES, jambi, jambiSvg } from './jambi.js';
const dir = path.dirname(fileURLToPath(import.meta.url)), out = path.join(dir, 'svg');
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
let n = 0;
for (const e of Object.keys(EXPRESSIONS)) { fs.writeFileSync(path.join(out, `jambi-${e}.svg`), jambiSvg(jambi(e)) + '\n'); n++; }
for (const p of Object.keys(POSES)) { if (p === 'berdiri') continue; fs.writeFileSync(path.join(out, `jambi-pose-${p}.svg`), jambiSvg(jambi('netral', p)) + '\n'); n++; }
console.log(`${n} berkas SVG -> ${path.relative(process.cwd(), out)}`);

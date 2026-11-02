// Membuat ulang svg/ dari grelin.js: node brand/characters/grelin/build.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EXPRESSIONS, POSES, grelin, grelinSvg } from './grelin.js';
const dir = path.dirname(fileURLToPath(import.meta.url)), out = path.join(dir, 'svg');
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
let n = 0;
for (const e of Object.keys(EXPRESSIONS)) { fs.writeFileSync(path.join(out, `grelin-${e}.svg`), grelinSvg(grelin(e)) + '\n'); n++; }
for (const p of Object.keys(POSES)) { if (p === 'berdiri') continue; fs.writeFileSync(path.join(out, `grelin-pose-${p}.svg`), grelinSvg(grelin('netral', p)) + '\n'); n++; }
console.log(`${n} berkas SVG -> ${path.relative(process.cwd(), out)}`);

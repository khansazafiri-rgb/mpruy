// Membuat ulang svg/ dari teman.js: node brand/characters/teman/build.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { T_EXPR, T_POSE, PENELITI, teman, temanSvg } from './teman.js';
const dir = path.dirname(fileURLToPath(import.meta.url)), out = path.join(dir, 'svg');
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
let n = 0;
const w = (name, svg) => { fs.writeFileSync(path.join(out, name), svg + '\n'); n++; };
for (const e of Object.keys(T_EXPR)) w(`tala-${e}.svg`, temanSvg(teman(e, 'berdiri')));                      // ekspresi, berdiri
for (const p of Object.keys(T_POSE)) { if (p === 'berdiri') continue; w(`tala-pose-${p}.svg`, temanSvg(teman('santai', p))); }
w('tala-duduk-santai.svg', temanSvg(teman('santai', 'duduk')));                                              // versi lama (setengah badan)
for (const p of ['berdiri', 'tunjuk', 'catat']) w(`peneliti-${p}.svg`, temanSvg(teman('fokus', p), { outfit: 'jas', glasses: true, palette: PENELITI }));
console.log(`${n} berkas SVG -> ${path.relative(process.cwd(), out)}`);

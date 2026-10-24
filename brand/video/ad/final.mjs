// Pasang suara final ke iklan TANPA merekam ulang web (clips/ dan build/frames/ tidak disentuh).
//   node ad/final.mjs --use <folder berisi s01.wav ... s16.wav> [--name medcoel-iklan-75s-v2]
// Langkah: voice.mjs --use (waktu bicara) -> audio.mjs (efek+musik) -> render-ad.mjs (panggung saja, ~7 menit,
// karena mulut Kori dan takarir mengikuti waktu suara) -> mux.mjs. Hasil: out/<name>.mp4 dan .srt
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const use = opt('use'); const name = opt('name', 'medcoel-iklan-75s-v2');
if (!use) { console.error('Pakai: node ad/final.mjs --use <folder sNN.wav> [--name nama]'); process.exit(1); }
const step = (file, args) => { console.log(`\n== ${file} ${args.join(' ')}`); const r = spawnSync('node', [path.join(HERE, file), ...args], { stdio: 'inherit' }); if (r.status !== 0) process.exit(r.status || 1); };
step('voice.mjs', ['--use', path.resolve(use)]);
step('audio.mjs', []);
step('render-ad.mjs', ['--out', `${name}-silent.mp4`]);
step('mux.mjs', ['--video', path.join(HERE, 'build', `${name}-silent.mp4`), '--name', name]);

// Dari rekaman suara ElevenLabs utuh (MP3/WAV) sampai MP4 final video ke-2. Rekaman web tidak diulang.
//   node final2.mjs --audio narasi.mp3 [--python python3] [--name medcoel-video2-simulasi]
// Langkah: split.py (potong per kalimat) -> voice2 (tempatkan, periksa muat) -> audio2 (efek+musik) -> render (panggung) -> mux2.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const audio = opt('audio'); const py = opt('python', 'python3'); const name = opt('name', 'medcoel-video2-simulasi');
if (!audio) { console.error('Pakai: node final2.mjs --audio narasi.mp3 [--python python3] [--name nama]'); process.exit(1); }
const lines = path.join(HERE, 'build', 'narasi');
const step = (cmd, args) => { console.log(`\n== ${path.basename(cmd)} ${args.join(' ')}`); const r = spawnSync(cmd, args, { stdio: 'inherit' }); if (r.status !== 0) process.exit(r.status || 1); };
step(py, [path.join(HERE, '..', 'ad', 'tts', 'split.py'), '--wav', path.resolve(audio), '--out', lines, '--script', path.join(HERE, 'narasi.json')]);
step('node', [path.join(HERE, 'voice2.mjs'), '--lines', lines]);
step('node', [path.join(HERE, 'audio2.mjs')]);
step('node', [path.join(HERE, 'render-ad2.mjs'), '--out', `${name}-silent.mp4`]);
step('node', [path.join(HERE, 'mux2.mjs'), '--video', path.join(HERE, 'build', `${name}-silent.mp4`), '--name', name]);

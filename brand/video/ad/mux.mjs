// Gabungkan video tanpa suara + suara + efek + musik menjadi MP4 akhir dan ekspor stem terpisah.
//   node mux.mjs [--video build/video-silent.mp4] [--name medcoel-iklan-75s]
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const B = (f) => path.join(HERE, 'build', f);
const video = opt('video', B('video-silent.mp4')); const name = opt('name', 'medcoel-iklan-75s');
const OUT = path.join(HERE, 'out'); const STEMS = path.join(OUT, 'stems'); fs.mkdirSync(STEMS, { recursive: true });
const T = JSON.parse(fs.readFileSync(path.join(HERE, 'ad.json'), 'utf8')).total;
const run = (args) => { const r = spawnSync('ffmpeg', ['-y', '-v', 'error', ...args], { encoding: 'utf8' }); if (r.status !== 0) throw new Error(r.stderr); };

for (const s of ['voice', 'sfx', 'music']) fs.copyFileSync(B(`${s}.wav`), path.join(STEMS, `${s}.wav`));
// Campuran: musik direndahkan (dan makin turun saat ada suara), efek ringan, suara utama.
const graph = [
  '[0:a]highpass=f=80,acompressor=threshold=-20dB:ratio=3:attack=5:release=120,volume=1.0,asplit=2[v1][v2]',
  '[2:a]volume=0.34[m0]',
  '[m0][v1]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=450[mduck]',
  '[1:a]volume=0.55[fx]',
  `[mduck][fx][v2]amix=inputs=3:duration=longest:normalize=0,atrim=duration=${T},loudnorm=I=-15:TP=-1.5:LRA=9[a]`,
].join(';');
run(['-i', B('voice.wav'), '-i', B('sfx.wav'), '-i', B('music.wav'), '-filter_complex', graph, '-map', '[a]', '-ar', '44100', '-c:a', 'pcm_s16le', path.join(STEMS, 'mix.wav')]);
const final = path.join(OUT, `${name}.mp4`);
run(['-i', video, '-i', path.join(STEMS, 'mix.wav'), '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-ac', '2', '-b:a', '192k', '-t', String(T), '-movflags', '+faststart', final]);
console.log('selesai:', final);

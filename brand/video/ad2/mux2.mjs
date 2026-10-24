// Campur suara + efek + musik, lalu gabungkan dengan video tanpa suara. Musik dikecilkan dan makin turun saat ada suara.
//   node mux2.mjs [--video build/video-silent.mp4] [--name medcoel-video2-simulasi] [--music 0.2] [--sfx 0.35]
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const B = (f) => path.join(HERE, 'build', f);
const video = path.resolve(opt('video', B('video-silent.mp4'))); const name = opt('name', 'medcoel-video2-simulasi');
const musicVol = Number(opt('music', 0.2)); const sfxVol = Number(opt('sfx', 0.35));
const OUT = path.join(HERE, 'out'); const STEMS = path.join(OUT, 'stems'); fs.mkdirSync(STEMS, { recursive: true });
const T = JSON.parse(fs.readFileSync(path.join(HERE, 'narasi.json'), 'utf8')).total;
const run = (args) => { const r = spawnSync('ffmpeg', ['-y', '-v', 'error', ...args], { encoding: 'utf8' }); if (r.status !== 0) throw new Error(r.stderr); };
// Pratinjau tanpa suara: bila belum ada voice.wav, dipakai hening (hanya musik dan efek).
if (!fs.existsSync(B('voice.wav'))) run(['-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=mono', '-t', String(T), '-c:a', 'pcm_s16le', B('voice.wav')]);
for (const s of ['voice', 'sfx', 'music']) fs.copyFileSync(B(`${s}.wav`), path.join(STEMS, `${s}.wav`));
const graph = [
  '[0:a]asplit=2[v1][v2]',
  `[2:a]volume=${musicVol}[m0]`,
  '[m0][v1]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=450[mduck]',
  `[1:a]volume=${sfxVol}[fx]`,
  `[mduck][fx][v2]amix=inputs=3:duration=longest:normalize=0,atrim=duration=${T},alimiter=limit=0.89[a]`,
].join(';');
run(['-i', B('voice.wav'), '-i', B('sfx.wav'), '-i', B('music.wav'), '-filter_complex', graph, '-map', '[a]', '-ar', '44100', '-c:a', 'pcm_s16le', path.join(STEMS, 'mix.wav')]);
const final = path.join(OUT, `${name}.mp4`);
run(['-i', video, '-i', path.join(STEMS, 'mix.wav'), '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-ac', '2', '-b:a', '192k', '-t', String(T), '-movflags', '+faststart', final]);
console.log('selesai:', final);

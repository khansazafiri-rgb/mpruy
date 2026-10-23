// Perintah utama:  npm run video -- scenes/kenalan-kori.json [pilihan]
//   --draft            cepat, setengah resolusi, 15 fps (untuk cek naskah)
//   --format 9:16      16:9 (bawaan) | 9:16 | 1:1
//   --fps 30
//   --music berkas.mp3 --music-volume 0.2   musik latar yang mengecil saat bicara
//   --audio-only       hanya buat suara dan takarir (.srt)
//   --out folder       folder hasil (bawaan: out/)
import fs from 'node:fs';
import path from 'node:path';
import { buildAudio } from './tts.mjs';
import { renderVideo } from './render.mjs';
import { FORMATS, KIT, need, readJson, slug } from './lib.mjs';

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);
const opt = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
// Berkas naskah = argumen pertama yang bukan pilihan dan bukan nilai sebuah pilihan.
const VALUE_OPTS = new Set(['--format', '--fps', '--music', '--music-volume', '--out']);
const file = argv.find((a, i) => !a.startsWith('--') && !(i > 0 && VALUE_OPTS.has(argv[i - 1])));
if (!file) { console.error('Pakai: npm run video -- scenes/naskah.json [--draft] [--format 9:16] [--music lagu.mp3]'); process.exit(1); }

need('ffmpeg', 'Pasang ffmpeg (sudo apt-get install ffmpeg).');
const specFile = path.resolve(file);
const spec = readJson(specFile);
const specDir = path.dirname(specFile);
const draft = flag('draft');
const format = opt('format', spec.format || '16:9');
if (!FORMATS[format]) { console.error(`Format tidak dikenal: ${format}`); process.exit(1); }
const fps = Number(opt('fps', draft ? 15 : spec.fps || 30));
const name = slug(spec.title || path.basename(file, '.json')) + (format !== '16:9' ? `-${format.replace(':', 'x')}` : '') + (draft ? '-draft' : '');
const outDir = path.resolve(opt('out', path.join(KIT, 'out')));
const buildDir = path.join(KIT, 'build', name);
fs.mkdirSync(outDir, { recursive: true });

console.log(`\n1) Suara  (${spec.voice?.engine || 'piper'})`);
const { timeline, voiceWav, srtFile } = buildAudio(spec, { buildDir, specDir, fps });
fs.copyFileSync(srtFile, path.join(outDir, `${name}.srt`));
console.log(`   total ${timeline.total.toFixed(1)} detik, takarir: out/${name}.srt`);

if (flag('audio-only')) { fs.copyFileSync(voiceWav, path.join(outDir, `${name}.wav`)); console.log(`   suara: out/${name}.wav`); process.exit(0); }

console.log(`\n2) Gambar + MP4  (${format}, ${fps} fps${draft ? ', draft' : ''})`);
const music = opt('music', spec.music) ? path.resolve(specDir, opt('music', spec.music)) : null;
if (music && !fs.existsSync(music)) { console.error(`Musik tidak ditemukan: ${music}`); process.exit(1); }
const outFile = path.join(outDir, `${name}.mp4`);
const r = await renderVideo({ spec, specDir, timeline, voiceWav, outFile, thumbFile: path.join(outDir, `${name}.jpg`), format, fps, draft, music, musicVolume: Number(opt('music-volume', spec.musicVolume ?? 0.2)) });
console.log(`\nSelesai: ${path.relative(process.cwd(), outFile)}  (${r.frames} frame, ${r.seconds.toFixed(0)} detik render)`);

// Ganti suara narasi pada video V2 yang sudah dirender, tanpa merekam ulang web dan tanpa merender ulang frame:
// aliran video disalin apa adanya (-c:v copy), hanya audio yang dibuat ulang.
// Suara tidak diproses (tanpa EQ, nada, atau percepatan); hanya diberi satu penguatan tetap supaya setara -16 LUFS.
//   node voice-swap.mjs --lines narasi --sample 12      -> out/kori-sampel-suara-final-detik-0-12.mp3 (musik dikecilkan)
//   node voice-swap.mjs --lines narasi                  -> out/medcoel-iklan-75s-v2-FINAL.mp4
//   opsi: --video <mp4 sumber video> --music 0.18 --sfx 0.35 --name <nama>
// --lines = folder berisi sNN-K.wav dari tts/commercial.mjs (K = kalimat ke-K pada shot NN).
// Waktu takarir dan gerak mulut Kori sudah tertanam di video (mengikuti tts/base-timeline.json), jadi tiap shot
// dimulai pada detik yang sama; selisih lama bicara dilaporkan agar bisa dinilai.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodePcm, SAMPLE_RATE as SR, writeWav } from '../src/lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const linesDir = path.resolve(opt('lines', 'narasi'));
const sample = opt('sample') ? Number(opt('sample')) : 0;
const video = path.resolve(opt('video', path.join(HERE, 'out', 'medcoel-iklan-75s-v2-DRAF-suara-pockettts.mp4')));
const musicVol = Number(opt('music', sample ? 0.12 : 0.2));
const sfxVol = Number(opt('sfx', sample ? 0.3 : 0.35));
const name = opt('name', 'medcoel-iklan-75s-v2-FINAL');
const GAP = 0.28; // jeda antar kalimat dalam satu shot (detik)
const TARGET_LUFS = -16;
const B = (f) => path.join(HERE, 'build', f);
const OUT = path.join(HERE, 'out'); fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(path.join(HERE, 'build'), { recursive: true });
const ff = (args) => { const r = spawnSync('ffmpeg', ['-y', '-v', 'error', ...args], { encoding: 'utf8' }); if (r.status !== 0) throw new Error(r.stderr); };

const base = JSON.parse(fs.readFileSync(path.join(HERE, 'tts', 'base-timeline.json'), 'utf8'));
const spec = JSON.parse(fs.readFileSync(path.join(HERE, 'tts', 'narasi-final.json'), 'utf8')).shot;
const ad = JSON.parse(fs.readFileSync(path.join(HERE, 'ad.json'), 'utf8'));
const TOTAL = ad.total; const { leadIn, tailOut } = ad.voice;

// 1. Susun voice track: tiap shot dimulai pada audioStart yang sama dengan video.
const mix = new Int16Array(Math.round(TOTAL * SR));
const rows = []; let overflow = 0;
for (const sc of base.scenes) {
  const id = String(sc.id).padStart(2, '0');
  const parts = (spec[id]?.teks || []).map((_, k) => path.join(linesDir, `s${id}-${k + 1}.wav`));
  if (sample && sc.start >= sample) break;
  const missing = parts.filter((f) => !fs.existsSync(f));
  if (missing.length) throw new Error(`Berkas suara tidak ada: ${missing.map((f) => path.basename(f)).join(', ')}`);
  const pcms = parts.map((f) => decodePcm(f));
  const gap = new Int16Array(Math.round(GAP * SR));
  const total = pcms.reduce((n, p, i) => n + p.length + (i ? gap.length : 0), 0);
  const seg = new Int16Array(total); let o = 0;
  pcms.forEach((p, i) => { if (i) o += gap.length; seg.set(p, o); o += p.length; });
  const start = Math.round(sc.audioStart * SR);
  const room = Math.round((sc.end - tailOut) * SR) - start;
  const dur = seg.length / SR;
  const fits = seg.length <= room + 0.02 * SR;
  if (!fits) overflow++;
  mix.set(seg.subarray(0, Math.max(0, Math.min(seg.length, mix.length - start))), start);
  rows.push({ shot: sc.id, video: sc.audioSec, suara: +dur.toFixed(2), selisih: +(dur - sc.audioSec).toFixed(2), jendela: +(room / SR).toFixed(2), muat: fits });
}
console.table(rows);
if (overflow) {
  console.error(`${overflow} shot melebihi jendelanya (suara menabrak shot berikutnya). Pendekkan kalimat di tts/narasi-final.json atau pilih suara yang lebih ringkas; suara tidak dipercepat.`);
  if (!argv.includes('--allow-overflow')) process.exit(3);
}

// 2. Penguatan tetap ke -16 LUFS (bukan kompresi): ukur dulu, lalu satu nilai dB untuk seluruh track.
const rawWav = B('voice-final-raw.wav'); writeWav(rawWav, mix);
const m = spawnSync('ffmpeg', ['-v', 'info', '-nostats', '-i', rawWav, '-af', 'ebur128=peak=sample', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
const lufs = Number([...m.matchAll(/\n\s+I:\s+(-?[\d.]+) LUFS/g)].pop()?.[1]);
const peak = Number([...m.matchAll(/Peak:\s+(-?[\d.]+) dBFS/g)].pop()?.[1]);
let gain = Number.isFinite(lufs) ? TARGET_LUFS - lufs : 0;
if (Number.isFinite(peak) && peak + gain > -1.5) gain = -1.5 - peak;
console.log(`suara: ${lufs} LUFS, puncak ${peak} dBFS -> penguatan tetap ${gain.toFixed(1)} dB`);
const voiceWav = B('voice-final.wav');
ff(['-i', rawWav, '-af', `volume=${gain.toFixed(2)}dB`, '-ar', String(SR), '-ac', '1', '-c:a', 'pcm_s16le', voiceWav]);

// 3. Efek dan musik (sintesis sendiri), musik makin turun saat ada suara.
const au = spawnSync('node', [path.join(HERE, 'audio.mjs')], { stdio: 'inherit' }); if (au.status !== 0) process.exit(au.status || 1);
const D = sample || TOTAL;
const graph = [
  '[0:a]asplit=2[v1][v2]',
  `[2:a]volume=${musicVol}[m0]`,
  '[m0][v1]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=450[mduck]',
  `[1:a]volume=${sfxVol}[fx]`,
  `[mduck][fx][v2]amix=inputs=3:duration=longest:normalize=0,atrim=duration=${D},alimiter=limit=0.89[a]`,
].join(';');
const mixWav = B(sample ? 'mix-sampel.wav' : 'mix-final.wav');
ff(['-i', voiceWav, '-i', B('sfx.wav'), '-i', B('music.wav'), '-filter_complex', graph, '-map', '[a]', '-ar', '44100', '-c:a', 'pcm_s16le', mixWav]);

// 4. Keluaran
if (sample) {
  const f = path.join(OUT, `kori-sampel-suara-final-detik-0-${sample}.mp3`);
  ff(['-i', mixWav, '-ac', '2', '-b:a', '192k', f]);
  console.log('selesai:', f);
} else {
  const f = path.join(OUT, `${name}.mp4`);
  // -c:v copy: frame video tidak dirender ulang. Audio lama di sumber dibuang.
  ff(['-i', video, '-i', mixWav, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ac', '2', '-t', String(TOTAL), '-movflags', '+faststart', f]);
  fs.copyFileSync(voiceWav, path.join(OUT, 'stems', 'voice-final.wav'));
  console.log('selesai:', f);
}

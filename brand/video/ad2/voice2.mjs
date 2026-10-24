// Menempatkan kalimat hasil potongan (sNN-K.wav dari ../ad/tts/split.py) pada awal tiap shot, tanpa memproses suara:
// tidak ada EQ, nada, atau percepatan; hanya SATU penguatan tetap supaya setara -16 LUFS (dibatasi agar tidak pecah).
// Keluaran: build/voice.wav (75 detik) dan build/timeline.json (lama bicara tiap shot + amplop untuk gerak mulut Nilo).
// Shot yang suaranya melebihi jendelanya dilaporkan dan prosesnya dihentikan sebelum video dibuat.
//   node voice2.mjs --lines narasi [--check] [--allow-overflow]
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodePcm, envelope, SAMPLE_RATE as SR, writeWav } from '../src/lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const linesDir = path.resolve(opt('lines', 'narasi'));
const spec = JSON.parse(fs.readFileSync(path.join(HERE, 'narasi.json'), 'utf8'));
const BUILD = path.join(HERE, 'build'); fs.mkdirSync(BUILD, { recursive: true });
const LEAD = 0.12, TAIL = 0.08, GAP = 0.28, TARGET_LUFS = -16;
const fps = spec.fps; const TOTAL = spec.total;

const mix = new Int16Array(Math.round(TOTAL * SR));
const scenes = []; const rows = []; let overflow = 0;
for (const k of Object.keys(spec.shot).sort()) {
  const s = spec.shot[k];
  const parts = s.teks.map((_, i) => path.join(linesDir, `s${k}-${i + 1}.wav`));
  const missing = parts.filter((f) => !fs.existsSync(f));
  if (missing.length) throw new Error(`Berkas suara tidak ada: ${missing.map((f) => path.basename(f)).join(', ')}`);
  const pcms = parts.map((f) => decodePcm(f));
  const gap = new Int16Array(Math.round(GAP * SR));
  const seg = new Int16Array(pcms.reduce((n, p, i) => n + p.length + (i ? gap.length : 0), 0)); let o = 0;
  pcms.forEach((p, i) => { if (i) o += gap.length; seg.set(p, o); o += p.length; });
  const at = s.start + LEAD; const start = Math.round(at * SR);
  const room = s.end - TAIL - at; const dur = seg.length / SR; const fits = dur <= room + 0.02;
  if (!fits) overflow++;
  mix.set(seg.subarray(0, Math.max(0, Math.min(seg.length, mix.length - start))), start);
  scenes.push({ id: +k, start: s.start, end: s.end, audioStart: +at.toFixed(3), audioSec: +dur.toFixed(3), seg });
  rows.push({ shot: +k, suara: +dur.toFixed(2), jendela: +room.toFixed(2), sisa: +(room - dur).toFixed(2), muat: fits });
}
console.table(rows);
if (argv.includes('--check')) { console.log(overflow ? `${overflow} shot tidak muat.` : 'Semua shot muat di jendelanya.'); process.exit(overflow ? 3 : 0); }
if (overflow && !argv.includes('--allow-overflow')) { console.error(`${overflow} shot melebihi jendelanya. Pendekkan kalimatnya di narasi.json atau buat ulang suaranya; suara tidak dipercepat.`); process.exit(3); }

// penguatan tetap
const raw = path.join(BUILD, 'voice-raw.wav'); writeWav(raw, mix);
const m = spawnSync('ffmpeg', ['-v', 'info', '-nostats', '-i', raw, '-af', 'ebur128=peak=sample', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
const lufs = Number([...m.matchAll(/\n\s+I:\s+(-?[\d.]+) LUFS/g)].pop()?.[1]);
const peak = Number([...m.matchAll(/Peak:\s+(-?[\d.]+) dBFS/g)].pop()?.[1]);
let gain = Number.isFinite(lufs) ? TARGET_LUFS - lufs : 0;
if (Number.isFinite(peak) && peak + gain > -1.5) gain = -1.5 - peak;
console.log(`suara: ${lufs} LUFS, puncak ${peak} dBFS -> penguatan tetap ${gain.toFixed(1)} dB`);
const voice = path.join(BUILD, 'voice.wav');
const r = spawnSync('ffmpeg', ['-y', '-v', 'error', '-i', raw, '-af', `volume=${gain.toFixed(2)}dB`, '-ar', String(SR), '-ac', '1', '-c:a', 'pcm_s16le', voice], { encoding: 'utf8' });
if (r.status !== 0) throw new Error(r.stderr);
// amplop gerak mulut dari suara akhir, per shot
const fin = decodePcm(voice);
const out = scenes.map((sc) => { const a = Math.round(sc.audioStart * SR); const b = Math.min(fin.length, a + Math.round((sc.audioSec + 0.1) * SR)); return { id: sc.id, start: sc.start, end: sc.end, audioStart: sc.audioStart, audioSec: sc.audioSec, env: envelope(fin.subarray(a, b), fps) }; });
fs.writeFileSync(path.join(BUILD, 'timeline.json'), JSON.stringify({ fps, total: TOTAL, engine: 'elevenlabs', scenes: out }));
console.log('selesai: build/voice.wav, build/timeline.json');

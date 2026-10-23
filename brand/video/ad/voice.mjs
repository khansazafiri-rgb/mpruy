// Suara draf untuk iklan: tiap baris naskah dibuat dengan Piper lalu DIPAS ke jendela
// waktu shot-nya (lengthScale turun sampai 0.8, lalu dipercepat dengan atempo bila perlu).
// Hasil: build/voice.wav (75 detik), build/timeline.json, out/<nama>.srt
// Suara ini hanya draf/penanda waktu. Untuk tayang, ganti dengan suara yang dibuat terpisah:
//   node voice.mjs --use rekaman/   (berkas s01.wav ... s16.wav, dipasang di tempat yang sama)
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodePcm, envelope, fmtSrtTime, readJson, SAMPLE_RATE, writeWav, wrapLines } from '../src/lib.mjs';
import { applyLexicon, synthPiper } from '../src/tts.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const spec = readJson(path.join(HERE, 'ad.json'));
const lex = readJson(path.join(HERE, '..', 'lexicon.json'));
const BUILD = path.join(HERE, 'build'); fs.mkdirSync(BUILD, { recursive: true });
const OUT = path.join(HERE, 'out'); fs.mkdirSync(OUT, { recursive: true });
const fps = spec.fps;
const useIdx = process.argv.indexOf('--use');
const useDir = useIdx > 0 ? path.resolve(process.argv[useIdx + 1]) : null;
const { leadIn, tailOut, maxSpeedUp } = spec.voice;

const wavDur = (f) => decodePcm(f).length / SAMPLE_RATE;
function atempo(inWav, outWav, factor) {
  const r = spawnSync('ffmpeg', ['-y', '-v', 'error', '-i', inWav, '-filter:a', `atempo=${factor.toFixed(4)}`, outWav], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(r.stderr);
}

const total = spec.total;
const mix = new Int16Array(Math.ceil(total * SAMPLE_RATE));
const scenes = []; const report = [];
for (const sc of spec.scenes) {
  const n = String(sc.id).padStart(2, '0');
  const avail = sc.end - sc.start - leadIn - tailOut;
  let wav = path.join(BUILD, `v${n}.wav`); let note = '';
  if (useDir) {
    wav = path.join(useDir, `s${n}.wav`);
    if (!fs.existsSync(wav)) throw new Error(`Rekaman ${wav} tidak ada`);
    note = 'rekaman sendiri';
  } else {
    const spoken = applyLexicon(sc.sayShort ?? sc.say, lex);
    let L = 1.0;
    synthPiper(spoken, wav, { lengthScale: L, sentenceSilence: 0.12 });
    let d = wavDur(wav);
    for (let i = 0; i < 3 && d > avail && L > 0.8; i++) {
      L = Math.max(0.8, +(L * (avail / d) * 0.97).toFixed(3));
      synthPiper(spoken, wav, { lengthScale: L, sentenceSilence: 0.12 }); d = wavDur(wav);
    }
    if (d > avail) {
      const f = Math.min(maxSpeedUp, d / avail);
      const fast = path.join(BUILD, `v${n}-fast.wav`); atempo(wav, fast, f); wav = fast; d = wavDur(wav);
      note = `atempo ${f.toFixed(2)}`;
    }
    if (L !== 1.0) note = `len ${L}${note ? ' + ' + note : ''}`;
  }
  const pcm = decodePcm(wav);
  const dur = pcm.length / SAMPLE_RATE;
  const at = sc.start + leadIn;
  const startSample = Math.round(at * SAMPLE_RATE);
  mix.set(pcm.subarray(0, Math.max(0, Math.min(pcm.length, mix.length - startSample))), startSample);
  scenes.push({ id: sc.id, start: sc.start, end: sc.end, dur: sc.end - sc.start, audioStart: at, audioSec: dur, env: envelope(pcm, fps) });
  const fit = dur <= avail + 0.02;
  report.push({ shot: sc.id, chars: (sc.sayShort ?? sc.say).length, window: +avail.toFixed(2), audio: +dur.toFixed(2), fit, note });
  console.log(`S${n} ${String((sc.sayShort ?? sc.say).length).padStart(3)} huruf  jendela ${avail.toFixed(2)}s  suara ${dur.toFixed(2)}s  ${fit ? 'pas' : 'MELEBIHI'}  ${note}`);
}
writeWav(path.join(BUILD, 'voice.wav'), mix);
fs.writeFileSync(path.join(BUILD, 'timeline.json'), JSON.stringify({ fps, total, scenes }));
fs.writeFileSync(path.join(BUILD, 'voice-report.json'), JSON.stringify(report, null, 1));

// SRT: teks persis dari naskah, tampil sepanjang suara bicara (bukan sepanjang shot).
const srt = spec.scenes.map((sc, i) => { const t = scenes[i]; return `${i + 1}\n${fmtSrtTime(t.audioStart)} --> ${fmtSrtTime(Math.min(t.end - 0.05, t.audioStart + t.audioSec + 0.25))}\n${wrapLines(sc.sayShort ?? sc.say, 38)}\n`; }).join('\n');
fs.writeFileSync(path.join(OUT, 'medcoel-iklan-75s.srt'), srt);
console.log('selesai: build/voice.wav, build/timeline.json, out/medcoel-iklan-75s.srt');

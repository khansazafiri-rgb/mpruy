// Suara iklan: tiap baris naskah (ad.json > scenes[].say) dibuat dengan profil suara Kori yang dipilih
// (voices.mjs) lalu ditempatkan di awal shot-nya. TIDAK ada percepatan untuk memaksa muat: baris yang
// melebihi jendela shot ditandai MELEBIHI dan harus dipendekkan di ad.json.
// Hasil: build/voice.wav (75 detik), build/timeline.json, out/<nama>.srt
//   node voice.mjs [--profile ceria|hangat|mungil] [--engine espeak|piper]
//   node voice.mjs --use rekaman/     (berkas s01.wav ... s16.wav = rekaman suara sendiri)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodePcm, envelope, fmtSrtTime, readJson, SAMPLE_RATE, writeWav, wrapLines } from '../src/lib.mjs';
import { applyLexicon } from '../src/tts.mjs';
import { synthLine } from './voices.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const spec = readJson(path.join(HERE, 'ad.json'));
const lex = readJson(path.join(HERE, '..', 'lexicon.json'));
const BUILD = path.join(HERE, 'build'); fs.mkdirSync(BUILD, { recursive: true });
const OUT = path.join(HERE, 'out'); fs.mkdirSync(OUT, { recursive: true });
const fps = spec.fps;
const useDir = opt('use') ? path.resolve(opt('use')) : null;
const engine = opt('engine', spec.voice.engine || 'espeak');
const profile = opt('profile', spec.voice.profile || 'ceria');
const { leadIn, tailOut } = spec.voice;

const total = spec.total;
const mix = new Int16Array(Math.ceil(total * SAMPLE_RATE));
const scenes = []; const report = [];
for (const sc of spec.scenes) {
  const n = String(sc.id).padStart(2, '0');
  const avail = sc.end - sc.start - leadIn - tailOut;
  let wav = path.join(BUILD, `v${n}.wav`);
  if (useDir) {
    wav = path.join(useDir, `s${n}.wav`);
    if (!fs.existsSync(wav)) throw new Error(`Rekaman ${wav} tidak ada`);
  } else {
    synthLine(applyLexicon(sc.say, lex), wav, { engine, profile });
  }
  const pcm = decodePcm(wav);
  const dur = pcm.length / SAMPLE_RATE;
  const at = sc.start + leadIn;
  const startSample = Math.round(at * SAMPLE_RATE);
  mix.set(pcm.subarray(0, Math.max(0, Math.min(pcm.length, mix.length - startSample))), startSample);
  scenes.push({ id: sc.id, start: sc.start, end: sc.end, dur: sc.end - sc.start, audioStart: at, audioSec: dur, env: envelope(pcm, fps) });
  const fit = dur <= avail + 0.02;
  report.push({ shot: sc.id, chars: sc.say.length, window: +avail.toFixed(2), audio: +dur.toFixed(2), fit });
  console.log(`S${n} ${String(sc.say.length).padStart(3)} huruf  jendela ${avail.toFixed(2)}s  suara ${dur.toFixed(2)}s  ${fit ? 'pas' : 'MELEBIHI, pendekkan kalimatnya'}`);
}
writeWav(path.join(BUILD, 'voice.wav'), mix);
fs.writeFileSync(path.join(BUILD, 'timeline.json'), JSON.stringify({ fps, total, engine: useDir ? 'rekaman' : `${engine}:${profile}`, scenes }));
fs.writeFileSync(path.join(BUILD, 'voice-report.json'), JSON.stringify(report, null, 1));

// SRT: teks persis seperti naskah, tampil sepanjang suara bicara (bukan sepanjang shot).
const srt = spec.scenes.map((sc, i) => { const t = scenes[i]; return `${i + 1}\n${fmtSrtTime(t.audioStart)} --> ${fmtSrtTime(Math.min(t.end - 0.05, t.audioStart + t.audioSec + 0.25))}\n${wrapLines(sc.say, 38)}\n`; }).join('\n');
fs.writeFileSync(path.join(OUT, 'medcoel-iklan-75s.srt'), srt);
console.log(`selesai (${useDir ? 'rekaman sendiri' : `${engine}:${profile}`}): build/voice.wav, build/timeline.json, out/medcoel-iklan-75s.srt`);

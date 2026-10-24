// Tiga contoh suara Kori untuk narasi 0-12 detik (shot 1-3), dipas ke waktu shot tanpa dipercepat.
//   node voice-samples.mjs            -> out/voice-samples/kori-<profil>.wav + .mp3
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodePcm, readJson, SAMPLE_RATE, writeWav } from '../src/lib.mjs';
import { applyLexicon } from '../src/tts.mjs';
import { PROFILES, synthLine, wavSeconds } from './voices.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const spec = readJson(path.join(HERE, 'ad.json'));
const lex = readJson(path.join(HERE, '..', 'lexicon.json'));
const OUT = path.join(HERE, 'out', 'voice-samples'); fs.mkdirSync(OUT, { recursive: true });
const TMP = path.join(HERE, 'build', 'voice-samples'); fs.mkdirSync(TMP, { recursive: true });
const scenes = spec.scenes.filter((s) => s.end <= 12);
const lead = spec.voice.leadIn; const tail = spec.voice.tailOut;

for (const [key, p] of Object.entries(PROFILES)) {
  const mix = new Int16Array(12 * SAMPLE_RATE);
  const rows = [];
  for (const sc of scenes) {
    const wav = path.join(TMP, `${key}-s${sc.id}.wav`);
    synthLine(applyLexicon(sc.say, lex), wav, { profile: key });
    const pcm = decodePcm(wav); const dur = pcm.length / SAMPLE_RATE;
    const avail = sc.end - sc.start - lead - tail;
    mix.set(pcm.subarray(0, Math.min(pcm.length, mix.length - Math.round((sc.start + lead) * SAMPLE_RATE))), Math.round((sc.start + lead) * SAMPLE_RATE));
    rows.push(`S${sc.id} ${dur.toFixed(2)}s / ${avail.toFixed(2)}s ${dur <= avail + 0.02 ? 'pas' : 'MELEBIHI'}`);
  }
  const wavOut = path.join(OUT, `kori-${key}.wav`); writeWav(wavOut, mix);
  spawnSync('ffmpeg', ['-y', '-v', 'error', '-i', wavOut, '-codec:a', 'libmp3lame', '-q:a', '3', path.join(OUT, `kori-${key}.mp3`)]);
  console.log(`${p.label} (${p.note})  ${rows.join('  |  ')}`);
}

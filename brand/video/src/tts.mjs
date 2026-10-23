// Naskah -> suara. Menghasilkan satu voice.wav, timeline.json (waktu tiap scene
// dan bukaan mulut per frame) dan berkas .srt.
//
// Mesin suara (scenes.json -> "voice.engine"):
//   piper   (bawaan) suara lokal di server sendiri, tanpa biaya per pemakaian.
//   file    rekaman sendiri: isi "audio": "rekaman/s1.wav" di tiap scene.
//   command mesin lain lewat perintah: env TTS_COMMAND, mis.
//           'mytts --text-file {in} --out {out}'  (menghasilkan WAV/MP3/OGG)
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { decodePcm, envelope, fmtSrtTime, KIT, readJson, SAMPLE_RATE, writeWav, wrapLines } from './lib.mjs';

/** Terapkan kamus pelafalan ke teks yang akan DIUCAPKAN (bukan teks layar). */
export function applyLexicon(text, lex) {
  let t = String(text);
  const words = Object.entries(lex.words || {}).sort((a, b) => b[0].length - a[0].length);
  for (const [from, to] of words) {
    const esc = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    t = t.replace(new RegExp(`(?<![\\p{L}\\p{N}])${esc}(?![\\p{L}\\p{N}])`, 'gu'), to);
  }
  if (lex.percent) t = t.replace(/(\d)\s*%/g, `$1${lex.percent}`);
  if (lex.slash) t = t.replace(/(\d)\s*\/\s*(\d)/g, `$1${lex.slash}$2`);
  return t.replace(/\s+/g, ' ').trim();
}

function piperCmd() {
  if (process.env.PIPER_CMD) return process.env.PIPER_CMD.split(/\s+/).filter(Boolean);
  const venv = path.join(KIT, '.venv', 'bin', 'piper');
  return [fs.existsSync(venv) ? venv : 'piper'];
}

export function piperVoicePath(voice = {}) {
  const v = voice.model || process.env.PIPER_VOICE || path.join(KIT, 'voices', 'id_ID-news_tts-medium.onnx');
  return path.isAbsolute(v) ? v : path.resolve(KIT, v);
}

export function synthPiper(text, outWav, voice = {}) {
  const model = piperVoicePath(voice);
  if (!fs.existsSync(model)) throw new Error(`Model suara tidak ditemukan: ${model}\nJalankan: bash scripts/setup.sh`);
  const [bin, ...pre] = piperCmd();
  const args = [...pre, '-m', model, '-f', outWav, '--length-scale', String(voice.lengthScale ?? 1.0), '--sentence-silence', String(voice.sentenceSilence ?? 0.25)];
  if (voice.noiseScale !== undefined) args.push('--noise-scale', String(voice.noiseScale));
  const r = spawnSync(bin, args, { input: text, encoding: 'utf8' });
  if (r.error) throw new Error(`Piper tidak bisa dijalankan (${bin}): ${r.error.message}`);
  if (r.status !== 0 || !fs.existsSync(outWav)) throw new Error(`Piper gagal:\n${r.stderr || r.stdout}`);
}

export function synthCommand(text, outFile, tmpDir) {
  const tpl = process.env.TTS_COMMAND;
  if (!tpl) throw new Error('Engine "command" butuh env TTS_COMMAND, mis. TTS_COMMAND=\'mytts --text-file {in} --out {out}\'');
  const inFile = path.join(tmpDir, 'say.txt');
  fs.writeFileSync(inFile, text);
  const cmd = tpl.replaceAll('{in}', JSON.stringify(inFile)).replaceAll('{out}', JSON.stringify(outFile));
  const r = spawnSync(cmd, { shell: true, encoding: 'utf8' });
  if (r.status !== 0 || !fs.existsSync(outFile)) throw new Error(`TTS_COMMAND gagal:\n${r.stderr || r.stdout}`);
}

/**
 * @returns {{timeline, voiceWav, srt}}  ditulis ke buildDir
 */
export function buildAudio(spec, { buildDir, specDir, fps = 30, log = console.log }) {
  fs.mkdirSync(buildDir, { recursive: true });
  const lex = fs.existsSync(path.join(KIT, 'lexicon.json')) ? readJson(path.join(KIT, 'lexicon.json')) : {};
  const engine = spec.voice?.engine || 'piper';
  const lead = spec.leadIn ?? 0.2;

  let cursor = 0;
  const scenes = [];
  const chunks = [];            // { start (sampel), pcm }
  spec.scenes.forEach((sc, i) => {
    const n = String(i + 1).padStart(2, '0');
    let pcm = null; let spoken = '';
    if (sc.audio) {
      pcm = decodePcm(path.resolve(specDir, sc.audio));
    } else if (sc.say && engine !== 'none') {
      spoken = applyLexicon(sc.say, lex);
      const wav = path.join(buildDir, `scene-${n}.wav`);
      if (engine === 'piper') synthPiper(spoken, wav, spec.voice || {});
      else if (engine === 'command' || engine === 'file') synthCommand(spoken, wav, buildDir);
      else throw new Error(`Engine suara tidak dikenal: ${engine}`);
      pcm = decodePcm(wav);
    }
    const audioSec = pcm ? pcm.length / SAMPLE_RATE : 0;
    const pause = sc.pause ?? 0.4;
    const dur = pcm ? Math.max(sc.minDuration ?? 1.5, lead + audioSec + pause) : (sc.duration ?? 3);
    const env = pcm ? envelope(pcm, fps) : [];
    scenes.push({ index: i, start: cursor, dur, lead, audioSec, spoken, env });
    if (pcm) chunks.push({ start: Math.round((cursor + lead) * SAMPLE_RATE), pcm });
    log(`  scene ${n}: ${dur.toFixed(2)} dtk${spoken ? `  (“${spoken.slice(0, 48)}${spoken.length > 48 ? '…' : ''}”)` : ''}`);
    cursor += dur;
  });

  const total = Math.ceil(cursor * SAMPLE_RATE);
  const mix = new Int16Array(total);
  for (const c of chunks) mix.set(c.pcm.subarray(0, Math.max(0, Math.min(c.pcm.length, total - c.start))), c.start);
  const voiceWav = path.join(buildDir, 'voice.wav');
  writeWav(voiceWav, mix);

  const srt = spec.scenes.map((sc, i) => {
    const t = scenes[i];
    const text = sc.caption ?? sc.say;
    if (!text) return '';
    const a = t.start + (t.audioSec ? t.lead : 0.1);
    const b = t.start + Math.min(t.dur, (t.audioSec ? t.lead + t.audioSec + 0.3 : t.dur));
    return `${i + 1}\n${fmtSrtTime(a)} --> ${fmtSrtTime(b)}\n${wrapLines(text)}\n`;
  }).filter(Boolean).join('\n');
  const srtFile = path.join(buildDir, 'subtitle.srt');
  fs.writeFileSync(srtFile, srt);

  const timeline = { fps, total: cursor, scenes };
  fs.writeFileSync(path.join(buildDir, 'timeline.json'), JSON.stringify(timeline));
  return { timeline, voiceWav, srtFile };
}

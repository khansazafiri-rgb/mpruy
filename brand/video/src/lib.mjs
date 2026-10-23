// Fungsi bersama kit video. Tanpa dependensi selain Node dan ffmpeg.
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const KIT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const REPO = path.resolve(KIT, '..', '..');
export const SAMPLE_RATE = 44100;

export const FORMATS = {
  '16:9': { w: 1920, h: 1080, cls: 'land' },
  '9:16': { w: 1080, h: 1920, cls: 'port' },
  '1:1': { w: 1080, h: 1080, cls: 'square' },
};

export function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function slug(s) {
  return String(s || 'video').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'video';
}

export function need(cmd, hint) {
  const r = spawnSync(cmd, ['-version'], { encoding: 'utf8' });
  if (r.error) throw new Error(`${cmd} tidak ditemukan. ${hint || ''}`.trim());
}

/** Dekode audio apa pun menjadi PCM 16-bit mono 44.1 kHz (Int16Array). */
export function decodePcm(file) {
  const buf = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-f', 's16le', '-ac', '1', '-ar', String(SAMPLE_RATE), '-'], { maxBuffer: 1 << 30 });
  return new Int16Array(buf.buffer, buf.byteOffset, Math.floor(buf.byteLength / 2));
}

/** Tulis WAV 16-bit mono. */
export function writeWav(file, pcm, rate = SAMPLE_RATE) {
  const data = Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8); h.write('fmt ', 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(data.length, 40);
  fs.writeFileSync(file, Buffer.concat([h, data]));
}

/**
 * Seberapa "terbuka" mulut tiap frame (0..1) dari kenyaringan suara.
 * RMS per jendela 1/fps detik, dinormalkan ke persentil 95, lalu dihaluskan
 * supaya mulut tidak berkedip-kedip.
 */
export function envelope(pcm, fps) {
  const win = Math.max(1, Math.round(SAMPLE_RATE / fps));
  const n = Math.ceil(pcm.length / win);
  const rms = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0; const a = i * win; const b = Math.min(pcm.length, a + win);
    for (let j = a; j < b; j++) { const v = pcm[j] / 32768; s += v * v; }
    rms[i] = Math.sqrt(s / Math.max(1, b - a));
  }
  const sorted = Array.from(rms).sort((x, y) => x - y);
  const ref = Math.max(0.02, sorted[Math.floor(sorted.length * 0.95)] || 0.02);
  const out = []; let prev = 0;
  for (let i = 0; i < n; i++) {
    let v = Math.min(1, rms[i] / ref);
    if (v < 0.12) v = 0;                       // gerbang kebisingan
    v = Math.max(v, prev * 0.55);              // turun pelan
    prev = v; out.push(Math.round(v * 100) / 100);
  }
  return out;
}

export function fmtSrtTime(sec) {
  const ms = Math.round(sec * 1000);
  const p = (n, l = 2) => String(n).padStart(l, '0');
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
}

/** Bungkus teks teks jadi baris maksimal `max` karakter untuk SRT. */
export function wrapLines(text, max = 42) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = []; let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > max && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim();
  }
  if (cur) lines.push(cur);
  return lines.join('\n');
}

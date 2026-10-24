// Mesin dan profil suara Kori untuk iklan.
//
// LISENSI (penting untuk iklan):
// - "espeak": eSpeak NG (GPL-3.0) menyintesis suara dari aturan fonem, tanpa rekaman manusia.
//   Software-nya GPL; lisensi GPL tidak mengklaim hasil keluarannya, dan tidak ada data suara
//   pihak ketiga yang ikut. Ini satu-satunya pilihan lokal di sini yang tidak bergantung pada
//   korpus suara berlisensi tidak jelas. Kualitasnya robotik; untuk tayang akhir, pakai rekaman
//   sendiri atau layanan resmi berlisensi komersial lewat engine "file"/"command".
// - "piper": suara id_ID news_tts. TIDAK dipakai untuk promosi: kartu modelnya menautkan korpus
//   yang tidak jelas ("See URL" -> halaman Kaggle), dan namanya sama dengan korpus INDspeech_NEWS_TTS
//   (ATR) yang berlisensi CC-BY-NC-SA 4.0 (non-komersial). Hanya untuk uji lokal.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { decodePcm, SAMPLE_RATE } from '../src/lib.mjs';
import { synthPiper } from '../src/tts.mjs';

export const PROFILES = {
  ceria:  { label: 'Kori 1 · ceria',  voice: 'id+f3', pitch: 72, wpm: 175, shift: 1.00, note: 'cerah dan ramah' },
  hangat: { label: 'Kori 2 · hangat', voice: 'id+f5', pitch: 58, wpm: 175, shift: 1.00, note: 'lebih rendah dan tenang' },
  mungil: { label: 'Kori 3 · mungil', voice: 'id+m3', pitch: 80, wpm: 175, shift: 1.16, note: 'tinggi dan lucu, cocok untuk makhluk kecil' },
};

function run(cmd, args, input) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', input });
  if (r.error) throw new Error(`${cmd} tidak bisa dijalankan: ${r.error.message}${cmd === 'espeak-ng' ? '\nPasang: sudo apt-get install espeak-ng' : ''}`);
  if (r.status !== 0) throw new Error(`${cmd} gagal:\n${r.stderr}`);
}

// Pelembut ringan: buang dengung rendah dan desis tajam khas sintesis formant, sedikit kehadiran vokal.
const POLISH = 'highpass=f=70,lowpass=f=9000,equalizer=f=2800:t=q:w=1:g=2,acompressor=threshold=-20dB:ratio=3:attack=5:release=120,loudnorm=I=-17:TP=-2:LRA=7';

/** Menyintesis satu kalimat ke WAV 44,1 kHz mono. speed (0.8-1.1) hanya mengubah kecepatan dasar, tanpa atempo. */
export function synthLine(text, outWav, { engine = 'espeak', profile = 'ceria', speed = 1 } = {}) {
  if (engine === 'piper') { synthPiper(text, outWav, { lengthScale: 1 / speed }); return; }
  const p = PROFILES[profile];
  if (!p) throw new Error(`Profil suara tidak dikenal: ${profile} (pilihan: ${Object.keys(PROFILES).join(', ')})`);
  const raw = `${outWav}.raw.wav`;
  run('espeak-ng', ['-v', p.voice, '-s', String(Math.round(p.wpm * speed)), '-p', String(p.pitch), '-a', '140', '-g', '2', '-w', raw, text]);
  const shift = p.shift !== 1 ? `asetrate=${Math.round(22050 * p.shift)},aresample=${SAMPLE_RATE},atempo=${(1 / p.shift).toFixed(4)},` : `aresample=${SAMPLE_RATE},`;
  run('ffmpeg', ['-y', '-v', 'error', '-i', raw, '-af', shift + POLISH, '-ac', '1', '-ar', String(SAMPLE_RATE), outWav]);
  fs.rmSync(raw, { force: true });
}

export const wavSeconds = (f) => decodePcm(f).length / SAMPLE_RATE;

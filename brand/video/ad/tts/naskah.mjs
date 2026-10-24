// Membuat naskah ElevenLabs (teks ucapan saja) dari narasi-final.json dan memeriksa tiap kalimat terhadap
// jendela waktu shotnya. Perkiraan lama bicara memakai laju yang terukur dari contoh pengguna:
// 132 huruf (shot 1-3) = sekitar 8 detik pada pengaturan ElevenLabs miliknya (Speed paling cepat).
//   node naskah.mjs [--rate 16.5]      huruf per detik; Speed 1.0 kira-kira 13.8
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const rate = Number((argv.includes('--rate') ? argv[argv.indexOf('--rate') + 1] : 16.5));
const spec = JSON.parse(fs.readFileSync(path.join(HERE, 'narasi-final.json'), 'utf8')).shot;
const ad = JSON.parse(fs.readFileSync(path.join(HERE, '..', 'ad.json'), 'utf8'));
const base = JSON.parse(fs.readFileSync(path.join(HERE, 'base-timeline.json'), 'utf8'));
const { leadIn, tailOut } = ad.voice;
const GAP = 0.3;

// Naskah: satu baris per shot, kalimat dalam shot dipisah spasi. Hanya teks yang diucapkan.
const lines = ad.scenes.map((s) => spec[String(s.id).padStart(2, '0')].teks.join(' '));
fs.writeFileSync(path.join(HERE, 'naskah-elevenlabs.txt'), lines.join('\n') + '\n');

const rows = ad.scenes.map((s, i) => {
  const parts = spec[String(s.id).padStart(2, '0')].teks;
  const est = parts.reduce((n, t) => n + t.length / rate, 0) + (parts.length - 1) * GAP;
  const win = s.end - s.start - leadIn - tailOut;
  const old = base.scenes[i].audioSec;
  return { shot: s.id, huruf: lines[i].length, perkiraan: +est.toFixed(1), jendela: +win.toFixed(1), sisa: +(win - est).toFixed(1), takarirV2: old, status: est > win ? 'TIDAK MUAT' : est > win * 0.9 ? 'mepet' : 'muat' };
});
console.table(rows);
const all = lines.join(' ').length;
console.log(`total ${all} huruf (batas ElevenLabs 5.000), perkiraan ${rows.reduce((n, r) => n + r.perkiraan, 0).toFixed(0)} detik bicara pada ${rate} huruf/detik`);

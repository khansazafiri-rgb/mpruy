// Naskah ElevenLabs video ke-2 (teks ucapan saja, satu baris per shot) dan pemeriksaan muat/tidaknya tiap kalimat
// di jendela waktu shotnya. Laju bicara diukur dari rekaman ElevenLabs pemilik (video 1): sekitar 17 huruf/detik.
//   node naskah.mjs [--rate 17]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const rate = Number(argv.includes('--rate') ? argv[argv.indexOf('--rate') + 1] : 17);
const shots = JSON.parse(fs.readFileSync(path.join(HERE, 'narasi.json'), 'utf8')).shot;
const LEAD = 0.12, TAIL = 0.08, GAP = 0.3;
const ids = Object.keys(shots).sort();
fs.writeFileSync(path.join(HERE, 'naskah-elevenlabs.txt'), ids.map((k) => shots[k].teks.join(' ')).join('\n') + '\n');
const rows = ids.map((k) => {
  const s = shots[k]; const txt = s.teks.join(' ');
  const est = s.teks.reduce((n, t) => n + t.length / rate, 0) + (s.teks.length - 1) * GAP;
  const win = s.end - s.start - LEAD - TAIL;
  return { shot: +k, huruf: txt.length, perkiraan: +est.toFixed(1), jendela: +win.toFixed(1), sisa: +(win - est).toFixed(1), status: est > win ? 'TIDAK MUAT' : est > win * 0.9 ? 'mepet' : 'muat' };
});
console.table(rows);
console.log(`total ${ids.map((k) => shots[k].teks.join(' ')).join(' ').length} huruf`);

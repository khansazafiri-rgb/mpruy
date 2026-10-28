// Memasukkan / memperbarui catatan materi per BAB lewat API PocketBase.
//
// Isi diambil dari apps/pocketbase/content/materi (index.json + file .md),
// hasil tools/materi-import. Dipakai setelah isi dokumen sumber berubah dan
// konverter dijalankan ulang; pemasangan pertama sudah ditangani migrasi
// 1800002500_seed_materi.js.
//
//   PB_SU_EMAIL=admin@contoh.test PB_SU_PASSWORD=... node scripts/import-materi.mjs [--dry] [--force]
//   PB_URL=https://medcoel.com  (bawaan http://127.0.0.1:8090)
//
// Catatan yang ditulis tangan oleh admin (tanpa penanda "materi:v2") dilewati
// kecuali --force.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const MARK = '<!-- materi:v2 -->';
const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'content', 'materi');
const dry = process.argv.includes('--dry');
const force = process.argv.includes('--force');
const B = (process.env.PB_URL || 'http://127.0.0.1:8090').replace(/\/$/, '');

if (!process.env.PB_SU_EMAIL || !process.env.PB_SU_PASSWORD) {
  console.error('Isi PB_SU_EMAIL dan PB_SU_PASSWORD (akun superuser PocketBase).');
  process.exit(1);
}

async function call(method, path, body, token) {
  const r = await fetch(B + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${method} ${path}: ${r.status} ${JSON.stringify(data)}`);
  return data;
}
const q = (s) => encodeURIComponent(s);
const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"');

const index = JSON.parse(readFileSync(join(root, 'index.json'), 'utf8'));
const su = (await call('POST', '/api/collections/_superusers/auth-with-password', { identity: process.env.PB_SU_EMAIL, password: process.env.PB_SU_PASSWORD })).token;

const stat = { dibuat: 0, diperbarui: 0, dilewati: 0, tidakAda: 0, sama: 0 };
for (const e of index) {
  const subject = (await call('GET', `/api/collections/subjects/records?perPage=1&filter=${q(`slug="${esc(e.subject)}"`)}`, null, su)).items[0];
  const chapter = subject && (await call('GET', `/api/collections/chapters/records?perPage=1&filter=${q(`subject="${subject.id}" && title="${esc(e.chapter)}" && drilling=false`)}`, null, su)).items[0];
  if (!chapter) { console.log(`TIDAK ADA  ${e.subject} / ${e.chapter}`); stat.tidakAda++; continue; }
  const content = readFileSync(join(root, e.file), 'utf8');
  const old = (await call('GET', `/api/collections/chapter_notes/records?perPage=1&filter=${q(`chapter="${chapter.id}"`)}`, null, su)).items[0];
  if (old && old.content.trim() && !old.content.startsWith(MARK) && !force) { console.log(`DILEWATI   ${e.chapter} (tulisan admin; pakai --force untuk menimpa)`); stat.dilewati++; continue; }
  if (old && old.content === content) { stat.sama++; continue; }
  console.log(`${dry ? '(uji) ' : ''}${old ? 'PERBARUI   ' : 'BUAT       '}${e.chapter}  ${content.length.toLocaleString('id-ID')} karakter`);
  if (!dry) {
    if (old) await call('PATCH', `/api/collections/chapter_notes/records/${old.id}`, { content }, su);
    else await call('POST', '/api/collections/chapter_notes/records', { chapter: chapter.id, content }, su);
  }
  old ? stat.diperbarui++ : stat.dibuat++;
}
console.log(stat);

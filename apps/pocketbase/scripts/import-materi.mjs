// Memasukkan / memperbarui catatan materi per BAB lewat API PocketBase.
//
// Isi diambil dari apps/pocketbase/content/materi (index.json + file .md),
// hasil tools/materi-import. Server yang dijalankan ulang sudah memasang isi ini sendiri
// (pb_hooks/materi.pb.js); skrip ini untuk memasang langsung tanpa restart atau dari komputer lain.
//
//   PB_SU_EMAIL=admin@contoh.test PB_SU_PASSWORD=... node scripts/import-materi.mjs [--dry] [--force]
//   PB_URL=https://medcoel.com  (bawaan http://127.0.0.1:8090)
//
// Aturan sama dengan server (pb_hooks/lib/materiSync.js): catatan yang sudah disunting admin atau
// ditulis tangan dilewati, kecuali --force.
import { createHash } from 'node:crypto';
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
const sha = (t) => createHash('sha256').update(t).digest('hex');
const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"');

const index = JSON.parse(readFileSync(join(root, 'index.json'), 'utf8'));
const su = (await call('POST', '/api/collections/_superusers/auth-with-password', { identity: process.env.PB_SU_EMAIL, password: process.env.PB_SU_PASSWORD })).token;

const stat = { dibuat: 0, diperbarui: 0, dilewati: 0, tidakAda: 0, sama: 0 };
for (const e of index) {
  const subject = (await call('GET', `/api/collections/subjects/records?perPage=1&filter=${q(`slug="${esc(e.subject)}" || name="${esc(e.subjectName || e.subject)}"`)}`, null, su)).items[0];
  const chapter = subject && (await call('GET', `/api/collections/chapters/records?perPage=1&filter=${q(`subject="${subject.id}" && title="${esc(e.chapter)}" && drilling=false`)}`, null, su)).items[0];
  if (!chapter) { console.log(`TIDAK ADA  ${e.subject} / ${e.chapter}`); stat.tidakAda++; continue; }
  const content = readFileSync(join(root, e.file), 'utf8');
  const hash = sha(content);
  const old = (await call('GET', `/api/collections/chapter_notes/records?perPage=1&filter=${q(`chapter="${chapter.id}"`)}`, null, su)).items[0];
  if (old && old.content === content) {
    if (old.seedHash !== hash && !dry) await call('PATCH', `/api/collections/chapter_notes/records/${old.id}`, { seedHash: hash }, su);
    stat.sama++;
    continue;
  }
  const untouched = old && (!old.content.trim() || (old.seedHash ? sha(old.content) === old.seedHash : old.content.startsWith(MARK)));
  if (old && !untouched && !force) { console.log(`DILEWATI   ${e.chapter} (disunting admin; pakai --force untuk menimpa)`); stat.dilewati++; continue; }
  console.log(`${dry ? '(uji) ' : ''}${old ? 'PERBARUI   ' : 'BUAT       '}${e.chapter}  ${content.length.toLocaleString('id-ID')} karakter`);
  if (!dry) {
    if (old) await call('PATCH', `/api/collections/chapter_notes/records/${old.id}`, { content, seedHash: hash }, su);
    else await call('POST', '/api/collections/chapter_notes/records', { chapter: chapter.id, content, seedHash: hash }, su);
  }
  old ? stat.diperbarui++ : stat.dibuat++;
}
console.log(stat);

// TES API "SOAL YANG SALAH" (daftar soal yang jawaban terakhirnya salah + latih ulang).
//
//   MEDCOEL_DEV_MODE=1 ./pocketbase serve --http=127.0.0.1:8090 --dir=/tmp/pb-test --migrationsDir=./pb_migrations --hooksDir=./pb_hooks
//   ./pocketbase superuser upsert dev@medcoel.local devpassword123 --dir=/tmp/pb-test
//   PB_URL=http://127.0.0.1:8090 node test/wrong-api.test.mjs
//
// Tes ini MENGISI database dengan data uji; jangan dijalankan ke server produksi.
import assert from 'node:assert/strict';

const B = process.env.PB_URL || 'http://127.0.0.1:8090';
const SU = { identity: process.env.PB_SU_EMAIL || 'dev@medcoel.local', password: process.env.PB_SU_PASSWORD || 'devpassword123' };
const RUN = Date.now().toString(36);

let lulus = 0;
const langkah = async (nama, fn) => {
  try { await fn(); lulus++; console.log('  ok', nama); } catch (e) { console.error('GAGAL:', nama, '\n', e); process.exitCode = 1; }
};
async function call(method, path, body, token, expect) {
  const headers = {};
  if (token) headers.Authorization = token;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const r = await fetch(B + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await r.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  if (expect !== undefined && r.status !== expect) throw new Error(`${method} ${path} -> ${r.status}, harapannya ${expect}: ${text.slice(0, 400)}`);
  return { status: r.status, data };
}

const su = (await call('POST', '/api/collections/_superusers/auth-with-password', SU, null, 200)).data.token;
async function akun(role) {
  const loginId = `${role}${RUN}${Math.random().toString(36).slice(2, 5)}`;
  const password = 'rahasia-' + RUN;
  await call('POST', '/api/collections/users/records', { loginId, name: `${role} Uji`, email: `${loginId}@contoh.test`, password, passwordConfirm: password, role, verified: true }, su, 200);
  const a = (await call('POST', '/api/collections/users/auth-with-password', { identity: loginId, password }, null, 200)).data;
  return { token: a.token, id: a.record.id };
}
const subjects = (await call('GET', '/api/medcoel/public-subjects', undefined, null, 200)).data.items;
const mk = subjects[7];
const admin = await akun('admin');
const agent = await akun('agent');
const userA = await akun('user');
const userB = await akun('user');

// 2 BAB, masing-masing 3 soal; opsi benar selalu bertuliskan "Benar".
const soal = (judul, n) => Array.from({ length: n }, (_, i) => ({ type: 'A', difficulty: 'easy', text: `${judul} ${RUN} nomor ${i + 1}?`, options: ['Salah satu', { text: 'Benar', correct: true }, 'Salah dua'], explanation: 'Pembahasan ' + judul }));
await call('POST', '/api/medcoel/agent/import', { subject: mk.slug, chapter: 'Osteologi ' + RUN, questions: soal('Osteo', 3) }, agent.token, 200);
await call('POST', '/api/medcoel/agent/import', { subject: mk.slug, chapter: 'Artrologi ' + RUN, questions: soal('Artro', 3) }, agent.token, 200);
const detail = (await call('GET', `/api/medcoel/subjects/${mk.slug}`, undefined, userA.token, 200)).data;
const bab = (judul) => detail.chapters.find((c) => c.title === judul + ' ' + RUN);
const osteo = bab('Osteologi');
const artro = bab('Artrologi');
assert.ok(osteo && artro);

const benarLabel = (q) => q.options.find((o) => o.text === 'Benar').label;
const salahLabel = (q) => q.options.find((o) => o.text !== 'Benar').label;
async function kerjakan(user, chapter, { mode = 'learning', benar }) {
  const att = (await call('POST', '/api/medcoel/attempts/practice', { chapter: chapter.id, count: 3, mode }, user.token, 200)).data;
  const hasil = [];
  for (const [i, q] of att.questions.entries()) {
    const jawab = benar[i] ? benarLabel(q) : salahLabel(q);
    await call('POST', `/api/medcoel/attempts/${att.attempt.id}/answer`, { question: q.id, response: jawab, check: mode === 'learning' }, user.token, 200);
    hasil.push({ id: q.id, jawab });
  }
  return { id: att.attempt.id, hasil };
}

console.log('Soal yang salah');
await langkah('pengunjung ditolak; pengguna baru belum punya soal salah', async () => {
  await call('GET', '/api/medcoel/wrong', undefined, null, 401);
  await call('POST', '/api/medcoel/attempts/wrong', {}, null, 401);
  const w = (await call('GET', '/api/medcoel/wrong', undefined, userA.token, 200)).data;
  assert.equal(w.total, 0);
  assert.deepEqual(w.items, []);
  await call('POST', '/api/medcoel/attempts/wrong', {}, userA.token, 400);
});

let osteoAtt;
await langkah('jawaban salah yang sudah dicek (mode Learning) masuk daftar, lengkap dengan kunci, pembahasan, dan jawaban pengguna', async () => {
  osteoAtt = await kerjakan(userA, osteo, { benar: [true, false, false] });
  const w = (await call('GET', '/api/medcoel/wrong', undefined, userA.token, 200)).data;
  assert.equal(w.total, 2);
  assert.equal(w.items.length, 2);
  const it = w.items[0];
  assert.equal(it.times, 1);
  assert.ok(it.question.answer, 'kunci ikut dikirim karena soal sudah dijawab dan terkunci');
  assert.match(String(it.question.explanation?.text || it.question.explanation || JSON.stringify(it.question.explanation)), /Pembahasan Osteo/);
  const salahIds = osteoAtt.hasil.filter((h, i) => i > 0).map((h) => h.id).sort();
  assert.deepEqual(w.items.map((x) => x.id).sort(), salahIds);
  assert.ok(it.response && it.response !== it.question.answer, 'jawaban pengguna ditampilkan dan berbeda dari kunci');
  assert.equal(it.attempt.id, osteoAtt.id);
  assert.equal(it.chapter.id, osteo.id);
  assert.equal(it.subject.id, mk.id);
});

await langkah('mode ujian: jawaban belum terkunci sebelum selesai, jadi belum masuk daftar; setelah selesai masuk', async () => {
  const exam = await kerjakan(userA, artro, { mode: 'exam', benar: [false, false, true] });
  assert.equal((await call('GET', '/api/medcoel/wrong', undefined, userA.token, 200)).data.total, 2, 'belum selesai: tidak bocor');
  await call('POST', `/api/medcoel/attempts/${exam.id}/finish`, { answers: {} }, userA.token, 200);
  const w = (await call('GET', '/api/medcoel/wrong', undefined, userA.token, 200)).data;
  assert.equal(w.total, 4);
});

await langkah('ringkasan per mata kuliah dan BAB; saringan dan halaman', async () => {
  const w = (await call('GET', '/api/medcoel/wrong', undefined, userA.token, 200)).data;
  const s = w.subjects.find((x) => x.id === mk.id);
  assert.equal(s.count, 4);
  assert.deepEqual(s.chapters.map((c) => [c.title, c.count]), [['Artrologi ' + RUN, 2], ['Osteologi ' + RUN, 2]]);
  const f = (await call('GET', `/api/medcoel/wrong?subject=${mk.id}&chapter=${artro.id}`, undefined, userA.token, 200)).data;
  assert.equal(f.count, 2);
  assert.ok(f.items.every((x) => x.chapter.id === artro.id));
  assert.equal(f.total, 4, 'total tidak ikut tersaring (dipakai untuk lencana)');
  const p1 = (await call('GET', '/api/medcoel/wrong?perPage=3&page=1', undefined, userA.token, 200)).data;
  const p2 = (await call('GET', '/api/medcoel/wrong?perPage=3&page=2', undefined, userA.token, 200)).data;
  assert.equal(p1.totalPages, 2);
  assert.equal(p1.items.length, 3);
  assert.equal(p2.items.length, 1);
  assert.equal(new Set([...p1.items, ...p2.items].map((x) => x.id)).size, 4);
});

await langkah('daftar milik sendiri: pengguna lain tidak melihatnya', async () => {
  const w = (await call('GET', '/api/medcoel/wrong', undefined, userB.token, 200)).data;
  assert.equal(w.total, 0);
  assert.deepEqual(w.items, []);
});

await langkah('latih ulang soal salah: percakapan baru berisi soal salah itu; menjawab benar mengeluarkannya, salah lagi menambah hitungan', async () => {
  const att = (await call('POST', '/api/medcoel/attempts/wrong', { subject: mk.id, chapter: osteo.id, count: 'all', mode: 'learning' }, userA.token, 200)).data;
  assert.equal(att.questions.length, 2);
  assert.match(att.attempt.title, /Ulangi soal salah/);
  assert.equal(att.attempt.settings.wrongRetry, true);
  const [q1, q2] = att.questions;
  await call('POST', `/api/medcoel/attempts/${att.attempt.id}/answer`, { question: q1.id, response: benarLabel(q1), check: true }, userA.token, 200);
  await call('POST', `/api/medcoel/attempts/${att.attempt.id}/answer`, { question: q2.id, response: salahLabel(q2), check: true }, userA.token, 200);
  const w = (await call('GET', `/api/medcoel/wrong?chapter=${osteo.id}`, undefined, userA.token, 200)).data;
  assert.equal(w.count, 1);
  assert.equal(w.items[0].id, q2.id);
  assert.equal(w.items[0].times, 2);
  assert.equal(w.total, 3);
  assert.equal(w.items[0].attempt.id, att.attempt.id, 'jawaban terbaru yang ditampilkan');
});

await langkah('BAB disembunyikan admin: soalnya hilang dari daftar; dimunculkan lagi kembali', async () => {
  await call('PATCH', `/api/collections/chapters/records/${artro.id}`, { hidden: true }, admin.token, 200);
  assert.equal((await call('GET', '/api/medcoel/wrong', undefined, userA.token, 200)).data.total, 1);
  await call('PATCH', `/api/collections/chapters/records/${artro.id}`, { hidden: false }, admin.token, 200);
  assert.equal((await call('GET', '/api/medcoel/wrong', undefined, userA.token, 200)).data.total, 3);
});

await langkah('latih ulang tanpa pilihan: mengambil dari semua mata kuliah; jumlah dipotong ke yang tersedia', async () => {
  const att = (await call('POST', '/api/medcoel/attempts/wrong', { count: 50 }, userA.token, 200)).data;
  assert.equal(att.questions.length, 3);
  assert.equal(att.attempt.subject, mk.id);
  await call('POST', '/api/medcoel/attempts/wrong', { subject: mk.id, chapter: 'tidakada' }, userA.token, 400);
});

console.log(`wrong-api.test: ${lulus} langkah lulus${process.exitCode ? ', ADA YANG GAGAL' : ''}`);

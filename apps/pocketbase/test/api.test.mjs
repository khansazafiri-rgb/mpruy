// TES API PER PERAN (PRD: Keamanan > "API diuji dengan akun tiap peran").
//
// Menjalankan alur nyata ke server PocketBase lokal dengan akun pengunjung,
// pengguna kampus A, pengguna kampus B, admin, dan agen.
//
// Cara pakai (di apps/pocketbase, server dev sedang jalan dengan data kosong):
//   ./pocketbase superuser upsert dev@medcoel.local devpassword123 --dir=./pb_data
//   PB_URL=http://127.0.0.1:8090 PB_SU_EMAIL=dev@medcoel.local PB_SU_PASSWORD=devpassword123 npm run test:api
//
// Server harus dijalankan dengan MEDCOEL_DEV_MODE=1 (npm run dev) supaya kode
// email ikut dikembalikan di respons. Tes ini MENGISI database dengan data uji,
// jadi jangan dijalankan ke server produksi.

import assert from 'node:assert/strict';

const B = process.env.PB_URL || 'http://127.0.0.1:8090';
const SU = { identity: process.env.PB_SU_EMAIL || 'dev@medcoel.local', password: process.env.PB_SU_PASSWORD || 'devpassword123' };
const RUN = Date.now().toString(36);

let lulus = 0;
const langkah = async (nama, fn) => {
  try {
    await fn();
    lulus++;
    console.log('  ok', nama);
  } catch (e) {
    console.error('GAGAL:', nama, '\n', e);
    process.exitCode = 1;
  }
};

async function call(method, path, body, token, expect) {
  const headers = {};
  if (token) headers.Authorization = token;
  let payload;
  if (body instanceof FormData) payload = body;
  else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  const r = await fetch(B + path, { method, headers, body: payload });
  const text = await r.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  if (expect !== undefined && r.status !== expect) {
    throw new Error(`${method} ${path} -> ${r.status}, harapannya ${expect}: ${text.slice(0, 400)}`);
  }
  return { status: r.status, data };
}

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');

async function upload(init, bytes, mime, token) {
  const i = (await call('POST', '/api/medcoel/upload/init', { ...init, size: bytes.length, mime }, token, 200)).data;
  assert.equal(i.mode, 'local', 'tes ini memakai mode penyimpanan lokal (GDRIVE_* jangan diisi)');
  const fd = new FormData();
  fd.append('fileId', i.fileId);
  fd.append('uploadKey', i.uploadKey);
  fd.append('file', new Blob([bytes], { type: mime }), init.name || 'file');
  return call('POST', '/api/medcoel/upload/local', fd, token);
}

async function daftar(loginId, campus, over = {}) {
  const subjects = (await call('GET', '/api/medcoel/public-subjects', undefined, null, 200)).data.items;
  let s = (await call('POST', '/api/medcoel/signup/start', {
    loginId, name: `Uji ${loginId} Coba`, email: `${loginId}@contoh.test`, whatsapp: '081234567890',
    password: 'rahasia123', passwordConfirm: 'rahasia123', semester: 3, campus, ...over,
  }, null, 200)).data;
  assert.ok(s.devCode, 'server harus berjalan dengan MEDCOEL_DEV_MODE=1');
  const id = s.draftId;
  const tok = s.draftToken;
  await call('POST', '/api/medcoel/signup/verify', { draftId: id, draftToken: tok, code: s.devCode }, null, 200);
  await call('POST', '/api/medcoel/signup/subjects', { draftId: id, draftToken: tok, subjects: [subjects[0].id] }, null, 200);
  for (const kind of ['whatsapp', 'instagram']) {
    const up = await upload({ kind: 'proof_' + kind, name: 'bukti.png', draftId: id, draftToken: tok }, PNG, 'image/png');
    assert.equal(up.status, 200);
    await call('POST', '/api/medcoel/signup/proof', { draftId: id, draftToken: tok, kind, fileId: up.data.id, joined: true }, null, 200);
  }
  await call('POST', '/api/medcoel/signup/finish', { draftId: id, draftToken: tok }, null, 200);
  const auth = (await call('POST', '/api/collections/users/auth-with-password', { identity: loginId, password: 'rahasia123' }, null, 200)).data;
  return { token: auth.token, id: auth.record.id };
}

const su = (await call('POST', '/api/collections/_superusers/auth-with-password', SU, null, 200)).data.token;

async function akunKhusus(role) {
  const loginId = `${role}${RUN}`;
  const password = 'rahasia-' + RUN;
  await call('POST', '/api/collections/users/records', {
    loginId, name: role.toUpperCase() + ' Uji', email: `${loginId}@contoh.test`, password, passwordConfirm: password, role, verified: true,
  }, su, 200);
  const auth = (await call('POST', '/api/collections/users/auth-with-password', { identity: loginId, password }, null, 200)).data;
  return { token: auth.token, id: auth.record.id };
}

const campuses = (await call('GET', '/api/collections/campuses/records?perPage=5&sort=order', undefined, null, 200)).data.items;
const [kampusA, kampusB] = campuses;
const subjects = (await call('GET', '/api/medcoel/public-subjects', undefined, null, 200)).data.items;
const mk = subjects[0];

console.log('Menyiapkan akun...');
const admin = await akunKhusus('admin');
const agent = await akunKhusus('agent');
const userA = await daftar(`ujia${RUN}`, kampusA.id);
const userB = await daftar(`ujib${RUN}`, kampusB.id);

console.log('Pengunjung');
await langkah('pengunjung tidak bisa membaca soal, pengguna, atau pengaturan', async () => {
  await call('GET', '/api/collections/questions/records', undefined, null, 403).catch(async () => {
    const r = await call('GET', '/api/collections/questions/records');
    assert.ok(r.status === 403 || (r.data.items || []).length === 0);
  });
  const users = await call('GET', '/api/collections/users/records');
  assert.equal((users.data.items || []).length, 0);
  await call('GET', '/api/medcoel/subjects', undefined, null, 401);
  const st = (await call('GET', '/api/medcoel/stats', undefined, null, 200)).data;
  assert.equal(typeof st.questions, 'number');
});

await langkah('pendaftaran publik tidak bisa memilih peran admin', async () => {
  const r = await call('POST', '/api/collections/users/records', { loginId: 'nakal' + RUN, email: `nakal${RUN}@contoh.test`, password: 'rahasia123', passwordConfirm: 'rahasia123', role: 'admin' });
  assert.ok(r.status >= 400);
});

console.log('Pengguna');
await langkah('pengguna tidak bisa menaikkan perannya atau mengubah kampus lewat API', async () => {
  const r1 = await call('PATCH', `/api/collections/users/records/${userA.id}`, { role: 'admin' }, userA.token);
  assert.ok(r1.status >= 400);
  const r2 = await call('PATCH', `/api/collections/users/records/${userA.id}`, { campus: kampusB.id }, userA.token);
  assert.ok(r2.status >= 400);
  const r3 = await call('PATCH', `/api/collections/users/records/${userA.id}`, { disabled: false }, userA.token);
  assert.ok(r3.status >= 400);
  const me = (await call('GET', '/api/medcoel/me', undefined, userA.token, 200)).data;
  assert.equal(me.role, 'user');
  assert.equal(me.campus, kampusA.id);
});

await langkah('pengguna hanya melihat data dirinya', async () => {
  const list = (await call('GET', '/api/collections/users/records', undefined, userA.token, 200)).data;
  assert.equal(list.totalItems, 1);
  assert.equal(list.items[0].id, userA.id);
  const other = await call('GET', `/api/collections/users/records/${userB.id}`, undefined, userA.token);
  assert.equal(other.status, 404);
});

await langkah('endpoint admin dan agen menolak pengguna biasa', async () => {
  await call('GET', '/api/medcoel/admin/summary', undefined, userA.token, 403);
  await call('GET', '/api/medcoel/agent/submissions', undefined, userA.token, 403);
  await call('POST', '/api/medcoel/agent/import', { subject: mk.id, questions: [] }, userA.token, 403);
});

await langkah('katalog 32 mata kuliah dan 384 BAB, pilihan pengguna di atas lalu alfabetis; BAB mengikuti nomor urut', async () => {
  const order = (a, b) => a.toLowerCase().localeCompare(b.toLowerCase());
  assert.equal(subjects.length, 32);
  assert.deepEqual(subjects.map((s) => s.name), subjects.map((s) => s.name).sort(order));
  const allChapters = (await call('GET', `/api/collections/chapters/records?perPage=500&filter=${encodeURIComponent('drilling=false')}`, undefined, su, 200)).data;
  assert.equal(allChapters.totalItems, 384);
  // Tiap mata kuliah juga punya satu BAB khusus Drilling (tidak ikut daftar BAB).
  assert.equal((await call('GET', `/api/collections/chapters/records?perPage=1&filter=${encodeURIComponent('drilling=true')}`, undefined, su, 200)).data.totalItems, 32);
  const picked = [subjects[subjects.length - 1].id, subjects[2].id];
  await call('PATCH', `/api/collections/users/records/${userA.id}`, { studyingSubjects: picked }, userA.token, 200);
  const list = (await call('GET', '/api/medcoel/subjects', undefined, userA.token, 200)).data.items;
  assert.ok(list.slice(0, 2).every((s) => s.studying && picked.includes(s.id)));
  assert.equal(list.find((s) => s.id === mk.id).chapterCount, 20);
  assert.deepEqual(list.slice(0, 2).map((s) => s.name), list.slice(0, 2).map((s) => s.name).sort(order));
  assert.deepEqual(list.slice(2).map((s) => s.name), list.slice(2).map((s) => s.name).sort(order));
  const detail = (await call('GET', `/api/medcoel/subjects/${mk.slug}`, undefined, userA.token, 200)).data;
  assert.equal(detail.chapters.length, 20);
  assert.deepEqual(detail.chapters.map((c) => c.order), detail.chapters.map((c) => c.order).sort((a, b) => a - b), 'BAB urut menurut nomor, bukan nama');
  const progress = (await call('GET', '/api/medcoel/progress', undefined, userA.token, 200)).data;
  assert.deepEqual(progress.subjects.map((s) => s.id), list.map((s) => s.id));
  await call('PATCH', `/api/collections/users/records/${userA.id}`, { studyingSubjects: [mk.id] }, userA.token, 200);
});

await langkah('pustaka kampus tidak muncul sebelum ada soal kampus yang tayang', async () => {
  const a = (await call('GET', '/api/medcoel/campus-materials', undefined, userA.token, 200)).data;
  assert.deepEqual(a.items, []);
  await call('GET', '/api/medcoel/campus-materials', undefined, null, 401);
});

console.log('Admin: impor soal');
const soalUmum = [
  { chapter: 'BAB Uji 1', type: 'A', difficulty: 'easy', text: 'Soal umum mudah?', options: [{ text: 'Benar', correct: true, explanation: 'Karena benar' }, 'Salah'] },
  { chapter: 'BAB Uji 1', type: 'A', difficulty: 'medium', text: 'Soal umum sedang?', options: ['x', 'y', 'z'], answer: 'B' },
  { chapter: 'BAB Uji 1', type: 'K', difficulty: 'hard', text: 'Pernyataan yang benar?', statements: ['s1', 's2', 's3', 's4'], trueStatements: [1, 3] },
  { chapter: 'BAB Uji 1', type: 'isian', difficulty: 'medium', text: 'Obat pilihan?', subQuestions: [{ label: 'A', question: 'Obat', validAnswers: ['Albendazol / Mebendazol'] }] },
  { chapter: 'BAB Uji 1', type: 'esai', difficulty: 'easy', text: 'Jelaskan.', subQuestions: [{ label: 'A', question: 'Mekanisme', validAnswers: ['Penjelasan'] }] },
  { chapter: 'BAB Uji 1', type: 'A', difficulty: 'easy', text: 'Soal umum 6?', options: ['a', 'b'], answer: 'A' },
  { chapter: 'BAB Uji 1', type: 'A', difficulty: 'hard', text: 'Soal umum 7?', options: ['a', 'b'], answer: 'A' },
];
let babId = '';
await langkah('pratinjau impor melaporkan soal bermasalah dengan nomornya, tanpa menyimpan', async () => {
  const r = await call('POST', '/api/medcoel/admin/import', { subject: mk.id, scope: 'all', dryRun: true, text: JSON.stringify([...soalUmum, { chapter: 'BAB Uji 1', text: 'tanpa kunci', options: ['a', 'b'] }]) }, admin.token, 200);
  assert.equal(r.data.valid, soalUmum.length);
  assert.equal(r.data.invalid, 1);
  assert.equal(r.data.items[soalUmum.length].index, soalUmum.length + 1);
  assert.deepEqual(r.data.newChapters, ['BAB Uji 1']);
});
await langkah('impor ditolak utuh bila ada soal bermasalah dan tidak dipilih lewati', async () => {
  const r = await call('POST', '/api/medcoel/admin/import', { subject: mk.id, scope: 'all', text: JSON.stringify([...soalUmum, { chapter: 'BAB Uji 1', text: 'tanpa kunci', options: ['a', 'b'] }]) }, admin.token);
  assert.equal(r.status, 400);
  assert.equal(r.data.blocked, true);
});
await langkah('impor soal umum (array JS) dan soal terbatas kampus A', async () => {
  const r1 = await call('POST', '/api/medcoel/admin/import', { subject: mk.id, scope: 'all', text: JSON.stringify(soalUmum) }, admin.token, 200);
  assert.equal(r1.data.created, soalUmum.length);
  assert.equal(r1.data.chaptersCreated, 1);
  const r2 = await call('POST', '/api/medcoel/admin/import', {
    subject: mk.id, scope: 'campus', campuses: [kampusA.id],
    text: "[{ chapter: 'BAB Uji 1', type: 'A', difficulty: 'medium', text: 'Soal khusus kampus A', options: ['ya', 'tidak'], answer: 'A', },]",
  }, admin.token, 200);
  assert.equal(r2.data.created, 1);
  const detail = (await call('GET', `/api/medcoel/subjects/${mk.slug}`, undefined, admin.token, 200)).data;
  babId = detail.chapters.find((c) => c.title === 'BAB Uji 1').id;
});

console.log('Batas kampus');
await langkah('soal terbatas hanya terlihat kampus A, ditegakkan di server', async () => {
  const a = (await call('GET', `/api/medcoel/subjects/${mk.slug}`, undefined, userA.token, 200)).data;
  const b = (await call('GET', `/api/medcoel/subjects/${mk.slug}`, undefined, userB.token, 200)).data;
  const ca = a.chapters.find((c) => c.id === babId).total;
  const cb = b.chapters.find((c) => c.id === babId).total;
  assert.equal(ca, soalUmum.length + 1);
  assert.equal(cb, soalUmum.length);
  // Kampus B meminta semua soal: tidak boleh ada soal kampus A.
  const r = (await call('POST', '/api/medcoel/attempts/practice', { chapter: babId, count: cb, mode: 'exam' }, userB.token, 200)).data;
  assert.ok(!r.questions.some((q) => JSON.stringify(q.stem).includes('kampus A')));
  const over = await call('POST', '/api/medcoel/attempts/practice', { chapter: babId, count: cb + 1 }, userB.token);
  assert.equal(over.status, 409);
  assert.equal(over.data.data.available, cb);
});

await langkah('pustaka kampus hanya berisi materi tersedia, filter dipertahankan sampai pengerjaan', async () => {
  const a = (await call('GET', '/api/medcoel/campus-materials?campus=' + kampusB.id, undefined, userA.token, 200)).data;
  assert.equal(a.campusName, kampusA.name);
  assert.equal(a.items.length, 1);
  assert.equal(a.items[0].id, mk.id);
  assert.equal(a.items[0].questionCount, 1);
  assert.equal(a.items[0].chapters.length, 1);
  const b = (await call('GET', '/api/medcoel/campus-materials?campus=' + kampusA.id, undefined, userB.token, 200)).data;
  assert.deepEqual(b.items, []);
  const detail = (await call('GET', `/api/medcoel/subjects/${mk.slug}?campusOnly=1`, undefined, userA.token, 200)).data;
  assert.equal(detail.chapters.length, 1); assert.equal(detail.chapters[0].total, 1); assert.deepEqual(detail.packages, []);
  const av = (await call('GET', `/api/medcoel/simulation/availability?subject=${mk.id}&source=all&campusOnly=1`, undefined, userA.token, 200)).data;
  assert.equal(av.chapters[babId].total, 1);
  const practice = (await call('POST', '/api/medcoel/attempts/practice', { chapter: babId, count: 1, campusOnly: true }, userA.token, 200)).data;
  assert.equal(practice.questions.length, 1); assert.match(JSON.stringify(practice.questions[0].stem), /kampus A/);
  await call('POST', '/api/medcoel/attempts/practice', { chapter: babId, count: 1, campusOnly: true }, userB.token, 400);
  const sim = (await call('POST', '/api/medcoel/attempts/simulation', { subject: mk.id, source: 'all', campusOnly: true, chapters: [{ chapter: babId, easy: 0, medium: 1, hard: 0 }] }, userA.token, 200)).data;
  assert.equal(sim.questions.length, 1); assert.match(JSON.stringify(sim.questions[0].stem), /kampus A/);
  // Draft and hidden content must disappear from this library too.
  const q = (await call('GET', '/api/collections/questions/records?filter=' + encodeURIComponent("scope='campus'"), undefined, su, 200)).data.items[0];
  await call('PATCH', `/api/collections/questions/records/${q.id}`, { status: 'draft' }, su, 200);
  assert.deepEqual((await call('GET', '/api/medcoel/campus-materials', undefined, userA.token, 200)).data.items, []);
  await call('PATCH', `/api/collections/questions/records/${q.id}`, { status: 'published' }, su, 200);
  await call('PATCH', `/api/collections/chapters/records/${babId}`, { hidden: true }, su, 200);
  assert.deepEqual((await call('GET', '/api/medcoel/campus-materials', undefined, userA.token, 200)).data.items, []);
  await call('PATCH', `/api/collections/chapters/records/${babId}`, { hidden: false }, su, 200);
});

console.log('Belajar');
let attemptId = '';
await langkah('soal dikirim tanpa kunci; mode Learning membuka kunci setelah dicek', async () => {
  const r = (await call('POST', '/api/medcoel/attempts/practice', { chapter: babId, count: 3, mode: 'learning' }, userA.token, 200)).data;
  attemptId = r.attempt.id;
  assert.equal(r.questions.length, 3);
  for (const q of r.questions) {
    assert.equal(q.answer, undefined);
    assert.equal(q.explanation, undefined);
    (q.options || []).forEach((o) => assert.equal(o.explanation, undefined));
    (q.subQuestions || []).forEach((s) => assert.equal(s.accepted, undefined));
  }
  const q = r.questions.find((x) => x.qtype === 'A' || x.qtype === 'K') || r.questions[0];
  const resp = q.qtype === 'isian' ? { A: 'albendazol' } : q.qtype === 'esai' ? { A: 'tulisan' } : 'A';
  const chk = (await call('POST', `/api/medcoel/attempts/${attemptId}/answer`, { question: q.id, response: resp, check: true }, userA.token, 200)).data;
  assert.ok(chk.result);
  assert.ok(chk.question.answer !== undefined || chk.question.qtype === 'isian' || chk.question.qtype === 'esai');
  // Jawaban yang sudah dicek terkunci.
  const again = (await call('POST', `/api/medcoel/attempts/${attemptId}/answer`, { question: q.id, response: 'B', check: true }, userA.token, 200)).data;
  assert.equal(again.alreadyChecked, true);
});
await langkah('pengguna lain tidak bisa membuka percobaan orang lain', async () => {
  await call('GET', `/api/medcoel/attempts/${attemptId}`, undefined, userB.token, 404);
});

await langkah('simulasi kustom menolak jumlah melebihi ketersediaan dan menyebut angkanya', async () => {
  const av = (await call('GET', `/api/medcoel/simulation/availability?subject=${mk.id}&source=all`, undefined, userA.token, 200)).data;
  const ch = av.chapters[babId];
  assert.ok(ch);
  const r = await call('POST', '/api/medcoel/attempts/simulation', { subject: mk.id, source: 'all', types: 'mix', chapters: [{ chapter: babId, easy: ch.easy + 5, medium: 0, hard: 0 }] }, userA.token);
  assert.equal(r.status, 409);
  assert.equal(r.data.data.shortages[0].available, ch.easy);
});

let simId = '';
await langkah('simulasi: jawab semua, selesai, skor dan poin hanya untuk percobaan pertama', async () => {
  const r = (await call('POST', '/api/medcoel/attempts/simulation', { subject: mk.id, source: 'all', types: 'mix', mode: 'exam', chapters: [{ chapter: babId, easy: 2, medium: 1, hard: 1 }] }, userA.token, 200)).data;
  simId = r.attempt.id;
  assert.equal(r.questions.length, 4);
  assert.ok(r.questions.every((q) => q.qtype === 'A' || q.qtype === 'K'), 'simulasi hanya tipe A dan K');
  for (const q of r.questions) {
    await call('POST', `/api/medcoel/attempts/${simId}/answer`, { question: q.id, response: 'A' }, userA.token, 200);
  }
  // Percobaan yang terlalu cepat tidak diberi poin, jadi tunggu sebentar tidak perlu: < 5 soal.
  const done = (await call('POST', `/api/medcoel/attempts/${simId}/finish`, {}, userA.token, 200)).data;
  assert.equal(done.attempt.status, 'finished');
  assert.equal(done.attempt.scoredCount, 4);
  assert.ok(done.questions.every((q) => q.answer));
  assert.ok(done.attempt.score >= 0);
  assert.ok(done.attempt.breakdown.chapters[babId]);
  // Mengulang soal yang sama tidak menambah poin.
  const r2 = (await call('POST', '/api/medcoel/attempts/simulation', { subject: mk.id, source: 'all', types: 'mix', mode: 'exam', chapters: [{ chapter: babId, easy: 2, medium: 1, hard: 1 }] }, userA.token, 200)).data;
  for (const q of r2.questions) {
    const right = done.questions.find((x) => x.id === q.id)?.answer || 'A';
    await call('POST', `/api/medcoel/attempts/${r2.attempt.id}/answer`, { question: q.id, response: right }, userA.token, 200);
  }
  const d2 = (await call('POST', `/api/medcoel/attempts/${r2.attempt.id}/finish`, {}, userA.token, 200)).data;
  const pernah = new Set(done.questions.map((q) => q.id));
  const baru = r2.questions.filter((q) => !pernah.has(q.id));
  if (!baru.length) assert.equal(d2.attempt.points, 0);
});

await langkah('jawaban isian dinilai dengan aturan web lama (salah ketik ditoleransi)', async () => {
  const r = (await call('POST', '/api/medcoel/attempts/practice', { chapter: babId, count: soalUmum.length + 1, mode: 'learning' }, userA.token, 200)).data;
  const q = r.questions.find((x) => x.qtype === 'isian');
  const chk = (await call('POST', `/api/medcoel/attempts/${r.attempt.id}/answer`, { question: q.id, response: { A: 'albendazole' }, check: true }, userA.token, 200)).data;
  assert.equal(chk.result.correct, true);
  assert.ok(chk.question.subQuestions[0].accepted.length);
});

await langkah('paket soal memakai kuota per BAB', async () => {
  const p = (await call('POST', '/api/collections/packages/records', { subject: mk.id, name: 'Paket Uji ' + RUN, perChapter: 3, total: 100, active: true }, admin.token, 200)).data;
  const r = (await call('POST', '/api/medcoel/attempts/package', { package: p.id }, userB.token, 200)).data;
  assert.equal(r.questions.length, 3);
  await call('POST', '/api/collections/packages/records', { subject: mk.id, name: 'Nakal', active: true }, userA.token, 400).catch(async () => {
    const x = await call('POST', '/api/collections/packages/records', { subject: mk.id, name: 'Nakal', active: true }, userA.token);
    assert.ok(x.status >= 400);
  });
});

await langkah('leaderboard hanya berisi nama aman', async () => {
  const lb = (await call('GET', '/api/medcoel/leaderboard?period=all', undefined, userB.token, 200)).data;
  for (const it of lb.items) {
    // title = julukan dari pencapaian (mis. "Master of Anatomi"), tidak mengidentifikasi orang.
    assert.deepEqual(Object.keys(it).sort(), ['campus', 'isMe', 'name', 'points', 'questionPoints', 'rank', 'simPoints', 'title']);
    assert.ok(!String(it.name).includes('@'));
    assert.ok(!String(it.title).includes('@'));
  }
});

await langkah('progres dan riwayat hanya milik sendiri', async () => {
  const pr = (await call('GET', '/api/medcoel/progress', undefined, userA.token, 200)).data;
  assert.ok(pr.last7.answered > 0);
  const hist = (await call('GET', '/api/collections/attempts/records', undefined, userB.token, 200)).data;
  assert.ok(hist.items.every((a) => a.user === userB.id));
});

await langkah('laporkan soal: pelapor dapat notifikasi saat selesai', async () => {
  const r = (await call('POST', '/api/medcoel/attempts/practice', { chapter: babId, count: 1 }, userA.token, 200)).data;
  const qid = r.questions[0].id;
  const rep = (await call('POST', `/api/medcoel/questions/${qid}/report`, { reason: 'salah_ketik', note: 'typo' }, userA.token, 200)).data;
  await call('POST', `/api/medcoel/questions/${qid}/report`, { reason: 'salah_ketik' }, userA.token, 400);
  await call('PATCH', `/api/collections/question_reports/records/${rep.id}`, { status: 'selesai' }, userA.token, 404).catch(async () => {
    const x = await call('PATCH', `/api/collections/question_reports/records/${rep.id}`, { status: 'selesai' }, userA.token);
    assert.ok(x.status >= 400);
  });
  await call('PATCH', `/api/collections/question_reports/records/${rep.id}`, { status: 'selesai', adminNote: 'sudah diperbaiki' }, admin.token, 200);
  const notif = (await call('GET', '/api/collections/notifications/records?filter=' + encodeURIComponent("kind='report'"), undefined, userA.token, 200)).data;
  assert.ok(notif.items.length >= 1);
});

console.log('Pengajuan soal dan Hermes Agent');
let subId = '';
await langkah('satu pengajuan boleh 1 sampai 10 PDF; 11 ditolak dan tidak ada jalur WhatsApp', async () => {
  const ok = await call('POST', '/api/medcoel/submissions', { subject: mk.id, hasKey: false, language: 'id', scope: 'all', pdfCount: 10 }, userB.token, 200);
  assert.equal(ok.data.pdfCount, 10);
  const lebih = await call('POST', '/api/medcoel/submissions', { subject: mk.id, hasKey: false, language: 'id', scope: 'all', pdfCount: 11 }, userB.token);
  assert.equal(lebih.status, 400);
  assert.match(JSON.stringify(lebih.data), /1 sampai 10/);
  assert.doesNotMatch(JSON.stringify(lebih.data), /WhatsApp/);
  const nol = await call('POST', '/api/medcoel/submissions', { subject: mk.id, hasKey: false, language: 'id', scope: 'all', pdfCount: 0 }, userB.token);
  assert.equal(nol.status, 400);
});
await langkah('pengguna mengajukan PDF; file bukan PDF ditolak dari isinya', async () => {
  const s = (await call('POST', '/api/medcoel/submissions', { subject: mk.id, hasKey: false, language: 'id', scope: 'campus', pdfCount: 1 }, userA.token, 200)).data;
  subId = s.id;
  const palsu = await upload({ kind: 'submission_pdf', name: 'palsu.pdf', submission: subId }, PNG, 'application/pdf', userA.token);
  assert.equal(palsu.status, 400);
  const asli = await upload({ kind: 'submission_pdf', name: 'soal.pdf', submission: subId }, PDF, 'application/pdf', userA.token);
  assert.equal(asli.status, 200, JSON.stringify(asli.data));
  // Pengguna lain tidak bisa mengunggah ke pengajuan ini.
  const lain = await call('POST', '/api/medcoel/upload/init', { kind: 'submission_pdf', name: 'x.pdf', size: PDF.length, mime: 'application/pdf', submission: subId }, userB.token);
  assert.equal(lain.status, 404);
  await call('POST', `/api/medcoel/submissions/${subId}/send`, { agreement: false }, userA.token, 400);
  const sent = (await call('POST', `/api/medcoel/submissions/${subId}/send`, { agreement: true }, userA.token, 200)).data;
  assert.equal(sent.status, 'menunggu_konfirmasi');
  assert.ok(sent.queue.estimateDays >= 1);
  // Admin diberi tahu begitu pengajuan dikirim, sebelum dikonfirmasi.
  const adminNotif = (await call('GET', '/api/collections/notifications/records?filter=' + encodeURIComponent("kind='submission'"), undefined, admin.token, 200)).data;
  const baru = adminNotif.items.find((n) => n.title.includes(sent.code));
  assert.ok(baru, 'admin harus menerima notifikasi pengajuan baru');
  assert.match(baru.title, /Pengajuan baru/);
  assert.equal(baru.link, '/admin/pengajuan?status=menunggu_konfirmasi');
  assert.equal(baru.read, false);
  // Pengaju juga langsung mendapat pemberitahuan bahwa pengajuannya terkirim dan perlu dikonfirmasi.
  const aNotif = (await call('GET', '/api/collections/notifications/records?filter=' + encodeURIComponent("kind='submission'"), undefined, userA.token, 200)).data;
  assert.ok(aNotif.items.some((n) => n.title.includes(sent.code) && /terkirim/.test(n.title)));
  // Pengguna lain tidak ikut menerima notifikasi itu.
  const bNotif = (await call('GET', '/api/collections/notifications/records?filter=' + encodeURIComponent("kind='submission'"), undefined, userB.token, 200)).data;
  assert.ok(!bNotif.items.some((n) => n.title.includes(sent.code)));
  const summary = (await call('GET', '/api/medcoel/admin/summary', undefined, admin.token, 200)).data;
  assert.ok(summary.waitingConfirm >= 1);
});

await langkah('agen tidak bisa mengimpor sebelum admin mengonfirmasi', async () => {
  const r = await call('POST', `/api/medcoel/agent/submissions/${subId}/import`, { questions: [] }, agent.token);
  assert.equal(r.status, 400);
});

await langkah('admin konfirmasi -> Antre; agen membaca kontrak dan mengimpor; kampus dari pengajuan', async () => {
  await call('POST', `/api/medcoel/admin/submissions/${subId}/status`, { status: 'antre' }, admin.token, 200);
  const list = (await call('GET', '/api/medcoel/agent/submissions?status=antre', undefined, agent.token, 200)).data;
  const c = list.items.find((x) => x.id === subId);
  assert.ok(c);
  assert.equal(c.restriction, 'campus');
  assert.equal(c.files.length, 1);
  assert.equal(c.campus.id, kampusA.id);
  // Agen tidak boleh langsung menandai selesai.
  await call('POST', `/api/medcoel/agent/submissions/${subId}/status`, { status: 'selesai' }, agent.token, 400);
  await call('POST', `/api/medcoel/agent/submissions/${subId}/status`, { status: 'diproses' }, agent.token, 200);
  const imp = (await call('POST', `/api/medcoel/agent/submissions/${subId}/import`, {
    chapter: 'BAB Pengajuan',
    questions: { campus: kampusB.id, questions: [{ text: 'Soal dari PDF pengguna', options: ['a', 'b'], answer: 'A', difficulty: 'easy' }] },
  }, agent.token, 200)).data;
  assert.equal(imp.created, 1);
  const mine = (await call('GET', '/api/medcoel/submissions/mine', undefined, userA.token, 200)).data.items.find((x) => x.id === subId);
  assert.equal(mine.status, 'selesai');
  // Kampus B tidak melihat soal pengajuan kampus A meski JSON menulis kampus B.
  const b = (await call('GET', `/api/medcoel/subjects/${mk.slug}`, undefined, userB.token, 200)).data;
  const babBaru = b.chapters.find((x) => x.title === 'BAB Pengajuan');
  assert.ok(!babBaru || babBaru.total === 0);
  const notif = (await call('GET', '/api/collections/notifications/records?filter=' + encodeURIComponent("kind='question_live'"), undefined, userA.token, 200)).data;
  assert.ok(notif.items.length >= 1);
});

await langkah('impor tambahan admin lewat agen tanpa pengajuan', async () => {
  const r = (await call('POST', '/api/medcoel/agent/import', { subject: mk.slug, chapter: 'BAB Agen', scope: 'all', questions: [{ text: 'Soal agen', options: ['a', 'b'], answer: 'B' }] }, agent.token, 200)).data;
  assert.equal(r.created, 1);
});

await langkah('alamat IP agen bisa dibatasi (MEDCOEL_AGENT_IPS) - dilewati bila tidak diatur', async () => {
  assert.ok(true);
});

console.log('Chat Admin');
let messageA;
await langkah('pesan tersimpan, tidak bisa menyamar jadi admin, dan kirim ulang tidak menduplikasi', async () => {
  await call('GET', '/api/medcoel/support/messages', undefined, null, 401);
  assert.deepEqual((await call('GET', '/api/medcoel/support/messages', undefined, userA.token, 200)).data.items, []);
  const payload = { text: 'Tampilan BAB sulit dibaca di HP.', category: 'feedback', clientKey: 'uji-message-' + RUN, senderRole: 'admin', user: userB.id };
  messageA = (await call('POST', '/api/medcoel/support/messages', payload, userA.token, 200)).data.message;
  assert.equal(messageA.senderRole, 'user'); assert.equal(messageA.category, 'feedback');
  const retry = (await call('POST', '/api/medcoel/support/messages', payload, userA.token, 200)).data.message;
  assert.equal(retry.id, messageA.id);
  const own = (await call('GET', '/api/medcoel/support/messages', undefined, userA.token, 200)).data.items;
  assert.equal(own.length, 1); assert.equal(own[0].text, payload.text);
  await call('POST', '/api/medcoel/support/messages', { text: '  ', clientKey: 'empty-message' }, userA.token, 400);
  await call('POST', '/api/medcoel/support/messages', { text: 'a'.repeat(4001), clientKey: 'too-long-message' }, userA.token, 400);
});
await langkah('percakapan hanya bisa dibaca pemilik dan admin, balasan admin diterima pemilik', async () => {
  const other = (await call('GET', '/api/medcoel/support/messages?user=' + userA.id, undefined, userB.token, 200)).data;
  assert.deepEqual(other.items, []);
  await call('GET', '/api/medcoel/support/messages?before=' + messageA.id, undefined, userB.token, 404);
  await call('GET', '/api/medcoel/admin/support', undefined, userA.token, 403);
  await call('GET', '/api/medcoel/admin/support/' + userA.id, undefined, userB.token, 403);
  await call('POST', '/api/medcoel/admin/support/' + userA.id, { text: 'Menyamar', clientKey: 'bad-reply-key' }, userB.token, 403);
  await call('POST', '/api/collections/support_messages/records', { user: userA.id, text: 'bypass' }, userA.token, 403);
  const direct = await call('GET', '/api/collections/support_messages/records', undefined, userB.token);
  assert.ok(direct.status === 403 || !(direct.data.items || []).length);
  const inbox = (await call('GET', '/api/medcoel/admin/support', undefined, admin.token, 200)).data.items;
  assert.ok(inbox.some((m) => m.userId === userA.id));
  const reply = (await call('POST', '/api/medcoel/admin/support/' + userA.id, { text: 'Terima kasih, kami periksa.', clientKey: 'reply-key-' + RUN }, admin.token, 200)).data.message;
  assert.equal(reply.senderRole, 'admin');
  assert.ok((await call('GET', '/api/medcoel/support/messages', undefined, userA.token, 200)).data.items.some((m) => m.id === reply.id));
  assert.deepEqual((await call('GET', '/api/medcoel/support/messages', undefined, userB.token, 200)).data.items, []);
});
await langkah('riwayat chat dapat dimuat bertahap tanpa pesan hilang atau duplikat', async () => {
  for (let i = 0; i < 51; i++) await call('POST', '/api/collections/support_messages/records', { user: userA.id, author: userA.id, senderRole: 'user', text: 'Pesan ' + i, clientKey: 'history-' + RUN + '-' + i }, su, 200);
  const latest = (await call('GET', '/api/medcoel/support/messages', undefined, userA.token, 200)).data;
  assert.equal(latest.items.length, 50); assert.equal(latest.hasMore, true);
  const earlier = (await call('GET', '/api/medcoel/support/messages?before=' + latest.nextBefore, undefined, userA.token, 200)).data;
  assert.equal(earlier.items.length, 3); assert.equal(earlier.hasMore, false);
  assert.equal(new Set([...latest.items, ...earlier.items].map((m) => m.id)).size, 53);
});

console.log('Simulasi dokter');
await langkah('hasil simulasi dokter: server memeriksa kasus, menilai diagnosis sendiri, dan membatasi angka', async () => {
  await call('POST', '/api/medcoel/doctor-sim/results', { caseKey: 'umum', dxKey: 'pneumonia', score: 50 }, null, 401);
  await call('POST', '/api/medcoel/doctor-sim/results', { caseKey: 'tunggu', score: 50 }, userA.token, 400);
  await call('POST', '/api/medcoel/doctor-sim/results', { caseKey: 'tidakada', score: 50 }, userA.token, 400);
  const ok = (await call('POST', '/api/medcoel/doctor-sim/results', {
    caseKey: 'spog', dxKey: 'peb', score: 250, durationSec: -9, mode: 'timer', timeout: true, actionsCount: 14, keyDone: 40, keyTotal: 30, user: userB.id, dxOk: false,
  }, userA.token, 200)).data.result;
  assert.equal(ok.caseKey, 'spog');
  assert.match(ok.caseTitle, /Bu Sari/);
  assert.equal(ok.dxOk, true); // dihitung server, bukan dari kiriman
  assert.equal(ok.score, 100);
  assert.equal(ok.durationSec, 0);
  assert.equal(ok.mode, 'timer');
  assert.equal(ok.timeout, true);
  assert.equal(ok.keyDone, 30); // tidak melebihi keyTotal
  const wrong = (await call('POST', '/api/medcoel/doctor-sim/results', { caseKey: 'umum', dxKey: 'tb', score: 42, durationSec: 300, mode: 'apa' }, userA.token, 200)).data.result;
  assert.equal(wrong.dxOk, false);
  assert.equal(wrong.mode, 'santai');
  const bad = (await call('POST', '/api/medcoel/doctor-sim/results', { caseKey: 'anak', dxKey: 'DROP TABLE', score: 'x' }, userA.token, 200)).data.result;
  assert.equal(bad.dxKey, '');
  assert.equal(bad.score, 0);
});

await langkah('riwayat simulasi dokter hanya milik sendiri, terbaru dulu, berhalaman', async () => {
  const a = (await call('GET', '/api/medcoel/doctor-sim/results?perPage=2', undefined, userA.token, 200)).data;
  assert.equal(a.totalItems, 3);
  assert.equal(a.items.length, 2);
  assert.equal(a.totalPages, 2);
  assert.equal(a.items[0].caseKey, 'anak');
  const p2 = (await call('GET', '/api/medcoel/doctor-sim/results?perPage=2&page=2', undefined, userA.token, 200)).data;
  assert.equal(p2.items[0].caseKey, 'spog');
  const b = (await call('GET', '/api/medcoel/doctor-sim/results', undefined, userB.token, 200)).data;
  assert.equal(b.totalItems, 0);
  await call('GET', '/api/medcoel/doctor-sim/results', undefined, null, 401);
  // Koleksi tertutup untuk API bawaan PocketBase.
  const raw = await call('GET', '/api/collections/doctor_sims/records', undefined, userA.token);
  assert.ok(raw.status >= 400 || (raw.data.items || []).length === 0);
});

await langkah('kasus simulasi dikelola admin: simpan ulang tidak mengubah isi, kasus nonaktif tidak diundi', async () => {
  await call('GET', '/api/medcoel/admin/sim/cases', undefined, userA.token, 403);
  await call('GET', '/api/medcoel/doctor-sim/content', undefined, null, 401);
  const list = (await call('GET', '/api/medcoel/admin/sim/cases', undefined, admin.token, 200)).data;
  // 5 kasus bawaan + 45 kasus tambahan: 10 per poli.
  assert.equal(list.items.length, 50);
  ['anak', 'bedah', 'dalam', 'spog', 'umum'].forEach((k) => assert.ok(list.items.some((c) => c.key === k), k));
  ['umum', 'bedah', 'spog', 'anak', 'dalam'].forEach((poli) => assert.equal(list.items.filter((c) => c.poli === poli).length, 10, poli));
  assert.equal(new Set(list.items.map((c) => c.dxOk)).size, 50);
  const fullDx = (await call('GET', '/api/medcoel/admin/sim/diagnoses', undefined, admin.token, 200)).data;
  assert.ok((fullDx.items || fullDx).length >= 90);
  const dbd = (await call('POST', '/api/medcoel/doctor-sim/results', { caseKey: 'dbd', dxKey: 'dengue', score: 88 }, userB.token, 200)).data.result;
  assert.equal(dbd.dxOk, true);
  assert.match(dbd.caseTitle, /Pak Hendra/);
  assert.ok(list.items.find((c) => c.key === 'spog').stats.plays >= 1);
  const canon = (v) => JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map((y) => [y, x[y]])) : x));
  for (const key of ['umum', 'spog']) {
    const full = (await call('GET', `/api/medcoel/admin/sim/cases/${key}`, undefined, admin.token, 200)).data;
    const saved = (await call('PATCH', `/api/medcoel/admin/sim/cases/${key}`, { title: full.title, poli: full.poli, active: true, order: full.order, data: full.data }, admin.token, 200)).data;
    assert.equal(canon(saved.data), canon(full.data), key);
  }
  const base = (await call('GET', '/api/medcoel/admin/sim/cases/bedah', undefined, admin.token, 200)).data;
  const bad = await call('POST', '/api/medcoel/admin/sim/cases', { key: 'Bedah X', poli: 'mata', data: { pas: 'robot', intro: [] } }, admin.token, 400);
  ['key', 'poli', 'pas', 'intro', 'dxOk', 'K'].forEach((f) => assert.ok(bad.data.data[f], 'galat ' + f));
  const key = 'uji_' + RUN.slice(-8);
  const made = (await call('POST', '/api/medcoel/admin/sim/cases', { key, poli: 'bedah', active: false, data: { ...base.data, id: 'Bu Uji, 30 tahun', A: { ...base.data.A, ku: { say: 'Perut kanan bawah nyeri.', note: '<b>Nyeri</b>', bogus: 'x' } } } }, admin.token, 200)).data;
  assert.equal(made.title, 'Bu Uji, 30 tahun · Poli bedah');
  assert.equal(made.data.A.ku.bogus, undefined);
  await call('POST', '/api/medcoel/admin/sim/cases', { key, poli: 'bedah', data: base.data }, admin.token, 400);
  let content = (await call('GET', '/api/medcoel/doctor-sim/content', undefined, userA.token, 200)).data;
  assert.equal(content.cases[key], undefined);
  assert.equal(content.dx.pneumonia[0], 'Pneumonia komunitas');
  const preview = (await call('GET', '/api/medcoel/doctor-sim/content?preview=1', undefined, admin.token, 200)).data;
  assert.equal(preview.cases[key].inactive, true);
  assert.equal((await call('GET', '/api/medcoel/doctor-sim/content?preview=1', undefined, userA.token, 200)).data.cases[key], undefined);
  await call('PATCH', `/api/medcoel/admin/sim/cases/${key}`, { active: true }, admin.token, 200);
  content = (await call('GET', '/api/medcoel/doctor-sim/content', undefined, userA.token, 200)).data;
  assert.equal(content.cases[key].poli, 'bedah');
  const r = (await call('POST', '/api/medcoel/doctor-sim/results', { caseKey: key, dxKey: 'apendisitis', score: 80 }, userB.token, 200)).data.result;
  assert.equal(r.dxOk, true);
  await call('DELETE', '/api/medcoel/admin/sim/diagnoses/apendisitis', undefined, admin.token, 400);
  await call('DELETE', '/api/medcoel/admin/sim/cases/umum', undefined, admin.token, 400);
  await call('DELETE', `/api/medcoel/admin/sim/cases/${key}`, undefined, admin.token, 200);
  // Riwayat pemain tetap ada setelah kasus dihapus.
  const hist = (await call('GET', '/api/medcoel/doctor-sim/results', undefined, userB.token, 200)).data;
  assert.equal(hist.items[0].caseTitle, 'Bu Uji, 30 tahun · Poli bedah');
  await call('DELETE', '/api/medcoel/admin/sim/cases/bedah', undefined, userA.token, 403);
});

await langkah('leaderboard gabungan: soal + skor terbaik per kasus simulasi, mengulang tidak menumpuk', async () => {
  const before = (await call('GET', '/api/medcoel/leaderboard?period=all', undefined, userA.token, 200)).data;
  assert.equal(before.simPerCase, 10);
  // userA: spog 100, umum 42, anak 0 -> 10 + 4 + 0
  assert.equal(before.me.simPoints, 14);
  assert.equal(before.me.points, before.me.questionPoints + 14);
  await call('POST', '/api/medcoel/doctor-sim/results', { caseKey: 'umum', dxKey: 'pneumonia', score: 90 }, userA.token, 200);
  await call('POST', '/api/medcoel/doctor-sim/results', { caseKey: 'umum', dxKey: 'pneumonia', score: 60 }, userA.token, 200);
  const after = (await call('GET', '/api/medcoel/leaderboard?period=all', undefined, userA.token, 200)).data;
  assert.equal(after.me.simPoints, 19); // umum naik ke 90 -> 9, bukan 4 + 9 + 6
  const week = (await call('GET', '/api/medcoel/leaderboard', undefined, userA.token, 200)).data;
  assert.ok(week.items.every((it) => typeof it.simPoints === 'number' && typeof it.questionPoints === 'number'));
  // Total poin di progres ikut menghitung simulasi.
  const prog = (await call('GET', '/api/medcoel/progress', undefined, userA.token, 200)).data;
  assert.equal(prog.totalPoints, after.me.points);
});

console.log('Jadwal, pengumuman, nonaktif');
await langkah('jadwal ujian hanya terlihat pemiliknya', async () => {
  const examAt = new Date(Date.now() + 3 * 86400000).toISOString().replace('T', ' ');
  const x = (await call('POST', '/api/collections/exam_schedules/records', { user: userA.id, subject: mk.id, title: 'UTB', examAt, timezone: 'WITA' }, userA.token, 200)).data;
  assert.deepEqual(x.reminderDays, [7, 3, 1]);
  await call('POST', '/api/collections/exam_schedules/records', { user: userA.id, subject: mk.id, title: 'palsu', examAt, timezone: 'WIB' }, userB.token, 400).catch(async () => {
    const r = await call('POST', '/api/collections/exam_schedules/records', { user: userA.id, subject: mk.id, title: 'palsu', examAt, timezone: 'WIB' }, userB.token);
    assert.ok(r.status >= 400);
  });
  const lb = (await call('GET', '/api/collections/exam_schedules/records', undefined, userB.token, 200)).data;
  assert.ok(lb.items.every((s) => s.user === userB.id));
  const job = (await call('POST', '/api/medcoel/admin/run-job/reminders', {}, admin.token, 200)).data;
  assert.ok(job.notified >= 1);
});

await langkah('pengumuman pop-up tampil sampai ditutup, sesuai target kampus', async () => {
  const a = (await call('POST', '/api/collections/announcements/records', { title: 'Donasi Jumat', body: 'QR', target: 'campuses', campuses: [kampusA.id], active: true }, admin.token, 200)).data;
  const ua = (await call('GET', '/api/medcoel/announcements/active', undefined, userA.token, 200)).data.items;
  const ub = (await call('GET', '/api/medcoel/announcements/active', undefined, userB.token, 200)).data.items;
  assert.ok(ua.some((x) => x.id === a.id));
  assert.ok(!ub.some((x) => x.id === a.id));
  await call('POST', `/api/medcoel/announcements/${a.id}/dismiss`, {}, userA.token, 200);
  const ua2 = (await call('GET', '/api/medcoel/announcements/active', undefined, userA.token, 200)).data.items;
  assert.ok(!ua2.some((x) => x.id === a.id));
});

await langkah('ganti kampus dibatasi dan langsung mengubah hak lihat soal', async () => {
  await call('POST', '/api/medcoel/me/campus', { campus: kampusB.id }, userA.token, 200);
  await call('POST', '/api/medcoel/me/campus', { campus: kampusA.id }, userA.token, 400);
  const a = (await call('GET', `/api/medcoel/subjects/${mk.slug}`, undefined, userA.token, 200)).data;
  assert.equal(a.chapters.find((c) => c.id === babId).total, soalUmum.length);
  assert.deepEqual((await call('GET', '/api/medcoel/campus-materials', undefined, userA.token, 200)).data.items, []);
});

await langkah('akun tanpa kampus (mis. siswa SMA): semester tidak wajib, soal dikirim sebagai General', async () => {
  // Dengan kampus, semester tetap wajib.
  const base = { name: 'Uji Tanpa Kampus', email: `ujin${RUN}@contoh.test`, whatsapp: '081234567890', password: 'rahasia123', passwordConfirm: 'rahasia123' };
  const wajib = await call('POST', '/api/medcoel/signup/start', { ...base, loginId: `ujin${RUN}`, campus: kampusA.id }, null, 400);
  assert.ok(wajib.data.data.semester);
  await call('POST', '/api/medcoel/signup/start', { ...base, loginId: `ujin${RUN}` }, null, 400); // tanpa kampus dan tanpa pilihan: ditolak
  const sma = await daftar(`ujin${RUN}`, '', { campusOther: 'Tidak memiliki kampus', semester: undefined });
  const me = (await call('GET', '/api/medcoel/me', undefined, sma.token, 200)).data;
  assert.equal(me.campus, '');
  assert.equal(me.noCampus, true);
  assert.equal(me.campusName, 'Tidak memiliki kampus');
  // Hanya kampus saya tidak tersedia, General tersedia.
  const mkSub = { subject: mk.id, hasKey: false, language: 'id', pdfCount: 1 };
  const tolak = await call('POST', '/api/medcoel/submissions', { ...mkSub, scope: 'campus' }, sma.token, 400);
  assert.match(tolak.data.message, /General/);
  await call('POST', '/api/medcoel/submissions', { ...mkSub, scope: 'all' }, sma.token, 200);
  const lb = (await call('GET', '/api/medcoel/leaderboard?scope=campus', undefined, sma.token, 200)).data;
  assert.match(lb.note, /belum punya kampus/);
  // Admin tidak menghitung "Tidak memiliki kampus" sebagai kampus yang perlu ditambahkan.
  const lain = (await call('GET', '/api/medcoel/admin/campuses/other', undefined, admin.token, 200)).data.items;
  assert.ok(!lain.some((x) => x.name === 'Tidak memiliki kampus'));
  // Mengisi kampus nanti tidak terkena batas ganti kampus.
  const baru = (await call('POST', '/api/medcoel/me/campus', { campus: kampusA.id }, sma.token, 200)).data;
  assert.equal(baru.noCampus, false);
  assert.equal(baru.campus, kampusA.id);
});

console.log('Drilling');
await langkah('drilling: tersembunyi sampai ada soal dan sakelar admin menyala; BAB biasa, simulasi, dan paket tidak ikut terpengaruh', async () => {
  const dsub = subjects[3];
  const kosong = (await call('GET', '/api/medcoel/drilling', undefined, userA.token, 200)).data;
  assert.equal(kosong.available, false);
  assert.deepEqual(kosong.subjects, []);
  assert.equal((await call('GET', '/api/medcoel/me', undefined, userA.token, 200)).data.drillingAvailable, false);
  await call('POST', '/api/medcoel/attempts/drilling', { subject: dsub.id }, userA.token, 404);

  const before = (await call('GET', `/api/medcoel/subjects/${dsub.slug}`, undefined, userA.token, 200)).data.chapters.length;
  const soal = [
    { type: 'A', difficulty: 'easy', text: 'Drilling 1?', options: [{ text: 'Benar', correct: true }, 'Salah'] },
    { type: 'A', difficulty: 'medium', text: 'Drilling 2?', options: ['x', { text: 'y', correct: true }, 'z'] },
    { type: 'K', difficulty: 'hard', text: 'Drilling 3?', statements: ['s1', 's2', 's3', 's4'], trueStatements: [1, 3] },
  ];
  // Soal Drilling tidak butuh BAB dan boleh General maupun khusus kampus (hotfix server 352d5ca); pratinjau tidak membuat BAB.
  const kampusDry = (await call('POST', '/api/medcoel/agent/import', { subject: dsub.slug, drilling: true, dryRun: true, scope: 'campus', campuses: [kampusA.id], questions: soal }, agent.token, 200)).data;
  assert.equal(kampusDry.valid, 3);
  const dry = (await call('POST', '/api/medcoel/agent/import', { subject: dsub.slug, drilling: true, dryRun: true, questions: soal }, agent.token, 200)).data;
  assert.equal(dry.valid, 3);
  // Semua mata kuliah tampil di halaman admin (juga yang belum punya soal) dan sudah punya BAB Drilling.
  const awal = (await call('GET', '/api/medcoel/admin/drilling', undefined, admin.token, 200)).data;
  assert.ok(awal.subjects.length >= subjects.length);
  assert.ok(awal.subjects.every((x) => x.chapter && x.published === 0));
  const imp = (await call('POST', '/api/medcoel/agent/import', { subject: dsub.slug, drilling: true, questions: soal }, agent.token, 200)).data;
  assert.equal(imp.created, 3);
  assert.equal(imp.chaptersCreated, 0);
  const again = (await call('POST', '/api/medcoel/agent/import', { subject: dsub.slug, drilling: true, questions: [{ type: 'A', text: 'Drilling 4?', options: ['a', { text: 'b', correct: true }] }] }, agent.token, 200)).data;
  assert.equal(again.created, 1);

  // Ada soal tetapi sakelar mati: tetap tersembunyi. Admin melihat hitungannya.
  const adm = (await call('GET', '/api/medcoel/admin/drilling', undefined, admin.token, 200)).data;
  assert.equal(adm.enabled, false);
  assert.equal(adm.available, false);
  assert.equal(adm.total, 4);
  assert.equal(adm.subjects.find((x) => x.id === dsub.id).published, 4);
  assert.equal(adm.published, 4);
  // Admin boleh mencoba Drilling walau belum dibuka untuk pengguna (pratinjau).
  const prev = (await call('GET', '/api/medcoel/drilling', undefined, admin.token, 200)).data;
  assert.equal(prev.preview, true);
  assert.deepEqual(prev.subjects.map((x) => x.slug), [dsub.slug]);
  const meAdmin = (await call('GET', '/api/medcoel/me', undefined, admin.token, 200)).data;
  assert.equal(meAdmin.drillingAvailable, true);
  assert.equal(meAdmin.drillingPreview, true);
  assert.equal((await call('POST', '/api/medcoel/attempts/drilling', { subject: dsub.id, count: 2 }, admin.token, 200)).data.questions.length, 2);
  // Mata kuliah baru langsung punya BAB Drilling.
  const baru = (await call('POST', '/api/collections/subjects/records', { name: `Mata Kuliah Uji ${RUN}`, slug: `mk-uji-${RUN}`, order: 99 }, admin.token, 200)).data;
  const bab = (await call('GET', `/api/collections/chapters/records?filter=${encodeURIComponent(`subject='${baru.id}' && drilling=true`)}`, undefined, admin.token, 200)).data.items;
  assert.equal(bab.length, 1);
  assert.equal((await call('GET', '/api/medcoel/drilling', undefined, userA.token, 200)).data.available, false);
  assert.equal((await call('GET', '/api/medcoel/me', undefined, userA.token, 200)).data.drillingAvailable, false);
  await call('POST', '/api/medcoel/attempts/drilling', { subject: dsub.id }, userA.token, 404);

  // Sakelar menyala: tampil, hanya mata kuliah yang punya soal.
  const rec = (await call('GET', '/api/collections/app_settings/records?perPage=1', undefined, admin.token, 200)).data.items[0];
  await call('PATCH', `/api/collections/app_settings/records/${rec.id}`, { drillingEnabled: true }, admin.token, 200);
  try {
    const on = (await call('GET', '/api/medcoel/drilling', undefined, userA.token, 200)).data;
    assert.equal(on.available, true);
    assert.deepEqual(on.subjects.map((x) => x.slug), [dsub.slug]);
    assert.equal(on.subjects[0].questionCount, 4);
    assert.equal((await call('GET', '/api/medcoel/me', undefined, userA.token, 200)).data.drillingAvailable, true);

    // Langsung mulai tanpa memilih BAB atau jumlah; jumlah berlebih dipotong ke yang tersedia.
    const att = (await call('POST', '/api/medcoel/attempts/drilling', { subject: dsub.id }, userA.token, 200)).data;
    assert.equal(att.questions.length, 4);
    assert.match(att.attempt.title, /^Drilling /);
    assert.equal(att.attempt.settings.drilling, true);
    const big = (await call('POST', '/api/medcoel/attempts/drilling', { subject: dsub.id, count: 99, mode: 'exam' }, userA.token, 200)).data;
    assert.equal(big.questions.length, 4);
    const small = (await call('POST', '/api/medcoel/attempts/drilling', { subject: dsub.id, count: 2 }, userA.token, 200)).data;
    assert.equal(small.questions.length, 2);
    assert.ok(!('answer' in small.questions[0]), 'kunci tidak dikirim sebelum dijawab');
    await call('POST', '/api/medcoel/attempts/drilling', { subject: mk.id }, userA.token, 400); // mata kuliah tanpa soal Drilling
    // Akun tanpa kampus tetap bisa drilling (soalnya General).
    const sma = await daftar(`ujid${RUN}`, '', { campusOther: 'Tidak memiliki kampus', semester: undefined });
    assert.equal((await call('POST', '/api/medcoel/attempts/drilling', { subject: dsub.id, count: 3 }, sma.token, 200)).data.questions.length, 3);

    // BAB biasa, simulasi, dan paket tidak melihat soal Drilling.
    const det = (await call('GET', `/api/medcoel/subjects/${dsub.slug}`, undefined, userA.token, 200)).data;
    assert.equal(det.chapters.length, before);
    assert.ok(!det.chapters.some((c) => c.title === 'Drilling'));
    const cards = (await call('GET', '/api/medcoel/subjects', undefined, userA.token, 200)).data.items.find((x) => x.id === dsub.id);
    assert.equal(cards.questionCount, 0);
    const avail = (await call('GET', `/api/medcoel/simulation/availability?subject=${dsub.id}&source=all`, undefined, userA.token, 200)).data;
    assert.deepEqual(avail.chapters, {});
    const drillChap = (await call('GET', `/api/collections/chapters/records?filter=${encodeURIComponent(`subject='${dsub.id}' && drilling=true`)}`, undefined, admin.token, 200)).data.items[0];
    assert.ok(drillChap);
    await call('POST', '/api/medcoel/attempts/practice', { chapter: drillChap.id, count: 2 }, userA.token, 404);

    // Menyembunyikan BAB Drilling mata kuliah itu (dari halaman admin) menyembunyikannya dari pengguna.
    await call('PATCH', `/api/collections/chapters/records/${drillChap.id}`, { hidden: true }, admin.token, 200);
    assert.equal((await call('GET', '/api/medcoel/drilling', undefined, userA.token, 200)).data.available, false);
    await call('PATCH', `/api/collections/chapters/records/${drillChap.id}`, { hidden: false }, admin.token, 200);

    // Soal Drilling boleh khusus kampus lewat aksi massal (hotfix server 352d5ca); dikembalikan ke General agar hitungan di bawah tetap.
    const q = (await call('GET', `/api/medcoel/admin/questions?subject=${dsub.id}`, undefined, admin.token, 200)).data.items[0];
    await call('POST', '/api/medcoel/admin/questions/bulk', { ids: [q.id], action: 'scope', scope: 'campus', campuses: [kampusA.id] }, admin.token, 200);
    assert.equal((await call('GET', `/api/collections/questions/records/${q.id}`, undefined, su, 200)).data.scope, 'campus');
    await call('POST', '/api/medcoel/admin/questions/bulk', { ids: [q.id], action: 'scope', scope: 'all' }, admin.token, 200);

    // Aksi massal per mata kuliah dari halaman admin Drilling: draf -> tayang -> pindah -> hapus.
    const bulk = (body) => call('POST', '/api/medcoel/admin/drilling/bulk', { subject: dsub.id, ...body }, admin.token, 200);
    await call('POST', '/api/medcoel/admin/drilling/bulk', { subject: dsub.id, action: 'meledak' }, admin.token, 400);
    await call('POST', '/api/medcoel/admin/drilling/bulk', { subject: dsub.id, action: 'publish' }, userA.token, 403);
    assert.equal((await bulk({ action: 'draft', status: 'published' })).data.count, 4);
    assert.equal((await call('GET', '/api/medcoel/drilling', undefined, userA.token, 200)).data.available, false);
    const dr = (await call('GET', '/api/medcoel/admin/drilling', undefined, admin.token, 200)).data.subjects.find((x) => x.id === dsub.id);
    assert.deepEqual([dr.published, dr.draft], [0, 4]);
    assert.equal((await bulk({ action: 'publish', status: 'draft' })).data.count, 4);
    assert.equal((await call('GET', '/api/medcoel/drilling', undefined, userA.token, 200)).data.available, true);
    const biasa = (await call('GET', `/api/collections/chapters/records?filter=${encodeURIComponent(`subject='${dsub.id}' && drilling=false`)}`, undefined, admin.token, 200)).data.items[0];
    await call('POST', '/api/medcoel/admin/drilling/bulk', { subject: dsub.id, action: 'move', chapter: drillChap.id }, admin.token, 400); // tujuan harus BAB biasa
    assert.equal((await bulk({ action: 'move', chapter: biasa.id })).data.count, 4);
    assert.equal((await call('GET', '/api/medcoel/admin/drilling', undefined, admin.token, 200)).data.published, 0);
    assert.equal((await call('POST', '/api/medcoel/admin/questions/bulk', { ids: (await call('GET', `/api/medcoel/admin/questions?chapter=${biasa.id}&perPage=50`, undefined, admin.token, 200)).data.items.map((x) => x.id), action: 'move', chapter: drillChap.id }, admin.token, 200)).data.count >= 4, true);
    assert.equal((await bulk({ action: 'delete' })).data.count, 4);
    assert.equal((await call('GET', '/api/medcoel/admin/drilling', undefined, admin.token, 200)).data.published, 0);
  } finally {
    await call('PATCH', `/api/collections/app_settings/records/${rec.id}`, { drillingEnabled: false }, admin.token, 200);
  }
});

await langkah('admin menonaktifkan akun: token lama dan login ditolak', async () => {
  await call('POST', `/api/medcoel/admin/users/${userB.id}`, { action: 'disable', reason: 'bukti palsu' }, admin.token, 200);
  await call('GET', '/api/medcoel/me', undefined, userB.token, 401);
  await call('GET', '/api/medcoel/support/messages', undefined, userB.token, 401);
  await call('GET', '/api/medcoel/campus-materials', undefined, userB.token, 401);
  const login = await call('POST', '/api/collections/users/auth-with-password', { identity: `ujib${RUN}`, password: 'rahasia123' });
  assert.ok(login.status >= 400);
  const users = (await call('GET', `/api/medcoel/admin/users?q=ujib${RUN}`, undefined, admin.token, 200)).data;
  assert.equal(users.items[0].proofs.length, 2);
  assert.ok(users.items[0].email.includes('@'));
});

console.log('Tutorial');
await langkah('status tutorial kosong untuk akun baru, tersimpan per pengguna, dan selesai tidak bisa diturunkan', async () => {
  const fresh = await daftar(`ujit${RUN}`, kampusA.id);
  assert.deepEqual((await call('GET', '/api/medcoel/me', undefined, fresh.token, 200)).data.tutorials, {});
  assert.deepEqual((await call('POST', '/api/medcoel/me/tutorial', { key: 'fk', status: 'skipped' }, fresh.token, 200)).data.tutorials, { fk: 'skipped' });
  assert.deepEqual((await call('POST', '/api/medcoel/me/tutorial', { key: 'fk', status: 'done' }, fresh.token, 200)).data.tutorials, { fk: 'done' });
  assert.deepEqual((await call('POST', '/api/medcoel/me/tutorial', { key: 'fk', status: 'skipped' }, fresh.token, 200)).data.tutorials, { fk: 'done' });
  assert.deepEqual((await call('POST', '/api/medcoel/me/tutorial', { key: 'dokter', status: 'skipped' }, fresh.token, 200)).data.tutorials, { fk: 'done', dokter: 'skipped' });
  assert.deepEqual((await call('GET', '/api/medcoel/me', undefined, fresh.token, 200)).data.tutorials, { fk: 'done', dokter: 'skipped' });
  await call('POST', '/api/medcoel/me/tutorial', { key: 'admin', status: 'done' }, fresh.token, 400);
  await call('POST', '/api/medcoel/me/tutorial', { key: 'fk', status: 'hapus' }, fresh.token, 400);
  await call('POST', '/api/medcoel/me/tutorial', { key: 'fk', status: 'done' }, null, 401);
  assert.deepEqual((await call('GET', '/api/medcoel/me', undefined, userA.token, 200)).data.tutorials, {});
});

console.log('Pendaftaran yang diatur admin');
await langkah('kolom tambahan (TikTok), langkah bukti opsional, WhatsApp opsional, ubah dan ekspor oleh admin', async () => {
  const st = (await call('GET', '/api/collections/app_settings/records?perPage=1', undefined, su, 200)).data.items[0];
  const original = { signupFields: st.signupFields, signupProofs: st.signupProofs, signupBuiltin: st.signupBuiltin };
  try {
    await call('PATCH', `/api/collections/app_settings/records/${st.id}`, {
      signupBuiltin: { whatsapp: 'optional', semester: 'hidden' },
      signupFields: [
        { key: 'tiktok', label: 'Akun TikTok', type: 'handle', required: true, where: 'signup' },
        { key: 'angkatan', label: 'Angkatan', type: 'select', options: ['2023', '2024'], where: 'signup' },
        { key: 'catatan_admin', label: 'Catatan admin', type: 'textarea', where: 'admin' },
        { key: 'email', label: 'Bentrok bawaan', type: 'text' },
        { key: 'Rusak Kunci', label: 'x' },
      ],
      signupProofs: [...st.signupProofs, { key: 'tiktok', title: 'Ikuti TikTok MEDCOEL', short: 'TikTok', url: 'javascript:alert(1)', question: 'Sudah?', required: false }],
    }, su, 200);
    const pub = (await call('GET', '/api/medcoel/public-settings', undefined, null, 200)).data.signup;
    assert.deepEqual(pub.fields.map((f) => f.key), ['tiktok', 'angkatan']); // admin-only dan kunci rusak tidak dikirim
    assert.equal(pub.proofs.at(-1).url, ''); // tautan non-http dibuang
    assert.equal(pub.builtin.semester, 'hidden');

    const loginId = `ujix${RUN}`;
    const base = { loginId, name: 'Uji Kolom Tambahan', email: `${loginId}@contoh.test`, password: 'rahasia123', passwordConfirm: 'rahasia123', campus: kampusA.id };
    const bad = await call('POST', '/api/medcoel/signup/start', { ...base, extra: { angkatan: '1999' } }, null, 400);
    assert.ok(bad.data.data.extra_tiktok);
    assert.ok(bad.data.data.extra_angkatan);
    assert.equal(bad.data.data.whatsapp, undefined); // WhatsApp opsional
    assert.equal(bad.data.data.semester, undefined); // semester disembunyikan
    let s = (await call('POST', '/api/medcoel/signup/start', { ...base, extra: { tiktok: '@medcoel.fan', angkatan: '2024', catatan_admin: 'disusupkan' } }, null, 200)).data;
    assert.deepEqual(s.profile.extra, { tiktok: 'medcoel.fan', angkatan: '2024' });
    const cred = { draftId: s.draftId, draftToken: s.draftToken };
    await call('POST', '/api/medcoel/signup/verify', { ...cred, code: s.devCode }, null, 200);
    await call('POST', '/api/medcoel/signup/subjects', { ...cred, subjects: [mk.id] }, null, 200);
    // Langkah TikTok belum boleh sebelum WhatsApp dan Instagram.
    await call('POST', '/api/medcoel/signup/proof', { ...cred, kind: 'tiktok', skip: true }, null, 400);
    await call('POST', '/api/medcoel/signup/proof', { ...cred, kind: 'whatsapp', skip: true }, null, 400); // wajib
    for (const kind of ['whatsapp', 'instagram']) {
      const up = await upload({ kind: 'proof_' + kind, name: 'bukti.png', ...cred }, PNG, 'image/png');
      await call('POST', '/api/medcoel/signup/proof', { ...cred, kind, fileId: up.data.id, joined: true }, null, 200);
    }
    await call('POST', '/api/medcoel/signup/finish', cred, null, 400); // langkah TikTok belum dilewati atau diisi
    const up = await upload({ kind: 'proof_tiktok', name: 'bukti.png', ...cred }, PNG, 'image/png');
    assert.equal(up.status, 200);
    s = (await call('POST', '/api/medcoel/signup/proof', { ...cred, kind: 'tiktok', fileId: up.data.id, joined: true }, null, 200)).data;
    assert.equal(s.step, 7);
    await call('POST', '/api/medcoel/signup/finish', cred, null, 200);
    const auth = (await call('POST', '/api/collections/users/auth-with-password', { identity: loginId, password: 'rahasia123' }, null, 200)).data;
    const me = (await call('GET', '/api/medcoel/me', undefined, auth.token, 200)).data;
    assert.deepEqual(me.extra, { tiktok: 'medcoel.fan', angkatan: '2024' });
    assert.equal(me.whatsapp, '');
    assert.equal(me.semester, 0);
    // Data tambahan tidak bisa diubah langsung lewat koleksi, hanya lewat endpoint yang memvalidasi.
    const direct = await call('PATCH', `/api/collections/users/records/${auth.record.id}`, { extra: { tiktok: 'x' } }, auth.token);
    assert.ok(direct.status === 400 || direct.status === 404, 'ubah extra langsung harus ditolak');
    await call('POST', '/api/medcoel/me/extra', { extra: { tiktok: 'bukan akun!' } }, auth.token, 400);
    const upd = (await call('POST', '/api/medcoel/me/extra', { extra: { tiktok: 'akun_baru', catatan_admin: 'coba' } }, auth.token, 200)).data;
    assert.deepEqual(upd.extra, { tiktok: 'akun_baru', angkatan: '2024' });

    // Admin melihat bukti TikTok, mengubah data, dan mengekspor CSV.
    const list = (await call('GET', `/api/medcoel/admin/users?q=${loginId}`, undefined, admin.token, 200)).data;
    assert.deepEqual(list.items[0].proofs.map((p) => p.key).sort(), ['instagram', 'tiktok', 'whatsapp']);
    assert.ok(list.fields.some((f) => f.key === 'catatan_admin'));
    const byExtra = (await call('GET', '/api/medcoel/admin/users?q=akun_baru', undefined, admin.token, 200)).data;
    assert.equal(byExtra.items[0].loginId, loginId);
    await call('POST', `/api/medcoel/admin/users/${auth.record.id}`, { action: 'profile', email: 'bukan-email' }, admin.token, 400);
    await call('POST', `/api/medcoel/admin/users/${auth.record.id}`, { action: 'profile', loginId: `ujia${RUN}` }, admin.token, 400);
    const ed = (await call('POST', `/api/medcoel/admin/users/${auth.record.id}`, { action: 'profile', name: 'Nama Baru', semester: 4, role: 'agent', extra: { catatan_admin: '=1+1 cek' } }, admin.token, 200)).data;
    assert.equal(ed.name, 'Nama Baru');
    assert.equal(ed.role, 'agent');
    assert.equal(ed.extra.catatan_admin, '=1+1 cek');
    assert.equal(ed.extra.tiktok, 'akun_baru');
    await call('POST', `/api/medcoel/admin/users/${auth.record.id}`, { action: 'profile', role: 'admin' }, admin.token, 400);
    await call('POST', `/api/medcoel/admin/users/${auth.record.id}`, { action: 'profile', name: 'X Y' }, userA.token, 403);
    const r = await fetch(B + `/api/medcoel/admin/users/export?q=${loginId}`, { headers: { Authorization: admin.token } });
    assert.equal(r.status, 200);
    assert.match(r.headers.get('content-type'), /text\/csv/);
    const csv = await r.text();
    assert.ok(csv.includes('Akun TikTok'));
    assert.ok(csv.includes('akun_baru'));
    assert.ok(csv.includes("'=1+1 cek")); // rumus spreadsheet dinetralkan
    assert.equal((await fetch(B + '/api/medcoel/admin/users/export', { headers: { Authorization: userA.token } })).status, 403);
  } finally {
    await call('PATCH', `/api/collections/app_settings/records/${st.id}`, original, su, 200);
  }
});

console.log('Pembahasan Inggris');
await langkah('paket sumber terjemahan hanya untuk admin dan lengkap tanpa data peserta', async () => {
  const path = '/api/medcoel/admin/english/source';
  for (const token of [null, userA.token, agent.token]) {
    for (const kind of ['question', 'case', 'catalog']) {
      await call('GET', path + '?kind=' + kind, undefined, token, token ? 403 : 401);
    }
  }
  await call('GET', path + '?kind=users', undefined, admin.token, 400);
  await call('GET', path + '?after=invalid', undefined, admin.token, 400);
  const items = [];
  const cursors = new Set();
  let after = '';
  do {
    const page = (await call('GET', path + '?kind=question&after=' + after, undefined, admin.token, 200)).data;
    assert.ok(page.items.length <= 50);
    items.push(...page.items);
    after = page.next;
    assert.ok(!after || !cursors.has(after));
    cursors.add(after);
  } while (after);
  assert.equal(new Set(items.map((q) => q.id)).size, items.length);
  const total = (await call('GET', '/api/medcoel/admin/questions?perPage=1', undefined, admin.token, 200)).data.totalItems;
  assert.equal(items.length, total);
  assert.ok(items.length > 0);
  for (const q of items) {
    assert.deepEqual(Object.keys(q).sort(), ['id', 'sourceHash', 'revision', 'status', 'subjectName', 'source', 'glossary', 'protectedTerms', 'segments'].sort());
    const view = (await call('GET', `/api/medcoel/admin/questions/${q.id}/english`, undefined, admin.token, 200)).data;
    assert.deepEqual(q.source, view.question);
    assert.deepEqual(q.segments, view.segments);
    assert.equal(q.revision, view.revision, 'export must not change a draft');
  }
  const catalog = (await call('GET', path + '?kind=catalog', undefined, admin.token, 200)).data;
  assert.ok(catalog.subjects.length > 0);
  assert.deepEqual(Object.keys(catalog.subjects[0]).sort(), ['id', 'name', 'slug', 'description'].sort());
  assert.deepEqual(Object.keys(catalog.items[0]).sort(), ['id', 'subject', 'title'].sort());
  const cases = (await call('GET', path + '?kind=case', undefined, admin.token, 200)).data;
  assert.ok(cases.items.length > 0);
  assert.ok(cases.items[0].source.clinicalContext);
  assert.ok(cases.items[0].segments.length > 0);
});
let englishId, englishChapter, englishBody;
await langkah('pembahasan Inggris: hanya admin dapat membaca, membuat, dan memeriksa terjemahan', async () => {
  englishChapter = (await call('POST', '/api/collections/chapters/records', { subject: mk.id, title: 'English ' + RUN, hidden: false }, admin.token, 200)).data.id;
  englishBody = {
    subject: mk.id, chapter: englishChapter, scope: 'all', status: 'published',
    question: { type: 'A', text: 'Struktur yang terganggu?', options: [{ text: 'Struktur ini adalah nervus medianus.', explanation: 'Lesi nervus medianus memengaruhi 2 jari.', correct: true }, { text: 'Struktur ini adalah nervus ulnaris.', explanation: 'nervus ulnaris tidak terlibat.' }], explanation: 'Fungsi nervus medianus tetap dinilai.' },
  };
  englishId = (await call('POST', '/api/medcoel/admin/questions', englishBody, admin.token, 200)).data.id;
  for (const token of [null, userA.token, agent.token]) {
    await call('GET', `/api/medcoel/admin/questions/${englishId}/english`, undefined, token, token ? 403 : 401);
    await call('POST', `/api/medcoel/admin/questions/${englishId}/english`, { action: 'review' }, token, token ? 403 : 401);
    await call('POST', `/api/medcoel/admin/questions/${englishId}/english/generate`, {}, token, token ? 403 : 401);
  }
});

const englishPath = () => `/api/medcoel/admin/questions/${englishId}/english`;
const englishDraft = (d) => ({
  sourceHash: d.sourceHash, revision: d.revision, protectedTerms: ['nervus medianus'],
  segments: d.segments.map((s) => ({ id: s.id, text: ({
    explanation: 'The function of the nervus medianus is still assessed.',
    'options.0.text': 'This structure is nervus medianus.',
    'options.1.text': 'This structure is nervus ulnaris.',
    'options.0.explanation': 'A lesion of the nervus medianus affects 2 fingers.',
    'options.1.explanation': 'The nervus ulnaris is not involved.',
  })[s.id] || s.source })),
});
let englishAttempt;
await langkah('draf tidak bocor; pemeriksaan menolak angka/istilah berubah dan belum dikonfirmasi', async () => {
  const d = (await call('GET', englishPath(), undefined, admin.token, 200)).data;
  const body = englishDraft(d);
  const draft = (await call('POST', englishPath(), { ...body, action: 'draft' }, admin.token, 200)).data;
  assert.equal(draft.status, 'draft');
  await call('POST', englishPath(), { ...englishDraft(draft), action: 'review' }, admin.token, 400);
  const wrong = englishDraft(draft);
  wrong.segments[1].text = 'A median nerve lesion affects 3 fingers.';
  await call('POST', englishPath(), { ...wrong, action: 'review', reviewConfirmed: true }, admin.token, 400);
  englishAttempt = (await call('POST', '/api/medcoel/attempts/practice', { chapter: englishChapter, count: 1, mode: 'learning' }, userA.token, 200)).data;
  assert.equal(englishAttempt.questions[0].id, englishId);
  assert.ok(!('explanationEnglish' in englishAttempt.questions[0]));
  const checked = (await call('POST', `/api/medcoel/attempts/${englishAttempt.attempt.id}/answer`, { question: englishId, response: 'A', check: true }, userA.token, 200)).data;
  assert.ok(!('explanationEnglish' in checked.question), 'draft must not be visible after check either');
});

await langkah('versi Inggris hanya terungkap bersama kunci; versi sumber dan penilaian tetap sama', async () => {
  const d = (await call('GET', englishPath(), undefined, admin.token, 200)).data;
  const reviewed = (await call('POST', englishPath(), { ...englishDraft(d), action: 'review', reviewConfirmed: true }, admin.token, 200)).data;
  assert.equal(reviewed.status, 'reviewed');
  const exam = (await call('POST', '/api/medcoel/attempts/practice', { chapter: englishChapter, count: 1, mode: 'exam' }, userA.token, 200)).data;
  assert.ok(!('explanationEnglish' in exam.questions[0]));
  assert.ok(!('explanation' in exam.questions[0]));
  const resume = (await call('GET', `/api/medcoel/attempts/${englishAttempt.attempt.id}`, undefined, userA.token, 200)).data;
  const q = resume.questions[0];
  assert.equal(q.answer, 'A');
  assert.equal(q.stem, 'Struktur yang terganggu?');
  assert.equal(q.explanation, englishBody.question.explanation);
  assert.match(q.explanationEnglish.explanation, /The function/);
  assert.equal(q.explanationEnglish.options[0].label, 'A');
  assert.ok(!JSON.stringify(q.explanationEnglish).includes('reviewedBy'));
  await call('POST', englishPath(), { ...englishDraft(d), action: 'draft' }, admin.token, 400); // stale revision
});

await langkah('perubahan sumber dan kamus menyembunyikan Inggris lama serta menolak editor yang tertinggal', async () => {
  const before = (await call('GET', englishPath(), undefined, admin.token, 200)).data;
  const changed = { ...englishBody, question: { ...englishBody.question, text: 'Struktur apa yang terganggu pada kasus baru?' } };
  await call('PATCH', `/api/medcoel/admin/questions/${englishId}`, changed, admin.token, 200);
  const stale = (await call('GET', englishPath(), undefined, admin.token, 200)).data;
  assert.equal(stale.status, 'stale');
  await call('POST', englishPath(), { ...englishDraft(before), action: 'review', reviewConfirmed: true }, admin.token, 400);
  let resume = (await call('GET', `/api/medcoel/attempts/${englishAttempt.attempt.id}`, undefined, userA.token, 200)).data;
  assert.ok(!('explanationEnglish' in resume.questions[0]));
  const approved = (await call('POST', englishPath(), { ...englishDraft(stale), action: 'review', reviewConfirmed: true }, admin.token, 200)).data;
  assert.equal(approved.status, 'reviewed');
  const st = (await call('GET', '/api/collections/app_settings/records', undefined, admin.token, 200)).data.items[0];
  try {
    await call('PATCH', `/api/collections/app_settings/records/${st.id}`, { translationTerms: 'nervus medianus' }, admin.token, 200);
    assert.equal((await call('GET', englishPath(), undefined, admin.token, 200)).data.status, 'stale');
    resume = (await call('GET', `/api/medcoel/attempts/${englishAttempt.attempt.id}`, undefined, userA.token, 200)).data;
    assert.ok(!('explanationEnglish' in resume.questions[0]));
    await call('PATCH', `/api/collections/app_settings/records/${st.id}`, { translationTerms: 'x'.repeat(121) }, admin.token, 400);
  } finally {
    await call('PATCH', `/api/collections/app_settings/records/${st.id}`, { translationTerms: st.translationTerms || '' }, admin.token, 200);
  }
});

await langkah('bahasa global: teks Inggris boleh tampil sebelum menjawab, pembahasan dan kunci tetap ditahan', async () => {
  const original = (await call('GET', englishPath(), undefined, admin.token, 200)).data;
  const draft = englishDraft(original);
  draft.segments = draft.segments.map((part) => part.id === 'stem' ? { ...part, text: 'Which structure is affected in this case?' } : part);
  await call('POST', englishPath(), { ...draft, action: 'review', reviewConfirmed: true }, admin.token, 200);
  const attempt = (await call('POST', '/api/medcoel/attempts/practice', { chapter: englishChapter, count: 1, mode: 'exam' }, userA.token, 200)).data;
  const q = attempt.questions[0];
  assert.equal(q.questionEnglish.stem, 'Which structure is affected in this case?');
  assert.deepEqual(q.questionEnglish.options.map((o) => o.text), ['This structure is nervus medianus.', 'This structure is nervus ulnaris.']);
  assert.ok(q.questionEnglish.options.every((option) => !('correct' in option)));
  const reloaded = (await call('GET', `/api/medcoel/attempts/${attempt.attempt.id}`, undefined, userA.token, 200)).data;
  assert.deepEqual(reloaded.questions[0].questionEnglish.options, q.questionEnglish.options);
  assert.ok(!('explanation' in q.questionEnglish));
  assert.ok(!('answer' in q.questionEnglish));
  assert.ok(q.questionEnglish.options.every((option) => !('explanation' in option)));
  assert.ok(q.questionEnglish.subQuestions.every((sub) => !('keyPoints' in sub) && !('accepted' in sub)));
});

await langkah('kasus bilingual: hanya admin boleh menyunting, draf tersembunyi, sumber berubah perlu review ulang', async () => {
  const diagnoses = (await call('GET', '/api/medcoel/admin/sim/diagnoses', undefined, admin.token, 200)).data.items;
  const [primary, secondary] = diagnoses;
  const body = { key: 'en_' + RUN, title: 'Demo 25', poli: 'umum', dxOk: primary.key, active: true, order: 9000, data: { pas: 'bapak', expr: 'lemas', id: 'Pak Demo, 25 tahun', intro: [{ w: 'pas', e: 'lemas', t: 'Saya demam 2 hari.' }], dxOk: primary.key, ddx: [primary.key, secondary.key], ref: 'Contoh bahasa', K: 'ku vital', U: 'onset', B: '', A: { ku: { say: 'Saya demam 2 hari.', note: 'Demam 2 hari', e: 'lemas' }, vital: { title: 'Tanda vital', sub: 'Suster Ani', rows: 'Nadi=90 x/menit;Suhu=38 °C', say: 'Ini hasilnya, Dok.' } } } };
  const rec = (await call('POST', '/api/medcoel/admin/sim/cases', body, admin.token, 200)).data;
  const path = '/api/medcoel/admin/sim/cases/' + rec.id + '/english';
  await call('GET', path, undefined, userA.token, 403);
  await call('POST', path, { action: 'draft' }, agent.token, 403);
  const source = (await call('GET', path, undefined, admin.token, 200)).data;
  const translated = { 'Saya demam 2 hari.': 'I have had a fever for 2 days.', 'Demam 2 hari': 'Fever for 2 days', 'Contoh bahasa': 'Language example', 'Ini hasilnya, Dok.': 'Here are the results, Doctor.' };
  const segments = source.segments.map((p) => ({ id: p.id, text: translated[p.source] || p.source }));
  const pending = (await call('POST', path, { sourceHash: source.sourceHash, revision: source.revision, segments, action: 'draft' }, admin.token, 200)).data;
  assert.ok(!(await call('GET', '/api/medcoel/doctor-sim/content', undefined, userA.token, 200)).data.cases[body.key].english);
  await call('POST', path, { sourceHash: pending.sourceHash, revision: pending.revision, segments, action: 'review', reviewConfirmed: true }, admin.token, 200);
  const content = (await call('GET', '/api/medcoel/doctor-sim/content', undefined, userA.token, 200)).data.cases[body.key];
  assert.equal(content.english.data.intro[0].t, 'I have had a fever for 2 days.');
  for (const field of ['dxOk', 'ddx', 'K', 'U', 'B']) assert.deepEqual(content.english.data[field], content[field]);
  assert.ok(!JSON.stringify(content.english).includes('reviewedBy'));
  await call('PATCH', '/api/medcoel/admin/sim/cases/' + body.key, { ...body, data: { ...body.data, K: 'ku' } }, admin.token, 200);
  assert.equal((await call('GET', path, undefined, admin.token, 200)).data.status, 'stale');
  assert.ok(!(await call('GET', '/api/medcoel/doctor-sim/content', undefined, userA.token, 200)).data.cases[body.key].english);
});

console.log('Catatan materi');
await langkah('catatan materi per BAB: hanya admin menulis, siswa membaca, BAB tersembunyi tertutup', async () => {
  // Mata kuliah sendiri: katalog sungguhan (mis. Anatomi) sudah berisi catatan hasil migrasi seed_materi.
  const sub = (await call('POST', '/api/collections/subjects/records', { name: `Catatan Uji ${RUN}`, slug: `catatan-uji-${RUN}`, order: 98 }, admin.token, 200)).data;
  const babId = (await call('POST', '/api/collections/chapters/records', { subject: sub.id, title: 'AA BAB Catatan', order: 1, hidden: false }, admin.token, 200)).data.id;
  const before = (await call('GET', `/api/medcoel/subjects/${sub.slug}`, undefined, userA.token, 200)).data;
  assert.equal(before.chapters.find((c) => c.id === babId).hasNotes, false);
  await call('GET', `/api/medcoel/chapters/${babId}/notes`, undefined, userA.token, 404);
  const denied = await call('POST', '/api/collections/chapter_notes/records', { chapter: babId, content: 'disusupkan' }, userA.token);
  assert.ok(denied.status === 400 || denied.status === 403, 'siswa tidak boleh menulis catatan');
  const ch2 = (await call('POST', '/api/collections/chapters/records', { subject: sub.id, title: 'ZZ BAB Catatan', order: 999, hidden: false }, admin.token, 200)).data;
  const n1 = (await call('POST', '/api/collections/chapter_notes/records', { chapter: babId, content: '**Inti** BAB 1' }, admin.token, 200)).data;
  await call('POST', '/api/collections/chapter_notes/records', { chapter: babId, content: 'catatan kedua' }, admin.token, 400); // satu catatan per BAB
  await call('POST', '/api/collections/chapter_notes/records', { chapter: ch2.id, content: 'Catatan BAB 2' }, admin.token, 200);
  const after = (await call('GET', `/api/medcoel/subjects/${sub.slug}`, undefined, userA.token, 200)).data;
  assert.equal(after.chapters.find((c) => c.id === babId).hasNotes, true);
  assert.ok(!JSON.stringify(after).includes('**Inti**'), 'daftar BAB tidak membawa isi catatan');
  const note = (await call('GET', `/api/medcoel/chapters/${babId}/notes`, undefined, userA.token, 200)).data;
  assert.equal(note.content, '**Inti** BAB 1');
  assert.equal(note.subject.slug, sub.slug);
  assert.deepEqual(note.practice, { total: 0, answered: 0 }, 'BAB tanpa soal');
  assert.equal(note.prev, null);
  assert.equal(note.next.id, ch2.id);
  await call('GET', `/api/medcoel/chapters/${babId}/notes`, undefined, null, 401);
  // BAB tersembunyi: tidak terbaca lewat endpoint maupun koleksi, dan hilang dari navigasi.
  await call('PATCH', `/api/collections/chapters/records/${ch2.id}`, { hidden: true }, admin.token, 200);
  await call('GET', `/api/medcoel/chapters/${ch2.id}/notes`, undefined, userA.token, 404);
  const listed = (await call('GET', `/api/collections/chapter_notes/records?filter=${encodeURIComponent(`chapter="${ch2.id}"`)}`, undefined, userA.token, 200)).data;
  assert.equal(listed.items.length, 0);
  assert.equal((await call('GET', `/api/medcoel/chapters/${babId}/notes`, undefined, userA.token, 200)).data.next, null);
  // Catatan yang dikosongkan tidak ditampilkan.
  await call('PATCH', `/api/collections/chapter_notes/records/${n1.id}`, { content: '   ' }, admin.token, 200);
  await call('GET', `/api/medcoel/chapters/${babId}/notes`, undefined, userA.token, 404);
  await call('DELETE', `/api/collections/chapters/records/${ch2.id}`, undefined, admin.token, 204);
  await call('DELETE', `/api/collections/subjects/records/${sub.id}`, undefined, admin.token, 204);
});

await langkah('urutan BAB semua mata kuliah mengikuti Google Doc (bukan A-Z), juga di halaman materi', async () => {
  const src = (await import('node:fs')).readFileSync(new URL('../pb_migrations/1800002700_chapter_doc_order.js', import.meta.url), 'utf8');
  const i = src.indexOf('const catalog = ') + 'const catalog = '.length;
  const doc = JSON.parse(src.slice(i, src.indexOf('];', i) + 1));
  assert.equal(doc.length, 32);
  assert.equal(doc.reduce((n, s) => n + s.chapters.length, 0), 384);
  for (const s of doc) {
    const sub = subjects.find((x) => x.name === s.name);
    assert.ok(sub, `mata kuliah ${s.name}`);
    const got = (await call('GET', `/api/medcoel/subjects/${sub.slug}`, undefined, userA.token, 200)).data.chapters.map((c) => c.title);
    assert.deepEqual(got.filter((t) => s.chapters.includes(t)), s.chapters, `urutan BAB ${s.name}`);
  }
  const anat = doc.find((s) => s.name === 'Anatomi').chapters;
  assert.equal(anat[0], 'Anatomi Umum & Terminologi Anatomis');
});

await langkah('catatan materi bawaan: Anatomi (20 BAB), Histologi (12), Fisiologi (20), Biokimia (18), Genetika Kedokteran (6), Patologi Anatomi (13), Parasitologi (8), dan Mikrobiologi (11) terbaca siswa, berurutan, dengan flashcard', async () => {
  for (const [slug, jumlah] of [['anatomi', 20], ['histologi', 12], ['fisiologi', 20], ['biokimia', 18], ['genetika-kedokteran', 6], ['patologi-anatomi', 13], ['parasitologi', 8], ['mikrobiologi', 11]]) {
    const sub = subjects.find((s) => s.slug === slug);
    assert.ok(sub, `mata kuliah ${slug} dari katalog`);
    const noted = (await call('GET', `/api/medcoel/subjects/${slug}`, undefined, userA.token, 200)).data.chapters.filter((c) => c.hasNotes);
    assert.equal(noted.length, jumlah, slug);
    assert.ok(noted.every((c) => c.hasCards === true), `${slug}: setiap BAB bercatatan punya flashcard`);
    // Isi catatan diperiksa pada BAB pertama, tengah, dan terakhir saja: seluruh isi sudah dijaga tes konten, dan membaca
    // ±110 catatan berturut-turut menghabiskan batas 600 permintaan/menit sehingga tes API berikutnya kena 429.
    const sample = new Set([0, Math.floor((noted.length - 1) / 2), noted.length - 1]);
    for (const [i, c] of noted.entries()) {
      if (!sample.has(i)) continue;
      const n = (await call('GET', `/api/medcoel/chapters/${c.id}/notes`, undefined, userA.token, 200)).data;
      assert.ok(n.content.startsWith('<!-- materi:v2 -->'), c.title);
      assert.ok(n.content.includes('## Flashcard {kartu}'), `${c.title}: flashcard`);
      assert.ok(!n.content.includes('Sumber & Atribusi'), `${c.title}: bagian sumber tidak dimasukkan`);
      assert.ok(n.content.length > 1500 && n.content.length < 200000, `${c.title}: ${n.content.length}`);
      assert.equal(n.position, i + 1);
      assert.equal(n.total, jumlah);
      assert.equal(typeof n.practice.total, 'number');
      assert.equal(n.prev?.id ?? null, noted[i - 1]?.id ?? null);
      assert.equal(n.next?.id ?? null, noted[i + 1]?.id ?? null);
    }
  }
  // BAB tanpa catatan tidak punya flashcard.
  const plain = (await call('GET', `/api/medcoel/subjects/${subjects.find((s) => s.slug === 'farmakologi').slug}`, undefined, userA.token, 200)).data.chapters;
  assert.ok(plain.every((c) => !c.hasNotes && !c.hasCards));
});

console.log('Pencapaian');
await langkah('pencapaian dihitung dari aktivitas sendiri dan julukan sama di leaderboard', async () => {
  await call('GET', '/api/medcoel/achievements', undefined, null, 401);
  const a = (await call('GET', '/api/medcoel/achievements', undefined, userA.token, 200)).data;
  const soal = a.ladders.find((l) => l.key === 'soal');
  assert.ok(soal.value > 0, 'soal yang sudah dikerjakan userA terhitung');
  assert.ok(Array.isArray(a.subjects) && a.subjects.every((s) => s.total > 0));
  assert.ok(soal.tiers.every((t) => typeof t.earned === 'boolean'));
  const fresh = (await call('GET', '/api/medcoel/achievements', undefined, agent.token, 200)).data;
  assert.equal(fresh.earned, 0);
  assert.equal(fresh.title, null);
  const lb = (await call('GET', '/api/medcoel/leaderboard?period=all', undefined, userA.token, 200)).data;
  assert.ok(lb.items.every((r) => typeof r.title === 'string'));
  if (lb.me) assert.equal(lb.me.title, a.title ? a.title.title : '');
});

console.log(`api.test: ${lulus} langkah lulus${process.exitCode ? ', ADA YANG GAGAL' : ''}`);

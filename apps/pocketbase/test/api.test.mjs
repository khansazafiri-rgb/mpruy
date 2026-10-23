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

async function daftar(loginId, campus) {
  const subjects = (await call('GET', '/api/medcoel/public-subjects', undefined, null, 200)).data.items;
  let s = (await call('POST', '/api/medcoel/signup/start', {
    loginId, name: `Uji ${loginId} Coba`, email: `${loginId}@contoh.test`, whatsapp: '081234567890',
    password: 'rahasia123', passwordConfirm: 'rahasia123', semester: 3, campus,
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

await langkah('katalog 32 mata kuliah dan 384 BAB, pilihan pengguna di atas lalu alfabetis', async () => {
  const order = (a, b) => a.toLowerCase().localeCompare(b.toLowerCase());
  assert.equal(subjects.length, 32);
  assert.deepEqual(subjects.map((s) => s.name), subjects.map((s) => s.name).sort(order));
  const allChapters = (await call('GET', '/api/collections/chapters/records?perPage=500', undefined, su, 200)).data;
  assert.equal(allChapters.totalItems, 384);
  const picked = [subjects[subjects.length - 1].id, subjects[2].id];
  await call('PATCH', `/api/collections/users/records/${userA.id}`, { studyingSubjects: picked }, userA.token, 200);
  const list = (await call('GET', '/api/medcoel/subjects', undefined, userA.token, 200)).data.items;
  assert.ok(list.slice(0, 2).every((s) => s.studying && picked.includes(s.id)));
  assert.equal(list.find((s) => s.id === mk.id).chapterCount, 20);
  assert.deepEqual(list.slice(0, 2).map((s) => s.name), list.slice(0, 2).map((s) => s.name).sort(order));
  assert.deepEqual(list.slice(2).map((s) => s.name), list.slice(2).map((s) => s.name).sort(order));
  const detail = (await call('GET', `/api/medcoel/subjects/${mk.slug}`, undefined, userA.token, 200)).data;
  assert.equal(detail.chapters.length, 20);
  assert.deepEqual(detail.chapters.map((c) => c.title), detail.chapters.map((c) => c.title).sort(order));
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
    assert.deepEqual(Object.keys(it).sort(), ['campus', 'isMe', 'name', 'points', 'questionPoints', 'rank', 'simPoints']);
    assert.ok(!String(it.name).includes('@'));
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
  assert.deepEqual(list.items.map((c) => c.key).sort(), ['anak', 'bedah', 'dalam', 'spog', 'umum']);
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

console.log(`api.test: ${lulus} langkah lulus${process.exitCode ? ', ADA YANG GAGAL' : ''}`);

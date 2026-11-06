// TES API MATERI DRILLING (berkas slide + penjelasan) dan pilihan isi PDF pengajuan (soal / PPT materi).
//
//   MEDCOEL_DEV_MODE=1 ./pocketbase serve --http=127.0.0.1:8090 --dir=/tmp/pb-test --migrationsDir=./pb_migrations --hooksDir=./pb_hooks
//   ./pocketbase superuser upsert dev@medcoel.local devpassword123 --dir=/tmp/pb-test
//   PB_URL=http://127.0.0.1:8090 node test/decks-api.test.mjs
//
// Tes ini MENGISI database dengan data uji; jangan dijalankan ke server produksi.
import assert from 'node:assert/strict';

const B = process.env.PB_URL || 'http://127.0.0.1:8090';
const SU = { identity: process.env.PB_SU_EMAIL || 'dev@medcoel.local', password: process.env.PB_SU_PASSWORD || 'devpassword123' };
const RUN = Date.now().toString(36);
const LH3 = (c) => 'https://lh3.googleusercontent.com/d/' + c.repeat(30);
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');

let lulus = 0;
const langkah = async (nama, fn) => {
  try { await fn(); lulus++; console.log('  ok', nama); } catch (e) { console.error('GAGAL:', nama, '\n', e); process.exitCode = 1; }
};

async function call(method, path, body, token, expect) {
  const headers = {};
  if (token) headers.Authorization = token;
  let payload;
  if (body instanceof FormData) payload = body;
  else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  const r = await fetch(B + path, { method, headers, body: payload });
  const text = await r.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  if (expect !== undefined && r.status !== expect) throw new Error(`${method} ${path} -> ${r.status}, harapannya ${expect}: ${text.slice(0, 500)}`);
  return { status: r.status, data };
}

const su = (await call('POST', '/api/collections/_superusers/auth-with-password', SU, null, 200)).data.token;
async function akun(role, campus) {
  const loginId = `${role}${campus ? 'k' : 'n'}${RUN}${Math.random().toString(36).slice(2, 5)}`;
  const password = 'rahasia-' + RUN;
  await call('POST', '/api/collections/users/records', { loginId, name: `${role} Uji`, email: `${loginId}@contoh.test`, password, passwordConfirm: password, role, verified: true, ...(campus ? { campus } : {}) }, su, 200);
  const a = (await call('POST', '/api/collections/users/auth-with-password', { identity: loginId, password }, null, 200)).data;
  return { token: a.token, id: a.record.id };
}
async function upload(subId, token, name = 'ppt.pdf') {
  const i = (await call('POST', '/api/medcoel/upload/init', { kind: 'submission_pdf', name, size: PDF.length, mime: 'application/pdf', submission: subId }, token, 200)).data;
  const fd = new FormData();
  fd.append('fileId', i.fileId); fd.append('uploadKey', i.uploadKey);
  fd.append('file', new Blob([PDF], { type: 'application/pdf' }), name);
  await call('POST', '/api/medcoel/upload/local', fd, token, 200);
}

const campuses = (await call('GET', '/api/collections/campuses/records?perPage=5&sort=order', undefined, null, 200)).data.items;
const [kampusA, kampusB] = campuses;
const subjects = (await call('GET', '/api/medcoel/public-subjects', undefined, null, 200)).data.items;
const mk = subjects[6];
const admin = await akun('admin');
const agent = await akun('agent');
const userA = await akun('user', kampusA.id);
const userB = await akun('user', kampusB.id);
const userC = await akun('user');
const setting = (await call('GET', '/api/collections/app_settings/records?perPage=1', undefined, admin.token, 200)).data.items[0];
const drilling = (on) => call('PATCH', `/api/collections/app_settings/records/${setting.id}`, { drillingEnabled: on }, admin.token, 200);
await drilling(false);

const deck = (judul, extra = {}) => ({
  title: judul + ' ' + RUN,
  slides: [
    { image: LH3('A'), explanation: '## Pengantar\nTulang panjang punya **diafisis**.\n\n1. Satu\n\t- anak a\n\t- anak b\n2. Dua' },
    { image: LH3('B'), blocks: [{ type: 'callout', kind: 'klinis', title: 'Klinis', text: 'Fraktur 🦴' }] },
  ],
  ...extra,
});

console.log('Materi Drilling');
await langkah('materi tidak membuka menu selama sakelar mati; hanya admin yang bisa mengimpor', async () => {
  await call('POST', '/api/medcoel/admin/drilling/decks', { subject: mk.id, slides: deck('X').slides }, userA.token, 403);
  await call('POST', '/api/medcoel/agent/materi-import', { subject: mk.id, deck: deck('X') }, userA.token, 403);
  await call('GET', '/api/medcoel/admin/drilling/decks', undefined, userA.token, 403);
});

await langkah('admin: dry-run memeriksa tanpa menyimpan; galat jelas per slide; gambar bukan lh3 ditolak', async () => {
  const dry = (await call('POST', '/api/medcoel/admin/drilling/decks', { subject: mk.id, deck: deck('Osteologi'), dryRun: true }, admin.token, 200)).data;
  assert.equal(dry.slideCount, 2);
  assert.equal(dry.created, 1);
  assert.equal((await call('GET', `/api/medcoel/admin/drilling/decks?subject=${mk.id}`, undefined, admin.token, 200)).data.items.length, 0);
  const bad = (await call('POST', '/api/medcoel/admin/drilling/decks', { subject: mk.id, deck: { slides: [{ image: 'https://evil.example/x.png', explanation: 'x' }, {}] } }, admin.token, 400)).data;
  assert.equal(bad.blocked, true);
  assert.equal(bad.items.length, 2);
  assert.match(bad.items[0].errors[0], /lh3/);
  assert.match(bad.message, /Slide 1: .*lh3/, 'respons 400 membawa kalimat galat yang bisa langsung ditampilkan');
  await call('POST', '/api/medcoel/admin/drilling/decks', { subject: mk.id, scope: 'campus', campuses: [], deck: deck('Tanpa kampus') }, admin.token, 400);
});

let general; let khusus;
await langkah('impor General dan khusus kampus; impor ulang judul yang sama memperbarui, tidak menggandakan', async () => {
  general = (await call('POST', '/api/medcoel/admin/drilling/decks', { subject: mk.id, deck: deck('Osteologi') }, admin.token, 200)).data;
  assert.equal(general.created, 1);
  const again = (await call('POST', '/api/medcoel/admin/drilling/decks', { subject: mk.id, deck: deck('Osteologi') }, admin.token, 200)).data;
  assert.equal(again.updated, 1);
  assert.equal(again.id, general.id);
  khusus = (await call('POST', '/api/medcoel/admin/drilling/decks', { subject: mk.id, scope: 'campus', campuses: [kampusA.id], deck: deck('Khusus A') }, admin.token, 200)).data;
  const list = (await call('GET', `/api/medcoel/admin/drilling/decks?subject=${mk.id}`, undefined, admin.token, 200)).data.items;
  assert.equal(list.length, 2);
  const k = list.find((x) => x.id === khusus.id);
  assert.deepEqual(k.campuses.map((c) => c.id), [kampusA.id]);
  assert.equal(k.slideCount, 2);
});

await langkah('Kampusmu: hanya milik kampus pengguna. A melihat satu (khusus A), B dan tanpa kampus tidak melihat menunya; admin melihat semua', async () => {
  const me = async (u) => (await call('GET', '/api/medcoel/me', undefined, u.token, 200)).data.drillingAvailable;
  for (const u of [userA, userB, userC]) assert.equal(await me(u), false);
  await drilling(true);
  assert.equal(await me(userA), true); // materi khusus kampus A (tanpa satu pun soal) sudah cukup
  assert.equal(await me(userB), false); // General tidak dihitung
  assert.equal(await me(userC), false);
  assert.equal(await me(admin), true);
  const lihat = async (u, status = 200) => (await call('GET', `/api/medcoel/drilling/subject/${mk.slug}`, undefined, u.token, status)).data;
  assert.deepEqual((await lihat(userA)).decks.map((d) => d.title), ['Khusus A ' + RUN]);
  await lihat(userB, 404);
  await lihat(userC, 404);
  assert.deepEqual((await lihat(admin)).decks.map((d) => d.title).sort(), ['Khusus A ' + RUN, 'Osteologi ' + RUN]);
  const hub = (await call('GET', '/api/medcoel/drilling', undefined, userA.token, 200)).data;
  const row = hub.subjects.find((s) => s.id === mk.id);
  assert.equal(row.deckCount, 1);
  assert.equal(row.slideCount, 2);
  assert.equal(row.campusDeckCount, 1);
  assert.equal(row.questionCount, 0);
  assert.equal((await call('GET', '/api/medcoel/drilling', undefined, userB.token, 200)).data.subjects.length, 0);
  const rowAdmin = (await call('GET', '/api/medcoel/drilling', undefined, admin.token, 200)).data.subjects.find((s) => s.id === mk.id);
  assert.equal(rowAdmin.deckCount, 2);
  assert.equal(rowAdmin.campusDeckCount, 1);
});

await langkah('berkas lengkap: blok bersarang tersimpan; kampus lain mendapat 404', async () => {
  const d = (await call('GET', `/api/medcoel/drilling/deck/${khusus.id}`, undefined, userA.token, 200)).data;
  assert.equal(d.slides.length, 2);
  const list = d.slides[0].blocks.find((b) => b.type === 'list');
  assert.equal(list.style, 'number');
  assert.equal(list.items[0].children[0].items.length, 2);
  assert.equal(d.slides[1].blocks[0].kind, 'klinis');
  assert.equal(d.subjectSlug, mk.slug);
  await call('GET', `/api/medcoel/drilling/deck/${khusus.id}`, undefined, userB.token, 404);
  await call('GET', `/api/medcoel/drilling/deck/${khusus.id}`, undefined, userC.token, 404);
  await call('GET', `/api/medcoel/drilling/deck/${general.id}`, undefined, null, 401);
});

await langkah('draf tidak terlihat pengguna; admin bisa mengubah status, kampus, dan menghapus', async () => {
  await call('POST', `/api/medcoel/admin/drilling/decks/${general.id}`, { status: 'draft' }, admin.token, 200);
  // Satu-satunya materi yang terlihat B adalah draf ini, jadi menu Drilling tertutup untuknya.
  await call('GET', `/api/medcoel/drilling/subject/${mk.slug}`, undefined, userB.token, 404);
  await call('GET', `/api/medcoel/drilling/deck/${general.id}`, undefined, userB.token, 404);
  assert.equal((await call('GET', `/api/medcoel/admin/drilling/decks/${general.id}`, undefined, admin.token, 200)).data.slides.length, 2);
  await call('POST', `/api/medcoel/admin/drilling/decks/${general.id}`, { status: 'published', scope: 'campus', campuses: [kampusB.id] }, admin.token, 200);
  assert.deepEqual((await call('GET', `/api/medcoel/drilling/subject/${mk.slug}`, undefined, userB.token, 200)).data.decks.map((d) => d.title), ['Osteologi ' + RUN]);
  // Tanpa kampus dan tanpa materi General, menu Drilling tertutup untuknya (sama seperti soal).
  await call('GET', `/api/medcoel/drilling/subject/${mk.slug}`, undefined, userC.token, 404);
  assert.equal((await call('GET', '/api/medcoel/me', undefined, userC.token, 200)).data.drillingAvailable, false);
  await call('POST', `/api/medcoel/admin/drilling/decks/${general.id}/delete`, {}, userA.token, 403);
  await call('POST', `/api/medcoel/admin/drilling/decks/${general.id}/delete`, {}, admin.token, 200);
  await call('GET', `/api/medcoel/admin/drilling/decks/${general.id}`, undefined, admin.token, 404);
});

console.log('Pengajuan PPT materi');
let sub; let soalSub;
await langkah('pengaju memilih isi PDF: PPT materi tanpa kunci/bahasa; bawaan tetap soal', async () => {
  soalSub = (await call('POST', '/api/medcoel/submissions', { subject: mk.id, hasKey: true, language: 'id', scope: 'all', pdfCount: 1 }, userC.token, 200)).data;
  assert.equal(soalSub.contentKind, 'soal');
  sub = (await call('POST', '/api/medcoel/submissions', { subject: mk.id, contentKind: 'materi', scope: 'campus', pdfCount: 1 }, userA.token, 200)).data;
  assert.equal(sub.contentKind, 'materi');
  assert.equal(sub.hasKey, false);
  await upload(sub.id, userA.token, 'Kuliah_Pengajuan.pdf');
  const sent = (await call('POST', `/api/medcoel/submissions/${sub.id}/send`, { agreement: true }, userA.token, 200)).data;
  assert.equal(sent.contentKind, 'materi');
  await call('POST', `/api/medcoel/admin/submissions/${sub.id}/status`, { status: 'antre' }, admin.token, 200);
});

await langkah('Hermes melihat jenis isi (contentKind, kindLabel) di antrean dan detail', async () => {
  const list = (await call('GET', '/api/medcoel/agent/submissions?status=antre', undefined, agent.token, 200)).data.items;
  const mine = list.find((x) => x.id === sub.id);
  assert.equal(mine.contentKind, 'materi');
  assert.equal(mine.kindLabel, 'PPT materi');
  assert.equal((await call('GET', `/api/medcoel/agent/submissions/${sub.code}`, undefined, agent.token, 200)).data.contentKind, 'materi');
});

await langkah('pengajuan materi tidak bisa diimpor sebagai soal, dan sebaliknya', async () => {
  const r = await call('POST', `/api/medcoel/agent/submissions/${sub.id}/import`, { questions: [{ type: 'A', text: 'x?', options: ['a', { text: 'b', correct: true }] }] }, agent.token, 400);
  assert.match(r.data.message, /PPT materi/);
  const dr = await call('POST', `/api/medcoel/agent/submissions/${sub.id}/drilling-import`, { questions: [] }, agent.token, 400);
  assert.match(dr.data.message, /PPT materi/);
  // Pengajuan soal biasa tidak bisa diimpor sebagai materi.
  await upload(soalSub.id, userC.token);
  await call('POST', `/api/medcoel/submissions/${soalSub.id}/send`, { agreement: true }, userC.token, 200);
  await call('POST', `/api/medcoel/admin/submissions/${soalSub.id}/status`, { status: 'antre' }, admin.token, 200);
  const sm = await call('POST', `/api/medcoel/agent/submissions/${soalSub.id}/materi-import`, { deck: deck('Salah jalur') }, agent.token, 400);
  assert.match(sm.data.message, /berisi soal/);
});

await langkah('impor materi lewat pengajuan: dry-run, galat, lalu tayang khusus kampus pengaju dan pengajuan selesai', async () => {
  await call('POST', `/api/medcoel/agent/submissions/${sub.id}/materi-import`, { deck: deck('PPT Pengajuan') }, userA.token, 403);
  const dry = (await call('POST', `/api/medcoel/agent/submissions/${sub.id}/materi-import`, { deck: deck('PPT Pengajuan'), dryRun: true }, agent.token, 200)).data;
  assert.equal(dry.slideCount, 2);
  assert.equal((await call('GET', '/api/medcoel/submissions/mine', undefined, userA.token, 200)).data.items.find((x) => x.id === sub.id).status, 'antre');
  const bad = (await call('POST', `/api/medcoel/agent/submissions/${sub.id}/materi-import`, { slides: [{ image: 'https://x.test/a.png', explanation: 'x' }] }, agent.token, 400)).data;
  assert.equal(bad.blocked, true);
  const ok = (await call('POST', `/api/medcoel/agent/submissions/${sub.id}/materi-import`, { text: JSON.stringify(deck('PPT Pengajuan')) }, agent.token, 200)).data;
  assert.equal(ok.created, 1);
  assert.equal(ok.scope, 'campus');
  const mine = (await call('GET', '/api/medcoel/submissions/mine', undefined, userA.token, 200)).data.items.find((x) => x.id === sub.id);
  assert.equal(mine.status, 'selesai');
  assert.equal(mine.importedCount, 2);
  const titles = async (u) => { const r = await call('GET', `/api/medcoel/drilling/subject/${mk.slug}`, undefined, u.token); return r.status === 200 ? r.data.decks.map((d) => d.title) : []; };
  assert.ok((await titles(userA)).includes('Kuliah Pengajuan'));
  assert.ok(!(await titles(userB)).includes('Kuliah Pengajuan'));
  const notif = (await call('GET', '/api/collections/notifications/records?perPage=50&sort=-created', undefined, userA.token, 200)).data.items;
  assert.ok(notif.some((n) => n.title.includes('Materi dari pengajuan') && n.link === `/drilling/${mk.slug}`), 'pengaju diberi tahu bahwa materinya tayang');
  await call('POST', `/api/medcoel/agent/submissions/${sub.id}/materi-import`, { deck: deck('Lagi') }, agent.token, 400);
});

await langkah('materi tambahan dari agen tanpa pengajuan (General)', async () => {
  const r = (await call('POST', '/api/medcoel/agent/materi-import', { subject: mk.slug, deck: deck('Agen Umum') }, agent.token, 200)).data;
  assert.equal(r.created, 1);
  // General: tidak tampil di Kampusmu (A hanya melihat milik kampusnya, C tanpa kampus tidak punya menu), tetapi admin melihatnya.
  await call('GET', `/api/medcoel/drilling/subject/${mk.slug}`, undefined, userC.token, 404);
  assert.ok(!(await call('GET', `/api/medcoel/drilling/subject/${mk.slug}`, undefined, userA.token, 200)).data.decks.some((d) => d.title === 'Agen Umum ' + RUN));
  assert.ok((await call('GET', `/api/medcoel/drilling/subject/${mk.slug}`, undefined, admin.token, 200)).data.decks.some((d) => d.title === 'Agen Umum ' + RUN));
  // Sama dengan campus: materi agen khusus kampus A tampil bagi A, tidak bagi B.
  const k = (await call('POST', '/api/medcoel/agent/materi-import', { subject: mk.slug, deck: deck('Agen Kampus A'), scope: 'campus', campuses: [kampusA.id] }, agent.token, 200)).data;
  assert.equal(k.created, 1);
  assert.ok((await call('GET', `/api/medcoel/drilling/subject/${mk.slug}`, undefined, userA.token, 200)).data.decks.some((d) => d.title === 'Agen Kampus A ' + RUN));
  await call('GET', `/api/medcoel/drilling/subject/${mk.slug}`, undefined, userB.token, 404);
});

await langkah('ringkasan admin Drilling memuat jumlah materi per mata kuliah', async () => {
  const s = (await call('GET', '/api/medcoel/admin/drilling', undefined, admin.token, 200)).data;
  const row = s.subjects.find((x) => x.id === mk.id);
  assert.ok(row.deckPublished >= 3);
  assert.ok(row.deckSlides >= 6);
  assert.ok(s.deckPublished >= row.deckPublished);
});

await drilling(false);
console.log('Judul dari PDF');
const kirim = async (user, { kind = 'materi', scope = 'all', names }) => {
  const sub = (await call('POST', '/api/medcoel/submissions', { subject: mk.id, contentKind: kind, hasKey: false, language: 'id', scope, pdfCount: names.length }, user.token, 200)).data;
  for (const n of names) await upload(sub.id, user.token, n);
  await call('POST', `/api/medcoel/submissions/${sub.id}/send`, { agreement: true }, user.token, 200);
  await call('POST', `/api/medcoel/admin/submissions/${sub.id}/status`, { status: 'antre' }, admin.token, 200);
  return (await call('GET', `/api/medcoel/agent/submissions/${sub.id}`, undefined, agent.token, 200)).data;
};
await drilling(true);

await langkah('satu PDF: judul materi otomatis dari nama PDF, mengalahkan judul di JSON; kontrak memuat n dan title', async () => {
  const sub = await kirim(userA, { scope: 'campus', names: ['Histologi_Epitel Kuliah1.pptx.pdf'] });
  assert.deepEqual(sub.files.map((f) => [f.n, f.title]), [[1, 'Histologi Epitel Kuliah1']]);
  const r = (await call('POST', `/api/medcoel/agent/submissions/${sub.id}/materi-import`, { deck: deck('Judul dari JSON') }, agent.token, 200)).data;
  assert.equal(r.title, 'Histologi Epitel Kuliah1');
  assert.equal(r.titleSource, 'pdf');
  const list = (await call('GET', `/api/medcoel/drilling/subject/${mk.slug}`, undefined, userA.token, 200)).data.decks.map((d) => d.title);
  assert.ok(list.includes('Histologi Epitel Kuliah1'));
  assert.ok(!list.includes('Judul dari JSON ' + RUN));
});

await langkah('beberapa PDF: tanpa nomor dan JSON tanpa judul diminta nomor PDF; dengan nomor memakai judul PDF itu', async () => {
  const sub = await kirim(userA, { names: ['Bab 1 Pengantar.pdf', 'Bab 2 Jaringan Epitel.pdf', 'Bab 3 Jaringan Ikat.pdf'] });
  assert.deepEqual(sub.files.map((f) => f.title), ['Bab 1 Pengantar', 'Bab 2 Jaringan Epitel', 'Bab 3 Jaringan Ikat']);
  const tanpaJudul = { slides: deck('x').slides };
  const gagal = await call('POST', `/api/medcoel/agent/submissions/${sub.id}/materi-import`, { deck: tanpaJudul }, agent.token, 400);
  assert.match(gagal.data.message, /punya 3 PDF/);
  assert.match(gagal.data.message, new RegExp('/put ' + sub.code));
  await call('POST', `/api/medcoel/agent/submissions/${sub.id}/materi-import`, { deck: tanpaJudul, pdf: 4, dryRun: true }, agent.token, 400);
  const dry = (await call('POST', `/api/medcoel/agent/submissions/${sub.id}/materi-import`, { deck: tanpaJudul, pdf: 2, dryRun: true }, agent.token, 200)).data;
  assert.equal(dry.title, 'Bab 2 Jaringan Epitel');
  assert.equal(dry.pdf, 2);
  // JSON yang sudah punya judul tetap diterima tanpa nomor (judul JSON dipakai).
  const ok = (await call('POST', `/api/medcoel/agent/submissions/${sub.id}/materi-import`, { deck: deck('Judul di JSON') }, agent.token, 200)).data;
  assert.equal(ok.titleSource, 'json');
});

await langkah('soal Drilling dikelompokkan per bagian bernama judul PDF; latihan per bagian atau semua', async () => {
  const soal = (n, t) => Array.from({ length: n }, (_, i) => ({ type: 'A', difficulty: 'easy', text: `${t} no ${i + 1} ${RUN}?`, options: [{ text: 'Benar', correct: true }, 'Salah'] }));
  const a = await kirim(userB, { kind: 'soal', scope: 'campus', names: ['UTS Histologi 2025.pdf'] });
  const ra = (await call('POST', `/api/medcoel/agent/submissions/${a.id}/drilling-import`, { questions: soal(3, 'UTS') }, agent.token, 200)).data;
  assert.equal(ra.setTitle, 'UTS Histologi 2025');
  const b = await kirim(userB, { kind: 'soal', scope: 'campus', names: ['UAS A.pdf', 'UAS B.pdf'] });
  const rb = (await call('POST', `/api/medcoel/agent/submissions/${b.id}/drilling-import`, { questions: soal(2, 'UAS-B'), pdf: 2 }, agent.token, 200)).data;
  assert.equal(rb.setTitle, 'UAS B');
  const c = await kirim(userB, { kind: 'soal', scope: 'campus', names: ['C1.pdf', 'C2.pdf'] });
  const rc = (await call('POST', `/api/medcoel/agent/submissions/${c.id}/drilling-import`, { questions: soal(1, 'Tanpa-nomor'), dryRun: true }, agent.token, 200)).data;
  assert.equal(rc.setTitle, '');
  assert.match(rc.titleNote, /punya 2 PDF/);
  const hub = (await call('GET', `/api/medcoel/drilling/subject/${mk.slug}`, undefined, userB.token, 200)).data;
  assert.equal(hub.questionCount, 5);
  assert.deepEqual(hub.sets.map((s) => [s.title, s.questionCount]), [['UAS B', 2], ['UTS Histologi 2025', 3]]);
  const bagian = (await call('POST', '/api/medcoel/attempts/drilling', { subject: mk.id, set: 'UTS Histologi 2025', count: 'all' }, userB.token, 200)).data;
  assert.equal(bagian.questions.length, 3);
  assert.match(bagian.attempt.title, /UTS Histologi 2025/);
  const semua = (await call('POST', '/api/medcoel/attempts/drilling', { subject: mk.id, count: 'all' }, userB.token, 200)).data;
  assert.equal(semua.questions.length, 5);
  await call('POST', '/api/medcoel/attempts/drilling', { subject: mk.id, set: 'Tidak ada' }, userB.token, 400);
  // Impor admin (bukan pengajuan) memberi judul bagian lewat `title`.
  const adm = (await call('POST', '/api/medcoel/agent/import', { subject: mk.slug, drilling: true, title: 'Latihan Tambahan', scope: 'campus', campuses: [kampusB.id], questions: soal(1, 'Tambahan') }, agent.token, 200)).data;
  assert.equal(adm.created, 1);
  const hub2 = (await call('GET', `/api/medcoel/drilling/subject/${mk.slug}`, undefined, userB.token, 200)).data;
  assert.ok(hub2.sets.some((s) => s.title === 'Latihan Tambahan' && s.questionCount === 1));
});


await langkah('Kampusmu memuat kiriman teman sekampus walau pengaju memilih General; kampus lain dan akun tanpa kampus tidak melihatnya', async () => {
  const m = await kirim(userB, { kind: 'materi', scope: 'all', names: ['Materi Umum Kiriman B.pdf'] });
  const rm = (await call('POST', `/api/medcoel/agent/submissions/${m.id}/materi-import`, { deck: deck('Isi Umum B') }, agent.token, 200)).data;
  assert.equal(rm.scope, 'all'); // cakupan tetap General
  const soal = (await call('POST', `/api/medcoel/agent/submissions/${(await kirim(userB, { kind: 'soal', scope: 'all', names: ['Soal Umum Kiriman B.pdf'] })).id}/drilling-import`, { questions: [{ type: 'A', difficulty: 'easy', text: `Soal umum B ${RUN}?`, options: [{ text: 'Benar', correct: true }, 'Salah'] }] }, agent.token, 200)).data;
  assert.equal(soal.created, 1);
  const lihat = async (u, status = 200) => (await call('GET', `/api/medcoel/drilling/subject/${mk.slug}`, undefined, u.token, status)).data;
  const b = await lihat(userB);
  assert.ok(b.decks.some((d) => d.title === 'Materi Umum Kiriman B'), 'pengaju melihat materinya sendiri');
  assert.ok(b.sets.some((x) => x.title === 'Soal Umum Kiriman B'), 'dan soalnya');
  const deckId = b.decks.find((d) => d.title === 'Materi Umum Kiriman B').id;
  assert.equal((await call('GET', `/api/medcoel/drilling/deck/${deckId}`, undefined, userB.token, 200)).data.title, 'Materi Umum Kiriman B');
  assert.equal((await call('GET', '/api/medcoel/me', undefined, userB.token, 200)).data.drillingAvailable, true);
  // Kampus lain (A) dan akun tanpa kampus tidak melihatnya.
  const a = await lihat(userA);
  assert.ok(!a.decks.some((d) => d.title === 'Materi Umum Kiriman B'));
  assert.ok(!a.sets.some((x) => x.title === 'Soal Umum Kiriman B'));
  await call('GET', `/api/medcoel/drilling/deck/${deckId}`, undefined, userA.token, 404);
  await call('GET', `/api/medcoel/drilling/deck/${deckId}`, undefined, userC.token, 404);
  await lihat(userC, 404);
});

console.log('Alihkan tujuan pengajuan (Hermes: /jenis, /matkul, /pindah)');
const alt = subjects.filter((x) => x.id !== mk.id);
const retarget = (id, body, token = agent.token, expect = 200) => call('POST', `/api/medcoel/agent/submissions/${id}/retarget`, body, token, expect);
const agentGet = async (id) => (await call('GET', `/api/medcoel/agent/submissions/${id}`, undefined, agent.token, 200)).data;

await langkah('hanya jenis isi: soal -> materi, mata kuliah tetap; jalur impor ikut berpindah', async () => {
  const s = await kirim(userC, { kind: 'soal', names: ['Ini sebenarnya PPT.pdf'] });
  assert.equal(s.contentKind, 'soal');
  const r = (await retarget(s.code, { contentKind: 'materi' })).data;
  assert.equal(r.contentKind, 'materi');
  assert.equal(r.kindLabel, 'PPT materi');
  assert.equal(r.subject.id, mk.id);
  assert.deepEqual(r.retarget.contentKind, { from: 'soal', to: 'materi' });
  assert.equal(r.retarget.subject.from.id, r.retarget.subject.to.id);
  assert.equal(r.retarget.changed, true);
  assert.equal(r.status, 'antre');
  assert.equal(r.restriction, 'all');
  assert.equal((await agentGet(s.id)).contentKind, 'materi');
  const salah = await call('POST', `/api/medcoel/agent/submissions/${s.id}/import`, { questions: [] }, agent.token, 400);
  assert.match(salah.data.message, /PPT materi/);
  const dry = (await call('POST', `/api/medcoel/agent/submissions/${s.id}/materi-import`, { deck: deck('Setelah diubah'), dryRun: true }, agent.token, 200)).data;
  assert.equal(dry.slideCount, 2);
  const mine = (await call('GET', '/api/medcoel/submissions/mine', undefined, userC.token, 200)).data.items.find((x) => x.id === s.id);
  assert.equal(mine.contentKind, 'materi');
  assert.equal(mine.hasKey, false);
});

await langkah('hanya mata kuliah: nama lengkap, slug, dan huruf besar-kecil; jenis isi tetap', async () => {
  const s = await kirim(userC, { kind: 'materi', names: ['Matkul keliru.pdf'] });
  const a = (await retarget(s.id, { subject: alt[0].name.toUpperCase() })).data;
  assert.equal(a.subject.id, alt[0].id);
  assert.equal(a.contentKind, 'materi');
  assert.deepEqual(a.retarget.contentKind, { from: 'materi', to: 'materi' });
  assert.equal(a.retarget.subject.from.id, mk.id);
  const b = (await retarget(s.code, { subject: alt[1].slug })).data;
  assert.equal(b.subject.id, alt[1].id);
  assert.equal(b.subject.name, alt[1].name);
  assert.equal((await agentGet(s.id)).subject.id, alt[1].id);
  const mine = (await call('GET', '/api/medcoel/submissions/mine', undefined, userC.token, 200)).data.items.find((x) => x.id === s.id);
  assert.equal(mine.subject, alt[1].id);
  assert.equal(mine.subjectName, alt[1].name);
});

await langkah('jenis isi dan mata kuliah sekaligus; kampus, cakupan, bahasa, berkas tidak berubah', async () => {
  const s = await kirim(userA, { kind: 'materi', scope: 'campus', names: ['A.pdf', 'B.pdf'] });
  const r = (await retarget(s.id, { contentKind: 'soal', subject: alt[2].name })).data;
  assert.equal(r.contentKind, 'soal');
  assert.equal(r.subject.id, alt[2].id);
  assert.equal(r.restriction, 'campus');
  assert.equal(r.campus.id, kampusA.id);
  assert.equal(r.language, s.language);
  assert.equal(r.pdfCount, 2);
  assert.deepEqual(r.files.map((f) => f.title), ['A', 'B']);
  assert.equal(r.status, 'antre');
  assert.equal(r.retarget.changed, true);
  // Dan kembali lagi (salah ubah).
  const back = (await retarget(s.id, { contentKind: 'materi', subject: mk.id })).data;
  assert.equal(back.contentKind, 'materi');
  assert.equal(back.subject.id, mk.id);
});

await langkah('tanpa perubahan nyata: changed=false dan data tetap', async () => {
  const s = await kirim(userC, { kind: 'soal', names: ['Sama.pdf'] });
  const r = (await retarget(s.id, { contentKind: 'soal', subject: mk.slug })).data;
  assert.equal(r.retarget.changed, false);
  assert.equal(r.contentKind, 'soal');
  assert.equal(r.subject.id, mk.id);
});

await langkah('masukan salah ditolak dengan pesan yang jelas', async () => {
  const s = await kirim(userC, { kind: 'soal', names: ['Salah.pdf'] });
  assert.match((await retarget(s.id, {}, agent.token, 400)).data.message, /jenis isi baru .* dan\/atau mata kuliah/);
  assert.match((await retarget(s.id, { contentKind: 'drilling' }, agent.token, 400)).data.message, /'soal' atau 'materi'/);
  assert.match((await retarget(s.id, { subject: 'Mata Kuliah Tidak Ada 12345' }, agent.token, 400)).data.message, /tidak ditemukan.*\/matkul/);
  // Nama sebagian yang cocok ke beberapa mata kuliah ditolak dan menyebut kandidatnya.
  const first = new Map();
  for (const x of subjects) { const w = x.name.split(' ')[0].toLowerCase(); first.set(w, [...(first.get(w) || []), x.name]); }
  const kata = [...first.entries()].find(([, names]) => names.length >= 2);
  if (kata) {
    const amb = (await retarget(s.id, { subject: kata[0] }, agent.token, 400)).data;
    assert.match(amb.message, /cocok dengan beberapa mata kuliah/);
    assert.ok(kata[1].slice(0, 2).every((n) => amb.message.includes(n)));
  }
  // Setelah semua penolakan, pengajuan tidak berubah.
  const now = await agentGet(s.id);
  assert.equal(now.contentKind, 'soal');
  assert.equal(now.subject.id, mk.id);
});

await langkah('hanya agen/admin; pengajuan draf dan kode asing tidak ditemukan', async () => {
  const s = await kirim(userC, { kind: 'soal', names: ['Izin.pdf'] });
  await retarget(s.id, { contentKind: 'materi' }, userC.token, 403);
  await retarget(s.id, { contentKind: 'materi' }, userB.token, 403);
  assert.equal((await agentGet(s.id)).contentKind, 'soal');
  await retarget('MC000000-ZZZZ', { contentKind: 'materi' }, agent.token, 404);
  const draf = (await call('POST', '/api/medcoel/submissions', { subject: mk.id, hasKey: false, language: 'id', scope: 'all', pdfCount: 1 }, userB.token, 200)).data;
  assert.equal(draf.status, 'draft');
  await retarget(draf.id, { contentKind: 'materi' }, agent.token, 404);
});

await langkah('boleh saat Menunggu konfirmasi, Diproses, dan Perlu perbaikan; ditolak setelah dibatalkan', async () => {
  const w = (await call('POST', '/api/medcoel/submissions', { subject: mk.id, hasKey: false, language: 'id', scope: 'all', pdfCount: 1 }, userB.token, 200)).data;
  await upload(w.id, userB.token, 'Menunggu.pdf');
  await call('POST', `/api/medcoel/submissions/${w.id}/send`, { agreement: true }, userB.token, 200);
  const r1 = (await retarget(w.id, { contentKind: 'materi' })).data;
  assert.equal(r1.status, 'menunggu_konfirmasi');
  assert.equal(r1.contentKind, 'materi');
  await call('POST', `/api/medcoel/admin/submissions/${w.id}/status`, { status: 'antre' }, admin.token, 200);
  await call('POST', `/api/medcoel/agent/submissions/${w.id}/status`, { status: 'diproses' }, agent.token, 200);
  const r2 = (await retarget(w.id, { contentKind: 'soal' })).data;
  assert.equal(r2.status, 'diproses');
  assert.equal(r2.contentKind, 'soal');
  await call('POST', `/api/medcoel/agent/submissions/${w.id}/status`, { status: 'perlu_perbaikan', note: 'PDF kurang jelas' }, agent.token, 200);
  const r3 = (await retarget(w.id, { subject: alt[0].slug })).data;
  assert.equal(r3.status, 'perlu_perbaikan');
  assert.equal(r3.subject.id, alt[0].id);
  await call('POST', `/api/medcoel/admin/submissions/${w.id}/status`, { status: 'dibatalkan', note: 'Dibatalkan admin.' }, admin.token, 200);
  const tolak = await retarget(w.id, { contentKind: 'materi' }, agent.token, 400);
  assert.match(tolak.data.message, /Dibatalkan tidak bisa dialihkan/);
  assert.equal((await agentGet(w.id)).contentKind, 'soal');
});

await langkah('pengajuan yang sudah Selesai (sudah diimpor) tidak bisa dialihkan', async () => {
  const s = await kirim(userC, { kind: 'soal', names: ['Selesai.pdf'] });
  await call('POST', `/api/medcoel/agent/submissions/${s.id}/drilling-import`, { questions: [{ type: 'A', text: 'Soal alih ' + RUN + '?', options: ['a', { text: 'b', correct: true }] }] }, agent.token, 200);
  assert.equal((await agentGet(s.id)).status, 'selesai');
  const tolak = await retarget(s.id, { contentKind: 'materi' }, agent.token, 400);
  assert.match(tolak.data.message, /Selesai tidak bisa dialihkan/);
  assert.equal((await agentGet(s.id)).contentKind, 'soal');
});

await drilling(false);
console.log(`decks-api.test: ${lulus} langkah lulus${process.exitCode ? ', ADA YANG GAGAL' : ''}`);

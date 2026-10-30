// TES PROGRAM STUDI + KAMPUS (pendaftaran, hak lihat soal per prodi, admin).
//
// Cara pakai (server dev kosong dengan MEDCOEL_DEV_MODE=1, di apps/pocketbase):
//   PB_URL=http://127.0.0.1:8090 PB_SU_EMAIL=dev@medcoel.local PB_SU_PASSWORD=devpassword123 npm run test:program-campus
// Tes ini MENGISI database dengan data uji. Jangan dijalankan ke server produksi.

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

async function daftar(loginId, campus, over = {}, expectStart = 200) {
  const subjects = (await call('GET', '/api/medcoel/public-subjects', undefined, null, 200)).data.items;
  let s = (await call('POST', '/api/medcoel/signup/start', {
    loginId, name: `Uji ${loginId} Coba`, email: `${loginId}@contoh.test`, whatsapp: '081234567890',
    password: 'rahasia123', passwordConfirm: 'rahasia123', semester: 3, campus, ...over,
  }, null, expectStart));
  if (expectStart !== 200) return s;
  s = s.data;
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

// Tes ini mendaftarkan belasan akun; batas pendaftaran produksi (10 per jam per IP) dimatikan
// sementara, hanya untuk server lokal, lalu dikembalikan di akhir.
const lokal = /^https?:\/\/(127\.0\.0\.1|localhost)(:|\/|$)/.test(B);
assert.ok(lokal, 'tes ini hanya boleh dijalankan ke server lokal');
const rateBefore = (await call('GET', '/api/settings', undefined, su, 200)).data.rateLimits;
await call('PATCH', '/api/settings', { rateLimits: { ...rateBefore, enabled: false } }, su, 200);

async function akunAdmin() {
  const loginId = `admin${RUN}`;
  const password = 'rahasia-' + RUN;
  await call('POST', '/api/collections/users/records', {
    loginId, name: 'ADMIN Uji', email: `${loginId}@contoh.test`, password, passwordConfirm: password, role: 'admin', verified: true,
  }, su, 200);
  const auth = (await call('POST', '/api/collections/users/auth-with-password', { identity: loginId, password }, null, 200)).data;
  return { token: auth.token, id: auth.record.id };
}

const find = async (path) => (await call('GET', path, undefined, null, 200)).data.items;
const programs = await find('/api/collections/programs/records?perPage=200&sort=order');
const prog = (name) => programs.find((p) => p.name === name);
const campusesOf = async (programId) => find(`/api/collections/campuses/records?perPage=500&filter=${encodeURIComponent(`program='${programId}'`)}`);
const subjects = (await call('GET', '/api/medcoel/public-subjects', undefined, null, 200)).data.items;
const mk = subjects[0];
const admin = await akunAdmin();

console.log('Daftar prodi dan kampus');
await langkah('pengunjung melihat prodi kesehatan lengkap; kampus lama otomatis Kedokteran', async () => {
  for (const n of ['Kedokteran', 'Kedokteran Gigi', 'Kedokteran Hewan', 'Farmasi', 'Keperawatan', 'Kebidanan', 'Kesehatan Masyarakat', 'Ilmu Gizi', 'Fisioterapi']) assert.ok(prog(n), n);
  const ked = await campusesOf(prog('Kedokteran').id);
  assert.ok(ked.length >= 100);
  assert.ok(ked.every((c) => c.institution && !c.unverified));
  const kep = await campusesOf(prog('Keperawatan').id);
  assert.ok(kep.length >= 10);
  assert.ok(kep.some((c) => c.institution === 'Universitas Airlangga'));
});

const unairKed = (await campusesOf(prog('Kedokteran').id)).find((c) => c.name === 'FK Universitas Airlangga');
const unairKep = (await campusesOf(prog('Keperawatan').id)).find((c) => c.institution === 'Universitas Airlangga');
assert.ok(unairKed && unairKep);

console.log('Pendaftaran');
const dokter1 = await daftar(`ujik1${RUN}`, unairKed.id);
const dokter2 = await daftar(`ujik2${RUN}`, unairKed.id);
const perawat = await daftar(`ujin1${RUN}`, unairKep.id, { program: prog('Keperawatan').id });
const me = async (u) => (await call('GET', '/api/medcoel/me', undefined, u.token, 200)).data;

await langkah('kampus dari daftar membawa prodinya; ringkasan akun menampilkan prodi dan institusi', async () => {
  const a = await me(dokter1);
  assert.equal(a.programName, 'Kedokteran');
  assert.equal(a.institution, 'Universitas Airlangga');
  const b = await me(perawat);
  assert.equal(b.programName, 'Keperawatan');
  assert.equal(b.institution, 'Universitas Airlangga');
  assert.notEqual(a.campus, b.campus);
});

console.log('Hak lihat soal per prodi');
await langkah('soal Kedokteran UNAIR hanya dilihat Kedokteran UNAIR, bukan Keperawatan UNAIR meski kampusnya sama', async () => {
  await call('POST', '/api/medcoel/admin/import', {
    subject: mk.id, scope: 'campus', campuses: [unairKed.id],
    text: "[{ chapter: 'BAB Prodi', type: 'A', difficulty: 'medium', text: 'Soal khusus Kedokteran Unair', options: ['ya', 'tidak'], answer: 'A' }]",
  }, admin.token, 200);
  const k1 = (await call('GET', '/api/medcoel/campus-materials', undefined, dokter1.token, 200)).data;
  const k2 = (await call('GET', '/api/medcoel/campus-materials', undefined, dokter2.token, 200)).data;
  const n = (await call('GET', '/api/medcoel/campus-materials', undefined, perawat.token, 200)).data;
  assert.equal(k1.items.length, 1); assert.equal(k1.items[0].questionCount, 1);
  assert.equal(k2.items.length, 1);
  assert.deepEqual(n.items, []);
  const detail = (await call('GET', `/api/medcoel/subjects/${mk.slug}`, undefined, perawat.token, 200)).data;
  assert.ok(!detail.chapters.some((c) => c.title === 'BAB Prodi' && c.total > 0), 'perawat tidak boleh melihat soal Kedokteran');
  const detailK = (await call('GET', `/api/medcoel/subjects/${mk.slug}`, undefined, dokter1.token, 200)).data;
  assert.equal(detailK.chapters.find((c) => c.title === 'BAB Prodi').total, 1);
});
await langkah('pengajuan soal dari perawat dibatasi ke Keperawatan UNAIR saja', async () => {
  const s = (await call('POST', '/api/medcoel/submissions', { subject: mk.id, hasKey: false, language: 'id', scope: 'campus', pdfCount: 1 }, perawat.token, 200)).data;
  const sub = (await call('GET', `/api/collections/submissions/records/${s.id}`, undefined, su, 200)).data;
  assert.equal(sub.campus, unairKep.id);
});

console.log('Validasi pilihan');
await langkah('kampus yang bukan penyelenggara prodi pilihan ditolak', async () => {
  const r = await daftar(`ujix1${RUN}`, unairKed.id, { program: prog('Keperawatan').id }, 400);
  assert.equal(r.status, 400);
  assert.ok(r.data.data.campus);
});
await langkah('prodi wajib bila memilih tulis sendiri; teks berisi tautan ditolak', async () => {
  const a = await daftar(`ujix2${RUN}`, '', { campusOther: 'Universitas Contoh Baru' }, 400);
  assert.ok(a.data.data.program);
  const b = await daftar(`ujix3${RUN}`, '', { program: prog('Farmasi').id, campusOther: 'http://spam.example/promo' }, 400);
  assert.ok(b.data.data.campus);
  const c = await daftar(`ujix4${RUN}`, '', { programOther: '<b>x</b>', campusOther: 'Universitas Contoh Baru' }, 400);
  assert.ok(c.data.data.program);
});
await langkah('akun tanpa kampus (siswa SMA) tidak butuh prodi atau semester', async () => {
  const sma = await daftar(`ujisma${RUN}`, '', { campusOther: 'Tidak memiliki kampus', semester: undefined });
  const m = await me(sma);
  assert.equal(m.noCampus, true); assert.equal(m.campus, ''); assert.equal(m.programName, '');
});

console.log('Kampus tulis sendiri');
let typedCampusId = '';
await langkah('kampus tulis sendiri dibuat setelah akun jadi, belum terverifikasi, tidak tampil di daftar umum', async () => {
  const u1 = await daftar(`ujit1${RUN}`, '', { program: prog('Farmasi').id, campusOther: 'Universitas Antah Berantah' });
  const m1 = await me(u1);
  assert.ok(m1.campus);
  typedCampusId = m1.campus;
  assert.equal(m1.programName, 'Farmasi');
  assert.equal(m1.institution, 'Universitas Antah Berantah');
  const pub = await campusesOf(prog('Farmasi').id);
  assert.ok(!pub.some((c) => c.id === typedCampusId), 'tidak boleh tampil bagi pengunjung');
  const adm = (await call('GET', `/api/collections/campuses/records/${typedCampusId}`, undefined, admin.token, 200)).data;
  assert.equal(adm.unverified, true);
});
await langkah('teman dari kampus yang sama (huruf/spasi beda) otomatis bergabung ke record yang sama', async () => {
  const u2 = await daftar(`ujit2${RUN}`, '', { program: prog('Farmasi').id, campusOther: '  universitas   ANTAH berantah ' });
  assert.equal((await me(u2)).campus, typedCampusId);
  // Prodi lain di kampus yang sama namanya tetap terpisah.
  const u3 = await daftar(`ujit3${RUN}`, '', { program: prog('Gizi') ? prog('Gizi').id : prog('Ilmu Gizi').id, campusOther: 'Universitas Antah Berantah' });
  assert.notEqual((await me(u3)).campus, typedCampusId);
});
await langkah('prodi tulis sendiri membuat prodi belum terverifikasi dan dipakai bersama', async () => {
  const u4 = await daftar(`ujit4${RUN}`, '', { programOther: 'Teknik Biomedis Nusantara', campusOther: 'Institut Contoh' });
  const m4 = await me(u4);
  assert.equal(m4.programName, 'Teknik Biomedis Nusantara');
  const u5 = await daftar(`ujit5${RUN}`, '', { programOther: 'teknik biomedis nusantara', campusOther: 'INSTITUT CONTOH' });
  const m5 = await me(u5);
  assert.equal(m5.campus, m4.campus); assert.equal(m5.program, m4.program);
  const all = (await find('/api/collections/programs/records?perPage=200')).filter((p) => p.name === 'Teknik Biomedis Nusantara');
  assert.equal(all.length, 0, 'prodi belum terverifikasi tidak tampil bagi pengunjung');
});
await langkah('ganti kampus pakai prodi + tulis sendiri; kampus yang sama ditolak', async () => {
  const r = await call('POST', '/api/medcoel/me/campus', { program: prog('Keperawatan').id, campusOther: 'Universitas Antah Berantah' }, perawat.token, 200);
  assert.equal(r.data.programName, 'Keperawatan');
  assert.equal(r.data.institution, 'Universitas Antah Berantah');
  await call('POST', '/api/medcoel/me/campus', { program: prog('Keperawatan').id, campusOther: 'Universitas Antah Berantah' }, perawat.token, 400);
});

console.log('Admin');
await langkah('menggabung kampus beda prodi ditolak; tempel massal menambah dan melewati yang sudah ada', async () => {
  const r = await call('POST', '/api/medcoel/admin/campuses/merge', { from: unairKed.id, into: unairKep.id }, admin.token);
  assert.equal(r.status, 400);
  const bulk = await call('POST', '/api/medcoel/admin/campuses/bulk', {
    program: prog('Teknologi Laboratorium Medis').id,
    text: 'Poltekkes Contoh A | Kota A | ptn\nPoltekkes Contoh B\n\n<script>x</script>\nPoltekkes Contoh A',
  }, admin.token, 200);
  assert.equal(bulk.data.added, 2); assert.equal(bulk.data.skipped, 1); assert.equal(bulk.data.invalid.length, 1);
  const list = await campusesOf(prog('Teknologi Laboratorium Medis').id);
  assert.ok(list.some((c) => c.name === 'Teknologi Laboratorium Medis Poltekkes Contoh A' && c.city === 'Kota A' && c.kind === 'ptn'));
  // Tempel nama yang sama dengan kampus buatan pengguna menjadikannya terverifikasi.
  const v = await call('POST', '/api/medcoel/admin/campuses/bulk', { program: prog('Farmasi').id, text: 'Universitas Antah Berantah | Kota X | pts' }, admin.token, 200);
  assert.equal(v.data.added, 1);
  const pub = await campusesOf(prog('Farmasi').id);
  assert.ok(pub.some((c) => c.id === typedCampusId), 'sekarang tampil bagi pengunjung');
});
await langkah('menggabung prodi: kampus kembar ikut tergabung, pengguna dan soal ikut pindah', async () => {
  const typed = (await call('GET', `/api/collections/programs/records?perPage=50&filter=${encodeURIComponent("name='Teknik Biomedis Nusantara'")}`, undefined, admin.token, 200)).data.items[0];
  assert.ok(typed && typed.unverified);
  const target = prog('Ilmu Biomedik');
  const r = await call('POST', '/api/medcoel/admin/programs/merge', { from: typed.id, into: target.id }, admin.token, 200);
  assert.equal(r.data.movedCampuses, 1);
  const rows = (await call('GET', `/api/collections/campuses/records?perPage=500&filter=${encodeURIComponent(`program='${target.id}'`)}`, undefined, admin.token, 200)).data.items;
  const moved = rows.find((c) => c.institution === 'Institut Contoh');
  assert.ok(moved); assert.equal(moved.name, 'Ilmu Biomedik Institut Contoh');
  const after = await me({ token: (await call('POST', '/api/collections/users/auth-with-password', { identity: `ujit4${RUN}`, password: 'rahasia123' }, null, 200)).data.token });
  assert.equal(after.programName, 'Ilmu Biomedik');
});

await call('PATCH', '/api/settings', { rateLimits: rateBefore }, su, 200);
console.log(`program-campus.test: ${lulus} langkah lulus`);

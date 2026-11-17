// TES API AKTIVITAS SISWA (pencatatan dan ringkasan admin).
//
//   MEDCOEL_DEV_MODE=1 ./pocketbase serve --http=127.0.0.1:8090 --dir=/tmp/pb-test --migrationsDir=./pb_migrations --hooksDir=./pb_hooks
//   ./pocketbase superuser upsert dev@medcoel.local devpassword123 --dir=/tmp/pb-test
//   PB_URL=http://127.0.0.1:8090 node test/activity-api.test.mjs
//
// Tes ini MENGISI database dengan data uji; jangan dijalankan ke server produksi.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const A = require('../pb_hooks/lib/activity.js');
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
  let payload;
  if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  const r = await fetch(B + path, { method, headers, body: payload });
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
const admin = await akun('admin');
const siswa1 = await akun('user');
const siswa2 = await akun('user');
const agen = await akun('agent');
const report = (t, ev, exp = 200) => call('POST', '/api/medcoel/activity', ev, t, exp);
const lihat = async (days) => (await call('GET', '/api/medcoel/admin/activity' + (days ? `?days=${days}` : ''), undefined, admin.token, 200)).data;

console.log('Aktivitas siswa');
const dasar = await lihat(30);
const hitung = (r, key) => (r.pages.find((p) => p.key === key) || { views: 0, students: 0, minutes: 0 });

await langkah('tanpa masuk ditolak; hanya admin yang boleh melihat ringkasan', async () => {
  await report(null, { key: '/beranda', views: 1 }, 401);
  await call('GET', '/api/medcoel/admin/activity', undefined, null, 401);
  await call('GET', '/api/medcoel/admin/activity', undefined, siswa1.token, 403);
});

await langkah('siswa melapor: dihitung; laporan berikutnya menambah (jumlah buka dan detik)', async () => {
  assert.equal((await report(siswa1.token, { key: '/kerjakan/:id', views: 1, seconds: 40 })).data.recorded, 1);
  assert.equal((await report(siswa1.token, { key: '/kerjakan/:id', views: 0, seconds: 60 })).data.recorded, 1);
  assert.equal((await report(siswa1.token, { key: '/kerjakan/:id', views: 1, seconds: 0 })).data.recorded, 1);
  const r = await lihat(30), p = hitung(r, '/kerjakan/:id'), b = hitung(dasar, '/kerjakan/:id');
  assert.equal(p.views - b.views, 2);
  assert.equal(p.minutes - b.minutes, Math.round(100 / 60) - Math.round(0 / 60), 'menit dibulatkan dari 100 detik');
});

await langkah('banyak laporan dalam satu permintaan; pola yang tidak dikenal dan alamat asli tidak disimpan', async () => {
  const res = (await report(siswa2.token, { events: [
    { key: '/kerjakan/:id', views: 1, seconds: 20 },
    { key: '/anatomy/live', views: 1, seconds: 90 },
    { key: '/kerjakan/abc123xyz', views: 1, seconds: 5 },
    { key: '/admin', views: 1 },
    { key: '/beranda?q=rahasia', views: 1 },
    { key: '__proto__', views: 1 },
  ] })).data;
  assert.equal(res.recorded, 2, 'hanya dua pola yang sah');
  const rows = (await call('GET', '/api/collections/activity_daily/records?perPage=500', undefined, su, 200)).data.items;
  for (const r of rows) assert.ok(Object.prototype.hasOwnProperty.call(A.KEYS, r.key), 'tersimpan pola tak dikenal: ' + r.key);
  assert.ok(!rows.some((r) => /abc123|rahasia|admin/.test(r.key)));
});

await langkah('angka tidak bisa dipompa: views paling banyak 1 dan detik paling banyak 300 per laporan', async () => {
  const sebelum = hitung(await lihat(30), '/lab');
  await report(siswa1.token, { key: '/lab', views: 99999, seconds: 99999 });
  const sesudah = hitung(await lihat(30), '/lab');
  assert.equal(sesudah.views - sebelum.views, 1);
  assert.ok(sesudah.minutes - sebelum.minutes <= 5);
});

await langkah('laporan yang datang bersamaan tidak ada yang hilang dan tidak menggandakan baris', async () => {
  const korban = await akun('user');
  const sebelum = hitung(await lihat(30), '/jadwal');
  const hasil = await Promise.all(Array.from({ length: 12 }, () => report(korban.token, { key: '/jadwal', views: 1, seconds: 10 })));
  assert.ok(hasil.every((h) => h.data.recorded === 1));
  const sesudah = hitung(await lihat(30), '/jadwal');
  assert.equal(sesudah.views - sebelum.views, 12, 'dua belas laporan, dua belas kali buka');
  const baris = (await call('GET', `/api/collections/activity_daily/records?filter=${encodeURIComponent(`user="${korban.id}" && key="/jadwal"`)}`, undefined, su, 200)).data.items;
  assert.equal(baris.length, 1, 'satu baris per siswa, hari, halaman');
  assert.equal(baris[0].seconds, 120);
});

await langkah('aktivitas admin dan agen tidak dicatat', async () => {
  const sebelum = hitung(await lihat(30), '/progres');
  assert.equal((await report(admin.token, { key: '/progres', views: 1, seconds: 30 })).data.recorded, 0);
  assert.equal((await report(agen.token, { key: '/progres', views: 1, seconds: 30 })).data.recorded, 0);
  assert.equal(hitung(await lihat(30), '/progres').views, sebelum.views);
});

await langkah('ringkasan: siswa berbeda, bagian, urutan, hari ini terisi, bentuk lengkap', async () => {
  const r = await lihat(7);
  assert.equal(r.days, 7); assert.equal(r.daily.length, 7);
  assert.equal(r.daily.at(-1).day, r.to);
  assert.ok(r.daily.at(-1).views >= 4 && r.daily.at(-1).students >= 2);
  assert.ok(r.totals.students >= 2 && r.totals.views >= 4);
  const soal = r.sections.find((s) => s.section === 'soal'), anat = r.sections.find((s) => s.section === 'anatomi');
  assert.ok(soal && soal.students >= 2, 'dua siswa berbeda membuka Latihan soal');
  assert.ok(anat && anat.label === 'Anatomi 3D & 4D');
  assert.equal(r.pages.find((p) => p.key === '/anatomy/live').label, 'Live 4D Lab');
  for (let i = 1; i < r.sections.length; i++) assert.ok(r.sections[i - 1].views >= r.sections[i].views, 'urut menurun');
  assert.ok(r.trackingStartedOn);
});

await langkah('rentang hanya 1/7/30/90; nilai lain jatuh ke 7; semua balasan tanpa nama atau email siswa', async () => {
  assert.equal((await lihat(30)).days, 30); assert.equal((await lihat(1)).days, 1); assert.equal((await lihat(3)).days, 7); assert.equal((await lihat()).days, 7);
  const raw = JSON.stringify(await lihat(90));
  assert.ok(!/@contoh\.test|Uji|loginId/.test(raw), 'ringkasan tidak boleh memuat identitas siswa');
});

await langkah('koleksi tidak bisa dibaca atau ditulis lewat API biasa', async () => {
  assert.ok([401, 403, 404].includes((await call('GET', '/api/collections/activity_daily/records', undefined, siswa1.token)).status));
  assert.ok([400, 401, 403, 404].includes((await call('POST', '/api/collections/activity_daily/records', { user: siswa1.id, day: '2026-01-01', key: '/beranda', views: 9999 }, siswa1.token)).status));
});

await langkah('hapus akun siswa menghapus catatannya (cascade)', async () => {
  const korban = await akun('user');
  await report(korban.token, { key: '/riwayat', views: 1, seconds: 10 });
  const ada = (id) => call('GET', `/api/collections/activity_daily/records?filter=${encodeURIComponent(`user="${id}"`)}`, undefined, su, 200).then((r) => r.data.items.length);
  assert.equal(await ada(korban.id), 1);
  await call('DELETE', `/api/collections/users/records/${korban.id}`, undefined, su, 204);
  assert.equal(await ada(korban.id), 0);
});

console.log(`\n${lulus} langkah lulus${process.exitCode ? ', ADA YANG GAGAL' : ''}`);

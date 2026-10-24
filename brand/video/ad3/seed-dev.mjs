// Menyiapkan data DEV lokal untuk merekam video ke-3 (tidak menyentuh produksi):
//  - kampus fiktif "Universitas Contoh" untuk akun uji (supaya tidak menampilkan nama kampus sungguhan di iklan);
//  - beberapa soal khusus kampus itu (muncul di bagian "Soal kampusmu");
//  - sakelar Drilling menyala (soal Drilling uji dibuat bila belum ada).
//   node ad3/seed-dev.mjs
const A = process.env.PB_URL || 'http://127.0.0.1:8090';
const J = { 'Content-Type': 'application/json' };
const post = async (p, body, tok) => { const r = await fetch(A + p, { method: 'POST', headers: { ...J, ...(tok ? { Authorization: tok } : {}) }, body: JSON.stringify(body) }); return { ok: r.ok, status: r.status, data: await r.json().catch(() => ({})) }; };
const get = async (p, tok) => (await fetch(A + p, { headers: { Authorization: tok } })).json();
const su = (await post('/api/collections/_superusers/auth-with-password', { identity: 'dev@medcoel.local', password: 'devpassword123' })).data.token;
const adm = (await post('/api/collections/users/auth-with-password', { identity: 'admin.dev', password: 'gR2ahVZe' })).data.token;
if (!su || !adm) throw new Error('Login superuser/admin dev gagal');

let camp = (await get(`/api/collections/campuses/records?filter=${encodeURIComponent("name='Universitas Contoh'")}`, su)).items?.[0];
if (!camp) camp = (await post('/api/collections/campuses/records', { name: 'Universitas Contoh', city: 'Kota Contoh', kind: 'ptn', active: true, order: 999 }, su)).data;
const user = (await get(`/api/collections/users/records?filter=${encodeURIComponent("loginId='mahasiswa.dev'")}`, su)).items?.[0];
await fetch(`${A}/api/collections/users/records/${user.id}`, { method: 'PATCH', headers: { ...J, Authorization: su }, body: JSON.stringify({ campus: camp.id }) });
console.log('kampus akun uji:', camp.name);

const subjects = (await get('/api/collections/subjects/records?perPage=50&sort=order', su)).items;
const pick = (slug) => subjects.find((s) => s.slug === slug) || subjects[0];
const mk = (n, topik) => ({ type: 'A', difficulty: ['easy', 'medium', 'hard'][n % 3], text: `Soal latihan ${topik} nomor ${n}: pernyataan berikut yang paling tepat adalah`, options: ['Pilihan A', { text: 'Pilihan B', correct: true, explanation: 'Pilihan B paling sesuai dengan konsep dasarnya.' }, 'Pilihan C', 'Pilihan D'], chapter: 'Materi kampus' });
for (const [slug, topik] of [['anatomi', 'anatomi'], ['fisiologi', 'fisiologi'], ['biokimia-biologi-molekuler', 'biokimia']]) {
  const s = pick(slug);
  const have = (await get(`/api/medcoel/admin/questions?subject=${s.id}&scope=campus&perPage=1`, adm)).totalItems || 0;
  if (have >= 5) { console.log(s.name, 'sudah punya soal kampus'); continue; }
  const r = await post('/api/medcoel/admin/import', { subject: s.id, scope: 'campus', campuses: [camp.id], status: 'published', text: JSON.stringify(Array.from({ length: 6 }, (_, i) => mk(i + 1, topik))) }, adm);
  console.log('impor soal kampus', s.name, r.status, r.data.created ?? r.data.message);
}
const rec = (await get('/api/collections/app_settings/records?perPage=1', su)).items[0];
await fetch(`${A}/api/collections/app_settings/records/${rec.id}`, { method: 'PATCH', headers: { ...J, Authorization: su }, body: JSON.stringify({ drillingEnabled: true }) });
const d = await get('/api/medcoel/admin/drilling', adm);
console.log('Drilling: menyala, soal tayang', d.published);
if (!d.published) {
  const s = pick('anatomi');
  const q = (n) => ({ type: 'A', difficulty: 'medium', text: `Soal drilling anatomi nomor ${n}?`, options: ['Pilihan A', { text: 'Pilihan B', correct: true }, 'Pilihan C', 'Pilihan D'] });
  console.log('impor drilling', (await post('/api/medcoel/admin/import', { subject: s.id, drilling: true, text: JSON.stringify([1, 2, 3, 4, 5, 6].map(q)) }, adm)).status);
}

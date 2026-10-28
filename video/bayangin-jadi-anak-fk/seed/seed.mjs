// Data uji LOKAL untuk merekam web asli (jangan dijalankan ke server produksi).
// Membuat admin, 26 soal Anatomi (dari video Tab Dua Puluh), dan akun mahasiswa baru "Raka".
import { EKSTREMITAS_ATAS, OSTEOLOGI } from '../../tab-dua-puluh/seed/questions.mjs';
const B = process.env.PB_URL || 'http://127.0.0.1:8090';
async function call(method, path, body, token) {
  const r = await fetch(B + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: token } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let d; try { d = JSON.parse(t); } catch { d = t; }
  if (!r.ok) throw new Error(`${method} ${path} -> ${r.status} ${t.slice(0, 300)}`);
  return d;
}
const su = (await call('POST', '/api/collections/_superusers/auth-with-password', { identity: 'dev@medcoel.local', password: 'devpassword123' })).token;
const mkUser = async (loginId, name, role = 'user', extra = {}) => {
  const password = 'rahasia-demo-1';
  await call('POST', '/api/collections/users/records', { loginId, name, email: `${loginId}@contoh.test`, password, passwordConfirm: password, role, verified: true, tutorials: { fk: 'done', dokter: 'done' }, ...extra }, su);
  return (await call('POST', '/api/collections/users/auth-with-password', { identity: loginId, password })).token;
};
const subjects = (await call('GET', '/api/collections/subjects/records?perPage=60', undefined, su)).items;
const anatomi = subjects.find((s) => s.name === 'Anatomi');
const chapters = (await call('GET', `/api/collections/chapters/records?perPage=100&filter=${encodeURIComponent(`subject="${anatomi.id}"`)}`, undefined, su)).items;
const CH_EXT = chapters.find((c) => c.title === 'Anatomi Ekstremitas Atas').title;
const CH_OST = chapters.find((c) => c.title.startsWith('Osteologi')).title;
const adminToken = await mkUser('admin.demo', 'Admin MEDCOEL', 'admin');
const all = [...EKSTREMITAS_ATAS.map((q) => ({ ...q, chapter: CH_EXT })), ...OSTEOLOGI.map((q) => ({ ...q, chapter: CH_OST }))].map((q, i) => ({ ...q, type: 'A', code: `demo-${i + 1}` }));
const imp = await call('POST', '/api/medcoel/admin/import', { subject: anatomi.id, scope: 'all', text: JSON.stringify(all) }, adminToken);
console.log('impor:', imp.created, 'soal dibuat');
const campus = (await call('GET', '/api/collections/campuses/records?perPage=1&sort=order', undefined, su)).items[0];
await mkUser('raka.fk', 'Raka', 'user', { campus: campus.id, semester: 3, studyingSubjects: [anatomi.id] });
console.log('seed selesai. Akun Raka: raka.fk / rahasia-demo-1');

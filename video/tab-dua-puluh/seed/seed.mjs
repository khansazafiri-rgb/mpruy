// Seed data uji untuk rekaman video (PocketBase lokal, database kosong).
import { EKSTREMITAS_ATAS, OSTEOLOGI } from './questions.mjs';
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
  const rec = await call('POST', '/api/collections/users/records', { loginId, name, email: `${loginId}@contoh.test`, password, passwordConfirm: password, role, verified: true, tutorials: { fk: 'done', dokter: 'done' }, ...extra }, su);
  const auth = await call('POST', '/api/collections/users/auth-with-password', { identity: loginId, password });
  return { id: rec.id, token: auth.token, loginId, name };
};
const subjects = (await call('GET', '/api/collections/subjects/records?perPage=60', undefined, su)).items;
const anatomi = subjects.find((s) => s.name === 'Anatomi');
const chapters = (await call('GET', `/api/collections/chapters/records?perPage=100&filter=${encodeURIComponent(`subject="${anatomi.id}"`)}`, undefined, su)).items;
const CH_EXT = chapters.find((c) => c.title === 'Anatomi Ekstremitas Atas').title;
const CH_OST = chapters.find((c) => c.title.startsWith('Osteologi')).title;

const admin = await mkUser('admin.demo', 'Admin MEDCOEL', 'admin');
const all = [...EKSTREMITAS_ATAS.map((q) => ({ ...q, chapter: CH_EXT })), ...OSTEOLOGI.map((q) => ({ ...q, chapter: CH_OST }))].map((q, i) => ({ ...q, type: 'A', code: `demo-${i + 1}` }));
const imp = await call('POST', '/api/medcoel/admin/import', { subject: anatomi.id, scope: 'all', text: JSON.stringify(all) }, admin.token);
console.log('impor:', imp.created, 'soal dibuat');

const campus = (await call('GET', '/api/collections/campuses/records?perPage=1&sort=order', undefined, su)).items[0];
const nadia = await mkUser('nadia.putri', 'Nadia Putri', 'user', { campus: campus.id, semester: 3, studyingSubjects: [anatomi.id] });
const friends = [['raka.pratama', 'Raka Pratama', 0.95, 26], ['salsa.nabila', 'Salsa Nabila', 0.9, 22], ['dimas.arya', 'Dimas Arya', 0.8, 26], ['intan.maharani', 'Intan Maharani', 0.75, 18], ['fajar.nugroho', 'Fajar Nugroho', 0.7, 14], ['tania.wijaya', 'Tania Wijaya', 0.6, 10]];
const rightText = new Map(all.map((q) => [q.text, q.options.find((x) => x.correct).text]));
async function practice(u, chapterTitle, count, accuracy) {
  const ch = chapters.find((c) => c.title === chapterTitle);
  const a = await call('POST', '/api/medcoel/attempts/practice', { chapter: ch.id, count, mode: 'exam' }, u.token);
  const data = await call('GET', `/api/medcoel/attempts/${a.attempt.id}`, undefined, u.token);
  let n = 0;
  for (const q of data.questions) {
    const stem = typeof q.stem === 'string' ? q.stem : JSON.stringify(q.stem);
    const src = all.find((x) => stem.includes(x.text.slice(0, 40))); if (!src) continue;
    const right = q.options.find((o) => o.text === rightText.get(src.text));
    const wrong = q.options.find((o) => o.text !== rightText.get(src.text));
    const pick = (n++ / data.questions.length) < accuracy ? right : wrong;
    await call('POST', `/api/medcoel/attempts/${a.attempt.id}/answer`, { question: q.id, response: pick.label }, u.token);
  }
  // Mundurkan jam mulai agar durasi wajar (anti-curang menandai percobaan < 3 detik/soal).
  const started = new Date(Date.now() - (data.questions.length * 25 + 40) * 1000).toISOString().replace('T', ' ');
  await call('PATCH', `/api/collections/attempts/records/${a.attempt.id}`, { startedAt: started }, su);
  await call('POST', `/api/medcoel/attempts/${a.attempt.id}/finish`, { answers: {} }, u.token);
}
for (const [id, name, acc, count] of friends) {
  const u = await mkUser(id, name);
  await practice(u, CH_EXT, Math.min(count, EKSTREMITAS_ATAS.length), acc);
  if (count > 20) await practice(u, CH_OST, OSTEOLOGI.length, acc);
}
console.log('seed selesai. Nadia:', nadia.loginId, '/ rahasia-demo-1');

// Mengimpor soal uji BAB "Anatomi Paru & Saluran Napas" ke PocketBase lokal (jalankan sesudah video/tab-dua-puluh/seed/seed.mjs).
import { PARU, CHAPTER } from './paru-soal.mjs';
const B = process.env.PB_URL || 'http://127.0.0.1:8090';
async function call(method, path, body, token) {
  const r = await fetch(B + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: token } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const t = await r.text(); let d; try { d = JSON.parse(t); } catch { d = t; }
  if (!r.ok) throw new Error(`${method} ${path} -> ${r.status} ${t.slice(0, 300)}`);
  return d;
}
const admin = (await call('POST', '/api/collections/users/auth-with-password', { identity: 'admin.demo', password: 'rahasia-demo-1' })).token;
const su = (await call('POST', '/api/collections/_superusers/auth-with-password', { identity: 'dev@medcoel.local', password: 'devpassword123' })).token;
const subjects = (await call('GET', '/api/collections/subjects/records?perPage=60', undefined, su)).items;
const anatomi = subjects.find((s) => s.name === 'Anatomi');
const list = PARU.map((q, i) => ({ ...q, chapter: CHAPTER, type: 'A', code: `satukasus-${i + 1}` }));
const imp = await call('POST', '/api/medcoel/admin/import', { subject: anatomi.id, scope: 'all', text: JSON.stringify(list) }, admin);
console.log('impor soal paru:', imp.created, 'dibuat');

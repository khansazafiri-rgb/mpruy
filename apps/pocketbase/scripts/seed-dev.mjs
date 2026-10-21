// DATA CONTOH UNTUK PENGEMBANGAN LOKAL (jangan dijalankan ke server produksi)
//
// Membuat satu akun admin, satu akun pengguna, dan beberapa soal contoh supaya
// web bisa langsung dicoba. Password dibuat acak dan dicetak di layar; tidak
// ada password tetap di repositori.
//
//   cd apps/pocketbase
//   ./pocketbase superuser upsert dev@medcoel.local <password> --dir=./pb_data
//   PB_SU_EMAIL=dev@medcoel.local PB_SU_PASSWORD=<password> node scripts/seed-dev.mjs

import { randomBytes } from 'node:crypto';

const B = process.env.PB_URL || 'http://127.0.0.1:8090';
const SU = { identity: process.env.PB_SU_EMAIL, password: process.env.PB_SU_PASSWORD };
if (!SU.identity || !SU.password) {
  console.error('Isi PB_SU_EMAIL dan PB_SU_PASSWORD (akun superuser PocketBase lokal).');
  process.exit(1);
}

async function call(method, path, body, token) {
  const r = await fetch(B + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${method} ${path}: ${r.status} ${JSON.stringify(data)}`);
  return data;
}

const su = (await call('POST', '/api/collections/_superusers/auth-with-password', SU)).token;
const campus = (await call('GET', '/api/collections/campuses/records?perPage=1&sort=order')).items[0];

async function account(loginId, name, role) {
  const password = randomBytes(6).toString('base64url');
  const found = await call('GET', `/api/collections/users/records?filter=${encodeURIComponent(`loginId="${loginId}"`)}`, null, su);
  const body = { loginId, name, email: `${loginId}@contoh.test`, password, passwordConfirm: password, role, verified: true, whatsapp: '6281234567890', semester: 3, campus: campus.id };
  if (found.items[0]) await call('PATCH', `/api/collections/users/records/${found.items[0].id}`, body, su);
  else await call('POST', '/api/collections/users/records', body, su);
  return password;
}

const adminPw = await account('admin.dev', 'Admin Dev', 'admin');
const userPw = await account('mahasiswa.dev', 'Nadia Putri', 'user');
const admin = (await call('POST', '/api/collections/users/auth-with-password', { identity: 'admin.dev', password: adminPw })).token;

const subjects = (await call('GET', '/api/medcoel/public-subjects')).items;
const anatomi = subjects.find((s) => s.slug === 'anatomi') || subjects[0];

const soal = [];
const bab = ['Osteologi', 'Miologi', 'Neuroanatomi'];
const diffs = ['easy', 'medium', 'hard'];
bab.forEach((b, bi) => {
  for (let i = 1; i <= 12; i++) {
    const d = diffs[i % 3];
    if (i % 4 === 0) {
      soal.push({
        chapter: b, type: 'K', difficulty: d, code: `DEV-${bi}-${i}`,
        text: `(${b} ${i}) Pernyataan berikut yang benar adalah`,
        statements: ['Pernyataan pertama benar', 'Pernyataan kedua salah', 'Pernyataan ketiga benar', 'Pernyataan keempat salah'],
        trueStatements: [1, 3],
        explanation: 'Pernyataan (1) dan (3) benar, jadi jawabannya **B**.',
      });
    } else {
      soal.push({
        chapter: b, type: 'A', difficulty: d, code: `DEV-${bi}-${i}`,
        text: `(${b} ${i}) Contoh soal tipe A tingkat ${d}. Struktur manakah yang dimaksud?`,
        options: [
          { text: 'Pilihan yang benar', correct: true, explanation: 'Ini kuncinya.' },
          { text: 'Pilihan pengecoh 1', explanation: 'Kurang tepat karena ...' },
          'Pilihan pengecoh 2', 'Pilihan pengecoh 3', 'Pilihan pengecoh 4',
        ],
        explanation: [
          { type: 'paragraph', text: 'Pembahasan dengan **teks tebal**, H~2~O, dan x^2^.' },
          { type: 'table', header: 'row', rows: [['Struktur', 'Fungsi'], ['Femur', 'Menopang berat badan'], ['Tibia', 'Tulang kering']] },
          { type: 'note', variant: 'highyield', text: 'Poin high-yield untuk diingat.' },
        ],
      });
    }
  }
});
soal.push({ chapter: 'Osteologi', type: 'isian', difficulty: 'medium', code: 'DEV-ISIAN-1', text: 'Sebutkan tulang terpanjang pada tubuh manusia.', subQuestions: [{ label: 'A', question: 'Nama tulang', validAnswers: ['Femur / os femoris'] }] });

const r = await call('POST', '/api/medcoel/admin/import', { subject: anatomi.id, scope: 'all', text: JSON.stringify(soal) }, admin);
console.log(`Soal contoh: ${r.created} dibuat, ${r.duplicates} sudah ada.`);
console.log('\nAkun pengembangan (simpan, hanya dicetak sekali):');
console.log(`  admin     : admin.dev / ${adminPw}`);
console.log(`  pengguna  : mahasiswa.dev / ${userPw}`);

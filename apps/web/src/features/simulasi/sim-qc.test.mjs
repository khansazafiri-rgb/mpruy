// Penjaga hasil QC isi Simulasi Dokter: jawaban umum harus menjawab pertanyaannya,
// nama di panggung harus nama pasien kasus, dan migrasi tambalan tidak menimpa suntingan admin.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { BUILTIN_CASES, BYID, answerOf, caseCtx, patientName, setContent, CASES } from './engine.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const migDir = path.resolve(here, '../../../../pocketbase/pb_migrations');
const read = (f) => fs.readFileSync(path.join(migDir, f), 'utf8');
const NEW_CASES = JSON.parse(read('1800001300_sim_cases_50.js').match(/const NEW_CASES = (.*);\n/)[1]);

const allCases = () => {
  const cases = { ...BUILTIN_CASES };
  NEW_CASES.forEach((c) => { cases[c.key] = { ...c.data, poli: c.poli, title: c.title }; });
  return cases;
};

test('pertanyaan "sifat dan derajat 1 sampai 10" selalu dijawab dengan derajatnya', () => {
  const bad = [];
  Object.entries(allCases()).forEach(([key, C]) => {
    if (C.nodoc) return;
    const a = C.A && C.A.kualitas;
    if (!a) return;
    if (!/nilai|skala|\d\s*\/\s*10|nyeri(nya)? sekitar \d|\bsekali\b|\bbanget\b/i.test(a.say)) bad.push(`${key}: "${a.say}"`);
  });
  assert.deepEqual(bad, [], 'jawaban kualitas harus menyebut derajat (nilai 1-10 atau "sekali")');
});

test('dialog pembuka tidak membocorkan keluhan utama (itu dijawab saat anamnesis)', () => {
  const skip = new Set(['dokter', 'selamat', 'siang', 'pagi', 'mohon', 'tolong', 'diperiksa', 'dibantu', 'diantar', 'ibunya', 'tahun', 'pasien', 'berikutnya', 'sudah', 'masuk', 'dudukkan', 'setengah', 'tegak', 'persilakan', 'duduk', 'cemas', 'takut', 'sekali', 'agak']);
  const bad = [];
  Object.entries(allCases()).forEach(([key, C]) => {
    if (C.nodoc) return;
    const words = (C.A.ku.note || '').toLowerCase().match(/[a-z]{5,}/g) || [];
    const intro = C.intro.map((l) => l.t).join(' ').toLowerCase();
    words.filter((w) => !skip.has(w) && intro.includes(w)).forEach((w) => bad.push(`${key}: "${w}"`));
    if (C.intro.length < 2) bad.push(`${key}: intro kurang dari 2 baris`);
  });
  assert.deepEqual(bad, []);
});

test('nama di panggung adalah nama pasien kasus, bukan nama bawaan sprite', () => {
  assert.equal(patientName({ id: 'Bu Lestari, 33 tahun', pas: 'ibuhamil' }), 'Bu Lestari');
  assert.equal(patientName({ id: '', pas: 'ibuhamil' }), 'Bu Sari');
  const cases = allCases();
  setContent({ cases });
  try {
    assert.equal(patientName(CASES.previa), 'Bu Lestari');
    assert.equal(patientName(CASES.dbd), 'Pak Hendra');
    const ctx = caseCtx('previa');
    assert.match(answerOf(BYID.kualitas, ctx).say, /tidak sakit sama sekali/i);
  } finally {
    setContent({ cases: BUILTIN_CASES });
  }
});

function loadPatch() {
  let up;
  const sandbox = { migrate: (fn) => { up = fn; }, JSON, Object, Array, String };
  vm.runInNewContext(read('1800002400_sim_cases_qc.js'), sandbox);
  const patches = JSON.parse(read('1800002400_sim_cases_qc.js').match(/const PATCHES = (.*);\n/)[1]);
  return { up, patches };
}

function fakeApp(rows) {
  const saved = [];
  const wrap = (key) => ({ getString: () => JSON.stringify(rows[key]), set: (f, v) => { rows[key] = v; }, key });
  return {
    saved,
    findFirstRecordByFilter: (_c, _f, p) => { if (!(p.k in rows)) throw new Error('tidak ada'); return wrap(p.k); },
    save: (r) => saved.push(r.key),
  };
}

test('migrasi tambalan: mengganti jawaban lama, tidak menyentuh yang sudah diedit admin, dan aman diulang', () => {
  const { up, patches } = loadPatch();
  const cases = allCases();
  const rows = {};
  patches.forEach((p) => {
    const d = JSON.parse(JSON.stringify(cases[p.key]));
    Object.keys(p.A).forEach((id) => { d.A[id] = p.A[id].old; });
    if (p.intro) d.intro = p.intro.old;
    p.U.forEach((id) => { d.U = d.U.split(/\s+/).filter((x) => x !== id).join(' '); });
    rows[p.key] = d;
  });
  const edited = patches.find((p) => p.key === 'previa');
  rows.previa.A.kualitas = { say: 'Teks hasil suntingan admin.', note: 'Suntingan admin' };

  const app = fakeApp(rows);
  up(app);
  const done = JSON.parse(JSON.stringify(rows));
  patches.forEach((p) => {
    const want = JSON.parse(JSON.stringify(cases[p.key]));
    if (p === edited) want.A.kualitas = { say: 'Teks hasil suntingan admin.', note: 'Suntingan admin' };
    Object.keys(p.A).forEach((id) => assert.deepEqual(done[p.key].A[id], want.A[id], `${p.key}.${id}`));
    if (p.intro) assert.deepEqual(done[p.key].intro, want.intro, `${p.key} intro`);
    p.U.forEach((id) => assert.ok(done[p.key].U.split(/\s+/).includes(id), `${p.key} U ${id}`));
  });
  const first = app.saved.length;
  assert.ok(first > 0);
  const app2 = fakeApp(rows);
  up(app2);
  assert.equal(app2.saved.length, 0, 'dijalankan kedua kali tidak mengubah apa pun');
  up(fakeApp({}));
});

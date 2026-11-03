import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { StateStore } from '../src/state.mjs';
import { ImportPlanFlow } from '../src/import-plan.mjs';
import { RetargetFlow, parseRetargetCommand, MAX_CODES } from '../src/retarget.mjs';
import { buildHelp, TELEGRAM_LIMIT } from '../src/help.mjs';
import { BOT_COMMANDS } from '../src/notify.mjs';

const A = 'MC261024-ABCD';
const B = 'MC261025-EFGH';
const SUBJECTS = [
  { id: 's1', name: 'Anatomi', slug: 'anatomi' },
  { id: 's2', name: 'Ilmu Penyakit Dalam', slug: 'penyakit-dalam' },
  { id: 's3', name: 'Ilmu Bedah', slug: 'bedah' },
  { id: 's4', name: 'Ilmu Kesehatan Anak', slug: 'anak' },
];

// Server tiruan: menyimpan jenis isi dan mata kuliah per pengajuan, meniru aturan endpoint /retarget.
function fakeServer() {
  const subs = {
    [A]: { id: 'rec1', code: A, status: 'antre', contentKind: 'soal', subject: SUBJECTS[0], restriction: 'all', pdfCount: 1, files: [] },
    [B]: { id: 'rec2', code: B, status: 'menunggu_konfirmasi', contentKind: 'soal', subject: SUBJECTS[0], restriction: 'campus', pdfCount: 2, files: [] },
    'MC261026-DONE': { id: 'rec3', code: 'MC261026-DONE', status: 'selesai', contentKind: 'soal', subject: SUBJECTS[0], pdfCount: 1, files: [] },
  };
  const calls = [];
  const reject = (status, message) => Object.assign(new Error(message), { status, body: { status, message } });
  return {
    subs,
    calls,
    getSubmission: async (id) => {
      const s = subs[id] || Object.values(subs).find((x) => x.id === id);
      if (!s) throw reject(404, 'Pengajuan tidak ditemukan.');
      return structuredClone(s);
    },
    listSubjects: async () => SUBJECTS,
    retargetSubmission: async (id, body) => {
      calls.push(JSON.parse(JSON.stringify({ id, ...body })));
      const s = subs[id] || Object.values(subs).find((x) => x.id === id);
      if (!s) throw reject(404, 'Pengajuan tidak ditemukan.');
      if (['selesai', 'dibatalkan'].includes(s.status)) throw reject(400, 'Pengajuan berstatus Selesai tidak bisa dialihkan.');
      let target = s.subject;
      if (body.subject) {
        const q = body.subject.toLowerCase();
        const hit = SUBJECTS.filter((x) => x.name.toLowerCase() === q || x.slug === q || x.name.toLowerCase().includes(q));
        if (!hit.length) throw reject(400, `Mata kuliah '${body.subject}' tidak ditemukan.`);
        if (hit.length > 1) throw reject(400, `'${body.subject}' cocok dengan beberapa mata kuliah: ${hit.map((x) => x.name).join('; ')}.`);
        target = hit[0];
      }
      const from = { kind: s.contentKind, subject: s.subject };
      const kind = body.contentKind || s.contentKind;
      const changed = kind !== from.kind || target.id !== from.subject.id;
      s.contentKind = kind;
      s.subject = target;
      return {
        ...structuredClone(s),
        retarget: { changed, contentKind: { from: from.kind, to: kind }, subject: { from: { id: from.subject.id, name: from.subject.name }, to: { id: target.id, name: target.name } } },
      };
    },
  };
}

async function setup() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'hermes-retarget-'));
  const state = new StateStore(dir);
  await state.load();
  const sent = [];
  const telegram = { sendMessage: async (chatId, text) => { sent.push(text); }, downloadFile: async () => { throw new Error('tidak dipakai'); } };
  const medcoel = fakeServer();
  const importPlans = new ImportPlanFlow({ config: { maxJsonBytes: 5 * 1024 * 1024, pasteTtlMs: 60_000 }, medcoel, telegram, state });
  const retarget = new RetargetFlow({ medcoel, telegram, importPlans });
  const msg = (text) => ({ chat: { id: 1 }, from: { id: 7 }, text });
  const send = (text) => retarget.handleMessage(msg(text), text);
  return { dir, state, sent, medcoel, importPlans, retarget, msg, send };
}

test('parse: /jenis dengan jenis isi, alias, dan banyak kode', () => {
  assert.deepEqual(parseRetargetCommand(`/jenis ${A} materi`), { cmd: 'jenis', codes: [A], contentKind: 'materi' });
  assert.deepEqual(parseRetargetCommand(`/jenis@HermesBot ${A.toLowerCase()} PPT`), { cmd: 'jenis', codes: [A], contentKind: 'materi' });
  assert.deepEqual(parseRetargetCommand(`/jenis ${A} ${B} soal`), { cmd: 'jenis', codes: [A, B], contentKind: 'soal' });
  assert.deepEqual(parseRetargetCommand(`/jenis rec1 materi`), { cmd: 'jenis', codes: ['rec1'], contentKind: 'materi' });
});

test('parse: /matkul ganti mata kuliah saja, daftar, dan penyaring', () => {
  assert.deepEqual(parseRetargetCommand(`/matkul ${A} Ilmu Penyakit Dalam`), { cmd: 'matkul', codes: [A], subject: 'Ilmu Penyakit Dalam' });
  assert.deepEqual(parseRetargetCommand(`/matkul ${A} ${B} "Ilmu Bedah"`), { cmd: 'matkul', codes: [A, B], subject: 'Ilmu Bedah' });
  assert.deepEqual(parseRetargetCommand('/matkul'), { cmd: 'matkul', list: true, query: '' });
  assert.deepEqual(parseRetargetCommand('/matkul bedah'), { cmd: 'matkul', list: true, query: 'bedah' });
});

test('parse: /pindah mengubah jenis isi dan mata kuliah', () => {
  assert.deepEqual(parseRetargetCommand(`/pindah ${A} soal Anatomi`), { cmd: 'pindah', codes: [A], contentKind: 'soal', subject: 'Anatomi' });
  assert.deepEqual(parseRetargetCommand(`/pindah ${A} materi Ilmu\nPenyakit Dalam`), { cmd: 'pindah', codes: [A], contentKind: 'materi', subject: 'Ilmu Penyakit Dalam' });
});

test('parse: salah format memberi petunjuk, perintah lain diabaikan', () => {
  assert.match(parseRetargetCommand('/jenis').error, /Kode pengajuan belum ditulis/);
  assert.match(parseRetargetCommand(`/jenis ${A}`).error, /materi<\/b> atau <b>soal/);
  assert.match(parseRetargetCommand(`/jenis ${A} drilling`).error, /Format: <code>\/jenis KODE materi<\/code>/);
  assert.match(parseRetargetCommand(`/matkul ${A}`).error, /\/matkul<\/code> untuk melihat daftarnya/);
  assert.match(parseRetargetCommand(`/pindah ${A} Anatomi`).error, /jenis isi: <b>materi<\/b> atau <b>soal/);
  assert.match(parseRetargetCommand(`/pindah ${A} soal`).error, /\/jenis KODE materi/);
  const many = Array.from({ length: MAX_CODES + 1 }, (_, i) => `MC261024-${String(i).padStart(4, '0')}`);
  assert.match(parseRetargetCommand(`/jenis ${many.join(' ')} soal`).error, /paling banyak/);
  assert.equal(parseRetargetCommand('/matkulku'), null);
  assert.equal(parseRetargetCommand('/change drilling'), null);
  assert.equal(parseRetargetCommand('/plan'), null);
});

test('/jenis mengubah jenis isi saja dan memberi langkah /put untuk jenis baru', async () => {
  const { dir, send, sent, medcoel } = await setup();
  assert.equal(await send(`/jenis ${A} materi`), true);
  assert.deepEqual(medcoel.calls, [{ id: A, contentKind: 'materi' }]);
  const out = sent.at(-1);
  assert.match(out, /Tujuan pengajuan diubah/);
  assert.match(out, /Jenis isi: 📝 Soal → <b>📚 PPT materi<\/b>/);
  assert.match(out, /Mata kuliah: Anatomi <i>\(tidak berubah\)<\/i>/);
  assert.match(out, /JSON materi: slide \+ penjelasan/);
  assert.equal(medcoel.subs[A].subject.name, 'Anatomi');
  await fs.rm(dir, { recursive: true });
});

test('/matkul mengubah mata kuliah saja', async () => {
  const { dir, send, sent, medcoel } = await setup();
  await send(`/matkul ${A} Ilmu Penyakit Dalam`);
  assert.deepEqual(medcoel.calls, [{ id: A, subject: 'Ilmu Penyakit Dalam' }]);
  assert.match(sent.at(-1), /Mata kuliah: Anatomi → <b>Ilmu Penyakit Dalam<\/b>/);
  assert.match(sent.at(-1), /Jenis isi: 📝 Soal <i>\(tidak berubah\)<\/i>/);
  assert.equal(medcoel.subs[A].contentKind, 'soal');
  await fs.rm(dir, { recursive: true });
});

test('/pindah mengubah jenis isi dan mata kuliah sekaligus', async () => {
  const { dir, send, sent, medcoel } = await setup();
  await send(`/jenis ${A} materi`);
  await send(`/pindah ${A} soal Ilmu Bedah`);
  assert.deepEqual(medcoel.calls.at(-1), { id: A, contentKind: 'soal', subject: 'Ilmu Bedah' });
  assert.match(sent.at(-1), /Jenis isi: 📚 PPT materi → <b>📝 Soal<\/b>/);
  assert.match(sent.at(-1), /Mata kuliah: Anatomi → <b>Ilmu Bedah<\/b>/);
  assert.match(sent.at(-1), /Kampus, cakupan, bahasa, berkas PDF, dan status: tidak berubah/);
  await fs.rm(dir, { recursive: true });
});

test('tidak ada yang berubah: dikabarkan, bukan diulang sebagai perubahan', async () => {
  const { dir, send, sent } = await setup();
  await send(`/jenis ${A} soal`);
  assert.match(sent.at(-1), /Tidak ada perubahan untuk <b>MC261024-ABCD<\/b>: jenis isi sudah 📝 Soal/);
  assert.doesNotMatch(sent.at(-1), /Tujuan pengajuan diubah/);
  await fs.rm(dir, { recursive: true });
});

test('galat server dijelaskan apa adanya: pengajuan selesai, matkul ambigu, matkul tidak ada, kode salah', async () => {
  const { dir, send, sent } = await setup();
  await send('/jenis MC261026-DONE materi');
  assert.match(sent.at(-1), /MC261026-DONE/);
  assert.match(sent.at(-1), /tidak bisa dialihkan/);
  await send(`/matkul ${A} Ilmu`);
  assert.match(sent.at(-1), /cocok dengan beberapa mata kuliah: Ilmu Penyakit Dalam; Ilmu Bedah; Ilmu Kesehatan Anak/);
  await send(`/matkul ${A} Fisika`);
  assert.match(sent.at(-1), /tidak ditemukan/);
  await send('/jenis MC000000-ZZZZ materi');
  assert.match(sent.at(-1), /Pengajuan tidak ditemukan/);
  await fs.rm(dir, { recursive: true });
});

test('beberapa kode: satu ringkasan, yang gagal tidak menghentikan yang lain', async () => {
  const { dir, send, sent, medcoel } = await setup();
  await send(`/jenis ${A} MC261026-DONE ${B} materi`);
  assert.deepEqual(medcoel.calls.map((c) => c.id), [A, 'MC261026-DONE', B]);
  const out = sent.at(-1);
  assert.match(out, /Tujuan diubah untuk 3 pengajuan<\/b> · 2 berubah, 1 gagal/);
  assert.match(out, /✅ <b>MC261024-ABCD<\/b>: 📝 Soal → 📚 PPT materi/);
  assert.match(out, /❌ <b>MC261026-DONE<\/b>/);
  assert.match(out, /✅ <b>MC261025-EFGH<\/b>/);
  assert.equal(medcoel.subs[B].contentKind, 'materi');
  await fs.rm(dir, { recursive: true });
});

test('/matkul tanpa kode menampilkan daftar; dengan kata menyaringnya', async () => {
  const { dir, send, sent, medcoel } = await setup();
  await send('/matkul');
  assert.match(sent.at(-1), /<b>Mata kuliah \(4\)<\/b>/);
  assert.match(sent.at(-1), /• Ilmu Bedah/);
  assert.match(sent.at(-1), /\/matkul KODE NAMA/);
  await send('/matkul bedah');
  assert.match(sent.at(-1), /memuat "bedah" \(1\)/);
  assert.doesNotMatch(sent.at(-1), /Anatomi/);
  await send('/matkul fisika');
  assert.match(sent.at(-1), /Tidak ada mata kuliah yang namanya memuat "fisika"/);
  assert.equal(medcoel.calls.length, 0);
  await fs.rm(dir, { recursive: true });
});

test('rencana impor lama pengajuan itu dibatalkan setelah diubah; rencana pengajuan lain aman', async () => {
  const { dir, send, sent, state, importPlans, msg } = await setup();
  await importPlans.handleMessage(msg(`/put ${A}\n[{"text":"Soal 1"}]`), `/put ${A}\n[{"text":"Soal 1"}]`);
  assert.match(sent.at(-1), /IMPORT PLAN/);
  const other = { chat: { id: 2 }, from: { id: 8 }, text: '' };
  await importPlans.handleMessage({ ...other, text: `/put ${B}\n[{"text":"Soal B"}]` }, `/put ${B}\n[{"text":"Soal B"}]`);
  assert.ok(state.getImportPlan(1, 7));
  assert.ok(state.getImportPlan(2, 8));
  await send(`/jenis ${A} materi`);
  assert.equal(state.getImportPlan(1, 7), null);
  assert.ok(state.getImportPlan(2, 8));
  assert.match(sent.at(-1), /1 rencana impor lama untuk pengajuan ini dibatalkan/);
  assert.match(sent.at(-1), /\/put MC261024-ABCD/);
  await fs.rm(dir, { recursive: true });
});

test('/confirm menolak rencana yang jenis atau mata kuliahnya sudah berubah di server (mis. lewat web admin)', async () => {
  const { dir, sent, state, importPlans, msg, medcoel } = await setup();
  importPlans.medcoel.importDrillingSubmission = async () => { throw new Error('tidak boleh mengimpor'); };
  await importPlans.handleMessage(msg(`/put ${A}\n[{"text":"Soal 1"}]`), `/put ${A}\n[{"text":"Soal 1"}]`);
  medcoel.subs[A].subject = SUBJECTS[2];
  await importPlans.handleMessage(msg('/confirm'), '/confirm');
  assert.match(sent.at(-1), /berubah sejak rencana dibuat/);
  assert.match(sent.at(-1), /Ilmu Bedah/);
  assert.equal(state.getImportPlan(1, 7), null);

  await importPlans.handleMessage(msg(`/put ${A}\n[{"text":"Soal 1"}]`), `/put ${A}\n[{"text":"Soal 1"}]`);
  medcoel.subs[A].contentKind = 'materi';
  await importPlans.handleMessage(msg('/confirm'), '/confirm');
  assert.match(sent.at(-1), /berubah sejak rencana dibuat \(sekarang 📚 PPT materi/);
  await fs.rm(dir, { recursive: true });
});

test('/help menjelaskan tiga perintah baru dan tiap pesan muat di batas Telegram', async () => {
  const { retarget, importPlans } = await setup().then((s) => ({ ...s }));
  const parts = buildHelp({ retargetHelp: retarget.helpText(), importHelp: importPlans.helpText() });
  for (const part of parts) assert.ok(part.length < TELEGRAM_LIMIT, `pesan help ${part.length} karakter`);
  const all = parts.join('\n');
  for (const needle of [
    '/jenis KODE materi', '/jenis KODE soal', '/matkul KODE NAMA MATA KULIAH', '/pindah KODE materi NAMA MATA KULIAH',
    'Mata kuliah tetap', 'Jenis isi tetap', 'Yang tidak kamu sebut tidak berubah', 'belum diimpor', 'rencana impor lama',
    '/matkul</code> — daftar nama mata kuliah', '/change hanya mengatur', '/queue', '/put KODE', '/confirm',
  ]) assert.ok(all.includes(needle), `help harus memuat: ${needle}`);
  assert.ok(parts[0].includes('Ubah tujuan pengajuan'));
});

test('menu perintah bot memuat /jenis, /matkul, dan /pindah dengan deskripsi dalam batas Telegram', () => {
  for (const name of ['jenis', 'matkul', 'pindah']) {
    const c = BOT_COMMANDS.find((x) => x.command === name);
    assert.ok(c, name);
    assert.ok(c.description.length >= 3 && c.description.length <= 256);
    assert.match(c.command, /^[a-z0-9_]{1,32}$/);
  }
});

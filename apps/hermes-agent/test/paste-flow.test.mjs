import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { StateStore } from '../src/state.mjs';
import { ImportPlanFlow } from '../src/import-plan.mjs';
import { newSubmissionMessage, howToSubmit } from '../src/notify.mjs';
import { TELEGRAM_MESSAGE_LIMIT } from '../src/json-paste.mjs';

const SUB = { id: 'rec1', code: 'MC261024-ABCD', status: 'antre', subject: { id: 's1', name: 'Anatomi' }, restriction: 'all', language: 'id', pdfCount: 1, files: [], user: { name: 'Sari', loginId: 'sari.uji' } };

async function setup(status = 'antre') {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'hermes-test-'));
  const state = new StateStore(dir);
  await state.load();
  const sent = [];
  const calls = [];
  const telegram = { sendMessage: async (chatId, text) => { sent.push(text); }, downloadFile: async () => { throw new Error('tidak dipakai'); } };
  const medcoel = {
    getSubmission: async () => ({ ...SUB, status }),
    importDrillingSubmission: async (id, payload) => { calls.push({ id, dryRun: payload.dryRun, text: payload.text }); return { valid: 2, invalid: 0, duplicates: 0, created: payload.dryRun ? 0 : 2 }; },
    importSubmission: async () => { throw new Error('tidak dipakai'); },
  };
  const flow = new ImportPlanFlow({ config: { maxJsonBytes: 5 * 1024 * 1024, pasteTtlMs: 60_000 }, medcoel, telegram, state });
  const msg = (text) => ({ chat: { id: 1 }, from: { id: 7 }, text });
  return { dir, state, sent, calls, flow, msg };
}

test('JSON utuh dalam satu pesan /put langsung jadi rencana impor lalu diimpor lewat /confirm', async () => {
  const { dir, flow, sent, calls, msg } = await setup();
  const json = JSON.stringify([{ text: 'Soal 1' }, { text: 'Soal 2' }]);
  assert.equal(await flow.handleMessage(msg(`/put MC261024-ABCD\n${json}`), `/put MC261024-ABCD\n${json}`), true);
  assert.match(sent.at(-1), /IMPORT PLAN/);
  assert.match(sent.at(-1), /Soal terdeteksi: 2/);
  assert.equal(await flow.handleMessage(msg('/confirm'), '/confirm'), true);
  assert.deepEqual(calls.map((c) => c.dryRun), [true, false]);
  assert.equal(calls[1].text, json);
  assert.match(sent.at(-1), /Import berhasil/);
  await fs.rm(dir, { recursive: true });
});

test('JSON yang dipecah beberapa pesan disambung dan selesai otomatis saat lengkap', async () => {
  const { dir, flow, sent, msg } = await setup();
  await flow.handleMessage(msg('/put MC261024-ABCD'), '/put MC261024-ABCD');
  assert.match(sent.at(-1), /Siap menerima JSON/);
  await flow.handleMessage(msg('[{"text":"A"},'), '[{"text":"A"},');
  assert.match(sent.at(-1), /belum lengkap/);
  await flow.handleMessage(msg('{"text":"B"}]'), '{"text":"B"}]');
  assert.match(sent.at(-1), /IMPORT PLAN/);
  assert.match(sent.at(-1), /Soal terdeteksi: 2/);
  await fs.rm(dir, { recursive: true });
});

test('/put tanpa kode memakai pengajuan yang terakhir diumumkan', async () => {
  const { dir, flow, sent, msg, state } = await setup();
  await state.setLastNotified('MC261024-ABCD');
  await flow.handleMessage(msg('/put'), '/put');
  assert.match(sent.at(-1), /MC261024-ABCD/);
  assert.match(sent.at(-1), /terakhir yang diumumkan/);
  await fs.rm(dir, { recursive: true });
});

test('/put tanpa kode dan tanpa riwayat meminta kode', async () => {
  const { dir, flow, sent, msg } = await setup();
  await flow.handleMessage(msg('/put [1]'), '/put [1]');
  assert.match(sent.at(-1), /Kode pengajuan belum ada/);
  await fs.rm(dir, { recursive: true });
});

test('JSON rusak: /selesai menunjukkan lokasi galat dan sesi tetap terbuka', async () => {
  const { dir, flow, sent, msg } = await setup();
  await flow.handleMessage(msg('/put MC261024-ABCD\n[\n {"a": 1,}\n]'), '/put MC261024-ABCD\n[\n {"a": 1,}\n]');
  await flow.handleMessage(msg('/selesai'), '/selesai');
  assert.match(sent.at(-1), /JSON tidak valid \(baris 2/);
  assert.match(sent.at(-1), /Sesi tempel masih terbuka/);
  await flow.handleMessage(msg('/cancelplan'), '/cancelplan');
  assert.match(sent.at(-1), /dibatalkan/);
  await fs.rm(dir, { recursive: true });
});

test('pengajuan yang masih Menunggu konfirmasi tidak diimpor dan rencana dipertahankan', async () => {
  const { dir, flow, sent, calls, msg, state } = await setup('menunggu_konfirmasi');
  await flow.handleMessage(msg('/put MC261024-ABCD\n[{"text":"A"}]'), '/put MC261024-ABCD\n[{"text":"A"}]');
  await flow.handleMessage(msg('/confirm'), '/confirm');
  assert.match(sent.at(-1), /\/terima MC261024-ABCD/);
  assert.equal(calls.length, 0);
  assert.ok(state.getImportPlan(1, 7));
  await fs.rm(dir, { recursive: true });
});

test('tempelan melebihi batas ditolak', async () => {
  const { dir, flow, sent, msg } = await setup();
  flow.config.maxJsonBytes = 1024;
  await flow.handleMessage(msg('/put MC261024-ABCD'), '/put MC261024-ABCD');
  const big = '[' + '"x",'.repeat(TELEGRAM_MESSAGE_LIMIT);
  await flow.handleMessage(msg(big), big);
  assert.match(sent.at(-1), /melebihi batas/);
  await fs.rm(dir, { recursive: true });
});

test('notifikasi pengajuan baru memuat kode, status, dan perintah pengumpulan', () => {
  const waiting = newSubmissionMessage({ ...SUB, status: 'menunggu_konfirmasi' }, { totalQueuedPdf: 3, estimateDays: 1 });
  assert.match(waiting, /Pengajuan baru masuk/);
  assert.match(waiting, /Menunggu konfirmasi/);
  assert.match(waiting, /<code>\/terima MC261024-ABCD<\/code>/);
  assert.match(waiting, /<code>\/put MC261024-ABCD<\/code>/);
  const queued = howToSubmit('MC261024-ABCD', 'antre');
  assert.doesNotMatch(queued, /\/terima/);
  assert.match(queued, /\/put MC261024-ABCD/);
  assert.match(queued, /\/selesai/);
});

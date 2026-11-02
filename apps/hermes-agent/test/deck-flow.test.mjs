import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { StateStore } from '../src/state.mjs';
import { ImportPlanFlow } from '../src/import-plan.mjs';
import { newSubmissionMessage, queueCard, compactSubmission, howToSubmit, kindLabel } from '../src/notify.mjs';
import { countSlides, detectKind } from '../src/json-paste.mjs';
import { describeFile } from '../src/files.mjs';

const BASE = { id: 'rec2', code: 'MC261102-PPTX', status: 'antre', subject: { id: 's1', name: 'Anatomi' }, restriction: 'campus', campus: { id: 'c1', name: 'FK UNER' }, language: 'id', pdfCount: 2, files: [], user: { name: 'Sari', loginId: 'sari.uji' } };
const MATERI = { ...BASE, contentKind: 'materi', kindLabel: 'PPT materi' };
const DECK = { title: 'Osteologi', slides: [{ image: 'https://lh3.googleusercontent.com/d/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', explanation: '1. a\n\t- b' }, { explanation: 'dua' }] };

async function setup(sub) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'hermes-deck-'));
  const state = new StateStore(dir);
  await state.load();
  const sent = [];
  const calls = { deck: [], soal: [], drilling: [] };
  const telegram = { sendMessage: async (chatId, text) => { sent.push(text); }, downloadFile: async () => { throw new Error('tidak dipakai'); } };
  const medcoel = {
    getSubmission: async () => sub,
    importDeckSubmission: async (id, p) => { calls.deck.push({ id, dryRun: p.dryRun, text: p.text }); return { blocked: false, title: 'Osteologi', slideCount: 2, created: p.dryRun ? 1 : 1, replaced: false, warnings: ['Slide 2: Slide belum punya penjelasan.'] }; },
    importSubmission: async (id, p) => { calls.soal.push(p); return { valid: 1, invalid: 0, duplicates: 0, created: 1 }; },
    importDrillingSubmission: async (id, p) => { calls.drilling.push(p); return { valid: 1, invalid: 0, duplicates: 0, created: 1 }; },
  };
  const flow = new ImportPlanFlow({ config: { maxJsonBytes: 5 * 1024 * 1024, pasteTtlMs: 60_000 }, medcoel, telegram, state });
  const msg = (text) => ({ chat: { id: 1 }, from: { id: 7 }, text });
  return { dir, sent, calls, flow, msg };
}

test('notifikasi menandai jenis isi PDF: PPT materi vs soal', () => {
  assert.equal(kindLabel(MATERI), '📚 PPT materi');
  assert.equal(kindLabel(BASE), '📝 Soal');
  const m = newSubmissionMessage({ ...MATERI, status: 'menunggu_konfirmasi' });
  assert.match(m, /PPT MATERI/);
  assert.match(m, /Isi PDF: 📚 PPT materi/);
  assert.match(m, /JSON materi: slide \+ penjelasan/);
  assert.doesNotMatch(m, /Bahasa:/);
  const s = newSubmissionMessage({ ...BASE, status: 'antre' });
  assert.match(s, /<b>SOAL<\/b>/);
  assert.match(s, /Isi PDF: 📝 Soal/);
  assert.match(queueCard(MATERI), /Isi PDF/);
  assert.match(compactSubmission(MATERI), /PPT materi/);
  assert.doesNotMatch(howToSubmit('K', 'antre', 'soal'), /materi/i);
});

test('nama berkas PPT materi memuat penanda MATERI; soal tidak berubah', () => {
  assert.equal(describeFile('MC1', 0, 2, 'kuliah1.pdf', 'materi').filename, 'MC1_MATERI_PDF-1-dari-2_kuliah1.pdf');
  assert.match(describeFile('MC1', 0, 2, 'kuliah1.pdf', 'materi').caption, /^📚 PPT MATERI · MC1 · PDF 1\/2/);
  assert.equal(describeFile('MC1', 0, 2, 'k.pdf').filename, 'MC1_PDF-1-dari-2_k.pdf');
  assert.equal(describeFile('MC1', 0, 2, 'k.pdf').caption, 'MC1 · PDF 1/2 · k');
});

test('detectKind dan countSlides membedakan JSON materi dan soal', () => {
  assert.equal(detectKind(DECK), 'materi');
  assert.equal(detectKind(DECK.slides), 'materi');
  assert.equal(detectKind([{ type: 'A', text: 'x', options: [] }]), 'soal');
  assert.equal(detectKind({ questions: [] }), 'soal');
  assert.equal(detectKind({ hello: 1 }), 'unknown');
  assert.equal(countSlides(DECK), 2);
  assert.equal(countSlides({ materi: { slides: [1, 2, 3] } }), 3);
});

test('/put untuk PPT materi: rencana, /confirm dry-run lalu impor lewat materi-import, bukan soal', async () => {
  const { dir, flow, sent, calls, msg } = await setup(MATERI);
  const text = `/put MC261102-PPTX\n${JSON.stringify(DECK)}`;
  assert.equal(await flow.handleMessage(msg(text), text), true);
  assert.match(sent.at(-1), /PPT MATERI/);
  assert.match(sent.at(-1), /Slide terdeteksi: 2/);
  assert.match(sent.at(-1), /DRILLING · MATERI/);
  assert.doesNotMatch(sent.at(-1), /\/change chapter/);
  await flow.handleMessage(msg('/confirm'), '/confirm');
  assert.deepEqual(calls.deck.map((c) => c.dryRun), [true, false]);
  assert.equal(calls.soal.length + calls.drilling.length, 0);
  assert.match(sent.at(-1), /Materi berhasil diimpor/);
  assert.match(sent.at(-1), /Slide: 2/);
  assert.match(sent.at(-1), /Slide belum punya penjelasan/);
  await fs.rm(dir, { recursive: true });
});

test('JSON soal untuk pengajuan PPT materi ditolak sebelum rencana dibuat, dan sebaliknya', async () => {
  const a = await setup(MATERI);
  const soal = JSON.stringify([{ type: 'A', text: 'x?', options: ['a', 'b'] }]);
  await a.flow.handleMessage(a.msg(`/put MC261102-PPTX\n${soal}`), `/put MC261102-PPTX\n${soal}`);
  assert.match(a.sent.at(-1), /adalah <b>PPT materi<\/b>, tetapi JSON-nya terlihat seperti soal/);
  await a.flow.handleMessage(a.msg('/plan'), '/plan').catch((e) => assert.match(e.message, /Tidak ada Import Plan/));
  await fs.rm(a.dir, { recursive: true });

  const b = await setup({ ...BASE, contentKind: 'soal' });
  const deck = JSON.stringify(DECK);
  await b.flow.handleMessage(b.msg(`/put MC261102-PPTX\n${deck}`), `/put MC261102-PPTX\n${deck}`);
  assert.match(b.sent.at(-1), /adalah <b>pengajuan soal<\/b>, tetapi JSON-nya terlihat seperti materi/);
  await fs.rm(b.dir, { recursive: true });
});

test('PPT materi tidak bisa dipindah ke BAB atau diubah tujuannya', async () => {
  const { dir, flow, sent, msg } = await setup(MATERI);
  const text = `/put MC261102-PPTX\n${JSON.stringify(DECK)}`;
  await flow.handleMessage(msg(text), text);
  await flow.handleMessage(msg('/change chapter abc'), '/change chapter abc');
  assert.match(sent.at(-1), /tidak bisa dimasukkan ke BAB/);
  await flow.handleMessage(msg('/change drilling'), '/change drilling');
  assert.match(sent.at(-1), /selalu tayang di Drilling/);
  await fs.rm(dir, { recursive: true });
});

test('materi diblokir server: galat per slide ditampilkan dan tidak ada yang diimpor', async () => {
  const { dir, flow, sent, calls, msg } = await setup(MATERI);
  flow.medcoel.importDeckSubmission = async (id, p) => { calls.deck.push({ dryRun: p.dryRun }); return { blocked: true, items: [{ index: 2, errors: ['Slide kosong: isi gambar atau penjelasan.'] }] }; };
  const text = `/put MC261102-PPTX\n${JSON.stringify(DECK)}`;
  await flow.handleMessage(msg(text), text);
  await flow.handleMessage(msg('/confirm'), '/confirm');
  assert.deepEqual(calls.deck.map((c) => c.dryRun), [true]);
  assert.match(sent.at(-1), /Import materi diblokir/);
  assert.match(sent.at(-1), /Slide 2: Slide kosong/);
  await fs.rm(dir, { recursive: true });
});

test('server menjawab 400 untuk materi diblokir: Hermes menampilkan galat per slide, bukan galat HTTP mentah', async () => {
  const { dir, flow, sent, calls, msg } = await setup(MATERI);
  flow.medcoel.importDeckSubmission = async (id, p) => {
    calls.deck.push({ dryRun: p.dryRun });
    const err = new Error('MEDCOEL POST ... failed: HTTP 400 Materi belum bisa diimpor');
    err.status = 400;
    err.body = { blocked: true, items: [{ index: 1, errors: ['Gambar harus tautan lh3.googleusercontent.com'] }, { index: 3, errors: ['Slide kosong'] }] };
    throw err;
  };
  const text = `/put MC261102-PPTX\n${JSON.stringify(DECK)}`;
  await flow.handleMessage(msg(text), text);
  await flow.handleMessage(msg('/confirm'), '/confirm');
  assert.deepEqual(calls.deck.map((c) => c.dryRun), [true]);
  assert.match(sent.at(-1), /Import materi diblokir/);
  assert.match(sent.at(-1), /Slide 1: Gambar harus tautan lh3/);
  assert.match(sent.at(-1), /Slide 3: Slide kosong/);
  assert.doesNotMatch(sent.at(-1), /HTTP 400/);
  await fs.rm(dir, { recursive: true });
});

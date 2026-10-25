import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import test, { after } from 'node:test';

const require = createRequire(import.meta.url);
const service = require('../pb_hooks/lib/explanationService.js');
const savedKey = process.env.OPENAI_API_KEY;
const savedModel = process.env.MEDCOEL_TRANSLATION_MODEL;
process.env.OPENAI_API_KEY = 'local-test-key-never-sent';
process.env.MEDCOEL_TRANSLATION_MODEL = 'test-model';
globalThis.$security = { sha256: (s) => crypto.createHash('sha256').update(s).digest('hex') };
globalThis.BadRequestError = class extends Error {};
globalThis.NotFoundError = class extends Error {};
after(() => {
  if (savedKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = savedKey;
  if (savedModel === undefined) delete process.env.MEDCOEL_TRANSLATION_MODEL; else process.env.MEDCOEL_TRANSLATION_MODEL = savedModel;
  delete globalThis.$security; delete globalThis.$http; delete globalThis.BadRequestError; delete globalThis.NotFoundError;
});

function fixture() {
  const data = { subject: 'subject', chapter: 'chapter', qtype: 'A', stem: 'Soal', answer: 'A', explanation: 'nervus medianus memengaruhi 2 jari.', options: [], subQuestions: [] };
  // PocketBase returns JSON fields encoded, including scalar strings.
  const jsonFields = ['stem', 'explanation', 'options', 'subQuestions', 'statements', 'explanationEnglish'];
  const rec = { id: 'q1', get: (k) => jsonFields.includes(k) ? JSON.stringify(data[k] ?? null) : data[k], getString: (k) => data[k] || '', set: (k, v) => { data[k] = v; } };
  const store = new Map();
  const app = {
    store: () => store,
    findRecordById: (col) => col === 'questions' ? rec : { getString: () => 'Anatomi' },
    findRecordsByFilter: () => [{ getString: () => '' }],
    runInTransaction: (fn) => fn(app), save: () => {},
  };
  const v = service.view(app, rec);
  const body = { sourceHash: v.sourceHash, revision: v.revision, protectedTerms: [], sendConfirmed: true, action: 'review' };
  const output = { segments: [{ id: 'stem', text: 'Question' }, { id: 'explanation', text: 'The nervus medianus affects 2 fingers.' }], notes: ['Check context.'] };
  const response = () => ({ statusCode: 200, json: { status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify(output) }] }] } });
  return { app, rec, data, body, output, response };
}

test('a generated translation is always a draft, then can be reviewed separately', () => {
  const f = fixture();
  globalThis.$http = { send: (req) => {
    assert.equal(req.url, 'https://api.openai.com/v1/responses');
    const body = JSON.parse(req.body);
    assert.equal(body.store, false); assert.equal(body.model, 'test-model');
    assert.ok(JSON.parse(body.input[0].content).segments.some((part) => part.id === 'stem'));
    assert.match(body.instructions, /Translate the prose in question stems/);
    return f.response();
  } };
  const draft = service.generate(f.app, 'q1', f.body, 'admin');
  assert.equal(draft.status, 'draft');
  assert.equal(service.published(f.app, f.rec), null);
  const approved = service.save(f.app, 'q1', { ...f.body, sourceHash: draft.sourceHash, revision: draft.revision, segments: f.output.segments, action: 'review', reviewConfirmed: true }, 'admin');
  assert.equal(approved.status, 'reviewed');
  assert.match(service.published(f.app, f.rec).explanation, /The nervus/);
});

test('manual authoring remains available while the generator requires both configuration values', () => {
  const f = fixture();
  delete process.env.MEDCOEL_TRANSLATION_MODEL;
  try {
    assert.equal(service.view(f.app, f.rec).generatorConfigured, false);
    assert.throws(() => service.generate(f.app, 'q1', f.body, 'admin'), /belum diatur/);
  } finally { process.env.MEDCOEL_TRANSLATION_MODEL = 'test-model'; }
});

test('source edits during generation cannot be overwritten, and failure preserves the previous draft', () => {
  const f = fixture();
  const first = service.save(f.app, 'q1', { ...f.body, action: 'draft', segments: f.output.segments }, 'admin');
  const previous = JSON.stringify(f.data.explanationEnglish);
  globalThis.$http = { send: () => { f.data.stem = 'Sumber diubah admin lain'; return f.response(); } };
  assert.throws(() => service.generate(f.app, 'q1', { ...f.body, revision: first.revision }, 'admin'), /sudah berubah/);
  assert.equal(JSON.stringify(f.data.explanationEnglish), previous);
});

test('generation requires explicit transmission consent and handles provider errors without saving', () => {
  const f = fixture(); let called = false;
  globalThis.$http = { send: () => { called = true; return { statusCode: 429 }; } };
  assert.throws(() => service.generate(f.app, 'q1', { ...f.body, sendConfirmed: false }, 'admin'), /Setujui/);
  assert.equal(called, false);
  assert.throws(() => service.generate(f.app, 'q1', f.body, 'admin'), /429/);
  assert.equal(f.data.explanationEnglish, undefined);
  globalThis.$http = { send: () => { throw new Error('timeout'); } };
  assert.throws(() => service.generate(f.app, 'q1', f.body, 'admin'), /belum merespons/);
  assert.equal(f.data.explanationEnglish, undefined);
});

test('structurally valid but medically protected terms/values changed in AI output remain unpublishable drafts', () => {
  const f = fixture();
  f.output.segments[1].text = 'The median nerve affects 3 fingers.';
  globalThis.$http = { send: f.response };
  const draft = service.generate(f.app, 'q1', f.body, 'admin');
  assert.equal(draft.status, 'draft');
  assert.ok(draft.errors.length >= 2);
  assert.equal(service.published(f.app, f.rec), null);
});

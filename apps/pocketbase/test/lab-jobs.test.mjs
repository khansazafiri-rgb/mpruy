import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
globalThis.BadRequestError = class extends Error {};
globalThis.NotFoundError = class extends Error {};
let sequence = 1;
globalThis.Record = class {
  constructor(collection) { this.collection = collection.name; this.id = String(sequence++).padStart(15, '0'); this.values = {}; }
  get(k) { return this.values[k] ?? null; }
  getString(k) { return this.values[k] ?? ''; }
  getInt(k) { return this.values[k] ?? 0; }
  getBool(k) { return this.values[k] === true; }
  set(k, v) { this.values[k] = v; }
};
const jobs = require('../pb_hooks/lib/labJobs.js');
function db() {
  const records = [];
  return { records,
    findCollectionByNameOrId: (name) => ({ name }),
    findFirstRecordByFilter: (_name, _filter, params) => { const r = records.find((x) => x.getString('key') === params.key); if (!r) throw new Error('missing'); return r; },
    findRecordsByFilter: () => [...records].reverse(),
    save: (r) => { if (!records.includes(r)) records.push(r); },
    runInTransaction(fn) { const before = records.map((r) => [r, structuredClone(r.values)]), n = records.length; try { fn(this); } catch (e) { before.forEach(([r, values]) => { r.values = values; }); records.length = n; throw e; } },
  };
}
const definition = { type: 'dataset_acquisition', dataset: 'octmnist' };

test('create returns promptly, deduplicates and claims only one heavy job', () => {
  const app = db();
  const first = jobs.create(app, definition);
  assert.equal(first.status, 'queued');
  assert.equal(jobs.create(app, definition).key, first.key);
  assert.equal(app.records.length, 1);
  assert.equal(jobs.next(app).job.attempts, 1);
  assert.equal(jobs.next(app).job, null);
  assert.throws(() => jobs.create(app, { type: 'dataset_acquisition', dataset: 'pathmnist' }), /hanya job/i);
  assert.throws(() => jobs.create(app, { ...definition, command: 'rm -rf /' }), /hanya job/i);
});

test('startup recovery keeps stage checkpoints and safely retries an interrupted run', () => {
  const app = db(), key = jobs.create(app, definition).key;
  jobs.next(app);
  jobs.checkpoint(app, key, { attempts: 1, stage: 'checksum', progress: 35, checkpoints: { download: true } });
  assert.equal(jobs.recover(app).recovered, 1);
  assert.equal(jobs.get(app, key).status, 'waiting_retry');
  assert.equal(jobs.next(app).job.attempts, 2);
  assert.equal(jobs.get(app, key).checkpoints.download, true);
  assert.throws(() => jobs.checkpoint(app, key, { attempts: 1, stage: 'select' }), /attempt/);
});

test('failure and cancellation are visible; failed job retry preserves identity', () => {
  const app = db(), key = jobs.create(app, definition).key;
  jobs.next(app);
  jobs.checkpoint(app, key, { attempts: 1, stage: 'checksum', status: 'failed', error: 'MD5 tidak cocok' });
  assert.match(jobs.get(app, key).error, /MD5/);
  assert.equal(jobs.retry(app, key).status, 'queued');
  assert.equal(jobs.next(app).job.attempts, 2);
  assert.equal(jobs.cancel(app, key).cancelRequested, true);
  jobs.checkpoint(app, key, { attempts: 2, status: 'cancelled' });
  assert.equal(jobs.get(app, key).status, 'cancelled');
  assert.throws(() => jobs.retry(app, key), /gagal/);
  assert.equal(jobs.create(app, definition).status, 'queued');
  assert.equal(app.records.length, 1);
});

test('completed result needs validated checkpoint and cannot silently publish', () => {
  const app = db(), key = jobs.create(app, definition).key;
  jobs.next(app);
  assert.throws(() => jobs.checkpoint(app, key, { attempts: 1, status: 'completed', result: { published: true } }), /belum siap/);
  const completed = jobs.checkpoint(app, key, { attempts: 1, stage: 'validate', status: 'completed', checkpoints: Object.fromEntries(jobs.STAGES.map((stage) => [stage, true])), result: { readyForReview: true } });
  assert.equal(completed.status, 'completed');
  assert.deepEqual(completed.result, { readyForReview: true });
  assert.equal(jobs.next(app).job, null);
  assert.equal(jobs.get(app, key).status, 'completed');
});

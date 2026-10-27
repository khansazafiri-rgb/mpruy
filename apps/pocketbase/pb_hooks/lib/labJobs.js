// Single-VPS durable queue. Only predefined job definitions can be submitted.
const HOOKS = typeof __hooks !== 'undefined' ? __hooks : __dirname + '/..';
const u = require(HOOKS + '/lib/util.js');
const STAGES = ['download', 'checksum', 'select', 'export', 'register_media', 'generate_authoring', 'validate'];
const DEFINITIONS = { octmnist: { type: 'dataset_acquisition', key: 'octmnist-224-v1', title: 'OCT Retina Asset Acquisition' } };
function fail(message) { throw new BadRequestError(message); }
function find(app, key) { try { return app.findFirstRecordByFilter('lab_jobs', 'key = {:key}', { key }); } catch (_) { throw new NotFoundError('Job tidak ditemukan.'); } }
function all(app) { return app.findRecordsByFilter('lab_jobs', 'id != ""', '-created', 100, 0); }
function out(r) { return { key: r.getString('key'), type: r.getString('type'), dataset: r.getString('dataset'), status: r.getString('status'), stage: r.getString('stage'), progress: r.getInt('progress'), currentItem: r.getString('currentItem'), totalItems: r.getInt('totalItems'), completedItems: r.getInt('completedItems'), attempts: r.getInt('attempts'), cancelRequested: r.getBool('cancelRequested'), checkpoints: u.recJson(r, 'checkpoints', {}), error: r.getString('error'), result: u.recJson(r, 'result', null), startedAt: r.getString('startedAt'), finishedAt: r.getString('finishedAt'), created: r.getString('created'), updated: r.getString('updated') }; }
function create(app, body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail('Definisi job tidak valid.');
  const def = DEFINITIONS[body?.dataset];
  if (!def || body.type !== def.type || Object.keys(body).some((k) => !['dataset', 'type'].includes(k))) fail('Hanya job akuisisi OCTMNIST yang didukung.');
  let result;
  app.runInTransaction((tx) => {
    let existing; try { existing = find(tx, def.key); } catch (_) { /* no job */ }
    if (existing) {
      if (existing.getString('status') === 'cancelled') { existing.set('status', 'queued'); existing.set('cancelRequested', false); existing.set('error', ''); existing.set('finishedAt', ''); tx.save(existing); }
      result = out(existing); return;
    }
    const r = new Record(tx.findCollectionByNameOrId('lab_jobs'));
    r.set('key', def.key); r.set('type', def.type); r.set('dataset', body.dataset); r.set('status', 'queued'); r.set('stage', 'download'); r.set('progress', 0); r.set('checkpoints', {}); r.set('attempts', 0); r.set('totalItems', 32); r.set('completedItems', 0); tx.save(r); result = out(r);
  }); return result;
}
function list(app) { return { items: all(app).map(out) }; }
function get(app, key) { return out(find(app, key)); }
function cancel(app, key) { let result; app.runInTransaction((tx) => { const r = find(tx, key), status = r.getString('status'); if (status === 'queued' || status === 'waiting_retry') { r.set('status', 'cancelled'); r.set('finishedAt', new Date().toISOString()); } else if (status === 'running') r.set('cancelRequested', true); else fail('Job ini tidak dapat dibatalkan.'); tx.save(r); result = out(r); }); return result; }
function retry(app, key) { let result; app.runInTransaction((tx) => { const r = find(tx, key); if (r.getString('status') !== 'failed') fail('Hanya job gagal yang dapat dicoba lagi.'); r.set('status', 'queued'); r.set('cancelRequested', false); r.set('error', ''); r.set('finishedAt', ''); tx.save(r); result = out(r); }); return result; }
function recover(app) { let recovered = 0; app.runInTransaction((tx) => { for (const r of all(tx)) if (r.getString('status') === 'running') { r.set('status', 'waiting_retry'); r.set('error', 'Worker terhenti; akan dilanjutkan dari checkpoint.'); tx.save(r); recovered++; } }); return { recovered }; }
function next(app) {
  let result = null;
  app.runInTransaction((tx) => {
    if (all(tx).some((r) => r.getString('status') === 'running')) return; // one heavy job on this VPS
    const r = all(tx).filter((x) => ['queued', 'waiting_retry'].includes(x.getString('status'))).reverse()[0];
    if (!r) return;
    r.set('status', 'running'); r.set('attempts', r.getInt('attempts') + 1); r.set('startedAt', new Date().toISOString()); r.set('finishedAt', ''); r.set('error', ''); tx.save(r); result = out(r);
  }); return { job: result };
}
function checkpoint(app, key, body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail('Checkpoint tidak valid.');
  let result;
  app.runInTransaction((tx) => {
    const r = find(tx, key);
    if (r.getString('status') !== 'running' || r.getInt('attempts') !== body?.attempts) fail('Job atau attempt berubah.');
    if (body.stage !== undefined) { if (!STAGES.includes(body.stage)) fail('Stage tidak dikenal.'); r.set('stage', body.stage); }
    if (body.progress !== undefined) { if (!Number.isInteger(body.progress) || body.progress < 0 || body.progress > 100) fail('Progress tidak valid.'); r.set('progress', body.progress); }
    if (body.completedItems !== undefined) { if (!Number.isInteger(body.completedItems) || body.completedItems < 0 || body.completedItems > 32) fail('Jumlah item tidak valid.'); r.set('completedItems', body.completedItems); }
    if (body.currentItem !== undefined) { if (typeof body.currentItem !== 'string' || body.currentItem.length > 100) fail('Item tidak valid.'); r.set('currentItem', body.currentItem); }
    if (body.checkpoints !== undefined) { if (!body.checkpoints || typeof body.checkpoints !== 'object' || Array.isArray(body.checkpoints) || Object.keys(body.checkpoints).some((x) => !STAGES.includes(x) || body.checkpoints[x] !== true)) fail('Checkpoint tidak valid.'); r.set('checkpoints', body.checkpoints); }
    if (body.status === 'completed') { if (r.getBool('cancelRequested') || !body.result || body.result.readyForReview !== true || body.result.published === true || !STAGES.every((stage) => body.checkpoints?.[stage] === true)) fail('Job belum siap selesai.'); r.set('status', 'completed'); r.set('progress', 100); r.set('result', body.result); r.set('finishedAt', new Date().toISOString()); }
    else if (body.status === 'failed' || body.status === 'waiting_retry' || body.status === 'cancelled') { r.set('status', body.status); r.set('error', String(body.error || '').slice(0, 2000)); if (body.status !== 'waiting_retry') r.set('finishedAt', new Date().toISOString()); }
    else if (body.status && body.status !== 'running') fail('Status tidak valid.');
    tx.save(r); result = out(r);
  }); return result;
}
module.exports = { STAGES, DEFINITIONS, create, list, get, cancel, retry, recover, next, checkpoint };

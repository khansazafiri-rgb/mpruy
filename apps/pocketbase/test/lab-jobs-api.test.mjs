// Disposable localhost PocketBase only (PB_URL, PB_SU_EMAIL, PB_SU_PASSWORD).
import assert from 'node:assert/strict';
const base = process.env.PB_URL || 'http://127.0.0.1:8098';
if (!['127.0.0.1', 'localhost', '[::1]'].includes(new URL(base).hostname)) throw new Error('Job API test requires localhost.');
async function call(method, path, body, token, status = 200) {
  const response = await fetch(base + path, { method, headers: { ...(token ? { Authorization: token } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await response.json(); assert.equal(response.status, status, `${method} ${path}: ${JSON.stringify(data)}`); return data;
}
const su = (await call('POST', '/api/collections/_superusers/auth-with-password', { identity: process.env.PB_SU_EMAIL || 'job-test@medcoel.test', password: process.env.PB_SU_PASSWORD || 'job-test-password-123' })).token;
const suffix = Date.now().toString(36), loginId = 'jobadmin' + suffix, password = 'job-local-password-123';
await call('POST', '/api/collections/users/records', { loginId, name: 'Job Test', email: loginId + '@example.test', password, passwordConfirm: password, role: 'admin', verified: true }, su);
const admin = (await call('POST', '/api/collections/users/auth-with-password', { identity: loginId, password })).token;
const studentId = 'jobstudent' + suffix;
await call('POST', '/api/collections/users/records', { loginId: studentId, name: 'Job Student', email: studentId + '@example.test', password, passwordConfirm: password, role: 'user', verified: true }, su);
const student = (await call('POST', '/api/collections/users/auth-with-password', { identity: studentId, password })).token;
const path = '/api/medcoel/admin/lab-jobs';
await call('GET', path, undefined, undefined, 401);
await call('GET', path, undefined, student, 403);
await call('POST', path + '/worker/next', {}, student, 403);
await call('POST', path, { dataset: 'octmnist', type: 'dataset_acquisition', command: 'unsafe' }, admin, 400);
const created = await call('POST', path, { dataset: 'octmnist', type: 'dataset_acquisition' }, admin);
assert.equal(created.status, 'queued');
assert.equal((await call('POST', path, { dataset: 'octmnist', type: 'dataset_acquisition' }, admin)).key, created.key);
assert.equal((await call('GET', path, undefined, admin)).items.length, 1);
const claimed = (await call('POST', path + '/worker/next', {}, admin)).job;
assert.equal(claimed.status, 'running');
assert.equal((await call('POST', path + '/worker/next', {}, admin)).job, null);
await call('POST', `${path}/worker/${created.key}/checkpoint`, { attempts: 1, stage: 'checksum', progress: 35, checkpoints: { download: true } }, admin);
assert.equal((await call('GET', `${path}/${created.key}`, undefined, admin)).progress, 35);
assert.equal((await call('POST', path + '/worker/recover', {}, admin)).recovered, 1);
assert.equal((await call('POST', path + '/worker/next', {}, admin)).job.attempts, 2);
await call('POST', `${path}/worker/${created.key}/checkpoint`, { attempts: 1, stage: 'select' }, admin, 400);
await call('POST', `${path}/worker/${created.key}/checkpoint`, { attempts: 2, status: 'failed', error: 'fixture failure' }, admin);
assert.equal((await call('POST', `${path}/${created.key}/retry`, {}, admin)).status, 'queued');
assert.equal((await call('POST', `${path}/${created.key}/cancel`, {}, admin)).status, 'cancelled');
const source = { schemaVersion: 1, records: [{ kind: 'source', data: {
  key: 'oct-source-' + suffix, title: 'OCT source', role: 'asset', ingestionAllowed: true,
  url: 'https://zenodo.org/records/10519652', license: { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/', citation: 'Fixture', verified: false, commercialUse: true, redistribution: true },
} }] };
const preview = await call('POST', '/api/medcoel/admin/lab-authoring/preview', source, admin);
assert.equal(preview.ok, true);
await call('POST', '/api/medcoel/admin/lab-authoring/apply', { bundle: source, token: preview.token }, admin);
const form = new FormData();
form.set('key', 'oct-image-' + suffix); form.set('title', 'OCT image'); form.set('alt', 'Fixture image'); form.set('sourceKey', source.records[0].data.key);
form.set('file', new Blob([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9WMhEAAAAASUVORK5CYII=', 'base64')], { type: 'image/png' }), 'fixture.png');
const uploadResponse = await fetch(base + '/api/medcoel/admin/lab-authoring/media', { method: 'POST', headers: { Authorization: admin }, body: form });
const uploaded = await uploadResponse.json();
assert.equal(uploadResponse.status, 200, JSON.stringify(uploaded));
assert.equal(uploaded.status, 'draft');
await call('POST', `/api/medcoel/admin/lab-authoring/media/${uploaded.key}/publish`, { revision: 1, confirmReviewed: true }, admin, 400);
console.log('Job API: auth, queue, duplicate, single claim, checkpoint, recovery, stale attempt, retry and cancellation passed.');

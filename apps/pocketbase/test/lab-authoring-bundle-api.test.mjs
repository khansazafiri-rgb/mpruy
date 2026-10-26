// Run only against a disposable PocketBase on localhost (PB_URL, PB_SU_EMAIL, PB_SU_PASSWORD).
import assert from 'node:assert/strict';
const base = process.env.PB_URL || 'http://127.0.0.1:8099';
if (!['127.0.0.1', 'localhost', '[::1]'].includes(new URL(base).hostname)) throw new Error('Bundle API test requires localhost.');
async function call(method, path, body, token, status = 200) {
  const response = await fetch(base + path, { method, headers: { ...(token ? { Authorization: token } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await response.json(); assert.equal(response.status, status, `${method} ${path}: ${JSON.stringify(data)}`); return data;
}
const su = (await call('POST', '/api/collections/_superusers/auth-with-password', { identity: process.env.PB_SU_EMAIL || 'bundle-test@medcoel.test', password: process.env.PB_SU_PASSWORD || 'bundle-test-password-123' })).token;
const suffix = Date.now().toString(36), loginId = 'bundleadmin' + suffix, password = 'bundle-local-password-123';
await call('POST', '/api/collections/users/records', { loginId, name: 'Bundle Test', email: loginId + '@example.test', password, passwordConfirm: password, role: 'admin', verified: true }, su);
const admin = (await call('POST', '/api/collections/users/auth-with-password', { identity: loginId, password })).token;
const api = (name) => '/api/medcoel/admin/lab-authoring/' + name;
const key = (name) => name + '-' + suffix;
const good = { schemaVersion: 1, records: [
  { kind: 'catalog', data: { key: key('root'), title: 'Root' } },
  { kind: 'catalog', data: { key: key('child'), title: 'Child', parent: key('root') } },
  { kind: 'module', data: { key: key('module'), title: 'Module', sources: [], chapters: [{ key: 'chapter', title: 'Chapter', sections: [{ key: 'section', title: 'Section', blocks: [{ key: 'text', type: 'text', text: 'Safe content.' }] }] }], questionBanks: [], pathways: [] } },
  { kind: 'placement', data: { key: key('placement'), title: 'Module', module: key('module'), catalog: key('child') } },
] };
let preview = await call('POST', api('preview'), good, admin);
assert.equal(preview.ok, true);
let applied = await call('POST', api('apply'), { bundle: good, token: preview.token }, admin);
assert.equal(applied.published, false); assert.equal(applied.bundle.records.length, 4);
assert.equal((await call('GET', '/api/medcoel/lab/catalog', undefined, admin)).modules.some((m) => m.key === key('module')), false);
let review = await call('POST', api('bundle/review'), applied.bundle, admin);
assert.equal(review.ready, true, JSON.stringify(review.problems));
assert.deepEqual(review.items.map((x) => x.kind), ['catalog', 'catalog', 'module', 'placement']);
await call('POST', api('bundle/publish'), { bundle: applied.bundle, token: review.token, confirmReviewed: false }, admin, 400);
let published = await call('POST', api('bundle/publish'), { bundle: applied.bundle, token: review.token, confirmReviewed: true }, admin);
assert.equal(published.published, 4);
assert.equal((await call('GET', '/api/medcoel/lab/catalog', undefined, admin)).modules.some((m) => m.key === key('module')), true);
review = await call('POST', api('bundle/review'), applied.bundle, admin);
assert.equal((await call('POST', api('bundle/publish'), { bundle: applied.bundle, token: review.token, confirmReviewed: true }, admin)).published, 0);

const blocked = { schemaVersion: 1, records: [
  { kind: 'source', data: { key: key('source'), title: 'Source', role: 'asset', ingestionAllowed: true, url: 'https://example.org/source', license: { name: 'CC BY', url: 'https://example.org/license', citation: 'Test', verified: false, commercialUse: true, redistribution: true } } },
  { kind: 'module', data: { key: key('blocked-module'), title: 'Blocked', sources: [key('source')], chapters: [{ key: 'chapter', title: 'Chapter', sections: [{ key: 'section', title: 'Section', blocks: [{ key: 'text', type: 'text', text: 'Content.' }] }] }], questionBanks: [], pathways: [] } },
] };
preview = await call('POST', api('preview'), blocked, admin); assert.equal(preview.ok, true);
applied = await call('POST', api('apply'), { bundle: blocked, token: preview.token }, admin);
review = await call('POST', api('bundle/review'), applied.bundle, admin);
assert.equal(review.ready, false); assert.ok(review.problems.some((s) => s.includes('Lisensi aset belum siap')));
await call('POST', api('bundle/publish'), { bundle: applied.bundle, token: review.token, confirmReviewed: true }, admin, 400);
assert.equal((await call('GET', '/api/medcoel/lab/catalog', undefined, admin)).modules.some((m) => m.key === key('blocked-module')), false);
console.log('Bundle API: draft isolation, review, atomic publication, blocked license and repeat publish passed.');

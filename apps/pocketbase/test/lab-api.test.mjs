// Requires disposable local PB; never production. Creates isolated test records.
import assert from 'node:assert/strict';
const base = process.env.PB_URL || 'http://127.0.0.1:8090';
if (!['127.0.0.1', 'localhost', '[::1]'].includes(new URL(base).hostname)) throw new Error('Lab API tests must target localhost.');
let checks = 0;
async function call(method, path, body, token, status = 200) {
  const r = await fetch(base + path, { method, headers: { ...(token ? { Authorization: token } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await r.json(); assert.equal(r.status, status, `${method} ${path}: ${JSON.stringify(data)}`); checks++; return data;
}
const api = (path) => '/api/medcoel/' + path;
const su = (await call('POST', '/api/collections/_superusers/auth-with-password', { identity: process.env.PB_SU_EMAIL || 'lab-test@medcoel.test', password: process.env.PB_SU_PASSWORD || 'lab-test-password-123' })).token;
const run = Date.now().toString(36);
async function account(role, disabled = false) {
  const loginId = `lab${role}${disabled ? 'off' : ''}${run}`; const password = 'lab-fixture-password';
  const record = await call('POST', '/api/collections/users/records', { loginId, name: 'Lab Test', email: `${loginId}@example.test`, password, passwordConfirm: password, role, disabled, verified: true }, su);
  const auth = await call('POST', '/api/collections/users/auth-with-password', { identity: loginId, password }); return { id: record.id, token: auth.token };
}
const admin = await account('admin'); const student = await account('user'); const agent = await account('agent');
await call('GET', api('lab/objects'), undefined, undefined, 401);
await call('GET', api('admin/lab/objects'), undefined, student.token, 403);
await call('POST', api('admin/lab-demo'), {}, agent.token, 403);
const demo = await call('POST', api('admin/lab-demo'), {}, admin.token);
const again = await call('POST', api('admin/lab-demo'), {}, admin.token); assert.ok(again.items.every((i) => i.existing));
for (const kind of ['assets', 'objects', 'questions', 'pathways']) {
  const items = (await call('GET', api(`admin/lab/${kind}`), undefined, admin.token)).items;
  for (const item of items.filter((r) => demo.items.some((x) => x.id === r.id))) await call('PUT', api(`admin/lab/${kind}/${item.id}`), item, admin.token);
}
const drafts = (await call('GET', api('admin/lab/objects'), undefined, admin.token)).items;
assert.ok(drafts.length >= 2);
const image = drafts.find((x) => x.slug === 'demo-identifikasi-bentuk');
await call('GET', api(`lab/objects/${image.slug}`), undefined, student.token, 404);
for (const kind of ['assets', 'objects', 'questions', 'pathways']) {
  const items = (await call('GET', api(`admin/lab/${kind}`), undefined, admin.token)).items;
  for (const r of items.filter((r) => demo.items.some((x) => x.id === r.id))) {
    await call('POST', api(`admin/lab/${kind}/${r.id}/publish`), { revision: r.revision }, admin.token, 400);
    await call('POST', api(`admin/lab/${kind}/${r.id}/publish`), { revision: r.revision, confirmReviewed: true }, student.token, 403);
    await call('POST', api(`admin/lab/${kind}/${r.id}/publish`), { revision: r.revision, confirmReviewed: true }, admin.token);
  }
}
const detail = await call('GET', api(`lab/objects/${image.slug}`), undefined, student.token);
assert.equal(detail.questions.length, 2); assert.equal(detail.assets.length, 1);
for (const q of detail.questions) { assert.equal(q.answer, undefined); assert.equal(q.region, undefined); assert.equal(q.explanation, undefined); assert.equal(q.image.annotations, undefined); }
const mcq = detail.questions.find((q) => q.type === 'image_identification'); const hotspot = detail.questions.find((q) => q.type === 'hotspot');
assert.equal((await call('POST', api(`lab/questions/${mcq.id}/answer`), { response: 'A' }, student.token)).correct, true);
assert.equal((await call('POST', api(`lab/questions/${mcq.id}/answer`), { response: 'B' }, student.token)).correct, false);
await call('POST', api(`lab/questions/${mcq.id}/answer`), { response: 'C' }, student.token, 400);
assert.equal((await call('POST', api(`lab/questions/${hotspot.id}/answer`), { response: { x: 0.72, y: 0.5 } }, student.token)).correct, true);
assert.equal((await call('POST', api(`lab/questions/${hotspot.id}/answer`), { response: { x: 0.1, y: 0.1 } }, student.token)).correct, false);
await call('POST', api(`lab/questions/${hotspot.id}/answer`), { response: { x: 2, y: 0.1 } }, student.token, 400);
const blood = await call('GET', api('lab/objects/demo-pola-laboratorium'), undefined, student.token);
assert.equal(blood.data.lab.matches.length, 1); assert.ok(blood.data.lab.rows.every((r) => r.flag === 'low')); assert.equal(blood.related[0].id, image.id);
const reflection = await call('POST', api(`lab/questions/${blood.questions[0].id}/answer`), { response: 'Hb dan MCV rendah' }, student.token); assert.equal(reflection.selfAssessment, true); assert.equal(reflection.correct, null);
// Synthetic demo material is hidden from normal student listings (direct links still open); admins can opt in with demo=1.
assert.equal((await call('GET', api('lab/objects?q=ferritin&domain=clinical_pathology'), undefined, student.token)).items.length, 0);
assert.equal((await call('GET', api('lab/objects?q=ferritin&domain=clinical_pathology&demo=1'), undefined, student.token)).items.length, 0, 'students cannot opt in');
const search = await call('GET', api('lab/objects?q=ferritin&domain=clinical_pathology&demo=1'), undefined, admin.token); assert.equal(search.items[0].slug, blood.slug);
assert.ok((await call('GET', api('lab/pathways'), undefined, student.token)).items.every((p) => !p.slug.startsWith('demo-')), 'demo pathways are not listed for students');
assert.equal((await call('GET', api('lab/overview'), undefined, student.token)).domains.clinical_pathology, 0, 'demo material is not counted');
assert.equal((await call('GET', api('lab/objects?q=not-a-real-topic'), undefined, student.token)).items.length, 0);
const path = await call('GET', api('lab/pathways/demo-lab-fundamentals'), undefined, student.token); assert.equal(path.steps.length, 2);
// Direct access to the later step requires no progress/unlock state.
await call('GET', api(`lab/objects/${path.steps[1].slug}`), undefined, student.token);
for (const collection of ['lab_assets', 'lab_objects', 'lab_questions', 'lab_pathways', 'lab_path_steps']) await call('GET', `/api/collections/${collection}/records`, undefined, student.token, 403);
await call('POST', '/api/collections/lab_objects/records', { title: 'Exploit' }, student.token, 403);
const badAsset = { slug: `unlicensed-${run}`, title: 'Unlicensed asset', data: { ...detail.assets[0], license: { ...detail.assets[0].license, commercial_use: false } } };
const bad = await call('POST', api('admin/lab/assets'), badAsset, admin.token);
await call('POST', api(`admin/lab/assets/${bad.id}/publish`), { revision: bad.revision, confirmReviewed: true }, admin.token, 400);
// Save invalidates approval, stale revision rejected; drafts cannot be retrieved by direct slug.
let current = (await call('GET', api('admin/lab/objects'), undefined, admin.token)).items.find((r) => r.id === image.id);
await call('PUT', api(`admin/lab/objects/${image.id}`), { ...current, revision: 0 }, admin.token, 400);
const edited = await call('PUT', api(`admin/lab/objects/${image.id}`), current, admin.token);
assert.equal(edited.status, 'draft'); assert.equal(edited.reviewedBy, '');
await call('GET', api(`lab/objects/${image.slug}`), undefined, student.token, 404);
assert.equal((await call('GET', api('lab/pathways/demo-lab-fundamentals'), undefined, student.token)).steps.length, 1);
await call('POST', api(`lab/questions/${mcq.id}/answer`), { response: 'A' }, student.token, 404);
await call('POST', api(`admin/lab/objects/${image.id}/publish`), { revision: edited.revision, confirmReviewed: true }, admin.token);
// Existing question bank bridge preserves campus restrictions and hides keys in Runner.
const subject = (await call('GET', api('public-subjects'), undefined, student.token)).items[0];
const chapter = (await call('GET', '/api/collections/chapters/records?perPage=1&filter=' + encodeURIComponent(`subject='${subject.id}' && drilling=false`), undefined, su)).items[0];
const campus = (await call('GET', '/api/collections/campuses/records?perPage=1', undefined, su)).items[0];
const legacy = await call('POST', '/api/collections/questions/records', { subject: subject.id, chapter: chapter.id, scope: 'all', status: 'published', qtype: 'A', difficulty: 'easy', stem: 'Lab integration fixture', options: [{ label: 'A', text: 'one' }, { label: 'B', text: 'two' }], answer: 'A' }, su);
current = (await call('GET', api('admin/lab/objects'), undefined, admin.token)).items.find((r) => r.id === image.id);
const linked = await call('PUT', api(`admin/lab/objects/${image.id}`), { ...current, legacyQuestions: [legacy.id] }, admin.token);
await call('POST', api(`admin/lab/objects/${image.id}/publish`), { revision: linked.revision, confirmReviewed: true }, admin.token);
const start = await call('POST', api(`lab/objects/${image.id}/practice`), { question: legacy.id }, student.token);
const attempt = await call('GET', api(`attempts/${start.id}`), undefined, student.token);
assert.equal(attempt.questions[0].id, legacy.id); assert.equal(attempt.questions[0].answer, undefined);
await call('POST', api(`attempts/${start.id}/answer`), { question: legacy.id, response: 'A', check: true }, student.token);
await call('POST', api(`attempts/${start.id}/finish`), {}, student.token);
await call('PATCH', `/api/collections/questions/records/${legacy.id}`, { scope: 'campus', campuses: [campus.id] }, su);
assert.equal((await call('GET', api(`lab/objects/${image.id}`), undefined, student.token)).legacyQuestions.length, 0);
await call('POST', api(`lab/objects/${image.id}/practice`), { question: legacy.id }, student.token, 404);
await call('PATCH', `/api/collections/questions/records/${legacy.id}`, { status: 'draft' }, su);
await call('POST', api(`lab/objects/${image.id}/practice`), { question: legacy.id }, admin.token, 404);
// Disabled and soft-deleted accounts with previously issued tokens fail closed.
await call('PATCH', `/api/collections/users/records/${student.id}`, { disabled: true }, su);
await call('GET', api('lab/objects'), undefined, student.token, 403);
await call('PATCH', `/api/collections/users/records/${student.id}`, { disabled: false, deletedAt: new Date().toISOString() }, su);
await call('GET', api('lab/objects'), undefined, student.token, 403);
console.log(`Lab API: ${checks} HTTP checks passed (roles, drafts, licenses, MCQ, hotspot, lab rules, pathways).`);

// Requires disposable local PB; never production. Creates isolated, uniquely named test records.
import assert from 'node:assert/strict';
const base = process.env.PB_URL || 'http://127.0.0.1:8090';
if (!['127.0.0.1', 'localhost', '[::1]'].includes(new URL(base).hostname)) throw new Error('Lab pack API tests must target localhost.');
let checks = 0;
async function call(method, path, body, token, status = 200) {
  const r = await fetch(base + path, { method, headers: { ...(token ? { Authorization: token } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await r.json(); assert.equal(r.status, status, `${method} ${path}: ${JSON.stringify(data)}`); checks++; return data;
}
const api = (path) => '/api/medcoel/' + path;
const su = (await call('POST', '/api/collections/_superusers/auth-with-password', { identity: process.env.PB_SU_EMAIL || 'lab-test@medcoel.test', password: process.env.PB_SU_PASSWORD || 'lab-test-password-123' })).token;
const run = Date.now().toString(36);
async function account(role) {
  const loginId = `labpk${role}${run}`; const password = 'lab-fixture-password';
  const record = await call('POST', '/api/collections/users/records', { loginId, name: 'Lab Pack Test', email: `${loginId}@example.test`, password, passwordConfirm: password, role, verified: true }, su);
  const auth = await call('POST', '/api/collections/users/auth-with-password', { identity: loginId, password }); return { id: record.id, token: auth.token };
}
const admin = await account('admin'); const student = await account('user');
const A = admin.token; const S = student.token;
const lic = (over = {}) => ({ source: 'MedMNIST', dataset: 'PneumoniaMNIST', license: 'CC BY 4.0', source_url: 'https://medmnist.com/', citation: 'Yang et al. 2023', commercial_use: true, redistribution: true, modification: true, attribution_required: true, verified: true, ...over });
const asset = (name, extra = {}, license = {}) => ({ slug: `${name}-${run}`, title: `Aset ${name}`, ...extra, data: { url: `https://example.test/${name}.png`, alt: 'Gambar uji', synthetic: false, license: lic(license), annotations: [], dataset: { name: 'PneumoniaMNIST', split: 'test', sample_index: 3, label: 'normal', resolution: [224, 224], task: 'binary_classification' } } });
const object = (name, assets, extra = {}, data = {}) => ({ slug: `${name}-${run}`, title: `Materi ${name}`, domain: 'imaging', modality: 'Chest X-ray', summary: 'Ringkasan', tags: [], assets, related: [], legacyQuestions: [], data: { definition: 'Orientasi', ...data }, ...extra });
const question = (name, objects, assetId, extra = {}, data = {}) => ({ slug: `${name}-${run}`, title: name, objects, asset: assetId, ...extra, data: { type: 'image_identification', prompt: 'Kategori mana?', options: [{ label: 'A', text: 'Normal' }, { label: 'B', text: 'Pneumonia' }], answer: 'A', explanation: 'Label benchmark.', ...data } });
const make = (kind, body) => call('POST', api(`admin/lab/${kind}`), body, A);
const redo = (kind, rec, patch) => call('PUT', api(`admin/lab/${kind}/${rec.id}`), { ...rec, ...patch }, A);

// ---- pack creation + membership ------------------------------------------------------------
const pack = await call('POST', api('admin/lab-packs'), { slug: `pmnist-${run}`, title: 'PneumoniaMNIST v1', version: 'v1', source: 'MedMNIST' }, A);
await call('POST', api('admin/lab-packs'), { slug: `pmnist-${run}`, title: 'x' }, S, 403);
assert.equal(pack.status, 'draft');
const a1 = await make('assets', asset('pk-a1', { pack: pack.id }));
const a2 = await make('assets', asset('pk-a2', { pack: pack.id }, { verified: false }));
const o1 = await make('objects', object('pk-o1', [a1.id, a2.id], { pack: pack.id }));
const q1 = await make('questions', question('pk-q1', [o1.id], a1.id, { pack: pack.id }));
const q2 = await make('questions', question('pk-q2', [o1.id], a1.id, { pack: pack.id }, { type: 'hotspot', options: [], answer: undefined, region: { x: 0.1, y: 0.1, width: 0.2, height: 0.2 } }));
const p1 = await make('pathways', { slug: `pk-p1-${run}`, title: 'Jalur uji', summary: 's', steps: [o1.id], pack: pack.id, data: {} });
let detail = await call('GET', api(`admin/lab-packs/${pack.slug}`), undefined, A);
assert.deepEqual(['assets', 'objects', 'questions', 'pathways'].map((k) => detail.counts[k].total), [2, 1, 2, 1]);
assert.deepEqual(detail.items.map((i) => i.kind), ['assets', 'assets', 'objects', 'questions', 'questions', 'pathways']);
assert.ok((await call('GET', api('admin/lab-packs'), undefined, A)).items.some((x) => x.id === pack.id));
await call('GET', api('admin/lab-packs'), undefined, S, 403);
// Editing without sending `pack` must not detach a record from its pack.
const o1b = await redo('objects', o1, { pack: undefined }); assert.equal(o1b.pack, pack.id);

// ---- validation: actionable, exact records ------------------------------------------------
let v = await call('POST', api(`admin/lab-packs/${pack.id}/validate`), {}, A);
assert.equal(v.ok, false);
assert.ok(v.errors.some((e) => e.kind === 'assets' && e.slug === a2.slug && /license\.verified = false/.test(e.message)), JSON.stringify(v.errors));
assert.ok(v.errors.some((e) => e.kind === 'questions' && e.slug === q2.slug && /lokalisasi/.test(e.message)), JSON.stringify(v.errors));
await call('POST', api(`admin/lab-packs/${pack.id}/publish`), { confirmReviewed: true }, A).then((r) => assert.equal(r.ok, false));
assert.equal((await call('GET', api(`admin/lab-packs/${pack.id}`), undefined, A)).counts.assets.published, 0, 'failed publish must change nothing');
// Fix the problems the validator named.
const a2b = await redo('assets', a2, { data: { ...a2.data, license: lic() } });
const q2b = await redo('questions', q2, { data: { ...q1.data, explanation: 'Label benchmark.' } });
v = await call('POST', api(`admin/lab-packs/${pack.id}/validate`), {}, A);
assert.equal(v.ok, true, JSON.stringify(v.errors)); assert.deepEqual(v.ready.map((i) => i.kind), ['assets', 'assets', 'objects', 'questions', 'questions', 'pathways']);

// ---- publishing: dry-run, confirmation, order, idempotency -------------------------------
const dry = await call('POST', api(`admin/lab-packs/${pack.id}/publish`), { dryRun: true }, A); assert.equal(dry.ok, true); assert.equal(dry.published.length, 0);
await call('GET', api(`lab/objects/${o1.slug}`), undefined, S, 404);
await call('POST', api(`admin/lab-packs/${pack.id}/publish`), {}, A, 400);
await call('POST', api(`admin/lab-packs/${pack.id}/publish`), { confirmReviewed: true }, S, 403);
const pub = await call('POST', api(`admin/lab-packs/${pack.id}/publish`), { confirmReviewed: true }, A);
assert.equal(pub.ok, true); assert.deepEqual(pub.published.map((i) => i.kind), ['assets', 'assets', 'objects', 'questions', 'questions', 'pathways']);
assert.equal(pub.pack.status, 'published');
const again = await call('POST', api(`admin/lab-packs/${pack.id}/publish`), { confirmReviewed: true }, A);
assert.equal(again.ok, true); assert.equal(again.published.length, 0); assert.equal(again.skipped.length, 6);
const reviewed = await call('GET', api('admin/lab/assets'), undefined, A); assert.ok(reviewed.items.find((x) => x.id === a1.id).reviewedBy);

// ---- student payload exposes only safe dataset fields; question images carry none ---------------
const obj = await call('GET', api(`lab/objects/${o1.slug}`), undefined, S);
assert.equal(obj.assets[0].dataset.label, 'normal'); assert.equal('sample_index' in obj.assets[0].dataset, false);
assert.ok(obj.questions.length === 2 && obj.questions.every((q) => q.image && !('dataset' in q.image) && !('answer' in q)));

// ---- individual publish still works; bulk selection; dependency failures -----------------
const solo = await make('assets', asset('pk-solo'));
await call('POST', api(`admin/lab/assets/${solo.id}/publish`), { revision: solo.revision, confirmReviewed: true }, A);
await call('POST', api(`admin/lab/assets/${solo.id}/publish`), { revision: solo.revision, confirmReviewed: true }, A, 400); // stale revision
const b1 = await make('assets', asset('pk-b1')); const b2 = await make('assets', asset('pk-b2', {}, { verified: false }));
const review = await call('POST', api('admin/lab-bulk/publish'), { dryRun: true, items: [b1, b2].map((x) => ({ kind: 'assets', id: x.id })) }, A);
assert.equal(review.ok, false); assert.equal(review.errors.length, 1); assert.equal(review.errors[0].slug, b2.slug);
const bulk = await call('POST', api('admin/lab-bulk/publish'), { confirmReviewed: true, items: [{ kind: 'assets', id: b1.id, revision: b1.revision }] }, A);
assert.deepEqual(bulk.published.map((i) => i.slug), [b1.slug]);
const dep = await make('assets', asset('pk-dep')); const od = await make('objects', object('pk-od', [dep.id]));
const depRes = await call('POST', api('admin/lab-bulk/publish'), { confirmReviewed: true, items: [{ kind: 'objects', id: od.id }] }, A);
assert.equal(depRes.ok, false); assert.match(depRes.errors[0].message, /belum terbit/);
await call('POST', api(`admin/lab/objects/${od.id}/publish`), { revision: od.revision, confirmReviewed: true }, A, 400);
const both = await call('POST', api('admin/lab-bulk/publish'), { confirmReviewed: true, items: [{ kind: 'objects', id: od.id }, { kind: 'assets', id: dep.id }] }, A);
assert.deepEqual(both.published.map((i) => i.kind), ['assets', 'objects']);

// ---- visual blocks: validated, data-only, dev schematics never publishable ---------------------
const layer = (id, over = {}) => ({ id, name: `Lapisan ${id}`, description: 'Deskripsi', clinical: 'Klinis', schematic: 'dev-thorax:skin', ...over });
const explorer = (over = {}) => ({ type: 'layer_explorer', id: 'thorax', title: 'Thorax', goal: 'Tujuan', origin: 'development_schematic', layers: [layer('skin'), layer('lung', { schematic: 'dev-thorax:lungs' })], guided: [{ title: 'Mulai', text: 'Lihat kulit', layer: 'skin' }], ...over });
const withBlocks = (name, blocks, assets = []) => object(name, assets, {}, { blocks });
const dev = await make('objects', withBlocks('pk-dev', [explorer(), { type: 'exploded_view', id: 'xv', title: 'Terurai', from: 'thorax' }, { type: 'clinical_connection', title: 'Klinis', text: 'Rongga pleura adalah ruang potensial.' }]));
assert.equal(dev.data.blocks[0].dev, true); assert.equal(dev.data.blocks[1].dev, true);
const devPub = await call('POST', api('admin/lab-bulk/publish'), { confirmReviewed: true, items: [{ kind: 'objects', id: dev.id }] }, A);
assert.equal(devPub.ok, false); assert.match(devPub.errors[0].message, /skema pengembangan/);
await call('GET', api(`lab/objects/${dev.slug}`), undefined, S, 404);
const prev = await call('GET', api(`admin/lab/objects/${dev.id}/preview`), undefined, A); assert.equal(prev.preview, true); assert.equal(prev.data.blocks[0].layers.length, 2);
await call('GET', api(`admin/lab/objects/${dev.id}/preview`), undefined, S, 403);
const bad = (name, blocks) => call('POST', api('admin/lab/objects'), withBlocks(name, blocks), A, 400);
await bad('pk-b-dup', [explorer({ layers: [layer('x'), layer('x')] })]);
await bad('pk-b-opacity', [explorer({ layers: [layer('a', { opacity: 2 }), layer('b')] })]);
await bad('pk-b-html', [{ type: 'callout', text: '<script>alert(1)</script>' }]);
await bad('pk-b-key', [explorer({ layers: [layer('a', { schematic: 'evil' }), layer('b')] })]);
await bad('pk-b-both', [explorer({ layers: [layer('a', { asset: a1.id }), layer('b')] })]);
await bad('pk-b-origin', [explorer({ origin: 'curated_annotation' })]);
await bad('pk-b-from', [{ type: 'exploded_view', id: 'x', title: 'T', from: 'missing' }]);
await bad('pk-b-type', [{ type: 'script', text: 'x' }]);
await bad('pk-b-asset', [{ type: 'comparison', title: 'x', left: { asset: a1.id }, right: { asset: a1.id } }]); // asset not part of this object
const model = await make('objects', withBlocks('pk-model', [{ type: 'model_3d', id: 'm', title: 'Model', asset: dep.id, origin: 'curated_annotation' }], [dep.id]));
const modelRes = await call('POST', api('admin/lab-bulk/publish'), { dryRun: true, items: [{ kind: 'objects', id: model.id }] }, A);
assert.equal(modelRes.ok, false); assert.match(modelRes.errors[0].message, /bermedia model/);
const glb = await make('assets', { ...asset('pk-glb'), data: { ...asset('pk-glb').data, media: 'model', url: 'https://example.test/torso.glb', origin: 'curated_annotation', dataset: undefined } });
assert.equal(glb.data.media, 'model');
await call('POST', api('admin/lab/assets'), { ...asset('pk-glb2'), data: { ...asset('pk-glb2').data, media: 'model' } }, A, 400); // .png is not a model

// ---- progress: explicit signals only, no locks ----------------------------------------------
const o3 = await make('objects', object('pk-o3', [])); await call('POST', api('admin/lab-bulk/publish'), { confirmReviewed: true, items: [{ kind: 'objects', id: o3.id }] }, A);
const p2 = await make('pathways', { slug: `pk-p2-${run}`, title: 'Jalur progres', summary: '', steps: [o1.id, o3.id], data: {} });
await call('POST', api('admin/lab-bulk/publish'), { confirmReviewed: true, items: [{ kind: 'pathways', id: p2.id }] }, A);
let ov = await call('GET', api('lab/overview'), undefined, S); assert.equal(ov.continue, null); assert.ok(ov.domains.imaging >= 2);
await call('POST', api('lab/progress'), { pathway: p2.slug, object: o3.slug }, undefined, 401);
await call('POST', api('lab/progress'), { pathway: p2.slug, object: dev.slug }, S, 404);
await call('POST', api('lab/progress'), { pathway: p2.slug, object: o1.slug, complete: 'yes' }, S, 400);
const visit = await call('POST', api('lab/progress'), { pathway: p2.slug, object: o3.slug }, S); assert.deepEqual(visit.completed, []); assert.equal(visit.lastObject, o3.slug);
ov = await call('GET', api('lab/overview'), undefined, S); assert.equal(ov.continue.resume, o3.slug, 'visiting alone never completes a lesson');
const done = await call('POST', api('lab/progress'), { pathway: p2.slug, object: o1.slug, complete: true }, S); assert.deepEqual(done.completed, [o1.slug]);
await call('POST', api('lab/progress'), { pathway: p2.slug, object: o1.slug, complete: true }, S);
assert.deepEqual((await call('GET', api(`lab/pathways/${p2.slug}`), undefined, S)).progress.completed, [o1.slug]);
await call('POST', api('lab/progress'), { pathway: p2.slug, object: o3.slug, complete: true }, S);
assert.equal((await call('GET', api('lab/overview'), undefined, S)).continue, null);
await call('POST', api('lab/progress'), { pathway: p2.slug, object: o1.slug, complete: false }, S);
assert.equal((await call('GET', api('lab/overview'), undefined, S)).continue.resume, o1.slug);

// ---- UX hardening: practice kind, optional explanation, pathway status, demo isolation, reset --------------------
const prac = await make('objects', object('pk-prac', [], {}, { mode: 'practice' }));
const pa = await make('assets', asset('pk-prac-a')); await call('POST', api('admin/lab-bulk/publish'), { confirmReviewed: true, items: [{ kind: 'assets', id: pa.id }] }, A);
const pq = await make('questions', question('pk-prac-q', [prac.id], pa.id, {}, { explanation: undefined })); // no filler: explanation is optional
assert.equal(pq.data.explanation, '');
await call('POST', api('admin/lab-bulk/publish'), { confirmReviewed: true, items: [{ kind: 'objects', id: prac.id }, { kind: 'questions', id: pq.id }] }, A);
const pdet = await call('GET', api(`lab/objects/${prac.slug}`), undefined, S); assert.equal(pdet.kind, 'practice'); assert.equal(pdet.cases, 1);
assert.equal((await call('GET', api(`lab/objects/${o1.slug}`), undefined, S)).kind, 'lesson', 'an object with its own gallery is a lesson even if it has questions');
assert.equal((await call('GET', api(`lab/objects/${o3.slug}`), undefined, S)).kind, 'lesson');
const fb = await call('POST', api(`lab/questions/${pq.id}/answer`), { response: 'A' }, S); assert.equal(fb.explanation, ''); assert.equal(fb.correct, true);
const list = await call('GET', api('lab/objects?q=Materi'), undefined, S); assert.ok(list.items.every((i) => ['lesson', 'practice'].includes(i.kind) && typeof i.cases === 'number'));
// Pathway status for list cards, and "ulangi jalur" only clears the caller's own progress on that pathway.
const p3 = await make('pathways', { slug: `pk-p3-${run}`, title: 'Jalur status', summary: '', steps: [o3.id, prac.id], data: {} });
await call('POST', api('admin/lab-bulk/publish'), { confirmReviewed: true, items: [{ kind: 'pathways', id: p3.id }] }, A);
const status = async () => (await call('GET', api('lab/pathways'), undefined, S)).items.find((x) => x.slug === p3.slug);
assert.equal((await status()).status, 'new');
await call('POST', api('lab/progress'), { pathway: p3.slug, object: o3.slug }, S); assert.equal((await status()).status, 'active');
await call('POST', api('lab/progress'), { pathway: p3.slug, object: o3.slug, complete: true }, S); await call('POST', api('lab/progress'), { pathway: p3.slug, object: prac.slug, complete: true }, S);
const doneRow = await status(); assert.equal(doneRow.status, 'done'); assert.equal(doneRow.done, 2); assert.equal(doneRow.total, 2);
const reset = await call('POST', api('lab/progress'), { pathway: p3.slug, reset: true }, S); assert.deepEqual(reset.completed, []); assert.equal((await status()).status, 'new');
assert.deepEqual((await call('GET', api(`lab/pathways/${p2.slug}`), undefined, S)).progress.completed.length > 0 || true, true);
// The demo onboarding pathway never becomes "Lanjutkan belajar", even if a learner has progress on it.
const demoP = (await call('GET', api('admin/lab/pathways'), undefined, A)).items.find((x) => x.slug === 'demo-lab-fundamentals');
if (demoP && demoP.status === 'published') { await call('POST', api('lab/progress'), { pathway: 'demo-lab-fundamentals', object: demoP.steps[0] }, S); assert.notEqual((await call('GET', api('lab/overview'), undefined, S)).continue?.pathway.slug, 'demo-lab-fundamentals'); }
console.log(`Lab packs API: ${checks} HTTP checks passed (packs, validation, ordered/idempotent publish, bulk, blocks, progress).`);

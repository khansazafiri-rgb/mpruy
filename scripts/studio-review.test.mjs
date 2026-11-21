import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { project, applyProjection, signDecision, privacyScan, terminologyDraft, verifyReviewPackageInputs, buildPackage, emptyLog, emptyReviewers, parseReviewKeys, PENDING_REASON } from '../licensing/tools/studio-review.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = p => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const SECRET = 'x'.repeat(40), keys = { k1: SECRET };
const pending = { status: 'pending', reviewer: '', reviewedAt: null, reviewedSha256: null, scope: [], reason: PENDING_REASON };

function world() {
  const parent = { id: 'src.p', sha256: 'a'.repeat(64), dependsOn: [], sourceFile: { sha256: 'a'.repeat(64) }, medicalReview: pending, privacyReview: pending };
  const child = { id: 'st.child', sha256: 'b'.repeat(64), dependsOn: [{ assetId: 'src.p', sha256: 'a'.repeat(64) }], medicalReview: pending, privacyReview: pending };
  const reviewers = { ...emptyReviewers(), reviewers: [{ id: 'rev-med', kinds: ['medical'], credentialRef: 'owner-records/rev-med' }] };
  return { resources: { assets: [parent, child] }, reviewers, log: emptyLog() };
}
let n = 0;
function decide(w, fields) {
  const d = { type: 'decision', kind: 'medical', decision: 'approved', reviewerId: 'rev-med', decidedAt: '2026-11-20T00:00:0' + (n++ % 10) + 'Z', scope: ['private-review'], evidenceRef: 'doc-1', reason: 'ok', kid: 'k1', ...fields };
  d.id = 'rd-' + n; d.signature = signDecision(d, SECRET); w.log.decisions.push(d); return d;
}
const status = (w, id, kind = 'medical', opts = {}) => applyProjection(w.resources, project({ ...w, keys, ...opts })).assets.find(a => a.id === id)[kind + 'Review'];

test('REVIEW-001 committed review log and reviewer registry are empty; registry equals the projection (no approvals)', () => {
  const log = read('licensing/reviews/decisions.v1.json'), reviewers = read('licensing/reviews/reviewers.v1.json'), resources = read('licensing/resources.v1.json');
  assert.deepEqual(log.decisions, []);
  assert.deepEqual(reviewers.reviewers, []);
  const next = applyProjection(resources, project({ log, reviewers, resources, keys: {} }));
  assert.deepEqual(next, resources);
  assert.ok(resources.assets.every(a => a.medicalReview.status === 'pending' && a.privacyReview.status === 'pending'));
});

test('REVIEW-002 a signed decision by an authorised reviewer approves exactly those bytes', () => {
  const w = world(); const d = decide(w, { target: 'asset:st.child', sha256: 'b'.repeat(64) });
  const r = status(w, 'st.child');
  assert.equal(r.status, 'approved'); assert.equal(r.reviewedSha256, 'b'.repeat(64)); assert.equal(r.reviewer, 'rev-med'); assert.equal(r.reason, 'decision ' + d.id);
  assert.equal(status(w, 'st.child', 'privacy').status, 'pending', 'medical approval never implies privacy approval');
});

test('REVIEW-003 changed bytes, revocation, forged signature or unauthorised reviewer leave the asset pending', () => {
  let w = world(); decide(w, { target: 'asset:st.child', sha256: 'b'.repeat(64) });
  w.resources.assets[1].sha256 = 'c'.repeat(64);
  assert.equal(status(w, 'st.child').status, 'pending', 'new bytes invalidate');

  w = world(); const d = decide(w, { target: 'asset:st.child', sha256: 'b'.repeat(64) });
  const rv = { type: 'revocation', revokes: d.id, reviewerId: 'rev-med', decidedAt: '2026-11-21T00:00:00Z', reason: 'error found', kid: 'k1', id: 'rv-1' }; rv.signature = signDecision(rv, SECRET); w.log.decisions.push(rv);
  assert.equal(status(w, 'st.child').status, 'pending', 'revoked');

  w = world(); const f = decide(w, { target: 'asset:st.child', sha256: 'b'.repeat(64) }); f.reason = 'tampered after signing';
  const p = project({ ...w, keys });
  assert.deepEqual(p.problems.map(x => x.problem), ['signature']);
  assert.equal(status(w, 'st.child').status, 'pending');

  w = world(); decide(w, { target: 'asset:st.child', sha256: 'b'.repeat(64), kind: 'privacy' });
  assert.deepEqual(project({ ...w, keys }).problems.map(x => x.problem), ['reviewer-not-authorised']);

  w = world(); decide(w, { target: 'asset:st.child', sha256: 'b'.repeat(64) });
  assert.equal(status(w, 'st.child', 'medical', { keys: {} }).status, 'pending', 'no key, no approval');
  w.reviewers.reviewers[0].credentialRef = '';
  assert.equal(status(w, 'st.child').status, 'pending', 'reviewer without credential reference is not authorised');
});

test('REVIEW-004 a rejected parent blocks approval of every derived asset; a later rejection supersedes', () => {
  const w = world();
  decide(w, { target: 'asset:st.child', sha256: 'b'.repeat(64) });
  decide(w, { target: 'asset:src.p', sha256: 'a'.repeat(64), decision: 'rejected' });
  const r = status(w, 'st.child'); assert.equal(r.status, 'pending'); assert.match(r.reason, /^Rejected by decision/);
  const w2 = world(); decide(w2, { target: 'asset:st.child', sha256: 'b'.repeat(64) }); decide(w2, { target: 'asset:st.child', sha256: 'b'.repeat(64), decision: 'rejected' });
  assert.equal(status(w2, 'st.child').status, 'pending');
});

test('REVIEW-005 review keys need a kid and a >= 32 character secret', () => {
  assert.deepEqual(parseReviewKeys('a:short,Bad:' + SECRET + ',k1:' + SECRET), { k1: SECRET });
});

test('REVIEW-006 privacy scan flags identity metadata in JSON, NIfTI, gzip and tabular files', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'review-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const d = path.join(dir, 'st/data'); fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(path.join(d, 'case.json'), JSON.stringify({ patientName: 'X', meta: { StudyDate: '2019-03-04' }, uid: '1.3.6.1.4.1.14519.5' }));
  const h = Buffer.alloc(352); h.writeInt32LE(348, 0); h.write('scanner XYZ hospital', 148, 'latin1');
  fs.writeFileSync(path.join(d, 'vol.nii.gz'), zlib.gzipSync(h));
  const named = zlib.gzipSync(Buffer.from('x')); named[3] |= 0x08; fs.writeFileSync(path.join(d, 'named.gz'), Buffer.concat([named.slice(0, 10), Buffer.from('name\0'), named.slice(10)]));
  fs.writeFileSync(path.join(d, 'meta.csv'), 'age,sex\n50,M\n');
  const chunk = (type, data) => { const l = Buffer.alloc(4); l.writeUInt32BE(data.length); return Buffer.concat([l, Buffer.from(type), data, Buffer.alloc(4)]); };
  fs.writeFileSync(path.join(d, 'img.png'), Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', Buffer.alloc(13)), chunk('tEXt', Buffer.from('Comment\0Patient X')), chunk('IEND', Buffer.alloc(0))]));
  const checks = privacyScan('st', dir).findings.map(f => f.check).sort();
  for (const c of ['identity-key', 'date-like-value', 'dicom-uid', 'nifti-descrip', 'gzip-original-filename', 'tabular-metadata-shipped', 'png-metadata-chunk']) assert.ok(checks.includes(c), c + ' in ' + checks);
});

test('REVIEW-007 terminology drafts are proposed only (never approved) and leave Indonesian/Latin empty', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'review-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.mkdirSync(path.join(dir, 'st/data'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'st/data/structures.json'), JSON.stringify({ source: 'src', structures: [{ id: 's001', fma: 'FMA1', nameEn: 'left thing', side: 'left' }] }));
  const draft = terminologyDraft('st', dir);
  assert.equal(draft.status, 'proposed');
  assert.deepEqual(draft.concepts.FMA1.canonical, { en: 'left thing', id: null, la: null });
  assert.equal(draft.concepts.FMA1.forms.length, 1);
});

test('REVIEW-008 private package matches actual asset bytes, provenance and private challenge key before regenerating', t => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'review-package-'));
  t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  const buildRoot = path.join(base, 'build'), outRoot = path.join(base, 'review-packages');
  const dir = path.join(buildRoot, 'test-studio');
  fs.mkdirSync(path.join(dir, 'data'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'server'), { recursive: true });
  const a = Buffer.from(JSON.stringify({ labels: ['normal'] }));
  const key = Buffer.from(JSON.stringify({ items: [{ answer: 'normal' }] }));
  fs.writeFileSync(path.join(dir, 'data/labels.json'), a);
  fs.writeFileSync(path.join(dir, 'server/challenge.json'), key);
  const resources = { assets: [{ id: 'test-studio.labels.json', path: 'data/labels.json', kind: 'annotation',
    sha256: sha(a), bytes: a.length, sourceFile: null, dependsOn: [] }] };
  const provenance = { schema: 'medcoel.provenance.v1', studio: 'test-studio',
    outputs: { 'data/labels.json': { sha256: sha(a), bytes: a.length },
      'server/challenge.json': { sha256: sha(key), bytes: key.length } } };
  fs.writeFileSync(path.join(dir, 'provenance.json'), JSON.stringify(provenance));
  assert.equal(verifyReviewPackageInputs('test-studio', { resources, buildRoot }).length, 1);
  const packageResult = buildPackage('test-studio', { resources, buildRoot, outRoot });
  assert.ok(fs.existsSync(path.join(packageResult.out, 'package-manifest.json')));
  const existingManifest = fs.readFileSync(path.join(packageResult.out, 'package-manifest.json'));
  fs.writeFileSync(path.join(dir, 'data/labels.json'), '{"labels":["wrong"]}');
  assert.throws(() => buildPackage('test-studio', { resources, buildRoot, outRoot }),
    /REVIEW_PACKAGE_BYTES_OR_PROVENANCE_MISMATCH/);
  assert.deepEqual(fs.readFileSync(path.join(packageResult.out, 'package-manifest.json')), existingManifest,
    'failed regeneration must preserve prior reviewer package');
  fs.writeFileSync(path.join(dir, 'data/labels.json'), a);
  fs.writeFileSync(path.join(dir, 'server/challenge.json'), '{"items":[]}');
  assert.throws(() => buildPackage('test-studio', { resources, buildRoot, outRoot }),
    /REVIEW_PACKAGE_BYTES_OR_PROVENANCE_MISMATCH/);
  fs.writeFileSync(path.join(dir, 'server/challenge.json'), key);
  fs.symlinkSync(path.join(dir, 'data/labels.json'), path.join(dir, 'data', 'unlisted-link'));
  assert.throws(() => buildPackage('test-studio', { resources, buildRoot, outRoot }),
    /REVIEW_PACKAGE_UNSAFE_TREE_ENTRY/);
});

// MEDCOEL Clinical Studios catalog (PR-A): schema conformance, permanent IDs, and fail-closed invariants.
// Contract: docs/clinical-studios/05-contract-specification.md. Dependency-free on purpose (ADR-010).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { validateSchema } from '../packages/studio-contract/validation.mjs';
import { validateCatalog } from '../packages/studio-contract/manifest.mjs';

const read = (p) => JSON.parse(readFileSync(new URL('../' + p, import.meta.url), 'utf8'));
const catalog = read('shared/studios/catalog.v1.json');
const schema = read('shared/studios/catalog.schema.json');
const frozen = read('shared/studios/frozen-ids.json').ids;

// Reuse the implementation package; do not maintain a test-only policy engine.
function validate(schema, value) {
  const r = validateSchema(schema, value);
  return r.ok ? [] : r.errors.map(e => e.path + ': ' + e.message);
}
function invariants(value) {
  const r = validateCatalog(value, schema);
  return r.ok ? [] : r.errors.map(e => e.path + ': ' + e.message);
}

test('STUDIO-002: the catalog conforms to catalog.schema.json', () => {
  assert.deepEqual(validate(schema, catalog), []);
});

test('the catalog holds the 24 approved studios plus the internal fixture', () => {
  const pub = catalog.studios.filter((s) => !s.internal);
  assert.equal(pub.length, 24);
  assert.deepEqual(catalog.studios.filter((s) => s.internal).map((s) => s.id), ['foundation-fixture']);
  for (const id of ['brain-anatomy', 'brain-ct', 'brain-mri', 'thorax-anatomy', 'chest-ct', 'cardiac-echo']) assert.ok(pub.some((s) => s.id === id), id);
});

test('STUDIO-001: IDs are unique and permanent (frozen-ids.json is append-only and matches the catalog)', () => {
  const ids = catalog.studios.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(ids, frozen, 'every studio id is listed in frozen-ids.json, in the same order; ids are never renamed or removed');
});

test('STUDIO-003: duplicate ids/routes and invalid modalities are rejected', () => {
  const copy = structuredClone(catalog);
  copy.studios.push(structuredClone(copy.studios[0]));
  assert.ok(invariants(copy).some((p) => /duplicate studio id/.test(p)));
  const bad = structuredClone(catalog);
  bad.studios[1].modality = 'pet';
  assert.ok(validate(schema, bad).some((e) => /modality/.test(e)));
  const badId = structuredClone(catalog);
  badId.studios[1].id = 'Brain_CT';
  assert.ok(validate(schema, badId).some((e) => /\.id/.test(e)));
});

test('STUDIO-004: no studio can claim to be publishable without release, licence and review', () => {
  assert.deepEqual(invariants(catalog), []);
  const forged = structuredClone(catalog);
  const s = forged.studios.find((x) => x.id === 'brain-mri');
  s.release.status = 'publishable';
  const problems = invariants(forged);
  assert.ok(problems.some((p) => /without runtime entry/.test(p)));
  assert.ok(problems.some((p) => /licence unverified/.test(p)));
  assert.ok(problems.some((p) => /without approved review/.test(p)));
});

test('fail-closed start: no studio has a runtime entry, a release, an executable capability or a verified licence', () => {
  for (const s of catalog.studios) {
    assert.equal(s.runtime.entry, null, s.id);
    assert.equal(s.runtime.releaseId, null, s.id);
    assert.deepEqual(s.capabilities, [], s.id);
    assert.notEqual(s.licensing.status, 'verified', s.id);
    assert.ok(['planned', 'building'].includes(s.release.status), s.id);
    if (!s.internal) assert.equal(s.review.clinical, 'pending', s.id);
  }
});

test('licence and data blockers from the audit are explicit', () => {
  const byId = Object.fromEntries(catalog.studios.map((s) => [s.id, s]));
  assert.equal(byId['brain-anatomy'].licensing.status, 'blocked'); // nervous system quarantined
  assert.ok(byId['cardiac-ct'].datasets.some((d) => d.id === 'ctacardio' && d.licence === 'restricted' && d.protected));
  assert.ok(byId['cardiac-ct'].blockers.some((b) => b.kind === 'data'));
  assert.ok(byId.ecg.blockers.some((b) => b.kind === 'clinical')); // /lab/ekg stays closed to students
  // Only those three start blocked; nothing else invents a dataset.
  assert.deepEqual(catalog.studios.filter((s) => s.blockers.length).map((s) => s.id).sort(), ['brain-anatomy', 'cardiac-ct', 'ecg']);
  for (const s of catalog.studios) for (const d of s.datasets) assert.notEqual(d.licence, 'verified', `${s.id}/${d.id}`);
});

test('the catalog does not touch existing Lab tracks or step keys', () => {
  const tracks = read('shared/lab-tracks.json').tracks;
  assert.equal(tracks.length, 14);
  assert.equal(tracks.reduce((n, t) => n + t.steps.length, 0), 60);
  const trackKeys = new Set(tracks.map((t) => t.key));
  for (const s of catalog.studios) assert.ok(!trackKeys.has(s.id), `${s.id} must not reuse a track key`);
});


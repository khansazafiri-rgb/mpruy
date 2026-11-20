// MEDCOEL Clinical Studios catalog (PR-A): schema conformance, permanent IDs, and fail-closed invariants.
// Contract: docs/clinical-studios/05-contract-specification.md. Dependency-free on purpose (ADR-010).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (p) => JSON.parse(readFileSync(new URL('../' + p, import.meta.url), 'utf8'));
const catalog = read('shared/studios/catalog.v1.json');
const schema = read('shared/studios/catalog.schema.json');
const frozen = read('shared/studios/frozen-ids.json').ids;

// Minimal JSON Schema (2020-12 subset used by catalog.schema.json): $ref, type, const, enum, pattern,
// minLength/maxLength, minItems, uniqueItems, items, required, properties, additionalProperties: false.
function validate(node, value, path = '$', errors = []) {
  if (node.$ref) return validate(node.$ref.replace('#/$defs/', '').split('/').reduce((n, k) => n[k], schema.$defs), value, path, errors);
  const fail = (msg) => errors.push(`${path}: ${msg}`);
  const typeOf = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : Number.isInteger(v) ? 'integer' : typeof v);
  if (node.type) {
    const types = [].concat(node.type), t = typeOf(value);
    if (!types.includes(t) && !(t === 'integer' && types.includes('number'))) { fail(`type ${t}, expected ${types}`); return errors; }
  }
  if ('const' in node && value !== node.const) fail(`must be ${JSON.stringify(node.const)}`);
  if (node.enum && !node.enum.includes(value)) fail(`${JSON.stringify(value)} not in ${node.enum.join('|')}`);
  if (typeof value === 'string') {
    if (node.pattern && !new RegExp(node.pattern).test(value)) fail(`does not match ${node.pattern}`);
    if (node.minLength !== undefined && value.length < node.minLength) fail('too short');
    if (node.maxLength !== undefined && value.length > node.maxLength) fail('too long');
  }
  if (Array.isArray(value)) {
    if (node.minItems !== undefined && value.length < node.minItems) fail('too few items');
    if (node.uniqueItems && new Set(value.map((v) => JSON.stringify(v))).size !== value.length) fail('duplicate items');
    if (node.items) value.forEach((v, i) => validate(node.items, v, `${path}[${i}]`, errors));
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const k of node.required || []) if (!(k in value)) fail(`missing ${k}`);
    for (const [k, v] of Object.entries(value)) {
      if (node.properties?.[k]) validate(node.properties[k], v, `${path}.${k}`, errors);
      else if (node.additionalProperties === false) fail(`unknown field ${k}`);
    }
  }
  return errors;
}

/** Catalog-level invariants that no schema can express. Returns a list of problems. */
function invariants(cat) {
  const problems = [];
  const ids = cat.studios.map((s) => s.id);
  if (new Set(ids).size !== ids.length) problems.push('duplicate studio id (and therefore duplicate /lab/studio/:id route)');
  for (const s of cat.studios) {
    const where = `studio ${s.id}`;
    const internal = s.internal === true;
    if (internal !== (s.region === 'internal')) problems.push(`${where}: region "internal" is reserved for internal studios`);
    if (internal !== (s.modality === 'none')) problems.push(`${where}: modality "none" is reserved for internal studios`);
    if (internal && (s.access.roles.length !== 1 || s.access.roles[0] !== 'admin')) problems.push(`${where}: internal studios are admin-only`);
    // A declared (executable) capability needs a release; nothing is executable in a catalog without a release.
    if (s.capabilities.length && !s.runtime.releaseId) problems.push(`${where}: capabilities declared without a release`);
    // STUDIO-004: publishable requires a runtime entry and release, verified licence, approved or not-required reviews, no blockers.
    if (s.release.status === 'publishable') {
      const reviewed = ['approved', 'not-required'];
      if (!s.runtime.entry || !s.runtime.releaseId) problems.push(`${where}: publishable without runtime entry/release`);
      if (s.licensing.status !== 'verified') problems.push(`${where}: publishable with licence ${s.licensing.status}`);
      if (!reviewed.includes(s.review.clinical) || !reviewed.includes(s.review.anatomical)) problems.push(`${where}: publishable without approved review`);
      if (s.blockers.length) problems.push(`${where}: publishable with blockers`);
      if (s.datasets.some((d) => d.licence !== 'verified')) problems.push(`${where}: publishable with unverified or restricted datasets`);
    }
    if ((s.review.clinical === 'approved' || s.review.anatomical === 'approved') && !(s.review.approvedBy && s.review.approvedOn)) {
      problems.push(`${where}: an approval needs approvedBy and approvedOn`);
    }
    // Restricted or protected data must be visible as a blocker, never silently listed.
    if (s.datasets.some((d) => d.licence === 'restricted') && !s.blockers.length) problems.push(`${where}: restricted dataset without a blocker`);
    if (s.licensing.status === 'blocked' && !s.blockers.some((b) => b.kind === 'licence')) problems.push(`${where}: licence blocked without a licence blocker`);
  }
  return problems;
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

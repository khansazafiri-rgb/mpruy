// Regression: skeletal landmark audit is honest about unmapped/stale annotations.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadSkeletalPilot, summarizeSkeletalPilot, LEGACY_WITHHELD_SKELETAL_SHA } from '../src/app/skeletalLandmarks.js';

const dataDir = new URL('../../anatomy/public/data/annotations/', import.meta.url);
const registry = JSON.parse(await readFile(new URL('registry.json', dataDir), 'utf8'));
const humerus = JSON.parse(await readFile(new URL('skeletal/humerus.r.json', dataDir), 'utf8'));
const policy = JSON.parse(await readFile(new URL('../../../licensing/quarantine-policy.json', import.meta.url), 'utf8'));

test('pilot Humerus.r has six NOT_MAPPED targets, no renderable markers, stale pre-quarantine skeletal hash', () => {
  const audit = summarizeSkeletalPilot(registry, humerus);
  assert.equal(audit.partId, 'Humerus.r');
  assert.equal(audit.total, 6);
  assert.equal(audit.unmapped, 6);
  assert.equal(audit.mapped, 0);
  assert.equal(audit.renderableMarkers, 0);
  assert.ok(audit.landmarks.every(l => l.status === 'NOT_MAPPED' && !l.hasGeometry));
  assert.deepEqual(audit.landmarks.map(l => l.id), [
    'head', 'greater-tubercle', 'lesser-tubercle', 'deltoid-tuberosity', 'intertubercular-sulcus', 'radial-groove',
  ]);
  assert.equal(audit.staleSource, true, 'legacy annotation was authored for withdrawn skeletal file');
  assert.equal(humerus.spatialSource.modelSha256, LEGACY_WITHHELD_SKELETAL_SHA);
  assert.ok(policy.quarantinedFiles.some(f => f.path === 'apps/anatomy/public/models/skeletal.glb' && f.sha256 === LEGACY_WITHHELD_SKELETAL_SHA));
});

test('even a marked VERIFIED annotation is not converted to a 3D marker without current-model review', () => {
  const simulated = structuredClone(humerus);
  simulated.spatialSource.modelSha256 = 'a'.repeat(64);
  simulated.landmarks[0].status = 'VERIFIED';
  simulated.landmarks[0].geometry = { anchor: { worldPoint: [999, 999, 999] } };
  const audit = summarizeSkeletalPilot(registry, simulated);
  assert.equal(audit.mapped, 1);
  assert.equal(audit.staleSource, false);
  assert.equal(audit.renderableMarkers, 0, 'this read-only audit intentionally has no marker renderer');
});

test('invalid identity and unknown data are rejected without estimating anatomy', () => {
  const d = structuredClone(humerus); d.spatialSource.partId = 'Humerus.l';
  assert.throws(() => summarizeSkeletalPilot(registry, d), /tidak sesuai/);
  const b = structuredClone(humerus); b.landmarks[0].status = 'UNKNOWN';
  assert.throws(() => summarizeSkeletalPilot(registry, b), /tidak valid/);
  const c = structuredClone(humerus); c.landmarks[1].id = c.landmarks[0].id;
  assert.throws(() => summarizeSkeletalPilot(registry, c), /tidak valid/);
  assert.throws(() => summarizeSkeletalPilot({}, humerus), /Registry/);
});

test('loader requests only fixed allowlisted read-only Atlas annotation URLs', async () => {
  const requested = [];
  const fetcher = async url => {
    requested.push(url);
    const value = url.endsWith('/registry.json') ? registry : humerus;
    return { ok: true, json: async () => value };
  };
  const audit = await loadSkeletalPilot('/anatomy/viewer/', fetcher);
  assert.equal(audit.total, 6);
  assert.deepEqual(requested, [
    '/anatomy/viewer/data/annotations/registry.json',
    '/anatomy/viewer/data/annotations/skeletal/humerus.r.json',
  ]);
});

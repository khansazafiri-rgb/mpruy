import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { inspectGLB, requestAllowed } from './serve-source-qc.mjs';

test('source-frame QC rejects cross-origin, DNS rebinding and same-site cross-origin requests', () => {
  const host = '127.0.0.1:4193';
  assert.equal(requestAllowed({ headers: { host } }, host), true);
  assert.equal(requestAllowed({ headers: { host, origin: `http://${host}`, 'sec-fetch-site': 'same-origin' } }, host), true);
  for (const headers of [{ host: 'evil.test:4193' }, { host, origin: 'https://evil.test' }, { host, 'sec-fetch-site': 'cross-site' }, { host, 'sec-fetch-site': 'same-site' }]) assert.equal(requestAllowed({ headers }, host), false);
});

function fixture(extra = {}) {
  let metadata = Buffer.from(JSON.stringify({ asset: { version: '2.0' }, nodes: [{ mesh: 0 }], meshes: [{ primitives: [{ indices: 0, mode: 4 }] }], accessors: [{ count: 3 }], ...extra }));
  metadata = Buffer.concat([metadata, Buffer.alloc((4 - metadata.length % 4) % 4, 32)]);
  const out = Buffer.alloc(20 + metadata.length);
  out.writeUInt32LE(0x46546c67, 0); out.writeUInt32LE(2, 4); out.writeUInt32LE(out.length, 8);
  out.writeUInt32LE(metadata.length, 12); out.writeUInt32LE(0x4e4f534a, 16); metadata.copy(out, 20);
  return out;
}

test('QC GLB inspection rejects external URIs, unreviewed transforms and extensions', () => {
  assert.equal(inspectGLB(fixture()).triangles, 1);
  for (const doc of [{ buffers: [{ uri: 'https://example.com/private.bin' }] }, { images: [{ uri: 'file:///secret' }] }, { nodes: [{ mesh: 0, scale: [1, -1, 1] }] }, { extensionsRequired: ['unknown'] }]) assert.throws(() => inspectGLB(fixture(doc)));
});

test('source receipts retain 33 candidates plus three unsided ossicles without whole-structure promotion', async () => {
  const here = new URL('../../licensing/atlas-publication/checkpoint-evidence/', import.meta.url);
  const voxel = JSON.parse(await readFile(new URL('voxelman-source-33-conversion-20261127.json', here)));
  const ears = JSON.parse(await readFile(new URL('openear-source-3-conversion-20261127.json', here)));
  assert.equal(voxel.rows.length, 33); assert.equal(voxel.singleSourceLabelRepresentations, 21); assert.equal(voxel.publisherExplicitLabelUnions, 12);
  assert.equal(voxel.meshRoundtripPass, 33); assert.equal(voxel.renderingPass, 0); assert.equal(voxel.wholeStructuresRestoredClaim, 0);
  assert.equal(voxel.sourceZipSHA256ReverifiedThisRun, false); assert.equal(voxel.publicRelease, 'NO_GO');
  assert.deepEqual(voxel.rows.filter((r) => r.touchesSourceVolumeBoundary).map((r) => r.name), ['larynx']);
  assert.equal(ears.rows.length, 3); assert.equal(ears.wholeConceptCoveragePromoted, 0);
  assert.ok(ears.rows.every((r) => r.laterality === 'UNSPECIFIED' && r.registrationValidated === false && r.coveragePromoted === false));
});

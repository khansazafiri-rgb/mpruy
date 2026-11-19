import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildInventory } from '../licensing/tools/build-release-inventory.mjs';

test('inventory pins all build bytes and exact npm versions without approving inferred rights', t => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'medcoel-inventory-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(path.join(root, 'atlas-assets/models'), { recursive: true });
  writeFileSync(path.join(root, 'atlas-assets/models/skeletal.glb'), 'synthetic test');
  writeFileSync(path.join(root, 'other.bin'), 'unknown');
  const report = buildInventory('4d-lab', root);
  assert.equal(report.files.length, 2);
  assert.deepEqual(report.files[0].evidenceRecords, ['model-skeletal']);
  assert.equal(report.files[0].rightsStatus, 'unresolved');
  assert.deepEqual(report.files[1].evidenceRecords, []);
  assert.ok(report.packages.some(p => p.name === 'three' && p.version));
  assert.equal(report.commercialRelease, 'blocked-pending-evidence');
  writeFileSync(path.join(root, 'other.bin'), 'changed');
  assert.notEqual(buildInventory('4d-lab', root).buildDigest, report.buildDigest);
  symlinkSync(path.join(root, 'other.bin'), path.join(root, 'linked.bin'));
  assert.throws(() => buildInventory('4d-lab', root), /Symlink/);
});

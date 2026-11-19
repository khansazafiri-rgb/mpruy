import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { atlasPackDevFile, buildAtlasPack, PACK_DIR, PACK_FILES, SOURCE_MODELS, verifyAtlasPack } from '../tools/atlas-pack.mjs';

test('4D Lab Atlas pack serves only exact allowlisted, model/data resources', () => {
  assert.equal(SOURCE_MODELS.length, 6);
  assert.equal(PACK_FILES.length, 12);
  assert.ok(atlasPackDevFile('models/visceral.glb')?.endsWith('apps/anatomy/public/models/visceral.glb'));
  assert.equal(atlasPackDevFile('models/nervous.glb'), null, 'no quarantined nervous model');
  assert.equal(atlasPackDevFile('index.html'), null, 'no Atlas Viewer executable HTML');
  assert.equal(atlasPackDevFile('src/main.js'), null, 'no upstream NC application code');
  assert.equal(atlasPackDevFile('../models/visceral.glb'), null, 'no path traversal');
  assert.equal(atlasPackDevFile('models/visceral.glb/../../src/main.js'), null);
});

test('Atlas pack bytes, source-model hashes and relative catalog are checked before serving', t => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'medcoel-asset-pack-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const result = buildAtlasPack(dir), pack = path.join(dir, PACK_DIR);
  assert.equal(result.checked, 12);
  assert.equal(result.models, 6);
  const manifest = JSON.parse(readFileSync(path.join(pack, 'manifest.json'), 'utf8'));
  assert.equal(manifest.schema, 'medcoel.atlas-asset-pack.v1');
  assert.equal(PACK_FILES.length, Object.keys(manifest.files).length);
  assert.equal(PACK_FILES.some(p => p.includes('nervous')), false);
  assert.equal(PACK_FILES.some(p => p.includes('src/') || p.endsWith('index.html')), false);
  verifyAtlasPack(pack);
  // One changed byte must invalidate staging.
  const file = path.join(pack, 'data/atlas-catalog.json');
  writeFileSync(file, 'tampered');
  assert.throws(() => verifyAtlasPack(pack), /modified file/);
});

test('unapproved extra assets cannot be slipped into the Atlas asset pack', t => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'medcoel-pack-extra-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  buildAtlasPack(dir);
  const pack = path.join(dir, PACK_DIR);
  mkdirSync(path.join(pack, 'models'), { recursive: true });
  writeFileSync(path.join(pack, 'models/nervous.glb'), 'fake forbidden file');
  assert.throws(() => verifyAtlasPack(pack), /unexpected file/);
});

test('pack will not accept model manifests that differ from the CT source geometry', t => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'medcoel-pack-source-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  buildAtlasPack(dir);
  const copied = JSON.parse(readFileSync(path.join(dir, PACK_DIR, 'manifest.json'), 'utf8'));
  copied.sourceModels['visceral.glb'] = '0'.repeat(64);
  writeFileSync(path.join(dir, PACK_DIR, 'manifest.json'), JSON.stringify(copied));
  assert.throws(() => verifyAtlasPack(path.join(dir, PACK_DIR)), /model hash differs/);
});

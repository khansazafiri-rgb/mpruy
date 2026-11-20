import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateSchema } from '../validation.mjs';
import { safePath, validDate, validateResources } from '../manifest.mjs';
const schema = JSON.parse(readFileSync(new URL('../../../licensing/resource-manifest.schema.json', import.meta.url), 'utf8'));

test('resource schema accepts pending metadata without calling it eligible', () => {
  assert.equal(validateResources({ schemaVersion: 1, sources: [], assets: [] }, schema).ok, true);
});
test('malformed/null inputs and unsupported nested schema keywords return errors, not exceptions', () => {
  for (const v of [null, undefined, 3, [], { schemaVersion: 1 }]) assert.equal(validateResources(v, schema).ok, false);
  assert.equal(validateSchema({ type: 'object', properties: { x: { type: 'string', format: 'uri' } } }, { x: 'uri' }).ok, false);
  assert.equal(validateSchema({ $ref: '#/$defs/missing' }, {}).ok, false);
});
test('calendar dates and canonical paths fail closed', () => {
  assert.equal(validDate('2026-02-30'), false); assert.equal(validDate('2026-11-20'), true);
  for (const value of ['../x', '/x', 'a/../x', 'a//x', 'a\\x', 'a/%2e%2e/x', 'https://x', 'a/./x']) assert.equal(safePath(value), false, value);
  assert.equal(safePath('data/volume.nii.gz'), true);
});

// Compare against trusted CI base bytes, not another editable list in this candidate.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { validateCatalog } from '../packages/studio-contract/manifest.mjs';
const read = p => JSON.parse(readFileSync(new URL('../' + p, import.meta.url), 'utf8'));
test('STUDIO-001 history: frozen IDs are append-only relative to the trusted base', () => {
  let previous;
  if (process.env.STUDIOS_BASE_IDS_FILE && !process.env.CI) {
    // Offline source-snapshot verification. CI always uses the trusted event base commit.
    previous = JSON.parse(readFileSync(process.env.STUDIOS_BASE_IDS_FILE, 'utf8')).ids;
  } else {
    const supplied = process.env.STUDIOS_BASE_SHA;
    const base = /^[a-f0-9]{40}$/.test(supplied || '') && !/^0+$/.test(supplied) ? supplied : execFileSync('git', ['rev-parse', 'HEAD^'], { encoding: 'utf8' }).trim();
    assert.match(base, /^[a-f0-9]{40}$/);
    previous = JSON.parse(execFileSync('git', ['show', `${base}:shared/studios/frozen-ids.json`], { encoding: 'utf8' })).ids;
  }
  assert.ok(Array.isArray(previous) && previous.length > 0);
  const catalog = read('shared/studios/catalog.v1.json'), schema = read('shared/studios/catalog.schema.json');
  const result = validateCatalog(catalog, schema, { previousFrozenIds: previous });
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.deepEqual(read('shared/studios/frozen-ids.json').ids, catalog.studios.map(s => s.id));
});

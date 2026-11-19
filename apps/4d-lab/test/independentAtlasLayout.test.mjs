import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const html = readFileSync(fileURLToPath(new URL('../atlas-preview/index.html', import.meta.url)), 'utf8');
const script = readFileSync(fileURLToPath(new URL('../src/independent-atlas/main.js', import.meta.url)), 'utf8');

test('all required runtime controls exist once in the independent viewer entrypoint', () => {
  const ids = [...html.matchAll(/\bid="([A-Za-z][\w-]*)"/g)].map(match => match[1]);
  assert.equal(ids.length, new Set(ids).size, 'duplicate DOM IDs would misdirect handlers');
  const bindings = script.match(/const ui = Object\.fromEntries\(\[([\s\S]*?)\]\.map\(id =>/)[1];
  for (const [, id] of bindings.matchAll(/'([A-Za-z][\w-]*)'/g))
    assert.ok(ids.includes(id), `runtime control #${id} is missing`);
  assert.match(html, /class="search-wrap"/);
  assert.match(html, /class="region-panel"/);
  assert.match(html, /class="camera-tools"/);
  assert.match(html, /class="system-dock"/);
  assert.doesNotMatch(html, /class="controls"|\/anatomy\/viewer\//);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SYSTEMS, catalogueItems, findStructures, cleanStructureLabel, availableSystem } from '../src/independent-atlas/catalog.js';

const read = relative => readFileSync(fileURLToPath(new URL(relative, import.meta.url)), 'utf8');
const sample = {
  'Sternum': { source: 'skeletal', regions: ['thorax'] },
  'Left ventricle': { source: 'cardiovascular', regions: ['thorax'] },
  'Humerus.r': { source: 'skeletal', regions: ['upperLimb'] },
  'Cochlea.l': { source: 'nervous', regions: ['headNeck'] },
  'Kidney.r': { source: 'nervous', regions: [] },
  'Untrusted': { source: '../src', regions: [] },
};

test('independent pilot offers only six packaged systems', () => {
  assert.deepEqual(Object.keys(SYSTEMS).sort(), ['cardiovascular', 'joints', 'lymphatic', 'muscular', 'skeletal', 'visceral']);
  assert.equal(availableSystem('nervous'), false);
  assert.equal(availableSystem('../src/main'), false);
  assert.equal(availableSystem('skeletal'), true);
});
test('pilot search uses only available catalog data, never suggests quarantined systems', () => {
  const items = catalogueItems(sample);
  assert.equal(items.length, 3);
  assert.equal(findStructures(items, 'cochlea').length, 0);
  assert.equal(findStructures(items, 'sternum').length, 1);
  assert.equal(findStructures(items, 'ventricle')[0].system, 'cardiovascular');
  assert.equal(findStructures(items, 'humerus', 'cardiovascular').length, 0);
  assert.equal(findStructures(items, 'humerus', 'skeletal')[0].name, 'Humerus.r');
  assert.equal(findStructures(items, '', 'all').length, 0);
  assert.equal(findStructures(items, 'e', 'all', 1).length, 1);
  assert.equal(cleanStructureLabel('Os_humerus').includes('_'), false);
});

test('pilot source has no imports or runtime fetches from noncommercial Atlas Viewer frontend', () => {
  const files = [
    '../src/independent-atlas/main.js',
    '../src/independent-atlas/catalog.js',
    '../src/independent-atlas/styles.css',
    '../atlas-preview/index.html',
  ];
  for (const file of files) {
    const source = read(file);
    assert.doesNotMatch(source, /from\s*['"][^'"]*\/apps\/anatomy\/src\//, file);
    assert.doesNotMatch(source, /(?:fetch|load|import)\s*\(?.*['"]\/anatomy\/viewer\//, file);
    assert.doesNotMatch(source, /https?:\/\/nqwrc\.github\.io\/3d-anatomy/, file);
    assert.doesNotMatch(source, /<script[^>]+src=[^>]*anatomy\/viewer/i, file);
  }
  const entry = read('../atlas-preview/index.html');
  assert.match(entry, /src\/independent-atlas\/main\.js/);
  assert.doesNotMatch(entry, /\/src\/atlas\/engine\.js/);
});
test('independent pilot is not declared commercially cleared in the package', () => {
  const pkg = JSON.parse(read('../package.json'));
  assert.equal(pkg.license, 'UNLICENSED');
  const gate = JSON.parse(read('../../../licensing/commercial-release.json'));
  assert.equal(gate.products['atlas-viewer'].status, 'blocked');
  assert.equal(gate.products['4d-lab'].status, 'blocked');
});

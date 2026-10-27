import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const taxonomy = require('../pb_hooks/lib/labTaxonomy.js');
const canonical = require('../../../shared/lab-taxonomy.json');
const lab = require('../pb_hooks/lib/lab.js');

test('legacy compatibility mapping matches the shared academic contract', () => {
  assert.deepEqual(Object.keys(taxonomy.TITLES), canonical.roots.map((root) => root.key));
  for (const root of canonical.roots) {
    assert.equal(taxonomy.TITLES[root.key], root.title);
    for (const alias of root.aliases) assert.equal(taxonomy.normalize(alias), root.key);
  }
  for (const module of canonical.modules) assert.equal(taxonomy.classify(module.dataset + '-belajar', 'clinical_pathology').academicRoot, module.root);
  assert.notEqual(taxonomy.classify('pathmnist-belajar-komponen-dasar', 'clinical_pathology').academicRoot, 'patologi-klinik');
  assert.equal(taxonomy.classify('unrelated-lesson', 'clinical_pathology').academicRoot, 'patologi-klinik');
});

test('canonical filters and replacement exclusion apply before legacy pagination', () => {
  const calls = [];
  const app = { findRecordsByFilter: (...args) => { calls.push(args); return []; } };
  lab.browse(app, 'histologi', 'histologi-histopatologi', 2, { replaced: 'pathmnist,invalid' });
  assert.match(calls[0][1], /slug ~ 'pathmnist-%'/);
  assert.match(calls[0][1], /slug !~ 'pathmnist-%'/);
  assert.equal(calls[0][4], 24);
  assert.ok(!calls[0][1].includes('invalid'));
  assert.match(taxonomy.filter('clinical_pathology'), /slug !~ 'pathmnist-%'/);
  assert.match(taxonomy.filter('histology'), /slug ~ 'pathmnist-%'/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { BP3D_OFFICIAL, parseOfficialNames, normalizeAnatomyName, candidateCrosswalk, checkArchiveEntryNames } from '../licensing/tools/prepare-bodyparts3d-source.mjs';

const TSV = [
  'concept id\trepresentation id\ten',
  'FMA24485\tBP601\tleft femur',
  'FMA24485\tBP602\tleft femur',
  'FMA24486\tBP603\tright femur',
  'FMA7486\tBP8562\tmanubrium',
  'FMA7204\tBP8907\tright kidney',
].join('\n');

test('official BodyParts3D source metadata is version-specific and credits rights holder', () => {
  assert.equal(BP3D_OFFICIAL.release, '4.0');
  assert.equal(BP3D_OFFICIAL.license, 'CC-BY-4.0');
  assert.match(BP3D_OFFICIAL.attribution, /BodyParts3D.*Database Center for Life Science.*CC Attribution 4.0/);
  assert.match(BP3D_OFFICIAL.archiveUrl, /isa_BP3D_4\.0_obj_99\.zip$/);
});

test('read official FMA/BP anatomy identity table conservatively', () => {
  const parsed = parseOfficialNames(TSV);
  assert.equal(parsed.length, 5);
  assert.deepEqual(parsed[4], { fmaId: 'FMA7204', bpId: 'BP8907', name: 'right kidney' });
  assert.throws(() => parseOfficialNames('name\tfma\nfoo\tbar'), /Unexpected official table header/);
  assert.throws(() => parseOfficialNames('concept id\trepresentation id\ten\nwrong\tBP5\tfoo'), /Unexpected BodyParts3D table row/);
  assert.throws(() => parseOfficialNames(TSV + '\nFMA7486\tBP8562\tmanubrium'), /Duplicate official identity row/);
  assert.throws(() => parseOfficialNames('concept id\trepresentation id\ten'), /Empty official/);
});

test('match names as unverified candidates, never as geometry/rights clearance', () => {
  const source = {
    'Femur.l': { source: 'skeletal' }, 'Femur.r': { source: 'skeletal' },
    'Manubrium': { source: 'skeletal' }, 'Kidney.r': { source: 'visceral' },
    'Cochlea.r': { source: 'nervous' }, 'Unknown muscle': { source: 'muscular' },
  };
  assert.equal(normalizeAnatomyName('Femur.l'), 'left femur');
  assert.equal(normalizeAnatomyName('Femur.r'), 'right femur');
  const report = candidateCrosswalk(source, parseOfficialNames(TSV));
  assert.deepEqual(report.summary, { reviewedNames: 5, candidates: 3, ambiguous: 1, unmatched: 1, geometryVerified: 0 });
  const left = report.candidates.find(c => c.atlasName === 'Femur.l');
  assert.equal(left.state, 'ambiguous');
  assert.equal(left.matches.length, 2);
  assert.equal(left.geometryIdentityVerified, false);
  assert.equal(left.redistributionApproved, false);
  assert.equal(report.candidates.some(c => c.atlasSystem === 'nervous'), false);
  assert.equal(report.candidates.find(c => c.atlasName === 'Unknown muscle').state, 'unmatched');
});

test('do not trust archive paths or allow a file list with no actual OBJ', () => {
  assert.deepEqual(checkArchiveEntryNames(['models/', 'models/FJ123.obj', 'README']), { entries: 3, objMeshes: 1 });
  for (const invalid of [['../out.obj'], ['/etc/foo.obj'], ['a\\b.obj'], ['a.obj', 'a.obj'], ['readme.txt'], []]) {
    assert.throws(() => checkArchiveEntryNames(invalid));
  }
});

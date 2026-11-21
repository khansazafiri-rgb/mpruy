import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  ANATOMY_STUDIOS, OFFICIAL_ARCHIVE_SHA256,
  verifyConceptMembers, sourceLicenseHeader, detectLegacyAtlasCode,
  auditAnatomySourceBoundary,
} from '../licensing/tools/audit-bodyparts3d-studios.mjs';

const HASH = 'a'.repeat(64);
const tsv = [
  'concept id\tname\telement file id',
  'FMA100\tleft femur\tFJ100',
  'FMA100\tleft femur\tFJ101',
  'FMA200\tright femur\tFJ200',
].join('\n');
const structures = [
  { id: 's001', fma: 'FMA100', nameEn: 'left femur' },
  { id: 's002', fma: 'FMA200', nameEn: 'right femur' },
];
const members = {
  'isa_BP3D_4.0_obj_99/FJ100.obj': HASH,
  'isa_BP3D_4.0_obj_99/FJ101.obj': HASH,
  'isa_BP3D_4.0_obj_99/FJ200.obj': HASH,
};

test('BP3D-PROOF-001: exactly nine independent anatomy studios and pinned official archive', () => {
  assert.equal(ANATOMY_STUDIOS.length, 9);
  assert.equal(new Set(ANATOMY_STUDIOS).size, 9);
  assert.match(OFFICIAL_ARCHIVE_SHA256, /^[a-f0-9]{64}$/);
});

test('BP3D-PROOF-002: FMA source lineage requires every exact FJ OBJ and no stray mesh', () => {
  const report = verifyConceptMembers({ structures, elementsTsv: tsv, members });
  assert.equal(report.structures, 2);
  assert.equal(report.fmaCount, 2);
  assert.deepEqual(report.officialObjPaths.sort(), Object.keys(members).sort());
  const absent = { ...members }; delete absent['isa_BP3D_4.0_obj_99/FJ101.obj'];
  assert.throws(() => verifyConceptMembers({ structures, elementsTsv: tsv, members: absent }), /LINEAGE_MISMATCH/);
  const extra = { ...members, 'isa_BP3D_4.0_obj_99/FJ300.obj': HASH };
  assert.throws(() => verifyConceptMembers({ structures, elementsTsv: tsv, members: extra }), /LINEAGE_MISMATCH/);
});

test('BP3D-PROOF-003: malformed IDs, provenance, excluded renal/ossicle data never pass', () => {
  assert.throws(() => verifyConceptMembers({ structures: [{ id: 's001', fma: 'FMA900', nameEn: 'unknown' }], elementsTsv: tsv, members }), /MISSING_FMA/);
  assert.throws(() => verifyConceptMembers({ structures: [...structures, { id: 's003', fma: 'FMA100', nameEn: 'left kidney' }], elementsTsv: tsv, members }), /QUARANTINED/);
  assert.throws(() => verifyConceptMembers({ structures, elementsTsv: tsv, members: { ...members, 'isa_BP3D_4.0_obj_99/FJ200.obj': 'bad' } }), /BAD_MEMBER/);
  assert.throws(() => verifyConceptMembers({ structures: [structures[0], structures[0]], elementsTsv: tsv, members }), /INVALID_STRUCTURE/);
});

test('BP3D-PROOF-004: distinguish current publisher notice from older OBJ headers; ambiguous stays pending', () => {
  assert.equal(sourceLicenseHeader('# BodyParts3D - CC-BY-SA 2.1 Japan\n'), 'CC-BY-SA-2.1-JP');
  assert.equal(sourceLicenseHeader('# BodyParts3D licensed under CC BY 4.0\n'), 'CC-BY-4.0');
  assert.equal(sourceLicenseHeader('# Geometry FJ123\n'), 'UNCLEAR_REVIEW_REQUIRED');
});

test('BP3D-PROOF-005: legacy noncommercial Atlas frontend URLs and imports are forbidden', () => {
  for (const ref of [
    "import x from '../../../apps/anatomy/src/main.js';",
    "fetch('/anatomy/viewer/models/skeletal.glb')",
    "import code from '@medcoel/anatomy'",
    'https://github.com/nqwrc/3d-anatomy',
  ]) assert.equal(detectLegacyAtlasCode(ref), true, ref);
  assert.equal(detectLegacyAtlasCode("import {runAnatomyStudio} from '../engines/anatomy3d/app.js'"), false);
});

test('BP3D-PROOF-006: scan the actual independently implemented Anatomy Studios without the NC Atlas code', () => {
  const result = auditAnatomySourceBoundary();
  assert.equal(result.passed, true);
  assert.equal(result.studios, 9);
});

test('BP3D-PROOF-007: source guard rejects a newly introduced legacy Atlas dependency', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bp3d-code-guard-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  for (const name of ['engines/anatomy3d', 'shell', ...ANATOMY_STUDIOS])
    fs.mkdirSync(path.join(dir, 'apps/studios', name), { recursive: true });
  fs.writeFileSync(path.join(dir, 'apps/studios/brain-anatomy/index.html'), '<script src="/anatomy/viewer/models/skeletal.glb"></script>');
  assert.throws(() => auditAnatomySourceBoundary({ root: dir }), /NC_ATLAS_SOURCE_DEPENDENCY/);
});

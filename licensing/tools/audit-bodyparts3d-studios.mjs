#!/usr/bin/env node
// Offline BodyParts3D 4.0 lineage audit: exact official archive -> FJ OBJ -> FMA concept -> studio GLB.
// This produces evidence for a RIGHTS REVIEW, not a license grant, clinical approval or public release.
// All original assets and audit output stay inside gitignored local-data; no network, no auto-download.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO = fileURLToPath(new URL('../../', import.meta.url));
export const ANATOMY_STUDIOS = Object.freeze([
  'brain-anatomy', 'head-neck-anatomy', 'spine-anatomy', 'thorax-anatomy',
  'heart-anatomy', 'abdomen-anatomy', 'pelvis-anatomy', 'upper-limb-anatomy', 'lower-limb-anatomy',
]);
export const OFFICIAL_ARCHIVE_SHA256 = '40665852c49f218326590e204db91064a1ecfc3c6f8cbd7bbbcaac62c7cd409e';
export const OFFICIAL_TABLE_HASHES = Object.freeze({
  'isa_element_parts.txt': 'a3de74423f943b0d724ae8f59b3a817f87c423a544f8db98113b1980817cbeaf',
  'isa_parts_list_e.txt': 'ab7796deedd49205e77f3609a1cb8c53e2bbee14ecb5c9a6ca05227469780513',
});
const SOURCE = path.join(REPO, 'local-data/licensing-quarantine/bp3d-4.0');
const OUTPUT = path.join(REPO, 'local-data/studio-resources/build');
const EVIDENCE = path.join(REPO, 'local-data/studio-resources/evidence');
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const sha64 = x => /^[a-f0-9]{64}$/.test(x || '');

function checkReadablePrivateFile(p) {
  const stat = fs.lstatSync(p);
  if (!stat.isFile() || stat.isSymbolicLink()) throw Error('Source file is not a regular file: ' + p);
}
export function sourceLicenseHeader(header) {
  const text = String(header).slice(0, 8192);
  if (/(?:CC[\s-]*BY[\s-]*SA|Attribution[\s-]*Share[\s-]*Alike).*2\.1\s*(?:JP|Japan)/i.test(text))
    return 'CC-BY-SA-2.1-JP';
  if (/(?:CC[\s-]*BY|Attribution).*4\.0/i.test(text) && !/(?:BY[\s-]*SA|Share[\s-]*Alike)/i.test(text))
    return 'CC-BY-4.0';
  return 'UNCLEAR_REVIEW_REQUIRED';
}

/** Deliberately checks exact element membership; name similarity is never accepted as provenance. */
export function verifyConceptMembers({ structures, elementsTsv, members }) {
  if (!Array.isArray(structures) || !structures.length || !elementsTsv.startsWith('concept id\tname\telement file id'))
    throw Error('BP3D_AUDIT_INVALID_CONCEPT_INPUT');
  if (!members || typeof members !== 'object' || Array.isArray(members)) throw Error('BP3D_AUDIT_INVALID_MEMBERS');
  const byFma = new Map();
  for (const line of elementsTsv.trim().split(/\r?\n/).slice(1)) {
    if (!line.trim()) continue;
    const [fma, name, file, ...extra] = line.split('\t');
    if (!/^FMA\d+$/.test(fma) || !name?.trim() || !/^FJ\d+[A-Za-z]?$/.test(file) || extra.length)
      throw Error('BP3D_AUDIT_TABLE_SCHEMA');
    if (!byFma.has(fma)) byFma.set(fma, new Set());
    byFma.get(fma).add(file);
  }
  const wanted = new Set(), ids = new Set();
  for (const struct of structures) {
    if (typeof struct.id !== 'string' || ids.has(struct.id) || !/^FMA\d+$/.test(struct.fma) ||
        !struct.nameEn || typeof struct.nameEn !== 'string') throw Error('BP3D_AUDIT_INVALID_STRUCTURE');
    if (/(kidney|renal pelvis|malleus|incus|stapes|auditory ossicle)/i.test(struct.nameEn))
      throw Error('BP3D_AUDIT_QUARANTINED_STRUCTURE:' + struct.fma);
    ids.add(struct.id);
    const fromTable = byFma.get(struct.fma);
    if (!fromTable?.size) throw Error('BP3D_AUDIT_MISSING_FMA:' + struct.fma);
    for (const fj of fromTable) wanted.add('isa_BP3D_4.0_obj_99/' + fj + '.obj');
  }
  const actual = Object.keys(members);
  for (const p of actual) {
    if (!/^isa_BP3D_4\.0_obj_99\/FJ\d+[A-Za-z]?\.obj$/.test(p) || !sha64(members[p]))
      throw Error('BP3D_AUDIT_BAD_MEMBER:' + p);
  }
  const missing = [...wanted].filter(k => !Object.hasOwn(members, k));
  const extras = actual.filter(k => !wanted.has(k));
  if (missing.length || extras.length)
    throw Error('BP3D_AUDIT_LINEAGE_MISMATCH missing=' + missing.join(',') + ' extra=' + extras.join(','));
  return { fmaCount: new Set(structures.map(s => s.fma)).size, structures: structures.length, officialObjPaths: [...wanted].sort() };
}

/** Scan independent studio source files for imports/runtime URLs from the upstream NC Atlas frontend. */
export function detectLegacyAtlasCode(content) {
  const text = String(content);
  return /(?:apps\/anatomy\/|\/anatomy\/viewer\/|@medcoel\/anatomy\b|nqwrc\/3d-anatomy|\/models\/(?:nervous|visceral|skeletal|muscular|joints)\.glb)/i.test(text);
}
export function auditAnatomySourceBoundary({ root = REPO } = {}) {
  const basis = path.join(root, 'apps/studios'), dirs = [
    path.join(basis, 'engines/anatomy3d'), path.join(basis, 'shell'),
    ...ANATOMY_STUDIOS.map(id => path.join(basis, id)),
  ];
  const findings = [];
  const visit = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'dist' || entry.name === 'node_modules' || entry.name === '.git') continue;
      if (entry.isSymbolicLink()) throw Error('BP3D_AUDIT_SYMLINK_IN_SOURCE:' + entry.name);
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (entry.isFile() && /\.(?:js|mjs|ts|tsx|jsx|css|html)$/.test(entry.name) &&
               detectLegacyAtlasCode(fs.readFileSync(full, 'utf8')))
        findings.push(path.relative(root, full).replaceAll(path.sep, '/'));
    }
  };
  for (const dir of dirs) visit(dir);
  if (findings.length) throw Error('BP3D_AUDIT_NC_ATLAS_SOURCE_DEPENDENCY:' + findings.join(','));
  return { passed: true, studios: ANATOMY_STUDIOS.length, sourceDirectories: dirs.length,
    scope: 'static code/url boundary only; not a copyright ownership opinion or dependency-license audit' };
}

function zippedFile(zip, member) {
  // No shell interpolation. Archive itself is SHA-pinned before any member is extracted.
  return execFileSync('unzip', ['-p', zip, member], { maxBuffer: 64 * 1024 * 1024 });
}

export function auditPrivateBodyParts3D({ root = REPO } = {}) {
  const source = path.join(root, 'local-data/licensing-quarantine/bp3d-4.0');
  const build = path.join(root, 'local-data/studio-resources/build');
  const zip = path.join(source, 'isa_BP3D_4.0_obj_99.zip');
  checkReadablePrivateFile(zip);
  if (sha(fs.readFileSync(zip)) !== OFFICIAL_ARCHIVE_SHA256) throw Error('BP3D_AUDIT_ARCHIVE_SHA_MISMATCH');
  const elementFile = path.join(source, 'isa_element_parts.txt');
  const namesFile = path.join(source, 'isa_parts_list_e.txt');
  for (const [name, digest] of Object.entries(OFFICIAL_TABLE_HASHES)) {
    const f = path.join(source, name);
    checkReadablePrivateFile(f);
    if (sha(fs.readFileSync(f)) !== digest) throw Error('BP3D_AUDIT_TABLE_SHA_MISMATCH:' + name);
  }
  const elementsTsv = fs.readFileSync(elementFile, 'utf8');
  const namesHash = sha(fs.readFileSync(namesFile));
  const sourceBoundary = auditAnatomySourceBoundary({ root });
  const cachedObjHashes = new Map(), objLicenseCounts = {};
  const studios = [];
  for (const id of ANATOMY_STUDIOS) {
    const base = path.join(build, id);
    const cfg = JSON.parse(fs.readFileSync(path.join(root, 'apps/studios', id, 'studio.config.json'), 'utf8'));
    if (cfg.studioId !== id || cfg.engine !== 'anatomy3d' ||
        !cfg.challengeRestricted.includes('data/structures.json')) throw Error('BP3D_AUDIT_CHALLENGE_CONFIG:' + id);
    const p = JSON.parse(fs.readFileSync(path.join(base, 'provenance.json'), 'utf8'));
    if (p.studio !== id || p.source?.sha256 !== OFFICIAL_ARCHIVE_SHA256 ||
        p.tables?.['isa_element_parts.txt'] !== OFFICIAL_TABLE_HASHES['isa_element_parts.txt'] ||
        p.tables?.['isa_parts_list_e.txt'] !== namesHash)
      throw Error('BP3D_AUDIT_PROVENANCE_SOURCE:' + id);
    for (const [rel, value] of Object.entries(p.outputs || {})) {
      if (!/^data\/(?:model\.glb|structures\.json|dataset\.json|NOTICE-BodyParts3D\.txt)$/.test(rel) && rel !== 'server/challenge.json')
        throw Error('BP3D_AUDIT_UNEXPECTED_OUTPUT:' + rel);
      const f = path.join(base, rel);
      checkReadablePrivateFile(f);
      const bytes = fs.readFileSync(f);
      if (!sha64(value.sha256) || value.bytes !== bytes.length || value.sha256 !== sha(bytes))
        throw Error('BP3D_AUDIT_OUTPUT_SHA_MISMATCH:' + id + '/' + rel);
    }
    for (const mandatory of ['data/model.glb', 'data/structures.json', 'data/dataset.json', 'data/NOTICE-BodyParts3D.txt', 'server/challenge.json'])
      if (!Object.hasOwn(p.outputs || {}, mandatory)) throw Error('BP3D_AUDIT_MISSING_OUTPUT:' + id + '/' + mandatory);
    const structures = JSON.parse(fs.readFileSync(path.join(base, 'data/structures.json'), 'utf8'));
    const lineage = verifyConceptMembers({ structures: structures.structures, elementsTsv, members: p.members });
    const memberRecords = [];
    for (const member of lineage.officialObjPaths) {
      if (!cachedObjHashes.has(member)) {
        const bytes = zippedFile(zip, member);
        cachedObjHashes.set(member, { sha256: sha(bytes), headerLicense: sourceLicenseHeader(bytes.toString('latin1', 0, Math.min(8192, bytes.length))) });
      }
      const found = cachedObjHashes.get(member);
      if (p.members[member] !== found.sha256) throw Error('BP3D_AUDIT_OBJ_SHA_MISMATCH:' + id + '/' + member);
      objLicenseCounts[found.headerLicense] = (objLicenseCounts[found.headerLicense] || 0) + 1;
      memberRecords.push({ archiveMember: member, sha256: found.sha256, archiveHeaderLicense: found.headerLicense });
    }
    const notice = fs.readFileSync(path.join(base, 'data/NOTICE-BodyParts3D.txt'), 'utf8');
    if (!notice.includes('BodyParts3D') || !notice.includes('Database Center for Life Science') ||
        !notice.includes('CC') || !notice.includes('Changes by MEDCOEL'))
      throw Error('BP3D_AUDIT_NOTICE_INCOMPLETE:' + id);
    studios.push({ id, disposition: 'RIGHTS_REVIEW_REQUIRED', studioOutput: 'local-data/studio-resources/build/' + id,
      ...lineage, members: memberRecords,
      outputSha256: Object.fromEntries(Object.entries(p.outputs).map(([k, v]) => [k, v.sha256])),
      challengeRestricted: true, noticePresent: true });
  }
  return {
    schema: 'medcoel.bp3d-exact-lineage-review.v1', generatedAt: new Date().toISOString(),
    decision: 'EVIDENCE_ONLY_NOT_LEGAL_CLEARANCE', userAccess: false, releaseApproved: false,
    source: { archiveName: 'isa_BP3D_4.0_obj_99.zip', sha256: OFFICIAL_ARCHIVE_SHA256,
      tableSha256: OFFICIAL_TABLE_HASHES,
      archivedObjNotice: 'Historical CC BY-SA 2.1 Japan', currentPublisherNotice: 'CC BY 4.0 (2025-02-27)',
      discrepancy: 'unresolved; individual license/SA legal duties require review' },
    sourceBoundary, objLicenseCounts, studios,
    remainingReviews: ['rights/CC license version and attribution', 'ShareAlike delivery restrictions',
      'exact-model provenance and contributor rights', 'medical/anatomy/terminology', 'privacy', 'B1 release gate'],
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const arg = process.argv.slice(2);
  if (arg.length === 1 && arg[0] === '--check-code-origin') {
    console.log(JSON.stringify(auditAnatomySourceBoundary(), null, 2));
  } else if (arg.length === 1 && arg[0] === '--audit-private') {
    const report = auditPrivateBodyParts3D();
    fs.mkdirSync(EVIDENCE, { recursive: true });
    const output = path.join(EVIDENCE, 'bodyparts3d-nine-studios-origin-review.json');
    fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'w', mode: 0o600 });
    console.log('Private BodyParts3D evidence packet created (NOT rights cleared): ' + path.relative(REPO, output));
    console.log('Studios:', report.studios.length, 'distinct OBJ:', new Set(report.studios.flatMap(s => s.members.map(x => x.archiveMember))).size);
  } else {
    console.error('Usage: node licensing/tools/audit-bodyparts3d-studios.mjs --check-code-origin | --audit-private');
    process.exitCode = 2;
  }
}

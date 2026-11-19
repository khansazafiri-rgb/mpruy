// Synthetic test approvals only: every distinct generated build gets its own
// exact-byte entry. Never use this helper in an actual public release workflow.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { releaseDigest } from '../licensing/tools/check-commercial-release.mjs';

export async function approveSyntheticFixture(root, product, manifestFile) {
  const approval = {
    sha256: releaseDigest(root), reviewer: 'automated synthetic fixture', reviewedAt: '2026-11-09',
    evidence: 'Generated entirely within this test; no external assets',
    commercialUse: true, redistribution: true, attribution: 'test fixture: none',
    shareAlike: 'test fixture: no upstream adaptation',
  };
  let manifest;
  try { manifest = JSON.parse(await readFile(manifestFile, 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; manifest = { schemaVersion: 1, products: {} }; }
  const policy = manifest.products[product] ||= { status: 'cleared', blockers: [], approvedBuilds: [] };
  if (!policy.approvedBuilds.some(a => a.sha256 === approval.sha256)) policy.approvedBuilds.push(approval);
  await writeFile(manifestFile, JSON.stringify(manifest));
  return path.resolve(manifestFile);
}

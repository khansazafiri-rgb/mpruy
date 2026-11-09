// Separate from the withdrawn-asset guard: a clean build is not proof of commercial rights.
// The manifest must be reviewed for every exact release build. No environment-variable bypass.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const DEFAULT_MANIFEST = fileURLToPath(new URL('../commercial-release.json', import.meta.url));

export function releaseDigest(root) {
  const files = [];
  function walk(dir, relative = '') {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) {
      const name = path.posix.join(relative, entry.name), file = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) throw Error(`Commercial release: symlink in build: ${name}`);
      if (entry.isDirectory()) walk(file, name);
      else if (entry.isFile() && name !== '.release-source.json') files.push([name, crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')]);
      else if (!entry.isFile()) throw Error(`Commercial release: unexpected entry: ${name}`);
    }
  }
  walk(root);
  return crypto.createHash('sha256').update(JSON.stringify(files)).digest('hex');
}

export function assertCommercialReleaseReady(product, root, manifestFile = DEFAULT_MANIFEST) {
  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  if (manifest.schemaVersion !== 1 || !manifest.products?.[product]) throw Error(`Commercial release: missing policy for ${product}`);
  const policy = manifest.products[product];
  if (policy.status !== 'cleared' || policy.blockers?.length) {
    throw Error(`Commercial release blocked for ${product}: ${(policy.blockers || ['rights review incomplete']).join('; ')}`);
  }
  const digest = releaseDigest(root);
  const approval = policy.approvedBuilds?.find((item) => item.sha256 === digest);
  if (!approval || !approval.reviewer || !approval.reviewedAt || !approval.evidence || approval.commercialUse !== true || approval.redistribution !== true || !approval.attribution || !approval.shareAlike) {
    throw Error(`Commercial release blocked for ${product}: build ${digest} has no complete rights approval`);
  }
  return { product, digest, reviewer: approval.reviewer, evidence: approval.evidence };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [product, root] = process.argv.slice(2);
  if (!product || !root) { console.error('usage: check-commercial-release.mjs <atlas-viewer|4d-lab> <build-dir>'); process.exitCode = 2; }
  else { try { console.log(JSON.stringify(assertCommercialReleaseReady(product, root), null, 2)); } catch (error) { console.error(error.message); process.exitCode = 1; } }
}

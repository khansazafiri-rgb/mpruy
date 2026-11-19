// Separate from the withdrawn-asset guard: a clean build is not proof of commercial rights.
// The manifest must be reviewed for every exact release build. No environment-variable bypass.
//
// Owner override (explicit, recorded, time-limited): the owner of the platform may decide, in this committed file and nowhere
// else, to release a blocked product anyway. That is an acceptance of risk, NOT a rights clearance: the result always says
// `rightsVerified: false`, the blockers stay listed, the evidence register is not touched, and the decision expires.
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

export const OWNER_OVERRIDE_ACKNOWLEDGEMENT = 'Hak komersial belum terverifikasi. Pemilik MEDCOEL menerima risiko pelanggaran lisensi dan permintaan penghapusan.';
export const OWNER_OVERRIDE_MAX_DAYS = 120;
const DAY = 86400000;

/** Returns why an override is not acceptable, or null when it is. */
export function ownerOverrideProblem(o, now = new Date()) {
  if (!o || o.enabled !== true) return 'no owner override';
  if (!o.decidedBy || typeof o.decidedBy !== 'string') return 'owner override has no decidedBy';
  if (o.rightsVerified !== false) return 'owner override must state rightsVerified: false (it cannot claim clearance)';
  if (o.acknowledgement !== OWNER_OVERRIDE_ACKNOWLEDGEMENT) return 'owner override acknowledgement text does not match';
  const decided = Date.parse(o.decidedOn), expires = Date.parse(o.expiresOn);
  if (!Number.isFinite(decided) || !Number.isFinite(expires)) return 'owner override needs decidedOn and expiresOn dates';
  if (decided > now.getTime() + DAY) return 'owner override is dated in the future';
  if (expires <= now.getTime()) return `owner override expired on ${o.expiresOn}`;
  if (expires - decided > OWNER_OVERRIDE_MAX_DAYS * DAY) return `owner override may last at most ${OWNER_OVERRIDE_MAX_DAYS} days`;
  return null;
}

export function assertCommercialReleaseReady(product, root, manifestFile = DEFAULT_MANIFEST, { now = new Date() } = {}) {
  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  if (manifest.schemaVersion !== 1 || !manifest.products?.[product]) throw Error(`Commercial release: missing policy for ${product}`);
  const policy = manifest.products[product];
  if (policy.status !== 'cleared' || policy.blockers?.length) {
    const problem = policy.ownerOverride ? ownerOverrideProblem(policy.ownerOverride, now) : 'no owner override';
    if (!problem) {
      const o = policy.ownerOverride;
      const warning = `OWNER OVERRIDE for ${product}: released on the owner's decision (${o.decidedBy}, ${o.decidedOn}, expires ${o.expiresOn}). Rights are NOT verified: ${(policy.blockers || []).length} blocker(s) remain.`;
      console.warn('\n!! ' + warning + '\n');
      return { product, digest: releaseDigest(root), ownerOverride: true, rightsVerified: false, decidedBy: o.decidedBy, decidedOn: o.decidedOn, expiresOn: o.expiresOn, scope: o.scope || null, blockers: policy.blockers || [], warning };
    }
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

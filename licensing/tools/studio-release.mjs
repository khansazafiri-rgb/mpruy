#!/usr/bin/env node
// Clinical Studio release pipeline (server-local, never run by CI against production):
//   stage    copy an exact build into <root>/<studio>/<release>/files (immutable, refuses to overwrite) + install.json
//   receipt  run the B1 offline inspector on the INSTALLED bytes; only if eligible, sign a clearance receipt (HMAC-SHA256)
//   attest   re-hash every installed byte against the manifest, then sign a size/mtime snapshot of the installation
//   revoke   add a release or receipt to <root>/revocations.json
//   verify   offline end-to-end verification of an installation (same checks as the PocketBase gate, plus full re-hash)
// Keys come from MEDCOEL_STUDIO_KEYS (JSON {"kid":"secret"}) and MEDCOEL_STUDIO_SIGNING_KID. Never from the repository.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { inspectStudioResources } from './inspect-studio-resources.mjs';

const require = createRequire(import.meta.url);
const C = require('../../packages/studio-contract/clearance.cjs');
const REPO = fileURLToPath(new URL('../../', import.meta.url));
export const sha256Bytes = b => crypto.createHash('sha256').update(b).digest('hex');
export const sha256Text = t => crypto.createHash('sha256').update(Buffer.from(t, 'utf8')).digest('hex');
export const hmac = (text, secret) => crypto.createHmac('sha256', Buffer.from(secret, 'utf8')).update(Buffer.from(text, 'utf8')).digest('hex');
export const equal = (a, b) => typeof a === 'string' && typeof b === 'string' && a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
const readJson = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const mtimeMs = f => Number(fs.statSync(f, { bigint: true }).mtimeNs / 1000000n);

function walk(dir, prefix = '', out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const rel = prefix + e.name, abs = path.join(dir, e.name);
    if (e.isSymbolicLink()) throw Error('Symlink refused: ' + rel);
    if (e.isDirectory()) walk(abs, rel + '/', out);
    else if (e.isFile()) out.push(rel);
    else throw Error('Special file refused: ' + rel);
  }
  return out;
}

export function evidenceRevision(licensingRoot) {
  const parts = ['commercial-rights-evidence.json', 'resources.v1.json', 'commercial-release.json']
    .map(name => name + '\t' + sha256Text(fs.readFileSync(path.join(licensingRoot, name), 'utf8')));
  return sha256Text('medcoel.evidence.v1\n' + parts.join('\n') + '\n');
}
export const quarantineDigest = licensingRoot => sha256Text(fs.readFileSync(path.join(licensingRoot, 'quarantine-policy.json'), 'utf8'));

/** Copy a build (which already contains studio-manifest.json) into a new, immutable installation directory. */
export function stage({ studioId, releaseId, build, root }) {
  if (!C.STUDIO_ID.test(studioId) || !C.RELEASE_ID.test(releaseId)) throw Error('Invalid studio or release id');
  const manifest = readJson(path.join(build, 'studio-manifest.json'));
  const problem = C.validateInventory(manifest, { studioId, releaseId });
  if (problem) throw Error('Manifest refused: ' + problem);
  const files = walk(build);
  const listed = new Set(manifest.files.map(f => f.path));
  for (const rel of files) if (rel !== 'studio-manifest.json' && !listed.has(rel)) throw Error('Unmanifested file: ' + rel);
  for (const f of manifest.files) {
    const b = fs.readFileSync(path.join(build, f.path));
    if (b.length !== f.bytes || sha256Bytes(b) !== f.sha256) throw Error('Build bytes differ from manifest: ' + f.path);
  }
  const dir = path.join(root, studioId, releaseId);
  if (fs.existsSync(dir)) throw Error('Release already installed (installations are immutable): ' + dir);
  const tmp = dir + '.staging-' + crypto.randomBytes(4).toString('hex');
  fs.mkdirSync(path.join(tmp, 'files'), { recursive: true });
  for (const rel of files) { fs.mkdirSync(path.dirname(path.join(tmp, 'files', rel)), { recursive: true }); fs.copyFileSync(path.join(build, rel), path.join(tmp, 'files', rel)); }
  const install = { schema: 'medcoel.studio-install.v1', studioId, releaseId, installationId: crypto.randomBytes(16).toString('hex'),
    buildDigest: C.buildDigest(manifest, sha256Text), stagedAt: new Date().toISOString() };
  fs.writeFileSync(path.join(tmp, 'install.json'), JSON.stringify(install, null, 2) + '\n');
  fs.renameSync(tmp, dir);
  return install;
}

function signingKeys() {
  const keys = C.parseKeys(process.env.MEDCOEL_STUDIO_KEYS || '');
  const kid = process.env.MEDCOEL_STUDIO_SIGNING_KID || '';
  if (!keys[kid]) throw Error('Signing key unavailable: set MEDCOEL_STUDIO_KEYS and MEDCOEL_STUDIO_SIGNING_KID on the server');
  return { keys, kid };
}

/** Inspect the INSTALLED files with the B1 evaluator; sign a receipt only when the decision is eligible. */
export function issueReceipt({ studioId, releaseId, root, licensingRoot = path.join(REPO, 'licensing'), catalogFile, ttlDays = 30, now = Date.now() }) {
  const dir = path.join(root, studioId, releaseId), install = readJson(path.join(dir, 'install.json'));
  const manifest = readJson(path.join(dir, 'files', 'studio-manifest.json'));
  const report = inspectStudioResources({
    studioId,
    catalog: readJson(catalogFile || path.join(REPO, 'shared/studios/catalog.v1.json')),
    catalogSchema: readJson(path.join(REPO, 'shared/studios/catalog.schema.json')),
    resources: readJson(path.join(licensingRoot, 'resources.v1.json')),
    resourceSchema: readJson(path.join(REPO, 'licensing/resource-manifest.schema.json')),
    evidence: readJson(path.join(licensingRoot, 'commercial-rights-evidence.json')),
    commercialManifest: path.join(licensingRoot, 'commercial-release.json'),
    buildRoot: path.join(dir, 'files'),
  });
  if (!report.decision.eligible) return { issued: false, report };
  const digest = C.buildDigest(manifest, sha256Text);
  if (digest !== install.buildDigest) throw Error('Installed build digest differs from install.json');
  const { keys, kid } = signingKeys();
  const payload = { v: 1, kind: 'receipt', kid, receiptId: crypto.randomBytes(16).toString('hex'), studioId, releaseId,
    installationId: install.installationId, buildDigest: digest, resourceManifestSha256: manifest.resourceManifestSha256,
    evidenceRevision: evidenceRevision(licensingRoot), quarantinePolicySha256: quarantineDigest(licensingRoot),
    inspector: { tool: 'inspect-studio-resources', eligible: true, allowOwnerOverride: false }, issuedAt: now, expiresAt: now + Math.min(ttlDays * 86400000, C.LIMITS.receipt) };
  const doc = C.sign('receipt', payload, keys, hmac);
  fs.writeFileSync(path.join(dir, 'clearance-receipt.json'), JSON.stringify(doc, null, 2) + '\n');
  return { issued: true, receiptId: payload.receiptId, report };
}

/** Full byte re-hash of the installation, then a signed size/mtime snapshot the server can check cheaply per request. */
export function attest({ studioId, releaseId, root, ttlDays = 7, now = Date.now() }) {
  const dir = path.join(root, studioId, releaseId), filesDir = path.join(dir, 'files');
  const install = readJson(path.join(dir, 'install.json')), manifest = readJson(path.join(filesDir, 'studio-manifest.json'));
  const problem = C.validateInventory(manifest, { studioId, releaseId });
  if (problem) throw Error('Manifest refused: ' + problem);
  if (C.buildDigest(manifest, sha256Text) !== install.buildDigest) throw Error('BUILD_DIGEST_MISMATCH');
  const actual = walk(filesDir), listed = new Set(manifest.files.map(f => f.path));
  for (const rel of actual) if (rel !== 'studio-manifest.json' && !listed.has(rel)) throw Error('Unmanifested file: ' + rel);
  for (const f of manifest.files) {
    const b = fs.readFileSync(path.join(filesDir, f.path));
    if (b.length !== f.bytes || sha256Bytes(b) !== f.sha256) throw Error('Installed bytes changed: ' + f.path);
  }
  const files = manifest.files.map(f => f.path).concat(['studio-manifest.json']).sort()
    .map(p => ({ path: p, bytes: fs.statSync(path.join(filesDir, p)).size, mtimeMs: mtimeMs(path.join(filesDir, p)) }));
  const { keys, kid } = signingKeys();
  const doc = C.sign('attestation', { v: 1, kind: 'attestation', kid, studioId, releaseId, installationId: install.installationId,
    buildDigest: install.buildDigest, files, attestedAt: now, expiresAt: now + Math.min(ttlDays * 86400000, C.LIMITS.attestation) }, keys, hmac);
  fs.writeFileSync(path.join(dir, 'attestation.json'), JSON.stringify(doc, null, 2) + '\n');
  return { files: files.length };
}

export function revoke({ root, studioId, releaseId, receiptId, kid }) {
  const file = path.join(root, 'revocations.json');
  const data = fs.existsSync(file) ? readJson(file) : { receipts: [], releases: [], kids: [] };
  if (receiptId) data.receipts.push(receiptId);
  if (studioId && releaseId) data.releases.push({ studioId, releaseId });
  if (kid) data.kids.push(kid);
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
  return data;
}

export function verifyInstallation({ studioId, releaseId, root, licensingRoot = path.join(REPO, 'licensing'), now = Date.now() }) {
  const keys = C.parseKeys(process.env.MEDCOEL_STUDIO_KEYS || '');
  const dir = path.join(root, studioId, releaseId), filesDir = path.join(dir, 'files');
  const install = readJson(path.join(dir, 'install.json')), manifest = readJson(path.join(filesDir, 'studio-manifest.json'));
  const problem = C.validateInventory(manifest, { studioId, releaseId });
  if (problem) return { ok: false, code: problem };
  const digest = C.buildDigest(manifest, sha256Text);
  if (digest !== install.buildDigest) return { ok: false, code: 'BUILD_DIGEST_MISMATCH' };
  for (const f of manifest.files) {
    const p = path.join(filesDir, f.path);
    if (!fs.existsSync(p) || sha256Bytes(fs.readFileSync(p)) !== f.sha256) return { ok: false, code: 'FILE_HASH_MISMATCH', path: f.path };
  }
  const revFile = path.join(root, 'revocations.json'), revoked = fs.existsSync(revFile) ? readJson(revFile) : {};
  const ctx = { keys, hmac, equal, now, revoked };
  const r = C.verify('receipt', readJson(path.join(dir, 'clearance-receipt.json')), { ...ctx, expect: { studioId, releaseId, installationId: install.installationId, buildDigest: digest,
    resourceManifestSha256: manifest.resourceManifestSha256, evidenceRevision: evidenceRevision(licensingRoot), quarantinePolicySha256: quarantineDigest(licensingRoot) } });
  if (!r.ok) return { ok: false, code: 'RECEIPT_' + r.code };
  const a = C.verify('attestation', readJson(path.join(dir, 'attestation.json')), { ...ctx, expect: { studioId, releaseId, installationId: install.installationId, buildDigest: digest } });
  if (!a.ok) return { ok: false, code: 'ATTESTATION_' + a.code };
  return { ok: true };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [cmd, ...rest] = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < rest.length; i += 2) opts[rest[i].replace(/^--/, '').replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = rest[i + 1];
  const map = { studio: 'studioId', release: 'releaseId', receipt: 'receiptId' };
  for (const [k, v] of Object.entries(map)) if (opts[k] !== undefined) { opts[v] = opts[k]; delete opts[k]; }
  if (opts.ttlDays) opts.ttlDays = Number(opts.ttlDays);
  try {
    const fn = { stage, receipt: issueReceipt, attest, revoke, verify: verifyInstallation }[cmd];
    if (!fn) throw Error('Usage: studio-release.mjs stage|receipt|attest|revoke|verify --studio <id> --release <id> --root <dir> [--build <dir>]');
    const out = fn(opts);
    console.log(JSON.stringify(out.report ? { issued: out.issued, receiptId: out.receiptId, blockers: out.report.decision.blockers } : out, null, 2));
    if (out.issued === false || out.ok === false) process.exitCode = 1;
  } catch (err) { console.error(err.message); process.exitCode = 1; }
}

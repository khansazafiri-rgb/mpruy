// Clinical Studio release pipeline: B1 inspection -> signed receipt -> immutable install -> attestation -> verification.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { stage, issueReceipt, attest, revoke, verifyInstallation } from '../licensing/tools/studio-release.mjs';
import { createTestRelease } from './studio-test-release.mjs';

const KEY = 'k'.repeat(48);
function setup(t, extra = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'studio-release-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  process.env.MEDCOEL_STUDIO_KEYS = JSON.stringify({ test1: KEY });
  process.env.MEDCOEL_STUDIO_SIGNING_KID = 'test1';
  const files = new Map([['index.html', Buffer.from('<!doctype html><title>t</title><script type="module" src="./app.js"></script>')], ['app.js', Buffer.from('console.log("neutral fixture")')], ['data.bin', Buffer.from('NEUTRAL SYNTHETIC TEST BYTES')]]);
  const r = createTestRelease({ dir, files, ...extra });
  const root = path.join(dir, 'studios');
  return { ...r, dir, root, args: { studioId: r.studioId, releaseId: r.releaseId, root, licensingRoot: r.licensingRoot, catalogFile: r.catalogFile } };
}

test('RELEASE-001: a fully bound engineering release is staged, cleared by B1, receipted, attested and verified', t => {
  const s = setup(t);
  const install = stage({ studioId: s.studioId, releaseId: s.releaseId, build: s.dist, root: s.root });
  assert.match(install.installationId, /^[a-f0-9]{32}$/);
  const r = issueReceipt(s.args);
  assert.equal(r.issued, true, JSON.stringify(r.report.errors));
  attest(s.args);
  assert.deepEqual(verifyInstallation(s.args), { ok: true });
});

test('RELEASE-002: installations are immutable and builds with extra or changed bytes are refused', t => {
  const s = setup(t);
  fs.writeFileSync(path.join(s.dist, 'sneaky.js'), 'alert(1)');
  assert.throws(() => stage({ studioId: s.studioId, releaseId: s.releaseId, build: s.dist, root: s.root }), /Unmanifested file/);
  fs.rmSync(path.join(s.dist, 'sneaky.js'));
  fs.writeFileSync(path.join(s.dist, 'app.js'), 'console.log("changed")');
  assert.throws(() => stage({ studioId: s.studioId, releaseId: s.releaseId, build: s.dist, root: s.root }), /differ from manifest/);
});

test('RELEASE-003: the canonical catalog and committed ledger never yield a receipt (no clinical studio is cleared)', t => {
  const s = setup(t);
  stage({ studioId: s.studioId, releaseId: s.releaseId, build: s.dist, root: s.root });
  const r = issueReceipt({ ...s.args, licensingRoot: undefined, catalogFile: undefined });
  assert.equal(r.issued, false);
  assert.equal(fs.existsSync(path.join(s.root, s.studioId, s.releaseId, 'clearance-receipt.json')), false);
});

test('RELEASE-004: a tampered installed file is detected by attestation and verification', t => {
  const s = setup(t);
  stage({ studioId: s.studioId, releaseId: s.releaseId, build: s.dist, root: s.root });
  issueReceipt(s.args); attest(s.args);
  fs.writeFileSync(path.join(s.root, s.studioId, s.releaseId, 'files', 'app.js'), 'console.log("evil")');
  assert.equal(verifyInstallation(s.args).code, 'FILE_HASH_MISMATCH');
  assert.throws(() => attest(s.args), /Installed bytes changed/);
});

test('RELEASE-005: changing the rights ledger after issuance invalidates the receipt (evidence revision binding)', t => {
  const s = setup(t);
  stage({ studioId: s.studioId, releaseId: s.releaseId, build: s.dist, root: s.root });
  issueReceipt(s.args); attest(s.args);
  const f = path.join(s.licensingRoot, 'commercial-rights-evidence.json');
  fs.writeFileSync(f, fs.readFileSync(f, 'utf8') + '\n');
  assert.deepEqual(verifyInstallation(s.args), { ok: false, code: 'RECEIPT_BINDING_MISMATCH' });
});

test('RELEASE-006: revoked releases, wrong keys and expired receipts fail', t => {
  const s = setup(t);
  stage({ studioId: s.studioId, releaseId: s.releaseId, build: s.dist, root: s.root });
  issueReceipt(s.args); attest(s.args);
  process.env.MEDCOEL_STUDIO_KEYS = JSON.stringify({ test1: 'x'.repeat(48) });
  assert.equal(verifyInstallation(s.args).code, 'RECEIPT_BAD_SIGNATURE');
  process.env.MEDCOEL_STUDIO_KEYS = JSON.stringify({ test1: KEY });
  assert.equal(verifyInstallation({ ...s.args, now: Date.now() + 31 * 86400000 }).code, 'RECEIPT_EXPIRED');
  revoke({ root: s.root, studioId: s.studioId, releaseId: s.releaseId });
  assert.equal(verifyInstallation(s.args).code, 'RECEIPT_RELEASE_REVOKED');
});

test('RELEASE-007: no signing key, no receipt', t => {
  const s = setup(t);
  stage({ studioId: s.studioId, releaseId: s.releaseId, build: s.dist, root: s.root });
  process.env.MEDCOEL_STUDIO_KEYS = JSON.stringify({ test1: 'short' });
  assert.throws(() => issueReceipt(s.args), /Signing key unavailable/);
});

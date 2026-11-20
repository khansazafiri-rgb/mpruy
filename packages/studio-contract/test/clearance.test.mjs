import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { test } from 'node:test';
const C = createRequire(import.meta.url)('../clearance.cjs');
const hmac = (t, s) => crypto.createHmac('sha256', s).update(t).digest('hex');
const sha256 = t => crypto.createHash('sha256').update(t).digest('hex');
let equalCalls = 0;
const equal = (a, b) => { equalCalls++; return a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b)); };
const keys = { k1: 's'.repeat(40) };
const now = 1_800_000_000_000;
const base = () => ({ v: 1, kind: 'receipt', kid: 'k1', receiptId: 'a'.repeat(32), studioId: 'brain-mri', releaseId: 'r1', installationId: 'b'.repeat(32),
  buildDigest: 'c'.repeat(64), resourceManifestSha256: 'd'.repeat(64), evidenceRevision: 'e'.repeat(64), quarantinePolicySha256: 'f'.repeat(64),
  inspector: { tool: 'inspect-studio-resources', eligible: true, allowOwnerOverride: false }, issuedAt: now, expiresAt: now + 86400000 });
const ctx = extra => ({ keys, hmac, equal, now, ...extra });

test('CLEAR-001: valid receipt verifies; signature check is constant-time', () => {
  equalCalls = 0;
  const doc = C.sign('receipt', base(), keys, hmac);
  assert.equal(C.verify('receipt', doc, ctx()).ok, true);
  assert.equal(equalCalls, 1);
});
test('CLEAR-002: HMAC mismatch, unknown kid, weak key and revoked kid are rejected', () => {
  const doc = C.sign('receipt', base(), keys, hmac);
  assert.equal(C.verify('receipt', { ...doc, sig: '0'.repeat(64) }, ctx()).code, 'BAD_SIGNATURE');
  const forged = structuredClone(doc); forged.payload.studioId = 'chest-ct';
  assert.equal(C.verify('receipt', forged, ctx()).code, 'BAD_SIGNATURE');
  assert.equal(C.verify('receipt', doc, ctx({ keys: { k2: 's'.repeat(40) } })).code, 'UNKNOWN_KEY');
  assert.equal(C.verify('receipt', doc, ctx({ keys: { k1: 'short' } })).code, 'UNKNOWN_KEY');
  assert.equal(C.verify('receipt', doc, ctx({ revoked: { kids: ['k1'] } })).code, 'KEY_REVOKED');
  assert.throws(() => C.sign('receipt', base(), { k1: 'short' }, hmac), /SIGNING_KEY_UNAVAILABLE/);
});
test('CLEAR-003: expiry, future issue, excessive lifetime and inspector override are rejected', () => {
  const doc = C.sign('receipt', base(), keys, hmac);
  assert.equal(C.verify('receipt', doc, ctx({ now: now + 86400000 })).code, 'EXPIRED');
  assert.equal(C.verify('receipt', doc, ctx({ now: now - 5 * 60000 })).code, 'NOT_YET_VALID');
  const long = base(); long.expiresAt = now + 91 * 86400000;
  assert.throws(() => C.sign('receipt', long, keys, hmac), /LIFETIME/);
  const override = base(); override.inspector.allowOwnerOverride = true;
  assert.throws(() => C.sign('receipt', override, keys, hmac), /INSPECTOR/);
  const extra = C.sign('receipt', base(), keys, hmac); extra.payload.approved = true;
  assert.equal(C.verify('receipt', extra, ctx()).code, 'MALFORMED');
});
test('CLEAR-004: receipts bind release, digest, manifest, evidence, quarantine policy and installation', () => {
  const doc = C.sign('receipt', base(), keys, hmac);
  for (const field of ['studioId', 'releaseId', 'installationId', 'buildDigest', 'resourceManifestSha256', 'evidenceRevision', 'quarantinePolicySha256']) {
    const r = C.verify('receipt', doc, ctx({ expect: { [field]: field === 'studioId' ? 'chest-ct' : field === 'releaseId' ? 'r2' : '0'.repeat(field === 'installationId' ? 32 : 64) } }));
    assert.deepEqual([r.code, r.field], ['BINDING_MISMATCH', field]);
  }
});
test('CLEAR-005: revoked receipt or release is rejected', () => {
  const doc = C.sign('receipt', base(), keys, hmac);
  assert.equal(C.verify('receipt', doc, ctx({ revoked: { receipts: ['a'.repeat(32)] } })).code, 'RECEIPT_REVOKED');
  assert.equal(C.verify('receipt', doc, ctx({ revoked: { releases: [{ studioId: 'brain-mri', releaseId: 'r1' }] } })).code, 'RELEASE_REVOKED');
});
test('CLEAR-006: session tokens are signed, bound and short-lived', () => {
  const s = { kid: 'k1', sid: '1'.repeat(32), userId: 'abcdefghijklmno', studioId: 'brain-mri', releaseId: 'r1', installationId: 'b'.repeat(32), mode: 'guided', issuedAt: now, expiresAt: now + 60000 };
  const token = C.encodeSession(s, keys, hmac);
  assert.equal(C.decodeSession(token, ctx({ expect: { studioId: 'brain-mri', releaseId: 'r1' } })).ok, true);
  assert.equal(C.decodeSession(token.replace('guided', 'challenge'), ctx()).code, 'BAD_SIGNATURE');
  assert.equal(C.decodeSession(token.replace('abcdefghijklmno', 'abcdefghijklmnp'), ctx()).code, 'BAD_SIGNATURE');
  assert.equal(C.decodeSession(token, ctx({ expect: { studioId: 'chest-ct' } })).code, 'BINDING_MISMATCH');
  assert.equal(C.decodeSession(token, ctx({ now: now + 60000 })).code, 'EXPIRED');
  assert.throws(() => C.encodeSession({ ...s, expiresAt: now + 31 * 60000 }, keys, hmac), /INVALID_SESSION/);
  assert.equal(C.decodeSession(token + '~x', ctx()).code, 'MALFORMED');
});
test('CLEAR-007: delivery paths reject traversal, dot files, encodings and absolute paths', () => {
  for (const bad of ['../x', 'a/../b', './a', '.env', 'a/.git/config', '/etc/passwd', 'a\\b', 'a%2e%2e/b', 'a//b', '', 'a/b/', 'a?b', 'x'.repeat(241)]) assert.equal(C.safeAssetPath(bad), null, bad);
  for (const ok of ['index.html', 'assets/app-1.js', 'data/mri/t1.nii.gz']) assert.equal(C.safeAssetPath(ok), ok);
  assert.equal(C.contentTypeFor('a.exe'), null);
  assert.equal(C.contentTypeFor('a.html'), 'text/html; charset=utf-8');
});
test('CLEAR-008: inventory must bind index.html and the resource manifest; build digest is order independent', () => {
  const m = { schema: 'medcoel.studio.v1', id: 'brain-mri', releaseId: 'r1', entry: 'index.html', resourceManifestSha256: 'd'.repeat(64),
    files: [{ path: 'index.html', bytes: 1, sha256: '1'.repeat(64) }, { path: 'resource-manifest.json', bytes: 2, sha256: 'd'.repeat(64) }] };
  assert.equal(C.validateInventory(m, { studioId: 'brain-mri', releaseId: 'r1' }), null);
  assert.equal(C.validateInventory(m, { studioId: 'chest-ct', releaseId: 'r1' }), 'MANIFEST_IDENTITY');
  assert.equal(C.validateInventory({ ...m, files: [m.files[0]] }, { studioId: 'brain-mri', releaseId: 'r1' }), 'MANIFEST_RESOURCE_BINDING');
  assert.equal(C.validateInventory({ ...m, files: [...m.files, { path: '../x', bytes: 1, sha256: '1'.repeat(64) }] }, { studioId: 'brain-mri', releaseId: 'r1' }), 'MANIFEST_PATH');
  assert.equal(C.buildDigest(m, sha256), C.buildDigest({ ...m, files: [...m.files].reverse() }, sha256));
  assert.notEqual(C.buildDigest(m, sha256), C.buildDigest({ ...m, files: [{ ...m.files[0], bytes: 9 }, m.files[1]] }, sha256));
});
test('CLEAR-009: key maps drop weak or malformed keys', () => {
  assert.deepEqual(C.parseKeys('{"ok":"' + 'x'.repeat(32) + '","weak":"abc","BAD KID":"' + 'y'.repeat(40) + '"}'), { ok: 'x'.repeat(32) });
  assert.deepEqual(C.parseKeys('not json'), {});
});

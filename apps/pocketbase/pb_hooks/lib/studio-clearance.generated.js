// GENERATED FILE. Do not edit. Run node scripts/generate-studio-server-contract.mjs.
'use strict';
// MEDCOEL Clinical Studios: signed clearance receipts, installation attestations and launch sessions.
// Pure and dependency-free. Runs unchanged in Node (tools/tests) and in the PocketBase JSVM (generated copy).
// Crypto primitives are injected: hmac(text, secret) -> lowercase hex, sha256(text) -> hex, equal(a, b) constant time.
// Nothing here reads files, environment variables or the network.

const SHA256 = /^[a-f0-9]{64}$/;
const STUDIO_ID = /^[a-z][a-z0-9-]{2,40}$/;
const RELEASE_ID = /^[a-z0-9-]{1,64}$/;
const KID = /^[a-z0-9-]{1,32}$/;
const INSTALLATION_ID = /^[a-f0-9]{32}$/;
const RECEIPT_ID = /^[a-f0-9]{32}$/;
const USER_ID = /^[a-z0-9]{15}$/;
const MODES = ['explore', 'guided', 'challenge'];
const MIN_SECRET_LENGTH = 32;
const DAY = 86400000;
const LIMITS = Object.freeze({ receipt: 90 * DAY, attestation: 14 * DAY, session: 30 * 60000 });
const CLOCK_SKEW_MS = 60000;
const MAX_FILES = 4000;
const MAX_FILE_BYTES = 256 * 1024 * 1024;

const isObject = v => !!v && typeof v === 'object' && !Array.isArray(v);
const isInt = v => typeof v === 'number' && Number.isSafeInteger(v);

/** Deterministic JSON: sorted object keys, no undefined, finite numbers only. */
function canonical(value) {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number') { if (!isFinite(value)) throw Error('NON_FINITE'); return JSON.stringify(value); }
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (isObject(value)) return '{' + Object.keys(value).sort().filter(k => value[k] !== undefined).map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
  throw Error('UNSUPPORTED_VALUE');
}

/** Studio-relative delivery path. Rejects traversal, dot-files, encoded tricks, backslashes and absolute paths. */
function safeAssetPath(p) {
  if (typeof p !== 'string' || !p.length || p.length > 240) return null;
  if (!/^[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/.test(p)) return null;
  for (const seg of p.split('/')) if (seg === '.' || seg === '..' || seg.charAt(0) === '.') return null;
  return p;
}

const CONTENT_TYPES = {
  html: 'text/html; charset=utf-8', js: 'text/javascript; charset=utf-8', mjs: 'text/javascript; charset=utf-8',
  css: 'text/css; charset=utf-8', json: 'application/json', txt: 'text/plain; charset=utf-8', md: 'text/plain; charset=utf-8',
  svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp', woff2: 'font/woff2',
  wasm: 'application/wasm', glb: 'model/gltf-binary', gz: 'application/gzip', nii: 'application/octet-stream',
  bin: 'application/octet-stream', dcm: 'application/dicom',
};
function contentTypeFor(p) {
  const m = /\.([a-z0-9]{1,6})$/.exec(String(p));
  return m && Object.prototype.hasOwnProperty.call(CONTENT_TYPES, m[1]) ? CONTENT_TYPES[m[1]] : null;
}

/** Inventory of an installed build, as written in studio-manifest.json. */
function validateInventory(manifest, expect) {
  if (!isObject(manifest) || manifest.schema !== 'medcoel.studio.v1') return 'MANIFEST_SCHEMA';
  if (manifest.id !== expect.studioId || manifest.releaseId !== expect.releaseId || manifest.entry !== 'index.html') return 'MANIFEST_IDENTITY';
  if (!Array.isArray(manifest.files) || !manifest.files.length || manifest.files.length > MAX_FILES) return 'MANIFEST_FILES';
  if (!SHA256.test(manifest.resourceManifestSha256 || '')) return 'MANIFEST_RESOURCE_BINDING';
  const seen = {};
  let entry = false, resource = false;
  for (const f of manifest.files) {
    if (!isObject(f) || !safeAssetPath(f.path) || f.path === 'studio-manifest.json' || seen[f.path]) return 'MANIFEST_PATH';
    if (!SHA256.test(f.sha256 || '') || !isInt(f.bytes) || f.bytes < 0 || f.bytes > MAX_FILE_BYTES) return 'MANIFEST_FILE_HASH';
    seen[f.path] = true;
    if (f.path === 'index.html') entry = true;
    if (f.path === 'resource-manifest.json') { resource = true; if (f.sha256 !== manifest.resourceManifestSha256) return 'MANIFEST_RESOURCE_BINDING'; }
  }
  if (!entry) return 'MANIFEST_ENTRY';
  if (!resource) return 'MANIFEST_RESOURCE_BINDING';
  return null;
}

/** Digest of the exact build: every delivered file path, byte count and SHA-256, plus the bound resource manifest. */
function buildDigest(manifest, sha256) {
  const lines = manifest.files.map(f => f.path + '\t' + f.bytes + '\t' + f.sha256).sort();
  return sha256('medcoel.build.v1\n' + lines.join('\n') + '\nresource\t' + manifest.resourceManifestSha256 + '\n');
}

const FIELDS = {
  receipt: ['v', 'kind', 'kid', 'receiptId', 'studioId', 'releaseId', 'installationId', 'buildDigest', 'resourceManifestSha256',
    'evidenceRevision', 'quarantinePolicySha256', 'inspector', 'issuedAt', 'expiresAt'],
  attestation: ['v', 'kind', 'kid', 'studioId', 'releaseId', 'installationId', 'buildDigest', 'files', 'attestedAt', 'expiresAt'],
};

function payloadProblem(kind, p) {
  if (!isObject(p) || p.v !== 1 || p.kind !== kind) return 'SHAPE';
  const keys = Object.keys(p).sort().join(','), want = FIELDS[kind].slice().sort().join(',');
  if (keys !== want) return 'SHAPE';
  if (!KID.test(p.kid) || !STUDIO_ID.test(p.studioId) || !RELEASE_ID.test(p.releaseId) || !INSTALLATION_ID.test(p.installationId) || !SHA256.test(p.buildDigest)) return 'SHAPE';
  const start = kind === 'receipt' ? p.issuedAt : p.attestedAt;
  if (!isInt(start) || !isInt(p.expiresAt) || p.expiresAt <= start || p.expiresAt - start > LIMITS[kind]) return 'LIFETIME';
  if (kind === 'receipt') {
    if (!RECEIPT_ID.test(p.receiptId) || !SHA256.test(p.resourceManifestSha256) || !SHA256.test(p.evidenceRevision) || !SHA256.test(p.quarantinePolicySha256)) return 'SHAPE';
    if (!isObject(p.inspector) || p.inspector.tool !== 'inspect-studio-resources' || p.inspector.eligible !== true || p.inspector.allowOwnerOverride !== false) return 'INSPECTOR';
  } else {
    if (!Array.isArray(p.files) || !p.files.length || p.files.length > MAX_FILES) return 'SHAPE';
    for (const f of p.files) if (!isObject(f) || !safeAssetPath(f.path) || !isInt(f.bytes) || !isInt(f.mtimeMs)) return 'SHAPE';
  }
  return null;
}

const signingInput = (kind, payload) => 'medcoel.' + kind + '.v1\n' + canonical(payload);

function sign(kind, payload, keys, hmac) {
  const problem = payloadProblem(kind, payload);
  if (problem) throw Error('INVALID_' + kind.toUpperCase() + '_' + problem);
  const secret = keys && keys[payload.kid];
  if (typeof secret !== 'string' || secret.length < MIN_SECRET_LENGTH) throw Error('SIGNING_KEY_UNAVAILABLE');
  return { payload, sig: hmac(signingInput(kind, payload), secret) };
}

/**
 * Verify a signed document. ctx: { keys, hmac, equal, now, revoked, expect }.
 * revoked: { receipts: [receiptId], releases: [{ studioId, releaseId }], kids: [kid] }.
 * expect: fields that must match exactly (bindings to the live installation and evidence).
 */
function verify(kind, doc, ctx) {
  if (!isObject(doc) || Object.keys(doc).sort().join(',') !== 'payload,sig' || typeof doc.sig !== 'string' || !/^[a-f0-9]{64}$/.test(doc.sig)) return { ok: false, code: 'MALFORMED' };
  const p = doc.payload;
  const problem = payloadProblem(kind, p);
  if (problem) return { ok: false, code: problem === 'LIFETIME' ? 'INVALID_LIFETIME' : 'MALFORMED' };
  const revoked = ctx.revoked || {};
  if ((revoked.kids || []).indexOf(p.kid) >= 0) return { ok: false, code: 'KEY_REVOKED' };
  const secret = ctx.keys && ctx.keys[p.kid];
  if (typeof secret !== 'string' || secret.length < MIN_SECRET_LENGTH) return { ok: false, code: 'UNKNOWN_KEY' };
  // Always compute and compare: constant-time comparison of equal-length hex strings.
  if (!ctx.equal(ctx.hmac(signingInput(kind, p), secret), doc.sig)) return { ok: false, code: 'BAD_SIGNATURE' };
  const now = ctx.now;
  const start = kind === 'receipt' ? p.issuedAt : p.attestedAt;
  if (!isInt(now) || start > now + CLOCK_SKEW_MS) return { ok: false, code: 'NOT_YET_VALID' };
  if (p.expiresAt <= now) return { ok: false, code: 'EXPIRED' };
  if (kind === 'receipt' && (revoked.receipts || []).indexOf(p.receiptId) >= 0) return { ok: false, code: 'RECEIPT_REVOKED' };
  if ((revoked.releases || []).some(r => r && r.studioId === p.studioId && r.releaseId === p.releaseId)) return { ok: false, code: 'RELEASE_REVOKED' };
  const expect = ctx.expect || {};
  for (const key of Object.keys(expect)) if (p[key] !== expect[key]) return { ok: false, code: 'BINDING_MISMATCH', field: key };
  return { ok: true, payload: p };
}

/**
 * Launch session (cookie) token: v1~kid~sid~userId~studioId~releaseId~installationId~mode~issuedAt~expiresAt~sig.
 * Only [a-z0-9-] and digits, so no encoding layer is needed in either runtime.
 */
function sessionFields(s) {
  return ['v1', s.kid, s.sid, s.userId, s.studioId, s.releaseId, s.installationId, s.mode, String(s.issuedAt), String(s.expiresAt)];
}
function sessionProblem(s) {
  if (!isObject(s) || !KID.test(s.kid || '') || !/^[a-f0-9]{32}$/.test(s.sid || '') || !USER_ID.test(s.userId || '') ||
      !STUDIO_ID.test(s.studioId || '') || !RELEASE_ID.test(s.releaseId || '') || !INSTALLATION_ID.test(s.installationId || '') ||
      MODES.indexOf(s.mode) < 0 || !isInt(s.issuedAt) || !isInt(s.expiresAt) || s.expiresAt <= s.issuedAt ||
      s.expiresAt - s.issuedAt > LIMITS.session) return 'MALFORMED';
  return null;
}
function encodeSession(s, keys, hmac) {
  if (sessionProblem(s)) throw Error('INVALID_SESSION');
  const secret = keys && keys[s.kid];
  if (typeof secret !== 'string' || secret.length < MIN_SECRET_LENGTH) throw Error('SIGNING_KEY_UNAVAILABLE');
  const fields = sessionFields(s);
  return fields.join('~') + '~' + hmac('medcoel.session.v1\n' + fields.join('~'), secret);
}
function decodeSession(token, ctx) {
  if (typeof token !== 'string' || token.length > 400) return { ok: false, code: 'MALFORMED' };
  const parts = token.split('~');
  if (parts.length !== 11 || parts[0] !== 'v1' || !/^\d{1,15}$/.test(parts[8]) || !/^\d{1,15}$/.test(parts[9]) || !/^[a-f0-9]{64}$/.test(parts[10])) return { ok: false, code: 'MALFORMED' };
  const s = { kid: parts[1], sid: parts[2], userId: parts[3], studioId: parts[4], releaseId: parts[5], installationId: parts[6], mode: parts[7], issuedAt: Number(parts[8]), expiresAt: Number(parts[9]) };
  if (sessionProblem(s)) return { ok: false, code: 'MALFORMED' };
  if (((ctx.revoked || {}).kids || []).indexOf(s.kid) >= 0) return { ok: false, code: 'KEY_REVOKED' };
  const secret = ctx.keys && ctx.keys[s.kid];
  if (typeof secret !== 'string' || secret.length < MIN_SECRET_LENGTH) return { ok: false, code: 'UNKNOWN_KEY' };
  if (!ctx.equal(ctx.hmac('medcoel.session.v1\n' + parts.slice(0, 10).join('~'), secret), parts[10])) return { ok: false, code: 'BAD_SIGNATURE' };
  if (s.issuedAt > ctx.now + CLOCK_SKEW_MS) return { ok: false, code: 'NOT_YET_VALID' };
  if (s.expiresAt <= ctx.now) return { ok: false, code: 'EXPIRED' };
  const expect = ctx.expect || {};
  for (const key of Object.keys(expect)) if (s[key] !== expect[key]) return { ok: false, code: 'BINDING_MISMATCH', field: key };
  return { ok: true, session: s };
}

/** Parse a server-side key map ({"kid":"secret"} JSON). Weak or malformed entries are dropped (fail closed). */
function parseKeys(json) {
  let data;
  try { data = JSON.parse(json || '{}'); } catch (_) { return {}; }
  const out = {};
  if (!isObject(data)) return out;
  for (const kid of Object.keys(data)) if (KID.test(kid) && typeof data[kid] === 'string' && data[kid].length >= MIN_SECRET_LENGTH) out[kid] = data[kid];
  return out;
}

/** Studio launch modes that the catalog marks as available; explore is the always-safe default. */
function allowedModes(entry) {
  const lm = isObject(entry) && isObject(entry.learningModes) ? entry.learningModes : {};
  return ['explore'].concat(['guided', 'challenge'].filter(m => lm[m] === 'available'));
}

module.exports = {
  SHA256, STUDIO_ID, RELEASE_ID, KID, INSTALLATION_ID, USER_ID, MODES, LIMITS, MIN_SECRET_LENGTH, CLOCK_SKEW_MS, MAX_FILE_BYTES,
  canonical, safeAssetPath, contentTypeFor, validateInventory, buildDigest, payloadProblem, signingInput, sign, verify,
  encodeSession, decodeSession, parseKeys, allowedModes,
};

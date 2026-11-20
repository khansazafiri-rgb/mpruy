// Clinical Studio runtime gate (server side). Launch and every asset request are authorised here:
//   catalog (canonical) + signed clearance receipt + signed installation attestation + live file snapshot
//   + server-side launch session bound to the user. Nothing from the client can change any of these inputs.
// Configuration (environment of the PocketBase process, never the repository):
//   MEDCOEL_STUDIO_ROOT           installed releases, default /var/lib/medcoel/studios
//   MEDCOEL_STUDIO_KEYS           JSON {"kid": "secret >= 32 chars"} used to verify receipts/attestations/sessions
//   MEDCOEL_STUDIO_SESSION_KID    kid used to sign launch sessions (must exist in MEDCOEL_STUDIO_KEYS)
//   MEDCOEL_STUDIO_LICENSING_ROOT licensing directory whose evidence revision receipts are bound to (default: repo licensing/)
//   MEDCOEL_STUDIO_TEST_CATALOG   test-only extra catalog; honoured only with MEDCOEL_DEV_MODE=1 and only for "test-" ids
'use strict';
const root = typeof __hooks !== 'undefined' ? __hooks : __dirname + '/..';
const core = require(root + '/lib/studio-contract.generated.js');
const C = require(root + '/lib/studio-clearance.generated.js');

const KNOWN_ADAPTERS = ['fixture-echo', 'anatomy3d', 'structure-identification', 'slice-navigation', 'mpr', 'window-level', 'measurement', 'clinical-case', 'waveform-ecg', 'interval-measurement'];
const MAX_JSON_BYTES = 4 * 1024 * 1024;
const MAX_DELIVERY_BYTES = 96 * 1024 * 1024;
const COOKIE = 'medcoel_studio';

function env(name) { try { return String($os.getenv(name) || ''); } catch (_) { return ''; } }
function config() {
  return {
    root: (env('MEDCOEL_STUDIO_ROOT') || '/var/lib/medcoel/studios').replace(/\/+$/, ''),
    keys: C.parseKeys(env('MEDCOEL_STUDIO_KEYS')),
    sessionKid: env('MEDCOEL_STUDIO_SESSION_KID'),
    licensingRoot: (env('MEDCOEL_STUDIO_LICENSING_ROOT') || (root + '/../../../licensing')).replace(/\/+$/, ''),
    dev: env('MEDCOEL_DEV_MODE') === '1',
  };
}
const hmac = (text, secret) => $security.hs256(text, secret);
const sha256 = text => $security.sha256(text);
const equal = (a, b) => typeof a === 'string' && typeof b === 'string' && a.length === b.length && $security.equal(a, b);

function statOf(path) {
  // Config/evidence files chosen by the operator: plain stat (the JSVM has no lstat).
  try {
    const info = $os.stat(path);
    if (!info || info.isDir() || !info.mode().isRegular()) return null;
    return { bytes: info.size(), mtimeMs: info.modTime().unixMilli() };
  } catch (_) { return null; }
}
/** A delivered file under an installation directory: every path component must be a real directory/file, never a symlink. */
function fileUnder(base, rel) {
  const parts = String(rel).split('/');
  let dir = base;
  for (let i = 0; i < parts.length; i++) {
    let entries;
    try { entries = $os.readDir(dir); } catch (_) { return null; }
    const last = i === parts.length - 1;
    const hit = entries.find(x => x.name() === parts[i]);
    if (!hit) return null;
    if (last ? !hit.type().isRegular() : !hit.isDir() || hit.type().string().charAt(0) !== 'd') return null;
    dir = dir + '/' + parts[i];
  }
  return statOf(dir);
}
function readText(path, max) {
  const s = statOf(path);
  if (!s || s.bytes > (max || MAX_JSON_BYTES)) return null;
  try { return toString($os.readFile(path)); } catch (_) { return null; }
}
function readJson(path) {
  const text = readText(path);
  if (text === null) return null;
  try { return JSON.parse(text); } catch (_) { return null; }
}

/** The canonical catalog, plus test-only "test-" studios when the server runs in dev mode with a test catalog file. */
function catalog(cfg) {
  const canonical = core.catalog;
  const testPath = env('MEDCOEL_STUDIO_TEST_CATALOG');
  if (!testPath || !cfg.dev) return canonical;
  const extra = readJson(testPath);
  if (!extra || !Array.isArray(extra.studios)) return canonical;
  const ids = {};
  canonical.studios.forEach(s => { ids[s.id] = true; });
  const added = extra.studios.filter(s => s && typeof s.id === 'string' && /^test-[a-z0-9-]{2,30}$/.test(s.id) && !ids[s.id]);
  return { schemaVersion: 1, catalogVersion: canonical.catalogVersion, studios: canonical.studios.concat(added) };
}

/** sha256 over the exact bytes of the evidence ledger, resource index and release policy (receipts bind to it). */
function evidenceRevision(cfg) {
  const parts = ['commercial-rights-evidence.json', 'resources.v1.json', 'commercial-release.json'].map(name => {
    const text = readText(cfg.licensingRoot + '/' + name);
    return text === null ? null : name + '\t' + sha256(text);
  });
  if (parts.indexOf(null) >= 0) return null;
  return sha256('medcoel.evidence.v1\n' + parts.join('\n') + '\n');
}
function quarantineDigest(cfg) {
  const text = readText(cfg.licensingRoot + '/quarantine-policy.json');
  return text === null ? null : sha256(text);
}
function revocations(cfg) {
  const data = readJson(cfg.root + '/revocations.json');
  return data && typeof data === 'object' ? { receipts: data.receipts || [], releases: data.releases || [], kids: data.kids || [] } : { receipts: [], releases: [], kids: [] };
}

/**
 * Verify one installed release. Returns { ok:true, trusted, install, manifest, dir, attested } or { ok:false, code }.
 * `deep` re-checks the size and mtime of every delivered file against the signed attestation snapshot.
 */
function installed(cfg, entry, deep) {
  const studioId = entry.id, releaseId = entry.runtime && entry.runtime.releaseId;
  if (!releaseId || !C.RELEASE_ID.test(releaseId) || !C.STUDIO_ID.test(studioId)) return { ok: false, code: 'NO_RELEASE' };
  if (!Object.keys(cfg.keys).length) return { ok: false, code: 'NO_KEYS' };
  const dir = cfg.root + '/' + studioId + '/' + releaseId;
  const install = readJson(dir + '/install.json');
  if (!install || install.schema !== 'medcoel.studio-install.v1' || install.studioId !== studioId || install.releaseId !== releaseId ||
      !C.INSTALLATION_ID.test(install.installationId || '') || !C.SHA256.test(install.buildDigest || '')) return { ok: false, code: 'NOT_INSTALLED' };
  const manifest = readJson(dir + '/files/studio-manifest.json');
  const inventoryProblem = C.validateInventory(manifest, { studioId, releaseId });
  if (inventoryProblem) return { ok: false, code: inventoryProblem };
  const digest = C.buildDigest(manifest, sha256);
  if (!equal(digest, install.buildDigest)) return { ok: false, code: 'BUILD_DIGEST_MISMATCH' };
  const now = Date.now(), revoked = revocations(cfg);
  const revision = evidenceRevision(cfg), quarantine = quarantineDigest(cfg);
  if (!revision || !quarantine) return { ok: false, code: 'EVIDENCE_UNAVAILABLE' };
  const receipt = C.verify('receipt', readJson(dir + '/clearance-receipt.json'), { keys: cfg.keys, hmac, equal, now, revoked, expect: {
    studioId, releaseId, installationId: install.installationId, buildDigest: digest, resourceManifestSha256: manifest.resourceManifestSha256,
    evidenceRevision: revision, quarantinePolicySha256: quarantine,
  } });
  if (!receipt.ok) return { ok: false, code: 'RECEIPT_' + receipt.code };
  const att = C.verify('attestation', readJson(dir + '/attestation.json'), { keys: cfg.keys, hmac, equal, now, revoked, expect: {
    studioId, releaseId, installationId: install.installationId, buildDigest: digest,
  } });
  if (!att.ok) return { ok: false, code: 'ATTESTATION_' + att.code };
  const snapshot = {};
  att.payload.files.forEach(f => { snapshot[f.path] = f; });
  const delivered = manifest.files.map(f => f.path).concat(['studio-manifest.json']);
  for (const path of delivered) {
    const s = snapshot[path], m = manifest.files.find(f => f.path === path);
    if (!s || (m && s.bytes !== m.bytes)) return { ok: false, code: 'ATTESTATION_INCOMPLETE' };
  }
  if (Object.keys(snapshot).length !== delivered.length) return { ok: false, code: 'ATTESTATION_INCOMPLETE' };
  if (deep) for (const path of delivered) if (!sameAsSnapshot(dir, path, snapshot[path])) return { ok: false, code: 'INSTALLATION_CHANGED' };
  const capabilities = Array.isArray(manifest.capabilities) ? manifest.capabilities.filter(c => typeof c === 'string') : [];
  return {
    ok: true, dir, install, manifest, snapshot,
    trusted: {
      release: { id: releaseId, entry: 'index.html', studioId, buildDigest: digest, resourceManifestSha256: manifest.resourceManifestSha256, capabilities },
      receipt: { verified: true, strict: true, studioId, releaseId, resourceManifestSha256: manifest.resourceManifestSha256, buildDigest: digest },
      attestation: { verified: true, studioId, releaseId, buildDigest: digest },
      adapters: KNOWN_ADAPTERS.filter(a => capabilities.indexOf(a) >= 0),
    },
  };
}
function sameAsSnapshot(dir, path, snap) {
  const s = fileUnder(dir + '/files', path);
  return !!s && !!snap && s.bytes === snap.bytes && s.mtimeMs === snap.mtimeMs;
}

function principalOf(record) {
  const role = record.getString('role') || 'user';
  const active = !record.getBool('disabled') && !record.getString('deletedAt');
  return { role, campus: record.getString('campus'), active };
}

function trustedMap(cfg, cat, principal) {
  const out = {};
  cat.studios.forEach(entry => {
    if (!entry.runtime || !entry.runtime.releaseId || !core.principalAllowed(entry, principal)) return;
    const r = installed(cfg, entry, true);
    if (r.ok) out[entry.id] = r.trusted;
  });
  return out;
}

function securityHeaders(e) {
  const h = e.response.header();
  h.set('Cache-Control', 'private, no-store');
  h.set('Vary', 'Authorization, Cookie');
  h.set('X-Content-Type-Options', 'nosniff');
  h.set('Cross-Origin-Resource-Policy', 'same-origin');
  h.set('Referrer-Policy', 'same-origin');
}

/**
 * Launch: re-resolves availability with the trusted inputs above, then mints a short-lived session cookie scoped to the
 * exact studio release path. The cookie is HttpOnly (scripts in the studio cannot read it) and bound to the user,
 * studio, release, installation and mode.
 */
function launch(e, id, query, record) {
  const cfg = config();
  const cat = catalog(cfg);
  const p = principalOf(record);
  const entry = cat.studios.find(s => s.id === id);
  if (!entry || !core.principalAllowed(entry, p)) return { status: 404, body: { code: 'NOT_FOUND' } };
  const inst = entry.runtime && entry.runtime.releaseId ? installed(cfg, entry, true) : { ok: false, code: 'NO_RELEASE' };
  const result = core.launch(cat, id, p, query, inst.ok ? inst.trusted : {});
  if (result.status !== 200) {
    const body = { code: result.code };
    if (p.role === 'admin' && !inst.ok) body.installation = inst.code; // diagnostics only for admins
    return { status: result.status, body };
  }
  if (!cfg.keys[cfg.sessionKid]) return { status: 409, body: { code: 'SESSION_KEY_UNAVAILABLE' } };
  const now = Date.now();
  const session = { kid: cfg.sessionKid, sid: $security.randomStringWithAlphabet(32, 'abcdef0123456789'), userId: record.id,
    studioId: id, releaseId: entry.runtime.releaseId, installationId: inst.install.installationId, mode: result.value.context.mode,
    issuedAt: now, expiresAt: now + C.LIMITS.session };
  const token = C.encodeSession(session, cfg.keys, hmac);
  const path = '/api/medcoel/studio-assets/' + id + '/' + entry.runtime.releaseId + '/';
  const secure = cfg.dev ? '' : '; Secure';
  e.response.header().add('Set-Cookie', COOKIE + '=' + token + '; Path=' + path + '; Max-Age=' + Math.floor(C.LIMITS.session / 1000) + '; HttpOnly; SameSite=Strict' + secure);
  result.value.session = { expiresAt: session.expiresAt };
  return { status: 200, body: result.value };
}

function cookieValue(e) {
  const raw = String(e.request.header.get('Cookie') || '');
  let value = null;
  raw.split(';').forEach(part => {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === COOKIE) value = value === null ? part.slice(i + 1).trim() : '__duplicate__';
  });
  return value;
}

/**
 * Asset delivery: session cookie, live user state, availability, signed installation and the exact file snapshot
 * are all re-checked on every request. Unknown, unmanifested or changed files are never served.
 */
function asset(e, id, releaseId, rawPath) {
  securityHeaders(e);
  const deny = (status) => e.json(status, { code: status === 401 ? 'SESSION_REQUIRED' : 'NOT_FOUND' });
  const cfg = config();
  if (!C.STUDIO_ID.test(id || '') || !C.RELEASE_ID.test(releaseId || '')) return deny(404);
  const path = C.safeAssetPath(rawPath);
  if (!path) return deny(404);
  const token = cookieValue(e);
  if (!token || token === '__duplicate__') return deny(401);
  const decoded = C.decodeSession(token, { keys: cfg.keys, hmac, equal, now: Date.now(), revoked: revocations(cfg), expect: { studioId: id, releaseId } });
  if (!decoded.ok) return deny(401);
  let record;
  try { record = e.app.findRecordById('users', decoded.session.userId); } catch (_) { return deny(401); }
  const p = principalOf(record);
  if (!p.active) return deny(401);
  const cat = catalog(cfg);
  const entry = cat.studios.find(s => s.id === id);
  if (!entry || entry.runtime.releaseId !== releaseId || !core.principalAllowed(entry, p)) return deny(404);
  const inst = installed(cfg, entry, false);
  if (!inst.ok || inst.install.installationId !== decoded.session.installationId) return deny(404);
  const availability = core.resolve(entry, p, inst.trusted);
  if (!availability || !availability.canLaunch) return deny(404);
  const listed = path === 'studio-manifest.json' || inst.manifest.files.some(f => f.path === path);
  const type = C.contentTypeFor(path);
  if (!listed || !type) return deny(404);
  const snap = inst.snapshot[path];
  if (!sameAsSnapshot(inst.dir, path, snap) || snap.bytes > MAX_DELIVERY_BYTES) return deny(404);
  const h = e.response.header();
  h.set('X-Frame-Options', 'SAMEORIGIN');
  if (/^text\/html/.test(type)) {
    h.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; " +
      "connect-src 'self'; worker-src 'self' blob:; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'self'");
  }
  return e.blob(200, type, $os.readFile(inst.dir + '/files/' + path));
}

module.exports = { config, catalog, installed, trustedMap, launch, asset, principalOf, evidenceRevision, quarantineDigest, securityHeaders, KNOWN_ADAPTERS, COOKIE };

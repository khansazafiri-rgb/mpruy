'use strict';
// MEDCOEL Clinical Studios: pure, dependency-free, fail-closed availability contract.
// No network, filesystem or credentials. All trusted release inputs come from the server.
const SHA256 = /^[a-f0-9]{64}$/;
const ID = /^[a-z][a-z0-9-]{2,40}$/;
const STATES = Object.freeze(['planned', 'building', 'review', 'blocked', 'ready', 'failed']);
const object = v => !!v && typeof v === 'object' && !Array.isArray(v);
const safePart = v => typeof v === 'string' && /^[a-z0-9-]{1,64}$/.test(v);
const safeEntry = (v, id, releaseId) =>
  typeof v === 'string' && v.startsWith('studio-assets/' + id + '/' + releaseId + '/') &&
  !/[?#\\]/.test(v) && v.split('/').every((s, i) => i === 0 || (s !== '.' && s !== '..' && !!s)) &&
  !/%|\/\//.test(v) && v.endsWith('/index.html');

function principalAllowed(entry, principal) {
  if (!object(entry) || !object(principal) || !object(entry.access)) return false;
  if (!['user', 'admin'].includes(principal.role) || principal.active !== true) return false;
  if (!Array.isArray(entry.access.roles) || !entry.access.roles.includes(principal.role)) return false;
  if (entry.internal && principal.role !== 'admin') return false;
  const campuses = entry.access.campuses;
  return Array.isArray(campuses) && (campuses.length === 0 || (typeof principal.campus === 'string' && campuses.includes(principal.campus)));
}

function resolve(entry, principal, trusted = {}) {
  if (!principalAllowed(entry, principal)) return null; // Must never leak invisible studio IDs or blockers.
  const admin = principal.role === 'admin';
  const fail = (state, code) => ({ state, canLaunch: false, reasonCodes: admin ? [code] : ['NOT_READY'], capabilities: [] });
  if (!ID.test(entry.id) || !object(entry.runtime) || !object(entry.release) ||
      !object(entry.licensing) || !object(entry.review) || !Array.isArray(entry.blockers) ||
      !Array.isArray(entry.datasets) || !Array.isArray(entry.capabilities)) return fail('blocked', 'INVALID_ENTRY');
  if (entry.blockers.length || entry.licensing.status === 'blocked' ||
      entry.datasets.some(d => d.protected || d.licence === 'restricted')) return fail('blocked', 'BLOCKED');
  if (entry.release.status === 'planned') return fail('planned', 'NOT_PUBLISHED');
  if (entry.release.status === 'building') return admin ? fail('building', 'IN_DEVELOPMENT') : null;
  if (entry.release.status === 'review') return admin ? fail('review', 'UNDER_REVIEW') : null;
  if (entry.release.status !== 'publishable') return fail('blocked', 'INVALID_RELEASE_STATE');
  if (entry.licensing.status !== 'verified' || !entry.licensing.ref ||
      !['approved', 'not-required'].includes(entry.review.clinical) ||
      !['approved', 'not-required'].includes(entry.review.anatomical) ||
      entry.datasets.some(d => d.protected || d.licence !== 'verified')) return fail('blocked', 'REVIEW_PENDING');
  // These are server-only, attested inputs, not serialized catalog flags or query parameters.
  const release = trusted.release, receipt = trusted.receipt, attestation = trusted.attestation;
  if (!release || !receipt || !attestation) return fail(admin ? 'failed' : 'planned', 'NO_TRUSTED_RELEASE');
  if (!safePart(entry.runtime.releaseId) || !safeEntry(entry.runtime.entry, entry.id, entry.runtime.releaseId) ||
      release.id !== entry.runtime.releaseId || release.entry !== entry.runtime.entry ||
      release.studioId !== entry.id) return fail('blocked', 'RELEASE_MISMATCH');
  if (receipt.verified !== true || receipt.strict !== true || receipt.studioId !== entry.id ||
      receipt.releaseId !== release.id || !SHA256.test(receipt.resourceManifestSha256 || '') ||
      receipt.resourceManifestSha256 !== release.resourceManifestSha256 ||
      receipt.buildDigest !== release.buildDigest || !SHA256.test(receipt.buildDigest || '')) return fail('blocked', 'CLEARANCE_MISSING');
  if (attestation.verified !== true || attestation.studioId !== entry.id ||
      attestation.releaseId !== release.id || attestation.buildDigest !== release.buildDigest) return fail('blocked', 'INSTALLATION_NOT_ATTESTED');
  if (!Array.isArray(trusted.adapters) || !entry.capabilities.every(cap => trusted.adapters.includes(cap)) ||
      !Array.isArray(release.capabilities) || !entry.capabilities.every(cap => release.capabilities.includes(cap))) return fail('blocked', 'CAPABILITY_MISSING');
  return { state: 'ready', canLaunch: true, reasonCodes: [], capabilities: [...entry.capabilities] };
}

function list(catalog, principal, trustedById = {}) {
  if (!object(catalog) || catalog.schemaVersion !== 1 || !Array.isArray(catalog.studios)) throw Error('INVALID_CATALOG');
  return { schemaVersion: 1, items: catalog.studios.flatMap(entry => {
    const a = resolve(entry, principal, trustedById[entry.id]);
    return a ? [{ id: entry.id, title: entry.title, titleId: entry.titleId,
      region: entry.region, modality: entry.modality, availability: {
        state: a.state, canLaunch: a.canLaunch, reasonCodes: a.reasonCodes
      }, capabilities: a.canLaunch ? a.capabilities : [] }] : [];
  }) };
}

function validateLaunchQuery(query) {
  if (!object(query)) return { ok: false, code: 'INVALID_QUERY' };
  if (Object.keys(query).some(k => !['mode', 'language'].includes(k))) return { ok: false, code: 'UNKNOWN_PARAMETER' };
  if (Object.values(query).some(v => Array.isArray(v) || (v !== undefined && typeof v !== 'string'))) return { ok: false, code: 'DUPLICATE_OR_INVALID_PARAMETER' };
  const mode = query.mode === undefined ? 'explore' : query.mode;
  const language = query.language === undefined ? 'id' : query.language;
  if (!['explore', 'guided', 'challenge'].includes(mode) || !['id', 'en'].includes(language)) return { ok: false, code: 'UNSUPPORTED_PARAMETER' };
  return { ok: true, mode, language };
}

function launch(catalog, id, principal, query = {}, trusted = {}) {
  const entry = object(catalog) && Array.isArray(catalog.studios) ? catalog.studios.find(s => s.id === id) : null;
  if (!entry || !principalAllowed(entry, principal)) return { status: 404, code: 'NOT_FOUND' };
  const parsed = validateLaunchQuery(query);
  if (!parsed.ok) return { status: 400, code: parsed.code };
  if (parsed.mode !== 'explore') return { status: 409, code: 'MODE_NOT_AVAILABLE' };
  const a = resolve(entry, principal, trusted);
  if (!a || !a.canLaunch) return { status: 409, code: 'STUDIO_NOT_READY' };
  return { status: 200, value: { schemaVersion: 1, studioId: entry.id,
    releaseId: entry.runtime.releaseId,
    runtime: { type: 'iframe', entry: '/' + entry.runtime.entry },
    context: { studioId: entry.id, releaseId: entry.runtime.releaseId,
      mode: parsed.mode, caseId: null, language: parsed.language,
      a11y: { reducedMotion: false, highContrast: false, fontScale: 1 },
      capabilities: {} } } };
}

module.exports = { STATES, safeEntry, principalAllowed, resolve, list, validateLaunchQuery, launch };

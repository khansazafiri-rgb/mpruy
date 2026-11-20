// Studio API. Runtime launch is deny-by-default until a separate trusted receipt +
// immutable installation attestation are configured and reviewed. No client flags.
'use strict';
const root = typeof __hooks !== 'undefined' ? __hooks : __dirname + '/..';
const core = require(root + '/lib/studio-contract.generated.js');
const util = require(root + '/lib/util.js');
function headers(e) {
  e.response.header().set('Cache-Control', 'private, no-store');
  e.response.header().set('Vary', 'Authorization');
  e.response.header().set('X-Content-Type-Options', 'nosniff');
}
function principal(e) {
  const record = util.requireUser(e);
  const role = util.roleOf(record);
  if (role !== 'user' && role !== 'admin') throw new ForbiddenError('Akun ini tidak dapat mengakses studio.');
  return { role, campus: record.getString('campus'), active: true };
}
function queryFromRequest(e) {
  // The URL query map preserves repeated keys as arrays, unlike query.get().
  try {
    const data = JSON.parse(toString(e.request.url.query()));
    if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
    // PocketBase URL values encode a single query value as a one-element array.
    // Preserve >1 entries so the strict resolver rejects duplicate parameters.
    for (const key of Object.keys(data)) if (Array.isArray(data[key]) && data[key].length === 1) data[key] = data[key][0];
    return data;
  } catch (_) { return e.requestInfo().query || {}; }
}
function list(e) {
  headers(e);
  const p = principal(e);
  const q = queryFromRequest(e);
  if (Object.keys(q).length) return e.json(400, { code: 'UNKNOWN_PARAMETER' });
  // Never evaluate user-supplied installed release, license or availability flags.
  return e.json(200, core.list(core.catalog, p));
}
function launch(e, id) {
  headers(e);
  const p = principal(e);
  const q = queryFromRequest(e);
  const result = core.launch(core.catalog, id, p, q);
  return e.json(result.status, result.status === 200 ? result.value : { code: result.code });
}
module.exports = { list, launch, principal, queryFromRequest };

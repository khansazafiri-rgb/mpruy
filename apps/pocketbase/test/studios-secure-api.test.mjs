// End-to-end security test of Clinical Studio launch and asset delivery against a REAL PocketBase process.
// Starts its own PocketBase (disposable data dir, test-only env). Never touches production.
//   node test/studios-secure-api.test.mjs            (PB_BIN defaults to ./pocketbase)
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import { stage, issueReceipt, attest, revoke } from '../../../licensing/tools/studio-release.mjs';
import { createTestRelease } from '../../../scripts/studio-test-release.mjs';

const HERE = fileURLToPath(new URL('..', import.meta.url));
const BIN = process.env.PB_BIN || path.join(HERE, 'pocketbase');
const KEY = 'test-only-studio-key-' + 'x'.repeat(40);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'studios-secure-'));
const studioRoot = path.join(tmp, 'studios'), dataDir = path.join(tmp, 'pb');
const port = await new Promise(r => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const B = 'http://127.0.0.1:' + port;
let pass = 0;
let cleanup = () => {};
const step = async (name, fn) => { try { await fn(); } catch (err) { console.error('FAIL', name, err); cleanup(); process.exit(1); } pass++; console.log('  ok', name); };

// The test release needs a campus id; create the catalog file first with a placeholder campus, rewritten after PB starts.
process.env.MEDCOEL_STUDIO_KEYS = JSON.stringify({ t1: KEY });
process.env.MEDCOEL_STUDIO_SIGNING_KID = 't1';
const catalogFile = path.join(tmp, 'test-catalog.json');
fs.writeFileSync(catalogFile, '{"studios":[]}');
execFileSync(BIN, ['superuser', 'upsert', 'su@studios.test', 'su-password-123456', '--dir=' + dataDir], { stdio: 'ignore' });
const pb = spawn(BIN, ['serve', '--http=127.0.0.1:' + port, '--dir=' + dataDir, '--hooksDir=' + path.join(HERE, 'pb_hooks'), '--migrationsDir=' + path.join(HERE, 'pb_migrations')], {
  env: { ...process.env, MEDCOEL_DEV_MODE: '1', MEDCOEL_STUDIO_ROOT: studioRoot, MEDCOEL_STUDIO_KEYS: JSON.stringify({ t1: KEY }), MEDCOEL_STUDIO_SESSION_KID: 't1',
    MEDCOEL_STUDIO_LICENSING_ROOT: path.join(tmp, 'release', 'licensing'), MEDCOEL_STUDIO_TEST_CATALOG: catalogFile }, stdio: ['ignore', 'pipe', 'pipe'] });
let log = ''; pb.stdout.on('data', d => { log += d; }); pb.stderr.on('data', d => { log += d; });
cleanup = () => { try { pb.kill(); } catch { /* gone */ } fs.rmSync(tmp, { recursive: true, force: true }); };

async function call(method, p, { token, body, cookie, raw } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = token;
  if (cookie) headers.Cookie = cookie;
  const r = await fetch(B + p, { method, headers, body: body ? JSON.stringify(body) : undefined, redirect: 'manual' });
  const text = await r.text();
  let data = null; if (!raw) { try { data = JSON.parse(text); } catch { data = text; } }
  return { status: r.status, data, text, headers: r.headers };
}
for (let i = 0; i < 60; i++) { try { if ((await fetch(B + '/api/health')).ok) break; } catch { /* starting */ } await new Promise(r => setTimeout(r, 250)); }
const su = (await call('POST', '/api/collections/_superusers/auth-with-password', { body: { identity: 'su@studios.test', password: 'su-password-123456' } })).data.token;
assert.ok(su, 'superuser login: ' + log.slice(-500));
const campus = async name => (await call('POST', '/api/collections/campuses/records', { token: su, body: { name, active: true } })).data;
const campusA = await campus('Kampus Studio A'), campusB = await campus('Kampus Studio B');
assert.ok(campusA.id && campusB.id, JSON.stringify(campusA));
let n = 0;
async function user(role, campusId) {
  const loginId = 'st' + role + (++n) + Date.now().toString(36), password = 'rahasia-' + loginId;
  const rec = await call('POST', '/api/collections/users/records', { token: su, body: { loginId, name: role + ' ' + n, email: loginId + '@studios.test', password, passwordConfirm: password, role, verified: true, campus: campusId } });
  assert.equal(rec.status, 200, JSON.stringify(rec.data));
  const auth = await call('POST', '/api/collections/users/auth-with-password', { body: { identity: loginId, password } });
  return { id: rec.data.id, token: auth.data.token };
}

// Build, stage, clear and attest a neutral engineering release restricted to campus A.
const files = new Map([['index.html', Buffer.from('<!doctype html><meta charset="utf-8"><title>fixture</title><script type="module" src="./app.js"></script>')],
  ['app.js', Buffer.from('document.title = "neutral engineering fixture";')], ['data.bin', Buffer.from('NEUTRAL SYNTHETIC TEST BYTES')]]);
const rel = createTestRelease({ dir: path.join(tmp, 'release'), files, campuses: [campusA.id] });
fs.copyFileSync(rel.catalogFile, catalogFile);
const args = { studioId: rel.studioId, releaseId: rel.releaseId, root: studioRoot, licensingRoot: rel.licensingRoot, catalogFile: rel.catalogFile };
stage({ studioId: rel.studioId, releaseId: rel.releaseId, build: rel.dist, root: studioRoot });
assert.equal(issueReceipt(args).issued, true);
attest(args);
const installDir = path.join(studioRoot, rel.studioId, rel.releaseId);
const assetBase = '/api/medcoel/studio-assets/' + rel.studioId + '/' + rel.releaseId + '/';

const adminA = await user('admin', campusA.id), adminB = await user('admin', campusB.id), userA = await user('user', campusA.id), userB = await user('user', campusB.id);
const listFor = async u => (await call('GET', '/api/medcoel/studios', { token: u.token })).data.items;
const launch = async (u, q = '') => call('GET', '/api/medcoel/studios/' + rel.studioId + '/launch' + q, { token: u.token });
const cookieOf = r => (r.headers.get('set-cookie') || '').split(';')[0];

console.log('Clinical Studios: secure launch and delivery (real PocketBase)');
let cookie;
await step('SEC-001 unauthenticated list, launch and asset requests are refused', async () => {
  assert.equal((await call('GET', '/api/medcoel/studios')).status, 401);
  assert.equal((await call('GET', '/api/medcoel/studios/' + rel.studioId + '/launch')).status, 401);
  assert.equal((await call('GET', assetBase + 'index.html')).status, 401);
});
await step('SEC-002 a cleared, attested release launches for an eligible user with a scoped HttpOnly session cookie', async () => {
  const item = (await listFor(userA)).find(i => i.id === rel.studioId);
  assert.equal(item?.availability.canLaunch, true, JSON.stringify(item) + log.slice(-800));
  const r = await launch(userA);
  assert.equal(r.status, 200, JSON.stringify(r.data));
  assert.equal(r.data.runtime.entry, assetBase + 'index.html');
  const sc = r.headers.get('set-cookie');
  assert.match(sc, /HttpOnly/); assert.match(sc, /SameSite=Strict/); assert.match(sc, new RegExp('Path=' + assetBase.replace(/\//g, '\\/')));
  assert.equal(JSON.stringify(r.data).includes('medcoel_studio='), false, 'session token never appears in the JSON body');
  cookie = cookieOf(r);
});
await step('SEC-003 authorised delivery serves only manifested bytes with strict headers', async () => {
  const html = await call('GET', assetBase + 'index.html', { cookie, raw: true });
  assert.equal(html.status, 200);
  assert.match(html.headers.get('content-type'), /text\/html/);
  assert.match(html.headers.get('content-security-policy'), /frame-ancestors 'self'/);
  assert.equal(html.headers.get('cache-control'), 'private, no-store');
  assert.equal(html.text, files.get('index.html').toString());
  assert.equal((await call('GET', assetBase + 'app.js', { cookie, raw: true })).status, 200);
  assert.equal((await call('GET', assetBase + 'studio-manifest.json', { cookie })).data.id, rel.studioId);
});
await step('SEC-004 direct URLs without a valid session, tampered or foreign tokens are refused', async () => {
  assert.equal((await call('GET', assetBase + 'data.bin')).status, 401);
  assert.equal((await call('GET', assetBase + 'data.bin', { cookie: cookie.replace(/.$/, c => (c === '0' ? '1' : '0')) })).status, 401);
  assert.equal((await call('GET', assetBase + 'data.bin', { cookie: cookie + '; ' + cookie })).status, 401, 'duplicate cookies are refused');
  assert.equal((await call('GET', '/api/medcoel/studio-assets/brain-mri/' + rel.releaseId + '/index.html', { cookie })).status, 401, 'token bound to its studio');
  assert.equal((await call('GET', '/api/medcoel/studio-assets/' + rel.studioId + '/other-release/index.html', { cookie })).status, 401, 'token bound to its release');
});
await step('SEC-005 path traversal, unmanifested, server-only and non-deliverable files are never served', async () => {
  fs.mkdirSync(path.join(installDir, 'server'), { recursive: true });
  fs.writeFileSync(path.join(installDir, 'server', 'answer-key.json'), '{"secret":true}');
  for (const p of ['../install.json', '..%2Finstall.json', '%2e%2e/clearance-receipt.json', 'files/../install.json', '../server/answer-key.json', '.hidden', 'missing.js', 'assets%2F..%2F..%2Finstall.json', 'app.js%00.html']) {
    const r = await call('GET', assetBase + p, { cookie, raw: true });
    assert.ok([400, 401, 404, 301, 307, 308].includes(r.status), p + ' -> ' + r.status);
    assert.equal(r.text.includes('secret'), false); assert.equal(r.text.includes('installationId'), false);
  }
});
await step('SEC-006 campus spoofing and admin bypass: other campuses (users and admins) cannot see or launch; extra parameters are refused', async () => {
  assert.equal((await listFor(userB)).some(i => i.id === rel.studioId), false);
  assert.equal((await launch(userB)).status, 404);
  assert.equal((await launch(adminB)).status, 404, 'an admin of another campus has no bypass');
  assert.equal((await launch(userB, '?campus=' + campusA.id)).status, 404);
  assert.equal((await launch(userA, '?campus=' + campusB.id)).status, 400);
  assert.equal((await launch(userA, '?mode=guided')).status, 409, 'Guided is closed unless the catalog marks it available');
  assert.equal((await launch(adminA)).status, 200);
});
await step('SEC-007 catalog spoofing: a test catalog cannot change canonical clinical studios', async () => {
  const spoof = JSON.parse(fs.readFileSync(catalogFile, 'utf8'));
  const brain = spoof.studios.find(s => s.id === 'brain-mri');
  Object.assign(brain, { release: { status: 'publishable' }, licensing: { status: 'verified', ref: 'x' }, review: { clinical: 'approved', anatomical: 'approved', approvedBy: 'x', approvedOn: '2026-11-20' } });
  spoof.studios.push({ ...structuredClone(brain), id: 'brain-mri-copy' });
  fs.writeFileSync(catalogFile, JSON.stringify(spoof));
  const items = await listFor(adminA);
  assert.equal(items.find(i => i.id === 'brain-mri').availability.canLaunch, false);
  assert.equal(items.some(i => i.id === 'brain-mri-copy'), false);
  assert.equal((await call('GET', '/api/medcoel/studios/brain-mri/launch', { token: adminA.token })).status, 409);
  fs.copyFileSync(rel.catalogFile, catalogFile);
});
await step('SEC-008 no private metadata in the catalog response', async () => {
  const text = JSON.stringify(await listFor(userA));
  for (const leak of ['installationId', 'receiptId', 'buildDigest', studioRoot, 'clearance', 'answer', KEY]) assert.equal(text.includes(leak), false, leak);
});
await step('SEC-009 a changed installed file closes delivery and launch (attestation snapshot)', async () => {
  const f = path.join(installDir, 'files', 'app.js');
  fs.writeFileSync(f, 'alert("tampered")');
  assert.equal((await call('GET', assetBase + 'app.js', { cookie, raw: true })).status, 404);
  const r = await launch(adminA);
  assert.equal(r.status, 409); assert.equal(r.data.installation, 'INSTALLATION_CHANGED');
  fs.writeFileSync(f, files.get('app.js'));
  attest(args); // operator re-attests only after the bytes match the manifest again
  assert.equal((await launch(userA)).status, 200);
});
await step('SEC-010 invalid HMAC, expired receipt, release revocation and evidence changes each close the studio', async () => {
  const receiptFile = path.join(installDir, 'clearance-receipt.json');
  const original = fs.readFileSync(receiptFile);
  const doc = JSON.parse(original); doc.sig = doc.sig.replace(/^./, c => (c === 'a' ? 'b' : 'a'));
  fs.writeFileSync(receiptFile, JSON.stringify(doc));
  assert.equal((await launch(adminA)).data.installation, 'RECEIPT_BAD_SIGNATURE');
  issueReceipt({ ...args, now: Date.now() - 31 * 86400000, ttlDays: 30 });
  assert.equal((await launch(adminA)).data.installation, 'RECEIPT_EXPIRED');
  fs.writeFileSync(receiptFile, original);
  assert.equal((await launch(userA)).status, 200);
  const ev = path.join(rel.licensingRoot, 'commercial-rights-evidence.json'), evText = fs.readFileSync(ev);
  fs.writeFileSync(ev, evText + '\n');
  assert.equal((await launch(adminA)).data.installation, 'RECEIPT_BINDING_MISMATCH');
  fs.writeFileSync(ev, evText);
  revoke({ root: studioRoot, studioId: rel.studioId, releaseId: rel.releaseId });
  assert.equal((await launch(adminA)).data.installation, 'RECEIPT_RELEASE_REVOKED');
  assert.equal((await call('GET', assetBase + 'index.html', { cookie })).status, 404, 'revocation also ends live sessions');
  fs.rmSync(path.join(studioRoot, 'revocations.json'));
});
await step('SEC-011 a disabled account loses asset access immediately', async () => {
  const r = await launch(userA); const c = cookieOf(r);
  assert.equal((await call('GET', assetBase + 'index.html', { cookie: c, raw: true })).status, 200);
  await call('PATCH', '/api/collections/users/records/' + userA.id, { token: su, body: { disabled: true } });
  assert.equal((await call('GET', assetBase + 'index.html', { cookie: c, raw: true })).status, 401);
});
await step('SEC-012 canonical clinical studios stay closed (no release, receipt or attestation exists for them)', async () => {
  const items = await listFor(adminA);
  const clinical = items.filter(i => !i.id.startsWith('test-'));
  assert.ok(clinical.length >= 24);
  assert.equal(clinical.some(i => i.availability.canLaunch), false);
});
console.log('studios secure api: ' + pass + ' steps passed');
cleanup();
process.exit(0);

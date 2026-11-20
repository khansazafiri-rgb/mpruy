// Server-side Challenge grading for Clinical Studios against a REAL PocketBase process (disposable, test-only env).
// Proves: answer keys are never delivered, answer-bearing files are withheld in Challenge sessions, items carry no answers,
// grading happens per submission, attempts are signed and bound to the session.
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import { stage, issueReceipt, attest } from '../../../licensing/tools/studio-release.mjs';
import { createTestRelease } from '../../../scripts/studio-test-release.mjs';

const HERE = fileURLToPath(new URL('..', import.meta.url));
const BIN = process.env.PB_BIN || path.join(HERE, 'pocketbase');
const KEY = 'test-only-challenge-key-' + 'y'.repeat(40);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'studios-challenge-'));
const studioRoot = path.join(tmp, 'studios'), dataDir = path.join(tmp, 'pb');
const port = await new Promise(r => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const B = 'http://127.0.0.1:' + port;
process.env.MEDCOEL_STUDIO_KEYS = JSON.stringify({ c1: KEY }); process.env.MEDCOEL_STUDIO_SIGNING_KID = 'c1';

const key = { schema: 'medcoel.challenge.v1', count: 2, items: [
  { id: 'q1', prompt: { kind: 'crosshair-structure', mm: [-10, 0, 0], text: 'Neutral question 1' }, options: ['Alpha', 'Beta'], answer: { index: 1 }, canonical: 'Beta', explanation: 'Engineering explanation 1' },
  { id: 'q2', prompt: { kind: 'crosshair-structure', mm: [10, 0, 0], text: 'Neutral question 2' }, options: ['Alpha', 'Beta'], answer: { index: 0 }, canonical: 'Alpha', explanation: 'Engineering explanation 2' },
  { id: 'f1', prompt: { kind: 'find', text: 'Click Gamma' }, options: [], answer: { structureId: 's003' }, canonical: 'Gamma', explanation: 'Engineering find' },
  { id: 't1', prompt: { kind: 'typed', highlight: 's001', text: 'Type the highlighted block' }, options: [], answer: { conceptId: 'FIX-1', side: 'left' }, canonical: 'Fixture block left', explanation: 'Engineering typed' } ] };
key.count = 4;
const terminology = { schema: 'medcoel.terminology.v1', status: 'approved', scope: 'engineering-fixture-only', concepts: { 'FIX-1': { canonical: { id: 'balok fixture kiri', en: 'fixture block left', la: 'truncus probationis sinister' }, forms: [
  { language: 'en', value: 'fixture block left', side: 'left' }, { language: 'id', value: 'balok fixture kiri', side: 'left' }, { language: 'la', value: 'truncus probationis sinister', side: 'left' }] } } };
const files = new Map([['index.html', Buffer.from('<!doctype html><title>challenge fixture</title>')], ['data/labels.json', Buffer.from('{"names":["Alpha","Beta"]}')],
  ['data/image.bin', Buffer.from('NEUTRAL IMAGE BYTES')], ['server/challenge.json', Buffer.from(JSON.stringify(key))], ['server/terminology.json', Buffer.from(JSON.stringify(terminology))]]);
const rel = createTestRelease({ dir: path.join(tmp, 'release'), studioId: 'test-challenge', files, capabilities: ['fixture-echo'],
  challengeRestricted: ['data/labels.json'], learningModes: { guided: 'available', challenge: 'available', typedQuiz: 'none' } });
const catalogFile = path.join(tmp, 'catalog.json'); fs.copyFileSync(rel.catalogFile, catalogFile);
const args = { studioId: rel.studioId, releaseId: rel.releaseId, root: studioRoot, licensingRoot: rel.licensingRoot, catalogFile: rel.catalogFile };
stage({ studioId: rel.studioId, releaseId: rel.releaseId, build: rel.dist, root: studioRoot });
assert.equal(issueReceipt(args).issued, true); attest(args);

execFileSync(BIN, ['superuser', 'upsert', 'su@challenge.test', 'su-password-123456', '--dir=' + dataDir], { stdio: 'ignore' });
const pb = spawn(BIN, ['serve', '--http=127.0.0.1:' + port, '--dir=' + dataDir, '--hooksDir=' + path.join(HERE, 'pb_hooks'), '--migrationsDir=' + path.join(HERE, 'pb_migrations')], {
  env: { ...process.env, MEDCOEL_DEV_MODE: '1', MEDCOEL_STUDIO_ROOT: studioRoot, MEDCOEL_STUDIO_KEYS: JSON.stringify({ c1: KEY }), MEDCOEL_STUDIO_SESSION_KID: 'c1',
    MEDCOEL_STUDIO_LICENSING_ROOT: rel.licensingRoot, MEDCOEL_STUDIO_TEST_CATALOG: catalogFile }, stdio: 'ignore' });
const done = code => { try { pb.kill(); } catch { /* gone */ } fs.rmSync(tmp, { recursive: true, force: true }); process.exit(code); };
let pass = 0;
const step = async (name, fn) => { try { await fn(); } catch (e) { console.error('FAIL', name, e); done(1); } pass++; console.log('  ok', name); };
async function call(method, p, { token, body, cookie } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = token; if (cookie) headers.Cookie = cookie;
  const r = await fetch(B + p, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text(); let data; try { data = JSON.parse(text); } catch { data = text; }
  return { status: r.status, data, text, headers: r.headers };
}
for (let i = 0; i < 60; i++) { try { if ((await fetch(B + '/api/health')).ok) break; } catch { /* starting */ } await new Promise(r => setTimeout(r, 250)); }
const su = (await call('POST', '/api/collections/_superusers/auth-with-password', { body: { identity: 'su@challenge.test', password: 'su-password-123456' } })).data.token;
const loginId = 'chal' + Date.now().toString(36), password = 'rahasia-' + loginId;
await call('POST', '/api/collections/users/records', { token: su, body: { loginId, name: 'Challenge user', email: loginId + '@challenge.test', password, passwordConfirm: password, role: 'user', verified: true } });
const token = (await call('POST', '/api/collections/users/auth-with-password', { body: { identity: loginId, password } })).data.token;
const base = '/api/medcoel/studio-assets/' + rel.studioId + '/' + rel.releaseId + '/';
const launch = async mode => { const r = await call('GET', '/api/medcoel/studios/' + rel.studioId + '/launch?mode=' + mode, { token }); return { ...r, cookie: (r.headers.get('set-cookie') || '').split(';')[0] }; };

console.log('Clinical Studios: server-side Challenge (real PocketBase)');
let ch, attempt, items;
await step('CHAL-001 the answer key file is never delivered, in any mode', async () => {
  for (const mode of ['explore', 'guided', 'challenge']) {
    const l = await launch(mode); assert.equal(l.status, 200, mode + ' ' + JSON.stringify(l.data));
    const r = await call('GET', base + 'server/challenge.json', { cookie: l.cookie });
    assert.equal(r.status, 404); assert.equal(r.text.includes('canonical'), false);
    if (mode === 'challenge') ch = l;
  }
});
await step('CHAL-002 answer-bearing files are withheld during a Challenge session but served in Explore', async () => {
  assert.equal((await call('GET', base + 'data/labels.json', { cookie: ch.cookie })).status, 404);
  assert.equal((await call('GET', base + 'data/image.bin', { cookie: ch.cookie })).status, 200);
  const ex = await launch('explore');
  assert.equal((await call('GET', base + 'data/labels.json', { cookie: ex.cookie })).status, 200);
  assert.equal((await call('POST', base + '_challenge/start', { cookie: ex.cookie })).status, 409, 'grading only in Challenge sessions');
});
await step('CHAL-003 start returns items without answers, canonical names or explanations', async () => {
  const r = await call('POST', base + '_challenge/start', { cookie: ch.cookie, body: {} });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  ({ attempt, items } = r.data);
  assert.equal(items.length, 4);
  const text = JSON.stringify(r.data);
  for (const leak of ['answer', 'canonical', 'Engineering explanation']) assert.equal(text.includes(leak), false, leak);
});
await step('CHAL-004 grading happens on the server per submission and reveals feedback only after answering', async () => {
  const q1 = items.find(i => i.id === 'q1');
  const wrong = await call('POST', base + '_challenge/answer', { cookie: ch.cookie, body: { attempt, itemId: 'q1', response: { index: 0 } } });
  assert.deepEqual([wrong.status, wrong.data.correct, wrong.data.canonical], [200, false, 'Beta']);
  const right = await call('POST', base + '_challenge/answer', { cookie: ch.cookie, body: { attempt, itemId: q1.id, response: { index: 1 } } });
  assert.equal(right.data.correct, true); assert.match(right.data.explanation, /Engineering explanation 1/);
});
await step('CHAL-005 forged attempts, foreign items and missing sessions are refused', async () => {
  const forged = attempt.replace(/.$/, c => (c === '0' ? '1' : '0'));
  assert.equal((await call('POST', base + '_challenge/answer', { cookie: ch.cookie, body: { attempt: forged, itemId: 'q1', response: { index: 1 } } })).status, 400);
  assert.equal((await call('POST', base + '_challenge/answer', { cookie: ch.cookie, body: { attempt, itemId: 'q9', response: { index: 1 } } })).status, 400);
  assert.equal((await call('POST', base + '_challenge/answer', { body: { attempt, itemId: 'q1', response: { index: 1 } } })).status, 401);
  const other = await launch('challenge');
  assert.equal((await call('POST', base + '_challenge/answer', { cookie: other.cookie, body: { attempt, itemId: 'q1', response: { index: 1 } } })).status, 400, 'attempt bound to its own session');
});
await step('CHAL-006 Find is graded by the clicked structure id; Type uses the approved terminology with typo and laterality rules', async () => {
  const find = async id => (await call('POST', base + '_challenge/answer', { cookie: ch.cookie, body: { attempt, itemId: 'f1', response: { structureId: id } } })).data.correct;
  assert.equal(await find('s001'), false); assert.equal(await find('s003'), true);
  const typed = async text => (await call('POST', base + '_challenge/answer', { cookie: ch.cookie, body: { attempt, itemId: 't1', response: { text } } })).data;
  assert.equal((await typed('balok fixture kiri')).verdict, 'correct');
  assert.equal((await typed('Truncus Probationis Sinister')).verdict, 'correct');
  assert.equal((await typed('fixture blok left')).verdict, 'accepted-typo');
  const lr = await typed('fixture block right'); assert.deepEqual([lr.correct, lr.reason], [false, 'laterality']);
  assert.equal((await typed('truncus probationis dexter')).correct, false);
  assert.equal((await typed('kiri')).correct, false);
});
await step('CHAL-007 Type items are not issued when the terminology pack is not approved', async () => {
  const termFile = path.join(studioRoot, rel.studioId, rel.releaseId, 'files', 'server', 'terminology.json');
  // Same byte length and mtime would be needed to pass the snapshot; any edit (here: status) closes typed items instead.
  fs.writeFileSync(termFile, fs.readFileSync(termFile, 'utf8').replace('"approved"', '"pending!"'));
  const r = await call('POST', base + '_challenge/start', { cookie: ch.cookie, body: {} });
  assert.equal(r.status, 200); assert.equal(r.data.items.some(i => i.id === 't1'), false);
  assert.equal((await call('POST', base + '_challenge/answer', { cookie: ch.cookie, body: { attempt: r.data.attempt, itemId: 't1', response: { text: 'balok fixture kiri' } } })).status, 400);
});
console.log('studios challenge api: ' + pass + ' steps passed');
done(0);

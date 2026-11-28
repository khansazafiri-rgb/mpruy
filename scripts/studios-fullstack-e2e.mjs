// Clinical Studios full-stack end-to-end (LOCAL QA ONLY, synthetic engineering fixture, "test-" studio id):
//   real PocketBase (disposable dir, dev-mode test catalog) + production route layout (web dist, /api proxy)
//   + the independently built studio installed through the real release pipeline (stage -> receipt -> attestation).
// Flow: login -> Clinical Studios hub -> studio page -> iframe handshake -> Explore -> Guided (real orbit drags, progress
// reported) -> Challenge (items answered through the UI, graded by the server) -> progress panel -> re-entry ->
// revocation (launch and asset access refused) -> no page errors.
// Usage: npm run build --prefix apps/web && node apps/studios/scripts/build-all.mjs --only brain-anatomy
//        node scripts/studios-fullstack-e2e.mjs [--shots <dir>]
// Never touches production: binds 127.0.0.1, temp directories, synthetic keys, no canonical clinical studio is opened.
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';
import { stage, issueReceipt, attest, revoke } from '../licensing/tools/studio-release.mjs';
import { createTestRelease } from './studio-test-release.mjs';

const require = createRequire(import.meta.url);
const { chromium } = (() => { for (const id of [process.env.PLAYWRIGHT_MODULE, 'playwright', '/opt/node-tools/node_modules/playwright'].filter(Boolean)) { try { return require(id); } catch { /* next */ } } throw Error('Playwright not found'); })();
const REPO = fileURLToPath(new URL('../', import.meta.url));
const STUDIO = 'brain-anatomy', TEST_ID = 'test-' + STUDIO;
const shots = process.argv.includes('--shots') ? process.argv[process.argv.indexOf('--shots') + 1] : null;
const KEY = 'fullstack-e2e-only-key-' + 'z'.repeat(40);
const dist = path.join(REPO, 'apps/studios', STUDIO, 'dist');
assert.equal(JSON.parse(fs.readFileSync(path.join(dist, 'data/dataset.json'), 'utf8')).status, 'TECHNICAL_FIXTURE', 'only the synthetic fixture build is used');
assert.ok(fs.existsSync(path.join(REPO, 'apps/web/dist/index.html')), 'build apps/web first');

const freePort = () => new Promise(r => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'studios-fullstack-'));
const studioRoot = path.join(tmp, 'studios'), dataDir = path.join(tmp, 'pb');
const files = new Map();
(function walk(dir, pre = '') { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const rel = pre + e.name; if (e.isDirectory()) walk(path.join(dir, e.name), rel + '/'); else if (!['studio-manifest.json', 'resource-manifest.json'].includes(rel)) files.set(rel, fs.readFileSync(path.join(dir, e.name))); } })(dist);
const cfg = JSON.parse(fs.readFileSync(path.join(REPO, 'apps/studios', STUDIO, 'studio.config.json'), 'utf8'));
process.env.MEDCOEL_STUDIO_KEYS = JSON.stringify({ e2e: KEY }); process.env.MEDCOEL_STUDIO_SIGNING_KID = 'e2e';
const rel = createTestRelease({ dir: path.join(tmp, 'release'), studioId: TEST_ID, releaseId: 'fullstack-r1', files, capabilities: ['fixture-echo'],
  challengeRestricted: cfg.challengeRestricted || [], learningModes: { guided: 'available', challenge: 'available', typedQuiz: 'available' } });
const args = { studioId: rel.studioId, releaseId: rel.releaseId, root: studioRoot, licensingRoot: rel.licensingRoot, catalogFile: rel.catalogFile };
stage({ studioId: rel.studioId, releaseId: rel.releaseId, build: rel.dist, root: studioRoot });
const receipt = issueReceipt(args); assert.equal(receipt.issued, true, JSON.stringify(receipt)); attest(args);

const PB_BIN = process.env.PB_BIN || path.join(REPO, 'apps/pocketbase/pocketbase');
const pbPort = await freePort(), webPort = await freePort(), PB = 'http://127.0.0.1:' + pbPort, WEB = 'http://127.0.0.1:' + webPort;
execFileSync(PB_BIN, ['superuser', 'upsert', 'su@fullstack.test', 'su-password-123456', '--dir=' + dataDir], { stdio: 'ignore' });
const procs = [];
procs.push(spawn(PB_BIN, ['serve', '--http=127.0.0.1:' + pbPort, '--dir=' + dataDir, '--hooksDir=' + path.join(REPO, 'apps/pocketbase/pb_hooks'), '--migrationsDir=' + path.join(REPO, 'apps/pocketbase/pb_migrations')], {
  env: { ...process.env, MEDCOEL_DEV_MODE: '1', MEDCOEL_STUDIO_ROOT: studioRoot, MEDCOEL_STUDIO_KEYS: JSON.stringify({ e2e: KEY }), MEDCOEL_STUDIO_SESSION_KID: 'e2e',
    MEDCOEL_STUDIO_LICENSING_ROOT: rel.licensingRoot, MEDCOEL_STUDIO_TEST_CATALOG: rel.catalogFile }, stdio: 'ignore' }));
procs.push(spawn(process.execPath, [path.join(REPO, 'scripts/local-prod-layout-server.mjs')], { env: { ...process.env, PB_URL: PB, PORT: String(webPort), LAB4D_ABSENT: '1' }, stdio: 'ignore' }));
let browser;
const cleanup = code => { browser?.close().catch(() => {}); for (const p of procs) { try { p.kill(); } catch { /* gone */ } } fs.rmSync(tmp, { recursive: true, force: true }); process.exit(code); };
for (let i = 0; i < 80; i++) { try { if ((await fetch(PB + '/api/health')).ok && (await fetch(WEB + '/')).ok) break; } catch { /* starting */ } await new Promise(r => setTimeout(r, 250)); }

async function call(method, p, { token, body } = {}) {
  const r = await fetch(PB + p, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text(); let data; try { data = JSON.parse(t); } catch { data = t; } return { status: r.status, data };
}
const su = (await call('POST', '/api/collections/_superusers/auth-with-password', { body: { identity: 'su@fullstack.test', password: 'su-password-123456' } })).data.token;
const rate = (await call('GET', '/api/settings', { token: su })).data.rateLimits;
await call('PATCH', '/api/settings', { token: su, body: { rateLimits: { ...rate, enabled: false } } }); // disposable test PB only
const loginId = 'fs' + Date.now().toString(36), password = 'rahasia-' + loginId;
const created = await call('POST', '/api/collections/users/records', { token: su, body: { loginId, name: 'Siswa Fullstack', email: loginId + '@fullstack.test', password, passwordConfirm: password, role: 'user', verified: true, tutorials: { fk: 'done', dokter: 'done' } } });
assert.equal(created.status, 200, JSON.stringify(created.data));

let pass = 0;
const step = async (name, fn) => { try { await fn(); } catch (e) { console.error('FAIL', name, e); if (shots) await page.screenshot({ path: shots + '/fullstack-fail.png' }).catch(() => {}); cleanup(1); } pass++; console.log('  ok', name); };
browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 1360, height: 960 }, deviceScaleFactor: shots ? 2 : 1, locale: 'id-ID' });
const page = await ctx.newPage();
const errors = []; page.on('pageerror', e => errors.push(e.message));
const studioFrame = () => page.frames().find(f => f.url().includes('/api/medcoel/studio-assets/' + TEST_ID + '/'));
const waitFrameReady = async (expectedMode = 'explore') => {
  // URL navigation can precede React's commit. Bind readiness to the rendered
  // mode before acquiring a Frame, so the previous mode's frame is never reused.
  await page.waitForFunction(mode => document.querySelector('[data-testid="studio-mode-' + mode + '"]')?.getAttribute('aria-selected') === 'true', expectedMode, { timeout: 120000 });
  await page.getByText('Studio siap digunakan.').waitFor({ timeout: 120000 });
  const f = studioFrame(); assert.ok(f, 'studio iframe');
  await f.waitForFunction(() => /struktur dimuat/.test(document.querySelector('[data-testid=studio-status]')?.textContent || ''), null, { timeout: 120000 });
  if (expectedMode === 'guided') await f.locator('[data-testid=guide]').waitFor();
  if (expectedMode === 'challenge') await f.locator('[data-testid=challenge]').waitFor();
  return f;
};
const shot = async name => { if (shots) await page.screenshot({ path: path.join(shots, name + '.png') }); };

console.log('Clinical Studios full-stack e2e (PocketBase + web host + studio iframe)');
await step('FS-001 login through the web app and see the test studio in the Clinical Studios hub', async () => {
  await page.goto(WEB + '/masuk'); await page.fill('#identity', loginId); await page.fill('#password', password); await page.click('button[type=submit]');
  await page.waitForURL(u => !u.pathname.startsWith('/masuk'), { timeout: 60000 });
  await page.goto(WEB + '/lab/studios');
  await page.getByText('Fixture uji (rekayasa)').first().waitFor({ timeout: 60000 });
});
let frame;
await step('FS-002 Explore: server launch, scoped cookie, manifest check, iframe handshake, model loads', async () => {
  await page.goto(WEB + '/lab/studio/' + TEST_ID);
  frame = await waitFrameReady();
  assert.equal(await page.getByTestId('studio-mode-explore').getAttribute('aria-selected'), 'true');
  assert.ok(await frame.locator('[data-testid=hierarchy] button').count() > 0, 'hierarchy visible in Explore');
  const cookies = await ctx.cookies(); // path-scoped cookie: not visible for the site root
  assert.ok(cookies.some(c => c.httpOnly && c.sameSite === 'Strict' && c.path.startsWith('/api/medcoel/studio-assets/' + TEST_ID + '/')), JSON.stringify(cookies.map(c => [c.name, c.path])));
  await shot('fullstack-explore');
});
await step('FS-003 Guided: real orbit drags complete a step; progress is reported (self-reported) and shown on the host page', async () => {
  await page.getByTestId('studio-mode-guided').click();
  await page.waitForURL(u => u.search === '?mode=guided');
  frame = await waitFrameReady('guided');
  const canvas = frame.locator('canvas'), box = await canvas.boundingBox();
  for (let k = 0; k < 4; k++) { await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 + 220, box.y + box.height / 2, { steps: 8 }); await page.mouse.up(); }
  await frame.waitForFunction(() => /Terdeteksi/.test(document.querySelector('[data-testid=guide]')?.innerText || ''), null, { timeout: 30000 });
  let mine;
  for (let i = 0; i < 20 && !(mine?.attempts || []).some(a => a.mode === 'guided'); i++) { await page.waitForTimeout(250); mine = await page.evaluate(id => { for (const k of Object.keys(localStorage)) { try { const v = JSON.parse(localStorage.getItem(k)); if (v?.token) return fetch('/api/medcoel/studios/' + id + '/progress', { headers: { Authorization: v.token } }).then(r => r.json()); } catch { /* next */ } } return null; }, TEST_ID); }
  const g = mine.attempts.find(a => a.mode === 'guided');
  assert.deepEqual([g.selfReported, g.graded >= 1], [true, true], JSON.stringify(g));
  await shot('fullstack-guided');
});
let finalText = '';
await step('FS-004 Challenge: items without answers, answered through the UI, graded by the server, score persisted', async () => {
  await page.getByTestId('studio-mode-challenge').click();
  await page.waitForURL(u => u.search === '?mode=challenge');
  frame = await waitFrameReady('challenge');
  const box = frame.locator('[data-testid=challenge]');
  await box.getByText(/Soal 1 dari/).waitFor({ timeout: 30000 });
  assert.equal(await frame.locator('[data-testid=hierarchy] button').count(), 0, 'structure names withheld in Challenge');
  const canvas = frame.locator('canvas'), cb = await canvas.boundingBox();
  for (let guard = 0; guard < 80; guard++) {
    const text = await box.innerText();
    if (/Challenge selesai/.test(text)) { finalText = text; break; }
    const opt = box.locator('.options button:not([disabled])');
    const next = box.getByRole('button', { name: 'Soal berikutnya' });
    if (await next.count()) { await next.click(); continue; }
    if (await opt.count()) { await opt.first().click(); await box.getByRole('button', { name: 'Soal berikutnya' }).waitFor({ timeout: 15000 }); continue; }
    const typed = box.getByTestId('typed-input');
    if (await typed.count()) {
      if (await typed.evaluate(i => i.readOnly)) { await typed.press('Enter'); await page.waitForTimeout(200); continue; }
      await typed.fill('balok fixture'); await typed.press('Enter'); await box.locator('[role=status]').waitFor({ timeout: 15000 }); continue;
    }
    if (/Klik struktur itu/.test(text)) { // Find: click across the model until the server grades a pick
      const grid = []; for (const fy of [0.25, 0.62, 0.45, 0.8, 0.12]) for (const fx of [0.31, 0.69, 0.5, 0.2, 0.8]) grid.push([fx, fy]);
      for (const [fx, fy] of grid) {
        await page.mouse.click(cb.x + cb.width * fx, cb.y + cb.height * fy); await page.waitForTimeout(300);
        if (await box.getByRole('button', { name: 'Soal berikutnya' }).count()) break;
      }
      continue;
    }
    await page.waitForTimeout(300);
  }
  assert.match(finalText, /Skor: \d+ \/ \d+ \(dinilai server, tersimpan di progres Anda\)/, finalText);
  await page.getByTestId('studio-progress').getByText(/percobaan Challenge/).waitFor({ timeout: 15000 });
  await shot('fullstack-challenge-done');
});
await step('FS-005 re-entry: reload shows the persisted progress; a new launch starts a new attempt', async () => {
  await page.reload();
  await page.getByTestId('studio-progress').getByText(/Skor Challenge terbaik: \d+ \/ \d+/).waitFor({ timeout: 30000 });
  await page.getByTestId('studio-progress').getByText(/1 selesai/).waitFor();
  frame = await waitFrameReady('challenge');
  await frame.locator('[data-testid=challenge]').getByText(/Soal 1 dari/).waitFor({ timeout: 30000 });
});
await step('FS-006 revocation: after the release is revoked, assets and new launches are refused and the host says so', async () => {
  revoke({ root: studioRoot, studioId: rel.studioId, releaseId: rel.releaseId });
  const asset = await page.evaluate(id => fetch('/api/medcoel/studio-assets/' + id + '/fullstack-r1/index.html', { credentials: 'same-origin' }).then(r => r.status), TEST_ID);
  assert.ok([401, 404].includes(asset), 'asset refused after revocation: ' + asset);
  await page.goto(WEB + '/lab/studio/' + TEST_ID);
  await page.getByText(/Studio belum dapat digunakan/).waitFor({ timeout: 30000 });
  assert.equal(studioFrame(), undefined, 'no studio iframe after revocation');
  await shot('fullstack-revoked');
});
await step('FS-007 no page errors in host or studio during the whole flow', async () => { assert.deepEqual(errors, []); });
console.log('studios full-stack e2e: ' + pass + ' steps passed');
cleanup(0);

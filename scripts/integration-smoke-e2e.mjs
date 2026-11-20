// Regression smoke for the PR #220 -> 4D Lab branch integration (local QA only).
// Checks that the 4D-branch product surfaces still render next to the new Exam Center / Planner / Lab tracks:
// Atlas landing (split 3D/4D entry), Atlas library/quiz/3D viewer, question bank, Kampusmu (drilling), doctor
// simulation, progress pages, admin dashboard and student-activity report (which must count the new pages).
// Setup: as scripts/lab-tracks-e2e.mjs (WEB_URL = scripts/local-prod-layout-server.mjs). --shots saves evidence.
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = (() => { for (const id of [process.env.PLAYWRIGHT_MODULE, 'playwright', '/opt/node-tools/node_modules/playwright'].filter(Boolean)) { try { return require(id); } catch { /* next */ } } throw Error('Playwright not found'); })();
const PB = process.env.PB_URL || 'http://127.0.0.1:8092', WEB = process.env.WEB_URL || 'http://127.0.0.1:4180';
for (const u of [PB, WEB]) if (!['127.0.0.1', 'localhost'].includes(new URL(u).hostname)) throw new Error('local only');
const SHOTS = process.argv.includes('--shots'), OUT = new URL('../docs/evidence/integration/', import.meta.url).pathname;
async function call(method, path, body, token, status = 200) {
  const r = await fetch(PB + path, { method, headers: { ...(token ? { Authorization: token } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text(); assert.equal(r.status, status, `${method} ${path}: ${t.slice(0, 300)}`); return t ? JSON.parse(t) : null;
}
const su = (await call('POST', '/api/collections/_superusers/auth-with-password', { identity: process.env.PB_SU_EMAIL || 'study@medcoel.test', password: process.env.PB_SU_PASSWORD || 'study-test-password-123' })).token;
const run = Date.now().toString(36), password = 'demo-fixture-password';
const studentId = `smk${run}`, adminId = `smkadm${run}`;
for (const [loginId, role, name] of [[studentId, 'user', 'Siswa Smoke'], [adminId, 'admin', 'Admin Smoke']]) {
  await call('POST', '/api/collections/users/records', { loginId, name, email: `${loginId}@example.test`, password, passwordConfirm: password, role, verified: true, tutorials: { fk: 'done', dokter: 'done' } }, su);
}
const subject = (await call('GET', '/api/collections/subjects/records?perPage=1&sort=name&filter=' + encodeURIComponent('hidden=false'), undefined, su)).items[0];

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];
if (SHOTS) await mkdir(OUT, { recursive: true });
async function session(loginId) {
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 }, deviceScaleFactor: SHOTS ? 2 : 1, locale: 'id-ID', timezoneId: 'Asia/Jakarta' });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.push(`${loginId} ${p.url()}: ${e.message}`));
  await p.goto(WEB + '/masuk'); await p.fill('#identity', loginId); await p.fill('#password', password); await p.click('button[type=submit]');
  await p.waitForURL((u) => !u.pathname.startsWith('/masuk'));
  return p;
}
const shot = async (p, name) => { if (!SHOTS) return; await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(300); await p.screenshot({ path: OUT + name + '.jpg', type: 'jpeg', quality: 70, fullPage: true, timeout: 120000 }); };
const ok = (m) => console.log('  ok', m);
async function visit(p, path, check, name) {
  await p.goto(WEB + path);
  await check(p);
  assert.equal(await p.getByText(/Terjadi kesalahan|Something went wrong/i).count(), 0, `${path}: no error state`);
  if (name) await shot(p, name);
}

const s = await session(studentId);
await visit(s, '/beranda', (p) => p.getByRole('heading', { name: /Halo/ }).waitFor());
await visit(s, '/anatomy', (p) => p.getByRole('link', { name: /Atlas 3D/ }).first().waitFor(), '01-anatomy-landing');
ok('Atlas landing (split 3D / 4D entry from the 4D branch)');
await visit(s, '/anatomy/library', (p) => p.locator('main').getByText(/struktur/i).first().waitFor());
await visit(s, '/anatomy/study?mode=identify&system=skeletal&region=whole', (p) => p.getByText(/Kenali Struktur|Pilih nama|Apa nama struktur/).first().waitFor());
ok('Atlas library and 3D quiz');
await visit(s, '/anatomy/explore', async (p) => { await p.locator('iframe, canvas').first().waitFor({ timeout: 120000 }); await p.waitForTimeout(4000); }, '02-atlas-3d');
const viewer = s.frames().find((f) => f.url().includes('/anatomy/viewer/'));
if (viewer) await viewer.locator('canvas').first().waitFor({ timeout: 120000 });
ok('Atlas 3D viewer (original /anatomy/viewer/ build) loads');
await visit(s, '/mata-kuliah', (p) => p.getByRole('heading', { name: /Mata kuliah/i }).first().waitFor());
await visit(s, `/mata-kuliah/${subject.slug}`, (p) => p.getByRole('heading', { name: subject.name }).first().waitFor(), '03-bank-soal');
ok('question bank: subject list and subject page');
await visit(s, '/drilling', (p) => p.getByText(/Kampusmu|kampus/i).first().waitFor());
await visit(s, '/simulasi-dokter', (p) => p.getByText(/Simulasi/i).first().waitFor());
await visit(s, '/progres', (p) => p.getByRole('heading').first().waitFor());
await visit(s, '/leaderboard', (p) => p.getByRole('heading').first().waitFor());
ok('Kampusmu (drilling), doctor simulation, progress, leaderboard');
await visit(s, '/jadwal', (p) => p.getByRole('heading', { name: 'Pusat ujian' }).waitFor());
await visit(s, '/rencana-belajar', (p) => p.getByRole('heading', { name: 'Belajar hari ini' }).waitFor());
await visit(s, '/lab/sistem/jantung-kardiovaskular', (p) => p.getByRole('heading', { name: 'Jantung & Kardiovaskular' }).waitFor());
await visit(s, '/lab/ekg', (p) => p.getByText(/sedang ditinjau pendidik klinis/).waitFor());
await s.waitForTimeout(1500);
await s.goto(WEB + '/beranda'); await s.waitForTimeout(1500); // page change flushes the activity tracker
ok('new pages render next to the 4D-branch product');

const a = await session(adminId);
await visit(a, '/admin', (p) => p.getByRole('heading').first().waitFor());
let report = null;
for (let i = 0; i < 20; i++) {
  const token = await a.evaluate(() => { for (const k of Object.keys(localStorage)) { try { const v = JSON.parse(localStorage.getItem(k)); if (v?.token) return v.token; } catch { /* next */ } } return ''; });
  report = await a.evaluate(async (t) => (await fetch('/api/medcoel/admin/activity?days=7', { headers: { Authorization: t } })).json(), token);
  if (JSON.stringify(report).includes('/lab/sistem/:track')) break;
  await a.waitForTimeout(1000);
}
const text = JSON.stringify(report);
for (const key of ['/jadwal', '/rencana-belajar', '/lab/sistem/:track', '/anatomy/explore']) assert.ok(text.includes(key), `activity report counts ${key}`);
await visit(a, '/admin/aktivitas', (p) => p.getByText(/Aktivitas/).first().waitFor(), '04-admin-activity');
ok('admin activity report (4D branch) counts the new Planner and Lab pages');

assert.deepEqual(errors, [], 'no runtime errors');
await browser.close();
console.log('integration smoke passed');

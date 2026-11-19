// Browser journey for the Lab entry points (hub, body-system and clinical-skill tracks) and the schematic ECG module.
// Local QA only. Needs a disposable local PocketBase (PB_URL) and the web app at WEB_URL: either the dev server or, to also
// exercise /anatomy/live -> 4D Lab deep links, scripts/local-prod-layout-server.mjs after building web, Atlas and 4D.
// Optional WEB_ABSENT_URL: the same layout server started with LAB4D_ABSENT=1 (4D release not installed). --shots saves evidence.
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = (() => { for (const id of [process.env.PLAYWRIGHT_MODULE, 'playwright', '/opt/node-tools/node_modules/playwright'].filter(Boolean)) { try { return require(id); } catch { /* next */ } } throw Error('Playwright not found'); })();
const PB = process.env.PB_URL || 'http://127.0.0.1:8092', WEB = process.env.WEB_URL || 'http://127.0.0.1:3000';
for (const u of [PB, WEB]) if (!['127.0.0.1', 'localhost'].includes(new URL(u).hostname)) throw new Error('local only');
const SHOTS = process.argv.includes('--shots'), OUT = new URL('../docs/evidence/lab/', import.meta.url).pathname;
async function call(method, path, body, token, status = 200) {
  const r = await fetch(PB + path, { method, headers: { ...(token ? { Authorization: token } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text(); assert.equal(r.status, status, `${method} ${path}: ${t.slice(0, 300)}`); return t ? JSON.parse(t) : null;
}
const su = (await call('POST', '/api/collections/_superusers/auth-with-password', { identity: process.env.PB_SU_EMAIL || 'study@medcoel.test', password: process.env.PB_SU_PASSWORD || 'study-test-password-123' })).token;
const run = Date.now().toString(36), password = 'demo-fixture-password';
const loginId = `lab${run}`, adminId = `labadm${run}`;
await call('POST', '/api/collections/users/records', { loginId, name: 'Raka Pratama', email: `${loginId}@example.test`, password, passwordConfirm: password, role: 'user', verified: true, tutorials: { fk: 'done', dokter: 'done' } }, su);
await call('POST', '/api/collections/users/records', { loginId: adminId, name: 'Admin Reviewer', email: `${adminId}@example.test`, password, passwordConfirm: password, role: 'admin', verified: true, tutorials: { fk: 'done', dokter: 'done' } }, su);
const has4d = await fetch(WEB + '/anatomy/4d-lab/data/phantom/anatomy.json').then((r) => r.ok && (r.headers.get('content-type') || '').includes('json')).catch(() => false);

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
async function signIn(p, id) {
  await p.goto(WEB + '/masuk');
  await p.fill('#identity', id); await p.fill('#password', password); await p.click('button[type=submit]');
  await p.waitForURL((u) => !u.pathname.startsWith('/masuk'));
}
const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 }, deviceScaleFactor: SHOTS ? 2 : 1, locale: 'id-ID', timezoneId: 'Asia/Jakarta' });
const page = await ctx.newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.stack || e.message));
process.on('uncaughtException', async (e) => { console.error(e); console.error('page errors:', errors); try { await page.screenshot({ path: process.env.FAIL_SHOT || 'lab-e2e-failure.png', fullPage: true }); } catch { /* ignore */ } process.exit(1); });
if (SHOTS) await mkdir(OUT, { recursive: true });
const shot = async (name, p = page) => { if (!SHOTS) return; await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(250); await p.screenshot({ path: OUT + name + '.jpg', type: 'jpeg', quality: 70, fullPage: true, timeout: 120000 }); };
const ok = (m) => console.log('  ok', m);

await signIn(page, loginId);

await page.goto(WEB + '/lab');
await page.getByText('All-in-One Lab', { exact: true }).waitFor();
await page.getByRole('heading', { name: 'Belajar per sistem tubuh' }).waitFor();
await page.locator('[data-track="dada-pernapasan"]').getByText(/langkah tersedia/).waitFor();
assert.equal(await page.locator('[data-track]').count(), 14, 'all 14 tracks listed');
assert.ok(await page.getByRole('tab', { name: 'Guided Learning' }).isVisible(), 'Guided/Explore preserved');
assert.ok(await page.getByRole('heading', { name: 'Semua materi per bidang' }).isVisible());
ok('Lab home: All-in-One, body systems, clinical skills, Guided/Explore kept');
await shot('01-lab-home');

await page.locator('[data-track="saraf-otak"]').click();
await page.getByRole('heading', { name: 'Otak & Neuroanatomi' }).waitFor();
assert.equal(await page.locator('[data-step="atlas-saraf"]').getAttribute('data-available'), '0', 'withheld nervous system is not offered');
assert.equal(await page.locator('[data-step="neuro-mri"]').getAttribute('data-available'), '0');
assert.ok(await page.locator('[data-step="atlas-saraf"]').getByText(/ditinjau lisensinya/).isVisible());
ok('Neuro track shows licence-withheld and planned steps as unavailable');
await shot('02-track-neuro');

await page.goto(WEB + '/lab/keterampilan/tekanan-darah');
await page.getByRole('heading', { name: 'Pengukuran Tekanan Darah' }).waitFor();
await page.locator('[data-step="arteri-lengan"]').getByRole('button', { name: 'Tandai selesai' }).click();
await page.locator('[data-step="arteri-lengan"]').getByRole('button', { name: /Selesai/ }).waitFor();
assert.ok(await page.getByText('1 dari 3 langkah tersedia · 1 selesai').isVisible());
assert.ok(await page.getByText(/tidak dihitung/).isVisible(), 'partial track explains what is not counted');
assert.equal(await page.locator('[data-step="korotkoff"] button').count(), 0, 'planned step cannot be marked');
ok('Blood pressure track: only real content can be completed');
await shot('03-track-bp');

await page.goto(WEB + '/lab/keterampilan/ekg');
await page.getByRole('heading', { name: 'EKG Dasar' }).waitFor();
assert.equal(await page.locator('[data-step="konduksi"]').getAttribute('data-available'), '0', 'ECG module is closed to students');
assert.ok(await page.locator('[data-step="konduksi"]').getByText(/ditinjau pendidik klinis/).isVisible());
await call('POST', '/api/medcoel/lab/tracks/ekg', { step: 'konduksi', done: true }, (await call('POST', '/api/collections/users/auth-with-password', { identity: loginId, password })).token, 400);
await page.goto(WEB + '/lab/ekg');
await page.getByText(/sedang ditinjau pendidik klinis/).waitFor();
assert.equal(await page.getByRole('slider', { name: 'Geser waktu' }).count(), 0, 'no ECG content for students before review');
ok('ECG module gated for students until clinical review (UI and API)');
await shot('04-ecg-gated-student');

if (has4d) {
  await page.goto(WEB + '/lab/sistem/dada-pernapasan');
  await page.locator('[data-step="usg-efusi"]').getByRole('link', { name: /Buka/ }).click();
  await page.waitForURL('**/anatomy/live?scenario=effusion');
  const frame = page.frameLocator('iframe[title="MEDCOEL Anatomy Live 4D Lab"]');
  assert.equal(await page.locator('iframe[title="MEDCOEL Anatomy Live 4D Lab"]').getAttribute('src'), '/anatomy/4d-lab/?scenario=effusion');
  await frame.locator('body[data-ready="1"]').waitFor({ timeout: 240000 });
  const lab = page.frames().find((f) => f.url().includes('/anatomy/4d-lab/'));
  assert.equal(await lab.evaluate(() => window.__lab.S.scenario), 'effusion');
  ok('Lab track -> /anatomy/live?scenario=effusion -> 4D Lab opens the effusion case (production route layout)');
  await page.waitForTimeout(1500); await shot('05-deeplink-4d-effusion');
  await page.goto(WEB + '/lab'); // stop the software-rendered 4D frame before the next journeys
} else console.log('  skip deep link into the 4D build (not served at WEB_URL)');

// The reviewer path: admins can open the ECG module before release.
const adminCtx = await browser.newContext({ viewport: { width: 1360, height: 900 }, deviceScaleFactor: SHOTS ? 2 : 1, locale: 'id-ID', timezoneId: 'Asia/Jakarta' });
const ap = await adminCtx.newPage(); ap.on('pageerror', (e) => errors.push(e.stack || e.message));
await signIn(ap, adminId);
await ap.goto(WEB + '/lab/keterampilan/ekg');
await ap.locator('[data-step="konduksi"]').getByRole('link', { name: /Buka/ }).click();
await ap.waitForURL('**/lab/ekg');
await ap.getByRole('heading', { name: 'Konduksi jantung & EKG skematik' }).waitFor();
assert.ok(await ap.getByText('Pratinjau admin.').isVisible(), 'admin sees that the module is not released yet');
assert.ok(await ap.getByText('Pola skematik.').isVisible());
await ap.getByRole('button', { name: /Jeda/ }).click();
const slider = ap.getByRole('slider', { name: 'Geser waktu' });
const qrsAt = 200 + 160 + 10; // first sinus beat: P at 200 ms, PR 160 ms
await slider.fill(String(qrsAt)); await ap.getByText(/Kompleks QRS · Cabang berkas/).waitFor();
await slider.fill('250'); await ap.getByText(/Gelombang P · Atrium/).waitFor();
await ap.getByRole('button', { name: 'Blok AV derajat 2 tipe I (Wenckebach)' }).click();
await ap.getByText(/P tanpa QRS/).first().waitFor();
assert.ok(await ap.getByText('tidak teratur', { exact: true }).isVisible());
ok('ECG (admin review): scrubbing drives the conduction diagram; Wenckebach shows a dropped beat');
await ap.getByRole('button', { name: 'Irama sinus normal' }).click(); await slider.fill(String(qrsAt));
await shot('06-ecg-admin-review', ap);
await ap.getByRole('tab', { name: 'Latihan' }).click();
await ap.waitForURL('**/lab/ekg?latihan=1');
for (let i = 0; i < 5; i++) {
  await ap.getByRole('heading', { name: 'Pola apa yang paling sesuai?' }).waitFor();
  await ap.getByRole('group', { name: 'Pilihan jawaban' }).getByRole('button').first().click();
  await ap.getByText(/^(Benar\.|Belum tepat)/).waitFor();
  if (i === 0) await shot('07-ecg-practice', ap);
  await ap.getByRole('button', { name: /Soal berikutnya|Lihat hasil/ }).click();
}
await ap.getByText(/dari 5 benar/).waitFor();
ok('ECG practice (admin review): five self-check questions with feedback, no points');

await page.goto(WEB + '/lab/sistem/rangka-otot');
await page.locator('[data-step="kuis-tulang"]').getByRole('button', { name: 'Tandai selesai' }).click();
await page.locator('[data-step="kuis-tulang"]').getByRole('button', { name: /Selesai/ }).waitFor();
await page.goto(WEB + '/lab');
await page.getByLabel('Lanjutkan jalur').waitFor();
ok('Lab home offers to continue the last track');

const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: SHOTS ? 2 : 1, locale: 'id-ID', timezoneId: 'Asia/Jakarta', storageState: await ctx.storageState() });
const m = await mobile.newPage(); m.on('pageerror', (e) => errors.push(e.message));
for (const [path, wait, name] of [['/lab', 'All-in-One Lab', '08-mobile-lab-home'], ['/lab/sistem/jantung-kardiovaskular', 'Jantung & Kardiovaskular', '09-mobile-track'], ['/lab/ekg', 'Konduksi jantung & EKG skematik', '10-mobile-ecg-gated']]) {
  await m.goto(WEB + path); await m.getByText(wait, { exact: true }).first().waitFor();
  const overflow = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(overflow <= 1, `${path}: no horizontal page scroll (${overflow})`);
  await shot(name, m);
}
ok('mobile: hub, track and ECG pages fit 390 px');

if (process.env.WEB_ABSENT_URL) { // a server without the separate 4D release
  const c = await browser.newContext({ viewport: { width: 1360, height: 900 }, deviceScaleFactor: SHOTS ? 2 : 1, locale: 'id-ID' });
  const p = await c.newPage(); p.on('pageerror', (e) => errors.push(e.message));
  const base = process.env.WEB_ABSENT_URL;
  await p.goto(base + '/masuk'); await p.fill('#identity', loginId); await p.fill('#password', password); await p.click('button[type=submit]');
  await p.waitForURL((u) => !u.pathname.startsWith('/masuk'));
  await p.goto(base + '/lab'); await p.locator('[data-track="usg-dasar"]').getByText(/langkah tersedia/).waitFor();
  assert.equal(await p.getByRole('link', { name: 'Live 4D Lab' }).count(), 0, 'no Live 4D button when the 4D release is missing');
  assert.ok(await p.locator('[data-track="usg-dasar"]').getByText('0/6 langkah tersedia').isVisible());
  await p.goto(base + '/lab/keterampilan/usg-dasar'); await p.getByText(/belum terpasang di server ini/).first().waitFor();
  ok('without the 4D release: Live 4D steps are unavailable and uncounted, the hub hides its 4D button');
  await shot('11-no-4d-release', p);
  await c.close();
}
assert.deepEqual(errors, [], 'no runtime errors');
await browser.close();
console.log('lab tracks browser journey passed');

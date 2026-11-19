// Browser journey for the Lab entry points (hub, body-system and clinical-skill tracks) and the schematic ECG module.
// Local QA only. Same setup as scripts/study-planner-e2e.mjs (local PocketBase + web dev server). Use --shots for evidence.
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
const loginId = `lab${Date.now().toString(36)}`, password = 'demo-fixture-password';
await call('POST', '/api/collections/users/records', { loginId, name: 'Raka Pratama', email: `${loginId}@example.test`, password, passwordConfirm: password, role: 'user', verified: true, tutorials: { fk: 'done', dokter: 'done' } }, su);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 }, deviceScaleFactor: SHOTS ? 2 : 1, locale: 'id-ID', timezoneId: 'Asia/Jakarta' });
const page = await ctx.newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.stack || e.message));
process.on('uncaughtException', async (e) => { console.error(e); console.error('page errors:', errors); try { await page.screenshot({ path: process.env.FAIL_SHOT || 'lab-e2e-failure.png', fullPage: true }); } catch { /* ignore */ } process.exit(1); });
if (SHOTS) await mkdir(OUT, { recursive: true });
const shot = async (name, p = page) => { if (!SHOTS) return; await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(250); await p.screenshot({ path: OUT + name + '.jpg', type: 'jpeg', quality: 70, fullPage: true }); };
const ok = (m) => console.log('  ok', m);

await page.goto(WEB + '/masuk');
await page.fill('#identity', loginId); await page.fill('#password', password); await page.click('button[type=submit]');
await page.waitForURL('**/beranda');

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
await page.locator('[data-step="konduksi"]').getByRole('link', { name: /Buka/ }).click();
await page.waitForURL('**/lab/ekg');
await page.getByRole('heading', { name: 'Konduksi jantung & EKG skematik' }).waitFor();
assert.ok(await page.getByText('Pola skematik.').isVisible());
await page.getByRole('button', { name: /Jeda/ }).click();
const slider = page.getByRole('slider', { name: 'Geser waktu' });
const qrsAt = await page.evaluate(() => 200 + 160 + 10); // first sinus beat: P at 200 ms, PR 160 ms
await slider.fill(String(qrsAt)); await page.getByText(/Kompleks QRS · Cabang berkas/).waitFor();
await slider.fill('250'); await page.getByText(/Gelombang P · Atrium/).waitFor();
await page.getByRole('button', { name: 'Blok AV derajat 2 tipe I (Wenckebach)' }).click();
await page.getByText(/P tanpa QRS/).first().waitFor();
assert.ok(await page.getByText('tidak teratur', { exact: true }).isVisible());
ok('ECG learn: playback scrubbing drives the conduction diagram; Wenckebach shows a dropped beat');
await page.getByRole('button', { name: 'Irama sinus normal' }).click(); await slider.fill(String(qrsAt));
await shot('04-ecg-learn');

await page.getByRole('tab', { name: 'Latihan' }).click();
await page.waitForURL('**/lab/ekg?latihan=1');
for (let i = 0; i < 5; i++) {
  await page.getByRole('heading', { name: 'Pola apa yang paling sesuai?' }).waitFor();
  await page.getByRole('group', { name: 'Pilihan jawaban' }).getByRole('button').first().click();
  await page.getByText(/^(Benar\.|Belum tepat)/).waitFor();
  if (i === 0) await shot('05-ecg-practice');
  await page.getByRole('button', { name: /Soal berikutnya|Lihat hasil/ }).click();
}
await page.getByText(/dari 5 benar/).waitFor();
ok('ECG practice: five self-check questions with feedback, no points');

await page.goto(WEB + '/lab');
await page.getByLabel('Lanjutkan jalur').waitFor();
ok('Lab home offers to continue the last track');

const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: SHOTS ? 2 : 1, locale: 'id-ID', timezoneId: 'Asia/Jakarta', storageState: await ctx.storageState() });
const m = await mobile.newPage(); m.on('pageerror', (e) => errors.push(e.message));
for (const [path, wait, name] of [['/lab', 'All-in-One Lab', '06-mobile-lab-home'], ['/lab/sistem/jantung-kardiovaskular', 'Jantung & Kardiovaskular', '07-mobile-track'], ['/lab/ekg', 'Konduksi jantung & EKG skematik', '08-mobile-ecg']]) {
  await m.goto(WEB + path); await m.getByText(wait, { exact: true }).first().waitFor();
  const overflow = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  assert.ok(overflow <= 1, `${path}: no horizontal page scroll (${overflow})`);
  await shot(name, m);
}
ok('mobile: hub, track and ECG pages fit 390 px');
assert.deepEqual(errors, [], 'no runtime errors');
await browser.close();
console.log('lab tracks browser journey passed');

// Browser journey for the Exam Center + Study Planner (local QA only; never production).
// Needs: a disposable local PocketBase with migrations (PB_URL, default :8092) and the web dev server pointing to it:
//   (cd apps/web && MEDCOEL_DEV_PB_URL=http://127.0.0.1:8092 npx vite --host 127.0.0.1 --port 3000)
//   PB_SU_EMAIL=study@medcoel.test PB_SU_PASSWORD=study-test-password-123 node scripts/study-planner-e2e.mjs [--shots]
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = (() => { for (const id of [process.env.PLAYWRIGHT_MODULE, 'playwright', '/opt/node-tools/node_modules/playwright'].filter(Boolean)) { try { return require(id); } catch { /* next */ } } throw Error('Playwright not found'); })();
const PB = process.env.PB_URL || 'http://127.0.0.1:8092', WEB = process.env.WEB_URL || 'http://127.0.0.1:3000';
for (const u of [PB, WEB]) if (!['127.0.0.1', 'localhost'].includes(new URL(u).hostname)) throw new Error('local only');
const SHOTS = process.argv.includes('--shots'), OUT = new URL('../docs/evidence/study/', import.meta.url).pathname;
async function call(method, path, body, token, status = 200) {
  const r = await fetch(PB + path, { method, headers: { ...(token ? { Authorization: token } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text(); assert.equal(r.status, status, `${method} ${path}: ${t.slice(0, 300)}`); return t ? JSON.parse(t) : null;
}
const su = (await call('POST', '/api/collections/_superusers/auth-with-password', { identity: process.env.PB_SU_EMAIL || 'study@medcoel.test', password: process.env.PB_SU_PASSWORD || 'study-test-password-123' })).token;
const run = Date.now().toString(36), loginId = `demo${run}`, password = 'demo-fixture-password';
const user = await call('POST', '/api/collections/users/records', { loginId, name: 'Nadia Putri', email: `${loginId}@example.test`, password, passwordConfirm: password, role: 'user', verified: true, tutorials: { fk: 'done', dokter: 'done' } }, su);
const token = (await call('POST', '/api/collections/users/auth-with-password', { identity: loginId, password })).token;
const subjects = (await call('GET', '/api/collections/subjects/records?perPage=50&sort=name&filter=' + encodeURIComponent('hidden=false'), undefined, su)).items;
const subj = subjects.find((s) => /anatomi/i.test(s.name)) || subjects[0];
const titles = ['Toraks dan mediastinum', 'Jantung dan pembuluh besar', 'Paru dan pleura', 'Abdomen anterior', 'Saluran cerna atas', 'Hepar dan sistem bilier', 'Ekstremitas atas'];
const chapters = [];
for (const [i, title] of titles.entries()) chapters.push(await call('POST', '/api/collections/chapters/records', { subject: subj.id, title: `${title} (${run})`, order: 950 + i }, su));
const at = (days, hour = 1) => { const d = new Date(); d.setUTCHours(hour, 0, 0, 0); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().replace('T', ' '); };
const exams = [];
for (const [title, days, s] of [['UTB', 5, subj], ['UAB', 6, subjects.find((x) => x.id !== subj.id)], ['Kuis', 12, subjects.find((x) => x.id !== subj.id && x.id !== subjects[1].id) || subjects[2]]]) {
  exams.push(await call('POST', '/api/collections/exam_schedules/records', { user: user.id, subject: s.id, title, examAt: at(days), timezone: 'WIB', reminderDays: [7, 3, 1] }, token));
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 }, deviceScaleFactor: SHOTS ? 2 : 1, locale: 'id-ID', timezoneId: 'Asia/Jakarta' });
const page = await ctx.newPage();
const errors = []; page.on('pageerror', (e) => errors.push(e.stack || e.message));
if (SHOTS) await mkdir(OUT, { recursive: true });
const shot = async (name, p = page) => { if (SHOTS) { await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(200); } if (SHOTS) await p.screenshot({ path: OUT + name + '.jpg', type: 'jpeg', quality: 70, fullPage: true }); };
const ok = (m) => console.log('  ok', m);

process.on('uncaughtException', async (e) => { console.error(e); console.error('page errors:', errors); try { await page.screenshot({ path: process.env.FAIL_SHOT || 'study-e2e-failure.png', fullPage: true }); console.error('failure screenshot saved'); } catch { /* ignore */ } process.exit(1); });
await page.goto(WEB + '/masuk');
await page.fill('#identity', loginId); await page.fill('#password', password); await page.click('button[type=submit]');
await page.waitForURL('**/beranda');

await page.goto(WEB + '/jadwal');
await page.getByRole('heading', { name: 'Pusat ujian' }).waitFor();
const cards = page.locator('article');
await cards.first().waitFor();
assert.equal(await cards.count(), 3, 'three exams listed');
assert.equal(await page.getByRole('link', { name: /Buat rencana/ }).count(), 3, 'every exam has a study-plan entry point');
ok('Exam Center: three exams, each with a plan entry point');
await shot('01-exam-center-no-plans');

await page.getByRole('link', { name: /Buat rencana/ }).first().click();
await page.getByRole('heading', { name: /1\. Waktu belajarmu/ }).waitFor();
await page.fill('#sp-daily', '180');
for (const t of titles.slice(0, 6)) await page.getByLabel(`${t} (${run})`).check();
await page.getByPlaceholder(/Tambah topik sendiri/).fill('Kasus klinis dari kuliah pakar');
await page.getByRole('button', { name: 'Tambah', exact: true }).last().click();
const statusSelects = page.getByLabel('Status');
await statusSelects.nth(0).selectOption('studied'); await statusSelects.nth(1).selectOption('studied');
await page.getByRole('button', { name: /Pratinjau jadwal/ }).click();
await page.getByRole('heading', { name: /Pratinjau/ }).waitFor();
ok('planner wizard: chapters + custom topic + statuses + preview');
await shot('02-planner-preview');
await page.getByRole('button', { name: 'Simpan rencana' }).click();
await page.getByRole('heading', { name: 'Jadwal harian' }).waitFor();
const firstToggle = page.getByRole('button', { name: /^Tandai selesai/ }).first();
await firstToggle.click();
await page.getByRole('button', { name: /^Batalkan selesai/ }).first().waitFor();
ok('plan saved; a session is marked done');
await shot('03-plan-view');

// second exam plan through the API (faster), then check the shared view
const detail = await call('GET', `/api/medcoel/study/exams/${exams[1].id}`, undefined, token);
await call('POST', `/api/medcoel/study/exams/${exams[1].id}/plan`, { topics: [{ title: 'Fisiologi kardiovaskular' }, { title: 'Fisiologi respirasi', status: 'studied' }, { title: 'Ginjal dan cairan tubuh', workload: 'heavy' }, ...detail.chapters.slice(0, 2).map((c) => ({ title: c.title, source: { type: 'chapter', subject: c.subject, chapter: c.id } }))], priority: 3 }, token);
await page.goto(WEB + '/rencana-belajar');
await page.getByRole('heading', { name: 'Tugas hari ini' }).waitFor();
assert.ok(await page.getByRole('heading', { name: 'Progres per ujian' }).isVisible());
ok('Today view lists sessions across exams');
await shot('04-today');

await page.goto(WEB + '/jadwal');
await page.getByRole('heading', { name: 'Beban belajar 14 hari' }).waitFor();
ok('Exam Center shows the shared 14-day workload');
await shot('05-exam-center-with-plans');
await page.getByRole('tab', { name: 'Kalender' }).click();
await page.getByLabel('Kalender ujian 5 minggu').waitFor();
await shot('06-exam-calendar');

await page.goto(WEB + '/beranda');
await page.getByRole('heading', { name: 'Belajar hari ini' }).waitFor();
assert.ok(await page.getByLabel('Ujian lain').isVisible(), 'home shows other exams under the nearest one');
ok('Home keeps the nearest exam and adds today + other exams');
await shot('07-home');

const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: SHOTS ? 2 : 1, locale: 'id-ID', timezoneId: 'Asia/Jakarta', storageState: await ctx.storageState() });
const m = await mobile.newPage(); m.on('pageerror', (e) => errors.push(e.message));
await m.goto(WEB + '/jadwal'); await m.getByRole('heading', { name: 'Pusat ujian' }).waitFor();
const overflow = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
assert.ok(overflow <= 1, 'no horizontal scroll on mobile: ' + overflow);
await shot('08-mobile-exam-center', m);
await m.goto(WEB + `/jadwal/${exams[0].id}/rencana`); await m.getByRole('heading', { name: 'Jadwal harian' }).waitFor();
await shot('09-mobile-plan', m);
await m.goto(WEB + '/rencana-belajar'); await m.getByRole('heading', { name: 'Tugas hari ini' }).waitFor();
await shot('10-mobile-today', m);
ok('mobile layouts render without horizontal scroll');
assert.deepEqual(errors, [], 'no runtime errors');
await browser.close();
console.log('study planner browser journey passed');

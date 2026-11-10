// Browser test for the interactive, mascot-led tutorial: every task must be done on the REAL control before "Lanjut" unlocks.
//   npm run build && node test/e2e/tutorial-e2e.mjs [--shots]     (screenshots -> evidence/tutorial-*.jpg)
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { startServer } from './server.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const SHOTS = process.argv.includes('--shots');
const EVIDENCE = fileURLToPath(new URL('../../evidence/', import.meta.url));
const { srv, url } = await startServer();
const browser = await chromium.launch({ args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const results = [], errors = [];

async function fresh() { // a first visit: nothing remembered
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(url, { timeout: 180000 });
  await page.waitForFunction(() => document.body.dataset.ready === '1', null, { timeout: 180000 });
  return { ctx, page };
}
const shot = async (page, name) => { if (SHOTS) { await mkdir(EVIDENCE, { recursive: true }); await page.screenshot({ path: EVIDENCE + name + '.jpg', type: 'jpeg', quality: 72, timeout: 240000 }).catch(() => {}); } };
async function step(name, fn) {
  const t0 = Date.now();
  try { const note = await fn(); results.push({ name, ok: true, ms: Date.now() - t0 }); console.log('ok  ', name, note ? '— ' + note : ''); }
  catch (e) { results.push({ name, ok: false, error: String(e.message).split('\n')[0] }); console.log('FAIL', name, '\n    ', String(e.message).split('\n').slice(0, 3).join('\n     ')); }
}
const tour = (p) => p.getByTestId('tour');
const state = (p) => tour(p).getAttribute('data-state');
const mascot = (p) => p.getByTestId('tour-mascot').locator('[data-mascot]').getAttribute('data-mascot');
const nextDisabled = (p) => p.getByTestId('tour-next').isDisabled();
const waitState = (p, s, ms = 20000) => p.waitForFunction((st) => document.querySelector('[data-testid=tour]')?.dataset.state === st, s, { timeout: ms });
const lab = (p, fn, arg) => p.evaluate(fn, arg);

let A = await fresh();
await step('first visit: Kori welcomes, six steps, nothing is skipped silently', async () => {
  assert.ok(await tour(A.page).isVisible(), 'tutorial shown on first visit');
  assert.equal(await mascot(A.page), 'kori'); assert.equal(await state(A.page), 'plain');
  assert.match(await tour(A.page).innerText(), /1 DARI 6/); assert.match(await tour(A.page).innerText(), /Halo, aku Kori/);
  assert.equal(await nextDisabled(A.page), false, 'the welcome step has no task');
  await shot(A.page, 'tutorial-01-kori-welcome');
  await A.page.getByTestId('tour-next').click();
});
await step('probe: Lanjut stays locked until a direction button is really pressed; Kila celebrates', async () => {
  assert.equal(await state(A.page), 'task'); assert.equal(await mascot(A.page), 'kori');
  assert.equal(await nextDisabled(A.page), true, 'locked before the task');
  const before = await lab(A.page, () => JSON.stringify(window.__lab.S.contact?.point));
  await A.page.waitForTimeout(700); assert.equal(await nextDisabled(A.page), true, 'still locked while nothing was touched');
  await shot(A.page, 'tutorial-02-probe-task');
  await A.page.getByTestId('pad-superior').click();
  await waitState(A.page, 'success');
  assert.notEqual(await lab(A.page, () => JSON.stringify(window.__lab.S.contact?.point)), before, 'the probe really moved');
  assert.equal(await mascot(A.page), 'kila'); assert.equal(await nextDisabled(A.page), false);
  assert.match(await tour(A.page).innerText(), /Probe bergeser/);
  await shot(A.page, 'tutorial-03-kila-success');
  await A.page.getByTestId('tour-next').click();
});
await step('camera: only a real drag unlocks it, and the imaging does not change', async () => {
  assert.equal(await state(A.page), 'task'); assert.equal(await nextDisabled(A.page), true);
  const frameBefore = await lab(A.page, () => window.__lab.last?.id);
  const box = await A.page.locator('#viewport').boundingBox();
  const x = box.x + box.width * 0.2, y = box.y + box.height * 0.15;
  await A.page.mouse.move(x, y); await A.page.mouse.down(); await A.page.mouse.move(x + 140, y + 30, { steps: 8 }); await A.page.mouse.up();
  await waitState(A.page, 'success'); assert.equal(await mascot(A.page), 'kila');
  await A.page.waitForTimeout(400);
  assert.equal(await lab(A.page, () => window.__lab.last?.id), frameBefore, 'the camera must not trigger a new imaging frame');
  await A.page.getByTestId('tour-next').click();
});
await step('hover: pointing at the image shows the structure name, and only then the step is done', async () => {
  assert.equal(await state(A.page), 'task'); assert.equal(await nextDisabled(A.page), true);
  assert.notEqual(await A.page.getByTestId('assist-level').inputValue(), 'off', 'the tutorial turned the anatomy help on for the learner');
  await shot(A.page, 'tutorial-04-hover-task');
  const c = await A.page.locator('#monitor').boundingBox();
  let ok = false;
  for (let gy = 0.35; gy <= 0.8 && !ok; gy += 0.05) for (let gx = 0.25; gx <= 0.75 && !ok; gx += 0.05) {
    await A.page.mouse.move(c.x + c.width * gx, c.y + c.height * gy); await A.page.waitForTimeout(160);
    ok = (await state(A.page)) === 'success';
  }
  assert.ok(ok, 'hovering the image never completed the step'); assert.equal(await mascot(A.page), 'kila');
  assert.match(await tour(A.page).innerText(), /Kamu menunjuk:/);
  await shot(A.page, 'tutorial-05-hover-success');
  await A.page.getByTestId('tour-next').click();
});
await step('anatomy help level: choosing Kontur completes the step', async () => {
  assert.equal(await state(A.page), 'task'); assert.equal(await nextDisabled(A.page), true);
  await A.page.getByTestId('assist-level').selectOption('contours');
  await waitState(A.page, 'success'); assert.match(await tour(A.page).innerText(), /Kontur/);
  await A.page.getByTestId('tour-next').click();
});
await step('last step: Kori cheers, finishing remembers the tutorial', async () => {
  assert.match(await tour(A.page).innerText(), /Siap berlatih/); assert.equal(await nextDisabled(A.page), false);
  await shot(A.page, 'tutorial-06-finish');
  await A.page.getByTestId('tour-next').click();
  assert.equal(await tour(A.page).count(), 0, 'tutorial closed');
  assert.equal(await lab(A.page, () => localStorage.getItem('medcoel-4dlab-tour-v3')), 'done');
});
await step('replay from the ? menu works after it was seen', async () => {
  await A.page.getByTestId('help-btn').click(); await A.page.getByTestId('tour-replay').click();
  assert.ok(await tour(A.page).isVisible()); assert.match(await tour(A.page).innerText(), /1 DARI 6/);
  await A.page.getByTestId('tour-skip').click(); assert.equal(await tour(A.page).count(), 0);
});
await A.ctx.close();

A = await fresh();
await step('never trapped: "Lewati langkah" moves on without the task; Nilo offers a hint when the learner is stuck', async () => {
  await A.page.getByTestId('tour-next').click(); // welcome -> probe task
  assert.equal(await state(A.page), 'task');
  await waitState(A.page, 'hint', 20000);
  assert.equal(await mascot(A.page), 'nilo'); assert.match(await tour(A.page).innerText(), /Coba lagi/);
  await shot(A.page, 'tutorial-07-nilo-hint');
  await A.page.getByTestId('tour-skip-step').click();
  assert.match(await tour(A.page).innerText(), /3 DARI 6/);
  await A.page.getByTestId('tour-skip').click(); assert.equal(await tour(A.page).count(), 0);
  assert.equal(await lab(A.page, () => localStorage.getItem('medcoel-4dlab-tour-v3')), 'done');
});
await step('the page stays usable under the overlay: arrow keys still move the probe while a step waits', async () => {
  await A.page.getByTestId('help-btn').click(); await A.page.getByTestId('tour-replay').click();
  await A.page.getByTestId('tour-next').click(); assert.equal(await state(A.page), 'task');
  const before = await lab(A.page, () => JSON.stringify(window.__lab.S.contact?.point));
  await A.page.locator('#viewport').click({ position: { x: 5, y: 5 } }).catch(() => {});
  await A.page.keyboard.press('ArrowUp');
  await waitState(A.page, 'success', 8000);
  assert.notEqual(await lab(A.page, () => JSON.stringify(window.__lab.S.contact?.point)), before);
  await A.page.getByTestId('tour-skip').click();
});
await step('Tri-planar tutorial: slider and click on the CT image are real tasks', async () => {
  await A.page.getByTestId('mon-tri').click();
  await A.page.waitForSelector('[data-testid=tour]', { timeout: 20000 });
  assert.match(await tour(A.page).innerText(), /PANDUAN TRI-PLANAR/); assert.equal(await nextDisabled(A.page), false);
  await A.page.getByTestId('tour-next').click(); assert.equal(await state(A.page), 'task'); assert.equal(await nextDisabled(A.page), true);
  await A.page.evaluate(() => { const i = document.querySelector('[data-testid=slice-ax]'); i.value = String(Number(i.value) + 12); i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); });
  await waitState(A.page, 'success'); await A.page.getByTestId('tour-next').click();
  assert.equal(await state(A.page), 'task');
  const c = await A.page.locator('#monitor').boundingBox(); let ok = false;
  for (const [gx, gy] of [[0.2, 0.25], [0.3, 0.3], [0.7, 0.25], [0.25, 0.7], [0.75, 0.7], [0.5, 0.5]]) { await A.page.mouse.click(c.x + c.width * gx, c.y + c.height * gy); await A.page.waitForTimeout(250); if ((await state(A.page)) === 'success') { ok = true; break; } }
  assert.ok(ok, 'clicking a CT image never completed the step');
  await A.page.getByTestId('tour-next').click(); assert.equal(await tour(A.page).count(), 0);
});
await step('no runtime errors', async () => { assert.equal(errors.length, 0, errors.slice(0, 3).join(' | ')); });
await A.ctx.close(); await browser.close(); srv.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
process.exit(failed.length ? 1 : 0);

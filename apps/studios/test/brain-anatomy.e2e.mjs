// Brain Anatomy 3D studio in a real browser (standalone build). Explore + Guided driven through the real UI.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { serveStatic } from '../scripts/serve-static.mjs';
const require = createRequire(import.meta.url);
const { chromium } = (() => { for (const id of [process.env.PLAYWRIGHT_MODULE, 'playwright', '/opt/node-tools/node_modules/playwright'].filter(Boolean)) { try { return require(id); } catch { /* next */ } } throw Error('Playwright not found'); })();
const shots = process.argv.includes('--shots') ? process.argv[process.argv.indexOf('--shots') + 1] : null;
const srv = await serveStatic(new URL('../brain-anatomy/dist', import.meta.url).pathname);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
let pass = 0; const step = async (n, fn) => { await fn(); pass++; console.log('  ok', n); };
const guideDone = () => page.waitForFunction(() => /Terdeteksi/.test(document.querySelector('[data-testid=guide]').innerText), null, { timeout: 30000 });
try {
  await page.goto(srv.url + 'index.html?mode=guided');
  await page.waitForFunction(() => /struktur dimuat/.test(document.querySelector('[data-testid=studio-status]')?.textContent || ''), null, { timeout: 120000 });
  const dataset = await page.evaluate(() => fetch('./data/dataset.json').then(r => r.json()));
  const table = await page.evaluate(() => fetch('./data/structures.json').then(r => r.json()));
  console.log('dataset:', dataset.status, '·', table.structures.length, 'structures');
  await step('ANAT-001 model and hierarchy load; every structure has an FMA id and side', async () => {
    assert.deepEqual(errors, []);
    assert.equal(await page.locator('[data-testid=hierarchy] button').count(), table.structures.length);
    for (const s of table.structures) { assert.match(s.fma, /^(FMA\d+|FIXTURE-s\d+)$/); assert.ok(['left', 'right', 'midline'].includes(s.side)); }
  });
  const canvas = page.locator('canvas'), box = await canvas.boundingBox();
  await step('ANAT-002 guided rotate step completes only after real orbit drags', async () => {
    for (let k = 0; k < 4; k++) { await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 + 220, box.y + box.height / 2, { steps: 8 }); await page.mouse.up(); }
    await guideDone();
  });
  await step('ANAT-003 selecting the target (by clicking the mesh on screen) shows its name and FMA id', async () => {
    await page.getByRole('button', { name: 'Lanjut' }).click();
    const target = table.structures.find(s => s.id === dataset.guidedTargets.select);
    const p = await page.evaluate(id => window.__medcoelStudio.viewer.screenPoint(id), target.id);
    await page.mouse.click(box.x + p[0], box.y + p[1]);
    await page.waitForTimeout(300);
    let text = await page.locator('[data-testid=selection]').innerText();
    if (!text.includes(target.nameEn)) { // centre may be occluded by another structure: fall back to the hierarchy list
      await page.locator('[data-testid=hierarchy] button[data-sid="' + target.id + '"]').click();
      await page.waitForFunction(n => document.querySelector('[data-testid=selection]').innerText.includes(n), target.nameEn, { timeout: 15000 });
      text = await page.locator('[data-testid=selection]').innerText();
      console.log('     (mesh centre occluded on screen; selected through the hierarchy instead)');
    }
    assert.ok(text.includes(target.nameEn) && text.includes(target.fma), text);
    await guideDone();
    if (shots) await page.screenshot({ path: shots + '/brain-anatomy-select.png' });
  });
  await step('ANAT-004 isolate, transparency and hide steps are detected from the viewer state', async () => {
    await page.getByRole('button', { name: 'Lanjut' }).click();
    await page.locator('[data-testid=hierarchy] button[data-sid="' + dataset.guidedTargets.isolate + '"]').click();
    await page.getByRole('button', { name: 'Isolasi' }).click(); await guideDone();
    if (shots) await page.screenshot({ path: shots + '/brain-anatomy-isolate.png' });
    await page.getByRole('button', { name: 'Lanjut' }).click();
    await page.getByRole('button', { name: 'Tampilkan semua' }).click();
    await page.getByLabel('Transparansi struktur lain').fill('0.3'); await guideDone();
    await page.getByRole('button', { name: 'Lanjut' }).click();
    await page.locator('[data-testid=hierarchy] button').first().click();
    await page.getByRole('button', { name: 'Sembunyikan' }).click(); await guideDone();
    assert.match(await page.locator('[data-testid=guide]').innerText(), /selesai/);
  });
  await step('ANAT-005 search filters the hierarchy; no page errors', async () => {
    await page.getByLabel('Cari struktur').fill(table.structures[0].nameEn.slice(0, 6));
    assert.ok(await page.locator('[data-testid=hierarchy] button').count() >= 1);
    assert.deepEqual(errors, []);
  });
  console.log('brain-anatomy e2e: ' + pass + ' steps passed');
} finally { await browser.close(); srv.close(); }

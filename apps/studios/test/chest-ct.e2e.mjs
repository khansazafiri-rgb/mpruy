// Chest CT studio in a real browser (standalone build): HU readout, window presets, nodule finding, a real ruler drag
// across the nodule (length from DICOM-derived spacing), and reader agreement.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { serveStatic } from '../scripts/serve-static.mjs';
const require = createRequire(import.meta.url);
const { chromium } = (() => { for (const id of [process.env.PLAYWRIGHT_MODULE, 'playwright', '/opt/node-tools/node_modules/playwright'].filter(Boolean)) { try { return require(id); } catch { /* next */ } } throw Error('Playwright not found'); })();
const shots = process.argv.includes('--shots') ? process.argv[process.argv.indexOf('--shots') + 1] : null;
const srv = await serveStatic(new URL('../chest-ct/dist', import.meta.url).pathname);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
let pass = 0; const step = async (n, fn) => { await fn(); pass++; console.log('  ok', n); };
const done = () => page.waitForFunction(() => /Terdeteksi/.test(document.querySelector('[data-testid=guide]').innerText), null, { timeout: 30000 });
const next = () => page.getByRole('button', { name: 'Lanjut' }).click();
try {
  await page.goto(srv.url + 'index.html?mode=guided');
  await page.waitForFunction(() => /Siap/.test(document.querySelector('[data-testid=studio-status]')?.textContent || ''), null, { timeout: 180000 });
  const dataset = await page.evaluate(() => fetch('./data/dataset.json').then(r => r.json()));
  console.log('dataset:', dataset.status, dataset.source);
  const box = await page.locator('canvas').boundingBox();
  await step('CT-E2E-001 volume loads; clicking reports Hounsfield units', async () => {
    await page.mouse.click(box.x + box.width * 0.25, box.y + box.height * 0.25);
    assert.match(await page.locator('[data-testid=readout]').innerText(), /-?\d+ HU/); await done(); assert.deepEqual(errors, []);
  });
  await step('CT-E2E-002 the nodule is found: crosshair inside the reader annotations', async () => {
    await next();
    await page.evaluate(mm => window.__medcoelStudio.viewer.setCrosshairMm(mm), dataset.noduleMm);
    await done(); assert.match(await page.locator('[data-testid=readout]').innerText(), /Nodul: \d dari \d anotasi/);
    if (shots) await page.screenshot({ path: shots + '/chest-ct-nodule.png' });
  });
  await step('CT-E2E-003 a real ruler drag across the nodule reports its length in mm', async () => {
    await next();
    await page.getByRole('button', { name: 'Aksial' }).click();
    await page.getByRole('button', { name: 'Penggaris (mm)' }).click();
    const [a, b] = await page.evaluate(mm => { const nv = window.__medcoelStudio.viewer.nv; const p = (dx) => nv.frac2canvasPos(nv.mm2frac([mm[0] + dx, mm[1], mm[2]])); return [p(-8), p(8)]; }, dataset.noduleMm);
    const dpr = await page.evaluate(() => devicePixelRatio);
    await page.mouse.move(box.x + a[0] / dpr, box.y + a[1] / dpr); await page.mouse.down(); await page.mouse.move(box.x + b[0] / dpr, box.y + b[1] / dpr, { steps: 10 }); await page.mouse.up();
    try { await done(); } catch (e) { console.log('READOUT', await page.locator('[data-testid=readout]').innerText(), 'a/b', JSON.stringify([a, b]), 'dpr', dpr); throw e; }
    const len = Number((await page.locator('[data-testid=readout]').innerText()).match(/Ukuran terakhir: ([\d.]+) mm/)[1]);
    assert.ok(Math.abs(len - 16) < 2.5, 'ruler of 16 mm measured as ' + len + ' mm');
    if (shots) await page.screenshot({ path: shots + '/chest-ct-ruler.png' });
  });
  await step('CT-E2E-004 mediastinal window preset', async () => { await next(); await page.getByRole('button', { name: 'Penggaris (mm)' }).click(); await page.getByRole('button', { name: 'Mediastinum' }).click(); await done(); });
  await step('CT-E2E-005 agreement: crosshair on a voxel marked by all annotations with the overlay visible', async () => {
    await next(); await page.getByLabel('Opasitas anotasi nodul').fill('0.7');
    await page.evaluate(mm => window.__medcoelStudio.viewer.setCrosshairMm(mm), dataset.noduleMm);
    await done(); assert.deepEqual(errors, []);
  });
  console.log('chest-ct e2e: ' + pass + ' steps passed');
} finally { await browser.close(); srv.close(); }

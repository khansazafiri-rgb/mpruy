// Guided flows of the generic 2D image engine (chest-xray build) and the generic volume engine (brain-ct build).
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { serveStatic } from '../scripts/serve-static.mjs';
const require = createRequire(import.meta.url);
const { chromium } = (() => { for (const id of [process.env.PLAYWRIGHT_MODULE, 'playwright', '/opt/node-tools/node_modules/playwright'].filter(Boolean)) { try { return require(id); } catch { /* next */ } } throw Error('Playwright not found'); })();
const root = new URL('..', import.meta.url).pathname;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
let pass = 0; const step = async (n, fn) => { await fn(); pass++; console.log('  ok', n); };
const open = async id => { const srv = await serveStatic(root + id + '/dist'); const page = await browser.newPage({ viewport: { width: 1280, height: 860 } }); const errors = []; page.on('pageerror', e => errors.push(e.message)); await page.goto(srv.url + 'index.html?mode=guided'); await page.waitForFunction(() => /Siap/.test(document.querySelector('[data-testid=studio-status]')?.textContent || ''), null, { timeout: 120000 }); return { srv, page, errors }; };
const done = page => page.waitForFunction(() => /Terdeteksi/.test(document.querySelector('[data-testid=guide]').innerText), null, { timeout: 20000 });
const next = page => page.getByRole('button', { name: 'Lanjut' }).click();
try {
  const { srv, page, errors } = await open('chest-xray');
  const ds = await page.evaluate(() => fetch('./data/dataset.json').then(r => r.json()));
  await step('IMG-E2E-001 zoom, contrast, find annotated region (click), measure in mm with calibrated spacing', async () => {
    await page.getByRole('button', { name: 'Zoom +' }).click(); await page.getByRole('button', { name: 'Zoom +' }).click(); await done(page); await next(page);
    await page.getByLabel('Kontras').fill('1.6'); await done(page); await next(page);
    await page.getByRole('button', { name: 'Anotasi' }).click();
    const ann = await page.evaluate(() => fetch('./data/annotations-1.json').then(r => r.json()));
    const poly = ann.regions.find(r => r.id === ds.guidedRegion.id).polygon, c = poly.reduce((a, p) => [a[0] + p[0] / poly.length, a[1] + p[1] / poly.length], [0, 0]);
    const [x, y] = await page.evaluate(p => window.__medcoelStudio.viewer.imageToClient(p), c);
    await page.mouse.click(x, y); await done(page); await next(page);
    await page.getByRole('button', { name: 'Penggaris' }).click();
    const [a, b] = await page.evaluate(() => [window.__medcoelStudio.viewer.imageToClient([100, 100]), window.__medcoelStudio.viewer.imageToClient([200, 100])]);
    await page.mouse.click(...a); await page.mouse.click(...b); await done(page);
    const v = Number((await page.locator('[data-testid=readout]').innerText()).match(/Ukuran: ([\d.]+) mm/)[1]);
    assert.ok(Math.abs(v - 100 * ds.images[0].pixelSpacingMm[0]) < 0.6, 'measured ' + v);
    assert.deepEqual(errors, []);
  });
  srv.close();
  const ct = await open('brain-ct');
  await step('VOL-E2E-001 generic volume guided: orient, plane, window preset, find overlay, ruler', async () => {
    const box = await ct.page.locator('canvas').boundingBox();
    await ct.page.mouse.click(box.x + box.width * 0.25, box.y + box.height * 0.25); await done(ct.page); await next(ct.page);
    await ct.page.getByRole('button', { name: 'Sagital' }).click(); await done(ct.page); await next(ct.page);
    await ct.page.getByRole('button', { name: 'mediastinum' }).click(); await done(ct.page); await next(ct.page);
    const nod = (await ct.page.evaluate(() => fetch('./data/dataset.json').then(r => r.json()))).noduleMm;
    await ct.page.getByRole('button', { name: 'MPR' }).click();
    await ct.page.evaluate(mm => window.__medcoelStudio.viewer.setCrosshairMm(mm), nod); await done(ct.page); await next(ct.page);
    await ct.page.getByRole('button', { name: 'Aksial' }).click(); await ct.page.getByRole('button', { name: 'Penggaris (mm)' }).click();
    const [p, q] = await ct.page.evaluate(mm => { const nv = window.__medcoelStudio.viewer.nv; const f = d => nv.frac2canvasPos(nv.mm2frac([mm[0] + d, mm[1], mm[2]])); return [f(-9), f(9)]; }, nod);
    await ct.page.mouse.move(box.x + p[0], box.y + p[1]); await ct.page.mouse.down(); await ct.page.mouse.move(box.x + q[0], box.y + q[1], { steps: 8 }); await ct.page.mouse.up();
    await done(ct.page);
    const len = Number((await ct.page.locator('[data-testid=readout]').innerText()).match(/Ukuran terakhir: ([\d.]+) mm/)[1]);
    assert.ok(Math.abs(len - 18) < 3, 'ruler 18 mm measured ' + len);
    assert.deepEqual(ct.errors, []);
  });
  ct.srv.close();
  console.log('engines guided e2e: ' + pass + ' steps passed');
} finally { await browser.close(); }

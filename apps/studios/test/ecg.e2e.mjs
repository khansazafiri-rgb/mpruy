// ECG studio in a real browser (standalone build). Guided steps are completed through the UI against detected R peaks.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { serveStatic } from '../scripts/serve-static.mjs';
const require = createRequire(import.meta.url);
const { chromium } = (() => { for (const id of [process.env.PLAYWRIGHT_MODULE, 'playwright', '/opt/node-tools/node_modules/playwright'].filter(Boolean)) { try { return require(id); } catch { /* next */ } } throw Error('Playwright not found'); })();
const shots = process.argv.includes('--shots') ? process.argv[process.argv.indexOf('--shots') + 1] : null;
const srv = await serveStatic(new URL('../ecg/dist', import.meta.url).pathname);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
let pass = 0; const step = async (n, fn) => { await fn(); pass++; console.log('  ok', n); };
const done = () => page.waitForFunction(() => /Terdeteksi/.test(document.querySelector('[data-testid=guide]').innerText), null, { timeout: 15000 });
const next = () => page.getByRole('button', { name: 'Lanjut' }).click();
const canvasY = async () => { const b = await page.locator('canvas').boundingBox(); return b.y + b.height / 2; };
try {
  await page.goto(srv.url + 'index.html?mode=guided');
  await page.waitForFunction(() => /Siap/.test(document.querySelector('[data-testid=studio-status]')?.textContent || ''), null, { timeout: 60000 });
  const dataset = await page.evaluate(() => fetch('./data/dataset.json').then(r => r.json()));
  console.log('dataset:', dataset.status, dataset.source);
  if (shots) await page.screenshot({ path: shots + '/ecg-12lead.png' });
  await step('ECG-E2E-001 12-lead overview renders the real record with automatic rate readout', async () => {
    assert.deepEqual(errors, []); assert.match(await page.locator('[data-testid=readout]').innerText(), /Laju .* bpm/);
  });
  await step('ECG-E2E-002 calibration step: single lead II view', async () => { await page.getByRole('button', { name: 'Satu sadapan' }).click(); await done(); });
  await step('ECG-E2E-003 R-R measured with calipers on two consecutive detected R peaks; rate shown', async () => {
    await next();
    const p = await page.evaluate(() => window.__medcoelStudio.viewer.peaks('II'));
    const y = await canvasY();
    for (const s of [p[1], p[2]]) await page.mouse.click(await page.evaluate(x => window.__medcoelStudio.viewer.sampleToClientX(x), s), y);
    await done();
    const text = await page.locator('[data-testid=readout]').innerText();
    const ms = Number(text.match(/Kaliper: (\d+) ms/)[1]);
    assert.ok(Math.abs(ms - (p[2] - p[1]) * 2) <= 6, text);
  });
  await step('ECG-E2E-004 time navigation and zoom', async () => {
    await next();
    await page.getByRole('button', { name: 'Zoom +' }).click(); await page.getByRole('button', { name: 'Zoom +' }).click();
    await page.getByRole('button', { name: '1 s ▶' }).click(); await done();
  });
  await step('ECG-E2E-005 QRS duration measured around a detected V1 complex', async () => {
    await next();
    await page.getByLabel('Sadapan').selectOption('V1');
    const st = await page.evaluate(() => window.__medcoelStudio.viewer.state());
    const peaks = await page.evaluate(() => window.__medcoelStudio.viewer.peaks('V1'));
    const visible = peaks.find(q => q / 500 > st.offsetS + 0.2 && q / 500 < st.offsetS + 1.5);
    const y = await canvasY();
    for (const s of [visible - 25, visible + 25]) await page.mouse.click(await page.evaluate(x => window.__medcoelStudio.viewer.sampleToClientX(x), s), y);
    await done();
    if (shots) await page.screenshot({ path: shots + '/ecg-calipers.png' });
  });
  await step('ECG-E2E-006 regularity judged against the measured R-R spread', async () => {
    await next();
    const hr = await page.evaluate(() => window.__medcoelStudio.viewer.state().hr);
    await page.getByRole('button', { name: hr.rrSdMs < 80 ? 'teratur' : 'tidak teratur', exact: true }).click(); await done();
    assert.deepEqual(errors, []);
  });
  console.log('ecg e2e: ' + pass + ' steps passed');
} finally { await browser.close(); srv.close(); }

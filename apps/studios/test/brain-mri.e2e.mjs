// Brain MRI studio in a real browser (standalone build, software WebGL). Explore + Guided against live viewer state.
//   node test/brain-mri.e2e.mjs [--shots dir]
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import { parseNifti, voxelToWorld } from '../engines/volume/nifti.js';
import { gunzipSync } from 'node:zlib';
const require = createRequire(import.meta.url);
const { chromium } = (() => { for (const id of [process.env.PLAYWRIGHT_MODULE, 'playwright', '/opt/node-tools/node_modules/playwright'].filter(Boolean)) { try { return require(id); } catch { /* next */ } } throw Error('Playwright not found'); })();
import { serveStatic } from '../scripts/serve-static.mjs';
const shots = process.argv.includes('--shots') ? process.argv[process.argv.indexOf('--shots') + 1] : null;
const srv = await serveStatic(new URL('../brain-mri/dist', import.meta.url).pathname);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
const errors = []; page.on('pageerror', e => errors.push(e.message));
let pass = 0; const step = async (n, fn) => { await fn(); pass++; console.log('  ok', n); };
try {
  await page.goto(srv.url + 'index.html?mode=guided');
  await page.waitForSelector('[data-testid=readout]', { timeout: 60000 });
  await page.waitForFunction(() => /Siap|siap/.test(document.querySelector('[data-testid=studio-status]')?.textContent || ''), null, { timeout: 90000 });
  const dataset = await page.evaluate(() => fetch('./data/dataset.json').then(r => r.json()));
  console.log('dataset:', dataset.status, dataset.source);
  const box = await page.locator('canvas').boundingBox();
  // MPR layout: axial tile occupies one quadrant; click on the screen-left part of the canvas (neurological convention).
  await step('MRI-001 volume and validated overlay load (no page errors)', async () => { assert.deepEqual(errors, []); });
  if (shots) await page.screenshot({ path: shots + '/brain-mri-mpr.png' });
  await step('MRI-002 guided step 1 completes only after clicking the patient-left hemisphere', async () => {
    assert.match(await page.locator('[data-testid=guide]').innerText(), /Coba sekarang/);
    for (const fx of [0.62, 0.45, 0.3, 0.2, 0.12]) {
      await page.mouse.click(box.x + box.width * fx * 0.5, box.y + box.height * 0.25);
      if (/Terdeteksi/.test(await page.locator('[data-testid=guide]').innerText())) break;
    }
    assert.match(await page.locator('[data-testid=guide]').innerText(), /Terdeteksi/);
    const mm = await page.locator('[data-testid=readout]').innerText();
    assert.ok(Number(mm.match(/RAS \(mm\): ([-\d.]+)/)[1]) < dataset.midlineXmm, mm);
  });
  await step('MRI-003 plane change is detected from the viewer state', async () => {
    await page.getByRole('button', { name: 'Lanjut' }).click();
    await page.getByRole('button', { name: 'Sagital' }).click();
    await page.waitForFunction(() => /Terdeteksi/.test(document.querySelector('[data-testid=guide]').innerText));
  });
  await step('MRI-004 crosshair synchronisation: clicks in MPR move the shared 3D point', async () => {
    await page.getByRole('button', { name: 'Lanjut' }).click();
    await page.getByRole('button', { name: 'MPR' }).click();
    const before = await page.locator('[data-testid=readout]').innerText();
    await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.7);
    await page.mouse.click(box.x + box.width * 0.2, box.y + box.height * 0.3);
    await page.waitForFunction(() => /Terdeteksi/.test(document.querySelector('[data-testid=guide]').innerText));
    assert.notEqual(await page.locator('[data-testid=readout]').innerText(), before);
  });
  await step('MRI-005 structure identification: crosshair placed in the target label (via viewer API) is recognised by name', async () => {
    await page.getByRole('button', { name: 'Lanjut' }).click();
    const target = await page.evaluate(() => fetch('./data/labels.json').then(r => r.json()));
    const name = target.structures.find(s => s.id === dataset.guidedTarget).nameEn;
    // Interior voxel of the target computed independently in Node from the delivered label volume, then placed through the viewer API.
    const vol = parseNifti(gunzipSync(fs.readFileSync(new URL('../brain-mri/dist/' + dataset.labels, import.meta.url))));
    const [X, Y] = vol.dims; let sum = [0, 0, 0], n = 0;
    vol.data.forEach((v, idx) => { if (v === dataset.guidedTarget) { sum[0] += idx % X; sum[1] += Math.floor(idx / X) % Y; sum[2] += Math.floor(idx / (X * Y)); n++; } });
    const c = sum.map(v => Math.round(v / n));
    let best = null, bd = Infinity;
    vol.data.forEach((v, idx) => { if (v !== dataset.guidedTarget) return; const p = [idx % X, Math.floor(idx / X) % Y, Math.floor(idx / (X * Y))]; const d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2; if (d < bd) { bd = d; best = p; } });
    const mm = voxelToWorld(vol.affine, best);
    await page.evaluate(m => window.__medcoelStudio.viewer.setCrosshairMm(m), mm);
    await page.waitForFunction(n2 => document.querySelector('[data-testid=readout]').innerText.includes(n2), name);
    await page.waitForFunction(() => /Terdeteksi/.test(document.querySelector('[data-testid=guide]').innerText));
    if (shots) await page.screenshot({ path: shots + '/brain-mri-structure.png' });
  });
  await step('MRI-006 reset and zoom do not throw; no page errors overall', async () => {
    await page.getByRole('button', { name: 'Zoom +' }).click(); await page.getByRole('button', { name: 'Reset' }).click();
    assert.deepEqual(errors, []);
  });
  console.log('brain-mri e2e: ' + pass + ' steps passed');
} finally { await browser.close(); srv.close(); }

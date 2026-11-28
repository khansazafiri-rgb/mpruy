import assert from 'node:assert/strict';
import { resolve, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { createSourceServer } from './serve-source-qc.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(process.argv[2] ?? '');
if (!process.argv[2] || !process.env.PLAYWRIGHT_MODULE) throw Error('Require conversion-output-directory and PLAYWRIGHT_MODULE');
const playwright = await import(pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE, 'index.mjs')).href);
const receiptOut = resolve(out, 'actual-browser-render-receipt.json');
const { server } = await createSourceServer({ voxelDir: resolve(out, 'voxelman/glb'), openearDir: resolve(out, 'openear'), threeDir: resolve(here, '../../apps/atlas-independent/node_modules/three'), receiptOut });
await new Promise((done, fail) => { server.once('error', fail); server.listen(0, '127.0.0.1', done); });
let browser;
try {
  const origin = `http://127.0.0.1:${server.address().port}`;
  browser = await playwright.chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  await page.route('**/*', (route) => route.request().url().startsWith(origin + '/') ? route.continue() : route.abort());
  await page.goto(origin, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__sourceQC?.complete, { timeout: 5 * 60 * 1000 });
  const result = await page.evaluate(() => window.__sourceQC);
  assert.equal(result.renderedPass, 36, JSON.stringify(result.rows.filter((r) => !r.renderVerified)));
  assert.equal(result.renderedFail, 0);
  assert.equal(result.resourceDisposalPass, 36);
  assert.equal(result.passed, true);
  assert.equal(result.rows.reduce((n, r) => n + r.views.length, 0), 108);
  assert.deepEqual(errors, []);
  await page.waitForFunction(() => window.__sourceQC?.receiptSaved, { timeout: 10000 });
  const saved = JSON.parse(await readFile(receiptOut, 'utf8'));
  assert.equal(saved.renderedPass, 36);
  console.log('ACTUAL SOURCE WEBGL RECEIPT ' + JSON.stringify(saved));
} finally {
  await browser?.close();
  await new Promise((done) => server.close(done));
}

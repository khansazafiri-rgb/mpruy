// Optional Chromium visual regression for the NEW independent pilot viewer.
// Run only on a locally-built 4D Lab: npm run test:e2e:independent-atlas --prefix apps/4d-lab
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { startServer } from './server.mjs';

const require = createRequire(import.meta.url);
let chromium;
for (const name of [process.env.PLAYWRIGHT_MODULE, 'playwright', '/opt/node-tools/node_modules/playwright'].filter(Boolean)) {
  try { chromium = require(name).chromium; break; } catch { /* try next */ }
}
if (!chromium) throw new Error('Playwright not installed; use PLAYWRIGHT_MODULE or install Playwright locally.');
const { srv, url } = await startServer();
const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const ctx = await browser.newContext({ viewport: { width: 1280, height: 820 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [], requests = [];
page.on('pageerror', e => errors.push(e.message));
page.on('request', request => requests.push(request.url()));
try {
  await page.goto(url + 'atlas-preview/', { timeout: 90000 });
  await page.waitForFunction(() => window.__independentAtlasPilot?.structureCount > 0, null, { timeout: 90000 });
  assert.equal(await page.getByTestId('pilot-system').inputValue(), 'skeletal');
  assert.ok(await page.evaluate(() => window.__independentAtlasPilot.structureCount) > 0);
  await page.getByTestId('pilot-search').fill('Sternum');
  await page.getByTestId('pilot-results').getByRole('button', { name: /Sternum/i }).first().click();
  assert.match(await page.getByTestId('pilot-details').textContent(), /Sternum/);
  await page.getByTestId('pilot-isolate').click();
  assert.equal(await page.getByTestId('pilot-isolate').isDisabled(), true);
  await page.getByTestId('pilot-clear').click();
  await page.getByTestId('pilot-toggle-muscular').check();
  await page.waitForFunction(() => window.__independentAtlasPilot?.loadedModels === 2, null, { timeout: 90000 });
  assert.deepEqual(await page.evaluate(() => window.__independentAtlasPilot.enabled), ['skeletal', 'muscular']);
  await page.getByTestId('pilot-search').fill('Sternum');
  await page.getByTestId('pilot-results').getByRole('button', { name: /Sternum/i }).first().click();
  await page.getByTestId('pilot-hide').click();
  assert.equal(await page.evaluate(() => window.__independentAtlasPilot.hiddenCount), 1);
  await page.getByTestId('pilot-undo').click();
  assert.equal(await page.evaluate(() => window.__independentAtlasPilot.hiddenCount), 0);
  await page.getByTestId('pilot-opacity').fill('50');
  await page.getByTestId('pilot-region').selectOption('thorax');
  assert.equal(await page.evaluate(() => window.__independentAtlasPilot.region), 'thorax');
  await page.getByTestId('pilot-back').click();
  await page.getByTestId('pilot-side').click();
  await page.getByTestId('pilot-top').click();
  await page.getByTestId('pilot-zoom-in').click();
  await page.getByTestId('pilot-zoom-out').click();
  await page.getByTestId('pilot-share').click();
  const sharedUrl = await page.locator('#shareUrl').inputValue();
  assert.match(sharedUrl, /view=/);
  await page.goto(sharedUrl);
  await page.waitForFunction(() => window.__independentAtlasPilot?.loadedModels === 2, null, { timeout: 90000 });
  assert.equal(await page.evaluate(() => window.__independentAtlasPilot.region), 'thorax');
  await page.getByTestId('pilot-system').selectOption('visceral');
  await page.waitForFunction(() => window.__independentAtlasPilot?.system === 'visceral' && window.__independentAtlasPilot?.loadedModels === 1 && window.__independentAtlasPilot?.structureCount > 0, null, { timeout: 90000 });
  await page.getByTestId('pilot-front').click();
  await page.getByTestId('pilot-fit').click();
  // Regression: switching away from an isolated system must leave the newly
  // selected system visible. This previously retained a stale isolated key.
  await page.getByTestId('pilot-search').fill('Sternum');
  await page.getByTestId('pilot-results').getByRole('button', { name: /Sternum/i }).first().click();
  await page.getByTestId('pilot-isolate').click();
  await page.getByTestId('pilot-system').selectOption('visceral');
  await page.waitForFunction(() => window.__independentAtlasPilot?.system === 'visceral' &&
    window.__independentAtlasPilot?.loadedModels === 1 &&
    window.__independentAtlasPilot?.structureCount > 0, null, { timeout: 90000 });
  assert.ok(!/Tidak ada struktur terlihat/.test(await page.getByTestId('pilot-status').textContent()),
    'exclusive system switch must show visible models after prior isolation');
  // Regression: search for a hidden object should bring it back into view.
  await page.getByTestId('pilot-system').selectOption('skeletal');
  await page.waitForFunction(() => window.__independentAtlasPilot?.system === 'skeletal' &&
    window.__independentAtlasPilot?.loadedModels === 1, null, { timeout: 90000 });
  await page.getByTestId('pilot-search').fill('Sternum');
  await page.getByTestId('pilot-results').getByRole('button', { name: /Sternum/i }).first().click();
  await page.getByTestId('pilot-hide').click();
  assert.equal(await page.evaluate(() => window.__independentAtlasPilot.hiddenCount), 1);
  await page.getByTestId('pilot-results').getByRole('button', { name: /Sternum/i }).first().click();
  assert.equal(await page.evaluate(() => window.__independentAtlasPilot.hiddenCount), 0,
    'search should reveal previously hidden structure');
  assert.equal(await page.locator('meta[name=robots]').getAttribute('content'), 'noindex,nofollow');
  assert.equal(requests.some(x => x.includes('/anatomy/viewer/')), false, 'No requests to legacy NC Atlas Viewer');
  assert.equal(requests.some(x => /models\/nervous\.glb/i.test(x)), false, 'No quarantined nervous mesh');
  assert.equal(requests.some(x => x.includes('/atlas-assets/models/visceral.glb')), true, 'Uses only Lab asset pack');
  assert.deepEqual(errors, []);
  console.log('PASS independent Atlas viewer pilot: multi-system, search, isolate, hide/undo, opacity, region, camera presets, network isolation');
} finally {
  await browser.close();
  srv.close();
}

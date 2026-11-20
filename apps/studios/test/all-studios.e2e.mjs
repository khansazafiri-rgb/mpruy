// Smoke test of EVERY independently built studio (whatever data its build contains): Explore and Guided load in a real
// browser without page errors, the data-status notice is shown, and the studio declares itself ready.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { serveStatic } from '../scripts/serve-static.mjs';
const require = createRequire(import.meta.url);
const { chromium } = (() => { for (const id of [process.env.PLAYWRIGHT_MODULE, 'playwright', '/opt/node-tools/node_modules/playwright'].filter(Boolean)) { try { return require(id); } catch { /* next */ } } throw Error('Playwright not found'); })();
const shots = process.argv.includes('--shots') ? process.argv[process.argv.indexOf('--shots') + 1] : null;
const root = new URL('..', import.meta.url).pathname;
const ids = fs.readdirSync(root).filter(d => fs.existsSync(root + d + '/studio.config.json')).sort();
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const results = [];
for (const id of ids) {
  const srv = await serveStatic(root + id + '/dist');
  const row = { id };
  try {
    for (const mode of ['explore', 'guided']) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      await page.goto(srv.url + 'index.html?mode=' + mode);
      await page.waitForFunction(() => /Siap/.test(document.querySelector('[data-testid=studio-status]')?.textContent || ''), null, { timeout: 240000 });
      const ds = await page.evaluate(() => fetch('./data/dataset.json').then(r => r.json()));
      row.data = ds.status;
      assert.ok(await page.locator('.studio-notice').innerText());
      if (mode === 'guided') assert.equal(await page.locator('[data-testid=guide]').count(), 1);
      assert.deepEqual(errors, [], id + ' ' + mode);
      if (shots && mode === 'explore') await page.screenshot({ path: shots + '/' + id + '.png' });
      await page.close();
      row[mode] = 'ok';
    }
  } catch (e) { row.error = String(e.message).split('\n')[0].slice(0, 120); }
  finally { srv.close(); }
  results.push(row); console.log(JSON.stringify(row));
}
await browser.close();
const failed = results.filter(r => r.error);
console.log('all studios smoke: ' + (results.length - failed.length) + '/' + results.length + ' passed');
process.exit(failed.length ? 1 : 0);

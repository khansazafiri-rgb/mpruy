// Integration check: the MEDCOEL web app page /anatomy/live frames the 4D Lab served at /anatomy/4d-lab/.
// Needs: npm run build --prefix apps/4d-lab and the web preview build:
//   (cd apps/web && npx vite build --config vite.anatomy-preview.config.js)
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const repo = fileURLToPath(new URL('../../../../', import.meta.url));
const require = createRequire(import.meta.url);
const { chromium } = (() => { for (const id of [process.env.PLAYWRIGHT_MODULE, 'playwright', '/opt/node-tools/node_modules/playwright'].filter(Boolean)) { try { return require(id); } catch { /* next */ } } throw Error('Playwright not found'); })();
const { apiFixture } = await import(path.join(repo, 'preview/fixtures.mjs'));
const MAIN = path.join(repo, 'apps/web/dist-anatomy-preview'), LAB = path.join(repo, 'apps/4d-lab/dist');
// the Anatomy Atlas files the lab shares (production: the existing /anatomy/viewer/ deployment)
const ATLAS = path.join(repo, 'apps/anatomy/public');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.glb': 'model/gltf-binary', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const srv = createServer(async (req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const send = (s, b, t = 'text/plain') => { res.writeHead(s, { 'content-type': t }); res.end(b); };
  if (p.startsWith('/api/')) { const f = apiFixture(p); return f ? send(200, JSON.stringify(f), 'application/json') : send(404, '{}', 'application/json'); }
  const lab = p.startsWith('/anatomy/4d-lab/'), atlas = p.startsWith('/anatomy/viewer/');
  res.setHeader('X-Frame-Options', lab ? 'SAMEORIGIN' : 'DENY');
  if (atlas) { try { return send(200, await readFile(path.join(ATLAS, p.slice('/anatomy/viewer/'.length))), TYPES[path.extname(p)] || 'application/octet-stream'); } catch { return send(404, 'not found'); } }
  const root = lab ? LAB : MAIN, rel = lab ? p.slice('/anatomy/4d-lab/'.length) : p.slice(1);
  let file = path.join(root, rel || 'index.html');
  try { if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html'); return send(200, await readFile(file), TYPES[path.extname(file)] || 'application/octet-stream'); }
  catch { if (lab || path.extname(p)) return send(404, 'not found'); return send(200, await readFile(path.join(MAIN, 'index.html')), 'text/html'); }
});
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${srv.address().port}`;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
try {
  await page.goto(base + '/anatomy');
  await page.getByRole('link', { name: 'Live 4D Lab', exact: true }).first().click();
  await page.waitForURL('**/anatomy/live');
  const frame = page.frameLocator('iframe[title="MEDCOEL Anatomy Live 4D Lab"]');
  await frame.locator('body[data-ready="1"]').waitFor({ timeout: 90000 });
  assert.match(await frame.locator('#loadStatus').textContent(), /mesh terregistrasi/);
  await frame.locator('body[data-atlas="ready"]').waitFor({ timeout: 180000 }); // shared atlas models loaded from /anatomy/viewer/
  if (process.argv.includes('--shot')) await page.screenshot({ path: fileURLToPath(new URL('../../evidence/11-medcoel-anatomy-live.jpg', import.meta.url)), type: 'jpeg', quality: 82 });
  assert.deepEqual(errors, []);
  console.log('ok   /anatomy/live frames /anatomy/4d-lab/ and the lab starts inside the MEDCOEL web app');
} catch (e) { console.log('FAIL integration: ' + e.message); process.exitCode = 1; }
finally { await browser.close(); srv.close(); }

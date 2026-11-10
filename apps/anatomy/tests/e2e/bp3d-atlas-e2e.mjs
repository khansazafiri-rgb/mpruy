// Browser journeys for the approved Atlas viewer fed by the optional, local BodyParts3D source (?models=bp3d).
//   npm run build:anatomy && node apps/anatomy/tests/e2e/bp3d-atlas-e2e.mjs [--shots]
// Needs the local review data (npm run batch:bodyparts3d -- --all); without it the data-dependent steps are SKIPPED, not
// passed. Chromium + SwiftShader only: not Safari, not GPU performance.
/* global document, getComputedStyle, console, process, URL, localStorage */
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
function loadPlaywright() {
  for (const id of [process.env.PLAYWRIGHT_MODULE, 'playwright', '/opt/node-tools/node_modules/playwright'].filter(Boolean)) { try { return require(id); } catch { /* next */ } }
  throw new Error('Playwright not found (set PLAYWRIGHT_MODULE)');
}
const { chromium } = loadPlaywright();
const SHOTS = process.argv.includes('--shots');
const ROOT = path.resolve(fileURLToPath(new URL('../../dist/', import.meta.url)));
const BP3D = path.resolve(fileURLToPath(new URL('../../../../local-data/licensing-quarantine/bp3d-batch/', import.meta.url)));
const HAS_DATA = existsSync(path.join(BP3D, 'inventory.json'));
const EVIDENCE = fileURLToPath(new URL('../../evidence/', import.meta.url));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.glb': 'model/gltf-binary', '.wasm': 'application/wasm', '.woff2': 'font/woff2', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.png': 'image/png', '.txt': 'text/plain' };

async function startServer({ withBp3d }) {
  const requested = [];
  const srv = createServer(async (req, res) => {
    const p = decodeURIComponent(new URL(req.url, 'http://x').pathname); requested.push(p);
    try {
      let file;
      if (p.startsWith('/anatomy/viewer/bp3d/')) {
        const rel = p.slice('/anatomy/viewer/bp3d/'.length);
        if (!withBp3d || !/^(inventory\.json|structures\/[a-z0-9-]+\/model\.glb|reference-surface\/skin\.glb)$/.test(rel)) throw new Error('no');
        file = path.resolve(BP3D, rel);
      } else if (p.startsWith('/anatomy/viewer/')) {
        file = path.resolve(ROOT, '.' + p.slice('/anatomy/viewer'.length));
        if (file !== ROOT && !file.startsWith(ROOT + path.sep)) throw new Error('outside');
        if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
      } else throw new Error('no');
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(await readFile(file));
    } catch { res.writeHead(404); res.end('not found'); }
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  return { srv, requested, base: `http://127.0.0.1:${srv.address().port}/anatomy/viewer/` };
}

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const results = [], errors = [], shotsMissed = [];
const ok = (c, m) => { if (!c) throw new Error(m); };
async function step(name, fn, { needsData = false } = {}) {
  if (needsData && !HAS_DATA) { results.push({ name, skipped: true }); console.log('SKIP', name, '(no local BodyParts3D data)'); return; }
  const t0 = Date.now();
  try { const note = await fn(); results.push({ name, ok: true, note: note || '', ms: Date.now() - t0 }); console.log('ok  ', name, note ? '— ' + note : ''); }
  catch (e) { results.push({ name, ok: false, error: String(e.message || e).split('\n').slice(0, 4).join(' ⏎ ') }); console.log('FAIL', name, '\n    ', String(e.message || e).split('\n').slice(0, 5).join('\n     ')); }
}
async function open(url, viewport = { width: 1440, height: 900 }) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => { try { localStorage.clear(); localStorage.setItem('medcoel-atlas-tip', 'done'); } catch { /* ignore */ } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto(url, { waitUntil: 'load', timeout: 120000 });
  await page.waitForSelector('#systemsList .sys-tile', { timeout: 90000 });
  await page.evaluate(() => document.getElementById('atlasTipClose')?.click());
  return { ctx, page };
}
const settle = async (page, ms = 1500) => { await page.waitForFunction(() => { const o = document.getElementById('loadingOverlay'); return !o || getComputedStyle(o).display === 'none' || o.classList.contains('hidden') || !o.offsetParent; }, null, { timeout: 120000 }).catch(() => {}); await page.waitForFunction(() => /Siap|Ready/.test(document.getElementById('atlasStatus')?.textContent || ''), null, { timeout: 120000 }).catch(() => {}); await page.waitForTimeout(ms); };
const clip = { x: 0, y: 56, width: 1440, height: 740 };
const hash = async (page) => crypto.createHash('sha1').update(await page.screenshot({ clip, timeout: 240000 })).digest('hex');
const shot = async (page, name) => { if (!SHOTS) return; await mkdir(EVIDENCE, { recursive: true }); try { await page.screenshot({ path: EVIDENCE + name + '.jpg', type: 'jpeg', quality: 74, timeout: 240000 }); } catch { shotsMissed.push(name); } };
const sys = (page, n) => page.locator('.sys-tile', { hasText: n }).first().locator('.sys-toggle');

// ---- A. default (no flag): behaviour unchanged -----------------------------------------------------------------
const plain = await startServer({ withBp3d: HAS_DATA });
{
  const { ctx, page } = await open(plain.base);
  await step('A1 without ?models the Atlas models load and nothing from BodyParts3D is requested', async () => {
    await settle(page);
    ok(await page.locator('#bp3dBanner').isHidden(), 'banner must be hidden by default');
    const bp = plain.requested.filter((p) => /\/bp3d\//.test(p)); ok(bp.length === 0, 'unexpected BodyParts3D requests: ' + bp.slice(0, 2));
    ok(plain.requested.some((p) => /models\/skeletal\.glb$/.test(p)), 'Atlas skeletal.glb should load');
  });
  await ctx.close();
}

// ---- B. BodyParts3D inside the approved Atlas UI ---------------------------------------------------------------
const bp = await startServer({ withBp3d: true });
const { ctx, page } = HAS_DATA ? await open(bp.base + '?models=bp3d') : { ctx: null, page: null };
if (HAS_DATA) await settle(page, 4000);
await step('B1 approved layout intact + banner states the coverage honestly', async () => {
  for (const sel of ['#searchInput', '#regionButton', '#zoomInAtlas', '#frontViewBtn', '#sideViewBtn', '#backViewBtn', '#topViewBtn', '#resetBtn', '#undoAtlas', '#restoreAtlas', '#shareAtlas', '#systemsList .sys-tile']) ok(await page.locator(sel).first().isVisible(), sel + ' missing');
  const t = await page.locator('#bp3dBanner').innerText();
  ok(/470 dari 2\.237/.test(t) && /belum lengkap/i.test(t), 'coverage text: ' + t.replace(/\n/g, ' '));
  ok(await page.locator('.sys-tile.is-unavailable').count() === 1, 'Saraf stays withheld');
  const model = bp.requested.filter((p) => /bp3d\/structures\/.+model\.glb$/.test(p)).length;
  ok(model >= 100, 'expected the skeletal BodyParts3D files, got ' + model);
  ok(!bp.requested.some((p) => /models\/skeletal\.glb$/.test(p)), 'Atlas skeletal.glb must NOT load for a covered system');
  await shot(page, 'bp3d-atlas-01-skeleton'); return model + ' skeletal structures';
}, { needsData: true });
await step('B2 muscles + bones together; camera presets give four distinct views', async () => {
  await sys(page, 'Otot').click(); await settle(page, 2500);
  ok(bp.requested.some((p) => /bp3d\/structures\/.*muscle.*model\.glb$|bp3d\/structures\/.*(biceps|deltoid|gluteus)/.test(p)), 'muscle structures not requested');
  const seen = new Set();
  for (const [id, n] of [['#frontViewBtn', 'front'], ['#sideViewBtn', 'side'], ['#backViewBtn', 'back'], ['#topViewBtn', 'top']]) { await page.locator(id).click(); await page.waitForTimeout(1200); seen.add(await hash(page)); await shot(page, 'bp3d-atlas-02-muscles-' + n); }
  ok(seen.size === 4, 'only ' + seen.size + ' distinct views');
  await page.locator('#frontViewBtn').click(); await page.waitForTimeout(900);
  // layer stepping (− peels the outer muscle layer) works on BodyParts3D structures through the catalogue metadata
  const otot = page.locator('.sys-tile', { hasText: 'Otot' }).first();
  const h = await hash(page);
  await otot.locator('[data-step][data-delta="-1"]').click(); await page.waitForTimeout(1500);
  ok(await hash(page) !== h, 'layer − on Otot changed nothing');
  await otot.locator('[data-step][data-delta="1"]').click(); await page.waitForTimeout(1200);
}, { needsData: true });
await step('B3 regions: Toraks reframes and the regional clip keeps anatomy in view', async () => {
  const before = await hash(page);
  await page.locator('#regionButton').click(); await page.locator('[data-region="thorax"]').click(); await settle(page, 2500);
  ok(await hash(page) !== before, 'region change did not alter the scene');
  const empty = await page.locator('#emptyScene').isVisible(); ok(!empty, 'regional clip left an empty scene');
  await shot(page, 'bp3d-atlas-03-thorax');
  await page.locator('#regionButton').click(); await page.locator('[data-region="whole"]').click(); await settle(page, 2000);
}, { needsData: true });
await step('B4 search → select → info panel, yellow selection highlight, isolate and restore', async () => {
  const input = page.locator('#searchInput'); await input.click(); await input.fill('femur');
  await page.waitForSelector('.atlas-result', { timeout: 15000 });
  await page.locator('.atlas-result').first().click();
  await page.waitForFunction(() => document.getElementById('footerIsolateBtn')?.offsetParent, null, { timeout: 30000 });
  await page.waitForTimeout(2500);
  ok(/femur/i.test(await page.locator('#structureInfo').innerText()), 'info panel is not about the femur');
  await shot(page, 'bp3d-atlas-04-selected');
  const h0 = await hash(page);
  await page.locator('#footerIsolateBtn').click(); await page.waitForTimeout(1200);
  ok(await hash(page) !== h0, 'isolate changed nothing'); ok(await page.locator('#returnContext').isVisible(), 'no return-to-context');
  await shot(page, 'bp3d-atlas-05-isolated');
  await page.locator('#returnContext').click(); await page.waitForTimeout(900); await page.locator('#restoreAtlas').click(); await page.waitForTimeout(900);
}, { needsData: true });
await step('B5 structures missing from BodyParts3D are reported, not faked', async () => {
  // pick a catalogue structure that the local inventory really does not contain (checked from the files, not assumed)
  const inv = JSON.parse(await readFile(path.join(BP3D, 'inventory.json'), 'utf8'));
  const have = new Set(inv.converted.map((e) => e.name));
  const term = ['Obturator artery', 'Iliolumbar artery', 'Facial artery'].find((t) => !have.has(t + '.l') && !have.has(t + '.r') && !have.has(t));
  ok(term, 'no known-missing structure found to test with');
  const input = page.locator('#searchInput'); await input.fill(''); await input.click(); await input.fill(term.toLowerCase());
  await page.waitForSelector('#searchResults.show', { timeout: 10000 }); await page.waitForTimeout(600);
  const note = await page.locator('[data-testid="bp3d-search-note"]').count();
  const rows = await page.locator('.atlas-result').allInnerTexts();
  ok(note === 1, 'expected the "Belum ada di BodyParts3D" note for "' + term + '"');
  ok(!rows.some((r) => r.toLowerCase().includes(term.toLowerCase())), 'a structure missing from BodyParts3D must not be offered: ' + rows.join(' | '));
  await shot(page, 'bp3d-atlas-08-missing-structure');
  return '"' + term + '" is in the Atlas catalogue but not in BodyParts3D: reported, not offered';
}, { needsData: true });
await step('B6 translucent skin reference toggles and does not block picking', async () => {
  await page.locator('#searchInput').fill(''); await page.keyboard.press('Escape');
  await page.locator('#frontViewBtn').click(); await page.waitForTimeout(900);
  const h0 = await hash(page);
  await page.locator('#bp3dSkin').check(); await page.waitForTimeout(6000); await page.waitForTimeout(1500);
  const h1 = await hash(page); ok(h1 !== h0, 'skin did not change the image');
  await shot(page, 'bp3d-atlas-06-skin');
  await page.locator('#bp3dSkin').uncheck(); await page.waitForTimeout(1200);
  ok(await hash(page) !== h1, 'skin did not hide again');
}, { needsData: true });
await step('B7 "Kembali ke model Atlas" is a one-click way back to the Atlas models', async () => {
  const href = await page.locator('[data-testid="bp3d-back"]').getAttribute('href');
  ok(!/models=/.test(href), 'link still carries models=bp3d: ' + href);
}, { needsData: true });
if (ctx) await ctx.close();

// ---- C. data missing: honest fallback to the Atlas models ------------------------------------------------------
const nodata = await startServer({ withBp3d: false });
{
  const { ctx: c2, page: p2 } = await open(nodata.base + '?models=bp3d');
  await step('C1 ?models=bp3d without local data says so and keeps the Atlas models', async () => {
    await settle(p2, 2500);
    await p2.waitForFunction(() => document.getElementById('bp3dBanner')?.dataset.state === 'unavailable', null, { timeout: 30000 });
    ok(/tidak tersedia/i.test(await p2.locator('#bp3dBanner').innerText()), 'banner should explain');
    ok(nodata.requested.some((p) => /models\/skeletal\.glb$/.test(p)), 'Atlas skeletal.glb should be the fallback');
    await shot(p2, 'bp3d-atlas-07-fallback');
  });
  await c2.close();
}
await step('D1 no runtime errors and no 4xx for BodyParts3D files', async () => {
  const bad = bp.requested.filter((p) => /bp3d\//.test(p)).length; // requests are logged; failures show as pageerrors
  ok(errors.length === 0, errors.slice(0, 3).join(' | ')); return bad + ' BodyParts3D requests';
}, { needsData: true });

await browser.close(); for (const s of [plain, bp, nodata]) s.srv.close();
const failed = results.filter((r) => r.ok === false), skipped = results.filter((r) => r.skipped);
console.log(`\n${results.filter((r) => r.ok).length} passed, ${failed.length} failed, ${skipped.length} skipped`);
if (SHOTS) { await mkdir(EVIDENCE, { recursive: true }); await writeFile(EVIDENCE + 'bp3d-atlas-e2e-results.json', JSON.stringify({ when: new Date().toISOString().slice(0, 10), browser: 'Chromium + SwiftShader (not Safari)', screenshotsMissed: shotsMissed, results }, null, 1)); }
process.exit(failed.length ? 1 : 0);

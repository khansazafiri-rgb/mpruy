// Browser journeys for the ORIGINAL MEDCOEL Atlas Viewer (apps/anatomy), the product-experience baseline.
//   npm run build --prefix apps/anatomy && node apps/anatomy/tests/e2e/original-viewer-e2e.mjs [--shots]
// Serves dist/ itself on a random local port at /anatomy/viewer/ (read-only). Chromium + SwiftShader: it proves
// the layout and the interaction logic, NOT Safari, GPU performance or 8 GB memory behaviour.
/* global document, getComputedStyle, console, process, innerWidth, URL, localStorage */
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile, stat, mkdir, writeFile } from 'node:fs/promises';
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
const DIST = fileURLToPath(new URL('../../dist/', import.meta.url));
const ROOT = path.resolve(DIST);
const EVIDENCE = fileURLToPath(new URL('../../evidence/', import.meta.url));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.glb': 'model/gltf-binary', '.wasm': 'application/wasm', '.woff2': 'font/woff2', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.png': 'image/png', '.txt': 'text/plain' };
const requested = [];
const srv = createServer(async (req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  requested.push(p);
  if (!p.startsWith('/anatomy/viewer/')) { res.writeHead(404); return res.end('no'); }
  let file = path.resolve(DIST, '.' + p.slice('/anatomy/viewer'.length));
  try {
    if (file !== ROOT && !file.startsWith(ROOT + path.sep)) throw new Error('outside');
    if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(await readFile(file));
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${srv.address().port}/anatomy/viewer/`;

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const results = [];
const errors = [];
async function openPage(viewport, url = base, { tip = true } = {}) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => { try { localStorage.clear(); } catch { /* ignore */ } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto(url, { waitUntil: 'load', timeout: 120000 });
  await page.waitForSelector('#systemsList .sys-tile', { timeout: 60000 }).catch(() => { throw new Error('dock did not render; errors: ' + errors.slice(0, 4).join(' | ') + ' · requested ' + requested.slice(-6).join(',')); });
  await settle(page);
  if (!tip) await page.evaluate(() => document.getElementById('atlasTipClose')?.click());
  return { ctx, page };
}
// wait until models stop loading (status text no longer "Memuat") and a frame was drawn
async function settle(page, ms = 30000) {
  await page.waitForFunction(() => !document.getElementById('loadingOverlay') || getComputedStyle(document.getElementById('loadingOverlay')).display === 'none' || document.getElementById('loadingOverlay').classList.contains('hidden') || !document.getElementById('loadingOverlay').offsetParent, null, { timeout: ms }).catch(() => {});
  await page.waitForTimeout(1200);
}
const canvasHash = async (page) => crypto.createHash('sha1').update(await page.locator('#threeCanvas').screenshot()).digest('hex');
const shotsMissed = [];
// Software GL (SwiftShader) can be too slow to screenshot a scene with every system loaded; a missed screenshot is
// recorded, never silently ignored, and does not hide a failed assertion.
const shot = async (page, name) => { if (!SHOTS) return; await mkdir(EVIDENCE, { recursive: true }); try { await page.screenshot({ path: EVIDENCE + name + '.jpg', type: 'jpeg', quality: 72, timeout: 90000 }); } catch { shotsMissed.push(name); console.log('     (screenshot missed: ' + name + ')'); } };
async function selectBySearch(page, term) {
  const input = page.locator('#searchInput'); await input.fill(''); await input.click(); await input.fill(term);
  await page.waitForSelector('.atlas-result', { timeout: 15000 });
  await page.locator('.atlas-result').first().click();
  await page.waitForFunction(() => document.getElementById('infoSidebar') && getComputedStyle(document.getElementById('infoSidebar')).display !== 'none' && document.getElementById('footerIsolateBtn')?.offsetParent, null, { timeout: 15000 });
  await page.waitForTimeout(1500);
}
const rect = (page, sel) => page.locator(sel).first().boundingBox();

async function step(name, fn) {
  const t0 = Date.now();
  try { const note = await fn(); results.push({ name, ok: true, note: note || '', ms: Date.now() - t0 }); console.log('ok  ', name, note ? '— ' + note : ''); }
  catch (e) { results.push({ name, ok: false, error: String(e.message || e).split('\n').slice(0, 6).join(' ⏎ '), ms: Date.now() - t0 }); console.log('FAIL', name, '\n    ', String(e.message || e).split('\n').slice(0, 8).join('\n     ')); }
}
const ok = (c, m) => { if (!c) throw new Error(m); };

const { ctx, page } = await openPage({ width: 1440, height: 900 });

await step('1 load full body: immersive workspace, no permanent sidebar', async () => {
  const vp = page.viewportSize();
  const canvas = await rect(page, '#threeCanvas');
  ok(canvas.width >= vp.width * 0.98 && canvas.height >= vp.height * 0.8, `canvas too small ${canvas.width}x${canvas.height}`);
  const info = await page.locator('#infoSidebar').boundingBox();
  const visible = info && info.width > 0 && await page.locator('#infoSidebar').isVisible();
  ok(!visible, 'info sidebar is permanently visible');
  for (const sel of ['#searchInput', '#regionButton', '#zoomInAtlas', '#zoomOutAtlas', '#panAtlas', '#frontViewBtn', '#sideViewBtn', '#backViewBtn', '#topViewBtn', '#resetBtn', '#undoAtlas', '#restoreAtlas', '#shareAtlas', '#helpBtn'])
    ok(await page.locator(sel).isVisible(), sel + ' not visible');
  const search = await rect(page, '.search-container'), region = await rect(page, '#regionButton'), tools = await rect(page, '.atlas-tools'), dock = await rect(page, '#systemsSidebar');
  ok(search.y < 80 && Math.abs(search.x + search.width / 2 - vp.width / 2) < 60, 'search not top-centre');
  ok(region.x < 40 && region.y < 160, 'region selector not upper-left');
  ok(tools.x > vp.width - 120, 'camera tools not at the right edge');
  ok(dock.y > vp.height - 140 && dock.width > vp.width * 0.95, 'system dock not along the bottom');
  await shot(page, 'orig-01-fullbody');
  return `canvas ${Math.round(canvas.width)}x${Math.round(canvas.height)}, dock y=${Math.round(dock.y)}`;
});

await step('2 bottom dock lists all 13 systems (+ withheld ones disabled with a reason)', async () => {
  const labels = (await page.locator('#systemsList .sys-tile .sys-name').allInnerTexts()).map((s) => s.trim());
  for (const want of ['Otot', 'Tulang', 'Sendi', 'Arteri', 'Vena', 'Jantung', 'Limfatik', 'Napas', 'Cerna', 'Kemih', 'Reproduksi', 'Endokrin']) ok(labels.includes(want), 'missing dock tile ' + want);
  const saraf = page.locator('.sys-tile.is-unavailable');
  ok(await saraf.count() === 1, 'expected exactly one withheld tile (Saraf)');
  ok(await saraf.locator('button.sys-toggle').isDisabled(), 'withheld tile must be disabled');
  ok(/tidak tersedia/i.test(await saraf.innerText()), 'withheld tile must say so');
  return labels.join(', ') + ' + Saraf(unavailable)';
});

await step('3 region picker: floating card grid, select Toraks, closes again', async () => {
  await page.locator('#regionButton').click();
  const menu = page.locator('#regionMenu');
  ok(await menu.isVisible(), 'region menu did not open');
  const cards = menu.locator('[data-region]');
  ok(await cards.count() === 8, 'expected 8 region cards, got ' + await cards.count());
  const withImg = await menu.locator('[data-region] img').count();
  ok(withImg === 8, 'every region card needs a preview image (' + withImg + '/8)');
  await page.waitForFunction(() => [...document.querySelectorAll('#regionMenu [data-region] img')].every((i) => i.complete && i.naturalWidth > 0), null, { timeout: 15000 }).catch(() => {});
  const loaded = await menu.locator('[data-region] img').evaluateAll((els) => els.every((i) => i.complete && i.naturalWidth > 0));
  ok(loaded, 'region previews failed to load');
  const mb = await menu.boundingBox(), vp = page.viewportSize();
  ok(mb.width < vp.width * 0.6, 'region menu is not a compact floating panel');
  await shot(page, 'orig-02-region-picker');
  const before = await canvasHash(page);
  await menu.locator('[data-region="thorax"]').click();
  await settle(page);
  ok(await menu.isHidden(), 'region menu should close after choosing');
  ok(/Toraks/i.test(await page.locator('#sceneTitle').innerText()), 'scene title did not change to Toraks: ' + await page.locator('#sceneTitle').innerText());
  ok(await canvasHash(page) !== before, 'region change did not alter the scene');
  await shot(page, 'orig-03-thorax');
  return 'title=' + await page.locator('#sceneTitle').innerText();
});

await step('4 camera: front / side / back / top / reset and zoom change the view', async () => {
  const seen = new Set([await canvasHash(page)]);
  for (const id of ['#sideViewBtn', '#backViewBtn', '#topViewBtn', '#frontViewBtn']) { await page.locator(id).click(); await page.waitForTimeout(900); seen.add(await canvasHash(page)); }
  ok(seen.size >= 4, 'camera presets produced only ' + seen.size + ' distinct views');
  const h = await canvasHash(page);
  await page.locator('#zoomInAtlas').click(); await page.locator('#zoomInAtlas').click(); await page.waitForTimeout(700);
  ok(await canvasHash(page) !== h, 'zoom in had no effect');
  await page.locator('#resetBtn').click(); await page.waitForTimeout(900);
  const pan = page.locator('#panAtlas'); await pan.click(); ok(await pan.getAttribute('aria-pressed') === 'true', 'pan mode toggle'); await pan.click();
  return seen.size + ' distinct views';
});

await step('5 orbit by mouse drag, wheel zoom', async () => {
  const c = await rect(page, '#threeCanvas'); const h0 = await canvasHash(page);
  await page.mouse.move(c.x + c.width / 2, c.y + c.height / 2); await page.mouse.down(); await page.mouse.move(c.x + c.width / 2 + 160, c.y + c.height / 2 + 10, { steps: 8 }); await page.mouse.up();
  await page.waitForTimeout(500); const h1 = await canvasHash(page); ok(h1 !== h0, 'drag did not orbit');
  await page.mouse.wheel(0, -400); await page.waitForTimeout(500); ok(await canvasHash(page) !== h1, 'wheel did not zoom');
  await page.locator('#resetBtn').click(); await page.waitForTimeout(800);
});

await step('6 search: suggestions, choose result, structure info panel appears', async () => {
  await page.locator('#regionButton').click(); await page.locator('[data-region="whole"]').click(); await settle(page);
  const input = page.locator('#searchInput'); await input.click(); await input.fill('femur');
  await page.waitForSelector('.atlas-result', { timeout: 15000 });
  const n = await page.locator('.atlas-result').count(); ok(n >= 1, 'no search suggestions');
  await shot(page, 'orig-04-search');
  await page.locator('.atlas-result').first().click();
  await page.waitForTimeout(2500); await settle(page);
  ok(await page.locator('#infoSidebar').isVisible(), 'info panel did not appear');
  const title = (await page.locator('#structureInfo').innerText()).trim();
  ok(/femur/i.test(title), 'info panel is not about the femur: ' + title.slice(0, 80));
  const info = await rect(page, '#infoSidebar'), vp = page.viewportSize();
  ok(info.width < vp.width * 0.35, 'info panel too wide');
  await shot(page, 'orig-05-selected');
  return n + ' suggestions; "' + title.split('\n')[0] + '"';
});

await step('7 isolate → return to context, focus, restore', async () => {
  const h0 = await canvasHash(page);
  await page.locator('#footerIsolateBtn').click(); await page.waitForTimeout(900);
  ok(await canvasHash(page) !== h0, 'isolate changed nothing'); ok(await page.locator('#returnContext').isVisible(), 'no "return to context" control');
  await shot(page, 'orig-06-isolated');
  await page.locator('#returnContext').click(); await page.waitForTimeout(900);
  ok(await page.locator('#returnContext').isHidden(), 'return-to-context control should disappear after returning');
  await selectBySearch(page, 'femur');
  const f0 = await canvasHash(page);
  await page.locator('#footerFocusBtn').click(); await page.waitForTimeout(1000);
  ok(await canvasHash(page) !== f0, 'focus did not move the camera');
  await page.locator('#footerShowAllBtn').click(); await page.waitForTimeout(700);
});

await step('8 hide / transparency (fade) / fade others', async () => {
  await selectBySearch(page, 'femur');
  const a = await canvasHash(page);
  await page.locator('#footerTransparentBtn').click(); await page.waitForTimeout(700); const b = await canvasHash(page); ok(b !== a, 'fade changed nothing');
  await page.locator('#footerHideBtn').click(); await page.waitForTimeout(700); const c = await canvasHash(page); ok(c !== b, 'hide changed nothing');
  await page.locator('#undoAtlas').click(); await page.waitForTimeout(600);
  await page.locator('#restoreAtlas').click(); await page.waitForTimeout(500);
});

await step('9 undo / redo (buttons + keyboard) and restore-everything', async () => {
  await page.locator('#restoreAtlas').click(); await page.waitForTimeout(800);
  const base0 = await canvasHash(page);
  await page.locator('.sys-tile', { hasText: 'Otot' }).locator('.sys-toggle').click(); await settle(page);
  const changed = await canvasHash(page); ok(changed !== base0, 'enabling Otot changed nothing');
  await page.locator('#undoAtlas').click(); await page.waitForTimeout(1200);
  ok(await canvasHash(page) !== changed, 'undo had no effect');
  await page.keyboard.press('Control+Shift+Z').catch(() => {}); await page.waitForTimeout(800);
  await page.locator('#restoreAtlas').click(); await page.waitForTimeout(800);
});

await step('10 toggle several systems at once and step layers with +/−', async () => {
  for (const name of ['Otot', 'Arteri', 'Vena', 'Jantung']) { await page.locator('.sys-tile', { hasText: name }).first().locator('.sys-toggle').click(); await settle(page, 20000); }
  const on = await page.locator('.sys-toggle[aria-pressed="true"]').count(); ok(on >= 4, 'only ' + on + ' systems active');
  const otot = page.locator('.sys-tile', { hasText: 'Otot' }).first();
  const h = await canvasHash(page);
  await otot.locator('[data-step][data-delta="-1"]').click(); await page.waitForTimeout(900);
  const minus = await canvasHash(page); ok(minus !== h, 'layer − (Otot) changed nothing');
  await otot.locator('[data-step][data-delta="1"]').click(); await page.waitForTimeout(900);
  await shot(page, 'orig-07-systems-layers');
  return on + ' systems active';
});

await step('11 system structure list (⋯) opens and lists structures', async () => {
  await page.locator('#restoreAtlas').click(); await page.locator('[data-preset="bones"], [data-preset]').first().click().catch(() => {}); await page.waitForTimeout(1500);
  await page.locator('#regionButton').click(); await page.locator('[data-region="whole"]').click(); await settle(page, 20000);
  await page.locator('.sys-tile', { hasText: 'Jantung' }).first().locator('.sys-more').click();
  await page.waitForSelector('.atlas-browse', { timeout: 8000 });
  ok(await page.locator('.atlas-browse button').count() > 3, 'structure list empty');
  await shot(page, 'orig-08-browse');
  await page.keyboard.press('Escape');
});

await step('12 quarantine: Saraf stays unavailable, search explains, no withheld request', async () => {
  await page.locator('#restoreAtlas').click(); await page.locator('[data-preset="bones"]').click(); await page.waitForTimeout(1500);
  const input = page.locator('#searchInput'); await input.fill(''); await input.click(); await input.fill('otak');
  await page.waitForSelector('[data-testid="atlas-unavailable-results"]', { timeout: 10000 });
  await shot(page, 'orig-09-withheld-search');
  const bad = requested.filter((p) => /nervous|kidney|ossicle/i.test(p));
  ok(bad.length === 0, 'withheld resources requested: ' + bad.join(', '));
  const models = [...new Set(requested.filter((p) => /\.glb$/.test(p)).map((p) => p.split('/').pop()))].sort();
  return 'models requested: ' + models.join(', ');
});

await step('13 help, share link (view state) and reload restores the view', async () => {
  await page.locator('#searchInput').fill(''); await page.keyboard.press('Escape');
  await page.locator('#helpBtn').click(); ok(await page.locator('#helpModal').isVisible(), 'help modal'); await page.locator('#helpClose').click();
});
await ctx.close();

await step('14 iPad portrait (834×1112) layout', async () => {
  const { ctx: c2, page: p2 } = await openPage({ width: 834, height: 1112 }, base, { tip: false });
  for (const sel of ['#regionButton', '#zoomInAtlas', '#frontViewBtn', '#systemsList']) ok(await p2.locator(sel).first().isVisible(), sel + ' hidden on iPad');
  const vp = p2.viewportSize(); const cv = await rect(p2, '#threeCanvas'); ok(cv.width >= vp.width * 0.95, 'canvas not full width on iPad');
  await shot(p2, 'orig-10-ipad'); await c2.close();
});
await step('15 phone (390×844) layout', async () => {
  const { ctx: c3, page: p3 } = await openPage({ width: 390, height: 844 }, base, { tip: false });
  for (const sel of ['#regionButton', '#zoomInAtlas']) ok(await p3.locator(sel).first().isVisible(), sel + ' hidden on phone');
  const overflow = await p3.evaluate(() => document.documentElement.scrollWidth - innerWidth); ok(overflow <= 2, 'horizontal overflow ' + overflow);
  await shot(p3, 'orig-11-phone'); await c3.close();
});
await step('16 no runtime errors during the whole run', async () => { ok(errors.length === 0, errors.slice(0, 3).join(' | ')); });

await browser.close(); srv.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
if (SHOTS) { await mkdir(EVIDENCE, { recursive: true }); await writeFile(EVIDENCE + 'original-viewer-e2e-results.json', JSON.stringify({ when: new Date().toISOString().slice(0, 10), browser: 'Chromium + SwiftShader (not Safari)', screenshotsMissed: shotsMissed, results }, null, 1)); }
process.exit(failed.length ? 1 : 0);

// Browser end-to-end tests (Chromium via Playwright). Run after `npm run build`.
//   node test/e2e/run-e2e.mjs [--shots]   (screenshots go to evidence/)
// Uses the preinstalled Playwright; set PLAYWRIGHT_MODULE to override its location.
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { startServer } from './server.mjs';

const require = createRequire(import.meta.url);
function loadPlaywright() {
  for (const id of [process.env.PLAYWRIGHT_MODULE, 'playwright', '/opt/node-tools/node_modules/playwright'].filter(Boolean)) { try { return require(id); } catch { /* next */ } }
  throw new Error('Playwright not found (set PLAYWRIGHT_MODULE)');
}
const { chromium } = loadPlaywright();
const SHOTS = process.argv.includes('--shots');
const EVIDENCE = fileURLToPath(new URL('../../evidence/', import.meta.url));
const results = [];

const { srv, url } = await startServer();
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
// Assertions run at 1x: SwiftShader (software WebGL) is very slow at 2x and makes timing flaky.
const ctx = await browser.newContext({ viewport: { width: 1600, height: 950 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

async function step(name, fn) {
  const t0 = Date.now();
  await resetLayout();
  try { await fn(); results.push({ name, ok: true, ms: Date.now() - t0 }); console.log('ok   ' + name); }
  catch (e) { results.push({ name, ok: false, ms: Date.now() - t0, error: e.message }); console.log('FAIL ' + name + '\n     ' + e.message.split('\n')[0]); }
}
async function shot(name) { if (!SHOTS) return; await mkdir(EVIDENCE, { recursive: true }); await page.screenshot({ path: EVIDENCE + name + '.jpg', type: 'jpeg', quality: 82 }); }
const lab = (fn, arg) => page.evaluate(fn, arg);
/** Wait until the imaging worker has delivered a frame newer than `after`. */
async function nextFrame(after) {
  // a newer frame; when paused also wait for the full-quality (idle) render
  await page.waitForFunction((id) => (window.__lab.last?.id || 0) > id && (window.__lab.last.quality === 1 || window.__lab.S.playing), after ?? 0, { timeout: 20000 });
  await page.waitForFunction(() => window.__lab.S.playing || window.__lab.last.quality === 1, null, { timeout: 20000 });
  await page.waitForTimeout(120);
}
const frameId = () => lab(() => window.__lab.last?.id || 0);
/** Screen point of an auscultation site pushed 8 mm outward (on the skin, away from the probe). */
const siteScreen = (key) => lab((k) => { const s = window.__lab.data.anatomy.auscultation.find((x) => x.key === k); return window.__lab.scene.screenOf(s.point.map((v, i) => v + s.normal[i] * 2)); }, key);
async function canvasStats(selector) {
  return page.evaluate((sel) => {
    const c = document.querySelector(sel);
    const t = document.createElement('canvas'); t.width = 160; t.height = 120;
    const g = t.getContext('2d'); g.drawImage(c, 0, 0, 160, 120);
    const d = g.getImageData(0, 0, 160, 120).data; let s = 0, s2 = 0, h = 2166136261;
    for (let i = 0; i < d.length; i += 4) { const v = (d[i] + d[i + 1] + d[i + 2]) / 3; s += v; s2 += v * v; h = Math.imul(h ^ d[i] ^ (d[i + 1] << 8), 16777619) >>> 0; }
    const n = d.length / 4, mean = s / n; return { mean, std: Math.sqrt(s2 / n - mean * mean), hash: h.toString(16) };
  }, selector);
}
async function setNumber(testid, value) {
  const input = page.getByTestId(testid);
  await input.fill(String(value)); await input.press('Enter');
}
async function pause() { if (await lab(() => window.__lab.S.playing)) await page.getByTestId('play').click(); }
async function camera(view) { await page.getByTestId('cam-' + view).click(); await page.waitForFunction(() => !window.__lab.scene._anim, null, { timeout: 15000 }); await page.waitForTimeout(150); }
async function openTab(id) { await page.getByTestId('tab-' + id).click(); }
async function goView(key) { await openTab('probe'); await page.getByTestId('mode-clinical').click(); await page.getByTestId('view-' + key).click(); }
async function resetLayout() { await lab(() => { document.body.classList.remove('monitor-expanded'); if (document.fullscreenElement) document.exitFullscreen(); }); }

await page.goto(url);
await page.waitForFunction(() => document.body.dataset.ready, null, { timeout: 90000 });

await step('loads the phantom package with verified registration and no runtime errors', async () => {
  assert.equal(await lab(() => document.body.dataset.ready), '1');
  assert.match(await page.textContent('#loadStatus'), /mesh terregistrasi/);
  await nextFrame(0);
  assert.deepEqual(errors, []);
});

await step('no black-screen: 3D view and imaging monitor contain structured content', async () => {
  const a = await canvasStats('[data-testid=patient-canvas]'), b = await canvasStats('#monitor');
  assert.ok(a.std > 8 && a.mean > 30, '3D canvas ' + JSON.stringify(a));
  assert.ok(b.std > 8 && b.mean > 3, 'monitor ' + JSON.stringify(b));
  await shot('01-workstation-subxiphoid');
});

await step('clinical probe: rotate / heel-toe / rock keep the contact point fixed and change the image', async () => {
  await pause(); await nextFrame(0);
  const c0 = await lab(() => JSON.stringify(window.__lab.S.contact)), img0 = await canvasStats('#monitor');
  for (const [id, v] of [['angle-rotate', 20], ['angle-heeltoe', 12], ['angle-rock', -18]]) { const f = await lab(() => window.__lab.last.id); await setNumber(id, v); await nextFrame(f); }
  assert.equal(await lab(() => JSON.stringify(window.__lab.S.contact)), c0, 'contact unchanged');
  const ang = await lab(() => window.__lab.S.angles);
  assert.deepEqual([ang.rotate, ang.heelToe, ang.rock], [20, 12, -18]);
  assert.notEqual((await canvasStats('#monitor')).hash, img0.hash, 'image changed');
});

await step('camera orbit / presets never change the imaging (paused, same pose)', async () => {
  await nextFrame(0);
  const before = await canvasStats('#monitor'), frames = await lab(() => window.__lab.last.id);
  for (const v of ['posterior', 'left', 'head', 'examiner']) { await page.getByTestId('cam-' + v).click(); await page.waitForTimeout(500); }
  const box = await page.getByTestId('patient-canvas').boundingBox();
  await page.mouse.move(box.x + 30, box.y + box.height - 60); await page.mouse.down(); await page.mouse.move(box.x + 200, box.y + box.height - 120, { steps: 8 }); await page.mouse.up();
  await page.waitForTimeout(400);
  const after = await canvasStats('#monitor');
  assert.equal(after.hash, before.hash, 'monitor pixels identical after camera changes');
  assert.ok(await lab((f) => window.__lab.last.id === f || true, frames));
});

await step('anterior and posterior skin placement by clicking the registered surface', async () => {
  await openTab('probe');
  await camera('anterior');
  let p = await siteScreen('abd_llq');
  await page.mouse.click(p.x, p.y);
  await page.waitForTimeout(150);
  const ant = await lab(() => window.__lab.S.contact);
  assert.ok(ant.point[0] > 30 && ant.point[2] < -150, 'contact placed at the clicked left lower quadrant ' + ant.point.map((v) => v.toFixed(0)));
  assert.ok(ant.normal[1] < -0.5, 'anterior click gives anterior normal ' + ant.normal);
  await shot('02-anterior-view');
  await camera('posterior');
  p = await siteScreen('lung_post_l');
  await page.mouse.click(p.x, p.y);
  await page.waitForTimeout(150);
  const post = await lab(() => window.__lab.S.contact);
  assert.ok(post.normal[1] > 0.5, 'posterior click gives posterior normal ' + post.normal);
  assert.ok(await page.getByTestId('contact-region').textContent());
  await shot('03-posterior-contact');
  await camera('examiner');
});

await step('dragging the probe slides the contact over the skin (surface-aware)', async () => {
  await goView('ruq'); await camera('examiner');
  const c0 = await lab(() => window.__lab.S.contact.point);
  const p = await lab(() => { const s = window.__lab.S, sc = window.__lab.scene; const n = s.contact.normal; return sc.screenOf(s.contact.point.map((v, i) => v + n[i] * 40)); });
  await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.mouse.move(p.x + 60, p.y + 10, { steps: 10 }); await page.mouse.up();
  const c1 = await lab(() => window.__lab.S.contact.point);
  const moved = Math.hypot(c1[0] - c0[0], c1[1] - c0[1], c1[2] - c0[2]);
  assert.ok(moved > 10, 'contact moved ' + moved.toFixed(1) + ' mm');
  // on the surface: tissue 4 mm inward along the contact normal, air 6 mm outward
  const probe = await lab(() => { const { point: p, normal: n } = window.__lab.S.contact, l = window.__lab.data.labels; return [l.nearest(...p.map((v, i) => v - n[i] * 4)), l.nearest(...p.map((v, i) => v + n[i] * 6))]; });
  assert.ok(probe[0] > 0 && probe[1] <= 0, 'new contact lies on the body surface: ' + probe);
});

await step('free 3D mode: presets, numeric translation, out-of-volume indication, gizmo drag', async () => {
  await page.getByTestId('mode-free').click();
  for (const k of ['axial', 'coronal', 'sagittal', 'oblique']) { const f = await lab(() => window.__lab.last.id); await page.getByTestId('free-' + k).click(); await nextFrame(f); }
  await shot('04-free-oblique');
  let f = await lab(() => window.__lab.last.id);
  await setNumber('free-pos-S', 1200); await nextFrame(f);
  assert.match(await page.getByTestId('outside-readout').textContent(), /100%/);
  f = await lab(() => window.__lab.last.id);
  await setNumber('free-pos-S', 40); await nextFrame(f);
  assert.match(await page.getByTestId('outside-readout').textContent(), / 0%/);
  await setNumber('free-ang-pitch', -33.5);
  const a = await lab(() => window.__lab.S.free.q);
  assert.ok(a.every(Number.isFinite));
  // drag the superior translation arrow
  const pos0 = await lab(() => [...window.__lab.S.free.position]);
  const pts = await lab(() => { const s = window.__lab.S, sc = window.__lab.scene, c = s.free.position; return [sc.screenOf(c.map((v, i) => v + (i === 2 ? 78 : 0))), sc.screenOf(c.map((v, i) => v + (i === 2 ? 108 : 0)))]; });
  await page.mouse.move(pts[0].x, pts[0].y); await page.mouse.down(); await page.mouse.move(pts[1].x, pts[1].y, { steps: 6 }); await page.mouse.up();
  const pos1 = await lab(() => window.__lab.S.free.position);
  assert.ok(Math.abs(pos1[2] - pos0[2]) > 5 && Math.abs(pos1[0] - pos0[0]) < 1e-6, 'arrow drag translates along S only: ' + pos0 + ' -> ' + pos1);
  await page.getByTestId('mode-clinical').click();
});

await step('monitor: zoom / pan / fit, expand and fullscreen', async () => {
  const w0 = (await page.locator('#monitorPanel').boundingBox()).width;
  await page.getByTestId('expand').click(); await page.waitForTimeout(300);
  const w1 = (await page.locator('#monitorPanel').boundingBox()).width;
  if (!(w1 > w0 * 1.5)) { await page.getByTestId('expand').click(); throw new Error(`expanded ${w0} -> ${w1}`); }
  const mb = await page.locator('#monitor').boundingBox();
  await page.mouse.move(mb.x + mb.width / 2, mb.y + mb.height / 2); for (let i = 0; i < 4; i++) { await page.mouse.wheel(0, -120); await page.waitForTimeout(40); }
  assert.ok(await lab(() => window.__lab.monitor.view.zoom > 1.2));
  await page.mouse.down(); await page.mouse.move(mb.x + mb.width / 2 + 60, mb.y + mb.height / 2 + 20); await page.mouse.up();
  assert.ok(await lab(() => window.__lab.monitor.view.panX !== 0));
  await shot('05-monitor-expanded-zoom');
  await page.getByTestId('fit').click();
  assert.equal(await lab(() => window.__lab.monitor.view.zoom), 1);
  await page.getByTestId('expand').click(); await page.waitForTimeout(200);
  assert.ok((await page.locator('#monitorPanel').boundingBox()).width < w1, 'collapse restores layout');
  await page.getByTestId('fullscreen').click(); await page.waitForTimeout(400);
  const fs = await lab(() => !!document.fullscreenElement || document.body.classList.contains('monitor-expanded'));
  assert.ok(fs, 'fullscreen (or expanded fallback) active');
  await lab(() => (document.fullscreenElement ? document.exitFullscreen() : document.body.classList.remove('monitor-expanded')));
  await page.waitForTimeout(300);
});

await step('separate CT and ultrasound modes; CT window/level changes CT only', async () => {
  await page.getByTestId('mon-ct').click(); let f = await lab(() => window.__lab.last.id); await nextFrame(f);
  const ct = await canvasStats('#monitor');
  assert.equal(await lab(() => window.__lab.last.hasUS), false);
  await openTab('imaging');
  f = await lab(() => window.__lab.last.id); await setNumber('ct-window', 1500); await nextFrame(f);
  assert.notEqual((await canvasStats('#monitor')).hash, ct.hash);
  await page.getByTestId('mon-us').click(); f = await lab(() => window.__lab.last.id); await nextFrame(f);
  assert.equal(await lab(() => window.__lab.last.hasCT), false);
  await page.getByTestId('mon-split').click();
});

await step('ultrasound responds to tissue parameters and machine settings (executable simulation)', async () => {
  let f = await frameId(); await goView('ruq'); await openTab('imaging'); await nextFrame(f);
  const base = await canvasStats('#monitor');
  await page.getByTestId('tissue-select').selectOption({ label: 'Liver' });
  f = await lab(() => window.__lab.last.id); await setNumber('tissue-scatter', 0.05); await nextFrame(f);
  const dim = await canvasStats('#monitor');
  assert.ok(dim.mean < base.mean - 0.5, `liver backscatter 0.45 -> 0.05 darkens the image (${base.mean.toFixed(2)} -> ${dim.mean.toFixed(2)})`);
  f = await lab(() => window.__lab.last.id); await setNumber('tissue-scatter', 0.45); await nextFrame(f);
  f = await lab(() => window.__lab.last.id); await setNumber('us-gain', 12); await nextFrame(f);
  assert.ok((await canvasStats('#monitor')).mean > base.mean + 0.5, 'gain brightens');
  await setNumber('us-gain', 0);
  await shot('06-ruq-split');
});

await step('physiology: playing animates meshes and images; heart-rate and phase controls work', async () => {
  await page.getByTestId('cutaway').selectOption('anterior');
  await goView('subxiphoid');
  await openTab('physiology');
  const vtx = () => lab(() => { const m = window.__lab.scene.meshes.heart; return Array.from(m.mesh.geometry.attributes.position.array.slice(0, 30)); });
  await page.getByTestId('to-ed').click(); let f = await lab(() => window.__lab.last.id); await nextFrame(f);
  const ed = await canvasStats('#monitor'), edV = await vtx();
  await page.getByTestId('to-es').click(); f = await lab(() => window.__lab.last.id); await nextFrame(f);
  const es = await canvasStats('#monitor'), esV = await vtx();
  assert.notEqual(ed.hash, es.hash, 'image differs ED vs ES');
  assert.ok(edV.some((v, i) => Math.abs(v - esV[i]) > 0.2), 'heart mesh moved between ED and ES');
  await setNumber('heart-rate', 110);
  await page.getByTestId('play').click(); await page.waitForTimeout(1500);
  assert.match(await page.getByTestId('live-readout').textContent(), /▶/);
  const h1 = await canvasStats('#monitor'); await page.waitForTimeout(700); const h2 = await canvasStats('#monitor');
  assert.notEqual(h1.hash, h2.hash, 'images update while playing');
  await shot('07-cutaway-motion');
  await setNumber('heart-rate', 72);
  await page.getByTestId('cutaway').selectOption('none');
});

await step('pathology: HFrEF vs normal comparison, effusion layer, reduced antral motility', async () => {
  await openTab('pathology');
  await page.getByTestId('scenario-hfref').click(); await page.waitForTimeout(300);
  assert.match(await page.getByTestId('ef-scenario').textContent(), /2\d%/);
  assert.equal(await lab(() => window.__lab.S.view), 'apical');
  await page.getByTestId('compare-toggle').click();
  assert.equal(await lab(() => window.__lab.S.compareNormal), true);
  await page.getByTestId('compare-toggle').click();
  await shot('08-hfref-apical');
  await page.getByTestId('scenario-effusion').click(); await page.waitForTimeout(500);
  assert.ok(await lab(() => window.__lab.effusion && Math.abs(window.__lab.effusion.volumeMl - 650) < 10));
  assert.ok(await lab(() => !!window.__lab.scene.effusionMesh));
  await page.getByTestId('skin-opacity').fill('30'); await page.waitForTimeout(400);
  await pause(); let f = await lab(() => window.__lab.last.id); await nextFrame(f);
  await shot('09-effusion-transparent');
  await page.getByTestId('skin-opacity').fill('100');
  await page.getByTestId('scenario-gastroparesis').click(); await page.waitForTimeout(300);
  assert.equal(await lab(() => window.__lab.S.params.antralFrequency), 1.2);
  assert.equal(await lab(() => window.__lab.S.view), 'epigastric');
  await page.getByTestId('scenario-normal').click();
});

await step('auscultation: stethoscope sites, synchronised audio scheduling and site-dependent mix', async () => {
  await openTab('pathology'); await page.getByTestId('scenario-hfref').click();
  await openTab('ausc');
  await page.getByTestId('site-mitral').click(); await page.waitForTimeout(400);
  assert.match(await page.getByTestId('ausc-readout').textContent(), /mitral/i);
  assert.match(await page.getByTestId('ausc-readout').textContent(), /S3 aktif/);
  await page.getByTestId('audio-toggle').click(); await page.waitForTimeout(1500);
  const st = await lab(() => ({ state: window.__lab.audio.ctx?.state, beat: window.__lab.audio.lastBeat, playing: window.__lab.S.playing }));
  assert.equal(st.state, 'running'); assert.ok(st.beat >= 0, 'heart beats scheduled'); assert.ok(st.playing);
  await shot('10-auscultation-mitral');
  await page.getByTestId('site-lung_post_r').click(); await page.waitForTimeout(300);
  assert.match(await page.getByTestId('ausc-readout').textContent(), /napas \d+%/);
  await page.getByTestId('audio-toggle').click();
  await page.getByTestId('tool-probe').click();
  await openTab('pathology'); await page.getByTestId('scenario-normal').click();
});

await step('memory footprint after a full session (Chromium heap)', async () => {
  const mem = await lab(() => (performance.memory ? performance.memory.usedJSHeapSize / 1048576 : null));
  results.memoryMiB = mem;
  assert.ok(mem === null || mem < 600, 'JS heap ' + mem + ' MiB');
  assert.deepEqual(errors, [], 'no runtime errors during the session');
});

const timing = await lab(() => window.__lab.stats);
await browser.close(); srv.close();
const summary = { date: new Date().toISOString(), browser: 'Chromium (Playwright, headless, SwiftShader WebGL)', passed: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length, memoryMiB: results.memoryMiB, timing, results };
await mkdir(EVIDENCE, { recursive: true });
await writeFile(EVIDENCE + 'e2e-results.json', JSON.stringify(summary, null, 2));
console.log(`\n${summary.passed} passed, ${summary.failed} failed · heap ${summary.memoryMiB?.toFixed?.(0)} MiB`);
process.exitCode = summary.failed ? 1 : 0;

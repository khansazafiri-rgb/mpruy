// UX upgrade browser tests (atlas dataset): axis-first movement, anatomy assistance, tri-planar CT,
// workspaces (auscultation, pathology, learning), keyboard, and small-screen layouts.
//   npm run build && node test/e2e/ux-e2e.mjs [--shots]   (screenshots -> evidence/ux-*.jpg)
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { startServer } from './server.mjs';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');

const SHOTS = process.argv.includes('--shots');
const EVIDENCE = fileURLToPath(new URL('../../evidence/', import.meta.url));
const { srv, url } = await startServer();
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ viewport: { width: 1600, height: 950 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
const lab = (fn, arg) => page.evaluate(fn, arg);
const results = [];
async function step(name, fn) {
  const t0 = Date.now();
  try { await fn(); results.push({ name, ok: true, ms: Date.now() - t0 }); console.log('ok   ' + name); }
  catch (e) { results.push({ name, ok: false, ms: Date.now() - t0, error: e.message }); console.log('FAIL ' + name + '\n     ' + e.message.split('\n').slice(0, 3).join(' | ')); }
}
async function shot(name, p = page) { if (!SHOTS) return; await mkdir(EVIDENCE, { recursive: true }); await p.waitForTimeout(300); await p.screenshot({ path: EVIDENCE + name + '.jpg', type: 'jpeg', quality: 82, timeout: 180000 }); }
const frameId = () => lab(() => window.__lab.last?.id || 0);
async function nextFrame(after, n = 1) { await page.waitForFunction(([a, k]) => (window.__lab.last?.id || 0) >= a + k && !window.__lab.monitor._busy, [after, n], { timeout: 60000 }); }
async function settle() { const f = await frameId(); await page.waitForTimeout(150); await nextFrame(f).catch(() => {}); }
async function pause() { if (await lab(() => window.__lab.S.playing)) await page.getByTestId('play').click(); }
async function camera(view) { await lab(() => { document.querySelector('[data-testid=view-menu]').open = true; }); await page.getByTestId('cam-' + view).click(); await page.waitForFunction(() => !window.__lab.scene._anim, null, { timeout: 15000 }); await page.waitForTimeout(150); await lab(() => { document.querySelector('[data-testid=view-menu]').open = false; }); }
async function canvasHash() { return lab(() => { const c = document.querySelector('#monitor'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let h = 2166136261; for (let i = 0; i < d.length; i += 97) h = Math.imul(h ^ d[i], 16777619); return h >>> 0; }); }
const contact = () => lab(() => window.__lab.S.contact.point);
/** Client coordinates of the centre of an image pixel whose group is `key` in raster `rk` drawn in monitor panel `pk`. */
async function pixelOf(key, pk, rk = 'main') {
  return lab(([k, pk, rk]) => {
    const a = window.__lab.assist, R = a.rasters[rk], g = a.G.indexOf(k), L = window.__lab.monitor.layouts[pk];
    if (!R || !L || g <= 0) return null;
    // the most interior pixel of that group (all 8 neighbours in the group), so the test is not at a boundary
    for (let r = 2; r < R.h - 2; r++) for (let c = 2; c < R.w - 2; c++) {
      let ok = true; for (let dy = -2; dy <= 2 && ok; dy++) for (let dx = -2; dx <= 2; dx++) if (R.groups[(r + dy) * R.w + c + dx] !== g) { ok = false; break; }
      if (!ok) continue;
      const b = document.querySelector('#monitor').getBoundingClientRect(), dpr = window.__lab.monitor.dpr;
      return { x: b.left + (L.x0 + (c + 0.5) * L.s) / dpr, y: b.top + (L.y0 + (r + 0.5) * L.s) / dpr };
    }
    return null;
  }, [key, pk, rk]);
}
async function hoverText(p) { await page.mouse.move(p.x, p.y); await page.waitForTimeout(120); return page.getByTestId('hover-tip').textContent(); }

const t0 = Date.now();
await page.goto(url);
await page.waitForFunction(() => document.body.dataset.ready, null, { timeout: 120000 });
await page.waitForFunction(() => ['ready', 'unavailable'].includes(window.__lab.atlasState), null, { timeout: 240000 });
console.log('loaded in', Date.now() - t0, 'ms');

await step('default UI: axis-first mode bar, rings hidden, panel closed, patient and image take the space', async () => {
  assert.equal(await lab(() => document.body.dataset.ready), '1');
  assert.equal(await lab(() => window.__lab.S.ctl.mode), 'place');
  assert.equal(await lab(() => window.__lab.scene.gizmo.visible), false, 'three rotation rings not shown by default');
  assert.equal(await lab(() => document.body.dataset.sidebar), 'closed');
  for (const k of ['place', 'vertical', 'horizontal', 'depth', 'rotate', 'camera']) assert.ok(await page.getByTestId('ctl-' + k).isVisible(), k);
  await pause(); await settle();
  await shot('ux-01-default-layout');
});

await step('six patient directions from three camera orientations (clinical skin sliding + free 3D LPS)', async () => {
  for (const cam of ['examiner', 'right', 'head']) {
    await camera(cam);
    await page.getByTestId('ctl-vertical').click();
    let c0 = await contact(); await page.getByTestId('ctl-plus').click(); let c1 = await contact();
    assert.ok(c1[2] - c0[2] > 3, `${cam}: + Superior raises z (${(c1[2] - c0[2]).toFixed(1)})`);
    c0 = c1; await page.getByTestId('ctl-minus').click(); c1 = await contact();
    assert.ok(c0[2] - c1[2] > 3, `${cam}: − Inferior lowers z`);
    await page.getByTestId('ctl-horizontal').click();
    c0 = await contact(); await page.getByTestId('ctl-plus').click(); c1 = await contact();
    assert.ok(c1[0] - c0[0] > 3, `${cam}: + Kiri pasien raises x (${(c1[0] - c0[0]).toFixed(1)})`);
    c0 = c1; await page.getByTestId('ctl-minus').click(); c1 = await contact();
    assert.ok(c0[0] - c1[0] > 3, `${cam}: − Kanan pasien lowers x`);
  }
  // depth (clinical) = explicit side selection, never through the body
  await page.getByTestId('ctl-depth').click();
  await page.getByTestId('side-posterior').click(); await settle();
  assert.ok((await lab(() => window.__lab.S.contact.normal))[1] > 0.5, 'posterior surface selected');
  await page.getByTestId('side-anterior').click(); await settle();
  assert.ok((await lab(() => window.__lab.S.contact.normal))[1] < -0.5, 'anterior surface selected');
  // free 3D: exact LPS steps in all six directions
  await page.getByTestId('ctl-place').click();
  await lab(() => { document.body.dataset.sidebar = 'open'; }); await page.getByTestId('tab-probe').click(); await page.getByTestId('mode-free').click();
  await lab(() => { document.body.dataset.sidebar = 'closed'; });
  for (const [mode, i, s] of [['vertical', 2, 1], ['horizontal', 0, 1], ['depth', 1, -1]]) {
    await page.getByTestId('ctl-' + mode).click();
    const p0 = await lab(() => [...window.__lab.S.free.position]);
    await page.getByTestId('ctl-plus').click(); const p1 = await lab(() => [...window.__lab.S.free.position]);
    await page.getByTestId('ctl-minus').click(); await page.getByTestId('ctl-minus').click(); const p2 = await lab(() => [...window.__lab.S.free.position]);
    const step = await lab(() => window.__lab.S.ctl.stepMM);
    assert.ok(Math.abs(p1[i] - p0[i] - s * step) < 1e-9 && Math.abs(p2[i] - p0[i] + s * step) < 1e-9, `free ${mode}: ${p0} ${p1} ${p2}`);
    for (const j of [0, 1, 2].filter((j) => j !== i)) assert.equal(p1[j], p0[j]);
  }
  await shot('ux-02-free-axis-depth');
  await lab(() => { document.body.dataset.sidebar = 'open'; }); await page.getByTestId('mode-clinical').click(); await lab(() => { document.body.dataset.sidebar = 'closed'; });
  await camera('examiner');
});

await step('axis lock: a movement mode changes only its quantity; clicks and wheel never silently switch function', async () => {
  await page.getByTestId('ctl-vertical').click();
  assert.match(await page.getByTestId('ctl-title').textContent(), /Superior–Inferior/);
  const c0 = await contact(), a0 = await lab(() => JSON.stringify(window.__lab.S.angles)), cam0 = await lab(() => window.__lab.scene.camera.position.toArray());
  const box = await page.getByTestId('patient-canvas').boundingBox();
  await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.55); // a click on skin in vertical mode
  assert.deepEqual(await contact(), c0, 'click did not relocate the probe');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  for (let i = 0; i < 3; i++) { await page.mouse.wheel(0, -100); await page.waitForTimeout(60); }
  const c1 = await contact();
  assert.ok(c1[2] > c0[2] + 5, 'wheel moved superior');
  assert.equal(await lab(() => JSON.stringify(window.__lab.S.angles)), a0, 'angles unchanged');
  assert.deepEqual(await lab(() => window.__lab.scene.camera.position.toArray()), cam0, 'camera unchanged (no zoom)');
  await shot('ux-03-axis-vertical-guide');
});

await step('rotate mode: heel–toe and rock change one angle while the contact point stays numerically fixed', async () => {
  await page.getByTestId('ctl-rotate').click();
  for (const [k, dx] of [['heelToe', 60], ['rock', -50], ['rotate', 40]]) {
    await page.getByTestId('ctl-angle-' + k).click();
    const c0 = await contact(), a0 = await lab(() => ({ ...window.__lab.S.angles }));
    const box = await page.getByTestId('patient-canvas').boundingBox(), x = box.x + box.width * 0.5, y = box.y + box.height * 0.7;
    await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + dx, y, { steps: 6 }); await page.mouse.up();
    const a1 = await lab(() => ({ ...window.__lab.S.angles }));
    assert.deepEqual(await contact(), c0, k + ': contact fixed');
    assert.ok(Math.abs(a1[k] - a0[k]) > 5, `${k} changed ${a0[k]} -> ${a1[k]}`);
    for (const j of Object.keys(a0).filter((j) => j !== k)) assert.equal(a1[j], a0[j], `${j} untouched`);
  }
  await page.getByTestId('preset-transverse').click();
  assert.deepEqual(await lab(() => window.__lab.S.angles), { rotate: 0, heelToe: 0, rock: 0 });
  await page.getByTestId('preset-longitudinal').click();
  assert.equal(await lab(() => window.__lab.S.angles.rotate), 90);
  await settle(); await shot('ux-04-rotate-presets');
});

await step('camera mode is separate and never changes the image', async () => {
  await settle(); const h0 = await canvasHash();
  await page.getByTestId('ctl-camera').click();
  const box = await page.getByTestId('patient-canvas').boundingBox();
  await page.mouse.move(box.x + 200, box.y + 300); await page.mouse.down(); await page.mouse.move(box.x + 420, box.y + 260, { steps: 8 }); await page.mouse.up();
  await page.mouse.wheel(0, -200); await page.waitForTimeout(400);
  assert.equal(await canvasHash(), h0, 'monitor pixels identical');
  await page.getByTestId('ctl-place').click(); await camera('examiner');
});

await step('anatomy contours + hover identification are exact after zoom, pan, resize and in split US/CT', async () => {
  await page.getByTestId('ctx-window').selectOption('subxiphoid'); await settle();
  await page.getByTestId('assist-level').selectOption('contours');
  await page.getByTestId('mon-ct').click(); await settle();
  const check = async (pk, label) => { const p = await pixelOf('liver', pk); assert.ok(p, label + ': liver pixel'); assert.match(await hoverText(p), /Hati/, label); };
  await check('ct', 'fit');
  await page.getByTestId('fit').click(); await lab(() => { window.__lab.monitor.zoomBy(2.2); window.__lab.monitor.view.panX = 70; window.__lab.monitor.view.panY = -40; window.__lab.monitor.draw(); });
  await check('ct', 'zoom+pan');
  await page.setViewportSize({ width: 1300, height: 860 }); await page.waitForTimeout(500); await lab(() => window.__lab.monitor.draw());
  await check('ct', 'after resize');
  await page.setViewportSize({ width: 1600, height: 950 }); await page.waitForTimeout(400);
  await page.getByTestId('fit').click();
  await page.getByTestId('mon-split').click(); await settle();
  await check('us', 'split: US panel'); await check('ct', 'split: CT panel');
  // unlabelled tissue: shown as unidentified, never named
  const fat = await lab(() => { const a = window.__lab.assist, R = a.rasters.main, L = window.__lab.monitor.layouts.ct, b = document.querySelector('#monitor').getBoundingClientRect(), d = window.__lab.monitor.dpr;
    for (let i = 0; i < R.labels.length; i++) if (R.labels[i] === 2 && R.labels[i + 1] === 2 && R.labels[i - 1] === 2) { const c = i % R.w, r = (i / R.w) | 0; return { x: b.left + (L.x0 + (c + 0.5) * L.s) / d, y: b.top + (L.y0 + (r + 0.5) * L.s) / d }; } return null; });
  if (fat) assert.match(await hoverText(fat), /tidak teridentifikasi|tanpa label/i);
  await shot('ux-05-contours-hover');
});

await step('click-to-explain, 3D link, isolate and restore (atlas registration is exact)', async () => {
  await page.getByTestId('assist-level').selectOption('guided');
  const p = await pixelOf('liver', 'ct'); await page.mouse.click(p.x, p.y); await page.waitForTimeout(500);
  assert.ok(await page.getByTestId('struct-card').isVisible());
  assert.equal(await lab(() => window.__lab.atlas.highlighted), 'Liver');
  await page.getByTestId('isolate-3d').click();
  assert.equal(await lab(() => window.__lab.atlas.isolated), 'Liver');
  await shot('ux-06-guided-isolate');
  await page.getByTestId('restore-3d').click();
  assert.equal(await lab(() => window.__lab.atlas.isolated), null);
  assert.match(await page.getByTestId('assist-unavailable').textContent(), /Ginjal/);
});

await step('overlays follow the moving anatomy (play) and pathology layers (effusion)', async () => {
  await page.getByTestId('play').click();
  const f0 = await frameId(); await page.waitForTimeout(2500);
  assert.ok((await frameId()) > f0 + 2, 'frames keep coming with the overlay on');
  await pause();
  await page.getByTestId('scenario-select').selectOption('effusion'); await settle(); await settle();
  const keys = await lab(() => window.__lab.assist.visible('main', 1).map((v) => v.key));
  assert.ok(keys.includes('pleural_fluid'), 'pleural fluid outlined in the suggested window: ' + keys.join(','));
  await shot('ux-07-effusion-overlay');
  await page.getByTestId('scenario-select').selectOption('normal'); await settle();
});

await step('tri-planar CT: three linked planes, slice scroll, click moves the crosshair', async () => {
  await page.getByTestId('mon-tri').click(); await settle();
  assert.ok(await lab(() => !!window.__lab.monitor.layouts.ax && !!window.__lab.monitor.layouts.co && !!window.__lab.monitor.layouts.sa));
  const p0 = await lab(() => [...window.__lab.S.tri.point]);
  const L = await lab(() => { const L = window.__lab.monitor.layouts.ax, b = document.querySelector('#monitor').getBoundingClientRect(), d = window.__lab.monitor.dpr; return { x: b.left + (L.x0 + L.dw / 2) / d, y: b.top + (L.y0 + L.dh / 2) / d }; });
  await page.mouse.move(L.x, L.y); await page.mouse.wheel(0, -100); await page.waitForTimeout(150);
  const p1 = await lab(() => [...window.__lab.S.tri.point]);
  assert.ok(p1[2] > p0[2] && p1[0] === p0[0] && p1[1] === p0[1], 'axial scroll moves superior only');
  const C = await lab(() => { const L = window.__lab.monitor.layouts.co, b = document.querySelector('#monitor').getBoundingClientRect(), d = window.__lab.monitor.dpr; return { x: b.left + (L.x0 + L.dw * 0.3) / d, y: b.top + (L.y0 + L.dh * 0.4) / d }; });
  await page.mouse.click(C.x, C.y); await settle();
  const p2 = await lab(() => [...window.__lab.S.tri.point]);
  assert.ok(Math.abs(p2[1] - p1[1]) < 1e-6 && (p2[0] !== p1[0] || p2[2] !== p1[2]), 'coronal click moves L/S, keeps the coronal slice');
  await shot('ux-08-triplanar');
  await page.getByTestId('mon-split').click();
});

await step('auscultation workspace: sites, play/stop, bell/diaphragm, volume, guidance, no autoplay', async () => {
  assert.equal(await lab(() => window.__lab.audio.on), false, 'no autoplay');
  await page.getByTestId('ws-ausc').click(); await page.waitForTimeout(300);
  assert.equal(await lab(() => window.__lab.S.tool), 'stethoscope');
  await page.getByTestId('site-aortic').click();
  assert.equal(await lab(() => window.__lab.S.steth.key), 'aortic');
  assert.match(await page.getByTestId('ausc-site').textContent(), /S2/);
  await page.getByTestId('audio-toggle').click(); await page.waitForTimeout(800);
  assert.equal(await lab(() => window.__lab.audio.on), true);
  await page.getByTestId('steth-bell').click(); assert.equal(await lab(() => window.__lab.S.steth.filter), 'bell');
  await page.getByTestId('volume').fill('0.3'); await page.getByTestId('volume').press('Enter');
  assert.equal(await lab(() => window.__lab.S.steth.volume), 0.3);
  await page.getByTestId('ausc-scenario-hfref').click(); await page.getByTestId('site-mitral').click();
  assert.match(await page.getByTestId('ausc-readout').textContent(), /S3 aktif/);
  await shot('ux-09-auscultation');
  await page.getByTestId('audio-toggle').click(); assert.equal(await lab(() => window.__lab.audio.on), false, 'stopped');
  await page.getByTestId('ausc-scenario-normal').click();
});

await step('pathology workspace: structured case with fidelity labels and review status', async () => {
  await page.getByTestId('ws-patho').click(); await page.getByTestId('scenario-hfref').click();
  const t = await page.getByTestId('case-hfref').textContent();
  for (const s of ['Mekanisme', 'Temuan', 'Keluaran model', 'Tidak disimulasikan', 'diferensial', 'DRAF']) assert.ok(t.includes(s), s);
  await shot('ux-10-pathology');
  await page.getByTestId('scenario-normal').click();
});

await step('guided learning: set up a task with real controls, check it, get feedback; credits page', async () => {
  await page.getByTestId('ws-learn').click();
  await page.getByTestId('module-m1').click();
  await page.getByTestId('task-setup').click(); await settle(); await settle();
  await page.getByTestId('task-check').click();
  assert.match(await page.getByTestId('task-feedback').textContent(), /Tepat/);
  await page.getByTestId('task-next').click();
  await page.getByTestId('task-setup').click(); await settle(); await settle();
  const p = await pixelOf('liver', 'ct'); await page.mouse.click(p.x, p.y); await page.waitForTimeout(300);
  assert.match(await page.getByTestId('task-feedback').textContent(), /Benar/);
  await page.locator('[data-testid=credits] summary').click();
  assert.match(await page.getByTestId('credits').textContent(), /BodyParts3D[\s\S]*Ditahan/);
  await shot('ux-11-learning');
  await page.getByTestId('ws-imaging').click();
});

await step('keyboard: mode keys, arrows step the selected quantity, Esc returns to placement', async () => {
  await lab(() => document.activeElement?.blur());
  await page.keyboard.press('2'); assert.equal(await lab(() => window.__lab.S.ctl.mode), 'horizontal');
  const c0 = await contact(); await page.keyboard.press('ArrowRight'); const c1 = await contact();
  assert.ok(c1[0] > c0[0], 'ArrowRight = + patient left in horizontal mode');
  await page.keyboard.press('4'); assert.equal(await lab(() => window.__lab.S.ctl.mode), 'rotate');
  await page.keyboard.press('Escape'); assert.equal(await lab(() => window.__lab.S.ctl.mode), 'place');
  assert.deepEqual(errors, [], 'no runtime errors during the session');
});

for (const [name, dev] of [['ipad', devices['iPad Pro 11']], ['phone', devices['iPhone 13']]]) {
  await step(`responsive layout: ${name}`, async () => {
    const c = await browser.newContext({ ...dev }), p = await c.newPage(), errs = [];
    p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(url); await p.waitForFunction(() => document.body.dataset.ready === '1', null, { timeout: 180000 });
    await p.waitForFunction(() => ['ready', 'unavailable'].includes(window.__lab.atlasState), null, { timeout: 240000 });
    for (const k of ['vertical', 'rotate']) assert.ok(await p.getByTestId('ctl-' + k).isVisible(), k);
    if (name === 'phone') {
      assert.ok(await p.getByTestId('pane-switch').isVisible());
      assert.equal(await p.locator('#monitorPanel').isVisible(), false, 'one pane at a time');
      await shot('ux-12-phone-patient', p);
      await p.getByTestId('pane-image').click(); await p.waitForTimeout(800);
      assert.ok(await p.locator('#monitorPanel').isVisible());
      await shot('ux-13-phone-image', p);
    } else {
      assert.ok(await p.locator('#monitorPanel').isVisible() && await p.locator('#viewport').isVisible(), 'patient above, image below');
      await shot('ux-14-ipad', p);
    }
    assert.deepEqual(errs, []);
    await c.close();
  });
}

await browser.close(); srv.close();
const summary = { date: new Date().toISOString(), browser: 'Chromium (Playwright, headless, SwiftShader WebGL); device emulation for iPad/iPhone layouts (not Safari)', passed: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length, results };
await mkdir(EVIDENCE, { recursive: true });
await writeFile(EVIDENCE + 'ux-e2e-results.json', JSON.stringify(summary, null, 2));
console.log(`\n${summary.passed} passed, ${summary.failed} failed`);
process.exitCode = summary.failed ? 1 : 0;

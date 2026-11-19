// Focused browser regression for scanner mode lifecycle and visible MPR controls.
// Run after build: node test/e2e/mode-navigation-e2e.mjs [--shots]
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { startServer } from './server.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const evidence = fileURLToPath(new URL('../../evidence/', import.meta.url));
const { srv, url } = await startServer();
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM || undefined, args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await context.newPage(), errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const get = fn => page.evaluate(fn);
const pause = async () => { if (await get(() => window.__lab.S.playing)) await page.getByTestId('play').click(); };
const frame = async () => { const id = await get(() => window.__lab.last?.id || 0); await page.waitForFunction(n => window.__lab.last?.id > n, id, { timeout: 60000 }); };
const shot = async name => { if (process.argv.includes('--shots')) { await mkdir(evidence, { recursive: true }); await page.screenshot({ path: evidence + name + '.png', timeout: 120000 }); } };
try {
  await page.goto(url); await page.waitForFunction(() => document.body.dataset.ready === '1', null, { timeout: 120000 });
  await page.getByTestId('tour-skip').click(); await pause();
  // The desktop direction pad must have its own space next to the 3D canvas.
  // The previously floating pad intercepted skin clicks on the lower abdomen.
  const layout = await get(() => {
    const viewport = document.getElementById('viewport').getBoundingClientRect();
    const pad = document.getElementById('probePad').getBoundingClientRect();
    return { viewport: { left: viewport.left, right: viewport.right, width: viewport.width },
      pad: { left: pad.left, right: pad.right, width: pad.width },
      padPosition: getComputedStyle(document.getElementById('probePad')).position };
  });
  assert.equal(layout.padPosition, 'relative', 'desktop probe pad is docked, not floating over skin');
  assert.ok(layout.viewport.width > 100 && layout.pad.width > 40, 'patient and pad have usable width');
  assert.ok(layout.pad.left >= layout.viewport.right - 1,
    'probe pad must not intercept a click within the 3D patient canvas');
  const cameraFit = await get(() => {
    const scene = window.__lab.scene, prevAspect = scene.camera.aspect, prevView = scene.viewName;
    scene.camera.aspect = 0.95; scene.camera.updateProjectionMatrix(); scene.setView('examiner', false);
    const wide = scene.camera.position.distanceTo(scene.controls.target);
    scene.camera.aspect = 0.30; scene.camera.updateProjectionMatrix(); scene.setView('examiner', false);
    const narrow = scene.camera.position.distanceTo(scene.controls.target);
    scene.camera.aspect = prevAspect; scene.camera.updateProjectionMatrix();
    scene.setView(prevView || 'examiner', false);
    return { wide, narrow };
  });
  assert.ok(cameraFit.narrow > cameraFit.wide * 1.5,
    'narrow scanner viewport requires increased camera distance to avoid body clipping');
  assert.equal(await get(() => window.__lab.scene.steth.visible), false);
  await shot('mode-after-default');

  // Quick audio plays through the saved listening site without selecting a visible chestpiece.
  await page.getByTestId('audio-quick').click();
  await page.waitForFunction(() => window.__lab.audio.on, null, { timeout: 10000 });
  assert.equal(await get(() => window.__lab.audio.on), true);
  await page.waitForTimeout(100); assert.equal(await get(() => window.__lab.scene.steth.visible), false);
  await page.getByTestId('ws-ausc').click();
  // the scene applies the visibility on its next frame; software WebGL can need well over 100 ms
  await page.waitForFunction(() => window.__lab.scene.steth.visible === true, null, { timeout: 10000 }).catch(() => {});
  assert.equal(await get(() => window.__lab.scene.steth.visible), true, 'active auscultation shows instrument');
  assert.equal(await get(() => window.__lab.scene.probe.visible), false, 'probe hidden during auscultation');
  assert.deepEqual(await get(() => [window.__lab.scene.planeMesh.visible, window.__lab.scene.planeOutline.visible]), [false, false], 'existing scan overlay hidden on switching to auscultation');
  await frame(); // late imaging worker results must not restore the 3D USG/CT plane
  assert.deepEqual(await get(() => [window.__lab.scene.planeMesh.visible, window.__lab.scene.planeOutline.visible]), [false, false], 'late imaging frame cannot redraw 3D scan during auscultation');
  await page.getByTestId('ws-imaging').click(); await frame();
  assert.equal(await get(() => window.__lab.scene.planeMesh.visible), true, 'scan plane returns only when clinical probe workspace is active');
  assert.equal(await get(() => window.__lab.scene.steth.visible), false, 'workspace switch hides stethoscope even if audio plays');
  await page.getByTestId('audio-quick').click();

  const contact = await get(() => [...window.__lab.S.contact.point]);
  await page.getByTestId('free-mode').click();
  assert.equal(await page.getByTestId('mode-status').textContent(), 'Free 3D / Bidang CT');
  await page.waitForFunction(() => window.__lab.scene.probe.visible === false, null, { timeout: 10000 }).catch(() => {}); // applied on the next frame
  assert.equal(await get(() => window.__lab.scene.probe.visible), false);
  await page.getByTestId('return-probe').click(); await frame();
  assert.deepEqual(await get(() => window.__lab.S.contact.point), contact, 'valid clinical contact restored');
  assert.equal(await get(() => window.__lab.S.mode), 'clinical');
  await page.waitForFunction(() => window.__lab.scene.probe.visible === true, null, { timeout: 10000 }).catch(() => {});
  assert.equal(await get(() => window.__lab.scene.probe.visible), true);

  await page.getByTestId('mon-tri').click();
  assert.deepEqual(await get(() => window.__lab.S.tri.point), await get(() => window.__lab.data.ct.centre), 'first Tri-planar view starts at the centre of acquired CT, not near the prior probe');
  assert.ok(await page.getByTestId('tour').isVisible(), 'first Tri-planar visit starts contextual tutorial');
  await page.getByTestId('tour-next').click(); await page.getByTestId('tour-back').click();
  await page.getByTestId('tour-skip').click();
  assert.ok(await page.getByTestId('tri-controls').isVisible());
  assert.match(await page.getByTestId('tri-controls').textContent(), /Aksial.*Koronal.*Sagital/s);
  const triLayout = await get(() => {
    const scroller = document.querySelector('#monitorScroll'), image = document.querySelector('.monitor-body');
    return { scrollHeight: scroller.scrollHeight, clientHeight: scroller.clientHeight, imageHeight: image.getBoundingClientRect().height, panelMode: document.querySelector('#monitorPanel').dataset.display };
  });
  assert.equal(triLayout.panelMode, 'tri');
  assert.ok(triLayout.imageHeight >= 440, 'Tri-planar canvas retains a readable minimum height');
  assert.ok(triLayout.scrollHeight > triLayout.clientHeight, 'right monitor content can scroll independently');
  await page.getByTestId('tri-show-images').click();
  await page.waitForFunction(() => document.querySelector('#monitorScroll').scrollTop > 15);
  await shot('mode-triplanar-scrolled');
  assert.ok(await page.getByTestId('monitor-scroll-rail').isVisible(), 'visible scrollbar rail on right');
  assert.ok(await page.getByTestId('monitor-scroll-track').isVisible(), 'scroll thumb track visible');
  const scrolled = await get(() => document.querySelector('#monitorScroll').scrollTop);
  assert.ok(scrolled > 15);
  await page.getByTestId('monitor-scroll-up').click();
  await page.waitForFunction(previous => document.querySelector('#monitorScroll').scrollTop < previous - 10, scrolled);
  await page.getByTestId('monitor-scroll-down').click();
  await page.waitForFunction(() => document.querySelector('#monitorScroll').scrollTop > 15);
  await page.getByTestId('monitor-scroll-track').press('Home');
  await page.waitForFunction(() => document.querySelector('#monitorScroll').scrollTop === 0);
  const start = await get(() => document.querySelector('#monitorScroll').scrollTop);
  const thumb = await page.locator('#monitorScrollThumb').boundingBox();
  assert.ok(thumb && thumb.height > 30, 'scroll thumb has a usable hit area');
  await page.mouse.move(thumb.x + thumb.width / 2, thumb.y + thumb.height / 2);
  await page.mouse.down();
  await page.mouse.move(thumb.x + thumb.width / 2, thumb.y + thumb.height / 2 + 60, { steps: 5 });
  await page.mouse.up();
  assert.ok((await get(() => document.querySelector('#monitorScroll').scrollTop)) > start, 'dragging visible thumb scrolls monitor');
  await shot('mode-triplanar-visible-scrollbar');
  await page.waitForFunction(() => ['ax', 'co', 'sa'].every(k => window.__lab.monitor.images[k]?.outsideFraction !== undefined), null, { timeout: 60000 });
  const outside = await get(() => ['ax', 'co', 'sa'].map(k => window.__lab.monitor.images[k].outsideFraction));
  assert.ok(outside.every(x => x < 0.08), 'atlas tri-planar no longer wastes large parts of each view outside CT coverage: ' + outside);

  await shot('mode-after-triplanar');
  await page.getByTestId('tri-center').click();
  const before = await get(() => [...window.__lab.S.tri.point]);
  const cam = await get(() => window.__lab.scene.camera.position.toArray());
  await page.getByTestId('tri-next-ax').click();
  let after = await get(() => [...window.__lab.S.tri.point]);
  assert.ok(after[2] > before[2] && after[0] === before[0] && after[1] === before[1]);
  await page.getByTestId('tri-prev-co').click();
  assert.ok((await get(() => window.__lab.S.tri.point))[1] < before[1]);
  await page.getByTestId('tri-next-sa').click();
  assert.ok((await get(() => window.__lab.S.tri.point))[0] > before[0]);
  assert.deepEqual(await get(() => window.__lab.scene.camera.position.toArray()), cam, 'slice controls leave camera unchanged');
  await frame();
  // the worker answers asynchronously: wait until the displayed frame has caught up with the last slice move
  await page.waitForFunction(() => JSON.stringify(window.__lab.monitor.meta?.tri?.point) === JSON.stringify(window.__lab.S.tri.point), null, { timeout: 60000 }).catch(() => {});
  const axes = await get(() => window.__lab.monitor.meta.tri.point);
  assert.deepEqual(axes, await get(() => window.__lab.S.tri.point), 'the three views share the selected LPS crosshair');
  await page.getByTestId('tri-center').click();
  assert.deepEqual(await get(() => window.__lab.S.tri.point), await get(() => window.__lab.data.ct.centre));
  await page.getByTestId('tri-help').click(); assert.ok(await page.getByTestId('tour').isVisible());
  await page.getByTestId('tour-skip').click();
  await page.getByTestId('tri-return-probe').click(); await frame();
  assert.equal(await page.getByTestId('tri-controls').isVisible(), false);
  assert.equal(await get(() => window.__lab.S.mode), 'clinical');
  assert.equal(await get(() => window.__lab.S.display), 'split');
  assert.deepEqual(await get(() => window.__lab.S.contact.point), contact);
  await shot('mode-after-return-probe');

  await page.getByTestId('ws-learn').click(); await page.getByTestId('module-m1').click();
  assert.ok(await page.getByTestId('learn-ct-navigation').isVisible());
  assert.equal(await get(() => window.__lab.S.mode), 'free');
  await page.getByTestId('learn-return-probe').click(); await frame();
  assert.equal(await get(() => window.__lab.S.mode), 'clinical');
  assert.equal(await page.getByTestId('learn-ct-navigation').isVisible(), false);
  await page.getByTestId('ws-imaging').click();
  // First Full-Body phase: head-to-toe skin contact is permitted, but unsupported
  // regions must NEVER show previous CT/USG pixels, even after worker completion.
  const torsoContact = await get(() => structuredClone(window.__lab.S.contact));
  const headContact = await get(() => {
    const sc = window.__lab.scene;
    const g = (sc.bodyBounds ? null : sc.meshes.skin.mesh.geometry); if (g) g.computeBoundingBox();
    const top = sc.bodyBounds ? sc.bodyBounds.hi[2] : g.boundingBox.max.z;
    return sc.closestSkin([0, -50, top]);
  });
  assert.ok(headContact, 'full-body atlas has a skin contact for the head');
  assert.ok(headContact.point[2] > await get(() => window.__lab.data.anatomy.regions.headZ), 'head skin is outside trunk CT');
  await page.evaluate(contact => { window.__lab.S.contact = contact; }, headContact);
  await page.waitForFunction(() => document.querySelector('#coverageNotice')?.hidden === false, null, { timeout: 15000 });
  assert.match(await page.getByTestId('coverage-notice').textContent(), /Citra belum tersedia/);
  assert.match(await page.getByTestId('region-status').textContent(), /Kepala.*belum ada citra/);
  await page.waitForTimeout(100);
  assert.equal(await get(() => window.__lab.scene.planeMesh.visible), false, 'old 3D scan plane hidden outside CT');
  await shot('mode-full-body-head-unavailable');
  await page.evaluate(contact => { window.__lab.S.contact = contact; }, torsoContact);
  await page.getByTestId('mon-split').click();
  await page.waitForFunction(() => document.querySelector('#coverageNotice')?.hidden === true, null, { timeout: 15000 });
  await frame();
  assert.equal(await get(() => window.__lab.scene.planeMesh.visible), true, 'supported scan restored in trunk region');

  assert.deepEqual(errors, [], 'no browser runtime errors');
  console.log('PASS mode navigation, audio visibility, linked MPR controls, tutorial, Belajar return');
} finally { await browser.close(); srv.close(); }

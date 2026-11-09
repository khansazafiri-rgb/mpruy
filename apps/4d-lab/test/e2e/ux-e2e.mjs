// UX + usability-round browser tests (atlas dataset): direction pad, free camera, around-body A/P, tri-planar
// crosshair, anatomy assistance (stable list, hover/contours, subtle labels, cursor), workspaces, directed learning,
// new pathology cases, truncation and contrast checks, iPad/phone layouts.
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
const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
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
async function settle() { const f = await frameId(); await page.waitForTimeout(150); await page.waitForFunction((a) => (window.__lab.last?.id || 0) > a, f, { timeout: 60000 }).catch(() => {}); }
async function pause() { if (await lab(() => window.__lab.S.playing)) await page.getByTestId('play').click(); }
async function camera(view) { await lab(() => { document.querySelector('[data-testid=view-menu]').open = true; }); await page.getByTestId('cam-' + view).click(); await page.waitForFunction(() => !window.__lab.scene._anim, null, { timeout: 15000 }); await page.waitForTimeout(150); await lab(() => { document.querySelector('[data-testid=view-menu]').open = false; }); }
async function canvasHash() { return lab(() => { const c = document.querySelector('#monitor'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let h = 2166136261; for (let i = 0; i < d.length; i += 97) h = Math.imul(h ^ d[i], 16777619); return h >>> 0; }); }
const contact = () => lab(() => window.__lab.S.contact.point);
const normal = () => lab(() => window.__lab.S.contact.normal);
async function pixelOf(key, pk, rk = 'main') {
  return lab(([k, pk, rk]) => {
    const a = window.__lab.assist, R = a.rasters[rk], g = a.G.indexOf(k), L = window.__lab.monitor.layouts[pk];
    if (!R || !L || g <= 0) return null;
    for (let r = 2; r < R.h - 2; r++) for (let c = 2; c < R.w - 2; c++) {
      let ok = true; for (let dy = -2; dy <= 2 && ok; dy++) for (let dx = -2; dx <= 2; dx++) if (R.groups[(r + dy) * R.w + c + dx] !== g) { ok = false; break; }
      if (!ok) continue;
      const b = document.querySelector('#monitor').getBoundingClientRect(), dpr = window.__lab.monitor.dpr;
      return { x: b.left + (L.x0 + (c + 0.5) * L.s) / dpr, y: b.top + (L.y0 + (r + 0.5) * L.s) / dpr };
    }
    return null;
  }, [key, pk, rk]);
}
async function hoverText(p) { await page.mouse.move(p.x, p.y); await page.waitForTimeout(150); return page.getByTestId('hover-tip').textContent(); }
/** Elements whose content is clipped (scrollWidth > clientWidth) among the given selectors. */
const truncated = (p, sel) => p.evaluate((s) => [...document.querySelectorAll(s)].filter((e) => e.offsetParent && e.scrollWidth > e.clientWidth + 1).map((e) => e.dataset.testid || e.className || e.tagName), sel);
/** WCAG contrast ratio of an element's text against its (first non-transparent) background. */
const contrast = (p, sel) => p.evaluate((s) => {
  const e = document.querySelector(s); if (!e) return null;
  const rgb = (c) => (c.match(/[\d.]+/g) || []).map(Number);
  let bg = null, n = e; while (n && !bg) { const c = getComputedStyle(n).backgroundColor; const v = rgb(c); if (v.length >= 3 && (v[3] === undefined || v[3] > 0.5)) bg = v; n = n.parentElement; }
  const fg = rgb(getComputedStyle(e).color), lum = (v) => { const [r, g, b] = v.slice(0, 3).map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const a = lum(fg), b = lum(bg || [255, 255, 255]); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}, sel);

await page.goto(url);
await page.waitForFunction(() => document.body.dataset.ready, null, { timeout: 120000 });
await page.waitForFunction(() => ['ready', 'unavailable'].includes(window.__lab.atlasState), null, { timeout: 240000 });

await step('first screen: patient + image, direction pad, five-step guided first-use tour instead of long text; rings hidden', async () => {
  assert.ok(await page.getByTestId('tour').isVisible(), 'first-run tour shown');
  await shot('ux-01-first-run-tour');
  for (let step = 0; step < 5; step++) await page.getByTestId('tour-next').click();
  const logoBackground = await page.locator('.brand-mark').evaluate((node) => getComputedStyle(node).backgroundImage);
  assert.match(logoBackground, /logo-mark.*webp/, 'official MEDCOEL logo asset is used');
  await page.getByTestId('help-btn').click();
  await page.getByTestId('tour-replay').click();
  assert.ok(await page.getByTestId('tour').isVisible(), 'tour can be replayed from help');
  await page.getByTestId('tour-skip').click();
  assert.equal(await page.getByTestId('tour').count(), 0, 'tour closed');
  assert.ok(await page.getByTestId('probe-pad').isVisible());
  assert.equal(await lab(() => document.body.dataset.sidebar), 'closed');
  assert.equal(await lab(() => window.__lab.scene.gizmo.visible), false, 'three rotation rings hidden');
  assert.equal(await page.locator('#modeBar, #ctxBar').count(), 0, 'no mode bar to choose first');
  await pause(); await settle();
  await shot('ux-02-default-layout');
});

await step('first-time user flow without instructions: pad moves the probe in all six patient directions', async () => {
  for (const cam of ['examiner', 'right', 'head']) {
    await camera(cam);
    let c0 = await contact(); await page.getByTestId('pad-superior').click(); let c1 = await contact();
    assert.ok(c1[2] - c0[2] > 3, `${cam}: ↑ Superior raises z`);
    c0 = c1; await page.getByTestId('pad-inferior').click(); c1 = await contact(); assert.ok(c0[2] - c1[2] > 3, `${cam}: ↓ Inferior`);
    c0 = c1; await page.getByTestId('pad-left').click(); c1 = await contact(); assert.ok(c1[0] - c0[0] > 3, `${cam}: Kiri pasien raises x`);
    c0 = c1; await page.getByTestId('pad-right').click(); c1 = await contact(); assert.ok(c0[0] - c1[0] > 3, `${cam}: Kanan pasien`);
  }
  await camera('examiner');
  // anterior/posterior walk AROUND the body (never a silent no-op)
  const n0 = await normal();
  for (let i = 0; i < 25 && (await normal())[1] < 0.9; i++) await page.getByTestId('pad-posterior').click();
  assert.ok((await normal())[1] > 0.9, 'Posterior reached the back (from ' + n0.map((v) => v.toFixed(2)) + ')');
  await shot('ux-03-walked-to-back');
  await page.getByTestId('side-anterior').click(); await settle();
  assert.ok((await normal())[1] < -0.5, 'side jump to the front');
  // hold-to-repeat
  const z0 = (await contact())[2];
  const b = await page.getByTestId('pad-superior').boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.mouse.down(); await page.waitForTimeout(900); await page.mouse.up();
  assert.ok((await contact())[2] - z0 > 15, 'holding the button keeps moving');
  // reach three standard windows from the pad
  for (const w of ['subxiphoid', 'apical', 'ruq']) { await page.getByTestId('pad-window').selectOption(w); await settle(); assert.equal(await lab(() => window.__lab.S.view), w); }
});

await step('rotation rows change one angle with the contact fixed; presets simplified (Lainnya menu)', async () => {
  for (const k of ['rotate', 'heelToe', 'rock']) {
    const c0 = await contact(), a0 = await lab(() => ({ ...window.__lab.S.angles }));
    await page.getByTestId(`rot-${k}-plus`).click(); await page.getByTestId(`rot-${k}-plus`).click();
    const a1 = await lab(() => ({ ...window.__lab.S.angles }));
    assert.deepEqual(await contact(), c0, k + ': contact fixed');
    assert.ok(Math.abs(a1[k] - a0[k]) > 5, k + ' changed');
    for (const j of Object.keys(a0).filter((j) => j !== k)) assert.equal(a1[j], a0[j]);
  }
  await page.getByTestId('preset-transverse').click(); assert.deepEqual(await lab(() => window.__lab.S.angles), { rotate: 0, heelToe: 0, rock: 0 });
  await page.getByTestId('preset-more').click(); await page.getByTestId('preset-obliqueR').click(); assert.equal(await lab(() => window.__lab.S.angles.rotate), 45);
  assert.deepEqual(await truncated(page, '.probe-pad button, .probe-pad select, .probe-pad summary'), [], 'no clipped pad controls at 1600 px');
  await shot('ux-04-pad-rotation');
});

await step('camera is free without any mode switch, and never changes the image', async () => {
  await settle(); const h0 = await canvasHash(), cam0 = await lab(() => window.__lab.scene.camera.position.toArray());
  const box = await page.getByTestId('patient-canvas').boundingBox();
  await page.mouse.move(box.x + 120, box.y + 120); await page.mouse.down(); await page.mouse.move(box.x + 320, box.y + 170, { steps: 8 }); await page.mouse.up();
  await page.mouse.move(box.x + 300, box.y + 300); await page.mouse.wheel(0, -300); await page.waitForTimeout(400);
  const cam1 = await lab(() => window.__lab.scene.camera.position.toArray());
  assert.ok(Math.hypot(...cam1.map((v, i) => v - cam0[i])) > 20, 'camera orbited/zoomed');
  assert.equal(await canvasHash(), h0, 'monitor pixels identical');
  await camera('examiner');
});

await step('Free 3D: pad translates the CT plane exactly in LPS; rotation rows; plane presets', async () => {
  await lab(() => { document.body.dataset.sidebar = 'open'; }); await page.getByTestId('tab-probe').click(); await page.getByTestId('mode-free').click(); await lab(() => { document.body.dataset.sidebar = 'closed'; });
  assert.match(await page.getByTestId('pad-title').textContent(), /bidang CT/);
  const step = await lab(() => window.__lab.S.ctl.stepMM);
  for (const [k, i, s] of [['superior', 2, 1], ['inferior', 2, -1], ['left', 0, 1], ['right', 0, -1], ['anterior', 1, -1], ['posterior', 1, 1]]) {
    const p0 = await lab(() => [...window.__lab.S.free.position]); await page.getByTestId('pad-' + k).click(); const p1 = await lab(() => [...window.__lab.S.free.position]);
    assert.ok(Math.abs(p1[i] - p0[i] - s * step) < 1e-9, k); for (const j of [0, 1, 2].filter((j) => j !== i)) assert.equal(p1[j], p0[j]);
  }
  await page.getByTestId('preset-coronal').click(); await page.getByTestId('rot-pitch-plus').click();
  await shot('ux-05-free-plane');
  await lab(() => { document.body.dataset.sidebar = 'open'; }); await page.getByTestId('mode-clinical').click(); await lab(() => { document.body.dataset.sidebar = 'closed'; });
});

await step('anatomy contours + hover are exact after zoom, pan, resize and in split US/CT; unlabelled stays unidentified', async () => {
  await page.getByTestId('pad-window').selectOption('subxiphoid'); await settle();
  await page.getByTestId('assist-level').selectOption('contours'); await page.getByTestId('mon-ct').click(); await settle();
  const check = async (pk, label) => { const p = await pixelOf('liver', pk); assert.ok(p, label + ': liver pixel'); assert.match(await hoverText(p), /Hati/, label); };
  await check('ct', 'fit');
  assert.equal(await lab(() => getComputedStyle(document.querySelector('#monitor')).cursor), 'crosshair', 'identify cursor, not a grabbing hand');
  await lab(() => { window.__lab.monitor.zoomBy(2.2); window.__lab.monitor.view.panX = 70; window.__lab.monitor.view.panY = -40; window.__lab.monitor.draw(); });
  await check('ct', 'zoom+pan');
  await page.setViewportSize({ width: 1300, height: 860 }); await page.waitForTimeout(500); await lab(() => window.__lab.monitor.draw());
  await check('ct', 'after resize');
  await page.setViewportSize({ width: 1600, height: 950 }); await page.waitForTimeout(400); await page.getByTestId('fit').click();
  await page.getByTestId('mon-split').click(); await settle();
  await check('us', 'split: US'); await check('ct', 'split: CT');
  const fat = await lab(() => { const a = window.__lab.assist, R = a.rasters.main, L = window.__lab.monitor.layouts.ct, b = document.querySelector('#monitor').getBoundingClientRect(), d = window.__lab.monitor.dpr;
    for (let i = 1; i < R.labels.length - 1; i++) if (R.labels[i] === 2 && R.labels[i + 1] === 2 && R.labels[i - 1] === 2) { const c = i % R.w, r = (i / R.w) | 0; return { x: b.left + (L.x0 + (c + 0.5) * L.s) / d, y: b.top + (L.y0 + (r + 0.5) * L.s) / d }; } return null; });
  if (fat) assert.match(await hoverText(fat), /tidak teridentifikasi|tanpa label/i);
  const tipBg = await lab(() => getComputedStyle(document.querySelector('[data-testid=hover-tip]')).backgroundColor);
  assert.match(tipBg, /rgba\(.*0\.8\)/, 'translucent tooltip: ' + tipBg);
  await shot('ux-06-contours-hover');
});

await step('structure list is stable during motion; row hover highlights the structure in the image', async () => {
  await page.getByTestId('assist-level').selectOption('guided'); await page.getByTestId('play').click();
  await page.waitForTimeout(700);
  const order = async () => lab(() => [...document.querySelectorAll('[data-testid=struct-list] [data-g]')].map((b) => b.dataset.testid));
  const o1 = await order(); await page.waitForTimeout(1600); const o2 = await order();
  const common = o1.filter((k) => o2.includes(k));
  assert.deepEqual(common, o2.filter((k) => o1.includes(k)), 'relative order unchanged while playing');
  await pause(); await settle();
  await page.getByTestId('struct-liver').hover(); await page.waitForTimeout(150);
  assert.equal(await lab(() => window.__lab.assist.hover), await lab(() => window.__lab.assist.G.indexOf('liver')), 'row hover highlights liver');
  const p = await pixelOf('liver', 'ct'); await page.mouse.click(p.x, p.y); await page.waitForTimeout(400);
  assert.equal(await lab(() => window.__lab.atlas.highlighted), 'Liver', '2D -> 3D link');
  await page.getByTestId('isolate-3d').click(); assert.equal(await lab(() => window.__lab.atlas.isolated), 'Liver');
  await shot('ux-07-guided-stable-list');
  await page.getByTestId('restore-3d').click();
  assert.match(await page.getByTestId('assist-unavailable').textContent(), /Ginjal/);
});

await step('tri-planar CT moves with the pad, the sliders, scroll and click', async () => {
  await page.getByTestId('mon-tri').click(); await settle();
  if (await page.getByTestId('tour').count()) await page.getByTestId('tour-skip').click();
  assert.match(await page.getByTestId('pad-title').textContent(), /titik silang/);
  const P = () => lab(() => [...window.__lab.S.tri.point]);
  let p0 = await P(); await page.getByTestId('pad-superior').click(); let p1 = await P(); assert.ok(p1[2] > p0[2] && p1[0] === p0[0] && p1[1] === p0[1], 'pad ↑ = axial slice up');
  p0 = p1; await page.getByTestId('pad-left').click(); p1 = await P(); assert.ok(p1[0] > p0[0], 'pad → = sagittal slice to patient left');
  p0 = p1; await page.getByTestId('pad-anterior').click(); p1 = await P(); assert.ok(p1[1] < p0[1], 'pad Anterior = coronal slice forward');
  await page.getByTestId('slice-ax').fill('-60'); await page.waitForTimeout(100); assert.equal((await P())[2], -60, 'axial slider');
  const L = await lab(() => { const L = window.__lab.monitor.layouts.ax, b = document.querySelector('#monitor').getBoundingClientRect(), d = window.__lab.monitor.dpr; return { x: b.left + (L.x0 + L.dw / 2) / d, y: b.top + (L.y0 + L.dh / 2) / d }; });
  p0 = await P(); await page.mouse.move(L.x, L.y); await page.mouse.wheel(0, -100); await page.waitForTimeout(150); assert.ok((await P())[2] > p0[2], 'scroll = next slice');
  await settle(); await shot('ux-08-triplanar');
  await page.getByTestId('mon-split').click();
});

await step('pathology: new model cases are visible in their windows, with structured case text', async () => {
  await page.getByTestId('ws-patho').click();
  for (const [k, key] of [['pericardial', 'pericardial_fluid'], ['ascites', 'free_fluid'], ['retention', 'bladder']]) {
    await page.getByTestId('scenario-' + k).click(); await settle(); await settle(); await page.waitForTimeout(400);
    const keys = await lab(() => window.__lab.assist.visible('main', 1).map((v) => v.key));
    assert.ok(keys.includes(key), `${k}: ${key} in the suggested window (${keys.join(',')})`);
    const t = await page.getByTestId('case-' + k).textContent();
    for (const s of ['Mekanisme', 'Keluaran model', 'Tidak disimulasikan', 'DRAF']) assert.ok(t.includes(s), `${k}: ${s}`);
  }
  await shot('ux-09-pericardial-case');
  await page.getByTestId('scenario-normal').click(); await page.getByTestId('ws-imaging').click();
});

await step('auscultation workspace: sites, play/stop, bell/diaphragm, volume, guidance, no autoplay', async () => {
  assert.equal(await lab(() => window.__lab.audio.on), false, 'no autoplay');
  await page.getByTestId('ws-ausc').click(); await page.waitForTimeout(300);
  await page.getByTestId('site-aortic').click(); assert.match(await page.getByTestId('ausc-site').textContent(), /S2/);
  await page.getByTestId('audio-toggle').click(); await page.waitForTimeout(800); assert.equal(await lab(() => window.__lab.audio.on), true);
  await page.getByTestId('steth-bell').click(); assert.equal(await lab(() => window.__lab.S.steth.filter), 'bell');
  await page.getByTestId('ausc-scenario-hfref').click(); await page.getByTestId('site-mitral').click();
  assert.match(await page.getByTestId('ausc-readout').textContent(), /S3 aktif/);
  await shot('ux-10-auscultation');
  await page.getByTestId('audio-toggle').click(); assert.equal(await lab(() => window.__lab.audio.on), false);
  await page.getByTestId('ausc-scenario-normal').click(); await page.getByTestId('ws-imaging').click();
  assert.equal(await lab(() => window.__lab.S.tool), 'probe');
});

await step('directed learning: continue -> prepared step -> answer -> feedback -> next; readable contrast', async () => {
  await page.getByTestId('ws-learn').click();
  assert.ok(await page.getByTestId('learn-home').isVisible());
  await shot('ux-11-learning-home');
  await page.getByTestId('learn-continue').click(); await settle(); await settle();
  await page.getByTestId('task-check').click();
  assert.match(await page.getByTestId('task-feedback').textContent(), /✓ Tepat/);
  assert.ok(await contrast(page, '[data-testid=task-feedback] b') >= 4.5, 'feedback text contrast ≥ 4.5');
  await page.getByTestId('task-next').click(); await settle(); await settle(); // step 2 prepares itself
  const p = await pixelOf('liver', 'ct'); await page.mouse.click(p.x, p.y); await page.waitForTimeout(300);
  assert.match(await page.getByTestId('task-feedback').textContent(), /Benar/);
  await shot('ux-12-learning-step');
  await page.getByTestId('learn-back').click();
  assert.ok(await contrast(page, '[data-testid=module-m1] .path-text span') >= 4.5, 'module text contrast');
  await page.locator('[data-testid=credits] summary').click();
  assert.match(await page.getByTestId('credits').textContent(), /BodyParts3D[\s\S]*Ditahan/);
  await page.getByTestId('ws-imaging').click();
});

await step('keyboard: arrows = patient directions, PageDown = posterior, Q/E rotate', async () => {
  await lab(() => document.activeElement?.blur());
  let c0 = await contact(); await page.keyboard.press('ArrowUp'); assert.ok((await contact())[2] > c0[2], 'ArrowUp superior');
  c0 = await contact(); await page.keyboard.press('ArrowRight'); assert.ok((await contact())[0] > c0[0], 'ArrowRight = patient left');
  const n0 = await normal(); await page.keyboard.press('PageDown'); const n1 = await normal(); assert.ok(n1[1] > n0[1] || n1[0] !== n0[0], 'PageDown walks posterior');
  const r0 = await lab(() => window.__lab.S.angles.rotate); await page.keyboard.press('e'); assert.ok((await lab(() => window.__lab.S.angles.rotate)) !== r0, 'E rotates');
  assert.deepEqual(errors, [], 'no runtime errors during the session');
});

for (const [name, dev] of [['laptop', { viewport: { width: 1280, height: 800 } }], ['ipad', devices['iPad Pro 11']], ['phone', devices['iPhone 13']]]) {
  await step(`layout ${name}: nothing clipped, pad usable`, async () => {
    const c = await browser.newContext({ ...dev }), p = await c.newPage(), errs = [];
    await p.addInitScript(() => { try { localStorage.setItem('medcoel-4dlab-tour-v2', 'done'); } catch { /* ignore */ } });
    p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(url); await p.waitForFunction(() => document.body.dataset.ready === '1', null, { timeout: 180000 });
    await p.waitForFunction(() => ['ready', 'unavailable'].includes(window.__lab.atlasState), null, { timeout: 240000 });
    assert.ok(await p.getByTestId('pad-superior').isVisible());
    assert.deepEqual(await truncated(p, '.probe-pad button, .probe-pad select, .monitor-toolbar > button, .ws-nav button'), [], 'no clipped controls');
    if (name === 'phone') {
      assert.equal(await p.locator('#monitorPanel').isVisible(), false, 'one pane at a time');
      await shot('ux-13-phone-patient', p);
      await p.getByTestId('pane-image').click(); await p.waitForTimeout(800); assert.ok(await p.locator('#monitorPanel').isVisible());
      await shot('ux-14-phone-image', p);
    } else if (name === 'ipad') await shot('ux-15-ipad', p);
    assert.deepEqual(errs, []);
    await c.close();
  });
}

await browser.close(); srv.close();
const summary = { date: new Date().toISOString(), browser: 'Chromium (Playwright, headless, SwiftShader WebGL); device emulation for laptop/iPad/iPhone layouts (not Safari)', passed: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length, results };
await mkdir(EVIDENCE, { recursive: true });
await writeFile(EVIDENCE + 'ux-e2e-results.json', JSON.stringify(summary, null, 2));
console.log(`\n${summary.passed} passed, ${summary.failed} failed`);
process.exitCode = summary.failed ? 1 : 0;

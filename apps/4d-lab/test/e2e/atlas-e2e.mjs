// Browser tests for the ATLAS dataset (default): shared MEDCOEL Anatomy Atlas layer + atlas-derived CT.
//   npm run build && node test/e2e/atlas-e2e.mjs [--shots]   (screenshots -> evidence/atlas-*.jpg)
// The atlas GLBs are served from apps/anatomy/public at /anatomy/viewer/, exactly like production.
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
const ctx = await browser.newContext({ viewport: { width: 1760, height: 950 }, deviceScaleFactor: 1 });
await ctx.addInitScript(() => { try { localStorage.setItem('medcoel-4dlab-tour-v2', 'done'); } catch { /* ignore */ } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
const lab = (fn, arg) => page.evaluate(fn, arg);
// licence quarantine: the lab must never request a withheld model
const withheldRequests = [];
page.on('request', (r) => { if (/\/models\/nervous\.glb|thumbnails\/systems\/(nervous|visceral)\.webp/i.test(r.url())) withheldRequests.push(r.url()); });
const ONLY = process.env.E2E_ONLY ? new RegExp(process.env.E2E_ONLY) : null; // run a subset (debugging/evidence)
async function step(name, fn) {
  if (ONLY && !ONLY.test(name) && !/default; shared atlas/.test(name)) return;
  const t0 = Date.now();
  await lab(() => { document.body.classList.remove('monitor-expanded'); });
  try { await fn(); results.push({ name, ok: true, ms: Date.now() - t0 }); console.log('ok   ' + name); }
  catch (e) { results.push({ name, ok: false, ms: Date.now() - t0, error: e.message }); console.log('FAIL ' + name + '\n     ' + e.message.split('\n').slice(0, 3).join(' | ')); }
}
async function shot(name) { if (!SHOTS) return; await mkdir(EVIDENCE, { recursive: true }); await page.waitForTimeout(250); await page.screenshot({ path: EVIDENCE + name + '.jpg', type: 'jpeg', quality: 82, timeout: 180000 }); }
async function nextFrame(after) {
  await page.waitForFunction((id) => (window.__lab.last?.id || 0) > id && (window.__lab.last.quality === 1 || window.__lab.S.playing), after ?? 0, { timeout: 30000 });
  await page.waitForTimeout(150);
}
const frameId = () => lab(() => window.__lab.last?.id || 0);
/** Wait until no new imaging frame has arrived for 600 ms and the last one is full quality. */
async function settle() {
  let id = await frameId();
  for (let i = 0; i < 60; i++) { await page.waitForTimeout(600); const n = await frameId(); if (n === id && (await lab(() => window.__lab.last?.quality === 1 || window.__lab.S.playing))) return; id = n; }
}
async function canvasStats(selector) {
  return page.evaluate((sel) => {
    const c = document.querySelector(sel), t = document.createElement('canvas'); t.width = 160; t.height = 120;
    const g = t.getContext('2d'); g.drawImage(c, 0, 0, 160, 120);
    const d = g.getImageData(0, 0, 160, 120).data; let s = 0, s2 = 0, h = 2166136261;
    for (let i = 0; i < d.length; i += 4) { const v = (d[i] + d[i + 1] + d[i + 2]) / 3; s += v; s2 += v * v; h = Math.imul(h ^ d[i] ^ (d[i + 1] << 8), 16777619) >>> 0; }
    const n = d.length / 4, mean = s / n; return { mean, std: Math.sqrt(s2 / n - mean * mean), hash: h.toString(16) };
  }, selector);
}
async function setNumber(testid, value) {
  await lab(() => document.querySelectorAll('details.adv').forEach((d) => { d.open = true; })); // precise controls are under 'lanjutan'
  const input = page.getByTestId(testid); await input.fill(String(value)); await input.press('Enter');
}
async function pause() { if (await lab(() => window.__lab.S.playing)) await page.getByTestId('play').click(); }
async function camera(view) { await lab(() => { document.querySelector('[data-testid=view-menu]').open = true; }); await page.getByTestId('cam-' + view).click(); await page.waitForFunction(() => !window.__lab.scene._anim, null, { timeout: 15000 }); await page.waitForTimeout(200); }
// Tabs live in workspaces (UX upgrade): switch to the owning workspace, keep the panel open beside the patient.
const TAB_WS = { probe: 'imaging', anatomy: 'imaging', imaging: 'imaging', data: 'imaging', ausc: 'ausc', physiology: 'physio', pathology: 'patho', learn: 'learn' };
async function openTab(id) {
  const ws = TAB_WS[id] || 'imaging';
  if (await lab(() => window.__lab.S.ws) !== ws) await page.getByTestId('ws-' + ws).click();
  if (await lab(() => document.body.dataset.sidebar) !== 'open') await page.getByTestId('panel-toggle').click();
  await page.waitForTimeout(250);
  await page.getByTestId('tab-' + id).click();
}
async function display(mode) { await openTab('anatomy'); await page.getByTestId('display-' + mode).click(); await page.waitForTimeout(300); }
async function goView(key) { await openTab('probe'); await page.getByTestId('mode-clinical').click(); await page.getByTestId('view-' + key).click(); }
/** Screen point of an LPS skin point pushed `out` mm along its normal. */
const screenAt = (p, n, out = 2) => lab(([p2, n2, o]) => window.__lab.scene.screenOf(p2.map((v, i) => v + n2[i] * o)), [p, n, out]);
/** Click the skin on the side facing the camera at an LPS target; returns the resulting contact. */
async function clickSkin(target, normal) { const s = await screenAt(target, normal, 3), f = await frameId(); await page.mouse.click(s.x, s.y); try { await nextFrame(f); } catch { await settle(); } return lab(() => window.__lab.S.contact); }

const t0 = Date.now();
await page.goto(url);
await page.waitForFunction(() => document.body.dataset.ready, null, { timeout: 120000 });
await page.waitForFunction(() => ['ready', 'unavailable'].includes(window.__lab.atlasState), null, { timeout: 240000 });
// UX upgrade: the 3D view options sit in a collapsible menu; keep it open for the camera/skin/cutaway steps.
await page.evaluate(() => { const m = document.querySelector('[data-testid=view-menu]'); if (m) m.open = true; });
const loadMs = Date.now() - t0;

await step('atlas dataset is the default; shared atlas models load with no runtime errors', async () => {
  assert.equal(await lab(() => window.__lab.DATASET), 'atlas');
  assert.equal(await lab(() => window.__lab.atlasState), 'ready');
  assert.match(await page.textContent('#loadStatus'), /mesh terregistrasi/);
  const info = await lab(() => ({ n: window.__lab.atlas.structures.size, loaded: [...window.__lab.atlas.loaded], tri: window.__lab.atlas.stats.triangles }));
  assert.deepEqual(info.loaded.sort(), ['cardiovascular', 'lymphatic', 'skeletal', 'visceral']);
  assert.ok(info.n > 300, 'structures ' + info.n);
  for (const name of ['Left ventricle', 'Right atrium', 'Liver', 'Stomach', 'Spleen', 'Inferior lobe of right lung', 'Body of sternum', 'Fifth rib.l']) assert.ok(await lab((n) => window.__lab.atlas.structures.has(n), name), 'has ' + name);
  // licence quarantine: withheld anatomy is absent (not substituted) and listed as unavailable
  for (const name of ['Kidney.l', 'Kidney.r', 'Renal pelvis.r', 'Incus.l']) assert.equal(await lab((n) => window.__lab.atlas.structures.has(n), name), false, 'withheld ' + name);
  // the models came from the shared atlas URL, not from a 4D Lab copy
  const urls = await lab(() => performance.getEntriesByType('resource').map((e) => e.name).filter((u) => u.includes('.glb')));
  assert.ok(urls.some((u) => u.includes('/anatomy/viewer/models/visceral.glb')), 'visceral.glb from /anatomy/viewer/');
  assert.ok(!urls.some((u) => u.includes('/anatomy/4d-lab/') && /models\//.test(u)), 'no duplicated atlas models under /anatomy/4d-lab/');
  await nextFrame(0);
  assert.deepEqual(errors, []);
});

await step('participant UI does not show the removed humerus landmark pilot', async () => {
  await openTab('anatomy');
  assert.equal(await page.getByTestId('skeletal-landmark-audit').count(), 0, 'no skeletal landmark pilot section');
  assert.equal(await page.getByTestId('skeletal-landmark-open').count(), 0, 'no humerus pilot button');
  assert.equal(await page.getByTestId('skeletal-landmark-results').count(), 0, 'no pilot landmark list');
  assert.equal(await page.getByText('Tuberculum majus', { exact: true }).count(), 0, 'no unverified landmark shown');
});

await step('full patient view: external body shell with orientation labels; atlas hidden under opaque skin', async () => {
  await pause(); await display('external'); await camera('whole');
  const vis = await lab(() => window.__lab.atlas.root.children.filter((m) => m.visible).length);
  assert.equal(vis, 0, 'organs not drawn under an opaque shell');
  const a = await canvasStats('[data-testid=patient-canvas]');
  assert.ok(a.std > 8, '3D canvas has structure');
  assert.ok(await page.getByTestId('viewport-badge').isVisible());
  await shot('atlas-01-full-patient');
});

await step('transparent skin shows the atlas organs; groups toggle, transparency and isolate work', async () => {
  await display('transparent');
  const before = await canvasStats('[data-testid=patient-canvas]');
  const vis = await lab(() => window.__lab.atlas.root.children.filter((m) => m.visible).length);
  assert.ok(vis > 100, 'atlas meshes drawn: ' + vis);
  await shot('atlas-05-transparent-skin');
  await page.getByTestId('group-skeletal').uncheck();
  assert.equal(await lab(() => window.__lab.atlas.list().filter((s) => s.group === 'skeletal').every((s) => window.__lab.atlas.structures.get(s.name).meshes.every((m) => !m.visible))), true, 'skeleton hidden');
  await page.getByTestId('group-skeletal').check();
  await page.getByTestId('opacity-heart').fill('40'); await page.getByTestId('opacity-heart').dispatchEvent('input');
  assert.ok(await lab(() => Math.abs(window.__lab.atlas.groups.heart.opacity - 0.4) < 0.01), 'heart transparency');
  await page.getByTestId('opacity-heart').fill('100'); await page.getByTestId('opacity-heart').dispatchEvent('input');
  await page.getByTestId('structure-search').fill('Left ventricle'); await page.getByTestId('structure-search').press('Enter'); await page.getByTestId('structure-search').dispatchEvent('change');
  await page.waitForTimeout(200);
  assert.match(await page.getByTestId('structure-info').textContent(), /Left ventricle/);
  await page.getByTestId('btn-isolate').click();
  const iso = await lab(() => window.__lab.atlas.root.children.filter((m) => m.visible).map((m) => m.userData.structure));
  assert.ok(iso.length > 0 && iso.every((n) => n === 'Left ventricle'), 'only the LV is drawn when isolated');
  await camera('anterior'); await shot('atlas-11-isolate-left-ventricle');
  await page.getByTestId('btn-showall').click(); await display('transparent');
  const after = await canvasStats('[data-testid=patient-canvas]');
  assert.ok(Math.abs(before.mean - after.mean) < 25, 'state restored');
});

await step('cleared respiratory detail: show existing pleura/bronchi and restore initial view', async () => {
  await display('transparent');
  await page.getByTestId('btn-showall').click();
  const before = await lab(() => {
    const a = window.__lab.atlas, keys = ['Pleura', 'Right main bronchus', 'Left main bronchus'];
    return keys.map(k => ({ name: k, exists: a.structures.has(k), hidden: a.structures.get(k)?.hiddenByUser }));
  });
  assert.ok(before.every(x => x.exists && x.hidden), 'licensed airway structures present, initially hidden: ' + JSON.stringify(before));
  const btn = page.getByTestId('respiratory-detail-toggle');
  assert.ok(await btn.isVisible(), 'detail control is discoverable');
  await btn.click();
  assert.equal(await lab(() => window.__lab.atlas.respiratoryDetailsShown), true);
  assert.equal(await lab(() => ['Pleura', 'Right main bronchus', 'Left main bronchus'].every(k => !window.__lab.atlas.structures.get(k).hiddenByUser)), true);
  assert.equal(await lab(() => window.__lab.atlas.groups.respiratory.visible), true);
  await shot('atlas-respiratory-detail-enabled');
  await page.getByTestId('respiratory-detail-toggle').click();
  assert.equal(await lab(() => window.__lab.atlas.respiratoryDetailsShown), false);
  assert.equal(await lab(() => ['Pleura', 'Right main bronchus', 'Left main bronchus'].every(k => window.__lab.atlas.structures.get(k).hiddenByUser)), true);
  await page.getByTestId('btn-showall').click();
});

await step('inspect tool: clicking an organ selects that atlas structure (not the probe)', async () => {
  await display('internal'); await camera('anterior');
  const c0 = await lab(() => window.__lab.S.contact.point);
  await page.getByTestId('tool-inspect').click();
  const p = await lab(() => { const s = window.__lab.atlas.structures.get('Liver'); const g = s.meshes[0].geometry; g.computeBoundingBox(); const c = g.boundingBox.getCenter(new (s.meshes[0].position.constructor)()); return window.__lab.scene.screenOf([c.x, c.y - 60, c.z]); });
  await page.mouse.click(p.x, p.y); await page.waitForTimeout(300);
  const info = await page.getByTestId('structure-info').textContent();
  assert.ok(!/Pilih struktur dari daftar/.test(info), 'something selected: ' + info.slice(0, 80));
  assert.deepEqual(await lab(() => window.__lab.S.contact.point), c0, 'probe unchanged by the inspect click');
  await page.getByTestId('tool-inspect').click(); await page.getByTestId('btn-showall').click();
});

await step('anterior, lateral and posterior examination by clicking the skin', async () => {
  await display('transparent'); await openTab('probe'); await page.getByTestId('mode-clinical').click();
  const lm = await lab(() => window.__lab.data.anatomy.auscultation);
  const site = (k) => lm.find((s) => s.key === k);
  await camera('anterior');
  let s = site('abd_llq'), c = await clickSkin(s.point, s.normal);
  assert.ok(Math.hypot(...c.point.map((v, i) => v - s.point[i])) < 25, 'anterior contact at the click ' + c.point.map((v) => v.toFixed(0)));
  assert.ok(c.normal[1] < -0.5, 'anterior normal');
  await settle();
  await shot('atlas-02-anterior-exam');
  await camera('right');
  s = site('lung_lat_r'); c = await clickSkin(s.point, s.normal);
  assert.ok(c.normal[0] < -0.5, 'right lateral normal ' + c.normal);
  await settle();
  const region = await page.getByTestId('contact-region').textContent();
  assert.ok(/kanan/.test(region), 'region readout: "' + region + '"');
  await shot('atlas-03-lateral-exam');
  await camera('posterior');
  s = site('lung_post_l'); c = await clickSkin(s.point, s.normal);
  assert.ok(c.normal[1] > 0.5, 'posterior normal ' + c.normal);
  await settle();
  await shot('atlas-04-posterior-exam');
  // a click on the leg (skin outside the CT box) does not move the probe
  await camera('whole');
  const before = await lab(() => window.__lab.S.contact.point);
  const leg = await lab(() => { // most anterior skin vertex of the right thigh, 200-240 mm below the CT box
    const ref = window.__lab.scene.meshes.skin.ref, zl = window.__lab.data.ct.bounds.lo[2]; let best = null;
    for (let i = 0; i < ref.length; i += 3) if (ref[i] < -40 && ref[i + 2] < zl - 200 && ref[i + 2] > zl - 240 && (!best || ref[i + 1] < best[1])) best = [ref[i], ref[i + 1], ref[i + 2]];
    return window.__lab.scene.screenOf([best[0], best[1] - 2, best[2]]);
  });
  await page.mouse.click(leg.x, leg.y); await page.waitForTimeout(200);
  assert.deepEqual(await lab(() => window.__lab.S.contact.point), before, 'contact outside imaging coverage rejected');
  assert.match(await page.textContent('#loadStatus'), /di luar cakupan CT/);
  await camera('examiner');
});

await step('fixed contact point: rotate / heel-toe / rock change the image, never the contact', async () => {
  await pause(); await goView('subxiphoid'); await camera('examiner'); await settle();
  let f;
  const c0 = await lab(() => window.__lab.S.contact.point), h0 = (await canvasStats('#monitor')).hash;
  await setNumber('angle-rotate', -20); await setNumber('angle-heeltoe', -25); await setNumber('angle-rock', 15);
  f = await frameId(); await nextFrame(f);
  const pose = await lab(() => ({ c: window.__lab.S.contact.point, a: window.__lab.S.angles }));
  assert.deepEqual(pose.c, c0, 'contact unchanged');
  assert.deepEqual([pose.a.rotate, pose.a.heelToe, pose.a.rock], [-20, -25, 15]);
  assert.notEqual((await canvasStats('#monitor')).hash, h0, 'image changed');
  await shot('atlas-06-angulation-fixed-contact');
});

await step('camera rotation and presets never change the scan', async () => {
  await pause(); await settle();
  const h0 = (await canvasStats('#monitor')).hash, id0 = await frameId();
  for (const v of ['posterior', 'left', 'head', 'anterior', 'examiner']) await camera(v);
  const box = await page.getByTestId('patient-canvas').boundingBox();
  await page.mouse.move(box.x + 40, box.y + box.height - 60); await page.mouse.down(); await page.mouse.move(box.x + 220, box.y + box.height - 140, { steps: 8 }); await page.mouse.up();
  await page.waitForTimeout(400);
  assert.equal(await frameId(), id0, 'no imaging re-render was requested by the camera');
  assert.equal((await canvasStats('#monitor')).hash, h0);
});

await step('free 3D: arbitrary oblique plane through the atlas CT, independent of the skin', async () => {
  await openTab('probe'); await page.getByTestId('mode-free').click();
  await page.getByTestId('free-oblique').click();
  await setNumber('free-pos-L', 30); await setNumber('free-pos-P', -20); await setNumber('free-pos-S', 50);
  await setNumber('free-ang-pitch', 25); await setNumber('free-ang-yaw', -35); await setNumber('free-ang-roll', 12);
  const f = await frameId(); await nextFrame(f);
  const st = await lab(() => ({ pos: window.__lab.S.free.position, out: window.__lab.last.ctOutside }));
  assert.deepEqual(st.pos, [30, -20, 50]);
  assert.ok(st.out < 0.05, 'plane inside the CT');
  const m = await canvasStats('#monitor'); assert.ok(m.std > 8, 'structured CT/US image');
  await display('internal'); await camera('examiner');
  await shot('atlas-07-free-oblique');
  await openTab('probe'); await page.getByTestId('mode-clinical').click(); await display('transparent');
});

await step('expanded monitor with zoom and pan', async () => {
  const w0 = (await page.locator('#monitorPanel').boundingBox()).width;
  await page.getByTestId('expand').click(); await page.waitForTimeout(400);
  const w1 = (await page.locator('#monitorPanel').boundingBox()).width;
  assert.ok(w1 > w0 * 1.5, `expanded ${w0} -> ${w1}`);
  const mb = await page.getByTestId('monitor-canvas').boundingBox();
  await page.mouse.move(mb.x + mb.width / 2, mb.y + mb.height / 2); for (let i = 0; i < 3; i++) { await page.mouse.wheel(0, -120); await page.waitForTimeout(40); }
  await page.mouse.down(); await page.mouse.move(mb.x + mb.width / 2 + 50, mb.y + mb.height / 2 + 15); await page.mouse.up();
  await shot('atlas-08-expanded-monitor');
  await page.getByTestId('fit').click(); await page.getByTestId('expand').click();
});

await step('dynamic heart: atlas heart meshes move with the SAME field that deforms the image', async () => {
  await goView('subxiphoid'); await display('transparent');
  await openTab('physiology');
  if (!(await lab(() => window.__lab.S.playing))) await page.getByTestId('play').click();
  await page.waitForTimeout(2500);
  const chk = await lab(() => {
    const L = window.__lab, s = L.atlas.structures.get('Left ventricle'), m = s.meshes[0], pos = m.geometry.attributes.position.array, ref = m.userData.ref;
    let maxMove = 0; for (let i = 0; i < ref.length; i += 30) maxMove = Math.max(maxMove, Math.hypot(pos[i] - ref[i], pos[i + 1] - ref[i + 1], pos[i + 2] - ref[i + 2]));
    return { maxMove, moving: L.atlasStats.moving, deformMs: L.atlasStats.deformMs, animated: s.animated };
  });
  assert.ok(chk.animated && chk.maxMove > 1, 'LV vertices moved ' + chk.maxMove.toFixed(1) + ' mm');
  // freeze and compare vertex displacement with physiology.displacement at the reference position
  await page.getByTestId('play').click();
  await page.waitForFunction(() => !window.__lab.S.playing && window.__lab.atlasStats.clockT === window.__lab.clock.t, null, { timeout: 20000 });
  const err = await lab(() => {
    const L = window.__lab, m = L.atlas.structures.get('Left ventricle').meshes[0], pos = m.geometry.attributes.position.array, ref = m.userData.ref;
    const f = L.physio.makeFrame(L.clock, L.physio.effectiveParams(), L.physio.geom), d = [0, 0, 0]; let worst = 0;
    for (const i of m.userData.moving.slice(0, 400)) { L.physio.displacement(f, ref[i], ref[i + 1], ref[i + 2], d); worst = Math.max(worst, Math.hypot(pos[i] - ref[i] - d[0], pos[i + 1] - ref[i + 1] - d[1], pos[i + 2] - ref[i + 2] - d[2])); }
    return worst;
  });
  assert.ok(err < 0.01, 'mesh displacement == imaging field, worst ' + err);
  await page.getByTestId('to-ed').click(); let f = await frameId(); await nextFrame(f); const ed = (await canvasStats('#monitor')).hash;
  await page.getByTestId('to-es').click(); f = await frameId(); await nextFrame(f); const es = (await canvasStats('#monitor')).hash;
  assert.notEqual(ed, es, 'ED and ES images differ');
  await openTab('anatomy'); await page.getByTestId('mark-animated').check();
  await page.getByTestId('play').click(); await page.waitForTimeout(800);
  await camera('anterior'); await shot('atlas-09-dynamic-heart');
  await page.getByTestId('mark-animated').uncheck();
  results.atlasDeform = chk;
});

await step('pathology + auscultation on the atlas body (effusion window, HFrEF S3 at the mitral area)', async () => {
  await openTab('pathology'); await page.getByTestId('scenario-effusion').click(); await page.waitForTimeout(800);
  assert.equal(await lab(() => window.__lab.S.view), 'right_flank');
  const eff = await lab(() => window.__lab.effusion?.volumeMl);
  assert.ok(eff > 600 && eff < 700, 'effusion volume ' + eff);
  await settle();
  assert.ok(await lab(() => !!window.__lab.scene.effusionMesh), '3D effusion layer present');
  await display('transparent'); await camera('right'); await shot('atlas-10a-effusion');
  await openTab('pathology'); await page.getByTestId('scenario-hfref').click(); await page.waitForTimeout(500);
  assert.equal(await lab(() => window.__lab.S.view), await lab(() => window.__lab.data.anatomy.suggestedViews.hfref));
  await openTab('ausc');
  await page.getByTestId('site-mitral').click(); await page.waitForTimeout(300);
  await page.getByTestId('audio-toggle').click();
  await page.waitForFunction(() => window.__lab.audio.ctx?.state === 'running' && window.__lab.audio.lastBeat >= 0, null, { timeout: 20000 });
  const st = await lab(() => ({ state: window.__lab.audio.ctx?.state, beat: window.__lab.audio.lastBeat }));
  assert.equal(st.state, 'running'); assert.ok(st.beat >= 0, 'heart beats scheduled');
  assert.match(await page.getByTestId('ausc-readout').textContent(), /S3 aktif/);
  await camera('anterior'); await shot('atlas-10b-hfref-auscultation');
  await page.getByTestId('audio-toggle').click(); await page.getByTestId('ws-imaging').click(); assert.equal(await lab(() => window.__lab.S.tool), 'probe');
  await openTab('pathology'); await page.getByTestId('scenario-normal').click();
});

await step('frames panel: atlas->LPS exact, atlas vs phantom explicitly NOT registered', async () => {
  await openTab('anatomy'); await page.getByTestId('frames-panel').locator('summary').click();
  const txt = await page.getByTestId('frames-panel').textContent();
  assert.match(txt, /Koordinat atlas/); assert.match(txt, /Koordinat probe/); assert.match(txt, /Koordinat dunia render/);
  assert.match(txt, /TIDAK diregistrasi/); assert.match(txt, /RMS \d+(\.\d)? mm/);
  assert.match(await page.getByTestId('atlas-matrix').textContent(), /1000/);
  await display('coverage'); await camera('examiner'); await shot('atlas-12-imaging-coverage-frames');
  await display('transparent');
});

await step('performance and memory on the atlas dataset (Chromium, software WebGL)', async () => {
  const m = await lab(() => ({ heap: performance.memory ? performance.memory.usedJSHeapSize / 1048576 : null, fps: window.__lab.stats.fps, tri: window.__lab.atlas.stats.triangles, verts: window.__lab.atlas.stats.vertices, loadMs: window.__lab.atlas.stats.loadMs, deform: window.__lab.atlasStats }));
  results.perf = { ...m, pageLoadToAtlasReadyMs: loadMs };
  assert.ok(m.heap === null || m.heap < 700, 'JS heap ' + m.heap);
  assert.deepEqual(errors, [], 'no runtime errors during the session');
});

await step('phantom dataset still available and keeps the atlas hidden (no false overlay)', async () => {
  const p2 = await ctx.newPage(); const e2 = []; p2.on('pageerror', (e) => e2.push(e.message));
  await page.close();
  await p2.goto(url + '?dataset=phantom', { timeout: 120000 }); await p2.waitForFunction(() => document.body.dataset.ready === '1', null, { timeout: 120000 });
  await p2.getByTestId('panel-toggle').click(); await p2.waitForTimeout(300); await p2.getByTestId('tab-anatomy').click(); // panel is a drawer (UX upgrade)
  assert.ok(await p2.getByTestId('atlas-not-registered').isVisible());
  assert.equal(await p2.evaluate(() => window.__lab.atlas), null, 'no atlas layer created for the phantom');
  assert.deepEqual(e2, []); await p2.close();
});

await browser.close(); srv.close();
results.push({ name: 'licence quarantine: no request for a withheld model', ok: withheldRequests.length === 0, error: withheldRequests.join(', ') || undefined });
console.log((withheldRequests.length ? 'FAIL ' : 'ok   ') + 'licence quarantine: no request for a withheld model');
const summary = { date: new Date().toISOString(), browser: 'Chromium (Playwright, headless, SwiftShader WebGL)', dataset: 'atlas', passed: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length, perf: results.perf, atlasDeform: results.atlasDeform, results };
await mkdir(EVIDENCE, { recursive: true });
if (!ONLY) await writeFile(EVIDENCE + 'atlas-e2e-results.json', JSON.stringify(summary, null, 2));
console.log(`\n${summary.passed} passed, ${summary.failed} failed · ${JSON.stringify(summary.perf)}`);
process.exitCode = summary.failed ? 1 : 0;

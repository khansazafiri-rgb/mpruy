// Licence quarantine (licensing/quarantine-policy.json): proves that withheld anatomy is absent from
// every public source folder, that the guard rejects it under any name, that no MEDCOEL server or
// stage script will serve or publish it, and that the pruned GLBs are lossless for kept structures.
//   node --test scripts/licensing-quarantine.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { scanDistribution, loadPolicy, assertDistributionClean } from '../licensing/tools/check-distribution.mjs';
import { readGlb, writeGlb, pruneGlb, structureNames } from '../licensing/tools/glb-prune.mjs';
import { createLabPreviewServer } from './preview-4d-lab.mjs';
import { createPreviewServer } from './anatomy-preview-server.mjs';
import { validateViewer } from './stage-anatomy.mjs';
import { validateLab } from './stage-4d-lab.mjs';

const repo = fileURLToPath(new URL('../', import.meta.url));
const ctx = loadPolicy();
const BASE_COMMIT = 'b931e1b'; // last commit before the quarantine (originals live only in history)
const fromHistory = (rel) => { try { return execFileSync('git', ['-C', repo, 'show', `${BASE_COMMIT}:${rel}`], { maxBuffer: 64 << 20 }); } catch { return null; } };
const tmp = async (t) => { const d = await fs.mkdtemp(path.join(os.tmpdir(), 'quarantine-')); t.after(() => fs.rm(d, { recursive: true, force: true })); return d; };
const tinyGlb = (nodes) => writeGlb({ asset: { version: '2.0' }, scenes: [{ nodes: nodes.map((_, i) => i) }], scene: 0, nodes }, Buffer.alloc(0));

test('every public source folder is free of withheld anatomy', () => {
  for (const dir of ['apps/anatomy/public', 'apps/4d-lab/public', 'apps/web/public']) {
    assert.deepEqual(scanDistribution(path.join(repo, dir), ctx), [], dir);
  }
  assert.equal(existsSync(path.join(repo, 'apps/anatomy/public/models/nervous.glb')), false);
});

test('no tracked file in the repository tip matches a withdrawn file', () => {
  const tracked = execFileSync('git', ['-C', repo, 'ls-files', '-z'], { maxBuffer: 64 << 20 }).toString().split('\0').filter((f) => f && /\.(glb|gltf|webp|jpe?g|png|nrrd|bin|mp4)$/i.test(f) && existsSync(path.join(repo, f)));
  assert.ok(tracked.length > 100);
  const hit = tracked.filter((f) => ctx.hashes.has(createHash('sha256').update(readFileSync(path.join(repo, f))).digest('hex')));
  assert.deepEqual(hit, []);
});

test('the guard rejects withheld anatomy under any name: path, bytes, GLB nodes, catalogue entries', async (t) => {
  const d = await tmp(t);
  await fs.mkdir(path.join(d, 'models'), { recursive: true }); await fs.mkdir(path.join(d, 'data'), { recursive: true });
  await fs.writeFile(path.join(d, 'models/nervous.glb'), tinyGlb([]));
  await fs.writeFile(path.join(d, 'models/renamed-organs.glb'), tinyGlb([{ name: 'Kidney_l', extras: { za_name: 'Kidney.l', za_system: 'visceral' } }]));
  await fs.writeFile(path.join(d, 'models/brain.glb'), tinyGlb([{ name: 'x', extras: { za_name: 'Precuneus.l', za_system: 'nervous' } }]));
  await fs.writeFile(path.join(d, 'data/atlas-catalog.json'), JSON.stringify({ 'Cochlea.l': { source: 'nervous' }, 'Incus.l': { source: 'skeletal' } }));
  const problems = scanDistribution(d, ctx).join('\n');
  assert.match(problems, /models\/nervous\.glb: path is withheld/);
  assert.match(problems, /renamed-organs\.glb: contains quarantined structure "Kidney\.l"/);
  assert.match(problems, /brain\.glb: contains nodes of quarantined system "nervous"/);
  assert.match(problems, /atlas-catalog\.json: lists quarantined structures Incus\.l/);
  assert.match(problems, /atlas-catalog\.json: 1 entries from quarantined systems/);
  assert.throws(() => assertDistributionClean([d]), /Licence quarantine/);
  const original = fromHistory('apps/anatomy/public/models/nervous.glb');
  if (original) { // a renamed copy of the withdrawn bytes is still caught
    const e = path.join(d, 'innocent'); await fs.mkdir(e); await fs.writeFile(path.join(e, 'body.bin'), original);
    assert.match(scanDistribution(e, ctx).join('\n'), /identical to withdrawn file apps\/anatomy\/public\/models\/nervous\.glb/);
  }
});

test('stage scripts refuse to publish a build containing withheld anatomy (no release is created)', async (t) => {
  const d = await tmp(t);
  await fs.mkdir(path.join(d, 'models'), { recursive: true });
  await fs.writeFile(path.join(d, 'index.html'), '<script src="/anatomy/viewer/assets/a.js"></script><script src="/anatomy/4d-lab/assets/a.js"></script>');
  await fs.writeFile(path.join(d, 'models/nervous.glb'), tinyGlb([]));
  await assert.rejects(validateViewer(d), /Licence quarantine/);
  await assert.rejects(validateLab(d), /Licence quarantine/);
});

test('local servers never serve a withheld model, even from a stale build that still contains it', async (t) => {
  const d = await tmp(t);
  const atlas = path.join(d, 'atlas'), lab = path.join(d, 'lab'), main = path.join(d, 'main');
  for (const p of [path.join(atlas, 'models'), path.join(atlas, 'thumbnails/systems'), lab, main]) await fs.mkdir(p, { recursive: true });
  await fs.writeFile(path.join(atlas, 'models/nervous.glb'), tinyGlb([]));
  await fs.writeFile(path.join(atlas, 'models/skeletal.glb'), tinyGlb([]));
  await fs.writeFile(path.join(atlas, 'thumbnails/systems/nervous.webp'), 'RIFF....WEBP');
  await fs.writeFile(path.join(main, 'index.html'), 'MAIN');
  for (const server of [createLabPreviewServer({ atlas, lab, main }), createPreviewServer({ atlasRoot: atlas, mainRoot: main })]) {
    await new Promise((r) => server.listen(0, '127.0.0.1', r));
    t.after(() => server.close());
    const base = `http://127.0.0.1:${server.address().port}/anatomy/viewer/`;
    for (const p of ['models/nervous.glb', 'models/NERVOUS.glb', 'thumbnails/systems/nervous.webp']) {
      const res = await fetch(base + p); assert.equal(res.status, 404, p); assert.ok(!(await res.text()).includes('glTF'));
    }
    assert.equal((await fetch(base + 'models/skeletal.glb')).status, 200, 'cleared model still served');
  }
});

test('pruned atlas GLBs: quarantined nodes and their bytes are gone; kept structures are byte-identical', () => {
  for (const [sys, removed] of Object.entries(ctx.policy.quarantinedStructures)) {
    const now = readFileSync(path.join(repo, `apps/anatomy/public/models/${sys}.glb`));
    const { json } = readGlb(now);
    for (const n of removed) assert.ok(!structureNames(json).includes(n), `${sys}.glb still has ${n}`);
    assert.match(json.asset.extras?.medcoelModificationNotice || '', /CC BY-SA 4\.0/, 'adaptation notice embedded');
    const original = fromHistory(`apps/anatomy/public/models/${sys}.glb`);
    if (!original) { t_skip(`${sys}: original not in local history`); continue; }
    // Re-pruning the original must give exactly the published file (deterministic, reproducible).
    const again = pruneGlb(original, removed, { note: json.asset.extras.medcoelModificationNotice }).glb;
    assert.ok(again.equals(now), `${sys}.glb is reproducible from the original`);
    // Kept geometry is byte-identical: compare each kept mesh's Draco stream with the original's.
    const o = readGlb(original), meshBytes = (g, i) => { const p = g.json.meshes[i].primitives[0], bv = g.json.bufferViews[p.extensions.KHR_draco_mesh_compression.bufferView]; return g.bin.subarray(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength); };
    const byName = new Map(o.json.nodes.map((n) => [n.extras?.za_name, n]));
    const g = readGlb(now); let compared = 0;
    for (const n of g.json.nodes) if (n.mesh !== undefined && n.extras?.za_name) {
      const on = byName.get(n.extras.za_name); assert.ok(on, n.extras.za_name);
      assert.ok(meshBytes(g, n.mesh).equals(meshBytes(o, on.mesh)), 'geometry changed: ' + n.extras.za_name); compared++;
    }
    assert.ok(compared > 100);
    // and none of the removed meshes' bytes survive anywhere in the new binary chunk
    for (const name of removed) { const on = byName.get(name); if (on?.mesh !== undefined) assert.equal(g.bin.indexOf(meshBytes(o, on.mesh)), -1, name + ' bytes still present'); }
  }
});
function t_skip(msg) { console.log('# skip: ' + msg); }

test('the policy, the Atlas viewer and the 4D Lab agree on what is withheld', async () => {
  const atlas = await import('../apps/anatomy/src/atlas/availability.js');
  const lab = await import('../apps/4d-lab/src/app/atlasLayer.js').catch(() => null); // needs three (lab deps)
  const systems = Object.keys(ctx.policy.quarantinedSystems).sort();
  assert.deepEqual([...atlas.QUARANTINED_SOURCES].sort(), systems);
  if (lab) assert.deepEqual([...lab.QUARANTINED_SYSTEMS].sort(), systems);
  const q = JSON.parse(readFileSync(path.join(repo, 'apps/anatomy/public/data/quarantine.json'), 'utf8'));
  for (const id of Object.values(ctx.policy.quarantinedStructures).flat()) assert.ok(q.structures.some((s) => s.id === id), id);
});

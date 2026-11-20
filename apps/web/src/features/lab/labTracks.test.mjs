import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import taxonomy from '../../../../../shared/lab-taxonomy.json' with { type: 'json' };
import { SYSTEMS, REGIONS } from '../anatomy/registry.mjs';
import { STUDY_MODES } from '../anatomy/study.mjs';
import { SCENARIOS } from '../../../../4d-lab/src/sim/pathology.js';
import { KIND_LABEL, TRACKS, TRACK_GROUPS, findTrack, nextStep, resolveSteps, trackHref, trackSummary } from './labTracks.js';

const app = readFileSync(new URL('../../App.jsx', import.meta.url), 'utf8');
const WS = ['imaging', 'ausc', 'physio', 'patho', 'learn'];

test('every track step points at real content or is explicitly planned', () => {
  const keys = new Set();
  for (const t of TRACKS) {
    assert.match(t.key, /^[a-z0-9-]+$/); assert.ok(!keys.has(t.key), 'track keys are unique across groups (progress is stored per key)'); keys.add(t.key);
    assert.ok(TRACK_GROUPS.some((g) => g.key === t.group), t.key);
    for (const d of t.disciplines) assert.ok(taxonomy.roots.some((r) => r.key === d), `${t.key}: discipline ${d}`);
    assert.equal(new Set(t.steps.map((s) => s.key)).size, t.steps.length, `${t.key}: unique step keys`);
    for (const s of t.steps) {
      const where = `${t.key}/${s.key}`;
      assert.ok(KIND_LABEL[s.kind], where);
      if (s.kind === 'planned') { assert.ok(s.reason, where); assert.ok(!s.href, where); continue; }
      if (s.system) assert.ok(SYSTEMS.some((x) => x.id === s.system), where);
      if (s.kind === 'module') { assert.ok(taxonomy.modules.some((m) => m.moduleKey === s.moduleKey && m.dataset === s.dataset), where); continue; }
      const url = new URL(s.href, 'https://medcoel.test');
      assert.equal(url.origin, 'https://medcoel.test', where);
      const p = url.pathname, q = url.searchParams;
      if (s.kind === 'live') {
        assert.equal(p, '/anatomy/live', where);
        if (q.has('scenario')) assert.ok(SCENARIOS[q.get('scenario')], where);
        if (q.has('ws')) assert.ok(WS.includes(q.get('ws')), where);
      } else if (s.kind === 'quiz') {
        assert.equal(p, '/anatomy/study', where);
        assert.ok(STUDY_MODES.some((m) => m.id === q.get('mode')), where);
        assert.ok(q.has('system') && (!q.get('system') || SYSTEMS.some((x) => x.id === q.get('system'))), where);
        assert.ok(REGIONS.some((r) => r.id === q.get('region')), where);
      } else if (s.kind === 'atlas') {
        const m = p.match(/^\/anatomy\/(system|region|library)(?:\/(\w+))?$/); assert.ok(m, where);
        if (m[1] === 'system') assert.ok(SYSTEMS.some((x) => x.id === m[2]), where);
        if (m[1] === 'region') assert.ok(REGIONS.some((x) => x.id === m[2]), where);
      } else if (s.kind === 'page') assert.ok(app.includes(`path="${p}"`), `${where}: route ${p} exists`);
    }
  }
});

test('the brief\'s proposed tracks exist; nothing empty pretends to be complete', () => {
  for (const [group, key] of [['sistem', 'dada-pernapasan'], ['sistem', 'jantung-kardiovaskular'], ['sistem', 'saraf-otak'], ['keterampilan', 'tekanan-darah'], ['keterampilan', 'auskultasi-jantung'], ['keterampilan', 'auskultasi-paru'], ['keterampilan', 'ekg']]) assert.ok(findTrack(group, key), key);
  assert.equal(findTrack('keterampilan', 'dada-pernapasan'), null);
  assert.equal(trackHref(findTrack('sistem', 'saraf-otak')), '/lab/sistem/saraf-otak');
  // Blood pressure: only the anatomy step exists; completing it is not "track done"? It is the only available step,
  // so done = 1/1 available but the summary still reports the track as partial.
  const bp = resolveSteps(findTrack('keterampilan', 'tekanan-darah'), { catalog: { modules: [], nodes: [], placements: [] } });
  const s = trackSummary(bp, { completed: ['arteri-lengan', 'korotkoff'] });
  assert.deepEqual([s.available, s.total, s.done, s.partial], [1, 3, 1, true]);
  // a planned step can never be counted even if the stored progress names it
  assert.ok(!bp.find((x) => x.key === 'korotkoff').available);
});

test('availability: withheld Atlas systems, unpublished modules and fallbacks', () => {
  const neuro = resolveSteps(findTrack('sistem', 'saraf-otak'), { catalog: { modules: [], nodes: [], placements: [] } });
  assert.match(neuro.find((s) => s.key === 'atlas-saraf').reason, /lisensi/);
  assert.match(neuro.find((s) => s.key === 'oct-retina').reason, /belum terbit/);
  assert.equal(trackSummary(neuro, null).available, 2);
  const catalog = { nodes: [{ key: 'pencitraan-medis' }], modules: [{ key: 'cxr-normal-pneumonia-v1', title: 'CXR' }], placements: [{ module: 'cxr-normal-pneumonia-v1', catalog: 'pencitraan-medis' }] };
  const chest = resolveSteps(findTrack('sistem', 'dada-pernapasan'), { catalog });
  assert.equal(chest.find((s) => s.key === 'cxr').href, '/lab/modul/cxr-normal-pneumonia-v1');
  const viaPathway = resolveSteps(findTrack('sistem', 'darah-imun'), { catalog: { modules: [], nodes: [], placements: [] }, pathways: [{ slug: 'bloodmnist-jalur', title: 'Darah' }] });
  assert.equal(viaPathway.find((s) => s.key === 'sel-darah').href, '/lab/jalur/bloodmnist-jalur');
  const none = resolveSteps({ steps: [{ key: 'x', kind: 'planned', reason: 'r' }] });
  assert.equal(trackSummary(none, null).status, 'soon');
});

test('summary and continue logic count only available steps', () => {
  const steps = [{ key: 'a', available: true }, { key: 'b', available: false }, { key: 'c', available: true }];
  assert.equal(trackSummary(steps, null).status, 'new');
  assert.equal(trackSummary(steps, { completed: [], lastStep: 'a' }).status, 'active');
  assert.equal(trackSummary(steps, { completed: ['a', 'c'] }).status, 'done');
  assert.equal(nextStep(steps, { completed: ['a'], lastStep: 'a' }).key, 'c');
  assert.equal(nextStep(steps, { completed: [], lastStep: 'c' }).key, 'c');
  assert.equal(nextStep(steps, { completed: ['a', 'c'] }), null);
});

test('clinical-review gate and missing Live 4D build make steps unavailable (and uncounted)', () => {
  const ekg = findTrack('keterampilan', 'ekg'), catalog = { modules: [], nodes: [], placements: [] };
  const closed = resolveSteps(ekg, { catalog });
  assert.match(closed.find((s) => s.key === 'konduksi').reason, /ditinjau pendidik klinis/);
  assert.equal(trackSummary(closed, { completed: ['konduksi', 'atlas-jantung'] }).done, 1);
  const open = resolveSteps(ekg, { catalog, features: { ecg: true } });
  assert.ok(open.find((s) => s.key === 'konduksi').available);
  const usg = findTrack('keterampilan', 'usg-dasar');
  assert.equal(trackSummary(resolveSteps(usg, { catalog, live: 'missing' }), null).status, 'soon');
  assert.match(resolveSteps(usg, { catalog, live: 'missing' })[0].reason, /belum terpasang/);
  assert.equal(trackSummary(resolveSteps(usg, { catalog }), null).available, 6);
});

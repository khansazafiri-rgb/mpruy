import test from 'node:test';
import assert from 'node:assert/strict';
import { createViewState, updateView, structureKey, visibleStructure, readSharedView, sharedViewPayload } from '../src/independent-atlas/viewState.js';

test('multiple systems, structure visibility and per-structure hide are independent', () => {
  const sternum = structureKey('skeletal', 'Sternum'), heart = structureKey('visceral', 'Heart');
  let state = createViewState();
  state = updateView(state, { type: 'system', system: 'visceral', enabled: true, valid: true });
  assert.deepEqual(state.enabled, ['skeletal', 'visceral']);
  state = updateView(state, { type: 'hide', key: sternum });
  assert.equal(visibleStructure(state, 'skeletal', 'Sternum', ['thorax']), false);
  assert.equal(visibleStructure(state, 'visceral', 'Heart', ['thorax']), true);
  state = updateView(state, { type: 'select', key: heart });
  state = updateView(state, { type: 'isolate', key: heart });
  assert.equal(visibleStructure(state, 'skeletal', 'Humerus', ['upperLimb']), false);
  assert.equal(visibleStructure(state, 'visceral', 'Heart', ['thorax']), true);
  state = updateView(state, { type: 'undo' });
  assert.equal(state.isolated, null);
  assert.equal(visibleStructure(state, 'skeletal', 'Humerus', ['upperLimb']), true);
  state = updateView(state, { type: 'restore' });
  assert.equal(state.hidden.length, 0);
  assert.deepEqual(state.enabled, ['skeletal', 'visceral']);
});

test('shared view restores only known structures, bounded camera and valid systems', () => {
  const key = structureKey('skeletal', 'Sternum');
  const base = updateView(createViewState(), { type: 'select', key });
  const parsed = readSharedView(sharedViewPayload(base, [1, 2, 3, 0, 1, 0]), ['skeletal'], new Set([key]));
  assert.equal(parsed.state.selected, key);
  assert.deepEqual(parsed.camera, [1, 2, 3, 0, 1, 0]);
  assert.deepEqual(parsed.state.history, []);
  const malicious = JSON.stringify({ version: 1, enabled: ['nervous', 'skeletal'],
    hidden: ['skeletal::not-in-catalog', key], selected: key,
    region: 'unknown', opacity: Infinity, camera: [0, 0, 0, 0, 0, 0] });
  const restored = readSharedView(malicious, ['skeletal'], new Set([key]));
  assert.deepEqual(restored.state.enabled, ['skeletal']);
  assert.deepEqual(restored.state.hidden, [key]);
  assert.equal(restored.state.selected, null);
  assert.equal(restored.state.region, 'whole');
  assert.equal(restored.camera, null);
  assert.equal(readSharedView('{invalid', ['skeletal'], new Set([key])), null);
  assert.equal(readSharedView('x'.repeat(9000), ['skeletal'], new Set([key])), null);
});

test('regional visibility, opacity bounds and invalid system actions are stable', () => {
  let state = createViewState();
  const original = state;
  state = updateView(state, { type: 'system', system: 'nervous', enabled: true, valid: false });
  assert.equal(state, original);
  state = updateView(state, { type: 'region', region: 'thorax' });
  assert.equal(visibleStructure(state, 'skeletal', 'Sternum', ['thorax']), true);
  assert.equal(visibleStructure(state, 'skeletal', 'Humerus', ['upperLimb']), false);
  state = updateView(state, { type: 'opacity', value: -9 });
  assert.equal(state.opacity, 0.15);
  state = updateView(state, { type: 'opacity', value: 19 });
  assert.equal(state.opacity, 1);
  state = updateView(state, { type: 'undo' });
  assert.equal(state.opacity, 0.15);
});

test('removing an isolated system must not blank the newly selected system', () => {
  const sternum = structureKey('skeletal', 'Sternum');
  let state = createViewState();
  state = updateView(state, { type: 'select', key: sternum });
  state = updateView(state, { type: 'isolate', key: sternum });
  state = updateView(state, { type: 'fade', key: sternum });
  state = updateView(state, { type: 'onlySystem', system: 'visceral', valid: true });
  assert.deepEqual(state.enabled, ['visceral']);
  assert.equal(state.selected, null);
  assert.equal(state.isolated, null, 'no stale isolation from removed skeleton');
  assert.equal(state.faded, null, 'no stale fade from removed skeleton');
  assert.equal(visibleStructure(state, 'visceral', 'Liver', ['abdomen']), true);
  state = updateView(state, { type: 'undo' });
  assert.deepEqual(state.enabled, ['skeletal']);
  assert.equal(state.isolated, sternum, 'single undo restores previous isolated view');
});

test('disabling one model group preserves other visible models even after isolation', () => {
  const sternum = structureKey('skeletal', 'Sternum');
  let state = updateView(createViewState(), { type: 'system', system: 'visceral', enabled: true, valid: true });
  state = updateView(state, { type: 'isolate', key: sternum });
  state = updateView(state, { type: 'system', system: 'skeletal', enabled: false, valid: true });
  assert.deepEqual(state.enabled, ['visceral']);
  assert.equal(state.isolated, null);
  assert.equal(visibleStructure(state, 'visceral', 'Liver', ['abdomen']), true);
});

test('search/picking reveals hidden structure and changes isolation without losing undo history', () => {
  const sternum = structureKey('skeletal', 'Sternum');
  const femur = structureKey('skeletal', 'Femur.r');
  let state = createViewState();
  state = updateView(state, { type: 'hide', key: femur });
  state = updateView(state, { type: 'isolate', key: sternum });
  assert.equal(visibleStructure(state, 'skeletal', 'Femur.r', ['lowerLimb']), false);
  state = updateView(state, { type: 'reveal', key: femur });
  assert.equal(state.selected, femur);
  assert.equal(state.isolated, null);
  assert.equal(state.hidden.includes(femur), false);
  assert.equal(visibleStructure(state, 'skeletal', 'Femur.r', ['lowerLimb']), true);
  state = updateView(state, { type: 'undo' });
  assert.equal(state.isolated, sternum);
  assert.equal(state.hidden.includes(femur), true);
  state = updateView(state, { type: 'opacity', value: 0 });
  assert.equal(state.opacity, 0.15, 'opacity must clamp to minimum rather than reset to fully opaque');
});

test('structure-specific opacity survives selection and undo, but rejects unknown URL keys', () => {
  const sternum = structureKey('skeletal', 'Sternum');
  const femur = structureKey('skeletal', 'Femur.r');
  let state = updateView(createViewState(), { type: 'structureOpacity', key: sternum, value: 0.42 });
  state = updateView(state, { type: 'select', key: femur });
  assert.equal(state.opacityByKey[sternum], 0.42);
  state = updateView(state, { type: 'structureOpacity', key: femur, value: -3 });
  assert.equal(state.opacityByKey[femur], 0.15);
  state = updateView(state, { type: 'undo' });
  assert.equal(state.opacityByKey[femur], undefined);
  const payload = JSON.parse(sharedViewPayload(state, [1, 2, 3, 0, 1, 0]));
  payload.opacityByKey['nervous::Withheld'] = 0.2;
  const restored = readSharedView(JSON.stringify(payload), ['skeletal'], new Set([sternum, femur]));
  assert.equal(restored.state.opacityByKey[sternum], 0.42);
  assert.equal(restored.state.opacityByKey['nervous::Withheld'], undefined);
});

test('redo restores hidden structures and new changes invalidate the redo branch', () => {
  const sternum = structureKey('skeletal', 'Sternum');
  let state = updateView(createViewState(), { type: 'hide', key: sternum });
  state = updateView(state, { type: 'undo' });
  assert.equal(state.hidden.length, 0);
  assert.equal(state.future.length, 1);
  state = updateView(state, { type: 'redo' });
  assert.deepEqual(state.hidden, [sternum]);
  state = updateView(state, { type: 'undo' });
  state = updateView(state, { type: 'region', region: 'thorax' });
  assert.equal(state.future.length, 0);
  assert.equal(updateView(state, { type: 'redo' }), state);
  const shared = JSON.parse(sharedViewPayload(state, [1, 2, 3, 0, 1, 0]));
  assert.equal('history' in shared || 'future' in shared, false, 'private action stacks stay out of share links');
});

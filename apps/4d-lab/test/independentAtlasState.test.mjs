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

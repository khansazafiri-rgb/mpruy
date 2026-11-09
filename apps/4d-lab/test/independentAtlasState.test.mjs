import test from 'node:test';
import assert from 'node:assert/strict';
import { createViewState, updateView, structureKey, visibleStructure } from '../src/independent-atlas/viewState.js';

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

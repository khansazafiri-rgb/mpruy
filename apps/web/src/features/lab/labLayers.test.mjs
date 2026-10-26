import assert from 'node:assert/strict';
import test from 'node:test';
import { PLANE_H, autoVisibility, clampDepth, depthFromKey, easeOutExplode, effectiveLayers, explodeOffsets, explodedLayout, guidedDepth, highlightOpacity, layerCaption, stepDepth, toggleLayer, wheelDepth } from './labLayers.js';

const layers = ['skin', 'muscle', 'rib', 'pleura', 'lung'].map((id, i) => ({ id, name: id.toUpperCase(), opacity: i === 4 ? 0.8 : 1 }));
const vis = (state) => effectiveLayers(layers, state).map((l) => (l.visible ? 1 : 0)).join('');

test('depth peels shallower layers away like a dissection', () => {
  assert.equal(vis({ depth: 0 }), '11111');
  assert.equal(vis({ depth: 2 }), '00111');
  assert.equal(vis({ depth: 4 }), '00001');
  assert.deepEqual(autoVisibility(layers, 1), { skin: false, muscle: true, rib: true, pleura: true, lung: true });
});
test('depth is clamped and stepping stays in range', () => {
  assert.equal(clampDepth(-3, 5), 0); assert.equal(clampDepth(99, 5), 4); assert.equal(clampDepth(NaN, 5), 0); assert.equal(clampDepth(2.4, 5), 2);
  assert.equal(stepDepth(0, 5, -1), 0); assert.equal(stepDepth(4, 5, 1), 4); assert.equal(stepDepth(1, 5, 1), 2);
});
test('manual toggles start from what is visible and override depth', () => {
  const m = toggleLayer(layers, 2, null, 'skin'); // at depth 2 skin is hidden; toggling shows it
  assert.equal(vis({ depth: 2, manual: m }), '10111');
  const m2 = toggleLayer(layers, 2, m, 'rib'); assert.equal(vis({ depth: 2, manual: m2 }), '10011');
  assert.equal(vis({ depth: 2, manual: null }), '00111', 'reset to depth mode');
});
test('opacity overrides are clamped and default to the layer value', () => {
  const [, , , , lung] = effectiveLayers(layers, { opacity: {} }); assert.equal(lung.opacity, 0.8);
  assert.equal(effectiveLayers(layers, { opacity: { lung: 4 } })[4].opacity, 1);
  assert.equal(effectiveLayers(layers, { opacity: { lung: -1 } })[4].opacity, 0);
  assert.equal(effectiveLayers(layers, { opacity: { lung: 0.4 } })[4].opacity, 0.4);
});
test('caption names the current layer', () => {
  assert.equal(layerCaption(layers, 3), 'Lapisan 4 dari 5: PLEURA'); assert.equal(layerCaption(layers, 99), 'Lapisan 5 dari 5: LUNG');
});
test('guided steps map to layer depth', () => {
  assert.equal(guidedDepth(layers, { layer: 'rib' }), 2); assert.equal(guidedDepth(layers, { layer: 'x' }), 0);
});
test('exploded offsets collapse at 0, spread symmetrically, and are ordered superficial to deep', () => {
  assert.ok(explodeOffsets(5, 0, 0.6, 400).every((o) => o.dy === 0 && o.dx === 0));
  const full = explodeOffsets(5, 1, 0.6, 400);
  assert.equal(full[0].dy, -full[4].dy); assert.equal(full[2].dy, 0); assert.ok(full[0].dy < full[1].dy);
  assert.equal(Math.round(full[4].dy - full[0].dy), 240);
  assert.equal(explodeOffsets(1, 1, 1, 400)[0].dy, 0);
  assert.deepEqual(explodeOffsets(3, 7, 1, 100), explodeOffsets(3, 1, 1, 100), 'explode is clamped to 0..1');
});
test('highlight dims the other layers only when something is selected', () => {
  assert.equal(highlightOpacity(1, '', 'skin'), 1); assert.equal(highlightOpacity(1, 'rib', 'rib'), 1); assert.equal(highlightOpacity(1, 'rib', 'skin'), 0.28);
});
test('keyboard mapping for the depth control', () => {
  assert.equal(depthFromKey('ArrowRight', 1, 5), 2); assert.equal(depthFromKey('ArrowLeft', 0, 5), 0); assert.equal(depthFromKey('End', 0, 5), 4); assert.equal(depthFromKey('Home', 3, 5), 0); assert.equal(depthFromKey('a', 3, 5), null);
});

test('wheel depth: steps after a threshold, accumulates small deltas, and never captures at the ends', () => {
  assert.deepEqual(wheelDepth(2, 8, 100, 0), { depth: 3, acc: 0, consume: true });
  assert.deepEqual(wheelDepth(2, 8, -100, 0), { depth: 1, acc: 0, consume: true });
  const small = wheelDepth(2, 8, 20, 0); assert.deepEqual(small, { depth: 2, acc: 20, consume: true });
  assert.equal(wheelDepth(2, 8, 50, small.acc).depth, 3, 'accumulated trackpad deltas cross the threshold');
  assert.equal(wheelDepth(0, 8, -100, 0).consume, false, 'page scrolls on at the superficial end');
  assert.equal(wheelDepth(7, 8, 100, 0).consume, false, 'page scrolls on at the deep end');
  assert.equal(wheelDepth(3, 8, 0, 0).consume, false);
});
test('exploded layout: 0% compact, 50% clearly separated, 100% has no sheet overlap, view grows with layers', () => {
  const n = 8; const at = (e) => explodedLayout(n, e, 1);
  assert.ok(at(0).offsets.every((o) => o.dy === 0)); assert.equal(at(0).step, 0);
  assert.ok(at(1).step >= PLANE_H, `full step ${at(1).step} must be >= sheet height ${PLANE_H}`);
  assert.ok(at(0.5).step > PLANE_H * 0.7, '50% is already clearly separated');
  assert.ok(easeOutExplode(0.5) > 0.5, 'ease-out curve');
  const full = at(1).offsets; for (let i = 1; i < n; i++) assert.ok(full[i].dy - full[i - 1].dy >= PLANE_H - 0.001, `sheets ${i - 1}/${i} overlap`);
  assert.ok(explodedLayout(8, 1).viewH > explodedLayout(4, 1).viewH);
  const top = full[0].dy - PLANE_H / 2; const bottom = full[n - 1].dy + PLANE_H / 2; assert.ok(bottom - top <= at(1).viewH, 'all sheets fit inside the viewBox');
  assert.ok(explodedLayout(8, 1, 0.5).step < at(1).step, 'authored gap < 1 stays tighter');
});

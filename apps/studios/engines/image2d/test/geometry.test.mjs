import assert from 'node:assert/strict';
import { test } from 'node:test';
import { pointInPolygon, measure } from '../geometry.js';
test('IMG-001 point in polygon (convex and concave)', () => {
  const sq = [[0, 0], [10, 0], [10, 10], [0, 10]];
  assert.equal(pointInPolygon([5, 5], sq), true); assert.equal(pointInPolygon([15, 5], sq), false);
  const L = [[0, 0], [10, 0], [10, 3], [3, 3], [3, 10], [0, 10]];
  assert.equal(pointInPolygon([2, 8], L), true); assert.equal(pointInPolygon([8, 8], L), false);
});
test('IMG-002 measurements are in mm only with a calibrated pixel spacing', () => {
  assert.deepEqual(measure([0, 0], [3, 4], [0.5, 0.5]), { value: 2.5, unit: 'mm' });
  assert.deepEqual(measure([0, 0], [3, 4], null), { value: 5, unit: 'px' });
});

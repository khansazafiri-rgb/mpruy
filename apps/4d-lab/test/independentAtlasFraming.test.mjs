import test from 'node:test';
import assert from 'node:assert/strict';
import { fitDistance } from '../src/independent-atlas/framing.js';

test('whole body fills roughly three quarters of a desktop viewport', () => {
  const distance = fitDistance([0.8, 1.8, 0.35], [0, 0, 1], 44, 1.6);
  const heightFraction = 1.8 / (2 * (distance - 0.175) * Math.tan(22 * Math.PI / 180));
  assert.ok(heightFraction >= 0.65 && heightFraction <= 0.85, `occupancy ${heightFraction}`);
  assert.ok(distance < 3.3, 'must not leave the full body tiny in empty canvas');
});

test('box corners fit in wide, narrow and top-view cameras', () => {
  const size = [1.2, 1.8, 0.6], fov = 44;
  for (const aspect of [0.55, 1, 1.6, 2.5]) for (const direction of [[0, 0, 1], [1, 0, 0], [0, 1, 0]]) {
    const distance = fitDistance(size, direction, fov, aspect);
    const nearDepth = direction[0] * size[0] / 2 + direction[1] * size[1] / 2 + direction[2] * size[2] / 2;
    assert.ok(distance > nearDepth);
    const vertical = direction[1] ? size[2] : size[1];
    const horizontal = direction[0] ? size[2] : size[0];
    const vFraction = vertical / (2 * (distance - nearDepth) * Math.tan(fov * Math.PI / 360));
    const hFraction = horizontal / (2 * (distance - nearDepth) * Math.tan(fov * Math.PI / 360) * aspect);
    assert.ok(vFraction < 0.82 && hFraction < 0.82, `${aspect} ${direction}: ${vFraction}, ${hFraction}`);
  }
});

test('fit rejects invalid camera geometry', () => {
  assert.throws(() => fitDistance([1, NaN, 1], [0, 0, 1], 44, 1), RangeError);
  assert.throws(() => fitDistance([1, 1, 1], [0, 0, 0], 44, 1), RangeError);
  assert.throws(() => fitDistance([1, 1, 1], [0, 0, 1], 44, 0), RangeError);
});

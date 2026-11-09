import test from 'node:test';
import assert from 'node:assert/strict';
import { AXIS, moveFree, findSkinContact } from '../src/app/navigation.js';

test('LPS anatomical movement is explicit and camera-independent', () => {
  assert.deepEqual(moveFree([0, 0, 0], 'left', 12), [12, 0, 0]);
  assert.deepEqual(moveFree([0, 0, 0], 'right', 12), [-12, 0, 0]);
  assert.deepEqual(moveFree([0, 0, 0], 'anterior', 12), [0, -12, 0]);
  assert.deepEqual(moveFree([0, 0, 0], 'posterior', 12), [0, 12, 0]);
  assert.deepEqual(moveFree([0, 0, 0], 'superior', 12), [0, 0, 12]);
  assert.deepEqual(moveFree([0, 0, 0], 'inferior', 12), [0, 0, -12]);
  assert.equal(Object.keys(AXIS).length, 6);
  assert.equal(moveFree([1, 2, 3], 'unknown'), null);
});
test('clinical nudge stays on available surface and preserves a normal', () => {
  const positions = new Float32Array([0,-20,0, 10,-20,0, 20,-20,0, 10,20,0]);
  const normals = new Float32Array([0,-1,0, 0,-1,0, 0,-1,0, 0,1,0]);
  const contact = { point:[0,-20,0], normal:[0,-1,0] };
  const bounds = {lo:[-100,-100,-100],hi:[100,100,100]};
  assert.deepEqual(findSkinContact({contact,positions,normals,direction:'left',millimetres:10,coverage:bounds})?.point,[10,-20,0]);
  assert.deepEqual(findSkinContact({contact,positions,normals,direction:'posterior',millimetres:10,coverage:bounds})?.point,[10,20,0]);
  assert.equal(findSkinContact({contact,positions,normals,direction:'left',millimetres:10,coverage:{lo:[-5,-10,-5],hi:[5,10,5]}}),null);
});

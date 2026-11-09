import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldShowImagingPlane } from '../src/app/sceneVisibility.js';

test('3D USG/CT overlay is hidden while a stethoscope is the active instrument', () => {
  for (const ws of ['imaging','ausc','learn','physio','patho'])
    assert.equal(shouldShowImagingPlane({ws, tool:'stethoscope'}), false, ws);
});

test('the auscultation workspace never shows a scan plane, even after a late CT frame', () => {
  for (const tool of ['probe','stethoscope','inspect'])
    assert.equal(shouldShowImagingPlane({ws:'ausc',tool}), false, tool);
});

test('the scan overlay can return when leaving auscultation for the probe', () => {
  for (const ws of ['imaging','learn','physio','patho'])
    assert.equal(shouldShowImagingPlane({ws,tool:'probe'}), true, ws);
});

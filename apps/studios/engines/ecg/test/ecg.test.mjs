import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseHeader, decodeFormat16, detectRPeaks, heartRate, interval, toMv } from '../wfdb.js';
import { syntheticEcg } from '../../../tools/make-ecg-fixture.mjs';

test('ECG-001 WFDB header: fs, samples, gain/baseline/units and lead names', () => {
  const h = parseHeader('r 2 500 4\nr.dat 16 1000.0(0)/mV 16 0 7 10 0 I\nr.dat 16 1000.0(5)/mV 16 0 -3 -1 0 II\n');
  assert.equal(h.fs, 500); assert.equal(h.samples, 4); assert.equal(h.signals[1].baseline, 5); assert.equal(h.signals[0].units, 'mV'); assert.equal(h.signals[1].lead, 'II');
  assert.equal(toMv(1005, h.signals[1]), 1);
});
test('ECG-002 format-16 decoding verifies column checksums and initial values', () => {
  const h = parseHeader('r 2 500 2\nr.dat 16 1000/mV 16 0 7 10 0 I\nr.dat 16 1000/mV 16 0 -3 -1 0 II\n');
  const b = Buffer.alloc(8); b.writeInt16LE(7, 0); b.writeInt16LE(-3, 2); b.writeInt16LE(3, 4); b.writeInt16LE(2, 6);
  const adu = decodeFormat16(h, b); assert.deepEqual(Array.from(adu[0]), [7, 3]);
  b.writeInt16LE(4, 4); assert.throws(() => decodeFormat16(h, b), /CHECKSUM_I/);
});
test('ECG-003 R-peak detection and heart rate on a synthetic signal with known RR', () => {
  for (const rr of [1.0, 0.75, 0.5]) {
    const { mv, beats } = syntheticEcg({ rr: () => rr });
    const p = detectRPeaks(mv, 500), hr = heartRate(p, 500);
    assert.equal(p.length, beats.length, 'every beat found once at RR ' + rr);
    assert.ok(Math.abs(hr.bpm - 60 / rr) < 1, hr.bpm + ' vs ' + 60 / rr);
    assert.ok(hr.rrSdMs < 5);
  }
  let s = 3; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const irr = syntheticEcg({ rr: () => 0.55 + rnd() * 0.5 });
  assert.ok(heartRate(detectRPeaks(irr.mv, 500), 500).rrSdMs > 80, 'irregular rhythm has a large RR spread');
});
test('ECG-004 caliper interval in ms and the rate implied by an R-R interval', () => {
  assert.deepEqual(interval(100, 600, 500), { ms: 1000, bpmIfRr: 60 });
  assert.equal(Math.round(interval(0, 400, 500).bpmIfRr), 75);
});

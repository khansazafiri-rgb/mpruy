import assert from 'node:assert/strict';
import test from 'node:test';
import { NORMAL, PAPER, RHYTHMS, beats, measure, phaseAt, practiceRound, rhythmByKey, sample, stripPath } from './ecgModel.js';

test('every rhythm reads back the teaching numbers it was built from', () => {
  const m = Object.fromEntries(RHYTHMS.map((r) => [r.key, measure(r)]));
  assert.ok(m.sinus.ventricularRate >= NORMAL.hr[0] && m.sinus.ventricularRate <= NORMAL.hr[1] && m.sinus.regular);
  assert.ok(m.bradikardia.ventricularRate < 60 && m.bradikardia.regular);
  assert.ok(m.takikardia.ventricularRate > 100 && m.takikardia.regular);
  for (const k of ['sinus', 'bradikardia', 'takikardia']) assert.ok(m[k].prMin >= NORMAL.pr[0] && m[k].prMax <= NORMAL.pr[1], k);
  assert.ok(m.avb1.prMin > 200 && m.avb1.prMin === m.avb1.prMax && m.avb1.dropped === 0);
  assert.ok(m.wenckebach.dropped >= 1 && m.wenckebach.prMax > m.wenckebach.prMin && !m.wenckebach.regular);
  for (const r of RHYTHMS) assert.ok(r.qrs < NORMAL.qrs[1], `${r.key}: narrow QRS`);
  // rate from big boxes (300 / boxes) agrees with the exact rate for regular rhythms
  for (const k of ['sinus', 'bradikardia', 'takikardia', 'avb1']) assert.ok(Math.abs(m[k].rateFromBoxes - m[k].ventricularRate) <= 1, k);
});

test('Wenckebach: PR lengthens beat to beat, then one P is not conducted', () => {
  const list = beats(rhythmByKey('wenckebach'), 6000).slice(0, 4);
  assert.ok(list[0].pr < list[1].pr && list[1].pr < list[2].pr);
  assert.equal(list[3].qrs, null);
  assert.equal(phaseAt(list, list[3].p + 120).key, 'blocked');
});

test('waveform shape: R is the tallest deflection, baseline returns to ~0, values finite', () => {
  const list = beats(rhythmByKey('sinus'), 3000), b = list[0];
  const r = sample(list, b.qrs + 40), p = sample(list, b.p + 45), t = sample(list, b.t);
  assert.ok(r > 0.9 && r > 3 * p && r > 2 * t && p > 0.1 && t > 0.2);
  assert.ok(Math.abs(sample(list, b.qrs + 260 - 160)) < 0.25);
  assert.ok(Math.abs(sample(list, 50)) < 0.01);
  for (let x = 0; x < 3000; x += 7) assert.ok(Number.isFinite(sample(list, x)));
  const d = stripPath(list, 1000); assert.ok(d.startsWith('M0.00 ')); assert.equal(d.split('L').length, 251);
  assert.equal(PAPER.bigBoxMs, 5 * PAPER.smallBoxMs);
});

test('conduction phases follow SA → atria → AV → His → ventricles → T for a sinus beat', () => {
  const list = beats(rhythmByKey('sinus'), 2000), b = list[0];
  const seq = [b.p + 5, b.p + 50, b.p + 120, b.qrs - 10, b.qrs + 40, b.qrs + 150, b.t].map((t) => phaseAt(list, t).key);
  assert.deepEqual(seq, ['sa', 'atria', 'av', 'his', 'ventricles', 'plateau', 'repol']);
});

test('practice rounds are deterministic and well formed', () => {
  assert.deepEqual(practiceRound(7), practiceRound(7));
  for (const q of practiceRound(3, 8)) { assert.equal(q.options.length, 4); assert.ok(q.options.includes(q.answer)); assert.equal(new Set(q.options).size, 4); }
  assert.equal(new Set(practiceRound(11).map((q) => q.answer)).size, 5);
});

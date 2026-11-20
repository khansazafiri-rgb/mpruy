#!/usr/bin/env node
// TECHNICAL FIXTURE for the ECG studio: synthetic 12-lead waveform from Gaussian P-QRS-T templates, 500 Hz, fixed RR
// (1.0 s = 60 bpm) or jittered RR. Not a recording of any person; every descriptor says so.
import fs from 'node:fs';
import path from 'node:path';
const LEADS = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'];
export function syntheticEcg({ fs = 500, seconds = 10, rr = () => 1.0, scale = 1 } = {}) {
  const n = fs * seconds, mv = new Float32Array(n), beats = [];
  for (let t = 0.4; t < seconds - 0.4; t += rr()) beats.push(t);
  const g = (x, mu, sd, a) => a * Math.exp(-((x - mu) ** 2) / (2 * sd * sd));
  for (let i = 0; i < n; i++) { const x = i / fs; let v = 0; for (const b of beats) v += g(x, b - 0.16, 0.025, 0.12) + g(x, b - 0.02, 0.01, -0.1) + g(x, b, 0.012, 1.1) + g(x, b + 0.025, 0.012, -0.25) + g(x, b + 0.28, 0.05, 0.3); mv[i] = v * scale; }
  return { mv, beats };
}
export function makeEcgFixture(outDir) {
  fs.mkdirSync(path.join(outDir, 'data/cases'), { recursive: true }); fs.mkdirSync(path.join(outDir, 'server'), { recursive: true });
  let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const cases = { f1: syntheticEcg({}), f2: syntheticEcg({ rr: () => 0.55 + rnd() * 0.5 }) };
  for (const [id, sig] of Object.entries(cases)) {
    fs.writeFileSync(path.join(outDir, 'data/cases', id + '.json'), JSON.stringify({ schema: 'medcoel.ecg.v1', caseId: id, fs: 500, samples: sig.mv.length, units: 'mV', paperSpeedMmPerS: 25, gainMmPerMv: 10,
      leads: LEADS.map((lead, k) => ({ lead, gainAduPerMv: 1000, baselineAdu: 0, adu: Array.from(sig.mv, v => Math.round(v * 1000 * (k === 3 ? -1 : 1))) })) }));
  }
  fs.writeFileSync(path.join(outDir, 'data/labels.json'), JSON.stringify({ schema: 'medcoel.ecg-labels.v1', source: 'technical fixture', cases: { f1: { scp: 'FIXTURE', label: 'Fixture teratur (sintetis)', teaching: 'Sinyal sintetis teratur 60 bpm.' }, f2: { scp: 'FIXTURE', label: 'Fixture tidak teratur (sintetis)', teaching: 'Sinyal sintetis dengan R-R acak.' } } }));
  fs.writeFileSync(path.join(outDir, 'data/dataset.json'), JSON.stringify({ schema: 'medcoel.dataset.v1', status: 'TECHNICAL_FIXTURE', source: 'MEDCOEL synthetic waveform', notice: 'FIXTURE TEKNIS: gelombang EKG sintetis untuk pengujian. Bukan rekaman pasien, bukan diagnosis.', cases: ['f1', 'f2'], labels: 'data/labels.json', guidedCase: 'f1' }));
  fs.writeFileSync(path.join(outDir, 'server/challenge.json'), JSON.stringify({ schema: 'medcoel.challenge.v1', source: 'technical fixture', count: 2, items: [
    { id: 'ecg-f1', prompt: { kind: 'ecg-interpretation', caseId: 'f1', text: 'Ritme sintetis ini…' }, options: ['Teratur', 'Tidak teratur'], answer: { index: 0 }, canonical: 'Teratur', explanation: 'Fixture teknis.' },
    { id: 'ecg-f2', prompt: { kind: 'ecg-interpretation', caseId: 'f2', text: 'Ritme sintetis ini…' }, options: ['Teratur', 'Tidak teratur'], answer: { index: 1 }, canonical: 'Tidak teratur', explanation: 'Fixture teknis.' }] }));
  fs.writeFileSync(path.join(outDir, 'data/NOTICE-FIXTURE.txt'), 'MEDCOEL technical fixture: synthetic waveform, MIT. Not a patient recording.\n');
}

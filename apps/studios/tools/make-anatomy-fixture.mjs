#!/usr/bin/env node
// TECHNICAL FIXTURE for anatomy 3D studios: neutral boxes/spheres in a valid GLB with opaque node ids. Not anatomy.
import fs from 'node:fs';
import path from 'node:path';
import { writeGlb } from './prepare-bp3d-region.mjs';

function box(cx, cy, cz, s) {
  const P = [], I = [];
  const c = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]];
  for (const [x, y, z] of c) P.push(cx + x * s, cy + y * s, cz + z * s);
  for (const f of [[0, 2, 1], [0, 3, 2], [4, 5, 6], [4, 6, 7], [0, 1, 5], [0, 5, 4], [2, 3, 7], [2, 7, 6], [1, 2, 6], [1, 6, 5], [0, 4, 7], [0, 7, 3]]) I.push(...f);
  const N = new Float32Array(P.length); for (let i = 0; i < P.length; i += 3) { const v = [P[i] - cx, P[i + 1] - cy, P[i + 2] - cz], m = Math.hypot(...v); N[i] = v[0] / m; N[i + 1] = v[1] / m; N[i + 2] = v[2] / m; }
  return { P: new Float32Array(P), N, I: new Uint32Array(I) };
}
export function makeAnatomyFixture(outDir, { studioId } = {}) {
  const shapes = [['s001', 'Fixture block A (left)', 'left', [30, 0, 0]], ['s002', 'Fixture block B (right)', 'right', [-30, 0, 0]], ['s003', 'Fixture block C (midline)', 'midline', [0, 0, 40]], ['s004', 'Fixture block D (midline)', 'midline', [0, 0, -40]]];
  fs.mkdirSync(path.join(outDir, 'data'), { recursive: true }); fs.mkdirSync(path.join(outDir, 'server'), { recursive: true });
  fs.writeFileSync(path.join(outDir, 'data/model.glb'), writeGlb(shapes.map(([id, , , c]) => Object.assign(box(...c, 12), { id }))));
  const structures = shapes.map(([id, nameEn, side]) => ({ id, fma: 'FIXTURE-' + id, nameEn, side, group: 'Fixture' }));
  fs.writeFileSync(path.join(outDir, 'data/structures.json'), JSON.stringify({ schema: 'medcoel.structures.v1', source: 'technical fixture', terminologyReview: 'not-applicable', groups: ['Fixture'], structures }));
  fs.writeFileSync(path.join(outDir, 'data/dataset.json'), JSON.stringify({ schema: 'medcoel.dataset.v1', status: 'TECHNICAL_FIXTURE', source: 'MEDCOEL synthetic geometry', model: 'data/model.glb', structures: 'data/structures.json',
    notice: 'FIXTURE TEKNIS: balok sintetis untuk pengujian ' + studioId + '. Bukan anatomi, bukan data pasien.', guidedTargets: { select: 's001', isolate: 's003' } }));
  const items = structures.flatMap((s, n) => [
    { id: 'identify-' + s.id, prompt: { kind: 'identify', highlight: s.id, text: 'Balok yang disorot adalah… (fixture)' }, options: structures.map(o => o.nameEn), answer: { index: n }, canonical: s.nameEn, explanation: 'Fixture teknis.' },
    { id: 'find-' + s.id, prompt: { kind: 'find', text: 'Klik: ' + s.nameEn }, options: [], answer: { structureId: s.id }, canonical: s.nameEn, explanation: 'Fixture teknis.' },
    { id: 'typed-' + s.id, prompt: { kind: 'typed', highlight: s.id, text: 'Ketik nama balok yang disorot (fixture)' }, options: [], answer: { conceptId: s.fma, side: s.side === 'midline' ? null : s.side }, canonical: s.nameEn, explanation: 'Fixture teknis.' }]);
  fs.writeFileSync(path.join(outDir, 'server/challenge.json'), JSON.stringify({ schema: 'medcoel.challenge.v1', source: 'technical fixture', count: 12, items }));
  // Approved ONLY as engineering test terminology for fixture blocks (no anatomical claim).
  const concepts = Object.fromEntries(structures.map(s => [s.fma, { canonical: { id: s.nameEn, en: s.nameEn, la: s.nameEn }, forms: [
    { language: 'en', value: s.nameEn.replace(/ \(.*\)$/, '') + (s.side === 'midline' ? '' : ' ' + s.side), side: s.side === 'midline' ? undefined : s.side },
    { language: 'id', value: s.nameEn.replace('Fixture block', 'Balok fixture').replace(/ \(.*\)$/, '') + (s.side === 'left' ? ' kiri' : s.side === 'right' ? ' kanan' : ''), side: s.side === 'midline' ? undefined : s.side }] }]));
  fs.writeFileSync(path.join(outDir, 'server/terminology.json'), JSON.stringify({ schema: 'medcoel.terminology.v1', status: 'approved', scope: 'engineering-fixture-only', reviewer: 'Engineering test (not anatomical review)', concepts }));
  fs.writeFileSync(path.join(outDir, 'data/NOTICE-FIXTURE.txt'), 'MEDCOEL technical fixture. Original synthetic geometry, MIT. Not anatomy.\n');
}

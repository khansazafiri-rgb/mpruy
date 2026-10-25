import assert from 'node:assert/strict';
import test from 'node:test';
import { annotationLayers, assetLabel, crumbs, fittedSize, groupAssets, objectHref, pathNeighbors, sessionSummary } from './labUtils.js';

test('assetLabel membaca field, judul, atau alt', () => {
  assert.equal(assetLabel({ dataset: { label: 'Pneumonia' }, title: 'x · normal' }), 'pneumonia', 'structured metadata wins over legacy title');
  assert.equal(assetLabel({ label: 'Normal' }), 'normal');
  assert.equal(assetLabel({ title: 'PneumoniaMNIST test #12 · pneumonia' }), 'pneumonia');
  assert.equal(assetLabel({ title: 'x', alt: "dengan label dataset 'normal'." }), 'normal');
  assert.equal(assetLabel({ title: 'Gambar sel' }), '');
});

test('groupAssets menaruh normal di depan dan menomori kasus per kelompok', () => {
  const mk = (label, n) => ({ id: `${label}${n}`, title: `t · ${label}` });
  const groups = groupAssets([mk('pneumonia', 1), mk('normal', 1), mk('pneumonia', 2), mk('normal', 2)], 'Chest X-ray');
  assert.deepEqual(groups.map((g) => g.key), ['normal', 'pneumonia']);
  assert.deepEqual(groups[1].items.map((i) => i.caseNo), [1, 2]);
  assert.equal(groups[0].title, 'Normal');
  assert.equal(groupAssets([{ id: 'a', title: 'Gambar sel' }])[0].title, 'Contoh gambar');
});

test('fittedSize menjaga rasio, batas lebar/tinggi, dan tidak memperbesar berlebihan', () => {
  assert.deepEqual(fittedSize(224, 224, 1000, 900), { w: 560, h: 560 });
  assert.deepEqual(fittedSize(224, 224, 300, 900), { w: 300, h: 300 });
  const big = fittedSize(4000, 2000, 1200, 1000);
  assert.equal(big.w / big.h, 2);
  assert.ok(big.w <= 900 && big.h <= 700);
  const portrait = fittedSize(1000, 2000, 1200, 1000);
  assert.ok(portrait.h <= 700 && portrait.w * 2 === portrait.h);
  assert.equal(fittedSize(0, 0, 500, 500), null);
});

test('annotationLayers hanya mengembalikan lapisan yang ada', () => {
  assert.deepEqual(annotationLayers({ annotations: [] }), []);
  assert.deepEqual(annotationLayers({}), []);
  assert.deepEqual(annotationLayers({ annotations: [{ layer: 'abnormality' }] }), ['abnormality']);
  assert.deepEqual(annotationLayers({ annotations: [{ layer: 'abnormality' }, { layer: 'anatomy' }] }), ['anatomy', 'abnormality']);
});

test('pathNeighbors dan objectHref menjaga konteks jalur', () => {
  const steps = [{ slug: 'a' }, { slug: 'b' }, { slug: 'c' }];
  const mid = pathNeighbors(steps, 'b');
  assert.equal(mid.index, 1); assert.equal(mid.total, 3); assert.equal(mid.prev.slug, 'a'); assert.equal(mid.next.slug, 'c');
  assert.equal(pathNeighbors(steps, 'a').prev, null);
  assert.equal(pathNeighbors(steps, 'c').next, null);
  assert.equal(pathNeighbors(steps, 'z'), null);
  assert.equal(objectHref('x'), '/lab/objek/x');
  assert.equal(objectHref('x', 'cxr dasar'), '/lab/objek/x?jalur=cxr%20dasar');
});

test('crumbs berbeda untuk Guided dan Explore', () => {
  const guided = crumbs({ title: 'T', pathway: { slug: 'p', title: 'CXR Dasar' } });
  assert.deepEqual(guided.map((c) => c.label), ['Lab', 'Guided Learning', 'CXR Dasar', 'T']);
  assert.equal(guided.at(-1).to, undefined);
  const explore = crumbs({ title: 'T', domain: 'imaging', domainTitle: 'Medical Imaging', modality: 'Chest X-ray' });
  assert.deepEqual(explore.map((c) => c.label), ['Lab', 'Medical Imaging', 'Chest X-ray', 'T']);
});

test('sessionSummary menghitung benar, salah, dan soal untuk ditinjau', () => {
  const qs = [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }];
  const answers = { 1: { result: { correct: true } }, 2: { result: { correct: false } }, 4: { result: { selfAssessment: true } } };
  const s = sessionSummary(qs, answers);
  assert.deepEqual({ total: s.total, answered: s.answered, correct: s.correct, wrong: s.wrong }, { total: 4, answered: 3, correct: 1, wrong: 1 });
  assert.deepEqual(s.review, ['2', '3']);
});

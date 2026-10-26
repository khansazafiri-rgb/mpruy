import assert from 'node:assert/strict';
import test from 'node:test';
import { annotationLayers, assetLabel, crumbs, fittedSize, groupAssets, isPracticeFirst, navStatus, objectHref, pathNeighbors, pathwayState, sessionSummary, sessionTitle, stepState, summaryLine } from './labUtils.js';

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

test('Path/OCT headings translate source labels without changing source metadata', () => {
  const grouped = groupAssets([
    { id: 'p', dataset: { name: 'PathMNIST', label: 'colorectal adenocarcinoma epithelium' } },
    { id: 'o', dataset: { name: 'OCTMNIST', label: 'diabetic macular edema' } },
  ]);
  assert.deepEqual(grouped.map((g) => g.title), ['Epitel adenokarsinoma kolorektal', 'Diabetic macular edema (DME)']);
  assert.deepEqual(grouped.map((g) => g.key), ['colorectal adenocarcinoma epithelium', 'diabetic macular edema']);
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

const steps = [{ slug: 'a' }, { slug: 'b' }];
test('pathwayState: not started offers step 1; in progress resumes; completed offers NO resume (never lesson 1)', () => {
  const none = pathwayState(steps, [], ''); assert.equal(none.status, 'new'); assert.equal(none.resume.slug, 'a');
  const mid = pathwayState(steps, ['a'], 'a'); assert.equal(mid.status, 'active'); assert.equal(mid.resume.slug, 'b'); assert.equal(mid.done, 1);
  const open = pathwayState(steps, [], 'b'); assert.equal(open.status, 'active'); assert.equal(open.resume.slug, 'b', 'resumes where the learner stopped');
  const done = pathwayState(steps, ['a', 'b'], 'a'); assert.equal(done.status, 'done'); assert.equal(done.resume, null); assert.equal(done.done, 2);
  assert.equal(pathwayState([], [], '').status, 'new');
});
test('stepState marks done / current / todo', () => {
  assert.equal(stepState(steps[0], ['a'], steps[1]), 'done'); assert.equal(stepState(steps[1], ['a'], steps[1]), 'current'); assert.equal(stepState(steps[1], [], null), 'todo');
});
test('navStatus distinguishes current, correct, wrong, self-assessed, skipped and new', () => {
  const answers = { 1: { result: { correct: true } }, 2: { result: { correct: false } }, 3: { result: { selfAssessment: true, correct: null } } };
  const visited = new Set(['4']); const ctx = { answers, visited, currentId: '5' };
  const st = (id) => navStatus({ id }, ctx);
  assert.deepEqual(['1', '2', '3', '4', '5', '6'].map(st), ['correct', 'wrong', 'answered', 'skipped', 'current', 'new']);
  assert.equal(navStatus({ id: '1' }, { ...ctx, currentId: '1' }), 'current');
});
test('session summary counts unanswered and titles ended sessions honestly', () => {
  const qs = Array.from({ length: 20 }, (_, i) => ({ id: String(i + 1) }));
  const answers = { 1: { result: { correct: true } }, 2: { result: { correct: false } }, 3: { result: { correct: false } } };
  const s = sessionSummary(qs, answers);
  assert.equal(summaryLine(s), '1 benar · 2 salah · 17 belum dijawab'); assert.equal(s.unanswered, 17);
  assert.equal(sessionTitle(s, null), 'Sesi diakhiri'); assert.equal(sessionTitle(s, [1]), 'Tinjauan selesai');
  const all = sessionSummary(qs.slice(0, 1), { 1: { result: { correct: true } } }); assert.equal(sessionTitle(all, null), 'Sesi latihan selesai');
});
test('isPracticeFirst only for practice objects that have cases', () => {
  assert.equal(isPracticeFirst({ kind: 'practice', questions: [{}] }), true); assert.equal(isPracticeFirst({ kind: 'practice', questions: [] }), false);
  assert.equal(isPracticeFirst({ kind: 'lesson', questions: [{}] }), false); assert.equal(isPracticeFirst(null), false);
});

test('Blood gallery headings are Indonesian; source labels and Pneumonia behavior stay intact', () => {
  const labels = ['basophil', 'eosinophil', 'erythroblast', 'immature granulocytes', 'lymphocyte', 'monocyte', 'neutrophil', 'platelet'];
  const assets = labels.map((label) => ({ dataset: { name: 'BloodMNIST', label } }));
  assert.deepEqual(groupAssets(assets).map((g) => g.title), ['Basofil', 'Eosinofil', 'Eritroblas', 'Granulosit imatur', 'Limfosit', 'Monosit', 'Neutrofil', 'Trombosit']);
  assert.deepEqual(assets.map(assetLabel), labels);
  assert.equal(groupAssets([{ dataset: { name: 'Other', label: 'basophil' } }])[0].title, 'Basophil');
});

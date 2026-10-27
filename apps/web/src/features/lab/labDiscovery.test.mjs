import assert from 'node:assert/strict';
import test from 'node:test';
import { ACADEMIC_ROOTS, authoredExplore, authoredPractice, authoredRootOptions, disciplineFor, disciplineTitle, exploreItems, groupByDiscipline, guidedPathways, labSections, modulePath, normalizeDiscipline, publishedReplacements } from './labDiscovery.js';

const catalog = {
  nodes: [{ key: 'oftalmologi', title: 'Oftalmologi', parent: '' },
    { key: 'oct-retina', title: 'OCT Retina', parent: 'oftalmologi' },
    { key: 'patologi', title: 'Patologi', parent: '' }],
  placements: [{ key: 'oct-home', catalog: 'oct-retina', module: 'oct-retina-dasar-v1' },
    { key: 'oct-second', catalog: 'oftalmologi', module: 'oct-retina-dasar-v1' },
    { key: 'unpublished', catalog: 'patologi', module: 'draft-only' }],
  modules: [{ key: 'oct-retina-dasar-v1', title: 'Dasar Interpretasi OCT Retina', summary: 'Pengenalan OCT.' }],
};

test('published authored module joins Explore once and has its existing URL', () => {
  const cards = authoredExplore(catalog);
  assert.equal(cards.length, 1);
  assert.equal(cards[0].href, '/lab/modul/oct-retina-dasar-v1');
  assert.equal(cards[0].domainTitle, 'Oftalmologi');
  assert.equal(cards[0].modality, 'OCT Retina');
  assert.equal(authoredExplore(catalog, { page: 2 }).length, 0);
});

test('dynamic root filter and title, summary, root and child search', () => {
  assert.equal(authoredRootOptions(catalog).filter((item) => item.key === 'oftalmologi').length, 1);
  assert.equal(authoredExplore(catalog, { domain: 'catalog:oftalmologi' }).length, 1);
  assert.equal(authoredExplore(catalog, { domain: 'imaging' }).length, 0);
  for (const q of ['OCT', 'retina', 'oftalmologi', 'pengenalan']) assert.equal(authoredExplore(catalog, { q }).length, 1);
  assert.equal(authoredExplore(catalog, { q: 'jantung' }).length, 0);
});

test('unpublished module cannot be discovered even with a stale placement', () => {
  assert.ok(!authoredExplore(catalog).some((card) => card.href.includes('draft-only')));
  assert.ok(!authoredRootOptions(catalog).some((option) => option.title === 'Patologi'));
});

test('module path shows discipline then topic, and is empty when unknown', () => {
  assert.deepEqual(modulePath(catalog, 'oct-retina-dasar-v1'), ['Oftalmologi', 'OCT Retina']);
  assert.deepEqual(modulePath(catalog, 'draft-only'), []);
  assert.deepEqual(modulePath(null, 'x'), []);
});

test('seven canonical roots normalize legacy links without duplicate filters', () => {
  assert.deepEqual(ACADEMIC_ROOTS.map((root) => root.key), ['pencitraan-medis', 'oftalmologi', 'histologi-histopatologi', 'patologi-klinik', 'mikrobiologi', 'parasitologi', 'anatomi']);
  const options = authoredRootOptions(catalog);
  assert.equal(options.length, 7); assert.equal(new Set(options.map((item) => item.title)).size, 7);
  assert.equal(normalizeDiscipline('clinical_pathology'), 'patologi-klinik');
  assert.equal(normalizeDiscipline('catalog:patologi-klinik'), 'patologi-klinik');
  assert.equal(normalizeDiscipline('histology'), 'histologi-histopatologi');
  for (const [dataset, root] of [['pathmnist', 'histologi-histopatologi'], ['bloodmnist', 'patologi-klinik'], ['pneumoniamnist', 'pencitraan-medis'], ['octmnist', 'oftalmologi']]) {
    assert.equal(disciplineFor({ slug: dataset + '-belajar', domain: 'clinical_pathology' }), root);
  }
  assert.equal(disciplineTitle({ slug: 'pathmnist-belajar-komponen-dasar', domain: 'clinical_pathology' }), 'Histologi & Histopatologi');
});

test('published replacements win once, including legacy Path/Blood groups and dataset search', () => {
  const path = { nodes: [{ key: 'histologi-histopatologi', title: 'Histologi & Histopatologi' }, { key: 'histologi-kolorektal', title: 'Histologi Kolorektal', parent: 'histologi-histopatologi' }],
    modules: [{ key: 'histologi-kolorektal-pathmnist-v1', title: 'Pola Jaringan Histologi Kolorektal', summary: 'Bandingkan pola jaringan.' }],
    placements: [{ module: 'histologi-kolorektal-pathmnist-v1', catalog: 'histologi-kolorektal' }, { module: 'histologi-kolorektal-pathmnist-v1', catalog: 'histologi-histopatologi' }] };
  const legacy = [{ id: 'path1', slug: 'pathmnist-belajar-komponen-dasar', domain: 'clinical_pathology' }, { id: 'path2', slug: 'pathmnist-latihan-komponen-dasar', domain: 'clinical_pathology' }, { id: 'blood', slug: 'bloodmnist-belajar-granulosit', domain: 'clinical_pathology' }];
  assert.deepEqual(publishedReplacements(path), ['pathmnist']);
  assert.equal(exploreItems(legacy, path).length, 2);
  assert.equal(exploreItems(legacy, path, { domain: 'patologi-klinik' }).length, 1);
  assert.equal(exploreItems(legacy, path, { domain: 'histology' })[0].href, '/lab/modul/histologi-kolorektal-pathmnist-v1');
  for (const q of ['PathMNIST', 'H&E', 'jaringan', 'Histologi', 'Kolorektal']) assert.equal(authoredExplore(path, { q }).length, 1);
  assert.equal(authoredExplore(path, { domain: 'clinical_pathology' }).length, 0);
  assert.equal(exploreItems(legacy, { ...path, modules: [] }).length, 3);
  assert.equal(exploreItems(legacy, { ...path, placements: [] }).length, 3);
  assert.equal(exploreItems(legacy, path, { page: 2 }).some((item) => item.id === 'path1'), false);
});

test('Explore groups follow the seven canonical roots; legacy and authored items share a discipline', () => {
  const item = (id, extra) => ({ id, title: id, ...extra });
  const { groups, soon } = groupByDiscipline(exploreItems([
    item('hema', { slug: 'bloodmnist-belajar-granulosit', domain: 'clinical_pathology', modality: 'Hematologi' }),
    item('cxr', { domain: 'imaging', modality: 'Chest X-Ray' }),
  ], null));
  assert.deepEqual(groups.map((g) => g.title), ['Pencitraan Medis', 'Patologi Klinik']);
  assert.deepEqual(groups[0].topics.map((t) => t.title), ['Chest X-Ray']);
  assert.deepEqual(soon.map((r) => r.key), ['oftalmologi', 'histologi-histopatologi', 'mikrobiologi', 'parasitologi', 'anatomi']);
  assert.equal(groupByDiscipline([]).soon.length, 7);
});

test('an unknown discipline is shown after the canonical ones, never dropped', () => {
  const { groups } = groupByDiscipline([{ id: 'a', title: 'A', domain: 'imaging' }, { id: 'b', title: 'B', academicRoot: 'disiplin-baru', domainTitle: 'Disiplin Baru' }].map((x) => ({ academicRoot: x.academicRoot || disciplineFor(x), ...x })));
  assert.equal(groups.at(-1).title, 'Disiplin Baru');
  assert.equal(groups[0].key, 'pencitraan-medis');
});

const pathCatalog = { nodes: [{ key: 'histologi-histopatologi', title: 'Histologi & Histopatologi' }, { key: 'histologi-kolorektal', title: 'Histologi Kolorektal', parent: 'histologi-histopatologi' }],
  modules: [{ key: 'histologi-kolorektal-pathmnist-v1', title: 'Pola Jaringan Histologi Kolorektal', summary: 'Bandingkan pola jaringan.', practice: [{ key: 'identifikasi', title: 'Latihan identifikasi', count: 18 }] }],
  placements: [{ module: 'histologi-kolorektal-pathmnist-v1', catalog: 'histologi-kolorektal' }] };

test('Explore lists every practice bank and links straight into practice mode', () => {
  const [bank] = authoredPractice(pathCatalog);
  assert.equal(bank.kind, 'practice'); assert.equal(bank.cases, 18); assert.equal(bank.academicRoot, 'histologi-histopatologi');
  assert.equal(bank.href, '/lab/modul/histologi-kolorektal-pathmnist-v1?latihan=identifikasi');
  assert.equal(authoredPractice(pathCatalog, { page: 2 }).length, 0);
  assert.equal(authoredPractice({ ...pathCatalog, modules: [{ ...pathCatalog.modules[0], practice: undefined }] }).length, 0);
});

test('Guided gets lessons and modules; Explore gets practice, including legacy practice not yet replaced', () => {
  const legacy = [{ id: 'blood-learn', slug: 'bloodmnist-belajar-granulosit', domain: 'clinical_pathology', kind: 'lesson' },
    { id: 'blood-quiz', slug: 'bloodmnist-latihan-granulosit', domain: 'clinical_pathology', kind: 'practice', cases: 6 },
    { id: 'path-quiz', slug: 'pathmnist-latihan-1', domain: 'clinical_pathology', kind: 'practice', cases: 6 }];
  const { learn, practice } = labSections(legacy, pathCatalog);
  assert.deepEqual(learn.map((i) => i.id), ['blood-learn', 'authored:histologi-kolorektal-pathmnist-v1']);
  assert.deepEqual(practice.map((i) => i.id), ['blood-quiz', 'practice:histologi-kolorektal-pathmnist-v1:identifikasi']);
});

test('Guided hides a replaced legacy pathway unless the student already started it', () => {
  const paths = [{ id: 'p1', slug: 'pathmnist-jalur', title: 'Jalur PathMNIST', status: 'new' }, { id: 'p2', slug: 'pathmnist-jalur-2', title: 'Jalur lain', status: 'active' },
    { id: 'p3', slug: 'bloodmnist-jalur', title: 'Jalur sel darah', status: 'new' }];
  assert.deepEqual(guidedPathways(paths, pathCatalog).map((p) => p.id), ['p2', 'p3']);
  assert.deepEqual(guidedPathways(paths, null).map((p) => p.id), ['p1', 'p2', 'p3']);
  assert.deepEqual(guidedPathways(paths, null, { domain: 'patologi-klinik' }).map((p) => p.id), ['p3']);
  assert.deepEqual(guidedPathways(paths, null, { q: 'darah' }).map((p) => p.id), ['p3']);
  assert.equal(guidedPathways(paths, null)[2].type, 'pathway');
});

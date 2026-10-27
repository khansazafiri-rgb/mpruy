import taxonomy from '../../../../../shared/lab-taxonomy.json' with { type: 'json' };

export const ACADEMIC_ROOTS = taxonomy.roots;
const modules = taxonomy.modules;
const titleFor = (key) => ACADEMIC_ROOTS.find((root) => root.key === key)?.title || key;
export function normalizeDiscipline(value = '') {
  const key = value.replace(/^catalog:/, '');
  return ACADEMIC_ROOTS.find((root) => root.key === key || root.aliases.includes(key) || root.title === key)?.key || key;
}
export const authoredDomain = normalizeDiscipline;
export function datasetFor(item) {
  return modules.find((module) => module.dataset === item.datasetKey || module.moduleKey === item.key ||
    (item.slug || '').startsWith(module.dataset + '-'));
}
export function disciplineFor(item) {
  return datasetFor(item)?.root || normalizeDiscipline(item.academicRoot || item.domain || '');
}
export const disciplineTitle = (item) => titleFor(disciplineFor(item));

function rootFor(node, nodes) {
  const seen = new Set(); let current = node;
  while (current?.parent && !seen.has(current.key)) {
    seen.add(current.key); current = nodes.get(current.parent);
  }
  return current && !current.parent ? current : null;
}

export function publishedReplacements(catalog) {
  if (!catalog) return [];
  const nodes = new Map((catalog.nodes || []).map((node) => [node.key, node]));
  const published = new Set((catalog.modules || []).map((module) => module.key));
  return modules.filter((module) => published.has(module.moduleKey) && (catalog.placements || []).some((placement) =>
    placement.module === module.moduleKey && rootFor(nodes.get(placement.catalog), nodes))).map((module) => module.dataset);
}

// The catalog endpoint supplies published snapshots only. Stable module URLs remain unchanged.
export function authoredExplore(catalog, { q = '', domain = '', page = 1 } = {}) {
  if (!catalog || page !== 1) return [];
  const nodes = new Map((catalog.nodes || []).map((node) => [node.key, node]));
  const published = new Map((catalog.modules || []).map((module) => [module.key, module]));
  const needle = q.trim().toLocaleLowerCase(); const found = new Map();
  for (const placement of catalog.placements || []) {
    const node = nodes.get(placement.catalog), module = published.get(placement.module);
    const root = rootFor(node, nodes);
    if (!node || !module || !root) continue;
    const canonical = ACADEMIC_ROOTS.find((item) => item.key === normalizeDiscipline(root.key) || item.title === root.title);
    const dataset = datasetFor(module), discipline = dataset?.root || canonical?.key || root.key;
    if (domain && normalizeDiscipline(domain) !== discipline) continue;
    const domainTitle = ACADEMIC_ROOTS.find((item) => item.key === discipline)?.title || root.title;
    const searchable = [module.title, module.summary, domainTitle, node.title, dataset?.keywords].join(' ').toLocaleLowerCase();
    if (needle && !searchable.includes(needle)) continue;
    if (!found.has(module.key)) found.set(module.key, {
      id: `authored:${module.key}`, kind: 'lesson', title: module.title, summary: module.summary,
      academicRoot: discipline, datasetKey: dataset?.dataset,
      domainTitle, modality: dataset?.childTitle || node.title,
      href: `/lab/modul/${encodeURIComponent(module.key)}`,
    });
  }
  return [...found.values()];
}

export function authoredRootOptions() {
  return ACADEMIC_ROOTS.map(({ key, title }) => ({ key, title }));
}

export function exploreItems(legacy, catalog, query = {}) {
  const replacements = new Set(publishedReplacements(catalog));
  const domain = normalizeDiscipline(query.domain || '');
  return [...legacy.filter((item) => !replacements.has(datasetFor(item)?.dataset) && (!domain || disciplineFor(item) === domain))
    .map((item) => ({ ...item, domainTitle: disciplineTitle(item), academicRoot: disciplineFor(item),
      modality: datasetFor(item)?.childTitle || item.modality })), ...authoredExplore(catalog, query)];
}

// "Pencitraan Medis › Chest X-Ray": jejak letak modul di katalog, dari penempatan pertamanya.
// Bidang memakai judul kanonik; [] bila katalog belum dimuat atau modul tidak ditempatkan.
export function modulePath(catalog, moduleKey) {
  if (!catalog || !(catalog.modules || []).some((m) => m.key === moduleKey)) return [];
  const nodes = new Map((catalog.nodes || []).map((n) => [n.key, n]));
  const placement = (catalog.placements || []).find((p) => p.module === moduleKey && nodes.has(p.catalog));
  if (!placement) return [];
  const chain = []; const seen = new Set(); let current = nodes.get(placement.catalog);
  while (current && !seen.has(current.key)) { seen.add(current.key); chain.unshift(current); current = current.parent ? nodes.get(current.parent) : null; }
  const root = chain[0]; const canonical = root && ACADEMIC_ROOTS.find((r) => r.key === normalizeDiscipline(root.key) || r.title === root.title);
  return chain.map((node, i) => (i === 0 && canonical ? canonical.title : node.title));
}

// Susunan Explore: Bidang (urutan akademik tetap) > topik > modul. Bidang tanpa item masuk `soon`;
// bidang di luar tujuh yang kanonik tetap ditampilkan setelahnya supaya konten terbit tidak hilang.
export function groupByDiscipline(items = []) {
  const buckets = new Map();
  for (const item of items) {
    const key = item.academicRoot || disciplineFor(item) || 'lainnya';
    if (!buckets.has(key)) buckets.set(key, { key, title: ACADEMIC_ROOTS.some((r) => r.key === key) ? titleFor(key) : item.domainTitle || key, topics: new Map(), count: 0 });
    const bucket = buckets.get(key); const topic = String(item.modality || '').trim();
    if (!bucket.topics.has(topic)) bucket.topics.set(topic, []);
    bucket.topics.get(topic).push(item); bucket.count += 1;
  }
  const rank = (key) => { const i = ACADEMIC_ROOTS.findIndex((r) => r.key === key); return i < 0 ? ACADEMIC_ROOTS.length : i; };
  const groups = [...buckets.values()].sort((a, b) => rank(a.key) - rank(b.key))
    .map((g) => ({ key: g.key, title: g.title, count: g.count, topics: [...g.topics].map(([title, list]) => ({ title, items: list })) }));
  return { groups, soon: ACADEMIC_ROOTS.filter((r) => !buckets.has(r.key)) };
}

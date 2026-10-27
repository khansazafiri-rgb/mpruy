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

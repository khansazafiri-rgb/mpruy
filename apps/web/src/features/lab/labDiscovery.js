// Adapt the published authoring catalog to the ordinary Explore cards.
// The student endpoint only returns published nodes, placements and modules.
export const authoredDomain = (key) => `catalog:${key}`;

function rootFor(node, nodes) {
  const seen = new Set(); let current = node;
  while (current?.parent && !seen.has(current.key)) {
    seen.add(current.key);
    current = nodes.get(current.parent);
  }
  return current && !current.parent ? current : null;
}

export function authoredExplore(catalog, { q = '', domain = '', page = 1 } = {}) {
  if (!catalog || page !== 1) return [];
  const nodes = new Map((catalog.nodes || []).map((n) => [n.key, n]));
  const modules = new Map((catalog.modules || []).map((m) => [m.key, m]));
  const needle = q.trim().toLocaleLowerCase(); const found = new Map();
  for (const placement of catalog.placements || []) {
    const node = nodes.get(placement.catalog), module = modules.get(placement.module);
    const root = rootFor(node, nodes);
    if (!node || !module || !root || (domain && domain !== authoredDomain(root.key))) continue;
    const searchable = [module.title, module.summary, root.title, node.title].join(' ').toLocaleLowerCase();
    if (needle && !searchable.includes(needle)) continue;
    if (!found.has(module.key)) found.set(module.key, {
      id: `authored:${module.key}`, kind: 'lesson', title: module.title, summary: module.summary,
      domainTitle: root.title, modality: node.title,
      href: `/lab/modul/${encodeURIComponent(module.key)}`,
    });
  }
  return [...found.values()];
}

export function authoredRootOptions(catalog) {
  if (!catalog) return [];
  const nodes = new Map((catalog.nodes || []).map((n) => [n.key, n]));
  const modules = new Set((catalog.modules || []).map((m) => m.key));
  const roots = new Map();
  for (const placement of catalog.placements || []) {
    if (!modules.has(placement.module)) continue;
    const root = rootFor(nodes.get(placement.catalog), nodes);
    if (root) roots.set(root.key, { key: authoredDomain(root.key), title: root.title });
  }
  return [...roots.values()].sort((a, b) => a.title.localeCompare(b.title, 'id'));
}

// Compatibility mapping for legacy records. Stored domains and URLs are not rewritten.
const DOMAINS = { imaging: 'pencitraan-medis', clinical_pathology: 'patologi-klinik', histology: 'histologi-histopatologi', microbiology: 'mikrobiologi', parasitology: 'parasitologi', anatomy: 'anatomi' };
const DATASETS = { pneumoniamnist: 'pencitraan-medis', octmnist: 'oftalmologi', pathmnist: 'histologi-histopatologi', bloodmnist: 'patologi-klinik' };
const TITLES = { 'pencitraan-medis': 'Pencitraan Medis', oftalmologi: 'Oftalmologi', 'histologi-histopatologi': 'Histologi & Histopatologi', 'patologi-klinik': 'Patologi Klinik', mikrobiologi: 'Mikrobiologi', parasitologi: 'Parasitologi', anatomi: 'Anatomi' };
function normalize(value) { const key = (value || '').replace(/^catalog:/, ''); return DOMAINS[key] || ({ histologi: 'histologi-histopatologi', 'medical-imaging': 'pencitraan-medis' })[key] || key; }
function dataset(slug) { return Object.keys(DATASETS).find((key) => (slug || '').indexOf(key + '-') === 0) || ''; }
function classify(slug, domain) { const datasetKey = dataset(slug); return { datasetKey, academicRoot: DATASETS[datasetKey] || normalize(domain) }; }
// Match the same source identities as classify before applying pagination.
function filter(root) {
  root = normalize(root);
  const clauses = Object.keys(DATASETS).filter((key) => DATASETS[key] === root).map((key) => `slug ~ '${key}-%'`);
  const domains = Object.keys(DOMAINS).filter((key) => DOMAINS[key] === root);
  const otherDatasets = Object.keys(DATASETS).map((key) => `slug !~ '${key}-%'`).join(' && ');
  domains.forEach((domain) => clauses.push(`(domain = '${domain}' && ${otherDatasets})`));
  return clauses.length ? '(' + clauses.join(' || ') + ')' : '';
}
function searchFilter(query) {
  const needle = query.trim().toLowerCase();
  return Object.keys(TITLES).filter((root) => TITLES[root].toLowerCase().includes(needle)).map(filter).filter(Boolean).join(' || ');
}
function excluded(value) { return (value || '').split(',').filter((key) => Object.prototype.hasOwnProperty.call(DATASETS, key)); }
module.exports = { DOMAINS, DATASETS, TITLES, normalize, classify, filter, searchFilter, excluded };

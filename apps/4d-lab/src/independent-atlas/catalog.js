// New MEDCOEL independent-viewer pilot: UI-level metadata selection only.
// The catalog and meshes are separately distributed assets whose commercial
// provenance still requires review. No Atlas Viewer application modules loaded.
export const SYSTEMS = Object.freeze({
  skeletal: 'Rangka',
  muscular: 'Otot',
  joints: 'Sendi',
  cardiovascular: 'Jantung & pembuluh',
  lymphatic: 'Limfatik',
  visceral: 'Organ dalam',
});
const names = Object.keys(SYSTEMS);
export function availableSystem(system) { return Object.hasOwn(SYSTEMS, system); }
export function catalogueItems(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return [];
  return Object.entries(data)
    .filter(([name, detail]) => name && detail && availableSystem(detail.source))
    .map(([name, detail]) => ({
      name, system: detail.source, regions: Array.isArray(detail.regions) ? detail.regions : [],
    }));
}
export function findStructures(items, query, system = 'all', max = 24) {
  const needle = String(query || '').trim().toLocaleLowerCase('id');
  if (!needle) return [];
  return items.filter(item =>
    (system === 'all' || item.system === system) &&
    item.name.toLocaleLowerCase('id').includes(needle)
  ).sort((a,b) => {
    const aStart = a.name.toLocaleLowerCase('id').startsWith(needle) ? 0 : 1;
    const bStart = b.name.toLocaleLowerCase('id').startsWith(needle) ? 0 : 1;
    return aStart - bStart || a.name.length - b.name.length || a.name.localeCompare(b.name);
  }).slice(0, Math.max(0, Math.min(50, max)));
}
export function cleanStructureLabel(value) {
  return String(value || '').replaceAll('_', ' ').trim().slice(0, 140);
}

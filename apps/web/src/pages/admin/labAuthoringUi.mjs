export const MODULE_TEMPLATE = {
  schemaVersion: 1,
  records: [{ kind: 'module', data: {
    key: 'contoh-modul', title: 'Contoh Modul', summary: 'Ringkasan singkat.', sources: [],
    chapters: [{ key: 'pengenalan', title: 'Pengenalan', sections: [{
      key: 'orientasi', title: 'Orientasi', blocks: [{ key: 'tujuan', type: 'text', title: 'Tujuan', text: 'Isi materi.' }],
    }] }], questionBanks: [], pathways: [],
  } }],
};

export const KIND_LABELS = { source: 'Sumber', guide: 'Panduan', catalog: 'Katalog', asset: 'Aset', module: 'Modul', placement: 'Penempatan' };
export const ACTION_LABELS = { create: 'Baru', update: 'Diperbarui', unchanged: 'Tidak berubah' };

export function bundleSummary(bundle) {
  const records = Array.isArray(bundle?.records) ? bundle.records : [];
  const count = (kind) => records.filter((r) => r.kind === kind).length;
  const modules = records.filter((r) => r.kind === 'module').map((r) => r.data || {});
  const chapters = modules.flatMap((m) => m.chapters || []);
  const sections = chapters.flatMap((c) => c.sections || []);
  const blocks = sections.flatMap((s) => s.blocks || []);
  const questions = modules.flatMap((m) => m.questionBanks || []).flatMap((b) => b.questions || []);
  const assets = new Set([...blocks.flatMap((b) => [b.asset, b.left, b.right, ...(b.assets || [])]), ...questions.map((q) => q.asset)].filter(Boolean));
  return { sources: count('source'), guides: count('guide'), catalogs: count('catalog'), modules: count('module'), placements: count('placement'), chapters: chapters.length, sections: sections.length, banks: modules.reduce((n, m) => n + (m.questionBanks || []).length, 0), questions: questions.length, assets: assets.size };
}

export function licenseWarnings(bundle, records, media) {
  const sourceRows = [...records.filter((r) => r.kind === 'source').map((r) => r.data), ...bundle.records.filter((r) => r.kind === 'source').map((r) => r.data)];
  const sources = new Map(sourceRows.filter(Boolean).map((s) => [s.key, s]));
  const warnings = [];
  for (const source of bundle.records.filter((r) => r.kind === 'source').map((r) => r.data)) {
    if (source?.role === 'asset' && source.license?.verified !== true) warnings.push(`Lisensi sumber “${source.title || source.key}” belum diperiksa manusia.`);
  }
  const assetKeys = new Set(bundle.records.filter((r) => r.kind === 'module').flatMap((r) => {
    const m = r.data || {};
    return [...(m.chapters || []).flatMap((c) => (c.sections || []).flatMap((s) => (s.blocks || []).flatMap((b) => [b.asset, b.left, b.right, ...(b.assets || [])]))), ...(m.questionBanks || []).flatMap((b) => (b.questions || []).map((q) => q.asset))];
  }).filter(Boolean));
  for (const asset of media.filter((m) => assetKeys.has(m.key))) {
    if (asset.status !== 'published') warnings.push(`Aset “${asset.title || asset.key}” masih draft; perlu terbit sebelum modul diterbitkan.`);
    const source = sources.get(asset.sourceKey);
    if (source?.license?.verified !== true) warnings.push(`Lisensi sumber aset “${asset.key}” belum diperiksa manusia.`);
  }
  return [...new Set(warnings)];
}

export function actionCounts(entries = []) {
  return Object.fromEntries(['create', 'update', 'unchanged'].map((action) => [action, entries.filter((e) => e.action === action).length]));
}

export function describeEntry(entry, bundle, records = []) {
  if (entry.kind !== 'module') return [];
  const module = bundle.records.find((r) => r.kind === 'module' && r.data?.key === entry.key)?.data;
  if (!module) return [];
  const before = records.find((r) => r.kind === 'module' && r.key === entry.key)?.data;
  const changed = entry.action === 'create' ? null : entry.changes || [];
  const include = (path) => !changed || changed.some((p) => p === path || p.startsWith(`${path}[`) || p.startsWith(`${path}.`));
  const lines = [];
  for (const chapter of module.chapters || []) {
    if (include(`chapters[${chapter.key}]`)) lines.push(`${before?.chapters?.some((c) => c.key === chapter.key) ? 'Bab diperbarui' : 'Bab baru'}: ${chapter.title}`);
    for (const section of chapter.sections || []) if (include(`chapters[${chapter.key}].sections[${section.key}]`)) {
      const oldChapter = before?.chapters?.find((c) => c.key === chapter.key);
      lines.push(`${oldChapter?.sections?.some((s) => s.key === section.key) ? 'Bagian diperbarui' : 'Bagian baru'}: ${chapter.title} → ${section.title}`);
    }
  }
  for (const bank of module.questionBanks || []) if (include(`questionBanks[${bank.key}]`)) lines.push(`${before?.questionBanks?.some((b) => b.key === bank.key) ? 'Bank soal diperbarui' : 'Bank soal baru'}: ${bank.title} (${bank.questions?.length || 0} soal)`);
  return lines;
}

export function catalogHierarchy(records) {
  const catalogs = records.filter((r) => r.kind === 'catalog');
  const placements = records.filter((r) => r.kind === 'placement');
  const modules = new Map(records.filter((r) => r.kind === 'module').map((r) => [r.key, r.title]));
  const byKey = new Map(catalogs.map((r) => [r.key, r]));
  function path(r) {
    const names = [r.title]; const seen = new Set([r.key]); let parent = r.data?.parent;
    while (parent && byKey.has(parent) && !seen.has(parent)) { seen.add(parent); const p = byKey.get(parent); names.unshift(p.title); parent = p.data?.parent; }
    return names.join(' → ');
  }
  return catalogs.map((r) => ({ key: r.key, title: path(r), placements: placements.filter((p) => p.data?.catalog === r.key).map((p) => ({ key: p.key, module: p.data?.module, title: modules.get(p.data?.module) || p.title })) })).sort((a, b) => a.title.localeCompare(b.title));
}

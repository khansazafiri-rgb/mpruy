// General Lab authoring. JSON is inert data; drafts never replace published snapshots.
const HOOKS = typeof __hooks !== 'undefined' ? __hooks : __dirname + '/..';
const u = require(HOOKS + '/lib/util.js');
const KINDS = ['source', 'guide', 'catalog', 'module', 'placement'];
const BLOCKS = ['text', 'image', 'gallery', 'compare', 'identification_guide', 'identification_table', 'callout', 'source_disclosure', 'practice'];
const KEY = /^[a-z0-9][a-z0-9-]{0,99}$/;
function fail(s) { throw new BadRequestError(s); }
function obj(v, name) { if (!v || typeof v !== 'object' || Array.isArray(v)) fail(name + ' harus objek.'); return v; }
function arr(v, name, max) { if (!Array.isArray(v) || v.length > max) fail(name + ' harus daftar maksimal ' + max + '.'); return v; }
function str(v, name, max, required) { if (typeof v !== 'string' || v.length > max || (required && !v.trim()) || /<\/?[a-zA-Z!]/.test(v)) fail(name + ' tidak valid atau berisi HTML.'); return v.trim(); }
function key(v, name) { if (typeof v !== 'string' || !KEY.test(v)) fail(name + ' harus huruf kecil, angka, atau tanda hubung.'); return v; }
function unique(items, name) { const seen = new Set(); items.forEach((x) => { if (seen.has(x.key)) fail(name + ' memiliki key ganda: ' + x.key); seen.add(x.key); }); }
function keys(v, name, max) { const out = arr(v || [], name, max).map((x) => key(x, name)); if (new Set(out).size !== out.length) fail(name + ' berisi key ganda.'); return out; }
function https(v, name) { if (typeof v !== 'string' || !/^https:\/\/[^\s/@]+(?:\.[^\s/@]+)+(?:[/?#][^\s]*)?$/.test(v)) fail(name + ' harus URL HTTPS.'); return v; }
function license(v, name) {
  obj(v, name); return { name: str(v.name, name + '.name', 200, true), url: https(v.url, name + '.url'), citation: str(v.citation || '', name + '.citation', 2000), verified: v.verified === true,
    commercialUse: v.commercialUse === true, redistribution: v.redistribution === true, attributionRequired: v.attributionRequired !== false };
}
function block(v) {
  obj(v, 'Blok'); const type = str(v.type, 'block.type', 50, true); if (!BLOCKS.includes(type)) fail('Tipe blok belum didukung: ' + type);
  const b = { key: key(v.key, 'block.key'), type, title: str(v.title || '', 'block.title', 200) };
  if (type === 'text' || type === 'callout') b.text = str(v.text, 'block.text', 6000, true);
  if (type === 'callout') b.tone = ['info', 'tip', 'warn'].includes(v.tone) ? v.tone : 'info';
  if (type === 'image') b.asset = key(v.asset, 'block.asset');
  if (type === 'gallery') {
    if (v.items !== undefined && v.assets !== undefined) fail('Galeri memakai assets atau items, bukan keduanya.');
    if (v.items !== undefined) {
      b.items = arr(v.items, 'block.items', 50).map((item) => {
        obj(item, 'Item galeri');
        return { asset: key(item.asset, 'gallery.item.asset'),
          title: str(item.title || '', 'gallery.item.title', 200),
          caption: str(item.caption || '', 'gallery.item.caption', 3000) };
      });
      if (new Set(b.items.map((item) => item.asset)).size !== b.items.length) fail('Aset galeri ganda.');
    } else b.assets = keys(v.assets, 'block.assets', 50);
  }
  if (type === 'compare') { b.left = key(v.left, 'block.left'); b.right = key(v.right, 'block.right'); if (b.left === b.right) fail('Bandingkan dua aset berbeda.'); }
  if (type === 'identification_guide') b.guide = key(v.guide, 'block.guide');
  if (type === 'identification_table') { b.columns = arr(v.columns, 'block.columns', 8).map((x) => str(x, 'Kolom', 120, true)); b.rows = arr(v.rows, 'block.rows', 100).map((r) => arr(r, 'Baris', 8).map((x) => str(x, 'Sel', 1000))); if (b.columns.length < 2 || b.rows.some((r) => r.length !== b.columns.length)) fail('Tabel identifikasi tidak sejajar.'); }
  if (type === 'source_disclosure') b.sources = keys(v.sources, 'block.sources', 30);
  if (type === 'practice') b.bank = key(v.bank, 'block.bank');
  return b;
}
function question(v) {
  obj(v, 'Soal'); const type = str(v.type, 'question.type', 50, true); if (!['single_best_answer', 'image_identification'].includes(type)) fail('Tipe soal belum didukung: ' + type);
  const q = { key: key(v.key, 'question.key'), type, prompt: str(v.prompt, 'question.prompt', 4000, true), options: arr(v.options, 'question.options', 8).map((o) => ({ label: str(o.label, 'option.label', 10, true), text: str(o.text, 'option.text', 1000, true) })), answer: str(v.answer, 'question.answer', 10, true), explanation: str(v.explanation || '', 'question.explanation', 6000), sources: keys(v.sources, 'question.sources', 20), tags: arr(v.tags || [], 'question.tags', 20).map((x) => str(x, 'question.tag', 80, true)), difficulty: ['intro', 'intermediate', 'advanced'].includes(v.difficulty) ? v.difficulty : 'intro' };
  if (q.options.length < 2 || new Set(q.options.map((o) => o.label)).size !== q.options.length || !q.options.some((o) => o.label === q.answer)) fail('Pilihan/kunci soal tidak valid.');
  if (v.asset) q.asset = key(v.asset, 'question.asset');
  if (type === 'image_identification' && !q.asset) fail('Soal gambar memerlukan aset.');
  return q;
}
function validate(kind, raw) {
  if (!KINDS.includes(kind)) fail('Jenis record tidak dikenal.'); obj(raw, 'Record');
  const v = { key: key(raw.key, 'record.key'), title: str(raw.title, 'record.title', 200, true) };
  if (kind === 'source') {
    v.role = ['asset', 'reference'].includes(raw.role) ? raw.role : fail('source.role harus asset atau reference.');
    v.ingestionAllowed = raw.ingestionAllowed === true;
    if (v.role === 'reference' && v.ingestionAllowed) fail('Sumber reference-only tidak boleh dipakai untuk ingest aset.');
    v.datasetReviewRequired = raw.datasetReviewRequired === true;
    v.url = https(raw.url, 'source.url'); v.citation = str(raw.citation || '', 'source.citation', 2000);
    v.license = license(raw.license, 'source.license');
    v.policies = arr(raw.policies || [], 'source.policies', 100).map((p) => ({ collection: key(p.collection, 'policy.collection'), allowed: p.allowed === true, reviewed: p.reviewed === true, note: str(p.note || '', 'policy.note', 1000) }));
    unique(v.policies.map((p) => ({ key: p.collection })), 'Kebijakan koleksi');
    v.disclosure = str(raw.disclosure || '', 'source.disclosure', 2000);
  } else if (kind === 'guide') {
    v.subject = str(raw.subject, 'guide.subject', 200, true);
    v.scope = ['module', 'chapter', 'section'].includes(raw.scope) ? raw.scope : fail('guide.scope tidak valid.');
    v.steps = arr(raw.steps, 'guide.steps', 30).map((s) => ({ title: str(s.title, 'guide.step.title', 200, true), text: str(s.text, 'guide.step.text', 3000, true) }));
    if (!v.steps.length) fail('Panduan memerlukan langkah.'); v.sources = keys(raw.sources, 'guide.sources', 30);
  } else if (kind === 'catalog') {
    v.parent = raw.parent ? key(raw.parent, 'catalog.parent') : '';
    if (v.parent === v.key) fail('Katalog tidak boleh menjadi induk sendiri.');
    v.summary = str(raw.summary || '', 'catalog.summary', 600); v.order = Number.isInteger(raw.order) ? raw.order : 0;
  } else if (kind === 'placement') {
    v.module = key(raw.module, 'placement.module'); v.catalog = key(raw.catalog, 'placement.catalog');
    v.order = Number.isInteger(raw.order) ? raw.order : 0;
  } else {
    v.summary = str(raw.summary || '', 'module.summary', 1000);
    v.sources = keys(raw.sources, 'module.sources', 30);
    v.chapters = arr(raw.chapters || [], 'module.chapters', 100).map((c) => {
      obj(c, 'Chapter'); const chapter = { key: key(c.key, 'chapter.key'), title: str(c.title, 'chapter.title', 200, true), sections: arr(c.sections || [], 'chapter.sections', 100).map((s) => {
        obj(s, 'Section'); const section = { key: key(s.key, 'section.key'), title: str(s.title, 'section.title', 200, true), blocks: arr(s.blocks || [], 'section.blocks', 100).map(block) };
        unique(section.blocks, 'Blok'); return section;
      }) }; unique(chapter.sections, 'Section'); return chapter;
    }); unique(v.chapters, 'Chapter');
    v.questionBanks = arr(raw.questionBanks || [], 'module.questionBanks', 100).map((bank) => {
      obj(bank, 'Bank soal'); const b = { key: key(bank.key, 'bank.key'), title: str(bank.title, 'bank.title', 200, true), questions: arr(bank.questions || [], 'bank.questions', 100).map(question) }; unique(b.questions, 'Soal'); return b;
    }); unique(v.questionBanks, 'Bank soal');
    v.pathways = arr(raw.pathways || [], 'module.pathways', 50).map((p) => ({ key: key(p.key, 'pathway.key'), title: str(p.title, 'pathway.title', 200, true), sections: keys(p.sections, 'pathway.sections', 100) })); unique(v.pathways, 'Jalur');
    const sections = new Set(v.chapters.flatMap((c) => c.sections.map((s) => s.key)));
    if (sections.size !== v.chapters.reduce((n, c) => n + c.sections.length, 0)) fail('Section key harus unik dalam modul.');
    const banks = new Set(v.questionBanks.map((b) => b.key));
    for (const c of v.chapters) for (const s of c.sections) for (const b of s.blocks) if (b.type === 'practice' && !banks.has(b.bank)) fail('Blok latihan merujuk bank yang tidak ada: ' + b.bank);
    for (const p of v.pathways) for (const s of p.sections) if (!sections.has(s)) fail('Jalur merujuk section yang tidak ada: ' + s);
  }
  return v;
}
function mergeByKey(oldItems, incoming, merge) {
  const out = oldItems.map((x) => ({ ...x }));
  incoming.forEach((x) => { const i = out.findIndex((y) => y.key === x.key); if (i < 0) out.push(x); else out[i] = merge ? merge(out[i], x) : x; });
  return out;
}
// Patch one chapter/section/bank without replacing siblings; deletion is deliberately unsupported in V1.
function mergeModule(old, patch) {
  if (!old) return patch;
  const v = { ...old, ...patch };
  if (patch.chapters) v.chapters = mergeByKey(old.chapters || [], patch.chapters, (a, b) => ({ ...a, ...b, sections: b.sections ? mergeByKey(a.sections || [], b.sections, (x, y) => ({ ...x, ...y, blocks: y.blocks ? mergeByKey(x.blocks || [], y.blocks) : x.blocks })) : a.sections }));
  if (patch.questionBanks) v.questionBanks = mergeByKey(old.questionBanks || [], patch.questionBanks, (a, b) => ({ ...a, ...b, questions: b.questions ? mergeByKey(a.questions || [], b.questions) : a.questions }));
  if (patch.pathways) v.pathways = mergeByKey(old.pathways || [], patch.pathways);
  return v;
}
function changedPaths(before, after, path) {
  if (JSON.stringify(before) === JSON.stringify(after)) return [];
  if (Array.isArray(after) && Array.isArray(before) && after.every((x) => x && typeof x === 'object' && x.key) && before.every((x) => x && typeof x === 'object' && x.key)) {
    return after.flatMap((x) => changedPaths(before.find((y) => y.key === x.key), x, path + '[' + x.key + ']'));
  }
  if (before && after && typeof before === 'object' && typeof after === 'object' && !Array.isArray(before) && !Array.isArray(after)) {
    return [...new Set([...Object.keys(before), ...Object.keys(after)])].flatMap((k) => changedPaths(before[k], after[k], path ? path + '.' + k : k));
  }
  return [path || '(record)'];
}
function find(app, kind, k, required) { try { return app.findFirstRecordByFilter('lab_authoring', 'kind = {:kind} && key = {:key}', { kind, key: k }); } catch (_) { if (required) throw new NotFoundError(kind + '/' + k + ' tidak ditemukan.'); return null; } }
function data(r, published) { return r ? u.recJson(r, published ? 'publishedData' : 'data', null) : null; }
function row(r) { return { kind: r.getString('kind'), key: r.getString('key'), title: r.getString('title'), revision: r.getInt('revision'), status: data(r, true) ? 'published' : 'draft', hasDraft: JSON.stringify(data(r, false)) !== JSON.stringify(data(r, true)), data: data(r, false) }; }
function list(app, kind) { if (kind && !KINDS.includes(kind)) fail('Jenis record tidak dikenal.'); const filter = kind ? 'kind = {:kind}' : 'id != ""'; return app.findRecordsByFilter('lab_authoring', filter, 'kind,key', 1000, 0, kind ? { kind } : {}).map(row); }
function all(app, kind) { return app.findRecordsByFilter('lab_authoring', 'kind = {:kind}', 'key', 1000, 0, { kind }); }
function lookup(app, kind, k, staged, published) { return staged?.get(kind + '/' + k) || data(find(app, kind, k, false), published); }
function media(app, k, published) { let r; try { r = app.findFirstRecordByFilter('lab_media', 'key = {:key}', { key: k }); } catch (_) { return null; } if (published && r.getString('status') !== 'published') return null; return r; }
function mediaOut(r) { return { key: r.getString('key'), title: r.getString('title'), alt: r.getString('alt'), sourceKey: r.getString('sourceKey'), status: r.getString('status'), revision: r.getInt('revision'), url: r.getString('externalUrl') || '/api/files/lab_media/' + r.id + '/' + encodeURIComponent(r.getString('file')) }; }
function refs(app, kind, v, staged, published) {
  const errors = []; const need = (type, k) => { if (!lookup(app, type, k, staged, published)) errors.push(type + '/' + k + ' belum ada' + (published ? ' atau belum terbit' : '')); };
  if (kind === 'catalog' && v.parent) { need('catalog', v.parent); let p = v.parent; const seen = new Set([v.key]); while (p && !seen.has(p)) { seen.add(p); p = lookup(app, 'catalog', p, staged, published)?.parent; } if (p) errors.push('Hierarki katalog membentuk siklus.'); }
  if (kind === 'placement') { need('module', v.module); need('catalog', v.catalog); }
  if (kind === 'guide') v.sources.forEach((s) => need('source', s));
  if (kind === 'module') {
    v.sources.forEach((s) => need('source', s));
    for (const c of v.chapters) for (const s of c.sections) for (const b of s.blocks) {
      if (b.asset && !media(app, b.asset, published)) errors.push('Aset ' + b.asset + ' belum siap.');
      for (const a of [...(b.assets || []), ...(b.items || []).map((item) => item.asset)]) if (!media(app, a, published)) errors.push('Aset ' + a + ' belum siap.');
      for (const a of [b.left, b.right].filter(Boolean)) if (!media(app, a, published)) errors.push('Aset ' + a + ' belum siap.');
      if (b.guide) need('guide', b.guide); if (b.sources) b.sources.forEach((s) => need('source', s));
    }
    for (const bank of v.questionBanks) for (const q of bank.questions) { if (q.asset && !media(app, q.asset, published)) errors.push('Aset soal ' + q.asset + ' belum siap.'); q.sources.forEach((s) => need('source', s)); }
  }
  return errors;
}
function normalizeBundle(body) {
  obj(body, 'Bundle'); if (body.schemaVersion !== 1) fail('schemaVersion harus 1.');
  const records = arr(body.records, 'records', 100).map((r) => { obj(r, 'Record'); if (r.op && r.op !== 'upsert') fail('Operasi ' + r.op + ' belum didukung; V1 tidak menghapus konten.'); const kind = str(r.kind, 'kind', 30, true); if (!KINDS.includes(kind)) fail('Jenis record tidak dikenal: ' + kind); return { kind, value: r.data }; });
  if (!records.length) fail('Bundle kosong.'); return records;
}
function plan(app, body) {
  const input = normalizeBundle(body), staged = new Map(), entries = [], errors = [];
  input.forEach(({ kind, value }) => {
    try {
      obj(value, kind); const k = key(value.key, kind + '.key'); const existing = find(app, kind, k, false);
      const merged = kind === 'module' && existing ? mergeModule(data(existing, false), value) : value;
      const v = validate(kind, merged); const id = kind + '/' + v.key;
      if (staged.has(id)) fail('Record ganda dalam bundle: ' + id); staged.set(id, v);
      const before = existing ? data(existing, false) : null;
      const counts = kind === 'module' ? { chapters: v.chapters.length, sections: v.chapters.reduce((n, c) => n + c.sections.length, 0), blocks: v.chapters.reduce((n, c) => n + c.sections.reduce((m, s) => m + s.blocks.length, 0), 0), questions: v.questionBanks.reduce((n, b) => n + b.questions.length, 0) } : undefined;
      entries.push({ kind, key: v.key, title: v.title, action: !existing ? 'create' : JSON.stringify(before) === JSON.stringify(v) ? 'unchanged' : 'update', revision: existing?.getInt('revision') || 0, changes: before ? changedPaths(before, v, '') : ['(new record)'], ...(counts ? { counts } : {}) });
    } catch (e) { errors.push(e.message || String(e)); }
  });
  for (const e of entries) errors.push(...refs(app, e.kind, staged.get(e.kind + '/' + e.key), staged, false).map((s) => e.kind + '/' + e.key + ': ' + s));
  const token = u.hash(JSON.stringify({ entries, values: [...staged.entries()] }));
  return { ok: errors.length === 0, entries, errors, token, staged };
}
function preview(app, body) { const p = plan(app, body); return { ok: p.ok, entries: p.entries, errors: p.errors, token: p.token }; }
function apply(app, body) {
  if (!body || typeof body !== 'object') fail('Permintaan tidak valid.'); const p = plan(app, body.bundle);
  if (!p.ok) fail('Perbaiki validasi: ' + p.errors.join('; ')); if (!body.token || body.token !== p.token) fail('Pratinjau sudah berubah. Validasi ulang sebelum menyimpan.');
  let changed = 0;
  app.runInTransaction((tx) => { const fresh = plan(tx, body.bundle); if (!fresh.ok || fresh.token !== p.token) fail('Konten berubah. Pratinjau ulang.');
    for (const e of p.entries.filter((x) => x.action !== 'unchanged')) {
      const r = find(tx, e.kind, e.key, false) || new Record(tx.findCollectionByNameOrId('lab_authoring'));
      r.set('kind', e.kind); r.set('key', e.key); r.set('title', e.title); r.set('data', p.staged.get(e.kind + '/' + e.key));
      r.set('revision', e.revision + 1); r.set('reviewedBy', ''); r.set('reviewedAt', ''); tx.save(r); changed++;
    }
  }); return { changed, entries: p.entries, published: false, bundle: { records: p.entries.map((e) => ({ kind: e.kind, key: e.key, revision: e.revision + (e.action === 'unchanged' ? 0 : 1), action: e.action })) } };
}
function exportModule(app, k) {
  const m = data(find(app, 'module', k, true), false), related = all(app, 'placement').filter((x) => data(x, false)?.module === k).map((x) => data(x, false));
  const guides = new Set(), sources = new Set(m.sources), catalogs = new Set();
  for (const c of m.chapters) for (const s of c.sections) for (const b of s.blocks) {
    if (b.guide) guides.add(b.guide); (b.sources || []).forEach((x) => sources.add(x));
    for (const a of [b.asset, b.left, b.right, ...(b.assets || []), ...(b.items || []).map((item) => item.asset)].filter(Boolean)) { const x = media(app, a, false); if (x) sources.add(x.getString('sourceKey')); }
  }
  for (const bank of m.questionBanks) for (const q of bank.questions) { q.sources.forEach((s) => sources.add(s)); if (q.asset) { const x = media(app, q.asset, false); if (x) sources.add(x.getString('sourceKey')); } }
  for (const g of guides) { const x = data(find(app, 'guide', g, false), false); (x?.sources || []).forEach((s) => sources.add(s)); }
  for (const p of related) { let c = p.catalog; while (c && !catalogs.has(c)) { catalogs.add(c); c = data(find(app, 'catalog', c, false), false)?.parent; } }
  const records = [];
  for (const s of sources) { const x = data(find(app, 'source', s, false), false); if (x) records.push({ kind: 'source', data: x }); }
  for (const g of guides) { const x = data(find(app, 'guide', g, false), false); if (x) records.push({ kind: 'guide', data: x }); }
  for (const c of catalogs) { const x = data(find(app, 'catalog', c, false), false); if (x) records.push({ kind: 'catalog', data: x }); }
  records.push({ kind: 'module', data: m }); related.forEach((x) => records.push({ kind: 'placement', data: x }));
  return { schemaVersion: 1, records };
}
function publishRecordTx(tx, kind, k, revision, adminId) {
  if (!KINDS.includes(kind)) fail('Jenis record tidak dikenal.'); const r = find(tx, kind, k, true); if (r.getInt('revision') !== revision) fail('Revisi berubah. Periksa ulang.');
    const v = validate(kind, data(r, false)); const errors = refs(tx, kind, v, null, true);
    if (kind === 'source' && data(r, true)?.role && data(r, true).role !== v.role) errors.push('Peran sumber terbit tidak dapat diubah; gunakan key sumber baru.');
    if (kind === 'source' && v.role === 'asset' && (!v.license.verified || !v.license.commercialUse || !v.license.redistribution || (v.license.attributionRequired && !v.license.citation))) errors.push('Lisensi aset belum siap terbit.');
    if (kind === 'module') {
      if (!v.chapters.some((c) => c.sections.some((s) => s.blocks.length))) errors.push('Modul memerlukan setidaknya satu section berisi blok.');
      const sourceKeys = new Set(v.sources);
      for (const c of v.chapters) for (const section of c.sections) for (const b of section.blocks) {
        (b.sources || []).forEach((x) => sourceKeys.add(x));
        for (const asset of [b.asset, b.left, b.right, ...(b.assets || []), ...(b.items || []).map((item) => item.asset)].filter(Boolean)) { const a = media(tx, asset, true); if (a) sourceKeys.add(a.getString('sourceKey')); }
      }
      for (const bank of v.questionBanks) for (const q of bank.questions) if (q.asset) { const a = media(tx, q.asset, true); if (a) sourceKeys.add(a.getString('sourceKey')); }
      for (const bank of v.questionBanks) for (const q of bank.questions) q.sources.forEach((x) => sourceKeys.add(x));
      for (const source of sourceKeys) { const s = lookup(tx, 'source', source, null, true); if (!s) continue; if (s.role === 'asset' && !s.license?.verified) errors.push('Lisensi sumber ' + source + ' belum diverifikasi.'); const policy = s.policies?.find((p) => p.collection === k); if (policy && !policy.allowed) errors.push('Sumber ' + source + ' tidak diizinkan untuk modul ini: ' + policy.note); if (s.datasetReviewRequired && (!policy || !policy.reviewed)) errors.push('Sumber ' + source + ' memerlukan review khusus untuk modul ini.'); }
      for (const asset of [...new Set([...v.chapters.flatMap((c) => c.sections.flatMap((s) => s.blocks.flatMap((b) => [b.asset, b.left, b.right, ...(b.assets || []), ...(b.items || []).map((item) => item.asset)]))), ...v.questionBanks.flatMap((b) => b.questions.map((q) => q.asset))].filter(Boolean))]) { const a = media(tx, asset, true); const s = a && lookup(tx, 'source', a.getString('sourceKey'), null, true); if (!s || s.role !== 'asset' || !s.license.verified || !s.license.commercialUse || !s.license.redistribution) errors.push('Sumber aset ' + asset + ' tidak lagi memiliki izin publikasi.'); }
    }
    if (errors.length) fail(errors.join('; '));
    r.set('publishedData', v); r.set('reviewedBy', adminId); r.set('reviewedAt', new Date().toISOString()); tx.save(r);
    return { kind, key: k, status: 'published', revision: r.getInt('revision') };
}
function publish(app, kind, k, body, admin) {
  if (body.confirmReviewed !== true) fail('Konfirmasi pemeriksaan manusia diperlukan.');
  let out; app.runInTransaction((tx) => { out = publishRecordTx(tx, kind, k, body.revision, admin.id); }); return out;
}
function listMedia(app) { return app.findRecordsByFilter('lab_media', 'id != ""', 'key', 1000, 0).map(mediaOut); }
function saveMedia(app, e) {
  const b = u.body(e); const k = key(b.key, 'media.key'); if (media(app, k, false)) fail('Aset dengan key ini sudah ada; penggantian berkas memerlukan key baru.');
  // Registration is draft-only. A draft source may authorize staging, but publication
  // still requires a published, human-verified source in publishMediaTx.
  const source = lookup(app, 'source', key(b.sourceKey, 'media.sourceKey'), null, false);
  if (!source || source.role !== 'asset' || !source.ingestionAllowed) fail('Aset memerlukan sumber asset dengan izin ingest.');
  const files = e.findUploadedFiles('file'); const external = b.externalUrl ? https(b.externalUrl, 'media.externalUrl') : '';
  if ((files?.length || 0) + (external ? 1 : 0) !== 1) fail('Pilih tepat satu: unggah gambar atau URL HTTPS.');
  const r = new Record(app.findCollectionByNameOrId('lab_media')); r.set('key', k); r.set('title', str(b.title, 'media.title', 200, true)); r.set('alt', str(b.alt, 'media.alt', 500, true)); r.set('sourceKey', b.sourceKey);
  r.set('license', source.license); if (external) r.set('externalUrl', external); else r.set('file', files[0]); r.set('status', 'draft'); r.set('revision', 1); app.save(r); return mediaOut(r);
}
function publishMediaTx(tx, k, revision) {
  const r = media(tx, k, false); if (!r) throw new NotFoundError('Aset tidak ditemukan.');
  if (revision !== r.getInt('revision')) fail('Revisi aset berubah.'); const source = lookup(tx, 'source', r.getString('sourceKey'), null, true);
  if (!source || source.role !== 'asset' || !source.ingestionAllowed || !source.license.verified || !source.license.commercialUse || !source.license.redistribution || (source.license.attributionRequired && !source.license.citation)) fail('Sumber dan lisensi belum siap terbit.');
  r.set('status', 'published'); tx.save(r); return mediaOut(r);
}
function publishMedia(app, k, body) {
  if (body.confirmReviewed !== true) fail('Konfirmasi pemeriksaan manusia diperlukan.');
  let out; app.runInTransaction((tx) => { out = publishMediaTx(tx, k, body.revision); }); return out;
}
const PUBLISH_ORDER = { source: 0, guide: 1, catalog: 2, asset: 3, module: 4, placement: 5 };
function moduleAssets(v) {
  if (!v) return [];
  return [...new Set([
    ...(v.chapters || []).flatMap((c) => (c.sections || []).flatMap((s) => (s.blocks || []).flatMap((b) => [b.asset, b.left, b.right, ...(b.assets || []), ...(b.items || []).map((item) => item.asset)]))),
    ...(v.questionBanks || []).flatMap((b) => (b.questions || []).map((q) => q.asset)),
  ].filter(Boolean))];
}
function reviewItems(app, body) {
  obj(body, 'Bundle review');
  const records = arr(body.records, 'bundle.records', 100).map((x) => {
    obj(x, 'Record review'); const kind = str(x.kind, 'record.kind', 30, true);
    if (!KINDS.includes(kind)) fail('Jenis record tidak dikenal: ' + kind);
    const k = key(x.key, 'record.key');
    if (!Number.isInteger(x.revision) || x.revision < 1) fail('Revisi record tidak valid.');
    return { kind, key: k, expectedRevision: x.revision, action: ['create', 'update', 'unchanged'].includes(x.action) ? x.action : 'update' };
  });
  const explicitMedia = arr(body.media || [], 'bundle.media', 1000).map((x) => {
    obj(x, 'Aset review'); if (x.revision !== undefined && (!Number.isInteger(x.revision) || x.revision < 1)) fail('Revisi aset tidak valid.');
    return { kind: 'asset', key: key(x.key, 'media.key'), expectedRevision: x.revision };
  });
  if (!records.length && !explicitMedia.length) fail('Bundle review kosong.');
  const referencedMedia = records.filter((x) => x.kind === 'module').flatMap((x) => moduleAssets(data(find(app, 'module', x.key, false), false)));
  const assets = [...new Set([...explicitMedia.map((x) => x.key), ...referencedMedia])].map((k) => {
    const supplied = explicitMedia.find((x) => x.key === k), r = media(app, k, false);
    return { kind: 'asset', key: k, expectedRevision: supplied?.expectedRevision ?? r?.getInt('revision') ?? 0, action: r?.getString('status') === 'published' ? 'unchanged' : r?.getInt('revision') === 1 ? 'create' : 'update' };
  });
  const items = [...records, ...assets];
  if (new Set(items.map((x) => x.kind + '/' + x.key)).size !== items.length) fail('Bundle review memiliki record ganda.');
  function catalogDepth(x) {
    if (x.kind !== 'catalog') return 0;
    let parent = data(find(app, 'catalog', x.key, false), false)?.parent, depth = 0; const seen = new Set([x.key]);
    while (parent && !seen.has(parent) && depth < 100) { seen.add(parent); depth++; parent = data(find(app, 'catalog', parent, false), false)?.parent; }
    return depth;
  }
  items.sort((a, b) => PUBLISH_ORDER[a.kind] - PUBLISH_ORDER[b.kind] || catalogDepth(a) - catalogDepth(b) || a.key.localeCompare(b.key));
  return items.map((x) => {
    const r = x.kind === 'asset' ? media(app, x.key, false) : find(app, x.kind, x.key, false);
    const draft = r && x.kind !== 'asset' ? data(r, false) : null;
    const published = r && x.kind !== 'asset' ? data(r, true) : null;
    const alreadyPublished = !!r && (x.kind === 'asset' ? r.getString('status') === 'published' : !!published && JSON.stringify(draft) === JSON.stringify(published));
    const snapshot = !r ? null : x.kind === 'asset' ? [r.getInt('revision'), r.getString('status'), r.getString('sourceKey'), r.getString('title'), r.getString('alt'), r.getString('externalUrl'), r.getString('file'), r.get('license')] : [r.getInt('revision'), draft, published];
    return { ...x, title: r?.getString('title') || x.key, revision: r?.getInt('revision') || 0, alreadyPublished, snapshot };
  });
}
function reviewToken(items) { return u.hash(JSON.stringify(items.map((x) => [x.kind, x.key, x.expectedRevision, x.snapshot]))); }
function preflightBundle(app, items) {
  const results = items.map((x) => ({ kind: x.kind, key: x.key, title: x.title, revision: x.revision, action: x.action, alreadyPublished: x.alreadyPublished, ready: false, issues: [] }));
  const rollback = 'LAB_BUNDLE_REVIEW_ROLLBACK';
  try {
    app.runInTransaction((tx) => {
      items.forEach((x, i) => {
        const row = results[i];
        if (!x.snapshot) row.issues.push('Record atau aset tidak ditemukan.');
        else if (x.expectedRevision !== x.revision) row.issues.push('Revisi berubah setelah draft dibuat. Tinjau ulang bundle.');
        else if (x.alreadyPublished) row.ready = true;
        else {
          try {
            if (x.kind === 'asset') publishMediaTx(tx, x.key, x.expectedRevision);
            else publishRecordTx(tx, x.kind, x.key, x.expectedRevision, '');
            row.ready = true;
          } catch (e) { row.issues.push(e.message || String(e)); }
        }
      });
      throw new Error(rollback); // Always discard trial publication, even when every item is ready.
    });
  } catch (e) { if (!(e.message || String(e)).includes(rollback)) throw e; }
  return results;
}
function reviewBundle(app, body) {
  const items = reviewItems(app, body), results = preflightBundle(app, items);
  return { ready: results.every((x) => x.ready), readyCount: results.filter((x) => x.ready).length, total: results.length,
    items: results, problems: results.flatMap((x) => x.issues.map((issue) => x.kind + '/' + x.key + ': ' + issue)), token: reviewToken(items) };
}
function publishBundle(app, body, admin) {
  obj(body, 'Publikasi bundle'); if (body.confirmReviewed !== true) fail('Konfirmasi pemeriksaan manusia untuk bundle diperlukan.');
  const review = reviewBundle(app, body.bundle);
  if (!body.token || body.token !== review.token) fail('Revisi berubah setelah review. Tinjau ulang bundle.');
  if (!review.ready) fail('Bundle belum siap: ' + review.problems.join('; '));
  let published = 0;
  app.runInTransaction((tx) => {
    const items = reviewItems(tx, body.bundle);
    if (reviewToken(items) !== body.token) fail('Revisi berubah setelah review. Tinjau ulang bundle.');
    for (const x of items) {
      if (x.alreadyPublished) continue;
      if (x.kind === 'asset') publishMediaTx(tx, x.key, x.expectedRevision);
      else publishRecordTx(tx, x.kind, x.key, x.expectedRevision, admin.id);
      published++;
    }
  });
  return { published, total: review.total, items: review.items.map((x) => ({ kind: x.kind, key: x.key, title: x.title, revision: x.revision })), status: 'published' };
}
function studentCatalog(app) {
  const published = (kind) => all(app, kind).flatMap((r) => { const d = data(r, true); return d ? [d] : []; });
  const nodes = published('catalog'), placements = published('placement'), modules = new Map(published('module').map((m) => [m.key, { key: m.key, title: m.title, summary: m.summary }]));
  const byOrder = (a, b) => a.order - b.order || a.title.localeCompare(b.title);
  return { nodes: nodes.filter((n) => !n.parent || nodes.some((p) => p.key === n.parent)).sort(byOrder), placements: placements.filter((p) => nodes.some((n) => n.key === p.catalog) && modules.has(p.module)).sort(byOrder), modules: [...modules.values()] };
}
function studentModule(app, k, preview) {
  const r = find(app, 'module', k, true), m = data(r, !preview); if (!m) throw new NotFoundError('Modul belum terbit.');
  const assetKeys = new Set(), guideKeys = new Set(), sourceKeys = new Set(m.sources);
  for (const c of m.chapters) for (const s of c.sections) for (const b of s.blocks) {
    if (b.asset) assetKeys.add(b.asset); if (b.assets) b.assets.forEach((a) => assetKeys.add(a)); if (b.items) b.items.forEach((item) => assetKeys.add(item.asset));
    if (b.left) assetKeys.add(b.left); if (b.right) assetKeys.add(b.right);
    if (b.guide) guideKeys.add(b.guide); if (b.sources) b.sources.forEach((x) => sourceKeys.add(x));
  }
  for (const bank of m.questionBanks) for (const q of bank.questions) { if (q.asset) assetKeys.add(q.asset); q.sources.forEach((s) => sourceKeys.add(s)); }
  const assets = {}; for (const a of assetKeys) { const r = media(app, a, !preview); if (r) { const x = mediaOut(r); sourceKeys.add(x.sourceKey); const source = lookup(app, 'source', x.sourceKey, null, !preview); assets[a] = { ...x, license: source ? { citation: source.license.citation || source.citation, license: source.license.name, source_url: source.url } : {} }; } }
  const guides = {}; for (const g of guideKeys) { const x = lookup(app, 'guide', g, null, !preview); if (x) { guides[g] = x; x.sources.forEach((s) => sourceKeys.add(s)); } }
  const sources = {}; for (const s of sourceKeys) { const x = lookup(app, 'source', s, null, !preview); if (x) sources[s] = { key: x.key, title: x.title, url: x.url, citation: x.citation, disclosure: x.disclosure, license: x.license.name }; }
  const banks = {}; for (const b of m.questionBanks) banks[b.key] = b.questions.map((q) => ({ key: q.key, id: q.key, type: q.type, prompt: q.prompt, options: q.options, image: q.asset ? assets[q.asset] : null, answerPath: `lab/modules/${encodeURIComponent(k)}/questions/${encodeURIComponent(b.key)}/${encodeURIComponent(q.key)}/answer` }));
  return { key: m.key, title: m.title, summary: m.summary, chapters: m.chapters, pathways: m.pathways, assets, guides, sources, questionBanks: banks, preview: !!preview };
}
function answer(app, module, bank, qid, body) {
  const m = data(find(app, 'module', module, true), true); if (!m) throw new NotFoundError('Modul belum terbit.');
  const q = m.questionBanks.find((b) => b.key === bank)?.questions.find((x) => x.key === qid); if (!q) throw new NotFoundError('Soal tidak ditemukan.');
  const response = str(body.response, 'response', 100, true); return { correct: response === q.answer, answer: q.answer, explanation: q.explanation };
}
module.exports = { KINDS, BLOCKS, validate, mergeModule, plan, preview, apply, list, find, row, exportModule, publish, listMedia, saveMedia, publishMedia, reviewBundle, publishBundle, studentCatalog, studentModule, answer, mediaOut };

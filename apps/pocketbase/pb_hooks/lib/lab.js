// No AI or network calls. JSON is plain text/data, never executable rules or HTML.
const HOOKS = typeof __hooks !== 'undefined' ? __hooks : __dirname + '/..';
const u = require(HOOKS + '/lib/util.js');
const KINDS = ['objects', 'assets', 'questions', 'pathways'];
const ORDER = { assets: 0, objects: 1, questions: 2, pathways: 3 };
const DOMAINS = ['imaging', 'clinical_pathology', 'microbiology', 'parasitology', 'histology', 'anatomy'];
// Provenance of an anatomy visual: curated annotation, illustrative schematic, dataset-derived segmentation, or dev-only geometry.
const ORIGINS = ['curated_annotation', 'illustrative_schematic', 'dataset_segmentation', 'development_schematic'];
// Built-in dev-only schematic layers. Geometry lives in the web app (devSchematics.jsx); content can only name a key, never ship markup.
const SCHEMATICS = ['dev-thorax:skin', 'dev-thorax:fascia', 'dev-thorax:pectoralis-major', 'dev-thorax:pectoralis-minor', 'dev-thorax:ribs', 'dev-thorax:pleura', 'dev-thorax:lungs', 'dev-thorax:heart'];
const BLOCK_TYPES = ['callout', 'comparison', 'guided_observation', 'layer_explorer', 'exploded_view', 'model_3d', 'clinical_connection'];
const ID = /^[a-z0-9][a-z0-9_-]{0,39}$/;
const TYPES = ['single_best_answer', 'image_identification', 'select_region', 'hotspot', 'describe_finding', 'interpretation', 'diagnosis', 'differential_diagnosis', 'next_investigation', 'next_management', 'structured_lab', 'sequential_identification'];
function fail(message) { throw new BadRequestError(message); }
function text(v, max, required) {
  if (typeof v !== 'string' || v.length > max || (required && !v.trim())) fail('Teks wajib/terlalu panjang atau format tidak valid.');
  return v.trim();
}
function list(v, max) { if (!Array.isArray(v) || v.length > max) fail('Daftar tidak valid atau terlalu panjang.'); return v; }
function ids(v, max) { return list(v || [], max).map((id) => { if (!/^[a-z0-9]{15}$/.test(id)) fail('ID relasi tidak valid.'); return id; }); }
function safeUrl(v) { return typeof v === 'string' && /^https:\/\/[^\s/@]+(?:\.[^\s/@]+)+(?::\d+)?(?:[/?#][^\s]*)?$/.test(v); }
// Content is data: free text must never carry markup, and the UI renders it only as text nodes.
function plain(v, max, required) { const t = text(v, max, required); if (/<\/?[a-zA-Z!]/.test(t)) fail('Teks tidak boleh berisi HTML.'); return t; }
function unit(v, fallback) { const n = v === undefined || v === null ? fallback : v; if (typeof n !== 'number' || !Number.isFinite(n) || n < 0 || n > 1) fail('Nilai opasitas/kedalaman harus 0–1.'); return n; }
function blockId(v) { const t = text(v, 40, true); if (!ID.test(t)) fail('ID blok hanya huruf kecil, angka, - dan _.'); return t; }
function strings(v, max) { return list(v || [], max).map((s) => text(s, 2000, true)); }
function rect(r) {
  if (!r || !['x', 'y', 'width', 'height'].every((k) => typeof r[k] === 'number' && Number.isFinite(r[k]) && r[k] >= 0 && r[k] <= 1) || r.width <= 0 || r.height <= 0 || r.x + r.width > 1 || r.y + r.height > 1) fail('Region harus memakai koordinat 0–1 di dalam gambar.');
  return { x: r.x, y: r.y, width: r.width, height: r.height };
}

function layerList(v, assetIds) {
  const items = list(v, 20); if (items.length < 2) fail('Minimal dua lapisan.');
  const out = items.map((l) => {
    const layer = { id: blockId(l.id), name: plain(l.name, 120, true), description: plain(l.description || '', 600), clinical: plain(l.clinical || '', 600), opacity: unit(l.opacity, 1) };
    if (!!l.asset === !!l.schematic) fail('Setiap lapisan memakai tepat satu: asset atau schematic.');
    if (l.asset) { if (!assetIds.includes(l.asset)) fail('Lapisan merujuk aset yang bukan bagian materi ini.'); layer.asset = l.asset; }
    else { if (!SCHEMATICS.includes(l.schematic)) fail('Kunci skema tidak dikenal.'); layer.schematic = l.schematic; }
    return layer;
  });
  if (new Set(out.map((l) => l.id)).size !== out.length) fail('ID lapisan harus unik.');
  return out;
}
function origin(v, layers) {
  if (!ORIGINS.includes(v)) fail('Asal visual (origin) tidak valid.');
  const dev = layers.some((l) => l.schematic);
  if (dev !== (v === 'development_schematic')) fail('Skema pengembangan harus berasal dari development_schematic, dan sebaliknya.');
  return { origin: v, dev };
}
function validateBlocks(blocks, assetIds) {
  const items = list(blocks || [], 30); const seen = new Set(); const explorers = {};
  const out = items.map((b) => {
    if (!b || !BLOCK_TYPES.includes(b.type)) fail('Jenis blok tidak dikenal.');
    const o = { type: b.type };
    if (b.id !== undefined && b.id !== '') { o.id = blockId(b.id); if (seen.has(o.id)) fail('ID blok harus unik.'); seen.add(o.id); }
    if (['layer_explorer', 'exploded_view', 'model_3d'].includes(b.type) && !o.id) fail('Blok visual memerlukan id.');
    if (b.type === 'callout') {
      Object.assign(o, { kind: ['info', 'warn', 'tip'].includes(b.kind) ? b.kind : 'info', title: plain(b.title || '', 200), text: plain(b.text, 2000, true) });
    } else if (b.type === 'comparison') {
      const side = (s) => { if (!s || !assetIds.includes(s.asset)) fail('Perbandingan memerlukan aset dari materi ini.'); return { asset: s.asset, caption: plain(s.caption || '', 300) }; };
      Object.assign(o, { title: plain(b.title || '', 200), left: side(b.left), right: side(b.right) });
    } else if (b.type === 'guided_observation') {
      Object.assign(o, { title: plain(b.title || '', 200), steps: list(b.steps, 12).map((s) => ({ title: plain(s.title, 200, true), text: plain(s.text || '', 1000) })) });
      if (!o.steps.length) fail('Observasi terpandu memerlukan langkah.');
    } else if (b.type === 'layer_explorer') {
      Object.assign(o, { title: plain(b.title, 200, true), goal: plain(b.goal || '', 600), region: plain(b.region || '', 60), layers: layerList(b.layers, assetIds) });
      Object.assign(o, origin(b.origin, o.layers));
      o.guided = list(b.guided || [], 12).map((g) => { if (!o.layers.some((l) => l.id === g.layer)) fail('Langkah terpandu merujuk lapisan yang tidak ada.'); return { title: plain(g.title, 200, true), text: plain(g.text || '', 600), layer: g.layer }; });
      explorers[o.id] = o;
    } else if (b.type === 'exploded_view') {
      Object.assign(o, { title: plain(b.title, 200, true), goal: plain(b.goal || '', 600), gap: unit(b.gap, 1) });
      if (!!b.from === !!b.layers) fail('Exploded view memakai tepat satu: from atau layers.');
      if (b.from) { o.from = blockId(b.from); } else { o.layers = layerList(b.layers, assetIds); Object.assign(o, origin(b.origin, o.layers)); }
    } else if (b.type === 'model_3d') {
      if (!assetIds.includes(b.asset)) fail('Model 3D merujuk aset yang bukan bagian materi ini.');
      if (!ORIGINS.includes(b.origin) || b.origin === 'development_schematic') fail('Asal model 3D tidak valid.');
      Object.assign(o, { title: plain(b.title, 200, true), asset: b.asset, origin: b.origin, fallback: plain(b.fallback || '', 300),
        structures: list(b.structures || [], 40).map((s) => ({ id: blockId(s.id), name: plain(s.name, 120, true), description: plain(s.description || '', 600), node: plain(s.node || '', 120) })) });
    } else if (b.type === 'clinical_connection') {
      Object.assign(o, { title: plain(b.title || 'Koneksi klinis', 200), text: plain(b.text, 1500, true) });
      if (b.link) o.link = { object: ids([b.link.object], 1)[0], label: plain(b.link.label || '', 120) };
    }
    return o;
  });
  // from-references must point at a layer explorer in the same lesson; resolve dev flag from the source.
  out.forEach((o) => { if (o.type === 'exploded_view' && o.from) { const src = explorers[o.from]; if (!src) fail('Exploded view merujuk blok layer_explorer yang tidak ada.'); o.dev = src.dev; o.origin = src.origin; } });
  return out;
}
// Explicit ground truth for dataset images; replaces parsing labels out of titles/alt text.
function datasetMeta(m) {
  if (!m || typeof m !== 'object' || Array.isArray(m)) fail('Metadata dataset tidak valid.');
  const out = { name: text(m.name, 100, true), task: text(m.task || '', 60), split: text(m.split || '', 20) };
  out.label = text(m.label || '', 60).toLowerCase();
  if (m.sample_index !== undefined) { if (!Number.isInteger(m.sample_index) || m.sample_index < 0) fail('sample_index tidak valid.'); out.sample_index = m.sample_index; }
  if (m.resolution !== undefined) { if (!Array.isArray(m.resolution) || m.resolution.length !== 2 || !m.resolution.every((n) => Number.isInteger(n) && n > 0 && n <= 20000)) fail('resolution harus [lebar, tinggi].'); out.resolution = m.resolution; }
  return out;
}
function validate(kind, b) {
  if (!KINDS.includes(kind)) fail('Jenis konten tidak dikenal.');
  const out = { slug: text(b.slug, 100, true), title: text(b.title, 200, true) };
  if (!/^[a-z0-9-]+$/.test(out.slug)) fail('Slug hanya huruf kecil, angka, dan tanda hubung.');
  // Only touched when supplied, so a JSON edit that omits `pack` never detaches a record from its pack.
  if (b.pack !== undefined) out.pack = b.pack ? ids([b.pack], 1)[0] : '';
  const d = b.data;
  if (!d || typeof d !== 'object' || Array.isArray(d) || JSON.stringify(d).length > 100000) fail('Data tidak valid.');
  // Strict allowlists keep accidental private authoring/AI fields out of student payloads.
  if (kind === 'assets') {
    if (d.url !== '/lab-demo/cells.svg' && !safeUrl(d.url)) fail('Aset harus URL HTTPS atau ilustrasi demo bawaan.');
    const l = d.license || {};
    const license = { source: text(l.source, 500, true), dataset: text(l.dataset || '', 200), license: text(l.license, 200, true), source_url: text(l.source_url, 1000, true), citation: text(l.citation || '', 2000), commercial_use: l.commercial_use === true, redistribution: l.redistribution === true, modification: l.modification === true, attribution_required: l.attribution_required !== false, verified: l.verified === true };
    if (license.source_url !== 'original:medcoel-lab-demo' && !safeUrl(license.source_url)) fail('URL sumber lisensi tidak valid.');
    const media = d.media === 'model' ? 'model' : 'image';
    if (media === 'model' && !/\.(glb|gltf)(?:[?#].*)?$/i.test(d.url)) fail('Model 3D harus berupa berkas .glb atau .gltf.');
    if (d.origin !== undefined && d.origin !== '' && !ORIGINS.includes(d.origin)) fail('Asal aset (origin) tidak valid.');
    out.data = { url: d.url, media, alt: text(d.alt, 500, true), synthetic: d.synthetic === true, license, ...(d.origin ? { origin: d.origin } : {}), ...(d.dataset ? { dataset: datasetMeta(d.dataset) } : {}),
      annotations: list(d.annotations || [], 50).map((a) => ({ id: text(a.id, 60, true), label: text(a.label, 200, true), layer: a.layer === 'anatomy' ? 'anatomy' : 'abnormality', region: rect(a.region) })) };
    if (new Set(out.data.annotations.map((a) => a.id)).size !== out.data.annotations.length) fail('ID anotasi harus unik.');
  } else if (kind === 'objects') {
    if (!DOMAINS.includes(b.domain)) fail('Domain tidak valid.');
    Object.assign(out, { domain: b.domain, modality: text(b.modality || '', 100), summary: text(b.summary || '', 600), tags: strings(b.tags, 20), assets: ids(b.assets, 20), related: ids(b.related, 30), legacyQuestions: ids(b.legacyQuestions, 50) });
    const data = { schemaVersion: 1, demo: d.demo === true, definition: text(d.definition || '', 6000), objectives: strings(d.objectives || [], 10), keyFindings: strings(d.keyFindings, 30), interpretation: text(d.interpretation || '', 6000), diagnosis: text(d.diagnosis || '', 2000), differentials: strings(d.differentials, 20), clinicalAssociations: strings(d.clinicalAssociations, 20), references: list(d.references || [], 20).map((r) => { if (!safeUrl(r.url)) fail('Referensi harus HTTPS.'); return { title: text(r.title, 500, true), url: r.url }; }), steps: list(d.steps || [], 30).map((s) => ({ title: text(s.title, 200, true), finding: text(s.finding, 2000, true) })) };
    data.lab = { context: text(d.lab?.context || '', 2000), rows: list(d.lab?.rows || [], 40).map((r) => {
      if (typeof r.value !== 'number' || !Number.isFinite(r.value) || typeof r.low !== 'number' || typeof r.high !== 'number' || !Number.isFinite(r.low) || !Number.isFinite(r.high) || r.low > r.high) fail('Nilai/rentang laboratorium tidak valid.');
      return { key: text(r.key, 40, true), name: text(r.name, 100, true), value: r.value, unit: text(r.unit, 40, true), low: r.low, high: r.high };
    }) };
    if (new Set(data.lab.rows.map((r) => r.key)).size !== data.lab.rows.length) fail('Kode pemeriksaan harus unik.');
    data.lab.rules = list(d.lab?.rules || [], 20).map((rule) => ({ label: text(rule.label, 1000, true), all: list(rule.all, 20).map((c) => {
      if (!data.lab.rows.some((r) => r.key === c.key) || !['low', 'normal', 'high'].includes(c.flag)) fail('Kondisi aturan tidak valid.');
      return { key: c.key, flag: c.flag };
    }) }));
    if (data.lab.rules.some((r) => !r.all.length)) fail('Aturan harus memiliki kondisi.');
    data.blocks = validateBlocks(d.blocks, out.assets);
    out.data = data;
  } else if (kind === 'questions') {
    if (!TYPES.includes(d.type)) fail('Tipe pertanyaan tidak valid.');
    out.objects = ids(b.objects, 30); if (!out.objects.length) fail('Pilih learning object.');
    out.asset = b.asset ? ids([b.asset], 1)[0] : '';
    const options = list(d.options || [], 8).map((o) => ({ label: text(o.label, 10, true), text: text(o.text, 1000, true) }));
    const data = { type: d.type, prompt: text(d.prompt, 4000, true), options, explanation: text(d.explanation, 6000, true) };
    if (['single_best_answer', 'image_identification'].includes(d.type)) {
      data.answer = text(d.answer, 10, true);
      if (options.length < 2 || new Set(options.map((o) => o.label)).size !== options.length || !options.some((o) => o.label === data.answer)) fail('Pilihan/kunci soal tidak valid.');
    } else if (['hotspot', 'select_region'].includes(d.type)) { data.region = rect(d.region); }
    else { data.answer = text(d.answer, 4000, true); }
    if (['image_identification', 'hotspot', 'select_region'].includes(d.type) && !out.asset) fail('Soal gambar memerlukan aset.');
    out.data = data;
  } else {
    out.summary = text(b.summary || '', 600); out.data = { schemaVersion: 1 };
    out.steps = ids(b.steps, 100);
    if (!out.steps.length || new Set(out.steps).size !== out.steps.length) fail('Jalur membutuhkan langkah unik.');
  }
  return out;
}
function collection(kind) { if (!KINDS.includes(kind)) throw new NotFoundError('Konten tidak ditemukan.'); return 'lab_' + kind; }
function find(app, kind, id, published) {
  let r; try { r = app.findFirstRecordByFilter(collection(kind), '(id = {:key} || slug = {:key})' + (published ? " && status = 'published'" : ''), { key: id }); } catch (_) { throw new NotFoundError('Konten tidak ditemukan.'); } return r;
}
function data(r) { return u.recJson(r, 'data', {}); }
function card(r) { return { id: r.id, slug: r.getString('slug'), title: r.getString('title'), domain: r.getString('domain'), modality: r.getString('modality'), summary: r.getString('summary'), tags: u.recJson(r, 'tags', []), demo: data(r).demo === true }; }
function licenseReady(d) { const l = d.license || {}; return l.verified && l.commercial_use && l.redistribution && (!l.attribution_required || !!l.citation); }
// Only fields safe for students; sample_index and any authoring-only keys stay server-side.
function safeDataset(m) { if (!m) return undefined; const o = { name: m.name, task: m.task, split: m.split, label: m.label }; if (m.resolution) o.resolution = m.resolution; return o; }
function assetOut(app, id, opts) {
  const preview = !!(opts && opts.preview);
  const r = find(app, 'assets', id, !preview); const d = data(r); const ready = licenseReady(d);
  if (!preview && !ready) throw new NotFoundError('Aset belum lolos pemeriksaan lisensi.');
  const out = { id: r.id, title: r.getString('title'), ...d, media: d.media || 'image' };
  if (d.dataset) out.dataset = safeDataset(d.dataset);
  if (preview) { out.licenseReady = ready; out.status = r.getString('status'); }
  return out;
}
function questionOut(app, r, opts) {
  const d = data(r); const asset = r.getString('asset');
  // Annotation positions/labels can reveal hotspot answers: never send them in question mode.
  let image = null;
  if (asset) { const a = assetOut(app, asset, opts); image = { id: a.id, url: a.url, alt: 'Gambar latihan', synthetic: a.synthetic, license: a.license }; }
  return { id: r.id, type: d.type, prompt: d.prompt, options: d.options, image };
}
function labResult(lab) {
  const rows = (lab.rows || []).map((r) => ({ ...r, flag: r.value < r.low ? 'low' : r.value > r.high ? 'high' : 'normal' }));
  const matches = (lab.rules || []).filter((rule) => rule.all.length && rule.all.every((c) => rows.some((r) => r.key === c.key && r.flag === c.flag))).map((r) => r.label);
  return { context: lab.context, rows, matches };
}
function detail(app, id, user, opts) {
  const preview = !!(opts && opts.preview);
  const r = find(app, 'objects', id, !preview); const d = data(r);
  const assets = r.getStringSlice('assets').flatMap((a) => { try { return [assetOut(app, a, opts)]; } catch (e) { if (preview) return []; throw e; } });
  const related = r.getStringSlice('related').flatMap((id) => { try { return [card(find(app, 'objects', id, true))]; } catch (_) { return []; } });
  const qFilter = preview ? 'objects.id ?= {:id}' : "status = 'published' && objects.id ?= {:id}";
  const questions = app.findRecordsByFilter('lab_questions', qFilter, 'created,id', 100, 0, { id: r.id }).flatMap((q) => { try { return [questionOut(app, q, opts)]; } catch (_) { return []; } });
  const legacy = r.getStringSlice('legacyQuestions').flatMap((id) => {
    try { const q = app.findRecordById('questions', id); const ch = app.findRecordById('chapters', q.getString('chapter')); const s = app.findRecordById('subjects', q.getString('subject'));
      if (q.getString('status') !== 'published' || !u.canSeeQuestion(user, q) || ch.getBool('hidden') || s.getBool('hidden')) return [];
      return [{ id, title: ch.getString('title'), qtype: q.getString('qtype') }];
    } catch (_) { return []; }
  });
  // Cross-lesson links are educational relations, never prerequisites; unpublished targets silently disappear for students.
  const blocks = (d.blocks || []).map((b) => {
    if (b.type !== 'clinical_connection' || !b.link) return b;
    try { const t = find(app, 'objects', b.link.object, !preview); return { ...b, link: { slug: t.getString('slug'), title: t.getString('title'), label: b.link.label } }; } catch (_) { const { link, ...rest } = b; return rest; }
  });
  return { ...card(r), data: { ...d, blocks, lab: labResult(d.lab || {}) }, assets, related, questions, legacyQuestions: legacy, ...(preview ? { preview: true, status: r.getString('status') } : {}) };
}
function browse(app, query, domain, page) {
  let filter = "status = 'published'"; const params = {};
  if (query) { filter += ' && (title ~ {:q} || summary ~ {:q} || tags ~ {:q} || modality ~ {:q})'; params.q = query.slice(0, 120); }
  if (domain) { filter += ' && domain = {:d}'; params.d = domain; }
  const rows = app.findRecordsByFilter('lab_objects', filter, 'title,id', 25, (page - 1) * 24, params);
  return { items: rows.slice(0, 24).map(card), hasMore: rows.length > 24, page };
}
function pathOut(app, r) {
  const steps = app.findRecordsByFilter('lab_path_steps', 'pathway = {:id}', 'position', 100, 0, { id: r.id }).flatMap((s) => { try { return [{ ...card(find(app, 'objects', s.getString('object'), true)), position: s.getInt('position') }]; } catch (_) { return []; } });
  return { ...card(r), steps };
}
function adminOut(app, kind, r) {
  const out = { id: r.id, slug: r.getString('slug'), title: r.getString('title'), status: r.getString('status'), revision: r.getInt('revision'), data: data(r), pack: r.getString('pack'), reviewedBy: r.getString('reviewedBy'), reviewedAt: r.getString('reviewedAt') };
  if (kind === 'objects') Object.assign(out, { domain: r.getString('domain'), modality: r.getString('modality'), summary: r.getString('summary'), tags: u.recJson(r, 'tags', []), assets: r.getStringSlice('assets'), related: r.getStringSlice('related'), legacyQuestions: r.getStringSlice('legacyQuestions') });
  if (kind === 'questions') Object.assign(out, { objects: r.getStringSlice('objects'), asset: r.getString('asset') });
  if (kind === 'pathways') Object.assign(out, { summary: r.getString('summary'), steps: app.findRecordsByFilter('lab_path_steps', 'pathway = {:id}', 'position', 100, 0, { id: r.id }).map((s) => s.getString('object')) });
  return out;
}
function save(app, kind, id, body) {
  const v = validate(kind, body); let out;
  app.runInTransaction((tx) => {
    const r = id ? find(tx, kind, id, false) : new Record(tx.findCollectionByNameOrId(collection(kind)));
    if (id && r.getInt('revision') !== body.revision) fail('Konten telah diubah. Muat ulang sebelum menyimpan.');
    Object.keys(v).filter((k) => k !== 'steps').forEach((k) => r.set(k, v[k]));
    r.set('status', 'draft'); r.set('reviewedBy', ''); r.set('reviewedAt', ''); r.set('revision', r.getInt('revision') + 1); tx.save(r);
    if (kind === 'pathways') {
      tx.findRecordsByFilter('lab_path_steps', 'pathway = {:id}', '', 100, 0, { id: r.id }).forEach((s) => tx.delete(s));
      v.steps.forEach((id, i) => { find(tx, 'objects', id, false); const s = new Record(tx.findCollectionByNameOrId('lab_path_steps')); s.set('pathway', r.id); s.set('object', id); s.set('position', i + 1); tx.save(s); });
    }
    out = adminOut(tx, kind, r);
  }); return out;
}
const errText = (e) => (e && e.message) || String(e);
// Canonical publish check shared by single publish, admin bulk publish, pack publish and the CLI.
// Returns every problem for one record; `pending` holds "kind:id" of drafts that will be published first in the same run.
function checkRecord(app, kind, r, pending) {
  const out = []; const add = (message) => out.push({ kind, id: r.id, slug: r.getString('slug'), message });
  let v; try { v = validate(kind, adminOut(app, kind, r)); } catch (e) { add(errText(e)); return out; }
  const slugOf = (k, id) => { try { return find(app, k, id, false).getString('slug'); } catch (_) { return id; } };
  const ready = (k, id) => { if (pending && pending.has(k + ':' + id)) return true; try { find(app, k, id, true); return true; } catch (_) { return false; } };
  const need = (k, id, what) => { if (!ready(k, id)) add(`${what} ${slugOf(k, id)} belum terbit atau tidak ditemukan.`); };
  const assetData = (id) => { try { return data(find(app, 'assets', id, false)); } catch (_) { return {}; } };
  if (kind === 'assets') {
    const l = v.data.license; const miss = [];
    if (!l.verified) miss.push('license.verified = false'); if (!l.commercial_use) miss.push('commercial_use = false'); if (!l.redistribution) miss.push('redistribution = false');
    if (l.attribution_required && !l.citation) miss.push('citation kosong padahal atribusi wajib');
    if (miss.length) add('Lisensi belum siap terbit: ' + miss.join('; ') + '.');
  } else if (kind === 'objects') {
    v.assets.forEach((id) => need('assets', id, 'aset'));
    (v.data.blocks || []).forEach((b) => {
      if (b.dev) add(`Blok ${b.id} memakai skema pengembangan (bukan materi medis terverifikasi) dan tidak boleh diterbitkan.`);
      const layers = (b.layers || []).filter((l) => l.asset);
      layers.forEach((l) => { if (assetData(l.asset).media === 'model') add(`Lapisan ${l.id} memakai model 3D sebagai gambar.`); });
      if (b.type === 'model_3d' && assetData(b.asset).media !== 'model') add(`Blok ${b.id}: aset harus bermedia model (.glb/.gltf).`);
      if (b.type === 'clinical_connection' && b.link) need('objects', b.link.object, 'materi tertaut');
    });
  } else if (kind === 'questions') {
    v.objects.forEach((id) => need('objects', id, 'materi'));
    if (v.asset) {
      need('assets', v.asset, 'aset');
      const a = assetData(v.asset);
      if (['hotspot', 'select_region'].includes(v.data.type) && a.dataset && !(a.annotations || []).length) add('Label tingkat-gambar dataset tidak boleh dipakai sebagai soal lokalisasi (tidak ada anotasi lokasi).');
    }
  } else { v.steps.forEach((id) => need('objects', id, 'materi')); }
  return out;
}
function applyPublish(tx, kind, r, admin) {
  const v = validate(kind, adminOut(tx, kind, r));
  // Reapply the validated allowlist, including for drafts edited through superuser tooling.
  Object.keys(v).filter((k) => k !== 'steps').forEach((k) => r.set(k, v[k]));
  r.set('status', 'published'); r.set('reviewedBy', admin.id); r.set('reviewedAt', u.nowIso()); r.set('revision', r.getInt('revision') + 1); tx.save(r);
}
// items: [{ kind, id, revision? }]. Order is always assets -> objects -> questions -> pathways; already-published records are skipped.
function publishSet(app, items, admin, opts) {
  const o = opts || {};
  if (!o.dryRun && o.confirmReviewed !== true) fail('Konfirmasi pemeriksaan manusia diperlukan.');
  const recs = items.map((it) => ({ kind: it.kind, revision: it.revision, r: find(app, it.kind, it.id, false) })).sort((a, b) => ORDER[a.kind] - ORDER[b.kind]);
  const pending = new Set(recs.filter((x) => x.r.getString('status') !== 'published').map((x) => x.kind + ':' + x.r.id));
  const errors = []; const todo = []; const skipped = [];
  recs.forEach((x) => {
    if (x.revision !== undefined && x.r.getInt('revision') !== x.revision) { errors.push({ kind: x.kind, id: x.r.id, slug: x.r.getString('slug'), message: 'Versi berubah. Muat ulang dan periksa kembali.' }); return; }
    if (x.r.getString('status') === 'published') { skipped.push({ kind: x.kind, slug: x.r.getString('slug') }); return; }
    errors.push(...checkRecord(app, x.kind, x.r, pending)); todo.push(x);
  });
  const ready = todo.map((x) => ({ kind: x.kind, slug: x.r.getString('slug') }));
  if (errors.length) return { ok: false, errors, ready: [], published: [], skipped };
  if (o.dryRun) return { ok: true, errors: [], ready, published: [], skipped };
  app.runInTransaction((tx) => {
    todo.forEach((x) => {
      const r = find(tx, x.kind, x.r.id, false);
      const again = checkRecord(tx, x.kind, r, pending); if (again.length) fail(again[0].message);
      applyPublish(tx, x.kind, r, admin);
    });
  });
  return { ok: true, errors: [], ready, published: ready, skipped };
}
function publish(app, kind, id, body, admin) {
  if (body.confirmReviewed !== true) fail('Konfirmasi pemeriksaan manusia diperlukan.');
  const r = find(app, kind, id, false);
  const res = publishSet(app, [{ kind, id: r.id, revision: body.revision }], admin, { confirmReviewed: true });
  if (!res.ok) fail(res.errors[0].message);
  return adminOut(app, kind, find(app, kind, r.id, false));
}
function answer(app, id, body) {
  const q = find(app, 'questions', id, true);
  if (!q.getStringSlice('objects').some((id) => { try { find(app, 'objects', id, true); return true; } catch (_) { return false; } })) throw new NotFoundError('Soal tidak tersedia.');
  questionOut(app, q); const d = data(q); let correct = null;
  if (['single_best_answer', 'image_identification'].includes(d.type)) {
    if (!d.options.some((o) => o.label === body.response)) fail('Pilih jawaban yang tersedia.'); correct = body.response === d.answer;
  } else if (['hotspot', 'select_region'].includes(d.type)) {
    const p = body.response; if (!p || !['x', 'y'].every((k) => typeof p[k] === 'number' && Number.isFinite(p[k]) && p[k] >= 0 && p[k] <= 1)) fail('Pilih titik pada gambar.');
    const r = d.region; correct = p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height;
  } else { text(body.response, 4000, true); }
  return { correct, selfAssessment: correct === null, answer: d.answer || null, region: d.region || null, explanation: d.explanation };
}
module.exports = { KINDS, ORDER, TYPES, DOMAINS, ORIGINS, SCHEMATICS, BLOCK_TYPES, validate, validateBlocks, datasetMeta, checkRecord, publishSet, rect, safeUrl, licenseReady, collection, find, card, assetOut, detail, browse, pathOut, adminOut, save, publish, answer, labResult };
